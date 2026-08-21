// Minimal service worker — Firebase data is never cached or intercepted.
const CACHE_NAME = 'kafe-app-shell-v6';

const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .catch(() => {})
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then(names =>
        Promise.all(
          names
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Never intercept Firebase/Firestore or any other external service.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  // Our own app files: network first, cache fallback.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();

        caches
          .open(CACHE_NAME)
          .then(cache => cache.put(event.request, clone))
          .catch(() => {});

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
