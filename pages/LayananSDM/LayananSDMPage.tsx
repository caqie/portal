import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { 
  fetchLayananSDMFromSheets, 
  fetchMasterLayananFromSheets,
  calculateSLA 
} from '../../spreadsheetService';
import { 
  LAYANAN_CATEGORIES, 
  MASTER_LAYANAN_DATA, 
  STATUS_CONFIG 
} from '../../layananMasterData';
import { PengajuanSDM, MasterLayanan, LayananCategory } from '../../types';

export const LayananSDMPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [pengajuanList, setPengajuanList] = useState<PengajuanSDM[]>([]);
  const [masterLayanan, setMasterLayanan] = useState<MasterLayanan[]>(MASTER_LAYANAN_DATA);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');

  const isAdmin = user?.role === 'Superadmin' || user?.role === 'Editor';

  const loadData = async () => {
    setLoading(true);
    try {
      const [pengajuanRes, masterRes] = await Promise.all([
        fetchLayananSDMFromSheets(false),
        fetchMasterLayananFromSheets(false)
      ]);
      setPengajuanList(pengajuanRes || []);
      if (masterRes && masterRes.length > 0) {
        setMasterLayanan(masterRes);
      }
    } catch (e) {
      console.error('Error loading Layanan SDM data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter user's submissions
  const myPengajuan = useMemo(() => {
    if (!user?.nip) return [];
    return pengajuanList.filter(p => p.nip === user.nip);
  }, [pengajuanList, user]);

  // Statistics for Current User
  const stats = useMemo(() => {
    const total = myPengajuan.length;
    const diajukan = myPengajuan.filter(p => p.status === 'DIAJUKAN' || p.status === 'MENUNGGU_VERIFIKASI').length;
    const diproses = myPengajuan.filter(p => p.status === 'DIVERIFIKASI' || p.status === 'DALAM_PROSES').length;
    const perluPerbaikan = myPengajuan.filter(p => p.status === 'PERLU_PERBAIKAN').length;
    const selesai = myPengajuan.filter(p => p.status === 'SELESAI').length;
    return { total, diajukan, diproses, perluPerbaikan, selesai };
  }, [myPengajuan]);

  // Filtered Services Catalog
  const filteredServices = useMemo(() => {
    return masterLayanan.filter(item => {
      const matchesKategori = selectedKategori === 'ALL' || item.kategori === selectedKategori;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.namaLayanan.toLowerCase().includes(q) || 
        (item.deskripsi && item.deskripsi.toLowerCase().includes(q)) ||
        item.kategori.toLowerCase().includes(q);
      return matchesKategori && matchesSearch && item.aktif;
    });
  }, [masterLayanan, selectedKategori, searchQuery]);

  // Recent active submissions (max 4)
  const recentSubmissions = useMemo(() => {
    return [...myPengajuan]
      .sort((a, b) => new Date(b.tanggalPengajuan || b.createdAt || 0).getTime() - new Date(a.tanggalPengajuan || a.createdAt || 0).getTime())
      .slice(0, 4);
  }, [myPengajuan]);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white pt-8 pb-8 px-4 sm:px-6 lg:px-8 border-b border-indigo-950/40 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate(-1)}
                className="h-11 w-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all shadow-md shrink-0 active:scale-95 mt-1"
                title="Kembali"
              >
                <i className="bi bi-arrow-left text-xl" />
              </button>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold uppercase tracking-wider mb-3">
                  <i className="bi bi-patch-check-fill text-blue-400" />
                  Sistem Layanan & Helpdesk Kepegawaian
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                  Pusat Layanan SDM KI
                </h1>
                <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                  Layanan permohonan administrasi, kepangkatan, jabatan, tugas belajar, dan konsultasi kepegawaian resmi Direktorat Jenderal Kekayaan Intelektual.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/tupoksi-sdm')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 backdrop-blur-sm transition-all shadow-sm"
              >
                <i className="bi bi-diagram-3-fill text-blue-300" />
                <span>Tupoksi SDM</span>
              </button>
              <Link
                to="/layanan-sdm/pengajuan-saya"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 backdrop-blur-sm transition-all shadow-sm"
              >
                <i className="bi bi-clock-history text-blue-300" />
                <span>Pengajuan Saya</span>
                {myPengajuan.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-blue-500 text-white">
                    {myPengajuan.length}
                  </span>
                )}
              </Link>

              {isAdmin && (
                <Link
                  to="/admin/layanan-sdm"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <i className="bi bi-shield-lock-fill" />
                  <span>Panel Admin SDM</span>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition hover:bg-white/15">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-200 font-medium">Total Diajukan</span>
                <i className="bi bi-file-earmark-text text-blue-300 text-lg" />
              </div>
              <div className="text-2xl font-black mt-2 text-white">{stats.total}</div>
              <span className="text-[11px] text-slate-300">Permohonan Anda</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition hover:bg-white/15">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-200 font-medium">Dalam Proses</span>
                <i className="bi bi-hourglass-split text-amber-300 text-lg" />
              </div>
              <div className="text-2xl font-black mt-2 text-white">{stats.diajukan + stats.diproses}</div>
              <span className="text-[11px] text-slate-300">Sedang ditindaklanjuti</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition hover:bg-white/15">
              <div className="flex items-center justify-between">
                <span className="text-xs text-rose-200 font-medium">Perlu Perbaikan</span>
                <i className="bi bi-exclamation-circle text-rose-300 text-lg" />
              </div>
              <div className="text-2xl font-black mt-2 text-white">{stats.perluPerbaikan}</div>
              <span className="text-[11px] text-slate-300">Harap lengkapi berkas</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition hover:bg-white/15">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-200 font-medium">Selesai</span>
                <i className="bi bi-check2-circle text-emerald-300 text-lg" />
              </div>
              <div className="text-2xl font-black mt-2 text-white">{stats.selesai}</div>
              <span className="text-[11px] text-slate-300">Dokumen diterbitkan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Recent Submissions Warning / Quick Access */}
        {stats.perluPerbaikan > 0 && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
              <i className="bi bi-exclamation-triangle-fill text-xl" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-rose-900">Perhatian: Anda memiliki permohonan yang membutuhkan perbaikan berkas</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Petugas verifikator meminta perbaikan data/dokumen pada {stats.perluPerbaikan} permohonan Anda. Silakan klik tiket untuk melengkapi.
              </p>
            </div>
            <Link
              to="/layanan-sdm/pengajuan-saya?status=PERLU_PERBAIKAN"
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Lihat Berkas
            </Link>
          </div>
        )}

        {/* Active Recent Submissions Carousel/List */}
        {recentSubmissions.length > 0 && (
          <div className="mb-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-800">Status Pengajuan Terakhir Anda</h3>
              </div>
              <Link to="/layanan-sdm/pengajuan-saya" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                Semua Riwayat <i className="bi bi-chevron-right text-[10px]" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentSubmissions.map(item => {
                const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['DIAJUKAN'];
                const sla = calculateSLA(item.tanggalPengajuan, 3, item.status, item.tanggalSelesai);
                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/layanan-sdm/pengajuan/${item.id}`)}
                    className="cursor-pointer border border-slate-200/70 hover:border-blue-300 rounded-xl p-3.5 bg-slate-50/50 hover:bg-white hover:shadow-md transition group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-600 group-hover:text-blue-600 transition">
                        {item.nomorTiket}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md border ${cfg.badge}`}>
                        <i className={`bi ${cfg.icon} text-[10px]`} />
                        {cfg.label}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-1 group-hover:text-blue-600 transition">
                      {item.namaLayanan}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-200/60">
                      <span>{item.tanggalPengajuan}</span>
                      <span className={`text-[10px] font-semibold ${sla.colorClass}`}>
                        {sla.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari jenis layanan kepegawaian (cth: Kenaikan Pangkat, KGB, Izin Belajar, Legalisasi)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs"
                >
                  <i className="bi bi-x-circle-fill" />
                </button>
              )}
            </div>

            {/* Category Dropdown (Mobile) or Indicator */}
            <div className="w-full md:w-auto flex items-center justify-between gap-2 text-xs text-slate-500">
              <span>Menampilkan: <strong>{filteredServices.length}</strong> layanan</span>
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                title="Refresh Katalog"
              >
                <i className={`bi bi-arrow-repeat ${loading ? 'animate-spin' : ''}`} />
                <span>Muat Ulang</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setSelectedKategori('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                selectedKategori === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Kategori ({masterLayanan.length})
            </button>
            {LAYANAN_CATEGORIES.map(cat => {
              const count = masterLayanan.filter(l => l.kategori === cat.id && l.aktif).length;
              const isSelected = selectedKategori === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedKategori(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <i className={`bi ${cat.icon} text-xs`} />
                  <span>{cat.nama}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Services Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
                <div className="h-10 w-10 bg-slate-200 rounded-xl mb-4" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-full mb-1" />
                <div className="h-3 bg-slate-100 rounded w-2/3 mb-4" />
                <div className="h-9 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              <i className="bi bi-search" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Layanan tidak ditemukan</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Tidak ada layanan yang sesuai dengan kata kunci "{searchQuery}". Coba gunakan kata kunci umum atau pilih kategori lain.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedKategori('ALL'); }}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredServices.map(item => {
              const catInfo = LAYANAN_CATEGORIES.find(c => c.id === item.kategori) || LAYANAN_CATEGORIES[0];
              const docCount = item.requiredDocuments?.length || 0;
              const fieldCount = item.fields?.length || 0;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/80 hover:border-blue-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Top row: Icon, Category Badge, SLA */}
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 border border-blue-200/60 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition`}>
                        <i className={`bi ${item.icon || catInfo.icon}`} />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${catInfo.badgeBg}`}>
                          {catInfo.nama}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <i className="bi bi-stopwatch" /> SLA {item.slaHari} Hari
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                      {item.namaLayanan}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {item.deskripsi || 'Layanan permohonan kepegawaian resmi pada Direktorat Jenderal Kekayaan Intelektual.'}
                    </p>

                    {/* Requirements summary tags */}
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <i className="bi bi-ui-checks text-slate-400" /> {fieldCount} Form Isian
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <i className="bi bi-file-earmark-arrow-up text-slate-400" /> {docCount} Syarat Berkas
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Button */}
                  <div className="mt-5 pt-3">
                    <button
                      onClick={() => navigate(`/layanan-sdm/pengajuan?layananId=${item.id}`)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl transition shadow-sm hover:shadow"
                    >
                      <span>Ajukan Permohonan</span>
                      <i className="bi bi-arrow-right text-xs" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick FAQ / Informasi Hubungi Kami */}
        <div className="mt-12 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 sm:p-8 text-white shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-400/20 text-blue-200 border border-blue-400/30 text-xs font-semibold mb-3">
                <i className="bi bi-info-circle-fill" /> Layanan Bantuan Kepegawaian DJKI
              </div>
              <h3 className="text-xl font-bold text-white">Butuh Bantuan atau Konsultasi Khusus?</h3>
              <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                Subbagian Mutasi, Pengembangan, dan Administrasi Kepegawaian DJKI siap melayani konsultasi langsung setiap hari kerja pukul 08.00 - 16.00 WIB.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/layanan-sdm/pengajuan?layananId=LYN-KS-01')}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl shadow-sm transition"
              >
                <i className="bi bi-chat-dots-fill mr-1.5 text-blue-600" />
                Konsultasi SDM
              </button>
              <button
                onClick={() => navigate('/layanan-sdm/pengajuan?layananId=LYN-LN-01')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition"
              >
                Permohonan Lainnya
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LayananSDMPage;
