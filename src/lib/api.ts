import {
  ContentBundle,
  SiteSettings,
  CollectionName,
  CollectionItem,
  CollectionItemMap,
} from '../types/content';
import { DEFAULT_CONTENT } from '../data/defaultContent';

const TOKEN_KEY = 'derang_admin_token';
const PUBLIC_CACHE_KEY = 'derang_content_cache';
const ADMIN_SANDBOX_KEY = 'derang_admin_sandbox_content';

export const getBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
  return envUrl.replace(/\/+$/, '');
};

// --------------------------------------------------------------------------
// Token Storage (sessionStorage)
// --------------------------------------------------------------------------

export const getAdminToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAdminToken = (token: string | null): void => {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
};

// Custom event for session expiration
export const emitSessionExpired = (): void => {
  setAdminToken(null);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('derang:session-expired'));
  }
};

// --------------------------------------------------------------------------
// Public Cache (localStorage)
// --------------------------------------------------------------------------

export const getCachedContent = (): ContentBundle => {
  try {
    const raw = localStorage.getItem(PUBLIC_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.site && Array.isArray(parsed.stations)) {
        return parsed as ContentBundle;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_CONTENT;
};

export const setCachedContent = (bundle: ContentBundle): void => {
  try {
    localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(bundle));
  } catch {
    // ignore
  }
};

// --------------------------------------------------------------------------
// Sandbox Content (DEV only)
// --------------------------------------------------------------------------

export const getSandboxContent = (): ContentBundle => {
  if (!import.meta.env.DEV) {
    return getCachedContent();
  }
  try {
    const raw = localStorage.getItem(ADMIN_SANDBOX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.site && Array.isArray(parsed.stations)) {
        return parsed as ContentBundle;
      }
    }
  } catch {
    // ignore
  }
  return getCachedContent();
};

export const setSandboxContent = (bundle: ContentBundle): void => {
  if (!import.meta.env.DEV) return;
  try {
    localStorage.setItem(ADMIN_SANDBOX_KEY, JSON.stringify(bundle));
  } catch {
    // ignore
  }
};

