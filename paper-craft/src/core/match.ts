import { getCard, starterDeck } from "./cards";
import {
  HAND_SIZE,
  LANE_COUNT,
  MAX_STACK,
  MAX_TURNS,
  type Intent,
  type Lane,
  type MatchState,
  type PaperEvent,
  type PaperStack,
  type PlacedCard,
  type Side,
  type TutorialStep,
} from "./types";

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyLanes(): [Lane, Lane, Lane] {
  return [
    { player: null, enemy: null },
    { player: null, enemy: null },
    { player: null, enemy: null },
  ];
}

function drawToHand(deck: string[], hand: string[]): void {
  while (hand.length < HAND_SIZE && deck.length > 0) {
    hand.push(deck.pop()!);
  }
}

/** Guarantee at least one card playable on turn 1 (cost <= 1). */
function ensureOpeningPlayable(deck: string[], hand: string[]): void {
  if (hand.some((id) => getCard(id).cost <= 1)) return;
  const cheapIdx = deck.findIndex((id) => getCard(id).cost <= 1);
  if (cheapIdx < 0) return;
  const [cheap] = deck.splice(cheapIdx, 1);
  // swap with most expensive in hand
  let worst = 0;
  for (let i = 1; i < hand.length; i++) {
    if (getCard(hand[i]).cost > getCard(hand[worst]).cost) worst = i;
  }
  deck.push(hand[worst]);
  hand[worst] = cheap;
}

function pushEvent(state: MatchState, ev: PaperEvent): void {
  state.events.push(ev);
}

function takeEvents(state: MatchState): PaperEvent[] {
  const out = state.events;
  state.events = [];
  return out;
}

function stackOf(lane: Lane, side: Side): PaperStack | null {
  return side === "player" ? lane.player : lane.enemy;
}

function setStack(lane: Lane, side: Side, stack: PaperStack | null): void {
  if (side === "player") lane.player = stack;
  else lane.enemy = stack;
}

/** Active keyword for the visible face */
export function activeKeyword(card: PlacedCard): string | undefined {
  const def = getCard(card.cardId);
  return card.folded ? def.inkKeyword : def.frontKeyword;
}

function hasKeyword(card: PlacedCard, k: string): boolean {
  return activeKeyword(card) === k;
}

function tryScar(card: PlacedCard): boolean {
  if (hasKeyword(card, "brace")) return false;
  card.scarred = true;
  return true;
}

function facePower(card: PlacedCard): number {
  const def = getCard(card.cardId);
  const base = card.folded ? def.inkPower : def.frontPower;
  const scarPenalty = card.scarred && !hasKeyword(card, "brace") ? -1 : 0;
  return Math.max(0, base + scarPenalty);
}

/** Lane power for one side */
export function stackPower(stack: PaperStack | null): number {
  if (!stack) return 0;
  let p = facePower(stack.body);
  if (stack.sticker) p += facePower(stack.sticker);
  return p;
}

export function lanePower(state: MatchState, laneIndex: number, side: Side): number {
  return stackPower(stackOf(state.lanes[laneIndex], side));
}

export function energyForTurn(turn: number): number {
  return Math.min(turn, MAX_TURNS);
}

function mint(state: MatchState, cardId: string): PlacedCard {
  const instanceId = `c${state.nextId++}`;
  return { instanceId, cardId, folded: false, scarred: false };
}

export function createMatch(opts?: {
  tutorial?: boolean;
  seed?: number;
}): MatchState {
  let seed = opts?.seed ?? Date.now();
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  const deck = shuffle(starterDeck(), rng);
  const enemyDeck = shuffle(starterDeck(), rng);
  const hand: string[] = [];
  const enemyHand: string[] = [];
  drawToHand(deck, hand);
  drawToHand(enemyDeck, enemyHand);
  ensureOpeningPlayable(deck, hand);
  ensureOpeningPlayable(enemyDeck, enemyHand);

  const state: MatchState = {
    phase: "play",
    turn: 1,
    active: "player",
    lanes: emptyLanes(),
    hand,
    enemyHand,
    deck,
    enemyDeck,
    ripAvailable: true,
    enemyRipAvailable: true,
    winner: null,
    laneWinners: null,
    events: [],
    tutorial: !!opts?.tutorial,
    tutorialStep: "play",
    nextId: 1,
  };
  pushEvent(state, { type: "turn", turn: 1, side: "player" });
  return state;
}

export function advanceTutorial(state: MatchState, next: TutorialStep): void {
  if (!state.tutorial) return;
  state.tutorialStep = next;
}

