
import React, { useState, useEffect } from 'react';
import { Laporan } from '../types';
import { BULAN } from '../constants';
import { fetchLaporanFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';

const LaporanPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLaporan, setEditingLaporan] = useState<Laporan | null>(null);
  const [searchBulan, setSearchBulan] = useState('');
  const [searchTahun, setSearchTahun] = useState(new Date().getFullYear().toString());
  
  const [formData, setFormData] = useState<Partial<Laporan>>({});

  useEffect(() => { loadLaporan(); }, []);

  const loadLaporan = async () => {
    setLoading(true);
    try {
      const data = await fetchLaporanFromSheets();
      setLaporanList(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleOpenModal = (laporan: Laporan | null = null) => {
    if (laporan) {
      setEditingLaporan(laporan);
      setFormData({ 
        judul: laporan.judul,
        jenis: laporan.jenis,
        periode: laporan.periode,
        tahun: laporan.tahun,
        status: laporan.status,
        fileUrl: laporan.fileUrl
      });
    } else {
      setEditingLaporan(null);
      setFormData({
        judul: '',
        jenis: 'Bulanan',
        periode: BULAN[new Date().getMonth()],
        tahun: new Date().getFullYear(),
        status: 'Draft',
        fileUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.judul) {
      alert("Judul laporan wajib diisi");
      return;
    }

    if (editingLaporan) {
      setLaporanList(prev => prev.map(l => l.id === editingLaporan.id ? { ...l, ...formData } as Laporan : l));
      logActivity('UPDATE', 'Laporan', `Memperbarui laporan: ${formData.judul}`);
    } else {
      const newLaporan: Laporan = {
        id: Date.now().toString(),
        judul: formData.judul || '',
        jenis: (formData.jenis as any) || 'Bulanan',
        periode: formData.periode || '',
        tahun: formData.tahun || 2024,
        status: (formData.status as any) || 'Draft',
        fileUrl: formData.fileUrl,
        createdAt: new Date().toISOString()
      };
      setLaporanList(prev => [newLaporan, ...prev]);
      logActivity('CREATE', 'Laporan', `Menambah laporan baru: ${newLaporan.judul}`);
    }

    setIsModalOpen(false);
    alert("Laporan berhasil disimpan.");
  };

  const handleDelete = (id: string) => {
    if (confirm(`Hapus laporan ini?`)) {
      setLaporanList(prev => prev.filter(x => x.id !== id));
      logActivity('DELETE', 'Laporan', `Menghapus laporan.`);
    }
  };

  const filteredLaporan = laporanList.filter(l => (!searchBulan || l.periode === searchBulan) && (!searchTahun || l.tahun.toString() === searchTahun));

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Database Laporan</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Konsolidasi Pelaporan Terpadu SDM DJKI</p>
        </div>
        {canEdit && (
          <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center space-x-3">
            <i className="bi bi-plus-lg text-lg"></i>
            <span>Entry Laporan Baru</span>
          </button>
        )}
      </div>

      {/* Filter UI */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="w-48 space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-2">Periode</label><select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 shadow-sm outline-none cursor-pointer" value={searchBulan} onChange={(e) => setSearchBulan(e.target.value)}><option value="">Seluruh Bulan</option>{BULAN.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
          <div className="w-32 space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-2">Tahun</label><select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 shadow-sm outline-none cursor-pointer" value={searchTahun} onChange={(e) => setSearchTahun(e.target.value)}><option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option></select></div>
        </div>
        <button onClick={loadLaporan} className="px-8 py-3 bg-[#111827] text-white rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all hover:bg-black"><i className="bi bi-arrow-clockwise mr-2"></i>Refresh Data</button>
      </div>

      {/* Grid Laporan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filteredLaporan.map(l => (
            <div key={l.id} className="bg-white p-8 rounded-[2.5rem] shadow-lg shadow-gray-200/5 border border-gray-50 hover:shadow-xl transition-all group relative">
              <div className="flex items-center justify-between mb-6">
                <span className={`px-4 py-1 text-[8px] font-black uppercase rounded-lg border tracking-widest ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{l.status}</span>
                <span className="text-[9px] font-mono text-gray-300 font-bold">REP-{l.id}</span>
              </div>
              <h5 className="font-bold text-gray-900 text-base leading-tight uppercase line-clamp-2 min-h-[3rem]">{l.judul}</h5>
              <div className="mt-4 flex items-center text-[9px] font-bold text-gray-400 uppercase tracking-wider space-x-3">
                <span>{l.jenis}</span>
                <span className="h-1 w-1 bg-gray-200 rounded-full"></span>
                <span>{l.periode} {l.tahun}</span>
              </div>
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-50">
                {l.fileUrl ? (
                  <a href={l.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-black text-[9px] uppercase tracking-widest flex items-center space-x-2"><i className="bi bi-link-45deg text-lg"></i><span>Buka Berkas</span></a>
                ) : <span className="text-gray-300 font-black text-[9px] uppercase italic">Tanpa Tautan</span>}
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canEdit && <button onClick={() => handleOpenModal(l)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-gray-50 shadow-sm"><i className="bi bi-pencil-square"></i></button>}
                  {isSuperadmin && <button onClick={() => handleDelete(l.id)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-gray-50 shadow-sm"><i className="bi bi-trash"></i></button>}
                </div>
              </div>
            </div>
          ))}
          {filteredLaporan.length === 0 && <div className="col-span-full py-20 text-center uppercase text-[10px] font-black text-gray-400 tracking-widest">Tidak ada laporan pada kriteria ini</div>}
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl max-h-[calc(100dvh-8rem)] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-modalEnter">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0"><h4 className="text-lg font-black text-gray-900 tracking-tight leading-none uppercase">{editingLaporan ? 'Edit Laporan' : 'Entry Laporan'}</h4><button onClick={() => setIsModalOpen(false)} className="h-10 w-10 text-gray-400"><i className="bi bi-x-lg"></i></button></div>
            <form className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-2">Judul Laporan</label><input type="text" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-900" value={formData.judul || ''} onChange={(e) => setFormData({...formData, judul: e.target.value})} placeholder="Masukkan Judul..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-2">Kategori</label><select className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900" value={formData.jenis || 'Bulanan'} onChange={(e) => setFormData({...formData, jenis: e.target.value as any})}><option value="Bulanan">Laporan Bulanan</option><option value="Triwulan">Triwulan</option><option value="Semester">Semester</option><option value="Tahunan">Tahunan</option></select></div>
                <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-2">Tahun</label><input type="number" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900" value={formData.tahun || new Date().getFullYear()} onChange={(e) => setFormData({...formData, tahun: parseInt(e.target.value) || 2024})} /></div>
              </div>
              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-2">Periode Bulan</label><select className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900" value={formData.periode || ''} onChange={(e) => setFormData({...formData, periode: e.target.value})}><option value="">Pilih Bulan</option>{BULAN.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-2">Status & Link</label>
                <select className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 mb-4" value={formData.status || 'Draft'} onChange={(e) => setFormData({...formData, status: e.target.value as any})}><option value="Draft">Draft</option><option value="Submit">Submit</option><option value="Approved">Approved</option></select>
                <input type="text" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900" value={formData.fileUrl || ''} onChange={(e) => setFormData({...formData, fileUrl: e.target.value})} placeholder="https://drive.google.com/..." />
              </div>
            </form>
            <div className="px-8 py-6 bg-gray-50 flex justify-end gap-3 border-t border-gray-100 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-[10px] font-black text-gray-500 bg-white border border-gray-200 rounded-xl uppercase">Batal</button>
              <button onClick={handleSave} className="px-10 py-3 text-[10px] font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95 uppercase">Simpan Laporan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaporanPage;
