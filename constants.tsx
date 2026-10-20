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

export const normalizeUnitName = (rawUnit?: string, rawBagian?: string, rawJabatan?: string): string => {
  const u = (rawUnit || '').toLowerCase().trim();
  const b = (rawBagian || '').toLowerCase().trim();
  const j = (rawJabatan || '').toLowerCase().trim();
  const combined = `${u} ${b} ${j}`.trim();
  if (!combined) return 'LAINNYA';

  // 1. Pimpinan Tinggi Madya / Dirjen DJKI (Bukan bagian dari Sekretariat / Eselon II)
  if (
    j.includes('direktur jenderal kekayaan intelektual') || j === 'dirjen' || j.startsWith('direktur jenderal') ||
    j.includes('staf khusus') || j.includes('staf ahli') ||
    ((u === 'direktorat jenderal kekayaan intelektual' || u === 'djki') && !b && !j.includes('sekretaris') && !j.includes('direktur') && !j.includes('kepala') && !combined.includes('sekretariat') && !combined.includes('cipta') && !combined.includes('paten') && !combined.includes('merek') && !combined.includes('kerja sama') && !combined.includes('ti') && !combined.includes('penegakan hukum'))
  ) {
    return 'Pimpinan DJKI';
  }

  // 2. Direktorat Teknis Spesifik (Prioritas tinggi sebelum Sekretariat umum agar unit teknis tidak ketarik)
  if (combined.includes('cipta') || combined.includes('desain industri')) return UNIT_KERJA[1];
  if (combined.includes('paten') || combined.includes('dtlst') || combined.includes('sirkuit terpadu') || combined.includes('rahasia dagang')) return UNIT_KERJA[2];
  if (combined.includes('merek') || combined.includes('merk') || combined.includes('indikasi geografis')) return UNIT_KERJA[3];
  if (combined.includes('kerjasama') || combined.includes('kerja sama') || combined.includes('pemberdayaan') || combined.includes('edukasi')) return UNIT_KERJA[4];
  if (combined.includes('teknologi informasi') || /\b(ti|tik)\b/i.test(combined) || combined.includes('sistem informasi') || combined.includes('infrastruktur tik')) return UNIT_KERJA[5];
  if (combined.includes('penyidikan') || combined.includes('sengketa') || combined.includes('penegakan hukum') || combined.includes('gakkum') || combined.includes('penindakan')) return UNIT_KERJA[6];

  // 3. Sekretariat Direktorat Jenderal Kekayaan Intelektual
  // Termasuk bagian-bagian di bawah Sekretariat: Bagian Umum, Kepegawaian, Keuangan, Program & Pelaporan
  if (
    combined.includes('sekretariat') || combined.includes('setditjen') || combined.includes('sesditjen') ||
    combined.includes('bagian umum') || combined.includes('bagian kepegawaian') || combined.includes('bagian keuangan') || combined.includes('bagian program') ||
    combined.includes('program dan pelaporan') || combined.includes('program & pelaporan') || combined.includes('evaluasi dan pelaporan') ||
    combined.includes('kepegawaian') || combined.includes('sdm') ||
    combined.includes('pelaksanaan anggaran') || combined.includes('perbendaharaan') || combined.includes('akuntansi dan pelaporan') ||
    combined.includes('protokol') || combined.includes('rumah tangga') || combined.includes('pengelolaan bmn') || combined.includes('layanan pengadaan')
  ) {
    return UNIT_KERJA[0];
  }

  // 4. Exact / Safe prefix match: Cocokkan hanya jika nama unit pengguna mengandung nama resmi UNIT_KERJA
  for (const uk of UNIT_KERJA) {
    const ukLower = uk.toLowerCase();
    if (u === ukLower || u.startsWith(ukLower) || u.includes(ukLower)) {
      return uk;
    }
  }

  if (u === 'direktorat jenderal kekayaan intelektual' || u === 'djki' || u === 'ditjen ki') {
    return 'Pimpinan DJKI';
  }

  return 'LAINNYA';
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
  'Pdt.': { bidang: 'Pendeta', jenjang: 'GELAR_KEAGAMAAN' }
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
    "DR": "S3|Doktor",
    "PHD": "S3|Doktor",
    "DPHIL": "S3|Doktor",

    // ===== S2 =====
    "MH": "S2|Hukum",
    "LLM": "S2|Hukum",
    "MKN": "S2|Kenotariatan",
    "MM": "S2|Manajemen",
    "MSI": "S2|Ilmu Sosial",
    "MSC": "S2|Sains",
    "MT": "S2|Teknik",
    "MKOM": "S2|Ilmu Komputer",
    "MMSI": "S2|Sistem Informasi",
    "MIKOM": "S2|Ilmu Komunikasi",
    "MIL": "S2|Hukum Internasional",
    "MIR": "S2|Hubungan Internasional",
    "MAP": "S2|Administrasi Publik",
    "MTRAP": "S2|Administrasi Publik",
    "ME": "S2|Ekonomi",
    "MFARM": "S2|Farmasi",
    "MHUM": "S2|Humaniora",
    "MA": "S2|Humaniora",
    "MPD": "S2|Pendidikan",
    "MDS": "S2|Desain",
    "MAK": "S2|Akuntansi",
    "MIPL": "S2|Kekayaan Intelektual",
    "MIP": "S2|Kekayaan Intelektual",

    // ===== S1 =====
    "SH": "S1|Hukum",
    "ST": "S1|Teknik",
    "STP": "S1|Teknologi Pertanian",
    "SKOM": "S1|Ilmu Komputer",
    "SSI": "S1|Sains",
    "SE": "S1|Ekonomi",
    "SSOS": "S1|Ilmu Sosial",
    "SIP": "S1|Ilmu Pemerintahan",
    "SIKOM": "S1|Ilmu Komunikasi",
    "SFARM": "S1|Farmasi",
    "SP": "S1|Pertanian",
    "SPI": "S1|Perikanan",
    "SPD": "S1|Pendidikan",
    "SHUM": "S1|Humaniora",
    "SS": "S1|Sastra",
    "SDS": "S1|Desain",
    "SSN": "S1|Seni",
    "SAK": "S1|Akuntansi",
    "SAP": "S1|Administrasi Publik",
    "STAT": "S1|Statistika",
    "SARS": "S1|Arsitektur",
    "SKM": "S1|Kesehatan Masyarakat",
    "SIK": "S1|Kepolisian",
    "SAG": "S1|Agama",
    "SLING": "S1|Linguistik",
    "SHUBINT": "S1|Hubungan Internasional",

    // ===== D4 =====
    "STR": "DIV|Terapan",
    "SST": "DIV|Terapan",
    "STRPAR": "DIV|Pariwisata",
    "STRAB": "DIV|Administrasi Bisnis",
    "STRPAS": "DIV|Keimigrasian",

    // ===== D3 =====
    "AMD": "DIII|Diploma",
    "AMDKOM": "DIII|Komputer",
    "AMDAK": "DIII|Akuntansi",
    "AMDPAR": "DIII|Pariwisata",
    "AMDKES": "DIII|Kesehatan",
    "AMDRMIK": "DIII|Rekam Medis",

    // ===== Gelar lama =====
    "IR": "S1|Teknik",
    "DRS": "S1|Umum",
    "DRA": "S1|Umum"
  };

  const found: { gelar: string; nilai: string }[] = [];

  for (const gelar in gelarMap) {
    const regex = new RegExp("\\b" + gelar + "\\b", "g");
    if (regex.test(txt)) {
      found.push({
        gelar: gelar,
        nilai: gelarMap[gelar]
      });
    }
  }

  if (found.length === 0) {
    return { pendidikan: "SMA/SMU/SMK", jurusan: "" };
  }

  const hasil = found[found.length - 1].nilai.split("|");
  return { pendidikan: hasil[0], jurusan: hasil[1] };
};

