
import React, { useState, useEffect, useMemo } from 'react';
import { Dossier, Pegawai } from '../types';
import { fetchDossiersFromSheets, fetchPegawaiFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';

const DossiersPage = () => {
  const { user, canEdit, isSuperadmin, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [dossierList, setDossierList] = useState<Dossier[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Dossier>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const pegawais = await fetchPegawaiFromSheets();
      setPegawaiList(pegawais);

      const savedLocal = localStorage.getItem('portal_dossiers_db');
      if (savedLocal) {
        setDossierList(JSON.parse(savedLocal));
      } else {
        const data = await fetchDossiersFromSheets();
        setDossierList(data);
        localStorage.setItem('portal_dossiers_db', JSON.stringify(data));
      }
    } catch (err) {
      console.error("Gagal memuat data arsip:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDossiers = useMemo(() => {
    let result = dossierList;
    if (isViewer) {
      result = result.filter(d => d.nip === user?.nip);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d => 
        d.namaPegawai.toLowerCase().includes(term) || 
        d.nip.includes(term) || 
        d.fileName.toLowerCase().includes(term) || 
        d.keterangan.toLowerCase().includes(term)
      );
    }
    return result;
  }, [dossierList, isViewer, user, searchTerm]);

  const handleOpenModal = (dossier: Dossier | null = null) => {
    if (dossier) {
      setEditingId(dossier.id);
      setFormData({ ...dossier });
    } else {
      setEditingId(null);
      setFormData({
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: '',
        fileName: '',
        nip: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.nip || !formData.fileName) return alert("Harap isi data pegawai dan nama berkas");
    
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    let updatedList: Dossier[];

    if (editingId) {
      updatedList = dossierList.map(d => d.id === editingId ? { 
        ...d, 
        ...formData, 
        namaPegawai: peg?.nama || d.namaPegawai 
      } as Dossier : d);
      logActivity('UPDATE', 'Dossier', `Memperbarui info berkas: ${formData.fileName}`);
    } else {
      const newD: Dossier = { 
        id: Date.now().toString(), 
        nip: formData.nip!, 
        namaPegawai: peg?.nama || 'Unknown', 
        tanggal: formData.tanggal || new Date().toISOString().split('T')[0], 
        keterangan: formData.keterangan || '', 
        fileName: formData.fileName! 
      };
      updatedList = [newD, ...dossierList];
      logActivity('CREATE', 'Dossier', `Mengunggah metadata berkas: ${newD.fileName} untuk ${newD.namaPegawai}`);
    }

    setDossierList(updatedList);
    localStorage.setItem('portal_dossiers_db', JSON.stringify(updatedList));
    setIsModalOpen(false);
    setShowSuccess(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Hapus catatan arsip ini? Berkas fisik di Drive tidak akan terhapus.")) {
      const updated = dossierList.filter(d => d.id !== id);
      setDossierList(updated);
      localStorage.setItem('portal_dossiers_db', JSON.stringify(updated));
      logActivity('DELETE', 'Dossier', `Menghapus metadata arsip ID: ${id}`);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <SuccessModal 
        isOpen={showSuccess} 
        onClose={() => setShowSuccess(false)} 
        title="Arsip Tersimpan" 
        message="Dokumen digital telah berhasil dicatat di basis data sistem." 
      />
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">
            {isViewer ? 'Arsip Digital Saya' : 'Manajemen E-Dossier'}
          </h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
            Pusat Penyimpanan Berkas Pegawai Terpusat
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80 group">
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
            <input 
              type="text" 
              placeholder="Cari NIP, Nama, atau Berkas..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold text-gray-900 shadow-sm outline-none focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {canEdit && (
            <button 
              onClick={() => handleOpenModal()} 
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <i className="bi bi-cloud-plus-fill text-lg"></i>
              <span className="hidden sm:inline">Unggah Metadata</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b border-gray-100 tracking-widest">
              <tr>
                <th className="px-8 py-5">Tipe & Nama Berkas</th>
                <th className="px-4 py-5">Pemilik Berkas</th>
                <th className="px-4 py-5 text-center">Tanggal</th>
                <th className="px-4 py-5">Keterangan</th>
                <th className="px-8 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse">Sinkronisasi Arsip...</td></tr>
              ) : filteredDossiers.length > 0 ? filteredDossiers.map(d => (
                <tr key={d.id} className="hover:bg-blue-50/5 group transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                       <div className="h-10 w-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center border border-rose-100 shadow-sm">
                          <i className="bi bi-file-earmark-pdf-fill text-xl"></i>
                       </div>
                       <div className="min-w-0">
                          <p className="text-[11px] font-black text-gray-900 uppercase truncate max-w-[200px]">{d.fileName}</p>
                          <p className="text-[7px] text-gray-400 font-bold uppercase mt-1">Format: Digital PDF</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <p className="text-[10px] font-black text-gray-700 uppercase">{d.namaPegawai}</p>
                    <p className="text-[8px] font-mono text-blue-600 font-bold mt-0.5">{d.nip}</p>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <span className="text-[10px] font-bold text-gray-500">{d.tanggal}</span>
                  </td>
                  <td className="px-4 py-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-tight line-clamp-2">{d.keterangan || '-'}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="h-9 w-9 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 border border-gray-100 transition-all flex items-center justify-center shadow-sm">
                        <i className="bi bi-eye"></i>
                      </button>
                      {canEdit && (
                        <button onClick={() => handleOpenModal(d)} className="h-9 w-9 bg-gray-50 text-gray-400 rounded-xl hover:text-amber-600 border border-gray-100 transition-all flex items-center justify-center shadow-sm">
                          <i className="bi bi-pencil-square"></i>
                        </button>
                      )}
                      {isSuperadmin && (
                        <button onClick={() => handleDelete(d.id)} className="h-9 w-9 bg-gray-50 text-gray-400 rounded-xl hover:text-rose-600 border border-gray-100 transition-all flex items-center justify-center shadow-sm">
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-8 py-24 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest opacity-30">Arsip digital belum tersedia untuk kriteria ini</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-modalEnter flex flex-col space-y-6">
             <div className="flex items-center gap-4 mb-2">
                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                   <i className="bi bi-cloud-arrow-up"></i>
                </div>
                <h4 className="text-sm font-black uppercase text-gray-900 tracking-tight">
                  {editingId ? 'Edit Info Arsip' : 'Tambah Arsip Baru'}
                </h4>
             </div>

             <div className="space-y-4">
                {!isViewer && !editingId && (
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">PILIH PEGAWAI</label>
                    <select 
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                      value={formData.nip}
                      onChange={e => setFormData({...formData, nip: e.target.value})}
                    >
                      <option value="">-- Pilih Nama Pegawai --</option>
                      {pegawaiList.map(p => <option key={p.id} value={p.nip}>{p.nama} ({p.nip})</option>)}
                    </select>
                  </div>
                )}
                
                <div className="space-y-1.5">
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">TANGGAL DOKUMEN</label>
                   <input 
                     type="date" 
                     className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500"
                     value={formData.tanggal}
                     onChange={e => setFormData({...formData, tanggal: e.target.value})}
                   />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">NAMA BERKAS (FILE_NAME)</label>
                   <input 
                     type="text" 
                     placeholder="Contoh: SK_Pangkat_IVa_2024.pdf"
                     className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500"
                     value={formData.fileName}
                     onChange={e => setFormData({...formData, fileName: e.target.value})}
                   />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">KETERANGAN</label>
                   <textarea 
                     rows={3}
                     placeholder="Detail atau nomor SK terkait berkas..."
                     className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500 resize-none"
                     value={formData.keterangan}
                     onChange={e => setFormData({...formData, keterangan: e.target.value})}
                   />
                </div>
             </div>

             <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-[1.5] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                >
                  Simpan Metadata
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DossiersPage;
