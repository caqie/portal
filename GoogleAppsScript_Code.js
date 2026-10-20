/**
 * ============================================================================
 * PORTAL SDM DJKI - GOOGLE APPS SCRIPT BACKEND CORE (PRO ENTERPRISE V7.1 - 2026)
 * ============================================================================
 * 
 * BACKEND RESMI INTEGRASI GOOGLE SHEETS & GOOGLE DRIVE UNTUK PORTAL KEPEGAWAIAN
 * DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL (DJKI) KEMENTERIAN HUKUM RI
 * 
 * FITUR TERBARU V7.1:
 * - Dukungan Penuh Seluruh 51 Modul Kepegawaian (Pegawai, Talenta, PPPK, UKOM,
 *   Disiplin/LHKPN, Tubel/Ibel, Anggaran/DIPA, SAKIP/RB, Uang Makan, Layanan SDM, dll.)
 * - Endpoint Cepat Pencarian Profil Pegawai By NIP / ID (GET_PEGAWAI_BY_NIP)
 * - Auto-Upsert Cerdas (Deteksi NIP, ID, No. Tiket, No. Peserta, dsb. secara otomatis)
 * - Ultra-Fast Bulk / Batch Save (Menyimpan ribuan baris dalam hitungan detik)
 * - Otomatis Penambahan Kolom Baru (Dynamic Schema Auto-Expand)
 * - Google Drive File & Foto Uploader dengan Fallback Folder Otomatis
 * - Generator Surat & Dokumen Resmi dari Google Docs Template (Dukungan PDF Export)
 * - Auto-Audit & Inisialisasi Database 1-Klik dengan Format Teks Otomatis (NIP, NIK, No. Rek)
 * - Pencarian Cepat & Ringkasan Database Tanpa Beban Memori
 * - Perlindungan Kuota & Timeout dengan Penanganan Error Komprehensif
 * 
 * PANDUAN PEMASANGAN CEPAT:
 * 1. Buka Google Spreadsheet database Anda (atau buat spreadsheet baru).
 * 2. Klik menu "Ekstensi" > "Apps Script".
 * 3. Hapus seluruh isi kode lama, lalu tempel (Paste) seluruh isi file ini.
 * 4. (Opsional) Sesuaikan FOLDER_ID_DATABASE di bawah jika memiliki folder Drive khusus.
 * 5. Klik ikon Disket (Simpan / Save).
 * 6. Di toolbar atas, pada dropdown fungsi (di samping tombol Run):
 *    - Pilih fungsi "setup", lalu klik tombol "Run" (Jalankan) untuk mengotorisasi izin Drive & Sheets.
 *    - (Opsional) Pilih fungsi "initSheets", lalu klik "Run" untuk membuat seluruh sheet & header otomatis!
 * 7. Klik tombol biru "Deploy" (Terapkan) > "New deployment" (Penerapan baru).
 *    - Type: Pilih "Web app" (ikon bola dunia).
 *    - Description: "Portal SDM DJKI v7.0"
 *    - Execute as: Pilih "Me (email Anda)" -- PENTING! JANGAN pilih "User accessing web app".
 *    - Who has access: Pilih "Anyone" (Siapa saja).
 * 8. Klik "Deploy", lalu salin URL Web App yang berakhiran "/exec".
 * 9. Tempelkan URL tersebut ke menu Pengaturan Database Cloud di Portal SDM DJKI.
 * ============================================================================
 */

// Folder ID default untuk penyimpanan file lampiran, foto profil, dan dokumen SK di Google Drive
var FOLDER_ID_DATABASE = "19OkO6ZAMnTXaxy-58ntHRVNI85W-u23O";

/**
 * MASTER SCHEMAS DEFINITION
 * Mendukung seluruh modul aplikasi Portal SDM DJKI secara lengkap dan akurat.
 */
