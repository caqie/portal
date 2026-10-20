import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pegawai, Dossier } from '../types';
import { fetchPegawaiFromSheets, savePegawai, syncTableRemote, fetchDossiersFromSheets, uploadFileToDrive, findPegawaiByNip, parseDateToYYYYMMDD } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { getPhotoUrl, formatDrivePhotoUrl, compressImage } from '../lib/photoUtils';
import { normalizeUnitName, UNIT_KERJA, ORGANISASI_STRUCTURE, PANGKAT_MAP, DEFAULT_LOGO, BANK_LIST, formatPegawaiName, polishGelarDanNama, getJabatanClassification, resolvePegawaiPendidikanDanJurusan, normalizeJenjangLabel } from '../constants';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
import SheetErrorGuideModal from '../components/SheetErrorGuideModal';
import AutocompleteInput from '../components/AutocompleteInput';
import { JENJANG_PENDIDIKAN_LIST, JURUSAN_LIST } from '../educationConstants';
import { StrukturOrganisasiTree } from '../components/StrukturOrganisasiTree';
import { getAtasanLangsung, getAllPegawaiForNode, PopulatedOrganisasiNode } from '../services/strukturOrganisasiService';
// @ts-ignore
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { sanitizeForExcel, sanitizeExcelRows, safeJsonToSheet, safeWriteExcel } from '../lib/excelSanitizer';
import { 
  OFFICIAL_PETA_JABATAN_ABK, 
  buildPetaJabatanAbkSheet, 
  buildFormasiSimpegSheet, 
  downloadOfficialPetaJabatanExcel 
} from '../services/petaJabatanAbkData';
import { getKelasJabatanPermenkumham38 } from '../data/anjabAbkConstants';

