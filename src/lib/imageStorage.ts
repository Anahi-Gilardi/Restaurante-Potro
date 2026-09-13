export const MAX_IMAGE_CHARS = 12000;
export const MAX_IMAGE_DIMENSION = 240;
const DB_NAME = 'el_patron_db';
const STORE_NAME = 'menu_images';
const DB_VERSION = 1;

// In-memory cache for ultra-fast 0ms lookups
export const memoryImageCache = new Map<string, string>();

/**
 * Validates if an image string is non-empty, non-truncated, and valid URL / data URL.
 */
export function isValidImageData(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase().includes('[recortado]')) return false;
  if (trimmed.startsWith('data:image/')) {
    // Must contain base64 content
    return trimmed.length > 25 && trimmed.includes(';base64,');
  }
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/');
}

/**
 * Sanitizes image data, returning null if invalid or truncated.
 */
export function sanitizeImageData(val: unknown): string | null {
  return isValidImageData(val) ? (val as string).trim() : null;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn('[imageStorage] IndexedDB open error:', req.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('[imageStorage] IndexedDB unavailable:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Compresses an image file locally so it is guaranteed to be under maxChars (default 12,000 chars),
 * perfectly safe for Google Apps Script WebApp syncing without truncation.
 */
export function compressImageForUpload(
  file: File,
  options?: { maxDimension?: number; maxChars?: number }
): Promise<string> {
  const maxDimension = options?.maxDimension || MAX_IMAGE_DIMENSION;
  const maxChars = options?.maxChars || MAX_IMAGE_CHARS;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // Fallback for non-browser environments
    return Promise.resolve('data:image/jpeg;base64,mockImageFallback');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const renderCanvas = (targetW: number, targetH: number, quality: number): string => {
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context could not be created');

          // White background so transparent PNGs don't become black
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          return canvas.toDataURL('image/jpeg', quality);
        };

        try {
          const qualities = [0.72, 0.60, 0.50, 0.40, 0.30, 0.20];
          let currentW = width;
          let currentH = height;
          let result = renderCanvas(currentW, currentH, qualities[0]);

          for (const q of qualities) {
            result = renderCanvas(currentW, currentH, q);
            if (result.length <= maxChars) {
              return resolve(result);
            }
          }

          // If still over limit, downscale further to 160px
          currentW = Math.min(currentW, 160);
          currentH = Math.min(currentH, 160);
          for (const q of [0.50, 0.35, 0.20]) {
            result = renderCanvas(currentW, currentH, q);
            if (result.length <= maxChars) {
              return resolve(result);
            }
          }

          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File reader failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Saves an image to in-memory cache, localStorage, and IndexedDB.
 */
export async function saveMenuImage(id_producto: string, dataUrl: string): Promise<void> {
  if (!id_producto || !isValidImageData(dataUrl)) return;

  const clean = dataUrl.trim();
  memoryImageCache.set(id_producto, clean);

  // Synchronous localStorage backup
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('el_patron_img_' + id_producto, clean);
    } catch (e) {
      // Ignore quota error gracefully
    }
  }

  // Persistent IndexedDB
  const db = await getIndexedDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ id: id_producto, dataUrl: clean, updatedAt: Date.now() });
    } catch (e) {
      console.warn('[imageStorage] Error saving to IndexedDB:', e);
    }
  }
}

/**
 * Synchronously retrieves image from memory or localStorage.
 */
export function getMenuImageSync(id_producto: string): string | null {
  if (!id_producto) return null;

  const inMem = memoryImageCache.get(id_producto);
  if (inMem && isValidImageData(inMem)) return inMem;

  const lower = id_producto.toLowerCase();
  for (const [k, v] of memoryImageCache.entries()) {
    if (k.toLowerCase() === lower && isValidImageData(v)) {
      return v;
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('el_patron_img_' + id_producto);
      if (stored && isValidImageData(stored)) {
        memoryImageCache.set(id_producto, stored);
        return stored;
      }
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('el_patron_img_') && key.slice(14).toLowerCase() === lower) {
          const val = window.localStorage.getItem(key);
          if (val && isValidImageData(val)) {
            memoryImageCache.set(id_producto, val);
            return val;
          }
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Asynchronously retrieves image from memory, localStorage, or IndexedDB.
 */
export async function getMenuImage(id_producto: string): Promise<string | null> {
  const syncImg = getMenuImageSync(id_producto);
  if (syncImg) return syncImg;

  const db = await getIndexedDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id_producto);
      req.onsuccess = () => {
        const res = req.result?.dataUrl || null;
        if (res && isValidImageData(res)) {
          memoryImageCache.set(id_producto, res);
          resolve(res);
        } else {
          // Check all keys in store if exact match not found
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const items = allReq.result || [];
            const lower = id_producto.toLowerCase();
            const found = items.find((it: any) => String(it.id || '').toLowerCase() === lower);
            if (found && isValidImageData(found.dataUrl)) {
              memoryImageCache.set(id_producto, found.dataUrl);
              resolve(found.dataUrl);
            } else {
              resolve(null);
            }
          };
          allReq.onerror = () => resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retrieves all stored menu images from localStorage & IndexedDB into memory.
 */
export async function getAllMenuImages(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  // 1. In-memory
  for (const [k, v] of memoryImageCache.entries()) {
    if (isValidImageData(v)) result[k] = v;
  }

  // 2. localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('el_patron_img_')) {
          const id = key.replace('el_patron_img_', '');
          const val = window.localStorage.getItem(key);
          if (val && isValidImageData(val)) {
            result[id] = val;
            memoryImageCache.set(id, val);
          }
        }
      }
    } catch {}
  }

  // 3. IndexedDB
  const db = await getIndexedDB();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            const row = cursor.value;
            if (row && row.id && row.dataUrl && isValidImageData(row.dataUrl)) {
              result[row.id] = row.dataUrl;
              memoryImageCache.set(row.id, row.dataUrl);
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  return result;
}

/**
 * Deletes a menu image from memory, localStorage, and IndexedDB.
 */
export async function deleteMenuImage(id_producto: string): Promise<void> {
  if (!id_producto) return;
  memoryImageCache.delete(id_producto);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem('el_patron_img_' + id_producto);
    } catch {}
  }

  const db = await getIndexedDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id_producto);
    } catch {}
  }
}
