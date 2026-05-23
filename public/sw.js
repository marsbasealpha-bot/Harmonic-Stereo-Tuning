const CACHE_NAME = 'harmonic-v4';
const ASSETS_TO_CACHE = [
  '/harmonic-stereo-tuning/',
  '/harmonic-stereo-tuning/index.html',
  '/harmonic-stereo-tuning/manifest.json',
  '/harmonic-stereo-tuning/icon.svg',
  '/harmonic-stereo-tuning/back-to-you-jesus.m4a',
  '/harmonic-stereo-tuning/assets/index-DnTJCndL.js',
  '/harmonic-stereo-tuning/assets/index-RN-81Os0.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((response) => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Fallback for offline
        return caches.match('/harmonic-stereo-tuning/index.html');
      });
    })
  );
});
