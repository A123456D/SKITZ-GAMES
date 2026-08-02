import { getCard } from "./cards";
import { emptyTiles, isBoardFull, scoreFor } from "./board";
import {
  buildSeedBoard,
  campaignNode,
  computeNodeStars,
  markNodeCleared,
} from "./campaign";
import { resolveCascade } from "./cascade";
import {
  buildDailyBoard,
  buildDailyChallenge,
  formatShareCard,
  mulberry32,
  saveDailyRecord,
  todayKey,
} from "./daily";
import { cloneDeck, shuffle } from "./deck";
import {
  HAND_SIZE,
  MAX_ROUNDS,
  TURN_SECONDS,
  emptyBoard,
  energyForRound,
  type CascadeEvent,
  type Faction,
  type MatchState,
  type Pos,
} from "./types";

export type FactionKey = "volt" | "prismatic" | "void";

function drawToHand(state: MatchState, who: "player" | "enemy"): void {
  const p = state.players[who];
  while (p.hand.length < HAND_SIZE && p.deck.length > 0) {
    p.hand.push(p.deck.shift()!);
  }
}

/** Ensure hand has at least one card affordable at current energy. */
export function ensureAffordableHand(state: MatchState, who: "player" | "enemy"): void {
  const p = state.players[who];
  const energy = state.energy;
  if (p.hand.some((id) => getCard(id).cost <= energy)) return;

  const cheapDeckIdx = p.deck.findIndex((id) => getCard(id).cost <= energy);
  if (cheapDeckIdx < 0) return;

  let priceyHandIdx = 0;
  let priceyCost = -1;
  for (let i = 0; i < p.hand.length; i++) {
    const c = getCard(p.hand[i]).cost;
    if (c > priceyCost) {
      priceyCost = c;
      priceyHandIdx = i;
    }
  }
  const cheap = p.deck[cheapDeckIdx];
  p.deck[cheapDeckIdx] = p.hand[priceyHandIdx];
  p.hand[priceyHandIdx] = cheap;
}

function beginTurn(state: MatchState): void {
  state.energyMax = energyForRound(state.round);
  state.energy = state.energyMax;
  if (state.active === "player" && state.playerEnergyBonus > 0) {
    state.energy += state.playerEnergyBonus;
    state.energyMax += state.playerEnergyBonus;
  }
  if (state.active === "enemy" && state.enemyEnergyBonus > 0) {
    state.energy += state.enemyEnergyBonus;
    state.energyMax += state.enemyEnergyBonus;
  }
  state.turnSecondsLeft = TURN_SECONDS;
  drawToHand(state, state.active);
  ensureAffordableHand(state, state.active);
  state.phase = state.active === "player" ? "playing" : "ai_thinking";
}

function syncObjective(state: MatchState): void {
  if (!state.objective) return;
  const o = state.objective;
  if (o.kind === "score_at_least") o.progress = scoreFor(state.board, "player");
  else if (o.kind === "capture_at_least") o.progress = state.capturesPlayer;
  else if (o.kind === "chain_depth") o.progress = state.maxChainDepth;
  else if (o.kind === "survive_rounds") o.progress = state.round;
  else if (o.kind === "win_match") {
    o.progress = scoreFor(state.board, "player") > scoreFor(state.board, "enemy") ? 1 : 0;
  }
}

function objectiveCleared(state: MatchState): boolean {
  if (!state.objective) return false;
  if (state.objective.kind === "win_match") return false;
  return state.objective.progress >= state.objective.target;
}

function finalizeMatch(state: MatchState): void {
  syncObjective(state);
  const ps = scoreFor(state.board, "player");
  const es = scoreFor(state.board, "enemy");

  if (state.objective && state.objective.kind !== "win_match") {
    state.winner = objectiveCleared(state) ? "player" : "enemy";
  } else if (ps > es) state.winner = "player";
  else if (es > ps) state.winner = "enemy";
  else state.winner = "draw";

  state.phase = "match_over";
  state.cascadePending = false;

  if (state.mode === "campaign" && state.campaignNodeId && state.winner === "player") {
    const stars = computeNodeStars({
      won: true,
      playerScore: ps,
      enemyScore: es,
      maxChainDepth: state.maxChainDepth,
    });
    markNodeCleared(state.campaignNodeId, { stars });
  }
  if (state.mode === "daily" && state.dailyKey) {
    saveDailyRecord({
      key: state.dailyKey,
      bestScore: ps,
      bestChain: state.maxChainDepth,
      cleared: state.winner === "player",
      attempts: 0,
      shareLine: formatShareCard({
        key: state.dailyKey,
        score: ps,
        chain: state.maxChainDepth,
        cleared: state.winner === "player",
      }),
    });
  }
}

