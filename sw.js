const CACHE_NAME = 'kafe-shell-2026-09-04-V57-UPDATE-REALTIME-FIX';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './icon-192.png',
  './icon-512.png'
];

/*
  IMPORTANT:
  Firebase / Firestore traffic is NEVER cached.
  version.json is also bypassed so the update checker can always
  receive the latest version from the server.
*/

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
      .then(cache => {
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker install failed:', error);
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
      .then(() => {
        return self.clients.claim();
      })
      .catch(error => {
        console.error('Service Worker activate failed:', error);
      })
  );
});


/* =========================
   FETCH
========================= */

self.addEventListener('fetch', event => {
  const request = event.request;

  /*
    Only handle GET requests.
    POST/PUT/PATCH/DELETE requests must go directly to the network.
  */
  if (request.method !== 'GET') {
    return;
  }

  /*
    Never cache Firebase / Firestore requests.
  */
  if (isFirebaseRequest(request)) {
    return;
  }

  /*
    version.json must ALWAYS come from the network.
    This is important for detecting new app versions.
  */
  if (isVersionRequest(request)) {
    event.respondWith(
      fetch(request, {
        cache: 'no-store'
      })
    );
    return;
  }

  /*
    Network-first strategy:
    1. Try network.
    2. If network fails, use cache.
    3. Save successful app-file responses into cache.
  */
  event.respondWith(
    fetch(request)
      .then(response => {

        /*
          Do not cache invalid responses.
        */
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'opaque'
        ) {
          return response;
        }

        /*
          Clone response because one copy is returned to browser
          and another copy is stored in cache.
        */
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(request, responseToCache).catch(() => {});
          })
          .catch(() => {});

        return response;
      })
      .catch(() => {
        /*
          Offline fallback.
        */
        return caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }

            /*
              If requested page is not cached, try index.html.
            */
            return caches.match('./index.html');
          });
      })
  );
});


/* =========================
   MESSAGE
========================= */

self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
