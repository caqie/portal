
import { TaskType } from './types';
import { LOGO_DJKI_URL } from './assets/branding';

export const DEFAULT_LOGO = LOGO_DJKI_URL;
// Logo Pengayoman dari Drive User (Direct Link format)
export const DEFAULT_TEMPLATE_LOGO = "https://lh3.googleusercontent.com/d/167R3ZH6_bKeNbjZ-FituldKmzu3FOoAR";

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const UNIT_KERJA = [
  'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
  'Direktorat Hak Cipta dan Desain Industri',
  'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang',
  'Direktorat Merek dan Indikasi Geografis',
  'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi',
  'Direktorat Teknologi Informasi Kekayaan Intelektual',
  'Direktorat Penegakan Hukum'
];

export const normalizeUnitName = (rawUnit: string): string => {
  const cleaned = (rawUnit || '').toLowerCase().trim();
  if (!cleaned) return 'LAINNYA';
  if (cleaned.includes('sekretariat')) return UNIT_KERJA[0];
  if (cleaned.includes('cipta') || cleaned.includes('desain industri')) return UNIT_KERJA[1];
  if (cleaned.includes('paten') || cleaned.includes('sirkuit terpadu') || cleaned.includes('dtlst') || cleaned.includes('dagang')) return UNIT_KERJA[2];
  if (cleaned.includes('merek') || cleaned.includes('indikasi geografis')) return UNIT_KERJA[3];
  if (cleaned.includes('kerjasama') || cleaned.includes('kerja sama') || cleaned.includes('pemberdayaan') || cleaned.includes('edukasi')) return UNIT_KERJA[4];
  if (cleaned.includes('teknologi informasi') || cleaned.includes(' t i ') || cleaned.endsWith(' ti')) return UNIT_KERJA[5];
  if (cleaned.includes('penyidikan') || cleaned.includes('sengketa') || cleaned.includes('penegakan hukum')) return UNIT_KERJA[6];
  return UNIT_KERJA.find(u => u.toLowerCase().includes(cleaned)) || 'LAINNYA';
};

/**
 * KOMPREHENSIF GELAR MAP
 */
