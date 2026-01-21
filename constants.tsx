
import { TaskType } from './types';
import { LOGO_DJKI_URL } from './assets/branding';

// Logo DJKI (Yellow & Blue) - Static File Path
export const DEFAULT_LOGO = LOGO_DJKI_URL;

// Months of the year in Indonesian
export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// List of work units in the organization (Standard List)
export const UNIT_KERJA = [
  'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
  'Direktorat Hak Cipta dan Desain Industri',
  'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang',
  'Direktorat Merek dan Indikasi Geografis',
  'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi',
  'Direktorat Teknologi Informasi Kekayaan Intelektual',
  'Direktorat Penegakan Hukum'
];

// Helper untuk normalisasi nama unit dari berbagai variasi input spreadsheet
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

  const matched = UNIT_KERJA.find(u => {
    const standard = u.toLowerCase();
    return cleaned.includes(standard) || standard.includes(cleaned);
  });
  
  return matched || 'LAINNYA';
};

// Daftar Pendidikan Riil sesuai Spreadsheet
export const PENDIDIKAN_LIST = [
  "SD-SD/SEDERAJAT", "SLTA", "SLTA-IPA", "SLTA-SLTA/SMA SEDERAJAT",
  "DIII", "DIV", "S1", "S2", "S3"
];

// Mapping of salary grades to official ranks
export const PANGKAT_MAP: Record<string, string> = {
  'I/a': 'Juru Muda', 'I/b': 'Juru Muda Tingkat I', 'I/c': 'Juru', 'I/d': 'Juru Tingkat I',
  'II/a': 'Pengatur Muda', 'II/b': 'Pengatur Muda Tingkat I', 'II/c': 'Pengatur', 'II/d': 'Pengatur Tingkat I',
  'III/a': 'Penata Muda', 'III/b': 'Penata Muda Tingkat I', 'III/c': 'Penata', 'III/d': 'Penata Tingkat I',
  'IV/a': 'Pembina', 'IV/b': 'Pembina Tingkat I', 'IV/c': 'Pembina Utama Muda', 'IV/d': 'Pembina Utama Madya', 'IV/e': 'Pembina Utama'
};

// Helper to get rank from salary grade
export const getPangkatFromGol = (gol: string): string => PANGKAT_MAP[gol] || '-';

// Coefficient for credit points based on job level (SESUAI GAMBAR 1 & 3)
export const AK_KOEFISIEN: Record<string, number> = {
  'AHLI UTAMA': 50,
  'AHLI MADYA': 37.5,
  'AHLI MUDA': 25,
  'AHLI PERTAMA': 12.5,
  'PENYELIA': 25,
  'MAHIR': 12.5,
  'TERAMPIL': 5,
  'PEMULA': 3.75
};

// Multiplier for credit points based on performance predicate (SESUAI GAMBAR 1 & 4)
export const PREDIKAT_MULTIPLIER: Record<string, number> = {
  'Sangat Baik': 1.5,
  'Baik': 1.0,
  'Butuh Perbaikan': 0.75,
  'Kurang': 0.5,
  'Sangat Kurang': 0.25
};

// Display labels for different task types
export const TASK_LABELS: Record<string, string> = {
  [TaskType.PELANTIKAN]: 'Pelantikan',
  [TaskType.APEL]: 'Apel Pegawai',
  [TaskType.LHKPN]: 'LHKPN',
  [TaskType.LHKASN]: 'LHKASN',
  [TaskType.TUGAS_BELAJAR]: 'Tugas Belajar',
  [TaskType.MAGANG]: 'Magang',
  [TaskType.PENELITIAN]: 'Penelitian',
  [TaskType.SATYA_LENCANA]: 'Satya Lencana',
  [TaskType.GELAR]: 'Pencantuman Gelar',
  [TaskType.PANGKAT]: 'Kenaikan Pangkat',
  [TaskType.JENJANG]: 'Kenaikan Jenjang',
  [TaskType.GAJI]: 'Pengelolaan Gaji',
  [TaskType.MUTASI]: 'Mutasi Pegawai',
  [TaskType.KARTU_SUAMI_ISTRI]: 'Kartu Suami/Istri',
  [TaskType.KARTU_BPJS]: 'Kartu BPJS',
  [TaskType.CUTI]: 'Cuti Pegawai',
  [TaskType.SPMT_SPP]: 'SPMT / SPP',
  [TaskType.ABSENSI]: 'Absensi Pegawai',
  [TaskType.PERKAWINAN]: 'Perkawinan/Perceraian',
  [TaskType.HUKUMAN]: 'Hukuman Disiplin',
  [TaskType.PENSIUN]: 'Usulan Pensiun',
  [TaskType.GRATIFIKASI]: 'Gratifikasi',
  [TaskType.KGB]: 'Kenaikan Gaji Berkala'
};

// Fix: Add getGajiEstimasi function used in spreadsheetService.ts to calculate salary estimation
export const getGajiEstimasi = (gol: string, mk: number): number => {
  // Simplified base salary data based on Indonesian Government Regulation (PP) No 5 Tahun 2024
  const baseSalaries: Record<string, number> = {
    'I/a': 1685700, 'I/b': 1840800, 'I/c': 1918700, 'I/d': 1999900,
    'II/a': 2184000, 'II/b': 2385000, 'II/c': 2485900, 'II/d': 2591100,
    'III/a': 2785700, 'III/b': 2903600, 'III/c': 3026400, 'III/d': 3154400,
    'IV/a': 3287800, 'IV/b': 3426900, 'IV/c': 3571900, 'IV/d': 3723000, 'IV/e': 3880400
  };
  
  const base = baseSalaries[gol] || 1600000;
  // Estimated increase per year (Masa Kerja) - simplified linear model for estimation
  return Math.round(base * (1 + (mk * 0.025)));
};