var MASTER_SCHEMAS = {
  // 1. DATA PEGAWAI UTAMA & HIERARKI UNIT (STANDAR BKN / SIASN)
  PEGAWAI: [
    "ID", "NIP", "NAMA", "JABATAN", "UNIT KERJA", "GOL RUANG", "JENIS PEGAWAI", "STATUS",
    "GENDER", "TEMPAT LAHIR", "TANGGAL LAHIR", "AGAMA", "ALAMAT", "JENIS JABATAN", "KLASIFIKASI JABATAN",
    "NO HP", "EMAIL", "NIK", "NPWP", "NO BPJS", "NO REKENING GAJI", "NAMA BANK", "PENDIDIKAN", "JURUSAN",
    "PANGKAT", "TMT PANGKAT", "TMT JABATAN", "TMT CPNS", "ESELON", "SUB BAGIAN", "BAGIAN",
    "MASA KERJA", "MASA KERJA GOLONGAN", "STATUS PERKAWINAN",
    "FOTO", "BUP", "USIA", "TGL PENSIUN", "TMT PENSIUN", "TMT PENSIUN DISPLAY", "SISA MASA KERJA",
    "KETERANGAN PENSIUN", "USIA PENSIUN", "MASA KERJA PENSIUN", "GAJI POKOK",
    "RIWAYAT PENDIDIKAN", "RIWAYAT JABATAN", "RIWAYAT PANGKAT", "RIWAYAT GAJI", "RIWAYAT PELATIHAN", "RIWAYAT PENGHARGAAN", "KELUARGA"
  ],

  // 2. OTENTIKASI & PENGGUNA
  USERS: ["ID", "NIP", "NAME", "PASSWORD", "ROLE", "ROLES", "STATUS"],

  // 3. E-DOSIR & ARSIP DIGITAL
  DOSSIER: ["ID", "NIP", "NAMAPEGAWAI", "FILENAME", "FILEURL", "KETERANGAN", "TANGGALUPLOAD"],

  // 4. GAJI BERKALA (KGB)
  KGB: ["ID", "NIP", "NAMAPEGAWAI", "TMTLAMA", "TMTBARU", "GAJIBARU", "STATUS", "NOMORSK", "TANGGALSK", "MASAKERJATAHUN", "MASAKERJABULAN"],

  // 5. PENGHARGAAN & SATYA LENCANA
  SATYA_LENCANA: ["ID", "NIP", "NAMAPEGAWAI", "KATEGORI", "TAHUNTERIMA", "NOMORKEPPRES", "FILESERTIFIKATURL"],

  // 6. SASARAN KINERJA PEGAWAI (SKP)
  SKP: ["ID", "NIP", "NAMAPEGAWAI", "TAHUN", "PREDIKATKINERJA", "NILAI", "ATASANPENILAI", "FILEURL"],

  // 7. PENETAPAN ANGKA KREDIT (PAK JAFUNG)
  PAK: ["ID", "NIP", "NAMAPEGAWAI", "NOMOR", "JUMLAHKREDIT", "PERIODE", "TANGGALSK"],

  // 8. KENAIKAN PANGKAT & KARIR
  KENAIKAN: ["ID", "NIP", "NAMAPEGAWAI", "DARI", "MENJADI", "STATUS", "PERIODE", "TANGGALTMT"],

  // 9. PENGEMBANGAN KOMPETENSI & DIKLAT
  PENGEMBANGAN: ["ID", "NIP", "NAMAPEGAWAI", "NAMAKEGIATAN", "JENISPENGEMBANGAN", "KATEGORI", "JUMLAHJPL", "TAHUN", "PENYELENGGARA", "NOMORSERTIFIKAT", "FILESERTIFIKATURL"],

  // 10. ANALISIS BEBAN KERJA & JABATAN (ABK & ANJAB)
  ABK_ANJAB: ["ID", "NAMAJABATAN", "KODEJABATAN", "UNITKERJA", "JENISJABATAN", "KELASJABATAN", "KEBUTUHANPEGAWAI", "JUMLAHSAATINI", "IKHTISARJABATAN", "PENDIDIKANFORMAL", "DIKLAT", "PENGALAMANKERJA", "URAIANTUGAS"],

  // 11. PERSURATAN & TATA NASKAH DINAS
  PERSURATAN: ["ID", "JENISSURAT", "NOMORSURAT", "TANGGALSURAT", "PERIHAL", "LAMPIRAN", "TUJUAN", "DARI", "ISIRINGKAS", "PJBNAMA", "PJBNIP", "PJBJABATAN", "STATUS", "FILEURL", "PRIORITAS"],

  // 12. AGENDA & KEGIATAN INTERNAL
  KEGIATAN: ["ID", "JUDULKEGIATAN", "TANGGAL", "TEMPAT", "STATUS", "DESKRIPSI", "PENANGGUNGJAWAB", "PESERTA"],

  // 13. MAGANG & PRAKERIN / PKL
  MAGANG_PKL: ["ID", "NAMA", "NISNIM", "INSTITUSI", "JURUSAN", "JENIS", "TANGGALMULAI", "TANGGALSELESAI", "PENEMPATAN", "STATUS", "NOMORSURAT"],

  // 14. PELANTIKAN & PENGAMBILAN SUMPAH
  PELANTIKAN: ["ID", "NOMOR", "ASNNIP", "TANGGALPELANTIKAN", "JABATANBARU", "DATA"],

  // 15. PENSIUN & PEMBERHENTIAN
  PENSIUN: ["ID", "NIP", "NAMAPEGAWAI", "TMTPENSIUN", "JENISPENSIUN", "STATUS", "DATA"],

  // 16. SPMT & SPP (SURAT PERINTAH MENJALANKAN TUGAS / PELANTIKAN)
  SPMT_SPP: ["ID", "TYPE", "NOMOR", "PEGAWAINIP", "TANGGAL", "JABATANLAMA", "JABATANBARU", "UNITKERJA", "FILEURL"],

  // 17. TUGAS RUTIN SUBBAGIAN SDM
  TUGAS_RUTIN: ["ID", "TIMESTAMP", "BULAN", "TAHUN", "JENIS", "DATA"],

  // 18. TUPOKSI SDM & SUBTIM KERJA
  TUPOKSI_SDM: ["ID", "KODETUPOKSI", "SUBTEAM", "ROLENAME", "JUDUL", "DESKRIPSI", "PERIODE", "TARGETOUTPUT", "STATUS", "PROGRES", "PENANGGUNGJAWAB", "NIPPJ", "DOKUMENDUKUNGURL", "DOKUMENDUKUNGNAMA", "APPMODULELINK", "CATATAN", "UPDATEDAT"],

  // 19. KEUANGAN, PERJALANAN DINAS & SPD
  KEUANGAN: ["ID", "NAMAKEGIATAN", "TANGGAL", "STATUS", "MATAANGGARAN", "TAHUNANGGARAN", "PPKNIP", "PPKNAMA", "BENDAHARANIP", "BENDAHARANAMA", "UNITKERJA", "KETERANGAN", "TRANSACTIONID", "KOTATTD", "TANGGALDOKUMEN", "PESERTA", "CONFIGBIAYA", "CONFIGSPD"],

  // 20. MASTER LAYANAN KEPEGAWAIAN
  MASTER_LAYANAN: ["ID", "KODELAYANAN", "KATEGORI", "NAMALAYANAN", "DESKRIPSI", "AKTIF", "SLAHARI", "ICON", "FIELDS", "REQUIREDDOCUMENTS", "ROLEPETUGAS", "URUTAN"],

  // 21. TIKET & PENGAJUAN LAYANAN SDM
  LAYANAN_SDM: ["ID", "NOMORTIKET", "NIP", "NAMA", "UNITKERJA", "JABATAN", "PANGKAT", "STATUSKEPEGAWAIAN", "EMAIL", "NOHP", "KATEGORI", "IDLAYANAN", "NAMALAYANAN", "TANGGALPENGAJUAN", "STATUS", "PRIORITAS", "PETUGASID", "PETUGASNAMA", "KETERANGAN", "DATAFORM", "CATATANVERIFIKATOR", "CATATANPERBAIKAN", "ALASANPENOLAKAN", "HASIL", "LINKHASIL", "NOMORSURATHASIL", "FILEHASILURL", "TANGGALSELESAI", "CREATEDAT", "UPDATEDAT"],

  // 22. DOKUMEN LAMPIRAN LAYANAN SDM
  LAYANAN_SDM_DOKUMEN: ["ID", "IDPENGAJUAN", "NOMORTIKET", "NAMADOKUMEN", "JENISDOKUMEN", "FILEID", "FILENAME", "FILEURL", "FILEBASE64", "MIMETYPE", "SIZE", "UPLOADEDBY", "UPLOADEDAT", "VERSI", "AKTIF"],

  // 23. LOG RIWAYAT LAYANAN SDM
  LAYANAN_SDM_LOG: ["ID", "IDPENGAJUAN", "NOMORTIKET", "TIMESTAMP", "NIPUSER", "NAMAUSER", "ROLE", "STATUSLAMA", "STATUSBARU", "CATATAN"],

  // 24. PESAN & CHAT LAYANAN SDM
  LAYANAN_SDM_PESAN: ["ID", "IDPENGAJUAN", "NOMORTIKET", "PENGIRIMNIP", "PENGIRIMNAMA", "ROLE", "PESAN", "FILEID", "FILEURL", "FILENAME", "TIMESTAMP", "DIBACA"],

  // 25. MASTER PETUGAS LAYANAN SDM
  MASTER_PETUGAS_SDM: ["ID", "NIP", "NAMA", "UNIT", "ROLE", "AKTIF", "JENISLAYANAN"],

  // 26. UJI KOMPETENSI: BANK SOAL
  BANK_SOAL: ["IDSOAL", "PERTANYAAN", "OPSIA", "OPSIB", "OPSIC", "OPSID", "JAWABANBENAR", "KATEGORI"],

  // 27. UJI KOMPETENSI: PESERTA UKOM
  PESERTA_UKOM: ["NOPESERTA", "NIP", "NAMA", "JENJANG", "RUANGUJIAN", "JADWAL", "ISLOCKED", "UNLOCKPASSWORD"],

  // 28. UJI KOMPETENSI: HASIL UKOM
  HASIL_UKOM: ["NOPESERTA", "NIP", "NAMA", "NILAI", "NILAITKP", "TOTALNILAI", "STATUSLULUS", "TANGGALUJIAN", "WAKTUSELESAI", "ESSAYANSWERS", "CATATAN"],

  // 29. UJI KOMPETENSI: SESI UJIAN
  UKOM_SESSIONS: ["ID", "NAMASESI", "TANGGAL", "WAKTUMULAI", "WAKTUSELESAI", "SUPERVISORNIPS", "PESERTAIDS", "STATUS"],

  // 30. MANAJEMEN TALENTA: PENILAIAN
  PENILAIAN_TALENTA: ["ID", "PEGAWAI_ID", "NILAI_SKP", "KOMPETENSI", "INTEGRITAS", "DISIPLIN", "LEADERSHIP", "TEAMWORK", "INOVASI", "KOMUNIKASI", "PENDIDIKAN", "PENGALAMAN", "TOTAL_NILAI", "KATEGORI_TALENTA", "CREATED_AT"],

  // 31. MANAJEMEN TALENTA: TALENT POOL
  TALENT_POOL: ["ID", "PEGAWAI_ID", "RANKING", "STATUS_TALENTA", "READINESS_LEVEL", "REKOMENDASI_JABATAN", "CREATED_AT"],

  // 32. MANAJEMEN TALENTA: ASSESSMENT
  ASSESSMENT_TALENTA: ["ID", "PEGAWAI_ID", "HASIL_ASSESSMENT", "POTENSI", "KOMPETENSI", "ASSESSOR", "CATATAN", "TANGGAL_ASSESSMENT"],

  // 33. MANAJEMEN TALENTA: 9-BOX MATRIX
  NINEBOX: ["ID", "PEGAWAI_ID", "KINERJA", "POTENSI", "POSISI_BOX", "REKOMENDASI"],

  // 34. MANAJEMEN TALENTA: PENGEMBANGAN
  PENGEMBANGAN_TALENTA: ["ID", "PEGAWAI_ID", "JENIS_PENGEMBANGAN", "NAMA_PELATIHAN", "PENYELENGGARA", "TANGGAL_MULAI", "TANGGAL_SELESAI", "STATUS"],

  // 35. PRESENSI & ABSENSI ONLINE (SMART PRESENSI)
  ABSENSI: ["ID", "NIP", "NAMA", "TANGGAL", "WAKTU", "TIPE", "STATUS", "LOKASI", "CONFIDENCE", "SIMPEGSTATUS", "SIMPEGERROR", "LATITUDE", "LONGITUDE", "OFFICENAME", "DISTANCEMETERS", "FOTOURL"],

  // 36. LAPORAN & DOKUMEN MANAJEMEN
  LAPORAN: ["ID", "JUDUL", "PERIODE", "JENIS", "STATUS", "FILEURL", "CREATED_AT"],

  // 37. KONFIGURASI SISTEM
  CONFIG: ["KEY", "VALUE", "CATEGORY", "UPDATED_AT", "UPDATED_BY"],

  // 38. EVALUASI PPPK: EVALUASI KINERJA (BERBASIS SEMESTER)
  PPPK_EVALUATIONS: ["ID", "EMPLOYEE_ID", "PERIOD_ID", "STATUS", "SKP_SCORE", "BEHAVIOR_360_SCORE", "ATTENDANCE_SCORE", "FINAL_SCORE", "CATEGORY", "IS_RECOMMENDED_EXTENSION", "SNAPSHOT", "CREATED_AT", "UPDATED_AT"],

  // 39. EVALUASI PPPK: PERIODE PENILAIAN
  PPPK_PERIODS: ["ID", "YEAR", "SEMESTER", "NAME", "START_DATE", "END_DATE", "IS_ACTIVE", "IS_CLOSED"],

  // 40. EVALUASI PPPK: ASPEK PERILAKU
  PPPK_ASPECTS: ["ID", "NAME", "DESCRIPTION", "WEIGHT", "IS_ACTIVE", "SORT_ORDER"],

  // 41. EVALUASI PPPK: PENILAIAN PERILAKU 360
  PPPK_ASSESSMENTS: ["ID", "EVALUATION_ID", "ASPECT_ID", "ASSESSOR_ID", "ASSESSOR_TYPE", "SCORE", "NOTES", "CREATED_AT"],

  // 42. EVALUASI PPPK: PENETAPAN PENILAI
  PPPK_ASSIGNMENTS: ["ID", "PERIOD_ID", "EMPLOYEE_ID", "SUPERVISOR_ID", "STATUS", "APPROVAL_STATUS"],

  // 43. EVALUASI PPPK: REKAPITULASI PRESENSI
  PPPK_ATTENDANCE: ["ID", "EMPLOYEE_ID", "PERIOD_ID", "TOTAL_WORKING_DAYS", "PRESENT_DAYS", "LATE_DAYS", "ABSENT_DAYS", "LEAVE_DAYS", "SCORE", "SYNCED_AT"],

  // 44. EVALUASI PPPK: PENGATURAN BOBOT
  PPPK_SETTINGS: ["ID", "SKP_WEIGHT", "BEHAVIOR_WEIGHT", "ATTENDANCE_WEIGHT", "MIN_RECOMMEND_SCORE", "AUTO_SYNC_ATTENDANCE", "UPDATED_AT"],

  // 45. EVALUASI PPPK: AUDIT TRAIL LOG
  PPPK_AUDIT: ["ID", "EVALUATION_ID", "ACTION", "ACTOR_ID", "ACTOR_NAME", "DETAILS", "TIMESTAMP"],

  // 46. HUKUMAN DISIPLIN & KEPATUHAN LHKPN / LHKASN
  DISIPLIN_LHKPN: ["ID", "NIP", "NAMA", "UNITKERJA", "JABATAN", "JENIS", "TAHUN", "STATUS", "TANGGAL_LAPOR", "BUKTI_URL", "KETERANGAN"],

  // 47. TUGAS BELAJAR & IZIN BELAJAR (TUBEL & IBEL)
  TUBEL_IBEL: ["ID", "NIP", "NAMA", "JENIS", "INSTITUSI", "JURUSAN", "JENJANG", "TAHUN_MULAI", "TAHUN_SELESAI", "STATUS", "NOMOR_SK", "FILE_URL"],

  // 48. PERHITUNGAN UANG MAKAN & LEMBUR
  UANG_MAKAN: ["ID", "NIP", "NAMA", "BULAN", "TAHUN", "GOLONGAN", "HARI_KERJA", "TARIF", "TOTAL_BRUTO", "PPH", "TOTAL_NETTO", "STATUS_BAYAR"],

  // 49. SAKIP & REFORMASI BIROKRASI
  SAKIP_RB: ["ID", "TAHUN", "INDIKATOR", "TARGET", "REALISASI", "CAPAIAN", "STATUS", "UNITKERJA", "EVIDENCE_URL"],

  // 50. DIPA & POK ANGGARAN KEUANGAN
  ANGGARAN_DIPA: ["ID", "KODE_MAK", "URAIAN", "PAGU", "REALISASI", "SISA", "PERSENTASE", "TAHUN_ANGGARAN", "UNITKERJA"],

  // 51. LOG AKTIVITAS SISTEM & KEAMANAN
  ACTIVITY_LOG: ["ID", "TIMESTAMP", "USER_NIP", "USER_NAME", "ACTION", "MODULE", "DETAILS", "IP_ADDRESS"]
};

