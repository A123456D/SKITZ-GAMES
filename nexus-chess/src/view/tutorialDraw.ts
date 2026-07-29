import type { ButtonRect, DrawCtx } from "./draw";
import { squareScreenPos } from "./draw";
import { NEXUS_SQUARES } from "../core/board";
import { Theme } from "./theme";
import { drawPremiumBtn, roundRectPath } from "./fx";
import type { TutorialStep } from "../core/tutorial";

export interface CoachTarget {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Resolve the on-screen rect the arrow should point at. */
export function resolveCoachTarget(
  dc: DrawCtx,
  step: TutorialStep,
  buttons: ButtonRect[],
  flipped: boolean,
): CoachTarget | null {
  if (step.buttonId) {
    const b = buttons.find((x) => x.id === step.buttonId);
    if (b) return { x: b.x, y: b.y, w: b.w, h: b.h };
  }
  if (step.square) {
    const [x, y] = squareScreenPos(dc, step.square, flipped);
    return { x, y, w: dc.cellSize, h: dc.cellSize };
  }
  if (step.nexusZone) {
    const corners = NEXUS_SQUARES.map((sq) => squareScreenPos(dc, sq, flipped));
    const minX = Math.min(...corners.map(([x]) => x));
    const minY = Math.min(...corners.map(([, y]) => y));
    return { x: minX, y: minY, w: dc.cellSize * 2, h: dc.cellSize * 2 };
  }
  return null;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  time: number,
) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bob = Math.sin(time * 5) * 5;
  const tipX = toX - ux * (10 + bob);
  const tipY = toY - uy * (10 + bob);
  const shaftX = fromX;
  const shaftY = fromY;

  ctx.save();
  ctx.strokeStyle = Theme.accent;
  ctx.fillStyle = Theme.accent;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = Theme.id === "forge" ? "rgba(255,120,130,0.45)" : "rgba(120,200,255,0.45)";
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(shaftX, shaftY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const ah = 14;
  const aw = 9;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - ux * ah - uy * aw, tipY - uy * ah + ux * aw);
  ctx.lineTo(tipX - ux * ah + uy * aw, tipY - uy * ah - ux * aw);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Dim the screen, spotlight the target, draw a bouncing arrow + caption.
 * Adds `tutorial-skip` and optionally `tutorial-gotit` buttons.
 */
export function drawTutorialCoach(
  dc: DrawCtx,
  buttons: ButtonRect[],
  step: TutorialStep,
  target: CoachTarget | null,
  time: number,
) {
  const { ctx, width, height, compact, pad } = dc;

  // Dim overlay with cutout (evenodd — Safari-safe, no destination-out)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  if (target) {
    const padOut = 6;
    const rx = target.x - padOut;
    const ry = target.y - padOut;
    const rw = target.w + padOut * 2;
    const rh = target.h + padOut * 2;
    const r = 8;
    // Hole (opposite winding for evenodd)
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
  }
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fill("evenodd");

  if (target) {
    const pulse = 0.55 + 0.25 * (0.5 + 0.5 * Math.sin(time * 4));
    ctx.strokeStyle =
      Theme.id === "forge" ? `rgba(255,150,160,${pulse})` : `rgba(160,220,255,${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(target.x - 3, target.y - 3, target.w + 6, target.h + 6);
  }
  ctx.restore();

  // Caption card
  const cardW = Math.min(width - pad * 2, compact ? 320 : 380);
  const cardH = compact ? 72 : 80;
  let cardY = height - pad - cardH - (compact ? 52 : 56);
  if (target) {
    const below = target.y + target.h + 24;
    const above = target.y - cardH - 24;
    if (below + cardH < height - 60) cardY = below;
    else if (above > 20) cardY = above;
  }
  const cardX = (width - cardW) / 2;

  ctx.fillStyle = "rgba(8,10,16,0.92)";
  ctx.strokeStyle = Theme.hairlineStrong;
  ctx.lineWidth = 1;
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 14 : 15}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  wrapFill(ctx, step.text, cardX + cardW / 2, cardY + cardH / 2, cardW - 28, compact ? 16 : 18);

  // Arrow from caption toward target
  if (target) {
    const fromX = cardX + cardW / 2;
    const fromY = cardY < target.y ? cardY + cardH : cardY;
    const toX = target.x + target.w / 2;
    const toY = cardY < target.y ? target.y : target.y + target.h;
    drawArrow(ctx, fromX, fromY, toX, toY, time);
  }

  // Skip — bottom-left so it never fights the play Menu button
  const skipW = compact ? 72 : 84;
  const skip: ButtonRect = {
    x: pad,
    y: height - pad - (compact ? 36 : 40),
    w: skipW,
    h: compact ? 32 : 34,
    id: "tutorial-skip",
  };
  drawPremiumBtn(ctx, skip, "Skip", { fontSize: compact ? 11 : 12 });
  buttons.push(skip);

  if (step.acknowledge) {
    const gotW = Math.min(200, cardW - 24);
    const got: ButtonRect = {
      x: (width - gotW) / 2,
      y: cardY + cardH + 12,
      w: gotW,
      h: compact ? 40 : 44,
      id: "tutorial-gotit",
    };
    drawPremiumBtn(ctx, got, "Got it", { primary: true, fontSize: compact ? 14 : 15 });
    buttons.push(got);
  }
}

function wrapFill(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxW: number,
  lineH: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  const startY = cy - ((lines.length - 1) * lineH) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cx, startY + i * lineH);
  }
}
