import { Pegawai } from './types';
import { TalentProfileData } from './components/TalentDevelopmentView';

export interface PegawaiCompetencyDetail {
  nip: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  jenjangJabatan: string;
  rumpunJabatan: string;
  skorManajerialAvg: number;
  skorPerilaku360Avg: number;
  standarMinimum: number;
  gapSkor: number; // skorManajerialAvg - standarMinimum
  persenPemenuhan: number; // 0 - 100%
  statusPemenuhan: 'Memenuhi' | 'Perlu Pengembangan' | 'Optimal';
  isPromotablePangkat: boolean;
  isPromotableJabatan: boolean;
  manajerialScores: {
    M01: number; // Integritas
    M02: number; // Kerjasama
    M03: number; // Komunikasi
    M04: number; // Orientasi Hasil
    M05: number; // Pelayanan Publik
    M06: number; // Pengembangan Diri
    M07: number; // Mengelola Perubahan
    M08: number; // Pengambilan Keputusan
  };
  perilaku360Scores: {
    pelayanan: number;
    komitmen: number;
    inisiatif: number;
    kerjasama: number;
    kepemimpinan: number;
  };
  rekomendasiBangkom: string;
}

export interface UnitKerjaCompetencyStats {
  unitKerja: string;
  shortName: string;
  totalPegawai: number;
  avgManajerial: number;
  avgPerilaku360: number;
  standarRataRata: number;
  gapRataRata: number;
  fitPercentage: number;
  fitCount: number;
  gapCount: number;
  kategori: 'Optimal' | 'Memenuhi Standar' | 'Perlu Pembinaan';
  dimensiScores: {
    M01: number;
    M02: number;
    M03: number;
    M04: number;
    M05: number;
    M06: number;
    M07: number;
    M08: number;
  };
}

export interface JenjangCompetencyStats {
  jenjang: string;
  totalPegawai: number;
  avgManajerial: number;
  standarMinimum: number;
  gap: number;
  fitPercentage: number;
  dimensiScores: {
    M01: number;
    M02: number;
    M03: number;
    M04: number;
    M05: number;
    M06: number;
    M07: number;
    M08: number;
  };
}

export interface RumpunJabatanStats {
  rumpun: string;
  totalPegawai: number;
  avgManajerial: number;
  standarMinimum: number;
  gap: number;
  fitPercentage: number;
}

export interface DimensiStats {
  kode: string;
  nama: string;
  rataRata: number;
  standar: number;
  gap: number;
  persenKeterpenuhan: number;
  kategori: string;
}

// 7 Unit Utama DJKI
export const LIST_UNIT_KERJA_DJKI = [
  'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
  'Direktorat Hak Cipta dan Desain Industri',
  'Direktorat Paten, DTLST dan Rahasia Dagang',
  'Direktorat Merek dan Indikasi Geografis',
  'Direktorat Teknologi Informasi Kekayaan Intelektual',
  'Direktorat Kerja Sama dan Pemberdayaan Kekayaan Intelektual',
  'Direktorat Penyidikan dan Penyelesaian Sengketa'
];

export const SHORT_UNIT_NAMES: Record<string, string> = {
  'Sekretariat Direktorat Jenderal Kekayaan Intelektual': 'Sekretariat',
  'Direktorat Hak Cipta dan Desain Industri': 'Hak Cipta & DI',
  'Direktorat Paten, DTLST dan Rahasia Dagang': 'Paten & Rahasia Dagang',
  'Direktorat Merek dan Indikasi Geografis': 'Merek & IG',
  'Direktorat Teknologi Informasi Kekayaan Intelektual': 'TI KI',
  'Direktorat Kerja Sama dan Pemberdayaan Kekayaan Intelektual': 'Kerja Sama & Pemberdayaan',
  'Direktorat Penyidikan dan Penyelesaian Sengketa': 'Penyidikan & Sengketa'
};

