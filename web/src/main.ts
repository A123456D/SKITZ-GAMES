import { DIFFICULTY_COUNT, generateLevel, levelTitle } from "./core/levelCatalog";
import { Kind } from "./core/cellKind";
import { getCell } from "./core/gridState";
import {
  commitRotationQ,
  canPulse,
  isFailed,
  loadLevel,
  pulse,
  pulsesRemaining,
  restart,
  selectTable,
  stars,
  tryRotate,
  undo,
  type PuzzleSession,
} from "./core/puzzleSession";
import { buildTutorialBasics, buildTutorialChannels, buildTutorialShowcase, buildThemePreviewLevel, SHOWCASE_POINTS, type PointBeat } from "./core/tutorialLevel";
import { buildState, type LevelData } from "./core/levelData";
import { solve } from "./core/networkSolver";
import { analyzeNetwork } from "./core/networkSolver";
import { tableContains } from "./core/tableDef";
import {
  clearActiveRun,
  completeTutorial,
  loadSave,
  recordClear,
  setTheme,
  setVolumes,
  setMusicMuted,
  storeActiveRun,
  type ActiveRunData,
  type SaveData,
} from "./app/save";
import { onMusicScreen, unlockMusic, skipMusicTrack, canSkipMusicNext } from "./audio/music";
import {
  unlockAudio,
  sfxBeamHit,
  sfxReceiverOn,
  sfxSnap,
  sfxTick,
  sfxWin,
  sfxFail,
  sfxPulse,
  sfxPopup,
} from "./audio/sfx";

function unlockAllAudio(): void {
  unlockAudio();
  unlockMusic();
}
import {
  W,
  H,
  boardLayout,
  cellCenter,
  drawBackground,
  drawBeams,
  drawCoachHint,
  drawFingerPointer,
  drawGearLink,
  drawGlassButton,
  drawHairlineGrid,
  drawHudStats,
  drawInfoCard,
  drawLogo,
  drawOptics,
  drawPointCoach,
  drawRetroConnections,
  drawRoundButton,
  drawTitle,
  drawVolumeSlider,
  drawMuteBox,
  drawWheel,
  hitCircle,
  hitRect,
  loadLogo,
  sliderValueAt,
  type ButtonRect,
  type Layout,
  type SliderRect,
} from "./view/draw";
import { clearFeel, drawFeel, triggerRouteAck, triggerVictoryFeel } from "./view/feel";
import type { TurnResult } from "./core/beamSolver";
import {
  THEME_LABELS,
  THEME_ORDER,
  THEMES,
  applyTheme,
  colors as P,
  getThemeId,
  type ThemeId,
} from "./view/palette";
import { font, loadUiFonts } from "./view/typography";

type Screen = "menu" | "levels" | "play" | "pause" | "settings" | "how" | "tutorial" | "theme_pick";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

/** Stretch the canvas to the visible viewport so phones never letterbox. */
function fitGameToViewport(): void {
  const vv = window.visualViewport;
  const w = Math.max(1, Math.round(vv?.width ?? window.innerWidth));
  const h = Math.max(1, Math.round(vv?.height ?? window.innerHeight));
  const left = Math.round(vv?.offsetLeft ?? 0);
  const top = Math.round(vv?.offsetTop ?? 0);
  canvas.style.left = `${left}px`;
  canvas.style.top = `${top}px`;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}
fitGameToViewport();
window.addEventListener("resize", fitGameToViewport);
window.visualViewport?.addEventListener("resize", fitGameToViewport);
window.visualViewport?.addEventListener("scroll", fitGameToViewport);

loadLogo();

// Per-theme selector logos, shown on the theme chips in place of palette swatches.
const themeLogoImgs: Partial<Record<ThemeId, HTMLImageElement>> = {};
const themeLogoReady: Partial<Record<ThemeId, boolean>> = {};
for (const id of THEME_ORDER) {
  const img = new Image();
  img.onload = () => {
    themeLogoReady[id] = true;
  };
  img.src = `./theme-logo-${id}.png`;
  themeLogoImgs[id] = img;
}

let save: SaveData = loadSave();
applyTheme(save.theme);

let screen: Screen = save.tutorialDone ? "menu" : "tutorial";
let settingsFrom: Screen = "menu";
let levelIndex = 0;
let levelPage = 0;
let playSeed = Date.now() >>> 0;
let session: PuzzleSession | null = null;
let layout: Layout | null = null;
let beamProgress = 1;
/** Button-driven quarter-turn: ease with a soft overshoot, then settle. */
let rotTween: { id: number; from: number; to: number; start: number; dur: number } | null = null;
let squashUntil = 0;
let squashId = -1;
let time = 0;
let buttons: ButtonRect[] = [];
let sliders: SliderRect[] = [];
let activeSlider: string | null = null;
let victory = false;
let pendingWin = false;
let winRevealAt = 0;
let victoryAlpha = 0;
let displayResult: TurnResult | null = null;
let howPage = 0;
let victoryFeelFired = false;
/** Hands-on tutorial run (cards ↔ pointing tour ↔ playable lessons). */
let inTutorial = !save.tutorialDone;
let tutorialPhase: "intro" | "point" | "play" = "intro";
let tutorialStep = 0;
let pointIndex = 0;
/** First-time theme picker: preview before confirm. */
let themePreview: ThemeId = save.theme;
/** Screen to return to after opening the global theme picker. */
let themePickFrom: Screen = "menu";

const PAGE_SIZE = 10;

type TutCard = { kind: "card"; title: string; body: string[]; nextLabel?: string };
type TutPoint = { kind: "point"; build: () => LevelData; points: PointBeat[] };
type TutPlay = { kind: "play"; build: () => LevelData; lesson: string };
type TutStep = TutCard | TutPoint | TutPlay;

const TUTORIAL_FLOW: TutStep[] = [
  {
    kind: "card",
    title: "WELCOME",
    body: [
      "Pulse Link is a dense circuit puzzle.",
      "Every cell is a disc. Turn them until",
      "every mark meets a neighbor — one network.",
    ],
    nextLabel: "MEET THE BOARD",
  },
  {
    kind: "point",
    build: buildTutorialShowcase,
    points: SHOWCASE_POINTS,
  },
  {
    kind: "card",
    title: "YOUR TURN",
    body: [
      "Practice on two short boards.",
      "Turn discs, then PULSE to check.",
      "Undo and Reset are there to help.",
    ],
    nextLabel: "TRY LESSON 1",
  },
  { kind: "play", build: buildTutorialBasics, lesson: "1 / 2 · Close the ring" },
  {
    kind: "card",
    title: "ONE NETWORK",
    body: [
      "Larger boards stay one circuit.",
      "No open stubs. No separate islands.",
      "Ambiguity grows with size — that is the game.",
    ],
    nextLabel: "TRY LESSON 2",
  },
  { kind: "play", build: buildTutorialChannels, lesson: "2 / 2 · Full board" },
  {
    kind: "card",
    title: "YOU'RE READY",
    body: [
      "Close every end. One network. Stay in the pulse budget.",
      "Next — pick a look for the game.",
    ],
    nextLabel: "PICK A THEME",
  },
];

const TUTORIAL_PAGES: { title: string; body: string[] }[] = [
  {
    title: "WELCOME",
    body: [
      "Every cell is a disc in one tiled circuit.",
      "Marks show which sides are open.",
      "Turn them until everything meets.",
    ],
  },
  {
    title: "TURN DISCS",
    body: [
      "Tap a disc to select it.",
      "Drag around it, or use ↺ ↻, to rotate.",
      "Open sides must face a matching neighbor.",
    ],
  },
  {
    title: "PULSE TO CHECK",
    body: [
      "Connections stay hidden until you PULSE.",
      "Pulses are scarce — think, then fire.",
      "Win when there are no open ends and one network.",
    ],
  },
  {
    title: "THE RULE",
    body: [
      "Every open mark must meet another.",
      "The whole board must be one connected circuit.",
      "That is it — no other verbs.",
    ],
  },
  {
    title: "WIN",
    body: [
      "No open ends. One network.",
      "Within your pulse budget.",
      "That is the whole game — close the circuit.",
    ],
  },
];

