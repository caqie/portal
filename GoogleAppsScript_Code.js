/**
 * PORTAL SDM DJKI - BACKEND CORE (PRO VERSION 5.2.0 - FINAL STABLE)
 * ----------------------------------------------------------------
 * Fitur Utama:
 * - Smart Sync: Otomatis menambah kolom baru dan cerdas dalam pencocokan NIP/ID.
 * - Secure Upload: Upload ke folder spesifik dengan URL Direct yang stabil.
 * - Sparse Update: Mengupdate baris tanpa merusak ArrayFormula di kolom lain (SetValues Batching).
 * - Setup Helper: Mempermudah aktivasi izin (Authorization).
 * - Server Time Sync: sinkronisasi waktu akurat untuk kebutuhan absensi mandiri.
 */

var FOLDER_ID_DATABASE = "19OkO6ZAMnTXaxy-58ntHRVNI85W-u23O"; 

/**
 * FUNGSI SETUP: JALANKAN INI PERTAMA KALI DI EDITOR
 * Untuk memberikan izin akses Drive, Spreadsheet, dan Doc.
 */
function setup() {
  DriveApp.getRootFolder();
  SpreadsheetApp.getActiveSpreadsheet();
  console.log("Izin berhasil diberikan! Sekarang silakan lakukan Deploy > New Web App.");
}

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : null;
    if (action === 'GET_TIME') {
      return createResponse({ success: true, time: new Date().toISOString() });
    }
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
    if (action === 'AUDIT_DATABASE') return handleAuditDatabase(ss, payload);
    if (action === 'DELETE_SHEET') return handleDeleteSheet(ss, payload);
    if (action === 'GET_GID_MAP') {
      var sheets = ss.getSheets();
      var gidMap = {};
      sheets.forEach(function(sh) { gidMap[sh.getName()] = sh.getSheetId().toString(); });
      return createResponse({ success: true, gidMap: gidMap });
    }
    if (action === 'GENERATE_DOC') return handleGenerateFromTemplate(payload, driveFolderId);

    return createResponse({ success: false, message: "Aksi '" + action + "' tidak dikenali." });
  } catch (err) { return createResponse({ success: false, message: "POST Error: " + err.toString() }); }
}

function handleGenerateFromTemplate(payload, driveFolderId) {
  try {
    var templateId = payload.templateId;
    var fileName = payload.fileName || "Surat_Baru_" + Date.now();
    var replacements = payload.data; 
    var templateFile = DriveApp.getFileById(templateId);
    
    var folder;
    if (driveFolderId && driveFolderId !== "PASTE_YOUR_FOLDER_ID_HERE") {
      folder = DriveApp.getFolderById(driveFolderId);
    } else {
      folder = DriveApp.getFolderById(FOLDER_ID_DATABASE);
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
  
  // Fuzzy contains match
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
  
  return "S1"; // Ultimate safe fallback
}

function handleSave(ss, moduleName, payload) {
  try {
    var sheet = getOrCreateSheet(ss, moduleName, payload);
    var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    var payloadKeys = Object.keys(payload);
    
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
    var keyIndex = -1;
    var targetKey = "";
    var isNipMatching = false;

    if (payload.id) {
       targetKey = payload.id.toString().trim();
    } else if (payload.nip) {
       targetKey = payload.nip.toString().replace(/\D/g, '').trim();
       isNipMatching = true;
    }
    
    for (var h = 0; h < headers.length; h++) {
       var hName = headers[h] ? headers[h].toString().toLowerCase().replace(/[\s_]/g, '') : '';
       if (hName === 'id') {
         keyIndex = h;
         if (payload.id) break; 
       }
       if (hName === 'nip' && keyIndex === -1) {
         keyIndex = h;
       }
    }

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
              return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
            } else {
              return existingRowValues[colIdx];
            }
          });
          sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowValues]);
          return createResponse({ success: true, message: "Updated." });
        }
      }
    }

    var rowData = headers.map(function(h) {
      var hName = h ? h.toString().toLowerCase().replace(/[\s_]/g, '') : '';
      var key = Object.keys(payload).find(function(k) {
        return k.toLowerCase().replace(/[\s_]/g, '') === hName;
      });
      var val = key ? payload[key] : "";
      if (moduleName === 'PEGAWAI' && hName === 'pendidikan') {
        val = normalizePendidikanForGAS(val);
      }
      return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
    });

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
    var isNip = false;

    if (payload.id) {
      searchKey = String(payload.id).trim();
    } else if (payload.nip) {
      searchKey = String(payload.nip).replace(/\D/g, '').trim();
      isNip = true;
    }

    for (var h = 0; h < headers.length; h++) {
      var hName = headers[h] ? headers[h].toString().toLowerCase().replace(/[\s_]/g, '') : '';
      if (hName === 'id') {
        keyIndex = h;
        if (payload.id) break;
      }
      if (hName === 'nip' && keyIndex === -1) {
        keyIndex = h;
      }
    }

    if (keyIndex === -1 || searchKey === "") {
      return createResponse({ success: false, message: "No valid ID or NIP provided" });
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
    return createResponse({ success: true, deletedCount: deletedCount });
  } catch (e) { 
    return createResponse({ success: false, message: e.toString() }); 
  }
}