function foldTarget(stack: PaperStack): "body" | "sticker" | null {
  if (stack.sticker && !stack.sticker.folded) return "sticker";
  if (!stack.body.folded) return "body";
  return null;
}

export function legalIntents(state: MatchState): Intent[] {
  if (state.phase !== "play" || state.active !== "player") return [];
  const out: Intent[] = [{ kind: "pass" }];
  const energy = energyForTurn(state.turn);
  const hand = state.hand;

  for (let hi = 0; hi < hand.length; hi++) {
    const cost = getCard(hand[hi]).cost;
    if (cost > energy) continue;
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const stack = state.lanes[lane].player;
      if (!stack) out.push({ kind: "play", handIndex: hi, lane });
      else if (!stack.sticker) out.push({ kind: "play", handIndex: hi, lane });
    }
  }

  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const stack = state.lanes[lane].player;
    if (stack && foldTarget(stack)) out.push({ kind: "fold", lane });
  }

  if (state.ripAvailable) {
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      if (state.lanes[lane].enemy) out.push({ kind: "rip", lane });
    }
  }

  if (state.tutorial) {
    return filterTutorial(state, out);
  }
  return out;
}

function filterTutorial(state: MatchState, intents: Intent[]): Intent[] {
  switch (state.tutorialStep) {
    case "play":
      return intents.filter((i) => i.kind === "play" && !state.lanes[i.lane].player);
    case "fold":
      return intents.filter((i) => i.kind === "fold");
    case "stack":
      return intents.filter(
        (i) => i.kind === "play" && state.lanes[i.lane].player && !state.lanes[i.lane].player!.sticker,
      );
    case "rip":
      return intents.filter((i) => i.kind === "rip");
    default:
      return intents;
  }
}

function tryStingInLane(state: MatchState, side: Side, lane: number): boolean {
  const foe: Side = side === "player" ? "enemy" : "player";
  const foeStack = stackOf(state.lanes[lane], foe);
  if (!foeStack) return false;
  const target = foeStack.sticker ?? foeStack.body;
  return tryScar(target);
}

function applyPlay(state: MatchState, side: Side, handIndex: number, lane: number): void {
  const hand = side === "player" ? state.hand : state.enemyHand;
  const cardId = hand[handIndex];
  if (!cardId) throw new Error("bad hand index");
  const energy = energyForTurn(state.turn);
  if (getCard(cardId).cost > energy) throw new Error("too expensive");

  const laneObj = state.lanes[lane];
  const existing = stackOf(laneObj, side);
  hand.splice(handIndex, 1);
  const placed = mint(state, cardId);

  let stacked = false;
  if (!existing) {
    setStack(laneObj, side, { body: placed });
  } else {
    if (existing.sticker) throw new Error("stack full");
    existing.sticker = placed;
    stacked = true;
  }

  // STING on the printed (front) face: scar on play
  let stung = false;
  if (getCard(cardId).frontKeyword === "sting") {
    stung = tryStingInLane(state, side, lane);
  }

  pushEvent(state, { type: "play", side, lane, cardId, stacked, stung });
}

function applyFold(state: MatchState, side: Side, lane: number): void {
  const stack = stackOf(state.lanes[lane], side);
  if (!stack) throw new Error("no stack");
  const target = foldTarget(stack);
  if (!target) throw new Error("nothing to fold");
  const card = target === "sticker" ? stack.sticker! : stack.body;
  const def = getCard(card.cardId);
  card.folded = true;

  // FLASH: draw if either face printed FLASH (fold is the trigger)
  let drew = false;
  if (def.frontKeyword === "flash" || def.inkKeyword === "flash") {
    const hand = side === "player" ? state.hand : state.enemyHand;
    const deck = side === "player" ? state.deck : state.enemyDeck;
    if (hand.length < HAND_SIZE && deck.length > 0) {
      hand.push(deck.pop()!);
      drew = true;
    }
  }

  // STING on ink face: scar when you fold into it
  if (def.inkKeyword === "sting") {
    tryStingInLane(state, side, lane);
  }

  pushEvent(state, { type: "fold", side, lane, target, drew });
}

