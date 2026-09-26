/**
 * Converts English digits to Persian digits
 */
export const toPersianDigits = (num: number | string): string => {
  return String(num).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d, 10)]);
};

/**
 * Format seconds to MM:SS in Persian digits
 */
export const formatDuration = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '۰۰:۰۰';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return toPersianDigits(formatted);
};

/**
 * Format ISO date string into readable Persian date (Jalali)
 */
export const formatDisplayDate = (isoString?: string): string => {
  if (!isoString) return 'نامشخص';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLen = 60): string => {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
};

/**
 * Normalizes Persian and Arabic text for robust search matching:
 * - trim, lower-case
 * - converts Arabic ي/ك to Persian ی/ک
 * - replaces zero-width non-joiner (U+200C) with space
 * - collapses consecutive spaces
 */
export const normalizePersianText = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ');
};