function tutCardIndex(): number {
  const step = TUTORIAL_FLOW[tutorialStep];
  if (!step || step.kind !== "card") return 0;
  let n = 0;
  for (let i = 0; i < tutorialStep; i++) {
    if (TUTORIAL_FLOW[i]!.kind === "card") n++;
  }
  return n;
}

function tutCardCount(): number {
  return TUTORIAL_FLOW.filter((s) => s.kind === "card").length;
}

function currentPointBeats(): PointBeat[] {
  const step = TUTORIAL_FLOW[tutorialStep];
  return step?.kind === "point" ? step.points : [];
}

function freshSeed(): number {
  return (Math.imul(Date.now() ^ (Math.random() * 0xffffffff), 0x9e3779b9) >>> 0) || 1;
}

function pageCount(): number {
  return Math.ceil(DIFFICULTY_COUNT / PAGE_SIZE);
}

type DragState = {
  tableId: number;
  startAngle: number;
  baseRot: number;
  lastTickQ: number;
  liveAngle: number;
};
let drag: DragState | null = null;

// Tables that have been turned settle onto the board (stop hovering).
let settledTables = new Set<number>();
// Tap-to-explain card for the current level.
let inspect: { title: string; body: string } | null = null;
let inspectClose: ButtonRect | null = null;

const SYMBOL_INFO: Record<number, { title: string; body: string }> = {
  [Kind.EMITTER]: {
    title: "EMITTER · START",
    body: "The source. It fires a beam outward in the arrow's direction when you PULSE.",
  },
  [Kind.RECEIVER]: {
    title: "RECEIVER · FINISH",
    body: "The goal. Light it with the matching channel to complete the circuit.",
  },
};

function dismissInspect(): void {
  inspect = null;
  inspectClose = null;
}

function inspectCellAt(x: number, y: number): boolean {
  if (!session || !layout) return false;
  const s = layout.cell + layout.gap;
  const cx = Math.floor((x - layout.origin.x) / s);
  const cy = Math.floor((y - layout.origin.y) / s);
  if (cx < 0 || cy < 0 || cx >= session.state.width || cy >= session.state.height) return false;
  const cell = getCell(session.state, cx, cy);
  // Walls and tables have no explain card
  if (cell.kind === Kind.WALL || cell.kind === Kind.EMPTY) return false;
  const info = SYMBOL_INFO[cell.kind];
  if (!info) return false;
  inspect = info;
  return true;
}

function clearWinState(): void {
  victory = false;
  pendingWin = false;
  winRevealAt = 0;
  victoryAlpha = 0;
  victoryFeelFired = false;
}

function startLevel(i: number, newSeed = true): void {
  inTutorial = false;
  tutorialPhase = "intro";
  levelIndex = Math.max(0, Math.min(DIFFICULTY_COUNT - 1, i));
  if (newSeed) playSeed = freshSeed();
  const level = generateLevel(levelIndex + 1, playSeed);
  session = loadLevel(level);
  layout = boardLayout(session.state);
  beamProgress = 1;
  drag = null;
  displayResult = session.result;
  settledTables = new Set();
  rotTween = null;
  squashUntil = 0;
  squashId = -1;
  dismissInspect();
  clearWinState();
  clearFeel();
  screen = "play";
  persistRun();
}

function runRotations(): number[] {
  return session?.state.tables.map((t) => t.rotationQ) ?? [];
}

function persistRun(): void {
  if (!session || inTutorial) return;
  const run: ActiveRunData = {
    levelIndex,
    seed: playSeed,
    rotations: runRotations(),
    historyRotations: session.history.map((state) => state.tables.map((t) => t.rotationQ)),
    moves: session.moves,
    undosRemaining: session.undosRemaining,
    pulsesUsed: session.pulsesUsed,
    beamsVisible: session.beamsVisible,
    selectedTable: session.selectedTable,
  };
  storeActiveRun(save, run);
}

function restoreSavedRun(): boolean {
  const run = save.activeRun;
  if (!run) return false;
  if (
    !Number.isInteger(run.levelIndex) ||
    run.levelIndex < 0 ||
    run.levelIndex >= DIFFICULTY_COUNT ||
    !Number.isFinite(run.seed) ||
    !Array.isArray(run.rotations)
  ) {
    clearActiveRun(save);
    return false;
  }

  levelIndex = run.levelIndex;
  playSeed = run.seed >>> 0;
  session = loadLevel(generateLevel(levelIndex + 1, playSeed));
  const applyRotations = (tables: PuzzleSession["state"]["tables"], rotations: number[]): void => {
    tables.forEach((table, i) => {
      const q = rotations[i];
      if (Number.isFinite(q)) table.rotationQ = ((Math.round(q) % 4) + 4) % 4;
    });
  };
  applyRotations(session.state.tables, run.rotations);
  session.history = (Array.isArray(run.historyRotations) ? run.historyRotations : []).map((rotations) => {
    const snapshot = buildState(session!.level);
    applyRotations(snapshot.tables, rotations);
    return snapshot;
  });
  session.moves = Math.max(0, Number(run.moves) || 0);
  session.undosRemaining = Number.POSITIVE_INFINITY;
  session.pulsesUsed = Math.max(0, Number(run.pulsesUsed) || 0);
  session.selectedTable = Number.isInteger(run.selectedTable) ? run.selectedTable : -1;
  session.beamsVisible = !!run.beamsVisible;
  session.latent = solve(session.state);
  session.latent.won = false;
  if (session.beamsVisible) {
    session.result = solve(session.state);
    session.prevLit = new Set(session.result.energizedReceivers.map((p) => `${p.x},${p.y}`));
  }
  layout = boardLayout(session.state);
  displayResult = session.result;
  beamProgress = 1;
  settledTables = new Set(session.state.tables.map((t) => t.id));
  clearWinState();
  if (session.result.won) pendingWin = true;
  screen = "play";
  return true;
}

function beginTutorial(): void {
  inTutorial = true;
  tutorialStep = 0;
  pointIndex = 0;
  session = null;
  layout = null;
  clearWinState();
  clearFeel();
  showTutorialStep();
}

function showTutorialStep(): void {
  const step = TUTORIAL_FLOW[tutorialStep];
  if (!step) {
    finishTutorialFlow();
    return;
  }
  if (step.kind === "card") {
    tutorialPhase = "intro";
    screen = "tutorial";
    return;
  }
  if (step.kind === "point") {
    startPointTour(step);
    return;
  }
  startTutorialBoard(step);
}

function startPointTour(step: TutPoint): void {
  inTutorial = true;
  tutorialPhase = "point";
  pointIndex = 0;
  const level = step.build();
  session = loadLevel(level);
  layout = boardLayout(session.state);
  beamProgress = 1;
  drag = null;
  displayResult = session.result;
  settledTables = new Set();
  rotTween = null;
  squashUntil = 0;
  squashId = -1;
  dismissInspect();
  clearWinState();
  clearFeel();
  screen = "play";
}

function startTutorialBoard(step?: TutPlay): void {
  const play = step ?? (TUTORIAL_FLOW[tutorialStep] as TutPlay);
  if (!play || play.kind !== "play") return;
  inTutorial = true;
  tutorialPhase = "play";
  const level = play.build();
  session = loadLevel(level);
  layout = boardLayout(session.state);
  beamProgress = 1;
  drag = null;
  displayResult = session.result;
  settledTables = new Set();
  rotTween = null;
  squashUntil = 0;
  squashId = -1;
  dismissInspect();
  clearWinState();
  clearFeel();
  const firstOpen = session.state.tables.find((t) => !t.locked);
  if (firstOpen) selectTable(session, firstOpen.id);
  screen = "play";
}

function advanceTutorial(): void {
  tutorialStep += 1;
  pointIndex = 0;
  if (tutorialStep >= TUTORIAL_FLOW.length) {
    finishTutorialFlow();
    return;
  }
  showTutorialStep();
}

