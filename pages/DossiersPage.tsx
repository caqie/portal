
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dossier, Pegawai } from '../types';
import { fetchDossiersFromSheets, fetchPegawaiFromSheets, syncTableRemote, uploadFileToDrive } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';

const DossiersPage = () => {
  const { canEdit, logActivity } = useAuth();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [formData, setFormData] = useState<Partial<Dossier>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Dossier | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dData, pData] = await Promise.all([
        fetchDossiersFromSheets(true),
        fetchPegawaiFromSheets(true)
      ]);
      // Sort by newest upload (assuming ID or tanggal)
      setDossiers(dData.sort((a,b) => b.id.localeCompare(a.id)));
      setPegawaiList(pData);
    } catch (e) {
      console.error("Failed to load dossiers", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredDossiers = useMemo(() => {
    return dossiers.filter(d => 
      (d.namaPegawai || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (d.fileName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.nip || '').includes(searchTerm)
    );
  }, [dossiers, searchTerm]);

  const handleDownload = (url: string) => {
    if (!url) return;
    let finalUrl = url;
    if (url.includes('drive.google.com')) {
      const idMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
      if (idMatch) finalUrl = `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
    }
    window.open(finalUrl, '_blank');
  };

  const handleOpenModal = (d: Dossier | null = null) => {
    setSelectedDossier(d);
    setFormData(d ? { ...d } : { 
      tanggal: new Date().toISOString().split('T')[0],
      nip: '',
      fileName: '',
      fileUrl: '',
      keterangan: ''
    });
    setIsModalOpen(true);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran file terlalu besar. Maksimal 10MB.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const res = await uploadFileToDrive(`DOSSIER_${Date.now()}_${file.name.replace(/\s+/g, '_')}`, file.type, base64);
        
        if (res.success && res.fileUrl) {
          setFormData(prev => ({ 
            ...prev, 
            fileUrl: res.fileUrl, 
            fileName: prev.fileName || file.name.split('.').slice(0, -1).join('.')
          }));
        } else {
          alert("Gagal unggah berkas ke Drive.");
        }
      } catch (err) {
        alert("Terjadi kesalahan teknis saat mengunggah.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmDelete = (d: Dossier) => {
    setItemToDelete(d);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSyncing(true);
    try {
      const success = await syncTableRemote('DOSSIER', 'DELETE', { 
        id: itemToDelete.id,
        nip: itemToDelete.nip,
        nama: itemToDelete.namaPegawai
      });
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
    if (!formData.nip || !formData.fileName || !formData.fileUrl) {
      return alert("Mohon lengkapi data: Pilih Pegawai, Nama Berkas, dan Unggah File.");
    }
    
    setSyncing(true);
    const cleanNip = (formData.nip || '').replace(/\D/g, '');
    const peg = pegawaiList.find(p => (p.nip || '').replace(/\D/g, '') === cleanNip);
    const payload = {
      ...formData,
      nip: cleanNip,
      id: selectedDossier?.id || `DOS-NEW-${cleanNip}-${Date.now()}`,
      namaPegawai: peg?.nama || 'ASN'
    };

    try {
      const success = await syncTableRemote('DOSSIER', 'SAVE', payload);
      if (success) {
        logActivity(selectedDossier ? 'UPDATE' : 'CREATE', 'Dossier', `Simpan berkas: ${payload.fileName} untuk ${payload.namaPegawai}`);
        // REFRESH DATA DARI CLOUD
        await loadData();
        setIsModalOpen(false);
        setShowSuccess(true);
      } else {
        alert("Gagal menyimpan ke database cloud.");
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
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <i className="bi bi-cloud-check-fill text-blue-600"></i> Arsip Digital Dokumen Kepegawaian DJKI
          </p>
        </div>
        {canEdit && (
          <button onClick={() => handleOpenModal()} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center gap-3">
             <i className="bi bi-cloud-arrow-up-fill text-lg"></i>
             Upload Dokumen Baru
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/30">
              <div className="relative flex-1 max-w-md">
            <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text" 
              placeholder="Cari Berkas, NIP, atau Nama Pegawai..." 
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-[11px] font-black outline-none focus:border-blue-600 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-[900px] w-full text-left">
            <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
              <tr>
                <th className="px-10 py-5">Tanggal Upload</th>
                <th className="px-4 py-5">Informasi Dokumen</th>
                <th className="px-4 py-5">Pemilik Berkas</th>
                <th className="px-8 py-5 text-right">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="py-24 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse">Menghubungkan Database Cloud...</td></tr>
              ) : filteredDossiers.map((d, i) => (
                <tr key={`${d.id}-${i}`} className="group hover:bg-blue-50/5 transition-all">
                  <td className="px-10 py-5">
                    <p className="text-[11px] font-black text-gray-500 uppercase">{d.tanggal}</p>
                    <span className="text-[8px] font-bold text-blue-500 uppercase">Verified System</span>
                  </td>
                  <td className="px-4 py-5">
                    <p className="text-[11px] font-black text-gray-950 uppercase truncate max-w-xs">{d.fileName}</p>
                    <p className="text-[9px] text-gray-400 italic line-clamp-1">{d.keterangan || 'Tidak ada keterangan'}</p>
                  </td>
                  <td className="px-4 py-5">
                    <p className="text-[10px] font-black uppercase text-gray-900">{d.namaPegawai}</p>
                    <p className="text-[9px] font-mono text-gray-400 font-bold tracking-tighter">NIP. {d.nip}</p>
                  </td>
                   <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={() => d.fileUrl && window.open(d.fileUrl, '_blank')} className="px-3 py-2 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded-xl shadow-sm hover:bg-blue-600 hover:text-white transition-all text-[9px] font-black uppercase" title="Lihat"><i className="bi bi-eye mr-1.5"></i> Lihat</button>
                       <button 
                         onClick={() => handleDownload(d.fileUrl || '')} 
                         className="px-3 py-2 flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl shadow-sm hover:bg-emerald-600 hover:text-white transition-all text-[9px] font-black uppercase" 
                         title="Unduh PDF"
                       >
                         <i className="bi bi-download mr-1.5"></i> Unduh
                       </button>
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
                <tr><td colSpan={4} className="py-24 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest opacity-40">Arsip dokumen tidak ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && !uploading && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-[95vh] border border-white/20">
              <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center shrink-0">
                 <div>
                    <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">{selectedDossier ? 'Update Dokumen' : 'Registrasi Berkas Baru'}</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">E-Dossier Integrated Cloud Service</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
              </div>
              <form onSubmit={handleSave} className="p-10 overflow-y-auto custom-scrollbar space-y-8">
                 <SearchableSelect label="Pilih Pegawai Pemilik Berkas" options={pegawaiList.map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip}` }))} value={formData.nip || ''} onChange={v => setFormData({...formData, nip: v})} />
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Tanggal Dokumen</label><input type="date" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600 transition-all" value={formData.tanggal || ''} onChange={e => setFormData({...formData, tanggal: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Nama / Judul Berkas</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600 transition-all" value={formData.fileName || ''} onChange={e => setFormData({...formData, fileName: e.target.value})} placeholder="Misal: SK Pangkat 2024" /></div>
                 </div>

                 <div className={`p-8 rounded-[2.5rem] flex flex-col items-center text-center space-y-5 transition-all border-2 border-dashed ${formData.fileUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50/50 border-blue-200'}`}>
                    <div className={`h-20 w-20 rounded-3xl flex items-center justify-center shadow-xl transition-transform ${uploading ? 'bg-blue-100' : formData.fileUrl ? 'bg-emerald-600 text-white animate-pulse' : 'bg-white text-blue-600 shadow-blue-100'}`}>
                       {uploading ? <div className="h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div> : <i className={`bi ${formData.fileUrl ? 'bi-check-all text-4xl' : 'bi-cloud-arrow-up-fill text-3xl'}`}></i>}
                    </div>
                    <div>
                       <h6 className={`text-[11px] font-black uppercase tracking-widest ${formData.fileUrl ? 'text-emerald-700' : 'text-gray-950'}`}>{formData.fileUrl ? 'Berkas Berhasil Terunggah' : 'Pilih File untuk Diunggah'}</h6>
                       <p className="text-[9px] font-bold text-gray-400 uppercase mt-1.5 tracking-tight">Format: PDF, PNG, JPG (Maks 10MB)</p>
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className={`px-10 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${formData.fileUrl ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-blue-600 text-white shadow-blue-600/20'}`}>
                       {formData.fileUrl ? 'Ganti Berkas' : 'Unggah Sekarang'}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleUploadFile} />
                 </div>

                 <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Keterangan Tambahan (Opsional)</label><textarea rows={3} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 resize-none transition-all" value={formData.keterangan || ''} onChange={e => setFormData({...formData, keterangan: e.target.value})} placeholder="Catatan internal tentang dokumen ini..." /></div>
              </form>
              <div className="p-8 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Batalkan</button>
                 <button onClick={handleSave} disabled={syncing || uploading} className="px-16 py-4 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 disabled:bg-gray-300 flex items-center gap-3">
                    {(syncing || uploading) && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Simpan ke Database</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DossiersPage;