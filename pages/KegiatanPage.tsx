
import React, { useState, useEffect } from 'react';
import { Kegiatan } from '../types';
import { useAuth } from '../AuthContext';
import { syncTableRemote } from '../spreadsheetService';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';

const KegiatanPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingKegiatan, setEditingKegiatan] = useState<Kegiatan | null>(null);
  const [formData, setFormData] = useState<Partial<Kegiatan>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setLoading(true);
    const saved = localStorage.getItem('portal_agenda_db');
    if (saved) setKegiatanList(JSON.parse(saved));
    setLoading(false);
  };

  const handleOpenModal = (kegiatan: Kegiatan | null = null) => {
    if (kegiatan) { setEditingKegiatan(kegiatan); setFormData({ ...kegiatan }); }
    else { setEditingKegiatan(null); setFormData({ tanggal: new Date().toISOString().split('T')[0], status: 'Direncanakan', jumlahPeserta: 0, judulKegiatan: '', tempat: '', asalPeserta: '', laporanSingkat: '', linkDriveFoto: '' }); }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judulKegiatan || !formData.tanggal) return alert("Lengkapi data agenda");
    setSyncing(true);
    const agendaPayload: Kegiatan = { 
      id: editingKegiatan?.id || Date.now().toString(), 
      judulKegiatan: formData.judulKegiatan!.toUpperCase(), 
      tanggal: formData.tanggal!, 
      tempat: (formData.tempat || '').toUpperCase(), 
      jumlahPeserta: formData.jumlahPeserta || 0, 
      asalPeserta: (formData.asalPeserta || '').toUpperCase(), 
      laporanSingkat: formData.laporanSingkat || '', 
      linkDriveFoto: formData.linkDriveFoto || '', 
      status: (formData.status as any) || 'Direncanakan' 
    };
    await syncTableRemote('KEGIATAN', 'SAVE', agendaPayload);
    const updated = editingKegiatan ? kegiatanList.map(k => k.id === editingKegiatan.id ? agendaPayload : k) : [agendaPayload, ...kegiatanList];
    setKegiatanList(updated);
    localStorage.setItem('portal_agenda_db', JSON.stringify(updated));
    setIsModalOpen(false);
    setShowSuccess(true);
    setSyncing(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Agenda Disinkronkan" />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={() => {}} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h3 className="text-2xl font-black text-gray-950 uppercase">Agenda & Logistik</h3></div>
        {canEdit && <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"><i className="bi bi-calendar-plus text-lg"></i><span>Tambah Agenda</span></button>}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
            <tr><th className="px-8 py-5">Waktu & Status</th><th className="px-4 py-5">Kegiatan</th><th className="px-8 py-5 text-right">Opsi</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {kegiatanList.map((k) => (
              <tr key={k.id} className="hover:bg-blue-50/10 group transition-all">
                <td className="px-8 py-5"><p className="text-[10px] font-black uppercase">{k.tanggal}</p></td>
                <td className="px-4 py-5"><p className="text-[11px] font-black text-gray-950 uppercase">{k.judulKegiatan}</p></td>
                <td className="px-8 py-5 text-right"><button onClick={() => handleOpenModal(k)} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl shadow-sm flex items-center justify-center"><i className="bi bi-pencil-fill"></i></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-[140px]">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl max-h-[80dvh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col border border-white/20">
            {/* STICKY HEADER */}
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0 relative z-50">
               <div>
                  <h4 className="text-[14px] font-black text-gray-950 uppercase tracking-tight">{editingKegiatan ? 'Edit Agenda Kerja' : 'Agenda Baru'}</h4>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">DJKI Logistical & Scheduling</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="h-12 w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95">
                  <i className="bi bi-x-lg text-xl"></i>
               </button>
            </div>
            {/* SCROLLABLE BODY */}
            <form onSubmit={handleSave} className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-full space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Judul Kegiatan</label><input type="text" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black" value={formData.judulKegiatan || ''} onChange={(e) => setFormData({...formData, judulKegiatan: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Tanggal</label><input type="date" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black" value={formData.tanggal || ''} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Lokasi</label><input type="text" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black" value={formData.tempat || ''} onChange={(e) => setFormData({...formData, tempat: e.target.value})} /></div>
              </div>
              <div className="col-span-full space-y-1 pb-6"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Laporan Singkat</label><textarea rows={4} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black resize-none" value={formData.laporanSingkat || ''} onChange={(e) => setFormData({...formData, laporanSingkat: e.target.value})}></textarea></div>
            </form>
            {/* STICKY FOOTER */}
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0 relative z-50">
               <button onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 text-[10px] font-black uppercase border border-gray-200 rounded-xl bg-white text-gray-600 active:scale-95 transition-all">Batal</button>
               <button onClick={handleSave} disabled={syncing} className="px-10 py-3.5 text-[10px] font-black uppercase bg-emerald-600 text-white rounded-xl shadow-lg active:scale-95 disabled:bg-emerald-300">
                 {syncing ? 'Sinkronisasi...' : 'Simpan Agenda'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KegiatanPage;
