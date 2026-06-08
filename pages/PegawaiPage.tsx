import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pegawai, Dossier } from '../types';
import { fetchPegawaiFromSheets, savePegawai, syncTableRemote, fetchDossiersFromSheets, uploadFileToDrive, findPegawaiByNip } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { getPhotoUrl } from '../lib/photoUtils';
import { normalizeUnitName, UNIT_KERJA, ORGANISASI_STRUCTURE, PANGKAT_MAP, DEFAULT_LOGO, BANK_LIST, formatPegawaiName } from '../constants';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const PegawaiPage = () => {
  const navigate = useNavigate();
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [dossierList, setDossierList] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(sessionStorage.getItem('pegawai_searchTerm') || '');
  const [filterUnit, setFilterUnit] = useState(sessionStorage.getItem('pegawai_filterUnit') || 'Semua Unit');
  const [filterJenis, setFilterJenis] = useState(sessionStorage.getItem('pegawai_filterJenis') || 'Semua Jenis');
  const [filterStatus, setFilterStatus] = useState(sessionStorage.getItem('pegawai_filterStatus') || 'Semua Status');
  const [minGolongan, setMinGolongan] = useState(sessionStorage.getItem('pegawai_minGolongan') || 'Semua');
  const [maxGolongan, setMaxGolongan] = useState(sessionStorage.getItem('pegawai_maxGolongan') || 'Semua');
  const [minAge, setMinAge] = useState<string>(sessionStorage.getItem('pegawai_minAge') || '');
  const [maxAge, setMaxAge] = useState<string>(sessionStorage.getItem('pegawai_maxAge') || '');

  // Persist filters and scroll to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('pegawai_searchTerm', searchTerm);
    sessionStorage.setItem('pegawai_filterUnit', filterUnit);
    sessionStorage.setItem('pegawai_filterJenis', filterJenis);
    sessionStorage.setItem('pegawai_filterStatus', filterStatus);
    sessionStorage.setItem('pegawai_minGolongan', minGolongan);
    sessionStorage.setItem('pegawai_maxGolongan', maxGolongan);
    sessionStorage.setItem('pegawai_minAge', minAge);
    sessionStorage.setItem('pegawai_maxAge', maxAge);
  }, [searchTerm, filterUnit, filterJenis, filterStatus, minGolongan, maxGolongan, minAge, maxAge]);

  // Restore scroll position
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('pegawai_scrollPosition');
    if (savedScrollPosition && !loading) {
      window.scrollTo(0, parseInt(savedScrollPosition));
      // Optional: clear it after restoration if we only want it once per "back"
      // sessionStorage.removeItem('pegawai_scrollPosition');
    }
  }, [loading]);

  // Save scroll position before leaving or on scroll (debounce/throttle ideally, but let's do it on scroll for simplicity)
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('pegawai_scrollPosition', window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isJenisDropdownOpen, setIsJenisDropdownOpen] = useState(false);
  const jenisDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (jenisDropdownRef.current && !jenisDropdownRef.current.contains(event.target as Node)) {
        setIsJenisDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const [isAddDossierOpen, setIsAddDossierOpen] = useState(false);
  const [dossierFormData, setDossierFormData] = useState<Partial<Dossier>>({ fileName: '', keterangan: '' });
  
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [formData, setFormData] = useState<Partial<Pegawai>>({});
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pegawaiToDelete, setPegawaiToDelete] = useState<Pegawai | null>(null);
  
  const [duplicateNips, setDuplicateNips] = useState<string[]>([]);
  const [invalidItems, setInvalidItems] = useState<{id: string, nip: string, nama: string}[]>([]);

  const findDuplicatesAndInvalids = (list: Pegawai[]) => {
    const counts = new Map<string, number>();
    const invItems: {id: string, nip: string, nama: string}[] = [];
    
    list.forEach((p, idx) => {
      const nip = (p.nip || '').replace(/\D/g, '');
      const nama = (p.nama || '').trim();
      
      // Detect invalid or corrupted data more strictly
      const isActuallyEmpty = (!nama || nama === '(NAMA KOSONG)') && !nip;
      
      const upperNama = nama.toUpperCase();
      const isShort = nama.length < 8;
      // Many of these are degree names that shouldn't be in the NAMA column
      const degreeTitles = ['S.T', 'S.H', 'S.E', 'M.H', 'M.T', 'S.SI', 'A.MD', 'DRS', 'DRA', 'PROF', 'DR.'];
      const isDegreeInitials = isShort && degreeTitles.some(d => upperNama.startsWith(d));
      const isAddress = upperNama.includes('PONDOK') || upperNama.includes('JALAN') || upperNama.includes('KEC.') || upperNama.includes('KAB.');
      
      // If the name is basically just a degree code but there is a NIP, it might be a shifted row.
      // We flag it if the name is unusually short.
      const isSuspectedShift = isDegreeInitials && nama.length < 6;
      
      const badData = (!nip && (nama.length < 3 || isActuallyEmpty || isDegreeInitials || isAddress)) || 
                      (nip.length > 0 && nip.length < 8) ||
                      isSuspectedShift;
      
      if (isActuallyEmpty || badData) {
        console.warn(`Row ${idx+1} flagged as invalid:`, { nama, nip, id: p.id });
        invItems.push({ id: p.id, nip: p.nip || '-', nama: p.nama || '(Nama Kosong)' });
      }
      
      if (nip && nip.length >= 8) { // Only count valid-looking NIPs for duplicates
        counts.set(nip, (counts.get(nip) || 0) + 1);
      }
    });
    
    const dups = Array.from(counts.entries())
      .filter(([_, count]) => count > 1)
      .map(([nip]) => nip);
      
    setDuplicateNips(dups);
    setInvalidItems(invItems);
  };
  
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [tempPhotoFile, setTempPhotoFile] = useState<File | null>(null);
  const [tempPhotoPreview, setTempPhotoPreview] = useState<string>('');
  
  const drhRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dossierFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    // Load fresh data on mount to ensure synchronization
    loadData(true); 
  }, []);

  const getJabatanClassification = (p: Pegawai): string => {
    const es = (p.eselon || '').trim().toUpperCase();
    const j = (p.jabatan || '').trim().toUpperCase();
    const kl = (p.klasifikasiJabatan || p.jenisJabatan || '').trim().toUpperCase();

    // 1. Primary Source of Truth: Trust Column AN (Jenis Jabatan) from Spreadsheet
    if (kl.includes('PIMPINAN TINGGI') || kl.includes('JPT')) return 'JPT';
    if (kl.includes('STRUKTURAL') || kl.includes('ADMINISTRATOR') || kl.includes('PENGAWAS') || kl.includes('MANAJERIAL')) return 'STRUKTURAL';
    if (kl.includes('FUNGSIONAL TERTENTU') || kl.includes('JFT') || kl === 'FUNGSIONAL') return 'FUNGSIONAL';
    if (kl.includes('FUNGSIONAL UMUM') || kl.includes('JFU') || kl.includes('PELAKSANA')) return 'PELAKSANA';

    // 2. Secondary: Force JFT markers in name (if says AHLI/MADYA/MUDA/PERTAMA, etc)
    if (j.includes('AHLI') || j.includes('MADYA') || j.includes('MUDA') || 
        j.includes('PERTAMA') || j.includes('UTAMA') || j.includes('TERAMPIL') || 
        j.includes('MAHIR') || j.includes('PENYELIA') || j.includes('PELAKSANA LANJUTAN')) return 'FUNGSIONAL';

    // 3. Fallback: Management Keywords - JPT (Eselon I & II)
    if (j.includes('DIREKTUR JENDERAL') || j.includes('SEKRETARIS DIREKTORAT JENDERAL') || 
        j.includes('SEKRETARIS UTAMA') || j.includes('STAF AHLI') || j.includes('INSPEKTUR') || 
        j.includes('KEPALA BIRO') || j.includes('KEPALA PUSAT') || j.includes('DIREKTUR') || 
        j.includes('SEKRETARIS DIREKTORAT')) {
      return 'JPT';
    }

    // 4. Fallback: Management Keywords - Structural (Eselon III & IV)
    if (j.includes('KEPALA BAGIAN') || j.includes('KABAG') || 
        j.includes('KEPALA SUBDIREKTORAT') || j.includes('KASUBDIT') || 
        j.includes('KEPALA BIDANG') || j.includes('KABID') ||
        j.includes('KEPALA SEKSI') || j.includes('KASI') || 
        j.includes('KEPALA SUBBAGIAN') || j.includes('KASUBBAG') || 
        j.includes('KOORDINATOR') || j.includes('SUBKOORDINATOR') ||
        j.includes('KEPALA KANTOR') || j.includes('KEPALA SATUAN') ||
        j.startsWith('KEPALA ') || j.includes(' KEPALA ')) {
      return 'STRUKTURAL';
    }

    // 5. Fallback: Pelaksana (JFU) Specific Title Keywords
    if (j.includes('ANALIS') || j.includes('PENATA KELOLA') || j.includes('PENATA LAYANAN') || 
        j.includes('PENELAAH') || j.includes('PENGADMINISTRASI') || j.includes('PENGELOLA') || 
        j.includes('PENGOLAH') || j.includes('PENYUSUN') || j.includes('DOKUMENTALIS') || 
        j.includes('OPERATOR') || j.includes('FASILITATOR') || j.includes('SEKRETARIS PIMPINAN') ||
        j.includes('KONSELOR') || j.includes('PENGENDALI KONTEN') || j.includes('PETUGAS') || 
        j.includes('PRAMU') || j.includes('PENGEMUDI') || j.includes('TEKNISI') || 
        j.includes('STAF') || j.includes('STAFF')) {
      return 'PELAKSANA';
    }

    // 6. Fallback: Eselon
    if (es && es !== '-') {
      if (es.startsWith('IV') || es.startsWith('4')) return 'STRUKTURAL';
      if (es.startsWith('III') || es.startsWith('3')) return 'STRUKTURAL';
      if (es.startsWith('II') || es.startsWith('2')) return 'JPT';
      if (es.startsWith('I') || es.startsWith('1')) return 'JPT';
    }

    return 'PELAKSANA';
  };

  const loadData = async (bypassCache = false) => {
    try {
      setLoading(true);
      // HARD RESET indicators when syncing
      if (bypassCache) {
        setDuplicateNips([]);
        setInvalidItems([]);
        setPegawaiList([]);
      }
      
      const [pData, dData] = await Promise.all([
        fetchPegawaiFromSheets(bypassCache), 
        fetchDossiersFromSheets(bypassCache)
      ]);
      
      const enrichedData = pData.map(p => {
        const enriched = { ...p };
        
        // 1. Classification Enrichment (Forced dynamic check)
        enriched.klasifikasiJabatan = getJabatanClassification(enriched);
        
        // 2. Identity & Retirement Enrichment
        if (enriched.tanggalLahir) {
          const birth = new Date(formatDateForInput(enriched.tanggalLahir));
          if (!isNaN(birth.getTime())) {
            // 1. Calculate Age if missing
            if (!enriched.usia || enriched.usia === '-') {
              const today = new Date();
              let years = today.getFullYear() - birth.getFullYear();
              let months = today.getMonth() - birth.getMonth();
              if (months < 0) {
                years--;
                months += 12;
              }
              enriched.usia = `${years} Thn ${months} Bln`;
            }

            // 2. Retirement Info
            if (!enriched.bup || enriched.bup === '-') {
              const isHighLevel = enriched.eselon && enriched.eselon !== '-' && enriched.eselon !== '';
              const isFungsionalAhli = enriched.jabatan?.toUpperCase().includes('MADYA') || enriched.jabatan?.toUpperCase().includes('UTAMA');
              enriched.bup = (isHighLevel || isFungsionalAhli) ? '60' : '58';
            }

            const bupYears = parseInt(enriched.bup);
            const retirementDate = new Date(birth.getFullYear() + bupYears, birth.getMonth() + 1, 1);
            
            if (!enriched.tglPensiun || enriched.tglPensiun === '-') {
              enriched.tglPensiun = retirementDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            }

            if (!enriched.tmtPensiun || enriched.tmtPensiun === '-') {
              enriched.tmtPensiun = `${retirementDate.getFullYear()}-${String(retirementDate.getMonth() + 1).padStart(2, '0')}-01`;
            }

            // 3. Auto Status
            const today = new Date();
            let checkDate = retirementDate;
            if (enriched.tmtPensiun && enriched.tmtPensiun !== '-') {
              const tmtDate = new Date(formatDateForInput(enriched.tmtPensiun));
              if (!isNaN(tmtDate.getTime())) {
                checkDate = tmtDate;
              }
            }
            
            if (today >= checkDate) {
              if (enriched.status === 'Aktif' || enriched.status === 'Tugas Belajar') {
                enriched.status = 'Pensiun';
              }
            }
          }
        }
        return enriched;
      });

      setPegawaiList(enrichedData);
      setDossierList(dData);
      findDuplicatesAndInvalids(enrichedData);
    } catch (e) { 
      console.error("Data loading error:", e); 
      if (bypassCache) {
        alert("Gagal sinkronisasi: " + (e instanceof Error ? e.message : "Terjadi kesalahan koneksi. Pastikan Spreadsheet dipublikasikan ke Web (CSV)."));
      }
    } finally { 
      setLoading(false); 
    }
  };

  const formatDateForInput = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const cleanDate = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return cleanDate;
    const parts = cleanDate.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length <= 2 && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    try {
      const d = new Date(cleanDate);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    return '';
  };

  const handleEditPegawai = (p: Pegawai) => {
    setSelectedPegawai(p);
    setFormData({
      ...p,
      tmtPangkat: formatDateForInput(p.tmtPangkat),
      tmtJabatan: formatDateForInput(p.tmtJabatan),
      tmtCpns: formatDateForInput(p.tmtCpns),
      tanggalLahir: formatDateForInput(p.tanggalLahir)
    });
    setIsModalOpen(true);
  };

  const filteredPegawai = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const min = minAge ? parseInt(minAge) : 0;
    const max = maxAge ? parseInt(maxAge) : 200;

    return (pegawaiList || []).filter(p => {
      // NOTE: We no longer hide ghost records so the user can see/fix them
      // if (!(p.nama || '').trim() || !(p.nip || '').trim()) return false;

      const searchStr = [p.nama, p.nip, p.nik, p.jabatan, p.unitKerja, p.pendidikan, p.jurusan, p.status, p.alamat].map(v => String(v || '').toLowerCase()).join(' ');
      const match = searchStr.includes(term);
      const unitMatch = filterUnit === 'Semua Unit' || normalizeUnitName(p.unitKerja) === filterUnit;
      const selectedSubJenis = filterJenis === 'Semua Jenis' || !filterJenis ? [] : filterJenis.split(',').filter(Boolean);
      const jenisMatch = selectedSubJenis.length === 0 || selectedSubJenis.map(s => s.toLowerCase()).includes((p.jenisPegawai || '').trim().toLowerCase());
      const statusMatch = filterStatus === 'Semua Status' || (p.status || 'Aktif') === filterStatus;
      
      // Golongan range match
      let golonganMatch = true;
      if (minGolongan !== 'Semua' || maxGolongan !== 'Semua') {
        const sortedGols = Object.keys(PANGKAT_MAP).sort((a, b) => {
          // Priority: I < II < III < IV
          const rankA = a.split('/')[0];
          const rankB = b.split('/')[0];
          const romValues: Record<string, number> = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };
          if (rankA !== rankB) return (romValues[rankA] || 0) - (romValues[rankB] || 0);
          return a.localeCompare(b);
        });
        
        const currentGol = p.golRuang || '-';
        const currentIndex = sortedGols.indexOf(currentGol);
        
        if (currentIndex === -1) {
          golonganMatch = false;
        } else {
          const minIdx = minGolongan === 'Semua' ? 0 : sortedGols.indexOf(minGolongan);
          const maxIdx = maxGolongan === 'Semua' ? sortedGols.length - 1 : sortedGols.indexOf(maxGolongan);
          golonganMatch = currentIndex >= minIdx && currentIndex <= maxIdx;
        }
      }
      
      // Age calculation
      let ageMatch = true;
      if (minAge || maxAge) {
        const birthDateStr = formatDateForInput(p.tanggalLahir);
        if (birthDateStr) {
          const birthDate = new Date(birthDateStr);
          if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            ageMatch = age >= min && age <= max;
          } else {
            ageMatch = false; // Cannot calculate age
          }
        } else {
          ageMatch = false; // No birth date
        }
      }

      return match && unitMatch && jenisMatch && ageMatch && statusMatch && golonganMatch;
    });
  }, [pegawaiList, searchTerm, filterUnit, filterJenis, filterStatus, minGolongan, maxGolongan, minAge, maxAge]);

  const filteredForCounts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const min = minAge ? parseInt(minAge) : 0;
    const max = maxAge ? parseInt(maxAge) : 200;

    return (pegawaiList || []).filter(p => {
      const searchStr = [p.nama, p.nip, p.nik, p.jabatan, p.unitKerja, p.pendidikan, p.jurusan, p.status, p.alamat].map(v => String(v || '').toLowerCase()).join(' ');
      const match = searchStr.includes(term);
      const unitMatch = filterUnit === 'Semua Unit' || normalizeUnitName(p.unitKerja) === filterUnit;
      const selectedSubJenis = filterJenis === 'Semua Jenis' || !filterJenis ? [] : filterJenis.split(',').filter(Boolean);
      const jenisMatch = selectedSubJenis.length === 0 || selectedSubJenis.map(s => s.toLowerCase()).includes((p.jenisPegawai || '').trim().toLowerCase());
      
      let ageMatch = true;
      if (minAge || maxAge) {
        const birthDateStr = formatDateForInput(p.tanggalLahir);
        if (birthDateStr) {
          const birthDate = new Date(birthDateStr);
          if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            ageMatch = age >= min && age <= max;
          } else ageMatch = false;
        } else ageMatch = false;
      }
      return match && unitMatch && jenisMatch && ageMatch;
    });
  }, [pegawaiList, searchTerm, filterUnit, filterJenis, minAge, maxAge]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Aktif': 0, 'Tidak Aktif': 0, 'Pensiun': 0, 'Tugas Belajar': 0
    };
    (filteredForCounts || []).forEach(p => {
      const status = p.status || 'Aktif';
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  }, [filteredForCounts]);

  const filteredDossiers = useMemo(() => {
    if (!selectedPegawai) return [];
    return dossierList.filter(d => d.nip === selectedPegawai.nip);
  }, [dossierList, selectedPegawai]);

  const handleExportExcel = (type: 'SHARE' | 'FULL') => {
    const wb = XLSX.utils.book_new();
    
    // Filter data for export: exclude 'Tidak Aktif' and 'Pensiun' if not searching
    const exportPegawai = searchTerm.trim() === '' 
      ? filteredPegawai.filter(p => p.status !== 'Tidak Aktif' && p.status !== 'Pensiun')
      : filteredPegawai;

    if (type === 'SHARE') {
      const data = exportPegawai.map((p, index) => ({
        'No': index + 1,
        'NIP': p.nip,
        'NAMA': p.nama,
        'Pangkat/golongan': `${p.pangkat || '-'}, ${p.golRuang || '-'}`,
        'Jabatan': p.jabatan,
        'Unit kerja': p.unitKerja,
        'Jenis pegawai': p.jenisPegawai
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Daftar Pegawai");
    } else {
      // Sheet 1: Semua Pegawai
      const allData = exportPegawai.map(p => ({ ...p }));
      const wsAll = XLSX.utils.json_to_sheet(allData);
      XLSX.utils.book_append_sheet(wb, wsAll, "Semua Pegawai");

      // Mapping nama sheet agar tidak melebihi 31 karakter
      const UNIT_SHEET_NAMES: Record<string, string> = {
        'Sekretariat Direktorat Jenderal Kekayaan Intelektual': 'Sekretariat',
        'Direktorat Hak Cipta dan Desain Industri': 'Hak Cipta & DI',
        'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang': 'Paten, DTLST & RD',
        'Direktorat Merek dan Indikasi Geografis': 'Merek & IG',
        'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi': 'Kerjasama & Edukasi',
        'Direktorat Teknologi Informasi Kekayaan Intelektual': 'TI KI',
        'Direktorat Penegakan Hukum': 'Penegakan Hukum'
      };

      // Sheets 2-8: Per Unit Kerja (hanya jika ada data atau jika tidak sedang difilter)
      UNIT_KERJA.forEach(unit => {
        const unitData = exportPegawai.filter(p => normalizeUnitName(p.unitKerja) === unit).map(p => ({ ...p }));
        if (unitData.length > 0) {
          const wsUnit = XLSX.utils.json_to_sheet(unitData);
          const sheetName = UNIT_SHEET_NAMES[unit] || unit.substring(0, 31);
          XLSX.utils.book_append_sheet(wb, wsUnit, sheetName);
        }
      });
    }
    
    XLSX.writeFile(wb, `Data_Pegawai_DJKI_${type}_${Date.now()}.xlsx`);
  };

  const handleUploadPhoto = async () => {
    if (!tempPhotoFile) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`FOTO_${formData.nip || 'NEW'}_${Date.now()}`, tempPhotoFile.type, base64);
      if (res.success && res.fileUrl) {
        setFormData(prev => ({ ...prev, foto: res.fileUrl }));
        setIsPhotoModalOpen(false);
        if (tempPhotoPreview) URL.revokeObjectURL(tempPhotoPreview);
        setTempPhotoFile(null);
        setTempPhotoPreview('');
        setSuccessMsg("Foto profil berhasil diunggah ke sistem.");
        setShowSuccess(true);
      } else {
        alert(res.message || "Gagal mengunggah foto. Pastikan koneksi internet stabil dan ukuran file tidak terlalu besar.");
      }
      setUploading(false);
    };
    reader.readAsDataURL(tempPhotoFile);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran file terlalu besar. Maksimal 2MB.");
        return;
      }
      setTempPhotoFile(file);
      setTempPhotoPreview(URL.createObjectURL(file));
      setIsPhotoModalOpen(true);
    }
  };

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPegawai || !dossierFormData.fileName) return;
    
    const file = dossierFileInputRef.current?.files?.[0];
    if (!file) return alert("Silakan pilih file berkas terlebih dahulu.");

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`DOSSIER_${selectedPegawai.nip}_${Date.now()}`, file.type, base64);
      
      if (res.success && res.fileUrl) {
        const payload: Dossier = {
          id: `DOS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          nip: selectedPegawai.nip,
          namaPegawai: selectedPegawai.nama,
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          keterangan: dossierFormData.keterangan || '-',
          fileName: dossierFormData.fileName!,
          fileUrl: res.fileUrl
        };
        
        const ok = await syncTableRemote('DOSSIER', 'SAVE', payload);
        if (ok) {
          setSuccessMsg(`Berkas "${payload.fileName}" berhasil ditambahkan ke E-Dossier.`);
          await loadData();
          setIsAddDossierOpen(false);
          setDossierFormData({ fileName: '', keterangan: '' });
          setShowSuccess(true);
        }
      } else {
        alert("Gagal mengunggah file ke Drive.");
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nip || !formData.nama) return alert("NIP dan Nama wajib diisi.");
    setSyncing(true);
    
    // Generate ID for new records
    const payload = {
      ...formData,
      id: formData.id || `PEG-${formData.nip}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      updatedAt: new Date().toISOString()
    };

    const success = await savePegawai(payload);
    if (success) {
      setSuccessMsg(`Data ${formData.nama} berhasil disinkronkan ke database cloud.`);
      await loadData();
      setIsModalOpen(false);
      setShowSuccess(true);
    } else {
      alert("Gagal menyimpan data ke server.");
    }
    setSyncing(false);
  };

  const inputClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950";
  const inputNoCapsClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950";
  const labelClass = "text-[9px] font-black text-gray-400 ml-3 tracking-widest block mb-1.5";
  const detailLabel = "text-[8px] font-black text-gray-400 tracking-[0.2em] block mb-1.5";
  const detailValue = "text-[13px] font-black text-gray-900 leading-tight";
  const detailValueNoCaps = "text-[13px] font-black text-gray-900 leading-tight";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => !syncing && setIsConfirmOpen(false)} onConfirm={async () => {
           if(pegawaiToDelete) {
             setSyncing(true);
             const ok = await syncTableRemote('PEGAWAI', 'DELETE', { 
               id: pegawaiToDelete.id, 
               nip: pegawaiToDelete.nip,
               nama: pegawaiToDelete.nama 
             });
             if (ok) {
               logActivity('DELETE', 'Pegawai', `Hapus data pegawai: ${pegawaiToDelete.nama}`);
               await loadData(true);
               setIsConfirmOpen(false);
               if (selectedPegawai?.nip === pegawaiToDelete.nip) {
                 setSelectedPegawai(null);
               }
             } else {
               alert("Gagal menghapus data dari server.");
             }
             setSyncing(false);
           }
        }} loading={syncing} message={`Hapus data pegawai "${pegawaiToDelete?.nama}" secara permanen?`} />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6">
        <div className="w-full lg:w-auto">
          <div className="flex items-center justify-between lg:justify-start gap-4">
            <h3 className="text-xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Database ASN DJKI</h3>
             <div className="flex flex-col items-end gap-1">
               <span className="px-2 md:px-4 py-1 md:py-1.5 bg-blue-600 text-white rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase shadow-lg shadow-blue-600/20">{filteredPegawai.length} / {pegawaiList.length} Pegawai</span>
               <div className="flex items-center gap-2">
                 <span className="text-[7px] md:text-[9px] font-black text-gray-400 uppercase tracking-tighter">Database Source: {pegawaiList.length}</span>
                 {duplicateNips.length > 0 && <span className="text-[7px] md:text-[9px] font-black text-rose-500 uppercase tracking-tighter animate-pulse">! {duplicateNips.length} Duplikat</span>}
                 {invalidItems.length > 0 && <span className="text-[7px] md:text-[9px] font-black text-rose-500 uppercase tracking-tighter animate-pulse">! {invalidItems.length} Error</span>}
               </div>
             </div>
          </div>
          <div className="flex flex-wrap gap-1 md:gap-2 mt-3">

            <div className="flex items-center gap-1 px-2 md:px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-wider">Aktif: {statusCounts['Aktif'] || 0}</span>
            </div>
            <div className="flex items-center gap-1 px-2 md:px-3 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-amber-500 rounded-full"></span>
              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-wider">Tugas: {statusCounts['Tugas Belajar'] || 0}</span>
            </div>
            <div className="flex items-center gap-1 px-2 md:px-3 py-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
              <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-rose-500 rounded-full"></span>
              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-wider">Off: {statusCounts['Tidak Aktif'] || 0}</span>
            </div>
            <div className="flex items-center gap-1 px-2 md:px-3 py-1 bg-gray-50 text-gray-600 rounded-lg border border-gray-100">
              <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-500 rounded-full"></span>
              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-wider">Pensiun: {statusCounts['Pensiun'] || 0}</span>
            </div>
          </div>
          <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3 flex items-center gap-2"><i className="bi bi-shield-check text-blue-600"></i> Terintegrasi dengan Cloud Google Spreadsheet</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto">
           <button onClick={() => handleExportExcel('SHARE')} className="h-10 md:h-14 px-3 md:px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"><i className="bi bi-file-earmark-spreadsheet-fill text-base md:text-lg"></i> <span className="hidden xs:inline">Share</span><span className="xs:hidden">Shr</span></button>
           {canEdit && (<button onClick={() => handleExportExcel('FULL')} className="h-10 md:h-14 px-3 md:px-6 bg-emerald-600 text-white rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"><i className="bi bi-database-fill-down text-base md:text-lg"></i> <span className="hidden xs:inline">Full</span><span className="xs:hidden">Full</span></button>)}
           {canEdit && (<button onClick={() => { setSelectedPegawai(null); setFormData({status: 'Aktif', jenisPegawai: 'PNS', gender: 'L', unitKerja: UNIT_KERJA[0]}); setIsModalOpen(true); }} className="col-span-2 sm:w-auto h-10 md:h-14 px-4 md:px-10 bg-[#111827] text-white rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"><i className="bi bi-person-plus-fill text-base md:text-lg"></i> <span className="hidden xs:inline">Registrasi Pegawai</span><span className="xs:hidden">Registrasi</span></button>)}
        </div>
      </div>

      <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-3 md:gap-4">
        <div className="relative w-full">
          <i className="bi bi-search absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-gray-400 text-xs md:text-base"></i>
          <input type="text" placeholder="Pencarian Cepat: Nama, NIP, atau NIK..." className="w-full pl-10 md:pl-14 pr-6 md:pr-8 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[9px] md:text-xs font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
          <select className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
              <option>Semua Unit</option>
              {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
          </select>
          <div ref={jenisDropdownRef} className="relative w-full">
            <button 
              type="button"
              onClick={() => setIsJenisDropdownOpen(!isJenisDropdownOpen)}
              className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase text-left flex justify-between items-center transition-all hover:border-gray-200 outline-none"
            >
              <span className="truncate">
                {filterJenis === 'Semua Jenis' || !filterJenis
                  ? 'Semua Jenis'
                  : filterJenis.split(',').join(' + ')}
              </span>
              <i className={`bi bi-chevron-${isJenisDropdownOpen ? 'up' : 'down'} text-gray-400 text-xs`}></i>
            </button>
            {isJenisDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 space-y-2 max-h-60 overflow-y-auto">
                <label className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                  <input 
                    type="checkbox"
                    checked={filterJenis === 'Semua Jenis' || !filterJenis}
                    onChange={() => setFilterJenis('Semua Jenis')}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-gray-700">Semua Jenis</span>
                </label>
                <div className="h-px bg-gray-100 my-1"></div>
                {['PNS', 'CPNS', 'PPPK', 'PPPK Paruh Waktu'].map(jenis => {
                  const currentList = filterJenis === 'Semua Jenis' ? [] : filterJenis.split(',').filter(Boolean);
                  const isChecked = currentList.includes(jenis);
                  const handleCheckboxChange = () => {
                    let newList: string[];
                    if (isChecked) {
                      newList = currentList.filter(item => item !== jenis);
                    } else {
                      newList = [...currentList, jenis];
                    }
                    if (newList.length === 0) {
                      setFilterJenis('Semua Jenis');
                    } else {
                      setFilterJenis(newList.join(','));
                    }
                  };
                  return (
                    <label key={jenis} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-gray-800">{jenis}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <select className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option>Semua Status</option>
              <option value="Aktif">AKTIF</option>
              <option value="Tidak Aktif">TIDAK AKTIF</option>
              <option value="Pensiun">PENSIUN</option>
              <option value="Tugas Belajar">TUGAS BELAJAR</option>
          </select>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
            <div className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] w-full">
              <span className="text-[7px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Gol:</span>
              <select className="bg-transparent border-none outline-none text-[8px] md:text-[10px] font-black uppercase w-full cursor-pointer hover:text-blue-600" value={minGolongan} onChange={e => setMinGolongan(e.target.value)}>
                  <option value="Semua">DARI</option>
                  {Object.keys(PANGKAT_MAP).sort((a, b) => {
                    const romValues: Record<string, number> = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };
                    const rankA = a.split('/')[0];
                    const rankB = b.split('/')[0];
                    if (rankA !== rankB) return (romValues[rankA] || 0) - (romValues[rankB] || 0);
                    return a.localeCompare(b);
                  }).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
              </select>
              <span className="text-gray-300 font-bold">»</span>
              <select className="bg-transparent border-none outline-none text-[8px] md:text-[10px] font-black uppercase w-full cursor-pointer hover:text-blue-600" value={maxGolongan} onChange={e => setMaxGolongan(e.target.value)}>
                  <option value="Semua">SAMPAI</option>
                  {Object.keys(PANGKAT_MAP).sort((a, b) => {
                    const romValues: Record<string, number> = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };
                    const rankA = a.split('/')[0];
                    const rankB = b.split('/')[0];
                    if (rankA !== rankB) return (romValues[rankA] || 0) - (romValues[rankB] || 0);
                    return a.localeCompare(b);
                  }).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem]">
            <span className="text-[7px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Usia:</span>
            <input 
              type="number" 
              placeholder="Min" 
              className="flex-1 bg-transparent text-[8px] md:text-[10px] font-black outline-none border-b border-gray-200 focus:border-blue-600 text-center" 
              value={minAge} 
              onChange={e => setMinAge(e.target.value)} 
            />
            <span className="text-[7px] md:text-[9px] font-black text-gray-400">-</span>
            <input 
              type="number" 
              placeholder="Max" 
              className="flex-1 bg-transparent text-[8px] md:text-[10px] font-black outline-none border-b border-gray-200 focus:border-blue-600 text-center" 
              value={maxAge} 
              onChange={e => setMaxAge(e.target.value)} 
            />
          </div>
          <button 
            onClick={() => {
              setSearchTerm('');
              setFilterUnit('Semua Unit');
              setFilterJenis('Semua Jenis');
              setFilterStatus('Semua Status');
              setMinGolongan('Semua');
              setMaxGolongan('Semua');
              setMinAge('');
              setMaxAge('');
            }}
            className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-slate-100/50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase outline-none hover:bg-rose-50 hover:text-rose-600 transition-all text-slate-400 flex items-center justify-center gap-2"
          >
            <i className="bi bi-arrow-counterclockwise text-sm"></i>
            Reset Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
        {loading ? Array(6).fill(0).map((_,i) => <div key={i} className="h-32 md:h-44 bg-white rounded-2xl md:rounded-[3rem] animate-pulse"></div>) : 
         (filteredPegawai || []).map((p, i) => {
           const pNip = (p.nip || '').replace(/\D/g, '');
           const isDup = duplicateNips.includes(pNip);
           const isInv = invalidItems.some(inv => inv.id === p.id || (inv.nip && inv.nip === p.nip));
           
           return (
             <div key={`${p.nip}-${i}`} onClick={() => navigate(`/pegawai/${p.nip}`)} className={`bg-white p-3 md:p-7 rounded-xl md:rounded-[3rem] border shadow-sm group hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden ${isDup || isInv ? 'border-rose-200 bg-rose-50/10' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3 md:gap-6">
                   <div className={`h-12 w-12 md:h-20 md:w-20 rounded-lg md:rounded-[1.8rem] overflow-hidden border-2 md:border-4 border-white shadow-xl group-hover:scale-105 transition-transform shrink-0 ${isDup || isInv ? 'bg-rose-100' : 'bg-blue-50'}`}>
                      {p.foto ? <img src={getPhotoUrl(p.foto)} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className={`h-full w-full flex items-center justify-center font-black text-lg md:text-3xl ${isDup || isInv ? 'text-rose-600' : 'text-blue-600'}`}>{p.nama ? p.nama.charAt(0) : '?'}</div>}
                   </div>
                   <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-[10px] md:text-[13px] font-black truncate leading-tight ${isDup || isInv ? 'text-rose-700' : 'text-gray-950'}`}>{formatPegawaiName(p.nama || '(Nama Kosong)')}</h4>
                        {(isDup || isInv) && <i className="bi bi-exclamation-triangle-fill text-rose-500 text-[10px]" title={isInv ? "Data Tidak Valid" : "NIP Duplikat"}></i>}
                      </div>
                      <p className="text-[7px] md:text-[9px] font-mono text-gray-400 mt-1 uppercase tracking-tighter md:tracking-normal">NIP. {p.nip || 'TIDAK TERDETEKSI'}</p>
                      {canEdit && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setPegawaiToDelete(p); 
                            setIsConfirmOpen(true); 
                          }}
                          className={`${isDup || isInv ? 'bg-rose-100 text-rose-600' : 'bg-rose-50 text-rose-500'} absolute top-2 right-2 md:top-4 md:right-4 h-6 w-6 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white shadow-sm shrink-0 z-10`}
                        >
                          <i className="bi bi-trash3-fill text-[10px] md:text-sm"></i>
                        </button>
                      )}
                      <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-1.5 md:mt-2">
                         <span className={`px-1 md:px-2 py-0.5 text-[5px] md:text-[7px] font-black rounded border uppercase ${isDup || isInv ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{p.golRuang || '-'}</span>
                         <span className="px-1 md:px-2 py-0.5 bg-gray-50 text-gray-500 text-[5px] md:text-[7px] font-black rounded border border-gray-200 uppercase truncate max-w-[60px] md:max-w-none">{p.jenisPegawai || '-'}</span>
                      </div>
                   </div>
                </div>
                {isInv && <div className="absolute top-0 right-0 px-2 py-0.5 bg-rose-600 text-white text-[6px] font-black uppercase tracking-tighter">DATA BERMASALAH</div>}
                {isDup && !isInv && <div className="absolute top-0 right-0 px-2 py-0.5 bg-rose-500 text-white text-[6px] font-black uppercase tracking-tighter">DUPLIKAT</div>}
             </div>
           );
         })}
      </div>

      {isAddDossierOpen && selectedPegawai && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm" onClick={() => !uploading && setIsAddDossierOpen(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter border border-white/20">
              <div className="p-6 md:p-8 border-b bg-gray-50 flex justify-between items-center shrink-0">
                 <div>
                    <h4 className="text-lg md:text-xl font-black uppercase text-gray-950 tracking-tighter">Tambah Berkas Digital</h4>
                    <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Upload to Personnel Dossier</p>
                 </div>
                 <button onClick={() => setIsAddDossierOpen(false)} className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all">
                    <i className="bi bi-x-lg text-lg"></i>
                 </button>
              </div>
              <form onSubmit={handleSaveDossier} className="p-6 md:p-10 space-y-4 md:space-y-6">
                 <div>
                    <label className={labelClass}>Nama Berkas / Jenis Dokumen</label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      placeholder="Contoh: SK Kenaikan Pangkat 2024"
                      value={dossierFormData.fileName || ''}
                      onChange={e => setDossierFormData({...dossierFormData, fileName: e.target.value})}
                      required 
                    />
                 </div>
                 <div>
                    <label className={labelClass}>Keterangan Tambahan</label>
                    <textarea 
                      className={`${inputNoCapsClass} h-20 md:h-24 resize-none`}
                      placeholder="Catatan opsional..."
                      value={dossierFormData.keterangan || ''}
                      onChange={e => setDossierFormData({...dossierFormData, keterangan: e.target.value})}
                    />
                 </div>
                 <div className="p-6 md:p-8 bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl md:rounded-[2rem] flex flex-col items-center gap-3 md:gap-4">
                    <div className="h-12 w-12 md:h-16 md:w-16 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 shadow-xl">
                       <i className="bi bi-cloud-arrow-up text-2xl md:text-3xl"></i>
                    </div>
                    <div className="text-center">
                       <p className="text-[9px] md:text-[10px] font-black uppercase text-gray-950">Pilih File Berkas</p>
                       <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase mt-1">PDF atau Gambar (Maks 10MB)</p>
                    </div>
                    <button type="button" onClick={() => dossierFileInputRef.current?.click()} className="px-5 md:px-6 py-2 bg-white border border-gray-100 text-blue-600 rounded-xl text-[8px] md:text-[9px] font-black uppercase shadow-sm">Pilih File</button>
                    <input type="file" ref={dossierFileInputRef} className="hidden" accept=".pdf,image/*" />
                 </div>
                 <div className="pt-4 md:pt-6 border-t flex flex-col sm:flex-row gap-2 md:gap-3">
                    <button type="button" onClick={() => setIsAddDossierOpen(false)} className="w-full sm:flex-1 py-3 md:py-4 bg-gray-50 text-gray-400 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase">Batal</button>
                    <button type="submit" disabled={uploading} className="w-full sm:flex-[2] py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 md:gap-3 active:scale-95 transition-all">
                       {uploading && <div className="h-3 w-3 md:h-4 md:w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                       <span>Unggah & Simpan Berkas</span>
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center p-2 md:p-4 pt-[80px] md:pt-[140px] pb-10">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && !uploading && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-6xl rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-full border border-white/20 mt-auto sm:mt-0">
              
              <div className="p-5 md:p-8 border-b bg-gray-50 shrink-0 flex justify-between items-center relative z-50">
                 <div>
                    <h4 className="text-lg md:text-xl font-black uppercase text-gray-950 tracking-tighter">{formData.id ? 'Perbarui Data Lengkap' : 'Registrasi Pegawai Baru'}</h4>
                    <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Personnel Record Management</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white border border-gray-100 rounded-xl md:rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95">
                    <i className="bi bi-x-lg text-lg md:text-xl"></i>
                 </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar space-y-8 md:space-y-12 bg-white">
                 <section className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3 md:gap-4"><div className="h-6 md:h-8 w-1.5 md:w-2 bg-blue-600 rounded-full"></div><h5 className="text-[10px] md:text-[11px] font-black text-gray-950 uppercase tracking-widest">A. Identitas Pokok</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                       <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          <div><label className={labelClass}>NIP (18 Digit)</label><input type="text" maxLength={18} className={inputClass} value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value.replace(/\D/g, '')})} required /></div>
                          <div><label className={labelClass}>Nomor NIK KTP</label><input type="text" className={inputClass} value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value})} /></div>
                          <div className="col-span-full"><label className={labelClass}>Nama Lengkap</label><input type="text" className={inputNoCapsClass} value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} required /></div>
                          
                          <div><label className={labelClass}>Agama</label><input type="text" className={inputClass} value={formData.agama || ''} onChange={e => setFormData({...formData, agama: e.target.value})} /></div>
                          <div><label className={labelClass}>Jenis Kelamin</label><select className={inputClass} value={formData.gender || 'L'} onChange={e => setFormData({...formData, gender: e.target.value as any})}><option value="L">LAKI-LAKI</option><option value="P">PEREMPUAN</option></select></div>
                          <div><label className={labelClass}>Tempat Lahir</label><input type="text" className={inputClass} value={formData.tempatLahir || ''} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} /></div>
                          <div><label className={labelClass}>Tanggal Lahir</label><input type="date" className={inputNoCapsClass} value={formData.tanggalLahir || ''} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} /></div>
                          <div><label className={labelClass}>Nama Bank</label>
                            <select 
                              className={inputClass} 
                              value={BANK_LIST.includes(formData.namaBank || '') ? (formData.namaBank || '') : (formData.namaBank ? 'LAINNYA' : '')} 
                              onChange={e => setFormData({...formData, namaBank: e.target.value})}
                            >
                              <option value="">- PILIH BANK -</option>
                              {BANK_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                              <option value="LAINNYA">LAINNYA (KETIK MANUAL)</option>
                            </select>
                          </div>
                          <div><label className={labelClass}>No. Rekening Gaji</label><input type="text" className={inputClass} value={formData.noRekeningGaji || ''} onChange={e => setFormData({...formData, noRekeningGaji: e.target.value})} /></div>
                          {(formData.namaBank === 'LAINNYA' || (formData.namaBank && !BANK_LIST.includes(formData.namaBank))) && (
                            <div className="col-span-full animate-fadeIn">
                              <label className={labelClass}>Ketik Nama Bank Lainnya</label>
                              <input 
                                type="text" 
                                className={inputClass} 
                                placeholder="Contoh: BANK SUMUT" 
                                value={BANK_LIST.includes(formData.namaBank || '') ? '' : (formData.namaBank || '')}
                                onChange={e => setFormData({...formData, namaBank: e.target.value.toUpperCase()})} 
                              />
                            </div>
                          )}
                       </div>
                       <div className="md:col-span-4 bg-gray-50 p-6 md:p-8 rounded-3xl md:rounded-[3rem] border border-gray-100 flex flex-col items-center text-center">
                          <div className="h-36 w-36 md:h-44 md:w-44 bg-white rounded-3xl md:rounded-[3rem] border-4 border-white shadow-xl overflow-hidden mb-4 md:mb-6 relative group">
                             {formData.foto ? <img src={getPhotoUrl(formData.foto)} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="h-full w-full flex items-center justify-center text-blue-600 text-3xl md:text-4xl font-black bg-blue-50/50">?</div>}
                             <div 
                               className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                               onClick={() => fileInputRef.current?.click()}
                             >
                               <i className="bi bi-camera-fill text-white text-3xl"></i>
                             </div>
                          </div>
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 md:px-8 py-2 md:py-3 bg-blue-600 text-white rounded-xl text-[8px] md:text-[9px] font-black uppercase shadow-lg hover:bg-blue-700 transition-colors">Ganti Foto Profil</button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoFileChange} />
                       </div>
                    </div>
                 </section>

                 <section className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3 md:gap-4"><div className="h-6 md:h-8 w-1.5 md:w-2 bg-indigo-600 rounded-full"></div><h5 className="text-[10px] md:text-[11px] font-black text-gray-950 uppercase tracking-widest">B. Jabatan & Penempatan (Auto)</h5></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <div className="sm:col-span-2"><label className={labelClass}>Nama Jabatan</label><input type="text" className={inputClass} value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} /></div>
                        <div><label className={labelClass}>Jenis Jabatan (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.jenisJabatan || '-'} /></div>
                        <div><label className={labelClass}>Klasifikasi Jabatan (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.klasifikasiJabatan || '-'} /></div>
                       <div><label className={labelClass}>TMT Jabatan</label><input type="date" className={inputNoCapsClass} value={formData.tmtJabatan || ''} onChange={e => setFormData({...formData, tmtJabatan: e.target.value})} /></div>
                       <div><label className={labelClass}>Eselon (Jika Ada)</label><select className={inputClass} value={formData.eselon || '-'} onChange={e => setFormData({...formData, eselon: e.target.value})}><option value="-">-</option><option value="I.a">I.a</option><option value="I.b">I.b</option><option value="II.a">II.a</option><option value="II.b">II.b</option><option value="III.a">III.a</option><option value="IV.a">IV.a</option></select></div>
                       <div className="sm:col-span-2">
                           <label className={labelClass}>Unit Kerja Utama</label>
                           <select 
                               className={inputClass} 
                               value={formData.unitKerja || UNIT_KERJA[0]} 
                               onChange={e => {
                                   const unit = e.target.value;
                                   const bagians = Object.keys(ORGANISASI_STRUCTURE[unit] || {});
                                   const firstBagian = bagians[0] || '';
                                   const subs = (ORGANISASI_STRUCTURE[unit] && firstBagian) ? ORGANISASI_STRUCTURE[unit][firstBagian] : [];
                                   const firstSub = subs[0] || '';
                                   
                                   setFormData({
                                       ...formData, 
                                       unitKerja: unit,
                                       bagian: firstBagian,
                                       subBagian: firstSub
                                   });
                               }}
                           >
                               {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                           </select>
                       </div>
                       <div className="sm:col-span-2">
                           <label className={labelClass}>Nama Bagian</label>
                           <select 
                               className={inputClass} 
                               value={formData.bagian || ''} 
                               onChange={e => {
                                   const bagian = e.target.value;
                                   const unit = formData.unitKerja || UNIT_KERJA[0];
                                   const subs = (ORGANISASI_STRUCTURE[unit] && bagian) ? ORGANISASI_STRUCTURE[unit][bagian] : [];
                                   const firstSub = subs[0] || '';
                                   
                                   setFormData({
                                       ...formData, 
                                       bagian: bagian,
                                       subBagian: firstSub
                                   });
                               }}
                           >
                               <option value="">- PILIH BAGIAN -</option>
                               {formData.unitKerja && ORGANISASI_STRUCTURE[formData.unitKerja] ? 
                                   Object.keys(ORGANISASI_STRUCTURE[formData.unitKerja]).map(b => (
                                       <option key={b} value={b}>{b.toUpperCase()}</option>
                                   )) : null
                               }
                           </select>
                       </div>
                       <div className="sm:col-span-2">
                           <label className={labelClass}>Nama Sub Bagian / Tim</label>
                           <select 
                               className={inputClass} 
                               value={formData.subBagian || ''} 
                               onChange={e => setFormData({...formData, subBagian: e.target.value})}
                           >
                               <option value="">- PILIH SUB BAGIAN / TIM -</option>
                               {formData.unitKerja && formData.bagian && ORGANISASI_STRUCTURE[formData.unitKerja]?.[formData.bagian] ? 
                                   ORGANISASI_STRUCTURE[formData.unitKerja][formData.bagian].map(s => (
                                       <option key={s} value={s}>{s.toUpperCase()}</option>
                                   )) : null
                               }
                           </select>
                       </div>
                    </div>
                 </section>

                 <section className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3 md:gap-4"><div className="h-6 md:h-8 w-1.5 md:w-2 bg-emerald-600 rounded-full"></div><h5 className="text-[10px] md:text-[11px] font-black text-gray-950 uppercase tracking-widest">C. Pangkat & Masa Kerja</h5></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                       <div><label className={labelClass}>Golongan / Ruang</label><select className={inputClass} value={formData.golRuang || 'III/a'} onChange={e => setFormData({...formData, golRuang: e.target.value})}>{Object.keys(PANGKAT_MAP).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                       <div className="sm:col-span-2 md:col-span-2"><label className={labelClass}>Pangkat (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.pangkat || '-'} /></div>
                       <div><label className={labelClass}>TMT Pangkat</label><input type="date" className={inputNoCapsClass} value={formData.tmtPangkat || ''} onChange={e => setFormData({...formData, tmtPangkat: e.target.value})} /></div>
                       <div><label className={labelClass}>Jenis Pegawai</label><select className={inputClass} value={formData.jenisPegawai || 'PNS'} onChange={e => setFormData({...formData, jenisPegawai: e.target.value})}><option value="PNS">PNS</option><option value="CPNS">CPNS</option><option value="PPPK">PPPK</option><option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option></select></div>
                       <div><label className={labelClass}>Status Aktif</label><select className={inputClass} value={formData.status || 'Aktif'} onChange={e => setFormData({...formData, status: e.target.value})}><option value="Aktif">AKTIF</option><option value="Tidak Aktif">TIDAK AKTIF</option><option value="Pensiun">PENSIUN</option><option value="Tugas Belajar">TUGAS BELAJAR</option></select></div>
                       <div><label className={labelClass}>TMT CPNS (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.tmtCpns || '-'} /></div>
                       <div><label className={labelClass}>Masa Kerja (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.masaKerja || '-'} /></div>
                        <div><label className={labelClass}>MK Golongan (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.masaKerjaGolongan || '-'} /></div>
                        <div><label className={labelClass}>MK Pensiun (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.masaKerjaPensiun || '-'} /></div>
                        <div><label className={labelClass}>Usia (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.usia || '-'} /></div>
                        <div><label className={labelClass}>Sisa Masa Kerja (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.sisaMasaKerja || '-'} /></div>
                    </div>
                 </section>

                 <section className="space-y-4 md:space-y-6">
                     <div className="flex items-center gap-3 md:gap-4"><div className="h-6 md:h-8 w-1.5 md:w-2 bg-rose-600 rounded-full"></div><h5 className="text-[10px] md:text-[11px] font-black text-gray-950 uppercase tracking-widest">D. Informasi Pensiun (Auto Calculation)</h5></div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <div><label className={labelClass}>Tgl Pensiun</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.tglPensiun || '-'} /></div>
                        <div><label className={labelClass}>TMT Pensiun</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.tmtPensiun || '-'} /></div>
                        <div><label className={labelClass}>Usia Pensiun</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.usiaPensiun || '-'} /></div>
                        <div><label className={labelClass}>BUP</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.bup || '-'} /></div>
                     </div>
                  </section>

                  <section className="space-y-4 md:space-y-6 pb-10">
                    <div className="flex items-center gap-3 md:gap-4"><div className="h-6 md:h-8 w-1.5 md:w-2 bg-amber-500 rounded-full"></div><h5 className="text-[10px] md:text-[11px] font-black text-gray-950 uppercase tracking-widest">E. Kontak & Dokumen Identitas</h5></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                       <div><label className={labelClass}>Nomor HP / WhatsApp</label><input type="text" className={inputClass} value={formData.noHp || ''} onChange={e => setFormData({...formData, noHp: e.target.value})} /></div>
                       <div className="sm:col-span-2"><label className={labelClass}>Email Personal / Dinas</label><input type="email" className={inputNoCapsClass} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                       <div><label className={labelClass}>Nomor NPWP</label><input type="text" className={inputClass} value={formData.npwp || ''} onChange={e => setFormData({...formData, npwp: e.target.value})} /></div>
                       <div><label className={labelClass}>Nomor BPJS Kesehatan</label><input type="text" className={inputClass} value={formData.noBpjs || ''} onChange={e => setFormData({...formData, noBpjs: e.target.value})} /></div>
                       <div><label className={labelClass}>No. Karis / Karsu</label><input type="text" className={inputClass} value={formData.noKarisKarsu || ''} onChange={e => setFormData({...formData, noKarisKarsu: e.target.value})} /></div>
                        <div><label className={labelClass}>Nomor Tapera</label><input type="text" className={inputClass} value={formData.noTAPERA || ''} onChange={e => setFormData({...formData, noTAPERA: e.target.value})} /></div>
                       <div className="sm:col-span-2 md:col-span-3"><label className={labelClass}>Alamat Lengkap Domisili</label><textarea rows={3} className={`${inputNoCapsClass} h-20 md:h-24 resize-none`} value={formData.alamat || ''} onChange={e => setFormData({...formData, alamat: e.target.value})} placeholder="Masukkan alamat lengkap sesuai KTP/Domisili saat ini..." /></div>
                       <div><label className={labelClass}>Jenjang Pendidikan Terakhir</label><input type="text" className={inputClass} value={formData.pendidikan || ''} onChange={e => setFormData({...formData, pendidikan: e.target.value})} placeholder="exp: S1 / S2 / D3" /></div>
                       <div className="sm:col-span-2"><label className={labelClass}>Program Studi / Jurusan</label><input type="text" className={inputClass} value={formData.jurusan || ''} onChange={e => setFormData({...formData, jurusan: e.target.value})} /></div>
                    </div>
                 </section>
              </form>

              <div className="p-5 md:p-8 bg-gray-50 border-t shrink-0 flex flex-col sm:flex-row justify-center gap-3 md:gap-4 relative z-50">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 bg-white border border-gray-200 text-gray-400 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-sm">Batalkan</button>
                 <button onClick={handleSave} disabled={syncing || uploading} className="w-full sm:w-auto px-10 md:px-20 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 md:gap-4">
                    {(syncing || uploading) && <div className="h-3 w-3 md:h-4 md:w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Simpan Perubahan Database</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm" onClick={() => !uploading && setIsPhotoModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-modalEnter border border-white/20">
            <div className="p-6 border-b flex justify-between items-center">
              <h4 className="text-lg font-black uppercase text-gray-950 tracking-tighter">Pratinjau Foto Profil</h4>
              <button onClick={() => setIsPhotoModalOpen(false)} className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-rose-500">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="p-8 flex flex-col items-center">
              <div className="h-48 w-48 rounded-[2rem] border-4 border-blue-50 shadow-inner overflow-hidden mb-8">
                <img src={tempPhotoPreview} className="h-full w-full object-cover" alt="Preview" />
              </div>
              <div className="space-y-3 w-full">
                <button 
                  onClick={handleUploadPhoto} 
                  disabled={uploading}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  {uploading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <><i className="bi bi-cloud-arrow-up-fill"></i> Upload Sekarang</>
                  )}
                </button>
                <button 
                  onClick={() => setIsPhotoModalOpen(false)} 
                  disabled={uploading}
                  className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all"
                >
                  Batalkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PegawaiPage;