function maxRoundsFor(state: MatchState): number {
  if (state.maxRoundsOverride) return state.maxRoundsOverride;
  if (state.mode === "campaign" && state.campaignNodeId) {
    const node = campaignNode(state.campaignNodeId);
    if (node?.maxRounds) return node.maxRounds;
  }
  return MAX_ROUNDS;
}

function advanceAfterTurn(state: MatchState): void {
  syncObjective(state);
  // Survive objectives resolve when the player *reaches* the target round (below),
  // not the moment the round counter ticks up mid-handoff.
  if (objectiveCleared(state) && state.objective?.kind !== "survive_rounds") {
    finalizeMatch(state);
    return;
  }

  if (isBoardFull(state.board)) {
    finalizeMatch(state);
    return;
  }

  if (state.tutorial) {
    if (state.active === "player") {
      state.active = "enemy";
      beginTurn(state);
      state.energy = Math.min(state.energy, 2);
      state.energyMax = 2;
      return;
    }
    state.active = "player";
    beginTurn(state);
    state.energy = 2;
    state.energyMax = 2;
    state.round = Math.min(MAX_ROUNDS, Math.max(1, state.tutorialStep + 1));
    return;
  }

  if (state.playsLeft !== null && state.active === "player") {
    state.playsLeft = Math.max(0, state.playsLeft - 1);
    if (state.playsLeft <= 0) {
      finalizeMatch(state);
      return;
    }
  }

  if (state.active === "player") {
    state.active = "enemy";
    beginTurn(state);
    return;
  }

  if (state.round >= maxRoundsFor(state)) {
    finalizeMatch(state);
    return;
  }

  state.round += 1;
  state.active = "player";
  beginTurn(state);
  syncObjective(state);
  // Player has now reached this round (HUD shows it) — survive objectives can clear.
  if (objectiveCleared(state)) {
    finalizeMatch(state);
  }
}

export function createMenuState(): MatchState {
  return {
    phase: "menu",
    mode: "versus",
    round: 1,
    active: "player",
    energy: 2,
    energyMax: 2,
    turnSecondsLeft: TURN_SECONDS,
    board: emptyBoard(),
    players: {
      player: { id: "player", deck: [], hand: [], faction: "volt" },
      enemy: { id: "enemy", deck: [], hand: [], faction: "prismatic" },
    },
    lastCascade: [],
    winner: null,
    nextInstance: 1,
    mulliganAvailable: false,
    cascadePending: false,
    scoreBeforePlay: { player: 0, enemy: 0 },
    lastScoreDelta: { player: 0, enemy: 0 },
    tutorial: false,
    tutorialStep: 0,
    sawCaptureTip: false,
    campaignNodeId: null,
    objective: null,
    maxChainDepth: 0,
    bestCascade: [],
    capturesPlayer: 0,
    dailyKey: null,
    playsLeft: null,
    aiDifficulty: null,
    playerEnergyBonus: 0,
    enemyEnergyBonus: 0,
    maxRoundsOverride: null,
    showcase: false,
    signatureSeen: false,
  };
}

export function openCampaignMap(): MatchState {
  const state = createMenuState();
  state.phase = "campaign_map";
  state.mode = "campaign";
  return state;
}

