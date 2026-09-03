import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { 
  DEFAULT_HOLIDAYS, 
  parseSinglePdf, 
  Holiday, 
  ParsedAttendance, 
  isHariMasukUM, 
  getIsoDateStr,
  ensurePdfJsLoaded
} from '../pdfParserUtils';
import { 
  savePdfToStore, 
  getAllStoredPdfs, 
  getStoredPdfById,
  getStoredPdfUrl,
  deletePdfFromStore, 
  deleteStoredPdfsByMonth,
  clearAllStoredPdfs, 
  fileToBase64, 
  formatBytes, 
  deriveMonthFolder, 
  formatMonthFolderLabel, 
  base64ToBlob,
  saveParsedResultsToIndexedDb,
  getAllParsedResultsFromIndexedDb,
  clearParsedResultsFromIndexedDb,
  StoredPdfRecord 
} from '../pdfStorageUtils';
import { PresensiNavigationHeader } from '../components/PresensiNavigationHeader';
import { uploadFileToDrive } from '../spreadsheetService';

// Tariff Configuration Interface per Golongan (PMK Standard)
export interface TariffConfig {
  gol12Rate: number; // Golongan I & II: Rp 35.000
  gol12Tax: number;  // PPh 0%
  gol3Rate: number;  // Golongan III: Rp 37.000
  gol3Tax: number;   // PPh 5%
  gol4Rate: number;  // Golongan IV: Rp 41.000
  gol4Tax: number;   // PPh 15%
}

export interface ParseErrorRecord {
  id: string;
  fileName: string;
  fileSize?: number;
  errorMessage: string;
  timestamp: string;
}

export const DEFAULT_TARIFF_CONFIG: TariffConfig = {
  gol12Rate: 35000,
  gol12Tax: 0,
  gol3Rate: 37000,
  gol3Tax: 5,
  gol4Rate: 41000,
  gol4Tax: 15
};

// Helper to enrich parsed attendance with Master Pegawai database if available
export const enrichWithMasterPegawai = (record: ParsedAttendance): ParsedAttendance => {
  try {
    const raw = localStorage.getItem('portal_pegawai_db');
    if (!raw) return record;
    const employees = JSON.parse(raw);
    if (!Array.isArray(employees)) return record;

    const matched = employees.find((p: any) => {
      const cleanPnip = (p.nip || '').replace(/\s+/g, '');
      const cleanRnip = (record.nip || '').replace(/\s+/g, '');
      const matchNip = cleanPnip && cleanRnip && cleanPnip !== '-' && cleanPnip === cleanRnip;
      const matchNama = p.nama && record.nama && p.nama.toLowerCase().trim() === record.nama.toLowerCase().trim();
      return matchNip || matchNama;
    });

    if (matched) {
      const gol = matched.golRuang || matched.golongan || matched.pangkat;
      const jab = matched.jabatan;
      const dept = matched.unitKerja;
      return {
        ...record,
        golongan: (!record.golongan || record.golongan === '-' || record.golongan.trim() === '') && gol ? gol : record.golongan,
        jabatan: (!record.jabatan || record.jabatan === '-' || record.jabatan.trim() === '') && jab ? jab : record.jabatan,
        departemen: (!record.departemen || record.departemen === '-' || record.departemen.trim() === '') && dept ? dept : record.departemen,
      };
    }
  } catch (err) {
    console.error('Error enriching from master pegawai:', err);
  }
  return record;
};

// Helper to sanitize tariff configuration
export const sanitizeTariffConfig = (cfg: any): TariffConfig => {
  return {
    gol12Rate: typeof cfg?.gol12Rate === 'number' && !isNaN(cfg.gol12Rate) ? cfg.gol12Rate : DEFAULT_TARIFF_CONFIG.gol12Rate,
    gol12Tax: typeof cfg?.gol12Tax === 'number' && !isNaN(cfg.gol12Tax) ? cfg.gol12Tax : DEFAULT_TARIFF_CONFIG.gol12Tax,
    gol3Rate: typeof cfg?.gol3Rate === 'number' && !isNaN(cfg.gol3Rate) ? cfg.gol3Rate : DEFAULT_TARIFF_CONFIG.gol3Rate,
    gol3Tax: typeof cfg?.gol3Tax === 'number' && !isNaN(cfg.gol3Tax) ? cfg.gol3Tax : DEFAULT_TARIFF_CONFIG.gol3Tax,
    gol4Rate: typeof cfg?.gol4Rate === 'number' && !isNaN(cfg.gol4Rate) ? cfg.gol4Rate : DEFAULT_TARIFF_CONFIG.gol4Rate,
    gol4Tax: typeof cfg?.gol4Tax === 'number' && !isNaN(cfg.gol4Tax) ? cfg.gol4Tax : DEFAULT_TARIFF_CONFIG.gol4Tax,
  };
};

// Safe date formatting helpers
export const formatDateTimeSafe = (dateVal?: string | number | null): string => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '-';
  }
};

export const formatTimeOnlySafe = (dateVal?: string | number | null): string => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    return '-';
  }
};

// Helper to calculate Uang Makan based on Golongan PMK Standards
export const calculateUangMakanByGolongan = (
  golonganRaw: string, 
  daysCount: number, 
  config: TariffConfig
) => {
  const safeConfig = sanitizeTariffConfig(config);
  const gol = (golonganRaw || '').toUpperCase().trim();
  let rate = safeConfig.gol3Rate;
  let taxPercent = safeConfig.gol3Tax;
  let categoryName = 'Golongan III';

  // Check Roman numerals (IV, III, II, I) or Arabic numbers (4, 3, 2, 1) or text representations
  const isGol4 = /(^|[^\w])(IV|4)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN IV') || gol.includes('GOL IV') || gol.includes('GOLONGAN 4') || gol.includes('GOL 4') || gol.includes('PEMBINA') || gol.includes('UTAMA');
  const isGol3 = /(^|[^\w])(III|3)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN III') || gol.includes('GOL III') || gol.includes('GOLONGAN 3') || gol.includes('GOL 3') || gol.includes('PENATA');
  const isGol2 = /(^|[^\w])(II|2)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN II') || gol.includes('GOL II') || gol.includes('GOLONGAN 2') || gol.includes('GOL 2') || gol.includes('PENGATUR');
  const isGol1 = /(^|[^\w])(I|1)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN I') || gol.includes('GOL I') || gol.includes('GOLONGAN 1') || gol.includes('GOL 1') || gol.includes('JURU');

  if (isGol4) {
    rate = safeConfig.gol4Rate;
    taxPercent = safeConfig.gol4Tax;
    categoryName = 'Golongan IV';
  } else if (isGol3) {
    rate = safeConfig.gol3Rate;
    taxPercent = safeConfig.gol3Tax;
    categoryName = 'Golongan III';
  } else if (isGol2) {
    rate = safeConfig.gol12Rate;
    taxPercent = safeConfig.gol12Tax;
    categoryName = 'Golongan II';
  } else if (isGol1) {
    rate = safeConfig.gol12Rate;
    taxPercent = safeConfig.gol12Tax;
    categoryName = 'Golongan I';
  } else {
    rate = safeConfig.gol3Rate;
    taxPercent = safeConfig.gol3Tax;
    categoryName = 'Golongan III';
  }

  const brutoTotal = daysCount * rate;
  const pphTotal = Math.round(brutoTotal * (taxPercent / 100));
  const netTotal = brutoTotal - pphTotal;

  return {
    categoryName,
    rate,
    taxPercent,
    brutoTotal,
    pphTotal,
    netTotal
  };
};

