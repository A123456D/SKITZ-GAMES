import { chooseAiMove } from "./core/ai";
import { getCard } from "./core/cards";
import { fullCraftDeck } from "./core/decks";
import { catalogOrder } from "./core/catalog";
import { collectiblePool } from "./core/construct";
import { HERESY_IDS, heresyName, heresyPickFace, heresyPitch, heresyShort, heresyVerb } from "./core/heresies";
import { applyIntent, createMatch, lawHeresyProgress, legalIntents, printedFacePower, sidePlaysHeresy, takeEvents, unitPower, witnessCostAt } from "./core/match";
import {
  CARD_ANCHORS,
  tutorialCoach,
  tutorialHint,
  tutorialSelectHandIndex,
  tutorialShowsCard,
  tutorialTarget,
  tutorialTeachCard,
  tutorialUiMode,
  isTutorialSoftPass,
} from "./core/tutorial";
import {
  ECLIPSE_WIN,
  START_WILL,
  type AiDifficulty,
  type Altitude,
  type Heresy,
  type Intent,
  type MatchState,
  type OculusEvent,
  type Side,
} from "./core/types";
import {
  clearCardFaceCache,
  handCardSrc,
  preloadCardChrome,
} from "./view/cardBake";
import {
  isMusicMuted,
  isMuted,
  playSfx,
  setMusicBed,
  setMusicMuted,
  setMuted,
  unlockAudio,
  armUnlockOnGesture,
} from "./view/audio";
import { OculusStage } from "./view/gl/stage";
import { FpsSampler } from "./view/perf";
import { bindFoilStage } from "./view/foilCard";
import { CARD_SKINS_ENABLED } from "./view/skins";
import { hasArtLayers, setStackArtLayers } from "./view/cardLayers";
import { cardMetaHtml } from "./view/cardMeta";
import { bindLiftInspect, initCardInspect } from "./view/cardInspect";
import { initDeckBuilder } from "./view/deckBuilder";

const CODEX_ALL = catalogOrder(collectiblePool());
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const menu = document.getElementById("menu")!;
const endPanel = document.getElementById("end")!;
const codexPanel = document.getElementById("codex")!;
const builderPanel = document.getElementById("deck-builder")!;
const inspectPanel = document.getElementById("card-inspect")!;
const riteReveal = document.getElementById("rite-reveal")!;
const riteRevealKicker = document.getElementById("rite-reveal-kicker")!;
const riteRevealTitle = document.getElementById("rite-reveal-title")!;
const riteRevealFace = document.getElementById("rite-reveal-face") as HTMLImageElement;
const riteRevealBody = document.getElementById("rite-reveal-body")!;
const riteRevealContinue = document.getElementById("rite-reveal-continue") as HTMLButtonElement;
const pausePanel = document.getElementById("pause")!;
const settingsPanel = document.getElementById("settings")!;
const howtoPanel = document.getElementById("howto")!;
const heresyPickPanel = document.getElementById("heresy-pick")!;
const heresyListEl = document.getElementById("heresy-list")!;
const unsupported = document.getElementById("unsupported")!;
const toastEl = document.getElementById("toast")!;
const toastText = document.getElementById("toast-text")!;
const eventLogPanel = document.getElementById("event-log-panel")!;
const eventLogEl = document.getElementById("event-log")!;
const btnHudLog = document.getElementById("btn-hud-log") as HTMLButtonElement;
const btnEventLogClose = document.getElementById("event-log-close") as HTMLButtonElement;
const spectateChip = document.getElementById("spectate-chip")!;
const phaseBanner = document.getElementById("phase-banner")!;
const phaseKicker = document.getElementById("phase-kicker")!;
const phaseTitle = document.getElementById("phase-title")!;
const phaseSub = document.getElementById("phase-sub")!;
const vfxWash = document.getElementById("vfx-wash")!;
const coachEl = document.getElementById("coach")!;
const coachTitle = document.getElementById("coach-title")!;
const coachBody = document.getElementById("coach-body")!;
const coachAction = document.getElementById("coach-action")!;
const coachCta = document.getElementById("coach-cta") as HTMLButtonElement;
const tutorGuide = document.getElementById("tutor-guide")!;
const tutorCardStage = document.getElementById("tutor-card-stage")!;
const tutorCardFace = document.getElementById("tutor-card-face") as HTMLImageElement;
const tutorRing = document.getElementById("tutor-ring")!;
const tutorArrowPath = document.getElementById("tutor-arrow-path")!;
const tutorPin = document.getElementById("tutor-pin")!;
const dragLayer = document.getElementById("drag-layer")!;
const dragGhost = document.getElementById("drag-ghost")!;
const dragCardImg = document.getElementById("drag-card") as HTMLImageElement;
const fxLayer = document.getElementById("fx-layer")!;
const fxGhost = document.getElementById("fx-ghost")!;
const fxCardImg = document.getElementById("fx-card") as HTMLImageElement;
const deckAnchor = document.getElementById("deck-anchor")!;
const handEl = document.getElementById("hand")!;
const handArea = document.getElementById("hand-area")!;
const actionsEl = document.getElementById("actions")!;
const metersEl = document.getElementById("meters")!;
const willrowEl = document.getElementById("willrow")!;
const btnHudMenu = document.getElementById("btn-hud-menu") as HTMLButtonElement;
const btnHudSettings = document.getElementById("btn-hud-settings") as HTMLButtonElement;
const settingsMotion = document.getElementById("settings-motion") as HTMLInputElement;
const settingsMuteSfx = document.getElementById("settings-mute-sfx") as HTMLInputElement;
const settingsMuteMusic = document.getElementById("settings-mute-music") as HTMLInputElement;
const settingsDifficulty = document.getElementById("settings-difficulty") as HTMLSelectElement;
const endTitle = document.getElementById("end-title")!;
const endDetail = document.getElementById("end-detail")!;
const endKicker = document.getElementById("end-kicker")!;
const endExplain = document.getElementById("end-explain")!;
const endOutcome = document.getElementById("end-outcome")!;
const victoryReveal = document.getElementById("victory-reveal")!;
const victoryKicker = document.getElementById("victory-kicker")!;
const victoryTitleEl = document.getElementById("victory-title")!;
const victorySub = document.getElementById("victory-sub")!;
const victoryExplain = document.getElementById("victory-explain")!;
const victoryScore = document.getElementById("victory-score")!;
const victoryOutcome = document.getElementById("victory-outcome")!;
const victorySparks = document.getElementById("victory-sparks")!;
const victoryContinue = document.getElementById("victory-continue") as HTMLButtonElement;
const btnWitness = document.getElementById("btn-witness") as HTMLButtonElement;
const btnReveil = document.getElementById("btn-reveil") as HTMLButtonElement;
const btnStance = document.getElementById("btn-stance") as HTMLButtonElement;
const btnWager = document.getElementById("btn-wager") as HTMLButtonElement;
const btnPress = document.getElementById("btn-press") as HTMLButtonElement;
const btnPeal = document.getElementById("btn-peal") as HTMLButtonElement;
const btnPass = document.getElementById("btn-pass") as HTMLButtonElement;
const codexFace = document.getElementById("codex-face") as HTMLImageElement;
const codexFoil = document.getElementById("codex-foil") as HTMLElement;
const codexMeta = document.getElementById("codex-meta")!;
const codexThumbs = document.getElementById("codex-thumbs")!;
const codexFilterEl = document.getElementById("codex-filter") as HTMLSelectElement;
const mEssence = document.getElementById("m-essence")!;
const mEssenceFoe = document.getElementById("m-essence-foe")!;
const mSight = document.getElementById("m-sight")!;
const mSightFoe = document.getElementById("m-sight-foe")!;
const mFavor = document.getElementById("m-favor")!;
const mFavorFoe = document.getElementById("m-favor-foe")!;
const mTurn = document.getElementById("m-turn")!;
const willYou = document.getElementById("will-you") as HTMLElement;
const willFoe = document.getElementById("will-foe") as HTMLElement;
const willYouN = document.getElementById("will-you-n")!;
const willFoeN = document.getElementById("will-foe-n")!;
const eclYou = document.getElementById("ecl-you")!;
const eclFoe = document.getElementById("ecl-foe")!;
const eclPip = document.querySelector(".ecl-pip") as HTMLElement | null;
const lawChip = document.getElementById("law-chip")!;
const lawProgress = document.getElementById("law-progress")!;
const altHits = Array.from(document.querySelectorAll<HTMLElement>(".alt-hit"));

function setAltHitEnabled(hit: HTMLElement, on: boolean): void {
  hit.classList.toggle("disabled", !on);
  hit.setAttribute("aria-disabled", on ? "false" : "true");
  if (on) hit.setAttribute("tabindex", "0");
  else hit.setAttribute("tabindex", "-1");
}

const cardInspect = initCardInspect(inspectPanel);
const deckBuilder = initDeckBuilder({
  root: builderPanel,
  inspect: cardInspect,
  onBack: () => {
    builderPanel.hidden = true;
    menu.hidden = false;
    setMenuMode(true);
  },
  onPlay: (deck) => startMatch(false, deck),
});

let stage: OculusStage;
try {
  stage = new OculusStage(canvas);
} catch {
  unsupported.hidden = false;
  menu.hidden = true;
  throw new Error("WebGL2 required");
}

let state: MatchState | null = null;
let selectedHand: number | null = null;
let mode: "play" | "witness" | "reveil" | "stance" | "wager" | "press" | "peal" = "play";

type DragState = {
  handIndex: number;
  pointerId: number;
  startX: number;
  startY: number;
  active: boolean;
  cardSrc: string;
  dropping?: boolean;
};
let drag: DragState | null = null;
const DRAG_THRESHOLD = 28;
/** Hand slots to hide until draw flight lands (consumed by syncHud). */
let handDealCount = 0;
/** Drag-drop already flew the card — skip tap summon flight. */
let skipNextSummonFly = false;
let fxChain: Promise<void> = Promise.resolve();
/** Blocks double-commit while summon flight is in progress. */
let intentBusy = false;
let last = performance.now();
const fps = new FpsSampler();
let flashTimer = 0;
let phaseTimer = 0;
let codexIndex = 0;
let codexBuilt = false;
let codexFilter: Heresy | "all" = "all";
let codexIds = CODEX_ALL;
/** Last constructed deck used for rematch (Teach / tutorial leave this null). */
let lastConstructedDeck: string[] | null = null;
/** DPR hysteresis ? avoid buffer thrash flash when FPS oscillates. */
let dprLowFrames = 0;
let dprHighFrames = 0;
/** Pause / settings overlay ? blocks match input & AI. */
let uiPaused = false;
/** Both seats AI — slow live spectate (Toll bottom / Motley top). */
let spectatorMode = false;
let spectateGen = 0;
let spectateBusy = false;
type SettingsReturn = "menu" | "pause" | "play";
let settingsReturn: SettingsReturn = "menu";
let howtoReturn: SettingsReturn = "menu";
const SETTINGS_KEY = "oculum.settings";
const unbindCodexFoil = bindFoilStage(codexFoil);
void unbindCodexFoil;

type AppSettings = { reduceMotion: boolean; aiDifficulty: AiDifficulty };

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { reduceMotion: false, aiDifficulty: "normal" };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const d = parsed.aiDifficulty;
    const aiDifficulty: AiDifficulty =
      d === "easy" || d === "hard" || d === "normal" ? d : "normal";
    return { reduceMotion: !!parsed.reduceMotion, aiDifficulty };
  } catch {
    return { reduceMotion: false, aiDifficulty: "normal" };
  }
}

function saveSettings(s: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function applySettings(s: AppSettings): void {
  document.body.classList.toggle("reduce-motion", s.reduceMotion);
  settingsMotion.checked = s.reduceMotion;
  stage.setReduceMotion(s.reduceMotion);
  settingsDifficulty.value = s.aiDifficulty;
  settingsMuteSfx.checked = isMuted();
  settingsMuteMusic.checked = isMusicMuted();
}

applySettings(loadSettings());

function setMenuMode(on: boolean): void {
  document.body.classList.toggle("on-menu", on);
  stage.setMenuBackground(on);
  if (on) {
    hidePhaseBanner();
    clearTutorGuide();
  }
}

function setEnemyTurn(on: boolean): void {
  document.body.classList.toggle("enemy-turn", on);
}

function hideAllSheets(): void {
  menu.hidden = true;
  endPanel.hidden = true;
  codexPanel.hidden = true;
  builderPanel.hidden = true;
  pausePanel.hidden = true;
  settingsPanel.hidden = true;
  howtoPanel.hidden = true;
  heresyPickPanel.hidden = true;
  const spectatePick = document.getElementById("spectate-pick");
  if (spectatePick) spectatePick.hidden = true;
  hideRiteReveal();
  hideVictoryReveal();
  closeEventLog();
  cardInspect.close();
}

function goToMenu(): void {
  state = null;
  uiPaused = false;
  spectatorMode = false;
  spectateGen += 1;
  spectateBusy = false;
  spectateChip.hidden = true;
  clearEventLog();
  document.body.classList.remove("spectating", "paused", "rite-reveal-open", "victory-open", "victory-win", "victory-lose");
  setMusicBed("menu");
  hideAllSheets();
  menu.hidden = false;
  setMenuMode(true);
  setEnemyTurn(false);
  syncHud();
}

function openPause(): void {
  if (!state || state.phase !== "play") return;
  uiPaused = true;
  closeEventLog();
  cardInspect.close();
  settingsPanel.hidden = true;
  howtoPanel.hidden = true;
  pausePanel.hidden = false;
  document.body.classList.add("paused");
  syncHud();
}

function resumeMatch(): void {
  if (!state || state.phase !== "play") {
    goToMenu();
    return;
  }
  uiPaused = false;
  pausePanel.hidden = true;
  settingsPanel.hidden = true;
  howtoPanel.hidden = true;
  document.body.classList.remove("paused");
  setMenuMode(false);
  syncHud();
  if (state.active === "enemy") window.setTimeout(runEnemy, 320);
}

function openSettings(from: SettingsReturn): void {
  settingsReturn = from;
  settingsPanel.hidden = false;
  howtoPanel.hidden = true;
  menu.hidden = true;
  pausePanel.hidden = true;
  codexPanel.hidden = true;
  builderPanel.hidden = true;
  heresyPickPanel.hidden = true;
  endPanel.hidden = true;
  cardInspect.close();
  applySettings(loadSettings());
  if (from === "menu") {
    document.body.classList.remove("paused");
    setMenuMode(true);
  } else {
    uiPaused = true;
    document.body.classList.add("paused");
    setMenuMode(false);
  }
  syncHud();
}

function openHowto(from: SettingsReturn): void {
  howtoReturn = from;
  howtoPanel.hidden = false;
  settingsPanel.hidden = true;
  menu.hidden = true;
  pausePanel.hidden = true;
  codexPanel.hidden = true;
  builderPanel.hidden = true;
  endPanel.hidden = true;
  cardInspect.close();
  if (from === "menu") {
    document.body.classList.remove("paused");
    setMenuMode(true);
  } else {
    uiPaused = true;
    document.body.classList.add("paused");
    setMenuMode(false);
  }
  syncHud();
}

function closeHowto(): void {
  howtoPanel.hidden = true;
  if (howtoReturn === "menu") {
    menu.hidden = false;
    document.body.classList.remove("paused");
    setMenuMode(true);
    syncHud();
  } else if (howtoReturn === "pause") {
    pausePanel.hidden = false;
    document.body.classList.add("paused");
    setMenuMode(false);
    syncHud();
  } else {
    resumeMatch();
  }
}

function closeSettings(): void {
  settingsPanel.hidden = true;
  if (settingsReturn === "menu") {
    menu.hidden = false;
    document.body.classList.remove("paused");
    setMenuMode(true);
    syncHud();
  } else if (settingsReturn === "pause") {
    pausePanel.hidden = false;
    document.body.classList.add("paused");
    setMenuMode(false);
    syncHud();
  } else {
    resumeMatch();
  }
}

const TOAST_KINDS = [
  "toast-witness",
  "toast-gaze",
  "toast-resolve",
  "toast-round",
  "toast-pass",
  "toast-law",
  "toast-play",
  "toast-stance",
  "toast-graft",
  "toast-rite",
  "toast-stain",
  "toast-strain",
  "toast-blind",
  "toast-eclipse",
  "toast-fall",
] as const;

function showToast(msg: string | null, kind: string | null = null): void {
  if (!msg) {
    toastEl.hidden = true;
    toastText.textContent = "";
    toastEl.classList.remove(...TOAST_KINDS);
    return;
  }
  toastEl.hidden = false;
  toastText.textContent = msg;
  toastEl.classList.remove(...TOAST_KINDS);
  if (kind) toastEl.classList.add(`toast-${kind}`);
}

const EVENT_LOG_MAX = 40;

function isEventLogOpen(): boolean {
  return !eventLogPanel.hidden;
}

function setEventLogUnread(on: boolean): void {
  if (on) btnHudLog.dataset.unread = "1";
  else delete btnHudLog.dataset.unread;
}

function closeEventLog(): void {
  eventLogPanel.hidden = true;
  btnHudLog.setAttribute("aria-expanded", "false");
  setEventLogUnread(false);
}

function openEventLog(): void {
  eventLogPanel.hidden = false;
  btnHudLog.setAttribute("aria-expanded", "true");
  setEventLogUnread(false);
  if (!eventLogEl.children.length) {
    const empty = document.createElement("p");
    empty.className = "event-log-empty";
    empty.textContent = "No events yet — plays, Witness, Resolve, and Eclipse land here.";
    eventLogEl.append(empty);
  }
}

function toggleEventLog(): void {
  if (isEventLogOpen()) closeEventLog();
  else openEventLog();
}

function clearEventLog(): void {
  eventLogEl.innerHTML = "";
  closeEventLog();
}

function pushEventLog(msg: string, kind: string | null = null): void {
  eventLogEl.querySelector(".event-log-empty")?.remove();
  const row = document.createElement("div");
  row.className = `event-log-row${kind ? ` event-log--${kind}` : ""}`;
  row.textContent = msg;
  eventLogEl.prepend(row);
  while (eventLogEl.children.length > EVENT_LOG_MAX) {
    eventLogEl.lastElementChild?.remove();
  }
  if (!isEventLogOpen()) setEventLogUnread(true);
}

/** Toast + durable log — every game beat must be readable. */
function explain(msg: string, ms = 2000, kind: string | null = null): void {
  pushEventLog(msg, kind);
  flashToast(msg, ms, kind);
}

function whoLabel(side: Side): string {
  if (spectatorMode) return spectateCraftName(side);
  return side === "player" ? "You" : "Foe";
}

/** Subject + verb for explain lines ("You summon" / "Foe summons"). */
function whoVerb(side: Side, singular: string, plural: string): string {
  if (spectatorMode) {
    return `${spectateCraftName(side)} ${plural}`;
  }
  return side === "player" ? `You ${singular}` : `Foe ${plural}`;
}

function whose(side: Side): string {
  if (spectatorMode) return `${spectateCraftName(side)}'s`;
  return side === "player" ? "Your" : "Foe's";
}

function eclipseReasonLabel(reason: string): string {
  switch (reason) {
    case "trick":
      return "Trick (Veiled Stance B + paid Wager; spends Favor)";
    case "masque":
      return "Lady Masque";
    case "law":
      return "Unblinking Law";
    default:
      return reason;
  }
}

function flashToast(msg: string, ms = 1600, kind: string | null = null): void {
  showToast(msg, kind);
  flashTimer = ms;
}

function hidePhaseBanner(): void {
  phaseBanner.hidden = true;
  phaseTimer = 0;
  vfxWash.hidden = true;
  vfxWash.className = "";
}

function flashPhase(
  title: string,
  opts?: {
    kicker?: string;
    sub?: string;
    kind?: "resolve" | "round" | "pass" | "rite" | "fall" | "eclipse" | "victory" | "break";
    ms?: number;
  },
): void {
  const kind = opts?.kind ?? "round";
  const reduce = document.body.classList.contains("reduce-motion");
  phaseKicker.textContent = opts?.kicker ?? "";
  phaseSub.textContent = opts?.sub ?? "";
  // Animated letter spans for the title
  phaseTitle.replaceChildren();
  const chars = [...title];
  chars.forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "phase-char";
    span.textContent = ch === " " ? "\u00a0" : ch;
    span.style.setProperty("--i", String(i));
    phaseTitle.appendChild(span);
  });
  phaseBanner.hidden = false;
  phaseBanner.classList.remove(
    "phase-resolve",
    "phase-round",
    "phase-pass",
    "phase-rite",
    "phase-fall",
    "phase-eclipse",
    "phase-victory",
    "phase-break",
    "phase-pop",
  );
  phaseBanner.classList.add(`phase-${kind}`);
  void phaseBanner.offsetWidth;
  phaseBanner.classList.add("phase-pop");

  vfxWash.hidden = false;
  vfxWash.className = `vfx-wash vfx-wash--${kind}`;
  void vfxWash.offsetWidth;
  vfxWash.classList.add("vfx-wash-on");

  phaseTimer = opts?.ms ?? (kind === "resolve" || kind === "fall" || kind === "eclipse" || kind === "victory" || kind === "break" ? 2400 : 1800);
  if (reduce) phaseTimer = Math.min(phaseTimer, 900);
}