export function startMatch(
  playerFaction: FactionKey,
  enemyFaction: FactionKey = oppositeFaction(playerFaction),
  rng: () => number = Math.random,
): MatchState {
  const state = createMenuState();
  state.phase = "playing";
  state.mode = "versus";
  state.round = 1;
  state.active = "player";
  state.board = emptyBoard();
  state.winner = null;
  state.lastCascade = [];
  state.nextInstance = 1;
  state.mulliganAvailable = true;
  state.cascadePending = false;
  state.tutorial = false;
  state.tutorialStep = 0;
  state.objective = null;
  state.campaignNodeId = null;
  state.dailyKey = null;
  state.playsLeft = null;
  state.aiDifficulty = null;
  state.playerEnergyBonus = 0;
  state.enemyEnergyBonus = 0;
  state.maxRoundsOverride = null;
  state.showcase = false;
  state.signatureSeen = false;

  state.players.player = {
    id: "player",
    faction: playerFaction,
    deck: shuffle(cloneDeck(playerFaction), rng),
    hand: [],
  };
  state.players.enemy = {
    id: "enemy",
    faction: enemyFaction,
    deck: shuffle(cloneDeck(enemyFaction), rng),
    hand: [],
  };

  beginTurn(state);
  return state;
}

export function startCampaignNode(nodeId: string, rng: () => number = Math.random): MatchState {
  const node = campaignNode(nodeId);
  if (!node) return createMenuState();
  const faction = (node.faction ?? "volt") as FactionKey;
  const state = startMatch(faction, node.enemyFaction, rng);
  state.mode = "campaign";
  state.campaignNodeId = node.id;
  state.objective = { ...node.objective, progress: 0 };
  state.mulliganAvailable = false;
  state.board = buildSeedBoard(node.seedBoard);
  state.nextInstance = 100;
  state.aiDifficulty = node.aiDifficulty;
  state.playerEnergyBonus = node.playerEnergyBonus ?? 0;
  state.enemyEnergyBonus = node.enemyEnergyBonus ?? 0;
  state.playsLeft = node.playsLeft ?? null;
  state.maxRoundsOverride = node.maxRounds ?? null;
  if (node.openingHand) {
    state.players.player.hand = [...node.openingHand];
    state.players.player.deck = shuffle(
      cloneDeck(faction).filter((id) => !node.openingHand!.includes(id)),
      rng,
    );
  }
  state.energy = energyForRound(1) + state.playerEnergyBonus;
  state.energyMax = state.energy;
  ensureAffordableHand(state, "player");
  syncObjective(state);
  return state;
}

export function startDaily(key = todayKey()): MatchState {
  const daily = buildDailyChallenge(key);
  const rng = mulberry32(daily.rngSeed);
  const state = startMatch(daily.faction, daily.enemyFaction, rng);
  state.mode = "daily";
  state.dailyKey = daily.key;
  state.objective = { ...daily.objective, progress: 0 };
  state.playsLeft = daily.plays;
  state.mulliganAvailable = false;
  state.board = buildDailyBoard(daily.seedBoard);
  state.nextInstance = 200;
  state.aiDifficulty = daily.aiDifficulty;
  state.playerEnergyBonus = daily.playerEnergyBonus;
  state.enemyEnergyBonus = daily.enemyEnergyBonus;
  state.maxRoundsOverride = daily.maxRounds ?? null;
  state.players.player.hand = [...daily.openingHand];
  state.players.player.deck = shuffle(
    cloneDeck(daily.faction).filter((id) => !daily.openingHand.includes(id)),
    rng,
  );
  state.energy = energyForRound(1) + state.playerEnergyBonus;
  state.energyMax = state.energy;
  ensureAffordableHand(state, "player");
  syncObjective(state);
  return state;
}

/** Scripted tutorial: guided beats that teach place → damage → overthrow → relay → score. */
export function startTutorial(): MatchState {
  const state = startMatch("volt", "prismatic", () => 0.42);
  state.mode = "tutorial";
  state.tutorial = true;
  state.tutorialStep = 0;
  state.mulliganAvailable = false;
  state.round = 1;
  state.energy = 2;
  state.energyMax = 2;
  state.board = emptyBoard();
  // Enemy in col 1: Arc Mite (↓) chips it; Spike (↑) finishes the overthrow.
  // Power 4 so beat 1 damages without capturing, beat 2 steals the tile.
  state.board[2][1] = {
    instanceId: "tut_enemy",
    defId: "n_pulse_n",
    owner: "enemy",
    power: 4,
    activated: false,
  };
  // Four cards = four locked coaching beats.
  state.players.player.hand = ["v_swarm2", "n_pulse_n", "v_split1", "v_swarm1"];
  state.players.player.deck = [];
  state.players.enemy.hand = ["n_pulse_side"];
  state.players.enemy.deck = [];
  state.phase = "playing";
  state.active = "player";
  return state;
}

