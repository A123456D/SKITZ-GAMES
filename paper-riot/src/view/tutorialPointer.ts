/** Pointing-hand coach for the interactive tutorial. */

export type TutorialPointMode = "point" | "swipe" | "swipeVert";

export type TutorialPointTarget = {
  /** World point the fingertip should indicate. */
  x: number;
  y: number;
  mode: TutorialPointMode;
  /** Mirror hand when the target is on the left. */
  flip?: boolean;
  /** Drawn hand size in canvas px (default 120). */
  size?: number;
  /** Horizontal swipe travel radius (swipe modes). */
  travel?: number;
};

let handImg: HTMLImageElement | null = null;
let handPromise: Promise<void> | null = null;

const HAND_SRC = "./ui/hand-point.png?v=2";
/**
 * Yellow fingertip in normalized image space (points upper-right).
 * Measured from hand-point.png after background removal.
 */
const TIP_U = 0.89;
const TIP_V = 0.09;

export function loadTutorialHand(): Promise<void> {
  if (handImg?.complete && handImg.naturalWidth > 0) return Promise.resolve();
  if (handPromise) return handPromise;
  handPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      handImg = img;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = HAND_SRC;
  });
  return handPromise;
}

function easeInOutSine(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * 2 * t);
}

function pulseRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tMs: number,
  color: string,
): void {
  const phase = (tMs % 1400) / 1400;
  const r = 14 + phase * 22;
  const a = 0.5 * (1 - phase);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.globalAlpha = a;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.28 + 0.16 * Math.sin(tMs * 0.006);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * Draws the pointing-hand sticker aimed at `target`.
 * `tMs` drives bob / swipe loop animation.
 * `appear` 0..1 fades the hand in after a step change.
 */
export function drawTutorialPointer(
  ctx: CanvasRenderingContext2D,
  target: TutorialPointTarget,
  tMs: number,
  accent = "#c8ff3d",
  appear = 1,
): void {
  const alpha = Math.max(0, Math.min(1, appear));
  if (alpha <= 0.01) return;

  let tipX = target.x;
  let tipY = target.y;
  const travel = target.travel ?? 64;

  if (target.mode === "swipe") {
    const cycle = (tMs % 1800) / 1800;
    const wave = Math.sin(cycle * Math.PI * 2);
    tipX = target.x + wave * travel;
    tipY = target.y + Math.sin(tMs * 0.0035) * 3;
  } else if (target.mode === "swipeVert") {
    const cycle = (tMs % 1800) / 1800;
    const wave = Math.sin(cycle * Math.PI * 2);
    tipX = target.x + Math.sin(tMs * 0.0035) * 3;
    tipY = target.y + wave * travel;
  } else {
    const bob = easeInOutSine((tMs % 1600) / 1600);
    tipY = target.y + (bob - 0.5) * 8;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  pulseRing(ctx, tipX, tipY, tMs, accent);

  const img = handImg;
  const size = target.size ?? 120;
  if (target.flip) {
    ctx.translate(tipX, tipY);
    ctx.scale(-1, 1);
    ctx.translate(-tipX, -tipY);
  }
  const dx = tipX - size * TIP_U;
  const dy = tipY - size * TIP_V;
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, dx, dy, size, size);
  } else {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - 22, tipY + 32);
    ctx.lineTo(tipX + 22, tipY + 32);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
