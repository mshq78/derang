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

export const getAdminToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAdminToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
};

/**
 * Public Cache:
 * Only stores data obtained from the official backend /api/content endpoint.
 * Preview/sandbox modifications from the admin panel never leak here.
 */
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

/**
 * Admin Sandbox Content:
 * In development/preview mode without an active backend, changes are isolated here.
 */
export const getSandboxContent = (): ContentBundle => {
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
  try {
    localStorage.setItem(ADMIN_SANDBOX_KEY, JSON.stringify(bundle));
  } catch {
    // ignore
  }
};

const getHeaders = (): HeadersInit => {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// --------------------------------------------------------------------------
// API Client Methods (Backend Contract)
// --------------------------------------------------------------------------

/**
 * POST /api/admin/login
 * Body: { password: string }
 * Response: { token: string }
 */
export const adminLogin = async (
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/admin/login`;

  if (baseUrl) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setAdminToken(data.token);
          return { success: true, token: data.token };
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'رمز عبور مدیریت نادرست است.' };
      }
    } catch {
      // network failure
    }
  }

  // Preview / dev sandbox authentication
  if (password === 'admin' || password === 'derang' || password === 'deraang' || password === 'gera') {
    const mockToken = 'mock_admin_token_' + Date.now();
    setAdminToken(mockToken);
    return { success: true, token: mockToken };
  }

  return { success: false, error: 'رمز عبور نادرست است (رمز پیش‌فرض حالت پیش‌نمایش: admin)' };
};

/**
 * GET /api/content
 * Response: ContentBundle
 * Public endpoint to fetch full published content. Falls back to cached content or default factory content.
 */
export const fetchContentBundle = async (): Promise<{
  bundle: ContentBundle;
  fromApi: boolean;
}> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/content`;

  if (baseUrl) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { credentials: 'omit' },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.site && Array.isArray(data.stations)) {
          setCachedContent(data);
          return { bundle: data as ContentBundle, fromApi: true };
        }
      }
    } catch {
      // Network failure: silent fallback
    }
  }

  return { bundle: getCachedContent(), fromApi: false };
};

/**
 * PUT /api/content/site
 * Headers: Authorization: Bearer <token>
 * Body: Partial<SiteSettings>
 * Response: SiteSettings
 */
export const apiUpdateSiteSettings = async (
  settings: Partial<SiteSettings>,
  isSandboxMode = false
): Promise<SiteSettings> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/content/site`;

  if (baseUrl && !isSandboxMode) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        const cached = getCachedContent();
        const updated = {
          ...cached,
          site: { ...cached.site, ...data },
          updatedAt: new Date().toISOString(),
        };
        setCachedContent(updated);
        return updated.site;
      }
    } catch {
      // fallback to sandbox
    }
  }

  // Sandbox isolation: do not overwrite public cache
  const sandbox = getSandboxContent();
  const updated = {
    ...sandbox,
    site: { ...sandbox.site, ...settings },
    updatedAt: new Date().toISOString(),
  };
  setSandboxContent(updated);
  return updated.site;
};

/**
 * POST /api/content/:collection
 * Headers: Authorization: Bearer <token>
 * Body: Omit<Item, 'id' | 'sortOrder'>
 * Response: Created Item
 */
export const apiAddItem = async <C extends CollectionName>(
  collection: C,
  item: Omit<CollectionItemMap[C], 'id' | 'sortOrder'>,
  isSandboxMode = false
): Promise<CollectionItemMap[C]> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/content/${collection}`;

  if (baseUrl && !isSandboxMode) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(item),
      });

      if (res.ok) {
        const created = (await res.json()) as CollectionItemMap[C];
        const cached = getCachedContent();
        const list = [...(cached[collection] as CollectionItem[]), created];
        setCachedContent({
          ...cached,
          [collection]: list,
          updatedAt: new Date().toISOString(),
        });
        return created;
      }
    } catch {
      // fallback to sandbox
    }
  }

  // Sandbox isolation
  const sandbox = getSandboxContent();
  const list = (sandbox[collection] as CollectionItem[]) || [];
  const maxSort = list.reduce((m, x) => Math.max(m, x.sortOrder || 0), 0);
  const newItem = {
    ...item,
    id: `${collection}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sortOrder: maxSort + 1,
    isPublished: true,
  } as unknown as CollectionItemMap[C];

  setSandboxContent({
    ...sandbox,
    [collection]: [...list, newItem],
    updatedAt: new Date().toISOString(),
  });
  return newItem;
};

/**
 * PUT /api/content/:collection/:id
 * Headers: Authorization: Bearer <token>
 * Body: Partial<Item>
 * Response: Updated Item
 */
export const apiUpdateItem = async <C extends CollectionName>(
  collection: C,
  id: string,
  patch: Partial<CollectionItemMap[C]>,
  isSandboxMode = false
): Promise<CollectionItemMap[C]> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/content/${collection}/${id}`;

  if (baseUrl && !isSandboxMode) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(patch),
      });

      if (res.ok) {
        const updated = (await res.json()) as CollectionItemMap[C];
        const cached = getCachedContent();
        const list = (cached[collection] as CollectionItem[]).map((x) =>
          x.id === id ? { ...x, ...updated } : x
        );
        setCachedContent({
          ...cached,
          [collection]: list,
          updatedAt: new Date().toISOString(),
        });
        return updated;
      }
    } catch {
      // fallback to sandbox
    }
  }

  // Sandbox isolation
  const sandbox = getSandboxContent();
  const list = (sandbox[collection] as CollectionItem[]).map((x) =>
    x.id === id ? ({ ...x, ...patch } as CollectionItem) : x
  );
  const updatedItem = list.find((x) => x.id === id) as CollectionItemMap[C];
  setSandboxContent({
    ...sandbox,
    [collection]: list,
    updatedAt: new Date().toISOString(),
  });
  return updatedItem;
};

