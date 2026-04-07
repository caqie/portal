import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pegawai, RiwayatPendidikan, RiwayatJabatan, RiwayatPangkat, RiwayatPelatihan, Keluarga, Dossier } from '../types';
import { fetchPegawaiFromSheets, savePegawai, syncTableRemote, fetchDossiersFromSheets, uploadFileToDrive } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
import { UNIT_KERJA, PANGKAT_MAP } from '../constants';
import SuccessModal from '../components/SuccessModal';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const ProfilePegawaiPage = () => {
  const { nip } = useParams<{ nip: string }>();
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawai, setPegawai] = useState<Pegawai | null>(null);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'identitas' | 'keluarga' | 'pendidikan' | 'jabatan' | 'pangkat' | 'pelatihan' | 'dossier'>('identitas');
  
  const [isEditing, setIsEditing] = useState(false);
  
  const [isAddDossierOpen, setIsAddDossierOpen] = useState(false);
  const [dossierFormData, setDossierFormData] = useState<Partial<Dossier>>({ fileName: '', keterangan: '' });
  const dossierFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drhRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [nip]);

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

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, dData] = await Promise.all([fetchPegawaiFromSheets(), fetchDossiersFromSheets()]);
      const found = pData.find(p => p.nip === nip);
      if (found) {
        // Enrich data
        const enriched: Pegawai = {
          ...found,
          riwayatPendidikan: found.riwayatPendidikan || [],
          riwayatJabatan: found.riwayatJabatan || [],
          riwayatPangkat: found.riwayatPangkat || [],
          riwayatPelatihan: found.riwayatPelatihan || [],
          keluarga: found.keluarga || []
        };

        // Helper for calculating years and months
        const getDiffYMD = (dateStr: string) => {
          if (!dateStr) return null;
          const start = new Date(dateStr);
          if (isNaN(start.getTime())) return null;
          const today = new Date();
          let years = today.getFullYear() - start.getFullYear();
          let months = today.getMonth() - start.getMonth();
          if (months < 0) {
            years--;
            months += 12;
          }
          return { years, months };
        };

        // 1. Calculate Age (Usia)
        if ((!enriched.usia || enriched.usia === '-') && enriched.tanggalLahir) {
          const diff = getDiffYMD(formatDateForInput(enriched.tanggalLahir));
          if (diff) enriched.usia = `${diff.years} Thn ${diff.months} Bln`;
        }

        // 2. Calculate MK Golongan
        if ((!enriched.masaKerjaGolongan || enriched.masaKerjaGolongan === '-') && enriched.tmtPangkat) {
          const diff = getDiffYMD(formatDateForInput(enriched.tmtPangkat));
          if (diff) enriched.masaKerjaGolongan = `${diff.years} Thn ${diff.months} Bln`;
        }

        // 3. Calculate MK Pensiun / Masa Kerja Total
        if ((!enriched.masaKerjaPensiun || enriched.masaKerjaPensiun === '-') && enriched.tmtCpns) {
          const diff = getDiffYMD(formatDateForInput(enriched.tmtCpns));
          if (diff) enriched.masaKerjaPensiun = `${diff.years} Thn ${diff.months} Bln`;
        }

        // 4. Infer Jenis Jabatan
        if (!enriched.jenisJabatan || enriched.jenisJabatan === '-') {
          if (enriched.eselon && enriched.eselon !== '-') {
            enriched.jenisJabatan = 'STRUKTURAL';
          } else if (enriched.jabatan?.toUpperCase().includes('AHLI') || enriched.jabatan?.toUpperCase().includes('FUNGSIONAL')) {
            enriched.jenisJabatan = 'FUNGSIONAL';
          } else {
            enriched.jenisJabatan = 'PELAKSANA';
          }
        }

        // 5. Retirement Info (BUP, Usia Pensiun, Tgl Pensiun)
        if (!enriched.bup || enriched.bup === '-') {
          const isHighLevel = enriched.eselon && enriched.eselon !== '-' && enriched.eselon !== '';
          const isFungsionalAhli = enriched.jabatan?.toUpperCase().includes('MADYA') || enriched.jabatan?.toUpperCase().includes('UTAMA');
          enriched.bup = (isHighLevel || isFungsionalAhli) ? '60' : '58';
        }
        
        if (!enriched.usiaPensiun || enriched.usiaPensiun === '-') {
          enriched.usiaPensiun = enriched.bup;
        }

        if (enriched.tanggalLahir && enriched.bup) {
          try {
            const birth = new Date(formatDateForInput(enriched.tanggalLahir));
            if (!isNaN(birth.getTime())) {
              const bupYears = parseInt(enriched.bup);
              const retirementDate = new Date(birth.getFullYear() + bupYears, birth.getMonth() + 1, 1);
              
              if (!enriched.tglPensiun || enriched.tglPensiun === '-') {
                enriched.tglPensiun = retirementDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
              }
              
              if (!enriched.tmtPensiun || enriched.tmtPensiun === '-') {
                enriched.tmtPensiun = `${retirementDate.getFullYear()}-${String(retirementDate.getMonth() + 1).padStart(2, '0')}-01`;
              }
              
              // Calculate Sisa Masa Kerja
              const today = new Date();
              let checkDate = retirementDate;
              if (enriched.tmtPensiun && enriched.tmtPensiun !== '-') {
                const tmtDate = new Date(formatDateForInput(enriched.tmtPensiun));
                if (!isNaN(tmtDate.getTime())) {
                  checkDate = tmtDate;
                }
              }

              let diffYears = checkDate.getFullYear() - today.getFullYear();
              let diffMonths = checkDate.getMonth() - today.getMonth();
              if (diffMonths < 0) {
                diffYears--;
                diffMonths += 12;
              }
              
              if (diffYears >= 0 && (diffYears > 0 || diffMonths >= 0)) {
                enriched.sisaMasaKerja = `${diffYears} Thn ${diffMonths} Bln`;
              } else {
                enriched.sisaMasaKerja = 'Pensiun';
                // Automatically set status to Pensiun if it's currently Aktif or Tugas Belajar
                if (enriched.status === 'Aktif' || enriched.status === 'Tugas Belajar') {
                  enriched.status = 'Pensiun';
                }
              }
            }
          } catch (e) {}
        }

        setPegawai(enriched);
        setDossiers(dData.filter(d => d.nip === nip));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pegawai) return;
    setSyncing(true);
    const success = await savePegawai(pegawai);
    if (success) {
      logActivity('UPDATE', 'Pegawai', `Update profil lengkap pegawai: ${pegawai.nama} (NIP: ${pegawai.nip})`);
      setSuccessMsg("Profil pegawai berhasil diperbarui.");
      setShowSuccess(true);
      setIsEditing(false);
      loadData();
    } else {
      alert("Gagal menyimpan data.");
    }
    setSyncing(false);
  };

  const handleCetakDRH = async () => {
    if (!drhRef.current || !pegawai) return;
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
      pdf.save(`DRH_${pegawai.nama.replace(/\s+/g, '_')}.pdf`);
      logActivity('DOWNLOAD', 'Pegawai', `Cetak DRH Pegawai: ${pegawai.nama}`);
    } catch (e) { 
      console.error(e);
      alert("Gagal cetak PDF."); 
    } finally { 
      setSyncing(false); 
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pegawai) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`FOTO_${pegawai.nip}_${Date.now()}`, file.type, base64);
      if (res.success && res.fileUrl) {
        updateField('foto', res.fileUrl);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pegawai || !dossierFormData.fileName) return;
    
    const file = dossierFileInputRef.current?.files?.[0];
    if (!file) return alert("Silakan pilih file berkas terlebih dahulu.");

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`DOSSIER_${pegawai.nip}_${Date.now()}`, file.type, base64);
      
      if (res.success && res.fileUrl) {
        const payload: Dossier = {
          id: `DOS-${Date.now()}`,
          nip: pegawai.nip,
          namaPegawai: pegawai.nama,
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          keterangan: dossierFormData.keterangan || '-',
          fileName: dossierFormData.fileName!,
          fileUrl: res.fileUrl
        };
        
        const ok = await syncTableRemote('DOSSIER', 'SAVE', payload);
        if (ok) {
          setSuccessMsg(`Berkas "${payload.fileName}" berhasil ditambahkan.`);
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

  const updateField = (field: keyof Pegawai, value: any) => {
    if (!pegawai) return;
    setPegawai({ ...pegawai, [field]: value });
  };

  const addHistoryItem = (field: 'riwayatPendidikan' | 'riwayatJabatan' | 'riwayatPangkat' | 'riwayatPelatihan' | 'keluarga') => {
    if (!pegawai) return;
    const newItem = (() => {
      switch (field) {
        case 'riwayatPendidikan': return { jenjang: '', institusi: '', jurusan: '', tahunLulus: '', nomorIjazah: '' };
        case 'riwayatJabatan': return { namaJabatan: '', unitKerja: '', tmtJabatan: '', nomorSk: '', tanggalSk: '' };
        case 'riwayatPangkat': return { golRuang: '', pangkat: '', tmtPangkat: '', nomorSk: '', tanggalSk: '' };
        case 'riwayatPelatihan': return { namaPelatihan: '', penyelenggara: '', tahun: '', durasi: '', nomorSertifikat: '' };
        case 'keluarga': return { hubungan: '', nama: '', tempatLahir: '', tanggalLahir: '', pekerjaan: '' };
      }
    })();
    setPegawai({ ...pegawai, [field]: [...(pegawai[field] || []), newItem] });
  };

  const updateHistoryItem = (field: 'riwayatPendidikan' | 'riwayatJabatan' | 'riwayatPangkat' | 'riwayatPelatihan' | 'keluarga', idx: number, subField: string, value: any) => {
    if (!pegawai) return;
    const list = [...(pegawai[field] || [])] as any[];
    list[idx] = { ...list[idx], [subField]: value };
    setPegawai({ ...pegawai, [field]: list });
  };

  const removeHistoryItem = (field: 'riwayatPendidikan' | 'riwayatJabatan' | 'riwayatPangkat' | 'riwayatPelatihan' | 'keluarga', idx: number) => {
    if (!pegawai) return;
    const list = (pegawai[field] || []).filter((_, i) => i !== idx);
    setPegawai({ ...pegawai, [field]: list });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="h-12 w-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Memuat Profil Pegawai...</p>
    </div>
  );

  if (!pegawai) return (
    <div className="bg-white p-20 rounded-[3rem] text-center border border-gray-100 shadow-sm">
      <i className="bi bi-exclamation-triangle text-rose-500 text-4xl mb-4 block"></i>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pegawai tidak ditemukan</p>
      <button onClick={() => navigate('/pegawai')} className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase">Kembali ke Database</button>
    </div>
  );

  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest";
  const inputClass = "w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all uppercase";
  const inputNoCapsClass = "w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 md:mb-12">
        <div className="flex items-center gap-4 md:gap-6 w-full lg:w-auto">
          <button onClick={() => navigate('/pegawai')} className="h-10 w-10 md:h-12 md:w-12 bg-white border border-gray-100 text-gray-400 rounded-xl md:rounded-2xl flex items-center justify-center hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm shrink-0">
            <i className="bi bi-arrow-left"></i>
          </button>
          <div className="min-w-0">
            <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter truncate">Profil Lengkap Pegawai</h3>
            <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2 truncate">
              <i className="bi bi-person-badge-fill text-blue-600"></i> {pegawai.nama} • NIP. {pegawai.nip}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button onClick={handleCetakDRH} disabled={syncing} className="flex-1 lg:flex-none px-6 md:px-8 py-3 md:py-4 bg-gray-900 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
            {syncing ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-file-earmark-pdf-fill"></i>}
            Cetak DRH
          </button>
          {(canEdit || isSuperadmin) && (
            !isEditing ? (
              <button onClick={() => setIsEditing(true)} className="flex-1 lg:flex-none px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-lg shadow-blue-200 flex items-center justify-center gap-3 active:scale-95 transition-all">
                <i className="bi bi-pencil-square"></i>
                Edit Profil
              </button>
            ) : (
              <div className="flex gap-2 w-full lg:w-auto">
                <button onClick={() => setIsEditing(false)} className="flex-1 lg:flex-none px-6 md:px-8 py-3 md:py-4 bg-gray-100 text-gray-500 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase active:scale-95 transition-all">
                  Batal
                </button>
                <button onClick={handleSave} disabled={syncing} className="flex-1 lg:flex-none px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-lg shadow-blue-200 flex items-center justify-center gap-3 active:scale-95 transition-all">
                  {syncing ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-check-fill"></i>}
                  Simpan Perubahan
                </button>
              </div>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-3 space-y-4 md:space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-gray-100 shadow-sm text-center space-y-4 md:space-y-6">
            <div className="relative inline-block">
              <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl md:rounded-[2rem] bg-gray-50 border-4 md:border-8 border-white shadow-2xl overflow-hidden mx-auto">
                {pegawai.foto ? <img src={pegawai.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-gray-300 text-4xl font-black">?</div>}
              </div>
              {(canEdit || isSuperadmin) && (
                <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 h-8 w-8 md:h-10 md:w-10 bg-blue-600 text-white rounded-lg md:rounded-xl shadow-lg flex items-center justify-center border-2 md:border-4 border-white hover:scale-110 transition-all">
                  <i className="bi bi-camera-fill text-[10px] md:text-xs"></i>
                </button>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadPhoto} />
              {uploading && <div className="absolute inset-0 bg-blue-600/50 rounded-2xl md:rounded-[2rem] flex items-center justify-center"><div className="h-6 w-6 md:h-8 md:w-8 border-2 md:border-4 border-white/30 border-t-white rounded-full animate-spin"></div></div>}
            </div>
            <div>
              <h4 className="font-black text-gray-900 uppercase tracking-tight leading-tight text-sm md:text-base">{pegawai.nama}</h4>
              <p className="text-[8px] md:text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1.5 md:mt-2">{pegawai.jabatan}</p>
              <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{pegawai.unitKerja}</p>
            </div>
            <div className="pt-4 md:pt-6 border-t border-gray-50 flex flex-col gap-2">
               <span className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase ${pegawai.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>{pegawai.status}</span>
               <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[8px] font-black uppercase">{pegawai.golRuang} • {pegawai.pangkat}</span>
            </div>
          </div>

          <nav className="bg-white p-2 md:p-4 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex lg:flex-col overflow-x-auto lg:overflow-x-visible no-scrollbar gap-1">
            {[
              { id: 'identitas', label: 'Identitas', icon: 'bi-person-fill' },
              { id: 'keluarga', label: 'Keluarga', icon: 'bi-people-fill' },
              { id: 'pendidikan', label: 'Pendidikan', icon: 'bi-mortarboard-fill' },
              { id: 'jabatan', label: 'Jabatan', icon: 'bi-briefcase-fill' },
              { id: 'pangkat', label: 'Pangkat', icon: 'bi-award-fill' },
              { id: 'pelatihan', label: 'Pelatihan', icon: 'bi-journal-check' },
              { id: 'dossier', label: 'Dossier', icon: 'bi-folder-fill' },
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap lg:w-full ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <i className={`bi ${tab.icon} ${activeTab === tab.id ? 'text-white' : 'text-gray-300'}`}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <div className="bg-white p-6 md:p-10 lg:p-12 rounded-3xl md:rounded-[3.5rem] border border-gray-100 shadow-sm min-h-[500px] md:min-h-[600px]">
            
            {activeTab === 'identitas' && (
              <div className="space-y-8 md:space-y-12 animate-fadeIn">
                {/* A. Identitas Pribadi */}
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                    <div className="h-8 w-8 md:h-10 md:w-10 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-lg"><i className="bi bi-person-fill"></i></div>
                    <div>
                      <h4 className="text-sm md:text-md font-black text-gray-900 uppercase tracking-tight">A. Identitas Pribadi</h4>
                      <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest">Informasi dasar kependudukan</p>
                    </div>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <label className={labelClass}>Nama Lengkap</label>
                        {isEditing ? (
                          <input type="text" className={inputClass} value={pegawai.nama} onChange={e => updateField('nama', e.target.value)} />
                        ) : (
                          <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.nama || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>NIK (No. KTP)</label>
                        {isEditing ? (
                          <input type="text" className={inputClass} value={pegawai.nik || ''} onChange={e => updateField('nik', e.target.value)} />
                        ) : (
                          <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.nik || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Jenis Kelamin</label>
                        {isEditing ? (
                          <select className={inputClass} value={pegawai.gender} onChange={e => updateField('gender', e.target.value)}>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                          </select>
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Tempat Lahir</label>
                        {isEditing ? (
                          <input type="text" className={inputClass} value={pegawai.tempatLahir || ''} onChange={e => updateField('tempatLahir', e.target.value)} />
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.tempatLahir || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Tanggal Lahir</label>
                        {isEditing ? (
                          <input type="date" className={inputNoCapsClass} value={pegawai.tanggalLahir || ''} onChange={e => updateField('tanggalLahir', e.target.value)} />
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.tanggalLahir || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Agama</label>
                        {isEditing ? (
                          <select className={inputClass} value={pegawai.agama || ''} onChange={e => updateField('agama', e.target.value)}>
                            <option value="">Pilih Agama</option>
                            <option value="Islam">Islam</option>
                            <option value="Kristen">Kristen</option>
                            <option value="Katolik">Katolik</option>
                            <option value="Hindu">Hindu</option>
                            <option value="Budha">Budha</option>
                            <option value="Konghucu">Konghucu</option>
                          </select>
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.agama || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Status Perkawinan</label>
                        {isEditing ? (
                          <select className={inputClass} value={pegawai.statusPerkawinan || ''} onChange={e => updateField('statusPerkawinan', e.target.value)}>
                            <option value="">Pilih Status</option>
                            <option value="Belum Kawin">Belum Kawin</option>
                            <option value="Kawin">Kawin</option>
                            <option value="Cerai Hidup">Cerai Hidup</option>
                            <option value="Cerai Mati">Cerai Mati</option>
                          </select>
                        ) : (
                          <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.statusPerkawinan || '-'}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Usia</label>
                        <div className="px-6 py-4 bg-gray-100 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.usia || '-'}</div>
                      </div>
                    </div>
                </div>

                {/* B. Data Kepegawaian */}
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                    <div className="h-8 w-8 md:h-10 md:w-10 bg-indigo-50 text-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-lg"><i className="bi bi-briefcase-fill"></i></div>
                    <div>
                      <h4 className="text-sm md:text-md font-black text-gray-900 uppercase tracking-tight">B. Data Kepegawaian</h4>
                      <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest">Informasi karir dan jabatan</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className={labelClass}>NIP Baru</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.nip}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Jenis Pegawai</label>
                      {isEditing ? (
                        <select className={inputClass} value={pegawai.jenisPegawai || ''} onChange={e => updateField('jenisPegawai', e.target.value)}>
                          <option value="PNS">PNS</option>
                          <option value="CPNS">CPNS</option>
                          <option value="PPPK">PPPK</option>
                          <option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option>
                        </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.jenisPegawai || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Status Pegawai</label>
                      {isEditing ? (
                        <select className={inputClass} value={pegawai.status || ''} onChange={e => updateField('status', e.target.value)}>
                          <option value="Aktif">AKTIF</option>
                          <option value="Tidak Aktif">TIDAK AKTIF</option>
                          <option value="Pensiun">PENSIUN</option>
                          <option value="Tugas Belajar">TUGAS BELAJAR</option>
                        </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.status || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className={labelClass}>Nama Jabatan</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.jabatan || ''} onChange={e => updateField('jabatan', e.target.value)} />
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.jabatan || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Jenis Jabatan</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.jenisJabatan || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Klasifikasi Jabatan</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.klasifikasiJabatan || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Eselon</label>
                      {isEditing ? (
                        <select className={inputClass} value={pegawai.eselon || '-'} onChange={e => updateField('eselon', e.target.value)}>
                          <option value="-">-</option>
                          <option value="I.a">I.a</option>
                          <option value="I.b">I.b</option>
                          <option value="II.a">II.a</option>
                          <option value="II.b">II.b</option>
                          <option value="III.a">III.a</option>
                          <option value="IV.a">IV.a</option>
                        </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.eselon || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>TMT Jabatan</label>
                      {isEditing ? (
                        <input type="date" className={inputNoCapsClass} value={pegawai.tmtJabatan || ''} onChange={e => updateField('tmtJabatan', e.target.value)} />
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.tmtJabatan || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className={labelClass}>Unit Kerja</label>
                      {isEditing ? (
                        <select className={inputClass} value={pegawai.unitKerja || ''} onChange={e => updateField('unitKerja', e.target.value)}>
                          {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                        </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.unitKerja || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Nama Bagian</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.bagian || ''} onChange={e => updateField('bagian', e.target.value)} />
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.bagian || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Nama Sub Bagian / Tim</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.subBagian || ''} onChange={e => updateField('subBagian', e.target.value)} />
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.subBagian || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Golongan / Ruang</label>
                      {isEditing ? (
                        <select className={inputClass} value={pegawai.golRuang || ''} onChange={e => {
                          const gol = e.target.value;
                          setPegawai({ ...pegawai, golRuang: gol, pangkat: PANGKAT_MAP[gol] || '' });
                        }}>
                          {Object.keys(PANGKAT_MAP).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.golRuang || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Pangkat</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.pangkat || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>TMT Pangkat</label>
                      {isEditing ? (
                        <input type="date" className={inputNoCapsClass} value={pegawai.tmtPangkat || ''} onChange={e => updateField('tmtPangkat', e.target.value)} />
                      ) : (
                        <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-50/50 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.tmtPangkat || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>TMT CPNS</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.tmtCpns || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Masa Kerja (Thn Bln)</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.masaKerja || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Tgl Pensiun</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.tglPensiun || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>TMT Pensiun</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.tmtPensiun || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Usia Pensiun</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.usiaPensiun || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>BUP</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.bup || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>MK Golongan</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.masaKerjaGolongan || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>MK Pensiun</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.masaKerjaPensiun || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Usia</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.usia || '-'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Sisa Masa Kerja</label>
                      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-gray-100 border border-gray-100 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] font-bold text-gray-900 min-h-[48px] md:min-h-[54px] flex items-center select-all">{pegawai.sisaMasaKerja || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* C. Kontak & Domisili */}
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                    <div className="h-8 w-8 md:h-10 md:w-10 bg-emerald-50 text-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-lg"><i className="bi bi-geo-alt-fill"></i></div>
                    <div>
                      <h4 className="text-sm md:text-md font-black text-gray-900 uppercase tracking-tight">C. Kontak & Domisili</h4>
                      <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest">Informasi komunikasi dan alamat</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className={labelClass}>No. HP / WhatsApp</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.noHp || ''} onChange={e => updateField('noHp', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noHp || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Email Personal / Dinas</label>
                      {isEditing ? (
                        <input type="email" className={inputNoCapsClass} value={pegawai.email || ''} onChange={e => updateField('email', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.email || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className={labelClass}>Alamat Lengkap Sesuai Domisili</label>
                      {isEditing ? (
                        <textarea className={`${inputClass} min-h-[100px] resize-none`} value={pegawai.alamat || ''} onChange={e => updateField('alamat', e.target.value)} placeholder="Masukkan alamat lengkap..." />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[100px] flex items-start pt-4 select-all">{pegawai.alamat || '-'}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* D. Administrasi Lainnya */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                    <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg"><i className="bi bi-card-checklist"></i></div>
                    <div>
                      <h4 className="text-md font-black text-gray-900 uppercase tracking-tight">D. Administrasi Lainnya</h4>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Nomor dokumen administrasi</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className={labelClass}>Nomor NPWP</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.npwp || ''} onChange={e => updateField('npwp', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.npwp || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Nomor BPJS Kesehatan</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.noBpjs || ''} onChange={e => updateField('noBpjs', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noBpjs || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>No. Karis / Karsu</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.noKarisKarsu || ''} onChange={e => updateField('noKarisKarsu', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noKarisKarsu || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Nomor Tapera</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.noTapera || ''} onChange={e => updateField('noTapera', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noTapera || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Nomor Karpeg</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.noKarpeg || ''} onChange={e => updateField('noKarpeg', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.noKarpeg || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Pendidikan Terakhir</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.pendidikan || ''} onChange={e => updateField('pendidikan', e.target.value)} placeholder="Contoh: S1 / S2" />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.pendidikan || '-'}</div>
                      )}
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className={labelClass}>Jurusan Pendidikan</label>
                      {isEditing ? (
                        <input type="text" className={inputClass} value={pegawai.jurusan || ''} onChange={e => updateField('jurusan', e.target.value)} />
                      ) : (
                        <div className="px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 min-h-[54px] flex items-center select-all">{pegawai.jurusan || '-'}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'keluarga' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-50 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl"><i className="bi bi-people-fill"></i></div>
                    <div>
                      <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Informasi Keluarga</h4>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Data pasangan dan anak</p>
                    </div>
                  </div>
                  {isEditing && (
                    <button onClick={() => addHistoryItem('keluarga')} className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
                      <i className="bi bi-plus-lg"></i> Tambah Anggota
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {(pegawai.keluarga || []).map((k, idx) => (
                    <div key={idx} className="bg-gray-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative group">
                      {isEditing && (
                        <button onClick={() => removeHistoryItem('keluarga', idx)} className="absolute top-4 right-4 h-8 w-8 bg-white text-rose-400 rounded-lg flex items-center justify-center hover:text-rose-600 shadow-sm md:opacity-0 group-hover:opacity-100 transition-all">
                          <i className="bi bi-trash3"></i>
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Hubungan</label>
                          {isEditing ? (
                            <select className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={k.hubungan} onChange={e => updateHistoryItem('keluarga', idx, 'hubungan', e.target.value)}>
                              <option value="">Pilih</option>
                              <option value="Suami">Suami</option>
                              <option value="Istri">Istri</option>
                              <option value="Anak">Anak</option>
                              <option value="Ayah">Ayah</option>
                              <option value="Ibu">Ibu</option>
                            </select>
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{k.hubungan || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nama Lengkap</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={k.nama} onChange={e => updateHistoryItem('keluarga', idx, 'nama', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{k.nama || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tempat Lahir</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={k.tempatLahir} onChange={updateHistoryItem('keluarga', idx, 'tempatLahir', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{k.tempatLahir || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal Lahir</label>
                          {isEditing ? (
                            <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={k.tanggalLahir} onChange={e => updateHistoryItem('keluarga', idx, 'tanggalLahir', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{k.tanggalLahir || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Pekerjaan</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={k.pekerjaan} onChange={e => updateHistoryItem('keluarga', idx, 'pekerjaan', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{k.pekerjaan || '-'}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(pegawai.keluarga || []).length === 0 && (
                    <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl md:rounded-[2.5rem] text-gray-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Belum ada data keluarga</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'pendidikan' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-50 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl"><i className="bi bi-mortarboard-fill"></i></div>
                    <div>
                      <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Riwayat Pendidikan</h4>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pendidikan formal</p>
                    </div>
                  </div>
                  {isEditing && (
                    <button onClick={() => addHistoryItem('riwayatPendidikan')} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
                      <i className="bi bi-plus-lg"></i> Tambah Pendidikan
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {(pegawai.riwayatPendidikan || []).map((p, idx) => (
                    <div key={idx} className="bg-gray-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative group">
                      {isEditing && (
                        <button onClick={() => removeHistoryItem('riwayatPendidikan', idx)} className="absolute top-4 right-4 h-8 w-8 bg-white text-rose-400 rounded-lg flex items-center justify-center hover:text-rose-600 shadow-sm md:opacity-0 group-hover:opacity-100 transition-all">
                          <i className="bi bi-trash3"></i>
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jenjang</label>
                          {isEditing ? (
                            <select className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={p.jenjang} onChange={e => updateHistoryItem('riwayatPendidikan', idx, 'jenjang', e.target.value)}>
                              <option value="">Pilih</option>
                              <option value="SD">SD</option>
                              <option value="SMP">SMP</option>
                              <option value="SMA/SMK">SMA/SMK</option>
                              <option value="D3">D3</option>
                              <option value="D4/S1">D4/S1</option>
                              <option value="S2">S2</option>
                              <option value="S3">S3</option>
                            </select>
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.jenjang || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nama Sekolah / Universitas</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.institusi} onChange={e => updateHistoryItem('riwayatPendidikan', idx, 'institusi', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.institusi || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tahun Lulus</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={p.tahunLulus} onChange={e => updateHistoryItem('riwayatPendidikan', idx, 'tahunLulus', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.tahunLulus || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jurusan</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.jurusan} onChange={e => updateHistoryItem('riwayatPendidikan', idx, 'jurusan', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.jurusan || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor Ijazah</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.nomorIjazah} onChange={e => updateHistoryItem('riwayatPendidikan', idx, 'nomorIjazah', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.nomorIjazah || '-'}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'jabatan' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-50 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl"><i className="bi bi-briefcase-fill"></i></div>
                    <div>
                      <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Riwayat Jabatan</h4>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Perjalanan karir</p>
                    </div>
                  </div>
                  {isEditing && (
                    <button onClick={() => addHistoryItem('riwayatJabatan')} className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                      <i className="bi bi-plus-lg"></i> Tambah Jabatan
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {(pegawai.riwayatJabatan || []).map((j, idx) => (
                    <div key={idx} className="bg-gray-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative group">
                      {isEditing && (
                        <button onClick={() => removeHistoryItem('riwayatJabatan', idx)} className="absolute top-4 right-4 h-8 w-8 bg-white text-rose-400 rounded-lg flex items-center justify-center hover:text-rose-600 shadow-sm md:opacity-0 group-hover:opacity-100 transition-all">
                          <i className="bi bi-trash3"></i>
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nama Jabatan</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={j.namaJabatan} onChange={e => updateHistoryItem('riwayatJabatan', idx, 'namaJabatan', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{j.namaJabatan || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Unit Kerja</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={j.unitKerja} onChange={e => updateHistoryItem('riwayatJabatan', idx, 'unitKerja', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{j.unitKerja || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">TMT Jabatan</label>
                          {isEditing ? (
                            <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={j.tmtJabatan} onChange={e => updateHistoryItem('riwayatJabatan', idx, 'tmtJabatan', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{j.tmtJabatan || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor SK</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={j.nomorSk} onChange={e => updateHistoryItem('riwayatJabatan', idx, 'nomorSk', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{j.nomorSk || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal SK</label>
                          {isEditing ? (
                            <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={j.tanggalSk} onChange={e => updateHistoryItem('riwayatJabatan', idx, 'tanggalSk', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{j.tanggalSk || '-'}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(pegawai.riwayatJabatan || []).length === 0 && (
                    <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl md:rounded-[2.5rem] text-gray-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Belum ada riwayat jabatan</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'pangkat' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-50 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-amber-50 text-amber-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl"><i className="bi bi-award-fill"></i></div>
                    <div>
                      <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Riwayat Pangkat</h4>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Kenaikan pangkat</p>
                    </div>
                  </div>
                  {isEditing && (
                    <button onClick={() => addHistoryItem('riwayatPangkat')} className="w-full sm:w-auto px-6 py-3 bg-amber-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-100">
                      <i className="bi bi-plus-lg"></i> Tambah Pangkat
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {(pegawai.riwayatPangkat || []).map((p, idx) => (
                    <div key={idx} className="bg-gray-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative group">
                      {isEditing && (
                        <button onClick={() => removeHistoryItem('riwayatPangkat', idx)} className="absolute top-4 right-4 h-8 w-8 bg-white text-rose-400 rounded-lg flex items-center justify-center hover:text-rose-600 shadow-sm md:opacity-0 group-hover:opacity-100 transition-all">
                          <i className="bi bi-trash3"></i>
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Gol. Ruang</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.golRuang} onChange={e => updateHistoryItem('riwayatPangkat', idx, 'golRuang', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.golRuang || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Pangkat</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.pangkat} onChange={e => updateHistoryItem('riwayatPangkat', idx, 'pangkat', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.pangkat || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">TMT Pangkat</label>
                          {isEditing ? (
                            <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={p.tmtPangkat} onChange={e => updateHistoryItem('riwayatPangkat', idx, 'tmtPangkat', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.tmtPangkat || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor SK</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.nomorSk} onChange={e => updateHistoryItem('riwayatPangkat', idx, 'nomorSk', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.nomorSk || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal SK</label>
                          {isEditing ? (
                            <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={p.tanggalSk} onChange={e => updateHistoryItem('riwayatPangkat', idx, 'tanggalSk', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.tanggalSk || '-'}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(pegawai.riwayatPangkat || []).length === 0 && (
                    <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl md:rounded-[2.5rem] text-gray-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Belum ada riwayat pangkat</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'pelatihan' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-50 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-purple-50 text-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl"><i className="bi bi-journal-check"></i></div>
                    <div>
                      <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Riwayat Pelatihan</h4>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Diklat & Workshop</p>
                    </div>
                  </div>
                  {isEditing && (
                    <button onClick={() => addHistoryItem('riwayatPelatihan')} className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-purple-100">
                      <i className="bi bi-plus-lg"></i> Tambah Pelatihan
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {(pegawai.riwayatPelatihan || []).map((p, idx) => (
                    <div key={idx} className="bg-gray-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative group">
                      {isEditing && (
                        <button onClick={() => removeHistoryItem('riwayatPelatihan', idx)} className="absolute top-4 right-4 h-8 w-8 bg-white text-rose-400 rounded-lg flex items-center justify-center hover:text-rose-600 shadow-sm md:opacity-0 group-hover:opacity-100 transition-all">
                          <i className="bi bi-trash3"></i>
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nama Pelatihan</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.namaPelatihan} onChange={e => updateHistoryItem('riwayatPelatihan', idx, 'namaPelatihan', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.namaPelatihan || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Penyelenggara</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.penyelenggara} onChange={e => updateHistoryItem('riwayatPelatihan', idx, 'penyelenggara', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.penyelenggara || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tahun</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={p.tahun} onChange={e => updateHistoryItem('riwayatPelatihan', idx, 'tahun', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.tahun || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Durasi</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.durasi} onChange={e => updateHistoryItem('riwayatPelatihan', idx, 'durasi', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.durasi || '-'}</div>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor Sertifikat</label>
                          {isEditing ? (
                            <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none uppercase" value={p.nomorSertifikat} onChange={e => updateHistoryItem('riwayatPelatihan', idx, 'nomorSertifikat', e.target.value)} />
                          ) : (
                            <div className="px-4 py-2.5 bg-white/50 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 select-all">{p.nomorSertifikat || '-'}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(pegawai.riwayatPelatihan || []).length === 0 && (
                    <div className="py-16 md:py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl md:rounded-[2.5rem] text-gray-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Belum ada riwayat pelatihan</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dossier' && (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-50 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl"><i className="bi bi-folder-fill"></i></div>
                    <div>
                      <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight">Digital Dossier</h4>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Arsip dokumen digital pegawai</p>
                    </div>
                  </div>
                  {isEditing && (
                    <button onClick={() => setIsAddDossierOpen(true)} className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                      <i className="bi bi-cloud-arrow-up-fill"></i> Tambah Berkas
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dossiers.map(d => (
                    <div key={d.id} onClick={() => d.fileUrl && window.open(d.fileUrl, '_blank')} className="p-5 md:p-6 bg-gray-50 border border-gray-100 rounded-2xl md:rounded-[2.5rem] hover:bg-white hover:border-blue-300 transition-all cursor-pointer group flex items-center gap-4 md:gap-5">
                      <div className="h-12 w-12 md:h-14 md:w-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 text-2xl md:text-3xl shadow-sm shrink-0"><i className="bi bi-file-earmark-pdf-fill"></i></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] md:text-[11px] font-black uppercase truncate text-gray-950">{d.fileName}</p>
                        <p className="text-[7px] md:text-[8px] font-bold text-gray-400 mt-1 uppercase">{d.tanggal}</p>
                      </div>
                    </div>
                  ))}
                  {dossiers.length === 0 && (
                    <div className="col-span-full py-16 md:py-20 text-center opacity-30">
                      <i className="bi bi-folder-x text-4xl md:text-5xl mb-4 block"></i>
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Belum ada dokumen terunggah</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Add Dossier Modal */}
      {isAddDossierOpen && (
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
                        <tr><td className="w-[180px] py-1">1. Nama Lengkap</td><td className="w-4 py-1 text-center">:</td><td className="py-1 font-bold uppercase underline">{pegawai.nama}</td></tr>
                        <tr><td className="py-1">2. NIP</td><td className="py-1 text-center">:</td><td className="py-1 font-bold">{pegawai.nip}</td></tr>
                        <tr><td className="py-1">3. NIK</td><td className="py-1 text-center">:</td><td className="py-1">{pegawai.nik || '-'}</td></tr>
                        <tr><td className="py-1">4. Tempat, Tgl Lahir</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.tempatLahir || '-'}, {pegawai.tanggalLahir || '-'}</td></tr>
                        <tr><td className="py-1">5. Jenis Kelamin</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</td></tr>
                        <tr><td className="py-1">6. Agama</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.agama || '-'}</td></tr>
                        <tr><td className="py-1">7. Alamat Domisili</td><td className="py-1 text-center">:</td><td className="py-1 uppercase leading-tight">{pegawai.alamat || '-'}</td></tr>
                        <tr><td className="py-1">8. No. Telepon / HP</td><td className="py-1 text-center">:</td><td className="py-1">{pegawai.noHp || '-'}</td></tr>
                        <tr><td className="py-1">9. E-Mail</td><td className="py-1 text-center">:</td><td className="py-1 text-blue-800 lowercase">{pegawai.email || '-'}</td></tr>
                     </tbody>
                  </table>
               </section>

               <section>
                  <p className="font-bold border-b border-black mb-3 uppercase bg-gray-50 px-2 py-1">II. POSISI DAN KEPANGKATAN</p>
                  <table className="w-full border-collapse">
                     <tbody>
                        <tr><td className="w-[180px] py-1">1. Nama Jabatan</td><td className="w-4 py-1 text-center">:</td><td className="py-1 font-bold uppercase">{pegawai.jabatan || '-'}</td></tr>
                        <tr><td className="py-1">2. TMT Jabatan</td><td className="py-1 text-center">:</td><td className="py-1">{pegawai.tmtJabatan || '-'}</td></tr>
                        <tr><td className="py-1">3. Eselon</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.eselon || '-'}</td></tr>
                        <tr><td className="py-1">4. Pangkat (Golongan)</td><td className="py-1 text-center">:</td><td className="py-1 uppercase font-bold">{pegawai.pangkat} ({pegawai.golRuang})</td></tr>
                        <tr><td className="py-1">5. TMT Pangkat</td><td className="py-1 text-center">:</td><td className="py-1">{pegawai.tmtPangkat || '-'}</td></tr>
                        <tr><td className="py-1">6. Masa Kerja Golongan</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.masaKerja || '-'}</td></tr>
                        <tr><td className="py-1">7. Unit Kerja</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.unitKerja}</td></tr>
                        <tr><td className="py-1">8. TMT CPNS / Kontrak</td><td className="py-1 text-center">:</td><td className="py-1">{pegawai.tmtCpns || '-'}</td></tr>
                     </tbody>
                  </table>
               </section>

               <section>
                  <p className="font-bold border-b border-black mb-3 uppercase bg-gray-50 px-2 py-1">III. RIWAYAT PENDIDIKAN</p>
                  <table className="w-full border-collapse">
                     <tbody>
                        <tr><td className="w-[180px] py-1">1. Jenjang Pendidikan</td><td className="w-4 py-1 text-center">:</td><td className="py-1 uppercase font-bold">{pegawai.pendidikan || '-'}</td></tr>
                        <tr><td className="py-1">2. Program Studi / Jurusan</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.jurusan || '-'}</td></tr>
                     </tbody>
                  </table>
               </section>

               <section>
                  <p className="font-bold border-b border-black mb-3 uppercase bg-gray-50 px-2 py-1">IV. DATA ADMINISTRASI LAINNYA</p>
                  <table className="w-full border-collapse">
                     <tbody>
                        <tr><td className="w-[180px] py-1">1. Nomor NPWP</td><td className="w-4 py-1 text-center">:</td><td className="py-1">{pegawai.npwp || '-'}</td></tr>
                        <tr><td className="py-1">2. Nomor BPJS Kes.</td><td className="py-1 text-center">:</td><td className="py-1">{pegawai.noBpjs || '-'}</td></tr>
                        <tr><td className="py-1">3. No. Karis / Karsu</td><td className="py-1 text-center">:</td><td className="py-1 uppercase">{pegawai.noKarisKarsu || '-'}</td></tr>
                     </tbody>
                  </table>
               </section>
            </div>

            <div className="mt-14 flex justify-between items-start text-black">
               <div className="w-[3.5cm] h-[4.5cm] border-2 border-black flex flex-col items-center justify-center text-[7pt] italic text-gray-400 p-2 text-center ml-10">
                  {pegawai.foto ? (
                    <img src={pegawai.foto} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <span>PAS FOTO 3X4<br/>TEMPEL DI SINI</span>
                  )}
               </div>
               
               <div className="text-center w-[250px] mr-10">
                  <p className="text-[10pt]">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="mt-1 mb-28 uppercase font-bold text-[10pt]">Pegawai Bersangkutan,</p>
                  <p className="font-bold uppercase underline leading-none text-[11pt]">{pegawai.nama}</p>
                  <p className="mt-1 text-[10pt]">NIP {pegawai.nip}</p>
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

export default ProfilePegawaiPage;
