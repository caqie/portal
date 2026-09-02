
import { TaskType } from './types';
import { LOGO_DJKI_URL } from './assets/branding';

export const DEFAULT_LOGO = LOGO_DJKI_URL;
// Logo Pengayoman dari Drive User (Direct Link format)
export const DEFAULT_TEMPLATE_LOGO = "https://lh3.googleusercontent.com/d/167R3ZH6_bKeNbjZ-FituldKmzu3FOoAR";

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const UNIT_KERJA = [
  'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
  'Direktorat Hak Cipta dan Desain Industri',
  'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang',
  'Direktorat Merek dan Indikasi Geografis',
  'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi',
  'Direktorat Teknologi Informasi Kekayaan Intelektual',
  'Direktorat Penegakan Hukum'
];

export const BANK_LIST = [
  'BANK MANDIRI', 'BRI', 'BNI', 'BCA', 'BSI (BANK SYARIAH INDONESIA)', 'BTN', 'BANK CIMB NIAGA', 'BANK DANAMON', 'BANK PERMATA', 'BANK OCBC NISP'
];

export const ORGANISASI_STRUCTURE: Record<string, Record<string, string[]>> = {
  'Sekretariat Direktorat Jenderal Kekayaan Intelektual': {
    'Bagian Umum': ['Subbagian Tata Usaha', 'Subbagian Protokol dan Rumah Tangga', 'Subbagian Pengelolaan BMN', 'Subbagian Layanan Pengadaan'],
    'Bagian Kepegawaian': ['Subbagian Mutasi dan Pengembangan', 'Subbagian Administrasi Kepegawaian', 'Subbagian Disiplin dan Kesejahteraan'],
    'Bagian Keuangan': ['Subbagian Pelaksanaan Anggaran', 'Subbagian Perbendaharaan', 'Subbagian Akuntansi dan Pelaporan'],
    'Bagian Program dan Pelaporan': ['Subbagian Penyusunan Program', 'Subbagian Evaluasi dan Pelaporan']
  },
  'Direktorat Hak Cipta dan Desain Industri': {
    'Subdirektorat Permohonan dan Publikasi': ['Seksi Permohonan', 'Seksi Publikasi'],
    'Subdirektorat Pelayanan Hukum dan Lembaga Manajemen Kolektif': ['Seksi Pelayanan Hukum', 'Seksi Lembaga Manajemen Kolektif'],
    'Subdirektorat Hak Cipta': ['Seksi Hak Cipta I', 'Seksi Hak Cipta II'],
    'Subdirektorat Desain Industri': ['Seksi Desain Industri I', 'Seksi Desain Industri II'],
    'Bagian Tata Usaha': ['Pelaksana Tata Usaha']
  },
  'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang': {
    'Subdirektorat Permohonan dan Publikasi Paten': ['Seksi Permohonan', 'Seksi Publikasi'],
    'Subdirektorat Pemeriksaan Paten I': ['Tim Pemeriksa I', 'Tim Pemeriksa II'],
    'Subdirektorat Pemeriksaan Paten II': ['Tim Pemeriksa III', 'Tim Pemeriksa IV'],
    'Subdirektorat Administrasi dan Pelayanan Hukum': ['Seksi Administrasi', 'Seksi Pelayanan Hukum'],
    'Bagian Tata Usaha': ['Pelaksana Tata Usaha']
  },
  'Direktorat Merek dan Indikasi Geografis': {
    'Subdirektorat Permohonan dan Publikasi Merek': ['Seksi Permohonan', 'Seksi Publikasi'],
    'Subdirektorat Pemeriksaan Merek': ['Tim Pemeriksa Merek I', 'Tim Pemeriksa Merek II'],
    'Subdirektorat Indikasi Geografis': ['Seksi Indikasi Geografis I', 'Seksi Indikasi Geografis II'],
    'Subdirektorat Administrasi dan Pelayanan Hukum': ['Seksi Administrasi', 'Seksi Pelayanan Hukum'],
    'Bagian Tata Usaha': ['Pelaksana Tata Usaha']
  },
  'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi': {
    'Subdirektorat Kerja Sama Luar Negeri': ['Seksi Kerja Sama Multi Lateral', 'Seksi Kerja Sama Bilateral'],
    'Subdirektorat Kerja Sama Dalam Negeri': ['Seksi Kerja Sama Instansi Pemerintah', 'Seksi Kerja Sama Non Pemerintah'],
    'Subdirektorat Pemberdayaan KI': ['Seksi Pemberdayaan I', 'Seksi Pemberdayaan II'],
    'Subdirektorat Edukasi': ['Seksi Edukasi I', 'Seksi Edukasi II'],
    'Bagian Tata Usaha': ['Pelaksana Tata Usaha']
  },
  'Direktorat Teknologi Informasi Kekayaan Intelektual': {
    'Subdirektorat Pengembangan Sistem Informasi': ['Seksi Sistem Informasi I', 'Seksi Sistem Informasi II'],
    'Subdirektorat Infrastruktur TIK': ['Seksi Infrastruktur I', 'Seksi Infrastruktur II'],
    'Subdirektorat Manajemen Data dan Informasi': ['Seksi Manajemen Data', 'Seksi Layanan Informasi'],
    'Bagian Tata Usaha': ['Pelaksana Tata Usaha']
  },
  'Direktorat Penegakan Hukum': {
    'Subdirektorat Pencegahan dan Penyelesaian Sengketa': ['Seksi Pencegahan', 'Seksi Penyelesaian Sengketa'],
    'Subdirektorat Penyidikan': ['Seksi Penyidikan I', 'Seksi Penyidikan II'],
    'Subdirektorat Pemantauan dan Pengawasan': ['Seksi Pemantauan', 'Seksi Pengawasan'],
    'Bagian Tata Usaha': ['Pelaksana Tata Usaha']
  }
};

