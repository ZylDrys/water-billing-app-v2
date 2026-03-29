var CACHE_NAME = 'water-billing-v7'; // Incremented version to force update

// All files to be cached by the Service Worker
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
      console.log('Service Worker: Caching files');
      return cache.addAll(urlsToCache);
    }).then(function () {
      // Force the waiting service worker to become the active service worker.
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
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function () {
      // Tell the active service worker to take control of the page immediately.
      return self.clients.claim();
    })
  );
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', function (event) {
  // Skip non-GET requests (e.g., POST to Google Apps Script)
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external API calls that should not be cached
  var externalApis = [
    'script.google.com',
    'timeapi.io',
    'worldtimeapi.org',
    'cloudflare.com'
  ];
  if (externalApis.some(api => event.request.url.includes(api))) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (response) {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Not in cache - go to network
      return fetch(event.request).then(function (networkResponse) {
        // Cache successful responses for future use
        if (networkResponse && networkResponse.status === 200) {
          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(function () {
        // Network failed - offline fallback for HTML pages
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
