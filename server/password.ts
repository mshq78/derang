import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const scryptAsync = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => scrypt(password, salt, 32, (err, key) => (err ? reject(err) : resolve(key))));

/** Stored as s1$<salt>$<hash> (scrypt, base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `s1$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

/** Always does the hashing work, even when there is no stored hash, so timing does not reveal unknown users. */
export async function checkPassword(password: string, stored: string | null): Promise<boolean> {
  const [version, saltPart, hashPart] = (stored ?? '').split('$');
  const salt = Buffer.from(saltPart || 'x', 'base64url');
  const expected = Buffer.from(hashPart || '', 'base64url');
  const key = await scryptAsync(password, salt);
  return version === 's1' && expected.length === key.length && timingSafeEqual(expected, key);
}
