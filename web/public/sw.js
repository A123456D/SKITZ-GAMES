/* Pulse Link — Android install / offline cache. */
const CACHE = "pulse-link-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(["./", "./index.html", "./manifest.webmanifest"]);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop every previous Pulse Link cache so installed apps cannot keep
      // stale music beds (cache-first used to pin old uneven cyber tracks).
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isShell =
    req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  // Music must never stick on an old decode — Android installs were still
  // hearing pre-normalize cyber beds while the browser (no SW) was fine.
  const isMusic = url.pathname.includes("/music/");
  const isScript =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith("sw.js");

  if (isShell || isMusic || isScript) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          if (fresh.ok && !isMusic) {
            // Cache shell/scripts for offline; skip caching music so updates
            // always land and we don't pin multi-MB beds forever.
            const cache = await caches.open(CACHE);
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          if (isShell) return caches.match("./index.html");
          return Response.error();
        }
      })(),
    );
    return;
  }

  // Images / other assets: cache-first.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});
