import React, { StrictMode, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ContentProvider } from './context/ContentContext';
import './index.css';

const AdminConsole = lazy(() =>
  import('./admin/AdminConsole.tsx').then((module) => ({ default: module.AdminConsole }))
);

function Root() {
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) {
      let meta = document.querySelector('meta[name="robots"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'robots');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', 'noindex,nofollow');
    }
  }, [isAdminRoute]);

  if (isAdminRoute) {
    return (
      <ContentProvider>
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-canvas text-ink text-xs font-bold">
              در حال بارگذاری پنل مدیریت...
            </div>
          }
        >
          <AdminConsole
            onBackToApp={() => {
              window.location.href = '/';
            }}
          />
        </Suspense>
      </ContentProvider>
    );
  }

  return <App />;
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