function punchWill(side: "you" | "foe"): void {
  const fill = side === "you" ? willYou : willFoe;
  const num = side === "you" ? willYouN : willFoeN;
  const row = fill.closest(".will-side") as HTMLElement | null;
  fill.classList.remove("will-hit");
  num.classList.remove("will-n-hit");
  row?.classList.remove("will-side-hit");
  void fill.offsetWidth;
  fill.classList.add("will-hit");
  num.classList.add("will-n-hit");
  row?.classList.add("will-side-hit");
  window.setTimeout(() => {
    fill.classList.remove("will-hit");
    num.classList.remove("will-n-hit");
    row?.classList.remove("will-side-hit");
  }, 520);
}

/** Floating −N Will chip over the hit bar — Break must read. */
function spawnWillFloat(side: "you" | "foe", amount: number): void {
  if (amount <= 0) return;
  const anchor = side === "you" ? willYouN : willFoeN;
  const rect = anchor.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = `will-float${side === "foe" ? " will-float--foe" : ""}`;
  el.textContent = `−${amount}`;
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + rect.height / 2}px`;
  const ms = document.body.classList.contains("reduce-motion") ? 420 : 920;
  window.setTimeout(() => el.remove(), ms);
}

function spawnEclipseFloat(side: "you" | "foe", amount: number, total: number): void {
  if (amount <= 0) return;
  const anchor = eclPip ?? (side === "you" ? willYouN : willFoeN);
  const rect = anchor.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = `ecl-float${side === "foe" ? " ecl-float--foe" : ""}`;
  el.innerHTML = `<span class="ecl-float-plus">+${amount}</span><span class="ecl-float-total">${total}/${ECLIPSE_WIN}</span>`;
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + rect.height / 2}px`;
  const ms = document.body.classList.contains("reduce-motion") ? 500 : 1400;
  window.setTimeout(() => el.remove(), ms);
}

function punchEclipsePip(surging: boolean): void {
  if (!eclPip) return;
  eclPip.classList.remove("meter-pulse", "ecl-surge", "ecl-critical");
  void eclPip.offsetWidth;
  eclPip.classList.add("meter-pulse", surging ? "ecl-critical" : "ecl-surge");
  window.setTimeout(() => {
    eclPip.classList.remove("ecl-surge", "ecl-critical");
  }, 1200);
}

function indicateWillLoss(side: "you" | "foe", amount: number): void {
  if (amount <= 0) return;
  punchWill(side);
  spawnWillFloat(side, amount);
}

function punchAltitude(alt: Altitude, kind: string): void {
  const hit = altHits.find((h) => Number(h.dataset.alt) === alt);
  if (!hit) return;
  hit.classList.remove(
    "fx-flash",
    "fx-gaze",
    "fx-play",
    "fx-summon",
    "fx-stance",
    "fx-resolve",
    "fx-stain",
    "fx-strain",
    "fx-blind",
    "fx-fall",
    "fx-eclipse",
    "fx-witness",
    "fx-rite",
  );
  void hit.offsetWidth;
  hit.classList.add("fx-flash", `fx-${kind}`);
  window.setTimeout(() => {
    hit.classList.remove("fx-flash", `fx-${kind}`);
  }, kind === "fall" ? 850 : 520);
}

function punchMeter(el: HTMLElement | null): void {
  if (!el) return;
  el.classList.remove("meter-pulse");
  void el.offsetWidth;
  el.classList.add("meter-pulse");
  window.setTimeout(() => el.classList.remove("meter-pulse"), 480);
}

function syncBadge(
  el: HTMLElement | null,
  on: boolean,
  text: string | undefined,
  pop: boolean,
): void {
  if (!el) return;
  const was = !el.hidden;
  const prevText = el.getAttribute("data-label") ?? el.textContent;
  el.hidden = !on;
  if (on && text != null) {
    el.setAttribute("data-label", text);
    el.setAttribute("aria-label", text);
    el.title = text;
    // Sprite badges keep empty visible text; label lives in title/aria.
    if (!el.classList.contains("alt-badge--toll") && !el.classList.contains("alt-badge--wager") && !el.classList.contains("alt-badge--stain")) {
      el.textContent = text;
    } else {
      el.textContent = "";
    }
  }
  const gained = on && !was;
  const textChanged = on && was && text != null && prevText !== text;
  if (gained || textChanged) {
    if (!pop && !textChanged) return;
    el.classList.remove("badge-pop");
    void el.offsetWidth;
    el.classList.add("badge-pop");
  }
}

function playWagerFlip(alt: Altitude, outcome: "cash" | "bust"): void {
  const hit = altHits.find((h) => Number(h.dataset.alt) === alt);
  if (!hit) return;
  hit.querySelectorAll(".fx-wager-flip").forEach((n) => n.remove());
  const el = document.createElement("div");
  el.className = `fx-wager-flip fx-wager-flip--${outcome}`;
  el.setAttribute("aria-hidden", "true");
  hit.appendChild(el);
  window.setTimeout(() => el.remove(), 1100);
}

function syncSideStatus(
  hit: HTMLElement,
  side: "player" | "enemy",
  u: MatchState["altitudes"][0]["player"],
  siteId: string | null,
): void {
  const row = hit.querySelector(`.alt-status.${side === "player" ? "you" : "foe"}`) as HTMLElement | null;
  if (!row) return;
  const veil = row.querySelector("[data-veil]") as HTMLElement | null;
  const stance = row.querySelector("[data-stance-mark]") as HTMLElement | null;
  const wager = row.querySelector("[data-wager]") as HTMLElement | null;
  const strain = row.querySelector("[data-strain]") as HTMLElement | null;
  const stain = row.querySelector("[data-stain]") as HTMLElement | null;
  const scrutiny = row.querySelector("[data-scrutiny]") as HTMLElement | null;
  const inh = row.querySelector("[data-inh]") as HTMLButtonElement | null;
  const graft = row.querySelector("[data-graft]") as HTMLButtonElement | null;
  const siteBtn = row.querySelector("[data-site]") as HTMLButtonElement | null;

  const sig = [
    u ? 1 : 0,
    u?.veiled ? 1 : 0,
    u?.stanceB ? 1 : 0,
    u?.wagered ? 1 : 0,
    u?.wagerAnteFavor ? 1 : 0,
    u?.hasThirdFace ? 1 : 0,
    u?.strained ? 1 : 0,
    u?.stained ? 1 : 0,
    u?.scrutiny ?? 0,
    u?.inhabitant ? 1 : 0,
    u?.grafts.length ?? 0,
    siteId ?? "",
  ].join(":");
  const pop = row.dataset.sig !== sig;
  row.dataset.sig = sig;

  syncBadge(veil, !!u?.veiled, "VEIL", pop);
  const showStance = !!(u && (u.hasThirdFace || u.stanceB || getCard(u.cardId).heresy === "motley"));
  syncBadge(stance, showStance && !!u, u?.stanceB ? "B" : "A", pop);
  syncBadge(wager, !!u?.wagered, u?.wagerAnteFavor ? "FAVOR" : u?.wagerAntePaid ? "ANTE" : "WAGER", pop);
  syncBadge(strain, !!u?.strained, "STR", pop);
  syncBadge(stain, !!u?.stained, "STAIN", pop);
  const scr = u?.scrutiny ?? 0;
  syncBadge(scrutiny, !!u && u.veiled && scr > 0, scr > 0 ? `SCR ${scr}` : "SCR", pop);
  syncBadge(inh, !!u?.inhabitant, "INH", pop);
  const gn = u?.grafts.length ?? 0;
  syncBadge(graft, gn > 0, `×${gn}`, pop);
  syncBadge(siteBtn, !!siteId, "SITE", pop);
}

let hudSnap = {
  essence: -1,
  enemyEssence: -1,
  sight: -1,
  enemySight: -1,
  favor: -1,
  enemyFavor: -1,
  eclipse: -1,
  enemyEclipse: -1,
  will: -1,
  enemyWill: -1,
};

function codexIdsForFilter(filter: Heresy | "all"): string[] {
  if (filter === "all") return CODEX_ALL;
  return CODEX_ALL.filter((id) => getCard(id).heresy === filter);
}

