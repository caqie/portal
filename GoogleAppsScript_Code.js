
/**
 * PORTAL SDM DJKI - BACKEND CORE (PRO VERSION 4.2.5)
 * ----------------------------------------------------------------
 * Fitur: 
 * - GET: Sinkronisasi GID Map otomatis.
 * - SAVE: Update cerdas + Auto-Create Column jika header tidak lengkap.
 * - DELETE: Hapus baris berdasarkan kunci unik.
 * - UPLOAD: Simpan file ke Google Drive.
 */

var FOLDER_ID_DATABASE = "PASTE_YOUR_FOLDER_ID_HERE"; 

function doGet(e) {
  try {
    var ssId = e && e.parameter ? e.parameter.ssId : null;
    var ss = getSpreadsheet(ssId);
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });
    var sheets = ss.getSheets();
    var gidMap = {};
    sheets.forEach(function(sh) { gidMap[sh.getName()] = sh.getSheetId().toString(); });
    return createResponse({ success: true, gidMap: gidMap });
  } catch (err) { return createResponse({ success: false, message: "GET Error: " + err.toString() }); }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return createResponse({ success: false, message: "Request body kosong." });
    var data = JSON.parse(e.postData.contents);
    var action = data.action; 
    var moduleName = (data.module || "DATA").toString().toUpperCase().trim();
    var payload = data.payload;
    var ssId = data.spreadsheetId; 
    var ss = getSpreadsheet(ssId);
    if (!ss) return createResponse({ success: false, message: "Spreadsheet ID tidak valid." });

    if (action === 'UPLOAD') return handleUpload(payload);
    if (action === 'SAVE') return handleSave(ss, moduleName, payload);
    if (action === 'DELETE') return handleDelete(ss, moduleName, payload);

    return createResponse({ success: false, message: "Aksi tidak dikenali." });
  } catch (err) { return createResponse({ success: false, message: "POST Error: " + err.toString() }); }
}

function handleSave(ss, moduleName, payload) {
  try {
    var sheet = getOrCreateSheet(ss, moduleName, payload);
    
    // --- FITUR AUTO-CREATE COLUMN (SELF-HEALING) ---
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var payloadKeys = Object.keys(payload);
    var headersChanged = false;

    payloadKeys.forEach(function(key) {
      var keyLower = key.toLowerCase().replace(/[\s_]/g, '');
      var found = headers.some(function(h) {
        return h.toString().toLowerCase().replace(/[\s_]/g, '') === keyLower;
      });
      if (!found) {
        sheet.getRange(1, headers.length + 1).setValue(key.toUpperCase());
        headers.push(key.toUpperCase());
        headersChanged = true;
      }
    });
    // -----------------------------------------------

    var lastRow = sheet.getLastRow();
    var keyIndex = -1;
    var rawKey = (payload.nip || payload.id || "").toString();
    var targetKey = payload.nip ? rawKey.replace(/\D/g, '').trim() : rawKey.trim();
    
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

    if (keyIndex > -1 && targetKey !== "" && lastRow > 1) {
      var displayValues = sheet.getRange(1, keyIndex + 1, lastRow, 1).getDisplayValues();
      for (var i = 1; i < displayValues.length; i++) {
        var sheetValRaw = displayValues[i][0].toString();
        var sheetValueClean = payload.nip ? sheetValRaw.replace(/\D/g, '').trim() : sheetValRaw.trim();
        if (sheetValueClean === targetKey && targetKey !== "") {
          sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
          return createResponse({ success: true, message: "Data " + targetKey + " diperbarui." });
        }
      }
    }

    sheet.appendRow(rowData);
    return createResponse({ success: true, message: "Data baru ditambahkan." });
  } catch (e) { return createResponse({ success: false, message: "Save Error: " + e.toString() }); }
}

function handleDelete(ss, moduleName, payload) {
  try {
    var sheet = findSheetByName(ss, moduleName);
    if (!sheet) return createResponse({ success: false, message: "Sheet tidak ditemukan." });
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return createResponse({ success: true, message: "Sheet kosong." });
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var keyIndex = -1;
    var searchKey = String(payload.nip || payload.id || "").replace(/\D/g, '').trim();
    for (var h = 0; h < headers.length; h++) {
      if (headers[h].toString().toLowerCase().trim() === 'nip') { keyIndex = h; break; }
      if (headers[h].toString().toLowerCase().trim() === 'id') { keyIndex = h; }
    }
    if (keyIndex === -1 || searchKey === "") return createResponse({ success: false, message: "ID tidak valid." });
    var displayValues = sheet.getRange(1, keyIndex + 1, lastRow, 1).getDisplayValues();
    var deletedCount = 0;
    for (var i = displayValues.length - 1; i >= 1; i--) {
      if (String(displayValues[i][0]).replace(/\D/g, '').trim() === searchKey) {
        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }
    return createResponse({ success: true, message: "Dihapus: " + deletedCount });
  } catch (e) { return createResponse({ success: false, message: "Delete Error: " + e.toString() }); }
}

function getSpreadsheet(ssId) {
  try {
    if (ssId && ssId.toString().trim() !== "" && ssId.toString() !== "undefined") return SpreadsheetApp.openById(ssId);
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch(e) { return null; }
}

function createResponse(output) {
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
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
    var headers = Object.keys(payload);
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
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
    // URL ini bypass virus scan dialog dan CORS friendly
    return createResponse({ success: true, fileUrl: "https://lh3.googleusercontent.com/d/" + file.getId() });
  } catch (e) { return createResponse({ success: false, message: "Upload Error: " + e.toString() }); }
}