export const GELAR_MAP: Record<string, { bidang: string, jenjang: string }> = {
  'Dr.Tr.': { bidang: 'Doktor Terapan', jenjang: 'S3' },
  'Dr.': { bidang: 'Doktor', jenjang: 'S3' },
  'M.Tr.A.P.': { bidang: 'Terapan Administrasi Publik', jenjang: 'S2' },
  'M.Kom.': { bidang: 'Ilmu Komputer', jenjang: 'S2' },
  'MMSI': { bidang: 'Manajemen Sistem Informasi', jenjang: 'S2' },
  'M.Eng': { bidang: 'Teknik (Master of Engineering)', jenjang: 'S2' },
  'LL.M.': { bidang: 'Hukum Internasional', jenjang: 'S2' },
  'M.P.P.': { bidang: 'Kebijakan Publik', jenjang: 'S2' },
  'M.H.': { bidang: 'Hukum', jenjang: 'S2' },
  'MH': { bidang: 'Hukum', jenjang: 'S2' },
  'M.Si.': { bidang: 'Sains', jenjang: 'S2' },
  'M.M.': { bidang: 'Manajemen', jenjang: 'S2' },
  'MM': { bidang: 'Manajemen', jenjang: 'S2' },
  'M.T.': { bidang: 'Teknik', jenjang: 'S2' },
  'MT': { bidang: 'Teknik', jenjang: 'S2' },
  'M.E.': { bidang: 'Ekonomi', jenjang: 'S2' },
  'MSE': { bidang: 'Ekonomi', jenjang: 'S2' },
  'M.IP': { bidang: 'Ilmu Pemerintahan', jenjang: 'S2' },
  'M.IPol': { bidang: 'Ilmu Politik', jenjang: 'S2' },
  'M.Hum.': { bidang: 'Humaniora', jenjang: 'S2' },
  'M.Sc.': { bidang: 'Sains (Master of Science)', jenjang: 'S2' },
  'MA': { bidang: 'Seni/Sosial (Master of Arts)', jenjang: 'S2' },
  'M.Kn.': { bidang: 'Kenotariatan', jenjang: 'S2' },
  'M.Farm.': { bidang: 'Farmasi', jenjang: 'S2' },
  'M.Ds.': { bidang: 'Desain', jenjang: 'S2' },
  'S.Tr.Im': { bidang: 'Keimigrasian', jenjang: 'DIV' },
  'S.Tr.Pas': { bidang: 'Pemasyarakatan', jenjang: 'DIV' },
  'S.Tr.Keb': { bidang: 'Kebidanan', jenjang: 'DIV' },
  'S.Tr.Kes': { bidang: 'Kesehatan', jenjang: 'DIV' },
  'S.ST.': { bidang: 'Sains Terapan', jenjang: 'DIV' },
  'S.Tr.T': { bidang: 'Teknik Terapan', jenjang: 'DIV' },
  'S.Tr.RMIK': { bidang: 'Rekam Medis & Info Kesehatan', jenjang: 'DIV' },
  'S.H.': { bidang: 'Hukum', jenjang: 'S1' },
  'SH': { bidang: 'Hukum', jenjang: 'S1' },
  'S.T.': { bidang: 'Teknik', jenjang: 'S1' },
  'ST': { bidang: 'Teknik', jenjang: 'S1' },
  'S.Kom.': { bidang: 'Komputer', jenjang: 'S1' },
  'S.E.': { bidang: 'Ekonomi', jenjang: 'S1' },
  'SE': { bidang: 'Ekonomi', jenjang: 'S1' },
  'S.Sos.': { bidang: 'Ilmu Sosial', jenjang: 'S1' },
  'S.Si.': { bidang: 'Sains (MIPA)', jenjang: 'S1' },
  'S.Pd.': { bidang: 'Pendidikan', jenjang: 'S1' },
  'S.Pd.I': { bidang: 'Pendidikan Islam', jenjang: 'S1' },
  'S.Ak.': { bidang: 'Akuntansi', jenjang: 'S1' },
  'S.Akun': { bidang: 'Akuntansi', jenjang: 'S1' },
  'S.M.': { bidang: 'Manajemen', jenjang: 'S1' },
  'S.IP': { bidang: 'Ilmu Politik', jenjang: 'S1' },
  'S.I.P': { bidang: 'Ilmu Politik', jenjang: 'S1' },
  'S.I.Kom.': { bidang: 'Ilmu Komunikasi', jenjang: 'S1' },
  'SS': { bidang: 'Sastra/Sosial', jenjang: 'S1' },
  'S.Psi.': { bidang: 'Psikologi', jenjang: 'S1' },
  'S.Farm.': { bidang: 'Farmasi', jenjang: 'S1' },
  'S.P.': { bidang: 'Pertanian', jenjang: 'S1' },
  'S.TP.': { bidang: 'Teknologi Pertanian', jenjang: 'S1' },
  'S.Pi.': { bidang: 'Perikanan', jenjang: 'S1' },
  'S.Kel': { bidang: 'Kelautan', jenjang: 'S1' },
  'S.Hut.': { bidang: 'Kehutanan', jenjang: 'S1' },
  'S.Sn.': { bidang: 'Seni', jenjang: 'S1' },
  'S.Ds.': { bidang: 'Desain', jenjang: 'S1' },
  'S.Ag.': { bidang: 'Agama', jenjang: 'S1' },
  'S.Sy.': { bidang: 'Hukum Syariah', jenjang: 'S1' },
  'S.I.K.': { bidang: 'Ilmu Kepolisian', jenjang: 'S1' },
  'S.Ars.': { bidang: 'Arsitektur', jenjang: 'S1' },
  'Drs.': { bidang: 'Doktorandus (Sosial/Sains)', jenjang: 'S1' },
  'Dra.': { bidang: 'Doktoranda (Sosial/Sains)', jenjang: 'S1' },
  'A.Md.Kom.': { bidang: 'Komputer', jenjang: 'DIII' },
  'A.Md.Keb': { bidang: 'Kebidanan', jenjang: 'DIII' },
  'Am.Keb': { bidang: 'Kebidanan', jenjang: 'DIII' },
  'A.Md.Kep': { bidang: 'Keperawatan', jenjang: 'DIII' },
  'AMK': { bidang: 'Keperawatan', jenjang: 'DIII' },
  'A.Md.Rad': { bidang: 'Radiologi', jenjang: 'DIII' },
  'PK': { bidang: 'Rekam Medis', jenjang: 'DIII' },
  'A.Md.': { bidang: 'Ahli Madya', jenjang: 'DIII' },
  'Amd.': { bidang: 'Ahli Madya', jenjang: 'DIII' },
  'Ir.': { bidang: 'Insinyur', jenjang: 'PROFESI' },
  'Apt.': { bidang: 'Apoteker', jenjang: 'PROFESI' },
  'dr.': { bidang: 'Dokter', jenjang: 'PROFESI' },
  'drg.': { bidang: 'Dokter Gigi', jenjang: 'PROFESI' },
  'Bc.IP': { bidang: 'Pemasyarakatan (Kedinasan)', jenjang: 'DIV' },
};

