import React, { useState, useEffect } from 'react';
import { 
  SIMPEG_PANGKAT_DATA, 
  SIMPEG_PENDIDIKAN_DATA, 
  SIMPEG_GAJI_DATA, 
  SIMPEG_PELATIHAN_DATA, 
  SIMPEG_KELUARGA_DATA, 
  SIMPEG_JABATAN_DATA,
  ANDRIEANSJAH_JABATAN_DATA,
  ANDRIEANSJAH_PELATIHAN_DATA 
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
    columns: ['No. SK', 'Tgl SK', 'Nama Jabatan', 'TMT Jabatan', 'Unit Kerja', 'Eselon', 'TMT Eselon', 'No. Pelantikan', 'Tgl Pelantikan', 'Pejabat']
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
    columns: ['Gol. Ruang', 'Pangkat', 'TMT Pangkat', 'No. SK', 'Tgl SK', 'Pejabat Penetap', 'Jenis KP', 'Masa Kerja', 'Ket']
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
    columns: ['Jenjang', 'Nama Sekolah / Institusi', 'Jurusan', 'No. STTB / Ijazah', 'Tgl STTB', 'Tahun', 'Pemakaian']
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
    columns: ['No. SK', 'Tgl SK', 'TMT SK', 'Gol/Pangkat', 'Gaji Pokok', 'Masa Kerja Thn', 'Masa Kerja Bln', 'Pejabat', 'Jenis']
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
    columns: ['Jenis Diklat', 'Nama Pelatihan', 'Angkatan', 'Tahun', 'Tgl Mulai', 'Tgl Selesai', 'Durasi', 'Tempat', 'Penyelenggara']
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
    columns: ['Hubungan', 'Nama Lengkap', 'Tempat Lahir', 'Tgl Lahir', 'L/P', 'Pekerjaan', 'NIK', 'Tunjangan']
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
      'tmt pangkat', 'jenis kp', 'masa kerja', 'jenjang', 'institusi', 'jurusan', 
      'no sttb', 'no ijazah', 'tgl ijazah', 'tgl sttb', 'tahun', 'pemakaian',
      'gaji pokok', 'tmt sk', 'jenis diklat', 'nama pelatihan', 'angkatan',
      'tgl mulai', 'tgl selesai', 'durasi', 'hubungan', 'nama lengkap', 'tempat lahir', 'tgl lahir'
    ];

    let hIdx = 0;
    while (hIdx < rawLines.length && headerKeywords.some(hk => rawLines[hIdx].trim().toLowerCase().startsWith(hk) || rawLines[hIdx].trim().toLowerCase() === hk)) {
      hIdx++;
    }

    const contentLines = rawLines.slice(hIdx);
    const dateRe = /^\d{2}[-/]\d{2}[-/]\d{4}$/;
    const eselonRe = /^(I\.[ab]|II\.[ab]|III\.[ab]|IV\.[ab]|V)$/i;

    let results: any[] = [];

    if (activeCategory === 'jabatan') {
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
            if (up.includes('DIREKTORAT') || up.includes('KEMENTERIAN') || up.includes('KANWIL') || up.includes('BENGKULU') || up.includes('JAWA BARAT') || up.includes('SEKRETARIAT') || up.includes('DITJEN')) {
              unitKerja = item;
              break;
            }
          }

          if (!unitKerja) {
            if (namaJabatan.toUpperCase().includes('DITJEN HKI')) {
              unitKerja = 'Direktorat Jenderal Hak Kekayaan Intelektual';
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
      const golRe = /^(I|II|III|IV)\/[a-e]$/i;
      const startIndices: number[] = [];
      for (let k = 0; k < contentLines.length; k++) {
        if (golRe.test(contentLines[k].trim())) {
          startIndices.push(k);
        }
      }
      for (let i = 0; i < startIndices.length; i++) {
        const sIdx = startIndices[i];
        const eIdx = i + 1 < startIndices.length ? startIndices[i + 1] : contentLines.length;
        const r = contentLines.slice(sIdx, eIdx).map(c => c.trim());
        results.push({
          golRuang: r[0] || 'III/a',
          pangkat: r[1] || '',
          tmtPangkat: parseDateToYYYYMMDD(r[2]) || r[2] || '',
          nomorSk: r[3] || '',
          tanggalSk: parseDateToYYYYMMDD(r[4]) || r[4] || '',
          pejabatPenetap: r[5] || 'Kepala BKN',
          jenisKp: r[6] || 'Reguler',
          masaKerjaTahun: r[7] || '0',
          masaKerjaBulan: r[8] || '0',
          keterangan: r[9] || 'KP'
        });
      }
    } else if (activeCategory === 'pendidikan') {
      const jenjangRe = /^(SD|SMP|SMA|SMK|D1|D2|D3|D4|S1|S2|S3|SLTP|SLTA)$/i;
      const startIndices: number[] = [];
      for (let k = 0; k < contentLines.length; k++) {
        if (jenjangRe.test(contentLines[k].trim())) {
          startIndices.push(k);
        }
      }
      for (let i = 0; i < startIndices.length; i++) {
        const sIdx = startIndices[i];
        const eIdx = i + 1 < startIndices.length ? startIndices[i + 1] : contentLines.length;
        const r = contentLines.slice(sIdx, eIdx).map(c => c.trim());
        results.push({
          jenjang: r[0] || 'S1',
          institusi: r[1] || '',
          namaSekolah: r[1] || '',
          jurusan: r[2] || '-',
          alamatSekolah: r[3] || '',
          kepalaSekolah: r[4] || '',
          nomorIjazah: r[5] || '',
          tanggalIjazah: parseDateToYYYYMMDD(r[6]) || r[6] || '',
          tahunLulus: r[7] || (r[6] ? r[6].slice(0, 4) : ''),
          pemakaianIjazah: r[8] || 'Pertama'
        });
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
          if (activeCategory === 'jabatan') {
            // If the first column is simply a sequence number (e.g. "1", "2"), strip it
            let c = [...cols];
            if (/^\d+$/.test(c[0]) && c.length > 2) {
              c.shift();
            }

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
            let pejabatPenetap = 'Menteri Hukum dan Hak Asasi Manusia';

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

              // Determine unitKerja: not a date, not an eselon, not '-'
              for (let k = 4; k < c.length; k++) {
                const val = c[k] || '';
                const up = val.toUpperCase();
                if (
                  val !== '-' &&
                  !datePattern.test(val) &&
                  !eselonPattern.test(val) &&
                  (up.includes('DIREKTORAT') || up.includes('KEMENTERIAN') || up.includes('KANWIL') || up.includes('BENGKULU') || up.includes('JAWA BARAT') || up.includes('SEKRETARIAT') || up.includes('DITJEN') || up.includes('HKI') || up.includes('KUMHAM') || val.length > 5)
                ) {
                  unitKerja = val;
                  break;
                }
              }

              if (!unitKerja) {
                if (namaJabatan.toUpperCase().includes('DITJEN HKI') || namaJabatan.toUpperCase().includes('HAK KEKAYAAN')) {
                  unitKerja = 'Direktorat Jenderal Hak Kekayaan Intelektual';
                } else if (namaJabatan.toUpperCase().includes('BENGKULU')) {
                  unitKerja = 'Kanwil Kemenkumham Bengkulu';
                } else if (namaJabatan.toUpperCase().includes('JAWA BARAT')) {
                  unitKerja = 'Kanwil Kemenkumham Jawa Barat';
                } else {
                  unitKerja = 'Direktorat Jenderal Kekayaan Intelektual';
                }
              }

              // Nomor & Tanggal Pelantikan
              for (let k = 4; k < c.length; k++) {
                const val = c[k] || '';
                if ((val.includes('KP') || val.includes('HKI') || val.includes('W.8') || val.includes('M.HH')) && val !== noSk) {
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
                if (up.includes('MENTERI') || up.includes('SEKRETARIS') || up.includes('PRESIDEN') || up.includes('BKN')) {
                  pejabatPenetap = c[k];
                  break;
                }
              }
              if (eselon === 'I.a' || eselon === 'I.b') {
                pejabatPenetap = 'Presiden Republik Indonesia / Menkumham';
              }
            } else {
              // Alternative layout where c[3] is non-date unitKerja
              unitKerja = c[3] || '';
              tmtJabatan = parseDateToYYYYMMDD(c[4]) || c[4] || '';
              pejabatPenetap = c[5] || 'Menteri Hukum dan Hak Asasi Manusia';
              eselon = c[6] || '-';
              tmtEselon = parseDateToYYYYMMDD(c[7]) || c[7] || '';
              nomorPelantikan = c[8] || '';
              tanggalPelantikan = parseDateToYYYYMMDD(c[9]) || c[9] || '';
            }

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
          } else if (activeCategory === 'pangkat') {
            results.push({
              golRuang: cols[0] || '',
              pangkat: cols[1] || '',
              tmtPangkat: parseDateToYYYYMMDD(cols[2]) || cols[2] || '',
              nomorSk: cols[3] || '',
              tanggalSk: parseDateToYYYYMMDD(cols[4]) || cols[4] || '',
              pejabatPenetap: cols[5] || 'Kepala BKN',
              jenisKp: cols[6] || 'Reguler',
              masaKerjaTahun: cols[7] || '0',
              masaKerjaBulan: cols[8] || '0',
              keterangan: cols[9] || 'KP'
            });
          } else if (activeCategory === 'pendidikan') {
            results.push({
              jenjang: cols[0] || '',
              institusi: cols[1] || '',
              namaSekolah: cols[1] || '',
              jurusan: cols[2] || '-',
              alamatSekolah: cols[3] || '',
              kepalaSekolah: cols[4] || '',
              nomorIjazah: cols[5] || '',
              tanggalIjazah: parseDateToYYYYMMDD(cols[6]) || cols[6] || '',
              tahunLulus: cols[7] || (cols[6] ? cols[6].slice(0, 4) : ''),
              pemakaianIjazah: cols[8] || 'Pertama'
            });
          } else if (activeCategory === 'gaji') {
            results.push({
              nomorSk: cols[0] || '',
              tanggalSk: parseDateToYYYYMMDD(cols[1]) || cols[1] || '',
              tmtSk: parseDateToYYYYMMDD(cols[2]) || cols[2] || '',
              pangkat: cols[3] || '',
              gajiPokok: cols[4] || '',
              masaKerjaTahun: cols[5] || '0',
              masaKerjaBulan: cols[6] || '0',
              pejabatPenetap: cols[7] || '',
              jenisKenaikanGaji: cols[8] || 'Gaji Berkala',
              kppn: cols[9] || 'KPPN'
            });
          } else if (activeCategory === 'pelatihan') {
            // Check if SIMPEG 11-column table layout:
            // [0] Jenis Diklat, [1] Angkatan, [2] Tahun, [3] Tgl Mulai, [4] Tgl Selesai, [5] Jumlah Jam, [6] Tempat, [7] Penyelenggara, [8] No. STTPP, [9] Tgl STTPP, [10] Prestasi Diklat
            const isSimpegTable = 
              /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(cols[3] || '') ||
              /^\d{4}$/.test(cols[2] || '') ||
              cols.length >= 8;

            if (isSimpegTable) {
              const rawName = cols[0] || '';
              const angkatan = cols[1] || '-';
              const tahun = cols[2] || (cols[3] ? cols[3].slice(-4) : '');
              const tglMulai = parseDateToYYYYMMDD(cols[3]) || cols[3] || '';
              const tglSelesai = parseDateToYYYYMMDD(cols[4]) || cols[4] || '';
              const durasiRaw = cols[5] || '';
              const durasi = durasiRaw ? (String(durasiRaw).toLowerCase().includes('jam') ? durasiRaw : `${durasiRaw} Jam`) : '-';
              const tempat = cols[6] || '';
              const penyelenggara = cols[7] || cols[6] || 'BPSDM Kemenkumham';
              const noSttpp = cols[8] && cols[8] !== '-' ? cols[8] : '-';
              const tglSttpp = parseDateToYYYYMMDD(cols[9]) || cols[9] || '';
              const prestasi = cols[10] || '-';

              let namaPelatihan = rawName;
              let jenisDiklat = 'Teknis';
              const lower = rawName.toLowerCase();
              if (lower.includes('prajabatan')) {
                jenisDiklat = 'Prajabatan';
                namaPelatihan = 'Prajabatan Umum Tingkat III';
              } else if (lower.includes('adum') || lower.includes('sepala') || lower.includes('diklatpim iv')) {
                jenisDiklat = 'Struktural (Diklatpim IV)';
                namaPelatihan = 'Adum / Sepala / Diklatpim IV';
              } else if (lower.includes('spama') || lower.includes('sepadya') || lower.includes('diklatpim iii')) {
                jenisDiklat = 'Struktural (Diklatpim III)';
                namaPelatihan = 'Spama / Sepadya / Diklatpim III';
              } else if (lower.includes('spamen') || lower.includes('diklatpim ii')) {
                jenisDiklat = 'Struktural (Diklatpim II)';
                namaPelatihan = 'Spamen / Diklatpim II (PKN Tk. II)';
              } else if (lower.includes('sespa') || lower.includes('spati') || lower.includes('diklatpim i')) {
                jenisDiklat = 'Struktural (Diklatpim I)';
                namaPelatihan = 'Sespa / Spati / Diklatpim I (PKN Tk. I)';
              } else if (lower.includes('anti bribery') || lower.includes('iso 37001')) {
                jenisDiklat = 'Teknis';
                namaPelatihan = 'Training Anti Bribery Management System Based on ISO 37001:2016';
              } else if (lower.includes('fungsional')) {
                jenisDiklat = 'Fungsional';
              }

              results.push({
                jenisDiklat,
                namaPelatihan,
                angkatan,
                tahun,
                tanggalMulai: tglMulai,
                tanggalSelesai: tglSelesai,
                durasi,
                tempat,
                penyelenggara,
                nomorSertifikat: noSttpp,
                tanggalSertifikat: tglSttpp,
                prestasi
              });
            } else {
              results.push({
                jenisDiklat: cols[0] || 'Teknis',
                namaPelatihan: cols[1] || cols[0] || '',
                angkatan: cols[2] || '-',
                tahun: cols[3] || '',
                tanggalMulai: parseDateToYYYYMMDD(cols[4]) || cols[4] || '',
                tanggalSelesai: parseDateToYYYYMMDD(cols[5]) || cols[5] || '',
                durasi: cols[6] || '0 Jam',
                tempat: cols[7] || 'Jakarta',
                penyelenggara: cols[8] || 'BPSDM Kemenkumham',
                nomorSertifikat: cols[9] || '-',
                tanggalSertifikat: parseDateToYYYYMMDD(cols[10]) || cols[10] || '',
                prestasi: cols[11] || '-'
              });
            }
          } else if (activeCategory === 'keluarga') {
            results.push({
              hubungan: cols[0] || 'Anak',
              nama: cols[1] || '',
              tempatLahir: cols[2] || '',
              tanggalLahir: parseDateToYYYYMMDD(cols[3]) || cols[3] || '',
              jenisKelamin: cols[4] || 'L',
              pekerjaan: cols[5] || '',
              nik: cols[6] || '',
              statusPerkawinan: cols[7] || 'Belum Kawin',
              keteranganTunjangan: cols[8] || 'Dapat Tunjangan'
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
        results.push({
          golRuang: kvMap.golruang || kvMap.gol || 'III/a',
          pangkat: kvMap.pangkat || '',
          tmtPangkat: parseDateToYYYYMMDD(kvMap.tmtpangkat || kvMap.tmt || ''),
          nomorSk: kvMap.nomorsk || kvMap.nosk || '',
          tanggalSk: parseDateToYYYYMMDD(kvMap.tanggalsk || kvMap.tglsk || ''),
          pejabatPenetap: kvMap.pejabatpenetap || 'Kepala BKN',
          jenisKp: kvMap.jeniskp || 'Reguler',
          masaKerjaTahun: kvMap.masakerjatahun || '0',
          masaKerjaBulan: kvMap.masakerjabulan || '0',
          keterangan: kvMap.keterangan || 'KP'
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
                            {Object.values(r).slice(0, 5).map((val: any, vIdx) => (
                              <td key={vIdx} className="py-2 px-3 font-medium text-gray-800 truncate max-w-[150px]">
                                {String(val || '-')}
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