export const normalizeUnitName = (rawUnit: string): string => {
  const cleaned = (rawUnit || '').toLowerCase().trim();
  if (!cleaned) return 'LAINNYA';
  if (cleaned.includes('sekretariat')) return UNIT_KERJA[0];
  if (cleaned.includes('cipta') || cleaned.includes('desain industri')) return UNIT_KERJA[1];
  if (cleaned.includes('paten') || cleaned.includes('sirkuit terpadu') || cleaned.includes('dtlst') || cleaned.includes('dagang')) return UNIT_KERJA[2];
  if (cleaned.includes('merek') || cleaned.includes('indikasi geografis')) return UNIT_KERJA[3];
  if (cleaned.includes('kerjasama') || cleaned.includes('kerja sama') || cleaned.includes('pemberdayaan') || cleaned.includes('edukasi')) return UNIT_KERJA[4];
  if (cleaned.includes('teknologi informasi') || cleaned.includes(' t i ') || cleaned.endsWith(' ti')) return UNIT_KERJA[5];
  if (cleaned.includes('penyidikan') || cleaned.includes('sengketa') || cleaned.includes('penegakan hukum')) return UNIT_KERJA[6];
  return UNIT_KERJA.find(u => u.toLowerCase().includes(cleaned)) || 'LAINNYA';
};