function buildCodexThumbs(): void {
  if (codexBuilt) return;
  codexThumbs.innerHTML = "";
  const showLabels = codexFilter === "all";
  let lastHeresy: string | null = null;
  codexIds.forEach((id, i) => {
    const def = getCard(id);
    if (showLabels && def.heresy !== lastHeresy) {
      lastHeresy = def.heresy;
      const label = document.createElement("div");
      label.className = "codex-heresy-label";
      label.textContent = heresyShort(def.heresy);
      label.setAttribute("aria-hidden", "true");
      codexThumbs.appendChild(label);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "codex-thumb";
    if (CARD_SKINS_ENABLED && def.sovereign) btn.classList.add("is-premium");
    btn.dataset.index = String(i);
    const img = document.createElement("img");
    img.src = handCardSrc(id);
    img.alt = def.name;
    img.draggable = false;
    btn.appendChild(img);
    bindLiftInspect(btn, () => id, cardInspect, () => showCodexCard(i));
    codexThumbs.appendChild(btn);
  });
  codexBuilt = true;
}

function showCodexCard(index: number): void {
  const n = codexIds.length;
  if (n === 0) return;
  codexIndex = ((index % n) + n) % n;
  const id = codexIds[codexIndex];
  const def = getCard(id);
  codexFace.src = handCardSrc(id);
  codexFace.alt = def.name;
  const useSkin = CARD_SKINS_ENABLED && !!def.sovereign;
  codexFoil.classList.toggle("is-premium", useSkin);
  const stack = codexFoil.querySelector(".foil-stack") as HTMLElement | null;
  if (stack) {
    const layered = useSkin && hasArtLayers(id);
    codexFoil.classList.toggle("has-layers", layered);
    setStackArtLayers(stack, layered ? id : null, { alt: def.name });
  }
  codexMeta.innerHTML = cardMetaHtml(def);
  for (const el of codexThumbs.querySelectorAll(".codex-thumb")) {
    el.classList.toggle("active", Number((el as HTMLElement).dataset.index) === codexIndex);
  }
  const active = codexThumbs.querySelector(".codex-thumb.active") as HTMLElement | null;
  active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
}

function applyCodexFilter(filter: Heresy | "all"): void {
  const keepId = codexIds[codexIndex];
  codexFilter = filter;
  codexFilterEl.value = filter;
  codexIds = codexIdsForFilter(filter);
  codexBuilt = false;
  buildCodexThumbs();
  const idx = keepId ? codexIds.indexOf(keepId) : 0;
  showCodexCard(idx >= 0 ? idx : 0);
}

function openCodex(): void {
  hideAllSheets();
  codexPanel.hidden = false;
  setMenuMode(true);
  codexFilterEl.value = codexFilter;
  buildCodexThumbs();
  showCodexCard(codexIndex);
}

function closeCodex(): void {
  codexPanel.hidden = true;
  menu.hidden = false;
  setMenuMode(true);
}

function openBuilder(heresy?: Heresy): void {
  hideAllSheets();
  setMenuMode(true);
  deckBuilder.open(heresy ? { heresy } : undefined);
}

function openHeresyPick(): void {
  hideAllSheets();
  setMenuMode(true);
  buildHeresyList();
  heresyPickPanel.hidden = false;
}

function closeHeresyPick(): void {
  heresyPickPanel.hidden = true;
  menu.hidden = false;
  setMenuMode(true);
}

function buildHeresyList(): void {
  heresyListEl.innerHTML = "";
  for (const id of HERESY_IDS) {
    const pitch = heresyPitch(id);
    if (!pitch) continue;
    const faceId = heresyPickFace(id);
    const card = document.createElement("article");
    card.className = `heresy-card heresy-card--${id}`;
    card.dataset.heresy = id;
    card.setAttribute("role", "listitem");
    card.innerHTML = `
      ${faceId ? `<div class="heresy-card-bg" aria-hidden="true" style="background-image:url('${handCardSrc(faceId)}')"></div>` : ""}
      <header class="heresy-card-head">
        <p class="heresy-card-verb">${heresyVerb(id)}</p>
        <h2 class="heresy-card-name">${heresyName(id)}</h2>
        <p class="heresy-card-kit">${pitch.kit}</p>
      </header>
      <p class="heresy-card-hook">${pitch.hook}</p>
      <p class="heresy-card-arch"><span class="heresy-arch-label">Archetype</span> ${pitch.archetype}</p>
      <div class="heresy-card-actions">
        <button type="button" class="cta heresy-enter" data-enter="${id}">
          <span class="btn-label"><span class="btn-kicker">Teach</span>Enter Gaze</span>
        </button>
        <button type="button" class="ghost heresy-build" data-build="${id}">
          <span class="btn-label">Build this craft</span>
        </button>
      </div>
    `;
    heresyListEl.appendChild(card);
  }
}

function startMatch(tutorial: boolean, constructedDeck?: string[]): void {
  spectatorMode = false;
  spectateGen += 1;
  spectateBusy = false;
  spectateChip.hidden = true;
  document.body.classList.remove("spectating");
  hideAllSheets();
  uiPaused = false;
  if (tutorial) lastConstructedDeck = null;
  else if (constructedDeck) lastConstructedDeck = [...constructedDeck];
  else lastConstructedDeck = null;
  const settings = loadSettings();
  state = createMatch({
    tutorial,
    deck: !tutorial && constructedDeck ? constructedDeck : undefined,
    aiDifficulty: settings.aiDifficulty,
  });
  selectedHand = null;
  mode = "play";
  hudSnap = {
    essence: -1,
    enemyEssence: -1,
    sight: -1,
    enemySight: -1,
    favor: -1,
    enemyFavor: -1,
    eclipse: -1,
    enemyEclipse: -1,
    will: -1,
    enemyWill: -1,
  };
  for (const hit of altHits) {
    for (const row of hit.querySelectorAll<HTMLElement>(".alt-status")) delete row.dataset.sig;
  }
  setMenuMode(false);
  setEnemyTurn(false);
  setMusicBed("match");
  void unlockAudio();
  if (tutorial) {
    const hi = tutorialSelectHandIndex(state);
    selectedHand = hi ?? 0;
    const um = tutorialUiMode(state.tutorialStep);
    if (um) mode = um;
  }
  takeEvents(state);
  handDealCount = state.hand.length;
  clearEventLog();
  syncHud();
  hidePhaseBanner();
  if (!tutorial) {
    flashPhase("Round 1", {
      kicker: "Match begin",
      sub: "Play Veiled · Witness with Sight · Pass to Resolve",
      kind: "round",
      ms: 2600,
    });
    explain("Round 1 — play cards Veiled, spend Sight to Witness, Pass when done. Both Pass → Resolve.", 2800, "round");
  }
  if (state.hand.length) {
    void enqueueFx(() => animateHandDeals([...state!.hand]));
  }
}

type LiveCraft = "ink" | "motley" | "toll" | "breach";

const LIVE_CRAFTS: LiveCraft[] = ["ink", "motley", "toll", "breach"];

const SPECTATE_LABEL: Record<LiveCraft, string> = {
  ink: "Ink Abyss",
  motley: "Motley Masquerade",
  toll: "Bellward Toll",
  breach: "Scar Breach",
};

const SPECTATE_SHORT: Record<LiveCraft, string> = {
  ink: "Ink",
  motley: "Motley",
  toll: "Bellward",
  breach: "Breach",
};

function spectateCraftName(side: Side): string {
  return SPECTATE_SHORT[side === "player" ? lastSpectate.bottom : lastSpectate.top];
}

let lastSpectate: { bottom: LiveCraft; top: LiveCraft; random: boolean } = {
  bottom: "toll",
  top: "motley",
  random: true,
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random craft pair — usually different crafts. */
function pickRandomSpectatePair(seed: number): { bottom: LiveCraft; top: LiveCraft } {
  const rng = mulberry32(seed ^ 0xa5a5a5a5);
  const bottom = LIVE_CRAFTS[Math.floor(rng() * LIVE_CRAFTS.length)]!;
  let top = LIVE_CRAFTS[Math.floor(rng() * LIVE_CRAFTS.length)]!;
  if (rng() < 0.85) {
    let guard = 8;
    while (top === bottom && guard-- > 0) {
      top = LIVE_CRAFTS[Math.floor(rng() * LIVE_CRAFTS.length)]!;
    }
  }
  return { bottom, top };
}

/** Live bot-vs-bot with full craft decks — slow enough to read. */
function startSpectateBots(
  bottom: LiveCraft = lastSpectate.bottom,
  top: LiveCraft = lastSpectate.top,
  opts?: { seed?: number; random?: boolean },
): void {
  const seed = opts?.seed ?? ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
  lastSpectate = { bottom, top, random: opts?.random ?? lastSpectate.random };
  hideAllSheets();
  uiPaused = false;
  spectatorMode = true;
  spectateGen += 1;
  const gen = spectateGen;
  spectateBusy = false;
  lastConstructedDeck = null;
  const settings = loadSettings();
  state = createMatch({
    seed,
    deck: fullCraftDeck(bottom),
    enemyDeck: fullCraftDeck(top),
    aiDifficulty: settings.aiDifficulty === "easy" ? "normal" : settings.aiDifficulty,
  });
  selectedHand = null;
  mode = "play";
  hudSnap = {
    essence: -1,
    enemyEssence: -1,
    sight: -1,
    enemySight: -1,
    favor: -1,
    enemyFavor: -1,
    eclipse: -1,
    enemyEclipse: -1,
    will: -1,
    enemyWill: -1,
  };
  for (const hit of altHits) {
    for (const row of hit.querySelectorAll<HTMLElement>(".alt-status")) delete row.dataset.sig;
  }
  setMenuMode(false);
  setEnemyTurn(false);
  document.body.classList.add("spectating");
  spectateChip.hidden = false;
  spectateChip.textContent = `BOT SIM · ${SPECTATE_LABEL[bottom]} vs ${SPECTATE_LABEL[top]}`;
  setMusicBed("match");
  void unlockAudio();
  takeEvents(state);
  handDealCount = state.hand.length;
  clearEventLog();
  syncHud();
  hidePhaseBanner();
  flashPhase("Bot Sim", {
    kicker: lastSpectate.random ? "Random match" : "Craft pick",
    sub: `${SPECTATE_LABEL[bottom]} (bottom) · ${SPECTATE_LABEL[top]} (top)`,
    kind: "round",
    ms: 2800,
  });
  explain(
    `Bot sim — ${SPECTATE_LABEL[bottom]} (bottom) vs ${SPECTATE_LABEL[top]} (top). Full craft decks, shuffled. Open Log for the chronicle.`,
    2800,
    "round",
  );
  if (state.hand.length) {
    void enqueueFx(() => animateHandDeals([...state!.hand]));
  }
  void fxChain.then(() => {
    if (gen !== spectateGen) return;
    window.setTimeout(() => runSpectateStep(gen), 2200);
  });
}

function startRandomSpectate(): void {
  const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const pair = pickRandomSpectatePair(seed);
  startSpectateBots(pair.bottom, pair.top, { seed, random: true });
}

function openSpectatePick(): void {
  hideAllSheets();
  setMenuMode(true);
  document.getElementById("spectate-pick")!.hidden = false;
}

/** @deprecated alias */
function startSpectateTollVsMotley(): void {
  startSpectateBots("toll", "motley", { random: false });
}

function clearTutorGuide(): void {
  tutorGuide.hidden = true;
  tutorGuide.classList.remove("is-card", "is-hud");
  tutorCardStage.hidden = true;
  tutorRing.hidden = true;
  tutorPin.hidden = true;
  tutorArrowPath.setAttribute("d", "");
  document.body.classList.remove("tutorial-card-open");
  document.querySelectorAll(".tutor-focus").forEach((el) => el.classList.remove("tutor-focus"));
}

function pinLabelForStep(step: string): string {
  switch (step) {
    case "card_essence":
      return "Essence";
    case "card_sight":
      return "Witness";
    case "card_power":
      return "Power";
    case "hud_will":
      return "Will";
    case "hud_sight":
      return "Sight";
    case "hud_eclipse":
      return "Eclipse";
    case "hud_lanes":
      return "Lanes";
    case "play":
    case "witness":
      return "MID";
    case "graft":
      return "LOW";
    case "pass1":
    case "pass2":
      return "Pass";
    default:
      return "";
  }
}

function placeTutorCallout(
  targetRect: DOMRect,
  fromRect: DOMRect | null,
  label: string,
): void {
  const pad = 6;
  tutorRing.hidden = false;
  tutorRing.style.left = `${targetRect.left - pad}px`;
  tutorRing.style.top = `${targetRect.top - pad}px`;
  tutorRing.style.width = `${targetRect.width + pad * 2}px`;
  tutorRing.style.height = `${targetRect.height + pad * 2}px`;

  const tx = targetRect.left + targetRect.width / 2;
  const ty = targetRect.top + targetRect.height / 2;
  if (label) {
    tutorPin.hidden = false;
    tutorPin.textContent = label;
    tutorPin.style.left = `${tx}px`;
    tutorPin.style.top = `${targetRect.top}px`;
  } else {
    tutorPin.hidden = true;
  }

  if (!fromRect) {
    tutorArrowPath.setAttribute("d", "");
    return;
  }
  const fx = fromRect.left + fromRect.width / 2;
  const fy = fromRect.bottom;
  const mx = (fx + tx) / 2;
  const my = Math.min(fy, ty) - 36;
  tutorArrowPath.setAttribute("d", `M ${fx} ${fy} Q ${mx} ${my} ${tx} ${ty}`);
}

function syncTutorGuide(s: MatchState | null): void {
  if (!s?.tutorial || s.tutorialStep === "done") {
    clearTutorGuide();
    return;
  }
  const step = s.tutorialStep;
  const target = tutorialTarget(step);
  if (target.kind === "none") {
    clearTutorGuide();
    return;
  }

  tutorGuide.hidden = false;
  document.querySelectorAll(".tutor-focus").forEach((el) => el.classList.remove("tutor-focus"));

  const coachRect = coachEl.hidden ? null : coachEl.getBoundingClientRect();
  const label = pinLabelForStep(step);

  if (target.kind === "card") {
    tutorGuide.classList.add("is-card");
    tutorGuide.classList.remove("is-hud");
    document.body.classList.add("tutorial-card-open");
    tutorCardStage.hidden = false;
    const cardId = tutorialTeachCard(step) ?? "blot_herald";
    if (tutorCardFace.dataset.card !== cardId) {
      tutorCardFace.src = handCardSrc(cardId);
      tutorCardFace.dataset.card = cardId;
    }
    const stageRect = tutorCardStage.getBoundingClientRect();
    const anchor = CARD_ANCHORS[target.anchor];
    const ax = stageRect.left + stageRect.width * anchor.x;
    const ay = stageRect.top + stageRect.height * anchor.y;
    const hit = 28;
    const fake = new DOMRect(ax - hit / 2, ay - hit / 2, hit, hit);
    placeTutorCallout(fake, coachRect, label);
    return;
  }

  document.body.classList.remove("tutorial-card-open");
  tutorCardStage.hidden = true;
  tutorGuide.classList.remove("is-card");
  tutorGuide.classList.add("is-hud");

  const el = document.querySelector(target.sel) as HTMLElement | null;
  if (!el || el.hidden) {
    tutorRing.hidden = true;
    tutorPin.hidden = true;
    tutorArrowPath.setAttribute("d", "");
    return;
  }
  el.classList.add("tutor-focus");
  placeTutorCallout(el.getBoundingClientRect(), coachRect, label);
}

function syncCoach(s: MatchState | null): void {
  const coach = s?.tutorial && s.tutorialStep !== "done" ? tutorialCoach(s.tutorialStep) : null;
  if (!coach) {
    coachEl.hidden = true;
    coachCta.hidden = true;
    document.body.classList.remove("tutorial-soft");
    clearTutorGuide();
    return;
  }
  coachEl.hidden = false;
  coachTitle.textContent = coach.title;
  coachBody.textContent = coach.body;
  coachAction.textContent = coach.action;
  const soft = !!coach.cta;
  document.body.classList.toggle("tutorial-soft", soft);
  if (soft && coach.cta) {
    coachCta.hidden = false;
    coachCta.textContent = coach.cta;
  } else {
    coachCta.hidden = true;
  }
  // Layout after coach paint so arrow geometry is accurate
  window.requestAnimationFrame(() => syncTutorGuide(s));
}

function hint(s: MatchState): string {
  if (spectatorMode) {
    return s.active === "player"
      ? "Spectating — Bellward (Toll) acting"
      : "Spectating — Motley acting";
  }
  if (s.tutorial && s.tutorialStep !== "done") {
    return tutorialHint(s.tutorialStep);
  }
  if (s.active !== "player") return "Enemy turn ? they act in the Gaze?";
  if (mode === "witness") {
    const intents = legalIntents(s);
    const canGaze = intents.some((i) => i.kind === "witness" && i.enemy);
    const canOwn = intents.some((i) => i.kind === "witness" && !i.enemy);
    if (canGaze && canOwn) return "Witness your Veiled, or GAZE lanes to steal theirs.";
    if (canGaze) return "GAZE: tap a marked altitude to Witness their card.";
    return "Tap an altitude to Witness your Veiled card.";
  }
  if (mode === "reveil") {
    return "Tap a Witnessed figure to Re-Veil ? spend Sight; Revelation stays spent.";
  }
  if (mode === "stance") return "Tap a Motley figure to flip Stance A/B.";
  if (mode === "wager") return "Tap a Veiled figure to ante 1 Sight (Wager).";
  if (mode === "press") return "Tap Motley Stance B (free) or a Stained Veiled enemy to Press.";
  if (mode === "peal") return "Tap your Tolled altitude to Peal-arm (1 Sight).";
  if (selectedHand !== null) {
    const def = getCard(s.hand[selectedHand]);
    if (def.type === "rite") return "Drag onto an altitude to Blind.";
    if (def.type === "relic") return "Drag onto a Figure lane to Graft.";
    if (def.type === "site" || def.type === "sigil") return "Drag this landmark onto an altitude.";
    return "Drag onto High, Mid, or Low ? or tap a lane.";
  }
  const lawN = lawHeresyProgress(s);
  if (s.prophecies.includes("unblinking_law") && lawN >= 3) {
    return "Unblinking Law ready ? Pass for +2 Eclipse.";
  }
  if (s.prophecies.includes("unblinking_law") && lawN > 0) {
    return `Law ${lawN}/3 heresies Witnessed — or select a card.`;
  }
  const intents = legalIntents(s);
  const acts: string[] = [];
  if (intents.some((i) => i.kind === "witness")) acts.push("Witness");
  if (intents.some((i) => i.kind === "press")) acts.push("Mark");
  if (intents.some((i) => i.kind === "peal")) acts.push("Peal");
  if (intents.some((i) => i.kind === "stance")) acts.push("Stance");
  if (intents.some((i) => i.kind === "wager")) acts.push("Wager");
  if (intents.some((i) => i.kind === "pass")) acts.push("Pass");
  if (acts.length) return `Select a card — or ${acts.join(" / ")}.`;
  return "Select a card to play.";
}

function syncHud(): void {
  const inMatch = !!(
    state &&
    state.phase === "play" &&
    !uiPaused &&
    pausePanel.hidden &&
    settingsPanel.hidden &&
    howtoPanel.hidden
  );
  btnHudMenu.hidden = !(state && state.phase === "play");
  btnHudSettings.hidden = !(state && state.phase === "play");
  btnHudLog.hidden = !(state && state.phase === "play");
  const boardTarget = inMatch && (mode === "witness" || mode === "reveil" || mode === "stance" || mode === "wager" || mode === "press" || mode === "peal");
  document.body.classList.toggle("board-target", boardTarget);

  if (!state || state.phase !== "play") {
    handEl.innerHTML = "";
    handArea.hidden = true;
    actionsEl.hidden = true;
    metersEl.hidden = true;
    willrowEl.hidden = true;
    closeEventLog();
    btnWitness.disabled = true;
    btnReveil.disabled = true;
    btnStance.disabled = true;
    btnPass.disabled = true;
    document.body.classList.remove("board-target", "tutorial-soft", "tutorial-card-open");
    setEnemyTurn(false);
    for (const hit of altHits) {
      setAltHitEnabled(hit, false);
      hit.classList.remove("legal", "has-unit", "veiled-unit", "gaze-ready");
      const st = hit.querySelector(".alt-stance");
      if (st) {
        st.textContent = "";
        st.classList.remove("on", "b");
      }
    }
    lawChip.hidden = true;
    if (!state) showToast(null);
    syncCoach(null);
    return;
  }

  metersEl.hidden = false;
  willrowEl.hidden = false;
  handArea.hidden = !inMatch;
  actionsEl.hidden = !inMatch;
  setEnemyTurn(state.active === "enemy");

  if (!inMatch) {
    // Paused / settings ? keep meters, hide interactive play chrome
    btnWitness.disabled = true;
    btnReveil.disabled = true;
    btnStance.disabled = true;
    btnPass.disabled = true;
    handEl.innerHTML = "";
    for (const hit of altHits) {
      const alt = Number(hit.dataset.alt) as Altitude;
      const pow = hit.querySelector(".alt-pow-n") ?? hit.querySelector(".alt-pow");
      if (pow) pow.textContent = `${unitPower(state, alt, "player")}–${unitPower(state, alt, "enemy")}`;
      setAltHitEnabled(hit, false);
      hit.classList.remove("legal");
    }
    mEssence.textContent = String(state.essence);
    mEssenceFoe.textContent = String(state.enemyEssence);
    mSight.textContent = String(state.sight);
    mSightFoe.textContent = String(state.enemySight);
    mFavor.textContent = String(state.favor);
    mFavorFoe.textContent = String(state.enemyFavor);
    mTurn.textContent = String(state.turn);
    willYouN.textContent = String(state.will);
    willFoeN.textContent = String(state.enemyWill);
    willYou.style.transform = `scaleX(${Math.max(0, state.will / START_WILL)})`;
    willFoe.style.transform = `scaleX(${Math.max(0, state.enemyWill / START_WILL)})`;
    eclYou.textContent = String(state.eclipse);
    eclFoe.textContent = String(state.enemyEclipse);
    if (flashTimer <= 0) showToast("Paused");
    return;
  }

  mEssence.textContent = String(state.essence);
  mEssenceFoe.textContent = String(state.enemyEssence);
  mSight.textContent = String(state.sight);
  mSightFoe.textContent = String(state.enemySight);
  mFavor.textContent = String(state.favor);
  mFavorFoe.textContent = String(state.enemyFavor);
  mTurn.textContent = String(state.turn);
  willYouN.textContent = String(state.will);
  willFoeN.textContent = String(state.enemyWill);
  willYou.style.transform = `scaleX(${Math.max(0, state.will / START_WILL)})`;
  willFoe.style.transform = `scaleX(${Math.max(0, state.enemyWill / START_WILL)})`;
  eclYou.textContent = String(state.eclipse);
  eclFoe.textContent = String(state.enemyEclipse);

  {
    const youLabel = document.querySelector(".will-side.you .will-label");
    const foeLabel = document.querySelector(".will-side.foe .will-label");
    if (youLabel) youLabel.textContent = spectatorMode ? SPECTATE_SHORT[lastSpectate.bottom].toUpperCase() : "YOU";
    if (foeLabel) foeLabel.textContent = spectatorMode ? SPECTATE_SHORT[lastSpectate.top].toUpperCase() : "FOE";
  }
  if (spectateChip) spectateChip.hidden = !spectatorMode;

  if (hudSnap.essence >= 0) {
    if (hudSnap.essence !== state.essence) punchMeter(mEssence);
    if (hudSnap.enemyEssence !== state.enemyEssence) punchMeter(mEssenceFoe);
    if (hudSnap.sight !== state.sight) punchMeter(mSight);
    if (hudSnap.enemySight !== state.enemySight) punchMeter(mSightFoe);
    if (hudSnap.favor !== state.favor) punchMeter(mFavor);
    if (hudSnap.enemyFavor !== state.enemyFavor) punchMeter(mFavorFoe);
    if (hudSnap.eclipse !== state.eclipse || hudSnap.enemyEclipse !== state.enemyEclipse) {
      punchMeter(eclPip);
    }
    const lostYou = hudSnap.will - state.will;
    const lostFoe = hudSnap.enemyWill - state.enemyWill;
    if (lostYou > 0) indicateWillLoss("you", lostYou);
    if (lostFoe > 0) indicateWillLoss("foe", lostFoe);
  }
  hudSnap = {
    essence: state.essence,
    enemyEssence: state.enemyEssence,
    sight: state.sight,
    enemySight: state.enemySight,
    favor: state.favor,
    enemyFavor: state.enemyFavor,
    eclipse: state.eclipse,
    enemyEclipse: state.enemyEclipse,
    will: state.will,
    enemyWill: state.enemyWill,
  };

  const hasLaw = state.prophecies.includes("unblinking_law");
  lawChip.hidden = !hasLaw;
  if (hasLaw) {
    const n = Math.min(3, lawHeresyProgress(state));
    lawProgress.textContent = `${n}/3`;
    lawChip.classList.toggle("ready", n >= 3 && state.active === "player");
  }

  if (flashTimer <= 0) {
    showToast(hint(state));
  }
  syncCoach(state);

  const intents = legalIntents(state);

  for (const hit of altHits) {
    const alt = Number(hit.dataset.alt) as Altitude;
    const pow = hit.querySelector(".alt-pow-n") ?? hit.querySelector(".alt-pow");
    const stanceEl = hit.querySelector(".alt-stance");
    const blindEl = hit.querySelector("[data-blind]") as HTMLElement | null;
    const slot = state.altitudes[alt];
    const pp = unitPower(state, alt, "player");
    const ep = unitPower(state, alt, "enemy");
    if (pow) pow.textContent = `${pp}–${ep}`;
    const u = slot.player;
    const eu = slot.enemy;
    const canGazeHere = intents.some((i) => i.kind === "witness" && i.enemy && i.altitude === alt);
    hit.classList.toggle("has-unit", !!(u || eu));
    hit.classList.toggle("veiled-unit", !!u?.veiled);
    hit.classList.toggle("foe-veiled", !!eu?.veiled);
    hit.classList.toggle("gaze-ready", canGazeHere);
    hit.classList.toggle("is-blind", !!slot.blinded);
    const tollEl = hit.querySelector("[data-toll]") as HTMLElement | null;
    const pealEl = hit.querySelector("[data-peal]") as HTMLElement | null;
    const tollOwner = state.tollOwner[alt];
    if (tollEl) {
      const wasToll = !tollEl.hidden;
      const on = tollOwner != null;
      tollEl.hidden = !on;
      if (on) {
        const label = tollOwner === "player" ? "TOLL" : "FOE TOLL";
        tollEl.textContent = "";
        tollEl.setAttribute("data-label", label);
        tollEl.setAttribute("aria-label", label);
        tollEl.classList.toggle("is-foe", tollOwner === "enemy");
        tollEl.title =
          tollOwner === "player"
            ? "Your Toll — your Figures here +1; enemy Witness/Gaze pays tax"
            : "Enemy Toll — their trap on this altitude";
      }
      if (on && !wasToll) {
        tollEl.classList.remove("badge-pop");
        void tollEl.offsetWidth;
        tollEl.classList.add("badge-pop");
      }
    }
    if (pealEl) {
      const wasPeal = !pealEl.hidden;
      const pealOn = !!state.pealArmed[alt];
      pealEl.hidden = !pealOn;
      if (pealOn && !wasPeal) {
        pealEl.classList.remove("badge-pop");
        void pealEl.offsetWidth;
        pealEl.classList.add("badge-pop");
      }
    }
    if (blindEl) {
      const wasBlind = !blindEl.hidden;
      blindEl.hidden = !slot.blinded;
      if (slot.blinded && !wasBlind) {
        blindEl.classList.remove("badge-pop");
        void blindEl.offsetWidth;
        blindEl.classList.add("badge-pop");
      }
    }
    syncSideStatus(hit, "player", u, slot.playerSite);
    syncSideStatus(hit, "enemy", eu, slot.enemySite);
    if (stanceEl) {
      const motley = !!(u && getCard(u.cardId).heresy === "motley");
      const third = !!(u && (u.hasThirdFace || slot.playerSite === "third_face" || motley));
      if (third && u) {
        stanceEl.textContent = u.stanceB ? "B" : "A";
        stanceEl.classList.add("on");
        stanceEl.classList.toggle("b", u.stanceB);
      } else {
        stanceEl.textContent = "";
        stanceEl.classList.remove("on", "b");
      }
    }
  }

  const canWitness = intents.some((i) => i.kind === "witness");
  const canReveil = intents.some((i) => i.kind === "reveil");
  const canStance = intents.some((i) => i.kind === "stance");
  const canWager = intents.some((i) => i.kind === "wager");
  const canPress = intents.some((i) => i.kind === "press");
  const canPeal = intents.some((i) => i.kind === "peal");
  const canPass = intents.some((i) => i.kind === "pass");
  const canBoardAct = intents.some(
    (i) => i.kind === "play" || i.kind === "rite" || i.kind === "graft",
  );
  btnWitness.disabled = spectatorMode || state.active !== "player" || !canWitness;
  btnReveil.disabled = spectatorMode || state.active !== "player" || !canReveil;
  btnStance.disabled = spectatorMode || state.active !== "player" || !canStance;
  btnWager.disabled = spectatorMode || state.active !== "player" || !canWager;
  btnPress.disabled =
    spectatorMode ||
    state.active !== "player" ||
    state.pressUsed.player ||
    (!canPress && !sidePlaysHeresy(state, "player", "ink"));
  btnPeal.disabled = spectatorMode || state.active !== "player" || !canPeal;
  btnPass.disabled = spectatorMode || state.active !== "player" || !canPass;
  if (spectatorMode) {
    actionsEl.hidden = true;
  }
  btnWitness.classList.toggle("selected", mode === "witness");
  btnReveil.classList.toggle("selected", mode === "reveil");
  btnStance.classList.toggle("selected", mode === "stance");
  btnWager.classList.toggle("selected", mode === "wager");
  btnPress.classList.toggle("selected", mode === "press");
  btnPeal.classList.toggle("selected", mode === "peal");
  const teachWitness = state.tutorial && state.tutorialStep === "witness";
  const teachStance = false;
  const teachPass =
    state.tutorial && (state.tutorialStep === "pass1" || state.tutorialStep === "pass2");
  // First Gaze: only show the action button the lesson needs
  if (state.tutorial && state.tutorialStep !== "done") {
    const step = state.tutorialStep;
    const laneOnly = step === "play" || step === "site" || step === "graft";
    btnWitness.hidden = step !== "witness";
    btnReveil.hidden = true;
    btnStance.hidden = true;
    btnWager.hidden = true;
    btnPress.hidden = true;
    btnPeal.hidden = true;
    btnPass.hidden = !teachPass;
    btnWitness.style.visibility = "";
    btnReveil.style.visibility = "";
    btnStance.style.visibility = "";
    btnWager.style.visibility = "";
    btnPress.style.visibility = "";
    btnPeal.style.visibility = "";
    btnPass.style.visibility = "";
    actionsEl.style.visibility = laneOnly ? "hidden" : "";
  } else {
    // Craft kit buttons stay visible for that craft (disabled until legal)
    const ink = sidePlaysHeresy(state, "player", "ink");
    const motley = sidePlaysHeresy(state, "player", "motley");
    const toll = sidePlaysHeresy(state, "player", "toll");
    btnWitness.hidden = false;
    btnPass.hidden = false;
    btnReveil.hidden = !(canReveil || mode === "reveil");
    btnStance.hidden = !(motley || canStance || mode === "stance");
    btnWager.hidden = !(motley || canWager || mode === "wager");
    btnPress.hidden = !(ink || canPress || mode === "press");
    btnPeal.hidden = !(toll || canPeal || mode === "peal");
    btnWitness.style.visibility = "";
    btnReveil.style.visibility = "";
    btnStance.style.visibility = "";
    btnWager.style.visibility = "";
    btnPress.style.visibility = "";
    btnPeal.style.visibility = "";
    btnPass.style.visibility = "";
    actionsEl.style.visibility = "";
  }
  btnWitness.classList.toggle(
    "pulse",
    canWitness &&
      state.active === "player" &&
      (teachWitness || (!state.tutorial && mode !== "witness")),
  );
  btnStance.classList.toggle("pulse", teachStance && canStance);
  btnWager.classList.toggle(
    "pulse",
    canWager && state.active === "player" && !state.tutorial && mode !== "wager",
  );
  btnPress.classList.toggle(
    "pulse",
    canPress && state.active === "player" && !state.tutorial && mode !== "press",
  );
  btnPeal.classList.toggle(
    "pulse",
    canPeal && state.active === "player" && !state.tutorial && mode !== "peal",
  );
  btnPass.classList.toggle(
    "pulse",
    canPass &&
      state.active === "player" &&
      (teachPass || (!state.tutorial && !canBoardAct && !canWitness && !canReveil && !canStance && !canWager && !canPress && !canPeal)),
  );
  const passLabel = btnPass.querySelector(".btn-label");
  if (passLabel) {
    passLabel.innerHTML = '<span class="btn-kicker">End</span>Pass';
  }

  for (const hit of altHits) {
    const alt = Number(hit.dataset.alt) as Altitude;
    let legal = false;
    if (state.active === "player") {
      if (mode === "witness") {
        legal = intents.some((i) => i.kind === "witness" && i.altitude === alt);
      } else if (mode === "reveil") {
        legal = intents.some((i) => i.kind === "reveil" && i.altitude === alt);
      } else if (mode === "stance") {
        legal = intents.some((i) => i.kind === "stance" && i.altitude === alt);
      } else if (mode === "wager") {
        legal = intents.some((i) => i.kind === "wager" && i.altitude === alt);
      } else if (mode === "press") {
        legal = intents.some((i) => i.kind === "press" && i.altitude === alt);
      } else if (mode === "peal") {
        legal = intents.some((i) => i.kind === "peal" && i.altitude === alt);
      } else if (selectedHand !== null) {
        const def = getCard(state.hand[selectedHand]);
        if (def.type === "rite") {
          legal = intents.some(
            (i) => i.kind === "rite" && i.handIndex === selectedHand && i.altitude === alt,
          );
        } else if (def.type === "relic") {
          legal = intents.some(
            (i) => i.kind === "graft" && i.handIndex === selectedHand && i.altitude === alt,
          );
        } else {
          legal = intents.some(
            (i) => i.kind === "play" && i.handIndex === selectedHand && i.altitude === alt,
          );
        }
      }
    }
    hit.classList.toggle("disabled", !legal);
    hit.setAttribute("aria-disabled", legal ? "false" : "true");
    if (legal) hit.setAttribute("tabindex", "0");
    else hit.setAttribute("tabindex", "-1");
    hit.classList.toggle("legal", legal);
  }

  handEl.innerHTML = "";
  handEl.dataset.n = String(state.hand.length);
  const dealN = handDealCount;
  handDealCount = 0;
  state.hand.forEach((id, index) => {
    const def = getCard(id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hand-card";
    btn.dataset.slot = String(index);
    btn.style.setProperty("--i", String(index));
    if (dealN > 0 && index >= state!.hand.length - dealN) {
      btn.classList.add("dealing");
    }
    const playable = intents.some(
      (i) =>
        (i.kind === "play" || i.kind === "graft" || i.kind === "rite") && i.handIndex === index,
    );
    const canSelect = playable && state!.active === "player" && mode === "play";
    if (!canSelect) btn.classList.add("disabled");
    if (selectedHand === index) btn.classList.add("selected");
    if (
      canSelect &&
      state!.tutorial &&
      tutorialTeachCard(state!.tutorialStep) === id
    ) {
      btn.classList.add("teach");
    }
    if (drag?.active && drag.handIndex === index) btn.classList.add("dragging");

    const img = document.createElement("img");
    img.className = "face";
    img.alt = def.name;
    img.draggable = false;
    img.width = 108;
    img.height = 162;
    img.src = handCardSrc(id);
    btn.appendChild(img);
    // Hand stays flat + opaque (foil tilt reserved for inspect / codex)
    btn.title = `${def.name} ? ${def.essence}E ? hold to inspect ? drag to play`;
    const wasSelected = selectedHand === index;
    if (canSelect) {
      btn.addEventListener("pointerdown", (ev) => {
        if (ev.button != null && ev.button !== 0) return;
        if (uiPaused || drag?.dropping) return;
        if (cardInspect.isOpen()) cardInspect.close();
        selectedHand = index;
        mode = "play";
        drag = {
          handIndex: index,
          pointerId: ev.pointerId,
          startX: ev.clientX,
          startY: ev.clientY,
          active: false,
          cardSrc: img.src,
        };
        // Keep the gesture through iOS Safari gesture cancellation
        try {
          btn.setPointerCapture(ev.pointerId);
        } catch {
          /* ignore */
        }
        playSfx("select");
        highlightAltitudesForHand(index);
        for (const el of handEl.querySelectorAll(".hand-card")) {
          el.classList.toggle("selected", el === btn);
        }
        if (flashTimer <= 0 && !state?.tutorial) {
          showToast("Hold to inspect ? drag onto a lane to play.");
        }
      });
    }
    bindLiftInspect(
      btn,
      () => id,
      cardInspect,
      () => {
        if (drag?.active || drag?.dropping) return;
        // Tutorial: short tap never opens inspect ? hold only
        if (!(state?.tutorial) && canSelect && wasSelected) {
          cardInspect.open(id);
          return;
        }
        playSfx("select");
        if (!canSelect) return;
        selectedHand = index;
        mode = "play";
        window.requestAnimationFrame(() => syncHud());
      },
      {
        // Hold-to-inspect always. Short tap inspect only outside tutorial, unplayable cards.
        inspectOnTap: !(state?.tutorial) && !canSelect,
        onInspectOpen: () => {
          // Hold won over drag ? disarm pending drag so release is clean
          if (drag && !drag.active && drag.handIndex === index) drag = null;
        },
      },
    );
    handEl.appendChild(btn);
  });
}

function reduceMotionOn(): boolean {
  return document.body.classList.contains("reduce-motion");
}

type FlySpec = {
  src: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromScale?: number;
  toScale?: number;
  fromRot?: number;
  durationMs?: number;
  /** land = figure stays vibe; cast = rite bloom + dissolve (not a board permanent) */
  exit?: "land" | "cast";
};

function enqueueFx(fn: () => Promise<void>): Promise<void> {
  const run = fxChain.then(fn, fn);
  fxChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

const ALT_NAMES = ["High", "Mid", "Low"] as const;

function hideRiteReveal(): void {
  riteReveal.hidden = true;
  riteReveal.classList.remove("is-effect");
  document.body.classList.remove("rite-reveal-open");
}

function hideVictoryReveal(): void {
  victoryReveal.hidden = true;
  victoryReveal.classList.remove(
    "is-open",
    "is-juiced",
    "victory--eclipse",
    "victory--break",
    "victory--turns",
    "victory--win",
    "victory--lose",
    "victory--draw",
  );
  document.body.classList.remove("victory-open", "victory-win", "victory-lose");
  victorySparks.innerHTML = "";
  victoryContinue.classList.remove("is-ready");
}

type VictoryCopy = {
  outcome: "win" | "lose" | "draw";
  outcomeLabel: string;
  kicker: string;
  title: string;
  sub: string;
  explain: string;
  score: string;
  kind: "eclipse" | "break" | "turns";
  phaseTitle: string;
};

function victoryCopyFor(s: MatchState): VictoryCopy {
  const w = s.winner;
  const reason = s.endReason ?? "turns";
  const youName = spectatorMode ? spectateCraftName("player") : "You";
  const foeName = spectatorMode ? spectateCraftName("enemy") : "Foe";
  const winnerName = w === "player" ? youName : w === "enemy" ? foeName : "Neither";
  const loserName = w === "player" ? foeName : w === "enemy" ? youName : "Both";
  const score = `Will ${s.will}–${s.enemyWill} · Eclipse ${s.eclipse}–${s.enemyEclipse}`;
  const outcome: "win" | "lose" | "draw" =
    w === "draw" ? "draw" : spectatorMode ? "win" : w === "player" ? "win" : "lose";
  const outcomeLabel =
    outcome === "win" ? "Victory" : outcome === "lose" ? "Defeat" : "Draw";

  if (reason === "eclipse") {
    const ecl = w === "player" ? s.eclipse : s.enemyEclipse;
    return {
      outcome,
      outcomeLabel,
      kicker: outcome === "lose" ? "Eclipse sealed against you" : "Eclipse sealed",
      title: spectatorMode
        ? `${winnerName} Ascends`
        : outcome === "win"
          ? "You Ascend"
          : "Sight Lost",
      sub:
        outcome === "win"
          ? `${ecl}/${ECLIPSE_WIN} — the Eye closes on your terms`
          : `${ecl}/${ECLIPSE_WIN} — the Eye closed before your Will broke`,
      explain: spectatorMode
        ? `${winnerName} hit ${ECLIPSE_WIN} Eclipse first. Motley banks it by winning lanes Veiled + Stance B + paid Wager. Will was still ${s.will}–${s.enemyWill} — not a Break.`
        : outcome === "win"
          ? `${ECLIPSE_WIN} Eclipse. Match over — Will didn't matter anymore. That's the alt win. Own it.`
          : `${foeName} raced Eclipse to ${ECLIPSE_WIN}. Motley Trick wins (Veiled · Stance B · paid Wager) bank +1 each Resolve. Next time: disrupt the wager or break them first.`,
      score,
      kind: "eclipse",
      phaseTitle: "Eclipse",
    };
  }
  if (reason === "break") {
    return {
      outcome,
      outcomeLabel,
      kicker: outcome === "lose" ? "Will shattered" : "Break",
      title: spectatorMode
        ? `${winnerName} Ascends`
        : outcome === "win"
          ? "You Ascend"
          : "Sight Lost",
      sub:
        outcome === "win"
          ? `${loserName}'s Will hits zero — you broke them`
          : `Your Will hits zero — ${winnerName} broke you`,
      explain: spectatorMode
        ? `${winnerName} reduced ${loserName} to 0 Will through Resolve (and craft riders). Final: ${score}.`
        : outcome === "win"
          ? `Soft Resolve chips, then Falls — the last hit. Break wins feel earned. Final: ${score}.`
          : `Their board out-pressed yours until Will emptied. Race Eclipse or Break them first next time. Final: ${score}.`,
      score,
      kind: "break",
      phaseTitle: "Break",
    };
  }
  return {
    outcome,
    outcomeLabel,
    kicker: "Time",
    title: outcome === "draw" ? "Stalemate" : outcome === "win" ? "You Ascend" : "Sight Lost",
    sub: "10 rounds — highest Will wins",
    explain: `The Gaze timed out. ${
      w === "draw" ? "Will tied." : `${winnerName} held more Will.`
    } Final: ${score}.`,
    score,
    kind: "turns",
    phaseTitle: "Time",
  };
}

function spawnVictorySparks(outcome: "win" | "lose" | "draw"): void {
  victorySparks.innerHTML = "";
  if (document.body.classList.contains("reduce-motion")) return;
  const n = outcome === "win" ? 28 : outcome === "lose" ? 14 : 12;
  for (let i = 0; i < n; i++) {
    const spark = document.createElement("span");
    spark.className = `victory-spark victory-spark--${outcome}`;
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 40 + Math.random() * 120;
    spark.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    spark.style.setProperty("--dy", `${Math.sin(angle) * dist - (outcome === "win" ? 40 : 0)}px`);
    spark.style.setProperty("--delay", `${Math.random() * 0.35}s`);
    spark.style.setProperty("--size", `${3 + Math.random() * 5}px`);
    victorySparks.appendChild(spark);
  }
}

function setVictoryTitleAnimated(text: string): void {
  victoryTitleEl.replaceChildren();
  [...text].forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "victory-char";
    span.textContent = ch === " " ? "\u00a0" : ch;
    span.style.setProperty("--i", String(i));
    victoryTitleEl.appendChild(span);
  });
}

/** Dramatic pause before rematch sheet — wins must feel earned, losses must land. */
function presentVictoryCeremony(s: MatchState): Promise<void> {
  return new Promise((resolve) => {
    const copy = victoryCopyFor(s);
    const reduce = document.body.classList.contains("reduce-motion");
    cardInspect.close();
    hideRiteReveal();
    uiPaused = true;

    // Sting → fanfare: reason first, then win/lose + end music bed
    setMusicBed(copy.outcome === "lose" ? "defeat" : "victory");
    if (copy.kind === "eclipse") playSfx("eclipse");
    else if (copy.kind === "break") playSfx("resolve");
    else playSfx("law");
    window.setTimeout(() => {
      playSfx(copy.outcome === "lose" ? "lose" : "win", { vary: false });
    }, reduce ? 120 : 420);

    // Celebrate / mourn the will side
    if (copy.outcome === "win" && s.winner === "player") punchWill("you");
    if (copy.outcome === "win" && s.winner === "enemy") punchWill("foe");
    if (copy.outcome === "lose") punchWill("you");
    if (copy.kind === "eclipse") punchEclipsePip(true);

    flashPhase(copy.phaseTitle, {
      kicker: copy.outcomeLabel,
      sub: copy.sub,
      kind: copy.kind === "turns" ? "victory" : copy.kind,
      ms: reduce ? 1400 : copy.outcome === "lose" ? 3600 : 3000,
    });

    victoryOutcome.textContent = copy.outcomeLabel;
    victoryKicker.textContent = copy.kicker;
    setVictoryTitleAnimated(copy.title);
    victorySub.textContent = copy.sub;
    victoryExplain.textContent = copy.explain;
    victoryScore.textContent = copy.score;
    victoryReveal.classList.remove(
      "victory--eclipse",
      "victory--break",
      "victory--turns",
      "victory--win",
      "victory--lose",
      "victory--draw",
      "is-juiced",
    );
    victoryReveal.classList.add(`victory--${copy.kind}`, `victory--${copy.outcome}`);
    document.body.classList.toggle("victory-win", copy.outcome === "win");
    document.body.classList.toggle("victory-lose", copy.outcome === "lose");
    victoryContinue.classList.remove("is-ready");
    victoryContinue.querySelector(".btn-label")!.textContent = spectatorMode
      ? "Continue · auto"
      : copy.outcome === "win"
        ? "Take the Gaze"
        : copy.outcome === "lose"
          ? "Look away"
          : "Continue";
    victoryReveal.hidden = false;
    document.body.classList.add("victory-open");
    spawnVictorySparks(copy.outcome);

    requestAnimationFrame(() => {
      victoryReveal.classList.add("is-open");
      window.setTimeout(() => victoryReveal.classList.add("is-juiced"), reduce ? 80 : 380);
      window.setTimeout(() => victoryContinue.classList.add("is-ready"), reduce ? 500 : copy.outcome === "lose" ? 2200 : 1600);
    });

    let autoTimer: number | null = null;
    const clearAuto = (): void => {
      if (autoTimer != null) {
        window.clearTimeout(autoTimer);
        autoTimer = null;
      }
    };
    const finish = (): void => {
      clearAuto();
      victoryContinue.removeEventListener("click", onContinue);
      window.removeEventListener("keydown", onKey);
      hideVictoryReveal();
      resolve();
    };
    const onContinue = (): void => {
      playSfx("ui-tap");
      finish();
    };
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape" || ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        onContinue();
      }
    };
    victoryContinue.addEventListener("click", onContinue);
    window.addEventListener("keydown", onKey);
    if (spectatorMode) {
      autoTimer = window.setTimeout(onContinue, reduce ? 2800 : 7200);
    }
  });
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Hold on the killing blow so Break / Eclipse / Time is readable before the ceremony. */
async function presentMatchEndBeat(s: MatchState): Promise<void> {
  const copy = victoryCopyFor(s);
  const reduce = document.body.classList.contains("reduce-motion");
  const hold = reduce ? 2200 : 4500;
  syncHud();
  document.body.classList.add("match-end-beat");
  document.body.classList.toggle("match-end-lose", copy.outcome === "lose");
  document.body.classList.toggle("match-end-win", copy.outcome === "win");

  if (copy.kind === "break") {
    if (s.winner === "enemy") punchWill("you");
    else if (s.winner === "player") punchWill("foe");
    playSfx("resolve");
    flashPhase("Break", {
      kicker: copy.outcome === "lose" ? "You lost" : "You won",
      sub:
        copy.outcome === "lose"
          ? `Your Will hit 0 · ${copy.score}`
          : `Foe Will hit 0 · ${copy.score}`,
      kind: "break",
      ms: hold,
    });
    flashToast(
      copy.outcome === "lose"
        ? `Defeat — Break. Your Will is 0. (${copy.score})`
        : `Victory — Break. Foe Will is 0. (${copy.score})`,
      hold,
      "resolve",
    );
  } else if (copy.kind === "eclipse") {
    punchEclipsePip(true);
    playSfx("eclipse");
    flashPhase("Eclipse", {
      kicker: copy.outcome === "lose" ? "You lost" : "You won",
      sub:
        copy.outcome === "lose"
          ? `Foe hit ${ECLIPSE_WIN} Eclipse · ${copy.score}`
          : `You hit ${ECLIPSE_WIN} Eclipse · ${copy.score}`,
      kind: "eclipse",
      ms: hold,
    });
    flashToast(
      copy.outcome === "lose"
        ? `Defeat — Eclipse. Foe reached ${ECLIPSE_WIN}. (${copy.score})`
        : `Victory — Eclipse. You reached ${ECLIPSE_WIN}. (${copy.score})`,
      hold,
      "eclipse",
    );
  } else {
    playSfx("law");
    flashPhase("Time", {
      kicker: copy.outcome === "lose" ? "You lost" : copy.outcome === "win" ? "You won" : "Draw",
      sub: `10 rounds · ${copy.score}`,
      kind: "victory",
      ms: hold,
    });
    flashToast(
      copy.outcome === "draw"
        ? `Draw — time ran out. (${copy.score})`
        : copy.outcome === "lose"
          ? `Defeat — time. Foe held more Will. (${copy.score})`
          : `Victory — time. You held more Will. (${copy.score})`,
      hold,
      "resolve",
    );
  }

  await waitMs(hold);
  document.body.classList.remove("match-end-beat", "match-end-lose", "match-end-win");
}

function beginEndSequence(): void {
  if (!state?.winner) return;
  const snap = state;
  const reduce = document.body.classList.contains("reduce-motion");
  // Let Resolve / Final Seal banners from narrateEvents finish first
  const preWait =
    snap.endReason === "break" ? (reduce ? 1400 : 3600) : snap.endReason === "eclipse" ? (reduce ? 1200 : 3200) : reduce ? 800 : 1800;
  void enqueueFx(async () => {
    await waitMs(preWait);
    await presentMatchEndBeat(snap);
    await presentVictoryCeremony(snap);
    showEndSheet();
  });
}

function summarizeRiteOutcome(events: OculusEvent[], side: Side): string[] {
  const lines: string[] = [];
  for (const ev of events) {
    if (ev.type === "rite" || ev.type === "pass" || ev.type === "turn" || ev.type === "end") continue;
    if (ev.type === "blind") {
      lines.push(`${ALT_NAMES[ev.altitude]} Blinded`);
    } else if (ev.type === "draw" && ev.side === side && ev.to === "hand") {
      lines.push(`Drew ${getCard(ev.cardId).name}`);
    } else if (ev.type === "eclipse" && ev.side === side) {
      lines.push(`+${ev.amount} Eclipse`);
    } else if (ev.type === "favor" && ev.side === side) {
      lines.push(`+${ev.amount} Favor`);
    } else if (ev.type === "stain") {
      lines.push(`Stained ${getCard(ev.cardId).name}`);
    } else if (ev.type === "toll" && ev.side === side) {
      lines.push(`Toll placed on ${ALT_NAMES[ev.altitude]}`);
    } else if (ev.type === "toll_pay") {
      lines.push(
        ev.paid
          ? `Toll tax — Sight paid on ${ALT_NAMES[ev.altitude]}`
          : `Toll touched on ${ALT_NAMES[ev.altitude]}`,
      );
    } else if (ev.type === "lure") {
      lines.push(`Lure — ${getCard(ev.cardId).name}`);
    } else if (ev.type === "resonance" && ev.side === side) {
      lines.push(`Resonance on ${ALT_NAMES[ev.altitude]}`);
    } else if (ev.type === "fall") {
      const who = ev.side === "player" ? "Your" : "Foe";
      lines.push(`${who} ${getCard(ev.cardId).name} Fell`);
    } else if (ev.type === "overwrite") {
      lines.push(`${getCard(ev.bouncedId).name} bounced to hand`);
    } else if (ev.type === "tuck") {
      lines.push(
        `Tucked ${getCard(ev.inhabitantId).name} into ${getCard(ev.vesselId).name}`,
      );
    } else if (ev.type === "scrutiny") {
      lines.push(
        ev.stacks >= 2
          ? `${getCard(ev.cardId).name} Forced Exposed`
          : `Scrutiny ${ev.stacks}/2 on ${getCard(ev.cardId).name}`,
      );
    } else if (ev.type === "witness") {
      lines.push(
        ev.enemyTarget
          ? `Gaze stole ${getCard(ev.cardId).name}'s Revelation`
          : `Witnessed ${getCard(ev.cardId).name}`,
      );
    }
  }
  if (!lines.length) lines.push("Rite resolved — board updated");
  return lines;
}

/** Large rite face → Continue → concrete outcome → Continue. */
function presentRiteCast(cardId: string, effectLines: string[], caster: Side): Promise<void> {
  return new Promise((resolve) => {
    const def = getCard(cardId);
    const who = caster === "player" ? "You cast" : "Foe casts";
    const whoSpectate = caster === "player" ? "Bellward casts" : "Motley casts";
    cardInspect.close();
    uiPaused = true;
    riteRevealKicker.textContent = spectatorMode ? whoSpectate : who;
    riteRevealTitle.textContent = def.name;
    riteRevealFace.src = handCardSrc(cardId);
    riteRevealFace.alt = def.name;
    riteRevealBody.innerHTML = cardMetaHtml(def);
    riteReveal.classList.remove("is-effect");
    riteRevealContinue.querySelector(".btn-label")!.textContent = spectatorMode
      ? "Continue · auto"
      : "Continue";
    riteReveal.hidden = false;
    document.body.classList.add("rite-reveal-open");
    playSfx("rite", { vary: false });

    let step: "read" | "effect" = "read";
    let autoTimer: number | null = null;
    const clearAuto = (): void => {
      if (autoTimer != null) {
        window.clearTimeout(autoTimer);
        autoTimer = null;
      }
    };
    const finish = (): void => {
      clearAuto();
      riteRevealContinue.removeEventListener("click", onContinue);
      window.removeEventListener("keydown", onKey);
      hideRiteReveal();
      uiPaused = false;
      syncHud();
      resolve();
    };
    const armAuto = (ms: number): void => {
      clearAuto();
      if (!spectatorMode) return;
      autoTimer = window.setTimeout(() => onContinue(), ms);
    };
    const onContinue = (): void => {
      playSfx("ui-tap");
      if (step === "read") {
        step = "effect";
        riteReveal.classList.add("is-effect");
        riteRevealKicker.textContent = "Effect";
        riteRevealTitle.textContent = def.name;
        riteRevealBody.innerHTML = `<ul class="rite-reveal-effect-list">${effectLines
          .map((l) => `<li>${l}</li>`)
          .join("")}</ul>`;
        riteRevealContinue.querySelector(".btn-label")!.textContent = spectatorMode
          ? "Done · auto"
          : "Done";
        armAuto(3200);
        return;
      }
      finish();
    };
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape" || ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        onContinue();
      }
    };
    riteRevealContinue.addEventListener("click", onContinue);
    window.addEventListener("keydown", onKey);
    armAuto(4800);
  });
}

