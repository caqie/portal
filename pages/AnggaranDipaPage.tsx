import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import DipaPokDetailView from '../components/DipaPokDetailView';

interface MataAnggaranItem {
  id: string;
  kodeAkun: string;
  namaAkun: string;
  kategori: 'Belanja Pegawai (51)' | 'Belanja Operasional SDM (52)';
  paguDipa: number;
  realisasi: number;
  roOutput: string;
  keterangan: string;
}

interface UsulanRevisiItem {
  id: string;
  tanggal: string;
  nomorSurat: string;
  jenisRevisi: 'Antar Akun / POK' | 'Pergeseran Pagu' | 'Optimalisasi Anggaran';
  akunAsal: string;
  akunTujuan: string;
  nominal: number;
  alasan: string;
  status: 'Draft' | 'Diusulkan ke Keuangan' | 'Disetujui PPK' | 'Ditolak';
}

const INITIAL_MATA_ANGGARAN: MataAnggaranItem[] = [
  {
    id: 'MA-001',
    kodeAkun: '511111',
    namaAkun: 'Belanja Gaji Pokok PNS',
    kategori: 'Belanja Pegawai (51)',
    paguDipa: 28450000000,
    realisasi: 18966000000,
    roOutput: '001.001 - Pembayaran Hak Gaji Pegawai',
    keterangan: 'Pagu gaji pokok reguler 600+ pegawai DJKI'
  },
  {
    id: 'MA-002',
    kodeAkun: '511129',
    namaAkun: 'Belanja Uang Makan PNS & PPPK',
    kategori: 'Belanja Pegawai (51)',
    paguDipa: 4200000000,
    realisasi: 2800000000,
    roOutput: '001.002 - Uang Makan Berbasis Presensi',
    keterangan: 'Tarif PMK Gol I/II (Rp35k), Gol III (Rp37k), Gol IV (Rp41k)'
  },
  {
    id: 'MA-003',
    kodeAkun: '511151',
    namaAkun: 'Belanja Uang Lembur & Uang Makan Lembur',
    kategori: 'Belanja Pegawai (51)',
    paguDipa: 850000000,
    realisasi: 510000000,
    roOutput: '001.003 - Penyelenggaraan Lembur SDM & Substansi',
    keterangan: 'Surat Perintah Lembur dengan output target terukur'
  },
  {
    id: 'MA-004',
    kodeAkun: '521213',
    namaAkun: 'Honorarium Narasumber & Tim Panitia Ukom/Seleksi',
    kategori: 'Belanja Operasional SDM (52)',
    paguDipa: 450000000,
    realisasi: 315000000,
    roOutput: '002.001 - Ujian Kompetensi & Penilaian Talenta',
    keterangan: 'Honor narasumber bimtek dan tim pelaksana seleksi internal'
  },
  {
    id: 'MA-005',
    kodeAkun: '524111',
    namaAkun: 'Belanja Perjalanan Dinas Biasa Bimtek & Bangkom',
    kategori: 'Belanja Operasional SDM (52)',
    paguDipa: 1200000000,
    realisasi: 780000000,
    roOutput: '002.002 - Peningkatan Kompetensi Teknis ASN',
    keterangan: 'Fasilitasi diklat teknis, sertifikasi & bimtek fungsional KI'
  },
  {
    id: 'MA-006',
    kodeAkun: '521811',
    namaAkun: 'Belanja Bahan & ATK Administrasi Kepegawaian',
    kategori: 'Belanja Operasional SDM (52)',
    paguDipa: 320000000,
    realisasi: 210000000,
    roOutput: '001.004 - Operasional Layanan Terpadu SDM',
    keterangan: 'Pengadaan blanko karpeg, map dossier, ordner SK, materi ukom'
  },
  {
    id: 'MA-007',
    kodeAkun: '522191',
    namaAkun: 'Belanja Jasa Pengembangan Aplikasi & Server SDM',
    kategori: 'Belanja Operasional SDM (52)',
    paguDipa: 280000000,
    realisasi: 195000000,
    roOutput: '001.005 - Digitalisasi Layanan Kepegawaian DJKI',
    keterangan: 'Infrastruktur cloud portal, face recognition & smart attendance'
  }
];

