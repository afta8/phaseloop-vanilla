// PWA UPDATE PROCESS
// ------------------
// This service worker uses an automated versioning system.
// A new version is generated on every build, so you do not need to manually increment the cache name.
// The 'activate' event will automatically clean up any old caches.

const CACHE_NAME = `phaseloop-cache-${__APP_VERSION__}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.js',
  'apple-touch-icon.png',
  'favicon-32x32.png',
  'favicon-16x16.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'favicon.ico'
];

// Install the service worker and pre-cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate the service worker and clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // If this cache name is not in our whitelist, delete it
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(event.request);
      })
  );
});