export const getJabatanClassification = (p: { eselon?: string; jabatan?: string; klasifikasiJabatan?: string; jenisJabatan?: string }): 'JPT' | 'STRUKTURAL' | 'FUNGSIONAL' | 'PELAKSANA' => {
  const es = (p.eselon || '').trim().toUpperCase();
  const j = (p.jabatan || '').trim().toUpperCase();
  const rawKl = (p.klasifikasiJabatan || '').trim().toUpperCase();
  const rawJj = (p.jenisJabatan || '').trim().toUpperCase();

  // 1. DIRECT AUTHORITY: Column AN (JENIS JABATAN) & Column N & Direct Classification Codes
  if (
    rawKl === 'PIMPINAN TINGGI' || rawKl.includes('PIMPINAN TINGGI') || 
    rawJj === 'PIMPINAN TINGGI' || rawJj.includes('PIMPINAN TINGGI') ||
    rawKl === 'JPT' || rawJj === 'JPT' || 
    rawKl.startsWith('JPT') || rawJj.startsWith('JPT')
  ) {
    return 'JPT';
  }

  if (
    rawKl === 'ADMINISTRATOR' || rawJj === 'ADMINISTRATOR' || 
    rawKl === 'PENGAWAS' || rawJj === 'PENGAWAS'
  ) {
    return 'STRUKTURAL';
  }

  if (
    rawKl === 'FUNGSIONAL' || rawJj === 'FUNGSIONAL' || 
    rawKl === 'JFT' || rawJj === 'JFT' ||
    rawJj.startsWith('FUNGSIONAL') ||
    rawKl === 'KEAHLIAN' || rawKl === 'KETERAMPILAN'
  ) {
    return 'FUNGSIONAL';
  }

  if (
    rawKl === 'PELAKSANA' || rawJj === 'PELAKSANA' || 
    rawKl === 'JFU' || rawJj === 'JFU' ||
    rawJj.startsWith('PELAKSANA')
  ) {
    return 'PELAKSANA';
  }

  // 2. High-level JPT Fallbacks (Eselon I & II: Direktur Jenderal, Staf Ahli, Sesditjen, Direktur, Kepala Biro/Pusat)
  if (
    j.includes('DIREKTUR JENDERAL') || j.includes('DIRJEN') ||
    j.includes('SEKRETARIS DIREKTORAT JENDERAL') || j.includes('SESDITJEN') ||
    j.includes('SEKRETARIS UTAMA') || j.includes('SESTAMA') || j.includes('SEKRETARIS JENDERAL') ||
    j.includes('STAF AHLI') || j.includes('INSPEKTUR JENDERAL') || j.includes('INSPEKTUR WILAYAH') ||
    j.includes('KEPALA BIRO') || j.includes('KEPALA PUSAT') ||
    j.startsWith('DIREKTUR ') || j === 'DIREKTUR' ||
    (es === 'I.A' || es === 'I.B' || es === 'II.A' || es === 'II.B' || es === 'ESELON I' || es === 'ESELON II')
  ) {
    return 'JPT';
  }

  // 3. STRUKTURAL (Jabatan Manajerial: Administrator / Eselon III & Pengawas / Eselon IV)
  const isStructuralLeadershipTitle = 
    j.includes('KEPALA BAGIAN') || /\bKABAG\b/.test(j) || 
    j.includes('KEPALA SUBDIREKTORAT') || /\bKASUBDIT\b/.test(j) || 
    j.includes('KEPALA BIDANG') || /\bKABID\b/.test(j) ||
    j.includes('KEPALA SUBBAGIAN') || /\bKASUBBAG\b/.test(j) || 
    j.includes('KEPALA SEKSI') || /\bKASI\b/.test(j) || 
    j.includes('KEPALA BALAI') || /\bKABALAI\b/.test(j) ||
    j.includes('KEPALA KANTOR') || j.includes('KEPALA SATUAN KERJA') ||
    (j.startsWith('KEPALA ') && !j.includes('REGU') && !j.includes('KELUARGA') && !j.includes('TIM') && !j.includes('POKJA'));

  if (isStructuralLeadershipTitle || (rawKl === 'MANAJERIAL' && !j.includes('DIREKTUR'))) {
    return 'STRUKTURAL';
  }

  // 4. FUNGSIONAL / JFT (Jabatan Fungsional Tertentu - Keahlian & Keterampilan)
  const isExplicitFungsionalTitle = 
    // Core DJKI Functional Positions
    j.includes('PEMERIKSA PATEN') || j.includes('PEMERIKSA MEREK') || j.includes('PEMERIKSA DESAIN') || 
    j.includes('PEMERIKSA DTLST') || j.includes('PEMERIKSA RAHASIA DAGANG') || j.includes('PEMERIKSA KIK') ||
    j.includes('ANALIS KI') || j.includes('ANALIS KEKAYAAN INTELEKTUAL') ||
    // Common Civil Service Functional Positions (JFT)
    j.includes('PRANATA KOMPUTER') || /\bPRAKOM\b/.test(j) ||
    j.includes('ARSIPARIS') ||
    j.includes('PRANATA HUMAS') || j.includes('PRANATA HUBUNGAN MASYARAKAT') ||
    j.includes('ANALIS SDM') || j.includes('ANALIS KEPEGAWAIAN') ||
    j.includes('ANALIS HUKUM') || j.includes('ANALIS KEBIJAKAN') || j.includes('PENYULUH HUKUM') ||
    j.includes('PERANCANG PERATURAN') || (j.startsWith('PERANCANG') && !j.includes('GRAFIS')) ||
    j.includes('PENGELOLA PENGADAAN') || /\bPPBJ\b/.test(j) ||
    j.includes('PRANATA KEUANGAN') || j.includes('ANALIS PENGELOLAAN KEUANGAN') || j.includes('ANALIS ANGGARAN') ||
    j.includes('AUDITOR') || j.includes('WIDYAISWARA') || j.includes('STATISTISI') || j.includes('PERENCANA') ||
    j.includes('PENERJEMAH') ||
    j.includes('ASESOR') || j.includes('ASSESSOR') || j.includes('PENILAI') ||
    j.includes('PUSTAKAWAN') || j.includes('KONSELOR') ||
    j.includes('DOKTER') || j.includes('PERAWAT') || j.includes('BIDAN') || j.includes('APOTEKER') ||
    j.includes('PRANATA LABORATORIUM') ||
    // Functional Levels (Jenjang Keahlian & Keterampilan)
    j.includes('AHLI UTAMA') || j.includes('AHLI MADYA') || j.includes('AHLI MUDA') || j.includes('AHLI PERTAMA') ||
    j.includes('AHLI ') || j.endsWith(' AHLI') ||
    j.includes('UTAMA') || j.includes('MADYA') || j.includes('MUDA') || j.includes('PERTAMA') ||
    j.includes('PENYELIA') || j.includes('MAHIR') || j.includes('TERAMPIL') || j.includes('PEMULA') ||
    j.includes('PELAKSANA LANJUTAN') ||
    // Subkoordinator / Koordinator
    j.includes('SUBKOORDINATOR') || j.includes('KOORDINATOR');

  const isFungsionalKlasifikasi = 
    (rawKl.includes('FUNGSIONAL') && !rawKl.includes('UMUM')) || 
    (rawJj.includes('FUNGSIONAL') && !rawJj.includes('UMUM')) || 
    rawKl.includes('JFT') || rawJj.includes('JFT') ||
    rawKl.includes('KEAHLIAN') || rawKl.includes('KETERAMPILAN');

  if (isExplicitFungsionalTitle || isFungsionalKlasifikasi) {
    return 'FUNGSIONAL';
  }

  // 5. Default Fallback -> PELAKSANA (Jabatan Pelaksana / Fungsional Umum / JFU)
  return 'PELAKSANA';
};

/**
 * KOMPREHENSIF GELAR MAP
 */
