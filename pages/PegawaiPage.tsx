
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PANGKAT_MAP, getPangkatFromGol, UNIT_KERJA, PENDIDIKAN_LIST } from '../constants';
import { Pegawai, Dossier, CloudConfig } from '../types';
import { fetchPegawaiFromSheets, calculateRetirementDate, updatePegawaiRemote } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import * as XLSX from 'xlsx';

const JENIS_PEGAWAI_OPTIONS = ['PNS', 'CPNS', 'PPPK', 'PPPK PARUH WAKTU', 'HONORER'];
const STATUS_OPTIONS = ['Aktif', 'Cuti', 'Tugas Belajar', 'Pensiun', 'Tidak Aktif'];
const AGAMA_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Budha', 'Konghucu', 'Lainnya'];
const GOLONGAN_OPTIONS = Object.keys(PANGKAT_MAP);

const InfoItem = ({ label, value, icon, color = "text-gray-900" }: { label: string, value: string | undefined, icon?: string, color?: string }) => (
  <div className="space-y-1.5 p-3 rounded-2xl border border-transparent hover:border-gray-100 hover:bg-gray-50/50 transition-all">
    <div className="flex items-center space-x-2">
      {icon && <i className={`bi ${icon} text-[10px] text-blue-500`}></i>}
      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none">{label}</p>
    </div>
    <p className={`text-[11px] font-black uppercase leading-tight ${color}`}>{value || '-'}</p>
  </div>
);

