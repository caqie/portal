
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
  const [filterJenis, setFilterJenis] = useState('Semua Jenis');
  
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

  // Fungsi Helper: Normalisasi tanggal ke format ISO (YYYY-MM-DD) agar terbaca oleh input date
  const formatDateForInput = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    // Hapus whitespace
    const cleanDate = dateStr.trim();
    
    // Cek jika sudah format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return cleanDate;
    
    // Cek format DD-MM-YYYY atau DD/MM/YYYY
    const parts = cleanDate.split(/[-/]/);
    if (parts.length === 3) {
      // Jika bagian pertama adalah hari (DD)
      if (parts[0].length <= 2 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      // Jika bagian pertama adalah tahun (YYYY) namun pemisah salah
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
    
    // Fallback menggunakan objek Date
    try {
      const d = new Date(cleanDate);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    
    return '';
  };

  const handleEditPegawai = (p: Pegawai) => {
    setSelectedPegawai(p);
    // Masukkan data ke formData dengan normalisasi tanggal
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
      const searchStr = [
        p.nama, p.nip, p.nik, p.jabatan, p.unitKerja, p.pendidikan, p.jurusan, p.status, p.alamat
      ].map(v => String(v || '').toLowerCase()).join(' ');

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
        'NIP': p.nip,
        'NAMA PEGAWAI': p.nama,
        'JABATAN': p.jabatan,
        'UNIT KERJA': p.unitKerja,
        'PANGKAT': p.pangkat || '-',
        'GOLONGAN': p.golRuang || '-',
        'JENIS PEGAWAI': p.jenisPegawai
      }));
    } else {
      data = filteredPegawai.map(p => ({ ...p }));
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
      setSuccessMsg(`Data ${formData.nama} berhasil disinkronkan ke database cloud.`);
      await loadData();
      setIsModalOpen(false);
      setShowSuccess(true);
      logActivity(formData.id ? 'UPDATE' : 'CREATE', 'Pegawai', `Update data lengkap: ${formData.nama}`);
    }
    setSyncing(false);
  };

  const handleUploadDossierFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`DOS_${selectedPegawai?.nip}_${Date.now()}`, file.type, base64);
      if (res.success && res.fileUrl) {
        setDossierFormData(prev => ({ 
          ...prev, 
          fileUrl: res.fileUrl,
          fileName: prev.fileName || file.name.split('.').slice(0, -1).join('.')
        }));
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDossier = async () => {
    if (!dossierFormData.fileName || !dossierFormData.fileUrl) return alert("Pilih file dan isi nama berkas.");
    setSyncing(true);
    const payload: Dossier = {
      id: `DOS-${selectedPegawai?.nip}-${Date.now()}`,
      nip: selectedPegawai!.nip,
      namaPegawai: selectedPegawai!.nama,
      tanggal: dossierFormData.tanggal || new Date().toISOString().split('T')[0],
      fileName: dossierFormData.fileName!,
      fileUrl: dossierFormData.fileUrl!,
      keterangan: dossierFormData.keterangan || ''
    };
    const ok = await syncTableRemote('DOSSIER', 'SAVE', payload);
    if (ok) {
      await loadData();
      setIsAddDossierOpen(false);
      setShowSuccess(true);
      setSuccessMsg("Berkas berhasil ditambahkan ke arsip.");
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

  const inputClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950";
  const inputNoCapsClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";
  const detailLabel = "text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1.5";
  const detailValue = "text-[13px] font-black uppercase text-gray-900 leading-tight";
  const detailValueNoCaps = "text-[13px] font-black text-gray-900 leading-tight";

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

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h3 className="text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Database ASN DJKI</h3>
            <span className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-600/20">{filteredPegawai.length} Pegawai</span>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <i className="bi bi-shield-check text-blue-600"></i> Terintegrasi dengan Cloud Google Spreadsheet
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={() => handleExportExcel('SHARE')} className="h-14 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2">
              <i className="bi bi-file-earmark-spreadsheet-fill text-lg"></i> Excel Share
           </button>
           {isSuperadmin && (
              <button onClick={() => handleExportExcel('FULL')} className="h-14 px-6 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2">
                 <i className="bi bi-database-fill-down text-lg"></i> Excel Full (Raw)
              </button>
           )}
           {canEdit && (
             <button onClick={() => { setSelectedPegawai(null); setFormData({status: 'Aktif', jenisPegawai: 'PNS', gender: 'L', unitKerja: UNIT_KERJA[0]}); setIsModalOpen(true); }} className="h-14 px-10 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">
               + Registrasi Pegawai
             </button>
           )}
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
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

      {/* PEGAWAI GRID */}
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
                       <p className="text-[8px] font-bold text-gray-400 uppercase truncate w-full mt-1">{p.jabatan}</p>
                    </div>
                 </div>
              </div>
           </div>
         ))
        }
      </div>

      {/* MODAL DETAIL PEGAWAI */}
      {isDetailOpen && selectedPegawai && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-10">
           <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-md" onClick={() => setIsDetailOpen(false)}></div>
           <div className="relative bg-white w-full max-w-7xl md:rounded-[4rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col h-full md:max-h-[92vh]">
              <div className="bg-gray-50/50 border-b flex justify-between items-center px-10 md:px-14 shrink-0 overflow-x-auto no-scrollbar">
                 <div className="flex">
                    <button onClick={() => setDetailTab('DATA_DIRI')} className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${detailTab === 'DATA_DIRI' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400'}`}>Profil Komprehensif</button>
                    <button onClick={() => setDetailTab('E_ARSIP')} className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${detailTab === 'E_ARSIP' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400'}`}>Digital Dossier ({filteredDossiers.length})</button>
                 </div>
                 <button onClick={() => setIsDetailOpen(false)} className="h-10 w-10 text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 {/* Sidebar Info */}
                 <div className="md:w-[380px] bg-gray-50/30 border-r p-8 flex flex-col items-center shrink-0">
                    <div className="h-52 w-52 rounded-[3.5rem] bg-white border-8 border-white shadow-2xl overflow-hidden mb-8 group relative">
                       {selectedPegawai.foto ? <img src={selectedPegawai.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-6xl font-black text-blue-600 bg-blue-50">{selectedPegawai.nama.charAt(0)}</div>}
                    </div>
                    <div className="text-center space-y-2 mb-10 w-full">
                       <h4 className="text-xl font-black text-gray-950 leading-tight px-4">{selectedPegawai.nama}</h4>
                       <p className="text-[10px] font-mono font-black text-blue-600 tracking-widest">NIP. {selectedPegawai.nip}</p>
                       <div className="flex justify-center gap-2 mt-4">
                          <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black border border-emerald-100 uppercase">{selectedPegawai.status}</span>
                          <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black border border-blue-100 uppercase">{selectedPegawai.jenisPegawai}</span>
                       </div>
                    </div>
                    <div className="w-full space-y-3">
                       <button onClick={handleCetakDRH} className="w-full py-4 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                          <i className="bi bi-file-earmark-pdf-fill"></i> Cetak DRH Lengkap
                       </button>
                       {canEdit && (
                         <button onClick={() => handleEditPegawai(selectedPegawai)} className="w-full py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-3">
                            <i className="bi bi-pencil-square"></i> Edit Data Pegawai
                         </button>
                       )}
                    </div>
                 </div>

                 {/* Main Content Info */}
                 <div className="flex-1 p-8 md:p-14 overflow-y-auto custom-scrollbar bg-white">
                    {detailTab === 'DATA_DIRI' ? (
                       <div className="animate-fadeIn space-y-14 max-w-6xl mx-auto">
                          
                          {/* JABATAN & STRUKTUR */}
                          <div className="space-y-8">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl shadow-inner"><i className="bi bi-briefcase-fill"></i></div>
                                <h5 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">Jabatan & Struktur Penempatan</h5>
                             </div>
                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-8 bg-gray-50/50 p-10 rounded-[3rem] border border-gray-100">
                                <div className="col-span-2"><p className={detailLabel}>Nomenklatur Jabatan</p><p className={detailValue}>{selectedPegawai.jabatan || '-'}</p></div>
                                <div><p className={detailLabel}>TMT Jabatan</p><p className={detailValue}>{selectedPegawai.tmtJabatan || '-'}</p></div>
                                <div><p className={detailLabel}>Eselon</p><p className={detailValue}>{selectedPegawai.eselon || '-'}</p></div>
                                <div className="col-span-2"><p className={detailLabel}>Unit Kerja Utama</p><p className={detailValue}>{selectedPegawai.unitKerja || '-'}</p></div>
                                <div><p className={detailLabel}>Bagian / Tim</p><p className={detailValue}>{selectedPegawai.bagian || '-'}</p></div>
                                <div><p className={detailLabel}>Sub Bagian</p><p className={detailValue}>{selectedPegawai.subBagian || '-'}</p></div>
                                <div className="col-span-full"><p className={detailLabel}>Klasifikasi Jabatan</p><p className={detailValue}>{selectedPegawai.klasifikasiJabatan || '-'}</p></div>
                             </div>
                          </div>

                          {/* KEPANGKATAN & KARIR */}
                          <div className="space-y-8">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl shadow-inner"><i className="bi bi-award-fill"></i></div>
                                <h5 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">Kepangkatan & Riwayat Karir</h5>
                             </div>
                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-8 bg-emerald-50/20 p-10 rounded-[3rem] border border-emerald-50">
                                <div><p className={detailLabel}>Pangkat / Golongan</p><p className={detailValue}>{selectedPegawai.pangkat} ({selectedPegawai.golRuang})</p></div>
                                <div><p className={detailLabel}>TMT Pangkat</p><p className={detailValue}>{selectedPegawai.tmtPangkat || '-'}</p></div>
                                <div><p className={detailLabel}>TMT Status ASN</p><p className={detailValue}>{selectedPegawai.tmtStatus || '-'}</p></div>
                                <div><p className={detailLabel}>Masa Kerja</p><p className={detailValue}>{selectedPegawai.masaKerja || '-'}</p></div>
                             </div>
                          </div>

                          {/* PENDIDIKAN & BIODATA */}
                          <div className="space-y-8">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-xl shadow-inner"><i className="bi bi-person-lines-fill"></i></div>
                                <h5 className="text-[11px] font-black text-amber-600 uppercase tracking-[0.2em]">Pendidikan & Biodata Personal</h5>
                             </div>
                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-8 bg-amber-50/10 p-10 rounded-[3rem] border border-amber-50">
                                <div className="col-span-2"><p className={detailLabel}>NIK</p><p className={detailValue}>{selectedPegawai.nik || '-'}</p></div>
                                <div><p className={detailLabel}>Jenis Kelamin</p><p className={detailValue}>{selectedPegawai.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</p></div>
                                <div><p className={detailLabel}>Agama</p><p className={detailValue}>{selectedPegawai.agama || '-'}</p></div>
                                <div className="col-span-2"><p className={detailLabel}>Tempat, Tanggal Lahir</p><p className={detailValue}>{selectedPegawai.tempatLahir || '-'}, {selectedPegawai.tanggalLahir || '-'}</p></div>
                                <div><p className={detailLabel}>Pendidikan</p><p className={detailValue}>{selectedPegawai.pendidikan || '-'}</p></div>
                                <div><p className={detailLabel}>Jurusan</p><p className={detailValue}>{selectedPegawai.jurusan || '-'}</p></div>
                                <div className="col-span-full"><p className={detailLabel}>Gelar Akademik</p><p className={detailValueNoCaps}>{selectedPegawai.gelar || '-'}</p></div>
                                <div className="col-span-full"><p className={detailLabel}>Nama Lengkap (Database)</p><p className={detailValueNoCaps}>{selectedPegawai.nama || '-'}</p></div>
                                <div className="col-span-full"><p className={detailLabel}>Nomor Telepon / WhatsApp</p><p className={detailValue}>{selectedPegawai.telepon || '-'}</p></div>
                                <div className="col-span-full"><p className={detailLabel}>Alamat Lengkap Sesuai KTP</p><p className="text-[12px] font-bold text-gray-700 normal-case leading-relaxed">{selectedPegawai.alamat || '-'}</p></div>
                             </div>
                          </div>
                       </div>
                    ) : (
                       /* TAB E-ARSIP DIGITAL */
                       <div className="animate-fadeIn space-y-8">
                          <div className="flex justify-between items-center mb-6">
                             <div>
                                <h4 className="text-xl font-black uppercase text-gray-900 tracking-tighter">Digital Archiving System</h4>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest">{filteredDossiers.length} Berkas Terverifikasi</p>
                             </div>
                             {canEdit && (
                                <button 
                                   onClick={() => { setDossierFormData({ tanggal: new Date().toISOString().split('T')[0] }); setIsAddDossierOpen(true); }}
                                   className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
                                >
                                   <i className="bi bi-cloud-arrow-up-fill"></i> Tambah Berkas
                                </button>
                             )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {filteredDossiers.map(d => (
                               <div key={d.id} onClick={() => d.fileUrl && window.open(d.fileUrl, '_blank')} className="p-6 bg-gray-50 border border-gray-100 rounded-[2.5rem] hover:bg-white hover:border-blue-300 hover:shadow-xl transition-all cursor-pointer group flex items-center gap-5">
                                  <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 text-3xl shadow-sm group-hover:scale-110 transition-transform"><i className="bi bi-file-earmark-pdf-fill"></i></div>
                                  <div className="min-w-0 flex-1">
                                     <p className="text-[11px] font-black uppercase truncate text-gray-950">{d.fileName}</p>
                                     <p className="text-[8px] font-bold text-gray-400 mt-1">{d.tanggal} • {d.keterangan || 'Internal Only'}</p>
                                  </div>
                                  <i className="bi bi-box-arrow-up-right text-gray-300 group-hover:text-blue-600 transition-colors"></i>
                               </div>
                             ))}
                             {filteredDossiers.length === 0 && <div className="col-span-full py-32 text-center opacity-30"><i className="bi bi-folder2-open text-6xl block mb-4"></i><p className="text-[11px] font-black uppercase tracking-widest">Belum ada arsip digital untuk pegawai ini</p></div>}
                          </div>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* FORM REGISTRASI / EDIT PEGAWAI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && !uploading && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-[95vh]">
              <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center shrink-0">
                 <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">{formData.id ? 'Perbarui Data Lengkap' : 'Registrasi Pegawai Baru'}</h4>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
              </div>
              <form onSubmit={handleSave} className="p-10 overflow-y-auto custom-scrollbar space-y-16">
                 
                 {/* A. IDENTITAS POKOK */}
                 <section className="space-y-8">
                    <div className="flex items-center gap-4"><div className="h-10 w-2 bg-blue-600 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">A. Identitas Pokok & Foto Profil</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                       <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div><label className={labelClass}>NIP (18 Digit)</label><input type="text" maxLength={18} className={inputClass} value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value.replace(/\D/g, '')})} required /></div>
                          <div><label className={labelClass}>Nomor NIK KTP</label><input type="text" className={inputClass} value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value})} /></div>
                          <div className="col-span-full"><label className={labelClass}>Nama Lengkap (Tanpa Gelar)</label><input type="text" className={inputNoCapsClass} value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} required /></div>
                          <div><label className={labelClass}>Gelar Akademik Lengkap</label><input type="text" className={inputNoCapsClass} value={formData.gelar || ''} onChange={e => setFormData({...formData, gelar: e.target.value})} /></div>
                          <div className="grid grid-cols-2 gap-4">
                             <div><label className={labelClass}>Jenis Kelamin</label><select className={inputClass} value={formData.gender || 'L'} onChange={e => setFormData({...formData, gender: e.target.value as any})}><option value="L">LAKI-LAKI</option><option value="P">PEREMPUAN</option></select></div>
                             <div><label className={labelClass}>Agama</label><input type="text" className={inputClass} value={formData.agama || ''} onChange={e => setFormData({...formData, agama: e.target.value})} /></div>
                          </div>
                       </div>
                       <div className="md:col-span-4 bg-gray-50 p-8 rounded-[3rem] border border-gray-100 flex flex-col items-center text-center">
                          <div className="h-40 w-40 bg-white rounded-[3rem] border-4 border-white shadow-xl overflow-hidden mb-6 relative group">
                             {formData.foto ? <img src={formData.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-blue-600 text-4xl font-black bg-blue-50/50">?</div>}
                             {uploading && <div className="absolute inset-0 bg-blue-600/80 flex items-center justify-center text-white"><div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div></div>}
                          </div>
                          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg flex items-center gap-2 active:scale-95 transition-all">
                             <i className="bi bi-camera-fill"></i> Unggah Pas Foto
                          </button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadPhoto} />
                       </div>
                    </div>
                 </section>

                 {/* B. JABATAN & UNIT */}
                 <section className="space-y-8">
                    <div className="flex items-center gap-4"><div className="h-10 w-2 bg-indigo-600 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">B. Jabatan & Struktur Penempatan</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="md:col-span-2"><label className={labelClass}>Nomenklatur Jabatan Saat Ini</label><input type="text" className={inputClass} value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} /></div>
                       <div><label className={labelClass}>TMT Jabatan</label><input type="date" className={inputNoCapsClass} value={formData.tmtJabatan || ''} onChange={e => setFormData({...formData, tmtJabatan: e.target.value})} /></div>
                       <div className="md:col-span-3"><label className={labelClass}>Unit Kerja Pengampu</label><select className={inputClass} value={formData.unitKerja || UNIT_KERJA[0]} onChange={e => setFormData({...formData, unitKerja: e.target.value})}>{UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}</select></div>
                       <div><label className={labelClass}>Eselon / Level</label><input type="text" className={inputClass} value={formData.eselon || ''} onChange={e => setFormData({...formData, eselon: e.target.value})} /></div>
                       <div className="md:col-span-2"><label className={labelClass}>Klasifikasi Jabatan</label><input type="text" className={inputClass} value={formData.klasifikasiJabatan || ''} onChange={e => setFormData({...formData, klasifikasiJabatan: e.target.value})} /></div>
                       <div><label className={labelClass}>Bagian / Tim</label><input type="text" className={inputClass} value={formData.bagian || ''} onChange={e => setFormData({...formData, bagian: e.target.value})} /></div>
                       <div><label className={labelClass}>Sub Bagian / Sub Tim</label><input type="text" className={inputClass} value={formData.subBagian || ''} onChange={e => setFormData({...formData, subBagian: e.target.value})} /></div>
                    </div>
                 </section>

                 {/* C. PANGKAT & STATUS */}
                 <section className="space-y-8">
                    <div className="flex items-center gap-4"><div className="h-10 w-2 bg-emerald-600 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">C. Kepangkatan, Golongan & Status ASN</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div><label className={labelClass}>Golongan Ruang</label><select className={inputClass} value={formData.golRuang || 'III/a'} onChange={e => setFormData({...formData, golRuang: e.target.value, pangkat: PANGKAT_MAP[e.target.value] || ''})}>{Object.keys(PANGKAT_MAP).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                       <div><label className={labelClass}>Pangkat Terhitung</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.pangkat || '-'} /></div>
                       <div><label className={labelClass}>TMT Pangkat</label><input type="date" className={inputNoCapsClass} value={formData.tmtPangkat || ''} onChange={e => setFormData({...formData, tmtPangkat: e.target.value})} /></div>
                       <div><label className={labelClass}>Jenis Pegawai</label><input type="text" className={inputClass} value={formData.jenisPegawai || ''} onChange={e => setFormData({...formData, jenisPegawai: e.target.value})} /></div>
                       <div><label className={labelClass}>TMT Status</label><input type="date" className={inputNoCapsClass} value={formData.tmtStatus || ''} onChange={e => setFormData({...formData, tmtStatus: e.target.value})} /></div>
                       <div><label className={labelClass}>Masa Kerja (Thn Bln)</label><input type="text" className={inputClass} value={formData.masaKerja || ''} onChange={e => setFormData({...formData, masaKerja: e.target.value})} placeholder="Contoh: 10 Tahun 2 Bulan" /></div>
                       <div className="md:col-span-3"><label className={labelClass}>Status Keaktifan</label><select className={inputClass} value={formData.status || 'Aktif'} onChange={e => setFormData({...formData, status: e.target.value})}><option>Aktif</option><option>Pensiun</option><option>Tidak Aktif</option><option>Tugas Belajar</option></select></div>
                    </div>
                 </section>

                 {/* D. PENDIDIKAN & BIODATA */}
                 <section className="space-y-8">
                    <div className="flex items-center gap-4"><div className="h-10 w-2 bg-amber-600 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">D. Riwayat Pendidikan & Kontak Pribadi</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div><label className={labelClass}>Pendidikan Terakhir</label><input type="text" className={inputClass} value={formData.pendidikan || ''} onChange={e => setFormData({...formData, pendidikan: e.target.value})} /></div>
                       <div className="md:col-span-2"><label className={labelClass}>Jurusan / Program Studi</label><input type="text" className={inputClass} value={formData.jurusan || ''} onChange={e => setFormData({...formData, jurusan: e.target.value})} /></div>
                       <div><label className={labelClass}>Tempat Lahir</label><input type="text" className={inputClass} value={formData.tempatLahir || ''} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} /></div>
                       <div><label className={labelClass}>Tanggal Lahir</label><input type="date" className={inputNoCapsClass} value={formData.tanggalLahir || ''} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} /></div>
                       <div><label className={labelClass}>Nomor Telepon / HP</label><input type="text" className={inputClass} value={formData.telepon || ''} onChange={e => setFormData({...formData, telepon: e.target.value})} /></div>
                       <div className="md:col-span-3"><label className={labelClass}>Alamat Sesuai KTP</label><textarea rows={3} className={`${inputClass} normal-case h-28 resize-none font-bold`} value={formData.alamat || ''} onChange={e => setFormData({...formData, alamat: e.target.value})} /></div>
                    </div>
                 </section>
              </form>
              <div className="p-8 bg-gray-50 border-t flex justify-center gap-4 shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-14 py-5 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase shadow-sm active:scale-95 transition-all">Batalkan</button>
                 <button onClick={handleSave} disabled={syncing || uploading} className="px-24 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center gap-4">
                    {(syncing || uploading) && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Simpan Seluruh Data</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL TAMBAH ARSIP (DOSSIER) SUB-MODAL */}
      {isAddDossierOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-md" onClick={() => !syncing && !uploading && setIsAddDossierOpen(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-modalEnter space-y-6 flex flex-col border border-white/20">
              <div className="flex items-center gap-4 border-b pb-6 shrink-0">
                 <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner"><i className="bi bi-file-earmark-arrow-up-fill"></i></div>
                 <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Tambah Arsip Digital</h4>
              </div>
              <div className="space-y-4">
                 <div><label className={labelClass}>Nama / Judul Berkas</label><input type="text" className={inputClass} value={dossierFormData.fileName || ''} onChange={e => setDossierFormData({...dossierFormData, fileName: e.target.value})} placeholder="Misal: SK Jabatan 2025" /></div>
                 <div><label className={labelClass}>Tanggal Terbit</label><input type="date" className={inputNoCapsClass} value={dossierFormData.tanggal || ''} onChange={e => setDossierFormData({...dossierFormData, tanggal: e.target.value})} /></div>
                 
                 {/* Upload Area */}
                 <div className={`p-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-3 transition-all ${dossierFormData.fileUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50/50 border-blue-200'}`}>
                    <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                       {uploading ? <div className="h-8 w-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div> : <i className={`bi ${dossierFormData.fileUrl ? 'bi-check-circle-fill text-emerald-600 text-3xl' : 'bi-cloud-upload-fill text-blue-600 text-2xl'}`}></i>}
                    </div>
                    <button type="button" onClick={() => dossierFileInputRef.current?.click()} disabled={uploading} className="px-8 py-3 bg-white border border-blue-100 text-blue-600 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">
                       {dossierFormData.fileUrl ? 'Ganti File' : 'Pilih File (PDF/IMG)'}
                    </button>
                    <input type="file" ref={dossierFileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleUploadDossierFile} />
                 </div>
                 
                 <div><label className={labelClass}>Keterangan (Opsional)</label><textarea rows={2} className={`${inputClass} h-20 resize-none normal-case font-bold`} value={dossierFormData.keterangan || ''} onChange={e => setDossierFormData({...dossierFormData, keterangan: e.target.value})} /></div>
              </div>
              <div className="flex gap-3 pt-4 shrink-0">
                 <button onClick={() => setIsAddDossierOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95">Batal</button>
                 <button onClick={handleSaveDossier} disabled={syncing || uploading || !dossierFormData.fileUrl} className="flex-[1.5] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl active:scale-95 disabled:bg-gray-300 flex items-center justify-center gap-2">
                    {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Simpan Arsip</span>
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
                     <span>NAMA LENGKAP</span><span>:</span><span className="font-bold">{selectedPegawai?.nama}</span>
                     <span>NIP</span><span>:</span><span>{selectedPegawai?.nip}</span>
                     <span>NIK</span><span>:</span><span>{selectedPegawai?.nik}</span>
                     <span>TEMPAT/TGL LAHIR</span><span>:</span><span>{selectedPegawai?.tempatLahir}, {selectedPegawai?.tanggalLahir}</span>
                     <span>JENIS KELAMIN</span><span>:</span><span>{selectedPegawai?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                     <span>AGAMA</span><span>:</span><span>{selectedPegawai?.agama}</span>
                     <span>JABATAN</span><span>:</span><span className="uppercase">{selectedPegawai?.jabatan}</span>
                     <span>TMT JABATAN</span><span>:</span><span>{selectedPegawai?.tmtJabatan || '-'}</span>
                     <span>UNIT KERJA</span><span>:</span><span className="uppercase">{selectedPegawai?.unitKerja}</span>
                     <span>GELAR AKADEMIK</span><span>:</span><span>{selectedPegawai?.gelar || '-'}</span>
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
               <p className="font-bold underline leading-none">{selectedPegawai?.nama}</p>
               <p className="mt-2 font-bold">NIP {selectedPegawai?.nip}</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default PegawaiPage;
