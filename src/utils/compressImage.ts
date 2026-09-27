/**
 * Shrinks an image in the browser before upload: the longest side is capped
 * and it is re-encoded as WebP (JPEG where WebP encoding is unavailable).
 * The limits keep text on card posters sharp on high-density screens.
 */
const MAX_SIDE = 1600;
const QUALITY = 0.82;

// Formats the browser can decode and that are worth re-encoding.
const COMPRESSIBLE = /^image\/(jpeg|png|webp|bmp|avif)$/i;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export interface CompressResult {
  file: File;
  originalSize: number;
  compressed: boolean;
}

export async function compressImage(file: File): Promise<CompressResult> {
  const unchanged = { file, originalSize: file.size, compressed: false };
  if (!COMPRESSIBLE.test(file.type) || typeof createImageBitmap !== 'function') return unchanged;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return unchanged; // Undecodable here; let the server-side type check decide.
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return unchanged;
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Safari before 17 cannot encode WebP and silently returns PNG; fall back to JPEG.
  let blob = await canvasToBlob(canvas, 'image/webp', QUALITY);
  if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', QUALITY);
  if (!blob) return unchanged;

  // Keep the original when re-encoding would not make it smaller.
  if (blob.size >= file.size && scale === 1) return unchanged;

  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return {
    file: new File([blob], `${baseName}.${extension}`, { type: blob.type, lastModified: Date.now() }),
    originalSize: file.size,
    compressed: true,
  };
}