export type SignatureVerb = "FLOOD" | "REDIRECT" | "INVERT" | "OVERKILL";

export const FACTION_SIGIL_CARD: Record<"volt" | "prismatic" | "void", string> = {
  volt: "v_storm",
  prismatic: "p_vector",
  void: "o_invert",
};

type ShowcaseSeed = {
  seedBoard: Array<{
    col: number;
    row: number;
    defId: string;
    power?: number;
    owner?: "player" | "enemy";
  }>;
  openingHand: string[];
};

const SHOWCASE: Record<"volt" | "prismatic" | "void", ShowcaseSeed> = {
  volt: {
    // Storm Grid at (1,1) floods into side enemies + bottom threat.
    seedBoard: [
      { col: 0, row: 1, defId: "n_pulse_n", power: 3 },
      { col: 2, row: 1, defId: "n_pulse_n", power: 3 },
      { col: 1, row: 3, defId: "n_pulse_side", power: 2 },
    ],
    openingHand: ["v_swarm2", "v_storm", "n_pulse_n"],
  },
  prismatic: {
    // Vector Key at (1,2) fires ↑ into an enemy; side glass for redirect chains.
    seedBoard: [
      { col: 1, row: 0, defId: "n_pulse_n", power: 3 },
      { col: 0, row: 2, defId: "n_pulse_side", power: 2 },
      { col: 2, row: 2, defId: "p_reflect1", power: 2 },
    ],
    openingHand: ["p_center1", "p_vector", "n_pulse_n"],
  },
  void: {
    // Phase Invert at (1,1) fires ↓ into a soft enemy for overkill steal.
    seedBoard: [
      { col: 1, row: 2, defId: "n_pulse_n", power: 2 },
      { col: 0, row: 3, defId: "o_late1", power: 2 },
      { col: 2, row: 1, defId: "n_pulse_cross", power: 3 },
    ],
    openingHand: ["o_late1", "o_invert", "n_pulse_n"],
  },
};

/** Ideal tile to drop the signature card for each showcase. */
export const SHOWCASE_SIGIL_POS: Record<"volt" | "prismatic" | "void", Pos> = {
  volt: { col: 1, row: 1 },
  prismatic: { col: 1, row: 2 },
  void: { col: 1, row: 1 },
};

/** Scripted first-session versus — seeds a board ripe for the faction sigil. */
export function startShowcaseMatch(
  playerFaction: FactionKey,
  enemyFaction: FactionKey = oppositeFaction(playerFaction),
  rng: () => number = Math.random,
): MatchState {
  const state = startMatch(playerFaction, enemyFaction, rng);
  const script = SHOWCASE[playerFaction];
  state.showcase = true;
  state.signatureSeen = false;
  state.mulliganAvailable = false;
  state.board = buildSeedBoard(script.seedBoard);
  state.nextInstance = 100;
  state.players.player.hand = [...script.openingHand];
  state.players.player.deck = shuffle(
    cloneDeck(playerFaction).filter((id) => !script.openingHand.includes(id)),
    rng,
  );
  state.energy = energyForRound(1);
  state.energyMax = state.energy;
  // Signature costs 2–3; bump round-1 energy so the lever is reachable soon.
  if (playerFaction !== "volt") {
    state.energy = 3;
    state.energyMax = 3;
  }
  return state;
}

export function detectSignatureVerb(
  defId: string,
  events: CascadeEvent[],
): SignatureVerb | null {
  const def = getCard(defId);
  if (!def.sigil) return null;
  if (def.sigil === "flood") return "FLOOD";
  if (def.sigil === "redirect") return "REDIRECT";
  if (def.sigil === "invert") {
    return events.some((e) => e.type === "overkill") ? "OVERKILL" : "INVERT";
  }
  return null;
}

