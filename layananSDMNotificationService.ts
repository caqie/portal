import { PengajuanSDM, PesanPengajuan, MasterLayanan, NotifikasiSDM, AdminUser } from './types';
import { calculateSLA } from './spreadsheetService';

const STORAGE_READ_KEY_PREFIX = 'portal_sdm_notif_read_';
const STORAGE_LAST_CHECK_KEY = 'portal_sdm_last_notif_check';

/**
 * Mendapatkan daftar ID notifikasi yang sudah dibaca user
 */
export const getReadNotificationIds = (userNip?: string): string[] => {
  if (!userNip) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_READ_KEY_PREFIX}${userNip}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Menandai satu notifikasi sebagai sudah dibaca
 */
export const markNotificationAsRead = (notifId: string, userNip?: string): void => {
  if (!userNip) return;
  const current = getReadNotificationIds(userNip);
  if (!current.includes(notifId)) {
    const updated = [...current, notifId];
    localStorage.setItem(`${STORAGE_READ_KEY_PREFIX}${userNip}`, JSON.stringify(updated));
    window.dispatchEvent(new Event('sdm_notifications_updated'));
  }
};

/**
 * Menandai banyak notifikasi sekaligus sebagai sudah dibaca
 */
export const markAllNotificationsAsRead = (notifIds: string[], userNip?: string): void => {
  if (!userNip) return;
  const current = getReadNotificationIds(userNip);
  const set = new Set([...current, ...notifIds]);
  localStorage.setItem(`${STORAGE_READ_KEY_PREFIX}${userNip}`, JSON.stringify(Array.from(set)));
  window.dispatchEvent(new Event('sdm_notifications_updated'));
};

/**
 * Menghapus history notifikasi yang tersimpan di lokal
 */
export const clearReadNotifications = (userNip?: string): void => {
  if (!userNip) return;
  localStorage.removeItem(`${STORAGE_READ_KEY_PREFIX}${userNip}`);
  window.dispatchEvent(new Event('sdm_notifications_updated'));
};

/**
 * Bunyikan audio chime lembut (menggunakan Web Audio API, tanpa file eksternal)
 */
export const playNotificationChime = (): void => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Nada 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Nada 2 (Harmonis)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio mungkin diblokir oleh browser autoplay policy sebelum interaksi user
  }
};

/**
 * Menghasilkan notifikasi real-time berdasarkan data pengajuan, pesan, dan role user
 */