export const DEGREE_MAP_DATA: Record<string, { jenjang: string; jurusan: string; weight: number }> = {
  // S3
  "DR": { jenjang: "S3", jurusan: "Doktor", weight: 90 },
  "PHD": { jenjang: "S3", jurusan: "Doktor", weight: 90 },
  "DPHIL": { jenjang: "S3", jurusan: "Doktor", weight: 90 },

  // S2
  "MH": { jenjang: "S2", jurusan: "Ilmu Hukum", weight: 80 },
  "LLM": { jenjang: "S2", jurusan: "Ilmu Hukum", weight: 80 },
  "MKN": { jenjang: "S2", jurusan: "Kenotariatan", weight: 80 },
  "MM": { jenjang: "S2", jurusan: "Manajemen", weight: 80 },
  "MSI": { jenjang: "S2", jurusan: "Ilmu Sosial", weight: 80 },
  "MSC": { jenjang: "S2", jurusan: "Sains", weight: 80 },
  "MT": { jenjang: "S2", jurusan: "Teknik", weight: 80 },
  "MKOM": { jenjang: "S2", jurusan: "Ilmu Komputer", weight: 80 },
  "MMSI": { jenjang: "S2", jurusan: "Sistem Informasi", weight: 80 },
  "MIKOM": { jenjang: "S2", jurusan: "Ilmu Komunikasi", weight: 80 },
  "MAP": { jenjang: "S2", jurusan: "Administrasi Publik", weight: 80 },
  "MTRAP": { jenjang: "S2", jurusan: "Administrasi Publik", weight: 80 },
  "ME": { jenjang: "S2", jurusan: "Ekonomi", weight: 80 },
  "MSE": { jenjang: "S2", jurusan: "Ekonomi", weight: 80 },
  "MFARM": { jenjang: "S2", jurusan: "Farmasi", weight: 80 },
  "MHUM": { jenjang: "S2", jurusan: "Humaniora", weight: 80 },
  "MA": { jenjang: "S2", jurusan: "Humaniora", weight: 80 },
  "MPD": { jenjang: "S2", jurusan: "Pendidikan", weight: 80 },
  "MDS": { jenjang: "S2", jurusan: "Desain", weight: 80 },
  "MAK": { jenjang: "S2", jurusan: "Akuntansi", weight: 80 },
  "MIPL": { jenjang: "S2", jurusan: "Kekayaan Intelektual", weight: 80 },
  "MIP": { jenjang: "S2", jurusan: "Ilmu Pemerintahan", weight: 80 },
  "MP": { jenjang: "S2", jurusan: "Pertanian", weight: 80 },

  // Profesi
  "APT": { jenjang: "S1", jurusan: "Farmasi / Apoteker", weight: 75 },
  "NS": { jenjang: "S1", jurusan: "Keperawatan", weight: 75 },
  "DRG": { jenjang: "S1", jurusan: "Kedokteran Gigi", weight: 75 },
  "DOKTER": { jenjang: "S1", jurusan: "Kedokteran", weight: 75 },

  // S1
  "SH": { jenjang: "S1", jurusan: "Ilmu Hukum", weight: 70 },
  "ST": { jenjang: "S1", jurusan: "Teknik", weight: 70 },
  "STP": { jenjang: "S1", jurusan: "Teknologi Pertanian", weight: 70 },
  "SKOM": { jenjang: "S1", jurusan: "Ilmu Komputer", weight: 70 },
  "SSI": { jenjang: "S1", jurusan: "Sains", weight: 70 },
  "SE": { jenjang: "S1", jurusan: "Ekonomi", weight: 70 },
  "SSOS": { jenjang: "S1", jurusan: "Ilmu Sosial", weight: 70 },
  "SIP": { jenjang: "S1", jurusan: "Ilmu Pemerintahan", weight: 70 },
  "SIKOM": { jenjang: "S1", jurusan: "Ilmu Komunikasi", weight: 70 },
  "SFARM": { jenjang: "S1", jurusan: "Farmasi", weight: 70 },
  "SP": { jenjang: "S1", jurusan: "Pertanian", weight: 70 },
  "SPI": { jenjang: "S1", jurusan: "Perikanan", weight: 70 },
  "SPD": { jenjang: "S1", jurusan: "Pendidikan", weight: 70 },
  "SHUM": { jenjang: "S1", jurusan: "Humaniora", weight: 70 },
  "SS": { jenjang: "S1", jurusan: "Sastra", weight: 70 },
  "SDS": { jenjang: "S1", jurusan: "Desain", weight: 70 },
  "SSN": { jenjang: "S1", jurusan: "Seni", weight: 70 },
  "SAK": { jenjang: "S1", jurusan: "Akuntansi", weight: 70 },
  "SAP": { jenjang: "S1", jurusan: "Administrasi Publik", weight: 70 },
  "STAT": { jenjang: "S1", jurusan: "Statistika", weight: 70 },
  "SARS": { jenjang: "S1", jurusan: "Arsitektur", weight: 70 },
  "SKM": { jenjang: "S1", jurusan: "Kesehatan Masyarakat", weight: 70 },
  "SIK": { jenjang: "S1", jurusan: "Kepolisian", weight: 70 },
  "SAG": { jenjang: "S1", jurusan: "Agama", weight: 70 },
  "SLING": { jenjang: "S1", jurusan: "Linguistik", weight: 70 },
  "SHI": { jenjang: "S1", jurusan: "Hukum Islam", weight: 70 },
  "SSY": { jenjang: "S1", jurusan: "Syariah", weight: 70 },
  "SM": { jenjang: "S1", jurusan: "Manajemen", weight: 70 },
  "SBNS": { jenjang: "S1", jurusan: "Bisnis", weight: 70 },
  "SPSI": { jenjang: "S1", jurusan: "Psikologi", weight: 70 },
  "IR": { jenjang: "S1", jurusan: "Teknik", weight: 70 },
  "DRS": { jenjang: "S1", jurusan: "Umum", weight: 70 },
  "DRA": { jenjang: "S1", jurusan: "Umum", weight: 70 },

  // D4
  "STR": { jenjang: "DIV", jurusan: "Terapan", weight: 65 },
  "STRPAS": { jenjang: "DIV", jurusan: "Keimigrasian", weight: 65 },
  "STRKOM": { jenjang: "DIV", jurusan: "Teknik Informatika", weight: 65 },
  "STRIKOM": { jenjang: "DIV", jurusan: "Ilmu Komunikasi", weight: 65 },
  "STRAB": { jenjang: "DIV", jurusan: "Administrasi Bisnis", weight: 65 },
  "STRPAR": { jenjang: "DIV", jurusan: "Pariwisata", weight: 65 },
  "SST": { jenjang: "DIV", jurusan: "Terapan", weight: 65 },

  // D3
  "AMD": { jenjang: "DIII", jurusan: "Diploma", weight: 50 },
  "AMDKOM": { jenjang: "DIII", jurusan: "Komputer", weight: 50 },
  "AMDAK": { jenjang: "DIII", jurusan: "Akuntansi", weight: 50 },
  "AMDPAR": { jenjang: "DIII", jurusan: "Pariwisata", weight: 50 },
  "AMDKES": { jenjang: "DIII", jurusan: "Kesehatan", weight: 50 },
  "AMDRMIK": { jenjang: "DIII", jurusan: "Rekam Medis", weight: 50 },
  "AMK": { jenjang: "DIII", jurusan: "Keperawatan", weight: 50 }
};

