/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { manifest, version } from '@parcel/service-worker';

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(version).then(cache => cache.addAll(manifest))
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
    caches.match(ev.request).then(res => res || fetch(ev.request))
  )
});