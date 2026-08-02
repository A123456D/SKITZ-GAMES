import {
  aiIntentLabel,
  applyAiMove,
  chooseAiMove,
  forecastThreat,
  pickEnemyFaction,
  type AiMove,
} from "./core/ai";
import {
  beamColorForTint,
  grantMatchReward,
  loadMeta,
  markDailyCtaSeen,
  markShowcaseSeen,
  type MatchReward,
} from "./core/meta";
import { campaignNode, nextCampaignNode } from "./core/campaign";
import { buildDailyChallenge, formatShareCard, loadDailyRecord } from "./core/daily";
import {
  advanceTutorialIntro,
  createMenuState,
  finishCascade,
  mulligan,
  openCampaignMap,
  playCard,
  passTurn,
  previewPlay,
  scores,
  signatureHint,
  startCampaignNode,
  startDaily,
  startMatch,
  startShowcaseMatch,
  startTutorial,
  tickTimer,
  tutorialHint,
  type FactionKey,
  type PlayPreview,
} from "./core/match";
import type { CascadeEvent, MatchState, Pos } from "./core/types";
import { musicBedForPhase, resumeAudio, setMusicBed, sfx, syncMusic } from "./view/audio";
import {
  getFunnelRates,
  getFunnelStats,
  setAnalyticsEnabled,
  track,
  trackFirstAction,
} from "./view/analytics";
import { CascadePlayer } from "./view/cascadePlayer";
import { preloadCardArt } from "./view/cardArt";
import {
  cellCenter,
  computeLayout,
  drawFrame,
  hitChrome,
  hitEndScreen,
  hitHand,
  hitMenu,
  hitMulligan,
  hitPass,
  hitPause,
  hitSettings,
  hitSkipTutorial,
  hitTutorialNext,
  hitTile,
  type DragState,
  type UiOverlay,
} from "./view/draw";
import { Motion } from "./view/motion";
import { cycleDifficulty, getPrefs, togglePref } from "./view/prefs";
import { H, W, theme } from "./view/theme";
import { preloadUiArt } from "./view/uiArt";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const layout = computeLayout();
const motion = new Motion();
const cascadePlayer = new CascadePlayer();

let state: MatchState = createMenuState();
let selectedHand: number | null = null;
let inspected: {
  defId: string;
  power?: number;
  owner?: "player" | "enemy" | null;
} | null = null;
let hoverTile: Pos | null = null;
let overlay: UiOverlay = "none";
let overlayReturn: UiOverlay = "none";
let howtoFlash = 0;
let aiDelay = 0;
let lastT = performance.now();
let endedSfx = false;
let captureTipLife = 0;
let captureTipArmed = false;
let lastFaction: FactionKey = "volt";
let lastCampaignNode: string | null = null;
let endReward: MatchReward | null = null;
let replayingChain = false;
let replayStarted = false;
let aiIntent: string | null = null;
let pendingAiMove: AiMove | null = null;
let shareCopied = false;
/** After tutorial complete/skip — next faction pick starts a showcase match. */
let pendingShowcase = false;

function matchDifficulty() {
  return state.aiDifficulty ?? getPrefs().difficulty;
}

function nextNodeIdForEnd(): string | null {
  if (state.mode !== "campaign" || state.winner !== "player" || !state.campaignNodeId) {
    return null;
  }
  return nextCampaignNode(state.campaignNodeId)?.id ?? null;
}

function dailySummaryForUi() {
  if (state.mode !== "daily" || !state.dailyKey) return null;
  const rec = loadDailyRecord(state.dailyKey);
  const daily = buildDailyChallenge(state.dailyKey);
  const sc = scores(state);
  const shareLine =
    rec?.shareLine ??
    formatShareCard({
      key: state.dailyKey,
      title: daily.title,
      score: sc.player,
      chain: state.maxChainDepth,
      cleared: state.winner === "player",
    });
  return {
    shareLine,
    bestScore: rec?.bestScore ?? sc.player,
    bestChain: rec?.bestChain ?? state.maxChainDepth,
    streak: loadMeta().dailyStreak,
    copied: shareCopied,
  };
}

