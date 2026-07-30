/**
 * Crop sticker sheets → public/{obstacles,powerups,fx,particles}/*.png
 * Flood-fills dark/light sheet backgrounds, finds connected components, names by reading order.
 */
import sharp from "sharp";
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cursorAssets = join(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-PC-Projects-SHIFTR-paper-riot/assets",
);

function sheet(name) {
  const local = join(root, "assets", name);
  if (existsSync(local)) return local;
  // Fall back to Cursor upload folder long names
  return null;
}

const UPLOADS = {
  obstacles:
    "c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_2026-07-30_122100-9fbf8d8a-4d08-4701-b359-d3564c713316.png",
  powerups:
    "c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_2026-07-30_122108-b330fa7a-286d-4285-99ed-5dd0f542dc3f.png",
  matchFx:
    "c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_2026-07-30_122138-af455bdf-c3e6-41a0-bd28-2b1a863fd611.png",
  popSwap:
    "c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_2026-07-30_122144-12044ce8-838c-4d51-b182-838a6896b483.png",
  particles:
    "c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_2026-07-30_122158-c2022380-1bef-4928-9323-29f40d79e616.png",
};

function resolveSrc(key, shortName) {
  const short = join(root, "assets", shortName);
  if (existsSync(short)) return short;
  const long = join(cursorAssets, UPLOADS[key]);
  if (existsSync(long)) {
    mkdirSync(join(root, "assets"), { recursive: true });
    copyFileSync(long, short);
    return short;
  }
  throw new Error(`Missing sheet for ${key}`);
}

function isBg(r, g, b, a, mode) {
  if (a < 8) return true;
  if (mode === "dark") return r < 45 && g < 45 && b < 45;
  // light grey paper sheet
  const lum = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return lum > 175 && spread < 35;
}

async function cropSheet(srcPath, outDir, names, mode = "dark", opts = {}) {
  mkdirSync(outDir, { recursive: true });
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const buf = Buffer.from(data);
  const seen = new Uint8Array(w * h);

  const isBgAt = (x, y) => {
    const o = (y * w + x) * 4;
    return isBg(buf[o], buf[o + 1], buf[o + 2], buf[o + 3], mode);
  };

  // Flood-fill background from edges → alpha 0
  const qx = [];
  const qy = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const si = y * w + x;
    if (seen[si]) return;
    if (!isBgAt(x, y)) return;
    seen[si] = 1;
    buf[si * 4 + 3] = 0;
    qx.push(x);
    qy.push(y);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (qx.length) {
    const x = qx.shift();
    const y = qy.shift();
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  seen.fill(0);
  const components = [];
  const areaMin = Math.floor(w * h * (opts.areaMinFrac ?? 0.0025));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = y * w + x;
      if (seen[si]) continue;
      if (buf[si * 4 + 3] < 10) {
        seen[si] = 1;
        continue;
      }
      const pixels = [];
      const qq = [[x, y]];
      seen[si] = 1;
      let minX = x,
        minY = y,
        maxX = x,
        maxY = y,
        sumX = 0,
        sumY = 0;
      while (qq.length) {
        const [cx, cy] = qq.pop();
        pixels.push(cy * w + cx);
        sumX += cx;
        sumY += cy;
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const nsi = ny * w + nx;
          if (seen[nsi]) continue;
          if (buf[nsi * 4 + 3] < 10) {
            seen[nsi] = 1;
            continue;
          }
          seen[nsi] = 1;
          qq.push([nx, ny]);
        }
      }
      if (pixels.length >= areaMin) {
        components.push({
          area: pixels.length,
          minX,
          minY,
          maxX,
          maxY,
          cx: sumX / pixels.length,
          cy: sumY / pixels.length,
          pixels,
        });
      }
    }
  }

  // Drop title banners (very wide + short) and tiny crumbs
  const filtered = components.filter((c) => {
    const bw = c.maxX - c.minX + 1;
    const bh = c.maxY - c.minY + 1;
    if (bw / Math.max(1, bh) > 2.8 && bh < h * 0.22) return false;
    return true;
  });
  filtered.sort((a, b) => b.area - a.area);
  const keep = filtered.slice(0, names.length);

  // Reading order: row clusters then left→right
  const rowTol = Math.max(40, Math.floor(h * 0.08));
  keep.sort((a, b) => a.cy - b.cy);
  const rows = [];
  let cur = [];
  let rowY = null;
  for (const c of keep) {
    if (rowY == null || Math.abs(c.cy - rowY) <= rowTol) {
      cur.push(c);
      rowY = rowY == null ? c.cy : (rowY + c.cy) / 2;
    } else {
      rows.push(cur.sort((a, b) => a.cx - b.cx));
      cur = [c];
      rowY = c.cy;
    }
  }
  if (cur.length) rows.push(cur.sort((a, b) => a.cx - b.cx));
  const ordered = rows.flat();

  console.log(
    `${srcPath.split(/[/\\]/).pop()}: ${ordered.length}/${names.length} comps (${w}x${h})`,
  );

  const pad = opts.pad ?? 10;
  const target = opts.size ?? 256;

  for (let i = 0; i < Math.min(ordered.length, names.length); i++) {
    const c = ordered[i];
    const name = names[i];
    const tw = c.maxX - c.minX + 1 + pad * 2;
    const th = c.maxY - c.minY + 1 + pad * 2;
    const side = Math.max(tw, th);
    const out = Buffer.alloc(side * side * 4, 0);
    const ox = Math.floor((side - (c.maxX - c.minX + 1)) / 2);
    const oy = Math.floor((side - (c.maxY - c.minY + 1)) / 2);
    for (const psi of c.pixels) {
      const px = psi % w;
      const py = (psi / w) | 0;
      const lx = px - c.minX + ox;
      const ly = py - c.minY + oy;
      if (lx < 0 || ly < 0 || lx >= side || ly >= side) continue;
      const src = psi * 4;
      const dst = (ly * side + lx) * 4;
      out[dst] = buf[src];
      out[dst + 1] = buf[src + 1];
      out[dst + 2] = buf[src + 2];
      out[dst + 3] = buf[src + 3];
    }
    const dest = join(outDir, `${name}.png`);
    await sharp(out, { raw: { width: side, height: side, channels: 4 } })
      .resize(target, target, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(dest);
    console.log(`  OK ${name}`);
  }
}

