
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Pegawai, Dossier } from '../types';
import { fetchPegawaiFromSheets, syncTableRemote, uploadFileToDrive, fetchDossiersFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { normalizeUnitName, UNIT_KERJA, resolveEducationInfo } from '../constants';
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
  const [lastSync, setLastSync] = useState<string>('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  const [filterStatus, setFilterStatus] = useState('Semua Status');
  const [filterJenis, setFilterJenis] = useState('Semua Jenis');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'biodata' | 'karir' | 'arsip'>('biodata');
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [formData, setFormData] = useState<Partial<Pegawai>>({});
  
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dossierInputRef = useRef<HTMLInputElement>(null);
  const drhTemplateRef = useRef<HTMLDivElement>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Data berhasil diperbarui.');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pegawaiToDelete, setPegawaiToDelete] = useState<Pegawai | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, dData] = await Promise.all([
        fetchPegawaiFromSheets(),
        fetchDossiersFromSheets()
      ]);
      setPegawaiList(pData);
      setDossierList(dData);
      setLastSync(new Date().toLocaleTimeString('id-ID'));
    } catch (error) {
      console.error("Gagal memuat data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    await loadData();
    logActivity('UPDATE', 'Pegawai', 'Melakukan sinkronisasi manual database pegawai');
    setSyncing(false);
    setSuccessMsg('Database pegawai telah disinkronkan dengan Google Sheets.');
    setShowSuccess(true);
  };

  const filteredPegawai = useMemo(() => {
    return pegawaiList.filter(p => {
      const matchesSearch = p.nama.toLowerCase().includes(searchTerm.toLowerCase()) || p.nip.includes(searchTerm);
      const matchesUnit = filterUnit === 'Semua Unit' || normalizeUnitName(p.unitKerja) === filterUnit;
      const matchesStatus = filterStatus === 'Semua Status' || (p.status || 'Aktif') === filterStatus;
      
      let matchesJenis = true;
      if (filterJenis !== 'Semua Jenis') {
        if (filterJenis === 'PARUH') {
           matchesJenis = (p.jenisPegawai || '').toUpperCase().includes('PARUH');
        } else {
           matchesJenis = (p.jenisPegawai || '').toUpperCase() === filterJenis.toUpperCase();
        }
      }

      return matchesSearch && matchesUnit && matchesStatus && matchesJenis;
    });
  }, [pegawaiList, searchTerm, filterUnit, filterStatus, filterJenis]);

  const employeeDossiers = useMemo(() => {
    if (!selectedPegawai) return [];
    return dossierList.filter(d => d.nip === selectedPegawai.nip);
  }, [selectedPegawai, dossierList]);

  const handleOpenDetail = (p: Pegawai) => {
    setSelectedPegawai(p);
    setDetailTab('biodata');
    setIsDetailOpen(true);
  };

  const handleEdit = (p: Pegawai) => {
    setSelectedPegawai(p);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedPegawai(null);
    setFormData({ 
      status: 'Aktif', 
      jenisPegawai: 'PNS', 
      gender: 'L', 
      agama: 'Islam',
      unitKerja: UNIT_KERJA[0]
    });
    setIsModalOpen(true);
  };

  const autoDetectEducation = (source: string) => {
    const info = resolveEducationInfo(source);
    if (info) {
        setFormData(prev => ({
            ...prev,
            pendidikan: info.display
        }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPegawai) return;

    setUploadingFile(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`FOTO_${selectedPegawai.nip}`, file.type, base64);
      if (res.success && res.fileUrl) {
        const updatedPegawai = { ...selectedPegawai, foto: res.fileUrl };
        await syncTableRemote('PEGAWAI', 'SAVE', updatedPegawai);
        setSelectedPegawai(updatedPegawai);
        loadData();
        setSuccessMsg('Foto profil berhasil diperbarui.');
        setShowSuccess(true);
      }
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDossierUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPegawai) return;

    setUploadingFile(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`ARSIP_${selectedPegawai.nip}_${Date.now()}`, file.type, base64);
      if (res.success && res.fileUrl) {
        const newDossier: Dossier = {
          id: Date.now().toString(),
          nip: selectedPegawai.nip,
          namaPegawai: selectedPegawai.nama,
          tanggal: new Date().toISOString().split('T')[0],
          fileName: file.name,
          fileUrl: res.fileUrl,
          keterangan: 'Upload via Portal Profil'
        };
        await syncTableRemote('DOSSIER', 'SAVE', newDossier);
        loadData();
        setSuccessMsg('Dokumen berhasil ditambahkan ke arsip.');
        setShowSuccess(true);
      }
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePrintDRH = async () => {
    if (!drhTemplateRef.current) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(drhTemplateRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`DRH_${selectedPegawai?.nama.replace(/\s+/g, '_')}.pdf`);
      logActivity('DOWNLOAD', 'Pegawai', `Cetak DRH: ${selectedPegawai?.nama}`);
    } catch (e) {
      alert("Gagal mencetak DRH");
    } finally {
      setSyncing(false);
    }
  };

  const exportToExcel = (mode: 'SHARE' | 'FULL') => {
    let exportData: any[];
    if (mode === 'SHARE') {
      exportData = filteredPegawai.map(p => ({
        'NIP': p.nip,
        'Nama Lengkap': p.nama,
        'Gelar': p.gelar || '',
        'Jabatan': p.jabatan,
        'Unit Kerja': normalizeUnitName(p.unitKerja),
        'Jenis ASN': p.jenisPegawai,
        'Pangkat/Gol': `${p.pangkat || '-'} (${p.golRuang || '-'})`,
        'Status': p.status || 'Aktif'
      }));
    } else {
      exportData = filteredPegawai.map(p => ({ ...p }));
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Pegawai");
    XLSX.writeFile(wb, `Data_Pegawai_${mode}_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={async () => {
          if (!pegawaiToDelete) return;
          setSyncing(true);
          await syncTableRemote('PEGAWAI', 'DELETE', { nip: pegawaiToDelete.nip });
          loadData();
          setIsConfirmOpen(false);
          setSyncing(false);
        }} 
        message={`Hapus data ${pegawaiToDelete?.nama}?`}
      />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Database Kepegawaian</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3 flex items-center gap-3">
            <span className="flex items-center gap-1.5"><i className="bi bi-circle-fill text-emerald-500 text-[6px]"></i> Last Sync: {lastSync || '--:--'}</span>
            <span className="text-gray-200">|</span>
            <span className="flex items-center gap-1.5"><i className="bi bi-people-fill text-blue-600"></i> Total {pegawaiList.length} ASN</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
           <button 
             onClick={handleManualSync} 
             disabled={loading || syncing}
             className="h-12 w-12 flex items-center justify-center bg-white border border-gray-100 text-blue-600 rounded-2xl shadow-sm hover:bg-blue-50 transition-all active:scale-95"
             title="Sinkronkan Ulang Cloud"
           >
              <i className={`bi bi-arrow-clockwise text-xl ${(loading || syncing) ? 'animate-spin' : ''}`}></i>
           </button>
           <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex-1 md:flex-none">
              <button onClick={() => exportToExcel('SHARE')} className="flex-1 px-4 py-2.5 text-[9px] font-black uppercase text-gray-500 hover:bg-gray-50 rounded-xl transition-all">Ringkas</button>
              <button onClick={() => exportToExcel('FULL')} className="flex-1 px-4 py-2.5 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 rounded-xl shadow-inner">Full Excel</button>
           </div>
           {canEdit && (
             <button onClick={handleAddNew} className="flex-1 lg:flex-none h-12 px-8 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-600 transition-all">+ Register ASN</button>
           )}
        </div>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-[2]">
              <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input 
                type="text" 
                placeholder="Cari NIP atau Nama..." 
                className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-xs font-black outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 md:flex flex-[3] gap-3">
                <select className="px-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all flex-1" value={filterJenis} onChange={e => setFilterJenis(e.target.value)}>
                    <option value="Semua Jenis">SEMUA JENIS ASN</option>
                    <option value="PNS">PNS</option>
                    <option value="CPNS">CPNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="PARUH">PARUH WAKTU</option>
                </select>
                <select className="px-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all flex-1" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
                    <option>Semua Unit</option>
                    {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase().substring(0, 20)}...</option>)}
                </select>
                <select className="px-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all flex-1" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option>Semua Status</option>
                    <option>Aktif</option><option>Cuti</option><option>Tugas Belajar</option><option>Pensiun</option>
                </select>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:hidden">
            {loading ? Array(5).fill(0).map((_,i) => <div key={i} className="h-32 bg-white rounded-[2rem] animate-pulse"></div>) : filteredPegawai.map(p => (
                <div key={p.id} className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-4 active:scale-95 transition-all" onClick={() => handleOpenDetail(p)}>
                    <div className="h-16 w-16 rounded-2xl bg-gray-100 overflow-hidden shadow-sm flex-shrink-0">
                        {p.foto ? <img src={p.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-black text-blue-600 text-xl">{p.nama.charAt(0)}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black text-gray-900 uppercase truncate">{p.nama}</p>
                        <p className="text-[9px] font-mono text-blue-600 font-bold mt-1">NIP. {p.nip}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase mt-1 truncate">{p.jabatan}</p>
                    </div>
                    <i className="bi bi-chevron-right text-gray-300"></i>
                </div>
            ))}
        </div>

        <div className="hidden md:block bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-[0.2em]">
                <tr>
                    <th className="px-10 py-6">Identitas Pegawai</th>
                    <th className="px-4 py-6">Jabatan & Unit</th>
                    <th className="px-4 py-6 text-center">Jenis ASN</th>
                    <th className="px-4 py-6 text-center">Status</th>
                    <th className="px-10 py-6 text-right">Aksi</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                {loading ? (
                    <tr><td colSpan={5} className="py-32 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest animate-pulse">Menghubungkan ke Cloud...</td></tr>
                ) : filteredPegawai.map(p => (
                    <tr key={p.id} className="group hover:bg-blue-50/5 transition-all">
                    <td className="px-10 py-6">
                        <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-gray-100 overflow-hidden shadow-sm border-2 border-white ring-1 ring-gray-100 flex-shrink-0">
                            {p.foto ? <img src={p.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-blue-600 font-black text-xl bg-blue-50">{p.nama.charAt(0)}</div>}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[12px] font-black text-gray-950 uppercase truncate max-w-[200px]">{p.nama}{p.gelar ? `, ${p.gelar}` : ''}</p>
                            <p className="text-[9px] font-mono text-blue-600 font-bold mt-1">NIP. {p.nip}</p>
                        </div>
                        </div>
                    </td>
                    <td className="px-4 py-6">
                        <p className="text-[10px] font-black text-gray-700 uppercase line-clamp-1">{p.jabatan}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-tighter">{normalizeUnitName(p.unitKerja)}</p>
                    </td>
                    <td className="px-4 py-6 text-center">
                        <span className={`px-2.5 py-1 text-[8px] font-black uppercase rounded-lg border ${(p.jenisPegawai||'').toUpperCase().includes('PARUH') ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>{p.jenisPegawai}</span>
                    </td>
                    <td className="px-4 py-6 text-center">
                        <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg border ${p.status==='Aktif'?'bg-emerald-50 text-emerald-600 border-emerald-100':'bg-gray-50 text-gray-400'}`}>{p.status||'Aktif'}</span>
                    </td>
                    <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleOpenDetail(p)} className="h-10 w-10 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded-xl shadow-sm hover:bg-blue-600 hover:text-white transition-all"><i className="bi bi-person-badge text-lg"></i></button>
                        {canEdit && (
                            <>
                            <button onClick={() => handleEdit(p)} className="h-10 w-10 flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100 rounded-xl shadow-sm hover:bg-amber-600 hover:text-white transition-all"><i className="bi bi-pencil-square text-lg"></i></button>
                            {isSuperadmin && (
                                <button onClick={() => { setPegawaiToDelete(p); setIsConfirmOpen(true); }} className="h-10 w-10 flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-100 rounded-xl shadow-sm hover:bg-rose-600 hover:text-white transition-all"><i className="bi bi-trash text-lg"></i></button>
                            )}
                            </>
                        )}
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
      </div>

      {/* DETAIL MODAL - IMPROVED DESIGN & FLEXIBLE SIZE */}
      {isDetailOpen && selectedPegawai && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-6 lg:p-12">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setIsDetailOpen(false)}></div>
           <div className="relative bg-white w-full max-w-7xl md:rounded-[4rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col h-full md:max-h-[90vh] border border-white/20">
              
              <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                 {/* Sidebar / Profile Panel */}
                 <div className="lg:w-96 bg-gray-50/80 border-r border-gray-100 p-8 md:p-12 flex flex-col items-center shrink-0">
                    <div className="relative group">
                       <div className="h-44 w-44 rounded-[3.5rem] bg-white shadow-2xl p-2 border-4 border-white ring-1 ring-gray-200 overflow-hidden relative">
                          {selectedPegawai.foto ? (
                             <img src={selectedPegawai.foto} className="h-full w-full object-cover rounded-[3rem]" alt={selectedPegawai.nama} />
                          ) : (
                             <div className="h-full w-full flex items-center justify-center text-5xl font-black text-blue-600 bg-blue-50 rounded-[3rem]">{selectedPegawai.nama.charAt(0)}</div>
                          )}
                       </div>
                       {canEdit && (
                          <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 h-14 w-14 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl border-4 border-white hover:scale-110 active:scale-95 transition-all">
                             <i className={`bi ${uploadingFile ? 'animate-spin bi-arrow-repeat' : 'bi-camera-fill'} text-xl`}></i>
                          </button>
                       )}
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </div>
                    
                    <div className="text-center mt-8 space-y-3 w-full px-4">
                       <h4 className="text-2xl font-black text-gray-950 uppercase leading-tight tracking-tighter">
                          {selectedPegawai.nama}{selectedPegawai.gelar ? `, ${selectedPegawai.gelar}` : ''}
                       </h4>
                       <div className="flex flex-col items-center gap-1.5">
                          <p className="text-[11px] font-mono font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">NIP. {selectedPegawai.nip}</p>
                          <span className={`mt-2 px-4 py-1 rounded-full text-[9px] font-black uppercase border ${selectedPegawai.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                            {selectedPegawai.status || 'Aktif'}
                          </span>
                       </div>
                    </div>

                    <div className="w-full mt-12 space-y-2 grid grid-cols-3 lg:grid-cols-1 gap-2">
                       {[
                         { id: 'biodata', label: 'Biodata & Kontak', icon: 'bi-person-vcard-fill' },
                         { id: 'karir', label: 'Struktural & Karir', icon: 'bi-briefcase-fill' },
                         { id: 'arsip', label: 'Digital Dossier', icon: 'bi-folder-fill' }
                       ].map(tab => (
                         <button 
                           key={tab.id}
                           onClick={() => setDetailTab(tab.id as any)} 
                           className={`py-5 px-6 rounded-3xl text-[10px] font-black uppercase transition-all flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-4 ${detailTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-gray-400 hover:bg-white hover:text-gray-900 hover:shadow-sm'}`}
                         >
                            <i className={`bi ${tab.icon} text-xl`}></i> 
                            <span className="hidden lg:inline">{tab.label}</span>
                         </button>
                       ))}
                    </div>

                    <div className="mt-auto pt-10 w-full space-y-3 hidden lg:block">
                       {canEdit && (
                         <button onClick={() => handleEdit(selectedPegawai)} className="w-full py-4.5 bg-amber-500 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-amber-500/20">
                            <i className="bi bi-pencil-square text-lg"></i>
                            Edit Profil ASN
                         </button>
                       )}
                       <button onClick={handlePrintDRH} disabled={syncing} className="w-full py-4.5 bg-gray-950 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 transition-all shadow-2xl">
                          {syncing ? <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-file-earmark-pdf-fill text-lg text-rose-500"></i>}
                          Cetak DRH Resmi
                       </button>
                    </div>
                 </div>

                 {/* Content Area */}
                 <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    <div className="p-8 md:p-12 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
                       <div>
                          <h5 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.2em]">
                             {detailTab === 'arsip' ? 'Arsip Berkas Digital' : 'Data Kepegawaian DJKI'}
                          </h5>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Verified Personnel Cloud Database</p>
                       </div>
                       <button onClick={() => setIsDetailOpen(false)} className="h-12 w-12 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><i className="bi bi-x-lg text-2xl"></i></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                       {detailTab === 'biodata' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 animate-fadeIn">
                             <div className="space-y-10">
                                <h6 className="text-[11px] font-black text-blue-600 uppercase border-b-2 border-blue-100 pb-4 tracking-widest flex items-center gap-3"><i className="bi bi-card-list"></i> Identitas Personal</h6>
                                <div className="space-y-8">
                                   <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Nama Lengkap & Gelar</p><p className="text-base font-black text-gray-800 uppercase tracking-tight">{selectedPegawai.nama}{selectedPegawai.gelar ? `, ${selectedPegawai.gelar}` : ''}</p></div>
                                   <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Tempat, Tanggal Lahir</p><p className="text-base font-black text-gray-800 uppercase tracking-tight">{selectedPegawai.tempatLahir || '-'}, {selectedPegawai.tanggalLahir || '-'}</p></div>
                                   <div className="grid grid-cols-2 gap-6">
                                      <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Gender</p><p className="text-base font-black text-gray-800 uppercase tracking-tight">{selectedPegawai.gender==='L'?'Laki-laki':'Perempuan'}</p></div>
                                      <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Agama</p><p className="text-base font-black text-gray-800 uppercase tracking-tight">{selectedPegawai.agama || '-'}</p></div>
                                   </div>
                                   <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Pendidikan Terakhir</p><p className="text-base font-black text-gray-800 uppercase tracking-tight">{selectedPegawai.pendidikan || '-'}</p></div>
                                </div>
                             </div>
                             <div className="space-y-10">
                                <h6 className="text-[11px] font-black text-rose-600 uppercase border-b-2 border-rose-100 pb-4 tracking-widest flex items-center gap-3"><i className="bi bi-geo-alt-fill"></i> Kontak & Domisili</h6>
                                <div className="space-y-8">
                                   <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">No. Telepon / WhatsApp</p><p className="text-base font-black text-emerald-600 uppercase tracking-tight">{selectedPegawai.telepon || '-'}</p></div>
                                   <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Alamat Domisili (KTP)</p><p className="text-base font-black text-gray-800 uppercase leading-relaxed tracking-tight">{selectedPegawai.alamat || '-'}</p></div>
                                </div>
                                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 mt-6">
                                   <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-3">Sistem Verifikasi</p>
                                   <p className="text-[10px] font-bold text-blue-900 uppercase leading-relaxed">Seluruh data personal ASN telah tersinkronisasi dengan Master Database Kepegawaian DJKI Kemenkumham RI.</p>
                                </div>
                             </div>
                          </div>
                       )}

                       {detailTab === 'karir' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 animate-fadeIn">
                             <div className="space-y-10">
                                <h6 className="text-[11px] font-black text-blue-600 uppercase border-b-2 border-blue-100 pb-4 tracking-widest flex items-center gap-3"><i className="bi bi-briefcase-fill"></i> Jabatan & Unit</h6>
                                <div className="space-y-8">
                                   <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Unit Kerja Pengampu</p><p className="text-base font-black text-indigo-600 uppercase leading-snug tracking-tight">{normalizeUnitName(selectedPegawai.unitKerja)}</p></div>
                                   <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Nomenklatur Jabatan</p><p className="text-base font-black text-gray-800 uppercase leading-snug tracking-tight">{selectedPegawai.jabatan}</p></div>
                                   <div className="grid grid-cols-2 gap-6">
                                      <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Eselon</p><p className="text-base font-black text-gray-800 uppercase tracking-tight">{selectedPegawai.eselon || '-'}</p></div>
                                      <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">TMT Jabatan</p><p className="text-base font-black text-gray-800 tracking-tight">{selectedPegawai.tmtJabatan || '-'}</p></div>
                                   </div>
                                </div>
                             </div>
                             <div className="space-y-10">
                                <h6 className="text-[11px] font-black text-emerald-600 uppercase border-b-2 border-emerald-100 pb-4 tracking-widest flex items-center gap-3"><i className="bi bi-patch-check-fill"></i> Kepangkatan & Status</h6>
                                <div className="space-y-8">
                                   <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Jenis Kepegawaian</p><p className="text-base font-black text-gray-800 uppercase tracking-tight">{selectedPegawai.jenisPegawai}</p></div>
                                   <div className="grid grid-cols-2 gap-6">
                                      <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Pangkat</p><p className="text-base font-black text-gray-800 uppercase tracking-tight">{selectedPegawai.pangkat || '-'}</p></div>
                                      <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Golongan</p><p className="text-base font-black text-gray-800 uppercase tracking-tight">{selectedPegawai.golRuang || '-'}</p></div>
                                   </div>
                                   <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">TMT Pangkat Terakhir</p><p className="text-base font-black text-gray-800 tracking-tight">{selectedPegawai.tmtPangkat || '-'}</p></div>
                                   <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between">
                                      <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Keaktifan</p><p className="text-sm font-black text-blue-600 uppercase">{selectedPegawai.status || 'Aktif'}</p></div>
                                      <i className="bi bi-shield-check text-2xl text-emerald-500"></i>
                                   </div>
                                </div>
                             </div>
                          </div>
                       )}

                       {detailTab === 'arsip' && (
                          <div className="space-y-8 animate-fadeIn">
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                <div>
                                   <h6 className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Dossier Berkas Digital ({employeeDossiers.length})</h6>
                                   <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Penyimpanan Terenkripsi Google Drive</p>
                                </div>
                                {canEdit && (
                                   <>
                                      <button onClick={() => dossierInputRef.current?.click()} className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-3">
                                         <i className="bi bi-cloud-arrow-up-fill text-lg"></i> Upload Berkas Baru
                                      </button>
                                      <input type="file" ref={dossierInputRef} className="hidden" onChange={handleDossierUpload} />
                                   </>
                                )}
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {employeeDossiers.length > 0 ? employeeDossiers.map(d => (
                                   <div key={d.id} className="p-6 bg-white border-2 border-gray-50 rounded-[2.5rem] flex flex-col group hover:border-blue-200 transition-all shadow-sm hover:shadow-xl">
                                      <div className="flex items-center gap-5 mb-6">
                                         <div className="h-14 w-14 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                                            <i className="bi bi-file-earmark-pdf-fill text-2xl"></i>
                                         </div>
                                         <div className="min-w-0">
                                            <p className="text-[11px] font-black text-gray-950 uppercase truncate">{d.fileName}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">{d.tanggal}</p>
                                         </div>
                                      </div>
                                      <div className="mt-auto flex gap-2">
                                         <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 bg-gray-50 text-gray-600 hover:bg-blue-600 hover:text-white rounded-xl text-[9px] font-black uppercase text-center border transition-all">Pratinjau</a>
                                         {canEdit && <button className="h-10 w-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"><i className="bi bi-trash"></i></button>}
                                      </div>
                                   </div>
                                )) : (
                                   <div className="col-span-full py-24 text-center opacity-30">
                                      <i className="bi bi-folder2-open text-7xl text-gray-200 mb-6 block"></i>
                                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Belum ada berkas terunggah di cloud</p>
                                   </div>
                                )}
                             </div>
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* REGISTRATION / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-4">
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-5xl md:rounded-[3.5rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col h-full md:max-h-[95vh] border border-white/20">
            <div className="p-6 md:p-8 border-b bg-gray-50/50 flex justify-between items-center shrink-0">
               <div>
                  <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter leading-none">{formData.id ? 'Perbarui Data ASN' : 'Registrasi ASN Baru'}</h4>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">Sinkronisasi Cloud Real-Time</p>
               </div>
               <button onClick={() => !syncing && setIsModalOpen(false)} className="h-10 w-10 text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
            </div>
            
            <form onSubmit={async (e) => {
               e.preventDefault();
               setSyncing(true);
               const payload = { ...formData, id: formData.id || Date.now().toString(), nip: formData.nip?.replace(/\s/g, '') };
               const ok = await syncTableRemote('PEGAWAI', 'SAVE', payload);
               if(ok) { 
                 await loadData(); 
                 if(selectedPegawai && selectedPegawai.id === payload.id) {
                    setSelectedPegawai(payload as Pegawai);
                 }
                 setIsModalOpen(false); 
                 setSuccessMsg('Database pegawai telah diperbarui.');
                 setShowSuccess(true); 
               }
               setSyncing(false);
            }} className="p-6 md:p-10 overflow-y-auto custom-scrollbar space-y-10">
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                     <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest flex items-center gap-3"><i className="bi bi-1-circle-fill"></i> Data Kepegawaian</h5>
                     <div className="space-y-4">
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-gray-500 uppercase ml-3">Nama Lengkap (Tanpa Gelar)</label>
                           <input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-600 transition-all" value={formData.nama || ''} onChange={e => {
                               setFormData({...formData, nama: e.target.value});
                               autoDetectEducation(e.target.value);
                           }} required />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-gray-500 uppercase ml-3">Penulisan Gelar</label>
                           <input type="text" placeholder="Contoh: S.H. / M.Si. / S.Tr.Im." className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-600 transition-all" value={formData.gelar || ''} onChange={e => {
                               setFormData({...formData, gelar: e.target.value});
                               autoDetectEducation(e.target.value);
                           }} />
                        </div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase ml-3">NIP 18 Digit</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600 transition-all" value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value})} required /></div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase ml-3">Jenis ASN</label><select className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none" value={formData.jenisPegawai} onChange={e => setFormData({...formData, jenisPegawai: e.target.value})}><option value="PNS">PNS</option><option value="CPNS">CPNS</option><option value="PPPK">PPPK Full Time</option><option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option></select></div>
                           <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase ml-3">Status</label><select className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option>Aktif</option><option>Cuti</option><option>Pensiun</option></select></div>
                        </div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase ml-3">Unit Kerja</label><select className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none" value={formData.unitKerja} onChange={e => setFormData({...formData, unitKerja: e.target.value})}>{UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}</select></div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase ml-3">Nomenklatur Jabatan</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-600" value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} /></div>
                     </div>
                  </div>
                  
                  <div className="space-y-6">
                     <h5 className="text-[10px] font-black text-rose-600 uppercase border-b pb-3 tracking-widest flex items-center gap-3"><i className="bi bi-2-circle-fill"></i> Data Personal</h5>
                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase ml-3">Tempat Lahir</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none" value={formData.tempatLahir || ''} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} /></div>
                           <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase ml-3">Tgl Lahir</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none" value={formData.tanggalLahir || ''} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} placeholder="DD-MM-YYYY" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Agama</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none" value={formData.agama || ''} onChange={e => setFormData({...formData, agama: e.target.value})} /></div>
                           <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Telepon / WA</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none" value={formData.telepon || ''} onChange={e => setFormData({...formData, telepon: e.target.value})} /></div>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Pendidikan Terakhir (Jenjang & Jurusan)</label>
                           <div className="relative">
                               <input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 border-blue-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-600" value={formData.pendidikan || ''} onChange={e => setFormData({...formData, pendidikan: e.target.value})} />
                               <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                  <i className="bi bi-magic text-blue-500" title="Terisi Otomatis Berdasarkan Gelar"></i>
                               </div>
                           </div>
                        </div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Alamat Domisili</label><textarea rows={3} className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold uppercase outline-none focus:border-blue-600 resize-none" value={formData.alamat || ''} onChange={e => setFormData({...formData, alamat: e.target.value})} /></div>
                     </div>
                  </div>
               </div>

            </form>

            <div className="p-6 md:p-8 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 md:flex-none px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Batal</button>
               <button onClick={async (e: any) => {
                  setSyncing(true);
                  const payload = { ...formData, id: formData.id || Date.now().toString() };
                  const ok = await syncTableRemote('PEGAWAI', 'SAVE', payload);
                  if(ok) { 
                    await loadData(); 
                    if(selectedPegawai && selectedPegawai.id === payload.id) {
                      setSelectedPegawai(payload as Pegawai);
                    }
                    setIsModalOpen(false); 
                    setSuccessMsg('Data ASN berhasil disimpan ke cloud.');
                    setShowSuccess(true); 
                  }
                  setSyncing(false);
               }} disabled={syncing} className="flex-[1.5] md:flex-none px-16 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 disabled:bg-blue-300 flex items-center justify-center gap-3 transition-all">
                  {syncing ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-arrow-up-fill text-lg"></i>}
                  <span>{syncing ? 'Memproses...' : 'Simpan Database'}</span>
               </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default PegawaiPage;
