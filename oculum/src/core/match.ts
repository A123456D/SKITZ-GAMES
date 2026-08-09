import {
  getCard,
  INK_ABYSS_RITE_IDS,
  MOTLEY_COURT_RITE_IDS,
  DUSK_LEDGER_RITE_IDS,
  BONEWICK_RITE_IDS,
  BELLWARD_TOLL_RITE_IDS,
  IRON_BREACH_RITE_IDS,
  teachDeck,
} from "./cards";
import { validateConstructedDeck } from "./construct";
import { pickAiOpponentDeck } from "./decks";
import { HERESY_SEALS_RITE_IDS } from "./waveHeresySeals";
import {
  advanceTutorial,
  filterTutorialIntents,
  isTutorialSoftPass,
  setupTutorial,
} from "./tutorial";
import {
  ALTITUDE_COUNT,
  ECLIPSE_WIN,
  ESSENCE_CAP,
  FAVOR_CAP,
  HAND_MAX,
  MAX_TURNS,
  SCRUTINY_FORCE,
  SIGHT_CARRY_CAP,
  START_WILL,
  type AiDifficulty,
  type Altitude,
  type AltitudeSlot,
  type BoardUnit,
  type Intent,
  type MatchState,
  type OculusEvent,
  type Side,
} from "./types";

export { setupTutorial, advanceTutorial } from "./tutorial";
export const ALT_NAMES = ["High", "Mid", "Low"] as const;

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyBoard(): [AltitudeSlot, AltitudeSlot, AltitudeSlot] {
  return [
    { player: null, enemy: null, playerSite: null, enemySite: null, blinded: false },
    { player: null, enemy: null, playerSite: null, enemySite: null, blinded: false },
    { player: null, enemy: null, playerSite: null, enemySite: null, blinded: false },
  ];
}

function push(state: MatchState, ev: OculusEvent): void {
  state.events.push(ev);
}

export function takeEvents(state: MatchState): OculusEvent[] {
  const out = state.events;
  state.events = [];
  return out;
}

function unitOf(slot: AltitudeSlot, side: Side): BoardUnit | null {
  return side === "player" ? slot.player : slot.enemy;
}

function setUnit(slot: AltitudeSlot, side: Side, u: BoardUnit | null): void {
  if (side === "player") slot.player = u;
  else slot.enemy = u;
}

function siteOf(slot: AltitudeSlot, side: Side): string | null {
  return side === "player" ? slot.playerSite : slot.enemySite;
}

function setSite(slot: AltitudeSlot, side: Side, id: string | null): void {
  if (side === "player") slot.playerSite = id;
  else slot.enemySite = id;
}

function handOf(state: MatchState, side: Side): string[] {
  return side === "player" ? state.hand : state.enemyHand;
}

function deckOf(state: MatchState, side: Side): string[] {
  return side === "player" ? state.deck : state.enemyDeck;
}

function propheciesOf(state: MatchState, side: Side): string[] {
  return side === "player" ? state.prophecies : state.enemyProphecies;
}

function mint(state: MatchState, cardId: string, veiled: boolean): BoardUnit {
  return {
    instanceId: `u${state.nextId++}`,
    cardId,
    veiled,
    hybridSite: false,
    stanceB: false,
    grafts: [],
    inhabitant: null,
    hasThirdFace: false,
    strained: false,
    stained: false,
    revelationFired: false,
    scrutiny: 0,
    wagered: false,
    wagerAntePaid: false,
    wagerAnteFavor: false,
    openedSinceResolve: false,
    lastBreachOpened: false,
    pressed: false,
    pressedBy: null,
  };
}

function clearWager(u: BoardUnit): void {
  u.wagered = false;
  u.wagerAntePaid = false;
  u.wagerAnteFavor = false;
}

export function sidePlaysHeresy(state: MatchState, side: Side, heresy: string): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).heresy === heresy) return true;
    const site = siteOf(state.altitudes[a as Altitude], side);
    if (site && getCard(site).heresy === heresy) return true;
  }
  if (handOf(state, side).some((id) => getCard(id).heresy === heresy)) return true;
  // Craft identity stays even when the last copy is buried in the deck
  return deckOf(state, side).some((id) => getCard(id).heresy === heresy);
}

function clearPress(u: BoardUnit): void {
  u.pressed = false;
  u.pressedBy = null;
}

/** Smother backlash — Press never Erased. */
function applyPressBacklash(
  state: MatchState,
  presser: Side,
  altitude: Altitude,
  u: BoardUnit,
): void {
  if (!u.pressed) return;
  if (sightOf(state, presser) > 0) {
    setSight(state, presser, sightOf(state, presser) - 1);
  }
  push(state, { type: "press_backlash", side: presser, altitude, cardId: u.cardId });
  clearPress(u);
}

function resolvePressBacklashes(state: MatchState): void {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const alt = a as Altitude;
    for (const side of ["player", "enemy"] as Side[]) {
      const u = unitOf(state.altitudes[alt], side);
      if (u?.pressed && u.veiled && u.pressedBy) {
        applyPressBacklash(state, u.pressedBy, alt, u);
      }
    }
  }
}

/** Peal pay — Resolve spend on armed Toll (or Banner Lure exception). */
function payPeal(state: MatchState, owner: Side, altitude: Altitude): void {
  if (!state.pealArmed[altitude]) return;
  state.pealArmed[altitude] = false;
  setSight(state, owner, Math.min(SIGHT_CARRY_CAP, sightOf(state, owner) + 1));
  drawOne(state, owner);
  push(state, { type: "peal_pay", side: owner, altitude });
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], owner);
    if (u?.veiled && u.cardId === "clapper_cantor") {
      setSight(state, owner, Math.min(SIGHT_CARRY_CAP, sightOf(state, owner) + 1));
      break;
    }
  }
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], owner);
    if (u && !u.veiled && u.cardId === "carillon") {
      blindAltitude(state, owner, altitude);
      break;
    }
  }
}

function fizzlePeal(state: MatchState, altitude: Altitude): void {
  state.pealArmed[altitude] = false;
}

function tryPress(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  opts: { free?: boolean } = {},
): boolean {
  if (state.pressUsed[side]) return false;
  if (!sidePlaysHeresy(state, side, "ink")) return false;
  const slot = state.altitudes[altitude];
  if (slot.blinded) return false;
  const foe = unitOf(slot, other(side));
  if (!foe?.veiled) return false;
  if (getCard(foe.cardId).type !== "figure") return false;
  // Free Press into Motley Stance B — no Stain required (densify answer to Trick Hold)
  const freeVsTrick =
    foe.stanceB && getCard(foe.cardId).heresy === "motley";
  if (!freeVsTrick && !foe.stained) return false;
  if (!opts.free && !freeVsTrick) {
    if (sightOf(state, side) < 1) return false;
    setSight(state, side, sightOf(state, side) - 1);
  }
  foe.pressed = true;
  foe.pressedBy = side;
  state.pressUsed[side] = true;
  push(state, { type: "press", side, altitude, cardId: foe.cardId });
  // Dahaka: Press while Witnessed → 1 Will
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && !u.veiled && u.cardId === "dahaka") {
      dealWillToOpponent(state, side, 1);
      break;
    }
  }
  return true;
}

function tryPeal(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  opts: { free?: boolean } = {},
): boolean {
  if (state.pealUsed[side]) return false;
  if (!sidePlaysHeresy(state, side, "toll")) return false;
  if (state.tollOwner[altitude] !== side) return false;
  if (state.pealArmed[altitude]) return false;
  if (!opts.free) {
    if (sightOf(state, side) < 1) return false;
    setSight(state, side, sightOf(state, side) - 1);
  }
  state.pealArmed[altitude] = true;
  state.pealUsed[side] = true;
  push(state, { type: "peal", side, altitude });
  if (state.soundTollPealBonus[side]) {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    state.soundTollPealBonus[side] = false;
  }
  return true;
}

/** Figures that ante Favor instead of Sight. */
const FAVOR_ANTE_FIGURES = new Set<string>(); // Favor antes retired — Hold/Final Raise spend Favor instead

function favorOf(state: MatchState, side: Side): number {
  return side === "player" ? state.favor : state.enemyFavor;
}

function setFavor(state: MatchState, side: Side, n: number): void {
  const v = Math.max(0, Math.min(FAVOR_CAP, n));
  if (side === "player") state.favor = v;
  else state.enemyFavor = v;
}

/** Direct Favor gain (rites / Revelation) — ignores once/turn income gate. */
function gainFavor(state: MatchState, side: Side, amount = 1): void {
  if (amount <= 0) return;
  const before = favorOf(state, side);
  setFavor(state, side, before + amount);
  const gained = favorOf(state, side) - before;
  if (gained > 0) push(state, { type: "favor", side, amount: gained });
}

/** +1 Favor if under cap and not already gained this turn (Cash income). */
function tryGainFavor(state: MatchState, side: Side): boolean {
  if (state.favorGainedThisTurn[side]) return false;
  if (favorOf(state, side) >= FAVOR_CAP) return false;
  setFavor(state, side, favorOf(state, side) + 1);
  state.favorGainedThisTurn[side] = true;
  push(state, { type: "favor", side, amount: 1 });
  return true;
}

/** Free Wager: mark Wagered without ante. Allowed while Witnessed (Revelation / Fall payoffs). */
function freeWagerUnit(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  u: BoardUnit,
): boolean {
  if (u.wagered) return false;
  const t = getCard(u.cardId).type;
  if (t !== "figure" && t !== "vessel") return false;
  u.wagered = true;
  u.wagerAntePaid = false;
  u.wagerAnteFavor = false;
  push(state, { type: "wager", side, altitude, cardId: u.cardId, free: true });
  return true;
}

/** Intentional Wager: ante 1 Sight, or 1 Favor for Favor-ante Figures. */
function tryWager(
  state: MatchState,
  side: Side,
  altitude: Altitude,
): boolean {
  if (state.wagerUsed[side]) return false;
  const slot = state.altitudes[altitude];
  if (slot.blinded) return false;
  const u = unitOf(slot, side);
  if (!u?.veiled || u.wagered) return false;
  if (getCard(u.cardId).type !== "figure") return false;
  if (getCard(u.cardId).heresy !== "motley") return false;
  const favorAnte = FAVOR_ANTE_FIGURES.has(u.cardId);
  if (favorAnte) {
    if (favorOf(state, side) < 1) return false;
    setFavor(state, side, favorOf(state, side) - 1);
    u.wagerAnteFavor = true;
  } else {
    if (sightOf(state, side) < 1) return false;
    setSight(state, side, sightOf(state, side) - 1);
    u.wagerAnteFavor = false;
  }
  u.wagered = true;
  u.wagerAntePaid = true;
  state.wagerUsed[side] = true;
  push(state, { type: "wager", side, altitude, cardId: u.cardId, free: false });
  return true;
}

function notifyDebtorOnBust(state: MatchState, side: Side): void {
  if (state.debtorBustDrawUsed[side]) return;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const d = unitOf(state.altitudes[a as Altitude], side);
    if (d?.veiled && d.cardId === "grinning_debtor") {
      drawOne(state, side);
      state.debtorBustDrawUsed[side] = true;
      return;
    }
  }
}

function findLadyMasque(state: MatchState, side: Side): BoardUnit | null {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u?.cardId === "lady_masque") return u;
  }
  return null;
}

function countWageredFigures(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u?.wagered && getCard(u.cardId).type === "figure") n += 1;
  }
  return n;
}

function notifyBlindfoldCharm(state: MatchState, side: Side, altitude: Altitude): void {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (!u?.wagered) continue;
    if (!u.grafts.some((g) => g.cardId === "blindfold_charm")) continue;
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    if (altitude === 1) drawOne(state, side);
    return;
  }
}

function freeWagerOtherFigure(
  state: MatchState,
  side: Side,
  exceptAlt: Altitude,
): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (!u || u.wagered) continue;
    const t = getCard(u.cardId).type;
    if (t === "figure" || t === "vessel") {
      return freeWagerUnit(state, side, a as Altitude, u);
    }
  }
  return false;
}

/** Bust: lose Resolve or Forced Expose / Gaze while Wagered — no refund + rider. */
function applyBust(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  u: BoardUnit,
): void {
  if (!u.wagered) return;
  const cardId = u.cardId;
  clearWager(u);
  push(state, { type: "bust", side, altitude, cardId });
  if (cardId === "diamond_widow") {
    blindAltitude(state, side, altitude);
  } else if (cardId === "scarlet_dealer") {
    setSight(state, other(side), Math.min(SIGHT_CARRY_CAP, sightOf(state, other(side)) + 1));
  } else if (cardId === "pit_capper") {
    tryGainFavor(state, side);
  }
  // Antewell: friendly Figure Bust here → draw 1
  if (getCard(cardId).type === "figure" && siteOf(state.altitudes[altitude], side) === "antewell") {
    drawOne(state, side);
  }
  notifyDebtorOnBust(state, side);
}

/** Cash: win Resolve Veiled while Wagered — refund ante + rider. */
function applyCash(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  u: BoardUnit,
): void {
  if (!u.veiled || !u.wagered) return;
  const cardId = u.cardId;
  if (u.wagerAntePaid) {
    if (u.wagerAnteFavor) {
      setFavor(state, side, Math.min(FAVOR_CAP, favorOf(state, side) + 1));
    } else {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    }
  }
  clearWager(u);
  push(state, { type: "cash", side, altitude, cardId });
  tryGainFavor(state, side);
  if (getCard(cardId).type === "figure") {
    state.cashThisResolve[side] += 1;
    const lm = findLadyMasque(state, side);
    if (lm) {
      if (lm.veiled) {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      } else {
        gainFavor(state, side, 1);
      }
    }
  }
  if (cardId === "whitecard_mummer") drawOne(state, side);
  else if (cardId === "masked_usher") drawOne(state, side);
  else if (cardId === "grinning_debtor") {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  } else if (cardId === "scarlet_dealer") {
    drawOne(state, side);
  } else if (cardId === "spire_caprice") {
    blindAltitude(state, side, 1);
  } else if (cardId === "favor_broker") {
    drawOne(state, side);
  }
  // Velvet Antehall / Gala Mirrorhall: Cash here → Sight
  const site = siteOf(state.altitudes[altitude], side);
  if (site === "velvet_antehall" || site === "gala_mirrorhall") {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }
  // Coinface Charm: Cash → draw
  if (u.grafts.some((g) => g.cardId === "coinface_charm")) {
    drawOne(state, side);
  }
}

/** Fold: own Witness while Wagered — clear, no refund. */
function foldWager(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  u: BoardUnit,
): void {
  if (!u.wagered) return;
  const cardId = u.cardId;
  clearWager(u);
  push(state, { type: "fold", side, altitude, cardId });
}

function controlsWageredFigure(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u?.wagered && getCard(u.cardId).type === "figure") return true;
  }
  return false;
}

// --- Bellward Toll (Toll / Lure / Resonance) ---

function altitudeIsTolled(state: MatchState, altitude: Altitude): boolean {
  return state.tollOwner[altitude] != null;
}

function anyAltitudeTolled(state: MatchState): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (state.tollOwner[a as Altitude] != null) return true;
  }
  return false;
}

/** Place a Toll mark owned by `side`. Fails if already Tolled. */
function placeToll(state: MatchState, side: Side, altitude: Altitude): boolean {
  if (state.tollOwner[altitude] != null) return false;
  state.tollOwner[altitude] = side;
  push(state, { type: "toll", side, altitude });
  notifyOnTollPlaced(state, side, altitude);
  return true;
}

function placeTollPrefer(
  state: MatchState,
  side: Side,
  preferred: Altitude[],
): boolean {
  for (const a of preferred) {
    if (placeToll(state, side, a)) return true;
  }
  return false;
}

function notifyOnTollPlaced(state: MatchState, side: Side, altitude: Altitude): void {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u?.veiled && u.cardId === "path_bellman") {
      state.pathBellmanBuff[side] = true;
    }
  }
  const host = unitOf(state.altitudes[altitude], side);
  if (host?.grafts.some((g) => g.cardId === "bellcord_charm")) {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }
}

/**
 * Toll trap touch.
 * Enemy Witness/Gaze (via tryPayToll): tax Sight if able, owner +1 Sight if paid, Resonance, mark STAYS.
 * Resolve lose / own Lure: clear after tax/Resonance (combat spends the trap).
 * Pass `clear: true` to clear (Resolve, Lure). Default sticky for enemy Witness/Gaze.
 */
function tryPayToll(
  state: MatchState,
  payer: Side,
  altitude: Altitude,
  opts: { clear?: boolean } = {},
): void {
  const owner = state.tollOwner[altitude];
  if (!owner) return;
  const enemyTouch = payer !== owner;
  const clear = opts.clear === true || !enemyTouch;
  let paid = false;
  if (enemyTouch && sightOf(state, payer) >= 1) {
    setSight(state, payer, sightOf(state, payer) - 1);
    paid = true;
  }
  push(state, { type: "toll_pay", side: payer, altitude, paid });
  if (enemyTouch && paid) {
    setSight(state, owner, Math.min(SIGHT_CARRY_CAP, sightOf(state, owner) + 1));
  }
  for (const siteSide of ["player", "enemy"] as Side[]) {
    if (siteOf(state.altitudes[altitude], siteSide) === "cloth_bellspire") {
      setSight(state, siteSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, siteSide) + 1));
    }
  }
  if (enemyTouch) {
    const host = unitOf(state.altitudes[altitude], owner);
    if (host && !host.veiled && host.grafts.some((g) => g.cardId === "siren_cord")) {
      setSight(state, owner, Math.min(SIGHT_CARRY_CAP, sightOf(state, owner) + 1));
      if (altitude === 1) drawOne(state, owner);
    }
  }
  fireResonance(state, owner, altitude);
  if (clear) {
    if (state.pealArmed[altitude]) {
      // Resolve spend (loser touches owner Toll) → Peal pays.
      // Own Lure clear → fizzle unless Banner Bellwalk.
      const resolveSpend = opts.clear === true && enemyTouch;
      const bannerLure =
        opts.clear === true &&
        !enemyTouch &&
        controlsSiteId(state, owner, "banner_bellwalk");
      if (resolveSpend || bannerLure) payPeal(state, owner, altitude);
      else fizzlePeal(state, altitude);
    }
    state.tollOwner[altitude] = null;
  }
}

/**
 * Thin Resonance — Toll touch/clear or Lure. Cantor/Carillon/Choir Sight; Bellcord draw.
 */
function fireResonance(state: MatchState, side: Side, altitude: Altitude): void {
  push(state, { type: "resonance", side, altitude });
  if (controlsSiteId(state, side, "choir_loft")) {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const alt = a as Altitude;
    const u = unitOf(state.altitudes[alt], side);
    if (!u || getCard(u.cardId).type !== "figure") continue;
    if (u.cardId === "clapper_cantor" && u.veiled) {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    }
    if (u.cardId === "carillon" && u.veiled) {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    }
    if (!u.veiled && u.grafts.some((g) => g.cardId === "bellcord_charm")) {
      drawOne(state, side);
    }
  }
}

// --- Scar Breach (Open / Breach) ---

function isBreachFigure(u: BoardUnit | null | undefined): boolean {
  if (!u) return false;
  const d = getCard(u.cardId);
  return d.heresy === "breach" && d.type === "figure";
}

function controlsWitnessedSkaroth(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && !u.veiled && u.cardId === "skaroth") return true;
  }
  return false;
}

function controlsWitnessedFigure(state: MatchState, side: Side, exceptAlt?: Altitude): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (exceptAlt !== undefined && a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && !u.veiled && getCard(u.cardId).type === "figure") return true;
  }
  return false;
}

function dealWillToOpponent(state: MatchState, side: Side, n: number): void {
  if (n <= 0) return;
  if (side === "player") state.enemyWill -= n;
  else state.will -= n;
}

/** Breach Will after soft Resolve — empty lanes and normal Veiled foes return 0.
 * Exception: Veiled Motley Stance B still takes Breach (agro pierce vs Trick walls).
 * At most two Breach payouts per side per Resolve (riders still cap each hit at 2 Will). */
function breachBonusWill(
  state: MatchState,
  side: Side,
  u: BoardUnit,
  altitude: Altitude,
): number {
  if (u.veiled || !isBreachFigure(u)) return 0;
  if (state.breachDealtThisResolve[side] >= 2) return 0;
  const foe = unitOf(state.altitudes[altitude], other(side));
  if (!foe) return 0;
  if (foe.veiled) {
    const pierceTrickWall =
      foe.stanceB &&
      getCard(foe.cardId).heresy === "motley" &&
      getCard(foe.cardId).type === "figure";
    if (!pierceTrickWall) return 0;
  }
  let extra = 0;
  if (u.cardId === "highscar_lancer" && altitude === 0) extra = Math.max(extra, 1);
  if (state.fullBreachArmed[side]) extra = Math.max(extra, 1);
  // Skaroth Witnessed aura: other Scar Breach Figures only (not Skaroth itself)
  if (u.cardId !== "skaroth" && controlsWitnessedSkaroth(state, side)) extra = Math.max(extra, 1);
  // Cap: shared Breach 1 + at most one rider (max 2 Will Breach on each payout)
  return 1 + extra;
}

