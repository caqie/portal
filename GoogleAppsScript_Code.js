
/**
 * PORTAL SDM DJKI - BACKEND CORE (PRO VERSION 3.8.0 - STABLE DELETE)
 * ----------------------------------------------------------------
 */

var FOLDER_ID_DATABASE = "PASTE_YOUR_FOLDER_ID_HERE"; 

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ success: false, message: "Request body tidak ditemukan." });
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action; 
    var moduleName = (data.module || "data").toString().toUpperCase();
    var payload = data.payload;
    var ssId = data.spreadsheetId; 

    var ss = getSpreadsheet(ssId);
    if (!ss) {
      return createResponse({ success: false, message: "Spreadsheet tidak terdeteksi." });
    }

    if (action === 'UPLOAD') {
      return handleUpload(payload);
    } else if (action === 'SAVE') {
      return handleSave(ss, moduleName, payload);
    } else if (action === 'DELETE') {
      return handleDelete(ss, moduleName, payload);
    }

    return createResponse({ success: false, message: "Aksi '" + action + "' tidak dikenali." });
  } catch (err) {
    return createResponse({ success: false, message: "Fatal Error: " + err.toString() });
  }
}

function doGet(e) {
  try {
    var ssId = e && e.parameter ? e.parameter.ssId : null;
    var ss = getSpreadsheet(ssId);
    if (!ss) return createResponse({ success: false, message: "Spreadsheet tidak ditemukan." });

    var sheets = ss.getSheets();
    var gidMap = {};
    sheets.forEach(function(sh) {
      gidMap[sh.getName().toLowerCase()] = sh.getSheetId().toString();
    });

    return createResponse({ success: true, gidMap: gidMap });
  } catch (e) {
    return createResponse({ success: false, message: e.toString() });
  }
}

function getSpreadsheet(ssId) {
  var ss = null;
  if (ssId && ssId !== "") {
    try { ss = SpreadsheetApp.openById(ssId); } catch (e) {}
  }
  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  }
  return ss;
}

function createResponse(output) {
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function findSheetByName(ss, name) {
  if (!ss || !name) return null;
  var sheets = ss.getSheets();
  var targetNameClean = name.toString().toLowerCase().replace(/[\s_]/g, '');
  
  for (var i = 0; i < sheets.length; i++) {
    var currentNameClean = sheets[i].getName().toLowerCase().replace(/[\s_]/g, '');
    if (currentNameClean === targetNameClean) return sheets[i];
  }
  return null;
}

function getOrCreateSheet(ss, moduleName, payload) {
  if (!ss) return null;
  var sheet = findSheetByName(ss, moduleName);

  if (!sheet) {
    var name = moduleName.toUpperCase().replace(/[\s]/g, '_');
    sheet = ss.insertSheet(name);
    var headers = Object.keys(payload);
    var idKey = headers.find(function(k) { return k.toLowerCase() === 'id'; });
    if (!idKey) {
      headers.unshift('id');
    } else {
      headers = headers.filter(function(k) { return k.toLowerCase() !== 'id'; });
      headers.unshift(idKey);
    }
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

function handleSave(ss, moduleName, payload) {
  try {
    var sheet = getOrCreateSheet(ss, moduleName, payload);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idIndex = headers.indexOf('id');
    if (idIndex === -1) idIndex = headers.indexOf('ID');

    var rowData = headers.map(function(h) {
      var hClean = h.toString().toLowerCase().replace(/[\s_]/g, '');
      var key = Object.keys(payload).find(function(k) { return k.toLowerCase().replace(/[\s_]/g, '') === hClean; });
      if (key && (typeof payload[key] === 'object')) {
        return JSON.stringify(payload[key]);
      }
      return key ? payload[key] : "";
    });

    if (idIndex > -1 && payload.id) {
      var data = sheet.getDataRange().getValues();
      var targetId = String(payload.id).trim();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][idIndex]).trim() === targetId) {
          sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
          return createResponse({ success: true, message: "Data updated." });
        }
      }
    }
    sheet.appendRow(rowData);
    return createResponse({ success: true, message: "Data added." });
  } catch (e) {
    return createResponse({ success: false, message: e.toString() });
  }
}

function handleDelete(ss, moduleName, payload) {
  try {
    if (!payload || (!payload.id && !payload.nip)) {
      return createResponse({ success: false, message: "ID atau NIP diperlukan untuk penghapusan." });
    }
    
    var sheet = findSheetByName(ss, moduleName);
    if (!sheet) return createResponse({ success: false, message: "Sheet '" + moduleName + "' tidak ditemukan." });

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return createResponse({ success: false, message: "Sheet kosong." });

    var headers = data[0].map(function(h) { return h.toString().toLowerCase().trim(); });
    var idIndex = headers.indexOf('id');
    var nipIndex = headers.indexOf('nip');
    
    var targetId = String(payload.id || "").trim();
    var targetNip = String(payload.nip || "").trim();

    var deletedCount = 0;
    // Loop mundur untuk menghindari pergeseran index saat baris dihapus
    for (var i = data.length - 1; i >= 1; i--) {
      var rowId = (idIndex > -1) ? String(data[i][idIndex]).trim() : "";
      var rowNip = (nipIndex > -1) ? String(data[i][nipIndex]).trim() : "";
      
      var isMatch = false;
      if (targetId !== "" && rowId === targetId) isMatch = true;
      else if (targetNip !== "" && rowNip === targetNip) isMatch = true;

      if (isMatch) {
        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      return createResponse({ success: true, message: deletedCount + " data berhasil dihapus." });
    }
    
    return createResponse({ success: false, message: "Data tidak ditemukan di Spreadsheet." });
  } catch (e) {
    return createResponse({ success: false, message: "System Error: " + e.toString() });
  }
}
