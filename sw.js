const CACHE_NAME = 'house-rent-management-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon-64.png',
  './apple-touch-icon.png',
  './app-icon-192.png',
  './app-icon-512.png',
  './app-icon-maskable-512.png'
];

// Cache each file separately so one missing/failed file never breaks the whole install.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(url =>
      cache.add(url).catch(err => console.warn('SW: could not cache', url, err))
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key.startsWith('house-rent-management-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// Network first (so updates appear), fall back to cache when offline.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      return Response.error();
    }
  })());
});