export const DIMENSI_MANAJERIAL_METADATA = [
  { kode: 'M01', label: 'Integritas', deskripsi: 'Konsistensi berperilaku selaras dengan nilai moral, etika organisasi dan kode etik ASN.' },
  { kode: 'M02', label: 'Kerjasama', deskripsi: 'Kemampuan menjalin, membina, dan mempertahankan hubungan kerja yang efektif.' },
  { kode: 'M03', label: 'Komunikasi', deskripsi: 'Kemampuan menyampaikan dan menerima gagasan, informasi, dan umpan balik secara persuasif.' },
  { kode: 'M04', label: 'Orientasi Hasil', deskripsi: 'Komitmen bekerja secara terencana untuk mencapai target melampaui standar mutu.' },
  { kode: 'M05', label: 'Pelayanan Publik', deskripsi: 'Dedikasi memberikan layanan prima dan responsif terhadap kebutuhan pemohon KI.' },
  { kode: 'M06', label: 'Pengembangan Diri', deskripsi: 'Upaya berkesinambungan meningkatkan kompetensi diri dan membimbing rekan sejawat.' },
  { kode: 'M07', label: 'Mengelola Perubahan', deskripsi: 'Kemampuan beradaptasi dan memimpin pembaharuan sistem atau metode kerja.' },
  { kode: 'M08', label: 'Pengambilan Keputusan', deskripsi: 'Ketepatan menentukan solusi berbasis data, regulasi, dan mitigasi risiko.' }
];

// Helper: Tentukan Jenjang Jabatan
export function getJenjangFromJabatan(jabatan: string = ''): string {
  const clean = jabatan.toUpperCase();
  if (clean.includes('DIREKTUR') || clean.includes('SEKRETARIS') || clean.includes('KEPALA KANTOR') || clean.includes('JPT')) {
    return 'JPT Pratama / Eselon II';
  }
  if (clean.includes('KEPALA BAGIAN') || clean.includes('KABAG') || clean.includes('KASUBDIT') || clean.includes('ADMINISTRATOR')) {
    return 'Administrator (Eselon III)';
  }
  if (clean.includes('KEPALA SUB') || clean.includes('KASUBAG') || clean.includes('PENGAWAS') || clean.includes('SUBKOORDINATOR')) {
    return 'Pengawas / Subkoordinator';
  }
  if (clean.includes('MADYA') || clean.includes('AHLI MADYA')) {
    return 'JF Ahli Madya';
  }
  if (clean.includes('MUDA') || clean.includes('AHLI MUDA')) {
    return 'JF Ahli Muda';
  }
  if (clean.includes('PERTAMA') || clean.includes('AHLI PERTAMA')) {
    return 'JF Ahli Pertama';
  }
  if (clean.includes('TERAMPIL') || clean.includes('MAHIR') || clean.includes('PENYELIA') || clean.includes('KETERAMPILAN')) {
    return 'JF Keterampilan';
  }
  return 'Jabatan Pelaksana';
}

// Helper: Tentukan Rumpun Jabatan
export function getRumpunFromJabatan(jabatan: string = ''): string {
  const clean = jabatan.toUpperCase();
  if (clean.includes('PATEN')) return 'Pemeriksa Paten';
  if (clean.includes('MEREK')) return 'Pemeriksa Merek';
  if (clean.includes('DESAIN')) return 'Pemeriksa Desain Industri';
  if (clean.includes('HAK CIPTA') || clean.includes('ANALIS KEKAYAAN') || clean.includes('ANALIS KI')) return 'Analis KI';
  if (clean.includes('KOMPUTER') || clean.includes('TI') || clean.includes('INFORMATIKA') || clean.includes('SISTEM')) return 'Pranata Komputer / TI';
  if (clean.includes('SDM') || clean.includes('KEPEGAWAIAN') || clean.includes('PRANATA SDM')) return 'SDM & Aparatur';
  if (clean.includes('ARSIP')) return 'Kearsipan';
  if (clean.includes('PERENCANA') || clean.includes('ANGGARAN') || clean.includes('KEUANGAN')) return 'Perencanaan & Keuangan';
  if (clean.includes('HUKUM') || clean.includes('PENYIDIK') || clean.includes('ADVOKASI')) return 'Hukum & Penyidikan';
  return 'Administrasi & Teknis Lain';
}

// Helper: Tentukan standar minimum berdasarkan jenjang
export function getStandarMinimumByJenjang(jenjang: string): number {
  switch (jenjang) {
    case 'JPT Pratama / Eselon II': return 3.5;
    case 'Administrator (Eselon III)': return 3.2;
    case 'JF Ahli Madya': return 3.0;
    case 'Pengawas / Subkoordinator': return 2.8;
    case 'JF Ahli Muda': return 2.6;
    case 'JF Ahli Pertama': return 2.2;
    case 'JF Keterampilan': return 2.0;
    case 'Jabatan Pelaksana': return 1.8;
    default: return 2.2;
  }
}