/**
 * FUNGSI SETUP: JALANKAN SEKALI DI EDITOR GOOGLE APPS SCRIPT
 * Untuk mengotorisasi hak akses DriveApp, SpreadsheetApp, dan DocumentApp.
 */
function setup() {
  try {
    var root = DriveApp.getRootFolder();
    var testFile = root.createFile("portal_sdm_setup_check.txt", "OK - Authorized");
    testFile.setTrashed(true);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    console.log("==================================================");
    console.log("=== OTORISASI GOOGLE APPS SCRIPT BERHASIL AKTIF ===");
    console.log("Nama Spreadsheet : " + (ss ? ss.getName() : "Tidak terdeteksi"));
    console.log("Izin Akses       : Google Drive, Sheets, dan Docs Siap!");
    console.log("Langkah Lanjut   : Deploy > New deployment > Web app");
    console.log("PENTING          : Execute as 'Me', Who has access 'Anyone'");
    console.log("==================================================");
    return "SUCCESS: Google Apps Script Backend Authorized.";
  } catch (err) {
    console.error("Setup Error: " + err.toString());
    throw err;
  }
}

/**
 * FUNGSI INITSHEETS: MEMBUAT SELURUH SHEET DAN HEADER OTOMATIS
 * Jalankan fungsi ini dari dropdown atas untuk menyiapkan database dalam 2 detik!
 */
function initSheets() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = initializeAllMasterSheets(ss);
    console.log("Inisialisasi selesai: " + JSON.stringify(result));
    return result;
  } catch (err) {
    console.error("InitSheets Error: " + err.toString());
    throw err;
  }
}

/**
 * FUNGSI TEST CONNECTION
 * Memverifikasi kemampuan baca dan tulis database secara aman.
 */
function testConnection() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    console.log("Total Sheet di Spreadsheet: " + sheets.length);
    return {
      status: "OK",
      spreadsheetName: ss.getName(),
      totalSheets: sheets.length,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error("Test Connection Gagal: " + e.toString());
    return { status: "ERROR", error: e.toString() };
  }
}

/**
 * ============================================================================
 * HTTP GET HANDLER (doGet)
 * ============================================================================
 */
function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : null;
    
    // 1. Health check & Server Time Sync
    if (action === 'GET_TIME' || action === 'PING' || action === 'HEALTH') {
      return createResponse({ 
        success: true, 
        time: new Date().toISOString(), 
        status: "OK", 
        version: "7.0.0",
        message: "Backend Portal SDM DJKI Aktif & Siap Menerima Data"
      });
    }

    var ssId = e && e.parameter ? e.parameter.ssId : null;
    var ss = getSpreadsheet(ssId);
    if (!ss) {
      // Jika diakses lewat browser tanpa parameter, tampilkan halaman status visual
      if (!action) {
        return createHtmlResponse();
      }
      return createResponse({ success: false, message: "Spreadsheet tidak ditemukan atau akses ditolak." });
    }

    // 2. Query GID Map (Peta ID Sheet)
    if (action === 'GET_GID_MAP' || (!action && e && e.parameter && e.parameter.ssId)) {
      var sheets = ss.getSheets();
      var gidMap = {};
      sheets.forEach(function(sh) { 
        gidMap[sh.getName()] = sh.getSheetId().toString(); 
      });
      return createResponse({ 
        success: true, 
        gidMap: gidMap, 
        spreadsheetName: ss.getName(),
        totalSheets: sheets.length
      });
    }

    // 3. Simple GET data via query parameter
    if (action === 'GET') {
      var moduleName = e.parameter.module || "PEGAWAI";
      return handleGet(ss, moduleName, e.parameter);
    }

    // 4. Quick Search Pegawai
    if (action === 'SEARCH_PEGAWAI') {
      var query = (e.parameter.q || "").toLowerCase().trim();
      return handleSearchPegawai(ss, query);
    }

    // 5. Get Pegawai By NIP
    if (action === 'GET_PEGAWAI_BY_NIP') {
      var nip = (e.parameter.nip || "").replace(/\D/g, '').trim();
      return handleGetPegawaiByNip(ss, nip);
    }

    // 6. Summary Row Count across All Sheets
    if (action === 'SUMMARY' || action === 'GET_ALL_COUNTS') {
      return handleGetDatabaseSummary(ss);
    }

    // Default browser fallback: Tampilkan halaman dashboard status
    return createHtmlResponse();
  } catch (err) { 
    return createResponse({ success: false, message: "GET Error: " + err.toString() }); 
  }
}

/**
 * ============================================================================
 * HTTP POST HANDLER (doPost)
 * ============================================================================
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ success: false, message: "Request body kosong." });
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createResponse({ success: false, message: "Gagal memproses JSON request: " + parseErr.toString() });
    }

    var action = (data.action || "").toString().trim(); 
    var moduleName = (data.module || "DATA").toString().toUpperCase().trim();
    var payload = data.payload;
    var ssId = data.spreadsheetId; 
    var ss = getSpreadsheet(ssId);
    var driveFolderId = data.driveFolderId || FOLDER_ID_DATABASE;

    // Fast-path untuk PING / HEALTH / TIME
    if (action === 'PING' || action === 'HEALTH' || action === 'GET_TIME') {
      return createResponse({ success: true, status: "OK", time: new Date().toISOString(), version: "7.0.0" });
    }

    // Routing aksi
    if (action === 'UPLOAD') return handleUpload(payload, driveFolderId);
    
    // SAVE: jika payload adalah array, otomatis alihkan ke batch save
    if (action === 'SAVE') {
      if (Array.isArray(payload)) {
        return handleBatchSave(ss, moduleName, payload);
      }
      return handleSave(ss, moduleName, payload);
    }

    if (action === 'BATCH_SAVE' || action === 'BULK_SAVE') return handleBatchSave(ss, moduleName, payload);
    if (action === 'DELETE') return handleDelete(ss, moduleName, payload);
    if (action === 'DELETE_BATCH') return handleBatchDelete(ss, moduleName, payload);
    if (action === 'GET') return handleGet(ss, moduleName, payload);
    if (action === 'GET_PEGAWAI_BY_NIP' || action === 'GET_PEGAWAI') {
      var queryNip = (payload && (payload.nip || payload.id || payload.q || payload.search)) || (data.nip || data.id || data.q) || "";
      return handleGetPegawaiByNip(ss, queryNip);
    }
    if (action === 'SEARCH_PEGAWAI') {
      var querySearch = (payload && (payload.q || payload.query)) || (data.q || data.query) || "";
      return handleSearchPegawai(ss, querySearch);
    }
    if (action === 'AUDIT_DATABASE') return handleAuditDatabase(ss, payload);
    if (action === 'DELETE_SHEET') return handleDeleteSheet(ss, payload);
    if (action === 'CLEANUP_EMPTY_ROWS') return handleCleanupEmptyRows(ss, moduleName);
    if (action === 'INITIALIZE_ALL_SHEETS' || action === 'AUTO_INIT') return handleAutoInitSheets(ss);
    
    if (action === 'GET_GID_MAP') {
      if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
      var sheets = ss.getSheets();
      var gidMap = {};
      sheets.forEach(function(sh) { gidMap[sh.getName()] = sh.getSheetId().toString(); });
      return createResponse({ success: true, gidMap: gidMap, spreadsheetName: ss.getName() });
    }
    
    if (action === 'GENERATE_DOC') return handleGenerateFromTemplate(payload, driveFolderId);
    if (action === 'EXPORT_BACKUP') return handleExportBackup(ss);
    if (action === 'RESTORE_BACKUP') return handleRestoreBackup(ss, payload);

    return createResponse({ success: false, message: "Aksi '" + action + "' tidak dikenali pada backend." });
  } catch (err) { 
    return createResponse({ success: false, message: "POST Error: " + err.toString() }); 
  }
}

/**
 * ============================================================================
 * RESOLVER KUNCI REKAMAN (PRIMARY KEY IDENTIFIER)
 * Menentukan kunci unik pencocokan data untuk setiap modul aplikasi secara cerdas
 * ============================================================================
 */
