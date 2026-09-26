import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ContentBundle } from '../types/content';
import { DEFAULT_CONTENT } from '../data/defaultContent';
import { fetchContentBundle, getCachedContent } from '../lib/api';

interface ContentContextValue {
  content: ContentBundle;
  isLoading: boolean;
  isOnline: boolean;
  refreshContent: () => Promise<void>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<ContentBundle>(() => getCachedContent());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  const refreshContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const { bundle, fromApi } = await fetchContentBundle();
      setContent(bundle);
      setIsOnline(fromApi);
    } catch {
      setContent(getCachedContent());
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  return (
    <ContentContext.Provider
      value={{
        content,
        isLoading,
        isOnline,
        refreshContent,
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
