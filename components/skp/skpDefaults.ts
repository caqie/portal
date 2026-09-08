import { Pegawai, HasilKerjaRow, PerilakuKerjaRow } from '../../types';

export const LOGO_GARUDA_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/National_emblem_of_Indonesia_Garuda_Pancasila.svg/800px-National_emblem_of_Indonesia_Garuda_Pancasila.svg.png";

export interface SKPItemRHK {
  kategori: 'UTAMA' | 'TAMBAHAN';
  rencanaPimpinan: string;
  rencanaPegawai: string;
  aspek: 'Kualitas' | 'Kuantitas' | 'Waktu' | 'Biaya';
  indikator: string;
  target: string;
  realisasi: string;
  umpanBalik: string;
}

export interface SKPPerilakuItem {
  poin: string;
  subPoints: string[];
  ekspektasi: string;
  umpanBalik: string;
}

export const BERAKHLAK_DEFAULT: SKPPerilakuItem[] = [
  {
    poin: 'Berorientasi Pelayanan',
    subPoints: [
      'Memahami dan memenuhi kebutuhan masyarakat',
      'Ramah, cekatan, solutif, dan dapat diandalkan',
      'Melakukan perbaikan tiada henti'
    ],
    ekspektasi: 'Untuk Dapat Dipertahankan',
    umpanBalik: 'Ketika Menjelaskan Mudah Dipahami dan Dimengerti'
  },
  {
    poin: 'Akuntabel',
    subPoints: [
      'Melaksanakan tugas dengan jujur, bertanggungjawab, cermat, disiplin dan berintegritas tinggi',
      'Menggunakan kekayaan dan barang milik negara secara bertanggungjawab, efektif, dan efisien',
      'Tidak menyalahgunakan kewenangan jabatan'
    ],
    ekspektasi: 'Untuk Dapat Dipertahankan',
    umpanBalik: 'Berani Berterus Terang dan Bersedia Memperbaiki Ketika ada Komplain Dari Pegawai'
  },
  {
    poin: 'Kompeten',
    subPoints: [
      'Meningkatkan kompetensi diri untuk menjawab tantangan yang selalu berubah',
      'Membantu orang lain belajar',
      'Melaksanakan tugas dengan kualitas terbaik'
    ],
    ekspektasi: 'Untuk Dapat Dipertahankan',
    umpanBalik: 'Mengupayakan Yang Terbaik'
  },
  {
    poin: 'Harmonis',
    subPoints: [
      'Menghargai setiap orang apapun latar belakangnya',
      'Suka menolong orang lain',
      'Membangun lingkungan kerja yang kondusif'
    ],
    ekspektasi: 'Untuk Dapat Dipertahankan',
    umpanBalik: 'Siap Memberikan Bantuan Dan Pendampingan'
  },
  {
    poin: 'Loyal',
    subPoints: [
      'Memegang teguh ideologi Pancasila, Undang-Undang Dasar Negara Republik Indonesia Tahun 1945, setia kepada Negara Kesatuan Republik Indonesia serta pemerintahan yang sah',
      'Menjaga nama baik sesama ASN, Pimpinan, Instansi, dan Negara',
      'Menjaga rahasia jabatan dan negara'
    ],
    ekspektasi: 'Untuk Dapat Dipertahankan',
    umpanBalik: 'Selalu Siap Ketika Dibutuhkan'
  },
  {
    poin: 'Adaptif',
    subPoints: [
      'Cepat menyesuaikan diri menghadapi perubahan',
      'Terus berinovasi dan mengembangkan kreativitas',
      'Bertindak proaktif'
    ],
    ekspektasi: 'Untuk Dapat Dipertahankan',
    umpanBalik: 'Semangat Untuk Mempelajari Hal Baru Dan Bisa Beradaptasi'
  },
  {
    poin: 'Kolaboratif',
    subPoints: [
      'Memberi kesempatan kepada berbagai pihak untuk berkontribusi',
      'Terbuka dalam bekerja sama untuk menghasilkan nilai tambah',
      'Menggerakkan pemanfaatan berbagai sumberdaya untuk tujuan bersama'
    ],
    ekspektasi: 'Untuk Dapat Dipertahankan',
    umpanBalik: 'Selalu Bekerja sama dan Memberikan Kesempatan Kepada Pihak Lain Dalam Rangka Pelaksanaan Manajemen Pegawai'
  }
];

