import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { TupoksiSDMItem } from '../types';
import { fetchTupoksiSDMFromSheets, saveTupoksiSDM, deleteTupoksiSDM, uploadFileToDrive } from '../spreadsheetService';
import { SUB_TEAMS_INFO, INITIAL_TUPOKSI_SDM } from '../tupoksiConstants';
import { initializeAllSDMData } from '../sampleDataSDM';
import TupoksiActionWorkspaceModal from '../components/Tupoksi/TupoksiActionWorkspaceModal';
import * as XLSX from 'xlsx';

export interface SDMModuleItem {
  id: string;
  subTim: 'PERENCANAAN_LAYANAN' | 'BANGKOM' | 'KARIER';
  subTimLabel: string;
  icon: string;
  label: string;
  description: string;
  color: string;
  route: string;
  badge?: string;
  adminOnly?: boolean;
}

const ALL_SDM_MODULES: SDMModuleItem[] = [
  // Sub Tim 1: Perencanaan & Layanan SDM
  { id: 'tugas-rutin', subTim: 'PERENCANAAN_LAYANAN', subTimLabel: 'Sub Tim 1: Perencanaan', icon: 'bi-clipboard2-check-fill', label: 'Log Administrasi Rutin', description: 'Logbook Pencatatan Tugas Rutin Bulanan, Apel, Pelantikan, LHKPN/LHKASN & Administrasi Sub Tim 1', color: 'blue', route: '/tugas-rutin' },
  { id: 'anjab', subTim: 'PERENCANAAN_LAYANAN', subTimLabel: 'Sub Tim 1: Perencanaan', icon: 'bi-calculator-fill', label: 'ANJAB & ABK Formasi', description: 'Analisis Jabatan, Peta Kebutuhan CASN/PPPK, & Kalkulator Beban Kerja 75.000 menit', color: 'cyan', route: '/anjab-abk' },
  { id: 'spmt', subTim: 'PERENCANAAN_LAYANAN', subTimLabel: 'Sub Tim 1: Perencanaan', icon: 'bi-file-earmark-text-fill', label: 'SPMT & SPP Pelantikan', description: 'Pembuatan Dokumen SPMT & Surat Pernyataan Pelantikan Berstandar TND', color: 'slate', route: '/spmt-spp', adminOnly: true, badge: 'Admin' },
  { id: 'ba', subTim: 'PERENCANAAN_LAYANAN', subTimLabel: 'Sub Tim 1: Perencanaan', icon: 'bi-patch-check-fill', label: 'Berita Acara Sumpah', description: 'Generator BA Pelantikan, Sumpah Jabatan, & Pakta Integritas Terpadu', color: 'blue', route: '/pelantikan-gen', adminOnly: true, badge: 'Admin' },
  { id: 'layanan-sdm', subTim: 'PERENCANAAN_LAYANAN', subTimLabel: 'Sub Tim 1: Perencanaan', icon: 'bi-headset', label: 'Portal Layanan SDM (Tiket)', description: 'Helpdesk Layanan KARIS/KARSU, BPJS, Santunan, Izin Cuti & Kesejahteraan', color: 'blue', route: '/layanan-sdm' },
  { id: 'admin-layanan-sdm', subTim: 'PERENCANAAN_LAYANAN', subTimLabel: 'Sub Tim 1: Perencanaan', icon: 'bi-shield-check', label: 'Admin Layanan SDM', description: 'Verifikasi Berkas, Approval Pengajuan Pegawai, & Pelacakan Tiket Layanan', color: 'rose', route: '/admin/layanan-sdm', adminOnly: true, badge: 'Admin' },
  { id: 'anggaran-dipa', subTim: 'PERENCANAAN_LAYANAN', subTimLabel: 'Sub Tim 1: Perencanaan', icon: 'bi-wallet2', label: 'Anggaran & DIPA SDM', description: 'Perencanaan Belanja Pegawai (51), Operasional (52), POK, Revisi Anggaran & IKPA', color: 'emerald', route: '/anggaran-dipa', adminOnly: true, badge: 'Admin' },
  { id: 'sakip-rb', subTim: 'PERENCANAAN_LAYANAN', subTimLabel: 'Sub Tim 1: Perencanaan', icon: 'bi-ui-checks', label: 'SAKIP & LKE RB SDM', description: 'LKE Area Penataan SDM Aparatur, IKU SDM, Indeks Profesionalitas ASN (IP-ASN) & WBS', color: 'indigo', route: '/sakip-rb', adminOnly: true, badge: 'Admin' },
  { id: 'laporan', subTim: 'PERENCANAAN_LAYANAN', subTimLabel: 'Sub Tim 1: Perencanaan', icon: 'bi-file-earmark-bar-graph-fill', label: 'Laporan Eksekutif Pegawai', description: 'Buku Statistik Pegawai Bulanan, Triwulanan & Komposisi Demografi ASN DJKI', color: 'blue', route: '/laporan', adminOnly: true, badge: 'Admin' },
  { id: 'keuangan', subTim: 'PERENCANAAN_LAYANAN', subTimLabel: 'Sub Tim 1: Perencanaan', icon: 'bi-cash-stack', label: 'SPJ & Pertanggungjawaban', description: 'Kuitansi Perjadin, Rincian Riil, SPD, SPB, SPTJM & Administrasi Keuangan SDM', color: 'teal', route: '/keuangan', adminOnly: true, badge: 'Admin' },

  // Sub Tim 2: Pengembangan Kompetensi (Bangkom)
  { id: 'bangkom', subTim: 'BANGKOM', subTimLabel: 'Sub Tim 2: Bangkom', icon: 'bi-mortarboard-fill', label: 'Bangkom & Pelatihan 20 JP', description: 'TNA (Training Needs Analysis), Kalender Bimtek KI, & Monitoring Pemenuhan 20 JP ASN', color: 'indigo', route: '/pengembangan' },
  { id: 'magang', subTim: 'BANGKOM', subTimLabel: 'Sub Tim 2: Bangkom', icon: 'bi-mortarboard', label: 'Magang & PKL Mahasiswa', description: 'Manajemen Peserta Magang/PKL, Penempatan Unit Kerja, & Penilaian Sertifikat', color: 'teal', route: '/magang-pkl' },
  { id: 'tubel', subTim: 'BANGKOM', subTimLabel: 'Sub Tim 2: Bangkom', icon: 'bi-mortarboard-fill', label: 'Tugas Belajar & Izin Belajar', description: 'Monitoring ASN Tugas Belajar (Tubel), Izin Belajar (Ibel) & Pelacakan SK BKN/Kemenkumham', color: 'amber', route: '/tubel-ibel' },
  { id: 'ukom-admin', subTim: 'BANGKOM', subTimLabel: 'Sub Tim 2: Bangkom', icon: 'bi-pc-display-horizontal', label: 'Admin CAT Ujian Kompetensi', description: 'Pusat Manajemen Bank Soal, Sesi Ujian Kompetensi Mandiri, & Monitoring Peserta', color: 'blue', route: '/ukom/admin', adminOnly: true, badge: 'Admin' },
  { id: 'talenta', subTim: 'BANGKOM', subTimLabel: 'Sub Tim 2: Bangkom', icon: 'bi-star-half', label: 'Manajemen Talenta & SKJ', description: 'Talent Pool Sembilan Kotak (9-Box Matrix), Standar Kompetensi Jabatan & Kesiapan Promosi', color: 'violet', route: '/talenta' },
  { id: 'quizdjki', subTim: 'BANGKOM', subTimLabel: 'Sub Tim 2: Bangkom', icon: 'bi-controller', label: 'QuizDJKI (Game Kompetensi)', description: 'Media Pembelajaran Interaktif Substantif Kekayaan Intelektual & ASN BerAKHLAK', color: 'amber', route: '/quizdjki' },

  // Sub Tim 3: Pengelolaan Karier & Disiplin
  { id: 'pangkat', subTim: 'KARIER', subTimLabel: 'Sub Tim 3: Karier', icon: 'bi-award-fill', label: 'Kenaikan Pangkat 6 Periode', description: 'Usulan Kenaikan Pangkat Reguler, Pilihan & Fungsional (Februari - Desember)', color: 'blue', route: '/kenaikan-pangkat' },
  { id: 'kgb', subTim: 'KARIER', subTimLabel: 'Sub Tim 3: Karier', icon: 'bi-cash-stack', label: 'Kenaikan Gaji Berkala (KGB)', description: 'Generator Surat Keputusan KGB Otomatis & Terintegrasi TMT 2 Tahunan', color: 'emerald', route: '/kgb-gen', adminOnly: true, badge: 'Admin' },
  { id: 'skp', subTim: 'KARIER', subTimLabel: 'Sub Tim 3: Karier', icon: 'bi-graph-up-arrow', label: 'E-Kinerja & SKP', description: 'Evaluasi Kinerja Pegawai (PermenPAN-RB No. 6/2022) & Sinkronisasi BKN', color: 'blue', route: '/skp' },
  { id: 'pak', subTim: 'KARIER', subTimLabel: 'Sub Tim 3: Karier', icon: 'bi-patch-check-fill', label: 'Angka Kredit (PAK Konversi)', description: 'Kalkulator Konversi Predikat SKP ke Angka Kredit JF (PermenPAN-RB No. 1/2023)', color: 'indigo', route: '/pak' },
  { id: 'disiplin-lhkpn', subTim: 'KARIER', subTimLabel: 'Sub Tim 3: Karier', icon: 'bi-shield-slash', label: 'Disiplin ASN & LHKPN/LHKASN', description: 'Penegakan Disiplin PP No. 94/2021, BAP Pemeriksaan, SK Hukdis & Kepatuhan Lapor LHKPN/LHKASN', color: 'rose', route: '/disiplin-lhkpn', adminOnly: true, badge: 'Admin' },
  { id: 'satya', subTim: 'KARIER', subTimLabel: 'Sub Tim 3: Karier', icon: 'bi-star-fill', label: 'Satyalancana & Reward', description: 'Usulan Tanda Kehormatan Presiden (10, 20, 30 Tahun) & Nominasi Pegawai Teladan', color: 'amber', route: '/satya-lencana' },
  { id: 'pensiun', subTim: 'KARIER', subTimLabel: 'Sub Tim 3: Karier', icon: 'bi-door-open-fill', label: 'Simulasi & DPCP Pensiun', description: 'Proyeksi Batas Usia Pensiun (BUP) 5 Tahun ke Depan & Generator Dokumen DPCP', color: 'rose', route: '/pensiun' }
];

