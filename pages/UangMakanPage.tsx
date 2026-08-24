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
  deletePdfFromStore, 
  deleteStoredPdfsByMonth,
  clearAllStoredPdfs, 
  fileToBase64, 
  formatBytes, 
  deriveMonthFolder, 
  formatMonthFolderLabel, 
  StoredPdfRecord 
} from '../pdfStorageUtils';
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

// Helper to calculate Uang Makan based on Golongan PMK Standards
export const calculateUangMakanByGolongan = (
  golonganRaw: string, 
  daysCount: number, 
  config: TariffConfig
) => {
  const gol = (golonganRaw || '').toUpperCase().trim();
  let rate = config.gol3Rate;
  let taxPercent = config.gol3Tax;
  let categoryName = 'Golongan III';

  // Check Roman numerals (IV, III, II, I) or Arabic numbers (4, 3, 2, 1) or text representations
  const isGol4 = /(^|[^\w])(IV|4)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN IV') || gol.includes('GOL IV') || gol.includes('GOLONGAN 4') || gol.includes('GOL 4') || gol.includes('PEMBINA') || gol.includes('UTAMA');
  const isGol3 = /(^|[^\w])(III|3)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN III') || gol.includes('GOL III') || gol.includes('GOLONGAN 3') || gol.includes('GOL 3') || gol.includes('PENATA');
  const isGol2 = /(^|[^\w])(II|2)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN II') || gol.includes('GOL II') || gol.includes('GOLONGAN 2') || gol.includes('GOL 2') || gol.includes('PENGATUR');
  const isGol1 = /(^|[^\w])(I|1)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN I') || gol.includes('GOL I') || gol.includes('GOLONGAN 1') || gol.includes('GOL 1') || gol.includes('JURU');

  if (isGol4) {
    rate = config.gol4Rate;
    taxPercent = config.gol4Tax;
    categoryName = 'Golongan IV';
  } else if (isGol3) {
    rate = config.gol3Rate;
    taxPercent = config.gol3Tax;
    categoryName = 'Golongan III';
  } else if (isGol2) {
    rate = config.gol12Rate;
    taxPercent = config.gol12Tax;
    categoryName = 'Golongan II';
  } else if (isGol1) {
    rate = config.gol12Rate;
    taxPercent = config.gol12Tax;
    categoryName = 'Golongan I';
  } else {
    rate = config.gol3Rate;
    taxPercent = config.gol3Tax;
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

  // Tariff Config State
  const [tariffConfig, setTariffConfig] = useState<TariffConfig>(() => {
    const saved = localStorage.getItem('um_tariff_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_TARIFF_CONFIG; }
    }
    return DEFAULT_TARIFF_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem('um_tariff_config', JSON.stringify(tariffConfig));
  }, [tariffConfig]);

  // Holiday Calendar States
  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const saved = localStorage.getItem('absen_holidays');
    return saved ? JSON.parse(saved) : DEFAULT_HOLIDAYS;
  });

  useEffect(() => {
    localStorage.setItem('absen_holidays', JSON.stringify(holidays));
  }, [holidays]);

  // Form for New Holiday Entry
  const [newHolidayDate, setNewHolidayDate] = useState<string>('');
  const [newHolidayName, setNewHolidayName] = useState<string>('');

  // Persistent Parsed Results State
  const [results, setResults] = useState<ParsedAttendance[]>(() => {
    const saved = localStorage.getItem('absen_pdf_parsed_results');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('absen_pdf_parsed_results', JSON.stringify(results));
  }, [results]);

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
  const itemsPerPage = 15;

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

  // Load stored PDF files from IndexedDB
  const reloadStoredPdfs = async () => {
    try {
      const list = await getAllStoredPdfs();
      list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setStoredPdfs(list);
    } catch (err) {
      console.error('Gagal memuat arsip PDF tersimpan:', err);
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
    }

    const parsedResults: ParsedAttendance[] = [];
    const batchSize = 4;

    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batch = selectedFiles.slice(i, i + batchSize);
      await Promise.all(batch.map(async file => {
        try {
          setParseProgress(prev => ({ ...prev, currentFileName: file.name }));
          const base64Str = await fileToBase64(file);
          const rawResObj = await parseSinglePdf(file, holidays);
          const resObj = enrichWithMasterPegawai(rawResObj);
          parsedResults.push(resObj);

          const monthFolder = deriveMonthFolder(resObj.periode);

          const pdfRecord: StoredPdfRecord = {
            id: `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
            monthFolder,
            nip: resObj.nip || '-',
            nama: resObj.nama || '-',
            periode: resObj.periode || '-',
            base64: base64Str
          };

          await savePdfToStore(pdfRecord);

          uploadFileToDrive(file.name, 'application/pdf', base64Str).catch(err => {
            console.warn('Proses upload Drive cloud:', err);
          });

          setParseProgress(prev => ({ ...prev, current: prev.current + 1, success: prev.success + 1 }));
        } catch (err) {
          console.error(`Error parsing file ${file.name}:`, err);
          setParseProgress(prev => ({ ...prev, current: prev.current + 1, failed: prev.failed + 1 }));
        }
      }));
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

    logActivity('CREATE', 'Uang Makan', `Memproses parsing ${parsedResults.length} berkas PDF Uang Makan dan menyimpan ke arsip drive.`);
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
      const umDays = r.days.filter(isHariMasukUM).length;
      totalUangMakanDays += umDays;

      const calc = calculateUangMakanByGolongan(r.golongan || '', umDays, tariffConfig);
      totalBruto += calc.brutoTotal;
      totalPph += calc.pphTotal;
      totalNet += calc.netTotal;
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
      const umDays = r.days.filter(isHariMasukUM).length;
      const calc = calculateUangMakanByGolongan(r.golongan || '', umDays, tariffConfig);

      totalNetOverall += calc.netTotal;
      totalBrutoOverall += calc.brutoTotal;
      totalPphOverall += calc.pphTotal;
      totalHariOverall += umDays;
      if (r.nip) uniqueNips.add(r.nip);

      let monthLabel = (r.periode || '').trim();
      if (!monthLabel) {
        const firstValidDay = r.days.find(d => d.dateStr || d.date);
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
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        (r.nama && r.nama.toLowerCase().includes(q)) || 
        (r.nip && r.nip.includes(q)) || 
        (r.golongan && r.golongan.toLowerCase().includes(q)) ||
        (r.periode && r.periode.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterGolongan !== 'all') {
        const umDays = r.days.filter(isHariMasukUM).length;
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
      const umDays = r.days.filter(isHariMasukUM);
      umDays.forEach((d, idx) => {
        const dateFormatted = d.date ? getIsoDateStr(d.date) : d.dateStr;
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
  const [detailCurrentPage, setDetailCurrentPage] = useState<number>(1);
  const detailItemsPerPage = 25;
  const totalDetailPages = Math.ceil(detailUangMakanFlattened.length / detailItemsPerPage) || 1;
  const paginatedDetailRows = useMemo(() => {
    const start = (detailCurrentPage - 1) * detailItemsPerPage;
    return detailUangMakanFlattened.slice(start, start + detailItemsPerPage);
  }, [detailUangMakanFlattened, detailCurrentPage]);

  // Export Multi-Sheet Excel (4 Sheets)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Rekap Uang Makan Per Pegawai Sesuai PMK
    const rekapPMKData = results.map((r, i) => {
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
    const jumlahHariKerjaData = results.map(r => {
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
    results.forEach(r => {
      r.days.forEach(d => {
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
    results.forEach(r => {
      const umDays = r.days.filter(isHariMasukUM);
      umDays.forEach((d, idx) => {
        const dateFormatted = d.date ? getIsoDateStr(d.date) : d.dateStr;
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

    XLSX.writeFile(wb, `Rekap_Uang_Makan_Golongan_PMK_SDM_DJKI_${new Date().toISOString().split('T')[0]}.xlsx`);
    logActivity('DOWNLOAD', 'Uang Makan', 'Mengekspor rekap Uang Makan sesuai standar PMK ke Excel Multi-Sheet (4 Sheet)');
  };

  // Export PDF Report
  const handleExportPdf = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(14);
    doc.text('REKAPITULASI UANG MAKAN PEGAWAI SDM DJKI (STANDAR PMK)', 40, 40);
    doc.setFontSize(9);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Gol. I&II: Rp35rb (0%), Gol. III: Rp37rb (5%), Gol. IV: Rp41rb (15%)`, 40, 55);

    const tableData = results.map((r, i) => {
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
    <div className="space-y-8 animate-fadeIn pb-16">
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
                      {new Date(pdf.uploadedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setPdfPreviewModal(pdf)}
                          className="p-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Lihat Pratinjau PDF"
                        >
                          <i className="bi bi-eye-fill text-sm"></i>
                        </button>
                        <a
                          href={pdf.base64}
                          download={pdf.fileName}
                          className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-all shadow-sm inline-flex items-center justify-center"
                          title="Unduh Berkas PDF Original"
                        >
                          <i className="bi bi-download text-sm"></i>
                        </a>
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

          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
              >
                <i className="bi bi-file-earmark-excel-fill text-sm"></i> Ekspor Excel Multi-Sheet
              </button>
              <button
                onClick={handleExportPdf}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
              >
                <i className="bi bi-file-earmark-pdf-fill text-sm"></i> Ekspor PDF
              </button>
            </div>
          )}
        </div>

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
                  href={pdfPreviewModal.base64}
                  download={pdfPreviewModal.fileName}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-1.5"
                >
                  <i className="bi bi-download"></i> Unduh PDF
                </a>
                <button
                  onClick={() => setPdfPreviewModal(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6 bg-gray-100 flex-1 overflow-hidden">
              <iframe
                src={pdfPreviewModal.base64}
                title={pdfPreviewModal.fileName}
                className="w-full h-[70vh] rounded-2xl border border-gray-200 bg-white shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

      {/* DETAIL KEHADIRAN PEGAWAI MODAL */}
      {selectedEmployeeDetail && (() => {
        const umDays = selectedEmployeeDetail.days.filter(isHariMasukUM).length;
        const calc = calculateUangMakanByGolongan(selectedEmployeeDetail.golongan || '', umDays, tariffConfig);
        const totalKalender = selectedEmployeeDetail.days.length;
        const totalWeekend = selectedEmployeeDetail.days.filter(d => d.isWeekend).length;
        const totalLibur = selectedEmployeeDetail.days.filter(d => d.isHoliday).length;
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
                      {selectedEmployeeDetail.days.map((day, idx) => {
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
