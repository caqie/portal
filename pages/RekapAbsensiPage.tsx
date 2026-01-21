
import React, { useState, useEffect, useMemo } from 'react';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai, AbsensiRecord } from '../types';
import { UNIT_KERJA } from '../constants';
import { useAuth } from '../AuthContext';
import * as XLSX from 'xlsx';

const RekapAbsensiPage = () => {
  const { user, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [globalHistory, setGlobalHistory] = useState<AbsensiRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState<'SEMUA' | 'UNIT' | 'PEGAWAI'>('SEMUA');
  const [selectedUnit, setSelectedUnit] = useState('Semua Unit');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const pegawais = await fetchPegawaiFromSheets();
      setPegawaiList(pegawais);
      localStorage.setItem('portal_pegawai_db', JSON.stringify(pegawais));
      
      const savedHistory = localStorage.getItem('absensi_history_db');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setGlobalHistory(isViewer ? parsed.filter((a: any) => a.nip === user?.nip) : parsed);
      }
    } catch (err) { 
      console.error("Gagal sinkronisasi data rekap:", err);
      const saved = localStorage.getItem('portal_pegawai_db');
      if (saved) setPegawaiList(JSON.parse(saved));
    } finally { setLoading(false); }
  };

  const handleExport = () => {
    const dataToExport = filteredLogs.map(l => ({
      NIP: l.nip,
      Nama: l.nama,
      Waktu: l.waktu,
      Tipe: l.tipe,
      'Match Score': `${(l.confidence * 100).toFixed(0)}%`,
      Lokasi: l.lokasi
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
    XLSX.writeFile(wb, `Rekap_Absensi_${new Date().toLocaleDateString()}.xlsx`);
    logActivity('DOWNLOAD', 'Absensi', 'Mengekspor rekap absensi ke Excel');
  };

  const filteredLogs = useMemo(() => {
    return globalHistory.filter(log => {
      const matchesSearch = log.nama.toLowerCase().includes(searchTerm.toLowerCase()) || log.nip.includes(searchTerm);
      if (isViewer) return matchesSearch;
      if (filterType === 'SEMUA') return matchesSearch;
      if (filterType === 'UNIT') return matchesSearch && (selectedUnit === 'Semua Unit' || pegawaiList.find(p => p.nip === log.nip)?.unitKerja === selectedUnit);
      return matchesSearch;
    });
  }, [globalHistory, isViewer, searchTerm, filterType, selectedUnit, pegawaiList]);

  const stats = useMemo(() => ({
    total: filteredLogs.length,
    masuk: filteredLogs.filter(l => l.tipe === 'MASUK').length,
    avgConfidence: filteredLogs.length > 0 ? (filteredLogs.reduce((acc, l) => acc + l.confidence, 0) / filteredLogs.length) * 100 : 0
  }), [filteredLogs]);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">{isViewer ? 'Riwayat Kehadiran Personal' : 'Rekapitulasi Kehadiran'}</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{isViewer ? 'Pantau Log Presensi Wajah Anda' : 'Dashboard Monitoring Kehadiran Pegawai Terintegrasi'}</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleExport} className="h-12 w-12 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm hover:bg-emerald-600 hover:text-white transition-all">
               <i className="bi bi-file-earmark-excel-fill text-xl"></i>
            </button>
            <button onClick={loadData} className="px-6 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"><i className="bi bi-arrow-clockwise mr-2"></i>Sync Data</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Aktivitas</p><h4 className="text-2xl font-black text-gray-900">{stats.total}</h4></div>
        <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 shadow-sm"><p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Presensi Masuk</p><h4 className="text-2xl font-black text-blue-600">{stats.masuk}</h4></div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm"><p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Match Score</p><h4 className="text-2xl font-black text-emerald-600">{stats.avgConfidence.toFixed(0)}%</h4></div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        {!isViewer && (
           <div className="flex flex-col md:flex-row gap-6 items-end mb-8">
              <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-200 flex-1">
                 <button onClick={() => setFilterType('SEMUA')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${filterType === 'SEMUA' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Semua</button>
                 <button onClick={() => setFilterType('UNIT')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${filterType === 'UNIT' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Unit</button>
              </div>
              <input type="text" className="w-full md:w-64 pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold shadow-sm" placeholder="Cari Nama/NIP..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
        )}

        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[8px] font-black border-b border-gray-100 tracking-widest">
                 <tr><th className="px-6 py-4">Foto</th><th className="px-4 py-4">Waktu & Tipe</th><th className="px-4 py-4 text-center">Confidence</th><th className="px-6 py-4 text-right">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-blue-50/5 transition-all">
                       <td className="px-6 py-4"><div className="h-12 w-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm"><img src={log.fotoAbsen} className="w-full h-full object-cover" /></div></td>
                       <td className="px-4 py-4"><div className={`inline-flex px-2 py-0.5 rounded text-[7px] font-black uppercase mb-1 ${log.tipe === 'MASUK' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`}>{log.tipe}</div><p className="text-[9px] font-bold text-gray-700 uppercase tracking-tight">{log.waktu}</p></td>
                       <td className="px-4 py-4 text-center text-[10px] font-black text-emerald-600">{(log.confidence * 100).toFixed(0)}%</td>
                       <td className="px-6 py-4 text-right text-[8px] font-black uppercase text-emerald-600">VERIFIED</td>
                    </tr>
                 )) : (
                    <tr><td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Belum ada data absensi</td></tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default RekapAbsensiPage;
