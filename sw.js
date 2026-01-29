
const CACHE_NAME = 'totem-assessment-v1.6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://esm.sh/react@19.0.0',
  'https://esm.sh/react-dom@19.0.0',
  'https://esm.sh/react-dom@19.0.0/client'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.map((name) => { if (name !== CACHE_NAME) return caches.delete(name); })
  )));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((res) => {
    const net = fetch(event.request).then((nres) => {
      if (nres && nres.status === 200) {
        const copy = nres.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return nres;
    }).catch(() => {});
    return res || net;
  }));
});