function queueRiteReveal(events: OculusEvent[]): void {
  const rite = events.find((e): e is Extract<OculusEvent, { type: "rite" }> => e.type === "rite");
  if (!rite) return;
  const effects = summarizeRiteOutcome(events, rite.side);
  void enqueueFx(() => presentRiteCast(rite.cardId, effects, rite.side));
}

function deckOrigin(): { x: number; y: number } {
  const r = deckAnchor.getBoundingClientRect();
  if (r.width > 0 || r.height > 0) {
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  const ha = handArea.getBoundingClientRect();
  return { x: ha.right - 28, y: ha.bottom - 36 };
}

function laneLanding(alt: Altitude, side: "player" | "enemy"): { x: number; y: number } {
  const hit = altHits.find((h) => Number(h.dataset.alt) === alt);
  const r = hit?.getBoundingClientRect();
  if (!r) return { x: window.innerWidth / 2, y: window.innerHeight * 0.45 };
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height * (side === "enemy" ? 0.28 : 0.58),
  };
}

function flyCardFace(spec: FlySpec): Promise<void> {
  return new Promise((resolve) => {
    if (reduceMotionOn()) {
      resolve();
      return;
    }
    const exit = spec.exit ?? "land";
    const dur = spec.durationMs ?? (exit === "cast" ? 280 : 280);
    const fromScale = spec.fromScale ?? 0.92;
    const toScale = spec.toScale ?? (exit === "cast" ? 0.55 : 0.4);
    const fromRot = spec.fromRot ?? -6;
    fxCardImg.src = spec.src;
    fxLayer.hidden = false;
    fxGhost.classList.add("is-flying");
    if (exit === "cast") fxGhost.classList.add("is-casting");
    fxGhost.style.transition = "none";
    fxGhost.style.opacity = "1";
    fxGhost.style.filter = "drop-shadow(0 18px 26px rgba(0, 0, 0, 0.65)) brightness(1.08)";
    fxGhost.style.left = `${spec.fromX}px`;
    fxGhost.style.top = `${spec.fromY}px`;
    fxGhost.style.transform = `translate(-50%, -50%) rotate(${fromRot}deg) scale(${fromScale})`;
    void fxGhost.offsetWidth;
    fxGhost.style.transition = `left ${dur}ms cubic-bezier(0.18, 0.9, 0.22, 1), top ${dur}ms cubic-bezier(0.18, 0.9, 0.22, 1), transform ${dur}ms cubic-bezier(0.18, 0.9, 0.22, 1), filter ${dur}ms ease, opacity ${Math.max(120, dur - 80)}ms ease`;
    fxGhost.style.left = `${spec.toX}px`;
    fxGhost.style.top = `${spec.toY}px`;
    fxGhost.style.transform = `translate(-50%, -50%) rotate(0deg) scale(${toScale})`;
    fxGhost.style.filter =
      exit === "cast"
        ? "drop-shadow(0 0 22px rgba(120, 160, 220, 0.75)) brightness(1.35)"
        : "drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35)) brightness(1.15)";
    window.setTimeout(() => {
      if (exit === "cast") {
        // Bloom dissolve — reads as cast, not a vanished summon
        const burn = 420;
        fxGhost.style.transition = `top ${burn}ms cubic-bezier(0.2, 0.8, 0.2, 1), transform ${burn}ms ease, filter ${burn}ms ease, opacity ${burn}ms ease`;
        fxGhost.style.top = `${spec.toY - 36}px`;
        fxGhost.style.transform = `translate(-50%, -50%) rotate(0deg) scale(${toScale * 1.15})`;
        fxGhost.style.filter = "drop-shadow(0 0 36px rgba(160, 200, 255, 0.95)) brightness(1.7) saturate(1.2)";
        fxGhost.style.opacity = "0";
        window.setTimeout(() => {
          fxLayer.hidden = true;
          fxGhost.classList.remove("is-flying", "is-casting");
          fxGhost.style.transition = "";
          fxGhost.style.transform = "";
          fxGhost.style.filter = "";
          fxGhost.style.opacity = "";
          resolve();
        }, burn);
        return;
      }
      fxGhost.style.opacity = "0";
      window.setTimeout(() => {
        fxLayer.hidden = true;
        fxGhost.classList.remove("is-flying", "is-casting");
        fxGhost.style.transition = "";
        fxGhost.style.transform = "";
        fxGhost.style.filter = "";
        fxGhost.style.opacity = "";
        resolve();
      }, 90);
    }, dur);
  });
}

