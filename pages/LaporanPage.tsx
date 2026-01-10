
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
  
  // Generator States
  const [genMonth, setGenMonth] = useState(BULAN[new Date().getMonth()]);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState<Partial<Laporan>>({ 
    judul: '', 
    jenis: 'Bulanan', 
    periode: BULAN[new Date().getMonth()], 
    tahun: new Date().getFullYear(), 
    status: 'Draft' 
  });

  useEffect(() => {
    const savedLaporan = localStorage.getItem('portal_laporan_db');
    if (savedLaporan) setLaporanList(JSON.parse(savedLaporan));
    
    const savedTasks = localStorage.getItem('tugas_rutin_db');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, []);

  const summaryData = useMemo(() => {
    const filtered = tasks.filter(t => t.bulan === genMonth && t.tahun === genYear);
    const summary: Record<string, number> = {};
    filtered.forEach(t => {
      summary[t.jenis] = (summary[t.jenis] || 0) + 1;
    });
    return summary;
  }, [tasks, genMonth, genYear]);

  const handleGenerateConsolidation = () => {
    const judul = `LAPORAN KONSOLIDASI SDM BULAN ${genMonth.toUpperCase()} ${genYear}`;
    const newLaporan: Laporan = {
      id: Date.now().toString(),
      judul,
      jenis: 'Bulanan',
      periode: genMonth,
      tahun: genYear,
      status: 'Approved',
      createdAt: new Date().toISOString()
    };

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
    
    const newL: Laporan = { 
      id: Date.now().toString(), 
      judul: formData.judul!, 
      jenis: formData.jenis as any, 
      periode: formData.periode!, 
      tahun: formData.tahun!, 
      status: 'Draft', 
      fileUrl: formData.fileUrl, 
      createdAt: new Date().toISOString() 
    };
    
    const updated = [newL, ...laporanList];
    setLaporanList(updated);
    localStorage.setItem('portal_laporan_db', JSON.stringify(updated));
    setIsModalOpen(false);
    setShowSuccess(true);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Laporan & Pengarsipan</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Pusat Konsolidasi Data Administrasi Kepegawaian</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm no-print">
            <button onClick={() => setActiveTab('list')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400'}`}>Arsip Laporan</button>
            <button onClick={() => setActiveTab('generator')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'generator' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400'}`}>Generator</button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-10 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
             <h4 className="text-[11px] font-black uppercase text-gray-900 tracking-widest">Daftar Laporan Terbit</h4>
             {canEdit && <button onClick={() => setIsModalOpen(true)} className="text-[9px] font-black uppercase text-blue-600 hover:underline tracking-widest">+ Laporan Manual</button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b border-gray-100 tracking-widest">
                <tr><th className="px-10 py-5">Judul Laporan</th><th className="px-4 py-5">Periode</th><th className="px-4 py-5 text-center">Status</th><th className="px-10 py-5 text-right">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {laporanList.length > 0 ? laporanList.map(l => (
                  <tr key={l.id} className="hover:bg-blue-50/5 group transition-all">
                    <td className="px-10 py-5"><p className="text-[11px] font-black text-gray-900 uppercase leading-tight line-clamp-1">{l.judul}</p><p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Dibuat: {new Date(l.createdAt).toLocaleDateString('id-ID')}</p></td>
                    <td className="px-4 py-5 text-[10px] font-black text-gray-600 uppercase">{l.periode} {l.tahun}</td>
                    <td className="px-4 py-5 text-center"><span className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg border ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{l.status}</span></td>
                    <td className="px-10 py-5 text-right"><button className="h-9 w-9 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 border border-gray-100 transition-all"><i className="bi bi-download"></i></button></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-10 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Belum ada laporan yang diarsipkan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <h4 className="text-[11px] font-black uppercase text-gray-900 tracking-widest border-b pb-4">Konfigurasi Generator</h4>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Bulan Konsolidasi</label>
                    <select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold" value={genMonth} onChange={e => setGenMonth(e.target.value)}>
                       {BULAN.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Tahun</label>
                    <input type="number" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold" value={genYear} onChange={e => setGenYear(parseInt(e.target.value))} />
                 </div>
                 <button onClick={handleGenerateConsolidation} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Generate & Approve</button>
              </div>
           </div>
           <div className="lg:col-span-8 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-6 border border-blue-100"><i className="bi bi-magic"></i></div>
              <h5 className="text-xl font-black text-gray-900 uppercase tracking-tight">Draf Preview Otomatis</h5>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 max-w-sm leading-relaxed">Sistem akan merangkum seluruh tugas rutin pada periode {genMonth} {genYear} dan menciptakan draf konsolidasi.</p>
              
              <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                 {Object.entries(summaryData).map(([key, count]) => (
                   <div key={key} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{TASK_LABELS[key as TaskType] || key}</p>
                      <h6 className="text-lg font-black text-gray-900 mt-1">{count} <span className="text-[10px] text-gray-300">Aksi</span></h6>
                   </div>
                 ))}
                 {Object.keys(summaryData).length === 0 && (
                   <div className="col-span-2 py-10 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200"><p className="text-[9px] font-black text-gray-300 uppercase">Tidak ada data aksi pada periode ini</p></div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Manual Laporan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
           <form onSubmit={handleSaveManual} className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-modalEnter flex flex-col space-y-6">
              <h3 className="text-[14px] font-black uppercase text-gray-900 tracking-tight">Registrasi Laporan Digital</h3>
              <div className="space-y-4">
                 <input type="text" placeholder="Judul Laporan Lengkap" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value.toUpperCase()})} />
                 <div className="grid grid-cols-2 gap-4">
                    <select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.periode} onChange={e => setFormData({...formData, periode: e.target.value})}>
                       {BULAN.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <input type="number" placeholder="Tahun" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.tahun} onChange={e => setFormData({...formData, tahun: parseInt(e.target.value)})} />
                 </div>
                 <input type="text" placeholder="URL Google Drive (Opsional)" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.fileUrl || ''} onChange={e => setFormData({...formData, fileUrl: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Batal</button>
                 <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Simpan Laporan</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default LaporanPage;
