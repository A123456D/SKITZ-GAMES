const CACHE = "riot-cube-v56";

const ASSET_EXT =
  /\.(png|jpe?g|gif|webp|avif|svg|ico|mp3|ogg|wav|webm|mp4|m4a|woff2?|ttf|otf)$/i;

function isBinaryAsset(url) {
  return ASSET_EXT.test(url.pathname) || url.pathname.includes("/themes/");
}

function safeToCache(req, res) {
  if (!res || !res.ok) return false;
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("text/html")) return false;
  if (
    isBinaryAsset(new URL(req.url)) &&
    !ct.includes("image") &&
    !ct.includes("audio") &&
    !ct.includes("font") &&
    !ct.includes("octet-stream")
  ) {
    return false;
  }
  return true;
}

self.addEventListener("install", (event) => {
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
  if (/logo-riot-cube\.png$/i.test(path) || /riot-cube-logo\.png$/i.test(path)) return true;
  if (path.includes("/ui/")) return true;
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
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (safeToCache(req, res)) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => {
            if (!cached) return Response.error();
            const ct = (cached.headers.get("content-type") || "").toLowerCase();
            if (isBinaryAsset(url) && ct.includes("text/html")) return Response.error();
            return cached;
          }),
        ),
    );
    return;
  }

  // Stickers / static art: network-first with type check (avoid HTML poison).
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (safeToCache(req, fresh)) {
          const copy = fresh.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        if (fresh.ok) return fresh;
      } catch {
        /* fall through */
      }
      const cached = await caches.match(req);
      if (!cached) return Response.error();
      const ct = (cached.headers.get("content-type") || "").toLowerCase();
      if (isBinaryAsset(url) && ct.includes("text/html")) return Response.error();
      return cached;
    })(),
  );
});
