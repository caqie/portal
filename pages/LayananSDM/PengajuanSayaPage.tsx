import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { 
  fetchLayananSDMFromSheets, 
  calculateSLA, 
  savePengajuanSDMToSheets 
} from '../../spreadsheetService';
import { 
  STATUS_CONFIG, 
  LAYANAN_CATEGORIES 
} from '../../layananMasterData';
import { PengajuanSDM, StatusPengajuan } from '../../types';

export const PengajuanSayaPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [pengajuanList, setPengajuanList] = useState<PengajuanSDM[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Active status filter tab
  const statusParam = searchParams.get('status') || 'ALL';
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>(statusParam);
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchLayananSDMFromSheets(true);
      setPengajuanList(data || []);
    } catch (e) {
      console.error('Error fetching submissions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (statusParam) {
      setSelectedStatusTab(statusParam);
    }
  }, [statusParam]);

  // User's submissions only
  const mySubmissions = useMemo(() => {
    if (!user?.nip) return [];
    return pengajuanList.filter(p => p.nip === user.nip);
  }, [pengajuanList, user]);

  // Counts by status
  const counts = useMemo(() => {
    const total = mySubmissions.length;
    const diajukan = mySubmissions.filter(p => p.status === 'DIAJUKAN' || p.status === 'MENUNGGU_VERIFIKASI').length;
    const diproses = mySubmissions.filter(p => p.status === 'DIVERIFIKASI' || p.status === 'DALAM_PROSES').length;
    const perluPerbaikan = mySubmissions.filter(p => p.status === 'PERLU_PERBAIKAN').length;
    const selesai = mySubmissions.filter(p => p.status === 'SELESAI').length;
    const ditolak = mySubmissions.filter(p => p.status === 'DITOLAK' || p.status === 'DIBATALKAN').length;
    return { total, diajukan, diproses, perluPerbaikan, selesai, ditolak };
  }, [mySubmissions]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return mySubmissions.filter(item => {
      // Status tab filter
      if (selectedStatusTab === 'DIAJUKAN' && (item.status !== 'DIAJUKAN' && item.status !== 'MENUNGGU_VERIFIKASI')) return false;
      if (selectedStatusTab === 'DIPROSES' && (item.status !== 'DIVERIFIKASI' && item.status !== 'DALAM_PROSES')) return false;
      if (selectedStatusTab === 'PERLU_PERBAIKAN' && item.status !== 'PERLU_PERBAIKAN') return false;
      if (selectedStatusTab === 'SELESAI' && item.status !== 'SELESAI') return false;
      if (selectedStatusTab === 'DITOLAK' && (item.status !== 'DITOLAK' && item.status !== 'DIBATALKAN')) return false;

      // Category filter
      if (selectedKategori !== 'ALL' && item.kategori !== selectedKategori) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchTicket = item.nomorTiket?.toLowerCase().includes(q);
        const matchService = item.namaLayanan?.toLowerCase().includes(q);
        const matchKeterangan = item.keterangan?.toLowerCase().includes(q);
        if (!matchTicket && !matchService && !matchKeterangan) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.tanggalPengajuan || b.createdAt || 0).getTime() - new Date(a.tanggalPengajuan || a.createdAt || 0).getTime());
  }, [mySubmissions, selectedStatusTab, selectedKategori, searchQuery]);

  // Handle Cancel Submission
  const handleCancelSubmission = async (item: PengajuanSDM, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.status !== 'DIAJUKAN') {
      alert('Hanya permohonan yang berstatus DIAJUKAN yang dapat dibatalkan.');
      return;
    }

    const confirmCancel = window.confirm(`Apakah Anda yakin ingin membatalkan permohonan ${item.nomorTiket} (${item.namaLayanan})?`);
    if (!confirmCancel) return;

    try {
      const updated: PengajuanSDM = {
        ...item,
        status: 'DIBATALKAN',
        updatedAt: new Date().toISOString()
      };
      await savePengajuanSDMToSheets(
        updated,
        { nip: user?.nip || '', name: user?.name || '', role: user?.role || 'Pegawai' },
        'Permohonan dibatalkan oleh pemohon',
        item.status
      );
      loadData();
    } catch (err) {
      alert('Gagal membatalkan permohonan.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to="/layanan-sdm"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                title="Kembali ke Portal Layanan"
              >
                <i className="bi bi-arrow-left text-lg" />
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                  Daftar Pengajuan Saya
                </h1>
                <p className="text-xs text-slate-500">
                  Pantau riwayat dan status proses permohonan kepegawaian Anda secara real-time.
                </p>
              </div>
            </div>

            {/* Top Right Action */}
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <i className={`bi bi-arrow-repeat ${loading ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
              <Link
                to="/layanan-sdm/pengajuan"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
              >
                <i className="bi bi-plus-lg" />
                <span>Buat Pengajuan Baru</span>
              </Link>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1 scrollbar-thin border-t border-slate-100 pt-3">
            {[
              { id: 'ALL', label: 'Semua', count: counts.total, icon: 'bi-grid' },
              { id: 'DIAJUKAN', label: 'Diajukan', count: counts.diajukan, icon: 'bi-send' },
              { id: 'DIPROSES', label: 'Diproses', count: counts.diproses, icon: 'bi-hourglass-split' },
              { id: 'PERLU_PERBAIKAN', label: 'Perlu Perbaikan', count: counts.perluPerbaikan, icon: 'bi-exclamation-triangle', highlight: counts.perluPerbaikan > 0 },
              { id: 'SELESAI', label: 'Selesai', count: counts.selesai, icon: 'bi-check2-circle' },
              { id: 'DITOLAK', label: 'Ditolak / Dibatalkan', count: counts.ditolak, icon: 'bi-x-circle' },
            ].map(tab => {
              const active = selectedStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedStatusTab(tab.id);
                    setSearchParams(tab.id === 'ALL' ? {} : { status: tab.id });
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : tab.highlight
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-extrabold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <i className={`bi ${tab.icon} text-xs`} />
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${active ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Search & Category Filter */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nomor tiket, jenis layanan, keterangan..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedKategori}
              onChange={e => setSelectedKategori(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Kategori</option>
              {LAYANAN_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.nama}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse flex items-center justify-between">
                <div className="space-y-2 w-2/3">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
                <div className="h-8 bg-slate-200 rounded-xl w-24" />
              </div>
            ))}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              <i className="bi bi-inbox" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Tidak ada permohonan</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Belum ada riwayat permohonan yang sesuai dengan filter atau kata kunci yang dipilih.
            </p>
            <Link
              to="/layanan-sdm/pengajuan"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <i className="bi bi-plus-lg" />
              <span>Buat Pengajuan Baru</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredSubmissions.map(item => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['DIAJUKAN'];
              const sla = calculateSLA(item.tanggalPengajuan, 3, item.status, item.tanggalSelesai);
              const isPerluPerbaikan = item.status === 'PERLU_PERBAIKAN';
              const isSelesai = item.status === 'SELESAI';
              const isDiajukan = item.status === 'DIAJUKAN';

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/layanan-sdm/pengajuan/${item.id}`)}
                  className={`cursor-pointer bg-white border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all group ${
                    isPerluPerbaikan
                      ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20'
                      : 'border-slate-200/90 hover:border-blue-400'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                          {item.nomorTiket}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-md border ${cfg.badge}`}>
                          <i className={`bi ${cfg.icon}`} />
                          {cfg.label}
                        </span>

                        {item.prioritas === 'URGENT' && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-1">
                            <i className="bi bi-lightning-charge-fill" /> Prioritas Mendesak
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400">
                          • Diajukan: {item.tanggalPengajuan}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {item.namaLayanan}
                        </h3>
                        {item.keterangan && (
                          <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                            {item.keterangan}
                          </p>
                        )}
                      </div>

                      {/* SLA Status Indicator */}
                      <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px]">SLA Target:</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${sla.badgeClass}`}>
                            <i className="bi bi-stopwatch" />
                            {sla.label} (Deadline: {sla.deadlineStr})
                          </span>
                        </div>

                        {item.petugasNama && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <i className="bi bi-person-check text-blue-500" />
                            <span>Petugas: <strong>{item.petugasNama}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Perlu Perbaikan Callout */}
                      {isPerluPerbaikan && (
                        <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                          <i className="bi bi-exclamation-octagon-fill text-rose-600 text-sm mt-0.5" />
                          <div>
                            <span className="font-bold">Catatan Perbaikan Verifikator: </span>
                            <span>{item.catatanPerbaikan || item.catatanVerifikator || 'Mohon lengkapi atau perbaiki dokumen yang diminta.'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Action buttons */}
                    <div className="flex items-center gap-2 lg:flex-col lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      {isPerluPerbaikan && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/layanan-sdm/pengajuan/${item.id}?action=perbaiki`);
                          }}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1"
                        >
                          <i className="bi bi-pencil-square" />
                          <span>Perbaiki Berkas</span>
                        </button>
                      )}

                      {isSelesai && item.fileHasilUrl && (
                        <a
                          href={item.fileHasilUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1"
                        >
                          <i className="bi bi-download" />
                          <span>Unduh Dokumen Hasil</span>
                        </a>
                      )}

                      {isDiajukan && (
                        <button
                          onClick={(e) => handleCancelSubmission(item, e)}
                          className="px-3 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition"
                          title="Batalkan permohonan ini"
                        >
                          Batalkan
                        </button>
                      )}

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                        <span>Lihat Detail</span>
                        <i className="bi bi-chevron-right text-[10px]" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default PengajuanSayaPage;
