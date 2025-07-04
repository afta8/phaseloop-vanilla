// PWA UPDATE PROCESS
// ------------------
// 1. To trigger a PWA update, you MUST change this file.
// 2. The simplest and best way is to increment the version number in the CACHE_NAME variable below.
//    e.g., 'phaseloop-cache-v1' becomes 'phaseloop-cache-v2'.
// 3. This change will trigger the 'install' event, caching all the new files.
// 4. The 'activate' event will then automatically clean up any old caches that don't match the new CACHE_NAME.

const CACHE_NAME = 'phaseloop-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.js',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Install the service worker and cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
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