/** Pointing-hand coach for the interactive tutorial. */

export type TutorialPointMode = "point" | "swipe";

export type TutorialPointTarget = {
  /** World point the fingertip should indicate. */
  x: number;
  y: number;
  mode: TutorialPointMode;
  /** Mirror hand when the target is on the left. */
  flip?: boolean;
};

let handImg: HTMLImageElement | null = null;
let handPromise: Promise<void> | null = null;

const HAND_SRC = "./ui/hand-point.png?v=2";
/** Finger tip in normalized image space (points upper-right). */
const TIP_U = 0.78;
const TIP_V = 0.2;

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

export function tutorialHandImage(): HTMLImageElement | null {
  return handImg;
}

function pulseRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tMs: number,
  color: string,
): void {
  const phase = (tMs % 1200) / 1200;
  const r = 18 + phase * 28;
  const a = 0.55 * (1 - phase);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.globalAlpha = a;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.35 + 0.2 * Math.sin(tMs * 0.008);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * Draws the pointing-hand sticker aimed at `target`.
 * `tMs` drives bob / swipe loop animation.
 */
export function drawTutorialPointer(
  ctx: CanvasRenderingContext2D,
  target: TutorialPointTarget,
  tMs: number,
  accent = "#c8ff3d",
): void {
  let tipX = target.x;
  let tipY = target.y;
  if (target.mode === "swipe") {
    // Horizontal swipe demo across the target.
    const cycle = (tMs % 1600) / 1600;
    const travel = Math.sin(cycle * Math.PI * 2) * 70;
    tipX = target.x + travel;
    tipY = target.y + Math.sin(tMs * 0.004) * 4;
  } else {
    tipY = target.y + Math.sin(tMs * 0.006) * 10;
  }

  pulseRing(ctx, tipX, tipY, tMs, accent);

  const img = handImg;
  const size = 150;
  ctx.save();
  if (target.flip) {
    ctx.translate(tipX, tipY);
    ctx.scale(-1, 1);
    ctx.translate(-tipX, -tipY);
  }
  const dx = tipX - size * (target.flip ? 1 - TIP_U : TIP_U);
  const dy = tipY - size * TIP_V;
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, dx, dy, size, size);
  } else {
    // Fallback chevron if art has not loaded yet.
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - 28, tipY + 40);
    ctx.lineTo(tipX + 28, tipY + 40);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
