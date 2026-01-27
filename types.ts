
export enum TaskType {
  PELANTIKAN = 'PELANTIKAN',
  APEL = 'APEL',
  LHKPN = 'LHKPN',
  LHKASN = 'LHKASN',
  TUGAS_BELAJAR = 'TUGAS_BELBELAJAR',
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
  nomorKarpeg: string;
  tmtGolongan: string;
  tmtJabatan: string;
  predikat: string;
  prosentase: number;
  koefisien: number;
  akDiperoleh: number;
  akumulasi: Array<{
    tahun: number;
    periodik: string;
    predikat: string;
    prosentase: number;
    koefisien: number;
    ak: number;
  }>;
  akIntegrasi: number;
  akDasar: number;
  akJFLama: number;
  akPenyesuaian: number;
  akKonversi: number;
  akPendidikan: number;
  akMinPangkat: number;
  akMinJenjang: number;
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
  istriSuami: Array<{
    nama: string;
    tglLahir: string;
    tglKawin: string;
    istriKe: string;
  }>;
  anak: Array<{
    nama: string;
    tglLahir: string;
    status: 'KANDUNG' | 'TIRI' | 'ANGKAT';
    ayahIbu: string;
  }>;
  alamatSekarang: string;
  kecSekarang: string;
  provSekarang: string;
  alamatPensiun: string;
  kecPensiun: string;
  provPensiun: string;
  kodePosPensiun: string;
  pejabatNama?: string;
  pejabatNip?: string;
  riwayatKepegawaian?: {
    tmtCpns: string;
    masaKerjaTotal: string;
    pendidikanAwal: string;
  };
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
export interface SKPRecord { id: string; nip: string; namaPegawai: string; penilaiNip: string; atasanPenilaiNip: string; tahun: number; periodeMulai: string; periodeSelesai: string; tglPenilaian: string; capaianOrganisasi: string; ratingHasilKerja: string; ratingPerilaku: string; predikatKinerja: string; catatan: string; hasilKerja: HasilKerjaRow[]; perilakuKerja: PerilakuKerjaRow[]; lampiran: any; }
export interface Pegawai { id: string; nip: string; nama: string; gelar?: string; jabatan: string; unitKerja: string; gender: 'L' | 'P'; golRuang: string; jenisPegawai: string; status: string; pangkat?: string; foto?: string; tmtPangkat?: string; pendidikan?: string; alamat?: string; telepon?: string; tempatLahir?: string; tanggalLahir?: string; agama?: string; eselon?: string; tmtStatus?: string; tmtJabatan?: string; }
export interface AbsensiRecord { id: string; nip: string; nama: string; waktu: string; tipe: 'MASUK' | 'PULANG'; status: string; lokasi: string; fotoAbsen: string; confidence: number; }
export interface SpmtSppRecord { id: string; type: 'SPP' | 'SPMT'; nomor: string; pejabatNip: string; pegawaiNip: string; nomorSK: string; tentangSK: string; tanggalSK: string; jabatanBaru: string; unitKerja: string; tanggalLantikAtauSpmt: string; tanggalSppAtauSpmt: string; tempatTandaTangan: string; signatureLabel?: string; }
export interface AuditLog { id: string; timestamp: string; userNip: string; userName: string; action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DOWNLOAD' | 'LOGIN'; module: string; description: string; }
export interface ABKAnjab { id: string; namaJabatan: string; unitKerja: string; jumlahSaatIni: number; totalMenitBebanKerja: number; kebutuhanPegawai: number; selisih: number; status: 'IDEAL' | 'KURANG' | 'LEBIH'; kualifikasiPendidikan?: string; }
export interface KGB { id: string; nip: string; namaPegawai: string; tmtLama: string; tmtBaru: string; gajiLama: number; gajiBaru: number; nomorSk: string; tglSk: string; status: 'Proses' | 'Selesai'; }
