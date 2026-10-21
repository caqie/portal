
import { Pegawai, AdminUser, Laporan, Dossier, Pengembangan, KGB, CloudConfig, TugasRutin, Kegiatan, ABKAnjab, SpmtSppRecord, PAKRecord, MagangPKL, SKPRecord, PersuratanRecord, KenaikanKarir, SatyaLencanaRecord, KeuanganRecord, AbsensiConfig, SystemConfig, BankSoal, PesertaUkom, HasilUkom, PenilaianTalenta, TalentPool, AssessmentTalenta, NineBoxTalenta, PengembanganTalenta, PengajuanSDM, DokumenPengajuan, LogPengajuan, PesanPengajuan, MasterLayanan, MasterPetugasSDM, TupoksiSDMItem, normalizeRolesList } from './types';
import { MASTER_LAYANAN_DATA } from './layananMasterData';
import { INITIAL_TUPOKSI_SDM } from './tupoksiConstants';
import { getJabatanClassification, resolveUserPendidikan, resolvePegawaiPendidikanDanJurusan, getPangkatFromGol } from './constants';
import { getKelasJabatanPermenkumham38 } from './data/anjabAbkConstants';
import { formatDrivePhotoUrl, extractGoogleDriveFileId } from './lib/photoUtils';

const DEFAULT_SPREADSHEET_ID = '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4'; 
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby8dTUPkAb1f8EeH3DxXjTd9IZ-yAMUWxSfci9ZBLkMf3gxH3as4GlALPtER6JM-BWD/exec';
const DEFAULT_DRIVE_FOLDER_ID = '19OkO6ZAMnTXaxy-58ntHRVNI85W-u23O';

export const DEFAULT_GIDS = {
  USERS: '1215792031',
  PEGAWAI: '1631838106',
  DOSSIER: '1228512575',
  SKP: '1037719914',
  PAK: '1699747260',
  KENAIKAN: '108729233',
  PENGEMBANGAN: '747902508',
  KGB: '1233453234',
  ABSENSI: '1044338428',
  CONFIG: '398812913', 
  TUGAS_RUTIN: '457929061',
  LAPORAN: '555034467',
  KEGIATAN: '456342206',
  ABK_ANJAB: '922561147',
  PELANTIKAN: '559339264', 
  SPMT_SPP: '2105382325',
  PENSIUN: '985690424',
  MAGANG_PKL: '1436884143',
  PERSURATAN: '2080049158',
  SATYA_LENCANA: '333444555',
  KEUANGAN: '111444065',
  BANK_SOAL: '1585181979',
  PESERTA_UKOM: '2100046442',
  HASIL_UKOM: '777888999',
  UKOM_SESSIONS: '1122334455',
  PENILAIAN_TALENTA: '718101',
  TALENT_POOL: '718102',
  ASSESSMENT_TALENTA: '718103',
  NINEBOX: '718104',
  PENGEMBANGAN_TALENTA: '718105',
  MASTER_LAYANAN: '718201',
  LAYANAN_SDM: '718202',
  LAYANAN_SDM_DOKUMEN: '718203',
  LAYANAN_SDM_LOG: '718204',
  LAYANAN_SDM_PESAN: '718205',
  MASTER_PETUGAS_SDM: '718206',
  TUPOKSI_SDM: '718301',
  PPPK_EVALUATIONS: '718401',
  PPPK_PERIODS: '718402',
  PPPK_ASPECTS: '718403',
  PPPK_ASSESSMENTS: '718404',
  PPPK_ASSIGNMENTS: '718405',
  PPPK_ATTENDANCE: '718406',
  PPPK_SETTINGS: '718407',
  PPPK_AUDIT: '718408',
  DISIPLIN_LHKPN: '718501',
  TUBEL_IBEL: '718502',
  UANG_MAKAN: '718503',
  SAKIP_RB: '718504',
  ANGGARAN_DIPA: '718505',
  ACTIVITY_LOG: '718506'
};

export const EXPECTED_COLUMNS_SCHEMA = {
  USERS: ['ID', 'NIP', 'NAME', 'PASSWORD', 'ROLE', 'ROLES', 'STATUS'],
  TUPOKSI_SDM: ['ID', 'KODETUPOKSI', 'SUBTEAM', 'ROLENAME', 'JUDUL', 'DESKRIPSI', 'PERIODE', 'TARGETOUTPUT', 'STATUS', 'PROGRES', 'PENANGGUNGJAWAB', 'NIPPJ', 'DOKUMENDUKUNGURL', 'DOKUMENDUKUNGNAMA', 'APPMODULELINK', 'CATATAN', 'UPDATEDAT'],
  PEGAWAI: [
    'ID', 'NIP', 'NAMA', 'JABATAN', 'UNIT KERJA', 'GOL RUANG', 'JENIS PEGAWAI', 'STATUS',
    'GENDER', 'TEMPAT LAHIR', 'TANGGAL LAHIR', 'AGAMA', 'ALAMAT', 'JENIS JABATAN', 'KLASIFIKASI JABATAN',
    'NO HP', 'EMAIL', 'NIK', 'NPWP', 'NO BPJS', 'NO REKENING GAJI', 'NAMA BANK', 'PENDIDIKAN', 'JURUSAN',
    'PANGKAT', 'TMT PANGKAT', 'TMT JABATAN', 'TMT CPNS', 'ESELON', 'SUB BAGIAN', 'BAGIAN',
    'MASA KERJA', 'MASA KERJA GOLONGAN', 'STATUS PERKAWINAN',
    'FOTO', 'BUP', 'USIA', 'TGL PENSIUN', 'TMT PENSIUN', 'TMT PENSIUN DISPLAY', 'SISA MASA KERJA',
    'KETERANGAN PENSIUN', 'USIA PENSIUN', 'MASA KERJA PENSIUN', 'GAJI POKOK', 'RIWAYAT PENDIDIKAN',
    'RIWAYAT JABATAN', 'RIWAYAT PANGKAT', 'RIWAYAT GAJI', 'RIWAYAT PELATIHAN', 'RIWAYAT PENGHARGAAN', 'KELUARGA'
  ],
  DOSSIER: ['ID', 'NIP', 'NAMAPEGAWAI', 'FILENAME', 'FILEURL', 'KETERANGAN', 'TANGGALUPLOAD'],
  SKP: ['ID', 'NIP', 'NAMAPEGAWAI', 'TAHUN', 'PREDIKATKINERJA', 'NILAI', 'ATASANPENILAI', 'FILEURL'],
  PAK: ['ID', 'NIP', 'NAMAPEGAWAI', 'NOMOR', 'JUMLAHKREDIT', 'PERIODE', 'TANGGALSK'],
  KENAIKAN: ['ID', 'NIP', 'NAMAPEGAWAI', 'DARI', 'MENJADI', 'STATUS', 'PERIODE', 'TANGGALTMT'],
  PENGEMBANGAN: ['ID', 'NIP', 'NAMAPEGAWAI', 'NAMAKEGIATAN', 'JENISPENGEMBANGAN', 'KATEGORI', 'JUMLAHJPL', 'TAHUN', 'PENYELENGGARA', 'NOMORSERTIFIKAT', 'FILESERTIFIKATURL'],
  KGB: ['ID', 'NIP', 'NAMAPEGAWAI', 'TMTLAMA', 'TMTBARU', 'GAJIBARU', 'STATUS', 'NOMORSK', 'TANGGALSK', 'MASAKERJATAHUN', 'MASAKERJABULAN'],
  TUGAS_RUTIN: ['ID', 'TIMESTAMP', 'BULAN', 'TAHUN', 'JENIS', 'DATA'],
  KEGIATAN: ['ID', 'JUDULKEGIATAN', 'TANGGAL', 'TEMPAT', 'STATUS', 'DESKRIPSI', 'PENANGGUNGJAWAB', 'PESERTA'],
  ABK_ANJAB: ['ID', 'NAMAJABATAN', 'KODEJABATAN', 'UNITKERJA', 'JENISJABATAN', 'KELASJABATAN', 'KEBUTUHANPEGAWAI', 'JUMLAHSAATINI', 'IKHTISARJABATAN', 'PENDIDIKANFORMAL', 'DIKLAT', 'PENGALAMANKERJA', 'URAIANTUGAS'],
  PELANTIKAN: ['ID', 'NOMOR', 'ASNNIP', 'TANGGALPELANTIKAN', 'JABATANBARU', 'DATA'],
  PENSIUN: ['ID', 'NIP', 'NAMAPEGAWAI', 'TMTPENSIUN', 'JENISPENSIUN', 'STATUS', 'DATA'],
  MAGANG_PKL: ['ID', 'NAMA', 'NISNIM', 'INSTITUSI', 'JURUSAN', 'JENIS', 'TANGGALMULAI', 'TANGGALSELESAI', 'PENEMPATAN', 'STATUS', 'NOMORSURAT'],
  PERSURATAN: ['ID', 'JENISSURAT', 'NOMORSURAT', 'TANGGALSURAT', 'PERIHAL', 'LAMPIRAN', 'TUJUAN', 'DARI', 'ISIRINGKAS', 'PJBNAMA', 'PJBNIP', 'PJBJABATAN', 'STATUS', 'FILEURL', 'PRIORITAS'],
  SATYA_LENCANA: ['ID', 'NIP', 'NAMAPEGAWAI', 'KATEGORI', 'TAHUNTERIMA', 'NOMORKEPPRES', 'FILESERTIFIKATURL'],
  KEUANGAN: ['ID', 'NAMAKEGIATAN', 'TANGGAL', 'STATUS', 'MATAANGGARAN', 'TAHUNANGGARAN', 'PPKNIP', 'PPKNAMA', 'BENDAHARANIP', 'BENDAHARANAMA', 'UNITKERJA', 'KETERANGAN', 'TRANSACTIONID', 'KOTATTD', 'TANGGALDOKUMEN', 'PESERTA', 'CONFIGBIAYA', 'CONFIGSPD'],
  BANK_SOAL: ['IDSOAL', 'PERTANYAAN', 'OPSIA', 'OPSIB', 'OPSIC', 'OPSID', 'JAWABANBENAR', 'KATEGORI'],
  PESERTA_UKOM: ['NOPESERTA', 'NIP', 'NAMA', 'JENJANG', 'RUANGUJIAN', 'JADWAL', 'ISLOCKED', 'UNLOCKPASSWORD'],
  HASIL_UKOM: ['NOPESERTA', 'NIP', 'NAMA', 'NILAI', 'NILAITKP', 'TOTALNILAI', 'STATUSLULUS', 'TANGGALUJIAN', 'WAKTUSELESAI', 'ESSAYANSWERS', 'CATATAN'],
  UKOM_SESSIONS: ['ID', 'NAMASESI', 'TANGGAL', 'WAKTUMULAI', 'WAKTUSELESAI', 'SUPERVISORNIPS', 'PESERTAIDS', 'STATUS'],
  PENILAIAN_TALENTA: ['ID', 'PEGAWAI_ID', 'NILAI_SKP', 'KOMPETENSI', 'INTEGRITAS', 'DISIPLIN', 'LEADERSHIP', 'TEAMWORK', 'INOVASI', 'KOMUNIKASI', 'PENDIDIKAN', 'PENGALAMAN', 'TOTAL_NILAI', 'KATEGORI_TALENTA', 'CREATED_AT'],
  TALENT_POOL: ['ID', 'PEGAWAI_ID', 'RANKING', 'STATUS_TALENTA', 'READINESS_LEVEL', 'REKOMENDASI_JABATAN', 'CREATED_AT'],
  ASSESSMENT_TALENTA: ['ID', 'PEGAWAI_ID', 'HASIL_ASSESSMENT', 'POTENSI', 'KOMPETENSI', 'ASSESSOR', 'CATATAN', 'TANGGAL_ASSESSMENT'],
  NINEBOX: ['ID', 'PEGAWAI_ID', 'KINERJA', 'POTENSI', 'POSISI_BOX', 'REKOMENDASI'],
  PENGEMBANGAN_TALENTA: ['ID', 'PEGAWAI_ID', 'JENIS_PENGEMBANGAN', 'NAMA_PELATIHAN', 'PENYELENGGARA', 'TANGGAL_MULAI', 'TANGGAL_SELESAI', 'STATUS'],
  MASTER_LAYANAN: ['ID', 'KODELAYANAN', 'KATEGORI', 'NAMALAYANAN', 'DESKRIPSI', 'AKTIF', 'SLAHARI', 'ICON', 'FIELDS', 'REQUIREDDOCUMENTS', 'ROLEPETUGAS', 'URUTAN'],
  LAYANAN_SDM: ['ID', 'NOMORTIKET', 'NIP', 'NAMA', 'UNITKERJA', 'JABATAN', 'PANGKAT', 'STATUSKEPEGAWAIAN', 'EMAIL', 'NOHP', 'KATEGORI', 'IDLAYANAN', 'NAMALAYANAN', 'TANGGALPENGAJUAN', 'STATUS', 'PRIORITAS', 'PETUGASID', 'PETUGASNAMA', 'KETERANGAN', 'DATAFORM', 'CATATANVERIFIKATOR', 'CATATANPERBAIKAN', 'ALASANPENOLAKAN', 'HASIL', 'LINKHASIL', 'NOMORSURATHASIL', 'FILEHASILURL', 'TANGGALSELESAI', 'CREATEDAT', 'UPDATEDAT'],
  LAYANAN_SDM_DOKUMEN: ['ID', 'IDPENGAJUAN', 'NOMORTIKET', 'NAMADOKUMEN', 'JENISDOKUMEN', 'FILEID', 'FILENAME', 'FILEURL', 'FILEBASE64', 'MIMETYPE', 'SIZE', 'UPLOADEDBY', 'UPLOADEDAT', 'VERSI', 'AKTIF'],
  LAYANAN_SDM_LOG: ['ID', 'IDPENGAJUAN', 'NOMORTIKET', 'TIMESTAMP', 'NIPUSER', 'NAMAUSER', 'ROLE', 'STATUSLAMA', 'STATUSBARU', 'CATATAN'],
  LAYANAN_SDM_PESAN: ['ID', 'IDPENGAJUAN', 'NOMORTIKET', 'PENGIRIMNIP', 'PENGIRIMNAMA', 'ROLE', 'PESAN', 'FILEID', 'FILEURL', 'FILENAME', 'TIMESTAMP', 'DIBACA'],
  MASTER_PETUGAS_SDM: ['ID', 'NIP', 'NAMA', 'UNIT', 'ROLE', 'AKTIF', 'JENISLAYANAN'],
  ABSENSI: ['ID', 'NIP', 'NAMA', 'TANGGAL', 'WAKTU', 'TIPE', 'STATUS', 'LOKASI', 'CONFIDENCE', 'SIMPEGSTATUS', 'SIMPEGERROR', 'LATITUDE', 'LONGITUDE', 'OFFICENAME', 'DISTANCEMETERS', 'FOTOURL'],
  LAPORAN: ['ID', 'JUDUL', 'PERIODE', 'JENIS', 'STATUS', 'FILEURL', 'CREATED_AT'],
  CONFIG: ['KEY', 'VALUE', 'CATEGORY', 'UPDATED_AT', 'UPDATED_BY'],
  SPMT_SPP: ['ID', 'TYPE', 'NOMOR', 'PEGAWAINIP', 'TANGGAL', 'JABATANLAMA', 'JABATANBARU', 'UNITKERJA', 'FILEURL'],
  PPPK_EVALUATIONS: ['ID', 'EMPLOYEE_ID', 'PERIOD_ID', 'STATUS', 'SKP_SCORE', 'BEHAVIOR_360_SCORE', 'ATTENDANCE_SCORE', 'FINAL_SCORE', 'CATEGORY', 'IS_RECOMMENDED_EXTENSION', 'SNAPSHOT', 'CREATED_AT', 'UPDATED_AT'],
  PPPK_PERIODS: ['ID', 'YEAR', 'SEMESTER', 'NAME', 'START_DATE', 'END_DATE', 'IS_ACTIVE', 'IS_CLOSED'],
  PPPK_ASPECTS: ['ID', 'NAME', 'DESCRIPTION', 'WEIGHT', 'IS_ACTIVE', 'SORT_ORDER'],
  PPPK_ASSESSMENTS: ['ID', 'EVALUATION_ID', 'ASPECT_ID', 'ASSESSOR_ID', 'ASSESSOR_TYPE', 'SCORE', 'NOTES', 'CREATED_AT'],
  PPPK_ASSIGNMENTS: ['ID', 'PERIOD_ID', 'EMPLOYEE_ID', 'SUPERVISOR_ID', 'STATUS', 'APPROVAL_STATUS'],
  PPPK_ATTENDANCE: ['ID', 'EMPLOYEE_ID', 'PERIOD_ID', 'TOTAL_WORKING_DAYS', 'PRESENT_DAYS', 'LATE_DAYS', 'ABSENT_DAYS', 'LEAVE_DAYS', 'SCORE', 'SYNCED_AT'],
  PPPK_SETTINGS: ['ID', 'SKP_WEIGHT', 'BEHAVIOR_WEIGHT', 'ATTENDANCE_WEIGHT', 'MIN_RECOMMEND_SCORE', 'AUTO_SYNC_ATTENDANCE', 'UPDATED_AT'],
  PPPK_AUDIT: ['ID', 'EVALUATION_ID', 'ACTION', 'ACTOR_ID', 'ACTOR_NAME', 'DETAILS', 'TIMESTAMP'],
  DISIPLIN_LHKPN: ['ID', 'NIP', 'NAMA', 'UNITKERJA', 'JABATAN', 'JENIS', 'TAHUN', 'STATUS', 'TANGGAL_LAPOR', 'BUKTI_URL', 'KETERANGAN'],
  TUBEL_IBEL: ['ID', 'NIP', 'NAMA', 'JENIS', 'INSTITUSI', 'JURUSAN', 'JENJANG', 'TAHUN_MULAI', 'TAHUN_SELESAI', 'STATUS', 'NOMOR_SK', 'FILE_URL'],
  UANG_MAKAN: ['ID', 'NIP', 'NAMA', 'BULAN', 'TAHUN', 'GOLONGAN', 'HARI_KERJA', 'TARIF', 'TOTAL_BRUTO', 'PPH', 'TOTAL_NETTO', 'STATUS_BAYAR'],
  SAKIP_RB: ['ID', 'TAHUN', 'INDIKATOR', 'TARGET', 'REALISASI', 'CAPAIAN', 'STATUS', 'UNITKERJA', 'EVIDENCE_URL'],
  ANGGARAN_DIPA: ['ID', 'KODE_MAK', 'URAIAN', 'PAGU', 'REALISASI', 'SISA', 'PERSENTASE', 'TAHUN_ANGGARAN', 'UNITKERJA'],
  ACTIVITY_LOG: ['ID', 'TIMESTAMP', 'USER_NIP', 'USER_NAME', 'ACTION', 'MODULE', 'DETAILS', 'IP_ADDRESS']
};

