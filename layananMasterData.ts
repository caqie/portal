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
    id: 'DATA_KEPEGAWAIAN',
    nama: 'Data Kepegawaian',
    deskripsi: 'Perubahan & perbaikan data pribadi, pendidikan, keluarga, serta kontak',
    icon: 'bi-person-gear',
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'KEPANGKATAN',
    nama: 'Kepangkatan',
    deskripsi: 'Usulan kenaikan pangkat, penyesuaian ijazah, dan peninjauan masa kerja',
    icon: 'bi-award-fill',
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'JABATAN',
    nama: 'Jabatan',
    deskripsi: 'Pengangkatan, perpindahan, mutasi, promosi, dan konsultasi jabatan',
    icon: 'bi-briefcase-fill',
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'KENAIKAN_GAJI',
    nama: 'Kenaikan Gaji',
    deskripsi: 'Kenaikan Gaji Berkala (KGB), penyesuaian gaji, dan konsultasi hak keuangan',
    icon: 'bi-cash-stack',
    color: 'text-teal-600',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  {
    id: 'TUGAS_BELAJAR',
    nama: 'Tugas Belajar & Kompetensi',
    deskripsi: 'Tugas belajar, izin belajar, diklat, pelatihan, sertifikasi, dan kompetensi',
    icon: 'bi-mortarboard-fill',
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'MUTASI',
    nama: 'Mutasi',
    deskripsi: 'Mutasi internal, antar-unit kerja, mutasi masuk, keluar, dan permohonan pindah',
    icon: 'bi-arrow-left-right',
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'DISIPLIN',
    nama: 'Disiplin Kepegawaian',
    deskripsi: 'Konsultasi disiplin, klarifikasi, keberatan, dan administrasi hukuman disiplin',
    icon: 'bi-shield-shaded',
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  {
    id: 'PENSIUN',
    nama: 'Pensiun',
    deskripsi: 'Usulan pensiun BUP, APS, persiapan berkas dan konsultasi pensiun',
    icon: 'bi-door-open-fill',
    color: 'text-orange-600',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  {
    id: 'ADMINISTRASI',
    nama: 'Administrasi Kepegawaian',
    deskripsi: 'Surat keterangan aktif, surat keterangan masa kerja, dan legalisasi berkas',
    icon: 'bi-file-earmark-check-fill',
    color: 'text-sky-600',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  {
    id: 'KONSULTASI_SDM',
    nama: 'Konsultasi SDM',
    deskripsi: 'Pusat konsultasi karir, kepangkatan, jabatan, pensiun, dan administrasi',
    icon: 'bi-chat-dots-fill',
    color: 'text-cyan-600',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  {
    id: 'LAINNYA',
    nama: 'Layanan Lainnya',
    deskripsi: 'Permohonan layanan kepegawaian lainnya yang belum terakomodasi',
    icon: 'bi-grid-fill',
    color: 'text-slate-600',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-300'
  }
];

export const MASTER_LAYANAN_DATA: MasterLayanan[] = [
  // A. DATA KEPEGAWAIAN
  {
    id: 'LYN-DK-01',
    kodeLayanan: 'PERUBAHAN_DATA_PRIBADI',
    kategori: 'DATA_KEPEGAWAIAN',
    namaLayanan: 'Perubahan Data Pribadi',
    deskripsi: 'Pengajuan perbaikan identitas diri, NIK, tempat/tanggal lahir, atau nama pada database kepegawaian',
    aktif: true,
    slaHari: 3,
    icon: 'bi-person-vcard',
    fields: [
      { name: 'jenisPerubahan', label: 'Elemen Data yang Diubah', type: 'select', options: ['Nama Lengkap & Gelar', 'NIK / No. KTP', 'Tempat / Tanggal Lahir', 'Jenis Kelamin', 'Agama', 'Lainnya'], required: true },
      { name: 'dataLama', label: 'Data Lama (Tercatat Saat Ini)', type: 'textarea', placeholder: 'Tuliskan data yang salah atau data lama...', required: true },
      { name: 'dataBaru', label: 'Data Baru yang Benar', type: 'textarea', placeholder: 'Tuliskan data baru yang sesuai dokumen resmi...', required: true },
      { name: 'alasanPerubahan', label: 'Alasan Perubahan', type: 'textarea', placeholder: 'Jelaskan dasar/alasan permohonan perubahan data...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_ktp_kk', label: 'KTP / Kartu Keluarga Terbaru (PDF/JPG)', required: true, description: 'Scan asli KTP atau KK terbaru' },
      { id: 'doc_akta_lahir', label: 'Akta Kelahiran / Surat Keputusan Pengadilan (jika ada)', required: false, description: 'Bukti otentik data kelahiran' }
    ]
  },
  {
    id: 'LYN-DK-02',
    kodeLayanan: 'PERUBAHAN_DATA_KELUARGA',
    kategori: 'DATA_KEPEGAWAIAN',
    namaLayanan: 'Perubahan Data Keluarga',
    deskripsi: 'Penambahan/pemutakhiran data suami/istri/anak untuk administrasi tunjangan dan kepegawaian',
    aktif: true,
    slaHari: 3,
    icon: 'bi-people',
    fields: [
      { name: 'jenisPeristiwa', label: 'Jenis Peristiwa Keluarga', type: 'select', options: ['Pernikahan (Tambah Pasangan)', 'Kelahiran Anak (Tambah Anak)', 'Perceraian', 'Kematian Anggota Keluarga'], required: true },
      { name: 'namaAnggota', label: 'Nama Anggota Keluarga', type: 'text', placeholder: 'Nama lengkap anggota keluarga...', required: true },
      { name: 'hubunganKeluarga', label: 'Hubungan Keluarga', type: 'select', options: ['Suami', 'Istri', 'Anak Kandung', 'Anak Angkat/Tiri'], required: true },
      { name: 'tanggalPeristiwa', label: 'Tanggal Peristiwa / Surat', type: 'date', required: true },
      { name: 'keterangan', label: 'Keterangan Tambahan', type: 'textarea', placeholder: 'Catatan terkait KP4 / tunjangan keluarga...', required: false }
    ],
    requiredDocuments: [
      { id: 'doc_buku_nikah', label: 'Buku Nikah / Akta Cerai / Akta Kematian (PDF)', required: true, description: 'Dokumen bukti hukum peristiwa' },
      { id: 'doc_akta_anak', label: 'Akta Kelahiran Anak (jika penambahan anak)', required: false, description: 'Scan akta kelahiran anak' },
      { id: 'doc_kk', label: 'Kartu Keluarga Terbaru (PDF)', required: true, description: 'KK yang sudah tercatat perubahan' }
    ]
  },
  {
    id: 'LYN-DK-03',
    kodeLayanan: 'PERUBAHAN_PENDIDIKAN',
    kategori: 'DATA_KEPEGAWAIAN',
    namaLayanan: 'Perubahan Data Pendidikan',
    deskripsi: 'Pemutakhiran riwayat jenjang pendidikan formal, nomor ijazah, dan gelar akademik',
    aktif: true,
    slaHari: 3,
    icon: 'bi-book',
    fields: [
      { name: 'jenjangPendidikan', label: 'Jenjang Pendidikan Baru', type: 'select', options: ['SLTA/SMK', 'D-III', 'D-IV', 'S-1', 'S-2', 'S-3', 'Profesi'], required: true },
      { name: 'institusiPendidikan', label: 'Nama Universitas / Sekolah', type: 'text', placeholder: 'Contoh: Universitas Indonesia', required: true },
      { name: 'programStudi', label: 'Program Studi / Jurusan', type: 'text', placeholder: 'Contoh: Ilmu Hukum / Teknik Informatika', required: true },
      { name: 'tahunLulus', label: 'Tahun Kelulusan', type: 'number', placeholder: '2025', required: true },
      { name: 'nomorIjazah', label: 'Nomor Ijazah', type: 'text', placeholder: 'Nomor seri ijazah...', required: true },
      { name: 'nomorSkGelar', label: 'Nomor SK Pencantuman Gelar / Izin Belajar (Jika ada)', type: 'text', placeholder: 'Nomor SK...', required: false }
    ],
    requiredDocuments: [
      { id: 'doc_ijazah', label: 'Scan Ijazah Asli / Legalisir (PDF)', required: true, description: 'File ijazah kelulusan' },
      { id: 'doc_transkrip', label: 'Scan Transkrip Nilai Asli (PDF)', required: true, description: 'Transkrip akademik resmi' },
      { id: 'doc_sk_gelar', label: 'SK Pencantuman Gelar / Surat Izin Belajar (jika ada)', required: false, description: 'SK persetujuan pencantuman gelar' }
    ]
  },
  {
    id: 'LYN-DK-04',
    kodeLayanan: 'PERUBAHAN_ALAMAT_KONTAK',
    kategori: 'DATA_KEPEGAWAIAN',
    namaLayanan: 'Perubahan Alamat / Kontak',
    deskripsi: 'Pembaruan nomor handphone/WhatsApp, email dinas/pribadi, dan alamat domisili',
    aktif: true,
    slaHari: 2,
    icon: 'bi-telephone-forward',
    fields: [
      { name: 'noHpBaru', label: 'Nomor Handphone / WhatsApp Baru', type: 'text', placeholder: '081234567890', required: true },
      { name: 'emailBaru', label: 'Alamat Email Baru', type: 'text', placeholder: 'nama@kemenkumham.go.id atau pribadi', required: true },
      { name: 'alamatDomisiliBaru', label: 'Alamat Domisili / Rumah Baru', type: 'textarea', placeholder: 'Alamat lengkap beserta RT/RW, Kelurahan, Kecamatan, Kota...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_ktp_domisili', label: 'Bukti Alamat / KTP / Surat Domisili (Opsional)', required: false, description: 'Jika ada perubahan wilayah' }
    ]
  },
  {
    id: 'LYN-DK-05',
    kodeLayanan: 'PERBAIKAN_DATA_KEPEGAWAIAN',
    kategori: 'DATA_KEPEGAWAIAN',
    namaLayanan: 'Perbaikan Data Kepegawaian',
    deskripsi: 'Koreksi ketidaksesuaian data SK CPNS/PNS, masa kerja, TMT, atau data profil SIMPEG/SIASN',
    aktif: true,
    slaHari: 3,
    icon: 'bi-tools',
    fields: [
      { name: 'bidangData', label: 'Bidang Data yang Memerlukan Perbaikan', type: 'select', options: ['TMT CPNS / PNS', 'Masa Kerja Golongan (MKG)', 'Masa Kerja Total (MKT)', 'Nomor Kartu Pegawai (KARPEG)', 'Nomor BPJS / NPWP / TAPERA', 'Lainnya'], required: true },
      { name: 'penjelasanKoreksi', label: 'Uraian Detail Kesalahan & Data Seharusnya', type: 'textarea', placeholder: 'Jelaskan data salah yang tertera dan data yang seharusnya sesuai SK...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_sk_pendukung', label: 'Scan SK / Dokumen Acuan yang Benar (PDF)', required: true, description: 'SK CPNS/PNS/Pangkat/PMK yang memuat data sah' }
    ]
  },
  {
    id: 'LYN-DK-06',
    kodeLayanan: 'PEMUTAKHIRAN_DATA_KEPEGAWAIAN',
    kategori: 'DATA_KEPEGAWAIAN',
    namaLayanan: 'Pemutakhiran Data Kepegawaian',
    deskripsi: 'Sinkronisasi berkala data MyASN / SIASN BKN dengan Portal SDM DJKI',
    aktif: true,
    slaHari: 3,
    icon: 'bi-arrow-repeat',
    fields: [
      { name: 'targetSync', label: 'Fokus Pemutakhiran', type: 'select', options: ['Profil Utama & Status Aktif', 'Riwayat Jabatan & Unor', 'Riwayat SKP & Kinerja', 'Riwayat Diklat & Kursus', 'Seluruh Portofolio ASN'], required: true },
      { name: 'catatanSinkronisasi', label: 'Catatan Permohonan', type: 'textarea', placeholder: 'Tuliskan catatan khusus terkait pemutakhiran data...', required: false }
    ],
    requiredDocuments: [
      { id: 'doc_bukti_myasn', label: 'Tangkapan Layar MyASN / Dokumen Pendukung (Opsional)', required: false, description: 'Screenshot SIASN bila perlu' }
    ]
  },

  // B. KEPANGKATAN
  {
    id: 'LYN-KP-01',
    kodeLayanan: 'USULAN_KENAIKAN_PANGKAT',
    kategori: 'KEPANGKATAN',
    namaLayanan: 'Kenaikan Pangkat (Reguler / Pilihan / Fungsional)',
    deskripsi: 'Pengusulan kenaikan pangkat periode berjalan (Reguler, Jabatan Fungsional, Struktural, atau Penyesuaian Ijazah)',
    aktif: true,
    slaHari: 5,
    icon: 'bi-graph-up-arrow',
    fields: [
      { name: 'jenisKenaikan', label: 'Jenis Kenaikan Pangkat', type: 'select', options: ['Reguler', 'Jabatan Fungsional Tertentu (JFT)', 'Pilihan (Struktural)', 'Penyesuaian Ijazah (PI)'], required: true },
      { name: 'golonganLama', label: 'Golongan/Pangkat Saat Ini', type: 'text', placeholder: 'Contoh: Penata Muda / III/a', required: true },
      { name: 'golonganDiusulkan', label: 'Golongan/Pangkat yang Diusulkan', type: 'text', placeholder: 'Contoh: Penata Muda Tingkat I / III/b', required: true },
      { name: 'periodeKenaikan', label: 'Periode Kenaikan Pangkat', type: 'select', options: ['Februari', 'April', 'Juni', 'Agustus', 'Oktober', 'Desember'], required: true },
      { name: 'nomorPakTerakhir', label: 'Nomor PAK Konversi / Integrasi (Bagi JFT)', type: 'text', placeholder: 'Wajib diisi jika JFT...', required: false },
      { name: 'keterangan', label: 'Keterangan Tambahan', type: 'textarea', placeholder: 'Catatan kelengkapan syarat berkas...', required: false }
    ],
    requiredDocuments: [
      { id: 'doc_sk_terakhir', label: 'Scan SK Pangkat Terakhir (PDF)', required: true, description: 'SK Kenaikan Pangkat sebelumnya' },
      { id: 'doc_skp_2th', label: 'SKP 2 Tahun Terakhir (PDF)', required: true, description: 'Hasil evaluasi kinerja 2 tahun terakhir dengan predikat minimal Baik' },
      { id: 'doc_pak', label: 'Penetapan Angka Kredit (PAK) Terakhir (Untuk JF)', required: false, description: 'PAK Konversi/Konvensional' },
      { id: 'doc_sk_jabatan', label: 'SK Jabatan & SPMT Terakhir', required: false, description: 'Bagi yang menduduki jabatan struktural/fungsional' }
    ]
  },
  {
    id: 'LYN-KP-02',
    kodeLayanan: 'PENYESUAIAN_PANGKAT',
    kategori: 'KEPANGKATAN',
    namaLayanan: 'Penyesuaian Pangkat',
    deskripsi: 'Usulan penyesuaian pangkat kelulusan ujian penyesuaian kenaikan pangkat / gelar baru',
    aktif: true,
    slaHari: 5,
    icon: 'bi-sliders',
    fields: [
      { name: 'ijazahDasar', label: 'Ijazah yang Digunakan', type: 'select', options: ['S-1 / D-IV (Golongan III/a)', 'S-2 (Golongan III/b)', 'S-3 (Golongan III/c)'], required: true },
      { name: 'nomorSertifikatUpkp', label: 'Nomor Surat Tanda Lulus UPKP / Ukom', type: 'text', placeholder: 'Nomor sertifikat kelulusan...', required: true },
      { name: 'uraianTugasBaru', label: 'Kesesuaian dengan Tugas Pokok', type: 'textarea', placeholder: 'Uraikan relevansi ijazah dengan bidang tugas di DJKI...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_stlud', label: 'Surat Tanda Lulus UPKP / Ujian Kenaikan Pangkat (PDF)', required: true, description: 'Bukti kelulusan ujian resmi' },
      { id: 'doc_ijazah_transkrip', label: 'Ijazah & Transkrip Nilai (PDF)', required: true, description: 'Ijazah yang telah disahkan' },
      { id: 'doc_sk_pangkat_akhir', label: 'SK Pangkat Terakhir (PDF)', required: true, description: 'SK Pangkat lama' }
    ]
  },
  {
    id: 'LYN-KP-03',
    kodeLayanan: 'PENINJAUAN_MASA_KERJA',
    kategori: 'KEPANGKATAN',
    namaLayanan: 'Peninjauan Masa Kerja (PMK)',
    deskripsi: 'Permohonan pengakuan masa kerja sebelum menjadi CPNS untuk penyesuaian gaji dan pangkat',
    aktif: true,
    slaHari: 7,
    icon: 'bi-calendar-check',
    fields: [
      { name: 'instansiSebelumnya', label: 'Nama Instansi / Lembaga Pengalaman Sebelumnya', type: 'text', placeholder: 'Contoh: Kementerian / BUMN / Swasta...', required: true },
      { name: 'masaKerjaDiajukan', label: 'Jumlah Masa Kerja yang Diusulkan', type: 'text', placeholder: 'Contoh: 3 Tahun 6 Bulan', required: true },
      { name: 'periodeBekerja', label: 'Periode Bekerja (Tahun Mulai s.d Selesai)', type: 'text', placeholder: '2018 - 2022', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_sk_pengalaman', label: 'SK Pengangkatan & Bukti Penggajian Instansi Sebelumnya (PDF)', required: true, description: 'Bukti otentik masa kerja' },
      { id: 'doc_sk_cpns_pns', label: 'SK CPNS & SK PNS (PDF)', required: true, description: 'SK Pengangkatan di Kemenkumham' }
    ]
  },
  {
    id: 'LYN-KP-04',
    kodeLayanan: 'KONSULTASI_KENAIKAN_PANGKAT',
    kategori: 'KEPANGKATAN',
    namaLayanan: 'Konsultasi Kenaikan Pangkat & Persyaratan',
    deskripsi: 'Layanan konsultasi perhitungan angka kredit, periode usulan, dan checklist berkas kenaikan pangkat',
    aktif: true,
    slaHari: 2,
    icon: 'bi-chat-heart',
    fields: [
      { name: 'topikKonsultasi', label: 'Topik Konsultasi Kepangkatan', type: 'select', options: ['Perhitungan Angka Kredit (PAK) Minimal', 'Syarat Masa Kerja & TMT', 'Ujian Penyesuaian Kenaikan Pangkat (UPKP)', 'Kenaikan Pangkat Luar Biasa (KPLB)', 'Lainnya'], required: true },
      { name: 'pertanyaan', label: 'Rincian Pertanyaan / Permasalahan', type: 'textarea', placeholder: 'Tuliskan pertanyaan detail Anda...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_lampiran_kp', label: 'Lampiran Berkas yang Ingin Dikonsultasikan (Opsional)', required: false, description: 'Draft PAK / SK Pangkat' }
    ]
  },

  // C. JABATAN
  {
    id: 'LYN-JB-01',
    kodeLayanan: 'PENGANGKATAN_JABATAN',
    kategori: 'JABATAN',
    namaLayanan: 'Pengangkatan Dalam Jabatan (Pertama / Perpindahan)',
    deskripsi: 'Proses administrasi pengangkatan pertama ke dalam Jabatan Fungsional atau penyesuaian jabatan',
    aktif: true,
    slaHari: 5,
    icon: 'bi-person-badge',
    fields: [
      { name: 'jenisPengangkatan', label: 'Jalur Pengangkatan', type: 'select', options: ['Pengangkatan Pertama (CPNS ke JF)', 'Perpindahan dari Jabatan Lain', 'Penyesuaian / Penyetaraan', 'Promosi Jabatan'], required: true },
      { name: 'namaJabatanTujuan', label: 'Nama Jabatan Fungsional yang Dituju', type: 'text', placeholder: 'Contoh: Pemeriksa Paten Ahli Pertama / Analis KI', required: true },
      { name: 'unitPenempatan', label: 'Unit Kerja Penempatan', type: 'text', placeholder: 'Direktorat / Bagian terkait...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_sk_pns', label: 'SK PNS & SK Pangkat Terakhir (PDF)', required: true, description: 'Bukti status kepegawaian' },
      { id: 'doc_sertifikat_ukom_jf', label: 'Sertifikat Lulus UKOM / Pelatihan Fungsional (jika ada)', required: false, description: 'Hasil uji kompetensi' }
    ]
  },
  {
    id: 'LYN-JB-02',
    kodeLayanan: 'PERPINDAHAN_MUTASI_JABATAN',
    kategori: 'JABATAN',
    namaLayanan: 'Perpindahan / Mutasi Jabatan',
    deskripsi: 'Permohonan perpindahan dari jabatan struktural/pelaksana ke fungsional atau antar rumpun fungsional',
    aktif: true,
    slaHari: 5,
    icon: 'bi-shuffle',
    fields: [
      { name: 'jabatanAsal', label: 'Jabatan Saat Ini', type: 'text', placeholder: 'Jabatan lama...', required: true },
      { name: 'jabatanTujuan', label: 'Jabatan Baru yang Diinginkan', type: 'text', placeholder: 'Jabatan baru...', required: true },
      { name: 'alasanPerpindahan', label: 'Alasan & Pertimbangan Kompetensi', type: 'textarea', placeholder: 'Jelaskan latar belakang kompetensi dan minat karir...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_portofolio_jf', label: 'Portofolio / SK Kinerja Terkait (PDF)', required: true, description: 'Bukti pengalaman di bidang jabatan tujuan' }
    ]
  },
  {
    id: 'LYN-JB-03',
    kodeLayanan: 'KONSULTASI_JABATAN',
    kategori: 'JABATAN',
    namaLayanan: 'Konsultasi Jenjang Jabatan & Karir',
    deskripsi: 'Konsultasi peta jabatan, butir kegiatan JF, uji kompetensi, dan formasi kebutuhan DJKI',
    aktif: true,
    slaHari: 2,
    icon: 'bi-question-circle',
    fields: [
      { name: 'judulKonsultasi', label: 'Topik Bahasan Jabatan', type: 'text', placeholder: 'Contoh: Prospek Uji Kompetensi Ahli Muda ke Ahli Madya', required: true },
      { name: 'deskripsiPertanyaan', label: 'Uraian Pertanyaan', type: 'textarea', placeholder: 'Tuliskan hal-hal yang ingin dikonsultasikan...', required: true }
    ],
    requiredDocuments: []
  },

  // D. KENAIKAN GAJI
  {
    id: 'LYN-KG-01',
    kodeLayanan: 'KENAIKAN_GAJI_BERKALA',
    kategori: 'KENAIKAN_GAJI',
    namaLayanan: 'Kenaikan Gaji Berkala (KGB)',
    deskripsi: 'Pengajuan penerbitan Surat Pemberitahuan Kenaikan Gaji Berkala (KGB) yang telah mencapai 2 tahun masa kerja',
    aktif: true,
    slaHari: 3,
    icon: 'bi-cash-coin',
    fields: [
      { name: 'tmtKgbTerakhir', label: 'TMT KGB / Pangkat Terakhir', type: 'date', required: true },
      { name: 'nomorSkKgbTerakhir', label: 'Nomor Surat KGB / SK Terakhir', type: 'text', placeholder: 'Nomor surat KGB lama...', required: true },
      { name: 'gajiPokokLama', label: 'Gaji Pokok Lama (Rp)', type: 'number', placeholder: 'Sesuai SK terakhir', required: true },
      { name: 'tmtKgbBaru', label: 'TMT KGB Baru yang Diusulkan', type: 'date', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_kgb_lama', label: 'Scan SK KGB Terakhir / SK Pangkat Terakhir (PDF)', required: true, description: 'Dasar penetapan gaji lama' },
      { id: 'doc_skp_terakhir', label: 'SKP Tahun Terakhir (Minimal Predikat Baik)', required: true, description: 'Syarat penilaian kinerja KGB' }
    ]
  },
  {
    id: 'LYN-KG-02',
    kodeLayanan: 'PENYESUAIAN_HAK_KEUANGAN',
    kategori: 'KENAIKAN_GAJI',
    namaLayanan: 'Penyesuaian Gaji & Hak Keuangan',
    deskripsi: 'Klarifikasi dan penyesuaian komponen tunjangan kinerja, uang makan, atau selisih gaji',
    aktif: true,
    slaHari: 3,
    icon: 'bi-wallet2',
    fields: [
      { name: 'komponenKeuangan', label: 'Komponen Hak Keuangan', type: 'select', options: ['Gaji Pokok & Tunjangan Keluarga', 'Tunjangan Kinerja (Tukin)', 'Uang Makan', 'Kekurangan Pembayaran (Rapel)', 'Lainnya'], required: true },
      { name: 'penjelasanKlaim', label: 'Uraian Penjelasan Permasalahan', type: 'textarea', placeholder: 'Jelaskan periode bulan dan selisih yang belum sesuai...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_slip_gaji', label: 'Slip Gaji / Rekening Koran / Bukti Potong (PDF)', required: true, description: 'Bukti penerimaan gaji' }
    ]
  },

  // E. TUGAS BELAJAR & KOMPETENSI
  {
    id: 'LYN-TB-01',
    kodeLayanan: 'TUGAS_BELAJAR',
    kategori: 'TUGAS_BELAJAR',
    namaLayanan: 'Tugas Belajar (Beasiswa / Mandiri)',
    deskripsi: 'Pengajuan izin tugas belajar untuk melanjutkan pendidikan formal S1/S2/S3 dengan pembiayaan LPDP, Kemenkumham, atau donor lain',
    aktif: true,
    slaHari: 5,
    icon: 'bi-mortarboard',
    fields: [
      { name: 'jenjangPendidikan', label: 'Jenjang Pendidikan', type: 'select', options: ['S-1 / D-IV', 'S-2 (Magister)', 'S-3 (Doktor)', 'Profesi / Spesialis'], required: true },
      { name: 'namaUniversitas', label: 'Nama Perguruan Tinggi', type: 'text', placeholder: 'Contoh: University of Melbourne / UGM', required: true },
      { name: 'programStudi', label: 'Program Studi / Fakultas', type: 'text', placeholder: 'Contoh: Intellectual Property Law', required: true },
      { name: 'negaraKota', label: 'Negara / Kota', type: 'text', placeholder: 'Contoh: Australia / Melbourne atau Jakarta', required: true },
      { name: 'sumberPembiayaan', label: 'Sumber Pembiayaan', type: 'select', options: ['Beasiswa LPDP', 'Beasiswa Kemenkumham / DJKI', 'Beasiswa Pemerintah Asing (AAS/Chevening/dll)', 'Biaya Mandiri'], required: true },
      { name: 'durasiStudi', label: 'Lama Studi (Bulan/Tahun)', type: 'text', placeholder: 'Contoh: 24 Bulan (2 Tahun)', required: true },
      { name: 'tanggalMulai', label: 'Tanggal Mulai Perkuliahan', type: 'date', required: true },
      { name: 'tanggalSelesai', label: 'Estimasi Tanggal Selesai', type: 'date', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_loa', label: 'Letter of Acceptance (LoA) Resmi dari Kampus (PDF)', required: true, description: 'Surat penerimaan universitas' },
      { id: 'doc_sponsorship', label: 'Surat Jaminan Pembiayaan / Bukti Beasiswa (PDF)', required: true, description: 'Letter of Guarantee sponsor' },
      { id: 'doc_rekomendasi_atasan', label: 'Surat Rekomendasi Pimpinan Unit Kerja (PDF)', required: true, description: 'Persetujuan Eselon II terkait' }
    ]
  },
  {
    id: 'LYN-TB-02',
    kodeLayanan: 'IZIN_BELAJAR',
    kategori: 'TUGAS_BELAJAR',
    namaLayanan: 'Izin Belajar (Di Luar Jam Kerja)',
    deskripsi: 'Pengajuan surat izin belajar mandiri tanpa meninggalkan tugas kedinasan sehari-hari',
    aktif: true,
    slaHari: 4,
    icon: 'bi-journal-bookmark-fill',
    fields: [
      { name: 'jenjangIzin', label: 'Jenjang Pendidikan', type: 'select', options: ['S-1 / D-IV', 'S-2 (Magister)', 'S-3 (Doktor)'], required: true },
      { name: 'namaKampus', label: 'Nama Perguruan Tinggi & Akreditasi', type: 'text', placeholder: 'Contoh: Universitas Indonesia (Akreditasi Unggul)', required: true },
      { name: 'jadwalKuliah', label: 'Jadwal Kuliah', type: 'text', placeholder: 'Contoh: Kelas Malam / Akhir Pekan (Sabtu-Minggu)', required: true },
      { name: 'komitmenTugas', label: 'Pernyataan Tidak Mengganggu Jam Kerja', type: 'textarea', placeholder: 'Pernyataan kesanggupan menjalankan tugas pokok DJKI...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_bukti_diterima', label: 'Bukti Penerimaan / KTM / Jadwal Kuliah (PDF)', required: true, description: 'Jadwal resmi dari kampus' },
      { id: 'doc_surat_rekomendasi', label: 'Surat Izin / Rekomendasi Atasan Langsung', required: true, description: 'Ditandatangani minimal Pejabat Administrator' }
    ]
  },
  {
    id: 'LYN-TB-03',
    kodeLayanan: 'PELATIHAN_SERTIFIKASI',
    kategori: 'TUGAS_BELAJAR',
    namaLayanan: 'Pengembangan Kompetensi & Sertifikasi',
    deskripsi: 'Pendaftaran usulan mengikuti pelatihan teknis, manajerial, sertifikasi profesi KI, atau seminar',
    aktif: true,
    slaHari: 3,
    icon: 'bi-patch-check',
    fields: [
      { name: 'namaPelatihan', label: 'Nama Program Pelatihan / Sertifikasi', type: 'text', placeholder: 'Contoh: Certified Intellectual Property Expert', required: true },
      { name: 'penyelenggara', label: 'Lembaga Penyelenggara', type: 'text', placeholder: 'Contoh: BPSDM Hukum & HAM / WIPO / Lembaga Sertifikasi', required: true },
      { name: 'metodePelatihan', label: 'Metode Pelaksanaan', type: 'select', options: ['Online (E-Learning)', 'Klasikal / Tatap Muka (Luar Kota)', 'Klasikal / Tatap Muka (Dalam Kota)', 'Blended Learning'], required: true },
      { name: 'tanggalPelaksanaan', label: 'Tanggal Mulai s.d Selesai', type: 'text', placeholder: 'Contoh: 10 - 15 September 2026', required: true },
      { name: 'targetJpl', label: 'Estimasi Jam Pelajaran (JP)', type: 'number', placeholder: 'Contoh: 20 JP', required: false }
    ],
    requiredDocuments: [
      { id: 'doc_brosur_undangan', label: 'Surat Undangan / Brosur / Kerangka Acuan Kerja (PDF)', required: true, description: 'Info resmi kegiatan pelatihan' }
    ]
  },

  // F. MUTASI
  {
    id: 'LYN-MT-01',
    kodeLayanan: 'MUTASI_INTERNAL_DJKI',
    kategori: 'MUTASI',
    namaLayanan: 'Mutasi Internal Antar-Direktorat / Bagian DJKI',
    deskripsi: 'Permohonan alih tugas dan penempatan antar-unit kerja di lingkungan Direktorat Jenderal Kekayaan Intelektual',
    aktif: true,
    slaHari: 7,
    icon: 'bi-arrow-left-right',
    fields: [
      { name: 'unitSaatIni', label: 'Unit Kerja Saat Ini', type: 'text', placeholder: 'Direktorat / Bagian saat ini...', required: true },
      { name: 'unitTujuan', label: 'Unit Kerja yang Dituju', type: 'text', placeholder: 'Direktorat / Bagian tujuan...', required: true },
      { name: 'alasanMutasi', label: 'Alasan Permohonan Mutasi Internal', type: 'textarea', placeholder: 'Jelaskan kebutuhan organisasi, kesesuaian keahlian, atau pertimbangan lainnya...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_surat_permohonan', label: 'Surat Permohonan Pribadi Bermaterai (PDF)', required: true, description: 'Surat permohonan resmi kepada Direktur Jenderal KI' },
      { id: 'doc_sk_terakhir_mutasi', label: 'SK Penempatan / SK Jabatan Terakhir', required: true, description: 'SK jabatan terakhir' }
    ]
  },
  {
    id: 'LYN-MT-02',
    kodeLayanan: 'MUTASI_KELUAR_MASUK',
    kategori: 'MUTASI',
    namaLayanan: 'Mutasi Masuk / Keluar DJKI (Antar-Unit Utama / Kanwil)',
    deskripsi: 'Administrasi usulan mutasi masuk dari Kanwil/Unit Utama lain ke DJKI atau mutasi keluar ke instansi luar',
    aktif: true,
    slaHari: 14,
    icon: 'bi-building-up',
    fields: [
      { name: 'arahMutasi', label: 'Jenis Mutasi', type: 'select', options: ['Mutasi Masuk ke DJKI', 'Mutasi Keluar ke Unit Utama Lain (Kemenkumham)', 'Mutasi Keluar ke Kanwil Kemenkumham', 'Mutasi Antar-Kementerian / Instansi Pusat'], required: true },
      { name: 'instansiAsalTujuan', label: 'Instansi / Satuan Kerja Asal / Tujuan', type: 'text', placeholder: 'Nama instansi / Kanwil...', required: true },
      { name: 'keteranganKeluarga', label: 'Alasan / Kondisi Khusus', type: 'textarea', placeholder: 'Tuliskan alasan pengajuan mutasi...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_surat_rekomendasi_instansi', label: 'Surat Permohonan & Rekomendasi Pejabat Pembina Kepegawaian (PDF)', required: true, description: 'Surat persetujuan resmi' },
      { id: 'doc_dossier_lengkap', label: 'Curriculum Vitae & Rekap Kinerja 2 Tahun Terakhir', required: true, description: 'CV dan SKP' }
    ]
  },

  // G. DISIPLIN KEPEGAWAIAN
  {
    id: 'LYN-DS-01',
    kodeLayanan: 'KONSULTASI_DISIPLIN',
    kategori: 'DISIPLIN',
    namaLayanan: 'Konsultasi & Pendampingan Disiplin Pegawai',
    deskripsi: 'Layanan konsultasi terkait kepatuhan jam kerja, izin perkawinan/perceraian, LHKPN/LHKASN, dan kode etik ASN',
    aktif: true,
    slaHari: 2,
    icon: 'bi-shield-exclamation',
    fields: [
      { name: 'topikDisiplin', label: 'Topik Disiplin / Kepatuhan', type: 'select', options: ['Kepatuhan Jam Kerja & Rekap Absensi', 'Prosedur Izin Perkawinan & Perceraian ASN', 'Kewajiban Pelaporan LHKPN / LHKASN', 'Kode Etik & Perilaku Pegawai DJKI', 'Lainnya'], required: true },
      { name: 'detailKonsultasi', label: 'Uraian Situasi / Pertanyaan', type: 'textarea', placeholder: 'Sampaikan pertanyaan atau hal yang memerlukan klarifikasi ketentuan perundang-undangan...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_lampiran_disiplin', label: 'Dokumen Pendukung Terkait (Jika ada)', required: false, description: 'Surat / bukti terkait' }
    ]
  },
  {
    id: 'LYN-DS-02',
    kodeLayanan: 'KLARIFIKASI_KEBERATAN_DISIPLIN',
    kategori: 'DISIPLIN',
    namaLayanan: 'Klarifikasi & Tanggapan Disiplin',
    deskripsi: 'Penyampaian klarifikasi, bukti pendukung kehadiran, atau permohonan peninjauan catatan disiplin',
    aktif: true,
    slaHari: 3,
    icon: 'bi-chat-left-text',
    fields: [
      { name: 'perihalKlarifikasi', label: 'Perihal Surat / Catatan Klarifikasi', type: 'text', placeholder: 'Contoh: Klarifikasi Ketidakhadiran Tanggal...', required: true },
      { name: 'alasanKlarifikasi', label: 'Uraian Pembelaan Diri / Penjelasan Kondisi', type: 'textarea', placeholder: 'Uraikan secara kronologis kejadian dan alasan yang dapat dipertanggungjawabkan...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_surat_tugas_sakit', label: 'Surat Tugas / Surat Keterangan Dokter / Bukti Force Majeure (PDF)', required: true, description: 'Bukti sah yang melandasi ketidakhadiran' }
    ]
  },

  // H. PENSIUN
  {
    id: 'LYN-PS-01',
    kodeLayanan: 'USULAN_PENSIUN_BUP',
    kategori: 'PENSIUN',
    namaLayanan: 'Pensiun Batas Usia Pensiun (BUP)',
    deskripsi: 'Pemberkasan dan pengusulan SK Pensiun bagi PNS yang mencapai Batas Usia Pensiun (58 / 60 / 65 Tahun)',
    aktif: true,
    slaHari: 10,
    icon: 'bi-person-walking',
    fields: [
      { name: 'usiaBup', label: 'Batas Usia Pensiun (BUP)', type: 'select', options: ['58 Tahun (Pejabat Pelaksana / Administrasi)', '60 Tahun (Pejabat Fungsional Ahli Madya)', '65 Tahun (Pejabat Fungsional Ahli Utama)'], required: true },
      { name: 'tmtPensiunEstimasi', label: 'TMT Pensiun', type: 'date', required: true },
      { name: 'alamatSetelahPensiun', label: 'Alamat Tempat Tinggal Pasca Pensiun', type: 'textarea', placeholder: 'Alamat lengkap domisili penerimaan pembayaran pensiun PT TASPEN...', required: true },
      { name: 'kantorBayarTaspen', label: 'Kantor Cabang / Bank Pembayaran TASPEN', type: 'text', placeholder: 'Contoh: Bank Mandiri Taspen / Kantor Pos...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_sk_cpns_akhir', label: 'SK CPNS s.d SK Pangkat Terakhir (PDF Digabung)', required: true, description: 'Kumpulan seluruh SK Pangkat' },
      { id: 'doc_sk_jabatan_akhir', label: 'SK Jabatan Terakhir & SPMT (PDF)', required: true, description: 'SK jabatan terakhir' },
      { id: 'doc_data_keluarga', label: 'KK, KTP, Buku Nikah, Akta Anak (PDF)', required: true, description: 'Dokumen penetapan hak janda/duda/anak' },
      { id: 'doc_foto_pensiun', label: 'Pas Foto 3x4 Latar Belakang Merah (JPG)', required: true, description: 'Foto formal terbaru' }
    ]
  },
  {
    id: 'LYN-PS-02',
    kodeLayanan: 'PENSIUN_APS_DINI',
    kategori: 'PENSIUN',
    namaLayanan: 'Pensiun Atas Permintaan Sendiri (APS / Dini)',
    deskripsi: 'Permohonan pensiun dini atas permintaan sendiri bagi PNS yang telah memenuhi syarat masa kerja minimal 20 tahun dan usia minimal 50 tahun',
    aktif: true,
    slaHari: 14,
    icon: 'bi-door-open',
    fields: [
      { name: 'usiaSaatIni', label: 'Usia Saat Ini', type: 'number', placeholder: 'Minimal 50 tahun...', required: true },
      { name: 'totalMasaKerja', label: 'Total Masa Kerja (Tahun)', type: 'number', placeholder: 'Minimal 20 tahun...', required: true },
      { name: 'tmtPensiunDiusulkan', label: 'TMT Pensiun yang Diinginkan', type: 'date', required: true },
      { name: 'alasanPensiunDini', label: 'Alasan Mengajukan Pensiun Atas Permintaan Sendiri', type: 'textarea', placeholder: 'Jelaskan alasan pengunduran diri / pensiun dini...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_surat_permohonan_aps', label: 'Surat Permohonan Pensiun APS Bermaterai Rp 10.000 (PDF)', required: true, description: 'Surat resmi permohonan pribadi' },
      { id: 'doc_sk_cpns_pns_lengkap', label: 'Buku Riwayat Layanan / SK Pangkat Lengkap (PDF)', required: true, description: 'Bukti pemenuhan syarat masa kerja' }
    ]
  },
  {
    id: 'LYN-PS-03',
    kodeLayanan: 'KONSULTASI_PENSIUN',
    kategori: 'PENSIUN',
    namaLayanan: 'Konsultasi Masa Persiapan Pensiun (MPP)',
    deskripsi: 'Konsultasi perhitungan sisa masa kerja, hak TASPEN, tabungan perumahan (TAPERA), dan Masa Persiapan Pensiun',
    aktif: true,
    slaHari: 2,
    icon: 'bi-calendar-event',
    fields: [
      { name: 'topikPensiun', label: 'Topik Bahasan Pensiun', type: 'select', options: ['Perhitungan Estimasi TMT Pensiun BUP', 'Pengambilan Hak Masa Persiapan Pensiun (MPP 1 Tahun)', 'Klaim Hak TASPEN & Pembayaran Tabungan Hari Tua', 'Pemberkasan Digital SIASN Pensiun'], required: true },
      { name: 'uraianPertanyaan', label: 'Pertanyaan', type: 'textarea', placeholder: 'Tuliskan hal yang ingin dikonsultasikan...', required: true }
    ],
    requiredDocuments: []
  },

  // I. ADMINISTRASI KEPEGAWAIAN
  {
    id: 'LYN-AD-01',
    kodeLayanan: 'SURAT_KET_AKTIF',
    kategori: 'ADMINISTRASI',
    namaLayanan: 'Surat Keterangan Aktif Bekerja',
    deskripsi: 'Penerbitan Surat Keterangan bahwa pegawai yang bersangkutan berstatus aktif bekerja di lingkungan DJKI',
    aktif: true,
    slaHari: 2,
    icon: 'bi-file-earmark-person',
    fields: [
      { name: 'keperluanSurat', label: 'Tujuan / Keperluan Pengajuan Surat', type: 'select', options: ['Pengajuan Pinjaman Bank / KPR', 'Kelengkapan Beasiswa / Studi Mandiri', 'Pendaftaran Sekolah / Universitas Anak', 'Pembuatan Visa / Perjalanan Luar Negeri', 'Lainnya'], required: true },
      { name: 'instansiTujuan', label: 'Nama Instansi / Lembaga yang Dituju', type: 'text', placeholder: 'Contoh: Bank BTN Kantor Cabang Cibinong / Kedubes...', required: true },
      { name: 'catatanKhusus', label: 'Keterangan Tambahan pada Surat', type: 'textarea', placeholder: 'Sebutkan jika membutuhkan pencantuman besaran penghasilan / NIP atasan...', required: false }
    ],
    requiredDocuments: [
      { id: 'doc_pengantar_atasan', label: 'Bukti Pendukung / Formulir Bank (Opsional)', required: false, description: 'Format khusus dari bank bila ada' }
    ]
  },
  {
    id: 'LYN-AD-02',
    kodeLayanan: 'SURAT_KET_MASA_KERJA',
    kategori: 'ADMINISTRASI',
    namaLayanan: 'Surat Keterangan Masa Kerja & Bebas Hukuman',
    deskripsi: 'Penerbitan surat keterangan rekam jejak pengabdian dan keterangan tidak sedang menjalani hukuman disiplin',
    aktif: true,
    slaHari: 2,
    icon: 'bi-patch-question',
    fields: [
      { name: 'jenisKeterangan', label: 'Jenis Surat yang Dibutuhkan', type: 'select', options: ['Surat Keterangan Masa Kerja', 'Surat Keterangan Tidak Sedang Menjalani Hukuman Disiplin', 'Surat Keterangan Bebas Temuan BPK/Itjen'], required: true },
      { name: 'keperluan', label: 'Keperluan', type: 'text', placeholder: 'Contoh: Persyaratan Seleksi Terbuka / Beasiswa...', required: true }
    ],
    requiredDocuments: []
  },
  {
    id: 'LYN-AD-03',
    kodeLayanan: 'LEGALISASI_DOKUMEN',
    kategori: 'ADMINISTRASI',
    namaLayanan: 'Legalisasi Dokumen Kepegawaian',
    deskripsi: 'Permohonan legalisasi salinan SK CPNS, SK PNS, SK Pangkat, SK Jabatan, dan sertifikat resmi',
    aktif: true,
    slaHari: 2,
    icon: 'bi-stamp',
    fields: [
      { name: 'jenisDokumenLegalisir', label: 'Dokumen yang Dilegalisir', type: 'select', options: ['SK CPNS / SK PNS', 'SK Kenaikan Pangkat Terakhir', 'SK Jabatan & SPMT', 'SK Kenaikan Gaji Berkala (KGB)', 'Seluruh Salinan Arsip Kepegawaian'], required: true },
      { name: 'jumlahRangkap', label: 'Jumlah Lembar / Rangkap yang Dibutuhkan', type: 'number', placeholder: 'Contoh: 3 rangkap', required: true },
      { name: 'keperluanLegalisir', label: 'Keperluan Legalisasi', type: 'text', placeholder: 'Tuliskan instansi peminta...', required: true }
    ],
    requiredDocuments: [
      { id: 'doc_berkas_asli', label: 'Scan Dokumen Asli yang Akan Dilegalisir (PDF)', required: true, description: 'File master berkualitas jelas' }
    ]
  },

  // J. KONSULTASI SDM
  {
    id: 'LYN-KS-01',
    kodeLayanan: 'KONSULTASI_UMUM_SDM',
    kategori: 'KONSULTASI_SDM',
    namaLayanan: 'Konsultasi Karir & Kepegawaian Terpadu',
    deskripsi: 'Layanan konsultasi tatap muka / online seputar pengembangan karir, perpindahan jabatan, dan regulasi ASN',
    aktif: true,
    slaHari: 2,
    icon: 'bi-headset',
    fields: [
      { name: 'bidangKonsultasi', label: 'Bidang Konsultasi', type: 'select', options: ['Perencanaan Karir ASN', 'Manajemen Talenta & Penilaian Potensi', 'Regulasi Baru Manajemen ASN (UU No 20/2023)', 'Pengelolaan SKP & Ekspektasi Kinerja', 'Kesejahteraan & Asuransi Pegawai', 'Lainnya'], required: true },
      { name: 'ringkasanMasalah', label: 'Ringkasan Topik / Pokok Pertanyaan', type: 'textarea', placeholder: 'Uraikan permasalahan atau pertanyaan yang ingin dikonsultasikan secara jelas...', required: true },
      { name: 'preferensiMetode', label: 'Preferensi Konsultasi', type: 'select', options: ['Tanggapan Tertulis di Sistem Tiket', 'Konsultasi Tatap Muka di Bagian Kepegawaian', 'Telepon / WhatsApp Call'], required: true }
    ],
    requiredDocuments: []
  },

  // K. LAINNYA
  {
    id: 'LYN-LN-01',
    kodeLayanan: 'LAYANAN_LAINNYA',
    kategori: 'LAINNYA',
    namaLayanan: 'Permohonan Layanan SDM Lainnya',
    deskripsi: 'Pengajuan permohonan layanan khusus kepegawaian yang belum terdaftar pada menu kategori di atas',
    aktif: true,
    slaHari: 3,
    icon: 'bi-grid-3x3-gap',
    fields: [
      { name: 'judulPermohonan', label: 'Judul Permohonan', type: 'text', placeholder: 'Tuliskan judul singkat permohonan Anda...', required: true },
      { name: 'deskripsiPermohonan', label: 'Deskripsi Permohonan', type: 'textarea', placeholder: 'Jelaskan secara lengkap dan rinci latar belakang serta permohonan Anda...', required: true },
      { name: 'urgensi', label: 'Tingkat Urgensi', type: 'select', options: ['Biasa (Sesuai SLA)', 'Penting / Segera', 'Mendesak'], required: true }
    ],
    requiredDocuments: [
      { id: 'doc_pendukung_lain', label: 'Dokumen Pendukung (Opsional)', required: false, description: 'File referensi atau surat pengantar' }
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