function getRecordKey(moduleName, item) {
  if (!item || typeof item !== 'object') return { keyName: '', keyValue: '' };
  var m = (moduleName || '').toUpperCase().trim();

  // 1. Modul PEGAWAI: Utamakan NIP (dibersihkan dari non-digit), fallback ID
  if (m === 'PEGAWAI') {
    if (item.nip !== undefined && item.nip !== null && String(item.nip).trim() !== '') {
      return { keyName: 'nip', keyValue: String(item.nip).replace(/\D/g, '').trim() };
    }
    if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') {
      return { keyName: 'id', keyValue: String(item.id).trim() };
    }
  }

  // 2. Modul USERS: Utamakan NIP atau ID
  if (m === 'USERS') {
    if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') {
      return { keyName: 'id', keyValue: String(item.id).trim() };
    }
    if (item.nip !== undefined && item.nip !== null && String(item.nip).trim() !== '') {
      return { keyName: 'nip', keyValue: String(item.nip).replace(/\D/g, '').trim() };
    }
  }

  // 3. Modul CONFIG: Key atau ID
  if (m === 'CONFIG') {
    if (item.key !== undefined && item.key !== null) {
      return { keyName: 'key', keyValue: String(item.key).trim().toUpperCase() };
    }
    if (item.id !== undefined && item.id !== null) {
      return { keyName: 'key', keyValue: String(item.id).trim().toUpperCase() };
    }
  }

  // 4. Modul BANK SOAL
  if (m === 'BANK_SOAL') {
    if (item.idSoal !== undefined && item.idSoal !== null) {
      return { keyName: 'idsoal', keyValue: String(item.idSoal).trim() };
    }
  }

  // 5. Modul PESERTA & HASIL UKOM
  if (m === 'PESERTA_UKOM' || m === 'HASIL_UKOM') {
    if (item.noPeserta !== undefined && item.noPeserta !== null) {
      return { keyName: 'nopeserta', keyValue: String(item.noPeserta).trim() };
    }
    if (item.nip !== undefined && item.nip !== null) {
      return { keyName: 'nip', keyValue: String(item.nip).replace(/\D/g, '').trim() };
    }
  }

  // 6. Modul LAYANAN SDM
  if (m === 'LAYANAN_SDM') {
    if (item.nomorTiket !== undefined && item.nomorTiket !== null) {
      return { keyName: 'nomortiket', keyValue: String(item.nomorTiket).trim() };
    }
  }

  // 7. Modul MASTER LAYANAN
  if (m === 'MASTER_LAYANAN') {
    if (item.kodeLayanan !== undefined && item.kodeLayanan !== null) {
      return { keyName: 'kodelayanan', keyValue: String(item.kodeLayanan).trim() };
    }
  }

  // 8. Modul TUPOKSI SDM
  if (m === 'TUPOKSI_SDM') {
    if (item.id !== undefined && item.id !== null) {
      return { keyName: 'id', keyValue: String(item.id).trim() };
    }
    if (item.kodeTupoksi !== undefined && item.kodeTupoksi !== null) {
      return { keyName: 'kodetupoksi', keyValue: String(item.kodeTupoksi).trim() };
    }
  }

  // 9. Modul PERSURATAN & SPMT/SPP
  if (m === 'PERSURATAN' || m === 'SPMT_SPP' || m === 'PELANTIKAN') {
    if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') {
      return { keyName: 'id', keyValue: String(item.id).trim() };
    }
    if (item.nomorSurat !== undefined && item.nomorSurat !== null) {
      return { keyName: 'nomorsurat', keyValue: String(item.nomorSurat).trim() };
    }
    if (item.nomor !== undefined && item.nomor !== null) {
      return { keyName: 'nomor', keyValue: String(item.nomor).trim() };
    }
  }

  // 10. Modul EVALUASI PPPK
  if (m === 'PPPK_EVALUATIONS') {
    if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') {
      return { keyName: 'id', keyValue: String(item.id).trim() };
    }
    if (item.employee_id && item.period_id) {
      return { keyName: 'composite_pppk', keyValue: String(item.employee_id).trim() + "_" + String(item.period_id).trim() };
    }
  }

  // Generic Candidate Lookup
  var candidates = ['id', 'nip', 'nopeserta', 'noPeserta', 'nomorTiket', 'nomortiket', 'idSoal', 'idsoal', 'kodeTupoksi', 'kodetupoksi', 'kodeLayanan', 'kodelayanan', 'nomorSurat', 'nomorsurat', 'nomor', 'key'];
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (item[c] !== undefined && item[c] !== null && String(item[c]).trim() !== '') {
      var val = String(item[c]).trim();
      if (c.toLowerCase() === 'nip') val = val.replace(/\D/g, '');
      return { keyName: c.toLowerCase(), keyValue: val };
    }
  }

  return { keyName: '', keyValue: '' };
}

/**
 * ============================================================================
 * HANDLER: BATCH SAVE / BULK SAVE (SUPER CEPAT DENGAN SETVALUES)
 * ============================================================================
 */
function handleBatchSave(ss, moduleName, payload) {
  try {
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
    if (!payload || !Array.isArray(payload) || payload.length === 0) {
      return createResponse({ success: false, message: "Payload batch save harus berupa array yang tidak kosong." });
    }

    var sheet = getOrCreateSheet(ss, moduleName, payload[0]);
    var lastCol = Math.max(1, sheet.getLastColumn());
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    // 1. Periksa key baru dan otomatis tambahkan kolom jika belum ada
    var allKeysMap = {};
    payload.forEach(function(item) {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(function(k) {
          allKeysMap[k.toUpperCase().trim()] = k;
        });
      }
    });

    var keysToAdd = [];
    Object.keys(allKeysMap).forEach(function(kUpper) {
      var kLower = kUpper.toLowerCase().replace(/[\s_]/g, '');
      var found = headers.some(function(h) {
        return h && h.toString().toLowerCase().replace(/[\s_]/g, '') === kLower;
      });
      if (!found) {
        keysToAdd.push(kUpper);
      }
    });

    if (keysToAdd.length > 0) {
      var startCol = headers.length + 1;
      sheet.getRange(1, startCol, 1, keysToAdd.length).setValues([keysToAdd]);
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    }

    // 2. Ambil seluruh data kunci yang ada di sheet untuk pencocokan cepat
    var lastRow = sheet.getLastRow();
    var existingRowMap = {}; // targetKey -> rowNumber (1-indexed)

    if (lastRow > 1) {
      var sampleKey = getRecordKey(moduleName, payload[0]);
      var keyColIdx = -1;

      if (sampleKey.keyName) {
        for (var h = 0; h < headers.length; h++) {
          var hName = headers[h] ? headers[h].toString().toLowerCase().replace(/[\s_]/g, '') : '';
          if (hName === sampleKey.keyName.replace(/[\s_]/g, '')) {
            keyColIdx = h;
            break;
          }
        }
      }

      if (keyColIdx > -1) {
        var existingKeys = sheet.getRange(2, keyColIdx + 1, lastRow - 1, 1).getValues();
        var isNipCol = (sampleKey.keyName === 'nip');
        for (var r = 0; r < existingKeys.length; r++) {
          var kVal = existingKeys[r][0] ? existingKeys[r][0].toString().trim() : '';
          if (isNipCol) kVal = kVal.replace(/\D/g, '');
          if (kVal !== "") existingRowMap[kVal] = r + 2;
        }
      }
    }

    var rowsToAppend = [];
    var updatedCount = 0;

    // 3. Susun data baris
    payload.forEach(function(item) {
      if (!item || typeof item !== 'object') return;
      var recordKey = getRecordKey(moduleName, item);
      var targetKey = recordKey.keyValue;

      var rowValues = headers.map(function(h) {
        var hName = h ? h.toString().toLowerCase().replace(/[\s_]/g, '') : '';
        var k = Object.keys(item).find(function(prop) {
          return prop.toLowerCase().replace(/[\s_]/g, '') === hName;
        });
        var val = k !== undefined ? item[k] : "";
        if (moduleName === 'PEGAWAI' && hName === 'pendidikan') {
          val = normalizePendidikanForGAS(val);
        }
        if (moduleName === 'PEGAWAI' && (hName === 'foto' || hName === 'fotourl' || hName === 'photo')) {
          val = normalizePhotoUrlForGAS(val);
        }
        val = formatToDDMMYYYYIfDate(val, hName);
        return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
      });

      if (targetKey !== "" && existingRowMap[targetKey]) {
        var existingRowNum = existingRowMap[targetKey];
        sheet.getRange(existingRowNum, 1, 1, headers.length).setValues([rowValues]);
        updatedCount++;
      } else {
        rowsToAppend.push(rowValues);
      }
    });

    // 4. Batch Append sekaligus
    if (rowsToAppend.length > 0) {
      var appendStartRow = sheet.getLastRow() + 1;
      sheet.getRange(appendStartRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
    }

    return createResponse({ 
      success: true, 
      message: "Batch save berhasil diproses.", 
      insertedCount: rowsToAppend.length, 
      updatedCount: updatedCount,
      totalCount: payload.length
    });
  } catch (e) {
    return createResponse({ success: false, message: "Batch save error: " + e.toString() });
  }
}

/**
 * ============================================================================
 * HANDLER: SAVE SINGLE RECORD
 * ============================================================================
 */
