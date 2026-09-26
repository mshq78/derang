import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ContentBundle,
  SiteSettings,
  CollectionName,
  CollectionItem,
  CollectionItemMap,
} from '../types/content';
import { DEFAULT_CONTENT } from '../data/defaultContent';
import {
  fetchContentBundle,
  adminLogin as apiAdminLogin,
  getAdminToken,
  setAdminToken,
  apiUpdateSiteSettings,
  apiAddItem,
  apiUpdateItem,
  apiDeleteItem,
  apiReorderItems,
  apiResetContent,
  apiUploadMedia,
  setCachedContent,
  getSandboxContent,
  setSandboxContent,
} from '../lib/api';

interface ContentContextValue {
  content: ContentBundle;
  isLoading: boolean;
  isOnline: boolean;
  isAdmin: boolean;
  isSandboxMode: boolean;
  setSandboxMode: (enabled: boolean) => void;
  loginAdmin: (password: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => void;
  updateSite: (settings: Partial<SiteSettings>) => Promise<boolean>;
  addItem: <C extends CollectionName>(
    collection: C,
    item: Omit<CollectionItemMap[C], 'id' | 'sortOrder'>
  ) => Promise<boolean>;
  updateItem: <C extends CollectionName>(
    collection: C,
    id: string,
    patch: Partial<CollectionItemMap[C]>
  ) => Promise<boolean>;
  deleteItem: (collection: CollectionName, id: string) => Promise<boolean>;
  reorderCollection: (collection: CollectionName, orderedIds: string[]) => Promise<boolean>;
  resetToDefault: () => Promise<boolean>;
  refreshContent: () => Promise<void>;
  uploadMedia: (file: File) => Promise<{ url: string; filename: string }>;
  exportContentJson: () => void;
  importContentJson: (jsonString: string) => Promise<{ success: boolean; message: string }>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<ContentBundle>(DEFAULT_CONTENT);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => !!getAdminToken());
  const [isSandboxMode, setSandboxMode] = useState<boolean>(false);

  const refreshContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const { bundle, fromApi } = await fetchContentBundle();
      setContent(bundle);
      setIsOnline(fromApi);
      // If we are not connected to a live API, default sandbox mode to true for dev preview
      if (!fromApi) {
        setSandboxMode(true);
      }
    } catch {
      setContent(DEFAULT_CONTENT);
      setIsOnline(false);
      setSandboxMode(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  const loginAdmin = async (password: string) => {
    const res = await apiAdminLogin(password);
    if (res.success) {
      setIsAdmin(true);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setIsAdmin(false);
  };

  const updateSite = async (settings: Partial<SiteSettings>) => {
    try {
      const updatedSite = await apiUpdateSiteSettings(settings, isSandboxMode);
      setContent((prev) => ({
        ...prev,
        site: { ...prev.site, ...updatedSite },
        updatedAt: new Date().toISOString(),
      }));
      return true;
    } catch {
      return false;
    }
  };

  const addItem = async <C extends CollectionName>(
    collection: C,
    item: Omit<CollectionItemMap[C], 'id' | 'sortOrder'>
  ) => {
    try {
      const created = await apiAddItem<C>(collection, item, isSandboxMode);
      setContent((prev) => {
        const list = [...(prev[collection] as CollectionItem[]), created as CollectionItem];
        return {
          ...prev,
          [collection]: list,
          updatedAt: new Date().toISOString(),
        };
      });
      return true;
    } catch {
      return false;
    }
  };

  const updateItem = async <C extends CollectionName>(
    collection: C,
    id: string,
    patch: Partial<CollectionItemMap[C]>
  ) => {
    try {
      const updated = await apiUpdateItem<C>(collection, id, patch, isSandboxMode);
      setContent((prev) => {
        const list = (prev[collection] as CollectionItem[]).map((x) =>
          x.id === id ? ({ ...x, ...updated } as CollectionItem) : x
        );
        return {
          ...prev,
          [collection]: list,
          updatedAt: new Date().toISOString(),
        };
      });
      return true;
    } catch {
      return false;
    }
  };

  const deleteItem = async (collection: CollectionName, id: string) => {
    try {
      await apiDeleteItem(collection, id, isSandboxMode);
      setContent((prev) => {
        const list = (prev[collection] as CollectionItem[]).filter((x) => x.id !== id);
        return {
          ...prev,
          [collection]: list,
          updatedAt: new Date().toISOString(),
        };
      });
      return true;
    } catch {
      return false;
    }
  };

  const reorderCollection = async (collection: CollectionName, orderedIds: string[]) => {
    try {
      await apiReorderItems(collection, orderedIds, isSandboxMode);
      setContent((prev) => {
        const itemMap = new Map((prev[collection] as CollectionItem[]).map((x) => [x.id, x]));
        const reordered = orderedIds
          .map((id, index) => {
            const item = itemMap.get(id);
            return item ? ({ ...item, sortOrder: index + 1 } as CollectionItem) : null;
          })
          .filter(Boolean) as CollectionItem[];
        return {
          ...prev,
          [collection]: reordered,
          updatedAt: new Date().toISOString(),
        };
      });
      return true;
    } catch {
      return false;
    }
  };

  const resetToDefault = async () => {
    try {
      const res = await apiResetContent(isSandboxMode);
      setContent(res);
      return true;
    } catch {
      return false;
    }
  };

  const uploadMedia = async (file: File) => {
    return await apiUploadMedia(file, isSandboxMode);
  };

  const exportContentJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(content, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `derang-content-${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importContentJson = async (
    jsonString: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.site || !Array.isArray(parsed.stations)) {
        return { success: false, message: 'ساختار فایل JSON بارگذاری شده نامعتبر است.' };
      }
      if (!isSandboxMode) {
        setCachedContent(parsed);
      } else {
        setSandboxContent(parsed);
      }
      setContent(parsed);
      return { success: true, message: 'محتوا با موفقیت جایگزین و ذخیره شد.' };
    } catch {
      return { success: false, message: 'خطا در پردازش فایل JSON.' };
    }
  };

  return (
    <ContentContext.Provider
      value={{
        content,
        isLoading,
        isOnline,
        isAdmin,
        isSandboxMode,
        setSandboxMode,
        loginAdmin,
        logoutAdmin,
        updateSite,
        addItem,
        updateItem,
        deleteItem,
        reorderCollection,
        resetToDefault,
        refreshContent,
        uploadMedia,
        exportContentJson,
        importContentJson,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = (): ContentContextValue => {
  const ctx = useContext(ContentContext);
  if (!ctx) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return ctx;
};
