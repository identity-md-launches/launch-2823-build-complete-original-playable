import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
export default defineConfig({ base: './', plugins: [react(), {
  name: 'seedkeeper-offline-shell',
  async closeBundle() {
    const files: string[] = [];
    async function walk(dir: string) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) await walk(path);
        else if (entry.name !== 'sw.js') files.push(path.replace(/^dist\//, ''));
      }
    }
    await walk('dist'); files.sort();
    const digest = createHash('sha256');
    for (const file of files) digest.update(await readFile(join('dist', file)));
    const cache = `seedkeeper-shell-${digest.digest('hex').slice(0, 12)}`;
    await writeFile('dist/sw.js', `/* Generated from vite.config.ts. Static assets only; never cache the public API. */
const CACHE=${JSON.stringify(cache)}, FILES=${JSON.stringify(files)};
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file, self.registration.scope).href))).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('seedkeeper-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url=new URL(event.request.url);
  if(event.request.method!=='GET' || url.origin!==self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if(event.request.mode==='navigate') { event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match(new URL('index.html', self.registration.scope).href)))); return; }
  if(FILES.some(file => new URL(file,self.registration.scope).href===url.href)) event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request).then(hit => hit || fetch(event.request))));
});
`);
  }
}], build: { target: 'es2022', sourcemap: false } });