// Pseudorandom generator berbasis NIP untuk konsistensi data
function seededRandom(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
}

// Ekstraksi data kompetensi per pegawai (mengutamakan data tersimpan di localStorage)
export function getPegawaiCompetencyDetail(pegawai: Pegawai): PegawaiCompetencyDetail {
  const nip = pegawai.nip || '000000';
  const jenjang = getJenjangFromJabatan(pegawai.jabatan);
  const rumpun = getRumpunFromJabatan(pegawai.jabatan);
  const standarMin = getStandarMinimumByJenjang(jenjang);

  let profileData: TalentProfileData | null = null;
  try {
    const saved = localStorage.getItem(`talent_profile_${nip}`);
    if (saved) {
      profileData = JSON.parse(saved);
    }
  } catch (e) {
    profileData = null;
  }

  // Jika Nizar Fikri atau ada data spesifik tersimpan
  if (profileData && profileData.manajerialScore2023) {
    const m = profileData.manajerialScore2023;
    const scores = [
      m.M01 ?? 3, m.M02 ?? 3, m.M03 ?? 3, m.M04 ?? 3,
      m.M05 ?? 2, m.M06 ?? 3, m.M07 ?? 2, m.M08 ?? 2
    ];
    const avgM = parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
    
    const p360 = profileData.perilaku360Radar || { k01: 88, k02: 92, k03: 86, k04: 84, k05: 95 };
    const avg360 = parseFloat(((p360.k01 + p360.k02 + p360.k03 + p360.k04 + p360.k05) / 5).toFixed(1));

    const gap = parseFloat((avgM - standarMin).toFixed(2));
    const fitPct = Math.min(Math.round((avgM / standarMin) * 100), 100);

    let status: 'Memenuhi' | 'Perlu Pengembangan' | 'Optimal' = 'Memenuhi';
    if (avgM >= standarMin + 0.5) status = 'Optimal';
    else if (avgM < standarMin) status = 'Perlu Pengembangan';

    return {
      nip,
      nama: pegawai.nama,
      jabatan: pegawai.jabatan || 'Pegawai DJKI',
      unitKerja: pegawai.unitKerja || 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
      jenjangJabatan: jenjang,
      rumpunJabatan: rumpun,
      skorManajerialAvg: avgM,
      skorPerilaku360Avg: avg360,
      standarMinimum: standarMin,
      gapSkor: gap,
      persenPemenuhan: fitPct,
      statusPemenuhan: status,
      isPromotablePangkat: profileData.isPromotablePangkat ?? true,
      isPromotableJabatan: profileData.isPromotableJabatan ?? false,
      manajerialScores: {
        M01: m.M01 ?? 3,
        M02: m.M02 ?? 3,
        M03: m.M03 ?? 3,
        M04: m.M04 ?? 3,
        M05: m.M05 ?? 2,
        M06: m.M06 ?? 3,
        M07: m.M07 ?? 2,
        M08: m.M08 ?? 2
      },
      perilaku360Scores: {
        pelayanan: p360.k01 ?? 88,
        komitmen: p360.k02 ?? 90,
        inisiatif: p360.k03 ?? 85,
        kerjasama: p360.k04 ?? 88,
        kepemimpinan: p360.k05 ?? 85
      },
      rekomendasiBangkom: profileData.rekomendasiManajerial || 'Peningkatan kompetensi manajerial level lanjutan.'
    };
  }

  // Jika belum ada data di localStorage, hasilkan nilai realistis konsisten berdasarkan NIP dan Jenjang
  const r1 = seededRandom(nip + 'M01');
  const r2 = seededRandom(nip + 'M02');
  const r3 = seededRandom(nip + 'M03');
  const r4 = seededRandom(nip + 'M04');
  const r5 = seededRandom(nip + 'M05');
  const r6 = seededRandom(nip + 'M06');
  const r7 = seededRandom(nip + 'M07');
  const r8 = seededRandom(nip + 'M08');

  // Baseline skor sesuai jenjang
  let baseScore = 2.4;
  if (jenjang.includes('JPT') || jenjang.includes('Administrator')) baseScore = 3.3;
  else if (jenjang.includes('Madya')) baseScore = 3.1;
  else if (jenjang.includes('Muda')) baseScore = 2.8;
  else if (jenjang.includes('Pertama')) baseScore = 2.5;
  else if (jenjang.includes('Keterampilan')) baseScore = 2.2;
  else baseScore = 2.0;

  const clampScore = (v: number) => Math.min(4, Math.max(1, Math.round(v)));

  const mScores = {
    M01: clampScore(baseScore + (r1 - 0.4)),
    M02: clampScore(baseScore + (r2 - 0.3)),
    M03: clampScore(baseScore + (r3 - 0.4)),
    M04: clampScore(baseScore + (r4 - 0.3)),
    M05: clampScore(baseScore + (r5 - 0.45)),
    M06: clampScore(baseScore + (r6 - 0.35)),
    M07: clampScore(baseScore + (r7 - 0.5)),
    M08: clampScore(baseScore + (r8 - 0.55))
  };

  const values = Object.values(mScores);
  const avgM = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));

  const p360Base = 80 + Math.floor(seededRandom(nip + '360') * 16);
  const p360Scores = {
    pelayanan: Math.min(98, p360Base + Math.floor(r1 * 8) - 4),
    komitmen: Math.min(98, p360Base + Math.floor(r2 * 8) - 3),
    inisiatif: Math.min(98, p360Base + Math.floor(r3 * 8) - 5),
    kerjasama: Math.min(98, p360Base + Math.floor(r4 * 8) - 2),
    kepemimpinan: Math.min(98, p360Base + Math.floor(r5 * 8) - 6)
  };
  const avg360 = parseFloat((Object.values(p360Scores).reduce((a, b) => a + b, 0) / 5).toFixed(1));

  const gap = parseFloat((avgM - standarMin).toFixed(2));
  const fitPct = Math.min(Math.round((avgM / standarMin) * 100), 100);

  let status: 'Memenuhi' | 'Perlu Pengembangan' | 'Optimal' = 'Memenuhi';
  if (avgM >= standarMin + 0.4) status = 'Optimal';
  else if (avgM < standarMin) status = 'Perlu Pengembangan';

  let rec = 'Pemeliharaan dan pengembangan kompetensi berkelanjutan (CPD).';
  if (status === 'Perlu Pengembangan') {
    rec = 'Pelatihan Teknis Substantif & Penguatan Dimensi Pengambilan Keputusan (M.08) serta Mengelola Perubahan (M.07).';
  } else if (status === 'Optimal') {
    rec = 'Diproyeksikan sebagai Talent Pool / Mentor & Pelatihan Kepemimpinan Berjenjang.';
  }

  return {
    nip,
    nama: pegawai.nama,
    jabatan: pegawai.jabatan || 'Pegawai DJKI',
    unitKerja: pegawai.unitKerja || 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    jenjangJabatan: jenjang,
    rumpunJabatan: rumpun,
    skorManajerialAvg: avgM,
    skorPerilaku360Avg: avg360,
    standarMinimum: standarMin,
    gapSkor: gap,
    persenPemenuhan: fitPct,
    statusPemenuhan: status,
    isPromotablePangkat: avgM >= standarMin,
    isPromotableJabatan: avgM >= (standarMin + 0.2),
    manajerialScores: mScores,
    perilaku360Scores: p360Scores,
    rekomendasiBangkom: rec
  };
}

