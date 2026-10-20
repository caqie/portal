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

  // Clean any quotes or angle brackets
  const cleanStr = str.replace(/^[<"']+|[>"']+$/g, '');

  // Direct ID check (Google Drive file IDs are alphanumeric with - and _, usually 25-60 chars)
  if (/^[a-zA-Z0-9_-]{20,70}$/.test(cleanStr)) {
    return cleanStr;
  }

  // Check URLs with various Google Drive patterns
  const match = 
    cleanStr.match(/\/file\/d\/([a-zA-Z0-9_-]{20,70})/i) ||
    cleanStr.match(/\/d\/([a-zA-Z0-9_-]{20,70})/i) || 
    cleanStr.match(/[?&]id=([a-zA-Z0-9_-]{20,70})/i) ||
    cleanStr.match(/\/folders\/([a-zA-Z0-9_-]{20,70})/i);

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

