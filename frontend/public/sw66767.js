const CACHE_NAME_PAGES = 'pages-v1';
const CACHE_NAME_ASSETS = 'assets-v1';
const CACHE_NAME_IMAGES = 'images-v1';

const PRECACHE_URLS = [
  '/',          
  '/index.html',
  // Add more static files here if needed
];

// Install event: Pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME_ASSETS).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event: Cleanup old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME_PAGES, CACHE_NAME_ASSETS, CACHE_NAME_IMAGES];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch event: handle requests
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Navigation requests (HTML pages) — Network First strategy
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const cloned = response.clone();
          caches.open(CACHE_NAME_PAGES).then(cache => cache.put(request, cloned));
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // Static assets (CSS, JS, worker) — Stale While Revalidate
  if (['style', 'script', 'worker'].includes(request.destination)) {
event.respondWith(
  fetch(event.request).then((response) => {
    const responseClone = response.clone(); // ✅ safe copy
    caches.open('my-cache').then((cache) => {
      cache.put(event.request, responseClone); // ✅ use the clone for caching
    });
    return response; // ✅ original is still intact for browser
  })
);

    return;
  }

  // Images — Cache First strategy
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then(networkResponse => {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME_IMAGES).then(cache => cache.put(request, cloned));
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: just fetch
  event.respondWith(fetch(request));
});
