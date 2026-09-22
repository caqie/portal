
export enum TaskType {
  PELANTIKAN = 'PELANTIKAN',
  APEL = 'APEL',
  LHKPN = 'LHKPN',
  LHKASN = 'LHKASN',
  TUGAS_BELAJAR = 'TUGAS_BELAJAR',
  MAGANG = 'MAGANG',
  PENELITIAN = 'PENELITIAN',
  SATYA_LENCANA = 'SATYA_LENCANA',
  GELAR = 'GELAR',
  PANGKAT = 'PANGKAT',
  JENJANG = 'JENJANG',
  GAJI = 'GAJI',
  MUTASI = 'MUTASI',
  KARTU_SUAMI_ISTRI = 'KARTU_SUAMI_ISTRI',
  KARTU_BPJS = 'KARTU_BPJS',
  CUTI = 'CUTI',
  SPMT_SPP = 'SPMT_SPP',
  ABSENSI = 'ABSENSI',
  PERKAWINAN = 'PERKAWINAN',
  HUKUMAN = 'HUKUMAN',
  PENSIUN = 'PENSIUN',
  GRATIFIKASI = 'GRATIFIKASI',
  KGB = 'KGB',
  UANG_MAKAN = 'UANG_MAKAN'
}

export interface SatyaLencanaRecord {
  id: string;
  nip: string;
  namaPegawai: string;
  kategori: '10 TAHUN' | '20 TAHUN' | '30 TAHUN' | string;
  tahunTerima: number;
  nomorKeppres: string;
  fileSertifikatUrl?: string;
}

export interface PersuratanRecord {
  id: string;
  jenisSurat: 'MASUK' | 'KELUAR' | 'LAPORAN' | string;
  nomorSurat: string;
  tanggalSurat: string;
  perihal: string;
  lampiran: string;
  tujuan: string;
  dari?: string;
  isiRingkas: string;
  tembusan?: string;
  pjbNama: string;
  pjbNip: string;
  pjbJabatan: string;
  status: 'DRAFT' | 'TERBIT';
  fileUrl?: string;
  sifatSurat?: string;
  prioritas?: 'SANGAT_SEGERA' | 'SEGERA' | 'BIASA';
  tanggalMulai?: string;
  tanggalAkhir?: string;
  lokasi?: string;
  fileSuratUrl?: string;
  fileLampiranUrl?: string;
  isParaf?: boolean;
  ttdNip?: string;
  pemeriksaNip?: string;
  pengirimNip?: string;
  statusBaca?: 'BELUM' | 'SUDAH';
  statusProses?: 'BELUM' | 'SUDAH';
  kategoriAsal?: 'SETJEN' | 'DITJEN' | 'KANWIL' | 'UPT';
  riwayatDisposisi?: string;
  catatanDisposisi?: string;
}

export interface Pengembangan {
  id: string;
  nip: string;
  namaPegawai: string;
  namaKegiatan: string;
  jenisPengembangan: 'Klasikal' | 'Non-Klasikal' | string;
  kategori: 'Pelatihan' | 'Seminar' | 'Kursus' | 'E-learning' | 'Coaching' | 'Mentoring' | 'Lainnya';
  tanggalMulai: string;
  tanggalSelesai: string;
  jumlahJpl: number;
  penyelenggara: string;
  nomorSertifikat: string;
  fileSertifikatUrl?: string;
  tahun: number;
}

export interface MagangPKL {
  id: string;
  nama: string;
  nisNim: string;
  institusi: string;
  jurusan: string;
  jenis: 'MAGANG' | 'PKL';
  tanggalMulai: string;
  tanggalSelesai: string;
  penempatan: string;
  status: 'Proses' | 'Selesai';
  nomorSurat?: string;
  pjbNip?: string;
  pjbNama?: string;
  pjbJabatan?: string;
}

export interface SKPRecord { 
  id: string; 
  nip: string; 
  namaPegawai: string; 
  penilaiNip: string; 
  atasanPenilaiNip?: string; 
  tahun: number; 
  periodeMulai: string; 
  periodeSelesai: string; 
  periodeLabel?: string;
  periodeTeks?: string;
  kotaTtd?: string;
  tglPenilaian: string; 
  jenisPendekatan?: string;
  jenisJabatanKategori?: string;
  capaianOrganisasi: string; 
  ratingHasilKerja: string; 
  ratingPerilaku: string; 
  predikatKinerja: string; 
  catatan?: string; 
  catatanRekomendasi?: string;
  hasilKerja: any[]; 
  perilakuKerja: any[]; 
  lampiran?: any; 
}

export interface RiwayatPendidikan {
  jenjang: string;
  angkatan?: string;
  jurusan: string;
  namaSekolah?: string;
  institusi: string; // nama sekolah / universitas
  alamatSekolah?: string;
  kepalaSekolah?: string;
  nomorIjazah: string; // No STTB
  tanggalIjazah?: string; // Tgl STTB
  tahunLulus: string;
  pemakaianIjazah?: string; // e.g. "Penyesuaian Ijazah"
  fileUrl?: string;
}

export interface RiwayatJabatan {
  namaJabatan: string;
  unitKerja: string;
  tmtJabatan: string;
  nomorSk: string;
  tanggalSk: string;
  pejabatPenetap?: string;
  eselon?: string;
  tmtEselon?: string;
  nomorPelantikan?: string;
  tanggalPelantikan?: string;
  fileUrl?: string;
}

export interface RiwayatPangkat {
  golRuang: string; // e.g. "II/a", "IV/d"
  pangkat: string; // e.g. "Pengatur Muda", "Pembina Utama Madya"
  tmtPangkat: string;
  nomorSk: string;
  tanggalSk: string;
  pejabatPenetap?: string;
  jenisKp?: string; // "Reguler", "Penyesuaian Ijazah", "Pilihan (Struktural)"
  angkaKredit?: string;
  masaKerjaTahun?: string | number;
  masaKerjaBulan?: string | number;
  keterangan?: string; // "CPNS", "PNS", "KP"
  fileUrl?: string;
}

export interface RiwayatGaji {
  nomorSk: string;
  tanggalSk: string;
  tmtSk: string;
  pangkat: string; // "II/a", "IV/d"
  gajiPokok: string | number; // "2.022.200"
  masaKerjaTahun?: string | number;
  masaKerjaBulan?: string | number;
  pejabatPenetap?: string;
  jenisKenaikanGaji?: string; // "Kenaikan Pangkat" | "Gaji Berkala"
  kppn?: string;
  fileUrl?: string;
}

export interface RiwayatPelatihan {
  jenisDiklat?: string; // "Struktural", "Teknis", "Fungsional", "Lainnya"
  namaPelatihan: string; // nama / jenis diklat
  angkatan?: string;
  tahun: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  durasi?: string; // jumlah jam
  tempat?: string;
  penyelenggara: string;
  nomorSertifikat: string; // No STTPP
  tanggalSertifikat?: string; // Tgl STTPP
  prestasi?: string;
  fileUrl?: string;
}

