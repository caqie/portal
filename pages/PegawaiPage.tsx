
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Pegawai, Dossier } from '../types';
import { fetchPegawaiFromSheets, syncTableRemote, fetchDossiersFromSheets, uploadFileToDrive } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { normalizeUnitName, UNIT_KERJA, PANGKAT_MAP, DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const PegawaiPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [dossierList, setDossierList] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'DATA_DIRI' | 'E_ARSIP'>('DATA_DIRI');
  
  const [isAddDossierOpen, setIsAddDossierOpen] = useState(false);
  const [dossierFormData, setDossierFormData] = useState<Partial<Dossier>>({});
  
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [formData, setFormData] = useState<Partial<Pegawai>>({});
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pegawaiToDelete, setPegawaiToDelete] = useState<Pegawai | null>(null);
  
  const drhRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dossierFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, dData] = await Promise.all([fetchPegawaiFromSheets(), fetchDossiersFromSheets()]);
      setPegawaiList(pData);
      setDossierList(dData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filteredPegawai = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return pegawaiList.filter(p => {
      // GLOBAL SEARCH: Menggabungkan seluruh field data untuk pencarian multi-parameter
      const searchStr = [
        p.nama,
        p.nip,
        p.jabatan,
        p.unitKerja,
        p.pendidikan,
        p.jurusan,
        p.pangkat,
        p.golRuang,
        p.nik,
        p.agama,
        p.tempatLahir,
        p.jenisPegawai,
        p.status,
        p.gelar,
        p.bagian,
        p.subBagian
      ].map(v => String(v || '').toLowerCase()).join(' ');

      const match = searchStr.includes(term);
      const unitMatch = filterUnit === 'Semua Unit' || normalizeUnitName(p.unitKerja) === filterUnit;
      return match && unitMatch;
    });
  }, [pegawaiList, searchTerm, filterUnit]);

  const filteredDossiers = useMemo(() => {
    if (!selectedPegawai) return [];
    return dossierList.filter(d => d.nip === selectedPegawai.nip);
  }, [dossierList, selectedPegawai]);

  const handleExportExcel = (type: 'SHARE' | 'FULL') => {
    const wb = XLSX.utils.book_new();
    let data;
    if (type === 'SHARE') {
      data = filteredPegawai.map(p => ({
        'NIP': p.nip,
        'NAMA PEGAWAI': p.nama,
        'GELAR': p.gelar || '-',
        'JABATAN': p.jabatan,
        'UNIT KERJA': p.unitKerja,
        'PANGKAT': p.pangkat || '-',
        'GOLONGAN': p.golRuang || '-',
        'STATUS': p.status
      }));
    } else {
      data = filteredPegawai.map(p => ({
        ...p,
        gender: p.gender === 'L' ? 'Laki-laki' : 'Perempuan'
      }));
    }
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Pegawai");
    XLSX.writeFile(wb, `Data_Pegawai_DJKI_${type}_${Date.now()}.xlsx`);
    logActivity('DOWNLOAD', 'Pegawai', `Ekspor Excel ${type}: ${filteredPegawai.length} data`);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`FOTO_${formData.nip || 'NEW'}_${Date.now()}`, file.type, base64);
      if (res.success && res.fileUrl) {
        setFormData(prev => ({ ...prev, foto: res.fileUrl }));
      } else {
        alert("Gagal upload foto ke Drive.");
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nip || !formData.nama) return alert("NIP dan Nama wajib diisi.");
    setSyncing(true);
    const success = await syncTableRemote('PEGAWAI', 'SAVE', formData);
    if (success) {
      setSuccessMsg(`Data ${formData.nama} berhasil disinkronkan.`);
      await loadData();
      setIsModalOpen(false);
      setShowSuccess(true);
      logActivity(formData.id ? 'UPDATE' : 'CREATE', 'Pegawai', `Update data pegawai: ${formData.nama}`);
    }
    setSyncing(false);
  };

  const handleUploadDossierFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const res = await uploadFileToDrive(`DOSSIER_${selectedPegawai?.nip}_${Date.now()}`, file.type, base64);
        if (res.success && res.fileUrl) {
          setDossierFormData(prev => ({ 
            ...prev, 
            fileUrl: res.fileUrl, 
            fileName: prev.fileName || file.name.split('.').slice(0, -1).join('.') 
          }));
        }
      } catch (err) { alert("Kesalahan teknis upload."); } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDossier = async () => {
    if (!dossierFormData.fileName || !dossierFormData.fileUrl) return alert("Pilih berkas dan isi nama berkas.");
    setSyncing(true);
    
    // Pastikan ID unik agar Apps Script melakukan APPEND bukannya UPDATE
    const uniqueId = `DOS-${selectedPegawai?.nip}-${Date.now()}`;
    const payload: Dossier = {
      id: uniqueId,
      nip: selectedPegawai!.nip,
      namaPegawai: selectedPegawai!.nama,
      tanggal: dossierFormData.tanggal || new Date().toISOString().split('T')[0],
      fileName: dossierFormData.fileName,
      fileUrl: dossierFormData.fileUrl,
      keterangan: dossierFormData.keterangan || ''
    };
    
    const success = await syncTableRemote('DOSSIER', 'SAVE', payload);
    if (success) {
      logActivity('CREATE', 'Dossier', `Upload berkas via profil: ${payload.fileName}`);
      // Refresh total data (pegawai + dossiers)
      await loadData();
      setIsAddDossierOpen(false);
      setShowSuccess(true);
      setSuccessMsg("Berkas berhasil ditambahkan ke arsip digital.");
    } else {
      alert("Gagal menyimpan ke database cloud. Periksa koneksi.");
    }
    setSyncing(false);
  };

  const handleCetakDRH = async () => {
    if (!drhRef.current) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(drhRef.current, { scale: 3, useCORS: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
      pdf.save(`DRH_${selectedPegawai?.nama.replace(/\s+/g, '_')}_A4.pdf`);
    } catch (e) { alert("Gagal cetak PDF."); } finally { setSyncing(false); }
  };

  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => !syncing && setIsConfirmOpen(false)} 
        onConfirm={async () => {
           if(pegawaiToDelete) {
             setSyncing(true);
             await syncTableRemote('PEGAWAI', 'DELETE', { nip: pegawaiToDelete.nip });
             setPegawaiList(prev => prev.filter(p => p.nip !== pegawaiToDelete.nip));
             setIsConfirmOpen(false);
             setSyncing(false);
           }
        }} 
        loading={syncing}
        message={`Hapus data pegawai "${pegawaiToDelete?.nama}" secara permanen?`}
      />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h3 className="text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Manajemen SDM DJKI</h3>
            <span className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-600/20">{filteredPegawai.length} ASN</span>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <i className="bi bi-people-fill text-blue-600"></i> Menampilkan {filteredPegawai.length} dari {pegawaiList.length} data pegawai terdaftar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={() => handleExportExcel('SHARE')} className="h-14 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2">
              <i className="bi bi-file-earmark-spreadsheet-fill text-lg"></i> Excel Share
           </button>
           <button onClick={() => handleExportExcel('FULL')} className="h-14 px-6 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2">
              <i className="bi bi-database-fill-down text-lg"></i> Excel Full
           </button>
           {canEdit && (
             <button onClick={() => { setSelectedPegawai(null); setFormData({status: 'Aktif', jenisPegawai: 'PNS', gender: 'L'}); setIsModalOpen(true); }} className="h-14 px-10 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">
               + Registrasi Pegawai
             </button>
           )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <i className="bi bi-search absolute left-6 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input type="text" placeholder="Pencarian Global: Nama, NIP, Pendidikan, NIK, dsb..." className="w-full pl-14 pr-8 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-xs font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="px-8 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
            <option>Semua Unit</option>
            {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase().substring(0, 30)}...</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? Array(6).fill(0).map((_,i) => <div key={i} className="h-44 bg-white rounded-[3rem] animate-pulse"></div>) : 
         filteredPegawai.map(p => (
           <div key={p.nip} onClick={() => { setSelectedPegawai(p); setDetailTab('DATA_DIRI'); setIsDetailOpen(true); }} className="bg-white p-7 rounded-[3rem] border border-gray-100 shadow-sm group hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden">
              <div className="flex items-center gap-6">
                 <div className="h-20 w-20 rounded-[1.8rem] bg-blue-50 overflow-hidden border-4 border-white shadow-xl group-hover:scale-105 transition-transform">
                    {p.foto ? <img src={p.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-blue-600 font-black text-3xl">{p.nama.charAt(0)}</div>}
                 </div>
                 <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-black text-gray-950 uppercase truncate leading-tight">{p.nama}</h4>
                    <p className="text-[9px] font-mono text-gray-400 mt-1">NIP. {p.nip}</p>
                    <p className="text-[8px] font-bold text-blue-600 uppercase mt-2 tracking-widest truncate">{p.jabatan}</p>
                 </div>
              </div>
           </div>
         ))
        }
      </div>

      {/* MODAL DETAIL PEGAWAI */}
      {isDetailOpen && selectedPegawai && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-10">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setIsDetailOpen(false)}></div>
           <div className="relative bg-white w-full max-w-7xl md:rounded-[4rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col h-full md:max-h-[92vh] border border-white/20">
              <div className="bg-gray-50/50 border-b flex justify-between items-center px-10 md:px-14 shrink-0 overflow-x-auto no-scrollbar">
                 <div className="flex">
                    <button onClick={() => setDetailTab('DATA_DIRI')} className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${detailTab === 'DATA_DIRI' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400'}`}>Profil & Data Diri</button>
                    <button onClick={() => setDetailTab('E_ARSIP')} className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${detailTab === 'E_ARSIP' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400'}`}>E-Arsip Digital ({filteredDossiers.length})</button>
                 </div>
                 <button onClick={() => setIsDetailOpen(false)} className="h-10 w-10 text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 <div className="md:w-[360px] bg-gray-50/30 border-r p-8 flex flex-col items-center shrink-0">
                    <div className="h-44 w-44 rounded-[3.5rem] bg-white border-8 border-white shadow-2xl overflow-hidden mb-8 group relative">
                       {selectedPegawai.foto ? <img src={selectedPegawai.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-6xl font-black text-blue-600 bg-blue-50">{selectedPegawai.nama.charAt(0)}</div>}
                    </div>
                    <div className="text-center space-y-2 mb-10">
                       <h4 className="text-xl font-black uppercase text-gray-950 leading-tight">{selectedPegawai.nama}</h4>
                       <p className="text-[10px] font-mono font-black text-blue-600 tracking-widest">NIP. {selectedPegawai.nip}</p>
                       <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black border border-emerald-100 uppercase tracking-widest">{selectedPegawai.status}</span>
                    </div>
                    <div className="w-full space-y-3">
                       <button onClick={handleCetakDRH} className="w-full py-4 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                          <i className="bi bi-file-earmark-pdf-fill"></i> Cetak DRH (A4)
                       </button>
                       {canEdit && (
                         <button onClick={() => { setFormData({...selectedPegawai}); setIsModalOpen(true); setIsDetailOpen(false); }} className="w-full py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-3">
                            <i className="bi bi-pencil-square"></i> Perbarui Data
                         </button>
                       )}
                    </div>
                 </div>

                 <div className="flex-1 p-8 md:p-14 overflow-y-auto custom-scrollbar bg-white">
                    {detailTab === 'DATA_DIRI' ? (
                       <div className="animate-fadeIn space-y-12 max-w-5xl mx-auto">
                          {/* JABATAN & PENEMPATAN */}
                          <div className="space-y-6">
                            <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-50 pb-2 flex items-center gap-2">
                               <i className="bi bi-briefcase-fill"></i> Jabatan & Penempatan
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                               <div><p className={labelClass}>Jabatan Saat Ini</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.jabatan || '-'}</p></div>
                               <div><p className={labelClass}>TMT Jabatan</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.tmtJabatan || '-'}</p></div>
                               <div><p className={labelClass}>Unit Kerja Utama</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.unitKerja || '-'}</p></div>
                               <div><p className={labelClass}>Eselon / Level</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.eselon || '-'}</p></div>
                               <div><p className={labelClass}>Bagian / Tim</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.bagian || '-'}</p></div>
                               <div><p className={labelClass}>Sub Bagian / Sub Tim</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.subBagian || '-'}</p></div>
                               <div className="col-span-full"><p className={labelClass}>Klasifikasi Jabatan</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.klasifikasiJabatan || '-'}</p></div>
                            </div>
                          </div>

                          {/* KEPANGKATAN & STATUS */}
                          <div className="space-y-6">
                            <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] border-b border-emerald-50 pb-2 flex items-center gap-2">
                               <i className="bi bi-award-fill"></i> Kepangkatan & Status
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                               <div><p className={labelClass}>Pangkat / Gol</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.pangkat} ({selectedPegawai.golRuang})</p></div>
                               <div><p className={labelClass}>TMT Pangkat</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.tmtPangkat || '-'}</p></div>
                               <div><p className={labelClass}>Jenis Pegawai</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.jenisPegawai || '-'}</p></div>
                               <div><p className={labelClass}>TMT Status</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.tmtStatus || '-'}</p></div>
                               <div className="col-span-2"><p className={labelClass}>Masa Kerja Terhitung</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.masaKerja || '-'}</p></div>
                            </div>
                          </div>

                          {/* PENDIDIKAN & KEAHLIAN */}
                          <div className="space-y-6">
                            <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] border-b border-amber-50 pb-2 flex items-center gap-2">
                               <i className="bi bi-mortarboard-fill"></i> Pendidikan & Keahlian
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                               <div><p className={labelClass}>Pendidikan Terakhir</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.pendidikan || '-'}</p></div>
                               <div><p className={labelClass}>Jurusan / Program Studi</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.jurusan || '-'}</p></div>
                               <div><p className={labelClass}>Gelar Akademik</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.gelar || '-'}</p></div>
                            </div>
                          </div>

                          {/* DATA PERSONAL & KONTAK */}
                          <div className="space-y-6">
                            <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] border-b border-rose-50 pb-2 flex items-center gap-2">
                               <i className="bi bi-person-lines-fill"></i> Data Personal & Kontak
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                               <div><p className={labelClass}>NIK (Nomor Induk Kependudukan)</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.nik || '-'}</p></div>
                               <div><p className={labelClass}>Nomor Telepon / WA</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.telepon || '-'}</p></div>
                               <div><p className={labelClass}>Tempat, Tanggal Lahir</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.tempatLahir}, {selectedPegawai.tanggalLahir}</p></div>
                               <div><p className={labelClass}>Agama</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.agama || '-'}</p></div>
                               <div><p className={labelClass}>Jenis Kelamin</p><p className="text-[12px] font-black uppercase text-gray-950">{selectedPegawai.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</p></div>
                               <div className="col-span-full"><p className={labelClass}>Alamat Tinggal Sesuai KTP</p><p className="text-[12px] font-bold text-gray-700 normal-case leading-relaxed">{selectedPegawai.alamat || '-'}</p></div>
                            </div>
                          </div>
                       </div>
                    ) : (
                       <div className="animate-fadeIn space-y-8">
                          <div className="flex justify-between items-center mb-6">
                             <h4 className="text-xl font-black uppercase text-gray-900 tracking-tighter">Dokumen Digital Terintegrasi</h4>
                             <div className="flex gap-2">
                                <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase border border-blue-100 flex items-center">{filteredDossiers.length} Berkas</span>
                                {canEdit && (
                                   <button onClick={() => { setDossierFormData({ tanggal: new Date().toISOString().split('T')[0], fileName: '' }); setIsAddDossierOpen(true); }} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2">
                                      <i className="bi bi-plus-lg"></i> Tambah Berkas
                                   </button>
                                )}
                             </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {filteredDossiers.map(d => (
                               <div key={d.id} onClick={() => d.fileUrl && window.open(d.fileUrl, '_blank')} className="p-5 bg-gray-50 border border-gray-100 rounded-[2rem] hover:bg-white hover:border-blue-300 hover:shadow-xl transition-all cursor-pointer group flex items-center gap-4">
                                  <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 text-2xl shadow-sm group-hover:scale-110 transition-transform">
                                     <i className="bi bi-file-earmark-text-fill"></i>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                     <p className="text-[11px] font-black uppercase truncate text-gray-950">{d.fileName}</p>
                                     <p className="text-[8px] font-bold text-gray-400 mt-0.5">{d.tanggal} • {d.keterangan}</p>
                                  </div>
                                  <i className="bi bi-box-arrow-up-right text-gray-300 group-hover:text-blue-600"></i>
                               </div>
                             ))}
                             {filteredDossiers.length === 0 && (
                                <div className="col-span-full py-24 text-center opacity-30">
                                   <i className="bi bi-folder2-open text-6xl block mb-4"></i>
                                   <p className="text-[11px] font-black uppercase tracking-widest">Belum ada arsip digital</p>
                                </div>
                             )}
                          </div>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL TAMBAH DOSSIER */}
      {isAddDossierOpen && selectedPegawai && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-md" onClick={() => !syncing && !uploading && setIsAddDossierOpen(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-modalEnter space-y-6 flex flex-col border border-white/20">
              <div className="flex items-center gap-4 border-b pb-6 shrink-0">
                 <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner"><i className="bi bi-file-earmark-arrow-up-fill"></i></div>
                 <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Unggah Berkas Baru</h4>
              </div>
              <div className="space-y-4">
                 <div><label className={labelClass}>Nama / Judul Berkas</label><input type="text" className={inputClass} value={dossierFormData.fileName || ''} onChange={e => setDossierFormData({...dossierFormData, fileName: e.target.value})} placeholder="Misal: SK Pangkat 2024" /></div>
                 <div><label className={labelClass}>Tanggal Terbit</label><input type="date" className={inputClass} value={dossierFormData.tanggal || ''} onChange={e => setDossierFormData({...dossierFormData, tanggal: e.target.value})} /></div>
                 <div className={`p-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-3 transition-all ${dossierFormData.fileUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50/50 border-blue-200'}`}>
                    <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                       {uploading ? <div className="h-8 w-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div> : <i className={`bi ${dossierFormData.fileUrl ? 'bi-check-circle-fill text-emerald-600 text-3xl' : 'bi-cloud-upload-fill text-blue-600 text-2xl'}`}></i>}
                    </div>
                    <button type="button" onClick={() => dossierFileInputRef.current?.click()} disabled={uploading} className="px-8 py-3 bg-white border border-blue-100 text-blue-600 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">
                       {dossierFormData.fileUrl ? 'Ganti Berkas' : 'Pilih Berkas'}
                    </button>
                    <input type="file" ref={dossierFileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleUploadDossierFile} />
                 </div>
                 <div><label className={labelClass}>Keterangan (Opsional)</label><textarea rows={2} className={`${inputClass} h-20 resize-none normal-case font-bold`} value={dossierFormData.keterangan || ''} onChange={e => setDossierFormData({...dossierFormData, keterangan: e.target.value})} /></div>
              </div>
              <div className="flex gap-3 pt-4 shrink-0">
                 <button onClick={() => setIsAddDossierOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95">Batal</button>
                 <button onClick={handleSaveDossier} disabled={syncing || uploading || !dossierFormData.fileUrl} className="flex-[1.5] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl active:scale-95 disabled:bg-gray-300 flex items-center justify-center gap-2">
                    {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Simpan Berkas</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* FORM REGISTRASI / EDIT PEGAWAI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && !uploading && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-[90vh]">
              <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center shrink-0">
                 <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">{formData.id ? 'Perbarui Data Pegawai' : 'Registrasi Pegawai Baru'}</h4>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
              </div>
              <form onSubmit={handleSave} className="p-10 overflow-y-auto custom-scrollbar space-y-12">
                 <section className="space-y-6">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">A. Identitas Pokok & Foto</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                       <div className="space-y-6">
                          <div><label className={labelClass}>NIP (18 Digit)</label><input type="text" maxLength={18} className={inputClass} value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value.replace(/\D/g, '')})} required /></div>
                          <div><label className={labelClass}>Nama Lengkap (Tanpa Gelar)</label><input type="text" className={inputClass} value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} required /></div>
                          <div><label className={labelClass}>Gelar Akademik</label><input type="text" className={inputClass} value={formData.gelar || ''} onChange={e => setFormData({...formData, gelar: e.target.value})} /></div>
                       </div>
                       <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center">
                          <div className="h-32 w-32 bg-white rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden mb-4 relative group">
                             {formData.foto ? <img src={formData.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-blue-600 text-3xl font-black">?</div>}
                             {uploading && <div className="absolute inset-0 bg-blue-600/80 flex items-center justify-center text-white"><div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div></div>}
                          </div>
                          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg flex items-center gap-2">
                             <i className="bi bi-camera-fill"></i> Unggah Foto
                          </button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadPhoto} />
                       </div>
                    </div>
                 </section>

                 <section className="space-y-6">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">B. Jabatan & Penempatan</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div><label className={labelClass}>Nomenklatur Jabatan</label><input type="text" className={inputClass} value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} /></div>
                       <div><label className={labelClass}>Unit Kerja Utama</label><select className={inputClass} value={formData.unitKerja || UNIT_KERJA[0]} onChange={e => setFormData({...formData, unitKerja: e.target.value})}>{UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}</select></div>
                       <div><label className={labelClass}>TMT Jabatan</label><input type="date" className={inputClass} value={formData.tmtJabatan || ''} onChange={e => setFormData({...formData, tmtJabatan: e.target.value})} /></div>
                       <div><label className={labelClass}>Eselon / Level</label><input type="text" className={inputClass} value={formData.eselon || ''} onChange={e => setFormData({...formData, eselon: e.target.value})} /></div>
                       <div><label className={labelClass}>Bagian / Tim Kerja</label><input type="text" className={inputClass} value={formData.bagian || ''} onChange={e => setFormData({...formData, bagian: e.target.value})} /></div>
                       <div><label className={labelClass}>Sub Bagian / Sub Tim</label><input type="text" className={inputClass} value={formData.subBagian || ''} onChange={e => setFormData({...formData, subBagian: e.target.value})} /></div>
                       <div className="col-span-full"><label className={labelClass}>Klasifikasi Jabatan</label><input type="text" className={inputClass} value={formData.klasifikasiJabatan || ''} onChange={e => setFormData({...formData, klasifikasiJabatan: e.target.value})} /></div>
                    </div>
                 </section>

                 <section className="space-y-6">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">C. Pangkat & Golongan</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div><label className={labelClass}>Golongan Ruang</label><select className={inputClass} value={formData.golRuang || 'III/a'} onChange={e => setFormData({...formData, golRuang: e.target.value, pangkat: PANGKAT_MAP[e.target.value]})}>{Object.keys(PANGKAT_MAP).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                       <div><label className={labelClass}>TMT Pangkat</label><input type="date" className={inputClass} value={formData.tmtPangkat || ''} onChange={e => setFormData({...formData, tmtPangkat: e.target.value})} /></div>
                       <div><label className={labelClass}>Masa Kerja</label><input type="text" className={inputClass} value={formData.masaKerja || ''} onChange={e => setFormData({...formData, masaKerja: e.target.value})} /></div>
                       <div><label className={labelClass}>Jenis Pegawai</label><input type="text" className={inputClass} value={formData.jenisPegawai || ''} onChange={e => setFormData({...formData, jenisPegawai: e.target.value})} placeholder="Mis: PNS / PPPK / CPNS" /></div>
                       <div><label className={labelClass}>TMT Status</label><input type="date" className={inputClass} value={formData.tmtStatus || ''} onChange={e => setFormData({...formData, tmtStatus: e.target.value})} /></div>
                       <div><label className={labelClass}>Status Pegawai</label><select className={inputClass} value={formData.status || 'Aktif'} onChange={e => setFormData({...formData, status: e.target.value})}><option>Aktif</option><option>Pensiun</option><option>Tidak Aktif</option></select></div>
                    </div>
                 </section>

                 <section className="space-y-6">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">D. Biodata Tambahan & Kontak</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div><label className={labelClass}>Tempat Lahir</label><input type="text" className={inputClass} value={formData.tempatLahir || ''} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} /></div>
                       <div><label className={labelClass}>Tanggal Lahir</label><input type="date" className={inputClass} value={formData.tanggalLahir || ''} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} /></div>
                       <div><label className={labelClass}>Agama</label><input type="text" className={inputClass} value={formData.agama || ''} onChange={e => setFormData({...formData, agama: e.target.value})} /></div>
                       <div><label className={labelClass}>NIK</label><input type="text" className={inputClass} value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value})} /></div>
                       <div><label className={labelClass}>Nomor Telepon / HP</label><input type="text" className={inputClass} value={formData.telepon || ''} onChange={e => setFormData({...formData, telepon: e.target.value})} /></div>
                       <div><label className={labelClass}>Pendidikan Terakhir</label><input type="text" className={inputClass} value={formData.pendidikan || ''} onChange={e => setFormData({...formData, pendidikan: e.target.value})} /></div>
                       <div className="col-span-full"><label className={labelClass}>Jurusan</label><input type="text" className={inputClass} value={formData.jurusan || ''} onChange={e => setFormData({...formData, jurusan: e.target.value})} /></div>
                    </div>
                    <div><label className={labelClass}>Alamat Lengkap</label><textarea rows={3} className={`${inputClass} normal-case h-24 resize-none font-bold`} value={formData.alamat || ''} onChange={e => setFormData({...formData, alamat: e.target.value})} /></div>
                 </section>
              </form>
              <div className="p-8 bg-gray-50 border-t flex justify-center gap-4 shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-14 py-5 bg-white border border-gray-200 text-gray-400 rounded-[2rem] font-black text-[10px] uppercase shadow-sm active:scale-95 transition-all">Batal</button>
                 <button onClick={handleSave} disabled={syncing || uploading} className="px-24 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center gap-4">
                    {(syncing || uploading) && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Simpan Perubahan</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* HIDDEN DRH TEMPLATE A4 FOR PRINTING */}
      <div className="fixed -left-[4000px] top-0 pointer-events-none">
         <div ref={drhRef} className="bg-white text-black font-arial p-[1.5cm_1.5cm]" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="flex items-center border-b-[2pt] border-black pb-4 mb-8">
               <img src={DEFAULT_LOGO} className="h-20 w-auto mr-6" crossOrigin="anonymous" style={{ filter: 'grayscale(100%)' }} />
               <div className="flex-1 text-center">
                  <p className="text-[11pt] font-bold uppercase">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                  <p className="text-[13pt] font-bold uppercase">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                  <p className="text-[14pt] font-bold uppercase mt-4 underline">DAFTAR RIWAYAT HIDUP PEGAWAI</p>
               </div>
            </div>
            <div className="flex justify-between items-start mb-8 relative">
               <div className="space-y-4 text-[10.5pt] flex-1 text-black">
                  <p className="font-bold border-b border-black pb-1 mb-2 uppercase">I. DATA PERORANGAN</p>
                  <div className="grid grid-cols-[160px_10px_1fr] gap-y-3">
                     <span>NAMA LENGKAP</span><span>:</span><span className="font-bold uppercase">{selectedPegawai?.nama}</span>
                     <span>NIP</span><span>:</span><span>{selectedPegawai?.nip}</span>
                     <span>NIK</span><span>:</span><span>{selectedPegawai?.nik}</span>
                     <span>TEMPAT/TGL LAHIR</span><span>:</span><span>{selectedPegawai?.tempatLahir}, {selectedPegawai?.tanggalLahir}</span>
                     <span>JENIS KELAMIN</span><span>:</span><span>{selectedPegawai?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                     <span>AGAMA</span><span>:</span><span>{selectedPegawai?.agama}</span>
                     <span>JABATAN</span><span>:</span><span className="uppercase">{selectedPegawai?.jabatan}</span>
                     <span>UNIT KERJA</span><span>:</span><span className="uppercase">{selectedPegawai?.unitKerja}</span>
                     <span>PENDIDIKAN</span><span>:</span><span className="uppercase">{selectedPegawai?.pendidikan} {selectedPegawai?.jurusan}</span>
                     <span>ALAMAT</span><span>:</span><span className="uppercase">{selectedPegawai?.alamat}</span>
                  </div>
               </div>
               <div className="h-40 w-30 border-4 border-black bg-gray-50 flex-shrink-0 flex items-center justify-center ml-10 overflow-hidden shadow-md">
                  {selectedPegawai?.foto ? <img src={selectedPegawai.foto} className="w-full h-full object-cover" crossOrigin="anonymous" /> : <p className="text-[8pt] text-gray-400 font-bold text-center p-2">PAS FOTO</p>}
               </div>
            </div>
            <div className="mt-12 ml-[55%] text-center text-[11pt] text-black">
               <p>Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
               <p className="mb-24 mt-2">Pegawai Bersangkutan,</p>
               <p className="font-bold uppercase underline leading-none">{selectedPegawai?.nama}</p>
               <p className="mt-2 font-bold">NIP {selectedPegawai?.nip}</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default PegawaiPage;
