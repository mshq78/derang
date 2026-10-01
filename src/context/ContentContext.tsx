import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ContentBundle } from '../types/content';
import { DEFAULT_CONTENT } from '../data/defaultContent';
import { fetchContentBundle, getCachedContent, hasCachedContent } from '../lib/api';

interface ContentContextValue {
  content: ContentBundle;
  isLoading: boolean;
  /**
   * True once the content can be trusted for first-screen decisions: the
   * first fetch finished, or a cached copy exists and the fetch had a short
   * head start (so a stale cache does not briefly show the wrong screen).
   */
  isReady: boolean;
  isOnline: boolean;
  refreshContent: () => Promise<void>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<ContentBundle>(() => getCachedContent());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

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
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    refreshContent();
    // With a cached copy there is something to show; give the fresh copy a
    // brief head start, then go ahead rather than wait on a slow network.
    if (!hasCachedContent()) return;
    const timer = setTimeout(() => setIsReady(true), 1200);
    return () => clearTimeout(timer);
  }, [refreshContent]);

  return (
    <ContentContext.Provider
      value={{
        content,
        isLoading,
        isReady,
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
