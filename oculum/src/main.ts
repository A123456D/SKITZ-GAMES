import { chooseAiMove } from "./core/ai";
import { getCard } from "./core/cards";
import { catalogOrder } from "./core/catalog";
import { applyIntent, createMatch, lawSchoolProgress, legalIntents, unitPower } from "./core/match";
import {
  tutorialCoach,
  tutorialHint,
  tutorialSelectHandIndex,
  tutorialTeachCard,
  tutorialUiMode,
  isTutorialSoftPass,
} from "./core/tutorial";
import {
  START_WILL,
  type AiDifficulty,
  type Altitude,
  type Intent,
  type MatchState,
} from "./core/types";
import {
  FULL_CARD_IDS,
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
} from "./view/audio";
import { OculusStage } from "./view/gl/stage";
import { FpsSampler } from "./view/perf";
import { bindFoilStage, mountFoilCard } from "./view/foilCard";
import { CARD_SKINS_ENABLED } from "./view/skins";
import { hasArtLayers, setStackArtLayers } from "./view/cardLayers";
import { cardMetaHtml } from "./view/cardMeta";
import { bindLiftInspect, initCardInspect } from "./view/cardInspect";
import { initDeckBuilder } from "./view/deckBuilder";

const CODEX_IDS = catalogOrder(FULL_CARD_IDS);
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const menu = document.getElementById("menu")!;
const endPanel = document.getElementById("end")!;
const codexPanel = document.getElementById("codex")!;
const builderPanel = document.getElementById("deck-builder")!;
const inspectPanel = document.getElementById("card-inspect")!;
const pausePanel = document.getElementById("pause")!;
const settingsPanel = document.getElementById("settings")!;
const unsupported = document.getElementById("unsupported")!;
const toastEl = document.getElementById("toast")!;
const toastText = document.getElementById("toast-text")!;
const coachEl = document.getElementById("coach")!;
const coachTitle = document.getElementById("coach-title")!;
const coachBody = document.getElementById("coach-body")!;
const coachAction = document.getElementById("coach-action")!;
const dragLayer = document.getElementById("drag-layer")!;
const dragGhost = document.getElementById("drag-ghost")!;
const dragCardImg = document.getElementById("drag-card") as HTMLImageElement;
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
const btnWitness = document.getElementById("btn-witness") as HTMLButtonElement;
const btnStance = document.getElementById("btn-stance") as HTMLButtonElement;
const btnPass = document.getElementById("btn-pass") as HTMLButtonElement;
const codexFace = document.getElementById("codex-face") as HTMLImageElement;
const codexFoil = document.getElementById("codex-foil") as HTMLElement;
const codexMeta = document.getElementById("codex-meta")!;
const codexThumbs = document.getElementById("codex-thumbs")!;
const mEssence = document.getElementById("m-essence")!;
const mSight = document.getElementById("m-sight")!;
const mTurn = document.getElementById("m-turn")!;
const willYou = document.getElementById("will-you") as HTMLElement;
const willFoe = document.getElementById("will-foe") as HTMLElement;
const willYouN = document.getElementById("will-you-n")!;
const willFoeN = document.getElementById("will-foe-n")!;
const eclYou = document.getElementById("ecl-you")!;
const eclFoe = document.getElementById("ecl-foe")!;
const lawChip = document.getElementById("law-chip")!;
const lawProgress = document.getElementById("law-progress")!;
const altHits = Array.from(document.querySelectorAll<HTMLButtonElement>(".alt-hit"));

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
let mode: "play" | "witness" | "stance" = "play";

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
const DRAG_THRESHOLD = 12;
let last = performance.now();
const fps = new FpsSampler();
let flashTimer = 0;
let codexIndex = 0;
let codexBuilt = false;
/** Last constructed deck used for rematch (Teach / tutorial leave this null). */
let lastConstructedDeck: string[] | null = null;
/** DPR hysteresis — avoid buffer thrash flash when FPS oscillates. */
let dprLowFrames = 0;
let dprHighFrames = 0;
/** Pause / settings overlay — blocks match input & AI. */
let uiPaused = false;
type SettingsReturn = "menu" | "pause" | "play";
let settingsReturn: SettingsReturn = "menu";
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
  settingsDifficulty.value = s.aiDifficulty;
  settingsMuteSfx.checked = isMuted();
  settingsMuteMusic.checked = isMusicMuted();
}

