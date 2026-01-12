
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
  'Direktorat Paten, DTLST dan Rahasia Dagang',
  'Direktorat Merek dan Indikasi Geografis',
  'Direktorat Kerjasama dan Pemberdayaan Kekayaan Intelektual',
  'Direktorat Teknologi Informasi Kekayaan Intelektual',
  'Direktorat Penyidikan dan Penyelesaian Sengketa'
];

// Daftar Pendidikan Riil sesuai Spreadsheet
export const PENDIDIKAN_LIST = [
  "SD-SD/SEDERAJAT", "SLTA", "SLTA-IPA", "SLTA-SLTA/SMA SEDERAJAT",
  "DIII", "DIII / Teknik Informatika", "DIII-Administrasi Niaga", "DIII-D-III PENYIARAN", "DIII-DIII / Administrasi Bisnis", "DIII-PERHOTELAN", "DIII-Perkebunan", "DIII-Desain Grafis Konsentrasi Multimedia", "DIII-DIII / Akuntansi", "DIII-MANAJEMEN ADMINISTRASI", "DIII-MANAJEMEN TRANSPORTASI UDARA", "DIII-Komputerisasi Akuntansi", "DIII-Manajemen Informatika", "DIII-Penerbitan Jurnalistik", "DIII-TEKNIK INFORMATIKA", "DIII-Teknik Radiodiagnostik dan Radioterapi", "DIII-D-III SEKRETARIAT", "DIII-Perpajakan", "DIII-TEKNIK RADIODIAGNOSTIK", "DIII-Kesehatan Lingkungan", "DIII-Teknik Elektronika", "DIII-Ilmu Kebidanan", "DIII-KEBIDANAN", "DIII-Penerbitan ( Jurnalistik )", "DIII-Teknik Mekanika", "DIII-Teknik Mesin", "DIII-D-III SEMUA JURUSAN", "DIII-Broadcasting (Penyiaran)", "DIII-Manajemen Informatika dan Komputer", "DIII-Penyiaran Broadcasting", "DIII-Sistem Informasi", "DIII-ADMINISTRASI", "DIII-Perdagangan Internasional", "DIII-Transportasi", "DIII-Akuntansi", "DIII-Akuntansi Perkantoran", "DIII-Teknik Listrik", "DIII-Desain dan Teknologi Sepatu", "DIII-TEKNIK PERTAMBANGAN", "Akuntansi-DIII / Akuntansi", "Akuntansi-Akuntansi", "Akuntansi-D-III AKUNTANSI", "Manajemen Informatika-DIII / Manajemen Informatika", "Kebidanan-DIII / Kebidanan", "Administrasi Bisnis-DIII / Administrasi Bisnis", "Komputerisasi Akuntansi-DIII / Komputerisasi Akuntansi",
  "DIV", "D IV-Akuntansi Manajemen Pemerintahan", "D IV-Kesehatan",
  "S1", "S1-Ilmu dan Teknologi Kelautan", "S1-MANAJEMEN INFORMATIKA", "S1-Pendidikan Bahasa Inggris", "S1-S1 / Manajemen", "S1-Teknologi Industri Pertanian", "S1-Akuntansi", "S1-TEKNOLOGI INDUSTRI - TEKNIK ELEKTRO", "S1-DESAIN KOMUNIKASI V", "S1-Industri", "S1-Manajemen Informasi Kesehatan", "S1-MANAJEMEN PERHOTELAN PARIWISATA", "S1-Manajemen Sumberdaya Perairan", "S1-S-1 HUBUNGAN INTERNASIONAL", "S1-S-1 SISTEM INFORMASI", "S1-S1 / Teknik elektro", "S1-Administrasi Publik", "S1-Elektro", "S1-HUKUM", "S1-MANAJEMEN, FAKULTAS EKONOMI", "S1-MESIN", "S1-Perhotelan", "S1-S-1 TEKNIK PERTAMBANGAN", "S1-S1 / Hukum Pidana", "S1-S1 / Sains", "S1-Sarjana Komputer", "S1-SARJANA MANAJEMEN", "S1-Sastra Inggris", "S1-Teknik Mesin", "S1-Ekonomi Pembangunan", "S1-Bahasa dan Sastra Arab", "S1-Ilmu Kelautan", "S1-Ilmu Komunikasi (Broadcasting)", "S1-Komunikasi dan Penyiaran Islam", "S1-Manajemen Dakwah", "S1-Pendidikan Pancasila Dan Kewarganegaraan", "S1-Pendidikan Teknik Informatika dan Komputer", "S1-S-1 TEKNIK INFORMATIKA", "S1-S-1 TEKNOLOGI INFORMASI", "S1-S1 / Hukum", "S1-Sistem Komputer", "S1-Teknik Industri", "S1-Administrasi Bisnis", "S1-AGROEKOTEKNOLOGI", "S1-Ilmu Administrasi Negara", "S1-Ilmu Lingkungan", "S1-Konservasi Sumberdaya Hutan dan Ekowisata", "S1-Pendidikan Manajemen Perkantoran", "S1-S-1 Hukum", "S1-S1 / Pertanian", "S1-SASTRA", "S1-TEKNIK KOMPUTER", "S1-BIOLOGI", "S1-Pendidikan Guru Sekolah Dasar", "S1-Psikologi", "S1-S-1 TEKNIK KOMPUTER", "S1-S-1 TEKNIK SIPIL", "S1-SAINS", "S1-SENI RUPA MURNI", "S1-Teknik Informatika", "S1-Desain Produk", "S1-DIV Teknologi Perbenihan", "S1-Ekonomi", "S1-Manajemen Logistik & Material", "S1-Pendidikan Matematika", "S1-S-1 INFORMATIKA", "S1-S-1 TEKNIK KIMIA", "S1-S1 / Akuntansi", "S1-Sarjana Ilmu Hukum", "S1-FISIKA", "S1-Informatika", "S1-Kesehatan Masyarakat", "S1-Manajemen Perhotelan", "S1-MIPA STATISTIK", "S1-S-1 TEKNIK INDUSTRI", "S1-S1 / Ekonomi", "S1-S1 / Teknik Industri", "S1-TADRIS MATEMATIKA", "S1-Agroteknologi", "S1-Aqidah dan Filsafat Islam", "S1-Arsitektur Lanskap", "S1-DESAIN", "S1-DOKTER", "S1-JINAYAH SIYASAH", "S1-PARIWISATA", "S1-Pendidikan Tata Niaga", "S1-S-1 FARMASI", "S1-S1 / Ilmu Hukum", "S1-S1 / Sosial", "S1-Teknik Kimia", "S1-Al-Ahwal Al-Syakhshiyah", "S1-Budidaya Perairan", "S1-Desain Komunikasi Visual", "S1-S-1", "S1-S-1 DESAIN INTERIOR", "S1-S-1 DESAIN KOMUNIKASI VISUAL", "S1-S-1 MANAJEMEN", "S1-S1 SASTRA INGGRIS", "S1-S-1 TEKNIK ELEKTRO", "S1-S1 / Administrasi Negara", "S1-S1 / Bahasa dan Sastra Inggris", "S1-Sistem Informaso", "S1-Administrasi Bisnis Otomotif", "S1-FARMASI", "S1-Ilmu Administrasi", "S1-Ilmu Administrasi Bisnis", "S1-Kebidanan", "S1-MANAJEMEN PENDIDIKAN ISLAM", "S1-PENDIDIKAN AKUNTANSI", "S1-Pendidikan Tata Busana", "S1-S-1 TEKNIK DIRGANTARA", "S1-Adne", "S1-Arkeologi", "S1-Ilmu Hukum", "S1-PEMULIAAN TANAMAN", "S1-S-1 SEMUA JURUSAN", "S1-TEKNIK SIPIL", "S1-Teknologi dan Manajemen Perikanan Budidaya", "S1-TEKNOLOGI HASIL PERIKANAN", "S1-Ekonomi Islam", "S1-Ilmu pemerintahan", "S1-Jurnalistik", "S1-Kehutanan", "S1-Pendidikan Biologi", "S1-Pendidikan Ekonomi", "S1-S-1 REKAYASA HAYATI", "S1-S1 / Sistem Informasi", "S1-Sarjana Hukum", "S1-SENI RUPA", "S1-Sistem Informasi", "S1-BIMBINGAN KONSELING ISLAM", "S1-Ilmu Hubungan Internasional", "S1-S-1 ILMU INFORMATIKA", "S1-S-1 TEKNIK PERMINYAKAN", "S1-S1-", "S1-S1 / Hukum Perdata", "S1-S1 / Teknik Geofisika", "S1-Sastra Jepang", "S1-Sastra Jerman", "S1-Teknik Indormatika", "S1-Teknik Pertanian", "S1-TEKNOLOGI PERTANIAN", "S1-Administrasi Pendidikan", "S1-Agribisnis", "S1-Akuntansi Fakultas Ekonomi", "S1-BIMBINGAN DAN KONSELING", "S1-Ilmu Komunikasi", "S1-Kewirausahaan", "S1-KIMIA", "S1-Manajemen Produksi Siaran", "S1-S1 / Desain", "S1-S-1 SENI RUPA", "S1-S1 / Teknik", "S1-Sarjana Farmasi", "S1-SASTRA PRANCIS", "S1-TEKNIK", "S1-Teknik elektro", "S1-Terapan Administrasi Bisnis", "S1-TERAPI WICARA DAN BAHASA", "S1-ADM. NEGARA", "S1-Hubungan Internasional", "S1-Manajemen", "S1-MIPA KIMIA", "S1-S-1 TEKNIK MESIN", "S1-S1 / Ilmu Komputer", "S1-Seni Musik", "Sistem Informasi-S1 / Sistem Informasi", "Sistem Informasi-Sistem Informasi", "Ekonomi-S1 / Ekonomi", "Administrasi Negara-S1 / Admninistrasi Negara", "Ilmu Pemerintahan-S1 / Ilmu Pemerintahan", "Sosial-S1 / Sosial", "Teknik Informatika-S1 / Teknik Informatika", "Teknik Informatika-S1 / Teknik Elektro", "Pendidikan-S1 / Pendidikan", "Peternakan-S1 / Peternakan", "Ilmu Komputer-S1 / Ilmu Komputer", "Sains-S1 / Teknik Industri", "Farmasi-S1 / Farmasi", "Akuntansi-S1 / Akuntansi", "Manajemen-S1 / Manajemen", "Psikologi-S1 / Psikologi", "Ekonomi Manajemen-S1 / Ekonomi Manajemen", "Ilmu Politik-S1 / Ilmu Politik", "Teknik Mesin-S1 / Teknik Mesin", "Bahasa dan Sastra Inggris-S1 / Bahasa dan Sastra Inggris", "Ekonomi Akuntansi-S1 / Ekonomi Akuntansi", "Ilmu Komunikasi-S1 / Ilmu Komunikasi", "Hukum-S1 / Hukum", "Ilmu Administrasi Publik-S1 / Ilmu Administrasi Publik", "S2-Administrasi Pembangunan Negara", "S2-FARMASI", "S2-Kriminologi", "S2-MAGISTER ILMU EKONOMI", "S2-MANAJEMEN", "S2-MANAJEMEN INDUSTRI", "S2-S2 / Magister Ilmu Administrasi", "S2-S2 / Magister Manajemen", "S2-TEKNIK INDUSTRI", "S2-DESAIN PRODUK", "S2-Hukum & Kehidupan Kenegaraan", "S2-KAJIAN KETAHANAN NASIONAL", "S2-MAGISTER HUKUM BISNIS", "S2-MASTER OF LAWS", "S2-TEKNIK KIMIA", "S2-HUKUM", "S2-PENDIDIKAN", "S2-Pendidikan Bahasa Inggris", "S2-HUKUM TATA NEGARA", "S2-Ilmu Administrasi", "S2-TEKNOLOGI INFORMASI", "S2-Perencanaan Strategik", "S2-Psikologi", "S2-S2 / Magister Hukum", "S2-ILMU HUKUM", "S2-MAGISTER MANAJEMEN", "S2-MASTER OF SCIENCE IN COMPUTER SCIENCE", "S2-Teknik Sipil", "S2-ADMINISTRASI PENDIDIKAN", "S2-ketahanan nasional", "S2-MANAJEMEN PEMASARAN", "S2-MANAJEMEN SDM", "S2-MANAJEMEN STRATEGIK", "S2-Seni Rupa dan Desain", "S2-Magister Ilmu Hukum", "S2-S2 / Magister Manajemen Sistem Informasi", "S2-SPESIALISASI NOTARIAT", "S2-MAGISTER HUKUM", "S2-Magister Teknik", "S2-S2 / Magister Sains", "S2-S2 / Magister Teknik", "S2-Hukum Bisnis dan Kenegaraan", "S2-S2 / Master of Science", "S2-HUKUM KETATANEGARAAN", "S2-Intellectual & Industrial Property Law", "S2-MAGISTER SAINS", "S2-S2", "S2-apoteker", "S2-M. INTELECTUAL PROP.", "S2-MASTER BUSINESS ADMINISTRATION", "S2-HUKUM INTERNASIONAL", "S2-MAGISTER INFORMATIKA", "S2-MAGISTER KENOTARIATAN", "S2-master hukum", "S2-TEKNIK ELEKTRO", "S2-ADMINISTRASI PUBLIK", "S2-Hukum Kesehatan", "S2-Magister Kajian Ketahanan Nasional", "S2-Magister Perencanaan Wilayah dan Kota", "S2-S2 / Manajemen", "S2-TEKNIK MESIN", "S2-HUKUM KEBIJAKAN PUBLIK", "S2-Magister Ilmu Komunikasi", "S2-MAGISTER TERAPAN ADMINISTRASI", "S2-RENSTRA", "S2-Teknik", "Magister Hukum-S2 / Magister Hukum", "Magister Hukum-S2 / MASTER OF INTELLECTUAL PROPERTY", "Magister Hukum-Magister Hukum", "Magister Hukum-S2 / Hukum", "Magister Manajemen-S2 / Magister Manajemen", "Magister Manajemen-S2 / Manajemen", "Magister Administrasi Publik-S2 / Magister Administrasi Publik", "Magister Administrasi Publik-S2 / Master Administrasi Publik", "Magister Sains-Magister Sains", "Magister Sains-S2 / Magister Sains", "Magister Akuntansi-S2 / Magister Akuntansi", "Magister Teknologi Informasi-S2 / Magister Teknologi Informasi", "Magister Agama-S2 / Magister Agama", "Master of Laws-S2 / Master of Laws", "Master of Science-S2 / Master of Science", "Apoteker-S2 / Apoteker", "Magister Kenotariatan-S2 / Magister Kenotariatan", "Magister Ilmu Administrasi-S2 / Magister Ilmu Administrasi", "Magister Ilmu Administrasi-S2 / Magister Ilmu Administrasi Negara", "Magister Ilmu Manajemen-S2 / Magister Ilmu Manajemen", "Magister Kajian Ketahanan Nasional-S2 / Magister Kajian Ketahanan Nasional", "Magister Ilmu Ekonomi-S2 / Magister Ilmu Ekonomi", "Magister Ilmu Komunikasi-S2 / Magister Ilmu Komunikasi", "Magister Ilmu Komunikasi-S2 / Magister Komunikasi", "S3-EKONOMI DAN BISNIS", "S3-Ilmu Hukum", "S3-HUKUM", "S3-S3 / Doktor", "Doktor-S3 / Doktor", "Doktor-S3 / Doktor Ilmu Hukum"
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