/** Pointer tracking for drag-and-drop */
let pointerId: number | null = null;
let drag: DragState | null = null;
let pressHand: number | null = null;
let pressX = 0;
let pressY = 0;
let pressWasSelected = false;
const DRAG_THRESHOLD = 14;

void Promise.all([preloadCardArt(), preloadUiArt()]);
setAnalyticsEnabled(getPrefs().analytics);
track("session_open", { path: location.pathname });

function playSfx(fn: () => void): void {
  if (getPrefs().sfx) fn();
}

function noteMatchStart(mode: string, faction?: string): void {
  track("match_start", { mode, faction: faction ?? null });
}

function activeBeamColor(): string {
  const tint = loadMeta().cosmetics.beamTint;
  return beamColorForTint(tint, theme.player);
}

function showDailyCta(): boolean {
  if (state.mode !== "versus") return false;
  // Showcase always sells Daily (win or lose); otherwise only after a versus win once.
  if (state.showcase) return true;
  if (state.winner !== "player") return false;
  return !loadMeta().seenDailyCta;
}

function beginFactionPickFromTutorial(): void {
  pendingShowcase = true;
  state = createMenuState();
  state.phase = "faction_pick";
  selectedHand = null;
  clearDrag();
  resetSessionFlags();
}

function startVersusForFaction(faction: FactionKey): void {
  const enemy = pickEnemyFaction(faction);
  lastFaction = faction;
  const useShowcase = pendingShowcase || !loadMeta().seenShowcase;
  pendingShowcase = false;
  if (useShowcase) {
    state = startShowcaseMatch(faction, enemy);
    markShowcaseSeen();
    track("first_match_start", { faction, showcase: true });
  } else {
    state = startMatch(faction, enemy);
  }
  resetSessionFlags();
  track("faction_pick", { faction });
  noteMatchStart("versus", faction);
  playSfx(sfx.place);
}

function resetSessionFlags(): void {
  endedSfx = false;
  selectedHand = null;
  inspected = null;
  clearDrag();
  captureTipLife = 0;
  captureTipArmed = false;
  endReward = null;
  replayingChain = false;
  replayStarted = false;
  aiIntent = null;
  pendingAiMove = null;
  shareCopied = false;
}

function beginBestChainReplay(): void {
  if (replayStarted) return;
  replayStarted = true;
  const events = state.bestCascade;
  if (!events.length || getPrefs().reducedFx || events.length < 3) {
    replayingChain = false;
    return;
  }
  replayingChain = true;
  cascadePlayer.start(events, {
    reduced: false,
    hideSkip: true,
    stepDelay: 0.14,
    beamColor: activeBeamColor(),
    onComplete: () => {
      replayingChain = false;
    },
  });
}

function rematch(): void {
  if (cascadePlayer.playing) cascadePlayer.skip();
  track("rematch", { mode: state.mode, wasShowcase: state.showcase });
  if (state.mode === "daily") {
    state = startDaily(state.dailyKey ?? undefined);
  } else if (state.mode === "campaign" && lastCampaignNode) {
    state = startCampaignNode(lastCampaignNode);
  } else if (state.mode === "tutorial") {
    state = startTutorial();
  } else {
    // Rematch after showcase uses a normal random versus — not the script again.
    state = startMatch(lastFaction, pickEnemyFaction(lastFaction));
  }
  resetSessionFlags();
  noteMatchStart(state.mode, state.players.player.faction);
  playSfx(sfx.place);
}

