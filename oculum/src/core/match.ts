import { getCard, teachDeck } from "./cards";
import { validateConstructedDeck } from "./construct";
import { pickAiOpponentDeck } from "./decks";
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
  HAND_MAX,
  MAX_TURNS,
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
  };
}

function drawOne(state: MatchState, side: Side): void {
  const deck = deckOf(state, side);
  const hand = handOf(state, side);
  if (deck.length === 0 || hand.length >= HAND_MAX) return;
  const id = deck.pop()!;
  // Prophecy cards sit in the law zone, not the hand
  if (getCard(id).type === "prophecy") {
    propheciesOf(state, side).push(id);
    return;
  }
  hand.push(id);
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

export function unitPower(state: MatchState, altitude: Altitude, side: Side): number {
  const slot = state.altitudes[altitude];
  const u = unitOf(slot, side);
  if (!u) return 0;
  const def = getCard(u.cardId);
  if (u.hybridSite) return 0;

  let veiledP = def.veiledPower;
  let witP = def.witnessedPower;
  if (u.stanceB) {
    const t = veiledP;
    veiledP = witP;
    witP = t;
  }
  let p = u.veiled ? veiledP : witP;

  for (const g of u.grafts) {
    const r = getCard(g.cardId);
    if (!u.veiled) p += r.witnessedPower;
  }

  if (siteOf(slot, side) === "veil_banner" && u.veiled && def.type === "figure") p += 1;
  if (siteOf(slot, side) === "branch_rune_reliquary" && !u.veiled && def.type === "figure") p += 1;
  if (siteOf(slot, side) === "low_tide_shrine" && u.veiled && def.type === "vessel") p += 1;
  if (siteOf(slot, side) === "dust_ledger" && !u.veiled && def.school === "deal" && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "pale_arch" && !u.veiled && def.school === "hollow" && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "void_gallery" && u.veiled && def.school === "hollow" && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "suture_mill" && u.veiled && def.school === "graft" && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "key_shrine" && !u.veiled && def.school === "graft" && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "abyss_cairn" && !u.veiled && def.school === "deep" && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "mire_gallery" && u.veiled && def.school === "deep" && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "mask_gallery" && u.stanceB && def.type === "figure") {
    p += 1;
  }
  if (siteOf(slot, side) === "bone_gallery" && !u.veiled && def.school === "shell" && def.type === "figure") {
    p += 1;
  }
  if (altitude === 2 && u.veiled && def.type === "figure") p += 1;

  if (def.type === "figure") {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === altitude) continue;
      const otherU = unitOf(state.altitudes[a as Altitude], side);
      if (otherU && !otherU.veiled && otherU.cardId === "verdant_cataract") {
        p += 1;
        break;
      }
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

  if (def.type === "figure" && def.school === "graft") {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === altitude) continue;
      const otherU = unitOf(state.altitudes[a as Altitude], side);
      if (otherU && !otherU.veiled && otherU.cardId === "millwright_colossus") {
        p += 1;
        break;
      }
    }
  }

  if (def.type === "figure" && def.school === "shell") {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === altitude) continue;
      const otherU = unitOf(state.altitudes[a as Altitude], side);
      if (otherU && !otherU.veiled && otherU.cardId === "ember_sovereign") {
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

function countDeepCards(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const slot = state.altitudes[a as Altitude];
    const site = siteOf(slot, side);
    if (site && getCard(site).school === "deep") n += 1;
    const u = unitOf(slot, side);
    if (u && getCard(u.cardId).school === "deep") n += 1;
    if (u) {
      for (const g of u.grafts) {
        if (getCard(g.cardId).school === "deep") n += 1;
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
    if (site && getCard(site).school === "cube") return true;
  }
  return false;
}

function hasDeepSite(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const site = siteOf(state.altitudes[a as Altitude], side);
    if (site && getCard(site).school === "deep") return true;
  }
  return false;
}

function countCoralSites(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const site = siteOf(state.altitudes[a as Altitude], side);
    if (site && getCard(site).school === "coral") n += 1;
  }
  return n;
}