// Sample enrichment pegawai jika database awal sedikit
export const FALLBACK_REPRESENTATIVE_PEGAWAI: Partial<Pegawai>[] = [
  {
    nip: '198911292010121001',
    nama: 'NIZAR FIKRI, SH, M.H.',
    jabatan: 'ANALIS SDM APARATUR MUDA',
    unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    golRuang: 'III/c',
    jenisPegawai: 'PNS'
  },
  {
    nip: '198504122008121001',
    nama: 'BAMBANG HERMANTO, S.T., M.Kom.',
    jabatan: 'Pemeriksa Paten Ahli Madya',
    unitKerja: 'Direktorat Paten, DTLST dan Rahasia Dagang',
    golRuang: 'IV/a',
    jenisPegawai: 'PNS'
  },
  {
    nip: '199003152014022003',
    nama: 'RATNA DEWI PUSPITASARI, S.H., M.H.',
    jabatan: 'Pemeriksa Merek Ahli Muda',
    unitKerja: 'Direktorat Merek dan Indikasi Geografis',
    golRuang: 'III/c',
    jenisPegawai: 'PNS'
  },
  {
    nip: '199208202015032002',
    nama: 'NURUL HIDAYAH, S.H.',
    jabatan: 'Pemeriksa Merek Ahli Pertama',
    unitKerja: 'Direktorat Merek dan Indikasi Geografis',
    golRuang: 'III/b',
    jenisPegawai: 'PNS'
  },
  {
    nip: '199511102022031001',
    nama: 'ANDI PRASETYO, S.Kom.',
    jabatan: 'Pranata Komputer Ahli Pertama',
    unitKerja: 'Direktorat Teknologi Informasi Kekayaan Intelektual',
    golRuang: 'III/a',
    jenisPegawai: 'PNS'
  },
  {
    nip: '198205042006041002',
    nama: 'HENDRA KUSUMA, S.H., M.Si.',
    jabatan: 'Analis Kepegawaian Ahli Madya / Ketua Tim SDM',
    unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    golRuang: 'IV/b',
    jenisPegawai: 'PNS'
  },
  {
    nip: '198801122010122001',
    nama: 'SITI AMINAH, S.E., M.M.',
    jabatan: 'Pranata SDM Aparatur Ahli Muda',
    unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    golRuang: 'III/d',
    jenisPegawai: 'PNS'
  },
  {
    nip: '198402152009011003',
    nama: 'DEDDY SUPRIADI, S.T., M.T.',
    jabatan: 'Pemeriksa Desain Industri Ahli Madya',
    unitKerja: 'Direktorat Hak Cipta dan Desain Industri',
    golRuang: 'IV/a',
    jenisPegawai: 'PNS'
  },
  {
    nip: '199307182019022004',
    nama: 'ANISA RAHMAWATI, S.Ds.',
    jabatan: 'Pemeriksa Desain Industri Ahli Pertama',
    unitKerja: 'Direktorat Hak Cipta dan Desain Industri',
    golRuang: 'III/a',
    jenisPegawai: 'PNS'
  },
  {
    nip: '198706242011011002',
    nama: 'FAJAR NUGROHO, S.H.',
    jabatan: 'Analis Kekayaan Intelektual Ahli Muda',
    unitKerja: 'Direktorat Hak Cipta dan Desain Industri',
    golRuang: 'III/c',
    jenisPegawai: 'PNS'
  },
  {
    nip: '198603192009121002',
    nama: 'IR. YULIANTO, M.Eng.',
    jabatan: 'Pemeriksa Paten Ahli Madya',
    unitKerja: 'Direktorat Paten, DTLST dan Rahasia Dagang',
    golRuang: 'IV/b',
    jenisPegawai: 'PNS'
  },
  {
    nip: '199405022020122001',
    nama: 'DIAN PERTIWI, S.Si.',
    jabatan: 'Pemeriksa Paten Ahli Pertama',
    unitKerja: 'Direktorat Paten, DTLST dan Rahasia Dagang',
    golRuang: 'III/b',
    jenisPegawai: 'PNS'
  },
  {
    nip: '198909142014031002',
    nama: 'ARIEF WICAKSONO, S.Kom., M.T.I.',
    jabatan: 'Pranata Komputer Ahli Muda',
    unitKerja: 'Direktorat Teknologi Informasi Kekayaan Intelektual',
    golRuang: 'III/c',
    jenisPegawai: 'PNS'
  },
  {
    nip: '199112082015031003',
    nama: 'WAHYU PRABOWO, S.H.',
    jabatan: 'Penyidik Kekayaan Intelektual Ahli Muda',
    unitKerja: 'Direktorat Penyidikan dan Penyelesaian Sengketa',
    golRuang: 'III/c',
    jenisPegawai: 'PNS'
  },
  {
    nip: '199604172022032002',
    nama: 'MAYA ANGGRAENI, S.H.',
    jabatan: 'Analis Perkara Peradilan / Sengketa KI Ahli Pertama',
    unitKerja: 'Direktorat Penyidikan dan Penyelesaian Sengketa',
    golRuang: 'III/a',
    jenisPegawai: 'PNS'
  },
  {
    nip: '198511252009032001',
    nama: 'DR. INDAH KURNIAWATI, S.IP., M.A.',
    jabatan: 'Analis Kerja Sama Ahli Madya',
    unitKerja: 'Direktorat Kerja Sama dan Pemberdayaan Kekayaan Intelektual',
    golRuang: 'IV/a',
    jenisPegawai: 'PNS'
  },
  {
    nip: '199310052019031001',
    nama: 'RIZKY MAULANA, S.Hub.Int.',
    jabatan: 'Pranata Hubungan Masyarakat Ahli Pertama',
    unitKerja: 'Direktorat Kerja Sama dan Pemberdayaan Kekayaan Intelektual',
    golRuang: 'III/b',
    jenisPegawai: 'PNS'
  },
  {
    nip: '198109102005011003',
    nama: 'AGUS SETIAWAN, S.Sos., M.AP.',
    jabatan: 'Kepala Sub Bagian Tata Usaha',
    unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    golRuang: 'IV/a',
    jenisPegawai: 'PNS'
  },
  {
    nip: '199708222022031004',
    nama: 'DIMAS PRAKOSO, A.Md.',
    jabatan: 'Pengelola Data Rekapitulasi & Pelaksana',
    unitKerja: 'Direktorat Merek dan Indikasi Geografis',
    golRuang: 'II/c',
    jenisPegawai: 'PNS'
  },
  {
    nip: '199803112022032005',
    nama: 'TIARA PUSPITA, S.Ak.',
    jabatan: 'Analis Pengelolaan Keuangan APBN Ahli Pertama',
    unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    golRuang: 'III/a',
    jenisPegawai: 'PNS'
  }
];

