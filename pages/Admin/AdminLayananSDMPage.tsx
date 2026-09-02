import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { 
  fetchLayananSDMFromSheets, 
  fetchMasterLayananFromSheets, 
  calculateSLA, 
  savePengajuanSDMToSheets 
} from '../../spreadsheetService';
import { 
  STATUS_CONFIG, 
  LAYANAN_CATEGORIES, 
  MASTER_LAYANAN_DATA 
} from '../../layananMasterData';
import { PengajuanSDM, MasterLayanan, StatusPengajuan } from '../../types';

export const AdminLayananSDMPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [pengajuanList, setPengajuanList] = useState<PengajuanSDM[]>([]);
  const [masterList, setMasterList] = useState<MasterLayanan[]>(MASTER_LAYANAN_DATA);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [selectedPrioritas, setSelectedPrioritas] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'permohonan' | 'katalog' | 'analytics'>('permohonan');

  // Quick Assign Modal
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [petugasAssignName, setPetugasAssignName] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [savingAssign, setSavingAssign] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [submissions, services] = await Promise.all([
        fetchLayananSDMFromSheets(true),
        fetchMasterLayananFromSheets(true)
      ]);
      setPengajuanList(submissions || []);
      if (services && services.length > 0) setMasterList(services);
    } catch (e) {
      console.error('Error fetching admin Layanan SDM data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Global Statistics
  const stats = useMemo(() => {
    const total = pengajuanList.length;
    const diajukan = pengajuanList.filter(p => p.status === 'DIAJUKAN' || p.status === 'MENUNGGU_VERIFIKASI').length;
    const diproses = pengajuanList.filter(p => p.status === 'DIVERIFIKASI' || p.status === 'DALAM_PROSES').length;
    const perbaikan = pengajuanList.filter(p => p.status === 'PERLU_PERBAIKAN').length;
    const selesai = pengajuanList.filter(p => p.status === 'SELESAI').length;
    const ditolak = pengajuanList.filter(p => p.status === 'DITOLAK' || p.status === 'DIBATALKAN').length;
    const urgent = pengajuanList.filter(p => p.prioritas === 'URGENT' && p.status !== 'SELESAI' && p.status !== 'DITOLAK').length;
    
    // SLA Overdue count
    const overdue = pengajuanList.filter(p => {
      if (p.status === 'SELESAI' || p.status === 'DITOLAK' || p.status === 'DIBATALKAN') return false;
      const sla = calculateSLA(p.tanggalPengajuan, 3, p.status);
      return sla.statusSla === 'OVERDUE';
    }).length;

    return { total, diajukan, diproses, perbaikan, selesai, ditolak, urgent, overdue };
  }, [pengajuanList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return pengajuanList.filter(item => {
      // Status filter
      if (selectedStatus === 'DIAJUKAN' && (item.status !== 'DIAJUKAN' && item.status !== 'MENUNGGU_VERIFIKASI')) return false;
      if (selectedStatus === 'DIPROSES' && (item.status !== 'DIVERIFIKASI' && item.status !== 'DALAM_PROSES')) return false;
      if (selectedStatus === 'PERLU_PERBAIKAN' && item.status !== 'PERLU_PERBAIKAN') return false;
      if (selectedStatus === 'SELESAI' && item.status !== 'SELESAI') return false;
      if (selectedStatus === 'DITOLAK' && (item.status !== 'DITOLAK' && item.status !== 'DIBATALKAN')) return false;
      if (selectedStatus === 'OVERDUE') {
        if (item.status === 'SELESAI' || item.status === 'DITOLAK' || item.status === 'DIBATALKAN') return false;
        const sla = calculateSLA(item.tanggalPengajuan, 3, item.status);
        if (sla.statusSla !== 'OVERDUE') return false;
      }

      // Category filter
      if (selectedKategori !== 'ALL' && item.kategori !== selectedKategori) return false;

      // Priority filter
      if (selectedPrioritas !== 'ALL' && item.prioritas !== selectedPrioritas) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchTicket = item.nomorTiket?.toLowerCase().includes(q);
        const matchNip = item.nip?.toLowerCase().includes(q);
        const matchNama = item.nama?.toLowerCase().includes(q);
        const matchLayanan = item.namaLayanan?.toLowerCase().includes(q);
        const matchUnit = item.unitKerja?.toLowerCase().includes(q);
        if (!matchTicket && !matchNip && !matchNama && !matchLayanan && !matchUnit) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.tanggalPengajuan || b.createdAt || 0).getTime() - new Date(a.tanggalPengajuan || a.createdAt || 0).getTime());
  }, [pengajuanList, selectedStatus, selectedKategori, selectedPrioritas, searchQuery]);

  // Handle Quick Assign Petugas
  const handleAssignPetugas = async () => {
    if (!petugasAssignName.trim() || selectedItems.length === 0) return;
    setSavingAssign(true);

    try {
      const nowIso = new Date().toISOString();
      for (const idToAssign of selectedItems) {
        const item = pengajuanList.find(p => p.id === idToAssign);
        if (item) {
          const updated: PengajuanSDM = {
            ...item,
            petugasNama: petugasAssignName.trim(),
            status: item.status === 'DIAJUKAN' ? 'MENUNGGU_VERIFIKASI' : item.status,
            updatedAt: nowIso
          };
          await savePengajuanSDMToSheets(
            updated,
            { nip: user?.nip || '', name: user?.name || '', role: user?.role || 'Superadmin' },
            `Ditugaskan kepada petugas: ${petugasAssignName.trim()}`,
            item.status
          );
        }
      }
      setShowAssignModal(false);
      setSelectedItems([]);
      setPetugasAssignName('');
      loadData();
      alert(`Berhasil menugaskan ${selectedItems.length} permohonan ke ${petugasAssignName}`);
    } catch (e: any) {
      alert(`Gagal menugaskan: ${e.message || e}`);
    } finally {
      setSavingAssign(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const headers = ['Nomor Tiket', 'NIP', 'Nama Pemohon', 'Unit Kerja', 'Jabatan', 'Jenis Layanan', 'Kategori', 'Tanggal Pengajuan', 'Status', 'Prioritas', 'Petugas Pemroses', 'Tanggal Selesai'];
    const rows = filteredList.map(item => [
      `"${item.nomorTiket}"`,
      `"${item.nip}"`,
      `"${item.nama}"`,
      `"${item.unitKerja || ''}"`,
      `"${item.jabatan || ''}"`,
      `"${item.namaLayanan}"`,
      `"${item.kategori}"`,
      `"${item.tanggalPengajuan}"`,
      `"${item.status}"`,
      `"${item.prioritas || 'NORMAL'}"`,
      `"${item.petugasNama || ''}"`,
      `"${item.tanggalSelesai || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Layanan_SDM_KI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white pt-8 pb-8 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate('/tupoksi-sdm')}
                className="h-11 w-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all shadow-md shrink-0 active:scale-95 mt-1"
                title="Kembali ke Tupoksi SDM"
              >
                <i className="bi bi-arrow-left text-xl" />
              </button>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-semibold uppercase tracking-wider mb-3">
                  <i className="bi bi-shield-lock-fill" /> Panel Administrator SDM KI
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Dashboard Manajemen & Verifikasi Layanan SDM
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                  Kelola permohonan kepegawaian, verifikasi kelengkapan berkas, tetapkan disposisi petugas, dan terbitkan dokumen hasil layanan DJKI.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/tupoksi-sdm')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition backdrop-blur-sm"
                title="Kembali ke Modul Tupoksi SDM"
              >
                <i className="bi bi-arrow-left" />
                <span>Tupoksi SDM</span>
              </button>
              <Link
                to="/layanan-sdm"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition backdrop-blur-sm"
              >
                <i className="bi bi-eye" />
                <span>Portal Pemohon</span>
              </Link>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition"
              >
                <i className="bi bi-file-earmark-spreadsheet-fill" />
                <span>Ekspor Excel/CSV</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            <div
              onClick={() => setSelectedStatus('ALL')}
              className={`cursor-pointer bg-white/10 backdrop-blur-md border rounded-2xl p-3.5 transition hover:bg-white/15 ${selectedStatus === 'ALL' ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-white/15'}`}
            >
              <span className="text-[11px] text-slate-300 font-medium">Total Masuk</span>
              <div className="text-2xl font-black mt-1 text-white">{stats.total}</div>
            </div>

            <div
              onClick={() => setSelectedStatus('DIAJUKAN')}
              className={`cursor-pointer bg-white/10 backdrop-blur-md border rounded-2xl p-3.5 transition hover:bg-white/15 ${selectedStatus === 'DIAJUKAN' ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-white/15'}`}
            >
              <span className="text-[11px] text-blue-300 font-medium">Menunggu Verifikasi</span>
              <div className="text-2xl font-black mt-1 text-blue-200">{stats.diajukan}</div>
            </div>

            <div
              onClick={() => setSelectedStatus('DIPROSES')}
              className={`cursor-pointer bg-white/10 backdrop-blur-md border rounded-2xl p-3.5 transition hover:bg-white/15 ${selectedStatus === 'DIPROSES' ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-white/15'}`}
            >
              <span className="text-[11px] text-amber-300 font-medium">Sedang Diproses</span>
              <div className="text-2xl font-black mt-1 text-amber-200">{stats.diproses}</div>
            </div>

            <div
              onClick={() => setSelectedStatus('PERLU_PERBAIKAN')}
              className={`cursor-pointer bg-white/10 backdrop-blur-md border rounded-2xl p-3.5 transition hover:bg-white/15 ${selectedStatus === 'PERLU_PERBAIKAN' ? 'border-rose-400 ring-2 ring-rose-400/30' : 'border-white/15'}`}
            >
              <span className="text-[11px] text-rose-300 font-medium">Perlu Perbaikan</span>
              <div className="text-2xl font-black mt-1 text-rose-200">{stats.perbaikan}</div>
            </div>

            <div
              onClick={() => setSelectedStatus('SELESAI')}
              className={`cursor-pointer bg-white/10 backdrop-blur-md border rounded-2xl p-3.5 transition hover:bg-white/15 ${selectedStatus === 'SELESAI' ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-white/15'}`}
            >
              <span className="text-[11px] text-emerald-300 font-medium">Selesai</span>
              <div className="text-2xl font-black mt-1 text-emerald-200">{stats.selesai}</div>
            </div>

            <div
              onClick={() => setSelectedStatus('OVERDUE')}
              className={`cursor-pointer bg-white/10 backdrop-blur-md border rounded-2xl p-3.5 transition hover:bg-white/15 ${selectedStatus === 'OVERDUE' ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/20' : 'border-white/15'}`}
            >
              <span className="text-[11px] text-rose-300 font-medium">Melewati SLA</span>
              <div className="text-2xl font-black mt-1 text-rose-300">{stats.overdue}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Navigation Tabs (Permohonan / Master Katalog / Analytics) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('permohonan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'permohonan' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <i className="bi bi-inbox-fill mr-1.5" />
              Daftar Permohonan ({filteredList.length})
            </button>
            <button
              onClick={() => setActiveTab('katalog')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'katalog' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <i className="bi bi-grid-fill mr-1.5" />
              Master Katalog Layanan ({masterList.length})
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <i className={`bi bi-arrow-repeat ${loading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang Data</span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* VIEW 1: DAFTAR PERMOHONAN */}
        {/* ==================================================== */}
        {activeTab === 'permohonan' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="relative">
                <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari Tiket, NIP, Nama, Unit..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Status filter */}
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-slate-700"
              >
                <option value="ALL">Semua Status Permohonan</option>
                <option value="DIAJUKAN">Menunggu Verifikasi</option>
                <option value="DIPROSES">Dalam Proses</option>
                <option value="PERLU_PERBAIKAN">Perlu Perbaikan</option>
                <option value="SELESAI">Selesai</option>
                <option value="DITOLAK">Ditolak / Dibatalkan</option>
                <option value="OVERDUE">Melewati SLA</option>
              </select>

              {/* Category filter */}
              <select
                value={selectedKategori}
                onChange={e => setSelectedKategori(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-slate-700"
              >
                <option value="ALL">Semua Kategori Layanan</option>
                {LAYANAN_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>

              {/* Priority filter */}
              <select
                value={selectedPrioritas}
                onChange={e => setSelectedPrioritas(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-slate-700"
              >
                <option value="ALL">Semua Prioritas</option>
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Mendesak / Urgent</option>
              </select>
            </div>

            {/* Batch actions bar */}
            {selectedItems.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold text-blue-900">
                  {selectedItems.length} tiket permohonan dipilih
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <i className="bi bi-person-plus-fill mr-1" />
                    Tetapkan Petugas
                  </button>
                  <button
                    onClick={() => setSelectedItems([])}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Submissions Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === filteredList.length && filteredList.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedItems(filteredList.map(p => p.id));
                            else setSelectedItems([]);
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="py-3.5 px-4">Tiket & Tanggal</th>
                      <th className="py-3.5 px-4">Pemohon</th>
                      <th className="py-3.5 px-4">Jenis Layanan</th>
                      <th className="py-3.5 px-4">Status & Prioritas</th>
                      <th className="py-3.5 px-4">SLA Target</th>
                      <th className="py-3.5 px-4">Petugas</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <i className="bi bi-arrow-repeat animate-spin text-2xl mb-2 block" />
                          Memuat data permohonan...
                        </td>
                      </tr>
                    ) : filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <i className="bi bi-inbox text-2xl mb-2 block" />
                          Tidak ada data permohonan yang sesuai kriteria.
                        </td>
                      </tr>
                    ) : (
                      filteredList.map(item => {
                        const sCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['DIAJUKAN'];
                        const sla = calculateSLA(item.tanggalPengajuan, 3, item.status, item.tanggalSelesai);
                        const isSelected = selectedItems.includes(item.id);

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-blue-50/40 transition cursor-pointer ${
                              isSelected ? 'bg-blue-50/60' : ''
                            }`}
                            onClick={() => navigate(`/admin/layanan-sdm/pengajuan/${item.id}`)}
                          >
                            <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedItems(prev => [...prev, item.id]);
                                  else setSelectedItems(prev => prev.filter(x => x !== item.id));
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-blue-600 block">
                                {item.nomorTiket}
                              </span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {item.tanggalPengajuan}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <strong className="text-slate-900 block truncate max-w-[180px]">{item.nama}</strong>
                              <span className="text-[11px] text-slate-500 font-mono block">{item.nip}</span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">{item.unitKerja || '-'}</span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-800 block truncate max-w-[200px]">{item.namaLayanan}</span>
                              <span className="text-[10px] text-slate-400 block">{item.kategori}</span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md border ${sCfg.badge}`}>
                                  <i className={`bi ${sCfg.icon}`} />
                                  {sCfg.label}
                                </span>
                                {item.prioritas === 'URGENT' && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                                    URGENT
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md border ${sla.badgeClass}`}>
                                <i className="bi bi-stopwatch" />
                                {sla.label}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{sla.deadlineStr}</span>
                            </td>

                            <td className="py-3 px-4">
                              {item.petugasNama ? (
                                <span className="font-medium text-slate-800 text-xs block truncate max-w-[120px]">
                                  {item.petugasNama}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Belum ditugaskan</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                              <Link
                                to={`/admin/layanan-sdm/pengajuan/${item.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                              >
                                <span>Verifikasi</span>
                                <i className="bi bi-chevron-right text-[10px]" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 2: MASTER KATALOG LAYANAN */}
        {/* ==================================================== */}
        {activeTab === 'katalog' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Katalog Master Layanan SDM KI</h3>
                <p className="text-xs text-slate-500">Daftar konfigurasi layanan, standar SLA waktu penyelesaian, dan syarat dokumen.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {masterList.map(srv => {
                const catInfo = LAYANAN_CATEGORIES.find(c => c.id === srv.kategori) || LAYANAN_CATEGORIES[0];
                return (
                  <div key={srv.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-slate-500">{srv.kodeLayanan}</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          SLA {srv.slaHari} Hari Kerja
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{srv.namaLayanan}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{srv.deskripsi}</p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Kategori: <strong>{catInfo.nama}</strong></span>
                      <span>{srv.requiredDocuments.length} Dokumen Syarat</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* MODAL DISPOSISI / ASSIGN PETUGAS */}
      {/* ==================================================== */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Tetapkan Petugas Verifikator</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="bi bi-x-lg text-xs" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Pilih nama petugas tim SDM yang akan menangani {selectedItems.length} permohonan yang dipilih:
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Petugas SDM</label>
              <input
                type="text"
                value={petugasAssignName}
                onChange={e => setPetugasAssignName(e.target.value)}
                placeholder="Contoh: Budi Santoso, S.Kom."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingAssign || !petugasAssignName.trim()}
                onClick={handleAssignPetugas}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {savingAssign ? 'Menyimpan...' : 'Tetapkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminLayananSDMPage;