function controlsOtherCoral(state: MatchState, side: Side, exceptAlt: Altitude): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const slot = state.altitudes[a as Altitude];
    const site = siteOf(slot, side);
    if (site && getCard(site).school === "coral") return true;
    const u = unitOf(slot, side);
    if (!u) continue;
    if (a !== exceptAlt && getCard(u.cardId).school === "coral") return true;
    if (u.grafts.some((g) => getCard(g.cardId).school === "coral")) return true;
  }
  return false;
}

function controlsCoral(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const slot = state.altitudes[a as Altitude];
    const site = siteOf(slot, side);
    if (site && getCard(site).school === "coral") return true;
    const u = unitOf(slot, side);
    if (u && getCard(u.cardId).school === "coral") return true;
    if (u?.grafts.some((g) => getCard(g.cardId).school === "coral")) return true;
  }
  return false;
}

function hasGraftSite(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const site = siteOf(state.altitudes[a as Altitude], side);
    if (site && getCard(site).school === "graft") return true;
  }
  return false;
}

function hasHollowSite(state: MatchState, side: Side): boolean {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const site = siteOf(state.altitudes[a as Altitude], side);
    if (site && getCard(site).school === "hollow") return true;
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
    if (site && getCard(site).school === "graft") return true;
    const u = unitOf(slot, side);
    if (!u) continue;
    if (a !== exceptAlt && getCard(u.cardId).school === "graft") return true;
    if (u.grafts.some((g) => getCard(g.cardId).school === "graft")) return true;
  }
  return false;
}

export function altitudeHasGaze(state: MatchState, altitude: Altitude, side: Side): boolean {
  const slot = state.altitudes[altitude];
  const site = siteOf(slot, side);
  if (site === "ring_gaze" || site === "parasol_path") return true;
  const u = unitOf(slot, side);
  if (u?.grafts.some((g) => g.cardId === "coral_crown")) return true;
  if (u && !u.veiled && (u.cardId === "perforated_abbess" || u.cardId === "iris_heliograph" || u.cardId === "cutwork_sovereign")) {
    return true;
  }
  return false;
}

/** Distinct non-neutral schools Witnessed this action window (for Unblinking Law). */
export function lawSchoolProgress(state: MatchState): number {
  return new Set(state.witnessedSchoolsThisTurn.filter((s) => s !== "neutral")).size;
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
  if (roundStart) {
    state.passed.player = false;
    state.passed.enemy = false;
    state.stanceUsed.player = false;
    state.stanceUsed.enemy = false;
    for (const slot of state.altitudes) slot.blinded = false;
  }
  state.witnessedSchoolsThisTurn = [];

  setEssence(state, side, Math.min(ESSENCE_CAP, state.turn));
  setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + sightIncome(state, side)));
  drawOne(state, side);
  push(state, { type: "turn", turn: state.turn, side });
}

