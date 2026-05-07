
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
export interface AuditLog { id: string; timestamp: string; userNip: string; userName: string; action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DOWNLOAD' | 'LOGIN'; module: string; description: string; }
export interface AdminUser { id: string; nip: string; name: string; password?: string; role: 'Superadmin' | 'Editor' | 'Viewer'; foto?: string; status?: 'Aktif' | 'Nonaktif'; }
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