export const STANDARD_JENJANG_LIST = [
  'SD',
  'SMP/SLTP',
  'SMA/SMU/SMK',
  'DIII',
  'DIV',
  'S1',
  'S2',
  'S3'
] as const;

export type StandardJenjang = typeof STANDARD_JENJANG_LIST[number];

export const JENJANG_PENDIDIKAN_LIST = STANDARD_JENJANG_LIST;

export const normalizeStandardJenjang = (val?: any): StandardJenjang | string => {
  if (val === undefined || val === null) return '';
  const raw = String(val).trim();
  if (!raw) return '';
  if ((STANDARD_JENJANG_LIST as readonly string[]).includes(raw)) return raw as StandardJenjang;

  const upper = raw.toUpperCase();
  const s = upper.replace(/[^A-Z0-9]/g, '');
  if (!s) return '';

  // 1. Direct standard matches
  if (s === 'SD') return 'SD';
  if (s === 'SMPSLTP' || s === 'SMP' || s === 'SLTP') return 'SMP/SLTP';
  if (s === 'SMASMUSMK' || s === 'SMASMK' || s === 'SMA' || s === 'SMU' || s === 'SMK' || s === 'SLTA') return 'SMA/SMU/SMK';
  if (s === 'DIII' || s === 'D3') return 'DIII';
  if (s === 'DIV' || s === 'D4') return 'DIV';
  if (s === 'S1') return 'S1';
  if (s === 'S2') return 'S2';
  if (s === 'S3') return 'S3';

  // Multi-degree combined forms (e.g. D4/S1, S1/D4) - normalize to S1 by default
  if (s.includes('D4S1') || s.includes('S1D4')) return 'S1';

  // S3 / Doktor
  if (
    s === 'S3' || s.startsWith('S3') || s.startsWith('STRATA3') || s.startsWith('STRATAIII') ||
    s.includes('DOKTOR') || s.includes('DOCTOR') || s.includes('PHD') || s.includes('DPHIL') ||
    s.includes('SUBSPESIALIS') || s.includes('SP2') || s === 'DR'
  ) {
    return 'S3';
  }

  // S2 / Magister
  if (
    s === 'S2' || s.startsWith('S2') || s.startsWith('STRATA2') || s.startsWith('STRATAII') ||
    s.includes('MAGISTER') || s.includes('MASTER') || s.includes('PASCASARJANA') ||
    s.includes('PASCA') || s.includes('POSTGRADUATE') || s.includes('SP1') ||
    s === 'MM' || s === 'MH' || s === 'MKOM' || s === 'MT' || s === 'MSI' || s === 'MPD' ||
    s === 'MSC' || s === 'MENG' || s === 'MAP' || s === 'MAB' || s === 'MAG' || s === 'MKES' ||
    s === 'MKN' || s === 'MLS' || s === 'LLM' || s === 'MBA' || s === 'MPH'
  ) {
    return 'S2';
  }

  // S1 / Strata 1 explicitly checked before generic STR
  if (
    s === 'S1' || s.startsWith('S1') || s.startsWith('STRATA1') || s.startsWith('STRATAI') ||
    (s.includes('SARJANA') && !s.includes('TERAPAN') && !s.includes('MUDA')) ||
    s.includes('BACHELOR') || s.includes('UNDERGRADUATE') ||
    s.includes('PROFESI') || s.includes('APOTEKER') || s.includes('NERS') ||
    s === 'SH' || s === 'SE' || s === 'SKOM' || s === 'ST' || s === 'SSI' || s === 'SPD' ||
    s === 'SSOS' || s === 'SIP' || s === 'SKED' || s === 'SPSI' || s === 'SFARM' ||
    s === 'SSN' || s === 'SS' || s === 'SPT' || s === 'SPI' || s === 'SP' || s === 'SAP' || s === 'SAB' || s === 'SHUM'
  ) {
    return 'S1';
  }

  // DIV / D4 / Sarjana Terapan
  if (
    s === 'DIV' || s === 'D4' || s === 'DIVTERAPAN' || s.startsWith('DIV') || s.startsWith('D4') ||
    s.includes('DIPLOMA4') || s.includes('DIPLOMAIV') || s.includes('SARJANATERAPAN') ||
    s === 'STR' || (s.startsWith('STR') && !s.startsWith('STRATA')) ||
    (s.includes('TERAPAN') && !s.includes('SMK'))
  ) {
    return 'DIV';
  }

  // DIII / D3 (including early diplomas DI, DII)
  if (
    s === 'DIII' || s === 'D3' || s.startsWith('DIII') || s.startsWith('D3') ||
    s.includes('DIPLOMA3') || s.includes('DIPLOMAIII') || s.includes('AHLIMADYA') ||
    s.includes('SARJANAMUDA') || s.includes('AKADEMI') || s === 'AMD' || s.startsWith('AMD') ||
    s === 'D2' || s === 'DII' || s.startsWith('D2') || s.startsWith('DII') || s.includes('DIPLOMA2') || s.includes('DIPLOMAII') ||
    s === 'D1' || s === 'DI' || s.startsWith('D1') || s.startsWith('DI') || s.includes('DIPLOMA1') || s.includes('DIPLOMAI')
  ) {
    return 'DIII';
  }

  // SD (prioritized to avoid MI misclassification)
  if (
    s === 'SD' || s.startsWith('SDN') || s.startsWith('SD') || s.includes('SEKOLAHDASAR') ||
    s.includes('IBTIDAIYAH') || s === 'MI' || s.startsWith('MI') || s.includes('PAKETA') ||
    (s.includes('DASAR') && !s.includes('DIKDAS'))
  ) {
    return 'SD';
  }

  // SMP/SLTP
  if (
    s === 'SMP' || s === 'SLTP' || s === 'SMPSLTP' ||
    s.includes('SLTP') || s.includes('SMP') || s.includes('MTS') || s.includes('TSANAWIYAH') ||
    s.includes('PAKETB') || s.includes('DIKDAS') || s.includes('MENENGAHPERTAMA')
  ) {
    return 'SMP/SLTP';
  }

  // SMA/SMU/SMK / SLTA
  if (
    s === 'SMA' || s === 'SMK' || s === 'SMU' || s === 'SLTA' || s === 'SMASMUSMK' || s === 'SMASMK' ||
    s.includes('SLTA') || s.includes('SMA') || s.includes('SMK') || s.includes('SMU') ||
    s.includes('ALIYAH') || s === 'MA' || s.startsWith('MAN') || s.includes('STM') || s.includes('SMEA') ||
    s.includes('SPK') || s.includes('KPAA') || s.includes('KPG') || s.includes('SPG') || s.includes('PGA') ||
    s.includes('PAKETC') || s.includes('DIKMEN') || s.includes('MENENGAHATAS') || s.includes('MENENGAHKEJURUAN')
  ) {
    return 'SMA/SMU/SMK';
  }

  return raw;
};

