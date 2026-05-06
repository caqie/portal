import React, { useState, useEffect } from 'react';
import { Kegiatan } from '../types';
import { useAuth } from '../AuthContext';
import { syncTableRemote, fetchKegiatanFromSheets } from '../spreadsheetService';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import CalendarView from '../components/CalendarView';

const KegiatanPage = () => {
  const { canEdit } = useAuth();
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<Kegiatan[]>([]);
  const [selectedDateLabel, setSelectedDateLabel] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingKegiatan, setEditingKegiatan] = useState<Kegiatan | null>(null);
  const [formData, setFormData] = useState<Partial<Kegiatan>>({});
  const [viewMode, setViewMode] = useState<'TABLE' | 'CALENDAR'>('CALENDAR');

  useEffect(() => { 
    const initLoad = async () => {
      // Migration check
      const oldData = localStorage.getItem('portal_agenda_db');
      const newData = localStorage.getItem('kegiatan_db');
      if (oldData && !newData) {
        localStorage.setItem('kegiatan_db', oldData);
      }

      const data = await fetchKegiatanFromSheets();
      setKegiatanList(data);
    };
    initLoad();
  }, []);

  const handleDateClick = (date: string, eventsOnDate: Kegiatan[]) => {
    setSelectedDateLabel(new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
    setSelectedDateEvents(eventsOnDate);
    setIsDetailModalOpen(true);
  };

  const handleOpenModal = (kegiatan: Kegiatan | null = null) => {
    if (kegiatan) {
      setEditingKegiatan(kegiatan);
      setFormData({ ...kegiatan });
    } else {
      setEditingKegiatan(null);
      const today = new Date().toISOString().split('T')[0];
      setFormData({ 
        tanggalMulai: today, 
        tanggalSelesai: today, 
        jamMulai: '08:00', 
        jamSelesai: '17:00', 
        status: 'Direncanakan', 
        jumlahPeserta: 0, 
        laporanSingkat: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    
    const agendaPayload: Kegiatan = { 
      id: editingKegiatan?.id || `AGN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tanggal: formData.tanggalMulai || '',
      tanggalMulai: formData.tanggalMulai || '',
      tanggalSelesai: formData.tanggalSelesai || '',
      jamMulai: formData.jamMulai || '',
      jamSelesai: formData.jamSelesai || '',
      judulKegiatan: formData.judulKegiatan || '',
      tempat: formData.tempat || '',
      jumlahPeserta: formData.jumlahPeserta || 0,
      asalPeserta: formData.asalPeserta || '',
      laporanSingkat: formData.laporanSingkat || '',
      linkDriveFoto: formData.linkDriveFoto || '',
      status: formData.status || 'Direncanakan'
    };

    await syncTableRemote('KEGIATAN', 'SAVE', agendaPayload);
    const updated = editingKegiatan 
      ? kegiatanList.map(k => k.id === editingKegiatan.id ? agendaPayload : k) 
      : [agendaPayload, ...kegiatanList];
    
    setKegiatanList(updated);
    localStorage.setItem('kegiatan_db', JSON.stringify(updated));
    setIsModalOpen(false);
    setShowSuccess(true);
    setSyncing(false);
  };

  const handleDelete = async () => {
    if (!editingKegiatan) return;
    const updated = kegiatanList.filter(k => k.id !== editingKegiatan.id);
    await syncTableRemote('KEGIATAN', 'DELETE', { 
      id: editingKegiatan.id,
      nama: editingKegiatan.judulKegiatan
    });
    setKegiatanList(updated);
    localStorage.setItem('kegiatan_db', JSON.stringify(updated));
    setIsConfirmOpen(false);
    setIsModalOpen(false);
    setShowSuccess(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Data Berhasil Disimpan" />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter">Kalender Kerja</h3>
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.2em] mt-1">Sistem Manajemen Agenda</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-1 rounded-2xl flex gap-1">
            <button onClick={() => setViewMode('CALENDAR')} className={`px-6 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${viewMode === 'CALENDAR' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><i className="bi bi-calendar3 mr-2"></i>Kalender</button>
            <button onClick={() => setViewMode('TABLE')} className={`px-6 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${viewMode === 'TABLE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><i className="bi bi-list-task mr-2"></i>Tabel</button>
          </div>
          {canEdit && <button onClick={() => handleOpenModal()} className="px-6 py-3.5 bg-gray-950 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95"><i className="bi bi-plus-lg mr-2"></i>Tambah</button>}
        </div>
      </div>

      {viewMode === 'CALENDAR' ? (
        <CalendarView events={kegiatanList} onDateClick={handleDateClick} />
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-left">
              <thead className="bg-gray-50/50 text-[9px] font-black uppercase text-gray-400 border-b tracking-widest">
                <tr>
                  <th className="px-8 py-6">Rentang Waktu</th>
                  <th className="px-4 py-6">Agenda Kegiatan</th>
                  <th className="px-4 py-6">Lokasi</th>
                  <th className="px-4 py-6">Status</th>
                  <th className="px-8 py-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {kegiatanList.length > 0 ? (
                  kegiatanList.map((k, idx) => (
                    <tr key={`${k.id || idx}-${idx}`} className="hover:bg-blue-50/20 group transition-all">
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-900">{k.tanggalMulai}</span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase">s/d {k.tanggalSelesai}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <p className="font-black text-gray-800 text-xs uppercase">{k.judulKegiatan}</p>
                        {k.laporanSingkat && <p className="text-[9px] text-gray-400 mt-1 line-clamp-1">{k.laporanSingkat}</p>}
                      </td>
                      <td className="px-4 py-5 text-[10px] font-bold text-gray-500 uppercase">{k.tempat || '-'}</td>
                      <td className="px-4 py-5">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
                          k.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' :
                          k.status === 'Berjalan' ? 'bg-blue-100 text-blue-700' :
                          k.status === 'Dibatalkan' ? 'bg-rose-100 text-rose-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {k.status || 'Direncanakan'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {canEdit && (
                          <button onClick={() => handleOpenModal(k)} className="h-10 w-10 bg-gray-50 text-gray-400 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all flex items-center justify-center">
                            <i className="bi bi-pencil-square"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <i className="bi bi-calendar-x text-4xl text-gray-200 block mb-4"></i>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Belum ada agenda terdaftar</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detail Per Tanggal */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl relative z-10 max-h-[80vh] overflow-y-auto">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Agenda Tanggal</h4>
            <p className="text-lg font-black text-gray-950 mb-6">{selectedDateLabel}</p>
            <div className="space-y-4">
              {selectedDateEvents.map((ev, idx) => (
                <div key={`${ev.id}-${idx}`} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 group relative">
                  {canEdit && (
                    <button 
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenModal(ev);
                      }}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all p-2 bg-white shadow-sm rounded-lg text-blue-600 hover:bg-blue-50"
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[9px] font-black text-blue-600 uppercase">{ev.jamMulai} - {ev.jamSelesai} WIB</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase">{ev.jumlahPeserta} Peserta</span>
                  </div>
                  <p className="font-black text-sm text-gray-900 mt-2">{ev.judulKegiatan}</p>
                  <p className="text-[10px] text-gray-500 mt-1 italic">{ev.laporanSingkat || 'Tidak ada catatan'}</p>
                  <p className="text-[10px] text-gray-400 mt-2 font-bold"><i className="bi bi-geo-alt mr-1"></i>{ev.tempat}</p>
                </div>
              ))}
              {selectedDateEvents.length === 0 && <p className="text-center text-gray-400 py-10 font-bold text-xs uppercase">Tidak ada agenda</p>}
            </div>
            <button onClick={() => setIsDetailModalOpen(false)} className="w-full mt-6 py-3 bg-gray-950 text-white rounded-xl text-[10px] font-black uppercase">Tutup</button>
          </div>
        </div>
      )}

      {/* Modal Form Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative z-10 max-h-[90vh]">
            <div className="px-8 py-7 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h4 className="text-[15px] font-black uppercase tracking-tight">{editingKegiatan ? 'Edit Agenda Kerja' : 'Buat Agenda Baru'}</h4>
                <p className="text-[9px] font-bold text-blue-600 uppercase mt-1 tracking-widest">Manajemen Kalender Operasional</p>
              </div>
              <div className="flex items-center gap-2">
                {editingKegiatan && (
                  <button onClick={() => setIsConfirmOpen(true)} className="h-10 w-10 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Hapus Agenda">
                    <i className="bi bi-trash3-fill"></i>
                  </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-xl transition-all">
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Judul Kegiatan</label>
                <input 
                  type="text" 
                  required 
                  placeholder="CONTOH: RAPAT KOORDINASI PENATAAN SDM" 
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl text-xs font-black border-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300" 
                  value={formData.judulKegiatan || ''} 
                  onChange={(e) => setFormData({...formData, judulKegiatan: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tempat / Lokasi</label>
                  <input 
                    type="text" 
                    placeholder="CONTOH: RUANG RAPAT LANTAI 5" 
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl text-xs font-black border-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300" 
                    value={formData.tempat || ''} 
                    onChange={(e) => setFormData({...formData, tempat: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Status Kegiatan</label>
                  <select 
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl text-xs font-black border-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    value={formData.status || 'Direncanakan'}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Direncanakan">DIRENCANAKAN</option>
                    <option value="Berjalan">SEDANG BERJALAN</option>
                    <option value="Selesai">SELESAI</option>
                    <option value="Dibatalkan">DIBATALKAN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Mulai</label>
                  <input type="date" required className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-[11px] font-black border-none" value={formData.tanggalMulai || ''} onChange={(e) => setFormData({...formData, tanggalMulai: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Selesai</label>
                  <input type="date" required className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-[11px] font-black border-none" value={formData.tanggalSelesai || ''} onChange={(e) => setFormData({...formData, tanggalSelesai: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Jam Mulai</label>
                  <input type="time" className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-[11px] font-black border-none" value={formData.jamMulai || ''} onChange={(e) => setFormData({...formData, jamMulai: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Jam Selesai</label>
                  <input type="time" className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-[11px] font-black border-none" value={formData.jamSelesai || ''} onChange={(e) => setFormData({...formData, jamSelesai: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Jumlah Peserta</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl text-xs font-black border-none" 
                    value={formData.jumlahPeserta || 0} 
                    onChange={(e) => setFormData({...formData, jumlahPeserta: parseInt(e.target.value)})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Asal Peserta</label>
                  <input 
                    type="text" 
                    placeholder="CONTOH: INTERNAL DJKI / UMUM" 
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl text-xs font-black border-none" 
                    value={formData.asalPeserta || ''} 
                    onChange={(e) => setFormData({...formData, asalPeserta: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Link Dokumentasi / Foto (Google Drive)</label>
                <input 
                  type="url" 
                  placeholder="https://drive.google.com/..." 
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl text-xs font-black border-none" 
                  value={formData.linkDriveFoto || ''} 
                  onChange={(e) => setFormData({...formData, linkDriveFoto: e.target.value})} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Catatan Kegiatan / Laporan Singkat</label>
                <textarea 
                  placeholder="MASUKKAN DESKRIPSI ATAU HASIL SINGKAT KEGIATAN..." 
                  rows={4} 
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl text-xs font-black resize-none border-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300" 
                  value={formData.laporanSingkat || ''} 
                  onChange={(e) => setFormData({...formData, laporanSingkat: e.target.value})}
                ></textarea>
              </div>
            </form>

            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handleSave} 
                disabled={syncing} 
                className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-blue-600/20 active:scale-95 disabled:bg-blue-300 transition-all"
              >
                {syncing ? (
                  <span className="flex items-center gap-2">
                    <i className="bi bi-arrow-repeat animate-spin"></i> Menyimpan...
                  </span>
                ) : (
                  editingKegiatan ? 'Update Agenda' : 'Simpan Agenda'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KegiatanPage;