function noteBreachWillDealt(state: MatchState, side: Side, amount: number): void {
  if (amount <= 0) return;
  const first = state.breachDealtThisResolve[side] === 0;
  state.breachDealtThisResolve[side] += 1;
  if (!first) return;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u?.veiled && u.cardId === "ember_herald") {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      break;
    }
  }
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u?.veiled && u.cardId === "skaroth") {
      state.skarothPowerArmed[side] = true;
      break;
    }
  }
}

/**
 * Overexpose — agro Bust: lose Resolve while Witnessed after Opening this round.
 * First payout per side per Resolve. Shared: lose 1 Sight and 1 Will; cards may print more.
 */
function applyOverexpose(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  u: BoardUnit,
  _strains: { side: Side; altitude: Altitude; cardId: string }[],
): void {
  if (u.veiled || !isBreachFigure(u) || !u.openedSinceResolve) return;
  if (state.overexposeTakenThisResolve[side]) return;
  state.overexposeTakenThisResolve[side] = true;

  if (sightOf(state, side) > 0) {
    setSight(state, side, sightOf(state, side) - 1);
  }
  if (side === "player") state.will = Math.max(0, state.will - 1);
  else state.enemyWill = Math.max(0, state.enemyWill - 1);

  // Ashcoil: first Overexpose → +1 power until Resolve (shared max +2 pool)
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const blade = unitOf(state.altitudes[a as Altitude], side);
    if (blade?.veiled && blade.cardId === "ashcoil_blade") {
      state.ashcoilBuff[side] = Math.min(2, state.ashcoilBuff[side] + 1);
      break;
    }
  }

  if (u.cardId === "highscar_lancer" && altitude === 0) {
    // High Open risk: extra self Will chip (on top of shared Overexpose Will)
    if (side === "player") state.will = Math.max(0, state.will - 1);
    else state.enemyWill = Math.max(0, state.enemyWill - 1);
  }

  if (u.cardId === "cliffbrand_captain" && altitude === 0) {
    drawOne(state, other(side));
  }

  if (u.cardId === "skaroth") {
    const foe = other(side);
    setSight(state, foe, Math.min(SIGHT_CARRY_CAP, sightOf(state, foe) + 1));
  }

  if (state.fullBreachArmed[side]) {
    if (side === "player") state.will = Math.max(0, state.will - 1);
    else state.enemyWill = Math.max(0, state.enemyWill - 1);
  }

  if (u.lastBreachOpened) {
    drawOne(state, side);
  }

  push(state, { type: "overexpose", side, altitude, cardId: u.cardId });
}

function clearBreachOpenFlags(state: MatchState): void {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    for (const side of ["player", "enemy"] as Side[]) {
      const u = unitOf(state.altitudes[a as Altitude], side);
      if (!u) continue;
      u.openedSinceResolve = false;
      u.lastBreachOpened = false;
    }
  }
}

function pickOtherFriendlyVeiledFigure(
  state: MatchState,
  side: Side,
  exceptAlt?: Altitude,
): Altitude | null {
  for (const prefer of [1, 0, 2] as Altitude[]) {
    if (exceptAlt !== undefined && prefer === exceptAlt) continue;
    const u = unitOf(state.altitudes[prefer], side);
    if (u?.veiled && getCard(u.cardId).type === "figure") return prefer;
  }
  return null;
}

/**
 * Open — true Witness on your own Figure/Vessel (Revelation fires).
 * `free` ignores Sight cost; `discount` reduces effective cost (min 0).
 */
function openOwnFigure(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  opts: { free?: boolean; discount?: number } = {},
): boolean {
  const slot = state.altitudes[altitude];
  if (slot.blinded) return false;
  const u = unitOf(slot, side);
  if (!u || !u.veiled) return false;
  const def = getCard(u.cardId);
  if (def.type !== "figure" && def.type !== "vessel") return false;
  let cost = witnessCostAt(altitude, def.witnessCost, false);
  if (opts.free) cost = 0;
  else if (opts.discount) cost = Math.max(0, cost - opts.discount);
  if (sightOf(state, side) < cost) return false;

  setSight(state, side, sightOf(state, side) - cost);
  applySmotherSightTax(state, side);

  const foldAfter = u.wagered;
  u.veiled = false;
  u.scrutiny = 0;
  u.openedSinceResolve = true;
  state.witnessedHeresiesThisTurn.push(def.heresy);
  if (!u.revelationFired) {
    applyRevelation(state, side, side, altitude, u, false);
    u.revelationFired = true;
  }
  if (foldAfter && u.wagered) foldWager(state, side, altitude, u);
  onFriendlyFigureOpened(state, side, altitude, u);
  if (altitude === 1 && def.type === "figure") drawOne(state, side);
  push(state, { type: "witness", side, altitude, cardId: def.id });
  return true;
}

function onFriendlyFigureOpened(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  opened: BoardUnit,
): void {
  if (getCard(opened.cardId).type !== "figure") return;

  // Scarforge / Banner Drill / Openwell on this altitude
  if (siteOf(state.altitudes[altitude], side) === "scarforge") {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }
  if (siteOf(state.altitudes[altitude], side) === "banner_drill") {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }
  if (siteOf(state.altitudes[altitude], side) === "openwell") {
    const foe = other(side);
    if (sightOf(state, foe) > 0) setSight(state, foe, sightOf(state, foe) - 1);
  }

  // Rivet Charm on host
  if (opened.grafts.some((g) => g.cardId === "rivet_charm")) {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }

  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const alt = a as Altitude;
    const u = unitOf(state.altitudes[alt], side);
    if (!u) continue;
    if (u === opened) continue;
    if (u.veiled && u.cardId === "scarsteel_cleaver") {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    }
    if (u.veiled && u.cardId === "ashcoil_blade") {
      state.ashcoilBuff[side] = Math.min(2, state.ashcoilBuff[side] + 1);
    }
    if (u.veiled && u.cardId === "skaroth") {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    }
    if (u.veiled && u.cardId === "cliffbrand_captain" && alt === 0) {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    }
  }
}

function applyLowscarWitnessTax(
  state: MatchState,
  witnesser: Side,
  altitude: Altitude,
): void {
  if (altitude !== 2) return;
  const owner = other(witnesser);
  const warden = unitOf(state.altitudes[2], owner);
  if (!warden || warden.veiled || warden.cardId !== "lowscar_warden") return;
  if (sightOf(state, witnesser) < 1) return;
  setSight(state, witnesser, sightOf(state, witnesser) - 1);
}

function notifySlagReaperOnStrain(state: MatchState, strainedSide: Side): void {
  const owner = other(strainedSide);
  if (state.slagStrainDrawUsed[owner]) return;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], owner);
    if (u?.veiled && u.cardId === "slag_reaper") {
      drawOne(state, owner);
      state.slagStrainDrawUsed[owner] = true;
      return;
    }
  }
}

function anyEnemyStrained(state: MatchState, side: Side): boolean {
  const foe = other(side);
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], foe);
    if (u && !u.veiled && u.strained && getCard(u.cardId).type === "figure") return true;
  }
  return false;
}

function notifyVeilRingerOnEnemyWitness(
  state: MatchState,
  witnesser: Side,
  altitude: Altitude,
): void {
  if (!altitudeIsTolled(state, altitude)) return;
  const owner = other(witnesser);
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], owner);
    if (u?.veiled && u.cardId === "veil_ringer") {
      setSight(state, owner, Math.min(SIGHT_CARRY_CAP, sightOf(state, owner) + 1));
      return;
    }
  }
}

function hasVeiledRopeAuditor(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u?.veiled && u.cardId === "rope_auditor") return true;
  }
  return false;
}

/** Rope Auditor: first enemy Witness/Lure on a Tolled altitude costs +1 Sight. */
function applyRopeAuditorTax(state: MatchState, actor: Side, altitude: Altitude): void {
  if (!altitudeIsTolled(state, altitude)) return;
  const taxOwner = other(actor);
  if (state.ropeAuditorTaxUsed[taxOwner]) return;
  if (!hasVeiledRopeAuditor(state, taxOwner)) return;
  if (sightOf(state, actor) < 1) return;
  setSight(state, actor, sightOf(state, actor) - 1);
  state.ropeAuditorTaxUsed[taxOwner] = true;
}

/**
 * Lure — force a true Witness (Revelation fires). No Gaze required.
 * Pays printed Witness cost from lureSide. Fires Resonance for lureSide.
 */
function lureWitness(state: MatchState, lureSide: Side, altitude: Altitude): boolean {
  const targetSide = other(lureSide);
  if (state.altitudes[altitude].blinded) return false;
  const slot = state.altitudes[altitude];
  const u = unitOf(slot, targetSide);
  if (!u || !u.veiled) return false;
  const def = getCard(u.cardId);
  if (def.type !== "figure" && def.type !== "vessel") return false;
  const cost = witnessCostAt(altitude, def.witnessCost, true);
  if (sightOf(state, lureSide) < cost) return false;

  setSight(state, lureSide, sightOf(state, lureSide) - cost);
  applySmotherSightTax(state, lureSide);
  applyRopeAuditorTax(state, lureSide, altitude);

  if (u.wagered) applyBust(state, targetSide, altitude, u);

  u.veiled = false;
  u.scrutiny = 0;
  state.witnessedHeresiesThisTurn.push(def.heresy);
  if (!u.revelationFired) {
    applyRevelation(state, lureSide, targetSide, altitude, u, true);
    u.revelationFired = true;
  }
  onEnemyFigureBecameWitnessed(state, targetSide, altitude, u);
  notifyVeilRingerOnEnemyWitness(state, lureSide, altitude);
  tryPayToll(state, lureSide, altitude, { clear: true });
  if (controlsSiteId(state, lureSide, "banner_bellwalk")) {
    setSight(state, lureSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, lureSide) + 1));
  }
  // Carillon Witnessed: Lure → Blind that altitude
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const c = unitOf(state.altitudes[a as Altitude], lureSide);
    if (c && !c.veiled && c.cardId === "carillon") {
      blindAltitude(state, lureSide, altitude);
      break;
    }
  }
  fireResonance(state, lureSide, altitude);
  push(state, { type: "lure", side: lureSide, altitude, cardId: def.id });
  push(state, {
    type: "witness",
    side: lureSide,
    altitude,
    cardId: def.id,
    enemyTarget: true,
  });
  return true;
}

/** Pick best enemy Veiled Figure for Bell Siren Lure (prefer Mid, else any). */
function lureBestEnemyVeiled(state: MatchState, lureSide: Side): Altitude | null {
  const mid = unitOf(state.altitudes[1], other(lureSide));
  if (mid?.veiled && getCard(mid.cardId).type === "figure") return 1;
  for (const a of [0, 2] as Altitude[]) {
    const u = unitOf(state.altitudes[a], other(lureSide));
    if (u?.veiled && getCard(u.cardId).type === "figure") return a;
  }
  return null;
}

/** Masked Usher: enemy Forced Exposed elsewhere → Free Wager this. */
function notifyMaskedUsherOnForcedExpose(
  state: MatchState,
  exposedSide: Side,
  exposedAlt: Altitude,
): void {
  const owner = other(exposedSide);
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exposedAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], owner);
    if (u?.veiled && u.cardId === "masked_usher") {
      freeWagerUnit(state, owner, a as Altitude, u);
      return;
    }
  }
}

function bounceCardsReturning(u: BoardUnit): number {
  return 1 + u.grafts.length + (u.inhabitant ? 1 : 0);
}

/** Overwrite: return own unit to hand (no Fall). Grafts + Inhabitant return as separate cards. */
function bounceOwnToHand(state: MatchState, side: Side, altitude: Altitude): string | null {
  const slot = state.altitudes[altitude];
  const u = unitOf(slot, side);
  if (!u) return null;
  const hand = handOf(state, side);
  const bouncedId = u.cardId;
  hand.push(u.cardId);
  if (u.inhabitant) hand.push(u.inhabitant);
  for (const g of u.grafts) hand.push(g.cardId);
  setUnit(slot, side, null);
  push(state, { type: "overwrite", side, altitude, bouncedId });
  return bouncedId;
}

/**
 * Veiled Hold → Scrutiny. At SCRUTINY_FORCE: Forced Exposed (no Revelation) + Strain.
 * Motley Stance B does not block Scrutiny. Smile That Holds can cancel first Forced Exposed.
 */
function applyScrutinyOnHold(
  state: MatchState,
  loser: BoardUnit,
  loserSide: Side,
  altitude: Altitude,
  strains: { side: Side; altitude: Altitude; cardId: string }[],
): void {
  if (!loser.veiled) return;
  loser.scrutiny = Math.min(SCRUTINY_FORCE, loser.scrutiny + 1);
  push(state, {
    type: "scrutiny",
    side: loserSide,
    altitude,
    cardId: loser.cardId,
    stacks: loser.scrutiny,
  });
  if (loser.scrutiny < SCRUTINY_FORCE) return;

  if (state.falseFaceArmed[loserSide]) {
    state.falseFaceArmed[loserSide] = false;
    setSight(state, loserSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, loserSide) + 1));
    return;
  }

  forceExpose(loser);
  onForcedExposed(state, loser, loserSide, altitude, other(loserSide));
  if (!loser.strained) {
    loser.strained = true;
    strains.push({ side: loserSide, altitude, cardId: loser.cardId });
  }
}

/** Teach / dual-mode Veiled Hold payoffs. */
function applyVeiledHoldAbility(
  state: MatchState,
  u: BoardUnit,
  side: Side,
  altitude: Altitude,
): void {
  if (!u.veiled) return;
  // Well Cantor: ally Hold in another altitude stains Cantor's lane (any veil state)
  notifyWellCantorsOnAllyHold(state, side, altitude);
  // Silt Warden: Hold on Low vs Stained → Blind Low
  if (u.cardId === "silt_warden" && altitude === 2) {
    const foe = unitOf(state.altitudes[2], other(side));
    if (foe?.stained && getCard(foe.cardId).type === "figure") {
      blindAltitude(state, side, 2);
    }
  }
  // Whitecard Mummer: Hold → enter Stance B
  if (u.cardId === "whitecard_mummer") {
    enterStanceB(state, side, altitude, u);
  }
  // Split-Hymn Cantor: Hold → Switch Stance on another friendly
  if (u.cardId === "split_hymn_cantor") {
    switchOtherStance(state, side, altitude);
  }
  // Pit Capper: Hold on Low with a Wagered Figure → Blind Low
  if (u.cardId === "pit_capper" && altitude === 2 && controlsWageredFigure(state, side)) {
    blindAltitude(state, side, 2);
  }
  // Bell Debt Walker: Hold → Toll this altitude
  if (u.cardId === "bell_debt_walker") {
    placeToll(state, side, altitude);
  }
  // Litany Debtor: Hold on Tolled altitude → draw 1
  if (u.cardId === "parasol_debtor" && altitudeIsTolled(state, altitude)) {
    drawOne(state, side);
  }
  // Lowcloth Warden: Hold on Low while Low Tolled → Blind Low
  if (u.cardId === "lowcloth_warden" && altitude === 2 && altitudeIsTolled(state, 2)) {
    blindAltitude(state, side, 2);
  }
  // Ember Banner: Hold → Sight
  if (u.cardId === "ember_banner") {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }
  // Lowscar Warden: Hold on Low while another friendly Witnessed → Blind Low
  if (
    u.cardId === "lowscar_warden" &&
    altitude === 2 &&
    controlsWitnessedFigure(state, side, 2)
  ) {
    blindAltitude(state, side, 2);
  }
}

/** Teach / dual-mode Veiled Resolve-win payoffs. */
function applyVeiledWinAbility(
  state: MatchState,
  u: BoardUnit,
  side: Side,
  altitude: Altitude,
): void {
  if (!u.veiled) return;
  if (u.cardId === "smother_bride") {
    const foe = unitOf(state.altitudes[altitude], other(side));
    if (foe?.stained && getCard(foe.cardId).type === "figure") {
      blindAltitude(state, side, altitude);
    }
  } else if (u.cardId === "mire_duelist") {
    const foe = unitOf(state.altitudes[altitude], other(side));
    if (foe?.stained && getCard(foe.cardId).type === "figure") {
      drawOne(state, side);
    }
  } else if (u.cardId === "cliff_maw" && altitude === 0) {
    drawOne(state, side);
  } else if (u.cardId === "diamond_widow" && u.stanceB && u.wagered) {
    drawOne(state, side);
    drawOne(state, side);
  } else if (u.cardId === "favor_broker" && u.stanceB && u.wagered) {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  } else if (u.cardId === "rivet_vanguard") {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }
}

function notifyWellCantorsOnAllyHold(
  state: MatchState,
  holderSide: Side,
  holderAlt: Altitude,
): void {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === holderAlt) continue;
    const cantor = unitOf(state.altitudes[a as Altitude], holderSide);
    if (!cantor?.veiled || cantor.cardId !== "well_cantor") continue;
    const foe = unitOf(state.altitudes[a as Altitude], other(holderSide));
    if (foe && getCard(foe.cardId).type === "figure") {
      stainUnit(state, foe);
    }
  }
}

function countOtherFriendlyVeiledInk(
  state: MatchState,
  side: Side,
  exceptAlt: Altitude,
): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (
      u?.veiled &&
      getCard(u.cardId).heresy === "ink" &&
      getCard(u.cardId).type === "figure"
    ) {
      n += 1;
    }
  }
  return n;
}

/**
 * Blot Herald (Veiled): enemy Figure in another altitude becomes Witnessed → Stain it.
 */
function onEnemyFigureBecameWitnessed(
  state: MatchState,
  hostSide: Side,
  altitude: Altitude,
  u: BoardUnit,
): void {
  if (getCard(u.cardId).type !== "figure") return;
  const heraldSide = other(hostSide);
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === altitude) continue;
    const herald = unitOf(state.altitudes[a as Altitude], heraldSide);
    if (herald?.veiled && herald.cardId === "blot_herald") {
      stainUnit(state, u);
      return;
    }
  }
}

/** Smother Bride Witnessed: first Sight spend on Witness/Gaze costs +1 Sight. */
function applySmotherSightTax(state: MatchState, witnesser: Side): void {
  const brideOwner = other(witnesser);
  if (state.smotherTaxUsed[brideOwner]) return;
  let brideUp = false;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const b = unitOf(state.altitudes[a as Altitude], brideOwner);
    if (b && !b.veiled && b.cardId === "smother_bride") {
      brideUp = true;
      break;
    }
  }
  if (!brideUp) return;
  const s = sightOf(state, witnesser);
  if (s < 1) return;
  setSight(state, witnesser, s - 1);
  state.smotherTaxUsed[brideOwner] = true;
}

function findUnitAltitude(state: MatchState, u: BoardUnit): Altitude | null {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const slot = state.altitudes[a as Altitude];
    if (slot.player === u || slot.enemy === u) return a as Altitude;
  }
  return null;
}

/**
 * Move a Stain from one enemy Figure to another enemy Figure (any veil state).
 * Returns the new host, or null.
 */
function moveEnemyStainToAny(state: MatchState, side: Side): BoardUnit | null {
  const foe = other(side);
  let from: BoardUnit | null = null;
  let fromAlt: Altitude | null = null;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], foe);
    if (u?.stained && getCard(u.cardId).type === "figure") {
      from = u;
      fromAlt = a as Altitude;
      break;
    }
  }
  if (!from || fromAlt === null) return null;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === fromAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], foe);
    if (u && getCard(u.cardId).type === "figure") {
      from.stained = false;
      stainUnit(state, u);
      return u;
    }
  }
  return null;
}

function stainUnit(state: MatchState, u: BoardUnit): void {
  const was = u.stained;
  u.stained = true;
  if (was) return;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const slot = state.altitudes[a as Altitude];
    if (slot.player === u) {
      push(state, { type: "stain", side: "player", altitude: a as Altitude, cardId: u.cardId });
      return;
    }
    if (slot.enemy === u) {
      push(state, { type: "stain", side: "enemy", altitude: a as Altitude, cardId: u.cardId });
      return;
    }
  }
}

function forceExpose(u: BoardUnit): void {
  u.veiled = false;
}

function anyEnemyStained(state: MatchState, side: Side): boolean {
  const foe = other(side);
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], foe);
    if (u && u.stained && getCard(u.cardId).type === "figure") return true;
  }
  return false;
}

function countEnemyStainedFigures(state: MatchState, side: Side): number {
  const foe = other(side);
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], foe);
    if (u && u.stained && getCard(u.cardId).type === "figure") n += 1;
  }
  return n;
}

/** Maw Pilgrim: prefer another altitude; fall back to any. */
function stainEnemyVeiledPreferOther(
  state: MatchState,
  side: Side,
  exceptAlt: Altitude,
): boolean {
  const foe = other(side);
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], foe);
    if (u && u.veiled && getCard(u.cardId).type === "figure") {
      stainUnit(state, u);
      return true;
    }
  }
  return stainEnemyVeiled(state, side, exceptAlt);
}

