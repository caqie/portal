
import React, { useState, useEffect, useMemo } from 'react';
import { Laporan, TugasRutin, TaskType } from '../types';
import { BULAN, TASK_LABELS } from '../constants';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';

const LaporanPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [tasks, setTasks] = useState<TugasRutin[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'generator'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [genMonth, setGenMonth] = useState(BULAN[new Date().getMonth()]);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState<Partial<Laporan>>({ judul: '', jenis: 'Bulanan', periode: BULAN[new Date().getMonth()], tahun: new Date().getFullYear(), status: 'Draft' });

  useEffect(() => {
    const savedLaporan = localStorage.getItem('portal_laporan_db');
    if (savedLaporan) setLaporanList(JSON.parse(savedLaporan));
    const savedTasks = localStorage.getItem('tugas_rutin_db');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, []);

  const summaryData = useMemo(() => {
    const filtered = tasks.filter(t => t.bulan === genMonth && t.tahun === genYear);
    const summary: Record<string, number> = {};
    filtered.forEach(t => { summary[t.jenis] = (summary[t.jenis] || 0) + 1; });
    return summary;
  }, [tasks, genMonth, genYear]);

  const handleGenerateConsolidation = () => {
    const judul = `LAPORAN KONSOLIDASI SDM BULAN ${genMonth.toUpperCase()} ${genYear}`;
    const newLaporan: Laporan = { id: Date.now().toString(), judul, jenis: 'Bulanan', periode: genMonth, tahun: genYear, status: 'Approved', createdAt: new Date().toISOString() };
    const updated = [newLaporan, ...laporanList];
    setLaporanList(updated);
    localStorage.setItem('portal_laporan_db', JSON.stringify(updated));
    logActivity('CREATE', 'Laporan', `Generate laporan otomatis: ${genMonth} ${genYear}`);
    setActiveTab('list');
    setShowSuccess(true);
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul) return alert("Judul laporan wajib diisi!");
    const newL: Laporan = { id: Date.now().toString(), judul: formData.judul!.toUpperCase(), jenis: formData.jenis as any, periode: formData.periode!, tahun: formData.tahun!, status: 'Draft', fileUrl: formData.fileUrl, createdAt: new Date().toISOString() };
    const updated = [newL, ...laporanList];
    setLaporanList(updated);
    localStorage.setItem('portal_laporan_db', JSON.stringify(updated));
    setIsModalOpen(false);
    setShowSuccess(true);
  };

  const handlePrint = () => {
    window.print();
    logActivity('DOWNLOAD', 'Laporan', 'Mencetak daftar laporan bulanan');
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Laporan Konsolidasi</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Pusat Arsip Digital & Generator Laporan Bulanan</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm no-print">
            <button onClick={() => setActiveTab('list')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Arsip</button>
            <button onClick={() => setActiveTab('generator')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'generator' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Generator</button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
          <div className="px-10 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
             <h4 className="text-[11px] font-black uppercase text-gray-900 tracking-widest">Database Laporan Terbit</h4>
             <div className="flex gap-2 no-print">
               <button onClick={handlePrint} className="px-6 py-2.5 bg-gray-100 text-gray-950 rounded-xl text-[9px] font-black uppercase tracking-widest border border-gray-200 hover:bg-gray-200 flex items-center gap-2">
                 <i className="bi bi-printer-fill"></i>
                 <span>Cetak Laporan</span>
               </button>
               {canEdit && <button onClick={() => setIsModalOpen(true)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">+ Register Manual</button>}
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b border-gray-100 tracking-widest">
                <tr><th className="px-10 py-5">Judul</th><th className="px-4 py-5">Periode</th><th className="px-4 py-5 text-center">Status</th><th className="px-10 py-5 text-right no-print">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {laporanList.map(l => (
                  <tr key={l.id} className="hover:bg-blue-50/5 group transition-all">
                    <td className="px-10 py-5"><p className="text-[11px] font-black text-gray-950 uppercase leading-tight">{l.judul}</p></td>
                    <td className="px-4 py-5 text-[10px] font-black text-gray-500 uppercase">{l.periode} {l.tahun}</td>
                    <td className="px-4 py-5 text-center"><span className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg border ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{l.status}</span></td>
                    <td className="px-10 py-5 text-right no-print"><button className="h-9 w-9 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 border border-gray-100 transition-all"><i className="bi bi-download"></i></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-4 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 no-print">
              <h4 className="text-[11px] font-black uppercase text-gray-950 tracking-widest border-b pb-4">Parameter Konsolidasi</h4>
              <div className="space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-3">Bulan</label>
                    <select className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-[11px] font-black uppercase text-gray-950" value={genMonth} onChange={e => setGenMonth(e.target.value)}>{BULAN.map(b => <option key={b} value={b}>{b}</option>)}</select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-3">Tahun</label>
                    <input type="number" className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-[11px] font-black text-gray-950" value={genYear} onChange={e => setGenYear(parseInt(e.target.value))} />
                 </div>
                 <button onClick={handleGenerateConsolidation} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Generate Laporan</button>
              </div>
           </div>
           <div className="lg:col-span-8 bg-white p-12 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-8 border border-blue-100 shadow-inner no-print"><i className="bi bi-magic"></i></div>
              <h5 className="text-xl font-black text-gray-900 uppercase tracking-tight">Pratinjau Kecerdasan Laporan</h5>
              <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                 {Object.entries(summaryData).map(([key, count]) => (
                   <div key={key} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-left hover:border-blue-200 transition-colors">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{TASK_LABELS[key as TaskType] || key}</p>
                      <h6 className="text-xl font-black text-gray-950 mt-2">{count} <span className="text-[10px] text-gray-400">AKTIVITAS</span></h6>
                   </div>
                 ))}
                 {Object.keys(summaryData).length === 0 && <div className="col-span-2 py-12 text-gray-300 font-black uppercase text-[10px] tracking-widest border-2 border-dashed border-gray-100 rounded-3xl">Tidak ada data terdeteksi pada periode ini</div>}
              </div>
           </div>
        </div>
      )}

      {/* Manual Laporan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
           <form onSubmit={handleSaveManual} className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-12 animate-modalEnter flex flex-col space-y-8">
              <h3 className="text-[15px] font-black uppercase text-gray-950 tracking-tight flex items-center gap-3"><i className="bi bi-file-earmark-plus-fill text-blue-600"></i> Registrasi Laporan Manual</h3>
              <div className="space-y-5">
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-3">Judul Laporan Lengkap</label><input type="text" placeholder="CONTOH: LAPORAN TRIWULAN I DJKI 2025" className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-[11px] font-black text-gray-950 outline-none focus:border-blue-600 transition-all" value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value.toUpperCase()})} /></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-3">Periode</label><select className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-[11px] font-black text-gray-950 uppercase" value={formData.periode} onChange={e => setFormData({...formData, periode: e.target.value})}>{BULAN.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-3">Tahun</label><input type="number" className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-[11px] font-black text-gray-950" value={formData.tahun} onChange={e => setFormData({...formData, tahun: parseInt(e.target.value)})} /></div>
                 </div>
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-3">Link Google Drive</label><input type="text" placeholder="https://drive.google.com/..." className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-[11px] font-black text-gray-950 outline-none focus:border-blue-600 transition-all" value={formData.fileUrl || ''} onChange={e => setFormData({...formData, fileUrl: e.target.value})} /></div>
              </div>
              <div className="flex gap-3 pt-4">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Batal</button>
                 <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Simpan Arsip</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default LaporanPage;