async function animateHandDeals(cardIds: string[]): Promise<void> {
  if (!cardIds.length || !state) return;
  if (reduceMotionOn()) {
    for (const btn of handEl.querySelectorAll(".hand-card.dealing")) {
      btn.classList.remove("dealing");
      btn.classList.add("dealt");
    }
    return;
  }
  const startSlot = Math.max(0, state.hand.length - cardIds.length);
  for (let i = 0; i < cardIds.length; i++) {
    const slot = startSlot + i;
    const btn = handEl.querySelector(`.hand-card[data-slot="${slot}"]`) as HTMLElement | null;
    const origin = deckOrigin();
    let toX = origin.x - 20;
    let toY = origin.y - 48;
    if (btn) {
      const r = btn.getBoundingClientRect();
      toX = r.left + r.width / 2;
      toY = r.top + r.height / 2;
    }
    playSfx("draw");
    await flyCardFace({
      src: handCardSrc(cardIds[i]),
      fromX: origin.x,
      fromY: origin.y,
      toX,
      toY,
      fromScale: 0.7,
      toScale: 0.96,
      fromRot: -10,
      durationMs: 250,
    });
    if (btn) {
      btn.classList.remove("dealing");
      btn.classList.add("dealt");
    }
  }
}

function narrateEvents(events: ReturnType<typeof applyIntent>): void {
  const didResolve = events.some((e) => e.type === "resolve");
  const turnAfterResolve = didResolve
    ? events.find((e): e is Extract<(typeof events)[number], { type: "turn" }> => e.type === "turn")
    : undefined;
  const holdMs = spectatorMode ? 2400 : 2000;

  for (const ev of events) {
    if (ev.type === "play") {
      const def = getCard(ev.cardId);
      const lane = ALT_NAMES[ev.altitude];
      punchAltitude(ev.altitude, ev.veiled ? "summon" : "play");
      if (def.type === "site" || def.type === "sigil") {
        explain(
          `${whoVerb(ev.side, "play", "plays")} Site ${def.name} on ${lane} — landmark stays Witnessed and helps that lane.`,
          holdMs,
          "play",
        );
      } else if (ev.veiled) {
        explain(
          `${whoVerb(ev.side, "summon", "summons")} ${def.name} Veiled on ${lane} — half-real (usually weaker) until Witnessed.`,
          holdMs,
          "play",
        );
      } else {
        explain(`${whoVerb(ev.side, "play", "plays")} ${def.name} on ${lane}.`, holdMs, "play");
      }
    } else if (ev.type === "draw") {
      playSfx("draw");
      if (ev.to === "law") {
        explain(
          `${whose(ev.side)} Prophecy enters Law — a secret win track beside the board.`,
          holdMs,
          "law",
        );
      } else {
        explain(
          `${whoVerb(ev.side, "draw", "draws")} ${getCard(ev.cardId).name}.`,
          spectatorMode ? 1800 : 1400,
          "play",
        );
      }
    } else if (ev.type === "pass") {
      if (!didResolve) {
        playSfx("pass");
        if (ev.side === "player") {
          flashPhase("Passed", {
            kicker: whoLabel("player"),
            sub: "Window closed — foe may act. Resolve needs both Passes.",
            kind: "pass",
            ms: 1600,
          });
          explain(
            `${whoLabel("player")} Passes — no more actions this window. ${whoLabel("enemy")} acts next. When both have Passed, lanes Resolve.`,
            holdMs + 200,
            "pass",
          );
        } else {
          flashPhase("Passed", {
            kicker: whoLabel("enemy"),
            sub: "Window closed — other side may act.",
            kind: "pass",
            ms: 1600,
          });
          explain(
            `${whoLabel("enemy")} Passes. ${whoLabel("player")}'s turn — Pass again when ready to Resolve.`,
            holdMs + 200,
            "pass",
          );
        }
      }
    } else if (ev.type === "witness") {
      const def = getCard(ev.cardId);
      const lane = ALT_NAMES[ev.altitude];
      playSfx(ev.enemyTarget ? "gaze" : "witness");
      punchAltitude(ev.altitude, ev.enemyTarget ? "gaze" : "witness");
      if (ev.enemyTarget) {
        explain(
          `Gaze on ${lane}: ${whoVerb(ev.side, "spend", "spends")} Sight to Witness enemy ${def.name} — steals their one-time Revelation.`,
          holdMs + 400,
          "gaze",
        );
      } else {
        explain(
          `Witness on ${lane}: ${whoVerb(ev.side, "spend", "spends")} Sight — ${def.name} becomes real (stronger) and its Revelation fires once.`,
          holdMs + 400,
          "witness",
        );
      }
    } else if (ev.type === "reveil") {
      const def = getCard(ev.cardId);
      playSfx("witness");
      punchAltitude(ev.altitude, "stance");
      explain(
        `Re-Veil: ${whoVerb(ev.side, "pay", "pays")} Sight to hide ${def.name} again — back to Veiled power. Revelation does not re-fire.`,
        holdMs,
        "stance",
      );
    } else if (ev.type === "scrutiny") {
      punchAltitude(ev.altitude, "blind");
      if (ev.stacks >= 2) {
        explain(
          `Scrutiny 2/2 — ${getCard(ev.cardId).name} is Forced Exposed (Witnessed against its will).`,
          holdMs + 200,
          "blind",
        );
      } else {
        explain(
          `Scrutiny ${ev.stacks}/2 on ${getCard(ev.cardId).name} — at 2 stacks it Forced Exposes.`,
          holdMs,
          "blind",
        );
      }
    } else if (ev.type === "overwrite") {
      explain(
        `Overwrite on ${ALT_NAMES[ev.altitude]}: ${getCard(ev.bouncedId).name} returns to hand (no Fall) so a new figure can enter.`,
        holdMs,
        "play",
      );
    } else if (ev.type === "tuck") {
      punchAltitude(ev.altitude, "play");
      explain(
        `Tuck: ${getCard(ev.inhabitantId).name} enters ${getCard(ev.vesselId).name} as Inhabitant on ${ALT_NAMES[ev.altitude]} (INH badge).`,
        holdMs,
        "play",
      );
    } else if (ev.type === "graft") {
      const def = getCard(ev.relicId);
      punchAltitude(ev.altitude, "play");
      explain(
        `Graft: ${def.name} attaches as a Charm on ${ALT_NAMES[ev.altitude]} — boosts or triggers with that figure.`,
        holdMs,
        "graft",
      );
    } else if (ev.type === "rite") {
      const def = getCard(ev.cardId);
      if (ev.altitude != null) punchAltitude(ev.altitude, "rite");
      explain(
        `Rite cast: ${def.name}${ev.altitude != null ? ` aiming ${ALT_NAMES[ev.altitude]}` : ""} — one-shot spell (see effect).`,
        holdMs,
        "rite",
      );
    } else if (ev.type === "toll") {
      punchAltitude(ev.altitude, "rite");
      explain(
        `Toll placed on ${ALT_NAMES[ev.altitude]} by ${whoLabel(ev.side)} — their figures there +1; enemy Witness/Gaze into it pays tax.`,
        holdMs + 200,
        "rite",
      );
    } else if (ev.type === "toll_pay") {
      punchAltitude(ev.altitude, "rite");
      explain(
        ev.paid
          ? `Toll tax on ${ALT_NAMES[ev.altitude]} — Sight paid to the Toll owner; Resonance may fire. Mark stays.`
          : `Toll touched on ${ALT_NAMES[ev.altitude]} — no Sight left to pay the tax.`,
        holdMs,
        "rite",
      );
    } else if (ev.type === "lure") {
      punchAltitude(ev.altitude, "witness");
      explain(
        `Lure on ${ALT_NAMES[ev.altitude]}: forces a true Witness on ${getCard(ev.cardId).name} and clears the Toll.`,
        holdMs + 200,
        "witness",
      );
    } else if (ev.type === "resonance") {
      punchAltitude(ev.altitude, "rite");
      explain(
        `Resonance on ${ALT_NAMES[ev.altitude]} — Toll/Lure payoff (Sight or draw for Bellward pieces).`,
        holdMs,
        "rite",
      );
    } else if (ev.type === "peal") {
      punchAltitude(ev.altitude, "rite");
      explain(
        `Peal armed on ${ALT_NAMES[ev.altitude]} (−1 Sight) — when Resolve spends that Toll, Peal pays Sight + a card.`,
        holdMs + 200,
        "rite",
      );
    } else if (ev.type === "peal_pay") {
      punchAltitude(ev.altitude, "eclipse");
      explain(
        `Peal pays on ${ALT_NAMES[ev.altitude]} — ${whoVerb(ev.side, "gain", "gains")} Sight and draw 1.`,
        holdMs,
        "eclipse",
      );
    } else if (ev.type === "stance") {
      playSfx("stance");
      punchAltitude(ev.altitude, "stance");
      const stanceEl = altHits
        .find((h) => Number(h.dataset.alt) === ev.altitude)
        ?.querySelector(".alt-stance");
      if (stanceEl) {
        stanceEl.classList.remove("flip");
        void (stanceEl as HTMLElement).offsetWidth;
        stanceEl.classList.add("flip");
      }
      explain(
        ev.stanceB
          ? `Stance B on ${ALT_NAMES[ev.altitude]} — Veiled/Witnessed powers swap. Motley Holds vs Erase while Veiled B.`
          : `Stance A on ${ALT_NAMES[ev.altitude]} — back to printed Veiled/Witnessed powers.`,
        holdMs,
        "stance",
      );
    } else if (ev.type === "wager") {
      playSfx("stance");
      punchAltitude(ev.altitude, "stance");
      const who = getCard(ev.cardId).name;
      explain(
        ev.free
          ? `Free Wager on ${who} (${ALT_NAMES[ev.altitude]}) — no ante. Win Veiled = Cash; lose/expose = Bust.`
          : `Wager on ${who} (${ALT_NAMES[ev.altitude]}) — ante 1 Sight. Win still Veiled = Cash (refund + reward); lose = Bust (ante gone).`,
        holdMs + 400,
        "stance",
      );
    } else if (ev.type === "cash") {
      playSfx("eclipse");
      punchAltitude(ev.altitude, "resolve");
      playWagerFlip(ev.altitude, "cash");
      explain(
        `Cash — ${getCard(ev.cardId).name} won ${ALT_NAMES[ev.altitude]} while Veiled + Wagered. Ante refunded + Cash reward. (Trick seals need Favor.)`,
        holdMs + 400,
        "eclipse",
      );
    } else if (ev.type === "bust") {
      playSfx("strain");
      punchAltitude(ev.altitude, "strain");
      playWagerFlip(ev.altitude, "bust");
      explain(
        `Bust — ${getCard(ev.cardId).name} lost or was Forced Exposed while Wagered. Ante is gone; no Cash.`,
        holdMs + 200,
        "strain",
      );
    } else if (ev.type === "fold") {
      punchAltitude(ev.altitude, "stance");
      explain(
        `Fold — ${whoVerb(ev.side, "Witness", "Witnesses")} their own Wagered ${getCard(ev.cardId).name}. Wager clears; ante not refunded. (Bad for Eclipse.)`,
        holdMs,
        "stance",
      );
    } else if (ev.type === "overexpose") {
      punchAltitude(ev.altitude, "strain");
      explain(
        `Overexpose — ${getCard(ev.cardId).name} lost Resolve while freshly Witnessed (Scar Breach). Controller loses 1 Sight if able and 1 Will.`,
        holdMs + 200,
        "strain",
      );
    } else if (ev.type === "press") {
      playSfx("stain");
      punchAltitude(ev.altitude, "stain");
      const dahaka =
        ev.bonusWill && ev.bonusWill > 0
          ? ` Dahaka Witnessed: foe −${ev.bonusWill} Will.`
          : "";
      explain(
        `Press — ${whoVerb(ev.side, "mark", "marks")} ${getCard(ev.cardId).name}. Win that lane to pierce Stance B / Erase; fail = backlash. (Free into Motley Stance B; Stain not required there.)${dahaka}`,
        holdMs + 400,
        "stain",
      );
    } else if (ev.type === "press_backlash") {
      punchAltitude(ev.altitude, "strain");
      explain(
        `Press backlash — the Press failed on ${ALT_NAMES[ev.altitude]} (${getCard(ev.cardId).name}). Smother cost hits the Presser.`,
        holdMs + 200,
        "strain",
      );
    } else if (ev.type === "favor") {
      playSfx("eclipse");
      punchMeter(mFavor);
      explain(
        `${whoVerb(ev.side, "gain", "gains")} ${ev.amount} Favor (Motley currency — antes and payoffs; max 3).`,
        holdMs,
        "eclipse",
      );
    } else if (ev.type === "law") {
      playSfx("law");
      explain(
        `Unblinking Law completes — ${whoVerb(ev.side, "gain", "gains")} +${ev.eclipseGain} Eclipse.`,
        holdMs + 400,
        "law",
      );
    } else if (ev.type === "resolve") {
      const { player, enemy } = ev.damages;
      playSfx("resolve");
      for (const hit of altHits) hit.classList.add("fx-resolve");
      window.setTimeout(() => {
        for (const hit of altHits) hit.classList.remove("fx-resolve");
      }, 520);
      const bits: string[] = [];
      if (enemy > 0) bits.push(`${whoLabel("enemy")} −${enemy} Will`);
      if (player > 0) bits.push(`${whoLabel("player")} −${player} Will`);
      const sub = bits.length ? bits.join(" · ") : "No Will damage this Resolve";
      flashPhase("Resolve", {
        kicker: "Both passed",
        sub,
        kind: "resolve",
        ms: 2600,
      });
      explain(
        `Resolve — each lane compares power. Winner chips Will. Veiled losers Hold; Witnessed losers Fall. ${sub}.`,
        holdMs + 800,
        "resolve",
      );
    } else if (ev.type === "strain") {
      const def = getCard(ev.cardId);
      playSfx("strain");
      punchAltitude(ev.altitude, "strain");
      explain(
        `Strain — ${whose(ev.side)} Witnessed ${def.name} lost a lane. Next loss while Witnessed = Fall (destroyed).`,
        holdMs + 200,
        "strain",
      );
    } else if (ev.type === "stain") {
      const def = getCard(ev.cardId);
      playSfx("stain");
      punchAltitude(ev.altitude, "stain");
      explain(
        `Stain — ${def.name} marked (${ALT_NAMES[ev.altitude]}). Ink can Press / Erase from here toward Forced Exposed.`,
        holdMs,
        "stain",
      );
    } else if (ev.type === "blind") {
      playSfx("blind");
      punchAltitude(ev.altitude, "blind");
      explain(
        `Blind — ${ALT_NAMES[ev.altitude]} yields no Sight this turn (Cash / Witness income shut on that lane).`,
        holdMs,
        "blind",
      );
    } else if (ev.type === "eclipse") {
      playSfx("eclipse");
      const total = !state
        ? ev.amount
        : ev.side === "player"
          ? state.eclipse
          : state.enemyEclipse;
      const who = whoLabel(ev.side);
      const sideUi: "you" | "foe" = ev.side === "player" ? "you" : "foe";
      const critical = total >= ECLIPSE_WIN;
      punchEclipsePip(critical);
      spawnEclipseFloat(sideUi, ev.amount, total);
      for (const hit of altHits) {
        hit.classList.remove("fx-eclipse", "fx-flash");
        void hit.offsetWidth;
        hit.classList.add("fx-flash", "fx-eclipse");
      }
      window.setTimeout(() => {
        for (const hit of altHits) hit.classList.remove("fx-flash", "fx-eclipse");
      }, critical ? 1200 : 700);
      flashPhase(critical ? "Final Seal" : "Eclipse", {
        kicker: who,
        sub: critical
          ? `${total}/${ECLIPSE_WIN} — match ends`
          : `+${ev.amount} · now ${total}/${ECLIPSE_WIN}${ev.reason ? ` · ${eclipseReasonLabel(ev.reason)}` : ""}`,
        kind: "eclipse",
        ms: critical ? 3000 : 2200,
      });
      explain(
        critical
          ? `${who} reaches Eclipse ${total}/${ECLIPSE_WIN} — alt win. Match over even if Will remains.`
          : `${who} gains +${ev.amount} Eclipse (${total}/${ECLIPSE_WIN})${ev.reason ? ` — ${eclipseReasonLabel(ev.reason)}` : ""}. At ${ECLIPSE_WIN} Eclipse they win without Breaking Will.`,
        critical ? 3000 : holdMs + 400,
        "eclipse",
      );
    } else if (ev.type === "fall") {
      const def = getCard(ev.cardId);
      playSfx("fall");
      punchAltitude(ev.altitude, "fall");
      flashPhase("Fall", {
        kicker: "Unmake",
        sub: `${whose(ev.side)} ${def.name}`,
        kind: "fall",
        ms: 2000,
      });
      explain(
        `Fall — ${whose(ev.side)} ${def.name} is Unmade (destroyed). Charms return to hand; Sites stay.`,
        holdMs + 400,
        "fall",
      );
    } else if (ev.type === "turn") {
      if (turnAfterResolve && ev === turnAfterResolve && ev.side === "player") {
        const n = ev.turn;
        window.setTimeout(() => {
          flashPhase(`Round ${n}`, {
            kicker: "New window",
            sub: "Essence · Sight · draw — then act or Pass",
            kind: "round",
            ms: 2200,
          });
          explain(
            `Round ${n} — new Essence and Sight, draw a card, then act or Pass.`,
            2200,
            "round",
          );
        }, 1100);
      } else if (ev.side === "enemy" && !didResolve) {
        playSfx("enemy");
        explain(`${whoLabel("enemy")}'s turn — they act now.`, 1600);
      } else if (ev.side === "player" && ev.turn > 1 && !didResolve) {
        explain(`${whoLabel("player")}'s turn ${ev.turn}.`, 1400, "round");
      }
    } else if (ev.type === "end") {
      const reason =
        ev.reason === "eclipse"
          ? `Eclipse (${ECLIPSE_WIN} seals)`
          : ev.reason === "break"
            ? "Break (Will to 0)"
            : "Time (10 rounds)";
      explain(`Match over — ${reason}.`, 2400, ev.reason === "eclipse" ? "eclipse" : "resolve");
    }
  }
}

