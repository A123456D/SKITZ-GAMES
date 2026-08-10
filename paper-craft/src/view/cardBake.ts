import { getCard, keywordLabel } from "../core/cards";

const KW_COLOR: Record<string, string> = {
  brace: "#1f6b3a",
  sting: "#b01828",
  glue: "#2a4a8a",
  flash: "#6a2a9a",
};

const LOGO_RED = "#b01828";
const LOGO_BLACK = "#0e0c0e";
const RIM = "#f4f0ea";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Slightly torn / die-cut silhouette — matches logo sticker rim. */
function dieCutPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const jag = (t: number, amp: number) => Math.sin(t * 11.3) * amp + Math.sin(t * 4.7) * amp * 0.45;
  ctx.beginPath();
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x + t * w;
    const py = y + jag(t, 2.2);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    ctx.lineTo(x + w + jag(t, 2.0), y + t * h);
  }
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    ctx.lineTo(x + w - t * w, y + h + jag(t + 1.2, 2.2));
  }
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    ctx.lineTo(x + jag(t + 2.1, 2.0), y + h - t * h);
  }
  ctx.closePath();
}

function stockFill(ctx: CanvasRenderingContext2D, w: number, h: number, ink: boolean): void {
  const g = ctx.createLinearGradient(0, 0, w * 0.15, h);
  if (ink) {
    g.addColorStop(0, "#1a2030");
    g.addColorStop(0.55, "#121820");
    g.addColorStop(1, "#0c1018");
  } else {
    g.addColorStop(0, "#1c1618");
    g.addColorStop(0.5, "#141012");
    g.addColorStop(1, "#0e0c0e");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = ((i * 13) % 19) - 9;
    d[i] = Math.min(255, Math.max(0, d[i] + n));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n * 0.7));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n * 0.55));
  }
  ctx.putImageData(img, 0, 0);

  // faint crease / shard marks like the logo
  ctx.strokeStyle = ink ? "rgba(120,150,200,0.08)" : "rgba(176,24,40,0.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.12);
  ctx.lineTo(w * 0.28, h * 0.04);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.72, h * 0.06);
  ctx.lineTo(w * 0.92, h * 0.16);
  ctx.stroke();
}

