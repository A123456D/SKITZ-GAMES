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
  HOME_THEME,
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
  hitButtonId,
  hitPowerDock,
  hitUi,
  hitZoneTab,
  mapNodeAt,
} from "./view/draw";
import {
  clearMotion,
  motionBusy,
  punchClearing,
  syncBoardMotion,
  updateMotion,
} from "./view/motion";
import {
  burstAt,
  hasParticles,
  stampFx,
  styleForPower,
  styleForTile,
  updateParticles,
} from "./view/particles";
import { loadGameArt, reloadThemeArt } from "./view/stickers";
import {
  isMuted,
  loadSfx,
  playSfx,
  powerSfx,
  toggleMute,
  unlockAudio,
} from "./view/audio";
import { countObstacles } from "./core/obstacles";
import { cycleTheme, initTheme } from "./view/theme";

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
let animTime = 0;
let hoverBtn: string | null = null;
let pressedBtn: string | null = null;

function markDirty(): void {
  needsPaint = true;
}

function syncVisuals(dropIn = false): void {
  syncBoardMotion(session.board, session.mask, boardLayout(), { dropIn });
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
  if (screen === "play") syncVisuals(false);
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
  const ui = { time: animTime, hover: hoverBtn, pressed: pressedBtn };
  if (screen === "home") {
    drawHome(ctx, progress, ui);
    return;
  }
  if (screen === "map") {
    drawMap(ctx, progress, mapZone, selectedLevel, ui);
    return;
  }
  drawPlay(ctx, session, {
    selected,
    clearing,
    burstT,
    armedPower,
    popFx: popFx ? { x: popFx.x, y: popFx.y, t: popFx.t } : null,
    time: animTime,
  });
}

function isAnimating(): boolean {
  return (
    screen === "home" ||
    screen === "map" ||
    screen === "play" ||
    busy ||
    burstT > 0 ||
    hasParticles() ||
    motionBusy() ||
    (popFx != null && popFx.t < 1)
  );
}