export const degreeWeight = (jenjangStr?: any): number => {
  if (!jenjangStr) return 0;
  const std = normalizeStandardJenjang(jenjangStr);
  if (std === 'S3') return 90;
  if (std === 'S2') return 80;
  if (std === 'S1') return 70;
  if (std === 'DIV') return 65;
  if (std === 'DIII') return 50;
  if (std === 'SMA/SMU/SMK') return 20;
  if (std === 'SMP/SLTP') return 10;
  if (std === 'SD') return 5;
  return 15;
};

/**
 * Resolusi pendidikan dan jurusan berdasarkan gelar terakhir di nama pegawai.
 */
export const resolveFromGelarTerakhir = (nameWithGelar: string): { pendidikan: string; jurusan: string } | null => {
  if (!nameWithGelar) return null;
  const cleanStr = String(nameWithGelar).trim();
  const hasDrFront = /^(prof\.?\s+)?dr\.?\s+/i.test(cleanStr);
  const hasIrFront = /^(prof\.?\s+)?ir\.?\s+/i.test(cleanStr);
  const hasDrsFront = /^(prof\.?\s+)?(drs|dra)\.?\s+/i.test(cleanStr);

  const commaIdx = cleanStr.indexOf(",");
  let backTokens: string[] = [];
  if (commaIdx !== -1) {
    const afterComma = cleanStr.substring(commaIdx + 1);
    backTokens = afterComma.split(/[\s,;]+/).map(t => t.replace(/[^A-Za-z]/g, "").toUpperCase()).filter(Boolean);
  } else {
    // If no comma, check individual words from the string for known degree tokens
    const words = cleanStr.split(/[\s,;]+/).map(t => t.replace(/[^A-Za-z]/g, "").toUpperCase()).filter(Boolean);
    backTokens = words.filter(w => DEGREE_MAP_DATA[w]);
  }

  const matched: { jenjang: string; jurusan: string; weight: number }[] = [];
  for (const token of backTokens) {
    if (DEGREE_MAP_DATA[token]) {
      matched.push(DEGREE_MAP_DATA[token]);
    }
  }

  if (matched.length > 0) {
    const lastDegree = matched[matched.length - 1]; // Gelar Terakhir
    if (hasDrFront && lastDegree.weight < 90) {
      return { pendidikan: "S3", jurusan: lastDegree.jurusan ? `Doktor / ${lastDegree.jurusan}` : "Doktor" };
    }
    return { pendidikan: normalizeStandardJenjang(lastDegree.jenjang) || lastDegree.jenjang, jurusan: lastDegree.jurusan };
  }

  if (hasDrFront) {
    return { pendidikan: "S3", jurusan: "Doktor" };
  }
  if (hasIrFront) {
    return { pendidikan: "S1", jurusan: "Teknik" };
  }
  if (hasDrsFront) {
    return { pendidikan: "S1", jurusan: "Umum" };
  }

  return null;
};