/** Stain one enemy Veiled Figure (prefer altitude, else any). */
function stainEnemyVeiled(state: MatchState, side: Side, preferAlt?: Altitude): boolean {
  const foe = other(side);
  const tryAlt = (a: number): boolean => {
    const u = unitOf(state.altitudes[a as Altitude], foe);
    if (u && u.veiled && getCard(u.cardId).type === "figure") {
      stainUnit(state, u);
      if (siteOf(state.altitudes[a as Altitude], side) === "blackwater_shrine") {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
      return true;
    }
    return false;
  };
  if (preferAlt !== undefined && tryAlt(preferAlt)) return true;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (preferAlt !== undefined && a === preferAlt) continue;
    if (tryAlt(a)) return true;
  }
  return false;
}

function stainEnemyAt(state: MatchState, side: Side, altitude: Altitude): BoardUnit | null {
  const u = unitOf(state.altitudes[altitude], other(side));
  if (u && getCard(u.cardId).type === "figure") {
    stainUnit(state, u);
    if (siteOf(state.altitudes[altitude], side) === "blackwater_shrine") {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    }
    return u;
  }
  return null;
}

function stainAllEnemyVeiled(state: MatchState, side: Side): void {
  const foe = other(side);
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], foe);
    if (u && u.veiled && getCard(u.cardId).type === "figure") stainUnit(state, u);
  }
}

/** Stain an enemy Veiled Figure not on exceptAlt (Smother Cord chain). */
function stainOtherEnemyVeiled(state: MatchState, side: Side, exceptAlt: Altitude): boolean {
  const foe = other(side);
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], foe);
    if (u && u.veiled && getCard(u.cardId).type === "figure") {
      stainUnit(state, u);
      return true;
    }
  }
  return stainEnemyVeiled(state, side);
}

function controlsInkSite(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const sid = siteOf(state.altitudes[a as Altitude], side);
    if (sid && getCard(sid).heresy === "ink" && getCard(sid).type === "site") return true;
  }
  return false;
}

function controlsMotleySite(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const sid = siteOf(state.altitudes[a as Altitude], side);
    if (sid && getCard(sid).heresy === "motley" && getCard(sid).type === "site") return true;
  }
  return false;
}

function controlsInkSiteOrVessel(state: MatchState, side: Side): boolean {
  if (controlsInkSite(state, side)) return true;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).heresy === "ink" && getCard(u.cardId).type === "vessel") return true;
  }
  return false;
}

function controlsInkVessel(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).heresy === "ink" && getCard(u.cardId).type === "vessel") return true;
  }
  return false;
}

function hasBlotLens(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u?.grafts.some((g) => g.cardId === "blot_lens")) return true;
  }
  return false;
}

/** Blind an altitude; Blot Lens pays Sight (and Low draw) if a Stained enemy is there. */
function blindAltitude(state: MatchState, side: Side, altitude: Altitude): void {
  markBlind(state, altitude);
  const foe = unitOf(state.altitudes[altitude], other(side));
  if (foe?.stained && getCard(foe.cardId).type === "figure" && hasBlotLens(state, side)) {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    if (altitude === 2) drawOne(state, side);
  }
  notifyBlindfoldCharm(state, side, altitude);
}

function markBlind(state: MatchState, altitude: Altitude): void {
  const slot = state.altitudes[altitude];
  const was = slot.blinded;
  slot.blinded = true;
  if (!was) push(state, { type: "blind", altitude });
}

/** Ink Abyss Stainwell: Stain enemy Veiled occupant here. */
function applyStainwell(state: MatchState, siteSide: Side, altitude: Altitude): void {
  const slot = state.altitudes[altitude];
  if (siteOf(slot, siteSide) !== "stainwell") return;
  const foe = unitOf(slot, other(siteSide));
  if (foe && foe.veiled && getCard(foe.cardId).type === "figure") stainUnit(state, foe);
}

/** Stain an enemy Figure not on exceptAlt (prefer unstained). */
function stainOtherEnemyFigure(
  state: MatchState,
  side: Side,
  exceptAlt: Altitude,
): boolean {
  const foe = other(side);
  for (let pass = 0; pass < 2; pass++) {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === exceptAlt) continue;
      const u = unitOf(state.altitudes[a as Altitude], foe);
      if (!u || getCard(u.cardId).type !== "figure") continue;
      if (pass === 0 && u.stained) continue;
      stainEnemyAt(state, side, a as Altitude);
      return true;
    }
  }
  return false;
}

/**
 * Pale Bailiff (Veiled): enemy Forced Exposed in another altitude → Stain a different enemy Figure.
 */
function notifyPaleBailiffOnForcedExpose(
  state: MatchState,
  bailiffOwner: Side,
  exposedAlt: Altitude,
): void {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exposedAlt) continue;
    const bailiff = unitOf(state.altitudes[a as Altitude], bailiffOwner);
    if (!bailiff?.veiled || bailiff.cardId !== "pale_bailiff") continue;
    stainOtherEnemyFigure(state, bailiffOwner, exposedAlt);
    return;
  }
}

/** Payoffs after Forced Exposed (Erase finish / Wave 2). */
function onForcedExposed(
  state: MatchState,
  exposed: BoardUnit,
  exposedSide: Side,
  altitude: Altitude,
  winnerSide: Side,
): void {
  const slot = state.altitudes[altitude];
  for (const siteSide of ["player", "enemy"] as Side[]) {
    if (siteOf(slot, siteSide) === "blackwater_shrine" && exposedSide !== siteSide) {
      setSight(state, siteSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, siteSide) + 1));
    }
    // Stainwell: Forced Exposed of Stained enemy here → Sight
    if (siteOf(slot, siteSide) === "stainwell" && exposedSide !== siteSide && exposed.stained) {
      setSight(state, siteSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, siteSide) + 1));
    }
  }
  notifyPaleBailiffOnForcedExpose(state, winnerSide, altitude);
  // Dahaka Veiled: Forced Expose → Sight · Witnessed: Blind that altitude
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const d = unitOf(state.altitudes[a as Altitude], winnerSide);
    if (!d || d.cardId !== "dahaka") continue;
    if (d.veiled) {
      setSight(state, winnerSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, winnerSide) + 1));
    } else {
      blindAltitude(state, winnerSide, altitude);
    }
    break;
  }
  if (exposed.cardId === "gulf_urn") {
    const stained = stainEnemyVeiled(state, exposedSide);
    if (stained) {
      // Blind the altitude of a freshly stained foe — prefer any stained veiled now
      const foe = other(exposedSide);
      for (let a = 0; a < ALTITUDE_COUNT; a++) {
        const u = unitOf(state.altitudes[a as Altitude], foe);
        if (u?.stained && getCard(u.cardId).type === "figure") {
          blindAltitude(state, exposedSide, a as Altitude);
          break;
        }
      }
    }
  }
  const winner = unitOf(slot, winnerSide);
  if (winner?.grafts.some((g) => g.cardId === "smother_cord")) {
    stainOtherEnemyVeiled(state, winnerSide, altitude);
    if (altitude === 1) {
      setSight(state, winnerSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, winnerSide) + 1));
    }
  }
  // Motley: Bust if Forced Exposed while Wagered (Scrutiny / Erase path callers also Bust —
  // skip if already cleared; applyBust is idempotent via wagered check)
  if (exposed.wagered) {
    applyBust(state, exposedSide, altitude, exposed);
  }
  notifyMaskedUsherOnForcedExpose(state, exposedSide, altitude);
  // Masque Urn: Forced Exposed → Free Wager another friendly
  if (exposed.cardId === "masque_urn") {
    freeWagerOtherFigure(state, exposedSide, altitude);
  }
}

/**
 * Veiled loser: Hold, unless Stained (Erase) or winner's False Hold —
 * then Forced Exposed + Strain on this same loss.
 * Motley Smile That Holds: cancel the first Forced Exposed against the loser.
 * Motley Trick: Stance B Veiled Motley Holds against Erase (jester commitment).
 */
function handleVeiledLoser(
  state: MatchState,
  loser: BoardUnit,
  winnerSide: Side,
  altitude: Altitude,
  strains: { side: Side; altitude: Altitude; cardId: string }[],
  loserSide: Side,
): void {
  const armed = state.falseHoldArmed[winnerSide];
  const pressPierce = loser.pressed && loser.pressedBy === winnerSide;
  if (!loser.stained && !armed && !pressPierce) return;
  if (state.falseFaceArmed[loserSide]) {
    state.falseFaceArmed[loserSide] = false;
    setSight(state, loserSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, loserSide) + 1));
    if (loser.grafts.some((g) => g.cardId === "falseface_locket")) {
      setSight(state, loserSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, loserSide) + 1));
    }
    if (pressPierce && loser.pressedBy) {
      applyPressBacklash(state, loser.pressedBy, altitude, loser);
    }
    return;
  }
  // Stance B Motley: Hold through Stain / False Hold (Trick answers Erase) — Press pierces once
  if (loser.stanceB && getCard(loser.cardId).heresy === "motley" && !pressPierce) {
    if (loser.grafts.some((g) => g.cardId === "falseface_locket")) {
      setSight(state, loserSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, loserSide) + 1));
    }
    // Hold itself is the answer — Favor income is Cash / rites only (slows seal snowball)
    return;
  }
  if (!loser.stained && armed) {
    state.falseHoldArmed[winnerSide] = false;
    stainUnit(state, loser);
  }
  const wasPress = pressPierce;
  clearPress(loser);
  forceExpose(loser);
  onForcedExposed(state, loser, loserSide, altitude, winnerSide);
  onEnemyFigureBecameWitnessed(state, loserSide, altitude, loser);
  if (!loser.strained) {
    loser.strained = true;
    strains.push({ side: loserSide, altitude, cardId: loser.cardId });
  }
  if (wasPress) {
    onPressErased(state, winnerSide, altitude, loser);
  }
}

/** Press success riders after Forced Expose. */
function onPressErased(
  state: MatchState,
  presser: Side,
  altitude: Altitude,
  exposed: BoardUnit,
): void {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], presser);
    if (!u) continue;
    if (u.veiled && u.cardId === "pale_bailiff") {
      drawOne(state, presser);
      break;
    }
  }
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], presser);
    if (u?.veiled && u.cardId === "smother_bride") {
      blindAltitude(state, presser, altitude);
      break;
    }
  }
  const here = unitOf(state.altitudes[altitude], presser);
  if (here && (here.veiled || !here.veiled) && here.cardId === "mire_duelist") {
    setSight(state, presser, Math.min(SIGHT_CARRY_CAP, sightOf(state, presser) + 1));
  }
  void exposed;
}

function drawOne(state: MatchState, side: Side): void {
  const deck = deckOf(state, side);
  const hand = handOf(state, side);
  if (deck.length === 0 || hand.length >= HAND_MAX) return;
  const id = deck.pop()!;
  // Prophecy cards sit in the law zone, not the hand
  if (getCard(id).type === "prophecy") {
    propheciesOf(state, side).push(id);
    push(state, { type: "draw", side, cardId: id, to: "law" });
    return;
  }
  hand.push(id);
  push(state, { type: "draw", side, cardId: id, to: "hand" });
}

function essenceOf(state: MatchState, side: Side): number {
  return side === "player" ? state.essence : state.enemyEssence;
}

function setEssence(state: MatchState, side: Side, n: number): void {
  if (side === "player") state.essence = n;
  else state.enemyEssence = n;
}

function sightOf(state: MatchState, side: Side): number {
  return side === "player" ? state.sight : state.enemySight;
}

function setSight(state: MatchState, side: Side, n: number): void {
  if (side === "player") state.sight = n;
  else state.enemySight = n;
}

function other(side: Side): Side {
  return side === "player" ? "enemy" : "player";
}

/** Pull prophecy cards out of a deck into the side's law zone. */
function extractProphecies(deck: string[], into: string[]): string[] {
  const kept: string[] = [];
  for (const id of deck) {
    if (getCard(id).type === "prophecy") into.push(id);
    else kept.push(id);
  }
  return kept;
}

/** Printed face power for current Veil / Stance — no grafts, Sites, or temp buffs. */
export function printedFacePower(u: BoardUnit): number {
  const def = getCard(u.cardId);
  let veiledP = def.veiledPower;
  let witP = def.witnessedPower;
  // Motley: Stance B power-swap only while Wagered (Hold still works without ante)
  const swap =
    u.stanceB && (def.heresy !== "motley" || u.wagered);
  if (swap) {
    const t = veiledP;
    veiledP = witP;
    witP = t;
  }
  return u.veiled ? veiledP : witP;
}

export function unitPower(state: MatchState, altitude: Altitude, side: Side): number {
  const slot = state.altitudes[altitude];
  const u = unitOf(slot, side);
  if (!u) return 0;
  const def = getCard(u.cardId);
  if (u.hybridSite) return 0;

  let p = printedFacePower(u);

  // Pressed: −1 until Resolve (Ink densifies the pierce commit)
  if (u.pressed && def.type === "figure") p -= 1;

  for (const g of u.grafts) {
    const r = getCard(g.cardId);
    if (!u.veiled) p += r.witnessedPower;
  }

  if (siteOf(slot, side) === "veil_banner" && u.veiled && def.type === "figure") p += 1;
  if (siteOf(slot, side) === "stake_mast" && u.veiled && def.type === "figure") p += 1;
  if (siteOf(slot, side) === "branch_rune_reliquary" && !u.veiled && def.type === "figure") p += 1;
  if (siteOf(slot, side) === "low_tide_shrine" && u.veiled && def.type === "vessel") p += 1;
  if (siteOf(slot, side) === "void_gallery" && u.veiled && def.heresy === "hollow" && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "suture_mill" && u.veiled && def.heresy === "graft" && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "mire_gallery" && u.veiled && def.heresy === "deep" && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "stainwell" && def.type === "figure") {
    const foe = unitOf(slot, other(side));
    if (foe?.stained) p += 1;
  }
  // Pale Ledger: +1 while Veiled if any enemy is Stained
  if (u.cardId === "pale_ledger" && def.type === "figure" && u.veiled) {
    if (anyEnemyStained(state, side)) p += 1;
  }
  // Ink Matron: +1 while Veiled on Mid if any enemy Stained
  if (u.cardId === "ink_matron" && def.type === "figure" && u.veiled && altitude === 1) {
    if (anyEnemyStained(state, side)) p += 1;
  }
  // Well Cantor Revelation buff — other Veiled Ink +1 until Resolve
  if (
    def.type === "figure" &&
    def.heresy === "ink" &&
    u.veiled &&
    state.inkChoirBuff[side]
  ) {
    p += 1;
  }
  // Mire Duelist: Witnessed — Stained enemies here −1 power
  if (u.stained && def.type === "figure") {
    const foe = unitOf(slot, other(side));
    if (foe && !foe.veiled && foe.cardId === "mire_duelist") p -= 1;
  }
  // Ink Matron on Mid Witnessed: Ink Figures +1 vs Stained
  if (def.type === "figure" && def.heresy === "ink") {
    const midU = unitOf(state.altitudes[1], side);
    if (midU && !midU.veiled && midU.cardId === "ink_matron") {
      const foe = unitOf(slot, other(side));
      if (foe?.stained) p += 1;
    }
  }
  // Mire Surge: +1 vs Stained until Resolve
  if (def.type === "figure" && state.mireSurgeArmed[side]) {
    const foe = unitOf(slot, other(side));
    if (foe?.stained) p += 1;
  }
  // Gala Warden / Gala Call: Stance B Figures +1 until Resolve
  if (def.type === "figure" && u.stanceB && state.galaSurgeArmed[side]) {
    p += 1;
  }
  // Gala Mirrorhall: Stance B Figures +1 while you have Favor
  if (
    def.type === "figure" &&
    u.stanceB &&
    favorOf(state, side) > 0 &&
    controlsSiteId(state, side, "gala_mirrorhall")
  ) {
    p += 1;
  }
  // Spire Caprice: High + Wagered → +1
  if (u.cardId === "spire_caprice" && u.veiled && u.wagered && altitude === 0) {
    p += 1;
  }
  // Antewell: Wagered Figures here +1
  if (def.type === "figure" && u.wagered && siteOf(slot, side) === "antewell") {
    p += 1;
  }
  // Bell Siren: Mid body — kit occupancy covers Tolled +1; no extra Mid bonus
  // Path Bellman Toll-place buff
  if (u.cardId === "path_bellman" && state.pathBellmanBuff[side]) {
    p += 1;
  }
  // Bellward Trap Tax: your Figures have +1 while you own Toll on this altitude
  if (def.type === "figure" && state.tollOwner[altitude] === side) {
    p += 1;
  }
  // Highscar Lancer: Veiled +1 on High
  if (u.cardId === "highscar_lancer" && u.veiled && altitude === 0) {
    p += 1;
  }
  // Ashcoil Blade Open stacks
  if (u.cardId === "ashcoil_blade" && state.ashcoilBuff[side] > 0) {
    p += state.ashcoilBuff[side];
  }
  // Skaroth first-Breach power
  if (u.cardId === "skaroth" && state.skarothPowerArmed[side]) {
    p += 1;
  }
  // Openwell: Witnessed Figures here +1
  if (def.type === "figure" && !u.veiled && siteOf(slot, side) === "openwell") {
    p += 1;
  }
  // Banner Drill: other Witnessed Figures +1 while Witnessed Figure on Drill
  if (def.type === "figure" && !u.veiled) {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === altitude) continue;
      if (siteOf(state.altitudes[a as Altitude], side) !== "banner_drill") continue;
      const host = unitOf(state.altitudes[a as Altitude], side);
      if (host && !host.veiled && getCard(host.cardId).type === "figure") {
        p += 1;
        break;
      }
    }
  }
  // Ledger Matron: Figures +1 while Eclipse until Resolve
  if (def.type === "figure" && state.debtSurgeArmed[side] && eclipseOf(state, side) > 0) {
    p += 1;
  }
  // Gallery Keeper: Figures +1 while Vessel until Resolve
  if (def.type === "figure" && state.vesselSurgeArmed[side] && hasVesselInPlay(state, side)) {
    p += 1;
  }
  // Encore Flip: +1 until Resolve on buffed altitude
  if (def.type === "figure" && state.encoreBuffAlt[side] === altitude) {
    p += 1;
  }
  // Mesa Duelist: +1 until Resolve on buffed altitude
  if (def.type === "figure" && state.mesaBuffAlt[side] === altitude) {
    p += 1;
  }
  if (siteOf(slot, side) === "mask_gallery" && u.stanceB && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "grinning_colonnade" && u.stanceB && def.type === "figure") {
    p += 2;
  }
  // Bone Mast: Figures here +1 while Inhabitant exists
  if (def.type === "figure" && siteOf(slot, side) === "bone_mast" && hasInhabitantInVessel(state, side)) {
    p += 1;
  }
  // Bone Gallery: Veiled Vessels here +1
  if (u.veiled && def.type === "vessel" && siteOf(slot, side) === "bone_gallery") {
    p += 1;
  }
  // Sovereign of Grins: Witnessed aura — Stance B Figures +1
  if (def.type === "figure" && u.stanceB) {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const sov = unitOf(state.altitudes[a as Altitude], side);
      if (sov && !sov.veiled && sov.cardId === "sovereign_of_grins") {
        p += 1;
        break;
      }
    }
  }
  // Empty Mesa / Recall Gallery: Figures here +1 while you have Eclipse
  if (
    def.type === "figure" &&
    eclipseOf(state, side) > 0 &&
    (siteOf(slot, side) === "empty_mesa" || siteOf(slot, side) === "recall_gallery")
  ) {
    p += 1;
  }
  // Tithe Mast: Figures here +1 while Mid empty of enemy Figure
  if (def.type === "figure" && siteOf(slot, side) === "tithe_mast" && midHasNoEnemyFigure(state, side)) {
    p += 1;
  }
  // Eclipse Sovereign: Witnessed + Eclipse — Dusk Ledger Figures +1
  if (def.type === "figure" && def.heresy === "deal" && eclipseOf(state, side) > 0) {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const sov = unitOf(state.altitudes[a as Altitude], side);
      if (sov && !sov.veiled && sov.cardId === "eclipse_sovereign") {
        p += 1;
        break;
      }
    }
  }
  if (altitude === 2 && u.veiled && def.type === "figure") p += 1;

  // Verdant Cataract: Mid-only aura (not sticky board-wide)
  if (def.type === "figure") {
    const midU = unitOf(state.altitudes[1], side);
    if (midU && !midU.veiled && midU.cardId === "verdant_cataract" && altitude !== 1) {
      p += 1;
    }
  }

  if (u.veiled && def.type === "figure") {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === altitude) continue;
      const otherU = unitOf(state.altitudes[a as Altitude], side);
      if (otherU && !otherU.veiled && otherU.cardId === "stake_sovereign") {
        p += 1;
        break;
      }
    }
  }

  // Wick Throne / Rib Warden: Witnessed — Vessels +1
  if (def.type === "vessel") {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const sov = unitOf(state.altitudes[a as Altitude], side);
      if (
        sov &&
        !sov.veiled &&
        (sov.cardId === "wick_throne" || sov.cardId === "rib_warden")
      ) {
        p += 1;
        break;
      }
    }
  }

  return Math.max(0, p);
}

function controlsGazeAltitude(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (altitudeHasGaze(state, a as Altitude, side)) return true;
  }
  return false;
}

function countGazeAltitudes(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (altitudeHasGaze(state, a as Altitude, side)) n += 1;
  }
  return n;
}

