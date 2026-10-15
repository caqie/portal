/**
 * services/petaJabatanAbkData.ts
 * Data Resmi Peta Jabatan, Formasi Kebutuhan ABK, dan Data Formasi SIMPEG Eselon I
 * Direktorat Jenderal Kekayaan Intelektual (DJKI) Kementerian Hukum RI
 * Total Pegawai: 1.074 Orang (581 PNS, 467 PPPK Penuh Waktu, 26 PPPK Paruh Waktu)
 */

import * as XLSX from 'xlsx';
import { safeJsonToSheet, safeWriteExcel } from '../lib/excelSanitizer';
import { 
  MASTER_JABATAN_PERMENKUMHAM_38_2025, 
  getKelasJabatanPermenkumham38,
  normalizeJobTitle 
} from '../data/anjabAbkConstants';

/**
 * Mencari Kelas Jabatan resmi berdasarkan Permenkumham No. 38 Tahun 2025
 * untuk pemrosesan Peta Jabatan ABK dan Formasi SIMPEG
 */
export const getKelasJabatanForPeta = (namaJabatan: string, eselon?: string, golRuang?: string): string => {
  return getKelasJabatanPermenkumham38(namaJabatan, eselon, golRuang);
};


export interface PetaJabatanAbkRow {
  no: string;
  jabatan: string;
  abk: number | string;
  formasi: number | string;
  existing: number | string;
  pns: number | string;
  pppkPenuh: number | string;
  pppkParuh: number | string;
}

export interface FormasiSimpegRow {
  tahun: number;
  namaJabatan: string;
  formasi: number;
  existing: number;
  kebutuhanFormasi: number;
  keterangan: string;
}

