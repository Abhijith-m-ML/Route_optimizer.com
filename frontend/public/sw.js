/**
 * Vazhikatti Service Worker
 * Progressive Web App offline caching & shell lifecycle manager
 */

const CACHE_VERSION = 'vazhikatti-v1.1.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Core Application Shell assets to precache on install
const PRECACHE_MANIFEST = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png'
];

// Domains & paths that must NEVER be cached (real-time data, auth, API, dynamic routing)
function isNonCacheable(url) {
  const pathname = url.pathname;
  const hostname = url.hostname;

  // 1. Backend REST API calls
  if (pathname.startsWith('/api/')) return true;

  // 2. Firebase / Google Identity Authentication
  if (
    hostname.includes('firebase') ||
    hostname.includes('identitytoolkit') ||
    hostname.includes('securetoken') ||
    hostname.includes('googleapis.com')
  ) {
    return true;
  }

  // 3. Dynamic Geoapify Geocoding, Autocomplete & Routing APIs
  if (
    hostname.includes('api.geoapify.com') &&
    (pathname.includes('/routing') || pathname.includes('/geocode'))
  ) {
    return true;
  }

  // 4. Render production backend endpoints
  if (hostname.includes('onrender.com')) return true;

  return false;
}

// -------------------------------------------------------------
// Service Worker Lifecycle: Install
// -------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Precache the essential shell. Non-fatal failure if individual file fails
      return cache.addAll(PRECACHE_MANIFEST).catch((err) => {
        console.warn('[Vazhikatti SW] Precache warning:', err);
      });
    })
  );
});

// -------------------------------------------------------------
// Service Worker Lifecycle: Activate (Cache Cleanup & Migration)
// -------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (
            key.startsWith('vazhikatti-') &&
            key !== STATIC_CACHE &&
            key !== ASSET_CACHE &&
            key !== IMAGE_CACHE
          ) {
            console.log('[Vazhikatti SW] Purging obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// -------------------------------------------------------------
// User-Triggered Update Handler (Skip Waiting)
// -------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// -------------------------------------------------------------
// Fetch Event: Intelligent Layered Caching Strategies
// -------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle standard HTTP/HTTPS GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore non-http protocols (e.g. chrome-extension://, blob:)
  if (!url.protocol.startsWith('http')) return;

  // Explicitly bypass caching for sensitive authenticated APIs, live GPS/routing & backends
  if (isNonCacheable(url) || request.headers.has('Authorization')) {
    return; // Let browser perform native network request
  }

  // Strategy A: HTML Navigation Requests (Network First, Cache Fallback for Offline App Shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline or network disconnect: return cached index.html shell
          const cachedApp = await caches.match('/index.html') || await caches.match('/');
          if (cachedApp) return cachedApp;
          return new Response(
            '<!DOCTYPE html><html><body style="background:#020617;color:#fff;font-family:sans-serif;text-align:center;padding:40px;"><h2>Vazhikatti is offline</h2><p>Please check your connection and reopen the app.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Strategy B: Hashed Immutable Assets (/assets/*, .js, .css) -> Cache First
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.mjs')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Strategy C: Static Images & Fonts -> Stale While Revalidate
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(IMAGE_CACHE).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Fall through to standard fetch
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request);
    })
  );
});
