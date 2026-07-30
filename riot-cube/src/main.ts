import {
  applyFaceTurn,
  applyTwist,
  cycleCubeSize,
  cycleMoveLimit,
  doScramble,
  loadCubeSize,
  loadMoveLimit,
  cloneSession,
  moveLimitLabel,
  resumeOrStartSession,
  saveCubeSize,
  saveProgress,
  setActiveFace,
  setFaceStickers,
  setProgressSaveSuspended,
  setProgressThemeSlot,
  sizeLabel,
  startSession,
  type FaceId,
  type LaneTwist,
  type Session,
} from "./core/session";
import { faceSolvedBits } from "./core/rubik";
import { suggestHintMove, type HintMove } from "./core/hint";
import {
  pickFaceStickers,
  isValidFaceStickers,
  saveFaceStickers,
  stickerPoolForTheme,
  type TileKind,
} from "./core/stickers";
import { previewCube } from "./core/lane";
import {
  W,
  H,
  drawDesk,
  invalidateDeskCache,
  drawEndOverlay,
  drawFaceTurnButtons,
  drawHomeScreen,
  drawHud,
  drawMenuButton,
  drawOrbitFinger,
  drawOrbitBandHint,
  drawPauseMenu,
  drawPlayActions,
  drawSettingsScreen,
  drawStickersScreen,
  drawThemesScreen,
  drawTutorialCoach,
  hitOrbitBand,
  hitPlayHint,
  hitPlayScramble,
  hitPlayStickers,
  hitRetry,
  hitSolvedHome,
  hitStickersGridKind,
  hitStickersSlot,
  hitThemePicker,
  hitUiRect,
  hitVolumeButton,
  hitAnimeModeButton,
  hitMovesChip,
  loadLogo,
  stickersGridContentHeight,
  HOME_HOW,
  HOME_PLAY,
  HOME_SETTINGS,
  MENU_BTN,
  PAUSE_HOME,
  PAUSE_HOW,
  PAUSE_RESUME,
  PAUSE_SETTINGS,
  PAUSE_THEMES,
  SETTINGS_BACK,
  SETTINGS_HINTS,
  SETTINGS_MUSIC,
  SETTINGS_MOVES,
  SETTINGS_SIZE,
  SETTINGS_THEME,
  SETTINGS_VOL,
  STICKERS_APPLY,
  STICKERS_BACK,
  STICKERS_GRID,
  STICKERS_RANDOM,
  THEMES_ANIME_MODE,
  THEMES_BACK,
  TUTORIAL_NEXT,
  TUTORIAL_SKIP,
  ORBIT_BAND,
  PLAY_SCRAMBLE_WIDE,
  PLAY_STICKERS_WIDE,
  type FaceTurnButtons,
} from "./view/draw";
import { TUTORIAL_STEPS, type TutorialAction } from "./view/tutorial";
import {
  drawTutorialPointer,
  loadTutorialHand,
  type TutorialPointTarget,
} from "./view/tutorialPointer";
import {
  drawCube3D,
  drawCubeOrbitButtons,
  facingFaceDot,
  facingFaceQuat,
  hitFrontUV,
  hitOrbitButton,
  loadCubePaper,
  screenDeltaToFaceUV,
  type CubeLayout,
  type CubeMotion,
} from "./view/cube3d";
import { getPalette } from "./view/theme";
import {
  applyOrbitDragQuat,
  orbitStepQuat,
  ORBIT_DRAG_SENS,
  snapOrbitQuat,
} from "./view/orbit";
import {
  type Quat,
  quatCopy,
  quatDot,
  quatFromEulerYX,
  quatIdentity,
  quatSlerp,
} from "./view/quat";
import {
  cycleSfxVolume,
  getSfxVolume,
  loadSfx,
  sfxHint,
  sfxLose,
  sfxPaperFlutter,
  sfxPaperRustle,
  sfxScramble,
  sfxWin,
  unlockAudio,
} from "./audio/paper";
import {
  cycleMusicVolume,
  getMusicVolume,
  setMusicVolume,
  syncMusicForTheme,
  unlockMusic,
} from "./audio/music";
import { loadStickers } from "./view/stickers";
import { detectQuality, getQuality } from "./view/quality";
import {
  applyThemeChrome,
  getAnimeMode,
  getTheme,
  getThemeAssetDir,
  getThemeLabel,
  setTheme,
  toggleAnimeMode,
  type ThemeId,
} from "./view/theme";
import {
  ensureAnimeArtBoth,
  ensureThemeArt,
  onThemeArtReady,
  reloadThemeArt,
} from "./view/themeAssets";
import { getHintsEnabled, toggleHintsEnabled } from "./view/prefs";

const HELP_SEEN_KEY = "riotcube_seen_help";
const ONBOARD_KEY = "riotcube_onboarded";