export const GELAR_MAP: Record<string, { bidang: string, jenjang: string }> = {
  'Dr.Tr.': { bidang: 'Doktor Terapan', jenjang: 'S3' },
  'Dr.': { bidang: 'Doktor', jenjang: 'S3' },
  'M.Tr.A.P.': { bidang: 'Terapan Administrasi Publik', jenjang: 'S2' },
  'M.Kom.': { bidang: 'Ilmu Komputer', jenjang: 'S2' },
  'MMSI': { bidang: 'Manajemen Sistem Informasi', jenjang: 'S2' },
  'M.Eng': { bidang: 'Teknik (Master of Engineering)', jenjang: 'S2' },
  'LL.M.': { bidang: 'Hukum Internasional', jenjang: 'S2' },
  'M.P.P.': { bidang: 'Kebijakan Publik', jenjang: 'S2' },
  'M.H.': { bidang: 'Hukum', jenjang: 'S2' },
  'MH': { bidang: 'Hukum', jenjang: 'S2' },
  'M.Si.': { bidang: 'Sains', jenjang: 'S2' },
  'M.M.': { bidang: 'Manajemen', jenjang: 'S2' },
  'MM': { bidang: 'Manajemen', jenjang: 'S2' },
  'M.T.': { bidang: 'Teknik', jenjang: 'S2' },
  'MT': { bidang: 'Teknik', jenjang: 'S2' },
  'M.E.': { bidang: 'Ekonomi', jenjang: 'S2' },
  'MSE': { bidang: 'Ekonomi', jenjang: 'S2' },
  'M.IP': { bidang: 'Ilmu Pemerintahan', jenjang: 'S2' },
  'M.IPol': { bidang: 'Ilmu Politik', jenjang: 'S2' },
  'M.Hum.': { bidang: 'Humaniora', jenjang: 'S2' },
  'M.Sc.': { bidang: 'Sains (Master of Science)', jenjang: 'S2' },
  'MA': { bidang: 'Seni/Sosial (Master of Arts)', jenjang: 'S2' },
  'M.Kn.': { bidang: 'Kenotariatan', jenjang: 'S2' },
  'M.Farm.': { bidang: 'Farmasi', jenjang: 'S2' },
  'M.Ds.': { bidang: 'Desain', jenjang: 'S2' },
  'S.Tr.Im': { bidang: 'Keimigrasian', jenjang: 'DIV' },
  'S.Tr.Pas': { bidang: 'Pemasyarakatan', jenjang: 'DIV' },
  'S.Tr.Keb': { bidang: 'Kebidanan', jenjang: 'DIV' },
  'S.Tr.Kes': { bidang: 'Kesehatan', jenjang: 'DIV' },
  'S.ST.': { bidang: 'Sains Terapan', jenjang: 'DIV' },
  'S.Tr.T': { bidang: 'Teknik Terapan', jenjang: 'DIV' },
  'S.Tr.RMIK': { bidang: 'Rekam Medis & Info Kesehatan', jenjang: 'DIV' },
  'S.H.': { bidang: 'Hukum', jenjang: 'S1' },
  'SH': { bidang: 'Hukum', jenjang: 'S1' },
  'S.T.': { bidang: 'Teknik', jenjang: 'S1' },
  'ST': { bidang: 'Teknik', jenjang: 'S1' },
  'S.Kom.': { bidang: 'Komputer', jenjang: 'S1' },
  'S.E.': { bidang: 'Ekonomi', jenjang: 'S1' },
  'SE': { bidang: 'Ekonomi', jenjang: 'S1' },
  'S.Sos.': { bidang: 'Ilmu Sosial', jenjang: 'S1' },
  'S.Si.': { bidang: 'Sains (MIPA)', jenjang: 'S1' },
  'S.Pd.': { bidang: 'Pendidikan', jenjang: 'S1' },
  'S.Pd.I': { bidang: 'Pendidikan Islam', jenjang: 'S1' },
  'S.Ak.': { bidang: 'Akuntansi', jenjang: 'S1' },
  'S.Akun': { bidang: 'Akuntansi', jenjang: 'S1' },
  'S.M.': { bidang: 'Manajemen', jenjang: 'S1' },
  'S.IP': { bidang: 'Ilmu Politik', jenjang: 'S1' },
  'S.I.P': { bidang: 'Ilmu Politik', jenjang: 'S1' },
  'S.I.Kom.': { bidang: 'Ilmu Komunikasi', jenjang: 'S1' },
  'SS': { bidang: 'Sastra/Sosial', jenjang: 'S1' },
  'S.Psi.': { bidang: 'Psikologi', jenjang: 'S1' },
  'S.Farm.': { bidang: 'Farmasi', jenjang: 'S1' },
  'S.P.': { bidang: 'Pertanian', jenjang: 'S1' },
  'S.TP.': { bidang: 'Teknologi Pertanian', jenjang: 'S1' },
  'S.Pi.': { bidang: 'Perikanan', jenjang: 'S1' },
  'S.Kel': { bidang: 'Kelautan', jenjang: 'S1' },
  'S.Hut.': { bidang: 'Kehutanan', jenjang: 'S1' },
  'S.Sn.': { bidang: 'Seni', jenjang: 'S1' },
  'S.Ds.': { bidang: 'Desain', jenjang: 'S1' },
  'S.Ag.': { bidang: 'Agama', jenjang: 'S1' },
  'S.Sy.': { bidang: 'Hukum Syariah', jenjang: 'S1' },
  'S.I.K.': { bidang: 'Ilmu Kepolisian', jenjang: 'S1' },
  'S.Ars.': { bidang: 'Arsitektur', jenjang: 'S1' },
  'Drs.': { bidang: 'Doktorandus (Sosial/Sains)', jenjang: 'S1' },
  'Dra.': { bidang: 'Doktoranda (Sosial/Sains)', jenjang: 'S1' },
  'A.Md.Kom.': { bidang: 'Komputer', jenjang: 'DIII' },
  'A.Md.Keb': { bidang: 'Kebidanan', jenjang: 'DIII' },
  'Am.Keb': { bidang: 'Kebidanan', jenjang: 'DIII' },
  'A.Md.Kep': { bidang: 'Keperawatan', jenjang: 'DIII' },
  'AMK': { bidang: 'Keperawatan', jenjang: 'DIII' },
  'A.Md.Rad': { bidang: 'Radiologi', jenjang: 'DIII' },
  'PK': { bidang: 'Rekam Medis', jenjang: 'DIII' },
  'A.Md.': { bidang: 'Ahli Madya', jenjang: 'DIII' },
  'Amd.': { bidang: 'Ahli Madya', jenjang: 'DIII' },
  'Ir.': { bidang: 'Insinyur', jenjang: 'PROFESI' },
  'Apt.': { bidang: 'Apoteker', jenjang: 'PROFESI' },
  'dr.': { bidang: 'Dokter', jenjang: 'PROFESI' },
  'drg.': { bidang: 'Dokter Gigi', jenjang: 'PROFESI' },
  'Bc.IP': { bidang: 'Pemasyarakatan (Kedinasan)', jenjang: 'DIV' },
  'Prof.': { bidang: 'Profesor', jenjang: 'GELAR_KEHORMATAN' },
  'H.': { bidang: 'Haji', jenjang: 'GELAR_KEAGAMAAN' },
  'Hj.': { bidang: 'Hajjah', jenjang: 'GELAR_KEAGAMAAN' },
  'Pdt.': { bidang: 'Pendeta', jenjang: 'GELAR_KEAGAMAAN' },
};