function checkProphecy(state: MatchState, side: Side): void {
  const props = propheciesOf(state, side);
  if (props.includes("unblinking_law")) {
    const schools = new Set(state.witnessedSchoolsThisTurn.filter((s) => s !== "neutral"));
    if (schools.size >= 3) {
      gainEclipse(state, side, 2);
      state.prophecyProgress += 1;
      push(state, { type: "law", side, cardId: "unblinking_law", eclipseGain: 2 });
    }
  }
  if (props.includes("shuttered_edict")) {
    const anyBlind = state.altitudes.some((slot) => slot.blinded);
    if (anyBlind) {
      gainEclipse(state, side, 1);
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

function resolveRound(state: MatchState): void {
  let dmgPlayer = 0;
  let dmgEnemy = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const alt = a as Altitude;
    const pp = unitPower(state, alt, "player");
    const ep = unitPower(state, alt, "enemy");
    const highBonus = alt === 0 ? 1 : 0;
    if (pp > ep) dmgEnemy += pp + highBonus;
    else if (ep > pp) dmgPlayer += ep + highBonus;
  }
  state.will = Math.max(0, state.will - dmgPlayer);
  state.enemyWill = Math.max(0, state.enemyWill - dmgEnemy);
  push(state, { type: "resolve", damages: { player: dmgPlayer, enemy: dmgEnemy } });
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
  if (sightOf(state, side) === 0) {
    if (side === "player") state.enemyEclipse += 1;
    else state.eclipse += 1;
  }
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

function gainEclipse(state: MatchState, side: Side, n: number): void {
  if (side === "player") state.eclipse = Math.min(ECLIPSE_WIN, state.eclipse + n);
  else state.enemyEclipse = Math.min(ECLIPSE_WIN, state.enemyEclipse + n);
}

function eclipseOf(state: MatchState, side: Side): number {
  return side === "player" ? state.eclipse : state.enemyEclipse;
}

function countWitnessedFigures(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && !u.veiled && getCard(u.cardId).type === "figure") n += 1;
  }
  return n;
}

function switchOtherStance(state: MatchState, side: Side, exceptAlt: Altitude): void {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (
      u &&
      getCard(u.cardId).type === "figure" &&
      (u.hasThirdFace || siteOf(state.altitudes[a as Altitude], side) === "third_face")
    ) {
      u.stanceB = !u.stanceB;
      if (siteOf(state.altitudes[a as Altitude], side) === "twinspoke_banner") {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
      return;
    }
  }
  // No Third Face required for Echo Mask — flip any other friendly figure
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).type === "figure") {
      u.stanceB = !u.stanceB;
      if (siteOf(state.altitudes[a as Altitude], side) === "twinspoke_banner") {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
      return;
    }
  }
}

