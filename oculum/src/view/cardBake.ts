import { CARDS, getCard, heresyColor } from "../core/cards";
import { heresyShort } from "../core/heresies";
import type { CardDef } from "../core/types";

const cache = new Map<string, HTMLCanvasElement>();
const fullCardImgs = new Map<string, HTMLImageElement>();

let frameImg: HTMLImageElement | null = null;
let veilImg: HTMLImageElement | null = null;
let assetsReady: Promise<void> | null = null;

/** Every card id — preload tries JPG/PNG; missing faces use procedural until regenerated. */
export const FULL_CARD_IDS = CARDS.map((c) => c.id);

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed ${src}`));
    img.src = src;
  });
}

async function tryLoad(src: string): Promise<HTMLImageElement | null> {
  try {
    return await loadImg(src);
  } catch {
    return null;
  }
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number): void {
  const ir = img.naturalWidth / img.naturalHeight;
  const tr = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (ir > tr) {
    dh = h;
    dw = h * ir;
    dx = (w - dw) / 2;
  } else {
    dw = w;
    dh = w / ir;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Preload painted frames + any finished full card faces. */
export function preloadCardChrome(): Promise<void> {
  if (!assetsReady) {
    assetsReady = (async () => {
      frameImg = await tryLoad("./assets/ui/card-frame.png");
      veilImg = await tryLoad("./assets/ui/card-veil.png");
      await Promise.all(
        FULL_CARD_IDS.map(async (id) => {
          const img =
            (await tryLoad(`./assets/cards/${id}.jpg?v=32`)) ??
            (await tryLoad(`./assets/cards/${id}.png?v=32`));
          if (img) fullCardImgs.set(id, img);
        }),
      );
    })();
  }
  return assetsReady;
}

export function hasFullCardArt(cardId: string): boolean {
  return fullCardImgs.has(cardId);
}

/** URL for shared OCULUM card back (deck piles / draw flips). */
export function cardBackSrc(): string {
  return `./assets/cards/card-back.jpg?v=1`;
}

/** URL for DOM hand display — always prefer shipped JPG (preload fills GPU map). */
export function handCardSrc(cardId: string): string {
  // Stable filenames need a bust when faces regenerate or a bad HTML 200 was
  // cached under /assets/* immutable headers (SPA fallback on missing files).
  return `./assets/cards/${cardId}.jpg?v=32`;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgba(r: number, g: number, b: number, a = 1): string {
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
}

/**
 * Distinct interim face until full-face JPG ships.
 * Heresy palette + artSubject keywords + id seed → unique silhouette/scene.
 */
function paintProceduralFace(
  ctx: CanvasRenderingContext2D,
  def: CardDef,
  w: number,
  h: number,
): void {
  const [hr, hg, hb] = heresyColor(def.heresy);
  const rng = mulberry(hashStr(def.id + "|" + def.artSubject));
  const sub = def.artSubject.toLowerCase();
  const x0 = 26;
  const y0 = 46;
  const aw = w - 52;
  const ah = h - 156;

  const art = document.createElement("canvas");
  art.width = w;
  art.height = h;
  const a = art.getContext("2d")!;

  a.save();
  a.beginPath();
  a.rect(x0, y0, aw, ah);
  a.clip();

  const sky = a.createLinearGradient(0, y0, 0, y0 + ah * 0.72);
  if (sub.includes("void") || def.heresy === "hollow") {
    sky.addColorStop(0, "#c9b45a");
    sky.addColorStop(1, "#5a4820");
  } else if (sub.includes("jungle") || def.heresy === "deep") {
    sky.addColorStop(0, "#3a7a9a");
    sky.addColorStop(1, "#1a3a48");
  } else if (sub.includes("canyon") || sub.includes("dusk")) {
    sky.addColorStop(0, "#c46a3a");
    sky.addColorStop(0.55, "#6a2a5a");
    sky.addColorStop(1, "#2a1838");
  } else if (
    sub.includes("bellward") ||
    sub.includes("parasol") ||
    sub.includes("kasa") ||
    def.heresy === "toll"
  ) {
    sky.addColorStop(0, "#7ec8e8");
    sky.addColorStop(0.45, "#c45a48");
    sky.addColorStop(1, "#2a1818");
  } else if (sub.includes("coast") || def.heresy === "ring") {
    sky.addColorStop(0, "#5ec8e8");
    sky.addColorStop(1, "#2f6fb5");
  } else if (def.heresy === "graft") {
    sky.addColorStop(0, "#8ec8a0");
    sky.addColorStop(1, "#2a5a40");
  } else if (def.heresy === "coral") {
    sky.addColorStop(0, "#e8c090");
    sky.addColorStop(1, "#8a4030");
  } else if (def.heresy === "many") {
    sky.addColorStop(0, "#7aa0b8");
    sky.addColorStop(1, "#2a3848");
  } else {
    sky.addColorStop(0, "#e8d9a8");
    sky.addColorStop(1, "#8b5a3c");
  }
  a.fillStyle = sky;
  a.fillRect(x0, y0, aw, ah);

  const groundY = y0 + ah * (0.58 + rng() * 0.08);
  const ground = a.createLinearGradient(0, groundY, 0, y0 + ah);
  ground.addColorStop(0, rgba(hr * 0.85, hg * 0.75, hb * 0.65, 0.95));
  ground.addColorStop(1, "#1a1210");
  a.fillStyle = ground;
  a.fillRect(x0, groundY, aw, y0 + ah - groundY);

  if (sub.includes("stake") || sub.includes("banner") || sub.includes("mast")) {
    for (let i = 0; i < 5; i++) {
      const sx = x0 + aw * (0.12 + i * 0.18 + rng() * 0.03);
      const sh = ah * (0.22 + rng() * 0.18);
      a.fillStyle = "#2a2018";
      a.fillRect(sx, groundY - sh, 4 + rng() * 3, sh);
      a.fillStyle = rgba(0.85, 0.2, 0.18, 0.8);
      a.fillRect(sx - 2, groundY - sh, 14, 8);
    }
  }
  if (sub.includes("pillar") || sub.includes("arch") || sub.includes("windmill")) {
    for (let i = 0; i < 3; i++) {
      const px = x0 + aw * (0.18 + i * 0.28);
      const ph = ah * (0.32 + rng() * 0.18);
      a.fillStyle = rgba(0.75, 0.7, 0.6, 0.75);
      a.fillRect(px, groundY - ph, 16 + rng() * 10, ph);
    }
  }
  if (sub.includes("waterfall") || sub.includes("jungle")) {
    a.fillStyle = "rgba(90,200,220,0.4)";
    a.fillRect(x0 + aw * 0.55, y0 + 16, aw * 0.16, groundY - y0 - 8);
  }
  if (sub.includes("parasol")) {
    a.fillStyle = "#b42318";
    a.beginPath();
    a.ellipse(x0 + aw * 0.72, groundY - ah * 0.34, 32, 13, 0, 0, Math.PI * 2);
    a.fill();
    a.strokeStyle = "#2a1810";
    a.lineWidth = 3;
    a.beginPath();
    a.moveTo(x0 + aw * 0.72, groundY - ah * 0.34);
    a.lineTo(x0 + aw * 0.72, groundY);
    a.stroke();
  }

  const cx = x0 + aw * (0.36 + rng() * 0.18);
  const baseY = groundY + 2;

  if (def.type === "figure" || def.type === "vessel") {
    a.fillStyle = "#0c0a0f";
    a.beginPath();
    a.moveTo(cx - 28, baseY);
    a.lineTo(cx - 20, baseY - ah * 0.28);
    a.quadraticCurveTo(cx, baseY - ah * 0.4, cx + 20, baseY - ah * 0.28);
    a.lineTo(cx + 28, baseY);
    a.closePath();
    a.fill();
    a.fillStyle = "#e8dfd0";
    a.beginPath();
    a.ellipse(cx, baseY - ah * 0.4, 17, 19, 0, 0, Math.PI * 2);
    a.fill();
    a.fillStyle = "#0c0a0f";
    const holes = def.heresy === "hollow" ? 5 : 4;
    for (let i = 0; i < holes; i++) {
      const ang = (i / holes) * Math.PI * 2 - Math.PI / 2;
      a.beginPath();
      a.arc(cx + Math.cos(ang) * 7, baseY - ah * 0.4 + Math.sin(ang) * 7, 2.3, 0, Math.PI * 2);
      a.fill();
    }
    a.fillStyle = rgba(hr, hg, hb, 0.95);
    a.fillRect(cx - 18, baseY - ah * 0.22, 36, 7);
    if (def.type === "vessel") {
      a.fillStyle = rgba(0.85, 0.75, 0.45, 0.9);
      a.beginPath();
      a.ellipse(cx, baseY - ah * 0.12, 24, 14, 0, 0, Math.PI * 2);
      a.fill();
    }
  } else if (def.type === "site") {
    a.fillStyle = rgba(0.72, 0.64, 0.52, 0.95);
    a.fillRect(cx - 38, baseY - ah * 0.36, 76, ah * 0.36);
    a.fillStyle = rgba(hr, hg, hb, 0.85);
    a.fillRect(cx - 26, baseY - ah * 0.46, 52, 12);
    a.fillStyle = "#3ecfc0";
    a.beginPath();
    a.ellipse(cx, baseY - ah * 0.2, 13, 7, 0, 0, Math.PI * 2);
    a.fill();
    a.fillStyle = "#0c0a0f";
    a.beginPath();
    a.arc(cx, baseY - ah * 0.2, 3.5, 0, Math.PI * 2);
    a.fill();
  } else if (def.type === "relic") {
    a.fillStyle = rgba(0.85, 0.7, 0.35, 0.95);
    a.beginPath();
    a.arc(cx, baseY - ah * 0.26, 34, 0, Math.PI * 2);
    a.fill();
    a.fillStyle = "#0c0a0f";
    a.beginPath();
    a.ellipse(cx, baseY - ah * 0.26, 15, 8, 0, 0, Math.PI * 2);
    a.fill();
    a.fillStyle = "#3ecfc0";
    a.beginPath();
    a.arc(cx, baseY - ah * 0.26, 4.5, 0, Math.PI * 2);
    a.fill();
  } else if (def.type === "rite") {
    a.strokeStyle = "#c9a227";
    a.lineWidth = 5;
    a.beginPath();
    a.moveTo(cx, baseY);
    a.lineTo(cx, baseY - ah * 0.44);
    a.stroke();
    a.fillStyle = rgba(hr, hg, hb, 0.92);
    a.beginPath();
    a.arc(cx, baseY - ah * 0.48, 20, 0, Math.PI * 2);
    a.fill();
    a.fillStyle = "#ede4d4";
    a.beginPath();
    a.ellipse(cx, baseY - ah * 0.48, 9, 5, 0, 0, Math.PI * 2);
    a.fill();
  } else {
    a.fillStyle = rgba(hr, hg, hb, 0.88);
    a.fillRect(cx - 34, baseY - ah * 0.38, 68, ah * 0.3);
    a.fillStyle = "#ede4d4";
    a.beginPath();
    a.ellipse(cx, baseY - ah * 0.22, 16, 9, 0, 0, Math.PI * 2);
    a.fill();
  }

  for (let i = 0; i < 3; i++) {
    const ox = x0 + aw * (0.12 + rng() * 0.7);
    const oy = y0 + ah * (0.1 + rng() * 0.3);
    a.fillStyle = rgba(0.92, 0.88, 0.78, 0.55 + rng() * 0.25);
    a.fillRect(ox, oy, 7, 15);
  }
  a.restore();

  ctx.fillStyle = "#120e18";
  ctx.fillRect(0, 0, w, h);
  if (frameImg?.complete && frameImg.naturalWidth > 0) {
    drawCover(ctx, frameImg, w, h);
  }
  // Stamp scene over parchment watermark window
  ctx.drawImage(art, 0, 0);

  ctx.fillStyle = "rgba(14,10,18,0.9)";
  ctx.fillRect(16, h - 108, w - 32, 92);
  ctx.fillStyle = "#ede4d4";
  ctx.textAlign = "center";
  ctx.font = "700 18px Cinzel, serif";
  const name = def.name.length > 18 ? `${def.name.slice(0, 17)}…` : def.name;
  ctx.fillText(name, w / 2, h - 72);
  ctx.font = "600 12px 'Barlow Condensed', sans-serif";
  ctx.fillStyle = "#c49a6c";
  ctx.fillText(`${heresyShort(def.heresy).toUpperCase()} · ${def.type.toUpperCase()}`, w / 2, h - 50);
  ctx.fillStyle = "#3ecfc0";
  ctx.fillText(`${def.essence}E${def.witnessCost ? ` · ${def.witnessCost}S` : ""}`, w / 2, h - 30);

  ctx.fillStyle = "#d4af37";
  ctx.beginPath();
  ctx.arc(36, 36, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0e0a12";
  ctx.font = "700 17px 'Barlow Condensed', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(def.essence), 36, 42);

  if (def.witnessCost > 0) {
    ctx.fillStyle = "#3ecfc0";
    ctx.beginPath();
    ctx.arc(w - 36, 36, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0e0a12";
    ctx.font = "700 14px 'Barlow Condensed', sans-serif";
    ctx.fillText(String(def.witnessCost), w - 36, 41);
  }
}

/**
 * Board/GPU face. Veiled = light mist only (card stays readable).
 */
export function bakeCardFace(cardId: string, veiled: boolean): HTMLCanvasElement {
  const key = `${cardId}:${veiled ? "v" : "w"}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const w = 300;
  const h = 450; // 2:3 — matches shipped full-face art
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const full = fullCardImgs.get(cardId);

  if (full?.complete && full.naturalWidth > 0) {
    drawCover(ctx, full, w, h);
    if (veiled) {
      // Soft half-real mist — no cyan stroke bars (those flash on the GL board)
      if (veilImg?.complete && veilImg.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        drawCover(ctx, veilImg, w, h);
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(18, 14, 24, 0.32)";
        ctx.fillRect(0, 0, w, h);
        const g = ctx.createLinearGradient(0, 0, 0, h * 0.35);
        g.addColorStop(0, "rgba(237, 228, 212, 0.12)");
        g.addColorStop(1, "rgba(237, 228, 212, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h * 0.35);
      }
      ctx.fillStyle = "rgba(14, 10, 18, 0.58)";
      ctx.fillRect(w * 0.22, 10, w * 0.56, 20);
      ctx.fillStyle = "rgba(237, 228, 212, 0.88)";
      ctx.font = "700 13px 'Barlow Condensed', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VEILED", w / 2, 25);
    }
    cache.set(key, c);
    return c;
  }

  // No full-face JPG yet — procedural interim (Heresy Seals etc.)
  const def = getCard(cardId);
  paintProceduralFace(ctx, def, w, h);

  if (veiled) {
    ctx.fillStyle = "rgba(140, 180, 210, 0.22)";
    ctx.fillRect(0, 0, w, h);
  }

  cache.set(key, c);
  return c;
}