/** Soft coach when showcase sigil is in hand. */
export function signatureHint(state: MatchState): {
  handIndex: number;
  pos: Pos | null;
  line: string;
} | null {
  if (!state.showcase || state.signatureSeen || state.phase !== "playing") return null;
  if (state.active !== "player") return null;
  const faction = state.players.player.faction;
  if (faction === "neutral") return null;
  const sigilId = FACTION_SIGIL_CARD[faction];
  const handIndex = state.players.player.hand.indexOf(sigilId);
  if (handIndex < 0) return null;
  const def = getCard(sigilId);
  const pos = SHOWCASE_SIGIL_POS[faction];
  const open = emptyTiles(state.board).some((t) => t.col === pos.col && t.row === pos.row);
  if (def.cost > state.energy) {
    return {
      handIndex,
      pos: null,
      line: `SIGNATURE — ${def.name} needs ${def.cost} energy (you have ${state.energy}).`,
    };
  }
  if (!open) {
    return {
      handIndex,
      pos: null,
      line: `SIGNATURE — play ${def.name} onto an empty tile to trigger ${def.sigil!.toUpperCase()}.`,
    };
  }
  const verb =
    def.sigil === "flood" ? "FLOOD" : def.sigil === "redirect" ? "REDIRECT" : "OVERKILL";
  return {
    handIndex,
    pos,
    line: `SIGNATURE — play ${def.name} on the glow (${verb}).`,
  };
}

/** Legal tutorial coaching for the current beat (intro or locked play). */
export function tutorialHint(state: MatchState): {
  handIndex: number | null;
  pos: Pos | null;
  line: string;
  mode: "intro" | "play";
} | null {
  if (!state.tutorial || state.phase === "match_over") return null;
  if (state.phase !== "playing" && state.phase !== "cascading") return null;
  const hand = state.players.player.hand;

  if (state.tutorialStep === 0) {
    return {
      handIndex: null,
      pos: null,
      mode: "intro",
      line:
        "HOW IT WORKS|1) Place a card  2) It fires beams  3) Drop enemy Power to 0 to OVERTHROW (steal)  4) Chain through friends  5) Highest Power wins",
    };
  }
  if (state.tutorialStep === 1) {
    const hi = hand.indexOf("v_swarm2");
    if (hi < 0) return null;
    return {
      handIndex: hi,
      pos: { col: 1, row: 1 },
      mode: "play",
      line: "1/4 DAMAGE|Tap Arc Mite → glowing tile above the pink enemy.",
    };
  }
  if (state.tutorialStep === 2) {
    const hi = hand.indexOf("n_pulse_n");
    if (hi < 0) return null;
    return {
      handIndex: hi,
      pos: { col: 1, row: 3 },
      mode: "play",
      line: "2/4 OVERTHROW|Tap Signal Spike → glowing tile below the enemy.",
    };
  }
  if (state.tutorialStep === 3) {
    const hi = hand.indexOf("v_split1");
    if (hi < 0) return null;
    return {
      handIndex: hi,
      pos: { col: 0, row: 1 },
      mode: "play",
      line: "3/4 RELAY|Tap Fork Bolt → glowing tile left of your cards.",
    };
  }
  if (state.tutorialStep === 4) {
    const hi = hand.indexOf("v_swarm1");
    if (hi < 0) return null;
    const pos = { col: 2, row: 0 };
    const open = emptyTiles(state.board).some((t) => t.col === pos.col && t.row === pos.row);
    if (!open) return null;
    return {
      handIndex: hi,
      pos,
      mode: "play",
      line: "4/4 SCORE|Tap Spark Drone → glowing tile. Highest Power wins.",
    };
  }
  return null;
}

/** Advance past the intro beat (no card play). */
export function advanceTutorialIntro(state: MatchState): boolean {
  if (!state.tutorial || state.tutorialStep !== 0) return false;
  if (state.phase !== "playing") return false;
  state.tutorialStep = 1;
  return true;
}
function oppositeFaction(f: FactionKey): FactionKey {
  if (f === "volt") return "prismatic";
  if (f === "prismatic") return "void";
  return "volt";
}

