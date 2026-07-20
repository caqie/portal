
import React, { useState, useEffect, useMemo } from 'react';
import { fetchPegawaiFromSheets, fetchAllAbsensiHistoryFromSheets, fetchAbsensiConfig, saveAbsensiConfig, resendAbsensiToSimpeg } from '../spreadsheetService';
import { Pegawai, AbsensiRecord, AbsensiConfig } from '../types';
import { useAuth } from '../AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DEFAULT_HOLIDAYS, parseSinglePdf, Holiday, ParsedAttendance } from '../pdfParserUtils';

const RekapAbsensiPage = () => {
  const { user, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  const isSuperadmin = user?.role === 'Superadmin';
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'log' | 'rekap_pdf'>('log');

  // Existing Absensi History States
  const [globalHistory, setGlobalHistory] = useState<AbsensiRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [resendingIds, setResendingIds] = useState<string[]>([]);

  // Bulk PDF States
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [pdfjsError, setPdfjsError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ParsedAttendance[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parseProgress, setParseProgress] = useState({
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
    currentFileName: ''
  });

  // Holiday States
  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const saved = localStorage.getItem('absen_holidays');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_HOLIDAYS; }
    }
    return DEFAULT_HOLIDAYS;
  });
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  // Results Filter & Pagination
  const [resultsSearchTerm, setResultsSearchTerm] = useState('');
  const [resultsCurrentPage, setResultsCurrentPage] = useState(1);
  const resultsPerPage = 10;
  const [selectedResultDetail, setSelectedResultDetail] = useState<ParsedAttendance | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('absen_holidays', JSON.stringify(holidays));
  }, [holidays]);

  useEffect(() => { 
    loadData();
    loadPdfJS();
  }, []);

  // Load PDF.js from CDN to avoid build-time worker complications in Vite
  const loadPdfJS = async () => {
    try {
      if ((window as any).pdfjsLib) {
        setPdfjsLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        setPdfjsLoaded(true);
      };
      script.onerror = () => {
        setPdfjsError('Gagal memuat pustaka parser PDF dari CDN. Harap periksa koneksi internet.');
      };
      document.head.appendChild(script);
    } catch (err: any) {
      setPdfjsError(err.message || String(err));
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pegawais, history] = await Promise.all([
        fetchPegawaiFromSheets(),
        fetchAllAbsensiHistoryFromSheets()
      ]);
      setPegawaiList(pegawais);
      setGlobalHistory(isViewer ? history.filter((a: any) => a.nip === user?.nip) : history);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleResend = async (record: AbsensiRecord) => {
    if (resendingIds.includes(record.id)) return;
    setResendingIds(prev => [...prev, record.id]);
    try {
      const ok = await resendAbsensiToSimpeg(record);
      if (ok) {
        await loadData();
      } else {
        alert("Gagal dikirim ulang. Silakan periksa koneksi atau konfigurasi SIMPEG.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResendingIds(prev => prev.filter(id => id !== record.id));
    }
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const [d, m, y] = dateStr.split('/');
    return new Date(`${y}-${m}-${d}`);
  };

  const filteredLogs = useMemo(() => {
    return globalHistory.filter(log => {
      const matchSearch = log.nama.toLowerCase().includes(searchTerm.toLowerCase()) || log.nip.includes(searchTerm);
      
      let matchDate = true;
      if (log.tanggal) {
        const logDate = parseDate(log.tanggal);
        if (logDate) {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (logDate < start) matchDate = false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (logDate > end) matchDate = false;
          }
        }
      } else if (startDate || endDate) {
        matchDate = false;
      }
      
      return matchSearch && matchDate;
    });
  }, [globalHistory, searchTerm, startDate, endDate]);

  const handleExport = () => {
    const data = filteredLogs.map(l => ({ NIP: l.nip, Nama: l.nama, Tanggal: l.tanggal, Waktu: l.waktu, Tipe: l.tipe, Skor: `${(l.confidence * 100).toFixed(0)}%`, Lokasi: l.lokasi }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
    XLSX.writeFile(wb, `Rekap_Absen_${new Date().getTime()}.xlsx`);
    logActivity('DOWNLOAD', 'Absensi', 'Mengekspor rekap absensi ke Excel');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Rekapitulasi Absensi Biometrik - DJKI", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 28);
    doc.text(`Periode: ${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}`, 14, 34);
    doc.text(`Total Data: ${filteredLogs.length} Entri`, 14, 40);
    
    const tableData = filteredLogs.map(l => [
      l.nip,
      l.nama,
      l.tanggal || '-',
      l.waktu,
      l.tipe,
      l.status,
      l.lokasi
    ]);

    autoTable(doc, {
      head: [['NIP', 'Nama', 'Tanggal', 'Waktu', 'Tipe', 'Status', 'Lokasi']],
      body: tableData,
      startY: 48,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 48 }
    });

    doc.save(`Rekap_Absen_${new Date().getTime()}.pdf`);
    logActivity('DOWNLOAD', 'Absensi', 'Mengekspor rekap absensi ke PDF');
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setResults([]);
  };

  // Batch Parser Queue for massive files
  const handleParseFiles = async () => {
    if (selectedFiles.length === 0) return;
    setIsParsing(true);
    setParseProgress({
      current: 0,
      total: selectedFiles.length,
      success: 0,
      failed: 0,
      currentFileName: ''
    });

    const parsedResults: ParsedAttendance[] = [];
    const batchSize = 6; // Process 6 files in parallel

    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batch = selectedFiles.slice(i, i + batchSize);
      await Promise.all(batch.map(async (file) => {
        try {
          setParseProgress(prev => ({ ...prev, currentFileName: file.name }));
          const resObj = await parseSinglePdf(file, holidays);
          parsedResults.push(resObj);
          setParseProgress(prev => ({ ...prev, current: prev.current + 1, success: prev.success + 1 }));
        } catch (err) {
          console.error(`Error parsing file ${file.name}:`, err);
          setParseProgress(prev => ({ ...prev, current: prev.current + 1, failed: prev.failed + 1 }));
        }
      }));
    }

    setIsParsing(false);
    setResults(parsedResults);
    logActivity('CREATE', 'Absensi', `Memproses parsing ${parsedResults.length} file PDF absensi bulanan.`);
  };

  // Export parsed PDF statistics back to Multi-Sheet Excel
  const handleExportResultsExcel = () => {
    if (results.length === 0) return;
    
    // Sheet 1: Summary ringkasan
    const summaryData = results.map((r, index) => ({
      'No': index + 1,
      'NIP': r.nip,
      'Nama': r.nama,
      'Departemen / Unit Kerja': r.departemen,
      'Golongan': r.golongan,
      'Jabatan': r.jabatan,
      'Periode Laporan': r.periode,
      'Total Hari Kalender': r.summary.totalCalendarDays,
      'Hari Sabtu/Minggu (Weekend)': r.summary.weekendsCount,
      'Hari Libur Nasional & Cuti Bersama': r.summary.holidaysCount,
      'Hari Kerja Efektif': r.summary.effectiveWorkdays,
      'Hadir (Hari)': r.summary.presentCount,
      'Dinas Luar Full (DL FULL)': r.summary.dlFullCount,
      'Cuti / Sakit / Izin (Excused)': r.summary.excusedCount,
      'Tidak Hadir (Alpa)': r.summary.absentCount,
      'Terlambat (Kali)': r.summary.lateCount || 0,
      'Durasi Terlambat (Menit)': r.summary.totalLateMinutes || 0,
      'Pulang Cepat (Kali)': r.summary.earlyLeaveCount || 0,
      'Durasi Pulang Cepat (Menit)': r.summary.totalEarlyLeaveMinutes || 0,
      'Persentase Kehadiran (%)': `${r.summary.attendanceRate}%`
    }));

    // Sheet 2: Detail logs harian untuk penelaahan mendalam (auditing)
    const detailData: any[] = [];
    results.forEach((r, empIndex) => {
      let lastMonthYear = '';
      r.days.forEach(d => {
        const curDate = d.date;
        const curMonthYear = curDate instanceof Date && !isNaN(curDate.getTime())
          ? `${curDate.getFullYear()}-${curDate.getMonth()}`
          : '';
          
        const isNewMonth = curMonthYear !== lastMonthYear;
        if (isNewMonth) {
          lastMonthYear = curMonthYear;
        }

        detailData.push({
          'No': isNewMonth ? empIndex + 1 : '',
          'Nama Pegawai': isNewMonth ? r.nama : '',
          'NIP': isNewMonth ? r.nip : '',
          'Departemen / Unit Kerja': isNewMonth ? r.departemen : '',
          'Golongan': isNewMonth ? r.golongan : '',
          'Jabatan': isNewMonth ? r.jabatan : '',
          'Tanggal': d.dateStr,
          'Hari': d.dayName,
          'Wajib Masuk': d.requiredCheckInStr || '-',
          'Jam Masuk': d.jamMasuk || '-',
          'Status Terlambat': d.isLate ? `Terlambat (${d.lateMinutes} Menit)` : (d.jamMasuk ? 'Tepat Waktu' : '-'),
          'Wajib Pulang': d.requiredCheckOutStr || '-',
          'Jam Keluar': d.jamKeluar || '-',
          'Status Pulang Cepat': d.isEarlyLeave ? `Pulang Cepat (${d.earlyLeaveMinutes} Menit)` : (d.jamKeluar ? 'Sesuai Ketentuan' : '-'),
          'Status Dokumen': d.status || '-',
          'Hari Libur/Weekend': d.isWeekend ? 'Akhir Pekan' : (d.isHoliday ? 'Hari Libur Nasional/Cuti Bersama' : 'Hari Kerja'),
          'Klasifikasi Kehadiran': d.attendanceType === 'PRESENT' ? 'Hadir' :
                                  d.attendanceType === 'DL_FULL' ? 'DL Full (Dinas Luar)' :
                                  d.attendanceType === 'EXCUSED' ? 'Excused (Cuti/Sakit/Izin)' :
                                  d.attendanceType === 'ABSENT' ? 'Alpa (Tidak Hadir)' :
                                  d.attendanceType === 'WEEKEND' ? 'Akhir Pekan' : 'Hari Libur Nasional'
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsDetail = XLSX.utils.json_to_sheet(detailData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Absensi");
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Harian Seluruh Pegawai");
    XLSX.writeFile(wb, `Rekap_Kalkulasi_Absensi_PDF_${new Date().getTime()}.xlsx`);
    logActivity('DOWNLOAD', 'Absensi', `Mengekspor rekap spreadsheet bulk (${results.length} pegawai) ke Excel.`);
  };

  // Add / Delete custom holiday
  const handleAddHoliday = () => {
    if (!newHolidayDate || !newHolidayName) return alert("Pilih tanggal dan isi nama libur.");
    if (holidays.some(h => h.date === newHolidayDate)) return alert("Tanggal ini sudah terdaftar sebagai libur.");
    
    setHolidays(prev => [...prev, { date: newHolidayDate, name: newHolidayName }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const handleDeleteHoliday = (date: string) => {
    setHolidays(prev => prev.filter(h => h.date !== date));
  };

  // Filtered parsed results search
  const filteredResults = useMemo(() => {
    return results.filter(r => 
      r.nama.toLowerCase().includes(resultsSearchTerm.toLowerCase()) || 
      r.nip.includes(resultsSearchTerm) ||
      r.departemen.toLowerCase().includes(resultsSearchTerm.toLowerCase())
    );
  }, [results, resultsSearchTerm]);

  // Pagination for parsed results
  const paginatedResults = useMemo(() => {
    const startIndex = (resultsCurrentPage - 1) * resultsPerPage;
    return filteredResults.slice(startIndex, startIndex + resultsPerPage);
  }, [filteredResults, resultsCurrentPage]);

  const totalPages = Math.ceil(filteredResults.length / resultsPerPage);

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      {/* HEADER WITH TAB TOGGLES */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-100 pb-6">
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-gray-950 uppercase tracking-tighter leading-none">Manajemen & Rekap Absensi</h3>
          <p className="text-[10px] md:text-[11px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-3">Monitoring Kehadiran Biometrik & Kalkulasi Laporan PDF Bulk</p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-2xl self-start lg:self-auto shadow-inner">
          <button 
            onClick={() => setActiveTab('log')}
            className={`px-5 py-3 rounded-xl font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'log' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <i className="bi bi-clock-history text-sm"></i> Riwayat Biometrik
          </button>
          <button 
            onClick={() => setActiveTab('rekap_pdf')}
            className={`px-5 py-3 rounded-xl font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'rekap_pdf' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <i className="bi bi-file-earmark-pdf-fill text-sm"></i> Rekap PDF Bulk (&gt;500 File)
          </button>
        </div>
      </div>

      {/* TAB 1: RIWAYAT ABSENSI BIOMETRIK (ORIGINAL SYSTEM) */}
      {activeTab === 'log' && (
        <div className="space-y-8">
          {/* ANALYTICS MINI CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
             <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Logs</p><h4 className="text-2xl font-black text-blue-600">{filteredLogs.length}</h4></div>
             <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Presensi Masuk</p><h4 className="text-2xl font-black text-emerald-600">{filteredLogs.filter(l=>l.tipe==='MASUK').length}</h4></div>
             <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Presensi Pulang</p><h4 className="text-2xl font-black text-amber-600">{filteredLogs.filter(l=>l.tipe==='PULANG').length}</h4></div>
             <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Biometric Status</p><h4 className="text-2xl font-black text-gray-950 uppercase">Secured</h4></div>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-[3rem] md:rounded-[4rem] border border-gray-100 shadow-sm space-y-8">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="relative flex-1">
                <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-xl"></i>
                <input type="text" placeholder="Cari Nama Pegawai atau NIP..." className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] text-xs md:text-sm font-bold uppercase outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 min-w-[180px]">
                  <label className="absolute -top-2.5 left-5 bg-white px-2 text-[9px] font-black text-gray-400 uppercase">Dari Tanggal</label>
                  <input type="date" className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] text-xs font-bold outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="relative flex-1 min-w-[180px]">
                  <label className="absolute -top-2.5 left-5 bg-white px-2 text-[9px] font-black text-gray-400 uppercase">Sampai Tanggal</label>
                  <input type="date" className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] text-xs font-bold outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}
                  className="px-6 bg-gray-100 text-gray-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                  title="Reset Filter"
                >
                  <i className="bi bi-x-circle"></i> Reset
                </button>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-3 border-t border-gray-50 pt-4">
              {isSuperadmin && filteredLogs.some(l => l.simpegStatus === 'FAILED') && (
                <button 
                  onClick={async () => {
                    const failed = filteredLogs.filter(l => l.simpegStatus === 'FAILED');
                    if (confirm(`Kirim ulang ${failed.length} data yang gagal?`)) {
                       setLoading(true);
                       for (const r of failed) {
                         await resendAbsensiToSimpeg(r);
                       }
                       await loadData();
                       setLoading(false);
                    }
                  }}
                  className="h-14 px-6 bg-rose-50 text-rose-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-3 border border-rose-100"
                >
                   <i className="bi bi-arrow-repeat text-xl"></i> Retry All Failed
                </button>
              )}
              <button onClick={loadData} className="h-14 w-14 flex items-center justify-center bg-white border border-gray-100 text-gray-400 rounded-2xl shadow-sm hover:text-blue-600 transition-all"><i className={`bi bi-arrow-clockwise text-2xl ${loading ? 'animate-spin' : ''}`}></i></button>
              <button onClick={handleExport} className="h-14 px-6 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                 <i className="bi bi-file-earmark-spreadsheet-fill text-xl"></i> Excel
              </button>
              <button onClick={handleExportPDF} className="h-14 px-6 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                 <i className="bi bi-file-earmark-pdf-fill text-xl"></i> PDF
              </button>
            </div>

            {/* TABLE VIEW */}
            <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0 custom-scrollbar">
              <table className="min-w-[1000px] w-full text-left">
                  <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b tracking-[0.2em]">
                     <tr>
                        <th className="px-10 py-6">Informasi Pegawai</th>
                        <th className="px-4 py-6 text-center">Waktu & Tipe</th>
                        <th className="px-4 py-6">Lokasi Presensi</th>
                        <th className="px-4 py-6 text-center">Akurasi Biometrik</th>
                        <th className="px-10 py-6 text-right">Verifikasi</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                     {filteredLogs.map(l => {
                        const profile = pegawaiList.find(p => p.nip === l.nip);
                        return (
                            <tr key={l.id} className="hover:bg-blue-50/5 transition-all group">
                            <td className="px-10 py-6">
                                <div className="flex items-center gap-5">
                                    <div className="h-12 w-12 rounded-2xl overflow-hidden bg-gray-100 border-2 border-white ring-1 ring-gray-100 shadow-lg shrink-0">
                                        {profile?.foto ? <img src={profile.foto} className="w-full h-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-blue-600 font-black">?</div>}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-black uppercase text-gray-950 leading-tight">{l.nama}</p>
                                        <p className="text-[10px] font-mono text-gray-400 mt-1">NIP. {l.nip}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-6 text-center">
                                <div className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase mb-1.5 ${l.tipe === 'MASUK' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'}`}>{l.tipe}</div>
                                <p className="text-[11px] font-black text-gray-950 tabular-nums">{l.waktu}</p>
                            </td>
                            <td className="px-4 py-6">
                                <p className="text-[11px] font-black text-gray-950 uppercase">{l.lokasi}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest">Employee Data Match</p>
                            </td>
                            <td className="px-4 py-6 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${l.confidence * 100}%` }}></div>
                                    </div>
                                    <span className="text-[11px] font-black text-emerald-600">{(l.confidence * 100).toFixed(0)}%</span>
                                </div>
                            </td>
                            <td className="px-10 py-6 text-right">
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-xl border border-emerald-100 tracking-widest invisible md:visible">VERIFIED</span>
                                        {l.simpegStatus === 'SUCCESS' ? (
                                            <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20" title="Terkirim ke SIMPEG">
                                                <i className="bi bi-check-lg text-lg"></i>
                                            </div>
                                        ) : l.simpegStatus === 'FAILED' ? (
                                            <div className="h-8 w-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 cursor-help" title={`Gagal ke SIMPEG: ${l.simpegError || 'Unknown Error'}`}>
                                                <i className="bi bi-exclamation-triangle text-lg"></i>
                                            </div>
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 animate-pulse" title="Menunggu Sinkronisasi / Pending">
                                                <i className="bi bi-arrow-repeat text-lg"></i>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isSuperadmin && l.simpegStatus !== 'SUCCESS' && (
                                        <button 
                                            onClick={() => handleResend(l)}
                                            disabled={resendingIds.includes(l.id)}
                                            className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 disabled:opacity-50"
                                        >
                                            {resendingIds.includes(l.id) ? (
                                                <><i className="bi bi-arrow-clockwise animate-spin"></i> SYNCING</>
                                            ) : (
                                                <><i className="bi bi-cloud-arrow-up-fill"></i> KIRIM ULANG</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </td>
                            </tr>
                        )
                     })}
                  </tbody>
              </table>
              {filteredLogs.length === 0 && <div className="py-32 text-center text-gray-300 font-black uppercase text-[11px] tracking-widest opacity-40">Database audit absensi tidak ditemukan</div>}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BULK PDF PARSER & REKAPITULASI (NEW CAPABILITY) */}
      {activeTab === 'rekap_pdf' && (
        <div className="space-y-8 animate-fadeIn text-black">
          {pdfjsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold uppercase flex items-center gap-3">
              <i className="bi bi-exclamation-octagon text-xl"></i> {pdfjsError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT SIDE: CONFIG & HOLIDAYS */}
            <div className="lg:col-span-1 bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <div>
                <h4 className="text-sm font-black text-gray-950 uppercase tracking-wider mb-1">Pengaturan Kalender Libur</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Sabtu, Minggu, Hari Libur Nasional & Cuti Bersama dikecualikan otomatis dari hitungan hari kerja efektif.</p>
              </div>

              {/* Add holiday form */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Tambah Hari Libur Baru</p>
                <div className="grid grid-cols-1 gap-2.5">
                  <input 
                    type="date" 
                    value={newHolidayDate} 
                    onChange={e => setNewHolidayDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-all"
                  />
                  <input 
                    type="text" 
                    placeholder="Nama Libur (Contoh: Waisak)" 
                    value={newHolidayName} 
                    onChange={e => setNewHolidayName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-600 transition-all"
                  />
                  <button 
                    onClick={handleAddHoliday}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase rounded-xl tracking-wider shadow-md transition-all active:scale-95"
                  >
                    Tambah Libur
                  </button>
                </div>
              </div>

              {/* Holiday list container */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Libur Nasional & Cuti Bersama ({holidays.length})</p>
                  <button 
                    onClick={() => { if (confirm("Reset ke kalender standar?")) setHolidays(DEFAULT_HOLIDAYS); }}
                    className="text-[9px] font-black text-blue-600 hover:underline uppercase"
                  >
                    Reset Default
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50 pr-2 custom-scrollbar">
                  {holidays.map(h => (
                    <div key={h.date} className="py-2 flex items-center justify-between text-xs group">
                      <div className="min-w-0">
                        <p className="font-extrabold text-gray-900 truncate uppercase">{h.name}</p>
                        <p className="font-mono text-[9px] text-gray-400 mt-0.5">{h.date}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteHoliday(h.date)}
                        className="text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-all"
                        title="Hapus Libur"
                      >
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  ))}
                  {holidays.length === 0 && (
                    <p className="text-[10px] text-center text-gray-400 py-6 uppercase font-bold">Tidak ada libur nasional terdaftar</p>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: UPLOADER */}
            <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between space-y-6">
              <div>
                <h4 className="text-sm font-black text-gray-950 uppercase tracking-wider mb-1">Unggah PDF Laporan Absensi</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Mampu mengolah sekaligus lebih dari 500 file PDF laporan kehadiran individu pegawai.</p>
              </div>

              {/* Drag and Drop Zone */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative flex-1 border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${dragActive ? 'border-blue-600 bg-blue-50/20' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'}`}
              >
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isParsing}
                />
                <i className="bi bi-cloud-arrow-up text-5xl text-blue-600 mb-4 animate-pulse"></i>
                <h5 className="text-xs md:text-sm font-black text-gray-900 uppercase">Tarik & Lepas file PDF di sini</h5>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Atau klik untuk memilih file dari komputer Anda</p>
                <span className="px-3 py-1 bg-white border border-gray-100 text-gray-400 text-[8px] font-black uppercase rounded-lg shadow-sm mt-3 tracking-widest">HANYA FORMAT PDF</span>
              </div>

              {/* Selected Files Stat and parse trigger */}
              {selectedFiles.length > 0 && (
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-xs font-black text-gray-950 uppercase">{selectedFiles.length} Berkas PDF Terpilih</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Siap untuk dikalkulasikan ke rekapitulasi kehadiran.</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={clearFiles} 
                      disabled={isParsing}
                      className="flex-1 sm:flex-none px-4 py-3 border-2 border-gray-200 hover:border-gray-300 text-gray-600 font-black text-[10px] uppercase rounded-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleParseFiles} 
                      disabled={isParsing || !pdfjsLoaded}
                      className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-xl tracking-wider shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isParsing ? (
                        <>Menganalisis...</>
                      ) : (
                        <><i className="bi bi-calculator-fill text-xs"></i> Mulai Parsing &amp; Hitung</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Progress bar overlay during processing */}
              {isParsing && (
                <div className="space-y-3 bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                  <div className="flex justify-between text-[10px] font-black text-blue-700 uppercase">
                    <span>Progres Menganalisis Berkas PDF</span>
                    <span>{parseProgress.current} / {parseProgress.total} ({Math.round((parseProgress.current / parseProgress.total) * 100)}%)</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-200/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-300" 
                      style={{ width: `${(parseProgress.current / parseProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase">
                    <span className="truncate max-w-[70%]">Sedang diproses: <b className="text-gray-600">{parseProgress.currentFileName}</b></span>
                    <span>Error: <b className="text-red-500">{parseProgress.failed}</b> • Sukses: <b className="text-emerald-600">{parseProgress.success}</b></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PARSED RESULTS TABLE & REPORT CARD */}
          {results.length > 0 && (
            <div className="bg-white p-6 md:p-10 rounded-[3rem] md:rounded-[4rem] border border-gray-100 shadow-sm space-y-8 animate-slideUp">
              {/* RESULTS HEADER & BULK DOWNLOAD */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-50 pb-6">
                <div>
                  <h4 className="text-lg font-black text-gray-950 uppercase tracking-tight">Hasil Rekapitulasi Presensi</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Jumlah Hari Kerja Efektif, Kehadiran, Alpa, dan Cuti Berhasil Dihitung Berdasarkan PDF</p>
                </div>
                <button 
                  onClick={handleExportResultsExcel}
                  className="h-14 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 w-full md:w-auto"
                >
                  <i className="bi bi-file-earmark-spreadsheet-fill text-xl"></i> Unduh Rekap Excel (.xlsx)
                </button>
              </div>

              {/* RESULTS SEARCH & TOTALS STATS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="relative md:col-span-2">
                  <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                  <input 
                    type="text" 
                    placeholder="Saring Hasil Nama, NIP atau Unit..." 
                    className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner" 
                    value={resultsSearchTerm} 
                    onChange={e => { setResultsSearchTerm(e.target.value); setResultsCurrentPage(1); }} 
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Pegawai</p>
                  <p className="text-lg font-black text-gray-950 mt-1">{filteredResults.length}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Rata-rata Kehadiran</p>
                  <p className="text-lg font-black text-blue-600 mt-1">
                    {filteredResults.length > 0 
                      ? `${Math.round(filteredResults.reduce((acc, curr) => acc + curr.summary.attendanceRate, 0) / filteredResults.length)}%`
                      : '0%'
                    }
                  </p>
                </div>
              </div>

              {/* DATA TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b tracking-[0.25em]">
                      <th className="px-6 py-4">No</th>
                      <th className="px-6 py-4">Pegawai</th>
                      <th className="px-6 py-4">Jabatan / Departemen</th>
                      <th className="px-6 py-4">Periode</th>
                      <th className="px-4 py-4 text-center">Kerja Efektif</th>
                      <th className="px-4 py-4 text-center">Hadir</th>
                      <th className="px-4 py-4 text-center">DL Full</th>
                      <th className="px-4 py-4 text-center">Cuti/Izin</th>
                      <th className="px-4 py-4 text-center">Alpa</th>
                      <th className="px-4 py-4 text-center">Terlambat</th>
                      <th className="px-4 py-4 text-center">Pulang Cepat</th>
                      <th className="px-4 py-4 text-center">Persentase</th>
                      <th className="px-6 py-4 text-right">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {paginatedResults.map((r, i) => (
                      <tr key={r.nip + r.fileName} className="hover:bg-blue-50/10 transition-all">
                        <td className="px-6 py-4 font-mono text-gray-400">{(resultsCurrentPage - 1) * resultsPerPage + i + 1}</td>
                        <td className="px-6 py-4">
                          <p className="font-extrabold text-gray-950 uppercase">{r.nama}</p>
                          <p className="font-mono text-[9px] text-gray-400 mt-0.5">NIP. {r.nip}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800 uppercase truncate max-w-[200px]" title={r.jabatan}>{r.jabatan}</p>
                          <p className="text-[9px] text-gray-400 uppercase truncate max-w-[200px]" title={r.departemen}>{r.departemen}</p>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-600 uppercase">{r.periode}</td>
                        <td className="px-4 py-4 text-center font-bold text-gray-900">{r.summary.effectiveWorkdays} Hari</td>
                        <td className="px-4 py-4 text-center font-bold text-emerald-600">{r.summary.presentCount} Hari</td>
                        <td className="px-4 py-4 text-center font-bold text-blue-600">{r.summary.dlFullCount} Hari</td>
                        <td className="px-4 py-4 text-center font-bold text-amber-600">{r.summary.excusedCount} Hari</td>
                        <td className="px-4 py-4 text-center font-bold text-red-500">{r.summary.absentCount} Hari</td>
                        <td className="px-4 py-4 text-center">
                          <p className="font-extrabold text-orange-600">{r.summary.lateCount || 0} Kali</p>
                          <p className="text-[9px] font-semibold text-gray-400 mt-0.5">{r.summary.totalLateMinutes || 0} m</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <p className="font-extrabold text-rose-500">{r.summary.earlyLeaveCount || 0} Kali</p>
                          <p className="text-[9px] font-semibold text-gray-400 mt-0.5">{r.summary.totalEarlyLeaveMinutes || 0} m</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black ${r.summary.attendanceRate >= 90 ? 'bg-emerald-50 text-emerald-600' : (r.summary.attendanceRate >= 75 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')}`}>
                            {r.summary.attendanceRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => { setSelectedResultDetail(r); setShowDetailModal(true); }}
                            className="px-3.5 py-1.5 border border-gray-200 hover:border-blue-600 text-[9px] font-black text-gray-500 hover:text-blue-600 uppercase rounded-lg transition-all"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION PANEL */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-50 pt-6">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Halaman {resultsCurrentPage} dari {totalPages}</span>
                  <div className="flex gap-1.5">
                    <button 
                      disabled={resultsCurrentPage === 1}
                      onClick={() => setResultsCurrentPage(prev => prev - 1)}
                      className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-[9px] font-black uppercase rounded-lg transition-all"
                    >
                      Sebelumnya
                    </button>
                    <button 
                      disabled={resultsCurrentPage === totalPages}
                      onClick={() => setResultsCurrentPage(prev => prev + 1)}
                      className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-[9px] font-black uppercase rounded-lg transition-all"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL (AUDITING HARIAN INDIVIDU PEGAWAI) */}
      {showDetailModal && selectedResultDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col text-black animate-scaleIn">
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-gray-50 flex justify-between items-start">
              <div>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-lg tracking-widest border border-blue-100">AUDIT ABSENSI PEGAWAI</span>
                <h4 className="text-lg md:text-xl font-black text-gray-900 uppercase mt-2">{selectedResultDetail.nama}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">NIP. {selectedResultDetail.nip} • {selectedResultDetail.jabatan} {selectedResultDetail.golongan && selectedResultDetail.golongan !== '-' ? `(${selectedResultDetail.golongan})` : ''} • {selectedResultDetail.departemen} • {selectedResultDetail.periode}</p>
              </div>
              <button 
                onClick={() => { setShowDetailModal(false); setSelectedResultDetail(null); }}
                className="h-10 w-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-all"
              >
                <i className="bi bi-x-lg text-lg"></i>
              </button>
            </div>

            {/* Modal Body with scrolling */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              {/* Info stats */}
              <div className="grid grid-cols-2 md:grid-cols-8 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Hari Kalender</p>
                  <p className="text-xs font-black text-gray-950 mt-1">{selectedResultDetail.summary.totalCalendarDays} Hari</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Efektif Kerja</p>
                  <p className="text-xs font-black text-gray-950 mt-1">{selectedResultDetail.summary.effectiveWorkdays} Hari</p>
                </div>
                <div className="bg-emerald-50/30 p-4 rounded-xl text-center border border-emerald-100/50">
                  <p className="text-[8px] font-black text-emerald-600 uppercase tracking-wider">Hadir</p>
                  <p className="text-xs font-black text-emerald-600 mt-1">{selectedResultDetail.summary.presentCount} Hari</p>
                </div>
                <div className="bg-blue-50/30 p-4 rounded-xl text-center border border-blue-100/50">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-wider">DL Full</p>
                  <p className="text-xs font-black text-blue-600 mt-1">{selectedResultDetail.summary.dlFullCount} Hari</p>
                </div>
                <div className="bg-amber-50/30 p-4 rounded-xl text-center border border-amber-100/50">
                  <p className="text-[8px] font-black text-amber-600 uppercase tracking-wider">Cuti/Izin</p>
                  <p className="text-xs font-black text-amber-600 mt-1">{selectedResultDetail.summary.excusedCount} Hari</p>
                </div>
                <div className="bg-rose-50/30 p-4 rounded-xl text-center border border-rose-100/50">
                  <p className="text-[8px] font-black text-rose-500 uppercase tracking-wider">Alpa</p>
                  <p className="text-xs font-black text-rose-500 mt-1">{selectedResultDetail.summary.absentCount} Hari</p>
                </div>
                <div className="bg-orange-50/30 p-4 rounded-xl text-center border border-orange-100/50">
                  <p className="text-[8px] font-black text-orange-600 uppercase tracking-wider">Terlambat</p>
                  <p className="text-xs font-black text-orange-600 mt-1">{selectedResultDetail.summary.lateCount || 0} Kali</p>
                  <p className="text-[8px] text-gray-400 font-bold mt-0.5">{selectedResultDetail.summary.totalLateMinutes || 0} m</p>
                </div>
                <div className="bg-rose-50/30 p-4 rounded-xl text-center border border-rose-100/50">
                  <p className="text-[8px] font-black text-rose-500 uppercase tracking-wider">Pulang Cepat</p>
                  <p className="text-xs font-black text-rose-500 mt-1">{selectedResultDetail.summary.earlyLeaveCount || 0} Kali</p>
                  <p className="text-[8px] text-gray-400 font-bold mt-0.5">{selectedResultDetail.summary.totalEarlyLeaveMinutes || 0} m</p>
                </div>
              </div>

              {/* Table details */}
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 font-black text-gray-400 text-[8px] uppercase tracking-wider border-b">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Hari</th>
                      <th className="px-4 py-3">Jam Masuk</th>
                      <th className="px-4 py-3">Wajib Masuk</th>
                      <th className="px-4 py-3">Jam Keluar</th>
                      <th className="px-4 py-3">Wajib Pulang</th>
                      <th className="px-4 py-3">Status Dokumen</th>
                      <th className="px-4 py-3 text-right">Klasifikasi Hitungan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedResultDetail.days.map((d, index) => (
                      <tr key={d.dateStr + index} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-mono font-bold text-gray-900">{d.dateStr}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-600 uppercase">{d.dayName}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-gray-800">{d.jamMasuk || '-'}</span>
                          {d.isLate && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100 font-black text-[7px] uppercase">
                              +{d.lateMinutes}m
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-gray-400 text-[10px]">{d.requiredCheckInStr || '-'}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-gray-800">{d.jamKeluar || '-'}</span>
                          {d.isEarlyLeave && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 font-black text-[7px] uppercase">
                              -{d.earlyLeaveMinutes}m
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-gray-400 text-[10px]">{d.requiredCheckOutStr || '-'}</td>
                        <td className="px-4 py-2.5">
                          {d.status ? (
                            <span className="font-extrabold text-blue-600 uppercase text-[9px]">{d.status}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right space-x-1">
                          {d.attendanceType === 'PRESENT' && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-[8px] uppercase">Hadir</span>
                          )}
                          {d.attendanceType === 'DL_FULL' && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-extrabold text-[8px] uppercase">DL FULL</span>
                          )}
                          {d.attendanceType === 'EXCUSED' && (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-extrabold text-[8px] uppercase">Excused</span>
                          )}
                          {d.attendanceType === 'ABSENT' && (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 font-extrabold text-[8px] uppercase">Alpa</span>
                          )}
                          {d.attendanceType === 'WEEKEND' && (
                            <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100 font-extrabold text-[8px] uppercase">Weekend</span>
                          )}
                          {d.attendanceType === 'HOLIDAY' && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 font-extrabold text-[8px] uppercase">Libur</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 md:p-8 border-t border-gray-50 flex justify-end">
              <button 
                onClick={() => { setShowDetailModal(false); setSelectedResultDetail(null); }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-[10px] uppercase rounded-xl tracking-wider transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RekapAbsensiPage;

