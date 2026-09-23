const CACHE_NAME = 'kafe-shell-2026-09-23-V72';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Firebase / Firestore ҳеҷ гоҳ cache намешавад
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('firestore.googleapis.com')
  ) {
    return;
  }

  // Ин файлҳо ҳамеша аз сервер санҷида мешаванд
  if (
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/version.json') ||
    url.pathname.endsWith('/sw.js')
  ) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store'
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Network First + Cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, copy);
            })
            .catch(() => {});
        }

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
