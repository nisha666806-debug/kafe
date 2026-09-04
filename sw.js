const CACHE_NAME = 'kafe-shell-2026-09-03-V55-REALTIME-RESUME-SAFE';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './icon-192.png',
  './icon-512.png'
];

/* ================================
   INSTALL
================================ */

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});


/* ================================
   ACTIVATE
================================ */

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


/* ================================
   FETCH
================================ */

self.addEventListener('fetch', event => {

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);


  /* --------------------------------
     FIREBASE / FIRESTORE
     NEVER CACHE
  -------------------------------- */

  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('firestore.googleapis.com')
  ) {
    return;
  }


  /* --------------------------------
     APP FILES
     NETWORK FIRST
  -------------------------------- */

  event.respondWith(

    fetch(event.request)

      .then(response => {

        // Save only successful normal web responses
        if (response && response.ok) {

          const responseCopy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              return cache.put(event.request, responseCopy);
            })
            .catch(() => {});
        }

        return response;
      })

      .catch(() => {

        // If internet is unavailable,
        // use cached application shell
        return caches.match(event.request);

      })

  );
});