/**
 * Resolusi otomatis Pendidikan berdasarkan Gelar
 */
export const resolveEducationInfo = (input: string): { bidang: string, jenjang: string, display: string } | null => {
  if (!input) return null;
  const sortedKeys = Object.keys(GELAR_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (input.includes(key)) {
      const data = GELAR_MAP[key];
      return { 
        ...data, 
        display: `${data.jenjang} ${data.bidang}`.toUpperCase() 
      };
    }
  }
  return null;
};

export const PANGKAT_MAP: Record<string, string> = {
  'I/a': 'Juru Muda', 'I/b': 'Juru Muda Tingkat I', 'I/c': 'Juru', 'I/d': 'Juru Tingkat I',
  'II/a': 'Pengatur Muda', 'II/b': 'Pengatur Muda Tingkat I', 'II/c': 'Pengatur', 'II/d': 'Pengatur Tingkat I',
  'III/a': 'Penata Muda', 'III/b': 'Penata Muda Tingkat I', 'III/c': 'Penata', 'III/d': 'Penata Tingkat I',
  'IV/a': 'Pembina', 'IV/b': 'Pembina Tingkat I', 'IV/c': 'Pembina Utama Muda', 'IV/d': 'Pembina Utama Madya', 'IV/e': 'Pembina Utama'
};

export const getPangkatFromGol = (gol: string): string => PANGKAT_MAP[gol] || '-';

export const AK_KOEFISIEN: Record<string, number> = {
  'AHLI UTAMA': 50, 'AHLI MADYA': 37.5, 'AHLI MUDA': 25, 'AHLI PERTAMA': 12.5,
  'PENYELIA': 25, 'MAHIR': 12.5, 'TERAMPIL': 5, 'PEMULA': 3.75
};

export const PREDIKAT_MULTIPLIER: Record<string, number> = {
  'Sangat Baik': 1.5, 'Baik': 1.0, 'Butuh Perbaikan': 0.75, 'Kurang': 0.5, 'Sangat Kurang': 0.25
};

export const TASK_LABELS: Record<string, string> = {
  [TaskType.PELANTIKAN]: 'Pelantikan', [TaskType.APEL]: 'Apel Pegawai', [TaskType.LHKPN]: 'LHKPN', [TaskType.LHKASN]: 'LHKASN',
  [TaskType.TUGAS_BELAJAR]: 'Tugas Belajar', [TaskType.MAGANG]: 'Magang', [TaskType.PENELITIAN]: 'Penelitian',
  [TaskType.SATYA_LENCANA]: 'Satya Lencana', [TaskType.GELAR]: 'Pencantuman Gelar', [TaskType.PANGKAT]: 'Kenaikan Pangkat',
  [TaskType.JENJANG]: 'Kenaikan Jenjang', [TaskType.GAJI]: 'Pengelolaan Gaji', [TaskType.MUTASI]: 'Mutasi Pegawai',
  [TaskType.KARTU_SUAMI_ISTRI]: 'Kartu Suami/Istri', [TaskType.KARTU_BPJS]: 'Kartu BPJS', [TaskType.CUTI]: 'Cuti Pegawai',
  [TaskType.SPMT_SPP]: 'SPMT / SPP', [TaskType.ABSENSI]: 'Absensi Pegawai', [TaskType.PERKAWINAN]: 'Perkawinan/Perceraian',
  [TaskType.HUKUMAN]: 'Hukuman Disiplin', [TaskType.PENSIUN]: 'Usulan Pensiun', [TaskType.GRATIFIKASI]: 'Gratifikasi', [TaskType.KGB]: 'KGB',
  [TaskType.UANG_MAKAN]: 'Uang Makan'
};

