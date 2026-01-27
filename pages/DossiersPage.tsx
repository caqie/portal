
import React, { useState, useEffect, useMemo } from 'react';
import { Dossier, Pegawai } from '../types';
import { fetchDossiersFromSheets, fetchPegawaiFromSheets, syncTableRemote } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';

const DossiersPage = () => {
  const { canEdit, logActivity } = useAuth();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [formData, setFormData] = useState<Partial<Dossier>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Dossier | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dData, pData] = await Promise.all([
        fetchDossiersFromSheets(),
        fetchPegawaiFromSheets()
      ]);
      setDossiers(dData);
      setPegawaiList(pData);
    } catch (e) {
      console.error("Failed to load dossiers", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredDossiers = useMemo(() => {
    return dossiers.filter(d => 
      d.namaPegawai.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.nip.includes(searchTerm)
    );
  }, [dossiers, searchTerm]);

  const handleOpenModal = (d: Dossier | null = null) => {
    setSelectedDossier(d);
    setFormData(d ? { ...d } : { tanggal: new Date().toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  const confirmDelete = (d: Dossier) => {
    setItemToDelete(d);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSyncing(true);
    try {
      const success = await syncTableRemote('DOSSIER', 'DELETE', { id: itemToDelete.id });
      if (success) {
        logActivity('DELETE', 'Dossier', `Hapus berkas: ${itemToDelete.fileName}`);
        await loadData();
        setIsConfirmOpen(false);
      }
    } catch (e) {
      alert("Gagal hapus berkas.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nip || !formData.fileName) return alert("Pilih Pegawai dan Nama Berkas.");
    
    setSyncing(true);
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    const payload = {
      ...formData,
      id: selectedDossier?.id || Date.now().toString(),
      namaPegawai: peg?.nama || 'ASN'
    };

    try {
      const success = await syncTableRemote('DOSSIER', 'SAVE', payload);
      if (success) {
        logActivity(selectedDossier ? 'UPDATE' : 'CREATE', 'Dossier', `Upload/Update berkas: ${payload.fileName}`);
        await loadData();
        setIsModalOpen(false);
        setShowSuccess(true);
      }
    } catch (e) {
      alert("Gagal simpan arsip.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={handleDelete} 
        loading={syncing} 
        message={`Hapus dokumen "${itemToDelete?.fileName}"?`}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 uppercase">E-Dossier Pegawai</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Arsip Digital Dokumen Kepegawaian DJKI</p>
        </div>
        {canEdit && (
          <button onClick={() => handleOpenModal()} className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">+ Upload Dokumen</button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/30">
          <div className="relative flex-1 max-w-md">
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text" 
              placeholder="Cari Berkas atau Pegawai..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-blue-600 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
              <tr>
                <th className="px-10 py-5">Tanggal</th>
                <th className="px-4 py-5">Nama Dokumen</th>
                <th className="px-4 py-5">Pemilik Berkas</th>
                <th className="px-8 py-5 text-right">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="py-24 text-center text-[10px] font-black text-gray-300 uppercase">Menghubungkan Database...</td></tr>
              ) : filteredDossiers.map(d => (
                <tr key={d.id} className="group hover:bg-blue-50/5 transition-all">
                  <td className="px-10 py-5"><p className="text-[11px] font-black text-gray-500 uppercase">{d.tanggal}</p></td>
                  <td className="px-4 py-5"><p className="text-[11px] font-black text-gray-950 uppercase">{d.fileName}</p><p className="text-[9px] text-gray-400">{d.keterangan}</p></td>
                  <td className="px-4 py-5"><p className="text-[10px] font-black uppercase">{d.namaPegawai}</p><p className="text-[8px] font-mono text-gray-400">NIP. {d.nip}</p></td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={() => d.fileUrl && window.open(d.fileUrl, '_blank')} className="h-9 w-9 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded-xl shadow-sm hover:bg-blue-600 hover:text-white transition-all" title="Lihat"><i className="bi bi-eye-fill"></i></button>
                       {canEdit && (
                         <>
                           <button onClick={() => handleOpenModal(d)} className="h-9 w-9 flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100 rounded-xl shadow-sm hover:bg-amber-600 hover:text-white transition-all" title="Edit"><i className="bi bi-pencil-square"></i></button>
                           <button onClick={() => confirmDelete(d)} className="h-9 w-9 flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-100 rounded-xl shadow-sm hover:bg-rose-600 hover:text-white transition-all" title="Hapus"><i className="bi bi-trash3-fill"></i></button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDossiers.length === 0 && !loading && (
                <tr><td colSpan={4} className="py-24 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Arsip dokumen tidak ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-[90vh]">
              <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center shrink-0">
                 <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">{selectedDossier ? 'Update Dokumen' : 'Registrasi Berkas Baru'}</h4>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
              </div>
              <form onSubmit={handleSave} className="p-10 overflow-y-auto custom-scrollbar space-y-6">
                 <SearchableSelect label="Pilih Pegawai Pemilik Berkas" options={pegawaiList.map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip}` }))} value={formData.nip || ''} onChange={v => setFormData({...formData, nip: v})} />
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-3">Tanggal Dokumen</label><input type="date" className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600" value={formData.tanggal || ''} onChange={e => setFormData({...formData, tanggal: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-3">Nama Berkas</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600" value={formData.fileName || ''} onChange={e => setFormData({...formData, fileName: e.target.value})} placeholder="Contoh: SK Kenaikan Pangkat..." /></div>
                 </div>
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-3">Link URL Dokumen (G-Drive)</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600" value={formData.fileUrl || ''} onChange={e => setFormData({...formData, fileUrl: e.target.value})} placeholder="https://drive.google.com/..." /></div>
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-3">Keterangan Tambahan</label><textarea rows={2} className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 resize-none" value={formData.keterangan || ''} onChange={e => setFormData({...formData, keterangan: e.target.value})} /></div>
              </form>
              <div className="p-8 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Batal</button>
                 <button onClick={handleSave} disabled={syncing} className="px-12 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:bg-blue-300 flex items-center gap-3">
                    {syncing && <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>{syncing ? 'Menyinkronkan...' : 'Simpan Arsip'}</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DossiersPage;