export const generateLayananSDMNotifications = (
  user: AdminUser | null,
  pengajuanList: PengajuanSDM[],
  pesanList: PesanPengajuan[] = [],
  _masterLayananList: MasterLayanan[] = []
): NotifikasiSDM[] => {
  if (!user) return [];

  const notifications: NotifikasiSDM[] = [];
  const readIds = new Set(getReadNotificationIds(user.nip));
  const isAdmin = user.role === 'Superadmin' || user.role === 'Editor' || user.role === 'Admin Uang Makan';

  // 1. Notifikasi untuk PEMOHON / USER BIASA
  const userNip = user.nip;
  const userPengajuan = pengajuanList.filter(p => p.nip === userNip);

  userPengajuan.forEach(p => {
    // A. Butuh Perbaikan Berkas (PRIORITAS TINGGI)
    if (p.status === 'PERLU_PERBAIKAN') {
      const notifId = `notif_revisi_${p.id}_${p.updatedAt || p.tanggalPengajuan}`;
      notifications.push({
        id: notifId,
        idPengajuan: p.id,
        nomorTiket: p.nomorTiket,
        judul: 'Perlu Perbaikan Dokumen',
        pesan: p.catatanPerbaikan 
          ? `Perbaikan berkas untuk ${p.namaLayanan}: "${p.catatanPerbaikan}"`
          : `Dokumen untuk permohonan ${p.namaLayanan} (${p.nomorTiket}) memerlukan perbaikan. Silakan unggah ulang.`,
        tipe: 'PERLU_PERBAIKAN',
        link: `/layanan-sdm/pengajuan/${p.id}`,
        timestamp: p.updatedAt || p.tanggalPengajuan,
        dibaca: readIds.has(notifId),
        targetRole: 'USER',
        targetNip: userNip,
        namaLayanan: p.namaLayanan,
        prioritas: 'HIGH'
      });
    }

    // B. Pengajuan Selesai (SK / Dokumen Terbit)
    if (p.status === 'SELESAI') {
      const notifId = `notif_selesai_${p.id}_${p.tanggalSelesai || p.updatedAt || ''}`;
      notifications.push({
        id: notifId,
        idPengajuan: p.id,
        nomorTiket: p.nomorTiket,
        judul: 'Pengajuan Selesai Diproses',
        pesan: p.linkHasil 
          ? `Permohonan ${p.namaLayanan} (${p.nomorTiket}) telah selesai. Dokumen hasil/SK dapat langsung diunduh.`
          : `Permohonan ${p.namaLayanan} (${p.nomorTiket}) telah disetujui & diselesaikan oleh tim SDM.`,
        tipe: 'SELESAI',
        link: `/layanan-sdm/pengajuan/${p.id}`,
        timestamp: p.tanggalSelesai || p.updatedAt || p.tanggalPengajuan,
        dibaca: readIds.has(notifId),
        targetRole: 'USER',
        targetNip: userNip,
        namaLayanan: p.namaLayanan,
        prioritas: 'MEDIUM'
      });
    }

    // C. Pengajuan Sedang Diproses / Diverifikasi
    if (p.status === 'DALAM_PROSES' || p.status === 'DIVERIFIKASI') {
      const notifId = `notif_proses_${p.id}_${p.status}_${p.updatedAt || ''}`;
      notifications.push({
        id: notifId,
        idPengajuan: p.id,
        nomorTiket: p.nomorTiket,
        judul: p.status === 'DALAM_PROSES' ? 'Permohonan Sedang Diproses' : 'Permohonan Telah Diverifikasi',
        pesan: `Permohonan ${p.namaLayanan} (${p.nomorTiket}) saat ini sedang ditangani oleh ${p.petugasNama || 'Petugas SDM'}.`,
        tipe: 'STATUS_CHANGE',
        link: `/layanan-sdm/pengajuan/${p.id}`,
        timestamp: p.updatedAt || p.tanggalPengajuan,
        dibaca: readIds.has(notifId),
        targetRole: 'USER',
        targetNip: userNip,
        namaLayanan: p.namaLayanan,
        prioritas: 'LOW'
      });
    }

    // D. Pengajuan Ditolak
    if (p.status === 'DITOLAK') {
      const notifId = `notif_tolak_${p.id}_${p.updatedAt || ''}`;
      notifications.push({
        id: notifId,
        idPengajuan: p.id,
        nomorTiket: p.nomorTiket,
        judul: 'Pengajuan Ditolak',
        pesan: p.alasanPenolakan 
          ? `Permohonan ${p.namaLayanan} (${p.nomorTiket}) tidak dapat disetujui. Alasan: ${p.alasanPenolakan}`
          : `Permohonan ${p.namaLayanan} (${p.nomorTiket}) belum dapat diproses oleh Verifikator SDM.`,
        tipe: 'DITOLAK',
        link: `/layanan-sdm/pengajuan/${p.id}`,
        timestamp: p.updatedAt || p.tanggalPengajuan,
        dibaca: readIds.has(notifId),
        targetRole: 'USER',
        targetNip: userNip,
        namaLayanan: p.namaLayanan,
        prioritas: 'MEDIUM'
      });
    }

    // E. Pesan Baru dari Petugas SDM
    const tiketPesanPetugas = pesanList.filter(
      msg => (msg.idPengajuan === p.id || msg.nomorTiket === p.nomorTiket) && msg.pengirimNip !== userNip
    );
    if (tiketPesanPetugas.length > 0) {
      const lastMsg = tiketPesanPetugas[tiketPesanPetugas.length - 1];
      const notifId = `notif_msg_${lastMsg.id || lastMsg.timestamp}_${p.id}`;
      notifications.push({
        id: notifId,
        idPengajuan: p.id,
        nomorTiket: p.nomorTiket,
        judul: `Pesan Baru dari ${lastMsg.pengirimNama || 'Admin SDM'}`,
        pesan: `"${lastMsg.pesan?.slice(0, 90)}${lastMsg.pesan?.length > 90 ? '...' : ''}"`,
        tipe: 'PESAN_BARU',
        link: `/layanan-sdm/pengajuan/${p.id}?tab=diskusi`,
        timestamp: lastMsg.timestamp,
        dibaca: readIds.has(notifId),
        targetRole: 'USER',
        targetNip: userNip,
        namaLayanan: p.namaLayanan,
        prioritas: 'MEDIUM'
      });
    }
  });

  // 2. Notifikasi untuk ADMIN / VERIFIKATOR SDM
  if (isAdmin) {
    // A. Pengajuan Baru Masuk (Status DIAJUKAN)
    const pendingTickets = pengajuanList.filter(p => p.status === 'DIAJUKAN');
    pendingTickets.forEach(p => {
      const notifId = `notif_admin_new_${p.id}_${p.tanggalPengajuan}`;
      notifications.push({
        id: notifId,
        idPengajuan: p.id,
        nomorTiket: p.nomorTiket,
        judul: 'Pengajuan Baru Menunggu Verifikasi',
        pesan: `${p.nama} (${p.unitKerja || 'Pegawai'}) mengajukan layanan ${p.namaLayanan} [Tiket: ${p.nomorTiket}].`,
        tipe: 'TIKET_BARU',
        link: `/admin/layanan-sdm/pengajuan/${p.id}`,
        timestamp: p.tanggalPengajuan,
        dibaca: readIds.has(notifId),
        targetRole: 'ADMIN',
        namaLayanan: p.namaLayanan,
        prioritas: p.prioritas === 'URGENT' ? 'HIGH' : 'MEDIUM'
      });
    });

    // B. Peringatan SLA Mendekati / Lewat Batas Waktu
    const activeTickets = pengajuanList.filter(
      p => p.status === 'DIAJUKAN' || p.status === 'DIVERIFIKASI' || p.status === 'DALAM_PROSES'
    );
    activeTickets.forEach(p => {
      const sla = calculateSLA(p.tanggalPengajuan, 3, p.status);
      if (sla.statusSla === 'OVERDUE' || sla.statusSla === 'WARNING') {
        const notifId = `notif_sla_${p.id}_${sla.statusSla}`;
        notifications.push({
          id: notifId,
          idPengajuan: p.id,
          nomorTiket: p.nomorTiket,
          judul: sla.statusSla === 'OVERDUE' ? 'SLA Terlewat (Overdue)' : 'Peringatan Batas SLA',
          pesan: `Tiket ${p.nomorTiket} (${p.namaLayanan} - ${p.nama}) ${sla.label}. Segera tindak lanjuti.`,
          tipe: 'SLA_WARNING',
          link: `/admin/layanan-sdm/pengajuan/${p.id}`,
          timestamp: p.updatedAt || p.tanggalPengajuan,
          dibaca: readIds.has(notifId),
          targetRole: 'ADMIN',
          namaLayanan: p.namaLayanan,
          prioritas: 'HIGH'
        });
      }
    });

    // C. Pesan Masuk dari Pemohon (ke Admin)
    const pesanDariPemohon = pesanList.filter(msg => {
      const tiket = pengajuanList.find(p => p.id === msg.idPengajuan || p.nomorTiket === msg.nomorTiket);
      return tiket && msg.pengirimNip === tiket.nip;
    });

    // Ambil pesan terbaru per tiket
    const pesanPerTiket: Record<string, PesanPengajuan> = {};
    pesanDariPemohon.forEach(m => {
      pesanPerTiket[m.idPengajuan || m.nomorTiket] = m;
    });

    Object.values(pesanPerTiket).forEach(lastMsg => {
      const tiket = pengajuanList.find(p => p.id === lastMsg.idPengajuan || p.nomorTiket === lastMsg.nomorTiket);
      if (tiket) {
        const notifId = `notif_admin_msg_${lastMsg.id || lastMsg.timestamp}_${tiket.id}`;
        notifications.push({
          id: notifId,
          idPengajuan: tiket.id,
          nomorTiket: tiket.nomorTiket,
          judul: `Pesan Pemohon: ${lastMsg.pengirimNama}`,
          pesan: `Pada tiket ${tiket.nomorTiket} (${tiket.namaLayanan}): "${lastMsg.pesan?.slice(0, 90)}${lastMsg.pesan?.length > 90 ? '...' : ''}"`,
          tipe: 'PESAN_BARU',
          link: `/admin/layanan-sdm/pengajuan/${tiket.id}?tab=diskusi`,
          timestamp: lastMsg.timestamp,
          dibaca: readIds.has(notifId),
          targetRole: 'ADMIN',
          namaLayanan: tiket.namaLayanan,
          prioritas: 'MEDIUM'
        });
      }
    });
  }

  // Urutkan notifikasi: Belum dibaca dulu, kemudian Prioritas HIGH -> MEDIUM -> LOW, lalu timestamp terbaru
  return notifications.sort((a, b) => {
    if (a.dibaca !== b.dibaca) return a.dibaca ? 1 : -1;
    
    const prioWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const pA = prioWeight[a.prioritas || 'LOW'] || 1;
    const pB = prioWeight[b.prioritas || 'LOW'] || 1;
    if (pA !== pB) return pB - pA;

    const timeA = new Date(a.timestamp).getTime() || 0;
    const timeB = new Date(b.timestamp).getTime() || 0;
    return timeB - timeA;
  });
};

/**
 * Format selang waktu ramah pengguna (contoh: "Baru saja", "10 mnt lalu", "2 jam lalu", "Kemarin")
 */
export const formatNotifRelativeTime = (timestamp: string): string => {
  if (!timestamp) return 'Baru saja';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch (e) {
    return timestamp;
  }
};