const UangMakanPage: React.FC = () => {
  const { user, logActivity } = useAuth();

  // Active View Tab: Dashboard | Rekap Pegawai | Detail Absensi | Kalender Libur
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rekap_pegawai' | 'detail_absensi' | 'kalender_libur'>('dashboard');

  // Tariff Config State with defensive sanitization
  const [tariffConfig, setTariffConfig] = useState<TariffConfig>(() => {
    const saved = localStorage.getItem('um_tariff_config');
    if (saved) {
      try { 
        return sanitizeTariffConfig(JSON.parse(saved)); 
      } catch (e) { 
        return DEFAULT_TARIFF_CONFIG; 
      }
    }
    return DEFAULT_TARIFF_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem('um_tariff_config', JSON.stringify(tariffConfig));
  }, [tariffConfig]);

  // Holiday Calendar States
  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const saved = localStorage.getItem('absen_holidays');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { }
    }
    return DEFAULT_HOLIDAYS;
  });

  useEffect(() => {
    localStorage.setItem('absen_holidays', JSON.stringify(holidays));
  }, [holidays]);

  // Form for New Holiday Entry
  const [newHolidayDate, setNewHolidayDate] = useState<string>('');
  const [newHolidayName, setNewHolidayName] = useState<string>('');

  // Persistent Parsed Results State with defensive validation & IndexedDB storage
  const [results, setResults] = useState<ParsedAttendance[]>(() => {
    const saved = localStorage.getItem('absen_pdf_parsed_results');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        if (Array.isArray(parsed)) {
          return parsed.filter(item => item && typeof item === 'object' && Array.isArray(item.days));
        }
      } catch (e) { return []; }
    }
    return [];
  });

  // Auto-restore cached results from IndexedDB on initial mount if memory/localStorage is empty
  useEffect(() => {
    let isMounted = true;
    const restoreFromIndexedDb = async () => {
      try {
        const cachedResults = await getAllParsedResultsFromIndexedDb();
        if (isMounted && cachedResults && cachedResults.length > 0) {
          setResults(prev => {
            if (prev.length === 0) return cachedResults;
            return prev;
          });
        }
      } catch (err) {
        console.warn('Gagal memulihkan data hasil dari IndexedDB:', err);
      }
    };
    restoreFromIndexedDb();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    // 1. Always persist to IndexedDB (virtually unlimited quota for 1000+ files)
    if (results.length > 0) {
      saveParsedResultsToIndexedDb(results);
    } else {
      clearParsedResultsFromIndexedDb();
    }

    // 2. Safe local storage fallback (ignore QuotaExceededError)
    try {
      localStorage.setItem('absen_pdf_parsed_results', JSON.stringify(results));
    } catch (e) {
      // LocalStorage is capped at 5MB, IndexedDB will handle the real persistence
      console.warn('LocalStorage kuota penuh untuk hasil olah presensi. IndexedDB aktif mengamankan data.');
    }
  }, [results]);

  // Archive Processing States (Proses dari Arsip Tersimpan)
  const [isProcessingArchive, setIsProcessingArchive] = useState<boolean>(false);
  const [archiveProgress, setArchiveProgress] = useState<{ current: number; total: number; fileName: string }>({
    current: 0,
    total: 0,
    fileName: ''
  });

  // Bulk Upload States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [parseProgress, setParseProgress] = useState({
    current: 0,
    total: 0,
    currentFileName: '',
    success: 0,
    failed: 0
  });

  const [parseErrors, setParseErrors] = useState<ParseErrorRecord[]>(() => {
    const saved = localStorage.getItem('absen_pdf_parse_errors');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { return []; }
    }
    return [];
  });
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('absen_pdf_parse_errors', JSON.stringify(parseErrors));
  }, [parseErrors]);

  const [skippedDuplicatesCount, setSkippedDuplicatesCount] = useState<number>(0);
  const [duplicateSkippedNames, setDuplicateSkippedNames] = useState<string[]>([]);
  const [accumulateMode, setAccumulateMode] = useState<boolean>(true);

  // Stored Drive PDF Archive States (IndexedDB per month)
  const [storedPdfs, setStoredPdfs] = useState<StoredPdfRecord[]>([]);
  const [selectedMonthFolder, setSelectedMonthFolder] = useState<string>('all');
  const [pdfSearchTerm, setPdfSearchTerm] = useState<string>('');
  const [pdfPreviewModal, setPdfPreviewModal] = useState<StoredPdfRecord | null>(null);

  // Table Search & Pagination & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterGolongan, setFilterGolongan] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [detailCurrentPage, setDetailCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;
  const detailItemsPerPage = 25;

  // New interactive states
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<ParsedAttendance | null>(null);
  const [editingGolongan, setEditingGolongan] = useState<{ index: number; currentGol: string; newGol: string; empName: string; empNip: string } | null>(null);
  const [isSyncingMaster, setIsSyncingMaster] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Notification Toast State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Auto-dismiss notification toast
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load stored PDF files from IndexedDB safely
  const reloadStoredPdfs = async () => {
    try {
      const list = await getAllStoredPdfs();
      if (Array.isArray(list)) {
        list.sort((a, b) => {
          const tA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
          const tB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
          return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
        });
        setStoredPdfs(list);
      } else {
        setStoredPdfs([]);
      }
    } catch (err) {
      console.error('Gagal memuat arsip PDF tersimpan:', err);
      setStoredPdfs([]);
    }
  };

  useEffect(() => {
    reloadStoredPdfs();
  }, []);

  // Sync Golongan, Jabatan, and Departemen from Master Pegawai Database
  const handleSyncGolonganFromMaster = () => {
    try {
      setIsSyncingMaster(true);
      const raw = localStorage.getItem('portal_pegawai_db');
      if (!raw) {
        setNotification({ message: 'Data Master Pegawai belum tersimpan di cache. Silakan buka halaman Pegawai terlebih dahulu.', type: 'info' });
        setIsSyncingMaster(false);
        return;
      }
      const employees = JSON.parse(raw);
      if (!Array.isArray(employees) || employees.length === 0) {
        setNotification({ message: 'Data Master Pegawai kosong.', type: 'error' });
        setIsSyncingMaster(false);
        return;
      }

      let updatedCount = 0;
      setResults(prev => {
        return prev.map(rec => {
          const enriched = enrichWithMasterPegawai(rec);
          if (
            enriched.golongan !== rec.golongan ||
            enriched.jabatan !== rec.jabatan ||
            enriched.departemen !== rec.departemen
          ) {
            updatedCount++;
            return enriched;
          }
          return rec;
        });
      });

      setNotification({ message: `Sinkronisasi berhasil! ${updatedCount} data pegawai diperbarui dengan golongan & jabatan resmi dari Master Pegawai.`, type: 'success' });
      logActivity('UPDATE', 'Uang Makan', `Menyinkronkan data golongan & jabatan ${updatedCount} pegawai dari Master Pegawai.`);
    } catch (err: any) {
      setNotification({ message: 'Gagal menyinkronkan data: ' + err.message, type: 'error' });
    } finally {
      setIsSyncingMaster(false);
    }
  };

  // Delete individual employee record
  const handleDeleteEmployee = (index: number, empName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Data Pegawai Dari Rekap?',
      description: `Apakah Anda yakin ingin menghapus data rekapitulasi untuk "${empName}"?`,
      confirmText: 'Ya, Hapus',
      isDanger: true,
      onConfirm: () => {
        setResults(prev => prev.filter((_, i) => i !== index));
        setNotification({ message: `Data pegawai "${empName}" berhasil dihapus dari rekap.`, type: 'success' });
        logActivity('DELETE', 'Uang Makan', `Menghapus data pegawai ${empName} dari rekapitulasi Uang Makan.`);
        setConfirmModal(null);
      }
    });
  };

  // Clear all parsed results
  const handleClearAllResults = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Semua Hasil Rekapitulasi?',
      description: `Apakah Anda yakin ingin menghapus seluruh (${results.length}) data rekapitulasi uang makan pegawai yang sudah diproses?`,
      confirmText: 'Ya, Hapus Semua Hasil',
      isDanger: true,
      onConfirm: () => {
        setResults([]);
        localStorage.removeItem('absen_pdf_parsed_results');
        setNotification({ message: 'Seluruh data rekapitulasi uang makan berhasil dibersihkan.', type: 'success' });
        logActivity('DELETE', 'Uang Makan', 'Membersihkan seluruh data rekapitulasi uang makan.');
        setConfirmModal(null);
      }
    });
  };

  // Save manual edit Golongan
  const handleSaveEditedGolongan = () => {
    if (!editingGolongan) return;
    const { index, newGol, empName } = editingGolongan;
    setResults(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          golongan: newGol.trim() || '-'
        };
      }
      return next;
    });
    setNotification({ message: `Golongan pegawai ${empName} diperbarui menjadi ${newGol}.`, type: 'success' });
    logActivity('UPDATE', 'Uang Makan', `Mengubah golongan pegawai ${empName} menjadi ${newGol}`);
    setEditingGolongan(null);
  };

  // Holiday Management Functions
  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) {
      setNotification({ message: 'Mohon isi tanggal dan keterangan hari libur / cuti bersama.', type: 'error' });
      return;
    }

    if (holidays.some(h => h.date === newHolidayDate)) {
      setNotification({ message: `Tanggal ${newHolidayDate} sudah terdaftar sebagai hari libur.`, type: 'info' });
      return;
    }

    const updated = [...holidays, { date: newHolidayDate, name: newHolidayName.trim() }].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(updated);
    setNewHolidayDate('');
    setNewHolidayName('');
    setNotification({ message: `Hari libur "${newHolidayName}" (${newHolidayDate}) berhasil ditambahkan.`, type: 'success' });
    logActivity('CREATE', 'Uang Makan', `Menambahkan hari libur: ${newHolidayDate} (${newHolidayName})`);
  };

  const handleDeleteHoliday = (date: string, name?: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Hari Libur Dari Kalender?',
      description: `Apakah Anda yakin ingin menghapus tanggal libur ${date} ${name ? `(${name})` : ''} dari kalender kerja?`,
      confirmText: 'Ya, Hapus',
      isDanger: true,
      onConfirm: () => {
        const updated = holidays.filter(h => h.date !== date);
        setHolidays(updated);
        setNotification({ message: `Hari libur ${date} berhasil dihapus.`, type: 'success' });
        logActivity('DELETE', 'Uang Makan', `Menghapus hari libur: ${date}`);
        setConfirmModal(null);
      }
    });
  };

  const handleResetHolidays = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kembalikan Kalender Ke Standar Nasional?',
      description: 'Apakah Anda yakin ingin mereset seluruh kalender hari libur dan cuti bersama ke daftar standar nasional 2025/2026?',
      confirmText: 'Ya, Reset Kalender',
      isDanger: false,
      onConfirm: () => {
        setHolidays(DEFAULT_HOLIDAYS);
        setNotification({ message: 'Kalender libur berhasil direset ke standar nasional.', type: 'success' });
        logActivity('UPDATE', 'Uang Makan', 'Mereset kalender libur ke standar nasional.');
        setConfirmModal(null);
      }
    });
  };

  // Recalculate parsed attendance data when holidays change
  const handleRecalculateAttendanceWithHolidays = () => {
    if (results.length === 0) return;
    
    const holidayDatesSet = new Set(holidays.map(h => h.date));

    const updatedResults = results.map(rec => {
      const updatedDays = rec.days.map(d => {
        const dateIso = d.date ? getIsoDateStr(d.date) : d.dateStr;
        const isHol = holidayDatesSet.has(dateIso);
        const isEff = !d.isWeekend && !isHol;

        let attType = d.attendanceType;
        if (d.isWeekend) attType = 'WEEKEND';
        else if (isHol) attType = 'HOLIDAY';

        return {
          ...d,
          isHoliday: isHol,
          isEffectiveWorkday: isEff,
          attendanceType: attType
        };
      });

      return {
        ...rec,
        days: updatedDays
      };
    });

    setResults(updatedResults);
    alert(`Rekapitulasi berhasil dihitung ulang berdasarkan ${holidays.length} hari libur nasional / cuti bersama.`);
    logActivity('UPDATE', 'Uang Makan', 'Menghitung ulang rekap absensi berdasarkan kalender libur terbaru.');
  };

  // Helper to add files with duplicate check against current queue & drive archive
  const addFilesWithoutDuplicates = (newFiles: File[]) => {
    let skippedCount = 0;
    const skippedNames: string[] = [];
    const seenInBatch = new Set<string>();

    const filteredNewFiles = newFiles.filter(file => {
      const fileKey = `${file.name.toLowerCase()}_${file.size}`;
      const inQueue = selectedFiles.some(f => `${f.name.toLowerCase()}_${f.size}` === fileKey || f.name.toLowerCase() === file.name.toLowerCase());
      const inStoredDrive = storedPdfs.some(sp => sp.fileName.toLowerCase() === file.name.toLowerCase());
      const inBatch = seenInBatch.has(fileKey);

      if (inQueue || inStoredDrive || inBatch) {
        skippedCount++;
        skippedNames.push(file.name);
        return false;
      }
      seenInBatch.add(fileKey);
      return true;
    });

    if (skippedCount > 0) {
      setSkippedDuplicatesCount(prev => prev + skippedCount);
      setDuplicateSkippedNames(prev => [...prev, ...skippedNames]);
    }

    setSelectedFiles(prev => [...prev, ...filteredNewFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFilesWithoutDuplicates(Array.from(e.target.files));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      const pdfFiles = Array.from(e.dataTransfer.files).filter(
        file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      );
      addFilesWithoutDuplicates(pdfFiles);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setSkippedDuplicatesCount(0);
    setDuplicateSkippedNames([]);
  };

  // Batch Parser Queue for Uang Makan PDFs
  const handleParseFiles = async () => {
    if (selectedFiles.length === 0) return;
    setIsParsing(true);
    setParseProgress({
      current: 0,
      total: selectedFiles.length,
      currentFileName: '',
      success: 0,
      failed: 0
    });

    try {
      await ensurePdfJsLoaded();
    } catch (e: any) {
      console.warn('PDF.js init check:', e);
      const errMsg = e?.message || 'Gagal memuat sistem pembaca PDF.js. Periksa koneksi internet Anda.';
      const initErr: ParseErrorRecord = {
        id: `err_init_${Date.now()}`,
        fileName: 'Sistem Pembaca PDF (PDF.js Engine)',
        errorMessage: errMsg,
        timestamp: new Date().toISOString()
      };
      setParseErrors(prev => [initErr, ...prev]);
      setShowErrorDetails(true);
      setNotification({ message: 'Gagal menginisialisasi pustaka PDF: ' + errMsg, type: 'error' });
      setIsParsing(false);
      return;
    }

    const parsedResults: ParsedAttendance[] = [];
    const currentBatchErrors: ParseErrorRecord[] = [];
    // Adapt batch size based on file count to prevent CPU/memory saturation on 1000+ files
    const batchSize = selectedFiles.length > 200 ? 3 : 4;

    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batch = selectedFiles.slice(i, i + batchSize);
      await Promise.all(batch.map(async file => {
        try {
          setParseProgress(prev => ({ ...prev, currentFileName: file.name }));
          
          // Parse PDF using memory-isolated PDF.js (auto cleans pages & destroys document after each file)
          const rawResObj = await parseSinglePdf(file, holidays);
          
          if (!rawResObj || !rawResObj.days || rawResObj.days.length === 0) {
            throw new Error('Tidak ditemukan data/tabel presensi yang valid di dalam berkas PDF ini.');
          }

          const resObj = enrichWithMasterPegawai(rawResObj);
          parsedResults.push(resObj);

          const monthFolder = deriveMonthFolder(resObj.periode);

          // Store native binary Blob to IndexedDB - uses ZERO Base64 memory and 33% less disk space
          const pdfRecord: StoredPdfRecord = {
            id: `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
            monthFolder,
            nip: resObj.nip || '-',
            nama: resObj.nama || '-',
            periode: resObj.periode || '-',
            blob: file,
            parsedResult: resObj
          };

          // Safe storage - local cache failure (e.g. browser quota limit) will never halt or fail attendance processing
          try {
            await savePdfToStore(pdfRecord);
          } catch (storageErr) {
            console.warn('Penyimpanan cache berkas PDF lokal dilewati karena kuota penuh:', storageErr);
          }

          setParseProgress(prev => ({ ...prev, current: prev.current + 1, success: prev.success + 1 }));
        } catch (err: any) {
          console.error(`Error parsing file ${file.name}:`, err);
          const errMsg = err?.message || 'Format berkas tidak sesuai standar atau teks PDF tidak dapat diekstrak.';
          currentBatchErrors.push({
            id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fileName: file.name,
            fileSize: file.size,
            errorMessage: errMsg,
            timestamp: new Date().toISOString()
          });
          setParseProgress(prev => ({ ...prev, current: prev.current + 1, failed: prev.failed + 1 }));
        }
      }));

      // Yield control to browser event loop between batches for garbage collection & smooth UI updates
      await new Promise(resolve => setTimeout(resolve, 15));
    }

    if (currentBatchErrors.length > 0) {
      setParseErrors(prev => [...currentBatchErrors, ...prev]);
      setShowErrorDetails(true);
      setNotification({
        message: `Terdeteksi ${currentBatchErrors.length} berkas PDF mengalami kendala saat parsing. Tombol "Ekspor Log Error (Excel)" siap digunakan.`,
        type: 'error'
      });
    }

    setIsParsing(false);
    await reloadStoredPdfs();

    if (accumulateMode) {
      setResults(prev => {
        const merged = [...prev];
        parsedResults.forEach(newRes => {
          const idx = merged.findIndex(r => r.nip === newRes.nip || (r.nama.toLowerCase() === newRes.nama.toLowerCase() && r.periode === newRes.periode));
          if (idx > -1) {
            merged[idx] = newRes;
          } else {
            merged.push(newRes);
          }
        });
        return merged;
      });
    } else {
      setResults(parsedResults);
    }

    setSelectedFiles([]);
    setSkippedDuplicatesCount(0);
    setDuplicateSkippedNames([]);

    logActivity('CREATE', 'Uang Makan', `Memproses parsing ${parsedResults.length} berkas PDF Uang Makan (${currentBatchErrors.length} gagal) dan menyimpan ke arsip drive.`);
  };

  // Process and calculate Uang Makan directly from all stored PDFs in IndexedDB
  const handleProcessFromStoredArchive = async () => {
    if (storedPdfs.length === 0) {
      setNotification({
        message: 'Belum ada berkas PDF tersimpan di arsip drive browser.',
        type: 'info'
      });
      return;
    }

    setIsProcessingArchive(true);
    setArchiveProgress({ current: 0, total: storedPdfs.length, fileName: '' });

    try {
      await ensurePdfJsLoaded();
    } catch (e: any) {
      const errMsg = e?.message || 'Gagal memuat sistem pembaca PDF.js. Periksa koneksi internet Anda.';
      setNotification({ message: 'Gagal menginisialisasi pustaka PDF: ' + errMsg, type: 'error' });
      setIsProcessingArchive(false);
      return;
    }

    const newParsedList: ParsedAttendance[] = [];
    const errorsList: ParseErrorRecord[] = [];
    const batchSize = storedPdfs.length > 200 ? 3 : 4;

    for (let i = 0; i < storedPdfs.length; i += batchSize) {
      const batch = storedPdfs.slice(i, i + batchSize);
      await Promise.all(batch.map(async (storedPdf) => {
        try {
          setArchiveProgress(prev => ({ ...prev, fileName: storedPdf.fileName }));

          // 1. Check if already has cached parsedResult in full record
          let fullPdf = await getStoredPdfById(storedPdf.id);
          if (!fullPdf) fullPdf = storedPdf;

          if (fullPdf.parsedResult && Array.isArray(fullPdf.parsedResult.days) && fullPdf.parsedResult.days.length > 0) {
            const enriched = enrichWithMasterPegawai(fullPdf.parsedResult);
            newParsedList.push(enriched);
            setArchiveProgress(prev => ({ ...prev, current: prev.current + 1 }));
            return;
          }

          // 2. Otherwise extract from stored blob or base64
          let fileBlob: Blob | null = fullPdf.blob || null;
          if (!fileBlob && fullPdf.base64 && fullPdf.base64.trim() !== '') {
            fileBlob = base64ToBlob(fullPdf.base64);
          }

          if (!fileBlob) {
            throw new Error(`Data fisik berkas ${storedPdf.fileName} tidak ditemukan di IndexedDB.`);
          }

          const fileObj = new File([fileBlob], storedPdf.fileName, { type: 'application/pdf' });
          const rawResObj = await parseSinglePdf(fileObj, holidays);

          if (!rawResObj || !rawResObj.days || rawResObj.days.length === 0) {
            throw new Error('Tidak ditemukan data tabel presensi yang valid di dalam berkas PDF ini.');
          }

          const resObj = enrichWithMasterPegawai(rawResObj);
          newParsedList.push(resObj);

          // Cache parsed result back into IndexedDB record for instantaneous future loads
          try {
            await savePdfToStore({
              ...fullPdf,
              nip: resObj.nip || fullPdf.nip,
              nama: resObj.nama || fullPdf.nama,
              periode: resObj.periode || fullPdf.periode,
              parsedResult: resObj
            });
          } catch (storageErr) {
            // Non-blocking
          }

          setArchiveProgress(prev => ({ ...prev, current: prev.current + 1 }));
        } catch (err: any) {
          console.error(`Error processing stored PDF ${storedPdf.fileName}:`, err);
          errorsList.push({
            id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fileName: storedPdf.fileName,
            fileSize: storedPdf.fileSize,
            errorMessage: err?.message || 'Gagal mengekstrak data presensi dari berkas PDF arsip.',
            timestamp: new Date().toISOString()
          });
          setArchiveProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
      }));

      // Yield control to UI thread
      await new Promise(resolve => setTimeout(resolve, 15));
    }

    if (newParsedList.length > 0) {
      setResults(newParsedList);
      await saveParsedResultsToIndexedDb(newParsedList);
      setNotification({
        message: `Berhasil mengolah & menghitung uang makan untuk ${newParsedList.length} berkas pegawai dari arsip! Tombol "Ekspor Excel Multi-Sheet" kini aktif.`,
        type: 'success'
      });
      logActivity('UPDATE', 'Uang Makan', `Menjalankan proses kalkulasi uang makan dari ${newParsedList.length} berkas arsip PDF.`);
    }

    if (errorsList.length > 0) {
      setParseErrors(prev => [...errorsList, ...prev]);
      setShowErrorDetails(true);
    }

    setIsProcessingArchive(false);
  };

  // Safe On-Demand Preview and Download handlers for 1000+ files
  const handleOpenPdfPreview = async (pdf: StoredPdfRecord) => {
    try {
      let activePdf = pdf;
      if (!pdf.blob && (!pdf.base64 || pdf.base64.trim() === '')) {
        const fullRecord = await getStoredPdfById(pdf.id);
        if (fullRecord) activePdf = fullRecord;
      }
      const url = getStoredPdfUrl(activePdf);
      setPdfPreviewModal({ ...activePdf, fileUrl: url, base64: url });
    } catch (e) {
      setNotification({ message: 'Gagal membuka pratinjau berkas PDF.', type: 'error' });
    }
  };

  const handleDownloadStoredPdf = async (pdf: StoredPdfRecord) => {
    try {
      let activePdf = pdf;
      if (!pdf.blob && (!pdf.base64 || pdf.base64.trim() === '')) {
        const fullRecord = await getStoredPdfById(pdf.id);
        if (fullRecord) activePdf = fullRecord;
      }
      const url = getStoredPdfUrl(activePdf);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = pdf.fileName || 'presensi.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (url.startsWith('blob:')) {
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
      }
    } catch (e) {
      setNotification({ message: 'Gagal mengunduh berkas PDF.', type: 'error' });
    }
  };

  const handleClosePdfPreview = () => {
    if (pdfPreviewModal?.fileUrl && pdfPreviewModal.fileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfPreviewModal.fileUrl);
    }
    setPdfPreviewModal(null);
  };

  const handleDeleteStoredPdf = (pdf: StoredPdfRecord) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Berkas PDF Dari Arsip?',
      description: `Apakah Anda yakin ingin menghapus berkas "${pdf.fileName}" (${formatBytes(pdf.fileSize)}) dari arsip drive folder ${formatMonthFolderLabel(pdf.monthFolder)}?`,
      confirmText: 'Ya, Hapus Berkas',
      isDanger: true,
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          await deletePdfFromStore(pdf.id);
          setStoredPdfs(prev => prev.filter(p => p.id !== pdf.id));
          await reloadStoredPdfs();
          setNotification({ message: `Berkas "${pdf.fileName}" berhasil dihapus dari arsip.`, type: 'success' });
          logActivity('DELETE', 'Uang Makan', `Menghapus berkas PDF ${pdf.fileName} dari arsip drive.`);
        } catch (err: any) {
          console.error('Gagal menghapus file PDF:', err);
          setNotification({ message: 'Gagal menghapus berkas PDF.', type: 'error' });
        } finally {
          setIsActionLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleClearAllStoredPdfs = () => {
    const isFiltered = selectedMonthFolder !== 'all';
    const folderCount = storedPdfs.filter(p => p.monthFolder === selectedMonthFolder).length;

    setConfirmModal({
      isOpen: true,
      title: isFiltered ? `Hapus Arsip PDF (${formatMonthFolderLabel(selectedMonthFolder)})?` : 'Hapus Semua Berkas Arsip PDF?',
      description: isFiltered
        ? `Terdapat ${folderCount} berkas PDF di folder ${formatMonthFolderLabel(selectedMonthFolder)}. Apakah Anda ingin menghapus seluruh arsip PDF atau hanya folder bulan ini?`
        : `Terdapat total ${storedPdfs.length} berkas PDF tersimpan di seluruh folder bulan. Apakah Anda yakin ingin menghapus SEMUA berkas arsip PDF dari IndexedDB lokal? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus Semua Arsip PDF',
      isDanger: true,
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          await clearAllStoredPdfs();
          setStoredPdfs([]);
          await reloadStoredPdfs();
          setNotification({ message: 'Seluruh arsip berkas PDF berhasil dibersihkan.', type: 'success' });
          logActivity('DELETE', 'Uang Makan', 'Membersihkan seluruh arsip drive PDF Uang Makan.');
        } catch (err: any) {
          console.error('Error clearing stored PDFs:', err);
          setNotification({ message: 'Gagal membersihkan arsip PDF: ' + (err.message || 'Terjadi kesalahan.'), type: 'error' });
        } finally {
          setIsActionLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleDeleteCurrentMonthFolder = (folderKey: string) => {
    const count = storedPdfs.filter(p => p.monthFolder === folderKey).length;
    setConfirmModal({
      isOpen: true,
      title: `Hapus Arsip Folder ${formatMonthFolderLabel(folderKey)}?`,
      description: `Apakah Anda yakin ingin menghapus ${count} berkas PDF di folder bulan ${formatMonthFolderLabel(folderKey)}?`,
      confirmText: 'Ya, Hapus Folder Ini',
      isDanger: true,
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          await deleteStoredPdfsByMonth(folderKey);
          setStoredPdfs(prev => prev.filter(p => p.monthFolder !== folderKey));
          await reloadStoredPdfs();
          setSelectedMonthFolder('all');
          setNotification({ message: `Arsip PDF folder ${formatMonthFolderLabel(folderKey)} berhasil dihapus.`, type: 'success' });
          logActivity('DELETE', 'Uang Makan', `Menghapus arsip PDF folder ${folderKey}.`);
        } catch (err: any) {
          console.error('Gagal menghapus folder bulan:', err);
          setNotification({ message: 'Gagal menghapus arsip folder bulan.', type: 'error' });
        } finally {
          setIsActionLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  // Folders per month
  const availableMonthFolders = useMemo(() => {
    const setFolders = new Set<string>();
    storedPdfs.forEach(p => {
      if (p.monthFolder) setFolders.add(p.monthFolder);
    });
    return Array.from(setFolders).sort().reverse();
  }, [storedPdfs]);

  const filteredStoredPdfs = useMemo(() => {
    return storedPdfs.filter(pdf => {
      const matchFolder = selectedMonthFolder === 'all' || pdf.monthFolder === selectedMonthFolder;
      const q = pdfSearchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        pdf.fileName.toLowerCase().includes(q) ||
        pdf.nama.toLowerCase().includes(q) ||
        pdf.nip.includes(q) ||
        pdf.periode.toLowerCase().includes(q);
      return matchFolder && matchSearch;
    });
  }, [storedPdfs, selectedMonthFolder, pdfSearchTerm]);

  // Overall statistics for Uang Makan according to Golongan PMK standards
  const summaryStats = useMemo(() => {
    let totalEmployees = results.length;
    let totalUangMakanDays = 0;
    let totalBruto = 0;
    let totalPph = 0;
    let totalNet = 0;

    results.forEach(r => {
      if (!r || !Array.isArray(r.days)) return;
      const umDays = r.days.filter(isHariMasukUM).length;
      totalUangMakanDays += umDays;

      const calc = calculateUangMakanByGolongan(r.golongan || '', umDays, tariffConfig);
      totalBruto += calc.brutoTotal || 0;
      totalPph += calc.pphTotal || 0;
      totalNet += calc.netTotal || 0;
    });

    return {
      totalEmployees,
      totalUangMakanDays,
      totalBruto,
      totalPph,
      totalNet,
      totalFilesDrive: storedPdfs.length
    };
  }, [results, tariffConfig, storedPdfs]);

  // Analytics and Aggregations for Recharts Dashboard
  const chartAnalyticsData = useMemo(() => {
    if (results.length === 0) {
      return {
        monthlyData: [],
        golonganData: [],
        hasData: false,
        totalNetOverall: 0,
        totalBrutoOverall: 0,
        totalPphOverall: 0,
        totalPegawaiOverall: 0,
        totalHariOverall: 0
      };
    }

    const monthlyMap: Record<string, {
      month: string;
      totalBruto: number;
      totalPph: number;
      totalNet: number;
      gol4Net: number;
      gol3Net: number;
      gol12Net: number;
      pegawaiCount: number;
      totalDays: number;
    }> = {};

    const golonganMap: Record<string, {
      category: string;
      totalNet: number;
      totalBruto: number;
      totalPph: number;
      pegawaiCount: number;
      totalDays: number;
    }> = {
      'Golongan IV': { category: 'Golongan IV', totalNet: 0, totalBruto: 0, totalPph: 0, pegawaiCount: 0, totalDays: 0 },
      'Golongan III': { category: 'Golongan III', totalNet: 0, totalBruto: 0, totalPph: 0, pegawaiCount: 0, totalDays: 0 },
      'Golongan I & II': { category: 'Golongan I & II', totalNet: 0, totalBruto: 0, totalPph: 0, pegawaiCount: 0, totalDays: 0 },
    };

    let totalNetOverall = 0;
    let totalBrutoOverall = 0;
    let totalPphOverall = 0;
    let totalHariOverall = 0;
    const uniqueNips = new Set<string>();

    results.forEach(r => {
      if (!r || !Array.isArray(r.days)) return;
      const umDays = r.days.filter(isHariMasukUM).length;
      const calc = calculateUangMakanByGolongan(r.golongan || '', umDays, tariffConfig);

      totalNetOverall += calc.netTotal;
      totalBrutoOverall += calc.brutoTotal;
      totalPphOverall += calc.pphTotal;
      totalHariOverall += umDays;
      if (r.nip) uniqueNips.add(r.nip);

      let monthLabel = (r.periode || '').trim();
      if (!monthLabel) {
        const firstValidDay = r.days.find(d => d && (d.dateStr || d.date));
        if (firstValidDay) {
          const dStr = firstValidDay.dateStr || (firstValidDay.date ? getIsoDateStr(firstValidDay.date) : '');
          if (dStr && dStr.includes('-')) {
            const parts = dStr.split('-');
            if (parts.length >= 2) {
              monthLabel = `${parts[1]}-${parts[0]}`;
            }
          }
        }
      }
      if (!monthLabel) monthLabel = 'Periode Aktif';

      if (!monthlyMap[monthLabel]) {
        monthlyMap[monthLabel] = {
          month: monthLabel,
          totalBruto: 0,
          totalPph: 0,
          totalNet: 0,
          gol4Net: 0,
          gol3Net: 0,
          gol12Net: 0,
          pegawaiCount: 0,
          totalDays: 0
        };
      }

      monthlyMap[monthLabel].totalBruto += calc.brutoTotal;
      monthlyMap[monthLabel].totalPph += calc.pphTotal;
      monthlyMap[monthLabel].totalNet += calc.netTotal;
      monthlyMap[monthLabel].pegawaiCount += 1;
      monthlyMap[monthLabel].totalDays += umDays;

      if (calc.categoryName.includes('IV')) {
        monthlyMap[monthLabel].gol4Net += calc.netTotal;
        golonganMap['Golongan IV'].totalNet += calc.netTotal;
        golonganMap['Golongan IV'].totalBruto += calc.brutoTotal;
        golonganMap['Golongan IV'].totalPph += calc.pphTotal;
        golonganMap['Golongan IV'].pegawaiCount += 1;
        golonganMap['Golongan IV'].totalDays += umDays;
      } else if (calc.categoryName.includes('III')) {
        monthlyMap[monthLabel].gol3Net += calc.netTotal;
        golonganMap['Golongan III'].totalNet += calc.netTotal;
        golonganMap['Golongan III'].totalBruto += calc.brutoTotal;
        golonganMap['Golongan III'].totalPph += calc.pphTotal;
        golonganMap['Golongan III'].pegawaiCount += 1;
        golonganMap['Golongan III'].totalDays += umDays;
      } else {
        monthlyMap[monthLabel].gol12Net += calc.netTotal;
        golonganMap['Golongan I & II'].totalNet += calc.netTotal;
        golonganMap['Golongan I & II'].totalBruto += calc.brutoTotal;
        golonganMap['Golongan I & II'].totalPph += calc.pphTotal;
        golonganMap['Golongan I & II'].pegawaiCount += 1;
        golonganMap['Golongan I & II'].totalDays += umDays;
      }
    });

    const monthlyData = Object.values(monthlyMap);
    const golonganData = Object.values(golonganMap);

    return {
      monthlyData,
      golonganData,
      hasData: monthlyData.length > 0,
      totalNetOverall,
      totalBrutoOverall,
      totalPphOverall,
      totalPegawaiOverall: uniqueNips.size || results.length,
      totalHariOverall
    };
  }, [results, tariffConfig]);

  // Filtered Results for pegawai
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      if (!r) return false;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        (r.nama && r.nama.toLowerCase().includes(q)) || 
        (r.nip && r.nip.includes(q)) || 
        (r.golongan && r.golongan.toLowerCase().includes(q)) ||
        (r.periode && r.periode.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterGolongan !== 'all') {
        const umDays = Array.isArray(r.days) ? r.days.filter(isHariMasukUM).length : 0;
        const calc = calculateUangMakanByGolongan(r.golongan || '', umDays, tariffConfig);
        if (filterGolongan === 'gol4' && calc.categoryName !== 'Golongan IV') return false;
        if (filterGolongan === 'gol3' && calc.categoryName !== 'Golongan III') return false;
        if (filterGolongan === 'gol2' && calc.categoryName !== 'Golongan II') return false;
        if (filterGolongan === 'gol1' && calc.categoryName !== 'Golongan I') return false;
      }

      return true;
    });
  }, [results, searchTerm, filterGolongan, tariffConfig]);

  // Detail Uang Makan flattened array for Tab 2
  const detailUangMakanFlattened = useMemo(() => {
    const rows: { no: string; nama: string; nip: string; dateStr: string }[] = [];
    let counterNo = 1;

    filteredResults.forEach(r => {
      if (!r || !Array.isArray(r.days)) return;
      const umDays = r.days.filter(isHariMasukUM);
      umDays.forEach((d, idx) => {
        if (!d) return;
        const dateFormatted = d.date ? getIsoDateStr(d.date) : (d.dateStr || '-');
        rows.push({
          no: idx === 0 ? String(counterNo) : '',
          nama: r.nama || '-',
          nip: r.nip || '-',
          dateStr: dateFormatted
        });
      });
      if (umDays.length > 0) counterNo++;
    });

    return rows;
  }, [filteredResults]);

  // Pagination for tab 1
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage) || 1;
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(start, start + itemsPerPage);
  }, [filteredResults, currentPage]);

  // Pagination for tab 2
  const totalDetailPages = Math.ceil(detailUangMakanFlattened.length / detailItemsPerPage) || 1;
  const paginatedDetailRows = useMemo(() => {
    const start = (detailCurrentPage - 1) * detailItemsPerPage;
    return detailUangMakanFlattened.slice(start, start + detailItemsPerPage);
  }, [detailUangMakanFlattened, detailCurrentPage]);

  // Export Multi-Sheet Excel (4 Sheets)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Rekap Uang Makan Per Pegawai Sesuai PMK
    const validResults = results.filter(r => r && Array.isArray(r.days));
    const rekapPMKData = validResults.map((r, i) => {
      const umDays = r.days.filter(isHariMasukUM).length;
      const calc = calculateUangMakanByGolongan(r.golongan || '', umDays, tariffConfig);
      return {
        'No': i + 1,
        'Nama': r.nama || '-',
        'NIP': r.nip || '-',
        'Golongan': r.golongan || '-',
        'Kategori Tarif': calc.categoryName,
        'Periode': r.periode || '-',
        'Hari Masuk Uang Makan': umDays,
        'Tarif Bruto / Hari (Rp)': calc.rate,
        'Total Bruto (Rp)': calc.brutoTotal,
        'PPh (%)': `${calc.taxPercent}%`,
        'Potongan PPh (Rp)': calc.pphTotal,
        'Uang Makan Bersih / Net (Rp)': calc.netTotal
      };
    });
    const ws1 = XLSX.utils.json_to_sheet(rekapPMKData);
    ws1['!cols'] = [
      { wch: 6 },  // No
      { wch: 32 }, // Nama
      { wch: 22 }, // NIP
      { wch: 12 }, // Golongan
      { wch: 18 }, // Kategori Tarif
      { wch: 25 }, // Periode
      { wch: 22 }, // Hari Masuk
      { wch: 22 }, // Tarif Bruto
      { wch: 20 }, // Total Bruto
      { wch: 10 }, // PPh
      { wch: 18 }, // Potongan PPh
      { wch: 24 }  // Net
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Rekap Uang Makan PMK');

    // Sheet 2: Jumlah Hari Kerja
    const jumlahHariKerjaData = validResults.map(r => {
      const umDays = r.days.filter(isHariMasukUM).length;
      return {
        'NIP': r.nip || '-',
        'Nama': r.nama || '-',
        'Jumlah Hari Kerja': umDays
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(jumlahHariKerjaData);
    ws2['!cols'] = [
      { wch: 24 }, // NIP
      { wch: 34 }, // Nama
      { wch: 20 }  // Jumlah Hari Kerja
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Jumlah Hari Kerja');

    // Sheet 3: Detail Absen (Detail Rekap Absensi)
    const detailAbsenData: any[] = [];
    validResults.forEach(r => {
      r.days.forEach(d => {
        if (!d) return;
        let statusStr = 'TIDAK MASUK';
        if (d.attendanceType === 'PRESENT') statusStr = 'Hadir';
        else if (d.attendanceType === 'DL_FULL') statusStr = 'Dinas Luar (Full)';
        else if (d.attendanceType === 'HOLIDAY') statusStr = 'Libur Nasional';
        else if (d.attendanceType === 'WEEKEND') statusStr = 'Akhir Pekan';
        else if (d.attendanceType === 'EXCUSED') statusStr = d.status || 'Izin / Cuti';
        else if (d.status) statusStr = d.status;

        detailAbsenData.push({
          'NIP': r.nip || '-',
          'Nama': r.nama || '-',
          'Golongan': r.golongan || '-',
          'Jabatan': r.jabatan || '-',
          'Unit Kerja': r.departemen || '-',
          'Tanggal': d.dateStr,
          'Hari': d.dayName,
          'Jam Masuk': d.jamMasuk || '-',
          'Jam Keluar': d.jamKeluar || '-',
          'Status': statusStr
        });
      });
    });
    const ws3 = XLSX.utils.json_to_sheet(detailAbsenData);
    ws3['!cols'] = [
      { wch: 24 }, // NIP
      { wch: 34 }, // Nama
      { wch: 12 }, // Golongan
      { wch: 25 }, // Jabatan
      { wch: 45 }, // Unit Kerja
      { wch: 18 }, // Tanggal
      { wch: 12 }, // Hari
      { wch: 14 }, // Jam Masuk
      { wch: 14 }, // Jam Keluar
      { wch: 20 }  // Status
    ];
    XLSX.utils.book_append_sheet(wb, ws3, 'Detail Absen');

    // Sheet 4: Detail Absensi UM (Tanpa Kolom Golongan)
    const detailUmData: any[] = [];
    let counterNo = 1;
    validResults.forEach(r => {
      const umDays = r.days.filter(isHariMasukUM);
      umDays.forEach((d, idx) => {
        if (!d) return;
        const dateFormatted = d.date ? getIsoDateStr(d.date) : (d.dateStr || '-');
        detailUmData.push({
          'No': idx === 0 ? counterNo : '',
          'Nama': r.nama || '-',
          'NIP': r.nip || '-',
          'Tanggal Absensi': dateFormatted
        });
      });
      if (umDays.length > 0) counterNo++;
    });
    const ws4 = XLSX.utils.json_to_sheet(detailUmData);
    ws4['!cols'] = [
      { wch: 8 },  // No
      { wch: 34 }, // Nama
      { wch: 24 }, // NIP
      { wch: 22 }  // Tanggal Absensi
    ];
    XLSX.utils.book_append_sheet(wb, ws4, 'Detail Absensi UM');

    // Optional Sheet 5: Catatan Berkas Error (Jika ada berkas yang gagal di-parse)
    if (parseErrors.length > 0) {
      const errorRows = parseErrors.map((err, idx) => ({
        'No': idx + 1,
        'Nama Berkas PDF': err.fileName,
        'Ukuran Berkas': err.fileSize ? formatBytes(err.fileSize) : '-',
        'Waktu Error': formatDateTimeSafe(err.timestamp),
        'Status': 'GAGAL DIPROSES',
        'Pesan Error / Kendala': err.errorMessage,
        'Rekomendasi Solusi': 'Pastikan berkas PDF presensi memiliki layer teks asli (bukan foto/scan gambar) dan tidak diproteksi sandi.'
      }));
      const wsErr = XLSX.utils.json_to_sheet(errorRows);
      wsErr['!cols'] = [
        { wch: 6 },
        { wch: 38 },
        { wch: 16 },
        { wch: 22 },
        { wch: 18 },
        { wch: 45 },
        { wch: 60 }
      ];
      XLSX.utils.book_append_sheet(wb, wsErr, 'Catatan Berkas Error');
    }

    XLSX.writeFile(wb, `Rekap_Uang_Makan_Golongan_PMK_SDM_DJKI_${new Date().toISOString().split('T')[0]}.xlsx`);
    logActivity('DOWNLOAD', 'Uang Makan', `Mengekspor rekap Uang Makan sesuai standar PMK ke Excel Multi-Sheet (${parseErrors.length > 0 ? '5 Sheet termasuk Error' : '4 Sheet'})`);
  };

  // Dedicated Export for Parsing Errors
  const handleExportErrorExcel = () => {
    if (parseErrors.length === 0) {
      setNotification({ message: 'Tidak ada riwayat berkas error untuk diekspor.', type: 'info' });
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Berkas Gagal / Parsing Error
    const errorRows = parseErrors.map((err, idx) => ({
      'No': idx + 1,
      'Nama Berkas PDF': err.fileName,
      'Ukuran Berkas': err.fileSize ? formatBytes(err.fileSize) : '-',
      'Waktu Kejadian': formatDateTimeSafe(err.timestamp),
      'Status Parsing': 'GAGAL (ERROR)',
      'Keterangan / Pesan Kendala': err.errorMessage,
      'Rekomendasi Solusi': '1. Unggah ulang berkas PDF asli dari portal presensi (harus teks digital, bukan scan/foto).\n2. Pastikan file tidak terenkripsi atau diproteksi kata sandi.\n3. Periksa apakah tabel tanggal dan jam presensi tercetak lengkap.'
    }));

    const ws1 = XLSX.utils.json_to_sheet(errorRows);
    ws1['!cols'] = [
      { wch: 6 },
      { wch: 40 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 50 },
      { wch: 65 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Daftar Berkas Gagal (Error)');

    // Sheet 2: Ringkasan Audit
    const summaryRows = [
      { 'Parameter': 'Total Berkas Mengalami Error', 'Nilai': parseErrors.length },
      { 'Parameter': 'Total Berkas Berhasil Diproses', 'Nilai': results.length },
      { 'Parameter': 'Waktu Ekspor Laporan', 'Nilai': formatDateTimeSafe(new Date().toISOString()) },
      { 'Parameter': 'Modul Sistem', 'Nilai': 'Pengelolaan Presensi & Uang Makan ASN DJKI' },
      { 'Parameter': 'Status Tindak Lanjut', 'Nilai': 'Perlu perbaikan berkas fisik PDF yang dilaporkan gagal' }
    ];
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    ws2['!cols'] = [{ wch: 35 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan Audit');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Laporan_Error_Parsing_PDF_Uang_Makan_${dateStr}.xlsx`);
    logActivity('DOWNLOAD', 'Uang Makan', `Mengekspor laporan ${parseErrors.length} berkas error parsing PDF ke Excel.`);
    setNotification({ message: `Berhasil mengekspor ${parseErrors.length} berkas error ke Excel.`, type: 'success' });
  };

  // Export PDF Report
  const handleExportPdf = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(14);
    doc.text('REKAPITULASI UANG MAKAN PEGAWAI SDM DJKI (STANDAR PMK)', 40, 40);
    doc.setFontSize(9);
    doc.text(`Tanggal Cetak: ${formatDateTimeSafe(new Date().toISOString())} | Gol. I&II: Rp35rb (0%), Gol. III: Rp37rb (5%), Gol. IV: Rp41rb (15%)`, 40, 55);

    const validResults = results.filter(r => r && Array.isArray(r.days));
    const tableData = validResults.map((r, i) => {
      const umDays = r.days.filter(isHariMasukUM).length;
      const calc = calculateUangMakanByGolongan(r.golongan || '', umDays, tariffConfig);
      return [
        i + 1,
        r.nama,
        r.nip,
        r.golongan || '-',
        r.periode,
        `${umDays} Hari`,
        `Rp ${calc.rate.toLocaleString('id-ID')}`,
        `Rp ${calc.brutoTotal.toLocaleString('id-ID')}`,
        `${calc.taxPercent}%`,
        `Rp ${calc.pphTotal.toLocaleString('id-ID')}`,
        `Rp ${calc.netTotal.toLocaleString('id-ID')}`
      ];
    });

    autoTable(doc, {
      startY: 70,
      head: [['No', 'Nama Pegawai', 'NIP', 'Golongan', 'Periode', 'Masuk UM', 'Tarif Bruto', 'Total Bruto', 'PPh %', 'Potongan PPh', 'Diterima Bersih']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 }
    });

    doc.save(`Laporan_Uang_Makan_PMK_SDM_DJKI_${new Date().toISOString().split('T')[0]}.pdf`);
    logActivity('DOWNLOAD', 'Uang Makan', 'Mengekspor laporan Uang Makan ke PDF');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Universal Presensi Hub Header */}
      <PresensiNavigationHeader 
        title="Pengolahan & Rekapitulasi Uang Makan Pegawai"
        subtitle="Sistem Rekapitulasi Otomatis Berbasis Tarif PMK, Kalender Libur Nasional & Presensi Bulanan"
      />

      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 md:p-12 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none"></div>
        <div className="relative z-10 space-y-4 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-emerald-500/30">
            <i className="bi bi-shield-lock-fill"></i> Modul Akses Khusus Admin Uang Makan
          </div>
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white leading-tight">
            Pengolahan &amp; Rekapitulasi Uang Makan Pegawai
          </h1>
          <p className="text-xs md:text-sm text-emerald-100 font-medium leading-relaxed max-w-3xl">
            Sistem rekapitulasi otomatis berbasis tarif Peraturan Menteri Keuangan (PMK): Gol. I &amp; II (Rp35rb/0%), Gol. III (Rp37rb/5%), Gol. IV (Rp41rb/15%), terintegrasi dengan Pengaturan Kalender Hari Libur &amp; Cuti Bersama.
          </p>

          {/* STATS COUNTERS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
              <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-wider">Total Pegawai</p>
              <p className="text-lg font-black text-white mt-1">{summaryStats.totalEmployees} Orang</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
              <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-wider">Total Hari Masuk</p>
              <p className="text-lg font-black text-white mt-1">{summaryStats.totalUangMakanDays} Hari</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
              <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-wider">Total Bruto</p>
              <p className="text-lg font-black text-emerald-300 mt-1">Rp {summaryStats.totalBruto.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
              <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-wider">Potongan PPh</p>
              <p className="text-lg font-black text-rose-300 mt-1">Rp {summaryStats.totalPph.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 col-span-2 md:col-span-1">
              <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-wider">Total Bersih (Diterima)</p>
              <p className="text-lg font-black text-emerald-400 mt-1">Rp {summaryStats.totalNet.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* PMK TARIFF STANDARDS & SETTINGS CARD */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl text-xl">
              <i className="bi bi-bank2"></i>
            </span>
            <div>
              <h4 className="text-sm font-black uppercase text-gray-950 tracking-tight">Pengaturan Tarif Uang Makan Sesuai Golongan PMK</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Acuan PMK: Gol I &amp; II (Rp35.000 / PPh 0%), Gol III (Rp37.000 / PPh 5%), Gol IV (Rp41.000 / PPh 15%)</p>
            </div>
          </div>
          <button
            onClick={() => setTariffConfig(DEFAULT_TARIFF_CONFIG)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
          >
            <i className="bi bi-arrow-counterclockwise"></i> Reset Standar PMK
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Golongan I & II Card */}
          <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase">Golongan I &amp; II</span>
              <span className="text-[10px] font-bold text-emerald-700 uppercase">PPh {tariffConfig.gol12Tax}% (Rp 0)</span>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-500">Tarif Bruto Per Hari (Rp)</label>
              <input
                type="number"
                value={tariffConfig.gol12Rate}
                onChange={e => setTariffConfig({ ...tariffConfig, gol12Rate: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl font-mono font-bold text-sm text-gray-900 outline-none focus:border-emerald-600"
              />
            </div>
            <p className="text-[10px] font-extrabold text-emerald-800">Uang Makan Bersih: Rp {tariffConfig.gol12Rate.toLocaleString('id-ID')} / hari</p>
          </div>

          {/* Golongan III Card */}
          <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase">Golongan III</span>
              <span className="text-[10px] font-bold text-blue-700 uppercase">PPh {tariffConfig.gol3Tax}% (Potong Rp {Math.round(tariffConfig.gol3Rate * (tariffConfig.gol3Tax / 100)).toLocaleString('id-ID')})</span>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-500">Tarif Bruto Per Hari (Rp)</label>
              <input
                type="number"
                value={tariffConfig.gol3Rate}
                onChange={e => setTariffConfig({ ...tariffConfig, gol3Rate: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono font-bold text-sm text-gray-900 outline-none focus:border-blue-600"
              />
            </div>
            <p className="text-[10px] font-extrabold text-blue-800">
              Uang Makan Bersih: Rp {(tariffConfig.gol3Rate - Math.round(tariffConfig.gol3Rate * (tariffConfig.gol3Tax / 100))).toLocaleString('id-ID')} / hari
            </p>
          </div>

          {/* Golongan IV Card */}
          <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase">Golongan IV</span>
              <span className="text-[10px] font-bold text-purple-700 uppercase">PPh {tariffConfig.gol4Tax}% (Potong Rp {Math.round(tariffConfig.gol4Rate * (tariffConfig.gol4Tax / 100)).toLocaleString('id-ID')})</span>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-500">Tarif Bruto Per Hari (Rp)</label>
              <input
                type="number"
                value={tariffConfig.gol4Rate}
                onChange={e => setTariffConfig({ ...tariffConfig, gol4Rate: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl font-mono font-bold text-sm text-gray-900 outline-none focus:border-purple-600"
              />
            </div>
            <p className="text-[10px] font-extrabold text-purple-800">
              Uang Makan Bersih: Rp {(tariffConfig.gol4Rate - Math.round(tariffConfig.gol4Rate * (tariffConfig.gol4Tax / 100))).toLocaleString('id-ID')} / hari
            </p>
          </div>
        </div>
      </div>

      {/* UPLOAD PDF SECTION */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <i className="bi bi-cloud-arrow-up-fill text-lg"></i>
            </span>
            <h3 className="text-base font-black text-gray-950 uppercase tracking-tight">Unggah Berkas PDF Absensi Bulanan</h3>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 cursor-pointer select-none hover:bg-gray-100">
              <input
                type="checkbox"
                checked={accumulateMode}
                onChange={e => setAccumulateMode(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              Akumulasi / Gabung dengan Hasil Sebelumnya
            </label>
          </div>
        </div>

        {/* Drag Drop Box */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all flex flex-col items-center justify-center gap-3 relative ${
            dragActive ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
          }`}
        >
          <input
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          />
          <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full">
            <i className="bi bi-file-earmark-pdf text-3xl"></i>
          </div>
          <div>
            <p className="text-sm font-black text-gray-800 uppercase">Tarik &amp; Lepaskan File PDF Absensi di Sini</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Atau klik untuk memilih multiple berkas PDF sekaligus dari komputer</p>
          </div>
        </div>

        {/* Skipped duplicates notification */}
        {skippedDuplicatesCount > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <i className="bi bi-exclamation-triangle-fill text-amber-500 text-base shrink-0 mt-0.5"></i>
            <div className="text-xs text-amber-800">
              <p className="font-extrabold uppercase">{skippedDuplicatesCount} File PDF Dilewati Karena Sudah Ada / Duplikat:</p>
              <p className="text-[10px] font-bold text-amber-600 mt-0.5">{duplicateSkippedNames.join(', ')}</p>
            </div>
          </div>
        )}

        {/* File Queue List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-xs font-black uppercase text-gray-500">
              <span>Berkas PDF Siap Diproses ({selectedFiles.length} File)</span>
              <button onClick={clearFiles} className="text-red-500 hover:underline text-[10px]">Bersihkan Antrean</button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <i className="bi bi-file-earmark-pdf-fill text-red-500 text-base shrink-0"></i>
                    <span className="truncate">{file.name}</span>
                    <span className="text-[10px] font-mono text-gray-400">({formatBytes(file.size)})</span>
                  </div>
                  <button onClick={() => removeFile(idx)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleParseFiles}
              disabled={isParsing}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isParsing ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin"></i>
                  Memproses Parsing ({parseProgress.current}/{parseProgress.total})...
                </>
              ) : (
                <>
                  <i className="bi bi-cpu-fill"></i>
                  Mulai Parsing &amp; Simpan PDF Ke Arsip Drive
                </>
              )}
            </button>
          </div>
        )}

        {/* Live Parsing Progress Bar */}
        {isParsing && (
          <div className="space-y-3 bg-blue-50/80 p-5 rounded-2xl border border-blue-100 animate-fadeIn mt-4">
            <div className="flex justify-between text-[10px] font-black text-blue-700 uppercase">
              <span className="flex items-center gap-1.5">
                <i className="bi bi-arrow-repeat animate-spin"></i>
                Menganalisis Berkas PDF Presensi...
              </span>
              <span>{parseProgress.current} / {parseProgress.total} ({parseProgress.total > 0 ? Math.round((parseProgress.current / parseProgress.total) * 100) : 0}%)</span>
            </div>
            <div className="h-2.5 w-full bg-gray-200/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-300" 
                style={{ width: `${parseProgress.total > 0 ? (parseProgress.current / parseProgress.total) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-gray-500 font-bold uppercase">
              <span className="truncate max-w-[65%]">File: <b className="text-gray-700">{parseProgress.currentFileName || '-'}</b></span>
              <span>Sukses: <b className="text-emerald-600">{parseProgress.success}</b> • Gagal: <b className="text-rose-600">{parseProgress.failed}</b></span>
            </div>
          </div>
        )}

        {/* PARSING ERROR & DIAGNOSTIC PANEL WITH EXCEL EXPORT */}
        {parseErrors.length > 0 && (
          <div className="bg-rose-50/90 border-2 border-rose-200 rounded-2xl p-5 space-y-4 animate-slideUp mt-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md shadow-rose-600/20 shrink-0">
                  <i className="bi bi-exclamation-triangle-fill text-lg"></i>
                </div>
                <div>
                  <h4 className="text-xs font-black text-rose-950 uppercase tracking-tight flex items-center gap-2">
                    Terdeteksi {parseErrors.length} Berkas PDF Gagal Diproses (Parsing Error)
                  </h4>
                  <p className="text-[11px] text-rose-700 font-medium mt-0.5">
                    Berkas di bawah gagal diekstrak karena format tidak sesuai standar atau teks PDF tidak terbaca. Anda dapat mengekspor log rincian kendala ini ke file Excel untuk ditindaklanjuti.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                <button
                  onClick={handleExportErrorExcel}
                  className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 shrink-0"
                  title="Unduh laporan berkas error ke format Excel (.xlsx)"
                >
                  <i className="bi bi-file-earmark-excel-fill text-sm"></i> Ekspor Log Error (Excel)
                </button>
                <button
                  onClick={() => setShowErrorDetails(prev => !prev)}
                  className="px-3 py-2.5 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  <i className={`bi bi-chevron-${showErrorDetails ? 'up' : 'down'}`}></i>
                  {showErrorDetails ? 'Tutup Rincian' : 'Lihat Rincian'}
                </button>
                <button
                  onClick={() => {
                    setParseErrors([]);
                    localStorage.removeItem('absen_pdf_parse_errors');
                    setNotification({ message: 'Riwayat berkas error parsing berhasil dibersihkan.', type: 'info' });
                  }}
                  className="p-2.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-xl transition-all"
                  title="Bersihkan Log Error"
                >
                  <i className="bi bi-trash3 text-sm"></i>
                </button>
              </div>
            </div>

            {showErrorDetails && (
              <div className="overflow-x-auto border border-rose-200 rounded-xl bg-white shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-rose-100/60 text-[9px] font-black uppercase text-rose-800 border-b border-rose-200 tracking-wider">
                      <th className="px-3.5 py-2.5 text-center w-10">No</th>
                      <th className="px-3.5 py-2.5">Nama Berkas PDF</th>
                      <th className="px-3.5 py-2.5 text-center">Ukuran</th>
                      <th className="px-3.5 py-2.5">Waktu Kejadian</th>
                      <th className="px-3.5 py-2.5">Pesan Kendala / Error</th>
                      <th className="px-3.5 py-2.5">Rekomendasi Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 text-xs font-bold text-gray-800">
                    {parseErrors.map((err, idx) => (
                      <tr key={err.id || idx} className="hover:bg-rose-50/40 transition-colors">
                        <td className="px-3.5 py-2.5 text-center font-mono text-[10px] text-gray-400">{idx + 1}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <i className="bi bi-file-earmark-x-fill text-rose-500 text-sm"></i>
                            <span className="font-extrabold text-gray-900 truncate max-w-[200px]" title={err.fileName}>{err.fileName}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono text-[10px] text-gray-500">
                          {err.fileSize ? formatBytes(err.fileSize) : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-[10px] font-mono text-gray-500">
                          {formatTimeOnlySafe(err.timestamp)}
                        </td>
                        <td className="px-3.5 py-2.5 text-rose-600 font-semibold text-[11px]">
                          {err.errorMessage}
                        </td>
                        <td className="px-3.5 py-2.5 text-[10px] text-gray-500 font-normal">
                          Pastikan berkas PDF asli dengan teks terbaca, bukan scan foto murni atau terproteksi sandi.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DRIVE ARCHIVE (FOLDER PER BULAN) */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <i className="bi bi-folder-fill text-lg"></i>
              </span>
              <h4 className="text-base font-black text-gray-950 uppercase tracking-tight">Arsip Drive Berkas PDF Uang Makan (Folder Per Bulan)</h4>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Gunakan folder per bulan untuk memfilter, pratinjau, mengunduh, atau menghapus file PDF</p>
          </div>

          {storedPdfs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedMonthFolder !== 'all' && (
                <button
                  onClick={() => handleDeleteCurrentMonthFolder(selectedMonthFolder)}
                  className="px-3.5 py-2 border border-amber-300 hover:border-amber-400 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
                  title={`Hapus semua berkas PDF di folder ${formatMonthFolderLabel(selectedMonthFolder)}`}
                >
                  <i className="bi bi-folder-x"></i> Hapus Folder {formatMonthFolderLabel(selectedMonthFolder)}
                </button>
              )}
              <button
                onClick={handleClearAllStoredPdfs}
                className="px-4 py-2 border-2 border-red-200 hover:border-red-300 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all hover:bg-red-50 flex items-center gap-1.5 shrink-0"
              >
                <i className="bi bi-trash3-fill"></i> Hapus Semua Arsip PDF
              </button>
            </div>
          )}
        </div>

        {/* FOLDER MONTH SELECTOR & SEARCH */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
            <button
              onClick={() => setSelectedMonthFolder('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedMonthFolder === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <i className="bi bi-collection-fill text-xs"></i>
              Semua Bulan ({storedPdfs.length})
            </button>

            {availableMonthFolders.map(folderKey => {
              const count = storedPdfs.filter(p => p.monthFolder === folderKey).length;
              return (
                <button
                  key={folderKey}
                  onClick={() => setSelectedMonthFolder(folderKey)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
                    selectedMonthFolder === folderKey
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className="bi bi-folder-symlink-fill text-xs"></i>
                  {formatMonthFolderLabel(folderKey)} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[240px]">
            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input
              type="text"
              placeholder="Cari File, NIP, atau Nama..."
              value={pdfSearchTerm}
              onChange={e => setPdfSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* STORED PDF TABLE */}
        {filteredStoredPdfs.length > 0 ? (
          <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-inner">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100 tracking-[0.2em]">
                  <th className="px-5 py-3.5 w-12 text-center">No</th>
                  <th className="px-5 py-3.5">Nama File PDF</th>
                  <th className="px-5 py-3.5">Folder Bulan</th>
                  <th className="px-5 py-3.5">Pegawai (Nama &amp; NIP)</th>
                  <th className="px-4 py-3.5 text-center">Ukuran</th>
                  <th className="px-4 py-3.5 text-center">Tanggal Unggah</th>
                  <th className="px-5 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-800">
                {filteredStoredPdfs.map((pdf, idx) => (
                  <tr key={pdf.id} className="hover:bg-emerald-50/30 transition-all">
                    <td className="px-5 py-3.5 text-center font-mono text-[10px] text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="p-1.5 bg-red-50 text-red-600 rounded-lg shrink-0">
                          <i className="bi bi-file-earmark-pdf-fill text-base"></i>
                        </span>
                        <span className="font-extrabold text-gray-900 truncate max-w-[200px]" title={pdf.fileName}>{pdf.fileName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider">
                        📁 {formatMonthFolderLabel(pdf.monthFolder)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-extrabold text-gray-900 uppercase">{pdf.nama || '-'}</p>
                        <p className="font-mono text-[10px] text-gray-400">{pdf.nip || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-[10px] text-gray-500">
                      {formatBytes(pdf.fileSize)}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-[10px] text-gray-500">
                      {formatDateTimeSafe(pdf.uploadedAt)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenPdfPreview(pdf)}
                          className="p-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Lihat Pratinjau PDF"
                        >
                          <i className="bi bi-eye-fill text-sm"></i>
                        </button>
                        <button
                          onClick={() => handleDownloadStoredPdf(pdf)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-all shadow-sm inline-flex items-center justify-center"
                          title="Unduh Berkas PDF Original"
                        >
                          <i className="bi bi-download text-sm"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteStoredPdf(pdf)}
                          className="p-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Hapus PDF"
                        >
                          <i className="bi bi-trash-fill text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50/60 p-8 rounded-2xl text-center border border-dashed border-gray-200">
            <i className="bi bi-folder-x text-4xl text-gray-300 mb-2 block"></i>
            <p className="text-xs font-black text-gray-600 uppercase">Belum ada berkas PDF tersimpan di folder ini</p>
          </div>
        )}
      </div>

      {/* RESULTS & TABS */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5">
          <div>
            <h3 className="text-base font-black text-gray-950 uppercase tracking-tight">Hasil Olah &amp; Pengaturan Uang Makan</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Gunakan tab untuk melihat Rekap Per Golongan, Detail Absensi, atau Kelola Kalender Hari Libur</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tombol Olah & Hitung Langsung dari Arsip PDF */}
            {storedPdfs.length > 0 && (
              <button
                onClick={handleProcessFromStoredArchive}
                disabled={isProcessingArchive}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title={`Olah dan hitung data uang makan langsung dari ${storedPdfs.length} berkas PDF di arsip browser`}
              >
                <i className={`bi ${isProcessingArchive ? 'bi-arrow-repeat animate-spin' : 'bi-lightning-charge-fill'} text-sm`}></i>
                {isProcessingArchive
                  ? `Mengolah Arsip (${archiveProgress.current}/${archiveProgress.total})...`
                  : results.length > 0
                    ? `Sinkronisasi Arsip (${storedPdfs.length})`
                    : `⚡ Olah ${storedPdfs.length} Berkas Dari Arsip`}
              </button>
            )}

            {/* Tombol Ekspor Log Error (Excel) jika terdeteksi berkas gagal */}
            {parseErrors.length > 0 && (
              <button
                onClick={handleExportErrorExcel}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/20 flex items-center gap-2 animate-pulse"
                title="Unduh laporan daftar berkas PDF yang gagal diproses ke file Excel (.xlsx)"
              >
                <i className="bi bi-file-earmark-excel-fill text-sm"></i> Ekspor Log Error ({parseErrors.length} Berkas)
              </button>
            )}

            {/* Tombol Ekspor Hasil Rekap Utama */}
            {results.length > 0 ? (
              <>
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                  title="Ekspor rekapitulasi ke format Excel Multi-Sheet"
                >
                  <i className="bi bi-file-earmark-excel-fill text-sm"></i> Ekspor Excel Multi-Sheet
                </button>
                <button
                  onClick={handleExportPdf}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                  title="Ekspor rekapitulasi ke format PDF"
                >
                  <i className="bi bi-file-earmark-pdf-fill text-sm"></i> Ekspor PDF
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (parseErrors.length > 0) {
                    handleExportErrorExcel();
                  } else if (storedPdfs.length > 0) {
                    setNotification({
                      message: `Ditemukan ${storedPdfs.length} berkas PDF di arsip browser. Memulai kalkulasi dan olah uang makan...`,
                      type: 'info'
                    });
                    handleProcessFromStoredArchive();
                  } else {
                    setNotification({ message: 'Belum ada data presensi yang berhasil diolah. Silakan unggah berkas PDF terlebih dahulu.', type: 'info' });
                  }
                }}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 ${
                  parseErrors.length > 0
                    ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 cursor-pointer'
                    : storedPdfs.length > 0
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-pointer'
                      : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200'
                }`}
                title={
                  parseErrors.length > 0
                    ? 'Klik untuk ekspor berkas error yang gagal diproses ke Excel'
                    : storedPdfs.length > 0
                      ? `Klik untuk langsung mengolah ${storedPdfs.length} berkas dari arsip dan mengaktifkan ekspor Excel`
                      : 'Belum ada data hasil olah'
                }
              >
                <i className="bi bi-file-earmark-excel-fill text-sm"></i> Ekspor Excel Multi-Sheet
                <span className="text-[9px] bg-white/80 px-1.5 py-0.5 rounded font-bold">
                  {parseErrors.length > 0 ? 'Ekspor Error' : storedPdfs.length > 0 ? `Klik Olah Arsip (${storedPdfs.length})` : 'Data Kosong'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* PROSES ARSIP PROGRESS BAR */}
        {isProcessingArchive && (
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2.5 shadow-sm">
            <div className="flex justify-between items-center text-xs font-black uppercase">
              <span className="text-emerald-950 flex items-center gap-2">
                <i className="bi bi-arrow-repeat animate-spin text-emerald-600 text-sm"></i>
                Mengolah Berkas Arsip: <span className="font-mono text-gray-600 text-[11px] lowercase truncate max-w-[280px]">{archiveProgress.fileName || 'Memuat...'}</span>
              </span>
              <span className="text-emerald-700 font-mono font-bold">{archiveProgress.current} / {archiveProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full transition-all duration-200 rounded-full"
                style={{ width: `${(archiveProgress.current / (archiveProgress.total || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* CALLOUT BANNER KETIKA HASIL KOSONG TAPI ADA BERKAS ARSIP */}
        {results.length === 0 && storedPdfs.length > 0 && !isProcessingArchive && (
          <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0 shadow-md shadow-emerald-600/20">
                <i className="bi bi-file-earmark-check-fill"></i>
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-tight">
                  Tersedia {storedPdfs.length} Berkas PDF di Arsip Browser
                </h4>
                <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                  Hasil kalkulasi uang makan belum dimuat ke sesi aktif ini. Klik tombol di samping untuk langsung mengolah data presensi dan mengaktifkan <strong>Ekspor Excel Multi-Sheet</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={handleProcessFromStoredArchive}
              disabled={isProcessingArchive}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <i className="bi bi-lightning-charge-fill text-sm"></i>
              ⚡ Olah Sekarang ({storedPdfs.length} Berkas)
            </button>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <i className="bi bi-pie-chart-fill"></i> Dashboard Ringkasan Realisasi
          </button>
          <button
            onClick={() => setActiveTab('rekap_pegawai')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'rekap_pegawai'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <i className="bi bi-person-lines-fill"></i> Tab 1: Rekap Per Golongan
          </button>
          <button
            onClick={() => setActiveTab('detail_absensi')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'detail_absensi'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <i className="bi bi-calendar3"></i> Tab 2: Detail Absensi
          </button>
          <button
            onClick={() => setActiveTab('kalender_libur')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'kalender_libur'
                ? 'bg-white text-blue-800 shadow-md'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <i className="bi bi-calendar-event-fill"></i> Tab 3: Kalender Libur ({holidays.length})
          </button>
        </div>

        {/* DASHBOARD RINGKASAN REALISASI BULANAN */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            {/* TOP STAT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                <div className="absolute -right-3 -bottom-3 text-white/10 text-6xl font-black">
                  <i className="bi bi-cash-stack"></i>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Total Realisasi Bersih (Net)</p>
                <h3 className="text-xl md:text-2xl font-black mt-2 tracking-tight">
                  Rp {chartAnalyticsData.totalNetOverall.toLocaleString('id-ID')}
                </h3>
                <p className="text-[9px] font-medium text-emerald-100 mt-2 flex items-center gap-1">
                  <i className="bi bi-check-circle-fill"></i> Dana Siap Dibayarkan Ke Pegawai
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Hak Bruto</p>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-2 tracking-tight">
                  Rp {chartAnalyticsData.totalBrutoOverall.toLocaleString('id-ID')}
                </h3>
                <p className="text-[9px] font-bold text-sky-600 mt-2 flex items-center gap-1">
                  <i className="bi bi-calculator-fill"></i> Sebelum Potongan PPh
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Potongan PPh</p>
                <h3 className="text-xl md:text-2xl font-black text-rose-600 mt-2 tracking-tight">
                  Rp {chartAnalyticsData.totalPphOverall.toLocaleString('id-ID')}
                </h3>
                <p className="text-[9px] font-bold text-rose-500 mt-2 flex items-center gap-1">
                  <i className="bi bi-shield-x"></i> PPh Pasal 21 PMK
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Penerima &amp; Total Hari</p>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 mt-2 tracking-tight">
                  {chartAnalyticsData.totalPegawaiOverall} <span className="text-xs font-bold text-gray-400">Pegawai</span>
                </h3>
                <p className="text-[9px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                  <i className="bi bi-calendar-check-fill"></i> Total {chartAnalyticsData.totalHariOverall} Hari Masuk
                </p>
              </div>
            </div>

            {/* RECHARTS BAR CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CHART 1: Total Realisasi Pembayaran Bulanan */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider flex items-center gap-2">
                      <i className="bi bi-bar-chart-line-fill text-emerald-600 text-sm"></i> Realisasi Pembayaran Bulanan (Rp)
                    </h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                      Grafik Batang Perbandingan Nominal Bersih, Bruto, dan PPh
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase border border-emerald-100">
                    Grafik Batang Recharts
                  </span>
                </div>

                <div className="h-72 w-full pt-2">
                  {chartAnalyticsData.hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartAnalyticsData.monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} dy={10} />
                        <YAxis
                          tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                          tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-sans">
                                  <p className="font-black text-emerald-400 mb-2 border-b border-slate-700 pb-1 uppercase tracking-wider">{label}</p>
                                  {payload.map((entry: any, index: number) => (
                                    <div key={`item-${index}`} className="flex items-center justify-between gap-4 my-1">
                                      <span className="flex items-center gap-1.5 text-slate-300 font-bold uppercase text-[10px]">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                        {entry.name}:
                                      </span>
                                      <span className="font-mono font-black text-white">Rp {(entry.value || 0).toLocaleString('id-ID')}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 800, paddingTop: '10px' }} />
                        <Bar dataKey="totalNet" name="Uang Makan Bersih (Net)" fill="#059669" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="totalBruto" name="Total Bruto" fill="#0284c7" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="totalPph" name="Potongan PPh" fill="#e11d48" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-6">
                      <i className="bi bi-bar-chart-line text-4xl text-gray-300 mb-2"></i>
                      <p className="text-xs font-black uppercase text-gray-600">Belum ada data realisasi bulanan</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Unggah PDF berkas absensi untuk melihat grafik rekapitulasi</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CHART 2: Breakdown Realisasi Per Golongan */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider flex items-center gap-2">
                      <i className="bi bi-pie-chart-fill text-purple-600 text-sm"></i> Realisasi Uang Makan Per Golongan
                    </h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                      Distribusi Pembayaran Per Kategori Golongan PMK
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-[9px] font-black uppercase border border-purple-100">
                    Breakdown Golongan
                  </span>
                </div>

                <div className="h-72 w-full pt-2">
                  {chartAnalyticsData.hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartAnalyticsData.golonganData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="category" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} dy={10} />
                        <YAxis
                          tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                          tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-sans">
                                  <p className="font-black text-purple-400 mb-2 border-b border-slate-700 pb-1 uppercase tracking-wider">{label}</p>
                                  <div className="space-y-1 text-[10px]">
                                    <p className="flex justify-between gap-4 font-bold"><span className="text-slate-400">Total Bersih:</span> <span className="font-mono font-black text-emerald-400">Rp {(data.totalNet || 0).toLocaleString('id-ID')}</span></p>
                                    <p className="flex justify-between gap-4 font-bold"><span className="text-slate-400">Total Bruto:</span> <span className="font-mono text-sky-300">Rp {(data.totalBruto || 0).toLocaleString('id-ID')}</span></p>
                                    <p className="flex justify-between gap-4 font-bold"><span className="text-slate-400">Potongan PPh:</span> <span className="font-mono text-rose-300">Rp {(data.totalPph || 0).toLocaleString('id-ID')}</span></p>
                                    <p className="flex justify-between gap-4 font-bold"><span className="text-slate-400">Jumlah Pegawai:</span> <span className="font-mono text-amber-300">{data.pegawaiCount} Orang</span></p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="totalNet" name="Total Realisasi Bersih" radius={[8, 8, 0, 0]}>
                          {chartAnalyticsData.golonganData.map((entry, index) => {
                            let color = '#10b981';
                            if (entry.category.includes('IV')) color = '#9333ea';
                            else if (entry.category.includes('III')) color = '#2563eb';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-6">
                      <i className="bi bi-pie-chart text-4xl text-gray-300 mb-2"></i>
                      <p className="text-xs font-black uppercase text-gray-600">Belum ada data per golongan</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MONTHLY SUMMARY TABLE BREAKDOWN */}
            {chartAnalyticsData.hasData && (
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider flex items-center gap-2">
                    <i className="bi bi-table text-emerald-600"></i> Tabel Ringkasan Realisasi Pembayaran Bulanan
                  </h4>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    {chartAnalyticsData.monthlyData.length} Periode Terbaca
                  </span>
                </div>
                <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100 tracking-wider">
                        <th className="p-3">Periode Bulan</th>
                        <th className="p-3 text-center">Jumlah Pegawai</th>
                        <th className="p-3 text-center">Total Hari Masuk</th>
                        <th className="p-3 text-right">Hak Bruto (Rp)</th>
                        <th className="p-3 text-right">Potongan PPh (Rp)</th>
                        <th className="p-3 text-right">Diterima Bersih / Net (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs font-bold">
                      {chartAnalyticsData.monthlyData.map((m, idx) => (
                        <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="p-3 font-black text-gray-900 uppercase">{m.month}</td>
                          <td className="p-3 text-center text-gray-600">{m.pegawaiCount} Orang</td>
                          <td className="p-3 text-center text-gray-600">{m.totalDays} Hari</td>
                          <td className="p-3 text-right font-mono text-sky-700">Rp {m.totalBruto.toLocaleString('id-ID')}</td>
                          <td className="p-3 text-right font-mono text-rose-600">Rp {m.totalPph.toLocaleString('id-ID')}</td>
                          <td className="p-3 text-right font-mono font-black text-emerald-600">Rp {m.totalNet.toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: REKAP UANG MAKAN PER PEGAWAI ACCORDING TO PMK GOLONGAN */}
        {activeTab === 'rekap_pegawai' && (
          <div className="space-y-4">
            {/* TOOLBAR: SEARCH, GOLONGAN FILTER & ACTIONS */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex flex-1 flex-col sm:flex-row gap-2">
                {/* SEARCH INPUT */}
                <div className="relative flex-1">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                  <input
                    type="text"
                    placeholder="Cari berdasarkan Nama, NIP, Golongan, atau Periode..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-emerald-600 focus:bg-white transition-all"
                  />
                </div>

                {/* FILTER GOLONGAN */}
                <select
                  value={filterGolongan}
                  onChange={e => { setFilterGolongan(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase text-gray-700 outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="all">Semua Golongan</option>
                  <option value="gol4">Golongan IV (Rp 41.000 / 15%)</option>
                  <option value="gol3">Golongan III (Rp 37.000 / 5%)</option>
                  <option value="gol2">Golongan II (Rp 35.000 / 0%)</option>
                  <option value="gol1">Golongan I (Rp 35.000 / 0%)</option>
                </select>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleSyncGolonganFromMaster}
                  disabled={isSyncingMaster || results.length === 0}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                  title="Ambil data golongan & jabatan resmi dari Master Pegawai"
                >
                  <i className={`bi bi-arrow-repeat ${isSyncingMaster ? 'animate-spin' : ''}`}></i>
                  <span>Sinkron Master Pegawai</span>
                </button>

                {results.length > 0 && (
                  <button
                    onClick={handleClearAllResults}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all"
                    title="Hapus seluruh hasil rekapitulasi"
                  >
                    <i className="bi bi-trash-fill"></i>
                    <span>Hapus Semua</span>
                  </button>
                )}
              </div>
            </div>

            {results.length > 0 ? (
              <>
                <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100 tracking-[0.2em]">
                        <th className="px-4 py-3.5 w-10 text-center">No</th>
                        <th className="px-5 py-3.5">Nama Pegawai</th>
                        <th className="px-4 py-3.5">NIP</th>
                        <th className="px-4 py-3.5 text-center">Golongan</th>
                        <th className="px-4 py-3.5 text-center">Periode</th>
                        <th className="px-4 py-3.5 text-center">Masuk UM</th>
                        <th className="px-4 py-3.5 text-right">Tarif Bruto</th>
                        <th className="px-4 py-3.5 text-right">Total Bruto</th>
                        <th className="px-3 py-3.5 text-center">PPh</th>
                        <th className="px-4 py-3.5 text-right">Pot. PPh</th>
                        <th className="px-5 py-3.5 text-right">Diterima Bersih</th>
                        <th className="px-4 py-3.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-800">
                      {paginatedResults.map((r, idx) => {
                        const globalIndex = results.findIndex(res => res === r || (res.nip === r.nip && res.periode === r.periode));
                        const umDays = r.days.filter(isHariMasukUM).length;
                        const calc = calculateUangMakanByGolongan(r.golongan || '', umDays, tariffConfig);

                        return (
                          <tr key={idx} className="hover:bg-emerald-50/30 transition-all">
                            <td className="px-4 py-3.5 text-center font-mono text-[10px] text-gray-400">
                              {(currentPage - 1) * itemsPerPage + idx + 1}
                            </td>
                            <td className="px-5 py-3.5 font-extrabold text-gray-900 uppercase">
                              <div className="flex flex-col">
                                <span>{r.nama}</span>
                                {r.jabatan && r.jabatan !== '-' && (
                                  <span className="text-[10px] text-gray-400 font-normal lowercase capitalize">{r.jabatan}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500">{r.nip}</td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => setEditingGolongan({
                                  index: globalIndex >= 0 ? globalIndex : idx,
                                  currentGol: r.golongan || '',
                                  newGol: r.golongan || '',
                                  empName: r.nama,
                                  empNip: r.nip
                                })}
                                className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg text-[10px] font-black uppercase transition-colors inline-flex items-center gap-1 group"
                                title="Klik untuk mengubah Golongan"
                              >
                                <span>{r.golongan || '-'}</span>
                                <i className="bi bi-pencil-fill text-[9px] text-gray-400 group-hover:text-emerald-700"></i>
                              </button>
                            </td>
                            <td className="px-4 py-3.5 text-center text-[10px] text-gray-500">{r.periode}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black text-xs">
                                {umDays} Hari
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-gray-600 text-[11px]">
                              Rp {calc.rate.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-gray-800 text-[11px]">
                              Rp {calc.brutoTotal.toLocaleString('id-ID')}
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono text-[10px] font-bold text-amber-600">
                              {calc.taxPercent}%
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-red-600 text-[11px]">
                              -Rp {calc.pphTotal.toLocaleString('id-ID')}
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono font-black text-emerald-700 text-sm">
                              Rp {calc.netTotal.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedEmployeeDetail(r)}
                                  className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition-all"
                                  title="Lihat Detail Hari Kehadiran"
                                >
                                  <i className="bi bi-eye-fill text-xs"></i>
                                </button>
                                <button
                                  onClick={() => setEditingGolongan({
                                    index: globalIndex >= 0 ? globalIndex : idx,
                                    currentGol: r.golongan || '',
                                    newGol: r.golongan || '',
                                    empName: r.nama,
                                    empNip: r.nip
                                  })}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-lg transition-all"
                                  title="Ubah Golongan"
                                >
                                  <i className="bi bi-pencil-square text-xs"></i>
                                </button>
                                <button
                                  onClick={() => handleDeleteEmployee(globalIndex >= 0 ? globalIndex : idx, r.nama)}
                                  className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition-all"
                                  title="Hapus Pegawai dari Rekap"
                                >
                                  <i className="bi bi-trash-fill text-xs"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 pt-2">
                  <span>Halaman {currentPage} dari {totalPages} ({filteredResults.length} Pegawai)</span>
                  <div className="flex gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-black uppercase disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-black uppercase disabled:opacity-40"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gray-50/60 p-8 rounded-2xl text-center border border-dashed border-gray-200">
                <i className="bi bi-inbox-fill text-4xl text-gray-300 mb-2 block"></i>
                <p className="text-xs font-black text-gray-600 uppercase">Belum ada data rekapitulasi parsed PDF</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Unggah berkas PDF melalui form di atas untuk memulai kalkulasi otomatis.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DETAIL TANGGAL ABSENSI (SHEET 4 FORMAT) */}
        {activeTab === 'detail_absensi' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-center justify-between">
              <span className="font-bold uppercase text-[10px]">Format Tampilan Sheet Detail Uang Makan: No, Nama, NIP, Tanggal Absensi (YYYY-MM-DD)</span>
              <span className="font-mono text-[10px] font-black text-blue-900">{detailUangMakanFlattened.length} Baris Data Absensi</span>
            </div>

            {detailUangMakanFlattened.length > 0 ? (
              <>
                <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100 tracking-[0.2em]">
                        <th className="px-5 py-3.5 w-16 text-center">No</th>
                        <th className="px-6 py-3.5">Nama Pegawai</th>
                        <th className="px-6 py-3.5">NIP</th>
                        <th className="px-6 py-3.5">Tanggal Absensi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-800">
                      {paginatedDetailRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-all">
                          <td className="px-5 py-3 text-center font-mono text-[11px] text-gray-400 font-bold">{row.no}</td>
                          <td className="px-6 py-3 font-extrabold text-gray-900 uppercase">{row.nama}</td>
                          <td className="px-6 py-3 font-mono text-[11px] text-gray-600">{row.nip}</td>
                          <td className="px-6 py-3 font-mono text-emerald-700 font-extrabold">{row.dateStr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 pt-2">
                  <span>Halaman {detailCurrentPage} dari {totalDetailPages} ({detailUangMakanFlattened.length} Baris Detail)</span>
                  <div className="flex gap-1">
                    <button
                      disabled={detailCurrentPage === 1}
                      onClick={() => setDetailCurrentPage(p => p - 1)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-black uppercase disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <button
                      disabled={detailCurrentPage === totalDetailPages}
                      onClick={() => setDetailCurrentPage(p => p + 1)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-black uppercase disabled:opacity-40"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gray-50/60 p-8 rounded-2xl text-center border border-dashed border-gray-200">
                <i className="bi bi-calendar-x text-4xl text-gray-300 mb-2 block"></i>
                <p className="text-xs font-black text-gray-600 uppercase">Tidak ada data detail absensi</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PENGATURAN KALENDER LIBUR & CUTI BERSAMA */}
        {activeTab === 'kalender_libur' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 rounded-2xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight">Pengaturan Kalender Libur Nasional &amp; Cuti Bersama</h4>
                <p className="text-[10px] text-blue-200 font-bold uppercase mt-1">
                  Hari libur &amp; cuti bersama tidak dihitung sebagai hari masuk Uang Makan. Kelola tanggal di sini agar perhitungan absensi akurat.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRecalculateAttendanceWithHolidays}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  <i className="bi bi-arrow-repeat"></i> Hitung Ulang Absensi
                </button>
                <button
                  onClick={handleResetHolidays}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase rounded-xl transition-all flex items-center gap-1.5"
                >
                  <i className="bi bi-arrow-counterclockwise"></i> Reset Standar 2026
                </button>
              </div>
            </div>

            {/* Form Tambah Hari Libur Baru */}
            <form onSubmit={handleAddHoliday} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
              <h5 className="text-xs font-black uppercase text-gray-800 flex items-center gap-2">
                <i className="bi bi-plus-circle-fill text-blue-600"></i> Tambah Hari Libur / Cuti Bersama Baru
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 block mb-1">Tanggal (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={e => setNewHolidayDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono text-xs font-bold outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 block mb-1">Keterangan Hari Libur</label>
                  <input
                    type="text"
                    placeholder="Contoh: Cuti Bersama Idul Fitri"
                    value={newHolidayName}
                    onChange={e => setNewHolidayName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <i className="bi bi-plus-lg"></i> Tambahkan Hari Libur
                  </button>
                </div>
              </div>
            </form>

            {/* Tabel Daftar Hari Libur */}
            <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-inner">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100 tracking-[0.2em]">
                    <th className="px-5 py-3.5 w-12 text-center">No</th>
                    <th className="px-6 py-3.5">Tanggal</th>
                    <th className="px-6 py-3.5">Nama Hari Libur / Cuti Bersama</th>
                    <th className="px-6 py-3.5 text-center">Jenis</th>
                    <th className="px-5 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-800">
                  {holidays.map((h, idx) => {
                    const isCutiBersama = h.name.toLowerCase().includes('cuti bersama');
                    return (
                      <tr key={h.date} className="hover:bg-blue-50/30 transition-all">
                        <td className="px-5 py-3 text-center font-mono text-[10px] text-gray-400">{idx + 1}</td>
                        <td className="px-6 py-3 font-mono font-extrabold text-gray-900">{h.date}</td>
                        <td className="px-6 py-3 font-bold text-gray-800 uppercase">{h.name}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            isCutiBersama 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {isCutiBersama ? 'Cuti Bersama' : 'Libur Nasional'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => handleDeleteHoliday(h.date)}
                            className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition-all"
                            title="Hapus Hari Libur"
                          >
                            <i className="bi bi-trash-fill text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* PDF PREVIEW MODAL */}
      {pdfPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <span className="p-2 bg-red-500/20 text-red-400 rounded-xl">
                  <i className="bi bi-file-earmark-pdf-fill text-xl"></i>
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-black uppercase truncate">{pdfPreviewModal.fileName}</h4>
                  <p className="text-[10px] font-bold uppercase text-slate-400 truncate">
                    {pdfPreviewModal.nama} ({pdfPreviewModal.nip}) • {pdfPreviewModal.periode}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={pdfPreviewModal.fileUrl || pdfPreviewModal.base64}
                  download={pdfPreviewModal.fileName}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-1.5"
                >
                  <i className="bi bi-download"></i> Unduh PDF
                </a>
                <button
                  onClick={handleClosePdfPreview}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6 bg-gray-100 flex-1 overflow-hidden">
              <iframe
                src={pdfPreviewModal.fileUrl || pdfPreviewModal.base64}
                title={pdfPreviewModal.fileName}
                className="w-full h-[70vh] rounded-2xl border border-gray-200 bg-white shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

      {/* DETAIL KEHADIRAN PEGAWAI MODAL */}
      {selectedEmployeeDetail && (() => {
        const detailDays = Array.isArray(selectedEmployeeDetail.days) ? selectedEmployeeDetail.days : [];
        const umDays = detailDays.filter(isHariMasukUM).length;
        const calc = calculateUangMakanByGolongan(selectedEmployeeDetail.golongan || '', umDays, tariffConfig);
        const totalKalender = detailDays.length;
        const totalWeekend = detailDays.filter(d => d && d.isWeekend).length;
        const totalLibur = detailDays.filter(d => d && d.isHoliday).length;
        const totalTidakMasuk = totalKalender - totalWeekend - totalLibur - umDays;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fadeIn">
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                    <i className="bi bi-person-badge-fill text-2xl"></i>
                  </span>
                  <div>
                    <h4 className="text-base font-black uppercase text-white tracking-tight">{selectedEmployeeDetail.nama}</h4>
                    <p className="text-xs text-slate-300 font-mono">
                      NIP: {selectedEmployeeDetail.nip} • Periode: {selectedEmployeeDetail.periode} • Golongan: {selectedEmployeeDetail.golongan || '-'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployeeDetail(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-emerald-700 block">Hari Masuk UM</span>
                    <span className="text-xl font-black text-emerald-900 font-mono">{umDays} Hari</span>
                  </div>
                  <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-sky-700 block">Hak Bruto (Rp)</span>
                    <span className="text-base font-black text-sky-900 font-mono">Rp {calc.brutoTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-amber-700 block">Pot. PPh ({calc.taxPercent}%)</span>
                    <span className="text-base font-black text-amber-900 font-mono">Rp {calc.pphTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-purple-700 block">Diterima Bersih</span>
                    <span className="text-base font-black text-purple-900 font-mono">Rp {calc.netTotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Breakdown Statistics */}
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl">Total Hari: {totalKalender}</span>
                  <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl">Masuk Efektif (UM): {umDays}</span>
                  <span className="px-3 py-1.5 bg-rose-100 text-rose-800 rounded-xl">Libur / Cuti Bersama: {totalLibur}</span>
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl">Akhir Pekan: {totalWeekend}</span>
                  <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-xl">Tidak Hadir / DL Full: {Math.max(0, totalTidakMasuk)}</span>
                </div>

                {/* Daily Table */}
                <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100 tracking-wider">
                        <th className="px-3 py-2.5 text-center w-10">Tgl</th>
                        <th className="px-3 py-2.5">Hari</th>
                        <th className="px-3 py-2.5 text-center">Masuk</th>
                        <th className="px-3 py-2.5 text-center">Pulang</th>
                        <th className="px-4 py-2.5">Keterangan / Status</th>
                        <th className="px-3 py-2.5 text-center">Status UM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-800">
                      {detailDays.map((day, idx) => {
                        if (!day) return null;
                        const isUM = isHariMasukUM(day);
                        return (
                          <tr key={idx} className={isUM ? 'bg-emerald-50/20' : day.isWeekend || day.isHoliday ? 'bg-gray-50/50 opacity-75' : ''}>
                            <td className="px-3 py-2 text-center font-mono text-[11px] font-black text-gray-500">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 text-gray-700 text-[11px] uppercase">
                              {day.dayName || '-'}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-[11px] text-gray-700">
                              {day.jamMasuk || '-'}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-[11px] text-gray-700">
                              {day.jamKeluar || '-'}
                            </td>
                            <td className="px-4 py-2 text-[11px] text-gray-600">
                              {day.status || (day.isWeekend ? 'Akhir Pekan' : day.isHoliday ? 'Hari Libur Nasional' : '-')}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isUM ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black uppercase">
                                  Dihitung UM
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold uppercase">
                                  Tidak Dihitung
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setSelectedEmployeeDetail(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* EDIT GOLONGAN MODAL */}
      {editingGolongan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <i className="bi bi-pencil-square text-lg"></i>
                </span>
                <h4 className="text-sm font-black uppercase">Ubah Golongan Pegawai</h4>
              </div>
              <button
                onClick={() => setEditingGolongan(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-black uppercase text-gray-900">{editingGolongan.empName}</p>
                <p className="text-[11px] font-mono text-gray-500">NIP: {editingGolongan.empNip}</p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">Pilih Golongan Standar PMK</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setEditingGolongan(prev => prev ? { ...prev, newGol: 'Golongan IV' } : null)}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      editingGolongan.newGol.includes('IV') || editingGolongan.newGol.includes('4')
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-black ring-2 ring-emerald-600/20'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="text-xs font-black">Golongan IV</div>
                    <div className="text-[10px] text-gray-500">Rp 41.000 (PPh 15%)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingGolongan(prev => prev ? { ...prev, newGol: 'Golongan III' } : null)}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      editingGolongan.newGol.includes('III') || editingGolongan.newGol.includes('3')
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-black ring-2 ring-emerald-600/20'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="text-xs font-black">Golongan III</div>
                    <div className="text-[10px] text-gray-500">Rp 37.000 (PPh 5%)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingGolongan(prev => prev ? { ...prev, newGol: 'Golongan II' } : null)}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      editingGolongan.newGol.includes('II') || editingGolongan.newGol.includes('2')
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-black ring-2 ring-emerald-600/20'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="text-xs font-black">Golongan II</div>
                    <div className="text-[10px] text-gray-500">Rp 35.000 (PPh 0%)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingGolongan(prev => prev ? { ...prev, newGol: 'Golongan I' } : null)}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      editingGolongan.newGol.includes('I') && !editingGolongan.newGol.includes('II') && !editingGolongan.newGol.includes('III') && !editingGolongan.newGol.includes('IV')
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-black ring-2 ring-emerald-600/20'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="text-xs font-black">Golongan I</div>
                    <div className="text-[10px] text-gray-500">Rp 35.000 (PPh 0%)</div>
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Atau Masukkan Teks Golongan Kustom</label>
                  <input
                    type="text"
                    value={editingGolongan.newGol}
                    onChange={e => setEditingGolongan(prev => prev ? { ...prev, newGol: e.target.value } : null)}
                    placeholder="Contoh: IV/a, III/c, II/d..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-emerald-600 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingGolongan(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-black uppercase rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditedGolongan}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <i className="bi bi-check-lg"></i> Simpan Golongan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 animate-scale-in">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-2xl ${confirmModal.isDanger ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  <i className={`bi ${confirmModal.isDanger ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'} text-2xl`}></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 leading-tight">
                    {confirmModal.title}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Konfirmasi Tindakan</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs text-gray-700 leading-relaxed font-medium">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-black uppercase rounded-xl transition-all disabled:opacity-50"
              >
                {confirmModal.cancelText || 'Batal'}
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={async () => {
                  if (confirmModal.onConfirm) {
                    await confirmModal.onConfirm();
                  }
                }}
                className={`px-5 py-2.5 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 ${
                  confirmModal.isDanger 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' 
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {isActionLoading ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin"></i>
                    Memproses...
                  </>
                ) : (
                  <>
                    <i className={`bi ${confirmModal.isDanger ? 'bi-trash3-fill' : 'bi-check-lg'}`}></i>
                    {confirmModal.confirmText}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border bg-white animate-slide-up max-w-md">
          <span className={`p-2 rounded-xl text-lg shrink-0 ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
            notification.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
          }`}>
            <i className={`bi ${
              notification.type === 'success' ? 'bi-check-circle-fill' :
              notification.type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill'
            }`}></i>
          </span>
          <p className="text-xs font-bold text-gray-800 flex-1 leading-snug">
            {notification.message}
          </p>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 p-1 text-xs"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default UangMakanPage;
