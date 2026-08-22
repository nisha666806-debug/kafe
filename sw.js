// Service Worker for Oshi Forom
// v7
// Firebase / Firestore data is NEVER cached or intercepted.

const CACHE_NAME = 'kafe-app-shell-v7';

const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => {})
  );

  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => {
        return Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (event) => {

  // Only GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // VERY IMPORTANT:
  // Never intercept Firebase, Firestore or any external service.
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // Our own application files:
  // Network first -> cache fallback.
  event.respondWith(
    fetch(event.request)
      .then((response) => {

        // Save a copy of the latest application file.
        const responseClone = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseClone);
          })
          .catch(() => {});

        return response;
      })
      .catch(() => {
        // If there is no internet, use cached application shell.
        return caches.match(event.request);
      })
  );
});
