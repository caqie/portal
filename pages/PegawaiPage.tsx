import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Pegawai, Dossier } from '../types';
import { fetchPegawaiFromSheets, syncTableRemote, fetchDossiersFromSheets, uploadFileToDrive } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { normalizeUnitName, UNIT_KERJA, PANGKAT_MAP, DEFAULT_LOGO } from '../constants';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
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
  const [filterJenis, setFilterJenis] = useState('Semua Jenis');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'DATA_DIRI' | 'E_ARSIP'>('DATA_DIRI');
  
  const [isAddDossierOpen, setIsAddDossierOpen] = useState(false);
  const [dossierFormData, setDossierFormData] = useState<Partial<Dossier>>({ fileName: '', keterangan: '' });
  
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

  const formatDateForInput = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const cleanDate = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return cleanDate;
    const parts = cleanDate.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length <= 2 && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    try {
      const d = new Date(cleanDate);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    return '';
  };

  const handleEditPegawai = (p: Pegawai) => {
    setSelectedPegawai(p);
    setFormData({
      ...p,
      tmtPangkat: formatDateForInput(p.tmtPangkat),
      tmtJabatan: formatDateForInput(p.tmtJabatan),
      tmtStatus: formatDateForInput(p.tmtStatus),
      tanggalLahir: formatDateForInput(p.tanggalLahir)
    });
    setIsModalOpen(true);
    setIsDetailOpen(false);
  };

  const filteredPegawai = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return pegawaiList.filter(p => {
      const searchStr = [p.nama, p.nip, p.nik, p.jabatan, p.unitKerja, p.pendidikan, p.jurusan, p.status, p.alamat].map(v => String(v || '').toLowerCase()).join(' ');
      const match = searchStr.includes(term);
      const unitMatch = filterUnit === 'Semua Unit' || normalizeUnitName(p.unitKerja) === filterUnit;
      const jenisMatch = filterJenis === 'Semua Jenis' || (p.jenisPegawai || '').toUpperCase() === filterJenis.toUpperCase();
      return match && unitMatch && jenisMatch;
    });
  }, [pegawaiList, searchTerm, filterUnit, filterJenis]);

  const filteredDossiers = useMemo(() => {
    if (!selectedPegawai) return [];
    return dossierList.filter(d => d.nip === selectedPegawai.nip);
  }, [dossierList, selectedPegawai]);

  const handleExportExcel = (type: 'SHARE' | 'FULL') => {
    const wb = XLSX.utils.book_new();
    let data;
    if (type === 'SHARE') {
      data = filteredPegawai.map(p => ({
        'NIP': p.nip, 'NAMA PEGAWAI': p.nama, 'JABATAN': p.jabatan, 'UNIT KERJA': p.unitKerja,
        'PANGKAT': p.pangkat || '-', 'GOLONGAN': p.golRuang || '-', 'JENIS PEGAWAI': p.jenisPegawai
      }));
    } else {
      data = filteredPegawai.map(p => ({ ...p }));
    }
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Pegawai");
    XLSX.writeFile(wb, `Data_Pegawai_DJKI_${type}_${Date.now()}.xlsx`);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`FOTO_${formData.nip || 'NEW'}_${Date.now()}`, file.type, base64);
      if (res.success && res.fileUrl) setFormData(prev => ({ ...prev, foto: res.fileUrl }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPegawai || !dossierFormData.fileName) return;
    
    const file = dossierFileInputRef.current?.files?.[0];
    if (!file) return alert("Silakan pilih file berkas terlebih dahulu.");

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`DOSSIER_${selectedPegawai.nip}_${Date.now()}`, file.type, base64);
      
      if (res.success && res.fileUrl) {
        const payload: Dossier = {
          id: `DOS-${Date.now()}`,
          nip: selectedPegawai.nip,
          namaPegawai: selectedPegawai.nama,
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          keterangan: dossierFormData.keterangan || '-',
          fileName: dossierFormData.fileName!,
          fileUrl: res.fileUrl
        };
        
        const ok = await syncTableRemote('DOSSIER', 'SAVE', payload);
        if (ok) {
          setSuccessMsg(`Berkas "${payload.fileName}" berhasil ditambahkan ke E-Dossier.`);
          await loadData();
          setIsAddDossierOpen(false);
          setDossierFormData({ fileName: '', keterangan: '' });
          setShowSuccess(true);
        }
      } else {
        alert("Gagal mengunggah file ke Drive.");
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
      setSuccessMsg(`Data ${formData.nama} berhasil disinkronkan ke database cloud.`);
      await loadData();
      setIsModalOpen(false);
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const handleCetakDRH = async () => {
    if (!drhRef.current) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(drhRef.current, { 
        scale: 3, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
      pdf.save(`DRH_${selectedPegawai?.nama.replace(/\s+/g, '_')}.pdf`);
      logActivity('DOWNLOAD', 'Pegawai', `Cetak DRH Pegawai: ${selectedPegawai?.nama}`);
    } catch (e) { 
      console.error(e);
      alert("Gagal cetak PDF."); 
    } finally { 
      setSyncing(false); 
    }
  };

  const inputClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950";
  const inputNoCapsClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";
  const detailLabel = "text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1.5";
  const detailValue = "text-[13px] font-black uppercase text-gray-900 leading-tight";
  const detailValueNoCaps = "text-[13px] font-black text-gray-900 leading-tight";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => !syncing && setIsConfirmOpen(false)} onConfirm={async () => {
           if(pegawaiToDelete) {
             setSyncing(true);
             await syncTableRemote('PEGAWAI', 'DELETE', { nip: pegawaiToDelete.nip });
             setPegawaiList(prev => prev.filter(p => p.nip !== pegawaiToDelete.nip));
             setIsConfirmOpen(false);
             setSyncing(false);
           }
        }} loading={syncing} message={`Hapus data pegawai "${pegawaiToDelete?.nama}" secara permanen?`} />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h3 className="text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Database ASN DJKI</h3>
            <span className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-600/20">{filteredPegawai.length} Pegawai</span>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2"><i className="bi bi-shield-check text-blue-600"></i> Terintegrasi dengan Cloud Google Spreadsheet</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={() => handleExportExcel('SHARE')} className="h-14 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"><i className="bi bi-file-earmark-spreadsheet-fill text-lg"></i> Excel Share</button>
           {canEdit && (<button onClick={() => handleExportExcel('FULL')} className="h-14 px-6 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2"><i className="bi bi-database-fill-down text-lg"></i> Excel Full (Raw)</button>)}
           {canEdit && (<button onClick={() => { setSelectedPegawai(null); setFormData({status: 'Aktif', jenisPegawai: 'PNS', gender: 'L', unitKerja: UNIT_KERJA[0]}); setIsModalOpen(true); }} className="h-14 px-10 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">+ Registrasi Pegawai</button>)}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <i className="bi bi-search absolute left-6 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input type="text" placeholder="Pencarian Cepat: Nama, NIP, atau NIK..." className="w-full pl-14 pr-8 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-xs font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <select className="px-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
              <option>Semua Unit</option>
              {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase().substring(0, 30)}...</option>)}
          </select>
          <select className="px-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterJenis} onChange={e => setFilterJenis(e.target.value)}>
              <option>Semua Jenis</option>
              <option value="PNS">PNS</option>
              <option value="CPNS">CPNS</option>
              <option value="PPPK">PPPK</option>
              <option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option>
          </select>
        </div>
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
                    <h4 className="text-[13px] font-black text-gray-950 truncate leading-tight">{p.nama}</h4>
                    <p className="text-[9px] font-mono text-gray-400 mt-1">NIP. {p.nip}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                       <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[7px] font-black rounded border border-blue-100 uppercase">{p.golRuang}</span>
                       <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[7px] font-black rounded border border-gray-200 uppercase">{p.jenisPegawai}</span>
                    </div>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {isDetailOpen && selectedPegawai && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center p-4 pt-[140px] pb-10">
           <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-md" onClick={() => setIsDetailOpen(false)}></div>
           <div className="relative bg-white w-full max-w-7xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-full border border-white/20">
              
              <div className="bg-white border-b flex justify-between items-center px-6 md:px-10 shrink-0 z-50 relative">
                 <div className="flex">
                    <button onClick={() => setDetailTab('DATA_DIRI')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${detailTab === 'DATA_DIRI' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>Profil Komprehensif</button>
                    <button onClick={() => setDetailTab('E_ARSIP')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${detailTab === 'E_ARSIP' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>Digital Dossier ({filteredDossiers.length})</button>
                 </div>
                 <button onClick={() => setIsDetailOpen(false)} className="h-12 w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-gray-50 rounded-2xl shadow-inner transition-all hover:bg-white hover:shadow-md active:scale-95 border border-gray-100">
                    <i className="bi bi-x-lg text-xl"></i>
                 </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 <div className="md:w-[350px] bg-gray-50/50 border-r p-8 flex flex-col items-center shrink-0 overflow-y-auto custom-scrollbar">
                    <div className="h-44 w-44 rounded-[3rem] bg-white border-8 border-white shadow-2xl overflow-hidden mb-6 group relative">
                       {selectedPegawai.foto ? <img src={selectedPegawai.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-6xl font-black text-blue-600 bg-blue-50">{selectedPegawai.nama.charAt(0)}</div>}
                    </div>
                    <div className="text-center space-y-2 mb-8 w-full">
                       <h4 className="text-lg font-black text-gray-950 leading-tight px-4">{selectedPegawai.nama}{selectedPegawai.gelar ? `, ${selectedPegawai.gelar}` : ''}</h4>
                       <p className="text-[10px] font-mono font-black text-blue-600 tracking-widest">NIP. {selectedPegawai.nip}</p>
                       <div className="flex justify-center gap-2 mt-4">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black border border-emerald-100 uppercase">{selectedPegawai.status}</span>
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black border border-blue-100 uppercase">{selectedPegawai.jenisPegawai}</span>
                       </div>
                    </div>
                    <div className="w-full space-y-3 pb-6">
                       <button onClick={handleCetakDRH} disabled={syncing} className="w-full py-4 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                          {syncing ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-file-earmark-pdf-fill"></i>}
                          Cetak DRH
                       </button>
                       {canEdit && (
                         <button onClick={() => handleEditPegawai(selectedPegawai)} className="w-full py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-3">
                            <i className="bi bi-pencil-square"></i> Edit Data
                         </button>
                       )}
                    </div>
                 </div>

                 <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar bg-white">
                    {detailTab === 'DATA_DIRI' ? (
                       <div className="animate-fadeIn space-y-12">
                          <div className="space-y-6">
                             <div className="flex items-center gap-4">
                                <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-lg"><i className="bi bi-briefcase-fill"></i></div>
                                <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Jabatan & Struktur</h5>
                             </div>
                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100">
                                <div className="col-span-2"><p className={detailLabel}>Jabatan</p><p className={detailValue}>{selectedPegawai.jabatan || '-'}</p></div>
                                <div><p className={detailLabel}>TMT Jabatan</p><p className={detailValue}>{selectedPegawai.tmtJabatan || '-'}</p></div>
                                <div><p className={detailLabel}>Eselon</p><p className={detailValue}>{selectedPegawai.eselon || '-'}</p></div>
                                <div className="col-span-2"><p className={detailLabel}>Unit Kerja</p><p className={detailValue}>{selectedPegawai.unitKerja || '-'}</p></div>
                                <div><p className={detailLabel}>Bagian</p><p className={detailValue}>{selectedPegawai.bagian || '-'}</p></div>
                                <div><p className={detailLabel}>Sub Bagian</p><p className={detailValue}>{selectedPegawai.subBagian || '-'}</p></div>
                             </div>
                          </div>

                          <div className="space-y-6">
                             <div className="flex items-center gap-4">
                                <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-lg"><i className="bi bi-award-fill"></i></div>
                                <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Pangkat & Golongan</h5>
                             </div>
                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-emerald-50/10 p-8 rounded-[2.5rem] border border-emerald-50">
                                <div><p className={detailLabel}>Pangkat</p><p className={detailValue}>{selectedPegawai.pangkat}</p></div>
                                <div><p className={detailLabel}>Golongan</p><p className={detailValue}>{selectedPegawai.golRuang}</p></div>
                                <div><p className={detailLabel}>TMT Pangkat</p><p className={detailValue}>{selectedPegawai.tmtPangkat || '-'}</p></div>
                                <div><p className={detailLabel}>Masa Kerja</p><p className={detailValue}>{selectedPegawai.masaKerja || '-'}</p></div>
                             </div>
                          </div>

                          <div className="space-y-6">
                             <div className="flex items-center gap-4">
                                <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-lg"><i className="bi bi-person-lines-fill"></i></div>
                                <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Identitas Personal</h5>
                             </div>
                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-amber-50/5 p-8 rounded-[2.5rem] border border-amber-50">
                                <div className="col-span-2"><p className={detailLabel}>NIK</p><p className={detailValue}>{selectedPegawai.nik || '-'}</p></div>
                                <div><p className={detailLabel}>Agama</p><p className={detailValue}>{selectedPegawai.agama || '-'}</p></div>
                                <div><p className={detailLabel}>Gender</p><p className={detailValue}>{selectedPegawai.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</p></div>
                                <div className="col-span-2"><p className={detailLabel}>Tgl Lahir</p><p className={detailValue}>{selectedPegawai.tempatLahir || '-'}, {selectedPegawai.tanggalLahir || '-'}</p></div>
                                <div className="col-span-2"><p className={detailLabel}>Pendidikan / Jurusan</p><p className={detailValue}>{selectedPegawai.pendidikan} - {selectedPegawai.jurusan}</p></div>
                                <div><p className={detailLabel}>Nomor HP</p><p className={detailValue}>{selectedPegawai.noHp || '-'}</p></div>
                                <div className="col-span-full"><p className={detailLabel}>Alamat Domisili</p><p className={detailValueNoCaps}>{selectedPegawai.alamat || '-'}</p></div>
                             </div>
                          </div>

                          <div className="space-y-6">
                             <div className="flex items-center gap-4">
                                <div className="h-8 w-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center text-lg"><i className="bi bi-credit-card-2-front-fill"></i></div>
                                <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Atribut Administrasi Lainnya</h5>
                             </div>
                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-rose-50/5 p-8 rounded-[2.5rem] border border-rose-50">
                                <div className="col-span-2"><p className={detailLabel}>Email Resmi / Personal</p><p className={detailValueNoCaps}>{selectedPegawai.email || '-'}</p></div>
                                <div><p className={detailLabel}>Nomor NPWP</p><p className={detailValue}>{selectedPegawai.npwp || '-'}</p></div>
                                <div><p className={detailLabel}>Nomor BPJS</p><p className={detailValue}>{selectedPegawai.noBpjs || '-'}</p></div>
                                <div><p className={detailLabel}>No. Karis/Karsu</p><p className={detailValue}>{selectedPegawai.noKarisKarsu || '-'}</p></div>
                                <div><p className={detailLabel}>TMT Status Aktif</p><p className={detailValue}>{selectedPegawai.tmtStatus || '-'}</p></div>
                             </div>
                          </div>
                       </div>
                    ) : (
                       <div className="animate-fadeIn space-y-8">
                          {canEdit && (
                            <div className="flex justify-end">
                               <button 
                                 onClick={() => setIsAddDossierOpen(true)}
                                 className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
                               >
                                  <i className="bi bi-cloud-arrow-up-fill text-lg"></i>
                                  + Tambah Berkas Baru
                               </button>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {filteredDossiers.map(d => (
                               <div key={d.id} onClick={() => d.fileUrl && window.open(d.fileUrl, '_blank')} className="p-6 bg-gray-50 border border-gray-100 rounded-[2.5rem] hover:bg-white hover:border-blue-300 transition-all cursor-pointer group flex items-center gap-5">
                                  <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 text-3xl shadow-sm"><i className="bi bi-file-earmark-pdf-fill"></i></div>
                                  <div className="min-w-0 flex-1">
                                     <p className="text-[11px] font-black uppercase truncate text-gray-950">{d.fileName}</p>
                                     <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">{d.tanggal}</p>
                                  </div>
                               </div>
                             ))}
                             {filteredDossiers.length === 0 && (
                               <div className="col-span-full py-20 text-center opacity-30">
                                  <i className="bi bi-folder-x text-5xl mb-4 block"></i>
                                  <p className="text-[10px] font-black uppercase tracking-widest">Belum ada dokumen terunggah</p>
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

      {isAddDossierOpen && selectedPegawai && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm" onClick={() => !uploading && setIsAddDossierOpen(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter border border-white/20">
              <div className="p-8 border-b bg-gray-50 flex justify-between items-center shrink-0">
                 <div>
                    <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Tambah Berkas Digital</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Upload to Personnel Dossier</p>
                 </div>
                 <button onClick={() => setIsAddDossierOpen(false)} className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all">
                    <i className="bi bi-x-lg text-lg"></i>
                 </button>
              </div>
              <form onSubmit={handleSaveDossier} className="p-10 space-y-6">
                 <div>
                    <label className={labelClass}>Nama Berkas / Jenis Dokumen</label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      placeholder="Contoh: SK Kenaikan Pangkat 2024"
                      value={dossierFormData.fileName}
                      onChange={e => setDossierFormData({...dossierFormData, fileName: e.target.value})}
                      required 
                    />
                 </div>
                 <div>
                    <label className={labelClass}>Keterangan Tambahan</label>
                    <textarea 
                      className={`${inputNoCapsClass} h-24 resize-none`}
                      placeholder="Catatan opsional..."
                      value={dossierFormData.keterangan}
                      onChange={e => setDossierFormData({...dossierFormData, keterangan: e.target.value})}
                    />
                 </div>
                 <div className="p-8 bg-blue-50 border-2 border-dashed border-blue-200 rounded-[2rem] flex flex-col items-center gap-4">
                    <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-xl">
                       <i className="bi bi-cloud-arrow-up text-3xl"></i>
                    </div>
                    <div className="text-center">
                       <p className="text-[10px] font-black uppercase text-gray-950">Pilih File Berkas</p>
                       <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">PDF atau Gambar (Maks 10MB)</p>
                    </div>
                    <button type="button" onClick={() => dossierFileInputRef.current?.click()} className="px-6 py-2 bg-white border border-gray-100 text-blue-600 rounded-xl text-[9px] font-black uppercase shadow-sm">Pilih File</button>
                    <input type="file" ref={dossierFileInputRef} className="hidden" accept=".pdf,image/*" />
                 </div>
                 <div className="pt-6 border-t flex gap-3">
                    <button type="button" onClick={() => setIsAddDossierOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[10px] uppercase">Batal</button>
                    <button type="submit" disabled={uploading} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                       {uploading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                       <span>Unggah & Simpan Berkas</span>
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center p-4 pt-[140px] pb-10">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && !uploading && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-full border border-white/20">
              
              <div className="p-6 md:p-8 border-b bg-gray-50 shrink-0 flex justify-between items-center relative z-50">
                 <div>
                    <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">{formData.id ? 'Perbarui Data Lengkap' : 'Registrasi Pegawai Baru'}</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Personnel Record Management</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="h-12 w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95">
                    <i className="bi bi-x-lg text-xl"></i>
                 </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar space-y-12 bg-white">
                 <section className="space-y-6">
                    <div className="flex items-center gap-4"><div className="h-8 w-2 bg-blue-600 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">A. Identitas Pokok</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                       <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div><label className={labelClass}>NIP (18 Digit)</label><input type="text" maxLength={18} className={inputClass} value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value.replace(/\D/g, '')})} required /></div>
                          <div><label className={labelClass}>Nomor NIK KTP</label><input type="text" className={inputClass} value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value})} /></div>
                          <div className="col-span-full"><label className={labelClass}>Nama Lengkap (Tanpa Gelar)</label><input type="text" className={inputNoCapsClass} value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} required /></div>
                          <div><label className={labelClass}>Gelar (Opsional)</label><input type="text" className={inputNoCapsClass} value={formData.gelar || ''} onChange={e => setFormData({...formData, gelar: e.target.value})} /></div>
                          <div><label className={labelClass}>Agama</label><input type="text" className={inputClass} value={formData.agama || ''} onChange={e => setFormData({...formData, agama: e.target.value})} /></div>
                          <div><label className={labelClass}>Jenis Kelamin</label><select className={inputClass} value={formData.gender || 'L'} onChange={e => setFormData({...formData, gender: e.target.value as any})}><option value="L">LAKI-LAKI</option><option value="P">PEREMPUAN</option></select></div>
                          <div><label className={labelClass}>Tempat Lahir</label><input type="text" className={inputClass} value={formData.tempatLahir || ''} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} /></div>
                          <div><label className={labelClass}>Tanggal Lahir</label><input type="date" className={inputNoCapsClass} value={formData.tanggalLahir || ''} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} /></div>
                       </div>
                       <div className="md:col-span-4 bg-gray-50 p-8 rounded-[3rem] border border-gray-100 flex flex-col items-center text-center">
                          <div className="h-44 w-44 bg-white rounded-[3rem] border-4 border-white shadow-xl overflow-hidden mb-6 relative group">
                             {formData.foto ? <img src={formData.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-blue-600 text-4xl font-black bg-blue-50/50">?</div>}
                             {uploading && <div className="absolute inset-0 bg-blue-600/80 flex items-center justify-center text-white"><div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div></div>}
                          </div>
                          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">Ganti Foto Profil</button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadPhoto} />
                       </div>
                    </div>
                 </section>

                 <section className="space-y-6">
                    <div className="flex items-center gap-4"><div className="h-8 w-2 bg-indigo-600 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">B. Jabatan & Penempatan</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div className="md:col-span-3"><label className={labelClass}>Nama Jabatan</label><input type="text" className={inputClass} value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} /></div>
                       <div><label className={labelClass}>TMT Jabatan</label><input type="date" className={inputNoCapsClass} value={formData.tmtJabatan || ''} onChange={e => setFormData({...formData, tmtJabatan: e.target.value})} /></div>
                       <div><label className={labelClass}>Eselon (Jika Ada)</label><select className={inputClass} value={formData.eselon || '-'} onChange={e => setFormData({...formData, eselon: e.target.value})}><option value="-">-</option><option value="I.a">I.a</option><option value="I.b">I.b</option><option value="II.a">II.a</option><option value="II.b">II.b</option><option value="III.a">III.a</option><option value="IV.a">IV.a</option></select></div>
                       <div className="md:col-span-3"><label className={labelClass}>Unit Kerja Utama</label><select className={inputClass} value={formData.unitKerja || UNIT_KERJA[0]} onChange={e => setFormData({...formData, unitKerja: e.target.value})}>{UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}</select></div>
                       <div className="md:col-span-2"><label className={labelClass}>Nama Bagian</label><input type="text" className={inputClass} value={formData.bagian || ''} onChange={e => setFormData({...formData, bagian: e.target.value})} /></div>
                       <div className="md:col-span-2"><label className={labelClass}>Nama Sub Bagian / Tim</label><input type="text" className={inputClass} value={formData.subBagian || ''} onChange={e => setFormData({...formData, subBagian: e.target.value})} /></div>
                    </div>
                 </section>

                 <section className="space-y-6">
                    <div className="flex items-center gap-4"><div className="h-8 w-2 bg-emerald-600 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">C. Pangkat & Masa Kerja</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div><label className={labelClass}>Golongan / Ruang</label><select className={inputClass} value={formData.golRuang || 'III/a'} onChange={e => setFormData({...formData, golRuang: e.target.value, pangkat: PANGKAT_MAP[e.target.value] || ''})}>{Object.keys(PANGKAT_MAP).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                       <div className="md:col-span-2"><label className={labelClass}>Pangkat</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.pangkat || '-'} /></div>
                       <div><label className={labelClass}>TMT Pangkat</label><input type="date" className={inputNoCapsClass} value={formData.tmtPangkat || ''} onChange={e => setFormData({...formData, tmtPangkat: e.target.value})} /></div>
                       <div><label className={labelClass}>Jenis Pegawai</label><select className={inputClass} value={formData.jenisPegawai || 'PNS'} onChange={e => setFormData({...formData, jenisPegawai: e.target.value})}><option value="PNS">PNS</option><option value="CPNS">CPNS</option><option value="PPPK">PPPK</option><option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option></select></div>
                       <div><label className={labelClass}>Status Aktif</label><select className={inputClass} value={formData.status || 'Aktif'} onChange={e => setFormData({...formData, status: e.target.value})}><option value="Aktif">AKTIF</option><option value="Tidak Aktif">TIDAK AKTIF</option><option value="Pensiun">PENSIUN</option><option value="Tugas Belajar">TUGAS BELAJAR</option></select></div>
                       <div><label className={labelClass}>TMT Status</label><input type="date" className={inputNoCapsClass} value={formData.tmtStatus || ''} onChange={e => setFormData({...formData, tmtStatus: e.target.value})} /></div>
                       <div><label className={labelClass}>Masa Kerja (Thn Bln)</label><input type="text" className={inputClass} value={formData.masaKerja || ''} onChange={e => setFormData({...formData, masaKerja: e.target.value})} placeholder="exp: 10 THN 2 BLN" /></div>
                    </div>
                 </section>

                 <section className="space-y-6 pb-10">
                    <div className="flex items-center gap-4"><div className="h-8 w-2 bg-amber-500 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">D. Kontak & Dokumen Identitas</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div><label className={labelClass}>Nomor HP / WhatsApp</label><input type="text" className={inputClass} value={formData.noHp || ''} onChange={e => setFormData({...formData, noHp: e.target.value})} /></div>
                       <div className="md:col-span-2"><label className={labelClass}>Email Personal / Dinas</label><input type="email" className={inputNoCapsClass} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                       <div><label className={labelClass}>Nomor NPWP</label><input type="text" className={inputClass} value={formData.npwp || ''} onChange={e => setFormData({...formData, npwp: e.target.value})} /></div>
                       <div><label className={labelClass}>Nomor BPJS Kesehatan</label><input type="text" className={inputClass} value={formData.noBpjs || ''} onChange={e => setFormData({...formData, noBpjs: e.target.value})} /></div>
                       <div><label className={labelClass}>No. Karis / Karsu</label><input type="text" className={inputClass} value={formData.noKarisKarsu || ''} onChange={e => setFormData({...formData, noKarisKarsu: e.target.value})} /></div>
                       <div className="md:col-span-3"><label className={labelClass}>Alamat Lengkap Domisili</label><textarea rows={3} className={`${inputNoCapsClass} h-24 resize-none`} value={formData.alamat || ''} onChange={e => setFormData({...formData, alamat: e.target.value})} placeholder="Masukkan alamat lengkap sesuai KTP/Domisili saat ini..." /></div>
                       <div><label className={labelClass}>Jenjang Pendidikan Terakhir</label><input type="text" className={inputClass} value={formData.pendidikan || ''} onChange={e => setFormData({...formData, pendidikan: e.target.value})} placeholder="exp: S1 / S2 / D3" /></div>
                       <div className="md:col-span-2"><label className={labelClass}>Program Studi / Jurusan</label><input type="text" className={inputClass} value={formData.jurusan || ''} onChange={e => setFormData({...formData, jurusan: e.target.value})} /></div>
                    </div>
                 </section>
              </form>

              <div className="p-6 md:p-8 bg-gray-50 border-t shrink-0 flex justify-center gap-4 relative z-50">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-12 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase shadow-sm">Batalkan</button>
                 <button onClick={handleSave} disabled={syncing || uploading} className="px-20 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center gap-4">
                    {(syncing || uploading) && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Simpan Perubahan Database</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* TEMPLATE DAFTAR RIWAYAT HIDUP (PRINT READY) */}
      <div className="fixed -left-[4000px] top-0 pointer-events-none">
         <div ref={drhRef} className="bg-white text-black font-arial p-[1.5cm_1.5cm] leading-tight" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* OFFICIAL HEADER */}
            <div className="flex flex-col items-center mb-8 border-b-2 border-black pb-4 text-center">
                <img src={LOGO_PENGAYOMAN_URL} className="h-20 mb-4 grayscale" crossOrigin="anonymous" />
                <p className="text-[12pt] font-bold uppercase leading-tight">KEMENTERIAN HUKUM</p>
                <p className="text-[12pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                <p className="text-[9pt] font-normal leading-tight mt-1">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
            </div>

            <div className="text-center mb-8">
               <h1 className="text-[13pt] font-bold uppercase underline leading-tight">DAFTAR RIWAYAT HIDUP</h1>
               <p className="text-[10pt] font-bold mt-1">PEGAWAI NEGERI SIPIL / PPPK</p>
            </div>

            <div className="space-y-6 text-[10pt] text-black">
               <section>
                  <p className="font-bold border-b border-black mb-3 uppercase bg-gray-50 px-2 py-1">I. DATA PRIBADI</p>
                  <table className="w-full border-collapse">
                     <tbody>
                        <tr><td className="w-[180px] py-1">1. Nama Lengkap</td><td className="w-4 py-1 text-center">:</td><td className="py-1 font-bold uppercase underline">{selectedPegawai?.nama}{selectedPegawai?.gelar ? `, ${selectedPegawai?.gelar}` : ''}</td></tr>
                        <tr><td className="py-1">2. NIP</td><td className="py-1 text-center">:</td><td className="py-1 font-bold">{selectedPegawai?.nip}</td></tr>
                        <tr><td className="py-1">3. NIK</td><td className="py-1 text-center">:</td><td className="py-1">{selectedPegawai?.nik || '-'}</td></tr>
                        <tr><td className="py-1">4. Tempat, Tgl Lahir</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{selectedPegawai?.tempatLahir || '-'}, {selectedPegawai?.tanggalLahir || '-'}</td></tr>
                        <tr><td className="py-1">5. Jenis Kelamin</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{selectedPegawai?.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</td></tr>
                        <tr><td className="py-1">6. Agama</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{selectedPegawai?.agama || '-'}</td></tr>
                        <tr><td className="py-1">7. Alamat Domisili</td><td className="py-1 text-center">:</td><td className="py-1 uppercase leading-tight">{selectedPegawai?.alamat || '-'}</td></tr>
                        <tr><td className="py-1">8. No. Telepon / HP</td><td className="py-1 text-center">:</td><td className="py-1">{selectedPegawai?.noHp || '-'}</td></tr>
                        <tr><td className="py-1">9. E-Mail</td><td className="py-1 text-center">:</td><td className="py-1 text-blue-800 lowercase">{selectedPegawai?.email || '-'}</td></tr>
                     </tbody>
                  </table>
               </section>

               <section>
                  <p className="font-bold border-b border-black mb-3 uppercase bg-gray-50 px-2 py-1">II. POSISI DAN KEPANGKATAN</p>
                  <table className="w-full border-collapse">
                     <tbody>
                        <tr><td className="w-[180px] py-1">1. Nama Jabatan</td><td className="w-4 py-1 text-center">:</td><td className="py-1 font-bold uppercase">{selectedPegawai?.jabatan || '-'}</td></tr>
                        <tr><td className="py-1">2. TMT Jabatan</td><td className="py-1 text-center">:</td><td className="py-1">{selectedPegawai?.tmtJabatan || '-'}</td></tr>
                        <tr><td className="py-1">3. Eselon</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{selectedPegawai?.eselon || '-'}</td></tr>
                        <tr><td className="py-1">4. Pangkat (Golongan)</td><td className="py-1 text-center">:</td><td className="py-1 uppercase font-bold">{selectedPegawai?.pangkat} ({selectedPegawai?.golRuang})</td></tr>
                        <tr><td className="py-1">5. TMT Pangkat</td><td className="py-1 text-center">:</td><td className="py-1">{selectedPegawai?.tmtPangkat || '-'}</td></tr>
                        <tr><td className="py-1">6. Masa Kerja Golongan</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{selectedPegawai?.masaKerja || '-'}</td></tr>
                        <tr><td className="py-1">7. Unit Kerja</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{selectedPegawai?.unitKerja}</td></tr>
                        <tr><td className="py-1">8. TMT CPNS / Kontrak</td><td className="py-1 text-center">:</td><td className="py-1">{selectedPegawai?.tmtStatus || '-'}</td></tr>
                     </tbody>
                  </table>
               </section>

               <section>
                  <p className="font-bold border-b border-black mb-3 uppercase bg-gray-50 px-2 py-1">III. RIWAYAT PENDIDIKAN</p>
                  <table className="w-full border-collapse">
                     <tbody>
                        <tr><td className="w-[180px] py-1">1. Jenjang Pendidikan</td><td className="w-4 py-1 text-center">:</td><td className="py-1 uppercase font-bold">{selectedPegawai?.pendidikan || '-'}</td></tr>
                        <tr><td className="py-1">2. Program Studi / Jurusan</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{selectedPegawai?.jurusan || '-'}</td></tr>
                     </tbody>
                  </table>
               </section>

               <section>
                  <p className="font-bold border-b border-black mb-3 uppercase bg-gray-50 px-2 py-1">IV. DATA ADMINISTRASI LAINNYA</p>
                  <table className="w-full border-collapse">
                     <tbody>
                        <tr><td className="w-[180px] py-1">1. Nomor NPWP</td><td className="w-4 py-1 text-center">:</td><td className="py-1">{selectedPegawai?.npwp || '-'}</td></tr>
                        <tr><td className="py-1">2. Nomor BPJS Kes.</td><td className="py-1 text-center">:</td><td className="py-1">{selectedPegawai?.noBpjs || '-'}</td></tr>
                        <tr><td className="py-1">3. No. Karis / Karsu</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{selectedPegawai?.noKarisKarsu || '-'}</td></tr>
                     </tbody>
                  </table>
               </section>
            </div>

            <div className="mt-14 flex justify-between items-start text-black">
               <div className="w-[3.5cm] h-[4.5cm] border-2 border-black flex flex-col items-center justify-center text-[7pt] italic text-gray-400 p-2 text-center ml-10">
                  {selectedPegawai?.foto ? (
                    <img src={selectedPegawai.foto} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <span>PAS FOTO 3X4<br/>TEMPEL DI SINI</span>
                  )}
               </div>
               
               <div className="text-center w-[250px] mr-10">
                  <p className="text-[10pt]">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="mt-1 mb-28 uppercase font-bold text-[10pt]">Pegawai Bersangkutan,</p>
                  <p className="font-bold uppercase underline leading-none text-[11pt]">{selectedPegawai?.nama}</p>
                  <p className="mt-1 text-[10pt]">NIP {selectedPegawai?.nip}</p>
               </div>
            </div>

            <div className="mt-10 pt-4 border-t border-dotted border-black/30 text-[7pt] italic text-gray-500 text-right">
                Dokumen ini dicetak secara otomatis melalui PORTAL SDM DJKI pada {new Date().toLocaleString('id-ID')}.
            </div>
         </div>
      </div>
    </div>
  );
};

export default PegawaiPage;