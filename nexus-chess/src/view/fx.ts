import { Theme } from "./theme";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

let backdropImg: HTMLImageElement | null = null;
let backdropReady = false;
let tileImg: HTMLImageElement | null = null;
let tileReady = false;
let boardImg: HTMLImageElement | null = null;
let boardReady = false;

function loadImg(url: string | null): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `${url}?v=6`;
  });
}

export function loadThemeArt(): Promise<void> {
  return Promise.all([
    loadImg(Theme.backdropUrl),
    loadImg(Theme.tileUrl),
    loadImg(Theme.boardUrl),
  ]).then(([backdrop, tile, board]) => {
    backdropImg = backdrop;
    backdropReady = !!backdrop;
    tileImg = tile;
    tileReady = !!tile;
    boardImg = board;
    boardReady = !!board;
  });
}

export function getBoardImage(): HTMLImageElement | null {
  return boardReady ? boardImg : null;
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number = Theme.radius,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (rr <= 0.5) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Deep vignette + optional backdrop art + theme energy. */
export function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time = 0,
) {
  ctx.fillStyle = Theme.bg;
  ctx.fillRect(0, 0, width, height);

  if (backdropReady && backdropImg) {
    const iw = backdropImg.naturalWidth;
    const ih = backdropImg.naturalHeight;
    const scale = Math.max(width / iw, height / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.save();
    ctx.globalAlpha = Theme.id === "forge" ? 0.62 : Theme.id === "nexus" ? 0.55 : 0.35;
    ctx.drawImage(backdropImg, (width - dw) / 2, (height - dh) / 2, dw, dh);
    ctx.restore();
  }

  const breathe = 0.7 + 0.12 * Math.sin(time * 0.7);
  const cx = width * 0.5;
  const cy = height * 0.38;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.58);
  if (Theme.id === "forge") {
    glow.addColorStop(0, `rgba(180,80,90,${0.05 * breathe})`);
    glow.addColorStop(0.35, `rgba(80,140,200,${0.03 * breathe})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
  } else if (Theme.id === "nexus") {
    glow.addColorStop(0, `rgba(120,200,255,${0.1 * breathe})`);
    glow.addColorStop(0.4, `rgba(80,160,220,${0.035 * breathe})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
  } else {
    glow.addColorStop(0, `rgba(255,255,255,${0.07 * breathe})`);
    glow.addColorStop(0.4, `rgba(255,255,255,${0.022 * breathe})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
  }
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Fine geometric grid for premium themes
  if (Theme.angular) {
    ctx.save();
    ctx.strokeStyle = Theme.id === "forge" ? "rgba(180,100,110,0.035)" : "rgba(120,180,230,0.04)";
    ctx.lineWidth = 1;
    const step = 48;
    const ox = (time * 4) % step;
    for (let x = -step + ox; x < width + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = -step + ox * 0.5; y < height + step; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  const vig = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.2,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(
    1,
    Theme.id === "forge"
      ? "rgba(8,2,6,0.7)"
      : Theme.id === "nexus"
        ? "rgba(0,4,12,0.72)"
        : "rgba(0,0,0,0.62)",
  );
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
}

export function drawBoardShadow(
  ctx: CanvasRenderingContext2D,
  boardX: number,
  boardY: number,
  boardSize: number,
) {
  const pad = 18;
  const shadow = ctx.createRadialGradient(
    boardX + boardSize / 2,
    boardY + boardSize * 0.55,
    boardSize * 0.15,
    boardX + boardSize / 2,
    boardY + boardSize * 0.6,
    boardSize * 0.72,
  );
  shadow.addColorStop(0, Theme.angular ? "rgba(0,10,20,0.7)" : "rgba(0,0,0,0.55)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(boardX - pad, boardY - pad * 0.4, boardSize + pad * 2, boardSize + pad * 1.4);
}

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: boolean; strong?: boolean } = {},
) {
  if (opts.fill !== false) {
    ctx.fillStyle = Theme.btnFill;
    roundRectPath(ctx, x, y, w, h);
    ctx.fill();
  }
  ctx.strokeStyle = opts.strong ? Theme.hairlineStrong : Theme.hairline;
  ctx.lineWidth = 1;
  roundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.stroke();

  if (Theme.angular && opts.strong) {
    // Corner ticks — geometric chrome
    const t = 8;
    ctx.strokeStyle = Theme.accent;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(x, y + t);
    ctx.lineTo(x, y);
    ctx.lineTo(x + t, y);
    ctx.moveTo(x + w - t, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + t);
    ctx.moveTo(x + w, y + h - t);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w - t, y + h);
    ctx.moveTo(x + t, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - t);
    ctx.stroke();
  }
}

export function drawPremiumBtn(
  ctx: CanvasRenderingContext2D,
  b: Rect,
  label: string,
  opts: {
    primary?: boolean;
    active?: boolean;
    muted?: boolean;
    sub?: string;
    fontSize?: number;
  } = {},
) {
  const { x, y, w, h } = b;
  const fontSize = opts.fontSize ?? 15;

  if (opts.primary) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    if (Theme.id === "forge") {
      g.addColorStop(0, "rgba(200,100,110,0.28)");
      g.addColorStop(0.5, "rgba(120,160,220,0.12)");
      g.addColorStop(1, "rgba(80,40,50,0.12)");
    } else if (Theme.id === "nexus") {
      g.addColorStop(0, "rgba(140,210,255,0.28)");
      g.addColorStop(0.5, "rgba(80,160,220,0.14)");
      g.addColorStop(1, "rgba(40,100,160,0.1)");
    } else {
      g.addColorStop(0, "rgba(255,255,255,0.22)");
      g.addColorStop(0.5, "rgba(255,255,255,0.14)");
      g.addColorStop(1, "rgba(255,255,255,0.08)");
    }
    ctx.fillStyle = g;
    roundRectPath(ctx, x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = Theme.hairlineBright;
  } else if (opts.active) {
    ctx.fillStyle = Theme.btnFillActive;
    roundRectPath(ctx, x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = Theme.hairlineBright;
  } else {
    ctx.fillStyle = Theme.btnFill;
    roundRectPath(ctx, x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = opts.muted ? Theme.inkFaint : Theme.hairline;
  }

  ctx.lineWidth = 1;
  roundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.stroke();

  if (Theme.angular && (opts.primary || opts.active)) {
    const t = 6;
    ctx.strokeStyle = Theme.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + t);
    ctx.lineTo(x, y);
    ctx.lineTo(x + t, y);
    ctx.moveTo(x + w - t, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - t);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = opts.muted
    ? Theme.inkMute
    : opts.primary || opts.active
      ? Theme.ink
      : Theme.inkDim;

  if (opts.sub) {
    ctx.font = `500 ${fontSize}px ${Theme.font}`;
    ctx.fillText(label, x + w / 2, y + h / 2 - 7);
    ctx.fillStyle = Theme.inkMute;
    ctx.font = `400 ${Math.max(10, fontSize - 2)}px ${Theme.font}`;
    ctx.fillText(opts.sub, x + w / 2, y + h / 2 + 11);
  } else {
    ctx.font = `500 ${fontSize}px ${Theme.font}`;
    ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  }
}

export function fillTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  light: boolean,
) {
  ctx.fillStyle = light ? Theme.tileLight : Theme.tileDark;
  ctx.fillRect(x, y, size, size);

  if (tileReady && tileImg && Theme.tileUrl && !Theme.boardUrl) {
    ctx.save();
    ctx.globalAlpha = light ? 0.22 : 0.14;
    ctx.drawImage(tileImg, x, y, size, size);
    ctx.restore();
  }

  if (light) {
    ctx.fillStyle = Theme.tileSheen;
    ctx.fillRect(x, y, size, 1);
  }
}