const PegawaiPage = () => {
  const { user, login, canEdit, isSuperadmin, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingCloud, setSyncingCloud] = useState(false);
  
  // States for Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  const [filterJenis, setFilterJenis] = useState('Semua Jenis');
  const [filterStatus, setFilterStatus] = useState('Semua Status');
  const [filterGolongan, setFilterGolongan] = useState('Semua Golongan');
  const [filterGender, setFilterGender] = useState('Semua Gender');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDossierUploadModalOpen, setIsDossierUploadModalOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'biodata' | 'dossier'>('biodata');
  const [activePegawai, setActivePegawai] = useState<Pegawai | null>(null);
  const [formData, setFormData] = useState<Partial<Pegawai>>({});
  
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dossierFileInputRef = useRef<HTMLInputElement>(null);
  const [cloudConfig, setCloudConfig] = useState<CloudConfig | null>(null);

  // Dossier Form State
  const [dossierForm, setDossierForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: '',
    fileName: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => { 
    loadData();
    const savedCloud = localStorage.getItem('portal_cloud_config');
    if (savedCloud) setCloudConfig(JSON.parse(savedCloud));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const savedLocal = localStorage.getItem('portal_pegawai_db');
      if (savedLocal) {
        setPegawaiList(JSON.parse(savedLocal));
      } else {
        const data = await fetchPegawaiFromSheets();
        setPegawaiList(data);
        localStorage.setItem('portal_pegawai_db', JSON.stringify(data));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const availableUnits = useMemo(() => {
    const units = new Set<string>();
    UNIT_KERJA.forEach(u => units.add(u));
    pegawaiList.forEach(p => {
        if (p.unitKerja) units.add(p.unitKerja.trim());
    });
    return Array.from(units).sort();
  }, [pegawaiList]);

  const loadDossiers = (nip: string) => {
    const saved = localStorage.getItem('portal_dossiers_db');
    if (saved) {
      const allDossiers: Dossier[] = JSON.parse(saved);
      setDossiers(allDossiers.filter(d => d.nip === nip));
    } else {
      setDossiers([]);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredPegawai.map(p => ({
      NIP: p.nip, Nama: p.nama, Jabatan: p.jabatan, Klasifikasi: p.klasifikasiJabatan, Unit: p.unitKerja, Pangkat: p.pangkat, Jenis: p.jenisPegawai, Status: p.status
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Pegawai");
    XLSX.writeFile(wb, `Pegawai_DJKI_${new Date().getTime()}.xlsx`);
  };

  const filteredPegawai = pegawaiList.filter(p => {
    if (isViewer) return p.nip === user?.nip;
    
    const term = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || [
      p.nama, p.nip, p.jabatan, p.klasifikasiJabatan, p.unitKerja, p.bagian, p.alamat, p.telepon, p.pendidikan, p.bidang, p.pangkat, p.golRuang, p.jenisPegawai
    ].some(field => field?.toLowerCase().includes(term));

    const matchesUnit = filterUnit === 'Semua Unit' || p.unitKerja?.trim() === filterUnit;
    const matchesJenis = filterJenis === 'Semua Jenis' || p.jenisPegawai === filterJenis;
    const matchesStatus = filterStatus === 'Semua Status' || p.status === filterStatus;
    const matchesGol = filterGolongan === 'Semua Golongan' || p.golRuang === filterGolongan;
    const matchesGender = filterGender === 'Semua Gender' || p.gender === (filterGender === 'LAKI-LAKI' ? 'L' : 'P');

    return matchesSearch && matchesUnit && matchesJenis && matchesStatus && matchesGol && matchesGender;
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

  const handleSave = async () => {
    if (!formData.nama || !formData.nip) return alert("Nama dan NIP wajib diisi!");
    
    setSyncingCloud(true);
    let updatedList: Pegawai[];
    const updatedData = { ...formData } as Pegawai;

    try {
      // 1. Sinkronisasi ke Spreadsheet via Apps Script (Async)
      const success = await updatePegawaiRemote(updatedData);
      
      // 2. Update Database Lokal (UI agar terasa instan)
      if (activePegawai) { 
        updatedList = pegawaiList.map(p => p.id === activePegawai.id ? { ...p, ...updatedData } : p);
        logActivity('UPDATE', 'Pegawai', `Update profil: ${updatedData.nama} (Cloud Sync: ${success ? 'OK' : 'Local Only'})`);
      } else { 
        updatedList = [{ ...updatedData, id: Date.now().toString() }, ...pegawaiList];
        logActivity('CREATE', 'Pegawai', `Registrasi baru: ${updatedData.nama} (Cloud Sync: ${success ? 'OK' : 'Local Only'})`);
      }

      setPegawaiList(updatedList);
      localStorage.setItem('portal_pegawai_db', JSON.stringify(updatedList));
      setIsFormModalOpen(false);
      
      if (user && updatedData.nip === user.nip) {
        login({ ...user, name: updatedData.nama, foto: updatedData.foto });
      }

      if (!success) {
        alert("Peringatan: Data tersimpan di sistem lokal, namun gagal sinkronisasi ke Spreadsheet. Pastikan URL Apps Script di Settings sudah benar.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat menyimpan data.");
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleDelete = (p: Pegawai) => {
    if (confirm(`Hapus seluruh riwayat data ${p.nama} dari sistem?`)) {
      const updated = pegawaiList.filter(item => item.id !== p.id);
      setPegawaiList(updated);
      localStorage.setItem('portal_pegawai_db', JSON.stringify(updated));
      logActivity('DELETE', 'Pegawai', `Menghapus data pegawai: ${p.nama}`);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert("Ukuran file maksimal 2MB");
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, foto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDossierFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDossierForm(prev => ({ ...prev, fileName: file.name }));
    }
  };

  const handleSaveDossier = () => {
    if (!activePegawai || !selectedFile) return alert("Pilih berkas terlebih dahulu");
    if (!dossierForm.tanggal) return alert("Tanggal wajib diisi");

    setIsUploading(true);
    
    setTimeout(() => {
      const newDossier: Dossier = {
        id: Date.now().toString(),
        nip: activePegawai.nip,
        namaPegawai: activePegawai.nama,
        tanggal: dossierForm.tanggal,
        keterangan: dossierForm.keterangan || 'Arsip Elektronik Terunggah',
        fileName: dossierForm.fileName || selectedFile.name 
      };

      const saved = localStorage.getItem('portal_dossiers_db');
      const allDossiers = saved ? JSON.parse(saved) : [];
      localStorage.setItem('portal_dossiers_db', JSON.stringify([newDossier, ...allDossiers]));
      setDossiers(prev => [newDossier, ...prev]);
      
      logActivity('CREATE', 'Dossier', `Upload file ${newDossier.fileName} untuk ${activePegawai.nama}`);
      
      setIsUploading(false);
      setIsDossierUploadModalOpen(false);
      setSelectedFile(null);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Search & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 no-print">
        <div className="lg:col-span-2 relative group">
          <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
          <input 
            type="text" 
            placeholder="Cari Nama, NIP, Jabatan, Unit..." 
            className="w-full pl-12 pr-12 py-4 bg-white border border-gray-100 rounded-3xl focus:border-blue-500 shadow-sm text-xs font-bold text-gray-900 outline-none transition-all placeholder:text-gray-400" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-rose-500 transition-colors">
              <i className="bi bi-x-circle-fill"></i>
            </button>
          )}
        </div>
        <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Database</span>
            <span className="text-xl font-black text-blue-600">{filteredPegawai.length} <span className="text-[10px] text-gray-400 font-bold uppercase">Pegawai</span></span>
        </div>
        <div className="flex gap-2">
            <button onClick={handleExport} className="h-full px-5 bg-emerald-50 text-emerald-600 rounded-3xl border border-emerald-100 shadow-sm hover:bg-emerald-600 hover:text-white transition-all"><i className="bi bi-file-earmark-excel-fill text-lg"></i></button>
            {canEdit && (
              <button onClick={() => { setFormData({status:'Aktif', jenisPegawai:'PNS', gender:'L', unitKerja: UNIT_KERJA[0]}); setActivePegawai(null); setIsFormModalOpen(true); }} className="flex-1 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"><i className="bi bi-person-plus-fill mr-2"></i>Registrasi Baru</button>
            )}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 no-print">
         <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3">Unit Kerja</label>
            <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-[10px] font-bold text-gray-900 shadow-sm outline-none appearance-none cursor-pointer">
                <option value="Semua Unit">Semua Unit</option>
                {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
         </div>
         <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3">Status Pegawai</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-[10px] font-bold text-gray-900 shadow-sm outline-none appearance-none cursor-pointer">
                <option value="Semua Status">Semua Status</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
         </div>
         <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3">Golongan</label>
            <select value={filterGolongan} onChange={e => setFilterGolongan(e.target.value)} className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-[10px] font-bold text-gray-900 shadow-sm outline-none appearance-none cursor-pointer">
                <option value="Semua Golongan">Semua Golongan</option>
                {GOLONGAN_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
         </div>
         <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3">Jenis Kelamin</label>
            <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-[10px] font-bold text-gray-900 shadow-sm outline-none appearance-none cursor-pointer">
                <option value="Semua Gender">Semua Gender</option>
                <option value="LAKI-LAKI">LAKI-LAKI</option>
                <option value="PEREMPUAN">PEREMPUAN</option>
            </select>
         </div>
         <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3">Kategori</label>
            <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)} className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-[10px] font-bold text-gray-900 shadow-sm outline-none appearance-none cursor-pointer">
                <option value="Semua Jenis">Semua Jenis</option>
                {JENIS_PEGAWAI_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
         </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[8px] font-black border-b border-gray-100 tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Identitas Pegawai</th>
                <th className="px-4 py-5">Jabatan & Unit</th>
                <th className="px-4 py-5">Klasifikasi</th>
                <th className="px-4 py-5 text-center">Gol/Pangkat</th>
                <th className="px-4 py-5">Status/Jenis</th>
                <th className="px-8 py-5 text-right">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse">Menghubungkan ke basis data...</td></tr>
              ) : filteredPegawai.length > 0 ? filteredPegawai.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/5 group transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="h-11 w-11 rounded-2xl overflow-hidden bg-blue-50 flex items-center justify-center font-black text-blue-400 border border-blue-100 shrink-0 shadow-inner">
                        {p.foto ? <img src={p.foto} className="h-full w-full object-cover" /> : p.nama.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-900 uppercase truncate">{p.nama}</p>
                        <p className="text-[8px] font-mono text-blue-600 mt-1 font-bold">{p.nip}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <p className="text-[10px] font-bold text-gray-700 uppercase line-clamp-1">{p.jabatan}</p>
                    <p className="text-[8px] text-gray-400 font-black uppercase mt-1 truncate max-w-[150px]">{p.unitKerja}</p>
                  </td>
                  <td className="px-4 py-5">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg border border-blue-100 uppercase tracking-tighter">
                      {p.klasifikasiJabatan || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <div className="inline-flex flex-col items-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-lg border border-blue-100">{p.golRuang || '-'}</span>
                        <span className="text-[6px] font-black text-gray-400 mt-1 uppercase text-center max-w-[80px] leading-tight">{p.pangkat}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-col space-y-1">
                        <span className="text-[8px] font-black text-gray-800 uppercase">{p.jenisPegawai}</span>
                        <span className={`px-2 py-0.5 text-[7px] font-black uppercase rounded w-fit ${p.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{p.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleOpenDetail(p)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 transition-all shadow-sm"><i className="bi bi-eye-fill"></i></button>
                      {canEdit && <button onClick={() => handleEdit(p)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 transition-all shadow-sm"><i className="bi bi-pencil-fill"></i></button>}
                      {isSuperadmin && <button onClick={() => handleDelete(p)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 transition-all shadow-sm"><i className="bi bi-trash"></i></button>}
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={6} className="px-8 py-20 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest opacity-30">Tidak ada data ditemukan</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Profil */}
      {isDetailModalOpen && activePegawai && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 no-print">
          <div className="fixed inset-0 bg-gray-950/85 backdrop-blur-xl" onClick={() => setIsDetailModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-5xl max-h-[92dvh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter">
             <div className="relative h-48 bg-[#111827] flex flex-col items-center justify-center text-white shrink-0 overflow-hidden">
                <div className="absolute top-8 right-8 z-10 flex gap-2">
                    {activePegawai.driveFolderId && (
                      <a href={`https://drive.google.com/drive/folders/${activePegawai.driveFolderId}`} target="_blank" className="h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 text-[10px] font-black uppercase transition-all shadow-xl shadow-amber-600/30"><i className="bi bi-cloud-check-fill"></i> Drive</a>
                    )}
                    <button onClick={() => window.print()} className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-[10px] font-black uppercase transition-all shadow-xl shadow-blue-600/20"><i className="bi bi-printer-fill"></i> DRH</button>
                    <button onClick={() => setIsDetailModalOpen(false)} className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex bg-gray-900/40 backdrop-blur-lg rounded-t-3xl px-2">
                    <button onClick={() => setActiveTab('biodata')} className={`px-10 py-4 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'biodata' ? 'text-blue-400 border-blue-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Data Personal</button>
                    <button onClick={() => setActiveTab('dossier')} className={`px-10 py-4 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'dossier' ? 'text-blue-400 border-blue-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>E-Arsip</button>
                </div>
                <i className="bi bi-person-badge absolute -left-12 -bottom-12 text-[16rem] text-white/5 rotate-12"></i>
             </div>

             <div className="flex-1 overflow-y-auto p-10 bg-white custom-scrollbar">
                {activeTab === 'biodata' ? (
                  <div className="space-y-12 animate-fadeIn">
                     <div className="flex flex-col md:flex-row items-center md:items-start gap-12">
                        <div className="shrink-0 flex flex-col items-center">
                           <div className="h-48 w-48 rounded-[3rem] bg-gray-50 border-4 border-white shadow-2xl overflow-hidden mb-6 group relative">
                              {activePegawai.foto ? <img src={activePegawai.foto} className="w-full h-full object-cover" /> : <span className="text-8xl font-black text-gray-200 flex h-full items-center justify-center uppercase">{activePegawai.nama.charAt(0)}</span>}
                           </div>
                           <h4 className="text-xl font-black text-gray-900 uppercase leading-tight text-center">{activePegawai.nama}</h4>
                           <p className="text-[12px] font-mono font-black text-blue-600 mt-2 tracking-widest">{activePegawai.nip}</p>
                           <div className={`mt-8 px-6 py-2 rounded-full text-[9px] font-black uppercase border tracking-widest ${activePegawai.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{activePegawai.jenisPegawai} • {activePegawai.status}</div>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <div className="col-span-full pb-2 border-b border-gray-100"><h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">I. Informasi Jabatan & Penempatan</h5></div>
                           <InfoItem label="Jabatan Terakhir" value={activePegawai.jabatan} icon="bi-briefcase-fill" />
                           <InfoItem label="Unit Kerja Utama" value={activePegawai.unitKerja} icon="bi-building-fill" color="text-blue-600" />
                           <InfoItem label="Bagian / Kelompok" value={activePegawai.bagian} icon="bi-diagram-3-fill" />
                           <InfoItem label="Klasifikasi Jabatan" value={activePegawai.klasifikasiJabatan} />
                           <InfoItem label="TMT Jabatan" value={activePegawai.tmtJabatan} icon="bi-calendar-check" />
                           <InfoItem label="Eselon" value={activePegawai.eselon} />

                           <div className="col-span-full pb-2 border-b border-gray-100 mt-6"><h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">II. Kepangkatan & Pendidikan</h5></div>
                           <InfoItem label="Golongan Ruang" value={activePegawai.golRuang} icon="bi-award-fill" />
                           <InfoItem label="Nama Pangkat" value={activePegawai.pangkat} color="text-indigo-600" />
                           <InfoItem label="TMT Pangkat" value={activePegawai.tmtPangkat} />
                           <InfoItem label="Jenjang Pendidikan" value={activePegawai.pendidikan} icon="bi-mortarboard-fill" />
                           <InfoItem label="Bidang Studi" value={activePegawai.bidang} />
                           <InfoItem label="TMT CPNS/Pegawai" value={activePegawai.tmtStatus} />

                           <div className="col-span-full pb-2 border-b border-gray-100 mt-6"><h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">III. Data Pribadi & Kontak</h5></div>
                           <InfoItem label="Tgl Lahir" value={`${activePegawai.tempatLahir}, ${activePegawai.tanggalLahir}`} icon="bi-calendar3" />
                           <InfoItem label="Agama" value={activePegawai.agama} icon="bi-star-fill" />
                           <InfoItem label="WhatsApp / HP" value={activePegawai.telepon} icon="bi-whatsapp" color="text-emerald-600" />
                           <div className="col-span-full md:col-span-2">
                             <InfoItem label="Alamat Domisili" value={activePegawai.alamat} icon="bi-geo-alt-fill" />
                           </div>
                        </div>
                     </div>
                     <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center space-x-6">
                           <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-gray-100"><i className="bi bi-hourglass-bottom text-3xl"></i></div>
                           <div>
                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Masa Bakti (BUP)</p>
                              <h3 className="text-2xl font-black text-rose-600 tracking-tight">
                                {calculateRetirementDate(activePegawai.nip, activePegawai.jabatan)?.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}
                              </h3>
                           </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            {canEdit && <button onClick={() => { setIsDetailModalOpen(false); handleEdit(activePegawai); }} className="flex-1 md:px-12 py-4 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Pembaruan Data</button>}
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="animate-fadeIn space-y-8">
                     <div className="flex justify-between items-center bg-blue-50/50 p-8 rounded-[3rem] border border-blue-100">
                        <div className="flex items-center gap-6">
                           <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><i className="bi bi-cloud-plus-fill text-2xl"></i></div>
                           <div>
                              <h5 className="text-[13px] font-black text-gray-900 uppercase tracking-tight">E-Arsip Digital Cloud</h5>
                              <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">Manajemen berkas kepegawaian terenkripsi</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => {
                            setDossierForm({
                                tanggal: new Date().toISOString().split('T')[0],
                                keterangan: '',
                                fileName: ''
                            });
                            setSelectedFile(null);
                            setIsDossierUploadModalOpen(true);
                          }}
                          className="px-10 py-4 bg-white border border-gray-200 text-blue-600 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          {isUploading ? 'Mengirim...' : 'Upload Berkas Baru'}
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dossiers.length > 0 ? dossiers.map(d => (
                           <div key={d.id} className="p-6 bg-white rounded-3xl border border-gray-100 flex items-center gap-5 group hover:border-blue-200 hover:shadow-lg transition-all">
                              <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shrink-0 border border-rose-100"><i className="bi bi-file-earmark-pdf-fill text-3xl"></i></div>
                              <div className="min-w-0 flex-1">
                                 <p className="text-[11px] font-black text-gray-900 uppercase truncate mb-1">{d.fileName}</p>
                                 <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{d.tanggal} • {d.keterangan}</p>
                              </div>
                              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><i className="bi bi-eye"></i></button>
                                 {canEdit && <button className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><i className="bi bi-trash"></i></button>}
                              </div>
                           </div>
                        )) : (
                           <div className="col-span-full py-32 text-center opacity-30 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                              <i className="bi bi-folder-x text-7xl mb-6"></i>
                              <p className="text-[12px] font-black uppercase tracking-widest">Arsip Digital Masih Kosong</p>
                           </div>
                        )}
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Dossier Upload Form Modal */}
      {isDossierUploadModalOpen && activePegawai && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-md" onClick={() => setIsDossierUploadModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-modalEnter flex flex-col space-y-6">
             <div className="flex items-center gap-4 mb-2">
                <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><i className="bi bi-file-earmark-arrow-up"></i></div>
                <h4 className="text-sm font-black uppercase text-gray-900">Input Data E-Arsip</h4>
             </div>

             <div className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">TANGGAL DOKUMEN</label>
                   <input type="date" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={dossierForm.tanggal} onChange={e => setDossierForm({...dossierForm, tanggal: e.target.value})} />
                </div>
                
                <div className="space-y-1.5">
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">KETERANGAN BERKAS</label>
                   <textarea placeholder="Contoh: SK Pangkat Terakhir, Ijazah S1, dll" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold resize-none h-24" value={dossierForm.keterangan} onChange={e => setDossierForm({...dossierForm, keterangan: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">NAMA BERKAS (FILE_NAME)</label>
                   <input type="text" placeholder="Gunakan nama yang mudah dicari" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={dossierForm.fileName} onChange={e => setDossierForm({...dossierForm, fileName: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Pilih Berkas (PDF/JPG)</label>
                   <div 
                     onClick={() => dossierFileInputRef.current?.click()}
                     className="w-full px-5 py-4 border-2 border-dashed border-gray-200 bg-gray-50 rounded-xl text-center cursor-pointer hover:bg-gray-100 transition-all group"
                   >
                      {selectedFile ? (
                        <p className="text-[11px] font-black text-blue-600 uppercase truncate"><i className="bi bi-file-check mr-2"></i>{selectedFile.name}</p>
                      ) : (
                        <p className="text-[10px] font-bold text-gray-400 uppercase"><i className="bi bi-cloud-upload text-lg block mb-1"></i>Klik untuk mengunggah file</p>
                      )}
                   </div>
                   <input type="file" ref={dossierFileInputRef} className="hidden" onChange={handleDossierFileChange} />
                </div>
             </div>

             <div className="flex gap-3 pt-4">
                <button onClick={() => setIsDossierUploadModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase">Batal</button>
                <button onClick={handleSaveDossier} disabled={isUploading || !selectedFile} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:bg-gray-200">
                    {isUploading ? 'Sedang Memproses...' : 'SIMPAN KE ARSIP'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Form Modal Pegawai */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 no-print">
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setIsFormModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-6xl max-h-[92dvh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter">
             <div className="px-10 py-7 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl"><i className="bi bi-person-gear"></i></div>
                  <h4 className="text-[15px] font-black uppercase tracking-tight text-gray-900">{activePegawai ? 'Perbarui Basis Data' : 'Registrasi Pegawai Baru'}</h4>
               </div>
               <button onClick={() => setIsFormModalOpen(false)} className="h-10 w-10 text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg"></i></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                   
                   {/* Column 1: Personal Photo & Bio */}
                   <div className="lg:col-span-4 space-y-8">
                      <div className="flex flex-col items-center">
                         <div className="h-44 w-44 rounded-[2.5rem] bg-gray-50 border-4 border-white shadow-2xl overflow-hidden mb-6 relative group">
                            {formData.foto ? <img src={formData.foto} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full text-gray-300"><i className="bi bi-camera text-4xl mb-2"></i><p className="text-[9px] font-black uppercase">Foto 3x4</p></div>}
                            <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white">
                               <i className="bi bi-cloud-arrow-up text-2xl mb-1"></i>
                               <span className="text-[9px] font-black uppercase tracking-widest">Ubah Foto</span>
                            </button>
                         </div>
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                         <button onClick={() => fileInputRef.current?.click()} className="px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Pilih Berkas</button>
                      </div>

                      <div className="space-y-5 pt-4">
                         <div className="col-span-full border-b pb-2"><h6 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">1. Biodata Personal</h6></div>
                         <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Nama Lengkap & Gelar</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400" value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} /></div>
                         <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">NIP Pegawai</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400" value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value})} disabled={!!activePegawai} /></div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">NIK (No. KTP)</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 placeholder:text-gray-400" value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="16 Digit" /></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Agama</label><select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500" value={formData.agama} onChange={e => setFormData({...formData, agama: e.target.value})}><option value="">Pilih</option>{AGAMA_OPTIONS.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}</select></div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Gender</label><select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}><option value="L">PRIA</option><option value="P">WANITA</option></select></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">No. WhatsApp</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 placeholder:text-gray-400" value={formData.telepon || ''} onChange={e => setFormData({...formData, telepon: e.target.value})} /></div>
                         </div>
                      </div>
                   </div>

                   {/* Column 2: Placement & Job */}
                   <div className="lg:col-span-4 space-y-8">
                      <div className="col-span-full border-b pb-2"><h6 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">2. Jabatan & Unit Kerja</h6></div>
                      <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Unit Kerja Utama</label>
                        <select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 transition-all" value={formData.unitKerja || ''} onChange={e => setFormData({...formData, unitKerja: e.target.value})}>
                          <option value="">Pilih Unit Kerja</option>{availableUnits.map(u => u !== 'Semua Unit' && <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Bagian / Kelompok Kerja</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 placeholder:text-gray-400" value={formData.bagian || ''} onChange={e => setFormData({...formData, bagian: e.target.value})} /></div>
                      <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Nama Jabatan Terakhir</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 placeholder:text-gray-400" value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Eselon</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 placeholder:text-gray-400" value={formData.eselon || ''} onChange={e => setFormData({...formData, eselon: e.target.value})} /></div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">TMT Jabatan</label><input type="date" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500" value={formData.tmtJabatan || ''} onChange={e => setFormData({...formData, tmtJabatan: e.target.value})} /></div>
                      </div>
                      <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Klasifikasi Jabatan</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 placeholder:text-gray-400" value={formData.klasifikasiJabatan || ''} onChange={e => setFormData({...formData, klasifikasiJabatan: e.target.value})} placeholder="Struktural / Fungsional" /></div>
                      <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Alamat Domisili Lengkap</label><textarea rows={3} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none resize-none focus:border-blue-500 placeholder:text-gray-400" value={formData.alamat || ''} onChange={e => setFormData({...formData, alamat: e.target.value})} /></div>
                   </div>

                   {/* Column 3: Career & Identity Detail */}
                   <div className="lg:col-span-4 space-y-8">
                      <div className="col-span-full border-b pb-2"><h6 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">3. Kepangkatan & Status</h6></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Golongan Ruang</label>
                           <select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500" value={formData.golRuang || ''} onChange={e => setFormData({...formData, golRuang: e.target.value, pangkat: getPangkatFromGol(e.target.value)})}>
                             <option value="">Pilih</option>{GOLONGAN_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                           </select>
                        </div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">TMT Pangkat</label><input type="date" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500" value={formData.tmtPangkat || ''} onChange={e => setFormData({...formData, tmtPangkat: e.target.value})} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Kategori Pegawai</label><select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500" value={formData.jenisPegawai || 'PNS'} onChange={e => setFormData({...formData, jenisPegawai: e.target.value as any})}>{JENIS_PEGAWAI_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Status Aktif</label><select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500" value={formData.status || 'Aktif'} onChange={e => setFormData({...formData, status: e.target.value as any})}>{STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                      </div>
                      <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">TMT CPNS / Pegawai</label><input type="date" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500" value={formData.tmtStatus || ''} onChange={e => setFormData({...formData, tmtStatus: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Tempat Lahir</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 placeholder:text-gray-400" value={formData.tempatLahir || ''} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} /></div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Tanggal Lahir</label><input type="date" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500" value={formData.tanggalLahir || ''} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} /></div>
                      </div>
                      
                      {/* Searchable Education Datalist */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Jenjang Pendidikan Terakhir</label>
                        <input 
                          list="pendidikan-options"
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 placeholder:text-gray-400"
                          value={formData.pendidikan || ''}
                          onChange={e => setFormData({...formData, pendidikan: e.target.value})}
                          placeholder="Ketik/Pilih Jenjang (Contoh: S1-Manajemen)"
                        />
                        <datalist id="pendidikan-options">
                          {PENDIDIKAN_LIST.map((edu, idx) => <option key={idx} value={edu} />)}
                        </datalist>
                      </div>

                      <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Bidang Studi / Jurusan</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-bold text-gray-900 outline-none focus:border-blue-500 placeholder:text-gray-400" value={formData.bidang || ''} onChange={e => setFormData({...formData, bidang: e.target.value})} /></div>
                   </div>
                </div>
             </div>
             <div className="px-12 py-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
               <button onClick={() => setIsFormModalOpen(false)} className="px-10 py-4 text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-2xl bg-white text-gray-500 hover:bg-gray-100 transition-all">Batalkan</button>
               <button onClick={handleSave} disabled={syncingCloud} className="px-16 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-600/30 active:scale-95 transition-all disabled:bg-gray-400 flex items-center gap-3">
                 {syncingCloud ? <><div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Sinkronisasi...</> : 'Simpan Basis Data'}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PegawaiPage;
