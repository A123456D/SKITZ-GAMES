import { LEVEL_1 } from "./core/levels";
import {
  applyTwist,
  restartSession,
  startSession,
  starsForScore,
  type Session,
} from "./core/session";
import type { Twist } from "./core/types";
import {
  W,
  H,
  boardLayout,
  cellRect,
  drawBackground,
  drawEndOverlay,
  drawHint,
  drawHud,
  drawSticker,
  hitCell,
  hitRetry,
  type Layout,
} from "./view/draw";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

let session: Session = startSession(LEVEL_1);
let layout: Layout = boardLayout(session.level.size);
let flash = new Map<string, number>();
let floatText: { text: string; life: number } | null = null;
let drag:
  | {
      r: number;
      c: number;
      x0: number;
      y0: number;
    }
  | null = null;
let preview: Twist | null = null;

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  const cssW = W * scale;
  const cssH = H * scale;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
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

function paint(): void {
  drawBackground(ctx);
  drawHud(ctx, {
    title: session.level.title,
    moves: session.movesLeft,
    score: session.score,
    goals: session.goals,
  });

  const n = session.level.size;
  // Soft board backing (cardboard)
  ctx.save();
  ctx.fillStyle = "#2a2118";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 5;
  const pad = 14;
  const bx = layout.boardX - pad;
  const by = layout.boardY - pad;
  const bw = layout.boardSize + pad * 2;
  const bh = layout.boardSize + pad * 2;
  const br = 16;
  ctx.beginPath();
  ctx.moveTo(bx + br, by);
  ctx.arcTo(bx + bw, by, bx + bw, by + bh, br);
  ctx.arcTo(bx + bw, by + bh, bx, by + bh, br);
  ctx.arcTo(bx, by + bh, bx, by, br);
  ctx.arcTo(bx, by, bx + bw, by, br);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const kind = session.board[r]![c];
      if (!kind) continue;
      const rect = cellRect(layout, r, c);
      const f = flash.get(`${r},${c}`) ?? 0;
      let ox = 0;
      let oy = 0;
      if (preview) {
        if (preview.axis === "row" && preview.index === r) {
          ox = preview.dir * layout.cell * 0.12;
        }
        if (preview.axis === "col" && preview.index === c) {
          oy = preview.dir * layout.cell * 0.12;
        }
      }
      drawSticker(ctx, kind, rect.x + ox, rect.y + oy, rect.s, {
        flash: f,
        scale: f > 0 ? 1 + f * 0.06 : 1,
      });
    }
  }

  // Slice affordance chevrons
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#c8ff3d";
  ctx.font = "700 20px 'Chakra Petch', sans-serif";
  ctx.fillText("⇄ swipe row", layout.boardX, layout.boardY + layout.boardSize + 36);
  ctx.fillText("⇅ swipe col", layout.boardX + 220, layout.boardY + layout.boardSize + 36);
  ctx.restore();

  drawHint(
    ctx,
    session.status === "playing"
      ? "Twist a row or column — matches of 3+ rip clear."
      : session.status === "won"
        ? "Rip. Match. Repeat."
        : "Try another twist path.",
  );

  if (floatText && floatText.life > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, floatText.life * 2);
    ctx.fillStyle = "#c8ff3d";
    ctx.font = "800 42px 'Permanent Marker', sans-serif";
    ctx.fillText(floatText.text, W / 2 - 80, layout.boardY - 24);
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
  for (const [k, v] of flash) {
    const nv = v - 0.05;
    if (nv <= 0) flash.delete(k);
    else flash.set(k, nv);
    dirty = true;
  }
  if (floatText) {
    floatText.life -= 0.02;
    if (floatText.life <= 0) floatText = null;
    dirty = true;
  }
  if (dirty) paint();
  requestAnimationFrame(tick);
}

function doTwist(twist: Twist): void {
  const before = session.board;
  const result = applyTwist(session, twist);
  if (!result.didTwist) return;
  session = result.session;

  // Flash cells that changed kind (rough feedback)
  const n = session.level.size;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (before[r]![c] !== session.board[r]![c]) {
        flash.set(`${r},${c}`, 1);
      }
    }
  }
  if (result.combo > 1) {
    floatText = { text: `COMBO x${result.combo}`, life: 1 };
  } else if (result.scoreGain > 0) {
    floatText = { text: `+${result.scoreGain}`, life: 0.9 };
  }
  paint();
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = canvasPoint(e);
  if (session.status !== "playing") {
    if (hitRetry(p.x, p.y)) {
      session = restartSession(session);
      layout = boardLayout(session.level.size);
      flash.clear();
      floatText = null;
      paint();
    }
    return;
  }
  const cell = hitCell(layout, session.level.size, p.x, p.y);
  if (!cell) return;
  drag = { ...cell, x0: p.x, y0: p.y };
  preview = null;
});

canvas.addEventListener("pointermove", (e) => {
  if (!drag || session.status !== "playing") return;
  const p = canvasPoint(e);
  const dx = p.x - drag.x0;
  const dy = p.y - drag.y0;
  const threshold = 18;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    preview = null;
    paint();
    return;
  }
  if (Math.abs(dx) >= Math.abs(dy)) {
    preview = {
      axis: "row",
      index: drag.r,
      dir: dx > 0 ? 1 : -1,
    };
  } else {
    preview = {
      axis: "col",
      index: drag.c,
      dir: dy > 0 ? 1 : -1,
    };
  }
  paint();
});

function endDrag(e: PointerEvent): void {
  if (!drag) return;
  const p = canvasPoint(e);
  const dx = p.x - drag.x0;
  const dy = p.y - drag.y0;
  const commit = 36;
  let twist: Twist | null = null;
  if (Math.abs(dx) >= commit || Math.abs(dy) >= commit) {
    if (Math.abs(dx) >= Math.abs(dy)) {
      twist = { axis: "row", index: drag.r, dir: dx > 0 ? 1 : -1 };
    } else {
      twist = { axis: "col", index: drag.c, dir: dy > 0 ? 1 : -1 };
    }
  }
  drag = null;
  preview = null;
  if (twist) doTwist(twist);
  else paint();
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", () => {
  drag = null;
  preview = null;
  paint();
});

window.addEventListener("resize", () => {
  resize();
  paint();
});

resize();
paint();
requestAnimationFrame(tick);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
