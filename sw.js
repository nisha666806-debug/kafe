const CACHE_NAME = 'kafe-shell-2026-08-29-V46';
const APP_SHELL = ['./','./index.html','./manifest.json','./version.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const u=new URL(event.request.url);if(u.hostname.includes('googleapis.com')||u.hostname.includes('firebaseio.com')||u.hostname.includes('firebaseapp.com')||u.hostname.includes('firestore.googleapis.com'))return;event.respondWith(fetch(event.request).then(r=>{if(r&&r.ok)caches.open(CACHE_NAME).then(c=>c.put(event.request,r.clone())).catch(()=>{});return r;}).catch(()=>caches.match(event.request)));});
