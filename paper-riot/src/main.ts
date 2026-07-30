import { areAdjacent, isPlayable } from "./core/board";
import { ZONES } from "./core/levels";
import { applyWin, loadProgress, saveProgress } from "./core/save";
import {
  beginSwap,
  crushWave,
  currentMatches,
  startSession,
  usePower,
  type Session,
} from "./core/session";
import type { Pos, PowerUpKind, Progress, ZoneId } from "./core/types";
import {
  W,
  H,
  HOME_PLAY,
  HOME_MAP,
  HOME_SETTINGS,
  PAUSE_BTN,
  MAP_BACK,
  MAP_PLAY,
  boardLayout,
  cellAt,
  cellCenter,
  drawHome,
  drawMap,
  drawPlay,
  hitPowerDock,
  hitUi,
  hitZoneTab,
  mapNodeAt,
} from "./view/draw";
import {
  burstAt,
  hasParticles,
  updateParticles,
} from "./view/particles";
import { loadGameArt } from "./view/stickers";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

type Screen = "home" | "map" | "play";
let screen: Screen = "home";
let progress: Progress = loadProgress();
let mapZone: ZoneId = "desk";
let selectedLevel = Math.min(progress.unlocked, 40);
let session: Session = startSession(selectedLevel);
let selected: Pos | null = null;
let armedPower: PowerUpKind | null = null;
let busy = false;
let clearing = new Set<string>();
let burstT = 0;
let burstStarted = 0;
let needsPaint = true;
let burstResolve: (() => void) | null = null;
let popFx: { x: number; y: number; t: number; started: number } | null = null;
let lastTs = 0;

function markDirty(): void {
  needsPaint = true;
}

function syncZoneFromLevel(id: number): void {
  const zi = Math.floor((id - 1) / 10);
  mapZone = ZONES[Math.max(0, Math.min(3, zi))]!.id;
}

function detectDpr(): number {
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;
  return Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 2);
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
    drawHome(ctx, progress);
    return;
  }
  if (screen === "map") {
    drawMap(ctx, progress, mapZone, selectedLevel);
    return;
  }
  drawPlay(ctx, session, {
    selected,
    clearing,
    burstT,
    armedPower,
    popFx: popFx ? { x: popFx.x, y: popFx.y, t: popFx.t } : null,
  });
}

function isAnimating(): boolean {
  return busy || burstT > 0 || hasParticles() || (popFx != null && popFx.t < 1);
}

function tick(ts: number): void {
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
  lastTs = ts;

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
  if (popFx) {
    popFx.t = (ts - popFx.started) / 420;
    if (popFx.t >= 1) popFx = null;
  }
  if (updateParticles(dt)) markDirty();

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
    const layout = boardLayout();
    for (const key of keys) {
      const [c, r] = key.split(",").map(Number);
      if (!isPlayable(session.mask, c!, r!)) continue;
      const center = cellCenter(layout, c!, r!);
      burstAt(center.x, center.y, 6);
    }
    if (keys.length) {
      const [c0, r0] = keys[0]!.split(",").map(Number);
      const mid = cellCenter(layout, c0!, r0!);
      popFx = { x: mid.x, y: mid.y, t: 0, started: performance.now() };
    }
    burstResolve = () => {
      busy = false;
      resolve();
    };
    markDirty();
  });
}

function recordWinIfCleared(): void {
  if (session.status !== "won") return;
  progress = applyWin(
    progress,
    session.level.id,
    session.movesLeft,
    session.level.moves,
  );
}

async function handleSwap(a: Pos, b: Pos): Promise<void> {
  if (busy || session.status !== "playing") return;
  const started = beginSwap(session, a, b);
  selected = null;
  markDirty();
  if (!started.ok) return;

  let guard = 0;
  while (guard++ < 40) {
    if (session.status !== "playing") break;
    const groups = currentMatches(session);
    if (!groups.length) break;
    const keys = groups.flatMap((g) => g.cells.map((p) => `${p.c},${p.r}`));
    await playMatchBurst(keys);
    crushWave(session, groups);
    markDirty();
  }
  recordWinIfCleared();
  markDirty();
}

async function handlePower(kind: PowerUpKind, target: Pos): Promise<void> {
  if (busy) return;
  const result = usePower(session, kind, target);
  armedPower = null;
  selected = null;
  markDirty();
  if (!result.ok) return;
  const keys = result.cleared.map((p) => `${p.c},${p.r}`);
  await playMatchBurst(keys);
  recordWinIfCleared();
  markDirty();
}

function openLevel(id: number): void {
  if (id > progress.unlocked) return;
  selectedLevel = id;
  syncZoneFromLevel(id);
  session = startSession(id);
  selected = null;
  armedPower = null;
  screen = "play";
  markDirty();
}

function onTap(x: number, y: number): void {
  if (screen === "home") {
    if (hitUi(HOME_PLAY, x, y)) {
      openLevel(Math.min(progress.unlocked, selectedLevel));
      return;
    }
    if (hitUi(HOME_MAP, x, y)) {
      syncZoneFromLevel(selectedLevel);
      screen = "map";
      markDirty();
      return;
    }
    if (hitUi(HOME_SETTINGS, x, y)) {
      // placeholder
      markDirty();
    }
    return;
  }

  if (screen === "map") {
    if (hitUi(MAP_BACK, x, y)) {
      screen = "home";
      markDirty();
      return;
    }
    const tab = hitZoneTab(x, y);
    if (tab) {
      const zi = ZONES.findIndex((z) => z.id === tab);
      if (progress.unlocked > zi * 10 || zi === 0) {
        mapZone = tab;
        const first = zi * 10 + 1;
        selectedLevel = Math.min(progress.unlocked, first);
        markDirty();
      }
      return;
    }
    const node = mapNodeAt(mapZone, x, y);
    if (node && node <= progress.unlocked) {
      selectedLevel = node;
      markDirty();
      return;
    }
    if (hitUi(MAP_PLAY, x, y)) {
      openLevel(selectedLevel);
    }
    return;
  }

  // play
  if (session.status !== "playing") {
    syncZoneFromLevel(session.level.id);
    screen = "map";
    markDirty();
    return;
  }

  if (hitUi(PAUSE_BTN, x, y)) {
    screen = "map";
    armedPower = null;
    markDirty();
    return;
  }

  const powerHit = hitPowerDock(x, y);
  if (powerHit) {
    if ((session.powers[powerHit] ?? 0) <= 0) return;
    armedPower = armedPower === powerHit ? null : powerHit;
    selected = null;
    markDirty();
    return;
  }

  if (busy) return;
  const layout = boardLayout();
  const hit = cellAt(layout, x, y);
  if (!hit || !isPlayable(session.mask, hit.c, hit.r)) {
    selected = null;
    markDirty();
    return;
  }

  if (armedPower) {
    void handlePower(armedPower, hit);
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
  progress = loadProgress();
  saveProgress(progress);
  syncZoneFromLevel(selectedLevel);
  resize();
  markDirty();
  requestAnimationFrame(tick);
  await loadGameArt();
  markDirty();
}

boot();
