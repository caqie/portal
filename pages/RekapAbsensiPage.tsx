
import React, { useState, useEffect, useMemo } from 'react';
import { fetchPegawaiFromSheets, fetchAllAbsensiHistoryFromSheets, fetchAbsensiConfig, saveAbsensiConfig, resendAbsensiToSimpeg } from '../spreadsheetService';
import { Pegawai, AbsensiRecord, AbsensiConfig } from '../types';
import { useAuth } from '../AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const RekapAbsensiPage = () => {
  const { user, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  const isSuperadmin = user?.role === 'Superadmin';
  const [globalHistory, setGlobalHistory] = useState<AbsensiRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [resendingIds, setResendingIds] = useState<string[]>([]);

  useEffect(() => { 
    loadData();
  }, []);

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

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-gray-950 uppercase tracking-tighter leading-none">{isViewer ? 'Riwayat Absensi' : 'Rekapitulasi Global'}</h3>
          <p className="text-[10px] md:text-[11px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-3">Monitoring Kehadiran Biometrik Real-Time</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
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
          <div className="flex gap-2">
            <button onClick={handleExport} className="h-14 px-6 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-3">
               <i className="bi bi-file-earmark-spreadsheet-fill text-xl"></i> Excel
            </button>
            <button onClick={handleExportPDF} className="h-14 px-6 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-3">
               <i className="bi bi-file-earmark-pdf-fill text-xl"></i> PDF
            </button>
          </div>
        </div>
      </div>

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
  );
};

export default RekapAbsensiPage;
