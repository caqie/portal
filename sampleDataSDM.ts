import { Pegawai, TupoksiSDMItem } from './types';
import { INITIAL_TUPOKSI_SDM } from './tupoksiConstants';

export const SAMPLE_PEGAWAI_SDM: Partial<Pegawai>[] = [
  {
    id: 'PEG-001',
    nip: '198504122008121001',
    nama: 'BAMBANG HERMANTO, S.T., M.Kom.',
    golongan: 'IV/a',
    golRuang: 'IV/a',
    pangkat: 'Pembina',
    jabatan: 'Pemeriksa Paten Ahli Madya',
    unitKerja: 'Direktorat Paten, DTLST dan Rahasia Dagang',
    email: 'bambang.hermanto@dgip.go.id',
    noHp: '081234567890',
    status: 'PNS',
    gender: 'L',
    pendidikan: 'S2 Teknik Informatika',
    tmtPangkat: '2022-04-01',
    tmtJabatan: '2020-10-01'
  },
  {
    id: 'PEG-002',
    nip: '199003152014022003',
    nama: 'RATNA DEWI PUSPITASARI, S.H., M.H.',
    golongan: 'III/c',
    golRuang: 'III/c',
    pangkat: 'Penata',
    jabatan: 'Pemeriksa Merek Ahli Muda',
    unitKerja: 'Direktorat Merek dan Indikasi Geografis',
    email: 'ratna.dewi@dgip.go.id',
    noHp: '081398765432',
    status: 'PNS',
    gender: 'P',
    pendidikan: 'S2 Ilmu Hukum',
    tmtPangkat: '2023-10-01',
    tmtJabatan: '2021-02-01'
  },
  {
    id: 'PEG-003',
    nip: '199208202015032002',
    nama: 'NURUL HIDAYAH, S.H.',
    golongan: 'III/b',
    golRuang: 'III/b',
    pangkat: 'Penata Muda Tk. I',
    jabatan: 'Pemeriksa Merek Ahli Pertama',
    unitKerja: 'Direktorat Merek dan Indikasi Geografis',
    email: 'nurul.hidayah@dgip.go.id',
    noHp: '081211223344',
    status: 'PNS',
    gender: 'P',
    pendidikan: 'S1 Ilmu Hukum',
    tmtPangkat: '2023-04-01',
    tmtJabatan: '2022-01-01'
  },
  {
    id: 'PEG-004',
    nip: '199511102022031001',
    nama: 'ANDI PRASETYO, S.Kom.',
    golongan: 'III/a',
    golRuang: 'III/a',
    pangkat: 'Penata Muda',
    jabatan: 'Pranata Komputer Ahli Pertama',
    unitKerja: 'Direktorat Teknologi Informasi Kekayaan Intelektual',
    email: 'andi.prasetyo@dgip.go.id',
    noHp: '085712345678',
    status: 'PNS',
    gender: 'L',
    pendidikan: 'S1 Ilmu Komputer',
    tmtPangkat: '2022-03-01',
    tmtJabatan: '2022-03-01'
  },
  {
    id: 'PEG-005',
    nip: '198205042006041002',
    nama: 'HENDRA KUSUMA, S.H., M.Si.',
    golongan: 'IV/b',
    golRuang: 'IV/b',
    pangkat: 'Pembina Tk. I',
    jabatan: 'Analis Kepegawaian Ahli Madya / Ketua Tim SDM',
    unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    email: 'hendra.kusuma@dgip.go.id',
    noHp: '081122334455',
    status: 'PNS',
    gender: 'L',
    pendidikan: 'S2 Administrasi Publik',
    tmtPangkat: '2021-04-01',
    tmtJabatan: '2019-01-01'
  },
  {
    id: 'PEG-006',
    nip: '198801122010122001',
    nama: 'SITI AMINAH, S.E., M.M.',
    golongan: 'III/d',
    golRuang: 'III/d',
    pangkat: 'Penata Tk. I',
    jabatan: 'Pranata SDM Aparatur Ahli Muda',
    unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    email: 'siti.aminah@dgip.go.id',
    noHp: '081344556677',
    status: 'PNS',
    gender: 'P',
    pendidikan: 'S2 Manajemen SDM',
    tmtPangkat: '2022-10-01',
    tmtJabatan: '2021-06-01'
  }
];

