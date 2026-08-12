const CACHE = "oculum-beta-v35";
self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of clients) {
      try {
        const u = new URL(c.url);
        u.searchParams.set("v", "35");
        await c.navigate(u.toString());
      } catch (_) {
        /* ignore */
      }
    }
  })());
});
self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request));
});
