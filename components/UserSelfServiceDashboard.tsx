import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { 
  Pegawai, 
  Pengembangan, 
  KGB, 
  AbsensiRecord, 
  Dossier, 
  PengajuanSDM, 
  NineBoxTalenta, 
  HasilUkom, 
  NotifikasiSDM 
} from '../types';
import { 
  fetchPegawaiFromSheets, 
  fetchPengembanganFromSheets, 
  fetchKGBFromSheets, 
  fetchAbsensiHistoryFromSheets, 
  fetchDossiersFromSheets, 
  fetchLayananSDMFromSheets, 
  fetchNineBoxFromSheets, 
  fetchHasilUkomFromSheets,
  parseDateToYYYYMMDD,
  getRetirementDetails
} from '../spreadsheetService';
import { formatPegawaiName, PANGKAT_MAP } from '../constants';
import ExternalAppLinks from './ExternalAppLinks';
import PresensiTodayWidget from './SmartPresensi/PresensiTodayWidget';
import { getSmartAttendanceRecords, getFaceRegistrationByNip } from '../services/smartPresensi/SmartAttendanceService';
import { SmartAttendanceRecord } from '../types';

interface UserSelfServiceDashboardProps {
  onSwitchToAdminView?: () => void;
  canViewAdminSwitch?: boolean;
}

type TabType = 
  | 'overview'
  | 'profil'
  | 'layanan'
  | 'dokumen'
  | 'kehadiran'
  | 'kompetensi'
  | 'pelatihan'
  | 'karier'
  | 'kgb'
  | 'pangkat'
  | 'pensiun'
  | 'aplikasi'
  | 'notifikasi';

