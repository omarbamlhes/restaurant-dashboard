// رستق Service Worker — offline support for POS / Kitchen
const VERSION = 'v1';
const STATIC_CACHE = `rustaq-static-${VERSION}`;
const RUNTIME_CACHE = `rustaq-runtime-${VERSION}`;
const API_CACHE = `rustaq-api-${VERSION}`;

// App shell that is safe to precache
const PRECACHE_URLS = ['/pos', '/kitchen', '/offline', '/manifest.json', '/icon.svg'];

// GET API routes worth caching for offline reads (menu, categories, branches, tables)
const CACHEABLE_API = ['/api/menu', '/api/menu/categories', '/api/branches', '/api/tables'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

function isCacheableApi(url) {
  return CACHEABLE_API.some((path) => url.pathname.startsWith(path));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API GET — network-first, fall back to cache (offline reads)
  if (url.pathname.startsWith('/api/')) {
    if (isCacheableApi(url)) {
      event.respondWith(
        fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(API_CACHE).then((c) => c.put(request, copy));
            return res;
          })
          .catch(() => caches.match(request)),
      );
    }
    return;
  }

  // Static assets (_next/static, fonts, images) — cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    /\.(?:js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Page navigations — network-first, fall back to cached page, then /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/offline') || caches.match('/pos');
        }),
    );
  }
});
