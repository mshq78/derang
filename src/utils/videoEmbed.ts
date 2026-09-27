// Shared by the site, the admin panel and the server (server/validate.ts),
// so keep it free of browser-only APIs.

const APARAT_HASH_PATTERNS = [
  /aparat\.com\/v\/([A-Za-z0-9]+)/i, // page link: https://www.aparat.com/v/abc123/title
  /aparat\.com\/video\/video\/embed\/videohash\/([A-Za-z0-9]+)/i, // iframe embed code
  /aparat\.com\/embed\/([A-Za-z0-9]+)/i, // script embed code
];

const YOUTUBE_ID_PATTERNS = [
  /youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/i,
  /youtu\.be\/([A-Za-z0-9_-]{11})/i,
];

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return match[1];
  }
  return null;
}

export function aparatHash(text: string): string | null {
  return firstMatch(text, APARAT_HASH_PATTERNS);
}

/**
 * Turns whatever the admin pasted (an Aparat page link, Aparat's iframe or
 * script embed code, or an embed address) into the Aparat page link, which
 * is what gets stored. Anything else is returned trimmed and unchanged.
 */
export function normalizeVideoInput(input: string): string {
  const text = input.trim();
  const hash = aparatHash(text);
  return hash ? `https://www.aparat.com/v/${hash}` : text;
}

/** The iframe address for an Aparat or YouTube link, or null for a direct video file. */
export function videoEmbedUrl(url: string): string | null {
  const hash = aparatHash(url);
  if (hash) return `https://www.aparat.com/video/video/embed/videohash/${hash}/vt/frame`;
  const youtubeId = firstMatch(url, YOUTUBE_ID_PATTERNS);
  if (youtubeId) return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
  return null;
}
