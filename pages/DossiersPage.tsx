
import React, { useState, useEffect } from 'react';
import { Dossier, Pegawai } from '../types';
import { fetchDossiersFromSheets, fetchPegawaiFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';

const DossiersPage = () => {
  const { user, canEdit, isSuperadmin, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [dossierList, setDossierList] = useState<Dossier[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Dossier>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dossiers, pegawais] = await Promise.all([fetchDossiersFromSheets(), fetchPegawaiFromSheets()]);
      setPegawaiList(pegawais);
      const savedLocal = localStorage.getItem('portal_dossiers_db');
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        setDossierList(isViewer ? parsed.filter((d:any) => d.nip === user?.nip) : parsed);
      } else {
        setDossierList(isViewer ? dossiers.filter(d => d.nip === user?.nip) : dossiers);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleOpenModal = (dossier: Dossier | null = null) => {
    if (dossier) {
      setEditingId(dossier.id);
      setFormData({ ...dossier });
    } else {
      setEditingId(null);
      setFormData({ nip: '', namaPegawai: '', tanggal: new Date().toISOString().split('T')[0], keterangan: '', fileName: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.nip || (!editingId && !formData.fileName)) return alert("Harap isi data pegawai dan berkas");
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    
    let updatedList: Dossier[];
    if (editingId) {
      updatedList = dossierList.map(d => d.id === editingId ? { ...d, ...formData, namaPegawai: peg?.nama || d.namaPegawai } as Dossier : d);
      logActivity('UPDATE', 'Dossier', `Memperbarui info berkas: ${formData.fileName}`);
    } else {
      const newD: Dossier = { id: Date.now().toString(), nip: peg!.nip, namaPegawai: peg!.nama, tanggal: formData.tanggal!, keterangan: formData.keterangan || '', fileName: formData.fileName! };
      updatedList = [newD, ...dossierList];
      logActivity('CREATE', 'Dossier', `Mengunggah berkas baru: ${newD.fileName} untuk ${newD.namaPegawai}`);
    }

    setDossierList(updatedList);
    localStorage.setItem('portal_dossiers_db', JSON.stringify(updatedList));
    setIsModalOpen(false);
    alert("Data arsip berhasil disimpan.");
  };

  const handleDelete = (id: string) => {
    const d = dossierList.find(x => x.id === id);
    if (d && confirm(`Hapus berkas ${d.fileName}?`)) {
      const updated = dossierList.filter(x => x.id !== id);
      setDossierList(updated);
      localStorage.setItem('portal_dossiers_db', JSON.stringify(updated));
      logActivity('DELETE', 'Dossier', `Menghapus berkas: ${d.fileName}`);
    }
  };

  const filteredDossiers = dossierList.filter(d => (d.namaPegawai?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || d.nip?.includes(searchTerm) || d.fileName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-10 animate-fadeIn relative pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">{isViewer ? 'Arsip Digital Saya' : 'E-Dossier Pegawai'}</h4>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Penyimpanan Berkas Elektronik Terpusat DJKI</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData} className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase shadow-sm"><i className="bi bi-arrow-clockwise mr-2"></i>Sync</button>
          {canEdit && <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-blue-600/20 active:scale-95 flex items-center gap-2"><i className="bi bi-cloud-arrow-up text-lg"></i>Unggah Berkas</button>}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="relative mb-10 max-w-xl group">
          <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input type="text" placeholder="Cari NIP, Nama, atau Berkas..." className="w-full pl-12 pr-6 py-4.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-xs font-bold text-gray-900 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDossiers.map(d => (
            <div key={d.id} className="group bg-gray-50/50 p-7 rounded-[2rem] border border-gray-100 hover:border-blue-200 hover:bg-white transition-all shadow-sm">
              <div className="flex items-center space-x-5 mb-6">
                <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-md border border-gray-50"><i className="bi bi-file-earmark-pdf text-4xl"></i></div>
                <div className="min-w-0 flex-1"><p className="text-[12px] font-black text-gray-900 truncate uppercase tracking-tight">{d.fileName}</p><p className="text-[8px] text-gray-400 font-black uppercase mt-2">{d.tanggal}</p></div>
              </div>
              <div className="space-y-3 mb-8 p-4 bg-white rounded-xl border border-gray-50">
                 {!isViewer && <div className="flex flex-col"><span className="text-[7px] font-black text-gray-400 uppercase mb-0.5">Pemilik:</span><span className="text-[10px] font-black text-gray-800 uppercase truncate">{d.namaPegawai}</span></div>}
                 <div className="flex flex-col"><span className="text-[7px] font-black text-gray-400 uppercase mb-0.5">Keterangan:</span><span className="text-[10px] font-bold text-gray-600 line-clamp-1">{d.keterangan || '-'}</span></div>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex-1 py-3 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-blue-600/10 active:scale-95 transition-all">Lihat PDF</button>
                {canEdit && (
                  <button onClick={() => handleOpenModal(d)} className="h-11 w-11 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><i className="bi bi-pencil-square"></i></button>
                )}
                {isSuperadmin && <button onClick={() => handleDelete(d.id)} className="h-11 w-11 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><i className="bi bi-trash"></i></button>}
              </div>
            </div>
          ))}
          {filteredDossiers.length === 0 && <div className="col-span-full py-24 text-center opacity-30"><i className="bi bi-folder-x text-6xl block mb-4"></i><p className="text-[11px] font-black uppercase tracking-widest">Database Arsip Kosong</p></div>}
        </div>
      </div>

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-modalEnter">
            <div className="px-10 py-7 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0"><h4 className="text-[12px] font-black uppercase tracking-widest text-gray-900">{editingId ? 'Edit Metadata Arsip' : 'Unggah Arsip Digital'}</h4><button onClick={() => setIsModalOpen(false)} className="text-gray-400"><i className="bi bi-x-lg"></i></button></div>
            <div className="p-10 space-y-6">
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Pilih Pegawai</label><select className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} disabled={!!editingId}><option value="">-- Cari NIP/Nama --</option>{pegawaiList.map(p => <option key={p.nip} value={p.nip}>{p.nip} - {p.nama.toUpperCase()}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Keterangan Berkas</label><textarea rows={3} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 resize-none" value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})}></textarea></div>
              {!editingId && (
                <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Unggah File</label><input type="file" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" onChange={e => setFormData({...formData, fileName: e.target.files?.[0]?.name})} /></div>
              )}
            </div>
            <div className="px-10 py-7 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0"><button onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 text-[10px] font-black uppercase border border-gray-200 rounded-xl bg-white text-gray-600">Batal</button><button onClick={handleSave} className="px-10 py-3.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl shadow-blue-600/20 active:scale-95">{editingId ? 'Simpan Perubahan' : 'Simpan Arsip'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DossiersPage;
