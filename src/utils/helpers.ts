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
 * Format ISO date string into readable Persian date
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
 * Escape HTML safe strings
 */
export const sanitize = (str: string): string => {
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
};
