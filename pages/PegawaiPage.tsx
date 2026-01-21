
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PANGKAT_MAP, getPangkatFromGol, UNIT_KERJA, PENDIDIKAN_LIST, normalizeUnitName } from '../constants';
import { Pegawai, Dossier } from '../types';
import { fetchPegawaiFromSheets, updatePegawaiRemote, syncTableRemote } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const JENIS_PEGAWAI_OPTIONS = ['PNS', 'CPNS', 'PPPK', 'PPPK PARUH WAKTU', 'HONORER'];
const STATUS_OPTIONS = ['Aktif', 'Cuti', 'Tugas Belajar', 'Pensiun', 'Tidak Aktif'];
const AGAMA_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Budha', 'Konghucu', 'Lainnya'];
const GOLONGAN_OPTIONS = Object.keys(PANGKAT_MAP);

const InfoItem = ({ label, value, icon, color = "text-gray-950", fullWidth = false }: { label: string, value: string | number | undefined, icon?: string, color?: string, fullWidth?: boolean }) => (
  <div className={`space-y-1.5 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-md transition-all duration-300 ${fullWidth ? 'col-span-full' : ''}`}>
    <div className="flex items-center space-x-2">
      {icon && <i className={`bi ${icon} text-[10px] md:text-[11px] text-blue-600`}></i>}
      <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] leading-none">{label}</p>
    </div>
    <p className={`text-[12px] md:text-[13px] font-black uppercase leading-tight break-words ${color}`}>{value || '-'}</p>
  </div>
);

const SectionHeader = ({ label, icon, color }: { label: string, icon: string, color: string }) => (
  <div className="flex items-center gap-3 mb-4 md:mb-5 border-b border-gray-100 pb-3 col-span-full mt-6 first:mt-0">
    <div className={`h-8 w-8 md:h-10 md:w-10 rounded-xl md:rounded-2xl ${color} text-white flex items-center justify-center shadow-lg`}>
      <i className={`bi ${icon} text-xs md:text-sm`}></i>
    </div>
    <h5 className="text-[9px] md:text-[11px] font-black text-gray-950 uppercase tracking-[0.2em]">{label}</h5>
  </div>
);

