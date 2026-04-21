/**
 * Utility to process photo URLs, especially formatting Google Drive links
 * to work directly in <img> tags.
 */
export const getPhotoUrl = (url: string | undefined): string => {
  if (!url) return '';
  
  // Handle Google Drive links (sharing links or lh3 content links)
  if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
    // Try to extract ID from various formats:
    // 1. https://drive.google.com/file/d/ID/view
    // 2. https://drive.google.com/uc?id=ID
    // 3. https://lh3.googleusercontent.com/d/ID
    // 4. https://docs.google.com/uc?export=download&id=ID
    
    let id = '';
    const match = 
      url.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
      url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    
    if (match) {
      id = match[1];
      // lh3.googleusercontent.com is faster and more reliable than drive.google.com/uc
      return `https://lh3.googleusercontent.com/d/${id}`;
    }
  }
  
  return url;
};
