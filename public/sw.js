/* Keeps the app shell available without internet. API calls are never touched. */
const SHELL = 'derang-shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return;

  // Built files have content hashes in their names, so a cached copy is always right.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(SHELL).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Pages: the network wins (new releases show up at once); the saved copy is only the fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL);
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(req, { signal: controller.signal });
          clearTimeout(timer);
          if (res.ok) cache.put('/index.html', res.clone());
          return res;
        } catch {
          const saved = await cache.match('/index.html');
          if (saved) return saved;
          throw new Error('offline');
        }
      })()
    );
  }
});

// The page can ask for extra files to be kept (the lazily loaded parts of the app).
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'cache-urls' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(SHELL).then((cache) =>
      Promise.all(
        data.urls
          .filter((u) => typeof u === 'string' && u.startsWith('/'))
          .map((u) => cache.match(u).then((hit) => hit || fetch(u).then((r) => (r.ok ? cache.put(u, r) : undefined)).catch(() => undefined)))
      )
    )
  );
});
