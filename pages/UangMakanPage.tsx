import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  DEFAULT_HOLIDAYS, 
  parseSinglePdf, 
  Holiday, 
  ParsedAttendance, 
  isHariMasukUM, 
  getIsoDateStr 
} from '../pdfParserUtils';
import { 
  savePdfToStore, 
  getAllStoredPdfs, 
  deletePdfFromStore, 
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

  // Match Roman numerals (IV, III, II, I) or Arabic numbers (4, 3, 2, 1) cleanly
  const isGol4 = /(^|[^\w])(IV|4)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN IV') || gol.includes('GOL IV') || gol.includes('GOLONGAN 4');
  const isGol3 = /(^|[^\w])(III|3)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN III') || gol.includes('GOL III') || gol.includes('GOLONGAN 3');
  const isGol2 = /(^|[^\w])(II|2)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN II') || gol.includes('GOL II') || gol.includes('GOLONGAN 2');
  const isGol1 = /(^|[^\w])(I|1)([\.\/a-e\s_-]|$)/i.test(gol) || gol.includes('GOLONGAN I') || gol.includes('GOL I') || gol.includes('GOLONGAN 1');

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

  // Active View Tab: Rekap Pegawai | Detail Absensi | Kalender Libur
  const [activeTab, setActiveTab] = useState<'rekap_pegawai' | 'detail_absensi' | 'kalender_libur'>('rekap_pegawai');

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

  // Table Search & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

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

  // Holiday Management Functions
  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) {
      alert('Mohon isi tanggal dan keterangan hari libur / cuti bersama.');
      return;
    }

    if (holidays.some(h => h.date === newHolidayDate)) {
      alert(`Tanggal ${newHolidayDate} sudah terdaftar sebagai hari libur.`);
      return;
    }

    const updated = [...holidays, { date: newHolidayDate, name: newHolidayName.trim() }].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(updated);
    setNewHolidayDate('');
    setNewHolidayName('');
    logActivity('CREATE', 'Uang Makan', `Menambahkan hari libur: ${newHolidayDate} (${newHolidayName})`);
  };

  const handleDeleteHoliday = (date: string) => {
    if (!confirm(`Hapus tanggal libur ${date} dari kalender?`)) return;
    const updated = holidays.filter(h => h.date !== date);
    setHolidays(updated);
    logActivity('DELETE', 'Uang Makan', `Menghapus hari libur: ${date}`);
  };

  const handleResetHolidays = () => {
    if (!confirm('Kembalikan kalender libur ke daftar standar nasional 2025/2026?')) return;
    setHolidays(DEFAULT_HOLIDAYS);
    logActivity('UPDATE', 'Uang Makan', 'Mereset kalender libur ke standar nasional.');
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

    const parsedResults: ParsedAttendance[] = [];
    const batchSize = 4;

    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batch = selectedFiles.slice(i, i + batchSize);
      await Promise.all(batch.map(async file => {
        try {
          setParseProgress(prev => ({ ...prev, currentFileName: file.name }));
          const base64Str = await fileToBase64(file);
          const resObj = await parseSinglePdf(file, holidays);
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

  const handleDeleteStoredPdf = async (pdf: StoredPdfRecord) => {
    if (!confirm(`Hapus berkas PDF "${pdf.fileName}" dari arsip drive bulan ${formatMonthFolderLabel(pdf.monthFolder)}?`)) return;
    try {
      await deletePdfFromStore(pdf.id);
      await reloadStoredPdfs();
      logActivity('DELETE', 'Uang Makan', `Menghapus berkas PDF ${pdf.fileName} dari arsip drive.`);
    } catch (err) {
      console.error('Gagal menghapus file PDF:', err);
    }
  };

  const handleClearAllStoredPdfs = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus SEMUA berkas PDF di arsip drive Uang Makan?')) return;
    try {
      await clearAllStoredPdfs();
      await reloadStoredPdfs();
      logActivity('DELETE', 'Uang Makan', 'Membersihkan seluruh arsip drive PDF Uang Makan.');
    } catch (err) {
      console.error('Error clearing stored PDFs:', err);
    }
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

  // Filtered Results for pegawai
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (r.nama && r.nama.toLowerCase().includes(q)) || 
             (r.nip && r.nip.includes(q)) || 
             (r.golongan && r.golongan.toLowerCase().includes(q)) ||
             (r.periode && r.periode.toLowerCase().includes(q));
    });
  }, [results, searchTerm]);

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
            <button
              onClick={handleClearAllStoredPdfs}
              className="px-4 py-2 border-2 border-red-200 hover:border-red-300 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all hover:bg-red-50 flex items-center gap-1.5 shrink-0"
            >
              <i className="bi bi-trash3-fill"></i> Hapus Semua Arsip PDF
            </button>
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
            onClick={() => setActiveTab('rekap_pegawai')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'rekap_pegawai'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <i className="bi bi-person-lines-fill"></i> Tab 1: Rekap Uang Makan Per Golongan
          </button>
          <button
            onClick={() => setActiveTab('detail_absensi')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'detail_absensi'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <i className="bi bi-calendar3"></i> Tab 2: Detail Tanggal Absensi (Format Sheet 3)
          </button>
          <button
            onClick={() => setActiveTab('kalender_libur')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'kalender_libur'
                ? 'bg-white text-blue-800 shadow-md'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <i className="bi bi-calendar-event-fill"></i> Tab 3: Pengaturan Kalender Libur ({holidays.length})
          </button>
        </div>

        {/* TAB 1: REKAP UANG MAKAN PER PEGAWAI ACCORDING TO PMK GOLONGAN */}
        {activeTab === 'rekap_pegawai' && (
          <div className="space-y-4">
            {/* SEARCH INPUT */}
            <div className="relative">
              <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                placeholder="Cari berdasarkan Nama, NIP, Golongan, atau Periode..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-800">
                      {paginatedResults.map((r, idx) => {
                        const umDays = r.days.filter(isHariMasukUM).length;
                        const calc = calculateUangMakanByGolongan(r.golongan || '', umDays, tariffConfig);

                        return (
                          <tr key={idx} className="hover:bg-emerald-50/30 transition-all">
                            <td className="px-4 py-3.5 text-center font-mono text-[10px] text-gray-400">
                              {(currentPage - 1) * itemsPerPage + idx + 1}
                            </td>
                            <td className="px-5 py-3.5 font-extrabold text-gray-900 uppercase">{r.nama}</td>
                            <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500">{r.nip}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase">
                                {r.golongan || '-'}
                              </span>
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
    </div>
  );
};

export default UangMakanPage;