function tutorialLine(): string | null {
  if (!state.tutorial || state.phase === "match_over") return null;
  return tutorialHint(state)?.line ?? null;
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const stage = canvas.parentElement!;
  const sw = stage.clientWidth;
  const sh = stage.clientHeight;
  const scale = Math.min(sw / W, sh / H);
  const cssW = Math.floor(W * scale);
  const cssH = Math.floor(H * scale);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Instant FX for AI / reduced paths (no turn deferral). */
function playCascadeFx(events: CascadeEvent[]): void {
  const reduced = getPrefs().reducedFx;
  const beamCol = activeBeamColor();
  for (const e of events) {
    if (e.type === "beam") {
      const from = cellCenter(layout, e.beam.from);
      let to = from;
      if (e.beam.to) {
        to = cellCenter(layout, e.beam.to);
      } else {
        const reach = 180;
        if (e.beam.dir === "up") to = { x: from.x, y: from.y - reach };
        if (e.beam.dir === "down") to = { x: from.x, y: from.y + reach };
        if (e.beam.dir === "left") to = { x: from.x - reach, y: from.y };
        if (e.beam.dir === "right") to = { x: from.x + reach, y: from.y };
      }
      motion.spawnBeam(from.x, from.y, to.x, to.y, beamCol, 0.4, 3 + e.beam.step);
      playSfx(() => sfx.beamStep(e.beam.step));
    }
    if (e.type === "capture" && e.pos) {
      const c = cellCenter(layout, e.pos);
      motion.captureBlast(c.x, c.y, beamCol, reduced);
      playSfx(sfx.capture);
    }
    if (e.type === "fire" && e.step >= 3) {
      motion.chainPulse(e.step, beamCol);
      playSfx(() => sfx.chain(e.step));
    }
    if (e.type === "damage" && e.pos && !reduced) {
      const c = cellCenter(layout, e.pos);
      motion.burst(c.x, c.y, theme.enemy, 6);
    }
  }
}

function beginPlayerCascade(events: CascadeEvent[]): void {
  const hadCapture = events.some((e) => e.type === "capture");
  if (hadCapture && !captureTipArmed) {
    captureTipArmed = true;
    captureTipLife = 4.5;
  }

  if (events.length === 0 || getPrefs().reducedFx) {
    playCascadeFx(events);
    finishCascade(state);
    return;
  }

  cascadePlayer.start(events, {
    reduced: false,
    beamColor: activeBeamColor(),
    onComplete: () => {
      finishCascade(state);
    },
  });
}

function canvasPos(ev: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / rect.width) * W,
    y: ((ev.clientY - rect.top) / rect.height) * H,
  };
}

function clearDrag(): void {
  drag = null;
  pressHand = null;
  pointerId = null;
}

function tryPlay(handIndex: number, tile: Pos): boolean {
  if (state.cascadePending || cascadePlayer.playing) return false;
  const result = playCard(state, handIndex, tile, { deferTurn: true });
  if (result.ok) {
    trackFirstAction("play", state.round);
    playSfx(sfx.place);
    selectedHand = null;
    clearDrag();
    if (result.signatureVerb) {
      cascadePlayer.announce(
        `SIGNATURE: ${result.signatureVerb}`,
        "Syndicate verb resolved",
        theme.gridPurple,
        1.15,
      );
    }
    beginPlayerCascade(result.events);
    return true;
  }
  return false;
}

function currentPreview(): { preview: PlayPreview | null; pos: Pos | null } {
  const handIndex = drag?.active ? drag.handIndex : selectedHand;
  if (handIndex === null || handIndex === undefined) return { preview: null, pos: null };
  if (!hoverTile) return { preview: null, pos: null };
  if (state.phase !== "playing") return { preview: null, pos: null };
  return {
    preview: previewPlay(state, handIndex, hoverTile),
    pos: hoverTile,
  };
}

