import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const dest = join(root, "..", "website", "public", "games", "oculum", "web");
const siteImg = join(root, "..", "website", "public", "images", "oculum-seal.png");
const seal = join(root, "public", "assets", "ui", "seal-eye.png");

if (!existsSync(dist)) {
  console.error("Missing dist/ — run npm run build first");
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(dist, dest, { recursive: true });

if (existsSync(seal)) {
  mkdirSync(dirname(siteImg), { recursive: true });
  cpSync(seal, siteImg);
}

writeFileSync(
  join(dest, "sw.js"),
  `const CACHE = "oculum-beta-v7";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("./index.html"))),
  );
});
`,
);

console.log(`Copied ${dist} → ${dest}`);
