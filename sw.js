const CACHE_NAME = 'kafe-shell-2026-09-05-V58-UPDATE-FIX';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

function isFirebaseRequest(request) {
  try {
    const url = new URL(request.url);

    return (
      url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('firebaseapp.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase.google.com')
    );
  } catch (e) {
    return false;
  }
}

function isVersionRequest(request) {
  try {
    const url = new URL(request.url);
    return url.pathname.endsWith('/version.json');
  } catch (e) {
    return false;
  }
}


/* =========================
   INSTALL
========================= */

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error('SW install failed:', error);
      })
  );
});


/* =========================
   ACTIVATE
========================= */

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
      .catch(error => {
        console.error('SW activate failed:', error);
      })
  );
});


/* =========================
   FETCH
========================= */

self.addEventListener('fetch', event => {
  const request = event.request;

  // Танҳо GET
  if (request.method !== 'GET') {
    return;
  }

  // Firebase / Firestore ҳеҷ вақт cache нашавад
  if (isFirebaseRequest(request)) {
    return;
  }

  // version.json ҳамеша аз сервер гирифта шавад
  if (isVersionRequest(request)) {
    event.respondWith(
      fetch(request, {
        cache: 'no-store'
      }).catch(() => {
        return new Response(
          JSON.stringify({
            version: ''
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      })
    );

    return;
  }


  /*
   * NETWORK FIRST
   *
   * Аввал сервер.
   * Агар интернет набошад → cache.
   */

  event.respondWith(
    fetch(request)
      .then(response => {

        if (
          !response ||
          response.status !== 200 ||
          response.type === 'opaque'
        ) {
          return response;
        }

        const responseCopy = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => {
            return cache.put(request, responseCopy);
          })
          .catch(() => {});

        return response;
      })

      .catch(() => {
        return caches.match(request)
          .then(cachedResponse => {

            if (cachedResponse) {
              return cachedResponse;
            }

            // Агар файл дар cache набошад,
            // index.html ҳамчун fallback
            return caches.match('./index.html');
          });
      })
  );
});


/* =========================
   MESSAGE
========================= */

self.addEventListener('message', event => {

  if (!event.data) {
    return;
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

});