function controlsSiteId(state: MatchState, side: Side, siteId: string): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (siteOf(state.altitudes[a as Altitude], side) === siteId) return true;
  }
  return false;
}

function hasVesselInPlay(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).type === "vessel") return true;
  }
  return false;
}

function hasEmptyVessel(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).type === "vessel" && !u.inhabitant) return true;
  }
  return false;
}

/** Tuck a Figure from hand into the first empty friendly Vessel. Returns true if tucked. */
function tuckIntoEmptyVessel(state: MatchState, side: Side): boolean {
  const hand = handOf(state, side);
  const figIdx = hand.findIndex((id) => getCard(id).type === "figure");
  if (figIdx < 0) return false;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).type === "vessel" && !u.inhabitant) {
      u.inhabitant = hand.splice(figIdx, 1)[0]!;
      noteTuck(state, side);
      return true;
    }
  }
  return false;
}

/** Force-release first Inhabitant from a Vessel to hand. */
function forceReleaseInhabitantToHand(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).type === "vessel" && u.inhabitant) {
      handOf(state, side).push(u.inhabitant);
      u.inhabitant = null;
      return true;
    }
  }
  return false;
}

function noteTuck(state: MatchState, side: Side): void {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (siteOf(state.altitudes[a as Altitude], side) === "inhabit_dock") {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      return;
    }
  }
}

function countDeepCards(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const slot = state.altitudes[a as Altitude];
    const site = siteOf(slot, side);
    if (site && getCard(site).heresy === "deep") n += 1;
    const u = unitOf(slot, side);
    if (u && getCard(u.cardId).heresy === "deep") n += 1;
    if (u) {
      for (const g of u.grafts) {
        if (getCard(g.cardId).heresy === "deep") n += 1;
      }
    }
  }
  return n;
}

function hasStanceBFigure(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && u.stanceB && getCard(u.cardId).type === "figure") return true;
  }
  return false;
}

function hasCubeSite(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const site = siteOf(state.altitudes[a as Altitude], side);
    if (site && getCard(site).heresy === "cube") return true;
  }
  return false;
}

function hasDeepSite(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const site = siteOf(state.altitudes[a as Altitude], side);
    if (site && getCard(site).heresy === "deep") return true;
  }
  return false;
}

function countCoralSites(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const slot = state.altitudes[a as Altitude];
    const site = siteOf(slot, side);
    if (site && getCard(site).heresy === "coral") n += 1;
    const u = unitOf(slot, side);
    // Coral Crown counts as a Coral Site for colony effects
    if (u?.grafts.some((g) => g.cardId === "coral_crown")) n += 1;
  }
  return n;
}

function controlsOtherCoral(state: MatchState, side: Side, exceptAlt: Altitude): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const slot = state.altitudes[a as Altitude];
    const site = siteOf(slot, side);
    if (site && getCard(site).heresy === "coral") return true;
    const u = unitOf(slot, side);
    if (!u) continue;
    if (a !== exceptAlt && getCard(u.cardId).heresy === "coral") return true;
    if (u.grafts.some((g) => getCard(g.cardId).heresy === "coral")) return true;
  }
  return false;
}

function controlsCoral(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const slot = state.altitudes[a as Altitude];
    const site = siteOf(slot, side);
    if (site && getCard(site).heresy === "coral") return true;
    const u = unitOf(slot, side);
    if (u && getCard(u.cardId).heresy === "coral") return true;
    if (u?.grafts.some((g) => getCard(g.cardId).heresy === "coral")) return true;
  }
  return false;
}

function hasGraftSite(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const site = siteOf(state.altitudes[a as Altitude], side);
    if (site && getCard(site).heresy === "graft") return true;
  }
  return false;
}

function hasHollowSite(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const site = siteOf(state.altitudes[a as Altitude], side);
    if (site && getCard(site).heresy === "hollow") return true;
  }
  return false;
}

function countVessels(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).type === "vessel") n += 1;
  }
  return n;
}

function controlsOtherGraft(state: MatchState, side: Side, exceptAlt: Altitude): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const slot = state.altitudes[a as Altitude];
    const site = siteOf(slot, side);
    if (site && getCard(site).heresy === "graft") return true;
    const u = unitOf(slot, side);
    if (!u) continue;
    if (a !== exceptAlt && getCard(u.cardId).heresy === "graft") return true;
    if (u.grafts.some((g) => getCard(g.cardId).heresy === "graft")) return true;
  }
  return false;
}

export function altitudeHasGaze(state: MatchState, altitude: Altitude, side: Side): boolean {
  // Ring owns Gaze — sites + Iris Heliograph only
  const slot = state.altitudes[altitude];
  const site = siteOf(slot, side);
  if (site === "ring_gaze" || site === "parasol_path" || site === "circle_path") return true;
  const u = unitOf(slot, side);
  if (u && !u.veiled && u.cardId === "iris_heliograph") return true;
  // Bellward Toll: owning the Toll mark opens Gaze on that altitude (tax cuts both ways)
  if (state.tollOwner[altitude] === side) return true;
  return false;
}

/** Distinct non-neutral schools Witnessed this action window (for Unblinking Law). */
export function lawHeresyProgress(state: MatchState): number {
  return new Set(state.witnessedHeresiesThisTurn.filter((s) => s !== "neutral")).size;
}

export function sightIncome(state: MatchState, side: Side): number {
  let s = 1;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const slot = state.altitudes[a as Altitude];
    if (slot.blinded) continue;
    const site = siteOf(slot, side);
    if (site) {
      const sd = getCard(site);
      let y = sd.sightYield;
      // High altitude already grants +1 Sight for controlling a Site here (see below).
      // Ring Gaze / Parasol Path print "+1 (+2 on High)" = site 1 + High bonus 1.
      s += y;
      if (a === 0) s += 1;
    }
    const u = unitOf(slot, side);
    if (!u || u.veiled) continue;
    const def = getCard(u.cardId);
    let y = def.sightYield;
    if (u.hybridSite) y = Math.max(y, 2);
    s += y;
    if (a === 0 && !site) s += 1;
  }
  return s;
}

/**
 * Grant resources for a side's action window.
 * @param roundStart — true at match start / after resolve (clears blinds + both pass flags)
 */
export function beginTurn(state: MatchState, side: Side, roundStart = false): void {
  state.active = side;
  state.passed[side] = false;
  state.stanceUsed[side] = false;
  state.reveilUsed[side] = false;
  state.wagerUsed[side] = false;
  state.pressUsed[side] = false;
  state.pealUsed[side] = false;
  state.soundTollPealBonus[side] = false;
  state.debtorBustDrawUsed[side] = false;
  state.favorGainedThisTurn[side] = false;
  // False Hold / Smile That Holds last until your next turn begins
  state.falseHoldArmed[side] = false;
  state.falseFaceArmed[side] = false;
  if (roundStart) {
    state.passed.player = false;
    state.passed.enemy = false;
    state.stanceUsed.player = false;
    state.stanceUsed.enemy = false;
    state.reveilUsed.player = false;
    state.reveilUsed.enemy = false;
    state.wagerUsed.player = false;
    state.wagerUsed.enemy = false;
    state.pressUsed.player = false;
    state.pressUsed.enemy = false;
    state.pealUsed.player = false;
    state.pealUsed.enemy = false;
    state.debtorBustDrawUsed.player = false;
    state.debtorBustDrawUsed.enemy = false;
    state.favorGainedThisTurn.player = false;
    state.favorGainedThisTurn.enemy = false;
    for (const slot of state.altitudes) slot.blinded = false;
  }
  state.witnessedHeresiesThisTurn = [];
  state.smotherTaxUsed.player = false;
  state.smotherTaxUsed.enemy = false;
  state.ropeAuditorTaxUsed.player = false;
  state.ropeAuditorTaxUsed.enemy = false;
  state.slagStrainDrawUsed.player = false;
  state.slagStrainDrawUsed.enemy = false;

  setEssence(state, side, Math.min(ESSENCE_CAP, state.turn));
  setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + sightIncome(state, side)));
  drawOne(state, side);
  push(state, { type: "turn", turn: state.turn, side });
}

function checkProphecy(state: MatchState, side: Side): void {
  const props = propheciesOf(state, side);
  if (props.includes("unblinking_law")) {
    const schools = new Set(state.witnessedHeresiesThisTurn.filter((s) => s !== "neutral"));
    if (schools.size >= 3) {
      gainEclipse(state, side, 2, "law");
      state.prophecyProgress += 1;
      push(state, { type: "law", side, cardId: "unblinking_law", eclipseGain: 2 });
    }
  }
  if (props.includes("shuttered_edict")) {
    const anyBlind = state.altitudes.some((slot) => slot.blinded);
    if (anyBlind) {
      gainEclipse(state, side, 1, "law");
      state.prophecyProgress += 1;
      push(state, { type: "law", side, cardId: "shuttered_edict", eclipseGain: 1 });
    }
  }
}

function checkEnd(state: MatchState): boolean {
  if (state.will <= 0) {
    state.phase = "end";
    state.winner = "enemy";
    state.endReason = "break";
    push(state, { type: "end", winner: "enemy", reason: "break" });
    return true;
  }
  if (state.enemyWill <= 0) {
    state.phase = "end";
    state.winner = "player";
    state.endReason = "break";
    push(state, { type: "end", winner: "player", reason: "break" });
    return true;
  }
  if (state.eclipse >= ECLIPSE_WIN) {
    state.phase = "end";
    state.winner = "player";
    state.endReason = "eclipse";
    push(state, { type: "end", winner: "player", reason: "eclipse" });
    return true;
  }
  if (state.enemyEclipse >= ECLIPSE_WIN) {
    state.phase = "end";
    state.winner = "enemy";
    state.endReason = "eclipse";
    push(state, { type: "end", winner: "enemy", reason: "eclipse" });
    return true;
  }
  return false;
}

function resolveDamage(winningPower: number, highBonus: number): number {
  // Soft Break race — at least 1 per won lane; /3 keeps mid/late cards in the game
  return Math.max(1, Math.ceil((winningPower + highBonus) / 3));
}

const FALL_RELEASE_VESSELS = new Set([
  "rib_vessel",
  "bone_lantern",
  "ledger_urn",
  "coral_urn",
  "mask_urn",
  "mire_urn",
  "iris_urn",
  "arch_urn",
  "stake_urn",
  "splice_urn",
  "mesa_urn",
  "jackal_urn",
  "tithe_urn",
  "coin_urn",
  "horn_urn",
  "windmill_urn",
  "void_urn",
  "tablet_urn",
  "bone_urn",
  "abyss_urn",
  "parasol_urn",
  "wick_urn",
  "masque_urn",
  "carnival_urn",
]);

function checkFallLaw(state: MatchState, side: Side, enemyFalls: number): void {
  if (enemyFalls < 2) return;
  const props = propheciesOf(state, side);
  if (!props.includes("unblinking_law")) return;
  gainEclipse(state, side, 2, "law");
  state.prophecyProgress += 1;
  push(state, { type: "law", side, cardId: "unblinking_law", eclipseGain: 2 });
}

/**
 * Fall triggers — unit still on board (grafts/inhabitant readable).
 * Winner-side Eclipse checks run while the winner still occupies the lane.
 */
function applyFallTriggers(state: MatchState, fallenSide: Side, altitude: Altitude, fallen: BoardUnit): void {
  const owner = fallenSide;
  if (fallen.cardId === "root_chassis") {
    drawOne(state, owner);
    setSight(state, owner, Math.min(SIGHT_CARRY_CAP, sightOf(state, owner) + 1));
  }
  if (fallen.cardId === "dahaka") {
    drawOne(state, owner);
  }
  if (fallen.cardId === "lady_masque") {
    drawOne(state, owner);
  }
  if (fallen.cardId === "carillon") {
    drawOne(state, owner);
  }
  if (fallen.cardId === "skaroth") {
    drawOne(state, owner);
  }
  if (fallen.cardId === "iron_urn") {
    const openAlt = pickOtherFriendlyVeiledFigure(state, owner, altitude);
    if (openAlt == null || !openOwnFigure(state, owner, openAlt, { free: true })) {
      setSight(state, owner, Math.min(SIGHT_CARRY_CAP, sightOf(state, owner) + 1));
    }
  }
  if (fallen.cardId === "ash_urn") {
    if (controlsWitnessedFigure(state, owner)) {
      dealWillToOpponent(state, owner, 1);
    } else {
      const openAlt = pickOtherFriendlyVeiledFigure(state, owner, altitude);
      if (openAlt != null) openOwnFigure(state, owner, openAlt, { free: true });
    }
  }
  if (fallen.cardId === "abyss_sovereign") {
    drawOne(state, owner);
  }
  if (fallen.cardId === "sovereign_of_grins") {
    drawOne(state, owner);
  }
  if (fallen.cardId === "eclipse_sovereign") {
    drawOne(state, owner);
  }
  if (fallen.cardId === "wick_throne") {
    drawOne(state, owner);
  }
  if (fallen.cardId === "bone_lantern" && countVessels(state, owner) > 1) {
    setSight(state, owner, Math.min(SIGHT_CARRY_CAP, sightOf(state, owner) + 1));
  }
  if (fallen.cardId === "wick_urn" && countVessels(state, owner) > 1) {
    drawOne(state, owner);
  }
  if (getCard(fallen.cardId).type === "vessel") {
    for (const siteSide of ["player", "enemy"] as Side[]) {
      if (siteOf(state.altitudes[altitude], siteSide) !== "shard_cache") continue;
      if (fallenSide !== siteSide) continue;
      drawOne(state, siteSide);
    }
  }
  if (fallen.cardId === "tithe_urn" && eclipseOf(state, owner) > 0) {
    setSight(state, owner, Math.min(SIGHT_CARRY_CAP, sightOf(state, owner) + 1));
  }
  if (fallen.cardId === "coin_urn" && midHasNoEnemyFigure(state, owner)) {
    gainEclipse(state, owner, 1);
  }
  if (fallen.cardId === "borrowed_face_urn" && fallen.stanceB) {
    drawOne(state, owner);
  }
  if (fallen.cardId === "gulf_urn") {
    if (stainEnemyVeiled(state, owner)) {
      const foe = other(owner);
      for (let a = 0; a < ALTITUDE_COUNT; a++) {
        const u = unitOf(state.altitudes[a as Altitude], foe);
        if (u?.stained && getCard(u.cardId).type === "figure") {
          blindAltitude(state, owner, a as Altitude);
          break;
        }
      }
    }
  }
  if (fallen.cardId === "toll_urn") {
    placeTollPrefer(state, owner, ([0, 1, 2] as Altitude[]).filter((a) => a !== altitude));
  }
  if (fallen.cardId === "peal_urn") {
    const others = ([0, 1, 2] as Altitude[]).filter((a) => a !== altitude);
    if (!placeTollPrefer(state, owner, others)) {
      const lureAlt = lureBestEnemyVeiled(state, owner);
      if (lureAlt != null) lureWitness(state, owner, lureAlt);
    }
  }
  if (fallen.cardId === "masque_urn") {
    freeWagerOtherFigure(state, owner, altitude);
  }
  if (fallen.cardId === "carnival_urn") {
    freeWagerOtherFigure(state, owner, altitude);
    if (favorOf(state, owner) > 0) {
      setSight(state, owner, Math.min(SIGHT_CARRY_CAP, sightOf(state, owner) + 1));
    }
  }
  // Gulf Cairn: enemy Fall here → Stain Veiled in another altitude + Sight
  for (const siteSide of ["player", "enemy"] as Side[]) {
    if (siteOf(state.altitudes[altitude], siteSide) !== "gulf_cairn") continue;
    if (fallenSide === siteSide) continue;
    stainOtherEnemyVeiled(state, siteSide, altitude);
    setSight(state, siteSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, siteSide) + 1));
  }
  if (fallen.cardId === "millwright_colossus" && fallen.grafts.length > 0) {
    drawOne(state, owner);
  }
  // Graft heresy: Fall recycles attachment value
  if (getCard(fallen.cardId).heresy === "graft" && fallen.grafts.length > 0) {
    drawOne(state, owner);
  }
  if (fallen.cardId === "split_gaze_seraph" && fallen.stanceB) {
    gainEclipse(state, owner, 1);
  } else if (getCard(fallen.cardId).heresy === "many" && fallen.stanceB) {
    // Many: Stance B Fall → Eclipse (Seraph already paid above)
    gainEclipse(state, owner, 1);
  } else if (getCard(fallen.cardId).heresy === "motley" && fallen.stanceB) {
    // Motley Trick: Stance B Fall → Eclipse (jester commitment pays on death)
    gainEclipse(state, owner, 1);
  }

  const winner = other(fallenSide);
  const winnerU = unitOf(state.altitudes[altitude], winner);
  if (winnerU && !winnerU.veiled) {
    if (winnerU.cardId === "ochre_vanguard" || winnerU.cardId === "stake_sovereign") {
      gainEclipse(state, winner, 1);
    }
  }

  // Verdant Cataract on Mid Witnessed: Sight when an enemy falls anywhere
  const midV = unitOf(state.altitudes[1], winner);
  if (midV && !midV.veiled && midV.cardId === "verdant_cataract") {
    setSight(state, winner, Math.min(SIGHT_CARRY_CAP, sightOf(state, winner) + 1));
  }
}

/** Figure leaves the board; grafts return to hand. Sites stay. Fall-release vessels refill the lane. */
function fallUnit(state: MatchState, side: Side, altitude: Altitude): void {
  const slot = state.altitudes[altitude];
  const u = unitOf(slot, side);
  if (!u) return;
  const hand = handOf(state, side);
  const fallRelease = FALL_RELEASE_VESSELS.has(u.cardId) && !!u.inhabitant;
  const releaseId = fallRelease ? u.inhabitant : null;

  if (u.inhabitant && !fallRelease) hand.push(u.inhabitant);
  for (const g of u.grafts) hand.push(g.cardId);
  // Trim if hand overflows — excess to deck bottom
  while (hand.length > HAND_MAX) {
    const id = hand.pop();
    if (id) deckOf(state, side).unshift(id);
  }
  push(state, { type: "fall", side, altitude, cardId: u.cardId });
  applyFallTriggers(state, side, altitude, u);
  setUnit(slot, side, null);

  if (releaseId) {
    const released = mint(state, releaseId, true);
    if (siteOf(slot, side) === "third_face") released.hasThirdFace = true;
    setUnit(slot, side, released);
  }
}

/**
 * Resolve per lane: Will chip, then Unmake.
 * **Veiled** loser — Holds (cannot Fall while Veiled). Stain / Press / False Hold → Forced Exposed + Strain.
 * **Witnessed** loser — Falls (dies).
 * Witnessed winner clears Strain. Blinded lanes skip combat.
 *
 * - Cube: Veiled Cube loss deals at most 1 Will.
 * - Motley: Stance B Veiled Holds through Erase; Veiled Stance B + paid ante Wagered win → Trick Eclipse.
 * - Scar Breach: Witnessed winners add Breach Will; Opened Witnessed losers take Overexpose then Fall.
 */
