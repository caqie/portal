export interface KompetensiItem {
  id: string;
  jabatan: string;
  kodeKompetensi?: string;
  namaKompetensi: string;
  jenis: 'Teknis' | 'Manajerial' | 'Sosial Kultural' | 'Fungsional' | 'Struktural';
  lembaga?: string;
  level?: number;
  deskripsi?: string;
}

export const MASTER_KOMPETENSI_JABATAN: KompetensiItem[] = [
  // =========================================================================
  // ANALIS KEKAYAAN INTELEKTUAL
  // =========================================================================
  // ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA
  { id: 'aki-p-1', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'Training of Trainers', jenis: 'Teknis' },
  { id: 'aki-p-2', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'Litigasi', jenis: 'Teknis' },
  { id: 'aki-p-3', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'Tata Naskah Dinas Elektronik', jenis: 'Teknis' },
  { id: 'aki-p-4', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Beginner', jenis: 'Teknis' },
  { id: 'aki-p-5', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Intermediate', jenis: 'Teknis' },
  { id: 'aki-p-6', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'Penulisan Naskah Dinas dan Karya Ilmiah', jenis: 'Teknis' },
  { id: 'aki-p-7', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'ESQ / Nilai BerAKHLAK', jenis: 'Teknis' },
  { id: 'aki-p-8', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'Manajerial (Integritas)', jenis: 'Manajerial' },
  { id: 'aki-p-9', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'DL-201 Copyright and Related Rights', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-p-10', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'DL-203 Traditional Knowledge and Traditional Cultural Expressions', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-p-11', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'DL-302 Trademarks, Industrial Designs and Geographical Indications', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-p-12', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'DL-301 Patents', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-p-13', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'DL-317 Arbitration and Mediation Procedure under the WIPO Rules', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-p-14', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'DL-101 General Course on Intellectual Property', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-p-15', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA', namaKompetensi: 'Pelatihan Fungsional Analis Kekayaan Intelektual Ahli Pertama', jenis: 'Fungsional', lembaga: 'BPSDM Hukum dan HAM' },

  // ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA
  { id: 'aki-m-1', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'Komunikasi Tertulis', jenis: 'Teknis' },
  { id: 'aki-m-2', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'Advokasi Kebijakan', jenis: 'Teknis' },
  { id: 'aki-m-3', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'Manajerial (Kerjasama)', jenis: 'Manajerial' },
  { id: 'aki-m-4', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'Manajerial (Komunikasi)', jenis: 'Manajerial' },
  { id: 'aki-m-5', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'Manajerial (Orientasi Pada Hasil)', jenis: 'Manajerial' },
  { id: 'aki-m-6', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'Manajerial (Pelayanan Publik)', jenis: 'Manajerial' },
  { id: 'aki-m-7', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'Manajerial (Pengembangan Diri dan Orang Lain)', jenis: 'Manajerial' },
  { id: 'aki-m-8', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'Manajerial (Mengelola Perubahan)', jenis: 'Manajerial' },
  { id: 'aki-m-9', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'Manajerial (Pengambilan Keputusan)', jenis: 'Manajerial' },
  { id: 'aki-m-10', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'Sosial Kultural (Perekat Bangsa)', jenis: 'Sosial Kultural' },
  { id: 'aki-m-11', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'DL-506 Collective Management of Copyright and Related Rights for Policy Makers', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-m-12', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'DL-211 Software Licensing Including Open Source', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-m-13', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'DL-503 Specialized Course on the Madrid System for the International Registration of Marks', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-m-14', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'DL-318 Specialized Course on the Essentials of Patents', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-m-15', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'DL-320 Basics of Patent Drafting', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-m-16', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA', namaKompetensi: 'Intellectual Property for Teachers of the Young (IP4Teachers)', jenis: 'Teknis', lembaga: 'WIPO Academy' },

  // ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA & UTAMA
  { id: 'aki-md-1', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', namaKompetensi: 'Penyusunan Standar Operasional Prosedur', jenis: 'Teknis' },
  { id: 'aki-md-2', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', namaKompetensi: 'Quality Management System', jenis: 'Teknis' },
  { id: 'aki-md-3', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', namaKompetensi: 'Kepemimpinan dan Mengelola Tim', jenis: 'Teknis' },
  { id: 'aki-md-4', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', namaKompetensi: 'Training of Trainers', jenis: 'Teknis' },
  { id: 'aki-md-5', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', namaKompetensi: 'Hukum Acara', jenis: 'Teknis' },
  { id: 'aki-md-6', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', namaKompetensi: 'Mediasi', jenis: 'Teknis' },
  { id: 'aki-md-7', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', namaKompetensi: 'Rencana Strategis', jenis: 'Teknis' },
  { id: 'aki-md-8', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', namaKompetensi: 'IP-401 Trade in Intellectual Property Management', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-md-9', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', namaKompetensi: 'DL-730 Executive Course on Intellectual Property and Exports', jenis: 'Teknis', lembaga: 'WIPO Academy' },
  { id: 'aki-md-10', jabatan: 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA', namaKompetensi: 'IP Asset Valuation Course', jenis: 'Teknis', lembaga: 'WIPO Academy' },

  // =========================================================================
  // PEMERIKSA MEREK
  // =========================================================================
  // PEMERIKSA MEREK AHLI PERTAMA
  { id: 'pmk-p-1', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'Litigasi', jenis: 'Teknis' },
  { id: 'pmk-p-2', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'Tata Naskah Dinas Elektronik', jenis: 'Teknis' },
  { id: 'pmk-p-3', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'Klasifikasi NICE', jenis: 'Teknis' },
  { id: 'pmk-p-4', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Beginner', jenis: 'Teknis' },
  { id: 'pmk-p-5', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Intermediate', jenis: 'Teknis' },
  { id: 'pmk-p-6', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'Bahasa Mandarin Beginner', jenis: 'Teknis' },
  { id: 'pmk-p-7', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'Bahasa Prancis Beginner', jenis: 'Teknis' },
  { id: 'pmk-p-8', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'Penulisan Naskah Dinas dan Karya Ilmiah', jenis: 'Teknis' },
  { id: 'pmk-p-9', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'ESQ', jenis: 'Teknis' },
  { id: 'pmk-p-10', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'Manajerial (Integritas)', jenis: 'Manajerial' },
  { id: 'pmk-p-11', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'Pemeriksaan Substantif Merek', jenis: 'Teknis' },
  { id: 'pmk-p-12', jabatan: 'PEMERIKSA MEREK AHLI PERTAMA', namaKompetensi: 'Pelatihan Fungsional Pemeriksa Merek Ahli Pertama', jenis: 'Fungsional', lembaga: 'BPSDM Hukum dan HAM' },

  // PEMERIKSA MEREK AHLI MUDA
  { id: 'pmk-m-1', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Pemeriksaan Lanjutan Permohonan Merek Internasional (Madrid Protocol)', jenis: 'Teknis' },
  { id: 'pmk-m-2', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Bahasa Mandarin Intermediate', jenis: 'Teknis' },
  { id: 'pmk-m-3', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Bahasa Inggris Advanced', jenis: 'Teknis' },
  { id: 'pmk-m-4', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Bahasa Prancis Beginner', jenis: 'Teknis' },
  { id: 'pmk-m-5', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Komunikasi Tertulis', jenis: 'Teknis' },
  { id: 'pmk-m-6', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Analisa Kebijakan Publik', jenis: 'Teknis' },
  { id: 'pmk-m-7', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Advokasi Kebijakan', jenis: 'Teknis' },
  { id: 'pmk-m-8', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Manajerial (Kerjasama)', jenis: 'Manajerial' },
  { id: 'pmk-m-9', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Manajerial (Komunikasi)', jenis: 'Manajerial' },
  { id: 'pmk-m-10', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Manajerial (Orientasi Pada Hasil)', jenis: 'Manajerial' },
  { id: 'pmk-m-11', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Manajerial (Pelayanan Publik)', jenis: 'Manajerial' },
  { id: 'pmk-m-12', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Manajerial (Pengembangan Diri dan Orang Lain)', jenis: 'Manajerial' },
  { id: 'pmk-m-13', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Manajerial (Mengelola Perubahan)', jenis: 'Manajerial' },
  { id: 'pmk-m-14', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Manajerial (Pengambilan Keputusan)', jenis: 'Manajerial' },
  { id: 'pmk-m-15', jabatan: 'PEMERIKSA MEREK AHLI MUDA', namaKompetensi: 'Sosial Kultural (Perekat Bangsa)', jenis: 'Sosial Kultural' },

  // =========================================================================
  // PEMERIKSA PATEN
  // =========================================================================
  // PEMERIKSA PATEN AHLI PERTAMA
  { id: 'ppt-p-1', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'Litigasi', jenis: 'Teknis' },
  { id: 'ppt-p-2', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'Tata Naskah Dinas Elektronik', jenis: 'Teknis' },
  { id: 'ppt-p-3', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'Klasifikasi Paten (IPC)', jenis: 'Teknis' },
  { id: 'ppt-p-4', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Beginner', jenis: 'Teknis' },
  { id: 'ppt-p-5', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Intermediate', jenis: 'Teknis' },
  { id: 'ppt-p-6', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'Bahasa Mandarin Beginner', jenis: 'Teknis' },
  { id: 'ppt-p-7', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'Bahasa Jepang Beginner', jenis: 'Teknis' },
  { id: 'ppt-p-8', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'Penulisan Naskah Dinas dan Karya Ilmiah', jenis: 'Teknis' },
  { id: 'ppt-p-9', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'ESQ', jenis: 'Teknis' },
  { id: 'ppt-p-10', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'Manajerial (Integritas)', jenis: 'Manajerial' },
  { id: 'ppt-p-11', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'Penelusuran Dokumen Pembanding Patentabilitas', jenis: 'Teknis' },
  { id: 'ppt-p-12', jabatan: 'PEMERIKSA PATEN AHLI PERTAMA', namaKompetensi: 'Pelatihan Fungsional Pemeriksa Paten Ahli Pertama', jenis: 'Fungsional', lembaga: 'BPSDM Hukum dan HAM' },

  // PEMERIKSA PATEN AHLI MUDA
  { id: 'ppt-m-1', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Pemeriksaan Substantif Paten Lanjutan', jenis: 'Teknis' },
  { id: 'ppt-m-2', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Pemeriksaan Paten CBio/TA & Farmasi', jenis: 'Teknis' },
  { id: 'ppt-m-3', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Bahasa Mandarin Intermediate', jenis: 'Teknis' },
  { id: 'ppt-m-4', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Bahasa Jepang Intermediate', jenis: 'Teknis' },
  { id: 'ppt-m-5', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Komunikasi Tertulis', jenis: 'Teknis' },
  { id: 'ppt-m-6', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Analisa Kebijakan Publik', jenis: 'Teknis' },
  { id: 'ppt-m-7', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Manajerial (Kerjasama)', jenis: 'Manajerial' },
  { id: 'ppt-m-8', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Manajerial (Komunikasi)', jenis: 'Manajerial' },
  { id: 'ppt-m-9', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Manajerial (Orientasi Pada Hasil)', jenis: 'Manajerial' },
  { id: 'ppt-m-10', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Manajerial (Pelayanan Publik)', jenis: 'Manajerial' },
  { id: 'ppt-m-11', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Manajerial (Pengembangan Diri dan Orang Lain)', jenis: 'Manajerial' },
  { id: 'ppt-m-12', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Manajerial (Mengelola Perubahan)', jenis: 'Manajerial' },
  { id: 'ppt-m-13', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Manajerial (Pengambilan Keputusan)', jenis: 'Manajerial' },
  { id: 'ppt-m-14', jabatan: 'PEMERIKSA PATEN AHLI MUDA', namaKompetensi: 'Sosial Kultural (Perekat Bangsa)', jenis: 'Sosial Kultural' },

  // =========================================================================
  // PEMERIKSA DESAIN INDUSTRI
  // =========================================================================
  // PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA
  { id: 'pdi-p-1', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'Litigasi', jenis: 'Teknis' },
  { id: 'pdi-p-2', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'Tata Naskah Dinas Elektronik', jenis: 'Teknis' },
  { id: 'pdi-p-3', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'Klasifikasi Locarno', jenis: 'Teknis' },
  { id: 'pdi-p-4', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Beginner', jenis: 'Teknis' },
  { id: 'pdi-p-5', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Intermediate', jenis: 'Teknis' },
  { id: 'pdi-p-6', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'Bahasa Mandarin Beginner', jenis: 'Teknis' },
  { id: 'pdi-p-7', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'Bahasa Jepang Beginner', jenis: 'Teknis' },
  { id: 'pdi-p-8', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'Penulisan Naskah Dinas dan Karya Ilmiah', jenis: 'Teknis' },
  { id: 'pdi-p-9', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'ESQ', jenis: 'Teknis' },
  { id: 'pdi-p-10', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'Manajerial (Integritas)', jenis: 'Manajerial' },
  { id: 'pdi-p-11', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'Pemeriksaan Substantif Desain Industri', jenis: 'Teknis' },
  { id: 'pdi-p-12', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA', namaKompetensi: 'Pelatihan Fungsional Pemeriksa Desain Industri Ahli Pertama', jenis: 'Fungsional', lembaga: 'BPSDM Hukum dan HAM' },

  // PEMERIKSA DESAIN INDUSTRI AHLI MUDA
  { id: 'pdi-m-1', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Pemeriksaan Permohonan Graphical User Interface (GUI)', jenis: 'Teknis' },
  { id: 'pdi-m-2', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Sistem Pendaftaran Desain Industri Hague Agreement', jenis: 'Teknis' },
  { id: 'pdi-m-3', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Bahasa Mandarin Intermediate', jenis: 'Teknis' },
  { id: 'pdi-m-4', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Bahasa Inggris Advanced', jenis: 'Teknis' },
  { id: 'pdi-m-5', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Komunikasi Tertulis', jenis: 'Teknis' },
  { id: 'pdi-m-6', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Analisa Kebijakan Publik', jenis: 'Teknis' },
  { id: 'pdi-m-7', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Manajerial (Kerjasama)', jenis: 'Manajerial' },
  { id: 'pdi-m-8', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Manajerial (Komunikasi)', jenis: 'Manajerial' },
  { id: 'pdi-m-9', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Manajerial (Orientasi Pada Hasil)', jenis: 'Manajerial' },
  { id: 'pdi-m-10', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Manajerial (Pelayanan Publik)', jenis: 'Manajerial' },
  { id: 'pdi-m-11', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Manajerial (Pengembangan Diri dan Orang Lain)', jenis: 'Manajerial' },
  { id: 'pdi-m-12', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Manajerial (Mengelola Perubahan)', jenis: 'Manajerial' },
  { id: 'pdi-m-13', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Manajerial (Pengambilan Keputusan)', jenis: 'Manajerial' },
  { id: 'pdi-m-14', jabatan: 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA', namaKompetensi: 'Sosial Kultural (Perekat Bangsa)', jenis: 'Sosial Kultural' },

  // =========================================================================
  // ANALIS SDM APARATUR
  // =========================================================================
  // ANALIS SDM APARATUR AHLI PERTAMA
  { id: 'asdm-p-1', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Tata Naskah Dinas Elektronik', jenis: 'Teknis' },
  { id: 'asdm-p-2', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Beginner', jenis: 'Teknis' },
  { id: 'asdm-p-3', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Intermediate', jenis: 'Teknis' },
  { id: 'asdm-p-4', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Penulisan Naskah Dinas dan Karya Ilmiah', jenis: 'Teknis' },
  { id: 'asdm-p-5', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'ESQ', jenis: 'Teknis' },
  { id: 'asdm-p-6', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Manajerial (Integritas)', jenis: 'Manajerial' },
  { id: 'asdm-p-7', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Analisis Jabatan dan Analisis Beban Kerja (Anjab & ABK)', jenis: 'Teknis', lembaga: 'BKN' },
  { id: 'asdm-p-8', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Teknis Perencanaan Kebutuhan ASN', jenis: 'Teknis' },
  { id: 'asdm-p-9', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Teknis Pemberhentian dan Pensiun', jenis: 'Teknis' },
  { id: 'asdm-p-10', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Teknis Pengadaan, Formasi dan Pengadaan ASN', jenis: 'Teknis' },
  { id: 'asdm-p-11', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Teknis Pengembangan Talenta dan Karir', jenis: 'Teknis' },
  { id: 'asdm-p-12', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Teknis Penilaian Kinerja ASN Berdasarkan PermenPANRB', jenis: 'Teknis' },
  { id: 'asdm-p-13', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Teknis Pengembangan Kompetensi ASN', jenis: 'Teknis' },
  { id: 'asdm-p-14', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Teknis Konseling Karir dan Kinerja', jenis: 'Teknis' },
  { id: 'asdm-p-15', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Teknis Manajemen Talenta ASN', jenis: 'Teknis', lembaga: 'LAN RI' },
  { id: 'asdm-p-16', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Teknis Penyusunan Human Capital Development Plan (HCDP)', jenis: 'Teknis' },
  { id: 'asdm-p-17', jabatan: 'ANALIS SDM APARATUR AHLI PERTAMA', namaKompetensi: 'Pelatihan Fungsional Analis SDM Aparatur Ahli Pertama', jenis: 'Fungsional', lembaga: 'BPSDM Hukum dan HAM' },

  // ANALIS SDM APARATUR AHLI MUDA
  { id: 'asdm-m-1', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Analisis Pengembangan Kompetensi Terintegrasi', jenis: 'Teknis' },
  { id: 'asdm-m-2', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Uji Kompetensi Teknis dan Asesmen ASN', jenis: 'Teknis' },
  { id: 'asdm-m-3', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Komunikasi Tertulis', jenis: 'Teknis' },
  { id: 'asdm-m-4', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Advokasi Kebijakan Manajemen ASN', jenis: 'Teknis' },
  { id: 'asdm-m-5', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Manajerial (Kerjasama)', jenis: 'Manajerial' },
  { id: 'asdm-m-6', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Manajerial (Komunikasi)', jenis: 'Manajerial' },
  { id: 'asdm-m-7', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Manajerial (Orientasi Pada Hasil)', jenis: 'Manajerial' },
  { id: 'asdm-m-8', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Manajerial (Pelayanan Publik)', jenis: 'Manajerial' },
  { id: 'asdm-m-9', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Manajerial (Pengembangan Diri dan Orang Lain)', jenis: 'Manajerial' },
  { id: 'asdm-m-10', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Manajerial (Mengelola Perubahan)', jenis: 'Manajerial' },
  { id: 'asdm-m-11', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Manajerial (Pengambilan Keputusan)', jenis: 'Manajerial' },
  { id: 'asdm-m-12', jabatan: 'ANALIS SDM APARATUR AHLI MUDA', namaKompetensi: 'Sosial Kultural (Perekat Bangsa)', jenis: 'Sosial Kultural' },

  // =========================================================================
  // PRANATA KOMPUTER
  // =========================================================================
  // PRANATA KOMPUTER AHLI PERTAMA
  { id: 'prakom-p-1', jabatan: 'PRANATA KOMPUTER AHLI PERTAMA', namaKompetensi: 'Tata Naskah Dinas Elektronik', jenis: 'Teknis' },
  { id: 'prakom-p-2', jabatan: 'PRANATA KOMPUTER AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Beginner', jenis: 'Teknis' },
  { id: 'prakom-p-3', jabatan: 'PRANATA KOMPUTER AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Intermediate', jenis: 'Teknis' },
  { id: 'prakom-p-4', jabatan: 'PRANATA KOMPUTER AHLI PERTAMA', namaKompetensi: 'Penulisan Naskah Dinas dan Karya Ilmiah', jenis: 'Teknis' },
  { id: 'prakom-p-5', jabatan: 'PRANATA KOMPUTER AHLI PERTAMA', namaKompetensi: 'ESQ', jenis: 'Teknis' },
  { id: 'prakom-p-6', jabatan: 'PRANATA KOMPUTER AHLI PERTAMA', namaKompetensi: 'Manajerial (Integritas)', jenis: 'Manajerial' },
  { id: 'prakom-p-7', jabatan: 'PRANATA KOMPUTER AHLI PERTAMA', namaKompetensi: 'Pemrograman Web & Mobile', jenis: 'Teknis' },
  { id: 'prakom-p-8', jabatan: 'PRANATA KOMPUTER AHLI PERTAMA', namaKompetensi: 'Database Fundamental (SQL / NoSQL)', jenis: 'Teknis' },
  { id: 'prakom-p-9', jabatan: 'PRANATA KOMPUTER AHLI PERTAMA', namaKompetensi: 'Jaringan dan Keamanan Sistem Komputer', jenis: 'Teknis' },
  { id: 'prakom-p-10', jabatan: 'PRANATA KOMPUTER AHLI PERTAMA', namaKompetensi: 'Pelatihan Fungsional Pranata Komputer Tingkat Ahli', jenis: 'Fungsional', lembaga: 'BPS' },

  // PRANATA KOMPUTER AHLI MUDA
  { id: 'prakom-m-1', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Arsitektur dan Tata Kelola SPBE', jenis: 'Teknis' },
  { id: 'prakom-m-2', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Manajemen Proyek Teknologi Informasi', jenis: 'Teknis' },
  { id: 'prakom-m-3', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Audit & Keamanan Sistem Informasi', jenis: 'Teknis' },
  { id: 'prakom-m-4', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Komunikasi Tertulis', jenis: 'Teknis' },
  { id: 'prakom-m-5', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Advokasi Kebijakan TI', jenis: 'Teknis' },
  { id: 'prakom-m-6', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Manajerial (Kerjasama)', jenis: 'Manajerial' },
  { id: 'prakom-m-7', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Manajerial (Komunikasi)', jenis: 'Manajerial' },
  { id: 'prakom-m-8', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Manajerial (Orientasi Pada Hasil)', jenis: 'Manajerial' },
  { id: 'prakom-m-9', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Manajerial (Pelayanan Publik)', jenis: 'Manajerial' },
  { id: 'prakom-m-10', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Manajerial (Pengembangan Diri dan Orang Lain)', jenis: 'Manajerial' },
  { id: 'prakom-m-11', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Manajerial (Mengelola Perubahan)', jenis: 'Manajerial' },
  { id: 'prakom-m-12', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Manajerial (Pengambilan Keputusan)', jenis: 'Manajerial' },
  { id: 'prakom-m-13', jabatan: 'PRANATA KOMPUTER AHLI MUDA', namaKompetensi: 'Sosial Kultural (Perekat Bangsa)', jenis: 'Sosial Kultural' },

  // =========================================================================
  // ARSIPARIS
  // =========================================================================
  // ARSIPARIS AHLI PERTAMA
  { id: 'ars-p-1', jabatan: 'ARSIPARIS AHLI PERTAMA', namaKompetensi: 'Tata Naskah Dinas Elektronik', jenis: 'Teknis' },
  { id: 'ars-p-2', jabatan: 'ARSIPARIS AHLI PERTAMA', namaKompetensi: 'Bahasa Inggris Beginner', jenis: 'Teknis' },
  { id: 'ars-p-3', jabatan: 'ARSIPARIS AHLI PERTAMA', namaKompetensi: 'Penulisan Naskah Dinas dan Karya Ilmiah', jenis: 'Teknis' },
  { id: 'ars-p-4', jabatan: 'ARSIPARIS AHLI PERTAMA', namaKompetensi: 'ESQ', jenis: 'Teknis' },
  { id: 'ars-p-5', jabatan: 'ARSIPARIS AHLI PERTAMA', namaKompetensi: 'Manajerial (Integritas)', jenis: 'Manajerial' },
  { id: 'ars-p-6', jabatan: 'ARSIPARIS AHLI PERTAMA', namaKompetensi: 'Teknis Pengelolaan Arsip Dinamis', jenis: 'Teknis', lembaga: 'ANRI' },
  { id: 'ars-p-7', jabatan: 'ARSIPARIS AHLI PERTAMA', namaKompetensi: 'Teknis Pengelolaan Arsip Elektronik (SRIKANDI)', jenis: 'Teknis' },
  { id: 'ars-p-8', jabatan: 'ARSIPARIS AHLI PERTAMA', namaKompetensi: 'Teknis Digitalisasi Arsip', jenis: 'Teknis' },
  { id: 'ars-p-9', jabatan: 'ARSIPARIS AHLI PERTAMA', namaKompetensi: 'Teknis Pemberkasan dan Penataan Berkas', jenis: 'Teknis' },
  { id: 'ars-p-10', jabatan: 'ARSIPARIS AHLI PERTAMA', namaKompetensi: 'Pendidikan dan Pelatihan Fungsional Arsiparis Tingkat Ahli', jenis: 'Fungsional', lembaga: 'ANRI' },

  // =========================================================================
  // JABATAN STRUKTURAL (IMAGE 2)
  // =========================================================================
  // KEPALA BAGIAN PROGRAM DAN PELAPORAN
  { id: 'str-bpp-1', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Rencana Strategis', jenis: 'Teknis' },
  { id: 'str-bpp-2', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Monitoring & Evaluasi', jenis: 'Teknis' },
  { id: 'str-bpp-3', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Perencanaan & Penganggaran', jenis: 'Teknis' },
  { id: 'str-bpp-4', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Tata Naskah Dinas Elektronik', jenis: 'Teknis' },
  { id: 'str-bpp-5', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Keprotokoleran', jenis: 'Teknis' },
  { id: 'str-bpp-6', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Sertifikasi Penyusun RKA', jenis: 'Teknis' },
  { id: 'str-bpp-7', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Manajerial (Integritas)', jenis: 'Manajerial' },
  { id: 'str-bpp-8', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Manajerial (Kerjasama)', jenis: 'Manajerial' },
  { id: 'str-bpp-9', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Manajerial (Komunikasi)', jenis: 'Manajerial' },
  { id: 'str-bpp-10', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Manajerial (Orientasi Pada Hasil)', jenis: 'Manajerial' },
  { id: 'str-bpp-11', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Manajerial (Pelayanan Publik)', jenis: 'Manajerial' },
  { id: 'str-bpp-12', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Manajerial (Pengembangan Diri dan Orang Lain)', jenis: 'Manajerial' },
  { id: 'str-bpp-13', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Manajerial (Mengelola Perubahan)', jenis: 'Manajerial' },
  { id: 'str-bpp-14', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Manajerial (Pengambilan Keputusan)', jenis: 'Manajerial' },
  { id: 'str-bpp-15', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Sosial Kultural (Perekat Bangsa)', jenis: 'Sosial Kultural' },
  { id: 'str-bpp-16', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Komunikasi Tertulis', jenis: 'Teknis' },
  { id: 'str-bpp-17', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Analisa Kebijakan Publik', jenis: 'Teknis' },
  { id: 'str-bpp-18', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Penyusunan Standar Operasional Prosedur', jenis: 'Teknis' },
  { id: 'str-bpp-19', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Quality Management System', jenis: 'Teknis' },
  { id: 'str-bpp-20', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Kepemimpinan dan Mengelola Tim', jenis: 'Teknis' },
  { id: 'str-bpp-21', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Coaching dan Mentoring', jenis: 'Teknis' },
  { id: 'str-bpp-22', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Lobi dan Negosiasi', jenis: 'Teknis' },
  { id: 'str-bpp-23', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Analisis dan Evaluasi Hukum', jenis: 'Teknis' },
  { id: 'str-bpp-24', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Legal Drafting', jenis: 'Teknis' },
  { id: 'str-bpp-25', jabatan: 'KEPALA BAGIAN PROGRAM DAN PELAPORAN', namaKompetensi: 'Pelatihan Kepemimpinan Administrator / DIKLATPIM TK. III', jenis: 'Struktural', lembaga: 'BPSDM Hukum dan HAM' },

  // KEPALA SUBDIREKTORAT KERJA SAMA
  { id: 'str-ks-1', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Rencana Strategis', jenis: 'Teknis' },
  { id: 'str-ks-2', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Monitoring & Evaluasi', jenis: 'Teknis' },
  { id: 'str-ks-3', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Perencanaan & Penganggaran', jenis: 'Teknis' },
  { id: 'str-ks-4', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Tata Naskah Dinas Elektronik', jenis: 'Teknis' },
  { id: 'str-ks-5', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Keprotokoleran', jenis: 'Teknis' },
  { id: 'str-ks-6', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Manajerial (Integritas)', jenis: 'Manajerial' },
  { id: 'str-ks-7', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Manajerial (Kerjasama)', jenis: 'Manajerial' },
  { id: 'str-ks-8', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Manajerial (Komunikasi)', jenis: 'Manajerial' },
  { id: 'str-ks-9', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Manajerial (Orientasi Pada Hasil)', jenis: 'Manajerial' },
  { id: 'str-ks-10', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Manajerial (Pelayanan Publik)', jenis: 'Manajerial' },
  { id: 'str-ks-11', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Manajerial (Pengembangan Diri dan Orang Lain)', jenis: 'Manajerial' },
  { id: 'str-ks-12', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Manajerial (Mengelola Perubahan)', jenis: 'Manajerial' },
  { id: 'str-ks-13', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Manajerial (Pengambilan Keputusan)', jenis: 'Manajerial' },
  { id: 'str-ks-14', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Sosial Kultural (Perekat Bangsa)', jenis: 'Sosial Kultural' },
  { id: 'str-ks-15', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Lobi dan Negosiasi', jenis: 'Teknis' },
  { id: 'str-ks-16', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Legal English', jenis: 'Teknis' },
  { id: 'str-ks-17', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Manajemen Proyek Kerjasama', jenis: 'Teknis' },
  { id: 'str-ks-18', jabatan: 'KEPALA SUBDIREKTORAT KERJA SAMA', namaKompetensi: 'Pelatihan Kepemimpinan Administrator / DIKLATPIM TK. III', jenis: 'Struktural' },

  // KEPALA SUB BAGIAN TATA USAHA
  { id: 'str-tu-1', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Rencana Strategis', jenis: 'Teknis' },
  { id: 'str-tu-2', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Monitoring & Evaluasi', jenis: 'Teknis' },
  { id: 'str-tu-3', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Perencanaan & Penganggaran', jenis: 'Teknis' },
  { id: 'str-tu-4', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Tata Naskah Dinas Elektronik', jenis: 'Teknis' },
  { id: 'str-tu-5', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Keprotokoleran', jenis: 'Teknis' },
  { id: 'str-tu-6', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Sertifikasi Penyusun RKA', jenis: 'Teknis' },
  { id: 'str-tu-7', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Teknis Pengelolaan Arsip Dinamis', jenis: 'Teknis' },
  { id: 'str-tu-8', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Teknis Pengelolaan Arsip Elektronik', jenis: 'Teknis' },
  { id: 'str-tu-9', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Manajerial (Integritas)', jenis: 'Manajerial' },
  { id: 'str-tu-10', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Manajerial (Kerjasama)', jenis: 'Manajerial' },
  { id: 'str-tu-11', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Manajerial (Komunikasi)', jenis: 'Manajerial' },
  { id: 'str-tu-12', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Manajerial (Orientasi Pada Hasil)', jenis: 'Manajerial' },
  { id: 'str-tu-13', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Manajerial (Pelayanan Publik)', jenis: 'Manajerial' },
  { id: 'str-tu-14', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Manajerial (Pengembangan Diri dan Orang Lain)', jenis: 'Manajerial' },
  { id: 'str-tu-15', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Manajerial (Mengelola Perubahan)', jenis: 'Manajerial' },
  { id: 'str-tu-16', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Manajerial (Pengambilan Keputusan)', jenis: 'Manajerial' },
  { id: 'str-tu-17', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Sosial Kultural (Perekat Bangsa)', jenis: 'Sosial Kultural' },
  { id: 'str-tu-18', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Komunikasi Tertulis', jenis: 'Teknis' },
  { id: 'str-tu-19', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Analisa Kebijakan Publik', jenis: 'Teknis' },
  { id: 'str-tu-20', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Sertifikasi Kompetensi Pengadaan Barang/Jasa Pemerintah Level-1', jenis: 'Teknis' },
  { id: 'str-tu-21', jabatan: 'KEPALA SUB BAGIAN TATA USAHA', namaKompetensi: 'Pelatihan Kepemimpinan Pengawas / DIKLATPIM TK. IV', jenis: 'Struktural' },

  // KEPALA SUBDIREKTORAT PENINDAKAN DAN PENYIDIKAN
  { id: 'str-pp-1', jabatan: 'KEPALA SUBDIREKTORAT PENINDAKAN DAN PENYIDIKAN', namaKompetensi: 'Hukum Acara', jenis: 'Teknis' },
  { id: 'str-pp-2', jabatan: 'KEPALA SUBDIREKTORAT PENINDAKAN DAN PENYIDIKAN', namaKompetensi: 'Mediasi', jenis: 'Teknis' },
  { id: 'str-pp-3', jabatan: 'KEPALA SUBDIREKTORAT PENINDAKAN DAN PENYIDIKAN', namaKompetensi: 'Penyidik Pegawai Negeri Sipil (PPNS)', jenis: 'Teknis' },
  { id: 'str-pp-4', jabatan: 'KEPALA SUBDIREKTORAT PENINDAKAN DAN PENYIDIKAN', namaKompetensi: 'Manajerial (Pengambilan Keputusan)', jenis: 'Manajerial' },
  { id: 'str-pp-5', jabatan: 'KEPALA SUBDIREKTORAT PENINDAKAN DAN PENYIDIKAN', namaKompetensi: 'Pelatihan Kepemimpinan Administrator / DIKLATPIM TK. III', jenis: 'Struktural' }
];

/**
 * Daftar Jabatan Unik
 */
export const LIST_JABATAN_STANDAR = Array.from(
  new Set(MASTER_KOMPETENSI_JABATAN.map(item => item.jabatan))
);

/**
 * Mendapatkan daftar kompetensi standar berdasarkan string nama jabatan.
 * Dilengkapi pencarian fuzzy matching agar cocok dengan penamaan di database pegawai.
 */
export function getKompetensiByJabatan(namaJabatanRaw: string): {
  matchedJabatan: string;
  kompetensiList: KompetensiItem[];
} {
  if (!namaJabatanRaw) {
    const fallback = 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA';
    return {
      matchedJabatan: fallback,
      kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === fallback)
    };
  }

  const clean = namaJabatanRaw.toUpperCase();

  // 1. Cek Exact Match
  const exact = LIST_JABATAN_STANDAR.find(j => clean.includes(j) || j.includes(clean));
  if (exact) {
    return {
      matchedJabatan: exact,
      kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === exact)
    };
  }

  // 2. Cek Berdasarkan Kata Kunci Utama
  // Analis KI
  if (clean.includes('KEKAYAAN INTELEKTUAL') || clean.includes('ANALIS KI') || clean.includes('ANALIS PENGEMBANGAN')) {
    if (clean.includes('MUDA')) {
      const j = 'ANALIS KEKAYAAN INTELEKTUAL AHLI MUDA';
      return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
    }
    if (clean.includes('MADYA')) {
      const j = 'ANALIS KEKAYAAN INTELEKTUAL AHLI MADYA';
      return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
    }
    const j = 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA';
    return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
  }

  // Merek
  if (clean.includes('MEREK')) {
    if (clean.includes('MUDA')) {
      const j = 'PEMERIKSA MEREK AHLI MUDA';
      return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
    }
    const j = 'PEMERIKSA MEREK AHLI PERTAMA';
    return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
  }

  // Paten
  if (clean.includes('PATEN')) {
    if (clean.includes('MUDA')) {
      const j = 'PEMERIKSA PATEN AHLI MUDA';
      return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
    }
    const j = 'PEMERIKSA PATEN AHLI PERTAMA';
    return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
  }

  // Desain Industri
  if (clean.includes('DESAIN')) {
    if (clean.includes('MUDA')) {
      const j = 'PEMERIKSA DESAIN INDUSTRI AHLI MUDA';
      return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
    }
    const j = 'PEMERIKSA DESAIN INDUSTRI AHLI PERTAMA';
    return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
  }

  // SDM
  if (clean.includes('SDM') || clean.includes('KEPEGAWAIAN')) {
    if (clean.includes('MUDA')) {
      const j = 'ANALIS SDM APARATUR AHLI MUDA';
      return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
    }
    const j = 'ANALIS SDM APARATUR AHLI PERTAMA';
    return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
  }

  // Komputer / IT
  if (clean.includes('KOMPUTER') || clean.includes('TI') || clean.includes('INFORMATIKA')) {
    if (clean.includes('MUDA')) {
      const j = 'PRANATA KOMPUTER AHLI MUDA';
      return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
    }
    const j = 'PRANATA KOMPUTER AHLI PERTAMA';
    return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
  }

  // Arsiparis
  if (clean.includes('ARSIP')) {
    const j = 'ARSIPARIS AHLI PERTAMA';
    return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
  }

  // Program dan Pelaporan
  if (clean.includes('PROGRAM') || clean.includes('PELAPORAN') || clean.includes('PERENCANAAN')) {
    const j = 'KEPALA BAGIAN PROGRAM DAN PELAPORAN';
    return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
  }

  // Tata Usaha
  if (clean.includes('TATA USAHA') || clean.includes('SUBAG TU')) {
    const j = 'KEPALA SUB BAGIAN TATA USAHA';
    return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
  }

  // Kerja Sama
  if (clean.includes('KERJA SAMA') || clean.includes('KERJASAMA')) {
    const j = 'KEPALA SUBDIREKTORAT KERJA SAMA';
    return { matchedJabatan: j, kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === j) };
  }

  // Default Fallback
  const fallback = 'ANALIS KEKAYAAN INTELEKTUAL AHLI PERTAMA';
  return {
    matchedJabatan: fallback,
    kompetensiList: MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === fallback)
  };
}