applySettings(loadSettings());

function setMenuMode(on: boolean): void {
  document.body.classList.toggle("on-menu", on);
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
  cardInspect.close();
}

function goToMenu(): void {
  state = null;
  uiPaused = false;
  document.body.classList.remove("paused");
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
  cardInspect.close();
  settingsPanel.hidden = true;
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
  document.body.classList.remove("paused");
  setMenuMode(false);
  syncHud();
  if (state.active === "enemy") window.setTimeout(runEnemy, 320);
}

function openSettings(from: SettingsReturn): void {
  settingsReturn = from;
  settingsPanel.hidden = false;
  menu.hidden = true;
  pausePanel.hidden = true;
  codexPanel.hidden = true;
  builderPanel.hidden = true;
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

function showToast(msg: string | null): void {
  if (!msg) {
    toastEl.hidden = true;
    toastText.textContent = "";
    return;
  }
  toastEl.hidden = false;
  toastText.textContent = msg;
}

function flashToast(msg: string, ms = 1600): void {
  showToast(msg);
  flashTimer = ms;
}

function buildCodexThumbs(): void {
  if (codexBuilt) return;
  codexThumbs.innerHTML = "";
  CODEX_IDS.forEach((id, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "codex-thumb";
    if (CARD_SKINS_ENABLED && getCard(id).premium) btn.classList.add("is-premium");
    btn.dataset.index = String(i);
    const img = document.createElement("img");
    img.src = handCardSrc(id);
    img.alt = getCard(id).name;
    img.draggable = false;
    btn.appendChild(img);
    bindLiftInspect(btn, () => id, cardInspect, () => showCodexCard(i));
    codexThumbs.appendChild(btn);
  });
  codexBuilt = true;
}

function showCodexCard(index: number): void {
  const n = CODEX_IDS.length;
  codexIndex = ((index % n) + n) % n;
  const id = CODEX_IDS[codexIndex];
  const def = getCard(id);
  codexFace.src = handCardSrc(id);
  codexFace.alt = def.name;
  const useSkin = CARD_SKINS_ENABLED && !!def.premium;
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

function openCodex(): void {
  hideAllSheets();
  codexPanel.hidden = false;
  setMenuMode(true);
  buildCodexThumbs();
  showCodexCard(codexIndex);
}

function closeCodex(): void {
  codexPanel.hidden = true;
  menu.hidden = false;
  setMenuMode(true);
}

function openBuilder(): void {
  hideAllSheets();
  setMenuMode(true);
  deckBuilder.open();
}

function startMatch(tutorial: boolean, constructedDeck?: string[]): void {
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
  syncHud();
}

function syncCoach(s: MatchState | null): void {
  const coach = s?.tutorial && s.tutorialStep !== "done" ? tutorialCoach(s.tutorialStep) : null;
  if (!coach) {
    coachEl.hidden = true;
    return;
  }
  coachEl.hidden = false;
  coachTitle.textContent = coach.title;
  coachBody.textContent = coach.body;
  coachAction.textContent = coach.action;
}

function hint(s: MatchState): string {
  if (s.tutorial && s.tutorialStep !== "done") {
    return tutorialHint(s.tutorialStep);
  }
  if (s.active !== "player") return "Enemy turn — they act in the Gaze…";
  if (mode === "witness") {
    const intents = legalIntents(s);
    const canGaze = intents.some((i) => i.kind === "witness" && i.enemy);
    const canOwn = intents.some((i) => i.kind === "witness" && !i.enemy);
    if (canGaze && canOwn) return "Witness your Veiled, or GAZE lanes to steal theirs.";
    if (canGaze) return "GAZE: tap a marked altitude to Witness their card.";
    return "Tap an altitude to Witness your Veiled card.";
  }
  if (mode === "stance") return "Tap a Third Face figure — A printed / B swapped powers.";
  if (selectedHand !== null) {
    const def = getCard(s.hand[selectedHand]);
    if (def.type === "rite") return "Drag onto an altitude to Blind.";
    if (def.type === "relic") return "Drag onto a Figure lane to Graft.";
    if (def.type === "site" || def.type === "sigil") return "Drag this landmark onto an altitude.";
    return "Drag onto High, Mid, or Low — or tap a lane.";
  }
  const lawN = lawSchoolProgress(s);
  if (s.prophecies.includes("unblinking_law") && lawN >= 3) {
    return "Unblinking Law ready — Pass for +2 Eclipse.";
  }
  if (s.prophecies.includes("unblinking_law") && lawN > 0) {
    return `Law ${lawN}/3 schools Witnessed — or select a card.`;
  }
  return "Select a card — or Witness / Stance / Pass.";
}

function syncHud(): void {
  const inMatch = !!(state && state.phase === "play" && !uiPaused && pausePanel.hidden && settingsPanel.hidden);
  btnHudMenu.hidden = !(state && state.phase === "play");
  btnHudSettings.hidden = !(state && state.phase === "play");
  const boardTarget = inMatch && (mode === "witness" || mode === "stance");
  document.body.classList.toggle("board-target", boardTarget);

  if (!state || state.phase !== "play") {
    handEl.innerHTML = "";
    handArea.hidden = true;
    actionsEl.hidden = true;
    metersEl.hidden = true;
    willrowEl.hidden = true;
    btnWitness.disabled = true;
    btnStance.disabled = true;
    btnPass.disabled = true;
    document.body.classList.remove("board-target");
    setEnemyTurn(false);
    for (const hit of altHits) {
      hit.disabled = true;
      hit.classList.add("disabled");
      hit.setAttribute("aria-disabled", "true");
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
    // Paused / settings — keep meters, hide interactive play chrome
    btnWitness.disabled = true;
    btnStance.disabled = true;
    btnPass.disabled = true;
    handEl.innerHTML = "";
    for (const hit of altHits) {
      const alt = Number(hit.dataset.alt) as Altitude;
      const pow = hit.querySelector(".alt-pow-n") ?? hit.querySelector(".alt-pow");
      if (pow) pow.textContent = `${unitPower(state, alt, "player")}–${unitPower(state, alt, "enemy")}`;
      hit.disabled = true;
      hit.classList.add("disabled");
      hit.classList.remove("legal");
    }
    mEssence.textContent = String(state.essence);
    mSight.textContent = String(state.sight);
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
  mSight.textContent = String(state.sight);
  mTurn.textContent = String(state.turn);
  willYouN.textContent = String(state.will);
  willFoeN.textContent = String(state.enemyWill);
  willYou.style.transform = `scaleX(${Math.max(0, state.will / START_WILL)})`;
  willFoe.style.transform = `scaleX(${Math.max(0, state.enemyWill / START_WILL)})`;
  eclYou.textContent = String(state.eclipse);
  eclFoe.textContent = String(state.enemyEclipse);

  const hasLaw = state.prophecies.includes("unblinking_law");
  lawChip.hidden = !hasLaw;
  if (hasLaw) {
    const n = Math.min(3, lawSchoolProgress(state));
    lawProgress.textContent = `${n}/3`;
    lawChip.classList.toggle("ready", n >= 3 && state.active === "player");
  }

  if (flashTimer <= 0) {
    if (state.tutorial && state.tutorialStep !== "done") showToast(null);
    else showToast(hint(state));
  }
  syncCoach(state);

  const intents = legalIntents(state);

  for (const hit of altHits) {
    const alt = Number(hit.dataset.alt) as Altitude;
    const pow = hit.querySelector(".alt-pow-n") ?? hit.querySelector(".alt-pow");
    const stanceEl = hit.querySelector(".alt-stance");
    const pp = unitPower(state, alt, "player");
    const ep = unitPower(state, alt, "enemy");
    if (pow) pow.textContent = `${pp}–${ep}`;
    const u = state.altitudes[alt].player;
    const canGazeHere = intents.some((i) => i.kind === "witness" && i.enemy && i.altitude === alt);
    hit.classList.toggle("has-unit", !!u);
    hit.classList.toggle("veiled-unit", !!u?.veiled);
    hit.classList.toggle("gaze-ready", canGazeHere);
    if (stanceEl) {
      const third = !!(u && (u.hasThirdFace || state.altitudes[alt].playerSite === "third_face"));
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
  const canStance = intents.some((i) => i.kind === "stance");
  const canPass = intents.some((i) => i.kind === "pass");
  btnWitness.disabled = state.active !== "player" || !canWitness;
  btnStance.disabled = state.active !== "player" || !canStance;
  btnPass.disabled = state.active !== "player" || !canPass;
  btnWitness.classList.toggle("selected", mode === "witness");
  btnStance.classList.toggle("selected", mode === "stance");
  const teachWitness =
    state.tutorial &&
    (state.tutorialStep === "witness" || state.tutorialStep === "gaze" || state.tutorialStep === "law");
  const teachStance = state.tutorial && state.tutorialStep === "stance";
  const teachPass =
    state.tutorial &&
    (state.tutorialStep === "intro" ||
      state.tutorialStep === "goal" ||
      state.tutorialStep === "read" ||
      state.tutorialStep === "resolve");
  btnWitness.classList.toggle(
    "pulse",
    canWitness &&
      state.active === "player" &&
      (teachWitness || (!state.tutorial && mode !== "witness")),
  );
  btnStance.classList.toggle("pulse", teachStance && canStance);
  btnPass.classList.toggle("pulse", teachPass && canPass);
  const passLabel = btnPass.querySelector(".btn-label");
  if (passLabel) {
    if (state.tutorial && isTutorialSoftPass(state.tutorialStep)) {
      passLabel.innerHTML = '<span class="btn-kicker">OK</span>Got it';
    } else {
      passLabel.innerHTML = '<span class="btn-kicker">End</span>Pass';
    }
  }

  for (const hit of altHits) {
    const alt = Number(hit.dataset.alt) as Altitude;
    let legal = false;
    if (state.active === "player") {
      if (mode === "witness") {
        legal = intents.some((i) => i.kind === "witness" && i.altitude === alt);
      } else if (mode === "stance") {
        legal = intents.some((i) => i.kind === "stance" && i.altitude === alt);
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
    hit.disabled = false;
    hit.classList.toggle("disabled", !legal);
    hit.setAttribute("aria-disabled", legal ? "false" : "true");
    hit.classList.toggle("legal", legal);
  }

  handEl.innerHTML = "";
  handEl.dataset.n = String(state.hand.length);
  state.hand.forEach((id, index) => {
    const def = getCard(id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hand-card";
    btn.dataset.slot = String(index);
    btn.style.setProperty("--i", String(index));
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
    img.width = 78;
    img.height = 117;
    img.src = handCardSrc(id);
    btn.appendChild(img);
    mountFoilCard(img, { premium: !!def.premium });
    btn.title = `${def.name} · ${def.essence}E · drag to an altitude or tap to inspect`;
    if (canSelect) {
      btn.addEventListener("pointerdown", (ev) => {
        if (ev.button != null && ev.button !== 0) return;
        if (uiPaused || drag?.dropping) return;
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
        playSfx("select");
        highlightAltitudesForHand(index);
        for (const el of handEl.querySelectorAll(".hand-card")) {
          el.classList.toggle("selected", el === btn);
        }
        if (flashTimer <= 0) showToast("Drag onto HIGH / MID / LOW — or tap to inspect.");
      });
    }
    bindLiftInspect(
      btn,
      () => id,
      cardInspect,
      () => {
        if (drag?.active || drag?.dropping) return;
        playSfx("select");
        if (!canSelect) return;
        selectedHand = index;
        mode = "play";
        window.requestAnimationFrame(() => syncHud());
      },
      { inspectOnTap: true },
    );
    handEl.appendChild(btn);
  });
}

function narrateEvents(events: ReturnType<typeof applyIntent>): void {
  for (const ev of events) {
    if (ev.type === "witness") {
      const def = getCard(ev.cardId);
      playSfx(ev.enemyTarget ? "gaze" : "witness");
      flashToast(ev.enemyTarget ? `Gaze — Witnessed their ${def.name}!` : `Witnessed — ${def.name}!`, 1400);
      // Witness pulse is GPU-only — CSS filter on #stage causes tear/flash bands
    } else if (ev.type === "stance") {
      playSfx("stance");
      flashToast(ev.stanceB ? "Stance B — powers swapped" : "Stance A — printed powers", 1200);
    } else if (ev.type === "law") {
      playSfx("law");
      flashToast(`Unblinking Law — +${ev.eclipseGain} Eclipse`, 1800);
    } else if (ev.type === "resolve") {
      const { player, enemy } = ev.damages;
      playSfx("resolve");
      if (player || enemy) flashToast(`Resolve — you ${enemy} · foe ${player}`, 1800);
      else flashToast("Resolve — no damage", 1200);
    } else if (ev.type === "turn" && ev.side === "enemy") {
      playSfx("enemy");
      flashToast("Enemy turn", 900);
    } else if (ev.type === "turn" && ev.side === "player" && ev.turn > 1) {
      flashToast(`Your turn ${ev.turn}`, 900);
    }
  }
}

function afterPlayer(events: ReturnType<typeof applyIntent>): void {
  stage.onEvents(events);
  narrateEvents(events);
  if (state?.tutorial && state.tutorialStep !== "done") {
    const um = tutorialUiMode(state.tutorialStep);
    if (um) mode = um;
    else mode = "play";
    selectedHand = tutorialSelectHandIndex(state);
  }
  syncHud();
  if (state?.tutorial && state.tutorialStep === "read" && state.hand[0]) {
    cardInspect.open(state.hand[0]);
  } else if (state?.tutorial && state.tutorialStep === "play") {
    cardInspect.close();
  }
  if (state!.winner != null) {
    showEnd();
    return;
  }
  if (state!.active === "enemy" && !uiPaused) window.setTimeout(runEnemy, 420);
}

function runEnemy(): void {
  if (uiPaused) return;
  if (!state || state.phase !== "play" || state.active !== "enemy") return;
  let guard = 12;
  const step = (): void => {
    if (uiPaused) return;
    if (!state || state.phase !== "play" || state.active !== "enemy" || guard-- <= 0) {
      syncHud();
      if (state?.winner != null) showEnd();
      return;
    }
    const intent = chooseAiMove(state);
    const events = applyIntent(state, intent);
    stage.onEvents(events);
    narrateEvents(events);
    syncHud();
    if (state.winner != null) {
      showEnd();
      return;
    }
    if (state.active === "enemy") {
      window.setTimeout(step, intent.kind === "pass" ? 260 : 340);
    }
  };
  step();
}

function showEnd(): void {
  if (state?.winner === "player") playSfx("win");
  else playSfx("lose");
  if (!state) return;
  uiPaused = false;
  hideAllSheets();
  endPanel.hidden = false;
  setMenuMode(true);
  setEnemyTurn(false);
  const w = state.winner;
  endTitle.textContent = w === "player" ? "You Ascend" : w === "enemy" ? "Sight Lost" : "Stalemate";
  endDetail.textContent = `${state.endReason?.toUpperCase()} · Will ${state.will}–${state.enemyWill} · Eclipse ${state.eclipse}–${state.enemyEclipse}`;
  handEl.innerHTML = "";
  actionsEl.hidden = true;
  btnWitness.disabled = true;
  btnStance.disabled = true;
  btnPass.disabled = true;
  syncHud();
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
  dragGhost.classList.remove("is-dropping");
  dragGhost.style.transition = "";
  dragGhost.style.transform = "";
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

function animateDropToAltitude(alt: Altitude): Promise<void> {
  return new Promise((resolve) => {
    const hit = altHits.find((h) => Number(h.dataset.alt) === alt);
    if (!hit || document.body.classList.contains("reduce-motion")) {
      resolve();
      return;
    }
    const r = hit.getBoundingClientRect();
    const tx = r.left + r.width / 2;
    const ty = r.top + r.height * 0.38;
    dragGhost.classList.add("is-dropping");
    dragGhost.style.transition =
      "left 0.24s cubic-bezier(0.18, 0.9, 0.22, 1), top 0.24s cubic-bezier(0.18, 0.9, 0.22, 1), transform 0.24s cubic-bezier(0.18, 0.9, 0.22, 1), filter 0.24s ease";
    void dragGhost.offsetWidth;
    dragGhost.style.left = `${tx}px`;
    dragGhost.style.top = `${ty}px`;
    dragGhost.style.transform = "translate(-50%, -50%) scale(0.38) rotate(0deg)";
    dragGhost.style.filter = "drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35))";
    window.setTimeout(() => resolve(), 250);
  });
}

function tryAltitude(alt: Altitude): boolean {
  if (uiPaused) return false;
  if (!state || state.phase !== "play" || state.active !== "player") return false;
  const intents = legalIntents(state);
  let intent: Intent | undefined;

  if (mode === "witness") {
    const own = intents.find((i) => i.kind === "witness" && i.altitude === alt && !i.enemy);
    const gaze = intents.find((i) => i.kind === "witness" && i.altitude === alt && i.enemy);
    // Own Veiled first; after they're Witnessed, same altitude Gaze becomes available.
    intent = own ?? gaze;
  } else if (mode === "stance") {
    intent = intents.find((i) => i.kind === "stance" && i.altitude === alt);
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
  if (intent.kind === "play") playSfx("play");
  else if (intent.kind === "graft") playSfx("graft");
  else if (intent.kind === "rite") playSfx("rite");
  else if (intent.kind === "stance") playSfx("stance");
  const events = applyIntent(state, intent);
  selectedHand = null;
  mode = "play";
  afterPlayer(events);
  return true;
}

const unlockAnd = (fn: () => void) => () => {
  void unlockAudio();
  playSfx("ui-tap");
  fn();
};
document.getElementById("btn-play")!.addEventListener("click", unlockAnd(() => startMatch(false)));
document.getElementById("btn-tutorial")!.addEventListener("click", unlockAnd(() => startMatch(true)));
document.getElementById("btn-codex")!.addEventListener("click", () => openCodex());
document.getElementById("btn-builder")!.addEventListener("click", () => openBuilder());
document.getElementById("btn-settings")!.addEventListener("click", () => openSettings("menu"));
document.getElementById("codex-close")!.addEventListener("click", () => closeCodex());
document.getElementById("codex-back")!.addEventListener("click", () => closeCodex());
document.getElementById("codex-prev")!.addEventListener("click", () => showCodexCard(codexIndex - 1));
document.getElementById("codex-next")!.addEventListener("click", () => showCodexCard(codexIndex + 1));
document.getElementById("btn-again")!.addEventListener("click", () => {
  if (state?.tutorial) startMatch(true);
  else if (lastConstructedDeck) startMatch(false, lastConstructedDeck);
  else startMatch(false);
});
document.getElementById("btn-menu")!.addEventListener("click", () => goToMenu());

btnHudMenu.addEventListener("click", () => openPause());
btnHudSettings.addEventListener("click", () => openSettings("play"));
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
  () => CODEX_IDS[codexIndex] ?? null,
  cardInspect,
  () => cardInspect.open(CODEX_IDS[codexIndex]),
);

for (const hit of altHits) {
  const alt = Number(hit.dataset.alt) as Altitude;
  const boardCardId = (): string | null => {
    if (!state) return null;
    const slot = state.altitudes[alt];
    return slot.player?.cardId ?? slot.enemy?.cardId ?? slot.playerSite ?? slot.enemySite ?? null;
  };
  bindLiftInspect(hit, boardCardId, cardInspect, () => {
    if (drag?.active || drag?.dropping) return;
    if (tryAltitude(alt)) return;
    const id = boardCardId();
    if (id) cardInspect.open(id);
  });
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

btnStance.addEventListener("click", () => {
  if (uiPaused) return;
  mode = mode === "stance" ? "play" : "stance";
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

window.addEventListener("pointermove", (ev) => {
  if (!drag || ev.pointerId !== drag.pointerId || drag.dropping) return;
  const dx = ev.clientX - drag.startX;
  const dy = ev.clientY - drag.startY;
  if (!drag.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    beginDragVisual(drag);
  }
  if (drag.active) {
    moveDragGhost(ev.clientX, ev.clientY);
    const alt = altitudeAtPoint(ev.clientX, ev.clientY);
    for (const hit of altHits) {
      hit.classList.toggle("drop-target", alt !== null && Number(hit.dataset.alt) === alt);
    }
  }
});

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
      await animateDropToAltitude(alt);
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
        will: 15,
        enemyWill: 15,
        eclipse: 0,
        enemyEclipse: 0,
        witnessedSchoolsThisTurn: [],
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
syncHud();
void preloadCardChrome().then(() => {
  clearCardFaceCache();
  stage.invalidateCardTextures();
  codexBuilt = false;
  syncHud();
});
requestAnimationFrame(frame);
