import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [dossierList, setDossierList] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  const [filterJenis, setFilterJenis] = useState('Semua Jenis');
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isAddDossierOpen, setIsAddDossierOpen] = useState(false);
  const [dossierFormData, setDossierFormData] = useState<Partial<Dossier>>({ fileName: '', keterangan: '' });
  
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [formData, setFormData] = useState<Partial<Pegawai>>({});
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pegawaiToDelete, setPegawaiToDelete] = useState<Pegawai | null>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  
  const drhRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dossierFileInputRef = useRef<HTMLInputElement>(null);
  const importExcelInputRef = useRef<HTMLInputElement>(null);

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
      tmtCpns: formatDateForInput(p.tmtCpns),
      tanggalLahir: formatDateForInput(p.tanggalLahir)
    });
    setIsModalOpen(true);
  };

  const filteredPegawai = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const min = minAge ? parseInt(minAge) : 0;
    const max = maxAge ? parseInt(maxAge) : 200;

    return pegawaiList.filter(p => {
      const searchStr = [p.nama, p.nip, p.nik, p.jabatan, p.unitKerja, p.pendidikan, p.jurusan, p.status, p.alamat].map(v => String(v || '').toLowerCase()).join(' ');
      const match = searchStr.includes(term);
      const unitMatch = filterUnit === 'Semua Unit' || normalizeUnitName(p.unitKerja) === filterUnit;
      const jenisMatch = filterJenis === 'Semua Jenis' || (p.jenisPegawai || '').toUpperCase() === filterJenis.toUpperCase();
      
      // Age calculation
      let ageMatch = true;
      if (minAge || maxAge) {
        const birthDateStr = formatDateForInput(p.tanggalLahir);
        if (birthDateStr) {
          const birthDate = new Date(birthDateStr);
          if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            ageMatch = age >= min && age <= max;
          } else {
            ageMatch = false; // Cannot calculate age
          }
        } else {
          ageMatch = false; // No birth date
        }
      }

      return match && unitMatch && jenisMatch && ageMatch;
    });
  }, [pegawaiList, searchTerm, filterUnit, filterJenis, minAge, maxAge]);

  const filteredDossiers = useMemo(() => {
    if (!selectedPegawai) return [];
    return dossierList.filter(d => d.nip === selectedPegawai.nip);
  }, [dossierList, selectedPegawai]);

  const handleExportExcel = (type: 'SHARE' | 'FULL') => {
    const wb = XLSX.utils.book_new();
    
    if (type === 'SHARE') {
      const data = filteredPegawai.map((p, index) => ({
        'No': index + 1,
        'NIP': p.nip,
        'NAMA': p.nama,
        'Pangkat/golongan': `${p.pangkat || '-'}, ${p.golRuang || '-'}`,
        'Jabatan': p.jabatan,
        'Unit kerja': p.unitKerja,
        'Jenis pegawai': p.jenisPegawai
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Daftar Pegawai");
    } else {
      // Sheet 1: Semua Pegawai
      const allData = filteredPegawai.map(p => ({ ...p }));
      const wsAll = XLSX.utils.json_to_sheet(allData);
      XLSX.utils.book_append_sheet(wb, wsAll, "Semua Pegawai");

      // Mapping nama sheet agar tidak melebihi 31 karakter
      const UNIT_SHEET_NAMES: Record<string, string> = {
        'Sekretariat Direktorat Jenderal Kekayaan Intelektual': 'Sekretariat',
        'Direktorat Hak Cipta dan Desain Industri': 'Hak Cipta & DI',
        'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang': 'Paten, DTLST & RD',
        'Direktorat Merek dan Indikasi Geografis': 'Merek & IG',
        'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi': 'Kerjasama & Edukasi',
        'Direktorat Teknologi Informasi Kekayaan Intelektual': 'TI KI',
        'Direktorat Penegakan Hukum': 'Penegakan Hukum'
      };

      // Sheets 2-8: Per Unit Kerja (hanya jika ada data atau jika tidak sedang difilter)
      UNIT_KERJA.forEach(unit => {
        const unitData = filteredPegawai.filter(p => normalizeUnitName(p.unitKerja) === unit).map(p => ({ ...p }));
        if (unitData.length > 0) {
          const wsUnit = XLSX.utils.json_to_sheet(unitData);
          const sheetName = UNIT_SHEET_NAMES[unit] || unit.substring(0, 31);
          XLSX.utils.book_append_sheet(wb, wsUnit, sheetName);
        }
      });
    }
    
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
    
    // Generate ID for new records
    const payload = {
      ...formData,
      id: formData.id || `PEG-${formData.nip}-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };

    const success = await syncTableRemote('PEGAWAI', 'SAVE', payload);
    if (success) {
      setSuccessMsg(`Data ${formData.nama} berhasil disinkronkan ke database cloud.`);
      await loadData();
      setIsModalOpen(false);
      setShowSuccess(true);
    } else {
      alert("Gagal menyimpan data ke server.");
    }
    setSyncing(false);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setSyncing(true);
        setImportProgress({ current: 0, total: 0 });
        
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          alert("File Excel kosong atau tidak valid.");
          setSyncing(false);
          return;
        }

        // Filter data yang punya NIP
        const validData = data.filter(row => row.NIP || row.nip || row['NIP (18 Digit)']);
        if (validData.length === 0) {
          alert("Tidak ditemukan kolom NIP pada file Excel.");
          setSyncing(false);
          return;
        }

        setImportProgress({ current: 0, total: validData.length });

        let successCount = 0;
        for (let i = 0; i < validData.length; i++) {
          const row = validData[i];
          const payload: any = {};
                    Object.keys(row).forEach(key => {
            const normalizedKey = key.toLowerCase().replace(/[\s_.]/g, '');
            const val = row[key];
            
            if (normalizedKey === 'nip' || normalizedKey === 'nip18digit') payload.nip = String(val).replace(/\D/g, '');
            else if (normalizedKey === 'nama' || normalizedKey === 'namapegawai') payload.nama = val;
            else if (normalizedKey === 'jabatan') payload.jabatan = val;
            else if (normalizedKey === 'klasifikasi' || normalizedKey === 'klasifikasijabatan') payload.klasifikasiJabatan = val;
            else if (normalizedKey === 'subbagian') payload.subBagian = val;
            else if (normalizedKey === 'bagian') payload.bagian = val;
            else if (normalizedKey === 'unitkerja') payload.unitKerja = val;
            else if (normalizedKey === 'golruang' || normalizedKey === 'golongan') payload.golRuang = val;
            else if (normalizedKey === 'pangkat') payload.pangkat = val;
            else if (normalizedKey === 'jenispegawai') payload.jenisPegawai = val;
            else if (normalizedKey === 'status') payload.status = val;
            else if (normalizedKey === 'nik') payload.nik = val;
            else if (normalizedKey === 'alamat') payload.alamat = val;
            else if (normalizedKey === 'email') payload.email = val;
            else if (normalizedKey === 'nohp' || normalizedKey === 'telepon') payload.noHp = val;
            else if (normalizedKey === 'tmtpangkat') payload.tmtPangkat = val;
            else if (normalizedKey === 'tmtjabatan') payload.tmtJabatan = val;
            else if (normalizedKey === 'tmtstatus' || normalizedKey === 'tmtcpns') payload.tmtCpns = val;
            else if (normalizedKey === 'pendidikan') payload.pendidikan = val;
            else if (normalizedKey === 'jurusan') payload.jurusan = val;
            else if (normalizedKey === 'masakerja') payload.masaKerja = val;
            else if (normalizedKey === 'tempatlahir') payload.tempatLahir = val;
            else if (normalizedKey === 'tanggallahir') payload.tanggalLahir = val;
            else if (normalizedKey === 'eselon') payload.eselon = val;
            else if (normalizedKey === 'agama') payload.agama = val;
            else if (normalizedKey === 'npwp') payload.npwp = val;
            else if (normalizedKey === 'nobpjs') payload.noBpjs = val;
            else if (normalizedKey === 'nokariskarsu') payload.noKarisKarsu = val;
            else if (normalizedKey === 'notapera') payload.noTapera = val;
            else if (normalizedKey === 'nokarpeg' || normalizedKey === 'kartupegawai') payload.noKarpeg = val;
            else if (normalizedKey === 'gender' || normalizedKey === 'jeniskelamin') payload.gender = String(val).toUpperCase().startsWith('P') ? 'P' : 'L';
            else payload[key] = val;
          });

          if (payload.nip) {
            const ok = await syncTableRemote('PEGAWAI', 'SAVE', payload);
            if (ok) successCount++;
          }
          setImportProgress(prev => ({ ...prev, current: i + 1 }));
        }

        setSuccessMsg(`Berhasil memproses ${validData.length} baris. ${successCount} data berhasil diperbarui/ditambahkan.`);
        setShowSuccess(true);
        await loadData();
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan saat membaca file Excel.");
      } finally {
        setSyncing(false);
        setImportProgress({ current: 0, total: 0 });
        if (importExcelInputRef.current) importExcelInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const inputClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950";
  const inputNoCapsClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950";
  const labelClass = "text-[9px] font-black text-gray-400 ml-3 tracking-widest block mb-1.5";
  const detailLabel = "text-[8px] font-black text-gray-400 tracking-[0.2em] block mb-1.5";
  const detailValue = "text-[13px] font-black text-gray-900 leading-tight";
  const detailValueNoCaps = "text-[13px] font-black text-gray-900 leading-tight";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => !syncing && setIsConfirmOpen(false)} onConfirm={async () => {
           if(pegawaiToDelete) {
             setSyncing(true);
             const ok = await syncTableRemote('PEGAWAI', 'DELETE', { id: pegawaiToDelete.id, nip: pegawaiToDelete.nip });
             if (ok) {
               logActivity('DELETE', 'Pegawai', `Hapus data pegawai: ${pegawaiToDelete.nama}`);
               await loadData();
               setIsConfirmOpen(false);
               if (selectedPegawai?.nip === pegawaiToDelete.nip) {
                 setSelectedPegawai(null);
               }
             } else {
               alert("Gagal menghapus data dari server.");
             }
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
           <input type="file" ref={importExcelInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
           {canEdit && (
             <button 
               onClick={() => importExcelInputRef.current?.click()} 
               disabled={syncing}
               className="h-14 px-6 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
             >
               {syncing && importProgress.total > 0 ? (
                 <div className="flex items-center gap-2">
                   <div className="h-4 w-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                   <span>{importProgress.current}/{importProgress.total}</span>
                 </div>
               ) : (
                 <><i className="bi bi-file-earmark-arrow-up-fill text-lg"></i> Import Excel</>
               )}
             </button>
           )}
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
          <div className="flex items-center gap-2 px-6 py-2 bg-gray-50 border-2 border-transparent rounded-[1.8rem]">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Usia:</span>
            <input 
              type="number" 
              placeholder="Min" 
              className="w-12 bg-transparent text-[10px] font-black outline-none border-b border-gray-200 focus:border-blue-600 text-center" 
              value={minAge} 
              onChange={e => setMinAge(e.target.value)} 
            />
            <span className="text-[9px] font-black text-gray-400">-</span>
            <input 
              type="number" 
              placeholder="Max" 
              className="w-12 bg-transparent text-[10px] font-black outline-none border-b border-gray-200 focus:border-blue-600 text-center" 
              value={maxAge} 
              onChange={e => setMaxAge(e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? Array(6).fill(0).map((_,i) => <div key={i} className="h-44 bg-white rounded-[3rem] animate-pulse"></div>) : 
         filteredPegawai.map((p, i) => (
           <div key={`${p.nip}-${i}`} onClick={() => navigate(`/pegawai/${p.nip}`)} className="bg-white p-7 rounded-[3rem] border border-gray-100 shadow-sm group hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden">
              <div className="flex items-center gap-6">
                 <div className="h-20 w-20 rounded-[1.8rem] bg-blue-50 overflow-hidden border-4 border-white shadow-xl group-hover:scale-105 transition-transform">
                    {p.foto ? <img src={p.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-blue-600 font-black text-3xl">{p.nama.charAt(0)}</div>}
                 </div>
                 <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-black text-gray-950 truncate leading-tight">{p.nama}</h4>
                    <p className="text-[9px] font-mono text-gray-400 mt-1">NIP. {p.nip}</p>
                    {canEdit && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setPegawaiToDelete(p); 
                          setIsConfirmOpen(true); 
                        }}
                        className="absolute top-4 right-4 h-10 w-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white shadow-sm shrink-0 z-10"
                      >
                        <i className="bi bi-trash3-fill"></i>
                      </button>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                       <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[7px] font-black rounded border border-blue-100 uppercase">{p.golRuang}</span>
                       <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[7px] font-black rounded border border-gray-200 uppercase">{p.jenisPegawai}</span>
                    </div>
                 </div>
              </div>
           </div>
         ))}
      </div>

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
                          <div className="col-span-full"><label className={labelClass}>Nama Lengkap</label><input type="text" className={inputNoCapsClass} value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} required /></div>
                          
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
                    <div className="flex items-center gap-4"><div className="h-8 w-2 bg-indigo-600 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">B. Jabatan & Penempatan (Auto)</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-2"><label className={labelClass}>Nama Jabatan</label><input type="text" className={inputClass} value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} /></div>
                        <div><label className={labelClass}>Jenis Jabatan (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.jenisJabatan || '-'} /></div>
                        <div><label className={labelClass}>Klasifikasi Jabatan (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.klasifikasiJabatan || '-'} /></div>
                       <div><label className={labelClass}>TMT Jabatan</label><input type="date" className={inputNoCapsClass} value={formData.tmtJabatan || ''} onChange={e => setFormData({...formData, tmtJabatan: e.target.value})} /></div>
                       <div><label className={labelClass}>Eselon (Jika Ada)</label><select className={inputClass} value={formData.eselon || '-'} onChange={e => setFormData({...formData, eselon: e.target.value})}><option value="-">-</option><option value="I.a">I.a</option><option value="I.b">I.b</option><option value="II.a">II.a</option><option value="II.b">II.b</option><option value="III.a">III.a</option><option value="IV.a">IV.a</option></select></div>
                       <div className="md:col-span-2"><label className={labelClass}>Unit Kerja Utama</label><select className={inputClass} value={formData.unitKerja || UNIT_KERJA[0]} onChange={e => setFormData({...formData, unitKerja: e.target.value})}>{UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}</select></div>
                       <div className="md:col-span-2"><label className={labelClass}>Nama Bagian</label><input type="text" className={inputClass} value={formData.bagian || ''} onChange={e => setFormData({...formData, bagian: e.target.value})} /></div>
                       <div className="md:col-span-2"><label className={labelClass}>Nama Sub Bagian / Tim</label><input type="text" className={inputClass} value={formData.subBagian || ''} onChange={e => setFormData({...formData, subBagian: e.target.value})} /></div>
                    </div>
                 </section>

                 <section className="space-y-6">
                    <div className="flex items-center gap-4"><div className="h-8 w-2 bg-emerald-600 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">C. Pangkat & Masa Kerja</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div><label className={labelClass}>Golongan / Ruang</label><select className={inputClass} value={formData.golRuang || 'III/a'} onChange={e => setFormData({...formData, golRuang: e.target.value, pangkat: PANGKAT_MAP[e.target.value] || ''})}>{Object.keys(PANGKAT_MAP).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                       <div className="md:col-span-2"><label className={labelClass}>Pangkat (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.pangkat || '-'} /></div>
                       <div><label className={labelClass}>TMT Pangkat</label><input type="date" className={inputNoCapsClass} value={formData.tmtPangkat || ''} onChange={e => setFormData({...formData, tmtPangkat: e.target.value})} /></div>
                       <div><label className={labelClass}>Jenis Pegawai</label><select className={inputClass} value={formData.jenisPegawai || 'PNS'} onChange={e => setFormData({...formData, jenisPegawai: e.target.value})}><option value="PNS">PNS</option><option value="CPNS">CPNS</option><option value="PPPK">PPPK</option><option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option></select></div>
                       <div><label className={labelClass}>Status Aktif</label><select className={inputClass} value={formData.status || 'Aktif'} onChange={e => setFormData({...formData, status: e.target.value})}><option value="Aktif">AKTIF</option><option value="Tidak Aktif">TIDAK AKTIF</option><option value="Pensiun">PENSIUN</option><option value="Tugas Belajar">TUGAS BELAJAR</option></select></div>
                       <div><label className={labelClass}>TMT CPNS (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.tmtCpns || '-'} /></div>
                       <div><label className={labelClass}>Masa Kerja (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.masaKerja || '-'} /></div>
                        <div><label className={labelClass}>MK Golongan (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.masaKerjaGolongan || '-'} /></div>
                        <div><label className={labelClass}>MK Pensiun (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.masaKerjaPensiun || '-'} /></div>
                        <div><label className={labelClass}>Usia (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.usia || '-'} /></div>
                        <div><label className={labelClass}>Sisa Masa Kerja (Auto)</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.sisaMasaKerja || '-'} /></div>
                    </div>
                 </section>

                 <section className="space-y-6">
                     <div className="flex items-center gap-4"><div className="h-8 w-2 bg-rose-600 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">D. Informasi Pensiun (Auto Calculation)</h5></div>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div><label className={labelClass}>Tgl Pensiun</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.tglPensiun || '-'} /></div>
                        <div><label className={labelClass}>TMT Pensiun</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.tmtPensiun || '-'} /></div>
                        <div><label className={labelClass}>Usia Pensiun</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.usiaPensiun || '-'} /></div>
                        <div><label className={labelClass}>BUP</label><input type="text" readOnly className={`${inputClass} bg-gray-100`} value={formData.bup || '-'} /></div>
                     </div>
                  </section>

                  <section className="space-y-6 pb-10">
                    <div className="flex items-center gap-4"><div className="h-8 w-2 bg-amber-500 rounded-full"></div><h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">E. Kontak & Dokumen Identitas</h5></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div><label className={labelClass}>Nomor HP / WhatsApp</label><input type="text" className={inputClass} value={formData.noHp || ''} onChange={e => setFormData({...formData, noHp: e.target.value})} /></div>
                       <div className="md:col-span-2"><label className={labelClass}>Email Personal / Dinas</label><input type="email" className={inputNoCapsClass} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                       <div><label className={labelClass}>Nomor NPWP</label><input type="text" className={inputClass} value={formData.npwp || ''} onChange={e => setFormData({...formData, npwp: e.target.value})} /></div>
                       <div><label className={labelClass}>Nomor BPJS Kesehatan</label><input type="text" className={inputClass} value={formData.noBpjs || ''} onChange={e => setFormData({...formData, noBpjs: e.target.value})} /></div>
                       <div><label className={labelClass}>No. Karis / Karsu</label><input type="text" className={inputClass} value={formData.noKarisKarsu || ''} onChange={e => setFormData({...formData, noKarisKarsu: e.target.value})} /></div>
                        <div><label className={labelClass}>Nomor Tapera</label><input type="text" className={inputClass} value={formData.noTapera || ''} onChange={e => setFormData({...formData, noTapera: e.target.value})} /></div>
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

    </div>
  );
};

export default PegawaiPage;