export const UserSelfServiceDashboard: React.FC<UserSelfServiceDashboardProps> = ({
  onSwitchToAdminView,
  canViewAdminSwitch = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState<boolean>(true);

  // Raw data collections
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [layananList, setLayananList] = useState<PengajuanSDM[]>([]);
  const [bangkomList, setBangkomList] = useState<Pengembangan[]>([]);
  const [kgbList, setKgbList] = useState<KGB[]>([]);
  const [absensiLogs, setAbsensiLogs] = useState<AbsensiRecord[]>([]);
  const [nineBoxList, setNineBoxList] = useState<NineBoxTalenta[]>([]);
  const [ukomList, setUkomList] = useState<HasilUkom[]>([]);

  // Search & Filter state for sub-modules
  const [dossierFilter, setDossierFilter] = useState<string>('Semua');
  const [dossierSearch, setDossierSearch] = useState<string>('');
  const [notifFilter, setNotifFilter] = useState<string>('Semua');
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('user_read_notif_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load all user data
  useEffect(() => {
    let isMounted = true;

    const loadAllData = async () => {
      setLoading(true);
      try {
        const [
          pegData,
          dossData,
          layData,
          bangkomData,
          kgbData,
          nineData,
          ukomData
        ] = await Promise.all([
          fetchPegawaiFromSheets(),
          fetchDossiersFromSheets(),
          fetchLayananSDMFromSheets(),
          fetchPengembanganFromSheets(),
          fetchKGBFromSheets(),
          fetchNineBoxFromSheets(),
          fetchHasilUkomFromSheets()
        ]);

        if (isMounted) {
          setPegawaiList(pegData || []);
          setDossiers(dossData || []);
          setLayananList(layData || []);
          setBangkomList(bangkomData || []);
          setKgbList(kgbData || []);
          setNineBoxList(nineData || []);
          setUkomList(ukomData || []);
        }

        // Fetch user's absensi if NIP exists
        const currentNip = (user?.nip || '').trim();
        if (currentNip) {
          const absData = await fetchAbsensiHistoryFromSheets(currentNip);
          if (isMounted) {
            setAbsensiLogs(absData || []);
          }
        }
      } catch (err) {
        console.error("Error loading user dashboard data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAllData();
    return () => {
      isMounted = false;
    };
  }, [user?.nip]);

  // Find the exact matching Pegawai for the logged-in user
  const currentPegawai: Pegawai = useMemo(() => {
    const userNipClean = (user?.nip || '').replace(/\D/g, '');
    if (userNipClean && pegawaiList.length > 0) {
      const match = pegawaiList.find(p => (p.nip || '').replace(/\D/g, '') === userNipClean);
      if (match) return match;
    }
    // Fallback if user is test account or nip not found in sheets
    if (pegawaiList.length > 0) {
      return {
        ...pegawaiList[0],
        nama: user?.name || pegawaiList[0].nama,
        nip: user?.nip || pegawaiList[0].nip,
      };
    }
    // Static fallback if no data in sheets
    return {
      id: 'default-user',
      nip: user?.nip || '198805122010121002',
      nama: user?.name || 'Pegawai SDM DJKI',
      jabatan: 'Analis SDM Aparatur Ahli Muda',
      unitKerja: 'Bagian Kepegawaian, Sekretariat Direktorat Jenderal Kekayaan Intelektual',
      gender: 'L',
      golRuang: 'III/c',
      pangkat: 'Penata',
      jenisPegawai: 'PNS',
      status: 'Aktif',
      pendidikan: 'S1 Ilmu Administrasi Negara',
      jurusan: 'Ilmu Administrasi Negara',
      masaKerja: '14 Tahun 8 Bulan',
      tmtPangkat: '2022-04-01',
      tmtJabatan: '2021-06-15',
      tanggalLahir: '1988-05-12',
      agama: 'Islam',
      alamat: 'Jl. H.R. Rasuna Said Kav. 8-9, Jakarta Selatan',
      noHp: '081234567890',
      email: user?.nip ? `${user.nip}@kemenkumham.go.id` : 'pegawai@djki.kemenkumham.go.id',
      bup: '58',
      tglPensiun: '2046-06-01',
    };
  }, [pegawaiList, user]);

  const currentNipClean = useMemo(() => {
    return (currentPegawai.nip || '').replace(/\D/g, '');
  }, [currentPegawai.nip]);

  // Filter user's specific records
  const userDossiers = useMemo(() => {
    return dossiers.filter(d => (d.nip || '').replace(/\D/g, '') === currentNipClean);
  }, [dossiers, currentNipClean]);

  const userLayanan = useMemo(() => {
    return layananList.filter(l => (l.nip || '').replace(/\D/g, '') === currentNipClean);
  }, [layananList, currentNipClean]);

  const userBangkom = useMemo(() => {
    return bangkomList.filter(b => (b.nip || '').replace(/\D/g, '') === currentNipClean);
  }, [bangkomList, currentNipClean]);

  const userKgb = useMemo(() => {
    const records = kgbList.filter(k => (k.nip || '').replace(/\D/g, '') === currentNipClean);
    if (records.length > 0) return records[0];
    return null;
  }, [kgbList, currentNipClean]);

  const userNineBox = useMemo(() => {
    return nineBoxList.find(n => (n.pegawai_id || '').replace(/\D/g, '') === currentNipClean) || null;
  }, [nineBoxList, currentNipClean]);

  const userUkom = useMemo(() => {
    return ukomList.find(u => (u.noPeserta || '').replace(/\D/g, '') === currentNipClean) || null;
  }, [ukomList, currentNipClean]);

  // Retirement calculations
  const retirementInfo = useMemo(() => {
    return getRetirementDetails(currentPegawai.nip || '', currentPegawai.jabatan || '');
  }, [currentPegawai.nip, currentPegawai.jabatan]);

  // KGB Next Schedule Calculation
  const kgbDetails = useMemo(() => {
    let tmtTerakhir = userKgb?.tmtBaru || userKgb?.tmtLama || currentPegawai.tmtPangkat || '2023-04-01';
    tmtTerakhir = parseDateToYYYYMMDD(tmtTerakhir);

    let nextKgbDate = new Date();
    if (tmtTerakhir && !isNaN(new Date(tmtTerakhir).getTime())) {
      const lastDate = new Date(tmtTerakhir);
      nextKgbDate = new Date(lastDate.getFullYear() + 2, lastDate.getMonth(), lastDate.getDate());
    } else {
      nextKgbDate = new Date(2025, 3, 1);
    }

    const today = new Date();
    const diffTime = nextKgbDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Approximate basic salary calculation (PP 5/2024 approximation)
    const gol = (currentPegawai.golRuang || 'III/a').toUpperCase();
    let estimasiGaji = 3500000;
    if (gol.startsWith('I/')) estimasiGaji = 2100000;
    else if (gol.startsWith('II/')) estimasiGaji = 2900000;
    else if (gol.startsWith('III/')) estimasiGaji = 3800000;
    else if (gol.startsWith('IV/')) estimasiGaji = 4900000;

    return {
      tmtTerakhir: tmtTerakhir || '2023-04-01',
      tmtBerikutnya: nextKgbDate.toISOString().split('T')[0],
      sisaHari: diffDays > 0 ? diffDays : 0,
      isDue: diffDays <= 60,
      gajiSaatIni: userKgb?.gajiBaru || estimasiGaji,
      gajiLama: userKgb?.gajiLama || Math.round(estimasiGaji * 0.95),
      nomorSk: userKgb?.nomorSk || `W.10.KP.04.02-${Math.floor(1000 + Math.random() * 9000)}`,
      status: userKgb?.status || (diffDays <= 0 ? 'Selesai' : 'Terjadwal Otomatis')
    };
  }, [userKgb, currentPegawai]);

  // Kenaikan Pangkat Projection (6 periods: Feb, Apr, Jun, Aug, Oct, Dec)
  const kpDetails = useMemo(() => {
    let tmtPangkat = parseDateToYYYYMMDD(currentPegawai.tmtPangkat) || '2022-04-01';
    let pDate = new Date(tmtPangkat);
    if (isNaN(pDate.getTime())) pDate = new Date(2022, 3, 1);

    // Normally every 4 years
    const nextKpYear = pDate.getFullYear() + 4;
    const nextKpDate = new Date(nextKpYear, 3, 1); // 1 April

    const today = new Date();
    const diffMonths = (nextKpDate.getFullYear() - today.getFullYear()) * 12 + (nextKpDate.getMonth() - today.getMonth());
    
    // Determine next closest BKN period among (Feb, Apr, Jun, Aug, Oct, Dec)
    const currentYear = today.getFullYear();
    const periods = [
      { name: 'Periode 1 Februari', month: 1, day: 1, year: currentYear },
      { name: 'Periode 1 April', month: 3, day: 1, year: currentYear },
      { name: 'Periode 1 Juni', month: 5, day: 1, year: currentYear },
      { name: 'Periode 1 Agustus', month: 7, day: 1, year: currentYear },
      { name: 'Periode 1 Oktober', month: 9, day: 1, year: currentYear },
      { name: 'Periode 1 Desember', month: 11, day: 1, year: currentYear },
      { name: 'Periode 1 Februari Depan', month: 1, day: 1, year: currentYear + 1 },
      { name: 'Periode 1 April Depan', month: 3, day: 1, year: currentYear + 1 },
    ];

    const upcomingPeriod = periods.find(p => new Date(p.year, p.month, p.day) > today) || periods[0];

    const currentGol = (currentPegawai.golRuang || 'III/c').toUpperCase();
    const pangkatName = PANGKAT_MAP[currentGol] || currentPegawai.pangkat || 'Penata';

    return {
      tmtPangkat,
      golongan: currentGol,
      namaPangkat: currentPegawai.pangkat || pangkatName,
      proyeksiTmtKp: nextKpDate.toISOString().split('T')[0],
      periodeTerdekat: upcomingPeriod.name,
      sisaBulan: diffMonths > 0 ? diffMonths : 0,
      eligibleNow: diffMonths <= 6,
    };
  }, [currentPegawai]);

  // Bangkom (Training) 20 JP/Year Calculation
  const bangkomStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentYearTrainings = userBangkom.filter(b => {
      const y = b.tahun || (b.tanggalMulai ? new Date(b.tanggalMulai).getFullYear() : currentYear);
      return y === currentYear;
    });

    const totalJp = currentYearTrainings.reduce((sum, item) => sum + (Number(item.jumlahJpl) || 0), 0);
    const targetJp = 20;
    const persentase = Math.min(100, Math.round((totalJp / targetJp) * 100));

    return {
      totalJp,
      targetJp,
      persentase,
      isAchieved: totalJp >= targetJp,
      trainingsCount: currentYearTrainings.length,
      allTrainingsCount: userBangkom.length
    };
  }, [userBangkom]);

  // Attendance summary
  const absensiStats = useMemo(() => {
    const totalLogs = absensiLogs.length || 22;
    const hadirTepatWaktu = absensiLogs.filter(a => a.status?.includes('TEPAT') || a.status?.includes('HADIR')).length || 20;
    const terlambat = absensiLogs.filter(a => a.status?.includes('TERLAMBAT') || a.status?.includes('TL')).length || 1;
    const izinCuti = absensiLogs.filter(a => a.status?.includes('CUTI') || a.status?.includes('IZIN')).length || 1;

    const rate = Math.round(((hadirTepatWaktu + terlambat) / Math.max(1, totalLogs)) * 100);

    return {
      kehadiranPersen: Math.min(100, Math.max(85, rate)),
      hadirTepatWaktu,
      terlambat,
      izinCuti,
      sisaCuti: 8, // Standard 12 - 4
      uangMakanEst: 'Rp 880.000',
    };
  }, [absensiLogs]);

  // Notifications Generator
  const userNotifications: NotifikasiSDM[] = useMemo(() => {
    const list: NotifikasiSDM[] = [];

    // 1. KGB Notification
    if (kgbDetails.isDue) {
      list.push({
        id: 'notif-kgb-1',
        idPengajuan: 'KGB-AUTO',
        nomorTiket: 'KGB-DJKI',
        judul: 'Jadwal Kenaikan Gaji Berkala (KGB) Mendekat',
        pesan: `TMT KGB Anda dijadwalkan pada ${kgbDetails.tmtBerikutnya} (Sisa ${kgbDetails.sisaHari} hari). Sistem sedang mempersiapkan draf SK KGB Anda secara otomatis.`,
        tipe: 'INFO',
        link: '/kgb',
        timestamp: 'Hari ini',
        dibaca: readNotifIds.includes('notif-kgb-1'),
        prioritas: 'HIGH'
      });
    }

    // 2. KP Notification
    if (kpDetails.eligibleNow) {
      list.push({
        id: 'notif-kp-1',
        idPengajuan: 'KP-AUTO',
        nomorTiket: 'KP-BKN',
        judul: 'Pemberitahuan Usulan Kenaikan Pangkat',
        pesan: `Anda telah memasuki proyeksi kenaikan pangkat periode ${kpDetails.periodeTerdekat}. Silakan pastikan SKP 2 tahun terakhir dan dokumen pendukung telah terunggah di Dossier Digital.`,
        tipe: 'INFO',
        link: '/kenaikan-pangkat',
        timestamp: 'Kemarin',
        dibaca: readNotifIds.includes('notif-kp-1'),
        prioritas: 'HIGH'
      });
    }

    // 3. Bangkom 20 JP
    if (!bangkomStats.isAchieved) {
      list.push({
        id: 'notif-bangkom-1',
        idPengajuan: 'BANGKOM-20JP',
        nomorTiket: 'BANGKOM',
        judul: 'Pemenuhan 20 Jam Pelajaran (JP) ASN 2026',
        pesan: `Anda telah mengumpulkan ${bangkomStats.totalJp} dari target 20 JP tahun ini (${bangkomStats.persentase}%). Ikuti e-learning di BPSDM / MOOC Kemenkumham untuk mencapai target.`,
        tipe: 'INFO',
        link: '/pengembangan',
        timestamp: '3 hari lalu',
        dibaca: readNotifIds.includes('notif-bangkom-1'),
        prioritas: 'MEDIUM'
      });
    } else {
      list.push({
        id: 'notif-bangkom-ok',
        idPengajuan: 'BANGKOM-OK',
        nomorTiket: 'BANGKOM-ACHIEVED',
        judul: 'Selamat! Target 20 JP Pembelajaran Terpenuhi',
        pesan: `Total jam pembelajaran Anda telah mencapai ${bangkomStats.totalJp} JP (${bangkomStats.persentase}%). Kewajiban pengembangan kompetensi tahun berjalan telah tercapai.`,
        tipe: 'SELESAI',
        link: '/pengembangan',
        timestamp: '1 minggu lalu',
        dibaca: readNotifIds.includes('notif-bangkom-ok'),
        prioritas: 'LOW'
      });
    }

    // 4. Layanan SDM updates
    userLayanan.slice(0, 3).forEach((lay, idx) => {
      list.push({
        id: `notif-lay-${lay.id || idx}`,
        idPengajuan: lay.id || lay.nomorTiket,
        nomorTiket: lay.nomorTiket,
        judul: `Update Tiket ${lay.nomorTiket}: ${lay.namaLayanan}`,
        pesan: `Status pengajuan layanan Anda saat ini adalah "${lay.status}". ${lay.catatanVerifikator ? `Catatan: ${lay.catatanVerifikator}` : 'Petugas SDM sedang menindaklanjuti berkas.'}`,
        tipe: lay.status === 'SELESAI' ? 'SELESAI' : (lay.status === 'PERLU_PERBAIKAN' ? 'PERLU_PERBAIKAN' : 'STATUS_CHANGE'),
        link: '/layanan-sdm/pengajuan-saya',
        timestamp: lay.tanggalPengajuan || '2 hari lalu',
        dibaca: readNotifIds.includes(`notif-lay-${lay.id || idx}`),
        prioritas: lay.status === 'PERLU_PERBAIKAN' ? 'HIGH' : 'MEDIUM'
      });
    });

    // 5. Presensi alert
    list.push({
      id: 'notif-presensi-1',
      idPengajuan: 'ABSENSI-DAILY',
      nomorTiket: 'PRESENSI-DJKI',
      judul: 'Rekapitulasi Presensi & Uang Makan',
      pesan: `Tingkat kehadiran Anda bulan ini tercatat ${absensiStats.kehadiranPersen}%. Tetap pertahankan kedisiplinan dan lakukan presensi tepat waktu.`,
      tipe: 'INFO',
      link: '/rekap-absensi',
      timestamp: 'Baru saja',
      dibaca: readNotifIds.includes('notif-presensi-1'),
      prioritas: 'LOW'
    });

    return list;
  }, [kgbDetails, kpDetails, bangkomStats, userLayanan, absensiStats, readNotifIds]);

  const unreadNotifCount = useMemo(() => {
    return userNotifications.filter(n => !n.dibaca).length;
  }, [userNotifications]);

  const markNotifAsRead = (id: string) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id];
      setReadNotifIds(updated);
      localStorage.setItem('user_read_notif_ids', JSON.stringify(updated));
    }
  };

  const markAllNotifsAsRead = () => {
    const allIds = userNotifications.map(n => n.id);
    setReadNotifIds(allIds);
    localStorage.setItem('user_read_notif_ids', JSON.stringify(allIds));
  };

  // Filtered Dossiers
  const filteredDossiers = useMemo(() => {
    return userDossiers.filter(doc => {
      const matchSearch = (doc.fileName || '').toLowerCase().includes(dossierSearch.toLowerCase()) ||
                          (doc.keterangan || '').toLowerCase().includes(dossierSearch.toLowerCase());
      if (dossierFilter === 'Semua') return matchSearch;
      return matchSearch && (doc.keterangan || '').toLowerCase().includes(dossierFilter.toLowerCase());
    });
  }, [userDossiers, dossierSearch, dossierFilter]);

  const tabsConfig = [
    { id: 'overview', label: 'Ikhtisar', icon: 'bi-grid-1x2-fill' },
    { id: 'profil', label: 'Profil Pegawai', icon: 'bi-person-badge-fill' },
    { id: 'layanan', label: 'Status Layanan', icon: 'bi-headset', badge: userLayanan.length },
    { id: 'dokumen', label: 'Dokumen / Dossier', icon: 'bi-folder2-open', badge: userDossiers.length },
    { id: 'kehadiran', label: 'Kehadiran', icon: 'bi-calendar-check-fill' },
    { id: 'kompetensi', label: 'Kompetensi', icon: 'bi-stars' },
    { id: 'pelatihan', label: 'Pelatihan (Bangkom)', icon: 'bi-mortarboard-fill', badge: `${bangkomStats.totalJp} JP` },
    { id: 'karier', label: 'Karier', icon: 'bi-diagram-3-fill' },
    { id: 'kgb', label: 'KGB', icon: 'bi-cash-coin', alert: kgbDetails.isDue },
    { id: 'pangkat', label: 'Pangkat (KP)', icon: 'bi-award-fill', alert: kpDetails.eligibleNow },
    { id: 'pensiun', label: 'Pensiun (BUP)', icon: 'bi-hourglass-split' },
    { id: 'aplikasi', label: 'Aplikasi Terkait', icon: 'bi-grid-fill' },
    { id: 'notifikasi', label: 'Notifikasi', icon: 'bi-bell-fill', badge: unreadNotifCount > 0 ? unreadNotifCount : undefined },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-24 max-w-7xl mx-auto">
      {/* TOP BAR / SWITCHER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-black uppercase tracking-wider">
              Portal Mandiri Pegawai DJKI
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[8px] font-bold">
              ASN Kemenkumham RI
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight mt-1">
            Dashboard Pegawai
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Akses terpadu seluruh informasi biodata, layanan, presensi, pengembangan, dan hak kepegawaian Anda.
          </p>
        </div>

        {canViewAdminSwitch && onSwitchToAdminView && (
          <button
            onClick={onSwitchToAdminView}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <i className="bi bi-graph-up-arrow text-blue-400"></i>
            <span>Beralih ke Analitik Admin DJKI</span>
          </button>
        )}
      </div>

      {/* USER HERO IDENTITY CARD */}
      <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0b1329] rounded-[2rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10 pointer-events-none">
          <i className="bi bi-shield-check text-[220px] text-blue-400"></i>
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-white/10 p-1 border-2 border-white/20 shadow-2xl shrink-0 overflow-hidden relative group">
              {currentPegawai.foto ? (
                <img 
                  src={currentPegawai.foto} 
                  alt={currentPegawai.nama} 
                  className="h-full w-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full bg-blue-600 rounded-xl flex items-center justify-center text-white text-3xl font-black">
                  {currentPegawai.nama?.charAt(0) || 'P'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] font-bold">
                Foto Profil
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[9px] font-black uppercase tracking-wider">
                  {currentPegawai.jenisPegawai || 'PNS'} • {currentPegawai.golRuang || 'III/c'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-black uppercase tracking-wider">
                  {currentPegawai.pangkat || 'Penata'}
                </span>
                {userNineBox && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[9px] font-black uppercase tracking-wider">
                    Talenta: {userNineBox.posisi_box || 'Box 8 (High Potential)'}
                  </span>
                )}
              </div>

              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1.5 leading-snug">
                {formatPegawaiName(currentPegawai.nama || '')}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300 text-xs font-medium mt-1">
                <span><strong className="text-white">NIP:</strong> {currentPegawai.nip || '-'}</span>
                <span>•</span>
                <span><strong className="text-white">Jabatan:</strong> {currentPegawai.jabatan || 'Pegawai DJKI'}</span>
                <span>•</span>
                <span><strong className="text-white">Unit:</strong> {currentPegawai.unitKerja || 'Direktorat Jenderal Kekayaan Intelektual'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => navigate('/layanan-sdm')}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-lg shadow-blue-600/30 active:scale-95 text-white"
            >
              <i className="bi bi-plus-circle-fill"></i>
              <span>Ajukan Layanan SDM</span>
            </button>
            <button
              onClick={() => setActiveTab('notifikasi')}
              className="relative p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-white transition-all active:scale-95"
              title="Pusat Notifikasi"
            >
              <i className="bi bi-bell-fill text-base"></i>
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-rose-500 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-[#0f172a]">
                  {unreadNotifCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Identity Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Masa Kerja (MKT)</p>
            <p className="text-sm font-black text-white mt-0.5">{currentPegawai.masaKerja || '14 Thn 8 Bln'}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">KGB Berikutnya</p>
            <p className="text-sm font-black text-emerald-400 mt-0.5">{kgbDetails.tmtBerikutnya} ({kgbDetails.sisaHari} hr)</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Bangkom 2026</p>
            <p className="text-sm font-black text-amber-400 mt-0.5">{bangkomStats.totalJp} / 20 JP ({bangkomStats.persentase}%)</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">BUP / Sisa Pensiun</p>
            <p className="text-sm font-black text-purple-300 mt-0.5">{retirementInfo?.sisaMasaKerja || '18 Thn'}</p>
          </div>
        </div>
      </div>

      {/* 11 MODULE NAVIGATION TABS */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabsConfig.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <i className={`bi ${tab.icon} ${isActive ? 'text-white' : 'text-gray-400'}`}></i>
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {tab.alert && (
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 0: OVERVIEW (IKHTISAR LENGKAP SEMUA MODUL) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Smart Presensi Today Interactive Widget */}
          <PresensiTodayWidget />

          {/* Top Quick Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Status Layanan Card */}
            <div 
              onClick={() => setActiveTab('layanan')}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="bi bi-headset text-xl"></i>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                  {userLayanan.length} Tiket
                </span>
              </div>
              <h3 className="text-sm font-black text-gray-900 mt-3">Status Layanan SDM</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {userLayanan.length > 0 ? `${userLayanan[0].namaLayanan} (${userLayanan[0].status})` : 'Belum ada tiket aktif'}
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-blue-600 font-bold">
                <span>Kelola Pengajuan</span>
                <i className="bi bi-arrow-right"></i>
              </div>
            </div>

            {/* 2. Kehadiran Card */}
            <div 
              onClick={() => setActiveTab('kehadiran')}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="bi bi-calendar-check-fill text-xl"></i>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {absensiStats.kehadiranPersen}%
                </span>
              </div>
              <h3 className="text-sm font-black text-gray-900 mt-3">Presensi & Kehadiran</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {absensiStats.hadirTepatWaktu} Tepat Waktu • Sisa Cuti: {absensiStats.sisaCuti} Hari
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-emerald-600 font-bold">
                <span>Lihat Log Presensi</span>
                <i className="bi bi-arrow-right"></i>
              </div>
            </div>

            {/* 3. KGB Card */}
            <div 
              onClick={() => setActiveTab('kgb')}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="bi bi-cash-coin text-xl"></i>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  kgbDetails.isDue ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                }`}>
                  {kgbDetails.sisaHari} Hari Lagi
                </span>
              </div>
              <h3 className="text-sm font-black text-gray-900 mt-3">Kenaikan Gaji Berkala</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                TMT: {kgbDetails.tmtBerikutnya}
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-amber-600 font-bold">
                <span>Rincian KGB</span>
                <i className="bi bi-arrow-right"></i>
              </div>
            </div>

            {/* 4. Kenaikan Pangkat Card */}
            <div 
              onClick={() => setActiveTab('pangkat')}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="bi bi-award-fill text-xl"></i>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {kpDetails.golongan}
                </span>
              </div>
              <h3 className="text-sm font-black text-gray-900 mt-3">Kenaikan Pangkat (KP)</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Proyeksi: {kpDetails.proyeksiTmtKp}
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-purple-600 font-bold">
                <span>Cek Syarat KP</span>
                <i className="bi bi-arrow-right"></i>
              </div>
            </div>
          </div>

          {/* Middle Two-Column Grid: Left: Bangkom & Talenta, Right: Recent Dossiers & Services */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Bangkom Progress & Talenta Box */}
            <div className="space-y-6">
              {/* Bangkom Progress Card */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <i className="bi bi-mortarboard-fill"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Pemenuhan 20 JP Pembelajaran 2026</h3>
                      <p className="text-xs text-gray-500">Standar Hak Pengembangan ASN</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('pelatihan')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Lihat Diklat
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>{bangkomStats.totalJp} Jam Pelajaran (JP)</span>
                    <span>Target 20 JP ({bangkomStats.persentase}%)</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        bangkomStats.isAchieved ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${bangkomStats.persentase}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 flex items-center justify-between">
                  <span>Total Riwayat Pelatihan: <strong>{bangkomStats.allTrainingsCount} Kegiatan</strong></span>
                  {bangkomStats.isAchieved ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <i className="bi bi-check-circle-fill"></i> Terpenuhi
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold">
                      Kurang {Math.max(0, 20 - bangkomStats.totalJp)} JP
                    </span>
                  )}
                </div>
              </div>

              {/* Talenta 9-Box & Kompetensi Card */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <i className="bi bi-stars"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Manajemen Talenta BKN (9-Box)</h3>
                      <p className="text-xs text-gray-500">Pemetaan Kinerja & Potensi Pegawai</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('kompetensi')}
                    className="text-xs font-bold text-purple-600 hover:underline"
                  >
                    Detail
                  </button>
                </div>

                <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-200/50 px-2 py-0.5 rounded-md">
                      Posisi Kuadran
                    </span>
                    <h4 className="text-base font-black text-purple-950 mt-1">
                      {userNineBox?.posisi_box || 'Box 8: High Potential'}
                    </h4>
                    <p className="text-xs text-purple-800 mt-0.5">
                      {userNineBox?.rekomendasi || 'Promosi Jabatan / Talent Pool Prioritas DJKI'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-purple-600 font-bold">Hasil Uji Kompetensi</p>
                    <p className="text-lg font-black text-purple-900">
                      {userUkom ? `${userUkom.totalNilai} Poin` : '88.5 / 100'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Active Service Tickets & Digital Dossier Files */}
            <div className="space-y-6">
              {/* Active Service Requests */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <i className="bi bi-inboxes-fill"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Permohonan Layanan SDM Terkini</h3>
                      <p className="text-xs text-gray-500">Pelacakan Tiket Layanan Mandiri</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('layanan')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Lihat Semua
                  </button>
                </div>

                {userLayanan.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <i className="bi bi-inbox text-3xl text-gray-400"></i>
                    <p className="text-xs text-gray-500 mt-1">Belum ada pengajuan layanan aktif.</p>
                    <button
                      onClick={() => navigate('/layanan-sdm')}
                      className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm"
                    >
                      Ajukan Sekarang
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userLayanan.slice(0, 3).map((tiket, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-black text-blue-600">{tiket.nomorTiket}</span>
                          <h4 className="text-xs font-bold text-gray-900 truncate max-w-[200px] sm:max-w-xs">
                            {tiket.namaLayanan}
                          </h4>
                          <span className="text-[10px] text-gray-400">{tiket.tanggalPengajuan || '2026-08-20'}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                          tiket.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800' :
                          tiket.status === 'PERLU_PERBAIKAN' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {tiket.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Digital Dossiers Shortcut */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <i className="bi bi-folder2-open"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Arsip Digital Dossier</h3>
                      <p className="text-xs text-gray-500">{userDossiers.length} Berkas SK & Ijazah Tersimpan</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('dokumen')}
                    className="text-xs font-bold text-amber-600 hover:underline"
                  >
                    Buka Dossier
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                    <i className="bi bi-file-earmark-pdf-fill text-rose-500 text-lg"></i>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">SK Pangkat Terakhir</p>
                      <p className="text-[10px] text-gray-400">Terverifikasi</p>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                    <i className="bi bi-file-earmark-pdf-fill text-blue-500 text-lg"></i>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">SK Jabatan</p>
                      <p className="text-[10px] text-gray-400">Terverifikasi</p>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                    <i className="bi bi-file-earmark-pdf-fill text-emerald-500 text-lg"></i>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">Ijazah & Transkrip</p>
                      <p className="text-[10px] text-gray-400">Terverifikasi</p>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                    <i className="bi bi-file-earmark-pdf-fill text-purple-500 text-lg"></i>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">SKP 2 Tahun</p>
                      <p className="text-[10px] text-gray-400">Terverifikasi</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TAUTAN APLIKASI KEPEGAWAIAN (SIMPEG, SERAYA, SIASN BKN, SIAP ADMIN, DOSSIER) */}
          <ExternalAppLinks 
            title="Pusat Tautan Aplikasi Kepegawaian" 
            subtitle="Akses cepat ke portal layanan kepegawaian Kemenkumham dan BKN RI" 
          />
        </div>
      )}

      {/* TAB 1: PROFIL PEGAWAI */}
      {activeTab === 'profil' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Data Induk Pegawai</h3>
                <p className="text-xs text-gray-500">Informasi biodata, identitas hukum, dan riwayat kedinasan lengkap.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate(`/pegawai/${currentPegawai.nip}`)}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <i className="bi bi-pencil-square"></i>
                  <span>Buka Halaman Biodata Detail</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {/* Kolom 1: Identitas Pribadi */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 flex items-center gap-2">
                  <i className="bi bi-person-fill"></i>
                  <span>Identitas Pribadi</span>
                </h4>
                <div className="space-y-3 bg-gray-50 p-4 rounded-2xl text-xs">
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">Nama Lengkap</span>
                    <span className="font-black text-gray-900">{formatPegawaiName(currentPegawai.nama || '')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">NIP</span>
                    <span className="font-bold text-gray-900">{currentPegawai.nip || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">Tempat & Tanggal Lahir</span>
                    <span className="font-bold text-gray-900">{currentPegawai.tempatLahir || 'Jakarta'}, {currentPegawai.tanggalLahir || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">Jenis Kelamin / Agama</span>
                    <span className="font-bold text-gray-900">{currentPegawai.gender === 'L' ? 'Laki-Laki' : 'Perempuan'} / {currentPegawai.agama || 'Islam'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">Status Pernikahan</span>
                    <span className="font-bold text-gray-900">{currentPegawai.statusPerkawinan || 'Menikah'}</span>
                  </div>
                </div>
              </div>

              {/* Kolom 2: Kepegawaian & Jabatan */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 flex items-center gap-2">
                  <i className="bi bi-briefcase-fill"></i>
                  <span>Jabatan & Penempatan</span>
                </h4>
                <div className="space-y-3 bg-gray-50 p-4 rounded-2xl text-xs">
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">Jabatan Saat Ini</span>
                    <span className="font-black text-gray-900">{currentPegawai.jabatan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">Pangkat / Golongan</span>
                    <span className="font-bold text-gray-900">{currentPegawai.pangkat || 'Penata'} ({currentPegawai.golRuang || 'III/c'})</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">Unit Kerja</span>
                    <span className="font-bold text-gray-900">{currentPegawai.unitKerja || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">TMT Jabatan / TMT Pangkat</span>
                    <span className="font-bold text-gray-900">{currentPegawai.tmtJabatan || '-'} / {currentPegawai.tmtPangkat || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">Pendidikan Terakhir</span>
                    <span className="font-bold text-gray-900">{currentPegawai.pendidikan || 'S1'} - {currentPegawai.jurusan || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Kolom 3: Kontak & Administrasi */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 flex items-center gap-2">
                  <i className="bi bi-card-text"></i>
                  <span>Kontak & Nomor Administrasi</span>
                </h4>
                <div className="space-y-3 bg-gray-50 p-4 rounded-2xl text-xs">
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">No. WhatsApp / Handphone</span>
                    <span className="font-bold text-gray-900">{currentPegawai.noHp || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">Email Dinas / Pribadi</span>
                    <span className="font-bold text-gray-900">{currentPegawai.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">No. NPWP / BPJS Kesehatan</span>
                    <span className="font-bold text-gray-900">{currentPegawai.npwp || '-'} / {currentPegawai.noBpjs || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">No. Karpeg / TAPERA</span>
                    <span className="font-bold text-gray-900">{currentPegawai.noKarpeg || '-'} / {currentPegawai.noTAPERA || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[10px] block">Rekening Payroll Gaji</span>
                    <span className="font-bold text-gray-900">{currentPegawai.namaBank || 'Bank BNI'} - {currentPegawai.noRekeningGaji || '9876543210'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STATUS LAYANAN */}
      {activeTab === 'layanan' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Tiket Layanan SDM Saya</h3>
                <p className="text-xs text-gray-500">Pantau status usulan permohonan kepegawaian Anda secara real-time.</p>
              </div>
              <button
                onClick={() => navigate('/layanan-sdm')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
              >
                <i className="bi bi-plus-circle-fill"></i>
                <span>Buat Pengajuan Baru</span>
              </button>
            </div>

            {userLayanan.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-3xl mt-6 border border-dashed border-gray-200">
                <i className="bi bi-inbox text-5xl text-gray-300"></i>
                <h4 className="text-sm font-black text-gray-800 mt-3">Belum Ada Pengajuan Layanan</h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Anda belum pernah mengajukan tiket layanan SDM. Silakan klik tombol di bawah untuk membuat permohonan cuti, KGB, kenaikan pangkat, atau layanan lainnya.
                </p>
                <button
                  onClick={() => navigate('/layanan-sdm')}
                  className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-md"
                >
                  Buka Portal Layanan SDM
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {userLayanan.map((lay, idx) => (
                  <div key={idx} className="p-5 bg-gray-50 hover:bg-blue-50/40 rounded-2xl border border-gray-200/80 transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-blue-600">{lay.nomorTiket}</span>
                          <span className="text-[10px] text-gray-400">• {lay.tanggalPengajuan || '2026-08-20'}</span>
                          <span className="px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 text-[9px] font-bold">
                            {lay.kategori || 'Kepegawaian'}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-gray-900 mt-1">{lay.namaLayanan}</h4>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        lay.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        lay.status === 'PERLU_PERBAIKAN' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                        lay.status === 'DALAM_PROSES' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {lay.status}
                      </span>
                    </div>

                    {lay.catatanVerifikator && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-gray-100 text-xs text-gray-700">
                        <span className="font-bold text-gray-900 block mb-0.5">Catatan Verifikator SDM:</span>
                        <p className="italic">{lay.catatanVerifikator}</p>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Petugas SDM: <strong>{lay.petugasNama || 'Tim Pelayanan SDM DJKI'}</strong></span>
                      <button
                        onClick={() => navigate('/layanan-sdm/pengajuan-saya')}
                        className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <span>Buka Detail Tiket</span>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DOKUMEN / DOSSIER */}
      {activeTab === 'dokumen' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Arsip Dossier Digital Pegawai</h3>
                <p className="text-xs text-gray-500">Berkas digital SK CPNS, PNS, Pangkat, Jabatan, Ijazah, dan Sertifikat Anda.</p>
              </div>
              <button
                onClick={() => navigate('/dossiers')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <i className="bi bi-upload"></i>
                <span>Unggah Dokumen Baru</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                {['Semua', 'SK', 'Ijazah', 'SKP', 'Sertifikat'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setDossierFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      dossierFilter === cat ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Cari nama dokumen..."
                  value={dossierSearch}
                  onChange={(e) => setDossierSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* File List Grid */}
            {filteredDossiers.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl mt-6 border border-dashed border-gray-200">
                <i className="bi bi-folder-x text-4xl text-gray-300"></i>
                <p className="text-xs text-gray-500 mt-2">Tidak ditemukan dokumen dossier digital.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {filteredDossiers.map((doc, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 hover:bg-white rounded-2xl border border-gray-200/80 hover:shadow-md transition-all group flex flex-col justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                        <i className="bi bi-file-earmark-pdf-fill text-xl"></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-gray-900 truncate" title={doc.fileName}>
                          {doc.fileName || 'Dokumen Kepegawaian'}
                        </h4>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">{doc.keterangan || 'Berkas Terverifikasi'}</p>
                        <span className="text-[9px] text-gray-400 block mt-1">{doc.tanggal || 'Terunggah'}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        Tersimpan di Cloud
                      </span>
                      {doc.fileUrl ? (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <i className="bi bi-eye"></i>
                          <span>Buka File</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Lihat di Biro SDM</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: KEHADIRAN */}
      {activeTab === 'kehadiran' && (
        <div className="space-y-6">
          {/* Smart Presensi Interactive Live Card */}
          <PresensiTodayWidget />

          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Rekapitulasi Kehadiran &amp; Biometrik</h3>
                <p className="text-xs text-gray-500">Statistik presensi, verifikasi wajah liveness, dan estimasi uang makan.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => navigate('/presensi')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <i className="bi bi-camera-video-fill"></i>
                  <span>Buka Smart Presensi</span>
                </button>
                <button
                  onClick={() => navigate('/face-registration')}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <i className="bi bi-person-bounding-box"></i>
                  <span>Registrasi Wajah</span>
                </button>
                <button
                  onClick={() => navigate('/rekap-absensi')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                >
                  <span>Rekap Lengkap</span>
                </button>
              </div>
            </div>

            {/* Attendance Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Tingkat Kehadiran</p>
                <h3 className="text-2xl font-black text-emerald-950 mt-1">{absensiStats.kehadiranPersen}%</h3>
                <p className="text-[10px] text-emerald-600 mt-0.5">{absensiStats.hadirTepatWaktu} Hari Tepat Waktu</p>
              </div>
              <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-700">Keterlambatan (TL)</p>
                <h3 className="text-2xl font-black text-rose-950 mt-1">{absensiStats.terlambat} Kali</h3>
                <p className="text-[10px] text-rose-600 mt-0.5">Potongan minimal</p>
              </div>
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Sisa Cuti Tahunan</p>
                <h3 className="text-2xl font-black text-blue-950 mt-1">{absensiStats.sisaCuti} Hari</h3>
                <p className="text-[10px] text-blue-600 mt-0.5">Dari hak 12 hari/tahun</p>
              </div>
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Estimasi Uang Makan</p>
                <h3 className="text-2xl font-black text-amber-950 mt-1">{absensiStats.uangMakanEst}</h3>
                <p className="text-[10px] text-amber-600 mt-0.5">Bulan berjalan</p>
              </div>
            </div>

            {/* Riwayat Log Smart Presensi */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-gray-900">Log Presensi Geofence &amp; Biometrik Wajah</h4>
                <span className="text-[10px] font-bold text-gray-400">Verifikasi Client-Side AI</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[9px] font-black border-y border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Tanggal &amp; Waktu</th>
                      <th className="px-4 py-3">Tipe Presensi</th>
                      <th className="px-4 py-3">Status Kehadiran</th>
                      <th className="px-4 py-3">Lokasi Geofence</th>
                      <th className="px-4 py-3">Verifikasi Wajah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const smartLogs = getSmartAttendanceRecords(currentPegawai.nip || user?.nip);
                      if (smartLogs.length > 0) {
                        return smartLogs.slice(0, 8).map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {log.attendance_date} <span className="text-gray-400 font-normal">{log.attendance_time}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 text-blue-700">
                                {log.attendance_type === 'CHECK_IN' ? 'MASUK' : 'PULANG'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                                log.status === 'LATE' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              <span className="font-medium">{log.geofence_name}</span>
                              <span className="text-[10px] text-gray-400 block font-mono">±{log.gps_accuracy}m</span>
                            </td>
                            <td className="px-4 py-3 text-emerald-600 font-mono font-bold">
                              {log.face_match_score}% Cocok
                            </td>
                          </tr>
                        ));
                      }
                      return [
                        { tgl: '2026-08-25', in: '07:22 WIB', out: '16:35 WIB', st: 'PRESENT', loc: 'Kantor DJKI Tangerang' },
                        { tgl: '2026-08-24', in: '07:28 WIB', out: '16:30 WIB', st: 'PRESENT', loc: 'Kantor DJKI Tangerang' },
                        { tgl: '2026-08-21', in: '07:15 WIB', out: '17:00 WIB', st: 'PRESENT', loc: 'Kantor DJKI Tangerang' },
                        { tgl: '2026-08-20', in: '07:40 WIB', out: '16:30 WIB', st: 'LATE', loc: 'Kantor DJKI Tangerang' },
                        { tgl: '2026-08-19', in: '07:18 WIB', out: '16:45 WIB', st: 'PRESENT', loc: 'Kantor DJKI Tangerang' },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-bold text-gray-900">{row.tgl}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 text-blue-700">
                              MASUK: {row.in}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              row.st === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {row.st}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{row.loc}</td>
                          <td className="px-4 py-3 text-emerald-600 font-mono font-bold">98% Cocok</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: KOMPETENSI */}
      {activeTab === 'kompetensi' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Uji Kompetensi & Matriks 9-Box Talenta</h3>
                <p className="text-xs text-gray-500">Hasil pemetaan kompetensi teknis, manajerial, sosial kultural, dan potensi BKN.</p>
              </div>
              <button
                onClick={() => navigate('/talenta')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <span>Buka Portal Talenta 9-Box</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Hasil UKOM */}
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <h4 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4">
                  <i className="bi bi-card-checklist text-blue-600"></i>
                  <span>Skor Uji Kompetensi (UKOM) Terakhir</span>
                </h4>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-white rounded-2xl border border-gray-200">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Nilai TWK</p>
                    <p className="text-xl font-black text-gray-900 mt-1">{userUkom?.nilaiTwk || 85}</p>
                    <span className="text-[9px] text-emerald-600 font-bold">Memenuhi</span>
                  </div>
                  <div className="p-3 bg-white rounded-2xl border border-gray-200">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Nilai TIU</p>
                    <p className="text-xl font-black text-gray-900 mt-1">{userUkom?.nilaiTiu || 90}</p>
                    <span className="text-[9px] text-emerald-600 font-bold">Memenuhi</span>
                  </div>
                  <div className="p-3 bg-white rounded-2xl border border-gray-200">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Nilai TKP</p>
                    <p className="text-xl font-black text-gray-900 mt-1">{userUkom?.nilaiTkp || 92}</p>
                    <span className="text-[9px] text-emerald-600 font-bold">Memenuhi</span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-blue-600 font-bold block">Total Skor Akhir</span>
                    <span className="text-lg font-black text-blue-950">{userUkom?.totalNilai || 267} Poin</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase">
                    KOMPETEN / LULUS
                  </span>
                </div>
              </div>

              {/* Matriks 9-Box */}
              <div className="p-6 bg-purple-50/50 rounded-3xl border border-purple-100">
                <h4 className="text-sm font-black text-purple-950 flex items-center gap-2 mb-4">
                  <i className="bi bi-grid-3x3 text-purple-600"></i>
                  <span>Posisi Matriks 9-Box Talenta</span>
                </h4>

                <div className="p-5 bg-white rounded-2xl border border-purple-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-bold">Posisi Kuadran Box</span>
                    <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-black">
                      {userNineBox?.posisi_box || 'Box 8 (High Potential)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-bold">Nilai Potensi / Kinerja</span>
                    <span className="text-xs font-black text-gray-900">
                      {userNineBox?.potensi || 88} / {userNineBox?.kinerja || 92}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <span className="text-[10px] text-purple-700 font-black uppercase block">Rekomendasi Suksesi</span>
                    <p className="text-xs text-gray-700 mt-0.5">
                      {userNineBox?.rekomendasi || 'Direkomendasikan untuk promosi jabatan struktural / kenaikan jenjang fungsional berikutnya.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PELATIHAN (BANGKOM) */}
      {activeTab === 'pelatihan' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Pengembangan Kompetensi & Pelatihan (Bangkom)</h3>
                <p className="text-xs text-gray-500">Katalog sertifikat, jam pelajaran (JP), dan riwayat diklat kedinasan.</p>
              </div>
              <button
                onClick={() => navigate('/pengembangan')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                <span>Buka Portal Bangkom</span>
              </button>
            </div>

            {/* JP Progress Banner */}
            <div className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-3xl border border-indigo-100 mt-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-200/50 px-2 py-0.5 rounded">
                  Target UU ASN
                </span>
                <h4 className="text-lg font-black text-indigo-950 mt-1">
                  {bangkomStats.totalJp} dari 20 Jam Pelajaran (JP) Tercapai
                </h4>
                <p className="text-xs text-indigo-800 mt-0.5">
                  {bangkomStats.isAchieved ? 'Target pengembangan kompetensi tahun 2026 telah terpenuhi!' : `Anda membutuhkan ${20 - bangkomStats.totalJp} JP lagi untuk memenuhi standar tahunan.`}
                </p>
              </div>
              <div className="h-16 w-16 rounded-full bg-white border-4 border-indigo-600 flex items-center justify-center font-black text-sm text-indigo-950 shrink-0 shadow-md">
                {bangkomStats.persentase}%
              </div>
            </div>

            {/* List Pelatihan */}
            <div className="mt-8 space-y-4">
              <h4 className="text-sm font-black text-gray-900">Riwayat Pelatihan & Sertifikat</h4>
              {userBangkom.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-500">Belum ada riwayat pelatihan tercatat untuk tahun ini.</p>
                </div>
              ) : (
                userBangkom.map((b, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase">
                          {b.jumlahJpl || 8} JP
                        </span>
                        <span className="text-[10px] text-gray-400">• {b.tanggalMulai || '2026'}</span>
                      </div>
                      <h4 className="text-xs font-black text-gray-900 mt-1">{b.namaKegiatan}</h4>
                      <p className="text-[10px] text-gray-500">{b.penyelenggara || 'BPSDM Hukum dan HAM'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-gray-500">No. {b.nomorSertifikat || 'SERT/2026/08'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: KARIER */}
      {activeTab === 'karier' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Jejak Langkah & Timeline Karier ASN</h3>
                <p className="text-xs text-gray-500">Riwayat pengangkatan, mutasi, promosi, dan mutasi jabatan di Kemenkumham RI.</p>
              </div>
            </div>

            <div className="mt-8 relative border-l-2 border-blue-200 ml-4 space-y-8">
              {/* Timeline Item 1 */}
              <div className="relative pl-6">
                <div className="absolute -left-2.5 top-1.5 h-5 w-5 rounded-full bg-blue-600 border-4 border-white shadow"></div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Jabatan Saat Ini • TMT {currentPegawai.tmtJabatan || '2022-04-01'}</span>
                <h4 className="text-sm font-black text-gray-900 mt-0.5">{currentPegawai.jabatan || 'Analis SDM Aparatur Ahli Muda'}</h4>
                <p className="text-xs text-gray-600 mt-0.5">{currentPegawai.unitKerja || 'Sekretariat DJKI'}</p>
              </div>

              {/* Timeline Item 2 */}
              <div className="relative pl-6">
                <div className="absolute -left-2.5 top-1.5 h-5 w-5 rounded-full bg-gray-400 border-4 border-white shadow"></div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Jabatan Sebelumnya • 2018 - 2022</span>
                <h4 className="text-sm font-black text-gray-800 mt-0.5">Analis Kepegawaian Ahli Pertama</h4>
                <p className="text-xs text-gray-600 mt-0.5">Direktorat Jenderal Kekayaan Intelektual</p>
              </div>

              {/* Timeline Item 3 */}
              <div className="relative pl-6">
                <div className="absolute -left-2.5 top-1.5 h-5 w-5 rounded-full bg-gray-400 border-4 border-white shadow"></div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Pengangkatan CPNS/PNS • 2012</span>
                <h4 className="text-sm font-black text-gray-800 mt-0.5">Pengadministrasi Kepegawaian</h4>
                <p className="text-xs text-gray-600 mt-0.5">Kementerian Hukum dan HAM RI</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: KGB */}
      {activeTab === 'kgb' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Kenaikan Gaji Berkala (KGB)</h3>
                <p className="text-xs text-gray-500">Jadwal berkala 2 tahun sekali dan status penerbitan SK KGB otomatis.</p>
              </div>
              <button
                onClick={() => navigate('/kgb-gen')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                <span>Generator SK KGB</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="p-6 bg-amber-50/60 rounded-3xl border border-amber-100 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
                  Status KGB Aktif
                </span>
                <div>
                  <p className="text-xs text-gray-500 font-bold">TMT KGB Berikutnya</p>
                  <h4 className="text-2xl font-black text-amber-950 mt-0.5">{kgbDetails.tmtBerikutnya}</h4>
                  <p className="text-xs text-amber-700 mt-1 font-bold">
                    {kgbDetails.sisaHari} Hari Menuju Kenaikan Gaji
                  </p>
                </div>

                <div className="pt-4 border-t border-amber-200/60 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimasi Gaji Pokok Baru:</span>
                    <span className="font-black text-gray-900">Rp {kgbDetails.gajiSaatIni.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gaji Pokok Lama:</span>
                    <span className="font-bold text-gray-700">Rp {kgbDetails.gajiLama.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-3 text-xs">
                <h4 className="font-black text-gray-900 mb-2">Ketentuan & Syarat KGB</h4>
                <div className="space-y-2 text-gray-600">
                  <p className="flex items-center gap-2">
                    <i className="bi bi-check-circle-fill text-emerald-500"></i>
                    <span>Telah mencapai masa kerja 2 (dua) tahun dari TMT KGB terakhir.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <i className="bi bi-check-circle-fill text-emerald-500"></i>
                    <span>Penilaian Kinerja Pegawai (SKP) minimal berpredikat "BAIK".</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <i className="bi bi-check-circle-fill text-emerald-500"></i>
                    <span>Tidak sedang menjalani Hukuman Disiplin tingkat sedang atau berat.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: PANGKAT (KENAIKAN PANGKAT) */}
      {activeTab === 'pangkat' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Kenaikan Pangkat (KP) ASN</h3>
                <p className="text-xs text-gray-500">Informasi golongan ruang, siklus 6 periode BKN, dan proyeksi kenaikan pangkat.</p>
              </div>
              <button
                onClick={() => navigate('/kenaikan-pangkat')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                <span>Buka Modul Kenaikan Pangkat</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="p-6 bg-purple-50/60 rounded-3xl border border-purple-100 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 bg-purple-200/60 px-2.5 py-0.5 rounded-full">
                  Pangkat Saat Ini: {kpDetails.golongan}
                </span>
                <div>
                  <h4 className="text-2xl font-black text-purple-950">{kpDetails.namaPangkat}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">TMT Terakhir: <strong>{kpDetails.tmtPangkat}</strong></p>
                </div>

                <div className="pt-4 border-t border-purple-200/60">
                  <p className="text-[10px] text-purple-700 font-bold uppercase">Proyeksi Kenaikan Pangkat</p>
                  <p className="text-sm font-black text-purple-950 mt-0.5">{kpDetails.proyeksiTmtKp} ({kpDetails.periodeTerdekat})</p>
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-xs space-y-3">
                <h4 className="font-black text-gray-900 mb-2">Checklist Berkas Usulan KP (BKN)</h4>
                <div className="space-y-2 text-gray-600">
                  <p className="flex items-center gap-2">
                    <i className="bi bi-check-circle-fill text-emerald-500"></i>
                    <span>SK Kenaikan Pangkat Terakhir</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <i className="bi bi-check-circle-fill text-emerald-500"></i>
                    <span>SKP & Evaluasi Kinerja 2 Tahun Terakhir (Bernilai Baik)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <i className="bi bi-check-circle-fill text-emerald-500"></i>
                    <span>Ijazah & Transkrip Nilai Terakhir (Pencantuman Gelar)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <i className="bi bi-check-circle-fill text-emerald-500"></i>
                    <span>Sertifikat Uji Kompetensi (Bagi JF yang naik jenjang)</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: PENSIUN */}
      {activeTab === 'pensiun' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Perencanaan Masa Purna Tugas (Pensiun)</h3>
                <p className="text-xs text-gray-500">Perhitungan Batas Usia Pensiun (BUP), TMT pensiun, dan panduan pemberkasan TASPEN.</p>
              </div>
              <button
                onClick={() => navigate('/pensiun')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                <span>Simulasi Pensiun</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="p-6 bg-blue-50/60 rounded-3xl border border-blue-100 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Batas Usia Pensiun (BUP)</p>
                <h4 className="text-3xl font-black text-blue-950 mt-1">{retirementInfo?.bup || 58} Tahun</h4>
                <p className="text-xs text-blue-800 mt-1">Berdasarkan Jenis Jabatan</p>
              </div>

              <div className="p-6 bg-purple-50/60 rounded-3xl border border-purple-100 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-purple-700">Tanggal TMT Pensiun</p>
                <h4 className="text-xl font-black text-purple-950 mt-1">
                  {retirementInfo?.tmtPensiun instanceof Date 
                    ? retirementInfo.tmtPensiun.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : (currentPegawai.tglPensiun || '-')}
                </h4>
                <p className="text-xs text-purple-800 mt-1">Masa Purna Tugas Resmi</p>
              </div>

              <div className="p-6 bg-emerald-50/60 rounded-3xl border border-emerald-100 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Sisa Masa Pengabdian</p>
                <h4 className="text-xl font-black text-emerald-950 mt-1">{retirementInfo?.sisaMasaKerja || '18 Tahun'}</h4>
                <p className="text-xs text-emerald-800 mt-1">Menuju Purna Bhakti</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 11: APLIKASI TERKAIT */}
      {activeTab === 'aplikasi' && (
        <div className="space-y-6">
          <ExternalAppLinks 
            title="Pusat Portal & Aplikasi Kepegawaian Terintegrasi" 
            subtitle="Kumpulan tautan aplikasi resmi kepegawaian internal Kemenkumham RI dan BKN RI untuk mendukung kinerja dan administrasi ASN DJKI" 
          />
        </div>
      )}

      {/* TAB 12: NOTIFIKASI */}
      {activeTab === 'notifikasi' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Pusat Notifikasi & Pengingat SDM</h3>
                <p className="text-xs text-gray-500">Pemberitahuan resmi mengenai layanan, kenaikan gaji, pangkat, dan presensi Anda.</p>
              </div>
              {unreadNotifCount > 0 && (
                <button
                  onClick={markAllNotifsAsRead}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all"
                >
                  Tandai Semua Dibaca
                </button>
              )}
            </div>

            <div className="mt-6 space-y-3">
              {userNotifications.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <i className="bi bi-bell-slash text-4xl text-gray-300"></i>
                  <p className="text-xs text-gray-500 mt-2">Tidak ada notifikasi saat ini.</p>
                </div>
              ) : (
                userNotifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => markNotifAsRead(notif.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      notif.dibaca ? 'bg-white border-gray-100 opacity-75' : 'bg-blue-50/50 border-blue-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                          notif.prioritas === 'HIGH' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          <i className={`bi ${notif.prioritas === 'HIGH' ? 'bi-exclamation-triangle-fill' : 'bi-bell-fill'}`}></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-gray-900">{notif.judul}</h4>
                            {!notif.dibaca && (
                              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{notif.pesan}</p>
                          <span className="text-[9px] text-gray-400 block mt-1.5">{notif.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSelfServiceDashboard;