function onPointerDown(ev: PointerEvent): void {
  resumeAudio();
  const { x, y } = canvasPos(ev);

  if (cascadePlayer.playing) {
    if (cascadePlayer.hitSkip(x, y, W, H)) {
      cascadePlayer.skip();
      playSfx(sfx.select);
    }
    return;
  }

  if (inspected) {
    inspected = null;
    playSfx(sfx.select);
    return;
  }

  if (overlay === "settings") {
    const hit = hitSettings(x, y);
    if (hit === "sfx") {
      togglePref("sfx");
      playSfx(sfx.select);
      return;
    }
    if (hit === "music") {
      togglePref("music");
      syncMusic();
      playSfx(sfx.select);
      return;
    }
    if (hit === "timer") {
      togglePref("timer");
      playSfx(sfx.select);
      return;
    }
    if (hit === "fx") {
      togglePref("reducedFx");
      playSfx(sfx.select);
      return;
    }
    if (hit === "difficulty") {
      cycleDifficulty();
      playSfx(sfx.select);
      return;
    }
    if (hit === "analytics") {
      togglePref("analytics");
      setAnalyticsEnabled(getPrefs().analytics);
      playSfx(sfx.select);
      return;
    }
    if (hit === "close") {
      overlay = overlayReturn;
      overlayReturn = "none";
      playSfx(sfx.select);
      return;
    }
    return;
  }

  if (overlay === "pause") {
    const hit = hitPause(x, y);
    if (hit === "resume") {
      overlay = "none";
      playSfx(sfx.select);
      return;
    }
    if (hit === "settings") {
      overlayReturn = "pause";
      overlay = "settings";
      playSfx(sfx.select);
      return;
    }
    if (hit === "main") {
      overlay = "none";
      state = createMenuState();
      selectedHand = null;
      clearDrag();
      captureTipLife = 0;
      captureTipArmed = false;
      playSfx(sfx.select);
      return;
    }
    if (hit === "howto") {
      howtoFlash = 4;
      playSfx(sfx.select);
      return;
    }
    return;
  }

  const chrome = hitChrome(x, y, state);
  if (chrome === "menu") {
    overlay = "pause";
    clearDrag();
    playSfx(sfx.select);
    return;
  }
  if (chrome === "settings") {
    overlayReturn = "none";
    overlay = "settings";
    clearDrag();
    playSfx(sfx.select);
    return;
  }

  if (state.phase === "menu" || state.phase === "faction_pick" || state.phase === "campaign_map") {
    const hit = hitMenu(x, y, state);
    if (hit === "play") {
      state.phase = "faction_pick";
      playSfx(sfx.select);
      return;
    }
    if (hit === "campaign") {
      state = openCampaignMap();
      playSfx(sfx.select);
      return;
    }
    if (hit === "daily") {
      state = startDaily();
      lastFaction = state.players.player.faction as FactionKey;
      resetSessionFlags();
      track("daily_start", { key: state.dailyKey });
      noteMatchStart("daily", lastFaction);
      playSfx(sfx.place);
      return;
    }
    if (hit === "tutorial") {
      state = startTutorial();
      lastFaction = "volt";
      resetSessionFlags();
      track("tutorial_start");
      noteMatchStart("tutorial", "volt");
      playSfx(sfx.place);
      return;
    }
    if (hit === "settings") {
      overlay = "settings";
      playSfx(sfx.select);
      return;
    }
    if (hit === "campaign_back") {
      state = createMenuState();
      playSfx(sfx.select);
      return;
    }
    if (hit?.startsWith("node:")) {
      const id = hit.slice(5);
      lastCampaignNode = id;
      state = startCampaignNode(id);
      lastFaction = state.players.player.faction as FactionKey;
      resetSessionFlags();
      track("campaign_start", { node: id });
      noteMatchStart("campaign", lastFaction);
      playSfx(sfx.place);
      return;
    }
    if (hit === "volt" || hit === "prismatic" || hit === "void") {
      startVersusForFaction(hit);
      return;
    }
  }

  if (state.phase === "match_over") {
    const hit = hitEndScreen(x, y, state, {
      showDailyCta: showDailyCta(),
      replaying: replayingChain,
      nextCampaignNodeId: nextNodeIdForEnd(),
    });
    if (hit === "play_match") {
      beginFactionPickFromTutorial();
      playSfx(sfx.select);
      return;
    }
    if (hit === "rematch") {
      rematch();
      return;
    }
    if (hit === "share" && state.dailyKey) {
      const summary = dailySummaryForUi();
      if (summary?.shareLine && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(summary.shareLine).then(() => {
          shareCopied = true;
        });
      }
      shareCopied = true;
      playSfx(sfx.select);
      return;
    }
    if (hit === "daily") {
      markDailyCtaSeen();
      state = startDaily();
      lastFaction = state.players.player.faction as FactionKey;
      resetSessionFlags();
      track("daily_start", { key: state.dailyKey, from: "end_cta" });
      noteMatchStart("daily", lastFaction);
      playSfx(sfx.place);
      return;
    }
    if (hit === "next") {
      const id = nextNodeIdForEnd();
      if (id) {
        lastCampaignNode = id;
        state = startCampaignNode(id);
        lastFaction = state.players.player.faction as FactionKey;
        resetSessionFlags();
        track("campaign_start", { node: id, from: "next" });
        noteMatchStart("campaign", lastFaction);
        playSfx(sfx.place);
      }
      return;
    }
    if (hit === "campaign") {
      state = openCampaignMap();
      resetSessionFlags();
      playSfx(sfx.select);
      return;
    }
    if (hit === "menu") {
      state = createMenuState();
      resetSessionFlags();
      playSfx(sfx.select);
      return;
    }
    return;
  }

  if (state.phase !== "playing") return;

  if (hitMulligan(x, y, state)) {
    if (mulligan(state)) {
      selectedHand = null;
      clearDrag();
      playSfx(sfx.select);
    }
    return;
  }

  if (hitSkipTutorial(x, y, state)) {
    track("tutorial_skip", { step: state.tutorialStep });
    beginFactionPickFromTutorial();
    playSfx(sfx.select);
    return;
  }

  if (hitTutorialNext(x, y, state)) {
    if (advanceTutorialIntro(state)) {
      playSfx(sfx.select);
    }
    return;
  }

  if (hitPass(x, y, state)) {
    trackFirstAction("pass", state.round);
    passTurn(state);
    selectedHand = null;
    clearDrag();
    playSfx(sfx.select);
    return;
  }

  const handHit = hitHand(layout, state, x, y);
  if (handHit !== null) {
    pressWasSelected = selectedHand === handHit;
    pressHand = handHit;
    pressX = x;
    pressY = y;
    pointerId = ev.pointerId;
    selectedHand = handHit;
    canvas.setPointerCapture(ev.pointerId);
    playSfx(sfx.select);
    return;
  }

  const tile = hitTile(layout, x, y);
  if (tile) {
    const cell = state.board[tile.row][tile.col];
    if (cell) {
      inspected = {
        defId: cell.defId,
        power: cell.power,
        owner: cell.owner,
      };
      playSfx(sfx.select);
      return;
    }
    if (selectedHand !== null) {
      tryPlay(selectedHand, tile);
    }
  }
}