// Helper kalkulasi statistik per Unit Kerja
export function calculateUnitKerjaStats(details: PegawaiCompetencyDetail[]): UnitKerjaCompetencyStats[] {
  const map: Record<string, PegawaiCompetencyDetail[]> = {};

  // Inisialisasi 7 unit kerja
  LIST_UNIT_KERJA_DJKI.forEach(unit => {
    map[unit] = [];
  });

  details.forEach(p => {
    const matched = LIST_UNIT_KERJA_DJKI.find(u => 
      p.unitKerja.toLowerCase().includes(u.toLowerCase()) || 
      u.toLowerCase().includes(p.unitKerja.toLowerCase())
    ) || 'Sekretariat Direktorat Jenderal Kekayaan Intelektual';
    
    if (!map[matched]) map[matched] = [];
    map[matched].push(p);
  });

  return LIST_UNIT_KERJA_DJKI.map(unit => {
    const items = map[unit] || [];
    const count = items.length;
    
    if (count === 0) {
      return {
        unitKerja: unit,
        shortName: SHORT_UNIT_NAMES[unit] || unit,
        totalPegawai: 0,
        avgManajerial: 0,
        avgPerilaku360: 0,
        standarRataRata: 2.6,
        gapRataRata: 0,
        fitPercentage: 0,
        fitCount: 0,
        gapCount: 0,
        kategori: 'Memenuhi Standar',
        dimensiScores: { M01: 0, M02: 0, M03: 0, M04: 0, M05: 0, M06: 0, M07: 0, M08: 0 }
      };
    }

    const sumManajerial = items.reduce((acc, c) => acc + c.skorManajerialAvg, 0);
    const sum360 = items.reduce((acc, c) => acc + c.skorPerilaku360Avg, 0);
    const sumStd = items.reduce((acc, c) => acc + c.standarMinimum, 0);
    const fitCount = items.filter(c => c.statusPemenuhan !== 'Perlu Pengembangan').length;
    const gapCount = count - fitCount;

    const avgM = parseFloat((sumManajerial / count).toFixed(2));
    const avg360 = parseFloat((sum360 / count).toFixed(1));
    const avgStd = parseFloat((sumStd / count).toFixed(2));
    const avgGap = parseFloat((avgM - avgStd).toFixed(2));
    const fitPct = Math.round((fitCount / count) * 100);

    let kat: 'Optimal' | 'Memenuhi Standar' | 'Perlu Pembinaan' = 'Memenuhi Standar';
    if (avgM >= avgStd + 0.35 && fitPct >= 80) kat = 'Optimal';
    else if (avgM < avgStd || fitPct < 60) kat = 'Perlu Pembinaan';

    // Rata-rata per dimensi
    const dScores: any = {};
    ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08'].forEach(k => {
      const sum = items.reduce((acc, c) => acc + (c.manajerialScores as any)[k], 0);
      dScores[k] = parseFloat((sum / count).toFixed(2));
    });

    return {
      unitKerja: unit,
      shortName: SHORT_UNIT_NAMES[unit] || unit,
      totalPegawai: count,
      avgManajerial: avgM,
      avgPerilaku360: avg360,
      standarRataRata: avgStd,
      gapRataRata: avgGap,
      fitPercentage: fitPct,
      fitCount,
      gapCount,
      kategori: kat,
      dimensiScores: dScores
    };
  });
}

