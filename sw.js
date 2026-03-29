var CACHE_NAME = 'water-billing-v7';
var urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './js/config.js',
  './js/sync.js',
  './js/auth.js',
  './js/customers.js',
  './js/billing.js',
  './js/history.js',
  './js/analysis.js',
  './js/income.js',
  './js/balance.js',
  './js/customize.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    }).then(function () {
      return self.skipWaiting();
    }).catch(function (err) {
      console.error('SW install failed:', err);
    })
  );
});

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

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = event.request.url;
  if (url.indexOf('script.google.com') !== -1) return;
  if (url.indexOf('timeapi.io') !== -1) return;
  if (url.indexOf('worldtimeapi.org') !== -1) return;
  if (url.indexOf('cloudflare.com') !== -1) return;
  if (url.indexOf('cdnjs.cloudflare.com') !== -1) return;

  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) return response;
      return fetch(event.request).then(function (networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function () {
        var accept = event.request.headers.get('accept') || '';
        if (accept.indexOf('text/html') !== -1) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