export interface Keluarga {
  hubungan: string;
  nama: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  jenisKelamin?: 'L' | 'P' | string;
  pekerjaan?: string;
  statusPerkawinan?: string;
  nik?: string;
  noBpjs?: string;
  keteranganTunjangan?: string; // "Dapat Tunjangan" | "Tidak Dapat"
  fileUrl?: string;
}

export interface Pegawai { 
  id: string; 
  nip: string; 
  nama: string; 
  jabatan: string; 
  golongan?: string;
  klasifikasiJabatan?: string;
  subBagian?: string;
  bagian?: string;
  unitKerja: string; 
  gender: 'L' | 'P'; 
  golRuang: string; 
  jenisPegawai: string; 
  status: string; 
  pangkat?: string; 
  foto?: string; 
  tmtPangkat?: string; 
  tmtJabatan?: string;
  pendidikan?: string; 
  jurusan?: string;
  nik?: string;
  masaKerja?: string;
  masaKerjaGolongan?: string;
  masaKerjaPensiun?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  tmtCpns?: string;
  alamat?: string;
  eselon?: string;
  agama?: string;
  noHp?: string;
  email?: string;
  npwp?: string;
  noBpjs?: string;
  noKarisKarsu?: string;
  noTAPERA?: string;
  noKarpeg?: string;
  noRekeningGaji?: string;
  namaBank?: string;
  usia?: string;
  tglPensiun?: string;
  tmtPensiun?: string;
  tmtPensiunDisplay?: string;
  usiaPensiun?: string;
  bup?: string;
  sisaMasaKerja?: string;
  jenisJabatan?: string;
  keteranganPensiun?: string;
  statusPerkawinan?: string;
  kelasJabatan?: string;
  gajiPokok?: string | number;
  riwayatPendidikan?: RiwayatPendidikan[];
  riwayatJabatan?: RiwayatJabatan[];
  riwayatPangkat?: RiwayatPangkat[];
  riwayatGaji?: RiwayatGaji[];
  riwayatPelatihan?: RiwayatPelatihan[];
  keluarga?: Keluarga[];
}

export interface KeuanganPeserta {
  id: string;
  nip?: string;
  nama: string;
  jabatan: string;
  nomorSpd: string;
  tanggalSpd: string;
  tanggalBerangkat?: string;
  tanggalPulang?: string;
  tujuanPerjalanan: string;
  kategori: 'SPPD' | 'Fullboard' | 'Halfboard' | 'Transport' | 'Honorarium' | 'Lainnya';
  rincianBiaya: { item: string; rate: number; qty: number; total: number }[];
  totalJumlah: number;
}

export interface KeuanganRecord {
  id: string;
  namaKegiatan: string;
  tanggal: string;
  mataAnggaran: string;
  tahunAnggaran: string;
  ppkNip: string;
  ppkNama: string;
  bendaharaNip: string;
  bendaharaNama: string;
  unitKerja: string;
  status: 'Draft' | 'Diajukan' | 'Disetujui' | 'Ditolak';
  keterangan?: string;
  transactionId?: string;
  kotaTtd?: string;
  tanggalDokumen?: string;
  peserta: KeuanganPeserta[];
  configBiaya?: {
    uangHarian: number;
    penginapan: number;
    transport: number;
    fullboard: number;
    halfboard: number;
  };
  configSpd?: {
    nomorSpdPrefix: string;
    tanggalSpd: string;
    tanggalBerangkat?: string;
    tanggalPulang?: string;
    tujuanPerjalanan: string;
  };
}

export interface ABKAnjab { 
  id: string; 
  namaJabatan: string; 
  unitKerja: string; 
  jumlahSaatIni: number; 
  totalMenitBebanKerja: number; 
  kebutuhanPegawai: number; 
  selisih: number; 
  status: 'IDEAL' | 'KURANG' | 'LEBIH'; 
  jenisJabatan: 'PELAKSANA' | 'FUNGSIONAL' | 'STRUKTUR';
  ikhtisarJabatan: string;
  kualifikasiPendidikan: string;
  tanggungJawab: string;
  wewenang: string;
  syaratJabatan: string;
  lingkunganKerja: string;
  risikoBahaya: string;
  bakatKerja: string;
  temperamenKerja: string;
  minatKerja: string;
  upayaFisik: string;
  kondisiFisik: string;
  jamKerjaEfektif: number;
  uraianTugas: any; 
}

export interface KGB { 
  id: string; 
  nip: string; 
  namaPegawai: string; 
  tmtLama: string; 
  tmtBaru: string; 
  gajiLama: number; 
  gajiBaru: number; 
  nomorSk: string; 
  tglSk: string; 
  status: 'Proses' | 'Selesai'; 
  pjbNama?: string; 
  pjbNip?: string; 
  pjbJabatan?: string;
  
  // Additional fields for templates
  pangkatGol?: string;
  jabatan?: string;
  kantor?: string;
  unitKerja?: string;
  tglSurat?: string;
  
  // SK Terakhir (Basis)
  skTerakhirPejabat?: string;
  skTerakhirTanggal?: string;
  skTerakhirNomor?: string;
  skTerakhirTmt?: string;
  skTerakhirMasaKerja?: string;
  
  // New KGB details
  masaKerjaBaru?: string;
  golonganBaru?: string;
  