const getDbConfig = () => {
  const savedId = localStorage.getItem('db_spreadsheet_id');
  const savedCloud = localStorage.getItem('portal_cloud_config');
  let cloud: CloudConfig;
  try {
    cloud = savedCloud ? JSON.parse(savedCloud) : { driveFolderId: DEFAULT_DRIVE_FOLDER_ID, appsScriptUrl: (import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL), logoUrl: '' };
  } catch (e) {
    cloud = { driveFolderId: DEFAULT_DRIVE_FOLDER_ID, appsScriptUrl: (import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL), logoUrl: '' };
  }
  return {
    spreadsheetId: (savedId && savedId.trim() !== '') ? savedId : (import.meta.env.VITE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID),
    appsScriptUrl: (cloud.appsScriptUrl && cloud.appsScriptUrl.trim() !== '') ? cloud.appsScriptUrl : (import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL),
    driveFolderId: cloud.driveFolderId || DEFAULT_DRIVE_FOLDER_ID
  };
};

let backendAvailable: boolean | null = null;
let backendCheckPromise: Promise<boolean> | null = null;

export const checkBackend = async (): Promise<boolean> => {
  if (backendAvailable !== null) return backendAvailable;
  if (backendCheckPromise) return backendCheckPromise;

  backendCheckPromise = (async () => {
    try {
      const res = await fetch('/api/health', { method: 'GET', cache: 'no-cache' });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.status === 'ok') {
            backendAvailable = true;
            return true;
          }
        }
      }
    } catch (e) {}
    backendAvailable = false;
    return false;
  })();

  return backendCheckPromise;
};

export const parseDateToYYYYMMDD = (val: any): string => {
  if (!val) return '';
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  }

  let str = String(val).trim();
  if (!str) return '';

  str = str.replace(/\s+/g, ' ');

  // 1. If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. If contains 'T', ISO format
  if (str.includes('T')) {
    try {
      const parsedDate = new Date(str);
      if (!isNaN(parsedDate.getTime())) {
        const formatter = new Intl.DateTimeFormat('en-CA', { 
          timeZone: 'Asia/Jakarta', 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });
        const parts = formatter.format(parsedDate);
        if (/^\d{4}-\d{2}-\d{2}$/.test(parts)) return parts;
      }
    } catch (e) {}
    const part = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
  }

  // 3. Remove time suffix if space present but not Indonesian text date
  const spaceParts = str.split(' ');
  if (spaceParts.length > 1) {
    const hasLetters = /[a-zA-Z]/.test(str);
    if (!hasLetters) {
      const firstPart = spaceParts[0];
      const p = firstPart.split(/[-/]/);
      if (p.length === 3) {
        let day = p[0];
        let month = p[1];
        let year = p[2];
        if (year.length === 4 && day.length <= 2 && month.length <= 2) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        if (day.length === 4 && month.length <= 2 && year.length <= 2) {
          return `${day}-${month.padStart(2, '0')}-${year.padStart(2, '0')}`;
        }
      }
    }
  }

  // 4. Indonesian text date with words, e.g. "17 Agustus 1945" or "17-Agt-1945"
  const parts = str.split(/[\s\-\/,]+/);
  if (parts.length >= 3) {
    const yearIdx = parts.findIndex(p => /^\d{4}$/.test(p));
    if (yearIdx !== -1) {
      const year = parts[yearIdx];
      let dayVal = '';
      let monthVal = '';

      if (yearIdx === 2) {
        dayVal = parts[0];
        monthVal = parts[1];
      } else if (yearIdx === 0) {
        monthVal = parts[1];
        dayVal = parts[2];
      }

      if (dayVal && monthVal) {
        const dayNum = parseInt(dayVal.replace(/\D/g, ''));
        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
          const dayStr = String(dayNum).padStart(2, '0');
          let monthStr = '';
          const monthClean = monthVal.toLowerCase().replace(/[^a-z0-9]/g, '');

          if (/^\d+$/.test(monthClean)) {
            const mNum = parseInt(monthClean);
            if (mNum >= 1 && mNum <= 12) {
              monthStr = String(mNum).padStart(2, '0');
            }
          } else {
            if (monthClean.startsWith('jan')) monthStr = '01';
            else if (monthClean.startsWith('feb') || monthClean.startsWith('peb')) monthStr = '02';
            else if (monthClean.startsWith('mar')) monthStr = '03';
            else if (monthClean.startsWith('apr')) monthStr = '04';
            else if (monthClean.startsWith('mei') || monthClean === 'may') monthStr = '05';
            else if (monthClean.startsWith('jun')) monthStr = '06';
            else if (monthClean.startsWith('jul')) monthStr = '07';
            else if (monthClean.startsWith('agu') || monthClean.startsWith('agt') || monthClean.startsWith('aug')) monthStr = '08';
            else if (monthClean.startsWith('sep')) monthStr = '09';
            else if (monthClean.startsWith('okt') || monthClean.startsWith('oct')) monthStr = '10';
            else if (monthClean.startsWith('nov') || monthClean.startsWith('nop')) monthStr = '11';
            else if (monthClean.startsWith('des') || monthClean.startsWith('dec')) monthStr = '12';
          }

          if (monthStr) {
            return `${year}-${monthStr}-${dayStr}`;
          }
        }
      }
    }
  }

  // 5. Standard fallback for simple slashes/hyphens (e.g. 17/08/1945)
  const simpleParts = str.split(/[-/]/);
  if (simpleParts.length === 3) {
    let part0 = simpleParts[0].trim();
    let part1 = simpleParts[1].trim();
    let part2 = simpleParts[2].trim();

    if (/^\d{4}$/.test(part2)) {
      const d = parseInt(part0);
      const m = parseInt(part1);
      if (!isNaN(d) && !isNaN(m) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return `${part2}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    if (/^\d{4}$/.test(part0)) {
      const m = parseInt(part1);
      const d = parseInt(part2);
      if (!isNaN(d) && !isNaN(m) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return `${part0}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  // 6. JS Date fallback
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) {}

  return '';
};

/**
 * Formats any date value (ISO string, Date instance, YYYY-MM-DD, etc.) into DD/MM/YYYY format
 * expected by Google Spreadsheet database columns (e.g. "23/01/2025").
 */
export const formatDateToDDMMYYYY = (val: any): string => {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const str = String(val).trim();
  if (!str) return '';

  // If already DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const d = ddmmyyyyMatch[1].padStart(2, '0');
    const m = ddmmyyyyMatch[2].padStart(2, '0');
    const y = ddmmyyyyMatch[3];
    return `${d}/${m}/${y}`;
  }

  // If ISO string with T, e.g. "2025-01-23T17:00:00.000Z"
  if (str.includes('T')) {
    const rawDatePart = str.split('T')[0];
    const p = rawDatePart.split('-');
    if (p.length === 3 && p[0].length === 4) {
      return `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`;
    }
  }

  // Parse to YYYY-MM-DD using robust parser
  const ymd = parseDateToYYYYMMDD(val);
  if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
  }

  return str;
};

export const loadSharedConfigFromServer = async (): Promise<void> => {
  try {
    const savedId = localStorage.getItem('db_spreadsheet_id');
    const savedCloud = localStorage.getItem('portal_cloud_config');
    
    const viteId = import.meta.env.VITE_SPREADSHEET_ID;
    const hasViteId = viteId && viteId.trim() !== '' && viteId !== DEFAULT_SPREADSHEET_ID;
    
    // Check if the current client state has a custom (non-default and non-empty) Google Spreadsheet ID
    const hasCustomLocalId = savedId && savedId.trim() !== '' && savedId !== DEFAULT_SPREADSHEET_ID;
    
    const res = await fetch('/api/spreadsheet-config');
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Not running with a Node.js backend (likely static hosting like Apache/cPanel), abort silently
        return;
      }

      const data = await res.json();
      const isServerEmptyOrDefault = !data.spreadsheetId || data.spreadsheetId === DEFAULT_SPREADSHEET_ID;
      
      // Case A: Server is fresh or has default fallback, but browser has a custom configurated ID OR there is a custom compiled build ID.
      // We automatically register this ID on the server in the background so that it is shared globally!
      if (isServerEmptyOrDefault && (hasCustomLocalId || hasViteId)) {
        const activeId = hasCustomLocalId ? savedId! : viteId!;
        let cloudConfig = { 
          appsScriptUrl: import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL, 
          driveFolderId: import.meta.env.VITE_DRIVE_FOLDER_ID || DEFAULT_DRIVE_FOLDER_ID 
        };
        try {
          if (savedCloud) {
            const parsed = JSON.parse(savedCloud);
            if (parsed.appsScriptUrl) cloudConfig.appsScriptUrl = parsed.appsScriptUrl;
            if (parsed.driveFolderId) cloudConfig.driveFolderId = parsed.driveFolderId;
          }
        } catch (e) {}
        
        await saveSharedConfigToServer(activeId, cloudConfig.appsScriptUrl, cloudConfig.driveFolderId);
        console.log("[Config Sync] Push local/Vite configs to server successfully!");
        
        // Ensure localStorage doesn't store the default sheet ID if it was just fallback
        if (!hasCustomLocalId) {
          localStorage.removeItem('db_spreadsheet_id');
          localStorage.removeItem('portal_cloud_config');
        }
        return;
      }

      // Case B: Server has a custom configurated ID.
      // We force-pull it into the current client's localStorage so that all users have the correct database ID automatically!
      if (data.spreadsheetId && data.spreadsheetId !== DEFAULT_SPREADSHEET_ID) {
        const localId = localStorage.getItem('db_spreadsheet_id');
        const localCloudStr = localStorage.getItem('portal_cloud_config');
        const remoteCloudStr = JSON.stringify({
          appsScriptUrl: data.appsScriptUrl,
          driveFolderId: data.driveFolderId
        });
        
        if (localId !== data.spreadsheetId || localCloudStr !== remoteCloudStr) {
          localStorage.setItem('db_spreadsheet_id', data.spreadsheetId);
          localStorage.setItem('portal_cloud_config', remoteCloudStr);
          window.dispatchEvent(new Event('storage_updated'));
          console.log("[Config Sync] Loaded correct spreadsheet config from shared server storage.");
        }
      } else {
        // If server returns default values, let's remove default or matching localStorage overrides 
        // to let the client-side VITE_SPREADSHEET_ID environmental variable take precedence organically.
        if (savedId === DEFAULT_SPREADSHEET_ID) {
          localStorage.removeItem('db_spreadsheet_id');
          localStorage.removeItem('portal_cloud_config');
          window.dispatchEvent(new Event('storage_updated'));
        }
      }
    }
  } catch (e) {
    // Fail silently or with standard message to avoid breaking client SPA in static environments
    console.log("No cloud database shared config backend detected or accessible. Using local environment configurations.");
  }
};