function afterPlayer(events: ReturnType<typeof applyIntent>): void {
  const draws = events.filter(
    (e): e is Extract<(typeof events)[number], { type: "draw" }> =>
      e.type === "draw" && e.side === "player" && e.to === "hand",
  );
  handDealCount = draws.length;
  stage.onEvents(events);
  narrateEvents(events);
  queueRiteReveal(events);
  if (state?.tutorial && state.tutorialStep !== "done") {
    const um = tutorialUiMode(state.tutorialStep);
    if (um) mode = um;
    else mode = "play";
    selectedHand = tutorialSelectHandIndex(state);
  }
  syncHud();
  if (draws.length) {
    void enqueueFx(() => animateHandDeals(draws.map((d) => d.cardId)));
  }
  if (state?.tutorial && state.tutorialStep === "done" && state.winner == null) {
    flashToast("First Gaze complete ? free play", 1600);
  } else if (state?.tutorial && state.tutorialStep === "play") {
    cardInspect.close();
  }
  if (state!.winner != null) {
    showEnd();
    return;
  }
  if (spectatorMode) return;
  if (state!.active === "enemy") {
    void fxChain.then(() => {
      if (!uiPaused) window.setTimeout(runEnemy, 320);
    });
  }
}

function enemyDelayMs(intent: Intent, events: OculusEvent[]): number {
  const reduce = document.body.classList.contains("reduce-motion");
  const scale = (n: number) => (reduce ? Math.min(n, Math.round(n * 0.55)) : n);
  if (events.some((e) => e.type === "end")) return scale(600);
  if (events.some((e) => e.type === "resolve")) return scale(3800);
  if (events.some((e) => e.type === "eclipse")) return scale(3200);
  if (events.some((e) => e.type === "rite")) return scale(2800);
  if (events.some((e) => e.type === "fall")) return scale(2600);
  if (intent.kind === "pass") return scale(1800);
  if (intent.kind === "witness") return scale(2600);
  if (intent.kind === "play" || intent.kind === "graft") return scale(2800);
  if (intent.kind === "stance" || intent.kind === "wager" || intent.kind === "press" || intent.kind === "peal") {
    return scale(2200);
  }
  return scale(2000);
}

/** Banner + toast so the player can read what the foe is about to do. */
async function announceEnemyIntent(intent: Intent): Promise<void> {
  if (!state) return;
  const reduce = document.body.classList.contains("reduce-motion");
  const beat = reduce ? 400 : 1100;

  if (intent.kind === "play" || intent.kind === "graft" || intent.kind === "rite") {
    const cardId = state.enemyHand[intent.handIndex];
    if (!cardId || intent.altitude == null) return;
    const def = getCard(cardId);
    const lane = ALT_NAMES[intent.altitude];
    const kindLabel =
      def.type === "site" || def.type === "sigil"
        ? "Site"
        : def.type === "relic"
          ? "Graft"
          : intent.kind === "rite"
            ? "Rite"
            : "Summon";
    flashPhase(def.name, {
      kicker: `Foe · ${kindLabel}`,
      sub: `${lane}${def.type === "figure" ? " · enters Veiled" : ""}`,
      kind: intent.kind === "rite" ? "rite" : "pass",
      ms: reduce ? 1000 : 2000,
    });
    flashToast(`Foe ${kindLabel}: ${def.name} → ${lane}`, reduce ? 1000 : 2200, "play");
    punchAltitude(intent.altitude, intent.kind === "rite" ? "rite" : "summon");
    await waitMs(beat);
    return;
  }

  if (intent.kind === "witness") {
    const lane = ALT_NAMES[intent.altitude];
    const gaze = !!intent.enemy;
    flashPhase(gaze ? "Gaze" : "Witness", {
      kicker: "Foe",
      sub: gaze ? `${lane} — steals your Revelation` : `${lane} — opens their figure`,
      kind: "pass",
      ms: reduce ? 900 : 1800,
    });
    flashToast(
      gaze ? `Foe Gazes ${lane}` : `Foe Witnesses ${lane}`,
      reduce ? 900 : 2000,
      "witness",
    );
    punchAltitude(intent.altitude, "witness");
    await waitMs(beat);
    return;
  }

  if (intent.kind === "pass") {
    flashPhase("Foe Passes", {
      kicker: "Enemy window",
      sub: "Their actions are done this window",
      kind: "pass",
      ms: reduce ? 800 : 1400,
    });
    flashToast("Foe Passes", reduce ? 800 : 1600, "pass");
    await waitMs(reduce ? 300 : 700);
    return;
  }

  if (intent.kind === "stance") {
    flashPhase("Stance", {
      kicker: "Foe",
      sub: `${ALT_NAMES[intent.altitude]} — power swap`,
      kind: "pass",
      ms: reduce ? 800 : 1600,
    });
    flashToast(`Foe Stance on ${ALT_NAMES[intent.altitude]}`, reduce ? 800 : 1800, "play");
    punchAltitude(intent.altitude, "stance");
    await waitMs(beat);
    return;
  }

  if (intent.kind === "wager") {
    flashPhase("Wager", {
      kicker: "Foe",
      sub: `${ALT_NAMES[intent.altitude]} — ante`,
      kind: "pass",
      ms: reduce ? 800 : 1600,
    });
    flashToast(`Foe Wagers on ${ALT_NAMES[intent.altitude]}`, reduce ? 800 : 1800, "play");
    punchAltitude(intent.altitude, "summon");
    await waitMs(beat);
  }
}

