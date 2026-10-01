import { getBaseUrl } from './api';

export interface AuthUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    /** Seconds until the request may be repeated, when the server said so. */
    public retryAfter?: number
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 10000;

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${getBaseUrl()}/api/auth/${path}`, {
      ...init,
      // The session lives in an HttpOnly cookie, so this only works on the site's own domain.
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      signal: controller.signal,
    });
    if (res.status === 204) return undefined as T;
    let body: { error?: { code?: string; message?: string; retryAfter?: number } } | null = null;
    try {
      body = await res.json();
    } catch {
      // Non-JSON body, e.g. a platform error page.
    }
    if (!res.ok) {
      throw new AuthError(
        body?.error?.message || `خطای سرور (${res.status})`,
        body?.error?.code || 'error',
        res.status,
        body?.error?.retryAfter
      );
    }
    return body as T;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AuthError('پاسخی از سرور نرسید. اتصال اینترنت را بررسی کنید.', 'timeout', 0);
    }
    throw new AuthError('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.', 'network', 0);
  } finally {
    clearTimeout(timer);
  }
}

/** The signed-in user, or null when there is no valid session. Other failures throw. */
export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await authFetch<{ user: AuthUser }>('me');
    return res.user;
  } catch (err) {
    if (err instanceof AuthError && err.status === 401) return null;
    throw err;
  }
}

export const requestLoginCode = (phone: string) =>
  authFetch<{ ok: true; expiresInSeconds: number; resendAfterSeconds: number }>('request-code', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });

export const verifyLoginCode = (phone: string, code: string) =>
  authFetch<{ user: AuthUser }>('verify-code', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  }).then((res) => res.user);

export const loginWithPassword = (username: string, password: string) =>
  authFetch<{ user: AuthUser }>('login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }).then((res) => res.user);

export const saveUserProfile = (firstName: string, lastName: string) =>
  authFetch<{ user: AuthUser }>('profile', {
    method: 'PUT',
    body: JSON.stringify({ firstName, lastName }),
  }).then((res) => res.user);

export const logoutUser = () => authFetch<void>('logout', { method: 'POST' });