function handleUpload(payload, driveFolderId) {
  try {
    var folder;
    var targetFolderId = (driveFolderId && driveFolderId !== "PASTE_YOUR_FOLDER_ID_HERE") ? driveFolderId : FOLDER_ID_DATABASE;
    
    try {
      folder = DriveApp.getFolderById(targetFolderId);
    } catch (err) {
      return createResponse({ 
        success: false, 
        message: "Drive Access Error. Pastikan ID Folder benar dan Admin sudah klik 'Run setup'. Detail: " + err.toString() 
      });
    }

    var base64Data = payload.base64;
    var bytes = Utilities.base64Decode(base64Data.includes(",") ? base64Data.split(",")[1] : base64Data);
    var blob = Utilities.newBlob(bytes, payload.mimeType || "image/jpeg", payload.fileName || "FILE_" + Date.now());
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return createResponse({ 
      success: true, 
      fileUrl: "https://drive.google.com/uc?id=" + file.getId(),
      fileId: file.getId()
    });
  } catch (e) { return createResponse({ success: false, message: "UPLOAD_ERROR: " + e.toString() }); }
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
      sheet.getRange(1, 1, 1, headers.length).setValues([headers.map(function(h){return h.toUpperCase();})]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function handleAuditDatabase(ss, payload) {
  try {
    var sheets = ss.getSheets();
    var auditResults = [];
    var expectedSheets = payload.expectedSheets || []; // Array of {name: '', requiredColumns: []}
    
    sheets.forEach(function(sheet) {
      var name = sheet.getName();
      var id = sheet.getSheetId().toString();
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      
      var matchingModule = expectedSheets.find(function(s) {
        return s.name.toUpperCase() === name.toUpperCase().replace(/[\s_]/g, '');
      });

      var missingColumns = [];
      if (matchingModule) {
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
        missingColumns: missingColumns,
        isPlaceholder: (id === '333444555' || id === '777888999' || id === '1122334455')
      });
    });

    return createResponse({ success: true, auditResults: auditResults });
  } catch (e) { return createResponse({ success: false, message: e.toString() }); }
}

function handleDeleteSheet(ss, sheetId) {
  try {
     var sheets = ss.getSheets();
     for (var i = 0; i < sheets.length; i++) {
       if (sheets[i].getSheetId().toString() === sheetId.toString()) {
         ss.deleteSheet(sheets[i]);
         return createResponse({ success: true, message: "Sheet deleted." });
       }
     }
     return createResponse({ success: false, message: "Sheet not found." });
  } catch (e) { return createResponse({ success: false, message: e.toString() }); }
}
