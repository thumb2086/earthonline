const CACHE = 'earthonline-v3';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const manifest = self.__WB_MANIFEST;
      if (manifest) {
        for (const entry of manifest) {
          if (entry.url) await cache.add(entry.url).catch(() => {});
        }
      }
    })()
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    (async () => {
      const cached = await caches.match(e.request);
      try {
        const res = await fetch(e.request);
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      } catch {
        return cached || new Response('Offline', { status: 503 });
      }
    })()
  );
});
