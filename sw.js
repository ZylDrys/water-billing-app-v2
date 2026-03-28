var CACHE_NAME = 'water-billing-v6';
var urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/js/config.js',
  '/js/sync.js',
  '/js/auth.js',
  '/js/customers.js',
  '/js/billing.js',
  '/js/history.js',
  '/js/analysis.js',
  '/js/income.js',
  '/js/balance.js',
  '/js/customize.js',
  '/js/ui.js',
  '/js/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Install - cache all files
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Activate - clean old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', function (event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls (Google Apps Script)
  if (event.request.url.indexOf('script.google.com') !== -1) return;
  if (event.request.url.indexOf('timeapi.io') !== -1) return;
  if (event.request.url.indexOf('worldtimeapi.org') !== -1) return;
  if (event.request.url.indexOf('cloudflare.com') !== -1) return;

  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) return response;
      return fetch(event.request).then(function (networkResponse) {
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function () {
        // Offline fallback for HTML pages
        if (event.request.headers.get('accept').indexOf('text/html') !== -1) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