/** Once per match, redraw hand (keeps energy). */
export function mulligan(state: MatchState): boolean {
  if (!state.mulliganAvailable) return false;
  if (state.phase !== "playing" || state.active !== "player") return false;
  if (state.cascadePending) return false;

  const p = state.players.player;
  p.deck.push(...p.hand);
  p.hand = [];
  p.deck = shuffle(p.deck);
  drawToHand(state, "player");
  ensureAffordableHand(state, "player");
  state.mulliganAvailable = false;
  return true;
}

export function canPlayCard(
  state: MatchState,
  handIndex: number,
  pos: Pos,
): boolean {
  if (state.cascadePending) return false;
  if (state.phase !== "playing" && state.phase !== "ai_thinking") return false;
  if (state.phase === "playing" && state.active !== "player") return false;
  if (state.playsLeft !== null && state.playsLeft <= 0) return false;
  const p = state.players[state.active];
  if (handIndex < 0 || handIndex >= p.hand.length) return false;
  const def = getCard(p.hand[handIndex]);
  if (def.cost > state.energy) return false;
  if (!emptyTiles(state.board).some((t) => t.col === pos.col && t.row === pos.row)) {
    return false;
  }
  if (state.tutorial && state.active === "player") {
    const hint = tutorialHint(state);
    if (!hint || hint.mode === "intro" || hint.handIndex === null || !hint.pos) {
      return false;
    }
    if (handIndex !== hint.handIndex) return false;
    if (pos.col !== hint.pos.col || pos.row !== hint.pos.row) return false;
  }
  return true;
}

function trackCascadeStats(state: MatchState, who: "player" | "enemy", events: CascadeEvent[]): void {
  let depth = 0;
  for (const e of events) {
    if (e.type === "fire") {
      depth = Math.max(depth, e.step);
      state.maxChainDepth = Math.max(state.maxChainDepth, e.step);
    }
    if (e.type === "capture" && who === "player") {
      state.capturesPlayer += 1;
    }
  }
  if (who === "player" && depth >= state.maxChainDepth && events.length > 0) {
    // Keep the cascade that set (or tied) the max depth for end-screen replay.
    const prevDepth = state.bestCascade.reduce(
      (m, e) => (e.type === "fire" ? Math.max(m, e.step) : m),
      0,
    );
    if (depth >= prevDepth) state.bestCascade = [...events];
  }
  syncObjective(state);
}

/**
 * Place + resolve cascade. Leaves phase as cascading with cascadePending=true.
 * Call finishCascade() after playback (or immediately for AI/tests).
 */
export function playCard(
  state: MatchState,
  handIndex: number,
  pos: Pos,
  opts: { deferTurn?: boolean } = {},
): { ok: boolean; events: CascadeEvent[]; error?: string; signatureVerb?: SignatureVerb | null } {
  const deferTurn = opts.deferTurn ?? false;
  if (!canPlayCard(state, handIndex, pos)) {
    return { ok: false, events: [], error: "Illegal play" };
  }

  const who = state.active;
  state.scoreBeforePlay = {
    player: scoreFor(state.board, "player"),
    enemy: scoreFor(state.board, "enemy"),
  };

  const p = state.players[who];
  const defId = p.hand[handIndex];
  const def = getCard(defId);

  p.hand.splice(handIndex, 1);
  state.energy -= def.cost;
  state.mulliganAvailable = false;

  const instance: import("./types").BoardCard = {
    instanceId: `c${state.nextInstance++}`,
    defId,
    owner: who,
    power: def.power,
    activated: false,
  };
  state.board[pos.row][pos.col] = instance;
  state.phase = "cascading";

  const { board, events } = resolveCascade(state.board, pos, who);
  state.board = board;
  state.lastCascade = events;
  trackCascadeStats(state, who, events);

  state.lastScoreDelta = {
    player: scoreFor(state.board, "player") - state.scoreBeforePlay.player,
    enemy: scoreFor(state.board, "enemy") - state.scoreBeforePlay.enemy,
  };

  if (events.some((e) => e.type === "capture")) {
    state.sawCaptureTip = true;
  }

  let signatureVerb: SignatureVerb | null = null;
  if (who === "player" && !state.signatureSeen) {
    signatureVerb = detectSignatureVerb(defId, events);
    if (signatureVerb) state.signatureSeen = true;
  }

  if (deferTurn) {
    state.cascadePending = true;
  } else {
    state.cascadePending = false;
    if (objectiveCleared(state)) finalizeMatch(state);
    else advanceAfterTurn(state);
  }

  if (state.tutorial && who === "player") state.tutorialStep += 1;

  return { ok: true, events, signatureVerb };
}

