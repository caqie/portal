import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { fetchLayananSDMFromSheets } from '../../spreadsheetService';
import { PengajuanSDM } from '../../types';

interface LayananSDMAlertBannerProps {
  className?: string;
}

export const LayananSDMAlertBanner: React.FC<LayananSDMAlertBannerProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pengajuanList, setPengajuanList] = useState<PengajuanSDM[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchLayananSDMFromSheets(false);
      setPengajuanList(data || []);
    } catch (e) {
      // silent catch
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('storage_updated', handleSync);
    window.addEventListener('sdm_notifications_updated', handleSync);
    return () => {
      window.removeEventListener('storage_updated', handleSync);
      window.removeEventListener('sdm_notifications_updated', handleSync);
    };
  }, [user]);

  const isAdmin = user?.role === 'Superadmin' || user?.role === 'Editor' || user?.role === 'Admin Uang Makan';
  const userNip = user?.nip;

  // Cek tiket milik user yang butuh perbaikan
  const userRevisiTickets = useMemo(() => {
    if (!userNip) return [];
    return pengajuanList.filter(p => p.nip === userNip && p.status === 'PERLU_PERBAIKAN');
  }, [pengajuanList, userNip]);

  // Cek tiket milik user yang baru selesai
  const userSelesaiTickets = useMemo(() => {
    if (!userNip) return [];
    return pengajuanList.filter(p => p.nip === userNip && p.status === 'SELESAI' && p.linkHasil);
  }, [pengajuanList, userNip]);

  // Cek tiket admin yang butuh verifikasi
  const adminPendingTickets = useMemo(() => {
    if (!isAdmin) return [];
    return pengajuanList.filter(p => p.status === 'DIAJUKAN');
  }, [pengajuanList, isAdmin]);

  if (isDismissed) return null;

  // 1. Alert Revisi Dokumen untuk User (High Priority)
  if (userRevisiTickets.length > 0) {
    const firstTicket = userRevisiTickets[0];
    return (
      <div className={`p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg shrink-0 shadow-md shadow-amber-500/20 animate-pulse">
            <i className="bi bi-exclamation-octagon-fill"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-800">
                Tindakan Diperlukan
              </span>
              <span className="text-xs font-black text-amber-900">
                Perlu Perbaikan Berkas ({userRevisiTickets.length} Pengajuan)
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-1">
              Tiket <strong className="font-bold">{firstTicket.nomorTiket}</strong> ({firstTicket.namaLayanan}) membutuhkan perbaikan dokumen: 
              <span className="italic ml-1">"{firstTicket.catatanPerbaikan || 'Mohon periksa catatan verifikator'}"</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
          <button
            onClick={() => navigate(`/layanan-sdm/pengajuan/${firstTicket.id}`)}
            className="flex-1 sm:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <i className="bi bi-upload"></i>
            <span>Perbaiki Sekarang</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 text-amber-500 hover:text-amber-800 rounded-lg"
            title="Tutup pemberitahuan"
          >
            <i className="bi bi-x-lg text-xs"></i>
          </button>
        </div>
      </div>
    );
  }

  // 2. Alert Admin Pengajuan Baru Menunggu Verifikasi
  if (isAdmin && adminPendingTickets.length > 0) {
    return (
      <div className={`p-4 rounded-2xl bg-blue-50 border border-blue-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shrink-0 shadow-md shadow-blue-600/20">
            <i className="bi bi-inbox-fill"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-800">
                Antrean Verifikasi SDM
              </span>
              <span className="text-xs font-black text-blue-950">
                {adminPendingTickets.length} Pengajuan Baru Masuk
              </span>
            </div>
            <p className="text-xs text-blue-800 mt-1">
              Terdapat permohonan layanan kepegawaian baru dari pegawai yang menunggu verifikasi berkas oleh admin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
          <button
            onClick={() => navigate('/admin/layanan-sdm?status=DIAJUKAN')}
            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <i className="bi bi-shield-check"></i>
            <span>Verifikasi Berkas</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 text-blue-500 hover:text-blue-800 rounded-lg"
            title="Tutup pemberitahuan"
          >
            <i className="bi bi-x-lg text-xs"></i>
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default LayananSDMAlertBanner;