function resolveRound(state: MatchState): void {
  let dmgPlayer = 0;
  let dmgEnemy = 0;
  const falls: { side: Side; altitude: Altitude }[] = [];
  const strains: { side: Side; altitude: Altitude; cardId: string }[] = [];
  let motleyTrickEclipsePlayer = 0;
  let motleyTrickEclipseEnemy = 0;
  // Trick Eclipse needs Favor funded *before* this Resolve (Cash Favor mid-Resolve does not count)
  const trickFavorReady = {
    player: favorOf(state, "player") > 0,
    enemy: favorOf(state, "enemy") > 0,
  };
  state.cashThisResolve.player = 0;
  state.cashThisResolve.enemy = 0;
  state.breachDealtThisResolve.player = 0;
  state.breachDealtThisResolve.enemy = 0;
  state.overexposeTakenThisResolve.player = false;
  state.overexposeTakenThisResolve.enemy = false;
  state.rivetCharmDrawUsed.player = false;
  state.rivetCharmDrawUsed.enemy = false;
  state.skarothPowerArmed.player = false;
  state.skarothPowerArmed.enemy = false;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const alt = a as Altitude;
    const slot = state.altitudes[alt];
    // Hollow: Blinded lanes deal no Will and skip Unmake pressure
    if (slot.blinded) continue;

    const pp = unitPower(state, alt, "player");
    const ep = unitPower(state, alt, "enemy");
    const highBonus = alt === 0 ? 1 : 0;
    const playerU = unitOf(slot, "player");
    const enemyU = unitOf(slot, "enemy");

    if (pp > ep) {
      let dmg = resolveDamage(pp, highBonus);
      // Cube Hold: Veiled Cube loser caps chip at 1
      if (enemyU?.veiled && getCard(enemyU.cardId).heresy === "cube") dmg = Math.min(1, dmg);
      // Ink Hold vs Open Breach: soft chip capped at 2 (deny Skaroth farm; Breach Will already 0)
      if (
        enemyU?.veiled &&
        getCard(enemyU.cardId).heresy === "ink" &&
        playerU &&
        !playerU.veiled &&
        isBreachFigure(playerU)
      ) {
        dmg = Math.min(2, dmg);
      }
      // Breach wins into Motley Stance B: densify soft chip alongside pierce Will
      if (
        playerU &&
        !playerU.veiled &&
        isBreachFigure(playerU) &&
        enemyU?.veiled &&
        enemyU.stanceB &&
        getCard(enemyU.cardId).heresy === "motley"
      ) {
        dmg += 1;
      }
      dmgEnemy += dmg;
      // Scar Breach: Witnessed winner adds Breach Will after soft Resolve
      if (playerU && !playerU.veiled) {
        const breach = breachBonusWill(state, "player", playerU, alt);
        if (breach > 0) {
          dmgEnemy += breach;
          noteBreachWillDealt(state, "player", breach);
        }
        if (siteOf(slot, "player") === "scarforge") {
          setSight(state, "player", Math.min(SIGHT_CARRY_CAP, sightOf(state, "player") + 1));
        }
        if (playerU.grafts.some((g) => g.cardId === "rivet_charm") && !state.rivetCharmDrawUsed.player) {
          drawOne(state, "player");
          state.rivetCharmDrawUsed.player = true;
        }
        if (playerU.grafts.some((g) => g.cardId === "eyebrand_charm")) {
          setSight(state, "player", Math.min(SIGHT_CARRY_CAP, sightOf(state, "player") + 1));
          if (alt === 0) drawOne(state, "player");
        }
        if (playerU.cardId === "cliffbrand_captain" && alt === 0) {
          drawOne(state, "player");
        }
      }
      if (playerU && !playerU.veiled) playerU.strained = false;
      if (
        playerU?.veiled &&
        playerU.stanceB &&
        playerU.wagered &&
        playerU.wagerAntePaid &&
        getCard(playerU.cardId).heresy === "motley" &&
        getCard(playerU.cardId).type === "figure"
      ) {
        motleyTrickEclipsePlayer += 1;
      }
      if (playerU?.veiled) {
        applyVeiledWinAbility(state, playerU, "player", alt);
        if (playerU.wagered) applyCash(state, "player", alt, playerU);
      }
      if (enemyU) {
        if (enemyU.veiled) {
          handleVeiledLoser(state, enemyU, "player", alt, strains, "enemy");
          if (enemyU.wagered) applyBust(state, "enemy", alt, enemyU);
          if (enemyU.veiled) {
            applyScrutinyOnHold(state, enemyU, "enemy", alt, strains);
            if (enemyU.veiled) applyVeiledHoldAbility(state, enemyU, "enemy", alt);
          }
          if (playerU?.grafts.some((g) => g.cardId === "blot_charm")) {
            if (enemyU.stained) {
              setSight(state, "player", Math.min(SIGHT_CARRY_CAP, sightOf(state, "player") + 1));
            } else {
              stainUnit(state, enemyU);
            }
          }
        } else {
          if (enemyU.wagered) applyBust(state, "enemy", alt, enemyU);
          applyOverexpose(state, "enemy", alt, enemyU, strains);
          falls.push({ side: "enemy", altitude: alt });
        }
        tryPayToll(state, "enemy", alt, { clear: true });
      }
      if (playerU?.cardId === "shard_blade" && hasInhabitantInVessel(state, "player")) {
        drawOne(state, "player");
      }
    } else if (ep > pp) {
      let dmg = resolveDamage(ep, highBonus);
      if (playerU?.veiled && getCard(playerU.cardId).heresy === "cube") dmg = Math.min(1, dmg);
      if (
        playerU?.veiled &&
        getCard(playerU.cardId).heresy === "ink" &&
        enemyU &&
        !enemyU.veiled &&
        isBreachFigure(enemyU)
      ) {
        dmg = Math.min(2, dmg);
      }
      if (
        enemyU &&
        !enemyU.veiled &&
        isBreachFigure(enemyU) &&
        playerU?.veiled &&
        playerU.stanceB &&
        getCard(playerU.cardId).heresy === "motley"
      ) {
        dmg += 1;
      }
      dmgPlayer += dmg;
      if (enemyU && !enemyU.veiled) {
        const breach = breachBonusWill(state, "enemy", enemyU, alt);
        if (breach > 0) {
          dmgPlayer += breach;
          noteBreachWillDealt(state, "enemy", breach);
        }
        if (siteOf(slot, "enemy") === "scarforge") {
          setSight(state, "enemy", Math.min(SIGHT_CARRY_CAP, sightOf(state, "enemy") + 1));
        }
        if (enemyU.grafts.some((g) => g.cardId === "rivet_charm") && !state.rivetCharmDrawUsed.enemy) {
          drawOne(state, "enemy");
          state.rivetCharmDrawUsed.enemy = true;
        }
        if (enemyU.grafts.some((g) => g.cardId === "eyebrand_charm")) {
          setSight(state, "enemy", Math.min(SIGHT_CARRY_CAP, sightOf(state, "enemy") + 1));
          if (alt === 0) drawOne(state, "enemy");
        }
        if (enemyU.cardId === "cliffbrand_captain" && alt === 0) {
          drawOne(state, "enemy");
        }
      }
      if (enemyU && !enemyU.veiled) enemyU.strained = false;
      if (
        enemyU?.veiled &&
        enemyU.stanceB &&
        enemyU.wagered &&
        enemyU.wagerAntePaid &&
        getCard(enemyU.cardId).heresy === "motley" &&
        getCard(enemyU.cardId).type === "figure"
      ) {
        motleyTrickEclipseEnemy += 1;
      }
      if (enemyU?.veiled) {
        applyVeiledWinAbility(state, enemyU, "enemy", alt);
        if (enemyU.wagered) applyCash(state, "enemy", alt, enemyU);
      }
      if (playerU) {
        if (playerU.veiled) {
          handleVeiledLoser(state, playerU, "enemy", alt, strains, "player");
          if (playerU.wagered) applyBust(state, "player", alt, playerU);
          if (playerU.veiled) {
            applyScrutinyOnHold(state, playerU, "player", alt, strains);
            if (playerU.veiled) applyVeiledHoldAbility(state, playerU, "player", alt);
          }
          if (enemyU?.grafts.some((g) => g.cardId === "blot_charm")) {
            if (playerU.stained) {
              setSight(state, "enemy", Math.min(SIGHT_CARRY_CAP, sightOf(state, "enemy") + 1));
            } else {
              stainUnit(state, playerU);
            }
          }
        } else {
          if (playerU.wagered) applyBust(state, "player", alt, playerU);
          applyOverexpose(state, "player", alt, playerU, strains);
          falls.push({ side: "player", altitude: alt });
        }
        tryPayToll(state, "player", alt, { clear: true });
      }
      if (enemyU?.cardId === "shard_blade" && hasInhabitantInVessel(state, "enemy")) {
        drawOne(state, "enemy");
      }
    }
  }
  if (motleyTrickEclipsePlayer > 0 && trickFavorReady.player) {
    gainEclipse(state, "player", 1, "trick");
    setFavor(state, "player", Math.max(0, favorOf(state, "player") - 1));
  }
  if (motleyTrickEclipseEnemy > 0 && trickFavorReady.enemy) {
    gainEclipse(state, "enemy", 1, "trick");
    setFavor(state, "enemy", Math.max(0, favorOf(state, "enemy") - 1));
  }
  // Lady Masque Witnessed: Cash 2+ this Resolve → Eclipse (Veiled Masque is Sight-only)
  for (const side of ["player", "enemy"] as Side[]) {
    if (state.cashThisResolve[side] < 2) continue;
    const lm = findLadyMasque(state, side);
    if (lm && !lm.veiled) gainEclipse(state, side, 1, "masque");
  }
  state.will = Math.max(0, state.will - dmgPlayer);
  state.enemyWill = Math.max(0, state.enemyWill - dmgEnemy);
  push(state, { type: "resolve", damages: { player: dmgPlayer, enemy: dmgEnemy } });
  state.mireSurgeArmed.player = false;
  state.mireSurgeArmed.enemy = false;
  state.galaSurgeArmed.player = false;
  state.galaSurgeArmed.enemy = false;
  state.encoreBuffAlt.player = null;
  state.encoreBuffAlt.enemy = null;
  state.debtSurgeArmed.player = false;
  state.debtSurgeArmed.enemy = false;
  state.vesselSurgeArmed.player = false;
  state.vesselSurgeArmed.enemy = false;
  state.mesaBuffAlt.player = null;
  state.mesaBuffAlt.enemy = null;
  state.inkChoirBuff.player = false;
  state.inkChoirBuff.enemy = false;
  state.walkerResonanceBuff.player = false;
  state.walkerResonanceBuff.enemy = false;
  state.pathBellmanBuff.player = false;
  state.pathBellmanBuff.enemy = false;
  state.fullBreachArmed.player = false;
  state.fullBreachArmed.enemy = false;
  state.ashcoilBuff.player = 0;
  state.ashcoilBuff.enemy = 0;
  state.skarothPowerArmed.player = false;
  state.skarothPowerArmed.enemy = false;
  state.overexposeTakenThisResolve.player = false;
  state.overexposeTakenThisResolve.enemy = false;
  clearBreachOpenFlags(state);
  state.smotherTaxUsed.player = false;
  state.smotherTaxUsed.enemy = false;
  for (const s of strains) push(state, { type: "strain", side: s.side, altitude: s.altitude, cardId: s.cardId });
  const playerCaused = falls.filter((f) => f.side === "enemy").length;
  const enemyCaused = falls.filter((f) => f.side === "player").length;
  for (const f of falls) fallUnit(state, f.side, f.altitude);
  checkFallLaw(state, "player", playerCaused);
  checkFallLaw(state, "enemy", enemyCaused);
  resolvePressBacklashes(state);
  if (checkEnd(state)) return;

  state.turn += 1;
  if (state.turn > MAX_TURNS) {
    state.phase = "end";
    if (state.will > state.enemyWill) state.winner = "player";
    else if (state.enemyWill > state.will) state.winner = "enemy";
    else state.winner = "draw";
    state.endReason = "turns";
    push(state, { type: "end", winner: state.winner, reason: "turns" });
    return;
  }
  beginTurn(state, "player", true);
}

function onPass(state: MatchState, side: Side): void {
  // Empty-Sight Pass no longer grants Eclipse — races were Motley/Ink Sight-economy skew.
  // Eclipse comes from cards, heresy payoffs, and Break pressure.
  checkProphecy(state, side);
  state.passed[side] = true;
  push(state, { type: "pass", side });
  if (checkEnd(state)) return;

  if (state.passed.player && state.passed.enemy) {
    resolveRound(state);
    return;
  }
  // Other side gets a full turn window (Essence + Sight + draw)
  beginTurn(state, other(side), false);
}

function bounceVeiled(state: MatchState, preferEnemy: Side): void {
  for (const side of [preferEnemy, other(preferEnemy)]) {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const slot = state.altitudes[a as Altitude];
      const u = unitOf(slot, side);
      if (u && u.veiled) {
        handOf(state, side).push(u.cardId);
        if (u.inhabitant) handOf(state, side).push(u.inhabitant);
        for (const g of u.grafts) handOf(state, side).push(g.cardId);
        setUnit(slot, side, null);
        return;
      }
    }
  }
}

/** Bounce a board unit to its owner's hand. `credit` gets Recall Gallery Sight if they control that Site. */
function bounceBoardUnit(
  state: MatchState,
  owner: Side,
  altitude: Altitude,
  credit?: Side,
): boolean {
  const slot = state.altitudes[altitude];
  const u = unitOf(slot, owner);
  if (!u) return false;
  const hand = handOf(state, owner);
  hand.push(u.cardId);
  if (u.inhabitant) hand.push(u.inhabitant);
  for (const g of u.grafts) hand.push(g.cardId);
  setUnit(slot, owner, null);
  if (credit) noteDebtBounce(state, credit);
  return true;
}

function bounceEnemyVeiledHere(
  state: MatchState,
  hostSide: Side,
  altitude: Altitude,
): boolean {
  const foe = other(hostSide);
  const u = unitOf(state.altitudes[altitude], foe);
  if (!u?.veiled) return false;
  return bounceBoardUnit(state, foe, altitude, hostSide);
}

function bounceFriendlyVeiledElsewhere(
  state: MatchState,
  hostSide: Side,
  exceptAlt: Altitude,
): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], hostSide);
    if (u?.veiled) return bounceBoardUnit(state, hostSide, a as Altitude, hostSide);
  }
  return false;
}

function noteDebtBounce(state: MatchState, side: Side): void {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (siteOf(state.altitudes[a as Altitude], side) === "recall_gallery") {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      return;
    }
  }
}

function releaseInhabitant(state: MatchState, side: Side, altitude: Altitude, u: BoardUnit): void {
  if (!u.inhabitant) return;
  const id = u.inhabitant;
  u.inhabitant = null;
  const here = state.altitudes[altitude];
  // Vessel still occupies this lane — Inhabitant enters here only if somehow empty; else hand.
  if (!unitOf(here, side)) {
    const released = mint(state, id, true);
    if (siteOf(here, side) === "third_face") released.hasThirdFace = true;
    setUnit(here, side, released);
    return;
  }
  handOf(state, side).push(id);
}

function gainEclipse(state: MatchState, side: Side, n: number, reason?: string): void {
  if (n <= 0) return;
  const before = eclipseOf(state, side);
  if (side === "player") state.eclipse = Math.min(ECLIPSE_WIN, state.eclipse + n);
  else state.enemyEclipse = Math.min(ECLIPSE_WIN, state.enemyEclipse + n);
  const gained = eclipseOf(state, side) - before;
  if (gained > 0) push(state, { type: "eclipse", side, amount: gained, reason });
}

function spendEclipse(state: MatchState, side: Side, n: number): boolean {
  if (eclipseOf(state, side) < n) return false;
  if (side === "player") state.eclipse -= n;
  else state.enemyEclipse -= n;
  return true;
}

function eclipseOf(state: MatchState, side: Side): number {
  return side === "player" ? state.eclipse : state.enemyEclipse;
}

function noEnemyFigureHere(state: MatchState, altitude: Altitude, side: Side): boolean {
  const foe = unitOf(state.altitudes[altitude], other(side));
  return !foe || getCard(foe.cardId).type !== "figure";
}

function midHasNoEnemyFigure(state: MatchState, side: Side): boolean {
  return noEnemyFigureHere(state, 1, side);
}

function countWitnessedFigures(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && !u.veiled && getCard(u.cardId).type === "figure") n += 1;
  }
  return n;
}

function countVeiledFigures(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && u.veiled && getCard(u.cardId).type === "figure") n += 1;
  }
  return n;
}

function hasInhabitantInVessel(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).type === "vessel" && u.inhabitant) return true;
  }
  return false;
}

/** Twinspoke / Hall Sight, Facet draw, Motley graft/site payoffs when Stance flips. */
function onStanceChanged(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  u: BoardUnit,
  enteredB: boolean,
): void {
  const site = siteOf(state.altitudes[altitude], side);
  if (site === "twinspoke_banner" || site === "hall_of_borrowed_faces") {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }
  if (site === "velvet_antehall") {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }
  if (site === "facet_shrine") {
    drawOne(state, side);
  }
  if (site === "grinning_colonnade") {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "fool_flip_seal")) {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    if (enteredB) {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    }
  }
  if (u.grafts.some((g) => g.cardId === "harlequin_sash")) {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    if (enteredB) {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    }
  }
  if (u.veiled && u.grafts.some((g) => g.cardId === "coinface_charm")) {
    setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
  }
}

/** @deprecated path — use onStanceChanged after flip */
function noteStanceSwitch(state: MatchState, side: Side, altitude: Altitude): void {
  const u = unitOf(state.altitudes[altitude], side);
  if (u) onStanceChanged(state, side, altitude, u, u.stanceB);
  else {
    const site = siteOf(state.altitudes[altitude], side);
    if (site === "twinspoke_banner" || site === "hall_of_borrowed_faces") {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    }
    if (site === "facet_shrine") drawOne(state, side);
  }
}

function switchUnitStance(state: MatchState, side: Side, altitude: Altitude, u: BoardUnit): void {
  u.stanceB = !u.stanceB;
  onStanceChanged(state, side, altitude, u, u.stanceB);
}

function enterStanceB(state: MatchState, side: Side, altitude: Altitude, u: BoardUnit): boolean {
  if (u.stanceB) return false;
  u.stanceB = true;
  onStanceChanged(state, side, altitude, u, true);
  return true;
}

/** Move Stain from enemy at fromAlt to another enemy Veiled Figure. Returns true if moved. */
function moveStainFromAltitude(state: MatchState, side: Side, fromAlt: Altitude): boolean {
  const foe = unitOf(state.altitudes[fromAlt], other(side));
  if (!foe?.stained || getCard(foe.cardId).type !== "figure") return false;
  const foeSide = other(side);
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === fromAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], foeSide);
    if (u && u.veiled && getCard(u.cardId).type === "figure") {
      foe.stained = false;
      stainUnit(state, u);
      return true;
    }
  }
  return false;
}

function switchOtherStance(state: MatchState, side: Side, exceptAlt: Altitude): BoardUnit | null {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (
      u &&
      getCard(u.cardId).type === "figure" &&
      (u.hasThirdFace || siteOf(state.altitudes[a as Altitude], side) === "third_face")
    ) {
      switchUnitStance(state, side, a as Altitude, u);
      return u;
    }
  }
  // No Third Face required — flip any other friendly figure
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).type === "figure") {
      switchUnitStance(state, side, a as Altitude, u);
      return u;
    }
  }
  return null;
}

function switchOtherFiguresStance(state: MatchState, side: Side, exceptAlt: Altitude): number {
  let enteredB = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).type === "figure") {
      const wasB = u.stanceB;
      switchUnitStance(state, side, a as Altitude, u);
      if (!wasB && u.stanceB) enteredB += 1;
    }
  }
  return enteredB;
}

function countStanceBFigures(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && u.stanceB && getCard(u.cardId).type === "figure") n += 1;
  }
  return n;
}

/**
 * Shared Revelation / graft-on-witness triggers.
 * @param witnesser — who paid Sight (Gaze steals some rewards)
 * @param hostSide — owner of the unit being Witnessed
 */
