
/**
 * PORTAL SDM DJKI - BACKEND CORE (PRO VERSION 5.0.0)
 * ----------------------------------------------------------------
 * Fitur Utama:
 * - Sinkronisasi Dinamis: Otomatis menambah kolom baru jika ada field baru di aplikasi.
 * - Multi-Key Support: Mendukung update berdasarkan 'ID' (KGB, Dossier) atau 'NIP' (Pegawai).
 * - Object Serialization: Mendukung penyimpanan data kompleks (Array/Object) dalam format JSON.
 * - File Management: Integrasi upload file ke Google Drive.
 * - Template Engine: Mendukung pembuatan dokumen dari Google Docs template.
 */

var FOLDER_ID_DATABASE = "19OkO6ZAMnTXaxy-58ntHRVNI85W-u23O"; 

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
    var driveFolderId = data.driveFolderId || FOLDER_ID_DATABASE;

    if (action === 'UPLOAD') return handleUpload(payload, driveFolderId);
    if (action === 'SAVE') return handleSave(ss, moduleName, payload);
    if (action === 'DELETE') return handleDelete(ss, moduleName, payload);
    if (action === 'GET') return handleGet(ss, moduleName);
    if (action === 'GET_GID_MAP') {
      var sheets = ss.getSheets();
      var gidMap = {};
      sheets.forEach(function(sh) { gidMap[sh.getName()] = sh.getSheetId().toString(); });
      return createResponse({ success: true, gidMap: gidMap });
    }
    if (action === 'GENERATE_DOC') return handleGenerateFromTemplate(payload, driveFolderId);

    return createResponse({ success: false, message: "Aksi tidak dikenali." });
  } catch (err) { return createResponse({ success: false, message: "POST Error: " + err.toString() }); }
}

function handleGenerateFromTemplate(payload, driveFolderId) {
  try {
    var templateId = payload.templateId;
    var fileName = payload.fileName || "Surat_Baru_" + Date.now();
    var replacements = payload.data; 
    var templateFile = DriveApp.getFileById(templateId);
    
    // Check if folder ID is valid
    var folder;
    if (driveFolderId && driveFolderId !== "PASTE_YOUR_FOLDER_ID_HERE") {
      folder = DriveApp.getFolderById(driveFolderId);
    } else {
      // Fallback to same folder as template
      folder = templateFile.getParents().next();
    }

    var newFile = templateFile.makeCopy(fileName, folder);
    var doc = DocumentApp.openById(newFile.getId());
    var body = doc.getBody();
    for (var key in replacements) {
      body.replaceText("{{" + key.toUpperCase() + "}}", replacements[key] || "-");
    }
    doc.saveAndClose();
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return createResponse({ success: true, fileUrl: newFile.getUrl(), fileId: newFile.getId() });
  } catch (e) { return createResponse({ success: false, message: e.toString() }); }
}

function handleGet(ss, moduleName) {
  try {
    var sheet = findSheetByName(ss, moduleName);
    if (!sheet) return createResponse({ success: false, message: "Sheet tidak ditemukan." });
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = data.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) {
        var val = row[i];
        try {
          // Coba parse jika string terlihat seperti JSON (Array/Object)
          if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
            obj[h] = JSON.parse(val);
          } else {
            obj[h] = val;
          }
        } catch (e) {
          obj[h] = val;
        }
      });
      return obj;
    });
    return createResponse({ success: true, data: rows });
  } catch (e) { return createResponse({ success: false, message: e.toString() }); }
}

