import { getCard, schoolColor } from "../core/cards";
import type { CardDef } from "../core/types";

const cache = new Map<string, HTMLCanvasElement>();
const fullCardImgs = new Map<string, HTMLImageElement>();

let frameImg: HTMLImageElement | null = null;
let veilImg: HTMLImageElement | null = null;
let assetsReady: Promise<void> | null = null;

/** Cards with finished full-face generated art (entire card is the image). */
export const FULL_CARD_IDS = [
  "cliff_seeker",
  "veil_banner",
  "ace_of_hollows",
  "hatline_trickster",
  "third_face",
  "root_chassis",
  "hole_choir",
  "coral_crown",
  "ribcity_angel",
  "depth_matron",
  "ring_gaze",
  "unblinking_law",
  "stake_field_pilgrim",
  "branch_rune_reliquary",
  "perforated_abbess",
  "keywright_scarecrow",
  "parasol_path",
  "ochre_vanguard",
  "echo_mask",
  "bone_wick_charm",
  "low_tide_shrine",
  "pale_silence",
  "ledger_jackal",
  "iris_heliograph",
  "verdant_cataract",
  "split_gaze_seraph",
  "saltglass_courier",
  "pillar_cantor",
  "canister_hound",
  "inkdrip_acolyte",
  "ash_lantern",
  "mire_debtor",
  "twinspoke_banner",
  "dust_ledger",
  "pale_arch",
  "suture_mill",
  "bell_debt_walker",
  "shard_pilgrim",
  "ribbon_tithe",
  "stake_sovereign",
  "abyss_cairn",
  "stake_cache",
  "debt_coin",
  "splice_token",
  "hornchain_debtor",
  "ember_chorus",
  "sunset_creditor",
  "ochre_dancer",
  "bell_siren",
  "moss_handmaid",
  "sail_widow",
  "cutwork_widow",
  "ribbon_bride",
  "wick_oracle",
  "shuttered_edict",
  "mask_gallery",
  "dusk_tithe",
  "void_charm",
  "iris_seal",
  "tide_singer",
  "millwright_colossus",
  "cutwork_sovereign",
  "tablet_walker",
  "depth_bell",
  "cube_charm",
  "gallery_debtor",
  "river_jack",
  "bone_gallery",
  "pillar_sovereign",
  "ash_widow",
  "ring_warden",
  "stake_runner",
  "splice_rite",
  "cataract_bell",
  "face_charm",
  "ember_sovereign",
  "arch_debtor",
  "horn_tithe",
  "stake_tithe",
  "parasol_debtor",
  "moss_charm",
  "key_debtor",
  "mesa_bell",
  "ledger_urn",
  "horn_cantor",
  "key_shrine",
  "pale_tithe",
  "coral_urn",
  "gaze_tithe",
  "low_runner",
  "dusk_charm",
  "mask_urn",
  "sail_runner",
  "void_gallery",
  "mire_urn",
  "ember_tithe",
  "mid_runner",
  "iris_urn",
  "pillar_cache",
  "key_cantor",
  "dusk_cantor",
  "arch_urn",
  "cairn_tithe",
  "stake_urn",
  "splice_urn",
  "ribbon_runner",
  "horn_runner",
  "wick_cantor",
  "mire_gallery",
  "coral_charm",
  "parasol_runner",
  "dust_cache",
  "pale_runner",
  "mask_charm",
  "wick_charm",
  "cataract_runner",
  "iris_charm",
] as const;

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
            (await tryLoad(`./assets/cards/${id}.jpg`)) ??
            (await tryLoad(`./assets/cards/${id}.png`));
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

/** URL for DOM hand display — full art when available (never veiled in hand). */
export function handCardSrc(cardId: string): string {
  if (fullCardImgs.has(cardId)) {
    // Prefer jpg (shipped), fall back to png path for freshly generated faces
    return `./assets/cards/${cardId}.jpg`;
  }
  return bakeCardFace(cardId, false).toDataURL("image/jpeg", 0.92);
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

  // Fallback placeholder until full art exists
  const def = getCard(cardId);
  const [sr, sg, sb] = schoolColor(def.school);
  ctx.fillStyle = "#16101c";
  ctx.fillRect(0, 0, w, h);
  if (frameImg?.complete) {
    drawCover(ctx, frameImg, w, h);
  }
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = `rgba(${Math.floor(sr * 255)}, ${Math.floor(sg * 255)}, ${Math.floor(sb * 255)}, 0.55)`;
  ctx.fillRect(24, 44, w - 48, h - 140);
  ctx.restore();

  ctx.fillStyle = "rgba(14,10,18,0.82)";
  ctx.fillRect(16, h - 100, w - 32, 84);
  ctx.fillStyle = "#ede4d4";
  ctx.textAlign = "center";
  ctx.font = "700 20px Cinzel, serif";
  ctx.fillText(def.name, w / 2, h - 62);
  ctx.font = "600 13px 'Barlow Condensed', sans-serif";
  ctx.fillStyle = "#c49a6c";
  ctx.fillText(`${def.school.toUpperCase()} · ${def.type.toUpperCase()}`, w / 2, h - 40);
  ctx.fillStyle = "#3ecfc0";
  ctx.fillText(`${def.essence}E${def.witnessCost ? ` · ${def.witnessCost}S` : ""}`, w / 2, h - 20);

  ctx.fillStyle = "#d4af37";
  ctx.beginPath();
  ctx.arc(36, 36, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0e0a12";
  ctx.font = "700 17px 'Barlow Condensed', sans-serif";
  ctx.fillText(String(def.essence), 36, 42);

  if (veiled) {
    ctx.fillStyle = "rgba(140, 180, 210, 0.2)";
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
}

const tokenCache = new Map<string, HTMLCanvasElement>();

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
  const [sr, sg, sb] = schoolColor(def.school);
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

  // School wash
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
