/** Key of the data saved before accounts existed, and still used when phone sign-in is off. */
export const STORAGE_KEY = 'gera_dorang_unified_v2';

/** Each signed-in account keeps its own local data, so people sharing a device never see each other's. */
export const userStorageKey = (userId: string): string => `${STORAGE_KEY}:${userId}`;

/**
 * The first account to sign in on a device adopts the data saved before
 * accounts existed (decisions, progress, settings), once; the old copy is
 * then removed so a second account on the same device does not get it too.
 */
export function adoptLegacyData(userId: string): void {
  try {
    const key = userStorageKey(userId);
    if (localStorage.getItem(key)) return;
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (!legacy) return;
    const parsed = JSON.parse(legacy);
    delete parsed.profile; // the name now comes from the account
    localStorage.setItem(key, JSON.stringify(parsed));
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable or unreadable: the account simply starts empty.
  }
}