/**
 * Resolves standard education level (pendidikan) and major (jurusan) using custom business logic patterns.
 */
export const resolveUserPendidikan = (nama: string): { pendidikan: string; jurusan: string } | null => {
  if (!nama) return null;

  let txt = String(nama).toUpperCase();

  // rapikan tanda baca
  txt = txt
    .replace(/\./g, "")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const gelarMap: Record<string, string> = {
    // ===== S3 =====
    "DR": "S-3|Doktor",
    "PHD": "S-3|Doktor",
    "DPHIL": "S-3|Doktor",

    // ===== S2 =====
    "MH": "S-2|Hukum",
    "LLM": "S-2|Hukum",
    "MKN": "S-2|Kenotariatan",
    "MM": "S-2|Manajemen",
    "MSI": "S-2|Ilmu Sosial",
    "MSC": "S-2|Sains",
    "MT": "S-2|Teknik",
    "MKOM": "S-2|Ilmu Komputer",
    "MMSI": "S-2|Sistem Informasi",
    "MIKOM": "S-2|Ilmu Komunikasi",
    "MIL": "S-2|Hukum Internasional",
    "MIR": "S-2|Hubungan Internasional",
    "MAP": "S-2|Administrasi Publik",
    "MTRAP": "S-2|Administrasi Publik",
    "ME": "S-2|Ekonomi",
    "MFARM": "S-2|Farmasi",
    "MHUM": "S-2|Humaniora",
    "MA": "S-2|Humaniora",
    "MPD": "S-2|Pendidikan",
    "MDS": "S-2|Desain",
    "MAK": "S-2|Akuntansi",
    "MIPL": "S-2|Kekayaan Intelektual",
    "MIP": "S-2|Kekayaan Intelektual",

    // ===== S1 =====
    "SH": "S-1|Hukum",
    "ST": "S-1|Teknik",
    "STP": "S-1|Teknologi Pertanian",
    "SKOM": "S-1|Ilmu Komputer",
    "SSI": "S-1|Sains",
    "SE": "S-1|Ekonomi",
    "SSOS": "S-1|Ilmu Sosial",
    "SIP": "S-1|Ilmu Pemerintahan",
    "SIKOM": "S-1|Ilmu Komunikasi",
    "SFARM": "S-1|Farmasi",
    "SP": "S-1|Pertanian",
    "SPI": "S-1|Perikanan",
    "SPD": "S-1|Pendidikan",
    "SHUM": "S-1|Humaniora",
    "SS": "S-1|Sastra",
    "SDS": "S-1|Desain",
    "SSN": "S-1|Seni",
    "SAK": "S-1|Akuntansi",
    "SAP": "S-1|Administrasi Publik",
    "STAT": "S-1|Statistika",
    "SARS": "S-1|Arsitektur",
    "SKM": "S-1|Kesehatan Masyarakat",
    "SIK": "S-1|Kepolisian",
    "SAG": "S-1|Agama",
    "SLING": "S-1|Linguistik",
    "SHUBINT": "S-1|Hubungan Internasional",

    // ===== D4 =====
    "STR": "D-IV|Terapan",
    "SST": "D-IV|Terapan",
    "STRPAR": "D-IV|Pariwisata",
    "STRAB": "D-IV|Administrasi Bisnis",
    "STRPAS": "D-IV|Keimigrasian",

    // ===== D3 =====
    "AMD": "D-III|Diploma",
    "AMDKOM": "D-III|Komputer",
    "AMDAK": "D-III|Akuntansi",
    "AMDPAR": "D-III|Pariwisata",
    "AMDKES": "D-III|Kesehatan",
    "AMDRMIK": "D-III|Rekam Medis",

    // ===== Gelar lama =====
    "IR": "S-1|Teknik",
    "DRS": "S-1|Umum",
    "DRA": "S-1|Umum"
  };

  let found: { gelar: string; nilai: string }[] = [];

  for (let gelar in gelarMap) {
    let regex = new RegExp("\\b" + gelar + "\\b", "g");
    if (regex.test(txt)) {
      found.push({
        gelar: gelar,
        nilai: gelarMap[gelar]
      });
    }
  }

  if (found.length === 0) {
    return { pendidikan: "SLTA", jurusan: "" };
  }

  let hasil = found[found.length - 1].nilai.split("|");
  return { pendidikan: hasil[0], jurusan: hasil[1] };
};

/**
 * Advanced parsing and normalization for Indonesian employee names with academic titles.
 * It corrects spacing, missing commas, missing periods, incorrect title ordering,
 * and extracts the highest education level and study program (jurusan).
 */
