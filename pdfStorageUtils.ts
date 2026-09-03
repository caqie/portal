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
  base64?: string; // Optional PDF data URL or base64 string
  blob?: Blob; // Native binary blob (faster and uses far less memory than base64)
  fileUrl?: string; // Google Drive or cloud URL if available
  parsedResult?: any; // Cached parsed attendance object
}

const DB_NAME = 'PortalSdmPdfArchiveDB';
const DB_VERSION = 2;
const STORE_NAME = 'pdf_files';
const PARSED_STORE_NAME = 'parsed_attendance_results';

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
      if (!db.objectStoreNames.contains(PARSED_STORE_NAME)) {
        db.createObjectStore(PARSED_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePdfToStore(record: StoredPdfRecord): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = (e) => {
          console.warn('Gagal menyimpan file ke IndexedDB (mungkin kuota penuh):', e);
          resolve(); // Jangan gagalkan proses parsing hanya karena kuota lokal penuh
        };
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => {
          console.warn('Transaksi IndexedDB dibatalkan (kuota tercapai):', e);
          resolve();
        };
      } catch (txErr) {
        console.warn('Error saat inisiasi transaksi simpan IndexedDB:', txErr);
        resolve();
      }
    });
  } catch (err) {
    console.warn('Gagal membuka IndexedDB untuk simpan:', err);
  }
}

// Lightweight metadata retrieval by default: prevents out-of-memory crashes when 1000+ PDFs are stored
export async function getAllStoredPdfs(includeBinary = false): Promise<StoredPdfRecord[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      if (includeBinary) {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } else {
        // Stream using cursor to exclude giant base64/blob from memory
        const records: StoredPdfRecord[] = [];
        const req = store.openCursor();
        req.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (cursor) {
            const val = cursor.value;
            // Exclude heavy binary payloads from React list state
            records.push({
              id: val.id,
              fileName: val.fileName,
              fileSize: val.fileSize,
              uploadedAt: val.uploadedAt,
              monthFolder: val.monthFolder,
              nip: val.nip,
              nama: val.nama,
              periode: val.periode,
              fileUrl: val.fileUrl,
              base64: '' // Keep empty to save hundreds of megabytes in React heap
            });
            cursor.continue();
          } else {
            resolve(records);
          }
        };
        req.onerror = () => reject(req.error);
      }
    });
  } catch (err) {
    console.warn('Gagal membaca arsip PDF dari IndexedDB:', err);
    return [];
  }
}

// Fetch single record with binary data on demand (only when previewing or downloading)
export async function getStoredPdfById(id: string): Promise<StoredPdfRecord | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Gagal mengambil detail PDF:', err);
    return null;
  }
}

// Helper to get a usable URL (object URL or base64) for preview or download
export function getStoredPdfUrl(record: StoredPdfRecord): string {
  if (record.blob) {
    return URL.createObjectURL(record.blob);
  }
  if (record.base64 && record.base64.trim().length > 0) {
    return record.base64;
  }
  if (record.fileUrl) {
    return record.fileUrl;
  }
  return '';
}

export async function deletePdfFromStore(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function deleteStoredPdfsByMonth(monthFolder: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('monthFolder');
      const req = index.openCursor(IDBKeyRange.only(monthFolder));
      
      req.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function clearAllStoredPdfs(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (e) {
      reject(e);
    }
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

export function formatBytes(bytes?: number | null, decimals = 1): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Derive month folder string "YYYY-MM" from periode like "2026-07-01 s.d 2026-07-31" or Date
export function deriveMonthFolder(periode?: string | null, dateStr?: string | null): string {
  if (periode && typeof periode === 'string') {
    const match = periode.match(/(\d{4})[-/](\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}-${month}`;
    }
  }
  const date = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(date.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthFolderLabel(folderKey?: string | null): string {
  if (!folderKey || typeof folderKey !== 'string' || folderKey === 'all') return 'Semua Bulan';
  const parts = folderKey.split('-');
  if (parts.length < 2) return folderKey;
  const [year, month] = parts;
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const idx = parseInt(month, 10) - 1;
  const monthName = months[idx] || month;
  return `${monthName} ${year}`;
}

export function formatDateTimeSafe(dateVal?: string | number | null): string {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '-';
  }
}

export function formatTimeOnlySafe(dateVal?: string | number | null): string {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    return '-';
  }
}

export function base64ToBlob(base64: string, mimeType = 'application/pdf'): Blob {
  const parts = base64.split(',');
  const b64Data = parts.length > 1 ? parts[1] : parts[0];
  const binaryStr = atob(b64Data);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function saveParsedResultsToIndexedDb(results: any[]): Promise<void> {
  if (!Array.isArray(results) || results.length === 0) return;
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(PARSED_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PARSED_STORE_NAME);
        store.clear();
        results.forEach((r, idx) => {
          if (!r) return;
          const id = r.nip ? `${r.nip}_${(r.periode || '').replace(/[^a-zA-Z0-9]/g, '_')}` : `res_${idx}_${Date.now()}`;
          store.put({ id, ...r });
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (err) {
        console.warn('Gagal transaksi saveParsedResultsToIndexedDb:', err);
        resolve();
      }
    });
  } catch (err) {
    console.warn('Gagal openDb pada saveParsedResultsToIndexedDb:', err);
  }
}

export async function getAllParsedResultsFromIndexedDb(): Promise<any[]> {
  try {
    const db = await openDb();
    if (!db.objectStoreNames.contains(PARSED_STORE_NAME)) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(PARSED_STORE_NAME, 'readonly');
        const store = tx.objectStore(PARSED_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          resolve(list.filter((item: any) => item && Array.isArray(item.days)));
        };
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  } catch (err) {
    return [];
  }
}

export async function clearParsedResultsFromIndexedDb(): Promise<void> {
  try {
    const db = await openDb();
    if (!db.objectStoreNames.contains(PARSED_STORE_NAME)) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(PARSED_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PARSED_STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  } catch (err) {}
}