export function getCachedCardFace(cardId: string, veiled: boolean): HTMLCanvasElement | null {
  return cache.get(`${cardId}:${veiled ? "v" : "w"}`) ?? null;
}

export function clearCardFaceCache(): void {
  cache.clear();
  tokenCache.clear();
  powerChipCache.clear();
  witnessChipCache.clear();
}

const tokenCache = new Map<string, HTMLCanvasElement>();
const powerChipCache = new Map<string, HTMLCanvasElement>();
const witnessChipCache = new Map<string, HTMLCanvasElement>();

function typeAccent(type: CardDef["type"]): { rim: string; badge: string; label: string } {
  switch (type) {
    case "site":
      return { rim: "#d4af37", badge: "#3ecfc0", label: "SITE" };
    case "sigil":
      return { rim: "#e6c98a", badge: "#d4af37", label: "SIGIL" };
    case "relic":
      return { rim: "#c49a6c", badge: "#b07cff", label: "RELIC" };
    default:
      return { rim: "#d4af37", badge: "#3ecfc0", label: type.toUpperCase() };
  }
}

/**
 * Circular lane seal for Sites / Sigils / Relics — not a shrunken card face.
 */
export function bakeLaneToken(cardId: string): HTMLCanvasElement {
  const hit = tokenCache.get(cardId);
  if (hit) return hit;

  const size = 160;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const def = getCard(cardId);
  const [sr, sg, sb] = heresyColor(def.heresy);
  const accent = typeAccent(def.type);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;

  ctx.clearRect(0, 0, size, size);

  // Drop shadow
  ctx.beginPath();
  ctx.arc(cx + 2, cy + 3, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();

  // Outer plate
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const plate = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  plate.addColorStop(0, "#2a221c");
  plate.addColorStop(0.55, "#141018");
  plate.addColorStop(1, "#0a080e");
  ctx.fillStyle = plate;
  ctx.fill();

  // Heresy wash
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${Math.floor(sr * 255)}, ${Math.floor(sg * 255)}, ${Math.floor(sb * 255)}, 0.28)`;
  ctx.fill();

  // Art disc (crop card center / upper art)
  const full = fullCardImgs.get(cardId);
  const artR = r * 0.72;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.02, artR, 0, Math.PI * 2);
  ctx.clip();
  if (full?.complete && full.naturalWidth > 0) {
    const iw = full.naturalWidth;
    const ih = full.naturalHeight;
    // Prefer upper-mid art region of the 2:3 card
    const srcW = iw * 0.72;
    const srcH = srcW;
    const sx = (iw - srcW) / 2;
    const sy = ih * 0.12;
    ctx.drawImage(full, sx, sy, srcW, srcH, cx - artR, cy - artR - size * 0.02, artR * 2, artR * 2);
    ctx.fillStyle = "rgba(10,8,14,0.18)";
    ctx.fillRect(cx - artR, cy - artR - size * 0.02, artR * 2, artR * 2);
  } else {
    ctx.fillStyle = `rgb(${Math.floor(sr * 200)}, ${Math.floor(sg * 200)}, ${Math.floor(sb * 200)})`;
    ctx.fillRect(cx - artR, cy - artR, artR * 2, artR * 2);
  }
  ctx.restore();

  // Inner gold ring
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.02, artR + 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(212,175,55,0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Outer rim
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
  ctx.strokeStyle = accent.rim;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(237,228,212,0.22)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Type badge ribbon
  const bw = size * 0.62;
  const bh = size * 0.16;
  const bx = cx - bw / 2;
  const by = size * 0.72;
  ctx.fillStyle = "rgba(10,8,14,0.88)";
  ctx.strokeStyle = accent.badge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, bw, bh, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent.badge;
  ctx.font = "700 13px 'Barlow Condensed', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(accent.label, cx, by + bh / 2 + 0.5);

  // Gaze eye pip for Gaze landmarks
  if (cardId === "ring_gaze" || cardId === "parasol_path" || def.text.toLowerCase().includes("gaze")) {
    ctx.beginPath();
    ctx.ellipse(cx, cy - size * 0.06, size * 0.1, size * 0.06, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(62,207,192,0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.06, size * 0.028, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(62,207,192,0.95)";
    ctx.fill();
  }

  tokenCache.set(cardId, c);
  return c;
}

export type PowerChipMood = "veil" | "wit" | "up" | "down";

/**
 * Live Resolve power seal for the board — wax medallion, not a UI pill.
 * Moods: veil (cool), wit (warm gold), up (buff), down (nerf).
 */
export function bakePowerChip(power: number, mood: PowerChipMood): HTMLCanvasElement {
  const key = `${power}:${mood}`;
  const hit = powerChipCache.get(key);
  if (hit) return hit;

  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  const pal =
    mood === "veil"
      ? {
          rim: "#7ec9c0",
          rimSoft: "rgba(126,201,192,0.55)",
          core0: "#3a4852",
          core1: "#161820",
          core2: "#0a0c10",
          num: "#ede4d4",
          glow: "rgba(62,207,192,0.35)",
          tick: "rgba(237,228,212,0.35)",
        }
      : mood === "wit"
        ? {
            rim: "#d4af37",
            rimSoft: "rgba(212,175,55,0.55)",
            core0: "#4a3824",
            core1: "#1c1410",
            core2: "#0c0908",
            num: "#f0d78a",
            glow: "rgba(212,175,55,0.4)",
            tick: "rgba(240,215,138,0.4)",
          }
        : mood === "up"
          ? {
              rim: "#f0d78a",
              rimSoft: "rgba(240,215,138,0.7)",
              core0: "#6a4820",
              core1: "#2a1a0c",
              core2: "#100a06",
              num: "#fff4d0",
              glow: "rgba(255,180,60,0.5)",
              tick: "rgba(255,220,140,0.55)",
            }
          : {
              rim: "#c45a4a",
              rimSoft: "rgba(196,90,74,0.55)",
              core0: "#3a2224",
              core1: "#180e10",
              core2: "#0a0608",
              num: "#f0c4b8",
              glow: "rgba(180,60,50,0.4)",
              tick: "rgba(237,180,170,0.35)",
            };

  ctx.clearRect(0, 0, size, size);

  // Soft contact shadow
  ctx.beginPath();
  ctx.arc(cx + 2, cy + 4, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fill();

  // Outer glow halo
  const halo = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 1.15);
  halo.addColorStop(0, pal.glow);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();

  // Metal / wax plate
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const plate = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.08, cx, cy, r);
  plate.addColorStop(0, pal.core0);
  plate.addColorStop(0.5, pal.core1);
  plate.addColorStop(1, pal.core2);
  ctx.fillStyle = plate;
  ctx.fill();

  // Faceted inner disc
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  const inner = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, 2, cx, cy, r * 0.78);
  inner.addColorStop(0, "rgba(237,228,212,0.14)");
  inner.addColorStop(0.45, "rgba(237,228,212,0.03)");
  inner.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = inner;
  ctx.fill();

  // Ritual tick marks (8)
  ctx.strokeStyle = pal.tick;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + Math.cos(a) * r * 0.86;
    const y0 = cy + Math.sin(a) * r * 0.86;
    const x1 = cx + Math.cos(a) * r * 0.96;
    const y1 = cy + Math.sin(a) * r * 0.96;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // Outer rim
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = pal.rim;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
  ctx.strokeStyle = pal.rimSoft;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tiny eye notch at top (power identity, not Motley chrome)
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.52, r * 0.14, r * 0.08, 0, 0, Math.PI * 2);
  ctx.strokeStyle = pal.rimSoft;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.52, r * 0.035, 0, Math.PI * 2);
  ctx.fillStyle = pal.rim;
  ctx.fill();

  // Power numeral
  const label = String(Math.max(0, Math.floor(power)));
  ctx.fillStyle = pal.num;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font =
    label.length > 1
      ? "800 48px 'Barlow Condensed', sans-serif"
      : "800 58px 'Barlow Condensed', sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillText(label, cx, cy + 2);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Buff / nerf chevron
  if (mood === "up" || mood === "down") {
    const dir = mood === "up" ? -1 : 1;
    const by = cy + dir * r * 0.62;
    ctx.beginPath();
    ctx.moveTo(cx, by + dir * 5);
    ctx.lineTo(cx - 8, by - dir * 3);
    ctx.lineTo(cx + 8, by - dir * 3);
    ctx.closePath();
    ctx.fillStyle = pal.rim;
    ctx.fill();
  }

  powerChipCache.set(key, c);
  return c;
}

export type WitnessChipMood = "base" | "cheap" | "taxed" | "spent";

/**
 * Live Witness / Gaze Sight-cost seal — teal pip language, not Motley chrome.
 * `spent` = already Witnessed (show 0 until Fall / Unmake).
 */
export function bakeWitnessChip(cost: number, mood: WitnessChipMood): HTMLCanvasElement {
  const key = `w:${cost}:${mood}`;
  const hit = witnessChipCache.get(key);
  if (hit) return hit;

  const size = 112;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;

  const pal =
    mood === "cheap"
      ? {
          rim: "#a8efe6",
          rimSoft: "rgba(168,239,230,0.7)",
          core0: "#2a5a54",
          core1: "#102824",
          core2: "#081412",
          num: "#e8fffa",
          glow: "rgba(80,230,210,0.5)",
        }
      : mood === "taxed"
        ? {
            rim: "#6a9a96",
            rimSoft: "rgba(106,154,150,0.5)",
            core0: "#2a3838",
            core1: "#121818",
            core2: "#080c0c",
            num: "#c8ddd8",
            glow: "rgba(60,120,110,0.35)",
          }
        : mood === "spent"
          ? {
              rim: "#4a6e6a",
              rimSoft: "rgba(74,110,106,0.45)",
              core0: "#1a2a28",
              core1: "#0c1414",
              core2: "#060a0a",
              num: "#9eb8b4",
              glow: "rgba(40,80,75,0.28)",
            }
          : {
              rim: "#3ecfc0",
              rimSoft: "rgba(62,207,192,0.6)",
              core0: "#1e4a46",
              core1: "#0e2220",
              core2: "#060e0e",
              num: "#d8fff8",
              glow: "rgba(62,207,192,0.42)",
            };

  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(cx + 2, cy + 3, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();

  const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.12);
  halo.addColorStop(0, pal.glow);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const plate = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 2, cx, cy, r);
  plate.addColorStop(0, pal.core0);
  plate.addColorStop(0.55, pal.core1);
  plate.addColorStop(1, pal.core2);
  ctx.fillStyle = plate;
  ctx.fill();

  // Eye slit — Sight / Witness identity
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.42, r * 0.22, r * 0.1, 0, 0, Math.PI * 2);
  ctx.strokeStyle = pal.rimSoft;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.42, r * 0.045, 0, Math.PI * 2);
  ctx.fillStyle = pal.rim;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = pal.rim;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5.5, 0, Math.PI * 2);
  ctx.strokeStyle = pal.rimSoft;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  const label = String(Math.max(0, Math.floor(cost)));
  ctx.fillStyle = pal.num;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font =
    label.length > 1
      ? "800 42px 'Barlow Condensed', sans-serif"
      : "800 50px 'Barlow Condensed', sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 1;
  ctx.fillText(label, cx, cy + 6);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // Tiny S mark under numeral
  ctx.fillStyle = pal.rimSoft;
  ctx.font = "700 14px 'Barlow Condensed', sans-serif";
  ctx.fillText("S", cx, cy + r * 0.62);

  if (mood === "cheap" || mood === "taxed") {
    const dir = mood === "cheap" ? -1 : 1;
    const by = cy + dir * r * 0.78;
    ctx.beginPath();
    ctx.moveTo(cx, by + dir * 4);
    ctx.lineTo(cx - 6, by - dir * 2);
    ctx.lineTo(cx + 6, by - dir * 2);
    ctx.closePath();
    ctx.fillStyle = pal.rim;
    ctx.fill();
  }

  witnessChipCache.set(key, c);
  return c;
}

export function clearPowerChipCache(): void {
  powerChipCache.clear();
  witnessChipCache.clear();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rad: number,
): void {
  const r = Math.min(rad, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
