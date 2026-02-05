
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

export interface PersuratanRecord {
  id: string;
  jenisSurat: 'MASUK' | 'KELUAR' | 'LAPORAN' | string;
  nomorSurat: string;
  tanggalSurat: string;
  perihal: string;
  lampiran: string;
  tujuan: string; // NIP Penerima jika internal
  dari?: string;   // Nama Instansi/Orang pengirim
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

export interface SKP {
  id: string;
  nip: string;
  namaPegawai: string;
  tahun: number;
  predikatKinerja: string;
  capaianOrganisasi: string;
}

export interface PAK {
  id: string;
  nip: string;
  namaPegawai: string;
  periode: string;
  jumlahKredit: number;
  status: string;
}

export interface KenaikanKarir {
  id: string;
  nip: string;
  namaPegawai: string;
  jenisUsulan: 'PANGKAT' | 'JENJANG' | string;
  dari: string;
  menjadi: string;
  tmtUsulan: string;
  status: 'Proses' | 'Selesai' | 'Ditolak' | string;
  pjbNama?: string;
  pjbNip?: string;
  pjbJabatan?: string;
}

export interface PAKRecord {
  id: string;
  nip: string;
  namaPegawai: string;
  nomor: string;
  periode: string;
  tglDibuat: string;
  penilaiNip: string;
  status?: string;
  nomorKarpeg?: string;
  tmtGolongan?: string;
  tmtJabatan?: string;
  predikat?: string;
  prosentase?: number;
  koefisien?: number;
  akDiperoleh?: number;
  akumulasi?: any[];
  akIntegrasi?: number;
  akDasar?: number;
  akJFLama?: number;
  akPenyesuaian?: number;
  akKonversi?: number;
  akPendidikan?: number;
  akMinPangkat?: number;
  akMinJenjang?: number;
  jumlahKredit?: number;
}

export interface DPCPRecord {
  id: string;
  nip: string;
  namaPegawai: string;
  tglDibuat: string;
  instansiInduk: string;
  unitKerjaHeader: string;
  provinsi: string;
  pembayaran: string;
  kabKota: string;
  bup: string;
  tmtGolRuang: string;
  gajiPokokTerakhir: string;
  mkgTahun: string;
  mkgBulan: string;
  mkgTgl: string;
  mkpTahun: string;
  mkpBulan: string;
  mkSebelumPnsDari?: string;
  mkSebelumPnsSampai?: string;
  pendidikanDasar: string;
  pendidikanDasarTahun: string;
  mulaiMasukPns: string;
  istriSuami?: any[];
  anak?: any[];
  alamatSekarang: string;
  kecSekarang: string;
  provSekarang: string;
  alamatPensiun: string;
  kecPensiun: string;
  provPensiun: string;
  kodePosPensiun: string;
  pjbNama?: string;
  pjbNip?: string;
  pjbJabatan?: string;
  riwayatKepegawaian?: any;
}

export interface MaintenanceConfig { all: boolean; pages: string[]; }
export interface Dossier { id: string; nip: string; namaPegawai: string; tanggal: string; keterangan: string; fileName: string; fileUrl?: string; }
export interface TugasRutin { id: string; timestamp: string; bulan: string; tahun: number; jenis: TaskType; detail: string; data?: any; }
export interface Laporan { id: string; judul: string; jenis: string; periode: string; tahun: number; status: string; createdAt: string; }
export interface Kegiatan { id: string; tanggal: string; judulKegiatan: string; tempat: string; jumlahPeserta: number; asalPeserta: string; laporanSingkat: string; linkDriveFoto: string; status: 'Direncanakan' | 'Berlangsung' | 'Selesai' | 'Dibatalkan'; }
export interface AdminUser { id: string; nip: string; name: string; password?: string; role: 'Superadmin' | 'Editor' | 'Viewer'; foto?: string; }
export interface CloudConfig { driveFolderId: string; appsScriptUrl: string; logoUrl?: string; }
export interface HasilKerjaRow { rencanaPimpinan: string; rencanaPegawai: string; aspek: 'Kualitas' | 'Kuantitas' | 'Waktu' | 'Biaya'; indikator: string; target: string; realisasi: string; umpanBalik: string; }
export interface PerilakuKerjaRow { poin: string; deskripsi: string; ekspektasi: string; umpanBalik: string; }
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
  hasilKerja: HasilKerjaRow[]; 
  perilakuKerja: PerilakuKerjaRow[]; 
  lampiran?: any; 
}

export interface Pegawai { 
  id: string; 
  nip: string; 
  nama: string; 
  gelar?: string; 
  jabatan: string; 
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
  klasifikasiJabatan?: string;
  eselon?: string;
  pendidikan?: string; 
  jurusan?: string;
  agama?: string; 
  telepon?: string; 
  alamat?: string; 
  tmtStatus?: string; 
  nik?: string;
  masaKerja?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
}

export interface AbsensiRecord { id: string; nip: string; nama: string; waktu: string; tipe: 'MASUK' | 'PULANG'; status: string; lokasi: string; fotoAbsen: string; confidence: number; }
export interface SpmtSppRecord { id: string; type: 'SPP' | 'SPMT'; nomor: string; pejabatNip: string; pegawaiNip: string; nomorSK: string; tentangSK: string; tanggalSK: string; jabatanBaru: string; unitKerja: string; tanggalLantikAtauSpmt: string; tanggalSppAtauSpmt: string; tempatTandaTangan: string; signatureLabel?: string; }
export interface AuditLog { id: string; timestamp: string; userNip: string; userName: string; action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DOWNLOAD' | 'LOGIN'; module: string; description: string; }
export interface ABKAnjab { id: string; namaJabatan: string; unitKerja: string; jumlahSaatIni: number; totalMenitBebanKerja: number; kebutuhanPegawai: number; selisih: number; status: 'IDEAL' | 'KURANG' | 'LEBIH'; kualifikasiPendidikan?: string; }
export interface KGB { id: string; nip: string; namaPegawai: string; tmtLama: string; tmtBaru: string; gajiLama: number; gajiBaru: number; nomorSk: string; tglSk: string; status: 'Proses' | 'Selesai'; pjbNama?: string; pjbNip?: string; pjbJabatan?: string; }