const FormInput = ({ label, type = "text", value, onChange, placeholder = "", options = [] }: { label: string, type?: string, value: any, onChange: (val: any) => void, placeholder?: string, options?: string[] }) => (
  <div className="space-y-1.5">
    <label className="text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">{label}</label>
    {type === "select" ? (
      <select 
        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 transition-all"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">-- Pilih {label} --</option>
        {options.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
      </select>
    ) : type === "textarea" ? (
      <textarea 
        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-bold text-gray-700 outline-none focus:border-blue-600 transition-all resize-none"
        rows={3}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input 
        type={type}
        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 transition-all"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
  </div>
);

const PegawaiPage = () => {
  const { user, canEdit, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drhRef = useRef<HTMLDivElement>(null);
  
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Berhasil Disimpan');
  
  const [activeTab, setActiveTab] = useState<'biodata' | 'dossier'>('biodata');
  const [activePegawai, setActivePegawai] = useState<Pegawai | null>(null);
  const [formData, setFormData] = useState<Partial<Pegawai>>({});
  
  const [dossiers, setDossiers] = useState<Dossier[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPegawaiFromSheets();
      setPegawaiList(data);
      localStorage.setItem('portal_pegawai_db', JSON.stringify(data));
      if (activePegawai) {
        const updatedDetail = data.find(p => p.nip === activePegawai.nip);
        if (updatedDetail) setActivePegawai(updatedDetail);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadDossiers = (nip: string) => {
    const saved = localStorage.getItem('portal_dossiers_db');
    if (saved) {
      const allDossiers: Dossier[] = JSON.parse(saved);
      setDossiers(allDossiers.filter(d => d.nip === nip));
    } else { setDossiers([]); }
  };

  const filteredPegawai = pegawaiList.filter(p => {
    if (isViewer) return p.nip === user?.nip;
    const term = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || [p.nama, p.nip, p.jabatan, p.unitKerja].some(f => f?.toLowerCase().includes(term));
    const matchesUnit = filterUnit === 'Semua Unit' || normalizeUnitName(p.unitKerja) === filterUnit;
    return matchesSearch && matchesUnit;
  });

  const handleOpenDetail = (p: Pegawai) => { 
    setActivePegawai(p); 
    setActiveTab('biodata');
    loadDossiers(p.nip);
    setIsDetailModalOpen(true); 
  };
  
  const handleEdit = (p: Pegawai) => { 
    setActivePegawai(p);
    setFormData({ ...p });
    setIsFormModalOpen(true); 
  };

  const handleDelete = async (p: Pegawai) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data pegawai "${p.nama}" secara permanen dari Cloud? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    setSyncingCloud(true);
    try {
      const success = await syncTableRemote('PEGAWAI', 'DELETE', { id: p.id });
      
      if (success) {
        await loadData();
        setSuccessTitle('Pegawai Berhasil Dihapus');
        setShowSuccess(true);
        logActivity('DELETE', 'Pegawai', `Menghapus data pegawai: ${p.nama} (NIP. ${p.nip})`);
      } else {
        alert("Gagal menghapus data dari Cloud. Silakan periksa koneksi atau hak akses Apps Script.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat mencoba menghapus data.");
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleEditFromDetail = () => {
    if (activePegawai) {
      setFormData({ ...activePegawai });
      setIsDetailModalOpen(false);
      setIsFormModalOpen(true);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        alert("Ukuran foto terlalu besar. Maksimal 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, foto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.nama || !formData.nip) return alert("Nama dan NIP wajib diisi!");
    setSyncingCloud(true);
    try {
      const targetId = formData.id || Date.now().toString();
      const payload = { ...formData, id: targetId, driveFolderId: formData.driveFolderId || '' } as Pegawai;
      
      const success = await updatePegawaiRemote(payload);
      
      if (success) {
        await loadData();
        setIsFormModalOpen(false);
        setSuccessTitle('Profil Tersimpan');
        setShowSuccess(true);
        logActivity('UPDATE', 'Pegawai', `Update data & foto pegawai: ${payload.nama}`);
      } else {
        alert("Gagal sinkronisasi ke Cloud. Periksa koneksi.");
      }
    } catch (err) { 
      alert("Terjadi kesalahan sinkronisasi."); 
    } finally { 
      setSyncingCloud(false); 
    }
  };

  const handleExportExcel = (isFull: boolean) => {
    const exportData = filteredPegawai.map(p => {
      if (isFull) {
        return {
          'NIP': ` ${p.nip}`, 
          'NAMA': p.nama,
          'JABATAN': p.jabatan,
          'UNIT KERJA': p.unitKerja,
          'GENDER': p.gender === 'L' ? 'Laki-laki' : 'Perempuan',
          'GOL/RUANG': p.golRuang,
          'PANGKAT': p.pangkat,
          'TMT PANGKAT': p.tmtPangkat,
          'PENDIDIKAN': p.pendidikan,
          'STATUS': p.status,
          'TEMPAT LAHIR': p.tempatLahir,
          'TANGGAL LAHIR': p.tanggalLahir,
          'TELEPON': p.telepon,
          'ALAMAT': p.alamat,
          'AGAMA': p.agama,
          'ESELON': p.eselon,
          'BIDANG STUDI': p.bidang,
          'TMT JABATAN': p.tmtJabatan,
          'TMT ASN': p.tmtStatus
        };
      } else {
        return {
          'NIP': ` ${p.nip}`, 
          'NAMA': p.nama,
          'JABATAN': p.jabatan,
          'UNIT KERJA': p.unitKerja,
          'TELEPON': p.telepon
        };
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Pegawai");
    XLSX.writeFile(wb, `Data_Pegawai_${isFull ? 'Lengkap' : 'Share'}_${new Date().getTime()}.xlsx`);
    logActivity('DOWNLOAD', 'Pegawai', `Export Excel ${isFull ? 'Full' : 'Share'}`);
  };

  const handleDownloadDRH = async () => {
    if (!drhRef.current || !activePegawai) return;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const canvas = await html2canvas(drhRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const imgProps = doc.getImageProperties(imgData);
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    doc.save(`DRH_${activePegawai.nip}_${activePegawai.nama.replace(/\s+/g, '_')}.pdf`);
    logActivity('DOWNLOAD', 'Pegawai', `Cetak DRH PDF: ${activePegawai.nama}`);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-24 lg:pb-10">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title={successTitle} />

      {/* Header Filters */}
      <div className="flex flex-col xl:flex-row gap-4 no-print">
        <div className="relative group flex-1">
          <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"></i>
          <input type="text" placeholder="Cari Nama, NIP, atau Jabatan..." className="w-full pl-12 pr-6 py-4 md:py-5 bg-white border-2 border-gray-100 rounded-2xl md:rounded-3xl focus:border-blue-600 shadow-sm text-[13px] md:text-[14px] font-black text-gray-950 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
            <select className="flex-1 xl:flex-none px-4 md:px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl md:rounded-3xl text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-600" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
                <option value="Semua Unit">Seluruh Unit Kerja</option>
                {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
            </select>
            
            <div className="flex flex-1 xl:flex-none bg-emerald-50 rounded-2xl md:rounded-3xl border-2 border-emerald-100 overflow-hidden shadow-sm">
                <button onClick={() => handleExportExcel(false)} className="px-4 py-4 text-emerald-600 font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 border-r border-emerald-100">
                    <i className="bi bi-share-fill"></i>
                    <span className="hidden sm:inline">Share</span>
                </button>
                <button onClick={() => handleExportExcel(true)} className="px-4 py-4 text-emerald-700 font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 hover:text-white transition-all flex items-center gap-2">
                    <i className="bi bi-database-fill-down"></i>
                    <span className="hidden sm:inline">Full Data</span>
                </button>
            </div>

            {canEdit && <button onClick={() => { setFormData({status:'Aktif', jenisPegawai:'PNS', unitKerja: UNIT_KERJA[0]}); setIsFormModalOpen(true); }} className="flex-1 xl:flex-none px-6 md:px-10 py-4 bg-blue-600 text-white rounded-2xl md:rounded-3xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">+ Register ASN</button>}
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[9px] font-black border-b border-gray-100 tracking-widest">
              <tr><th className="px-10 py-6">Profil ASN</th><th className="px-4 py-6">Unit / Jabatan</th><th className="px-4 py-6 text-center">Gol</th><th className="px-4 py-6 text-center">Status</th><th className="px-10 py-6 text-right">Opsi</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-32 text-center text-[11px] font-black text-gray-300 uppercase animate-pulse">Sinkronisasi Database Cloud...</td></tr>
              ) : filteredPegawai.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/10 group transition-all">
                  <td className="px-10 py-5">
                    <div className="flex items-center space-x-5">
                      <div className="h-12 w-12 rounded-2xl overflow-hidden bg-gray-50 border-2 border-white shadow-xl flex items-center justify-center font-black text-blue-600">
                        {p.foto ? <img src={p.foto} className="h-full w-full object-cover" /> : p.nama.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-black text-gray-950 uppercase truncate leading-none mb-1.5">{p.nama}</p>
                        <p className="text-[10px] font-mono text-blue-600 font-bold tracking-tighter">NIP. {p.nip}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5"><p className="text-[11px] font-black text-gray-700 uppercase truncate max-w-[220px] leading-tight">{p.jabatan}</p><p className="text-[9px] text-gray-400 font-bold uppercase mt-1 truncate max-w-[180px]">{normalizeUnitName(p.unitKerja)}</p></td>
                  <td className="px-4 py-5 text-center"><span className="px-3 py-1 bg-gray-50 text-gray-900 text-[10px] font-black rounded-lg border">{p.golRuang || '-'}</span></td>
                  <td className="px-4 py-5 text-center"><span className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg border ${p.status === 'Aktif' || !p.status ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{p.status || 'Aktif'}</span></td>
                  <td className="px-10 py-5 text-right"><div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleOpenDetail(p)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm transition-all"><i className="bi bi-eye-fill"></i></button>{canEdit && <><button onClick={() => handleEdit(p)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-white rounded-xl shadow-sm transition-all"><i className="bi bi-pencil-square"></i></button><button onClick={() => handleDelete(p)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-white rounded-xl shadow-sm transition-all"><i className="bi bi-trash-fill"></i></button></>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL PREMIUM */}
      {isDetailModalOpen && activePegawai && (
        <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-6 lg:p-10 overflow-hidden">
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-xl animate-fadeIn" onClick={() => setIsDetailModalOpen(false)}></div>
          <div className="relative bg-[#F9FAFB] w-full max-w-7xl h-[92vh] md:h-auto md:max-h-[95dvh] rounded-t-[3rem] md:rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter border border-white/10">
             
             {/* Modal Detail Header */}
             <div className="px-6 md:px-12 py-8 md:py-10 bg-white border-b border-gray-100 flex flex-col md:flex-row justify-between items-center shrink-0 gap-6">
                <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left w-full md:w-auto">
                   <div className="h-28 w-28 md:h-36 md:w-36 rounded-[2.5rem] md:rounded-[3rem] overflow-hidden bg-gray-50 border-4 md:border-8 border-white shadow-2xl shrink-0">
                    {activePegawai.foto ? <img src={activePegawai.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center bg-blue-600 text-white font-black text-3xl md:text-4xl">{activePegawai.nama.charAt(0)}</div>}
                   </div>
                   <div className="min-w-0">
                      <h4 className="text-xl md:text-3xl font-black uppercase text-gray-950 tracking-tighter leading-tight mb-2 truncate max-w-full">{activePegawai.nama}</h4>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <span className="px-3 py-1 bg-gray-900 text-white text-[8px] md:text-[9px] font-black rounded-lg uppercase tracking-widest">{activePegawai.jenisPegawai}</span>
                        <span className={`px-3 py-1 text-[8px] md:text-[9px] font-black uppercase rounded-lg border ${activePegawai.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{activePegawai.status}</span>
                        <p className="text-lg md:text-xl font-bold text-blue-600 tracking-tighter font-mono">NIP. {activePegawai.nip}</p>
                      </div>
                   </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-xl md:rounded-[2rem] w-full md:w-auto overflow-hidden">
                        <button onClick={() => setActiveTab('biodata')} className={`flex-1 md:flex-none px-6 md:px-10 py-3 text-[9px] font-black uppercase rounded-lg md:rounded-2xl transition-all ${activeTab === 'biodata' ? 'bg-white text-gray-950 shadow-md border border-gray-200' : 'text-gray-500'}`}>Biodata</button>
                        <button onClick={() => setActiveTab('dossier')} className={`flex-1 md:flex-none px-6 md:px-10 py-3 text-[9px] font-black uppercase rounded-lg md:rounded-2xl transition-all ${activeTab === 'dossier' ? 'bg-white text-gray-950 shadow-md border border-gray-200' : 'text-gray-500'}`}>Arsip Digital</button>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={handleEditFromDetail} className="flex-1 sm:flex-none px-6 py-3.5 bg-amber-500 text-white rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Edit Profil</button>
                        <button onClick={() => { setIsDetailModalOpen(false); handleDelete(activePegawai); }} className="h-12 w-12 bg-rose-500 text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20 active:scale-95 transition-all"><i className="bi bi-trash-fill text-lg"></i></button>
                      </div>
                    )}
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar bg-gray-50/50">
                {activeTab === 'biodata' ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-10 animate-fadeIn items-start">
                      {/* Section 1: Identitas & Kelahiran */}
                      <div className="space-y-4">
                         <SectionHeader label="Identitas & Kelahiran" icon="bi-person-badge-fill" color="bg-blue-600" />
                         <div className="grid grid-cols-1 gap-3 md:gap-4">
                            <InfoItem label="Gender" value={activePegawai.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'} icon="bi-gender-ambiguous" />
                            <InfoItem label="Tempat Lahir" value={activePegawai.tempatLahir} icon="bi-geo-alt-fill" />
                            <InfoItem label="Tanggal Lahir" value={activePegawai.tanggalLahir} icon="bi-calendar-event" />
                            <InfoItem label="Agama" value={activePegawai.agama} icon="bi-heart-fill" />
                            <InfoItem label="Alamat" value={activePegawai.alamat} icon="bi-house-fill" fullWidth />
                         </div>
                      </div>
                      {/* Section 2: Jabatan & Karir */}
                      <div className="space-y-4">
                         <SectionHeader label="Penempatan & Karir" icon="bi-briefcase-fill" color="bg-emerald-600" />
                         <div className="grid grid-cols-1 gap-3 md:gap-4">
                            <InfoItem label="Unit Kerja" value={activePegawai.unitKerja} icon="bi-diagram-3-fill" color="text-emerald-700" />
                            <InfoItem label="Jabatan" value={activePegawai.jabatan} icon="bi-person-workspace" color="text-emerald-700" />
                            <InfoItem label="TMT Jabatan" value={activePegawai.tmtJabatan} icon="bi-clock-history" />
                            <InfoItem label="Klasifikasi" value={activePegawai.klasifikasiJabatan} icon="bi-tags-fill" />
                            <InfoItem label="Pangkat / Gol" value={`${activePegawai.pangkat || '-'} (${activePegawai.golRuang || '-'})`} icon="bi-award-fill" color="text-amber-600" />
                            <InfoItem label="TMT Pangkat" value={activePegawai.tmtPangkat} icon="bi-calendar-check" />
                         </div>
                      </div>
                      {/* Section 3: Pendidikan & Kontak */}
                      <div className="space-y-4">
                         <SectionHeader label="Pendidikan & Kontak" icon="bi-mortarboard-fill" color="bg-indigo-600" />
                         <div className="grid grid-cols-1 gap-3 md:gap-4">
                            <InfoItem label="Jenjang Terakhir" value={activePegawai.pendidikan} icon="bi-mortarboard-fill" color="text-indigo-700" />
                            <InfoItem label="Bidang Studi" value={activePegawai.bidang} icon="bi-book-half" />
                            <InfoItem label="Eselon / Level" value={activePegawai.eselon} icon="bi-bar-chart-fill" />
                            <InfoItem label="TMT Status" value={activePegawai.tmtStatus} icon="bi-shield-check" />
                            <InfoItem label="Nomor Telepon" value={activePegawai.telepon} icon="bi-telephone-fill" color="text-blue-700" />
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="animate-fadeIn space-y-6 md:space-y-8">
                      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 gap-4">
                         <h4 className="text-xl md:text-2xl font-black uppercase text-gray-950 tracking-tighter leading-none">Arsip Digital ASN</h4>
                         <Link to="/dossiers" className="w-full md:w-auto px-10 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl transition-all text-center">Kelola Seluruh Arsip</Link>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                         {dossiers.map(d => (
                            <div key={d.id} className="p-6 md:p-8 bg-white rounded-[2rem] border border-gray-100 flex flex-col hover:shadow-xl transition-all group relative">
                               <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner group-hover:bg-rose-600 group-hover:text-white transition-all mb-6"><i className="bi bi-file-earmark-pdf-fill text-2xl"></i></div>
                               <div className="flex-1">
                                  <p className="text-[12px] font-black text-gray-950 uppercase truncate leading-none mb-2">{d.fileName}</p>
                                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{d.tanggal}</p>
                               </div>
                               <button onClick={() => d.fileUrl && window.open(d.fileUrl, '_blank')} className="w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-6 bg-gray-950 text-white hover:bg-blue-600">Buka Dokumen</button>
                            </div>
                         ))}
                         {dossiers.length === 0 && (
                            <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center">
                               <i className="bi bi-folder-x text-6xl mb-4"></i>
                               <p className="text-[10px] font-black uppercase tracking-widest">Belum ada dokumen diunggah</p>
                            </div>
                         )}
                      </div>
                   </div>
                )}

                {/* HIDDEN DRH TEMPLATE FOR EXPORT */}
                <div className="hidden">
                    <div ref={drhRef} className="p-[20mm] bg-white text-black font-serif w-[210mm] min-h-[297mm]">
                        <div className="text-center border-b-2 border-black pb-4 mb-8">
                            <h2 className="text-[16pt] font-bold uppercase">DAFTAR RIWAYAT HIDUP</h2>
                            <p className="text-[11pt] font-bold mt-2 tracking-widest">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                        </div>
                        
                        <div className="flex gap-8 mb-10">
                            <div className="w-[4cm] h-[6cm] border-2 border-black flex-shrink-0 bg-gray-50 flex items-center justify-center">
                                {activePegawai.foto ? <img src={activePegawai.foto} className="w-full h-full object-cover" /> : <p className="text-[8pt] text-center p-4">Pas Foto 4x6</p>}
                            </div>
                            <div className="flex-1 space-y-4">
                                <h3 className="text-[12pt] font-bold border-b border-black pb-1 mb-4 uppercase">I. DATA PERSONAL</h3>
                                <table className="w-full text-[10pt]">
                                    <tbody>
                                        {[
                                            ['Nama Lengkap', activePegawai.nama],
                                            ['NIP', activePegawai.nip],
                                            ['Tempat / Tgl Lahir', `${activePegawai.tempatLahir}, ${activePegawai.tanggalLahir}`],
                                            ['Jenis Kelamin', activePegawai.gender === 'L' ? 'Laki-laki' : 'Perempuan'],
                                            ['Agama', activePegawai.agama],
                                            ['Status Pegawai', activePegawai.status],
                                            ['Telepon / WA', activePegawai.telepon],
                                            ['Alamat Domisili', activePegawai.alamat]
                                        ].map(([k, v]) => (
                                            <tr key={k}>
                                                <td className="py-1 w-[150px] font-bold">{k}</td>
                                                <td className="py-1 w-[10px]">:</td>
                                                <td className="py-1 uppercase">{v || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <section>
                                <h3 className="text-[12pt] font-bold border-b border-black pb-1 mb-4 uppercase">II. RIWAYAT JABATAN & KEPANGKATAN</h3>
                                <table className="w-full border-collapse border border-black text-[9pt]">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-black p-2">ITEM</th>
                                            <th className="border border-black p-2">KETERANGAN</th>
                                            <th className="border border-black p-2">TMT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td className="border border-black p-2 font-bold">Jabatan</td><td className="border border-black p-2 uppercase">{activePegawai.jabatan}</td><td className="border border-black p-2 text-center">{activePegawai.tmtJabatan}</td></tr>
                                        <tr><td className="border border-black p-2 font-bold">Unit Kerja</td><td className="border border-black p-2 uppercase" colSpan={2}>{activePegawai.unitKerja}</td></tr>
                                        <tr><td className="border border-black p-2 font-bold">Pangkat / Gol</td><td className="border border-black p-2 uppercase">{activePegawai.pangkat} ({activePegawai.golRuang})</td><td className="border border-black p-2 text-center">{activePegawai.tmtPangkat}</td></tr>
                                        <tr><td className="border border-black p-2 font-bold">Status ASN</td><td className="border border-black p-2 uppercase">{activePegawai.jenisPegawai}</td><td className="border border-black p-2 text-center">{activePegawai.tmtStatus}</td></tr>
                                    </tbody>
                                </table>
                            </section>

                            <section>
                                <h3 className="text-[12pt] font-bold border-b border-black pb-1 mb-4 uppercase">III. RIWAYAT PENDIDIKAN</h3>
                                <table className="w-full border-collapse border border-black text-[9pt]">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-black p-2 w-10">NO</th>
                                            <th className="border border-black p-2">JENJANG</th>
                                            <th className="border border-black p-2">BIDANG STUDI / JURUSAN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-black p-2 text-center">1</td>
                                            <td className="border border-black p-2 text-center font-bold uppercase">{activePegawai.pendidikan || '-'}</td>
                                            <td className="border border-black p-2 uppercase">{activePegawai.bidang || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </section>
                        </div>

                        <div className="mt-20 flex justify-end">
                            <div className="text-center w-[200px]">
                                <p className="text-[10pt]">Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                                <p className="text-[10pt] mb-20">Pegawai Terkait,</p>
                                <p className="text-[11pt] font-bold underline uppercase">{activePegawai.nama}</p>
                                <p className="text-[10pt]">NIP. {activePegawai.nip}</p>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
             
             <div className="px-6 md:px-12 py-6 md:py-8 bg-white border-t border-gray-100 flex flex-col md:flex-row justify-between gap-3 md:gap-4 shrink-0">
                <div className="flex gap-3">
                    <button onClick={handleDownloadDRH} className="w-full md:w-auto px-10 py-4 bg-emerald-600 text-white rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Cetak DRH PDF</button>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="w-full md:w-auto px-10 py-4 bg-gray-950 text-white rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest">Tutup</button>
             </div>
          </div>
        </div>
      )}

      {/* FORM MODAL FULL FIELD */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-end md:items-center justify-center p-0 md:p-6 lg:p-10 overflow-hidden">
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-xl animate-fadeIn" onClick={() => setIsFormModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-6xl h-[92vh] md:h-auto md:max-h-[92dvh] rounded-t-[3rem] md:rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter border border-white/20">
             <div className="px-8 py-6 md:py-8 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
               <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Manajemen Basis Data ASN</h4>
               <button onClick={() => setIsFormModalOpen(false)} className="h-10 w-10 text-gray-950 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm hover:text-rose-500 transition-colors"><i className="bi bi-x-lg"></i></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-16 bg-white custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10">
                   {/* Column Foto */}
                   <div className="lg:col-span-3 space-y-8 flex flex-col items-center">
                      <h6 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-[0.3em] w-full flex items-center gap-2"><i className="bi bi-camera-fill"></i> Foto Profil ASN</h6>
                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                         <div className="h-64 w-64 rounded-[3.5rem] bg-gray-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center group-hover:ring-8 group-hover:ring-blue-50 transition-all duration-500">
                            {formData.foto ? (
                               <img src={formData.foto} className="h-full w-full object-cover" alt="Preview" />
                            ) : (
                               <div className="text-center p-8">
                                  <i className="bi bi-cloud-arrow-up text-5xl text-gray-300 block mb-4"></i>
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Klik Untuk Unggah Pas Foto ASN</p>
                               </div>
                            )}
                         </div>
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                      
                      <div className="w-full space-y-5 pt-4">
                        <FormInput label="NIP Baru (18 Digit)" value={formData.nip} onChange={v => setFormData({...formData, nip: v})} placeholder="1995xxxxxxxxxxxxxx" />
                        <FormInput label="Nama Lengkap Tanpa Gelar" value={formData.nama} onChange={v => setFormData({...formData, nama: v.toUpperCase()})} placeholder="NAMA LENGKAP" />
                        <FormInput label="Status Pegawai" type="select" options={STATUS_OPTIONS} value={formData.status} onChange={v => setFormData({...formData, status: v})} />
                      </div>
                   </div>

                   {/* Column Form Fields */}
                   <div className="lg:col-span-9 space-y-12">
                      {/* Sub Section: Karir */}
                      <div className="space-y-6">
                        <h6 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-[0.3em] flex items-center gap-2"><i className="bi bi-briefcase-fill"></i> Jabatan & Penempatan</h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FormInput label="Jabatan Saat Ini" value={formData.jabatan} onChange={v => setFormData({...formData, jabatan: v.toUpperCase()})} />
                            <FormInput label="Unit Kerja" type="select" options={UNIT_KERJA} value={formData.unitKerja} onChange={v => setFormData({...formData, unitKerja: v})} />
                            <FormInput label="TMT Jabatan" type="date" value={formData.tmtJabatan} onChange={v => setFormData({...formData, tmtJabatan: v})} />
                            <FormInput label="Klasifikasi Jabatan" value={formData.klasifikasiJabatan} onChange={v => setFormData({...formData, klasifikasiJabatan: v.toUpperCase()})} placeholder="Contoh: Jabatan Fungsional" />
                            <FormInput label="Eselon / Level" value={formData.eselon} onChange={v => setFormData({...formData, eselon: v.toUpperCase()})} />
                            <FormInput label="Jenis ASN" type="select" options={JENIS_PEGAWAI_OPTIONS} value={formData.jenisPegawai} onChange={v => setFormData({...formData, jenisPegawai: v})} />
                        </div>
                      </div>

                      {/* Sub Section: Kepangkatan */}
                      <div className="space-y-6">
                        <h6 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-[0.3em] flex items-center gap-2"><i className="bi bi-award-fill"></i> Kepangkatan & Golongan</h6>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <FormInput label="Golongan / Ruang" type="select" options={GOLONGAN_OPTIONS} value={formData.golRuang} onChange={v => setFormData({...formData, golRuang: v, pangkat: getPangkatFromGol(v)})} />
                            <FormInput label="Pangkat (Auto)" value={formData.pangkat} onChange={v => setFormData({...formData, pangkat: v})} />
                            <FormInput label="TMT Pangkat" type="date" value={formData.tmtPangkat} onChange={v => setFormData({...formData, tmtPangkat: v})} />
                        </div>
                      </div>

                      {/* Sub Section: Personal */}
                      <div className="space-y-6">
                        <h6 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-[0.3em] flex items-center gap-2"><i className="bi bi-person-fill"></i> Data Personal & Pendidikan</h6>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <FormInput label="Gender" type="select" options={['L', 'P']} value={formData.gender} onChange={v => setFormData({...formData, gender: v as any})} />
                            <FormInput label="Tempat Lahir" value={formData.tempatLahir} onChange={v => setFormData({...formData, tempatLahir: v.toUpperCase()})} />
                            <FormInput label="Tanggal Lahir" type="date" value={formData.tanggalLahir} onChange={v => setFormData({...formData, tanggalLahir: v})} />
                            <FormInput label="Pendidikan Terakhir" type="select" options={PENDIDIKAN_LIST} value={formData.pendidikan} onChange={v => setFormData({...formData, pendidikan: v})} />
                            <FormInput label="Bidang Studi" value={formData.bidang} onChange={v => setFormData({...formData, bidang: v.toUpperCase()})} />
                            <FormInput label="Agama" type="select" options={AGAMA_OPTIONS} value={formData.agama} onChange={v => setFormData({...formData, agama: v})} />
                            <FormInput label="Nomor Telepon/WA" value={formData.telepon} onChange={v => setFormData({...formData, telepon: v})} />
                            <FormInput label="TMT CPNS/ASN" type="date" value={formData.tmtStatus} onChange={v => setFormData({...formData, tmtStatus: v})} />
                        </div>
                        <FormInput label="Alamat Lengkap" type="textarea" value={formData.alamat} onChange={v => setFormData({...formData, alamat: v.toUpperCase()})} />
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="px-8 py-6 md:py-8 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-end gap-3 md:gap-4 shrink-0">
                <button onClick={() => setIsFormModalOpen(false)} className="w-full md:w-auto px-10 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">Batalkan</button>
                <button onClick={handleSave} disabled={syncingCloud} className="w-full md:w-auto px-16 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                  {syncingCloud ? 'Menyinkronkan Cloud...' : 'Simpan Data Pegawai'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PegawaiPage;