export const getGajiEstimasi = (gol: string, mk: number): number => {
  const baseSalaries: Record<string, number> = {
    'I/a': 1685700, 'I/b': 1840800, 'I/c': 1918700, 'I/d': 1999900,
    'II/a': 2184000, 'II/b': 2385000, 'II/c': 2485900, 'II/d': 2591100,
    'III/a': 2785700, 'III/b': 2903600, 'III/c': 3026400, 'III/d': 3154400,
    'IV/a': 3287800, 'IV/b': 3426900, 'IV/c': 3571900, 'IV/d': 3723000, 'IV/e': 3880400
  };
  const base = baseSalaries[gol] || 1600000;
  return Math.round(base * (1 + (mk * 0.025)));
};

export const APP_ROUTES = [
  { path: '/', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
  { path: '/pegawai', label: 'Database Pegawai', icon: 'bi-person-vcard-fill' },
  { path: '/layanan', label: 'Layanan Karir', icon: 'bi-briefcase-fill' },
  { path: '/persuratan', label: 'Persuratan Digital', icon: 'bi-envelope-paper-fill' },
  { path: '/tugas-rutin', label: 'Tugas Rutin', icon: 'bi-clipboard2-check-fill' },
  { path: '/kegiatan', label: 'Kalender Kegiatan', icon: 'bi-calendar2-event-fill' },
  { path: '/laporan', label: 'Laporan Bulanan', icon: 'bi-file-earmark-bar-graph-fill' },
  { path: '/keuangan', label: 'Keuangan', icon: 'bi-cash-stack' },
  { path: '/dossiers', label: 'E-Dossier Digital', icon: 'bi-folder-fill' },
  { path: '/absensi-online', label: 'Absensi Wajah', icon: 'bi-camera-fill' },
  { path: '/rekap-absensi', label: 'Rekapitulasi Absensi', icon: 'bi-clipboard-data-fill' },
  { path: '/settings', label: 'Pengaturan Sistem', icon: 'bi-gear-wide-connected' },
  { path: '/logs', label: 'Audit Logs', icon: 'bi-clock-history' },
  { path: '/skp', label: 'SKP', icon: 'bi-file-earmark-text' },
  { path: '/pak', label: 'PAK', icon: 'bi-file-earmark-medical' },
  { path: '/anjab-abk', label: 'ANJAB ABK', icon: 'bi-diagram-3' },
  { path: '/pelantikan-gen', label: 'Pelantikan Generator', icon: 'bi-file-earmark-person' },
  { path: '/spmt-spp', label: 'SPMT / SPP', icon: 'bi-file-earmark-check' },
  { path: '/kgb-gen', label: 'KGB Generator', icon: 'bi-cash' },
  { path: '/pensiun', label: 'Pensiun', icon: 'bi-door-open' },
  { path: '/kenaikan-pangkat', label: 'Kenaikan Pangkat', icon: 'bi-graph-up-arrow' },
  { path: '/satya-lencana', label: 'Satya Lencana', icon: 'bi-award' },
  { path: '/magang-pkl', label: 'Magang & PKL', icon: 'bi-mortarboard' },
  { path: '/pengembangan', label: 'Pengembangan Kompetensi', icon: 'bi-book' },
  { path: '/ukom/admin', label: 'Admin UKOM (CAT)', icon: 'bi-pc-display-horizontal' },
  { path: '/ukom/supervisor', label: 'Pengawas UKOM', icon: 'bi-shield-check' },
  { path: '/ukom/login', label: 'Portal Ujian UKOM', icon: 'bi-pencil-square' }
];
