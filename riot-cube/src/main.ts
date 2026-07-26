import { LEVEL_1 } from "./core/levels";
import {
  applyTwist,
  flipFace,
  restartSession,
  startSession,
  starsForScore,
  type Session,
} from "./core/session";
import {
  cloneBoard,
  findMatches,
  matchedCells,
  twistBoard,
  type Board,
} from "./core/board";
import type { TileKind, Twist } from "./core/types";
import {
  W,
  H,
  boardLayout,
  cellBase,
  drawDesk,
  drawEndOverlay,
  drawFlipButtons,
  drawHint,
  drawHud,
  drawPage,
  drawStickerSprite,
  hitCell,
  hitFlip,
  hitRetry,
  type Layout,
} from "./view/draw";
import { drawCrumpledSticker } from "./view/crumple";
import { loadStickers } from "./view/stickers";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

let session: Session = startSession(LEVEL_1);
let layout: Layout = boardLayout(session.level.size);
let floatText: { text: string; life: number } | null = null;

type DragState = {
  r: number;
  c: number;
  x0: number;
  y0: number;
  axis: "row" | "col" | null;
  index: number;
  offset: number;
};

let drag: DragState | null = null;
let springOffset = 0;
let springAxis: "row" | "col" | null = null;
let springIndex = -1;

/** 0 = showing face, 0.5 = edge-on, 1 = landed on other face */
let flipAnim = 0;
let flipDir: 1 | -1 = 1;
let flipping = false;
let flipSwapped = false;

/** Visual board during crumple (twisted, pre-resolve). */
let visualBoard: Board | null = null;
type Crumple = { r: number; c: number; kind: TileKind; seed: number };
let crumples: Crumple[] = [];
let crumpleT = 0;
let pendingTwist: Twist | null = null;
let busy = false;

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function canvasPoint(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

function activeOffset(): {
  axis: "row" | "col" | null;
  index: number;
  offset: number;
  hovering: boolean;
} {
  if (drag?.axis) {
    return {
      axis: drag.axis,
      index: drag.index,
      offset: drag.offset,
      hovering: true,
    };
  }
  if (springAxis) {
    return {
      axis: springAxis,
      index: springIndex,
      offset: springOffset,
      hovering: Math.abs(springOffset) > 1,
    };
  }
  return { axis: null, index: -1, offset: 0, hovering: false };
}

function stickerPos(
  r: number,
  c: number,
  n: number,
  motion: { axis: "row" | "col" | null; index: number; offset: number },
): { x: number; y: number } {
  const base = cellBase(layout, r, c);
  let x = base.x;
  let y = base.y;
  const span = n * layout.stride;
  if (motion.axis === "row" && motion.index === r) {
    x = layout.boardX + ((((c * layout.stride + motion.offset) % span) + span) % span);
  } else if (motion.axis === "col" && motion.index === c) {
    y = layout.boardY + ((((r * layout.stride + motion.offset) % span) + span) % span);
  }
  return { x, y };
}

function paint(): void {
  drawDesk(ctx);
  drawHud(ctx, {
    title: session.level.title,
    moves: session.movesLeft,
    score: session.score,
    goals: session.goals,
  });

  const flipT = flipping ? flipAnim : 0;
  drawPage(ctx, layout, flipT);

  // Hide stickers when page is edge-on
  const visible = Math.abs(Math.cos(flipT * Math.PI)) > 0.12;
  const motion = activeOffset();
  const n = session.level.size;

  if (visible) {
    ctx.save();
    const cx = layout.pageX + layout.pageW / 2;
    const scaleX = Math.max(0.04, Math.abs(Math.cos(flipT * Math.PI)));
    ctx.translate(cx, layout.pageY + layout.pageH / 2);
    ctx.scale(scaleX, 1);
    ctx.translate(-cx, -(layout.pageY + layout.pageH / 2));

    // Clip to page interior so wrapping stickers slide under the edge feel
    ctx.beginPath();
    ctx.rect(layout.pageX + 8, layout.pageY + 8, layout.pageW - 16, layout.pageH - 16);
    ctx.clip();

    const board = visualBoard ?? session.board;
    const crumpleKeys = new Set(crumples.map((c) => `${c.r},${c.c}`));

    // Draw wrapped copies for continuous reveal
    const copies = motion.axis ? [-1, 0, 1] : [0];
    for (const copy of copies) {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (crumpleKeys.has(`${r},${c}`)) continue;
          const kind = board[r]![c];
          if (!kind) continue;
          const pos = stickerPos(r, c, n, motion);
          let x = pos.x;
          let y = pos.y;
          if (motion.axis === "row" && motion.index === r) {
            x += copy * n * layout.stride;
          } else if (motion.axis === "col" && motion.index === c) {
            y += copy * n * layout.stride;
          } else if (copy !== 0) {
            continue;
          }

          const inLane =
            (motion.axis === "row" && motion.index === r) ||
            (motion.axis === "col" && motion.index === c);
          const lift = inLane && motion.hovering ? 14 : 0;
          const scale = inLane && motion.hovering ? 1.08 : 1;
          drawStickerSprite(ctx, kind, x, y, layout.cell, scale, lift);
        }
      }
    }

    // Crumpling matched stickers on top
    if (crumples.length && crumpleT < 1) {
      for (const c of crumples) {
        const pos = cellBase(layout, c.r, c.c);
        drawCrumpledSticker(
          ctx,
          c.kind,
          pos.x,
          pos.y,
          layout.cell,
          crumpleT,
          c.seed,
        );
      }
    }
    ctx.restore();
  }

  if (!flipping) {
    drawFlipButtons(ctx, layout, session.face);
  }

  drawHint(
    ctx,
    session.status === "playing"
      ? "Drag stickers — they wrap forever. Tap ‹ › to flip the cube."
      : session.status === "won"
        ? "Rip. Match. Repeat."
        : "Try another twist path.",
  );

  if (floatText && floatText.life > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, floatText.life * 2);
    ctx.fillStyle = "#c8ff3d";
    ctx.font = "800 42px 'Permanent Marker', sans-serif";
    ctx.fillText(floatText.text, W / 2 - 80, layout.pageY - 16);
    ctx.restore();
  }

  if (session.status !== "playing") {
    drawEndOverlay(ctx, {
      won: session.status === "won",
      score: session.score,
      stars: starsForScore(session.score, session.level.starScores),
    });
  }
}

