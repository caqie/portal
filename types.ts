
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
  tglPenilaian: string; 
  capaianOrganisasi: string; 
  ratingHasilKerja: string; 
  ratingPerilaku: string; 
  predikatKinerja: string; 
  catatan?: string; 
  hasilKerja: any[]; 
  perilakuKerja: any[]; 
  lampiran?: any; 
}

export interface RiwayatPendidikan {
  jenjang: string;
  institusi: string;
  jurusan: string;
  tahunLulus: string;
  nomorIjazah: string;
  fileUrl?: string;
}

export interface RiwayatJabatan {
  namaJabatan: string;
  unitKerja: string;
  tmtJabatan: string;
  nomorSk: string;
  tanggalSk: string;
  fileUrl?: string;
}

export interface RiwayatPangkat {
  golRuang: string;
  pangkat: string;
  tmtPangkat: string;
  nomorSk: string;
  tanggalSk: string;
  fileUrl?: string;
}

export interface RiwayatPelatihan {
  namaPelatihan: string;
  penyelenggara: string;
  tahun: string;
  durasi: string;
  nomorSertifikat: string;
  fileUrl?: string;
}

export interface Keluarga {
  hubungan: string;
  nama: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  pekerjaan?: string;
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
  riwayatPendidikan?: RiwayatPendidikan[];
  riwayatJabatan?: RiwayatJabatan[];
  riwayatPangkat?: RiwayatPangkat[];
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