// 1. DATA PETA JABATAN & FORMASI ABK RESMI DJKI (1.074 PEGAWAI)
export const OFFICIAL_PETA_JABATAN_ABK: PetaJabatanAbkRow[] = [
  // 1. Dirjen
  { no: '1', jabatan: 'Direktur Jenderal Kekayaan Intelektual', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 2. Sesditjen
  { no: '2', jabatan: 'Sekretaris Direktorat Jenderal Kekayaan Intelektual', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: 46, formasi: 106, existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: 77, formasi: 241, existing: 7, pns: 7, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS SDM APARATUR MADYA', abk: 13, formasi: 5, existing: 5, pns: 5, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS SDM APARATUR MUDA', abk: 10, formasi: 6, existing: 5, pns: 5, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS SDM APARATUR PERTAMA', abk: 9, formasi: 7, existing: 6, pns: 6, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'DOKTER GIGI MADYA', abk: 2, formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'DOKTER MADYA', abk: 2, formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA HUBUNGAN MASYARAKAT MUDA', abk: 8, formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA HUBUNGAN MASYARAKAT PERTAMA', abk: 8, formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS PENGEMBANGAN PEGAWAI', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENELAAH TEKNIS KEBIJAKAN', abk: 9, formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA DATA KEPEGAWAIAN', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGOLAH DATA DAN INFORMASI', abk: 11, formasi: 0, existing: 5, pns: 5, pppkPenuh: '', pppkParuh: '' },

  // 3. Bagian Program dan Pelaporan
  { no: '3', jabatan: 'Kepala Bagian Program dan Pelaporan', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: 64, formasi: 62, existing: 8, pns: 2, pppkPenuh: 6, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MUDA', abk: 22, formasi: 18, existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN PERTAMA', abk: 5, formasi: 5, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', abk: 21, formasi: 81, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 4, pns: 4, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 4, pns: 3, pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: 14, existing: 3, pns: '', pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: 151, formasi: 9, existing: 8, pns: '', pppkPenuh: 8, pppkParuh: '' },
  { no: '', jabatan: 'PENERJEMAH MADYA', abk: 3, formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENYULUH HUKUM MUDA', abk: 5, formasi: 10, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PERANCANG PERATURAN PERUU MUDA', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER PERTAMA', abk: 55, formasi: 35, existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: 95, formasi: 0, existing: 3, pns: '', pppkPenuh: 2, pppkParuh: 1 },

  // 4. Bagian Keuangan
  { no: '4', jabatan: 'Kepala Bagian Keuangan', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS ANGGARAN MUDA', abk: 2, formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 8, pns: 7, pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS PENGELOLAAN KEUANGAN APBN MADYA', abk: 3, formasi: 2, existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 4, pns: '', pppkPenuh: 4, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 8, pns: '', pppkPenuh: 8, pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KEUANGAN ANGGARAN PENDAPATAN DAN BELANJA NEGARA TERAMPIL', abk: 4, formasi: 4, existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER PERTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PENATA KELOLA PEMERINTAHAN', abk: 6, formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENATA LAYANAN OPERASIONAL', abk: 18, formasi: 0, existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA LAYANAN OPERASIONAL', abk: 9, formasi: 0, existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PENGOLAH DATA DAN INFORMASI', abk: '', formasi: '', existing: 4, pns: 4, pppkPenuh: '', pppkParuh: '' },

  // 5. Bagian Umum
  { no: '5', jabatan: 'Kepala Bagian Umum', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS MUDA', abk: 19, formasi: 14, existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'FASILITATOR PEMERINTAHAN', abk: 2, formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'PENATA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA LAYANAN PENGADAAN', abk: 2, formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGOLAH DATA DAN INFORMASI', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 6. Subbagian TU Pimpinan dan Protokol
  { no: '6', jabatan: 'Kepala Subbagian Tata Usaha Pimpinan dan Protokol', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN PERTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 5, pns: 4, pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 6, pns: '', pppkPenuh: 6, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 17, pns: '', pppkPenuh: 17, pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA MEREK PERTAMA', abk: 107, formasi: 94, existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER PERTAMA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 9, pns: '', pppkPenuh: 8, pppkParuh: 1 },
  { no: '', jabatan: 'PENATA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 1, pppkParuh: 1 },
  { no: '', jabatan: 'PENGADMINISTRASI PERKANTORAN', abk: 7, formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGOLAH DATA DAN INFORMASI', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 7. Subbagian Rumah Tangga
  { no: '7', jabatan: 'Kepala Subbagian Rumah Tangga', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 13, pns: '', pppkPenuh: 13, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 8, pns: '', pppkPenuh: 8, pppkParuh: '' },
  { no: '', jabatan: 'PERAWAT PENYELIA', abk: 4, formasi: 0, existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA LABORATORIUM KESEHATAN PELAKSANA LANJUTAN', abk: '', formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 14, pns: '', pppkPenuh: 6, pppkParuh: 8 },
  { no: '', jabatan: 'PENATA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 3, pns: '', pppkPenuh: '', pppkParuh: 3 },
  { no: '', jabatan: 'PENELAAH TEKNIS KEBIJAKAN', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGADMINISTRASI PERJALANAN DINAS', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },

  // 8. Direktur Hak Cipta dan Desain Industri
  { no: '8', jabatan: 'Direktur Hak Cipta dan Desain Industri', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM MADYA', abk: 20, formasi: 14, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM MUDA', abk: 29, formasi: 24, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MADYA', abk: 16, formasi: 8, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 3, pns: 3, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI UTAMA', abk: 6, formasi: 18, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS MADYA', abk: 10, formasi: 3, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA DESAIN INDUSTRI MADYA', abk: '', formasi: 28, existing: 11, pns: 11, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA DESAIN INDUSTRI MUDA', abk: '', formasi: 33, existing: 8, pns: 8, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER MADYA', abk: 4, formasi: 17, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENATA KELOLA PEMERINTAHAN', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENYUSUN TINDAK LANJUT DAN LAPORAN HASIL PEMERIKSAAN', abk: '', formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 9. Kasubdit Permohonan dan Pelayanan (Hak Cipta)
  { no: '9', jabatan: 'Kepala Subdirektorat Permohonan dan Pelayanan', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MADYA', abk: '', formasi: '', existing: 5, pns: 2, pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MUDA', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI UTAMA', abk: '', formasi: '', existing: 7, pns: 7, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS MADYA', abk: '', formasi: '', existing: 8, pns: 2, pppkPenuh: 6, pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA DESAIN INDUSTRI MADYA', abk: '', formasi: '', existing: 6, pns: '', pppkPenuh: 6, pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA DESAIN INDUSTRI MUDA', abk: '', formasi: '', existing: 9, pns: '', pppkPenuh: 9, pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER MADYA', abk: '', formasi: '', existing: 4, pns: 4, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA DESAIN INDUSTRI MUDA (Teknis)', abk: '', formasi: '', existing: 3, pns: 3, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA DESAIN INDUSTRI PERTAMA', abk: 41, formasi: 26, existing: 26, pns: 23, pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER MADYA (Sistem)', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 4, pns: '', pppkPenuh: 4, pppkParuh: '' },
  { no: '', jabatan: 'PENELAAH TEKNIS KEBIJAKAN', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA HASIL KERJA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA UMUM OPERASIONAL', abk: 4, formasi: 0, existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PENGOLAH DATA DAN INFORMASI', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 10. Kasubbag TU (Hak Cipta)
  { no: '10', jabatan: 'Kepala Subbagian Tata Usaha', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER PELAKSANA', abk: '', formasi: 0, existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 3, pns: '', pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'PENATA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },

  // 11. Direktur Paten, DTLST, dan Rahasia Dagang
  { no: '11', jabatan: 'Direktur Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM MADYA', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM MUDA', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 4, pns: 4, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI UTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA PATEN MADYA', abk: 88, formasi: 120, existing: 50, pns: 50, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA PATEN MUDA', abk: 95, formasi: 150, existing: 17, pns: 17, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA PATEN PERTAMA', abk: 259, formasi: 199, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA PATEN UTAMA', abk: 55, formasi: 75, existing: 26, pns: 26, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 12. Kasubdit Permohonan dan Pelayanan (Paten)
  { no: '12', jabatan: 'Kepala Subdirektorat Permohonan dan Pelayanan', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 10, pns: 10, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 8, pns: 2, pppkPenuh: 6, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 10, pns: '', pppkPenuh: 10, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 36, pns: '', pppkPenuh: 36, pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA MEREK PERTAMA', abk: '', formasi: '', existing: 5, pns: '', pppkPenuh: 5, pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA PATEN MUDA', abk: '', formasi: '', existing: 3, pns: 3, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA PATEN PERTAMA', abk: '', formasi: '', existing: 23, pns: 18, pppkPenuh: 5, pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA PATEN UTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENERJEMAH PERTAMA', abk: 3, formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER PERTAMA', abk: '', formasi: '', existing: 5, pns: '', pppkPenuh: 5, pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 13, pns: '', pppkPenuh: 13, pppkParuh: '' },
  { no: '', jabatan: 'PENATA KELOLA PEMERINTAHAN', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENATA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'PENELAAH TEKNIS KEBIJAKAN', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGADMINISTRASI PERKANTORAN', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA UMUM OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PENGOLAH DATA DAN INFORMASI', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },

  // 13. Kasubdit Fasilitasi Komisi Banding Paten
  { no: '13', jabatan: 'Kepala Subdirektorat Fasilitasi Komisi Banding Paten', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 6, pns: 2, pppkPenuh: 4, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA PATEN MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },

  // 14. Kasubbag TU (Paten)
  { no: '14', jabatan: 'Kepala Subbagian Tata Usaha', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 3, pns: 1, pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 5, pns: '', pppkPenuh: 5, pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER PELAKSANA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 6, pns: '', pppkPenuh: 2, pppkParuh: 4 },
  { no: '', jabatan: 'PENGELOLA UMUM OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: '', pppkParuh: 1 },
  { no: '', jabatan: 'PENGOLAH DATA DAN INFORMASI', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 15. Direktur Merek dan Indikasi Geografis
  { no: '15', jabatan: 'Direktur Merek dan Indikasi Geografis', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 4, pns: 4, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MADYA', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI UTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA MEREK MADYA', abk: 46, formasi: 49, existing: 41, pns: 41, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA MEREK MUDA', abk: 37, formasi: 55, existing: 25, pns: 25, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA MEREK PERTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA MEREK UTAMA', abk: 24, formasi: 37, existing: 15, pns: 15, pppkPenuh: '', pppkParuh: '' },

  // 16. Kasubdit Permohonan dan Pelayanan (Merek)
  { no: '16', jabatan: 'Kepala Subdirektorat Permohonan dan Pelayanan', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 4, pns: 1, pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 3, pns: 3, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 4, pns: '', pppkPenuh: 4, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 3, pns: '', pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA MEREK MADYA', abk: '', formasi: '', existing: 5, pns: 5, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA MEREK MUDA', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA MEREK PERTAMA', abk: '', formasi: '', existing: 54, pns: 3, pppkPenuh: 51, pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 14, pns: '', pppkPenuh: 14, pppkParuh: '' },
  { no: '', jabatan: 'PENATA KELOLA PEMERINTAHAN', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENELAAH TEKNIS KEBIJAKAN', abk: '', formasi: '', existing: 4, pns: 4, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PENGOLAH DATA DAN INFORMASI', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 17. Kasubdit Fasilitasi Komisi Banding Merek
  { no: '17', jabatan: 'Kepala Subdirektorat Fasilitasi Komisi Banding Merek', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 3, pns: '', pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA MEREK PERTAMA', abk: '', formasi: '', existing: 6, pns: '', pppkPenuh: 6, pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 3, pns: '', pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'PENGOLAH DATA DAN INFORMASI', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 18. Kasubbag TU (Merek)
  { no: '18', jabatan: 'Kepala Subbagian Tata Usaha', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 4, pns: '', pppkPenuh: 4, pppkParuh: '' },
  { no: '', jabatan: 'PEMERIKSA MEREK PERTAMA', abk: '', formasi: '', existing: 3, pns: '', pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'PENYULUH HUKUM PERTAMA', abk: 3, formasi: 15, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PENATA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PENELAAH TEKNIS KEBIJAKAN', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA UMUM OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },

  // 19. Direktur Kerja Sama, Pemberdayaan, dan Edukasi
  { no: '19', jabatan: 'Direktur Kerja Sama, Pemberdayaan, dan Edukasi', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 20. Kasubdit Kerja Sama
  { no: '20', jabatan: 'Kepala Subdirektorat Kerja Sama', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 5, pns: '', pppkPenuh: 5, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 8, pns: 8, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 7, pns: 4, pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 3, pns: '', pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'PENERJEMAH MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENERJEMAH MUDA', abk: 3, formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENERJEMAH PERTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },

  // 21. Kasubdit Pemberdayaan dan Edukasi Kekayaan Intelektual
  { no: '21', jabatan: 'Kepala Subdirektorat Pemberdayaan dan Edukasi Kekayaan Intelektual', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 2, pns: 1, pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN PERTAMA', abk: '', formasi: '', existing: 3, pns: 3, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 3, pns: 3, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 3, pns: 1, pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 12, pns: '', pppkPenuh: 12, pppkParuh: '' },
  { no: '', jabatan: 'PENYULUH HUKUM MADYA', abk: 5, formasi: 7, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENYULUH HUKUM MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA HUBUNGAN MASYARAKAT MADYA', abk: 4, formasi: 0, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER PELAKSANA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PUSTAKAWAN MADYA', abk: 3, formasi: 2, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PUSTAKAWAN MUDA', abk: 3, formasi: 2, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'PENATA KELOLA PEMERINTAHAN', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 22. Kasubbag TU (Kerjasama)
  { no: '22', jabatan: 'Kepala Subbagian Tata Usaha', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 2, pns: 1, pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER PELAKSANA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 4, pns: 1, pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },

  // 23. Direktur Teknologi Informasi
  { no: '23', jabatan: 'Direktur Teknologi Informasi', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 4, pns: 4, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER MUDA', abk: 6, formasi: 19, existing: 4, pns: 4, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER PERTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENYUSUN PROGRAM', abk: 0, formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 24. Kasubbag TU (TI)
  { no: '24', jabatan: 'Kepala Subbagian Tata Usaha', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 3, pns: '', pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER PELAKSANA', abk: '', formasi: '', existing: 13, pns: '', pppkPenuh: 13, pppkParuh: '' },
  { no: '', jabatan: 'PRANATA KOMPUTER PERTAMA', abk: '', formasi: '', existing: 30, pns: 11, pppkPenuh: 19, pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS SISTEM APLIKASI DAN JARINGAN KOMPUTER', abk: 0, formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'PENATA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 5, pns: '', pppkPenuh: 5, pppkParuh: '' },
  { no: '', jabatan: 'PENGELOLA LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },

  // 25. Direktur Penegakan Hukum
  { no: '25', jabatan: 'Direktur Penegakan Hukum', abk: '', formasi: '', existing: 0, pns: 0, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },

  // 26. Kasubdit Pencegahan dan Sengketa Alternatif
  { no: '26', jabatan: 'Kepala Subdirektorat Pencegahan dan Sengketa Alternatif', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 4, pns: 4, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 3, pns: '', pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'PENERJEMAH PERTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENYULUH HUKUM MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'DOKUMENTALIS HUKUM', abk: 0, formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 27. Kasubdit Penindakan dan Penyidikan
  { no: '27', jabatan: 'Kepala Subdirektorat Penindakan dan Penyidikan', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 9, pns: 5, pppkPenuh: 4, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MADYA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEBIJAKAN MUDA', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', abk: '', formasi: '', existing: 2, pns: 2, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 6, pns: 3, pppkPenuh: 3, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 7, pns: '', pppkPenuh: 7, pppkParuh: '' },
  { no: '', jabatan: 'PENYULUH HUKUM MUDA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS PERTIMBANGAN HUKUM', abk: 0, formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'DOKUMENTALIS HUKUM', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'PENGADMINISTRASI UMUM', abk: 0, formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },

  // 28. Kasubbag TU (Gakkum)
  { no: '28', jabatan: 'Kepala Subbagian Tata Usaha', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'a) Jabatan Fungsional (sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ANALIS HUKUM PERTAMA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', abk: '', formasi: '', existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PELAKSANA', abk: '', formasi: '', existing: 1, pns: '', pppkPenuh: 1, pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PENYELIA', abk: 9, formasi: 3, existing: 1, pns: 1, pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'ARSIPARIS PERTAMA', abk: '', formasi: '', existing: 2, pns: '', pppkPenuh: 2, pppkParuh: '' },
  { no: '', jabatan: 'b) Jabatan Pelaksana (Sebutkan semua yang eksisting)', abk: '', formasi: '', existing: '', pns: '', pppkPenuh: '', pppkParuh: '' },
  { no: '', jabatan: 'OPERATOR LAYANAN OPERASIONAL', abk: '', formasi: '', existing: 7, pns: '', pppkPenuh: 3, pppkParuh: 4 },

  // GRAND TOTAL BARIS TERAKHIR
  { no: 'TOTAL', jabatan: 'TOTAL SELURUH PEGAWAI DITJEN KEKAYAAN INTELEKTUAL', abk: '', formasi: '', existing: 1074, pns: 581, pppkPenuh: 467, pppkParuh: 26 }
];

// 2. DATA FORMASI SIMPEG TAHUN 2026 (BERDASARKAN ESELON I)
export const FORMASI_SIMPEG_2026: FormasiSimpegRow[] = [
  { tahun: 2026, namaJabatan: 'ANALIS KEBIJAKAN MUDA', formasi: 18, existing: 7, kebutuhanFormasi: 11, keterangan: 'kurang' },
  { tahun: 2026, namaJabatan: 'ARSIPARIS MUDA', formasi: 14, existing: 5, kebutuhanFormasi: 9, keterangan: 'kurang' },
  { tahun: 2026, namaJabatan: 'ARSIPARIS PELAKSANA LANJUTAN', formasi: 9, existing: 0, kebutuhanFormasi: 9, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'PRANATA KEUANGAN ANGGARAN PENDAPATAN DAN BELANJA NEGARA TERAMPIL', formasi: 4, existing: 0, kebutuhanFormasi: 4, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'MANGGALA INFORMATIKA AHLI PERTAMA', formasi: 3, existing: 0, kebutuhanFormasi: 3, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'MANGGALA INFORMATIKA AHLI MUDA', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'PERENCANA PERTAMA', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'PERENCANA MUDA', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'ANALIS PENGELOLAAN KEUANGAN APBN PERTAMA', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'ANALIS PENGELOLAAN KEUANGAN APBN MUDA', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'ANALIS PENGELOLAAN KEUANGAN APBN MADYA', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'ANALIS KEBIJAKAN PERTAMA', formasi: 5, existing: 3, kebutuhanFormasi: 2, keterangan: 'kurang' },
  { tahun: 2026, namaJabatan: 'PENATA LAKSANA BARANG TERAMPIL', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'PRANATA KEUANGAN ANGGARAN PENDAPATAN DAN BELANJA NEGARA MAHIR', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'ARSIPARIS PENYELIA', formasi: 3, existing: 1, kebutuhanFormasi: 2, keterangan: 'kurang' },
  { tahun: 2026, namaJabatan: 'PRANATA KEUANGAN ANGGARAN PENDAPATAN DAN BELANJA NEGARA PENYELIA', formasi: 1, existing: 0, kebutuhanFormasi: 1, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'ANALIS KEBIJAKAN MADYA', formasi: 8, existing: 7, kebutuhanFormasi: 1, keterangan: 'kurang' },
  { tahun: 2026, namaJabatan: 'PENATA LAKSANA BARANG MAHIR', formasi: 1, existing: 0, kebutuhanFormasi: 1, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'PERENCANA MADYA', formasi: 1, existing: 0, kebutuhanFormasi: 1, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'ARSIPARIS MADYA', formasi: 3, existing: 2, kebutuhanFormasi: 1, keterangan: 'kurang' },
  { tahun: 2026, namaJabatan: 'MANGGALA INFORMATIKA AHLI MADYA', formasi: 1, existing: 0, kebutuhanFormasi: 1, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2026, namaJabatan: 'ARSIPARIS PELAKSANA', formasi: 14, existing: 28, kebutuhanFormasi: -14, keterangan: 'lebih' },
  { tahun: 2026, namaJabatan: 'ARSIPARIS PERTAMA', formasi: 9, existing: 92, kebutuhanFormasi: -83, keterangan: 'lebih' },
  { tahun: 2026, namaJabatan: 'PENGELOLA UMUM OPERASIONAL', formasi: 0, existing: 3, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENERJEMAH PERTAMA', formasi: 0, existing: 3, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PRANATA HUBUNGAN MASYARAKAT MADYA', formasi: 0, existing: 1, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENATA KELOLA PEMERINTAHAN', formasi: 0, existing: 4, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'DOKUMENTALIS HUKUM', formasi: 0, existing: 2, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENYUSUN TINDAK LANJUT DAN LAPORAN HASIL PEMERIKSAAN', formasi: 0, existing: 1, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'ANALIS SISTEM APLIKASI DAN JARINGAN KOMPUTER', formasi: 0, existing: 1, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENELAAH TEKNIS KEBIJAKAN', formasi: 0, existing: 9, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENATA LAYANAN OPERASIONAL', formasi: 0, existing: 8, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENERJEMAH MUDA', formasi: 0, existing: 1, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENYUSUN PROGRAM', formasi: 0, existing: 1, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PRANATA KOMPUTER PELAKSANA', formasi: 0, existing: 17, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'ANALIS PERTIMBANGAN HUKUM', formasi: 0, existing: 1, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENGADMINISTRASI UMUM', formasi: 0, existing: 1, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENERJEMAH MADYA', formasi: 0, existing: 1, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'OPERATOR LAYANAN OPERASIONAL', formasi: 0, existing: 51, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENGADMINISTRASI PERKANTORAN', formasi: 0, existing: 1, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENGELOLA LAYANAN OPERASIONAL', formasi: 0, existing: 5, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'PENGOLAH DATA DAN INFORMASI', formasi: 0, existing: 6, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' },
  { tahun: 2026, namaJabatan: 'FASILITATOR PEMERINTAHAN', formasi: 0, existing: 1, kebutuhanFormasi: 0, keterangan: 'jumlah formasi belum di input' }
];

// 3. DATA FORMASI SIMPEG TAHUN 2025 (BERDASARKAN ESELON I)
export const FORMASI_SIMPEG_2025: FormasiSimpegRow[] = [
  { tahun: 2025, namaJabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', formasi: 241, existing: 51, kebutuhanFormasi: 190, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA PATEN PERTAMA', formasi: 199, existing: 24, kebutuhanFormasi: 175, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA PATEN MUDA', formasi: 150, existing: 21, kebutuhanFormasi: 129, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', formasi: 81, existing: 9, kebutuhanFormasi: 72, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA PATEN MADYA', formasi: 120, existing: 50, kebutuhanFormasi: 70, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', formasi: 106, existing: 50, kebutuhanFormasi: 56, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA PATEN UTAMA', formasi: 75, existing: 27, kebutuhanFormasi: 48, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA MEREK MUDA', formasi: 55, existing: 27, kebutuhanFormasi: 28, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA MEREK PERTAMA', formasi: 94, existing: 69, kebutuhanFormasi: 25, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA DESAIN INDUSTRI MUDA', formasi: 33, existing: 11, kebutuhanFormasi: 22, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA MEREK UTAMA', formasi: 37, existing: 15, kebutuhanFormasi: 22, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA DESAIN INDUSTRI UTAMA', formasi: 19, existing: 0, kebutuhanFormasi: 19, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'ANALIS HUKUM PERTAMA', formasi: 62, existing: 44, kebutuhanFormasi: 18, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'ANALIS HUKUM MUDA', formasi: 24, existing: 7, kebutuhanFormasi: 17, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI UTAMA', formasi: 18, existing: 3, kebutuhanFormasi: 15, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PRANATA KOMPUTER MUDA', formasi: 19, existing: 4, kebutuhanFormasi: 15, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA DESAIN INDUSTRI PERTAMA', formasi: 41, existing: 26, kebutuhanFormasi: 15, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PENYULUH HUKUM PERTAMA', formasi: 15, existing: 1, kebutuhanFormasi: 14, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PRANATA KOMPUTER MADYA', formasi: 17, existing: 4, kebutuhanFormasi: 13, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA DESAIN INDUSTRI MADYA', formasi: 28, existing: 15, kebutuhanFormasi: 13, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'ANALIS HUKUM MADYA', formasi: 14, existing: 5, kebutuhanFormasi: 9, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PENYULUH HUKUM MUDA', formasi: 10, existing: 2, kebutuhanFormasi: 8, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PERANCANG PERATURAN PERUUNDANG-UNDANGAN PERTAMA', formasi: 7, existing: 0, kebutuhanFormasi: 7, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'ANALIS SDM APARATUR PERTAMA', formasi: 7, existing: 0, kebutuhanFormasi: 7, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'ANALIS SDM APARATUR MUDA', formasi: 6, existing: 0, kebutuhanFormasi: 6, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'Analis Kerja Sama Ahli Pertama', formasi: 6, existing: 0, kebutuhanFormasi: 6, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'Analis Kerja Sama Ahli Muda', formasi: 6, existing: 0, kebutuhanFormasi: 6, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'ANALIS SDM APARATUR MADYA', formasi: 5, existing: 0, kebutuhanFormasi: 5, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'PENYULUH HUKUM MADYA', formasi: 7, existing: 2, kebutuhanFormasi: 5, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PRANATA SDM APARATUR TERAMPIL', formasi: 3, existing: 0, kebutuhanFormasi: 3, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'PUSTAKAWAN PERTAMA', formasi: 3, existing: 0, kebutuhanFormasi: 3, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'PEMERIKSA MEREK MADYA', formasi: 49, existing: 46, kebutuhanFormasi: 3, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PERANCANG PERATURAN PERUUNDANG-UNDANGAN MUDA', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'ANALIS HUKUM UTAMA', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'PRANATA SDM APARATUR MAHIR', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'PRANATA SDM APARATUR PENYELIA', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'Analis Kerja Sama Ahli Madya', formasi: 2, existing: 0, kebutuhanFormasi: 2, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'Asisten Perpustakaan Penyelia', formasi: 1, existing: 0, kebutuhanFormasi: 1, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'Asisten Perpustakaan Mahir', formasi: 1, existing: 0, kebutuhanFormasi: 1, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'Asisten Perpustakaan Terampil', formasi: 1, existing: 0, kebutuhanFormasi: 1, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'PERANCANG PERATURAN PERUUNDANG-UNDANGAN MADYA', formasi: 1, existing: 0, kebutuhanFormasi: 1, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'PUSTAKAWAN MUDA', formasi: 2, existing: 1, kebutuhanFormasi: 1, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'PUSTAKAWAN MADYA', formasi: 2, existing: 1, kebutuhanFormasi: 1, keterangan: 'kurang' },
  { tahun: 2025, namaJabatan: 'DOKTER MADYA', formasi: 0, existing: 0, kebutuhanFormasi: 0, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'DOKTER GIGI MADYA', formasi: 0, existing: 0, kebutuhanFormasi: 0, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'PERAWAT PENYELIA', formasi: 0, existing: 0, kebutuhanFormasi: 0, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'PRANATA LABORATORIUM KESEHATAN PELAKSANA LANJUTAN', formasi: 0, existing: 0, kebutuhanFormasi: 0, keterangan: 'Belum ada pegawai dengan jabatan ini' },
  { tahun: 2025, namaJabatan: 'PRANATA KOMPUTER PERTAMA', formasi: 35, existing: 36, kebutuhanFormasi: -1, keterangan: 'lebih' }
];

/**
 * Membuat Worksheet Peta Jabatan ABK (Sesuai Halaman 1-7 PDF) dengan integrasi Kelas Jabatan Permenkumham 38/2025
 */
export const buildPetaJabatanAbkSheet = (): XLSX.WorkSheet => {
  const formattedRows = OFFICIAL_PETA_JABATAN_ABK.map(r => ({
    'No': r.no,
    'Jabatan': r.jabatan,
    'Kelas Jabatan (Permenkumham 38/2025)': getKelasJabatanForPeta(r.jabatan),
    'Kebutuhan Pegawai berdasarkan ABK*': r.abk,
    'Formasi*': r.formasi,
    'Existing': r.existing,
    'PNS': r.pns,
    'PPPK (Penuh Waktu)': r.pppkPenuh,
    'PPPK (Paruh Waktu)': r.pppkParuh
  }));

  const ws = safeJsonToSheet(formattedRows);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 8 },  // No
    { wch: 55 }, // Jabatan
    { wch: 18 }, // Kelas Jabatan (Permenkumham 38/2025)
    { wch: 32 }, // Kebutuhan Pegawai berdasarkan ABK*
    { wch: 12 }, // Formasi*
    { wch: 12 }, // Existing
    { wch: 10 }, // PNS
    { wch: 20 }, // PPPK (Penuh Waktu)
    { wch: 20 }  // PPPK (Paruh Waktu)
  ];

  return ws;
};

/**
 * Membuat Worksheet Formasi SIMPEG Eselon I (Sesuai Halaman 8-9 PDF)
 */
export const buildFormasiSimpegSheet = (): XLSX.WorkSheet => {
  const rows: any[] = [];

  // Section 2026
  FORMASI_SIMPEG_2026.forEach(r => {
    rows.push({
      'Tahun': r.tahun,
      'Nama Jabatan': r.namaJabatan,
      'Kelas Jabatan (Permenkumham 38/2025)': getKelasJabatanForPeta(r.namaJabatan),
      'Formasi': r.formasi,
      'Existing': r.existing,
      'Kebutuhan Formasi': r.kebutuhanFormasi,
      'Keterangan': r.keterangan
    });
  });

  // Summary 2026
  rows.push({
    'Tahun': 'TOTAL 2026',
    'Nama Jabatan': 'REKAPITULASI FORMASI SIMPEG 2026',
    'Kelas Jabatan (Permenkumham 38/2025)': '',
    'Formasi': 110,
    'Existing': 263,
    'Kebutuhan Formasi': -35,
    'Keterangan': 'Netto (-35)'
  });

  // Separator
  rows.push({
    'Tahun': '---',
    'Nama Jabatan': '----------------------------------------',
    'Kelas Jabatan (Permenkumham 38/2025)': '---',
    'Formasi': '---',
    'Existing': '---',
    'Kebutuhan Formasi': '---',
    'Keterangan': '---'
  });

  // Section 2025
  FORMASI_SIMPEG_2025.forEach(r => {
    rows.push({
      'Tahun': r.tahun,
      'Nama Jabatan': r.namaJabatan,
      'Kelas Jabatan (Permenkumham 38/2025)': getKelasJabatanForPeta(r.namaJabatan),
      'Formasi': r.formasi,
      'Existing': r.existing,
      'Kebutuhan Formasi': r.kebutuhanFormasi,
      'Keterangan': r.keterangan
    });
  });

  // Summary 2025
  const totalFormasi2025 = FORMASI_SIMPEG_2025.reduce((sum, item) => sum + item.formasi, 0);
  const totalExisting2025 = FORMASI_SIMPEG_2025.reduce((sum, item) => sum + item.existing, 0);
  const totalKebutuhan2025 = FORMASI_SIMPEG_2025.reduce((sum, item) => sum + item.kebutuhanFormasi, 0);

  rows.push({
    'Tahun': 'TOTAL 2025',
    'Nama Jabatan': 'REKAPITULASI FORMASI SIMPEG 2025',
    'Kelas Jabatan (Permenkumham 38/2025)': '',
    'Formasi': totalFormasi2025,
    'Existing': totalExisting2025,
    'Kebutuhan Formasi': totalKebutuhan2025,
    'Keterangan': 'Total Rekap 2025'
  });

  const ws = safeJsonToSheet(rows);

  ws['!cols'] = [
    { wch: 12 }, // Tahun
    { wch: 55 }, // Nama Jabatan
    { wch: 18 }, // Kelas Jabatan (Permenkumham 38/2025)
    { wch: 12 }, // Formasi
    { wch: 12 }, // Existing
    { wch: 18 }, // Kebutuhan Formasi
    { wch: 38 }  // Keterangan
  ];

  return ws;
};

/**
 * Membuat Worksheet Standar Kelas Jabatan Permenkumham No. 38 Tahun 2025
 */
export const buildMasterKelasJabatanSheet = (): XLSX.WorkSheet => {
  const rows = MASTER_JABATAN_PERMENKUMHAM_38_2025.map((m, idx) => ({
    'No': idx + 1,
    'Kode Jabatan (SIASN)': m.code,
    'Nomenklatur Jabatan': m.label,
    'Kelas Jabatan (Permenkumham 38/2025)': m.class,
    'Kategori Jabatan': m.type,
    'Kualifikasi Pendidikan Minimal': m.minEducation || '-',
    'Rekomendasi Unit Kerja': m.unitRecommendation || '-'
  }));

  const ws = safeJsonToSheet(rows);

  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // Kode Jabatan
    { wch: 55 }, // Nomenklatur Jabatan
    { wch: 16 }, // Kelas Jabatan
    { wch: 18 }, // Kategori
    { wch: 45 }, // Kualifikasi Pendidikan
    { wch: 35 }  // Rekomendasi Unit
  ];

  return ws;
};

/**
 * Ekspor file Excel Khusus: "Peta_Jabatan_ABK_dan_Formasi_SIMPEG_DJKI.xlsx"
 */
export const downloadOfficialPetaJabatanExcel = () => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Peta Jabatan ABK (Hal 1-7)
  const wsAbk = buildPetaJabatanAbkSheet();
  XLSX.utils.book_append_sheet(wb, wsAbk, "Peta Jabatan ABK (Resmi)");

  // Sheet 2: Formasi SIMPEG (Hal 8-9)
  const wsSimpeg = buildFormasiSimpegSheet();
  XLSX.utils.book_append_sheet(wb, wsSimpeg, "Formasi SIMPEG Eselon I");

  // Sheet 3: Standar Kelas Jabatan Permenkumham No. 38 Tahun 2025
  const wsMaster = buildMasterKelasJabatanSheet();
  XLSX.utils.book_append_sheet(wb, wsMaster, "Kelas Jabatan Permenkumham 38");

  safeWriteExcel(wb, `Peta_Jabatan_ABK_dan_Formasi_SIMPEG_DJKI_${Date.now()}.xlsx`);
};