function tick(): void {
  let dirty = false;
  if (floatText) {
    floatText.life -= 0.02;
    if (floatText.life <= 0) floatText = null;
    dirty = true;
  }
  if (springAxis) {
    springOffset *= 0.78;
    if (Math.abs(springOffset) < 0.5) {
      springOffset = 0;
      springAxis = null;
      springIndex = -1;
    }
    dirty = true;
  }
  if (flipping) {
    flipAnim += 0.07;
    if (!flipSwapped && flipAnim >= 0.5) {
      session = flipFace(session, flipDir);
      flipSwapped = true;
    }
    if (flipAnim >= 1) {
      flipAnim = 0;
      flipping = false;
      flipSwapped = false;
    }
    dirty = true;
  }
  if (crumples.length) {
    crumpleT = Math.min(1, crumpleT + 0.045);
    dirty = true;
    if (crumpleT >= 1 && pendingTwist) {
      finishCrumple();
    }
  }
  if (dirty || drag || crumples.length) paint();
  requestAnimationFrame(tick);
}

function finishCrumple(): void {
  const twist = pendingTwist!;
  pendingTwist = null;
  crumples = [];
  crumpleT = 0;
  visualBoard = null;
  const result = applyTwist(session, twist);
  busy = false;
  if (!result.didTwist) {
    paint();
    return;
  }
  session = result.session;
  if (result.combo > 1) floatText = { text: `COMBO x${result.combo}`, life: 1 };
  else if (result.scoreGain > 0) floatText = { text: `+${result.scoreGain}`, life: 0.9 };
  paint();
}

function doTwist(twist: Twist): void {
  if (busy || session.status !== "playing") return;
  const twisted = twistBoard(session.board, twist);
  const groups = findMatches(twisted);
  if (groups.length === 0) {
    const result = applyTwist(session, twist);
    if (!result.didTwist) return;
    session = result.session;
    paint();
    return;
  }

  busy = true;
  pendingTwist = twist;
  visualBoard = cloneBoard(twisted);
  crumpleT = 0;
  const cells = matchedCells(groups);
  crumples = [];
  for (const k of cells) {
    const [rs, cs] = k.split(",");
    const r = Number(rs);
    const c = Number(cs);
    const kind = twisted[r]![c];
    if (!kind) continue;
    crumples.push({
      r,
      c,
      kind,
      seed: (r * 97 + c * 13 + session.score + 1) | 0,
    });
  }
  paint();
}

function startFlip(dir: 1 | -1): void {
  if (flipping || session.status !== "playing" || drag || busy) return;
  flipDir = dir;
  flipping = true;
  flipAnim = 0;
  flipSwapped = false;
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = canvasPoint(e);
  if (session.status !== "playing") {
    if (hitRetry(p.x, p.y)) {
      session = restartSession(session);
      layout = boardLayout(session.level.size);
      floatText = null;
      visualBoard = null;
      crumples = [];
      crumpleT = 0;
      pendingTwist = null;
      busy = false;
      paint();
    }
    return;
  }
  if (flipping || busy) return;

  const flip = hitFlip(layout, p.x, p.y);
  if (flip) {
    startFlip(flip);
    return;
  }

  const cell = hitCell(layout, session.level.size, p.x, p.y);
  if (!cell) return;
  drag = {
    ...cell,
    x0: p.x,
    y0: p.y,
    axis: null,
    index: -1,
    offset: 0,
  };
});

canvas.addEventListener("pointermove", (e) => {
  if (!drag || session.status !== "playing" || flipping || busy) return;
  const p = canvasPoint(e);
  const dx = p.x - drag.x0;
  const dy = p.y - drag.y0;

  if (!drag.axis) {
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) >= Math.abs(dy)) {
      drag.axis = "row";
      drag.index = drag.r;
    } else {
      drag.axis = "col";
      drag.index = drag.c;
    }
  }
  drag.offset = drag.axis === "row" ? dx : dy;
  // Re-anchor so long drags stay continuous without fighting
  paint();
});

function endDrag(e: PointerEvent): void {
  if (!drag) return;
  const axis = drag.axis;
  const index = drag.index;
  const offset = drag.offset;
  drag = null;

  if (!axis || index < 0) {
    paint();
    return;
  }

  const steps = Math.round(offset / layout.stride);
  if (steps === 0) {
    springAxis = axis;
    springIndex = index;
    springOffset = offset;
    paint();
    return;
  }

  const dir: 1 | -1 = steps > 0 ? 1 : -1;
  const amount = Math.min(session.level.size - 1, Math.abs(steps));
  // Visual snap remainder
  const snapped = steps * layout.stride;
  springAxis = axis;
  springIndex = index;
  springOffset = offset - snapped;

  doTwist({ axis, index, dir, amount });
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", () => {
  if (drag?.axis) {
    springAxis = drag.axis;
    springIndex = drag.index;
    springOffset = drag.offset;
  }
  drag = null;
  paint();
});

window.addEventListener("resize", () => {
  resize();
  paint();
});

loadStickers().then(() => {
  resize();
  paint();
  requestAnimationFrame(tick);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
