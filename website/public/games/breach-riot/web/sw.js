/* Breach Riot — install shell only; never cache HTML as binary assets. */
const CACHE = "breach-riot-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

const ASSET_EXT =
  /\.(png|jpe?g|gif|webp|avif|svg|ico|mp3|ogg|wav|webm|mp4|m4a|woff2?|ttf|otf)$/i;

function isBinaryAsset(url) {
  return ASSET_EXT.test(url.pathname) || url.pathname.includes("/assets/");
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
    !ct.includes("octet-stream") &&
    !ct.includes("javascript") &&
    !ct.includes("css")
  ) {
    // Allow caching shell HTML only for navigate/html requests handled below.
    return false;
  }
  return true;
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isShell =
    req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");

  e.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (isShell && res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        } else if (safeToCache(req, res)) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const hit = await caches.match(req);
        if (hit) {
          const ct = (hit.headers.get("content-type") || "").toLowerCase();
          if (isBinaryAsset(url) && ct.includes("text/html")) return Response.error();
          return hit;
        }
        if (isShell) return caches.match("./index.html");
        return Response.error();
      }
    })(),
  );
});
