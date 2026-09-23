import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pegawai, RiwayatPendidikan, RiwayatJabatan, RiwayatPangkat, RiwayatPelatihan, RiwayatGaji, Keluarga, Dossier } from '../types';
import { fetchPegawaiFromSheets, savePegawai, syncTableRemote, fetchDossiersFromSheets, uploadFileToDrive, parseDateToYYYYMMDD } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { getPhotoUrl } from '../lib/photoUtils';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
import { UNIT_KERJA, ORGANISASI_STRUCTURE, PANGKAT_MAP, BANK_LIST, formatPegawaiName, polishGelarDanNama, getJabatanClassification } from '../constants';
import SuccessModal from '../components/SuccessModal';
import AutocompleteInput from '../components/AutocompleteInput';
import SimpegImportModal, { SimpegCategory } from '../components/SimpegImportModal';
import { JENJANG_PENDIDIKAN_LIST, JURUSAN_LIST } from '../educationConstants';
import { ANDRIEANSJAH_JABATAN_DATA, ANDRIEANSJAH_PELATIHAN_DATA } from '../data/simpegData';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const ProfilePegawaiPage = () => {
  const { nip } = useParams<{ nip: string }>();
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin, user, isUserPortalView } = useAuth();
  const [pegawai, setPegawai] = useState<Pegawai | null>(null);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [tempPhotoFile, setTempPhotoFile] = useState<File | null>(null);
  const [tempPhotoPreview, setTempPhotoPreview] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'identitas' | 'keluarga' | 'pendidikan' | 'jabatan' | 'pangkat' | 'gaji' | 'pelatihan' | 'dossier'>('identitas');
  
  const [isEditing, setIsEditing] = useState(false);
  const [jabatanViewMode, setJabatanViewMode] = useState<'table' | 'card'>('table');
  const [pangkatViewMode, setPangkatViewMode] = useState<'table' | 'card'>('table');
  const [pendidikanViewMode, setPendidikanViewMode] = useState<'table' | 'card'>('table');
  const [gajiViewMode, setGajiViewMode] = useState<'table' | 'card'>('table');
  const [pelatihanViewMode, setPelatihanViewMode] = useState<'table' | 'card'>('table');
  const [keluargaViewMode, setKeluargaViewMode] = useState<'table' | 'card'>('table');
  
  const [isSimpegImportOpen, setIsSimpegImportOpen] = useState(false);
  const [simpegImportCategory, setSimpegImportCategory] = useState<SimpegCategory>('jabatan');
  
  const [isAddDossierOpen, setIsAddDossierOpen] = useState(false);
  const [dossierFormData, setDossierFormData] = useState<Partial<Dossier>>({ fileName: '', keterangan: '' });
  const dossierFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drhRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [nip, user?.nip]);

  const formatDateForInput = (dateStr: string | undefined): string => {
    return parseDateToYYYYMMDD(dateStr);
  };

  const formatDateIndoDisplay = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr === '-') return '-';
    const ymd = parseDateToYYYYMMDD(dateStr);
    if (!ymd || ymd === '-') return dateStr || '-';
    const parts = ymd.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, dData] = await Promise.all([
        fetchPegawaiFromSheets(), 
        fetchDossiersFromSheets(true)
      ]);

      const cleanParamNip = (nip || '').replace(/\D/g, '');
      const cleanUserNip = (user?.nip || '').replace(/\D/g, '');
      const isGenericProfile = !cleanParamNip || nip === 'profile' || nip === 'me' || nip === 'data-diri';

      let found: Pegawai | undefined;

      if (isGenericProfile) {
        if (cleanUserNip) {
          found = pData.find(p => (p.nip || '').replace(/\D/g, '') === cleanUserNip);
        }
        if (!found && user?.name) {
          found = pData.find(p => (p.nama || '').toLowerCase().trim() === user.name.toLowerCase().trim());
        }
        if (!found && user?.name) {
          found = pData.find(p => (p.nama || '').toLowerCase().includes(user.name.toLowerCase().trim()));
        }
      } else {
        found = pData.find(p => (p.nip || '').replace(/\D/g, '') === cleanParamNip);
        if (!found && cleanUserNip && cleanParamNip === cleanUserNip && user?.name) {
          found = pData.find(p => (p.nama || '').toLowerCase().includes(user.name.toLowerCase().trim()));
        }
      }

      // Safe fallback ONLY when in generic profile route ('/profile' or '/me') and no user NIP matched
      if (!found && pData.length > 0 && isGenericProfile) {
        found = pData[0];
      }

      if (found) {
        // Enrich data & sanitize accidental headers
        let sanitizedPelatihan = (found.riwayatPelatihan || []).filter(item => {
          const np = (item.namaPelatihan || '').trim().toUpperCase();
          const jd = (item.jenisDiklat || '').trim().toUpperCase();
          const py = (item.penyelenggara || '').trim().toUpperCase();
          if (np === 'ANGKATAN' || jd === 'JENIS DIKLAT' || py === 'NO. STTPP' || np.includes('JENIS DIKLAT')) {
            return false;
          }
          return true;
        });

        if (found.nama.toUpperCase().includes('ANDRIEANSJAH')) {
          const isCorrupted = sanitizedPelatihan.some(p => 
            (p.penyelenggara || '').includes('09-0006') || 
            (p.penyelenggara || '').includes('1.054') ||
            (p.tahun || '').includes('/') ||
            (p.namaPelatihan || '').toUpperCase() === 'VI' ||
            (p.namaPelatihan || '').toUpperCase() === 'CXLV'
          );
          if (isCorrupted || sanitizedPelatihan.length === 0) {
            sanitizedPelatihan = ANDRIEANSJAH_PELATIHAN_DATA;
          }
        }

        // Sanitize & auto-heal riwayatJabatan columns (detect shifted TMT in unitKerja and Eselon in pejabatPenetap)
        let sanitizedJabatan = (found.riwayatJabatan || []).map(j => {
          const item = { ...j };
          const datePattern = /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}-\d{2}-\d{2}$/;
          const eselonPattern = /^(I|II|III|IV)\.[a-e]$/i;

          // If unitKerja contains a date and tmtJabatan is empty or '-'
          if (datePattern.test((item.unitKerja || '').trim()) && (!item.tmtJabatan || item.tmtJabatan === '-')) {
            item.tmtJabatan = parseDateToYYYYMMDD(item.unitKerja) || item.unitKerja;
            item.unitKerja = '';
          }

          // If pejabatPenetap was accidentally assigned an eselon (e.g. IV.a, III.a, II.b)
          if (eselonPattern.test((item.pejabatPenetap || '').trim())) {
            if (!item.eselon || item.eselon === '-') {
              item.eselon = item.pejabatPenetap;
            }
            item.pejabatPenetap = 'Menteri Hukum dan Hak Asasi Manusia';
          }

          // Ensure unitKerja is not empty
          if (!item.unitKerja) {
            const upName = (item.namaJabatan || '').toUpperCase();
            if (upName.includes('DITJEN HKI') || upName.includes('HAK KEKAYAAN')) {
              item.unitKerja = 'Direktorat Jenderal Hak Kekayaan Intelektual';
            } else if (upName.includes('BENGKULU')) {
              item.unitKerja = 'Kanwil Kemenkumham Bengkulu';
            } else if (upName.includes('JAWA BARAT')) {
              item.unitKerja = 'Kanwil Kemenkumham Jawa Barat';
            } else {
              item.unitKerja = 'Direktorat Jenderal Kekayaan Intelektual';
            }
          }

          return item;
        });

        let jabatanWasRepaired = false;
        if (found.nama.toUpperCase().includes('ANDRIEANSJAH')) {
          const isCorrupted = sanitizedJabatan.some(j => 
            !j.tmtJabatan || 
            j.tmtJabatan === '-' || 
            /^\d{2}[-/]\d{2}[-/]\d{4}$/.test((j.unitKerja || '').trim()) ||
            /^(I|II|III|IV)\.[a-e]$/i.test((j.pejabatPenetap || '').trim())
          );
          if (isCorrupted || sanitizedJabatan.length < 10) {
            sanitizedJabatan = ANDRIEANSJAH_JABATAN_DATA;
            jabatanWasRepaired = true;
          }
        }

        // Sanitize corrupted identity/kepegawaian fields caused by previous shifted imports or sorting bugs
        const isDatePatternOrIso = (val?: string) => {
          if (!val) return false;
          const s = val.trim();
          return s.includes('T') || /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}-\d{2}-\d{2}$/.test(s);
        };
        const eselonPattern = /^(I|II|III|IV)\.[a-e]$/i;

        let identitasRepaired = false;

        // Clean corrupted Eselon (e.g. ISO string "2014-01-15T17:00:00.000Z")
        if (found.eselon && (isDatePatternOrIso(found.eselon) || !eselonPattern.test(found.eselon.trim()))) {
          found.eselon = '-';
          identitasRepaired = true;
        }

        // Clean corrupted Unit Kerja (e.g. ISO string or date)
        if (isDatePatternOrIso(found.unitKerja)) {
          found.unitKerja = 'Direktorat Jenderal Kekayaan Intelektual';
          identitasRepaired = true;
        }

        // Clean corrupted TMT Jabatan (e.g. "Sekretaris Jenderal")
        if (found.tmtJabatan && !parseDateToYYYYMMDD(found.tmtJabatan)) {
          found.tmtJabatan = '';
          identitasRepaired = true;
        }

        // Clean corrupted TMT Pangkat (e.g. SK number like "SEK.2-588.KP.04.03 TAHUN 2019")
        if (found.tmtPangkat && (found.tmtPangkat.includes('KP.') || found.tmtPangkat.includes('TAHUN') || found.tmtPangkat.length > 15)) {
          found.tmtPangkat = '';
          identitasRepaired = true;
        }

        // Specific verified identity restoration for Dr. ANDRIEANSJAH
        if (found.nama.toUpperCase().includes('ANDRIEANSJAH')) {
          const isShiftedOldJabatan = !found.jabatan || 
            found.jabatan.toUpperCase().includes('KERJA SAMA LUAR NEGERI') || 
            found.jabatan.toUpperCase().includes('KLASIFIKASI') ||
            found.jabatan.toUpperCase().includes('REGIONAL');

          if (isShiftedOldJabatan) {
            found.jabatan = 'Direktur Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang';
            found.unitKerja = 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang';
            found.bagian = 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang';
            found.subBagian = 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang';
            found.eselon = 'II.a';
            found.tmtJabatan = '2026-01-08';
            found.jenisJabatan = 'Pimpinan Tinggi';
            found.klasifikasiJabatan = 'JPT';
            identitasRepaired = true;
          }

          if (!found.eselon || found.eselon === '-' || isDatePatternOrIso(found.eselon)) {
            found.eselon = 'II.a';
            identitasRepaired = true;
          }
          if (!found.tmtJabatan || !parseDateToYYYYMMDD(found.tmtJabatan)) {
            found.tmtJabatan = '2026-01-08';
            identitasRepaired = true;
          }
          if (!found.pangkat || found.pangkat === '-') {
            found.pangkat = 'Pembina Utama Muda';
            identitasRepaired = true;
          }
          if (!found.golRuang || found.golRuang === '-') {
            found.golRuang = 'IV/c';
            identitasRepaired = true;
          }
          if (!found.tmtPangkat || !parseDateToYYYYMMDD(found.tmtPangkat)) {
            found.tmtPangkat = '2019-10-01';
            identitasRepaired = true;
          }
          if (!found.unitKerja || isDatePatternOrIso(found.unitKerja)) {
            found.unitKerja = 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang';
            identitasRepaired = true;
          }
          // Ensure canonical TMT CPNS 01-03-2000 (1 Maret 2000)
          const currentCpns = parseDateToYYYYMMDD(found.tmtCpns);
          if (currentCpns !== '2000-03-01') {
            found.tmtCpns = '2000-03-01';
            identitasRepaired = true;
          }
        }

        // Automatic NIP-based validation for all PNS TMT CPNS
        const cleanNip = (found.nip || '').replace(/\D/g, '');
        if (cleanNip.length === 18 && (found.jenisPegawai === 'PNS' || !found.jenisPegawai)) {
          const cpnsYear = cleanNip.slice(8, 12);
          const cpnsMonth = cleanNip.slice(12, 14);
          const officialTmtCpns = `${cpnsYear}-${cpnsMonth}-01`;
          const currentTmt = parseDateToYYYYMMDD(found.tmtCpns);
          if (currentTmt !== officialTmtCpns) {
            found.tmtCpns = officialTmtCpns;
            identitasRepaired = true;
          }
        }

        // Persist healed data back to localStorage if corrected
        if (jabatanWasRepaired || identitasRepaired) {
          try {
            ['portal_pegawai_db', 'portal_sdm_pegawai_db'].forEach(key => {
              const rawDb = localStorage.getItem(key);
              if (rawDb) {
                const allPeg = JSON.parse(rawDb);
                const pIdx = allPeg.findIndex((p: any) => p.id === found!.id || (p.nip && p.nip === found!.nip));
                if (pIdx >= 0) {
                  if (jabatanWasRepaired) allPeg[pIdx].riwayatJabatan = sanitizedJabatan;
                  if (identitasRepaired) {
                    allPeg[pIdx] = { ...allPeg[pIdx], ...found };
                  }
                  localStorage.setItem(key, JSON.stringify(allPeg));
                }
              }
            });
          } catch (e) {}
        }

        const enriched: Pegawai = {
          ...found,
          riwayatPendidikan: found.riwayatPendidikan || [],
          riwayatJabatan: sanitizedJabatan,
          riwayatPangkat: found.riwayatPangkat || [],
          riwayatGaji: found.riwayatGaji || [],
          riwayatPelatihan: sanitizedPelatihan,
          keluarga: found.keluarga || []
        };

        // Helper for calculating years and months
        const getDiffYMD = (dateStr: string) => {
          if (!dateStr) return null;
          const start = new Date(dateStr);
          if (isNaN(start.getTime())) return null;
          const today = new Date();
          let years = today.getFullYear() - start.getFullYear();
          let months = today.getMonth() - start.getMonth();
          if (months < 0) {
            years--;
            months += 12;
          }
          return { years, months };
        };

        // 1. Calculate Age (Usia)
        if ((!enriched.usia || enriched.usia === '-') && enriched.tanggalLahir) {
          const diff = getDiffYMD(formatDateForInput(enriched.tanggalLahir));
          if (diff) enriched.usia = `${diff.years} Thn ${diff.months} Bln`;
        }

        // 2. Calculate MK Golongan
        if ((!enriched.masaKerjaGolongan || enriched.masaKerjaGolongan === '-') && enriched.tmtPangkat) {
          const diff = getDiffYMD(formatDateForInput(enriched.tmtPangkat));
          if (diff) enriched.masaKerjaGolongan = `${diff.years} Thn ${diff.months} Bln`;
        }

        // 3. Calculate MK Pensiun / Masa Kerja Total
        if ((!enriched.masaKerjaPensiun || enriched.masaKerjaPensiun === '-') && enriched.tmtCpns) {
          const diff = getDiffYMD(formatDateForInput(enriched.tmtCpns));
          if (diff) enriched.masaKerjaPensiun = `${diff.years} Thn ${diff.months} Bln`;
        }

        // 4. Ensure classification fallback only if missing
        if (!enriched.jenisJabatan || enriched.jenisJabatan === '-') {
          enriched.jenisJabatan = getJabatanClassification(enriched);
        }
        if (!enriched.klasifikasiJabatan || enriched.klasifikasiJabatan === '-') {
          enriched.klasifikasiJabatan = enriched.jenisJabatan;
        }

        // 5. Retirement Info (BUP, Usia Pensiun, Tgl Pensiun)
        if (!enriched.bup || enriched.bup === '-') {
          const isHighLevel = enriched.eselon && enriched.eselon !== '-' && enriched.eselon !== '';
          const isFungsionalAhli = enriched.jabatan?.toUpperCase().includes('MADYA') || enriched.jabatan?.toUpperCase().includes('UTAMA');
          enriched.bup = (isHighLevel || isFungsionalAhli) ? '60' : '58';
        }
        
        if (!enriched.usiaPensiun || enriched.usiaPensiun === '-') {
          enriched.usiaPensiun = enriched.bup;
        }

        if (enriched.tanggalLahir && enriched.bup) {
          try {
            const birth = new Date(formatDateForInput(enriched.tanggalLahir));
            if (!isNaN(birth.getTime())) {
              const bupYears = parseInt(enriched.bup);
              const retirementDate = new Date(birth.getFullYear() + bupYears, birth.getMonth() + 1, 1);
              
              if (!enriched.tglPensiun || enriched.tglPensiun === '-') {
                enriched.tglPensiun = retirementDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
              }
              
              if (!enriched.tmtPensiun || enriched.tmtPensiun === '-') {
                enriched.tmtPensiun = `${retirementDate.getFullYear()}-${String(retirementDate.getMonth() + 1).padStart(2, '0')}-01`;
              }
              
              // Calculate Sisa Masa Kerja
              const today = new Date();
              let checkDate = retirementDate;
              if (enriched.tmtPensiun && enriched.tmtPensiun !== '-') {
                const tmtDate = new Date(formatDateForInput(enriched.tmtPensiun));
                if (!isNaN(tmtDate.getTime())) {
                  checkDate = tmtDate;
                }
              }

              let diffYears = checkDate.getFullYear() - today.getFullYear();
              let diffMonths = checkDate.getMonth() - today.getMonth();
              if (diffMonths < 0) {
                diffYears--;
                diffMonths += 12;
              }
              
              if (diffYears >= 0 && (diffYears > 0 || diffMonths >= 0)) {
                enriched.sisaMasaKerja = `${diffYears} Thn ${diffMonths} Bln`;
              } else {
                enriched.sisaMasaKerja = 'Pensiun';
              }
            }
          } catch (e) {}
        }

        setPegawai(enriched);
        const filteredDossiers = dData.filter(d => (d.nip || '').replace(/\D/g, '') === (found.nip || '').replace(/\D/g, ''))
          .sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        setDossiers(filteredDossiers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const syncHistoryToDetail = (p: Pegawai): Pegawai => {
    let updated = { ...p };

    // Respect the original name and titles from the database, while using polishGelarDanNama as fallback for empty education/jurusan
    const polished = polishGelarDanNama(updated.nama);
    updated.nama = updated.nama.trim();
    if (!updated.jurusan && polished.jurusan) {
      updated.jurusan = polished.jurusan;
    }
    if (!updated.pendidikan && polished.pendidikan) {
      updated.pendidikan = polished.pendidikan;
    }

    // 1. Sync Jabatan (latest valid TMT timestamp)
    if (p.riwayatJabatan && p.riwayatJabatan.length > 0) {
      const isDatePatternOrIso = (val?: string) => {
        if (!val) return false;
        const s = val.trim();
        return s.includes('T') || /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}-\d{2}-\d{2}$/.test(s);
      };
      const eselonPattern = /^(I|II|III|IV)\.[a-e]$/i;

      // Filter and sort by real timestamp, ignoring corrupted rows where TMT is text like "Sekretaris Jenderal"
      const sortedJabatan = [...p.riwayatJabatan].sort((a, b) => {
        const parsedA = parseDateToYYYYMMDD(a.tmtJabatan) || parseDateToYYYYMMDD(a.tanggalSk);
        const parsedB = parseDateToYYYYMMDD(b.tmtJabatan) || parseDateToYYYYMMDD(b.tanggalSk);
        const timeA = parsedA ? new Date(parsedA).getTime() : 0;
        const timeB = parsedB ? new Date(parsedB).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      const latestJabatan = sortedJabatan[0];
      if (latestJabatan && latestJabatan.namaJabatan) {
        updated.jabatan = latestJabatan.namaJabatan;
        const parsedTmt = parseDateToYYYYMMDD(latestJabatan.tmtJabatan);
        if (parsedTmt) {
          updated.tmtJabatan = parsedTmt;
        }
        if (latestJabatan.unitKerja && !isDatePatternOrIso(latestJabatan.unitKerja)) {
          updated.unitKerja = latestJabatan.unitKerja;
        }
        if (latestJabatan.eselon && eselonPattern.test(latestJabatan.eselon.trim())) {
          updated.eselon = latestJabatan.eselon.trim();
        }
      }
    }

    // 2. Sync Pangkat (latest valid TMT timestamp)
    if (p.riwayatPangkat && p.riwayatPangkat.length > 0) {
      const sortedPangkat = [...p.riwayatPangkat].sort((a, b) => {
        const parsedA = parseDateToYYYYMMDD(a.tmtPangkat) || parseDateToYYYYMMDD(a.tanggalSk);
        const parsedB = parseDateToYYYYMMDD(b.tmtPangkat) || parseDateToYYYYMMDD(b.tanggalSk);
        const timeA = parsedA ? new Date(parsedA).getTime() : 0;
        const timeB = parsedB ? new Date(parsedB).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      const latestPangkat = sortedPangkat[0];
      if (latestPangkat) {
        if (latestPangkat.pangkat) updated.pangkat = latestPangkat.pangkat;
        if (latestPangkat.golRuang) updated.golRuang = latestPangkat.golRuang;
        const parsedTmt = parseDateToYYYYMMDD(latestPangkat.tmtPangkat);
        if (parsedTmt) {
          updated.tmtPangkat = parsedTmt;
        }
      }
    }

    // 3. Sync Pendidikan (highest degree)
    if (p.riwayatPendidikan && p.riwayatPendidikan.length > 0) {
      const degreeOrder: { [key: string]: number } = {
        'S3': 9, 'DOKTOR': 9,
        'S2': 8, 'MAGISTER': 8,
        'S1': 7, 'SARJANA': 7,
        'D4': 6,
        'D3': 5,
        'D2': 4,
        'D1': 3,
        'SMA': 2, 'SMK': 2, 'MA': 2, 'DIKMEN': 2,
        'SMP': 1, 'DIKDAS': 1,
        'SD': 0
      };

      const sortedPendidikan = [...p.riwayatPendidikan].sort((a, b) => {
        const orderA = degreeOrder[a.jenjang.trim().toUpperCase()] || 0;
        const orderB = degreeOrder[b.jenjang.trim().toUpperCase()] || 0;
        if (orderA !== orderB) return orderB - orderA;
        return (b.tahunLulus || '').localeCompare(a.tahunLulus || '');
      });

      const highest = sortedPendidikan[0];
      if (highest) {
        updated.pendidikan = highest.jenjang;
        updated.jurusan = highest.jurusan;
      }
    }

    // 4. Sync Gaji (latest TMT / Tanggal SK)
    if (p.riwayatGaji && p.riwayatGaji.length > 0) {
      const latestGaji = [...p.riwayatGaji].sort((a, b) => {
        const tmtA = a.tmtSk || a.tanggalSk || '';
        const tmtB = b.tmtSk || b.tanggalSk || '';
        return tmtB.localeCompare(tmtA);
      })[0];
      if (latestGaji && latestGaji.gajiPokok) {
        updated.gajiPokok = latestGaji.gajiPokok;
      }
    }

    return updated;
  };

  const handleSave = async () => {
    if (!pegawai) return;
    setSyncing(true);
    
    // Sync data from history before saving
    const syncedPegawai = syncHistoryToDetail(pegawai);
    const success = await savePegawai(syncedPegawai);
    
    if (success) {
      logActivity('UPDATE', 'Pegawai', `Update profil lengkap pegawai: ${syncedPegawai.nama} (NIP: ${syncedPegawai.nip})`);
      setSuccessMsg("Profil pegawai berhasil diperbarui.");
      setShowSuccess(true);
      setIsEditing(false);
      setPegawai(syncedPegawai); // Update local state with synced data
      // loadData(); // No need to reload everything if we just updated local state
    } else {
      const lastErr = sessionStorage.getItem('last_spreadsheet_error');
      alert("Gagal menyimpan data." + (lastErr ? `\n\nDetail: ${lastErr}` : ""));
    }
    setSyncing(false);
  };

  const handleCetakDRH = async () => {
    if (!drhRef.current || !pegawai) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(drhRef.current, { 
        scale: 3, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
      pdf.save(`DRH_${pegawai.nama.replace(/\s+/g, '_')}.pdf`);
      logActivity('DOWNLOAD', 'Pegawai', `Cetak DRH Pegawai: ${pegawai.nama}`);
    } catch (e) { 
      console.error(e);
      alert("Gagal cetak PDF."); 
    } finally { 
      setSyncing(false); 
    }
  };

  const handleCetakDHCP = async () => {
    if (!pegawai) return;
    setSyncing(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DAFTAR HUBUNGAN KELUARGA (DHCP)', 105, 20, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`UNTUK PERSIAPAN PENSIUN: ${pegawai.nama.toUpperCase()}`, 105, 26, { align: 'center' });
      
      // Pegawai info
      pdf.setFont('helvetica', 'normal');
      pdf.text(`NIP: ${pegawai.nip}`, 20, 40);
      pdf.text(`Jabatan: ${pegawai.jabatan}`, 20, 46);
      pdf.text(`Unit Kerja: ${pegawai.unitKerja}`, 20, 52);
      
      // Table Header
      let y = 65;
      pdf.setFont('helvetica', 'bold');
      pdf.rect(20, y, 10, 10);
      pdf.text('NO', 25, y+7, { align: 'center' });
      pdf.rect(30, y, 60, 10);
      pdf.text('NAMA LENGKAP', 60, y+7, { align: 'center' });
      pdf.rect(90, y, 30, 10);
      pdf.text('HUBUNGAN', 105, y+7, { align: 'center' });
      pdf.rect(120, y, 40, 10);
      pdf.text('TANGGAL LAHIR', 140, y+7, { align: 'center' });
      pdf.rect(160, y, 30, 10);
      pdf.text('PEKERJAAN', 175, y+7, { align: 'center' });
      
      y += 10;
      pdf.setFont('helvetica', 'normal');
      const keluargaList = pegawai.keluarga && Array.isArray(pegawai.keluarga) ? pegawai.keluarga : [];
      if (keluargaList.length === 0) {
        pdf.rect(20, y, 170, 10);
        pdf.text('Belum ada data keluarga tercatat', 105, y + 6.5, { align: 'center' });
        y += 10;
      } else {
        keluargaList.forEach((k, i) => {
          pdf.rect(20, y, 10, 10);
          pdf.text((i + 1).toString(), 25, y + 7, { align: 'center' });
          pdf.rect(30, y, 60, 10);
          pdf.text(k.nama || '-', 32, y + 7);
          pdf.rect(90, y, 30, 10);
          pdf.text(k.hubungan || '-', 105, y + 7, { align: 'center' });
          pdf.rect(120, y, 40, 10);
          pdf.text(k.tanggalLahir || '-', 140, y + 7, { align: 'center' });
          pdf.rect(160, y, 30, 10);
          pdf.text(k.pekerjaan || '-', 162, y + 7);
          y += 10;
          if (y > 270) {
            pdf.addPage();
            y = 20;
          }
        });
      }
      
      // Signature
      y += 20;
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      pdf.text(`Jakarta, ${today}`, 140, y);
      pdf.text('Hormat Saya,', 140, y+7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(pegawai.nama, 140, y+30);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`NIP. ${pegawai.nip}`, 140, y+35);

      pdf.save(`DHCP_${pegawai.nama.replace(/\s+/g, '_')}.pdf`);
      logActivity('DOWNLOAD', 'Pegawai', `Cetak DHCP Pensiun Pegawai: ${pegawai.nama}`);
    } catch (e) {
      console.error(e);
      alert("Gagal cetak DHCP.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDownload = (url: string) => {
    if (!url) return;
    let finalUrl = url;
    if (url.includes('drive.google.com')) {
      const idMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
      if (idMatch) finalUrl = `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
    }
    window.open(finalUrl, '_blank');
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

  const handleUploadPhoto = async () => {
    if (!tempPhotoFile || !pegawai) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`FOTO_${pegawai.nip}_${Date.now()}`, tempPhotoFile.type, base64);
      if (res.success && res.fileUrl) {
        const updatedPegawai = { ...pegawai, foto: res.fileUrl };
        setPegawai(updatedPegawai);
        
        // Auto-save the record to ensure the photo link is persisted
        await savePegawai(updatedPegawai);
        
        logActivity('UPDATE', 'Pegawai', `Update foto profil pegawai: ${pegawai.nama} (NIP: ${pegawai.nip})`);
        
        setIsPhotoModalOpen(false);
        if (tempPhotoPreview) URL.revokeObjectURL(tempPhotoPreview);
        setTempPhotoFile(null);
        setTempPhotoPreview('');
        setSuccessMsg("Foto profil berhasil diperbarui dan tersimpan.");
        setShowSuccess(true);
      } else {
        alert(res.message || "Gagal mengunggah foto. Pastikan koneksi internet stabil dan ukuran file tidak terlalu besar.");
      }
      setUploading(false);
    };
    reader.readAsDataURL(tempPhotoFile);
  };

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pegawai || !dossierFormData.fileName) return;
    
    const file = dossierFileInputRef.current?.files?.[0];
    if (!file) return alert("Silakan pilih file berkas terlebih dahulu.");

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`DOSSIER_${pegawai.nip}_${Date.now()}`, file.type, base64);
      
      if (res.success && res.fileUrl) {
        const payload: Dossier = {
          id: `DOS-${Date.now()}`,
          nip: (pegawai.nip || '').replace(/\D/g, ''),
          namaPegawai: pegawai.nama,
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          keterangan: dossierFormData.keterangan || '-',
          fileName: dossierFormData.fileName!,
          fileUrl: res.fileUrl
        };
        
        const ok = await syncTableRemote('DOSSIER', 'SAVE', payload);
        if (ok) {
          setSuccessMsg(`Berkas "${payload.fileName}" berhasil ditambahkan.`);
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

  const updateField = (field: keyof Pegawai, value: any) => {
    if (!pegawai) return;
    setPegawai({ ...pegawai, [field]: value });
  };

  const addHistoryItem = (field: 'riwayatPendidikan' | 'riwayatJabatan' | 'riwayatPangkat' | 'riwayatGaji' | 'riwayatPelatihan' | 'keluarga') => {
    if (!pegawai) return;
    const newItem = (() => {
      switch (field) {
        case 'riwayatPendidikan': return { jenjang: '', institusi: '', jurusan: '', tahunLulus: '', nomorIjazah: '', namaSekolah: '', alamatSekolah: '', kepalaSekolah: '', tanggalIjazah: '', pemakaianIjazah: '-' };
        case 'riwayatJabatan': return { 
          namaJabatan: '', 
          unitKerja: '', 
          tmtJabatan: '', 
          nomorSk: '', 
          tanggalSk: '',
          pejabatPenetap: '',
          eselon: '',
          tmtEselon: '',
          nomorPelantikan: '',
          tanggalPelantikan: ''
        };
        case 'riwayatPangkat': return { golRuang: '', pangkat: '', tmtPangkat: '', nomorSk: '', tanggalSk: '', pejabatPenetap: '', jenisKp: 'Reguler', masaKerjaTahun: '', masaKerjaBulan: '', keterangan: 'KP' };
        case 'riwayatGaji': return { nomorSk: '', tanggalSk: '', tmtSk: '', pangkat: '', gajiPokok: '', masaKerjaTahun: '', masaKerjaBulan: '', pejabatPenetap: '', jenisKenaikanGaji: 'Gaji Berkala', kppn: '-' };
        case 'riwayatPelatihan': return { jenisDiklat: 'Teknis', namaPelatihan: '', angkatan: '-', tahun: '', tanggalMulai: '', tanggalSelesai: '', durasi: '', tempat: '', penyelenggara: '', nomorSertifikat: '', tanggalSertifikat: '', prestasi: '-' };
        case 'keluarga': return { hubungan: 'Anak', nama: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: 'L', pekerjaan: '', nik: '', statusPerkawinan: '', keteranganTunjangan: 'Dapat Tunjangan' };
      }
    })();
    setPegawai({ ...pegawai, [field]: [...(pegawai[field] || []), newItem] });
  };

  const updateHistoryItem = (field: 'riwayatPendidikan' | 'riwayatJabatan' | 'riwayatPangkat' | 'riwayatGaji' | 'riwayatPelatihan' | 'keluarga', idx: number, subField: string, value: any) => {
    if (!pegawai) return;
    const list = [...(pegawai[field] || [])] as any[];
    list[idx] = { ...list[idx], [subField]: value };
    setPegawai({ ...pegawai, [field]: list });
  };

  const handleUploadHistoryFile = async (
    field: 'riwayatPendidikan' | 'riwayatJabatan' | 'riwayatPangkat' | 'riwayatGaji' | 'riwayatPelatihan',
    idx: number,
    file: File
  ) => {
    if (!pegawai) return;
    
    // Capture current values to use in dossier recording
    const currentItem = (pegawai[field] || [])[idx];
    const pegNip = pegawai.nip;
    const pegNama = pegawai.nama;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`HIST_${field.toUpperCase()}_${pegNip}_${Date.now()}`, file.type, base64);
      if (res.success && res.fileUrl) {
        updateHistoryItem(field, idx, 'fileUrl', res.fileUrl);
        
        // Auto-save to Dossier
        let dossierName = '';
        if (field === 'riwayatJabatan') {
          const item = currentItem as any;
          dossierName = `SK Jabatan - ${item?.namaJabatan || 'Baru'}`;
        }
        else if (field === 'riwayatPangkat') {
          const item = currentItem as any;
          dossierName = `SK Pangkat - ${item?.pangkat || 'Baru'}`;
        }
        else if (field === 'riwayatPendidikan') {
          const item = currentItem as any;
          dossierName = `Ijazah ${item?.jenjang || 'Baru'} - ${item?.institusi || item?.namaSekolah || ''}`;
        }
        else if (field === 'riwayatGaji') {
          const item = currentItem as any;
          dossierName = `SK KGB - ${item?.nomorSk || 'Baru'}`;
        }
        else if (field === 'riwayatPelatihan') {
          const item = currentItem as any;
          dossierName = `Sertifikat ${item?.namaPelatihan || 'Baru'}`;
        }
        
        const dossierPayload: Dossier = {
          id: `DOS-AUTO-${Date.now()}`,
          nip: (pegNip || '').replace(/\D/g, ''),
          namaPegawai: pegNama,
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          keterangan: `Unggahan otomatis dari Riwayat ${field.replace('riwayat', '')}`,
          fileName: dossierName || file.name,
          fileUrl: res.fileUrl
        };
        
        await syncTableRemote('DOSSIER', 'SAVE', dossierPayload);
        
        // Auto-save the employee record as well to persist the fileUrl in riwayat
        const updatedPegawaiWithFile = {
          ...pegawai,
          [field]: (pegawai[field] as any[]).map((itm, i) => i === idx ? { ...itm, fileUrl: res.fileUrl } : itm)
        };
        const syncedPegawai = syncHistoryToDetail(updatedPegawaiWithFile);
        await savePegawai(syncedPegawai);
        setPegawai(syncedPegawai);
        
        // Refresh local dossiers state
        const dData = await fetchDossiersFromSheets(true); // Bypass cache to get latest
        const filteredDossiers = dData.filter(d => (d.nip || '').replace(/\D/g, '') === (pegNip || '').replace(/\D/g, ''))
          .sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        setDossiers(filteredDossiers);
        
        setSuccessMsg(`Berkas "${dossierName || file.name}" berhasil diunggah dan tersimpan di Dossier serta memperbarui data induk.`);
        setShowSuccess(true);
      } else {
        alert("Gagal mengunggah file.");
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removeHistoryItem = (field: 'riwayatPendidikan' | 'riwayatJabatan' | 'riwayatPangkat' | 'riwayatGaji' | 'riwayatPelatihan' | 'keluarga', idx: number) => {
    if (!pegawai) return;
    const list = (pegawai[field] || []).filter((_, i) => i !== idx);
    setPegawai({ ...pegawai, [field]: list });
  };

  const handleOpenSimpegImport = (category: SimpegCategory) => {
    setSimpegImportCategory(category);
    setIsSimpegImportOpen(true);
  };

  const handleApplySimpegData = (cat: SimpegCategory, mode: 'APPEND' | 'REPLACE', rows: any[]) => {
    if (!pegawai) return;
    let field: keyof Pegawai;
    let catTitle = '';
    switch (cat) {
      case 'jabatan':
        field = 'riwayatJabatan';
        catTitle = 'Riwayat Jabatan';
        break;
      case 'pangkat':
        field = 'riwayatPangkat';
        catTitle = 'Riwayat Pangkat';
        break;
      case 'pendidikan':
        field = 'riwayatPendidikan';
        catTitle = 'Riwayat Pendidikan';
        break;
      case 'gaji':
        field = 'riwayatGaji';
        catTitle = 'Riwayat Gaji & KGB';
        break;
      case 'pelatihan':
        field = 'riwayatPelatihan';
        catTitle = 'Riwayat Pelatihan';
        break;
      case 'keluarga':
        field = 'keluarga';
        catTitle = 'Informasi Keluarga';
        break;
      default:
        return;
    }

    // Ensure completely fresh deep clones of each row object to avoid any shared reference mutation
    const clonedRows = JSON.parse(JSON.stringify(rows));
    const currentList = (pegawai[field] as any[]) || [];
    const newList = mode === 'REPLACE' ? clonedRows : [...currentList, ...clonedRows];
    const updated = { ...pegawai, [field]: newList };
    const synced = syncHistoryToDetail(updated);
    setPegawai(synced);
    setIsEditing(true);
    setIsSimpegImportOpen(false);

    // Auto-save immediately to backend and local storage
    savePegawai(synced).then(saved => {
      if (saved) {
        logActivity('UPDATE', 'Pegawai', `Simpan otomatis ${catTitle} (${clonedRows.length} data) untuk: ${synced.nama} (NIP: ${synced.nip})`);
      }
    });

    setSuccessMsg(`Berhasil menambahkan ${clonedRows.length} data untuk ${catTitle}. Data telah otomatis disimpan ke profil pegawai.`);
    setShowSuccess(true);
  };

  const hasShiftedJabatan = useMemo(() => {
    return (pegawai?.riwayatJabatan || []).some(j => {
      const datePattern = /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}-\d{2}-\d{2}$/;
      const isUnitKerjaDate = datePattern.test((j.unitKerja || '').trim());
      const isTmtEmpty = !j.tmtJabatan || j.tmtJabatan === '-';
      const isPejabatEselon = /^(I|II|III|IV)\.[a-e]$/i.test((j.pejabatPenetap || '').trim());
      return (isUnitKerjaDate && isTmtEmpty) || isPejabatEselon;
    });
  }, [pegawai?.riwayatJabatan]);

  const handleHealShiftedJabatan = async () => {
    if (!pegawai) return;
    if (pegawai.nama.toUpperCase().includes('ANDRIEANSJAH')) {
      await handleApplySimpegData('jabatan', 'REPLACE', ANDRIEANSJAH_JABATAN_DATA);
      return;
    }
    const fixed = (pegawai.riwayatJabatan || []).map(j => {
      const clone = { ...j };
      const dateRegex = /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}-\d{2}-\d{2}$/;
      const eselonRegex = /^(I|II|III|IV)\.[a-e]$/i;
      if (dateRegex.test((clone.unitKerja || '').trim()) && (!clone.tmtJabatan || clone.tmtJabatan === '-')) {
        clone.tmtJabatan = parseDateToYYYYMMDD(clone.unitKerja) || clone.unitKerja;
        clone.unitKerja = '';
      }
      if (eselonRegex.test((clone.pejabatPenetap || '').trim())) {
        if (!clone.eselon || clone.eselon === '-') {
          clone.eselon = clone.pejabatPenetap;
        }
        clone.pejabatPenetap = 'Menteri Hukum dan Hak Asasi Manusia';
      }
      if (!clone.unitKerja) {
        const upName = (clone.namaJabatan || '').toUpperCase();
        if (upName.includes('DITJEN HKI') || upName.includes('HAK KEKAYAAN')) {
          clone.unitKerja = 'Direktorat Jenderal Hak Kekayaan Intelektual';
        } else if (upName.includes('BENGKULU')) {
          clone.unitKerja = 'Kanwil Kemenkumham Bengkulu';
        } else if (upName.includes('JAWA BARAT')) {
          clone.unitKerja = 'Kanwil Kemenkumham Jawa Barat';
        } else {
          clone.unitKerja = 'Direktorat Jenderal Kekayaan Intelektual';
        }
      }
      return clone;
    });
    await handleApplySimpegData('jabatan', 'REPLACE', fixed);
  };

  const hasShiftedIdentitas = useMemo(() => {
    if (!pegawai) return false;
    const isIsoOrDate = (val?: string) => !val ? false : (val.includes('T') && val.includes('Z')) || /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(val.trim());
    const isEselonShifted = isIsoOrDate(pegawai.eselon) || (pegawai.eselon && !/^(I|II|III|IV)\.[a-e]$/i.test(pegawai.eselon.trim()) && pegawai.eselon !== '-');
    const isUnitShifted = isIsoOrDate(pegawai.unitKerja);
    const isTmtJabatanNotDate = Boolean(pegawai.tmtJabatan && !parseDateToYYYYMMDD(pegawai.tmtJabatan));
    const isTmtPangkatSk = Boolean(pegawai.tmtPangkat && (pegawai.tmtPangkat.includes('KP.') || pegawai.tmtPangkat.includes('TAHUN')));
    const isAndrieOld = Boolean(pegawai.nama.toUpperCase().includes('ANDRIEANSJAH') && (pegawai.jabatan || '').toUpperCase().includes('KERJA SAMA LUAR NEGERI'));
    
    // Check if TMT CPNS matches NIP for PNS
    const cleanNip = (pegawai.nip || '').replace(/\D/g, '');
    let isCpnsShifted = false;
    if (cleanNip.length === 18 && (pegawai.jenisPegawai === 'PNS' || !pegawai.jenisPegawai)) {
      const expectedCpns = `${cleanNip.slice(8, 12)}-${cleanNip.slice(12, 14)}-01`;
      const currentCpns = parseDateToYYYYMMDD(pegawai.tmtCpns);
      if (currentCpns !== expectedCpns) {
        isCpnsShifted = true;
      }
    }

    return Boolean(isEselonShifted || isUnitShifted || isTmtJabatanNotDate || isTmtPangkatSk || isAndrieOld || isCpnsShifted);
  }, [pegawai]);

  const handleHealIdentitas = async () => {
    if (!pegawai) return;
    setSyncing(true);
    let updated = { ...pegawai };
    const cleanNip = (updated.nip || '').replace(/\D/g, '');

    if (updated.nama.toUpperCase().includes('ANDRIEANSJAH')) {
      updated.jabatan = 'Direktur Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang';
      updated.unitKerja = 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang';
      updated.bagian = 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang';
      updated.subBagian = 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang';
      updated.eselon = 'II.a';
      updated.tmtJabatan = '2026-01-08';
      updated.pangkat = 'Pembina Utama Muda';
      updated.golRuang = 'IV/c';
      updated.tmtPangkat = '2019-10-01';
      updated.tmtCpns = '2000-03-01';
      updated.jenisJabatan = 'Pimpinan Tinggi';
      updated.klasifikasiJabatan = 'JPT';
    } else {
      updated = syncHistoryToDetail(updated);
      if (cleanNip.length === 18 && (updated.jenisPegawai === 'PNS' || !updated.jenisPegawai)) {
        updated.tmtCpns = `${cleanNip.slice(8, 12)}-${cleanNip.slice(12, 14)}-01`;
      }
    }
    setPegawai(updated);
    await savePegawai(updated);
    try {
      ['portal_pegawai_db', 'portal_sdm_pegawai_db'].forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          const idx = list.findIndex((p: any) => p.id === updated.id || (p.nip && p.nip === updated.nip));
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...updated };
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
      });
    } catch (e) {}
    setSyncing(false);
    setSuccessMsg('Data identitas dan kepegawaian berhasil dipulihkan!');
    setShowSuccess(true);
  };

  const handleClearHistory = (field: 'riwayatPendidikan' | 'riwayatJabatan' | 'riwayatPangkat' | 'riwayatGaji' | 'riwayatPelatihan' | 'keluarga') => {
    if (!pegawai) return;
    const labels: Record<string, string> = {
      riwayatJabatan: 'Riwayat Jabatan',
      riwayatPangkat: 'Riwayat Pangkat',
      riwayatPendidikan: 'Riwayat Pendidikan',
      riwayatGaji: 'Riwayat Gaji & KGB',
      riwayatPelatihan: 'Riwayat Pelatihan',
      keluarga: 'Informasi Keluarga'
    };
    const title = labels[field] || 'riwayat ini';
    if (!window.confirm(`PERINGATAN:\nApakah Anda yakin ingin MENGOSONGKAN seluruh baris ${title} untuk ${pegawai.nama}?\n\nTindakan ini akan menghapus seluruh entri pada daftar saat ini.`)) {
      return;
    }
    const updated = { ...pegawai, [field]: [] };
    const synced = syncHistoryToDetail(updated);
    setPegawai(synced);
    setSuccessMsg(`Seluruh ${title} berhasil dikosongkan. Klik "Simpan Perubahan" untuk menerapkan.`);
    setShowSuccess(true);
  };



  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="h-12 w-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Memuat Profil Pegawai...</p>
    </div>
  );

  if (!pegawai) return (
    <div className="bg-white p-20 rounded-[3rem] text-center border border-gray-100 shadow-sm">
      <i className="bi bi-exclamation-triangle text-rose-500 text-4xl mb-4 block"></i>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pegawai tidak ditemukan</p>
      <button onClick={() => navigate(isUserPortalView ? '/' : '/pegawai')} className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase">
        {isUserPortalView ? 'Kembali ke Dashboard Pegawai' : 'Kembali ke Database ASN'}
      </button>
    </div>
  );

  const cleanParamNip = (nip || '').replace(/\D/g, '');
  const cleanUserNip = (user?.nip || '').replace(/\D/g, '');
  const isSelfView = isUserPortalView || (!cleanParamNip || nip === 'profile' || nip === 'me' || nip === 'data-diri') || (!!cleanUserNip && cleanUserNip === (pegawai?.nip || '').replace(/\D/g, ''));
  const canEditThisProfile = canEdit || isSuperadmin || isSelfView;

  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest";
  const inputClass = "w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all uppercase";
  const inputNoCapsClass = "w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 md:mb-12">
        <div className="flex items-center gap-4 md:gap-6 w-full lg:w-auto">
          <button 
            onClick={() => isUserPortalView ? navigate('/') : navigate(-1)} 
            className="h-10 w-10 md:h-12 md:w-12 bg-white border border-gray-100 text-gray-400 rounded-xl md:rounded-2xl flex items-center justify-center hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm shrink-0"
            title={isUserPortalView ? "Kembali ke Dashboard Pegawai" : "Kembali"}
          >
            <i className="bi bi-arrow-left"></i>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter truncate">
                {isSelfView ? 'Data Diri & Profil Pegawai' : 'Profil Lengkap Pegawai'}
              </h3>
              {isSelfView && (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-200 uppercase tracking-wider">
                  <i className="bi bi-person-check-fill mr-1"></i> Data Diri Anda
                </span>
              )}
            </div>
            <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2 truncate">
              <i className="bi bi-person-badge-fill text-blue-600"></i> {formatPegawaiName(pegawai.nama)} • NIP. {pegawai.nip}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button 
            onClick={() => navigate('/layanan-sdm/pengajuan')}
            className="flex-1 lg:flex-none px-5 md:px-6 py-3 md:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
            title="Ajukan Layanan Kepegawaian untuk Pegawai ini"
          >
            <i className="bi bi-send-plus-fill"></i>
            Ajukan Layanan SDM
          </button>
          <button onClick={handleCetakDRH} disabled={syncing} className="flex-1 lg:flex-none px-6 md:px-8 py-3 md:py-4 bg-gray-900 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
            {syncing ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-file-earmark-pdf-fill"></i>}
            Cetak DRH
          </button>
          {canEditThisProfile && (
            !isEditing ? (
              <button onClick={() => setIsEditing(true)} className="flex-1 lg:flex-none px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-lg shadow-blue-200 flex items-center justify-center gap-3 active:scale-95 transition-all">
                <i className="bi bi-pencil-square"></i>
                Edit Profil
              </button>
            ) : (
              <div className="flex gap-2 w-full lg:w-auto">
                <button onClick={() => setIsEditing(false)} className="flex-1 lg:flex-none px-6 md:px-8 py-3 md:py-4 bg-gray-100 text-gray-500 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase active:scale-95 transition-all">
                  Batal
                </button>
                <button onClick={handleSave} disabled={syncing} className="flex-1 lg:flex-none px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-lg shadow-blue-200 flex items-center justify-center gap-3 active:scale-95 transition-all">
                  {syncing ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-check-fill"></i>}
                  Simpan Perubahan
                </button>
              </div>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-3 space-y-4 md:space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-gray-100 shadow-sm text-center space-y-4 md:space-y-6">
            <div className="relative inline-block">
              <div 
                className={`h-32 w-32 md:h-40 md:w-40 rounded-2xl md:rounded-[2rem] bg-gray-50 border-4 md:border-8 border-white shadow-2xl overflow-hidden mx-auto relative group ${!isEditing && pegawai.foto ? 'cursor-pointer' : ''}`}
                onClick={() => !isEditing && pegawai.foto && setShowPhotoPreview(true)}
              >
                {pegawai.foto ? (
                  <img src={getPhotoUrl(pegawai.foto)} className="h-full w-full object-cover transition-transform group-hover:scale-105" alt="Profile" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-300 text-4xl font-black">?</div>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <i className="bi bi-camera-fill text-white text-2xl"></i>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoFileChange} />
              {uploading && <div className="absolute inset-x-0 bottom-0 top-0 bg-blue-600/50 rounded-2xl md:rounded-[2rem] flex items-center justify-center z-20"><div className="h-6 w-6 md:h-8 md:w-8 border-2 md:border-4 border-white/30 border-t-white rounded-full animate-spin"></div></div>}
            </div>
            <div>
              <h4 className="font-black text-gray-900 tracking-tight leading-tight text-sm md:text-base">{formatPegawaiName(pegawai.nama)}</h4>
              <p className="text-[8px] md:text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1.5 md:mt-2">{pegawai.jabatan}</p>
              <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{pegawai.unitKerja}</p>
            </div>
            <div className="pt-4 md:pt-6 border-t border-gray-50 flex flex-col gap-2">
               <span className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase ${pegawai.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>{pegawai.status}</span>
               <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[8px] font-black uppercase">{pegawai.golRuang} • {pegawai.pangkat}</span>
            </div>
          </div>

          <nav className="bg-white p-2 md:p-4 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex lg:flex-col overflow-x-auto lg:overflow-x-visible no-scrollbar gap-1">
            {[
              { id: 'identitas', label: 'Identitas', icon: 'bi-person-fill' },
              { id: 'keluarga', label: 'Keluarga', icon: 'bi-people-fill' },
              { id: 'pendidikan', label: 'Pendidikan', icon: 'bi-mortarboard-fill' },
              { id: 'jabatan', label: 'Jabatan', icon: 'bi-briefcase-fill' },
              { id: 'pangkat', label: 'Pangkat', icon: 'bi-award-fill' },
              { id: 'gaji', label: 'Gaji & KGB', icon: 'bi-cash-stack' },
              { id: 'pelatihan', label: 'Pelatihan', icon: 'bi-journal-check' },
              { id: 'dossier', label: 'Dossier', icon: 'bi-folder-fill' },
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap lg:w-full ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <i className={`bi ${tab.icon} ${activeTab === tab.id ? 'text-white' : 'text-gray-300'}`}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <div className="bg-white p-6 md:p-10 lg:p-12 rounded-3xl md:rounded-[3.5rem] border border-gray-100 shadow-sm min-h-[500px] md:min-h-[600px]">
            
            {activeTab === 'identitas' && (
              <div className="space-y-8 md:space-y-12 animate-fadeIn">
                {/* A. Identitas Pribadi */}
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                    <div className="h-8 w-8 md:h-10 md:w-10 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-lg"><i className="bi bi-person-fill"></i></div>
                    <div>
                      <h4 className="text-sm md:text-md font-black text-gray-900 uppercase tracking-tight">A. Identitas Pribadi</h4>
                      <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest">Informasi dasar kependudukan</p>
                    </div>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <label className={labelClass}>Nama Lengkap</label>
                        {isEditing ? (
                          <input type="text" className={inputClass} value={pegawai.nama} onChange={e => updateField('nama', e.target.value)} />
                        ) : (
                          <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.nama || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>NIK (No. KTP)</label>
                        {isEditing ? (
                          <input type="text" className={inputClass} value={pegawai.nik || ''} onChange={e => updateField('nik', e.target.value)} />
                        ) : (
                          <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.nik || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Jenis Kelamin</label>
                        {isEditing ? (
                          <select className={inputClass} value={pegawai.gender} onChange={e => updateField('gender', e.target.value)}>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                          </select>
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Tempat Lahir</label>
                        {isEditing ? (
                          <input type="text" className={inputClass} value={pegawai.tempatLahir || ''} onChange={e => updateField('tempatLahir', e.target.value)} />
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.tempatLahir || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Tanggal Lahir</label>
                        {isEditing ? (
                          <input type="date" className={inputNoCapsClass} value={formatDateForInput(pegawai.tanggalLahir)} onChange={e => updateField('tanggalLahir', e.target.value)} />
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{formatDateIndoDisplay(pegawai.tanggalLahir)}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Agama</label>
                        {isEditing ? (
                          <select className={inputClass} value={pegawai.agama || ''} onChange={e => updateField('agama', e.target.value)}>
                            <option value="">Pilih Agama</option>
                            <option value="Islam">Islam</option>
                            <option value="Kristen">Kristen</option>
                            <option value="Katolik">Katolik</option>
                            <option value="Hindu">Hindu</option>
                            <option value="Budha">Budha</option>
                            <option value="Konghucu">Konghucu</option>
                          </select>
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.agama || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Status Perkawinan</label>
                        {isEditing ? (
                          <select className={inputClass} value={pegawai.statusPerkawinan || ''} onChange={e => updateField('statusPerkawinan', e.target.value)}>
                            <option value="">Pilih Status</option>
                            <option value="Belum Kawin">Belum Kawin</option>
                            <option value="Kawin">Kawin</option>
                            <option value="Cerai Hidup">Cerai Hidup</option>
                            <option value="Cerai Mati">Cerai Mati</option>
                          </select>
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.statusPerkawinan || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Usia</label>
                        <div className="px-6 py-4 bg-gray-100 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.usia || '-'}</div>
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Nomor Rekening Gaji</label>
                        {isEditing ? (
                          <input type="text" className={inputClass} value={pegawai.noRekeningGaji || ''} onChange={e => updateField('noRekeningGaji', e.target.value)} />
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noRekeningGaji || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Nama Bank</label>
                        {isEditing ? (
                          <select 
                            className={inputClass} 
                            value={BANK_LIST.includes(pegawai.namaBank || '') ? (pegawai.namaBank || '') : (pegawai.namaBank ? 'LAINNYA' : '')} 
                            onChange={e => updateField('namaBank', e.target.value)}
                          >
                            <option value="">- PILIH BANK -</option>
                            {BANK_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                            <option value="LAINNYA">LAINNYA</option>
                          </select>
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.namaBank || '-'}</div>
                        )}
                      </div>
                      {isEditing && (pegawai.namaBank === 'LAINNYA' || (pegawai.namaBank && !BANK_LIST.includes(pegawai.namaBank))) && (
                        <div className="space-y-2 animate-fadeIn">
                          <label className={labelClass}>Ketik Nama Bank Lainnya</label>
                          <input 
                            type="text" 
                            className={inputClass} 
                            placeholder="Contoh: BANK BPD DIY" 
                            value={BANK_LIST.includes(pegawai.namaBank || '') ? '' : pegawai.namaBank}
                            onChange={e => setPegawai({ ...pegawai, namaBank: e.target.value.toUpperCase() })} 
                          />
                        </div>
                      )}
                    </div>
                </div>

                {hasShiftedIdentitas && (
                  <div className="p-4 md:p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 text-base shadow-sm">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                      </div>
                      <div>
                        <h5 className="text-[12px] md:text-[13px] font-black text-amber-950 uppercase tracking-tight">Terdeteksi Data Tergeser pada Identitas/Kepegawaian</h5>
                        <p className="text-[9px] md:text-[10px] text-amber-800 font-medium">Nilai Eselon, TMT Jabatan, Unit Kerja, atau TMT Pangkat tergeser akibat sinkronisasi kolom sebelumnya.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleHealIdentitas}
                      disabled={syncing}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm disabled:bg-gray-300"
                    >
                      <i className="bi bi-arrow-repeat"></i>
                      <span>Pulihkan Data Sekarang</span>
                    </button>
                  </div>
                )}

                {/* B. Data Kepegawaian */}
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                    <div className="h-8 w-8 md:h-10 md:w-10 bg-indigo-50 text-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-lg"><i className="bi bi-briefcase-fill"></i></div>
                    <div>
                      <h4 className="text-sm md:text-md font-black text-gray-900 uppercase tracking-tight">B. Data Kepegawaian</h4>
                      <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest">Informasi karir dan jabatan</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className={labelClass}>NIP Baru</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.nip}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Jenis Pegawai</label>
                      {isEditing ? (
                        <select className={inputClass} value={pegawai.jenisPegawai || ''} onChange={e => updateField('jenisPegawai', e.target.value)}>
                          <option value="PNS">PNS</option>
                          <option value="CPNS">CPNS</option>
                          <option value="PPPK">PPPK</option>
                          <option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option>
                        </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.jenisPegawai || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Status Pegawai</label>
                      {isEditing ? (
                        <select className={inputClass} value={pegawai.status || ''} onChange={e => updateField('status', e.target.value === 'Pensiun' ? 'Tidak Aktif' : e.target.value)}>
                          <option value="Aktif">AKTIF</option>
                          <option value="Tidak Aktif">TIDAK AKTIF</option>
                          <option value="Pensiun">PENSIUN (OTOMATIS TIDAK AKTIF)</option>
                          <option value="Tugas Belajar">TUGAS BELAJAR</option>
                        </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.status || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className={labelClass}>Nama Jabatan</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.jabatan || ''} onChange={e => updateField('jabatan', e.target.value)} />
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.jabatan || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Jenis Jabatan</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.jenisJabatan || ''} onChange={e => updateField('jenisJabatan', e.target.value)} />
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.jenisJabatan || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Klasifikasi Jabatan</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.klasifikasiJabatan || ''} onChange={e => updateField('klasifikasiJabatan', e.target.value)} />
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.klasifikasiJabatan || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Eselon</label>
                      {isEditing ? (
                        <select className={inputClass} value={pegawai.eselon || '-'} onChange={e => updateField('eselon', e.target.value)}>
                          <option value="-">-</option>
                          <option value="I.a">I.a</option>
                          <option value="I.b">I.b</option>
                          <option value="II.a">II.a</option>
                          <option value="II.b">II.b</option>
                          <option value="III.a">III.a</option>
                          <option value="IV.a">IV.a</option>
                        </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.eselon || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>TMT Jabatan</label>
                      {isEditing ? (
                        <input type="date" className={inputNoCapsClass} value={formatDateForInput(pegawai.tmtJabatan)} onChange={e => updateField('tmtJabatan', e.target.value)} />
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{formatDateIndoDisplay(pegawai.tmtJabatan)}</div>
                      )}
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className={labelClass}>Unit Kerja</label>
                      {isEditing ? (
                        <select 
                           className={inputClass} 
                           value={pegawai.unitKerja || ''} 
                           onChange={e => {
                             const unit = e.target.value;
                             const bagians = Object.keys(ORGANISASI_STRUCTURE[unit] || {});
                             const firstBagian = bagians[0] || '';
                             const subs = (ORGANISASI_STRUCTURE[unit] && firstBagian) ? ORGANISASI_STRUCTURE[unit][firstBagian] : [];
                             const firstSub = subs[0] || '';
                             
                             setPegawai({
                               ...pegawai,
                               unitKerja: unit,
                               bagian: firstBagian,
                               subBagian: firstSub
                             });
                           }}
                         >
                          {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                        </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.unitKerja || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Nama Bagian</label>
                      {isEditing ? (
                        <select 
                           className={inputClass} 
                           value={pegawai.bagian || ''} 
                           onChange={e => {
                             const bagian = e.target.value;
                             const unit = pegawai.unitKerja || UNIT_KERJA[0];
                             const subs = (ORGANISASI_STRUCTURE[unit] && bagian) ? ORGANISASI_STRUCTURE[unit][bagian] : [];
                             const firstSub = subs[0] || '';
                             
                             setPegawai({
                               ...pegawai,
                               bagian: bagian,
                               subBagian: firstSub
                             });
                           }}
                         >
                           <option value="">- PILIH BAGIAN -</option>
                           {pegawai.unitKerja && ORGANISASI_STRUCTURE[pegawai.unitKerja] ? 
                             Object.keys(ORGANISASI_STRUCTURE[pegawai.unitKerja]).map(b => (
                               <option key={b} value={b}>{b.toUpperCase()}</option>
                             )) : null
                           }
                         </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.bagian || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Nama Sub Bagian / Tim</label>
                      {isEditing ? (
                        <select 
                           className={inputClass} 
                           value={pegawai.subBagian || ''} 
                           onChange={e => updateField('subBagian', e.target.value)}
                         >
                           <option value="">- PILIH SUB BAGIAN / TIM -</option>
                           {pegawai.unitKerja && pegawai.bagian && ORGANISASI_STRUCTURE[pegawai.unitKerja]?.[pegawai.bagian] ? 
                             ORGANISASI_STRUCTURE[pegawai.unitKerja][pegawai.bagian].map(s => (
                               <option key={s} value={s}>{s.toUpperCase()}</option>
                             )) : null
                           }
                         </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.subBagian || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Golongan / Ruang</label>
                      {isEditing ? (
                        <select className={inputClass} value={pegawai.golRuang || ''} onChange={e => {
                          const gol = e.target.value;
                          setPegawai({ ...pegawai, golRuang: gol, pangkat: PANGKAT_MAP[gol] || '' });
                        }}>
                          {Object.keys(PANGKAT_MAP).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.golRuang || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Pangkat</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.pangkat || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>TMT Pangkat</label>
                      {isEditing ? (
                        <input type="date" className={inputNoCapsClass} value={formatDateForInput(pegawai.tmtPangkat)} onChange={e => updateField('tmtPangkat', e.target.value)} />
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{formatDateIndoDisplay(pegawai.tmtPangkat)}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>TMT CPNS</label>
                      {isEditing ? (
                        <input type="date" className={inputNoCapsClass} value={formatDateForInput(pegawai.tmtCpns)} onChange={e => updateField('tmtCpns', e.target.value)} />
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{formatDateIndoDisplay(pegawai.tmtCpns)}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Masa Kerja (Thn Bln)</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.masaKerja || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Tgl Pensiun</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{formatDateIndoDisplay(pegawai.tglPensiun)}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>TMT Pensiun</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{formatDateIndoDisplay(pegawai.tmtPensiun)}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Usia Pensiun</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.usiaPensiun || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>BUP</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.bup || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>MK Golongan</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.masaKerjaGolongan || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>MK Pensiun</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.masaKerjaPensiun || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Usia</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.usia || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Sisa Masa Kerja</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.sisaMasaKerja || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* C. Kontak & Domisili */}
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                    <div className="h-8 w-8 md:h-10 md:w-10 bg-emerald-50 text-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-lg"><i className="bi bi-geo-alt-fill"></i></div>
                    <div>
                      <h4 className="text-sm md:text-md font-black text-gray-900 uppercase tracking-tight">C. Kontak & Domisili</h4>
                      <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest">Informasi komunikasi dan alamat</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className={labelClass}>No. HP / WhatsApp</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.noHp || ''} onChange={e => updateField('noHp', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noHp || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Email Personal / Dinas</label>
                      {isEditing ? (
                        <input type="email" className={inputNoCapsClass} value={pegawai.email || ''} onChange={e => updateField('email', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.email || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className={labelClass}>Alamat Lengkap Sesuai Domisili</label>
                      {isEditing ? (
                        <textarea className={`${inputClass} min-h-[100px] resize-none`} value={pegawai.alamat || ''} onChange={e => updateField('alamat', e.target.value)} placeholder="Masukkan alamat lengkap..." />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[100px] flex items-start pt-4 select-all">{pegawai.alamat || '-'}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* D. Administrasi Lainnya */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                    <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg"><i className="bi bi-card-checklist"></i></div>
                    <div>
                      <h4 className="text-md font-black text-gray-900 uppercase tracking-tight">D. Administrasi Lainnya</h4>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Nomor dokumen administrasi</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className={labelClass}>Nomor NPWP</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.npwp || ''} onChange={e => updateField('npwp', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.npwp || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Nomor BPJS Kesehatan</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.noBpjs || ''} onChange={e => updateField('noBpjs', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noBpjs || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>No. Karis / Karsu</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.noKarisKarsu || ''} onChange={e => updateField('noKarisKarsu', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noKarisKarsu || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                       <label className={labelClass}>Nomor Rekening Gaji</label>
                       {isEditing ? (
                         <input type="text" className={inputClass} value={pegawai.noRekeningGaji || ''} onChange={e => updateField('noRekeningGaji', e.target.value)} placeholder="Masukkan No. Rekening..." />
                       ) : (
                         <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noRekeningGaji || '-'}</div>
                       )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Nomor Tapera</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.noTAPERA || ''} onChange={e => updateField('noTAPERA', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noTAPERA || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Nomor Karpeg</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.noKarpeg || ''} onChange={e => updateField('noKarpeg', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noKarpeg || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Pendidikan Terakhir</label>
                      {isEditing ? (
                        <AutocompleteInput
                          className={inputClass}
                          value={pegawai.pendidikan || ''}
                          onChange={val => updateField('pendidikan', val)}
                          options={JENJANG_PENDIDIKAN_LIST}
                          placeholder="Contoh: S1 / S2"
                        />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.pendidikan || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className={labelClass}>Jurusan Pendidikan</label>
                      {isEditing ? (
                        <AutocompleteInput
                          className={inputClass}
                          value={pegawai.jurusan || ''}
                          onChange={val => updateField('jurusan', val)}
                          options={JURUSAN_LIST}
                          placeholder="Pencarian Program Studi / Jurusan..."
                        />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.jurusan || '-'}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'keluarga' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-100 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl shadow-sm">
                      <i className="bi bi-people-fill"></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Informasi Keluarga</h4>
                        <span className="px-2.5 py-0.5 bg-emerald-100/70 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                          {(pegawai.keluarga || []).length} Anggota
                        </span>
                      </div>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Data Pasangan, Anak, dan Orang Tua Sesuai SIMPEG Kemenkumham
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* View Switcher */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-[9px] font-black uppercase">
                      <button
                        type="button"
                        onClick={() => setKeluargaViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${keluargaViewMode === 'table' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-table"></i> Tabel
                      </button>
                      <button
                        type="button"
                        onClick={() => setKeluargaViewMode('card')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${keluargaViewMode === 'card' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-grid-fill"></i> Kartu
                      </button>
                    </div>

                    {/* Quick Import SIMPEG Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenSimpegImport('keluarga')}
                      className="px-4 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 transition-all shadow-sm active:scale-95"
                      title="Salin dan tempel data keluarga langsung dari portal SIMPEG"
                    >
                      <i className="bi bi-file-earmark-spreadsheet-fill text-emerald-600"></i>
                      <span>Import SIMPEG</span>
                    </button>

                    {/* Cetak DHCP Pensiun */}
                    <button
                      type="button"
                      onClick={handleCetakDHCP}
                      disabled={syncing}
                      className="px-4 py-2 bg-gray-900 text-white rounded-xl font-black text-[9px] uppercase flex items-center gap-2 shadow-sm hover:bg-gray-800 transition-all"
                    >
                      {syncing ? <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-file-earmark-pdf-fill"></i>}
                      <span>Cetak DHCP</span>
                    </button>

                    {/* Tambah Anggota */}
                    {isEditing && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => addHistoryItem('keluarga')}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
                        >
                          <i className="bi bi-plus-lg"></i> Tambah
                        </button>
                        {(pegawai.keluarga || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearHistory('keluarga')}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-black text-[9px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Kosongkan seluruh data keluarga pegawai ini"
                          >
                            <i className="bi bi-trash3"></i> Kosongkan
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* TABLE VIEW */}
                {keluargaViewMode === 'table' && (pegawai.keluarga || []).length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 text-[9px] font-black uppercase text-gray-500 tracking-wider">
                            <th className="py-3 px-3 w-10 text-center">No</th>
                            <th className="py-3 px-4">Hubungan</th>
                            <th className="py-3 px-4">Nama Lengkap</th>
                            <th className="py-3 px-4">Tempat Lahir</th>
                            <th className="py-3 px-4 text-center">Tanggal Lahir</th>
                            <th className="py-3 px-4">Pekerjaan</th>
                            {isEditing && <th className="py-3 px-3 text-center w-14">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans">
                          {(pegawai.keluarga || []).map((k, idx) => (
                            <tr key={`${k.nama}-${idx}`} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="py-3 px-3 text-center text-[10px] font-bold text-gray-400">{idx + 1}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  k.hubungan?.toLowerCase() === 'istri' || k.hubungan?.toLowerCase() === 'suami'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : k.hubungan?.toLowerCase() === 'anak'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {k.hubungan || '-'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold text-gray-900 uppercase text-[11px]">{k.nama || '-'}</td>
                              <td className="py-3 px-4 text-gray-600 uppercase text-[11px]">{k.tempatLahir || '-'}</td>
                              <td className="py-3 px-4 text-center text-gray-700 font-mono text-[10px]">{formatDateIndoDisplay(k.tanggalLahir)}</td>
                              <td className="py-3 px-4 text-gray-600 uppercase text-[11px]">{k.pekerjaan || '-'}</td>
                              {isEditing && (
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeHistoryItem('keluarga', idx)}
                                    className="h-7 w-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors mx-auto text-xs"
                                    title="Hapus anggota keluarga ini"
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CARD FORM VIEW */}
                {keluargaViewMode === 'card' && (
                  <div className="space-y-4">
                    {(pegawai.keluarga || []).map((k, idx) => (
                      <div key={`${k.nama}-${idx}`} className="bg-gray-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative group">
                        {isEditing && (
                          <button onClick={() => removeHistoryItem('keluarga', idx)} className="absolute top-4 right-4 h-8 w-8 bg-white text-rose-400 rounded-lg flex items-center justify-center hover:text-rose-600 shadow-sm md:opacity-0 group-hover:opacity-100 transition-all">
                            <i className="bi bi-trash3"></i>
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Hubungan</label>
                            {isEditing ? (
                              <select className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={k.hubungan} onChange={e => updateHistoryItem('keluarga', idx, 'hubungan', e.target.value)}>
                                <option value="">Pilih</option>
                                <option value="Suami">Suami</option>
                                <option value="Istri">Istri</option>
                                <option value="Anak">Anak</option>
                                <option value="Ayah">Ayah</option>
                                <option value="Ibu">Ibu</option>
                              </select>
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{k.hubungan || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nama Lengkap</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={k.nama} onChange={e => updateHistoryItem('keluarga', idx, 'nama', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{k.nama || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tempat Lahir</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={k.tempatLahir} onChange={e => updateHistoryItem('keluarga', idx, 'tempatLahir', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{k.tempatLahir || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal Lahir</label>
                            {isEditing ? (
                              <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={formatDateForInput(k.tanggalLahir)} onChange={e => updateHistoryItem('keluarga', idx, 'tanggalLahir', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{formatDateIndoDisplay(k.tanggalLahir)}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Pekerjaan</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={k.pekerjaan} onChange={e => updateHistoryItem('keluarga', idx, 'pekerjaan', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{k.pekerjaan || '-'}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {(pegawai.keluarga || []).length === 0 && (
                  <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl md:rounded-[2.5rem] bg-gray-50/50 space-y-4">
                    <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-xs">
                      <i className="bi bi-people"></i>
                    </div>
                    <div>
                      <h5 className="font-black text-gray-900 uppercase text-sm tracking-tight">Belum Ada Data Keluarga</h5>
                      <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
                        Anda dapat menambahkan data keluarga secara manual atau mengimpor data langsung dari tabel SIMPEG.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          addHistoryItem('keluarga');
                        }}
                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md shadow-emerald-100 flex items-center gap-2"
                      >
                        <i className="bi bi-plus-lg"></i> Tambah Manual
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenSimpegImport('keluarga')}
                        className="px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-100 flex items-center gap-2"
                      >
                        <i className="bi bi-file-earmark-spreadsheet"></i> Salin / Import dari SIMPEG
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pendidikan' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-100 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl shadow-sm">
                      <i className="bi bi-mortarboard-fill"></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Riwayat Pendidikan</h4>
                        <span className="px-2.5 py-0.5 bg-indigo-100/70 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                          {(pegawai.riwayatPendidikan || []).length} Riwayat
                        </span>
                      </div>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Pendidikan Formal Dari SD hingga Pascasarjana Sesuai SIMPEG Kemenkumham
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* View Switcher */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-[9px] font-black uppercase">
                      <button
                        type="button"
                        onClick={() => setPendidikanViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${pendidikanViewMode === 'table' ? 'bg-white text-indigo-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-table"></i> Tabel
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendidikanViewMode('card')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${pendidikanViewMode === 'card' ? 'bg-white text-indigo-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-grid-fill"></i> Kartu
                      </button>
                    </div>

                    {/* Quick Import SIMPEG Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenSimpegImport('pendidikan')}
                      className="px-4 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 transition-all shadow-sm active:scale-95"
                      title="Salin dan tempel data pendidikan langsung dari portal SIMPEG"
                    >
                      <i className="bi bi-file-earmark-spreadsheet-fill text-emerald-600"></i>
                      <span>Import SIMPEG</span>
                    </button>

                    {/* Tambah Pendidikan */}
                    {isEditing && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => addHistoryItem('riwayatPendidikan')}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
                        >
                          <i className="bi bi-plus-lg"></i> Tambah
                        </button>
                        {(pegawai.riwayatPendidikan || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearHistory('riwayatPendidikan')}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-black text-[9px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Kosongkan seluruh riwayat pendidikan pegawai ini"
                          >
                            <i className="bi bi-trash3"></i> Kosongkan
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* TABLE VIEW */}
                {pendidikanViewMode === 'table' && (pegawai.riwayatPendidikan || []).length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 text-[9px] font-black uppercase text-gray-500 tracking-wider">
                            <th className="py-3 px-3 w-10 text-center">No</th>
                            <th className="py-3 px-4">Jenjang</th>
                            <th className="py-3 px-4">Sekolah / Perguruan Tinggi</th>
                            <th className="py-3 px-4">Jurusan / Program Studi</th>
                            <th className="py-3 px-3 text-center">Tahun</th>
                            <th className="py-3 px-4">No Ijazah</th>
                            <th className="py-3 px-3 text-center">Berkas</th>
                            {isEditing && <th className="py-3 px-3 text-center w-14">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans">
                          {(pegawai.riwayatPendidikan || []).map((p, idx) => (
                            <tr key={`${p.jenjang}-${p.institusi}-${idx}`} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="py-3 px-3 text-center text-[10px] font-bold text-gray-400">{idx + 1}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-black text-[9px] uppercase">
                                  {p.jenjang || '-'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold text-gray-900 uppercase text-[11px]">{p.institusi || '-'}</td>
                              <td className="py-3 px-4 text-gray-600 uppercase text-[11px]">{p.jurusan || '-'}</td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-gray-800 text-[10px]">{p.tahunLulus || '-'}</td>
                              <td className="py-3 px-4 font-mono text-gray-600 text-[10px] uppercase">{p.nomorIjazah || '-'}</td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {p.fileUrl ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => window.open(p.fileUrl || '', '_blank')}
                                        className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                        title="Lihat Ijazah"
                                      >
                                        <i className="bi bi-eye"></i>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(p.fileUrl || '')}
                                        className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                        title="Unduh Ijazah"
                                      >
                                        <i className="bi bi-download"></i>
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[9px] text-gray-300 italic">-</span>
                                  )}
                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'application/pdf';
                                        input.onchange = (e: any) => {
                                          const file = e.target.files[0];
                                          if (file) handleUploadHistoryFile('riwayatPendidikan', idx, file);
                                        };
                                        input.click();
                                      }}
                                      className="h-7 w-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                      title="Unggah Berkas Ijazah (PDF)"
                                    >
                                      <i className="bi bi-upload"></i>
                                    </button>
                                  )}
                                </div>
                              </td>
                              {isEditing && (
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeHistoryItem('riwayatPendidikan', idx)}
                                    className="h-7 w-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors mx-auto text-xs"
                                    title="Hapus riwayat pendidikan ini"
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CARD FORM VIEW */}
                {pendidikanViewMode === 'card' && (
                  <div className="space-y-4">
                    {(pegawai.riwayatPendidikan || []).map((p, idx) => (
                      <div key={`${p.jenjang}-${p.institusi}-${idx}`} className="bg-gray-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative group">
                        {isEditing && (
                          <button onClick={() => removeHistoryItem('riwayatPendidikan', idx)} className="absolute top-4 right-4 h-8 w-8 bg-white text-rose-400 rounded-lg flex items-center justify-center hover:text-rose-600 shadow-sm md:opacity-0 group-hover:opacity-100 transition-all">
                            <i className="bi bi-trash3"></i>
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jenjang</label>
                            {isEditing ? (
                              <select className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={p.jenjang} onChange={e => updateHistoryItem('riwayatPendidikan', idx, 'jenjang', e.target.value)}>
                                <option value="">Pilih</option>
                                <option value="SD">SD</option>
                                <option value="SMP">SMP</option>
                                <option value="SMA/SMK">SMA/SMK</option>
                                <option value="D3">D3</option>
                                <option value="D4/S1">D4/S1</option>
                                <option value="S2">S2</option>
                                <option value="S3">S3</option>
                              </select>
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.jenjang || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nama Sekolah / Universitas</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.institusi} onChange={e => updateHistoryItem('riwayatPendidikan', idx, 'institusi', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.institusi || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tahun Lulus</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={p.tahunLulus} onChange={e => updateHistoryItem('riwayatPendidikan', idx, 'tahunLulus', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.tahunLulus || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jurusan</label>
                            {isEditing ? (
                              <AutocompleteInput
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none"
                                value={p.jurusan}
                                onChange={val => updateHistoryItem('riwayatPendidikan', idx, 'jurusan', val)}
                                options={JURUSAN_LIST}
                                placeholder="Pencarian Program Studi / Jurusan..."
                              />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.jurusan || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor Ijazah</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.nomorIjazah} onChange={e => updateHistoryItem('riwayatPendidikan', idx, 'nomorIjazah', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.nomorIjazah || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                             <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Upload Ijazah (PDF)</label>
                             <div className="flex items-center gap-3">
                                {p.fileUrl ? (
                                   <div className="flex gap-2">
                                      <button onClick={() => window.open(p.fileUrl || '', '_blank')} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all">Lihat PDF</button>
                                      <button onClick={() => handleDownload(p.fileUrl || '')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 font-black">
                                         <i className="bi bi-download"></i> Unduh PDF
                                      </button>
                                   </div>
                                ) : <span className="text-[9px] font-bold text-gray-300 italic uppercase">Belum ada file</span>}
                                {isEditing && (
                                   <button onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'application/pdf';
                                      input.onchange = (e: any) => {
                                         const file = e.target.files[0];
                                         if (file) handleUploadHistoryFile('riwayatPendidikan', idx, file);
                                      };
                                      input.click();
                                   }} className="px-4 py-2 bg-white border border-gray-200 text-gray-400 rounded-xl text-[9px] font-black uppercase hover:border-indigo-600 hover:text-indigo-600 transition-all">Ganti File</button>
                                )}
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {(pegawai.riwayatPendidikan || []).length === 0 && (
                  <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl md:rounded-[2.5rem] bg-gray-50/50 space-y-4">
                    <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-xs">
                      <i className="bi bi-mortarboard"></i>
                    </div>
                    <div>
                      <h5 className="font-black text-gray-900 uppercase text-sm tracking-tight">Belum Ada Riwayat Pendidikan</h5>
                      <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
                        Anda dapat menambahkan data pendidikan secara manual atau mengimpor data langsung dari SIMPEG.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          addHistoryItem('riwayatPendidikan');
                        }}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md shadow-indigo-100 flex items-center gap-2"
                      >
                        <i className="bi bi-plus-lg"></i> Tambah Manual
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenSimpegImport('pendidikan')}
                        className="px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-100 flex items-center gap-2"
                      >
                        <i className="bi bi-file-earmark-spreadsheet"></i> Salin / Import dari SIMPEG
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jabatan' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-100 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl shadow-sm">
                      <i className="bi bi-briefcase-fill"></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Riwayat Jabatan</h4>
                        <span className="px-2.5 py-0.5 bg-blue-100/70 text-blue-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                          {(pegawai.riwayatJabatan || []).length} Riwayat
                        </span>
                      </div>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Perjalanan Karir, Mutasi & Promosi Sesuai SIMPEG Kemenkumham
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* View Switcher */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-[9px] font-black uppercase">
                      <button
                        type="button"
                        onClick={() => setJabatanViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${jabatanViewMode === 'table' ? 'bg-white text-blue-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-table"></i> Tabel SIMPEG
                      </button>
                      <button
                        type="button"
                        onClick={() => setJabatanViewMode('card')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${jabatanViewMode === 'card' ? 'bg-white text-blue-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-grid-fill"></i> Kartu Form
                      </button>
                    </div>

                    {/* Quick Import SIMPEG Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenSimpegImport('jabatan')}
                      className="px-4 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                      title="Salin dan tempel data tabel langsung dari portal SIMPEG"
                    >
                      <i className="bi bi-file-earmark-spreadsheet-fill text-emerald-600"></i>
                      <span>Import SIMPEG</span>
                    </button>

                    {/* Quick Button for Dr. Andrieansjah SIMPEG Records */}
                    {pegawai.nama.toUpperCase().includes('ANDRIEANSJAH') && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm("Pasang 10 data riwayat jabatan otentik SIMPEG Kemenkumham (2010 s.d. Direktur Paten 2026) untuk Dr. ANDRIEANSJAH?")) {
                            await handleApplySimpegData('jabatan', 'REPLACE', ANDRIEANSJAH_JABATAN_DATA);
                          }
                        }}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-black text-[9px] uppercase flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Pasang 10 Riwayat Jabatan SIMPEG Dr. Andrieansjah"
                      >
                        <i className="bi bi-lightning-charge-fill text-yellow-200"></i>
                        <span>Muat 10 Riwayat SIMPEG</span>
                      </button>
                    )}

                    {/* Edit or Add Jabatan */}
                    {canEditThisProfile && (
                      !isEditing ? (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <i className="bi bi-pencil-square"></i> Edit Data
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => addHistoryItem('riwayatJabatan')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[9px] uppercase flex items-center gap-2 shadow-md shadow-blue-200 transition-all active:scale-95 cursor-pointer"
                          >
                            <i className="bi bi-plus-lg"></i> Tambah Jabatan
                          </button>
                          {(pegawai.riwayatJabatan || []).length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleClearHistory('riwayatJabatan')}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-black text-[9px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Kosongkan seluruh riwayat jabatan pegawai ini"
                            >
                              <i className="bi bi-trash3"></i> Kosongkan
                            </button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Helper Banner */}
                <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs">
                      <i className="bi bi-info-circle-fill"></i>
                    </div>
                    <div className="text-[10px] text-gray-600 leading-relaxed">
                      <span className="font-black text-gray-900 uppercase">Petunjuk Input Riwayat Jabatan:</span> Data riwayat jabatan mencakup seluruh kolom standar SIMPEG (No SK, TMT, Pejabat Penetap, Eselon, Pelantikan). Jabatan dengan TMT paling mutakhir akan otomatis dijadikan Jabatan Utama pegawai. Anda juga dapat menggunakan tombol <strong className="text-emerald-700">"Import SIMPEG"</strong> untuk menyalin tabel secara otomatis.
                    </div>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={syncing}
                      className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-2"
                    >
                      {syncing ? <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-check-fill"></i>}
                      Simpan Perubahan
                    </button>
                  )}
                </div>

                {/* AUTO-HEAL WARNING BANNER IF SHIFTED JABATAN IS DETECTED */}
                {hasShiftedJabatan && (
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                      </div>
                      <div>
                        <div className="font-black text-[11px] uppercase tracking-wide text-amber-950">Kolom TMT Jabatan Tergeser ke Unit Kerja</div>
                        <div className="text-[10px] text-amber-800 mt-0.5">
                          Format salinan tabel SIMPEG menyebabkan tanggal TMT tertukar masuk ke kolom Unit Kerja dan kolom TMT kosong (-).
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleHealShiftedJabatan}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-black text-[10px] uppercase shrink-0 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <i className="bi bi-magic text-yellow-200"></i>
                      <span>Perbaiki Kolom Sekarang</span>
                    </button>
                  </div>
                )}

                {/* TABEL VIEW (Standard SIMPEG Table) */}
                {jabatanViewMode === 'table' && (
                  <div className="space-y-4">
                    <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-sm">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-slate-700 text-[9px] uppercase font-black tracking-wider divide-x divide-gray-200">
                            <th className="py-3 px-3 text-center w-10">No</th>
                            <th className="py-3 px-3 min-w-[150px]">No. SK</th>
                            <th className="py-3 px-3 min-w-[95px] text-center">Tgl SK</th>
                            <th className="py-3 px-4 min-w-[240px]">Nama Jabatan & Unit Kerja</th>
                            <th className="py-3 px-3 min-w-[105px] text-center bg-blue-50/60 text-blue-950">TMT Jabatan</th>
                            <th className="py-3 px-3 min-w-[160px]">Pejabat Penetap</th>
                            <th className="py-3 px-2 text-center min-w-[70px]">Eselon</th>
                            <th className="py-3 px-3 min-w-[95px] text-center">TMT Eselon</th>
                            <th className="py-3 px-3 min-w-[130px]">No. Pelantikan</th>
                            <th className="py-3 px-3 min-w-[95px] text-center">Tgl Pelantikan</th>
                            <th className="py-3 px-3 text-center min-w-[90px]">Berkas SK</th>
                            {isEditing && <th className="py-3 px-2 text-center w-12">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11px]">
                          {(pegawai.riwayatJabatan || []).map((j, idx) => (
                            <tr key={`hist-jab-tbl-${idx}`} className="hover:bg-blue-50/30 transition-colors divide-x divide-gray-100 group">
                              {/* No */}
                              <td className="py-3 px-3 text-center font-bold text-gray-400 text-[10px]">
                                {idx + 1}
                              </td>

                              {/* No SK */}
                              <td className="py-3 px-3 font-semibold text-gray-800">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-[11px] font-mono outline-none focus:border-blue-500 uppercase"
                                    value={j.nomorSk || ''}
                                    placeholder="No. SK"
                                    onChange={e => updateHistoryItem('riwayatJabatan', idx, 'nomorSk', e.target.value)}
                                  />
                                ) : (
                                  <span className="font-mono text-gray-900 select-all font-bold">{j.nomorSk || '-'}</span>
                                )}
                              </td>

                              {/* Tgl SK */}
                              <td className="py-3 px-3 text-center text-gray-600 whitespace-nowrap">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    className="w-full px-1.5 py-1 bg-white border border-gray-200 rounded text-[10px] outline-none focus:border-blue-500"
                                    value={formatDateForInput(j.tanggalSk)}
                                    onChange={e => updateHistoryItem('riwayatJabatan', idx, 'tanggalSk', e.target.value)}
                                  />
                                ) : (
                                  formatDateIndoDisplay(j.tanggalSk)
                                )}
                              </td>

                              {/* Nama Jabatan & Unit Kerja */}
                              <td className="py-3 px-4">
                                {isEditing ? (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-[11px] font-bold outline-none focus:border-blue-500 uppercase"
                                      value={j.namaJabatan || ''}
                                      placeholder="Nama Jabatan"
                                      onChange={e => updateHistoryItem('riwayatJabatan', idx, 'namaJabatan', e.target.value)}
                                    />
                                    <input
                                      type="text"
                                      className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-500 uppercase"
                                      value={j.unitKerja || ''}
                                      placeholder="Unit Kerja / Satuan Kerja"
                                      onChange={e => updateHistoryItem('riwayatJabatan', idx, 'unitKerja', e.target.value)}
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-black text-gray-900 uppercase leading-snug">{j.namaJabatan || '-'}</div>
                                    {j.unitKerja && (
                                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">
                                        <i className="bi bi-geo-alt-fill text-blue-500 mr-1"></i>
                                        {j.unitKerja}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* TMT Jabatan */}
                              <td className="py-3 px-3 text-center bg-blue-50/20 whitespace-nowrap">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    className="w-full px-1.5 py-1 bg-white border border-blue-200 rounded text-[10px] font-bold text-blue-700 outline-none focus:border-blue-500"
                                    value={formatDateForInput(j.tmtJabatan)}
                                    onChange={e => updateHistoryItem('riwayatJabatan', idx, 'tmtJabatan', e.target.value)}
                                  />
                                ) : (
                                  <span className="inline-block px-2 py-0.5 bg-blue-100/70 text-blue-800 rounded font-black text-[10px]">
                                    {formatDateIndoDisplay(j.tmtJabatan)}
                                  </span>
                                )}
                              </td>

                              {/* Pejabat Penetap */}
                              <td className="py-3 px-3 text-gray-700">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-[10px] outline-none focus:border-blue-500"
                                    value={j.pejabatPenetap || ''}
                                    placeholder="Pejabat Penetap"
                                    onChange={e => updateHistoryItem('riwayatJabatan', idx, 'pejabatPenetap', e.target.value)}
                                  />
                                ) : (
                                  <span className="text-gray-700">{j.pejabatPenetap || '-'}</span>
                                )}
                              </td>

                              {/* Eselon */}
                              <td className="py-3 px-2 text-center whitespace-nowrap">
                                {isEditing ? (
                                  <select
                                    className="w-full px-1 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold outline-none focus:border-blue-500 uppercase"
                                    value={j.eselon || ''}
                                    onChange={e => updateHistoryItem('riwayatJabatan', idx, 'eselon', e.target.value)}
                                  >
                                    <option value="">-</option>
                                    <option value="I.a">I.a</option>
                                    <option value="I.b">I.b</option>
                                    <option value="II.a">II.a</option>
                                    <option value="II.b">II.b</option>
                                    <option value="III.a">III.a</option>
                                    <option value="III.b">III.b</option>
                                    <option value="IV.a">IV.a</option>
                                    <option value="IV.b">IV.b</option>
                                    <option value="V">V</option>
                                    <option value="Non-Eselon">Non-Eselon</option>
                                  </select>
                                ) : (
                                  j.eselon && j.eselon !== '-' ? (
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-black text-[9px] uppercase">
                                      {j.eselon}
                                    </span>
                                  ) : <span className="text-gray-300">-</span>
                                )}
                              </td>

                              {/* TMT Eselon */}
                              <td className="py-3 px-3 text-center text-gray-600 whitespace-nowrap">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    className="w-full px-1.5 py-1 bg-white border border-gray-200 rounded text-[10px] outline-none focus:border-blue-500"
                                    value={formatDateForInput(j.tmtEselon)}
                                    onChange={e => updateHistoryItem('riwayatJabatan', idx, 'tmtEselon', e.target.value)}
                                  />
                                ) : (
                                  formatDateIndoDisplay(j.tmtEselon)
                                )}
                              </td>

                              {/* No Pelantikan */}
                              <td className="py-3 px-3 text-gray-700 font-mono text-[10px]">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-mono outline-none focus:border-blue-500 uppercase"
                                    value={j.nomorPelantikan || ''}
                                    placeholder="No. Pelantikan"
                                    onChange={e => updateHistoryItem('riwayatJabatan', idx, 'nomorPelantikan', e.target.value)}
                                  />
                                ) : (
                                  <span>{j.nomorPelantikan || '-'}</span>
                                )}
                              </td>

                              {/* Tgl Pelantikan */}
                              <td className="py-3 px-3 text-center text-gray-600 whitespace-nowrap">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    className="w-full px-1.5 py-1 bg-white border border-gray-200 rounded text-[10px] outline-none focus:border-blue-500"
                                    value={formatDateForInput(j.tanggalPelantikan)}
                                    onChange={e => updateHistoryItem('riwayatJabatan', idx, 'tanggalPelantikan', e.target.value)}
                                  />
                                ) : (
                                  formatDateIndoDisplay(j.tanggalPelantikan)
                                )}
                              </td>

                              {/* Berkas SK */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {j.fileUrl ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => window.open(j.fileUrl || '', '_blank')}
                                        className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                        title="Lihat SK"
                                      >
                                        <i className="bi bi-eye"></i>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(j.fileUrl || '')}
                                        className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                        title="Unduh SK"
                                      >
                                        <i className="bi bi-download"></i>
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[9px] text-gray-300 italic">-</span>
                                  )}
                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'application/pdf';
                                        input.onchange = (e: any) => {
                                          const file = e.target.files[0];
                                          if (file) handleUploadHistoryFile('riwayatJabatan', idx, file);
                                        };
                                        input.click();
                                      }}
                                      className="h-7 w-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                      title="Unggah / Ganti Berkas SK (PDF)"
                                    >
                                      <i className="bi bi-upload"></i>
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Aksi Hapus (Only in Edit Mode) */}
                              {isEditing && (
                                <td className="py-3 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeHistoryItem('riwayatJabatan', idx)}
                                    className="h-7 w-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors mx-auto text-xs"
                                    title="Hapus Jabatan Ini"
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CARD FORM VIEW (Modern Detailed Cards) */}
                {jabatanViewMode === 'card' && (
                  <div className="space-y-4">
                    {(pegawai.riwayatJabatan || []).map((j, idx) => (
                      <div key={`${j.namaJabatan}-${j.tmtJabatan}-${idx}`} className="bg-gray-50/70 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-200 relative group transition-all hover:border-blue-200 hover:bg-white shadow-xs">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-[11px] font-black text-gray-800 uppercase tracking-tight">
                              {j.namaJabatan || 'Jabatan Baru'}
                            </span>
                            {j.eselon && (
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-black text-[8px] uppercase">
                                Eselon {j.eselon}
                              </span>
                            )}
                          </div>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => removeHistoryItem('riwayatJabatan', idx)}
                              className="h-8 w-8 bg-white border border-rose-100 text-rose-500 rounded-lg flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-xs"
                              title="Hapus riwayat ini"
                            >
                              <i className="bi bi-trash3 text-sm"></i>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Nama Jabatan */}
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nama Jabatan</label>
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500 uppercase"
                                value={j.namaJabatan || ''}
                                placeholder="Contoh: KEPALA KANIM KELAS II MADIUN"
                                onChange={e => updateHistoryItem('riwayatJabatan', idx, 'namaJabatan', e.target.value)}
                              />
                            ) : (
                              <div className="px-4 py-2.5 bg-white border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{j.namaJabatan || '-'}</div>
                            )}
                          </div>

                          {/* Unit Kerja */}
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Unit Kerja / Satker</label>
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500 uppercase"
                                value={j.unitKerja || ''}
                                placeholder="Contoh: KANIM KELAS II MADIUN"
                                onChange={e => updateHistoryItem('riwayatJabatan', idx, 'unitKerja', e.target.value)}
                              />
                            ) : (
                              <div className="px-4 py-2.5 bg-white border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{j.unitKerja || '-'}</div>
                            )}
                          </div>

                          {/* TMT Jabatan */}
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-blue-600 uppercase ml-2">TMT Jabatan</label>
                            {isEditing ? (
                              <input
                                type="date"
                                className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-[11px] font-bold text-blue-700 outline-none focus:border-blue-500"
                                value={formatDateForInput(j.tmtJabatan)}
                                onChange={e => updateHistoryItem('riwayatJabatan', idx, 'tmtJabatan', e.target.value)}
                              />
                            ) : (
                              <div className="px-4 py-2.5 bg-white border border-transparent rounded-xl text-[11px] font-black text-blue-700 select-all">{formatDateIndoDisplay(j.tmtJabatan)}</div>
                            )}
                          </div>

                          {/* Nomor SK */}
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor SK</label>
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-mono outline-none focus:border-blue-500 uppercase"
                                value={j.nomorSk || ''}
                                placeholder="Contoh: M.HH-33.KP.03.03 TAHUN 2011"
                                onChange={e => updateHistoryItem('riwayatJabatan', idx, 'nomorSk', e.target.value)}
                              />
                            ) : (
                              <div className="px-4 py-2.5 bg-white border border-transparent rounded-xl text-[11px] font-mono font-bold text-gray-900 select-all">{j.nomorSk || '-'}</div>
                            )}
                          </div>

                          {/* Tanggal SK */}
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal SK</label>
                            {isEditing ? (
                              <input
                                type="date"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500"
                                value={formatDateForInput(j.tanggalSk)}
                                onChange={e => updateHistoryItem('riwayatJabatan', idx, 'tanggalSk', e.target.value)}
                              />
                            ) : (
                              <div className="px-4 py-2.5 bg-white border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{formatDateIndoDisplay(j.tanggalSk)}</div>
                            )}
                          </div>

                          {/* Pejabat Penetap */}
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Pejabat Penetap</label>
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500"
                                value={j.pejabatPenetap || ''}
                                placeholder="Contoh: Menteri Hukum dan Hak Asasi Manusia"
                                onChange={e => updateHistoryItem('riwayatJabatan', idx, 'pejabatPenetap', e.target.value)}
                              />
                            ) : (
                              <div className="px-4 py-2.5 bg-white border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{j.pejabatPenetap || '-'}</div>
                            )}
                          </div>

                          {/* Eselon */}
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Eselon</label>
                            {isEditing ? (
                              <select
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500 uppercase"
                                value={j.eselon || ''}
                                onChange={e => updateHistoryItem('riwayatJabatan', idx, 'eselon', e.target.value)}
                              >
                                <option value="">- Non-Eselon -</option>
                                <option value="I.a">I.a</option>
                                <option value="I.b">I.b</option>
                                <option value="II.a">II.a</option>
                                <option value="II.b">II.b</option>
                                <option value="III.a">III.a</option>
                                <option value="III.b">III.b</option>
                                <option value="IV.a">IV.a</option>
                                <option value="IV.b">IV.b</option>
                                <option value="V">V</option>
                              </select>
                            ) : (
                              <div className="px-4 py-2.5 bg-white border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{j.eselon || '-'}</div>
                            )}
                          </div>

                          {/* TMT Eselon */}
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">TMT Eselon</label>
                            {isEditing ? (
                              <input
                                type="date"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500"
                                value={formatDateForInput(j.tmtEselon)}
                                onChange={e => updateHistoryItem('riwayatJabatan', idx, 'tmtEselon', e.target.value)}
                              />
                            ) : (
                              <div className="px-4 py-2.5 bg-white border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{formatDateIndoDisplay(j.tmtEselon)}</div>
                            )}
                          </div>

                          {/* Nomor Pelantikan */}
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor Pelantikan</label>
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-mono outline-none focus:border-blue-500 uppercase"
                                value={j.nomorPelantikan || ''}
                                placeholder="Contoh: W10-KP.03.03-02"
                                onChange={e => updateHistoryItem('riwayatJabatan', idx, 'nomorPelantikan', e.target.value)}
                              />
                            ) : (
                              <div className="px-4 py-2.5 bg-white border border-transparent rounded-xl text-[11px] font-mono font-bold text-gray-900 select-all">{j.nomorPelantikan || '-'}</div>
                            )}
                          </div>

                          {/* Tanggal Pelantikan */}
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal Pelantikan</label>
                            {isEditing ? (
                              <input
                                type="date"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500"
                                value={formatDateForInput(j.tanggalPelantikan)}
                                onChange={e => updateHistoryItem('riwayatJabatan', idx, 'tanggalPelantikan', e.target.value)}
                              />
                            ) : (
                              <div className="px-4 py-2.5 bg-white border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{formatDateIndoDisplay(j.tanggalPelantikan)}</div>
                            )}
                          </div>

                          {/* Berkas SK PDF */}
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Upload SK Jabatan (PDF)</label>
                            <div className="flex items-center gap-3">
                              {j.fileUrl ? (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => window.open(j.fileUrl || '', '_blank')}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase border border-blue-100 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5"
                                  >
                                    <i className="bi bi-eye"></i> Lihat SK
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownload(j.fileUrl || '')}
                                    className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1.5 font-black"
                                  >
                                    <i className="bi bi-download"></i> Unduh SK
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[9px] font-bold text-gray-300 italic uppercase">Belum ada file PDF</span>
                              )}
                              {isEditing && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'application/pdf';
                                    input.onchange = (e: any) => {
                                      const file = e.target.files[0];
                                      if (file) handleUploadHistoryFile('riwayatJabatan', idx, file);
                                    };
                                    input.click();
                                  }}
                                  className="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:border-blue-600 hover:text-blue-600 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-1.5"
                                >
                                  <i className="bi bi-upload"></i> {j.fileUrl ? 'Ganti File' : 'Unggah File'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {(pegawai.riwayatJabatan || []).length === 0 && (
                  <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl md:rounded-[2.5rem] bg-gray-50/50 space-y-4">
                    <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-xs">
                      <i className="bi bi-briefcase"></i>
                    </div>
                    <div>
                      <h5 className="font-black text-gray-900 uppercase text-sm tracking-tight">Belum Ada Riwayat Jabatan</h5>
                      <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
                        Anda dapat menambahkan data jabatan secara manual atau mengimpor data langsung dari SIMPEG.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          addHistoryItem('riwayatJabatan');
                        }}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md shadow-blue-100 flex items-center gap-2"
                      >
                        <i className="bi bi-plus-lg"></i> Tambah Manual
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenSimpegImport('jabatan')}
                        className="px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-100 flex items-center gap-2 cursor-pointer"
                      >
                        <i className="bi bi-file-earmark-spreadsheet"></i> Salin / Import dari SIMPEG
                      </button>
                      {pegawai.nama.toUpperCase().includes('ANDRIEANSJAH') && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm("Pasang 10 data riwayat jabatan otentik SIMPEG Kemenkumham (2010 s.d. Direktur Paten 2026) untuk Dr. ANDRIEANSJAH?")) {
                              await handleApplySimpegData('jabatan', 'REPLACE', ANDRIEANSJAH_JABATAN_DATA);
                            }
                          }}
                          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-black text-[10px] uppercase shadow-md shadow-amber-200 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                        >
                          <i className="bi bi-lightning-charge-fill text-yellow-200"></i> Muat 10 Riwayat SIMPEG Dr. Andrieansjah
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pangkat' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-100 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-amber-50 text-amber-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl shadow-sm">
                      <i className="bi bi-award-fill"></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Riwayat Pangkat / Golongan</h4>
                        <span className="px-2.5 py-0.5 bg-amber-100/70 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                          {(pegawai.riwayatPangkat || []).length} Riwayat
                        </span>
                      </div>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Kenaikan Pangkat Reguler, Pilihan, & Penyesuaian Ijazah Sesuai SIMPEG Kemenkumham
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* View Switcher */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-[9px] font-black uppercase">
                      <button
                        type="button"
                        onClick={() => setPangkatViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${pangkatViewMode === 'table' ? 'bg-white text-amber-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-table"></i> Tabel
                      </button>
                      <button
                        type="button"
                        onClick={() => setPangkatViewMode('card')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${pangkatViewMode === 'card' ? 'bg-white text-amber-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-grid-fill"></i> Kartu
                      </button>
                    </div>

                    {/* Quick Import SIMPEG Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenSimpegImport('pangkat')}
                      className="px-4 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 transition-all shadow-sm active:scale-95"
                      title="Salin dan tempel data kepangkatan langsung dari portal SIMPEG"
                    >
                      <i className="bi bi-file-earmark-spreadsheet-fill text-emerald-600"></i>
                      <span>Import SIMPEG</span>
                    </button>

                    {/* Tambah Pangkat */}
                    {isEditing && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => addHistoryItem('riwayatPangkat')}
                          className="px-4 py-2 bg-amber-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center gap-2 shadow-sm hover:bg-amber-700 transition-all cursor-pointer"
                        >
                          <i className="bi bi-plus-lg"></i> Tambah
                        </button>
                        {(pegawai.riwayatPangkat || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearHistory('riwayatPangkat')}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-black text-[9px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Kosongkan seluruh riwayat pangkat pegawai ini"
                          >
                            <i className="bi bi-trash3"></i> Kosongkan
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* TABLE VIEW */}
                {pangkatViewMode === 'table' && (pegawai.riwayatPangkat || []).length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 text-[9px] font-black uppercase text-gray-500 tracking-wider">
                            <th className="py-3 px-3 w-10 text-center">No</th>
                            <th className="py-3 px-4">Gol. Ruang</th>
                            <th className="py-3 px-4">Pangkat</th>
                            <th className="py-3 px-3 text-center">TMT Pangkat</th>
                            <th className="py-3 px-4">Nomor SK</th>
                            <th className="py-3 px-3 text-center">Tanggal SK</th>
                            <th className="py-3 px-3 text-center">Berkas SK</th>
                            {isEditing && <th className="py-3 px-3 text-center w-14">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans">
                          {(pegawai.riwayatPangkat || []).map((p, idx) => (
                            <tr key={`${p.pangkat}-${p.tmtPangkat}-${idx}`} className="hover:bg-amber-50/30 transition-colors">
                              <td className="py-3 px-3 text-center text-[10px] font-bold text-gray-400">{idx + 1}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-black text-[9px] uppercase font-mono">
                                  {p.golRuang || '-'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold text-gray-900 uppercase text-[11px]">{p.pangkat || '-'}</td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-gray-800 text-[10px]">{formatDateIndoDisplay(p.tmtPangkat)}</td>
                              <td className="py-3 px-4 font-mono text-gray-600 text-[10px] uppercase">{p.nomorSk || '-'}</td>
                              <td className="py-3 px-3 text-center font-mono text-gray-600 text-[10px]">{formatDateIndoDisplay(p.tanggalSk)}</td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {p.fileUrl ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => window.open(p.fileUrl || '', '_blank')}
                                        className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                        title="Lihat SK Pangkat"
                                      >
                                        <i className="bi bi-eye"></i>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(p.fileUrl || '')}
                                        className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                        title="Unduh SK Pangkat"
                                      >
                                        <i className="bi bi-download"></i>
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[9px] text-gray-300 italic">-</span>
                                  )}
                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'application/pdf';
                                        input.onchange = (e: any) => {
                                          const file = e.target.files[0];
                                          if (file) handleUploadHistoryFile('riwayatPangkat', idx, file);
                                        };
                                        input.click();
                                      }}
                                      className="h-7 w-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-amber-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                      title="Unggah Berkas SK Pangkat (PDF)"
                                    >
                                      <i className="bi bi-upload"></i>
                                    </button>
                                  )}
                                </div>
                              </td>
                              {isEditing && (
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeHistoryItem('riwayatPangkat', idx)}
                                    className="h-7 w-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors mx-auto text-xs"
                                    title="Hapus riwayat pangkat ini"
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CARD FORM VIEW */}
                {pangkatViewMode === 'card' && (
                  <div className="space-y-4">
                    {(pegawai.riwayatPangkat || []).map((p, idx) => (
                      <div key={`${p.pangkat}-${p.tmtPangkat}-${idx}`} className="bg-gray-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative group">
                        {isEditing && (
                          <button onClick={() => removeHistoryItem('riwayatPangkat', idx)} className="absolute top-4 right-4 h-8 w-8 bg-white text-rose-400 rounded-lg flex items-center justify-center hover:text-rose-600 shadow-sm md:opacity-0 group-hover:opacity-100 transition-all">
                            <i className="bi bi-trash3"></i>
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Gol. Ruang</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.golRuang} onChange={e => updateHistoryItem('riwayatPangkat', idx, 'golRuang', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.golRuang || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Pangkat</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.pangkat} onChange={e => updateHistoryItem('riwayatPangkat', idx, 'pangkat', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.pangkat || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">TMT Pangkat</label>
                            {isEditing ? (
                              <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={formatDateForInput(p.tmtPangkat)} onChange={e => updateHistoryItem('riwayatPangkat', idx, 'tmtPangkat', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{formatDateIndoDisplay(p.tmtPangkat)}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor SK</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.nomorSk} onChange={e => updateHistoryItem('riwayatPangkat', idx, 'nomorSk', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.nomorSk || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal SK</label>
                            {isEditing ? (
                              <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={formatDateForInput(p.tanggalSk)} onChange={e => updateHistoryItem('riwayatPangkat', idx, 'tanggalSk', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{formatDateIndoDisplay(p.tanggalSk)}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                             <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Upload SK Pangkat (PDF)</label>
                             <div className="flex items-center gap-3">
                                {p.fileUrl ? (
                                   <div className="flex gap-2">
                                      <button onClick={() => window.open(p.fileUrl || '', '_blank')} className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-black uppercase border border-amber-100 hover:bg-amber-600 hover:text-white transition-all">Lihat SK</button>
                                      <button onClick={() => handleDownload(p.fileUrl || '')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 font-black">
                                         <i className="bi bi-download"></i> Unduh SK
                                      </button>
                                   </div>
                                ) : <span className="text-[9px] font-bold text-gray-300 italic uppercase">Belum ada file</span>}
                                {isEditing && (
                                   <button onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'application/pdf';
                                      input.onchange = (e: any) => {
                                         const file = e.target.files[0];
                                         if (file) handleUploadHistoryFile('riwayatPangkat', idx, file);
                                      };
                                      input.click();
                                   }} className="px-4 py-2 bg-white border border-gray-200 text-gray-400 rounded-xl text-[9px] font-black uppercase hover:border-amber-600 hover:text-amber-600 transition-all">Ganti File</button>
                                )}
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {(pegawai.riwayatPangkat || []).length === 0 && (
                  <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl md:rounded-[2.5rem] bg-gray-50/50 space-y-4">
                    <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-xs">
                      <i className="bi bi-award"></i>
                    </div>
                    <div>
                      <h5 className="font-black text-gray-900 uppercase text-sm tracking-tight">Belum Ada Riwayat Pangkat</h5>
                      <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
                        Anda dapat menambahkan data kepangkatan secara manual atau mengimpor data langsung dari SIMPEG.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          addHistoryItem('riwayatPangkat');
                        }}
                        className="px-5 py-2.5 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md shadow-amber-100 flex items-center gap-2"
                      >
                        <i className="bi bi-plus-lg"></i> Tambah Manual
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenSimpegImport('pangkat')}
                        className="px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-100 flex items-center gap-2"
                      >
                        <i className="bi bi-file-earmark-spreadsheet"></i> Salin / Import dari SIMPEG
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'gaji' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-100 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl shadow-sm">
                      <i className="bi bi-cash-stack"></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Riwayat Gaji & KGB</h4>
                        <span className="px-2.5 py-0.5 bg-emerald-100/70 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                          {(pegawai.riwayatGaji || []).length} Riwayat
                        </span>
                      </div>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Kenaikan Gaji Berkala (KGB) & SK Kenaikan Pangkat Sesuai SIMPEG Kemenkumham
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* View Switcher */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-[9px] font-black uppercase">
                      <button
                        type="button"
                        onClick={() => setGajiViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${gajiViewMode === 'table' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-table"></i> Tabel
                      </button>
                      <button
                        type="button"
                        onClick={() => setGajiViewMode('card')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${gajiViewMode === 'card' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-grid-fill"></i> Kartu
                      </button>
                    </div>

                    {/* Quick Import SIMPEG Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenSimpegImport('gaji')}
                      className="px-4 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 transition-all shadow-sm active:scale-95"
                      title="Salin dan tempel data kenaikan gaji langsung dari portal SIMPEG"
                    >
                      <i className="bi bi-file-earmark-spreadsheet-fill text-emerald-600"></i>
                      <span>Import SIMPEG</span>
                    </button>

                    {/* Tambah Gaji / KGB */}
                    {isEditing && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => addHistoryItem('riwayatGaji')}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
                        >
                          <i className="bi bi-plus-lg"></i> Tambah
                        </button>
                        {(pegawai.riwayatGaji || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearHistory('riwayatGaji')}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-black text-[9px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Kosongkan seluruh riwayat gaji pegawai ini"
                          >
                            <i className="bi bi-trash3"></i> Kosongkan
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* TABLE VIEW */}
                {gajiViewMode === 'table' && (pegawai.riwayatGaji || []).length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 text-[9px] font-black uppercase text-gray-500 tracking-wider">
                            <th className="py-3 px-3 w-10 text-center">No</th>
                            <th className="py-3 px-3">Jenis Kenaikan</th>
                            <th className="py-3 px-4 text-right">Gaji Pokok</th>
                            <th className="py-3 px-3 text-center">TMT SK</th>
                            <th className="py-3 px-4">Nomor SK</th>
                            <th className="py-3 px-3 text-center">Tanggal SK</th>
                            <th className="py-3 px-3 text-center">Masa Kerja</th>
                            <th className="py-3 px-4">Pejabat Penetap</th>
                            <th className="py-3 px-3 text-center">Berkas SK</th>
                            {isEditing && <th className="py-3 px-3 text-center w-14">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans">
                          {(pegawai.riwayatGaji || []).map((g, idx) => (
                            <tr key={`${g.nomorSk}-${g.tmtSk}-${idx}`} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="py-3 px-3 text-center text-[10px] font-bold text-gray-400">{idx + 1}</td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-black text-[9px] uppercase whitespace-nowrap">
                                  {g.jenisKenaikanGaji || 'KGB'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 text-[11px] whitespace-nowrap">
                                {g.gajiPokok ? (
                                  isNaN(Number(String(g.gajiPokok).replace(/\D/g, ''))) 
                                    ? g.gajiPokok 
                                    : `Rp ${Number(String(g.gajiPokok).replace(/\D/g, '')).toLocaleString('id-ID')}`
                                ) : '-'}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-gray-800 text-[10px] whitespace-nowrap">
                                {formatDateIndoDisplay(g.tmtSk)}
                              </td>
                              <td className="py-3 px-4 font-mono text-gray-700 text-[10px] uppercase">
                                {g.nomorSk || '-'}
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-gray-600 text-[10px] whitespace-nowrap">
                                {formatDateIndoDisplay(g.tanggalSk)}
                              </td>
                              <td className="py-3 px-3 text-center text-[10px] text-gray-600 whitespace-nowrap">
                                {g.masaKerjaTahun ? `${g.masaKerjaTahun} Th ${g.masaKerjaBulan ? `${g.masaKerjaBulan} Bln` : ''}` : '-'}
                              </td>
                              <td className="py-3 px-4 text-gray-600 uppercase text-[10px] truncate max-w-[150px]">
                                {g.pejabatPenetap || '-'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {g.fileUrl ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => window.open(g.fileUrl || '', '_blank')}
                                        className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                        title="Lihat SK KGB"
                                      >
                                        <i className="bi bi-eye"></i>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(g.fileUrl || '')}
                                        className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                        title="Unduh SK KGB"
                                      >
                                        <i className="bi bi-download"></i>
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[9px] text-gray-300 italic">-</span>
                                  )}
                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'application/pdf';
                                        input.onchange = (e: any) => {
                                          const file = e.target.files[0];
                                          if (file) handleUploadHistoryFile('riwayatGaji', idx, file);
                                        };
                                        input.click();
                                      }}
                                      className="h-7 w-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                      title="Unggah Berkas SK KGB (PDF)"
                                    >
                                      <i className="bi bi-upload"></i>
                                    </button>
                                  )}
                                </div>
                              </td>
                              {isEditing && (
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeHistoryItem('riwayatGaji', idx)}
                                    className="h-7 w-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors mx-auto text-xs"
                                    title="Hapus riwayat gaji ini"
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CARD FORM VIEW */}
                {gajiViewMode === 'card' && (
                  <div className="space-y-4">
                    {(pegawai.riwayatGaji || []).map((g, idx) => (
                      <div key={`${g.nomorSk}-${g.tmtSk}-${idx}`} className="bg-gray-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative group">
                        {isEditing && (
                          <button onClick={() => removeHistoryItem('riwayatGaji', idx)} className="absolute top-4 right-4 h-8 w-8 bg-white text-rose-400 rounded-lg flex items-center justify-center hover:text-rose-600 shadow-sm md:opacity-0 group-hover:opacity-100 transition-all">
                            <i className="bi bi-trash3"></i>
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jenis Kenaikan</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={g.jenisKenaikanGaji || ''} placeholder="Kenaikan Gaji Berkala" onChange={e => updateHistoryItem('riwayatGaji', idx, 'jenisKenaikanGaji', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{g.jenisKenaikanGaji || 'KGB'}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Gaji Pokok</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold font-mono outline-none" value={g.gajiPokok || ''} placeholder="Contoh: 3500000" onChange={e => updateHistoryItem('riwayatGaji', idx, 'gajiPokok', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold font-mono text-emerald-700 select-all">
                                {g.gajiPokok ? (isNaN(Number(String(g.gajiPokok).replace(/\D/g, ''))) ? g.gajiPokok : `Rp ${Number(String(g.gajiPokok).replace(/\D/g, '')).toLocaleString('id-ID')}`) : '-'}
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">TMT SK Gaji</label>
                            {isEditing ? (
                              <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={formatDateForInput(g.tmtSk)} onChange={e => updateHistoryItem('riwayatGaji', idx, 'tmtSk', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{formatDateIndoDisplay(g.tmtSk)}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Masa Kerja (Th / Bln)</label>
                            {isEditing ? (
                              <div className="flex gap-2">
                                <input type="text" className="w-1/2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" placeholder="Tahun" value={g.masaKerjaTahun || ''} onChange={e => updateHistoryItem('riwayatGaji', idx, 'masaKerjaTahun', e.target.value)} />
                                <input type="text" className="w-1/2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" placeholder="Bulan" value={g.masaKerjaBulan || ''} onChange={e => updateHistoryItem('riwayatGaji', idx, 'masaKerjaBulan', e.target.value)} />
                              </div>
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">
                                {g.masaKerjaTahun ? `${g.masaKerjaTahun} Tahun ${g.masaKerjaBulan ? `${g.masaKerjaBulan} Bulan` : ''}` : '-'}
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor SK</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase font-mono" value={g.nomorSk || ''} onChange={e => updateHistoryItem('riwayatGaji', idx, 'nomorSk', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold font-mono text-gray-900 select-all">{g.nomorSk || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal SK</label>
                            {isEditing ? (
                              <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={formatDateForInput(g.tanggalSk)} onChange={e => updateHistoryItem('riwayatGaji', idx, 'tanggalSk', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{formatDateIndoDisplay(g.tanggalSk)}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Pejabat Penetap</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={g.pejabatPenetap || ''} onChange={e => updateHistoryItem('riwayatGaji', idx, 'pejabatPenetap', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{g.pejabatPenetap || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Upload SK KGB (PDF)</label>
                            <div className="flex items-center gap-3">
                              {g.fileUrl ? (
                                <div className="flex gap-2">
                                  <button onClick={() => window.open(g.fileUrl || '', '_blank')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all">Lihat SK</button>
                                  <button onClick={() => handleDownload(g.fileUrl || '')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 font-black">
                                    <i className="bi bi-download"></i> Unduh SK
                                  </button>
                                </div>
                              ) : <span className="text-[9px] font-bold text-gray-300 italic uppercase">Belum ada file</span>}
                              {isEditing && (
                                <button onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'application/pdf';
                                  input.onchange = (e: any) => {
                                    const file = e.target.files[0];
                                    if (file) handleUploadHistoryFile('riwayatGaji', idx, file);
                                  };
                                  input.click();
                                }} className="px-4 py-2 bg-white border border-gray-200 text-gray-400 rounded-xl text-[9px] font-black uppercase hover:border-emerald-600 hover:text-emerald-600 transition-all">Ganti File</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {(pegawai.riwayatGaji || []).length === 0 && (
                  <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl md:rounded-[2.5rem] bg-gray-50/50 space-y-4">
                    <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-xs">
                      <i className="bi bi-cash-stack"></i>
                    </div>
                    <div>
                      <h5 className="font-black text-gray-900 uppercase text-sm tracking-tight">Belum Ada Riwayat Gaji & KGB</h5>
                      <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
                        Anda dapat menambahkan data kenaikan gaji secara manual atau mengimpor data langsung dari SIMPEG.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          addHistoryItem('riwayatGaji');
                        }}
                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md shadow-emerald-100 flex items-center gap-2"
                      >
                        <i className="bi bi-plus-lg"></i> Tambah Manual
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenSimpegImport('gaji')}
                        className="px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-100 flex items-center gap-2"
                      >
                        <i className="bi bi-file-earmark-spreadsheet"></i> Salin / Import dari SIMPEG
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pelatihan' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-100 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-purple-50 text-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl shadow-sm">
                      <i className="bi bi-journal-check"></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Riwayat Pelatihan & Diklat</h4>
                        <span className="px-2.5 py-0.5 bg-purple-100/70 text-purple-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                          {(pegawai.riwayatPelatihan || []).length} Riwayat
                        </span>
                      </div>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Diklat Kepemimpinan, Fungsional, & Teknis Sesuai SIMPEG Kemenkumham
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* View Switcher */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-[9px] font-black uppercase">
                      <button
                        type="button"
                        onClick={() => setPelatihanViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${pelatihanViewMode === 'table' ? 'bg-white text-purple-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-table"></i> Tabel
                      </button>
                      <button
                        type="button"
                        onClick={() => setPelatihanViewMode('card')}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${pelatihanViewMode === 'card' ? 'bg-white text-purple-700 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <i className="bi bi-grid-fill"></i> Kartu
                      </button>
                    </div>

                    {/* Quick Button for Dr. Andrieansjah Pelatihan Records */}
                    {pegawai.nama.toUpperCase().includes('ANDRIEANSJAH') && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm("Pasang 6 data riwayat pelatihan otentik SIMPEG Kemenkumham (Prajabatan, Diklatpim IV, III, II, I, dan ISO 37001) untuk Dr. ANDRIEANSJAH?")) {
                            await handleApplySimpegData('pelatihan', 'REPLACE', ANDRIEANSJAH_PELATIHAN_DATA);
                          }
                        }}
                        className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-black text-[9px] uppercase flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Pasang 6 Riwayat Diklat SIMPEG Dr. Andrieansjah"
                      >
                        <i className="bi bi-lightning-charge-fill text-yellow-300"></i>
                        <span>Muat 6 Riwayat SIMPEG</span>
                      </button>
                    )}

                    {/* Quick Import SIMPEG Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenSimpegImport('pelatihan')}
                      className="px-4 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 transition-all shadow-sm active:scale-95"
                      title="Salin dan tempel data diklat / pelatihan langsung dari portal SIMPEG"
                    >
                      <i className="bi bi-file-earmark-spreadsheet-fill text-emerald-600"></i>
                      <span>Import SIMPEG</span>
                    </button>

                    {/* Tambah Pelatihan */}
                    {isEditing && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => addHistoryItem('riwayatPelatihan')}
                          className="px-4 py-2 bg-purple-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center gap-2 shadow-sm hover:bg-purple-700 transition-all cursor-pointer"
                        >
                          <i className="bi bi-plus-lg"></i> Tambah
                        </button>
                        {(pegawai.riwayatPelatihan || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearHistory('riwayatPelatihan')}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-black text-[9px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Kosongkan seluruh riwayat pelatihan pegawai ini"
                          >
                            <i className="bi bi-trash3"></i> Kosongkan
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* TABLE VIEW */}
                {pelatihanViewMode === 'table' && (pegawai.riwayatPelatihan || []).length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 text-[9px] font-black uppercase text-gray-500 tracking-wider">
                            <th className="py-3 px-3 w-10 text-center">No</th>
                            <th className="py-3 px-4 min-w-[200px]">Jenis & Nama Diklat</th>
                            <th className="py-3 px-3 text-center">Angkatan</th>
                            <th className="py-3 px-3 text-center">Tahun</th>
                            <th className="py-3 px-3 text-center">Waktu Pelaksanaan</th>
                            <th className="py-3 px-3 text-center">Durasi</th>
                            <th className="py-3 px-4">Tempat & Penyelenggara</th>
                            <th className="py-3 px-4">No. & Tgl STTPP</th>
                            <th className="py-3 px-3 text-center">Sertifikat</th>
                            {isEditing && <th className="py-3 px-3 text-center w-14">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans">
                          {(pegawai.riwayatPelatihan || []).map((p, idx) => (
                            <tr key={`${p.namaPelatihan}-${idx}`} className="hover:bg-purple-50/30 transition-colors">
                              <td className="py-3 px-3 text-center text-[10px] font-bold text-gray-400">{idx + 1}</td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-gray-900 uppercase text-[11px] leading-snug">
                                  {p.namaPelatihan || '-'}
                                </div>
                                {p.jenisDiklat && p.jenisDiklat !== '-' && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-black text-[8px] uppercase tracking-wide">
                                    {p.jenisDiklat}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 font-mono font-bold text-[10px] rounded">
                                  {p.angkatan || '-'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-gray-800 text-[10px]">
                                {p.tahun || '-'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="text-[10px] font-mono text-gray-600 whitespace-nowrap">
                                  {p.tanggalMulai ? formatDateIndoDisplay(p.tanggalMulai) : '-'}
                                  {p.tanggalSelesai ? (
                                    <span className="text-gray-400"> s/d {formatDateIndoDisplay(p.tanggalSelesai)}</span>
                                  ) : ''}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-900 font-mono font-bold text-[10px] rounded whitespace-nowrap">
                                  {p.durasi ? (String(p.durasi).toLowerCase().includes('jam') ? p.durasi : `${p.durasi} Jam`) : '-'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-[10px] font-bold text-gray-800 uppercase leading-snug">
                                  {p.penyelenggara || '-'}
                                </div>
                                {p.tempat && p.tempat !== '-' && p.tempat !== p.penyelenggara && (
                                  <div className="text-[9px] text-gray-400 flex items-center gap-1 mt-0.5">
                                    <i className="bi bi-geo-alt-fill text-[8px]"></i>
                                    <span>{p.tempat}</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-mono text-gray-700 text-[10px] uppercase font-bold leading-tight">
                                  {p.nomorSertifikat && p.nomorSertifikat !== '-' ? p.nomorSertifikat : '-'}
                                </div>
                                {p.tanggalSertifikat && p.tanggalSertifikat !== '-' && (
                                  <div className="text-[9px] font-mono text-gray-400 mt-0.5">
                                    Tgl: {formatDateIndoDisplay(p.tanggalSertifikat)}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {p.fileUrl ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => window.open(p.fileUrl || '', '_blank')}
                                        className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                        title="Lihat Sertifikat"
                                      >
                                        <i className="bi bi-eye"></i>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(p.fileUrl || '')}
                                        className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                        title="Unduh Sertifikat"
                                      >
                                        <i className="bi bi-download"></i>
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[9px] text-gray-300 italic">-</span>
                                  )}
                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'application/pdf';
                                        input.onchange = (e: any) => {
                                          const file = e.target.files[0];
                                          if (file) handleUploadHistoryFile('riwayatPelatihan', idx, file);
                                        };
                                        input.click();
                                      }}
                                      className="h-7 w-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-purple-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                                      title="Unggah Sertifikat (PDF)"
                                    >
                                      <i className="bi bi-upload"></i>
                                    </button>
                                  )}
                                </div>
                              </td>
                              {isEditing && (
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeHistoryItem('riwayatPelatihan', idx)}
                                    className="h-7 w-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors mx-auto text-xs"
                                    title="Hapus riwayat pelatihan ini"
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CARD FORM VIEW */}
                {pelatihanViewMode === 'card' && (
                  <div className="space-y-4">
                    {(pegawai.riwayatPelatihan || []).map((p, idx) => (
                      <div key={`${p.namaPelatihan}-${idx}`} className="bg-gray-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative group">
                        {isEditing && (
                          <button onClick={() => removeHistoryItem('riwayatPelatihan', idx)} className="absolute top-4 right-4 h-8 w-8 bg-white text-rose-400 rounded-lg flex items-center justify-center hover:text-rose-600 shadow-sm md:opacity-0 group-hover:opacity-100 transition-all">
                            <i className="bi bi-trash3"></i>
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nama Pelatihan</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.namaPelatihan} onChange={e => updateHistoryItem('riwayatPelatihan', idx, 'namaPelatihan', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.namaPelatihan || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Penyelenggara</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.penyelenggara} onChange={e => updateHistoryItem('riwayatPelatihan', idx, 'penyelenggara', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.penyelenggara || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tahun</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={p.tahun} onChange={e => updateHistoryItem('riwayatPelatihan', idx, 'tahun', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.tahun || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Durasi</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.durasi} onChange={e => updateHistoryItem('riwayatPelatihan', idx, 'durasi', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.durasi || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor Sertifikat</label>
                            {isEditing ? (
                              <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.nomorSertifikat} onChange={e => updateHistoryItem('riwayatPelatihan', idx, 'nomorSertifikat', e.target.value)} />
                            ) : (
                              <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.nomorSertifikat || '-'}</div>
                            )}
                          </div>
                          <div className="space-y-1 md:col-span-2">
                             <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Upload Sertifikat (PDF)</label>
                             <div className="flex items-center gap-3">
                                {p.fileUrl ? (
                                   <div className="flex gap-2">
                                      <button onClick={() => window.open(p.fileUrl || '', '_blank')} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-[9px] font-black uppercase border border-purple-100 hover:bg-purple-600 hover:text-white transition-all">Lihat Sertifikat</button>
                                      <button onClick={() => handleDownload(p.fileUrl || '')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 font-black">
                                         <i className="bi bi-download"></i> Unduh PDF
                                      </button>
                                   </div>
                                ) : <span className="text-[9px] font-bold text-gray-300 italic uppercase">Belum ada file</span>}
                                {isEditing && (
                                   <button onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'application/pdf';
                                      input.onchange = (e: any) => {
                                         const file = e.target.files[0];
                                         if (file) handleUploadHistoryFile('riwayatPelatihan', idx, file);
                                      };
                                      input.click();
                                   }} className="px-4 py-2 bg-white border border-gray-200 text-gray-400 rounded-xl text-[9px] font-black uppercase hover:border-purple-600 hover:text-purple-600 transition-all">Ganti File</button>
                                )}
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {(pegawai.riwayatPelatihan || []).length === 0 && (
                  <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl md:rounded-[2.5rem] bg-gray-50/50 space-y-4">
                    <div className="h-16 w-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-xs">
                      <i className="bi bi-journal-check"></i>
                    </div>
                    <div>
                      <h5 className="font-black text-gray-900 uppercase text-sm tracking-tight">Belum Ada Riwayat Pelatihan</h5>
                      <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
                        Anda dapat menambahkan data diklat/pelatihan secara manual atau mengimpor data langsung dari SIMPEG.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      {pegawai.nama.toUpperCase().includes('ANDRIEANSJAH') && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm("Pasang 6 data riwayat pelatihan otentik SIMPEG Kemenkumham (Prajabatan, Diklatpim IV, III, II, I, dan ISO 37001) untuk Dr. ANDRIEANSJAH?")) {
                              await handleApplySimpegData('pelatihan', 'REPLACE', ANDRIEANSJAH_PELATIHAN_DATA);
                            }
                          }}
                          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-black text-[10px] uppercase shadow-md shadow-purple-100 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                          <i className="bi bi-lightning-charge-fill text-yellow-300"></i> Muat 6 Riwayat SIMPEG Dr. Andrieansjah
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          addHistoryItem('riwayatPelatihan');
                        }}
                        className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md shadow-purple-100 flex items-center gap-2"
                      >
                        <i className="bi bi-plus-lg"></i> Tambah Manual
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenSimpegImport('pelatihan')}
                        className="px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-100 flex items-center gap-2"
                      >
                        <i className="bi bi-file-earmark-spreadsheet"></i> Salin / Import dari SIMPEG
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dossier' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-50 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl"><i className="bi bi-folder-fill"></i></div>
                    <div>
                      <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Digital Dossier</h4>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Arsip dokumen digital pegawai</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button onClick={loadData} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                      <i className="bi bi-arrow-clockwise"></i> Segarkan Berkas
                    </button>
                    {isEditing && (
                      <button onClick={() => setIsAddDossierOpen(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                        <i className="bi bi-cloud-arrow-up-fill"></i> Tambah Berkas
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dossiers.map((d, i) => (
                    <div key={`${d.id}-${i}`} className="p-5 md:p-6 bg-gray-50 border border-gray-100 rounded-2xl md:rounded-[2.5rem] hover:bg-white hover:border-blue-300 transition-all group flex items-center gap-4 md:gap-5">
                      <div className="h-12 w-12 md:h-14 md:w-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 text-2xl md:text-3xl shadow-sm shrink-0"><i className="bi bi-file-earmark-pdf-fill"></i></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] md:text-[11px] font-black uppercase truncate text-gray-950">{d.fileName}</p>
                        <p className="text-[7px] md:text-[8px] font-bold text-gray-400 mt-1 uppercase">{d.tanggal}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => d.fileUrl && window.open(d.fileUrl, '_blank')}
                          className="px-4 py-2 flex items-center justify-center bg-white border border-gray-100 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm text-[9px] font-black uppercase"
                          title="Lihat"
                        >
                          <i className="bi bi-eye mr-2"></i> Lihat
                        </button>
                        <button 
                          onClick={() => handleDownload(d.fileUrl || '')}
                          className="px-4 py-2 flex items-center justify-center bg-white border border-gray-100 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm text-[9px] font-black uppercase"
                          title="Unduh PDF"
                        >
                          <i className="bi bi-download mr-2"></i> Unduh
                        </button>
                      </div>
                    </div>
                  ))}
                  {dossiers.length === 0 && (
                    <div className="col-span-full py-16 md:py-20 text-center opacity-30">
                      <i className="bi bi-folder-x text-4xl md:text-5xl mb-4 block"></i>
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Belum ada dokumen terunggah</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Add Dossier Modal */}
      {isAddDossierOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm" onClick={() => !uploading && setIsAddDossierOpen(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter border border-white/20">
              <div className="p-8 border-b bg-gray-50 flex justify-between items-center shrink-0">
                 <div>
                    <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Tambah Berkas Digital</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Upload to Personnel Dossier</p>
                 </div>
                 <button onClick={() => setIsAddDossierOpen(false)} className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all">
                    <i className="bi bi-x-lg text-lg"></i>
                 </button>
              </div>
              <form onSubmit={handleSaveDossier} className="p-10 space-y-6">
                 <div>
                    <label className={labelClass}>Nama Berkas / Jenis Dokumen</label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      placeholder="Contoh: SK Kenaikan Pangkat 2024"
                      value={dossierFormData.fileName}
                      onChange={e => setDossierFormData({...dossierFormData, fileName: e.target.value})}
                      required 
                    />
                 </div>
                 <div>
                    <label className={labelClass}>Keterangan Tambahan</label>
                    <textarea 
                      className={`${inputNoCapsClass} h-24 resize-none`}
                      placeholder="Catatan opsional..."
                      value={dossierFormData.keterangan}
                      onChange={e => setDossierFormData({...dossierFormData, keterangan: e.target.value})}
                    />
                 </div>
                 <div className="p-8 bg-blue-50 border-2 border-dashed border-blue-200 rounded-[2rem] flex flex-col items-center gap-4">
                    <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-xl">
                       <i className="bi bi-cloud-arrow-up text-3xl"></i>
                    </div>
                    <div className="text-center">
                       <p className="text-[10px] font-black uppercase text-gray-950">Pilih File Berkas</p>
                       <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">PDF atau Gambar (Maks 10MB)</p>
                    </div>
                    <button type="button" onClick={() => dossierFileInputRef.current?.click()} className="px-6 py-2 bg-white border border-gray-100 text-blue-600 rounded-xl text-[9px] font-black uppercase shadow-sm">Pilih File</button>
                    <input type="file" ref={dossierFileInputRef} className="hidden" accept=".pdf,image/*" />
                 </div>
                 <div className="pt-6 border-t flex gap-3">
                    <button type="button" onClick={() => setIsAddDossierOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[10px] uppercase">Batal</button>
                    <button type="submit" disabled={uploading} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                       {uploading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                       <span>Unggah & Simpan Berkas</span>
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* TEMPLATE DAFTAR RIWAYAT HIDUP (PRINT READY) */}
      <div className="fixed -left-[4000px] top-0 pointer-events-none">
         <div ref={drhRef} className="bg-white text-black font-arial p-[1.5cm_1.5cm] leading-tight" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* OFFICIAL HEADER */}
            <div className="flex flex-col items-center mb-8 border-b-2 border-black pb-4 text-center">
                <img src={LOGO_PENGAYOMAN_URL} className="h-20 mb-4 grayscale" crossOrigin="anonymous" />
                <p className="text-[12pt] font-bold uppercase leading-tight">KEMENTERIAN HUKUM</p>
                <p className="text-[12pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                <p className="text-[9pt] font-normal leading-tight mt-1">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
            </div>

            <div className="text-center mb-8">
               <h1 className="text-[13pt] font-bold uppercase underline leading-tight">DAFTAR RIWAYAT HIDUP</h1>
               <p className="text-[10pt] font-bold mt-1">PEGAWAI NEGERI SIPIL / PPPK</p>
            </div>

            <div className="space-y-6 text-[10pt] text-black">
               <section>
                  <p className="font-bold border-b border-black mb-3 uppercase bg-gray-50 px-2 py-1">I. DATA PRIBADI</p>
                  <table className="w-full border-collapse">
                     <tbody>
                        <tr><td className="w-[180px] py-1">1. Nama Lengkap</td><td className="w-4 py-1 text-center">:</td><td className="py-1 font-bold underline">{formatPegawaiName(pegawai.nama)}</td></tr>
                        <tr><td className="py-1">2. NIP</td><td className="py-1 text-center">:</td><td className="py-1 font-bold">{pegawai.nip}</td></tr>
                        <tr><td className="py-1">3. NIK</td><td className="py-1 text-center">:</td><td className="py-1">{pegawai.nik || '-'}</td></tr>
                        <tr><td className="py-1">4. Tempat, Tgl Lahir</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.tempatLahir || '-'}, {formatDateIndoDisplay(pegawai.tanggalLahir)}</td></tr>
                        <tr><td className="py-1">5. Jenis Kelamin</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</td></tr>
                        <tr><td className="py-1">6. Agama</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.agama || '-'}</td></tr>
                        <tr><td className="py-1">7. Alamat Domisili</td><td className="py-1 text-center">:</td><td className="py-1 uppercase leading-tight">{pegawai.alamat || '-'}</td></tr>
                        <tr><td className="py-1">8. No. Telepon / HP</td><td className="py-1 text-center">:</td><td className="py-1">{pegawai.noHp || '-'}</td></tr>
                        <tr><td className="py-1">9. E-Mail</td><td className="py-1 text-center">:</td><td className="py-1 text-blue-800 lowercase">{pegawai.email || '-'}</td></tr>
                     </tbody>
                  </table>
               </section>

               <section>
                  <p className="font-bold border-b border-black mb-3 uppercase bg-gray-50 px-2 py-1">II. POSISI DAN KEPANGKATAN</p>
                  <table className="w-full border-collapse">
                     <tbody>
                        <tr><td className="w-[180px] py-1">1. Nama Jabatan</td><td className="w-4 py-1 text-center">:</td><td className="py-1 font-bold uppercase">{pegawai.jabatan || '-'}</td></tr>
                        <tr><td className="py-1">2. TMT Jabatan</td><td className="py-1 text-center">:</td><td className="py-1">{formatDateIndoDisplay(pegawai.tmtJabatan)}</td></tr>
                        <tr><td className="py-1">3. Eselon</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.eselon || '-'}</td></tr>
                        <tr><td className="py-1">4. Pangkat (Golongan)</td><td className="py-1 text-center">:</td><td className="py-1 uppercase font-bold">{pegawai.pangkat} ({pegawai.golRuang})</td></tr>
                        <tr><td className="py-1">5. TMT Pangkat</td><td className="py-1 text-center">:</td><td className="py-1">{formatDateIndoDisplay(pegawai.tmtPangkat)}</td></tr>
                        <tr><td className="py-1">6. Masa Kerja Golongan</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.masaKerja || '-'}</td></tr>
                        <tr><td className="py-1">7. Unit Kerja</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.unitKerja}</td></tr>
                        <tr><td className="py-1">8. TMT CPNS / Kontrak</td><td className="py-1 text-center">:</td><td className="py-1">{formatDateIndoDisplay(pegawai.tmtCpns)}</td></tr>
                     </tbody>
                  </table>
               </section>

               <section>
                  <p className="font-bold border-b border-black mb-3 uppercase bg-gray-50 px-2 py-1">III. RIWAYAT PENDIDIKAN</p>
                  <table className="w-full border-collapse">
                     <tbody>
                        <tr><td className="w-[180px] py-1">1. Jenjang Pendidikan</td><td className="w-4 py-1 text-center">:</td><td className="py-1 uppercase font-bold">{pegawai.pendidikan || '-'}</td></tr>
                        <tr><td className="py-1">2. Program Studi / Jurusan</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.jurusan || '-'}</td></tr>
                     </tbody>
                  </table>
               </section>

               <section>
                  <p className="font-bold border-b border-black mb-3 uppercase bg-gray-50 px-2 py-1">IV. DATA ADMINISTRASI LAINNYA</p>
                  <table className="w-full border-collapse">
                     <tbody>
                        <tr><td className="w-[180px] py-1">1. Nomor NPWP</td><td className="w-4 py-1 text-center">:</td><td className="py-1">{pegawai.npwp || '-'}</td></tr>
                        <tr><td className="py-1">2. Nomor BPJS Kes.</td><td className="py-1 text-center">:</td><td className="py-1">{pegawai.noBpjs || '-'}</td></tr>
                        <tr><td className="py-1">3. No. Karis / Karsu</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.noKarisKarsu || '-'}</td></tr>
                        <tr><td className="py-1">4. Rekening Gaji</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.namaBank || '-'} - {pegawai.noRekeningGaji || '-'}</td></tr>
                     </tbody>
                  </table>
               </section>
            </div>

            <div className="mt-14 flex justify-between items-start text-black">
               <div className="w-[3.5cm] h-[4.5cm] border-2 border-black flex flex-col items-center justify-center text-[7pt] italic text-gray-400 p-2 text-center ml-10">
                  {pegawai.foto ? (
                    <img src={pegawai.foto} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <span>PAS FOTO 3X4<br/>TEMPEL DI SINI</span>
                  )}
               </div>
               
               <div className="text-center w-[250px] mr-10">
                  <p className="text-[10pt]">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="mt-1 mb-28 uppercase font-bold text-[10pt]">Pegawai Bersangkutan,</p>
                  <p className="font-bold underline leading-none text-[11pt]">{formatPegawaiName(pegawai.nama)}</p>
                  <p className="mt-1 text-[10pt]">NIP {pegawai.nip}</p>
               </div>
            </div>

            <div className="mt-10 pt-4 border-t border-dotted border-black/30 text-[7pt] italic text-gray-500 text-right">
                Dokumen ini dicetak secara otomatis melalui PORTAL SDM DJKI pada {new Date().toLocaleString('id-ID')}.
            </div>
         </div>
      </div>

      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm" onClick={() => !uploading && setIsPhotoModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-modalEnter border border-white/20">
            <div className="p-6 border-b flex justify-between items-center">
              <h4 className="text-lg font-black uppercase text-gray-950 tracking-tighter">Ganti Foto Profil</h4>
              <button onClick={() => setIsPhotoModalOpen(false)} className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-rose-500">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="p-8 flex flex-col items-center">
              <div className="h-40 w-40 rounded-[2rem] border-4 border-blue-50 shadow-inner overflow-hidden mb-8">
                <img src={tempPhotoPreview} className="h-full w-full object-cover" alt="Preview" />
              </div>
              <div className="space-y-3 w-full">
                <button 
                  onClick={handleUploadPhoto} 
                  disabled={uploading}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-center"
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
                  className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all text-center"
                >
                  Batalkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {showPhotoPreview && pegawai.foto && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowPhotoPreview(false)}></div>
          <div className="relative max-w-4xl w-full h-full flex items-center justify-center pointer-events-none p-4 md:p-12">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowPhotoPreview(false); }} 
              className="absolute top-4 right-4 md:top-10 md:right-10 h-12 w-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-xl transition-all active:scale-95 pointer-events-auto"
            >
              <i className="bi bi-x-lg text-xl font-bold"></i>
            </button>
            <div className="bg-white/5 border border-white/10 p-2 md:p-3 rounded-[2rem] md:rounded-[3rem] shadow-2xl pointer-events-auto animate-modalEnter max-h-full">
              <img 
                src={getPhotoUrl(pegawai.foto)} 
                className="max-w-full max-h-[70vh] md:max-h-[80vh] object-contain rounded-2xl md:rounded-[2.5rem] shadow-2xl" 
                alt="Full Profile" 
                referrerPolicy="no-referrer"
              />
              <div className="mt-4 md:mt-6 text-center text-white pb-2">
                <h5 className="font-black tracking-tight text-base md:text-xl">{formatPegawaiName(pegawai.nama)}</h5>
                <p className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.3em] text-white/50 mt-1">NIP. {pegawai.nip}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMPEG Universal Quick Import Modal */}
      <SimpegImportModal
        isOpen={isSimpegImportOpen}
        onClose={() => setIsSimpegImportOpen(false)}
        initialCategory={simpegImportCategory}
        onApply={handleApplySimpegData}
        targetPegawaiName={pegawai?.nama}
        targetPegawaiNip={pegawai?.nip}
      />
    </div>
  );
};

export default ProfilePegawaiPage;