function onPointerMove(ev: PointerEvent): void {
  const { x, y } = canvasPos(ev);
  hoverTile = hitTile(layout, x, y);

  if (pointerId !== ev.pointerId || pressHand === null) return;
  if (state.phase !== "playing" || cascadePlayer.playing) return;

  const dist = Math.hypot(x - pressX, y - pressY);
  if (!drag?.active && dist >= DRAG_THRESHOLD) {
    drag = { handIndex: pressHand, x, y, active: true };
  }
  if (drag?.active) {
    drag = { ...drag, x, y };
  }
}

function onPointerUp(ev: PointerEvent): void {
  if (pointerId !== null && ev.pointerId !== pointerId) return;

  const { x, y } = canvasPos(ev);
  hoverTile = hitTile(layout, x, y);

  if (drag?.active && state.phase === "playing" && !cascadePlayer.playing) {
    const tile = hitTile(layout, x, y);
    if (tile) {
      tryPlay(drag.handIndex, tile);
    } else {
      selectedHand = drag.handIndex;
    }
    clearDrag();
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    return;
  }

  if (pressHand !== null && pressWasSelected) {
    // Second tap on same hand card → full inspect
    const defId = state.players.player.hand[pressHand];
    if (defId) {
      inspected = { defId, owner: "player" };
      playSfx(sfx.select);
    }
    selectedHand = pressHand;
  }
  clearDrag();
  try {
    if (pointerId !== null) canvas.releasePointerCapture(ev.pointerId);
  } catch {
    /* ignore */
  }
}