function switchOtherFiguresStance(state: MatchState, side: Side, exceptAlt: Altitude): void {
  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    if (a === exceptAlt) continue;
    const u = unitOf(state.altitudes[a as Altitude], side);
    if (u && getCard(u.cardId).type === "figure") {
      u.stanceB = !u.stanceB;
      if (siteOf(state.altitudes[a as Altitude], side) === "twinspoke_banner") {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
    }
  }
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

  if (u.grafts.some((g) => g.cardId === "ace_of_hollows")) {
    drawOne(state, hostSide);
  }
  if (u.grafts.some((g) => g.cardId === "bone_wick_charm")) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "debt_coin") && eclipseOf(state, hostSide) > 0) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "splice_token") && hasGraftSite(state, hostSide)) {
    drawOne(state, hostSide);
  }
  if (u.grafts.some((g) => g.cardId === "void_charm")) {
    slot.blinded = true;
  }
  if (u.grafts.some((g) => g.cardId === "iris_seal") && controlsGazeAltitude(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "cube_charm") && altitude === 0) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "face_charm")) {
    u.stanceB = !u.stanceB;
    if (siteOf(slot, hostSide) === "twinspoke_banner") {
      setSight(state, hostSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, hostSide) + 1));
    }
  }
  if (u.grafts.some((g) => g.cardId === "moss_charm") && hasDeepSite(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "dusk_charm") && eclipseOf(state, hostSide) > 0) {
    slot.blinded = true;
  }
  if (u.grafts.some((g) => g.cardId === "coral_charm") && countCoralSites(state, hostSide) > 0) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "mask_charm") && hasStanceBFigure(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "wick_charm") && hasVesselInPlay(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (u.grafts.some((g) => g.cardId === "iris_charm") && controlsGazeAltitude(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }

  if (def.id === "cliff_seeker") {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "hatline_trickster") bounceVeiled(state, other(witnesser));
  if (def.id === "root_chassis") u.hybridSite = true;
  if (def.id === "ribcity_angel") releaseInhabitant(state, hostSide, altitude, u);
  if (def.id === "stake_field_pilgrim") {
    if (!unitOf(slot, other(hostSide))) gainEclipse(state, hostSide, 1);
  }
  if (def.id === "keywright_scarecrow") {
    drawOne(state, hostSide);
    if (siteOf(slot, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "ochre_vanguard") gainEclipse(state, hostSide, 1);
  if (def.id === "echo_mask") switchOtherStance(state, hostSide, altitude);
  if (def.id === "ledger_jackal" && eclipseOf(state, hostSide) > 0) drawOne(state, hostSide);
  if (def.id === "verdant_cataract") {
    const n = Math.min(3, countWitnessedFigures(state, hostSide));
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (def.id === "split_gaze_seraph") {
    switchOtherFiguresStance(state, hostSide, altitude);
    if (countStanceBFigures(state, hostSide) >= 2) gainEclipse(state, hostSide, 1);
  }
  if (def.id === "saltglass_courier" && altitude === 0) drawOne(state, hostSide);
  if (def.id === "pillar_cantor" && siteOf(slot, hostSide)) gainEclipse(state, hostSide, 1);
  if (def.id === "canister_hound" && controlsOtherGraft(state, hostSide, altitude)) {
    drawOne(state, hostSide);
  }
  if (def.id === "inkdrip_acolyte") slot.blinded = true;
  if (def.id === "mire_debtor") {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "ash_lantern") releaseInhabitant(state, hostSide, altitude, u);
  if (def.id === "bell_debt_walker" && controlsGazeAltitude(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "shard_pilgrim" && hasVesselInPlay(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "stake_sovereign") gainEclipse(state, hostSide, 1);
  if (
    siteOf(slot, hostSide) === "stake_cache" &&
    witnesser === hostSide &&
    def.school === "cube" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (
    siteOf(slot, hostSide) === "pillar_cache" &&
    witnesser === hostSide &&
    def.school === "coral" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (
    siteOf(slot, hostSide) === "dust_cache" &&
    witnesser === hostSide &&
    def.school === "deal" &&
    def.type === "figure"
  ) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "hornchain_debtor") {
    u.stanceB = !u.stanceB;
    if (u.stanceB) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
    if (siteOf(slot, hostSide) === "twinspoke_banner") {
      setSight(state, hostSide, Math.min(SIGHT_CARRY_CAP, sightOf(state, hostSide) + 1));
    }
  }
  if (def.id === "ember_chorus") {
    const n = Math.min(2, countVessels(state, hostSide));
    if (n > 0) setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (def.id === "sunset_creditor") {
    const had = eclipseOf(state, hostSide) > 0;
    gainEclipse(state, hostSide, 1);
    if (had) drawOne(state, hostSide);
  }
  if (def.id === "ochre_dancer" && controlsSiteId(state, hostSide, "veil_banner")) {
    drawOne(state, hostSide);
  }
  if (def.id === "bell_siren") {
    const n = Math.min(2, countGazeAltitudes(state, hostSide));
    if (n > 0) setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (def.id === "moss_handmaid" && controlsSiteId(state, hostSide, "abyss_cairn")) {
    drawOne(state, hostSide);
  }
  if (def.id === "sail_widow") {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    if (hasGraftSite(state, hostSide)) drawOne(state, hostSide);
  }
  if (def.id === "cutwork_widow") {
    state.altitudes[2].blinded = true;
  }
  if (def.id === "ribbon_bride") {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      const site = siteOf(state.altitudes[a as Altitude], hostSide);
      if (site && getCard(site).school === "coral") {
        setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
        break;
      }
    }
  }
  if (def.id === "wick_oracle") {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    if (hasVesselInPlay(state, hostSide)) drawOne(state, hostSide);
  }
  if (def.id === "tide_singer" && controlsSiteId(state, hostSide, "low_tide_shrine")) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "millwright_colossus") drawOne(state, hostSide);
  if (def.id === "cutwork_sovereign") {
    state.altitudes[1].blinded = true;
  }
  if (def.id === "tablet_walker" && controlsOtherCoral(state, hostSide, altitude)) {
    gainEclipse(state, hostSide, 1);
  }
  if (def.id === "gallery_debtor" && controlsSiteId(state, hostSide, "mask_gallery")) {
    drawOne(state, hostSide);
  }
  if (def.id === "river_jack" && controlsSiteId(state, hostSide, "dust_ledger")) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "pillar_sovereign") {
    const n = Math.min(2, countCoralSites(state, hostSide));
    if (n > 0) gainEclipse(state, hostSide, n);
  }
  if (def.id === "ash_widow" && controlsSiteId(state, hostSide, "bone_gallery")) {
    drawOne(state, hostSide);
  }
  if (def.id === "ring_warden" && controlsGazeAltitude(state, hostSide)) {
    drawOne(state, hostSide);
  }
  if (def.id === "stake_runner") {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "cataract_bell") {
    if (hasDeepSite(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "ember_sovereign") {
    const n = Math.min(2, countVessels(state, hostSide));
    if (n > 0) setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + n));
  }
  if (def.id === "arch_debtor" && controlsSiteId(state, hostSide, "pale_arch")) {
    drawOne(state, hostSide);
  }
  if (def.id === "parasol_debtor" && controlsSiteId(state, hostSide, "parasol_path")) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "key_debtor" && hasGraftSite(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "mesa_bell" && altitude === 0) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
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
  }
  if (def.id === "mask_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (hasStanceBFigure(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "sail_runner") {
    let otherGraftFigure = false;
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === altitude) continue;
      const ou = unitOf(state.altitudes[a as Altitude], hostSide);
      if (ou && getCard(ou.cardId).type === "figure" && getCard(ou.cardId).school === "graft") {
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
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "iris_urn") {
    releaseInhabitant(state, hostSide, altitude, u);
    if (controlsGazeAltitude(state, hostSide)) {
      setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
    }
  }
  if (def.id === "key_cantor" && altitude === 1 && hasGraftSite(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "dusk_cantor" && altitude === 1 && eclipseOf(state, hostSide) > 0) {
    drawOne(state, hostSide);
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
  if (def.id === "ribbon_runner" && altitude === 1 && countCoralSites(state, hostSide) > 0) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "horn_runner" && altitude === 1 && hasStanceBFigure(state, hostSide)) {
    drawOne(state, hostSide);
  }
  if (def.id === "wick_cantor" && altitude === 1 && hasVesselInPlay(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "parasol_runner" && altitude === 1 && controlsGazeAltitude(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "pale_runner" && altitude === 1 && hasHollowSite(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }
  if (def.id === "cataract_runner" && altitude === 1 && hasDeepSite(state, hostSide)) {
    setSight(state, witnesser, Math.min(SIGHT_CARRY_CAP, sightOf(state, witnesser) + 1));
  }

  if (def.id === "depth_matron" && !opts?.skipMatronChain) {
    for (let a = 0; a < ALTITUDE_COUNT; a++) {
      if (a === altitude) continue;
      // Freely Witness the Matron's controller's other units (works when Gazed too).
      witnessFree(state, hostSide, a as Altitude);
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
  state.witnessedSchoolsThisTurn.push(def.school);

  push(state, {
    type: "witness",
    side: controller,
    altitude,
    cardId: def.id,
  });
}

function doWitness(
  state: MatchState,
  side: Side,
  altitude: Altitude,
  enemyTarget: boolean,
): boolean {
  const targetSide = enemyTarget ? other(side) : side;
  if (enemyTarget && !altitudeHasGaze(state, altitude, side)) return false;
  const slot = state.altitudes[altitude];
  const u = unitOf(slot, targetSide);
  if (!u || !u.veiled) return false;
  const def = getCard(u.cardId);
  if (def.type !== "figure" && def.type !== "vessel") return false;
  if (sightOf(state, side) < def.witnessCost) return false;

  setSight(state, side, sightOf(state, side) - def.witnessCost);
  u.veiled = false;
  state.witnessedSchoolsThisTurn.push(def.school);
  applyRevelation(state, side, targetSide, altitude, u, enemyTarget);

  if (enemyTarget) {
    const ally = unitOf(slot, side);
    if (ally && !ally.veiled && ally.cardId === "iris_heliograph") {
      gainEclipse(state, side, 1);
    }
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
  /** Constructed 30 — validated. Omit for Teach deck. */
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
    will: START_WILL,
    enemyWill: START_WILL,
    eclipse: 0,
    enemyEclipse: 0,
    witnessedSchoolsThisTurn: [],
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
      if (!unitOf(state.altitudes[a as Altitude], side)) {
        out.push({ kind: "play", handIndex: hi, altitude: a as Altitude });
      }
    }
  }

  for (let a = 0; a < ALTITUDE_COUNT; a++) {
    const alt = a as Altitude;
    const slot = state.altitudes[alt];
    const u = unitOf(slot, side);
    if (u?.veiled) {
      const def = getCard(u.cardId);
      if (sight >= def.witnessCost) out.push({ kind: "witness", altitude: alt });
    }
    if (
      u &&
      getCard(u.cardId).type === "figure" &&
      (u.hasThirdFace || siteOf(slot, side) === "third_face") &&
      !state.stanceUsed[side]
    ) {
      out.push({ kind: "stance", altitude: alt });
    }
    const eu = unitOf(slot, other(side));
    if (eu?.veiled && altitudeHasGaze(state, alt, side)) {
      const def = getCard(eu.cardId);
      if (sight >= def.witnessCost) out.push({ kind: "witness", altitude: alt, enemy: true });
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
      u.stanceB = !u.stanceB;
      state.stanceUsed[side] = true;
      if (siteOf(state.altitudes[intent.altitude], side) === "twinspoke_banner") {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      }
      push(state, {
        type: "stance",
        side,
        altitude: intent.altitude,
        stanceB: u.stanceB,
      });
    }
    return done();
  }

  if (intent.kind === "witness") {
    doWitness(state, side, intent.altitude, !!intent.enemy);
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
      def.id !== "ember_tithe" &&
      def.id !== "cairn_tithe"
    ) {
      return takeEvents(state);
    }
    setEssence(state, side, essenceOf(state, side) - def.essence);
    hand.splice(intent.handIndex, 1);
    if (def.id === "depth_bell") {
      const n = Math.min(2, countDeepCards(state, side));
      if (n > 0) setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + n));
    } else if (def.id === "splice_rite") {
      if (hasGraftSite(state, side)) {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      } else {
        state.altitudes[intent.altitude].blinded = true;
      }
    } else if (def.id === "horn_tithe") {
      if (hasStanceBFigure(state, side)) drawOne(state, side);
      else state.altitudes[intent.altitude].blinded = true;
    } else if (def.id === "stake_tithe") {
      if (hasCubeSite(state, side)) {
        setSight(state, side, Math.min(SIGHT_CARRY_CAP, sightOf(state, side) + 1));
      } else {
        state.altitudes[2].blinded = true;
      }
    } else if (def.id === "dusk_tithe") {
      if (eclipseOf(state, side) > 0) drawOne(state, side);
      else state.altitudes[intent.altitude].blinded = true;
    } else if (def.id === "pale_tithe") {
      state.altitudes[1].blinded = true;
      if (controlsSiteId(state, side, "pale_arch")) drawOne(state, side);
    } else if (def.id === "gaze_tithe") {
      if (controlsGazeAltitude(state, side)) drawOne(state, side);
      else state.altitudes[intent.altitude].blinded = true;
    } else if (def.id === "ember_tithe") {
      state.altitudes[intent.altitude].blinded = true;
      if (hasVesselInPlay(state, side)) drawOne(state, side);
    } else if (def.id === "cairn_tithe") {
      if (hasDeepSite(state, side)) drawOne(state, side);
      else state.altitudes[intent.altitude].blinded = true;
    } else {
      state.altitudes[intent.altitude].blinded = true;
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
      push(state, { type: "play", side, altitude: intent.altitude, cardId, veiled: false });
      return done();
    }

    let inhabitant: string | null = null;
    if (def.type === "vessel") {
      const figIdx = hand.findIndex((id) => getCard(id).type === "figure");
      if (figIdx >= 0) inhabitant = hand.splice(figIdx, 1)[0];
    }

    const u = mint(state, cardId, true);
    u.inhabitant = inhabitant;
    if (siteOf(slot, side) === "third_face") u.hasThirdFace = true;
    setUnit(slot, side, u);
    push(state, { type: "play", side, altitude: intent.altitude, cardId, veiled: true });
    return done();
  }

  return takeEvents(state);
}
