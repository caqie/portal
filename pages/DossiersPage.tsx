
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dossier, Pegawai } from '../types';
import { fetchDossiersFromSheets, fetchPegawaiFromSheets, syncTableRemote, uploadFileToDrive } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import SearchableSelect from '../components/SearchableSelect';

const DossiersPage = () => {
  const { user, canEdit, isSuperadmin, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dossierList, setDossierList] = useState<Dossier[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Dossier>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const pegawais = await fetchPegawaiFromSheets();
      setPegawaiList(pegawais);
      const data = await fetchDossiersFromSheets(); 
      setDossierList(data); 
    } catch (err) { 
      console.error(err); 
      const saved = localStorage.getItem('portal_dossiers_db');
      if (saved) setDossierList(JSON.parse(saved));
    } finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const result = await uploadFileToDrive(file.name, file.type, base64);
      
      if (result.success && result.fileUrl) {
        setFormData({ ...formData, fileName: file.name, fileUrl: result.fileUrl });
      } else {
        alert("Gagal upload ke Drive. Periksa konfigurasi Apps Script.");
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.nip || !formData.fileUrl) return alert("Pilih pegawai dan unggah file berkas");
    setSyncing(true);
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    
    const dossierPayload: Dossier = { 
      id: Date.now().toString(), 
      nip: formData.nip!, 
      namaPegawai: peg?.nama || 'ASN', 
      tanggal: formData.tanggal || new Date().toISOString().split('T')[0], 
      keterangan: (formData.keterangan || 'Arsip Digital').toUpperCase(), 
      fileName: formData.fileName!.toUpperCase(),
      fileUrl: formData.fileUrl
    };

    try {
      const success = await syncTableRemote('DOSSIER', 'SAVE', dossierPayload);
      if (success) {
        await loadData();
        setIsModalOpen(false);
        setShowSuccess(true);
        logActivity('CREATE', 'Dossier', `Upload arsip ke Drive: ${dossierPayload.fileName}`);
      }
    } catch (e) { alert("Error saving metadata"); } finally { setSyncing(false); }
  };

  // ... (Sisa render logic tetap sama)
  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Arsip Tersimpan" />
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 uppercase">E-Arsip Digital Drive</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Penyimpanan Dokumen Terpusat di Google Drive</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <input type="text" placeholder="Cari Berkas..." className="flex-1 lg:w-80 px-5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-[11px] font-black" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {canEdit && <button onClick={() => { setFormData({ tanggal: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }} className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">+ Berkas Baru</button>}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
            <tr><th className="px-8 py-5">Metadata Berkas</th><th className="px-4 py-5">Pemilik</th><th className="px-8 py-5 text-right">Opsi</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {dossierList.filter(d => (isViewer ? d.nip === user?.nip : true) && d.fileName.toLowerCase().includes(searchTerm.toLowerCase())).map(d => (
              <tr key={d.id} className="hover:bg-blue-50/5 group transition-all">
                <td className="px-8 py-5"><div className="flex items-center gap-4"><div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border"><i className="bi bi-file-earmark-pdf-fill"></i></div><div><p className="text-[11px] font-black text-gray-950 uppercase">{d.fileName}</p><p className="text-[8px] text-gray-400 uppercase">{d.keterangan}</p></div></div></td>
                <td className="px-4 py-5"><p className="text-[10px] font-black uppercase">{d.namaPegawai}</p><p className="text-[8px] font-mono text-blue-600">{d.nip}</p></td>
                <td className="px-8 py-5 text-right"><button onClick={() => d.fileUrl && window.open(d.fileUrl, '_blank')} className="h-9 w-9 bg-white border rounded-xl text-blue-600 shadow-sm hover:scale-110 transition-all"><i className="bi bi-eye-fill"></i></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-modalEnter space-y-6">
             <h4 className="text-xl font-black uppercase text-gray-950 tracking-tight">Upload Berkas ke Drive</h4>
             <div className="space-y-4">
                {!isViewer && <SearchableSelect label="Milik ASN" options={pegawaiList.map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip}` }))} value={formData.nip || ''} onChange={(v) => setFormData({...formData, nip: v})} />}
                <div className="p-10 border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center bg-gray-50/50 group cursor-pointer hover:border-blue-400 transition-all" onClick={() => fileInputRef.current?.click()}>
                   <i className={`bi ${uploading ? 'bi-hourglass-split animate-spin' : 'bi-cloud-arrow-up'} text-4xl text-gray-300 group-hover:text-blue-500`}></i>
                   <p className="text-[10px] font-black text-gray-400 uppercase mt-4">{uploading ? 'Mengunggah ke Drive...' : formData.fileName || 'Klik untuk pilih berkas'}</p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
             </div>
             <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase">Batal</button>
                <button onClick={handleSave} disabled={syncing || uploading || !formData.fileUrl} className="flex-[1.5] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl disabled:bg-gray-300">Simpan Metadata</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DossiersPage;
