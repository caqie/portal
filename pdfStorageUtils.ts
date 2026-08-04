// IndexedDB storage utility for persisting PDF files locally without localStorage limit issues

export interface StoredPdfRecord {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string; // ISO date string
  monthFolder: string; // e.g. "2026-07"
  nip: string;
  nama: string;
  periode: string;
  base64: string; // PDF data URL or base64 string
  fileUrl?: string; // Google Drive or cloud URL if available
}

const DB_NAME = 'PortalSdmPdfArchiveDB';
const DB_VERSION = 1;
const STORE_NAME = 'pdf_files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('monthFolder', 'monthFolder', { unique: false });
        store.createIndex('fileName', 'fileName', { unique: false });
        store.createIndex('nip', 'nip', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePdfToStore(record: StoredPdfRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllStoredPdfs(): Promise<StoredPdfRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePdfFromStore(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllStoredPdfs(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Derive month folder string "YYYY-MM" from periode like "2026-07-01 s.d 2026-07-31" or Date
export function deriveMonthFolder(periode?: string, dateStr?: string): string {
  if (periode) {
    const match = periode.match(/(\d{4})[-/](\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}-${month}`;
    }
  }
  const date = dateStr ? (typeof (dateStr as any).getFullYear === 'function' ? (dateStr as unknown as Date) : new Date(dateStr)) : new Date();
  if (isNaN(date.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthFolderLabel(folderKey: string): string {
  if (!folderKey || folderKey === 'all') return 'Semua Bulan';
  const [year, month] = folderKey.split('-');
  if (!year || !month) return folderKey;
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const idx = parseInt(month, 10) - 1;
  const monthName = months[idx] || month;
  return `${monthName} ${year}`;
}
