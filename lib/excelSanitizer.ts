import * as XLSX from 'xlsx';

/**
 * Excel XML (.xlsx) cell limit specification:
 * Microsoft Excel allows a maximum of 32,767 characters per single worksheet cell.
 * Exceeding this limit causes write_ws_xml_cell in SheetJS / xlsx to throw:
 * "Error: Text length must not exceed 32767 characters"
 */
export const EXCEL_CELL_CHAR_LIMIT = 32767;
export const SAFE_EXCEL_CELL_LIMIT = 32000;

/**
 * Sanitizes a single cell value to never exceed Excel's 32,767 character ceiling.
 * Also cleans heavy base64 data URIs which bloat the file and trigger cell limits.
 */
export const sanitizeForExcel = (val: any, limit: number = SAFE_EXCEL_CELL_LIMIT): any => {
  if (val === null || val === undefined) return '-';

  if (typeof val === 'string') {
    // Detect oversized base64 data URLs (e.g. photos, signature images, PDF attachments)
    if (
      val.startsWith('data:image/') ||
      val.startsWith('data:application/') ||
      (val.startsWith('data:') && val.length > 200)
    ) {
      return '[Data Biometrik / Berkas Base64 Dibatasi]';
    }

    if (val.length > limit) {
      const truncateLength = Math.max(100, limit - 60);
      return val.substring(0, truncateLength) + '... [Teks Dibatasi Maksimal 32.767 Karakter Excel]';
    }
    return val;
  }

  if (typeof val === 'object') {
    try {
      const jsonStr = JSON.stringify(val);
      if (jsonStr.length > limit) {
        const truncateLength = Math.max(100, limit - 50);
        return jsonStr.substring(0, truncateLength) + '... [Data JSON Dibatasi]';
      }
      return jsonStr;
    } catch (e) {
      return String(val);
    }
  }

  return val;
};

/**
 * Sanitizes an array of object records before passing into XLSX.utils.json_to_sheet.
 */
export const sanitizeExcelRows = (
  rows: any[],
  limit: number = SAFE_EXCEL_CELL_LIMIT
): any[] => {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => {
    if (!row || typeof row !== 'object') return row;
    const sanitized: any = {};
    for (const [key, val] of Object.entries(row)) {
      sanitized[key] = sanitizeForExcel(val, limit);
    }
    return sanitized;
  });
};

/**
 * Sanitizes a 2D Array of Arrays (AOA) before passing into XLSX.utils.aoa_to_sheet.
 */
export const sanitizeExcelAoa = (
  aoa: any[][],
  limit: number = SAFE_EXCEL_CELL_LIMIT
): any[][] => {
  if (!Array.isArray(aoa)) return [];
  return aoa.map(row => {
    if (!Array.isArray(row)) return row;
    return row.map(cell => sanitizeForExcel(cell, limit));
  });
};

/**
 * Inspects and sanitizes every cell inside an existing XLSX.WorkSheet
 * to guarantee no cell contains a string longer than Excel's character limit.
 */
export const sanitizeWorksheet = (
  ws: XLSX.WorkSheet,
  limit: number = SAFE_EXCEL_CELL_LIMIT
): XLSX.WorkSheet => {
  if (!ws) return ws;

  for (const cellAddress in ws) {
    if (cellAddress.startsWith('!')) continue; // Skip metadata keys like !ref, !cols, !merges

    const cell = ws[cellAddress];
    if (!cell) continue;

    if (typeof cell.v === 'string') {
      if (cell.v.length > limit) {
        const truncated = cell.v.substring(0, Math.max(100, limit - 60)) + '... [Dibatasi 32.767 Karakter]';
        cell.v = truncated;
        if (cell.w) {
          cell.w = truncated;
        }
      }
    } else if (typeof cell.w === 'string' && cell.w.length > limit) {
      cell.w = cell.w.substring(0, Math.max(100, limit - 60)) + '...';
    }
  }

  return ws;
};

/**
 * Safe drop-in replacement for XLSX.utils.json_to_sheet.
 * Sanitizes input records and validates the created worksheet.
 */
export const safeJsonToSheet = (
  data: any[],
  opts?: XLSX.JSON2SheetOpts,
  limit: number = SAFE_EXCEL_CELL_LIMIT
): XLSX.WorkSheet => {
  const sanitizedRows = sanitizeExcelRows(data, limit);
  const ws = XLSX.utils.json_to_sheet(sanitizedRows, opts);
  return sanitizeWorksheet(ws, limit);
};

/**
 * Safe drop-in replacement for XLSX.utils.aoa_to_sheet.
 * Sanitizes input 2D array and validates the created worksheet.
 */
export const safeAoaToSheet = (
  data: any[][],
  opts?: XLSX.AOA2SheetOpts,
  limit: number = SAFE_EXCEL_CELL_LIMIT
): XLSX.WorkSheet => {
  const sanitizedAoa = sanitizeExcelAoa(data, limit);
  const ws = XLSX.utils.aoa_to_sheet(sanitizedAoa, opts);
  return sanitizeWorksheet(ws, limit);
};

/**
 * Safe drop-in replacement for XLSX.writeFile.
 * Sanitizes all worksheets in the workbook before writing to file.
 */
export const safeWriteExcel = (
  wb: XLSX.WorkBook,
  filename: string,
  limit: number = SAFE_EXCEL_CELL_LIMIT
): void => {
  try {
    if (wb && wb.Sheets) {
      for (const sheetName in wb.Sheets) {
        const ws = wb.Sheets[sheetName];
        if (ws) {
          sanitizeWorksheet(ws, limit);
        }
      }
    }
    XLSX.writeFile(wb, filename);
  } catch (err: any) {
    console.error(`Gagal menulis file Excel ${filename}:`, err);
    // Fallback attempt: aggressive sanitize to 10,000 chars if write failed
    try {
      if (wb && wb.Sheets) {
        for (const sheetName in wb.Sheets) {
          const ws = wb.Sheets[sheetName];
          if (ws) {
            sanitizeWorksheet(ws, 10000);
          }
        }
      }
      XLSX.writeFile(wb, filename);
    } catch (secondErr: any) {
      console.error(`Percobaan kedua penyimpanan file Excel juga gagal:`, secondErr);
      throw secondErr;
    }
  }
};