export const saveSharedConfigToServer = async (
  spreadsheetId: string, 
  appsScriptUrl: string, 
  driveFolderId: string
): Promise<boolean> => {
  try {
    const res = await fetch('/api/spreadsheet-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId, appsScriptUrl, driveFolderId })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

const extractErrorMessageFromHtml = (html: string): string => {
  if (!html) return "No response text received.";
  const match = html.match(/class=["']errorMessage["'][^>]*>([\s\S]*?)<\/div>/i);
  if (match && match[1]) {
    return match[1].replace(/<[^>]*>/g, '').trim();
  }
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    const cleanBody = bodyMatch[1].replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                                  .replace(/<[^>]*>/g, '')
                                  .trim();
    if (cleanBody.length > 0) {
      return cleanBody.substring(0, 300).replace(/\s+/g, ' ');
    }
  }
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return `Error: ${titleMatch[1].trim()}`;
  }
  return "Unknown HTML response from server.";
};

// Storage key mapping for all portal modules
const STORAGE_KEY_MAP: Record<string, string> = {
  'PEGAWAI': 'portal_pegawai_db',
  'PENGEMBANGAN': 'portal_pengembangan_db',
  'KGB': 'portal_kgb_db',
  'KEGIATAN': 'kegiatan_db',
  'DOSSIER': 'portal_dossiers_db',
  'USERS': 'portal_users_db',
  'CONFIG': 'portal_config_db',
  'SATYA_LENCANA': 'satya_lencana_db',
  'ABK_ANJAB': 'abk_db',
  'PERSURATAN': 'portal_persuratan_db',
  'SKP': 'skp_db',
  'MAGANG_PKL': 'portal_magang_db',
  'TUGAS_RUTIN': 'tugas_rutin_db',
  'PELANTIKAN': 'pelantikan_db',
  'PENSIUN': 'pensiun_db',
  'PAK': 'pak_db',
  'SPMT_SPP': 'spmt_spp_db',
  'KENAIKAN': 'kenaikan_db',
  'KEUANGAN': 'portal_keuangan_db',
  'ABSENSI': 'portal_absensi_history_db',
  'PESERTA_UKOM': 'ukom_peserta',
  'HASIL_UKOM': 'ukom_hasil',
  'BANK_SOAL': 'ukom_bank_soal',
  'UKOM_SESSIONS': 'ukom_sessions',
  'PENILAIAN_TALENTA': 'talenta_penilaian_db',
  'TALENT_POOL': 'talenta_talent_pool_db',
  'ASSESSMENT_TALENTA': 'talenta_assessment_db',
  'NINEBOX': 'talenta_ninebox_db',
  'PENGEMBANGAN_TALENTA': 'talenta_pengembangan_db',
  'MASTER_LAYANAN': 'master_layanan_db',
  'LAYANAN_SDM': 'layanan_sdm_db',
  'LAYANAN_SDM_DOKUMEN': 'layanan_sdm_dokumen_db',
  'LAYANAN_SDM_LOG': 'layanan_sdm_log_db',
  'LAYANAN_SDM_PESAN': 'layanan_sdm_pesan_db',
  'MASTER_PETUGAS_SDM': 'master_petugas_sdm_db',
  'TUPOKSI_SDM': 'tupoksi_sdm_db',
  'LAPORAN': 'portal_laporan_db',
  'PPPK_EVALUATIONS': 'portal_pppk_evaluations',
  'PPPK_PERIODS': 'portal_pppk_evaluation_periods',
  'PPPK_ASPECTS': 'portal_pppk_behavior_aspects',
  'PPPK_ASSESSMENTS': 'portal_pppk_behavior_assessments',
  'PPPK_ASSIGNMENTS': 'portal_pppk_evaluation_assignments',
  'PPPK_ATTENDANCE': 'portal_pppk_attendance_evaluations',
  'PPPK_SETTINGS': 'portal_pppk_config_settings',
  'PPPK_AUDIT': 'portal_pppk_audit_logs',
  'DISIPLIN_LHKPN': 'portal_disiplin_lhkpn_db',
  'TUBEL_IBEL': 'portal_tubel_ibel_db',
  'UANG_MAKAN': 'portal_uang_makan_db',
  'SAKIP_RB': 'portal_sakip_rb_db',
  'ANGGARAN_DIPA': 'portal_anggaran_dipa_db',
  'ACTIVITY_LOG': 'portal_audit_logs'
};

/**
 * Safely writes array data to localStorage without throwing QuotaExceededError.
 * If quota is reached, automatically purges disposable/duplicate caches,
 * trims oversized data URLs for the cache copy, and never breaks network fetch execution.
 */
// Active session in-memory cache for ultra-fast (0ms) data retrieval across the application
export const inMemoryCache: Record<string, any[]> = {};

const IDB_TABLES_DB = 'PortalSdmTablesCacheDB';
const IDB_TABLES_STORE = 'tables_data';

const openTablesDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not supported'));
    const req = indexedDB.open(IDB_TABLES_DB, 1);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_TABLES_STORE)) {
        db.createObjectStore(IDB_TABLES_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const saveTableToIndexedDb = async (key: string, data: any[]): Promise<void> => {
  try {
    const db = await openTablesDb();
    const tx = db.transaction(IDB_TABLES_STORE, 'readwrite');
    const store = tx.objectStore(IDB_TABLES_STORE);
    store.put({ key, data, updatedAt: Date.now() });
  } catch (err) {}
};

export const getTableFromIndexedDb = async <T>(key: string): Promise<T[] | null> => {
  try {
    const db = await openTablesDb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_TABLES_STORE, 'readonly');
      const store = tx.objectStore(IDB_TABLES_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.data) && req.result.data.length > 0) {
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
};

/**
 * Safely writes array data to localStorage without throwing QuotaExceededError.
 * Keeps full records in inMemoryCache and IndexedDB (virtually unlimited quota),
 * and creates a lightweight index for localStorage to stay well below browser quotas.
 */
export const safeSaveToCache = <T>(storageKey: string, data: T[]): void => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    delete inMemoryCache[storageKey];
    try { localStorage.removeItem(storageKey); } catch (e) {}
    return;
  }

  // 1. Keep full dataset in memory (0ms access)
  inMemoryCache[storageKey] = data;

  // 2. Persist full dataset to IndexedDB (virtually unlimited storage)
  try {
    saveTableToIndexedDb(storageKey, data);
  } catch (idbErr) {}

  // 3. Immediately prune redundant legacy key
  try {
    localStorage.removeItem('portal_sdm_pegawai_db');
  } catch (e) {}

  const trySet = (payload: any[]): boolean => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      return true;
    } catch (err) {
      return false;
    }
  };

  // For massive collections (like portal_pegawai_db with 600+ records and histories):
  // Never attempt to write the full multi-megabyte record to localStorage directly,
  // because browser localStorage is capped at 5MB across the entire domain.
  if (storageKey === 'portal_pegawai_db') {
    try {
      const lightweight = data.map((item: any) => {
        if (!item || typeof item !== 'object') return item;
        const { riwayatJabatan, riwayatPendidikan, riwayatPangkat, riwayatGaji, riwayatPelatihan, riwayatPenghargaan, keluarga, ...core } = item;
        let safeFoto = core.foto;
        if (typeof safeFoto === 'string' && (safeFoto.startsWith('data:') || safeFoto.length > 300)) {
          safeFoto = '';
        }
        return {
          ...core,
          foto: safeFoto,
          riwayatJabatan: Array.isArray(riwayatJabatan) ? riwayatJabatan.slice(0, 1) : [],
          riwayatPendidikan: Array.isArray(riwayatPendidikan) ? riwayatPendidikan.slice(0, 1) : [],
          riwayatPangkat: Array.isArray(riwayatPangkat) ? riwayatPangkat.slice(0, 1) : []
        };
      });

      if (trySet(lightweight)) return;

      // If even lightweight exceeds quota, prune disposable storage and retry
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('error_module_') || k.startsWith('simpeg_import_') || k.startsWith('heal_backup_') || k.startsWith('absen_pdf_'))) {
          try { localStorage.removeItem(k); } catch (e) {}
        }
      }

      if (trySet(lightweight)) return;

      // Ultra-compact index: core identification fields only
      const ultraCompact = data.map((item: any) => ({
        id: item?.id || '',
        nip: item?.nip || '',
        nama: item?.nama || '',
        jabatan: item?.jabatan || '',
        unitKerja: item?.unitKerja || '',
        golRuang: item?.golRuang || '',
        status: item?.status || 'Aktif',
        jenisPegawai: item?.jenisPegawai || 'PNS'
      }));

      if (trySet(ultraCompact)) return;

      // If still exceeding, remove localStorage copy and rely on inMemoryCache & IndexedDB
      try { localStorage.removeItem(storageKey); } catch (e) {}
      return;
    } catch (e) {
      try { localStorage.removeItem(storageKey); } catch (_) {}
      return;
    }
  }

  // Attempt direct save for other regular tables
  if (trySet(data)) return;

  // Prune disposable keys if quota exceeded
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('error_module_') || k.startsWith('simpeg_import_') || k.startsWith('heal_backup_') || k.startsWith('absen_pdf_'))) {
        try { localStorage.removeItem(k); } catch (e) {}
      }
    }
    if (!trySet(data)) {
      try { localStorage.removeItem(storageKey); } catch (e) {}
    }
  } catch (e) {}
};

export const applyLocalCacheUpdate = (moduleName: string, action: 'SAVE' | 'DELETE', data: any) => {
  const key = STORAGE_KEY_MAP[moduleName.toUpperCase().trim()];
  if (!key || !data) return;
  try {
    const cached = localStorage.getItem(key);
    const parsed = cached ? JSON.parse(cached) : [];
    if (Array.isArray(parsed)) {
      if (action === 'SAVE') {
        let itemToSave = { ...data };
        if (moduleName.toUpperCase().trim() === 'USERS') {
          const rolesList = normalizeRolesList(itemToSave.roles, itemToSave.role);
          itemToSave.roles = rolesList;
          itemToSave.role = itemToSave.role || rolesList[0] || 'Viewer';
        }
        const cleanDigits = (val: any) => String(val || '').replace(/\D/g, '');
        const isPegawai = moduleName.toUpperCase().trim() === 'PEGAWAI';

        const index = parsed.findIndex((item: any) => {
          if (isPegawai) {
            const itemNip = cleanDigits(item.nip);
            const saveNip = cleanDigits(itemToSave.nip);
            if (itemNip && saveNip && itemNip === saveNip) return true;
          }
          return (
            (item.id && itemToSave.id && String(item.id) === String(itemToSave.id)) || 
            (item.nip && itemToSave.nip && cleanDigits(item.nip) === cleanDigits(itemToSave.nip)) ||
            (item.noPeserta && itemToSave.noPeserta && String(item.noPeserta) === String(itemToSave.noPeserta))
          );
        });
        if (index !== -1) {
          parsed[index] = { ...parsed[index], ...itemToSave };
        } else {
          parsed.push(itemToSave);
        }
        safeSaveToCache(key, parsed);
      } else if (action === 'DELETE') {
        const cleanDigits = (val: any) => String(val || '').replace(/\D/g, '');
        const isPegawai = moduleName.toUpperCase().trim() === 'PEGAWAI';

        const filtered = parsed.filter((item: any) => {
          if (isPegawai) {
            const itemNip = cleanDigits(item.nip);
            const delNip = cleanDigits(data.nip);
            if (itemNip && delNip && itemNip === delNip) return false;
          }
          return !(
            (item.id && data.id && String(item.id) === String(data.id)) || 
            (item.nip && data.nip && cleanDigits(item.nip) === cleanDigits(data.nip)) ||
            (item.noPeserta && data.noPeserta && String(item.noPeserta) === String(data.noPeserta))
          );
        });
        safeSaveToCache(key, filtered);
      }
    }
  } catch (e) {
    console.warn(`Local cache update warning for ${moduleName}:`, e);
  }
};

export const syncTableRemote = async (moduleName: string, action: 'SAVE' | 'DELETE', data: any): Promise<boolean> => {
  // Always update local cache optimistically so the UI is immediately responsive
  applyLocalCacheUpdate(moduleName, action, data);

  const { appsScriptUrl, spreadsheetId, driveFolderId } = getDbConfig();
  if (!appsScriptUrl || appsScriptUrl.trim() === '') {
    // Stored locally, remote not configured
    return true;
  }
  
  // Validation for DELETE action
  if (action === 'DELETE' && !data?.id && !data?.nip && !data?.nama && !data?.noPeserta) {
    console.warn(`Sync blocked: Action DELETE for module ${moduleName} requires id, nip, noPeserta, or nama. Received:`, data);
    return false;
  }

  // Normalize fields for PEGAWAI module to prevent Spreadsheet Validation violations
  let finalData = data;
  if (moduleName.toUpperCase().trim() === 'PEGAWAI' && action === 'SAVE' && data) {
    finalData = { ...data };
    
    // Resolve pendidikan & jurusan from riwayatPendidikan or gelar terakhir
    const resolvedEdu = resolvePegawaiPendidikanDanJurusan(finalData);
    if (resolvedEdu.pendidikan) finalData.pendidikan = resolvedEdu.pendidikan;
    if (resolvedEdu.jurusan) finalData.jurusan = resolvedEdu.jurusan;

    if (finalData.foto) {
      finalData.foto = formatDrivePhotoUrl(finalData.foto);
    }

    const normalizePendidikan = (val: any): string => {
      if (!val) return "";
      const s = String(val).trim().toUpperCase();
      if (s.startsWith("SD") || s === "SD/SEDERAJAT") return "SD";
      if (s.startsWith("SLTA") || s.startsWith("SMA") || s.startsWith("SMK") || s.startsWith("MAN") || s === "SLTP" || s === "SMP") return "SLTA";
      if (s === "D-III" || s === "D3" || s === "D III" || s === "D-3" || s === "DIII") return "DIII";
      if (s === "D-IV" || s === "D4" || s === "D IV" || s === "D-4" || s === "DIV") return "D IV";
      if (s === "S-1" || s === "S1" || s === "S 1" || s === "SARJANA") return "S1";
      if (s === "S-2" || s === "S2" || s === "S 2" || s === "MAGISTER") return "S2";
      if (s === "S-3" || s === "S3" || s === "S 3" || s === "DOKTOR") return "S3";
      if (s === "PROFESI") return "S1";
      
      if (s.includes("D3") || s.includes("D-III") || s.includes("D III") || s.includes("D-3")) return "DIII";
      if (s.includes("D4") || s.includes("D-IV") || s.includes("D IV") || s.includes("D-4") || s.includes("DIV")) return "D IV";
      if (s.includes("S1") || s.includes("S-1") || s.includes("S 1") || s.includes("SARJANA")) return "S1";
      if (s.includes("S2") || s.includes("S-2") || s.includes("S 2") || s.includes("MAGISTER")) return "S2";
      if (s.includes("S3") || s.includes("S-3") || s.includes("S 3") || s.includes("DOKTOR")) return "S3";
      if (s.includes("SD")) return "SD";
      if (s.includes("SMA") || s.includes("SMK") || s.includes("SLTA") || s.includes("ALIAH") || s.includes("PONDOK") || s.includes("PESANTREN")) return "SLTA";
      
      const allowed = ["D IV", "DIII", "S1", "S2", "S3", "SD", "SLTA"];
      const matched = allowed.find(a => s.replace(/[^A-Z0-9]/g, '') === a.replace(/[^A-Z0-9]/g, ''));
      if (matched) return matched;
      return "S1";
    };

    Object.keys(finalData).forEach(key => {
      const cleanKey = key.toLowerCase().replace(/[\s_]/g, '');
      if (cleanKey === 'pendidikan') {
        finalData[key] = normalizePendidikan(finalData[key]);
      }
      if (cleanKey === 'foto' || cleanKey === 'fotourl' || cleanKey === 'photo') {
        finalData[key] = formatDrivePhotoUrl(finalData[key]);
      }
    });
  }

  // Normalize ROLES field for USERS module
  if (moduleName.toUpperCase().trim() === 'USERS' && action === 'SAVE' && data) {
    finalData = { ...data };
    const rolesList = normalizeRolesList(finalData.roles, finalData.role);
    finalData.roles = JSON.stringify(rolesList);
    finalData.role = finalData.role || rolesList[0] || 'Viewer';
  }

  // Normalize date fields to DD/MM/YYYY format so spreadsheet receives '23/01/2025' instead of '2025-01-23T17:00:00.000Z'
  if (action === 'SAVE' && finalData && typeof finalData === 'object') {
    Object.keys(finalData).forEach(key => {
      const val = finalData[key];
      if (typeof val === 'string') {
        const cleanKey = key.toLowerCase().replace(/[\s_]/g, '');
        if (cleanKey === 'updatedat' || cleanKey === 'createdat' || cleanKey === 'timestamp') return;
        const isDateKey = cleanKey.includes('tanggal') || cleanKey.includes('tgl') || 
                          cleanKey.includes('tmt') || cleanKey.includes('lahir') || 
                          cleanKey.includes('birth');
        const isIsoString = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(val.trim());
        if (isDateKey || isIsoString) {
          finalData[key] = formatDateToDDMMYYYY(val);
        }
      }
    });
  }

  const cleanUrl = appsScriptUrl.trim();
  try {
    const useBackend = await checkBackend();
    const finalUrl = useBackend ? `/api/proxy?url=${encodeURIComponent(cleanUrl)}` : cleanUrl;
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: useBackend ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        module: moduleName.toUpperCase().trim(), 
        action: action, 
        spreadsheetId: spreadsheetId,
        driveFolderId: driveFolderId,
        timestamp: new Date().toISOString(), 
        payload: finalData 
      })
    });
    
    if (!response.ok) {
      console.warn(`Remote sync HTTP status ${response.status} for ${moduleName}`);
      return true; // Still true locally
    }
    
    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      const errMsg = extractErrorMessageFromHtml(text);
      console.warn("Remote Sync Non-JSON response:", errMsg);
      return true;
    }

    if (!result.success) {
      console.warn("Remote Sync Notice:", result.message || "Unknown error", "Module:", moduleName);
    } else {
      sessionStorage.removeItem('last_spreadsheet_error');
    }
    return result.success === true;
  } catch (error: any) { 
    console.warn(`[Sync Offline] Remote sync deferred for ${moduleName}:`, error?.message || error);
    return true; // Return true as local cache is successfully updated
  }
};

