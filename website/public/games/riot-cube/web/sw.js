const CACHE = "riot-cube-v55";

self.addEventListener("install", (event) => {
  // Activate immediately so clients pick up the new caching strategy.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("riot-cube-")).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function shouldNetworkFirst(req, url) {
  if (req.mode === "navigate") return true;
  const path = url.pathname;
  if (path.endsWith(".html") || path.endsWith("/")) return true;
  if (path.includes("/assets/")) return true;
  if (/\.(js|css|webmanifest)$/i.test(path)) return true;
  // Brand logo must refresh when we replace the art.
  if (/logo-riot-cube\.png$/i.test(path) || /riot-cube-logo\.png$/i.test(path)) return true;
  if (path.includes("/ui/")) return true;
  // Theme art changes often — never stick on stale plates/stickers.
  if (/\/themes\/[^/]+\/bg\.jpg$/i.test(path)) return true;
  if (/\/themes\/[^/]+\/btn\.jpg$/i.test(path)) return true;
  if (/\/themes\/[^/]+\/[^/]+\.png$/i.test(path)) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (shouldNetworkFirst(req, url)) {
    // Prefer fresh build files so deploys show up without hard-clearing cache.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || Response.error())),
    );
    return;
  }

  // Stickers / static art: cache-first is fine.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    }),
  );
});