const PegawaiPage = () => {
  const navigate = useNavigate();
  const { canEdit, isSuperadmin, logActivity, user, isUserPortalView } = useAuth();

  // Redirect to personal profile if in User Portal View (Portal Mandiri Pegawai)
  useEffect(() => {
    if (isUserPortalView) {
      const cleanNip = (user?.nip || '').trim();
      const targetPath = cleanNip ? `/pegawai/${cleanNip}` : '/pegawai/profile';
      navigate(targetPath, { replace: true });
    }
  }, [isUserPortalView, user?.nip, navigate]);

  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>(() => {
    const cached = localStorage.getItem('portal_pegawai_db');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [dossierList, setDossierList] = useState<Dossier[]>(() => {
    const cached = localStorage.getItem('portal_dossiers_db');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    const hasCache = !!localStorage.getItem('portal_pegawai_db');
    return !hasCache;
  });
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
  const [filterPendidikan, setFilterPendidikan] = useState(sessionStorage.getItem('pegawai_filterPendidikan') || 'Semua Pendidikan');
  const [filterJurusan, setFilterJurusan] = useState(sessionStorage.getItem('pegawai_filterJurusan') || 'Semua Jurusan');
  const [filterKlasifikasi, setFilterKlasifikasi] = useState(sessionStorage.getItem('pegawai_filterKlasifikasi') || 'Semua Klasifikasi');
  const [filterAgama, setFilterAgama] = useState(sessionStorage.getItem('pegawai_filterAgama') || 'Semua Agama');
  const [jurusanSearch, setJurusanSearch] = useState('');
  const [filterSotk, setFilterSotk] = useState<{
    id: string;
    nama: string;
    shortName?: string;
    level: string;
    targetNips: Set<string>;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'struktur'>(() => {
    return (sessionStorage.getItem('pegawai_viewMode') as 'grid' | 'list' | 'struktur') || 'grid';
  });

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
    sessionStorage.setItem('pegawai_filterPendidikan', filterPendidikan);
    sessionStorage.setItem('pegawai_filterJurusan', filterJurusan);
    sessionStorage.setItem('pegawai_filterKlasifikasi', filterKlasifikasi);
    sessionStorage.setItem('pegawai_filterAgama', filterAgama);
    sessionStorage.setItem('pegawai_viewMode', viewMode);
  }, [searchTerm, filterUnit, filterJenis, filterStatus, minGolongan, maxGolongan, minAge, maxAge, filterPendidikan, filterJurusan, filterKlasifikasi, filterAgama, viewMode]);

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

  const [isPendidikanDropdownOpen, setIsPendidikanDropdownOpen] = useState(false);
  const pendidikanDropdownRef = useRef<HTMLDivElement>(null);

  const [isJurusanDropdownOpen, setIsJurusanDropdownOpen] = useState(false);
  const jurusanDropdownRef = useRef<HTMLDivElement>(null);

  const [isKlasifikasiDropdownOpen, setIsKlasifikasiDropdownOpen] = useState(false);
  const klasifikasiDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (jenisDropdownRef.current && !jenisDropdownRef.current.contains(event.target as Node)) {
        setIsJenisDropdownOpen(false);
      }
      if (pendidikanDropdownRef.current && !pendidikanDropdownRef.current.contains(event.target as Node)) {
        setIsPendidikanDropdownOpen(false);
      }
      if (jurusanDropdownRef.current && !jurusanDropdownRef.current.contains(event.target as Node)) {
        setIsJurusanDropdownOpen(false);
      }
      if (klasifikasiDropdownRef.current && !klasifikasiDropdownRef.current.contains(event.target as Node)) {
        setIsKlasifikasiDropdownOpen(false);
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
  
  const [selectedNipsForBulk, setSelectedNipsForBulk] = useState<string[]>([]);
  const [showBulkSummary, setShowBulkSummary] = useState(false);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSheetErrorOpen, setIsSheetErrorOpen] = useState(false);
  const [sheetErrorMsg, setSheetErrorMsg] = useState('');
  const [pegawaiToDelete, setPegawaiToDelete] = useState<Pegawai | null>(null);
  const importExcelInputRef = useRef<HTMLInputElement>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  
  const [duplicateNips, setDuplicateNips] = useState<string[]>([]);
  const [invalidItems, setInvalidItems] = useState<{id: string, nip: string, nama: string}[]>([]);

  // States and helpers for alignment and healing of employee academic degrees (gelar) & majors (jurusan)
  const [isBulkHealModalOpen, setIsBulkHealModalOpen] = useState(false);
  const [healRunning, setHealRunning] = useState(false);
  const [healProgress, setHealProgress] = useState({ current: 0, total: 0 });
  const [healReport, setHealReport] = useState<{ id: string; p: Pegawai; nameBefore: string; nameAfter: string; jurusanBefore: string; jurusanAfter: string; pendidikanBefore: string; pendidikanAfter: string }[]>([]);

  const parseImportDate = (val: any): string => {
    return parseDateToYYYYMMDD(val);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setSyncing(true);
        setImportProgress({ current: 0, total: 0 });
        const currentPegawai = await fetchPegawaiFromSheets();
        const existingPegawaiMap = new Map<string, string>();
        currentPegawai.forEach(p => {
          const cleanNip = (p.nip || '').replace(/\D/g, '');
          if (cleanNip) existingPegawaiMap.set(cleanNip, p.id);
        });
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        const validData = data.filter(row => {
          const nipVal = row.NIP || row.nip || row['NIP Baru'] || row['NIP Baru (18 digit)'] || row['nipbaru'] || row['asnnip'] || row['nip_asn'] || row['asn_nip'];
          return nipVal && String(nipVal).trim() !== '';
        });
        if (validData.length === 0) { alert("Tidak ditemukan data NIP valid."); setSyncing(false); return; }
        setImportProgress({ current: 0, total: validData.length });
        let successCount = 0;
        for (let i = 0; i < validData.length; i++) {
          const row = validData[i];
          const payload: Partial<Pegawai> = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = key.toLowerCase().replace(/[\s_.-]/g, '');
            let val = row[key];
            const parsedVal = (val instanceof Date) ? parseImportDate(val) : String(val !== undefined && val !== null ? val : '').trim();

            if (normalizedKey === 'nip' || normalizedKey === 'nipbaru' || normalizedKey === 'asnnip' || normalizedKey === 'nipasn' || normalizedKey === 'nipbaru18digit') {
              payload.nip = parsedVal.replace(/\D/g, '');
            } else if (normalizedKey === 'nama' || normalizedKey === 'namapegawai' || normalizedKey === 'fullname') {
              payload.nama = parsedVal;
            } else if (normalizedKey === 'jabatan' || normalizedKey === 'namajabatan' || normalizedKey === 'jab' || normalizedKey === 'tmtjabatan') {
              if (normalizedKey === 'tmtjabatan') payload.tmtJabatan = parseImportDate(val);
              else payload.jabatan = parsedVal;
            } else if (normalizedKey === 'unitkerja' || normalizedKey === 'unit_kerja') {
              payload.unitKerja = parsedVal;
            } else if (normalizedKey === 'golruang' || normalizedKey === 'golongan' || normalizedKey === 'pangkatgol') {
              payload.golRuang = parsedVal;
            } else if (normalizedKey === 'jenispegawai' || normalizedKey === 'kategoripeg' || normalizedKey === 'type') {
              payload.jenisPegawai = parsedVal;
            } else if (normalizedKey === 'status' || normalizedKey === 'statuspegawai') {
              const lower = parsedVal.toLowerCase();
              if (lower === 'aktif' || lower === 'active' || lower.startsWith('aktif')) payload.status = 'Aktif';
              else if (lower === 'tidak aktif' || lower === 'non aktif' || lower === 'non-aktif' || lower === 'inactive' || lower.startsWith('tidak')) payload.status = 'Tidak Aktif';
              else if (lower === 'pensiun' || lower === 'retired' || lower.startsWith('pensiun') || lower.startsWith('bup')) payload.status = 'Tidak Aktif';
              else if (lower === 'tugas belajar' || lower === 'tubel' || lower.startsWith('tugas')) payload.status = 'Tugas Belajar';
              else payload.status = parsedVal;
            } else if (normalizedKey === 'gender' || normalizedKey === 'jeniskelamin' || normalizedKey === 'jk' || normalizedKey === 'lp' || normalizedKey === 'genderlp') {
              const g = parsedVal.toUpperCase();
              payload.gender = (g === 'P' || g.startsWith('PEREMPUAN') || g === 'WANITA' || g === 'W') ? 'P' : 'L';
            } else if (normalizedKey === 'tempatlahir' || normalizedKey === 'tmplahir') {
              payload.tempatLahir = parsedVal;
            } else if (normalizedKey === 'tanggallahir' || normalizedKey === 'tgllahir') {
              payload.tanggalLahir = parseImportDate(val);
            } else if (normalizedKey === 'alamat') {
              payload.alamat = parsedVal;
            } else if (normalizedKey === 'eselon') {
              payload.eselon = parsedVal;
            } else if (normalizedKey === 'agama') {
              payload.agama = parsedVal;
            } else if (normalizedKey === 'nohp' || normalizedKey === 'telepon' || normalizedKey === 'wa') {
              payload.noHp = parsedVal;
            } else if (normalizedKey === 'email') {
              payload.email = parsedVal;
            } else if (normalizedKey === 'npwp') {
              payload.npwp = parsedVal;
            } else if (normalizedKey === 'nobpjs' || normalizedKey === 'bpjs') {
              payload.noBpjs = parsedVal;
            } else if (normalizedKey === 'nokariskarsu') {
              payload.noKarisKarsu = parsedVal;
            } else if (normalizedKey === 'notapera') {
              payload.noTAPERA = parsedVal;
            } else if (normalizedKey === 'nokarpeg') {
              payload.noKarpeg = parsedVal;
            } else if (normalizedKey === 'norekeninggaji' || normalizedKey === 'nomorrekeninggaji') {
              payload.noRekeningGaji = parsedVal;
            } else if (normalizedKey === 'namabank' || normalizedKey === 'bank') {
              payload.namaBank = parsedVal;
            } else if (normalizedKey === 'pendidikan' || normalizedKey === 'pend') {
              payload.pendidikan = parsedVal;
            } else if (normalizedKey === 'jurusan') {
              payload.jurusan = parsedVal;
            } else if (normalizedKey === 'tmtpangkat' || normalizedKey === 'tmt_pangkat') {
              payload.tmtPangkat = parseImportDate(val);
            } else if (normalizedKey === 'subbagian' || normalizedKey === 'sub_bagian') {
              payload.subBagian = parsedVal;
            } else if (normalizedKey === 'bagian') {
              payload.bagian = parsedVal;
            } else if (normalizedKey === 'masakerja') {
              payload.masaKerja = parsedVal;
            } else if (normalizedKey === 'statusperkawinan' || normalizedKey === 'statuskawin' || normalizedKey === 'maritalstatus') {
              payload.statusPerkawinan = parsedVal;
            } else if (normalizedKey === 'pangkat') {
              payload.pangkat = parsedVal;
            } else if (normalizedKey === 'tmtcpns') {
              payload.tmtCpns = parseImportDate(val);
            } else if (normalizedKey === 'nik') {
              payload.nik = parsedVal.replace(/\D/g, '');
            } else if (normalizedKey === 'bup') {
              payload.bup = parsedVal;
            }
          });

          if (!payload.jenisPegawai) {
            payload.jenisPegawai = 'PNS';
          }
          if (!payload.status) {
            payload.status = 'Aktif';
          }
          if (!payload.unitKerja) {
            payload.unitKerja = payload.subBagian || 'DJKI';
          }

          if (payload.jabatan) {
            payload.kelasJabatan = getKelasJabatanPermenkumham38(payload.jabatan, payload.eselon, payload.golRuang) || payload.kelasJabatan;
          }

          if (payload.nip) {
            const cleanNip = payload.nip.replace(/\D/g, '');
            const existingId = existingPegawaiMap.get(cleanNip);
            payload.id = existingId || `PEG-${cleanNip}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const ok = await syncTableRemote('PEGAWAI', 'SAVE', payload);
            if (ok) successCount++;
          }
          setImportProgress(prev => ({ ...prev, current: i + 1 }));
        }
        setSuccessMsg(`Berhasil memproses Excel: ${validData.length} baris dibaca, ${successCount} data ASN disimpan/diperbarui.`);
        setShowSuccess(true);
        await loadData(true);
      } catch (err) { alert("Gagal membaca atau memproses data Excel."); }
      finally { setSyncing(false); setImportProgress({ current: 0, total: 0 }); if (importExcelInputRef.current) importExcelInputRef.current.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  const prepareHealReport = () => {
    const report: { id: string; p: Pegawai; nameBefore: string; nameAfter: string; jurusanBefore: string; jurusanAfter: string; pendidikanBefore: string; pendidikanAfter: string }[] = [];
    pegawaiList.forEach(p => {
      const polished = polishGelarDanNama(p.nama);
      const isNameDiff = p.nama !== polished.formattedName;
      // Identify logical missing fields to populate
      const isJurusanDiff = (!p.jurusan || p.jurusan === '-' || p.jurusan.trim() === '') && polished.jurusan;
      const isPendidikanDiff = (!p.pendidikan || p.pendidikan === '-' || p.pendidikan.trim() === '') && polished.pendidikan;
      
      if (isNameDiff || isJurusanDiff || isPendidikanDiff) {
        report.push({
          id: p.id,
          p: p,
          nameBefore: p.nama,
          nameAfter: polished.formattedName,
          jurusanBefore: p.jurusan || '-',
          jurusanAfter: polished.jurusan || '-',
          pendidikanBefore: p.pendidikan || '-',
          pendidikanAfter: polished.pendidikan || '-'
        });
      }
    });
    return report;
  };

  const handleRunBulkHeal = async (recordsToHeal: typeof healReport) => {
    setHealRunning(true);
    setHealProgress({ current: 0, total: recordsToHeal.length });
    
    let successCount = 0;
    for (let i = 0; i < recordsToHeal.length; i++) {
      const item = recordsToHeal[i];
      // Keep everything else, but update nama, and fill jurusan & pendidikan if they were missing
      const updatedPegawai = {
        ...item.p,
        nama: item.nameAfter,
        jurusan: (item.jurusanBefore === '-' || !item.jurusanBefore) ? item.jurusanAfter : item.p.jurusan,
        pendidikan: (item.pendidikanBefore === '-' || !item.pendidikanBefore) ? item.pendidikanAfter : item.p.pendidikan,
        updatedAt: new Date().toISOString()
      };
      
      const ok = await savePegawai(updatedPegawai);
      if (ok) {
        successCount++;
      }
      setHealProgress({ current: i + 1, total: recordsToHeal.length });
    }
    
    setHealRunning(false);
    setIsBulkHealModalOpen(false);
    
    setSuccessMsg(`Berhasil merapikan gelar dan mengisi jurusan untuk ${successCount} pegawai.`);
    logActivity('UPDATE', 'Pegawai', `Bulk perbaikan penulisan gelar & auto-fill jurusan untuk ${successCount} pegawai.`);
    await loadData(true); // reload fresh from sheets
    setShowSuccess(true);
  };

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
    // Load cached data first for instantaneous rendering
    loadData(false).then(() => {
      // Then silently refresh from sheets in background
      loadDataSilently();
    }); 
  }, []);



  const enrichPegawaiRecord = (p: Pegawai): Pegawai => {
    const enriched = { ...p };
    
    // 1. Classification Enrichment
    enriched.klasifikasiJabatan = getJabatanClassification(enriched);
    if (!enriched.jenisJabatan || enriched.jenisJabatan === '-' || enriched.jenisJabatan.trim() === '') {
      enriched.jenisJabatan = enriched.klasifikasiJabatan;
    }

    // 2. Normalize Status & Jenis Pegawai
    const rawStatus = (enriched.status || '').trim();
    const rawJenis = (enriched.jenisPegawai || '').trim();
    const upperRawStatus = rawStatus.toUpperCase();
    if (['PNS', 'CPNS', 'PPPK', 'PPPK PARUH WAKTU', 'PPNPN', 'HONORER'].includes(upperRawStatus)) {
      if (!rawJenis) enriched.jenisPegawai = rawStatus;
      enriched.status = 'Aktif';
    }
    if (!enriched.status || enriched.status === '-') {
      enriched.status = 'Aktif';
    }
    if (!enriched.jenisPegawai || enriched.jenisPegawai === '-') {
      enriched.jenisPegawai = 'PNS';
    }

    // 3. Normalize GolRuang
    if (enriched.golRuang) {
      const matchGol = enriched.golRuang.match(/([I|V|X]+)\s*\/\s*([a-eA-E])/i);
      if (matchGol) {
        enriched.golRuang = `${matchGol[1].toUpperCase()}/${matchGol[2].toLowerCase()}`;
      }
    }
    
    // 4. Identity & Retirement & Age Enrichment
    const birthDateStr = formatDateForInput(enriched.tanggalLahir);
    let birth: Date | null = null;
    if (birthDateStr) {
      const b = new Date(birthDateStr);
      if (!isNaN(b.getTime())) birth = b;
    }
    if (!birth && enriched.nip) {
      const cleanNip = enriched.nip.replace(/\D/g, '');
      if (cleanNip.length >= 8) {
        const yr = parseInt(cleanNip.substring(0, 4));
        const mo = parseInt(cleanNip.substring(4, 6)) - 1;
        const dy = parseInt(cleanNip.substring(6, 8));
        if (yr >= 1940 && yr <= 2025 && mo >= 0 && mo <= 11 && dy >= 1 && dy <= 31) {
          const b = new Date(yr, mo, dy);
          if (!isNaN(b.getTime())) {
            birth = b;
            if (!enriched.tanggalLahir) {
              enriched.tanggalLahir = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
            }
          }
        }
      }
    }

    if (birth) {
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
    }

    // 5. Education & Photo
    const eduResolved = resolvePegawaiPendidikanDanJurusan(enriched);
    if (eduResolved.pendidikan) enriched.pendidikan = eduResolved.pendidikan;
    if (eduResolved.jurusan) enriched.jurusan = eduResolved.jurusan;
    if (enriched.foto) enriched.foto = formatDrivePhotoUrl(enriched.foto);
    return enriched;
  };

  const loadData = async (bypassCache = false) => {
    try {
      const hasCache = !!localStorage.getItem('portal_pegawai_db');
      if (bypassCache || !hasCache) {
        setLoading(true);
      }
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
      
      const enrichedData = pData.map(enrichPegawaiRecord);

      setPegawaiList(enrichedData);
      setDossierList(dData);
      findDuplicatesAndInvalids(enrichedData);
    } catch (e) { 
      console.error("Data loading error:", e); 
      if (bypassCache) {
        setSheetErrorMsg(e instanceof Error ? e.message : "Terjadi kesalahan koneksi. Pastikan Spreadsheet dipublikasikan ke Web (CSV).");
        setIsSheetErrorOpen(true);
      }
    } finally { 
      setLoading(false); 
    }
  };

  const loadDataSilently = async () => {
    try {
      const [pData, dData] = await Promise.all([
        fetchPegawaiFromSheets(true), 
        fetchDossiersFromSheets(true)
      ]);
      
      const enrichedData = pData.map(enrichPegawaiRecord);

      setPegawaiList(enrichedData);
      setDossierList(dData);
      findDuplicatesAndInvalids(enrichedData);
    } catch (e) {
      console.warn("Silent background load failed:", e);
    }
  };

  const formatDateForInput = (dateStr: string | undefined): string => {
    return parseDateToYYYYMMDD(dateStr);
  };

  const handleEditPegawai = (p: Pegawai) => {
    setSelectedPegawai(p);
    const eduResolved = resolvePegawaiPendidikanDanJurusan(p);
    setFormData({
      ...p,
      pendidikan: eduResolved.pendidikan || p.pendidikan,
      jurusan: eduResolved.jurusan || p.jurusan,
      foto: formatDrivePhotoUrl(p.foto),
      tmtPangkat: formatDateForInput(p.tmtPangkat),
      tmtJabatan: formatDateForInput(p.tmtJabatan),
      tmtCpns: formatDateForInput(p.tmtCpns),
      tanggalLahir: formatDateForInput(p.tanggalLahir)
    });
    setIsModalOpen(true);
  };

  const getNormalizedAgama = (a: string): string => {
    const norm = (a || '').trim();
    const lower = norm.toLowerCase().replace(/[\s.-]/g, '');
    if (!lower) return '';
    if (lower === 'islam') return 'Islam';
    if (lower === 'kristen' || lower === 'protestan' || lower === 'kristenprotestan' || lower === 'protestant') return 'Kristen';
    if (lower === 'katolik' || lower === 'kristenkatolik' || lower === 'catholic') return 'Katolik';
    if (lower === 'hindu') return 'Hindu';
    if (lower === 'buddha' || lower === 'budha') return 'Buddha';
    if (lower === 'konghucu' || lower === 'khc') return 'Konghucu';
    return norm.charAt(0).toUpperCase() + norm.slice(1);
  };

  const AGAMA_LIST = useMemo(() => {
    const base = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];
    const found = new Set<string>();
    (pegawaiList || []).forEach(p => {
      if (p.agama) {
        const norm = getNormalizedAgama(p.agama);
        if (norm) {
          found.add(norm);
        }
      }
    });
    const finalSet = new Set<string>();
    const normalized = new Set<string>();
    
    found.forEach(item => {
      const lower = item.toLowerCase();
      if (!normalized.has(lower)) {
        normalized.add(lower);
        finalSet.add(item);
      }
    });
    
    base.forEach(item => {
      const lower = item.toLowerCase();
      if (!normalized.has(lower)) {
        normalized.add(lower);
        finalSet.add(item);
      }
    });
    
    return Array.from(finalSet).sort((a, b) => a.localeCompare(b));
  }, [pegawaiList]);

  const normalizeGolRuang = (val?: string): string => {
    if (!val) return '';
    const match = val.match(/([I|V|X]+)\s*\/\s*([a-eA-E])/i);
    if (match) {
      return `${match[1].toUpperCase()}/${match[2].toLowerCase()}`;
    }
    return val.trim();
  };

  const SORTED_GOLS = useMemo(() => {
    return Object.keys(PANGKAT_MAP).sort((a, b) => {
      const romValues: Record<string, number> = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };
      const rankA = a.split('/')[0];
      const rankB = b.split('/')[0];
      if (rankA !== rankB) return (romValues[rankA] || 0) - (romValues[rankB] || 0);
      return a.localeCompare(b);
    });
  }, []);

  const AVAILABLE_UNIT_LIST = useMemo(() => {
    const list = [...UNIT_KERJA];
    const foundSet = new Set<string>();
    (pegawaiList || []).forEach(p => {
      const norm = normalizeUnitName(p.unitKerja, p.bagian, p.jabatan);
      if (norm) foundSet.add(norm);
    });
    if (foundSet.has('Pimpinan DJKI') && !list.includes('Pimpinan DJKI')) {
      list.unshift('Pimpinan DJKI');
    }
    if (foundSet.has('LAINNYA') && !list.includes('LAINNYA')) {
      list.push('LAINNYA');
    }
    return list;
  }, [pegawaiList]);

  const AVAILABLE_JENIS_LIST = useMemo(() => {
    const defaultList = ['PNS', 'CPNS', 'PPPK', 'PPPK Paruh Waktu'];
    const set = new Set<string>(defaultList);
    (pegawaiList || []).forEach(p => {
      const jp = (p.jenisPegawai || '').trim();
      if (jp && jp !== '-' && !set.has(jp)) {
        set.add(jp);
      }
    });
    return Array.from(set);
  }, [pegawaiList]);

  const AVAILABLE_JURUSAN_LIST = useMemo(() => {
    const set = new Set<string>();
    (pegawaiList || []).forEach(p => {
      const j = (p.jurusan || '').trim();
      if (j && j !== '-' && j.toUpperCase() !== 'LAINNYA') {
        set.add(j);
      }
    });
    JURUSAN_LIST.forEach(j => {
      if (j && j.trim()) set.add(j.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [pegawaiList]);

  const KLASIFIKASI_LIST = useMemo(() => {
    const defaultSet = ['JPT', 'STRUKTURAL', 'FUNGSIONAL', 'PELAKSANA'];
    const found = new Set<string>(defaultSet);
    (pegawaiList || []).forEach(p => {
      const kl = (p.klasifikasiJabatan || '').trim();
      if (kl && kl !== '-') {
        found.add(kl);
      }
    });
    return Array.from(found);
  }, [pegawaiList]);

  const calculateEmployeeAge = (p: Pegawai): number | null => {
    const birthDateStr = formatDateForInput(p.tanggalLahir);
    let birth: Date | null = null;
    if (birthDateStr) {
      const b = new Date(birthDateStr);
      if (!isNaN(b.getTime())) birth = b;
    }
    if (!birth && p.nip) {
      const cleanNip = p.nip.replace(/\D/g, '');
      if (cleanNip.length >= 8) {
        const yr = parseInt(cleanNip.substring(0, 4));
        const mo = parseInt(cleanNip.substring(4, 6)) - 1;
        const dy = parseInt(cleanNip.substring(6, 8));
        if (yr >= 1940 && yr <= 2025 && mo >= 0 && mo <= 11 && dy >= 1 && dy <= 31) {
          const b = new Date(yr, mo, dy);
          if (!isNaN(b.getTime())) birth = b;
        }
      }
    }
    if (birth) {
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    }
    if (p.usia) {
      const match = p.usia.match(/(\d+)\s*th/i);
      if (match) return parseInt(match[1]);
    }
    return null;
  };

  const matchesPendidikan = (pPend: string | undefined, selectedList: string[]): boolean => {
    if (selectedList.length === 0) return true;
    if (!pPend) return false;

    const rawPend = pPend.trim().toLowerCase();
    const normPend = normalizeJenjangLabel(pPend).toLowerCase();

    return selectedList.some(sel => {
      const rawSel = sel.trim().toLowerCase();
      const normSel = normalizeJenjangLabel(sel).toLowerCase();

      if (rawPend === rawSel || normPend === normSel) return true;

      if (normSel === 's-3') {
        return rawPend.includes('s-3') || rawPend.includes('s3') || rawPend.includes('doktor') || rawPend.includes('phd');
      }
      if (normSel === 's-2') {
        return rawPend.includes('s-2') || rawPend.includes('s2') || rawPend.includes('magister') || rawPend.includes('master');
      }
      if (normSel === 's-1') {
        return (rawPend.includes('s-1') || rawPend.includes('s1') || rawPend.includes('sarjana')) && !rawPend.includes('terapan');
      }
      if (normSel === 'profesi') {
        return rawPend.includes('profesi') || rawPend.includes('spesialis') || rawPend.includes('apoteker') || rawPend.includes('dokter');
      }
      if (normSel === 'd-iv') {
        return rawPend.includes('d-iv') || rawPend.includes('d4') || rawPend.includes('d-4') || rawPend.includes('terapan');
      }
      if (normSel === 'd-iii') {
        return rawPend.includes('d-iii') || rawPend.includes('d3') || rawPend.includes('d-3') || rawPend.includes('ahli madya');
      }
      if (normSel === 'd-ii') {
        return rawPend.includes('d-ii') || rawPend.includes('d2') || rawPend.includes('d-2');
      }
      if (normSel === 'd-i') {
        return rawPend.includes('d-i') || rawPend.includes('d1') || rawPend.includes('d-1');
      }
      if (normSel === 'slta') {
        return rawPend.includes('slta') || rawPend.includes('sma') || rawPend.includes('smk') || rawPend.includes('ma ') || rawPend.endsWith('ma');
      }
      if (normSel === 'sltp') {
        return rawPend.includes('sltp') || rawPend.includes('smp') || rawPend.includes('mts');
      }
      if (normSel.includes('sd')) {
        return rawPend.includes('sd');
      }

      return rawPend.includes(rawSel);
    });
  };

  const matchesJurusan = (p: Pegawai, selectedList: string[]): boolean => {
    if (selectedList.length === 0) return true;
    const pJurusan = (p.jurusan || '').trim().toLowerCase();
    const pPendidikan = (p.pendidikan || '').trim().toLowerCase();
    const pNama = (p.nama || '').trim().toLowerCase();

    return selectedList.some(sel => {
      const s = sel.trim().toLowerCase();
      if (!s) return false;

      if (pJurusan && (pJurusan === s || pJurusan.includes(s) || s.includes(pJurusan))) {
        return true;
      }
      if (pPendidikan && pPendidikan.includes(s)) {
        return true;
      }
      if (s.includes('hukum') && (pJurusan.includes('hukum') || pNama.includes('s.h') || pNama.includes('m.h'))) return true;
      if ((s.includes('komputer') || s.includes('informatika')) && (pNama.includes('s.kom') || pNama.includes('m.kom') || pNama.includes('m.t') || pNama.includes('s.t'))) return true;
      if (s.includes('akuntansi') && (pNama.includes('ak.') || pNama.includes('s.ak') || pNama.includes('m.ak'))) return true;
      if (s.includes('ekonomi') && (pNama.includes('s.e') || pNama.includes('m.e') || pNama.includes('m.m'))) return true;

      return false;
    });
  };

  const matchesGolongan = (pGol: string | undefined, minGol: string, maxGol: string, sortedGols: string[]): boolean => {
    if (minGol === 'Semua' && maxGol === 'Semua') return true;
    const currentGol = normalizeGolRuang(pGol);
    const currentIndex = sortedGols.indexOf(currentGol);
    if (currentIndex === -1) return false;

    const minIdx = minGol === 'Semua' ? 0 : sortedGols.indexOf(normalizeGolRuang(minGol));
    const maxIdx = maxGol === 'Semua' ? sortedGols.length - 1 : sortedGols.indexOf(normalizeGolRuang(maxGol));

    const effectiveMin = Math.min(minIdx === -1 ? 0 : minIdx, maxIdx === -1 ? sortedGols.length - 1 : maxIdx);
    const effectiveMax = Math.max(minIdx === -1 ? 0 : minIdx, maxIdx === -1 ? sortedGols.length - 1 : maxIdx);

    return currentIndex >= effectiveMin && currentIndex <= effectiveMax;
  };

  const matchesSearch = (p: Pegawai, term: string): boolean => {
    if (!term) return true;
    const tokens = term.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    const pUnitNorm = normalizeUnitName(p.unitKerja, p.bagian, p.jabatan);
    const searchStr = [
      p.nama,
      p.nip,
      p.nik,
      p.jabatan,
      p.unitKerja,
      p.bagian,
      p.subBagian,
      p.pendidikan,
      p.jurusan,
      p.status,
      p.alamat,
      p.golRuang,
      p.pangkat,
      pUnitNorm
    ].map(v => String(v || '').toLowerCase()).join(' ');

    return tokens.every(token => searchStr.includes(token));
  };

  const filteredPegawai = useMemo(() => {
    const term = searchTerm.trim();
    const rawMin = minAge ? parseInt(minAge) : null;
    const rawMax = maxAge ? parseInt(maxAge) : null;
    const min = rawMin !== null && rawMax !== null ? Math.min(rawMin, rawMax) : (rawMin !== null ? rawMin : 0);
    const max = rawMin !== null && rawMax !== null ? Math.max(rawMin, rawMax) : (rawMax !== null ? rawMax : 200);

    return (pegawaiList || []).filter(p => {
      const match = matchesSearch(p, term);

      const pNipClean = (p.nip || p.id || '').replace(/\D/g, '');
      const sotkMatch = !filterSotk || filterSotk.targetNips.has(pNipClean);

      const pUnitNorm = normalizeUnitName(p.unitKerja, p.bagian, p.jabatan);
      const filterUnitNorm = filterUnit === 'Semua Unit' ? 'Semua Unit' : normalizeUnitName(filterUnit);
      const isSekretariatFilter = filterUnit.toLowerCase().includes('sekretariat') || filterUnit.toLowerCase() === 'setditjen';
      const unitMatch = filterUnit === 'Semua Unit' || 
        pUnitNorm === filterUnitNorm || 
        (isSekretariatFilter && pUnitNorm === UNIT_KERJA[0]);

      const selectedSubJenis = filterJenis === 'Semua Jenis' || !filterJenis ? [] : filterJenis.split(',').filter(Boolean);
      const pJenis = (p.jenisPegawai || 'PNS').trim().toLowerCase();
      const jenisMatch = selectedSubJenis.length === 0 || selectedSubJenis.some(s => {
        const sLower = s.toLowerCase();
        return pJenis === sLower || (sLower === 'pppk' && pJenis.startsWith('pppk') && !pJenis.includes('paruh waktu'));
      });

      const pStatus = (p.status || 'Aktif').trim().toLowerCase();
      const filterStatusLower = filterStatus.trim().toLowerCase();
      const statusMatch = filterStatus === 'Semua Status' || (
        filterStatusLower === 'aktif' ? (pStatus === 'aktif' || pStatus === 'pns' || pStatus === 'cpns' || pStatus === 'pppk') :
        pStatus === filterStatusLower
      );
      
      const selectedPendidikans = filterPendidikan === 'Semua Pendidikan' || !filterPendidikan ? [] : filterPendidikan.split(',').filter(Boolean);
      const pendidikanMatch = matchesPendidikan(p.pendidikan, selectedPendidikans);

      const selectedJurusans = filterJurusan === 'Semua Jurusan' || !filterJurusan ? [] : filterJurusan.split(',').filter(Boolean);
      const jurusanMatch = matchesJurusan(p, selectedJurusans);

      const selectedKlasifikasis = filterKlasifikasi === 'Semua Klasifikasi' || !filterKlasifikasi ? [] : filterKlasifikasi.split(',').filter(Boolean);
      const klasifikasiMatch = selectedKlasifikasis.length === 0 || selectedKlasifikasis.map(x => x.toLowerCase()).includes((p.klasifikasiJabatan || '').trim().toLowerCase());

      const pAgamaNorm = getNormalizedAgama(p.agama || '');
      const filterAgamaNorm = getNormalizedAgama(filterAgama);
      const agamaMatch = filterAgama === 'Semua Agama' || pAgamaNorm.toLowerCase() === filterAgamaNorm.toLowerCase();

      const golonganMatch = matchesGolongan(p.golRuang, minGolongan, maxGolongan, SORTED_GOLS);

      let ageMatch = true;
      if (minAge || maxAge) {
        const age = calculateEmployeeAge(p);
        if (age !== null) {
          ageMatch = age >= min && age <= max;
        } else {
          ageMatch = false;
        }
      }

      return match && sotkMatch && unitMatch && jenisMatch && statusMatch && golonganMatch && pendidikanMatch && jurusanMatch && ageMatch && klasifikasiMatch && agamaMatch;
    });
  }, [pegawaiList, searchTerm, filterSotk, filterUnit, filterJenis, filterStatus, minGolongan, maxGolongan, minAge, maxAge, filterPendidikan, filterJurusan, filterKlasifikasi, filterAgama, SORTED_GOLS]);

  const filteredForCounts = useMemo(() => {
    const term = searchTerm.trim();
    const rawMin = minAge ? parseInt(minAge) : null;
    const rawMax = maxAge ? parseInt(maxAge) : null;
    const min = rawMin !== null && rawMax !== null ? Math.min(rawMin, rawMax) : (rawMin !== null ? rawMin : 0);
    const max = rawMin !== null && rawMax !== null ? Math.max(rawMin, rawMax) : (rawMax !== null ? rawMax : 200);

    return (pegawaiList || []).filter(p => {
      const match = matchesSearch(p, term);

      const pNipClean = (p.nip || p.id || '').replace(/\D/g, '');
      const sotkMatch = !filterSotk || filterSotk.targetNips.has(pNipClean);

      const pUnitNorm = normalizeUnitName(p.unitKerja, p.bagian, p.jabatan);
      const filterUnitNorm = filterUnit === 'Semua Unit' ? 'Semua Unit' : normalizeUnitName(filterUnit);
      const isSekretariatFilter = filterUnit.toLowerCase().includes('sekretariat') || filterUnit.toLowerCase() === 'setditjen';
      const unitMatch = filterUnit === 'Semua Unit' || 
        pUnitNorm === filterUnitNorm || 
        (isSekretariatFilter && pUnitNorm === UNIT_KERJA[0]);

      const selectedSubJenis = filterJenis === 'Semua Jenis' || !filterJenis ? [] : filterJenis.split(',').filter(Boolean);
      const pJenis = (p.jenisPegawai || 'PNS').trim().toLowerCase();
      const jenisMatch = selectedSubJenis.length === 0 || selectedSubJenis.some(s => {
        const sLower = s.toLowerCase();
        return pJenis === sLower || (sLower === 'pppk' && pJenis.startsWith('pppk') && !pJenis.includes('paruh waktu'));
      });
      
      const selectedPendidikans = filterPendidikan === 'Semua Pendidikan' || !filterPendidikan ? [] : filterPendidikan.split(',').filter(Boolean);
      const pendidikanMatch = matchesPendidikan(p.pendidikan, selectedPendidikans);

      const selectedJurusans = filterJurusan === 'Semua Jurusan' || !filterJurusan ? [] : filterJurusan.split(',').filter(Boolean);
      const jurusanMatch = matchesJurusan(p, selectedJurusans);

      const selectedKlasifikasis = filterKlasifikasi === 'Semua Klasifikasi' || !filterKlasifikasi ? [] : filterKlasifikasi.split(',').filter(Boolean);
      const klasifikasiMatch = selectedKlasifikasis.length === 0 || selectedKlasifikasis.map(x => x.toLowerCase()).includes((p.klasifikasiJabatan || '').trim().toLowerCase());

      const pAgamaNorm = getNormalizedAgama(p.agama || '');
      const filterAgamaNorm = getNormalizedAgama(filterAgama);
      const agamaMatch = filterAgama === 'Semua Agama' || pAgamaNorm.toLowerCase() === filterAgamaNorm.toLowerCase();

      const golonganMatch = matchesGolongan(p.golRuang, minGolongan, maxGolongan, SORTED_GOLS);

      let ageMatch = true;
      if (minAge || maxAge) {
        const age = calculateEmployeeAge(p);
        if (age !== null) {
          ageMatch = age >= min && age <= max;
        } else {
          ageMatch = false;
        }
      }
      return match && sotkMatch && unitMatch && jenisMatch && golonganMatch && ageMatch && pendidikanMatch && jurusanMatch && klasifikasiMatch && agamaMatch;
    });
  }, [pegawaiList, searchTerm, filterSotk, filterUnit, filterJenis, minGolongan, maxGolongan, minAge, maxAge, filterPendidikan, filterJurusan, filterKlasifikasi, filterAgama, SORTED_GOLS]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Aktif': 0, 'Tidak Aktif': 0, 'Pensiun': 0, 'Tugas Belajar': 0
    };
    (filteredForCounts || []).forEach(p => {
      const s = (p.status || 'Aktif').trim().toLowerCase();
      if (s === 'aktif' || s === 'pns' || s === 'cpns' || s === 'pppk') {
        counts['Aktif']++;
      } else if (s.includes('tidak aktif') || s.includes('non aktif') || s.includes('non-aktif') || s.includes('inactive')) {
        counts['Tidak Aktif']++;
      } else if (s.includes('pensiun') || s.includes('bup')) {
        counts['Pensiun']++;
      } else if (s.includes('tugas belajar') || s.includes('tubel') || s.startsWith('tugas')) {
        counts['Tugas Belajar']++;
      } else {
        counts['Aktif']++;
      }
    });
    return counts;
  }, [filteredForCounts]);

  const filteredDossiers = useMemo(() => {
    if (!selectedPegawai) return [];
    return dossierList.filter(d => d.nip === selectedPegawai.nip);
  }, [dossierList, selectedPegawai]);

  // Helper Klasifikasi dan Urutan Peta Jabatan sesuai Standar Hierarki Kepegawaian DJKI / BKN dan Permenkumham 38/2025
  const getPetaJabatanHierarchy = (p: Pegawai) => {
    const jab = (p.jabatan || '').toUpperCase().trim();
    const eselon = (p.eselon || '').toUpperCase().trim();
    const officialClass = getKelasJabatanPermenkumham38(p.jabatan || '', p.eselon, p.golRuang);

    // Tier 1: JPT Madya (Dirjen)
    if ((jab.includes('DIREKTUR JENDERAL') && !jab.includes('SEKRETARIS') && !jab.includes('DIREKTORAT')) || eselon === 'I.A' || eselon === 'I.B') {
      return { tier: 1, kategori: 'JPT Madya (Eselon I)', eselonTier: 'Eselon I', kelasJabatan: officialClass || '17', levelCode: 'JPT_MADYA' };
    }
    // Tier 2: JPT Pratama (Eselon II - Sesditjen / Direktur)
    if (jab.includes('SEKRETARIS DIREKTORAT') || jab.includes('SEKRETARIS DITJEN') || (jab.startsWith('DIREKTUR') && !jab.includes('SUBDIREKTORAT')) || eselon === 'II.A' || eselon === 'II.B') {
      return { tier: 2, kategori: 'JPT Pratama (Eselon II)', eselonTier: 'Eselon II', kelasJabatan: officialClass || (jab.includes('SEKRETARIS') ? '16' : '15'), levelCode: 'JPT_PRATAMA' };
    }
    // Tier 3: Jabatan Administrator (Eselon III - Kabag, Koordinator, Kasubdit)
    if (jab.includes('KEPALA BAGIAN') || jab.includes('KABAG') || jab.includes('KOORDINATOR') || jab.includes('KEPALA SUBDIREKTORAT') || jab.includes('KASUBDIT') || eselon === 'III.A' || eselon === 'III.B') {
      return { tier: 3, kategori: 'Jabatan Administrator (Eselon III)', eselonTier: 'Eselon III', kelasJabatan: officialClass || '13', levelCode: 'ADMINISTRATOR' };
    }
    // Tier 4: Jabatan Pengawas (Eselon IV - Subkoordinator, Kasubbag, Kasi)
    if (jab.includes('SUBKOORDINATOR') || jab.includes('SUB KOORDINATOR') || jab.includes('KEPALA SUBBAGIAN') || jab.includes('KASUBBAG') || jab.includes('KEPALA SEKSI') || jab.includes('KASI') || eselon === 'IV.A' || eselon === 'IV.B') {
      return { tier: 4, kategori: 'Jabatan Pengawas (Eselon IV)', eselonTier: 'Eselon IV', kelasJabatan: officialClass || '10', levelCode: 'PENGAWAS' };
    }
    // Tier 5: JF Ahli Utama
    if (jab.includes('UTAMA') && (jab.includes('AHLI UTAMA') || jab.includes('PEMERIKSA') || jab.includes('ANALIS'))) {
      return { tier: 5, kategori: 'JF Ahli Utama', eselonTier: 'Fungsional Keahlian', kelasJabatan: officialClass || '13', levelCode: 'JF_UTAMA' };
    }
    // Tier 6: JF Ahli Madya
    if (jab.includes('MADYA') || jab.includes('AHLI MADYA')) {
      return { tier: 6, kategori: 'JF Ahli Madya', eselonTier: 'Fungsional Keahlian', kelasJabatan: officialClass || '11', levelCode: 'JF_MADYA' };
    }
    // Tier 7: JF Ahli Muda
    if (jab.includes('MUDA') || jab.includes('AHLI MUDA')) {
      return { tier: 7, kategori: 'JF Ahli Muda', eselonTier: 'Fungsional Keahlian', kelasJabatan: officialClass || '9', levelCode: 'JF_MUDA' };
    }
    // Tier 8: JF Ahli Pertama
    if (jab.includes('PERTAMA') || jab.includes('AHLI PERTAMA')) {
      return { tier: 8, kategori: 'JF Ahli Pertama', eselonTier: 'Fungsional Keahlian', kelasJabatan: officialClass || '8', levelCode: 'JF_PERTAMA' };
    }
    // Tier 9: JF Keterampilan (Penyelia, Mahir, Terampil, Pemula)
    if (jab.includes('PENYELIA') || jab.includes('MAHIR') || jab.includes('PELAKSANA LANJUTAN') || jab.includes('TERAMPIL') || jab.includes('PEMULA')) {
      return { tier: 9, kategori: 'JF Keterampilan', eselonTier: 'Fungsional Keterampilan', kelasJabatan: officialClass || '7', levelCode: 'JF_KETERAMPILAN' };
    }
    // Tier 10: Pelaksana (JFU)
    return { tier: 10, kategori: 'Jabatan Pelaksana (JFU)', eselonTier: 'Pelaksana', kelasJabatan: officialClass || (p.kelasJabatan && !p.kelasJabatan.includes('-') ? p.kelasJabatan : '7'), levelCode: 'PELAKSANA' };
  };

  const GOLONGAN_PRIORITY: Record<string, number> = {
    'IV/E': 140, 'IV/D': 130, 'IV/C': 120, 'IV/B': 110, 'IV/A': 100,
    'III/D': 80, 'III/C': 70, 'III/B': 60, 'III/A': 50,
    'II/D': 40, 'II/C': 35, 'II/B': 30, 'II/A': 25,
    'I/D': 20, 'I/C': 15, 'I/B': 10, 'I/A': 5
  };

  const UNIT_ORDER: Record<string, number> = {
    'Sekretariat Direktorat Jenderal Kekayaan Intelektual': 1,
    'Direktorat Hak Cipta dan Desain Industri': 2,
    'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang': 3,
    'Direktorat Merek dan Indikasi Geografis': 4,
    'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi': 5,
    'Direktorat Teknologi Informasi Kekayaan Intelektual': 6,
    'Direktorat Penegakan Hukum': 7
  };

  // Helper untuk memetakan posisi struktural pegawai per unit:
  // Direktur -> Eselon III -> Eselon IV -> JF & Pelaksana di bawahnya
  const resolvePegawaiStructure = (p: Pegawai) => {
    const normUnit = normalizeUnitName(p.unitKerja, p.bagian, p.jabatan);
    const unitOrder = UNIT_ORDER[normUnit] || 99;
    const jabUpper = (p.jabatan || '').toUpperCase().trim();
    const eselonUpper = (p.eselon || '').toUpperCase().trim();
    const hier = getPetaJabatanHierarchy(p);

    const unitBagians = Object.keys(ORGANISASI_STRUCTURE[normUnit] || {});

    // 1. Cek apakah Pimpinan Unit (Direktur / Sesditjen / Dirjen - Eselon II)
    const isUnitLeader = hier.tier === 1 || hier.tier === 2 || 
      (jabUpper.startsWith('DIREKTUR') && !jabUpper.includes('SUBDIREKTORAT')) || 
      jabUpper.includes('SEKRETARIS DIREKTORAT') || 
      jabUpper.includes('SEKRETARIS DITJEN') ||
      eselonUpper === 'I.A' || eselonUpper === 'I.B' || eselonUpper === 'II.A' || eselonUpper === 'II.B';

    if (isUnitLeader) {
      return {
        unitKerja: normUnit,
        unitOrder,
        bagian: 'Pimpinan Unit',
        bagianOrder: -1,
        isUnitLeader: true,
        isBagianLeader: false,
        subBagian: '',
        subBagianOrder: -1,
        isSubBagianLeader: false,
        treeTier: 1, // 1: Pimpinan Unit
        tingkatStr: '1. Pimpinan Unit (Eselon II)',
        kedudukanHierarki: jabUpper.includes('DIREKTUR JENDERAL') ? '[ESELON I] Direktur Jenderal' : (jabUpper.includes('SEKRETARIS') ? '[ESELON II] Sekretaris Direktorat Jenderal' : '[ESELON II] Direktur'),
        atasanLangsung: jabUpper.includes('DIREKTUR JENDERAL') ? 'Menteri Hukum dan HAM' : 'Direktur Jenderal Kekayaan Intelektual',
        hier
      };
    }

    // 2. Cek apakah Staf Khusus / Sekretaris Pimpinan Unit
    const isDirectLeaderStaff = jabUpper.includes('SEKRETARIS PIMPINAN') || jabUpper.includes('STAF DIREKTUR') || jabUpper.includes('SESPIM');
    if (isDirectLeaderStaff) {
      return {
        unitKerja: normUnit,
        unitOrder,
        bagian: 'Pimpinan Unit',
        bagianOrder: -1,
        isUnitLeader: false,
        isBagianLeader: false,
        subBagian: 'Sekretariat Pimpinan',
        subBagianOrder: 0,
        isSubBagianLeader: false,
        treeTier: 2, // 2: Staf Langsung Pimpinan Unit
        tingkatStr: '1. Staf Pimpinan Unit',
        kedudukanHierarki: '[STAF PIMPINAN] Sekretaris / Ajudan Pimpinan',
        atasanLangsung: normUnit.includes('Sekretariat') ? 'Sekretaris Direktorat Jenderal' : 'Direktur',
        hier
      };
    }

    // 3. Tentukan Bagian / Subdirektorat (Eselon III)
    let assignedBagian = '';
    if (p.bagian) {
      const match = unitBagians.find(b => b.toLowerCase() === p.bagian!.toLowerCase() || b.toLowerCase().includes(p.bagian!.toLowerCase()) || p.bagian!.toLowerCase().includes(b.toLowerCase()));
      if (match) assignedBagian = match;
    }
    if (!assignedBagian && p.subBagian) {
      const match = unitBagians.find(b => b.toLowerCase().includes(p.subBagian!.toLowerCase()) || p.subBagian!.toLowerCase().includes(b.toLowerCase()));
      if (match) assignedBagian = match;
    }
    if (!assignedBagian) {
      if (normUnit.includes('Sekretariat')) {
        if (jabUpper.includes('MUTASI') || jabUpper.includes('KEPEGAWAIAN') || jabUpper.includes('SDM') || jabUpper.includes('DISIPLIN')) assignedBagian = 'Bagian Kepegawaian';
        else if (jabUpper.includes('KEUANGAN') || jabUpper.includes('ANGGARAN') || jabUpper.includes('PERBENDAHARAAN') || jabUpper.includes('AKUNTANSI')) assignedBagian = 'Bagian Keuangan';
        else if (jabUpper.includes('PROGRAM') || jabUpper.includes('PELAPORAN') || jabUpper.includes('PERENCANAAN')) assignedBagian = 'Bagian Program dan Pelaporan';
        else assignedBagian = 'Bagian Umum';
      } else if (normUnit.includes('Cipta') || normUnit.includes('Desain Industri')) {
        if (jabUpper.includes('PERMOHONAN') || jabUpper.includes('PUBLIKASI')) assignedBagian = 'Subdirektorat Permohonan dan Publikasi';
        else if (jabUpper.includes('PELAYANAN HUKUM') || jabUpper.includes('LMK') || jabUpper.includes('LEMBAGA MANAJEMEN')) assignedBagian = 'Subdirektorat Pelayanan Hukum dan Lembaga Manajemen Kolektif';
        else if (jabUpper.includes('DESAIN INDUSTRI')) assignedBagian = 'Subdirektorat Desain Industri';
        else if (jabUpper.includes('TATA USAHA')) assignedBagian = 'Bagian Tata Usaha';
        else assignedBagian = 'Subdirektorat Hak Cipta';
      } else if (normUnit.includes('Paten') || normUnit.includes('DTLST')) {
        if (jabUpper.includes('PERMOHONAN') || jabUpper.includes('PUBLIKASI')) assignedBagian = 'Subdirektorat Permohonan dan Publikasi Paten';
        else if (jabUpper.includes('PEMERIKSAAN PATEN II') || jabUpper.includes('PATEN II')) assignedBagian = 'Subdirektorat Pemeriksaan Paten II';
        else if (jabUpper.includes('PELAYANAN HUKUM') || jabUpper.includes('ADMINISTRASI')) assignedBagian = 'Subdirektorat Administrasi dan Pelayanan Hukum';
        else if (jabUpper.includes('TATA USAHA')) assignedBagian = 'Bagian Tata Usaha';
        else assignedBagian = 'Subdirektorat Pemeriksaan Paten I';
      } else if (normUnit.includes('Merek') || normUnit.includes('Indikasi Geografis')) {
        if (jabUpper.includes('PERMOHONAN') || jabUpper.includes('PUBLIKASI')) assignedBagian = 'Subdirektorat Permohonan dan Publikasi Merek';
        else if (jabUpper.includes('INDIKASI GEOGRAFIS')) assignedBagian = 'Subdirektorat Indikasi Geografis';
        else if (jabUpper.includes('PELAYANAN HUKUM') || jabUpper.includes('ADMINISTRASI')) assignedBagian = 'Subdirektorat Administrasi dan Pelayanan Hukum';
        else if (jabUpper.includes('TATA USAHA')) assignedBagian = 'Bagian Tata Usaha';
        else assignedBagian = 'Subdirektorat Pemeriksaan Merek';
      } else if (normUnit.includes('Sama') || normUnit.includes('Edukasi')) {
        if (jabUpper.includes('LUAR NEGERI') || jabUpper.includes('BILATERAL')) assignedBagian = 'Subdirektorat Kerja Sama Luar Negeri';
        else if (jabUpper.includes('DALAM NEGERI')) assignedBagian = 'Subdirektorat Kerja Sama Dalam Negeri';
        else if (jabUpper.includes('EDUKASI')) assignedBagian = 'Subdirektorat Edukasi';
        else if (jabUpper.includes('TATA USAHA')) assignedBagian = 'Bagian Tata Usaha';
        else assignedBagian = 'Subdirektorat Pemberdayaan KI';
      } else if (normUnit.includes('Teknologi Informasi') || normUnit.includes('TI')) {
        if (jabUpper.includes('INFRASTRUKTUR') || jabUpper.includes('TIK') || jabUpper.includes('JARINGAN')) assignedBagian = 'Subdirektorat Infrastruktur TIK';
        else if (jabUpper.includes('DATA') || jabUpper.includes('LAYANAN INFORMASI')) assignedBagian = 'Subdirektorat Manajemen Data dan Informasi';
        else if (jabUpper.includes('TATA USAHA')) assignedBagian = 'Bagian Tata Usaha';
        else assignedBagian = 'Subdirektorat Pengembangan Sistem Informasi';
      } else if (normUnit.includes('Penegakan Hukum') || normUnit.includes('Gakkum')) {
        if (jabUpper.includes('PENYIDIKAN') || jabUpper.includes('SIDIK') || jabUpper.includes('PPNS')) assignedBagian = 'Subdirektorat Penyidikan';
        else if (jabUpper.includes('PEMANTAUAN') || jabUpper.includes('PENGAWASAN')) assignedBagian = 'Subdirektorat Pemantauan dan Pengawasan';
        else if (jabUpper.includes('TATA USAHA')) assignedBagian = 'Bagian Tata Usaha';
        else assignedBagian = 'Subdirektorat Pencegahan dan Penyelesaian Sengketa';
      }
    }
    if (!assignedBagian) assignedBagian = unitBagians[0] || 'Bagian Tata Usaha';

    const bagianOrder = unitBagians.indexOf(assignedBagian) >= 0 ? unitBagians.indexOf(assignedBagian) : 99;
    const availableSubs = ORGANISASI_STRUCTURE[normUnit]?.[assignedBagian] || [];

    // 4. Cek apakah Kepala Bagian / Koordinator / Kasubdit (Eselon III)
    const isBagianLeader = hier.tier === 3 || 
      jabUpper.includes('KEPALA BAGIAN') || 
      jabUpper.includes('KABAG') || 
      jabUpper.includes('KOORDINATOR') || 
      jabUpper.includes('KEPALA SUBDIREKTORAT') || 
      jabUpper.includes('KASUBDIT') ||
      eselonUpper === 'III.A' || eselonUpper === 'III.B';

    if (isBagianLeader) {
      return {
        unitKerja: normUnit,
        unitOrder,
        bagian: assignedBagian,
        bagianOrder,
        isUnitLeader: false,
        isBagianLeader: true,
        subBagian: '',
        subBagianOrder: -1,
        isSubBagianLeader: false,
        treeTier: 3, // 3: Kepala Bagian / Eselon III
        tingkatStr: '2. Administrator (Eselon III)',
        kedudukanHierarki: assignedBagian.startsWith('Subdirektorat') ? `[ESELON III] Kepala ${assignedBagian}` : `[ESELON III] Kepala ${assignedBagian}`,
        atasanLangsung: normUnit.includes('Sekretariat') ? 'Sekretaris Direktorat Jenderal' : 'Direktur',
        hier
      };
    }

    // 5. Tentukan Subbagian / Seksi (Eselon IV)
    let assignedSubBagian = '';
    if (p.subBagian) {
      const match = availableSubs.find(s => s.toLowerCase() === p.subBagian!.toLowerCase() || s.toLowerCase().includes(p.subBagian!.toLowerCase()) || p.subBagian!.toLowerCase().includes(s.toLowerCase()));
      if (match) assignedSubBagian = match;
    }
    if (!assignedSubBagian) {
      const match = availableSubs.find(s => jabUpper.includes(s.toUpperCase()));
      if (match) assignedSubBagian = match;
    }

    // Cek apakah JF Ahli Madya / Utama yang berada langsung di bawah Bagian / Subdirektorat
    const isDirectBagianJF = (hier.tier === 5 || hier.tier === 6) && !p.subBagian;
    if (isDirectBagianJF && !assignedSubBagian) {
      return {
        unitKerja: normUnit,
        unitOrder,
        bagian: assignedBagian,
        bagianOrder,
        isUnitLeader: false,
        isBagianLeader: false,
        subBagian: 'Kelompok Jabatan Fungsional',
        subBagianOrder: 98,
        isSubBagianLeader: false,
        treeTier: 4, // 4: JF Langsung di bawah Eselon III
        tingkatStr: '2.1. JF di bawah Eselon III',
        kedudukanHierarki: `[DI BAWAH ESELON III] ${hier.kategori}`,
        atasanLangsung: `Kepala ${assignedBagian}`,
        hier
      };
    }

    if (!assignedSubBagian) {
      assignedSubBagian = availableSubs[0] || 'Subbagian Tata Usaha';
    }
    const subBagianOrder = availableSubs.indexOf(assignedSubBagian) >= 0 ? availableSubs.indexOf(assignedSubBagian) : 99;

    // 6. Cek apakah Kepala Subbagian / Kasi / Subkoordinator (Eselon IV)
    const isSubBagianLeader = hier.tier === 4 ||
      jabUpper.includes('SUBKOORDINATOR') ||
      jabUpper.includes('SUB KOORDINATOR') ||
      jabUpper.includes('KEPALA SUBBAGIAN') ||
      jabUpper.includes('KASUBBAG') ||
      jabUpper.includes('KEPALA SEKSI') ||
      jabUpper.includes('KASI') ||
      eselonUpper === 'IV.A' || eselonUpper === 'IV.B';

    if (isSubBagianLeader) {
      return {
        unitKerja: normUnit,
        unitOrder,
        bagian: assignedBagian,
        bagianOrder,
        isUnitLeader: false,
        isBagianLeader: false,
        subBagian: assignedSubBagian,
        subBagianOrder,
        isSubBagianLeader: true,
        treeTier: 6, // 6: Kepala Subbagian / Kasi (Eselon IV)
        tingkatStr: '3. Pengawas (Eselon IV)',
        kedudukanHierarki: assignedSubBagian.startsWith('Seksi') ? `[ESELON IV] Kepala ${assignedSubBagian}` : `[ESELON IV] Kepala ${assignedSubBagian}`,
        atasanLangsung: `Kepala ${assignedBagian}`,
        hier
      };
    }

    // 7. Pegawai di bawah Eselon IV: Jabatan Fungsional (JF)
    const isFungsional = hier.tier >= 5 && hier.tier <= 9;
    if (isFungsional) {
      return {
        unitKerja: normUnit,
        unitOrder,
        bagian: assignedBagian,
        bagianOrder,
        isUnitLeader: false,
        isBagianLeader: false,
        subBagian: assignedSubBagian,
        subBagianOrder,
        isSubBagianLeader: false,
        treeTier: 7, // 7: JF di bawah Eselon IV
        tingkatStr: '3.1. JF di bawah Eselon IV',
        kedudukanHierarki: `[DI BAWAH ESELON IV] ${hier.kategori}`,
        atasanLangsung: `Kepala / Subkoordinator ${assignedSubBagian}`,
        hier
      };
    }

    // 8. Pegawai di bawah Eselon IV: Pelaksana / JFU
    return {
      unitKerja: normUnit,
      unitOrder,
      bagian: assignedBagian,
      bagianOrder,
      isUnitLeader: false,
      isBagianLeader: false,
      subBagian: assignedSubBagian,
      subBagianOrder,
      isSubBagianLeader: false,
      treeTier: 8, // 8: Pelaksana di bawah Eselon IV
      tingkatStr: '3.2. Pelaksana di bawah Eselon IV',
      kedudukanHierarki: '[DI BAWAH ESELON IV] Jabatan Pelaksana (JFU)',
      atasanLangsung: `Kepala / Subkoordinator ${assignedSubBagian}`,
      hier
    };
  };

  // Fungsi pengurutan utama hierarki struktur unit:
  // Unit -> Direktur -> Eselon III -> Eselon IV -> JF & Pelaksana di bawahnya
  const sortPegawaiByUnitStructureHierarchy = (list: Pegawai[], groupByUnit = true): { pegawai: Pegawai; struct: ReturnType<typeof resolvePegawaiStructure> }[] => {
    const mapped = list.map(p => ({
      pegawai: p,
      struct: resolvePegawaiStructure(p)
    }));

    return mapped.sort((a, b) => {
      // 1. Urutkan per Unit Kerja (Sekretariat s.d. Dit Penegakan Hukum)
      if (groupByUnit && a.struct.unitOrder !== b.struct.unitOrder) {
        return a.struct.unitOrder - b.struct.unitOrder;
      }

      // 2. Di dalam Unit: Urutkan Bagian / Subdirektorat (Pimpinan Unit bagianOrder = -1 paling atas)
      if (a.struct.bagianOrder !== b.struct.bagianOrder) {
        return a.struct.bagianOrder - b.struct.bagianOrder;
      }

      // 3. Di dalam Bagian: Urutkan Subbagian / Seksi
      if (a.struct.subBagianOrder !== b.struct.subBagianOrder) {
        // Jika salah satunya Kepala Bagian (treeTier 3), posisikan di atas subbagian
        if (a.struct.treeTier === 3) return -1;
        if (b.struct.treeTier === 3) return 1;
        return a.struct.subBagianOrder - b.struct.subBagianOrder;
      }

      // 4. Di dalam Subbagian / Seksi: Urutkan Tree Tier (Kepala Seksi/Eselon IV -> JF -> Pelaksana)
      if (a.struct.treeTier !== b.struct.treeTier) {
        return a.struct.treeTier - b.struct.treeTier;
      }

      // 5. Di dalam grup JF/Pelaksana yang sama: Urutkan jenjang JF (Utama -> Madya -> Muda -> Pertama -> Keterampilan)
      if (a.struct.hier.tier !== b.struct.hier.tier) {
        return a.struct.hier.tier - b.struct.hier.tier;
      }

      // 6. Urutkan Golongan Tertinggi (IV/e s.d. I/a)
      const golA = GOLONGAN_PRIORITY[(a.pegawai.golRuang || '').toUpperCase()] || 0;
      const golB = GOLONGAN_PRIORITY[(b.pegawai.golRuang || '').toUpperCase()] || 0;
      if (golA !== golB) return golB - golA;

      // 7. Senioritas TMT Pangkat tertua duluan
      if (a.pegawai.tmtPangkat && b.pegawai.tmtPangkat) {
        const cmp = String(a.pegawai.tmtPangkat).localeCompare(String(b.pegawai.tmtPangkat));
        if (cmp !== 0) return cmp;
      }

      // 8. Urutan Nama Alfabetis
      return (a.pegawai.nama || '').localeCompare(b.pegawai.nama || '');
    });
  };

  // Helper memetakan nama jabatan yang selalu terisi jelas, baku, dan representatif
  const resolveProperJabatan = (p: Pegawai, s: any): string => {
    const raw = (p.jabatan || '').trim();
    if (raw && raw !== '-' && raw.toLowerCase() !== 'null' && raw.toLowerCase() !== 'undefined' && raw.toLowerCase() !== 'pelaksana') {
      return raw;
    }
    if (s?.isUnitLeader) {
      return (s.kedudukanHierarki || '').replace(/^\[.*?\]\s*/, '') || (s.unitKerja?.includes('Sekretariat') ? 'Sekretaris Direktorat Jenderal' : 'Direktur');
    }
    if (s?.isBagianLeader) {
      return s.bagian ? `Kepala ${s.bagian}` : 'Kepala Bagian / Koordinator';
    }
    if (s?.isSubBagianLeader) {
      return s.subBagian ? `Kepala ${s.subBagian}` : 'Kepala Subbagian / Seksi';
    }
    if (s?.hier?.kategori && !s.hier.kategori.includes('Pelaksana')) {
      return s.hier.kategori;
    }
    if (p.klasifikasiJabatan && p.klasifikasiJabatan !== '-' && p.klasifikasiJabatan.trim() !== '' && !p.klasifikasiJabatan.includes('Pelaksana')) {
      return p.klasifikasiJabatan;
    }
    if (raw && raw.toLowerCase() === 'pelaksana') {
      return 'Pengadministrasi Perkantoran / Pelaksana Tata Usaha';
    }
    return 'Pengadministrasi Perkantoran / Pelaksana Tata Usaha';
  };

  // Sanitizer karakter Excel 32.767 diimpor dari ../lib/excelSanitizer untuk mencegah crash format .xlsx

  // Helper memformat seluruh kolom data pegawai lengkap (65+ kolom komprehensif master & per unit)
  const formatCompletePegawaiExportRow = (item: { pegawai: Pegawai; struct: any }, index: number) => {
    const p = item.pegawai;
    const s = item.struct;

    const rawNama = p.nama || '';
    const polish = polishGelarDanNama(rawNama);
    const namaLengkapFormat = polish.formattedName || formatPegawaiName(rawNama) || '-';
    const frontTitleMatch = rawNama.match(/^(Prof\.|Dr\.|Dra\.|Drs\.|Ir\.|H\.|Hj\.)\s+/i);
    const gelarDepan = frontTitleMatch ? frontTitleMatch[1] : '-';
    const commaParts = rawNama.split(',');
    const namaTanpaGelar = (commaParts[0] || '').replace(/^(Prof\.|Dr\.|Dra\.|Drs\.|Ir\.|H\.|Hj\.)\s+/i, '').trim() || rawNama;
    const gelarBelakang = commaParts.length > 1 ? commaParts.slice(1).join(',').trim() : '-';
    const properJabatan = resolveProperJabatan(p, s);

    const lastEdu = Array.isArray(p.riwayatPendidikan) && p.riwayatPendidikan.length > 0
      ? p.riwayatPendidikan[p.riwayatPendidikan.length - 1]
      : null;
    const lastEduSchool = lastEdu?.namaSekolah || lastEdu?.institusi || '-';
    const lastEduYear = lastEdu?.tahunLulus || '-';
    const lastEduCert = lastEdu?.nomorIjazah || '-';

    const lastPangkat = Array.isArray(p.riwayatPangkat) && p.riwayatPangkat.length > 0
      ? p.riwayatPangkat[p.riwayatPangkat.length - 1]
      : null;
    const lastPangkatSk = lastPangkat?.nomorSk || '-';
    const lastPangkatTgl = lastPangkat?.tanggalSk || '-';

    const lastJabatan = Array.isArray(p.riwayatJabatan) && p.riwayatJabatan.length > 0
      ? p.riwayatJabatan[p.riwayatJabatan.length - 1]
      : null;
    const lastJabatanSk = lastJabatan?.nomorSk || '-';
    const lastJabatanTgl = lastJabatan?.tanggalSk || '-';

    const lastTrain = Array.isArray(p.riwayatPelatihan) && p.riwayatPelatihan.length > 0
      ? p.riwayatPelatihan[p.riwayatPelatihan.length - 1]
      : null;
    const lastTraining = lastTrain?.namaPelatihan ? `${lastTrain.namaPelatihan} (${lastTrain.tahun || '-'})` : '-';

    const lastAw = Array.isArray(p.riwayatPenghargaan) && p.riwayatPenghargaan.length > 0
      ? p.riwayatPenghargaan[p.riwayatPenghargaan.length - 1]
      : null;
    const lastAward = lastAw?.namaPenghargaan ? `${lastAw.namaPenghargaan} (${lastAw.tahun || '-'})` : '-';

    let spouseName = '-';
    let childrenCount = 0;
    if (Array.isArray(p.keluarga)) {
      p.keluarga.forEach(k => {
        const hub = (k.hubungan || '').toLowerCase();
        if (hub.includes('suami') || hub.includes('istri')) {
          spouseName = k.nama || spouseName;
        } else if (hub.includes('anak')) {
          childrenCount++;
        }
      });
    }

    return {
      'No': index + 1,
      'NIP': p.nip || '-',
      'Nama Lengkap (dengan Gelar)': namaLengkapFormat,
      'Nama Lengkap (tanpa Gelar)': namaTanpaGelar,
      'Gelar Depan': gelarDepan,
      'Gelar Belakang': gelarBelakang,
      'Unit Kerja': s.unitKerja || p.unitKerja || '-',
      'Bagian / Subdirektorat': s.bagian || p.bagian || '-',
      'Subbagian / Seksi': s.subBagian || p.subBagian || '-',
      'Tingkat Organisasi': s.tingkatStr || '-',
      'Kedudukan Hierarki': s.kedudukanHierarki || '-',
      'Atasan Langsung': s.atasanLangsung || '-',
      'Nama Jabatan': properJabatan,
      'Klasifikasi Peta Jabatan': s.hier?.kategori || p.klasifikasiJabatan || '-',
      'Jenis Jabatan': p.jenisJabatan || s.hier?.eselonTier || '-',
      'Kelas Jabatan': getKelasJabatanPermenkumham38(properJabatan, p.eselon, p.golRuang) || s.hier?.kelasJabatan || p.kelasJabatan || '-',
      'Eselon': p.eselon || s.hier?.eselonTier || '-',
      'Status Kepegawaian': p.jenisPegawai || 'PNS',
      'Status Pegawai (Aktifitas)': p.status || 'Aktif',
      'Pangkat': p.pangkat || '-',
      'Gol/Ruang': p.golRuang || '-',
      'Pangkat / Golongan': `${p.pangkat || '-'} (${p.golRuang || '-'})`,
      'TMT Pangkat': p.tmtPangkat || '-',
      'TMT Jabatan': p.tmtJabatan || '-',
      'TMT CPNS / ASN': p.tmtCpns || '-',
      'Masa Kerja Total': p.masaKerja || '-',
      'Masa Kerja Golongan': p.masaKerjaGolongan || '-',
      'Masa Kerja Pensiun': p.masaKerjaPensiun || '-',
      'Tempat Lahir': p.tempatLahir || '-',
      'Tanggal Lahir': p.tanggalLahir || '-',
      'Usia (Tahun)': p.usia ? `${p.usia} Tahun` : '-',
      'Jenis Kelamin': p.gender === 'L' ? 'Laki-laki' : p.gender === 'P' ? 'Perempuan' : (p.gender || '-'),
      'Agama': p.agama || '-',
      'Pendidikan Terakhir': p.pendidikan || '-',
      'Jurusan / Program Studi': p.jurusan || '-',
      'Lembaga Pendidikan / Universitas': lastEduSchool,
      'Tahun Kelulusan': lastEduYear,
      'Nomor Ijazah': lastEduCert,
      'Status Perkawinan': p.statusPerkawinan || '-',
      'Nama Pasangan (Suami/Istri)': spouseName,
      'Jumlah Anak / Tanggungan': childrenCount > 0 ? `${childrenCount} Orang` : '-',
      'NIK (KTP)': p.nik || '-',
      'NPWP': p.npwp || '-',
      'No BPJS Kesehatan': p.noBpjs || '-',
      'No Karis / Karsu': p.noKarisKarsu || '-',
      'No Karpeg': p.noKarpeg || '-',
      'No TAPERA': p.noTAPERA || '-',
      'No Rekening Gaji': p.noRekeningGaji || '-',
      'Nama Bank': p.namaBank || '-',
      'Gaji Pokok Terakhir': p.gajiPokok || '-',
      'No Telepon / WhatsApp': p.noHp || '-',
      'Email Resmi / Pribadi': p.email || '-',
      'Alamat Domisili': p.alamat || '-',
      'BUP / Usia Pensiun': p.bup || p.usiaPensiun || '58 / 60 Tahun',
      'Tanggal Pensiun': p.tglPensiun || '-',
      'TMT Pensiun': p.tmtPensiun || p.tmtPensiunDisplay || '-',
      'Sisa Masa Kerja': p.sisaMasaKerja || '-',
      'Keterangan Pensiun': p.keteranganPensiun || '-',
      'SK Pangkat Terakhir': lastPangkatSk,
      'Tgl SK Pangkat': lastPangkatTgl,
      'SK Jabatan Terakhir': lastJabatanSk,
      'Tgl SK Jabatan': lastJabatanTgl,
      'Pelatihan / Diklat Terakhir': lastTraining,
      'Penghargaan / Tanda Jasa': lastAward,
      'Status Master Foto Biometrik': (p.foto && p.foto.trim() !== '') ? 'Terdaftar' : 'Belum Ada',
      'Foto URL': (p.foto && !p.foto.startsWith('data:')) ? p.foto : ((p.foto && p.foto.startsWith('data:')) ? '[Tersimpan Biometrik Base64]' : '-'),
      'ID Pegawai (Sistem)': p.id || '-'
    };
  };

  const handleExportExcel = (type: 'SHARE' | 'FULL') => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Filter data for export: exclude 'Tidak Aktif' and 'Pensiun' if not searching
      const rawExportPegawai = searchTerm.trim() === '' 
        ? filteredPegawai.filter(p => p.status !== 'Tidak Aktif' && p.status !== 'Pensiun')
        : filteredPegawai;

      // Klasifikasikan dan urutkan sesuai hierarki struktur per unit (Direktur -> Eselon III -> Eselon IV -> JF & Pelaksana di bawahnya)
      const structuredList = sortPegawaiByUnitStructureHierarchy(rawExportPegawai, true);

      if (type === 'SHARE') {
        const data = structuredList.map((item, index) => {
          const p = item.pegawai;
          const s = item.struct;
          return {
            'No': index + 1,
            'NIP': p.nip || '-',
            'Nama Lengkap': formatPegawaiName(p.nama || '-'),
            'Unit Kerja': s.unitKerja || '-',
            'Bagian / Subdirektorat': s.bagian || '-',
            'Subbagian / Seksi': s.subBagian || '-',
            'Nama Jabatan': resolveProperJabatan(p, s),
            'Klasifikasi Jabatan': s.hier.kategori,
            'Kelas Jabatan': getKelasJabatanPermenkumham38(resolveProperJabatan(p, s), p.eselon, p.golRuang) || s.hier.kelasJabatan,
            'Eselon': p.eselon || s.hier.eselonTier,
            'Pangkat / Golongan': `${p.pangkat || '-'} (${p.golRuang || '-'})`,
            'Status Kepegawaian': p.jenisPegawai || 'PNS',
            'Status Pegawai': p.status || 'Aktif',
            'Pendidikan Terakhir': p.pendidikan || '-',
            'Jurusan / Prodi': p.jurusan || '-',
            'Kedudukan Hierarki': s.kedudukanHierarki,
            'Atasan Langsung': s.atasanLangsung
          };
        });
        const ws = XLSX.utils.json_to_sheet(sanitizeExcelRows(data));
        XLSX.utils.book_append_sheet(wb, ws, "Daftar Pegawai (Ringkas)");
      } else {
        // 1. Sheet 1: Peta Jabatan ABK Resmi (Sesuai Dokumen DJKI 1.074 Pegawai - Hal 1-7)
        const wsAbk = buildPetaJabatanAbkSheet();
        XLSX.utils.book_append_sheet(wb, wsAbk, "Peta Jabatan ABK (Resmi)");

        // 2. Sheet 2: Formasi SIMPEG Eselon I Resmi (Hal 8-9)
        const wsSimpeg = buildFormasiSimpegSheet();
        XLSX.utils.book_append_sheet(wb, wsSimpeg, "Formasi SIMPEG Eselon I");

        // 3. Sheet 3: Peta Jabatan Struktur (Per Unit: Direktur -> Eselon III -> Eselon IV -> JF & Pelaksana)
        const petaJabatanRows = structuredList.map((item, index) => {
          const p = item.pegawai;
          const s = item.struct;
          return {
            'No': index + 1,
            'Unit Kerja': s.unitKerja,
            'Tingkat Organisasi': s.tingkatStr,
            'Induk Struktur (Eselon III)': s.bagian,
            'Sub Struktur (Eselon IV)': s.subBagian || '-',
            'Kedudukan Hierarki': s.kedudukanHierarki,
            'Atasan Langsung': s.atasanLangsung,
            'Nama Jabatan': resolveProperJabatan(p, s),
            'Klasifikasi Peta Jabatan': s.hier.kategori,
            'Nama Pemangku': formatPegawaiName(p.nama),
            'NIP': p.nip || '-',
            'Pangkat': p.pangkat || '-',
            'Gol/Ruang': p.golRuang || '-',
            'Pangkat / Golongan': `${p.pangkat || '-'} (${p.golRuang || '-'})`,
            'TMT Pangkat': p.tmtPangkat || '-',
            'TMT Jabatan': p.tmtJabatan || '-',
            'Kelas Jabatan': getKelasJabatanPermenkumham38(resolveProperJabatan(p, s), p.eselon, p.golRuang) || s.hier.kelasJabatan,
            'Eselon': p.eselon || s.hier.eselonTier,
            'Pendidikan Terakhir': p.pendidikan || '-',
            'Jurusan / Prodi': p.jurusan || '-',
            'Status Pegawai': p.jenisPegawai || 'PNS',
            'Status Kepegawaian': p.status || 'Aktif',
            'Keterangan Bezetting': 'Terisi (1)'
          };
        });
        const wsPeta = XLSX.utils.json_to_sheet(sanitizeExcelRows(petaJabatanRows));
        XLSX.utils.book_append_sheet(wb, wsPeta, "Peta Jabatan Struktur");

        // 4. Sheet 4: Rekapitulasi Peta Jabatan Lengkap (Memuat Nama Jabatan, Unit, Bagian, Formasi, Bezetting, dan Pemangku)
        const rekapPetaJabatanRows: any[] = [];
        let rNo = 1;

        // Map lookup dari OFFICIAL_PETA_JABATAN_ABK
        const abkLookup = new Map<string, { abk: number | string; formasi: number | string }>();
        OFFICIAL_PETA_JABATAN_ABK.forEach(item => {
          if (item.jabatan) {
            const normJab = item.jabatan.toUpperCase().replace(/\s+/g, ' ').trim();
            abkLookup.set(normJab, { abk: item.abk, formasi: item.formasi });
          }
        });

        UNIT_KERJA.forEach(unit => {
          const unitItems = structuredList.filter(item => item.struct.unitKerja === unit);
          if (unitItems.length === 0) return;

          interface PositionGroup {
            unitKerja: string;
            bagian: string;
            subBagian: string;
            namaJabatan: string;
            klasifikasi: string;
            kelasJabatan: string;
            eselon: string;
            tingkatStr: string;
            atasanLangsung: string;
            kedudukanHierarki: string;
            abk: number | string;
            formasi: number | string;
            pemangku: Array<{
              nama: string;
              nip: string;
              pangkatGol: string;
              jenisPegawai: string;
              pendidikan: string;
            }>;
          }

          const groupsMap = new Map<string, PositionGroup>();

          unitItems.forEach(item => {
            const p = item.pegawai;
            const s = item.struct;
            const jabProper = resolveProperJabatan(p, s);
            const groupKey = `${s.unitKerja}|||${s.bagian}|||${s.subBagian || '-'}|||${jabProper}|||${s.hier.kategori}`;

            if (!groupsMap.has(groupKey)) {
              // Cek kecocokan di ABK resmi
              const cleanLookupKey = jabProper.toUpperCase().replace(/\s+/g, ' ').trim();
              const matchedOfficial = abkLookup.get(cleanLookupKey) || 
                Array.from(abkLookup.entries()).find(([k]) => cleanLookupKey.includes(k) || k.includes(cleanLookupKey))?.[1];

              groupsMap.set(groupKey, {
                unitKerja: s.unitKerja,
                bagian: s.bagian,
                subBagian: s.subBagian || '-',
                namaJabatan: jabProper,
                klasifikasi: s.hier.kategori,
                kelasJabatan: getKelasJabatanPermenkumham38(jabProper, p.eselon, p.golRuang) || s.hier.kelasJabatan,
                eselon: p.eselon || s.hier.eselonTier,
                tingkatStr: s.tingkatStr,
                atasanLangsung: s.atasanLangsung,
                kedudukanHierarki: s.kedudukanHierarki,
                abk: matchedOfficial?.abk || '-',
                formasi: matchedOfficial?.formasi || '-',
                pemangku: []
              });
            }

            groupsMap.get(groupKey)!.pemangku.push({
              nama: formatPegawaiName(p.nama),
              nip: p.nip || '-',
              pangkatGol: `${p.pangkat || '-'} (${p.golRuang || '-'})`,
              jenisPegawai: p.jenisPegawai || 'PNS',
              pendidikan: p.pendidikan || '-'
            });
          });

          Array.from(groupsMap.values()).forEach(grp => {
            const count = grp.pemangku.length;
            let daftarNama = grp.pemangku.map((m, idx) => count > 1 ? `${idx + 1}. ${m.nama}` : m.nama).join(', ');
            if (daftarNama.length > 32000) {
              daftarNama = daftarNama.substring(0, 31900) + `... (+${count} Pegawai Lainnya)`;
            }
            let daftarNip = grp.pemangku.map(m => m.nip).join(', ');
            if (daftarNip.length > 32000) {
              daftarNip = daftarNip.substring(0, 31900) + '...';
            }
            const daftarPangkat = Array.from(new Set(grp.pemangku.map(m => m.pangkatGol))).join('; ');
            const jenisPegList = Array.from(new Set(grp.pemangku.map(m => m.jenisPegawai))).join(', ');
            const daftarPendidikan = Array.from(new Set(grp.pemangku.map(m => m.pendidikan))).join(', ');

            const formasiNum = typeof grp.formasi === 'number' ? grp.formasi : parseInt(String(grp.formasi)) || 0;
            let statusBezetting = `Terisi (${count})`;
            if (formasiNum > 0) {
              if (count === formasiNum) statusBezetting = `Terpenuhi (${count}/${formasiNum})`;
              else if (count < formasiNum) statusBezetting = `Kurang ${formasiNum - count} (${count}/${formasiNum})`;
              else statusBezetting = `Lebih +${count - formasiNum} (${count}/${formasiNum})`;
            }

            rekapPetaJabatanRows.push({
              'No': rNo++,
              'Unit Kerja': grp.unitKerja,
              'Bagian / Subdirektorat': grp.bagian,
              'Subbagian / Seksi': grp.subBagian,
              'Nama Jabatan': grp.namaJabatan,
              'Klasifikasi Peta Jabatan': grp.klasifikasi,
              'Kelas Jabatan': grp.kelasJabatan,
              'Eselon / Tingkat': grp.eselon,
              'Kebutuhan Pegawai (ABK)': grp.abk,
              'Formasi Kebutuhan': grp.formasi,
              'Jumlah Bezetting (Riil)': count,
              'Status Bezetting': statusBezetting,
              'Nama Pemangku Jabatan': daftarNama,
              'NIP Pemangku': daftarNip,
              'Pangkat / Golongan Pemangku': daftarPangkat,
              'Status Pegawai': jenisPegList,
              'Pendidikan Pemangku': daftarPendidikan,
              'Tingkat Organisasi': grp.tingkatStr,
              'Kedudukan Hierarki': grp.kedudukanHierarki,
              'Atasan Langsung': grp.atasanLangsung
            });
          });
        });

        // Total baris rekap formasi peta jabatan
        rekapPetaJabatanRows.push({
          'No': 'TOTAL',
          'Unit Kerja': 'TOTAL SELURUH DITJEN KEKAYAAN INTELEKTUAL',
          'Bagian / Subdirektorat': 'SEMUA BAGIAN & SUBDIREKTORAT',
          'Subbagian / Seksi': '-',
          'Nama Jabatan': 'REKAPITULASI SELURUH FORMASI PETA JABATAN DJKI',
          'Klasifikasi Peta Jabatan': `${rekapPetaJabatanRows.length} Formasi Jabatan Terdaftar`,
          'Kelas Jabatan': '-',
          'Eselon / Tingkat': '-',
          'Kebutuhan Pegawai (ABK)': '-',
          'Formasi Kebutuhan': '-',
          'Jumlah Bezetting (Riil)': structuredList.length,
          'Status Bezetting': `Total Terisi (${structuredList.length}) Pegawai`,
          'Nama Pemangku Jabatan': `${structuredList.length} Pegawai Riil`,
          'NIP Pemangku': '-',
          'Pangkat / Golongan Pemangku': '-',
          'Status Pegawai': '-',
          'Pendidikan Pemangku': '-',
          'Tingkat Organisasi': '-',
          'Kedudukan Hierarki': '-',
          'Atasan Langsung': '-'
        });

        const wsRekap = XLSX.utils.json_to_sheet(sanitizeExcelRows(rekapPetaJabatanRows));
        XLSX.utils.book_append_sheet(wb, wsRekap, "Rekap Peta Jabatan");

        // 5. Sheet 5: Matriks Bezetting Unit (Tabel Pivot Bezetting per Unit & Bagian)
        const matriksBezettingRows: any[] = [];
        let totalAllPegs = 0;

        UNIT_KERJA.forEach((unit, uIdx) => {
          const unitItems = structuredList.filter(item => item.struct.unitKerja === unit);
          const unitBagians = Object.keys(ORGANISASI_STRUCTURE[unit] || {});
          
          unitBagians.forEach((bag, bIdx) => {
            const bagItems = unitItems.filter(item => item.struct.bagian === bag);
            let jpt = 0, adm = 0, pengawas = 0, jfUtama = 0, jfMadya = 0, jfMuda = 0, jfPertama = 0, jfKeterampilan = 0, pelaksana = 0;

            bagItems.forEach(item => {
              const t = item.struct.hier.tier;
              if (t === 1 || t === 2) jpt++;
              else if (t === 3) adm++;
              else if (t === 4) pengawas++;
              else if (t === 5) jfUtama++;
              else if (t === 6) jfMadya++;
              else if (t === 7) jfMuda++;
              else if (t === 8) jfPertama++;
              else if (t === 9) jfKeterampilan++;
              else pelaksana++;
            });

            matriksBezettingRows.push({
              'No': `${uIdx + 1}.${bIdx + 1}`,
              'Unit Kerja': unit,
              'Bagian / Subdirektorat': bag,
              'JPT (Eselon II)': jpt,
              'Administrator (Eselon III)': adm,
              'Pengawas (Eselon IV)': pengawas,
              'JF Ahli Utama': jfUtama,
              'JF Ahli Madya': jfMadya,
              'JF Ahli Muda': jfMuda,
              'JF Ahli Pertama': jfPertama,
              'JF Keterampilan': jfKeterampilan,
              'Pelaksana (JFU)': pelaksana,
              'Total Bezetting Riil': bagItems.length
            });
          });

          const leaderItems = unitItems.filter(item => item.struct.bagian === 'Pimpinan Unit');
          if (leaderItems.length > 0) {
            matriksBezettingRows.push({
              'No': `${uIdx + 1}.0`,
              'Unit Kerja': unit,
              'Bagian / Subdirektorat': 'Pimpinan Unit & Staf',
              'JPT (Eselon II)': leaderItems.filter(i => i.struct.hier.tier <= 2).length,
              'Administrator (Eselon III)': 0,
              'Pengawas (Eselon IV)': 0,
              'JF Ahli Utama': 0,
              'JF Ahli Madya': 0,
              'JF Ahli Muda': 0,
              'JF Ahli Pertama': 0,
              'JF Keterampilan': 0,
              'Pelaksana (JFU)': leaderItems.filter(i => i.struct.hier.tier > 2).length,
              'Total Bezetting Riil': leaderItems.length
            });
          }

          totalAllPegs += unitItems.length;
        });

        matriksBezettingRows.push({
          'No': 'TOTAL',
          'Unit Kerja': 'TOTAL KESELURUHAN DITJEN KEKAYAAN INTELEKTUAL',
          'Bagian / Subdirektorat': 'SELURUH UNIT KERJA',
          'JPT (Eselon II)': matriksBezettingRows.reduce((acc, curr) => acc + (curr['JPT (Eselon II)'] || 0), 0),
          'Administrator (Eselon III)': matriksBezettingRows.reduce((acc, curr) => acc + (curr['Administrator (Eselon III)'] || 0), 0),
          'Pengawas (Eselon IV)': matriksBezettingRows.reduce((acc, curr) => acc + (curr['Pengawas (Eselon IV)'] || 0), 0),
          'JF Ahli Utama': matriksBezettingRows.reduce((acc, curr) => acc + (curr['JF Ahli Utama'] || 0), 0),
          'JF Ahli Madya': matriksBezettingRows.reduce((acc, curr) => acc + (curr['JF Ahli Madya'] || 0), 0),
          'JF Ahli Muda': matriksBezettingRows.reduce((acc, curr) => acc + (curr['JF Ahli Muda'] || 0), 0),
          'JF Ahli Pertama': matriksBezettingRows.reduce((acc, curr) => acc + (curr['JF Ahli Pertama'] || 0), 0),
          'JF Keterampilan': matriksBezettingRows.reduce((acc, curr) => acc + (curr['JF Keterampilan'] || 0), 0),
          'Pelaksana (JFU)': matriksBezettingRows.reduce((acc, curr) => acc + (curr['Pelaksana (JFU)'] || 0), 0),
          'Total Bezetting Riil': totalAllPegs
        });

        const wsMatriks = XLSX.utils.json_to_sheet(sanitizeExcelRows(matriksBezettingRows));
        XLSX.utils.book_append_sheet(wb, wsMatriks, "Matriks Bezetting Unit");

        // 6. Sheet 6: Semua Pegawai (Hierarkis - 65+ Kolom Lengkap Master)
        const allDataFormatted = structuredList.map((item, index) => formatCompletePegawaiExportRow(item, index));
        const wsAll = XLSX.utils.json_to_sheet(sanitizeExcelRows(allDataFormatted));
        XLSX.utils.book_append_sheet(wb, wsAll, "Semua Pegawai (Hierarkis)");

        // Mapping nama sheet unit agar singkat dan ramah Excel (maks 31 karakter)
        const UNIT_SHEET_NAMES: Record<string, string> = {
          'Sekretariat Direktorat Jenderal Kekayaan Intelektual': 'Sekretariat',
          'Direktorat Hak Cipta dan Desain Industri': 'Hak Cipta & DI',
          'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang': 'Paten, DTLST & RD',
          'Direktorat Merek dan Indikasi Geografis': 'Merek & IG',
          'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi': 'Kerjasama & Edukasi',
          'Direktorat Teknologi Informasi Kekayaan Intelektual': 'TI KI',
          'Direktorat Penegakan Hukum': 'Penegakan Hukum'
        };

        // Sheets 7-13: Sheet Per Unit Kerja (Setiap unit memiliki seluruh 65+ kolom data pegawai lengkap)
        UNIT_KERJA.forEach(unit => {
          const unitItems = structuredList.filter(item => item.struct.unitKerja === unit);
          if (unitItems.length > 0) {
            const formattedUnit = unitItems.map((item, idx) => formatCompletePegawaiExportRow(item, idx));
            const wsUnit = XLSX.utils.json_to_sheet(sanitizeExcelRows(formattedUnit));
            const sheetName = UNIT_SHEET_NAMES[unit] || unit.substring(0, 31);
            XLSX.utils.book_append_sheet(wb, wsUnit, sheetName);
          }
        });
      }
      
      safeWriteExcel(wb, `Data_Pegawai_DJKI_${type}_PetaJabatanStruktur_${Date.now()}.xlsx`);
    } catch (err: any) {
      console.error("Gagal melakukan ekspor data ke Excel:", err);
      alert(`Gagal mengekspor file Excel: ${err?.message || 'Terjadi kesalahan sistem'}`);
    }
  };

  const handleExportSelectedExcel = () => {
    if (selectedNipsForBulk.length === 0) return;
    try {
      const wb = XLSX.utils.book_new();
      const exportPegawai = pegawaiList.filter(p => p.nip && selectedNipsForBulk.includes(p.nip));
      const structuredList = sortPegawaiByUnitStructureHierarchy(exportPegawai, true);

      const data = structuredList.map((item, index) => formatCompletePegawaiExportRow(item, index));

      const ws = XLSX.utils.json_to_sheet(sanitizeExcelRows(data));
      XLSX.utils.book_append_sheet(wb, ws, "Pegawai Terpilih");
      safeWriteExcel(wb, `Data_Pegawai_Terpilih_${Date.now()}.xlsx`);
    } catch (err: any) {
      console.error("Gagal melakukan ekspor pegawai terpilih:", err);
      alert(`Gagal mengekspor data: ${err?.message || 'Terjadi kesalahan sistem'}`);
    }
  };

  const handleUploadPhoto = async () => {
    if (!tempPhotoFile) return;
    setUploading(true);
    try {
      const compressedBase64 = await compressImage(tempPhotoFile, 450, 0.85);
      const res = await uploadFileToDrive(`FOTO_${formData.nip || 'NEW'}_${Date.now()}`, 'image/jpeg', compressedBase64);
      if (res.success && (res.fileUrl || res.directUrl)) {
        const photoLink = formatDrivePhotoUrl(res.directUrl || res.fileUrl);
        setFormData(prev => ({ ...prev, foto: photoLink }));
        setIsPhotoModalOpen(false);
        if (tempPhotoPreview) URL.revokeObjectURL(tempPhotoPreview);
        setTempPhotoFile(null);
        setTempPhotoPreview('');
        setSuccessMsg(`Foto profil berhasil diunggah ke Google Drive (${photoLink}) dan tersimpan.`);
        setShowSuccess(true);
      } else {
        alert(
          `Gagal mengunggah foto ke Google Drive:\n\n${res.message || "Akses Drive ditolak atau koneksi gagal"}\n\n` +
          `Solusi Alternatif:\n` +
          `1. Jika muncul 'DriveApp Access Denied', buka editor Google Apps Script di Spreadsheet Anda, pilih fungsi 'setup' lalu klik 'Run' untuk memberi izin hak akses Drive.\n` +
          `2. Atau Anda dapat mengunggah foto langsung ke Google Drive Anda, lalu tempelkan link share file Drive tersebut.`
        );
      }
    } catch (err: any) {
      console.error("Gagal upload foto:", err);
      alert(`Terjadi kesalahan saat memproses foto: ${err?.message || err}`);
    } finally {
      setUploading(false);
    }
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
    
    // Sesuaikan pendidikan dan jurusan dengan riwayatPendidikan, atau lihat gelar terakhir jika tidak ada riwayat
    const finalNama = formData.nama.trim();
    const eduResolved = resolvePegawaiPendidikanDanJurusan({
      nama: finalNama,
      riwayatPendidikan: formData.riwayatPendidikan,
      pendidikan: formData.pendidikan,
      jurusan: formData.jurusan
    });
    const finalJurusan = eduResolved.jurusan || formData.jurusan;
    const finalPendidikan = eduResolved.pendidikan || formData.pendidikan;
    
    // Generate ID for new records
    const payload = {
      ...formData,
      nama: finalNama,
      jurusan: finalJurusan,
      pendidikan: finalPendidikan,
      foto: formatDrivePhotoUrl(formData.foto),
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
      const lastErr = sessionStorage.getItem('last_spreadsheet_error');
      alert("Gagal menyimpan data ke server." + (lastErr ? `\n\nDetail: ${lastErr}` : ""));
    }
    setSyncing(false);
  };

  const inputClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950";
  const inputNoCapsClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950";
  const labelClass = "text-[9px] font-black text-gray-400 ml-3 tracking-widest block mb-1.5";
  const detailLabel = "text-[8px] font-black text-gray-400 tracking-[0.2em] block mb-1.5";
  const detailValue = "text-[13px] font-black text-gray-900 leading-tight";
  const detailValueNoCaps = "text-[13px] font-black text-gray-900 leading-tight";

  const handleSelectOrganisasiNode = (node: PopulatedOrganisasiNode) => {
    const allPegawaiInNode = getAllPegawaiForNode(node);
    const targetNips = new Set(allPegawaiInNode.map(p => (p.nip || p.id || '').replace(/\D/g, '')));

    // Bersihkan pencarian teks bebas & usia agar seluruh anggota unit tampil
    setSearchTerm('');
    setMinAge('');
    setMaxAge('');

    if (node.level === 'ditjen') {
      setFilterSotk(null);
      setFilterUnit('Semua Unit');
    } else if (node.level === 'direktorat') {
      const normalized = normalizeUnitName(node.nama);
      setFilterUnit(normalized);
      setFilterSotk({
        id: node.id,
        nama: node.nama,
        shortName: node.shortName,
        level: node.level,
        targetNips
      });
    } else {
      // Subdirektorat, Bagian, atau Subbagian
      setFilterSotk({
        id: node.id,
        nama: node.nama,
        shortName: node.shortName,
        level: node.level,
        targetNips
      });
      setFilterUnit('Semua Unit');
    }
    setViewMode('list');
  };

  if (isUserPortalView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-fadeIn">
        <div className="h-10 w-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Mengarahkan ke Data Diri Pegawai Anda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      <SheetErrorGuideModal isOpen={isSheetErrorOpen} onClose={() => setIsSheetErrorOpen(false)} errorMessage={sheetErrorMsg} moduleName="PEGAWAI" />
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

      {isBulkHealModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 md:px-8 py-5 md:py-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/30">
              <div>
                <h3 className="text-sm md:text-lg font-black text-gray-950 uppercase tracking-tight flex items-center gap-2">
                  <i className="bi bi-magic text-blue-600 animate-pulse text-base md:text-xl"></i>
                  Perbaikan Gelar Akademik & Auto-Fill Jurusan (Bulk)
                </h3>
                <p className="text-[9px] md:text-[11px] text-gray-500 font-bold mt-1">
                  Menganalisis kesalahan format penulisan gelar, merapikan tanda baca & urutan tingkatan, serta mengisi otomatis program studi (jurusan) yang kosong.
                </p>
              </div>
              <button 
                disabled={healRunning} 
                onClick={() => setIsBulkHealModalOpen(false)} 
                className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-100 bg-white hover:bg-gray-50 text-gray-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-all outline-none"
              >
                <i className="bi bi-x-lg text-xs md:text-sm"></i>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {healRunning ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <h4 className="text-xs md:text-sm font-black uppercase text-gray-950 tracking-wider">Sedang Memproses Penyelarasan Database...</h4>
                  <p className="text-[10px] md:text-xs font-black text-gray-500 bg-gray-50 px-4 py-2 border border-gray-100 rounded-xl">
                    Selesai {healProgress.current} dari {healProgress.total} pegawai
                  </p>
                  <div className="w-full max-w-md bg-gray-100 h-2.5 rounded-full overflow-hidden border border-gray-200/50">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${(healProgress.current / healProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ) : healReport.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 text-xl border border-emerald-100">
                    <i className="bi bi-check-circle-fill"></i>
                  </div>
                  <h4 className="text-xs md:text-sm font-black text-gray-950 uppercase">Semua Data Sudah Rapi dan Selaras!</h4>
                  <p className="text-[9px] md:text-[11px] text-gray-400 font-bold max-w-md mx-auto">
                    Keren! Tidak ditemukan kesalahan penulisan gelar, kekeliruan urutan tanda baca, atau jurusan kosong yang dapat diselaraskan dari gelar akademik pegawai.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 text-amber-800 flex gap-3 items-start shadow-sm leading-relaxed">
                    <i className="bi bi-info-circle-fill text-amber-600 text-sm md:text-base mt-0.5"></i>
                    <div>
                      <h5 className="text-[10px] md:text-xs font-black uppercase tracking-wider">Konfirmasi Perubahan Data ({healReport.length} Pegawai)</h5>
                      <p className="text-[9px] md:text-[11px] font-bold mt-1">
                        Sistem mendeteksi <strong>{healReport.length} pegawai</strong> dengan format penulisan gelar kurang tepat (tanpa koma/titik, urutan terbalik) atau kolom jurusan yang kosong tetapi teridentifikasi dari gelarnya. Silakan telaah detail perbaikan di bawah ini sebelum menyimpan langsung ke cloud spreadsheet.
                      </p>
                    </div>
                  </div>

                  <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-inner bg-gray-50 max-h-96 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-150 text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest">
                          <th className="px-4 py-3">Pegawai / NIP</th>
                          <th className="px-4 py-3">Nama Serta Gelar (Sebelum » Sesudah)</th>
                          <th className="px-4 py-3">Pendidikan (Inferred)</th>
                          <th className="px-4 py-3">Jurusan (Sebelum » Sesudah)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 text-[10px] md:text-xs text-gray-800">
                        {healReport.map(item => (
                          <tr key={item.id} className="hover:bg-white bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3.5 font-bold">
                              <span className="text-gray-900 block font-black leading-tight">{item.p.nama}</span>
                              <span className="text-gray-400 font-mono text-[8px] md:text-[10px] tracking-wider font-medium">{item.p.nip}</span>
                            </td>
                            <td className="px-4 py-3.5 space-y-1">
                              <div className="text-rose-500 font-semibold line-through text-[9px] md:text-xs">{item.nameBefore}</div>
                              <div className="text-emerald-600 font-black flex items-center gap-1.5"><i className="bi bi-arrow-right-short text-base"></i> {item.nameAfter}</div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-center">
                              {item.pendidikanBefore !== item.pendidikanAfter ? (
                                <div className="flex flex-col">
                                  <span className="text-gray-400 line-through text-[9px]">{item.pendidikanBefore}</span>
                                  <span className="text-blue-600 font-black">{item.pendidikanAfter}</span>
                                </div>
                              ) : (
                                <span className="text-gray-600 font-semibold">{item.pendidikanAfter}</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              {item.jurusanBefore !== item.jurusanAfter ? (
                                <div className="flex flex-col">
                                  <span className="text-rose-500 line-through text-[9px]">{item.jurusanBefore}</span>
                                  <span className="text-emerald-600 font-black flex items-center gap-0.5"><i className="bi bi-plus-circle text-[9px]"></i> {item.jurusanAfter}</span>
                                </div>
                              ) : (
                                <span className="text-gray-600 font-bold">{item.jurusanAfter}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 md:px-8 py-4 md:py-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center sm:gap-4 flex-wrap">
              <button 
                type="button" 
                disabled={healRunning} 
                onClick={() => setIsBulkHealModalOpen(false)} 
                className="px-5 py-2.5 md:py-3.5 bg-white border border-gray-200 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase text-gray-700 hover:bg-gray-50 outline-none transition-all active:scale-95"
              >
                Kembali
              </button>
              
              {!healRunning && healReport.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => handleRunBulkHeal(healReport)} 
                  className="px-6 py-2.5 md:py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 outline-none"
                >
                  <i className="bi bi-shield-check text-base"></i>
                  Terapkan Perbaikan Data Sekarang
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === 'Aktif' ? 'Semua Status' : 'Aktif')}
              className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                filterStatus === 'Aktif'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
              }`}
              title="Filter Pegawai Status Aktif"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${filterStatus === 'Aktif' ? 'bg-white' : 'bg-emerald-500'} animate-pulse`}></span>
              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-wider">Aktif: {statusCounts['Aktif'] || 0}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === 'Tugas Belajar' ? 'Semua Status' : 'Tugas Belajar')}
              className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                filterStatus === 'Tugas Belajar'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
              }`}
              title="Filter Pegawai Tugas Belajar"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${filterStatus === 'Tugas Belajar' ? 'bg-white' : 'bg-amber-500'}`}></span>
              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-wider">Tugas: {statusCounts['Tugas Belajar'] || 0}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === 'Tidak Aktif' ? 'Semua Status' : 'Tidak Aktif')}
              className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                filterStatus === 'Tidak Aktif'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
              }`}
              title="Filter Pegawai Tidak Aktif"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${filterStatus === 'Tidak Aktif' ? 'bg-white' : 'bg-rose-500'}`}></span>
              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-wider">Off: {statusCounts['Tidak Aktif'] || 0}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === 'Pensiun' ? 'Semua Status' : 'Pensiun')}
              className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                filterStatus === 'Pensiun'
                  ? 'bg-gray-700 text-white border-gray-700 shadow-sm'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
              title="Filter Pegawai Pensiun"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${filterStatus === 'Pensiun' ? 'bg-white' : 'bg-gray-500'}`}></span>
              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-wider">Pensiun: {statusCounts['Pensiun'] || 0}</span>
            </button>
          </div>
          <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3 flex items-center gap-2"><i className="bi bi-shield-check text-blue-600"></i> Terintegrasi dengan Cloud Google Spreadsheet</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto">
           <input type="file" ref={importExcelInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} />
           <button 
             onClick={() => loadData(true)} 
             disabled={loading}
             className="h-10 md:h-14 px-3 md:px-6 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase hover:bg-sky-600 hover:text-white transition-all flex items-center justify-center gap-2"
             title="Sinkronisasi data langsung dari Google Spreadsheet (bypass cache)"
           >
             {loading ? (
               <div className="h-4 w-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
             ) : (
               <i className="bi bi-arrow-clockwise text-base md:text-lg"></i>
             )}
             <span className="hidden xs:inline">Sync Cloud</span>
             <span className="xs:hidden">Sync</span>
           </button>
           <button onClick={() => handleExportExcel('SHARE')} className="h-10 md:h-14 px-3 md:px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2" title="Unduh Data Pegawai Ringkas (Terstruktur Per Unit: Direktur -> Eselon III -> Eselon IV -> JF & Pelaksana)"><i className="bi bi-file-earmark-spreadsheet-fill text-base md:text-lg"></i> <span className="hidden xs:inline">Share</span><span className="xs:hidden">Shr</span></button>
           <button onClick={downloadOfficialPetaJabatanExcel} className="h-10 md:h-14 px-3 md:px-5 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2" title="Unduh Dokumen Resmi Peta Jabatan ABK (1.074 Pegawai) & Formasi SIMPEG Eselon I DJKI Kemenkumham RI"><i className="bi bi-diagram-2-fill text-base md:text-lg"></i> <span className="hidden xs:inline">Peta Jabatan (Resmi)</span><span className="xs:hidden">Peta</span></button>
           {canEdit && (<button onClick={() => handleExportExcel('FULL')} className="h-10 md:h-14 px-3 md:px-6 bg-emerald-600 text-white rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2" title="Unduh Database Lengkap dengan Peta Jabatan ABK Resmi (1.074 Pegawai), Formasi SIMPEG, Peta Jabatan Struktur, Rekapitulasi Bezetting, dan Sheet Khusus Seluruh 7 Direktorat/Unit"><i className="bi bi-diagram-3-fill text-base md:text-lg"></i> <span className="hidden xs:inline">Full + Peta Jabatan</span><span className="xs:hidden">Full</span></button>)}
           {canEdit && (
             <button 
               onClick={() => {
                 const report = prepareHealReport();
                 setHealReport(report);
                 setIsBulkHealModalOpen(true);
               }} 
               className="h-10 md:h-14 px-3 md:px-6 bg-[#0284c7] text-white border border-sky-500/15 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase shadow-xl hover:bg-sky-700 active:scale-95 transition-all flex items-center justify-center gap-2"
               title="Menganalisis kesalahan format penulisan gelar, merapikan tanda baca & urutan tingkatan, serta auto-fill program studi (jurusan) yang kosong."
             >
               <i className="bi bi-magic text-base md:text-lg"></i> 
               <span className="hidden xs:inline">Rapikan Gelar & Jurusan</span>
               <span className="xs:hidden">Rapikan</span>
             </button>
           )}
           {canEdit && (
             <button 
               onClick={() => importExcelInputRef.current?.click()} 
               disabled={syncing}
               className="h-10 md:h-14 px-3 md:px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
               title="Impor massal data pegawai dari dokumen Excel (.xlsx, .xls, .csv)"
             >
               {importProgress.total > 0 ? (
                 <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {importProgress.current} / {importProgress.total}</>
               ) : (
                 <><i className="bi bi-cloud-arrow-up-fill text-base md:text-lg"></i> <span className="hidden xs:inline">Import Excel</span><span className="xs:hidden">Import</span></>
               )}
             </button>
           )}
           {canEdit && (<button onClick={() => { setSelectedPegawai(null); setFormData({status: 'Aktif', jenisPegawai: 'PNS', gender: 'L', unitKerja: UNIT_KERJA[0]}); setIsModalOpen(true); }} className="col-span-2 sm:w-auto h-10 md:h-14 px-4 md:px-10 bg-[#111827] text-white rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"><i className="bi bi-person-plus-fill text-base md:text-lg"></i> <span className="hidden xs:inline">Registrasi Pegawai</span><span className="xs:hidden">Registrasi</span></button>)}
        </div>
      </div>

      <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-3 md:gap-4">
        <div className="relative w-full">
          <i className="bi bi-search absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-gray-400 text-xs md:text-base"></i>
          <input type="text" placeholder="Pencarian Cepat: Nama, NIP, atau NIK..." className="w-full pl-10 md:pl-14 pr-6 md:pr-8 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[9px] md:text-xs font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
          <select 
            className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all cursor-pointer" 
            value={filterUnit} 
            onChange={e => { setFilterUnit(e.target.value); setFilterSotk(null); }}
          >
              <option value="Semua Unit">Semua Unit</option>
              {AVAILABLE_UNIT_LIST.map(u => (
                <option key={u} value={u}>
                  {u === UNIT_KERJA[0] ? 'SEKRETARIAT (SETDITJEN)' : u.toUpperCase()}
                </option>
              ))}
          </select>
          <div ref={jenisDropdownRef} className="relative w-full">
            <button 
              type="button"
              onClick={() => setIsJenisDropdownOpen(!isJenisDropdownOpen)}
              className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase text-left flex justify-between items-center transition-all hover:border-gray-200 outline-none cursor-pointer"
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
                {AVAILABLE_JENIS_LIST.map(jenis => {
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
          <div ref={klasifikasiDropdownRef} className="relative w-full">
            <button 
              type="button"
              onClick={() => setIsKlasifikasiDropdownOpen(!isKlasifikasiDropdownOpen)}
              className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase text-left flex justify-between items-center transition-all hover:border-gray-200 outline-none cursor-pointer"
            >
              <span className="truncate">
                {filterKlasifikasi === 'Semua Klasifikasi' || !filterKlasifikasi
                  ? 'Semua Klasifikasi'
                  : filterKlasifikasi.split(',').join(' + ')}
              </span>
              <i className={`bi bi-chevron-${isKlasifikasiDropdownOpen ? 'up' : 'down'} text-gray-400 text-xs`}></i>
            </button>
            {isKlasifikasiDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 space-y-2 max-h-60 overflow-y-auto">
                <label className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                  <input 
                    type="checkbox"
                    checked={filterKlasifikasi === 'Semua Klasifikasi' || !filterKlasifikasi}
                    onChange={() => setFilterKlasifikasi('Semua Klasifikasi')}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-gray-700">Semua Klasifikasi</span>
                </label>
                <div className="h-px bg-gray-100 my-1"></div>
                {KLASIFIKASI_LIST.map(klas => {
                  const currentList = filterKlasifikasi === 'Semua Klasifikasi' ? [] : filterKlasifikasi.split(',').filter(Boolean);
                  const isChecked = currentList.includes(klas);
                  const handleCheckboxChange = () => {
                    let newList: string[];
                    if (isChecked) {
                      newList = currentList.filter(item => item !== klas);
                    } else {
                      newList = [...currentList, klas];
                    }
                    if (newList.length === 0) {
                      setFilterKlasifikasi('Semua Klasifikasi');
                    } else {
                      setFilterKlasifikasi(newList.join(','));
                    }
                  };
                  return (
                    <label key={klas} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-gray-800">{klas}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <select className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all cursor-pointer" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option>Semua Status</option>
              <option value="Aktif">AKTIF</option>
              <option value="Tidak Aktif">TIDAK AKTIF</option>
              <option value="Pensiun">PENSIUN</option>
              <option value="Tugas Belajar">TUGAS BELAJAR</option>
          </select>
          <div ref={pendidikanDropdownRef} className="relative w-full">
            <button 
              type="button"
              onClick={() => setIsPendidikanDropdownOpen(!isPendidikanDropdownOpen)}
              className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase text-left flex justify-between items-center transition-all hover:border-gray-200 outline-none cursor-pointer"
            >
              <span className="truncate">
                {filterPendidikan === 'Semua Pendidikan' || !filterPendidikan
                  ? 'Semua Pendidikan'
                  : filterPendidikan.split(',').join(' + ')}
              </span>
              <i className={`bi bi-chevron-${isPendidikanDropdownOpen ? 'up' : 'down'} text-gray-400 text-xs`}></i>
            </button>
            {isPendidikanDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 space-y-2 max-h-60 overflow-y-auto">
                <label className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                  <input 
                    type="checkbox"
                    checked={filterPendidikan === 'Semua Pendidikan' || !filterPendidikan}
                    onChange={() => setFilterPendidikan('Semua Pendidikan')}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-gray-700">Semua Pendidikan</span>
                </label>
                <div className="h-px bg-gray-100 my-1"></div>
                {JENJANG_PENDIDIKAN_LIST.map(pend => {
                  const currentList = filterPendidikan === 'Semua Pendidikan' ? [] : filterPendidikan.split(',').filter(Boolean);
                  const isChecked = currentList.includes(pend);
                  const handleCheckboxChange = () => {
                    let newList: string[];
                    if (isChecked) {
                      newList = currentList.filter(item => item !== pend);
                    } else {
                      newList = [...currentList, pend];
                    }
                    if (newList.length === 0) {
                      setFilterPendidikan('Semua Pendidikan');
                    } else {
                      setFilterPendidikan(newList.join(','));
                    }
                  };
                  return (
                    <label key={pend} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-gray-800">{pend}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div ref={jurusanDropdownRef} className="relative w-full">
            <button 
              type="button"
              onClick={() => setIsJurusanDropdownOpen(!isJurusanDropdownOpen)}
              className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase text-left flex justify-between items-center transition-all hover:border-gray-200 outline-none cursor-pointer"
            >
              <span className="truncate">
                {filterJurusan === 'Semua Jurusan' || !filterJurusan
                  ? 'Semua Jurusan'
                  : filterJurusan.split(',').join(' + ')}
              </span>
              <i className={`bi bi-chevron-${isJurusanDropdownOpen ? 'up' : 'down'} text-gray-400 text-xs`}></i>
            </button>
            {isJurusanDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 space-y-2 max-h-80 overflow-y-auto">
                <div className="px-2 py-1">
                  <input
                    type="text"
                    placeholder="Cari Jurusan..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[9px] md:text-[11px] outline-none focus:border-blue-500 transition-all font-bold uppercase"
                    value={jurusanSearch}
                    onChange={e => setJurusanSearch(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                  <input 
                    type="checkbox"
                    checked={filterJurusan === 'Semua Jurusan' || !filterJurusan}
                    onChange={() => { setFilterJurusan('Semua Jurusan'); setJurusanSearch(''); }}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-gray-700">Semua Jurusan</span>
                </label>
                <div className="h-px bg-gray-100 my-1"></div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {AVAILABLE_JURUSAN_LIST.filter(j => j.toLowerCase().includes(jurusanSearch.toLowerCase())).map(jurusan => {
                    const currentList = filterJurusan === 'Semua Jurusan' ? [] : filterJurusan.split(',').filter(Boolean);
                    const isChecked = currentList.includes(jurusan);
                    const handleCheckboxChange = () => {
                      let newList: string[];
                      if (isChecked) {
                        newList = currentList.filter(item => item !== jurusan);
                      } else {
                        newList = [...currentList, jurusan];
                      }
                      if (newList.length === 0) {
                        setFilterJurusan('Semua Jurusan');
                      } else {
                        setFilterJurusan(newList.join(','));
                      }
                    };
                    return (
                      <label key={jurusan} className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={handleCheckboxChange}
                          className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-gray-800">{jurusan}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
            <div className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] w-full">
              <span className="text-[7px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Gol:</span>
              <select className="bg-transparent border-none outline-none text-[8px] md:text-[10px] font-black uppercase w-full cursor-pointer hover:text-blue-600" value={minGolongan} onChange={e => setMinGolongan(e.target.value)}>
                  <option value="Semua">DARI</option>
                  {SORTED_GOLS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
              </select>
              <span className="text-gray-300 font-bold">»</span>
              <select className="bg-transparent border-none outline-none text-[8px] md:text-[10px] font-black uppercase w-full cursor-pointer hover:text-blue-600" value={maxGolongan} onChange={e => setMaxGolongan(e.target.value)}>
                  <option value="Semua">SAMPAI</option>
                  {SORTED_GOLS.map(g => (
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
          <select 
            className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all cursor-pointer" 
            value={filterAgama} 
            onChange={e => setFilterAgama(e.target.value)}
          >
            <option>Semua Agama</option>
            {AGAMA_LIST.map(a => (
              <option key={a} value={a}>{a.toUpperCase()}</option>
            ))}
          </select>
          <button 
            onClick={() => {
              setSearchTerm('');
              setFilterSotk(null);
              setFilterUnit('Semua Unit');
              setFilterJenis('Semua Jenis');
              setFilterStatus('Semua Status');
              setMinGolongan('Semua');
              setMaxGolongan('Semua');
              setMinAge('');
              setMaxAge('');
              setFilterPendidikan('Semua Pendidikan');
              setFilterJurusan('Semua Jurusan');
              setFilterKlasifikasi('Semua Klasifikasi');
              setFilterAgama('Semua Agama');
              setJurusanSearch('');
            }}
            className="w-full px-4 md:px-6 py-2.5 md:py-4 bg-slate-100/50 border-2 border-transparent rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase outline-none hover:bg-rose-50 hover:text-rose-600 transition-all text-slate-400 flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="bi bi-arrow-counterclockwise text-sm"></i>
            Reset Filter
          </button>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {(searchTerm || filterUnit !== 'Semua Unit' || (filterJenis !== 'Semua Jenis' && filterJenis) || (filterStatus !== 'Semua Status' && filterStatus) || minGolongan !== 'Semua' || maxGolongan !== 'Semua' || minAge || maxAge || (filterPendidikan !== 'Semua Pendidikan' && filterPendidikan) || (filterJurusan !== 'Semua Jurusan' && filterJurusan) || (filterKlasifikasi !== 'Semua Klasifikasi' && filterKlasifikasi) || (filterAgama !== 'Semua Agama' && filterAgama) || filterSotk) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-blue-50/70 border border-blue-100 rounded-2xl shadow-xs">
          <div className="flex items-center gap-1.5 text-[9px] md:text-xs font-black text-blue-900 uppercase">
            <i className="bi bi-funnel-fill text-blue-600"></i>
            <span>Filter Aktif ({filteredPegawai.length} Pegawai):</span>
          </div>

          {searchTerm && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[8px] md:text-[10px] font-black shadow-xs">
              <span className="text-gray-400 font-bold">Cari:</span> "{searchTerm}"
              <button type="button" onClick={() => setSearchTerm('')} className="hover:text-rose-600 font-black cursor-pointer ml-0.5">×</button>
            </span>
          )}

          {filterUnit !== 'Semua Unit' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[8px] md:text-[10px] font-black shadow-xs">
              <span className="text-gray-400 font-bold">Unit:</span> {filterUnit}
              <button type="button" onClick={() => setFilterUnit('Semua Unit')} className="hover:text-rose-600 font-black cursor-pointer ml-0.5">×</button>
            </span>
          )}

          {filterJenis !== 'Semua Jenis' && filterJenis && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[8px] md:text-[10px] font-black shadow-xs">
              <span className="text-gray-400 font-bold">Jenis:</span> {filterJenis}
              <button type="button" onClick={() => setFilterJenis('Semua Jenis')} className="hover:text-rose-600 font-black cursor-pointer ml-0.5">×</button>
            </span>
          )}

          {filterStatus !== 'Semua Status' && filterStatus && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[8px] md:text-[10px] font-black shadow-xs">
              <span className="text-gray-400 font-bold">Status:</span> {filterStatus}
              <button type="button" onClick={() => setFilterStatus('Semua Status')} className="hover:text-rose-600 font-black cursor-pointer ml-0.5">×</button>
            </span>
          )}

          {filterKlasifikasi !== 'Semua Klasifikasi' && filterKlasifikasi && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[8px] md:text-[10px] font-black shadow-xs">
              <span className="text-gray-400 font-bold">Klasifikasi:</span> {filterKlasifikasi}
              <button type="button" onClick={() => setFilterKlasifikasi('Semua Klasifikasi')} className="hover:text-rose-600 font-black cursor-pointer ml-0.5">×</button>
            </span>
          )}

          {filterPendidikan !== 'Semua Pendidikan' && filterPendidikan && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[8px] md:text-[10px] font-black shadow-xs">
              <span className="text-gray-400 font-bold">Pendidikan:</span> {filterPendidikan}
              <button type="button" onClick={() => setFilterPendidikan('Semua Pendidikan')} className="hover:text-rose-600 font-black cursor-pointer ml-0.5">×</button>
            </span>
          )}

          {filterJurusan !== 'Semua Jurusan' && filterJurusan && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[8px] md:text-[10px] font-black shadow-xs">
              <span className="text-gray-400 font-bold">Jurusan:</span> {filterJurusan}
              <button type="button" onClick={() => { setFilterJurusan('Semua Jurusan'); setJurusanSearch(''); }} className="hover:text-rose-600 font-black cursor-pointer ml-0.5">×</button>
            </span>
          )}

          {(minGolongan !== 'Semua' || maxGolongan !== 'Semua') && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[8px] md:text-[10px] font-black shadow-xs">
              <span className="text-gray-400 font-bold">Golongan:</span> {minGolongan} » {maxGolongan}
              <button type="button" onClick={() => { setMinGolongan('Semua'); setMaxGolongan('Semua'); }} className="hover:text-rose-600 font-black cursor-pointer ml-0.5">×</button>
            </span>
          )}

          {(minAge || maxAge) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[8px] md:text-[10px] font-black shadow-xs">
              <span className="text-gray-400 font-bold">Usia:</span> {minAge || '0'} - {maxAge || '∞'} thn
              <button type="button" onClick={() => { setMinAge(''); setMaxAge(''); }} className="hover:text-rose-600 font-black cursor-pointer ml-0.5">×</button>
            </span>
          )}

          {filterAgama !== 'Semua Agama' && filterAgama && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[8px] md:text-[10px] font-black shadow-xs">
              <span className="text-gray-400 font-bold">Agama:</span> {filterAgama}
              <button type="button" onClick={() => setFilterAgama('Semua Agama')} className="hover:text-rose-600 font-black cursor-pointer ml-0.5">×</button>
            </span>
          )}

          {filterSotk && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[8px] md:text-[10px] font-black shadow-xs">
              <span className="text-gray-400 font-bold">SOTK:</span> {filterSotk.nama}
              <button type="button" onClick={() => setFilterSotk(null)} className="hover:text-rose-600 font-black cursor-pointer ml-0.5">×</button>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterSotk(null);
              setFilterUnit('Semua Unit');
              setFilterJenis('Semua Jenis');
              setFilterStatus('Semua Status');
              setMinGolongan('Semua');
              setMaxGolongan('Semua');
              setMinAge('');
              setMaxAge('');
              setFilterPendidikan('Semua Pendidikan');
              setFilterJurusan('Semua Jurusan');
              setFilterKlasifikasi('Semua Klasifikasi');
              setFilterAgama('Semua Agama');
              setJurusanSearch('');
            }}
            className="ml-auto text-[8px] md:text-[10px] font-black uppercase text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
          >
            <i className="bi bi-x-circle"></i> Bersihkan Semua
          </button>
        </div>
      )}

      {/* Selection Bulk Controls & View Switcher */}
      <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
            <p className="text-[10px] md:text-xs font-black uppercase text-gray-700 tracking-wider">
              Terpilih: <span className="text-blue-600 font-extrabold text-xs md:text-sm">{selectedNipsForBulk.length}</span> Pegawai
            </p>
          </div>

          {/* View Mode Toggle Switch */}
          <div className="flex items-center bg-gray-100/90 p-1 rounded-xl border border-gray-200/70 shadow-inner">
            <button 
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Tampilan Grid / Kartu"
            >
              <i className="bi bi-grid-fill text-xs"></i>
              <span>Grid</span>
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Tampilan List / Tabel"
            >
              <i className="bi bi-list-ul text-xs"></i>
              <span>List</span>
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('struktur')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase transition-all cursor-pointer ${
                viewMode === 'struktur' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Tampilan Struktur Organisasi Per Direktorat (SOTK)"
            >
              <i className="bi bi-diagram-3-fill text-xs"></i>
              <span>Struktur</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          <button 
            type="button"
            onClick={() => {
              const visibleNips = (filteredPegawai || []).map(p => p.nip).filter(Boolean);
              setSelectedNipsForBulk(prev => {
                const merged = new Set([...prev, ...visibleNips]);
                return Array.from(merged);
              });
            }}
            disabled={filteredPegawai.length === 0}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 rounded-xl text-[8px] md:text-[9px] font-black uppercase disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
          >
            <i className="bi bi-check-all text-xs"></i> Centang Semua ({filteredPegawai.length})
          </button>
          <button 
            type="button"
            onClick={() => setSelectedNipsForBulk([])}
            disabled={selectedNipsForBulk.length === 0}
            className="px-3 py-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200/60 text-slate-500 rounded-xl text-[8px] md:text-[9px] font-black uppercase disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
          >
            <i className="bi bi-trash text-xs"></i> Bersihkan Pilihan
          </button>
          
          {selectedNipsForBulk.length > 0 && (
            <>
              <button 
                type="button"
                onClick={handleExportSelectedExcel}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[8px] md:text-[9px] font-black uppercase hover:bg-emerald-700 shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 animate-fadeIn"
              >
                <i className="bi bi-file-earmark-spreadsheet text-xs"></i> Ekspor Excel ({selectedNipsForBulk.length})
              </button>
              <button 
                type="button"
                onClick={() => setShowBulkSummary(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[8px] md:text-[9px] font-black uppercase hover:bg-blue-700 shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5 animate-fadeIn"
              >
                <i className="bi bi-eye text-xs"></i> Ambil / Lihat Data ({selectedNipsForBulk.length})
              </button>
            </>
          )}
        </div>
      </div>

      {filterSotk && viewMode !== 'struktur' && (
        <div className="bg-blue-50/90 border border-blue-200 p-3.5 px-5 rounded-2xl md:rounded-[2rem] flex flex-wrap items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
            <div>
              <p className="text-[10px] font-black uppercase text-blue-700 tracking-wider">
                Filter Struktur SOTK Aktif
              </p>
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <span>{filterSotk.nama}</span>
                {filterSotk.shortName && (
                  <span className="text-slate-500 font-medium">({filterSotk.shortName})</span>
                )}
                <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900 font-extrabold">
                  {filterSotk.targetNips.size} Pegawai Terpilih
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('struktur')}
              className="px-3 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-100/60 font-bold text-xs border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <i className="bi bi-diagram-3-fill text-xs"></i>
              <span>Lihat Bagan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterSotk(null);
                setFilterUnit('Semua Unit');
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <i className="bi bi-x-circle-fill text-xs"></i>
              <span>Hapus Filter SOTK</span>
            </button>
          </div>
        </div>
      )}

      {viewMode === 'struktur' ? (
        <div className="space-y-4 animate-fadeIn">
          <StrukturOrganisasiTree
            allPegawai={pegawaiList}
            onSelectNode={handleSelectOrganisasiNode}
            onViewPegawaiDetail={(peg) => navigate(`/pegawai/${peg.nip}`)}
          />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6 animate-fadeIn">
          {loading ? Array(6).fill(0).map((_,i) => <div key={i} className="h-32 md:h-44 bg-white rounded-2xl md:rounded-[3rem] animate-pulse"></div>) : 
           (filteredPegawai || []).map((p, i) => {
             const pNip = (p.nip || '').replace(/\D/g, '');
             const isDup = duplicateNips.includes(pNip);
             const isInv = invalidItems.some(inv => inv.id === p.id || (inv.nip && inv.nip === p.nip));
             
             return (
               <div key={`${p.nip}-${i}`} onClick={() => navigate(`/pegawai/${p.nip}`)} className={`bg-white p-3 md:p-7 rounded-xl md:rounded-[3rem] border shadow-sm group hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden ${isDup || isInv ? 'border-rose-200 bg-rose-50/10' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-3 md:gap-6">
                     <div className="flex items-center shrink-0">
                       <input 
                         type="checkbox" 
                         checked={selectedNipsForBulk.includes(p.nip)}
                         onChange={(e) => {
                           e.stopPropagation();
                           const nip = p.nip;
                           setSelectedNipsForBulk(prev => 
                             prev.includes(nip) ? prev.filter(n => n !== nip) : [...prev, nip]
                           );
                         }}
                         onClick={(e) => e.stopPropagation()}
                         className="w-4 h-4 md:w-5 md:h-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer shrink-0 transition-all"
                       />
                     </div>
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
                           <span className="px-1 md:px-2 py-0.5 bg-slate-50 text-slate-600 text-[5px] md:text-[7px] font-bold rounded border border-slate-200 uppercase truncate max-w-[130px]" title={p.unitKerja || normalizeUnitName(p.unitKerja, p.bagian, p.jabatan)}>
                             {p.unitKerja && p.unitKerja !== 'DJKI' ? p.unitKerja : (p.bagian || normalizeUnitName(p.unitKerja, p.bagian, p.jabatan) || '-')}
                           </span>
                        </div>
                        {(() => {
                          const atasanInfo = getAtasanLangsung(p, pegawaiList);
                          return (
                            <div className="text-[6px] md:text-[8px] text-slate-500 font-semibold truncate mt-1 flex items-center gap-1" title={atasanInfo.dasarPenilaian}>
                              <i className="bi bi-shield-check text-blue-600"></i>
                              <span>Penilai: {atasanInfo.atasan ? atasanInfo.atasan.nama : 'Menteri Hukum RI'}</span>
                            </div>
                          );
                        })()}
                     </div>
                  </div>
                  {isInv && <div className="absolute top-0 right-0 px-2 py-0.5 bg-rose-600 text-white text-[6px] font-black uppercase tracking-tighter">DATA BERMASALAH</div>}
                  {isDup && !isInv && <div className="absolute top-0 right-0 px-2 py-0.5 bg-rose-500 text-white text-[6px] font-black uppercase tracking-tighter">DUPLIKAT</div>}
               </div>
             );
           })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-150 text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  <th className="py-4 px-4 w-12 text-center">
                    <input 
                      type="checkbox"
                      checked={filteredPegawai.length > 0 && filteredPegawai.every(p => selectedNipsForBulk.includes(p.nip))}
                      onChange={(e) => {
                        const visibleNips = (filteredPegawai || []).map(p => p.nip).filter(Boolean);
                        if (e.target.checked) {
                          setSelectedNipsForBulk(prev => Array.from(new Set([...prev, ...visibleNips])));
                        } else {
                          setSelectedNipsForBulk(prev => prev.filter(n => !visibleNips.includes(n)));
                        }
                      }}
                      className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer transition-all"
                      title="Pilih / Bersihkan Semua Yang Tampil"
                    />
                  </th>
                  <th className="py-4 px-2 w-12 text-center font-bold">No</th>
                  <th className="py-4 px-4">Pegawai / NIP</th>
                  <th className="py-4 px-4">Jabatan & Unit Kerja</th>
                  <th className="py-4 px-4">Pangkat & Golongan</th>
                  <th className="py-4 px-4">Status & Jenis</th>
                  <th className="py-4 px-4">Pendidikan & Jurusan</th>
                  <th className="py-4 px-4 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[10px] md:text-xs">
                {loading ? (
                  Array(6).fill(0).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan={8} className="py-5 px-6">
                        <div className="h-6 bg-gray-100 rounded-xl w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredPegawai.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <i className="bi bi-person-x text-4xl text-gray-300"></i>
                        <p className="font-black text-xs md:text-sm text-gray-600 uppercase tracking-tight">Tidak Ada Pegawai Yang Sesuai</p>
                        <p className="text-[10px] text-gray-400 font-bold">Silakan sesuaikan kata kunci pencarian atau bersihkan filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPegawai.map((p, i) => {
                    const pNip = (p.nip || '').replace(/\D/g, '');
                    const isDup = duplicateNips.includes(pNip);
                    const isInv = invalidItems.some(inv => inv.id === p.id || (inv.nip && inv.nip === p.nip));
                    const isSelected = selectedNipsForBulk.includes(p.nip);

                    return (
                      <tr 
                        key={`${p.nip}-${i}`}
                        onClick={() => navigate(`/pegawai/${p.nip}`)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected ? 'bg-blue-50/60 hover:bg-blue-50/90' : isDup || isInv ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const nip = p.nip;
                              setSelectedNipsForBulk(prev => 
                                prev.includes(nip) ? prev.filter(n => n !== nip) : [...prev, nip]
                              );
                            }}
                            className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer transition-all"
                          />
                        </td>

                        {/* No */}
                        <td className="py-3.5 px-2 text-center font-mono text-[9px] md:text-[10px] text-gray-400 font-bold">
                          {i + 1}
                        </td>

                        {/* Pegawai / NIP */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-11 w-11 rounded-2xl overflow-hidden border-2 border-white shadow-md group-hover:scale-105 transition-transform shrink-0 flex items-center justify-center font-black ${isDup || isInv ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                              {p.foto ? (
                                <img src={getPhotoUrl(p.foto)} className="h-full w-full object-cover" referrerPolicy="no-referrer" alt="" />
                              ) : (
                                <span className="text-sm font-black">{p.nama ? p.nama.charAt(0) : '?'}</span>
                              )}
                            </div>
                            <div className="min-w-0 max-w-[240px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-black text-[11px] md:text-[12px] truncate ${isDup || isInv ? 'text-rose-700' : 'text-gray-950 group-hover:text-blue-600'} transition-colors`}>
                                  {formatPegawaiName(p.nama || '(Nama Kosong)')}
                                </span>
                                {p.gender && (
                                  <span className={`px-1.5 py-0.2 rounded text-[7px] font-black uppercase ${p.gender === 'L' ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-pink-50 text-pink-600 border border-pink-100'}`}>
                                    {p.gender === 'L' ? 'L' : 'P'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 font-mono text-[8px] md:text-[9px] text-gray-400">
                                <span>NIP. {p.nip || '-'}</span>
                              </div>
                              {(isDup || isInv) && (
                                <div className="mt-1">
                                  <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[7px] font-black uppercase tracking-tighter inline-flex items-center gap-1">
                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                    {isInv ? 'DATA BERMASALAH' : 'DUPLIKAT'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Jabatan & Unit Kerja */}
                        <td className="py-3.5 px-4 max-w-[260px]">
                          <div className="font-bold text-gray-900 text-[10px] md:text-[11px] leading-snug">
                            {p.jabatan || '-'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[8px] md:text-[9px] text-gray-500 font-bold truncate max-w-[190px]" title={p.unitKerja || normalizeUnitName(p.unitKerja, p.bagian, p.jabatan)}>
                              {p.unitKerja && p.unitKerja !== 'DJKI' ? p.unitKerja : (p.bagian || normalizeUnitName(p.unitKerja, p.bagian, p.jabatan) || '-')}
                            </span>
                            {p.klasifikasiJabatan && p.klasifikasiJabatan !== '-' && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[6px] md:text-[7px] font-black rounded uppercase">
                                {p.klasifikasiJabatan}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const atasanInfo = getAtasanLangsung(p, pegawaiList);
                            return (
                              <div className="flex items-center gap-1 mt-1 text-[8px] md:text-[9px] text-blue-700 font-semibold truncate bg-blue-50/70 px-1.5 py-0.5 rounded border border-blue-100/80 max-w-fit" title={atasanInfo.dasarPenilaian}>
                                <i className="bi bi-shield-check text-blue-600"></i>
                                <span>Penilai: {atasanInfo.atasan ? atasanInfo.atasan.nama : 'Menteri Hukum RI'}</span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Pangkat & Golongan */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 text-[8px] md:text-[9px] font-black rounded-lg border uppercase ${
                              isDup || isInv ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              {p.golRuang || '-'}
                            </span>
                          </div>
                          {p.pangkat && (
                            <div className="text-[8px] md:text-[9px] text-gray-500 font-semibold mt-1 truncate max-w-[150px]">
                              {p.pangkat}
                            </div>
                          )}
                        </td>

                        {/* Status & Jenis */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-0.5 text-[7px] md:text-[8px] font-black rounded-lg uppercase ${
                              (p.status || 'Aktif') === 'Aktif' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : (p.status || '') === 'Tugas Belajar'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}>
                              {p.status || 'Aktif'}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[7px] md:text-[8px] font-black rounded-lg uppercase">
                              {p.jenisPegawai || 'PNS'}
                            </span>
                          </div>
                        </td>

                        {/* Pendidikan & Jurusan */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <div className="font-black text-gray-900 text-[9px] md:text-[10px] uppercase">
                            {p.pendidikan || '-'}
                          </div>
                          <div className="text-[8px] md:text-[9px] text-gray-500 font-semibold truncate mt-0.5 uppercase" title={p.jurusan || ''}>
                            {p.jurusan || '-'}
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/pegawai/${p.nip}`)}
                              className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-xs cursor-pointer"
                              title="Lihat Profil Lengkap"
                            >
                              <i className="bi bi-person-lines-fill text-xs"></i>
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPegawaiToDelete(p);
                                  setIsConfirmOpen(true);
                                }}
                                className="h-8 w-8 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center shadow-xs cursor-pointer"
                                title="Hapus Pegawai"
                              >
                                <i className="bi bi-trash3-fill text-xs"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                          <div className="w-full mt-3 space-y-1 text-left">
                            <label className="text-[8px] font-black uppercase text-gray-400">Atau Tempel Link Google Drive</label>
                            <input 
                              type="text" 
                              className="w-full px-2.5 py-1.5 text-[9px] font-mono bg-white border border-gray-200 rounded-lg text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="https://lh3.googleusercontent.com/d/..."
                              value={formData.foto || ''}
                              onChange={e => setFormData({ ...formData, foto: formatDrivePhotoUrl(e.target.value.trim()) })}
                            />
                          </div>
                       </div>
                    </div>
                 </section>

                 <section className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3 md:gap-4"><div className="h-6 md:h-8 w-1.5 md:w-2 bg-indigo-600 rounded-full"></div><h5 className="text-[10px] md:text-[11px] font-black text-gray-950 uppercase tracking-widest">B. Jabatan & Penempatan (Auto)</h5></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <div className="sm:col-span-2"><label className={labelClass}>Nama Jabatan</label><input type="text" className={inputClass} value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} /></div>
                        <div><label className={labelClass}>Jenis Jabatan</label><input type="text" className={inputClass} value={formData.jenisJabatan || ''} onChange={e => setFormData({...formData, jenisJabatan: e.target.value})} /></div>
                        <div><label className={labelClass}>Klasifikasi Jabatan</label><input type="text" className={inputClass} value={formData.klasifikasiJabatan || ''} onChange={e => setFormData({...formData, klasifikasiJabatan: e.target.value})} /></div>
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
                       <div><label className={labelClass}>Status Aktif</label><select className={inputClass} value={formData.status || 'Aktif'} onChange={e => setFormData({...formData, status: e.target.value === 'Pensiun' ? 'Tidak Aktif' : e.target.value})}><option value="Aktif">AKTIF</option><option value="Tidak Aktif">TIDAK AKTIF</option><option value="Pensiun">PENSIUN (OTOMATIS TIDAK AKTIF)</option><option value="Tugas Belajar">TUGAS BELAJAR</option></select></div>
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
                       <AutocompleteInput
                         label="Jenjang Pendidikan Terakhir"
                         labelClass={labelClass}
                         className={inputClass}
                         value={formData.pendidikan || ''}
                         onChange={val => setFormData({...formData, pendidikan: val})}
                         options={JENJANG_PENDIDIKAN_LIST}
                         placeholder="exp: S1 / S2 / D3"
                       />
                       <AutocompleteInput
                         label="Program Studi / Jurusan"
                         labelClass={labelClass}
                         className={inputClass}
                         value={formData.jurusan || ''}
                         onChange={val => setFormData({...formData, jurusan: val})}
                         options={JURUSAN_LIST}
                         placeholder="Pencarian Program Studi / Jurusan..."
                         containerClass="sm:col-span-2"
                       />
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

      {showBulkSummary && (
        <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm animate-fadeIn" onClick={() => setShowBulkSummary(false)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-modalEnter border border-white/20 flex flex-col max-h-[85vh] z-50">
            <div className="p-6 md:p-8 bg-gray-50 border-b flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-lg md:text-xl font-black uppercase text-gray-950 tracking-tighter">Ringkasan Pegawai Terpilih</h4>
                <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Personnel Selection Summary ({selectedNipsForBulk.length} Orang)</p>
              </div>
              <button onClick={() => setShowBulkSummary(false)} className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white border border-gray-100 rounded-xl transition-all">
                <i className="bi bi-x-lg text-lg"></i>
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              {/* Copy Tools */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    const selectedList = pegawaiList.filter(p => p.nip && selectedNipsForBulk.includes(p.nip));
                    const text = selectedList.map((p, idx) => `${idx + 1}. ${p.nama} (NIP. ${p.nip}) - ${p.jabatan || '-'}`).join('\n');
                    navigator.clipboard.writeText(text);
                    alert("Daftar info pegawai berhasil disalin ke clipboard!");
                  }}
                  className="p-3 bg-blue-50 hover:bg-blue-100/70 text-blue-600 rounded-2xl text-[9px] md:text-[10px] font-black uppercase flex flex-col items-center justify-center gap-1.5 border border-blue-100 transition-all text-center cursor-pointer"
                >
                  <i className="bi bi-clipboard-data text-base"></i>
                  Salin Info Pegawai
                </button>
                
                <button 
                  type="button"
                  onClick={() => {
                    const selectedList = pegawaiList.filter(p => p.nip && selectedNipsForBulk.includes(p.nip));
                    const text = selectedList.map(p => p.email || '').filter(Boolean).join(', ');
                    navigator.clipboard.writeText(text);
                    alert("Daftar email berhasil disalin ke clipboard!");
                  }}
                  className="p-3 bg-indigo-50 hover:bg-indigo-100/70 text-indigo-600 rounded-2xl text-[9px] md:text-[10px] font-black uppercase flex flex-col items-center justify-center gap-1.5 border border-indigo-100 transition-all text-center cursor-pointer"
                >
                  <i className="bi bi-envelope-at text-base"></i>
                  Salin Semua Email
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    const selectedList = pegawaiList.filter(p => p.nip && selectedNipsForBulk.includes(p.nip));
                    const text = selectedList.map(p => p.noHp || '').filter(Boolean).join(', ');
                    navigator.clipboard.writeText(text);
                    alert("Daftar nomor HP berhasil disalin ke clipboard!");
                  }}
                  className="p-3 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-600 rounded-2xl text-[9px] md:text-[10px] font-black uppercase flex flex-col items-center justify-center gap-1.5 border border-emerald-100 transition-all text-center cursor-pointer"
                >
                  <i className="bi bi-telephone text-base"></i>
                  Salin Semua No HP/WA
                </button>
              </div>

              {/* Selected List - Table */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[8px] md:text-[9px] font-black uppercase tracking-wider text-gray-400">
                      <th className="p-3 text-center w-12">No</th>
                      <th className="p-3">Nama / NIP</th>
                      <th className="p-3">Jabatan</th>
                      <th className="p-3">Unit Kerja</th>
                      <th className="p-3 text-center w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-[10px] md:text-xs">
                    {pegawaiList.filter(p => p.nip && selectedNipsForBulk.includes(p.nip)).map((p, index) => (
                      <tr key={`${p.nip || p.id || 'peg'}-${index}`} className="hover:bg-gray-50/50">
                        <td className="p-3 text-center font-bold text-gray-400">{index + 1}</td>
                        <td className="p-3">
                          <p className="font-black text-gray-900 leading-tight">{p.nama}</p>
                          <p className="text-[8px] font-mono text-gray-400 mt-0.5">NIP. {p.nip}</p>
                        </td>
                        <td className="p-3 text-gray-700 font-medium">{p.jabatan || '-'}</td>
                        <td className="p-3 text-gray-500 font-bold uppercase text-[9px] tracking-wide">{p.unitKerja?.replace('Direktorat ', '').toUpperCase() || '-'}</td>
                        <td className="p-3 text-center">
                          <button 
                            type="button"
                            onClick={() => setSelectedNipsForBulk(prev => prev.filter(n => n !== p.nip))}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                            title="Batalkan Pilihan"
                          >
                            <i className="bi bi-x-circle text-sm"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t shrink-0 flex gap-3">
              <button 
                type="button"
                onClick={handleExportSelectedExcel}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <i className="bi bi-file-earmark-spreadsheet-fill text-sm"></i>
                Ekspor Excel Pegawai Terpilih
              </button>
              <button 
                type="button"
                onClick={() => setShowBulkSummary(false)}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-sm hover:bg-gray-50 transition-all text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedNipsForBulk.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-gray-950 text-white px-5 py-3 md:py-4 rounded-3xl shadow-2xl flex items-center gap-4 md:gap-6 border border-white/15 animate-slideUp max-w-[90vw]">
          <div className="flex items-center gap-2 border-r border-white/20 pr-4 shrink-0">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">{selectedNipsForBulk.length} Terpilih</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              type="button"
              onClick={handleExportSelectedExcel}
              className="px-3 md:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black text-[8px] md:text-[10px] uppercase transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
            >
              <i className="bi bi-file-earmark-spreadsheet"></i>
              Export
            </button>
            <button 
              type="button"
              onClick={() => setShowBulkSummary(true)}
              className="px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[8px] md:text-[10px] uppercase transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
            >
              <i className="bi bi-eye"></i>
              Buka
            </button>
            <button 
              type="button"
              onClick={() => setSelectedNipsForBulk([])}
              className="px-2 md:px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-black text-[8px] md:text-[10px] uppercase transition-all flex items-center gap-1 text-white/80 cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PegawaiPage;