function handleSave(ss, moduleName, payload) {
  try {
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
    var sheet = getOrCreateSheet(ss, moduleName, payload);
    var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    var payloadKeys = Object.keys(payload);
    
    // Tambah kolom baru otomatis jika ada key baru di payload
    payloadKeys.forEach(function(key) {
      var keyLower = key.toLowerCase().replace(/[\s_]/g, '');
      var found = headers.some(function(h) {
        return h && h.toString().toLowerCase().replace(/[\s_]/g, '') === keyLower;
      });
      if (!found) {
        sheet.getRange(1, headers.length + 1).setValue(key.toUpperCase());
        headers.push(key.toUpperCase());
      }
    });

    var lastRow = sheet.getLastRow();
    var recordKey = getRecordKey(moduleName, payload);
    var keyIndex = -1;
    var targetKey = recordKey.keyValue;
    var isNipMatching = (recordKey.keyName === 'nip');

    if (recordKey.keyName) {
      for (var h = 0; h < headers.length; h++) {
        var hName = headers[h] ? headers[h].toString().toLowerCase().replace(/[\s_]/g, '') : '';
        if (hName === recordKey.keyName.replace(/[\s_]/g, '')) {
          keyIndex = h;
          break;
        }
      }
    }

    // Jika record sudah ada, update in-place tanpa merusak kolom lain
    if (keyIndex > -1 && targetKey !== "" && lastRow > 1) {
      var displayValues = sheet.getRange(1, keyIndex + 1, lastRow, 1).getValues();
      for (var i = 1; i < displayValues.length; i++) {
        var cellValue = displayValues[i][0] ? displayValues[i][0].toString().trim() : '';
        if (isNipMatching) cellValue = cellValue.replace(/\D/g, '');

        if (cellValue === targetKey) {
          var rowNum = i + 1;
          var existingRowValues = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
          var rowValues = headers.map(function(h, colIdx) {
            var hName = h ? h.toString().toLowerCase().replace(/[\s_]/g, '') : '';
            var key = Object.keys(payload).find(function(k) {
              return k.toLowerCase().replace(/[\s_]/g, '') === hName;
            });
            if (key !== undefined) {
              var val = payload[key];
              if (moduleName === 'PEGAWAI' && hName === 'pendidikan') {
                val = normalizePendidikanForGAS(val);
              }
              if (moduleName === 'PEGAWAI' && (hName === 'foto' || hName === 'fotourl' || hName === 'photo')) {
                val = normalizePhotoUrlForGAS(val);
              }
              val = formatToDDMMYYYYIfDate(val, hName);
              return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
            } else {
              var existingVal = existingRowValues[colIdx];
              if (existingVal instanceof Date) {
                return Utilities.formatDate(existingVal, "Asia/Jakarta", "dd/MM/yyyy");
              }
              return existingVal;
            }
          });
          sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowValues]);
          return createResponse({ success: true, message: "Record berhasil diperbarui (Updated)." });
        }
      }
    }

    // Append record baru jika belum ada
    var rowData = headers.map(function(h) {
      var hName = h ? h.toString().toLowerCase().replace(/[\s_]/g, '') : '';
      var key = Object.keys(payload).find(function(k) {
        return k.toLowerCase().replace(/[\s_]/g, '') === hName;
      });
      var val = key ? payload[key] : "";
      if (moduleName === 'PEGAWAI' && hName === 'pendidikan') {
        val = normalizePendidikanForGAS(val);
      }
      if (moduleName === 'PEGAWAI' && (hName === 'foto' || hName === 'fotourl' || hName === 'photo')) {
        val = normalizePhotoUrlForGAS(val);
      }
      val = formatToDDMMYYYYIfDate(val, hName);
      return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
    });

    sheet.appendRow(rowData);
    return createResponse({ success: true, message: "Record baru berhasil ditambahkan (Added)." });
  } catch (e) { 
    return createResponse({ success: false, message: e.toString() }); 
  }
}

/**
 * ============================================================================
 * HANDLER: DELETE RECORD
 * ============================================================================
 */
function handleDelete(ss, moduleName, payload) {
  try {
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
    var sheet = findSheetByName(ss, moduleName);
    if (!sheet) return createResponse({ success: false, message: "Sheet '" + moduleName + "' tidak ditemukan." });
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return createResponse({ success: true, message: "Sheet kosong." });
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var recordKey = getRecordKey(moduleName, payload);
    var searchKey = recordKey.keyValue;
    var isNip = (recordKey.keyName === 'nip');
    var keyIndex = -1;

    if (recordKey.keyName) {
      for (var h = 0; h < headers.length; h++) {
        var hName = headers[h] ? headers[h].toString().toLowerCase().replace(/[\s_]/g, '') : '';
        if (hName === recordKey.keyName.replace(/[\s_]/g, '')) {
          keyIndex = h;
          break;
        }
      }
    }

    // Fallback pencarian kolom id/nip jika belum ketemu
    if (keyIndex === -1) {
      for (var h2 = 0; h2 < headers.length; h2++) {
        var hName2 = headers[h2] ? headers[h2].toString().toLowerCase().replace(/[\s_]/g, '') : '';
        if (hName2 === 'id' || hName2 === 'nip' || hName2 === 'nopeserta' || hName2 === 'key') {
          keyIndex = h2;
          break;
        }
      }
    }

    if (keyIndex === -1 || searchKey === "") {
      return createResponse({ success: false, message: "Tidak ada parameter ID, NIP, atau identifikasi yang cocok untuk dihapus." });
    }

    var dataValues = sheet.getRange(1, keyIndex + 1, lastRow, 1).getValues();
    var deletedCount = 0;
    for (var i = dataValues.length - 1; i >= 1; i--) {
      var val = dataValues[i][0] ? dataValues[i][0].toString().trim() : '';
      if (isNip) val = val.replace(/\D/g, '');

      if (val === searchKey) {
        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }
    return createResponse({ success: true, deletedCount: deletedCount, message: deletedCount + " baris berhasil dihapus." });
  } catch (e) { 
    return createResponse({ success: false, message: e.toString() }); 
  }
}

/**
 * ============================================================================
 * HANDLER: BATCH DELETE
 * ============================================================================
 */
function handleBatchDelete(ss, moduleName, payload) {
  try {
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
    var sheet = findSheetByName(ss, moduleName);
    if (!sheet) return createResponse({ success: false, message: "Sheet not found" });

    var items = Array.isArray(payload) ? payload : (payload && payload.items ? payload.items : []);
    if (items.length === 0) return createResponse({ success: true, deletedCount: 0 });

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return createResponse({ success: true, deletedCount: 0 });

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var keysToDelete = new Set();
    var isNip = (moduleName === 'PEGAWAI');

    items.forEach(function(item) {
      var k = getRecordKey(moduleName, item);
      if (k.keyValue) keysToDelete.add(k.keyValue);
    });

    var keyIndex = 0; // Default kolom 1 (ID)
    for (var h = 0; h < headers.length; h++) {
      var hName = headers[h] ? headers[h].toString().toLowerCase().replace(/[\s_]/g, '') : '';
      if (isNip && hName === 'nip') { keyIndex = h; break; }
      if (!isNip && (hName === 'id' || hName === 'key' || hName === 'nopeserta')) { keyIndex = h; break; }
    }

    var dataValues = sheet.getRange(1, keyIndex + 1, lastRow, 1).getValues();
    var deletedCount = 0;

    for (var r = dataValues.length - 1; r >= 1; r--) {
      var val = dataValues[r][0] ? dataValues[r][0].toString().trim() : '';
      if (isNip) val = val.replace(/\D/g, '');
      if (keysToDelete.has(val)) {
        sheet.deleteRow(r + 1);
        deletedCount++;
      }
    }

    return createResponse({ success: true, deletedCount: deletedCount });
  } catch (e) {
    return createResponse({ success: false, message: e.toString() });
  }
}

/**
 * ============================================================================
 * HANDLER: GET DATA DENGAN FAST MEMORY PARSING
 * ============================================================================
 */
function handleGet(ss, moduleName, params) {
  try {
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
    var sheet = findSheetByName(ss, moduleName);
    if (!sheet) return createResponse({ success: false, message: "Sheet " + moduleName + " tidak ditemukan." });
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) {
      return createResponse({ success: true, data: [], count: 0 });
    }

    var limit = params && params.limit ? parseInt(params.limit, 10) : 0;
    var offset = params && params.offset ? parseInt(params.offset, 10) : 0;

    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = data[0];
    var rows = [];

    var start = 1 + offset;
    var end = limit > 0 ? Math.min(data.length, start + limit) : data.length;

    for (var r = start; r < end; r++) {
      var row = data[r];
      // Lewati baris yang sepenuhnya kosong
      var hasValue = false;
      for (var c = 0; c < row.length; c++) {
        if (row[c] !== "" && row[c] !== null && row[c] !== undefined) {
          hasValue = true;
          break;
        }
      }
      if (!hasValue) continue;

      var obj = {};
      for (var i = 0; i < headers.length; i++) {
        var h = headers[i];
        if (!h) continue;
        var val = row[i];
        if (typeof val === 'string' && (val.indexOf('[') === 0 || val.indexOf('{') === 0)) {
          try {
            obj[h] = JSON.parse(val);
          } catch (e) {
            obj[h] = val;
          }
        } else if (val instanceof Date) {
          obj[h] = Utilities.formatDate(val, "Asia/Jakarta", "dd/MM/yyyy");
        } else {
          obj[h] = val;
        }
      }
      rows.push(obj);
    }

    // Filter jika query spesifik NIP/ID diberikan pada modul PEGAWAI
    if (params && (params.nip || params.id) && moduleName.toUpperCase() === 'PEGAWAI') {
      var searchNip = (params.nip || params.id || "").toString().trim();
      var cleanNip = searchNip.replace(/\D/g, '');
      var filtered = rows.filter(function(r) {
        var rNip = r.NIP || r.nip || "";
        var rId = r.ID || r.id || "";
        var rNipClean = String(rNip).replace(/\D/g, '');
        if (cleanNip && rNipClean && rNipClean === cleanNip) return true;
        if (rId && String(rId).trim().toLowerCase() === searchNip.toLowerCase()) return true;
        if (rNip && String(rNip).trim().toLowerCase() === searchNip.toLowerCase()) return true;
        return false;
      });
      return createResponse({ success: true, data: filtered, count: filtered.length, total: filtered.length });
    }

    return createResponse({ success: true, data: rows, count: rows.length, total: lastRow - 1 });
  } catch (e) { 
    return createResponse({ success: false, message: e.toString() }); 
  }
}

/**
 * ============================================================================
 * HANDLER: SEARCH PEGAWAI SECARA INSTAN
 * ============================================================================
 */