// --------------------------------------------------------------------------
// Core HTTP Fetch with 10s AbortController & Error Parsing
// --------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 10000;

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  isAdminEndpoint = false
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (isAdminEndpoint) {
    const token = getAdminToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (res.status === 401 && isAdminEndpoint) {
      emitSessionExpired();
      throw new Error('نشست شما منقضی شده است؛ دوباره وارد شوید.');
    }

    if (!res.ok) {
      let errorMessage = `خطای سرور (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          errorMessage = errJson.error.message;
        } else if (errJson?.message) {
          errorMessage = errJson.message;
        }
      } catch {
        // ignore JSON parse error
      }
      throw new Error(errorMessage);
    }

    if (res.status === 204) {
      return undefined as unknown as T;
    }

    const data = await res.json();
    return data as T;
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('زمان پاسخگویی سرور به پایان رسید (تایم‌اوت ۱۰ ثانیه).');
      }
      throw err;
    }
    throw new Error('خطای ناشناخته در برقراری ارتباط با سرور.');
  } finally {
    clearTimeout(timeoutId);
  }
}

// --------------------------------------------------------------------------
// Public API Methods
// --------------------------------------------------------------------------

/**
 * GET /api/content
 * Public endpoint to fetch full published content. Falls back to cached content or default content.
 */
export const fetchContentBundle = async (): Promise<{
  bundle: ContentBundle;
  fromApi: boolean;
}> => {
  try {
    const data = await apiFetch<ContentBundle>('/api/content', {
      method: 'GET',
      credentials: 'omit',
    });

    if (data && data.site && Array.isArray(data.stations)) {
      setCachedContent(data);
      return { bundle: data, fromApi: true };
    }
  } catch {
    // Network / API failure: fallback to cache
  }

  return { bundle: getCachedContent(), fromApi: false };
};

// --------------------------------------------------------------------------
// Admin API Methods
// --------------------------------------------------------------------------

export interface AdminLoginResponse {
  token: string;
  expiresAt?: string;
  admin: {
    username: string;
  };
}

/**
 * POST /api/admin/login
 * Body: { username, password }
 */
export const adminLogin = async (credentials: {
  username: string;
  password: string;
}): Promise<AdminLoginResponse> => {
  const data = await apiFetch<AdminLoginResponse>(
    '/api/admin/login',
    {
      method: 'POST',
      body: JSON.stringify(credentials),
    },
    false
  );

  if (data?.token) {
    setAdminToken(data.token);
  }
  return data;
};

/**
 * GET /api/admin/me
 */
export const adminGetMe = async (): Promise<{ admin: { username: string } }> => {
  return await apiFetch<{ admin: { username: string } }>(
    '/api/admin/me',
    { method: 'GET' },
    true
  );
};

/**
 * POST /api/admin/logout
 */
export const adminLogout = async (): Promise<void> => {
  try {
    await apiFetch<void>('/api/admin/logout', { method: 'POST' }, true);
  } finally {
    setAdminToken(null);
  }
};

/**
 * GET /api/admin/content
 * Admin endpoint returning the complete ContentBundle with ALL items (including unpublished).
 */
export const adminGetContent = async (isSandbox = false): Promise<ContentBundle> => {
  if (import.meta.env.DEV && isSandbox) {
    return getSandboxContent();
  }
  return await apiFetch<ContentBundle>('/api/admin/content', { method: 'GET' }, true);
};

/**
 * PUT /api/admin/site
 * Body: SiteSettings (full object)
 */
export const adminUpdateSite = async (
  settings: SiteSettings,
  isSandbox = false
): Promise<SiteSettings> => {
  if (import.meta.env.DEV && isSandbox) {
    const sandbox = getSandboxContent();
    const updated = {
      ...sandbox,
      site: settings,
      updatedAt: new Date().toISOString(),
    };
    setSandboxContent(updated);
    return settings;
  }

  return await apiFetch<SiteSettings>(
    '/api/admin/site',
    {
      method: 'PUT',
      body: JSON.stringify(settings),
    },
    true
  );
};

/**
 * POST /api/admin/collections/:collection
 * Body: item (id optional)
 */
export const adminAddItem = async <C extends CollectionName>(
  collection: C,
  item: Omit<CollectionItemMap[C], 'id' | 'sortOrder'>,
  isSandbox = false
): Promise<CollectionItemMap[C]> => {
  if (import.meta.env.DEV && isSandbox) {
    const sandbox = getSandboxContent();
    const list = (sandbox[collection] as CollectionItem[]) || [];
    const maxSort = list.reduce((m, x) => Math.max(m, x.sortOrder || 0), 0);
    const created = {
      ...item,
      id: `${collection}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sortOrder: maxSort + 1,
      isPublished: true,
    } as unknown as CollectionItemMap[C];

    setSandboxContent({
      ...sandbox,
      [collection]: [...list, created],
      updatedAt: new Date().toISOString(),
    });
    return created;
  }

  return await apiFetch<CollectionItemMap[C]>(
    `/api/admin/collections/${collection}`,
    {
      method: 'POST',
      body: JSON.stringify(item),
    },
    true
  );
};

/**
 * PUT /api/admin/collections/:collection/:id
 * Body: full item
 */