export const cleanupEmptyRowsRemote = async (moduleName: string): Promise<{ success: boolean; message: string; deletedCount?: number }> => {
  const { appsScriptUrl, spreadsheetId, driveFolderId } = getDbConfig();
  if (!appsScriptUrl || appsScriptUrl.trim() === '') return { success: false, message: 'URL Apps Script kosong.' };
  
  const cleanUrl = appsScriptUrl.trim();
  try {
    const useBackend = await checkBackend();
    const finalUrl = useBackend ? `/api/proxy?url=${encodeURIComponent(cleanUrl)}` : cleanUrl;
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: useBackend ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        module: moduleName.toUpperCase().trim(), 
        action: 'CLEANUP_EMPTY_ROWS', 
        spreadsheetId: spreadsheetId,
        driveFolderId: driveFolderId,
        timestamp: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error(`Network error: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      return { success: false, message: extractErrorMessageFromHtml(text) };
    }
    return { success: result.success === true, message: result.message || '', deletedCount: result.deletedCount };
  } catch (error: any) { 
    return { success: false, message: error?.message || String(error) };
  }
};

export const syncTableBatchRemote = async (moduleName: string, items: any[]): Promise<boolean> => {
  if (!items || items.length === 0) return true;
  const { appsScriptUrl, spreadsheetId, driveFolderId } = getDbConfig();
  if (!appsScriptUrl || appsScriptUrl.trim() === '') return false;
  
  const normalizedItems = (items || []).map(item => {
    if (!item || typeof item !== 'object') return item;
    const cloned = { ...item };
    if (moduleName.toUpperCase().trim() === 'PEGAWAI') {
      const resolved = resolvePegawaiPendidikanDanJurusan(cloned);
      if (resolved.pendidikan) cloned.pendidikan = resolved.pendidikan;
      if (resolved.jurusan) cloned.jurusan = resolved.jurusan;
      if (cloned.foto) cloned.foto = formatDrivePhotoUrl(cloned.foto);
    }
    Object.keys(cloned).forEach(key => {
      const val = cloned[key];
      if (typeof val === 'string') {
        const cleanKey = key.toLowerCase().replace(/[\s_]/g, '');
        if (cleanKey === 'updatedat' || cleanKey === 'createdat' || cleanKey === 'timestamp') return;
        const isDateKey = cleanKey.includes('tanggal') || cleanKey.includes('tgl') || 
                          cleanKey.includes('tmt') || cleanKey.includes('lahir') || 
                          cleanKey.includes('birth');
        const isIsoString = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(val.trim());
        if (isDateKey || isIsoString) {
          cloned[key] = formatDateToDDMMYYYY(val);
        }
      }
    });
    return cloned;
  });

  const cleanUrl = appsScriptUrl.trim();
  try {
    const useBackend = await checkBackend();
    const finalUrl = useBackend ? `/api/proxy?url=${encodeURIComponent(cleanUrl)}` : cleanUrl;
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: useBackend ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        module: moduleName.toUpperCase().trim(),
        action: 'BATCH_SAVE',
        spreadsheetId,
        driveFolderId,
        timestamp: new Date().toISOString(),
        payload: normalizedItems
      })
    });
    if (response.ok) {
      const text = await response.text();
      try {
        const resData = JSON.parse(text);
        return resData.success === true;
      } catch (e) {
        return false;
      }
    }
  } catch (err) {
    console.warn(`[Batch Save Remote] Failed for ${moduleName}:`, err);
  }
  return false;
};

export const initAllSheetsRemote = async (): Promise<boolean> => {
  const { appsScriptUrl, spreadsheetId } = getDbConfig();
  if (!appsScriptUrl || appsScriptUrl.trim() === '') return false;
  try {
    const useBackend = await checkBackend();
    const finalUrl = useBackend ? `/api/proxy?url=${encodeURIComponent(appsScriptUrl)}` : appsScriptUrl;
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: useBackend ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'INITIALIZE_ALL_SHEETS', spreadsheetId })
    });
    if (response.ok) {
      await syncGidMap();
      return true;
    }
  } catch (e) {
    console.warn("initAllSheetsRemote failed:", e);
  }
  return false;
};

export const getServerTime = async (): Promise<Date> => {
  const { appsScriptUrl } = getDbConfig();
  try {
    const targetUrl = `${appsScriptUrl}?action=GET_TIME`;
    const useBackend = await checkBackend();
    const finalUrl = useBackend ? `/api/proxy?url=${encodeURIComponent(targetUrl)}` : targetUrl;
    const res = await fetch(finalUrl);
    if (!res.ok) return new Date();
    
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (data.success && data.time) return new Date(data.time);
    } catch (parseError) {
      console.warn("Failed to parse Server Time response as JSON. Response text snippet:", text.substring(0, 300));
    }
    return new Date();
  } catch (e) {
    return new Date();
  }
};

const safeParseArray = (raw: string | null): any[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const autoHealedKeys = new Set<string>();

const attemptAutoHeal = async (gidKey: keyof typeof DEFAULT_GIDS): Promise<boolean> => {
  if (autoHealedKeys.has(gidKey)) return false;
  autoHealedKeys.add(gidKey);
  
  const schema = (EXPECTED_COLUMNS_SCHEMA as any)[gidKey];
  if (!schema) return false;
  
  const { appsScriptUrl } = getDbConfig();
  if (!appsScriptUrl || appsScriptUrl.trim() === '') return false;
  
  try {
    console.log(`[Auto-Heal] Lacking sheet or got error for ${gidKey}. Attempting remote initialization...`);
    const dummyRow: any = { id: `INIT-${Date.now()}` };
    schema.forEach((col: string) => {
      dummyRow[col.toLowerCase().replace(/[\s_]/g, '')] = "";
    });
    
    // Create missing sheet remote using Apps Script
    const ok = await syncTableRemote(gidKey, 'SAVE', dummyRow);
    if (ok) {
      // Immediately delete the dummy row
      await syncTableRemote(gidKey, 'DELETE', { id: dummyRow.id });
      // Sync local GID maps so we get the correct GID
      await syncGidMap();
      console.log(`[Auto-Heal] Successfully initialized sheet and synced GID for ${gidKey}!`);
      return true;
    }
  } catch (err) {
    console.warn(`[Auto-Heal] Non-fatal notification during repair of ${gidKey}:`, err);
  }
  return false;
};

export const fetchTableData = async <T>(gidKey: keyof typeof DEFAULT_GIDS, storageKey: string, mapper: (cols: string[], headers: string[]) => T | null, bypassCache = false): Promise<T[]> => {
  const { spreadsheetId, appsScriptUrl, driveFolderId } = getDbConfig();

  // Auto-invalidate stale cache if schema version changed
  const CURRENT_CACHE_VERSION = '2026_09_02_database_sync_v3';
  try {
    const storedVersion = localStorage.getItem('portal_cache_schema_version');
    if (storedVersion !== CURRENT_CACHE_VERSION) {
      localStorage.removeItem('portal_pegawai_db');
      localStorage.setItem('portal_cache_schema_version', CURRENT_CACHE_VERSION);
    }
  } catch (e) {}

  if (!bypassCache) {
    // 1. In-memory cache (fastest, 0ms)
    if (inMemoryCache[storageKey] && inMemoryCache[storageKey].length > 0) {
      return inMemoryCache[storageKey] as T[];
    }
    // 2. LocalStorage cache
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryCache[storageKey] = parsed;
          return parsed;
        }
      } catch (e) {}
    }
    // 3. IndexedDB cache (virtually unlimited quota, e.g. 1000+ Pegawai records)
    try {
      const idbData = await getTableFromIndexedDb<T>(storageKey);
      if (idbData && idbData.length > 0) {
        inMemoryCache[storageKey] = idbData;
        return idbData;
      }
    } catch (e) {}
  }

  // 1. Primary Action: Fetch via Google Apps Script API 'GET' action
  if (appsScriptUrl && appsScriptUrl.trim() !== '') {
    try {
      const cleanUrl = appsScriptUrl.trim();
      const useBackend = await checkBackend();
      const finalUrl = useBackend ? `/api/proxy?url=${encodeURIComponent(cleanUrl)}` : cleanUrl;
      const apiResponse = await fetch(finalUrl, {
        method: 'POST',
        headers: useBackend ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'text/plain;charset=utf-8' }, // Use text/plain for CORS preflight avoidance if needed
        body: JSON.stringify({
          action: 'GET',
          module: gidKey.toUpperCase().trim(),
          spreadsheetId: spreadsheetId,
          driveFolderId: driveFolderId
        })
      });

      if (apiResponse.ok) {
        const textResult = await apiResponse.text();
        const jsonResult = JSON.parse(textResult);
        if (jsonResult.success && Array.isArray(jsonResult.data)) {
          console.log(`[Apps Script Fetch] Successfully fetched data for ${gidKey} via Apps Script GET API. Row count: ${jsonResult.data.length}`);
          const rawData = jsonResult.data;
          
          // Construct unique headers list
          const rawHeaders: string[] = [];
          rawData.forEach((row: any) => {
            if (row && typeof row === 'object') {
              Object.keys(row).forEach(k => {
                if (!rawHeaders.includes(k)) rawHeaders.push(k);
              });
            }
          });

          const mappedHeaders = rawHeaders.map(h => h.trim().toUpperCase().replace(/[\s_.]/g, ''));
          
          const result = rawData.map((row: any) => {
            const cols = rawHeaders.map(h => {
              const val = row[h];
              if (val === undefined || val === null) return '';
              if (typeof val === 'object') return JSON.stringify(val);
              return String(val);
            });
            if (cols.every(c => !c)) return null;
            return mapper(cols, mappedHeaders);
          }).filter((item: any): item is T => item !== null);

          if (result.length > 0) {
            try {
              safeSaveToCache(storageKey, result);
            } catch (cacheErr) {
              console.warn(`[Cache Notice] Local cache update notice for ${storageKey}:`, cacheErr);
            }
            inMemoryCache[storageKey] = result;
          } else {
            try { localStorage.removeItem(storageKey); } catch (e) {}
          }
          
          sessionStorage.removeItem('last_spreadsheet_error');
          sessionStorage.removeItem('last_spreadsheet_error_gid');
          return result;
        } else {
          console.warn(`[Apps Script Fetch] Apps Script response indicated failure or invalid format for ${gidKey}:`, jsonResult.message);
        }
      }
    } catch (e) {
      console.warn(`[Apps Script Fetch] Failed to query Apps Script GET API for ${gidKey}. Falling back to CSV export.`, e);
    }
  }

  // 2. Fallback Action: CSV Export from Google Sheets directly
  const savedMapRaw = localStorage.getItem('portal_gid_map');
  let gid = (DEFAULT_GIDS as any)[gidKey];
  
  if (savedMapRaw) {
    try {
      const map = JSON.parse(savedMapRaw);
      const targetKey = gidKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const key in map) {
        if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === targetKey) { gid = map[key]; break; }
      }
    } catch (e) {}
  }

  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`;
    const useBackend = await checkBackend();
    const finalUrl = useBackend ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
    const response = await fetch(finalUrl);
    const isCritical = gidKey === 'USERS' || gidKey === 'PEGAWAI';

    if (!response.ok || (response.headers.get('content-type') || '').includes('html')) {
       const healed = await attemptAutoHeal(gidKey);
       if (healed) {
           return fetchTableData(gidKey, storageKey, mapper, bypassCache);
       }
       if (!response.ok) {
          if (response.status === 400 || response.status === 404 || !isCritical) {
            console.warn(`[Optional Module] Sheet for ${gidKey} (GID ${gid}) is not available or not yet initialized in spreadsheet (HTTP ${response.status}). Using local data.`);
            return safeParseArray(localStorage.getItem(storageKey));
          }
          throw new Error(`HTTP Error ${response.status}`);
       }
    }
    
    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE html>')) {
       const healed = await attemptAutoHeal(gidKey);
       if (healed) {
           return fetchTableData(gidKey, storageKey, mapper, bypassCache);
       }
       if (!isCritical) {
          console.warn(`[Optional Module] Sheet ${gidKey} is not available via CSV export. Returning local cached data.`);
          return safeParseArray(localStorage.getItem(storageKey));
       }
       console.warn(`Access denied or invalid sheet for ${gidKey}. Ensure spreadsheet is published to the web.`);
       throw new Error(`Akses ke sheet ${gidKey} ditolak. Pastikan Spreadsheet dipublikasikan ke web sebagai CSV.`);
    }

    const lines = csvText.split(/\r?\n/).filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/^[,"'\s]+$/.test(trimmed)) return false;
      return true;
    });

    if (lines.length < 1) return [];
    
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').replace(/""/g, '"').trim().toUpperCase().replace(/[\s_.]/g, ''));
    
    const result = lines.slice(1).map(line => {
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        if (cols.every(c => !c)) return null;
        return mapper(cols, headers);
    }).filter((item): item is T => item !== null);

    if (result.length > 0) {
      try {
        safeSaveToCache(storageKey, result);
      } catch (cacheErr) {
        console.warn(`[Cache Notice] Local cache write notice for ${storageKey}:`, cacheErr);
      }
      inMemoryCache[storageKey] = result;
    } else {
      try { localStorage.removeItem(storageKey); } catch (e) {}
    }
    if (isCritical) {
      sessionStorage.removeItem('last_spreadsheet_error');
      sessionStorage.removeItem('last_spreadsheet_error_gid');
    }
    return result;
  } catch (error) {
    const isCritical = gidKey === 'USERS' || gidKey === 'PEGAWAI';
    const errStr = error instanceof Error ? `${error.name}: ${error.message}` : String(error || '');
    const isStorageError = (
      Boolean(error && typeof error === 'object' && ((error as any).name === 'QuotaExceededError' || (error as any).code === 22)) ||
      errStr.toLowerCase().includes('quota') ||
      errStr.toLowerCase().includes('exceeded') ||
      errStr.toLowerCase().includes('storage')
    );

    // If it's a storage quota issue, never crash the app or throw
    if (isStorageError) {
      console.warn(`[Storage Quota] Local storage limit reached for ${gidKey}. Serving safely from memory / IndexedDB.`);
      if (inMemoryCache[storageKey] && inMemoryCache[storageKey].length > 0) {
        return inMemoryCache[storageKey] as T[];
      }
      try {
        const idbData = await getTableFromIndexedDb<T>(storageKey);
        if (idbData && idbData.length > 0) {
          inMemoryCache[storageKey] = idbData;
          return idbData;
        }
      } catch (e) {}
      return safeParseArray(localStorage.getItem(storageKey));
    }

    if (isCritical) {
      console.error(`Error fetching table data for ${gidKey}:`, error);
    } else {
      console.warn(`[Info] Table ${gidKey} notice:`, error instanceof Error ? error.message : error);
    }
    
    try {
      const healed = await attemptAutoHeal(gidKey);
      if (healed) {
        return fetchTableData(gidKey, storageKey, mapper, bypassCache);
      }
    } catch (healErr) {
      console.warn(`Auto-heal retry for ${gidKey}:`, healErr);
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    
    if (isCritical) {
      try {
        sessionStorage.setItem('last_spreadsheet_error', errMsg);
        sessionStorage.setItem('last_spreadsheet_error_gid', `${gidKey} (GID: ${gid})`);
        sessionStorage.setItem('last_spreadsheet_error_time', Date.now().toString());
      } catch (e) {}
      if (bypassCache) throw error;
    } else {
      try {
        sessionStorage.setItem(`error_module_${gidKey.toLowerCase()}`, errMsg);
      } catch (e) {}
    }
    
    // Robust fallback: Check memory first, then IndexedDB, then localStorage
    if (inMemoryCache[storageKey] && inMemoryCache[storageKey].length > 0) {
      return inMemoryCache[storageKey] as T[];
    }
    try {
      const idbData = await getTableFromIndexedDb<T>(storageKey);
      if (idbData && idbData.length > 0) {
        inMemoryCache[storageKey] = idbData;
        return idbData;
      }
    } catch (e) {}

    return safeParseArray(localStorage.getItem(storageKey));
  }
};

