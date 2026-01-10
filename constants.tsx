
import { TaskType } from './types';
import { LOGO_DJKI_URL } from './assets/branding';

// Logo DJKI (Yellow & Blue) - Static File Path
export const DEFAULT_LOGO = LOGO_DJKI_URL;

// Months of the year in Indonesian
export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// List of work units in the organization
export const UNIT_KERJA = [
  'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
  'Direktorat Hak Cipta dan Desain Industri',
  'Direktorat Paten, DTLST dan Rahasia Dagang',
  'Direktorat Merek dan Indikasi Geografis',
  'Direktorat Kerjasama dan Pemberdayaan Kekayaan Intelektual',
  'Direktorat Teknologi Informasi Kekayaan Intelektual',
  'Direktorat Penyidikan dan Penyelesaian Sengketa'
];

// Mapping of salary grades to official ranks
export const PANGKAT_MAP: Record<string, string> = {
  'I/a': 'Juru Muda',
  'I/b': 'Juru Muda Tingkat I',
  'I/c': 'Juru',
  'I/d': 'Juru Tingkat I',
  'II/a': 'Pengatur Muda',
  'II/b': 'Pengatur Muda Tingkat I',
  'II/c': 'Pengatur',
  'II/d': 'Pengatur Tingkat I',
  'III/a': 'Penata Muda',
  'III/b': 'Penata Muda Tingkat I',
  'III/c': 'Penata',
  'III/d': 'Penata Tingkat I',
  'IV/a': 'Pembina',
  'IV/b': 'Pembina Tingkat I',
  'IV/c': 'Pembina Utama Muda',
  'IV/d': 'Pembina Utama Madya',
  'IV/e': 'Pembina Utama'
};

// Helper to get rank from salary grade
export const getPangkatFromGol = (gol: string): string => PANGKAT_MAP[gol] || '-';

// Display labels for different task types
export const TASK_LABELS: Record<TaskType, string> = {
  [TaskType.PELANTIKAN]: 'Pelantikan',
  [TaskType.APEL]: 'Apel',
  [TaskType.LHKPN]: 'LHKPN',
  [TaskType.LHKASN]: 'LHKASN',
  [TaskType.TUGAS_BELAJAR]: 'Tugas Belajar',
  [TaskType.MAGANG]: 'Magang',
  [TaskType.PENELITIAN]: 'Penelitian',
  [TaskType.SATYA_LENCANA]: 'Satya Lencana',
  [TaskType.GELAR]: 'Pencantuman Gelar',
  [TaskType.PANGKAT]: 'Kenaikan Pangkat',
  [TaskType.JENJANG]: 'Kenaikan Jenjang',
  [TaskType.GAJI]: 'Gaji',
  [TaskType.MUTASI]: 'Mutasi',
  [TaskType.KARTU_SUAMI_ISTRI]: 'Kartu Suami/Istri',
  [TaskType.KARTU_BPJS]: 'Kartu BPJS',
  [TaskType.CUTI]: 'Cuti',
  [TaskType.SPMT_SPP]: 'SPMT/SPP',
  [TaskType.ABSENSI]: 'Absensi',
  [TaskType.PERKAWINAN]: 'Perkawinan/Perceraian',
  [TaskType.HUKUMAN]: 'Hukuman Disiplin',
  [TaskType.PENSIUN]: 'Pensiun',
  [TaskType.GRATIFIKASI]: 'Gratifikasi',
  [TaskType.KGB]: 'Kenaikan Gaji Berkala'
};

// Coefficient for credit points based on job level
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

// Multiplier for credit points based on performance predicate
export const PREDIKAT_MULTIPLIER: Record<string, number> = {
  'Sangat Baik': 1.5,
  'Baik': 1.0,
  'Butuh Perbaikan': 0.75,
  'Kurang': 0.5,
  'Sangat Kurang': 0.25
};

// Target cumulative credit points for promotion
export const AK_KUMULATIF_TARGET: Record<string, number> = {
  'AHLI UTAMA': 200,
  'AHLI MADYA': 150,
  'AHLI MUDA': 100,
  'AHLI PERTAMA': 50
};

// Estimated basic salary calculation based on grade and years of service
export const getGajiEstimasi = (gol: string, mk: number): number => {
  let base = 2500000;
  if (gol.startsWith('I/')) base = 1560800;
  else if (gol.startsWith('II/')) base = 2022200;
  else if (gol.startsWith('III/')) base = 2579400;
  else if (gol.startsWith('IV/')) base = 3044300;
  
  return base + (mk * 100000);
};