  // PPPK specific
  masaPerjanjianKerja?: string;
  perpanjanganPerjanjianKerja?: string;
  jenisPegawai?: 'PNS' | 'PPPK';
}
export interface Dossier { id: string; nip: string; namaPegawai: string; tanggal: string; keterangan: string; fileName: string; fileUrl?: string; }
export interface TugasRutin { id: string; timestamp: string; bulan: string; tahun: number; jenis: TaskType; detail: string; data?: any; }
export interface AuditLog { id: string; timestamp: string; userNip: string; userName: string; action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DOWNLOAD' | 'LOGIN' | 'EXPORT' | 'PRESENSI'; module: string; description: string; }
export type SDMRole = 
  | 'Superadmin' 
  | 'Admin Perencanaan & Layanan' 
  | 'Admin Pengembangan Kompetensi' 
  | 'Admin Pengelolaan Karier' 
  | 'Admin Uang Makan' 
  | 'Editor' 
  | 'Viewer';

export const normalizeRolesList = (rolesRaw: any, singleRoleRaw?: any): string[] => {
  let list: string[] = [];

  if (Array.isArray(rolesRaw)) {
    list = rolesRaw.map(r => String(r).trim()).filter(Boolean);
  } else if (typeof rolesRaw === 'string' && rolesRaw.trim()) {
    const trimmed = rolesRaw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          list = parsed.map(r => String(r).trim()).filter(Boolean);
        }
      } catch (e) {
        list = trimmed
          .slice(1, -1)
          .split(',')
          .map(s => s.replace(/["'\\]/g, '').trim())
          .filter(Boolean);
      }
    } else {
      list = trimmed.split(/[,;|]/).map(r => r.trim()).filter(Boolean);
    }
  }

  if (singleRoleRaw && typeof singleRoleRaw === 'string' && singleRoleRaw.trim()) {
    const cleanSingle = singleRoleRaw.trim();
    if (!list.includes(cleanSingle)) {
      list.unshift(cleanSingle);
    }
  }

  if (list.length === 0) {
    list = ['Viewer'];
  }

  return Array.from(new Set(list));
};

export interface AdminUser { 
  id: string; 
  nip: string; 
  name: string; 
  password?: string; 
  role: SDMRole | string; 
  roles?: (SDMRole | string)[]; 
  activeRole?: SDMRole | string;
  foto?: string; 
  status?: 'Aktif' | 'Nonaktif'; 
}

export interface TupoksiSDMItem {
  id: string;
  subTeam: 'PERENCANAAN_LAYANAN' | 'BANGKOM' | 'KARIER';
  roleName: string;
  kodeTupoksi: string;
  judul: string;
  deskripsi: string;
  periode: string;
  targetOutput: string;
  status: 'BELUM_DIMULAI' | 'DALAM_PROSES' | 'SELESAI' | 'TERUS_BERJALAN';
  progres: number; // 0 to 100
  penanggungJawab?: string;
  nipPj?: string;
  dokumenDukungUrl?: string;
  dokumenDukungNama?: string;
  appModuleLink?: string;
  catatan?: string;
  updatedAt?: string;
}
export interface CloudConfig { driveFolderId: string; appsScriptUrl: string; logoUrl?: string; }
export interface SpmtSppRecord { 
  id: string; 
  type: 'SPP' | 'SPMT'; 
  nomor: string; 
  pejabatNip: string; 
  pegawaiNip: string; 
  nomorSK: string; 
  tentangSK: string; 
  tanggalSK: string; 
  jabatanBaru: string; 
  unitKerja: string; 
  tanggalLantikAtauSpmt: string; 
  tanggalSppAtauSpmt: string; 
  tempatTandaTangan: string; 
  signatureLabel?: string; 
  menimbang?: string;
  dasar?: string;
  nomorSuratPerintah?: string;
}
export interface PAKRecord { id: string; nip: string; namaPegawai: string; nomor: string; periode: string; tglDibuat: string; penilaiNip: string; akKonversi: number; jumlahKredit: number; akumulasi: any[]; }
export interface KenaikanKarir { id: string; nip: string; namaPegawai: string; jenisUsulan: string; dari: string; menjadi: string; tmtUsulan: string; status: string; }
export interface Kegiatan { 
  id: string; 
  tanggal: string; 
  tanggalMulai: string;
  tanggalSelesai: string;
  jamMulai?: string;
  jamSelesai?: string;
  judulKegiatan: string; 
  tempat: string; 
  jumlahPeserta: number; 
  asalPeserta: string; 
  laporanSingkat: string; 
  linkDriveFoto: string; 
  status: string; 
}
export interface AbsensiRecord { id: string; nip: string; nama: string; tanggal?: string; waktu: string; tipe: 'MASUK' | 'PULANG'; status: string; lokasi: string; confidence: number; simpegStatus?: 'PENDING' | 'SUCCESS' | 'FAILED'; simpegError?: string; }

export interface AbsensiConfig {
  id: string;
  officeWifiSsid: string;
  officeIpAddresses: string; // Comma-separated IPs or CIDR ranges
  wfaNips: string[];
  simpegApiUrl?: string;
  simpegApiKey?: string;
  simpegEnabled?: boolean;
}

export interface MaintenanceConfig {
  all: boolean;
  pages: string[]; // List of routes in maintenance
}

export interface PageAccess {
  route: string;
  roles: string[];
  nips: string[];
}

export interface SystemConfig {
  maintenance: MaintenanceConfig;
  pageAccess: PageAccess[];
  systemName?: string;
  runningText?: string;
  systemLogo?: string;
  templateLogo?: string;
}

export interface BankSoal {
  id: string;
  kategori: 'TWK' | 'TIU' | 'TKP';
  tipeSoal: 'Umum' | 'Khusus';
  jabatanFungsional?: string;
  jenjang: string;
  pertanyaan: string;
  imageUrl?: string;
  pilihanA: string;
  pilihanB: string;
  pilihanC: string;
  pilihanD: string;
  pilihanE: string;
  jawabanBenar: string;
  bobotNilai: string;
  tipeJawaban?: 'PILIHAN_GANDA' | 'ESAI';
}

export interface PesertaUkom {
  noPeserta: string;
  nama: string;
  tanggalLahir: string;
  jabatanFungsional?: string;
  jenjang: string;
  unitKerja?: string;
  fotoUrl?: string;
  password?: string;
  statusUjian: 'Belum' | 'Sudah';
  isLocked?: boolean;
  unlockPassword?: string;
}

export interface HasilUkom {
  noPeserta: string;
  nama: string;
  jabatanFungsional?: string;
  jenjang: string;
  nilaiTwk: number;
  nilaiTiu: number;
  nilaiTkp: number;
  totalNilai: number;
  tanggalUjian: string;
  waktuSelesai: string;
  essayAnswers?: { soalId: string; pertanyaan: string; jawaban: string; nilai?: number; bobotMax: number }[];
}

export interface UkomSession {
  id: string;
  namaSesi: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  supervisorNips: string[]; // List of NIPs allowed to supervise
  pesertaIds: string[]; // List of participant IDs
  status: 'Draft' | 'Aktif' | 'Selesai';
}

export interface UkomSupervisor {
  nip: string;
  nama: string;
  jabatan: string;
}

export interface UkomActivityLog {
  noPeserta: string;
  soalId: string;
  jawaban: string;
  timestamp: string;
  isRagu: boolean;
}

export interface Laporan {
  id: string;
}

export interface HasilKerjaRow {
  rencanaPimpinan: string;
  rencanaPegawai: string;
  aspek: string;
  indikator: string;
  target: string;
  realisasi: string;
  umpanBalik: string;
}

export interface PerilakuKerjaRow {
  poin: string;
  deskripsi: string;
  ekspektasi: string;
  umpanBalik: string;
}

// === ASN TALENT MANAGEMENT ===
export interface PenilaianTalenta {
  id: string;
  pegawai_id: string; // NIP
  nilai_skp: number;
  kompetensi: number;
  integritas: number;
  disiplin: number;
  leadership: number;
  teamwork: number;
  inovasi: number;
  komunikasi: number;
  pendidikan: string;
  pengalaman: number;
  total_nilai: number;
  kategori_talenta: string;
  created_at: string;
}

export interface TalentPool {
  id: string;
  pegawai_id: string; // NIP
  ranking: number;
  status_talenta: string;
  readiness_level: string;
  rekomendasi_jabatan: string;
  created_at: string;
}

export interface AssessmentTalenta {
  id: string;
  pegawai_id: string; // NIP
  hasil_assessment: string;
  potensi: number;
  kompetensi: number;
  assessor: string;
  catatan: string;
  tanggal_assessment: string;
}

export interface NineBoxTalenta {
  id: string;
  pegawai_id: string; // NIP
  kinerja: number;
  potensi: number;
  posisi_box: string;
  rekomendasi: string;
}

export interface PengembanganTalenta {
  id: string;
  pegawai_id: string; // NIP
  jenis_pengembangan: string;
  nama_pelatihan: string;
  penyelenggara: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
}

// === LAYANAN SDM KI (HELPDESK & TICKETING SYSTEM) ===

export type StatusPengajuan =
  | 'DRAFT'
  | 'DIAJUKAN'
  | 'MENUNGGU_VERIFIKASI'
  | 'DIVERIFIKASI'
  | 'DALAM_PROSES'
  | 'PERLU_PERBAIKAN'
  | 'MENUNGGU_PEMOHON'
  | 'SELESAI'
  | 'DITOLAK'
  | 'DIBATALKAN';

export type PrioritasPengajuan = 'NORMAL' | 'URGENT';

export interface LayananCategory {
  id: string;
  nama: string;
  deskripsi: string;
  icon: string;
  color: string;
}

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'number';
  options?: string[];
  placeholder?: string;
  required: boolean;
  helperText?: string;
  defaultValue?: string;
}