export const mapPegawaiCols = (cols: string[], headers: string[]): Pegawai | null => {
    const get = (k: string) => { 
      const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
      return (i !== -1 && cols[i]) ? cols[i] : ''; 
    };
    const getLast = (k: string) => { 
      const i = headers.lastIndexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
      return (i !== -1 && cols[i]) ? cols[i] : ''; 
    };
    const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
    
    // Identity fields with fallbacks
    const nama = (get('NAMA') || get('NAMAPEGAWAI') || get('FULLNAME')).trim();
    const nipRaw = get('NIP') || get('NIPBARU') || get('ASN_NIP') || get('NIP_ASN');
    const nip = nipRaw ? nipRaw.replace(/\D/g, '') : '';
    const sid = get('ID');
    
    // VALIDATION: Skip garbage rows
    if (!nama && !nip && !sid) return null;
    
    // Check for "Corrupted" names: suspiciously short (degree codes) or address-like strings
    const upperNama = nama.toUpperCase();
    const looksLikeDegree = (nama.length < 8 && (upperNama.startsWith('S.') || upperNama.startsWith('M.') || upperNama.startsWith('A.')));
    const isAddressOrInfo = (upperNama.includes('PONDOK') || upperNama.includes('JALAN') || upperNama.includes('KEC.') || upperNama.includes('KAB.'));
    
    // If it has NO NIP and the name looks suspicious, filter it out
    if (!nip && (looksLikeDegree || isAddressOrInfo || nama.length < 3)) {
      console.warn("Filtering suspected corrupted row:", { nama, nip, id: sid });
      return null;
    }

    // Column AN (JENIS JABATAN) vs Column N (JENIS_JABATAN) vs Column O (KLASIFIKASI_JABATAN)
    const rawJenisJabatanAN = (cols[39] ? cols[39].trim() : '') || getLast('JENISJABATAN');
    const rawJenisJabatanN = (cols[13] ? cols[13].trim() : '') || get('JENISJABATAN') || get('JENIS_JABATAN');
    
    const p = {
      id: sid || `PEG-${nip || Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
      nip: nip, 
      nama: nama || '(NAMA KOSONG)', 
      statusPerkawinan: get('STATUSPERKAWINAN') || get('STATUSKAWIN') || get('MARITALSTATUS') || get('STATUS_KAWIN'),
      jabatan: get('JABATAN') || get('NAMAJABATAN') || get('JAB'), 
      jenisJabatan: rawJenisJabatanAN || rawJenisJabatanN || get('TIPEJABATAN') || get('KATEGORIJABATAN'),
      klasifikasiJabatan: rawJenisJabatanAN || get('KLASIFIKASIJABATAN') || (cols[14] ? cols[14].trim() : ''),
      subBagian: get('SUBBAGIAN') || get('SUB_BAGIAN'), 
      bagian: get('BAGIAN'),
      unitKerja: get('UNITKERJA') || get('UNIT_KERJA') || 'DJKI', 
      gender: (() => {
        const g = (get('GENDER') || get('JENISKELAMIN') || get('JK') || get('LP') || '').toUpperCase();
        if (g === 'P' || g.startsWith('PEREMPUAN') || g === 'WANITA' || g === 'W') return 'P';
        return 'L';
      })() as 'L' | 'P',
      golRuang: (() => {
        const raw = (get('GOLRUANG') || get('GOLONGAN') || get('PANGKATGOL') || '').trim();
        if (!raw || raw === '-') return '';
        const match = raw.match(/^([I|V|X]+)\s*\/\s*([a-eA-E])$/i);
        if (match) return `${match[1].toUpperCase()}/${match[2].toLowerCase()}`;
        return raw.toUpperCase();
      })(), 
      jenisPegawai: get('JENISPEGAWAI') || get('KATEGORIPEG') || get('TYPE'), 
      status: (() => {
        const rawStatus = (get('STATUS') || get('STATUSPEGAWAI') || '').trim();
        if (!rawStatus) return 'Aktif';
        const lower = rawStatus.toLowerCase();
        if (lower === 'aktif' || lower === 'active' || lower.startsWith('aktif')) return 'Aktif';
        if (lower === 'tidak aktif' || lower === 'non aktif' || lower === 'non-aktif' || lower === 'inactive' || lower.startsWith('tidak')) return 'Tidak Aktif';
        if (lower === 'pensiun' || lower === 'retired' || lower.startsWith('pensiun') || lower.startsWith('bup')) return 'Pensiun';
        if (lower === 'tugas belajar' || lower === 'tubel' || lower.startsWith('tugas')) return 'Tugas Belajar';
        return rawStatus.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      })(),
      pangkat: (() => {
        const rawP = (get('PANGKAT') || '').trim();
        if (rawP && rawP !== '-') return rawP;
        const gol = (get('GOLRUANG') || get('GOLONGAN') || get('PANGKATGOL') || '').trim();
        return getPangkatFromGol(gol) || '';
      })(), 
      foto: formatDrivePhotoUrl(get('FOTO') || get('FOTOURL') || get('PHOTO')),
      tmtPangkat: get('TMTPANGKAT') || get('TMT_PANGKAT'), 
      tmtJabatan: get('TMTJABATAN') || get('TMT_JABATAN'), 
      tmtCpns: get('TMTSTATUS') || get('TMTCPNS') || get('TMT_ASN'),
      pendidikan: (get('PENDIDIKAN') || get('PEND') || '').trim(), 
      jurusan: (get('JURUSAN') || '').trim(), 
      nik: (get('NIK') || get('NO_NIK')).replace(/\D/g, ''),
      masaKerja: get('MASAKERJA') || get('MK_TOTAL'), 
      tempatLahir: get('TEMPATLAHIR') || get('TMP_LAHIR'), 
      tanggalLahir: get('TANGGALLAHIR') || get('TGL_LAHIR'),
      alamat: get('ALAMAT'), 
      eselon: get('ESELON'), 
      agama: get('AGAMA'),
      noHp: get('NOHP') || get('TELEPON') || get('WA'), 
      email: get('EMAIL'), 
      npwp: get('NPWP'), 
      noBpjs: get('NOBPJS') || get('BPJS'), 
      noKarisKarsu: get('NOKARISKARSU'),
      noTAPERA: get('NOTAPERA'), 
      noKarpeg: get('NOKARPEG') || get('KARTU_PEG'), 
      noRekeningGaji: get('NOREKENINGGAJI') || get('NOMORREKENINGGAJI') || get('NO_REK'),
      namaBank: get('NAMABANK') || get('BANK'),
      usia: get('USIA'),
      tglPensiun: get('TGLPENSIUN') || get('TANGGALPENSIUN'),
      tmtPensiun: get('TMTPENSIUN'),
      tmtPensiunDisplay: get('TMTPENSIUNDISPLAY'),
      bup: get('BUP'),
      sisaMasaKerja: get('SISAMASAKERJA'),
      keteranganPensiun: get('KETERANGANPENSIUN'),
      usiaPensiun: get('USIAPENSIUN'),
      masaKerjaPensiun: get('MKPENSIUN') || get('MASAKERJAPENSIUN'),
      masaKerjaGolongan: get('MKGOLONGAN') || get('MASAKERJAGOLONGAN') || get('MK_GOL'),
      gajiPokok: get('GAJIPOKOK') || get('GAJI') || get('GAJIPOKOKTERAKHIR'),
      riwayatPendidikan: getJson('RIWAYATPENDIDIKAN'),
      riwayatJabatan: getJson('RIWAYATJABATAN'),
      riwayatPangkat: getJson('RIWAYATPANGKAT'),
      riwayatGaji: getJson('RIWAYATGAJI'),
      riwayatPelatihan: getJson('RIWAYATPELATIHAN'),
      riwayatPenghargaan: getJson('RIWAYATPENGHARGAAN'),
      keluarga: getJson('KELUARGA')
    } as Pegawai;

    // Enrich Pendidikan & Jurusan based on riwayatPendidikan, or fallback to gelar terakhir
    const eduResolved = resolvePegawaiPendidikanDanJurusan({
      nama: p.nama,
      riwayatPendidikan: p.riwayatPendidikan,
      pendidikan: p.pendidikan,
      jurusan: p.jurusan
    });
    if (eduResolved.pendidikan) p.pendidikan = eduResolved.pendidikan;
    if (eduResolved.jurusan) p.jurusan = eduResolved.jurusan;

    // A. Classification & Grade Enrichment (Permenkumham No. 38 Tahun 2025)
    const determinedClass = getJabatanClassification(p);
    p.klasifikasiJabatan = determinedClass;
    if (!p.jenisJabatan || p.jenisJabatan === '-' || p.jenisJabatan.trim() === '') {
      p.jenisJabatan = determinedClass;
    }
    const rawKelas = (get('KELASJABATAN') || get('KELAS_JABATAN') || get('GRADE') || '').trim();
    p.kelasJabatan = getKelasJabatanPermenkumham38(p.jabatan || '', p.eselon, p.golRuang) || (rawKelas && rawKelas !== '-' ? rawKelas : '');

    // B. Identity & Retirement Enrichment
    const statusLower = (p.status || '').trim().toLowerCase();
    if (statusLower === 'pensiun' || statusLower === 'retired' || statusLower.startsWith('bup')) {
      p.status = 'Tidak Aktif';
    }

    if (p.tanggalLahir) {
      const parsedBirthStr = parseDateToYYYYMMDD(p.tanggalLahir);
      if (parsedBirthStr) {
        const birth = new Date(parsedBirthStr);
        if (!isNaN(birth.getTime())) {
          // Age if missing
          if (!p.usia || p.usia === '-') {
            const today = new Date();
            let years = today.getFullYear() - birth.getFullYear();
            let months = today.getMonth() - birth.getMonth();
            if (months < 0) {
              years--;
              months += 12;
            }
            p.usia = `${years} Thn ${months} Bln`;
          }

          // Retirement age limit (BUP)
          if (!p.bup || p.bup === '-') {
            const isHighLevel = p.eselon && p.eselon !== '-' && p.eselon !== '';
            const isFungsionalAhli = p.jabatan?.toUpperCase().includes('MADYA') || p.jabatan?.toUpperCase().includes('UTAMA');
            p.bup = (isHighLevel || isFungsionalAhli) ? '60' : '58';
          }

          const bupYears = parseInt(p.bup);
          const retirementDate = new Date(birth.getFullYear() + bupYears, birth.getMonth() + 1, 1);
          
          if (!p.tglPensiun || p.tglPensiun === '-') {
            p.tglPensiun = retirementDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
          }

          if (!p.tmtPensiun || p.tmtPensiun === '-') {
            p.tmtPensiun = `${retirementDate.getFullYear()}-${String(retirementDate.getMonth() + 1).padStart(2, '0')}-01`;
          }
        }
      }
    }

    return p;
};

export const mapPegawaiRecord = (rowObj: Record<string, any>): Pegawai | null => {
  if (!rowObj || typeof rowObj !== 'object') return null;
  const rawHeaders = Object.keys(rowObj);
  const headers = rawHeaders.map(h => h.trim().toUpperCase().replace(/[\s_.]/g, ''));
  const cols = rawHeaders.map(h => {
    const val = rowObj[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });
  return mapPegawaiCols(cols, headers);
};

export const fetchPegawaiFromSheets = async (bypassCache = false): Promise<Pegawai[]> => {
  const rawList = await fetchTableData<Pegawai>('PEGAWAI', 'portal_pegawai_db', mapPegawaiCols, bypassCache);

  // Guarantee list has unique NIPs
  const seen = new Set<string>();
  const uniqueResult: Pegawai[] = [];
  for (const item of rawList) {
    const key = (item.nip || item.id || '').trim();
    if (key) {
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResult.push(item);
      }
    } else {
      uniqueResult.push(item);
    }
  }
  return uniqueResult;
};

export const fetchSatyaLencanaFromSheets = (bypassCache = false) => fetchTableData<SatyaLencanaRecord>('SATYA_LENCANA', 'satya_lencana_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), kategori: get('KATEGORI'), tahunTerima: parseInt(get('TAHUNTERIMA')) || new Date().getFullYear(), nomorKeppres: get('NOMORKEPPRES'), fileSertifikatUrl: get('FILESERTIFIKATURL') } as SatyaLencanaRecord;
}, bypassCache);

export const fetchABKAnjabFromSheets = (bypassCache = false) => fetchTableData<ABKAnjab>('ABK_ANJAB', 'abk_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
  return { 
    id: get('ID'), namaJabatan: get('NAMAJABATAN'), unitKerja: get('UNITKERJA'), 
    jumlahSaatIni: parseInt(get('JUMLAHSAATINI')) || 0, 
    totalMenitBebanKerja: parseFloat(get('TOTALMENITBEBANKERJA')) || 0, 
    kebutuhanPegawai: parseFloat(get('KEBUTUHANPEGAWAI')) || 0, 
    selisih: parseFloat(get('SELISIH')) || 0, status: get('STATUS') as any, 
    jenisJabatan: (get('JENISJABATAN') || 'PELAKSANA') as any,
    ikhtisarJabatan: get('IKHTISARJABATAN'), kualifikasiPendidikan: get('KUALIFIKASIPENDIDIKAN'),
    tanggungJawab: get('TANGGUNGJAWAB'), wewenang: get('WEWENANG'), syaratJabatan: get('SYARATJABATAN'),
    lingkunganKerja: get('LINGKUNGANKERJA'), risikoBahaya: get('RISIKOBAHAYA'), bakatKerja: get('BAKATKERJA'),
    temperamenKerja: get('TEMPERAMENKERJA'), minatKerja: get('MINATKERJA'), upayaFisik: get('UPAYAFISIK'),
    kondisiFisik: get('KONDISIFISIK'), jamKerjaEfektif: parseInt(get('JAMKERJAEFEKTIF')) || 75000,
    uraianTugas: getJson('URAIANTUGAS')
  };
}, bypassCache);

export const fetchPersuratanFromSheets = (bypassCache = false) => fetchTableData<PersuratanRecord>('PERSURATAN', 'portal_persuratan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), jenisSurat: get('JENISSURAT'), nomorSurat: get('NOMORSURAT'), tanggalSurat: get('TANGGALSURAT'), perihal: get('PERIHAL'), lampiran: get('LAMPIRAN'), tujuan: get('TUJUAN'), dari: get('DARI'), isiRingkas: get('ISIRINGKAS'), pjbNama: get('PJBNAMA'), pjbNip: get('PJBNIP'), pjbJabatan: get('PJBJABATAN'), status: get('STATUS'), statusBaca: get('STATUSBACA'), statusProses: get('STATUSPROSES'), pengirimNip: get('PENGIRIMNIP') } as PersuratanRecord;
}, bypassCache);

export const fetchPengembanganFromSheets = (bypassCache = false) => fetchTableData<Pengembangan>('PENGEMBANGAN', 'portal_pengembangan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), namaKegiatan: get('NAMAKEGIATAN'), jumlahJpl: parseFloat(get('JUMLAHJPL')) || 0, tahun: parseInt(get('TAHUN')) || new Date().getFullYear(), fileSertifikatUrl: get('FILESERTIFIKATURL') } as Pengembangan;
}, bypassCache);

export const fetchKGBFromSheets = (bypassCache = false) => fetchTableData<KGB>('KGB', 'portal_kgb_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { 
      id: get('ID'), 
      nip: get('NIP'), 
      namaPegawai: get('NAMAPEGAWAI'), 
      tmtLama: get('TMTLAMA'),
      tmtBaru: get('TMTBARU'), 
      gajiLama: parseFloat(get('GAJILAMA')) || 0,
      gajiBaru: parseFloat(get('GAJIBARU')) || 0,
      nomorSk: get('NOMORSK'),
      tglSk: get('TGLSK'),
      status: get('STATUS') as any,
      pjbNama: get('PJBNAMA'),
      pjbNip: get('PJBNIP'),
      pjbJabatan: get('PJBJABATAN'),
      pangkatGol: get('PANGKATGOL'),
      jabatan: get('JABATAN'),
      kantor: get('KANTOR'),
      unitKerja: get('UNITKERJA'),
      tglSurat: get('TGLSURAT'),
      skTerakhirPejabat: get('SKTERAKHIRPEJABAT'),
      skTerakhirTanggal: get('SKTERAKHIRTANGGAL'),
      skTerakhirNomor: get('SKTERAKHIRNOMOR'),
      skTerakhirTmt: get('SKTERAKHIRTMT'),
      skTerakhirMasaKerja: get('SKTERAKHIRMASAKERJA'),
      masaKerjaBaru: get('MASAKERJABARU'),
      golonganBaru: get('GOLONGANBARU'),
      masaPerjanjianKerja: get('MASAPERJANJIANKERJA'),
      perpanjanganPerjanjianKerja: get('PERPANJANGANPERJANJIANKERJA'),
      jenisPegawai: get('JENISPEGAWAI') as any
    } as KGB;
}, bypassCache);

export const fetchSKPFromSheets = (bypassCache = false) => fetchTableData<any>('SKP', 'skp_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), tahun: get('TAHUN'), predikatKinerja: get('PREDIKATKINERJA') };
}, bypassCache);

export const fetchMagangPKLFromSheets = (bypassCache = false) => fetchTableData<any>('MAGANG_PKL', 'portal_magang_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nama: get('NAMA'), institusi: get('INSTITUSI'), status: get('STATUS') };
}, bypassCache);

export const fetchTugasRutinFromSheets = (bypassCache = false) => fetchTableData<TugasRutin>('TUGAS_RUTIN', 'tugas_rutin_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const dataStr = get('DATA');
    let parsedData = {};
    try { parsedData = dataStr ? JSON.parse(dataStr) : {}; } catch(e) {}
    return { 
      id: get('ID'), 
      timestamp: get('TIMESTAMP'), 
      bulan: get('BULAN'), 
      tahun: parseInt(get('TAHUN')) || new Date().getFullYear(), 
      jenis: get('JENIS') as any, 
      detail: get('DETAIL'),
      data: parsedData
    };
}, bypassCache);

export const fetchKegiatanFromSheets = (bypassCache = false) => fetchTableData<Kegiatan>('KEGIATAN', 'kegiatan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { 
      id: get('ID'), 
      judulKegiatan: get('JUDULKEGIATAN'), 
      tanggal: get('TANGGAL'), 
      tanggalMulai: get('TANGGALMULAI') || get('TANGGAL'),
      tanggalSelesai: get('TANGGALSELESAI') || get('TANGGAL'),
      jamMulai: get('JAMMULAI'),
      jamSelesai: get('JAMSELESAI'),
      tempat: get('TEMPAT'),
      jumlahPeserta: parseInt(get('JUMLAHPESERTA')) || 0,
      asalPeserta: get('ASALPESERTA'),
      laporanSingkat: get('LAPORANSINGKAT'),
      linkDriveFoto: get('LINKDRIVEFOTO'),
      status: get('STATUS')
    } as Kegiatan;
}, bypassCache);

export const fetchDossiersFromSheets = (bypassCache = false) => fetchTableData<Dossier>('DOSSIER', 'portal_dossiers_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { 
      id: get('ID'), 
      nip: (get('NIP') || '').replace(/\D/g, ''), 
      namaPegawai: get('NAMAPEGAWAI'),
      tanggal: get('TANGGAL'),
      keterangan: get('KETERANGAN'),
      fileName: get('FILENAME'), 
      fileUrl: get('FILEURL') 
    } as Dossier;
}, bypassCache);

export const fetchUsersFromSheets = async (bypassCache = false): Promise<AdminUser[]> => {
  const users = await fetchTableData<AdminUser>('USERS', 'portal_users_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const rawRole = (get('ROLE') as any) || 'Viewer';
    const rawRoles = get('ROLES');
    const rolesList = normalizeRolesList(rawRoles, rawRole);
    return { 
      id: get('ID'), 
      nip: (get('NIP') || '').replace(/\D/g, ''), 
      name: get('NAME'), 
      password: (get('PASSWORD') || '').trim(), 
      role: rawRole,
      roles: rolesList,
      foto: get('FOTO'),
      status: (get('STATUS') as any) || 'Aktif'
    };
  }, bypassCache);

  return (users || []).map(u => {
    const normalizedRoles = normalizeRolesList(u.roles, u.role);
    return {
      ...u,
      roles: normalizedRoles,
      role: u.role || normalizedRoles[0] || 'Viewer'
    };
  });
};

export const fetchTupoksiSDMFromSheets = async (bypassCache = false): Promise<TupoksiSDMItem[]> => {
  const data = await fetchTableData<TupoksiSDMItem>('TUPOKSI_SDM', 'tupoksi_sdm_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const id = get('ID') || get('KODETUPOKSI');
    if (!id && !get('JUDUL')) return null;
    return {
      id: id || `TUP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      kodeTupoksi: get('KODETUPOKSI') || get('ID') || 'TUP-SDM',
      subTeam: (get('SUBTEAM') || 'PERENCANAAN_LAYANAN') as any,
      roleName: get('ROLENAME') || 'Admin Perencanaan & Layanan',
      judul: get('JUDUL'),
      deskripsi: get('DESKRIPSI'),
      periode: get('PERIODE') || 'Tahunan',
      targetOutput: get('TARGETOUTPUT') || get('OUTPUT'),
      status: (get('STATUS') || 'DALAM_PROSES') as any,
      progres: parseFloat(get('PROGRES')) || 0,
      penanggungJawab: get('PENANGGUNGJAWAB') || get('PJ'),
      nipPj: get('NIPPJ'),
      dokumenDukungUrl: get('DOKUMENDUKUNGURL'),
      dokumenDukungNama: get('DOKUMENDUKUNGNAMA'),
      appModuleLink: get('APPMODULELINK'),
      catatan: get('CATATAN'),
      updatedAt: get('UPDATEDAT') || new Date().toISOString()
    };
  }, bypassCache);

  if (data && data.length > 0) {
    return data;
  }

  // Fallback to rich default initial tupoksi items
  const cached = localStorage.getItem('tupoksi_sdm_db');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch(e) {}
  }
  
  localStorage.setItem('tupoksi_sdm_db', JSON.stringify(INITIAL_TUPOKSI_SDM));
  return INITIAL_TUPOKSI_SDM;
};

