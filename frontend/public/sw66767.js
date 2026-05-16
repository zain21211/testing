// ─── Ahmad International PWA Service Worker ───────────────────────────────
// Strategy:
//   Navigation (HTML)  → Network-first, fall back to cached /index.html
//   JS / CSS / fonts   → Cache-first (stale-while-revalidate in background)
//   Images             → Cache-first
//   API calls          → Network-only (never cache, offline handled in app)
// ──────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'v10';
const CACHE_SHELL   = `shell-${CACHE_VERSION}`;
const CACHE_ASSETS  = `assets-${CACHE_VERSION}`;
const CACHE_IMAGES  = `images-${CACHE_VERSION}`;

const ALL_CACHES = [CACHE_SHELL, CACHE_ASSETS, CACHE_IMAGES];

// Pages that must be pre-cached so the app shell works offline immediately
const PRECACHE_URLS = ['/', '/index.html'];

// ── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── ACTIVATE ───────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin or known CDN GET requests
  if (req.method !== 'GET') return;

  // ── API calls → network only, never cache ───────────────────────────────
  // Adjust this to match your API base URL
  if (url.pathname.startsWith('/api') || url.hostname !== self.location.hostname) {
    return; // browser handles it natively
  }

  // ── Navigation (loading app URL in browser) → Network-first ────────────
  // If network fails (e.g. Cloudflare 1033), serve the cached index.html
  // so the React SPA boots from cache instead of showing the error page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(response => {
          // If network is OK, cache it and return it
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_SHELL).then(cache => cache.put(req, clone));
            return response;
          }
          // If network returns an error (4xx/5xx/Cloudflare), fallback to cache
          return caches.match('/index.html').then(cached => cached || response);
        })
        .catch(() =>
          // Network completely failed (no internet) → serve cached index.html
          caches.match('/index.html').then(cached => {
            if (cached) return cached;
            return new Response(
              '<h2 style="font-family:sans-serif;text-align:center;margin-top:40px">📴 Offline – please reconnect.</h2>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          })
        )
    );
    return;
  }

  // ── JS / CSS / Fonts → Cache-first, update cache in background ─────────
  if (['script', 'style', 'font', 'worker'].includes(req.destination)) {
    event.respondWith(
      caches.open(CACHE_ASSETS).then(async cache => {
        const cached = await cache.match(req);
        // Fetch fresh version in background regardless
        const networkFetch = fetch(req).then(response => {
          if (response.ok) cache.put(req, response.clone());
          return response;
        }).catch(() => null);

        // Return cached immediately if available; else wait for network
        return cached || networkFetch;
      })
    );
    return;
  }

  // ── Images → Cache-first ────────────────────────────────────────────────
  if (req.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_IMAGES).then(async cache => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const response = await fetch(req);
        if (response.ok) cache.put(req, response.clone());
        return response;
      }).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // ── Everything else → network with cache fallback ───────────────────────
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