// Helper kalkulasi statistik per Jenjang Jabatan
export function calculateJenjangStats(details: PegawaiCompetencyDetail[]): JenjangCompetencyStats[] {
  const jenjangOrder = [
    'JPT Pratama / Eselon II',
    'Administrator (Eselon III)',
    'JF Ahli Madya',
    'Pengawas / Subkoordinator',
    'JF Ahli Muda',
    'JF Ahli Pertama',
    'JF Keterampilan',
    'Jabatan Pelaksana'
  ];

  const map: Record<string, PegawaiCompetencyDetail[]> = {};
  jenjangOrder.forEach(j => { map[j] = []; });

  details.forEach(p => {
    const j = p.jenjangJabatan;
    if (map[j]) map[j].push(p);
    else map['Jabatan Pelaksana'].push(p);
  });

  return jenjangOrder
    .map(jenjang => {
      const items = map[jenjang] || [];
      const count = items.length;
      const std = getStandarMinimumByJenjang(jenjang);

      if (count === 0) return null;

      const sumM = items.reduce((acc, c) => acc + c.skorManajerialAvg, 0);
      const avgM = parseFloat((sumM / count).toFixed(2));
      const fitCount = items.filter(c => c.statusPemenuhan !== 'Perlu Pengembangan').length;

      const dScores: any = {};
      ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08'].forEach(k => {
        const sum = items.reduce((acc, c) => acc + (c.manajerialScores as any)[k], 0);
        dScores[k] = parseFloat((sum / count).toFixed(2));
      });

      return {
        jenjang,
        totalPegawai: count,
        avgManajerial: avgM,
        standarMinimum: std,
        gap: parseFloat((avgM - std).toFixed(2)),
        fitPercentage: Math.round((fitCount / count) * 100),
        dimensiScores: dScores
      };
    })
    .filter((x): x is JenjangCompetencyStats => x !== null);
}