export const saveTupoksiSDM = async (item: TupoksiSDMItem): Promise<boolean> => {
  return syncTableRemote('TUPOKSI_SDM', 'SAVE', item);
};

export const deleteTupoksiSDM = async (id: string): Promise<boolean> => {
  return syncTableRemote('TUPOKSI_SDM', 'DELETE', { id });
};

export const fetchPelantikanFromSheets = (bypassCache = false) => fetchTableData<any>('PELANTIKAN', 'pelantikan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const id = get('ID');
    const nip = get('ASNNIP') || get('ASN_NIP') || get('NIP') || get('NIPASN');
    const nomor = get('NOMOR');
    const data = get('DATA');
    
    if (!id && !nip && !nomor) return null;
    
    return { id, nomor, asnNip: nip, data };
}, bypassCache);

export const fetchPensiunFromSheets = (bypassCache = false) => fetchTableData<any>('PENSIUN', 'pensiun_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const id = get('ID');
    const nip = get('NIP') || get('ASNNIP') || get('ASN_NIP');
    const nama = get('NAMAPEGAWAI') || get('NAMA');
    
    if (!id && !nip && !nama) return null;
    
    return { id, nip, namaPegawai: nama, data: get('DATA') };
}, bypassCache);

export const fetchPAKFromSheets = (bypassCache = false) => fetchTableData<any>('PAK', 'pak_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), nomor: get('NOMOR'), jumlahKredit: parseFloat(get('JUMLAHKREDIT')) || 0 };
}, bypassCache);

export const fetchSPMTSPPFromSheets = (bypassCache = false) => fetchTableData<SpmtSppRecord>('SPMT_SPP', 'spmt_spp_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), type: get('TYPE') as any, nomor: get('NOMOR'), pegawaiNip: get('PEGAWAINIP') } as SpmtSppRecord;
}, bypassCache);

export const fetchKenaikanFromSheets = (bypassCache = false) => fetchTableData<KenaikanKarir>('KENAIKAN', 'kenaikan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), dari: get('DARI'), menjadi: get('MENJADI'), status: get('STATUS') } as KenaikanKarir;
}, bypassCache);

export const uploadFileToDrive = async (fileName: string, mimeType: string, base64: string): Promise<{ success: boolean; fileUrl?: string; directUrl?: string; fileId?: string; message?: string }> => {
    const { appsScriptUrl, spreadsheetId, driveFolderId } = getDbConfig();
    if (!appsScriptUrl || appsScriptUrl.trim() === '') {
        return { success: false, message: "URL Apps Script tidak dikonfigurasi." };
    }
    
    if (!driveFolderId || driveFolderId.trim() === '') {
        return { success: false, message: "ID Folder Drive tidak dikonfigurasi di menu Pengaturan." };
    }
    
    const cleanUrl = appsScriptUrl.trim();
    if (!base64) {
        return { success: false, message: "Data file kosong." };
    }

    // Strip data URL prefix and any whitespace/newlines that might corrupt the base64 string
    const cleanBase64 = (base64.includes(',') ? base64.split(',')[1] : base64).replace(/\s/g, '');
    
    // Ensure we have a valid mimeType and sanitized fileName
    const safeMimeType = (mimeType || 'image/jpeg').trim();
    const safeFileName = (fileName || `UPLOAD_${Date.now()}`).trim().replace(/[/\\?%*:|"<>]/g, '-');
    
    try {
        const useBackend = await checkBackend();
        const finalUrl = useBackend ? `/api/proxy?url=${encodeURIComponent(cleanUrl)}` : cleanUrl;
        const response = await fetch(finalUrl, { 
            method: 'POST', 
            headers: useBackend ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ 
                action: 'UPLOAD', 
                spreadsheetId, 
                driveFolderId,
                payload: { 
                    fileName: safeFileName, 
                    mimeType: safeMimeType, 
                    base64: cleanBase64 
                } 
            }) 
        });

        if (!response.ok) {
            return { success: false, message: `Server error: ${response.status}` };
        }

        const text = await response.text();
        try {
            const result = JSON.parse(text);
            if (result.success) {
                const driveId = result.fileId || extractGoogleDriveFileId(result.directUrl || result.fileUrl || result.viewUrl);
                if (driveId) {
                    result.fileUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
                    result.directUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
                }
            } else {
                const rawMsg = result.message || "Gagal memproses file di server Google.";
                if (
                    rawMsg.includes('存取遭拒') || 
                    rawMsg.toLowerCase().includes('access denied') || 
                    rawMsg.includes('DriveApp')
                ) {
                    result.message = "Akses Google Drive Ditolak (DriveApp Access Denied).\n\n" +
                        "Penyebab dan Solusi di Google Apps Script:\n" +
                        "1. Pastikan Web App dideploy dengan:\n" +
                        "   - 'Execute as' (Jalankan sebagai): 'Me' (Email akun Anda)\n" +
                        "   - 'Who has access' (Akses): 'Anyone' (Siapa saja)\n\n" +
                        "2. Otorisasi Izin Akses (Authorization):\n" +
                        "   Buka editor Google Apps Script, pilih fungsi 'setup' di menu atas, lalu klik tombol 'Run' (Jalankan) untuk mengizinkan akses Drive.\n\n" +
                        "3. Salin Kode Terbaru:\n" +
                        "   Pastikan Google Apps Script menggunakan kode terbaru (tersedia di file GoogleAppsScript_Code.js) yang mendukung fallback folder otomatis.";
                } else {
                    result.message = rawMsg;
                }
            }
            return result;
        } catch (parseError) {
            console.error("Parse Error:", text);
            // Check if it's a HTML error page (common when Apps Script crashes)
            if (text.includes('<!DOCTYPE html>') || text.includes('scriptErrorName')) {
                return { success: false, message: "Server Google Apps Script mengalami gangguan atau memori penuh. Coba gunakan file yang lebih kecil." };
            }
            return { success: false, message: "Format respon server tidak valid." };
        }
    } catch (e) { 
        console.error("Upload Exception:", e);
        return { success: false, message: "Terjadi kesalahan koneksi saat mengunggah." }; 
    }
};

export const syncGidMap = async (): Promise<boolean> => {
    const { appsScriptUrl, spreadsheetId } = getDbConfig();
    if (!appsScriptUrl || appsScriptUrl.trim() === '') {
        console.warn("syncGidMap: Apps Script URL is empty.");
        return false;
    }

    const cleanUrl = appsScriptUrl.trim();

    // Try POST first (more reliable in some environments)
    try {
        const useBackend = await checkBackend();
        const finalUrl = useBackend ? `/api/proxy?url=${encodeURIComponent(cleanUrl)}` : cleanUrl;
        const postRes = await fetch(finalUrl, {
            method: 'POST',
            headers: useBackend ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'GET_GID_MAP', spreadsheetId })
        });
        
        if (postRes.ok) {
            const text = await postRes.text();
            try {
                const data = JSON.parse(text);
                if (data.success && data.gidMap) {
                    try { localStorage.setItem('portal_gid_map', JSON.stringify(data.gidMap)); } catch (e) {}
                    return true;
                }
            } catch (err) {
                // Non-JSON response ignored
            }
        }
    } catch (postError) {
        // Fall through to GET
    }
    
    // Fallback to GET if POST failed or action not recognized
    try {
        const separator = cleanUrl.includes('?') ? '&' : '?';
        const getUrl = `${cleanUrl}${separator}ssId=${spreadsheetId}`;
        const useBackend = await checkBackend();
        const finalUrl = useBackend ? `/api/proxy?url=${encodeURIComponent(getUrl)}` : getUrl;
        const getRes = await fetch(finalUrl);
        if (getRes.ok) {
            const text = await getRes.text();
            try {
                const data = JSON.parse(text);
                if (data.success && data.gidMap) {
                    try { localStorage.setItem('portal_gid_map', JSON.stringify(data.gidMap)); } catch (e) {}
                    return true;
                }
            } catch (err) {
                // Non-JSON response ignored
            }
        }
        return false;
    } catch (e) {
        // Quiet fallback - default GIDs are safely used
        return false;
    }
};

export const fetchKeuanganFromSheets = (bypassCache = false) => fetchTableData<KeuanganRecord>('KEUANGAN', 'portal_keuangan_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
  return { 
    id: get('ID'), 
    namaKegiatan: get('NAMAKEGIATAN'),
    tanggal: get('TANGGAL'), 
    mataAnggaran: get('MATAANGGARAN'),
    tahunAnggaran: get('TAHUNANGGARAN'),
    ppkNip: get('PPKNIP'),
    ppkNama: get('PPKNAMA'),
    bendaharaNip: get('BENDAHARANIP'),
    bendaharaNama: get('BENDAHARANAMA'),
    unitKerja: get('UNITKERJA'),
    status: (get('STATUS') || 'Draft') as any, 
    keterangan: get('KETERANGAN'), 
    transactionId: get('TRANSACTIONID'),
    kotaTtd: get('KOTATTD') || 'Bogor',
    tanggalDokumen: get('TANGGALDOKUMEN'),
    peserta: getJson('PESERTA'),
    configBiaya: getJson('CONFIGBIAYA'),
    configSpd: getJson('CONFIGSPD')
  } as KeuanganRecord;
}, bypassCache);

export const syncKeuanganRemote = (action: 'SAVE' | 'DELETE', data: any) => syncTableRemote('KEUANGAN', action, data);

export const fetchAbsensiConfig = async (bypassCache = false): Promise<AbsensiConfig> => {
  const data = await fetchTableData<AbsensiConfig>('CONFIG', 'portal_absensi_config', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
    if (get('ID') !== 'ABSENSI_GLOBAL') return null;
    return {
      id: get('ID'),
      officeWifiSsid: get('OFFICEWIFISSID'),
      officeIpAddresses: get('OFFICEIPADDRESSES') || get('OFFICEIPADDRESS'),
      wfaNips: getJson('WFANIPS'),
      simpegEnabled: get('SIMPEGENABLED') === 'TRUE' || get('SIMPEGENABLED') === 'true',
      simpegApiUrl: get('SIMPEGAPIURL'),
      simpegApiKey: get('SIMPEGAPIKEY')
    } as AbsensiConfig;
  }, bypassCache);
  return data.length > 0 ? data[0] : { 
    id: 'ABSENSI_GLOBAL', 
    officeWifiSsid: '', 
    officeIpAddresses: '', 
    wfaNips: [],
    simpegEnabled: false,
    simpegApiUrl: '',
    simpegApiKey: ''
  };
};

export const saveAbsensiConfig = (config: AbsensiConfig) => syncTableRemote('CONFIG', 'SAVE', config);

const sendToSimpeg = async (record: any, config: AbsensiConfig): Promise<{ success: boolean; error?: string }> => {
  if (!config.simpegEnabled || !config.simpegApiUrl) return { success: false, error: 'SIMPEG integration disabled or URL missing' };

  try {
    const payload = {
      nip: record.nip,
      nama: record.nama,
      tanggal: record.tanggal,
      waktu: record.waktu,
      tipe: record.tipe,
      status: record.status,
      lokasi: record.lokasi,
      confidence: record.confidence,
      source: 'PORTAL-SDM-DJKI'
    };

    const response = await fetch(config.simpegApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.simpegApiKey ? { 'Authorization': `Bearer ${config.simpegApiKey}`, 'X-API-KEY': config.simpegApiKey } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Gagal sinkron ke SIMPEG:', errorText);
      return { success: false, error: errorText };
    } else {
      console.log('Sinkron SIMPEG Berhasil');
      return { success: true };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('SIMPEG Integration Error:', errorMsg);
    return { success: false, error: errorMsg };
  }
};

export const resendAbsensiToSimpeg = async (record: any): Promise<boolean> => {
  const config = await fetchAbsensiConfig();
  if (!config) return false;
  
  const result = await sendToSimpeg(record, config);
  
  // Update record with status
  return syncTableRemote('ABSENSI', 'SAVE', { 
    id: record.id, 
    simpegStatus: result.success ? 'SUCCESS' : 'FAILED',
    simpegError: result.error || null
  });
};

export const saveAbsensiRecord = async (record: any): Promise<boolean> => {
  const ok = await syncTableRemote('ABSENSI', 'SAVE', { ...record, simpegStatus: 'PENDING' });
  
  if (ok) {
    // Try background sync to SIMPEG if configured
    fetchAbsensiConfig().then(async config => {
      if (config && config.simpegEnabled) {
        const result = await sendToSimpeg(record, config);
        // Update the row with the result in background
        syncTableRemote('ABSENSI', 'SAVE', { 
          id: record.id, 
          simpegStatus: result.success ? 'SUCCESS' : 'FAILED',
          simpegError: result.error || null
        });
      }
    }).catch(err => console.error("Could not fetch config for SIMPEG sync", err));
  }
  
  return ok;
};

export const fetchAbsensiHistoryFromSheets = async (nip: string): Promise<any[]> => {
  const all = await fetchTableData<any>('ABSENSI', 'portal_absensi_history_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      nip: (get('NIP') || '').replace(/\D/g, ''),
      nama: get('NAMA'),
      tanggal: get('TANGGAL'),
      waktu: get('WAKTU'),
      tipe: get('TIPE'),
      status: get('STATUS'),
      lokasi: get('LOKASI'),
      confidence: parseFloat(get('CONFIDENCE')) || 0,
      simpegStatus: get('SIMPEGSTATUS') as any,
      simpegError: get('SIMPEGERROR')
    };
  });
  const now = new Date();
  const d = now.getDate().toString().padStart(2, '0');
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const y = now.getFullYear();
  const today = `${d}/${m}/${y}`;
  const todayAlt = `${y}-${m}-${d}`;
  
  return all.filter(r => 
    r.nip === nip.replace(/\D/g, '') && 
    (r.tanggal === today || r.tanggal === todayAlt || r.tanggal?.includes(today))
  );
};

export const fetchAllAbsensiHistoryFromSheets = async (): Promise<any[]> => {
  return fetchTableData<any>('ABSENSI', 'portal_absensi_history_global', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      nip: (get('NIP') || '').replace(/\D/g, ''),
      nama: get('NAMA'),
      tanggal: get('TANGGAL'),
      waktu: get('WAKTU'),
      tipe: get('TIPE'),
      status: get('STATUS'),
      lokasi: get('LOKASI'),
      confidence: parseFloat(get('CONFIDENCE')) || 0,
      simpegStatus: get('SIMPEGSTATUS') as any,
      simpegError: get('SIMPEGERROR')
    };
  });
};

export const fetchSystemConfig = async (bypassCache = true): Promise<SystemConfig> => {
  const data = await fetchTableData<SystemConfig>('CONFIG', 'portal_system_config', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : null; } catch(e) { return null; } };
    if (get('ID') !== 'SYSTEM_CONFIG') return null;
    return {
      maintenance: getJson('MAINTENANCE') || { all: false, pages: [] },
      pageAccess: getJson('PAGEACCESS') || [],
      systemName: get('SYSTEMNAME') || get('SYSTEM_NAME') || '',
      runningText: get('RUNNINGTEXT') || get('RUNNING_TEXT') || '',
      systemLogo: get('SYSTEMLOGO') || get('SYSTEM_LOGO') || '',
      templateLogo: get('TEMPLATELOGO') || get('TEMPLATE_LOGO') || ''
    } as SystemConfig;
  }, bypassCache);
  return data.length > 0 ? data[0] : { 
    maintenance: { all: false, pages: [] }, 
    pageAccess: [] 
  };
};