export const polishGelarDanNama = (rawInput: string): {
  formattedName: string;
  pendidikan: string;
  jurusan: string;
} => {
  if (!rawInput) {
    return { formattedName: '', pendidikan: '', jurusan: '' };
  }

  // 1. Prepare normalized gelar map for easy lookups
  const lookupMap: Record<string, string> = {};
  const sortedGelarKeys = Object.keys(GELAR_MAP).sort((a, b) => b.length - a.length);
  
  for (const key of sortedGelarKeys) {
    const dotless = key.toLowerCase().replace(/\./g, '');
    lookupMap[dotless] = key;
  }

  // Identify standard front-of-name titles/honorifics
  const frontTitleKeys = new Set(['prof', 'dr', 'drg', 'ir', 'h', 'hj', 'pdt']);

  // 2. Tokenize the entire string by splitting by spaces, commas, semicolons
  const rawTokens = rawInput.split(/[\s,;]+/).filter(Boolean);

  const detectedFront: string[] = [];
  const detectedBack: { key: string; original: string; jenjang: string; bidang: string; weight: number }[] = [];
  const nameParts: string[] = [];

  // Jenjang weights for sorting suffixes
  const jenjangWeight: Record<string, number> = {
    'DIII': 10,
    'DIV': 20,
    'S1': 30,
    'PROFESI': 40,
    'S2': 50,
    'S3': 60,
  };

  for (const token of rawTokens) {
    // Strip trailing dots for temporary checking, but handle special keys with dots too
    const cleanToken = token.toLowerCase().replace(/[.,]/g, '').trim();
    if (!cleanToken) continue;

    // Check if is a known title/degree
    if (lookupMap[cleanToken]) {
      const canonicalKey = lookupMap[cleanToken];
      
      if (frontTitleKeys.has(cleanToken)) {
        // Front title normalization
        if (cleanToken === 'dr') {
          // Keep lowercase 'dr.' if original was 'dr', else 'Dr.'
          if (token.startsWith('dr')) {
            detectedFront.push('dr.');
          } else {
            detectedFront.push('Dr.');
          }
        } else if (cleanToken === 'drg') {
          detectedFront.push('drg.');
        } else {
          // Format with trailing dot if not already there, and capitalize first letter
          detectedFront.push(canonicalKey.endsWith('.') ? canonicalKey : `${canonicalKey}.`);
        }
      } else {
        // Back title / suffix
        const info = GELAR_MAP[canonicalKey];
        const weight = jenjangWeight[info.jenjang] || 20;
        
        // Avoid adding duplicate suffixes
        if (!detectedBack.some(item => item.key === canonicalKey)) {
          detectedBack.push({
            key: canonicalKey,
            original: token,
            jenjang: info.jenjang,
            bidang: info.bidang,
            weight: weight
          });
        }
      }
    } else {
      // It is part of the person's name (convert to UPPERCASE)
      nameParts.push(token.toUpperCase());
    }
  }

  // Fallback: If absolutely no name parts were detected, treat whole input as name
  if (nameParts.length === 0) {
    return { formattedName: rawInput.toUpperCase(), pendidikan: '', jurusan: '' };
  }

  // Reconstruct components:
  const frontPrefix = detectedFront.length > 0 ? detectedFront.join(' ') : '';
  const mainName = nameParts.join(' ');

  // Suffixes: sort them by level (lowest to highest) according to weight
  detectedBack.sort((a, b) => a.weight - b.weight);

  // Back titles formatted in clean canonical format with dots (e.g. "S.T., M.Kom.")
  const formattedBackList = detectedBack.map(item => {
    let finalKey = item.key;
    // Standardize dots in Indonesian titles (e.g. S.T., S.H., M.Kom., A.Md.)
    if (finalKey.toLowerCase() === 'sh' || finalKey.toLowerCase() === 's.h') finalKey = 'S.H.';
    else if (finalKey.toLowerCase() === 'st' || finalKey.toLowerCase() === 's.t') finalKey = 'S.T.';
    else if (finalKey.toLowerCase() === 'se' || finalKey.toLowerCase() === 's.e') finalKey = 'S.E.';
    else if (finalKey.toLowerCase() === 'mm' || finalKey.toLowerCase() === 'm.m') finalKey = 'M.M.';
    else if (finalKey.toLowerCase() === 'mh' || finalKey.toLowerCase() === 'm.h') finalKey = 'M.H.';
    else if (finalKey.toLowerCase() === 'mt' || finalKey.toLowerCase() === 'm.t') finalKey = 'M.T.';
    else if (finalKey.toLowerCase() === 'msi' || finalKey.toLowerCase() === 'm.si') finalKey = 'M.Si.';
    else if (finalKey.toLowerCase() === 'skom' || finalKey.toLowerCase() === 's.kom') finalKey = 'S.Kom.';
    else if (finalKey.toLowerCase() === 'mkom' || finalKey.toLowerCase() === 'm.kom') finalKey = 'M.Kom.';
    else if (finalKey.toLowerCase() === 'spd' || finalKey.toLowerCase() === 's.pd') finalKey = 'S.Pd.';
    
    // Add dot if missing at the end for other degrees
    if (!finalKey.endsWith('.') && !['MMSI', 'MSE', 'MA', 'AMK', 'PK', 'Bc.IP'].includes(finalKey)) {
      finalKey = `${finalKey}.`;
    }
    return finalKey;
  });

  const suffixPart = formattedBackList.length > 0 ? `, ${formattedBackList.join(', ')}` : '';

  // Combine to make complete formatted name
  const formattedName = frontPrefix ? `${frontPrefix} ${mainName}${suffixPart}` : `${mainName}${suffixPart}`;

  // 3. Extract study program (jurusan) and education level (pendidikan) using PENDIDIKAN custom matches
  let eduLevel = '';
  let studyProgram = '';

  const userEduValue = resolveUserPendidikan(rawInput);
  if (userEduValue) {
    eduLevel = userEduValue.pendidikan;
    studyProgram = userEduValue.jurusan;
  } else {
    // Fallback to highest back title if no custom match
    if (detectedBack.length > 0) {
      const highestItem = detectedBack[detectedBack.length - 1];
      
      if (highestItem.jenjang === 'S3') eduLevel = 'S-3';
      else if (highestItem.jenjang === 'S2') eduLevel = 'S-2';
      else if (highestItem.jenjang === 'S1') eduLevel = 'S-1';
      else if (highestItem.jenjang === 'DIV') eduLevel = 'D-IV';
      else if (highestItem.jenjang === 'DIII') eduLevel = 'D-III';
      else if (highestItem.jenjang === 'PROFESI') eduLevel = 'Profesi';
      else eduLevel = highestItem.jenjang;

      studyProgram = highestItem.bidang || '';
    } else if (detectedFront.some(p => p.toLowerCase().startsWith('dr.'))) {
      eduLevel = 'S-3';
      studyProgram = 'Doktor';
    }
  }

  // Capitalize study program (jurusan) elegantly
  if (studyProgram) {
    studyProgram = studyProgram.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
    }).trim();
  }

  return {
    formattedName,
    pendidikan: eduLevel,
    jurusan: studyProgram
  };
};