export const DEFAULT_RHK_ITEMS: SKPItemRHK[] = [
  {
    kategori: 'UTAMA',
    rencanaPimpinan: 'Terwujudnya pengelolaan administrasi dan layanan kepegawaian yang tertib, akurat, dan sesuai ketentuan di Direktorat Jenderal Kekayaan Intelektual',
    rencanaPegawai: 'Terlaksananya pelayanan administrasi kepegawaian di lingkungan Direktorat Jenderal Kekayaan Intelektual',
    aspek: 'Kualitas',
    indikator: 'Persentase layanan administrasi kepegawaian yang diselesaikan',
    target: '100%',
    realisasi: '100%',
    umpanBalik: 'SECARA KESELURUHAN SUDAH SESUAI DENGAN DATA'
  },
  {
    kategori: 'UTAMA',
    rencanaPimpinan: 'Terwujudnya pengelolaan administrasi dan layanan kepegawaian yang tertib, akurat, dan sesuai ketentuan di Direktorat Jenderal Kekayaan Intelektual',
    rencanaPegawai: 'Terlaksananya pelayanan administrasi kepegawaian di lingkungan Direktorat Jenderal Kekayaan Intelektual',
    aspek: 'Waktu',
    indikator: 'Terselesaikan dengan tepat waktu pelayanan administrasi kepegawaian',
    target: '3 Bulan',
    realisasi: '3 Bulan',
    umpanBalik: 'SANGAT CEPAT TERUS PERTAHANKAN'
  },
  {
    kategori: 'UTAMA',
    rencanaPimpinan: 'Terwujudnya pengelolaan administrasi dan layanan kepegawaian yang tertib, akurat, dan sesuai ketentuan di Direktorat Jenderal Kekayaan Intelektual',
    rencanaPegawai: 'Terkelolanya data dan dokumen kepegawaian secara tertib dan akurat',
    aspek: 'Kualitas',
    indikator: 'Persentase layanan administrasi kepegawaian yang diselesaikan',
    target: '100%',
    realisasi: '100%',
    umpanBalik: 'DAPAT DI PERTAHANKAN'
  },
  {
    kategori: 'UTAMA',
    rencanaPimpinan: 'Terwujudnya pengelolaan administrasi dan layanan kepegawaian yang tertib, akurat, dan sesuai ketentuan di Direktorat Jenderal Kekayaan Intelektual',
    rencanaPegawai: 'Terkelolanya data dan dokumen kepegawaian secara tertib dan akurat',
    aspek: 'Waktu',
    indikator: 'Terselesaikan dengan tepat waktu data dan dokumen kepegawaian',
    target: '3 Bulan',
    realisasi: '3 Bulan',
    umpanBalik: 'SANGAT CEPAT TERUS PERTAHANKAN'
  },
  {
    kategori: 'UTAMA',
    rencanaPimpinan: 'Terwujudnya pengelolaan administrasi dan layanan kepegawaian yang tertib, akurat, dan sesuai ketentuan di Direktorat Jenderal Kekayaan Intelektual',
    rencanaPegawai: 'Tersedianya dukungan operasional kegiatan SDM',
    aspek: 'Kualitas',
    indikator: 'Jumlah kegiatan SDM yang didukung secara administratif',
    target: '100%',
    realisasi: '99%',
    umpanBalik: 'DAPAT DI PERTAHANKAN'
  },
  {
    kategori: 'UTAMA',
    rencanaPimpinan: 'Terwujudnya pengelolaan administrasi dan layanan kepegawaian yang tertib, akurat, dan sesuai ketentuan di Direktorat Jenderal Kekayaan Intelektual',
    rencanaPegawai: 'Tersedianya dukungan operasional kegiatan SDM',
    aspek: 'Waktu',
    indikator: 'Terselesaikan dengan tepat waktu',
    target: '3 Bulan',
    realisasi: '3 Bulan',
    umpanBalik: 'SANGAT CEPAT TERUS PERTAHANKAN'
  },
  {
    kategori: 'UTAMA',
    rencanaPimpinan: 'Terwujudnya pengelolaan administrasi dan layanan kepegawaian yang tertib, akurat, dan sesuai ketentuan di Direktorat Jenderal Kekayaan Intelektual',
    rencanaPegawai: 'Tersusunnya laporan layanan operasional SDM',
    aspek: 'Kualitas',
    indikator: 'Akurat dan sesuai SOP',
    target: '100%',
    realisasi: '99%',
    umpanBalik: 'DAPAT DI PERTAHANKAN'
  },
  {
    kategori: 'UTAMA',
    rencanaPimpinan: 'Terwujudnya pengelolaan administrasi dan layanan kepegawaian yang tertib, akurat, dan sesuai ketentuan di Direktorat Jenderal Kekayaan Intelektual',
    rencanaPegawai: 'Tersusunnya laporan layanan operasional SDM',
    aspek: 'Waktu',
    indikator: 'Terselesaikan dengan tepat waktu laporan layanan operasional SDM',
    target: '3 Bulan',
    realisasi: '3 Bulan',
    umpanBalik: 'SANGAT CEPAT TERUS PERTAHANKAN'
  }
];

