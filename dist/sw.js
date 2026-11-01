/* Generated from vite.config.ts. Static assets only; never cache the public API. */
const CACHE="seedkeeper-shell-25aae4d0d4b0", FILES=["assets/index-B88wZ_HX.js","assets/index-S-FjYYAM.css","assets/silkscreen-latin-400-normal-CtPo2yA5.woff2","assets/silkscreen-latin-400-normal-D0DfPJut.woff","favicon.svg","index.html","licenses/silkscreen-OFL.txt","share.png"];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file, self.registration.scope).href))).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('seedkeeper-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url=new URL(event.request.url);
  if(event.request.method!=='GET' || url.origin!==self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if(event.request.mode==='navigate') { event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match(new URL('index.html', self.registration.scope).href)))); return; }
  if(FILES.some(file => new URL(file,self.registration.scope).href===url.href)) event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request).then(hit => hit || fetch(event.request))));
});