export const SAMPLE_PENGAJUAN_LAYANAN_SDM = [
  {
    id: 'REQ-2026-001',
    nomorTiket: 'SDM/KARIS/2026/001',
    jenisLayanan: 'Penerbitan Karis / Karsu',
    kategori: 'Layanan Pegawai & Kesejahteraan',
    nip: '198504122008121001',
    namaPegawai: 'BAMBANG HERMANTO, S.T., M.Kom.',
    unitKerja: 'Direktorat Paten, DTLST dan Rahasia Dagang',
    tanggalPengajuan: '2026-08-25T09:30:00.000Z',
    status: 'DIPROSES',
    tahapan: 'Verifikasi Berkas Buku Nikah & SK CPNS/PNS',
    catatanPetugas: 'Berkas lengkap, sedang proses penerbitan surat pengantar ke BKN.',
    dokumen: [
      { nama: 'Buku_Nikah_Legalisir.pdf', url: 'https://drive.google.com/sample1' },
      { nama: 'SK_PNS_Legalisir.pdf', url: 'https://drive.google.com/sample2' }
    ]
  },
  {
    id: 'REQ-2026-002',
    nomorTiket: 'SDM/BPJS/2026/002',
    jenisLayanan: 'Pendaftaran & Penambahan Anggota BPJS Kesehatan',
    kategori: 'Jaminan Sosial & Kesejahteraan',
    nip: '199208202015032002',
    namaPegawai: 'NURUL HIDAYAH, S.H.',
    unitKerja: 'Direktorat Merek dan Indikasi Geografis',
    tanggalPengajuan: '2026-08-26T14:15:00.000Z',
    status: 'SELESAI',
    tahapan: 'Sinkronisasi e-Dabu BPJS Kesehatan Berhasil',
    catatanPetugas: 'Anak ke-1 telah berhasil ditambahkan ke tanggungan KP4 & BPJS.',
    dokumen: [
      { nama: 'Akta_Kelahiran_Anak.pdf', url: 'https://drive.google.com/sample3' },
      { nama: 'Kartu_Keluarga_Terbaru.pdf', url: 'https://drive.google.com/sample4' }
    ]
  },
  {
    id: 'REQ-2026-003',
    nomorTiket: 'SDM/TUBEL/2026/003',
    jenisLayanan: 'Usulan Rekomendasi Tugas Belajar / Beasiswa',
    kategori: 'Pengembangan Kompetensi SDM',
    nip: '199511102022031001',
    namaPegawai: 'ANDI PRASETYO, S.Kom.',
    unitKerja: 'Direktorat Teknologi Informasi Kekayaan Intelektual',
    tanggalPengajuan: '2026-08-28T11:00:00.000Z',
    status: 'DISETUJUI',
    tahapan: 'Penandatanganan SK Tugas Belajar oleh Sesditjen',
    catatanPetugas: 'LoA ITB & Surat Sponsor LPDP terverifikasi valid.',
    dokumen: [
      { nama: 'LoA_Unconditional_ITB.pdf', url: 'https://drive.google.com/sample5' },
      { nama: 'Surat_Lulus_LPDP.pdf', url: 'https://drive.google.com/sample6' }
    ]
  },
  {
    id: 'REQ-2026-004',
    nomorTiket: 'SDM/KGB/2026/004',
    jenisLayanan: 'Penerbitan SK Kenaikan Gaji Berkala (KGB)',
    kategori: 'Pengelolaan Karier & Kepangkatan',
    nip: '199003152014022003',
    namaPegawai: 'RATNA DEWI PUSPITASARI, S.H., M.H.',
    unitKerja: 'Direktorat Merek dan Indikasi Geografis',
    tanggalPengajuan: '2026-08-29T10:00:00.000Z',
    status: 'SELESAI',
    tahapan: 'SK KGB TMT 01 Oktober 2026 Telah Terbit',
    catatanPetugas: 'SK telah ditandatangani secara digital (BSrE) dan diarsip di e-Dossier.',
    dokumen: [
      { nama: 'SK_KGB_TMT_Okt_2026.pdf', url: 'https://drive.google.com/sample7' }
    ]
  }
];

