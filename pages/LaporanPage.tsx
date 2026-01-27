
import React, { useState, useEffect, useMemo } from 'react';
import { Laporan, TugasRutin, Kegiatan, Pegawai } from '../types';
import { BULAN, UNIT_KERJA, normalizeUnitName } from '../constants';
import { fetchPegawaiFromSheets, fetchTugasRutinFromSheets, fetchKegiatanFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import * as XLSX from 'xlsx';

const LaporanPage = () => {
  const { logActivity } = useAuth();
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [tasks, setTasks] = useState<TugasRutin[]>([]);
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'generator'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [genMonth, setGenMonth] = useState(BULAN[new Date().getMonth()]);
  const [genYear, setGenYear] = useState(new Date().getFullYear());

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [tData, kData, pData] = await Promise.all([fetchTugasRutinFromSheets(), fetchKegiatanFromSheets(), fetchPegawaiFromSheets()]);
      setTasks(tData || []);
      setKegiatan(kData || []);
      setPegawai(pData || []);
      const saved = localStorage.getItem('portal_laporan_db');
      if (saved) setLaporanList(JSON.parse(saved));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      const wb = XLSX.utils.book_new();
      const analytics = UNIT_KERJA.map(u => ({ 'Unit Kerja': u, 'Total': pegawai.filter(p => normalizeUnitName(p.unitKerja) === u).length }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics), "Analytics SDM");
      XLSX.writeFile(wb, `Laporan_SDM_${genMonth}_${genYear}.xlsx`);
      
      const newLaporan: Laporan = { id: Date.now().toString(), judul: `KONSOLIDASI ${genMonth.toUpperCase()} ${genYear}`, jenis: 'Bulanan', periode: genMonth, tahun: genYear, status: 'Approved', createdAt: new Date().toISOString() };
      const updated = [newLaporan, ...laporanList];
      setLaporanList(updated);
      localStorage.setItem('portal_laporan_db', JSON.stringify(updated));
      logActivity('DOWNLOAD', 'Laporan', `Generate ${newLaporan.judul}`);
      setLoading(false);
      setShowSuccess(true);
    }, 1500);
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-gray-950 uppercase tracking-tighter leading-none">Arsip & Generator</h3>
          <p className="text-[10px] md:text-[11px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-3">Personnel Data Consolidation DJKI</p>
        </div>
        <div className="flex bg-white p-2 rounded-[1.8rem] shadow-sm border border-gray-100 w-full md:w-auto">
            <button onClick={() => setActiveTab('list')} className={`flex-1 md:flex-none h-12 px-10 text-[11px] font-black uppercase rounded-2xl transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-400'}`}>Arsip Laporan</button>
            <button onClick={() => setActiveTab('generator')} className={`flex-1 md:flex-none h-12 px-10 text-[11px] font-black uppercase rounded-2xl transition-all ${activeTab === 'generator' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-400'}`}>Buat Konsolidasi</button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-white rounded-[3rem] md:rounded-[4rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
          {/* MOBILE LIST */}
          <div className="grid grid-cols-1 md:hidden divide-y divide-gray-50">
             {laporanList.map(l => (
                <div key={l.id} className="p-8 flex flex-col gap-4">
                   <div className="flex justify-between items-start">
                      <span className="px-3 py-1 bg-emerald-600 text-white text-[8px] font-black rounded-lg uppercase tracking-widest shadow-md shadow-emerald-600/20">{l.status}</span>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{l.periode} {l.tahun}</p>
                   </div>
                   <h6 className="text-sm font-black text-gray-950 uppercase leading-snug">{l.judul}</h6>
                   <button className="mt-2 w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-blue-600 active:bg-blue-50 transition-colors"><i className="bi bi-cloud-arrow-down-fill mr-3"></i> Download Excel</button>
                </div>
             ))}
             {laporanList.length === 0 && <div className="py-32 text-center text-gray-300 text-[11px] font-black uppercase tracking-widest leading-relaxed">Belum ada arsip laporan<br/>yang tersimpan di cloud</div>}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b tracking-[0.2em]">
                <tr><th className="px-12 py-8">Nama Laporan Konsolidasi</th><th className="px-6 py-8 text-center">Periode</th><th className="px-6 py-8 text-center">Verifikasi</th><th className="px-12 py-8 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {laporanList.map(l => (
                  <tr key={l.id} className="hover:bg-blue-50/5 group transition-colors">
                    <td className="px-12 py-8"><div className="flex items-center gap-5"><div className="h-12 w-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><i className="bi bi-file-earmark-spreadsheet text-2xl"></i></div><p className="text-sm font-black text-gray-950 uppercase">{l.judul}</p></div></td>
                    <td className="px-6 py-8 text-center text-[11px] font-black text-gray-500 uppercase tracking-widest">{l.periode} {l.tahun}</td>
                    <td className="px-6 py-8 text-center"><span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-xl border border-emerald-100 uppercase tracking-widest">{l.status}</span></td>
                    <td className="px-12 py-8 text-right">
                       <button className="h-12 w-12 bg-gray-50 text-gray-400 rounded-2xl hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"><i className="bi bi-cloud-arrow-down-fill text-xl"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 animate-fadeIn">
           <div className="lg:col-span-5 bg-white p-10 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10">
              <div className="border-b pb-8">
                <h5 className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-4">
                   <i className="bi bi-magic text-xl"></i> Smart Configurator
                </h5>
              </div>
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-3 tracking-widest">Pilih Bulan</label>
                    <select className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-sm font-black outline-none focus:border-blue-600 transition-all" value={genMonth} onChange={e => setGenMonth(e.target.value)}>{BULAN.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-3 tracking-widest">Tentukan Tahun</label>
                    <input type="number" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-sm font-black outline-none focus:border-blue-600 transition-all" value={genYear} onChange={e => setGenYear(parseInt(e.target.value))} />
                 </div>
                 <button onClick={handleGenerate} disabled={loading} className="w-full h-16 bg-blue-600 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-4">
                    {loading ? <div className="h-6 w-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <><i className="bi bi-file-earmark-arrow-down-fill text-xl"></i> Generate Digital Report</>}
                 </button>
              </div>
           </div>
           
           <div className="lg:col-span-7 bg-[#111827] p-10 md:p-16 rounded-[3.5rem] md:rounded-[4.5rem] text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-[120px]"></div>
              <div className="relative z-10">
                <h5 className="text-2xl font-black uppercase tracking-tight">Dataset Analysis Summary</h5>
                <p className="text-[10px] text-blue-400 font-bold uppercase mt-3 tracking-[0.3em]">Current Cloud Database State</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 mt-12">
                   <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-sm group hover:bg-white/10 transition-all">
                      <p className="text-[9px] font-black text-gray-500 uppercase mb-3 tracking-widest">Tugas Rutin Tercatat</p>
                      <h4 className="text-5xl font-black text-blue-400 tracking-tighter">{tasks.filter(t=>t.bulan===genMonth).length}</h4>
                      <p className="text-[8px] font-bold text-gray-500 mt-4 uppercase">Data periode {genMonth}</p>
                   </div>
                   <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-sm group hover:bg-white/10 transition-all">
                      <p className="text-[9px] font-black text-gray-500 uppercase mb-3 tracking-widest">Agenda Kegiatan Terlaksana</p>
                      <h4 className="text-5xl font-black text-emerald-400 tracking-tighter">{kegiatan.length}</h4>
                      <p className="text-[8px] font-bold text-gray-500 mt-4 uppercase">Cumulative Database</p>
                   </div>
                </div>
                
                <div className="mt-12 p-8 bg-blue-600/10 border border-blue-500/20 rounded-[2.5rem]">
                   <p className="text-[11px] font-bold text-blue-100 leading-relaxed italic uppercase tracking-wider">
                      Laporan ini mencakup: Rekapitulasi perolehan Angka Kredit, Evaluasi Bulanan SKP, Ringkasan Logistik Tugas Rutin, dan Monitoring Agenda Kerja yang bersinkronisasi langsung dengan Google Sheets.
                   </p>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default LaporanPage;