export const saveSystemConfig = (config: any) => syncTableRemote('CONFIG', 'SAVE', { id: 'SYSTEM_CONFIG', ...config });

export const fetchBankSoalFromSheets = () => fetchTableData<BankSoal>('BANK_SOAL', 'ukom_bank_soal', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  return {
    id: get('IDSOAL'),
    kategori: get('KATEGORI') as any,
    tipeSoal: (get('TIPESOAL') || 'Umum') as any,
    jabatanFungsional: get('JABATANFUNGSIONAL'),
    jenjang: get('JENJANG'),
    pertanyaan: get('PERTANYAAN'),
    imageUrl: get('IMAGEURL'),
    pilihanA: get('PILIHANA'),
    pilihanB: get('PILIHANB'),
    pilihanC: get('PILIHANC'),
    pilihanD: get('PILIHAND'),
    pilihanE: get('PILIHANE'),
    jawabanBenar: get('JAWABANBENAR'),
    bobotNilai: get('BOBOTNILAI'),
    tipeJawaban: get('TIPEJAWABAN') as any
  } as BankSoal;
});

export const fetchPesertaUkomFromSheets = () => fetchTableData<PesertaUkom>('PESERTA_UKOM', 'ukom_peserta', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  return {
    noPeserta: get('NOPESERTA'),
    nama: get('NAMA'),
    tanggalLahir: get('TANGGALLAHIR'),
    jabatanFungsional: get('JABATANFUNGSIONAL'),
    jenjang: get('JENJANG'),
    unitKerja: get('UNITKERJA'),
    fotoUrl: get('FOTOURL') || get('FOTO'),
    password: get('PASSWORD'),
    statusUjian: get('STATUSUJIAN') as any,
    isLocked: get('ISLOCKED') === 'TRUE',
    unlockPassword: get('UNLOCKPASSWORD')
  } as PesertaUkom;
});

export const fetchHasilUkomFromSheets = () => fetchTableData<HasilUkom>('HASIL_UKOM', 'ukom_hasil', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : null; } catch(e) { return null; } };
  return {
    noPeserta: get('NOPESERTA'),
    nama: get('NAMA'),
    jabatanFungsional: get('JABATANFUNGSIONAL'),
    jenjang: get('JENJANG'),
    nilaiTwk: parseFloat(get('NILAITWK')) || 0,
    nilaiTiu: parseFloat(get('NILAITIU')) || 0,
    nilaiTkp: parseFloat(get('NILAITKP')) || 0,
    totalNilai: parseFloat(get('TOTALNILAI')) || 0,
    tanggalUjian: get('TANGGALUJIAN'),
    waktuSelesai: get('WAKTUSELESAI'),
    essayAnswers: getJson('ESSAYANSWERS')
  } as HasilUkom;
});

export const fetchUkomSessionsFromSheets = () => fetchTableData<any>('UKOM_SESSIONS', 'ukom_sessions', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
  return {
    id: get('ID'),
    namaSesi: get('NAMASESI'),
    tanggal: get('TANGGAL'),
    waktuMulai: get('WAKTUMULAI'),
    waktuSelesai: get('WAKTUSELESAI'),
    supervisorNips: getJson('SUPERVISORNIPS'),
    pesertaIds: getJson('PESERTAIDS'),
    status: get('STATUS')
  };
});

export const saveUkomSession = (session: any) => syncTableRemote('UKOM_SESSIONS', 'SAVE', session);
export const deleteUkomSession = (id: string, nama?: string) => syncTableRemote('UKOM_SESSIONS', 'DELETE', { id, nama });

export const savePegawai = async (pegawai: Partial<Pegawai>): Promise<boolean> => {
  // Filter out fields that are typically calculated by ArrayFormula in the spreadsheet
  // to prevent overwriting formulas with static values.
  const calculatedFields = [
    'pangkat',
    'masaKerja', 
    'masaKerjaGolongan', 'masaKerjaPensiun', 'usia', 'tglPensiun', 
    'tmtPensiun', 'tmtPensiunDisplay', 'usiaPensiun', 'bup', 
    'sisaMasaKerja', 'keteranganPensiun'
  ];
  
  const payload = { ...pegawai };
  calculatedFields.forEach(field => {
    delete (payload as any)[field];
  });

  // Resolve Pendidikan & Jurusan based on riwayatPendidikan or gelar terakhir
  const eduResolved = resolvePegawaiPendidikanDanJurusan(payload);
  if (eduResolved.pendidikan) payload.pendidikan = eduResolved.pendidikan;
  if (eduResolved.jurusan) payload.jurusan = eduResolved.jurusan;

  if (payload.foto) {
    payload.foto = formatDrivePhotoUrl(payload.foto);
  }
  
  if (payload.jabatan) {
    payload.kelasJabatan = getKelasJabatanPermenkumham38(payload.jabatan, payload.eselon, payload.golRuang) || payload.kelasJabatan;
  }

  return syncTableRemote('PEGAWAI', 'SAVE', payload);
};

export const findPegawaiByNip = async (nipOrId: string, bypassCache = false): Promise<Pegawai | null> => {
  if (!nipOrId) return null;
  const rawTarget = decodeURIComponent(nipOrId).trim();
  const cleanDigits = rawTarget.replace(/\D/g, '');
  const lowerTarget = rawTarget.toLowerCase();

  // If target is admin username or generic profile keyword, return synthetic admin profile
  const isAdminTarget = 
    lowerTarget === 'admin' || 
    lowerTarget === 'superadmin' || 
    lowerTarget === 'administrator' || 
    lowerTarget === 'me' || 
    lowerTarget === 'profile' || 
    lowerTarget === 'data-diri';

  if (isAdminTarget) {
    try {
      const authRaw = localStorage.getItem('auth_user');
      const currentUser = authRaw ? JSON.parse(authRaw) : null;
      return {
        id: currentUser?.id || 'ADMIN-SDM',
        nip: currentUser?.nip || 'Admin SDM',
        nama: currentUser?.name || 'Administrator Portal SDM',
        jabatan: currentUser?.role ? `${currentUser.role} SDM` : 'Super Administrator Kepegawaian',
        unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
        bagian: 'Bagian Kepegawaian',
        subBagian: 'Subbagian Tata Usaha dan Kepegawaian',
        eselon: 'II.a',
        golRuang: 'IV/c',
        pangkat: 'Pembina Utama Muda',
        statusPegawai: 'Aktif',
        status: 'Aktif',
        jenisPegawai: 'PNS',
        email: currentUser?.email || 'admin.sdm@dgip.go.id',
        foto: currentUser?.foto || '',
        gender: 'L',
        tempatLahir: 'Jakarta',
        tanggalLahir: '1980-01-01',
        tmtCpns: '2005-01-01',
        tmtPangkat: '2024-04-01',
        tmtJabatan: '2024-01-01',
        pendidikan: 'S2',
        jurusan: 'Ilmu Hukum / Manajemen SDM',
        agama: 'Islam',
        bup: '60',
        usiaPensiun: '60',
        masaKerja: '19 Tahun 0 Bulan',
        riwayatJabatan: [],
        riwayatPendidikan: [],
        riwayatPangkat: [],
        riwayatGaji: [],
        riwayatPelatihan: [],
        riwayatPenghargaan: [],
        keluarga: []
      } as Pegawai;
    } catch (e) {}
  }

  const matchInList = (pList: Pegawai[]): Pegawai | undefined => {
    return pList.find(p => 
      (cleanDigits && cleanDigits.length >= 4 && (p.nip || '').replace(/\D/g, '') === cleanDigits) ||
      (p.id && (p.id === rawTarget || p.id.toLowerCase() === lowerTarget)) ||
      (p.nip && p.nip.trim() === rawTarget) ||
      (cleanDigits && p.id && p.id.replace(/\D/g, '') === cleanDigits) ||
      (rawTarget.length >= 3 && isNaN(Number(rawTarget)) && p.nama && (p.nama.toLowerCase() === lowerTarget || p.nama.toLowerCase().includes(lowerTarget)))
    );
  };

  // 1. Check local memory & cache first (instant 0ms)
  if (!bypassCache) {
    if (inMemoryCache['portal_pegawai_db']) {
      const found = matchInList(inMemoryCache['portal_pegawai_db']);
      if (found) return found;
    }
    try {
      const cached = localStorage.getItem('portal_pegawai_db') || localStorage.getItem('portal_sdm_pegawai_db');
      if (cached) {
        const pList: Pegawai[] = JSON.parse(cached);
        const found = matchInList(pList);
        if (found) {
          inMemoryCache['portal_pegawai_db'] = pList;
          return found;
        }
      }
    } catch (e) {}
    try {
      const idbList = await getTableFromIndexedDb<Pegawai>('portal_pegawai_db');
      if (idbList && idbList.length > 0) {
        const found = matchInList(idbList);
        if (found) {
          inMemoryCache['portal_pegawai_db'] = idbList;
          return found;
        }
      }
    } catch (e) {}
  }

  // 2. Direct remote query to Apps Script (GET_PEGAWAI_BY_NIP) if configured
  const { appsScriptUrl, spreadsheetId } = getDbConfig();
  if (appsScriptUrl && appsScriptUrl.trim() !== '') {
    try {
      const cleanUrl = appsScriptUrl.trim();
      const useBackend = await checkBackend();
      const finalUrl = useBackend ? `/api/proxy?url=${encodeURIComponent(cleanUrl)}` : cleanUrl;
      const apiResponse = await fetch(finalUrl, {
        method: 'POST',
        headers: useBackend ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'GET_PEGAWAI_BY_NIP',
          module: 'PEGAWAI',
          spreadsheetId: spreadsheetId,
          payload: { nip: rawTarget }
        })
      });
      if (apiResponse.ok) {
        const textResult = await apiResponse.text();
        const json = JSON.parse(textResult);
        if (json.success && json.data) {
          const mapped = mapPegawaiRecord(json.data);
          if (mapped) {
            // Update local cache with this fresh record
            try {
              const cached = inMemoryCache['portal_pegawai_db'] || [];
              const idx = cached.findIndex(x => (mapped.nip && x.nip && x.nip.replace(/\D/g, '') === mapped.nip.replace(/\D/g, '')) || (x.id === mapped.id));
              if (idx >= 0) cached[idx] = mapped;
              else cached.push(mapped);
              safeSaveToCache('portal_pegawai_db', cached);
            } catch (e) {}
            return mapped;
          }
        }
      }
    } catch (e) {
      console.warn("Direct GET_PEGAWAI_BY_NIP notice:", e);
    }
  }

  // 3. Resilient Fallback: fetch list via fetchPegawaiFromSheets
  try {
    const all = await fetchPegawaiFromSheets(bypassCache);
    const match = matchInList(all);
    return match || null;
  } catch (e) {
    console.error("findPegawaiByNip fallback error:", e);
    return null;
  }
};

export const saveHasilUkom = (hasil: HasilUkom) => syncTableRemote('HASIL_UKOM', 'SAVE', hasil);
export const savePesertaUkom = (peserta: PesertaUkom) => syncTableRemote('PESERTA_UKOM', 'SAVE', peserta);

/**
 * MAPPING & AUDIT TOOLS
 */

export const auditSpreadsheet = async () => {
    const { appsScriptUrl, spreadsheetId } = getDbConfig();
    if (!appsScriptUrl || appsScriptUrl.trim() === '') return [];
    
    const expected = Object.keys(EXPECTED_COLUMNS_SCHEMA).map(key => ({
        name: key,
        requiredColumns: (EXPECTED_COLUMNS_SCHEMA as any)[key]
    }));

    try {
        const res = await fetch(appsScriptUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'AUDIT_DATABASE',
                spreadsheetId,
                payload: { expectedSheets: expected }
            })
        });
        const data = await res.json();
        return data.auditResults || [];
    } catch (e) {
        console.error("Audit failed:", e);
        return [];
    }
};

export const deleteSheetRemote = async (sheetId: string) => {
    const { appsScriptUrl, spreadsheetId } = getDbConfig();
    if (!appsScriptUrl || appsScriptUrl.trim() === '') return false;
    
    try {
        const res = await fetch(appsScriptUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'DELETE_SHEET',
                spreadsheetId,
                payload: sheetId
            })
        });
        const data = await res.json();
        return data.success === true;
    } catch (e) {
        return false;
    }
};
export const lockPesertaUkom = (noPeserta: string) => syncTableRemote('PESERTA_UKOM', 'SAVE', { noPeserta, isLocked: true });
export const unlockPesertaUkom = (noPeserta: string, unlockPassword: string) => syncTableRemote('PESERTA_UKOM', 'SAVE', { noPeserta, isLocked: false, unlockPassword });
export const deletePesertaUkom = (noPeserta: string) => syncTableRemote('PESERTA_UKOM', 'DELETE', { id: noPeserta, noPeserta });
export const saveBankSoalBulk = (soalList: BankSoal[]) => syncTableRemote('BANK_SOAL', 'SAVE', soalList);
export const saveBankSoal = (soal: BankSoal) => syncTableRemote('BANK_SOAL', 'SAVE', soal);
export const deleteBankSoal = (id: string, nama?: string) => syncTableRemote('BANK_SOAL', 'DELETE', { id, nama });

export const getRetirementDetails = (nip: string, jabatan: string) => {
  const cleanNip = (nip || '').replace(/\D/g, '');
  if (cleanNip.length < 8) return null;
  const birthYear = parseInt(cleanNip.substring(0, 4));
  const birthMonth = parseInt(cleanNip.substring(4, 6)) - 1;
  const jabUpper = (jabatan || '').toUpperCase();
  let usiaPensiun = 58;
  if (jabUpper.includes('UTAMA')) usiaPensiun = 65;
  else if (jabUpper.includes('MADYA') || jabUpper.includes('DIREKTUR') || jabUpper.includes('SEKRETARIS DIREKTORAT')) usiaPensiun = 60;
  const tmtPensiun = new Date(birthYear + usiaPensiun, birthMonth + 1, 1);
  const now = new Date();
  const diffDays = Math.ceil((tmtPensiun.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
  let sisaMasaKerja = diffDays <= 0 ? "Pensiun" : `${Math.floor(diffDays / 12)} thn ${diffDays % 12} bln`;
  return { tmtPensiun, sisaMasaKerja, bup: usiaPensiun };
};

export const fetchPenilaianTalentaFromSheets = (bypassCache = false) => fetchTableData<PenilaianTalenta>('PENILAIAN_TALENTA', 'talenta_penilaian_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      pegawai_id: get('PEGAWAIID') || get('PEGAWAI_ID') || get('NIP'),
      nilai_skp: parseFloat(get('NILAISKP')) || parseFloat(get('NILAI_SKP')) || 0,
      kompetensi: parseFloat(get('KOMPETENSI')) || 0,
      integritas: parseFloat(get('INTEGRITAS')) || 0,
      disiplin: parseFloat(get('DISIPLIN')) || 0,
      leadership: parseFloat(get('LEADERSHIP')) || 0,
      teamwork: parseFloat(get('TEAMWORK')) || 0,
      inovasi: parseFloat(get('INOVASI')) || 0,
      komunikasi: parseFloat(get('KOMUNIKASI')) || 0,
      pendidikan: get('PENDIDIKAN'),
      pengalaman: parseFloat(get('PENGALAMAN')) || 0,
      total_nilai: parseFloat(get('TOTALNILAI')) || parseFloat(get('TOTAL_NILAI')) || 0,
      kategori_talenta: get('KATEGORITALENTA') || get('KATEGORI_TALENTA'),
      created_at: get('CREATEDAT') || get('CREATED_AT') || new Date().toISOString()
    } as PenilaianTalenta;
}, bypassCache);

export const fetchTalentPoolFromSheets = (bypassCache = false) => fetchTableData<TalentPool>('TALENT_POOL', 'talenta_talent_pool_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      pegawai_id: get('PEGAWAIID') || get('PEGAWAI_ID') || get('NIP'),
      ranking: parseInt(get('RANKING')) || 0,
      status_talenta: get('STATUSTALENTA') || get('STATUS_TALENTA'),
      readiness_level: get('READINESSLEVEL') || get('READINESS_LEVEL'),
      rekomendasi_jabatan: get('REKOMENDASIJABATAN') || get('REKOMENDASI_JABATAN'),
      created_at: get('CREATEDAT') || get('CREATED_AT') || new Date().toISOString()
    } as TalentPool;
}, bypassCache);

export const fetchAssessmentTalentaFromSheets = (bypassCache = false) => fetchTableData<AssessmentTalenta>('ASSESSMENT_TALENTA', 'talenta_assessment_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      pegawai_id: get('PEGAWAIID') || get('PEGAWAI_ID') || get('NIP'),
      hasil_assessment: get('HASILASSESSMENT') || get('HASIL_ASSESSMENT'),
      potensi: parseFloat(get('POTENSI')) || 0,
      kompetensi: parseFloat(get('KOMPETENSI')) || 0,
      assessor: get('ASSESSOR'),
      catatan: get('CATATAN'),
      tanggal_assessment: get('TANGGALASSESSMENT') || get('TANGGAL_ASSESSMENT')
    } as AssessmentTalenta;
}, bypassCache);