export const SAMPLE_SAKIP_RB_DATA = {
  nilaiSAKIP: 88.45,
  predikatSAKIP: 'A (Sangat Baik)',
  capaianIKU: 96.8,
  lkeRBScore: 91.2,
  statusWBS: 'Nihil Aduan Aktif',
  kepatuhanGratifikasi: '100% Kepatuhan (Pelaporan Nihil Rutin)',
  paktaIntegritasTertandatangani: 1077,
  agenPerubahanAktif: 12
};

export const SAMPLE_ABK_PETA_KEBUTUHAN = [
  {
    jabatan: 'Pemeriksa Paten Ahli Pertama',
    unitKerja: 'Direktorat Paten, DTLST & RD',
    formasiEksisting: 45,
    kebutuhanABK: 62,
    gap: -17,
    usulanCASN2026: 15,
    usulanPPPK2026: 2
  },
  {
    jabatan: 'Pemeriksa Merek Ahli Pertama',
    unitKerja: 'Direktorat Merek & IG',
    formasiEksisting: 78,
    kebutuhanABK: 95,
    gap: -17,
    usulanCASN2026: 15,
    usulanPPPK2026: 2
  },
  {
    jabatan: 'Pemeriksa Desain Industri Ahli Pertama',
    unitKerja: 'Direktorat Hak Cipta & Desain Industri',
    formasiEksisting: 22,
    kebutuhanABK: 28,
    gap: -6,
    usulanCASN2026: 5,
    usulanPPPK2026: 1
  },
  {
    jabatan: 'Pranata Komputer Ahli Pertama',
    unitKerja: 'Direktorat TI Kekayaan Intelektual',
    formasiEksisting: 18,
    kebutuhanABK: 25,
    gap: -7,
    usulanCASN2026: 6,
    usulanPPPK2026: 1
  },
  {
    jabatan: 'Analis SDM Aparatur Ahli Pertama',
    unitKerja: 'Sekretariat DJKI (Bagian SDM)',
    formasiEksisting: 12,
    kebutuhanABK: 15,
    gap: -3,
    usulanCASN2026: 3,
    usulanPPPK2026: 0
  }
];

export const initializeAllSDMData = (forceReload = false) => {
  try {
    // 1. Initialize Pegawai Master
    const existingPegawai = localStorage.getItem('portal_pegawai_db');
    if (!existingPegawai || forceReload) {
      localStorage.setItem('portal_pegawai_db', JSON.stringify(SAMPLE_PEGAWAI_SDM));
    }

    // 2. Initialize Layanan SDM Pengajuan DB
    const existingPengajuan = localStorage.getItem('layanan_sdm_pengajuan_db');
    if (!existingPengajuan || forceReload) {
      localStorage.setItem('layanan_sdm_pengajuan_db', JSON.stringify(SAMPLE_PENGAJUAN_LAYANAN_SDM));
    }

    // 3. Initialize Tupoksi SDM DB
    const existingTupoksi = localStorage.getItem('tupoksi_sdm_db');
    if (!existingTupoksi || forceReload) {
      localStorage.setItem('tupoksi_sdm_db', JSON.stringify(INITIAL_TUPOKSI_SDM));
    }

    // 4. Initialize ABK DB
    const existingABK = localStorage.getItem('abk_formasi_db');
    if (!existingABK || forceReload) {
      localStorage.setItem('abk_formasi_db', JSON.stringify(SAMPLE_ABK_PETA_KEBUTUHAN));
    }

    // 5. Initialize SAKIP & RB DB
    const existingSAKIP = localStorage.getItem('sakip_rb_governance_db');
    if (!existingSAKIP || forceReload) {
      localStorage.setItem('sakip_rb_governance_db', JSON.stringify(SAMPLE_SAKIP_RB_DATA));
    }

    // Broadcast storage update
    window.dispatchEvent(new Event('storage_updated'));
    window.dispatchEvent(new Event('sdm_notifications_updated'));
  } catch (e) {
    console.warn("Gagal inisialisasi sample data SDM:", e);
  }
};