export const alignEducationRow = (row: any): any => {
  if (!row) return row;
  let jenjang = (row.jenjang || '').trim();
  let institusi = (row.institusi || row.namaSekolah || '').trim();
  let jurusan = (row.jurusan || '').trim();
  let tahunLulus = (row.tahunLulus || '').trim();
  let nomorIjazah = (row.nomorIjazah || '').trim();
  let tanggalIjazah = (row.tanggalIjazah || '').trim();
  let alamatSekolah = (row.alamatSekolah || '').trim();
  let kepalaSekolah = (row.kepalaSekolah || '').trim();
  const pemakaianIjazah = (row.pemakaianIjazah || '-').trim();
  const fileUrl = row.fileUrl || '';

  const isYear = (s: string) => /^(19|20)\d{2}$/.test(String(s).trim());
  const isDate = (s: string) => /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}-\d{2}-\d{2}$/.test(String(s).trim());

  const isPerson = (s: string) => {
    const up = String(s).toUpperCase().trim();
    if (!up || up === '-') return false;
    return /^(PROF|DR|DRS|DRA|IR|HJ?|K\.H|MR|MS|MRS)\b/i.test(up) ||
      up.includes('PROF.') || up.includes('DR.') || up.includes('DRS.') || up.includes('DRA.') ||
      up.includes('NURSAL') || up.includes('ANIZAR') || up.includes('NAZIR') || up.includes('JURNALIS') || 
      up.includes('BLAKE') || up.includes('AMIN AZIZ') || up.includes('SYAMSULHADI');
  };

  const isDegreeOnly = (s: string) => {
    const u = String(s).toUpperCase().trim();
    if (!u || u === '-') return false;
    return [
      'SD', 'SMP', 'SLTP', 'SMA', 'SMU', 'SMK', 'SLTA',
      'D1', 'D2', 'D3', 'D4', 'DI', 'DII', 'DIII', 'DIV',
      'S1', 'S2', 'S3', 'SMP/SLTP', 'SMA/SMU/SMK', 'SARJANA', 'MAGISTER', 'DOKTOR'
    ].includes(u);
  };

  const isSchool = (s: string) => {
    const u = String(s).toUpperCase().trim();
    if (!u || u === '-' || isDegreeOnly(u)) return false;
    return /^(UNIVERSITAS|INSTITUT|SEKOLAH|POLITEKNIK|AKADEMI|UNIV|SMAN|SMKN|SMPN|SDN|SLTAN|SLTPN|MTS|MAN|IAIN|UIN|STMIK|STIE|STIA|COLLEGE|FACULTY)\b/i.test(u) ||
      u.includes('UNIVERSITAS') || u.includes('INSTITUT') || u.includes('POLITEKNIK') || u.includes('SEKOLAH') ||
      u.includes('UNIV.') || u.includes('UNIV ') || u.includes('NEGERI ') || u.includes('SWASTA ');
  };

  const isMajor = (s: string) => {
    const u = String(s).toUpperCase().trim();
    if (!u || u === '-' || isDegreeOnly(u)) return false;
    return /^(TEKNIK|ILMU|HUKUM|MANAJEMEN|AKUNTANSI|EKONOMI|KEDOKTERAN|INFORMATIKA|KOMUNIKASI|ADMINISTRASI|PSIKOLOGI|SASTRA|BAHASA|HUBUNGAN|PENDIDIKAN|FARMASI|KIMIA|BIOLOGI|FISIKA|MATEMATIKA|IPA|IPS|A1|A2|A3|AGAMA|SYARIAH|KEPERAWATAN|LAW|INTELLECTUAL)\b/i.test(u) ||
      u.includes('HUKUM') || u.includes('MANAJEMEN') || u.includes('TEKNIK') || u.includes('AKUNTANSI') ||
      u.includes('EKONOMI') || u.includes('INFORMATIKA') || u.includes('ADMINISTRASI') || u.includes('SASTRA') ||
      u.includes('BAHASA') || u.includes('FISIKA') || u.includes('BIOLOGI') || u.includes('KIMIA') ||
      u.includes('MATEMATIKA') || u.includes('IPA') || u.includes('IPS');
  };

  // Case 1: Row index number shifted into jenjang (e.g. jenjang: "1")
  if (/^\d+$/.test(jenjang)) {
    if (isDegreeOnly(institusi) || normalizeStandardJenjang(institusi)) {
      jenjang = institusi;
      institusi = jurusan;
      jurusan = tahunLulus;
      tahunLulus = nomorIjazah;
      nomorIjazah = '-';
    } else {
      jenjang = '';
    }
  }

  // Case 2: Swapped Jenjang & Institusi (e.g. jenjang: "UNIVERSITAS PADJADJARAN", institusi: "S3")
  // Only swap if jenjang is NOT a degree and IS a school, and institusi IS a degree
  if (!isDegreeOnly(jenjang) && isSchool(jenjang) && (isDegreeOnly(institusi) || (STANDARD_JENJANG_LIST as readonly string[]).includes(normalizeStandardJenjang(institusi)))) {
    const tempJ = normalizeStandardJenjang(institusi);
    institusi = jenjang;
    jenjang = tempJ;
  } else if (!isDegreeOnly(jenjang) && isSchool(jenjang) && !normalizeStandardJenjang(jenjang)) {
    const oldJenjang = jenjang;
    if (isMajor(institusi)) {
      jurusan = institusi;
      institusi = oldJenjang;
    } else {
      institusi = oldJenjang;
    }
    jenjang = '';
  }

  // Case 3: Institusi and Jurusan are inverted (institusi is a major, jurusan is a school)
  if (isMajor(institusi) && isSchool(jurusan)) {
    const temp = institusi;
    institusi = jurusan;
    jurusan = temp;
  }

  // Case 4: Tahun in Jurusan or Nomor Ijazah
  if (isYear(jurusan) && !isYear(tahunLulus)) {
    nomorIjazah = tahunLulus;
    tahunLulus = jurusan;
    jurusan = '-';
  } else if ((!isYear(tahunLulus) && isYear(nomorIjazah)) || (isDate(nomorIjazah) && !isDate(tanggalIjazah))) {
    if (isYear(nomorIjazah)) {
      const temp = tahunLulus;
      tahunLulus = nomorIjazah;
      nomorIjazah = temp;
    }
  }

  // Case 5: TahunLulus contains full date or extra characters
  if (isDate(tahunLulus)) {
    if (!tanggalIjazah) tanggalIjazah = tahunLulus;
    tahunLulus = tahunLulus.includes('-') ? tahunLulus.split('-')[0] : (tahunLulus.split('/')[2] || tahunLulus.slice(-4));
  } else if (tahunLulus && tahunLulus.length > 4) {
    const yrMatch = tahunLulus.match(/\b(19|20)\d{2}\b/);
    if (yrMatch) tahunLulus = yrMatch[0];
  }

  // Case 6: NomorIjazah contains full date
  if (isDate(nomorIjazah)) {
    if (!tanggalIjazah) tanggalIjazah = nomorIjazah;
    nomorIjazah = '-';
  }

  // Case 7: Institusi contains person name (Kepala Sekolah / Rektor)
  if (isPerson(institusi)) {
    if (!kepalaSekolah) kepalaSekolah = institusi;
    institusi = isSchool(alamatSekolah) ? alamatSekolah : (row.namaSekolah && !isPerson(row.namaSekolah) ? row.namaSekolah : '-');
  }

  // Clean institusi that has "SARJANA " or "PASCA SARJANA " prefix
  if (/^SARJANA\s+(UNIV|UNIVERSITAS|INSTITUT)/i.test(institusi)) {
    institusi = institusi.replace(/^SARJANA\s+/i, '');
    if (!jenjang) jenjang = 'S1';
  } else if (/^PASCA\s*SARJANA\s+(UNIV|UNIVERSITAS|INSTITUT)/i.test(institusi)) {
    institusi = institusi.replace(/^PASCA\s*SARJANA\s+/i, '');
    if (!jenjang) jenjang = 'S2';
  }

  // Standardize jenjang value strictly into SD, SMP/SLTP, SMA/SMU/SMK, DIII, DIV, S1, S2, S3
  let stdJenjang = normalizeStandardJenjang(jenjang);
  if (!stdJenjang || !(STANDARD_JENJANG_LIST as readonly string[]).includes(stdJenjang)) {
    stdJenjang = normalizeStandardJenjang(institusi) || normalizeStandardJenjang(row.namaSekolah) || normalizeStandardJenjang(jurusan);
    if (!stdJenjang || !(STANDARD_JENJANG_LIST as readonly string[]).includes(stdJenjang)) {
      const instUp = (institusi || '').toUpperCase();
      if (instUp.includes('UNIVERSITAS') || instUp.includes('INSTITUT') || instUp.includes('FAKULTAS')) {
        stdJenjang = 'S1';
      } else if (instUp.includes('POLITEKNIK') || instUp.includes('AKADEMI')) {
        stdJenjang = 'DIII';
      } else if (instUp.includes('SMAN') || instUp.includes('SMA') || instUp.includes('SMK') || instUp.includes('SMU') || instUp.includes('SLTA')) {
        stdJenjang = 'SMA/SMU/SMK';
      } else if (instUp.includes('SMP') || instUp.includes('SLTP') || instUp.includes('MTS')) {
        stdJenjang = 'SMP/SLTP';
      } else if (instUp.includes('SD') || instUp.includes('DASAR')) {
        stdJenjang = 'SD';
      } else {
        stdJenjang = jenjang || '-';
      }
    }
  }

  // SD and SMP do not have a major (clear city/location from jurusan)
  if (stdJenjang === 'SD' || stdJenjang === 'SMP/SLTP') {
    if (jurusan && !isMajor(jurusan)) {
      if (!alamatSekolah && jurusan !== '-') alamatSekolah = jurusan;
      jurusan = '-';
    }
  }

  return {
    jenjang: stdJenjang,
    institusi: institusi || '-',
    namaSekolah: institusi || '-',
    jurusan: jurusan || '-',
    tahunLulus: tahunLulus || '-',
    nomorIjazah: nomorIjazah || '-',
    tanggalIjazah: tanggalIjazah || '',
    alamatSekolah: alamatSekolah || '-',
    kepalaSekolah: kepalaSekolah || '-',
    pemakaianIjazah,
    fileUrl
  };
};