function applyRevelation(
  state: MatchState,
  witnesser: Side,
  hostSide: Side,
  altitude: Altitude,
  u: BoardUnit,
  enemyTarget: boolean,
  opts?: { skipMatronChain?: boolean },
): void {
  const def = getCard(u.cardId);
  const slot = state.altitudes[altitude];

  if (u.grafts.some((g) => g.cardId === "ace_of_hollows") && eclipseOf(state, hostSide) > 0) {
    drawOne(state, hostSide);
  }
  if (u.grafts.some((g) => g.cardId === "bone_wick_charm") && hasVesselInPlay(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "debt_coin") && eclipseOf(state, hostSide) > 0) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "splice_token") && hasGraftSite(state, hostSide)) {
    drawOne(state, hostSide);
  }
  if (u.grafts.some((g) => g.cardId === "void_charm")) {
    markBlind(state, altitude);
  }
  if (u.grafts.some((g) => g.cardId === "iris_seal") && controlsGazeAltitude(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "cube_charm") && altitude === 0 && countVeiledFigures(state, hostSide) > 0) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "face_charm")) {
    u.stanceB = !u.stanceB;
    noteStanceSwitch(state, hostSide, altitude);
  }
  if (u.grafts.some((g) => g.cardId === "moss_charm") && hasDeepSite(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "dusk_charm") && eclipseOf(state, hostSide) > 0) {
    markBlind(state, altitude);
  }
  if (u.grafts.some((g) => g.cardId === "coral_charm") && countCoralSites(state, hostSide) > 0) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "mask_charm") && hasStanceBFigure(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "wick_charm") && hasVesselInPlay(state, hostSide)) {
    drawOne(state, hostSide);
  }
  if (u.grafts.some((g) => g.cardId === "iris_charm") && controlsGazeAltitude(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "banner_charm") && controlsSiteId(state, hostSide, "veil_banner")) {
    drawOne(state, hostSide);
  }
  if (u.grafts.some((g) => g.cardId === "dusk_seal") && eclipseOf(state, hostSide) > 0) {
    drawOne(state, hostSide);
  }
  if (u.grafts.some((g) => g.cardId === "paystone_charm")) {
    if (spendEclipse(state, hostSide, 1)) {
      drawOne(state, hostSide);
      if (midHasNoEnemyFigure(state, hostSide)) {
        setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
      }
    }
  }
  if (u.grafts.some((g) => g.cardId === "eclipse_cord") && eclipseOf(state, other(hostSide)) > 0) {
    const opp = other(hostSide);
    const os = sightOf(state, opp);
    if (os > 0) setSight(state, opp, os - 1);
  }
  if (u.grafts.some((g) => g.cardId === "stance_charm")) {
    u.stanceB = !u.stanceB;
    noteStanceSwitch(state, hostSide, altitude);
    if (u.stanceB) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (u.grafts.some((g) => g.cardId === "mill_charm") && hasGraftSite(state, hostSide)) {
    drawOne(state, hostSide);
  }
  if (u.grafts.some((g) => g.cardId === "pale_charm")) {
    markBlind(state, 2 as Altitude);
  }
  if (u.grafts.some((g) => g.cardId === "colony_charm")) {
    const n = Math.min(2, countCoralSites(state, hostSide));
    if (n > 0) setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (u.grafts.some((g) => g.cardId === "inhabit_charm") && hasInhabitantInVessel(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "shell_seal") && hasEmptyVessel(state, hostSide)) {
    tuckIntoEmptyVessel(state, hostSide);
  }
  if (
    u.grafts.some((g) => g.cardId === "refill_charm") &&
    hasVesselInPlay(state, hostSide) &&
    countVeiledFigures(state, hostSide) > 0
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (
    u.grafts.some((g) => g.cardId === "chain_charm") &&
    hasDeepSite(state, hostSide) &&
    countVeiledFigures(state, hostSide) > 0
  ) {
    drawOne(state, hostSide);
  }
  if (u.grafts.some((g) => g.cardId === "heliograph_charm") && controlsGazeAltitude(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const eu = unitOf(state.altitudes[a as Altitude], other(hostSide));
      if (eu?.veiled && altitudeHasGaze(state, a as Altitude, hostSide)) {
        gainEclipse(state, hostSide, 1);
        break;
      }
    }
  }

  if (def.id === "cliff_seeker") {
    if (countVeiledFigures(state, hostSide) > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  // —— Ink Abyss Wave 1 identity ——
  if (def.id === "blot_herald") {
    stainEnemyAt(state, hostSide, altitude);
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "smother_bride") {
    let blinded = 0;
    const foe = other(hostSide);
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const eu = unitOf(state.altitudes[a as Altitude], foe);
      if (eu?.stained && getCard(eu.cardId).type === "figure") {
        blindAltitude(state, hostSide, a as Altitude);
        blinded += 1;
      }
    }
    if (blinded >= 2) drawOne(state, hostSide);
  }
  if (def.id === "well_cantor") {
    state.inkChoirBuff[hostSide] = true;
    const n = Math.min(2, countOtherFriendlyVeiledInk(state, hostSide, altitude));
    if (n > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
    }
  }
  if (def.id === "pale_ledger") {
    const host = moveEnemyStainToAny(state, hostSide);
    if (host) {
      const hostAlt = findUnitAltitude(state, host);
      if (hostAlt !== null) {
        const hostSideEnemy = other(hostSide);
        if (host.veiled) {
          forceExpose(host);
          onForcedExposed(state, host, hostSideEnemy, hostAlt, hostSide);
          onEnemyFigureBecameWitnessed(state, hostSideEnemy, hostAlt, host);
          if (!host.strained) host.strained = true;
        } else {
          blindAltitude(state, hostSide, hostAlt);
        }
      }
    }
  }
  if (def.id === "mire_duelist") {
    stainEnemyAt(state, hostSide, altitude);
  }
  if (def.id === "pale_bailiff") {
    const foe = unitOf(slot, other(hostSide));
    if (foe && getCard(foe.cardId).type === "figure") {
      const wasStained = foe.stained;
      stainEnemyAt(state, hostSide, altitude);
      if (wasStained) blindAltitude(state, hostSide, altitude);
    }
  }
  if (def.id === "drip_herald") {
    if (controlsInkSite(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
      stainEnemyVeiled(state, hostSide, 2);
    }
  }
  if (def.id === "cliff_maw") {
    stainEnemyAt(state, hostSide, altitude);
    if (altitude === 0) {
      blindAltitude(state, hostSide, 0);
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "silt_warden") {
    if (anyEnemyStained(state, hostSide)) {
      blindAltitude(state, hostSide, 2);
      const lowFoe = unitOf(state.altitudes[2], other(hostSide));
      if (lowFoe?.stained && getCard(lowFoe.cardId).type === "figure") {
        drawOne(state, hostSide);
      }
    }
  }
  if (def.id === "ink_matron") {
    const n = countEnemyStainedFigures(state, hostSide);
    if (n >= 1) drawOne(state, hostSide);
    if (n >= 2) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "abyss_herald") {
    if (controlsInkSiteOrVessel(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    if (controlsInkSite(state, hostSide) && controlsInkVessel(state, hostSide)) {
      blindAltitude(state, hostSide, 1);
    }
  }
  if (def.id === "gulf_cantor") {
    const foe = unitOf(slot, other(hostSide));
    if (foe && getCard(foe.cardId).type === "figure") {
      if (foe.stained) {
        setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
      } else if (foe.veiled) {
        stainUnit(state, foe);
      }
    }
  }
  if (def.id === "dahaka") {
    let stained = 0;
    const foe = other(hostSide);
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const eu = unitOf(state.altitudes[a as Altitude], foe);
      if (eu && getCard(eu.cardId).type === "figure") {
        const was = eu.stained;
        stainEnemyAt(state, hostSide, a as Altitude);
        if (!was) stained += 1;
      }
    }
    if (stained >= 2) {
      drawOne(state, hostSide);
      blindAltitude(state, hostSide, 1);
    }
  }
  if (def.id === "abyss_sovereign") {
    let stained = 0;
    const foe = other(hostSide);
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const eu = unitOf(state.altitudes[a as Altitude], foe);
      if (eu && eu.veiled && getCard(eu.cardId).type === "figure") {
        stainUnit(state, eu);
        stained += 1;
      }
    }
    if (stained >= 2) drawOne(state, hostSide);
  }
  if (u.grafts.some((g) => g.cardId === "drip_seal")) {
    if (!stainEnemyVeiled(state, hostSide, altitude)) {
      stainEnemyVeiled(state, hostSide);
    }
  }
  if (
    siteOf(slot, hostSide) === "abyss_cache" &&
    def.heresy === "ink" &&
    def.type === "figure"
  ) {
    const n = countEnemyStainedFigures(state, hostSide);
    if (n >= 1) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    if (n >= 2) drawOne(state, hostSide);
  }
  if (
    siteOf(slot, hostSide) === "hall_of_borrowed_faces" &&
    def.heresy === "motley" &&
    (def.type === "figure" || def.type === "vessel") &&
    u.stanceB
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (
    siteOf(slot, hostSide) === "twinseal_cache" &&
    def.heresy === "motley" &&
    def.type === "figure" &&
    u.stanceB
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    if (countStanceBFigures(state, hostSide) >= 2) drawOne(state, hostSide);
  }
  if (u.grafts.some((g) => g.cardId === "otherface_seal")) {
    if (u.stanceB) {
      switchUnitStance(state, hostSide, altitude, u);
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    } else {
      enterStanceB(state, hostSide, altitude, u);
    }
  }
  // —— Motley Masquerade Trick craft ——
  if (def.id === "whitecard_mummer") {
    enterStanceB(state, hostSide, altitude, u);
    if (u.wagered) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "diamond_widow") {
    switchUnitStance(state, hostSide, altitude, u);
  }
  if (def.id === "split_hymn_cantor") {
    switchOtherStance(state, hostSide, altitude);
  }
  if (def.id === "masked_usher") {
    if (controlsWageredFigure(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "grinning_debtor") {
    if (u.wagered) blindAltitude(state, hostSide, 2);
    else drawOne(state, hostSide);
  }
  if (def.id === "scarlet_dealer") {
    enterStanceB(state, hostSide, altitude, u);
    if (controlsWageredFigure(state, hostSide)) {
      // "another" — exclude self if still Wagered from Fold timing; Rev Free doesn't keep ante
      let otherW = false;
      for (let a = 0; a < ALTITUDE_COUNT; a++) {
        if (a === altitude) continue;
        const ou = unitOf(state.altitudes[a as Altitude], hostSide);
        if (ou?.wagered) {
          otherW = true;
          break;
        }
      }
      if (otherW) drawOne(state, hostSide);
    }
  }
  if (def.id === "masque_urn") {
    freeWagerUnit(state, hostSide, altitude, u);
  }
  if (def.id === "spire_caprice") {
    if (altitude === 0) {
      freeWagerUnit(state, hostSide, altitude, u);
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "pit_capper") {
    freeWagerUnit(state, hostSide, altitude, u);
    if (altitude === 2) drawOne(state, hostSide);
  }
  if (def.id === "favor_broker") {
    const wasB = u.stanceB;
    switchUnitStance(state, hostSide, altitude, u);
    if (!wasB && u.stanceB) gainFavor(state, hostSide, 1);
  }
  if (def.id === "lady_masque") {
    freeWagerUnit(state, hostSide, altitude, u);
    if (countWageredFigures(state, hostSide) >= 2) {
      gainEclipse(state, hostSide, 1, "masque");
      drawOne(state, hostSide);
    }
  }
  if (def.id === "carnival_urn") {
    switchUnitStance(state, hostSide, altitude, u);
    freeWagerOtherFigure(state, hostSide, altitude);
  }
  if (def.id === "sovereign_of_grins") {
    let entered = 0;
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === altitude) continue;
      const ou = unitOf(state.altitudes[a as Altitude], hostSide);
      if (ou && getCard(ou.cardId).type === "figure") {
        if (enterStanceB(state, hostSide, a as Altitude, ou)) entered += 1;
      }
    }
    if (entered >= 2) drawOne(state, hostSide);
  }
  if (def.id === "ashen_halfmask") {
    enterStanceB(state, hostSide, altitude, u);
    const foe = unitOf(slot, other(hostSide));
    if (foe?.veiled && getCard(foe.cardId).type === "figure") {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "grinrunner") {
    if (u.stanceB) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
      drawOne(state, hostSide);
    } else {
      enterStanceB(state, hostSide, altitude, u);
    }
  }
  if (def.id === "mirrored_jester") {
    switchUnitStance(state, hostSide, altitude, u);
    if (u.stanceB) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    const foe = unitOf(slot, other(hostSide));
    if (foe?.veiled && getCard(foe.cardId).type === "figure") drawOne(state, hostSide);
  }
  if (def.id === "chance_step_dancer") {
    enterStanceB(state, hostSide, altitude, u);
    if (controlsMotleySite(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 2));
    }
  }
  if (def.id === "twin_coin_bailiff") {
    const n = Math.min(2, switchOtherFiguresStance(state, hostSide, altitude));
    if (n > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
    }
  }
  if (def.id === "borrowed_face_urn") {
    enterStanceB(state, hostSide, altitude, u);
    if (u.stanceB) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "ribbon_duelist") {
    enterStanceB(state, hostSide, altitude, u);
    if (altitude === 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    const foe = unitOf(slot, other(hostSide));
    if (foe && !foe.veiled && getCard(foe.cardId).type === "figure") {
      drawOne(state, hostSide);
    }
  }
  if (def.id === "tithe_widow") {
    const wasB = u.stanceB;
    switchUnitStance(state, hostSide, altitude, u);
    if (!wasB && u.stanceB) {
      const opp = other(witnesser);
      const os = sightOf(state, opp);
      if (os > 0) setSight(state, opp, os - 1);
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "pairmask_usher") {
    let otherB = false;
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === altitude) continue;
      const ou = unitOf(state.altitudes[a as Altitude], hostSide);
      if (ou?.stanceB && getCard(ou.cardId).type === "figure") otherB = true;
    }
    if (otherB) {
      drawOne(state, hostSide);
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    } else {
      enterStanceB(state, hostSide, altitude, u);
    }
  }
  if (def.id === "gala_warden") {
    enterStanceB(state, hostSide, altitude, u);
    state.galaSurgeArmed[hostSide] = true;
  }
  if (def.id === "gulf_urn") {
    stainEnemyAt(state, hostSide, altitude);
  }
  if (def.id === "hatline_trickster") bounceVeiled(state, other(witnesser));
  if (def.id === "root_chassis" && altitude === 1) u.hybridSite = true;
  if (def.id === "rib_vessel") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (controlsSiteId(state, hostSide, "bone_gallery")) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "stake_field_pilgrim") {
    if (!unitOf(slot, other(hostSide))) {
      drawOne(state, hostSide);
      if (altitude === 2) {
        setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
      }
    }
  }
  if (def.id === "keywright_scarecrow") {
    drawOne(state, hostSide);
    if (hasGraftSite(state, hostSide)) {
      drawOne(state, hostSide);
    }
  }
  // ochre_vanguard: Eclipse on enemy fall (see applyFallTriggers)
  if (def.id === "echo_mask") switchOtherStance(state, hostSide, altitude);
  if (def.id === "ledger_jackal") {
    if (eclipseOf(state, hostSide) > 0) drawOne(state, hostSide);
    else if (altitude === 1) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "verdant_cataract") {
    const n = Math.min(3, countWitnessedFigures(state, hostSide));
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (def.id === "split_gaze_seraph") {
    const before = countStanceBFigures(state, hostSide);
    switchOtherFiguresStance(state, hostSide, altitude);
    const after = countStanceBFigures(state, hostSide);
    if (after > before) gainEclipse(state, hostSide, 1);
  }
  if (def.id === "saltglass_courier" && altitude === 0) {
    if (countVeiledFigures(state, hostSide) > 0) drawOne(state, hostSide);
    else setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "pillar_cantor" && altitude === 1 && countCoralSites(state, hostSide) > 0) {
    gainEclipse(state, hostSide, 1);
  }
  if (def.id === "canister_hound" && altitude === 1 && controlsOtherGraft(state, hostSide, altitude)) {
    drawOne(state, hostSide);
  }
  if (def.id === "inkdrip_acolyte") markBlind(state, altitude);
  if (def.id === "mire_debtor" && altitude === 1) {
    const n = Math.min(2, countDeepCards(state, hostSide));
    if (n > 0) setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (def.id === "bone_lantern") releaseInhabitant(state, hostSide, altitude, u);
  if (def.id === "bell_hollow") {
    if (forceReleaseInhabitantToHand(state, hostSide)) drawOne(state, hostSide);
  }
  if (def.id === "shard_walker" && hasEmptyVessel(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  // stake_sovereign: Eclipse on enemy fall; veiled aura remains in unitPower
  if (
    siteOf(slot, hostSide) === "stake_cache" &&
    witnesser === hostSide &&
    def.heresy === "cube" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (
    siteOf(slot, hostSide) === "pillar_cache" &&
    witnesser === hostSide &&
    def.heresy === "coral" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (
    siteOf(slot, hostSide) === "dust_cache" &&
    witnesser === hostSide &&
    def.heresy === "deal" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  // Heresy sites → Mid Witness engines (like caches)
  if (
    siteOf(slot, hostSide) === "dust_ledger" &&
    witnesser === hostSide &&
    def.heresy === "deal" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (
    siteOf(slot, hostSide) === "pale_arch" &&
    witnesser === hostSide &&
    def.heresy === "hollow" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (
    siteOf(slot, hostSide) === "abyss_cairn" &&
    witnesser === hostSide &&
    def.heresy === "deep" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (
    siteOf(slot, hostSide) === "bone_gallery" &&
    witnesser === hostSide &&
    def.heresy === "shell" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (
    siteOf(slot, hostSide) === "key_shrine" &&
    witnesser === hostSide &&
    def.heresy === "graft" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "hornchain_debtor") {
    u.stanceB = !u.stanceB;
    if (u.stanceB) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    noteStanceSwitch(state, hostSide, altitude);
  }
  if (def.id === "ember_chorus" && altitude === 2) {
    const n = Math.min(2, countVessels(state, hostSide));
    if (n > 0) setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (def.id === "sunset_creditor" && altitude === 1) {
    const had = eclipseOf(state, hostSide) > 0;
    gainEclipse(state, hostSide, 1);
    if (had) drawOne(state, hostSide);
  }
  if (def.id === "ochre_dancer" && altitude === 2 && controlsSiteId(state, hostSide, "veil_banner")) {
    drawOne(state, hostSide);
  }
  if (def.id === "bell_debt_walker" && anyAltitudeTolled(state)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "bell_siren") {
    const midTolled = altitudeIsTolled(state, 1);
    const lureAlt = lureBestEnemyVeiled(state, hostSide);
    if (lureAlt != null) {
      lureWitness(state, hostSide, lureAlt);
    }
    if (midTolled) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "clapper_cantor") {
    placeTollPrefer(state, hostSide, [1, 0, 2]);
  }
  if (def.id === "veil_ringer") {
    placeTollPrefer(state, hostSide, [0, 2]);
  }
  if (def.id === "parasol_debtor" && anyAltitudeTolled(state)) {
    drawOne(state, hostSide);
  }
  if (def.id === "path_bellman") {
    const midAlready = altitudeIsTolled(state, 1);
    const placed = placeToll(state, hostSide, 1);
    if (!placed && midAlready) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "toll_urn") {
    placeToll(state, hostSide, altitude);
  }
  if (def.id === "peal_urn") {
    if (!placeToll(state, hostSide, altitude)) {
      const lureAlt = lureBestEnemyVeiled(state, hostSide);
      if (lureAlt != null) lureWitness(state, hostSide, lureAlt);
    }
  }
  if (def.id === "carillon") {
    placeToll(state, hostSide, 0);
    placeToll(state, hostSide, 2);
    if (altitudeIsTolled(state, 0) && altitudeIsTolled(state, 2)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "highcliff_ringer") {
    if (!placeToll(state, hostSide, 0)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "lowcloth_warden") {
    const lowAlready = altitudeIsTolled(state, 2);
    const placed = placeToll(state, hostSide, 2);
    if (!placed && lowAlready) {
      drawOne(state, hostSide);
    }
  }
  if (def.id === "rope_auditor") {
    if (!placeToll(state, hostSide, 1)) {
      drawOne(state, hostSide);
    }
  }
  if (def.id === "moss_handmaid" && altitude === 1 && controlsSiteId(state, hostSide, "abyss_cairn")) {
    drawOne(state, hostSide);
    if (countVeiledFigures(state, hostSide) > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "sail_widow") {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    if (altitude === 1 && hasGraftSite(state, hostSide)) drawOne(state, hostSide);
  }
  if (def.id === "cutwork_widow") {
    markBlind(state, 2 as Altitude);
  }
  if (def.id === "ribbon_bride" && altitude === 1) {
    const n = Math.min(2, countCoralSites(state, hostSide));
    if (n > 0) setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (def.id === "wick_oracle" && altitude === 1) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    if (hasVesselInPlay(state, hostSide)) drawOne(state, hostSide);
  }
  if (def.id === "tide_singer" && altitude === 2 && controlsSiteId(state, hostSide, "low_tide_shrine")) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    if (hasInhabitantInVessel(state, hostSide)) drawOne(state, hostSide);
  }
  if (def.id === "millwright_colossus" && altitude === 1) drawOne(state, hostSide);
  if (def.id === "perforated_abbess") {
    markBlind(state, altitude);
  }
  if (def.id === "cutwork_sovereign") {
    markBlind(state, 0 as Altitude);
  }
  if (def.id === "tablet_walker" && altitude === 1 && controlsOtherCoral(state, hostSide, altitude)) {
    gainEclipse(state, hostSide, 1);
  }
  if (def.id === "gallery_debtor") {
    u.stanceB = !u.stanceB;
    noteStanceSwitch(state, hostSide, altitude);
    if (u.stanceB && controlsSiteId(state, hostSide, "mask_gallery")) {
      drawOne(state, hostSide);
    }
  }
  if (def.id === "river_jack" && altitude === 1 && controlsSiteId(state, hostSide, "dust_ledger")) {
    if (eclipseOf(state, hostSide) > 0) drawOne(state, hostSide);
    else setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "pillar_sovereign" && altitude === 1) {
    const n = Math.min(2, countCoralSites(state, hostSide));
    if (n > 0) gainEclipse(state, hostSide, n);
  }
  if (def.id === "salt_veil") {
    if (controlsSiteId(state, hostSide, "bone_gallery")) drawOne(state, hostSide);
    if (hasVesselInPlay(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "ring_warden" && controlsGazeAltitude(state, hostSide)) {
    drawOne(state, hostSide);
  }
  if (def.id === "stake_runner") {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    if (countVeiledFigures(state, hostSide) > 0) drawOne(state, hostSide);
  }
  if (def.id === "cataract_bell" && altitude === 1) {
    if (hasDeepSite(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "wick_throne") {
    tuckIntoEmptyVessel(state, hostSide);
  }
  if (def.id === "arch_debtor" && altitude === 1 && controlsSiteId(state, hostSide, "pale_arch")) {
    drawOne(state, hostSide);
    markBlind(state, 2 as Altitude);
  }
  if (def.id === "parasol_debtor" && controlsSiteId(state, hostSide, "parasol_path")) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "key_debtor" && altitude === 1 && hasGraftSite(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    if (u.grafts.length > 0) drawOne(state, hostSide);
  }
  if (def.id === "mesa_bell" && altitude === 0) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    if (countVeiledFigures(state, hostSide) > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "ledger_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (eclipseOf(state, hostSide) > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "horn_cantor" && hasStanceBFigure(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "coral_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (controlsCoral(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "low_runner" && altitude === 2) {
    drawOne(state, hostSide);
    if (controlsSiteId(state, hostSide, "veil_banner")) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "mask_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (hasStanceBFigure(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "sail_runner" && altitude === 1) {
    let otherGraftFigure = false;
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === altitude) continue;
      const ou = unitOf(state.altitudes[a as Altitude], hostSide);
      if (ou && getCard(ou.cardId).type === "figure" && getCard(ou.cardId).heresy === "graft") {
        otherGraftFigure = true;
        break;
      }
    }
    if (otherGraftFigure) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "mire_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (hasDeepSite(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "mid_runner" && altitude === 1) {
    if (controlsSiteId(state, hostSide, "veil_banner") || unitOf(state.altitudes[2], hostSide)?.veiled) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    if (countVeiledFigures(state, hostSide) >= 2) drawOne(state, hostSide);
  }
  if (def.id === "iris_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (controlsGazeAltitude(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "key_cantor" && altitude === 1 && hasGraftSite(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    if (u.grafts.length > 0) drawOne(state, hostSide);
  }
  if (def.id === "dusk_cantor") {
    if (eclipseOf(state, hostSide) > 0) drawOne(state, hostSide);
    if (altitude === 1) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "tithe_jackal") {
    if (eclipseOf(state, hostSide) > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    if (altitude === 1 && noEnemyFigureHere(state, altitude, hostSide)) {
      gainEclipse(state, hostSide, 1);
    }
  }
  if (def.id === "holecloak_auditor") {
    if (eclipseOf(state, hostSide) > 0) {
      drawOne(state, hostSide);
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    } else {
      gainEclipse(state, hostSide, 1);
    }
  }
  if (def.id === "amber_widow") {
    if (eclipseOf(state, other(hostSide)) > 0) gainEclipse(state, hostSide, 1);
    if (eclipseOf(state, hostSide) > 0) drawOne(state, hostSide);
  }
  if (def.id === "windkey_courier") {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    if (midHasNoEnemyFigure(state, hostSide)) gainEclipse(state, hostSide, 1);
  }
  if (def.id === "eclipse_sovereign") {
    gainEclipse(state, hostSide, 1);
  }
  if (def.id === "ledger_bouncer") {
    bounceEnemyVeiledHere(state, hostSide, altitude);
    if (midHasNoEnemyFigure(state, hostSide)) gainEclipse(state, hostSide, 1);
  }
  if (def.id === "sundebt_widow") {
    if (spendEclipse(state, hostSide, 1)) {
      drawOne(state, hostSide);
      drawOne(state, hostSide);
    } else {
      gainEclipse(state, hostSide, 1);
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "recall_cantor") {
    bounceFriendlyVeiledElsewhere(state, hostSide, altitude);
    if (eclipseOf(state, hostSide) > 0) drawOne(state, hostSide);
    else setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "tithe_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (eclipseOf(state, hostSide) > 0) drawOne(state, hostSide);
  }
  if (def.id === "cliff_creditor") {
    const opp = other(hostSide);
    if (eclipseOf(state, opp) > 0) {
      const os = sightOf(state, opp);
      if (os > 0) setSight(state, opp, os - 1);
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    if (midHasNoEnemyFigure(state, hostSide)) gainEclipse(state, hostSide, 1);
  }
  if (def.id === "ledger_matron") {
    gainEclipse(state, hostSide, 1);
    state.debtSurgeArmed[hostSide] = true;
  }
  if (def.id === "mesa_duelist") {
    if (midHasNoEnemyFigure(state, hostSide)) drawOne(state, hostSide);
    if (eclipseOf(state, hostSide) > 0) state.mesaBuffAlt[hostSide] = altitude;
  }
  if (def.id === "coin_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (eclipseOf(state, other(hostSide)) > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "arch_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (hasHollowSite(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "stake_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (hasCubeSite(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "splice_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (hasGraftSite(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "ribbon_runner" && altitude === 1) {
    const n = Math.min(2, countCoralSites(state, hostSide));
    if (n > 0) setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (def.id === "horn_runner" && altitude === 1 && hasStanceBFigure(state, hostSide)) {
    drawOne(state, hostSide);
    if (u.stanceB) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "midwick_voice") {
    if (altitude === 1 && hasVesselInPlay(state, hostSide)) drawOne(state, hostSide);
    else setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "parasol_runner" && altitude === 1 && controlsGazeAltitude(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const eu = unitOf(state.altitudes[a as Altitude], other(hostSide));
      if (eu?.veiled && altitudeHasGaze(state, a as Altitude, hostSide)) {
        gainEclipse(state, hostSide, 1);
        break;
      }
    }
  }
  if (def.id === "pale_runner" && altitude === 1 && hasHollowSite(state, hostSide)) {
    markBlind(state, altitude);
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "cataract_runner" && altitude === 1 && hasDeepSite(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    // Chain seed: free-Witness hint — Sight if another Cataract is still Veiled
    if (countVeiledFigures(state, hostSide) > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }

  // ——— Waves 17–25 · Heresy Seals ———
  if (def.id === "ochre_warden" && altitude === 2 && countVeiledFigures(state, hostSide) > 0) {
    drawOne(state, hostSide);
  }
  if (
    siteOf(slot, hostSide) === "stake_mast" &&
    witnesser === hostSide &&
    def.heresy === "cube" &&
    def.type === "figure" &&
    countVeiledFigures(state, hostSide) > 0
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "mesa_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (hasCubeSite(state, hostSide) || countVeiledFigures(state, hostSide) > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "dusk_walker") {
    if (eclipseOf(state, hostSide) > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    if (altitude === 1 && !unitOf(slot, other(hostSide))) {
      gainEclipse(state, hostSide, 1);
    }
  }
  if (
    siteOf(slot, hostSide) === "coin_gallery" &&
    witnesser === hostSide &&
    def.heresy === "deal" &&
    def.type === "figure" &&
    eclipseOf(state, hostSide) > 0
  ) {
    drawOne(state, hostSide);
  }
  if (
    siteOf(slot, hostSide) === "empty_mesa" &&
    witnesser === hostSide &&
    def.type === "figure" &&
    midHasNoEnemyFigure(state, hostSide)
  ) {
    gainEclipse(state, hostSide, 1);
  }
  if (def.id === "jackal_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (eclipseOf(state, hostSide) > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "twin_debtor") {
    u.stanceB = !u.stanceB;
    noteStanceSwitch(state, hostSide, altitude);
    if (u.stanceB) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "horn_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (hasStanceBFigure(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "brass_hound" && altitude === 1 && u.grafts.length > 0) {
    drawOne(state, hostSide);
  }
  if (
    siteOf(slot, hostSide) === "sail_cache" &&
    witnesser === hostSide &&
    def.heresy === "graft" &&
    def.type === "figure" &&
    u.grafts.length > 0
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "windmill_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (hasGraftSite(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "aperture_cantor") {
    markBlind(state, 1 as Altitude);
  }
  if (
    siteOf(slot, hostSide) === "cutwork_cache" &&
    witnesser === hostSide &&
    def.heresy === "hollow" &&
    def.type === "figure"
  ) {
    markBlind(state, 0 as Altitude);
  }
  if (def.id === "void_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (hasHollowSite(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "pillar_bride" && altitude === 1 && countCoralSites(state, hostSide) >= 2) {
    gainEclipse(state, hostSide, 1);
  }
  if (
    siteOf(slot, hostSide) === "ribbon_mast" &&
    witnesser === hostSide &&
    def.heresy === "coral" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "tablet_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (countCoralSites(state, hostSide) > 0) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "wick_walker") {
    if (hasVesselInPlay(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    if (hasInhabitantInVessel(state, hostSide)) drawOne(state, hostSide);
  }
  if (def.id === "tide_chanter") {
    if (altitude === 1 && hasInhabitantInVessel(state, hostSide)) drawOne(state, hostSide);
    else if (hasVesselInPlay(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "rib_warden" && hasInhabitantInVessel(state, hostSide)) {
    markBlind(state, altitude);
  }
  if (def.id === "gallery_keeper") {
    if (hasInhabitantInVessel(state, hostSide)) drawOne(state, hostSide);
    state.vesselSurgeArmed[hostSide] = true;
  }
  if (def.id === "shard_blade" && hasVesselInPlay(state, hostSide)) {
    markBlind(state, altitude);
  }
  if (def.id === "blue_shard_caller") {
    const n = Math.min(2, countVessels(state, hostSide));
    if (n > 0) setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (def.id === "bone_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (controlsSiteId(state, hostSide, "bone_gallery")) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "wick_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
  }
  if (def.id === "moss_walker") {
    if (altitude === 1) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    if (countVeiledFigures(state, hostSide) > 0) drawOne(state, hostSide);
  }
  if (
    siteOf(slot, hostSide) === "cataract_cache" &&
    witnesser === hostSide &&
    def.heresy === "deep" &&
    def.type === "figure" &&
    countVeiledFigures(state, hostSide) > 0
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "abyss_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    stainEnemyAt(state, hostSide, altitude);
  }
  if (def.id === "iris_cantor") {
    if (controlsGazeAltitude(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const eu = unitOf(state.altitudes[a as Altitude], other(hostSide));
      if (eu?.veiled && altitudeHasGaze(state, a as Altitude, hostSide)) {
        gainEclipse(state, hostSide, 1);
        break;
      }
    }
  }
  if (def.id === "parasol_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (controlsGazeAltitude(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }

  // --- Scar Breach Revelations ---
  if (def.id === "rivet_vanguard") {
    const openAlt = pickOtherFriendlyVeiledFigure(state, hostSide, altitude);
    if (openAlt != null && openOwnFigure(state, hostSide, openAlt, { discount: 1 })) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "ember_banner") {
    const n = Math.min(3, countWitnessedFigures(state, hostSide));
    if (n > 0) setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (def.id === "highscar_lancer") {
    if (altitude === 0) drawOne(state, hostSide);
    else setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "scarsteel_cleaver") {
    drawOne(state, hostSide);
    const openAlt = pickOtherFriendlyVeiledFigure(state, hostSide, altitude);
    if (openAlt != null) openOwnFigure(state, hostSide, openAlt, { discount: 1 });
  }
  if (def.id === "slag_reaper" && anyEnemyStrained(state, hostSide)) {
    dealWillToOpponent(state, hostSide, 1);
  }
  if (def.id === "ashcoil_blade") {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    const openAlt = pickOtherFriendlyVeiledFigure(state, hostSide, altitude);
    if (openAlt != null) openOwnFigure(state, hostSide, openAlt, { discount: 1 });
  }
  if (def.id === "iron_urn") {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 2));
  }
  if (def.id === "cliffbrand_captain") {
    if (altitude === 0) {
      const foe = unitOf(state.altitudes[0], other(hostSide));
      if (foe) blindAltitude(state, hostSide, 0);
      else drawOne(state, hostSide);
    } else {
      drawOne(state, hostSide);
    }
  }
  if (def.id === "lowscar_warden") {
    if (altitude === 2) drawOne(state, hostSide);
    else setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "ember_herald") {
    const openAlt = pickOtherFriendlyVeiledFigure(state, hostSide, altitude);
    if (openAlt != null) openOwnFigure(state, hostSide, openAlt, { discount: 1 });
    else setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 2));
  }
  if (def.id === "skaroth") {
    const openAlt = pickOtherFriendlyVeiledFigure(state, hostSide, altitude);
    if (openAlt != null) openOwnFigure(state, hostSide, openAlt, { discount: 1 });
    if (countWitnessedFigures(state, hostSide) >= 2) {
      dealWillToOpponent(state, hostSide, 1);
      drawOne(state, hostSide);
    }
  }
  if (def.id === "ash_urn") {
    const openAlt = pickOtherFriendlyVeiledFigure(state, hostSide, altitude);
    if (openAlt == null || !openOwnFigure(state, hostSide, openAlt, { free: true })) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 2));
    }
  }

  if (def.id === "depth_matron" && !opts?.skipMatronChain && altitude === 1) {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === altitude) continue;
      const ou = unitOf(state.altitudes[a as Altitude], hostSide);
      if (ou && ou.veiled) {
        witnessFree(state, hostSide, a as Altitude);
        break;
      }
    }
  }
}

/** Free Witness (no Sight cost) — Depth Matron chain. Flips only; Revelations do not fire. */
function witnessFree(state: MatchState, controller: Side, altitude: Altitude): void {
  const slot = state.altitudes[altitude];
  const u = unitOf(slot, controller);
  if (!u || !u.veiled) return;
  const def = getCard(u.cardId);
  if (def.type !== "figure" && def.type !== "vessel") return;

  u.veiled = false;
  state.witnessedHeresiesThisTurn.push(def.heresy);

  push(state, {
    type: "witness",
    side: controller,
    altitude,
    cardId: def.id,
  });
}

/**
 * Effective Sight cost to Witness at an altitude.
 * HIGH Gaze: −1 · LOW: +1 (own or Gaze) · MID: printed.
 */
export function witnessCostAt(
  altitude: Altitude,
  baseCost: number,
  enemyTarget: boolean,
): number {
  let c = baseCost;
  if (altitude === 2) c += 1;
  if (altitude === 0 && enemyTarget) c = Math.max(0, c - 1);
  return c;
}

function doWitness(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  enemyTarget: boolean,
): boolean {
  const targetSide = enemyTarget ? other(side) : side;
  if (state.altitudes[altitude].blinded) return false;
  if (enemyTarget && !altitudeHasGaze(state, altitude, side)) return false;
  const slot = state.altitudes[altitude];
  const u = unitOf(slot, targetSide);
  if (!u || !u.veiled) return false;
  const def = getCard(u.cardId);
  if (def.type !== "figure" && def.type !== "vessel") return false;
  const cost = witnessCostAt(altitude, def.witnessCost, enemyTarget);
  if (sightOf(state, side) < cost) return false;

  setSight(state, side, sightOf(state, side) - cost);
  applySmotherSightTax(state, side);
  applyRopeAuditorTax(state, side, altitude);
  applyLowscarWitnessTax(state, side, altitude);

  // Motley: Gaze Busts before unveil; own Witness Folds ante that existed before Revelation
  const foldAfter = !enemyTarget && u.wagered;
  if (enemyTarget && u.wagered) {
    applyBust(state, targetSide, altitude, u);
  }

  u.veiled = false;
  u.scrutiny = 0;
  if (!enemyTarget) u.openedSinceResolve = true;
  state.witnessedHeresiesThisTurn.push(def.heresy);
  if (!u.revelationFired) {
    applyRevelation(state, side, targetSide, altitude, u, enemyTarget);
    u.revelationFired = true;
  }
  if (foldAfter && u.wagered) {
    foldWager(state, targetSide, altitude, u);
  }
  onEnemyFigureBecameWitnessed(state, targetSide, altitude, u);
  if (!enemyTarget) {
    onFriendlyFigureOpened(state, side, altitude, u);
  }

  // Bellward Toll: Veil Ringer sees Tolled Witness; enemy Witness/Gaze into *your* Toll pays (sticky).
  // Own Witness / Gaze on your own Toll leaves the trap. Lure / own Resolve lose clear via tryPayToll.
  notifyVeilRingerOnEnemyWitness(state, side, altitude);
  if (enemyTarget) {
    const tollOwner = state.tollOwner[altitude];
    if (tollOwner && tollOwner !== side) {
      tryPayToll(state, side, altitude);
    }
  }

  // MID Revelation: own Witness draws 1
  if (!enemyTarget && altitude === 1) {
    drawOne(state, side);
  }

  if (enemyTarget) {
    const ally = unitOf(slot, side);
    if (ally && !ally.veiled && ally.cardId === "iris_heliograph") {
      gainEclipse(state, side, 1);
    }
  }

  // Gallery of Debts: enemy Witness here → Motley Figure enters Stance B + Sight
  const galleryOwner = other(side);
  if (siteOf(slot, galleryOwner) === "gallery_of_debts") {
    const gu = unitOf(slot, galleryOwner);
    if (gu && getCard(gu.cardId).heresy === "motley" && (getCard(gu.cardId).type === "figure" || getCard(gu.cardId).type === "vessel")) {
      enterStanceB(state, galleryOwner, altitude, gu);
      setSight(state, galleryOwner, Math.min(SIGHT_CARRY_CAP, sightOf(state, galleryOwner) + 1));
    }
  }
  // Tithe Mast: enemy Witness here → if mast owner has Eclipse, gain 1 Sight
  if (siteOf(slot, galleryOwner) === "tithe_mast" && eclipseOf(state, galleryOwner) > 0) {
    setSight(state, galleryOwner, Math.min(SIGHT_CARRY_CAP, sightOf(state, galleryOwner) + 1));
  }

  push(state, {
    type: "witness",
    side,
    altitude,
    cardId: def.id,
    enemyTarget: enemyTarget || undefined,
  });
  return true;
}

export function createMatch(opts?: {
  seed?: number;
  tutorial?: boolean;
  /** Constructed 20 — validated. Omit for Teach deck. */
  deck?: string[];
  enemyDeck?: string[];
  aiDifficulty?: AiDifficulty;
}): MatchState {
  let seed = opts?.seed ?? Date.now();
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  if (opts?.deck) {
    const v = validateConstructedDeck(opts.deck);
    if (!v.ok) throw new Error(v.issues.map((i) => i.message).join(" "));
  }
  if (opts?.enemyDeck) {
    const v = validateConstructedDeck(opts.enemyDeck);
    if (!v.ok) throw new Error(v.issues.map((i) => i.message).join(" "));
  }

  const prophecies: string[] = [];
  const enemyProphecies: string[] = [];
  const playerSource = opts?.deck ?? teachDeck();
  // AI never mirrors the player's constructed list — curated rival archetypes.
  const enemySource = opts?.enemyDeck ?? pickAiOpponentDeck(seed, playerSource);
  let deck = extractProphecies(shuffle([...playerSource], rng), prophecies);
  let enemyDeck = extractProphecies(shuffle([...enemySource], rng), enemyProphecies);
  const hand: string[] = [];
  const enemyHand: string[] = [];
  while (hand.length < 3 && deck.length) {
    const id = deck.pop()!;
    if (getCard(id).type === "prophecy") prophecies.push(id);
    else hand.push(id);
  }
  while (enemyHand.length < 3 && enemyDeck.length) {
    const id = enemyDeck.pop()!;
    if (getCard(id).type === "prophecy") enemyProphecies.push(id);
    else enemyHand.push(id);
  }

  const state: MatchState = {
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
    vesselSurgeArmed: { player: false, enemy: false },
    mesaBuffAlt: { player: null, enemy: null },
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
    altitudes: emptyBoard(),
    hand,
    enemyHand,
    deck,
    enemyDeck,
    prophecies,
    enemyProphecies,
    essence: 0,
    enemyEssence: 0,
    sight: 0,
    enemySight: 0,
    favor: 0,
    enemyFavor: 0,
    favorGainedThisTurn: { player: false, enemy: false },
    cashThisResolve: { player: 0, enemy: 0 },
    will: START_WILL,
    enemyWill: START_WILL,
    eclipse: 0,
    enemyEclipse: 0,
    witnessedHeresiesThisTurn: [],
    prophecyProgress: 0,
    winner: null,
    endReason: null,
    events: [],
    nextId: 1,
    tutorial: !!opts?.tutorial,
    tutorialStep: opts?.tutorial ? "intro" : "done",
    aiDifficulty: opts?.aiDifficulty ?? "normal",
  };
  beginTurn(state, "player", true);
  if (opts?.tutorial) setupTutorial(state);
  return state;
}

export function legalIntents(state: MatchState): Intent[] {
  if (state.phase !== "play") return [];
  const side = state.active;
  const out: Intent[] = [{ kind: "pass" }];
  const hand = handOf(state, side);
  const ess = essenceOf(state, side);
  const sight = sightOf(state, side);

  for (let hi = 0; hi < hand.length; hi++) {
    const def = getCard(hand[hi]);
    if (def.type === "rite") {
      if (ess >= def.essence) {
        for (let a = 0; a < ALTITUDE_COUNT; a++) {
          out.push({ kind: "rite", handIndex: hi, altitude: a as Altitude });
        }
      }
      continue;
    }
    if (def.type === "relic") {
      if (ess >= def.essence) {
        for (let a = 0; a < ALTITUDE_COUNT; a++) {
          const u = unitOf(state.altitudes[a as Altitude], side);
          if (u && getCard(u.cardId).type === "figure") {
            out.push({ kind: "graft", handIndex: hi, altitude: a as Altitude });
          }
        }
      }
      continue;
    }
    if (def.type === "prophecy") continue;
    if (ess < def.essence) continue;

    if (def.type === "site" || def.type === "sigil") {
      for (let a = 0; a < ALTITUDE_COUNT; a++) {
        const slot = state.altitudes[a as Altitude];
        if (!siteOf(slot, side)) {
          if (def.type === "sigil") {
            if (unitOf(slot, side)) {
              out.push({ kind: "play", handIndex: hi, altitude: a as Altitude });
            }
          } else {
            out.push({ kind: "play", handIndex: hi, altitude: a as Altitude });
          }
        }
      }
      continue;
    }

    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const slot = state.altitudes[a as Altitude];
      const occ = unitOf(slot, side);
      if (!occ) {
        out.push({ kind: "play", handIndex: hi, altitude: a as Altitude });
        continue;
      }
      // Overwrite: bounce own figure/vessel if hand has room after play
      const t = getCard(occ.cardId).type;
      if (t === "figure" || t === "vessel") {
        const after = hand.length - 1 + bounceCardsReturning(occ);
        if (after <= HAND_MAX) {
          out.push({ kind: "play", handIndex: hi, altitude: a as Altitude });
        }
      }
    }
  }

  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const alt = a as Altitude;
    const slot = state.altitudes[alt];
    const u = unitOf(slot, side);
    if (u?.veiled && !slot.blinded) {
      const def = getCard(u.cardId);
      const cost = witnessCostAt(alt, def.witnessCost, false);
      if (sight >= cost) out.push({ kind: "witness", altitude: alt });
    }
    if (
      u &&
      !u.veiled &&
      !state.reveilUsed[side] &&
      (getCard(u.cardId).type === "figure" || getCard(u.cardId).type === "vessel") &&
      !slot.blinded
    ) {
      const def = getCard(u.cardId);
      const cost = witnessCostAt(alt, def.witnessCost, false);
      if (sight >= cost) out.push({ kind: "reveil", altitude: alt });
    }
    if (
      u &&
      getCard(u.cardId).type === "figure" &&
      (u.hasThirdFace ||
        siteOf(slot, side) === "third_face" ||
        getCard(u.cardId).heresy === "motley") &&
      !state.stanceUsed[side]
    ) {
      out.push({ kind: "stance", altitude: alt });
    }
    if (
      u?.veiled &&
      !u.wagered &&
      getCard(u.cardId).type === "figure" &&
      getCard(u.cardId).heresy === "motley" &&
      !state.wagerUsed[side] &&
      !slot.blinded
    ) {
      const favorAnte = FAVOR_ANTE_FIGURES.has(u.cardId);
      if (favorAnte ? favorOf(state, side) >= 1 : sight >= 1) {
        out.push({ kind: "wager", altitude: alt });
      }
    }
    // Ink Press — enemy Veiled + Stained; Motley Stance B needs only Veiled (free)
    if (!state.pressUsed[side] && sidePlaysHeresy(state, side, "ink") && !slot.blinded) {
      const eu = unitOf(slot, other(side));
      if (eu?.veiled && getCard(eu.cardId).type === "figure") {
        const freeVsTrick = eu.stanceB && getCard(eu.cardId).heresy === "motley";
        if (freeVsTrick || (eu.stained && sight >= 1)) {
          out.push({ kind: "press", altitude: alt });
        }
      }
    }
    // Toll Peal — arm your Toll
    if (
      !state.pealUsed[side] &&
      sidePlaysHeresy(state, side, "toll") &&
      state.tollOwner[alt] === side &&
      !state.pealArmed[alt] &&
      sight >= 1
    ) {
      out.push({ kind: "peal", altitude: alt });
    }
    const eu = unitOf(slot, other(side));
    if (eu?.veiled && !slot.blinded && altitudeHasGaze(state, alt, side)) {
      const def = getCard(eu.cardId);
      const cost = witnessCostAt(alt, def.witnessCost, true);
      if (sight >= cost) out.push({ kind: "witness", altitude: alt, enemy: true });
    }
  }

  return filterTutorialIntents(state, out);
}

export function applyIntent(state: MatchState, intent: Intent): OculusEvent[] {
  if (state.phase !== "play") return [];
  const side = state.active;
  const legal = legalIntents(state);
  if (!legal.some((i) => JSON.stringify(i) === JSON.stringify(intent))) {
    return takeEvents(state);
  }

  const done = (): OculusEvent[] => {
    if (state.tutorial) advanceTutorial(state, intent);
    return takeEvents(state);
  };

  if (intent.kind === "pass") {
    if (state.tutorial && isTutorialSoftPass(state.tutorialStep)) {
      advanceTutorial(state, intent);
      return takeEvents(state);
    }
    // Mark tutorial complete before onPass so the enemy is ungated
    if (state.tutorial) advanceTutorial(state, intent);
    onPass(state, side);
    return takeEvents(state);
  }

  if (intent.kind === "stance") {
    if (state.stanceUsed[side]) return takeEvents(state);
    const u = unitOf(state.altitudes[intent.altitude], side);
    if (u) {
      switchUnitStance(state, side, intent.altitude, u);
      state.stanceUsed[side] = true;
      push(state, {
        type: "stance",
        side,
        altitude: intent.altitude,
        stanceB: u.stanceB,
      });
    }
    return done();
  }

  if (intent.kind === "wager") {
    tryWager(state, side, intent.altitude);
    return done();
  }

  if (intent.kind === "press") {
    tryPress(state, side, intent.altitude);
    return done();
  }

  if (intent.kind === "peal") {
    tryPeal(state, side, intent.altitude);
    return done();
  }

  if (intent.kind === "witness") {
    doWitness(state, side, intent.altitude, !!intent.enemy);
    return done();
  }

  if (intent.kind === "reveil") {
    if (state.reveilUsed[side]) return takeEvents(state);
    const slot = state.altitudes[intent.altitude];
    if (slot.blinded) return takeEvents(state);
    const u = unitOf(slot, side);
    if (!u || u.veiled) return takeEvents(state);
    const def = getCard(u.cardId);
    if (def.type !== "figure" && def.type !== "vessel") return takeEvents(state);
    const cost = witnessCostAt(intent.altitude, def.witnessCost, false);
    if (sightOf(state, side) < cost) return takeEvents(state);
    setSight(state, side, sightOf(state, side) - cost);
    u.veiled = true;
    state.reveilUsed[side] = true;
    push(state, { type: "reveil", side, altitude: intent.altitude, cardId: def.id });
    return done();
  }

  if (intent.kind === "graft") {
    const hand = handOf(state, side);
    const cardId = hand[intent.handIndex];
    const def = getCard(cardId);
    const u = unitOf(state.altitudes[intent.altitude], side);
    if (!u || def.type !== "relic" || getCard(u.cardId).type !== "figure") return takeEvents(state);
    setEssence(state, side, essenceOf(state, side) - def.essence);
    hand.splice(intent.handIndex, 1);
    u.grafts.push({ instanceId: `g${state.nextId++}`, cardId });
    push(state, { type: "graft", side, altitude: intent.altitude, relicId: cardId });
    return done();
  }

  if (intent.kind === "rite") {
    const hand = handOf(state, side);
    const cardId = hand[intent.handIndex];
    const def = getCard(cardId);
    if (intent.altitude === undefined) return takeEvents(state);
    if (
      def.id !== "hole_choir" &&
      def.id !== "pale_silence" &&
      def.id !== "ribbon_tithe" &&
      def.id !== "dusk_tithe" &&
      def.id !== "depth_bell" &&
      def.id !== "splice_rite" &&
      def.id !== "horn_tithe" &&
      def.id !== "stake_tithe" &&
      def.id !== "pale_tithe" &&
      def.id !== "gaze_tithe" &&
      def.id !== "shell_tithe" &&
      def.id !== "cairn_tithe" &&
      !INK_ABYSS_RITE_IDS.has(def.id) &&
      !MOTLEY_COURT_RITE_IDS.has(def.id) &&
      !BELLWARD_TOLL_RITE_IDS.has(def.id) &&
      !IRON_BREACH_RITE_IDS.has(def.id) &&
      !DUSK_LEDGER_RITE_IDS.has(def.id) &&
      !BONEWICK_RITE_IDS.has(def.id) &&
      !HERESY_SEALS_RITE_IDS.has(def.id)
    ) {
      return takeEvents(state);
    }
    setEssence(state, side, essenceOf(state, side) - def.essence);
    hand.splice(intent.handIndex, 1);
    if (def.id === "sound_the_toll") {
      const alt = intent.altitude;
      if (!altitudeIsTolled(state, alt)) {
        placeToll(state, side, alt);
        fireResonance(state, side, alt);
      } else {
        const foe = unitOf(state.altitudes[alt], other(side));
        if (foe?.veiled && (getCard(foe.cardId).type === "figure" || getCard(foe.cardId).type === "vessel")) {
          if (!lureWitness(state, side, alt)) {
            setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
          }
        } else {
          setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
        }
      }
      state.soundTollPealBonus[side] = true;
    } else if (def.id === "ring_out") {
      const alt = intent.altitude;
      if (altitudeIsTolled(state, alt)) {
        fireResonance(state, side, alt);
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
        tryPeal(state, side, alt, { free: true });
      } else {
        placeToll(state, side, alt);
        fireResonance(state, side, alt);
      }
    } else if (def.id === "full_peal") {
      fireResonance(state, side, intent.altitude);
      if (anyAltitudeTolled(state)) {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      } else {
        placeToll(state, side, 1);
      }
      if (state.tollOwner[intent.altitude] === side) {
        tryPeal(state, side, intent.altitude, { free: true });
      } else {
        for (let a = 0; a < ALTITUDE_COUNT; a++) {
          if (state.tollOwner[a as Altitude] === side) {
            tryPeal(state, side, a as Altitude, { free: true });
            break;
          }
        }
      }
    } else if (def.id === "breach_order") {
      const alt = intent.altitude;
      const u = unitOf(state.altitudes[alt], side);
      if (u && getCard(u.cardId).type === "figure") {
        if (u.veiled) openOwnFigure(state, side, alt, { discount: 1 });
        else dealWillToOpponent(state, side, 1);
      }
    } else if (def.id === "full_breach") {
      setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      state.fullBreachArmed[side] = true;
    } else if (def.id === "last_breach") {
      const alt = intent.altitude;
      const u = unitOf(state.altitudes[alt], side);
      if (u && getCard(u.cardId).type === "figure") {
        if (u.veiled) {
          if (openOwnFigure(state, side, alt, { discount: 1 })) {
            const opened = unitOf(state.altitudes[alt], side);
            if (opened) opened.lastBreachOpened = true;
          }
        } else dealWillToOpponent(state, side, 2);
      }
    } else if (def.id === "false_hold") {
      state.falseHoldArmed[side] = true;
    } else if (def.id === "smile_that_holds") {
      state.falseFaceArmed[side] = true;
    } else if (def.id === "second_flip") {
      const u = unitOf(state.altitudes[intent.altitude], side);
      if (u && getCard(u.cardId).type === "figure") {
        const wasB = u.stanceB;
        switchUnitStance(state, side, intent.altitude, u);
        if (!wasB && u.stanceB && countStanceBFigures(state, side) >= 2) {
          drawOne(state, side);
        }
      }
    } else if (def.id === "slip_the_mark") {
      const u = unitOf(state.altitudes[intent.altitude], side);
      if (u && getCard(u.cardId).type === "figure") {
        switchUnitStance(state, side, intent.altitude, u);
      }
      if (moveStainFromAltitude(state, side, intent.altitude)) {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
    } else if (def.id === "echo_the_flip") {
      const u = unitOf(state.altitudes[intent.altitude], side);
      if (u && getCard(u.cardId).type === "figure") {
        const wasB = u.stanceB;
        switchUnitStance(state, side, intent.altitude, u);
        if (!wasB && u.stanceB) {
          const otherU = switchOtherStance(state, side, intent.altitude);
          if (u.stanceB && otherU?.stanceB) drawOne(state, side);
        }
      }
    } else if (def.id === "curtain_call") {
      const n = countStanceBFigures(state, side);
      if (n >= 1) {
        drawOne(state, side);
        if (n >= 2) {
          setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
        }
      } else {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
    } else if (def.id === "encore_flip") {
      const u = unitOf(state.altitudes[intent.altitude], side);
      if (u && getCard(u.cardId).type === "figure") {
        const wasB = u.stanceB;
        switchUnitStance(state, side, intent.altitude, u);
        if (!wasB && u.stanceB && u.veiled) {
          state.encoreBuffAlt[side] = intent.altitude;
        }
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
    } else if (def.id === "jury_grin") {
      if (countStanceBFigures(state, side) >= 2) {
        drawOne(state, side);
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      } else {
        const u = unitOf(state.altitudes[intent.altitude], side);
        if (u && getCard(u.cardId).type === "figure") {
          switchUnitStance(state, side, intent.altitude, u);
        }
      }
    } else if (def.id === "pale_smother") {
      const stained = stainEnemyAt(state, side, intent.altitude);
      if (stained?.veiled) blindAltitude(state, side, intent.altitude);
      if (intent.altitude === 1) {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
    } else if (def.id === "void_smother") {
      stainEnemyAt(state, side, intent.altitude);
      if (state.altitudes[intent.altitude].blinded) {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
    } else if (def.id === "ink_tide") {
      const foe = other(side);
      let blinds = 0;
      for (let a = 0; a < ALTITUDE_COUNT; a++) {
        const u = unitOf(state.altitudes[a as Altitude], foe);
        if (u?.stained && getCard(u.cardId).type === "figure") {
          blindAltitude(state, side, a as Altitude);
          blinds += 1;
        }
      }
      if (blinds >= 2) drawOne(state, side);
    } else if (def.id === "gala_call") {
      gainFavor(state, side, 1);
      state.galaSurgeArmed[side] = true;
    } else if (def.id === "raise_the_ante") {
      const u = unitOf(state.altitudes[intent.altitude], side);
      if (u?.veiled) {
        const t = getCard(u.cardId).type;
        if (t === "figure" || t === "vessel") {
          if (u.wagered) {
            blindAltitude(state, side, intent.altitude);
          } else if (sightOf(state, side) >= 1 && t === "figure") {
            setSight(state, side, sightOf(state, side) - 1);
            u.wagered = true;
            u.wagerAntePaid = true;
            u.wagerAnteFavor = false;
            push(state, {
              type: "wager",
              side,
              altitude: intent.altitude,
              cardId: u.cardId,
              free: false,
            });
          }
        }
      }
    } else if (def.id === "final_raise") {
      const u = unitOf(state.altitudes[intent.altitude], side);
      if (u) {
        const t = getCard(u.cardId).type;
        if (t === "figure" || t === "vessel") {
          if (u.wagered) {
            if (favorOf(state, side) >= 1) {
              setFavor(state, side, favorOf(state, side) - 1);
              gainEclipse(state, side, 1);
            } else {
              drawOne(state, side);
            }
          } else if (sightOf(state, side) >= 1 && u.veiled && getCard(u.cardId).type === "figure") {
            // Paid ante Wager (not Free) — Final Raise as ante push
            setSight(state, side, sightOf(state, side) - 1);
            u.wagered = true;
            u.wagerAntePaid = true;
            u.wagerAnteFavor = false;
            push(state, { type: "wager", side, altitude: intent.altitude, cardId: u.cardId, free: false });
          } else {
            drawOne(state, side);
          }
        }
      }
    } else if (def.id === "ashen_tithe") {
      const u = unitOf(state.altitudes[intent.altitude], other(side));
      if (u?.stained && getCard(u.cardId).type === "figure") {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
        drawOne(state, side);
        if (u.veiled) {
          blindAltitude(state, side, intent.altitude);
          tryPress(state, side, intent.altitude, { free: true });
        }
      }
    } else if (def.id === "mire_surge") {
      state.mireSurgeArmed[side] = true;
      if (anyEnemyStained(state, side)) blindAltitude(state, side, 2);
    } else if (def.id === "echo_blot") {
      const foe = unitOf(state.altitudes[intent.altitude], other(side));
      const wasStained = !!(foe?.stained);
      stainEnemyAt(state, side, intent.altitude);
      if (intent.altitude === 1) drawOne(state, side);
      if (wasStained) blindAltitude(state, side, intent.altitude);
    } else if (def.id === "depth_bell") {
      const n = Math.min(2, countDeepCards(state, side));
      if (n > 0) setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + n));
    } else if (def.id === "splice_rite") {
      if (hasGraftSite(state, side)) {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      } else {
        markBlind(state, intent.altitude);
      }
    } else if (def.id === "horn_tithe") {
      if (hasStanceBFigure(state, side)) drawOne(state, side);
      else markBlind(state, intent.altitude);
    } else if (def.id === "stake_tithe") {
      if (hasCubeSite(state, side)) {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      } else {
        markBlind(state, 2 as Altitude);
      }
    } else if (def.id === "dusk_tithe") {
      if (eclipseOf(state, side) > 0) drawOne(state, side);
      else markBlind(state, intent.altitude);
    } else if (def.id === "pale_tithe") {
      markBlind(state, 1 as Altitude);
      if (controlsSiteId(state, side, "pale_arch")) drawOne(state, side);
    } else if (def.id === "gaze_tithe") {
      if (controlsGazeAltitude(state, side)) drawOne(state, side);
      else markBlind(state, intent.altitude);
    } else if (def.id === "shell_tithe") {
      if (hasVesselInPlay(state, side)) drawOne(state, side);
      else setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    } else if (def.id === "cairn_tithe") {
      if (hasDeepSite(state, side)) drawOne(state, side);
      else markBlind(state, intent.altitude);
    } else if (def.id === "hold_tithe") {
      if (controlsSiteId(state, side, "veil_banner")) drawOne(state, side);
      else markBlind(state, 2 as Altitude);
    } else if (def.id === "creditor_tithe") {
      if (eclipseOf(state, side) > 0) {
        drawOne(state, side);
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      } else {
        gainEclipse(state, side, 1);
      }
    } else if (def.id === "settle_accounts") {
      if (spendEclipse(state, side, 1)) {
        drawOne(state, side);
      } else {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
    } else if (def.id === "call_the_debt") {
      bounceEnemyVeiledHere(state, side, intent.altitude);
      if (eclipseOf(state, side) > 0) drawOne(state, side);
    } else if (def.id === "double_entry") {
      if (spendEclipse(state, side, 1)) {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 2));
      } else {
        gainEclipse(state, side, 1);
      }
    } else if (def.id === "foreclose") {
      if (spendEclipse(state, side, 1)) {
        if (bounceEnemyVeiledHere(state, side, intent.altitude)) drawOne(state, side);
      } else {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
    } else if (def.id === "open_books") {
      if (midHasNoEnemyFigure(state, side)) {
        gainEclipse(state, side, 1);
        drawOne(state, side);
      } else {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
    } else if (def.id === "facet_tithe") {
      if (hasStanceBFigure(state, side)) drawOne(state, side);
      else markBlind(state, intent.altitude);
    } else if (def.id === "key_tithe") {
      if (hasGraftSite(state, side)) {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      } else {
        markBlind(state, intent.altitude);
      }
    } else if (def.id === "aperture_tithe") {
      markBlind(state, 0 as Altitude);
      if (controlsSiteId(state, side, "pale_arch")) drawOne(state, side);
    } else if (def.id === "colony_tithe") {
      if (countCoralSites(state, side) > 0) drawOne(state, side);
      else markBlind(state, intent.altitude);
    } else if (def.id === "wick_tithe") {
      if (hasInhabitantInVessel(state, side)) {
        drawOne(state, side);
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      } else {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
    } else if (def.id === "forced_wick") {
      if (forceReleaseInhabitantToHand(state, side) && countVessels(state, side) > 1) {
        drawOne(state, side);
      }
    } else if (def.id === "empty_shell") {
      if (hasEmptyVessel(state, side)) drawOne(state, side);
      else setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
    } else if (def.id === "shell_tax") {
      if (hasInhabitantInVessel(state, side)) {
        bounceEnemyVeiledHere(state, side, intent.altitude);
      } else {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
    } else if (def.id === "open_shell") {
      drawOne(state, side);
      tuckIntoEmptyVessel(state, side);
    } else if (def.id === "verdant_tithe") {
      const n = Math.min(2, countDeepCards(state, side));
      if (n > 0) setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + n));
      else markBlind(state, intent.altitude);
    } else if (def.id === "iris_tithe") {
      if (controlsGazeAltitude(state, side)) drawOne(state, side);
      else markBlind(state, 0 as Altitude);
    } else {
      markBlind(state, intent.altitude);
      if (def.id === "hole_choir") drawOne(state, side);
      if (def.id === "ribbon_tithe" && controlsCoral(state, side)) drawOne(state, side);
    }
    push(state, { type: "rite", side, cardId, altitude: intent.altitude });
    return done();
  }

  if (intent.kind === "play") {
    const hand = handOf(state, side);
    const cardId = hand[intent.handIndex];
    const def = getCard(cardId);
    const slot = state.altitudes[intent.altitude];
    setEssence(state, side, essenceOf(state, side) - def.essence);
    hand.splice(intent.handIndex, 1);

    if (def.type === "site" || def.type === "sigil") {
      setSite(slot, side, cardId);
      if (def.type === "sigil" && unitOf(slot, side)) {
        unitOf(slot, side)!.hasThirdFace = true;
      }
      if (cardId === "stainwell") applyStainwell(state, side, intent.altitude);
      push(state, { type: "play", side, altitude: intent.altitude, cardId, veiled: false });
      return done();
    }

    let inhabitant: string | null = null;
    if (def.type === "vessel") {
      const figIdx = hand.findIndex((id) => getCard(id).type === "figure");
      if (figIdx >= 0) {
        inhabitant = hand.splice(figIdx, 1)[0]!;
        noteTuck(state, side);
      }
    }

    if (unitOf(slot, side)) {
      bounceOwnToHand(state, side, intent.altitude);
    }

    const u = mint(state, cardId, true);
    u.inhabitant = inhabitant;
    if (siteOf(slot, side) === "third_face") u.hasThirdFace = true;
    setUnit(slot, side, u);
    // Enemy Stainwell on this lane stains a newly played Veiled figure
    applyStainwell(state, other(side), intent.altitude);
    push(state, { type: "play", side, altitude: intent.altitude, cardId, veiled: true });
    return done();
  }

  return takeEvents(state);
}