/** Advance the turn after cascade playback finishes. */
export function finishCascade(state: MatchState): void {
  if (!state.cascadePending) return;
  state.cascadePending = false;
  if (state.tutorial && state.tutorialStep >= 5) {
    // Let the last cascade / board state settle — mark victory for the pupil.
    syncObjective(state);
    const ps = scoreFor(state.board, "player");
    const es = scoreFor(state.board, "enemy");
    state.winner = ps >= es ? "player" : "enemy";
    state.phase = "match_over";
    return;
  }
  if (objectiveCleared(state) && state.objective?.kind !== "survive_rounds") {
    finalizeMatch(state);
    return;
  }
  advanceAfterTurn(state);
}

export type PlayPreview = {
  ok: boolean;
  events: CascadeEvent[];
  damage: number;
  captures: number;
  relays: number;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  signatureVerb: SignatureVerb | null;
};

export function previewPlay(
  state: MatchState,
  handIndex: number,
  pos: Pos,
): PlayPreview {
  const empty: PlayPreview = {
    ok: false,
    events: [],
    damage: 0,
    captures: 0,
    relays: 0,
    scoreBefore: scoreFor(state.board, state.active),
    scoreAfter: scoreFor(state.board, state.active),
    scoreDelta: 0,
    signatureVerb: null,
  };
  if (!canPlayCard(state, handIndex, pos)) return empty;

  const who = state.active;
  const defId = state.players[who].hand[handIndex];
  const def = getCard(defId);
  const board = state.board.map((row) => row.map((c) => (c ? { ...c } : null)));
  board[pos.row][pos.col] = {
    instanceId: "preview",
    defId,
    owner: who,
    power: def.power,
    activated: false,
  };
  const { board: after, events } = resolveCascade(board, pos, who);
  let damage = 0;
  let captures = 0;
  let relays = 0;
  for (const e of events) {
    if (e.type === "damage") damage += e.amount;
    if (e.type === "capture") captures += 1;
    if (e.type === "relay") relays += 1;
  }
  const scoreBefore = scoreFor(state.board, who);
  const scoreAfter = scoreFor(after, who);
  return {
    ok: true,
    events,
    damage,
    captures,
    relays,
    scoreBefore,
    scoreAfter,
    scoreDelta: scoreAfter - scoreBefore,
    signatureVerb: detectSignatureVerb(defId, events),
  };
}

export function passTurn(state: MatchState): void {
  if (state.cascadePending) return;
  if (state.phase !== "playing" && state.phase !== "ai_thinking") return;
  if (state.phase === "playing" && state.active !== "player") return;
  state.mulliganAvailable = false;
  advanceAfterTurn(state);
}

export function tickTimer(state: MatchState, dtSeconds: number): boolean {
  if (state.phase !== "playing" || state.cascadePending) return false;
  if (state.mode === "campaign" || state.mode === "daily") return false;
  state.turnSecondsLeft = Math.max(0, state.turnSecondsLeft - dtSeconds);
  if (state.turnSecondsLeft <= 0) {
    passTurn(state);
    return true;
  }
  return false;
}

export function scores(state: MatchState): { player: number; enemy: number } {
  return {
    player: scoreFor(state.board, "player"),
    enemy: scoreFor(state.board, "enemy"),
  };
}

export function affordableHandIndices(state: MatchState): number[] {
  const p = state.players[state.active];
  const out: number[] = [];
  for (let i = 0; i < p.hand.length; i++) {
    if (getCard(p.hand[i]).cost <= state.energy) out.push(i);
  }
  return out;
}

export function dailyShareLine(state: MatchState): string | null {
  if (state.mode !== "daily" || !state.dailyKey) return null;
  const ps = scoreFor(state.board, "player");
  return formatShareCard({
    key: state.dailyKey,
    score: ps,
    chain: state.maxChainDepth,
    cleared: state.winner === "player",
  });
}

export type { Faction };
export type { CampaignNode } from "./campaign";