function markHelpSeen(): void {
  try {
    localStorage.setItem(HELP_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

function hasOnboarded(): boolean {
  try {
    if (localStorage.getItem(ONBOARD_KEY) === "1") return true;
    // Returning players who already finished help before onboarding existed.
    if (localStorage.getItem(HELP_SEEN_KEY) === "1") {
      localStorage.setItem(ONBOARD_KEY, "1");
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARD_KEY, "1");
    localStorage.setItem(HELP_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

function activeStickerPool() {
  const theme = getTheme();
  return stickerPoolForTheme(
    theme,
    theme === "anime" ? getAnimeMode() : "day",
  );
}

function activeThemeSlot(): string {
  return getThemeAssetDir();
}

/**
 * Switch theme art/music and restore that theme's stickers + puzzle.
 * Never forces the sticker picker — first visit uses defaults until the player picks.
 */
function applyThemeChange(prevSlot: string): void {
  // Don't overwrite a real theme save with tutorial practice state.
  if (!tutorial) {
    saveProgress(session);
    saveFaceStickers(session.faceStickers, prevSlot);
  }
  const nextSlot = activeThemeSlot();
  setProgressThemeSlot(nextSlot);
  reloadThemeArt(getTheme());
  invalidateDeskCache();
  markDirty();
  void loadStickers();
  syncMusicForTheme(getTheme());
  const pool = activeStickerPool();
  session = resumeOrStartSession(session.size, pool, null);
  solvedFaceBits = faceSolvedBits(session.cube);
  clearHint();
  syncActiveFace();
}

function applyAnimeModeToggle(): void {
  const prev = activeThemeSlot();
  toggleAnimeMode();
  applyThemeChange(prev);
  sfxPaperRustle();
}

/** HUD speaker: cycle SFX + music together so mute actually silences the game. */
function cycleHudVolume(): void {
  const next = cycleSfxVolume();
  setMusicVolume(next);
}

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

type Screen =
  | "home"
  | "play"
  | "menu"
  | "settings"
  | "stickers"
  | "themes";
let screen: Screen = "home";
let settingsFrom: Screen = "home";
let themesFrom: Screen = "settings";
let stickersFrom: Screen = "play";
/** After theme change / onboarding — must APPLY a full set. */
let stickersMustPick = false;

/** First-run funnel: tutorial → theme → stickers. */
type OnboardingStep = "help" | "theme" | "stickers" | null;
let onboarding: OnboardingStep = null;
/** Theme must be tapped during onboarding before DONE. */
let onboardingThemePicked = false;

/** Interactive on-cube tutorial. */
let tutorial: { step: number; from: Screen } | null = null;
/** Puzzle to restore after tutorial practice (progress stays intact). */
let progressBeforeTutorial: Session | null = null;
/** When the current tutorial step became active (hand fade-in). */
let tutorialStepAt = 0;

function beginTutorial(from: Screen): void {
  tutorial = { step: 0, from };
  tutorialStepAt = performance.now();
  progressBeforeTutorial = cloneSession(session);
  setProgressSaveSuspended(true);
  resetPlayVisuals();
  // Fresh scramble for practice — does not overwrite saved progress.
  session = startSession(session.size, activeStickerPool(), session.faceStickers);
  solvedFaceBits = faceSolvedBits(session.cube);
  syncActiveFace();
  screen = "play";
  sfxPaperRustle();
}

function tutorialStep() {
  return tutorial ? TUTORIAL_STEPS[tutorial.step]! : null;
}

function tutorialAllows(action: TutorialAction): boolean {
  if (!tutorial) return true;
  const step = tutorialStep();
  if (!step) return true;
  if (step.action === "next") return false;
  return step.action === action;
}

/** Where the pointing-hand sticker should aim for the current tutorial action. */
function tutorialPointTarget(action: TutorialAction): TutorialPointTarget | null {
  switch (action) {
    case "next": {
      // Tip on the lower edge of NEXT; palm hangs under the coach card.
      return {
        x: TUTORIAL_NEXT.x + TUTORIAL_NEXT.w * 0.62,
        y: TUTORIAL_NEXT.y + TUTORIAL_NEXT.h - 6,
        mode: "point",
        size: 92,
      };
    }
    case "swipe": {
      const layout = cubeLayout();
      // Bottom row — palm hangs under the cube instead of burying stickers.
      return {
        x: layout.cx,
        y: layout.cy + layout.scale * 0.58,
        mode: "swipe",
        size: 96,
        travel: 86,
      };
    }
    case "faceTurn": {
      if (!faceTurnBtns) return null;
      const r = faceTurnBtns.cw;
      return {
        x: r.x + r.w * 0.62,
        y: r.y + r.h * 0.4,
        mode: "point",
        size: 88,
        flip: true,
      };
    }
    case "peek": {
      if (!orbitBtns) {
        return { x: W * 0.78, y: 560, mode: "point", size: 78, flip: true };
      }
      const r = orbitBtns.right;
      return {
        x: Math.min(W - 64, r.x + r.w * 0.38),
        y: r.y + r.h * 0.48,
        mode: "point",
        size: 78,
        flip: true,
      };
    }
    case "orbit": {
      // Keep the swipe tip in the gap under the cube (above SCRAMBLE/STICKERS).
      return {
        x: W * 0.5,
        y: 918,
        mode: "swipe",
        size: 86,
        travel: 100,
      };
    }
    case "stickers": {
      const r = PLAY_STICKERS_WIDE;
      // Approach from outside-right so the palm clears the button row.
      return {
        x: r.x + r.w - 14,
        y: r.y + r.h * 0.42,
        mode: "point",
        size: 96,
        flip: true,
      };
    }
    case "scramble": {
      const r = PLAY_SCRAMBLE_WIDE;
      // Approach from outside-left.
      return {
        x: r.x + 14,
        y: r.y + r.h * 0.42,
        mode: "point",
        size: 96,
      };
    }
    default:
      return null;
  }
}

function advanceTutorial(): void {
  if (!tutorial) return;
  if (tutorial.step >= TUTORIAL_STEPS.length - 1) {
    finishTutorial();
    return;
  }
  tutorial = { ...tutorial, step: tutorial.step + 1 };
  tutorialStepAt = performance.now();
  sfxPaperRustle();
}

function noteTutorial(action: TutorialAction): void {
  if (!tutorial) return;
  const step = tutorialStep();
  if (step && step.action === action) advanceTutorial();
}

function finishTutorial(): void {
  markHelpSeen();
  const from = tutorial?.from ?? "home";
  tutorial = null;
  setProgressSaveSuspended(false);
  if (progressBeforeTutorial) {
    session = progressBeforeTutorial;
    progressBeforeTutorial = null;
    saveProgress(session);
    syncActiveFace();
  }
  if (onboarding === "help") {
    onboarding = "theme";
    onboardingThemePicked = false;
    openThemes("home");
    return;
  }
  if (from === "menu") screen = "menu";
  else if (from === "play") screen = "play";
  else screen = "home";
  sfxPaperFlutter();
}

function beginOnboarding(): void {
  onboarding = "help";
  onboardingThemePicked = false;
  stickersMustPick = false;
  beginTutorial("home");
}

/** Settle pulse after a twist/face-turn lands. */
let stickerDropStarted = 0;
const STICKER_DROP_MS = 320;
let stickerDropTarget: {
  face: FaceId;
  kind: "row" | "col" | "face";
  index: number;
} | null = null;
/** Face-complete celebration. */
let faceCelebrate: { face: FaceId; started: number } | null = null;
const FACE_CELEBRATE_MS = 720;
let solvedFaceBits = 0;
/** Prevents win/lose sting from repeating while the end overlay is shown. */
let outcomeSfxPlayed: "solved" | "lost" | null = null;

setProgressThemeSlot(activeThemeSlot());
let session: Session = resumeOrStartSession(loadCubeSize(), activeStickerPool());
solvedFaceBits = faceSolvedBits(session.cube);

let faceTurnBtns: FaceTurnButtons | null = null;

let hintMove: HintMove | null = null;
let hintUntil = 0;
let hintStarted = 0;

/** Finger position while free-orbit dragging (transparent circle). */
let orbitFinger: { x: number; y: number } | null = null;

let stickerDraft: (TileKind | null)[] = [null, null, null, null, null, null];
let stickerSlot = 0;
let stickersScroll = 0;
let stickersScrollDrag: {
  y0: number;
  x0: number;
  scroll0: number;
  moved: boolean;
  lastX: number;
  lastY: number;
} | null = null;

type DragState = {
  u0: number;
  v0: number;
  x0: number;
  y0: number;
  axis: "row" | "col" | null;
  index: number;
  offsetUv: number;
  r: number;
  c: number;
};

let drag: DragState | null = null;
let springUv = 0;
let springAxis: "row" | "col" | null = null;
let springIndex = -1;

const TURN_MS = 340;

type TurnAnim =
  | {
      kind: "face";
      face: FaceId;
      dir: 1 | -1;
      t: number;
      ms: number;
    }
  | {
      kind: "lane";
      face: FaceId;
      axis: "row" | "col";
      index: number;
      fromUv: number;
      toUv: number;
      twist: LaneTwist;
      t: number;
      ms: number;
    };
let turnAnim: TurnAnim | null = null;
let lastFrameTs = 0;
/** Skip full paints when idle — set on input / theme / resize. */
let needsPaint = true;

function markDirty(): void {
  needsPaint = true;
}

function isAnimating(): boolean {
  if (turnAnim) return true;
  if (springAxis) return true;
  if (rotating || orbitDrag) return true;
  if (drag?.axis != null) return true;
  if (stickersScrollDrag) return true;
  if (stickerDropStarted > 0) return true;
  if (faceCelebrate) return true;
  if (hintMove != null && performance.now() < hintUntil) return true;
  // Tutorial pointer / coach pulse continuously while active.
  if (tutorial && screen === "play") return true;
  return false;
}

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

const DEFAULT_ORIENT = quatFromEulerYX(0.04, -0.05);
let orient: Quat = quatCopy(DEFAULT_ORIENT);
let targetOrient: Quat = quatCopy(DEFAULT_ORIENT);
let rotating = false;

let orbitDrag: {
  x0: number;
  y0: number;
  q0: Quat;
} | null = null;

let orbitBtns: ReturnType<typeof drawCubeOrbitButtons> | null = null;

function cubeLayout(): CubeLayout {
  return {
    cx: W / 2,
    cy: 560,
    scale: session.size <= 2 ? 230 : 215,
    q: orient,
    rotX: 0,
    rotY: 0,
  };
}

function resize(): void {
  detectQuality();
  invalidateDeskCache();
  markDirty();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, getQuality().dprCap);
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

function syncActiveFace(): void {
  const face = facingFaceQuat(orient) as FaceId;
  if (face !== session.face) {
    session = setActiveFace(session, face);
  }
}

function triggerStickerDrop(
  target: {
    face: FaceId;
    kind: "row" | "col" | "face";
    index?: number;
  },
): void {
  stickerDropStarted = performance.now();
  stickerDropTarget = {
    face: target.face,
    kind: target.kind,
    index: target.index ?? 0,
  };
}

function noteNewlySolvedFaces(prevBits: number, cube = session.cube): void {
  const nextBits = faceSolvedBits(cube);
  const gained = nextBits & ~prevBits;
  solvedFaceBits = nextBits;
  if (gained) {
    // Celebrate the lowest newly completed face id.
    for (let i = 0; i < 6; i++) {
      if (gained & (1 << i)) {
        faceCelebrate = { face: i as FaceId, started: performance.now() };
        sfxPaperFlutter();
        break;
      }
    }
  }
  playOutcomeSfx();
}

function playOutcomeSfx(): void {
  if (session.status === "solved" && outcomeSfxPlayed !== "solved") {
    outcomeSfxPlayed = "solved";
    sfxWin();
  } else if (session.status === "lost" && outcomeSfxPlayed !== "lost") {
    outcomeSfxPlayed = "lost";
    sfxLose();
  } else if (session.status === "playing") {
    outcomeSfxPlayed = null;
  }
}

function faceCelebrateT(now = performance.now()): number {
  if (!faceCelebrate) return 0;
  const t = (now - faceCelebrate.started) / FACE_CELEBRATE_MS;
  if (t >= 1) {
    faceCelebrate = null;
    return 0;
  }
  return Math.max(0, t);
}

function stickerDropT(now = performance.now()): number {
  if (!stickerDropStarted) return 0;
  const t = (now - stickerDropStarted) / STICKER_DROP_MS;
  if (t >= 1) {
    stickerDropStarted = 0;
    stickerDropTarget = null;
    return 0;
  }
  return Math.max(0, t);
}

function activeMotion(): CubeMotion {
  const dropT = stickerDropT();
  const drop =
    dropT > 0 && stickerDropTarget
      ? {
          dropT,
          dropFace: stickerDropTarget.face,
          dropKind: stickerDropTarget.kind,
          dropIndex: stickerDropTarget.index,
        }
      : {};
  if (turnAnim?.kind === "face") {
    const e = easeOutCubic(turnAnim.t);
    return {
      axis: null,
      index: -1,
      offset: 0,
      hovering: false,
      faceSpin: e * turnAnim.dir * (Math.PI / 2),
    };
  }
  if (turnAnim?.kind === "lane") {
    const e = easeOutCubic(turnAnim.t);
    return {
      axis: turnAnim.axis,
      index: turnAnim.index,
      offset: turnAnim.fromUv + (turnAnim.toUv - turnAnim.fromUv) * e,
      hovering: true,
    };
  }
  if (drag?.axis) {
    return {
      axis: drag.axis,
      index: drag.index,
      offset: drag.offsetUv,
      hovering: true,
    };
  }
  if (springAxis) {
    return {
      axis: springAxis,
      index: springIndex,
      offset: springUv,
      hovering: Math.abs(springUv) > 0.01,
      ...drop,
    };
  }
  return { axis: null, index: -1, offset: 0, hovering: false, ...drop };
}

function resetPlayVisuals(): void {
  drag = null;
  springUv = 0;
  springAxis = null;
  springIndex = -1;
  turnAnim = null;
  stickerDropStarted = 0;
  stickerDropTarget = null;
  faceCelebrate = null;
  orbitDrag = null;
  orbitFinger = null;
  hintMove = null;
  hintUntil = 0;
  hintStarted = 0;
  rotating = false;
  orient = quatCopy(DEFAULT_ORIENT);
  targetOrient = quatCopy(DEFAULT_ORIENT);
}

function doTwist(twist: LaneTwist, fromUv = 0): void {
  if (session.status !== "playing" || turnAnim) return;
  if (tutorial && !tutorialAllows("swipe")) return;
  const amount = Math.max(1, twist.amount ?? 1);
  const n = session.size;
  const toUv = (twist.dir * amount) / n;
  const sameDir = fromUv === 0 || Math.sign(fromUv) === Math.sign(toUv);
  // Already dragged to (or past) the commit distance — land immediately.
  if (sameDir && Math.abs(fromUv) >= Math.abs(toUv) * 0.92) {
    const prevBits = solvedFaceBits;
    session = applyTwist(session, { ...twist, amount });
    noteNewlySolvedFaces(prevBits);
    noteTutorial("swipe");
    triggerStickerDrop({
      face: session.face,
      kind: twist.axis,
      index: twist.index,
    });
    // Same soft rustle as pick-up — slide.mp3 was too harsh for place-down.
    sfxPaperRustle();
    return;
  }
  turnAnim = {
    kind: "lane",
    face: session.face,
    axis: twist.axis,
    index: twist.index,
    fromUv: sameDir ? fromUv : 0,
    toUv,
    twist: { ...twist, amount },
    t: 0,
    ms: TURN_MS,
  };
  sfxPaperRustle();
}

function doFaceTurn(dir: 1 | -1): void {
  if (session.status !== "playing" || turnAnim) return;
  if (tutorial && !tutorialAllows("faceTurn")) return;
  turnAnim = { kind: "face", face: session.face, dir, t: 0, ms: TURN_MS };
  sfxPaperRustle();
}

function inCubeOrbitZone(_layout: CubeLayout, x: number, y: number): boolean {
  return y > 195 && y < 1000 && x > 24 && x < W - 24;
}

function orbitSens(): number {
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;
  return coarse ? ORBIT_DRAG_SENS * 1.55 : ORBIT_DRAG_SENS;
}

function snapOrient(q: Quat): Quat {
  const snapped = snapOrbitQuat(q);
  // Home tip only on front — keeps a little depth without reintroducing gimbal snaps.
  if (
    facingFaceQuat(snapped) === 0 &&
    Math.abs(quatDot(snapped, quatIdentity())) > 0.999
  ) {
    return quatCopy(DEFAULT_ORIENT);
  }
  return snapped;
}

function startOrbitStep(dir: "left" | "right" | "up" | "down"): void {
  if (drag || session.status !== "playing") return;
  // Tutorial: arrows teach PEEK; free-drag teaches ROTATE.
  if (tutorial && !tutorialAllows("peek")) return;
  orbitDrag = null;
  if (rotating) {
    orient = quatCopy(targetOrient);
    rotating = false;
    syncActiveFace();
  }
  let q = orient;
  if (Math.abs(quatDot(q, DEFAULT_ORIENT)) > 0.999) {
    q = quatCopy(DEFAULT_ORIENT);
  }
  targetOrient = snapOrient(orbitStepQuat(q, dir));
  rotating = true;
  noteTutorial("peek");
  sfxPaperRustle();
}

function beginOrbitDrag(x: number, y: number): void {
  if (tutorial && !tutorialAllows("orbit")) return;
  rotating = false;
  orbitDrag = { x0: x, y0: y, q0: quatCopy(orient) };
  orbitFinger = { x, y };
}

function endOrbitDrag(): void {
  if (!orbitDrag) return;
  orbitDrag = null;
  orbitFinger = null;
  targetOrient = snapOrient(orient);
  rotating = true;
  noteTutorial("orbit");
}

function hitFaceTurnButtons(x: number, y: number): boolean {
  if (!faceTurnBtns || session.status !== "playing") return false;
  if (hitUiRect(faceTurnBtns.ccw, x, y)) {
    doFaceTurn(-1);
    return true;
  }
  if (hitUiRect(faceTurnBtns.cw, x, y)) {
    doFaceTurn(1);
    return true;
  }
  return false;
}

function clearHint(): void {
  hintMove = null;
  hintUntil = 0;
  hintStarted = 0;
}

function triggerHint(): void {
  if (!getHintsEnabled()) return;
  const move = suggestHintMove(session.cube, session.face);
  if (!move) {
    clearHint();
    return;
  }
  hintMove = move;
  hintStarted = performance.now();
  hintUntil = hintStarted + 1600;
  sfxHint();
}

function openStickersPicker(from: Screen = "play"): void {
  const pool = activeStickerPool();
  stickersFrom = from;
  stickersMustPick = false;
  if (isValidFaceStickers(session.faceStickers, pool)) {
    stickerDraft = [...session.faceStickers];
  } else {
    const used = new Set<string>();
    stickerDraft = session.faceStickers.map((k) => {
      if ((pool as readonly string[]).includes(k) && !used.has(k)) {
        used.add(k);
        return k;
      }
      return null;
    });
  }
  const empty = stickerDraft.findIndex((k) => !k);
  stickerSlot = empty >= 0 ? empty : 0;
  stickersScroll = 0;
  stickersScrollDrag = null;
  screen = "stickers";
  sfxPaperRustle();
}

function finishOnboarding(): void {
  markOnboarded();
  onboarding = "stickers";
  onboardingThemePicked = false;
  stickersMustPick = true;
  openStickersPicker("home");
  stickersMustPick = true;
  sfxPaperFlutter();
}

function openThemes(from: Screen): void {
  themesFrom = from;
  screen = "themes";
  sfxPaperRustle();
}

function openHelp(from: Screen): void {
  beginTutorial(from === "menu" ? "menu" : from === "play" ? "play" : "home");
}

function pickTheme(id: ThemeId): void {
  if (onboarding === "theme") {
    onboardingThemePicked = true;
  }
  if (id === getTheme()) {
    if (onboarding === "theme") sfxPaperRustle();
    return;
  }
  const prev = activeThemeSlot();
  setTheme(id);
  applyThemeChange(prev);
  sfxPaperFlutter();
}

function paint(): void {
  drawDesk(ctx);

  if (screen === "home") {
    drawHomeScreen(ctx);
    return;
  }
  if (screen === "settings") {
    drawSettingsScreen(ctx, {
      sfxVol: getSfxVolume(),
      musicVol: getMusicVolume(),
      themeLabel: getThemeLabel(),
      sizeLabel: sizeLabel(session.size),
      moveLimitLabel: moveLimitLabel(loadMoveLimit()),
      hintsOn: getHintsEnabled(),
    });
    return;
  }
  if (screen === "themes") {
    drawThemesScreen(ctx, {
      selected: getTheme(),
      animeMode: getAnimeMode(),
      backLabel:
        onboarding === "theme"
          ? onboardingThemePicked
            ? "DONE"
            : "PICK A THEME"
          : "BACK",
      subtitle:
        onboarding === "theme"
          ? "Tap a pack to choose your look"
          : undefined,
    });
    return;
  }
  if (screen === "stickers") {
    drawStickersScreen(ctx, {
      draft: stickerDraft,
      slot: stickerSlot,
      scroll: stickersScroll,
      banner: stickersMustPick
        ? "Pick 6 stickers for this theme (saved automatically)"
        : undefined,
      hideBack: stickersMustPick,
    });
    return;
  }

  syncActiveFace();
  const layout = cubeLayout();
  const motion = activeMotion();
  const source = session.cube;
  let display = source;
  if (
    turnAnim?.kind !== "lane" &&
    motion.axis &&
    motion.hovering &&
    Math.abs(motion.offset) > 0.001
  ) {
    display = previewCube(
      source,
      session.face,
      motion.axis,
      motion.index,
      motion.offset,
    );
  }

  const now = performance.now();
  const hintT =
    hintMove != null && now < hintUntil
      ? (now - hintStarted) / (hintUntil - hintStarted)
      : 0;
  if (hintMove != null && now >= hintUntil) clearHint();

  drawHud(ctx, {
    sfxVol: getSfxVolume(),
    moves: session.moveCount,
    moveLimit: session.moveLimit,
  });
  drawMenuButton(ctx);

  const celebT = faceCelebrateT();
  drawCube3D(ctx, layout, display, {
    activeFace: session.face,
    motion,
    sourceCube: source,
    faceStickers: session.faceStickers,
    hintMove: hintT > 0 && hintT < 1 ? hintMove : null,
    hintT,
    faceCelebrate:
      faceCelebrate && celebT > 0
        ? { face: faceCelebrate.face, t: celebT }
        : null,
  });
  orbitBtns = drawCubeOrbitButtons(ctx, layout.cx, layout.cy, layout.scale, W, H);

  if (session.status === "playing") {
    drawPlayActions(ctx, {
      hintsOn: getHintsEnabled() && !tutorial,
    });
    if (orbitFinger) drawOrbitFinger(ctx, orbitFinger.x, orbitFinger.y);
    faceTurnBtns = drawFaceTurnButtons(ctx);
  } else {
    faceTurnBtns = null;
  }

  if (tutorial && screen === "play") {
    const step = tutorialStep()!;
    const last = tutorial.step >= TUTORIAL_STEPS.length - 1;
    if (step.action === "orbit") {
      drawOrbitBandHint(ctx, performance.now(), getPalette().accent);
    }
    drawTutorialCoach(ctx, {
      step: tutorial.step,
      total: TUTORIAL_STEPS.length,
      title: step.title,
      lines: step.lines,
      hint: step.hint,
      showNext: step.action === "next",
      showSkip: onboarding !== "help",
      nextLabel: last ? "DONE" : "NEXT",
    });
    const point = tutorialPointTarget(step.action);
    if (point) {
      const appear = Math.min(1, (performance.now() - tutorialStepAt) / 280);
      drawTutorialPointer(
        ctx,
        point,
        performance.now(),
        getPalette().accent,
        appear,
      );
    }
  }

  if (session.status === "solved" || session.status === "lost") {
    drawEndOverlay(ctx, {
      moves: session.moveCount,
      outcome: session.status === "lost" ? "lost" : "solved",
    });
  }
  if (screen === "menu" && !tutorial) {
    drawPauseMenu(ctx);
  }
}

function tick(ts: number): void {
  const dt = lastFrameTs ? Math.min(48, ts - lastFrameTs) : 16.67;
  lastFrameTs = ts;

  if (screen === "play" || screen === "menu") {
    if (turnAnim) {
      turnAnim.t += dt / turnAnim.ms;
      if (turnAnim.t >= 1) {
        turnAnim.t = 1;
        const prevBits = solvedFaceBits;
        if (turnAnim.kind === "face") {
          session = applyFaceTurn(session, turnAnim.face, turnAnim.dir);
          noteTutorial("faceTurn");
        } else {
          const face = session.face;
          session = { ...session, face: turnAnim.face };
          session = applyTwist(session, turnAnim.twist);
          session = { ...session, face };
          noteTutorial("swipe");
        }
        noteNewlySolvedFaces(prevBits);
        const landed = turnAnim;
        turnAnim = null;
        if (landed.kind === "face") {
          triggerStickerDrop({ face: landed.face, kind: "face" });
        } else {
          triggerStickerDrop({
            face: landed.face,
            kind: landed.axis,
            index: landed.index,
          });
        }
      }
    }
    if (springAxis) {
      springUv += (0 - springUv) * 0.16;
      if (Math.abs(springUv) < 0.008) {
        springUv = 0;
        springAxis = null;
        springIndex = -1;
      }
    }
    if (rotating && !orbitDrag) {
      const speed = 0.14;
      orient = quatSlerp(orient, targetOrient, speed);
      if (Math.abs(quatDot(orient, targetOrient)) > 0.9995) {
        orient = snapOrient(targetOrient);
        targetOrient = quatCopy(orient);
        rotating = false;
        syncActiveFace();
      }
    }
  }

  const animating = isAnimating();
  if (needsPaint || animating) {
    paint();
    needsPaint = animating;
  }
  requestAnimationFrame(tick);
}

function goHome(): void {
  screen = "home";
  resetPlayVisuals();
}

function startPlay(): void {
  if (!hasOnboarded()) {
    beginOnboarding();
    sfxPaperFlutter();
    return;
  }
  resetPlayVisuals();
  session = resumeOrStartSession(
    session.size,
    activeStickerPool(),
    session.faceStickers,
  );
  solvedFaceBits = faceSolvedBits(session.cube);
  saveCubeSize(session.size);
  syncActiveFace();
  screen = "play";
  sfxPaperRustle();
}

canvas.addEventListener(
  "pointerdown",
  (e) => {
    e.preventDefault();
    markDirty();
    unlockAudio();
    unlockMusic();
    canvas.setPointerCapture(e.pointerId);
    const p = canvasPoint(e);

    if (screen === "home") {
      if (hitUiRect(HOME_PLAY, p.x, p.y)) {
        sfxPaperFlutter();
        startPlay();
        return;
      }
      if (hitUiRect(HOME_HOW, p.x, p.y)) {
        openHelp("home");
        return;
      }
      if (hitUiRect(HOME_SETTINGS, p.x, p.y)) {
        settingsFrom = "home";
        screen = "settings";
        return;
      }
      return;
    }

    if (screen === "themes") {
      const picked = hitThemePicker(p.x, p.y);
      if (picked) {
        pickTheme(picked);
        return;
      }
      if (getTheme() === "anime" && hitUiRect(THEMES_ANIME_MODE, p.x, p.y)) {
        applyAnimeModeToggle();
        return;
      }
      if (hitUiRect(THEMES_BACK, p.x, p.y)) {
        if (onboarding === "theme") {
          if (!onboardingThemePicked) {
            sfxPaperRustle();
            return;
          }
          finishOnboarding();
          return;
        }
        screen = themesFrom;
        sfxPaperRustle();
        return;
      }
      return;
    }

    if (screen === "settings") {
      if (hitUiRect(SETTINGS_VOL, p.x, p.y)) {
        cycleSfxVolume();
        return;
      }
      if (hitUiRect(SETTINGS_MUSIC, p.x, p.y)) {
        cycleMusicVolume();
        sfxPaperRustle();
        return;
      }
      if (hitUiRect(SETTINGS_THEME, p.x, p.y)) {
        openThemes("settings");
        return;
      }
      if (hitUiRect(SETTINGS_SIZE, p.x, p.y)) {
        const next = cycleCubeSize(session.size);
        session = startSession(next, activeStickerPool(), session.faceStickers);
        solvedFaceBits = faceSolvedBits(session.cube);
        clearHint();
        return;
      }
      if (hitUiRect(SETTINGS_MOVES, p.x, p.y)) {
        cycleMoveLimit(loadMoveLimit());
        session = startSession(
          session.size,
          activeStickerPool(),
          session.faceStickers,
        );
        solvedFaceBits = faceSolvedBits(session.cube);
        clearHint();
        sfxPaperRustle();
        return;
      }
      if (hitUiRect(SETTINGS_HINTS, p.x, p.y)) {
        toggleHintsEnabled();
        if (!getHintsEnabled()) clearHint();
        sfxPaperRustle();
        return;
      }
      if (hitUiRect(SETTINGS_BACK, p.x, p.y)) {
        screen = settingsFrom === "menu" ? "menu" : settingsFrom;
        return;
      }
      return;
    }

    if (screen === "stickers") {
      if (!stickersMustPick && hitUiRect(STICKERS_BACK, p.x, p.y)) {
        screen = stickersFrom === "menu" ? "menu" : stickersFrom;
        if (tutorial && tutorialStep()?.action === "stickers") {
          // Closed without applying — stay on stickers step
          screen = "play";
        }
        sfxPaperRustle();
        return;
      }
      if (hitUiRect(STICKERS_RANDOM, p.x, p.y)) {
        const map = pickFaceStickers(() => Math.random(), activeStickerPool());
        stickerDraft = [...map];
        stickerSlot = 0;
        sfxPaperFlutter();
        return;
      }
      if (hitUiRect(STICKERS_APPLY, p.x, p.y)) {
        if (
          stickerDraft.every((k) => k != null) &&
          new Set(stickerDraft).size === 6
        ) {
          session = setFaceStickers(session, stickerDraft as TileKind[]);
          clearHint();
          stickersMustPick = false;
          if (onboarding === "stickers") {
            onboarding = null;
            screen = "home";
            sfxPaperFlutter();
            return;
          }
          if (tutorial && tutorialStep()?.action === "stickers") {
            screen = "play";
            noteTutorial("stickers");
            return;
          }
          screen =
            stickersFrom === "menu"
              ? "menu"
              : stickersFrom === "home"
                ? "home"
                : "play";
          sfxPaperFlutter();
        }
        return;
      }
      const slot = hitStickersSlot(p.x, p.y);
      if (slot != null) {
        stickerSlot = slot;
        return;
      }
      if (hitUiRect(STICKERS_GRID, p.x, p.y)) {
        stickersScrollDrag = {
          y0: p.y,
          x0: p.x,
          scroll0: stickersScroll,
          moved: false,
          lastX: p.x,
          lastY: p.y,
        };
        return;
      }
      return;
    }

    if (screen === "menu") {
      if (hitUiRect(PAUSE_RESUME, p.x, p.y)) {
        screen = "play";
        return;
      }
      if (hitUiRect(PAUSE_THEMES, p.x, p.y)) {
        openThemes("menu");
        return;
      }
      if (hitUiRect(PAUSE_HOW, p.x, p.y)) {
        openHelp("menu");
        return;
      }
      if (hitUiRect(PAUSE_SETTINGS, p.x, p.y)) {
        settingsFrom = "menu";
        screen = "settings";
        return;
      }
      if (hitUiRect(PAUSE_HOME, p.x, p.y)) {
        goHome();
        return;
      }
      return;
    }

    if (session.status === "solved" || session.status === "lost") {
      if (hitVolumeButton(p.x, p.y)) {
        cycleHudVolume();
        return;
      }
      if (hitAnimeModeButton(p.x, p.y)) {
        applyAnimeModeToggle();
        return;
      }
      if (hitUiRect(MENU_BTN, p.x, p.y)) {
        screen = "menu";
        return;
      }
      if (hitRetry(p.x, p.y)) {
        session = doScramble(session);
        solvedFaceBits = faceSolvedBits(session.cube);
        outcomeSfxPlayed = null;
        resetPlayVisuals();
        syncActiveFace();
        sfxScramble();
        return;
      }
      if (hitSolvedHome(p.x, p.y)) {
        goHome();
        return;
      }
      return;
    }

    if (hitVolumeButton(p.x, p.y)) {
      cycleHudVolume();
      return;
    }

    if (tutorial && screen === "play") {
      const step = tutorialStep()!;
      if (
        onboarding !== "help" &&
        step.action === "next" &&
        hitUiRect(TUTORIAL_SKIP, p.x, p.y)
      ) {
        finishTutorial();
        return;
      }
      if (step.action === "next" && hitUiRect(TUTORIAL_NEXT, p.x, p.y)) {
        if (tutorial.step >= TUTORIAL_STEPS.length - 1) finishTutorial();
        else advanceTutorial();
        return;
      }
      // Block menu during tutorial
      if (hitUiRect(MENU_BTN, p.x, p.y)) {
        return;
      }
    } else if (hitUiRect(MENU_BTN, p.x, p.y)) {
      drag = null;
      orbitDrag = null;
      rotating = false;
      screen = "menu";
      sfxPaperRustle();
      return;
    }

    if (hitAnimeModeButton(p.x, p.y)) {
      applyAnimeModeToggle();
      return;
    }

    if (
      !tutorial &&
      hitMovesChip(p.x, p.y, session.moveLimit != null)
    ) {
      cycleMoveLimit(loadMoveLimit());
      session = startSession(
        session.size,
        activeStickerPool(),
        session.faceStickers,
      );
      solvedFaceBits = faceSolvedBits(session.cube);
      resetPlayVisuals();
      syncActiveFace();
      clearHint();
      sfxPaperRustle();
      return;
    }

    const playHintsLayout = getHintsEnabled() && !tutorial;
    if (hitPlayHint(p.x, p.y, playHintsLayout)) {
      triggerHint();
      return;
    }
    if (hitPlayScramble(p.x, p.y, playHintsLayout)) {
      if (tutorial && !tutorialAllows("scramble")) return;
      session = doScramble(session);
      solvedFaceBits = faceSolvedBits(session.cube);
      outcomeSfxPlayed = null;
      resetPlayVisuals();
      syncActiveFace();
      noteTutorial("scramble");
      sfxScramble();
      return;
    }
    if (hitPlayStickers(p.x, p.y, playHintsLayout)) {
      if (tutorial && !tutorialAllows("stickers")) return;
      openStickersPicker("play");
      return;
    }
    if (hitFaceTurnButtons(p.x, p.y)) return;

    if (orbitBtns) {
      const orb = hitOrbitButton(orbitBtns, p.x, p.y);
      if (orb) {
        startOrbitStep(orb);
        return;
      }
    }

    const layout = cubeLayout();
    const headOn = facingFaceDot(orient) >= 0.75;
    const hit =
      headOn && !rotating && !turnAnim ? hitFrontUV(layout, p.x, p.y) : null;
    if (hit && hit.face === session.face) {
      if (tutorial && !tutorialAllows("swipe")) return;
      const n = session.size;
      const c = Math.min(n - 1, Math.max(0, Math.floor(hit.u * n)));
      const r = Math.min(n - 1, Math.max(0, Math.floor(hit.v * n)));
      drag = {
        u0: hit.u,
        v0: hit.v,
        x0: p.x,
        y0: p.y,
        axis: null,
        index: -1,
        offsetUv: 0,
        r,
        c,
      };
      return;
    }

    // Prefer the mid band between cube and HINT row for free orbit + finger ring.
    if (hitOrbitBand(p.x, p.y) || inCubeOrbitZone(layout, p.x, p.y)) {
      beginOrbitDrag(p.x, p.y);
    }
  },
  { passive: false },
);

canvas.addEventListener(
  "pointermove",
  (e) => {
    e.preventDefault();
    markDirty();
    const p = canvasPoint(e);

    if (screen === "stickers" && stickersScrollDrag) {
      const dy = p.y - stickersScrollDrag.y0;
      if (Math.abs(dy) > 6 || Math.abs(p.x - stickersScrollDrag.x0) > 6) {
        stickersScrollDrag.moved = true;
      }
      stickersScrollDrag.lastX = p.x;
      stickersScrollDrag.lastY = p.y;
      const maxScroll = Math.max(
        0,
        stickersGridContentHeight(stickerDraft, stickerSlot) - STICKERS_GRID.h,
      );
      stickersScroll = Math.min(
        maxScroll,
        Math.max(0, stickersScrollDrag.scroll0 - dy),
      );
      return;
    }

    if (screen !== "play" || session.status !== "playing") return;

    if (orbitDrag) {
      const dx = p.x - orbitDrag.x0;
      const dy = p.y - orbitDrag.y0;
      orient = applyOrbitDragQuat(orbitDrag.q0, dx, dy, orbitSens());
      targetOrient = quatCopy(orient);
      orbitFinger = { x: p.x, y: p.y };
      syncActiveFace();
      return;
    }

    if (!drag || rotating) return;
    const layout = cubeLayout();
    const mapped = screenDeltaToFaceUV(layout, p.x - drag.x0, p.y - drag.y0);
    const du = mapped?.du ?? (p.x - drag.x0) / (layout.scale * 2);
    const dv = mapped?.dv ?? (p.y - drag.y0) / (layout.scale * 2);

    if (!drag.axis) {
      if (Math.abs(du) < 0.03 && Math.abs(dv) < 0.03) return;
      if (Math.abs(du) >= Math.abs(dv)) {
        drag.axis = "row";
        drag.index = drag.r;
      } else {
        drag.axis = "col";
        drag.index = drag.c;
      }
      sfxPaperRustle();
    }
    drag.offsetUv = drag.axis === "row" ? du : dv;
  },
  { passive: false },
);

function endDrag(): void {
  markDirty();
  if (screen === "stickers") {
    if (stickersScrollDrag) {
      if (!stickersScrollDrag.moved) {
        const kind = hitStickersGridKind(
          stickersScrollDrag.lastX,
          stickersScrollDrag.lastY,
          stickersScroll,
          stickerDraft,
          stickerSlot,
        );
        if (kind) {
          stickerDraft[stickerSlot] = kind;
          const next = stickerDraft.findIndex((k, i) => i > stickerSlot && !k);
          const wrap = stickerDraft.findIndex((k) => !k);
          stickerSlot = next >= 0 ? next : wrap >= 0 ? wrap : (stickerSlot + 1) % 6;
          sfxPaperFlutter();
        }
      }
      stickersScrollDrag = null;
    }
    return;
  }
  if (screen !== "play") return;
  if (orbitDrag) {
    endOrbitDrag();
    return;
  }
  if (!drag) return;
  const axis = drag.axis;
  const index = drag.index;
  const offsetUv = drag.offsetUv;
  drag = null;
  if (!axis || index < 0) return;
  const n = session.size;
  const steps = Math.round(offsetUv * n);
  if (steps === 0) {
    springAxis = axis;
    springIndex = index;
    springUv = offsetUv;
    sfxPaperRustle();
    return;
  }
  if (turnAnim) {
    springAxis = axis;
    springIndex = index;
    springUv = offsetUv;
    return;
  }
  const dir: 1 | -1 = steps > 0 ? 1 : -1;
  const amount = Math.min(n - 1, Math.abs(steps));
  springAxis = null;
  springIndex = -1;
  springUv = 0;
  doTwist({ axis, index, dir, amount }, offsetUv);
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", () => {
  markDirty();
  if (screen === "stickers") {
    stickersScrollDrag = null;
    return;
  }
  if (screen !== "play") return;
  if (orbitDrag) endOrbitDrag();
  if (drag?.axis) {
    springAxis = drag.axis;
    springIndex = drag.index;
    springUv = drag.offsetUv;
  }
  drag = null;
});

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);

async function boot(): Promise<void> {
  applyThemeChrome();
  ensureThemeArt(getTheme());
  onThemeArtReady(() => {
    invalidateDeskCache();
    markDirty();
  });
  resize();
  // After play-state lets exist — early onboarding used to TDZ-crash on fresh installs.
  if (!hasOnboarded()) beginOnboarding();
  // First paint immediately so iPhone isn't stuck on a black shell while art loads.
  markDirty();
  requestAnimationFrame(tick);
  await Promise.all([
    loadLogo(),
    loadStickers(),
    loadTutorialHand(),
    loadCubePaper(),
    loadSfx(),
  ]);
  invalidateDeskCache();
  markDirty();
  ensureThemeArt("classroom");
  ensureThemeArt("edgy");
  ensureThemeArt("doodle");
  ensureThemeArt("relic");
  ensureAnimeArtBoth();
  syncMusicForTheme(getTheme());
  syncActiveFace();
}

boot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