/** Bake a die-cut sticker card face matching the PAPER CRAFT logo language. */
export function bakeCardFace(
  cardId: string,
  face: "front" | "ink",
  art?: HTMLImageElement | HTMLCanvasElement | null,
): HTMLCanvasElement {
  const def = getCard(cardId);
  const w = 320;
  const h = 448;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const ink = face === "ink";

  ctx.clearRect(0, 0, w, h);
  const pad = 12;
  const cw = w - pad * 2;
  const ch = h - pad * 2;
  const x = pad;
  const y = pad;

  // soft drop under the sticker
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 7;
  dieCutPath(ctx, x, y, cw, ch);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  // thick white die-cut rim
  ctx.save();
  dieCutPath(ctx, x, y, cw, ch);
  ctx.fillStyle = RIM;
  ctx.fill();
  ctx.restore();

  // black stock inset
  const inset = 9;
  ctx.save();
  dieCutPath(ctx, x + inset, y + inset, cw - inset * 2, ch - inset * 2);
  ctx.clip();
  stockFill(ctx, w, h, ink);

  // crimson shard accent under title (logo energy)
  ctx.fillStyle = ink ? "rgba(70,110,180,0.85)" : LOGO_RED;
  ctx.beginPath();
  ctx.moveTo(x + inset + 8, y + inset + 54);
  ctx.lineTo(x + cw - inset - 6, y + inset + 48);
  ctx.lineTo(x + cw - inset - 10, y + inset + 62);
  ctx.lineTo(x + inset + 12, y + inset + 68);
  ctx.closePath();
  ctx.fill();

  // title — condensed aggressive
  ctx.fillStyle = RIM;
  ctx.font = "800 22px 'Oswald', 'Space Grotesk', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(def.name.toUpperCase(), x + inset + 14, y + inset + 40);

  if (ink) {
    ctx.fillStyle = "#8eb0ff";
    ctx.font = "800 11px 'Oswald', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("INK", x + cw - inset - 12, y + inset + 28);
  }

  // art window — black void so sticker cutouts punch
  const ax = x + inset + 12;
  const ay = y + inset + 76;
  const aw = cw - inset * 2 - 24;
  const ah = 250;
  roundRect(ctx, ax, ay, aw, ah, 6);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = LOGO_BLACK;
  ctx.fillRect(ax, ay, aw, ah);
  if (art) {
    const scale = Math.min(aw / art.width, ah / art.height) * 0.98;
    const dw = art.width * scale;
    const dh = art.height * scale;
    ctx.drawImage(art, ax + (aw - dw) / 2, ay + (ah - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = ink ? "#4a6ec8" : LOGO_RED;
    ctx.beginPath();
    ctx.arc(ax + aw / 2, ay + ah / 2, 54, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // sharp inner frame
  ctx.strokeStyle = "rgba(244, 240, 234, 0.22)";
  ctx.lineWidth = 2;
  roundRect(ctx, ax + 1, ay + 1, aw - 2, ah - 2, 5);
  ctx.stroke();
  ctx.strokeStyle = ink ? "rgba(100,140,210,0.55)" : "rgba(176,24,40,0.65)";
  ctx.lineWidth = 2.5;
  roundRect(ctx, ax, ay, aw, ah, 6);
  ctx.stroke();

  // cost gem — die-cut circle
  const costX = x + inset + 28;
  const costY = y + ch - inset - 36;
  ctx.beginPath();
  ctx.arc(costX, costY, 24, 0, Math.PI * 2);
  ctx.fillStyle = RIM;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(costX, costY, 18, 0, Math.PI * 2);
  ctx.fillStyle = LOGO_BLACK;
  ctx.fill();
  ctx.fillStyle = RIM;
  ctx.font = "800 20px 'Oswald', 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(def.cost), costX, costY + 1);

  // power badge — crimson sticker
  const pow = ink ? def.inkPower : def.frontPower;
  const px = x + cw - inset - 34;
  const py = costY;
  roundRect(ctx, px - 26, py - 20, 52, 40, 4);
  ctx.fillStyle = RIM;
  ctx.fill();
  roundRect(ctx, px - 21, py - 15, 42, 30, 3);
  ctx.fillStyle = ink ? "#2a5ea8" : LOGO_RED;
  ctx.fill();
  ctx.fillStyle = RIM;
  ctx.font = "800 22px 'Oswald', 'Space Grotesk', sans-serif";
  ctx.fillText(String(pow), px, py + 1);

  // keyword chip
  const kw = ink ? def.inkKeyword : def.frontKeyword;
  if (kw) {
    const label = keywordLabel(kw);
    ctx.font = "700 13px 'Oswald', 'Space Grotesk', sans-serif";
    const tw = ctx.measureText(label).width;
    const kx = x + cw / 2;
    const ky = costY;
    const bw = tw + 26;
    const bh = 28;
    // white rim
    ctx.beginPath();
    ctx.moveTo(kx - bw / 2 + 4, ky - bh / 2);
    ctx.lineTo(kx + bw / 2, ky - bh / 2 + 2);
    ctx.lineTo(kx + bw / 2 - 3, ky + bh / 2);
    ctx.lineTo(kx - bw / 2, ky + bh / 2 - 2);
    ctx.closePath();
    ctx.fillStyle = RIM;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(kx - bw / 2 + 7, ky - bh / 2 + 3);
    ctx.lineTo(kx + bw / 2 - 3, ky - bh / 2 + 4);
    ctx.lineTo(kx + bw / 2 - 6, ky + bh / 2 - 3);
    ctx.lineTo(kx - bw / 2 + 3, ky + bh / 2 - 4);
    ctx.closePath();
    ctx.fillStyle = KW_COLOR[kw] ?? LOGO_BLACK;
    ctx.fill();
    ctx.fillStyle = RIM;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, kx, ky + 1);
  }

  ctx.restore();
  return c;
}

export async function loadImage(url: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}
