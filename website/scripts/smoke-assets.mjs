/**
 * Smoke-check critical live assets on skitz-games.pages.dev.
 * Fails if any URL is missing, HTML, or not the expected media type.
 *
 * Usage:
 *   node scripts/smoke-assets.mjs
 *   node scripts/smoke-assets.mjs https://skitz-games.pages.dev
 */
const BASE = (process.argv[2] || "https://skitz-games.pages.dev").replace(/\/$/, "");

const CHECKS = [
  { path: "/images/skitz-mark.png", expect: "image/" },
  { path: "/favicon.svg", expect: "image/" },
  { path: "/games/oculum/b9/assets/cards/abyss_urn.jpg", expect: "image/" },
  { path: "/games/oculum/b9/sfx/summon.mp3", expect: "audio/" },
  { path: "/games/paper-riot/web/fx/match-bolts.png", expect: "image/" },
  { path: "/games/shiftr/web/icons/icon-192-v7.png", expect: "image/" },
  { path: "/games/pulsefold/web/assets/pulsefold-logo.png", expect: "image/" },
  { path: "/games/riot-cube/web/", expect: "text/html" },
];

async function checkOne({ path, expect }) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!res.ok) {
    return `FAIL ${res.status} ${url}`;
  }
  if (!ct.includes(expect)) {
    return `FAIL type "${ct}" (want ${expect}*) ${url}`;
  }
  if (expect.startsWith("image/") || expect.startsWith("audio/")) {
    if (ct.includes("text/html")) {
      return `FAIL HTML poison ${url}`;
    }
  }
  return `ok   ${res.status} ${ct.split(";")[0]} ${path}`;
}

const results = [];
for (const c of CHECKS) {
  try {
    results.push(await checkOne(c));
  } catch (e) {
    results.push(`FAIL ${c.path} :: ${e.message}`);
  }
}

for (const line of results) console.log(line);

const failed = results.filter((l) => l.startsWith("FAIL"));
if (failed.length) {
  console.error(`\n${failed.length} asset smoke check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${CHECKS.length} checks passed against ${BASE}`);