function waitMotion(): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const check = () => {
      if (!motionBusy() || performance.now() - start > 900) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

function tick(ts: number): void {
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
  lastTs = ts;
  animTime += dt;

  if (burstStarted) {
    burstT = (ts - burstStarted) / 300;
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
  if (updateMotion(dt)) markDirty();
  if (screen === "play") markDirty();

  if (needsPaint || isAnimating()) {
    paint();
    needsPaint = isAnimating();
  }
  requestAnimationFrame(tick);
}

function playMatchBurst(keys: string[], kindHint?: string): Promise<void> {
  return new Promise((resolve) => {
    busy = true;
    clearing = new Set(keys);
    burstStarted = performance.now();
    burstT = 0.01;
    const layout = boardLayout();
    const ids: number[] = [];
    const styles = new Map<string, number>();
    for (const key of keys) {
      const [c, r] = key.split(",").map(Number);
      if (!isPlayable(session.mask, c!, r!)) continue;
      const cell = session.board[c!]![r!];
      if (cell) {
        ids.push(cell.id);
        const st = styleForTile(cell.kind);
        styles.set(st, (styles.get(st) ?? 0) + 1);
      }
      const center = cellCenter(layout, c!, r!);
      const style = cell ? styleForTile(cell.kind) : styleForTile(kindHint ?? "star");
      burstAt(center.x, center.y, 5, style);
    }
    punchClearing(ids);
    if (keys.length) {
      const [c0, r0] = keys[0]!.split(",").map(Number);
      const mid = cellCenter(layout, c0!, r0!);
      let best = kindHint ? styleForTile(kindHint) : "puff";
      let bestN = 0;
      for (const [st, n] of styles) {
        if (n > bestN) {
          best = st as ReturnType<typeof styleForTile>;
          bestN = n;
        }
      }
      stampFx(mid.x, mid.y, best);
      popFx = { x: mid.x, y: mid.y, t: 0, started: performance.now() };
    }
    burstResolve = () => {
      busy = false;
      resolve();
    };
    markDirty();
  });
}

function countAllObstacles(): number {
  return countObstacles(session.board, session.mask, "any");
}

function playEndSting(): void {
  if (session.status === "won") playSfx("win", { vary: false });
  else if (session.status === "lost") playSfx("lose", { vary: false });
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
  if (!started.ok) {
    if (started.reason === "no-match" || started.reason === "blocked") {
      playSfx("swap-fail");
    }
    markDirty();
    return;
  }

  playSfx("swap");
  busy = true;
  syncVisuals(false);
  markDirty();
  await waitMotion();

  let guard = 0;
  let wave = 0;
  while (guard++ < 40) {
    if (session.status !== "playing") break;
    const groups = currentMatches(session);
    if (!groups.length) break;
    const keys = groups.flatMap((g) => g.cells.map((p) => `${p.c},${p.r}`));
    const hint = groups[0]?.kind;
    playSfx(wave === 0 ? "match" : "cascade");
    const beforeObs = countAllObstacles();
    await playMatchBurst(keys, hint);
    crushWave(session, groups);
    const peeled = beforeObs - countAllObstacles();
    if (peeled > 0) playSfx(peeled > 2 ? "crack" : "peel");
    else playSfx("drop", { volume: 0.55 });
    syncVisuals(true);
    markDirty();
    await waitMotion();
    wave++;
  }
  busy = false;
  playEndSting();
  recordWinIfCleared();
  markDirty();
}

async function handlePower(kind: PowerUpKind, target: Pos): Promise<void> {
  if (busy) return;
  busy = true;
  const layout = boardLayout();
  const center = cellCenter(layout, target.c, target.r);
  const pstyle = styleForPower(kind);
  stampFx(center.x, center.y, pstyle);
  popFx = { x: center.x, y: center.y, t: 0, started: performance.now() };
  playSfx(powerSfx(kind), { vary: false });

  const result = usePower(session, kind, target);
  armedPower = null;
  selected = null;
  if (!result.ok) {
    busy = false;
    markDirty();
    return;
  }
  for (const p of result.cleared) {
    const mid = cellCenter(layout, p.c, p.r);
    burstAt(mid.x, mid.y, 4, pstyle);
  }
  syncVisuals(true);
  markDirty();
  await waitMotion();
  busy = false;
  playEndSting();
  recordWinIfCleared();
  markDirty();
}

function openLevel(id: number): void {
  if (id > progress.unlocked) return;
  playSfx("ui-tap");
  selectedLevel = id;
  syncZoneFromLevel(id);
  session = startSession(id);
  selected = null;
  armedPower = null;
  clearMotion();
  syncVisuals(true);
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
      playSfx("ui-tap");
      syncZoneFromLevel(selectedLevel);
      screen = "map";
      markDirty();
      return;
    }
    if (hitUi(HOME_THEME, x, y)) {
      playSfx("ui-tap");
      const next = cycleTheme();
      void reloadThemeArt(next).then(() => markDirty());
      markDirty();
      return;
    }
    if (hitUi(HOME_SETTINGS, x, y)) {
      if (!isMuted()) {
        playSfx("mute-on", { vary: false });
        toggleMute();
      } else {
        toggleMute();
        playSfx("ui-tap");
      }
      markDirty();
    }
    return;
  }

  if (screen === "map") {
    if (hitUi(MAP_BACK, x, y)) {
      playSfx("ui-tap");
      screen = "home";
      markDirty();
      return;
    }
    const tab = hitZoneTab(x, y);
    if (tab) {
      const zi = ZONES.findIndex((z) => z.id === tab);
      if (progress.unlocked > zi * 10 || zi === 0) {
        playSfx("ui-tap");
        mapZone = tab;
        const first = zi * 10 + 1;
        selectedLevel = Math.min(progress.unlocked, first);
        markDirty();
      }
      return;
    }
    const node = mapNodeAt(mapZone, x, y);
    if (node && node <= progress.unlocked) {
      playSfx("select");
      selectedLevel = node;
      markDirty();
      return;
    }
    if (hitUi(MAP_PLAY, x, y)) {
      openLevel(selectedLevel);
    }
    return;
  }

  if (session.status !== "playing") {
    playSfx("ui-tap");
    syncZoneFromLevel(session.level.id);
    screen = "map";
    markDirty();
    return;
  }

  if (hitUi(PAUSE_BTN, x, y)) {
    playSfx("ui-tap");
    screen = "map";
    armedPower = null;
    markDirty();
    return;
  }

  const powerHit = hitPowerDock(x, y, session.level.id);
  if (powerHit) {
    if ((session.powers[powerHit] ?? 0) <= 0) return;
    playSfx("select");
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
    playSfx("select", { volume: 0.7 });
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

  playSfx("select", { volume: 0.7 });
  selected = hit;
  markDirty();
}

canvas.addEventListener(
  "pointerdown",
  (e) => {
    e.preventDefault();
    void unlockAudio();
    canvas.setPointerCapture(e.pointerId);
    const p = canvasPoint(e);
    pressedBtn = hitButtonId(screen, p.x, p.y);
    hoverBtn = pressedBtn;
    markDirty();
    onTap(p.x, p.y);
  },
  { passive: false },
);

canvas.addEventListener(
  "pointermove",
  (e) => {
    const p = canvasPoint(e);
    const next = hitButtonId(screen, p.x, p.y);
    if (next !== hoverBtn) {
      hoverBtn = next;
      markDirty();
    }
  },
  { passive: true },
);

canvas.addEventListener(
  "pointerup",
  () => {
    if (pressedBtn) {
      pressedBtn = null;
      markDirty();
    }
  },
  { passive: true },
);

canvas.addEventListener(
  "pointercancel",
  () => {
    pressedBtn = null;
    markDirty();
  },
  { passive: true },
);

canvas.addEventListener(
  "pointerleave",
  () => {
    hoverBtn = null;
    pressedBtn = null;
    markDirty();
  },
  { passive: true },
);

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);

async function boot(): Promise<void> {
  initTheme();
  progress = loadProgress();
  saveProgress(progress);
  syncZoneFromLevel(selectedLevel);
  clearMotion();
  syncVisuals(false);
  resize();
  markDirty();
  requestAnimationFrame(tick);
  await Promise.all([loadGameArt(), loadSfx()]);
  markDirty();
}

boot();