async function main() {
  const obsSrc = resolveSrc("obstacles", "sheet-obstacles.png");
  const powSrc = resolveSrc("powerups", "sheet-powerups.png");
  const matchSrc = resolveSrc("matchFx", "sheet-match-fx.png");
  const popSrc = resolveSrc("popSwap", "sheet-pop-swap.png");
  const partSrc = resolveSrc("particles", "sheet-particles.png");

  await cropSheet(
    obsSrc,
    join(root, "public/obstacles"),
    ["tape-x", "tape-black", "box", "tar", "glue", "lock", "wet", "barbed"],
    "dark",
    { areaMinFrac: 0.004, size: 220 },
  );

  await cropSheet(
    powSrc,
    join(root, "public/powerups"),
    ["bomb", "plane", "magnet", "rocket", "stapler", "disco"],
    "dark",
    { areaMinFrac: 0.004, size: 220 },
  );

  // Match FX sheet is light — take largest burst clusters as named packs
  await cropSheet(
    matchSrc,
    join(root, "public/fx"),
    [
      "match-hearts",
      "match-skulls",
      "match-bolts-a",
      "match-bolts-b",
      "match-stars-a",
      "match-stars-b",
      "match-bomb",
    ],
    "light",
    { areaMinFrac: 0.008, size: 320 },
  );

  await cropSheet(
    popSrc,
    join(root, "public/fx"),
    ["pop-skull", "swap-star"],
    "dark",
    { areaMinFrac: 0.01, size: 280 },
  );

  await cropSheet(
    partSrc,
    join(root, "public/particles"),
    [
      "confetti-a",
      "confetti-b",
      "confetti-c",
      "confetti-d",
      "confetti-e",
      "confetti-f",
      "splat-a",
      "splat-b",
      "splat-c",
      "star-a",
      "star-b",
      "star-c",
      "bits",
      "puff-a",
      "puff-b",
      "puff-c",
      "puff-d",
      "puff-e",
    ],
    "dark",
    { areaMinFrac: 0.0012, size: 160 },
  );

  console.log("Done cropping Paper Riot sheets.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
