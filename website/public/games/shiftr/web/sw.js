/* Pulse Link — offline cache (pulse-link-v20).
 * Network-first shell. Never cache text/html as an image/audio asset. */
const CACHE = "pulse-link-v20";
const SKIP_PATHS = ["/music/"];
const BINARY_EXTRA = [];
const PRECACHE = ["./","./index.html","./manifest.webmanifest"];

const ASSET_EXT =
  /\.(png|jpe?g|gif|webp|avif|svg|ico|mp3|ogg|wav|webm|mp4|m4a|woff2?|ttf|otf)$/i;

function shouldSkip(url) {
  return SKIP_PATHS.some((p) => url.pathname.includes(p));
}

function isBinaryAsset(url) {
  return ASSET_EXT.test(url.pathname) || BINARY_EXTRA.some((p) => url.pathname.includes(p));
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
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        await cache.addAll(PRECACHE);
      } catch (_) {
        /* shell may 404 in some mirrors — still activate */
      }
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (shouldSkip(url)) return;

  const isShell =
    req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  const isScript =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith("/sw.js");

  if (isShell || isScript) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (safeToCache(req, fresh)) {
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

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (safeToCache(req, fresh)) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        if (fresh.ok) return fresh;
      } catch {
        /* fall through to cache */
      }
      const cached = await caches.match(req);
      if (cached) {
        const ct = (cached.headers.get("content-type") || "").toLowerCase();
        if (isBinaryAsset(url) && ct.includes("text/html")) {
          return Response.error();
        }
        return cached;
      }
      return Response.error();
    })(),
  );
});