function runEnemy(): void {
  if (spectatorMode) return;
  if (uiPaused) return;
  if (!state || state.phase !== "play" || state.active !== "enemy") return;
  let guard = 12;
  const step = (): void => {
    void (async () => {
      if (spectatorMode || uiPaused) return;
      if (!state || state.phase !== "play" || state.active !== "enemy" || guard-- <= 0) {
        syncHud();
        if (state?.winner != null) showEnd();
        return;
      }
      const intent = chooseAiMove(state);
      await announceEnemyIntent(intent);
      await flyEnemyIntent(intent);
      const events = applyIntent(state, intent);
      const draws = events.filter(
        (e): e is Extract<(typeof events)[number], { type: "draw" }> =>
          e.type === "draw" && e.side === "player" && e.to === "hand",
      );
      handDealCount = draws.length;
      stage.onEvents(events);
      narrateEvents(events);
      queueRiteReveal(events);
      syncHud();
      if (draws.length) {
        void enqueueFx(() => animateHandDeals(draws.map((d) => d.cardId)));
      }
      if (state.winner != null) {
        showEnd();
        return;
      }
      if (state.active === "enemy") {
        const delay = enemyDelayMs(intent, events);
        void fxChain.then(() => {
          if (!uiPaused) window.setTimeout(step, delay);
        });
      }
    })();
  };
  step();
}

function spectateDelayMs(intent: Intent, events: OculusEvent[]): number {
  if (events.some((e) => e.type === "end")) return 4200;
  if (events.some((e) => e.type === "eclipse")) return 3200;
  if (events.some((e) => e.type === "resolve")) return 3400;
  if (events.some((e) => e.type === "rite")) return 2800;
  if (events.some((e) => e.type === "fall")) return 2400;
  if (intent.kind === "pass") return 1600;
  if (intent.kind === "witness") return 2400;
  if (intent.kind === "play" || intent.kind === "graft") return 2600;
  return 2000;
}

async function flySpectateIntent(intent: Intent, side: Side): Promise<void> {
  if (!state || reduceMotionOn()) return;
  const hand = side === "player" ? state.hand : state.enemyHand;
  if (intent.kind === "play" || intent.kind === "graft" || intent.kind === "rite") {
    const cardId = hand[intent.handIndex];
    if (!cardId || intent.altitude == null) return;
    const land = laneLanding(intent.altitude, side);
    const hit = altHits.find((h) => Number(h.dataset.alt) === intent.altitude);
    const r = hit?.getBoundingClientRect();
    const fromX = r ? r.left + r.width / 2 : land.x;
    const fromY =
      side === "enemy"
        ? r
          ? r.top - 40
          : land.y - 80
        : r
          ? r.bottom + 20
          : land.y + 60;
    const isRite = intent.kind === "rite";
    const def = getCard(cardId);
    const isSite = def.type === "site" || def.type === "sigil";
    playSfx(
      intent.kind === "graft"
        ? "graft"
        : intent.kind === "rite"
          ? "ui-tap"
          : isSite
            ? "site"
            : "play",
    );
    await enqueueFx(() =>
      flyCardFace({
        src: handCardSrc(cardId),
        fromX,
        fromY,
        toX: land.x,
        toY: land.y,
        fromScale: side === "player" ? 0.85 : 0.7,
        toScale: isRite ? 0.52 : isSite ? 0.48 : 0.38,
        fromRot: side === "enemy" ? 8 : -6,
        durationMs: isRite ? 320 : isSite ? 420 : 300,
        exit: isRite ? "cast" : "land",
      }),
    );
  }
}

function runSpectateStep(gen: number): void {
  void (async () => {
    if (gen !== spectateGen || !spectatorMode) return;
    if (spectateBusy) return;
    if (!state || state.phase !== "play") return;
    if (state.winner != null) {
      showEnd();
      return;
    }
    if (uiPaused) {
      window.setTimeout(() => runSpectateStep(gen), 400);
      return;
    }
    spectateBusy = true;
    try {
      const side = state.active;
      setEnemyTurn(side === "enemy");
      const craft = side === "player" ? "Bellward" : "Motley";
      explain(`${craft}'s window — they choose an action now.`, 1400, "pass");
      const intent = chooseAiMove(state);
      await flySpectateIntent(intent, side);
      if (gen !== spectateGen || !state) {
        spectateBusy = false;
        return;
      }
      const events = applyIntent(state, intent);
      const draws = events.filter(
        (e): e is Extract<(typeof events)[number], { type: "draw" }> =>
          e.type === "draw" && e.side === "player" && e.to === "hand",
      );
      handDealCount = draws.length;
      stage.onEvents(events);
      narrateEvents(events);
      queueRiteReveal(events);
      syncHud();
      if (draws.length) {
        void enqueueFx(() => animateHandDeals(draws.map((d) => d.cardId)));
      }
      if (state.winner != null) {
        spectateBusy = false;
        showEnd();
        return;
      }
      const delay = spectateDelayMs(intent, events);
      void fxChain.then(() => {
        if (gen !== spectateGen) {
          spectateBusy = false;
          return;
        }
        window.setTimeout(() => {
          spectateBusy = false;
          runSpectateStep(gen);
        }, delay);
      });
    } catch {
      spectateBusy = false;
      if (gen === spectateGen) {
        window.setTimeout(() => runSpectateStep(gen), 800);
      }
    }
  })();
}

async function flyEnemyIntent(intent: Intent): Promise<void> {
  if (!state || reduceMotionOn()) return;
  if (intent.kind === "play" || intent.kind === "graft") {
    const cardId = state.enemyHand[intent.handIndex];
    if (!cardId) return;
    const def = getCard(cardId);
    const land = laneLanding(intent.altitude, "enemy");
    const hit = altHits.find((h) => Number(h.dataset.alt) === intent.altitude);
    const r = hit?.getBoundingClientRect();
    const fromX = r ? r.left + r.width / 2 : land.x;
    const fromY = r ? r.top - 56 : land.y - 100;
    const isSite = def.type === "site" || def.type === "sigil";
    playSfx(intent.kind === "graft" ? "graft" : isSite ? "site" : "play");
    await enqueueFx(() =>
      flyCardFace({
        src: handCardSrc(cardId),
        fromX,
        fromY,
        toX: land.x,
        toY: land.y,
        fromScale: 0.92,
        toScale: isSite ? 0.62 : 0.55,
        fromRot: 6,
        durationMs: isSite ? 520 : 480,
      }),
    );
  } else if (intent.kind === "rite" && intent.altitude != null) {
    const cardId = state.enemyHand[intent.handIndex];
    if (!cardId) return;
    const land = laneLanding(intent.altitude, "enemy");
    playSfx("ui-tap");
    await enqueueFx(() =>
      flyCardFace({
        src: handCardSrc(cardId),
        fromX: land.x,
        fromY: land.y - 90,
        toX: land.x,
        toY: land.y,
        fromScale: 0.88,
        toScale: 0.58,
        durationMs: 420,
        exit: "cast",
      }),
    );
  }
}

function showEndSheet(): void {
  if (!state) return;
  uiPaused = false;
  spectateBusy = false;
  hideAllSheets();
  const copy = victoryCopyFor(state);
  endPanel.hidden = false;
  setMenuMode(true);
  setEnemyTurn(false);
  setMusicBed("menu");
  endOutcome.textContent = copy.outcomeLabel;
  endKicker.textContent = copy.kicker;
  endTitle.textContent = copy.title;
  endDetail.textContent = copy.score;
  endExplain.textContent = copy.explain;
  endPanel.classList.remove(
    "end--eclipse",
    "end--break",
    "end--turns",
    "end--win",
    "end--lose",
    "end--draw",
  );
  endPanel.classList.add(`end--${copy.kind}`, `end--${copy.outcome}`);
  handEl.innerHTML = "";
  actionsEl.hidden = true;
  btnWitness.disabled = true;
  btnReveil.disabled = true;
  btnStance.disabled = true;
  btnPass.disabled = true;
  syncHud();
}

/** @deprecated use beginEndSequence — kept name for grep safety during cutover */
function showEnd(): void {
  beginEndSequence();
}

function highlightAltitudesForHand(handIndex: number): void {
  if (!state) return;
  const intents = legalIntents(state);
  for (const hit of altHits) {
    const alt = Number(hit.dataset.alt) as Altitude;
    const def = getCard(state.hand[handIndex]);
    let legal = false;
    if (def.type === "rite") {
      legal = intents.some((i) => i.kind === "rite" && i.handIndex === handIndex && i.altitude === alt);
    } else if (def.type === "relic") {
      legal = intents.some((i) => i.kind === "graft" && i.handIndex === handIndex && i.altitude === alt);
    } else {
      legal = intents.some((i) => i.kind === "play" && i.handIndex === handIndex && i.altitude === alt);
    }
    hit.classList.toggle("legal", legal);
    hit.classList.toggle("disabled", !legal);
    hit.setAttribute("aria-disabled", legal ? "false" : "true");
  }
}

function moveDragGhost(x: number, y: number): void {
  dragGhost.style.left = `${x}px`;
  dragGhost.style.top = `${y}px`;
}

function beginDragVisual(d: DragState): void {
  d.active = true;
  cardInspect.close();
  dragCardImg.src = d.cardSrc;
  dragCardImg.alt = "Dragging card";
  dragLayer.hidden = false;
  document.body.classList.add("dragging-card");
  const btn = handEl.querySelectorAll(".hand-card")[d.handIndex];
  btn?.classList.add("dragging");
  dragGhost.classList.remove("is-dropping");
  dragGhost.style.transition = "none";
  dragGhost.style.transform = "translate(-50%, -58%) rotate(-4deg) scale(1.06)";
  moveDragGhost(d.startX, d.startY);
}

function endDragVisual(): void {
  dragLayer.hidden = true;
  document.body.classList.remove("dragging-card");
  dragGhost.classList.remove("is-dropping", "is-casting");
  dragGhost.style.transition = "";
  dragGhost.style.transform = "";
  dragGhost.style.filter = "";
  dragGhost.style.opacity = "";
  for (const hit of altHits) hit.classList.remove("drop-target");
  drag = null;
}

function altitudeAtPoint(clientX: number, clientY: number): Altitude | null {
  for (const hit of altHits) {
    if (!hit.classList.contains("legal")) continue;
    const r = hit.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      return Number(hit.dataset.alt) as Altitude;
    }
  }
  const canvasRect = canvas.getBoundingClientRect();
  if (
    clientX >= canvasRect.left &&
    clientX <= canvasRect.right &&
    clientY >= canvasRect.top &&
    clientY <= canvasRect.bottom
  ) {
    const alt = stage.hitAltitude(clientX - canvasRect.left, clientY - canvasRect.top);
    if (alt === null) return null;
    const hit = altHits.find((h) => Number(h.dataset.alt) === alt);
    if (hit?.classList.contains("legal")) return alt;
  }
  return null;
}

function animateDropToAltitude(alt: Altitude, exit: "land" | "cast" = "land"): Promise<void> {
  return new Promise((resolve) => {
    const hit = altHits.find((h) => Number(h.dataset.alt) === alt);
    if (!hit || document.body.classList.contains("reduce-motion")) {
      resolve();
      return;
    }
    const r = hit.getBoundingClientRect();
    const tx = r.left + r.width / 2;
    const ty = r.top + r.height * (exit === "cast" ? 0.48 : 0.38);
    const landScale = exit === "cast" ? 0.52 : 0.38;
    dragGhost.classList.add("is-dropping");
    if (exit === "cast") dragGhost.classList.add("is-casting");
    dragGhost.style.transition =
      "left 0.24s cubic-bezier(0.18, 0.9, 0.22, 1), top 0.24s cubic-bezier(0.18, 0.9, 0.22, 1), transform 0.24s cubic-bezier(0.18, 0.9, 0.22, 1), filter 0.24s ease";
    void dragGhost.offsetWidth;
    dragGhost.style.left = `${tx}px`;
    dragGhost.style.top = `${ty}px`;
    dragGhost.style.transform = `translate(-50%, -50%) scale(${landScale}) rotate(0deg)`;
    dragGhost.style.filter =
      exit === "cast"
        ? "drop-shadow(0 0 22px rgba(120, 160, 220, 0.75)) brightness(1.35)"
        : "drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35))";
    window.setTimeout(() => {
      if (exit !== "cast") {
        resolve();
        return;
      }
      const burn = 400;
      dragGhost.style.transition = `top ${burn}ms cubic-bezier(0.2, 0.8, 0.2, 1), transform ${burn}ms ease, filter ${burn}ms ease, opacity ${burn}ms ease`;
      dragGhost.style.top = `${ty - 36}px`;
      dragGhost.style.transform = `translate(-50%, -50%) scale(${landScale * 1.15}) rotate(0deg)`;
      dragGhost.style.filter = "drop-shadow(0 0 36px rgba(160, 200, 255, 0.95)) brightness(1.7)";
      dragGhost.style.opacity = "0";
      window.setTimeout(() => resolve(), burn);
    }, 250);
  });
}

function tryAltitude(alt: Altitude): boolean {
  if (spectatorMode || uiPaused || intentBusy) return false;
  if (!state || state.phase !== "play" || state.active !== "player") return false;
  const intents = legalIntents(state);
  let intent: Intent | undefined;

  if (mode === "witness") {
    const own = intents.find((i) => i.kind === "witness" && i.altitude === alt && !i.enemy);
    const gaze = intents.find((i) => i.kind === "witness" && i.altitude === alt && i.enemy);
    // Own Veiled first; after they're Witnessed, same altitude Gaze becomes available.
    intent = own ?? gaze;
  } else if (mode === "reveil") {
    intent = intents.find((i) => i.kind === "reveil" && i.altitude === alt);
  } else if (mode === "stance") {
    intent = intents.find((i) => i.kind === "stance" && i.altitude === alt);
  } else if (mode === "wager") {
    intent = intents.find((i) => i.kind === "wager" && i.altitude === alt);
  } else if (mode === "press") {
    intent = intents.find((i) => i.kind === "press" && i.altitude === alt);
  } else if (mode === "peal") {
    intent = intents.find((i) => i.kind === "peal" && i.altitude === alt);
  } else if (selectedHand !== null) {
    const def = getCard(state.hand[selectedHand]);
    if (def.type === "rite") {
      intent = intents.find(
        (i) => i.kind === "rite" && i.handIndex === selectedHand && i.altitude === alt,
      );
    } else if (def.type === "relic") {
      intent = intents.find(
        (i) => i.kind === "graft" && i.handIndex === selectedHand && i.altitude === alt,
      );
    } else {
      intent = intents.find(
        (i) => i.kind === "play" && i.handIndex === selectedHand && i.altitude === alt,
      );
    }
  }

  if (!intent) return false;
  void commitPlayerIntent(intent, alt);
  return true;
}

async function commitPlayerIntent(intent: Intent, alt: Altitude): Promise<void> {
  if (!state || intentBusy) return;
  intentBusy = true;
  const handIndex = selectedHand;
  const shouldFly =
    !skipNextSummonFly &&
    handIndex !== null &&
    (intent.kind === "play" || intent.kind === "graft" || intent.kind === "rite") &&
    !reduceMotionOn();
  skipNextSummonFly = false;
  selectedHand = null;
  mode = "play";

  try {
    if (shouldFly && handIndex !== null) {
      const btn = handEl.querySelectorAll(".hand-card")[handIndex] as HTMLElement | undefined;
      const cardId = state.hand[handIndex];
      const land = laneLanding(alt, "player");
      const isRite = intent.kind === "rite";
      if (btn && cardId) {
        btn.classList.add("dragging");
        const r = btn.getBoundingClientRect();
        await enqueueFx(() =>
          flyCardFace({
            src: handCardSrc(cardId),
            fromX: r.left + r.width / 2,
            fromY: r.top + r.height / 2,
            toX: land.x,
            toY: land.y,
            fromScale: 1.02,
            toScale: isRite ? 0.55 : 0.38,
            durationMs: isRite ? 280 : 240,
            exit: isRite ? "cast" : "land",
          }),
        );
      }
    }

    if (intent.kind === "play") {
      const cardId = state.hand[intent.handIndex];
      const def = cardId ? getCard(cardId) : null;
      playSfx(def && (def.type === "site" || def.type === "sigil") ? "site" : "play");
    } else if (intent.kind === "graft") playSfx("graft");
    // Rite musical sting plays once in presentRiteCast
  else if (intent.kind === "stance") playSfx("stance");
  else if (intent.kind === "reveil") playSfx("witness");
  const events = applyIntent(state, intent);
    afterPlayer(events);
  } finally {
    intentBusy = false;
  }
}

