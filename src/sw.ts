/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { manifest, version } from '@parcel/service-worker';

const doCache = (path: string) =>
  !path.startsWith('/api') &&
  !path.endsWith('.onnx');

const doInitCache = (path: string) => 
  doCache(path) &&
  !path.endsWith('.wasm');

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(version).then(cache => cache.addAll(manifest.filter(doInitCache)))
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== version).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', ev => {
  ev.respondWith(
    caches.match(ev.request).then(res => res || fetch(ev.request).then(async res => {
      const url = new URL(ev.request.url);
      if (doCache(url.pathname)) {
        const cache = await caches.open(version);
        await cache.put(ev.request, res.clone());
      }
      return res;
    }))
  );
});