export const adminUpdateItem = async <C extends CollectionName>(
  collection: C,
  id: string,
  item: CollectionItemMap[C],
  isSandbox = false
): Promise<CollectionItemMap[C]> => {
  if (import.meta.env.DEV && isSandbox) {
    const sandbox = getSandboxContent();
    const list = (sandbox[collection] as CollectionItem[]).map((x) =>
      x.id === id ? ({ ...x, ...item } as CollectionItem) : x
    );
    const updatedItem = list.find((x) => x.id === id) as CollectionItemMap[C];
    setSandboxContent({
      ...sandbox,
      [collection]: list,
      updatedAt: new Date().toISOString(),
    });
    return updatedItem;
  }

  return await apiFetch<CollectionItemMap[C]>(
    `/api/admin/collections/${collection}/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(item),
    },
    true
  );
};

/**
 * DELETE /api/admin/collections/:collection/:id
 */
export const adminDeleteItem = async (
  collection: CollectionName,
  id: string,
  isSandbox = false
): Promise<void> => {
  if (import.meta.env.DEV && isSandbox) {
    const sandbox = getSandboxContent();
    const list = (sandbox[collection] as CollectionItem[]).filter((x) => x.id !== id);
    setSandboxContent({
      ...sandbox,
      [collection]: list,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  await apiFetch<void>(
    `/api/admin/collections/${collection}/${id}`,
    { method: 'DELETE' },
    true
  );
};

/**
 * POST /api/admin/collections/:collection/reorder
 * Body: { ids: string[] }
 */
export const adminReorderCollection = async (
  collection: CollectionName,
  ids: string[],
  isSandbox = false
): Promise<{ items: CollectionItem[] }> => {
  if (import.meta.env.DEV && isSandbox) {
    const sandbox = getSandboxContent();
    const itemMap = new Map((sandbox[collection] as CollectionItem[]).map((x) => [x.id, x]));
    const reordered = ids
      .map((id, index) => {
        const item = itemMap.get(id);
        return item ? ({ ...item, sortOrder: index + 1 } as CollectionItem) : null;
      })
      .filter(Boolean) as CollectionItem[];

    setSandboxContent({
      ...sandbox,
      [collection]: reordered,
      updatedAt: new Date().toISOString(),
    });
    return { items: reordered };
  }

  return await apiFetch<{ items: CollectionItem[] }>(
    `/api/admin/collections/${collection}/reorder`,
    {
      method: 'POST',
      body: JSON.stringify({ ids }),
    },
    true
  );
};

/**
 * Upload a media file to Vercel Blob.
 * POST /api/admin/blob-upload issues the upload token (admin only);
 * the file itself goes directly from the browser to Blob storage.
 */
export const adminUploadMedia = (
  file: File,
  kind: 'audio' | 'video' | 'image',
  onProgress?: (percent: number) => void,
  isSandbox = false
): Promise<{ url: string; contentType: string; size: number }> => {
  if (import.meta.env.DEV && isSandbox) {
    return new Promise((resolve) => {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 25;
        if (onProgress) onProgress(Math.min(currentProgress, 100));
        if (currentProgress >= 100) {
          clearInterval(interval);
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              url: (reader.result as string) || URL.createObjectURL(file),
              contentType: file.type || 'application/octet-stream',
              size: file.size,
            });
          };
          reader.onerror = () => {
            resolve({
              url: URL.createObjectURL(file),
              contentType: file.type || 'application/octet-stream',
              size: file.size,
            });
          };
          reader.readAsDataURL(file);
        }
      }, 100);
    });
  }

  const safeName =
    file.name
      .normalize('NFKD')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(-80) || 'file';
  const token = getAdminToken();

  // The browser uploads straight to Vercel Blob; /api/admin/blob-upload only
  // checks the admin session and issues a short-lived upload token.
  // Loaded on demand so regular visitors never download the upload client.
  return import('@vercel/blob/client')
    .then(({ upload }) =>
      upload(`${kind}/${safeName}`, file, {
        access: 'public',
        handleUploadUrl: `${getBaseUrl()}/api/admin/blob-upload`,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        contentType: file.type || undefined,
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => onProgress?.(Math.round(percentage)),
      })
    )
    .then((blob) => ({
      url: blob.url,
      contentType: blob.contentType || file.type,
      size: file.size,
    }))
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : '';
      if (/401|unauthorized|منقضی/i.test(message)) {
        emitSessionExpired();
        throw new Error('نشست شما منقضی شده است؛ دوباره وارد شوید.');
      }
      throw new Error(message ? `بارگذاری فایل انجام نشد: ${message}` : 'بارگذاری فایل انجام نشد.');
    });
};

/**
 * POST /api/admin/import
 * Body: ContentBundle
 */
export const adminImportContent = async (
  bundle: ContentBundle,
  isSandbox = false
): Promise<{ ok: boolean }> => {
  if (import.meta.env.DEV && isSandbox) {
    setSandboxContent(bundle);
    return { ok: true };
  }

  return await apiFetch<{ ok: boolean }>(
    '/api/admin/import',
    {
      method: 'POST',
      body: JSON.stringify(bundle),
    },
    true
  );
};