const unlockAnd = (fn: () => void) => () => {
  void unlockAudio();
  playSfx("ui-tap");
  fn();
};
document.getElementById("btn-play")!.addEventListener("click", unlockAnd(() => openHeresyPick()));
document.getElementById("btn-tutorial")!.addEventListener("click", unlockAnd(() => startMatch(true)));
document.getElementById("btn-spectate")!.addEventListener("click", unlockAnd(() => openSpectatePick()));
document.getElementById("spectate-back")!.addEventListener("click", () => {
  document.getElementById("spectate-pick")!.hidden = true;
  menu.hidden = false;
  setMenuMode(true);
});
document.getElementById("spectate-random")!.addEventListener(
  "click",
  unlockAnd(() => startRandomSpectate()),
);
document.getElementById("spectate-start")!.addEventListener(
  "click",
  unlockAnd(() => {
    const bottom = (document.getElementById("spectate-bottom") as HTMLSelectElement).value as LiveCraft;
    const top = (document.getElementById("spectate-top") as HTMLSelectElement).value as LiveCraft;
    const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    startSpectateBots(bottom, top, { seed, random: false });
  }),
);
document.getElementById("btn-codex")!.addEventListener("click", unlockAnd(() => openCodex()));
document.getElementById("btn-builder")!.addEventListener("click", unlockAnd(() => openBuilder()));
document.getElementById("btn-howto")!.addEventListener("click", unlockAnd(() => openHowto("menu")));
document.getElementById("btn-settings")!.addEventListener("click", unlockAnd(() => openSettings("menu")));
document.getElementById("heresy-back")!.addEventListener("click", () => closeHeresyPick());
heresyListEl.addEventListener("click", (ev) => {
  const t = ev.target as HTMLElement | null;
  const enter = t?.closest?.("[data-enter]") as HTMLElement | null;
  const build = t?.closest?.("[data-build]") as HTMLElement | null;
  if (enter) {
    const id = enter.getAttribute("data-enter") as Heresy | null;
    if (!id) return;
    void unlockAudio();
    playSfx("ui-tap");
    startMatch(false, fullCraftDeck(id));
    return;
  }
  if (build) {
    const id = build.getAttribute("data-build") as Heresy | null;
    if (!id) return;
    void unlockAudio();
    playSfx("ui-tap");
    openBuilder(id);
  }
});
document.getElementById("howto-back")!.addEventListener("click", () => closeHowto());
document.getElementById("howto-close")!.addEventListener("click", () => closeHowto());
document.getElementById("pause-howto")!.addEventListener("click", () => openHowto("pause"));
document.getElementById("codex-back")!.addEventListener("click", () => closeCodex());
document.getElementById("codex-prev")!.addEventListener("click", () => showCodexCard(codexIndex - 1));
document.getElementById("codex-next")!.addEventListener("click", () => showCodexCard(codexIndex + 1));
codexFilterEl.addEventListener("change", () => {
  const v = codexFilterEl.value;
  const filter: Heresy | "all" =
    v === "all" || v === "ink" || v === "motley" || v === "deal" || v === "shell" ? v : "all";
  applyCodexFilter(filter);
});
document.getElementById("btn-again")!.addEventListener("click", () => {
  if (spectatorMode) {
    if (lastSpectate.random) startRandomSpectate();
    else {
      const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
      startSpectateBots(lastSpectate.bottom, lastSpectate.top, { seed, random: false });
    }
    return;
  }
  if (state?.tutorial) startMatch(true);
  else if (lastConstructedDeck) startMatch(false, lastConstructedDeck);
  else openHeresyPick();
});
document.getElementById("btn-menu")!.addEventListener("click", () => goToMenu());

btnHudMenu.addEventListener("click", () => openPause());
btnHudSettings.addEventListener("click", () => openSettings("play"));
btnHudLog.addEventListener("click", () => toggleEventLog());
btnEventLogClose.addEventListener("click", () => closeEventLog());
document.getElementById("pause-resume")!.addEventListener("click", () => resumeMatch());
document.getElementById("pause-settings")!.addEventListener("click", () => openSettings("pause"));
document.getElementById("pause-menu")!.addEventListener("click", () => goToMenu());
document.getElementById("settings-back")!.addEventListener("click", () => closeSettings());
document.getElementById("settings-close")!.addEventListener("click", () => closeSettings());
settingsMotion.addEventListener("change", () => {
  const next: AppSettings = {
    reduceMotion: settingsMotion.checked,
    aiDifficulty: (settingsDifficulty.value as AiDifficulty) || "normal",
  };
  saveSettings(next);
  applySettings(next);
});
settingsDifficulty.addEventListener("change", () => {
  const next: AppSettings = {
    reduceMotion: settingsMotion.checked,
    aiDifficulty: (settingsDifficulty.value as AiDifficulty) || "normal",
  };
  saveSettings(next);
  applySettings(next);
});
settingsMuteSfx.addEventListener("change", () => {
  void unlockAudio();
  setMuted(settingsMuteSfx.checked);
});
settingsMuteMusic.addEventListener("change", () => {
  void unlockAudio();
  setMusicMuted(settingsMuteMusic.checked);
});

bindLiftInspect(
  codexFoil,
  () => codexIds[codexIndex] ?? null,
  cardInspect,
  () => cardInspect.open(codexIds[codexIndex]),
);

for (const hit of altHits) {
  const alt = Number(hit.dataset.alt) as Altitude;
  let lastPointerY = 0;
  let lastPointerX = 0;
  hit.addEventListener(
    "pointerdown",
    (ev) => {
      lastPointerY = ev.clientY;
      lastPointerX = ev.clientX;
    },
    { capture: true },
  );
  const boardSide = (): "player" | "enemy" => {
    const rect = hit.getBoundingClientRect();
    const topHalf = lastPointerY < rect.top + rect.height * 0.5;
    return topHalf ? "enemy" : "player";
  };
  /** Landmark tokens sit on the right of the gutter when a figure is present. */
  const preferSiteHit = (): boolean => {
    const rect = hit.getBoundingClientRect();
    return lastPointerX > rect.left + rect.width * 0.58;
  };
  const boardUnit = (): NonNullable<MatchState["altitudes"][0]["player"]> | null => {
    if (!state) return null;
    const slot = state.altitudes[alt];
    const side = boardSide();
    if (side === "enemy") return slot.enemy ?? slot.player;
    return slot.player ?? slot.enemy;
  };
  const boardSiteId = (): string | null => {
    if (!state) return null;
    const slot = state.altitudes[alt];
    const side = boardSide();
    if (side === "enemy") return slot.enemySite ?? (slot.enemy ? null : slot.playerSite);
    return slot.playerSite ?? (slot.player ? null : slot.enemySite);
  };
  const boardCardId = (): string | null => {
    if (!state) return null;
    const slot = state.altitudes[alt];
    const side = boardSide();
    const u = side === "enemy" ? slot.enemy : slot.player;
    const site = side === "enemy" ? slot.enemySite : slot.playerSite;
    const otherU = side === "enemy" ? slot.player : slot.enemy;
    const otherSite = side === "enemy" ? slot.playerSite : slot.enemySite;
    if (preferSiteHit() && site) return site;
    if (u) return u.cardId;
    if (site) return site;
    if (preferSiteHit() && otherSite) return otherSite;
    return otherU?.cardId ?? otherSite ?? null;
  };
  const openBoardInspect = (prefer?: "graft" | "inhabitant" | "site"): void => {
    const u = boardUnit();
    const siteId = boardSiteId();
    const id =
      prefer === "site"
        ? siteId
        : prefer === "graft" && u?.grafts[0]
          ? u.grafts[0].cardId
          : prefer === "inhabitant" && u?.inhabitant
            ? u.inhabitant
            : boardCardId();
    if (!id) return;
    const lines: string[] = [];
    const inspectingSite = getCard(id).type === "site" || getCard(id).type === "sigil";
    if (u && !inspectingSite) {
      lines.push(u.veiled ? "Veiled" : "Witnessed");
      const side = u === state!.altitudes[alt].player ? "player" : "enemy";
      const live = unitPower(state!, alt, side);
      const printed = printedFacePower(u);
      if (live !== printed) lines.push(`Power ${live} (printed ${printed})`);
      else lines.push(`Power ${live}`);
      if (u.veiled) {
        const def = getCard(u.cardId);
        if (def.type === "figure" || def.type === "vessel") {
          const wit = witnessCostAt(alt, def.witnessCost, side === "enemy");
          const label = side === "enemy" ? "Gaze" : "Witness";
          if (wit !== def.witnessCost) {
            lines.push(`${label} ${wit} Sight (printed ${def.witnessCost})`);
          } else {
            lines.push(`${label} ${wit} Sight`);
          }
        }
      }
      if (u.stanceB) lines.push("Stance B");
      if (u.strained) lines.push("Strained");
      if (u.stained) lines.push("Stained");
      if (u.inhabitant) lines.push("Has Inhabitant");
      if (u.grafts.length) lines.push(`${u.grafts.length} charm${u.grafts.length > 1 ? "s" : ""}`);
    } else if (inspectingSite) {
      lines.push("On this altitude");
    }
    const extras = {
      statusLines: lines,
      grafts: u?.grafts.map((g) => g.cardId),
      inhabitant: u?.inhabitant ?? null,
      hostId: inspectingSite ? u?.cardId : undefined,
      siteId: inspectingSite ? null : siteId,
    };
    if (prefer === "graft" && u?.grafts[0]) {
      cardInspect.open(u.grafts[0].cardId, { ...extras, hostId: u.cardId });
      return;
    }
    if (prefer === "inhabitant" && u?.inhabitant) {
      cardInspect.open(u.inhabitant, { ...extras, hostId: u.cardId });
      return;
    }
    if (prefer === "site" && siteId) {
      cardInspect.open(siteId, extras);
      return;
    }
    cardInspect.open(id, extras);
  };
  bindLiftInspect(hit, boardCardId, cardInspect, () => {
    if (drag?.active || drag?.dropping) return;
    if (tryAltitude(alt)) return;
    openBoardInspect();
  }, {
    openCard: () => openBoardInspect(),
  });
  hit.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    if (hit.classList.contains("disabled") || hit.getAttribute("aria-disabled") === "true") return;
    ev.preventDefault();
    if (tryAltitude(alt)) return;
    openBoardInspect();
  });
  for (const btn of hit.querySelectorAll<HTMLButtonElement>("[data-graft], [data-inh], [data-site]")) {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const prefer = btn.hasAttribute("data-site")
        ? "site"
        : btn.hasAttribute("data-graft")
          ? "graft"
          : "inhabitant";
      // Aim pointer at this side's strip
      const row = btn.closest(".alt-status");
      if (row?.classList.contains("foe")) {
        const rect = hit.getBoundingClientRect();
        lastPointerY = rect.top + 8;
        lastPointerX = rect.right - 8;
      } else {
        const rect = hit.getBoundingClientRect();
        lastPointerY = rect.bottom - 8;
        lastPointerX = rect.right - 8;
      }
      openBoardInspect(prefer);
    });
  }
}
// Swipe on codex face
let codexTouchX: number | null = null;
codexFace.addEventListener(
  "touchstart",
  (ev) => {
    codexTouchX = ev.changedTouches[0]?.clientX ?? null;
  },
  { passive: true },
);
codexFace.addEventListener(
  "touchend",
  (ev) => {
    if (codexTouchX == null) return;
    const x = ev.changedTouches[0]?.clientX ?? codexTouchX;
    const dx = x - codexTouchX;
    codexTouchX = null;
    if (Math.abs(dx) < 40) return;
    showCodexCard(codexIndex + (dx < 0 ? 1 : -1));
  },
  { passive: true },
);
btnWitness.addEventListener("click", () => {
  if (uiPaused) return;
  mode = mode === "witness" ? "play" : "witness";
  selectedHand = null;
  syncHud();
});

btnReveil.addEventListener("click", () => {
  if (uiPaused) return;
  mode = mode === "reveil" ? "play" : "reveil";
  selectedHand = null;
  syncHud();
});

btnStance.addEventListener("click", () => {
  if (uiPaused) return;
  mode = mode === "stance" ? "play" : "stance";
  selectedHand = null;
  syncHud();
});

btnWager.addEventListener("click", () => {
  if (uiPaused) return;
  mode = mode === "wager" ? "play" : "wager";
  selectedHand = null;
  syncHud();
});

btnPress.addEventListener("click", () => {
  if (uiPaused || !state) return;
  if (state.active !== "player" || state.pressUsed.player) return;
  selectedHand = null;
  const can = legalIntents(state).some((i) => i.kind === "press");
  if (!can) {
    mode = "press";
    showToast("Press needs a Veiled enemy with Stain (1 Sight) — or Motley Stance B (free).");
    syncHud();
    return;
  }
  mode = mode === "press" ? "play" : "press";
  syncHud();
});

btnPeal.addEventListener("click", () => {
  if (uiPaused) return;
  mode = mode === "peal" ? "play" : "peal";
  selectedHand = null;
  syncHud();
});

btnPass.addEventListener("click", () => {
  if (uiPaused) return;
  if (!state || state.active !== "player") return;
  playSfx("pass");
  const events = applyIntent(state, { kind: "pass" });
  mode = "play";
  selectedHand = null;
  afterPlayer(events);
});

coachCta.addEventListener("click", () => {
  if (uiPaused || !state || !state.tutorial) return;
  if (!isTutorialSoftPass(state.tutorialStep)) return;
  playSfx("ui-tap");
  cardInspect.close();
  const events = applyIntent(state, { kind: "pass" });
  mode = "play";
  selectedHand = null;
  afterPlayer(events);
});

window.addEventListener("pointermove", (ev) => {
  if (!drag || ev.pointerId !== drag.pointerId || drag.dropping) return;
  const dx = ev.clientX - drag.startX;
  const dy = ev.clientY - drag.startY;
  if (!drag.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    // Hold-to-inspect won ? don't steal the gesture into a drag
    if (cardInspect.isOpen()) {
      drag = null;
      return;
    }
    beginDragVisual(drag);
  }
  if (drag.active) {
    // Stop page scroll / bounce while dragging on iOS
    if (ev.cancelable) ev.preventDefault();
    moveDragGhost(ev.clientX, ev.clientY);
    const alt = altitudeAtPoint(ev.clientX, ev.clientY);
    for (const hit of altHits) {
      hit.classList.toggle("drop-target", alt !== null && Number(hit.dataset.alt) === alt);
    }
  }
}, { passive: false });

// Extra belt for older iOS that emits touchmove without pointermove
window.addEventListener(
  "touchmove",
  (ev) => {
    if (!drag?.active) return;
    if (ev.cancelable) ev.preventDefault();
  },
  { passive: false },
);

window.addEventListener("pointerup", (ev) => {
  void (async () => {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    if (drag.dropping) return;
    const wasDragging = drag.active;
    const handIndex = drag.handIndex;
    const alt = wasDragging ? altitudeAtPoint(ev.clientX, ev.clientY) : null;
    for (const hit of altHits) hit.classList.remove("drop-target");
    if (wasDragging && alt !== null) {
      drag.dropping = true;
      selectedHand = handIndex;
      mode = "play";
      skipNextSummonFly = true;
      const cardId = state?.hand[handIndex];
      const castExit = cardId && getCard(cardId).type === "rite" ? "cast" : "land";
      await animateDropToAltitude(alt, castExit);
      endDragVisual();
      tryAltitude(alt);
      return;
    }
    endDragVisual();
    if (wasDragging) {
      selectedHand = handIndex;
      syncHud();
    }
  })();
});

window.addEventListener("pointercancel", (ev) => {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  endDragVisual();
  syncHud();
});

canvas.addEventListener("pointerdown", (ev) => {
  if (uiPaused || drag?.active || drag?.dropping) return;
  if (!state || state.phase !== "play") return;
  const rect = canvas.getBoundingClientRect();
  const alt = stage.hitAltitude(ev.clientX - rect.left, ev.clientY - rect.top);
  if (alt !== null) tryAltitude(alt);
});

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps.tick(now);
  if (flashTimer > 0) {
    flashTimer -= dt * 1000;
    if (flashTimer <= 0 && state?.phase === "play") showToast(hint(state));
  }
  if (phaseTimer > 0) {
    phaseTimer -= dt * 1000;
    if (phaseTimer <= 0) hidePhaseBanner();
  }

  if (fps.fps < 28) {
    dprLowFrames += 1;
    dprHighFrames = 0;
  } else if (fps.fps > 52) {
    dprHighFrames += 1;
    dprLowFrames = 0;
  } else {
    dprLowFrames = 0;
    dprHighFrames = 0;
  }
  if (dprLowFrames > 40) {
    stage.setDprCap(1.25);
    dprLowFrames = 0;
  } else if (dprHighFrames > 90) {
    stage.setDprCap(2);
    dprHighFrames = 0;
  }

  stage.syncLanes(altHits);
  if (state && state.phase !== "menu") stage.draw(state, dt);
  else {
    stage.draw(
      {
        phase: "play",
        turn: 1,
        active: "player",
        passed: { player: false, enemy: false },
        stanceUsed: { player: false, enemy: false },
        reveilUsed: { player: false, enemy: false },
        wagerUsed: { player: false, enemy: false },
        pressUsed: { player: false, enemy: false },
        pealUsed: { player: false, enemy: false },
        soundTollPealBonus: { player: false, enemy: false },
        debtorBustDrawUsed: { player: false, enemy: false },
        falseHoldArmed: { player: false, enemy: false },
        falseFaceArmed: { player: false, enemy: false },
        mireSurgeArmed: { player: false, enemy: false },
        galaSurgeArmed: { player: false, enemy: false },
        encoreBuffAlt: { player: null, enemy: null },
        debtSurgeArmed: { player: false, enemy: false },
        mesaBuffAlt: { player: null, enemy: null },
        vesselSurgeArmed: { player: false, enemy: false },
        inkChoirBuff: { player: false, enemy: false },
        smotherTaxUsed: { player: false, enemy: false },
        tollOwner: [null, null, null],
        pealArmed: [false, false, false],
        walkerResonanceBuff: { player: false, enemy: false },
        pathBellmanBuff: { player: false, enemy: false },
        ropeAuditorTaxUsed: { player: false, enemy: false },
        fullBreachArmed: { player: false, enemy: false },
        breachDealtThisResolve: { player: 0, enemy: 0 },
        overexposeTakenThisResolve: { player: false, enemy: false },
        ashcoilBuff: { player: 0, enemy: 0 },
        skarothPowerArmed: { player: false, enemy: false },
        rivetCharmDrawUsed: { player: false, enemy: false },
        slagStrainDrawUsed: { player: false, enemy: false },
        altitudes: [
          { player: null, enemy: null, playerSite: null, enemySite: null, blinded: false },
          { player: null, enemy: null, playerSite: null, enemySite: null, blinded: false },
          { player: null, enemy: null, playerSite: null, enemySite: null, blinded: false },
        ],
        hand: [],
        enemyHand: [],
        deck: [],
        enemyDeck: [],
        prophecies: [],
        enemyProphecies: [],
        essence: 0,
        enemyEssence: 0,
        sight: 0,
        enemySight: 0,
        favor: 0,
        enemyFavor: 0,
        favorGainedThisTurn: { player: false, enemy: false },
        cashThisResolve: { player: 0, enemy: 0 },
        will: 15,
        enemyWill: 15,
        eclipse: 0,
        enemyEclipse: 0,
        witnessedHeresiesThisTurn: [],
        prophecyProgress: 0,
        winner: null,
        endReason: null,
        events: [],
        nextId: 0,
        tutorial: false,
        tutorialStep: "done",
        aiDifficulty: "normal",
      },
      dt,
    );
  }
  requestAnimationFrame(frame);
}

setMenuMode(true);
setMusicBed("menu");
armUnlockOnGesture();
syncHud();
const onViewportChange = (): void => {
  if (state?.tutorial && state.tutorialStep !== "done") syncTutorGuide(state);
  // Safari chrome show/hide changes layout without a window resize alone
  stage.syncLanes(altHits);
};
window.addEventListener("resize", onViewportChange);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", onViewportChange);
  window.visualViewport.addEventListener("scroll", onViewportChange);
}
void preloadCardChrome().then(() => {
  clearCardFaceCache();
  stage.invalidateCardTextures();
  codexBuilt = false;
  syncHud();
});
requestAnimationFrame(frame);