function handleSave(ss, moduleName, payload) {
  try {
    var sheet = getOrCreateSheet(ss, moduleName, payload);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var payloadKeys = Object.keys(payload);
    
    payloadKeys.forEach(function(key) {
      var keyLower = key.toLowerCase().replace(/[\s_]/g, '');
      var found = headers.some(function(h) {
        return h.toString().toLowerCase().replace(/[\s_]/g, '') === keyLower;
      });
      if (!found) {
        sheet.getRange(1, headers.length + 1).setValue(key.toUpperCase());
        headers.push(key.toUpperCase());
      }
    });

    var lastRow = sheet.getLastRow();
    var keyIndex = -1;
    
    // PERBAIKAN: Prioritaskan ID sebagai key untuk Dossier agar tidak tertumpuk di NIP yang sama
    var targetKey = "";
    if (payload.id) {
       targetKey = payload.id.toString().trim();
    } else if (payload.nip) {
       targetKey = payload.nip.toString().replace(/\D/g, '').trim();
    }
    
    for (var h = 0; h < headers.length; h++) {
      var hName = headers[h].toString().toLowerCase().trim();
      // Jika payload punya ID, gunakan kolom ID sebagai acuan update
      if (payload.id && hName === 'id') { keyIndex = h; break; }
      // Jika tidak punya ID (hanya NIP), gunakan NIP (misal modul Pegawai)
      if (!payload.id && hName === 'nip') { keyIndex = h; break; }
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
        if (displayValues[i][0].toString().trim() === targetKey) {
          sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
          return createResponse({ success: true, message: "Updated." });
        }
      }
    }

    sheet.appendRow(rowData);
    return createResponse({ success: true, message: "Added." });
  } catch (e) { return createResponse({ success: false, message: e.toString() }); }
}

function handleDelete(ss, moduleName, payload) {
  try {
    var sheet = findSheetByName(ss, moduleName);
    if (!sheet) return createResponse({ success: false, message: "Sheet not found" });
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return createResponse({ success: true, message: "Sheet empty" });
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var keyIndex = -1;
    var searchKey = "";

    // Tentukan kolom mana yang akan digunakan untuk pencarian
    if (payload.id) {
      searchKey = String(payload.id).trim();
      for (var h = 0; h < headers.length; h++) {
        if (headers[h].toString().toLowerCase().trim() === 'id') {
          keyIndex = h;
          break;
        }
      }
    }
    
    // Jika ID tidak ditemukan atau tidak ada, coba NIP
    if (keyIndex === -1 && payload.nip) {
      searchKey = String(payload.nip).trim();
      for (var h = 0; h < headers.length; h++) {
        if (headers[h].toString().toLowerCase().trim() === 'nip') {
          keyIndex = h;
          break;
        }
      }
    }

    if (keyIndex === -1 || searchKey === "") {
      return createResponse({ success: false, message: "No valid ID or NIP provided for deletion" });
    }

    var displayValues = sheet.getRange(1, keyIndex + 1, lastRow, 1).getDisplayValues();
    var deletedCount = 0;
    
    // Hapus dari bawah ke atas agar index tidak bergeser
    for (var i = displayValues.length - 1; i >= 1; i--) {
      if (displayValues[i][0].toString().trim() === searchKey) {
        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }
    
    return createResponse({ success: true, deletedCount: deletedCount });
  } catch (e) { 
    console.log("Error in handleDelete: " + e.toString());
    return createResponse({ success: false, message: e.toString() }); 
  }
}

function getSpreadsheet(ssId) {
  try {
    if (ssId && ssId.toString() !== "undefined") return SpreadsheetApp.openById(ssId);
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

function handleUpload(payload, driveFolderId) {
  try {
    var folder;
    if (driveFolderId && driveFolderId !== "PASTE_YOUR_FOLDER_ID_HERE") {
      folder = DriveApp.getFolderById(driveFolderId);
    } else {
      // Fallback to root or a default folder if possible, but DriveApp.getRootFolder() is safer
      folder = DriveApp.getRootFolder();
    }
    var bytes = Utilities.base64Decode(payload.base64.split(",")[1]);
    var blob = Utilities.newBlob(bytes, payload.mimeType, payload.fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return createResponse({ success: true, fileUrl: "https://lh3.googleusercontent.com/d/" + file.getId() });
  } catch (e) { return createResponse({ success: false, message: e.toString() }); }
}
