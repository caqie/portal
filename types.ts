
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
  KGB = 'KGB'
}

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
}

export interface CloudConfig {
  driveFolderId: string;
  appsScriptUrl: string;
  logoUrl: string;
}

export interface MaintenanceConfig {
  all: boolean;
  pages: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userNip: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DOWNLOAD' | 'LOGIN';
  module: string;
  description: string;
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
}

export interface AbsensiRecord {
  id: string;
  nip: string;
  nama: string;
  waktu: string;
  tipe: 'MASUK' | 'PULANG';
  status: 'VERIFIED' | 'REJECTED';
  lokasi: string;
  fotoAbsen: string;
  confidence: number;
}

export interface Pegawai {
  id: string;
  nip: string;
  nama: string;
  jabatan: string;
  bagian?: string;
  unitKerja: string;
  gender: 'L' | 'P';
  golRuang: string;
  jenisPegawai: 'PNS' | 'CPNS' | 'PPPK' | 'PPPK PARUH WAKTU' | 'HONORER';
  status: 'Aktif' | 'Tidak Aktif' | 'Cuti' | 'Tugas Belajar' | 'Pensiun';
  foto?: string;
  driveFolderId?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  pangkat?: string;
  tmtPangkat?: string;
  klasifikasiJabatan?: string;
  eselon?: string;
  pendidikan?: string;
  bidang?: string;
  agama?: string;
  telepon?: string;
  alamat?: string;
  tmtJabatan?: string;
  tmtStatus?: string;
}

export interface ABKAnjab {
  id: string;
  namaJabatan: string;
  unitKerja: string;
  jumlahSaatIni: number;
  totalMenitBebanKerja: number;
  jamKerjaEfektif: number; 
  kebutuhanPegawai: number;
  selisih: number;
  status: 'IDEAL' | 'KURANG' | 'LEBIH';
  // ANJAB Properti Baru
  ikhtisarJabatan?: string;
  kualifikasiPendidikan?: string;
  kualifikasiPelatihan?: string;
  pengalamanKerja?: string;
  tanggungJawab?: string;
  wewenang?: string;
  risikoBahaya?: string;
  uraianTugas: Array<{
    tugas: string;
    volume: number;
    normaWaktu: number; 
    totalWaktu: number;
  }>;
}

export interface SKP {
  id: string;
  nip: string;
  namaPegawai: string;
  tahun: number;
  nilaiKinerja: number;
  nilaiPerilaku: number;
  predikat: 'Sangat Baik' | 'Baik' | 'Butuh Perbaikan' | 'Kurang' | 'Sangat Kurang';
  fileUrl?: string;
}

export interface PAK {
  id: string;
  nip: string;
  namaPegawai: string;
  periode: string;
  jumlahKredit: number;
  keterangan: string;
  status: 'Proses' | 'Selesai';
}

export interface PAKRecord extends PAK {
  nomor: string;
  nomorKarpeg: string;
  tglDibuat: string;
  tempatDibuat: string;
  periodeMulai: string;
  periodeSelesai: string;
  jumlahBulan: number;
  predikat: string;
  hasBonusIjazah: boolean;
  prosentase: number;
  koefisien: number;
  akBaru: number;
  akDasar: number;
  akJFLama: number;
  akPenyetaraan: number;
  akKonversi: number;
  akPendidikan: number;
  rekomendasi: string;
  pejabatPenilai?: Pegawai;
  historyRows: any[];
}

export interface Pengembangan {
  id: string;
  nip: string;
  namaPegawai: string;
  namaKegiatan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jumlahJpl: number;
  penyelenggara: string;
  sertifikatUrl?: string;
}

export interface KenaikanKarir {
  id: string;
  nip: string;
  namaPegawai: string;
  jenisUsulan: 'Pangkat' | 'Jabatan';
  dari: string;
  menjadi: string;
  tmtUsulan: string;
  status: 'Usulan' | 'Verifikasi BKN' | 'Selesai';
}

export interface AdminUser {
  id: string;
  nip: string;
  name: string;
  password?: string;
  role: 'Superadmin' | 'Editor' | 'Viewer';
  foto?: string;
}

export interface TugasRutin {
  id: string;
  timestamp: string;
  bulan: string;
  tahun: number;
  jenis: TaskType;
  detail: string;
  data: any;
}

export interface Laporan {
  id: string;
  judul: string;
  jenis: 'Bulanan' | 'Triwulan' | 'Semester' | 'Tahunan';
  periode: string;
  tahun: number;
  status: 'Draft' | 'Submit' | 'Approved';
  fileUrl?: string;
  createdAt: string;
}

export interface Dossier {
  id: string;
  nip: string;
  namaPegawai: string;
  tanggal: string;
  keterangan: string;
  fileName: string;
  fileUrl?: string;
  driveFileId?: string;
}

export interface Kegiatan {
  id: string;
  tanggal: string;
  judulKegiatan: string;
  tempat: string;
  jumlahPeserta: number;
  asalPeserta: string;
  laporanSingkat: string;
  linkDriveFoto: string;
  status?: 'Direncanakan' | 'Berlangsung' | 'Selesai' | 'Dibatalkan';
}
