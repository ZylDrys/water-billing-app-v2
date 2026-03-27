var CACHE_NAME = 'water-billing-v1';
var urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
             .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Network-first for API calls, cache-first for assets
  if (event.request.url.indexOf('script.google.com') !== -1) {
    // API calls: network only, don't cache
    event.respondWith(fetch(event.request));
  } else {
    // Assets: try cache first, fallback to network
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request).then(function(fetchResponse) {
          return caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      }).catch(function() {
        // If both fail, return cached index
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
    );
  }
});
