
import React, { useState, useEffect, useMemo } from 'react';
import { fetchPegawaiFromSheets, fetchAllAbsensiHistoryFromSheets } from '../spreadsheetService';
import { Pegawai, AbsensiRecord } from '../types';
import { useAuth } from '../AuthContext';
import * as XLSX from 'xlsx';

const RekapAbsensiPage = () => {
  const { user, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  const [globalHistory, setGlobalHistory] = useState<AbsensiRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

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

  const filteredLogs = useMemo(() => {
    return globalHistory.filter(log => 
      log.nama.toLowerCase().includes(searchTerm.toLowerCase()) || log.nip.includes(searchTerm)
    );
  }, [globalHistory, searchTerm]);

  const handleExport = () => {
    const data = filteredLogs.map(l => ({ NIP: l.nip, Nama: l.nama, Waktu: l.waktu, Tipe: l.tipe, Skor: `${(l.confidence * 100).toFixed(0)}%`, Lokasi: l.lokasi }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
    XLSX.writeFile(wb, `Rekap_Absen_${new Date().getTime()}.xlsx`);
    logActivity('DOWNLOAD', 'Absensi', 'Mengekspor rekap absensi ke Excel');
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
          <button onClick={loadData} className="h-14 w-14 flex items-center justify-center bg-white border border-gray-100 text-gray-400 rounded-2xl shadow-sm hover:text-blue-600 transition-all"><i className={`bi bi-arrow-clockwise text-2xl ${loading ? 'animate-spin' : ''}`}></i></button>
          <button onClick={handleExport} className="flex-1 md:flex-none h-14 px-8 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-3">
             <i className="bi bi-file-earmark-spreadsheet-fill text-xl"></i> Ekspor Data
          </button>
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
        <div className="relative max-w-lg">
          <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-xl"></i>
          <input type="text" placeholder="Cari Nama Pegawai atau NIP..." className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] text-xs md:text-sm font-bold uppercase outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
                            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-xl border border-emerald-100 tracking-widest">SUCCESS</span>
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
