/**
 * data/anjabAbkConstants.ts
 * Master Data Jabatan & Kelas Jabatan sesuai Permenkumham No. 38 Tahun 2025
 * serta Contoh Dokumen Resmi Analisis Jabatan (ANJAB) dan Analisis Beban Kerja (ABK)
 * Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum RI
 */

export interface MasterJabatanItem {
  label: string;
  code: string;
  class: string;
  type: 'JPT' | 'ADM' | 'PENGAWAS' | 'JF' | 'PELAKSANA';
  minEducation: string;
  unitRecommendation?: string;
}

// 1. MASTER JABATAN & KELAS JABATAN RESMI SESUAI PERMENKUMHAM NO. 38 TAHUN 2025
export const MASTER_JABATAN_PERMENKUMHAM_38_2025: MasterJabatanItem[] = [
  // A. JABATAN PIMPINAN TINGGI (JPT) & PIMPINAN UNIT DJKI
  { label: "DIREKTUR JENDERAL KEKAYAAN INTELEKTUAL", code: "1.01.01", class: "17", type: "JPT", minEducation: "S-2 / S-3 Hukum / Manajemen / Kebijakan Publik", unitRecommendation: "Sekretariat Direktorat Jenderal Kekayaan Intelektual" },
  { label: "SEKRETARIS DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL", code: "1.02.01", class: "16", type: "JPT", minEducation: "S-2 / S-3 Hukum / Manajemen / Kebijakan Publik", unitRecommendation: "Sekretariat Direktorat Jenderal Kekayaan Intelektual" },
  { label: "DIREKTUR HAK CIPTA DAN DESAIN INDUSTRI", code: "1.01.02", class: "15", type: "JPT", minEducation: "S-1 / S-2 Hukum / Kebijakan Publik / Desain / Manajemen", unitRecommendation: "Direktorat Hak Cipta dan Desain Industri" },
  { label: "DIREKTUR PATEN, DESAIN TATA LETAK SIRKUIT TERPADU, DAN RAHASIA DAGANG", code: "1.01.03", class: "15", type: "JPT", minEducation: "S-1 / S-2 Teknik / MIPA / Hukum / Manajemen", unitRecommendation: "Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang" },
  { label: "DIREKTUR MEREK DAN INDIKASI GEOGRAFIS", code: "1.01.04", class: "15", type: "JPT", minEducation: "S-1/D-IV Hukum / Manajemen / Administrasi Negara / Kebijakan Publik", unitRecommendation: "Direktorat Merek dan Indikasi Geografis" },
  { label: "DIREKTUR KERJA SAMA, PEMBERDAYAAN, DAN EDUKASI", code: "1.01.05", class: "15", type: "JPT", minEducation: "S-1 / S-2 Hubungan Internasional / Komunikasi / Hukum / Manajemen", unitRecommendation: "Direktorat Kerja Sama, Pemberdayaan, dan Edukasi" },
  { label: "DIREKTUR TEKNOLOGI INFORMASI", code: "1.01.06", class: "15", type: "JPT", minEducation: "S-1 / S-2 Teknik Informatika / Sistem Informasi / Ilmu Komputer", unitRecommendation: "Direktorat Teknologi Informasi Kekayaan Intelektual" },
  { label: "DIREKTUR PENEGAKAN HUKUM", code: "1.01.07", class: "15", type: "JPT", minEducation: "S-1 / S-2 Ilmu Hukum / Kriminologi / Manajemen Keamanan", unitRecommendation: "Direktorat Penegakan Hukum" },

  // B. JABATAN ADMINISTRATOR (ESELON III) - KELAS 13
  { label: "KEPALA BAGIAN PROGRAM DAN PELAPORAN", code: "1.03.01", class: "13", type: "ADM", minEducation: "S-1 Perencanaan / Manajemen / Ekonomi / Hukum", unitRecommendation: "Sekretariat Direktorat Jenderal Kekayaan Intelektual" },
  { label: "KEPALA BAGIAN KEUANGAN", code: "1.03.02", class: "13", type: "ADM", minEducation: "S-1 Akuntansi / Manajemen Keuangan / Ekonomi", unitRecommendation: "Sekretariat Direktorat Jenderal Kekayaan Intelektual" },
  { label: "KEPALA BAGIAN UMUM", code: "1.03.03", class: "13", type: "ADM", minEducation: "S-1 Manajemen / Administrasi / Hukum / Semua Jurusan", unitRecommendation: "Sekretariat Direktorat Jenderal Kekayaan Intelektual" },
  { label: "KEPALA BAGIAN TATA USAHA", code: "1.03.04", class: "13", type: "ADM", minEducation: "S-1 Administrasi Negara / Manajemen / Hukum", unitRecommendation: "Direktorat Terkait" },
  { label: "KEPALA SUBDIREKTORAT PERMOHONAN DAN PELAYANAN", code: "1.04.01", class: "13", type: "ADM", minEducation: "S-1 Hukum / Manajemen / Administrasi", unitRecommendation: "Direktorat Terkait" },
  { label: "KEPALA SUBDIREKTORAT FASILITASI KOMISI BANDING PATEN", code: "1.04.02", class: "13", type: "ADM", minEducation: "S-1 Hukum / Teknik / Terkait", unitRecommendation: "Direktorat Paten" },
  { label: "KEPALA SUBDIREKTORAT FASILITASI KOMISI BANDING MEREK", code: "1.04.03", class: "13", type: "ADM", minEducation: "S-1 Hukum / Manajemen / Terkait", unitRecommendation: "Direktorat Merek" },
  { label: "KEPALA SUBDIREKTORAT KERJA SAMA", code: "1.04.04", class: "13", type: "ADM", minEducation: "S-1 Hubungan Internasional / Hukum / Terkait", unitRecommendation: "Direktorat Kerjasama" },
  { label: "KEPALA SUBDIREKTORAT PEMBERDAYAAN DAN EDUKASI KEKAYAAN INTELEKTUAL", code: "1.04.05", class: "13", type: "ADM", minEducation: "S-1 Komunikasi / Hukum / Manajemen", unitRecommendation: "Direktorat Kerjasama" },
  { label: "KEPALA SUBDIREKTORAT PENCEGAHAN DAN SENGKETA ALTERNATIF", code: "1.04.06", class: "13", type: "ADM", minEducation: "S-1 Hukum", unitRecommendation: "Direktorat Penegakan Hukum" },
  { label: "KEPALA SUBDIREKTORAT PENINDAKAN DAN PENYIDIKAN", code: "1.04.07", class: "13", type: "ADM", minEducation: "S-1 Hukum", unitRecommendation: "Direktorat Penegakan Hukum" },
  { label: "KEPALA SUBDIREKTORAT", code: "1.04.08", class: "13", type: "ADM", minEducation: "S-1 Sesuai Bidang Tugas", unitRecommendation: "Direktorat Terkait" },

  // C. JABATAN PENGAWAS (ESELON IV) - KELAS 10
  { label: "KEPALA SUBBAGIAN TATA USAHA PIMPINAN DAN PROTOKOL", code: "1.05.01", class: "10", type: "PENGAWAS", minEducation: "S-1 Administrasi / Komunikasi / Manajemen", unitRecommendation: "Sekretariat Direktorat Jenderal Kekayaan Intelektual" },
  { label: "KEPALA SUBBAGIAN RUMAH TANGGA", code: "1.05.02", class: "10", type: "PENGAWAS", minEducation: "S-1 Manajemen / Teknik / Semua Jurusan", unitRecommendation: "Sekretariat Direktorat Jenderal Kekayaan Intelektual" },
  { label: "KEPALA SUBBAGIAN TATA USAHA", code: "1.05.03", class: "10", type: "PENGAWAS", minEducation: "S-1 Administrasi / Manajemen / Hukum / Semua Jurusan", unitRecommendation: "Direktorat Terkait" },
  { label: "KEPALA SEKSI", code: "1.05.04", class: "10", type: "PENGAWAS", minEducation: "S-1 Sesuai Bidang Tugas", unitRecommendation: "Direktorat Terkait" },

  // D. JABATAN FUNGSIONAL (JF) - KELAS JABATAN RESMI PERMEN 38 TAHUN 2025
  // 1. PEMERIKSA PATEN
  { label: "PEMERIKSA PATEN AHLI PERTAMA", code: "2.01.01", class: "8", type: "JF", minEducation: "S-1 Teknik / MIPA / Farmasi / Ilmu Terkait" },
  { label: "PEMERIKSA PATEN AHLI MUDA", code: "2.01.02", class: "9", type: "JF", minEducation: "S-1 Teknik / MIPA / Farmasi / Ilmu Terkait" },
  { label: "PEMERIKSA PATEN AHLI MADYA", code: "2.01.03", class: "11", type: "JF", minEducation: "S-1 Teknik / MIPA / Farmasi / Ilmu Terkait" },
  { label: "PEMERIKSA PATEN AHLI UTAMA", code: "2.01.04", class: "13", type: "JF", minEducation: "S-1 Teknik / MIPA / Farmasi / Ilmu Terkait" },

  // 2. PEMERIKSA MEREK
  { label: "PEMERIKSA MEREK AHLI PERTAMA", code: "2.02.01", class: "8", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Desain / Ilmu Terkait" },
  { label: "PEMERIKSA MEREK AHLI MUDA", code: "2.02.02", class: "9", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Desain / Ilmu Terkait" },
  { label: "PEMERIKSA MEREK AHLI MADYA", code: "2.02.03", class: "11", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Desain / Ilmu Terkait" },
  { label: "PEMERIKSA MEREK AHLI UTAMA", code: "2.02.04", class: "13", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Desain / Ilmu Terkait" },

  // 3. PEMERIKSA DESAIN INDUSTRI
  { label: "PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA", code: "2.03.01", class: "8", type: "JF", minEducation: "S-1 Desain Produk / Seni Rupa / Teknik" },
  { label: "PEMERIKSA DESAIN INDUSTRI AHLI MUDA", code: "2.03.02", class: "9", type: "JF", minEducation: "S-1 Desain Produk / Seni Rupa / Teknik" },
  { label: "PEMERIKSA DESAIN INDUSTRI AHLI MADYA", code: "2.03.03", class: "11", type: "JF", minEducation: "S-1 Desain Produk / Seni Rupa / Teknik" },
  { label: "PEMERIKSA DESAIN INDUSTRI AHLI UTAMA", code: "2.03.04", class: "13", type: "JF", minEducation: "S-1 Desain Produk / Seni Rupa / Teknik" },

  // 4. ANALIS KEKAYAAN INTELEKTUAL
  { label: "ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA", code: "2.04.01", class: "8", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Sosial / Manajemen" },
  { label: "ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA", code: "2.04.02", class: "9", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Sosial / Manajemen" },
  { label: "ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA", code: "2.04.03", class: "11", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Sosial / Manajemen" },
  { label: "ANALIS KEKAYAAN INTELEKTUAL AHLI UTAMA", code: "2.04.04", class: "13", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Sosial / Manajemen" },

  // 5. PERANCANG PERATURAN PERUNDANG-UNDANGAN
  { label: "PERANCANG PERATURAN PERUNDANG-UNDANGAN AHLI PERTAMA", code: "2.05.01", class: "8", type: "JF", minEducation: "S-1 Hukum" },
  { label: "PERANCANG PERATURAN PERUNDANG-UNDANGAN AHLI MUDA", code: "2.05.02", class: "10", type: "JF", minEducation: "S-1 Hukum" },
  { label: "PERANCANG PERATURAN PERUNDANG-UNDANGAN AHLI MADYA", code: "2.05.03", class: "12", type: "JF", minEducation: "S-1 Hukum" },
  { label: "PERANCANG PERATURAN PERUNDANG-UNDANGAN AHLI UTAMA", code: "2.05.04", class: "14", type: "JF", minEducation: "S-1 Hukum" },

  // 6. ANALIS HUKUM
  { label: "ANALIS HUKUM AHLI PERTAMA", code: "2.06.01", class: "8", type: "JF", minEducation: "S-1 Hukum" },
  { label: "ANALIS HUKUM AHLI MUDA", code: "2.06.02", class: "9", type: "JF", minEducation: "S-1 Hukum" },
  { label: "ANALIS HUKUM AHLI MADYA", code: "2.06.03", class: "11", type: "JF", minEducation: "S-1 Hukum" },
  { label: "ANALIS HUKUM AHLI UTAMA", code: "2.06.04", class: "13", type: "JF", minEducation: "S-1 Hukum" },

  // 7. PENYULUH HUKUM
  { label: "PENYULUH HUKUM AHLI PERTAMA", code: "2.07.01", class: "8", type: "JF", minEducation: "S-1 Hukum" },
  { label: "PENYULUH HUKUM AHLI MUDA", code: "2.07.02", class: "9", type: "JF", minEducation: "S-1 Hukum" },
  { label: "PENYULUH HUKUM AHLI MADYA", code: "2.07.03", class: "11", type: "JF", minEducation: "S-1 Hukum" },
  { label: "PENYULUH HUKUM AHLI UTAMA", code: "2.07.04", class: "13", type: "JF", minEducation: "S-1 Hukum" },

  // 8. PRANATA KOMPUTER
  { label: "PRANATA KOMPUTER TERAMPIL", code: "2.08.01", class: "6", type: "JF", minEducation: "D-III Teknik Informatika / Sistem Informasi" },
  { label: "PRANATA KOMPUTER MAHIR", code: "2.08.02", class: "7", type: "JF", minEducation: "D-III Teknik Informatika / Sistem Informasi" },
  { label: "PRANATA KOMPUTER PENYELIA", code: "2.08.03", class: "8", type: "JF", minEducation: "D-III Teknik Informatika / Sistem Informasi" },
  { label: "PRANATA KOMPUTER AHLI PERTAMA", code: "2.08.04", class: "8", type: "JF", minEducation: "S-1 Teknik Informatika / Sistem Informasi / Ilmu Komputer" },
  { label: "PRANATA KOMPUTER AHLI MUDA", code: "2.08.05", class: "9", type: "JF", minEducation: "S-1 Teknik Informatika / Sistem Informasi / Ilmu Komputer" },
  { label: "PRANATA KOMPUTER AHLI MADYA", code: "2.08.06", class: "11", type: "JF", minEducation: "S-1 Teknik Informatika / Sistem Informasi / Ilmu Komputer" },

  // 9. ARSIPARIS
  { label: "ARSIPARIS TERAMPIL", code: "2.09.01", class: "6", type: "JF", minEducation: "D-III Kearsipan / Bidang Terkait" },
  { label: "ARSIPARIS MAHIR", code: "2.09.02", class: "7", type: "JF", minEducation: "D-III Kearsipan / Bidang Terkait" },
  { label: "ARSIPARIS PENYELIA", code: "2.09.03", class: "8", type: "JF", minEducation: "D-III Kearsipan / Bidang Terkait" },
  { label: "ARSIPARIS AHLI PERTAMA", code: "2.09.04", class: "8", type: "JF", minEducation: "S-1 Kearsipan / Ilmu Informasi / Perpustakaan" },
  { label: "ARSIPARIS AHLI MUDA", code: "2.09.05", class: "9", type: "JF", minEducation: "S-1 Kearsipan / Ilmu Informasi / Perpustakaan" },
  { label: "ARSIPARIS AHLI MADYA", code: "2.09.06", class: "11", type: "JF", minEducation: "S-1 Kearsipan / Ilmu Informasi / Perpustakaan" },

  // 10. ANALIS SDM APARATUR & PRANATA SDM APARATUR
  { label: "PRANATA SDM APARATUR TERAMPIL", code: "2.10.01", class: "6", type: "JF", minEducation: "D-III Manajemen / Kepegawaian / Administrasi" },
  { label: "PRANATA SDM APARATUR MAHIR", code: "2.10.02", class: "7", type: "JF", minEducation: "D-III Manajemen / Kepegawaian / Administrasi" },
  { label: "PRANATA SDM APARATUR PENYELIA", code: "2.10.03", class: "8", type: "JF", minEducation: "D-III Manajemen / Kepegawaian / Administrasi" },
  { label: "ANALIS SDM APARATUR AHLI PERTAMA", code: "2.10.04", class: "8", type: "JF", minEducation: "S-1 Hukum / Administrasi Negara / Manajemen SDM" },
  { label: "ANALIS SDM APARATUR AHLI MUDA", code: "2.10.05", class: "10", type: "JF", minEducation: "S-1 Hukum / Administrasi Negara / Manajemen SDM" },
  { label: "ANALIS SDM APARATUR AHLI MADYA", code: "2.10.06", class: "12", type: "JF", minEducation: "S-1 Hukum / Administrasi Negara / Manajemen SDM" },

  // 11. ANALIS KEBIJAKAN
  { label: "ANALIS KEBIJAKAN AHLI PERTAMA", code: "2.11.01", class: "8", type: "JF", minEducation: "S-1 Semua Jurusan" },
  { label: "ANALIS KEBIJAKAN AHLI MUDA", code: "2.11.02", class: "10", type: "JF", minEducation: "S-1 Semua Jurusan" },
  { label: "ANALIS KEBIJAKAN AHLI MADYA", code: "2.11.03", class: "12", type: "JF", minEducation: "S-1 Semua Jurusan" },

  // 12. PENGELOLA PENGADAAN BARANG/JASA
  { label: "PENGELOLA PENGADAAN BARANG/JASA AHLI PERTAMA", code: "2.12.01", class: "8", type: "JF", minEducation: "S-1 Teknik / Ekonomi / Hukum" },
  { label: "PENGELOLA PENGADAAN BARANG/JASA AHLI MUDA", code: "2.12.02", class: "10", type: "JF", minEducation: "S-1 Teknik / Ekonomi / Hukum" },
  { label: "PENGELOLA PENGADAAN BARANG/JASA AHLI MADYA", code: "2.12.03", class: "12", type: "JF", minEducation: "S-1 Teknik / Ekonomi / Hukum" },

  // 13. KEUANGAN & ANGGARAN
  { label: "PRANATA KEUANGAN APBN TERAMPIL", code: "2.13.01", class: "7", type: "JF", minEducation: "D-III Akuntansi / Ekonomi / Keuangan" },
  { label: "PRANATA KEUANGAN APBN MAHIR", code: "2.13.02", class: "8", type: "JF", minEducation: "D-III Akuntansi / Ekonomi / Keuangan" },
  { label: "PRANATA KEUANGAN APBN PENYELIA", code: "2.13.03", class: "9", type: "JF", minEducation: "D-III Akuntansi / Ekonomi / Keuangan" },
  { label: "ANALIS PENGELOLAAN KEUANGAN APBN AHLI PERTAMA", code: "2.13.04", class: "8", type: "JF", minEducation: "S-1 Akuntansi / Ekonomi / Manajemen Keuangan" },
  { label: "ANALIS PENGELOLAAN KEUANGAN APBN AHLI MUDA", code: "2.13.05", class: "10", type: "JF", minEducation: "S-1 Akuntansi / Ekonomi / Manajemen Keuangan" },
  { label: "ANALIS PENGELOLAAN KEUANGAN APBN AHLI MADYA", code: "2.13.06", class: "12", type: "JF", minEducation: "S-1 Akuntansi / Ekonomi / Manajemen Keuangan" },
  { label: "ANALIS ANGGARAN AHLI PERTAMA", code: "2.13.07", class: "8", type: "JF", minEducation: "S-1 Ekonomi / Akuntansi / Administrasi" },
  { label: "ANALIS ANGGARAN AHLI MUDA", code: "2.13.08", class: "10", type: "JF", minEducation: "S-1 Ekonomi / Akuntansi / Administrasi" },
  { label: "ANALIS ANGGARAN AHLI MADYA", code: "2.13.09", class: "12", type: "JF", minEducation: "S-1 Ekonomi / Akuntansi / Administrasi" },

  // 14. HUMAS & KERJASAMA
  { label: "PRANATA HUBUNGAN MASYARAKAT TERAMPIL", code: "2.14.01", class: "6", type: "JF", minEducation: "D-III Komunikasi / Humas" },
  { label: "PRANATA HUBUNGAN MASYARAKAT MAHIR", code: "2.14.02", class: "7", type: "JF", minEducation: "D-III Komunikasi / Humas" },
  { label: "PRANATA HUBUNGAN MASYARAKAT PENYELIA", code: "2.14.03", class: "8", type: "JF", minEducation: "D-III Komunikasi / Humas" },
  { label: "PRANATA HUBUNGAN MASYARAKAT AHLI PERTAMA", code: "2.14.04", class: "8", type: "JF", minEducation: "S-1 Komunikasi / Hubungan Internasional" },
  { label: "PRANATA HUBUNGAN MASYARAKAT AHLI MUDA", code: "2.14.05", class: "9", type: "JF", minEducation: "S-1 Komunikasi / Hubungan Internasional" },
  { label: "PRANATA HUBUNGAN MASYARAKAT AHLI MADYA", code: "2.14.06", class: "11", type: "JF", minEducation: "S-1 Komunikasi / Hubungan Internasional" },
  { label: "ANALIS KERJA SAMA AHLI PERTAMA", code: "2.14.07", class: "8", type: "JF", minEducation: "S-1 Hubungan Internasional / Hukum / Manajemen" },
  { label: "ANALIS KERJA SAMA AHLI MUDA", code: "2.14.08", class: "10", type: "JF", minEducation: "S-1 Hubungan Internasional / Hukum / Manajemen" },
  { label: "ANALIS KERJA SAMA AHLI MADYA", code: "2.14.09", class: "12", type: "JF", minEducation: "S-1 Hubungan Internasional / Hukum / Manajemen" },

  // 15. KESEHATAN
  { label: "DOKTER AHLI PERTAMA", code: "2.15.01", class: "9", type: "JF", minEducation: "Profesi Dokter" },
  { label: "DOKTER AHLI MUDA", code: "2.15.02", class: "10", type: "JF", minEducation: "Profesi Dokter" },
  { label: "DOKTER AHLI MADYA", code: "2.15.03", class: "12", type: "JF", minEducation: "Profesi Dokter" },
  { label: "DOKTER GIGI AHLI PERTAMA", code: "2.15.04", class: "9", type: "JF", minEducation: "Profesi Dokter Gigi" },
  { label: "DOKTER GIGI AHLI MUDA", code: "2.15.05", class: "10", type: "JF", minEducation: "Profesi Dokter Gigi" },
  { label: "DOKTER GIGI AHLI MADYA", code: "2.15.06", class: "12", type: "JF", minEducation: "Profesi Dokter Gigi" },
  { label: "PERAWAT TERAMPIL", code: "2.15.07", class: "6", type: "JF", minEducation: "D-III Keperawatan" },
  { label: "PERAWAT MAHIR", code: "2.15.08", class: "7", type: "JF", minEducation: "D-III Keperawatan" },
  { label: "PERAWAT PENYELIA", code: "2.15.09", class: "8", type: "JF", minEducation: "D-III Keperawatan" },
  { label: "PERAWAT AHLI PERTAMA", code: "2.15.10", class: "8", type: "JF", minEducation: "S-1 Ners / Keperawatan" },

  // 16. PENERJEMAH
  { label: "PENERJEMAH AHLI PERTAMA", code: "2.16.01", class: "8", type: "JF", minEducation: "S-1 Sastra / Bahasa / Hubungan Internasional" },
  { label: "PENERJEMAH AHLI MUDA", code: "2.16.02", class: "10", type: "JF", minEducation: "S-1 Sastra / Bahasa / Hubungan Internasional" },
  { label: "PENERJEMAH AHLI MADYA", code: "2.16.03", class: "12", type: "JF", minEducation: "S-1 Sastra / Bahasa / Hubungan Internasional" },

  // 17. PUSTAKAWAN & ASISTEN PERPUSTAKAAN
  { label: "PUSTAKAWAN AHLI PERTAMA", code: "2.17.01", class: "8", type: "JF", minEducation: "S-1 Ilmu Perpustakaan / Informasi" },
  { label: "PUSTAKAWAN AHLI MUDA", code: "2.17.02", class: "9", type: "JF", minEducation: "S-1 Ilmu Perpustakaan / Informasi" },
  { label: "PUSTAKAWAN AHLI MADYA", code: "2.17.03", class: "11", type: "JF", minEducation: "S-1 Ilmu Perpustakaan / Informasi" },
  { label: "ASISTEN PERPUSTAKAAN TERAMPIL", code: "2.17.04", class: "6", type: "JF", minEducation: "D-III Perpustakaan / Kearsipan" },
  { label: "ASISTEN PERPUSTAKAAN MAHIR", code: "2.17.05", class: "7", type: "JF", minEducation: "D-III Perpustakaan / Kearsipan" },
  { label: "ASISTEN PERPUSTAKAAN PENYELIA", code: "2.17.06", class: "8", type: "JF", minEducation: "D-III Perpustakaan / Kearsipan" },

  // 18. MANGGALA INFORMATIKA
  { label: "MANGGALA INFORMATIKA AHLI PERTAMA", code: "2.18.01", class: "8", type: "JF", minEducation: "S-1 Teknik Informatika / Ilmu Komputer" },
  { label: "MANGGALA INFORMATIKA AHLI MUDA", code: "2.18.02", class: "9", type: "JF", minEducation: "S-1 Teknik Informatika / Ilmu Komputer" },
  { label: "MANGGALA INFORMATIKA AHLI MADYA", code: "2.18.03", class: "11", type: "JF", minEducation: "S-1 Teknik Informatika / Ilmu Komputer" },

  // 19. PERENCANA
  { label: "PERENCANA AHLI PERTAMA", code: "2.19.01", class: "8", type: "JF", minEducation: "S-1 Perencanaan Wilayah / Ekonomi / Manajemen" },
  { label: "PERENCANA AHLI MUDA", code: "2.19.02", class: "10", type: "JF", minEducation: "S-1 Perencanaan Wilayah / Ekonomi / Manajemen" },
  { label: "PERENCANA AHLI MADYA", code: "2.19.03", class: "12", type: "JF", minEducation: "S-1 Perencanaan Wilayah / Ekonomi / Manajemen" },

  // 20. PENATA LAKSANA BARANG
  { label: "PENATA LAKSANA BARANG TERAMPIL", code: "2.20.01", class: "6", type: "JF", minEducation: "D-III Manajemen Aset / Administrasi" },
  { label: "PENATA LAKSANA BARANG MAHIR", code: "2.20.02", class: "7", type: "JF", minEducation: "D-III Manajemen Aset / Administrasi" },

  // 21. PRANATA LABORATORIUM KESEHATAN
  { label: "PRANATA LABORATORIUM KESEHATAN TERAMPIL", code: "2.21.01", class: "6", type: "JF", minEducation: "D-III Analis Kesehatan / Laboratorium Medis" },
  { label: "PRANATA LABORATORIUM KESEHATAN MAHIR", code: "2.21.02", class: "7", type: "JF", minEducation: "D-III Analis Kesehatan / Laboratorium Medis" },
  { label: "PRANATA LABORATORIUM KESEHATAN PENYELIA", code: "2.21.03", class: "8", type: "JF", minEducation: "D-III Analis Kesehatan / Laboratorium Medis" },

  // E. DAFTAR NAMA JABATAN DAN KELAS JABATAN PELAKSANA (BAGIAN D PERMENKUMHAM 38 TAHUN 2025)
  { label: "PENELAAH TEKNIS KEBIJAKAN", code: "4.01", class: "7", type: "PELAKSANA", minEducation: "S-1 Semua Jurusan / Kebijakan Publik" },
  { label: "PENATA KELOLA PEMERINTAHAN", code: "4.02", class: "7", type: "PELAKSANA", minEducation: "S-1 Ilmu Pemerintahan / Administrasi Negara" },
  { label: "FASILITATOR PEMERINTAHAN", code: "4.03", class: "7", type: "PELAKSANA", minEducation: "S-1 Ilmu Pemerintahan / Administrasi Negara" },
  { label: "KONSELOR SDM", code: "4.04", class: "7", type: "PELAKSANA", minEducation: "S-1 Psikologi / Bimbingan Konseling / Manajemen SDM" },
  { label: "PENATA LAYANAN OPERASIONAL", code: "4.05", class: "7", type: "PELAKSANA", minEducation: "S-1 / D-IV Semua Jurusan" },
  { label: "PENATA KELOLA SISTEM DAN TEKNOLOGI INFORMASI", code: "4.06", class: "7", type: "PELAKSANA", minEducation: "S-1 Teknik Informatika / Sistem Informasi" },
  { label: "PENGENDALI KONTEN INTERNET", code: "4.07", class: "7", type: "PELAKSANA", minEducation: "S-1 Komunikasi / Desain / Informatika" },
  { label: "PENGELOLA LAYANAN KESEHATAN", code: "4.08", class: "6", type: "PELAKSANA", minEducation: "D-III Kesehatan / Rekam Medis / Kebidanan" },
  { label: "PENGOLAH DATA DAN INFORMASI", code: "4.09", class: "6", type: "PELAKSANA", minEducation: "D-III Teknik Informatika / Manajemen / Komputer" },
  { label: "PENGELOLA KEPROTOKOLAN", code: "4.10", class: "6", type: "PELAKSANA", minEducation: "D-III Komunikasi / Hubungan Masyarakat / Sekretaris" },
  { label: "DOKUMENTALIS HUKUM", code: "4.11", class: "6", type: "PELAKSANA", minEducation: "D-III Hukum / Perpustakaan / Administrasi" },
  { label: "PENGELOLA LAYANAN PENGADAAN", code: "4.12", class: "6", type: "PELAKSANA", minEducation: "D-III Administrasi / Manajemen / Teknik" },
  { label: "PENGELOLA LAYANAN OPERASIONAL", code: "4.13", class: "6", type: "PELAKSANA", minEducation: "D-III Semua Jurusan" },
  { label: "OPERATOR LAYANAN OPERASIONAL", code: "4.14", class: "5", type: "PELAKSANA", minEducation: "SMA / SMK Sederajat" },
  { label: "PENGADMINISTRASI PERKANTORAN", code: "4.15", class: "5", type: "PELAKSANA", minEducation: "SMA / SMK / D-III Administrasi Perkantoran" },
  { label: "PENGELOLA UMUM OPERASIONAL", code: "4.16", class: "1", type: "PELAKSANA", minEducation: "SMA / SMP Sederajat" },

  // F. JABATAN PELAKSANA TRANSISI / NOMENKLATUR EKSISTING DI LINGKUNGAN DJKI
  { label: "ANALIS PENGEMBANGAN PEGAWAI", code: "4.17", class: "7", type: "PELAKSANA", minEducation: "S-1 Manajemen SDM / Hukum / Administrasi" },
  { label: "PENGELOLA DATA KEPEGAWAIAN", code: "4.18", class: "6", type: "PELAKSANA", minEducation: "D-III Manajemen / Komputer / Administrasi" },
  { label: "PENGADMINISTRASI PERJALANAN DINAS", code: "4.19", class: "5", type: "PELAKSANA", minEducation: "SMA / SMK / D-III Perkantoran" },
  { label: "PENGADMINISTRASI UMUM", code: "4.20", class: "5", type: "PELAKSANA", minEducation: "SMA / SMK / D-III Perkantoran" },
  { label: "PENGELOLA HASIL KERJA", code: "4.21", class: "6", type: "PELAKSANA", minEducation: "D-III Manajemen / Administrasi" },
  { label: "PENYUSUN PROGRAM", code: "4.22", class: "7", type: "PELAKSANA", minEducation: "S-1 Perencanaan / Ekonomi / Manajemen" },
  { label: "ANALIS SISTEM APLIKASI DAN JARINGAN KOMPUTER", code: "4.23", class: "7", type: "PELAKSANA", minEducation: "S-1 Teknik Informatika / Sistem Informasi" },
  { label: "ANALIS PERTIMBANGAN HUKUM", code: "4.24", class: "7", type: "PELAKSANA", minEducation: "S-1 Ilmu Hukum" },
  { label: "PENYUSUN TINDAK LANJUT DAN LAPORAN HASIL PEMERIKSAAN", code: "4.25", class: "7", type: "PELAKSANA", minEducation: "S-1 Hukum / Akuntansi / Manajemen" }
];

/**
 * Normalisasi nama jabatan untuk pemetaan kelas jabatan sesuai Permenkumham No. 38 Tahun 2025
 */
export const normalizeJobTitle = (raw: string): string => {
  if (!raw) return '';
  let s = raw.trim().toUpperCase();
  // Strip anotasi kurung seperti (Teknis), (Sistem)
  s = s.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  // Strip prefix penugasan seperti Plt, Plh, Pj, Pjs, Calon
  s = s.replace(/^(PLT\.|PLH\.|PJ\.|PJS\.|CALON)\s+/i, '');
  // Strip prefix "JABATAN FUNGSIONAL " atau "JABATAN PELAKSANA "
  s = s.replace(/^JABATAN\s+(FUNGSIONAL|PELAKSANA|STRUKTURAL)\s+/i, '');
  // Strip suffix unit kerja penempatan jika ada ("PADA DIREKTORAT...", "PADA BAGIAN...", "DI LINGKUNGAN...")
  s = s.replace(/\s+PADA\s+(DIREKTORAT|SEKRETARIAT|BAGIAN|SUBDIREKTORAT|SUBBAGIAN|SEKSI)\b.*$/i, '');
  s = s.replace(/\s+DI\s+LINGKUNGAN\b.*$/i, '');
  // Standarisasi ejaan & singkatan
  s = s.replace(/\bPERUUNDANG-UNDANGAN\b/g, 'PERUNDANG-UNDANGAN');
  s = s.replace(/\bPERUU\b/g, 'PERUNDANG-UNDANGAN');
  s = s.replace(/\bANGGARAN PENDAPATAN DAN BELANJA NEGARA\b/g, 'APBN');
  s = s.replace(/\bPELAKSANA LANJUTAN\b/g, 'MAHIR');
  
  // Penyesuaian arsiparis / prakom pelaksana ke terampil
  if (s.includes('ARSIPARIS PELAKSANA') || s.includes('PRANATA KOMPUTER PELAKSANA')) {
    s = s.replace(/\bPELAKSANA\b/g, 'TERAMPIL');
  }

  // Sisipkan 'AHLI' untuk jabatan keahlian yang ditulis ringkas tanpa kata 'AHLI'
  const keahlianLevels = ['UTAMA', 'MADYA', 'MUDA', 'PERTAMA'];
  for (const lvl of keahlianLevels) {
    const regex = new RegExp(`\\s+${lvl}$`);
    if (regex.test(s) && !s.includes('AHLI ' + lvl) && !s.includes('ESELON') && !s.includes('TINGKAT')) {
      s = s.replace(regex, ` AHLI ${lvl}`);
      break;
    }
  }

  return s;
};

/**
 * Logika Resmi Pemetaan Kelas Jabatan Berdasarkan Permenkumham No. 38 Tahun 2025
 * untuk Pemrosesan Data Peta Jabatan, Formasi SIMPEG, Profil Pegawai, dan ABK DJKI
 */
export const getKelasJabatanPermenkumham38 = (
  namaJabatan: string,
  eselon?: string,
  golRuang?: string
): string => {
  if (!namaJabatan) return '';
  const clean = namaJabatan.trim().toUpperCase();

  // Abaikan baris heading, rekapitulasi, atau placeholder kosong
  if (
    clean.startsWith('A)') || 
    clean.startsWith('B)') || 
    clean.includes('JABATAN FUNGSIONAL (SEBUTKAN') || 
    clean.includes('JABATAN PELAKSANA (SEBUTKAN') ||
    clean.includes('SEBUTKAN SEMUA') || 
    clean.includes('TOTAL SELURUH') ||
    clean === '---' ||
    clean.startsWith('REKAPITULASI') ||
    clean === '-' ||
    clean === 'N/A' ||
    clean === 'TIDAK ADA'
  ) {
    return '';
  }

  const es = (eselon || '').toUpperCase().trim();

  // 1. Pimpinan Tinggi Madya & Pratama (Eselon I & II) Sesuai Permenkumham 38/2025
  if (clean.includes('DIREKTUR JENDERAL KEKAYAAN') || clean === 'DIREKTUR JENDERAL' || es === 'I.A' || es === 'I.B') return '17';
  if (clean.includes('SEKRETARIS DIREKTORAT JENDERAL') || clean.includes('SEKRETARIS DITJEN')) return '16';
  if ((clean.startsWith('DIREKTUR') && !clean.includes('SUBDIREKTORAT') && !clean.includes('JENDERAL')) || es === 'II.A' || es === 'II.B') return '15';

  // 2. Administrator (Eselon III) Sesuai Permenkumham 38/2025 - Kelas 13
  if (
    clean.startsWith('KEPALA BAGIAN') || 
    clean.startsWith('KEPALA SUBDIREKTORAT') || 
    clean.startsWith('KABAG') || 
    clean.startsWith('KASUBDIT') ||
    clean.startsWith('KOORDINATOR') ||
    clean === 'KOORDINATOR' ||
    es === 'III.A' || 
    es === 'III.B'
  ) {
    return '13';
  }

  // 3. Pengawas (Eselon IV) Sesuai Permenkumham 38/2025 - Kelas 10
  if (
    clean.startsWith('KEPALA SUBBAGIAN') || 
    clean.startsWith('KEPALA SEKSI') || 
    clean.startsWith('KASUBBAG') || 
    clean.startsWith('KASI') ||
    clean.startsWith('SUBKOORDINATOR') ||
    clean.startsWith('SUB KOORDINATOR') ||
    clean === 'SUBKOORDINATOR' ||
    es === 'IV.A' || 
    es === 'IV.B'
  ) {
    return '10';
  }

  const norm = normalizeJobTitle(namaJabatan);

  // 4. Pencocokan Persis (Exact Match) dengan Master Data Permenkumham 38/2025
  const exact = MASTER_JABATAN_PERMENKUMHAM_38_2025.find(m => m.label.toUpperCase() === norm);
  if (exact) return exact.class;

  // 5. Pencocokan Cerdas (Smart Matching) dengan Master Data Permenkumham 38/2025
  const levels = ['AHLI UTAMA', 'AHLI MADYA', 'AHLI MUDA', 'AHLI PERTAMA', 'PENYELIA', 'MAHIR', 'TERAMPIL', 'PEMULA'];
  const matchedLevel = levels.find(l => norm.includes(l));

  if (matchedLevel) {
    // Cari kandidat yang memiliki jenjang yang sama dan nama dasar yang berkesesuaian
    const candidates = MASTER_JABATAN_PERMENKUMHAM_38_2025.filter(m => m.label.includes(matchedLevel));
    const bestCandidate = candidates.find(m => {
      const baseMaster = m.label.replace(matchedLevel, '').trim();
      const baseNorm = norm.replace(matchedLevel, '').trim();
      return baseNorm.includes(baseMaster) || baseMaster.includes(baseNorm);
    });
    if (bestCandidate) return bestCandidate.class;
  }

  // Pencocokan substring langsung untuk pelaksana atau jabatan spesifik tanpa jenjang
  const partial = MASTER_JABATAN_PERMENKUMHAM_38_2025.find(m => {
    const mLabel = m.label.toUpperCase();
    return norm === mLabel || norm.includes(mLabel);
  });
  if (partial) return partial.class;

  // 6. Penentuan Berdasarkan Jenjang Jabatan Fungsional Khusus Sesuai Permenkumham 38/2025
  const isHighTierJF = norm.includes('PERANCANG PERATURAN') || 
    norm.includes('ANALIS SDM APARATUR') || 
    norm.includes('ANALIS KEBIJAKAN') || 
    norm.includes('ANALIS PENGELOLAAN KEUANGAN APBN') || 
    norm.includes('ANALIS ANGGARAN') || 
    norm.includes('PERENCANA') || 
    norm.includes('DOKTER') ||
    norm.includes('PENERJEMAH');

  if (isHighTierJF) {
    if (norm.includes('AHLI UTAMA')) return '14';
    if (norm.includes('AHLI MADYA')) return '12';
    if (norm.includes('AHLI MUDA')) return '10';
    if (norm.includes('AHLI PERTAMA')) return norm.includes('DOKTER') ? '9' : '8';
  }

  // Standar umum JF (Pemeriksa Paten/Merek/Desain, Analis KI, Analis Hukum, Penyuluh, Prakom, Arsiparis):
  if (norm.includes('AHLI UTAMA')) return '13';
  if (norm.includes('AHLI MADYA')) return '11';
  if (norm.includes('AHLI MUDA')) return '9';
  if (norm.includes('AHLI PERTAMA')) return '8';
  if (norm.includes('PENYELIA')) return norm.includes('KEUANGAN APBN') ? '9' : '8';
  if (norm.includes('MAHIR')) return norm.includes('KEUANGAN APBN') ? '8' : '7';
  if (norm.includes('TERAMPIL')) return norm.includes('KEUANGAN APBN') ? '7' : '6';
  if (norm.includes('PEMULA')) return '5';

  // 7. Penentuan Berdasarkan Nomenklatur Pelaksana Standar Permenkumham 38/2025
  if (norm.includes('PENELAAH TEKNIS') || norm.includes('PENATA KELOLA') || norm.includes('FASILITATOR') || norm.includes('PENATA LAYANAN') || norm.includes('KONTEN INTERNET') || norm.includes('ANALIS SISTEM') || norm.includes('PENYUSUN PROGRAM') || norm.includes('ANALIS PENGEMBANGAN PEGAWAI') || norm.includes('ANALIS PERTIMBANGAN')) {
    return '7';
  }
  if (norm.includes('PENGELOLA LAYANAN') || norm.includes('PENGOLAH DATA') || norm.includes('PENGELOLA KEPROTOKOLAN') || norm.includes('DOKUMENTALIS') || norm.includes('PENGELOLA HASIL KERJA') || norm.includes('PENGELOLA DATA')) {
    return '6';
  }
  if (norm.includes('OPERATOR LAYANAN') || norm.includes('PENGADMINISTRASI')) {
    return '5';
  }
  if (norm.includes('PENGELOLA UMUM OPERASIONAL')) {
    return '1';
  }

  // 8. Penentuan Berdasarkan Golongan Ruang Pelaksana (Fallback bila tidak terdefinisi)
  if (golRuang) {
    const g = golRuang.toUpperCase().trim();
    if (g.startsWith('IV')) return '9';
    if (g.startsWith('III/D')) return '8';
    if (g.startsWith('III/C') || g.startsWith('III/B')) return '7';
    if (g.startsWith('III/A')) return '6';
    if (g.startsWith('II')) return '5';
    if (g.startsWith('I')) return '1';
  }

  return '';
};

// 2. CONTOH DOKUMEN RESMI ANJAB & FORMAT ABK LENGKAP: DIREKTUR MEREK DAN INDIKASI GEOGRAFIS
export const CONTOH_ANJAB_DIREKTUR_MEREK = {
  namaJabatan: "Direktur Merek dan Indikasi Geografis",
  kodeJabatan: "-",
  unitUtama: "Kementerian Hukum",
  unitMadya: "Direktorat Jenderal Kekayaan Intelektual",
  unitPratama: "Direktorat Merek dan Indikasi Geografis",
  unitKerja: "Direktorat Merek dan Indikasi Geografis",
  administrator: "-",
  pengawas: "-",
  pelaksana: "-",
  jabatanFungsional: "-",
  jenisJabatan: "STRUKTUR",
  kelasJabatan: "15",
  jumlahSaatIni: 1,
  jamKerjaEfektif: 1250,
  ikhtisarJabatan: "Membantu pelaksanaan sebagian tugas Direktur Jenderal Kekayaan Intelektual di bidang merek dan indikasi geografis dengan cara menyusun rencana kerja, mengoordinasikan pelaksanaan kegiatan, mendistribusikan dan mengendalikan pelaksanaan tugas, melakukan penyeliaan, serta mengevaluasi dan melaporkan hasil pelaksanaan tugas guna memastikan tugas terlaksana secara efektif, efisien, dan berdaya guna serta berhasil guna.",
  pendidikanFormal: "S-1/D-IV bidang Hukum/Ilmu Hukum/Manajemen/Administrasi Negara/Ilmu Pemerintahan atau bidang lain yang relevan dengan tugas jabatan",
  diklat: "Penjenjangan: Pelatihan Kepemimpinan Nasional Tingkat II (PKN II); Teknis: a) Kebijakan dan Strategi Kekayaan Intelektual, b) Hukum dan Kebijakan Merek, c) Hukum dan Kebijakan Indikasi Geografis, d) Manajemen Perlindungan Kekayaan Intelektual, e) Manajemen Pendaftaran dan Pelayanan Merek, f) Pengembangan dan Perlindungan Indikasi Geografis, g) Penegakan dan Penyelesaian Sengketa Kekayaan Intelektual, h) Perumusan dan Evaluasi Kebijakan Kekayaan Intelektual, i) Manajemen Risiko Kekayaan Intelektual, j) Manajemen Kinerja dan Evaluasi Program",
  pengalamanKerja: "Memiliki pengalaman dalam Jabatan Administrator atau Jabatan Fungsional yang setara paling singkat 3 (tiga) tahun di bidang merek/indikasi geografis/kekayaan intelektual atau bidang lain yang relevan dengan tugas jabatan.",
  
  // Format ABK Lengkap untuk 23 Butir Uraian Tugas Pokok (sesuai Dokumen Resmi)
  uraianTugas: [
    { no: 1, tugas: "Merumuskan rencana kerja Direktorat berdasarkan Rencana Strategis Kementerian, Rencana Kerja Kementerian, serta kebijakan nasional dan data pendukung lainnya guna mendukung pencapaian sasaran kinerja Direktorat.", hasilKerja: "Kegiatan", volume: 3, normaWaktu: 15, waktuEfektif: 1250, totalWaktu: 45 },
    { no: 2, tugas: "Merumuskan bahan kebijakan teknis di bidang tugas Direktorat berdasarkan arah kebijakan kementerian, prioritas program nasional, serta ketentuan peraturan perundang-undangan guna mendukung pelaksanaan tugas dan fungsi Direktorat.", hasilKerja: "Dokumen", volume: 3, normaWaktu: 5, waktuEfektif: 1250, totalWaktu: 15 },
    { no: 3, tugas: "Mengoordinasikan pembagian dan pendistribusian tugas kepada unit kerja di bawah Direktorat, memberikan arahan dan petunjuk kerja, serta melaksanakan pengendalian dan evaluasi pelaksanaan tugas guna mendukung efektivitas kinerja Direktorat.", hasilKerja: "Kegiatan", volume: 235, normaWaktu: 0.5, waktuEfektif: 1250, totalWaktu: 117.5 },
    { no: 4, tugas: "Mengoordinasikan pelaksanaan permohonan merek dan indikasi geografis.", hasilKerja: "Kegiatan", volume: 235, normaWaktu: 0.5, waktuEfektif: 1250, totalWaktu: 117.5 },
    { no: 5, tugas: "Mengoordinasikan klasifikasi merek.", hasilKerja: "Kegiatan", volume: 235, normaWaktu: 0.5, waktuEfektif: 1250, totalWaktu: 117.5 },
    { no: 6, tugas: "Mengoordinasikan publikasi dan dokumentasi merek dan indikasi geografis.", hasilKerja: "Kegiatan", volume: 47, normaWaktu: 2, waktuEfektif: 1250, totalWaktu: 94 },
    { no: 7, tugas: "Mengoordinasikan pelayanan teknis merek dan indikasi geografis.", hasilKerja: "Kegiatan", volume: 235, normaWaktu: 0.5, waktuEfektif: 1250, totalWaktu: 117.5 },
    { no: 8, tugas: "Mengoordinasikan pemeriksaan merek dan indikasi geografis.", hasilKerja: "Kegiatan", volume: 235, normaWaktu: 0.5, waktuEfektif: 1250, totalWaktu: 117.5 },
    { no: 9, tugas: "Mengoordinasikan sertifikasi merek dan indikasi geografis.", hasilKerja: "Kegiatan", volume: 12, normaWaktu: 4, waktuEfektif: 1250, totalWaktu: 48 },
    { no: 10, tugas: "Mengoordinasikan perpanjangan, mutasi, dan lisensi merek.", hasilKerja: "Kegiatan", volume: 12, normaWaktu: 4, waktuEfektif: 1250, totalWaktu: 48 },
    { no: 11, tugas: "Mengoordinasikan monitoring merek dan indikasi geografis.", hasilKerja: "Kegiatan", volume: 12, normaWaktu: 4, waktuEfektif: 1250, totalWaktu: 48 },
    { no: 12, tugas: "Mengoordinasikan pelayanan hukum merek dan indikasi geografis.", hasilKerja: "Kegiatan", volume: 12, normaWaktu: 4, waktuEfektif: 1250, totalWaktu: 48 },
    { no: 13, tugas: "Mengoordinasikan perubahan dokumen deskripsi indikasi geografis terdaftar.", hasilKerja: "Kegiatan", volume: 12, normaWaktu: 4, waktuEfektif: 1250, totalWaktu: 48 },
    { no: 14, tugas: "Mengelola pengumpulan, pengolahan, dan penyajian data dan informasi di lingkungan Direktorat sebagai bahan perumusan kebijakan, evaluasi, pelaporan, dan pengambilan keputusan.", hasilKerja: "Kegiatan", volume: 235, normaWaktu: 0.5, waktuEfektif: 1250, totalWaktu: 117.5 },
    { no: 15, tugas: "Mengoordinasikan pelaksanaan fungsi penyeliaan terhadap bawahan melalui pengendalian, pemberian arahan, dan pengawasan pelaksanaan tugas guna menjamin tercapainya kinerja Direktorat sesuai target yang ditetapkan.", hasilKerja: "Kegiatan", volume: 47, normaWaktu: 1, waktuEfektif: 1250, totalWaktu: 47 },
    { no: 16, tugas: "Mengoordinasikan kerja sama dan sinergi dengan instansi pemerintah, lembaga, dan/atau pihak terkait dalam rangka mendukung pelaksanaan tugas dan pencapaian kinerja Direktorat.", hasilKerja: "Kegiatan", volume: 12, normaWaktu: 3, waktuEfektif: 1250, totalWaktu: 36 },
    { no: 17, tugas: "Mengendalikan serta mengevaluasi pelaksanaan program dan kegiatan Direktorat berdasarkan rencana kerja dan realisasi untuk mengukur capaian kinerja serta menjadi dasar pengambilan keputusan pimpinan.", hasilKerja: "Kegiatan", volume: 12, normaWaktu: 2, waktuEfektif: 1250, totalWaktu: 24 },
    { no: 18, tugas: "Mengoordinasikan penyiapan bahan Laporan Kinerja (LKj) serta laporan kedinasan lainnya di lingkungan Direktorat sesuai ketentuan peraturan perundang-undangan guna mendukung akuntabilitas kinerja instansi.", hasilKerja: "Kegiatan", volume: 4, normaWaktu: 15, waktuEfektif: 1250, totalWaktu: 60 },
    { no: 19, tugas: "Membina dan memotivasi pegawai di lingkungan Direktorat untuk meningkatkan produktivitas kerja, kompetensi, dan pengembangan karier dalam rangka peningkatan kinerja organisasi.", hasilKerja: "Kegiatan", volume: 47, normaWaktu: 1, waktuEfektif: 1250, totalWaktu: 47 },
    { no: 20, tugas: "Memberikan saran, masukan, dan pertimbangan kepada pimpinan dalam rangka perumusan kebijakan dan penyelesaian permasalahan di bidang tugas Direktorat.", hasilKerja: "Kegiatan", volume: 12, normaWaktu: 2, waktuEfektif: 1250, totalWaktu: 24 },
    { no: 21, tugas: "Melakukan pengendalian atas paraf dan/atau penandatanganan naskah dinas sesuai kewenangan untuk menjamin tertib administrasi di lingkungan Direktorat.", hasilKerja: "Dokumen", volume: 235, normaWaktu: 0.25, waktuEfektif: 1250, totalWaktu: 58.75 },
    { no: 22, tugas: "Mengoordinasikan penyusunan laporan pelaksanaan tugas Direktorat sebagai bahan pertanggungjawaban dan evaluasi kinerja.", hasilKerja: "Kegiatan", volume: 12, normaWaktu: 2, waktuEfektif: 1250, totalWaktu: 24 },
    { no: 23, tugas: "Melaksanakan tugas lain yang diberikan oleh pimpinan sesuai dengan tugas dan fungsi Direktorat.", hasilKerja: "Kegiatan", volume: 12, normaWaktu: 2, waktuEfektif: 1250, totalWaktu: 24 }
  ],

  // 7. HASIL KERJA
  hasilKerjaList: [
    { no: 1, uraian: "Rencana kerja Direktorat yang selaras dengan Rencana Strategis Kementerian/Lembaga, Rencana Kerja Kementerian/Lembaga, serta program dan kegiatan lintas unit terkait.", satuanHasil: "Dokumen" },
    { no: 2, uraian: "Bahan perumusan kebijakan teknis di bidang tugas Direktorat sebagai dasar pelaksanaan kebijakan dan kegiatan di lingkungan Direktorat.", satuanHasil: "Dokumen" },
    { no: 3, uraian: "Hasil pengoordinasian pembagian dan pendistribusian tugas serta pengendalian dan pemeriksaan pelaksanaan pekerjaan unit-unit di bawah Direktorat dalam rangka mendukung efektivitas pencapaian kinerja Direktorat.", satuanHasil: "Kegiatan" },
    { no: 4, uraian: "Koordinasi pelaksanaan permohonan merek dan indikasi geografis.", satuanHasil: "Kegiatan" },
    { no: 5, uraian: "Koordinasi klasifikasi merek.", satuanHasil: "Kegiatan" },
    { no: 6, uraian: "Koordinasi publikasi dan dokumentasi merek dan indikasi geografis.", satuanHasil: "Kegiatan" },
    { no: 7, uraian: "Koordinasi pelayanan teknis merek dan indikasi geografis.", satuanHasil: "Kegiatan" },
    { no: 8, uraian: "Koordinasi pemeriksaan merek dan indikasi geografis.", satuanHasil: "Kegiatan" },
    { no: 9, uraian: "Koordinasi sertifikasi merek dan indikasi geografis.", satuanHasil: "Kegiatan" },
    { no: 10, uraian: "Koordinasi perpanjangan, mutasi, dan lisensi merek.", satuanHasil: "Kegiatan" },
    { no: 11, uraian: "Koordinasi monitoring merek dan indikasi geografis.", satuanHasil: "Kegiatan" },
    { no: 12, uraian: "Koordinasi pelayanan hukum merek dan indikasi geografis.", satuanHasil: "Kegiatan" },
    { no: 13, uraian: "Koordinasi perubahan dokumen deskripsi indikasi geografis terdaftar.", satuanHasil: "Kegiatan" },
    { no: 14, uraian: "Data dan informasi di lingkungan Direktorat guna mendukung perumusan kebijakan, pelaksanaan program, evaluasi, dan pelaporan kinerja.", satuanHasil: "Dokumen" },
    { no: 15, uraian: "Pengoordinasian penyeliaan, pembimbingan, dan pengawasan pelaksanaan tugas bawahan di lingkungan Direktorat.", satuanHasil: "Kegiatan" },
    { no: 16, uraian: "Pengoordinasian kerja sama dan sinergi dengan instansi pemerintah dan/atau pihak terkait dalam rangka mendukung pelaksanaan program dan kegiatan Direktorat.", satuanHasil: "Kegiatan" },
    { no: 17, uraian: "Pengendalian, pemantauan, dan evaluasi pelaksanaan program dan kegiatan Direktorat.", satuanHasil: "Dokumen" },
    { no: 18, uraian: "Bahan penyusunan Laporan Kinerja (LKj) serta laporan kedinasan lainnya di lingkungan Direktorat.", satuanHasil: "Kegiatan" },
    { no: 19, uraian: "Pembinaan peningkatan disiplin, produktivitas, kompetensi, dan kinerja pegawai di lingkungan Direktorat.", satuanHasil: "Kegiatan" },
    { no: 20, uraian: "Saran, masukan, dan pertimbangan kepada pimpinan dalam pengambilan kebijakan di bidang tugas Direktorat.", satuanHasil: "Dokumen" },
    { no: 21, uraian: "Pengendalian keabsahan naskah dinas sesuai kewenangan dalam rangka tertib administrasi di lingkungan Direktorat.", satuanHasil: "Dokumen" },
    { no: 22, uraian: "Laporan pelaksanaan tugas Direktorat sebagai bahan pertanggungjawaban dan evaluasi kinerja.", satuanHasil: "Kegiatan" },
    { no: 23, uraian: "Pelaksanaan tugas lain yang diberikan oleh pimpinan sesuai dengan tugas dan fungsi Direktorat.", satuanHasil: "Kegiatan" }
  ],

  // 8. BAHAN KERJA
  bahanKerjaList: [
    { no: 1, bahanKerja: "Rencana Kerja Kementerian/Lembaga (Renja K/L)", penggunaan: "Menjadi dasar penyusunan rencana kerja tahunan, target kinerja, dan kegiatan Direktorat." },
    { no: 2, bahanKerja: "Kebijakan nasional, RPJMN, dan regulasi peraturan perundang-undangan", penggunaan: "Sebagai dasar normatif dan arah kebijakan dalam perumusan dan pelaksanaan tugas Direktorat." },
    { no: 3, bahanKerja: "Data sektoral dan statistik bidang tugas Direktorat", penggunaan: "Mendukung analisis kebijakan, perencanaan program, serta pengambilan keputusan strategis." },
    { no: 4, bahanKerja: "Dokumen anggaran (RKA-K/L, DIPA)", penggunaan: "Sebagai dasar pelaksanaan program, pengelolaan anggaran, dan akuntabilitas keuangan Direktorat." },
    { no: 5, bahanKerja: "Laporan kinerja periode sebelumnya (LAKIN/LKj)", penggunaan: "Sebagai bahan evaluasi capaian kinerja dan perbaikan perencanaan program Direktorat." },
    { no: 6, bahanKerja: "Hasil monitoring, evaluasi, dan audit kinerja", penggunaan: "Menjadi dasar pengendalian program, peningkatan efektivitas, dan perbaikan kebijakan." },
    { no: 7, bahanKerja: "Masukan stakeholder (K/L lain, pemerintah daerah, masyarakat, dunia usaha)", penggunaan: "Sebagai bahan pertimbangan dalam perumusan kebijakan dan sinkronisasi program lintas sektor." },
    { no: 8, bahanKerja: "Arahan pimpinan (Menteri, Dirjen, rapat pimpinan)", penggunaan: "Menjadi pedoman tindak lanjut kebijakan, prioritas program, dan pengambilan keputusan strategis." },
    { no: 9, bahanKerja: "Laporan dan informasi dari unit kerja di bawah Direktorat", penggunaan: "Sebagai dasar koordinasi, pengendalian, dan evaluasi pelaksana" },
    { no: 10, bahanKerja: "Rencana Strategis DJKI", penggunaan: "Pedoman pencapaian target strategis kekayaan intelektual jangka menengah." }
  ],
  bahanKerja: "1. Rencana Kerja K/L; 2. Kebijakan nasional & regulasi perundangan; 3. Data sektoral statistik permohonan merek; 4. Dokumen anggaran DIPA; 5. Laporan Kinerja LAKIN; 6. Hasil monev audit kinerja; 7. Masukan stakeholder publik & asosiasi; 8. Arahan pimpinan Menteri & Dirjen; 9. Laporan subdirektorat.",

  // 9. PERANGKAT KERJA
  perangkatKerjaList: [
    { no: 1, perangkatKerja: "Komputer/Laptop kerja", penggunaan: "Menyusun kebijakan, laporan, perencanaan program, serta pengolahan data strategis Direktorat." },
    { no: 2, perangkatKerja: "Aplikasi pengolah kata dan spreadsheet (Office suite)", penggunaan: "Menyusun dokumen kebijakan, analisis data, laporan kinerja, dan perencanaan anggaran." },
    { no: 3, perangkatKerja: "Sistem informasi kinerja dan perencanaan (e-planning/e-performance)", penggunaan: "Mendukung perencanaan, pengukuran kinerja, dan pelaporan capaian Direktorat." },
    { no: 4, perangkatKerja: "Sistem informasi keuangan dan anggaran (e-budgeting/RKA-K/L)", penggunaan: "Mendukung pengelolaan anggaran, perencanaan belanja, dan akuntabilitas keuangan Direktorat." },
    { no: 5, perangkatKerja: "Jaringan internet dan intranet K/L", penggunaan: "Mendukung akses data, koordinasi, serta komunikasi lintas unit dan instansi." },
    { no: 6, perangkatKerja: "Telepon dinas dan perangkat komunikasi (smartphone/email resmi)", penggunaan: "Mendukung komunikasi strategis dan koordinasi dengan pimpinan, unit kerja, dan stakeholder." },
    { no: 7, perangkatKerja: "Aplikasi rapat daring (Zoom, MS Teams, dll.)", penggunaan: "Mendukung pelaksanaan rapat koordinasi, konsultasi, dan pengambilan keputusan jarak jauh." },
    { no: 8, perangkatKerja: "Sistem persuratan elektronik (e-office/e-surat)", penggunaan: "Mengelola naskah dinas, disposisi pimpinan, dan administrasi persuratan Direktorat." },
    { no: 9, perangkatKerja: "Dashboard data dan monitoring kinerja", penggunaan: "Memantau capaian kinerja program dan kegiatan Direktorat secara real-time." },
    { no: 10, perangkatKerja: "Ruang kerja dan ruang rapat Direktorat", penggunaan: "Menunjang pelaksanaan koordinasi, perumusan kebijakan, dan pengambilan keputusan strategis." }
  ],
  perangkatKerja: "1. Komputer/Laptop; 2. Aplikasi Office Suite; 3. Sistem Informasi E-Performance; 4. Sistem Anggaran E-Budgeting; 5. Jaringan Internet/Intranet; 6. Perangkat Komunikasi Smartphone/Email; 7. Aplikasi Rapat Daring; 8. Sistem E-Office Persuratan; 9. Dashboard Monitoring KI; 10. Ruang Rapat Pimpinan.",

  // 10. TANGGUNG JAWAB
  tanggungJawab: "1. Ketepatan perumusan rencana kerja Direktorat; 2. Ketepatan perumusan bahan kebijakan teknis; 3. Ketepatan pengoordinasian pembagian tugas bawahan; 4. Ketepatan koordinasi permohonan merek & IG; 5. Ketepatan koordinasi klasifikasi merek; 6. Ketepatan koordinasi publikasi & dokumentasi; 7. Ketepatan koordinasi pelayanan teknis; 8. Ketepatan koordinasi pemeriksaan substantif merek & IG; 9. Ketepatan sertifikasi merek & IG; 10. Ketepatan perpanjangan, mutasi, lisensi merek; 11. Ketepatan monitoring merek & IG; 12. Ketepatan pelayanan hukum merek; 13. Ketepatan perubahan deskripsi IG terdaftar; 14. Ketepatan pengelolaan data dan informasi; 15. Ketepatan penyeliaan dan pembinaan bawahan; 16. Ketepatan kerja sama instansi terkait; 17. Ketepatan monev program kerja; 18. Ketepatan laporan kinerja LKj; 19. Ketepatan pembinaan disiplin pegawai; 20. Ketepatan pemberian saran kepada pimpinan; 21. Ketepatan pengendalian keabsahan naskah dinas; 22. Ketepatan laporan pelaksanaan tugas; 23. Ketepatan pelaksanaan tugas kedinasan lainnya.",

  // 11. WEWENANG
  wewenang: "1. Mengarahkan dan mengendalikan pelaksanaan program di bidang Merek dan Indikasi Geografis; 2. Menetapkan prioritas dan pembagian tugas pelaksanaan program; 3. Mengoordinasikan pelaksanaan kebijakan dan program Merek dan Indikasi Geografis; 4. Memberikan arahan penyelesaian permasalahan strategis; 5. Mengendalikan pelaksanaan kegiatan agar sesuai kebijakan dan peraturan; 6. Melakukan penyeliaan pelaksanaan tugas unit kerja di lingkungan Direktorat; 7. Meminta data, informasi, dan laporan yang diperlukan; 8. Mengevaluasi pencapaian target dan kinerja program Direktorat; 9. Memberikan rekomendasi tindak lanjut berdasarkan hasil monev; 10. Menyampaikan laporan pelaksanaan tugas dan kinerja kepada Dirjen Kekayaan Intelektual.",

  // 12. KORELASI JABATAN
  korelasiJabatanList: [
    { no: 1, namaJabatan: "Menteri", unitKerja: "Kementerian Hukum", dalamHal: "Berkonsultasi dengan atasan, menerima arahan dan petunjuk kerja, serta menyampaikan laporan pelaksanaan tugas secara berkala." },
    { no: 2, namaJabatan: "Sekretaris Jenderal", unitKerja: "Kementerian Hukum", dalamHal: "Berkonsultasi dengan atasan, menerima arahan dan petunjuk kerja, serta menyampaikan laporan pelaksanaan tugas secara berkala." },
    { no: 3, namaJabatan: "Direktur Jenderal Kekayaan Intelektual", unitKerja: "Kementerian Hukum", dalamHal: "Berkonsultasi dengan atasan langsung, menerima arahan dan petunjuk kerja, serta menyampaikan laporan pelaksanaan tugas secara berkala." },
    { no: 4, namaJabatan: "Sekretaris Direktorat Jenderal dan Para Direktur", unitKerja: "Kementerian Hukum", dalamHal: "Berkoordinasi dan melaksanakan kerja sama dalam melaksanakan tugas kedinasan." },
    { no: 5, namaJabatan: "Para Kepala Subdirektorat dan Kepala Subbagian Tata Usaha", unitKerja: "Kementerian Hukum", dalamHal: "Memberikan arahan, instruksi, dan pembinaan kepada bawahan dalam rangka pelaksanaan tugas secara efektif dan sesuai ketentuan." },
    { no: 6, namaJabatan: "Pejabat Fungsional dan Pelaksana", unitKerja: "Kementerian Hukum", dalamHal: "Memberikan arahan, instruksi, dan pembinaan kepada bawahan dalam rangka pelaksanaan tugas secara efektif dan sesuai ketentuan." },
    { no: 7, namaJabatan: "Pejabat yang berkepentingan", unitKerja: "Kementerian Hukum", dalamHal: "Berkoordinasi dan melaksanakan kerja sama dalam melaksanakan tugas." },
    { no: 8, namaJabatan: "Pejabat instansi terkait", unitKerja: "Pemerintah Republik Indonesia", dalamHal: "Berkoordinasi dan melaksanakan kerja sama dalam melaksanakan tugas perlindungan KI." },
    { no: 9, namaJabatan: "Publik dan Swasta", unitKerja: "Masyarakat / Stakeholder", dalamHal: "Melaksanakan koordinasi, memberikan konsultasi, serta menyelenggarakan pelayanan sesuai bidang tugas." }
  ],
  korelasiJabatan: "1. Menteri Hukum (Konsultasi/Laporan); 2. Sekretaris Jenderal (Koordinasi/Laporan); 3. Dirjen Kekayaan Intelektual (Atasan Langsung, Arahan & Laporan); 4. Sesditjen & Para Direktur DJKI (Koordinasi Horizontal); 5. Kasubdit & Kasubbag TU (Instruksi & Pembinaan Bawahan); 6. Pejabat Fungsional & Pelaksana (Penyeliaan & Pembinaan); 7. Instansi Terkait K/L (Kerjasama Lintas Sektor); 8. Publik & Pemohon KI (Konsultasi & Pelayanan).",

  // 13. KONDISI LINGKUNGAN KERJA
  lingkunganKerja: "1. Tempat Kerja: Di dalam ruangan; 2. Suhu: Normal dengan perubahan; 3. Udara: Normal dengan perubahan; 4. Keadaan Ruangan: Cukup Luas; 5. Letak: Fisik: rendah, Sosial: ramai; 6. Penerangan: Terang; 7. Suara: Tenang; 8. Keadaan Tempat Kerja: Nyaman; 9. Getaran: Tidak Ada (-)",

  // 14. RISIKO BAHAYA
  risikoBahaya: "Kelelahan fisik dan mental akibat pelaksanaan tugas rutin, perjalanan dinas, rapat dan pertemuan pimpinan, monitoring dan evaluasi, serta penyelesaian sengketa.",

  // 15. SYARAT JABATAN LAIN
  keterampilanKerja: "1. Perumusan dan implementasi kebijakan Merek dan Indikasi Geografis; 2. Analisis hukum dan kebijakan Merek; 3. Analisis hukum dan kebijakan Indikasi Geografis; 4. Perencanaan dan pengelolaan program kekayaan intelektual; 5. Koordinasi lintas unit dan pemangku kepentingan; 6. Pengendalian pelaksanaan program dan kegiatan; 7. Analisis dan penyelesaian permasalahan kekayaan intelektual; 8. Manajemen risiko kekayaan intelektual; 9. Monitoring dan evaluasi kinerja program; 10. Kepemimpinan, penyeliaan, dan pengambilan keputusan strategis.",
  bakatKerja: "G (Inteligensia): Kemampuan belajar secara umum; V (Bakat Verbal): Kemampuan memahami arti kata-kata secara efektif; Q (Bakat Ketelitian): Kemampuan menyerap perincian bahan verbal dan tabel.",
  temperamenKerja: "D, Directing Control Planning (DCP): Kemampuan memimpin, mengendalikan atau merencanakan; I, Influencing (INFLU): Kemampuan mempengaruhi orang lain; M, Measurable and Verifiable Criteria (MVC): Kemampuan mengambil keputusan berdasarkan kriteria yang dapat diuji.",
  minatKerja: "1. Sosial: Aktivitas bersifat sosial atau komunikasi interpersonal; 2. Kewirausahaan: Aktivitas pengelolaan/manajerial untuk pencapaian tujuan organisasi.",
  upayaFisik: "1. Duduk dalam posisi biasa; 2. Berbicara secara lisan; 3. Mendengar suara dan diskusi.",
  kondisiFisik: "Jenis Kelamin: Pria/Wanita; Umur: Sesuai ketentuan ASN; Tinggi/Berat: Normal; Postur: Normal; Penampilan: Rapi.",
  fungsiPekerjaan: "1. Hub. dengan Data: D1 (Mengkoordinasi Data); 2. Hub. dengan Orang: O0 (Menasehati), O3 (Menyelia); 3. Hub. dengan Mesin: Tidak Ada (-).",
  prestasiKerja: "Sangat baik"
};

// 3. CONTOH DOKUMEN RESMI ANJAB & ABK: PEMERIKSA PATEN AHLI MUDA (JF - KELAS 9)
export const CONTOH_ANJAB_PEMERIKSA_PATEN_MUDA = {
  namaJabatan: "Pemeriksa Paten Ahli Muda",
  kodeJabatan: "2.01.02",
  unitUtama: "Kementerian Hukum",
  unitMadya: "Direktorat Jenderal Kekayaan Intelektual",
  unitPratama: "Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang",
  unitKerja: "Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang",
  administrator: "Kepala Subdirektorat Pemeriksaan Paten",
  pengawas: "-",
  pelaksana: "-",
  jabatanFungsional: "Pemeriksa Paten",
  jenisJabatan: "FUNGSIONAL",
  kelasJabatan: "9",
  jumlahSaatIni: 24,
  jamKerjaEfektif: 1250,
  ikhtisarJabatan: "Melaksanakan kegiatan penelaahan dokumen spesifikasi paten, penelusuran dokumen pembanding (prior art search), pengujian kebaruan (novelty), langkah inventif (inventive step), keterterapan industri, penyusunan laporan pemeriksaan substantif (First Action & Final Action), serta penyelesaian tanggapan pemohon paten guna memberikan kepastian hukum perlindungan paten sesuai Undang-Undang Paten.",
  pendidikanFormal: "Sarjana (S-1) / Diploma IV bidang Teknik Mesin / Elektro / Kimia / Farmasi / Bioteknologi / MIPA / Ilmu Komputer / Sains Terapan",
  diklat: "Penjenjangan: Diklat Jabatan Fungsional Pemeriksa Paten Ahli Muda; Teknis: a) Penelusuran Basis Data Paten Internasional (WIPO PATENTSCOPE, EPO Espacenet), b) Analisis Klaim dan Konstruksi Perlindungan, c) Drafting & Patent Examination Standards, d) Bahasa Inggris Teknis",
  pengalamanKerja: "Memiliki pengalaman dalam Jabatan Fungsional Pemeriksa Paten Ahli Pertama paling singkat 3 (tiga) tahun atau memiliki pengalaman pemeriksaan substantif paten minimal 3 tahun.",
  
  // Format ABK Lengkap untuk Tugas Pokok Pemeriksa Paten Muda
  uraianTugas: [
    { no: 1, tugas: "Melakukan verifikasi dan penelaahan awal berkas permohonan paten substantif serta mengkaji kelengkapan dokumen spesifikasi, deskripsi, klaim, dan abstrak.", hasilKerja: "Berkas", volume: 150, normaWaktu: 1.5, waktuEfektif: 1250, totalWaktu: 225 },
    { no: 2, tugas: "Melakukan penelusuran invensi terdahulu (prior art search) pada basis data paten nasional dan internasional (WIPO, EPO, USPTO, JPO).", hasilKerja: "Laporan", volume: 120, normaWaktu: 3, waktuEfektif: 1250, totalWaktu: 360 },
    { no: 3, tugas: "Melakukan analisis perbandingan klaim invensi terhadap dokumen pembanding untuk menilai syarat kebaruan (novelty).", hasilKerja: "Dokumen", volume: 120, normaWaktu: 2, waktuEfektif: 1250, totalWaktu: 240 },
    { no: 4, tugas: "Melakukan analisis langkah inventif (inventive step / non-obviousness) terhadap ruang lingkup invensi pemohon.", hasilKerja: "Dokumen", volume: 120, normaWaktu: 2, waktuEfektif: 1250, totalWaktu: 240 },
    { no: 5, tugas: "Melakukan analisis keterterapan industri (industrial applicability) serta kejelasan dan ketercukupan pengungkapan invensi (sufficiency of disclosure).", hasilKerja: "Dokumen", volume: 120, normaWaktu: 1.5, waktuEfektif: 1250, totalWaktu: 180 },
    { no: 6, tugas: "Menyusun konsep Laporan Pemeriksaan Substantif Pertama (First Office Action) yang memuat pertimbangan hukum dan teknis.", hasilKerja: "Konsep", volume: 100, normaWaktu: 2, waktuEfektif: 1250, totalWaktu: 200 },
    { no: 7, tugas: "Memeriksa dan mengevaluasi tanggapan atau sanggahan tertulis dari pemohon paten / konsultan KI atas hasil pemeriksaan substantif.", hasilKerja: "Berkas", volume: 75, normaWaktu: 2.5, waktuEfektif: 1250, totalWaktu: 187.5 },
    { no: 8, tugas: "Menyusun rekomendasi akhir keputusan pemberian paten (Grant) atau penolakan permohonan paten (Refusal / Final Action).", hasilKerja: "Dokumen", volume: 90, normaWaktu: 1.5, waktuEfektif: 1250, totalWaktu: 135 },
    { no: 9, tugas: "Menyiapkan bahan pertimbangan teknis untuk sidang Komisi Banding Paten apabila terdapat pengajuan banding.", hasilKerja: "Dokumen", volume: 15, normaWaktu: 4, waktuEfektif: 1250, totalWaktu: 60 },
    { no: 10, tugas: "Menyusun laporan berkala pelaksanaan tugas pemeriksaan substantif paten sebagai bahan pertanggungjawaban kinerja.", hasilKerja: "Laporan", volume: 12, normaWaktu: 2, waktuEfektif: 1250, totalWaktu: 24 }
  ],

  hasilKerjaList: [
    { no: 1, uraian: "Hasil telaah berkas permohonan paten substantif", satuanHasil: "Berkas" },
    { no: 2, uraian: "Laporan hasil penelusuran dokumen paten pembanding (prior art)", satuanHasil: "Laporan" },
    { no: 3, uraian: "Dokumen analisis kebaruan dan langkah inventif", satuanHasil: "Dokumen" },
    { no: 4, uraian: "Laporan Pemeriksaan Substantif Pertama (First Action)", satuanHasil: "Dokumen" },
    { no: 5, uraian: "Rekomendasi pemberian (Grant) atau penolakan paten", satuanHasil: "Dokumen" }
  ],
  bahanKerja: "1. Dokumen Permohonan Paten (Deskripsi, Klaim, Abstrak, Gambar); 2. Basis Data Paten Nasional & Internasional (WIPO, EPO); 3. UU No. 13 Tahun 2016 tentang Paten jo UU No. 6 Tahun 2023; 4. Petunjuk Teknis Pemeriksaan Substantif Paten; 5. Berkas tanggapan pemohon paten.",
  perangkatKerja: "1. Komputer / Laptop Kerja High-Performance; 2. Jaringan Internet & Akses Basis Data Paten Global; 3. Aplikasi Sistem Pelayanan Paten Daring; 4. Modul Penelusuran Paten; 5. Alat Komunikasi Kedinasan.",
  tanggungJawab: "1. Ketepatan hasil penelusuran dokumen paten pembanding; 2. Objektivitas dan kecermatan analisis kebaruan dan langkah inventif; 3. Kepatuhan tenggat waktu pemeriksaan substantif; 4. Kerahasiaan invensi pemohon paten sebelum diumumkan.",
  wewenang: "1. Memeriksa keabsahan dan kejelasan klaim invensi paten; 2. Mengakses basis data penelusuran paten; 3. Mengusulkan permintaan klarifikasi / perbaikan kepada pemohon paten; 4. Memberikan rekomendasi persetujuan atau penolakan paten.",
  korelasiJabatan: "1. Direktur Paten (Arahan Kebijakan); 2. Koordinator / Kasubdit Pemeriksaan Paten (Penyeliaan & Disposisi); 3. Konsultan KI / Pemohon (Klarifikasi Teknis); 4. Anggota Komisi Banding Paten (Koordinasi Kasus Banding).",
  lingkunganKerja: "Tempat Kerja: Di dalam ruangan ber-AC; Suhu: Dingin/Normal; Udara: Sejuk; Penerangan: Terang; Suara: Hening/Tenang mendukung konsentrasi tinggi.",
  risikoBahaya: "Kelelahan mata akibat membaca dokumen teknis dan layar komputer dalam jangka waktu panjang, ketegangan otot leher.",
  bakatKerja: "G (Inteligensia): Kemampuan analisis tingkat tinggi; Q (Ketelitian): Ketelitian verifikasi klaim dan data; V (Verbal): Pemahaman istilah sains dan hukum.",
  temperamenKerja: "M (MVC): Mengambil keputusan berdasarkan kriteria objektif yang dapat diuji; T (STS): Menyesuaikan diri dengan situasi kritis dan deadline.",
  minatKerja: "Investigatif (Riset Sains & Teknologi), Konvensional (Keteraturan Dokumen)",
  upayaFisik: "Duduk lama, melihat layar komputer, mengetik, meneliti berkas.",
  kondisiFisik: "Sehat Jasmani dan Rohani, penglihatan baik.",
  fungsiPekerjaan: "D2 (Menganalisis Data), O8 (Menerima Instruksi)",
  prestasiKerja: "Sangat baik"
};

// 4. CONTOH DOKUMEN RESMI ANJAB & ABK: ANALIS SDM APARATUR AHLI MUDA (JF - KELAS 10)
export const CONTOH_ANJAB_ANALIS_SDM_MUDA = {
  namaJabatan: "Analis SDM Aparatur Ahli Muda",
  kodeJabatan: "2.10.05",
  unitUtama: "Kementerian Hukum",
  unitMadya: "Direktorat Jenderal Kekayaan Intelektual",
  unitPratama: "Sekretariat Direktorat Jenderal Kekayaan Intelektual",
  unitKerja: "Sekretariat Direktorat Jenderal Kekayaan Intelektual",
  administrator: "Kepala Bagian Umum / Kepegawaian",
  pengawas: "Kepala Subbagian Tata Usaha & Kepegawaian",
  pelaksana: "-",
  jabatanFungsional: "Analis SDM Aparatur",
  jenisJabatan: "FUNGSIONAL",
  kelasJabatan: "10",
  jumlahSaatIni: 6,
  jamKerjaEfektif: 1250,
  ikhtisarJabatan: "Melaksanakan analisis dan pengelolaan sistem SDM aparatur yang mencakup penyusunan formasi ASN, peta jabatan, analisis jabatan dan beban kerja (Anjab-ABK), manajemen talenta ASN, evaluasi kinerja pegawai, pengelolaan kenaikan pangkat, mutasi, promosi, dan pengembangan kompetensi di lingkungan DJKI.",
  pendidikanFormal: "Sarjana (S-1) / Diploma IV bidang Ilmu Hukum / Administrasi Negara / Manajemen SDM / Kebijakan Publik / Psikologi",
  diklat: "Penjenjangan: Diklat Fungsional Analis SDM Aparatur Ahli Muda; Teknis: a) Metodologi Anjab & ABK ASN, b) Sistem Manajemen Talenta ASN & 9-Box Matrix, c) Penilaian Kinerja ASN PermenPAN-RB No. 6/2022, d) Aplikasi SIASN BKN & SIMPEG",
  pengalamanKerja: "Pengalaman di bidang manajemen kepegawaian dan analisis SDM aparatur minimal 3 tahun.",
  
  uraianTugas: [
    { no: 1, tugas: "Menyusun instrumen dan pedoman analisis jabatan dan analisis beban kerja (Anjab & ABK) seluruh unit kerja di lingkungan DJKI.", hasilKerja: "Dokumen", volume: 8, normaWaktu: 15, waktuEfektif: 1250, totalWaktu: 120 },
    { no: 2, tugas: "Melakukan verifikasi dan telaah perhitungan kebutuhan formasi ASN serta peta jabatan berdasarkan usulan masing-masing Direktorat.", hasilKerja: "Laporan", volume: 15, normaWaktu: 12, waktuEfektif: 1250, totalWaktu: 180 },
    { no: 3, tugas: "Menyusun peta jabatan resmi dan analisis bezetting pegawai DJKI (1.074 pegawai) untuk perencanaan CASN dan PPPK.", hasilKerja: "Dokumen", volume: 4, normaWaktu: 30, waktuEfektif: 1250, totalWaktu: 120 },
    { no: 4, tugas: "Melakukan analisis profil kompetensi, rekam jejak, dan pemetaan talenta pegawai ke dalam Sistem Manajemen Talenta (9-Box Grid).", hasilKerja: "Laporan", volume: 24, normaWaktu: 8, waktuEfektif: 1250, totalWaktu: 192 },
    { no: 5, tugas: "Menelaah dan memproses usulan kenaikan pangkat, kenaikan gaji berkala (KGB), dan pensiun pegawai melalui SIASN.", hasilKerja: "Berkas", volume: 180, normaWaktu: 1.5, waktuEfektif: 1250, totalWaktu: 270 },
    { no: 6, tugas: "Melakukan bimbingan teknis dan evaluasi pengelolaan SKP serta dialog kinerja pegawai berbasis PermenPAN-RB No. 6 Tahun 2022.", hasilKerja: "Kegiatan", volume: 20, normaWaktu: 6, waktuEfektif: 1250, totalWaktu: 120 },
    { no: 7, tugas: "Menyusun analisis kebutuhan pengembangan kompetensi (Training Needs Analysis) dan rekomendasi diklat ASN.", hasilKerja: "Dokumen", volume: 6, normaWaktu: 20, waktuEfektif: 1250, totalWaktu: 120 },
    { no: 8, tugas: "Menyusun laporan evaluasi disiplin pegawai dan pembinaan kode etik ASN di lingkungan DJKI.", hasilKerja: "Laporan", volume: 12, normaWaktu: 8, waktuEfektif: 1250, totalWaktu: 96 },
    { no: 9, tugas: "Menyiapkan bahan pertimbangan Tim Penilai Kinerja (TPK) ASN terkait mutasi internal dan pengisian jabatan lowong.", hasilKerja: "Naskah", volume: 10, normaWaktu: 5, waktuEfektif: 1250, totalWaktu: 50 }
  ],

  hasilKerjaList: [
    { no: 1, uraian: "Dokumen Anjab dan Peta Jabatan DJKI", satuanHasil: "Dokumen" },
    { no: 2, uraian: "Laporan Perhitungan ABK dan Kebutuhan Formasi ASN", satuanHasil: "Laporan" },
    { no: 3, uraian: "Peta Manajemen Talenta 9-Box ASN DJKI", satuanHasil: "Laporan" },
    { no: 4, uraian: "Berkas Layanan Kepegawaian (KP, KGB, Pensiun)", satuanHasil: "Berkas" }
  ],
  bahanKerja: "1. Data Pegawai SIMPEG & SIASN BKN; 2. Dokumen Anjab-ABK Unit Kerja; 3. PermenPAN-RB No. 1/2020 & Permenkumham No. 38/2025; 4. Matriks Hasil Kerja & SKP Pegawai; 5. Disposisi pimpinan.",
  perangkatKerja: "1. Laptop & Komputer Kerja; 2. Aplikasi SIMPEG Kemenkumham, SIASN BKN, dan Dashboard Kepegawaian DJKI; 3. SOP Layanan Kepegawaian; 4. Printer & Scanner.",
  tanggungJawab: "1. Akurasi data pemetaan jabatan dan perhitungan ABK; 2. Kelancaran dan ketepatan waktu proses kenaikan pangkat dan KGB; 3. Validitas pemetaan talenta ASN; 4. Kerahasiaan data pribadi pegawai.",
  wewenang: "1. Memvalidasi perhitungan kebutuhan beban kerja unit; 2. Memberikan telaahan staf terkait mutasi dan formasi; 3. Memverifikasi kelayakan berkas layanan kepegawaian; 4. Memberikan bimbingan teknis SKP.",
  korelasiJabatan: "1. Sesditjen DJKI (Arahan Kebijakan SDM); 2. Kabag Umum/Kepegawaian (Atasan Langsung); 3. Para Ketua Tim Kerja (Koordinasi ABK & SKP); 4. BKN & Biro Kepegawaian Kemenkumham (Konsultasi & Koordinasi Luar).",
  lingkunganKerja: "Di dalam ruangan kerja ber-AC, pencahayaan baik, suasana kondusif.",
  risikoBahaya: "Kelelahan mata dan stress kerja saat musim pengusulan berkas kenaikan pangkat masal.",
  bakatKerja: "G (Inteligensia), V (Verbal), Q (Ketelitian), N (Numerik)",
  temperamenKerja: "DCP (Directing Control Planning), MVC (Measurable & Verifiable Criteria)",
  minatKerja: "Sosial, Konvensional, Pengelolaan SDM",
  upayaFisik: "Duduk, melihat layar, berdiskusi, presentasi.",
  kondisiFisik: "Sehat Jasmani dan Rohani.",
  fungsiPekerjaan: "D1 (Mengkoordinasikan Data), O3 (Menyelia), O8 (Menerima Instruksi)",
  prestasiKerja: "Sangat baik"
};

// 5. CONTOH DOKUMEN RESMI ANJAB & ABK: PENELAAH TEKNIS KEBIJAKAN (PELAKSANA - KELAS 7)
export const CONTOH_ANJAB_PENELAAH_TEKNIS_KEBIJAKAN = {
  namaJabatan: "Penelaah Teknis Kebijakan",
  kodeJabatan: "4.01",
  unitUtama: "Kementerian Hukum",
  unitMadya: "Direktorat Jenderal Kekayaan Intelektual",
  unitPratama: "Direktorat Merek dan Indikasi Geografis",
  unitKerja: "Direktorat Merek dan Indikasi Geografis",
  administrator: "Kepala Subdirektorat Permohonan dan Pelayanan Merek",
  pengawas: "Kepala Seksi Permohonan",
  pelaksana: "Penelaah Teknis Kebijakan",
  jabatanFungsional: "-",
  jenisJabatan: "PELAKSANA",
  kelasJabatan: "7",
  jumlahSaatIni: 14,
  jamKerjaEfektif: 75000,
  ikhtisarJabatan: "Melaksanakan penelaahan teknis terhadap permohonan, regulasi, dokumen kebijakan operasional, pengaduan, dan data substantif di bidang merek dan indikasi geografis serta menyusun konsep telaahan staf guna mendukung kelancaran pengambilan keputusan pimpinan.",
  pendidikanFormal: "Sarjana (S-1) / Diploma IV bidang Ilmu Hukum / Kebijakan Publik / Ilmu Pemerintahan / Manajemen / Sosial",
  diklat: "Penjenjangan: Pelatihan Dasar CPNS; Teknis: a) Penyusunan Telaahan Staf dan Legal Drafting, b) Kebijakan Teknis Kekayaan Intelektual, c) Analisis Kebijakan Publik",
  pengalamanKerja: "Pengalaman di bidang administrasi pemerintahan atau telaahan teknis minimal 1 tahun.",
  
  uraianTugas: [
    { no: 1, tugas: "Mengumpulkan bahan, regulasi, dan referensi peraturan perundang-undangan terkait permohonan pendaftaran merek dan indikasi geografis.", hasilKerja: "Dokumen", volume: 180, normaWaktu: 90, waktuEfektif: 75000, totalWaktu: 16200 },
    { no: 2, tugas: "Melakukan verifikasi kelengkapan dan kesesuaian dokumen permohonan pendaftaran merek terhadap persyaratan teknis administratif.", hasilKerja: "Berkas", volume: 320, normaWaktu: 60, waktuEfektif: 75000, totalWaktu: 19200 },
    { no: 3, tugas: "Menyusun konsep telaahan staf mengenai permasalahan hukum dan teknis permohonan merek yang mengalami kendala administrasi.", hasilKerja: "Konsep", volume: 120, normaWaktu: 120, waktuEfektif: 75000, totalWaktu: 14400 },
    { no: 4, tugas: "Menyiapkan bahan rapat koordinasi teknis pelaksanaan program kerja dan evaluasi layanan publik merek.", hasilKerja: "Materi", volume: 48, normaWaktu: 120, waktuEfektif: 75000, totalWaktu: 5760 },
    { no: 5, tugas: "Menyusun draft tanggapan surat dinas dan konsultasi publik terkait prosedur pendaftaran kekayaan intelektual.", hasilKerja: "Naskah", volume: 150, normaWaktu: 60, waktuEfektif: 75000, totalWaktu: 9000 },
    { no: 6, tugas: "Melakukan rekapitulasi data hasil penelaahan kebijakan pelayanan sebagai bahan penyusunan laporan bulanan.", hasilKerja: "Laporan", volume: 12, normaWaktu: 360, waktuEfektif: 75000, totalWaktu: 4320 },
    { no: 7, tugas: "Melaksanakan tugas kedinasan lain yang diberikan oleh atasan langsung baik secara lisan maupun tertulis.", hasilKerja: "Kegiatan", volume: 24, normaWaktu: 240, waktuEfektif: 75000, totalWaktu: 5760 }
  ],

  hasilKerjaList: [
    { no: 1, uraian: "Bahan kajian dan referensi regulasi teknis", satuanHasil: "Dokumen" },
    { no: 2, uraian: "Berkas verifikasi teknis permohonan merek", satuanHasil: "Berkas" },
    { no: 3, uraian: "Konsep telaahan staf teknis kebijakan", satuanHasil: "Konsep" },
    { no: 4, uraian: "Konsep surat dinas tanggapan pemohon", satuanHasil: "Naskah" },
    { no: 5, uraian: "Laporan bulanan rekapitulasi telaahan teknis", satuanHasil: "Laporan" }
  ],
  bahanKerja: "1. Berkas permohonan merek & IG; 2. Peraturan Perundang-undangan KI; 3. Disposisi pimpinan; 4. Surat permohonan konsultasi publik.",
  perangkatKerja: "1. Komputer / Laptop; 2. Printer & Scanner; 3. Sistem Informasi Merek Daring; 4. SOP Layanan Merek.",
  tanggungJawab: "1. Ketelitian dan kecermatan verifikasi teknis berkas; 2. Kejelasan analisis dalam telaahan staf; 3. Ketepatan waktu penyelesaian draft naskah dinas.",
  wewenang: "1. Mengakses data permohonan merek pada sistem; 2. Mengusulkan rekomendasi perbaikan berkas; 3. Mengonfirmasi kelengkapan dokumen kepada pemohon.",
  korelasiJabatan: "1. Kasubdit / Koordinator (Atasan Langsung); 2. Pejabat Fungsional Pemeriksa Merek (Koordinasi Teknis); 3. Pemohon Merek (Pemberian Informasi Teknis).",
  lingkunganKerja: "Di dalam ruangan kantor ber-AC, pencahayaan cukup, kebisingan rendah.",
  risikoBahaya: "Kelelahan mata dan fisik karena sering di depan layar monitor.",
  bakatKerja: "Q (Ketelitian), V (Bakat Verbal), G (Inteligensia)",
  temperamenKerja: "REPCON (Kemampuan menyesuaikan diri dengan kegiatan berulang secara teratur), MVC (Kriteria Terukur)",
  minatKerja: "Konvensional, Realistik",
  upayaFisik: "Duduk, mengetik, memeriksa dokumen fisik dan digital.",
  kondisiFisik: "Sehat jasmani dan rohani.",
  fungsiPekerjaan: "D2 (Menganalisis Data), O8 (Menerima Instruksi)",
  prestasiKerja: "Baik"
};

// 6. CONTOH DOKUMEN RESMI ANJAB & ABK: PENGOLAH DATA DAN INFORMASI (PELAKSANA - KELAS 6)
export const CONTOH_ANJAB_PENGOLAH_DATA = {
  namaJabatan: "Pengolah Data dan Informasi",
  kodeJabatan: "4.09",
  unitUtama: "Kementerian Hukum",
  unitMadya: "Direktorat Jenderal Kekayaan Intelektual",
  unitPratama: "Sekretariat Direktorat Jenderal Kekayaan Intelektual",
  unitKerja: "Sekretariat Direktorat Jenderal Kekayaan Intelektual",
  administrator: "Kepala Bagian Umum",
  pengawas: "Kepala Subbagian Kepegawaian",
  pelaksana: "Pengolah Data dan Informasi",
  jabatanFungsional: "-",
  jenisJabatan: "PELAKSANA",
  kelasJabatan: "6",
  jumlahSaatIni: 18,
  jamKerjaEfektif: 75000,
  ikhtisarJabatan: "Melakukan kegiatan pengumpulan, penginputan, validasi, pemeliharaan, serta penyajian data dan informasi administrasi kepegawaian, persuratan, dan kinerja ke dalam sistem database SIMPEG dan aplikasi pendukung di lingkungan DJKI.",
  pendidikanFormal: "Diploma III (D-III) bidang Manajemen Informatika / Teknik Komputer / Sistem Informasi / Administrasi Perkantoran / Manajemen",
  diklat: "Penjenjangan: Pelatihan Dasar CPNS; Teknis: a) Pengelolaan Basis Data & Spreadsheet Lanjutan, b) Pengoperasian Aplikasi SIMPEG & SIASN, c) Tata Kelola Kearsipan Digital",
  pengalamanKerja: "Pengalaman dalam administrasi pengolahan data atau kearsipan minimal 1 tahun.",
  
  uraianTugas: [
    { no: 1, tugas: "Mengumpulkan dan memverifikasi berkas fisik maupun digital data pegawai, SK, dan mutasi dari seluruh unit kerja DJKI.", hasilKerja: "Berkas", volume: 600, normaWaktu: 30, waktuEfektif: 75000, totalWaktu: 18000 },
    { no: 2, tugas: "Melakukan input dan update data riwayat kepegawaian (pangkat, jabatan, pendidikan, keluarga) ke dalam aplikasi SIMPEG & SIASN.", hasilKerja: "Data", volume: 800, normaWaktu: 25, waktuEfektif: 75000, totalWaktu: 20000 },
    { no: 3, tugas: "Melakukan digitalisasi (scanning) dan penamaan berkas dokumen SK kepegawaian sesuai standar tata kelola arsip digital.", hasilKerja: "Dokumen", volume: 500, normaWaktu: 20, waktuEfektif: 75000, totalWaktu: 10000 },
    { no: 4, tugas: "Menyusun rekapitulasi data bezetting pegawai dan rekap kenaikan gaji berkala (KGB) berkala bulanan.", hasilKerja: "Tabel", volume: 24, normaWaktu: 240, waktuEfektif: 75000, totalWaktu: 5760 },
    { no: 5, tugas: "Melakukan validasi dan pembersihan data (data cleansing) anomali pada database SIMPEG & SIASN BKN.", hasilKerja: "Laporan", volume: 48, normaWaktu: 150, waktuEfektif: 75000, totalWaktu: 7200 },
    { no: 6, tugas: "Menyiapkan penyajian data statistik kepegawaian dalam bentuk dashboard grafis dan infografis untuk bahan laporan pimpinan.", hasilKerja: "Grafik", volume: 24, normaWaktu: 300, waktuEfektif: 75000, totalWaktu: 7200 },
    { no: 7, tugas: "Melaksanakan tugas kedinasan lain yang diperintahkan oleh pimpinan.", hasilKerja: "Kegiatan", volume: 24, normaWaktu: 280, waktuEfektif: 75000, totalWaktu: 6720 }
  ],

  hasilKerjaList: [
    { no: 1, uraian: "Berkas data kepegawaian terverifikasi", satuanHasil: "Berkas" },
    { no: 2, uraian: "Data riwayat pegawai terupdate di SIMPEG & SIASN", satuanHasil: "Data" },
    { no: 3, uraian: "Arsip SK kepegawaian digital tersimpan", satuanHasil: "Dokumen" },
    { no: 4, uraian: "Tabel rekapitulasi data pegawai dan bezetting", satuanHasil: "Tabel" },
    { no: 5, uraian: "Laporan pemutakhiran dan kebersihan database", satuanHasil: "Laporan" }
  ],
  bahanKerja: "1. Berkas SK & dokumen pegawai; 2. Data SIMPEG & SIASN; 3. Disposisi pimpinan; 4. Formulir usulan mutasi/perubahan data.",
  perangkatKerja: "1. Komputer / PC Kerja; 2. Scanner High Speed & Printer; 3. Aplikasi SIMPEG & SIASN; 4. Google Spreadsheet & Excel.",
  tanggungJawab: "1. Keakuratan input data pada database kepegawaian; 2. Kerapian dan keamanan penyimpanan arsip fisik dan digital; 3. Ketepatan waktu penyajian tabel data.",
  wewenang: "1. Memverifikasi kelengkapan dokumen pendukung update data; 2. Melakukan input data pada SIMPEG; 3. Mengkonfirmasi kejanggalan data kepada pegawai terkait.",
  korelasiJabatan: "1. Kasubbag TU & Kepegawaian (Atasan Langsung); 2. Analis SDM Aparatur (Koordinasi Data Formasi); 3. Pegawai DJKI (Konfirmasi Data Diri).",
  lingkunganKerja: "Di dalam ruangan kantor, ber-AC, pencahayaan baik.",
  risikoBahaya: "Kelelahan mata dan carpal tunnel akibat mengetik dan input data terus menerus.",
  bakatKerja: "Q (Ketelitian), N (Numerik), K (Koordinasi Motorik)",
  temperamenKerja: "REPCON (Rutinitas berulang), STS (Kesesuaian Standar Prosedur)",
  minatKerja: "Konvensional, Realistik",
  upayaFisik: "Duduk, mengetik, melihat monitor, scanning dokumen.",
  kondisiFisik: "Sehat jasmani dan rohani.",
  fungsiPekerjaan: "D3 (Menyusun Data), D4 (Menghitung Data), O8 (Menerima Instruksi)",
  prestasiKerja: "Baik"
};

// 7. DAFTAR CONTOH DOKUMEN RESMI ANJAB LENGKAP YANG DAPAT DIPILIH / DIMUAT
export const DAFTAR_CONTOH_DOKUMEN_ANJAB = [
  {
    id: "direktur-merek",
    title: "Direktur Merek dan Indikasi Geografis",
    kategori: "JPT Pratama",
    kelas: "15",
    type: "STRUKTUR",
    unit: "Direktorat Merek dan Indikasi Geografis",
    data: CONTOH_ANJAB_DIREKTUR_MEREK,
    description: "Dokumen resmi lengkap JPT Pratama Eselon II (Kelas 15) dengan 23 butir tugas pokok ABK & 23 hasil kerja."
  },
  {
    id: "pemeriksa-paten-muda",
    title: "Pemeriksa Paten Ahli Muda",
    kategori: "Jabatan Fungsional Keahlian",
    kelas: "9",
    type: "FUNGSIONAL",
    unit: "Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang",
    data: CONTOH_ANJAB_PEMERIKSA_PATEN_MUDA,
    description: "Dokumen resmi JF Pemeriksa Paten Ahli Muda (Kelas 9) dengan format ABK substantif pemeriksaan invensi paten."
  },
  {
    id: "analis-sdm-muda",
    title: "Analis SDM Aparatur Ahli Muda",
    kategori: "Jabatan Fungsional Keahlian",
    kelas: "10",
    type: "FUNGSIONAL",
    unit: "Sekretariat Direktorat Jenderal Kekayaan Intelektual",
    data: CONTOH_ANJAB_ANALIS_SDM_MUDA,
    description: "Dokumen resmi JF Analis SDM Aparatur Ahli Muda (Kelas 10) dengan format ABK perancangan formasi & manajemen talenta."
  },
  {
    id: "penelaah-teknis",
    title: "Penelaah Teknis Kebijakan",
    kategori: "Jabatan Pelaksana (Permenkumham 38/2025)",
    kelas: "7",
    type: "PELAKSANA",
    unit: "Direktorat Merek dan Indikasi Geografis",
    data: CONTOH_ANJAB_PENELAAH_TEKNIS_KEBIJAKAN,
    description: "Dokumen resmi Jabatan Pelaksana Penelaah Teknis Kebijakan (Kelas 7) sesuai Permenkumham No. 38 Tahun 2025."
  },
  {
    id: "pengolah-data",
    title: "Pengolah Data dan Informasi",
    kategori: "Jabatan Pelaksana (Permenkumham 38/2025)",
    kelas: "6",
    type: "PELAKSANA",
    unit: "Sekretariat Direktorat Jenderal Kekayaan Intelektual",
    data: CONTOH_ANJAB_PENGOLAH_DATA,
    description: "Dokumen resmi Jabatan Pelaksana Pengolah Data & Informasi (Kelas 6) sesuai Permenkumham No. 38 Tahun 2025."
  }
];