function handleSearchPegawai(ss, query) {
  try {
    var sheet = findSheetByName(ss, "PEGAWAI");
    if (!sheet) return createResponse({ success: false, message: "Sheet PEGAWAI tidak ditemukan." });
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2) return createResponse({ success: true, data: [], count: 0 });

    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = data[0];
    var nipIdx = -1, namaIdx = -1, jabIdx = -1, unitIdx = -1;

    for (var h = 0; h < headers.length; h++) {
      var hName = headers[h] ? headers[h].toString().toLowerCase().replace(/[\s_]/g, '') : '';
      if (hName === 'nip') nipIdx = h;
      if (hName === 'nama') namaIdx = h;
      if (hName === 'jabatan') jabIdx = h;
      if (hName === 'unitkerja') unitIdx = h;
    }

    var cleanQ = query.replace(/\D/g, '');
    var results = [];

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var nipVal = nipIdx > -1 ? (row[nipIdx] ? row[nipIdx].toString().replace(/\D/g, '') : '') : '';
      var namaVal = namaIdx > -1 ? (row[namaIdx] ? row[namaIdx].toString().toLowerCase() : '') : '';
      var jabVal = jabIdx > -1 ? (row[jabIdx] ? row[jabIdx].toString().toLowerCase() : '') : '';
      var unitVal = unitIdx > -1 ? (row[unitIdx] ? row[unitIdx].toString().toLowerCase() : '') : '';

      var matched = false;
      if (cleanQ !== "" && nipVal.indexOf(cleanQ) !== -1) matched = true;
      if (!matched && query !== "" && (namaVal.indexOf(query) !== -1 || jabVal.indexOf(query) !== -1 || unitVal.indexOf(query) !== -1)) matched = true;

      if (matched) {
        var obj = {};
        for (var c = 0; c < headers.length; c++) {
          obj[headers[c]] = row[c];
        }
        results.push(obj);
        if (results.length >= 50) break; // Batasi max 50 hasil untuk kecepatan
      }
    }

    return createResponse({ success: true, data: results, count: results.length });
  } catch (e) {
    return createResponse({ success: false, message: e.toString() });
  }
}

/**
 * ============================================================================
 * HANDLER: GET PEGAWAI BY NIP
 * ============================================================================
 */
function handleGetPegawaiByNip(ss, nip) {
  try {
    var sheet = findSheetByName(ss, "PEGAWAI");
    if (!sheet) return createResponse({ success: false, message: "Sheet PEGAWAI tidak ditemukan." });

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2) return createResponse({ success: true, data: null });

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var nipIdx = -1, idIdx = -1, namaIdx = -1;
    for (var h = 0; h < headers.length; h++) {
      var hName = headers[h] ? headers[h].toString().toLowerCase().replace(/[\s_]/g, '') : '';
      if (hName === 'nip') nipIdx = h;
      if (hName === 'id') idIdx = h;
      if (hName === 'nama' || hName === 'namapegawai') namaIdx = h;
    }
    if (nipIdx === -1 && idIdx === -1 && namaIdx === -1) {
      return createResponse({ success: false, message: "Kolom NIP / ID tidak ditemukan pada sheet PEGAWAI." });
    }

    var cleanTarget = nip ? nip.toString().trim() : '';
    var cleanDigits = cleanTarget.replace(/\D/g, '');
    var lowerTarget = cleanTarget.toLowerCase();

    var displayRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    var displayValues = displayRange.getDisplayValues();
    var rawValues = displayRange.getValues();

    for (var r = 0; r < displayValues.length; r++) {
      var rowDisp = displayValues[r];
      var rowRaw = rawValues[r];
      
      var rowNipDisp = nipIdx !== -1 && rowDisp[nipIdx] ? rowDisp[nipIdx].toString().trim() : '';
      var rowNipDigits = rowNipDisp.replace(/\D/g, '');
      var rowId = idIdx !== -1 && rowDisp[idIdx] ? rowDisp[idIdx].toString().trim() : '';
      var rowNama = namaIdx !== -1 && rowDisp[namaIdx] ? rowDisp[namaIdx].toString().trim().toLowerCase() : '';

      var isMatch = false;
      if (cleanDigits && rowNipDigits && rowNipDigits === cleanDigits) isMatch = true;
      else if (rowId && (rowId === cleanTarget || rowId.toLowerCase() === lowerTarget)) isMatch = true;
      else if (rowNipDisp && (rowNipDisp === cleanTarget || rowNipDisp.toLowerCase() === lowerTarget)) isMatch = true;
      else if (lowerTarget.length >= 3 && isNaN(Number(cleanTarget)) && (rowNama === lowerTarget || rowNama.indexOf(lowerTarget) !== -1)) isMatch = true;

      if (isMatch) {
        var obj = {};
        for (var c = 0; c < headers.length; c++) {
          var hKey = headers[c];
          if (!hKey) continue;
          var val = rowRaw[c];
          var dispVal = rowDisp[c];
          if (typeof val === 'string' && (val.indexOf('[') === 0 || val.indexOf('{') === 0)) {
            try {
              obj[hKey] = JSON.parse(val);
            } catch (e) {
              obj[hKey] = val;
            }
          } else if (val instanceof Date) {
            obj[hKey] = dispVal || Utilities.formatDate(val, "Asia/Jakarta", "dd/MM/yyyy");
          } else if (typeof val === 'number' && (hKey.toLowerCase().indexOf('nip') !== -1 || hKey.toLowerCase().indexOf('nik') !== -1)) {
            obj[hKey] = dispVal || String(val);
          } else {
            obj[hKey] = val !== undefined && val !== null ? val : "";
          }
        }
        return createResponse({ success: true, data: obj });
      }
    }
    return createResponse({ success: true, data: null, message: "Pegawai dengan NIP/ID " + cleanTarget + " tidak ditemukan." });
  } catch (e) {
    return createResponse({ success: false, message: e.toString() });
  }
}

/**
 * ============================================================================
 * HANDLER: GET DATABASE SUMMARY
 * ============================================================================
 */