function onPointerCancel(ev: PointerEvent): void {
  if (pointerId === ev.pointerId) {
    clearDrag();
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
  }
}

function frame(now: number): void {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  setMusicBed(musicBedForPhase(state.phase));

  if (howtoFlash > 0) howtoFlash = Math.max(0, howtoFlash - dt);
  if (captureTipLife > 0) captureTipLife = Math.max(0, captureTipLife - dt);

  const paused = overlay !== "none";
  if (state.phase === "playing" && !paused && getPrefs().timer) {
    const timedOut = tickTimer(state, dt);
    if (timedOut) trackFirstAction("pass", state.round);
  }

  if (!paused) {
    cascadePlayer.update(dt, layout, motion, {
      beam: (step) => playSfx(() => sfx.beamStep(step ?? 1)),
      capture: () => playSfx(sfx.capture),
      chain: (step) => playSfx(() => sfx.chain(step)),
    });
  }

  if (!paused && state.phase === "ai_thinking" && !cascadePlayer.playing && !state.cascadePending) {
    if (!pendingAiMove) {
      pendingAiMove = chooseAiMove(state, matchDifficulty());
      aiIntent = aiIntentLabel(pendingAiMove);
    }
    aiDelay -= dt;
    if (aiDelay <= 0) {
      const move = pendingAiMove;
      pendingAiMove = null;
      aiIntent = null;
      if (move && !("pass" in move)) {
        // Defer turn advance until cascade FX finish — avoids instant VICTORY/DEFEAT overlay.
        applyAiMove(state, matchDifficulty(), Math.random, move, { deferTurn: true });
        if (state.cascadePending) {
          beginPlayerCascade(state.lastCascade);
        } else {
          finishCascade(state);
        }
      } else {
        applyAiMove(state, matchDifficulty(), Math.random, move ?? { pass: true });
      }
      aiDelay = 0.55;
    }
  } else if (state.phase !== "ai_thinking") {
    aiDelay = 0.55;
    if (state.phase === "playing") {
      aiIntent = null;
      pendingAiMove = null;
    }
  }

  if (state.phase === "match_over" && !endedSfx) {
    endedSfx = true;
    const faction = state.players.player.faction;
    track("match_finish", {
      mode: state.mode,
      winner: state.winner,
      chainDepth: state.maxChainDepth,
      faction,
      captures: state.capturesPlayer,
    });
    if (state.mode === "tutorial") {
      track("tutorial_complete", { step: state.tutorialStep, winner: state.winner });
    }
    if (state.mode === "campaign" && state.winner === "player" && state.campaignNodeId) {
      track("campaign_node_clear", { node: state.campaignNodeId });
      const node = campaignNode(state.campaignNodeId);
      endReward = {
        unlockedCard: node?.reward.card ?? null,
        cosmetic: node?.reward.label ?? null,
        wins: loadMeta().wins,
      };
    } else {
      endReward = grantMatchReward({
        won: state.winner === "player",
        maxChainDepth: state.maxChainDepth,
        faction: faction === "neutral" ? "volt" : faction,
      });
    }
    if (endReward.unlockedCard || endReward.cosmetic) playSfx(sfx.unlock);
    if (state.winner === "player") playSfx(sfx.win);
    else playSfx(sfx.lose);
    beginBestChainReplay();
  }

  motion.update(dt);

  const { preview, pos } = currentPreview();

  ctx.save();
  if (motion.shake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * motion.shake,
      (Math.random() - 0.5) * motion.shake,
    );
  }
  drawFrame(ctx, state, layout, motion, selectedHand, hoverTile, {
    overlay,
    prefs: getPrefs(),
    drag,
    preview,
    previewPos: pos,
    captureTipLife: captureTipLife > 0 && !state.tutorial ? captureTipLife : 0,
    tutorialLine: tutorialLine(),
    tutorialPos: state.tutorial ? tutorialHint(state)?.pos ?? null : null,
    tutorialHand: state.tutorial ? tutorialHint(state)?.handIndex ?? null : null,
    signatureLine: !state.tutorial ? signatureHint(state)?.line ?? null : null,
    signaturePos: !state.tutorial ? signatureHint(state)?.pos ?? null : null,
    signatureHand: !state.tutorial ? signatureHint(state)?.handIndex ?? null : null,
    endReward,
    showDailyCta: showDailyCta(),
    replayingChain,
    threat:
      state.phase === "playing" && !state.tutorial
        ? forecastThreat(state, matchDifficulty())
        : null,
    aiIntent: state.phase === "ai_thinking" ? aiIntent : null,
    inspect: inspected,
    nextCampaignNodeId: nextNodeIdForEnd(),
    dailySummary: dailySummaryForUi(),
  });

  cascadePlayer.draw(ctx, W, H);

  if (howtoFlash > 0) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.85, howtoFlash / 4)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = theme.text;
    ctx.font = "800 22px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HOW TO PLAY", W / 2, H * 0.32);
    ctx.fillStyle = theme.muted;
    ctx.font = "600 14px JetBrains Mono, monospace";
    const lines = [
      "Drag a card onto the grid, or tap card then tile.",
      "Preview shows beams, damage, and captures.",
      "Capture at 0 Power · chains up to 4 deep.",
      "Highest controlled Power after Round 6 wins.",
    ];
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.4 + i * 28));
  }

  ctx.restore();
}

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerCancel);
window.addEventListener("resize", resize);
resize();
const rafId = { id: 0 };
function startLoop(now: number): void {
  rafId.id = requestAnimationFrame(startLoop);
  frame(now);
}
rafId.id = requestAnimationFrame(startLoop);

