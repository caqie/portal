import { MasterLayanan } from './types';

export interface LayananCategory {
  id: string;
  nama: string;
  deskripsi: string;
  icon: string;
  color: string;
  badgeBg: string;
}

export const LAYANAN_CATEGORIES: LayananCategory[] = [
  {
    id: 'KEPANGKATAN_KARIR',
    nama: 'Kepangkatan & Karir',
    deskripsi: 'Kenaikan Pangkat, Kenaikan Jabatan, Promosi, Pencantuman Gelar, Penyesuaian Ijazah, Ujian Dinas & Penghargaan',
    icon: 'bi-award-fill',
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'KENAIKAN_GAJI',
    nama: 'Gaji & Kesejahteraan',
    deskripsi: 'Kenaikan Gaji Berkala (KGB), Jaminan Sosial, JHT, Kesehatan & Taperum',
    icon: 'bi-cash-stack',
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'PENGEMBANGAN_PENDIDIKAN',
    nama: 'Pengembangan & Pendidikan',
    deskripsi: 'Tugas Belajar, Izin Belajar, Penelitian, Magang, dan Pelatihan Kompetensi',
    icon: 'bi-mortarboard-fill',
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'MUTASI_JABATAN',
    nama: 'Mutasi & Penempatan',
    deskripsi: 'Mutasi Internal DJKI, Mutasi Antar-Instansi/Kanwil, dan Perpindahan Jabatan',
    icon: 'bi-arrow-left-right',
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'KELUARGA_STATUS',
    nama: 'Status & Administrasi Keluarga',
    deskripsi: 'Pernikahan, Perceraian, Kelahiran Anak, dan Kartu Istri/Suami (KARIS/KARSU)',
    icon: 'bi-people-fill',
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'PENSIUN_PURNA',
    nama: 'Pensiun & Purna Bakti',
    deskripsi: 'Usulan Pensiun BUP/APS, Program Pembekalan Purna Bakti, dan Hak Taspen',
    icon: 'bi-door-open-fill',
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  {
    id: 'HUKUM_DISIPLIN',
    nama: 'Hukum & Disiplin',
    deskripsi: 'Perlindungan Hukum ASN, Administrasi Disiplin, dan Klarifikasi Kepatuhan',
    icon: 'bi-shield-shaded',
    color: 'text-red-600',
    badgeBg: 'bg-red-50 text-red-700 border-red-200'
  },
  {
    id: 'KONSULTASI_ADMINISTRASI',
    nama: 'Konsultasi & Layanan Lainnya',
    deskripsi: 'Konsultasi Kepegawaian, Surat Keterangan Aktif, Legalisasi Berkas, dan Layanan SDM Lainnya',
    icon: 'bi-chat-dots-fill',
    color: 'text-cyan-600',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  }
];

export const MASTER_LAYANAN_DATA: MasterLayanan[] = [
  // 1. Kenaikan Pangkat
  {
    id: 'LYN-KP-01',
    kodeLayanan: 'KENAIKAN_PANGKAT',
    kategori: 'KEPANGKATAN_KARIR',
    namaLayanan: 'Kenaikan Pangkat',
    deskripsi: 'Pengusulan Kenaikan Pangkat Reguler, Pilihan (Struktural), Jabatan Fungsional (JFT), dan Penyesuaian Ijazah periode 6 kali setahun.',
    aktif: true,
    slaHari: 5,
    icon: 'bi-award',
    fields: [
      { name: 'jenisKenaikan', label: 'Jenis Kenaikan Pangkat', type: 'select', options: ['Reguler', 'Jabatan Fungsional Tertentu (JFT)', 'Pilihan (Struktural)', 'Penyesuaian Ijazah', 'Kenaikan Pangkat Luar Biasa (KPLB)'], required: true },
      { name: 'golonganLama', label: 'Pangkat / Golongan Saat Ini', type: 'text', placeholder: 'Contoh: Penata Muda / III/a', required: true },
      { name: 'golonganDiusulkan', label: 'Pangkat / Golongan yang Diusulkan', type: 'text', placeholder: 'Contoh: Penata Muda Tk.I / III/b', required: true },
      { name: 'periodeKenaikan', label: 'Periode Kenaikan Pangkat', type: 'select', options: ['Februari', 'April', 'Juni', 'Agustus', 'Oktober', 'Desember'], required: true },
      { name: 'nomorPakTerakhir', label: 'Nomor Penetapan Angka Kredit (PAK) Terakhir (Bila JF)', type: 'text', placeholder: 'Nomor PAK Konversi / Integrasi...', required: false },
      { name: 'keterangan', label: 'Keterangan Tambahan', type: 'textarea', placeholder: 'Catatan tambahan terkait usulan kenaikan pangkat...', required: false }
    ],
    requiredDocuments: [
      { id: 'doc_sk_pangkat_terakhir', label: 'Scan SK Pangkat Terakhir (PDF)', required: true, description: 'SK Kenaikan Pangkat terakhir' },
      { id: 'doc_skp_2tahun', label: 'SKP 2 Tahun Terakhir (Predikat Minimal Baik)', required: true, description: 'Hasil evaluasi kinerja 2 tahun terakhir' },
      { id: 'doc_pak_terakhir', label: 'PAK Konversi / Integrasi Terakhir (Khusus JF)', required: false, description: 'PAK resmi yang telah disahkan' },
      { id: 'doc_sk_jabatan', label: 'SK Jabatan & SPMT Terakhir', required: false, description: 'Bagi pejabat struktural / fungsional' }
    ]
  },

  // 2. Kenaikan Jabatan
  {
    id: 'LYN-KJ-01',
    kodeLayanan: 'KENAIKAN_JABATAN',
    kategori: 'KEPANGKATAN_KARIR',
    namaLayanan: 'Kenaikan Jabatan',
    deskripsi: 'Permohonan pengangkatan / kenaikan jenjang Jabatan Fungsional (Pertama, Muda, Madya, Utama) atau pengangkatan jabatan struktural.',
    aktif: true,
    slaHari: 5,
    icon: 'bi-person-badge-fill',
    fields: [
      { name: 'jenjangLama', label: 'Jenjang Jabatan Saat Ini', type: 'text', placeholder: 'Contoh: Pemeriksa Paten Ahli Pertama', required: true },
      { name: 'jenjangBaru', label: 'Jenjang Jabatan yang Dituju', type: 'text', placeholder: 'Contoh: Pemeriksa Paten Ahli Muda', required: true },
      { name: 'nomorSertifikatUkom', label: 'Nomor Sertifikat Lulus Uji Kompetensi (Ukom)', type: 'text', placeholder: 'Nomor sertifikat ukom...', required: true },
      { name: 'tanggalUkom', label: 'Tanggal Kelulusan Ukom', type: 'date', required: true },
      { name: 'formasiTersedia', label: 'Ketersediaan Formasi (Anjab/ABK)', type: 'select', options: ['Formasi Tersedia di Unit Kerja', 'Konfirmasi Subbag Kepegawaian'], required: true }
    ],
    requiredDocuments: [
      { id: 'doc_sertifikat_ukom', label: 'Sertifikat Kelulusan Uji Kompetensi (PDF)', required: true, description: 'Bukti kelulusan uji kompetensi jenjang jabatan' },
      { id: 'doc_sk_jf_terakhir', label: 'SK Jabatan Fungsional Terakhir (PDF)', required: true, description: 'SK JF sebelumnya' },
      { id: 'doc_pak_integrasi', label: 'PAK Integrasi / Konversi Memenuhi Angka Kredit Kumulatif (PDF)', required: true, description: 'Bukti PAK yang mencukupi' }
    ]
  },

  // 3. KGB (Kenaikan Gaji Berkala)
  {
    id: 'LYN-KG-01',
    kodeLayanan: 'KGB',
    kategori: 'KENAIKAN_GAJI',
    namaLayanan: 'KGB (Kenaikan Gaji Berkala)',
    deskripsi: 'Pengajuan penerbitan Surat Pemberitahuan Kenaikan Gaji Berkala (KGB) bagi PNS/PPPK yang telah mencapai 2 tahun masa kerja berkala.',
    aktif: true,
    slaHari: 3,
    icon: 'bi-cash-coin',
    fields: [
      { name: 'tmtKgbTerakhir', label: 'TMT KGB / Pangkat Terakhir', type: 'date', required: true },
      { name: 'nomorSkKgbTerakhir', label: 'Nomor Surat KGB / SK Pangkat Terakhir', type: 'text', placeholder: 'Nomor surat KGB lama...', required: true },
      { name: 'gajiPokokLama', label: 'Gaji Pokok Terakhir (Rp)', type: 'number', placeholder: 'Contoh: 3500000', required: true },
      { name: 'tmtKgbBaru', label: 'TMT KGB Baru yang Diusulkan', type: 'date', required: true },
      { name: 'masaKerjaGolongan', label: 'Masa Kerja Golongan (Tahun/Bulan)', type: 'text', placeholder: 'Contoh: 08 Tahun 00 Bulan', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_sk_kgb_lama', label: 'Scan SK KGB Terakhir / SK Pangkat Terakhir (PDF)', required: true, description: 'Dasar penetapan gaji pokok sebelumnya' },
      { id: 'doc_skp_terakhir', label: 'SKP Tahun Terakhir (Minimal Baik)', required: true, description: 'Syarat penilaian kinerja KGB' }
    ]
  },

  // 4. Pencantuman Gelar
  {
    id: 'LYN-PG-01',
    kodeLayanan: 'PENCANTUMAN_GELAR',
    kategori: 'KEPANGKATAN_KARIR',
    namaLayanan: 'Pencantuman Gelar',
    deskripsi: 'Usulan penerbitan Surat Keputusan Pencantuman Gelar Akademik (S1, S2, S3, atau Spesialis) pada database SIASN BKN dan dokumen kepegawaian.',
    aktif: true,
    slaHari: 5,
    icon: 'bi-mortarboard',
    fields: [
      { name: 'gelarAkademik', label: 'Gelar Akademik yang Diajukan', type: 'text', placeholder: 'Contoh: S.H., M.H., M.Sc., Ph.D.', required: true },
      { name: 'jenjangPendidikan', label: 'Jenjang Pendidikan', type: 'select', options: ['S-1 (Sarjana)', 'S-2 (Magister)', 'S-3 (Doktor)', 'Profesi / Spesialis'], required: true },
      { name: 'namaUniversitas', label: 'Nama Perguruan Tinggi', type: 'text', placeholder: 'Contoh: Universitas Indonesia', required: true },
      { name: 'nomorIjazah', label: 'Nomor Ijazah', type: 'text', placeholder: 'Nomor seri ijazah...', required: true },
      { name: 'nomorSkIzinBelajar', label: 'Nomor SK Tugas Belajar / Izin Belajar', type: 'text', placeholder: 'Nomor SK Izin Belajar...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_ijazah_asli', label: 'Scan Ijazah Asli & Transkrip Nilai (PDF)', required: true, description: 'Ijazah kelulusan perguruan tinggi' },
      { id: 'doc_sk_izin_belajar', label: 'SK Izin Belajar / Tugas Belajar Resmi (PDF)', required: true, description: 'SK izin/tugas belajar dari Kemenkumham' },
      { id: 'doc_akreditasi_kampus', label: 'Bukti Akreditasi Program Studi / Kampus (Minimal B / Baik Sekali)', required: true, description: 'Sertifikat BAN-PT / LAM' }
    ]
  },

  // 5. Penyesuaian Ijazah
  {
    id: 'LYN-PI-01',
    kodeLayanan: 'PENYESUAIAN_IJAZAH',
    kategori: 'KEPANGKATAN_KARIR',
    namaLayanan: 'Penyesuaian Ijazah',
    deskripsi: 'Pengajuan usulan kenaikan pangkat / penyesuaian golongan ruang berdasarkan ijazah yang diperoleh melalui ujian penyesuaian kenaikan pangkat (UPKP).',
    aktif: true,
    slaHari: 5,
    icon: 'bi-file-earmark-diff',
    fields: [
      { name: 'ijazahPenyesuaian', label: 'Ijazah yang Disesuaikan', type: 'select', options: ['Ijazah S-1 / D-IV (Kenaikan ke Golongan III/a)', 'Ijazah S-2 (Kenaikan ke Golongan III/b)', 'Ijazah S-3 (Kenaikan ke Golongan III/c)'], required: true },
      { name: 'nomorStlud', label: 'Nomor Surat Tanda Lulus UPKP / Ujian Penyesuaian', type: 'text', placeholder: 'Nomor sertifikat kelulusan ujian penyesuaian...', required: true },
      { name: 'relevansiTugas', label: 'Uraian Relevansi Ijazah dengan Tupoksi Unit Kerja', type: 'textarea', placeholder: 'Jelaskan keterkaitan kompetensi ijazah baru dengan tugas DJKI...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_stlud_upkp', label: 'Surat Tanda Lulus UPKP (PDF)', required: true, description: 'Sertifikat kelulusan ujian kenaikan pangkat penyesuaian ijazah' },
      { id: 'doc_ijazah_transkrip_pi', label: 'Ijazah & Transkrip Nilai Legalisir (PDF)', required: true, description: 'Ijazah baru' },
      { id: 'doc_uraian_tugas', label: 'Surat Keterangan Uraian Tugas dari Pimpinan Unit Kerja (PDF)', required: true, description: 'Format persetujuan Eselon II' }
    ]
  },

  // 6. Ujian Dinas
  {
    id: 'LYN-UD-01',
    kodeLayanan: 'UJIAN_DINAS',
    kategori: 'KEPANGKATAN_KARIR',
    namaLayanan: 'Ujian Dinas',
    deskripsi: 'Pendaftaran dan verifikasi berkas peserta Ujian Dinas Tingkat I (Golongan II/d ke III/a) dan Ujian Dinas Tingkat II (Golongan III/d ke IV/a).',
    aktif: true,
    slaHari: 4,
    icon: 'bi-pencil-square',
    fields: [
      { name: 'tingkatUjian', label: 'Tingkat Ujian Dinas', type: 'select', options: ['Ujian Dinas Tingkat I (Pangkat Pengatur Tk.I / II/d ke Penata Muda / III/a)', 'Ujian Dinas Tingkat II (Pangkat Penata Tk.I / III/d ke Pembina / IV/a)'], required: true },
      { name: 'pangkatSaatIni', label: 'Pangkat / Golongan Saat Ini', type: 'text', placeholder: 'Contoh: Pengatur Tk. I / II/d', required: true },
      { name: 'tmtPangkat', label: 'TMT Pangkat Terakhir', type: 'date', required: true },
      { name: 'masaKerjaTahun', label: 'Masa Kerja dalam Pangkat Terakhir (Tahun)', type: 'number', placeholder: 'Minimal 2 tahun...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_sk_pangkat_terakhir_ud', label: 'SK Pangkat Terakhir (PDF)', required: true, description: 'SK Pangkat II/d atau III/d' },
      { id: 'doc_skp_terakhir_ud', label: 'SKP 1 Tahun Terakhir (PDF)', required: true, description: 'Nilai SKP minimal Baik' },
      { id: 'doc_surat_rekomendasi_atasan', label: 'Surat Rekomendasi / Usulan Pimpinan Unit Kerja', required: true, description: 'Persetujuan pimpinan satuan kerja' }
    ]
  },

  // 7. Penelitian
  {
    id: 'LYN-PL-01',
    kodeLayanan: 'PENELITIAN',
    kategori: 'PENGEMBANGAN_PENDIDIKAN',
    namaLayanan: 'Penelitian',
    deskripsi: 'Izin pelaksanaan penelitian, riset ilmiah, survei kepegawaian, atau studi kebijakan di lingkungan Direktorat Jenderal Kekayaan Intelektual.',
    aktif: true,
    slaHari: 3,
    icon: 'bi-journal-code',
    fields: [
      { name: 'judulPenelitian', label: 'Judul / Topik Penelitian', type: 'text', placeholder: 'Contoh: Analisis Efektivitas Pemeriksaan Paten Sederhana di DJKI', required: true },
      { name: 'tujuanPenelitian', label: 'Tujuan Penelitian & Manfaat bagi DJKI', type: 'textarea', placeholder: 'Uraikan tujuan, metodologi, dan output riset...', required: true },
      { name: 'unitTujuanRiset', label: 'Unit Kerja / Direktorat Lokasi Penelitian', type: 'text', placeholder: 'Contoh: Direktorat Paten, DTLST dan RD', required: true },
      { name: 'jadwalPenelitian', label: 'Rencana Waktu Penelitian (Mulai s.d Selesai)', type: 'text', placeholder: 'Contoh: 1 Mei 2026 s.d 30 Juni 2026', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_proposal_penelitian', label: 'Proposal Penelitian / Kerangka Acuan Riset (PDF)', required: true, description: 'Dokumen proposal lengkap' },
      { id: 'doc_surat_pengantar_kampus', label: 'Surat Pengantar dari Universitas / Lembaga Riset (PDF)', required: true, description: 'Surat resmi permohonan riset' }
    ]
  },

  // 8. Magang
  {
    id: 'LYN-MG-01',
    kodeLayanan: 'MAGANG',
    kategori: 'PENGEMBANGAN_PENDIDIKAN',
    namaLayanan: 'Magang',
    deskripsi: 'Permohonan rekomendasi / fasilitasi program Magang Mahasiswa, PKL, Prakerin, atau Magang Kerja ASN antar-instansi/industri KI.',
    aktif: true,
    slaHari: 3,
    icon: 'bi-briefcase',
    fields: [
      { name: 'jenisProgramMagang', label: 'Jenis Program Magang', type: 'select', options: ['Magang Mandiri Mahasiswa / Siswa (PKL)', 'Magang MBKM (Kampus Merdeka)', 'Magang Pertukaran ASN / Instansi Lain', 'Magang Industri KI Eksternal'], required: true },
      { name: 'institusiAsal', label: 'Nama Universitas / Sekolah / Instansi Asal', type: 'text', placeholder: 'Nama kampus / sekolah...', required: true },
      { name: 'jurusanProgramStudi', label: 'Jurusan / Program Studi', type: 'text', placeholder: 'Contoh: Ilmu Hukum / Sistem Informasi', required: true },
      { name: 'durasiMagang', label: 'Durasi Magang (Bulan)', type: 'text', placeholder: 'Contoh: 3 Bulan (Februari - April 2026)', required: true },
      { name: 'unitPenempatanDiinginkan', label: 'Unit Kerja Penempatan yang Diminati', type: 'text', placeholder: 'Contoh: Bagian Kepegawaian / Dit. Merek', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_surat_kampus_magang', label: 'Surat Permohonan Resmi dari Dekanat / Rektorat / Sekolah (PDF)', required: true, description: 'Surat pengantar permohonan magang' },
      { id: 'doc_cv_portofolio', label: 'Curriculum Vitae (CV) & Transkrip Nilai Terbaru (PDF)', required: true, description: 'Profil dan nilai akademik pemohon' }
    ]
  },

  // 9. Tugas Belajar
  {
    id: 'LYN-TB-01',
    kodeLayanan: 'TUGAS_BELAJAR',
    kategori: 'PENGEMBANGAN_PENDIDIKAN',
    namaLayanan: 'Tugas Belajar',
    deskripsi: 'Pengajuan Tugas Belajar (Beasiswa / Mandiri) dan Izin Belajar bagi pegawai untuk melanjutkan studi formal jenjang S1, S2, S3 dalam dan luar negeri.',
    aktif: true,
    slaHari: 5,
    icon: 'bi-mortarboard-fill',
    fields: [
      { name: 'jalurStudi', label: 'Jalur Studi', type: 'select', options: ['Tugas Belajar Beasiswa (LPDP / Instansi / Donor)', 'Tugas Belajar Mandiri', 'Izin Belajar (Di Luar Jam Kerja)'], required: true },
      { name: 'jenjangPendidikan', label: 'Jenjang Pendidikan', type: 'select', options: ['S-1 / D-IV', 'S-2 (Magister)', 'S-3 (Doktor)', 'Profesi / Spesialis'], required: true },
      { name: 'namaUniversitas', label: 'Nama Perguruan Tinggi', type: 'text', placeholder: 'Contoh: Universitas Indonesia / WIPO Academy', required: true },
      { name: 'programStudi', label: 'Program Studi / Jurusan', type: 'text', placeholder: 'Contoh: Master of Intellectual Property Law', required: true },
      { name: 'sumberPembiayaan', label: 'Sumber Pembiayaan', type: 'select', options: ['Beasiswa LPDP', 'Beasiswa Kemenkumham / DJKI', 'Beasiswa Pemerintah Asing (AAS/Chevening/dll)', 'Biaya Mandiri'], required: true },
      { name: 'lamaStudi', label: 'Estimasi Durasi Studi', type: 'text', placeholder: 'Contoh: 24 Bulan (2 Tahun)', required: true },
      { name: 'tanggalMulai', label: 'Tanggal Mulai Perkuliahan', type: 'date', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_loa_unconditional', label: 'Letter of Acceptance (LoA) Resmi dari Perguruan Tinggi (PDF)', required: true, description: 'Surat penerimaan universitas' },
      { id: 'doc_sponsor_beasiswa', label: 'Surat Jaminan Pembiayaan / Bukti Kelulusan Beasiswa (PDF)', required: true, description: 'Letter of Guarantee sponsor' },
      { id: 'doc_rekomendasi_pimpinan', label: 'Surat Rekomendasi Pimpinan Unit Kerja Eselon II (PDF)', required: true, description: 'Persetujuan pimpinan unit kerja' }
    ]
  },

  // 10. Mutasi
  {
    id: 'LYN-MT-01',
    kodeLayanan: 'MUTASI',
    kategori: 'MUTASI_JABATAN',
    namaLayanan: 'Mutasi',
    deskripsi: 'Permohonan mutasi internal antar-Direktorat/Bagian di DJKI, mutasi masuk ke DJKI, atau mutasi keluar ke Kanwil/Kementerian lain.',
    aktif: true,
    slaHari: 7,
    icon: 'bi-arrow-left-right',
    fields: [
      { name: 'jenisMutasi', label: 'Jenis Permohonan Mutasi', type: 'select', options: ['Mutasi Internal Antar-Direktorat/Bagian di DJKI', 'Mutasi Keluar ke Kanwil Kemenkumham', 'Mutasi Keluar ke Unit Utama Lain di Kemenkumham', 'Mutasi Antar-Kementerian / Lembaga Pemerintah', 'Mutasi Masuk ke DJKI'], required: true },
      { name: 'unitAsal', label: 'Unit Kerja Saat Ini', type: 'text', placeholder: 'Unit kerja saat ini...', required: true },
      { name: 'unitTujuan', label: 'Unit Kerja / Instansi Tujuan', type: 'text', placeholder: 'Unit / Instansi tujuan...', required: true },
      { name: 'alasanMutasi', label: 'Alasan Permohonan Mutasi', type: 'textarea', placeholder: 'Jelaskan alasan keluarga, kompetensi, domisili, atau pengembangan karir...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_surat_permohonan_mutasi', label: 'Surat Permohonan Pribadi Bermaterai Rp 10.000 (PDF)', required: true, description: 'Surat permohonan ditujukan kepada Direktur Jenderal KI' },
      { id: 'doc_rekomendasi_eselon2', label: 'Surat Rekomendasi / Keterangan Tidak Keberatan dari Pimpinan Unit Asal (PDF)', required: true, description: 'Persetujuan atasan langsung' },
      { id: 'doc_dossier_skp', label: 'SK Pangkat & SKP 2 Tahun Terakhir (PDF)', required: true, description: 'Portofolio kinerja' }
    ]
  },

  // 11. Promosi
  {
    id: 'LYN-PR-01',
    kodeLayanan: 'PROMOSI',
    kategori: 'KEPANGKATAN_KARIR',
    namaLayanan: 'Promosi',
    deskripsi: 'Pengusulan talent pool, verifikasi kualifikasi, dan pendaftaran seleksi terbuka / talent scouting promosi jabatan manajerial dan fungsional ahli.',
    aktif: true,
    slaHari: 7,
    icon: 'bi-star-fill',
    fields: [
      { name: 'jenisPromosi', label: 'Kategori Promosi Jabatan', type: 'select', options: ['Promosi Jabatan Pengawas (Eselon IV / Ketua Tim Kerja)', 'Promosi Jabatan Administrator (Eselon III)', 'Promosi Jabatan Fungsional Ahli Madya / Utama', 'Pendaftaran Manajemen Talenta (Nine Box)'], required: true },
      { name: 'jabatanTarget', label: 'Jabatan / Bidang Tugas yang Ditargetkan', type: 'text', placeholder: 'Contoh: Kepala Subbagian / Pemeriksa Ahli Madya', required: true },
      { name: 'nilaiKinerjaSkp', label: 'Predikat Kinerja SKP 2 Tahun Terakhir', type: 'select', options: ['Sangat Baik', 'Baik'], required: true },
      { name: 'ringkasanPrestasi', label: 'Ringkasan Inovasi / Prestasi Kerja Signifikan', type: 'textarea', placeholder: 'Uraikan inovasi, karya tulis, sistem yang dikembangkan, atau prestasi luar biasa...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_rekap_talenta', label: 'Portofolio Riwayat Hidup / CV Eksekutif Lengkap (PDF)', required: true, description: 'Profil kompetensi dan pengalaman kerja' },
      { id: 'doc_sertifikat_uji_potensi', label: 'Hasil Uji Kompetensi / Assessment Center (jika ada)', required: false, description: 'Laporan hasil assessment' },
      { id: 'doc_piagam_penghargaan', label: 'Bukti Inovasi / Piagam Penghargaan (PDF)', required: false, description: 'Sertifikat apresiasi kerja' }
    ]
  },

  // 12. Pernikahan
  {
    id: 'LYN-PN-01',
    kodeLayanan: 'PERNIKAHAN',
    kategori: 'KELUARGA_STATUS',
    namaLayanan: 'Pernikahan',
    deskripsi: 'Pemberitahuan resmi pernikahan pertama PNS / PPPK dan permohonan pendaftaran pasangan pada tunjangan keluarga (KP4) dan BPJS.',
    aktif: true,
    slaHari: 3,
    icon: 'bi-heart-fill',
    fields: [
      { name: 'namaPasangan', label: 'Nama Lengkap Suami / Istri', type: 'text', placeholder: 'Nama lengkap pasangan...', required: true },
      { name: 'nikPasangan', label: 'NIK (No. KTP) Pasangan', type: 'text', placeholder: '16 digit NIK...', required: true },
      { name: 'pekerjaanPasangan', label: 'Pekerjaan Pasangan', type: 'select', options: ['PNS / PPPK / TNI / POLRI', 'Karyawan Swasta / BUMN', 'Wiraswasta', 'Ibu Rumah Tangga / Tidak Bekerja'], required: true },
      { name: 'nipPasanganAsn', label: 'NIP Pasangan (Bila Pasangan adalah ASN)', type: 'text', placeholder: 'Isi jika pasangan PNS/PPPK...', required: false },
      { name: 'tanggalPernikahan', label: 'Tanggal Akad Nikah / Pernikahan', type: 'date', required: true },
      { name: 'nomorBukuNikah', label: 'Nomor Akta / Buku Nikah', type: 'text', placeholder: 'Nomor register KUA / Catatan Sipil...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_buku_nikah_lengkap', label: 'Scan Buku Nikah / Akta Perkawinan Lengkap (PDF)', required: true, description: 'Halaman identitas dan legalisasi KUA/Disdukcapil' },
      { id: 'doc_ktp_kk_pasangan', label: 'KTP Pasangan & Kartu Keluarga Terbaru (PDF)', required: true, description: 'KK yang sudah tercantum nama pasangan' },
      { id: 'doc_surat_laporan_pernikahan', label: 'Surat Laporan Perkawinan Pertama (Formulir Model I/II)', required: true, description: 'Formulir laporan pernikahan resmi ASN' }
    ]
  },

  // 13. Perceraian
  {
    id: 'LYN-PC-01',
    kodeLayanan: 'PERCERAIAN',
    kategori: 'KELUARGA_STATUS',
    namaLayanan: 'Perceraian',
    deskripsi: 'Permohonan Izin Perceraian / Surat Keterangan Perceraian bagi PNS sesuai ketentuan PP No. 10 Tahun 1983 jo PP No. 45 Tahun 1990.',
    aktif: true,
    slaHari: 7,
    icon: 'bi-heartbreak-fill',
    fields: [
      { name: 'kedudukanPihak', label: 'Kedudukan Hukum Pemohon', type: 'select', options: ['Penggugat (Mengajukan Permohonan Izin Perceraian)', 'Tergugat (Mengajukan Surat Keterangan Perceraian)'], required: true },
      { name: 'namaPasanganCerai', label: 'Nama Lengkap Suami / Istri', type: 'text', placeholder: 'Nama pasangan...', required: true },
      { name: 'alasanPerceraian', label: 'Alasan / Pokok Masalah Perceraian', type: 'textarea', placeholder: 'Uraikan secara kronologis permasalahan dan upaya mediasi yang telah ditempuh...', required: true },
      { name: 'jumlahAnak', label: 'Jumlah Anak dari Pernikahan', type: 'number', placeholder: '0 jika belum ada anak', required: true },
      { name: 'statusMediasi', label: 'Status Mediasi / Konseling Atasan', type: 'select', options: ['Sudah Dimediasi oleh Atasan Langsung', 'Belum Dilakukan Mediasi'], required: true }
    ],
    requiredDocuments: [
      { id: 'doc_surat_permohonan_cerai', label: 'Surat Permohonan Izin Cerai Ditujukan ke Menkumham / Sekjen (PDF)', required: true, description: 'Surat resmi permohonan izin perceraian' },
      { id: 'doc_bap_mediasi', label: 'Berita Acara Pemeriksaan (BAP) / Mediasi Atasan Langsung (PDF)', required: true, description: 'Hasil konseling mediasi unit kerja' },
      { id: 'doc_buku_nikah_cerai', label: 'Salinan Buku Nikah / KTP / KK (PDF)', required: true, description: 'Dokumen pernikahan awal' }
    ]
  },

  // 14. Kelahiran Anak
  {
    id: 'LYN-KA-01',
    kodeLayanan: 'KELAHIRAN_ANAK',
    kategori: 'KELUARGA_STATUS',
    namaLayanan: 'Kelahiran Anak',
    deskripsi: 'Pemberitahuan kelahiran anak, pembaruan data anggota keluarga, dan pendaftaran hak tunjangan anak (KP4) serta BPJS Kesehatan.',
    aktif: true,
    slaHari: 3,
    icon: 'bi-person-hearts',
    fields: [
      { name: 'namaAnak', label: 'Nama Lengkap Anak', type: 'text', placeholder: 'Nama lengkap bayi/anak...', required: true },
      { name: 'nikAnak', label: 'NIK Anak (tertera di KK / Akta)', type: 'text', placeholder: '16 digit NIK...', required: true },
      { name: 'jenisKelaminAnak', label: 'Jenis Kelamin Anak', type: 'select', options: ['Laki-laki', 'Perempuan'], required: true },
      { name: 'tempatLahirAnak', label: 'Tempat Lahir', type: 'text', placeholder: 'Kota / Kabupaten...', required: true },
      { name: 'tanggalLahirAnak', label: 'Tanggal Lahir', type: 'date', required: true },
      { name: 'anakKe', label: 'Anak Ke-', type: 'number', placeholder: 'Contoh: 1', required: true },
      { name: 'hakTunjangan', label: 'Pengajuan Hak Tunjangan Anak (KP4)', type: 'select', options: ['Ya (Maksimal 2 Anak yang Ditunjang)', 'Tidak (Hanya Pemutakhiran Data)'], required: true }
    ],
    requiredDocuments: [
      { id: 'doc_akta_kelahiran_anak', label: 'Scan Akta Kelahiran Anak Resmi Disdukcapil (PDF)', required: true, description: 'Akta kelahiran anak' },
      { id: 'doc_kk_terbaru_anak', label: 'Kartu Keluarga (KK) Terbaru yang Memuat Nama Anak (PDF)', required: true, description: 'KK terbaru' },
      { id: 'doc_surat_ket_lahir', label: 'Surat Keterangan Kelahiran dari Rumah Sakit / Bidan (Opsional)', required: false, description: 'Dokumen pendukung medis' }
    ]
  },

  // 15. Kartu Istri/Suami (KARIS/KARSU)
  {
    id: 'LYN-KS-02',
    kodeLayanan: 'KARTU_ISTRI_SUAMI',
    kategori: 'KELUARGA_STATUS',
    namaLayanan: 'Kartu Istri / Suami (KARIS / KARSU)',
    deskripsi: 'Permohonan penerbitan Kartu Istri (KARIS) atau Kartu Suami (KARSU) BKN sebagai identitas resmi pasangan PNS.',
    aktif: true,
    slaHari: 5,
    icon: 'bi-person-vcard',
    fields: [
      { name: 'jenisKartu', label: 'Jenis Kartu yang Diajukan', type: 'select', options: ['Kartu Istri (KARIS)', 'Kartu Suami (KARSU)', 'Penggantian KARIS/KARSU Hilang/Rusak'], required: true },
      { name: 'namaPasanganKaris', label: 'Nama Lengkap Pasangan', type: 'text', placeholder: 'Nama pasangan...', required: true },
      { name: 'tanggalLahirPasangan', label: 'Tanggal Lahir Pasangan', type: 'date', required: true },
      { name: 'nomorBukuNikahKaris', label: 'Nomor Buku Nikah / Akta Perkawinan', type: 'text', placeholder: 'Nomor buku nikah...', required: true },
      { name: 'tanggalPernikahanKaris', label: 'Tanggal Pernikahan', type: 'date', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_laporan_perkawinan_karis', label: 'Laporan Perkawinan Pertama (Formulir LPP BKN)', required: true, description: 'Formulir resmi BKN yang ditandatangani' },
      { id: 'doc_buku_nikah_karis', label: 'Salinan Buku Nikah / Akta Nikah Legalisir (PDF)', required: true, description: 'Buku nikah yang telah dilegalisir KUA' },
      { id: 'doc_sk_cpns_pns_karis', label: 'SK CPNS & SK PNS Pegawai (PDF)', required: true, description: 'SK Pengangkatan' },
      { id: 'doc_foto_pasangan', label: 'Pas Foto Pasangan Ukuran 2x3 atau 3x4 Latar Merah (2 Lembar / JPG)', required: true, description: 'Foto formal pasangan' }
    ]
  },

  // 16. Jaminan Sosial
  {
    id: 'LYN-JS-01',
    kodeLayanan: 'JAMINAN_SOSIAL',
    kategori: 'KENAIKAN_GAJI',
    namaLayanan: 'Jaminan Sosial (JKK / JKM)',
    deskripsi: 'Pengurusan hak dan klaim Jaminan Kecelakaan Kerja (JKK), Jaminan Kematian (JKM), serta jaminan sosial perlindungan ketenagakerjaan ASN/Non-ASN.',
    aktif: true,
    slaHari: 3,
    icon: 'bi-shield-check',
    fields: [
      { name: 'jenisJaminan', label: 'Jenis Layanan Jaminan Sosial', type: 'select', options: ['Klaim Jaminan Kecelakaan Kerja (JKK - Rawat/Santunan)', 'Klaim Jaminan Kematian (JKM - Uang Duka Wafat)', 'Pendaftaran / Pemutakhiran Nomor Peserta Jamsostek', 'Konsultasi Manfaat Jaminan Sosial'], required: true },
      { name: 'tanggalKejadian', label: 'Tanggal Kejadian / Peristiwa', type: 'date', required: true },
      { name: 'kronologiSingkat', label: 'Kronologi Singkat Kejadian / Keterangan Klaim', type: 'textarea', placeholder: 'Jelaskan lokasi kejadian dalam jam dinas / kecelakaan tugas...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_laporan_kecelakaan', label: 'Surat Keterangan Kronologi Kecelakaan dari Pimpinan Unit Kerja (PDF)', required: true, description: 'Surat keterangan resmi tugas' },
      { id: 'doc_resume_medis', label: 'Kwitansi & Resume Medis Rumah Sakit / Surat Kematian (PDF)', required: true, description: 'Bukti medis/kematian' },
      { id: 'doc_ktp_kartu_peserta', label: 'Kartu Peserta BPJS / Taspen & KTP Pegawai', required: true, description: 'Kartu identitas jaminan' }
    ]
  },

  // 17. JHT (Jaminan Hari Tua)
  {
    id: 'LYN-JHT-01',
    kodeLayanan: 'JHT',
    kategori: 'KENAIKAN_GAJI',
    namaLayanan: 'JHT (Jaminan Hari Tua Taspen)',
    deskripsi: 'Pengurusan klaim dan verifikasi berkas Tabungan Hari Tua (THT) PT TASPEN bagi pegawai yang memasuki usia pensiun, mutasi, atau klaim asuransi.',
    aktif: true,
    slaHari: 4,
    icon: 'bi-wallet-fill',
    fields: [
      { name: 'alasanKlaimJht', label: 'Dasar Permohonan JHT/THT', type: 'select', options: ['Pensiun Batas Usia Pensiun (BUP)', 'Pensiun Dini / Mengundurkan Diri', 'Klaim Asuransi Dwiguna / Kematian', 'Koreksi Data Rekening Pembayaran'], required: true },
      { name: 'nomorTaspen', label: 'Nomor Kartu Taspen (NOTAS)', type: 'text', placeholder: 'Nomor NOTAS...', required: true },
      { name: 'namaBankJht', label: 'Bank / Kantor Pos Pembayaran yang Dipilih', type: 'text', placeholder: 'Contoh: Bank Mandiri Taspen (Mantap) / BRI', required: true },
      { name: 'nomorRekeningJht', label: 'Nomor Rekening Penerima', type: 'text', placeholder: 'Nomor rekening buku tabungan...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_sk_pensiun_jht', label: 'SK Pensiun / Keterangan Berhenti Bekerja (PDF)', required: true, description: 'SK resmi pensiun' },
      { id: 'doc_buku_tabungan_jht', label: 'Scan Buku Tabungan / Nomor Rekening (PDF)', required: true, description: 'Buku tabungan atas nama pemohon' },
      { id: 'doc_ktp_npwp_jht', label: 'KTP, NPWP & Kartu Taspen Asli (PDF)', required: true, description: 'Identitas lengkap' }
    ]
  },

  // 18. Kesehatan
  {
    id: 'LYN-KS-03',
    kodeLayanan: 'KESEHATAN',
    kategori: 'KENAIKAN_GAJI',
    namaLayanan: 'Kesehatan (BPJS & Medical Check-Up)',
    deskripsi: 'Layanan administrasi pendaftaran BPJS Kesehatan pegawai & keluarga, pengajuan bantuan pembiayaan kesehatan dinas, dan koordinasi Medical Check-Up (MCU).',
    aktif: true,
    slaHari: 2,
    icon: 'bi-heart-pulse-fill',
    fields: [
      { name: 'jenisLayananKesehatan', label: 'Kategori Layanan Kesehatan', type: 'select', options: ['Pendaftaran / Pemutakhiran Anggota Keluarga BPJS Kesehatan', 'Perubahan Fasilitas Kesehatan Tingkat Pertama (FKTP)', 'Pendaftaran Pemeriksaan Berkala / Medical Check Up (MCU)', 'Permohonan Bantuan Keringanan Biaya Kesehatan Khusus'], required: true },
      { name: 'nomorBpjsPegawai', label: 'Nomor Kartu BPJS Kesehatan', type: 'text', placeholder: '13 digit nomor BPJS...', required: true },
      { name: 'keteranganKesehatan', label: 'Keterangan Tambahan / Keluhan', type: 'textarea', placeholder: 'Jelaskan data anggota keluarga yang ingin didaftarkan...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_kk_bpjs', label: 'Kartu Keluarga (KK) & KTP Anggota Keluarga (PDF)', required: true, description: 'KK pemohon' },
      { id: 'doc_slip_gaji_bpjs', label: 'Slip Gaji / Bukti Potong Iuran BPJS Terakhir (Opsional)', required: false, description: 'Bukti pembayaran iuran' }
    ]
  },

  // 19. Taperum / Tapera
  {
    id: 'LYN-TP-01',
    kodeLayanan: 'TAPERUM',
    kategori: 'KENAIKAN_GAJI',
    namaLayanan: 'Taperum (Tabungan Perumahan / BP Tapera)',
    deskripsi: 'Pengurusan pengembalian dana Tabungan Perumahan (Bapertarum/Tapera) bagi PNS pensiun serta pemanfaatan fasilitas pembiayaan perumahan ASN.',
    aktif: true,
    slaHari: 4,
    icon: 'bi-house-heart-fill',
    fields: [
      { name: 'jenisLayananTapera', label: 'Jenis Layanan Perumahan', type: 'select', options: ['Pengembalian Tabungan Perumahan (Bagi Pensiun / Ahli Waris)', 'Pemanfaatan Pembiayaan Rumah Pertama KPR Tapera', 'Pemutakhiran Data Kepesertaan Portal SITARA'], required: true },
      { name: 'nomorIndukTapera', label: 'Nomor Identitas Tapera / NIK', type: 'text', placeholder: 'NIK / Nomor Akun Tapera...', required: true },
      { name: 'rekeningPencairan', label: 'Nomor Rekening Bank Pencairan', type: 'text', placeholder: 'Bank dan Nomor Rekening...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_sk_pensiun_tapera', label: 'SK Pensiun / SK CPNS & PNS (PDF)', required: true, description: 'Bukti masa kerja dan status pensiun' },
      { id: 'doc_buku_rekening_tapera', label: 'Buku Tabungan Rekening Pencairan & KTP (PDF)', required: true, description: 'Rekening aktif pemohon' }
    ]
  },

  // 20. Pensiun
  {
    id: 'LYN-PS-01',
    kodeLayanan: 'PENSIUN',
    kategori: 'PENSIUN_PURNA',
    namaLayanan: 'Pensiun',
    deskripsi: 'Pemberkasan dan pengusulan SK Pensiun Batas Usia Pensiun (BUP), Pensiun Atas Permintaan Sendiri (APS/Dini), atau Pensiun Janda/Duda.',
    aktif: true,
    slaHari: 10,
    icon: 'bi-person-walking',
    fields: [
      { name: 'jenisPensiun', label: 'Jenis Usulan Pensiun', type: 'select', options: ['Pensiun Batas Usia Pensiun (BUP - 58/60/65 Thn)', 'Pensiun Atas Permintaan Sendiri (APS / Pensiun Dini)', 'Pensiun Janda / Duda / Yatim Piatu', 'Pensiun Karena Cacat Jasmani / Rohani'], required: true },
      { name: 'tmtPensiun', label: 'Estimasi TMT Pensiun', type: 'date', required: true },
      { name: 'alamatPensiun', label: 'Alamat Domisili Pasca Pensiun', type: 'textarea', placeholder: 'Alamat lengkap tempat tinggal setelah purna tugas...', required: true },
      { name: 'kantorBayarTaspen', label: 'Kantor Bayar TASPEN / Mitra Bank yang Dipilih', type: 'text', placeholder: 'Contoh: Bank Mantap KC Rawamangun...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_sk_lengkap_pensiun', label: 'Bundel SK CPNS s.d SK Pangkat Terakhir (PDF Digabung)', required: true, description: 'Semua riwayat SK Pangkat' },
      { id: 'doc_sk_jabatan_spmt', label: 'SK Jabatan Terakhir & SPMT (PDF)', required: true, description: 'SK Jabatan' },
      { id: 'doc_data_keluarga_pensiun', label: 'Buku Nikah, KK, KTP, dan Akta Anak (PDF)', required: true, description: 'Penetapan hak janda/duda/anak' },
      { id: 'doc_foto_pensiun_resmi', label: 'Pas Foto 3x4 Berlatar Belakang Merah (JPG)', required: true, description: 'Foto resmi pensiun' }
    ]
  },

  // 21. Purna Bakti
  {
    id: 'LYN-PB-01',
    kodeLayanan: 'PURNA_BAKTI',
    kategori: 'PENSIUN_PURNA',
    namaLayanan: 'Purna Bakti',
    deskripsi: 'Pendaftaran Program Pembekalan Masa Persiapan Pensiun (MPP), Pelatihan Kewirausahaan Purna Tugas, dan Penyerahan Piagam Pengabdian DJKI.',
    aktif: true,
    slaHari: 5,
    icon: 'bi-flag-fill',
    fields: [
      { name: 'programPurnaBakti', label: 'Program Purna Bakti yang Diikuti', type: 'select', options: ['Pembekalan & Pelatihan Kewirausahaan Calon Pensiun', 'Pengambilan Hak Masa Persiapan Pensiun (Bebas Tugas 1 Tahun)', 'Upacara Pelepasan & Penyerahan Tanda Pengabdian'], required: true },
      { name: 'sisaMasaKerjaBulan', label: 'Sisa Waktu Menuju BUP (Bulan)', type: 'number', placeholder: 'Contoh: 12 Bulan', required: true },
      { name: 'bidangMinatUsaha', label: 'Minat Bidang Usaha / Keterampilan yang Diinginkan', type: 'text', placeholder: 'Contoh: Agribisnis, Kuliner, Properti, Keuangan...', required: false }
    ],
    requiredDocuments: [
      { id: 'doc_rekomendasi_mpp', label: 'Surat Permohonan / Usulan Bebas Tugas MPP dari Atasan (PDF)', required: true, description: 'Persetujuan unit kerja' },
      { id: 'doc_sk_pangkat_akhir_pb', label: 'SK Pangkat Terakhir (PDF)', required: true, description: 'SK Pangkat' }
    ]
  },

  // 22. Penghargaan
  {
    id: 'LYN-PH-01',
    kodeLayanan: 'PENGHARGAAN',
    kategori: 'KEPANGKATAN_KARIR',
    namaLayanan: 'Penghargaan (Satyalancana & Prestasi)',
    deskripsi: 'Pengusulan Tanda Kehormatan Satyalancana Karya Satya (X, XX, XXX Tahun), Penghargaan Pegawai Teladan, dan Anugerah Inovasi DJKI.',
    aktif: true,
    slaHari: 5,
    icon: 'bi-gem',
    fields: [
      { name: 'jenisPenghargaan', label: 'Jenis Tanda Penghargaan', type: 'select', options: ['Satyalancana Karya Satya 10 Tahun (Perunggu)', 'Satyalancana Karya Satya 20 Tahun (Perak)', 'Satyalancana Karya Satya 30 Tahun (Emas)', 'Pegawai Teladan / Berprestasi DJKI', 'Penghargaan Inovasi Layanan Kekayaan Intelektual'], required: true },
      { name: 'totalMasaKerjaTahun', label: 'Total Masa Kerja Sah (Tahun)', type: 'number', placeholder: 'Contoh: 10', required: true },
      { name: 'statusHukdis', label: 'Pernyataan Bebas Hukuman Disiplin', type: 'select', options: ['Tidak Pernah Dijatuhi Hukuman Disiplin Tingkat Sedang/Berat', 'Pernah dan Telah Selesai Menjalani'], required: true },
      { name: 'ringkasanKarya', label: 'Uraian Singkat Prestasi / Kontribusi', type: 'textarea', placeholder: 'Sampaikan rangkuman dedikasi dan kontribusi kerja di DJKI...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_sk_cpns_penghargaan', label: 'SK CPNS & SK Pangkat Terakhir (PDF)', required: true, description: 'Bukti perhitungan masa kerja pengabdian' },
      { id: 'doc_surat_ket_bebas_hukdis', label: 'Surat Keterangan Tidak Pernah Dijatuhi Hukuman Disiplin (PDF)', required: true, description: 'Keterangan bebas hukdis' },
      { id: 'doc_drh_penghargaan', label: 'Daftar Riwayat Hidup Lengkap (PDF)', required: true, description: 'DRH format BKN' }
    ]
  },

  // 23. Konsultasi Kepegawaian
  {
    id: 'LYN-KK-01',
    kodeLayanan: 'KONSULTASI_KEPEGAWAIAN',
    kategori: 'KONSULTASI_ADMINISTRASI',
    namaLayanan: 'Konsultasi Kepegawaian',
    deskripsi: 'Layanan konsultasi tatap muka langsung maupun virtual seputar perencanaan karir, kenaikan pangkat, angka kredit, hak cuti, dan problem kepegawaian.',
    aktif: true,
    slaHari: 2,
    icon: 'bi-chat-dots-fill',
    fields: [
      { name: 'topikKonsultasi', label: 'Topik Bahasan Konsultasi', type: 'select', options: ['Perencanaan Karir & Uji Kompetensi Jabatan', 'Perhitungan Angka Kredit JF & Konversi Predikat Kinerja', 'Peluang Beasiswa & Tugas Belajar', 'Hak Cuti (Cuti Sakit, Cuti Alasan Penting, Cuti Melahirkan)', 'Kompensasi, Tukin & Penggajian', 'Lainnya'], required: true },
      { name: 'uraianMasalah', label: 'Rincian Pertanyaan / Permasalahan yang Dikonsultasikan', type: 'textarea', placeholder: 'Tuliskan secara jelas pokok persoalan atau pertanyaan yang ingin didiskusikan dengan analis SDM...', required: true },
      { name: 'metodeKonsultasi', label: 'Metode Konsultasi yang Diinginkan', type: 'select', options: ['Tanggapan Tertulis di Sistem Tiket SDM', 'Konsultasi Tatap Muka di Ruang Layanan Kepegawaian Lantai 4', 'Panggilan WhatsApp / Zoom Meeting'], required: true }
    ],
    requiredDocuments: [
      { id: 'doc_lampiran_konsultasi', label: 'Dokumen / Bukti Terkait Pokok Bahasan (Opsional)', required: false, description: 'Draft dokumen atau SK terkait' }
    ]
  },

  // 24. Perlindungan Hukum
  {
    id: 'LYN-LH-01',
    kodeLayanan: 'PERLINDUNGAN_HUKUM',
    kategori: 'HUKUM_DISIPLIN',
    namaLayanan: 'Perlindungan Hukum',
    deskripsi: 'Permohonan advokasi dan bantuan perlindungan hukum bagi pegawai ASN DJKI dalam menghadapi sengketa pelaksanaan tugas kedinasan.',
    aktif: true,
    slaHari: 3,
    icon: 'bi-shield-lock-fill',
    fields: [
      { name: 'perihalSengketa', label: 'Perihal Permasalahan Hukum', type: 'text', placeholder: 'Contoh: Gugatan PTUN / Sengketa Administrasi Terkait Tugas Pemeriksaan Paten', required: true },
      { name: 'sumberPermasalahan', label: 'Keterkaitan dengan Tugas Kedinasan', type: 'select', options: ['Sengketa Tata Usaha Negara (TUN) Terkait Produk Hukum DJKI', 'Panggilan Saksi / Klarifikasi Aparat Penegak Hukum (APH)', 'Pemberian Keterangan Ahli Kedinasan', 'Sengketa Perdata / Pidana Terkait Pelaksanaan Tugas'], required: true },
      { name: 'kronologiKasus', label: 'Kronologi Singkat Peristiwa Kedinasan', type: 'textarea', placeholder: 'Uraikan dasar surat tugas, kronologi kejadian, dan bentuk pendampingan hukum yang dibutuhkan...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_surat_panggilan_aph', label: 'Surat Panggilan / Dokumen Gugatan / Berkas Perkara (PDF)', required: true, description: 'Surat resmi dari instansi penegak hukum / pengadilan' },
      { id: 'doc_surat_tugas_kedinasan', label: 'Surat Tugas / SK yang Mendasari Pelaksanaan Pekerjaan (PDF)', required: true, description: 'Bukti pelaksanaan tugas resmi DJKI' }
    ]
  },

  // 25. Administrasi Disiplin
  {
    id: 'LYN-AD-04',
    kodeLayanan: 'ADMINISTRASI_DISIPLIN',
    kategori: 'HUKUM_DISIPLIN',
    namaLayanan: 'Administrasi Disiplin',
    deskripsi: 'Layanan penatausahaan klarifikasi kehadiran, penanganan laporan pengaduan, surat panggilan pemeriksaan disiplin, dan tindak lanjut kepatuhan kode etik.',
    aktif: true,
    slaHari: 3,
    icon: 'bi-shield-exclamation',
    fields: [
      { name: 'jenisLayananDisiplin', label: 'Jenis Layanan Disiplin', type: 'select', options: ['Klarifikasi & Pembuktian Alasan Ketidakhadiran / Absensi', 'Permohonan Izin / Rekomendasi Khusus Kepatuhan', 'Penyampaian Tanggapan Surat Panggilan Pemeriksaan', 'Pengajuan Keberatan atas Rekomendasi Disiplin'], required: true },
      { name: 'nomorSuratPanggilan', label: 'Nomor Surat Panggilan / Berkas Terkait (Jika Ada)', type: 'text', placeholder: 'Nomor surat...', required: false },
      { name: 'penjelasanKlarifikasi', label: 'Uraian Penjelasan / Keterangan Pembelaan Diri', type: 'textarea', placeholder: 'Sampaikan penjelasan kronologis disertai alasan yang sah dan dapat dipertanggungjawabkan...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_surat_sakit_tugas', label: 'Surat Dokter Resmi / Surat Tugas / Bukti Kondisi Darurat (PDF)', required: true, description: 'Bukti otentik penyebab ketidakhadiran' },
      { id: 'doc_tanggapan_tertulis', label: 'Surat Pernyataan / Tanggapan Tertulis Bermaterai (PDF)', required: false, description: 'Pernyataan resmi pemohon' }
    ]
  },

  // 26. Layanan SDM Lainnya
  {
    id: 'LYN-LN-01',
    kodeLayanan: 'LAYANAN_SDM_LAINNYA',
    kategori: 'KONSULTASI_ADMINISTRASI',
    namaLayanan: 'Layanan SDM Lainnya',
    deskripsi: 'Pengajuan permohonan administrasi kepegawaian lainnya seperti Surat Keterangan Aktif, Legalisasi Berkas, Cuti Khusus, dan permohonan khusus lainnya.',
    aktif: true,
    slaHari: 3,
    icon: 'bi-grid-3x3-gap-fill',
    fields: [
      { name: 'jenisLayananSpesifik', label: 'Jenis Layanan yang Dibutuhkan', type: 'select', options: ['Surat Keterangan Aktif Bekerja (Untuk Bank/Visa/Sekolah)', 'Surat Keterangan Masa Kerja & Bebas Hukuman Disiplin', 'Legalisasi Salinan SK & Dokumen Kepegawaian', 'Permohonan Cuti Besar / Cuti di Luar Tanggungan Negara (CLTN)', 'Rekomendasi Pembuatan Paspor Dinas', 'Layanan Lainnya yang Belum Tercantum'], required: true },
      { name: 'judulPermohonan', label: 'Judul / Keperluan Permohonan', type: 'text', placeholder: 'Contoh: Surat Keterangan Aktif untuk Pengajuan KPR BTN', required: true },
      { name: 'rincianKeperluan', label: 'Rincian Penjelasan & Data yang Diperlukan', type: 'textarea', placeholder: 'Jelaskan secara rinci tujuan pembuatan surat, instansi tujuan, atau format khusus yang diminta...', required: true },
      { name: 'urgensi', label: 'Tingkat Urgensi', type: 'select', options: ['Normal (Sesuai SLA 3 Hari)', 'Segera / Urgent (Kebutuhan Mendesak)'], required: true }
    ],
    requiredDocuments: [
      { id: 'doc_berkas_pendukung_lain', label: 'Dokumen Acuan / Formulir dari Instansi Peminta / Scan Asli (PDF)', required: true, description: 'Formulir bank / scan SK yang ingin dilegalisir' }
    ]
  }
];

export const getLayananById = (id: string): MasterLayanan | undefined => {
  return MASTER_LAYANAN_DATA.find(l => l.id === id || l.kodeLayanan === id);
};

export const getLayananByKategori = (kategoriId: string): MasterLayanan[] => {
  return MASTER_LAYANAN_DATA.filter(l => l.kategori === kategoriId && l.aktif);
};

export const STATUS_CONFIG: Record<string, { label: string; badge: string; border: string; bgLight: string; text: string; icon: string }> = {
  'DRAFT': {
    label: 'Draft',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    border: 'border-slate-300',
    bgLight: 'bg-slate-50',
    text: 'text-slate-700',
    icon: 'bi-pencil-square'
  },
  'DIAJUKAN': {
    label: 'Diajukan',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    border: 'border-blue-200',
    bgLight: 'bg-blue-50/50',
    text: 'text-blue-700',
    icon: 'bi-send-fill'
  },
  'MENUNGGU_VERIFIKASI': {
    label: 'Menunggu Verifikasi',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'border-amber-200',
    bgLight: 'bg-amber-50/50',
    text: 'text-amber-700',
    icon: 'bi-hourglass-split'
  },
  'DIVERIFIKASI': {
    label: 'Diverifikasi',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    border: 'border-indigo-200',
    bgLight: 'bg-indigo-50/50',
    text: 'text-indigo-700',
    icon: 'bi-check2-circle'
  },
  'DALAM_PROSES': {
    label: 'Dalam Proses',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    border: 'border-sky-200',
    bgLight: 'bg-sky-50/50',
    text: 'text-sky-700',
    icon: 'bi-gear-wide-connected'
  },
  'PERLU_PERBAIKAN': {
    label: 'Perlu Perbaikan',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
    border: 'border-rose-300',
    bgLight: 'bg-rose-50/50',
    text: 'text-rose-700',
    icon: 'bi-exclamation-triangle-fill'
  },
  'MENUNGGU_PEMOHON': {
    label: 'Menunggu Pemohon',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    border: 'border-orange-200',
    bgLight: 'bg-orange-50/50',
    text: 'text-orange-700',
    icon: 'bi-person-clock'
  },
  'SELESAI': {
    label: 'Selesai',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-emerald-200',
    bgLight: 'bg-emerald-50/50',
    text: 'text-emerald-700',
    icon: 'bi-check-circle-fill'
  },
  'DITOLAK': {
    label: 'Ditolak',
    badge: 'bg-red-50 text-red-700 border-red-200',
    border: 'border-red-200',
    bgLight: 'bg-red-50/50',
    text: 'text-red-700',
    icon: 'bi-x-circle-fill'
  },
  'DIBATALKAN': {
    label: 'Dibatalkan',
    badge: 'bg-gray-100 text-gray-500 border-gray-200',
    border: 'border-gray-200',
    bgLight: 'bg-gray-50',
    text: 'text-gray-500',
    icon: 'bi-slash-circle'
  }
};