export const fetchNineBoxFromSheets = (bypassCache = false) => fetchTableData<NineBoxTalenta>('NINEBOX', 'talenta_ninebox_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      pegawai_id: get('PEGAWAIID') || get('PEGAWAI_ID') || get('NIP'),
      kinerja: parseFloat(get('KINERJA')) || 0,
      potensi: parseFloat(get('POTENSI')) || 0,
      posisi_box: get('POSISIBOX') || get('POSISI_BOX'),
      rekomendasi: get('REKOMENDASI')
    } as NineBoxTalenta;
}, bypassCache);

export const fetchPengembanganTalentaFromSheets = (bypassCache = false) => fetchTableData<PengembanganTalenta>('PENGEMBANGAN_TALENTA', 'talenta_pengembangan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      pegawai_id: get('PEGAWAIID') || get('PEGAWAI_ID') || get('NIP'),
      jenis_pengembangan: get('JENISPENGEMBANGAN') || get('JENIS_PENGEMBANGAN'),
      nama_pelatihan: get('NAMAPELATIHAN') || get('NAMA_PELATIHAN'),
      penyelenggara: get('PENYELENGGARA'),
      tanggal_mulai: get('TANGGALMULAI') || get('TANGGAL_MULAI'),
      tanggal_selesai: get('TANGGALSELESAI') || get('TANGGAL_SELESAI'),
      status: get('STATUS')
    } as PengembanganTalenta;
}, bypassCache);

// ==========================================
// LAYANAN SDM KI (TICKETING & HELPDESK ENGINE)
// ==========================================

export const fetchMasterLayananFromSheets = async (bypassCache = false): Promise<MasterLayanan[]> => {
  const data = await fetchTableData<MasterLayanan>('MASTER_LAYANAN', 'master_layanan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const getJson = (k: string) => {
      try {
        const val = get(k);
        return val ? JSON.parse(val) : [];
      } catch (e) {
        return [];
      }
    };

    return {
      id: get('ID'),
      kodeLayanan: get('KODELAYANAN') || get('KODE_LAYANAN') || get('ID'),
      kategori: get('KATEGORI'),
      namaLayanan: get('NAMALAYANAN') || get('NAMA_LAYANAN'),
      deskripsi: get('DESKRIPSI'),
      aktif: get('AKTIF') !== 'false' && get('AKTIF') !== '0',
      slaHari: parseInt(get('SLAHARI') || get('SLA_HARI')) || 3,
      icon: get('ICON') || 'bi-gear-fill',
      fields: getJson('FIELDS'),
      requiredDocuments: getJson('REQUIREDDOCUMENTS') || getJson('REQUIRED_DOCUMENTS'),
      rolePetugas: get('ROLEPETUGAS') || get('ROLE_PETUGAS'),
      urutan: parseInt(get('URUTAN')) || 1
    } as MasterLayanan;
  }, bypassCache);

  if (!data || data.length === 0) {
    return MASTER_LAYANAN_DATA;
  }
  return data;
};

export const fetchLayananSDMFromSheets = (bypassCache = false): Promise<PengajuanSDM[]> => {
  return fetchTableData<PengajuanSDM>('LAYANAN_SDM', 'layanan_sdm_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const getJson = (k: string) => {
      try {
        const val = get(k);
        return val ? JSON.parse(val) : {};
      } catch (e) {
        return {};
      }
    };

    return {
      id: get('ID'),
      idPengajuan: get('ID'),
      nomorTiket: get('NOMORTIKET') || get('NOMOR_TIKET') || get('ID'),
      nip: get('NIP'),
      nama: get('NAMA'),
      unitKerja: get('UNITKERJA') || get('UNIT_KERJA'),
      jabatan: get('JABATAN'),
      pangkat: get('PANGKAT'),
      statusKepegawaian: get('STATUSKEPEGAWAIAN') || get('STATUS_KEPEGAWAIAN'),
      email: get('EMAIL'),
      noHp: get('NOHP') || get('NO_HP'),
      kategori: get('KATEGORI'),
      idLayanan: get('IDLAYANAN') || get('ID_LAYANAN'),
      namaLayanan: get('NAMALAYANAN') || get('NAMA_LAYANAN'),
      tanggalPengajuan: get('TANGGALPENGAJUAN') || get('TANGGAL_PENGAJUAN') || parseDateToYYYYMMDD(new Date()),
      status: (get('STATUS') || 'DIAJUKAN') as any,
      prioritas: (get('PRIORITAS') || 'NORMAL') as any,
      petugasId: get('PETUGASID') || get('PETUGAS_ID'),
      petugasNama: get('PETUGASNAMA') || get('PETUGAS_NAMA'),
      keterangan: get('KETERANGAN'),
      dataForm: getJson('DATAFORM') || getJson('DATA_FORM'),
      catatanVerifikator: get('CATATANVERIFIKATOR') || get('CATATAN_VERIFIKATOR'),
      catatanPerbaikan: get('CATATANPERBAIKAN') || get('CATATAN_PERBAIKAN'),
      alasanPenolakan: get('ALASANPENOLAKAN') || get('ALASAN_PENOLAKAN'),
      hasil: get('HASIL'),
      linkHasil: get('LINKHASIL') || get('LINK_HASIL'),
      nomorSuratHasil: get('NOMORSURATHASIL') || get('NOMOR_SURAT_HASIL'),
      fileHasilUrl: get('FILEHASILURL') || get('FILE_HASIL_URL'),
      tanggalSelesai: get('TANGGALSELESAI') || get('TANGGAL_SELESAI'),
      createdAt: get('CREATEDAT') || get('CREATED_AT'),
      updatedAt: get('UPDATEDAT') || get('UPDATED_AT')
    } as PengajuanSDM;
  }, bypassCache);
};

export const fetchDokumenPengajuanFromSheets = (idPengajuanOrTiket?: string, bypassCache = false): Promise<DokumenPengajuan[]> => {
  return fetchTableData<DokumenPengajuan>('LAYANAN_SDM_DOKUMEN', 'layanan_sdm_dokumen_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      idDokumen: get('ID'),
      idPengajuan: get('IDPENGAJUAN') || get('ID_PENGAJUAN'),
      nomorTiket: get('NOMORTIKET') || get('NOMOR_TIKET'),
      namaDokumen: get('NAMADOKUMEN') || get('NAMA_DOKUMEN'),
      jenisDokumen: get('JENISDOKUMEN') || get('JENIS_DOKUMEN'),
      fileId: get('FILEID') || get('FILE_ID'),
      fileName: get('FILENAME') || get('FILE_NAME'),
      fileUrl: get('FILEURL') || get('FILE_URL'),
      mimeType: get('MIMETYPE') || get('MIME_TYPE'),
      size: parseInt(get('SIZE')) || 0,
      uploadedBy: get('UPLOADEDBY') || get('UPLOADED_BY'),
      uploadedAt: get('UPLOADEDAT') || get('UPLOADED_AT'),
      versi: parseInt(get('VERSI')) || 1,
      aktif: get('AKTIF') !== 'false' && get('AKTIF') !== '0'
    } as DokumenPengajuan;
  }, bypassCache).then(docs => {
    if (!idPengajuanOrTiket) return docs;
    return docs.filter(d => d.idPengajuan === idPengajuanOrTiket || d.nomorTiket === idPengajuanOrTiket);
  });
};

export const fetchLogPengajuanFromSheets = (idPengajuanOrTiket?: string, bypassCache = false): Promise<LogPengajuan[]> => {
  return fetchTableData<LogPengajuan>('LAYANAN_SDM_LOG', 'layanan_sdm_log_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      idLog: get('ID'),
      idPengajuan: get('IDPENGAJUAN') || get('ID_PENGAJUAN'),
      nomorTiket: get('NOMORTIKET') || get('NOMOR_TIKET'),
      timestamp: get('TIMESTAMP'),
      nipUser: get('NIPUSER') || get('NIP_USER'),
      namaUser: get('NAMAUSER') || get('NAMA_USER'),
      role: get('ROLE'),
      statusLama: get('STATUSLAMA') || get('STATUS_LAMA'),
      statusBaru: get('STATUSBARU') || get('STATUS_BARU'),
      catatan: get('CATATAN')
    } as LogPengajuan;
  }, bypassCache).then(logs => {
    if (!idPengajuanOrTiket) return logs;
    return logs.filter(l => l.idPengajuan === idPengajuanOrTiket || l.nomorTiket === idPengajuanOrTiket);
  });
};

export const fetchPesanPengajuanFromSheets = (idPengajuanOrTiket?: string, bypassCache = false): Promise<PesanPengajuan[]> => {
  return fetchTableData<PesanPengajuan>('LAYANAN_SDM_PESAN', 'layanan_sdm_pesan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      idPesan: get('ID'),
      idPengajuan: get('IDPENGAJUAN') || get('ID_PENGAJUAN'),
      nomorTiket: get('NOMORTIKET') || get('NOMOR_TIKET'),
      pengirimNip: get('PENGIRIMNIP') || get('PENGIRIM_NIP'),
      pengirimNama: get('PENGIRIMNAMA') || get('PENGIRIM_NAMA'),
      role: get('ROLE'),
      pesan: get('PESAN'),
      fileId: get('FILEID') || get('FILE_ID'),
      fileUrl: get('FILEURL') || get('FILE_URL'),
      fileName: get('FILENAME') || get('FILE_NAME'),
      timestamp: get('TIMESTAMP'),
      dibaca: get('DIBACA') === 'true' || get('DIBACA') === '1'
    } as PesanPengajuan;
  }, bypassCache).then(pesan => {
    if (!idPengajuanOrTiket) return pesan;
    return pesan.filter(p => p.idPengajuan === idPengajuanOrTiket || p.nomorTiket === idPengajuanOrTiket);
  });
};

export const generateNomorTiketSDMKI = async (year = new Date().getFullYear()): Promise<string> => {
  try {
    const records = await fetchLayananSDMFromSheets(true);
    const prefix = `SDMKI-${year}-`;
    const filtered = records
      .map(r => r.nomorTiket || '')
      .filter(t => t.startsWith(prefix));
    
    let maxSeq = 0;
    filtered.forEach(t => {
      const parts = t.split('-');
      if (parts.length === 3) {
        const seq = parseInt(parts[2]);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    return `${prefix}${String(nextSeq).padStart(6, '0')}`;
  } catch (e) {
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `SDMKI-${year}-${rand}`;
  }
};

export const savePengajuanSDMToSheets = async (
  item: PengajuanSDM,
  currentUser?: { nip: string; name: string; role?: string },
  logCatatan?: string,
  statusLama?: string
): Promise<boolean> => {
  const currentList = await fetchLayananSDMFromSheets(false);
  const nowIso = new Date().toISOString();
  const existingIdx = currentList.findIndex(x => x.id === item.id || (item.nomorTiket && x.nomorTiket === item.nomorTiket));
  
  const payloadToSave = {
    ...item,
    dataForm: typeof item.dataForm === 'object' ? JSON.stringify(item.dataForm) : (item.dataForm || '{}'),
    updatedAt: nowIso,
    createdAt: item.createdAt || nowIso
  };

  let updatedList: PengajuanSDM[];
  if (existingIdx >= 0) {
    updatedList = [...currentList];
    updatedList[existingIdx] = { ...item, updatedAt: nowIso };
  } else {
    updatedList = [item, ...currentList];
  }

  // Update local storage cache
  localStorage.setItem('layanan_sdm_db', JSON.stringify(updatedList));
  window.dispatchEvent(new Event('storage_updated'));

  // Sync to remote sheet
  const syncSuccess = await syncTableRemote('LAYANAN_SDM', 'SAVE', payloadToSave);

  // Write log trail
  if (currentUser) {
    const logItem: LogPengajuan = {
      id: `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      idPengajuan: item.id,
      nomorTiket: item.nomorTiket,
      timestamp: nowIso,
      nipUser: currentUser.nip,
      namaUser: currentUser.name,
      role: currentUser.role || 'Pegawai',
      statusLama: statusLama || (existingIdx >= 0 ? currentList[existingIdx].status : '-'),
      statusBaru: item.status,
      catatan: logCatatan || `Status pengajuan diubah menjadi ${item.status}`
    };

    const currentLogs = await fetchLogPengajuanFromSheets(undefined, false);
    localStorage.setItem('layanan_sdm_log_db', JSON.stringify([logItem, ...currentLogs]));
    syncTableRemote('LAYANAN_SDM_LOG', 'SAVE', logItem).catch(console.error);
  }

  return syncSuccess;
};

export const saveDokumenPengajuanToSheets = async (doc: DokumenPengajuan): Promise<boolean> => {
  const currentDocs = await fetchDokumenPengajuanFromSheets(undefined, false);
  const idx = currentDocs.findIndex(d => d.id === doc.id);
  let updated: DokumenPengajuan[];
  if (idx >= 0) {
    updated = [...currentDocs];
    updated[idx] = doc;
  } else {
    updated = [doc, ...currentDocs];
  }

  localStorage.setItem('layanan_sdm_dokumen_db', JSON.stringify(updated));
  window.dispatchEvent(new Event('storage_updated'));

  const payload = {
    ...doc,
    fileBase64: '' // do not send huge base64 payload in row data, only URL
  };
  return syncTableRemote('LAYANAN_SDM_DOKUMEN', 'SAVE', payload);
};

export const sendPesanPengajuanToSheets = async (pesan: PesanPengajuan): Promise<boolean> => {
  const currentPesan = await fetchPesanPengajuanFromSheets(undefined, false);
  const updated = [...currentPesan, pesan];
  localStorage.setItem('layanan_sdm_pesan_db', JSON.stringify(updated));
  window.dispatchEvent(new Event('storage_updated'));
  return syncTableRemote('LAYANAN_SDM_PESAN', 'SAVE', pesan);
};

export interface SLAInfo {
  slaHari: number;
  tanggalPengajuan: string;
  deadlineDate: Date;
  deadlineStr: string;
  hariTersisa: number;
  statusSla: 'ON_TRACK' | 'WARNING' | 'OVERDUE' | 'COMPLETED';
  label: string;
  colorClass: string;
  badgeClass: string;
}

export const calculateSLA = (
  tanggalPengajuan: string,
  slaHari = 3,
  statusPengajuan?: string,
  tanggalSelesai?: string
): SLAInfo => {
  const start = new Date(tanggalPengajuan || new Date());
  
  // Calculate business days (skip Saturday and Sunday)
  let count = 0;
  const deadline = new Date(start);
  while (count < slaHari) {
    deadline.setDate(deadline.getDate() + 1);
    const dayOfWeek = deadline.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }

  const deadlineStr = deadline.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  if (statusPengajuan === 'SELESAI') {
    const doneDate = tanggalSelesai ? new Date(tanggalSelesai) : new Date();
    const isLate = doneDate > deadline;
    return {
      slaHari,
      tanggalPengajuan,
      deadlineDate: deadline,
      deadlineStr,
      hariTersisa: 0,
      statusSla: 'COMPLETED',
      label: isLate ? 'Selesai (Melewati SLA)' : 'Selesai Tepat Waktu',
      colorClass: isLate ? 'text-amber-600' : 'text-emerald-600',
      badgeClass: isLate ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }

  if (statusPengajuan === 'DITOLAK' || statusPengajuan === 'DIBATALKAN') {
    return {
      slaHari,
      tanggalPengajuan,
      deadlineDate: deadline,
      deadlineStr,
      hariTersisa: 0,
      statusSla: 'COMPLETED',
      label: statusPengajuan === 'DITOLAK' ? 'Ditolak' : 'Dibatalkan',
      colorClass: 'text-slate-500',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }

  const today = new Date();
  const diffTime = deadline.getTime() - today.getTime();
  const hariTersisa = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (hariTersisa < 0) {
    return {
      slaHari,
      tanggalPengajuan,
      deadlineDate: deadline,
      deadlineStr,
      hariTersisa,
      statusSla: 'OVERDUE',
      label: `Terlambat ${Math.abs(hariTersisa)} hari`,
      colorClass: 'text-rose-600',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-medium'
    };
  } else if (hariTersisa <= 1) {
    return {
      slaHari,
      tanggalPengajuan,
      deadlineDate: deadline,
      deadlineStr,
      hariTersisa,
      statusSla: 'WARNING',
      label: hariTersisa === 0 ? 'Hari ini deadline' : '1 hari tersisa',
      colorClass: 'text-amber-600',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-medium'
    };
  }

  return {
    slaHari,
    tanggalPengajuan,
    deadlineDate: deadline,
    deadlineStr,
    hariTersisa,
    statusSla: 'ON_TRACK',
    label: `${hariTersisa} hari tersisa`,
    colorClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
  };
};