function finishTutorialFlow(): void {
  completeTutorial(save);
  save = loadSave();
  inTutorial = false;
  tutorialPhase = "intro";
  tutorialStep = 0;
  pointIndex = 0;
  session = null;
  clearWinState();
  themePreview = getThemeId();
  applyTheme(themePreview);
  themePickFrom = "menu";
  screen = "theme_pick";
}

function pointTargetPos(beat: PointBeat): { x: number; y: number } | null {
  if (!layout || !session) return null;
  const at = beat.at;
  if (at.kind === "cell") return cellCenter(layout, { x: at.x, y: at.y });
  if (at.kind === "table") {
    const t = session.state.tables.find((tb) => tb.id === at.id);
    return t ? cellCenter(layout, t.hub) : null;
  }
  if (at.id === "pulse") return { x: 282, y: 1094 };
  if (at.id === "turn") return { x: 175, y: 1228 };
  return null;
}

function drawPointTourOverlay(): void {
  const beats = currentPointBeats();
  const beat = beats[pointIndex];
  if (!beat || !layout) return;

  const pos = pointTargetPos(beat);
  if (pos) drawFingerPointer(ctx, pos.x, pos.y, time);

  // When the tour points at turn/pulse, show those controls dimmed for context.
  if (beat.at.kind === "ui") {
    const undoBtn: ButtonRect = { x: 28, y: 1068, w: 130, h: 52, id: "noop" };
    const pulseBtn: ButtonRect = { x: 172, y: 1068, w: 220, h: 52, id: "noop" };
    const resetBtn: ButtonRect = { x: 406, y: 1068, w: 130, h: 52, id: "noop" };
    const menuBtn: ButtonRect = { x: 550, y: 1068, w: 142, h: 52, id: "noop" };
    drawGlassButton(ctx, undoBtn, "UNDO", false, time, false);
    drawGlassButton(ctx, pulseBtn, "PULSE", beat.at.id === "pulse", time, false);
    drawGlassButton(ctx, resetBtn, "RESET", false, time, false);
    drawGlassButton(ctx, menuBtn, "MENU", false, time, false);
    const rotR = 56;
    drawRoundButton(ctx, 175, 1228, rotR, "↺", beat.at.id === "turn", time);
    drawRoundButton(ctx, 545, 1228, rotR, "↻", beat.at.id === "turn", time);
  }

  const targetLow =
    beat.at.kind === "ui" || (beat.at.kind === "cell" && beat.at.y >= 3);
  const coach = drawPointCoach(
    ctx,
    beat.title,
    beat.body,
    pointIndex,
    beats.length,
    pointIndex > 0,
    targetLow ? "top" : "bottom",
  );
  if (coach.prev) {
    drawGlassButton(ctx, coach.prev, "BACK", false, time);
    buttons.push(coach.prev);
  }
  const nextLabel = pointIndex < beats.length - 1 ? "NEXT" : "START PRACTICE";
  drawGlassButton(ctx, coach.next, nextLabel, true, time);
  buttons.push(coach.next);
  buttons.push(coach.skip);
}

/** Only ack optics when beams are actually visible (after PULSE) — never leak latent routes. */
function ackVisibleRoute(): void {
  if (!session || !layout || !session.beamsVisible) return;
  triggerRouteAck(session.state, layout, session.result, time);
}

function fireVictoryFeel(): void {
  if (!session || !layout || victoryFeelFired) return;
  victoryFeelFired = true;
  triggerVictoryFeel(layout, session.result.energizedReceivers, time);
}

function playEvents(before: TurnResult, after: TurnResult): void {
  if (after.beams.length > before.beams.length) sfxBeamHit();
  if (after.energizedReceivers.length > before.energizedReceivers.length) sfxReceiverOn();
}

// Resume a saved puzzle after the module has finished declaring helpers.
if (save.tutorialDone) restoreSavedRun();

function doRotate(dq: number): void {
  if (!session || victory || pendingWin) return;
  if (session.selectedTable < 0) return;
  const rotatedId = session.selectedTable;
  const before = session.state.tables.find((t) => t.id === rotatedId);
  if (!before) return;
  const from = before.rotationQ * (Math.PI / 2);
  if (!tryRotate(session, session.selectedTable, dq)) return;
  const after = session.state.tables.find((t) => t.id === rotatedId)!;
  // Shortest angular path for the tween (±π/2 typically).
  let to = after.rotationQ * (Math.PI / 2);
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  to = from + delta;
  rotTween = { id: rotatedId, from, to, start: time, dur: 0.11 };
  squashId = rotatedId;
  squashUntil = time + 0.14;
  settledTables.add(rotatedId);
  displayResult = session.result;
  beamProgress = 1;
  sfxSnap();
  persistRun();
}

function doPulse(): void {
  if (!session || victory || pendingWin) return;
  dismissInspect();
  const before = session.result;
  if (!pulse(session)) return;
  sfxPulse();
  displayResult = session.result;
  beamProgress = 0;
  playEvents(before, session.result);
  ackVisibleRoute();
  if (session.result.won) {
    pendingWin = true;
    winRevealAt = 0;
  } else if (isFailed(session)) {
    sfxFail();
    sfxPopup();
  } else if ((session.result.spillReceivers?.length ?? 0) > 0) {
    sfxFail();
  }
  persistRun();
}

function visualRot(tableId: number): number {
  const t = session!.state.tables.find((x) => x.id === tableId)!;
  if (drag && drag.tableId === tableId) return drag.liveAngle;
  // A geared partner spins live while the other disc is dragged.
  if (drag && t.link && t.link.partner === drag.tableId) {
    const dragged = session!.state.tables.find((x) => x.id === drag!.tableId)!;
    const delta = drag.liveAngle - dragged.rotationQ * (Math.PI / 2);
    return t.rotationQ * (Math.PI / 2) + delta * t.link.sign;
  }
  if (rotTween && rotTween.id === tableId) {
    const u = Math.min(1, (time - rotTween.start) / rotTween.dur);
    // Ease-out with a hair of overshoot — paper detent, not rubber.
    const over = u < 1 ? 1 - Math.pow(1 - u, 3) : 1;
    const bump = u < 1 ? Math.sin(u * Math.PI) * 0.06 * Math.sign(rotTween.to - rotTween.from) : 0;
    if (u >= 1) rotTween = null;
    else return rotTween.from + (rotTween.to - rotTween.from) * over + bump;
  }
  return t.rotationQ * (Math.PI / 2);
}

function discSquash(tableId: number): number {
  if (squashId !== tableId || time > squashUntil) return 1;
  const u = 1 - (squashUntil - time) / 0.14;
  // Brief vertical settle: 1.0 → 0.94 → 1.0
  return 1 - 0.06 * Math.sin(Math.min(1, u) * Math.PI);
}

function angleAt(x: number, y: number, tableId: number): number {
  const t = session!.state.tables.find((tb) => tb.id === tableId)!;
  const hub = cellCenter(layout!, t.hub);
  return Math.atan2(y - hub.y, x - hub.x);
}