/**
 * Helper to format Pegawai Name correctly:
 * Preserves the exact name and academic titles (gelar) as stored in the database.
 */
export const formatPegawaiName = (nama: string): string => {
  if (!nama) return '';
  return nama.trim();
};

/**
 * Resolusi otomatis Pendidikan berdasarkan Gelar
 */
export const resolveEducationInfo = (input: string): { bidang: string, jenjang: string, display: string } | null => {
  if (!input) return null;
  const sortedKeys = Object.keys(GELAR_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (input.includes(key)) {
      const data = GELAR_MAP[key];
      return { 
        ...data, 
        display: `${data.jenjang} ${data.bidang}`.toUpperCase() 
      };
    }
  }
  return null;
};

export const PANGKAT_MAP: Record<string, string> = {
  'I/a': 'Juru Muda', 'I/b': 'Juru Muda Tingkat I', 'I/c': 'Juru', 'I/d': 'Juru Tingkat I',
  'II/a': 'Pengatur Muda', 'II/b': 'Pengatur Muda Tingkat I', 'II/c': 'Pengatur', 'II/d': 'Pengatur Tingkat I',
  'III/a': 'Penata Muda', 'III/b': 'Penata Muda Tingkat I', 'III/c': 'Penata', 'III/d': 'Penata Tingkat I',
  'IV/a': 'Pembina', 'IV/b': 'Pembina Tingkat I', 'IV/c': 'Pembina Utama Muda', 'IV/d': 'Pembina Utama Madya', 'IV/e': 'Pembina Utama'
};

export const getPangkatFromGol = (gol: string): string => PANGKAT_MAP[gol] || '-';

export const AK_KOEFISIEN: Record<string, number> = {
  'AHLI UTAMA': 50, 'AHLI MADYA': 37.5, 'AHLI MUDA': 25, 'AHLI PERTAMA': 12.5,
  'PENYELIA': 25, 'MAHIR': 12.5, 'TERAMPIL': 5, 'PEMULA': 3.75
};

export const PREDIKAT_MULTIPLIER: Record<string, number> = {
  'Sangat Baik': 1.5, 'Baik': 1.0, 'Butuh Perbaikan': 0.75, 'Kurang': 0.5, 'Sangat Kurang': 0.25
};

export const TASK_LABELS: Record<string, string> = {
  [TaskType.PELANTIKAN]: 'Pelantikan', [TaskType.APEL]: 'Apel Pegawai', [TaskType.LHKPN]: 'LHKPN', [TaskType.LHKASN]: 'LHKASN',
  [TaskType.TUGAS_BELAJAR]: 'Tugas Belajar', [TaskType.MAGANG]: 'Magang', [TaskType.PENELITIAN]: 'Penelitian',
  [TaskType.SATYA_LENCANA]: 'Satya Lencana', [TaskType.GELAR]: 'Pencantuman Gelar', [TaskType.PANGKAT]: 'Kenaikan Pangkat',
  [TaskType.JENJANG]: 'Kenaikan Jenjang', [TaskType.GAJI]: 'Pengelolaan Gaji', [TaskType.MUTASI]: 'Mutasi Pegawai',
  [TaskType.KARTU_SUAMI_ISTRI]: 'Kartu Suami/Istri', [TaskType.KARTU_BPJS]: 'Kartu BPJS', [TaskType.CUTI]: 'Cuti Pegawai',
  [TaskType.SPMT_SPP]: 'SPMT / SPP', [TaskType.ABSENSI]: 'Absensi Pegawai', [TaskType.PERKAWINAN]: 'Perkawinan/Perceraian',
  [TaskType.HUKUMAN]: 'Hukuman Disiplin', [TaskType.PENSIUN]: 'Usulan Pensiun', [TaskType.GRATIFIKASI]: 'Gratifikasi', [TaskType.KGB]: 'KGB',
  [TaskType.UANG_MAKAN]: 'Uang Makan'
};