// Helper kalkulasi statistik per Rumpun Jabatan
export function calculateRumpunStats(details: PegawaiCompetencyDetail[]): RumpunJabatanStats[] {
  const map: Record<string, PegawaiCompetencyDetail[]> = {};

  details.forEach(p => {
    const r = p.rumpunJabatan;
    if (!map[r]) map[r] = [];
    map[r].push(p);
  });

  return Object.keys(map).map(rumpun => {
    const items = map[rumpun];
    const count = items.length;
    const avgM = parseFloat((items.reduce((acc, c) => acc + c.skorManajerialAvg, 0) / count).toFixed(2));
    const avgStd = parseFloat((items.reduce((acc, c) => acc + c.standarMinimum, 0) / count).toFixed(2));
    const fitCount = items.filter(c => c.statusPemenuhan !== 'Perlu Pengembangan').length;

    return {
      rumpun,
      totalPegawai: count,
      avgManajerial: avgM,
      standarMinimum: avgStd,
      gap: parseFloat((avgM - avgStd).toFixed(2)),
      fitPercentage: Math.round((fitCount / count) * 100)
    };
  }).sort((a, b) => b.totalPegawai - a.totalPegawai);
}

// Helper kalkulasi 8 Dimensi Manajerial Organisasi
export function calculateDimensiStats(details: PegawaiCompetencyDetail[]): DimensiStats[] {
  const count = details.length || 1;
  const standarAcuan = 2.8;

  return DIMENSI_MANAJERIAL_METADATA.map(meta => {
    const total = details.reduce((acc, p) => acc + (p.manajerialScores as any)[meta.kode], 0);
    const avg = parseFloat((total / count).toFixed(2));
    const gap = parseFloat((avg - standarAcuan).toFixed(2));
    const fitCount = details.filter(p => (p.manajerialScores as any)[meta.kode] >= 3).length;
    const pct = Math.round((fitCount / count) * 100);

    let kat = 'Memenuhi Standar';
    if (avg >= 3.2) kat = 'Kekuatan Utama';
    else if (avg < 2.7) kat = 'Perlu Intervensi Pelatihan';

    return {
      kode: meta.kode,
      nama: meta.label,
      rataRata: avg,
      standar: standarAcuan,
      gap,
      persenKeterpenuhan: pct,
      kategori: kat
    };
  });
}
