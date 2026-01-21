
/**
 * PORTAL SDM DJKI - BACKEND CORE (PRO VERSION 3.1)
 * ------------------------------------------------
 */

var FOLDER_ID_DATABASE = "PASTE_YOUR_FOLDER_ID_HERE"; 

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

    return createResponse({ success: false, message: "Action Unknown" });
  } catch (err) {
    return createResponse({ success: false, message: err.toString() });
  }
}

function doGet(e) {
  // Heartbeat check untuk memantau status koneksi dari frontend
  return createResponse({ 
    success: true, 
    status: "Active", 
    timestamp: new Date().toISOString(),
    version: "3.1-PRO"
  });
}

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

function handleSave(moduleName, payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = moduleName.toLowerCase().replace(/\s+/g, '_');
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = Object.keys(payload);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
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
        return createResponse({ success: true, message: "Data Updated" });
      }
    }
  }

  sheet.appendRow(dataRow);
  return createResponse({ success: true, message: "Data Saved" });
}

function handleDelete(moduleName, payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = moduleName.toLowerCase().replace(/\s+/g, '_');
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createResponse({ success: false, message: "Sheet Not Found" });

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIndex = headers.indexOf("id");

  if (idIndex === -1) return createResponse({ success: false, message: "ID Column Missing" });

  for (var i = 1; i < data.length; i++) {
    if (data[i][idIndex] == payload.id) {
      sheet.deleteRow(i + 1);
      return createResponse({ success: true, message: "Data Deleted" });
    }
  }
  return createResponse({ success: false, message: "Record Not Found" });
}
