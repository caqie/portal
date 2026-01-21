
/**
 * PORTAL SDM DJKI - BACKEND CORE (VERSION 2.0 PRO)
 * ------------------------------------------------
 * PANDUAN DEPLOY:
 * 1. Deploy as Web App.
 * 2. Execute as: Me (Email Anda).
 * 3. Who has access: Anyone.
 */

var FOLDER_ID_DATABASE = "PASTE_YOUR_FOLDER_ID_HERE"; // WAJIB DIISI: ID Folder Drive Utama

// Mapping nama modul ke nama Sheet agar rapi
var MODULE_MAP = {
  'PEGAWAI': 'pegawai',
  'DOSSIER': 'dossier',
  'SKP': 'skp',
  'PAK': 'pak',
  'KEGIATAN': 'kegiatan',
  'TUGAS_RUTIN': 'tugas_rutin',
  'ABK_ANJAB': 'abk_anjab',
  'KGB': 'kgb',
  'KENAIKAN': 'kenaikan',
  'PENGEMBANGAN': 'pengembangan'
};

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var module = data.module;
    var payload = data.payload;

    if (action === 'UPLOAD') {
      return handleUpload(payload);
    } else if (action === 'SAVE') {
      return handleSave(module, payload);
    } else if (action === 'DELETE') {
      return handleDelete(module, payload);
    }

    return createResponse({ success: false, message: "Aksi tidak dikenali" });
  } catch (err) {
    return createResponse({ success: false, message: err.toString() });
  }
}

// Fungsi Helper untuk Response JSON agar tidak kena CORS
function createResponse(output) {
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpload(payload) {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID_DATABASE);
    var bytes = Utilities.base64Decode(payload.base64.split(",")[1]);
    var blob = Utilities.newBlob(bytes, payload.mimeType, payload.fileName);
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    // URL lh3 adalah cara terbaik untuk direct viewing di tag <img> tanpa interstitial
    var directUrl = "https://lh3.googleusercontent.com/d/" + fileId;

    return createResponse({
      success: true,
      fileUrl: directUrl,
      fileId: fileId,
      fileName: payload.fileName
    });
  } catch (e) {
    return createResponse({ success: false, message: "Upload Gagal: " + e.toString() });
  }
}

function handleSave(moduleKey, payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = MODULE_MAP[moduleKey] || moduleKey.toLowerCase();
  var sheet = ss.getSheetByName(sheetName);
  
  // Jika sheet belum ada, buat baru dan gunakan keys payload sebagai header
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = Object.keys(payload);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Normalisasi data row berdasarkan urutan header di spreadsheet
  var dataRow = headers.map(function(h) { 
    var val = payload[h] !== undefined ? payload[h] : "";
    return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
  });

  var idIndex = headers.indexOf("id");
  if (idIndex > -1 && payload.id) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][idIndex] == payload.id) {
        sheet.getRange(i + 1, 1, 1, dataRow.length).setValues([dataRow]);
        return createResponse({ success: true, message: "Data diperbarui" });
      }
    }
  }

  sheet.appendRow(dataRow);
  return createResponse({ success: true, message: "Data baru ditambahkan" });
}

function handleDelete(moduleKey, payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = MODULE_MAP[moduleKey] || moduleKey.toLowerCase();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createResponse({ success: false, message: "Sheet tidak ditemukan" });

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIndex = headers.indexOf("id");

  if (idIndex === -1) return createResponse({ success: false, message: "Kolom ID tidak ditemukan" });

  for (var i = 1; i < data.length; i++) {
    if (data[i][idIndex] == payload.id) {
      sheet.deleteRow(i + 1);
      return createResponse({ success: true, message: "Data dihapus" });
    }
  }
  return createResponse({ success: false, message: "ID tidak ditemukan" });
}

// Handler untuk testing koneksi via Browser (GET)
function doGet() {
  return ContentService.createTextOutput("Portal SDM DJKI API is Live!").setMimeType(ContentService.MimeType.TEXT);
}