export const normalizeJenjangLabel = (jenjangStr?: any): string => {
  if (!jenjangStr) return '';
  return normalizeStandardJenjang(jenjangStr) || String(jenjangStr).trim();
};

/**
 * Resolusi komprehensif: Menyesuaikan Pendidikan Terakhir & Jurusan berdasarkan:
 * 1. Riwayat Pendidikan (jenjang tertinggi & tahun terbaru).
 * 2. Apabila tidak ada riwayat pendidikan, ambil dari Gelar Terakhir pada nama pegawai.
 * 3. Fallback ke data profil yang sudah ada atau default 'SMA/SMU/SMK'.
 */
export const resolvePegawaiPendidikanDanJurusan = (pegawai: {
  nama?: string;
  riwayatPendidikan?: any[];
  pendidikan?: string;
  jurusan?: string;
  gelarBelakang?: string;
  gelarDepan?: string;
  [key: string]: any;
}): { pendidikan: string; jurusan: string } => {
  if (!pegawai) return { pendidikan: 'SMA/SMU/SMK', jurusan: '' };

  // 1. Prioritas Utama: Sesuaikan dengan Riwayat Pendidikan
  const riwayat = Array.isArray(pegawai?.riwayatPendidikan) ? pegawai.riwayatPendidikan : [];
  if (riwayat.length > 0) {
    const sortedRiwayat = [...riwayat].sort((a, b) => {
      const weightA = degreeWeight(a.jenjang);
      const weightB = degreeWeight(b.jenjang);
      if (weightA !== weightB) return weightB - weightA;
      const yrA = String(a.tahunLulus || a.tanggalIjazah || '');
      const yrB = String(b.tahunLulus || b.tanggalIjazah || '');
      return yrB.localeCompare(yrA);
    });

    const highest = sortedRiwayat[0];
    if (highest) {
      const p = normalizeStandardJenjang(highest.jenjang) || highest.jenjang || '';
      const j = (highest.jurusan || '').trim();
      if (p) {
        return { pendidikan: p, jurusan: j };
      }
    }
  }

  // 2. Apabila tidak ada riwayat pendidikan: Lihat Gelar Terakhirnya
  const nameWithGelar = `${pegawai?.nama || ''} ${pegawai?.gelarBelakang || ''}`.trim();
  const fromGelar = resolveFromGelarTerakhir(nameWithGelar);
  if (fromGelar && fromGelar.pendidikan) {
    return {
      pendidikan: normalizeStandardJenjang(fromGelar.pendidikan) || fromGelar.pendidikan,
      jurusan: fromGelar.jurusan || (pegawai?.jurusan && pegawai.jurusan !== '-' ? pegawai.jurusan : '')
    };
  }

  // 3. Fallback: Data yang sudah ada di database atau default
  const existingEdu = (pegawai?.pendidikan || '').trim();
  const existingJur = (pegawai?.jurusan || '').trim();
  if (existingEdu && existingEdu !== '-' && existingEdu.toUpperCase() !== 'LAINNYA') {
    return {
      pendidikan: normalizeStandardJenjang(existingEdu) || existingEdu,
      jurusan: existingJur && existingJur !== '-' ? existingJur : ''
    };
  }

  return { pendidikan: 'SMA/SMU/SMK', jurusan: '' };
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
  const frontTitleKeys = new Set(['prof', 'dr', 'drg', 'ir', 'drs', 'dra', 'h', 'hj', 'pdt', 'apt', 'ns']);

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
        } else if (cleanToken === 'drs') {
          detectedFront.push('Drs.');
        } else if (cleanToken === 'dra') {
          detectedFront.push('Dra.');
        } else if (cleanToken === 'apt') {
          detectedFront.push('Apt.');
        } else if (cleanToken === 'ns') {
          detectedFront.push('Ns.');
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
      eduLevel = normalizeStandardJenjang(highestItem.jenjang) || highestItem.jenjang;
      studyProgram = highestItem.bidang || '';
    } else if (detectedFront.some(p => p.toLowerCase().startsWith('dr.'))) {
      eduLevel = 'S3';
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
 * Helper to format Pegawai Name:
 * Preserves the exact name and academic titles (gelar) as stored in the database.
 */
export const formatPegawaiName = (nama: string): string => {
  if (!nama) return '';
  return nama.trim();
};

/**
 * Format NIP standard (e.g., NIP. 198504122008121001)
 */
export const formatNip = (nip?: string): string => {
  if (!nip) return '-';
  const clean = nip.toString().replace(/^NIP[\.\s:]*/i, '').trim();
  return clean ? `NIP. ${clean}` : '-';
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
  { path: '/evaluasi-pppk', label: 'Evaluasi Kinerja PPPK', icon: 'bi-award-fill' },
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

export interface PetaJabatanItem {
  id: string;
  kode: string;
  nama: string;
  level: number;
  tipe: 'INSTANSI' | 'DIREKTORAT' | 'SEKRETARIAT' | 'SUBDIREKTORAT' | 'BAGIAN' | 'SUBBAGIAN';
  parent?: string;
  orderKey: number;
}

export const PETA_JABATAN_SIMPEG_TREE: PetaJabatanItem[] = [
  { id: '1', kode: '1', nama: 'Direktorat Jenderal Kekayaan Intelektual', level: 0, tipe: 'INSTANSI', orderKey: 100 },
  // 1. Paten
  { id: '2', kode: '1.1', nama: 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang', level: 1, tipe: 'DIREKTORAT', parent: 'Direktorat Jenderal Kekayaan Intelektual', orderKey: 200 },
  { id: '2.1', kode: '1.1.1', nama: 'Subdirektorat Permohonan dan Pelayanan', level: 2, tipe: 'SUBDIREKTORAT', parent: 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang', orderKey: 210 },
  { id: '2.2', kode: '1.1.2', nama: 'Subdirektorat Fasilitasi Komisi Banding Paten', level: 2, tipe: 'SUBDIREKTORAT', parent: 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang', orderKey: 220 },
  { id: '2.3', kode: '1.1.3', nama: 'Subbagian Tata Usaha', level: 2, tipe: 'SUBBAGIAN', parent: 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang', orderKey: 230 },
  // 2. Merek
  { id: '3', kode: '1.2', nama: 'Direktorat Merek dan Indikasi Geografis', level: 1, tipe: 'DIREKTORAT', parent: 'Direktorat Jenderal Kekayaan Intelektual', orderKey: 300 },
  { id: '3.1', kode: '1.2.1', nama: 'Subdirektorat Permohonan dan Pelayanan', level: 2, tipe: 'SUBDIREKTORAT', parent: 'Direktorat Merek dan Indikasi Geografis', orderKey: 310 },
  { id: '3.2', kode: '1.2.2', nama: 'Subdirektorat Fasilitasi Komisi Banding Merek', level: 2, tipe: 'SUBDIREKTORAT', parent: 'Direktorat Merek dan Indikasi Geografis', orderKey: 320 },
  { id: '3.3', kode: '1.2.3', nama: 'Subbagian Tata Usaha', level: 2, tipe: 'SUBBAGIAN', parent: 'Direktorat Merek dan Indikasi Geografis', orderKey: 330 },
  // 3. Hak Cipta
  { id: '4', kode: '1.3', nama: 'Direktorat Hak Cipta dan Desain Industri', level: 1, tipe: 'DIREKTORAT', parent: 'Direktorat Jenderal Kekayaan Intelektual', orderKey: 400 },
  { id: '4.1', kode: '1.3.1', nama: 'Subdirektorat Permohonan dan Pelayanan', level: 2, tipe: 'SUBDIREKTORAT', parent: 'Direktorat Hak Cipta dan Desain Industri', orderKey: 410 },
  { id: '4.2', kode: '1.3.2', nama: 'Subbagian Tata Usaha', level: 2, tipe: 'SUBBAGIAN', parent: 'Direktorat Hak Cipta dan Desain Industri', orderKey: 420 },
  // 4. Kerja Sama
  { id: '5', kode: '1.4', nama: 'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi', level: 1, tipe: 'DIREKTORAT', parent: 'Direktorat Jenderal Kekayaan Intelektual', orderKey: 500 },
  { id: '5.1', kode: '1.4.1', nama: 'Subdirektorat Kerja Sama', level: 2, tipe: 'SUBDIREKTORAT', parent: 'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi', orderKey: 510 },
  { id: '5.2', kode: '1.4.2', nama: 'Subdirektorat Pemberdayaan dan Edukasi Kekayaan Intelektual', level: 2, tipe: 'SUBDIREKTORAT', parent: 'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi', orderKey: 520 },
  { id: '5.3', kode: '1.4.3', nama: 'Subbagian Tata Usaha', level: 2, tipe: 'SUBBAGIAN', parent: 'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi', orderKey: 530 },
  // 5. Sekretariat
  { id: '6', kode: '1.5', nama: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual', level: 1, tipe: 'SEKRETARIAT', parent: 'Direktorat Jenderal Kekayaan Intelektual', orderKey: 600 },
  { id: '6.1', kode: '1.5.1', nama: 'Bagian Program dan Pelaporan', level: 2, tipe: 'BAGIAN', parent: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual', orderKey: 610 },
  { id: '6.2', kode: '1.5.2', nama: 'Bagian Keuangan', level: 2, tipe: 'BAGIAN', parent: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual', orderKey: 620 },
  { id: '6.3', kode: '1.5.3', nama: 'Bagian Umum', level: 2, tipe: 'BAGIAN', parent: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual', orderKey: 630 },
  { id: '6.3.1', kode: '1.5.3.1', nama: 'Subbagian Tata Usaha Pimpinan dan Protokol', level: 3, tipe: 'SUBBAGIAN', parent: 'Bagian Umum', orderKey: 631 },
  { id: '6.3.2', kode: '1.5.3.2', nama: 'Subbagian Rumah Tangga', level: 3, tipe: 'SUBBAGIAN', parent: 'Bagian Umum', orderKey: 632 },
  // 6. TI
  { id: '7', kode: '1.6', nama: 'Direktorat Teknologi Informasi', level: 1, tipe: 'DIREKTORAT', parent: 'Direktorat Jenderal Kekayaan Intelektual', orderKey: 700 },
  { id: '7.1', kode: '1.6.1', nama: 'Subbagian Tata Usaha', level: 2, tipe: 'SUBBAGIAN', parent: 'Direktorat Teknologi Informasi', orderKey: 710 },
  // 7. Penegakan Hukum
  { id: '8', kode: '1.7', nama: 'Direktorat Penegakan Hukum', level: 1, tipe: 'DIREKTORAT', parent: 'Direktorat Jenderal Kekayaan Intelektual', orderKey: 800 },
  { id: '8.1', kode: '1.7.1', nama: 'Subdirektorat Pencegahan dan Sengketa Alternatif', level: 2, tipe: 'SUBDIREKTORAT', parent: 'Direktorat Penegakan Hukum', orderKey: 810 },
  { id: '8.2', kode: '1.7.2', nama: 'Subdirektorat Penindakan dan Penyidikan', level: 2, tipe: 'SUBDIREKTORAT', parent: 'Direktorat Penegakan Hukum', orderKey: 820 },
  { id: '8.3', kode: '1.7.3', nama: 'Subbagian Tata Usaha', level: 2, tipe: 'SUBBAGIAN', parent: 'Direktorat Penegakan Hukum', orderKey: 830 }
];

export const getPetaJabatanInfo = (p: { unitKerja?: string; jabatan?: string; bagian?: string; subbagian?: string }) => {
  const u = (p.unitKerja || '').toLowerCase();
  const j = (p.jabatan || '').toLowerCase();
  const b = (p.bagian || '').toLowerCase();
  const sb = (p.subbagian || '').toLowerCase();
  const combined = `${u} ${j} ${b} ${sb}`;

  // 1. Pimpinan Tinggi DJKI
  if (j.includes('direktur jenderal kekayaan intelektual') || j === 'dirjen' || j.startsWith('direktur jenderal')) {
    return {
      treeKode: '1',
      unitUtama: 'Direktorat Jenderal Kekayaan Intelektual',
      subUnit: 'Pimpinan Tinggi Madya (Dirjen)',
      orderKey: 100
    };
  }

  // 2. Paten
  if (u.includes('paten') || u.includes('sirkuit terpadu') || u.includes('rahasia dagang')) {
    if (j.startsWith('direktur paten') || j === 'direktur') {
      return { treeKode: '1.1', unitUtama: 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang', subUnit: 'Pimpinan Tinggi Pratama (Direktur)', orderKey: 200 };
    }
    if (combined.includes('banding paten') || combined.includes('komisi banding paten')) {
      return { treeKode: '1.1.2', unitUtama: 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang', subUnit: 'Subdirektorat Fasilitasi Komisi Banding Paten', orderKey: 220 };
    }
    if (combined.includes('tata usaha') || combined.includes('subbagian tata usaha') || combined.includes('subbag tu')) {
      return { treeKode: '1.1.3', unitUtama: 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang', subUnit: 'Subbagian Tata Usaha', orderKey: 230 };
    }
    return { treeKode: '1.1.1', unitUtama: 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang', subUnit: 'Subdirektorat Permohonan dan Pelayanan', orderKey: 210 };
  }

  // 3. Merek
  if (u.includes('merek') || u.includes('indikasi geografis')) {
    if (j.startsWith('direktur merek') || j === 'direktur') {
      return { treeKode: '1.2', unitUtama: 'Direktorat Merek dan Indikasi Geografis', subUnit: 'Pimpinan Tinggi Pratama (Direktur)', orderKey: 300 };
    }
    if (combined.includes('banding merek') || combined.includes('komisi banding merek')) {
      return { treeKode: '1.2.2', unitUtama: 'Direktorat Merek dan Indikasi Geografis', subUnit: 'Subdirektorat Fasilitasi Komisi Banding Merek', orderKey: 320 };
    }
    if (combined.includes('tata usaha') || combined.includes('subbagian tata usaha') || combined.includes('subbag tu')) {
      return { treeKode: '1.2.3', unitUtama: 'Direktorat Merek dan Indikasi Geografis', subUnit: 'Subbagian Tata Usaha', orderKey: 330 };
    }
    return { treeKode: '1.2.1', unitUtama: 'Direktorat Merek dan Indikasi Geografis', subUnit: 'Subdirektorat Permohonan dan Pelayanan', orderKey: 310 };
  }

  // 4. Hak Cipta
  if (u.includes('hak cipta') || u.includes('desain industri') || u.includes('cipta')) {
    if (j.startsWith('direktur hak cipta') || j === 'direktur') {
      return { treeKode: '1.3', unitUtama: 'Direktorat Hak Cipta dan Desain Industri', subUnit: 'Pimpinan Tinggi Pratama (Direktur)', orderKey: 400 };
    }
    if (combined.includes('tata usaha') || combined.includes('subbagian tata usaha') || combined.includes('subbag tu')) {
      return { treeKode: '1.3.2', unitUtama: 'Direktorat Hak Cipta dan Desain Industri', subUnit: 'Subbagian Tata Usaha', orderKey: 420 };
    }
    return { treeKode: '1.3.1', unitUtama: 'Direktorat Hak Cipta dan Desain Industri', subUnit: 'Subdirektorat Permohonan dan Pelayanan', orderKey: 410 };
  }

  // 5. Kerja Sama
  if (u.includes('kerja sama') || u.includes('kerjasama') || u.includes('pemberdayaan') || u.includes('edukasi')) {
    if (j.startsWith('direktur kerja sama') || j === 'direktur') {
      return { treeKode: '1.4', unitUtama: 'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi', subUnit: 'Pimpinan Tinggi Pratama (Direktur)', orderKey: 500 };
    }
    if (combined.includes('pemberdayaan') || combined.includes('edukasi')) {
      return { treeKode: '1.4.2', unitUtama: 'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi', subUnit: 'Subdirektorat Pemberdayaan dan Edukasi Kekayaan Intelektual', orderKey: 520 };
    }
    if (combined.includes('tata usaha') || combined.includes('subbagian tata usaha') || combined.includes('subbag tu')) {
      return { treeKode: '1.4.3', unitUtama: 'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi', subUnit: 'Subbagian Tata Usaha', orderKey: 530 };
    }
    return { treeKode: '1.4.1', unitUtama: 'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi', subUnit: 'Subdirektorat Kerja Sama', orderKey: 510 };
  }

  // 6. Sekretariat
  if (u.includes('sekretariat')) {
    if (j.includes('sekretaris direktorat jenderal') || j.includes('sesditjen')) {
      return { treeKode: '1.5', unitUtama: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual', subUnit: 'Pimpinan Tinggi Pratama (Sesditjen)', orderKey: 600 };
    }
    if (combined.includes('program') || combined.includes('pelaporan')) {
      return { treeKode: '1.5.1', unitUtama: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual', subUnit: 'Bagian Program dan Pelaporan', orderKey: 610 };
    }
    if (combined.includes('keuangan')) {
      return { treeKode: '1.5.2', unitUtama: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual', subUnit: 'Bagian Keuangan', orderKey: 620 };
    }
    if (combined.includes('protokol') || combined.includes('pimpinan dan protokol') || combined.includes('tu pimpinan')) {
      return { treeKode: '1.5.3.1', unitUtama: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual', subUnit: 'Subbagian Tata Usaha Pimpinan dan Protokol', orderKey: 631 };
    }
    if (combined.includes('rumah tangga')) {
      return { treeKode: '1.5.3.2', unitUtama: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual', subUnit: 'Subbagian Rumah Tangga', orderKey: 632 };
    }
    if (combined.includes('kepegawaian') || combined.includes('sdm')) {
      return { treeKode: '1.5', unitUtama: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual', subUnit: 'Bagian Kepegawaian / SDM', orderKey: 625 };
    }
    return { treeKode: '1.5.3', unitUtama: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual', subUnit: 'Bagian Umum', orderKey: 630 };
  }

  // 7. TI
  if (u.includes('teknologi informasi') || u.includes('ti') || u.includes('sistem informasi')) {
    if (j.startsWith('direktur teknologi') || j === 'direktur') {
      return { treeKode: '1.6', unitUtama: 'Direktorat Teknologi Informasi', subUnit: 'Pimpinan Tinggi Pratama (Direktur)', orderKey: 700 };
    }
    if (combined.includes('tata usaha') || combined.includes('subbag tu')) {
      return { treeKode: '1.6.1', unitUtama: 'Direktorat Teknologi Informasi', subUnit: 'Subbagian Tata Usaha', orderKey: 710 };
    }
    return { treeKode: '1.6', unitUtama: 'Direktorat Teknologi Informasi', subUnit: 'Subbagian Tata Usaha', orderKey: 715 };
  }

  // 8. Penegakan Hukum
  if (u.includes('penegakan hukum') || u.includes('sengketa') || u.includes('penyidikan') || u.includes('penindakan')) {
    if (j.startsWith('direktur penegakan') || j === 'direktur') {
      return { treeKode: '1.7', unitUtama: 'Direktorat Penegakan Hukum', subUnit: 'Pimpinan Tinggi Pratama (Direktur)', orderKey: 800 };
    }
    if (combined.includes('pencegahan') || combined.includes('alternatif')) {
      return { treeKode: '1.7.1', unitUtama: 'Direktorat Penegakan Hukum', subUnit: 'Subdirektorat Pencegahan dan Sengketa Alternatif', orderKey: 810 };
    }
    if (combined.includes('penindakan') || combined.includes('penyidikan')) {
      return { treeKode: '1.7.2', unitUtama: 'Direktorat Penegakan Hukum', subUnit: 'Subdirektorat Penindakan dan Penyidikan', orderKey: 820 };
    }
    if (combined.includes('tata usaha') || combined.includes('subbag tu')) {
      return { treeKode: '1.7.3', unitUtama: 'Direktorat Penegakan Hukum', subUnit: 'Subbagian Tata Usaha', orderKey: 830 };
    }
    return { treeKode: '1.7', unitUtama: 'Direktorat Penegakan Hukum', subUnit: 'Subdirektorat Pencegahan dan Sengketa Alternatif', orderKey: 815 };
  }

  return { treeKode: '1.9', unitUtama: p.unitKerja || 'Unit Kerja DJKI', subUnit: p.bagian || '-', orderKey: 999 };
};
