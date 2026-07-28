import {
  applyFaceTurn,
  applyTwist,
  clearedCount,
  cycleCubeSize,
  cycleGameMode,
  cycleMoveLimit,
  doScramble,
  loadCubeSize,
  loadGameMode,
  loadMoveLimit,
  modeLabel,
  moveLimitLabel,
  saveCubeSize,
  setActiveFace,
  setFaceStickers,
  sizeLabel,
  startSession,
  type FaceId,
  type LaneTwist,
  type Session,
} from "./core/session";
import { suggestHintMove, type HintMove } from "./core/hint";
import { pickFaceStickers, stickerPoolForTheme, type TileKind } from "./core/stickers";
import { previewCube } from "./core/lane";
import {
  W,
  H,
  drawDesk,
  drawEndOverlay,
  drawFaceTurnButtons,
  drawHelpScreen,
  drawHomeScreen,
  drawHud,
  drawMenuButton,
  drawOrbitFinger,
  drawPauseMenu,
  drawPlayActions,
  drawSettingsScreen,
  drawStickersScreen,
  drawThemesScreen,
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
  loadLogo,
  stickersGridContentHeight,
  HELP_BACK,
  HELP_NEXT,
  HELP_PAGES,
  HELP_PREV,
  HOME_HOW,
  HOME_PLAY,
  HOME_SETTINGS,
  MENU_BTN,
  PAUSE_HOME,
  PAUSE_HOW,
  PAUSE_RESUME,
  PAUSE_SCRAMBLE,
  PAUSE_SETTINGS,
  PAUSE_THEMES,
  SETTINGS_BACK,
  SETTINGS_HINTS,
  SETTINGS_MODE,
  SETTINGS_MOVES,
  SETTINGS_MUSIC,
  SETTINGS_SIZE,
  SETTINGS_THEME,
  SETTINGS_VOL,
  STICKERS_APPLY,
  STICKERS_BACK,
  STICKERS_GRID,
  STICKERS_RANDOM,
  THEMES_ANIME_MODE,
  THEMES_BACK,
  type FaceTurnButtons,
} from "./view/draw";
import {
  drawCube3D,
  drawCubeOrbitButtons,
  facingFaceDot,
  facingFaceQuat,
  hitFrontUV,
  hitOrbitButton,
  screenDeltaToFaceUV,
  type CubeLayout,
  type CubeMotion,
} from "./view/cube3d";
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
  sfxPaperFlutter,
  sfxPaperRustle,
  sfxPaperSlide,
  unlockAudio,
} from "./audio/paper";
import {
  cycleMusicVolume,
  getMusicVolume,
  syncMusicForTheme,
  unlockMusic,
} from "./audio/music";
import { loadStickers } from "./view/stickers";
import { detectQuality, getQuality } from "./view/quality";
import {
  applyThemeChrome,
  getAnimeMode,
  getTheme,
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

function hasSeenHelp(): boolean {
  try {
    return localStorage.getItem(HELP_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markHelpSeen(): void {
  try {
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

/** Drop face stickers that aren't in the active theme pool so art can load. */
function rematchStickersToActivePool(): void {
  const pool = activeStickerPool();
  const ok = session.faceStickers.every((k) =>
    (pool as readonly string[]).includes(k),
  );
  if (!ok) {
    session = setFaceStickers(
      session,
      pickFaceStickers(() => Math.random(), pool),
    );
  }
  if (screen === "stickers") {
    stickerDraft = stickerDraft.map((k) =>
      k && (pool as readonly string[]).includes(k) ? k : null,
    );
    const empty = stickerDraft.findIndex((k) => !k);
    stickerSlot = empty >= 0 ? empty : 0;
  }
}

function applyThemeChange(): void {
  reloadThemeArt(getTheme());
  rematchStickersToActivePool();
  void loadStickers();
  syncMusicForTheme(getTheme());
}

function applyAnimeModeToggle(): void {
  toggleAnimeMode();
  applyThemeChange();
  sfxPaperRustle();
}

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

type Screen =
  | "home"
  | "play"
  | "menu"
  | "settings"
  | "stickers"
  | "themes"
  | "help";
let screen: Screen = "home";
let settingsFrom: Screen = "home";
let themesFrom: Screen = "settings";
let helpFrom: Screen = "home";
let helpPage = 0;

let session: Session = startSession(loadCubeSize(), activeStickerPool());
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

function activeMotion(): CubeMotion {
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
    };
  }
  return { axis: null, index: -1, offset: 0, hovering: false };
}

function resetPlayVisuals(): void {
  drag = null;
  springUv = 0;
  springAxis = null;
  springIndex = -1;
  turnAnim = null;
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
  const amount = Math.max(1, twist.amount ?? 1);
  const n = session.size;
  const toUv = (twist.dir * amount) / n;
  const sameDir = fromUv === 0 || Math.sign(fromUv) === Math.sign(toUv);
  // Already dragged to (or past) the commit distance — land immediately.
  if (sameDir && Math.abs(fromUv) >= Math.abs(toUv) * 0.92) {
    session = applyTwist(session, { ...twist, amount });
    sfxPaperSlide();
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
  sfxPaperSlide();
}

function doFaceTurn(dir: 1 | -1): void {
  if (session.status !== "playing" || turnAnim) return;
  turnAnim = { kind: "face", face: session.face, dir, t: 0, ms: TURN_MS };
  sfxPaperSlide();
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
  orbitDrag = null;
  if (rotating) {
    orient = quatCopy(targetOrient);
    rotating = false;
    syncActiveFace();
  }
  let q = orient;
  if (Math.abs(quatDot(q, DEFAULT_ORIENT)) > 0.999) {
    q = quatIdentity();
  } else {
    q = snapOrbitQuat(q);
  }
  targetOrient = orbitStepQuat(q, dir);
  rotating = true;
  sfxPaperFlutter();
  syncActiveFace();
}

function beginOrbitDrag(x: number, y: number): void {
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
  sfxPaperFlutter();
}

function openStickersPicker(): void {
  stickerDraft = [...session.faceStickers];
  stickerSlot = 0;
  stickersScroll = 0;
  stickersScrollDrag = null;
  screen = "stickers";
  sfxPaperRustle();
}

function openThemes(from: Screen): void {
  themesFrom = from;
  screen = "themes";
  sfxPaperRustle();
}

function openHelp(from: Screen): void {
  helpFrom = from;
  helpPage = 0;
  screen = "help";
  sfxPaperRustle();
}

function closeHelp(): void {
  markHelpSeen();
  screen = helpFrom;
  sfxPaperRustle();
}

function pickTheme(id: ThemeId): void {
  if (id === getTheme()) return;
  setTheme(id);
  applyThemeChange();
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
      modeLabel: modeLabel(loadGameMode()),
      moveLimitLabel: moveLimitLabel(loadMoveLimit()),
      hintsOn: getHintsEnabled(),
    });
    return;
  }
  if (screen === "themes") {
    drawThemesScreen(ctx, {
      selected: getTheme(),
      animeMode: getAnimeMode(),
    });
    return;
  }
  if (screen === "help") {
    drawHelpScreen(ctx, { page: helpPage });
    return;
  }
  if (screen === "stickers") {
    drawStickersScreen(ctx, {
      draft: stickerDraft,
      slot: stickerSlot,
      scroll: stickersScroll,
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
    mode: session.mode,
    cleared: clearedCount(session),
    moveLimit: session.moveLimit,
  });
  drawMenuButton(ctx);

  drawCube3D(ctx, layout, display, {
    activeFace: session.face,
    motion,
    sourceCube: source,
    faceStickers: session.faceStickers,
    clearedFaces: session.mode === "clear" ? session.cleared : undefined,
    hintMove: hintT > 0 && hintT < 1 ? hintMove : null,
    hintT,
  });
  orbitBtns = drawCubeOrbitButtons(ctx, layout.cx, layout.cy, layout.scale, W, H);

  if (session.status === "playing") {
    drawPlayActions(ctx, { hintsOn: getHintsEnabled() });
    if (orbitFinger) drawOrbitFinger(ctx, orbitFinger.x, orbitFinger.y);
    faceTurnBtns = drawFaceTurnButtons(ctx);
  } else {
    faceTurnBtns = null;
  }

  if (session.status === "solved" || session.status === "lost") {
    drawEndOverlay(ctx, {
      moves: session.moveCount,
      outcome: session.status === "lost" ? "lost" : "solved",
      mode: session.mode,
      cleared: clearedCount(session),
    });
  }
  if (screen === "menu") {
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
        if (turnAnim.kind === "face") {
          session = applyFaceTurn(session, turnAnim.face, turnAnim.dir);
        } else {
          const face = session.face;
          session = { ...session, face: turnAnim.face };
          session = applyTwist(session, turnAnim.twist);
          session = { ...session, face };
        }
        turnAnim = null;
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
  paint();
  requestAnimationFrame(tick);
}

function goHome(): void {
  screen = "home";
  resetPlayVisuals();
}

function startPlay(): void {
  resetPlayVisuals();
  session = startSession(session.size, activeStickerPool());
  saveCubeSize(session.size);
  syncActiveFace();
  if (!hasSeenHelp()) {
    openHelp("play");
    return;
  }
  screen = "play";
  sfxPaperRustle();
}

canvas.addEventListener(
  "pointerdown",
  (e) => {
    e.preventDefault();
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

    if (screen === "help") {
      if (hitUiRect(HELP_PREV, p.x, p.y)) {
        if (helpPage > 0) {
          helpPage -= 1;
          sfxPaperRustle();
        }
        return;
      }
      if (hitUiRect(HELP_NEXT, p.x, p.y)) {
        if (helpPage >= HELP_PAGES.length - 1) {
          closeHelp();
        } else {
          helpPage += 1;
          sfxPaperRustle();
        }
        return;
      }
      if (hitUiRect(HELP_BACK, p.x, p.y)) {
        closeHelp();
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
        if (settingsFrom === "menu")
          session = startSession(next, activeStickerPool());
        else session = { ...session, size: next };
        clearHint();
        return;
      }
      if (hitUiRect(SETTINGS_MODE, p.x, p.y)) {
        cycleGameMode(loadGameMode());
        if (settingsFrom === "menu") {
          session = startSession(session.size, activeStickerPool());
          clearHint();
        }
        sfxPaperRustle();
        return;
      }
      if (hitUiRect(SETTINGS_MOVES, p.x, p.y)) {
        cycleMoveLimit(loadMoveLimit());
        if (settingsFrom === "menu") {
          session = startSession(session.size, activeStickerPool());
          clearHint();
        }
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
      if (hitUiRect(STICKERS_BACK, p.x, p.y)) {
        screen = "play";
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
          screen = "play";
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
      if (hitUiRect(PAUSE_SCRAMBLE, p.x, p.y)) {
        session = doScramble(session);
        resetPlayVisuals();
        syncActiveFace();
        screen = "play";
        sfxPaperRustle();
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
        cycleSfxVolume();
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
        resetPlayVisuals();
        syncActiveFace();
        sfxPaperRustle();
        return;
      }
      if (hitSolvedHome(p.x, p.y)) {
        goHome();
        return;
      }
      return;
    }

    if (hitUiRect(MENU_BTN, p.x, p.y)) {
      drag = null;
      orbitDrag = null;
      rotating = false;
      screen = "menu";
      sfxPaperRustle();
      return;
    }
    if (hitVolumeButton(p.x, p.y)) {
      cycleSfxVolume();
      return;
    }
    if (hitAnimeModeButton(p.x, p.y)) {
      applyAnimeModeToggle();
      return;
    }

    const hintsOn = getHintsEnabled();
    if (hitPlayHint(p.x, p.y, hintsOn)) {
      triggerHint();
      return;
    }
    if (hitPlayScramble(p.x, p.y, hintsOn)) {
      session = doScramble(session);
      resetPlayVisuals();
      syncActiveFace();
      sfxPaperRustle();
      return;
    }
    if (hitPlayStickers(p.x, p.y, hintsOn)) {
      openStickersPicker();
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
    /* next paint picks up art */
  });
  resize();
  await Promise.all([loadLogo(), loadStickers()]);
  ensureThemeArt("classroom");
  ensureThemeArt("edgy");
  ensureThemeArt("doodle");
  ensureThemeArt("relic");
  ensureAnimeArtBoth();
  syncMusicForTheme(getTheme());
  syncActiveFace();
  requestAnimationFrame(tick);
}

boot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