function applyRip(state: MatchState, side: Side, lane: number): void {
  const ripFlag = side === "player" ? "ripAvailable" : "enemyRipAvailable";
  if (!state[ripFlag]) throw new Error("no rip");
  const foe: Side = side === "player" ? "enemy" : "player";
  const stack = stackOf(state.lanes[lane], foe);
  if (!stack) throw new Error("no target");

  state[ripFlag] = false;
  let result: "peel" | "destroy" | "scar" | "blocked";

  const gluedSticker = stack.sticker && hasKeyword(stack.sticker, "glue");

  if (stack.sticker && !gluedSticker) {
    stack.sticker = undefined;
    result = "peel";
  } else if (stack.body.folded) {
    // Brace on ink face: survive destroy → unfold + scar attempt
    if (hasKeyword(stack.body, "brace")) {
      stack.body.folded = false;
      tryScar(stack.body);
      result = "scar";
    } else {
      setStack(state.lanes[lane], foe, null);
      result = "destroy";
    }
  } else {
    const ok = tryScar(stack.body);
    result = ok ? "scar" : "blocked";
  }

  pushEvent(state, { type: "rip", side, lane, result });
}

function endTurn(state: MatchState): void {
  if (state.active === "player") {
    state.active = "enemy";
    pushEvent(state, { type: "turn", turn: state.turn, side: "enemy" });
    return;
  }

  // enemy finished → next turn or end match
  if (state.turn >= MAX_TURNS) {
    finishMatch(state);
    return;
  }
  state.turn += 1;
  state.active = "player";
  drawToHand(state.deck, state.hand);
  drawToHand(state.enemyDeck, state.enemyHand);
  pushEvent(state, { type: "turn", turn: state.turn, side: "player" });
}

export function scoreLanes(state: MatchState): Array<Side | "tie"> {
  const winners: Array<Side | "tie"> = [];
  for (let i = 0; i < LANE_COUNT; i++) {
    const p = lanePower(state, i, "player");
    const e = lanePower(state, i, "enemy");
    if (p > e) winners.push("player");
    else if (e > p) winners.push("enemy");
    else winners.push("tie");
  }
  return winners;
}

function finishMatch(state: MatchState): void {
  const laneWinners = scoreLanes(state);
  let p = 0;
  let e = 0;
  for (const w of laneWinners) {
    if (w === "player") p++;
    else if (w === "enemy") e++;
  }
  const winner: Side | "draw" = p > e ? "player" : e > p ? "enemy" : "draw";
  state.phase = "end";
  state.winner = winner;
  state.laneWinners = laneWinners;
  pushEvent(state, { type: "end", winner, laneWinners });
}

function syncTutorial(state: MatchState, intent: Intent): void {
  if (!state.tutorial) return;
  switch (state.tutorialStep) {
    case "play":
      if (intent.kind === "play") state.tutorialStep = "fold";
      break;
    case "fold":
      if (intent.kind === "fold") state.tutorialStep = "stack";
      break;
    case "stack":
      if (intent.kind === "play") state.tutorialStep = "rip";
      break;
    case "rip":
      if (intent.kind === "rip") state.tutorialStep = "done";
      break;
  }
}

/** Apply a player or scripted intent. Returns new events. */
export function applyIntent(state: MatchState, intent: Intent): PaperEvent[] {
  if (state.phase !== "play") return [];
  const side = state.active;

  switch (intent.kind) {
    case "play":
      applyPlay(state, side, intent.handIndex, intent.lane);
      break;
    case "fold":
      applyFold(state, side, intent.lane);
      break;
    case "rip":
      applyRip(state, side, intent.lane);
      break;
    case "pass":
      pushEvent(state, { type: "pass", side });
      break;
  }

  if (side === "player") syncTutorial(state, intent);
  endTurn(state);
  return takeEvents(state);
}

/** Enemy legal intents (no tutorial filter) */
export function enemyLegalIntents(state: MatchState): Intent[] {
  if (state.phase !== "play" || state.active !== "enemy") return [];
  const out: Intent[] = [{ kind: "pass" }];
  const energy = energyForTurn(state.turn);
  const hand = state.enemyHand;

  for (let hi = 0; hi < hand.length; hi++) {
    if (getCard(hand[hi]).cost > energy) continue;
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const stack = state.lanes[lane].enemy;
      if (!stack || !stack.sticker) out.push({ kind: "play", handIndex: hi, lane });
    }
  }
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const stack = state.lanes[lane].enemy;
    if (stack && foldTarget(stack)) out.push({ kind: "fold", lane });
  }
  if (state.enemyRipAvailable) {
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      if (state.lanes[lane].player) out.push({ kind: "rip", lane });
    }
  }
  return out;
}

export function setupTutorialBoard(state: MatchState): void {
  // Folded enemy without BRACE so Rip destroy lesson still works
  state.lanes[1].enemy = {
    body: mint(state, "fold_fox"),
  };
  state.lanes[1].enemy!.body.folded = true;
  state.enemyRipAvailable = false;
}

export { MAX_STACK, takeEvents };
