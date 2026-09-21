const CACHE_NAME = 'kafe-shell-2026-09-22-V69';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './icon-192.png',
  './icon-512.png'
];

/* =========================
   INSTALL
========================= */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* =========================
   ACTIVATE
========================= */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

/* =========================
   FETCH
========================= */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  /*
   * Firebase / Firestore:
   * ҲЕҶ ГОҲ cache карда нашавад.
   */
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    return;
  }

  /*
   * Файлҳои версия ва асосии барнома:
   * ҳамеша аз сервер гирифта мешаванд.
   * Ин барои пешгирӣ кардани update loop ва
   * version-и кӯҳна муҳим аст.
   */
  if (
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/version.json') ||
    url.pathname.endsWith('/sw.js')
  ) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store'
      }).catch(() => {
        return caches.match(event.request);
      })
    );

    return;
  }

  /*
   * Дигар файлҳои static:
   * аввал Network, агар интернет набошад Cache.
   */
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
