import { areAdjacent } from "./core/board";
import {
  beginSwap,
  crushWave,
  currentMatches,
  startSession,
  type Session,
} from "./core/session";
import type { Pos } from "./core/types";
import {
  W,
  H,
  HOME_PLAY,
  PAUSE_BTN,
  boardLayout,
  cellAt,
  drawHome,
  drawPlay,
  hitUi,
} from "./view/draw";
import { loadStickers } from "./view/stickers";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

type Screen = "home" | "play";
let screen: Screen = "home";
let session: Session = startSession();
let selected: Pos | null = null;
let busy = false;
let clearing = new Set<string>();
let burstT = 0;
let burstStarted = 0;
let needsPaint = true;
let burstResolve: (() => void) | null = null;

function markDirty(): void {
  needsPaint = true;
}

function detectDpr(): number {
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;
  const cap = coarse ? 1.25 : 2;
  return Math.min(window.devicePixelRatio || 1, cap);
}

function resize(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dpr = detectDpr();
  const scale = Math.min(vw / W, vh / H);
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  markDirty();
}

function canvasPoint(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

function paint(): void {
  if (screen === "home") {
    drawHome(ctx);
    return;
  }
  drawPlay(ctx, session, { selected, clearing, burstT });
}

function isAnimating(): boolean {
  return busy || burstT > 0;
}

function tick(ts: number): void {
  if (burstStarted) {
    burstT = (ts - burstStarted) / 280;
    if (burstT >= 1) {
      burstT = 0;
      burstStarted = 0;
      clearing = new Set();
      const done = burstResolve;
      burstResolve = null;
      done?.();
    }
  }
  if (needsPaint || isAnimating()) {
    paint();
    needsPaint = isAnimating();
  }
  requestAnimationFrame(tick);
}

function playMatchBurst(keys: string[]): Promise<void> {
  return new Promise((resolve) => {
    busy = true;
    clearing = new Set(keys);
    burstStarted = performance.now();
    burstT = 0.01;
    burstResolve = () => {
      busy = false;
      resolve();
    };
    markDirty();
  });
}

async function handleSwap(a: Pos, b: Pos): Promise<void> {
  if (busy || session.status !== "playing") return;
  const started = beginSwap(session, a, b);
  selected = null;
  markDirty();
  if (!started.ok) return;

  let guard = 0;
  while (guard++ < 40 && session.status === "playing") {
    const groups = currentMatches(session);
    if (!groups.length) break;
    const keys = groups.flatMap((g) => g.cells.map((p) => `${p.c},${p.r}`));
    await playMatchBurst(keys);
    crushWave(session, groups);
    markDirty();
  }
  markDirty();
}

function onTap(x: number, y: number): void {
  if (screen === "home") {
    if (hitUi(HOME_PLAY, x, y)) {
      session = startSession();
      selected = null;
      screen = "play";
      markDirty();
    }
    return;
  }

  if (session.status !== "playing") {
    screen = "home";
    markDirty();
    return;
  }

  if (hitUi(PAUSE_BTN, x, y)) {
    screen = "home";
    markDirty();
    return;
  }

  if (busy) return;
  const layout = boardLayout();
  const hit = cellAt(layout, x, y);
  if (!hit) {
    selected = null;
    markDirty();
    return;
  }

  if (!selected) {
    selected = hit;
    markDirty();
    return;
  }

  if (selected.c === hit.c && selected.r === hit.r) {
    selected = null;
    markDirty();
    return;
  }

  if (areAdjacent(selected, hit)) {
    const from = selected;
    selected = null;
    void handleSwap(from, hit);
    return;
  }

  selected = hit;
  markDirty();
}

canvas.addEventListener(
  "pointerdown",
  (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const p = canvasPoint(e);
    onTap(p.x, p.y);
  },
  { passive: false },
);

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);

async function boot(): Promise<void> {
  resize();
  markDirty();
  requestAnimationFrame(tick);
  await loadStickers();
  markDirty();
}

boot();
