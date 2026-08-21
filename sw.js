// Minimal service worker — required for the browser to treat this as an installable app.
// Data lives in Firebase (needs internet), so this does not attempt offline caching of app data.
const CACHE_NAME = 'kafe-app-shell-v4';
const SHELL_FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Network-first for OUR OWN app files only (HTML/CSS/JS/images/manifest) so users always get
// the latest version when online, with an offline fallback to cache. Firebase/Firestore's own
// network traffic (a different origin) must NEVER be touched here — caching or replaying a
// stale response for a live data channel could make real, current orders/records silently
// vanish from the screen even though nothing is actually wrong in the database. Only intercept
// requests to our own origin; let every cross-origin request (Firebase included) pass straight
// through untouched.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(()=>{});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
