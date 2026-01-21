
import React, { useState, useEffect } from 'react';
import { Kegiatan } from '../types';
import { useAuth } from '../AuthContext';
import { syncTableRemote } from '../spreadsheetService';
import SuccessModal from '../components/SuccessModal';

const KegiatanPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingKegiatan, setEditingKegiatan] = useState<Kegiatan | null>(null);
  const [formData, setFormData] = useState<Partial<Kegiatan>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    const saved = localStorage.getItem('portal_agenda_db');
    if (saved) setKegiatanList(JSON.parse(saved));
    setLoading(false);
  };

  const handleOpenModal = (kegiatan: Kegiatan | null = null) => {
    if (kegiatan) {
      setEditingKegiatan(kegiatan);
      setFormData({ ...kegiatan });
    } else {
      setEditingKegiatan(null);
      setFormData({ tanggal: new Date().toISOString().split('T')[0], status: 'Direncanakan', jumlahPeserta: 0, judulKegiatan: '', tempat: '', asalPeserta: '', laporanSingkat: '', linkDriveFoto: '' });
    }
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

    try {
      await syncTableRemote('KEGIATAN', 'SAVE', agendaPayload);
      const updated = editingKegiatan 
        ? kegiatanList.map(k => k.id === editingKegiatan.id ? agendaPayload : k)
        : [agendaPayload, ...kegiatanList];
      
      setKegiatanList(updated);
      localStorage.setItem('portal_agenda_db', JSON.stringify(updated));
      logActivity(editingKegiatan ? 'UPDATE' : 'CREATE', 'Agenda', `Simpan agenda: ${agendaPayload.judulKegiatan}`);
      setIsModalOpen(false);
      setShowSuccess(true);
    } catch (err) {
      alert("Gagal sinkronisasi agenda ke cloud.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Hapus agenda ini dari database cloud?`)) return;
    setSyncing(true);
    try {
      await syncTableRemote('KEGIATAN', 'DELETE', { id });
      const updated = kegiatanList.filter(x => x.id !== id);
      setKegiatanList(updated);
      localStorage.setItem('portal_agenda_db', JSON.stringify(updated));
      logActivity('DELETE', 'Agenda', `Hapus agenda ID: ${id}`);
    } catch (e) {
      alert("Gagal menghapus agenda dari cloud.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Agenda Disinkronkan" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tight leading-none">Agenda & Logistik</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Sinkronisasi Database Agenda Kerja DJKI</p>
        </div>
        {canEdit && <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"><i className="bi bi-calendar-plus text-lg"></i><span>Tambah Agenda</span></button>}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[8px] font-black border-b border-gray-100 tracking-widest">
              <tr><th className="px-8 py-5">Waktu & Status</th><th className="px-4 py-5">Kegiatan</th><th className="px-4 py-5">Tempat</th><th className="px-8 py-5 text-right">Opsi</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 animate-pulse uppercase">Memuat Agenda...</td></tr>
              ) : kegiatanList.map((k) => (
                <tr key={k.id} className="hover:bg-blue-50/10 group transition-all">
                  <td className="px-8 py-5">
                    <p className="text-[10px] font-black text-gray-950 uppercase">{k.tanggal}</p>
                    <span className={`mt-1.5 px-2 py-0.5 text-[7px] font-black uppercase rounded border inline-block ${k.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{k.status}</span>
                  </td>
                  <td className="px-4 py-5"><p className="text-[11px] font-black text-gray-950 uppercase leading-tight line-clamp-1">{k.judulKegiatan}</p><p className="text-[8px] text-gray-400 font-bold uppercase mt-1">{k.jumlahPeserta} Peserta • {k.asalPeserta}</p></td>
                  <td className="px-4 py-5"><p className="text-[10px] font-bold text-gray-600 uppercase">{k.tempat}</p></td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && <button onClick={() => handleOpenModal(k)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl border shadow-sm"><i className="bi bi-pencil-square"></i></button>}
                      {isSuperadmin && <button onClick={() => handleDelete(k.id)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-white rounded-xl border shadow-sm"><i className="bi bi-trash"></i></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {kegiatanList.length === 0 && !loading && (
                <tr><td colSpan={4} className="px-8 py-24 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Database agenda kosong</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl max-h-[90dvh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-modalEnter">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0"><h4 className="text-[14px] font-black text-gray-950 uppercase tracking-tight">{editingKegiatan ? 'Edit Agenda' : 'Agenda Baru'}</h4><button onClick={() => setIsModalOpen(false)} className="text-gray-400"><i className="bi bi-x-lg"></i></button></div>
            <form onSubmit={handleSave} className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-full space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Judul Kegiatan</label><input type="text" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-950 outline-none focus:border-blue-600" value={formData.judulKegiatan || ''} onChange={(e) => setFormData({...formData, judulKegiatan: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Tanggal</label><input type="date" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-950" value={formData.tanggal || ''} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Lokasi</label><input type="text" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-950 focus:border-blue-600" value={formData.tempat || ''} onChange={(e) => setFormData({...formData, tempat: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Peserta</label><input type="number" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-950 focus:border-blue-600" value={formData.jumlahPeserta || 0} onChange={(e) => setFormData({...formData, jumlahPeserta: parseInt(e.target.value) || 0})} /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Status</label><select className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-950 focus:border-blue-600" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})}><option value="Direncanakan">Direncanakan</option><option value="Berlangsung">Berlangsung</option><option value="Selesai">Selesai</option><option value="Dibatalkan">Dibatalkan</option></select></div>
              </div>
              <div className="col-span-full space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Laporan Singkat</label><textarea rows={4} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-950 resize-none focus:border-blue-600" value={formData.laporanSingkat || ''} onChange={(e) => setFormData({...formData, laporanSingkat: e.target.value})}></textarea></div>
            </form>
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
               <button onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 text-[10px] font-black uppercase border border-gray-200 rounded-xl bg-white text-gray-600">Batal</button>
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
