
/**
 * PORTAL SDM DJKI - BACKEND CORE (PRO VERSION 4.2.1)
 * ----------------------------------------------------------------
 * Fitur: 
 * - SAVE: Update berdasarkan NIP (prioritas) atau ID. Jika tidak ada, tambah baris.
 * - DELETE: Hapus baris berdasarkan kunci unik. Untuk modul non-pegawai tanpa ID, 
 *   akan mengembalikan sukses agar frontend bisa melanjutkan pencatatan log.
 */

var FOLDER_ID_DATABASE = "PASTE_YOUR_FOLDER_ID_HERE"; 

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ success: false, message: "Request body kosong." });
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action; 
    var moduleName = (data.module || "DATA").toString().toUpperCase().trim();
    var payload = data.payload;
    var ssId = data.spreadsheetId; 

    var ss = getSpreadsheet(ssId);
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });

    if (action === 'UPLOAD') {
      return handleUpload(payload);
    } else if (action === 'SAVE') {
      return handleSave(ss, moduleName, payload);
    } else if (action === 'DELETE') {
      return handleDelete(ss, moduleName, payload);
    }

    return createResponse({ success: false, message: "Aksi tidak dikenali." });
  } catch (err) {
    return createResponse({ success: false, message: "Server Error: " + err.toString() });
  }
}

function handleSave(ss, moduleName, payload) {
  try {
    var sheet = getOrCreateSheet(ss, moduleName, payload);
    var range = sheet.getDataRange();
    var data = range.getValues();
    var headers = data[0];
    
    var keyIndex = -1;
    var targetKey = String(payload.nip || payload.id || "").trim();
    
    for (var h = 0; h < headers.length; h++) {
      var hName = headers[h].toString().toLowerCase().trim();
      if (hName === 'nip' || hName === 'id') {
        keyIndex = h;
        if (hName === 'nip' && payload.nip) break;
      }
    }

    var rowData = headers.map(function(h) {
      var headerClean = h.toString().toLowerCase().replace(/[\s_]/g, '');
      var key = Object.keys(payload).find(function(k) {
        return k.toLowerCase().replace(/[\s_]/g, '') === headerClean;
      });
      var val = key ? payload[key] : "";
      return (typeof val === 'object') ? JSON.stringify(val) : val;
    });

    if (keyIndex > -1 && targetKey !== "") {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][keyIndex]).trim() === targetKey) {
          sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
          return createResponse({ success: true, message: "Data " + targetKey + " diperbarui." });
        }
      }
    }

    sheet.appendRow(rowData);
    return createResponse({ success: true, message: "Data baru ditambahkan." });
    
  } catch (e) {
    return createResponse({ success: false, message: "Save Error: " + e.toString() });
  }
}

function handleDelete(ss, moduleName, payload) {
  try {
    var sheet = findSheetByName(ss, moduleName);
    if (!sheet) return createResponse({ success: false, message: "Sheet tidak ditemukan." });

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var keyIndex = -1;
    var searchKey = String(payload.nip || payload.id || "").trim();

    for (var h = 0; h < headers.length; h++) {
      var hName = headers[h].toString().toLowerCase().trim();
      if (hName === 'nip' || hName === 'id') {
        keyIndex = h;
        if (hName === 'nip' && payload.nip) break;
        if (hName === 'id' && payload.id) break;
      }
    }

    // Perbaikan Sesuai Permintaan: 
    // Jika non-pegawai dan ID kosong, anggap sukses agar log riwayat di frontend tetap jalan
    if (searchKey === "") {
      if (moduleName !== 'PEGAWAI' && moduleName !== 'USERS') {
        return createResponse({ success: true, message: "Aksi dihapus secara lokal dan dicatat dalam log riwayat." });
      }
      return createResponse({ success: false, message: "Gagal: ID atau NIP diperlukan untuk modul ini." });
    }

    if (keyIndex === -1) {
      return createResponse({ success: false, message: "Gagal: Kolom identitas (ID/NIP) tidak ditemukan di sheet." });
    }

    var deletedCount = 0;
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][keyIndex]).trim() === searchKey) {
        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }

    return createResponse({ 
      success: true, 
      message: deletedCount > 0 ? "Berhasil menghapus data." : "Data tidak ditemukan di database, aksi dicatat di log." 
    });
  } catch (e) {
    return createResponse({ success: false, message: "Delete Error: " + e.toString() });
  }
}

function getSpreadsheet(ssId) {
  if (ssId && ssId !== "") {
    try { return SpreadsheetApp.openById(ssId); } catch(e) {}
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function createResponse(output) {
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}

function findSheetByName(ss, name) {
  var sheets = ss.getSheets();
  var search = name.toLowerCase().replace(/[\s_]/g, '');
  for (var i = 0; i < sheets.length; i++) {
    var sheetName = sheets[i].getName().toLowerCase().replace(/[\s_]/g, '');
    if (sheetName === search) return sheets[i];
  }
  return null;
}

function getOrCreateSheet(ss, moduleName, payload) {
  var sheet = findSheetByName(ss, moduleName);
  if (!sheet) {
    sheet = ss.insertSheet(moduleName.toUpperCase());
    var headers = Object.keys(payload);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function handleUpload(payload) {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID_DATABASE);
    var bytes = Utilities.base64Decode(payload.base64.split(",")[1]);
    var blob = Utilities.newBlob(bytes, payload.mimeType, payload.fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return createResponse({ success: true, fileUrl: "https://lh3.googleusercontent.com/d/" + file.getId() });
  } catch (e) {
    return createResponse({ success: false, message: e.toString() });
  }
}