export const DEFAULT_LAMPIRAN = {
  dukunganSumberDaya: [
    'Dibutuhkan dukungan sarana prasarana berupa PC, printer, scanner untuk mengelola dan menyusun dokumen kearsipan',
    'Melaksanakan tugas kedinasan lain yang diberikan oleh pimpinan sesuai bidang tugas SDM.'
  ],
  skemaPertanggungjawaban: [
    'Laporan triwulan',
    'Bukti kerja dalam bentuk laporan'
  ],
  konsekuensi: [
    'Bila target tercapai sesuai rencana maka akan mendapat apresiasi dari atasan langsung',
    'Bila target tidak tercapai maka harus ada percepatan kegiatan selanjutnya'
  ]
};

export const getPegawaiDisplayInfo = (peg?: Pegawai, fallbackNip?: string) => {
  if (!peg) {
    if (fallbackNip === 'MENTERI-HUKUM-RI' || fallbackNip?.toUpperCase().includes('MENTERI')) {
      return {
        nama: 'Menteri Hukum RI',
        nip: '-',
        nipLabel: 'NIP',
        pangkatGol: 'Pejabat Negara',
        jabatan: 'Menteri Hukum Republik Indonesia',
        unitKerja: 'Kementerian Hukum RI',
        isPPPK: false
      };
    }
    return {
      nama: fallbackNip || '-',
      nip: fallbackNip || '-',
      nipLabel: 'NIP',
      pangkatGol: '-',
      jabatan: '-',
      unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
      isPPPK: false
    };
  }

  const isPPPK = peg.jenisPegawai === 'PPPK' || 
                 (Boolean(peg.nip) && peg.nip.length >= 18 && (peg.golRuang?.match(/^([IVXLCDM]+)$/) !== null || peg.golRuang?.startsWith('Golongan') || peg.nip.includes('202521') || peg.nip.includes('PPPK')));

  let pangkatGol = '-';
  if (peg.pangkat && peg.golRuang) {
    pangkatGol = `${peg.pangkat.toUpperCase()} (${peg.golRuang})`;
  } else if (peg.pangkat) {
    pangkatGol = peg.pangkat.toUpperCase();
  } else if (peg.golRuang) {
    pangkatGol = `(${peg.golRuang})`;
  }

  return {
    nama: peg.nama,
    nip: peg.nip,
    nipLabel: isPPPK ? 'NIPPPK' : 'NIP',
    pangkatGol,
    jabatan: peg.jabatan,
    unitKerja: peg.unitKerja || 'Direktorat Jenderal Kekayaan Intelektual',
    isPPPK
  };
};
