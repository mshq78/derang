// Shared by the site and the server (server/userAuth.ts): keep it free of
// browser-only APIs.

/** Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to 0-9. */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Normalizes an Iranian mobile number to 09XXXXXXXXX, or returns null.
 * Accepts 0912..., 912..., +98912..., 98912..., 0098912... and any digit script.
 */
export function normalizeIranMobile(input: string): string | null {
  let s = toLatinDigits(input).replace(/[\s\-().‌‎‏]/g, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  else if (/^9\d{9}$/.test(s)) s = '0' + s;
  return /^09\d{9}$/.test(s) ? s : null;
}

/** 09123456789 → 0912***6789 */
export function maskPhone(phone: string): string {
  return phone.length === 11 ? `${phone.slice(0, 4)}***${phone.slice(7)}` : phone;
}