/**
 * DELETE /api/content/:collection/:id
 * Headers: Authorization: Bearer <token>
 * Response: { success: boolean }
 */
export const apiDeleteItem = async (
  collection: CollectionName,
  id: string,
  isSandboxMode = false
): Promise<boolean> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/content/${collection}/${id}`;

  if (baseUrl && !isSandboxMode) {
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        const cached = getCachedContent();
        const list = (cached[collection] as CollectionItem[]).filter((x) => x.id !== id);
        setCachedContent({
          ...cached,
          [collection]: list,
          updatedAt: new Date().toISOString(),
        });
        return true;
      }
    } catch {
      // fallback to sandbox
    }
  }

  // Sandbox isolation
  const sandbox = getSandboxContent();
  const list = (sandbox[collection] as CollectionItem[]).filter((x) => x.id !== id);
  setSandboxContent({
    ...sandbox,
    [collection]: list,
    updatedAt: new Date().toISOString(),
  });
  return true;
};

/**
 * PUT /api/content/:collection/reorder
 * Headers: Authorization: Bearer <token>
 * Body: { ids: string[] }
 * Response: { success: boolean }
 */
export const apiReorderItems = async (
  collection: CollectionName,
  orderedIds: string[],
  isSandboxMode = false
): Promise<boolean> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/content/${collection}/reorder`;

  if (baseUrl && !isSandboxMode) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ids: orderedIds }),
      });

      if (res.ok) {
        const cached = getCachedContent();
        const itemMap = new Map((cached[collection] as CollectionItem[]).map((x) => [x.id, x]));
        const reordered = orderedIds
          .map((id, index) => {
            const item = itemMap.get(id);
            return item ? ({ ...item, sortOrder: index + 1 } as CollectionItem) : null;
          })
          .filter(Boolean) as CollectionItem[];
        setCachedContent({
          ...cached,
          [collection]: reordered,
          updatedAt: new Date().toISOString(),
        });
        return true;
      }
    } catch {
      // fallback to sandbox
    }
  }

  // Sandbox isolation
  const sandbox = getSandboxContent();
  const itemMap = new Map((sandbox[collection] as CollectionItem[]).map((x) => [x.id, x]));
  const reordered = orderedIds
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
  return true;
};

/**
 * POST /api/content/reset
 * Headers: Authorization: Bearer <token>
 * Response: ContentBundle
 */
export const apiResetContent = async (isSandboxMode = false): Promise<ContentBundle> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/content/reset`;

  if (baseUrl && !isSandboxMode) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setCachedContent(data);
        return data;
      }
    } catch {
      // fallback
    }
  }

  setSandboxContent(DEFAULT_CONTENT);
  return DEFAULT_CONTENT;
};

/**
 * POST /api/admin/upload
 * Headers: Authorization: Bearer <token>
 * Body: FormData (file: File)
 * Response: { url: string; filename: string }
 * Simulates or uploads an image file.
 */
export const apiUploadMedia = async (
  file: File,
  isSandboxMode = false
): Promise<{ url: string; filename: string }> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/admin/upload`;

  if (baseUrl && !isSandboxMode) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getAdminToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback to mock URL
    }
  }

  // Preview / Fake API upload
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        url: (reader.result as string) || URL.createObjectURL(file),
        filename: file.name,
      });
    };
    reader.onerror = () => {
      resolve({
        url: URL.createObjectURL(file),
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
  });
};
