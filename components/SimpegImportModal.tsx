import React, { useState, useEffect } from 'react';
import { 
  SIMPEG_PANGKAT_DATA, 
  SIMPEG_PENDIDIKAN_DATA, 
  SIMPEG_GAJI_DATA, 
  SIMPEG_PELATIHAN_DATA, 
  SIMPEG_KELUARGA_DATA, 
  SIMPEG_JABATAN_DATA,
  ANDRIEANSJAH_JABATAN_DATA,
  ANDRIEANSJAH_PELATIHAN_DATA,
  TESSA_HARUMDILA_JABATAN_DATA 
} from '../data/simpegData';
import { parseDateToYYYYMMDD } from '../spreadsheetService';

export type SimpegCategory = 'jabatan' | 'pangkat' | 'pendidikan' | 'gaji' | 'pelatihan' | 'keluarga';

interface SimpegImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: SimpegCategory;
  onApply: (category: SimpegCategory, mode: 'APPEND' | 'REPLACE', rows: any[]) => void;
  targetPegawaiName?: string;
  targetPegawaiNip?: string;
}

const CATEGORY_CONFIG: Record<SimpegCategory, {
  title: string;
  subtitle: string;
  icon: string;
  colorClass: string;
  badgeBg: string;
  sampleCount: number;
  sampleDescription: string;
  sampleData: any[];
  columns: string[];
  fieldKeys: string[];
}> = {
  jabatan: {
    title: 'Riwayat Jabatan',
    subtitle: 'Jabatan Struktural, Fungsional & Penugasan',
    icon: 'bi-briefcase-fill',
    colorClass: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    sampleCount: SIMPEG_JABATAN_DATA.length,
    sampleDescription: '14 riwayat jabatan otentik SIMPEG Kemenkumham (Kasubsi s.d. Direktur Jenderal)',
    sampleData: SIMPEG_JABATAN_DATA,
    columns: ['No. SK', 'Tgl SK', 'Nama Jabatan', 'Unit Kerja', 'TMT Jabatan', 'Pejabat Penetap', 'Eselon', 'TMT Eselon', 'No. Pelantikan', 'Tgl Pelantikan'],
    fieldKeys: ['nomorSk', 'tanggalSk', 'namaJabatan', 'unitKerja', 'tmtJabatan', 'pejabatPenetap', 'eselon', 'tmtEselon', 'nomorPelantikan', 'tanggalPelantikan']
  },
  pangkat: {
    title: 'Riwayat Pangkat & Golongan',
    subtitle: 'Kenaikan Pangkat Reguler, Penyesuaian Ijazah & Pilihan',
    icon: 'bi-award-fill',
    colorClass: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    sampleCount: SIMPEG_PANGKAT_DATA.length,
    sampleDescription: '11 riwayat pangkat otentik SIMPEG Kemenkumham (Gol. II/a Pengatur Muda s.d. IV/d Pembina Utama Madya)',
    sampleData: SIMPEG_PANGKAT_DATA,
    columns: ['Gol. Ruang', 'Pangkat', 'TMT Pangkat', 'No. SK', 'Tgl SK', 'Pejabat Penetap', 'Jenis KP', 'Masa Kerja Thn', 'Masa Kerja Bln', 'Keterangan'],
    fieldKeys: ['golRuang', 'pangkat', 'tmtPangkat', 'nomorSk', 'tanggalSk', 'pejabatPenetap', 'jenisKp', 'masaKerjaTahun', 'masaKerjaBulan', 'keterangan']
  },
  pendidikan: {
    title: 'Riwayat Pendidikan',
    subtitle: 'Pendidikan Formal SD s.d. Pascasarjana (S2)',
    icon: 'bi-mortarboard-fill',
    colorClass: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    sampleCount: SIMPEG_PENDIDIKAN_DATA.length,
    sampleDescription: '5 riwayat pendidikan otentik SIMPEG (SD, SMP Dumai, SMAN 6 Pekanbaru, S1 Hukum Univ. Muhammadiyah, S2 Univ. Sebelas Maret)',
    sampleData: SIMPEG_PENDIDIKAN_DATA,
    columns: ['Jenjang', 'Nama Sekolah / Institusi', 'Jurusan', 'No. Ijazah / STTB', 'Tgl Ijazah', 'Tahun Lulus', 'Pemakaian'],
    fieldKeys: ['jenjang', 'namaSekolah', 'jurusan', 'nomorIjazah', 'tanggalIjazah', 'tahunLulus', 'pemakaianIjazah']
  },
  gaji: {
    title: 'Riwayat Gaji Pokok & KGB',
    subtitle: 'Kenaikan Gaji Berkala (KGB) & Kenaikan Pangkat',
    icon: 'bi-cash-coin',
    colorClass: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sampleCount: SIMPEG_GAJI_DATA.length,
    sampleDescription: '11 riwayat gaji otentik SIMPEG Kemenkumham (Gaji Pokok, Masa Kerja & No. SK KGB)',
    sampleData: SIMPEG_GAJI_DATA,
    columns: ['No. SK', 'Tgl SK', 'TMT SK', 'Gol/Pangkat', 'Gaji Pokok', 'Masa Kerja Thn', 'Masa Kerja Bln', 'Pejabat Penetap', 'Jenis Kenaikan'],
    fieldKeys: ['nomorSk', 'tanggalSk', 'tmtSk', 'pangkat', 'gajiPokok', 'masaKerjaTahun', 'masaKerjaBulan', 'pejabatPenetap', 'jenisKenaikanGaji']
  },
  pelatihan: {
    title: 'Riwayat Pelatihan & Diklat',
    subtitle: 'Diklat Kepemimpinan, Fungsional & Teknis',
    icon: 'bi-journal-bookmark-fill',
    colorClass: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    sampleCount: SIMPEG_PELATIHAN_DATA.length,
    sampleDescription: '5 riwayat diklat resmi Kemenkumham (Diklat Pemeriksa Merek, Sertifikasi WIPO, Diklat Pim)',
    sampleData: SIMPEG_PELATIHAN_DATA,
    columns: ['Jenis Diklat', 'Nama Pelatihan', 'Angkatan', 'Tahun', 'Tgl Mulai', 'Tgl Selesai', 'Durasi', 'Tempat', 'Penyelenggara', 'No. STTPP'],
    fieldKeys: ['jenisDiklat', 'namaPelatihan', 'angkatan', 'tahun', 'tanggalMulai', 'tanggalSelesai', 'durasi', 'tempat', 'penyelenggara', 'nomorSertifikat']
  },
  keluarga: {
    title: 'Informasi Keluarga',
    subtitle: 'Pasangan (Suami/Istri), Anak, dan Tanggungan',
    icon: 'bi-people-fill',
    colorClass: 'text-teal-600',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    sampleCount: SIMPEG_KELUARGA_DATA.length,
    sampleDescription: 'Data keluarga resmi SIMPEG (Istri & Anak, status tunjangan & NIK)',
    sampleData: SIMPEG_KELUARGA_DATA,
    columns: ['Hubungan', 'Nama Lengkap', 'Tempat Lahir', 'Tgl Lahir', 'L/P', 'Pekerjaan', 'NIK', 'Status Perkawinan', 'Tunjangan'],
    fieldKeys: ['hubungan', 'nama', 'tempatLahir', 'tanggalLahir', 'jenisKelamin', 'pekerjaan', 'nik', 'statusPerkawinan', 'keteranganTunjangan']
  }
};

const DEFAULT_MANUAL_STATE: Record<SimpegCategory, any> = {
  jabatan: {
    nomorSk: '',
    tanggalSk: '',
    namaJabatan: '',
    unitKerja: '',
    tmtJabatan: '',
    pejabatPenetap: 'Menteri Hukum dan HAM',
    eselon: '-',
    tmtEselon: '',
    nomorPelantikan: '',
    tanggalPelantikan: ''
  },
  pangkat: {
    golRuang: 'III/a',
    pangkat: 'Penata Muda',
    tmtPangkat: '',
    nomorSk: '',
    tanggalSk: '',
    pejabatPenetap: 'Kepala BKN',
    jenisKp: 'Reguler',
    masaKerjaTahun: '0',
    masaKerjaBulan: '0',
    keterangan: 'KP'
  },
  pendidikan: {
    jenjang: 'S1',
    institusi: '',
    namaSekolah: '',
    jurusan: '',
    alamatSekolah: '',
    kepalaSekolah: '',
    nomorIjazah: '',
    tanggalIjazah: '',
    tahunLulus: new Date().getFullYear().toString(),
    pemakaianIjazah: 'Pertama'
  },
  gaji: {
    nomorSk: '',
    tanggalSk: '',
    tmtSk: '',
    pangkat: '',
    gajiPokok: '',
    masaKerjaTahun: '0',
    masaKerjaBulan: '0',
    pejabatPenetap: 'Kepala Kantor Wilayah',
    jenisKenaikanGaji: 'Gaji Berkala',
    kppn: 'KPPN Jakarta'
  },
  pelatihan: {
    jenisDiklat: 'Teknis',
    namaPelatihan: '',
    angkatan: '-',
    tahun: new Date().getFullYear().toString(),
    tanggalMulai: '',
    tanggalSelesai: '',
    durasi: '40',
    tempat: 'Jakarta',
    penyelenggara: 'BPSDM Kemenkumham',
    nomorSertifikat: '',
    tanggalSertifikat: '',
    prestasi: '-'
  },
  keluarga: {
    hubungan: 'Anak',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'L',
    pekerjaan: 'Pelajar / Mahasiswa',
    nik: '',
    statusPerkawinan: 'Belum Kawin',
    keteranganTunjangan: 'Dapat Tunjangan'
  }
};

