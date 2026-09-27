import { issueSignedToken, presignUrl, type IssuedSignedToken } from '@vercel/blob';
import { ApiError, notFound } from './http.js';

/**
 * Private Vercel Blob stores cannot be read by visitors directly, and the
 * signed links shown in the Vercel dashboard expire after a few minutes.
 * Content therefore stores a stable site path, /api/media/<pathname>, and
 * this module turns it into a fresh short-lived signed link on each request.
 */

export const MEDIA_PREFIX = '/api/media/';
const PRIVATE_HOST_SUFFIX = '.private.blob.vercel-storage.com';

/** Which access mode admin uploads use; must match the store's own setting. */
export function blobAccess(): 'public' | 'private' {
  return process.env.BLOB_ACCESS === 'public' ? 'public' : 'private';
}

/**
 * Converts a private-store blob URL (with or without an expired signature)
 * into the stable /api/media/... path. Any other value is returned unchanged.
 */
export function normalizeMediaUrl(value: string): string {
  if (!value || !value.startsWith('https://')) return value;
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith(PRIVATE_HOST_SUFFIX) || url.pathname.length < 2) return value;
    return MEDIA_PREFIX + url.pathname.slice(1);
  } catch {
    return value;
  }
}

const TOKEN_LIFETIME_MS = 6 * 60 * 60 * 1000;
const TOKEN_REFRESH_MARGIN_MS = 30 * 60 * 1000;
const LINK_LIFETIME_MS = 60 * 60 * 1000;

let cachedToken: IssuedSignedToken | null = null;
let issueToken: () => Promise<IssuedSignedToken> = () =>
  issueSignedToken({ pathname: '*', operations: ['get'], validUntil: Date.now() + TOKEN_LIFETIME_MS });

/** Lets tests replace the network call that issues the read token. */
export function setTokenIssuer(fn: () => Promise<IssuedSignedToken>): void {
  issueToken = fn;
  cachedToken = null;
}

async function readToken(): Promise<IssuedSignedToken> {
  if (!cachedToken || cachedToken.validUntil - Date.now() < TOKEN_REFRESH_MARGIN_MS) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError(500, 'config', 'فضای ذخیره فایل (BLOB_READ_WRITE_TOKEN) تنظیم نشده است.');
    }
    cachedToken = await issueToken();
  }
  return cachedToken;
}

/** GET /api/media/<pathname>: redirect to a fresh signed link for that private blob. */
export async function mediaRedirect(segments: string[]): Promise<Response> {
  const pathname = segments.join('/');
  if (!pathname || pathname.length > 500 || segments.some((s) => s === '' || s === '.' || s === '..')) {
    throw notFound('فایل پیدا نشد.');
  }
  const token = await readToken();
  const validUntil = Math.min(Date.now() + LINK_LIFETIME_MS, token.validUntil);
  const { presignedUrl } = await presignUrl(token, {
    operation: 'get',
    pathname,
    access: 'private',
    validUntil,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: presignedUrl,
      // Browsers may reuse the redirect well within the link's one-hour lifetime.
      'Cache-Control': 'private, max-age=600',
    },
  });
}