export const getGajiEstimasi = (gol: string, mk: number): number => {
  const baseSalaries: Record<string, number> = {
    'I/a': 1685700, 'I/b': 1840800, 'I/c': 1918700, 'I/d': 1999900,
    'II/a': 2184000, 'II/b': 2385000, 'II/c': 2485900, 'II/d': 2591100,
    'III/a': 2785700, 'III/b': 2903600, 'III/c': 3026400, 'III/d': 3154400,
    'IV/a': 3287800, 'IV/b': 3426900, 'IV/c': 3571900, 'IV/d': 3723000, 'IV/e': 3880400
  };
  const base = baseSalaries[gol] || 1600000;
  return Math.round(base * (1 + (mk * 0.025)));
};

export const APP_ROUTES = [
  { path: '/', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
  { path: '/pegawai', label: 'Database Pegawai', icon: 'bi-person-vcard-fill' },
  { path: '/tupoksi-sdm', label: 'Matriks Tupoksi SDM', icon: 'bi-kanban-fill' },
  { path: '/layanan', label: 'Katalog Layanan & Modul', icon: 'bi-briefcase-fill' },
  { path: '/persuratan', label: 'Persuratan Digital', icon: 'bi-envelope-paper-fill' },
  { path: '/tugas-rutin', label: 'Log Tugas Rutin', icon: 'bi-clipboard2-check-fill' },
  { path: '/kegiatan', label: 'Kalender Kegiatan', icon: 'bi-calendar2-event-fill' },
  { path: '/laporan', label: 'Laporan Eksekutif Pegawai', icon: 'bi-file-earmark-bar-graph-fill' },
  { path: '/anggaran-dipa', label: 'Anggaran & DIPA SDM', icon: 'bi-wallet2' },
  { path: '/sakip-rb', label: 'SAKIP & LKE RB SDM', icon: 'bi-ui-checks' },
  { path: '/disiplin-lhkpn', label: 'Disiplin & LHKPN/LHKASN', icon: 'bi-shield-slash' },
  { path: '/keuangan', label: 'SPJ & Pertanggungjawaban', icon: 'bi-cash-stack' },
  { path: '/dossiers', label: 'E-Dossier Digital', icon: 'bi-folder-fill' },
  { path: '/absensi-online', label: 'Absensi Wajah', icon: 'bi-camera-fill' },
  { path: '/rekap-absensi', label: 'Rekapitulasi Absensi', icon: 'bi-clipboard-data-fill' },
  { path: '/uang-makan', label: 'Admin Uang Makan', icon: 'bi-cash-coin' },
  { path: '/settings', label: 'Pengaturan Sistem', icon: 'bi-gear-wide-connected' },
  { path: '/logs', label: 'Audit Logs', icon: 'bi-clock-history' },
  { path: '/skp', label: 'E-Kinerja SKP', icon: 'bi-file-earmark-text' },
  { path: '/pak', label: 'Angka Kredit (PAK)', icon: 'bi-file-earmark-medical' },
  { path: '/anjab-abk', label: 'ANJAB & ABK Formasi', icon: 'bi-diagram-3' },
  { path: '/pelantikan-gen', label: 'Berita Acara Pelantikan', icon: 'bi-file-earmark-person' },
  { path: '/spmt-spp', label: 'SPMT & SPP Pelantikan', icon: 'bi-file-earmark-check' },
  { path: '/kgb-gen', label: 'KGB Generator', icon: 'bi-cash' },
  { path: '/pensiun', label: 'Pensiun & DPCP', icon: 'bi-door-open' },
  { path: '/kenaikan-pangkat', label: 'Kenaikan Pangkat (6 Periode)', icon: 'bi-graph-up-arrow' },
  { path: '/satya-lencana', label: 'Satya Lencana', icon: 'bi-award' },
  { path: '/magang-pkl', label: 'Magang, PKL & Tubel/Ibel', icon: 'bi-mortarboard' },
  { path: '/pengembangan', label: 'Bangkom & 20 JP ASN', icon: 'bi-book' },
  { path: '/talenta', label: '9-Box Manajemen Talenta', icon: 'bi-star-half' },
  { path: '/ukom/admin', label: 'Admin UKOM (CAT)', icon: 'bi-pc-display-horizontal' },
  { path: '/ukom/supervisor', label: 'Pengawas UKOM', icon: 'bi-shield-check' },
  { path: '/ukom/login', label: 'Portal Ujian UKOM', icon: 'bi-pencil-square' },
  { path: '/quizdjki', label: 'QuizDJKI (Game)', icon: 'bi-controller' },
  { path: '/layanan-sdm', label: 'Layanan SDM KI (Helpdesk)', icon: 'bi-headset' },
  { path: '/layanan-sdm/pengajuan-saya', label: 'Pengajuan Saya (SDM)', icon: 'bi-inboxes-fill' },
  { path: '/admin/layanan-sdm', label: 'Admin Layanan SDM', icon: 'bi-shield-check' },
  { path: '/presensi', label: 'Presensi Online (Smart)', icon: 'bi-camera-video-fill' },
  { path: '/face-registration', label: 'Registrasi Wajah Pegawai', icon: 'bi-person-bounding-box' },
  { path: '/admin/attendance', label: 'Monitoring Presensi', icon: 'bi-bar-chart-fill' },
  { path: '/admin/attendance/locations', label: 'Master Lokasi Geofence', icon: 'bi-geo-alt-fill' },
  { path: '/admin/attendance/settings', label: 'Pengaturan Presensi', icon: 'bi-sliders' }
];