export interface RequiredDocConfig {
  id: string;
  label: string;
  required: boolean;
  description?: string;
}

export interface MasterLayanan {
  id: string;
  kodeLayanan: string;
  kategori: string;
  namaLayanan: string;
  deskripsi?: string;
  aktif: boolean;
  slaHari: number;
  icon?: string;
  fields: FormFieldConfig[];
  requiredDocuments: RequiredDocConfig[];
  rolePetugas?: string;
  urutan?: number;
}

export interface PengajuanSDM {
  id: string;
  idPengajuan?: string;
  nomorTiket: string;
  nip: string;
  nama: string;
  unitKerja: string;
  jabatan: string;
  pangkat: string;
  statusKepegawaian?: string;
  email?: string;
  noHp?: string;
  kategori: string;
  idLayanan: string;
  namaLayanan: string;
  tanggalPengajuan: string;
  status: StatusPengajuan;
  prioritas: PrioritasPengajuan;
  petugasId?: string;
  petugasNama?: string;
  keterangan?: string;
  dataForm: Record<string, any>;
  catatanVerifikator?: string;
  catatanPerbaikan?: string;
  alasanPenolakan?: string;
  hasil?: string;
  linkHasil?: string;
  nomorSuratHasil?: string;
  fileHasilUrl?: string;
  tanggalSelesai?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DokumenPengajuan {
  id: string;
  idDokumen?: string;
  idPengajuan: string;
  nomorTiket: string;
  namaDokumen: string;
  jenisDokumen: string;
  fileId?: string;
  fileName: string;
  fileUrl?: string;
  fileBase64?: string;
  mimeType?: string;
  size?: number;
  uploadedBy: string;
  uploadedAt: string;
  versi?: number;
  aktif: boolean;
}

export interface LogPengajuan {
  id: string;
  idLog?: string;
  idPengajuan: string;
  nomorTiket: string;
  timestamp: string;
  nipUser: string;
  namaUser: string;
  role: string;
  statusLama: string;
  statusBaru: string;
  catatan: string;
}

export interface PesanPengajuan {
  id: string;
  idPesan?: string;
  idPengajuan: string;
  nomorTiket: string;
  pengirimNip: string;
  pengirimNama: string;
  role: string;
  pesan: string;
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  timestamp: string;
  dibaca: boolean;
}

export interface MasterPetugasSDM {
  id: string;
  nip: string;
  nama: string;
  unit: string;
  role: string;
  aktif: boolean;
  jenisLayanan?: string[];
}

export type TipeNotifikasiSDM = 
  | 'PERLU_PERBAIKAN'
  | 'STATUS_CHANGE'
  | 'TIKET_BARU'
  | 'PESAN_BARU'
  | 'SLA_WARNING'
  | 'SELESAI'
  | 'DITOLAK'
  | 'INFO';

export interface NotifikasiSDM {
  id: string;
  idPengajuan: string;
  nomorTiket: string;
  judul: string;
  pesan: string;
  tipe: TipeNotifikasiSDM;
  link: string;
  timestamp: string;
  dibaca: boolean;
  targetRole?: 'USER' | 'ADMIN' | 'ALL';
  targetNip?: string;
  namaLayanan?: string;
  prioritas?: 'HIGH' | 'MEDIUM' | 'LOW';
  extraData?: Record<string, any>;
}

// ============================================================
// === SMART PRESENSI & BIOMETRIC GEOLOCATION MODULE TYPES ===
// ============================================================

export type FaceRegistrationStatus =
  | 'NOT_REGISTERED'
  | 'PENDING'
  | 'REGISTERED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REQUIRED_UPDATE';

export interface FaceRegistration {
  id: string;
  employee_id: string; // NIP
  nip: string;
  nama: string;
  unitKerja?: string;
  jabatan?: string;
  status: FaceRegistrationStatus;
  face_template_reference: string; // Biometric template abstraction ID / secured token
  source_type: 'UPLOAD'; // Strict requirement: Face registration uses photo upload only
  source_file_reference?: string; // Restricted thumbnail/reference
  version: number; // e.g. 1, 2, 3...
  quality_score: number; // 0 - 100
  face_count: number; // Must be exactly 1 for valid registration
  notes?: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  verified_at?: string;
  verified_by?: string;
}

export type GeofenceGeometryType = 'POLYGON' | 'CIRCLE';

export interface PolygonPoint {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface AttendanceLocation {
  id: string;
  name: string;
  description: string;
  geometry_type: GeofenceGeometryType;
  status: 'ACTIVE' | 'INACTIVE';
  accuracy_limit: number; // Maximum allowed GPS accuracy in meters (e.g. 30)
  polygon_points: PolygonPoint[]; // Minimum 4 points, supports N points (4, 5, 6, 7, ... 20+)
  center_latitude?: number;
  center_longitude?: number;
  radius_meter?: number;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export type SmartAttendanceType = 'CHECK_IN' | 'CHECK_OUT';

export type SmartAttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'EARLY_LEAVE'
  | 'ABSENT'
  | 'INVALID_LOCATION'
  | 'INVALID_FACE'
  | 'LIVENESS_FAILED'
  | 'GPS_INACCURATE'
  | 'PENDING_REVIEW';

export interface SmartAttendanceRecord {
  id: string;
  attendance_request_id: string; // e.g. ATT-20260826-000001
  employee_id: string; // NIP
  nama: string;
  unitKerja: string;
  attendance_date: string; // YYYY-MM-DD
  attendance_time: string; // HH:mm:ss WIB
  attendance_type: SmartAttendanceType;
  status: SmartAttendanceStatus;
  face_verified: boolean;
  liveness_verified: boolean;
  face_match_score: number; // Percentage, e.g. 98
  latitude: number;
  longitude: number;
  gps_accuracy: number; // in meters
  geofence_id: string;
  geofence_name: string;
  geofence_type: GeofenceGeometryType;
  geofence_result: 'INSIDE' | 'OUTSIDE';
  schedule_id?: string;
  schedule_name?: string;
  device_reference?: string;
  verification_timestamp: string;
  created_at: string;
  notes?: string;
  is_anomaly?: boolean;
}

export interface AttendanceSchedule {
  id: string;
  name: string;
  dayOfWeek: number; // 0: Sun, 1: Mon, ..., 5: Fri
  dayName: string;
  checkInStart: string; // e.g. 06:00:00
  checkInLimit: string; // e.g. 07:30:00 or 08:30:00 (flexy)
  checkOutStart: string; // e.g. 16:00:00 or 16:30:00
  checkOutEnd: string; // e.g. 21:00:00
  isFlexy: boolean;
  flexyDesc?: string;
}

export interface SmartAttendanceConfig {
  face_match_threshold: number; // e.g. 80 (80%)
  gps_accuracy_limit: number; // e.g. 30 meters
  geofence_boundary_policy: 'INSIDE' | 'STRICT';
  liveness_timeout: number; // in seconds (e.g. 15)
  camera_timeout: number; // in seconds (e.g. 20)
  attendance_duplicate_window: number; // in minutes (e.g. 60)
  timezone: string; // e.g. 'Asia/Jakarta'
  attendance_retention: string;
  face_registration_retention: string;
  audit_retention: string;
}

export type LivenessChallengeType = 
  | 'BLINK'
  | 'LOOK_LEFT'
  | 'LOOK_RIGHT'
  | 'SMILE'
  | 'NOD_HEAD';

export interface LivenessChallenge {
  id: string;
  type: LivenessChallengeType;
  instruction: string;
  subInstruction: string;
  icon: string;
  durationMs: number;
}

// ============================================================
// === MODUL EVALUASI KINERJA PPPK BERBASIS SEMESTER ===
// ============================================================

export type PPPKSemester = 'I' | 'II';
export type EvaluationPeriodStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'EVALUATION' | 'FINALIZED';
export type PPPKEvaluationStatus = 'DRAFT' | 'IN_PROGRESS' | 'WAITING_REVIEW' | 'FINAL' | 'CORRECTION_REQUESTED';
export type PPPKEvaluatorType = 'ATASAN' | 'REKAN_KERJA' | 'SELF' | 'BAWAHAN';
export type PPPKRespondentType = PPPKEvaluatorType | 'REKAN' | 'LAINNYA';

export interface EvaluationPeriod {
  id: string;
  year: number;
  semester: PPPKSemester;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: EvaluationPeriodStatus;
  skpWeight: number; // default 60%
  behaviorWeight: number; // default 25%
  attendanceWeight: number; // default 15%
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface BehaviorAspect {
  id: string;
  name: string;
  description: string;
  weight: number;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BehaviorAssessmentDetail {
  id: string;
  assessmentId: string;
  aspectId: string;
  aspectName: string;
  score: number; // 1 - 5 scale
  comment?: string;
}

/**
 * BehaviorAssessment (360° Multi-Rater Assessment Record)
 * STRICT ARCHITECTURAL SEPARATION:
 * - subject_employee_id: WAJIB PPPK (Pegawai yang dinilai)
 * - evaluator_employee_id: PNS atau PPPK (Pegawai yang memberi nilai)
 */
export interface BehaviorAssessment {
  id: string;
  evaluationId: string;
  
  // 1. OBJEK YANG DINILAI (WAJIB PPPK)
  subject_employee_id: string; // NIP Pegawai PPPK
  subject_employee_name: string;
  subject_employee_status: 'PPPK';
  subject_employee_unit?: string;
  subject_employee_jabatan?: string;

  // 2. PENILAI / EVALUATOR (DAPAT PNS ATAU PPPK)
  evaluator_employee_id: string; // NIP Penilai (PNS atau PPPK)
  evaluator_employee_name: string;
  evaluator_employee_status: 'PNS' | 'PPPK';
  evaluator_employee_unit?: string;
  evaluator_employee_jabatan?: string;
  evaluator_type: PPPKEvaluatorType; // 'ATASAN' | 'REKAN_KERJA' | 'SELF' | 'BAWAHAN'

  periodId: string;
  year: number;
  semester: PPPKSemester;

  // Privacy & Status
  isAnonymous: boolean;
  status: 'ASSIGNED' | 'DRAFT' | 'SUBMITTED';
  score: number; // 0 - 100 converted score
  averageScoreScale5: number; // 1 - 5 average score
  comment?: string;

  details: BehaviorAssessmentDetail[];
  submitted_at?: string;
  created_at: string;
  updated_at: string;

  // Backwards compatibility aliases
  employeeId?: string;
  employeeName?: string;
  respondentId?: string;
  respondentName?: string;
  respondentType?: PPPKRespondentType;
  averageScore?: number;
  convertedScore?: number;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceEvaluation {
  id: string;
  evaluationId: string;
  employeeId: string; // NIP
  periodId: string;
  year: number;
  semester: PPPKSemester;
  startDate: string;
  endDate: string;
  workDays: number;
  presentDays: number;
  lateCount: number;
  earlyLeaveCount: number;
  absenceCount: number;
  officialDutyCount: number;
  officialDutyHalfCount: number;
  wfhCount: number;
  wfoCount: number;
  rawScore: number; // Base 100
  penalty: number;
  finalScore: number; // 0 - 100
  calculatedAt: string;
}

export interface PPPKFinalSnapshot {
  employeeId: string;
  nip: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  periodId: string;
  year: number;
  semester: PPPKSemester;
  skpScore: number;
  behaviorScore: number;
  attendanceScore: number;
  skpWeight: number;
  behaviorWeight: number;
  attendanceWeight: number;
  skpContribution: number;
  behaviorContribution: number;
  attendanceContribution: number;
  finalScore: number;
  category: string;
  attendanceSummary: {
    workDays: number;
    presentDays: number;
    lateCount: number;
    earlyLeaveCount: number;
    absenceCount: number;
    officialDutyCount: number;
    wfhCount: number;
    wfoCount: number;
    penalty: number;
  };
  behaviorSummary: {
    respondentCount: number;
    atasanScore?: number;
    rekanScore?: number;
    selfScore?: number;
    aspectAverages: { aspectId: string; aspectName: string; averageScore: number }[];
    evaluatorList?: {
      evaluatorName: string;
      evaluatorStatus: string;
      evaluatorType: string;
      score: number;
    }[];
  };
  skpSummary: {
    skpId?: string;
    predikat?: string;
    capaianOrganisasi?: string;
    ratingHasilKerja?: string;
    ratingPerilaku?: string;
  };
  finalizedAt: string;
  finalizedBy: string;
}

export interface PPPKHasilKerjaItem {
  no: number;
  rencanaHasilKerja: string;
  target: number;
  realisasi: number;
}

export interface PPPKBerakhlakSubItem {
  code: string;
  pertanyaan: string;
  skorPejabat: number;
  skorRekanPns: number;
  skorRekanPppk: number;
}

export interface PPPKBerakhlakAspectItem {
  no: number;
  aspek: string;
  subItems: PPPKBerakhlakSubItem[];
  rataRataPejabat: number;
  rataRataRekan: number;
  nilaiAkhirAspek: number;
}

export interface PPPKPejabatInfo {
  nama: string;
  nip: string;
  pangkatGolRuang: string;
  jabatan: string;
  unitKerja: string;
}

export interface PPPKEvaluation {
  id: string;
  employeeId: string; // NIP PPPK (Subject)
  nama: string;
  unitKerja: string;
  jabatan: string;
  jenisPegawai: 'PPPK'; // WAJIB PPPK
  pangkatGolRuang?: string;
  periodId: string;
  year: number;
  semester: PPPKSemester;

  // Scores (0 - 100)
  skpScore: number;
  behaviorScore: number;
  attendanceScore: number;

  // Weights A (wajib total 100%)
  skpWeight: number;
  behaviorWeight: number;
  attendanceWeight: number;

  // Contributions
  skpContribution: number;
  behaviorContribution: number;
  attendanceContribution: number;

  // Final Output
  finalScore: number;
  category: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Sangat Kurang';
  status: PPPKEvaluationStatus;
  isFinal: boolean;

  // References
  skpSourceId?: string;
  skpPredikat?: string;

  // Official Permenpan RB 6 / 2022 & DJKI Form Fields
  pejabatPenilai?: PPPKPejabatInfo;
  atasanPejabatPenilai?: PPPKPejabatInfo;
  ratingHasilKerja?: 'DIATAS EKSPEKTASI' | 'SESUAI EKSPEKTASI' | 'DIBAWAH EKSPEKTASI' | string;
  ratingPerilakuKerja?: 'DIATAS EKSPEKTASI' | 'SESUAI EKSPEKTASI' | 'DIBAWAH EKSPEKTASI' | string;
  predikatPenilaianKinerja?: 'SANGAT BAIK' | 'BAIK' | 'BUTUH PERBAIKAN' | 'KURANG' | 'SANGAT KURANG' | string;
  rekomendasi?: 'PERPANJANGAN PERJANJIAN KINERJA' | 'PEMUTUSAN PERJANJIAN KINERJA' | string;
  catatanKinerja?: ('DIPERTAHANKAN' | 'ROTASI' | 'PENGEMBANGAN KARIR' | 'BIMBINGAN KINERJA')[] | string;
  catatanTambahan?: string;
  kotaTtd?: string;
  tanggalTtd?: string;
  hasilKerjaList?: PPPKHasilKerjaItem[];
  berakhlakList?: PPPKBerakhlakAspectItem[];
  alfaCount?: number;
  analisisKehadiranSkor?: number;
  nilaiKehadiranBobot?: number;
  totalNilaiPerilakuRataRata?: number;
  jumlahPerilakuPlusKehadiran?: number;

  // Immutable Snapshot when isFinal === true
  finalSnapshot?: PPPKFinalSnapshot;

  // Timestamps and Audit Tracking
  calculatedAt: string;
  finalizedAt?: string;
  finalizedBy?: string;

  // Correction Workflow
  correctionReason?: string;
  correctionRequestedAt?: string;
  correctionRequestedBy?: string;
  correctionApprovedAt?: string;
  correctionApprovedBy?: string;

  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PPPKEvaluationAuditLog {
  id: string;
  evaluationId?: string;
  periodId?: string;
  employeeId?: string;
  userId: string;
  userName: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'CALCULATE'
    | 'REVIEW'
    | 'FINALIZE'
    | 'UNFINALIZE'
    | 'CORRECTION_REQUEST'
    | 'APPROVE_CORRECTION'
    | 'EXPORT_EXCEL'
    | 'EXPORT_PDF'
    | 'ASSIGN_RESPONDENT'
    | 'SUBMIT_360';
  oldData?: any;
  newData?: any;
  reason?: string;
  createdAt: string;
}

export type EvaluationAssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
export type EvaluationApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EvaluationAssignment {
  id: string;
  evaluation_id: string;
  subject_employee_id: string; // NIP Pegawai PPPK yang dinilai
  subject_employee_nama: string;
  subject_employee_jabatan?: string;
  subject_employee_unit?: string;

  evaluator_employee_id: string; // NIP Penilai (PNS atau PPPK)
  evaluator_employee_nama: string;
  evaluator_employee_status: 'PNS' | 'PPPK';
  evaluator_employee_jabatan?: string;
  evaluator_employee_unit?: string;
  evaluator_type: PPPKEvaluatorType; // 'ATASAN' | 'REKAN_KERJA' | 'SELF' | 'BAWAHAN'

  assignment_status: EvaluationAssignmentStatus;
  approval_status: EvaluationApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;

  period_id: string;
  year: number;
  semester: PPPKSemester;

  submitted_at?: string;
  completed_at?: string;
  score?: number; // 0 - 100 converted score

  created_at: string;
  updated_at: string;
}

export interface PPPKConfigSettings {
  // BOBOT A: BOBOT KOMPONEN EVALUASI UTAMA (Total 100%)
  defaultSkpWeight: number; // 60%
  defaultBehaviorWeight: number; // 25%
  defaultAttendanceWeight: number; // 15%

  // BOBOT B: BOBOT PENILAI 360° (Total 100%, terpisah dari Bobot A)
  evaluator360Weights: {
    atasanWeight: number; // default: 50%
    rekanKerjaWeight: number; // default: 30%
    selfWeight: number; // default: 20%
  };

  // KEBIJAKAN STATUS PENILAI (PNS diperbolehkan)
  allowedEvaluatorTypes: {
    atasan: ('PNS' | 'PPPK')[]; // Default ['PNS', 'PPPK']
    rekanKerja: ('PNS' | 'PPPK')[]; // Default ['PNS', 'PPPK']
    self: ('PPPK')[]; // Default ['PPPK'] (Wajib PPPK yang dinilai)
  };

  peerEvaluatorMin: number; // Default 2
  peerEvaluatorMax: number; // Default 4
  peerApprovalRequired: boolean; // Default true (usulan rekan kerja harus diapprove admin)
  enableSelfAssessment: boolean; // Default true

  minBehaviorScale: number;
  maxBehaviorScale: number;
  categories: {
    min: number;
    max: number;
    label: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Sangat Kurang';
    color: string;
    bgBadge: string;
    textBadge: string;
  }[];
  attendancePenalty: {
    latePenaltyPerEvent: number;
    earlyLeavePenaltyPerEvent: number;
    absencePenaltyPerEvent: number;
    unrecordedPenaltyPerEvent: number;
  };
  allowAnonymous: boolean;
}

export interface PPPKKetuaTimKerja {
  id: string;
  nama: string;
  nip: string;
  pangkatGolRuang: string;
  jabatan: string;
  namaTimKerja: string;
  unitKerja: string;
  direktorat: string;
  status: 'AKTIF' | 'NONAKTIF';
  anggotaPppkNip: string[];
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PPPKBulkAttendanceRecord {
  id: string;
  employeeId: string; // NIP Pegawai PPPK
  nama: string;
  unitKerja: string;
  jabatan: string;
  timKerja?: string;
  year: number;
  semester: PPPKSemester;
  totalHariKerja: number;
  hadir: number;
  izin: number;
  sakit: number;
  cuti: number;
  alfa: number; // Kunci kriteria: Alfa > 8 = 1, 6-8 = 2, 3-5 = 3, 1-2 = 4, 0 = 5
  terlambatMenit?: number;
  pulangCepatMenit?: number;
  skorAnalisis: number; // 1 s.d 5
  kriteriaText: string;
  nilaiKehadiranBobot: number; // skorAnalisis * 40% (misal 5 * 0.4 = 2.00)
  attendanceScore100: number; // skorAnalisis * 20 (misal 5 * 20 = 100)
  catatan?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PPPKSkpItem {
  id: string;
  no: number;
  rencanaHasilKerja: string;
  indikatorKinerja: string;
  target: number;
  satuan: string;
  realisasi: number;
  capaianPersen: number;
  umpanBalikPenilai?: string;
}

export interface PPPKSkpSubmission {
  id: string;
  evaluationId?: string;
  employeeId: string; // NIP Pegawai PPPK yang dinilai
  namaPegawai: string;
  nipPegawai: string;
  jabatanPegawai: string;
  unitKerja: string;
  year: number;
  semester: PPPKSemester;
  
  penilaiType: 'STRUKTURAL' | 'KETUA_TIM';
  penilaiId?: string; // ID atau NIP penilai
  penilaiNama: string;
  penilaiNip: string;
  penilaiJabatan: string;
  penilaiPangkatGolRuang?: string;
  penilaiUnitKerja?: string;
  
  status: 'DRAFT' | 'DIAJUKAN' | 'PERLU_REVISI' | 'DISETUJUI' | 'DINILAI';
  tanggalPengajuan?: string;
  tanggalPenilaian?: string;
  
  items: PPPKSkpItem[];
  totalTarget: number;
  totalRealisasi: number;
  rataRataCapaianPersen: number;
  ratingHasilKerja: 'DIATAS EKSPEKTASI' | 'SESUAI EKSPEKTASI' | 'DIBAWAH EKSPEKTASI';
  catatanPenilai?: string;
  catatanRevisi?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface PPPKPeerAssignmentPair {
  id: string;
  evaluationId?: string;
  subjectNip: string; // Pegawai PPPK yang dinilai
  subjectNama: string;
  unitKerja: string;
  year: number;
  semester: PPPKSemester;
  
  assignedByRole: 'ATASAN' | 'KETUA_TIM' | 'ADMIN';
  assignedByName: string;
  assignedByNip: string;
  assignedAt: string;
  
  // 1. Rekan Kerja PNS
  rekanPnsNip: string;
  rekanPnsNama: string;
  rekanPnsJabatan: string;
  rekanPnsUnit: string;
  rekanPnsStatus: 'PENDING' | 'COMPLETED';
  rekanPnsScoreAvg?: number;
  rekanPnsSubmittedAt?: string;
  
  // 2. Rekan Kerja PPPK
  rekanPppkNip: string;
  rekanPppkNama: string;
  rekanPppkJabatan: string;
  rekanPppkUnit: string;
  rekanPppkStatus: 'PENDING' | 'COMPLETED';
  rekanPppkScoreAvg?: number;
  rekanPppkSubmittedAt?: string;
  
  status: 'DRAFT' | 'DITETAPKAN' | 'SELESAI';
  updatedAt: string;
}

// ============================================================
// === PENILAIAN KINERJA PPPK ENTERPRISE TYPES ===
// ============================================================

export type PPPKJenisPejabatPenilai = 'KETUA_TIM_KERJA' | 'PEJABAT_MANAJERIAL';

export type PPPKPenugasanStatus =
  | 'DRAFT'
  | 'MENUNGGU_VERIFIKASI'
  | 'DISETUJUI'
  | 'DITOLAK'
  | 'DALAM_PENILAIAN'
  | 'SELESAI'
  | 'FINAL';

export interface PPPKPenugasanPenilai {
  id: string;
  periodeId: string;
  year: number;
  tahun?: number;
  semester: PPPKSemester;
  periodeNama?: string;
  
  // PPPK yang Dinilai
  pppkDinilaiId: string; // NIP
  pppkNama: string;
  pppkNip: string;
  pppkJabatan: string;
  pppkUnitKerja: string;
  pppkPangkat?: string;

  // Pejabat Penilai Kinerja (diusulkan PPPK -> disetujui Admin)
  jenisPejabatPenilai: PPPKJenisPejabatPenilai;
  pejabatPenilaiId: string; // NIP
  pejabatPenilaiNama: string;
  pejabatPenilaiNip: string;
  pejabatPenilaiJabatan: string;
  pejabatPenilaiUnit: string;
  pejabatPenilaiPangkat?: string;

  // Atasan Pejabat Penilai (opsional / spesifik penugasan)
  atasanPejabatPenilaiId?: string; // NIP
  atasanPejabatPenilaiNama?: string;
  atasanPejabatPenilaiNip?: string;
  atasanPejabatPenilaiJabatan?: string;
  atasanPejabatPenilaiPangkat?: string;
  atasanPejabatPenilaiUnit?: string;

  // Rekan Kerja PNS (ditetapkan oleh Pejabat Penilai)
  rekanPnsId?: string; // NIP
  rekanPnsNama?: string;
  rekanPnsNip?: string;
  rekanPnsJabatan?: string;
  rekanPnsUnit?: string;

  // Rekan Kerja PPPK (ditetapkan oleh Pejabat Penilai)
  rekanPppkId?: string; // NIP
  rekanPppkNama?: string;
  rekanPppkNip?: string;
  rekanPppkJabatan?: string;
  rekanPppkUnit?: string;

  status: PPPKPenugasanStatus;
  catatanVerifikasiAdmin?: string;

  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface PPPKBuktiDukung {
  id: string;
  nama: string;
  url: string;
  fileData?: string;
  ukuran?: string;
  tipe: string;
  tanggalUpload: string;
  uploader: string;
}

export interface PPPKRhkItem {
  id: string;
  no: number;
  rencanaHasilKerja: string;
  target: number;
  satuan: string;
  realisasi: number;
  satuanRealisasi?: string;
  buktiDukung: PPPKBuktiDukung[];
  keterangan?: string;
  ratingOtomatis: 'DIATAS EKSPEKTASI' | 'SESUAI EKSPEKTASI' | 'DIBAWAH EKSPEKTASI';
  ratingManual?: 'DIATAS EKSPEKTASI' | 'SESUAI EKSPEKTASI' | 'DIBAWAH EKSPEKTASI';
  alasanRatingManual?: string;
  umpanBalikPenilai?: string;
}

export interface PPPKPenilaianHasilKerjaDoc {
  id: string;
  penugasanId: string;
  periodeId: string;
  pppkId: string; // NIP
  items: PPPKRhkItem[];
  ratingHasilKerjaFinal: 'DIATAS EKSPEKTASI' | 'SESUAI EKSPEKTASI' | 'DIBAWAH EKSPEKTASI';
  catatanPenilai?: string;
  status: 'DRAFT' | 'DIAJUKAN' | 'DINILAI' | 'FINAL';
  submittedAt?: string;
  gradedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PPPKMasterPertanyaanPerilaku {
  id: string;
  aspek:
    | 'Berorientasi Pelayanan'
    | 'Akuntabel'
    | 'Kompeten'
    | 'Harmonis'
    | 'Loyal'
    | 'Adaptif'
    | 'Kolaboratif';
  nomor: number; // 1 s.d 28
  no?: number;
  pertanyaan: string;
  perilaku?: string;
  indikator?: string;
  aktif: boolean;
  urutan: number;
}

export type PPPKRolePenilai = 'PEJABAT_PENILAI' | 'PNS_PENILAI' | 'PPPK_PENILAI';

export interface PPPKPenilaianPerilakuDoc {
  id: string;
  penugasanId: string;
  periodeId: string;
  pppkId: string; // NIP yang dinilai
  penilaiId: string; // NIP Penilai
  penilaiNama: string;
  rolePenilai: PPPKRolePenilai;
  answers: Record<string, number>; // key: question id or number, value: 1..5
  jawaban?: Record<string, number>; // alias for answers
  catatan?: string;
  status: 'DRAFT' | 'SUBMITTED';
  totalScore?: number;
  rataRataScore: number;
  submittedAt?: string;
  tanggalPenilaian?: string;
  updatedAt: string;
}

export interface PPPKAbsensiImportHeader {
  id: string;
  periodeId: string;
  namaFile: string;
  fileUrl?: string;
  fileData?: string;
  tanggalImport: string;
  importedBy: string;
  status: 'PREVIEW' | 'TERVERIFIKASI' | 'BATAL';
  totalData: number;
  errorCount: number;
  catatan?: string;
}

export interface PPPKAbsensiDetailRow {
  id: string;
  importId: string;
  nip: string;
  nama: string;
  unitKerja: string;
  jabatan?: string;
  totalHariKerja?: number;
  hariKerja?: number;
  hadir: number;
  terlambat: number;
  pulangCepat: number;
  alfa: number; // Kunci analisis alfa (0 = 5, 1-2 = 4, 3-5 = 3, 6-8 = 2, >8 = 1)
  dinasLuar: number;
  wfh: number;
  cuti: number;
  izin: number;
  sakit: number;
  skorAlfa?: number; // 1 s.d 5
  nilaiKehadiran?: number;
  kategoriAlfa?: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Sangat Kurang';
  keterangan?: string;
}

export type PPPKPresensiRow = PPPKAbsensiDetailRow;

export type PPPKRatingKinerja = 'DIATAS EKSPEKTASI' | 'SESUAI EKSPEKTASI' | 'DIBAWAH EKSPEKTASI';

export type PPPKPredikatKinerja = 'Sangat Baik' | 'Baik' | 'Butuh Perbaikan' | 'Kurang' | 'Sangat Kurang';

export type PPPKRekomendasiKinerja =
  | 'Perpanjangan Perjanjian Kinerja'
  | 'Pemutusan Perjanjian Kinerja'
  | 'Dipertahankan'
  | 'Rotasi'
  | 'Pengembangan Karir'
  | 'Bimbingan Kinerja'
  | string;

export interface PPPKEvaluasiAkhirDoc {
  id: string;
  penugasanId: string;
  periodeId: string;
  pppkId: string; // NIP
  
  // Nilai Perilaku Breakdown
  nilaiPejabat: number; // Skala 1..5
  nilaiPns: number; // Skala 1..5
  nilaiPppk: number; // Skala 1..5
  nilaiPerilakuPejabat?: number; // convenience alias
  nilaiPerilakuRekanPns?: number; // convenience alias
  nilaiPerilakuRekanPppk?: number; // convenience alias
  rataRataRekanKerja: number; // (PNS + PPPK) / 2
  bobotPejabatNilai: number; // nilaiPejabat * 0.60
  bobotRekanKerjaNilai: number; // rataRataRekanKerja * 0.40
  nilaiPerilakuPenilai: number; // bobotPejabatNilai + bobotRekanKerjaNilai
  
  // Nilai Kehadiran Breakdown
  alfaCount: number;
  nilaiKehadiran: number; // 1..5
  kategoriKehadiran: string;
  
  // Nilai Akhir Perilaku
  bobotPerilakuMurni: number; // nilaiPerilakuPenilai * 0.60
  bobotKehadiranMurni: number; // nilaiKehadiran * 0.40
  nilaiAkhirPerilaku: number; // bobotPerilakuMurni + bobotKehadiranMurni
  ratingPerilakuKerja: PPPKRatingKinerja;
  ratingPerilaku?: PPPKRatingKinerja;
  
  // Hasil Kerja Breakdown
  ratingHasilKerja: PPPKRatingKinerja;
  
  // Predikat & Rekomendasi
  predikatKinerja: PPPKPredikatKinerja;
  rekomendasi: PPPKRekomendasiKinerja[];
  catatanRekomendasi?: string;
  
  // Pejabat & Atasan
  pejabatPenilaiNama: string;
  pejabatPenilaiNip: string;
  pejabatPenilaiJabatan: string;
  pejabatPenilaiPangkat?: string;
  pejabatPenilaiUnit?: string;

  atasanPejabatPenilaiNama?: string;
  atasanPejabatPenilaiNip?: string;
  atasanPejabatPenilaiJabatan?: string;
  atasanPejabatPenilaiPangkat?: string;
  atasanPejabatPenilaiUnit?: string;

  isFinal: boolean;
  finalizedAt?: string;
  tanggalFinalisasi?: string;
  finalizedBy?: string;
  isUnlockedForCorrection?: boolean;
  alasanBukaKembali?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface PPPKAuditLogRecord {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: string;
  module: string;
  recordId: string;
  targetDoc?: string;
  remarks?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  keterangan?: string;
}

export type PPPKAuditLogEntry = PPPKAuditLogRecord;




