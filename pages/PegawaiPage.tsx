
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Pegawai, Dossier } from '../types';
import { fetchPegawaiFromSheets, syncTableRemote, uploadFileToDrive, fetchDossiersFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { normalizeUnitName, UNIT_KERJA, PANGKAT_MAP, DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const PegawaiPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [dossierList, setDossierList] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  
  // Modal & Tab States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'DATA_DIRI' | 'E_ARSIP'>('DATA_DIRI');
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [formData, setFormData] = useState<Partial<Pegawai>>({});
  const [dossierFormData, setDossierFormData] = useState<Partial<Dossier>>({});
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pegawaiToDelete, setPegawaiToDelete] = useState<Pegawai | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dossierInputRef = useRef<HTMLInputElement>(null);
  const drhRef = useRef<HTMLDivElement>(null);

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
      const searchStr = `${p.nama} ${p.nip} ${p.jabatan} ${p.golRuang} ${p.pangkat} ${p.jenisPegawai} ${p.unitKerja} ${p.nik}`.toLowerCase();
      const match = searchStr.includes(term);
      const unitMatch = filterUnit === 'Semua Unit' || normalizeUnitName(p.unitKerja) === filterUnit;
      return match && unitMatch;
    });
  }, [pegawaiList, searchTerm, filterUnit]);

  // FUNGSI DOWNLOAD EXCEL (SHARE & FULL DATA)
  const downloadExcel = (type: 'FULL' | 'SHARE') => {
    const wb = XLSX.utils.book_new();
    let dataToExport = [];

    if (type === 'SHARE') {
      dataToExport = filteredPegawai.map(p => ({
        'NIP': p.nip,
        'Nama Lengkap': p.nama,
        'Jenis Pegawai': p.jenisPegawai || '-',
        'Jabatan': p.jabatan,
        'Unit Kerja': p.unitKerja,
        'Gol Ruang': p.golRuang || '-',
        'Pangkat': p.pangkat || '-',
        'Status': p.status
      }));
    } else {
      dataToExport = filteredPegawai.map(p => ({
        'NIP': p.nip,
        'NIK': p.nik || '-',
        'Nama Lengkap': p.nama,
        'Gelar': p.gelar || '',
        'Jabatan': p.jabatan,
        'Sub Bagian': p.subBagian || '-',
        'Bagian': p.bagian || '-',
        'Unit Kerja': p.unitKerja,
        'Klasifikasi Jabatan': p.klasifikasiJabatan || '-',
        'Eselon': p.eselon || '-',
        'Gol Ruang': p.golRuang || '-',
        'Pangkat': p.pangkat || '-',
        'TMT Pangkat': p.tmtPangkat || '',
        'TMT Jabatan': p.tmtJabatan || '',
        'TMT Status': p.tmtStatus || '',
        'Jenis Pegawai': p.jenisPegawai || '-',
        'Pendidikan': p.pendidikan || '',
        'Jurusan': p.jurusan || '-',
        'Gender': p.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        'Agama': p.agama || '',
        'Tempat Lahir': p.tempatLahir || '',
        'Tgl Lahir': p.tanggalLahir || '',
        'Telepon': p.telepon || '',
        'Alamat': p.alamat || '',
        'Masa Kerja': p.masaKerja || '-',
        'Status ASN': p.status
      }));
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, "Database Pegawai");
    XLSX.writeFile(wb, `Data_Pegawai_${type}_${Date.now()}.xlsx`);
    logActivity('DOWNLOAD', 'Pegawai', `Download Excel ${type}`);
  };

  const handleCetakDRH = async () => {
    if (!drhRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(drhRef.current, { scale: 2.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
    pdf.save(`DRH_${selectedPegawai?.nama.replace(/\s+/g, '_')}.pdf`);
    logActivity('DOWNLOAD', 'Pegawai', `Cetak DRH: ${selectedPegawai?.nama}`);
    setSyncing(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyncing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`FOTO_${formData.nip || 'NEW'}_${Date.now()}`, file.type, base64);
      if (res.success && res.fileUrl) {
        setFormData(prev => ({ ...prev, foto: res.fileUrl }));
      } else { alert("Gagal unggah foto."); }
      setSyncing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDossierUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf' || file.size > 1024 * 1024) {
      alert("Hanya PDF maksimal 1MB.");
      return;
    }
    setSyncing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`DOC_${selectedPegawai?.nip}_${Date.now()}`, file.type, base64);
      if (res.success && res.fileUrl) {
        const payload: Dossier = {
          id: Date.now().toString(),
          nip: selectedPegawai?.nip || '',
          namaPegawai: selectedPegawai?.nama || '',
          tanggal: new Date().toISOString().split('T')[0],
          fileName: dossierFormData.fileName || file.name,
          keterangan: dossierFormData.keterangan || 'Diunggah via E-Arsip',
          fileUrl: res.fileUrl
        };
        const ok = await syncTableRemote('DOSSIER', 'SAVE', payload);
        if (ok) {
          setSuccessMsg("Dokumen berhasil diarsipkan.");
          setShowSuccess(true);
          setIsDossierModalOpen(false);
          loadData();
        }
      }
      setSyncing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    if (!pegawaiToDelete) return;
    setSyncing(true);
    const ok = await syncTableRemote('PEGAWAI', 'DELETE', { nip: pegawaiToDelete.nip });
    if (ok) {
      setPegawaiList(prev => prev.filter(p => p.nip !== pegawaiToDelete.nip));
      setSuccessMsg("Data dihapus.");
      setShowSuccess(true);
    }
    setIsConfirmOpen(false);
    setSyncing(false);
    setPegawaiToDelete(null);
  };

  const inputClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => !syncing && setIsConfirmOpen(false)} 
        onConfirm={handleDelete} 
        loading={syncing}
        message={`Hapus ${pegawaiToDelete?.nama} secara permanen?`}
      />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h3 className="text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Database Kepegawaian</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3">Smart HR Management DJKI</p>
        </div>
        <div className="flex flex-wrap gap-2">
           {/* BUTTON DOWNLOAD RESTORED */}
           <button onClick={() => downloadExcel('SHARE')} className="h-14 px-6 bg-white text-gray-600 border border-gray-200 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm">
              <i className="bi bi-share"></i> Share Excel
           </button>
           <button onClick={() => downloadExcel('FULL')} className="h-14 px-6 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 shadow-xl flex items-center gap-2 transition-all">
              <i className="bi bi-file-earmark-spreadsheet-fill"></i> Download Full Data
           </button>
           
           {canEdit && (
             <button onClick={() => { setSelectedPegawai(null); setFormData({status: 'Aktif', jenisPegawai: 'PNS', gender: 'L'}); setIsModalOpen(true); }} className="h-14 px-10 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">
               + Registrasi Pegawai
             </button>
           )}
        </div>
      </div>

      {/* FILTER */}
      <div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <i className="bi bi-search absolute left-6 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input type="text" placeholder="Cari Nama, NIP, NIK..." className="w-full pl-14 pr-8 py-4.5 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-xs font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="px-8 py-4.5 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
            <option>Semua Unit</option>
            {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase().substring(0, 30)}...</option>)}
        </select>
      </div>

      {/* GRID */}
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

      {/* DETAIL MODAL (TABBED) */}
      {isDetailOpen && selectedPegawai && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-10">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setIsDetailOpen(false)}></div>
           <div className="relative bg-white w-full max-w-7xl md:rounded-[4rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col h-full md:max-h-[92vh]">
              
              {/* Top Navigation Tabs */}
              <div className="bg-gray-50/50 border-b flex justify-between items-center px-10 md:px-14 shrink-0 overflow-x-auto no-scrollbar">
                 <div className="flex">
                    {[
                      {id: 'DATA_DIRI', label: 'Profil & Data Diri', icon: 'bi-person-badge'},
                      {id: 'E_ARSIP', label: 'E-Arsip Digital', icon: 'bi-folder2-open'}
                    ].map(t => (
                      <button key={t.id} onClick={() => setDetailTab(t.id as any)} className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${detailTab === t.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400'}`}>
                         <i className={`bi ${t.icon} text-lg`}></i> {t.label}
                      </button>
                    ))}
                 </div>
                 <button onClick={() => setIsDetailOpen(false)} className="h-10 w-10 text-gray-400 hover:text-rose-500"><i className="bi bi-x-lg text-xl"></i></button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 {/* Sidebar Mini */}
                 <div className="md:w-[320px] bg-gray-50/30 border-r p-8 flex flex-col items-center shrink-0 overflow-y-auto no-scrollbar">
                    <div className="h-40 w-40 rounded-[3rem] bg-white border-8 border-white shadow-xl overflow-hidden mb-6">
                       {selectedPegawai.foto ? <img src={selectedPegawai.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-5xl font-black text-blue-600 bg-blue-50">{selectedPegawai.nama.charAt(0)}</div>}
                    </div>
                    <div className="text-center space-y-2">
                       <h4 className="text-xl font-black uppercase text-gray-950 leading-tight">{selectedPegawai.nama}</h4>
                       <p className="text-[10px] font-mono font-black text-blue-600 tracking-widest">NIP. {selectedPegawai.nip}</p>
                    </div>

                    <div className="mt-8 w-full space-y-2">
                       {detailTab === 'DATA_DIRI' && (
                         <button onClick={handleCetakDRH} className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <i className="bi bi-printer-fill"></i> Cetak DRH PDF
                         </button>
                       )}
                       {canEdit && (
                         <button onClick={() => { setFormData({...selectedPegawai}); setIsModalOpen(true); setIsDetailOpen(false); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Edit Profil</button>
                       )}
                    </div>
                    <button onClick={() => setIsDetailOpen(false)} className="mt-auto py-4 w-full bg-white text-gray-400 border border-gray-100 rounded-2xl text-[9px] font-black uppercase hover:bg-gray-50 transition-all">Tutup</button>
                 </div>

                 {/* Content Area */}
                 <div className="flex-1 p-8 md:p-14 overflow-y-auto custom-scrollbar bg-white relative">
                    {detailTab === 'DATA_DIRI' ? (
                       <div className="animate-fadeIn space-y-12 max-w-4xl mx-auto">
                          <section>
                             <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-8 border-b pb-4 flex items-center gap-3"><i className="bi bi-person-vcard text-blue-600"></i> Identitas & Penempatan</h5>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">NIK (No. KTP)</p><p className="text-xs font-black text-gray-950 tracking-widest">{selectedPegawai.nik || '-'}</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Jabatan Nomenklatur</p><p className="text-xs font-black text-gray-950 uppercase">{selectedPegawai.jabatan}</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Bagian / Sub Bagian</p><p className="text-xs font-black text-gray-950 uppercase">{selectedPegawai.bagian || '-'} / {selectedPegawai.subBagian || '-'}</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Unit Kerja Utama</p><p className="text-xs font-black text-blue-600 uppercase">{selectedPegawai.unitKerja}</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Klasifikasi Jabatan</p><p className="text-xs font-black text-gray-950 uppercase">{selectedPegawai.klasifikasiJabatan || '-'}</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Eselonering</p><p className="text-xs font-black text-gray-950 uppercase">{selectedPegawai.eselon || 'NON-ESELON'}</p></div>
                             </div>
                          </section>

                          <section>
                             <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-8 border-b pb-4 flex items-center gap-3"><i className="bi bi-award text-emerald-600"></i> Karir & Pendidikan</h5>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Pangkat / Golongan</p><p className="text-xs font-black text-gray-950 uppercase">{selectedPegawai.pangkat} ({selectedPegawai.golRuang})</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">TMT Pangkat / TMT Jabatan</p><p className="text-xs font-black text-gray-950">{selectedPegawai.tmtPangkat || '-'} / {selectedPegawai.tmtJabatan || '-'}</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Pendidikan Terakhir / Jurusan</p><p className="text-xs font-black text-gray-950 uppercase">{selectedPegawai.pendidikan || '-'} / {selectedPegawai.jurusan || '-'}</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Masa Kerja Kumulatif</p><p className="text-xs font-black text-blue-700 uppercase">{selectedPegawai.masaKerja || '-'}</p></div>
                             </div>
                          </section>

                          <section>
                             <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-8 border-b pb-4 flex items-center gap-3"><i className="bi bi-person-fill text-rose-600"></i> Personal & Kontak</h5>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Tempat, Tanggal Lahir</p><p className="text-xs font-black text-gray-950 uppercase">{selectedPegawai.tempatLahir || '-'}, {selectedPegawai.tanggalLahir || '-'}</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Jenis Kelamin / Agama</p><p className="text-xs font-black text-gray-950 uppercase">{selectedPegawai.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'} / {selectedPegawai.agama || '-'}</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Kontak Telepon</p><p className="text-xs font-black text-gray-950">{selectedPegawai.telepon || '-'}</p></div>
                                <div className="col-span-full"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Alamat Domisili</p><p className="text-xs font-bold text-gray-600 uppercase leading-relaxed">{selectedPegawai.alamat || '-'}</p></div>
                             </div>
                          </section>
                       </div>
                    ) : (
                       <div className="animate-fadeIn space-y-8">
                          <div className="flex justify-between items-center mb-6">
                             <div>
                                <h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">E-Arsip Digital Pegawai</h5>
                                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">Riwayat dokumen terverifikasi di Cloud</p>
                             </div>
                             <button onClick={() => { setIsDossierModalOpen(true); setDossierFormData({}); }} className="px-6 py-3 bg-[#111827] text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                                <i className="bi bi-cloud-arrow-up text-lg"></i> Unggah Berkas PDF
                             </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {dossierList.filter(d => d.nip === selectedPegawai.nip).map(d => (
                                <div key={d.id} className="p-5 bg-gray-50 border border-gray-100 rounded-3xl group hover:border-blue-200 hover:bg-white transition-all">
                                   <div className="flex items-start gap-4">
                                      <div className="h-12 w-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shrink-0 border border-rose-100">
                                         <i className="bi bi-file-earmark-pdf-fill text-2xl"></i>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                         <p className="text-[11px] font-black text-gray-950 uppercase truncate leading-tight">{d.fileName}</p>
                                         <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">{d.tanggal} • {d.keterangan}</p>
                                      </div>
                                   </div>
                                   <div className="mt-6 flex gap-2">
                                      <button onClick={() => window.open(d.fileUrl, '_blank')} className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm">View</button>
                                      <a href={d.fileUrl} download className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-[8px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-sm text-center">Download</a>
                                   </div>
                                </div>
                             ))}
                             {dossierList.filter(d => d.nip === selectedPegawai.nip).length === 0 && (
                                <div className="col-span-full py-24 text-center border-2 border-dashed border-gray-100 rounded-[3rem] opacity-40">
                                   <i className="bi bi-folder-x text-5xl text-gray-300 block mb-4"></i>
                                   <p className="text-[10px] font-black uppercase tracking-widest">Belum ada dokumen diarsipkan</p>
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

      {/* HIDDEN DRH TEMPLATE FOR EXPORT */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
         <div ref={drhRef} className="bg-white text-black font-arial p-[1.5cm_1.5cm]" style={{ width: '210mm', minHeight: '330mm' }}>
            <div className="flex items-center border-b-[2pt] border-black pb-4 mb-8">
               <img src={DEFAULT_LOGO} className="h-16 w-auto mr-6" />
               <div className="flex-1 text-center">
                  <p className="text-[11pt] font-bold uppercase">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                  <p className="text-[12pt] font-bold uppercase">DAFTAR RIWAYAT HIDUP PEGAWAI</p>
               </div>
            </div>
            
            <div className="flex justify-between items-start mb-10">
               <div className="space-y-4 text-[9.5pt] flex-1">
                  <p className="font-bold border-b border-black pb-1 mb-2">I. DATA UTAMA</p>
                  <div className="grid grid-cols-[140px_10px_1fr] gap-y-2">
                     <span>1. NAMA</span><span>:</span><span className="font-bold uppercase">{selectedPegawai?.nama}</span>
                     <span>2. NIP</span><span>:</span><span>{selectedPegawai?.nip}</span>
                     <span>3. NIK</span><span>:</span><span>{selectedPegawai?.nik}</span>
                     <span>4. TTL</span><span>:</span><span className="uppercase">{selectedPegawai?.tempatLahir}, {selectedPegawai?.tanggalLahir}</span>
                     <span>5. JENIS KELAMIN</span><span>:</span><span>{selectedPegawai?.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</span>
                     <span>6. AGAMA</span><span>:</span><span className="uppercase">{selectedPegawai?.agama}</span>
                  </div>
               </div>
               <div className="h-32 w-24 border border-black bg-gray-50 flex-shrink-0 flex items-center justify-center ml-10 overflow-hidden">
                  {selectedPegawai?.foto ? <img src={selectedPegawai.foto} className="w-full h-full object-cover" /> : <p className="text-[8pt] text-gray-400">PAS FOTO</p>}
               </div>
            </div>

            <div className="space-y-4 text-[9.5pt] mb-10">
               <p className="font-bold border-b border-black pb-1 mb-2">II. POSISI & JABATAN</p>
               <div className="grid grid-cols-[140px_10px_1fr] gap-y-2">
                  <span>1. JABATAN</span><span>:</span><span className="uppercase">{selectedPegawai?.jabatan}</span>
                  <span>2. PENEMPATAN</span><span>:</span><span className="uppercase">{selectedPegawai?.unitKerja}</span>
                  <span>3. BAGIAN</span><span>:</span><span className="uppercase">{selectedPegawai?.bagian}</span>
                  <span>4. SUB BAGIAN</span><span>:</span><span className="uppercase">{selectedPegawai?.subBagian}</span>
                  <span>5. PANGKAT/GOL</span><span>:</span><span className="uppercase">{selectedPegawai?.pangkat} ({selectedPegawai?.golRuang})</span>
                  <span>6. TMT PANGKAT</span><span>:</span><span>{selectedPegawai?.tmtPangkat}</span>
                  <span>7. MASA KERJA</span><span>:</span><span className="uppercase">{selectedPegawai?.masaKerja}</span>
               </div>
            </div>

            <div className="space-y-4 text-[9.5pt] mb-10">
               <p className="font-bold border-b border-black pb-1 mb-2">III. RIWAYAT PENDIDIKAN</p>
               <div className="grid grid-cols-[140px_10px_1fr] gap-y-2">
                  <span>1. PENDIDIKAN</span><span>:</span><span className="uppercase">{selectedPegawai?.pendidikan}</span>
                  <span>2. JURUSAN</span><span>:</span><span className="uppercase">{selectedPegawai?.jurusan}</span>
               </div>
            </div>

            <div className="mt-24 text-right pr-10 text-[10pt]">
               <p>Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
               <p className="mb-24">Pegawai Bersangkutan,</p>
               <p className="font-bold uppercase underline leading-none">{selectedPegawai?.nama}</p>
               <p className="mt-1">NIP {selectedPegawai?.nip}</p>
            </div>

            <div className="absolute bottom-10 left-10 text-[7pt] text-gray-400 border-t pt-2 w-[80%]">
               Dokumen Riwayat Hidup dihasilkan secara otomatis oleh Sistem Integrasi SDM DJKI - Kumham Pasti.
            </div>
         </div>
      </div>

      {/* EDITOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-4">
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-7xl md:rounded-[4rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col h-full md:max-h-[96vh] border-4 border-white">
            <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center shrink-0">
               <h4 className="text-2xl font-black uppercase text-gray-950 tracking-tighter">{formData.id ? 'Edit Data Pegawai' : 'Input Pegawai Baru'}</h4>
               <button onClick={() => !syncing && setIsModalOpen(false)} className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
            </div>
            
            <form onSubmit={async (e) => {
               e.preventDefault();
               setSyncing(true);
               const ok = await syncTableRemote('PEGAWAI', 'SAVE', { ...formData, id: formData.id || Date.now().toString() });
               if(ok) { await loadData(); setIsModalOpen(false); setSuccessMsg("Sinkronisasi Cloud Berhasil."); setShowSuccess(true); }
               setSyncing(false);
            }} className="p-10 md:p-14 overflow-y-auto custom-scrollbar">
               
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                  {/* LEFT COLUMN */}
                  <div className="lg:col-span-8 space-y-12">
                     <section className="space-y-8">
                        <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-person-badge"></i> Identitas & Jabatan</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="md:col-span-2 flex items-center gap-6 mb-4">
                              <div className="h-28 w-28 rounded-3xl bg-gray-50 border-4 border-white shadow-xl overflow-hidden relative group shrink-0">
                                 {formData.foto ? <img src={formData.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-gray-300"><i className="bi bi-camera-fill text-3xl"></i></div>}
                                 <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><i className="bi bi-upload text-xl"></i></button>
                                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                              </div>
                              <p className="text-[9px] text-gray-400 font-bold uppercase leading-relaxed">Klik kotak foto untuk mengunggah pas foto formal. Foto otomatis tersimpan di Cloud Server.</p>
                           </div>
                           <div><label className={labelClass}>Nama Lengkap (Tanpa Gelar)</label><input type="text" className={inputClass} value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} required /></div>
                           <div><label className={labelClass}>Gelar Lengkap</label><input type="text" className={inputClass} value={formData.gelar || ''} onChange={e => setFormData({...formData, gelar: e.target.value})} /></div>
                           <div><label className={labelClass}>NIP (18 Digit)</label><input type="text" className={inputClass} value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value.replace(/\D/g, '')})} required disabled={!!formData.id} /></div>
                           <div><label className={labelClass}>NIK (Nomor KTP)</label><input type="text" className={inputClass} value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value.replace(/\D/g, '')})} /></div>
                           <div className="col-span-full"><label className={labelClass}>Nama Nomenklatur Jabatan</label><input type="text" className={inputClass} value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} required /></div>
                           <div><label className={labelClass}>Bagian</label><input type="text" className={inputClass} value={formData.bagian || ''} onChange={e => setFormData({...formData, bagian: e.target.value})} /></div>
                           <div><label className={labelClass}>Sub Bagian</label><input type="text" className={inputClass} value={formData.subBagian || ''} onChange={e => setFormData({...formData, subBagian: e.target.value})} /></div>
                        </div>
                     </section>

                     <section className="space-y-8">
                        <h5 className="text-[11px] font-black text-emerald-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-award"></i> Karir & Pendidikan</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div><label className={labelClass}>Golongan</label><select className={inputClass} value={formData.golRuang} onChange={e => setFormData({...formData, golRuang: e.target.value, pangkat: PANGKAT_MAP[e.target.value] || ''})}><option value="">- Pilih -</option>{Object.keys(PANGKAT_MAP).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                           <div className="md:col-span-2"><label className={labelClass}>Pangkat (Auto)</label><input type="text" className={`${inputClass} bg-gray-100 text-gray-400`} value={formData.pangkat || ''} readOnly /></div>
                           <div><label className={labelClass}>TMT Pangkat</label><input type="text" className={inputClass} value={formData.tmtPangkat || ''} onChange={e => setFormData({...formData, tmtPangkat: e.target.value})} placeholder="DD-MM-YYYY" /></div>
                           <div><label className={labelClass}>TMT Jabatan</label><input type="text" className={inputClass} value={formData.tmtJabatan || ''} onChange={e => setFormData({...formData, tmtJabatan: e.target.value})} /></div>
                           <div><label className={labelClass}>Eselon</label><select className={inputClass} value={formData.eselon} onChange={e => setFormData({...formData, eselon: e.target.value})}><option value="">Non-Eselon</option><option>I.a</option><option>I.b</option><option>II.a</option><option>II.b</option><option>III.a</option><option>III.b</option><option>IV.a</option><option>IV.b</option></select></div>
                           <div><label className={labelClass}>Pendidikan Terakhir</label><input type="text" className={inputClass} value={formData.pendidikan || ''} onChange={e => setFormData({...formData, pendidikan: e.target.value})} /></div>
                           <div className="md:col-span-2"><label className={labelClass}>Jurusan</label><input type="text" className={inputClass} value={formData.jurusan || ''} onChange={e => setFormData({...formData, jurusan: e.target.value})} /></div>
                        </div>
                     </section>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="lg:col-span-4 space-y-12">
                     <section className="space-y-8">
                        <h5 className="text-[11px] font-black text-rose-600 uppercase border-b pb-3 tracking-widest">Status & Kategori</h5>
                        <div className="space-y-6">
                           <div><label className={labelClass}>Jenis Pegawai</label><select className={inputClass} value={formData.jenisPegawai} onChange={e => setFormData({...formData, jenisPegawai: e.target.value})}><option>PNS</option><option>CPNS</option><option>PPPK</option><option>PPPK PARUH WAKTU</option></select></div>
                           <div><label className={labelClass}>Status Aktif</label><select className={inputClass} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option>Aktif</option><option>Cuti</option><option>Tugas Belajar</option><option>Pensiun</option></select></div>
                           <div><label className={labelClass}>Masa Kerja Kumulatif</label><input type="text" className={inputClass} value={formData.masaKerja || ''} onChange={e => setFormData({...formData, masaKerja: e.target.value})} placeholder="10 Thn 5 Bln" /></div>
                        </div>
                     </section>

                     <section className="space-y-8">
                        <h5 className="text-[11px] font-black text-gray-400 uppercase border-b pb-3 tracking-widest">Kontak & Alamat</h5>
                        <div className="space-y-6">
                           <div className="grid grid-cols-2 gap-4">
                              <div><label className={labelClass}>Tempat Lahir</label><input type="text" className={inputClass} value={formData.tempatLahir || ''} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} /></div>
                              <div><label className={labelClass}>Tgl Lahir</label><input type="text" className={inputClass} value={formData.tanggalLahir || ''} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} /></div>
                           </div>
                           <div><label className={labelClass}>Agama</label><select className={inputClass} value={formData.agama} onChange={e => setFormData({...formData, agama: e.target.value})}><option value="">Pilih Agama</option><option>ISLAM</option><option>KRISTEN</option><option>KATOLIK</option><option>HINDU</option><option>BUDHA</option></select></div>
                           <div><label className={labelClass}>Nomor Telepon / WA</label><input type="text" className={inputClass} value={formData.telepon || ''} onChange={e => setFormData({...formData, telepon: e.target.value})} /></div>
                           <div><label className={labelClass}>Alamat Lengkap</label><textarea className={`${inputClass} h-24 resize-none`} value={formData.alamat || ''} onChange={e => setFormData({...formData, alamat: e.target.value})} /></div>
                        </div>
                     </section>
                  </div>
               </div>

               <div className="mt-16 pt-10 border-t flex justify-center gap-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-14 py-5 bg-white border-2 border-gray-200 text-gray-400 rounded-3xl font-black text-[10px] uppercase tracking-widest">Batal</button>
                  <button type="submit" disabled={syncing} className="px-24 py-5 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center gap-4">
                    {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Simpan & Sinkronkan Cloud</span>
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* DOSSIER MODAL */}
      {isDossierModalOpen && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-md" onClick={() => !syncing && setIsDossierModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 animate-modalEnter space-y-8 flex flex-col border border-white/20">
              <div>
                <h4 className="text-2xl font-black uppercase text-gray-950 tracking-tighter">Arsip Dokumen PDF</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Arsip Pegawai: {selectedPegawai?.nama}</p>
              </div>
              
              <div className="space-y-5">
                 <div className="space-y-1.5"><label className={labelClass}>Nama Dokumen</label><input type="text" className={inputClass} value={dossierFormData.fileName || ''} onChange={e => setDossierFormData({...dossierFormData, fileName: e.target.value})} placeholder="Contoh: SK CPNS, Ijazah S1..." /></div>
                 <div className="space-y-1.5"><label className={labelClass}>Keterangan</label><input type="text" className={inputClass} value={dossierFormData.keterangan || ''} onChange={e => setDossierFormData({...dossierFormData, keterangan: e.target.value})} /></div>
                 
                 <div className="mt-8">
                    <div onClick={() => !syncing && dossierInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all hover:border-blue-600 hover:bg-blue-50 group">
                       <i className="bi bi-file-earmark-pdf-fill text-4xl text-gray-300 group-hover:text-rose-500 transition-colors"></i>
                       <p className="text-[10px] font-black text-gray-400 uppercase mt-4 group-hover:text-gray-900 transition-colors">Pilih File PDF (Max 1MB)</p>
                       <input type="file" ref={dossierInputRef} className="hidden" accept="application/pdf" onChange={handleDossierUpload} />
                    </div>
                 </div>
              </div>
              <button onClick={() => setIsDossierModalOpen(false)} className="w-full py-4 text-[10px] font-black text-gray-400 uppercase border border-gray-100 rounded-2xl active:scale-95 transition-all">Batal</button>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default PegawaiPage;
