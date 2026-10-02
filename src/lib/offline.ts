/**
 * "Save for the road": audio files are downloaded once and kept in the browser's
 * IndexedDB, so they play with no connection at all. The page itself is kept by
 * the service worker (public/sw.js).
 */

const DB_NAME = 'derang-offline';
const STORE = 'media';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

export const offlineSupported = () => typeof indexedDB !== 'undefined';

export async function getSavedBlob(url: string): Promise<Blob | null> {
  if (!offlineSupported()) return null;
  try {
    return ((await tx('readonly', (s) => s.get(url))) as Blob | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function savedUrls(): Promise<string[]> {
  if (!offlineSupported()) return [];
  try {
    return (await tx('readonly', (s) => s.getAllKeys())) as string[];
  } catch {
    return [];
  }
}

/** Downloads `url` and stores it. `onProgress` gets 0..1 (0 when the size is unknown). */
export async function saveForOffline(url: string, onProgress?: (fraction: number) => void): Promise<void> {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const type = res.headers.get('content-type') || 'audio/mpeg';
  let blob: Blob;
  if (res.body) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      if (total) onProgress?.(Math.min(1, got / total));
    }
    blob = new Blob(chunks as BlobPart[], { type });
  } else {
    blob = await res.blob();
  }
  if (blob.size === 0) throw new Error('empty file');
  await tx('readwrite', (s) => s.put(blob, url));
  onProgress?.(1);
}

/** Asks the browser not to throw the saved files away when space is short. */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // not available: the files are still saved, just not protected
  }
}

/** Has the service worker keep the built files that are loaded right now (including lazy parts). */
export function keepAppShell(): void {
  try {
    const urls = performance
      .getEntriesByType('resource')
      .map((e) => new URL(e.name))
      .filter((u) => u.origin === location.origin && u.pathname.startsWith('/assets/'))
      .map((u) => u.pathname);
    navigator.serviceWorker?.controller?.postMessage({ type: 'cache-urls', urls: [...new Set(urls)] });
  } catch {
    // optional
  }
}