interface TupoksiSDMPageProps {
  initialTab?: 'MODUL' | 'TUPOKSI';
}

const TupoksiSDMPage: React.FC<TupoksiSDMPageProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isSuperadmin, canEdit, hasRole, activeRole } = useAuth();
  
  // URL tab param or initialTab
  const paramTab = searchParams.get('tab')?.toUpperCase();
  const [activeMainTab, setActiveMainTab] = useState<'MODUL' | 'TUPOKSI'>(() => {
    if (paramTab === 'MODUL' || paramTab === 'TUPOKSI') return paramTab;
    if (initialTab) return initialTab;
    return 'MODUL'; // Default shows the 22 modules directly as requested
  });

  // Keep URL query param synced
  const handleTabChange = (tab: 'MODUL' | 'TUPOKSI') => {
    setActiveMainTab(tab);
    setSearchParams({ tab: tab.toLowerCase() });
  };

  // Tupoksi Items State
  const [items, setItems] = useState<TupoksiSDMItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubTeam, setSelectedSubTeam] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Modul Operasional State
  const [moduleSearchQuery, setModuleSearchQuery] = useState<string>('');
  const [moduleSubTeamFilter, setModuleSubTeamFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [formData, setFormData] = useState<Partial<TupoksiSDMItem>>({});
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dedicated Tupoksi Action Toolkit Workspace
  const [activeWorkspaceItem, setActiveWorkspaceItem] = useState<TupoksiSDMItem | null>(null);

  useEffect(() => {
    loadTupoksiData();
  }, []);

  // If user has specific role and no manual filter set, highlight their sub-team
  useEffect(() => {
    if (activeRole === 'Admin Perencanaan & Layanan' && selectedSubTeam === 'ALL') {
      setSelectedSubTeam('PERENCANAAN_LAYANAN');
      setModuleSubTeamFilter('PERENCANAAN_LAYANAN');
    } else if (activeRole === 'Admin Pengembangan Kompetensi' && selectedSubTeam === 'ALL') {
      setSelectedSubTeam('BANGKOM');
      setModuleSubTeamFilter('BANGKOM');
    } else if (activeRole === 'Admin Pengelolaan Karier' && selectedSubTeam === 'ALL') {
      setSelectedSubTeam('KARIER');
      setModuleSubTeamFilter('KARIER');
    }
  }, [activeRole]);

  const loadTupoksiData = async () => {
    setLoading(true);
    try {
      const data = await fetchTupoksiSDMFromSheets();
      setItems(data && data.length > 0 ? data : INITIAL_TUPOKSI_SDM);
    } catch (e) {
      console.error("Gagal memuat tupoksi SDM:", e);
      setItems(INITIAL_TUPOKSI_SDM);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSampleData = () => {
    if (window.confirm("Muat dan segarkan seluruh dataset lengkap SDM DJKI (Pegawai, Layanan, ABK, SAKIP/RB, Kegiatan, Keuangan, dsb)?")) {
      initializeAllSDMData(true);
      loadTupoksiData();
      showToast("Data lengkap SDM DJKI berhasil dimuat dan disegarkan.");
    }
  };

  const handleUpdateWorkspaceStatus = async (id: string, newStatus: string, newProgres: number) => {
    const target = items.find(i => i.id === id);
    if (!target) return;

    const updatedItem: TupoksiSDMItem = {
      ...target,
      status: newStatus as any,
      progres: newProgres,
      updatedAt: new Date().toISOString()
    };

    setItems(prev => prev.map(p => (p.id === id ? updatedItem : p)));
    try {
      await saveTupoksiSDM(updatedItem);
      showToast(`Status tugas ${updatedItem.kodeTupoksi} berhasil diperbarui.`);
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAddModal = (defaultSubTeam?: 'PERENCANAAN_LAYANAN' | 'BANGKOM' | 'KARIER') => {
    const sub = defaultSubTeam || (selectedSubTeam !== 'ALL' ? (selectedSubTeam as any) : 'PERENCANAAN_LAYANAN');
    const subInfo = (SUB_TEAMS_INFO as any)[sub] || SUB_TEAMS_INFO.PERENCANAAN_LAYANAN;
    
    setFormData({
      id: `TUP-${Date.now()}`,
      kodeTupoksi: `${sub === 'PERENCANAAN_LAYANAN' ? 'PL' : sub === 'BANGKOM' ? 'BK' : 'MK'}-${String(items.length + 1).padStart(2, '0')}`,
      subTeam: sub,
      roleName: subInfo.roleKey,
      judul: '',
      deskripsi: '',
      periode: 'Tahunan',
      targetOutput: '',
      status: 'DALAM_PROSES',
      progres: 50,
      penanggungJawab: user?.name || '',
      nipPj: user?.nip || '',
      appModuleLink: '',
      catatan: ''
    });
    setModalMode('ADD');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: TupoksiSDMItem) => {
    setFormData({ ...item });
    setModalMode('EDIT');
    setIsModalOpen(true);
  };

  const handleSaveTupoksi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul || !formData.subTeam) {
      alert("Judul dan Sub Tim wajib diisi.");
      return;
    }

    setSyncing(true);
    const subInfo = (SUB_TEAMS_INFO as any)[formData.subTeam] || SUB_TEAMS_INFO.PERENCANAAN_LAYANAN;
    const finalItem: TupoksiSDMItem = {
      id: formData.id || `TUP-${Date.now()}`,
      kodeTupoksi: formData.kodeTupoksi || 'TUP-SDM',
      subTeam: formData.subTeam,
      roleName: formData.roleName || subInfo.roleKey,
      judul: formData.judul,
      deskripsi: formData.deskripsi || '',
      periode: formData.periode || 'Tahunan',
      targetOutput: formData.targetOutput || '',
      status: formData.status || 'DALAM_PROSES',
      progres: Number(formData.progres) || 0,
      penanggungJawab: formData.penanggungJawab || '',
      nipPj: formData.nipPj || '',
      dokumenDukungUrl: formData.dokumenDukungUrl || '',
      dokumenDukungNama: formData.dokumenDukungNama || '',
      appModuleLink: formData.appModuleLink || '',
      catatan: formData.catatan || '',
      updatedAt: new Date().toISOString()
    };

    try {
      const ok = await saveTupoksiSDM(finalItem);
      if (ok) {
        setItems(prev => {
          const idx = prev.findIndex(p => p.id === finalItem.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = finalItem;
            return next;
          }
          return [finalItem, ...prev];
        });
        setIsModalOpen(false);
        showToast("Tupoksi SDM berhasil disimpan dan disinkronkan.");
      } else {
        alert("Gagal menyimpan data ke spreadsheet.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteTupoksi = async (id: string, judul: string) => {
    if (!window.confirm(`Hapus Tupoksi: "${judul}"?`)) return;
    setSyncing(true);
    try {
      const ok = await deleteTupoksiSDM(id);
      if (ok) {
        setItems(prev => prev.filter(p => p.id !== id));
        showToast("Tupoksi berhasil dihapus.");
      } else {
        alert("Gagal menghapus data.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res = await uploadFileToDrive(`TUPOKSI_${Date.now()}_${file.name}`, file.type, base64);
        if (res.success && res.fileUrl) {
          setFormData(prev => ({
            ...prev,
            dokumenDukungUrl: res.fileUrl,
            dokumenDukungNama: file.name
          }));
          showToast("Dokumen pendukung berhasil diunggah ke Google Drive.");
        } else {
          alert(res.message || "Gagal mengunggah file.");
        }
        setUploadingDoc(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploadingDoc(false);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredItems.map((item, idx) => ({
      'No': idx + 1,
      'Kode': item.kodeTupoksi,
      'Sub Tim SDM': (SUB_TEAMS_INFO as any)[item.subTeam]?.name || item.subTeam,
      'Role Admin': item.roleName,
      'Judul Tupoksi': item.judul,
      'Deskripsi / Ruang Lingkup': item.deskripsi,
      'Periode Pelaksanaan': item.periode,
      'Target Output / Indikator': item.targetOutput,
      'Status': item.status,
      'Progres (%)': `${item.progres}%`,
      'Penanggung Jawab': item.penanggungJawab,
      'NIP PJ': item.nipPj,
      'Link Modul Aplikasi': item.appModuleLink,
      'Link Dokumen Pendukung': item.dokumenDukungUrl,
      'Catatan': item.catatan
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tupoksi_SDM_DJKI");
    XLSX.writeFile(wb, `Tupoksi_SDM_DJKI_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Filter Modul Operasional Logic
  const filteredModules = useMemo(() => {
    return ALL_SDM_MODULES.filter((m) => {
      const matchesSubTim = moduleSubTeamFilter === 'ALL' || m.subTim === moduleSubTeamFilter;
      const q = moduleSearchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        m.label.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.subTimLabel.toLowerCase().includes(q);
      return matchesSubTim && matchesQuery;
    });
  }, [moduleSubTeamFilter, moduleSearchQuery]);

  // Filter Tupoksi Logic
  const filteredItems = items.filter(item => {
    const matchesSubTeam = selectedSubTeam === 'ALL' || item.subTeam === selectedSubTeam;
    const matchesStatus = selectedStatus === 'ALL' || item.status === selectedStatus;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      item.judul.toLowerCase().includes(query) ||
      item.deskripsi.toLowerCase().includes(query) ||
      item.kodeTupoksi.toLowerCase().includes(query) ||
      item.targetOutput.toLowerCase().includes(query) ||
      (item.penanggungJawab && item.penanggungJawab.toLowerCase().includes(query));
    return matchesSubTeam && matchesStatus && matchesQuery;
  });

  // Calculate statistics
  const totalCount = items.length;
  const plCount = items.filter(i => i.subTeam === 'PERENCANAAN_LAYANAN').length;
  const bkCount = items.filter(i => i.subTeam === 'BANGKOM').length;
  const mkCount = items.filter(i => i.subTeam === 'KARIER').length;
  const selesaiCount = items.filter(i => i.status === 'SELESAI').length;
  const avgProgress = totalCount > 0 
    ? Math.round(items.reduce((acc, curr) => acc + (curr.progres || 0), 0) / totalCount) 
    : 0;

  // Modul counts per sub-team
  const modPlCount = ALL_SDM_MODULES.filter(m => m.subTim === 'PERENCANAAN_LAYANAN').length;
  const modBkCount = ALL_SDM_MODULES.filter(m => m.subTim === 'BANGKOM').length;
  const modMkCount = ALL_SDM_MODULES.filter(m => m.subTim === 'KARIER').length;

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-600 shadow-blue-600/20 text-white",
    indigo: "bg-indigo-600 shadow-indigo-600/20 text-white",
    emerald: "bg-emerald-600 shadow-emerald-600/20 text-white",
    amber: "bg-amber-600 shadow-amber-600/20 text-white",
    cyan: "bg-cyan-600 shadow-cyan-600/20 text-white",
    rose: "bg-rose-600 shadow-rose-600/20 text-white",
    violet: "bg-violet-600 shadow-violet-600/20 text-white",
    slate: "bg-slate-700 shadow-slate-700/20 text-white",
    teal: "bg-teal-600 shadow-teal-600/20 text-white"
  };

  const canManageSubTeam = (subTeamKey: string) => {
    if (isSuperadmin) return true;
    if (subTeamKey === 'PERENCANAAN_LAYANAN' && hasRole('Admin Perencanaan & Layanan')) return true;
    if (subTeamKey === 'BANGKOM' && hasRole('Admin Pengembangan Kompetensi')) return true;
    if (subTeamKey === 'KARIER' && hasRole('Admin Pengelolaan Karier')) return true;
    return canEdit;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SELESAI':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider"><i className="bi bi-check-circle-fill"></i> Selesai</span>;
      case 'DALAM_PROSES':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-black uppercase tracking-wider"><i className="bi bi-arrow-repeat animate-spin"></i> Dalam Proses</span>;
      case 'TERUS_BERJALAN':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[10px] font-black uppercase tracking-wider"><i className="bi bi-activity"></i> Rutin / On-Going</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-wider"><i className="bi bi-hourglass"></i> Belum Dimulai</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16 max-w-7xl mx-auto">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[9999] bg-gray-950 text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-slideUp">
          <i className="bi bi-check2-circle text-emerald-400 text-xl"></i>
          <span className="text-xs font-black tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* HERO / HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-[10px] font-black uppercase tracking-widest">
              <i className="bi bi-diagram-3-fill"></i> Tim Kerja Pengelolaan SDM DJKI
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase">
              Tupoksi & Modul SDM
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Pusat pembagian tugas pokok & fungsi <strong className="text-white">3 Sub Tim Pengelolaan SDM Ditjen Kekayaan Intelektual</strong> yang terintegrasi langsung dengan <strong className="text-white">22 Modul Operasional</strong> dan pemantauan capaian kinerja real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleResetSampleData}
              className="px-4 py-3.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider border border-emerald-400/30 transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30"
              title="Isi atau segarkan data riil simulasi SDM DJKI"
            >
              <i className="bi bi-database-fill-check text-sm"></i>
              Muat Data Lengkap
            </button>
            {activeMainTab === 'TUPOKSI' && (
              <>
                <button
                  onClick={exportToExcel}
                  className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-wider border border-white/15 transition-all flex items-center gap-2 shadow-sm"
                >
                  <i className="bi bi-file-earmark-excel-fill text-emerald-400 text-sm"></i>
                  Export Excel
                </button>
                {(isSuperadmin || canEdit || activeRole?.includes('Admin')) && (
                  <button
                    onClick={() => handleOpenAddModal()}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                  >
                    <i className="bi bi-plus-lg text-sm"></i>
                    + Tambah Tupoksi
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* PRIMARY VIEW SELECTOR TABS (MODUL OPERASIONAL VS MATRIKS TUPOKSI) */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15">
            <button
              type="button"
              onClick={() => handleTabChange('MODUL')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeMainTab === 'MODUL'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <i className="bi bi-grid-fill text-sm"></i>
              <span>Pusat 22 Modul Operasional</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('TUPOKSI')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeMainTab === 'TUPOKSI'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <i className="bi bi-kanban-fill text-sm"></i>
              <span>Matriks Tupoksi & Tata Kelola ({totalCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
            <i className="bi bi-shield-check text-blue-400"></i>
            <span>3 Sub Tim Kerja Terpadu</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PUSAT 22 MODUL & APLIKASI OPERASIONAL SDM                       */}
      {/* ========================================================================= */}
      {activeMainTab === 'MODUL' && (
        <div className="space-y-6 animate-fadeIn">
          {/* SEARCH & SUB-TIM FILTER CONTROLS */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* SUB-TIM FILTER BUTTONS */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1">
              <button
                onClick={() => setModuleSubTeamFilter('ALL')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shrink-0 flex items-center gap-2 ${
                  moduleSubTeamFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <i className="bi bi-grid-fill"></i>
                Semua Modul ({ALL_SDM_MODULES.length})
              </button>

              <button
                onClick={() => setModuleSubTeamFilter('PERENCANAAN_LAYANAN')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shrink-0 flex items-center gap-2 ${
                  moduleSubTeamFilter === 'PERENCANAAN_LAYANAN'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 border border-blue-100'
                }`}
              >
                <i className="bi bi-diagram-3-fill"></i>
                Sub Tim 1: Perencanaan ({modPlCount})
              </button>

              <button
                onClick={() => setModuleSubTeamFilter('BANGKOM')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shrink-0 flex items-center gap-2 ${
                  moduleSubTeamFilter === 'BANGKOM'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'bg-amber-50/50 text-amber-800 hover:bg-amber-100/70 border border-amber-100'
                }`}
              >
                <i className="bi bi-mortarboard-fill"></i>
                Sub Tim 2: Bangkom ({modBkCount})
              </button>

              <button
                onClick={() => setModuleSubTeamFilter('KARIER')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shrink-0 flex items-center gap-2 ${
                  moduleSubTeamFilter === 'KARIER'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/70 border border-emerald-100'
                }`}
              >
                <i className="bi bi-award-fill"></i>
                Sub Tim 3: Karier ({modMkCount})
              </button>
            </div>

            {/* SEARCH INPUT */}
            <div className="relative w-full md:w-80">
              <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                placeholder="Cari modul atau fitur operasional..."
                value={moduleSearchQuery}
                onChange={(e) => setModuleSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none shadow-xs transition-all"
              />
              {moduleSearchQuery && (
                <button onClick={() => setModuleSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <i className="bi bi-x-circle-fill text-xs"></i>
                </button>
              )}
            </div>
          </div>

          {/* MODULE CARDS GRID */}
          {filteredModules.length === 0 ? (
            <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center text-3xl mx-auto">
                <i className="bi bi-search"></i>
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase">Modul Tidak Ditemukan</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Silakan sesuaikan kata kunci pencarian atau pilih filter Semua Modul.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModules.map((item) => {
                if (item.adminOnly && !canEdit) return null;

                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(item.route)}
                    className="group p-6 md:p-7 bg-white rounded-[2rem] border border-gray-100 transition-all duration-300 text-left flex flex-col justify-between h-full relative overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-100 hover:bg-blue-50/5 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between w-full mb-5">
                        <div className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform ${colorClasses[item.color] || 'bg-blue-600'}`}>
                          <i className={`bi ${item.icon} text-xl md:text-2xl`}></i>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.badge && <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-md tracking-wider uppercase">{item.badge}</span>}
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[8px] font-black rounded-md tracking-wider truncate max-w-[130px] uppercase">{item.subTimLabel}</span>
                        </div>
                      </div>
                      
                      <h4 className="text-base font-black text-gray-900 tracking-tight leading-snug mb-1.5 group-hover:text-blue-600 transition-colors">{item.label}</h4>
                      <p className="text-[11px] text-gray-500 font-medium leading-relaxed line-clamp-2">{item.description}</p>
                    </div>

                    <div className="mt-6 pt-3 border-t border-gray-50 flex items-center justify-between text-gray-400 group-hover:text-blue-600 transition-colors">
                      <span className="text-[8px] font-black uppercase tracking-wider">Buka Modul</span>
                      <i className="bi bi-arrow-right-short text-xl group-hover:translate-x-1 transition-transform"></i>
                    </div>

                    <div className={`absolute -right-6 -bottom-6 h-28 w-28 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700 ${colorClasses[item.color]?.split(' ')[0] || 'bg-blue-600'}`}></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: MATRIKS TUPOKSI & TATA KELOLA SDM                               */}
      {/* ========================================================================= */}
      {activeMainTab === 'TUPOKSI' && (
        <div className="space-y-6 animate-fadeIn">
          {/* SUB TEAM QUICK STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Total Tupoksi</span>
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-black">
                  <i className="bi bi-list-task"></i>
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{totalCount} <span className="text-xs font-normal text-slate-400">Butir</span></p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${avgProgress}%` }}></div>
              </div>
              <p className="text-[9px] text-blue-600 font-bold mt-1.5">Rata-rata Progres: {avgProgress}%</p>
            </div>

            <div 
              onClick={() => setSelectedSubTeam('PERENCANAAN_LAYANAN')}
              className={`cursor-pointer bg-white hover:bg-blue-50/30 transition-all rounded-2xl p-5 border shadow-sm ${selectedSubTeam === 'PERENCANAAN_LAYANAN' ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-100'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">1. Perencanaan & Layanan</span>
                <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm">
                  <i className="bi bi-kanban-fill"></i>
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{plCount} <span className="text-xs font-normal text-slate-400">Tupoksi</span></p>
              <p className="text-[9px] text-slate-500 mt-2 line-clamp-1">Roadmap, ABK, Presensi, SAKIP/RB, Anggaran</p>
            </div>

            <div 
              onClick={() => setSelectedSubTeam('BANGKOM')}
              className={`cursor-pointer bg-white hover:bg-amber-50/30 transition-all rounded-2xl p-5 border shadow-sm ${selectedSubTeam === 'BANGKOM' ? 'border-amber-400 ring-2 ring-amber-500/20 shadow-md' : 'border-slate-100'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">2. Bangkom SDM</span>
                <div className="h-8 w-8 rounded-xl bg-amber-600 text-white flex items-center justify-center text-sm">
                  <i className="bi bi-mortarboard-fill"></i>
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{bkCount} <span className="text-xs font-normal text-slate-400">Tupoksi</span></p>
              <p className="text-[9px] text-slate-500 mt-2 line-clamp-1">TNA, Bimtek, CAT Ukom, Tubel, 9-Box</p>
            </div>

            <div 
              onClick={() => setSelectedSubTeam('KARIER')}
              className={`cursor-pointer bg-white hover:bg-emerald-50/30 transition-all rounded-2xl p-5 border shadow-sm ${selectedSubTeam === 'KARIER' ? 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-md' : 'border-slate-100'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">3. Pengelolaan Karier</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm">
                  <i className="bi bi-stars"></i>
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{mkCount} <span className="text-xs font-normal text-slate-400">Tupoksi</span></p>
              <p className="text-[9px] text-slate-500 mt-2 line-clamp-1">Disiplin PP 94, Pangkat, KGB, PAK, Pensiun</p>
            </div>
          </div>

          {/* FILTER CONTROLS & SUB-TEAM TABS */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
            {/* SUB TEAM TABS */}
            <div className="flex flex-wrap gap-2.5 border-b border-slate-100 pb-4">
              <button
                onClick={() => setSelectedSubTeam('ALL')}
                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  selectedSubTeam === 'ALL'
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                <i className="bi bi-grid-fill"></i>
                Semua Sub Tim ({totalCount})
              </button>

              <button
                onClick={() => setSelectedSubTeam('PERENCANAAN_LAYANAN')}
                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  selectedSubTeam === 'PERENCANAAN_LAYANAN'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100'
                }`}
              >
                <i className="bi bi-kanban-fill"></i>
                Perencanaan & Layanan ({plCount})
              </button>

              <button
                onClick={() => setSelectedSubTeam('BANGKOM')}
                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  selectedSubTeam === 'BANGKOM'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-100'
                }`}
              >
                <i className="bi bi-mortarboard-fill"></i>
                Pengembangan Kompetensi ({bkCount})
              </button>

              <button
                onClick={() => setSelectedSubTeam('KARIER')}
                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  selectedSubTeam === 'KARIER'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100'
                }`}
              >
                <i className="bi bi-stars"></i>
                Pengelolaan Karier ({mkCount})
              </button>
            </div>

            {/* SEARCH AND STATUS FILTER BAR */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  placeholder="Cari tupoksi, kode, output, atau PJ..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-600 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-blue-600 transition-all uppercase"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="SELESAI">Selesai</option>
                  <option value="DALAM_PROSES">Dalam Proses</option>
                  <option value="TERUS_BERJALAN">Rutin / On-Going</option>
                  <option value="BELUM_DIMULAI">Belum Dimulai</option>
                </select>

                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    onClick={() => setViewMode('CARDS')}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                      viewMode === 'CARDS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tampilan Kartu"
                  >
                    <i className="bi bi-grid-3x3-gap-fill"></i>
                  </button>
                  <button
                    onClick={() => setViewMode('TABLE')}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                      viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tampilan Tabel"
                  >
                    <i className="bi bi-table"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENT: CARDS / TABLE VIEW */}
          {loading ? (
            <div className="p-16 text-center space-y-4 bg-white rounded-3xl border border-slate-100">
              <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Memuat Butir Tupoksi SDM...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center text-3xl mx-auto">
                <i className="bi bi-inbox"></i>
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase">Tidak Ada Tupoksi yang Sesuai</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Coba ubah kata kunci pencarian atau ganti filter sub tim di atas.
              </p>
            </div>
          ) : viewMode === 'CARDS' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const subInfo = (SUB_TEAMS_INFO as any)[item.subTeam] || SUB_TEAMS_INFO.PERENCANAAN_LAYANAN;
                const canManageThis = canManageSubTeam(item.subTeam);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
                  >
                    <div className="space-y-4">
                      {/* CARD HEADER */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${subInfo.bgColor}`}>
                            {item.kodeTupoksi}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {item.periode}
                          </span>
                        </div>
                        <div>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>

                      {/* TITLE & DESCRIPTION */}
                      <div>
                        <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                          {item.judul}
                        </h4>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-3">
                          {item.deskripsi}
                        </p>
                      </div>

                      {/* TARGET OUTPUT BOX */}
                      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100/80 space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                          <i className="bi bi-bullseye text-blue-600 mr-1"></i> Target Output:
                        </span>
                        <p className="text-xs font-bold text-slate-800 leading-snug">
                          {item.targetOutput}
                        </p>
                      </div>

                      {/* PROGRESS BAR */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className="text-slate-400">Capaian Progres</span>
                          <span className="text-slate-800">{item.progres || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (item.progres || 0) >= 100
                                ? 'bg-emerald-500'
                                : (item.progres || 0) >= 60
                                ? 'bg-blue-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${item.progres || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* PENANGGUNG JAWAB & CATATAN */}
                      {item.penanggungJawab && (
                        <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-600 border-t border-slate-100">
                          <i className="bi bi-person-fill text-slate-400"></i>
                          <span className="font-bold">{item.penanggungJawab}</span>
                          {item.nipPj && <span className="text-slate-400 font-mono text-[9px]">({item.nipPj})</span>}
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTONS & SHORTCUTS */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {item.appModuleLink && (
                          <Link
                            to={item.appModuleLink}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                          >
                            <i className="bi bi-box-arrow-up-right"></i>
                            Buka Modul
                          </Link>
                        )}
                        {item.dokumenDukungUrl && (
                          <a
                            href={item.dokumenDukungUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                          >
                            <i className="bi bi-paperclip"></i>
                            Dokumen
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveWorkspaceItem(item)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                          title="Buka Toolkit & Workspace Aksi Mandiri"
                        >
                          <i className="bi bi-tools"></i>
                          Workspace
                        </button>
                        {canManageThis && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="h-8 w-8 rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition-all"
                              title="Edit Tupoksi"
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </button>
                            <button
                              onClick={() => handleDeleteTupoksi(item.id, item.judul)}
                              className="h-8 w-8 rounded-xl bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 flex items-center justify-center text-xs transition-all"
                              title="Hapus Tupoksi"
                            >
                              <i className="bi bi-trash3-fill"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-4 text-center w-12">No</th>
                      <th className="py-4 px-4 w-28">Kode & Sub Tim</th>
                      <th className="py-4 px-6">Tupoksi & Indikator Output</th>
                      <th className="py-4 px-4 w-32">Status</th>
                      <th className="py-4 px-4 w-36">Capaian Progres</th>
                      <th className="py-4 px-4 w-44">Penanggung Jawab</th>
                      <th className="py-4 px-4 text-center w-36">Aksi & Workspace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredItems.map((item, idx) => {
                      const subInfo = (SUB_TEAMS_INFO as any)[item.subTeam] || SUB_TEAMS_INFO.PERENCANAAN_LAYANAN;
                      const canManageThis = canManageSubTeam(item.subTeam);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-4 text-center font-mono text-slate-400 text-[10px] font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border block text-center mb-1 ${subInfo.bgColor}`}>
                              {item.kodeTupoksi}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 block text-center uppercase">
                              {item.periode}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <h5 className="font-black text-slate-900 text-xs leading-snug">{item.judul}</h5>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.deskripsi}</p>
                            <div className="mt-2 text-[10px] text-blue-700 font-bold bg-blue-50/70 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                              <i className="bi bi-bullseye"></i> Target: {item.targetOutput}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-slate-700">{item.progres || 0}%</span>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    (item.progres || 0) >= 100
                                      ? 'bg-emerald-500'
                                      : (item.progres || 0) >= 60
                                      ? 'bg-blue-600'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${item.progres || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-[11px] font-medium text-slate-600">
                            <p className="font-bold text-slate-900">{item.penanggungJawab || '-'}</p>
                            {item.nipPj && <p className="text-[9px] font-mono text-slate-400">{item.nipPj}</p>}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setActiveWorkspaceItem(item)}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                title="Buka Toolkit Workspace"
                              >
                                <i className="bi bi-tools"></i>
                                Workspace
                              </button>
                              {item.appModuleLink && (
                                <Link
                                  to={item.appModuleLink}
                                  className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 flex items-center justify-center text-xs transition-all"
                                  title="Buka Modul Terkait"
                                >
                                  <i className="bi bi-box-arrow-up-right"></i>
                                </Link>
                              )}
                              {canManageThis && (
                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  className="h-7 w-7 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition-all"
                                  title="Edit"
                                >
                                  <i className="bi bi-pencil-fill"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL FORM ADD / EDIT TUPOKSI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  {modalMode === 'ADD' ? 'Tambah Butir Baru' : 'Perbarui Tupoksi SDM'}
                </span>
                <h3 className="text-xl font-black tracking-tight text-white mt-1">
                  {modalMode === 'ADD' ? 'Buat Tupoksi Sub Tim SDM' : formData.judul}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-10 w-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveTupoksi} className="p-8 overflow-y-auto space-y-6 flex-1 text-slate-900">
              {/* SUB TIM & KODE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Sub Tim SDM *</label>
                  <select
                    value={formData.subTeam || 'PERENCANAAN_LAYANAN'}
                    onChange={e => {
                      const sub = e.target.value as any;
                      const subInfo = (SUB_TEAMS_INFO as any)[sub];
                      setFormData({
                        ...formData,
                        subTeam: sub,
                        roleName: subInfo?.roleKey,
                        kodeTupoksi: `${sub === 'PERENCANAAN_LAYANAN' ? 'PL' : sub === 'BANGKOM' ? 'BK' : 'MK'}-${String(items.length + 1).padStart(2, '0')}`
                      });
                    }}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-600 transition-all"
                  >
                    <option value="PERENCANAAN_LAYANAN">1. Perencanaan & Layanan SDM</option>
                    <option value="BANGKOM">2. Pengembangan Kompetensi (Bangkom)</option>
                    <option value="KARIER">3. Pengelolaan Karier & Disiplin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Kode Tupoksi</label>
                  <input
                    type="text"
                    value={formData.kodeTupoksi || ''}
                    onChange={e => setFormData({ ...formData, kodeTupoksi: e.target.value })}
                    placeholder="PL-01 / BK-01 / MK-01"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              {/* JUDUL */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Judul Tugas Pokok & Fungsi *</label>
                <input
                  type="text"
                  required
                  value={formData.judul || ''}
                  onChange={e => setFormData({ ...formData, judul: e.target.value })}
                  placeholder="Contoh: Penyusunan Analisis Beban Kerja (ABK) dan Peta Jabatan"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>

              {/* DESKRIPSI */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Deskripsi & Ruang Lingkup</label>
                <textarea
                  rows={3}
                  value={formData.deskripsi || ''}
                  onChange={e => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Jelaskan uraian rinci kegiatan, dasar hukum, atau mekanisme pelaksanaan..."
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:bg-white focus:border-blue-600 transition-all"
                ></textarea>
              </div>

              {/* TARGET OUTPUT & PERIODE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Target Output / Indikator Capaian</label>
                  <input
                    type="text"
                    value={formData.targetOutput || ''}
                    onChange={e => setFormData({ ...formData, targetOutput: e.target.value })}
                    placeholder="Contoh: 1 Dokumen Peta Jabatan & Formasi CASN"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-600 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Periode Pelaksanaan</label>
                  <select
                    value={formData.periode || 'Tahunan'}
                    onChange={e => setFormData({ ...formData, periode: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-600 transition-all"
                  >
                    <option value="Tahunan">Tahunan (Januari - Desember)</option>
                    <option value="Semesteran">Semesteran (6 Bulan)</option>
                    <option value="Triwulanan">Triwulanan (3 Bulan)</option>
                    <option value="Bulanan">Bulanan (Rutin)</option>
                    <option value="Insidentil">Insidentil / Sesuai Kebutuhan</option>
                  </select>
                </div>
              </div>

              {/* STATUS & PROGRES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Status Pelaksanaan</label>
                  <select
                    value={formData.status || 'DALAM_PROSES'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-all"
                  >
                    <option value="BELUM_DIMULAI">Belum Dimulai</option>
                    <option value="DALAM_PROSES">Dalam Proses</option>
                    <option value="TERUS_BERJALAN">Rutin / On-Going</option>
                    <option value="SELESAI">Selesai</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Progres (%)</label>
                    <span className="text-xs font-black text-blue-600">{formData.progres || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.progres || 0}
                    onChange={e => setFormData({ ...formData, progres: parseInt(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* APP MODULE LINK & PIC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Link Modul Aplikasi (Shortcut)</label>
                  <select
                    value={formData.appModuleLink || ''}
                    onChange={e => setFormData({ ...formData, appModuleLink: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-600 transition-all"
                  >
                    <option value="">-- Pilih Modul Terkait (Opsional) --</option>
                    <option value="/pegawai">Data Pegawai Master (/pegawai)</option>
                    <option value="/anjab-abk">ABK & ANJAB (/anjab-abk)</option>
                    <option value="/spmt-spp">SPMT & Pelantikan (/spmt-spp)</option>
                    <option value="/rekap-absensi">Rekap Presensi & Apel (/rekap-absensi)</option>
                    <option value="/laporan">Laporan Bulanan & SAKIP (/laporan)</option>
                    <option value="/keuangan">Keuangan & Anggaran (/keuangan)</option>
                    <option value="/pengembangan">Bimtek & Diklat (/pengembangan)</option>
                    <option value="/ukom/admin">Uji Kompetensi CAT (/ukom/admin)</option>
                    <option value="/talenta">Manajemen Talenta 9-Box (/talenta)</option>
                    <option value="/magang-pkl">Magang & PKL (/magang-pkl)</option>
                    <option value="/tubel-ibel">Tugas Belajar & Izin Belajar (/tubel-ibel)</option>
                    <option value="/satya-lencana">Satyalancana & Reward (/satya-lencana)</option>
                    <option value="/tugas-rutin">Log Tugas Rutin (/tugas-rutin)</option>
                    <option value="/skp">SKP E-Kinerja (/skp)</option>
                    <option value="/pak">PAK Konversi Angka Kredit (/pak)</option>
                    <option value="/kenaikan-pangkat">Kenaikan Pangkat (/kenaikan-pangkat)</option>
                    <option value="/kgb-gen">Kenaikan Gaji Berkala (/kgb-gen)</option>
                    <option value="/pensiun">Pensiun & BUP (/pensiun)</option>
                    <option value="/layanan-sdm">Portal Layanan SDM (/layanan-sdm)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Penanggung Jawab (PJ)</label>
                  <input
                    type="text"
                    value={formData.penanggungJawab || ''}
                    onChange={e => setFormData({ ...formData, penanggungJawab: e.target.value })}
                    placeholder="Nama Pegawai Penanggung Jawab"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              {/* DOKUMEN PENDUKUNG */}
              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Dokumen Pendukung / Arsip</span>
                  {uploadingDoc && <span className="text-blue-600 animate-pulse text-[9px]">Mengunggah ke Drive...</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.dokumenDukungUrl || ''}
                    onChange={e => setFormData({ ...formData, dokumenDukungUrl: e.target.value })}
                    placeholder="URL Google Drive / Link Dokumen"
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono outline-none"
                  />
                  <label className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase cursor-pointer flex items-center gap-1.5 transition-all shrink-0">
                    <i className="bi bi-upload"></i>
                    <span>Upload</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xlsx,.png,.jpg" />
                  </label>
                </div>
                {formData.dokumenDukungNama && (
                  <p className="text-[10px] font-bold text-slate-500">File: {formData.dokumenDukungNama}</p>
                )}
              </div>

              {/* CATATAN TAMBAHAN */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Catatan Tambahan / Kendala</label>
                <textarea
                  rows={2}
                  value={formData.catatan || ''}
                  onChange={e => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Catatan progres, tindak lanjut, atau koordinasi..."
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:bg-white focus:border-blue-600 transition-all"
                ></textarea>
              </div>

              {/* BUTTON ACTIONS */}
              <div className="pt-4 border-t flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3.5 bg-white border border-slate-200 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                >
                  {syncing ? (
                    <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Menyimpan...</>
                  ) : (
                    <><i className="bi bi-cloud-check-fill"></i> Simpan Tupoksi</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED WORKSPACE & TOOLKIT MODAL */}
      {activeWorkspaceItem && (
        <TupoksiActionWorkspaceModal
          item={activeWorkspaceItem}
          isOpen={!!activeWorkspaceItem}
          onClose={() => setActiveWorkspaceItem(null)}
          onUpdateStatus={handleUpdateWorkspaceStatus}
        />
      )}
    </div>
  );
};

export default TupoksiSDMPage;