export const SimpegImportModal: React.FC<SimpegImportModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'jabatan',
  onApply,
  targetPegawaiName,
  targetPegawaiNip
}) => {
  const [activeCategory, setActiveCategory] = useState<SimpegCategory>(initialCategory);
  const [inputMode, setInputMode] = useState<'paste' | 'manual'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isHeaderOnlyDetected, setIsHeaderOnlyDetected] = useState(false);
  const [showDummySample, setShowDummySample] = useState(false);
  const [manualForm, setManualForm] = useState<any>({ ...DEFAULT_MANUAL_STATE[initialCategory] });

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
      setManualForm({ ...DEFAULT_MANUAL_STATE[initialCategory] });
    }
  }, [initialCategory, isOpen]);

  useEffect(() => {
    setPastedText('');
    setParsedRows([]);
    setIsHeaderOnlyDetected(false);
    setShowDummySample(false);
    setManualForm({ ...DEFAULT_MANUAL_STATE[activeCategory] });
  }, [activeCategory]);

  if (!isOpen) return null;

  const currentConfig = CATEGORY_CONFIG[activeCategory];

  // Helper formatting for dates
  const formatDateIndoDisplay = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr === '-') return '-';
    const ymd = parseDateToYYYYMMDD(dateStr);
    if (!ymd || ymd === '-') return dateStr || '-';
    const parts = ymd.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  // Smart derivation of Unit Kerja based on official Kemenkumham organizational structure & job titles
  const deriveUnitKerjaFromJabatan = (namaJabatan: string): string => {
    const up = (namaJabatan || '').toUpperCase();
    if (up.includes('JAKARTA BARAT') || up.includes('NON TPI JAKARTA')) {
      return 'DKI JAKARTA - KANIM KELAS I KHUSUS NON TPI JAKARTA BARAT';
    } else if (up.includes('BATAM') || up.includes('TPI BATAM')) {
      return 'KEPULAUAN RIAU - KANIM KELAS I KHUSUS TPI BATAM - BIDANG TEKNOLOGI INFORMASI DAN KOMUNIKASI KEIMIGRASIAN';
    } else if (up.includes('ATASE IMIGRASI')) {
      return 'Direktorat Jenderal Imigrasi';
    } else if (up.includes('BANTEN')) {
      return 'BANTEN - KANWIL KEMENTERIAN HUKUM DAN HAM BANTEN - DIVISI KEIMIGRASIAN - BIDANG INTELIJEN DAN PENINDAKAN KEIMIGRASIAN';
    } else if (up.includes('KEPROTOKOLAN BIRO UMUM') || (up.includes('PROTOKOL') && up.includes('BIRO UMUM'))) {
      if (up.includes('SUBBAGIAN') || up.includes('KASUBBAG')) {
        return 'SEKRETARIAT JENDERAL - BIRO UMUM - BAGIAN PROTOKOL DAN PENGAMANAN - SUBBAGIAN KEPROTOKOLAN';
      }
      return 'SEKRETARIAT JENDERAL - BIRO UMUM - BAGIAN PROTOKOL DAN PENGAMANAN';
    } else if (up.includes('DIVISI PERATURAN PERUNDANG-UNDANGAN')) {
      return 'Kementerian Hukum - Kantor Wilayah Kementerian Hukum Daerah Khusus Jakarta - Divisi Peraturan Perundang-undangan dan Pembinaan Hukum';
    } else if (up.includes('SEKRETARIS DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL')) {
      return 'Kementerian Hukum - Direktorat Jenderal Kekayaan Intelektual - Sekretariat Direktorat Jenderal Kekayaan Intelektual';
    } else if (up.includes('DITJEN HKI') || up.includes('HAK KEKAYAAN') || up.includes('KEKAYAAN INTELEKTUAL')) {
      return 'Direktorat Jenderal Kekayaan Intelektual';
    } else if (up.includes('BENGKULU')) {
      return 'Kanwil Kemenkumham Bengkulu';
    } else if (up.includes('JAWA BARAT')) {
      return 'Kanwil Kemenkumham Jawa Barat';
    } else if (up.includes('IMIGRASI')) {
      return 'Direktorat Jenderal Imigrasi';
    } else if (up.includes('PEMASYARAKATAN')) {
      return 'Direktorat Jenderal Pemasyarakatan';
    }
    return 'Direktorat Jenderal Kekayaan Intelektual';
  };

  // Fallback for Pejabat Penetap based on Eselon and SK Prefix
  const derivePejabatPenetap = (eselon: string, noSk: string): string => {
    const upSk = (noSk || '').toUpperCase();
    const upEs = (eselon || '').trim();
    if (upEs === 'I.a' || upEs === 'I.b') return 'Presiden Republik Indonesia';
    if (upSk.startsWith('SEK')) return 'Sekretaris Jenderal';
    return 'Menteri Hukum dan Hak Asasi Manusia';
  };

  const GOL_TO_PANGKAT: Record<string, string> = {
    'I/A': 'Juru Muda',
    'I/B': 'Juru Muda Tingkat I',
    'I/C': 'Juru',
    'I/D': 'Juru Tingkat I',
    'II/A': 'Pengatur Muda',
    'II/B': 'Pengatur Muda Tingkat I',
    'II/C': 'Pengatur',
    'II/D': 'Pengatur Tingkat I',
    'III/A': 'Penata Muda',
    'III/B': 'Penata Muda Tingkat I',
    'III/C': 'Penata',
    'III/D': 'Penata Tingkat I',
    'IV/A': 'Pembina',
    'IV/B': 'Pembina Tingkat I',
    'IV/C': 'Pembina Utama Muda',
    'IV/D': 'Pembina Utama Madya',
    'IV/E': 'Pembina Utama'
  };

  const getPangkatFromGol = (gol: string): string => {
    const clean = (gol || '').toUpperCase().trim();
    return GOL_TO_PANGKAT[clean] || '';
  };

  const normalizeJenjang = (val: string): string => {
    const v = (val || '').toUpperCase().trim();
    if (v.includes('S-3') || v.includes('S3') || v.includes('DOKTOR')) return 'S3';
    if (v.includes('S-2') || v.includes('S2') || v.includes('MAGISTER')) return 'S2';
    if (v.includes('S-1') || v.includes('S1') || v.includes('SARJANA')) return 'S1';
    if (v.includes('D-IV') || v.includes('D4') || v.includes('DIV')) return 'D4';
    if (v.includes('D-III') || v.includes('D3') || v.includes('DIII')) return 'D3';
    if (v.includes('D-II') || v.includes('D2') || v.includes('DII')) return 'D2';
    if (v.includes('D-I') || v.includes('D1') || v.includes('DI')) return 'D1';
    if (v.includes('SMK')) return 'SMK';
    if (v.includes('SMA') || v.includes('SLTA') || v.includes('ALIYAH')) return 'SMA';
    if (v.includes('SMP') || v.includes('SLTP') || v.includes('TSANAWIYAH')) return 'SMP';
    if (v.includes('SD') || v.includes('IBTIDAIYAH')) return 'SD';
    return val.trim() || 'S1';
  };

  const isJenjangToken = (val: string): boolean => {
    const v = (val || '').toUpperCase().trim();
    if (!v) return false;
    return /^(SD|SMP|SMA|SMK|SLTA|SLTP|D-?I|D-?II|D-?III|D-?IV|S-?1|S-?2|S-?3|D[1-4]|S[1-3]|SARJANA|MAGISTER|DOKTOR)$/i.test(v) ||
           v.startsWith('S-1') || v.startsWith('S-2') || v.startsWith('S-3') ||
           v.startsWith('D-III') || v.startsWith('D-IV') || v.startsWith('SMA') || v.startsWith('SLTA');
  };

  const isSchoolName = (val: string): boolean => {
    const up = (val || '').toUpperCase().trim();
    if (!up || up === '-') return false;
    return /^(UNIVERSITAS|INSTITUT|SEKOLAH TINGGI|POLITEKNIK|AKADEMI|UNIV|SMA|SMK|SMP|SD|MTS|MAN|IAIN|UIN|STMIK|STIE|STIA|SEKOLAH)\b/i.test(up) ||
           up.includes('UNIVERSITAS') || up.includes('INSTITUT') || up.includes('POLITEKNIK') ||
           up.includes('SEKOLAH TINGGI') || up.includes('PADJADJARAN') || up.includes('TRISAKTI') ||
           up.includes('AGUSTUS') || up.includes('INDONESIA') || up.includes('GAJAH MADA') ||
           up.includes('NEGERI ') || up.includes('SWASTA ');
  };

  const isMajorName = (val: string): boolean => {
    const up = (val || '').toUpperCase().trim();
    if (!up || up === '-') return false;
    return /^(TEKNIK|ILMU|HUKUM|MANAJEMEN|AKUNTANSI|EKONOMI|KEDOKTERAN|INFORMATIKA|KOMUNIKASI|ADMINISTRASI|PSIKOLOGI|SASTRA|HUBUNGAN INTERNASIONAL|PENDIDIKAN|FARMASI|KIMIA|BIOLOGI|FISIKA|MATEMATIKA|IPA|IPS|AGAMA|SYARIAH|KEPERAWATAN|KEBIDANAN)\b/i.test(up) ||
           up.includes('HUKUM') || up.includes('MANAJEMEN') || up.includes('TEKNIK') || up.includes('AKUNTANSI') ||
           up.includes('EKONOMI') || up.includes('INFORMATIKA') || up.includes('ADMINISTRASI') || up.includes('SOSIAL');
  };

  const parsePendidikanBlock = (rawSlice: string[], dateRe: RegExp) => {
    // Standard SIMPEG 10-line vertical format when cells are on separate lines:
    // [0]: Jenjang (SD, SLTP, SLTA, S1, S2, S3)
    // [1]: Angkatan
    // [2]: Jurusan (TEKNIK, ILMU HUKUM, MANAJEMEN)
    // [3]: Nama Sekolah (UNIVERSITAS 17 AGUSTUS 1945, UNIVERSITAS TRISAKTI)
    // [4]: Alamat Sekolah
    // [5]: Kepala Sekolah
    // [6]: No STTB (1030035, 0086/MM/S2/IX/2004, UN6.0002847/A30.000542)
    // [7]: Tgl STTB (07/05/2010, 29/09/2004, 22/02/2013)
    // [8]: Tahun Kelulusan (2010, 2004)
    // [9]: Pemakaian Ijazah
    if (rawSlice.length >= 8) {
      const jenjang = normalizeJenjang(rawSlice[0] || 'S1');
      let jurusan = rawSlice[2]?.trim() || '';
      let namaSekolah = rawSlice[3]?.trim() || '';

      // Auto swap if jurusan and namaSekolah are swapped
      if (isSchoolName(jurusan) && !isSchoolName(namaSekolah)) {
        const tmp = namaSekolah;
        namaSekolah = jurusan;
        jurusan = tmp;
      } else if (isMajorName(namaSekolah) && !isMajorName(jurusan)) {
        const tmp = namaSekolah;
        namaSekolah = jurusan;
        jurusan = tmp;
      }

      let nomorIjazah = rawSlice[6]?.trim() || '';
      const tglRaw = rawSlice[7]?.trim() || '';
      let tanggalIjazah = dateRe.test(tglRaw) ? (parseDateToYYYYMMDD(tglRaw) || tglRaw) : '';
      let tahunLulus = rawSlice[8]?.trim() || '';
      if (!/^\d{4}$/.test(tahunLulus)) {
        tahunLulus = tanggalIjazah ? tanggalIjazah.slice(0, 4) : '';
      }
      let pemakaianIjazah = rawSlice[9]?.trim() || 'Pertama';

      // If nomorIjazah is empty or '-', check if any other slot has it
      if (!nomorIjazah || nomorIjazah === '-') {
        for (let idx = 4; idx < rawSlice.length; idx++) {
          const item = rawSlice[idx]?.trim() || '';
          if (item && item !== '-' && !dateRe.test(item) && !/^\d{4}$/.test(item) && item.length > 2) {
            nomorIjazah = item;
            break;
          }
        }
      }

      return {
        jenjang,
        institusi: namaSekolah || '-',
        namaSekolah: namaSekolah || '-',
        jurusan: jurusan || '-',
        nomorIjazah: nomorIjazah || '-',
        tanggalIjazah,
        tahunLulus,
        pemakaianIjazah: pemakaianIjazah || 'Pertama'
      };
    }

    // Dynamic / Filtered Fallback when lines were filtered or collapsed
    const r = rawSlice.map(c => c.trim()).filter(c => c.length > 0);
    const jenjang = normalizeJenjang(r[0] || 'S1');
    const dates: string[] = [];
    for (const item of r) {
      if (dateRe.test(item)) {
        dates.push(parseDateToYYYYMMDD(item) || item);
      }
    }
    const tanggalIjazah = dates[0] || '';

    let tahunLulus = '';
    for (const item of r) {
      if (/^\d{4}$/.test(item)) {
        tahunLulus = item;
        break;
      }
    }
    if (!tahunLulus && tanggalIjazah) {
      tahunLulus = tanggalIjazah.slice(0, 4);
    }

    let namaSekolah = '';
    let jurusan = '';
    let nomorIjazah = '';
    let pemakaianIjazah = 'Pertama';

    // First pass: detect known types
    for (let k = 1; k < r.length; k++) {
      const item = r[k];
      if (dateRe.test(item) || item === tahunLulus) continue;
      const up = item.toUpperCase();

      if (up.includes('PERTAMA') || up.includes('PENINGKATAN') || up.includes('PENYESUAIAN')) {
        pemakaianIjazah = item;
      } else if (!namaSekolah && isSchoolName(item)) {
        namaSekolah = item;
      } else if (!jurusan && isMajorName(item)) {
        jurusan = item;
      } else if (!nomorIjazah && (item.includes('/') || item.includes('.') || /^\d{5,}$/.test(item) || /[A-Z0-9]{5,}/i.test(item))) {
        nomorIjazah = item;
      }
    }

    // Second pass: fill remaining empty fields from unused items
    for (let k = 1; k < r.length; k++) {
      const item = r[k];
      if (dateRe.test(item) || item === tahunLulus || item === pemakaianIjazah) continue;
      if (item === namaSekolah || item === jurusan || item === nomorIjazah) continue;

      if (!namaSekolah && !isMajorName(item)) {
        namaSekolah = item;
      } else if (!jurusan) {
        jurusan = item;
      } else if (!nomorIjazah && item !== '-') {
        nomorIjazah = item;
      }
    }

    return {
      jenjang,
      institusi: namaSekolah || '-',
      namaSekolah: namaSekolah || '-',
      jurusan: jurusan || '-',
      nomorIjazah: nomorIjazah || '-',
      tanggalIjazah,
      tahunLulus,
      pemakaianIjazah
    };
  };

  // Specialized parser for SIMPEG Riwayat Pangkat block (10 fields: Pangkat/Gol, TMT Pangkat, No SK, Tgl SK, Pejabat, Jenis KP, Kredit, Ms Kerja Th, Ms Kerja Bl, Keterangan)
  const parsePangkatBlock = (rawSlice: string[], dateRegex: RegExp): any => {
    // If rawSlice has around 8 to 12 lines (fixed SIMPEG vertical export with empty lines preserved)
    if (rawSlice.length >= 8 && rawSlice.length <= 12) {
      const golRaw = rawSlice[0]?.trim() || '';
      const golMatch = golRaw.match(/\b(I|II|III|IV)\/[a-e]\b/i);
      const golRuang = golMatch ? golMatch[0].toUpperCase() : (golRaw || 'III/a');
      const pangkat = getPangkatFromGol(golRuang) || 'Penata Muda';

      const tmtRaw = rawSlice[1]?.trim() || '';
      const tmtPangkat = parseDateToYYYYMMDD(tmtRaw) || tmtRaw;

      const nomorSk = rawSlice[2]?.trim() || '';

      const tglSkRaw = rawSlice[3]?.trim() || '';
      const tanggalSk = parseDateToYYYYMMDD(tglSkRaw) || tglSkRaw;

      let pejabatPenetap = rawSlice[4]?.trim() || '';
      if (!pejabatPenetap || pejabatPenetap === '-') {
        if (golRuang.startsWith('IV/c') || golRuang.startsWith('IV/d') || golRuang.startsWith('IV/e')) {
          pejabatPenetap = 'Presiden RI';
        } else if (golRuang.startsWith('IV/')) {
          pejabatPenetap = 'Menteri Hukum dan HAM RI';
        } else {
          pejabatPenetap = 'Direktur Jenderal Hak Kekayaan Intelektual';
        }
      }

      const jenisKp = rawSlice[5]?.trim() || 'Reguler';
      // rawSlice[6] is Kredit (e.g. '', '0')
      const masaKerjaTahun = rawSlice[7]?.trim() || '0';
      const masaKerjaBulan = rawSlice[8]?.trim() || '0';
      const keterangan = rawSlice[9]?.trim() || 'KP';

      return {
        golRuang,
        pangkat,
        tmtPangkat,
        nomorSk,
        tanggalSk,
        pejabatPenetap,
        jenisKp: jenisKp || 'Reguler',
        masaKerjaTahun: masaKerjaTahun || '0',
        masaKerjaBulan: masaKerjaBulan || '0',
        keterangan: keterangan || 'KP'
      };
    }

    // Dynamic / Filtered fallback when blank lines were stripped
    const r = rawSlice.map(c => c.trim()).filter(c => c.length > 0);
    const golMatch = (r[0] || '').match(/\b(I|II|III|IV)\/[a-e]\b/i);
    let golRuang = golMatch ? golMatch[0].toUpperCase() : 'III/a';
    if (!golMatch) {
      for (const item of r) {
        const m = item.match(/\b(I|II|III|IV)\/[a-e]\b/i);
        if (m) { golRuang = m[0].toUpperCase(); break; }
      }
    }
    const pangkat = getPangkatFromGol(golRuang) || 'Penata Muda';

    // Extract dates
    const dates: string[] = [];
    for (const item of r) {
      if (dateRegex.test(item)) {
        dates.push(parseDateToYYYYMMDD(item) || item);
      }
    }

    const tmtPangkat = dates[0] || '';
    const tanggalSk = dates[1] || '';

    // Find SK number (contains / or . or KP or KEP, not date, not golRuang)
    let nomorSk = '';
    for (const item of r) {
      if (
        (item.includes('/') || item.includes('.') || item.toUpperCase().includes('KP') || item.toUpperCase().includes('KEP')) &&
        !dateRegex.test(item) &&
        !item.match(/\b(I|II|III|IV)\/[a-e]\b/i) &&
        !item.toUpperCase().includes('DIREKTUR') &&
        !item.toUpperCase().includes('MENTERI') &&
        !item.toUpperCase().includes('KEPALA')
      ) {
        nomorSk = item;
        break;
      }
    }

    // Find Pejabat Penetap
    let pejabatPenetap = '';
    for (const item of r) {
      const up = item.toUpperCase();
      if (
        up.includes('DIREKTUR') || up.includes('MENTERI') || up.includes('PRESIDEN') || 
        up.includes('KEPALA') || up.includes('SEKRETARIS') || up.includes('GUBERNUR') ||
        up.includes('A.N.') || up.includes('AN.')
      ) {
        pejabatPenetap = item;
        break;
      }
    }
    if (!pejabatPenetap) {
      if (golRuang.startsWith('IV/c') || golRuang.startsWith('IV/d') || golRuang.startsWith('IV/e')) {
        pejabatPenetap = 'Presiden RI';
      } else if (golRuang.startsWith('IV/')) {
        pejabatPenetap = 'Menteri Hukum dan HAM RI';
      } else {
        pejabatPenetap = 'Direktur Jenderal Hak Kekayaan Intelektual';
      }
    }

    // Jenis KP
    let jenisKp = 'Reguler';
    for (const item of r) {
      const up = item.toUpperCase();
      if (up.includes('REGULER') || up.includes('PILIHAN') || up.includes('PENYESUAIAN') || up.includes('STRUKTURAL') || up.includes('FUNGSIONAL')) {
        jenisKp = item;
        break;
      }
    }

    // Masa Kerja (Th) and (Bl)
    let mkThn = '0';
    let mkBln = '0';
    const numCandidates: string[] = [];
    for (let i = 0; i < r.length; i++) {
      const item = r[i];
      if (/^\d{1,2}$/.test(item) && item !== '00' && item !== nomorSk) {
        numCandidates.push(item);
      }
    }
    if (numCandidates.length >= 2) {
      mkThn = numCandidates[numCandidates.length - 2];
      mkBln = numCandidates[numCandidates.length - 1];
    } else if (numCandidates.length === 1) {
      mkThn = numCandidates[0];
    }

    // Keterangan
    let keterangan = 'KP';
    for (const item of r) {
      const up = item.toUpperCase();
      if (up === 'CPNS' || up === 'PNS' || up.includes('KP WS') || up.includes('KP SIASN') || up.includes('PENYESUAIAN')) {
        keterangan = item;
        break;
      }
    }

    return {
      golRuang,
      pangkat,
      tmtPangkat,
      nomorSk,
      tanggalSk,
      pejabatPenetap,
      jenisKp,
      masaKerjaTahun: mkThn,
      masaKerjaBulan: mkBln,
      keterangan
    };
  };

  const formatGajiPokok = (val: string | number): string => {
    if (!val) return '';
    const num = String(val).replace(/[^\d]/g, '');
    if (!num) return String(val).trim();
    return Number(num).toLocaleString('id-ID');
  };

  const parseGajiBlock = (rawBlock: string[], dateRegex: RegExp): any => {
    const r = rawBlock.map(x => x.trim()).filter(x => x.length > 0);
    if (r.length === 0) return null;

    // Fixed 10-line vertical or horizontal table format:
    // [0] No SK, [1] Tgl SK, [2] TMT SK, [3] Gol/Pangkat, [4] Gaji Pokok, [5] MK Thn, [6] MK Bln, [7] Pejabat, [8] Jenis, [9] KPPN
    if (rawBlock.length >= 7 && (dateRegex.test(rawBlock[1] || '') || dateRegex.test(rawBlock[2] || ''))) {
      const colSk = rawBlock[0] || '';
      const colTglSk = parseDateToYYYYMMDD(rawBlock[1]) || rawBlock[1] || '';
      const colTmtSk = parseDateToYYYYMMDD(rawBlock[2]) || rawBlock[2] || '';
      const colPangkat = rawBlock[3] || '';
      const colGaji = formatGajiPokok(rawBlock[4] || '');
      const colThn = (rawBlock[5] || '0').replace(/[^\d]/g, '') || '0';
      const colBln = (rawBlock[6] || '0').replace(/[^\d]/g, '') || '0';
      const colPejabat = rawBlock[7] || 'Kepala Biro Kepegawaian';
      const colJenis = rawBlock[8] || 'Kenaikan Gaji Berkala';
      const colKppn = rawBlock[9] || 'KPPN Jakarta V';

      return {
        nomorSk: colSk,
        tanggalSk: colTglSk,
        tmtSk: colTmtSk,
        pangkat: colPangkat,
        gajiPokok: colGaji,
        masaKerjaTahun: colThn,
        masaKerjaBulan: colBln,
        pejabatPenetap: colPejabat,
        jenisKenaikanGaji: colJenis,
        kppn: colKppn
      };
    }

    // Dynamic heuristic fallback
    const dates: string[] = [];
    for (const item of r) {
      if (dateRegex.test(item)) {
        dates.push(parseDateToYYYYMMDD(item) || item);
      }
    }

    const tanggalSk = dates[0] || '';
    const tmtSk = dates[1] || dates[0] || '';

    let nomorSk = '';
    for (const item of r) {
      if (
        (item.includes('/') || item.includes('.') || item.toUpperCase().includes('KP') || item.toUpperCase().includes('KEP') || item.toUpperCase().includes('W.')) &&
        !dateRegex.test(item) &&
        !/^\d+$/.test(item)
      ) {
        nomorSk = item;
        break;
      }
    }
    if (!nomorSk && r[0] && !dateRegex.test(r[0])) {
      nomorSk = r[0];
    }

    let pangkat = '';
    for (const item of r) {
      if (/\b(I|II|III|IV)\/[a-e]\b/i.test(item) || item.toLowerCase().includes('penata') || item.toLowerCase().includes('pembina') || item.toLowerCase().includes('pengatur') || item.toLowerCase().includes('juru')) {
        pangkat = item;
        break;
      }
    }

    let gajiPokok = '';
    for (const item of r) {
      const numOnly = item.replace(/[^\d]/g, '');
      if (numOnly.length >= 6) {
        gajiPokok = formatGajiPokok(item);
        break;
      }
    }

    let pejabatPenetap = 'Kepala Biro Kepegawaian';
    for (const item of r) {
      const up = item.toUpperCase();
      if (up.includes('BIRO') || up.includes('MENTERI') || up.includes('KANWIL') || up.includes('SEKRETARIS') || up.includes('DIRJEN')) {
        pejabatPenetap = item;
        break;
      }
    }

    let mkThn = '0';
    let mkBln = '0';
    const smallNums: string[] = [];
    for (const item of r) {
      if (/^\d{1,2}$/.test(item) && item !== nomorSk) {
        smallNums.push(item);
      }
    }
    if (smallNums.length >= 2) {
      mkThn = smallNums[0];
      mkBln = smallNums[1];
    } else if (smallNums.length === 1) {
      mkThn = smallNums[0];
    }

    let jenisKenaikanGaji = 'Kenaikan Gaji Berkala';
    for (const item of r) {
      const up = item.toUpperCase();
      if (up.includes('BERKALA') || up.includes('KGB') || up.includes('ISTIMEWA')) {
        jenisKenaikanGaji = item;
        break;
      }
    }

    let kppn = 'KPPN Jakarta V';
    for (const item of r) {
      if (item.toUpperCase().includes('KPPN')) {
        kppn = item;
        break;
      }
    }

    return {
      nomorSk,
      tanggalSk,
      tmtSk,
      pangkat,
      gajiPokok,
      masaKerjaTahun: mkThn,
      masaKerjaBulan: mkBln,
      pejabatPenetap,
      jenisKenaikanGaji,
      kppn
    };
  };

  const parsePelatihanBlock = (rawBlock: string[], dateRegex: RegExp): any => {
    const r = rawBlock.map(x => x.trim()).filter(x => x.length > 0);
    if (r.length === 0) return null;

    // Fixed vertical SIMPEG format:
    // [0] Jenis Diklat, [1] Nama Pelatihan, [2] Angkatan, [3] Tahun, [4] Tgl Mulai, [5] Tgl Selesai, [6] Durasi, [7] Tempat, [8] Penyelenggara, [9] No STTPP, [10] Tgl STTPP, [11] Prestasi
    if (rawBlock.length >= 6 && (dateRegex.test(rawBlock[4] || '') || dateRegex.test(rawBlock[5] || ''))) {
      return {
        jenisDiklat: rawBlock[0] || 'Teknis',
        namaPelatihan: rawBlock[1] || 'Pelatihan Teknis',
        angkatan: rawBlock[2] || '-',
        tahun: rawBlock[3] || (rawBlock[4] ? rawBlock[4].slice(-4) : new Date().getFullYear().toString()),
        tanggalMulai: parseDateToYYYYMMDD(rawBlock[4]) || rawBlock[4] || '',
        tanggalSelesai: parseDateToYYYYMMDD(rawBlock[5]) || rawBlock[5] || '',
        durasi: rawBlock[6] || '0 Jam',
        tempat: rawBlock[7] || 'Jakarta',
        penyelenggara: rawBlock[8] || 'BPSDM Hukum dan HAM',
        nomorSertifikat: rawBlock[9] || '-',
        tanggalSertifikat: parseDateToYYYYMMDD(rawBlock[10]) || rawBlock[10] || '',
        prestasi: rawBlock[11] || '-'
      };
    }

    // Dynamic heuristic
    const dates: string[] = [];
    for (const item of r) {
      if (dateRegex.test(item)) {
        dates.push(parseDateToYYYYMMDD(item) || item);
      }
    }

    const tanggalMulai = dates[0] || '';
    const tanggalSelesai = dates[1] || '';
    const tanggalSertifikat = dates[2] || '';

    let tahun = '';
    for (const item of r) {
      if (/^(19|20)\d{2}$/.test(item)) {
        tahun = item;
        break;
      }
    }
    if (!tahun && tanggalMulai) tahun = tanggalMulai.slice(0, 4);

    let durasi = '0 Jam';
    for (const item of r) {
      if (item.toLowerCase().includes('jam') || item.toLowerCase().includes('jp')) {
        durasi = item;
        break;
      }
    }

    let jenisDiklat = 'Teknis';
    for (const item of r) {
      const up = item.toUpperCase();
      if (up.includes('STRUKTURAL') || up.includes('KEPEMIMPINAN') || up.includes('PIM') || up.includes('PKP') || up.includes('PKA') || up.includes('PKN')) {
        jenisDiklat = 'Struktural';
        break;
      } else if (up.includes('FUNGSIONAL')) {
        jenisDiklat = 'Fungsional';
        break;
      } else if (up.includes('LATSAR') || up.includes('PRAJABATAN')) {
        jenisDiklat = 'Prajabatan';
        break;
      } else if (up.includes('WORKSHOP') || up.includes('SEMINAR') || up.includes('BIMTEK')) {
        jenisDiklat = 'Workshop / Bimtek';
        break;
      }
    }

    let tempat = 'Jakarta';
    for (const item of r) {
      const up = item.toUpperCase();
      if (['JAKARTA', 'DEPOK', 'BANDUNG', 'BOGOR', 'SURABAYA', 'BALI', 'MEDAN', 'ONLINE', 'ZOOM'].includes(up)) {
        tempat = item;
        break;
      }
    }

    let penyelenggara = 'BPSDM Hukum dan HAM';
    for (const item of r) {
      const up = item.toUpperCase();
      if (up.includes('BPSDM') || up.includes('LAN') || up.includes('PUSDIKLAT') || up.includes('KEMENKUMHAM') || up.includes('BADAN DIKLAT')) {
        penyelenggara = item;
        break;
      }
    }

    let namaPelatihan = '';
    for (const item of r) {
      if (
        item.length > 5 &&
        !dateRegex.test(item) &&
        !/^\d+$/.test(item) &&
        item !== jenisDiklat &&
        item !== tempat &&
        item !== penyelenggara
      ) {
        namaPelatihan = item;
        break;
      }
    }
    if (!namaPelatihan) namaPelatihan = r[0] || 'Pelatihan';

    let angkatan = '-';
    for (const item of r) {
      if (item.toLowerCase().includes('angkatan') || /^([IVXLCDM]+|\d+)$/i.test(item) && item !== tahun && item.length <= 4) {
        angkatan = item;
        break;
      }
    }

    let nomorSertifikat = '-';
    for (const item of r) {
      if ((item.includes('/') || item.includes('.')) && !dateRegex.test(item) && item !== namaPelatihan) {
        nomorSertifikat = item;
        break;
      }
    }

    return {
      jenisDiklat,
      namaPelatihan,
      angkatan,
      tahun,
      tanggalMulai,
      tanggalSelesai,
      durasi,
      tempat,
      penyelenggara,
      nomorSertifikat,
      tanggalSertifikat,
      prestasi: '-'
    };
  };

  // Helper to split any delimited line (tab, pipe, semicolon, or multi-space)
  const splitLineIntoCols = (line: string): string[] => {
    if (line.includes('\t')) {
      return line.split('\t').map(c => c.trim());
    } else if (line.includes('|')) {
      return line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    } else if (line.includes(';')) {
      return line.split(';').map(c => c.trim());
    } else if (/\s{2,}/.test(line)) {
      return line.split(/\s{2,}/).map(c => c.trim());
    }
    return [line.trim()];
  };

  // Check if a line is a table header row and return dynamic column index mapping
  const identifyHeaderRow = (cols: string[], category: SimpegCategory): Record<string, number> | null => {
    const colMap: Record<string, number> = {};
    let matchCount = 0;

    cols.forEach((col, idx) => {
      const c = col.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ');
      if (category === 'jabatan') {
        if ((c.includes('no') && c.includes('sk')) || c === 'nosk' || c === 'nomor sk') { colMap['nomorSk'] = idx; matchCount++; }
        else if ((c.includes('tgl') && c.includes('sk')) || c === 'tanggalsk' || c === 'tanggal sk') { colMap['tanggalSk'] = idx; matchCount++; }
        else if ((c.includes('nama') && c.includes('jab')) || c === 'namajabatan' || c === 'jabatan') { colMap['namaJabatan'] = idx; matchCount++; }
        else if ((c.includes('tmt') && c.includes('jab')) || c === 'tmt' || c === 'tmtjabatan') { colMap['tmtJabatan'] = idx; matchCount++; }
        else if (c.includes('pejabat') || c.includes('penetap')) { colMap['pejabatPenetap'] = idx; matchCount++; }
        else if (c === 'eselon' || c.startsWith('eselon')) { colMap['eselon'] = idx; matchCount++; }
        else if (c.includes('tmt') && c.includes('eselon')) { colMap['tmtEselon'] = idx; matchCount++; }
        else if (c.includes('pelantikan') && (c.includes('no') || c.includes('nomor'))) { colMap['nomorPelantikan'] = idx; matchCount++; }
        else if (c.includes('pelantikan') && (c.includes('tgl') || c.includes('tanggal'))) { colMap['tanggalPelantikan'] = idx; matchCount++; }
        else if (c.includes('unit') || c.includes('satker') || c.includes('satuan kerja')) { colMap['unitKerja'] = idx; matchCount++; }
      } else if (category === 'pangkat') {
        if (c.includes('gol') || c.includes('ruang')) { colMap['golRuang'] = idx; matchCount++; }
        else if (c === 'pangkat' || c.includes('nama pangkat')) { colMap['pangkat'] = idx; matchCount++; }
        else if (c.includes('tmt')) { colMap['tmtPangkat'] = idx; matchCount++; }
        else if ((c.includes('no') || c.includes('nomor')) && c.includes('sk') || c === 'no sk' || c === 'nomor sk') { colMap['nomorSk'] = idx; matchCount++; }
        else if ((c.includes('tgl') || c.includes('tanggal')) && c.includes('sk') || c === 'tgl sk' || c === 'tanggal sk') { colMap['tanggalSk'] = idx; matchCount++; }
        else if (c.includes('pejabat') || c.includes('penetap')) { colMap['pejabatPenetap'] = idx; matchCount++; }
        else if (c.includes('jenis') || c.includes('kp')) { colMap['jenisKp'] = idx; matchCount++; }
        else if (c.includes('kredit') || c === 'ak') { colMap['kredit'] = idx; matchCount++; }
        else if ((c.includes('ms kerja') || c.includes('masa kerja')) && (c.includes('th') || c.includes('tahun')) || c === 'mk tahun' || c === 'thn mk' || c === 'thn') { colMap['masaKerjaTahun'] = idx; matchCount++; }
        else if ((c.includes('ms kerja') || c.includes('masa kerja')) && (c.includes('bl') || c.includes('bulan')) || c === 'mk bulan' || c === 'bln mk' || c === 'bln') { colMap['masaKerjaBulan'] = idx; matchCount++; }
        else if (c.includes('ket') || c.includes('keterangan')) { colMap['keterangan'] = idx; matchCount++; }
      } else if (category === 'pendidikan') {
        if (c.includes('jenjang') || c.includes('tingkat') || c === 'pendidikan') { colMap['jenjang'] = idx; matchCount++; }
        else if (c.includes('sekolah') || c.includes('institusi') || c.includes('universitas') || c.includes('lembaga') || c.includes('kampus') || c.includes('nama sekolah')) { colMap['namaSekolah'] = idx; matchCount++; }
        else if (c.includes('jurusan') || c.includes('prodi') || c.includes('program studi')) { colMap['jurusan'] = idx; matchCount++; }
        else if ((c.includes('no') || c.includes('nomor')) && (c.includes('ijazah') || c.includes('sttb')) || c === 'no ijazah' || c === 'no sttb') { colMap['nomorIjazah'] = idx; matchCount++; }
        else if ((c.includes('tgl') || c.includes('tanggal')) && (c.includes('ijazah') || c.includes('sttb')) || c === 'tgl ijazah' || c === 'tgl sttb') { colMap['tanggalIjazah'] = idx; matchCount++; }
        else if (c.includes('tahun lulus') || c.includes('thn lulus') || c === 'lulus' || (c.includes('tahun') && !c.includes('ijazah')) || c.includes('tahun kelulusan')) { colMap['tahunLulus'] = idx; matchCount++; }
        else if (c.includes('pemakaian') || c.includes('status ijazah')) { colMap['pemakaianIjazah'] = idx; matchCount++; }
      } else if (category === 'gaji') {
        if ((c.includes('no') || c.includes('nomor')) && c.includes('sk') || c === 'no sk' || c === 'nomor sk') { colMap['nomorSk'] = idx; matchCount++; }
        else if ((c.includes('tgl') || c.includes('tanggal')) && c.includes('sk') || c === 'tgl sk' || c === 'tanggal sk') { colMap['tanggalSk'] = idx; matchCount++; }
        else if (c.includes('tmt')) { colMap['tmtSk'] = idx; matchCount++; }
        else if (c.includes('gol') || c.includes('pangkat') || c.includes('ruang')) { colMap['pangkat'] = idx; matchCount++; }
        else if (c.includes('gaji') || c.includes('pokok') || c.includes('gapok')) { colMap['gajiPokok'] = idx; matchCount++; }
        else if ((c.includes('masa kerja') && (c.includes('th') || c.includes('tahun'))) || c === 'thn' || c === 'tahun') { colMap['masaKerjaTahun'] = idx; matchCount++; }
        else if ((c.includes('masa kerja') && (c.includes('bl') || c.includes('bulan'))) || c === 'bln' || c === 'bulan') { colMap['masaKerjaBulan'] = idx; matchCount++; }
        else if (c.includes('pejabat') || c.includes('penetap')) { colMap['pejabatPenetap'] = idx; matchCount++; }
        else if (c.includes('jenis') || c.includes('kgb')) { colMap['jenisKenaikanGaji'] = idx; matchCount++; }
        else if (c.includes('kppn') || c.includes('kantor bayar')) { colMap['kppn'] = idx; matchCount++; }
      } else if (category === 'pelatihan') {
        if (c.includes('jenis') && (c.includes('diklat') || c.includes('pelatihan'))) { colMap['jenisDiklat'] = idx; matchCount++; }
        else if (c.includes('nama') || (c.includes('diklat') && !c.includes('jenis')) || (c.includes('pelatihan') && !c.includes('jenis'))) { colMap['namaPelatihan'] = idx; matchCount++; }
        else if (c.includes('angkatan')) { colMap['angkatan'] = idx; matchCount++; }
        else if (c.includes('tahun') || c === 'thn') { colMap['tahun'] = idx; matchCount++; }
        else if (c.includes('mulai') || (c.includes('tgl') && c.includes('awal'))) { colMap['tanggalMulai'] = idx; matchCount++; }
        else if (c.includes('selesai') || (c.includes('tgl') && c.includes('akhir'))) { colMap['tanggalSelesai'] = idx; matchCount++; }
        else if (c.includes('durasi') || c.includes('jam') || c.includes('jp')) { colMap['durasi'] = idx; matchCount++; }
        else if (c.includes('tempat') || c.includes('lokasi')) { colMap['tempat'] = idx; matchCount++; }
        else if (c.includes('penyelenggara') || c.includes('lembaga')) { colMap['penyelenggara'] = idx; matchCount++; }
        else if ((c.includes('tgl') || c.includes('tanggal')) && (c.includes('sttpp') || c.includes('sertifikat'))) { colMap['tanggalSertifikat'] = idx; matchCount++; }
        else if (c.includes('sttpp') || c.includes('sertifikat') || c.includes('piagam')) { colMap['nomorSertifikat'] = idx; matchCount++; }
        else if (c.includes('prestasi') || c.includes('predikat') || c.includes('peringkat')) { colMap['prestasi'] = idx; matchCount++; }
      } else if (category === 'keluarga') {
        if (c.includes('hubungan')) { colMap['hubungan'] = idx; matchCount++; }
        else if (c.includes('nama')) { colMap['nama'] = idx; matchCount++; }
        else if (c.includes('tempat')) { colMap['tempatLahir'] = idx; matchCount++; }
        else if (c.includes('tgl') || c.includes('tanggal')) { colMap['tanggalLahir'] = idx; matchCount++; }
        else if (c.includes('kelamin') || c.includes('jk') || c === 'l p') { colMap['jenisKelamin'] = idx; matchCount++; }
        else if (c.includes('pekerjaan')) { colMap['pekerjaan'] = idx; matchCount++; }
        else if (c.includes('nik')) { colMap['nik'] = idx; matchCount++; }
        else if (c.includes('status') || c.includes('kawin')) { colMap['statusPerkawinan'] = idx; matchCount++; }
        else if (c.includes('tunjangan')) { colMap['keteranganTunjangan'] = idx; matchCount++; }
      }
    });

    return matchCount >= 2 ? colMap : null;
  };

  // Check if pasted lines are just column header names (like "No Pelantikan", "Tgl Pelantikan", "Status Jabatan")
  const checkIsHeaderOnly = (lines: string[]): boolean => {
    if (lines.length === 0) return false;
    const headerKeywords = [
      'pelantikan', 'tunjangan', 'status jabatan', 'unit kerja', 'nomor sk', 'no sk',
      'tanggal sk', 'tgl sk', 'nama jabatan', 'jabatan', 'eselon', 'golongan', 'pangkat',
      'tmt', 'jenjang', 'jurusan', 'institusi', 'ijazah', 'sttb', 'gaji pokok', 'kgb',
      'diklat', 'pelatihan', 'penyelenggara', 'hubungan', 'nama lengkap', 'tempat lahir'
    ];
    let matchCount = 0;
    for (const line of lines) {
      const l = line.toLowerCase().trim();
      if (headerKeywords.some(kw => l === kw || l.startsWith(kw) || l.endsWith(kw))) {
        matchCount++;
      }
    }
    // If more than 60% of lines match header names and length <= 15, it's very likely header names
    return matchCount >= 2 && (matchCount / lines.length) >= 0.5;
  };

  // Smart Parser for pasted text from SIMPEG Kemenkumham
  const handleParseText = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setParsedRows([]);
      setIsHeaderOnlyDetected(false);
      return;
    }

    const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    // =========================================================================
    // ATTEMPT 1: Vertical Stream Parser for direct SIMPEG copy-paste
    // (When copying tables from SIMPEG web, the browser puts every cell on a new line)
    // =========================================================================
    const rawLines = text.split(/\r?\n/);
    // Strip trailing question/comment lines (e.g. "kenAPA YANG TERDETECTBEDA", "MASIH TERDETEKSI...", etc.)
    while (rawLines.length > 0) {
      const last = rawLines[rawLines.length - 1].trim().toLowerCase();
      if (
        last.includes('kenapa') || 
        last.includes('terdetect') || 
        last.includes('terdeteksi') || 
        last.includes('masih') ||
        last.length === 0
      ) {
        rawLines.pop();
      } else {
        break;
      }
    }

    const headerKeywords = [
      'no sk', 'tgl sk', 'nama jabatan', 'tmt jabatan', 'pejabat penetap', 'eselon', 
      'tmt eselon', 'no pelantikan', 'tgl pelantikan', 'tunjangan', 'bln dibayar', 
      'unit kerja', 'status jabatan', 'rekam jejak', 'gol. ruang', 'gol/ruang', 'pangkat', 
      'tmt pangkat', 'jenis kp', 'kredit', 'ms kerja', 'ms kerja (th)', 'ms kerja (bl)', 'masa kerja', 'keterangan',
      'jenjang', 'institusi', 'jurusan', 
      'no sttb', 'no ijazah', 'tgl ijazah', 'tgl sttb', 'tahun', 'pemakaian',
      'gaji pokok', 'tmt sk', 'jenis diklat', 'nama pelatihan', 'angkatan',
      'tgl mulai', 'tgl selesai', 'durasi', 'hubungan', 'nama lengkap', 'tempat lahir', 'tgl lahir',
      'pendidikan', 'nama sekolah', 'alamat sekolah', 'kepala sekolah', 'tahun kelulusan', 'pemakaian ijazah',
      'no. sttb', 'tgl. sttb', 'no. ijazah', 'tgl. ijazah'
    ];

    let hIdx = 0;
    while (hIdx < rawLines.length && headerKeywords.some(hk => rawLines[hIdx].trim().toLowerCase().startsWith(hk) || rawLines[hIdx].trim().toLowerCase() === hk)) {
      hIdx++;
    }

    const contentLines = rawLines.slice(hIdx);
    const dateRe = /^\d{2}[-/]\d{2}[-/]\d{4}$/;
    const eselonRe = /^(I\.[ab]|II\.[ab]|III\.[ab]|IV\.[ab]|V)$/i;

    let results: any[] = [];

    // =========================================================================
    // STRATEGY 0: DYNAMIC HEADER-BASED MAPPING (Exact Column Alignment)
    // If the pasted data includes a header row (e.g. from table copy/paste),
    // map columns dynamically using identifyHeaderRow and CATEGORY_CONFIG.
    // =========================================================================
    let headerLineIdx = -1;
    let dynamicColMap: Record<string, number> | null = null;

    for (let i = 0; i < Math.min(6, lines.length); i++) {
      const lineCols = splitLineIntoCols(lines[i]);
      if (lineCols.length >= 2) {
        const detected = identifyHeaderRow(lineCols, activeCategory);
        if (detected) {
          headerLineIdx = i;
          dynamicColMap = detected;
          break;
        }
      }
    }

    if (dynamicColMap && headerLineIdx >= 0) {
      const dataLines = lines.slice(headerLineIdx + 1);
      for (const dLine of dataLines) {
        const cols = splitLineIntoCols(dLine);
        if (cols.length < 2) continue;

        if (activeCategory === 'jabatan') {
          const noSk = (dynamicColMap['nomorSk'] !== undefined && cols[dynamicColMap['nomorSk']]) || '';
          const tglSk = (dynamicColMap['tanggalSk'] !== undefined && cols[dynamicColMap['tanggalSk']]) || '';
          const namaJabatan = (dynamicColMap['namaJabatan'] !== undefined && cols[dynamicColMap['namaJabatan']]) || '';
          const tmtJabatan = (dynamicColMap['tmtJabatan'] !== undefined && cols[dynamicColMap['tmtJabatan']]) || '';
          const eselon = (dynamicColMap['eselon'] !== undefined && cols[dynamicColMap['eselon']]) || '-';
          const tmtEselon = (dynamicColMap['tmtEselon'] !== undefined && cols[dynamicColMap['tmtEselon']]) || '';
          const nomorPelantikan = (dynamicColMap['nomorPelantikan'] !== undefined && cols[dynamicColMap['nomorPelantikan']]) || '';
          const tanggalPelantikan = (dynamicColMap['tanggalPelantikan'] !== undefined && cols[dynamicColMap['tanggalPelantikan']]) || '';
          let unitKerja = (dynamicColMap['unitKerja'] !== undefined && cols[dynamicColMap['unitKerja']]) || '';
          let pejabatPenetap = (dynamicColMap['pejabatPenetap'] !== undefined && cols[dynamicColMap['pejabatPenetap']]) || '';

          if (!unitKerja || unitKerja === '-' || dateRe.test(unitKerja)) {
            unitKerja = deriveUnitKerjaFromJabatan(namaJabatan);
          }
          if (!pejabatPenetap || pejabatPenetap === '-') {
            pejabatPenetap = derivePejabatPenetap(eselon, noSk);
          }

          if (namaJabatan || noSk) {
            results.push({
              nomorSk: noSk,
              tanggalSk: parseDateToYYYYMMDD(tglSk) || tglSk,
              namaJabatan,
              unitKerja,
              tmtJabatan: parseDateToYYYYMMDD(tmtJabatan) || tmtJabatan,
              pejabatPenetap,
              eselon,
              tmtEselon: parseDateToYYYYMMDD(tmtEselon) || tmtEselon,
              nomorPelantikan,
              tanggalPelantikan: parseDateToYYYYMMDD(tanggalPelantikan) || tanggalPelantikan
            });
          }
        } else if (activeCategory === 'pangkat') {
          let golRuang = (dynamicColMap['golRuang'] !== undefined && cols[dynamicColMap['golRuang']]) || '';
          let pangkat = (dynamicColMap['pangkat'] !== undefined && cols[dynamicColMap['pangkat']]) || '';

          // If swapped or if golRuang contains pangkat text
          if (/^(I|II|III|IV)\/[a-e]$/i.test(pangkat) && !/^(I|II|III|IV)\/[a-e]$/i.test(golRuang)) {
            const tmp = golRuang;
            golRuang = pangkat;
            pangkat = tmp;
          }
          if (!pangkat && golRuang) {
            pangkat = getPangkatFromGol(golRuang);
          }
          if (!golRuang) {
            const gIdx = cols.findIndex(col => /^(I|II|III|IV)\/[a-e]$/i.test(col));
            if (gIdx >= 0) golRuang = cols[gIdx];
          }

          const tmtPangkat = (dynamicColMap['tmtPangkat'] !== undefined && cols[dynamicColMap['tmtPangkat']]) || '';
          const nomorSk = (dynamicColMap['nomorSk'] !== undefined && cols[dynamicColMap['nomorSk']]) || '';
          const tanggalSk = (dynamicColMap['tanggalSk'] !== undefined && cols[dynamicColMap['tanggalSk']]) || '';
          const pejabatPenetap = (dynamicColMap['pejabatPenetap'] !== undefined && cols[dynamicColMap['pejabatPenetap']]) || 'Kepala BKN';
          const jenisKp = (dynamicColMap['jenisKp'] !== undefined && cols[dynamicColMap['jenisKp']]) || 'Reguler';
          const masaKerjaTahun = (dynamicColMap['masaKerjaTahun'] !== undefined && cols[dynamicColMap['masaKerjaTahun']]) || '0';
          const masaKerjaBulan = (dynamicColMap['masaKerjaBulan'] !== undefined && cols[dynamicColMap['masaKerjaBulan']]) || '0';
          const keterangan = (dynamicColMap['keterangan'] !== undefined && cols[dynamicColMap['keterangan']]) || 'KP';

          results.push({
            golRuang: golRuang || 'III/a',
            pangkat: pangkat || getPangkatFromGol(golRuang) || 'Penata Muda',
            tmtPangkat: parseDateToYYYYMMDD(tmtPangkat) || tmtPangkat,
            nomorSk,
            tanggalSk: parseDateToYYYYMMDD(tanggalSk) || tanggalSk,
            pejabatPenetap,
            jenisKp,
            masaKerjaTahun,
            masaKerjaBulan,
            keterangan
          });
        } else if (activeCategory === 'pendidikan') {
          const jenjangRaw = (dynamicColMap['jenjang'] !== undefined && cols[dynamicColMap['jenjang']]) || 'S1';
          const jenjang = normalizeJenjang(jenjangRaw);
          let namaSekolah = (dynamicColMap['namaSekolah'] !== undefined && cols[dynamicColMap['namaSekolah']]) || '';
          let jurusan = (dynamicColMap['jurusan'] !== undefined && cols[dynamicColMap['jurusan']]) || '-';
          if (isSchoolName(jurusan) && !isSchoolName(namaSekolah)) {
            const tmp = namaSekolah;
            namaSekolah = jurusan;
            jurusan = tmp;
          } else if (isMajorName(namaSekolah) && !isMajorName(jurusan)) {
            const tmp = namaSekolah;
            namaSekolah = jurusan;
            jurusan = tmp;
          }
          const nomorIjazah = (dynamicColMap['nomorIjazah'] !== undefined && cols[dynamicColMap['nomorIjazah']]) || '-';
          const tanggalIjazah = (dynamicColMap['tanggalIjazah'] !== undefined && cols[dynamicColMap['tanggalIjazah']]) || '';
          let tahunLulus = (dynamicColMap['tahunLulus'] !== undefined && cols[dynamicColMap['tahunLulus']]) || '';
          if (!tahunLulus && tanggalIjazah) {
            const parsed = parseDateToYYYYMMDD(tanggalIjazah);
            if (parsed) tahunLulus = parsed.slice(0, 4);
          }
          const pemakaianIjazah = (dynamicColMap['pemakaianIjazah'] !== undefined && cols[dynamicColMap['pemakaianIjazah']]) || 'Pertama';

          results.push({
            jenjang,
            institusi: namaSekolah || '-',
            namaSekolah: namaSekolah || '-',
            jurusan: jurusan || '-',
            nomorIjazah: nomorIjazah || '-',
            tanggalIjazah: parseDateToYYYYMMDD(tanggalIjazah) || tanggalIjazah,
            tahunLulus: tahunLulus || (tanggalIjazah ? tanggalIjazah.slice(-4) : ''),
            pemakaianIjazah
          });
        } else if (activeCategory === 'gaji') {
          const nomorSk = (dynamicColMap['nomorSk'] !== undefined && cols[dynamicColMap['nomorSk']]) || '';
          const tanggalSk = (dynamicColMap['tanggalSk'] !== undefined && cols[dynamicColMap['tanggalSk']]) || '';
          const tmtSk = (dynamicColMap['tmtSk'] !== undefined && cols[dynamicColMap['tmtSk']]) || '';
          const pangkat = (dynamicColMap['pangkat'] !== undefined && cols[dynamicColMap['pangkat']]) || '';
          const gajiPokok = (dynamicColMap['gajiPokok'] !== undefined && cols[dynamicColMap['gajiPokok']]) || '';
          const masaKerjaTahun = (dynamicColMap['masaKerjaTahun'] !== undefined && cols[dynamicColMap['masaKerjaTahun']]) || '0';
          const masaKerjaBulan = (dynamicColMap['masaKerjaBulan'] !== undefined && cols[dynamicColMap['masaKerjaBulan']]) || '0';
          const pejabatPenetap = (dynamicColMap['pejabatPenetap'] !== undefined && cols[dynamicColMap['pejabatPenetap']]) || 'Kepala Kantor Wilayah';
          const jenisKenaikanGaji = (dynamicColMap['jenisKenaikanGaji'] !== undefined && cols[dynamicColMap['jenisKenaikanGaji']]) || 'Gaji Berkala';
          const kppn = (dynamicColMap['kppn'] !== undefined && cols[dynamicColMap['kppn']]) || 'KPPN';

          results.push({
            nomorSk,
            tanggalSk: parseDateToYYYYMMDD(tanggalSk) || tanggalSk,
            tmtSk: parseDateToYYYYMMDD(tmtSk) || tmtSk,
            pangkat,
            gajiPokok: formatGajiPokok(gajiPokok),
            masaKerjaTahun,
            masaKerjaBulan,
            pejabatPenetap,
            jenisKenaikanGaji,
            kppn
          });
        } else if (activeCategory === 'pelatihan') {
          const jenisDiklat = (dynamicColMap['jenisDiklat'] !== undefined && cols[dynamicColMap['jenisDiklat']]) || 'Teknis';
          const namaPelatihan = (dynamicColMap['namaPelatihan'] !== undefined && cols[dynamicColMap['namaPelatihan']]) || '';
          const angkatan = (dynamicColMap['angkatan'] !== undefined && cols[dynamicColMap['angkatan']]) || '-';
          const tahun = (dynamicColMap['tahun'] !== undefined && cols[dynamicColMap['tahun']]) || '';
          const tanggalMulai = (dynamicColMap['tanggalMulai'] !== undefined && cols[dynamicColMap['tanggalMulai']]) || '';
          const tanggalSelesai = (dynamicColMap['tanggalSelesai'] !== undefined && cols[dynamicColMap['tanggalSelesai']]) || '';
          let durasi = (dynamicColMap['durasi'] !== undefined && cols[dynamicColMap['durasi']]) || '0 Jam';
          if (durasi && !durasi.toLowerCase().includes('jam') && !durasi.toLowerCase().includes('jp')) {
            durasi = `${durasi} Jam`;
          }
          const tempat = (dynamicColMap['tempat'] !== undefined && cols[dynamicColMap['tempat']]) || 'Jakarta';
          const penyelenggara = (dynamicColMap['penyelenggara'] !== undefined && cols[dynamicColMap['penyelenggara']]) || 'BPSDM Kemenkumham';
          const nomorSertifikat = (dynamicColMap['nomorSertifikat'] !== undefined && cols[dynamicColMap['nomorSertifikat']]) || '-';
          const tanggalSertifikat = (dynamicColMap['tanggalSertifikat'] !== undefined && cols[dynamicColMap['tanggalSertifikat']]) || '';
          const prestasi = (dynamicColMap['prestasi'] !== undefined && cols[dynamicColMap['prestasi']]) || '-';

          results.push({
            jenisDiklat,
            namaPelatihan,
            angkatan,
            tahun,
            tanggalMulai: parseDateToYYYYMMDD(tanggalMulai) || tanggalMulai,
            tanggalSelesai: parseDateToYYYYMMDD(tanggalSelesai) || tanggalSelesai,
            durasi,
            tempat,
            penyelenggara,
            nomorSertifikat,
            tanggalSertifikat: parseDateToYYYYMMDD(tanggalSertifikat) || tanggalSertifikat,
            prestasi
          });
        } else if (activeCategory === 'keluarga') {
          const hubungan = (dynamicColMap['hubungan'] !== undefined && cols[dynamicColMap['hubungan']]) || 'Anak';
          const nama = (dynamicColMap['nama'] !== undefined && cols[dynamicColMap['nama']]) || '';
          const tempatLahir = (dynamicColMap['tempatLahir'] !== undefined && cols[dynamicColMap['tempatLahir']]) || '';
          const tanggalLahir = (dynamicColMap['tanggalLahir'] !== undefined && cols[dynamicColMap['tanggalLahir']]) || '';
          const jenisKelamin = (dynamicColMap['jenisKelamin'] !== undefined && cols[dynamicColMap['jenisKelamin']]) || 'L';
          const pekerjaan = (dynamicColMap['pekerjaan'] !== undefined && cols[dynamicColMap['pekerjaan']]) || '';
          const nik = (dynamicColMap['nik'] !== undefined && cols[dynamicColMap['nik']]) || '';
          const statusPerkawinan = (dynamicColMap['statusPerkawinan'] !== undefined && cols[dynamicColMap['statusPerkawinan']]) || 'Belum Kawin';
          const keteranganTunjangan = (dynamicColMap['keteranganTunjangan'] !== undefined && cols[dynamicColMap['keteranganTunjangan']]) || 'Dapat Tunjangan';

          results.push({
            hubungan,
            nama,
            tempatLahir,
            tanggalLahir: parseDateToYYYYMMDD(tanggalLahir) || tanggalLahir,
            jenisKelamin,
            pekerjaan,
            nik,
            statusPerkawinan,
            keteranganTunjangan
          });
        }
      }
    }

    if (results.length === 0 && activeCategory === 'jabatan') {
      const startIndices: number[] = [];
      for (let k = 0; k < contentLines.length; k++) {
        const lCur = contentLines[k].trim();
        const lNext1 = k + 1 < contentLines.length ? contentLines[k + 1].trim() : '';
        const lNext2 = k + 2 < contentLines.length ? contentLines[k + 2].trim() : '';
        const lNext3 = k + 3 < contentLines.length ? contentLines[k + 3].trim() : '';

        if (
          dateRe.test(lNext1) && 
          dateRe.test(lNext3) && 
          !dateRe.test(lCur) && 
          !eselonRe.test(lCur) && 
          !dateRe.test(lNext2) && 
          !eselonRe.test(lNext2) &&
          lCur.length > 0 &&
          lNext2.length > 0
        ) {
          startIndices.push(k);
        }
      }

      if (startIndices.length > 0) {
        for (let i = 0; i < startIndices.length; i++) {
          const sIdx = startIndices[i];
          const eIdx = i + 1 < startIndices.length ? startIndices[i + 1] : contentLines.length;
          const r = contentLines.slice(sIdx, eIdx).map(c => c.trim());

          const noSk = r[0] || '';
          const tglSk = r[1] || '';
          const namaJabatan = r[2] || '';
          const tmtJabatan = r[3] || '';

          let eselon = '-';
          for (let k = 4; k < r.length; k++) {
            if (eselonRe.test(r[k])) {
              eselon = r[k];
              break;
            }
          }

          let noPelantikan = '';
          let tglPelantikan = '';
          for (let k = 4; k < r.length; k++) {
            const item = r[k];
            if ((item.includes('KP') || item.includes('HKI') || item.includes('W.8') || item.includes('M.HH')) && item !== noSk) {
              noPelantikan = item;
              if (k + 1 < r.length && dateRe.test(r[k + 1])) {
                tglPelantikan = r[k + 1];
              }
              break;
            }
          }

          let tmtEselon = '';
          for (let k = 4; k < r.length; k++) {
            const item = r[k];
            if (dateRe.test(item) && item !== tglPelantikan) {
              tmtEselon = item;
              break;
            }
          }

          let unitKerja = '';
          for (let k = 4; k < r.length; k++) {
            const item = r[k];
            const up = item.toUpperCase();
            if (
              up.includes('DIREKTORAT') || 
              up.includes('KEMENTERIAN') || 
              up.includes('KANWIL') || 
              up.includes('BENGKULU') || 
              up.includes('JAWA BARAT') || 
              up.includes('SEKRETARIAT') || 
              up.includes('DITJEN') ||
              up.includes('KANIM') ||
              up.includes('JAKARTA') ||
              up.includes('KEPULAUAN RIAU') ||
              up.includes('BATAM') ||
              up.includes('BANTEN')
            ) {
              unitKerja = item;
              break;
            }
          }

          if (!unitKerja) {
            const upName = namaJabatan.toUpperCase();
            if (upName.includes('JAKARTA BARAT') || upName.includes('NON TPI JAKARTA')) {
              unitKerja = 'DKI JAKARTA - KANIM KELAS I KHUSUS NON TPI JAKARTA BARAT';
            } else if (upName.includes('BATAM') || upName.includes('TPI BATAM')) {
              unitKerja = 'KEPULAUAN RIAU - KANIM KELAS I KHUSUS TPI BATAM - BIDANG TEKNOLOGI INFORMASI DAN KOMUNIKASI KEIMIGRASIAN';
            } else if (upName.includes('ATASE IMIGRASI')) {
              unitKerja = 'Direktorat Jenderal Imigrasi';
            } else if (upName.includes('BANTEN')) {
              unitKerja = 'BANTEN - KANWIL KEMENTERIAN HUKUM DAN HAM BANTEN - DIVISI KEIMIGRASIAN - BIDANG INTELIJEN DAN PENINDAKAN KEIMIGRASIAN';
            } else if (upName.includes('KEPROTOKOLAN BIRO UMUM') || (upName.includes('PROTOKOL') && upName.includes('BIRO UMUM'))) {
              unitKerja = 'SEKRETARIAT JENDERAL - BIRO UMUM - BAGIAN PROTOKOL DAN PENGAMANAN';
            } else if (upName.includes('DIVISI PERATURAN PERUNDANG-UNDANGAN')) {
              unitKerja = 'Kementerian Hukum - Kantor Wilayah Kementerian Hukum Daerah Khusus Jakarta - Divisi Peraturan Perundang-undangan dan Pembinaan Hukum';
            } else if (upName.includes('SEKRETARIS DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL')) {
              unitKerja = 'Kementerian Hukum - Direktorat Jenderal Kekayaan Intelektual - Sekretariat Direktorat Jenderal Kekayaan Intelektual';
            } else if (upName.includes('DITJEN HKI') || upName.includes('HAK KEKAYAAN')) {
              unitKerja = 'Direktorat Jenderal Hak Kekayaan Intelektual';
            } else if (upName.includes('BENGKULU')) {
              unitKerja = 'Kanwil Kemenkumham Bengkulu';
            } else if (upName.includes('JAWA BARAT')) {
              unitKerja = 'Kanwil Kemenkumham Jawa Barat';
            } else {
              unitKerja = 'Direktorat Jenderal Kekayaan Intelektual';
            }
          }

          let pejabat = '';
          for (let k = 4; k < r.length; k++) {
            const item = r[k];
            const up = item.toUpperCase();
            if (up === 'SEKRETARIS JENDERAL' || up === 'MENTERI HUKUM DAN HAM' || up === 'PRESIDEN RI' || up === 'KEPALA BKN' || up.includes('MENTERI HUKUM')) {
              pejabat = item;
              break;
            }
          }

          if (!pejabat) {
            if (eselon === 'I.a' || eselon === 'I.b') pejabat = 'Presiden RI';
            else pejabat = 'Menteri Hukum dan HAM';
          }

          results.push({
            nomorSk: noSk,
            tanggalSk: parseDateToYYYYMMDD(tglSk) || tglSk,
            namaJabatan,
            unitKerja,
            tmtJabatan: parseDateToYYYYMMDD(tmtJabatan) || tmtJabatan,
            pejabatPenetap: pejabat,
            eselon,
            tmtEselon: parseDateToYYYYMMDD(tmtEselon) || tmtEselon,
            nomorPelantikan: noPelantikan,
            tanggalPelantikan: parseDateToYYYYMMDD(tglPelantikan) || tglPelantikan
          });
        }
      }
    } else if (activeCategory === 'pangkat') {
      const golRe = /\b(I|II|III|IV)\/[a-e]\b/i;
      const startIndices: number[] = [];
      for (let k = 0; k < contentLines.length; k++) {
        const line = contentLines[k].trim();
        if (golRe.test(line) && !line.toLowerCase().includes('sk') && !line.toLowerCase().includes('tahun') && line.length <= 6) {
          startIndices.push(k);
        }
      }
      for (let i = 0; i < startIndices.length; i++) {
        const sIdx = startIndices[i];
        const eIdx = i + 1 < startIndices.length ? startIndices[i + 1] : contentLines.length;
        const rawSlice = contentLines.slice(sIdx, eIdx);
        results.push(parsePangkatBlock(rawSlice, dateRe));
      }
    } else if (activeCategory === 'pendidikan') {
      const startIndices: number[] = [];
      for (let k = 0; k < contentLines.length; k++) {
        if (isJenjangToken(contentLines[k].trim())) {
          startIndices.push(k);
        }
      }
      for (let i = 0; i < startIndices.length; i++) {
        const sIdx = startIndices[i];
        const eIdx = i + 1 < startIndices.length ? startIndices[i + 1] : contentLines.length;
        const rawSlice = contentLines.slice(sIdx, eIdx);
        results.push(parsePendidikanBlock(rawSlice, dateRe));
      }
    } else if (activeCategory === 'gaji') {
      // Find start of each KGB record in vertical stream: line containing SK keyword or followed by date
      const startIndices: number[] = [];
      for (let k = 0; k < contentLines.length; k++) {
        const line = contentLines[k].trim();
        const next1 = k + 1 < contentLines.length ? contentLines[k + 1].trim() : '';
        const next2 = k + 2 < contentLines.length ? contentLines[k + 2].trim() : '';
        const isSkLine = (line.includes('KP') || line.includes('KGB') || line.includes('W.') || line.includes('SEK') || (line.includes('/') && /\d/.test(line))) && !dateRe.test(line);
        if (isSkLine && (dateRe.test(next1) || dateRe.test(next2))) {
          startIndices.push(k);
        }
      }

      // If no SK lines identified, fallback to date pairs
      if (startIndices.length === 0) {
        for (let k = 0; k < contentLines.length; k++) {
          if (dateRe.test(contentLines[k].trim())) {
            const prev = k > 0 ? contentLines[k - 1].trim() : '';
            if (!/^\d+$/.test(prev) && prev.length > 3) {
              startIndices.push(k - 1);
            } else {
              startIndices.push(k);
            }
            k += 3; // Jump forward past this record's dates
          }
        }
      }

      for (let i = 0; i < startIndices.length; i++) {
        const sIdx = startIndices[i];
        const eIdx = i + 1 < startIndices.length ? startIndices[i + 1] : contentLines.length;
        const rawSlice = contentLines.slice(sIdx, eIdx);
        const parsed = parseGajiBlock(rawSlice, dateRe);
        if (parsed) results.push(parsed);
      }
    } else if (activeCategory === 'pelatihan') {
      const startIndices: number[] = [];
      const trainingKeywords = /prajabatan|latsar|diklat|pelatihan|kepemimpinan|adum|sepala|spama|sepadya|spamen|sespa|bimtek|workshop|training|kursus/i;
      for (let k = 0; k < contentLines.length; k++) {
        const line = contentLines[k].trim();
        if (trainingKeywords.test(line) && !dateRe.test(line)) {
          startIndices.push(k);
        }
      }

      for (let i = 0; i < startIndices.length; i++) {
        const sIdx = startIndices[i];
        const eIdx = i + 1 < startIndices.length ? startIndices[i + 1] : contentLines.length;
        const rawSlice = contentLines.slice(sIdx, eIdx);
        const parsed = parsePelatihanBlock(rawSlice, dateRe);
        if (parsed) results.push(parsed);
      }
    } else if (activeCategory === 'keluarga') {
      const hubRe = /^(Suami|Istri|Anak|Ayah|Ibu|Mertua)$/i;
      const startIndices: number[] = [];
      for (let k = 0; k < contentLines.length; k++) {
        if (hubRe.test(contentLines[k].trim())) {
          startIndices.push(k);
        }
      }
      for (let i = 0; i < startIndices.length; i++) {
        const sIdx = startIndices[i];
        const eIdx = i + 1 < startIndices.length ? startIndices[i + 1] : contentLines.length;
        const r = contentLines.slice(sIdx, eIdx).map(c => c.trim());
        results.push({
          hubungan: r[0] || 'Anak',
          nama: r[1] || '',
          tempatLahir: r[2] || '',
          tanggalLahir: parseDateToYYYYMMDD(r[3]) || r[3] || '',
          jenisKelamin: r[4] || 'L',
          pekerjaan: r[5] || '',
          nik: r[6] || '',
          statusPerkawinan: r[7] || 'Belum Kawin',
          keteranganTunjangan: r[8] || 'Dapat Tunjangan'
        });
      }
    }

    // =========================================================================
    // ATTEMPT 2: Standard Horizontal Table (Tab, Pipe, Semicolon, or 2+ Spaces)
    // NOTE: Commas are intentionally NOT used as column delimiters here because
    // Indonesian job titles and names frequently contain commas.
    // =========================================================================
    if (results.length === 0) {
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const lineLower = line.toLowerCase();
        // Skip header rows wherever they appear
        const isHeader = 
          lineLower.includes('jenis diklat') ||
          lineLower.includes('nama pelatihan') ||
          (lineLower.includes('angkatan') && (lineLower.includes('tahun') || lineLower.includes('sttpp') || lineLower.includes('jam') || lineLower.includes('diklat'))) ||
          (lineLower.includes('no') && lineLower.includes('sk')) ||
          lineLower.includes('nama jabatan') ||
          lineLower.includes('pejabat penetap') ||
          lineLower.includes('tmt jabatan') ||
          (lineLower.includes('gol') && lineLower.includes('ruang')) ||
          (lineLower.includes('pangkat') && lineLower.includes('tmt')) ||
          (lineLower.includes('jenjang') && lineLower.includes('institusi')) ||
          (lineLower.includes('gaji') && lineLower.includes('pokok')) ||
          (lineLower.includes('hubungan') && lineLower.includes('nama'));
        
        if (isHeader) {
          continue;
        }

        let cols: string[] = [];
        if (line.includes('\t')) {
          cols = line.split('\t').map(c => c.trim());
        } else if (line.includes('|')) {
          cols = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
        } else if (line.includes(';')) {
          cols = line.split(';').map(c => c.trim());
        } else if (/\s{2,}/.test(line)) {
          cols = line.split(/\s{2,}/).map(c => c.trim());
        }

        if (cols.length >= 2) {
          // Strip leading row number (e.g. 1, 2, 3...) if present across all categories
          let c = [...cols];
          if (/^\d+$/.test(c[0]) && c.length > 2) {
            c.shift();
          }

          if (activeCategory === 'jabatan') {
            const noSk = c[0] || '';
            const tglSk = parseDateToYYYYMMDD(c[1]) || c[1] || '';
            const namaJabatan = c[2] || '';

            const datePattern = /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}-\d{2}-\d{2}$/;
            const eselonPattern = /^(I|II|III|IV)\.[a-e]$/i;

            let tmtJabatan = '';
            let unitKerja = '';
            let eselon = '-';
            let tmtEselon = '';
            let nomorPelantikan = '';
            let tanggalPelantikan = '';
            let pejabatPenetap = '';

            // Check if c[3] is a date (standard SIMPEG column order: No.SK, Tgl.SK, Nama Jabatan, TMT Jabatan...)
            if (datePattern.test(c[3])) {
              tmtJabatan = parseDateToYYYYMMDD(c[3]) || c[3];

              // Find eselon among remaining columns
              for (let k = 4; k < c.length; k++) {
                if (eselonPattern.test(c[k])) {
                  eselon = c[k];
                  if (k + 1 < c.length && datePattern.test(c[k + 1])) {
                    tmtEselon = parseDateToYYYYMMDD(c[k + 1]) || c[k + 1];
                  }
                  break;
                }
              }

              // If c has standard SIMPEG width (>= 12 columns), check c[11] for Unit Kerja
              if (c.length >= 12 && c[11] && c[11] !== '-' && !datePattern.test(c[11]) && !eselonPattern.test(c[11])) {
                const up11 = c[11].toUpperCase();
                if (
                  !up11.includes('MENTERI') && 
                  !up11.includes('PRESIDEN') && 
                  !up11.includes('SEKRETARIS JENDERAL') && 
                  up11 !== 'DEFINITIF' && 
                  up11 !== 'PLT' && 
                  up11 !== 'PLH'
                ) {
                  unitKerja = c[11];
                }
              }

              // Otherwise determine unitKerja by scanning columns strictly
              if (!unitKerja) {
                for (let k = 4; k < c.length; k++) {
                  const val = c[k] || '';
                  const up = val.toUpperCase();
                  const isSkOrPelantikan = (val.includes('KP.') || val.includes('TAHUN') || val.startsWith('SEK.') || val.startsWith('M.HH') || val.startsWith('W.'));
                  if (
                    val !== '-' &&
                    !isSkOrPelantikan &&
                    !datePattern.test(val) &&
                    !eselonPattern.test(val) &&
                    (
                      val.includes(' - ') ||
                      up.includes('KANIM') ||
                      up.includes('KANWIL') ||
                      up.includes('DIREKTORAT') ||
                      up.includes('DITJEN') ||
                      up.includes('KEMENTERIAN') ||
                      up.includes('SEKRETARIAT') ||
                      up.includes('JAKARTA') ||
                      up.includes('BATAM') ||
                      up.includes('BANTEN') ||
                      up.includes('BENGKULU') ||
                      up.includes('JAWA')
                    )
                  ) {
                    unitKerja = val;
                    break;
                  }
                }
              }

              if (!unitKerja || unitKerja === '-' || datePattern.test(unitKerja)) {
                unitKerja = deriveUnitKerjaFromJabatan(namaJabatan);
              }

              // Nomor & Tanggal Pelantikan
              for (let k = 4; k < c.length; k++) {
                const val = c[k] || '';
                if ((val.includes('KP') || val.includes('HKI') || val.includes('W.') || val.includes('M.HH')) && val !== noSk) {
                  nomorPelantikan = val;
                  if (k + 1 < c.length && datePattern.test(c[k + 1])) {
                    tanggalPelantikan = parseDateToYYYYMMDD(c[k + 1]) || c[k + 1];
                  }
                  break;
                }
              }

              // Pejabat Penetap
              for (let k = 4; k < c.length; k++) {
                const up = (c[k] || '').toUpperCase();
                if ((up.includes('MENTERI') || up.includes('SEKRETARIS') || up.includes('PRESIDEN') || up.includes('BKN')) && !up.includes('KANIM')) {
                  pejabatPenetap = c[k];
                  break;
                }
              }
              if (!pejabatPenetap || pejabatPenetap === '-') {
                pejabatPenetap = derivePejabatPenetap(eselon, noSk);
              }
            } else {
              // Alternative layout where c[3] is non-date unitKerja
              unitKerja = c[3] || deriveUnitKerjaFromJabatan(namaJabatan);
              tmtJabatan = parseDateToYYYYMMDD(c[4]) || c[4] || '';
              eselon = c[6] || '-';
              pejabatPenetap = c[5] || derivePejabatPenetap(eselon, noSk);
              tmtEselon = parseDateToYYYYMMDD(c[7]) || c[7] || '';
              nomorPelantikan = c[8] || '';
              tanggalPelantikan = parseDateToYYYYMMDD(c[9]) || c[9] || '';
            }

            if (namaJabatan || noSk) {
              results.push({
                nomorSk: noSk,
                tanggalSk: tglSk,
                namaJabatan,
                unitKerja,
                tmtJabatan,
                pejabatPenetap,
                eselon,
                tmtEselon,
                nomorPelantikan,
                tanggalPelantikan,
              });
            }
          } else if (activeCategory === 'pangkat') {
            const datePattern = /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}-\d{2}-\d{2}$/;
            results.push(parsePangkatBlock(c, datePattern));
          } else if (activeCategory === 'pendidikan') {
            const datePattern = /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}-\d{2}-\d{2}$/;
            results.push(parsePendidikanBlock(c, datePattern));
          } else if (activeCategory === 'gaji') {
            const datePattern = /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}-\d{2}-\d{2}$/;
            const parsed = parseGajiBlock(c, datePattern);
            if (parsed) results.push(parsed);
          } else if (activeCategory === 'pelatihan') {
            const datePattern = /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}-\d{2}-\d{2}$/;
            const parsed = parsePelatihanBlock(c, datePattern);
            if (parsed) results.push(parsed);
          } else if (activeCategory === 'keluarga') {
            results.push({
              hubungan: c[0] || 'Anak',
              nama: c[1] || '',
              tempatLahir: c[2] || '',
              tanggalLahir: parseDateToYYYYMMDD(c[3]) || c[3] || '',
              jenisKelamin: c[4] || 'L',
              pekerjaan: c[5] || '',
              nik: c[6] || '',
              statusPerkawinan: c[7] || 'Belum Kawin',
              keteranganTunjangan: c[8] || 'Dapat Tunjangan'
            });
          }
        }
      }
    }

    // =========================================================================
    // ATTEMPT 3: Key-Value Pairs (e.g. "Nama Jabatan: ...")
    // =========================================================================
    if (results.length === 0 && lines.some(l => l.includes(':'))) {
      const kvMap: Record<string, string> = {};
      lines.forEach(l => {
        const parts = l.split(':');
        if (parts.length >= 2) {
          const k = parts[0].toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          const v = parts.slice(1).join(':').trim();
          kvMap[k] = v;
        }
      });

      if (activeCategory === 'jabatan' && (kvMap.namajabatan || kvMap.jabatan || kvMap.nomorsk || kvMap.nosk)) {
        results.push({
          nomorSk: kvMap.nomorsk || kvMap.nosk || '',
          tanggalSk: parseDateToYYYYMMDD(kvMap.tanggalsk || kvMap.tglsk || ''),
          namaJabatan: kvMap.namajabatan || kvMap.jabatan || '',
          unitKerja: kvMap.unitkerja || kvMap.satker || '',
          tmtJabatan: parseDateToYYYYMMDD(kvMap.tmtjabatan || kvMap.tmt || ''),
          pejabatPenetap: kvMap.pejabatpenetap || kvMap.pejabat || 'Menteri Hukum dan HAM',
          eselon: kvMap.eselon || '-',
          tmtEselon: parseDateToYYYYMMDD(kvMap.tmteselon || ''),
          nomorPelantikan: kvMap.nomorpelantikan || kvMap.nopelantikan || '',
          tanggalPelantikan: parseDateToYYYYMMDD(kvMap.tanggalpelantikan || kvMap.tglpelantikan || ''),
        });
      } else if (activeCategory === 'pangkat' && (kvMap.golruang || kvMap.pangkat || kvMap.gol)) {
        const golRuang = kvMap.golruang || kvMap.gol || 'III/a';
        results.push({
          golRuang,
          pangkat: kvMap.pangkat || getPangkatFromGol(golRuang),
          tmtPangkat: parseDateToYYYYMMDD(kvMap.tmtpangkat || kvMap.tmt || ''),
          nomorSk: kvMap.nomorsk || kvMap.nosk || '',
          tanggalSk: parseDateToYYYYMMDD(kvMap.tanggalsk || kvMap.tglsk || ''),
          pejabatPenetap: kvMap.pejabatpenetap || 'Kepala BKN',
          jenisKp: kvMap.jeniskp || 'Reguler',
          masaKerjaTahun: kvMap.masakerjatahun || '0',
          masaKerjaBulan: kvMap.masakerjabulan || '0',
          keterangan: kvMap.keterangan || 'KP'
        });
      } else if (activeCategory === 'pendidikan' && (kvMap.jenjang || kvMap.namasekolah || kvMap.institusi || kvMap.sekolah || kvMap.jurusan)) {
        const jenjang = normalizeJenjang(kvMap.jenjang || 'S1');
        const inst = kvMap.namasekolah || kvMap.institusi || kvMap.sekolah || kvMap.universitas || '';
        const tglIjazah = parseDateToYYYYMMDD(kvMap.tanggalijazah || kvMap.tglijazah || kvMap.tgl || '');
        const thnLulus = kvMap.tahunlulus || kvMap.thnlulus || kvMap.tahun || (tglIjazah ? tglIjazah.slice(0, 4) : '');
        results.push({
          jenjang,
          institusi: inst,
          namaSekolah: inst,
          jurusan: kvMap.jurusan || kvMap.prodi || '-',
          nomorIjazah: kvMap.nomorijazah || kvMap.noijazah || kvMap.sttb || '',
          tanggalIjazah: tglIjazah,
          tahunLulus: thnLulus,
          pemakaianIjazah: kvMap.pemakaianijazah || kvMap.status || 'Pertama'
        });
      } else if (activeCategory === 'gaji' && (kvMap.nomorsk || kvMap.nosk || kvMap.gajipokok || kvMap.gapok || kvMap.tmtsk || kvMap.tmt)) {
        results.push({
          nomorSk: kvMap.nomorsk || kvMap.nosk || '',
          tanggalSk: parseDateToYYYYMMDD(kvMap.tanggalsk || kvMap.tglsk || ''),
          tmtSk: parseDateToYYYYMMDD(kvMap.tmtsk || kvMap.tmt || ''),
          pangkat: kvMap.pangkat || kvMap.golruang || kvMap.gol || '',
          gajiPokok: formatGajiPokok(kvMap.gajipokok || kvMap.gapok || kvMap.gaji || ''),
          masaKerjaTahun: kvMap.masakerjatahun || kvMap.thn || '0',
          masaKerjaBulan: kvMap.masakerjabulan || kvMap.bln || '0',
          pejabatPenetap: kvMap.pejabatpenetap || kvMap.pejabat || 'Kepala Kantor Wilayah',
          jenisKenaikanGaji: kvMap.jeniskenaikangaji || kvMap.jenis || 'Gaji Berkala',
          kppn: kvMap.kppn || 'KPPN'
        });
      } else if (activeCategory === 'pelatihan' && (kvMap.namapelatihan || kvMap.namadiklat || kvMap.diklat || kvMap.pelatihan || kvMap.nosttpp)) {
        const rawName = kvMap.namapelatihan || kvMap.namadiklat || kvMap.pelatihan || kvMap.diklat || '';
        let jenis = kvMap.jenisdiklat || kvMap.jenis || 'Teknis';
        if (rawName.toLowerCase().includes('prajabatan') || rawName.toLowerCase().includes('latsar')) {
          jenis = 'Prajabatan';
        } else if (rawName.toLowerCase().includes('kepemimpinan') || rawName.toLowerCase().includes('diklatpim')) {
          jenis = 'Struktural';
        }
        let durasi = kvMap.durasi || kvMap.jumlahjam || kvMap.jam || '0 Jam';
        if (durasi && !durasi.toLowerCase().includes('jam') && !durasi.toLowerCase().includes('jp')) {
          durasi = `${durasi} Jam`;
        }
        const tglMulai = parseDateToYYYYMMDD(kvMap.tanggalmulai || kvMap.tglmulai || '');
        const tglSelesai = parseDateToYYYYMMDD(kvMap.tanggalselesai || kvMap.tglselesai || '');
        const tahun = kvMap.tahun || (tglMulai ? tglMulai.slice(0, 4) : '');

        results.push({
          jenisDiklat: jenis,
          namaPelatihan: rawName,
          angkatan: kvMap.angkatan || '-',
          tahun,
          tanggalMulai: tglMulai,
          tanggalSelesai: tglSelesai,
          durasi,
          tempat: kvMap.tempat || kvMap.lokasi || 'Jakarta',
          penyelenggara: kvMap.penyelenggara || kvMap.lembaga || 'BPSDM Kemenkumham',
          nomorSertifikat: kvMap.nomorsertifikat || kvMap.nosttpp || kvMap.sertifikat || '-',
          tanggalSertifikat: parseDateToYYYYMMDD(kvMap.tanggalsertifikat || kvMap.tglsttpp || ''),
          prestasi: kvMap.prestasi || kvMap.predikat || '-'
        });
      }
    }

    if (results.length > 0) {
      setIsHeaderOnlyDetected(false);
    } else {
      setIsHeaderOnlyDetected(checkIsHeaderOnly(lines));
    }

    setParsedRows(results);
  };

  const handleApplySample = (mode: 'APPEND' | 'REPLACE') => {
    const isAndrieansjah = (targetPegawaiName || '').toUpperCase().includes('ANDRIEANSJAH');
    const isAndrieansjahJabatan = activeCategory === 'jabatan' && isAndrieansjah;
    const isAndrieansjahPelatihan = activeCategory === 'pelatihan' && isAndrieansjah;
    
    let dataToApply = currentConfig.sampleData;
    if (isAndrieansjahJabatan) {
      dataToApply = ANDRIEANSJAH_JABATAN_DATA;
    } else if (isAndrieansjahPelatihan) {
      dataToApply = ANDRIEANSJAH_PELATIHAN_DATA;
    }
    
    if (isAndrieansjahJabatan) {
      if (!window.confirm(`Muat 10 data riwayat jabatan otentik SIMPEG Kemenkumham untuk Dr. ANDRIEANSJAH ke profil?`)) {
        return;
      }
    } else if (isAndrieansjahPelatihan) {
      if (!window.confirm(`Muat 6 data riwayat pelatihan otentik SIMPEG Kemenkumham untuk Dr. ANDRIEANSJAH ke profil?`)) {
        return;
      }
    } else {
      const confirmMsg = `PERINGATAN:\nData ini adalah DATA CONTOH SIMULASI (milik pejabat simulasi: Kasubsi s.d. Direktur Jenderal), BUKAN data asli ${targetPegawaiName || 'pegawai ini'}.\n\nApakah Anda yakin ingin memuat data contoh ini ke profil ${targetPegawaiName || 'pegawai ini'}?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }
    onApply(activeCategory, mode, dataToApply);
    onClose();
  };

  const handleApplyParsed = (mode: 'APPEND' | 'REPLACE') => {
    if (parsedRows.length === 0) {
      if (pastedText.trim().length > 0) {
        if (isHeaderOnlyDetected) {
          alert("Teks yang Anda tempel terdeteksi sebagai judul/header kolom dari SIMPEG (No Pelantikan, Tgl Pelantikan, dll), belum memuat baris isi datanya.\n\nSilakan salin baris DATA di bawah judul tersebut pada SIMPEG, atau gunakan tab 'Formulir Input Manual' untuk mengetik langsung.");
        } else {
          alert("Format baris teks belum sesuai format tabel SIMPEG/Excel. Pastikan menyalin tabel dengan kolom-kolomnya, atau klik tab 'Formulir Input Manual'.");
        }
      } else {
        alert("Silakan tempel (paste) data teks riwayat terlebih dahulu atau gunakan formulir input manual.");
      }
      return;
    }
    onApply(activeCategory, mode, parsedRows);
    onClose();
  };

  const handleSaveManualForm = () => {
    // Validate required fields
    if (activeCategory === 'jabatan' && !manualForm.namaJabatan) {
      alert("Harap isi 'Nama Jabatan' terlebih dahulu.");
      return;
    }
    if (activeCategory === 'pangkat' && !manualForm.golRuang) {
      alert("Harap pilih 'Golongan / Ruang' terlebih dahulu.");
      return;
    }
    if (activeCategory === 'pendidikan' && !manualForm.jenjang) {
      alert("Harap pilih 'Jenjang Pendidikan' terlebih dahulu.");
      return;
    }
    if (activeCategory === 'keluarga' && !manualForm.nama) {
      alert("Harap isi 'Nama Lengkap Anggota Keluarga' terlebih dahulu.");
      return;
    }

    const rowToSave = { ...manualForm };
    onApply(activeCategory, 'APPEND', [rowToSave]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
        
        {/* MODAL HEADER */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white shadow-xs border border-gray-100 flex items-center justify-center text-xl ${currentConfig.colorClass}`}>
              <i className={`bi ${currentConfig.icon}`}></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-tight">
                  Import / Tambah: {currentConfig.title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                  Format Resmi Kemenkumham
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                {currentConfig.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        </div>

        {/* TARGET PEGAWAI INFO BANNER */}
        {targetPegawaiName && (
          <div className="px-5 sm:px-6 py-2.5 bg-blue-50/70 border-b border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
                <i className="bi bi-person-fill"></i>
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Target Pegawai:</span>
              <span className="text-xs font-black text-blue-950 uppercase">{targetPegawaiName}</span>
              {targetPegawaiNip && (
                <span className="text-[10px] font-mono text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md">
                  NIP. {targetPegawaiNip}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold text-blue-700">
              ✓ Data akan disimpan khusus untuk pegawai ini
            </span>
          </div>
        )}

        {/* CATEGORY SWITCHER TABS */}
        <div className="px-5 sm:px-6 pt-3 pb-2 bg-gray-50/70 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['jabatan', 'pangkat', 'pendidikan', 'gaji', 'pelatihan', 'keluarga'] as SimpegCategory[]).map(catKey => {
            const cfg = CATEGORY_CONFIG[catKey];
            const isActive = activeCategory === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setActiveCategory(catKey)}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <i className={`bi ${cfg.icon}`}></i>
                <span>{cfg.title.split('&')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* ONE-CLICK DR. ANDRIEANSJAH JABATAN BANNER */}
        {activeCategory === 'jabatan' && (targetPegawaiName || '').toUpperCase().includes('ANDRIEANSJAH') && (
          <div className="mx-5 sm:mx-6 mt-3 p-3.5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                <i className="bi bi-patch-check-fill"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h6 className="text-[11px] font-black text-amber-950 uppercase tracking-tight">10 Riwayat Jabatan SIMPEG Dr. ANDRIEANSJAH Siap Dipasang</h6>
                  <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full font-mono text-[9px] font-black">10 Data (2010 - 2026)</span>
                </div>
                <p className="text-[9px] text-amber-800 mt-0.5">
                  10 riwayat karir otentik SIMPEG Kemenkumham (Kasi, Kasubdit, Kabag, Kadiv, Sesditjen, hingga Direktur Paten 2026).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onApply('jabatan', 'REPLACE', ANDRIEANSJAH_JABATAN_DATA);
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-[10px] font-black uppercase whitespace-nowrap shadow-sm cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2"
            >
              <i className="bi bi-lightning-charge-fill text-amber-200"></i>
              <span>Pasang 10 Riwayat Langsung</span>
            </button>
          </div>
        )}

        {/* ONE-CLICK DR. ANDRIEANSJAH PELATIHAN BANNER */}
        {activeCategory === 'pelatihan' && (targetPegawaiName || '').toUpperCase().includes('ANDRIEANSJAH') && (
          <div className="mx-5 sm:mx-6 mt-3 p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                <i className="bi bi-journal-check"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h6 className="text-[11px] font-black text-purple-950 uppercase tracking-tight">6 Riwayat Diklat SIMPEG Dr. ANDRIEANSJAH Siap Dipasang</h6>
                  <span className="px-2 py-0.5 bg-purple-200/80 text-purple-900 rounded-full font-mono text-[9px] font-black">6 Diklat (2000 - 2026)</span>
                </div>
                <p className="text-[9px] text-purple-800 mt-0.5">
                  Prajabatan LAN 2000, Diklatpim IV 2009, Diklatpim III 2015, Diklatpim II 2021, Diklatpim I 2026, dan Anti-Bribery ISO 37001.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onApply('pelatihan', 'REPLACE', ANDRIEANSJAH_PELATIHAN_DATA);
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase whitespace-nowrap shadow-sm cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2"
            >
              <i className="bi bi-lightning-charge-fill text-yellow-300"></i>
              <span>Pasang 6 Diklat Langsung</span>
            </button>
          </div>
        )}

        {/* INPUT MODE SWITCHER: SALIN-TEMPEL VS INPUT FORMULIR MANUAL */}
        <div className="px-5 sm:px-6 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-[10px] font-black uppercase">
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                inputMode === 'paste' 
                  ? 'bg-white text-blue-700 shadow-xs font-black' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <i className="bi bi-clipboard-data-fill"></i>
              <span>1. Salin & Tempel Tabel SIMPEG</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                inputMode === 'manual' 
                  ? 'bg-white text-blue-700 shadow-xs font-black' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <i className="bi bi-pencil-square"></i>
              <span>2. Formulir Input Manual</span>
            </button>
          </div>

          <span className="text-[9px] font-bold text-gray-400 hidden sm:inline uppercase tracking-wider">
            {inputMode === 'paste' ? 'Salin banyak baris sekaligus' : 'Ketik 1 data riwayat dengan form'}
          </span>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* MODE 1: PASTE TEXT */}
          {inputMode === 'paste' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-gray-600 space-y-1 leading-relaxed">
                <p className="font-bold text-gray-800">
                  Cara mengisi data riwayat asli pegawai:
                </p>
                <ol className="list-decimal list-inside text-[10px] text-gray-600 space-y-0.5 font-medium">
                  <li>Buka portal SIMPEG Kemenkumham / file Excel rekap riwayat milik <strong>{targetPegawaiName || 'pegawai ini'}</strong>.</li>
                  <li>Sorot (blok) seluruh baris pada tabel riwayat {currentConfig.title}, lalu tekan <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[9px] font-mono font-bold">Ctrl+C</kbd> (Salin).</li>
                  <li>Klik di kotak di bawah dan tekan <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[9px] font-mono font-bold">Ctrl+V</kbd> (Tempel). Sistem otomatis memetakan kolom-kolomnya!</li>
                </ol>
              </div>

              <textarea
                rows={5}
                value={pastedText}
                onChange={e => handleParseText(e.target.value)}
                placeholder={`Tempel (Ctrl+V) baris tabel dari SIMPEG atau Excel di sini...\nContoh format per baris:\n${
                  activeCategory === 'pangkat'
                    ? 'IV/d\tPembina Utama Madya\t2025-10-01\t00503/KEP/AA/15001/25\t2025-08-13\tPresiden RI\tPilihan\t28\t7\tKP'
                    : activeCategory === 'pendidikan'
                    ? 'D4/S1\tUNIVERSITAS INDONESIA\tILMU HUKUM\tJAKARTA\tREKTOR\t002609\t1994-12-16\t1994\tPenyesuaian Ijazah'
                    : activeCategory === 'gaji'
                    ? '00503/KEP/AA/15001/25\t2025-08-13\t2025-10-01\tIV/d\t5.321.200\t28\t7\tPresiden RI\tKenaikan Pangkat\t-'
                    : activeCategory === 'pelatihan'
                    ? 'Teknis\tDiklat Pemeriksa Paten\tVIII\t2022\t2022-01-15\t2022-03-14\t120\tJAKARTA\tBPSDM\t000043\t2022-03-14\t-'
                    : activeCategory === 'keluarga'
                    ? 'Istri\tNAMA PASANGAN\tJAKARTA\t1985-04-14\tP\tWIRASWASTA\t3175000000000001\tKawin\tDapat Tunjangan'
                    : 'SK-123/KP/2023\t2023-11-01\tPemeriksa Paten Ahli Madya\tDirektorat Paten, DTLST dan RD\t2023-11-01\tMenteri Hukum dan HAM\t-\t-\t-\t-'
                }`}
                className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 rounded-2xl text-[10px] font-mono outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
              />

              {/* WARNING IF USER PASTED ONLY HEADER NAMES (LIKE 'No Pelantikan', 'Tgl Pelantikan', ...) */}
              {isHeaderOnlyDetected && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-amber-900 animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <i className="bi bi-exclamation-triangle-fill text-amber-600 text-lg shrink-0 mt-0.5"></i>
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-tight text-amber-900">
                        Teks Terdeteksi Sebagai Nama Kolom (Header SIMPEG)
                      </h4>
                      <p className="text-[10px] text-amber-800 font-medium mt-0.5 leading-relaxed">
                        Anda menyalin nama kolom tabel (seperti <em>"No Pelantikan", "Tgl Pelantikan", "Unit Kerja"</em>), bukan isi datanya. 
                        Silakan salin baris DATA di bawah judul tersebut pada SIMPEG, atau gunakan tombol di samping untuk mengetik langsung dengan formulir:
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInputMode('manual')}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[9px] font-black uppercase whitespace-nowrap shadow-xs cursor-pointer transition-all shrink-0"
                  >
                    <i className="bi bi-pencil-square mr-1"></i> Buka Form Manual
                  </button>
                </div>
              )}

              {/* PREVIEW OF PARSED ROWS */}
              {parsedRows.length > 0 && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                      <i className="bi bi-check2-circle text-emerald-600"></i>
                      Pratinjau Hasil Pembacaan Tabel ({parsedRows.length} Baris):
                    </span>
                    <button
                      type="button"
                      onClick={() => { setPastedText(''); setParsedRows([]); }}
                      className="text-[9px] font-bold text-rose-500 hover:text-rose-700 uppercase cursor-pointer"
                    >
                      <i className="bi bi-trash mr-1"></i> Hapus Teks
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto border border-blue-200 rounded-xl bg-white shadow-xs">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-blue-50/80 border-b border-blue-200 text-blue-900 font-bold uppercase text-[9px] divide-x divide-blue-200">
                          <th className="py-2 px-2 text-center w-8">#</th>
                          {currentConfig.columns.slice(0, 5).map((colName, cIdx) => (
                            <th key={cIdx} className="py-2 px-3">{colName}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedRows.map((r, i) => (
                          <tr key={i} className="hover:bg-blue-50/30 divide-x divide-gray-100">
                            <td className="py-2 px-2 text-center font-bold text-gray-400">{i + 1}</td>
                            {currentConfig.fieldKeys.slice(0, 5).map((fKey, vIdx) => (
                              <td key={vIdx} className="py-2 px-3 font-medium text-gray-800 truncate max-w-[150px]">
                                {String((r as any)[fKey] || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleApplyParsed('APPEND')}
                      className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer shadow-xs"
                    >
                      <i className="bi bi-plus-lg mr-1"></i> Tambahkan Hasil Salin ({parsedRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyParsed('REPLACE')}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                    >
                      <i className="bi bi-arrow-repeat mr-1"></i> Terapkan & Gantikan Semua ({parsedRows.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: FORMULIR INPUT MANUAL */}
          {inputMode === 'manual' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <i className="bi bi-info-circle-fill text-blue-600"></i>
                  <span className="text-[10px] font-bold text-blue-900">
                    Formulir Input Langsung: Masukkan data {currentConfig.title} untuk <strong>{targetPegawaiName || 'pegawai ini'}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setManualForm({ ...DEFAULT_MANUAL_STATE[activeCategory] })}
                  className="text-[9px] font-black text-blue-700 hover:text-blue-900 uppercase cursor-pointer"
                >
                  <i className="bi bi-arrow-counterclockwise mr-1"></i> Reset Isian
                </button>
              </div>

              {/* JABATAN FORM */}
              {activeCategory === 'jabatan' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">
                      Nama Jabatan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pemeriksa Paten Ahli Madya / Kepala Subbagian TU"
                      value={manualForm.namaJabatan || ''}
                      onChange={e => setManualForm({ ...manualForm, namaJabatan: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Unit Kerja / Satker</label>
                    <input
                      type="text"
                      placeholder="Contoh: Direktorat Paten, DTLST dan RD"
                      value={manualForm.unitKerja || ''}
                      onChange={e => setManualForm({ ...manualForm, unitKerja: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">TMT Jabatan</label>
                    <input
                      type="date"
                      value={manualForm.tmtJabatan || ''}
                      onChange={e => setManualForm({ ...manualForm, tmtJabatan: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Nomor SK</label>
                    <input
                      type="text"
                      placeholder="Contoh: SEK-01.KP.03.03 TAHUN 2023"
                      value={manualForm.nomorSk || ''}
                      onChange={e => setManualForm({ ...manualForm, nomorSk: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Tanggal SK</label>
                    <input
                      type="date"
                      value={manualForm.tanggalSk || ''}
                      onChange={e => setManualForm({ ...manualForm, tanggalSk: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Pejabat Penetap</label>
                    <input
                      type="text"
                      placeholder="Contoh: Menteri Hukum dan HAM"
                      value={manualForm.pejabatPenetap || ''}
                      onChange={e => setManualForm({ ...manualForm, pejabatPenetap: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Eselon</label>
                    <select
                      value={manualForm.eselon || '-'}
                      onChange={e => setManualForm({ ...manualForm, eselon: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="-">- (Non-Eselon / Fungsional)</option>
                      <option value="I.a">I.a (Direktur Jenderal / Sekretaris Jenderal)</option>
                      <option value="I.b">I.b (Staf Ahli Menteri)</option>
                      <option value="II.a">II.a (Direktur / Kepala Biro / Kakanwil)</option>
                      <option value="II.b">II.b (Kepala Pusat / Kadiv)</option>
                      <option value="III.a">III.a (Kepala Bagian / Kasubdit)</option>
                      <option value="III.b">III.b (Kepala Bidang)</option>
                      <option value="IV.a">IV.a (Kepala Subbagian / Kasi)</option>
                      <option value="IV.b">IV.b (Kasubsi)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Nomor Pelantikan (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Nomor Berita Acara Pelantikan"
                      value={manualForm.nomorPelantikan || ''}
                      onChange={e => setManualForm({ ...manualForm, nomorPelantikan: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Tanggal Pelantikan (Opsional)</label>
                    <input
                      type="date"
                      value={manualForm.tanggalPelantikan || ''}
                      onChange={e => setManualForm({ ...manualForm, tanggalPelantikan: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* PANGKAT FORM */}
              {activeCategory === 'pangkat' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">
                      Golongan / Ruang <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={manualForm.golRuang || 'III/a'}
                      onChange={e => setManualForm({ ...manualForm, golRuang: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    >
                      {['I/a', 'I/b', 'I/c', 'I/d', 'II/a', 'II/b', 'II/c', 'II/d', 'III/a', 'III/b', 'III/c', 'III/d', 'IV/a', 'IV/b', 'IV/c', 'IV/d', 'IV/e'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Pangkat</label>
                    <input
                      type="text"
                      placeholder="Contoh: Penata Muda / Pembina"
                      value={manualForm.pangkat || ''}
                      onChange={e => setManualForm({ ...manualForm, pangkat: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">TMT Pangkat</label>
                    <input
                      type="date"
                      value={manualForm.tmtPangkat || ''}
                      onChange={e => setManualForm({ ...manualForm, tmtPangkat: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Jenis Kenaikan Pangkat</label>
                    <select
                      value={manualForm.jenisKp || 'Reguler'}
                      onChange={e => setManualForm({ ...manualForm, jenisKp: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="Reguler">Reguler</option>
                      <option value="Pilihan">Pilihan</option>
                      <option value="Penyesuaian Ijazah">Penyesuaian Ijazah</option>
                      <option value="Anumerta">Anumerta</option>
                      <option value="Pengabdian">Pengabdian</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Nomor SK</label>
                    <input
                      type="text"
                      placeholder="Nomor SK Pangkat"
                      value={manualForm.nomorSk || ''}
                      onChange={e => setManualForm({ ...manualForm, nomorSk: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Tanggal SK</label>
                    <input
                      type="date"
                      value={manualForm.tanggalSk || ''}
                      onChange={e => setManualForm({ ...manualForm, tanggalSk: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* PENDIDIKAN FORM */}
              {activeCategory === 'pendidikan' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">
                      Jenjang Pendidikan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={manualForm.jenjang || 'S1'}
                      onChange={e => setManualForm({ ...manualForm, jenjang: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    >
                      {['SD', 'SMP', 'SMA', 'SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3'].map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Nama Sekolah / Institusi</label>
                    <input
                      type="text"
                      placeholder="Contoh: UNIVERSITAS INDONESIA"
                      value={manualForm.namaSekolah || ''}
                      onChange={e => setManualForm({ ...manualForm, namaSekolah: e.target.value, institusi: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Jurusan / Program Studi</label>
                    <input
                      type="text"
                      placeholder="Contoh: ILMU HUKUM / MANAJEMEN"
                      value={manualForm.jurusan || ''}
                      onChange={e => setManualForm({ ...manualForm, jurusan: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Tahun Lulus</label>
                    <input
                      type="number"
                      placeholder="2020"
                      value={manualForm.tahunLulus || ''}
                      onChange={e => setManualForm({ ...manualForm, tahunLulus: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Nomor Ijazah</label>
                    <input
                      type="text"
                      placeholder="Nomor Ijazah / STTB"
                      value={manualForm.nomorIjazah || ''}
                      onChange={e => setManualForm({ ...manualForm, nomorIjazah: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Tanggal Ijazah</label>
                    <input
                      type="date"
                      value={manualForm.tanggalIjazah || ''}
                      onChange={e => setManualForm({ ...manualForm, tanggalIjazah: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* GAJI FORM */}
              {activeCategory === 'gaji' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Nomor SK</label>
                    <input
                      type="text"
                      placeholder="Nomor SK KGB"
                      value={manualForm.nomorSk || ''}
                      onChange={e => setManualForm({ ...manualForm, nomorSk: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Tanggal SK</label>
                    <input
                      type="date"
                      value={manualForm.tanggalSk || ''}
                      onChange={e => setManualForm({ ...manualForm, tanggalSk: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">TMT Gaji (KGB)</label>
                    <input
                      type="date"
                      value={manualForm.tmtSk || ''}
                      onChange={e => setManualForm({ ...manualForm, tmtSk: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Gaji Pokok (Rp)</label>
                    <input
                      type="text"
                      placeholder="Contoh: 4.500.000"
                      value={manualForm.gajiPokok || ''}
                      onChange={e => setManualForm({ ...manualForm, gajiPokok: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* PELATIHAN FORM */}
              {activeCategory === 'pelatihan' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Jenis Diklat</label>
                    <select
                      value={manualForm.jenisDiklat || 'Teknis'}
                      onChange={e => setManualForm({ ...manualForm, jenisDiklat: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="Teknis">Teknis</option>
                      <option value="Fungsional">Fungsional</option>
                      <option value="Kepemimpinan">Kepemimpinan (Pim / PKN / PKA / PKP)</option>
                      <option value="Workshop / Bimtek">Workshop / Bimtek</option>
                      <option value="Seminar / Webinar">Seminar / Webinar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">
                      Nama Pelatihan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Pelatihan / Diklat"
                      value={manualForm.namaPelatihan || ''}
                      onChange={e => setManualForm({ ...manualForm, namaPelatihan: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Penyelenggara</label>
                    <input
                      type="text"
                      placeholder="Contoh: BPSDM Kemenkumham / LAN"
                      value={manualForm.penyelenggara || ''}
                      onChange={e => setManualForm({ ...manualForm, penyelenggara: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Tahun</label>
                    <input
                      type="number"
                      value={manualForm.tahun || ''}
                      onChange={e => setManualForm({ ...manualForm, tahun: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* KELUARGA FORM */}
              {activeCategory === 'keluarga' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">
                      Hubungan Keluarga <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={manualForm.hubungan || 'Anak'}
                      onChange={e => setManualForm({ ...manualForm, hubungan: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="Suami">Suami</option>
                      <option value="Istri">Istri</option>
                      <option value="Anak">Anak</option>
                      <option value="Ayah">Ayah</option>
                      <option value="Ibu">Ibu</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">
                      Nama Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Lengkap Anggota Keluarga"
                      value={manualForm.nama || ''}
                      onChange={e => setManualForm({ ...manualForm, nama: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      placeholder="Kota / Tempat Lahir"
                      value={manualForm.tempatLahir || ''}
                      onChange={e => setManualForm({ ...manualForm, tempatLahir: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={manualForm.tanggalLahir || ''}
                      onChange={e => setManualForm({ ...manualForm, tanggalLahir: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Status Tunjangan</label>
                    <select
                      value={manualForm.keteranganTunjangan || 'Dapat Tunjangan'}
                      onChange={e => setManualForm({ ...manualForm, keteranganTunjangan: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="Dapat Tunjangan">Dapat Tunjangan</option>
                      <option value="Tidak Dapat Tunjangan">Tidak Dapat Tunjangan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">NIK (Nomor Induk Kependudukan)</label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="16 Digit NIK"
                      value={manualForm.nik || ''}
                      onChange={e => setManualForm({ ...manualForm, nik: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* ACTION BUTTON IN MANUAL FORM */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleSaveManualForm}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <i className="bi bi-check-circle-fill"></i>
                  <span>Simpan & Tambahkan ke Profil Pegawai</span>
                </button>
              </div>
            </div>
          )}

          {/* SECONDARY / TEST OPTION: SAMPLE DUMMY TEMPLATE (COLLAPSIBLE WITH PROMINENT WARNING) */}
          <div className="pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDummySample(!showDummySample)}
              className="text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-gray-800 flex items-center justify-between w-full py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <i className="bi bi-exclamation-triangle text-amber-500"></i>
                <span>Opsi Simulasi / Pengujian (Data Contoh Dummy Format)</span>
              </span>
              <span className="text-[9px] font-bold text-gray-400">
                {showDummySample ? 'Tutup Contoh ▲' : 'Buka Contoh Template ▼'}
              </span>
            </button>

            {showDummySample && (
              <div className="mt-2.5 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-start gap-2">
                  <i className="bi bi-shield-exclamation text-amber-600 text-base shrink-0 mt-0.5"></i>
                  <div className="text-[10px] text-amber-900 leading-relaxed font-medium">
                    <strong className="font-black uppercase text-amber-950 block">Pemberitahuan Khusus:</strong>
                    Tombol di bawah ini memuat <strong>{currentConfig.sampleCount} data karier contoh simulasi SIMPEG</strong> (milik profil pejabat simulasi Kemenkumham, BUKAN data asli milik <u>{targetPegawaiName || 'pegawai ini'}</u>). Gunakan hanya jika Anda ingin menguji tampilan format tabel.
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[9px] font-bold text-amber-800">
                    Contoh: {currentConfig.sampleDescription}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplySample('APPEND')}
                      className="px-3.5 py-2 bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 rounded-xl font-black text-[9px] uppercase transition-all shadow-xs cursor-pointer"
                      title="Tambahkan data contoh ini ke riwayat (Hanya untuk pengujian)"
                    >
                      <i className="bi bi-plus-circle mr-1"></i> Tambah Contoh ({currentConfig.sampleCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySample('REPLACE')}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] uppercase rounded-xl shadow-xs transition-all cursor-pointer"
                      title="Gantikan riwayat dengan data contoh simulasi (Hanya untuk pengujian)"
                    >
                      <i className="bi bi-arrow-repeat mr-1"></i> Ganti Contoh ({currentConfig.sampleCount})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER - ALWAYS SHOW ACTION BUTTONS */}
        <div className="px-5 sm:px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-gray-500">
          <div className="flex items-center gap-2">
            {inputMode === 'manual' ? (
              <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1.5">
                <i className="bi bi-pencil-fill"></i> Mengisi formulir manual untuk <strong>{targetPegawaiName || 'pegawai'}</strong>
              </span>
            ) : parsedRows.length > 0 ? (
              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <i className="bi bi-check-circle-fill"></i> Terdeteksi {parsedRows.length} baris data siap ditambahkan
              </span>
            ) : (
              <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
                <i className="bi bi-shield-check text-blue-600"></i>
                Setiap data tersimpan khusus ke profil: <strong className="text-gray-800">{targetPegawaiName || 'pegawai'}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Tutup
            </button>

            {inputMode === 'manual' ? (
              <button
                type="button"
                onClick={handleSaveManualForm}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <i className="bi bi-plus-lg"></i>
                <span>Simpan & Tambah</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleApplyParsed('APPEND')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    parsedRows.length > 0
                      ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                  title={parsedRows.length > 0 ? "Tambahkan hasil salin ke riwayat pegawai" : "Tempel data terlebih dahulu"}
                >
                  <i className="bi bi-plus-lg"></i>
                  <span>+ Tambah {parsedRows.length > 0 ? `(${parsedRows.length})` : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyParsed('REPLACE')}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                    parsedRows.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-600/60 text-white hover:bg-blue-600'
                  }`}
                  title={parsedRows.length > 0 ? "Gantikan seluruh riwayat dengan data baru ini" : "Terapkan data"}
                >
                  <i className="bi bi-check-lg"></i>
                  <span>Simpan Semua {parsedRows.length > 0 ? `(${parsedRows.length})` : ''}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpegImportModal;
