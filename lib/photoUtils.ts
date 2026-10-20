/**
 * Utility to process photo URLs, especially formatting Google Drive links
 * into direct reliable Google content URLs (https://lh3.googleusercontent.com/d/FILE_ID).
 * Standardizes photo URLs for employee profiles and Google Spreadsheet persistence.
 */

export const GOOGLE_CONTENT_PHOTO_PREFIX = "https://lh3.googleusercontent.com/d/";

/**
 * Extracts the Google Drive File ID from various URL patterns, formulas, or raw IDs.
 * Handles:
 * - https://lh3.googleusercontent.com/d/FILE_ID (and other lh*.googleusercontent.com)
 * - https://drive.google.com/file/d/FILE_ID/view...
 * - https://drive.google.com/uc?id=FILE_ID...
 * - https://drive.google.com/open?id=FILE_ID...
 * - https://drive.google.com/thumbnail?id=FILE_ID...
 * - Spreadsheet formulas like =IMAGE("https://...") or =HYPERLINK("https://...", "...")
 * - Raw Google Drive file IDs (25-60 alphanumeric characters with - and _)
 */
export const extractGoogleDriveFileId = (urlOrId: string | undefined | null): string | null => {
  if (!urlOrId) return null;
  let str = String(urlOrId).trim();
  if (!str) return null;

  // Filter out placeholder / empty string indicators
  const lower = str.toLowerCase();
  if (
    lower === '-' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'none' ||
    lower === 'n/a' ||
    lower === 'tidak ada' ||
    lower === 'kosong' ||
    lower === 'belum ada foto'
  ) {
    return null;
  }

  // Base64 data URLs should not be treated as Drive IDs
  if (str.startsWith('data:image')) {
    return null;
  }

  // Extract URL from spreadsheet formulas if present: =IMAGE("...") or =HYPERLINK("...")
  const formulaMatch = str.match(/=(?:IMAGE|HYPERLINK)\s*\(\s*["']([^"']+)["']/i);
  if (formulaMatch && formulaMatch[1]) {
    str = formulaMatch[1].trim();
  }

  // Clean any quotes, parentheses, angle brackets or markdown wrappers
  str = str.replace(/^[<"'(\[]+|[>"')\]]+$/g, '').trim();

  // 1. Check Google Usercontent CDN: /d/FILE_ID
  const cdnMatch = str.match(/(?:googleusercontent\.com|googleapis\.com)\/d\/([a-zA-Z0-9_-]{20,70})/i);
  if (cdnMatch && cdnMatch[1]) {
    return cdnMatch[1];
  }

  // 2. Check Standard Drive file path: /file/d/FILE_ID
  const fileDMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]{20,70})/i);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // 3. Check General /d/FILE_ID pattern
  const generalDMatch = str.match(/\/d\/([a-zA-Z0-9_-]{20,70})/i);
  if (generalDMatch && generalDMatch[1]) {
    return generalDMatch[1];
  }

  // 4. Check Query Param: id=FILE_ID (uc?id=, open?id=, thumbnail?id=)
  const idParamMatch = str.match(/[?&]id=([a-zA-Z0-9_-]{20,70})/i);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // 5. Check Folders pattern if accidentally used
  const folderMatch = str.match(/\/folders\/([a-zA-Z0-9_-]{20,70})/i);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // 6. Direct ID check: Must not contain URL separators (':', '/', '.', '?', '&', '=')
  // Google Drive IDs are alphanumeric with - and _, typically 25 to 60 characters
  if (!/[/:.?&= ]/.test(str) && /^[a-zA-Z0-9_-]{25,60}$/.test(str)) {
    // Avoid false positives for uppercase keywords like "DEFAULT_AVATAR"
    if (!/^[A-Z_]+$/.test(str) || str.length >= 28) {
      return str;
    }
  }

  return null;
};

/**
 * Standardizes any photo string, Google Drive URL, or ID into the canonical
 * format: https://lh3.googleusercontent.com/d/FILE_ID
 *
 * If the input is not a Google Drive link:
 * - If valid external HTTP/HTTPS URL, returns the trimmed URL
 * - If invalid / empty / placeholder, returns empty string ""
 */
export const formatDrivePhotoUrl = (urlOrId: string | undefined | null): string => {
  if (!urlOrId) return '';
  const fileId = extractGoogleDriveFileId(urlOrId);
  if (fileId) {
    return `${GOOGLE_CONTENT_PHOTO_PREFIX}${fileId}`;
  }

  const str = String(urlOrId).trim();
  const lower = str.toLowerCase();
  if (
    !str ||
    lower === '-' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'none' ||
    lower === 'n/a' ||
    lower === 'tidak ada' ||
    lower === 'kosong'
  ) {
    return '';
  }

  // If already an external valid HTTP/HTTPS URL (e.g. cloud storage or CDN)
  if (/^https?:\/\//i.test(str)) {
    return str;
  }

  // If starts with data:image (base64)
  if (str.startsWith('data:image')) {
    return str;
  }

  return '';
};

/**
 * Alias for formatDrivePhotoUrl to use in UI components
 */
export const getPhotoUrl = (url: string | undefined | null): string => {
  return formatDrivePhotoUrl(url);
};

/**
 * Standardize photo column value before writing to Google Spreadsheet.
 * Guarantees that the column 'foto' in spreadsheet strictly adheres to:
 * https://lh3.googleusercontent.com/d/FILE_ID
 */
export const formatSpreadsheetPhotoValue = (urlOrId: string | undefined | null): string => {
  return formatDrivePhotoUrl(urlOrId);
};

/**
 * Check if a URL/ID is a valid Google Drive photo
 */
export const isGoogleDrivePhotoUrl = (urlOrId: string | undefined | null): boolean => {
  return extractGoogleDriveFileId(urlOrId) !== null;
};

/**
 * Client-side image compression to keep photo size optimal (~30-50KB)
 * before uploading to Google Drive via Apps Script.
 */
export const compressImage = (file: File, maxDim = 450, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve((e.target?.result as string) || '');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};