function handleGetDatabaseSummary(ss) {
  try {
    var sheets = ss.getSheets();
    var summary = {};
    sheets.forEach(function(sh) {
      summary[sh.getName()] = Math.max(0, sh.getLastRow() - 1);
    });
    return createResponse({ 
      success: true, 
      spreadsheetName: ss.getName(),
      totalSheets: sheets.length,
      rowCounts: summary,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    return createResponse({ success: false, message: e.toString() });
  }
}

/**
 * ============================================================================
 * HANDLER: UPLOAD FILE KE GOOGLE DRIVE
 * ============================================================================
 */
function handleUpload(payload, driveFolderId) {
  try {
    var folder = null;
    var targetFolderId = (driveFolderId && driveFolderId !== "PASTE_YOUR_FOLDER_ID_HERE") ? driveFolderId : FOLDER_ID_DATABASE;

    // 1. Coba akses folder spesifik yang ditentukan
    if (targetFolderId && targetFolderId.trim() !== "") {
      try {
        folder = DriveApp.getFolderById(targetFolderId.trim());
      } catch (errFolder) {
        console.warn("Folder ID spesifik tidak dapat diakses atau bukan milik akun ini: " + errFolder.toString());
        folder = null;
      }
    }

    // 2. Jika folder target tidak valid/akses ditolak, gunakan atau buat subfolder 'PORTAL_SDM_UPLOADS' di Drive akun
    if (!folder) {
      try {
        var existingFolders = DriveApp.getFoldersByName("PORTAL_SDM_UPLOADS");
        folder = existingFolders.hasNext() ? existingFolders.next() : DriveApp.createFolder("PORTAL_SDM_UPLOADS");
      } catch (errCreateFolder) {
        folder = DriveApp.getRootFolder();
      }
    }

    // 3. Decode base64 data
    var base64Data = (payload && payload.base64) ? payload.base64 : "";
    if (base64Data.indexOf(",") !== -1) {
      base64Data = base64Data.split(",")[1];
    }
    var bytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(bytes, payload.mimeType || "image/jpeg", payload.fileName || ("FILE_" + Date.now()));

    // 4. Simpan file
    var file;
    try {
      file = folder.createFile(blob);
    } catch (errFileInFolder) {
      console.warn("Gagal membuat file di folder target, mencoba fallback ke root Drive: " + errFileInFolder.toString());
      try {
        file = DriveApp.getRootFolder().createFile(blob);
      } catch (errRoot) {
        throw new Error("Gagal menyimpan file ke Google Drive: " + errRoot.toString());
      }
    }

    // 5. Atur izin sharing
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      try {
        file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (domainErr) {
        console.warn("Set sharing dibatasi oleh kebijakan Workspace: " + shareErr.toString());
      }
    }

    var fileId = file.getId();
    var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view";
    var directUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    var thumbnailUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1000";
    var ucUrl = "https://drive.google.com/uc?id=" + fileId + "&export=view";
    var downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;

    return createResponse({ 
      success: true, 
      fileUrl: directUrl,
      viewUrl: viewUrl,
      directUrl: directUrl,
      thumbnailUrl: thumbnailUrl,
      downloadUrl: downloadUrl,
      fileId: fileId
    });
  } catch (e) {
    var errMsg = e.toString();
    if (errMsg.indexOf("存取遭拒") !== -1 || errMsg.indexOf("Access denied") !== -1 || errMsg.indexOf("DriveApp") !== -1) {
      return createResponse({ 
        success: false, 
        message: "Akses Google Drive Ditolak (DriveApp Access Denied).\n\n" +
                 "Langkah Perbaikan di Google Apps Script:\n" +
                 "1. Pastikan Web App dideploy dengan 'Execute as: Me' (bukan 'User accessing web app') dan 'Who has access: Anyone'.\n" +
                 "2. Buka editor Google Apps Script, pilih fungsi 'setup', lalu klik 'Run' (Jalankan) untuk mengizinkan hak akses Google Drive.\n" +
                 "3. Pastikan ID Folder Drive di Pengaturan adalah folder milik akun Google Anda (atau akun Anda memiliki akses Editor)."
      });
    }
    return createResponse({ success: false, message: "UPLOAD_ERROR: " + errMsg }); 
  }
}

/**
 * ============================================================================
 * HANDLER: GENERATE DOKUMEN DARI TEMPLATE GOOGLE DOCS (DENGAN OPSIONAL EXPORT PDF)
 * ============================================================================
 */
function handleGenerateFromTemplate(payload, driveFolderId) {
  try {
    var templateId = payload.templateId;
    var fileName = payload.fileName || "Surat_Baru_" + Date.now();
    var replacements = payload.data || {}; 
    var templateFile = DriveApp.getFileById(templateId);
    
    var folder;
    var targetFolderId = (driveFolderId && driveFolderId !== "PASTE_YOUR_FOLDER_ID_HERE") ? driveFolderId : FOLDER_ID_DATABASE;
    if (targetFolderId && targetFolderId.trim() !== "") {
      try {
        folder = DriveApp.getFolderById(targetFolderId.trim());
      } catch (fErr) {
        folder = DriveApp.getRootFolder();
      }
    } else {
      folder = DriveApp.getRootFolder();
    }

    var newFile = templateFile.makeCopy(fileName, folder);
    var doc = DocumentApp.openById(newFile.getId());
    var body = doc.getBody();
    for (var key in replacements) {
      body.replaceText("{{" + key.toUpperCase() + "}}", replacements[key] || "-");
      body.replaceText("{{" + key + "}}", replacements[key] || "-");
    }
    doc.saveAndClose();

    try {
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sErr) {}

    var resObj = {
      success: true, 
      fileUrl: newFile.getUrl(), 
      fileId: newFile.getId(),
      docUrl: "https://docs.google.com/document/d/" + newFile.getId() + "/edit"
    };

    // Opsional Ekspor PDF langsung jika diminta
    if (payload.exportPdf === true) {
      try {
        var pdfBlob = newFile.getAs("application/pdf").setName(fileName + ".pdf");
        var pdfFile = folder.createFile(pdfBlob);
        try { pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
        resObj.pdfUrl = pdfFile.getUrl();
        resObj.pdfId = pdfFile.getId();
      } catch (pdfErr) {
        console.warn("Gagal mengekspor PDF: " + pdfErr.toString());
      }
    }

    return createResponse(resObj);
  } catch (e) { 
    return createResponse({ success: false, message: e.toString() }); 
  }
}

/**
 * ============================================================================
 * HANDLER: AUDIT DATABASE (MEMERIKSA KELENGKAPAN SHEET DAN KOLOM)
 * ============================================================================
 */
function handleAuditDatabase(ss, payload) {
  try {
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
    var sheets = ss.getSheets();
    var auditResults = [];
    var expectedSheets = payload && payload.expectedSheets ? payload.expectedSheets : [];
    
    // Jika tidak ada expectedSheets yang dikirim, gunakan MASTER_SCHEMAS bawaan
    if (expectedSheets.length === 0) {
      Object.keys(MASTER_SCHEMAS).forEach(function(m) {
        expectedSheets.push({ name: m, requiredColumns: MASTER_SCHEMAS[m] });
      });
    }
    
    sheets.forEach(function(sheet) {
      var name = sheet.getName();
      var id = sheet.getSheetId().toString();
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      
      var matchingModule = expectedSheets.find(function(s) {
        return s.name.toUpperCase().replace(/[\s_]/g, '') === name.toUpperCase().replace(/[\s_]/g, '');
      });

      var missingColumns = [];
      if (matchingModule && matchingModule.requiredColumns) {
        matchingModule.requiredColumns.forEach(function(col) {
          var found = headers.some(function(h) {
            return h && h.toString().toUpperCase().replace(/[\s_]/g, '') === col.toUpperCase().replace(/[\s_]/g, '');
          });
          if (!found) missingColumns.push(col);
        });
      }

      auditResults.push({
        name: name,
        id: id,
        rowCount: lastRow,
        columnCount: lastCol,
        headers: headers,
        isSystemSheet: !!matchingModule,
        missingColumns: missingColumns
      });
    });

    return createResponse({ success: true, auditResults: auditResults });
  } catch (e) { 
    return createResponse({ success: false, message: e.toString() }); 
  }
}

/**
 * ============================================================================
 * HANDLER: DELETE SHEET
 * ============================================================================
 */
function handleDeleteSheet(ss, sheetId) {
  try {
     if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
     var sheets = ss.getSheets();
     for (var i = 0; i < sheets.length; i++) {
       if (sheets[i].getSheetId().toString() === sheetId.toString() || sheets[i].getName() === sheetId.toString()) {
         ss.deleteSheet(sheets[i]);
         return createResponse({ success: true, message: "Sheet berhasil dihapus." });
       }
     }
     return createResponse({ success: false, message: "Sheet dengan ID " + sheetId + " tidak ditemukan." });
  } catch (e) { 
    return createResponse({ success: false, message: e.toString() }); 
  }
}

/**
 * ============================================================================
 * HANDLER: CLEANUP EMPTY ROWS
 * ============================================================================
 */
function handleCleanupEmptyRows(ss, moduleName) {
  try {
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
    var sheet = findSheetByName(ss, moduleName);
    if (!sheet) return createResponse({ success: false, message: "Sheet not found" });
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return createResponse({ success: true, message: "Sheet kosong." });
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idColIdx = -1, nipColIdx = -1, namaColIdx = -1;
    
    for (var h = 0; h < headers.length; h++) {
      var hName = headers[h] ? headers[h].toString().toLowerCase().replace(/[\s_]/g, '') : '';
      if (hName === 'id') idColIdx = h;
      if (hName === 'nip') nipColIdx = h;
      if (hName === 'nama' || hName === 'name') namaColIdx = h;
    }
    
    var dataRange = sheet.getRange(1, 1, lastRow, headers.length);
    var dataValues = dataRange.getValues();
    var deletedCount = 0;
    
    for (var r = lastRow - 1; r >= 1; r--) {
      var row = dataValues[r];
      var idVal = idColIdx > -1 ? (row[idColIdx] ? row[idColIdx].toString().trim() : '') : '';
      var nipVal = nipColIdx > -1 ? (row[nipColIdx] ? row[nipColIdx].toString().trim() : '') : '';
      var namaVal = namaColIdx > -1 ? (row[namaColIdx] ? row[namaColIdx].toString().trim() : '') : '';
      
      if (idVal === "" && nipVal === "" && namaVal === "") {
        sheet.deleteRow(r + 1);
        deletedCount++;
      }
    }
    return createResponse({ 
      success: true, 
      deletedCount: deletedCount, 
      message: "Berhasil membersihkan " + deletedCount + " baris kosong dari sheet " + moduleName 
    });
  } catch (e) { 
    return createResponse({ success: false, message: e.toString() }); 
  }
}

/**
 * ============================================================================
 * HANDLER: AUTO INIT SHEETS (BUAT SEMUA SHEET DENGAN HEADER RESMI)
 * ============================================================================
 */
function handleAutoInitSheets(ss) {
  try {
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
    var result = initializeAllMasterSheets(ss);
    return createResponse({ success: true, result: result });
  } catch (e) {
    return createResponse({ success: false, message: e.toString() });
  }
}

function initializeAllMasterSheets(ss) {
  var created = [];
  var existing = [];

  Object.keys(MASTER_SCHEMAS).forEach(function(moduleKey) {
    var sheetName = moduleKey.toUpperCase();
    var sheet = findSheetByName(ss, sheetName);
    var headers = MASTER_SCHEMAS[moduleKey];

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      
      // Styling header: bold, background slate-900, teks putih rapi
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#1e293b");
      headerRange.setFontColor("#ffffff");
      
      // Format kolom NIP, NIK, dan NO REKENING sebagai teks (@) agar nol di depan tidak terpotong
      headers.forEach(function(h, idx) {
        var hLower = h.toLowerCase().replace(/[\s_]/g, '');
        if (hLower === 'nip' || hLower === 'nik' || hLower === 'norekeninggaji' || hLower === 'nohp' || hLower === 'npwp' || hLower === 'nobpjs' || hLower === 'nopeserta' || hLower === 'nomorsurat') {
          sheet.getRange(2, idx + 1, Math.max(100, sheet.getMaxRows() - 1), 1).setNumberFormat("@");
        }
      });
      created.push(sheetName);
    } else {
      // Periksa apakah ada kolom yang kurang pada sheet yang sudah ada
      var lastCol = Math.max(1, sheet.getLastColumn());
      var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var missingHeaders = [];

      headers.forEach(function(h) {
        var hLower = h.toLowerCase().replace(/[\s_]/g, '');
        var exists = currentHeaders.some(function(ch) {
          return ch && ch.toString().toLowerCase().replace(/[\s_]/g, '') === hLower;
        });
        if (!exists) missingHeaders.push(h);
      });

      if (missingHeaders.length > 0) {
        sheet.getRange(1, currentHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      }
      existing.push(sheetName);
    }
  });

  return { created: created, existing: existing };
}

/**
 * ============================================================================
 * HANDLER: BACKUP & RESTORE DATABASE SEKALIGUS
 * ============================================================================
 */
function handleExportBackup(ss) {
  try {
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
    var sheets = ss.getSheets();
    var backupData = {};

    sheets.forEach(function(sh) {
      var name = sh.getName();
      var lastRow = sh.getLastRow();
      var lastCol = sh.getLastColumn();
      if (lastRow > 1 && lastCol > 0) {
        var vals = sh.getRange(1, 1, lastRow, lastCol).getValues();
        var headers = vals[0];
        var rows = [];
        for (var r = 1; r < vals.length; r++) {
          var item = {};
          for (var c = 0; c < headers.length; c++) {
            item[headers[c]] = vals[r][c];
          }
          rows.push(item);
        }
        backupData[name] = rows;
      }
    });

    return createResponse({ success: true, backup: backupData, timestamp: new Date().toISOString() });
  } catch (e) {
    return createResponse({ success: false, message: e.toString() });
  }
}

function handleRestoreBackup(ss, payload) {
  try {
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
    if (!payload || typeof payload !== 'object') {
      return createResponse({ success: false, message: "Payload restore tidak valid." });
    }

    var restoredSheets = [];
    Object.keys(payload).forEach(function(sheetName) {
      var records = payload[sheetName];
      if (Array.isArray(records) && records.length > 0) {
        handleBatchSave(ss, sheetName, records);
        restoredSheets.push(sheetName);
      }
    });

    return createResponse({ success: true, restoredSheets: restoredSheets, message: "Restore database selesai." });
  } catch (e) {
    return createResponse({ success: false, message: e.toString() });
  }
}

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

// Helper: Normalisasi nilai pendidikan untuk kompatibilitas SIASN & BKN
function normalizePendidikanForGAS(val) {
  if (!val) return "";
  var s = val.toString().trim().toUpperCase();
  if (s.indexOf("SD") === 0 || s === "SD/SEDERAJAT") return "SD";
  if (s.indexOf("SLTA") === 0 || s.indexOf("SMA") === 0 || s.indexOf("SMK") === 0 || s.indexOf("MAN") === 0 || s === "SLTP" || s === "SMP") return "SLTA";
  if (s === "D-III" || s === "D3" || s === "D III" || s === "D-3" || s === "DIII") return "DIII";
  if (s === "D-IV" || s === "D4" || s === "D IV" || s === "D-4" || s === "DIV") return "D IV";
  if (s === "S-1" || s === "S1" || s === "S 1" || s === "SARJANA") return "S1";
  if (s === "S-2" || s === "S2" || s === "S 2" || s === "MAGISTER") return "S2";
  if (s === "S-3" || s === "S3" || s === "S 3" || s === "DOKTOR") return "S3";
  if (s === "PROFESI") return "S1";
  
  if (s.indexOf("D3") > -1 || s.indexOf("D-III") > -1 || s.indexOf("D III") > -1 || s.indexOf("D-3") > -1) return "DIII";
  if (s.indexOf("D4") > -1 || s.indexOf("D-IV") > -1 || s.indexOf("D IV") > -1 || s.indexOf("D-4") > -1 || s.indexOf("DIV") > -1) return "D IV";
  if (s.indexOf("S1") > -1 || s.indexOf("S-1") > -1 || s.indexOf("S 1") > -1 || s.indexOf("SARJANA") > -1) return "S1";
  if (s.indexOf("S2") > -1 || s.indexOf("S-2") > -1 || s.indexOf("S 2") > -1 || s.indexOf("MAGISTER") > -1) return "S2";
  if (s.indexOf("S3") > -1 || s.indexOf("S-3") > -1 || s.indexOf("S 3") > -1 || s.indexOf("DOKTOR") > -1) return "S3";
  if (s.indexOf("SD") > -1) return "SD";
  if (s.indexOf("SMA") > -1 || s.indexOf("SMK") > -1 || s.indexOf("SLTA") > -1 || s.indexOf("ALIAH") > -1 || s.indexOf("PONDOK") > -1 || s.indexOf("PESANTREN") > -1) return "SLTA";
  
  var allowed = ["D IV", "DIII", "S1", "S2", "S3", "SD", "SLTA"];
  for (var i = 0; i < allowed.length; i++) {
    var a = allowed[i];
    if (s.replace(/[^A-Z0-9]/g, '') === a.replace(/[^A-Z0-9]/g, '')) {
      return a;
    }
  }
  return "S1";
}

// Helper: Normalisasi URL Foto Pegawai menjadi standar https://lh3.googleusercontent.com/d/FILE_ID
function normalizePhotoUrlForGAS(val) {
  if (!val) return "";
  var str = val.toString().trim();
  if (!str) return "";
  var lower = str.toLowerCase();
  if (lower === "-" || lower === "null" || lower === "undefined" || lower === "none" || lower === "tidak ada" || lower === "kosong") return "";
  if (str.indexOf("data:image") === 0) return str;

  // Cek formula IMAGE atau HYPERLINK jika diisi langsung di spreadsheet
  var formulaMatch = str.match(/=(?:IMAGE|HYPERLINK)\s*\(\s*["']([^"']+)["']/i);
  if (formulaMatch && formulaMatch[1]) str = formulaMatch[1].trim();
  str = str.replace(/^[<"'(\[]+|[>"')\]]+$/g, '').trim();

  // Ekstraksi pola ID Google Drive
  var m = str.match(/(?:googleusercontent\.com|googleapis\.com)\/d\/([a-zA-Z0-9_-]{20,70})/i) ||
          str.match(/\/file\/d\/([a-zA-Z0-9_-]{20,70})/i) ||
          str.match(/\/d\/([a-zA-Z0-9_-]{20,70})/i) ||
          str.match(/[?&]id=([a-zA-Z0-9_-]{20,70})/i) ||
          str.match(/\/folders\/([a-zA-Z0-9_-]{20,70})/i);

  if (m && m[1]) {
    return "https://lh3.googleusercontent.com/d/" + m[1];
  }

  // Jika berupa ID langsung tanpa karakter URL
  if (str.indexOf("/") === -1 && str.indexOf(":") === -1 && str.indexOf(".") === -1 && str.indexOf("?") === -1) {
    if (/^[a-zA-Z0-9_-]{25,60}$/.test(str)) {
      return "https://lh3.googleusercontent.com/d/" + str;
    }
  }

  return (/^https?:\/\//i.test(str)) ? str : "";
}

// Helper: Format nilai tanggal ke dd/MM/yyyy (misal: 23/01/2025)
function formatToDDMMYYYYIfDate(val, colName) {
  if (val === null || val === undefined || val === '') return '';
  var col = (colName || '').toLowerCase().replace(/[\s_]/g, '');
  if (col === 'updatedat' || col === 'createdat' || col === 'timestamp') return val;

  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Jakarta", "dd/MM/yyyy");
  }

  if (typeof val === 'string') {
    var str = val.trim();
    if (!str) return '';
    // Jika sudah format dd/MM/yyyy atau dd-MM-yyyy
    var ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
      var d = ddmmyyyyMatch[1].length === 1 ? '0' + ddmmyyyyMatch[1] : ddmmyyyyMatch[1];
      var m = ddmmyyyyMatch[2].length === 1 ? '0' + ddmmyyyyMatch[2] : ddmmyyyyMatch[2];
      return d + '/' + m + '/' + ddmmyyyyMatch[3];
    }
    // Jika format ISO e.g. 2025-01-23T17:00:00.000Z atau 2025-01-23
    var isDateCol = col.indexOf('tanggal') !== -1 || col.indexOf('tgl') !== -1 || 
                    col.indexOf('tmt') !== -1 || col.indexOf('lahir') !== -1 || 
                    col.indexOf('birth') !== -1;
    var isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch && (isDateCol || str.indexOf('T') !== -1)) {
      return isoMatch[3] + '/' + isoMatch[2] + '/' + isoMatch[1];
    }
  }
  return val;
}

function getSpreadsheet(ssId) {
  try {
    if (ssId && ssId.toString() !== "undefined" && ssId.toString().trim() !== "") {
      return SpreadsheetApp.openById(ssId.toString().trim());
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch(e) { 
    return null; 
  }
}

function createResponse(output) {
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}

function createHtmlResponse() {
  var html = '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><title>Portal SDM DJKI - Backend Status</title>' +
    '<style>' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; text-align: center; margin: 0; }' +
    '.card { max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 20px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); border: 1px solid #334155; }' +
    '.badge { display: inline-block; background: #059669; color: white; padding: 6px 16px; border-radius: 9999px; font-weight: bold; font-size: 12px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }' +
    'h1 { font-size: 24px; margin: 0 0 12px; font-weight: 800; color: #ffffff; }' +
    'p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 8px 0; }' +
    '.meta { background: #0f172a; padding: 16px; border-radius: 12px; font-family: monospace; font-size: 12px; color: #38bdf8; text-align: left; margin: 20px 0; border: 1px solid #1e293b; }' +
    '.btn { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 13px; margin-top: 10px; }' +
    '</style></head><body>' +
    '<div class="card">' +
    '<span class="badge">Backend Terhubung &amp; Aktif</span>' +
    '<h1>Google Apps Script Backend v7.0</h1>' +
    '<p>Layanan API Google Apps Script untuk <strong>Portal SDM DJKI</strong> siap digunakan.</p>' +
    '<div class="meta">' +
    'Status: 200 OK<br/>' +
    'Waktu Server: ' + new Date().toISOString() + '<br/>' +
    'Total Skema Modul Didukung: ' + Object.keys(MASTER_SCHEMAS).length + ' Modul<br/>' +
    'Fitur: Auto-Upsert, Fast Bulk Save, Drive Uploader, Docs Generator, Multi-Key Resolver' +
    '</div>' +
    '<p>Untuk menghubungkan dengan aplikasi, salin URL ini dan simpan di menu Pengaturan Portal SDM DJKI.</p>' +
    '</div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle("Portal SDM DJKI Backend Status");
}

function findSheetByName(ss, name) {
  if (!ss) return null;
  var sheets = ss.getSheets();
  var search = name.toString().toLowerCase().replace(/[\s_]/g, '');
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase().replace(/[\s_]/g, '') === search) return sheets[i];
  }
  return null;
}

function getOrCreateSheet(ss, moduleName, payload) {
  var sheet = findSheetByName(ss, moduleName);
  if (!sheet) {
    sheet = ss.insertSheet(moduleName.toUpperCase());
    var headers = [];
    if (MASTER_SCHEMAS[moduleName.toUpperCase()]) {
      headers = MASTER_SCHEMAS[moduleName.toUpperCase()];
    } else if (payload && typeof payload === 'object') {
      headers = Object.keys(payload).map(function(h) { return h.toUpperCase(); });
    }
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
    }
  }
  return sheet;
}