(window as unknown as {
  __cr: {
    state: () => MatchState;
    start: (f: FactionKey) => void;
    showcase: (f: FactionKey) => void;
    afterTutorial: () => void;
    tutorial: () => void;
    campaign: () => void;
    daily: () => void;
    play: (handIndex: number, col: number, row: number) => boolean;
    finish: () => void;
    pass: () => void;
    stats: () => ReturnType<typeof getFunnelStats> & { rates: ReturnType<typeof getFunnelRates> };
  };
}).__cr = {
  state: () => state,
  start: (f) => {
    state = startMatch(f, pickEnemyFaction(f));
    lastFaction = f;
    resetSessionFlags();
    track("faction_pick", { faction: f });
    noteMatchStart("versus", f);
  },
  showcase: (f) => {
    pendingShowcase = true;
    startVersusForFaction(f);
  },
  afterTutorial: () => {
    beginFactionPickFromTutorial();
  },
  tutorial: () => {
    state = startTutorial();
    lastFaction = "volt";
    resetSessionFlags();
    track("tutorial_start");
    noteMatchStart("tutorial", "volt");
  },
  campaign: () => {
    state = openCampaignMap();
    selectedHand = null;
    clearDrag();
  },
  daily: () => {
    state = startDaily();
    endedSfx = false;
    selectedHand = null;
    clearDrag();
    captureTipLife = 0;
    captureTipArmed = false;
    lastFaction = state.players.player.faction as FactionKey;
    track("daily_start", { key: state.dailyKey });
    noteMatchStart("daily", lastFaction);
  },
  play: (handIndex, col, row) => tryPlay(handIndex, { col, row }),
  finish: () => {
    if (cascadePlayer.playing) cascadePlayer.skip();
    finishCascade(state);
  },
  pass: () => {
    passTurn(state);
  },
  stats: () => ({ ...getFunnelStats(), rates: getFunnelRates() }),
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(rafId.id);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerCancel);
    window.removeEventListener("resize", resize);
  });
}
