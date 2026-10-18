/**
 * Utility to process photo URLs, especially formatting Google Drive links
 * into direct reliable Google content URLs (https://lh3.googleusercontent.com/d/FILE_ID)
 */
export const extractGoogleDriveFileId = (urlOrId: string | undefined): string | null => {
  if (!urlOrId) return null;
  const str = String(urlOrId).trim();
  if (!str) return null;

  // Base64 data URLs should not be treated as Drive IDs
  if (str.startsWith('data:image')) {
    return null;
  }

  // Direct ID check (Google Drive file IDs are alphanumeric with - and _, usually 25-60 chars)
  if (/^[a-zA-Z0-9_-]{25,60}$/.test(str)) {
    return str;
  }

  // Check URLs with various Google Drive patterns
  const match = 
    str.match(/\/d\/([a-zA-Z0-9_-]{25,60})/i) || 
    str.match(/[?&]id=([a-zA-Z0-9_-]{25,60})/i) ||
    str.match(/\/file\/d\/([a-zA-Z0-9_-]{25,60})/i);

  if (match) {
    return match[1];
  }
  return null;
};

export const formatDrivePhotoUrl = (urlOrId: string | undefined): string => {
  if (!urlOrId) return '';
  const fileId = extractGoogleDriveFileId(urlOrId);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return String(urlOrId).trim();
};

export const getPhotoUrl = (url: string | undefined): string => {
  if (!url) return '';
  return formatDrivePhotoUrl(url);
};