function canvasPos(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

function hitTable(x: number, y: number): number {
  if (!session || !layout) return -1;
  for (const t of session.state.tables) {
    const hub = cellCenter(layout, t.hub);
    const diamCells = Math.max(1, t.radius * 2 + 1);
    const r = Math.max(layout.cell * 0.62, (diamCells * (layout.cell + layout.gap) * 0.62) / 2);
    if (hitCircle(x, y, hub.x, hub.y, r)) return t.id;
  }
  const s = layout.cell + layout.gap;
  const cx = Math.floor((x - layout.origin.x) / s);
  const cy = Math.floor((y - layout.origin.y) / s);
  if (cx < 0 || cy < 0 || cx >= session.state.width || cy >= session.state.height) return -1;
  for (const t of session.state.tables) {
    if (tableContains(t, { x: cx, y: cy })) return t.id;
  }
  return -1;
}

function openSettings(from: Screen): void {
  settingsFrom = from;
  screen = "settings";
}

function applySlider(id: string, value: number): void {
  if (id === "vol_music") {
    // Dragging music volume unmutes so the slider is audible again.
    if (save.musicMuted) setMusicMuted(save, false);
    setVolumes(save, value, save.sfxVol);
  }
  if (id === "vol_sfx") setVolumes(save, save.musicVol, value);
}

canvas.addEventListener(
  "pointerdown",
  (e) => {
    e.preventDefault();
    unlockAllAudio();
    const p = canvasPos(e);

    // Close X on the explain card
    if (inspect && inspectClose && hitRect(p.x, p.y, inspectClose)) {
      dismissInspect();
      return;
    }

    // Any other tap while a card is open just dismisses it
    if (inspect) {
      dismissInspect();
      return;
    }

    for (const s of sliders) {
      if (hitRect(p.x, p.y, s)) {
        activeSlider = s.id;
        applySlider(s.id, sliderValueAt(s, p.x));
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }
    for (const b of buttons) {
      if (hitRect(p.x, p.y, b)) {
        onButton(b.id);
        return;
      }
    }
    if (screen === "play" && session && !victory && !pendingWin && tutorialPhase !== "point") {
      const tid = hitTable(p.x, p.y);
      if (tid >= 0) {
        const t = session.state.tables.find((x) => x.id === tid)!;
        // Tables have no explain card — only select / drag
        if (t.locked) {
          selectTable(session, tid);
          return;
        }
        selectTable(session, tid);
        const a = angleAt(p.x, p.y, tid);
        drag = {
          tableId: tid,
          startAngle: a,
          baseRot: t.rotationQ * (Math.PI / 2),
          lastTickQ: t.rotationQ,
          liveAngle: t.rotationQ * (Math.PI / 2),
        };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      inspectCellAt(p.x, p.y);
    }
  },
  { passive: false },
);

canvas.addEventListener("pointermove", (e) => {
  const p = canvasPos(e);
  if (activeSlider) {
    const s = sliders.find((x) => x.id === activeSlider);
    if (s) applySlider(s.id, sliderValueAt(s, p.x));
    return;
  }
  if (!drag || !session) return;
  let delta = angleAt(p.x, p.y, drag.tableId) - drag.startAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  drag.liveAngle = drag.baseRot + delta;
  const previewQ = Math.round(drag.liveAngle / (Math.PI / 2));
  if (previewQ !== drag.lastTickQ) {
    drag.lastTickQ = previewQ;
    sfxTick();
  }
});

canvas.addEventListener("pointerup", () => {
  if (activeSlider) {
    activeSlider = null;
    return;
  }
  if (!drag || !session) return;
  const tableId = drag.tableId;
  const snapQ = Math.round(drag.liveAngle / (Math.PI / 2));
  drag = null;
  const changed = commitRotationQ(session, tableId, snapQ);
  displayResult = session.result;
  beamProgress = 1;
  if (changed) {
    settledTables.add(tableId);
    sfxSnap();
    persistRun();
  }
});

canvas.addEventListener("pointercancel", () => {
  activeSlider = null;
  if (!session || !drag) return;
  drag = null;
  displayResult = session.result;
});

window.addEventListener("pagehide", persistRun);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persistRun();
});

function onButton(id: string): void {
  unlockAllAudio();
  if (id === "music_next") {
    skipMusicTrack(1);
    return;
  }
  if (id === "mute_music") {
    setMusicMuted(save, !save.musicMuted);
    return;
  }
  if (id === "change_theme") {
    persistRun();
    themePickFrom = screen;
    themePreview = getThemeId();
    applyTheme(themePreview);
    screen = "theme_pick";
    return;
  }
  if (id === "play") {
    if (session && !inTutorial) {
      screen = "play";
      return;
    }
    if (restoreSavedRun()) return;
    const first = Math.min(save.lastLevelIndex, DIFFICULTY_COUNT - 1);
    startLevel(Math.max(0, first), true);
    return;
  }
  if (id === "levels") {
    levelPage = Math.min(pageCount() - 1, Math.floor(Math.max(0, save.unlocked - 1) / PAGE_SIZE));
    screen = "levels";
    return;
  }
  if (id === "menu") {
    // In-game pause — never leave the site / clear the run
    if (inTutorial && (tutorialPhase === "play" || tutorialPhase === "point") && session) {
      inTutorial = false;
      tutorialPhase = "intro";
      session = null;
      clearWinState();
      screen = "menu";
      return;
    }
    if (session) {
      screen = "pause";
      clearWinState();
    } else {
      screen = "menu";
    }
    return;
  }
  if (id === "tutorial") {
    beginTutorial();
    return;
  }
  if (id === "pause_resume") {
    screen = "play";
    return;
  }
  if (id === "pause_levels") {
    session = null;
    clearWinState();
    screen = "levels";
    return;
  }
  if (id === "home" || id === "main_menu") {
    goHome();
    return;
  }
  if (id === "settings") {
    openSettings(screen === "play" || screen === "pause" ? "pause" : "menu");
    return;
  }
  if (id === "settings_back") {
    if ((settingsFrom === "pause" || settingsFrom === "play") && session) screen = "play";
    else screen = settingsFrom === "pause" ? "menu" : settingsFrom;
    return;
  }
  if (id === "how") {
    howPage = 0;
    screen = "how";
    return;
  }
  if (id === "how_next") {
    if (howPage < TUTORIAL_PAGES.length - 1) howPage += 1;
    return;
  }
  if (id === "how_prev") {
    howPage = Math.max(0, howPage - 1);
    return;
  }
  if (id === "point_next") {
    const beats = currentPointBeats();
    if (pointIndex < beats.length - 1) pointIndex += 1;
    else advanceTutorial();
    return;
  }
  if (id === "point_prev") {
    pointIndex = Math.max(0, pointIndex - 1);
    return;
  }
  if (id === "point_skip") {
    advanceTutorial();
    return;
  }
  if (id === "tut_next") {
    advanceTutorial();
    return;
  }
  if (id === "tut_prev") {
    do {
      tutorialStep = Math.max(0, tutorialStep - 1);
    } while (
      tutorialStep > 0 &&
      (TUTORIAL_FLOW[tutorialStep]!.kind === "play" || TUTORIAL_FLOW[tutorialStep]!.kind === "point")
    );
    showTutorialStep();
    return;
  }
  if (id === "tut_skip") {
    finishTutorialFlow();
    return;
  }
  if (id === "tut_continue") {
    advanceTutorial();
    return;
  }
  if (id === "tut_retry") {
    const step = TUTORIAL_FLOW[tutorialStep];
    if (step?.kind === "play") startTutorialBoard(step);
    return;
  }
  if (id === "theme_confirm") {
    setTheme(save, themePreview);
    if ((themePickFrom === "play" || themePickFrom === "pause") && session) {
      screen = "play";
    } else if (
      themePickFrom === "menu" ||
      themePickFrom === "levels" ||
      themePickFrom === "settings" ||
      themePickFrom === "how"
    ) {
      screen = themePickFrom;
    } else {
      screen = "menu";
    }
    return;
  }
  if (id.startsWith("theme_")) {
    const theme = id.slice(6) as ThemeId;
    if (theme in THEMES) {
      if (screen === "theme_pick") {
        // Preview only — Confirm locks it in.
        themePreview = theme;
        applyTheme(theme);
      } else {
        setTheme(save, theme);
      }
    }
    return;
  }
  if (id === "page_prev") {
    levelPage = Math.max(0, levelPage - 1);
    return;
  }
  if (id === "page_next") {
    levelPage = Math.min(pageCount() - 1, levelPage + 1);
    return;
  }
  if (id.startsWith("lvl_")) {
    const i = Number(id.slice(4));
    if (i < save.unlocked) startLevel(i, true);
    return;
  }
  if (!session) return;
  if (id === "ccw") doRotate(-1);
  if (id === "cw") doRotate(1);
  if (id === "pulse") doPulse();
  if (id === "undo") {
    undo(session);
    layout = boardLayout(session.state);
    clearWinState();
    displayResult = session.result;
    beamProgress = 1;
    persistRun();
  }
  if (id === "reset") {
    restart(session);
    layout = boardLayout(session.state);
    clearWinState();
    settledTables = new Set();
  rotTween = null;
  squashUntil = 0;
  squashId = -1;
    dismissInspect();
    displayResult = session.result;
    beamProgress = 1;
    drag = null;
    persistRun();
  }
  if (id === "next") {
    if (inTutorial) {
      advanceTutorial();
      return;
    }
    const n = levelIndex + 1;
    if (n < DIFFICULTY_COUNT && n < save.unlocked) startLevel(n, true);
    else {
      screen = "levels";
      session = null;
      clearWinState();
    }
  }
  if (id === "replay") {
    if (inTutorial) {
      const step = TUTORIAL_FLOW[tutorialStep];
      if (step?.kind === "play") startTutorialBoard(step);
      return;
    }
    startLevel(levelIndex, true);
  }
}

function commitVictory(): void {
  if (!session || victory) return;
  if (!inTutorial) {
    const s = stars(session);
    recordClear(save, session.level.id, levelIndex, s, session.moves);
    save = loadSave();
  }
  victory = true;
  pendingWin = false;
  sfxPopup();
  sfxWin();
}

function roundRectPath(
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

function drawThemeChip(rect: ButtonRect, id: ThemeId, active: boolean): void {
  const t = THEMES[id];
  const r = 12;
  ctx.save();
  // Card drop shadow.
  ctx.shadowColor = "rgba(20,16,12,0.32)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.fillStyle = t.PAPER;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const img = themeLogoImgs[id];
  if (img && themeLogoReady[id]) {
    // Cover-fit the square theme logo so its own art fills the chip.
    ctx.save();
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
    ctx.clip();
    const iw = img.naturalWidth || 1;
    const ih = img.naturalHeight || 1;
    const scale = Math.max(rect.w / iw, rect.h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, rect.x + (rect.w - dw) / 2, rect.y + (rect.h - dh) / 2, dw, dh);
    // Bottom scrim so the label always reads over the art.
    const band = 28;
    const g = ctx.createLinearGradient(0, rect.y + rect.h - band, 0, rect.y + rect.h);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y + rect.h - band, rect.w, band);
    ctx.restore();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = font(800, 12);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(THEME_LABELS[id], rect.x + rect.w / 2, rect.y + rect.h - 9);
  } else {
    // Fallback swatch trio while the logo art loads.
    const sw = (rect.w - 20) / 3;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle =
        i === 0
          ? t.TABLE_FILL
          : i === 1
            ? id === "punk"
              ? t.INK_SOFT
              : t.INK
            : id === "punk"
              ? t.SELECT
              : t.PAPER_DARK;
      ctx.beginPath();
      ctx.arc(rect.x + 14 + i * (sw + 4) + sw / 2, rect.y + 28, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = t.OBJ;
    ctx.font = font(700, 11);
    ctx.textAlign = "center";
    ctx.fillText(THEME_LABELS[id], rect.x + rect.w / 2, rect.y + 58);
  }

  // Border + active highlight on top.
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.strokeStyle = active ? t.SELECT : "rgba(255,255,255,0.28)";
  ctx.lineWidth = active ? 3 : 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawThemeGrid(y0: number): void {
  const gap = 10;
  const tw = 150;
  const cols = 2;
  const totalW = cols * tw + (cols - 1) * gap;
  const startX = (W - totalW) / 2;
  const active = getThemeId();
  THEME_ORDER.forEach((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rect: ButtonRect = {
      x: startX + col * (tw + gap),
      y: y0 + row * (78 + gap),
      w: tw,
      h: 78,
      id: `theme_${id}`,
    };
    drawThemeChip(rect, id, id === active);
    buttons.push(rect);
  });
}

function pushVolumeSliders(y: number): void {
  // Separate MUSIC and SFX blocks with clear breathing room.
  const music: SliderRect = {
    x: 64,
    y,
    w: 480,
    h: 64,
    id: "vol_music",
    value: save.musicVol,
    labelW: 96,
  };
  const mute: ButtonRect = {
    x: 560,
    y: y + 10,
    w: 44,
    h: 44,
    id: "mute_music",
  };
  const sfxY = y + 118;
  const sfx: SliderRect = {
    x: 64,
    y: sfxY,
    w: 592,
    h: 64,
    id: "vol_sfx",
    value: save.sfxVol,
    labelW: 64,
  };

  ctx.save();
  ctx.fillStyle = P.INK_SOFT;
  ctx.font = font(600, 13);
  ctx.textAlign = "left";
  ctx.fillText("MUSIC", 64, y - 14);
  ctx.fillText("SOUND EFFECTS", 64, sfxY - 14);
  ctx.restore();

  drawVolumeSlider(ctx, music, "MUS", time);
  drawMuteBox(ctx, mute, save.musicMuted);
  drawVolumeSlider(ctx, sfx, "SFX", time);
  sliders.push(music, sfx);
  buttons.push(mute);
}

function drawInfoPages(
  pages: typeof TUTORIAL_PAGES,
  page: number,
  opts: {
    nextId: string;
    prevId: string;
    backId?: string;
    nextLabel?: string;
    backLabel?: string;
  },
): void {
  buttons = [];
  sliders = [];
  drawBackground(ctx, time);
  drawLogo(ctx, W / 2, 36, 260);
  const p = pages[page];
  ctx.fillStyle = P.INK;
  ctx.font = font(700, 28);
  ctx.textAlign = "center";
  ctx.fillText(p.title, W / 2, 360);
  ctx.fillStyle = P.INK_SOFT;
  ctx.font = font(500, 18);
  p.body.forEach((line, i) => ctx.fillText(line, W / 2, 420 + i * 36));
  ctx.fillStyle = P.INK_FAINT;
  ctx.font = font(600, 14);
  ctx.fillText(`${page + 1} / ${pages.length}`, W / 2, 560);

  if (page > 0) {
    const prev: ButtonRect = { x: 80, y: 980, w: 200, h: 58, id: opts.prevId };
    drawGlassButton(ctx, prev, "BACK", false, time);
    buttons.push(prev);
  }
  const next: ButtonRect = {
    x: page > 0 ? 300 : 120,
    y: 980,
    w: page > 0 ? 340 : 480,
    h: 58,
    id: opts.nextId,
  };
  drawGlassButton(ctx, next, opts.nextLabel ?? (page < pages.length - 1 ? "NEXT" : "DONE"), true, time);
  buttons.push(next);
  if (opts.backId) {
    const menu: ButtonRect = { x: 120, y: 1060, w: 480, h: 56, id: opts.backId };
    drawGlassButton(ctx, menu, opts.backLabel ?? "MAIN MENU", false, time);
    buttons.push(menu);
  }
}

function goHome(): void {
  // Always the in-game Pulse Link menu (PLAY / LEVELS / …). Never leave the iframe.
  persistRun();
  dismissInspect();
  inTutorial = false;
  tutorialPhase = "intro";
  clearWinState();
  screen = "menu";
}

function drawMenu(): void {
  buttons = [];
  sliders = [];
  drawBackground(ctx, time);
  // Mark + wordmark; keep clear of the PLAY stack starting at y 450.
  drawLogo(ctx, W / 2, 72, 320);
  const play: ButtonRect = { x: 120, y: 450, w: 480, h: 68, id: "play" };
  const levelsBtn: ButtonRect = { x: 120, y: 535, w: 480, h: 60, id: "levels" };
  const tutBtn: ButtonRect = { x: 120, y: 610, w: 480, h: 60, id: "tutorial" };
  const howBtn: ButtonRect = { x: 120, y: 685, w: 480, h: 60, id: "how" };
  const settingsBtn: ButtonRect = { x: 120, y: 760, w: 480, h: 60, id: "settings" };
  drawGlassButton(ctx, play, session && !inTutorial ? "RESUME" : "PLAY", true, time);
  drawGlassButton(ctx, levelsBtn, `LEVELS · ${DIFFICULTY_COUNT}`, false, time);
  drawGlassButton(ctx, tutBtn, "TUTORIAL", false, time);
  drawGlassButton(ctx, howBtn, "HOW TO PLAY", false, time);
  drawGlassButton(ctx, settingsBtn, "SETTINGS", false, time);
  buttons.push(play, levelsBtn, tutBtn, howBtn, settingsBtn);
  ctx.fillStyle = P.INK_FAINT;
  ctx.font = font(400, 16);
  ctx.textAlign = "center";
  ctx.fillText("Wormholes. Walls. Scarce pulses. Think before you fire.", W / 2, 920);
}

/** Floating “best with headphones” tip + skip controls — every screen / theme. */
function pushMusicChrome(): void {
  const baseX = 34;
  const baseY = 36;
  const bobX = Math.sin(time * 1.15) * 5 + Math.cos(time * 0.65) * 2.5;
  const bobY = Math.cos(time * 0.95) * 6 + Math.sin(time * 1.35) * 2;
  const cx = baseX + bobX;
  const cy = baseY + bobY;
  const radius = 15;

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.strokeStyle = P.INK_SOFT;
  ctx.fillStyle = P.INK_SOFT;
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI * 0.95, Math.PI * 0.05);
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(cx - radius - 3.5, cy - 2, 7, 15, 2.5);
  ctx.roundRect(cx + radius - 3.5, cy - 2, 7, 15, 2.5);
  ctx.stroke();

  ctx.globalAlpha = 0.72;
  ctx.font = font(600, 10);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("BEST WITH HEADPHONES", cx + radius + 12, cy + 1);
  ctx.restore();

  const nextEnabled = canSkipMusicNext();
  // Relative sizing keeps the control usable as the 720-wide canvas scales
  // down on phones and up on desktop.
  const inset = Math.max(14, W * 0.02);
  const buttonW = Math.max(118, Math.min(150, W * 0.2));
  const next: ButtonRect = { x: inset, y: 68, w: buttonW, h: 40, id: "music_next" };
  drawMusicSkipButton(next, nextEnabled);
  buttons.push(next);

  // Global top-right controls. They use each theme's native button chrome and
  // stay large enough to tap after the 720-wide canvas scales down on phones.
  const rightX = W - inset - buttonW;
  if (screen !== "theme_pick") {
    const themeButton: ButtonRect = {
      x: rightX,
      y: 22,
      w: buttonW,
      h: 40,
      id: "change_theme",
    };
    drawGlassButton(ctx, themeButton, "THEME", false, time);
    buttons.push(themeButton);
  }
  const muteButton: ButtonRect = {
    x: rightX,
    y: 68,
    w: buttonW,
    h: 40,
    id: "mute_music",
  };
  drawGlassButton(ctx, muteButton, save.musicMuted ? "UNMUTE" : "MUTE", false, time);
  buttons.push(muteButton);
}

/** Next-track media icon (triangle + bar) and a clear text label. */
function drawMusicSkipButton(rect: ButtonRect, enabled: boolean): void {
  ctx.save();
  ctx.globalAlpha = enabled ? 0.9 : 0.3;
  ctx.fillStyle = P.TABLE_FILL;
  ctx.strokeStyle = P.INK_SOFT;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.stroke();

  const iconX = rect.x + 18;
  const iconY = rect.y + rect.h / 2;
  ctx.fillStyle = P.INK;
  ctx.strokeStyle = P.INK;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Vertical bar
  const barX = iconX + 7;
  ctx.beginPath();
  ctx.moveTo(barX, iconY - 7);
  ctx.lineTo(barX, iconY + 7);
  ctx.stroke();

  // Triangle pointing in skip direction
  ctx.beginPath();
  ctx.moveTo(iconX - 6, iconY - 7);
  ctx.lineTo(iconX + 5, iconY);
  ctx.lineTo(iconX - 6, iconY + 7);
  ctx.closePath();
  ctx.fill();

  ctx.font = font(700, 11);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("SKIP TRACK", rect.x + 36, rect.y + rect.h / 2 + 0.5);
  ctx.restore();
}

function drawSettings(): void {
  buttons = [];
  sliders = [];
  drawBackground(ctx, time);
  drawTitle(ctx, "SETTINGS");
  ctx.fillStyle = P.INK;
  ctx.font = font(700, 18);
  ctx.textAlign = "center";
  ctx.fillText("THEME · LIVE PREVIEW", W / 2, 125);
  drawThemeGamePreview(145);
  drawThemeGrid(405);
  ctx.fillStyle = P.INK;
  ctx.font = font(700, 18);
  ctx.fillText("VOLUME", W / 2, 610);
  pushVolumeSliders(650);
  const back: ButtonRect = { x: 120, y: 1120, w: 480, h: 64, id: "settings_back" };
  drawGlassButton(
    ctx,
    back,
    settingsFrom === "play" || settingsFrom === "pause" ? "RESUME" : "BACK",
    true,
    time,
  );
  buttons.push(back);
}

function drawThemePick(): void {
  buttons = [];
  sliders = [];
  drawBackground(ctx, time);
  drawLogo(ctx, W / 2, 24, 180);
  ctx.fillStyle = P.INK;
  ctx.font = font(700, 24);
  ctx.textAlign = "center";
  ctx.fillText("CHOOSE A THEME", W / 2, 230);
  ctx.fillStyle = P.INK_SOFT;
  ctx.font = font(500, 15);
  ctx.fillText("Tap a look — the board below shows how it plays.", W / 2, 262);
  drawThemeGamePreview(290);
  drawThemeGrid(560);
  const confirm: ButtonRect = { x: 120, y: 900, w: 480, h: 68, id: "theme_confirm" };
  drawGlassButton(ctx, confirm, `CONFIRM · ${THEME_LABELS[themePreview].toUpperCase()}`, true, time);
  buttons.push(confirm);
  ctx.fillStyle = P.INK_FAINT;
  ctx.font = font(500, 14);
  ctx.fillText("You can change this anytime in Settings.", W / 2, 1010);
}

/** The preview board is fixed, so build and solve it once, not every frame. */
let previewBoard: { state: ReturnType<typeof buildState>; result: TurnResult } | null = null;

/** Mini in-game board vignette so theme pick shows real play colors. */
function drawThemeGamePreview(top: number): void {
  if (!previewBoard) {
    const built = buildState(buildThemePreviewLevel());
    previewBoard = { state: built, result: solve(built) };
  }
  const { state, result } = previewBoard;
  const cell = 44;
  const gap = 4;
  const boardW = state.width * (cell + gap) - gap;
  const boardH = state.height * (cell + gap) - gap;
  const originX = (W - boardW) / 2;
  const pad = 18;
  const panelX = originX - pad;
  const panelY = top;
  const panelW = boardW + pad * 2;
  const panelH = boardH + pad * 2 + 28;

  ctx.save();
  ctx.fillStyle = P.PAPER_DARK;
  ctx.strokeStyle = P.INK_HAIR;
  ctx.lineWidth = 2;
  roundRectPath(ctx, panelX, panelY, panelW, panelH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = P.INK_FAINT;
  ctx.font = font(600, 12);
  ctx.textAlign = "center";
  ctx.fillText("IN-GAME LOOK", W / 2, panelY + 18);

  const layout: Layout = {
    origin: { x: originX, y: panelY + 28 },
    cell,
    gap,
    boardTop: panelY + 28,
  };
  drawHairlineGrid(ctx, state, layout);
  for (const t of state.tables) {
    drawWheel(ctx, t, layout, false, t.rotationQ * (Math.PI / 2), time, true);
  }
  drawBeams(ctx, layout, result, 1);
  drawOptics(ctx, state, layout, result, time);
  ctx.restore();
}

function drawTutorialCard(): void {
  const step = TUTORIAL_FLOW[tutorialStep];
  if (!step || step.kind !== "card") {
    showTutorialStep();
    return;
  }
  buttons = [];
  sliders = [];
  drawBackground(ctx, time);
  drawLogo(ctx, W / 2, 36, 240);
  ctx.fillStyle = P.INK;
  ctx.font = font(700, 28);
  ctx.textAlign = "center";
  ctx.fillText(step.title, W / 2, 340);
  ctx.fillStyle = P.INK_SOFT;
  ctx.font = font(500, 18);
  step.body.forEach((line, i) => ctx.fillText(line, W / 2, 400 + i * 36));
  ctx.fillStyle = P.INK_FAINT;
  ctx.font = font(600, 14);
  ctx.fillText(`Guide ${tutCardIndex() + 1} / ${tutCardCount()}`, W / 2, 560);

  const canBack = tutorialStep > 0;
  if (canBack) {
    const prev: ButtonRect = { x: 80, y: 980, w: 200, h: 58, id: "tut_prev" };
    drawGlassButton(ctx, prev, "BACK", false, time);
    buttons.push(prev);
  }
  const next: ButtonRect = {
    x: canBack ? 300 : 120,
    y: 980,
    w: canBack ? 340 : 480,
    h: 58,
    id: "tut_next",
  };
  drawGlassButton(ctx, next, step.nextLabel ?? "NEXT", true, time);
  buttons.push(next);

  const back: ButtonRect = { x: 120, y: 1060, w: 480, h: 56, id: save.tutorialDone ? "menu" : "tut_skip" };
  drawGlassButton(ctx, back, save.tutorialDone ? "MAIN MENU" : "SKIP TUTORIAL", false, time);
  buttons.push(back);
}

function drawLevels(): void {
  buttons = [];
  sliders = [];
  drawBackground(ctx, time);
  const from = levelPage * PAGE_SIZE + 1;
  const to = Math.min(DIFFICULTY_COUNT, (levelPage + 1) * PAGE_SIZE);
  drawTitle(ctx, `LEVELS ${String(from).padStart(3, "0")}–${String(to).padStart(3, "0")} · FRESH EACH PLAY`);
  const rowH = 72;
  let y = 140;
  const start = levelPage * PAGE_SIZE;
  const end = Math.min(DIFFICULTY_COUNT, start + PAGE_SIZE);
  for (let i = start; i < end; i++) {
    const locked = i >= save.unlocked;
    const id = `diff_${i + 1}`;
    const st = save.bestStars[id] ?? 0;
    const star = "★".repeat(st) + "☆".repeat(3 - st);
    const rect: ButtonRect = { x: 70, y, w: 580, h: 58, id: `lvl_${i}` };
    drawGlassButton(
      ctx,
      rect,
      locked
        ? `${String(i + 1).padStart(3, "0")}  LOCKED`
        : `${levelTitle(i + 1).toUpperCase()}    ${star}`,
      !locked && i === save.unlocked - 1,
      time,
      !locked,
    );
    if (!locked) buttons.push(rect);
    y += rowH;
  }

  const prev: ButtonRect = { x: 70, y: 1080, w: 170, h: 56, id: "page_prev" };
  const next: ButtonRect = { x: 480, y: 1080, w: 170, h: 56, id: "page_next" };
  const back: ButtonRect = { x: 260, y: 1080, w: 200, h: 56, id: "menu" };
  drawGlassButton(ctx, prev, "PREV", false, time, levelPage > 0);
  if (levelPage > 0) buttons.push(prev);
  drawGlassButton(ctx, back, "BACK", false, time);
  buttons.push(back);
  drawGlassButton(ctx, next, "NEXT", false, time, levelPage < pageCount() - 1);
  if (levelPage < pageCount() - 1) buttons.push(next);

  ctx.fillStyle = P.INK_FAINT;
  ctx.font = font(400, 14);
  ctx.textAlign = "center";
  ctx.fillText(`Page ${levelPage + 1} / ${pageCount()}`, W / 2, 1165);
}

function drawPause(): void {
  buttons = [];
  sliders = [];
  drawBackground(ctx, time);
  drawTitle(ctx, "PAUSED");
  ctx.fillStyle = P.INK_SOFT;
  ctx.font = font(600, 16);
  ctx.textAlign = "center";
  ctx.fillText(session ? levelTitle(levelIndex + 1).toUpperCase() : "", W / 2, 120);

  const resume: ButtonRect = { x: 120, y: 420, w: 480, h: 68, id: "pause_resume" };
  const settingsBtn: ButtonRect = { x: 120, y: 510, w: 480, h: 64, id: "settings" };
  const levelsBtn: ButtonRect = { x: 120, y: 595, w: 480, h: 64, id: "pause_levels" };
  const homeBtn: ButtonRect = { x: 120, y: 680, w: 480, h: 64, id: "main_menu" };
  drawGlassButton(ctx, resume, "RESUME", true, time);
  drawGlassButton(ctx, settingsBtn, "SETTINGS", false, time);
  drawGlassButton(ctx, levelsBtn, "LEVELS", false, time);
  drawGlassButton(ctx, homeBtn, "MAIN MENU", false, time);
  buttons.push(resume, settingsBtn, levelsBtn, homeBtn);
}

function drawPlay(): void {
  buttons = [];
  sliders = [];
  if (!session || !layout) return;
  const result = displayResult ?? session.result;
  const net = analyzeNetwork(session.state, undefined, true);
  const lit = session.beamsVisible && result.won ? net.discCount : 0;
  const need = session.beamsVisible ? net.discCount : 0;
  const spill = session.beamsVisible ? net.looseEnds : 0;
  const pLeft = pulsesRemaining(session);
  const pLim = session.level.pulseLimit > 0 ? session.level.pulseLimit : 3;
  drawBackground(ctx, time);
  const flowStep = inTutorial ? TUTORIAL_FLOW[tutorialStep] : null;
  const tutLabel =
    tutorialPhase === "point"
      ? "MEET THE BOARD"
      : flowStep && flowStep.kind === "play"
        ? flowStep.lesson.toUpperCase()
        : "TUTORIAL";
  drawTitle(ctx, inTutorial ? tutLabel : levelTitle(levelIndex + 1).toUpperCase());
  if (tutorialPhase !== "point") {
    drawHudStats(
      ctx,
      session.moves,
      session.level.par,
      lit,
      need,
      spill,
      pLeft,
      pLim,
    );
    const music: SliderRect = {
      x: 90,
      y: 152,
      w: 540,
      h: 34,
      id: "vol_music",
      value: save.musicVol,
      compact: true,
      labelW: 48,
    };
    const sfx: SliderRect = {
      x: 90,
      y: 192,
      w: 540,
      h: 34,
      id: "vol_sfx",
      value: save.sfxVol,
      compact: true,
      labelW: 48,
    };
    drawVolumeSlider(ctx, music, "MUS", time, true);
    drawVolumeSlider(ctx, sfx, "SFX", time, true);
    sliders.push(music, sfx);
  } else {
    ctx.fillStyle = P.INK_FAINT;
    ctx.font = font(600, 14);
    ctx.textAlign = "center";
    ctx.fillText("Follow the finger — tap Next to learn each symbol", W / 2, 148);
  }
  drawHairlineGrid(ctx, session.state, layout);

  // Gear tie-lines sit under the discs.
  for (const t of session.state.tables) {
    if (t.link && t.id < t.link.partner) {
      const p = session.state.tables.find((x) => x.id === t.link!.partner);
      if (p) drawGearLink(ctx, layout, t.hub, p.hub);
    }
  }

  for (const t of session.state.tables) {
    drawWheel(
      ctx,
      t,
      layout,
      t.id === session.selectedTable && tutorialPhase !== "point",
      visualRot(t.id),
      time,
      true,
      false,
      true,
      discSquash(t.id),
    );
  }

  // Retro socket-to-socket tubes — drawn after knobs so they stay plugged into
  // the floating cyan nodes (same float + live rotation as the triangles).
  drawRetroConnections(ctx, session.state, layout, {
    time,
    selectedId: session.selectedTable,
    visualRotOf: visualRot,
  });

  if (session.beamsVisible) {
    drawBeams(ctx, layout, result, beamProgress);
  }
  drawOptics(ctx, session.state, layout, result, time);
  drawFeel(ctx, time);

  if (tutorialPhase === "point") {
    drawPointTourOverlay();
    return;
  }

  if (inspect) {
    inspectClose = drawInfoCard(ctx, inspect.title, inspect.body);
  } else {
    inspectClose = null;
    if (!victory && spill > 0) {
      drawCoachHint(ctx, "Open ends — marks that meet nothing. Turn until every stub closes.", 1040);
    } else if (!victory && session.moves === 0 && session.level.hint) {
      drawCoachHint(ctx, session.level.hint, 1040);
    } else if (!victory && !session.beamsVisible && pLeft > 0) {
      drawCoachHint(ctx, "Think freely. A check costs one pulse — spend it when you're ready.", 1048);
    } else if (!victory && pLeft === 0 && !session.result.won) {
      drawCoachHint(ctx, "Out of checks — try the same board again, or a new layout.", 1048);
    }
  }

  // Order: UNDO · PULSE · RESET · MENU (kept smaller / higher so turn
  // buttons can be fat-finger friendly without overlapping them).
  const undoBtn: ButtonRect = { x: 28, y: 1068, w: 130, h: 52, id: "undo" };
  const pulseBtn: ButtonRect = { x: 172, y: 1068, w: 220, h: 52, id: "pulse" };
  const resetBtn: ButtonRect = { x: 406, y: 1068, w: 130, h: 52, id: "reset" };
  const menuBtn: ButtonRect = { x: 550, y: 1068, w: 142, h: 52, id: "menu" };
  drawGlassButton(ctx, undoBtn, "UNDO", false, time);
  drawGlassButton(ctx, pulseBtn, `PULSE ${pLeft}`, canPulse(session) && !victory && !pendingWin, time);
  drawGlassButton(ctx, resetBtn, "RESET", false, time);
  drawGlassButton(ctx, menuBtn, "MENU", false, time);
  buttons.push(undoBtn, pulseBtn, resetBtn, menuBtn);

  const enabled = session.selectedTable >= 0 && !victory && !pendingWin && !drag;
  const sel = session.state.tables.find((t) => t.id === session!.selectedTable);
  const canTurn = enabled && sel && !sel.locked;
  const rotR = 56;
  const turnY = 1228;
  const turnL = 175;
  const turnR = 545;
  drawRoundButton(ctx, turnL, turnY, rotR, "↺", !!canTurn, time);
  drawRoundButton(ctx, turnR, turnY, rotR, "↻", !!canTurn, time);
  buttons.push(
    { x: turnL - rotR, y: turnY - rotR, w: rotR * 2, h: rotR * 2, id: "ccw" },
    { x: turnR - rotR, y: turnY - rotR, w: rotR * 2, h: rotR * 2, id: "cw" },
  );

  if (victory || victoryAlpha > 0) {
    const a = victory ? Math.min(1, victoryAlpha) : victoryAlpha;
    ctx.fillStyle = `rgba(244,241,234,${0.72 * a})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a;
    ctx.fillStyle = P.PAPER;
    ctx.strokeStyle = P.INK;
    ctx.lineWidth = 1.5;
    const panel = { x: 100, y: 440, w: 520, h: 340 };
    roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, 10);
    ctx.fill();
    ctx.stroke();
    const s = stars(session);
    const delta = session.moves - session.level.par;
    const near = delta === 0 ? "ON PAR" : delta < 0 ? `PAR − ${-delta}` : `OVER BY ${delta}`;
    ctx.fillStyle = P.INK;
    ctx.font = font(700, 28);
    ctx.textAlign = "center";
    ctx.fillText(inTutorial ? "NICE LINK" : "CLOSED", W / 2, 510);
    ctx.font = font(700, 36);
    ctx.fillText("★".repeat(s) + "☆".repeat(3 - s), W / 2, 565);
    ctx.fillStyle = P.INK_SOFT;
    ctx.font = font(400, 17);
    ctx.fillText(
      inTutorial
        ? "Lesson cleared — keep going to learn the rest."
        : `MOVES ${session.moves}    ${near}`,
      W / 2,
      610,
    );
    ctx.globalAlpha = 1;
    if (victory) {
      if (inTutorial) {
        const cont: ButtonRect = { x: 160, y: 650, w: 400, h: 52, id: "tut_continue" };
        const retry: ButtonRect = { x: 160, y: 715, w: 400, h: 52, id: "tut_retry" };
        const more = tutorialStep < TUTORIAL_FLOW.length - 1;
        drawGlassButton(ctx, cont, more ? "NEXT LESSON" : "CONTINUE", true, time);
        drawGlassButton(ctx, retry, "TRY AGAIN", false, time);
        buttons = [cont, retry];
      } else {
        const next: ButtonRect = { x: 160, y: 650, w: 400, h: 52, id: "next" };
        const replay: ButtonRect = { x: 160, y: 715, w: 400, h: 52, id: "replay" };
        const diffs: ButtonRect = { x: 160, y: 780, w: 400, h: 48, id: "levels" };
        drawGlassButton(ctx, next, "NEXT DRAFT", true, time);
        drawGlassButton(ctx, replay, "NEW LAYOUT", false, time);
        drawGlassButton(ctx, diffs, "DIFFICULTY", false, time);
        buttons = [next, replay, diffs];
      }
    }
  } else if (isFailed(session) && !pendingWin) {
    // Spending the last check without closing the circuit ends the attempt.
    ctx.fillStyle = "rgba(244,241,234,0.72)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = P.PAPER;
    ctx.strokeStyle = P.INK;
    ctx.lineWidth = 1.5;
    const panel = { x: 100, y: 440, w: 520, h: 300 };
    roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = P.INK;
    ctx.font = font(700, 28);
    ctx.textAlign = "center";
    ctx.fillText("OUT OF CHECKS", W / 2, 510);
    ctx.fillStyle = P.INK_SOFT;
    ctx.font = font(400, 17);
    ctx.fillText(`${net.looseEnds} open ends still on the board.`, W / 2, 558);
    ctx.fillText("Read the board before you spend the next one.", W / 2, 584);
    const again: ButtonRect = { x: 160, y: 620, w: 400, h: 52, id: "reset" };
    const fresh: ButtonRect = { x: 160, y: 685, w: 400, h: 52, id: "replay" };
    drawGlassButton(ctx, again, "SAME BOARD AGAIN", true, time);
    drawGlassButton(ctx, fresh, inTutorial ? "TRY AGAIN" : "NEW LAYOUT", false, time);
    buttons = [again, fresh];
  }
}

function frame(now: number): void {
  time = now / 1000;
  if (beamProgress < 1 && !drag) beamProgress = Math.min(1, beamProgress + 0.042);

  if (pendingWin && !drag && beamProgress >= 1) {
    fireVictoryFeel();
    if (!winRevealAt) winRevealAt = now + 900;
    if (now >= winRevealAt) commitVictory();
  }

  if (victory) victoryAlpha = Math.min(1, victoryAlpha + 0.06);
  else victoryAlpha = Math.max(0, victoryAlpha - 0.1);

  if (screen === "menu") drawMenu();
  else if (screen === "levels") drawLevels();
  else if (screen === "pause") drawPause();
  else if (screen === "settings") drawSettings();
  else if (screen === "how")
    drawInfoPages(TUTORIAL_PAGES, howPage, {
      nextId: howPage < TUTORIAL_PAGES.length - 1 ? "how_next" : "menu",
      prevId: "how_prev",
      backId: "menu",
      nextLabel: howPage < TUTORIAL_PAGES.length - 1 ? "NEXT" : "DONE",
    });
  else if (screen === "tutorial") drawTutorialCard();
  else if (screen === "theme_pick") drawThemePick();
  else drawPlay();

  pushMusicChrome();

  onMusicScreen(screen);
  requestAnimationFrame(frame);
}

void loadUiFonts().finally(() => {
  requestAnimationFrame(frame);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((reg) => {
        void reg.update();
      })
      .catch(() => {
        /* offline install is best-effort */
      });
  });
}