export const AnggaranDipaPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperadmin, canEdit, logActivity } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'pok-detail' | 'pagu' | 'revisi' | 'simulasi' | 'ikpa'>('pok-detail');
  const [anggaranList, setAnggaranList] = useState<MataAnggaranItem[]>(INITIAL_MATA_ANGGARAN);
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modal Akun (Add & Edit)
  const [isAkunModalOpen, setIsAkunModalOpen] = useState(false);
  const [isEditAkunMode, setIsEditAkunMode] = useState(false);
  const [selectedAkun, setSelectedAkun] = useState<MataAnggaranItem | null>(null);
  const [akunForm, setAkunForm] = useState<Partial<MataAnggaranItem>>({
    kodeAkun: '',
    namaAkun: '',
    kategori: 'Belanja Operasional SDM (52)',
    paguDipa: 0,
    realisasi: 0,
    roOutput: '',
    keterangan: ''
  });

  // Modal Delete Confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'AKUN' | 'REVISI'; id: string; name: string } | null>(null);

  // Usulan Revisi
  const [revisiList, setRevisiList] = useState<UsulanRevisiItem[]>([
    {
      id: 'REV-2026-001',
      tanggal: '2026-08-15',
      nomorSurat: 'SDM.1-KU.01.02-452',
      jenisRevisi: 'Antar Akun / POK',
      akunAsal: '521811 (Belanja Bahan ATK)',
      akunTujuan: '524111 (Bimtek & Bangkom)',
      nominal: 50000000,
      alasan: 'Optimalisasi sisa pagu ATK semester 1 untuk tambahan kuota sertifikasi teknis pemeriksa KI',
      status: 'Disetujui PPK'
    }
  ]);
  const [isRevisiModalOpen, setIsRevisiModalOpen] = useState(false);
  const [isEditRevisiMode, setIsEditRevisiMode] = useState(false);
  const [selectedRevisi, setSelectedRevisi] = useState<UsulanRevisiItem | null>(null);
  const [revisiForm, setRevisiForm] = useState<Partial<UsulanRevisiItem>>({
    jenisRevisi: 'Antar Akun / POK',
    akunAsal: '',
    akunTujuan: '',
    nominal: 0,
    alasan: '',
    status: 'Diusulkan ke Keuangan'
  });

  // Simulasi
  const [simAkunAsal, setSimAkunAsal] = useState<string>(INITIAL_MATA_ANGGARAN[5].id);
  const [simAkunTujuan, setSimAkunTujuan] = useState<string>(INITIAL_MATA_ANGGARAN[4].id);
  const [simNominal, setSimNominal] = useState<number>(50000000);

  // Success Notification
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Calculations
  const totalPagu = useMemo(() => anggaranList.reduce((acc, curr) => acc + curr.paguDipa, 0), [anggaranList]);
  const totalRealisasi = useMemo(() => anggaranList.reduce((acc, curr) => acc + curr.realisasi, 0), [anggaranList]);
  const sisaPagu = totalPagu - totalRealisasi;
  const persentaseRealisasi = totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(1) : '0';

  const filteredAnggaran = useMemo(() => {
    return anggaranList.filter((item) => {
      const matchKategori = filterKategori === 'Semua' || item.kategori === filterKategori;
      const matchSearch =
        searchQuery === '' ||
        item.kodeAkun.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.namaAkun.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.roOutput.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKategori && matchSearch;
    });
  }, [anggaranList, filterKategori, searchQuery]);

  // CRUD Handlers for Akun Anggaran
  const handleOpenAddAkun = () => {
    setIsEditAkunMode(false);
    setSelectedAkun(null);
    setAkunForm({
      kodeAkun: '',
      namaAkun: '',
      kategori: 'Belanja Operasional SDM (52)',
      paguDipa: 0,
      realisasi: 0,
      roOutput: '',
      keterangan: ''
    });
    setIsAkunModalOpen(true);
  };

  const handleOpenEditAkun = (item: MataAnggaranItem) => {
    setIsEditAkunMode(true);
    setSelectedAkun(item);
    setAkunForm({ ...item });
    setIsAkunModalOpen(true);
  };

  const handleSaveAkun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!akunForm.kodeAkun || !akunForm.namaAkun) {
      alert('Mohon isi kode akun dan nama akun.');
      return;
    }

    if (isEditAkunMode && selectedAkun) {
      setAnggaranList(prev => prev.map(a => a.id === selectedAkun.id ? {
        ...a,
        ...akunForm,
        paguDipa: Number(akunForm.paguDipa) || 0,
        realisasi: Number(akunForm.realisasi) || 0
      } as MataAnggaranItem : a));
      setSuccessMsg(`Akun Anggaran ${akunForm.kodeAkun} berhasil diperbarui.`);
      logActivity('UPDATE', 'Anggaran & DIPA', `Memperbarui Akun Anggaran ${akunForm.kodeAkun} - ${akunForm.namaAkun}`);
    } else {
      const newAkun: MataAnggaranItem = {
        id: `MA-${Date.now().toString().slice(-4)}`,
        kodeAkun: akunForm.kodeAkun || '',
        namaAkun: akunForm.namaAkun || '',
        kategori: akunForm.kategori || 'Belanja Operasional SDM (52)',
        paguDipa: Number(akunForm.paguDipa) || 0,
        realisasi: Number(akunForm.realisasi) || 0,
        roOutput: akunForm.roOutput || '001.006 - Operasional Kepegawaian',
        keterangan: akunForm.keterangan || ''
      };
      setAnggaranList([newAkun, ...anggaranList]);
      setSuccessMsg(`Akun Anggaran ${newAkun.kodeAkun} berhasil ditambahkan.`);
      logActivity('CREATE', 'Anggaran & DIPA', `Menambah Akun Anggaran: ${newAkun.kodeAkun} - ${newAkun.namaAkun}`);
    }

    setIsAkunModalOpen(false);
    setShowSuccess(true);
  };

  // CRUD Handlers for Revisi
  const handleOpenAddRevisi = () => {
    setIsEditRevisiMode(false);
    setSelectedRevisi(null);
    setRevisiForm({
      jenisRevisi: 'Antar Akun / POK',
      akunAsal: anggaranList[0]?.namaAkun ? `${anggaranList[0].kodeAkun} (${anggaranList[0].namaAkun})` : '',
      akunTujuan: anggaranList[1]?.namaAkun ? `${anggaranList[1].kodeAkun} (${anggaranList[1].namaAkun})` : '',
      nominal: 10000000,
      alasan: '',
      status: 'Diusulkan ke Keuangan'
    });
    setIsRevisiModalOpen(true);
  };

  const handleOpenEditRevisi = (rev: UsulanRevisiItem) => {
    setIsEditRevisiMode(true);
    setSelectedRevisi(rev);
    setRevisiForm({ ...rev });
    setIsRevisiModalOpen(true);
  };

  const handleSaveRevisi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisiForm.akunAsal || !revisiForm.akunTujuan || !revisiForm.nominal || Number(revisiForm.nominal) <= 0) {
      alert('Harap lengkapi akun asal, akun tujuan, dan nominal revisi.');
      return;
    }

    if (isEditRevisiMode && selectedRevisi) {
      setRevisiList(prev => prev.map(r => r.id === selectedRevisi.id ? {
        ...r,
        ...revisiForm,
        nominal: Number(revisiForm.nominal) || 0
      } as UsulanRevisiItem : r));
      setSuccessMsg(`Usulan Revisi ${selectedRevisi.nomorSurat} berhasil diperbarui.`);
      logActivity('UPDATE', 'Anggaran & DIPA', `Update Usulan Revisi: ${selectedRevisi.nomorSurat}`);
    } else {
      const newRev: UsulanRevisiItem = {
        id: `REV-${Date.now().toString().slice(-4)}`,
        tanggal: new Date().toISOString().split('T')[0],
        nomorSurat: `SDM.1-KU.01.02-${Math.floor(Math.random() * 900 + 100)}`,
        jenisRevisi: revisiForm.jenisRevisi || 'Antar Akun / POK',
        akunAsal: revisiForm.akunAsal || '',
        akunTujuan: revisiForm.akunTujuan || '',
        nominal: Number(revisiForm.nominal),
        alasan: revisiForm.alasan || 'Penyesuaian kebutuhan riil operasional SDM',
        status: revisiForm.status || 'Diusulkan ke Keuangan'
      };
      setRevisiList([newRev, ...revisiList]);
      setSuccessMsg('Usulan revisi anggaran POK SDM berhasil diajukan.');
      logActivity('CREATE', 'Anggaran & DIPA', `Mengajukan Usulan Revisi Anggaran POK: ${newRev.nomorSurat}`);
    }

    setIsRevisiModalOpen(false);
    setShowSuccess(true);
  };

  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'AKUN') {
      setAnggaranList(prev => prev.filter(a => a.id !== itemToDelete.id));
      setSuccessMsg(`Akun ${itemToDelete.name} berhasil dihapus.`);
      logActivity('DELETE', 'Anggaran & DIPA', `Menghapus Akun Anggaran: ${itemToDelete.name}`);
    } else {
      setRevisiList(prev => prev.filter(r => r.id !== itemToDelete.id));
      setSuccessMsg(`Usulan Revisi ${itemToDelete.name} berhasil dihapus.`);
      logActivity('DELETE', 'Anggaran & DIPA', `Menghapus Usulan Revisi: ${itemToDelete.name}`);
    }
    setIsDeleteModalOpen(false);
    setShowSuccess(true);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-fadeIn text-gray-900">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Konfirmasi Hapus Data"
        message={`Apakah Anda yakin ingin menghapus data ${itemToDelete?.name}? Tindakan ini tidak dapat dibatalkan.`}
      />

      {/* Header Utama with Back Button */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start md:items-center gap-4">
            {/* BACK BUTTON */}
            <button
              onClick={() => navigate('/tupoksi-sdm')}
              className="h-12 w-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all shadow-md shrink-0 active:scale-95"
              title="Kembali ke Matriks Tupoksi SDM"
            >
              <i className="bi bi-arrow-left text-xl"></i>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  Sub-Tim 1: Perencanaan &amp; Manajemen Layanan SDM
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">
                Perencanaan Anggaran &amp; Monitoring DIPA SDM
              </h1>
              <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
                Pengelolaan RKA-K/L, POK, Pagu Belanja Pegawai (51), Belanja Operasional SDM (52), Usulan Revisi Anggaran, dan Evaluasi IKPA Kepegawaian DJKI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <>
                <button
                  onClick={handleOpenAddAkun}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <i className="bi bi-plus-circle-fill"></i>
                  <span>+ Akun Belanja POK</span>
                </button>
                <button
                  onClick={handleOpenAddRevisi}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <i className="bi bi-file-earmark-diff-fill"></i>
                  <span>Ajukan Revisi POK</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick KPI Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Total Pagu DIPA SDM</span>
            <p className="text-lg md:text-xl font-black text-white mt-0.5">{formatRupiah(totalPagu)}</p>
            <span className="text-[9px] text-emerald-300 font-semibold">Tahun Anggaran {new Date().getFullYear()}</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Realisasi Anggaran</span>
            <p className="text-lg md:text-xl font-black text-emerald-400 mt-0.5">{formatRupiah(totalRealisasi)}</p>
            <span className="text-[9px] text-white/80 font-bold">Serapan: {persentaseRealisasi}%</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Sisa Pagu Anggaran</span>
            <p className="text-lg md:text-xl font-black text-amber-300 mt-0.5">{formatRupiah(sisaPagu)}</p>
            <span className="text-[9px] text-white/80 font-bold">Tersedia untuk diserap</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Indeks IKPA SDM</span>
            <p className="text-lg md:text-xl font-black text-white mt-0.5">97.80 / 100</p>
            <span className="text-[9px] text-emerald-300 font-semibold">Predikat: SANGAT BAIK</span>
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex items-center justify-between bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('pok-detail')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'pok-detail' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-file-earmark-spreadsheet-fill text-emerald-400"></i>
            <span>Rincian POK &amp; Realisasi Anggaran (Data Riil DJKI)</span>
          </button>

          <button
            onClick={() => setActiveTab('pagu')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'pagu' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-table"></i>
            <span>Matriks Pagu &amp; Akun POK</span>
          </button>

          <button
            onClick={() => setActiveTab('revisi')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'revisi' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-file-earmark-diff"></i>
            <span>Usulan Revisi Anggaran ({revisiList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('simulasi')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'simulasi' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-sliders2"></i>
            <span>Simulasi Pergeseran Pagu</span>
          </button>

          <button
            onClick={() => setActiveTab('ikpa')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'ikpa' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-speedometer2"></i>
            <span>Indikator IKPA SDM</span>
          </button>
        </div>
      </div>

      {/* TAB 0: RINCIAN POK RKA-K/L RESMI (DATA RIIL DIPA SDM) */}
      {activeTab === 'pok-detail' && (
        <DipaPokDetailView canEdit={canEdit} />
      )}

      {/* TAB 1: MATRIKS PAGU & AKUN DIPA */}
      {activeTab === 'pagu' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600">Filter Kategori:</span>
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
              >
                <option value="Semua">Semua Kategori Belanja</option>
                <option value="Belanja Pegawai (51)">Belanja Pegawai (51)</option>
                <option value="Belanja Operasional SDM (52)">Belanja Operasional SDM (52)</option>
              </select>
            </div>

            <div className="relative">
              <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode akun, nama, RO output..."
                className="pl-8 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Table Matriks Akun */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[10px] font-black">
                  <tr>
                    <th className="py-3 px-4">Kode &amp; Nama Akun Belanja</th>
                    <th className="py-3 px-4">Kategori &amp; Rincian Output (RO)</th>
                    <th className="py-3 px-4 text-right">Pagu DIPA (Rp)</th>
                    <th className="py-3 px-4 text-right">Realisasi (Rp)</th>
                    <th className="py-3 px-4 text-center">Serapan</th>
                    <th className="py-3 px-4 text-right">Sisa Pagu (Rp)</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {filteredAnggaran.map((item) => {
                    const pct = item.paguDipa > 0 ? (item.realisasi / item.paguDipa) * 100 : 0;
                    const sisa = item.paguDipa - item.realisasi;
                    return (
                      <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px] mr-1.5">
                            {item.kodeAkun}
                          </span>
                          <span className="font-bold text-gray-900 block mt-0.5">{item.namaAkun}</span>
                          <span className="text-[10px] text-gray-400 block">{item.keterangan}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            item.kategori.includes('51') ? 'bg-purple-100 text-purple-800' : 'bg-cyan-100 text-cyan-800'
                          }`}>
                            {item.kategori}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-600 block mt-1">
                            {item.roOutput}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                          {formatRupiah(item.paguDipa)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                          {formatRupiah(item.realisasi)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-xs text-gray-900">{pct.toFixed(1)}%</span>
                            <div className="w-16 bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full ${pct > 80 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-amber-700">
                          {formatRupiah(sisa)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditAkun(item)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all"
                              title="Edit Akun & Pagu"
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setItemToDelete({ type: 'AKUN', id: item.id, name: `${item.kodeAkun} - ${item.namaAkun}` });
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all"
                                title="Hapus Akun"
                              >
                                <i className="bi bi-trash-fill"></i>
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
        </div>
      )}

      {/* TAB 2: USULAN REVISI POK */}
      {activeTab === 'revisi' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Daftar Usulan Revisi Anggaran POK SDM</h3>
              <p className="text-xs text-gray-500">Histori dan status pengajuan revisi antar akun / optimalisasi belanja pegawai &amp; operasional.</p>
            </div>
            {canEdit && (
              <button
                onClick={handleOpenAddRevisi}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
              >
                <i className="bi bi-plus-lg"></i>
                <span>Buat Usulan Baru</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {revisiList.map((rev) => (
              <div key={rev.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div>
                    <span className="font-mono text-xs font-black text-indigo-600">{rev.nomorSurat}</span>
                    <span className="text-[10px] text-gray-400 block">{rev.tanggal}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    rev.status === 'Disetujui PPK' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {rev.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Jenis Revisi:</span>
                    <span className="font-bold text-gray-800">{rev.jenisRevisi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Akun Sumber (Asal):</span>
                    <span className="font-semibold text-rose-700">{rev.akunAsal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Akun Penerima (Tujuan):</span>
                    <span className="font-semibold text-emerald-700">{rev.akunTujuan}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-1.5">
                    <span className="font-bold text-gray-700">Nominal Pergeseran:</span>
                    <span className="font-black text-indigo-700 text-sm">{formatRupiah(rev.nominal)}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl text-[11px] text-gray-600">
                  <span className="font-bold text-gray-800 block mb-0.5">Uraian / Justifikasi:</span>
                  {rev.alasan}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEditRevisi(rev)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all"
                  >
                    Edit Usulan
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => {
                        setItemToDelete({ type: 'REVISI', id: rev.id, name: rev.nomorSurat });
                        setIsDeleteModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SIMULASI */}
      {activeTab === 'simulasi' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase">Kalkulator Simulasi Pergeseran Anggaran</h3>
            <p className="text-xs text-gray-500">Uji coba dampak pergeseran dana antar akun belanja tanpa mengubah data riil DIPA.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Akun Pengurang (Sumber)</label>
              <select
                value={simAkunAsal}
                onChange={(e) => setSimAkunAsal(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
              >
                {anggaranList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.kodeAkun} - {a.namaAkun} (Sisa: {formatRupiah(a.paguDipa - a.realisasi)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Akun Penambah (Tujuan)</label>
              <select
                value={simAkunTujuan}
                onChange={(e) => setSimAkunTujuan(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
              >
                {anggaranList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.kodeAkun} - {a.namaAkun}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nominal Pergeseran (Rp)</label>
              <input
                type="number"
                step="1000000"
                value={simNominal}
                onChange={(e) => setSimNominal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
              />
            </div>
          </div>

          {/* Hasil Simulasi */}
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-indigo-900 block">Proyeksi Ketersediaan Dana Pasca Revisi:</span>
              <span className="text-[11px] text-gray-600">Pergeseran senilai {formatRupiah(simNominal)} antar pos belanja</span>
            </div>
            <span className="px-4 py-2 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider">
              Simulasi Valid
            </span>
          </div>
        </div>
      )}

      {/* TAB 4: IKPA */}
      {activeTab === 'ikpa' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Deviasi Hal III DIPA</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">98.50</p>
              <p className="text-xs text-gray-500 mt-1">Tingkat kesesuaian penarikan dana bulanan dengan RPD Hal III DIPA</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Penyerapan Anggaran</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">96.80</p>
              <p className="text-xs text-gray-500 mt-1">Kecepatan serapan anggaran triwulanan memenuhi target Kemenkeu</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Capaian Output SDM</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">98.20</p>
              <p className="text-xs text-gray-500 mt-1">Penyelesaian target kuantitatif layanan kepegawaian &amp; diklat</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT AKUN BELANJA */}
      {isAkunModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900">
                {isEditAkunMode ? 'Edit Akun Belanja DIPA' : 'Tambah Akun Belanja POK SDM'}
              </h3>
              <button onClick={() => setIsAkunModalOpen(false)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveAkun} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Kode Akun</label>
                  <input
                    type="text"
                    value={akunForm.kodeAkun || ''}
                    onChange={(e) => setAkunForm({ ...akunForm, kodeAkun: e.target.value })}
                    placeholder="Contoh: 521811"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Kategori</label>
                  <select
                    value={akunForm.kategori}
                    onChange={(e) => setAkunForm({ ...akunForm, kategori: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="Belanja Pegawai (51)">Belanja Pegawai (51)</option>
                    <option value="Belanja Operasional SDM (52)">Belanja Operasional SDM (52)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nama Akun Belanja</label>
                <input
                  type="text"
                  value={akunForm.namaAkun || ''}
                  onChange={(e) => setAkunForm({ ...akunForm, namaAkun: e.target.value })}
                  placeholder="Contoh: Belanja Bahan & ATK Kepegawaian"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Pagu DIPA (Rp)</label>
                  <input
                    type="number"
                    value={akunForm.paguDipa || 0}
                    onChange={(e) => setAkunForm({ ...akunForm, paguDipa: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-indigo-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Realisasi (Rp)</label>
                  <input
                    type="number"
                    value={akunForm.realisasi || 0}
                    onChange={(e) => setAkunForm({ ...akunForm, realisasi: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Rincian Output (RO)</label>
                <input
                  type="text"
                  value={akunForm.roOutput || ''}
                  onChange={(e) => setAkunForm({ ...akunForm, roOutput: e.target.value })}
                  placeholder="Contoh: 001.004 - Operasional Layanan Terpadu SDM"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={akunForm.keterangan || ''}
                  onChange={(e) => setAkunForm({ ...akunForm, keterangan: e.target.value })}
                  placeholder="Deskripsi peruntukan belanja..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAkunModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg"
                >
                  {isEditAkunMode ? 'Simpan Perubahan' : 'Tambah Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL USULAN REVISI */}
      {isRevisiModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900">
                {isEditRevisiMode ? 'Edit Usulan Revisi POK' : 'Form Pengajuan Usulan Revisi POK SDM'}
              </h3>
              <button onClick={() => setIsRevisiModalOpen(false)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveRevisi} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Jenis Revisi</label>
                <select
                  value={revisiForm.jenisRevisi}
                  onChange={(e) => setRevisiForm({ ...revisiForm, jenisRevisi: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                >
                  <option value="Antar Akun / POK">Antar Akun / POK</option>
                  <option value="Pergeseran Pagu">Pergeseran Pagu</option>
                  <option value="Optimalisasi Anggaran">Optimalisasi Anggaran</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Akun Sumber (Asal)</label>
                <select
                  value={revisiForm.akunAsal}
                  onChange={(e) => setRevisiForm({ ...revisiForm, akunAsal: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                >
                  <option value="">Pilih Akun Sumber...</option>
                  {anggaranList.map((a) => (
                    <option key={a.id} value={`${a.kodeAkun} (${a.namaAkun})`}>
                      {a.kodeAkun} - {a.namaAkun} (Sisa: {formatRupiah(a.paguDipa - a.realisasi)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Akun Penerima (Tujuan)</label>
                <select
                  value={revisiForm.akunTujuan}
                  onChange={(e) => setRevisiForm({ ...revisiForm, akunTujuan: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                >
                  <option value="">Pilih Akun Penerima...</option>
                  {anggaranList.map((a) => (
                    <option key={a.id} value={`${a.kodeAkun} (${a.namaAkun})`}>
                      {a.kodeAkun} - {a.namaAkun}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    value={revisiForm.nominal || 0}
                    onChange={(e) => setRevisiForm({ ...revisiForm, nominal: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-indigo-700"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Status Usulan</label>
                  <select
                    value={revisiForm.status}
                    onChange={(e) => setRevisiForm({ ...revisiForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Diusulkan ke Keuangan">Diusulkan ke Keuangan</option>
                    <option value="Disetujui PPK">Disetujui PPK</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Alasan &amp; Justifikasi Pergeseran</label>
                <textarea
                  rows={2}
                  value={revisiForm.alasan}
                  onChange={(e) => setRevisiForm({ ...revisiForm, alasan: e.target.value })}
                  placeholder="Kebutuhan mendesak operasional atau bimtek..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRevisiModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl shadow-lg"
                >
                  {isEditRevisiMode ? 'Simpan Usulan' : 'Ajukan Usulan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnggaranDipaPage;
