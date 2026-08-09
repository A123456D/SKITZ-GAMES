import { getCard } from "./cards";
import { applyIntent, altitudeHasGaze, lawHeresyProgress, legalIntents, sidePlaysHeresy, unitPower } from "./match";
import { chooseTutorialEnemyMove } from "./tutorial";
import type { AiDifficulty, Altitude, BoardUnit, Intent, MatchState, Side } from "./types";

function other(side: Side): Side {
  return side === "player" ? "enemy" : "player";
}

function noiseFor(d: AiDifficulty): number {
  switch (d) {
    case "easy":
      return 28;
    case "hard":
      return 0;
    default:
      return 2;
  }
}

function handOf(state: MatchState, side: Side): string[] {
  return side === "player" ? state.hand : state.enemyHand;
}

function sightOf(state: MatchState, side: Side): number {
  return side === "player" ? state.sight : state.enemySight;
}

function essenceOf(state: MatchState, side: Side): number {
  return side === "player" ? state.essence : state.enemyEssence;
}

function eclipseOf(state: MatchState, side: Side): number {
  return side === "player" ? state.eclipse : state.enemyEclipse;
}

function favorOf(state: MatchState, side: Side): number {
  return side === "player" ? state.favor : state.enemyFavor;
}

function propheciesOf(state: MatchState, side: Side): string[] {
  return side === "player" ? state.prophecies : state.enemyProphecies;
}

function myUnit(state: MatchState, side: Side, alt: Altitude): BoardUnit | null {
  return state.altitudes[alt][side];
}

function mySite(state: MatchState, side: Side, alt: Altitude): string | null {
  return side === "player" ? state.altitudes[alt].playerSite : state.altitudes[alt].enemySite;
}

function foeUnit(state: MatchState, side: Side, alt: Altitude): BoardUnit | null {
  return state.altitudes[alt][other(side)];
}

function hasStanceB(state: MatchState, side: Side): boolean {
  for (let a = 0; a < 3; a++) {
    if (myUnit(state, side, a as Altitude)?.stanceB) return true;
  }
  return false;
}

function controlsSiteId(state: MatchState, side: Side, id: string): boolean {
  for (let a = 0; a < 3; a++) {
    if (mySite(state, side, a as Altitude) === id) return true;
  }
  return false;
}

function altitudeIsTolled(state: MatchState, alt: Altitude): boolean {
  return state.tollOwner[alt] != null;
}

function anyAltitudeTolled(state: MatchState): boolean {
  return state.tollOwner.some((t) => t != null);
}

function sidePlaysBreach(state: MatchState, side: Side): boolean {
  for (let a = 0; a < 3; a++) {
    const u = myUnit(state, side, a as Altitude);
    if (u && getCard(u.cardId).heresy === "breach") return true;
    const site = mySite(state, side, a as Altitude);
    if (site && getCard(site).heresy === "breach") return true;
  }
  return handOf(state, side).some((id) => getCard(id).heresy === "breach");
}

function countFriendlyWitnessedBreachFigures(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < 3; a++) {
    const u = myUnit(state, side, a as Altitude);
    if (u && !u.veiled && getCard(u.cardId).heresy === "breach" && getCard(u.cardId).type === "figure") {
      n += 1;
    }
  }
  return n;
}

function countEnemyVeiledFigures(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < 3; a++) {
    const u = foeUnit(state, side, a as Altitude);
    if (u?.veiled && getCard(u.cardId).type === "figure") n += 1;
  }
  return n;
}

function figurePlaysAt(state: MatchState, side: Side, alt: Altitude): number {
  return state.figurePlaysThisWindow?.[side]?.[alt] ?? 0;
}

function countFriendlyFigureAlts(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < 3; a++) {
    const u = myUnit(state, side, a as Altitude);
    if (u && (getCard(u.cardId).type === "figure" || getCard(u.cardId).type === "vessel")) n += 1;
  }
  return n;
}

function totalFigurePlaysThisWindow(state: MatchState, side: Side): number {
  const row = state.figurePlaysThisWindow?.[side];
  if (!row) return 0;
  return row[0] + row[1] + row[2];
}

/** Positive when our Will is lower than the opponent's — we should press harder. */
function willPressure(state: MatchState, side: Side): number {
  const myWill = side === "player" ? state.will : state.enemyWill;
  const foeWill = side === "player" ? state.enemyWill : state.will;
  return foeWill - myWill;
}

/** Motley Eclipse package on a lane — Wager / Stance B Veiled / Lady Masque. */
function foeMotleyEclipsePiece(state: MatchState, side: Side, alt: Altitude): BoardUnit | null {
  const u = foeUnit(state, side, alt);
  if (!u || getCard(u.cardId).type !== "figure") return null;
  if (getCard(u.cardId).heresy !== "motley") return null;
  if (u.cardId === "lady_masque") return u;
  if (u.wagered) return u;
  if (u.veiled && u.stanceB) return u;
  return null;
}

function countFoeMotleyEclipsePieces(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < 3; a++) {
    if (foeMotleyEclipsePiece(state, side, a as Altitude)) n += 1;
  }
  return n;
}

function foePlaysMotley(state: MatchState, side: Side): boolean {
  for (let a = 0; a < 3; a++) {
    const u = foeUnit(state, side, a as Altitude);
    if (u && getCard(u.cardId).heresy === "motley") return true;
    const site = side === "player" ? state.altitudes[a as Altitude].enemySite : state.altitudes[a as Altitude].playerSite;
    if (site && getCard(site).heresy === "motley") return true;
  }
  return handOf(state, other(side)).some((id) => getCard(id).heresy === "motley");
}

/** How urgently we must interrupt Motley's seal race (0–3). */
function motleySealPressure(state: MatchState, side: Side): number {
  if (!foePlaysMotley(state, side)) return 0;
  const ecl = eclipseOf(state, other(side));
  const pieces = countFoeMotleyEclipsePieces(state, side);
  let p = 0;
  if (pieces > 0) p += 1;
  if (pieces >= 2) p += 1;
  if (ecl >= 2) p += 1;
  if (ecl >= 3) p += 1;
  if (ecl >= 4) p += 1;
  return Math.min(3, p);
}

/** Score bonus for contesting a Motley Eclipse lane (Gaze / Blind / race). */
function scoreContestMotleyLane(
  state: MatchState,
  side: Side,
  alt: Altitude,
  kind: "gaze" | "blind" | "race" | "open",
): number {
  const piece = foeMotleyEclipsePiece(state, side, alt);
  if (!piece) return 0;
  const pressure = motleySealPressure(state, side);
  const def = getCard(piece.cardId);
  let s = 10 + pressure * 8;
  if (piece.cardId === "lady_masque") s += 22;
  if (piece.wagered) s += 16;
  if (piece.veiled && piece.stanceB) s += 10;
  if (def.sovereign) s += 8;
  if (kind === "gaze" && piece.veiled) s += 18; // steal Revelation / strip Veil for Cash
  if (kind === "blind") s += 14; // shut the Cash lane for a Resolve
  if (kind === "race") {
    const mine = unitPower(state, alt, side);
    const theirs = unitPower(state, alt, other(side));
    if (mine > theirs) s += 12;
    else if (mine + 2 >= theirs) s += 6;
    else s += 2;
  }
  if (kind === "open") {
    // Witness own body here to outpace Veiled-B Masque / Wager
    const mineU = myUnit(state, side, alt);
    if (mineU?.veiled) s += 16;
    else if (mineU && !mineU.veiled) s += 6;
  }
  return s;
}

function hasGraftSchoolOnBoard(state: MatchState, side: Side): boolean {
  for (let a = 0; a < 3; a++) {
    const u = myUnit(state, side, a as Altitude);
    if (!u) continue;
    if (getCard(u.cardId).heresy === "graft") return true;
    if (u.grafts.some((g) => getCard(g.cardId).heresy === "graft")) return true;
    const site = mySite(state, side, a as Altitude);
    if (site && getCard(site).heresy === "graft") return true;
  }
  return false;
}

function veiledFigureAlts(state: MatchState, side: Side): Altitude[] {
  const out: Altitude[] = [];
  for (let a = 0; a < 3; a++) {
    const u = myUnit(state, side, a as Altitude);
    if (u?.veiled && getCard(u.cardId).type === "figure") out.push(a as Altitude);
  }
  return out;
}

/** Relics that want to be grafted before Witness for Revelation value. */
const GRAFT_BEFORE_WITNESS = new Set([
  "ace_of_hollows",
  "bone_wick_charm",
  "coral_crown",
  "debt_coin",
  "splice_token",
  "void_charm",
  "iris_seal",
  "cube_charm",
  "face_charm",
  "moss_charm",
  "dusk_charm",
  "coral_charm",
  "mask_charm",
  "wick_charm",
  "iris_charm",
  "blot_charm",
  "drip_seal",
  "fool_flip_seal",
  "otherface_seal",
  "harlequin_sash",
  "smother_cord",
  "blot_lens",
  "rivet_charm",
  "eyebrand_charm",
]);

function graftPayoffReady(u: BoardUnit): boolean {
  return u.grafts.some((g) => GRAFT_BEFORE_WITNESS.has(g.cardId));
}

function handHasGraftRelic(state: MatchState, side: Side): boolean {
  return handOf(state, side).some((id) => {
    const def = getCard(id);
    return def.type === "relic" && GRAFT_BEFORE_WITNESS.has(id);
  });
}

const SITE_HERESY_BOOST = new Set([
  "veil_banner",
  "dust_ledger",
  "empty_mesa",
  "coin_gallery",
  "suture_mill",
  "key_shrine",
  "branch_rune_reliquary",
  "twinspoke_banner",
  "mask_gallery",
  "hall_of_borrowed_faces",
  "twinseal_cache",
  "grinning_colonnade",
  "stainwell",
  "blackwater_shrine",
  "abyss_cache",
  "gulf_cairn",
  "cloth_bellspire",
  "choir_loft",
  "banner_bellwalk",
  "scarforge",
  "banner_drill",
  "openwell",
  "ring_gaze",
  "parasol_path",
  "stake_cache",
]);

function siteSynergyForFigure(siteId: string, figureHeresy: string, figureId: string): boolean {
  if (figureHeresy === "cube" && siteId === "veil_banner") return true;
  if (figureHeresy === "deal" && (siteId === "dust_ledger" || siteId === "coin_gallery" || siteId === "empty_mesa")) {
    return true;
  }
  if (figureHeresy === "graft" && (siteId === "suture_mill" || siteId === "key_shrine")) return true;
  if (figureHeresy === "shell" && (siteId === "bone_gallery" || siteId === "inhabit_dock" || siteId === "bone_mast")) {
    return true;
  }
  if (figureHeresy === "motley" && (siteId === "hall_of_borrowed_faces" || siteId === "grinning_colonnade")) {
    return true;
  }
  if (figureHeresy === "ink" && (siteId === "stainwell" || siteId === "blackwater_shrine")) return true;
  if (
    figureHeresy === "toll" &&
    (siteId === "cloth_bellspire" || siteId === "choir_loft" || siteId === "banner_bellwalk")
  ) {
    return true;
  }
  if (
    figureHeresy === "breach" &&
    (siteId === "scarforge" || siteId === "banner_drill" || siteId === "openwell")
  ) {
    return true;
  }
  if (figureHeresy === "cube" && siteId === "stake_cache") return true;
  if (figureId === "ochre_dancer" && siteId === "veil_banner") return true;
  if (figureId === "ribbon_bride" && siteId === "branch_rune_reliquary") return true;
  return false;
}

function handHasFigureWantingSite(state: MatchState, side: Side, siteId: string): boolean {
  return handOf(state, side).some((id) => {
    const def = getCard(id);
    if (def.type !== "figure" && def.type !== "vessel") return false;
    return siteSynergyForFigure(siteId, def.heresy, def.id);
  });
}

function cloneState(state: MatchState): MatchState {
  const s = JSON.parse(JSON.stringify(state)) as MatchState;
  s.events = [];
  return s;
}

/** Static board eval from `side`'s perspective — hard lookahead tie-breaker. */
function evalPosition(state: MatchState, side: Side): number {
  const foe = other(side);
  let s = 0;
  const myWill = side === "player" ? state.will : state.enemyWill;
  const foeWill = side === "player" ? state.enemyWill : state.will;
  s += (foeWill - myWill) * 4;
  s += eclipseOf(state, side) * 6 - eclipseOf(state, foe) * 5;
  s += essenceOf(state, side) * 1.2 + sightOf(state, side) * 2.8 + favorOf(state, side) * 4;

  for (let a = 0; a < 3; a++) {
    const alt = a as Altitude;
    const mine = unitPower(state, alt, side);
    const theirs = unitPower(state, alt, foe);
    const laneWeight = alt === 0 ? 4 : alt === 1 ? 3 : 2;
    s += (mine - theirs) * laneWeight;
    if (mine > theirs) s += 10;
    if (myUnit(state, side, alt) && !foeUnit(state, side, alt)) s += 7;
    if (foeMotleyEclipsePiece(state, side, alt)) s -= 16;
    if (foeUnit(state, side, alt)?.veiled && sightOf(state, side) >= 1) s += 5;
    if (state.tollOwner[alt] === side) s += 12;
    else if (state.tollOwner[alt] === foe) s -= 10;
    if (mySite(state, side, alt) && SITE_HERESY_BOOST.has(mySite(state, side, alt)!)) s += 4;
  }

  s -= motleySealPressure(state, side) * 8;
  s += countEnemyStained(state, side) * 10;
  s += countFriendlyFigureAlts(state, side) * 6;
  s -= totalFigurePlaysThisWindow(state, side) > 2 ? 8 : 0;
  if (sidePlaysHeresy(state, side, "toll") && !anyAltitudeTolled(state)) s -= 28;
  return s;
}

function terminalEval(sim: MatchState, side: Side): number {
  if (sim.winner === side) return 12_000;
  if (sim.winner === other(side)) return -12_000;
  return 0;
}

/** Motley threat / Hold bait / Eclipse race — Hard mindgames. */
function scoreMotleyMindgame(state: MatchState, side: Side, i: Intent): number {
  if (!sidePlaysHeresy(state, side, "motley")) return 0;
  let s = 0;
  const foe = other(side);

  if (i.kind === "pass") {
    for (let a = 0; a < 3; a++) {
      const u = myUnit(state, side, a as Altitude);
      if (!u?.veiled || !u.stanceB || getCard(u.cardId).heresy !== "motley") continue;
      const mine = unitPower(state, a as Altitude, side);
      const theirs = unitPower(state, a as Altitude, foe);
      if (mine >= theirs) s += 14;
      const foeU = foeUnit(state, side, a as Altitude);
      if (foeU?.stained && sidePlaysHeresy(state, foe, "ink")) s += 22;
      if (!u.wagered && favorOf(state, side) > 0) s += 10;
    }
    if (eclipseOf(state, side) >= 3 && favorOf(state, side) > 0) s += 12;
  }

  if (i.kind === "stance") {
    const u = myUnit(state, side, i.altitude);
    const foeU = foeUnit(state, side, i.altitude);
    if (u?.veiled && !u.stanceB && foeU?.stained) s += 18;
    if (u?.veiled && !u.stanceB && sidePlaysHeresy(state, foe, "ink")) {
      if (countEnemyStained(state, side) > 0) s += 8;
    }
  }

  if (i.kind === "wager") {
    const u = myUnit(state, side, i.altitude);
    if (u?.stanceB && favorOf(state, side) > 0 && eclipseOf(state, side) >= 3) s += 20;
    if (u?.stanceB && u.veiled && motleySealPressure(state, foe) >= 2) s += 14;
  }

  if (i.kind === "witness" && !i.enemy) {
    const u = myUnit(state, side, i.altitude);
    if (u?.veiled && u.stanceB && getCard(u.cardId).heresy === "motley") {
      const theirs = unitPower(state, i.altitude, foe);
      if (faceWitnessedPower(getCard(u.cardId), true, graftWitnessBonus(u)) >= theirs) s -= 24;
    }
  }

  return s;
}

/** Ink Stain threat / Press bait — Hard mindgames. */
function scoreInkMindgame(state: MatchState, side: Side, i: Intent): number {
  if (!sidePlaysHeresy(state, side, "ink")) return 0;
  let s = 0;
  const stained = countEnemyStained(state, side);

  if (i.kind === "pass" && stained > 0 && !state.pressUsed[side]) {
    s += 20 + stained * 6;
    for (let a = 0; a < 3; a++) {
      const foe = foeUnit(state, side, a as Altitude);
      if (!foe?.stained || !foe.veiled) continue;
      if (foe.stanceB && getCard(foe.cardId).heresy === "motley") s += 16;
    }
  }

  if (i.kind === "press") {
    const foe = foeUnit(state, side, i.altitude);
    if (foe?.stained && foe.stanceB && getCard(foe.cardId).heresy === "motley") {
      const mine = unitPower(state, i.altitude, side);
      const theirs = unitPower(state, i.altitude, other(side));
      if (mine > theirs) s += 24;
      else s -= 12;
    }
    if (foe?.stained && !foe.stanceB && sidePlaysHeresy(state, other(side), "motley")) {
      s -= 10; // wait for them to enter B
    }
  }

  if (i.kind === "witness" && !i.enemy) {
    const u = myUnit(state, side, i.altitude);
    const foe = foeUnit(state, side, i.altitude);
    if (u && getCard(u.cardId).heresy === "ink" && foe?.veiled && !foe.stained) s += 10;
  }

  return s;
}

function evalMindgames(state: MatchState, side: Side): number {
  let s = 0;
  const foe = other(side);

  if (sidePlaysHeresy(state, side, "motley")) {
    for (let a = 0; a < 3; a++) {
      const u = myUnit(state, side, a as Altitude);
      if (!u?.veiled || getCard(u.cardId).heresy !== "motley") continue;
      const def = getCard(u.cardId);
      const theirs = unitPower(state, a as Altitude, foe);
      const holdPow = faceWitnessedPower(def, u.stanceB, graftWitnessBonus(u));
      if (u.stanceB && holdPow >= theirs) {
        s += 14;
        if (foeUnit(state, side, a as Altitude)?.stained) s += 12;
      }
      if (u.wagered && u.stanceB) s += 16;
    }
    if (eclipseOf(state, side) >= 4) s += 12;
    if (favorOf(state, side) > 0 && motleySealPressure(state, foe) >= 1) s += 10;
  }

  if (sidePlaysHeresy(state, side, "ink")) {
    const stained = countEnemyStained(state, side);
    if (stained > 0 && !state.pressUsed[side]) s += 16 + stained * 5;
  }

  if (sidePlaysHeresy(state, foe, "ink") && countEnemyStained(state, side) > 0) s -= 14;
  if (sidePlaysHeresy(state, foe, "motley") && motleySealPressure(state, side) >= 2) s -= 12;

  return s;
}

function evalAfterMove(
  sim: MatchState,
  side: Side,
  searchDepth: number,
  moveScore: number,
): number {
  if (sim.phase === "end") return terminalEval(sim, side);

  let ev = evalPosition(sim, side) + evalMindgames(sim, side);

  if (sim.active === side) return ev + moveScore * 0.1;

  if (sim.active !== other(side)) return ev;

  if (searchDepth < 1) return ev - 6;

  const reply = chooseAiMove(sim, { searchDepth: 0 });
  applyIntent(sim, reply);
  // applyIntent mutates phase; TS can't see that after the early end-check above
  if (sim.winner != null || (sim.phase as MatchState["phase"]) === "end") {
    return terminalEval(sim, side);
  }

  ev = evalPosition(sim, side) + evalMindgames(sim, side) - 8;

  if (sim.active === other(side) && sim.phase === "play") {
    const passBranch = cloneState(sim);
    applyIntent(passBranch, { kind: "pass" });
    const passEv =
      passBranch.winner != null || (passBranch.phase as MatchState["phase"]) === "end"
        ? terminalEval(passBranch, side)
        : evalPosition(passBranch, side) + evalMindgames(passBranch, side);

    const follow = chooseAiMove(sim, { searchDepth: 0 });
    const followBranch = cloneState(sim);
    applyIntent(followBranch, follow);
    const followEv =
      followBranch.winner != null || (followBranch.phase as MatchState["phase"]) === "end"
        ? terminalEval(followBranch, side)
        : evalPosition(followBranch, side) + evalMindgames(followBranch, side);

    ev = Math.min(ev, passEv, followEv) - 4;
  }

  return ev;
}

function scorePlay(
  state: MatchState,
  side: Side,
  i: Extract<Intent, { kind: "play" }>,
  d: AiDifficulty,
): number {
  const hand = handOf(state, side);
  const id = hand[i.handIndex];
  const def = getCard(id);
  let s = 25 + def.witnessedPower - def.essence;

  const mine = unitPower(state, i.altitude, side);
  const theirs = unitPower(state, i.altitude, other(side));
  if (theirs >= mine) s += d === "hard" ? 10 : 5;

  if (i.altitude === 0) s += d === "hard" ? 6 : 3;
  if (i.altitude === 2 && def.type === "figure") s += d === "easy" ? 4 : 2;

  if (def.type === "site") {
    s += d === "hard" ? 10 : 7;
    if (handHasFigureWantingSite(state, side, def.id)) s += d === "hard" ? 26 : 18;
    if (def.id === "veil_banner") {
      s += 10;
      if (i.altitude === 2) s += 10;
      if (myUnit(state, side, i.altitude)) s += 8;
    }
    if (def.id === "dust_ledger" || def.id === "empty_mesa" || def.id === "coin_gallery") {
      s += 8;
      const u = myUnit(state, side, i.altitude);
      if (u && getCard(u.cardId).heresy === "deal") s += 10;
    }
    if (def.id === "suture_mill" || def.id === "key_shrine") {
      s += 8;
      const u = myUnit(state, side, i.altitude);
      if (u && getCard(u.cardId).heresy === "graft") s += 12;
    }
    if (def.id === "branch_rune_reliquary") {
      s += 6;
      const u = myUnit(state, side, i.altitude);
      if (u && !u.veiled) s += 8;
    }
    if (
      def.id === "twinspoke_banner" ||
      def.id === "mask_gallery" ||
      def.id === "hall_of_borrowed_faces" ||
      def.id === "twinseal_cache" ||
      def.id === "grinning_colonnade"
    ) {
      s += 8;
      if (myUnit(state, side, i.altitude)) s += 6;
    }
    if (def.id === "grinning_colonnade") {
      s += 10;
      if (hasStanceB(state, side) || handOf(state, side).some((id) => getCard(id).heresy === "motley")) {
        s += 8;
      }
    }
    if (def.id === "hall_of_borrowed_faces") {
      // Soft under big Witnessed Motley bodies (Sovereign / Cantor / Bailiff)
      const u = myUnit(state, side, i.altitude);
      if (
        u &&
        (u.cardId === "sovereign_of_grins" ||
          u.cardId === "split_hymn_cantor" ||
          u.cardId === "twin_coin_bailiff")
      ) {
        s -= 14;
      }
    }
    if (def.id === "stainwell" || def.id === "blackwater_shrine" || def.id === "abyss_cache" || def.id === "gulf_cairn") {
      s += 8;
      if (myUnit(state, side, i.altitude)) s += 6;
    }
    if (
      def.id === "cloth_bellspire" ||
      def.id === "choir_loft" ||
      def.id === "banner_bellwalk"
    ) {
      s += 10;
      if (myUnit(state, side, i.altitude)) s += 6;
      if (anyAltitudeTolled(state) || handOf(state, side).some((hid) => hid === "sound_the_toll")) {
        s += 6;
      }
    }
    if (def.id === "scarforge" || def.id === "banner_drill" || def.id === "openwell") {
      s += 14;
      if (
        countFriendlyWitnessedBreachFigures(state, side) > 0 ||
        hand.some((hid) => getCard(hid).heresy === "breach")
      ) {
        s += 10;
      }
    }
    if (def.id === "ring_gaze" || def.id === "parasol_path") {
      s += d === "easy" ? 4 : 14;
      if (i.altitude === 0) s += 12;
      if (foeUnit(state, side, i.altitude)?.veiled) s += 12;
      // Plant Gaze under Motley Eclipse packages
      const motleyContest = scoreContestMotleyLane(state, side, i.altitude, "gaze");
      if (motleyContest > 0) s += 18 + motleySealPressure(state, side) * 6;
      else if (countFoeMotleyEclipsePieces(state, side) > 0) s += 10;
    }
    if (def.id === "stake_cache") {
      s += 6;
      const u = myUnit(state, side, i.altitude);
      if (u && getCard(u.cardId).heresy === "cube") s += 10;
    }
  }

  if (def.type === "sigil") {
    s += 8;
    if (def.id === "third_face") {
      s += d === "hard" ? 10 : 5;
      if (
        controlsSiteId(state, side, "mask_gallery") ||
        controlsSiteId(state, side, "twinspoke_banner") ||
        controlsSiteId(state, side, "hall_of_borrowed_faces")
      ) {
        s += 8;
      }
      if (hand.includes("horn_cantor") || hand.includes("echo_mask") || hand.includes("split_hymn_cantor")) s += 6;
    }
  }

  if (def.type === "figure") {
    const priorPlaysHere = figurePlaysAt(state, side, i.altitude);
    const occupiedLanes = countFriendlyFigureAlts(state, side);
    const playsThisWindow = totalFigurePlaysThisWindow(state, side);

    if (!myUnit(state, side, i.altitude)) {
      s += d === "hard" ? 16 : 12;
      if (occupiedLanes >= 1) s += d === "hard" ? 16 : 12; // spread to fresh lanes
      if (occupiedLanes === 0) s += d === "hard" ? 8 : 6; // first body
    } else {
      // Overwrite tax — keep healthy bodies unless racing a Motley seal piece
      const cur = myUnit(state, side, i.altitude)!;
      const curDef = getCard(cur.cardId);
      const contest = scoreContestMotleyLane(state, side, i.altitude, "race");
      if (contest <= 0) {
        s -= cur.veiled ? (d === "hard" ? 42 : 34) : d === "hard" ? 52 : 44;
        if (!cur.strained && curDef.witnessedPower >= 4) s -= d === "hard" ? 18 : 14;
        if (def.witnessedPower <= curDef.witnessedPower && !cur.strained) {
          s -= d === "hard" ? 36 : 28; // downgrade overwrite
        }
      } else {
        s += Math.floor(contest * 0.5);
      }
    }

    // Never dump multiple figures into one lane in the same window
    if (priorPlaysHere >= 1) s -= d === "easy" ? 48 : d === "hard" ? 140 : 110;
    if (priorPlaysHere >= 2) s -= 220;
    if (playsThisWindow >= 2 && !myUnit(state, side, i.altitude)) {
      s -= d === "hard" ? 24 : 16; // prefer Witness/Gaze after two develops
    }
    if (theirs > 0 && theirs >= mine) s += d === "hard" ? 14 : 8;
    s += scoreContestMotleyLane(state, side, i.altitude, "race");
    // Lowcloth Blind payoff vs Motley Cash / Masque on Low
    if (def.id === "lowcloth_warden" && i.altitude === 2) {
      const piece = foeMotleyEclipsePiece(state, side, 2);
      if (piece) s += 20 + motleySealPressure(state, side) * 6;
    }
    // Carillon Blind-on-Lure wants Motley packages on board
    if (def.id === "carillon" && countFoeMotleyEclipsePieces(state, side) > 0) {
      s += 14 + motleySealPressure(state, side) * 4;
    }
    if (def.id === "ochre_dancer" && controlsSiteId(state, side, "veil_banner")) s += 18;
    if (def.id === "ochre_dancer" && hand.includes("veil_banner")) s += 6;
    if (def.id === "ribbon_bride") {
      if (
        controlsSiteId(state, side, "branch_rune_reliquary") ||
        hand.includes("branch_rune_reliquary")
      ) {
        s += 12;
      }
    }
    if (def.id === "canister_hound" && hasGraftSchoolOnBoard(state, side)) s += 14;
    if (def.id === "canister_hound" && hand.some((x) => getCard(x).heresy === "graft")) s += 6;
    if (def.id === "ledger_jackal") s += eclipseOf(state, side) > 0 ? 16 : -8;
    if (def.id === "stake_field_pilgrim") {
      if (!foeUnit(state, side, i.altitude)) s += 14;
      else s -= 4;
    }
    if (def.id === "horn_cantor" || def.id === "split_hymn_cantor" || def.id === "mirrored_jester") {
      s += hasStanceB(state, side) ? 14 : 2;
      if (
        controlsSiteId(state, side, "twinspoke_banner") ||
        controlsSiteId(state, side, "mask_gallery") ||
        controlsSiteId(state, side, "hall_of_borrowed_faces") ||
        controlsSiteId(state, side, "grinning_colonnade")
      ) {
        s += 6;
      }
    }
    if (def.id === "echo_mask" || def.id === "twin_coin_bailiff") {
      let others = 0;
      for (let a = 0; a < 3; a++) if (myUnit(state, side, a as Altitude)) others += 1;
      if (others > 0) s += 10;
    }
    if (def.id === "saltglass_courier" || def.id === "mesa_bell") {
      if (i.altitude === 0) s += 12;
      else s -= 4;
    }
    if (def.id === "bell_debt_walker") {
      s += 8;
      if (i.altitude === 1) s += 4;
    }
    if (def.id === "bell_siren") {
      s += i.altitude === 1 ? 14 : -6;
      if (altitudeIsTolled(state, 1) || hand.includes("sound_the_toll")) s += 8;
      if (countEnemyVeiledFigures(state, side) > 0) s += 10;
    }
    if (def.id === "clapper_cantor" || def.id === "path_bellman" || def.id === "veil_ringer") {
      s += 6;
      if (!anyAltitudeTolled(state)) s += 4;
    }
    if (def.id === "parasol_debtor") {
      s += altitudeIsTolled(state, i.altitude) ? 10 : 4;
    }
    if (def.id === "highcliff_ringer") {
      s += i.altitude === 0 ? 12 : -4;
      if (altitudeIsTolled(state, 0)) s += 6;
    }
    if (def.id === "lowcloth_warden") {
      s += i.altitude === 2 ? 12 : -4;
      if (altitudeIsTolled(state, 2)) s += 6;
    }
    if (def.id === "rope_auditor") s += 8;
    if (def.id === "peal_urn" || def.id === "toll_urn") {
      s += 6;
      if (countEnemyVeiledFigures(state, side) > 0) s += 8;
    }
    if (def.id === "rivet_vanguard") s += 12;
    if (def.id === "ember_banner") s += 10;
    if (def.id === "highscar_lancer") {
      s += 10;
      if (i.altitude === 0) s += 14;
    }
    if (def.id === "scarsteel_cleaver") s += 12;
    if (def.id === "slag_reaper") s += 10;
    if (def.id === "ashcoil_blade") s += 11;
    if (def.id === "cliffbrand_captain") {
      s += 10;
      if (i.altitude === 0) s += 12;
    }
    if (def.id === "lowscar_warden") {
      s += 10;
      if (i.altitude === 2) s += 12;
    }
    if (def.id === "ember_herald") s += 11;
    if (def.id === "skaroth") s += 20;
    if (def.id === "iron_urn" || def.id === "ash_urn") s += 10;
    if (
      def.id === "sail_widow" &&
      (controlsSiteId(state, side, "suture_mill") || controlsSiteId(state, side, "key_shrine"))
    ) {
      s += 14;
    }
    if (def.id === "root_chassis") s += 4;
    if (def.heresy === "cube" && i.altitude === 2) s += 6;
    if (def.heresy === "motley") s += 4;
    if (def.heresy === "ink") s += 4;
    if (def.heresy === "toll") s += 4;
    if (def.heresy === "breach") s += 6;
    if (def.heresy === "toll" && altitudeIsTolled(state, i.altitude) && def.type === "figure") {
      s += 8;
    }
    if (
      def.heresy === "toll" &&
      def.type === "figure" &&
      !anyAltitudeTolled(state) &&
      hand.includes("sound_the_toll")
    ) {
      s -= d === "hard" ? 52 : 14; // Sound first, then bodies
    }
    // Bellward Will race — plant bodies where Witnessed (+Toll) would win the lane
    if (def.heresy === "toll" && (def.type === "figure" || def.type === "vessel")) {
      const tollBonus = altitudeIsTolled(state, i.altitude) && state.tollOwner[i.altitude] === side ? 1 : 0;
      const post = def.witnessedPower + tollBonus;
      const foe = foeUnit(state, side, i.altitude);
      const theirPow = foe ? unitPower(state, i.altitude, other(side)) : 0;
      if (!foe && i.altitude === 0) s += 14; // claim High for free chip
      if (!foe && i.altitude === 1) s += 8;
      if (foe && post > theirPow) s += 18;
      else if (foe && post === theirPow) s += 8;
      else if (foe && post + 1 > theirPow) s += 10; // Sound/Revelation Toll can swing it
      if (foe?.veiled && getCard(foe.cardId).heresy === "motley") s += 8;
    }
    if (
      def.heresy === "toll" &&
      (mySite(state, side, i.altitude) === "cloth_bellspire" ||
        mySite(state, side, i.altitude) === "choir_loft" ||
        mySite(state, side, i.altitude) === "banner_bellwalk")
    ) {
      s += 10;
    }
    if (i.altitude === 1 && def.witnessedPower >= 3) s += 4;
    if (def.heresy === "cube" && mySite(state, side, i.altitude) === "veil_banner") s += 10;
    if (def.heresy === "deal" && (mySite(state, side, i.altitude) === "dust_ledger" || mySite(state, side, i.altitude) === "coin_gallery" || mySite(state, side, i.altitude) === "empty_mesa")) s += 10;
    if (def.heresy === "shell" && (mySite(state, side, i.altitude) === "bone_gallery" || mySite(state, side, i.altitude) === "inhabit_dock" || mySite(state, side, i.altitude) === "bone_mast")) s += 10;
    if (def.heresy === "shell") s += 4;
    if (def.heresy === "graft" && mySite(state, side, i.altitude) === "suture_mill") s += 10;
    if (def.heresy === "graft" && mySite(state, side, i.altitude) === "key_shrine") s += 6;
    if (def.heresy === "motley" && mySite(state, side, i.altitude) === "hall_of_borrowed_faces") {
      // Prefer Hall under small flip engines, not Sovereign
      if (def.id === "sovereign_of_grins" || def.id === "split_hymn_cantor" || def.id === "twin_coin_bailiff") {
        s -= 8;
      } else {
        s += 6;
      }
    }
    if (def.heresy === "motley" && mySite(state, side, i.altitude) === "grinning_colonnade") s += 10;
    if (def.heresy === "ink" && mySite(state, side, i.altitude) === "stainwell") s += 10;
    if (
      def.heresy === "breach" &&
      (mySite(state, side, i.altitude) === "scarforge" ||
        mySite(state, side, i.altitude) === "banner_drill" ||
        mySite(state, side, i.altitude) === "openwell")
    ) {
      s += 12;
    }
  }

  if (d === "easy") s -= Math.max(0, def.essence - 1) * 3;
  return s;
}

/** Motley figures whose Revelation enters Stance B (Witnessed face becomes printed Veiled). */
const MOTLEY_ENTER_B_ON_WITNESS = new Set([
  "whitecard_mummer",
  "ashen_halfmask",
  "chance_step_dancer",
  "borrowed_face_urn",
]);

/** Motley figures whose Revelation switches Stance. */
const MOTLEY_SWITCH_ON_WITNESS = new Set(["diamond_widow", "mirrored_jester"]);

function graftWitnessBonus(u: BoardUnit): number {
  return u.grafts.reduce((n, g) => n + getCard(g.cardId).witnessedPower, 0);
}

/** Printed Witnessed power after Stance B swap (does not include Colonnade/aura). */
function faceWitnessedPower(def: ReturnType<typeof getCard>, stanceB: boolean, graftBonus: number): number {
  let veiledP = def.veiledPower;
  let witP = def.witnessedPower;
  if (stanceB) {
    const t = veiledP;
    veiledP = witP;
    witP = t;
  }
  return witP + graftBonus;
}

/** Stance B after own Witness Revelation (Hall no longer forces enter-B). */
function predictStanceBAfterOwnWitness(u: BoardUnit, def: ReturnType<typeof getCard>): boolean {
  if (u.grafts.some((g) => g.cardId === "otherface_seal")) {
    return !u.stanceB; // already B → switch off; else enter B
  }
  if (MOTLEY_ENTER_B_ON_WITNESS.has(def.id)) return true;
  if (MOTLEY_SWITCH_ON_WITNESS.has(def.id)) return !u.stanceB;
  if (def.id === "grinrunner") return true; // enter B if A; stay B if already B
  return u.stanceB;
}

function countEnemyStained(state: MatchState, side: Side): number {
  let n = 0;
  for (let a = 0; a < 3; a++) {
    const u = foeUnit(state, side, a as Altitude);
    if (u?.stained && getCard(u.cardId).type === "figure") n += 1;
  }
  return n;
}

function scoreWitnessOwn(
  state: MatchState,
  side: Side,
  alt: Altitude,
  d: AiDifficulty,
): number {
  const u = myUnit(state, side, alt);
  if (!u) return 0;
  const def = getCard(u.cardId);
  const hand = handOf(state, side);
  let s = 50 + (2 - alt);

  if (def.id === "root_chassis") {
    const sight = sightOf(state, side);
    if (sight >= 3) s -= 40;
    else s += 8;
  }

  if (graftPayoffReady(u)) s += 22;
  else if (handHasGraftRelic(state, side)) {
    const theirs = unitPower(state, alt, other(side));
    const mine = unitPower(state, alt, side);
    if (theirs <= mine + 1) s -= 18;
  }

  if (def.id === "ochre_dancer" && controlsSiteId(state, side, "veil_banner")) s += 16;
  if (def.id === "ribbon_bride") {
    const coralSite =
      controlsSiteId(state, side, "branch_rune_reliquary") ||
      [...state.altitudes].some((_, a) => {
        const sid = mySite(state, side, a as Altitude);
        return sid != null && getCard(sid).heresy === "coral";
      });
    if (coralSite) s += 14;
  }
  if (def.id === "canister_hound" && hasGraftSchoolOnBoard(state, side)) s += 14;
  if (def.id === "ledger_jackal") s += eclipseOf(state, side) > 0 ? 18 : -12;
  if (def.id === "stake_field_pilgrim" && !foeUnit(state, side, alt)) s += 16;
  if (
    (def.id === "split_hymn_cantor" || def.id === "mirrored_jester" || def.id === "twin_coin_bailiff") &&
    hasStanceB(state, side)
  ) {
    s += 14;
  }
  if (def.id === "saltglass_courier" && alt === 0) s += 12;
  if (def.id === "mesa_bell" && alt === 0) s += 12;
  if (def.id === "bell_debt_walker") s += 6;
  if (def.id === "bell_siren") {
    s += 12;
    if (countEnemyVeiledFigures(state, side) > 0) s += 16;
    if (altitudeIsTolled(state, 1)) s += 8;
  }
  if (def.id === "clapper_cantor" || def.id === "path_bellman" || def.id === "veil_ringer") {
    s += anyAltitudeTolled(state) ? 6 : 14;
  }
  if (def.id === "highcliff_ringer" && alt === 0) s += 10;
  if (def.id === "lowcloth_warden" && alt === 2) s += 10;
  if (def.id === "peal_urn" || def.id === "toll_urn") {
    s += 8;
    if (countEnemyVeiledFigures(state, side) > 0) s += 12;
  }
  if (def.id === "carillon") s += 18;
  if (def.heresy === "toll" && state.tollOwner[alt] === side) s += 12;
  if (def.heresy === "toll" && altitudeIsTolled(state, alt) && state.tollOwner[alt] !== side) s += 4;
  // Open into Motley Eclipse lanes — race power / enable Blind riders
  s += scoreContestMotleyLane(state, side, alt, "open");
  if (def.id === "carillon" && countFoeMotleyEclipsePieces(state, side) > 0) {
    s += 12 + motleySealPressure(state, side) * 4;
  }
  if (def.id === "lowcloth_warden" && alt === 2 && foeMotleyEclipsePiece(state, side, 2)) {
    s += 14 + motleySealPressure(state, side) * 4;
  }
  if (mySite(state, side, alt) === "branch_rune_reliquary") s += 8;
  if (mySite(state, side, alt) === "dust_ledger" && def.heresy === "deal") s += 10;
  if ((mySite(state, side, alt) === "coin_gallery" || mySite(state, side, alt) === "empty_mesa") && def.heresy === "deal") s += 10;
  if (
    (mySite(state, side, alt) === "bone_gallery" ||
      mySite(state, side, alt) === "inhabit_dock" ||
      mySite(state, side, alt) === "bone_mast") &&
    def.heresy === "shell"
  ) {
    s += 10;
  }
  if (mySite(state, side, alt) === "key_shrine" && def.heresy === "graft") s += 10;
  if (mySite(state, side, alt) === "stake_cache" && def.heresy === "cube") s += 8;
  // Hall rewards Witnessing while already Stance B — do not force-enter B anymore
  if (mySite(state, side, alt) === "hall_of_borrowed_faces" && def.heresy === "motley" && u.stanceB) {
    s += 12;
  }
  if (mySite(state, side, alt) === "twinseal_cache" && def.heresy === "motley" && u.stanceB) s += 10;
  if (mySite(state, side, alt) === "stainwell" && def.heresy === "ink") s += 8;

  if (propheciesOf(state, side).includes("unblinking_law")) {
    const progress = lawHeresyProgress(state);
    if (progress === 2 && !state.witnessedHeresiesThisTurn.includes(def.heresy)) s += 20;
    if (progress >= 3) s += 4;
  }

  const mine = unitPower(state, alt, side);
  const theirs = unitPower(state, alt, other(side));
  const graftBonus = graftWitnessBonus(u);
  const postB = predictStanceBAfterOwnWitness(u, def);
  const effectiveWit = faceWitnessedPower(def, postB, graftBonus);

  // Ink: don't Open into Scar Breach unless you clearly win the lane
  if (def.heresy === "ink" && u.veiled) {
    const foe = foeUnit(state, side, alt);
    if (foe && !foe.veiled && getCard(foe.cardId).heresy === "breach") {
      if (effectiveWit <= theirs) s -= 36; // feed Breach Will
      else if (effectiveWit <= theirs + 1) s -= 12;
    }
  }

  // Scar Breach — Open so Breach can fire; respect Toll tax; chase Witnessed foes
  if (def.heresy === "breach") {
    s += 10;
    const foe = foeUnit(state, side, alt);
    if (def.id === "highscar_lancer" && alt === 0) s += 14;
    if (def.id === "skaroth") s += 18;
    if (def.id === "rivet_vanguard" || def.id === "scarsteel_cleaver" || def.id === "ashcoil_blade") {
      s += 8;
    }
    if (
      mySite(state, side, alt) === "scarforge" ||
      mySite(state, side, alt) === "banner_drill" ||
      mySite(state, side, alt) === "openwell"
    ) {
      s += 16;
    }
    if (state.tollOwner[alt] != null && state.tollOwner[alt] !== side) {
      s -= 20;
      if (effectiveWit > theirs + 2) s += 8;
    }
    if (foe && !foe.veiled && effectiveWit > theirs) {
      s += 28; // Open into Witnessed foe we beat → Breach
    } else if (foe && foe.veiled && effectiveWit > theirs) {
      s += 8; // lane win without Breach until Gaze
    } else if (!foe && effectiveWit >= 3) {
      s += 4;
    } else if (foe && effectiveWit <= theirs) {
      s -= 22; // Overexpose risk — don't Open into a losing lane
    }
    if (sightOf(state, side) <= 2 && (!foe || foe.veiled || effectiveWit <= theirs)) {
      s -= 12; // conserve Sight when Overexpose would sting
    }
    if (u.grafts.some((g) => g.cardId === "rivet_charm" || g.cardId === "eyebrand_charm")) s += 10;
  }

  if (u.veiled && theirs > 0) {
    if (effectiveWit > theirs && mine <= theirs) s += 18;
    if (effectiveWit <= theirs) {
      // Toll Revelations (Lure / place Toll) are still worth Opening even if the lane stays contested
      const tollSetupOpen =
        def.heresy === "toll" &&
        (def.id === "bell_siren" ||
          def.id === "path_bellman" ||
          def.id === "clapper_cantor" ||
          def.id === "veil_ringer" ||
          def.id === "carillon" ||
          def.id === "peal_urn" ||
          def.id === "toll_urn");
      s -= tollSetupOpen ? 6 : 24;
    }
  }

  // Bellward — Open into Will chips; Lure / Toll Revelations beat Motley Hold walls
  if (def.heresy === "toll") {
    s += 6;
    if (effectiveWit > theirs) s += 24; // Resolve chip this window
    else if (effectiveWit === theirs && alt === 0) s += 8; // High still pressured after Gaze/Toll
    if (state.tollOwner[alt] === side) s += 10; // +1 from Toll already live
    if (def.id === "bell_siren" && countEnemyVeiledFigures(state, side) > 0) s += 22;
    if (
      (def.id === "path_bellman" || def.id === "clapper_cantor" || def.id === "veil_ringer") &&
      !anyAltitudeTolled(state)
    ) {
      s += 20; // Revelation plants the trap line
    }
    if (def.id === "carillon") s += 12;
    // Don't sit Veiled under a Motley Stance B wall — Open or get Gazed
    const foe = foeUnit(state, side, alt);
    if (foe?.veiled && foe.stanceB && getCard(foe.cardId).heresy === "motley") {
      if (effectiveWit > theirs) s += 16;
      else s += 4;
    }
  }

  // Motley Trick: don't Witness into the weak Stance B face when Veiled B already wins
  if (def.heresy === "motley" && u.veiled) {
    // Already Stance B Veiled — never Witness away the Hold + strong face unless desperate
    if (u.stanceB) {
      s -= 55;
      if (mine > theirs) s -= 20;
    }
    const veiledBWouldWin =
      !u.stanceB &&
      faceWitnessedPower(def, true, graftBonus) > theirs &&
      (MOTLEY_ENTER_B_ON_WITNESS.has(def.id) ||
        def.id === "grinrunner" ||
        def.veiledPower < def.witnessedPower);
    if (veiledBWouldWin && !state.stanceUsed[side]) {
      s -= 40; // Stance-then-hold is the correct jester line
    }
    // Switch-on-Witness figures: Witness while already B to flip back to printed Witnessed
    if (MOTLEY_SWITCH_ON_WITNESS.has(def.id) && !u.stanceB) {
      s -= 28;
    }
    if (MOTLEY_SWITCH_ON_WITNESS.has(def.id) && u.stanceB) {
      // Only flip back if Witnessed face clearly wins AND we don't need Erase Hold
      const foe = foeUnit(state, side, alt);
      if (foe?.stained) s -= 30;
      else if (faceWitnessedPower(def, false, graftBonus) > theirs + 1) s += 16;
      else s -= 10;
    }
    // Enter-B on Witness: only chase Sight when already winning or Sight-starved
    if (!u.stanceB && (MOTLEY_ENTER_B_ON_WITNESS.has(def.id) || def.id === "grinrunner")) {
      if (mine > theirs) s -= 8;
      else if (sightOf(state, side) <= 1) s += 6;
      else s -= 18;
    }
    if (def.id === "grinrunner" && u.stanceB) {
      s -= 10; // was +10 Sight chase — prefer stay Veiled B
    }
    // Big Motley bodies hate accidental soft Witness faces
    if (
      (def.id === "sovereign_of_grins" || def.id === "split_hymn_cantor" || def.id === "twin_coin_bailiff") &&
      postB &&
      effectiveWit < def.witnessedPower
    ) {
      s -= 20;
    }
  }

  if (u.strained && theirs >= mine) s -= 12;
  if (u.strained && theirs < mine) s += 6;

  if (alt === 1) s += 14;
  if (alt === 2 && theirs <= mine) s -= 10;

  if (d === "hard") s += 8;
  if (d === "easy") s -= 10;
  void hand;
  return s;
}

function scoreGraft(
  state: MatchState,
  side: Side,
  i: Extract<Intent, { kind: "graft" }>,
  d: AiDifficulty,
): number {
  const relicId = handOf(state, side)[i.handIndex];
  const u = myUnit(state, side, i.altitude);
  if (!u) return 0;
  let s = 35;
  if (d === "hard") s += 6;

  if (u.veiled && GRAFT_BEFORE_WITNESS.has(relicId)) s += 24;
  if (relicId === "coral_crown") s += 8;
  if (relicId === "debt_coin") s += eclipseOf(state, side) > 0 ? 12 : 2;
  if (relicId === "splice_token") {
    s +=
      controlsSiteId(state, side, "suture_mill") || controlsSiteId(state, side, "key_shrine")
        ? 14
        : 2;
  }
  if (relicId === "ace_of_hollows") s += 8;
  if (relicId === "bone_wick_charm") s += 6;
  if (relicId === "blot_charm" || relicId === "fool_flip_seal" || relicId === "harlequin_sash") s += 8;
  if (relicId === "rivet_charm" || relicId === "eyebrand_charm") {
    s += 12;
    if (u.veiled) s += 14; // graft before Open
    if (getCard(u.cardId).heresy === "breach") s += 8;
  }
  if (u.veiled) s += 6;
  return s;
}

function scoreStance(state: MatchState, side: Side, alt: Altitude, d: AiDifficulty): number {
  const u = myUnit(state, side, alt);
  if (!u) return 0;
  const def = getCard(u.cardId);
  const hand = handOf(state, side);
  const theirs = unitPower(state, alt, other(side));
  const mine = unitPower(state, alt, side);
  let s = 10;
  if (d === "hard") s += 8;

  if (!u.stanceB) {
    if (mySite(state, side, alt) === "hall_of_borrowed_faces") s += 14; // switch → Sight
    if (mySite(state, side, alt) === "grinning_colonnade") s += 18;
    if (controlsSiteId(state, side, "twinseal_cache")) s += 10;
    if (hand.includes("split_hymn_cantor") || hand.includes("twin_coin_bailiff")) s += 8;
    if (def.heresy === "motley") s += 12;
    // Bank Veiled Stance B when it flips the lane (core Trick line) — Motley needs Wager for swap
    if (u.veiled && def.witnessedPower > def.veiledPower) {
      const afterB = faceWitnessedPower(def, true, graftWitnessBonus(u));
      // Colonnade +1 if present
      const colonnade = mySite(state, side, alt) === "grinning_colonnade" ? 1 : 0;
      const motleyNeedsWager = def.heresy === "motley" && !u.wagered;
      if (motleyNeedsWager) {
        // Enter B for Hold; Wager soon for power — don't score as if swap is live
        if (def.heresy === "motley") s += 10;
      } else if (afterB + colonnade > theirs && mine <= theirs) s += 36;
      else if (afterB + colonnade > mine) s += 18;
    }
    // Diamond Widow / Mirrored Jester: enter B first so Witness can switch back to full W
    if (MOTLEY_SWITCH_ON_WITNESS.has(def.id) && u.veiled) s += 22;
    if (MOTLEY_ENTER_B_ON_WITNESS.has(def.id) && u.veiled) s += 14;
    if (def.id === "grinrunner" && u.veiled) s += 14;
    // Anti-Erase: Stance B Motley Holds through Stain
    if (def.heresy === "motley" && u.veiled) {
      const foe = foeUnit(state, side, alt);
      if (foe?.stained || countEnemyStained(state, side) > 0) s += 20;
    }
  } else {
    // Already B — stay Veiled for Resolve / Erase Hold
    if (mySite(state, side, alt) === "grinning_colonnade") s -= 12;
    if (MOTLEY_SWITCH_ON_WITNESS.has(def.id) && u.veiled) {
      const foe = foeUnit(state, side, alt);
      if (foe?.stained) s -= 20; // keep Hold
      else s -= 8;
    }
    if (u.veiled && faceWitnessedPower(def, true, graftWitnessBonus(u)) >= theirs) s -= 16;
    else s -= 2;
  }
  return s;
}

function scoreRite(
  state: MatchState,
  side: Side,
  i: Extract<Intent, { kind: "rite" }>,
  d: AiDifficulty,
): number {
  const id = handOf(state, side)[i.handIndex];
  // Rites are tempo sinks — default below Pass (0) unless a real payoff lights up.
  let s = d === "hard" ? -6 : d === "easy" ? 2 : -4;

  if (id === "dusk_tithe" || id === "creditor_tithe") {
    s += eclipseOf(state, side) > 0 ? 28 : 4;
  }
  if (id === "settle_accounts") {
    s += eclipseOf(state, side) > 0 ? 26 : 4;
  }
  if (id === "call_the_debt") {
    if (i.altitude != null && foeUnit(state, side, i.altitude)?.veiled) s += 32;
    else s += eclipseOf(state, side) > 0 ? 8 : 2;
  }
  if (id === "double_entry") {
    s += eclipseOf(state, side) > 0 ? 24 : 4;
  }
  if (id === "foreclose") {
    if (i.altitude != null && foeUnit(state, side, i.altitude)?.veiled) s += 30;
    else s += eclipseOf(state, side) > 0 ? 10 : 2;
  }
  if (id === "open_books") {
    const midFoe = foeUnit(state, side, 1);
    const midEmpty = !midFoe || getCard(midFoe.cardId).type !== "figure";
    s += midEmpty ? 28 : 4;
  }
  if (propheciesOf(state, side).includes("shuttered_edict")) s += 10;

  if (id === "hole_choir" || id === "second_flip" || id === "echo_the_flip" || id === "curtain_call") {
    // Motley flip rites — only when we have Veiled Motley / Wager pressure live
    let motleyLive = false;
    for (let a = 0; a < 3; a++) {
      const u = myUnit(state, side, a as Altitude);
      if (u?.veiled && (u.wagered || u.stanceB || getCard(u.cardId).heresy === "motley")) {
        motleyLive = true;
        break;
      }
    }
    s += motleyLive ? 22 : 2;
  }
  if (id === "pale_smother" || id === "void_smother" || id === "false_hold") {
    const stained = countEnemyStained(state, side);
    s += stained > 0 ? 18 : 2;
  }
  if (id === "ashen_tithe") {
    if (i.altitude != null) {
      const foe = foeUnit(state, side, i.altitude);
      if (foe?.stained) {
        s += 28;
        if (foe.veiled) s += 16; // Blind + free Press line
      } else {
        s += 1; // dead cast
      }
    }
  }
  if (id === "mire_surge") {
    const stained = countEnemyStained(state, side);
    if (stained > 0) {
      s += 26;
      // Prefer when we contest a stained lane
      for (let a = 0; a < 3; a++) {
        const foe = foeUnit(state, side, a as Altitude);
        const mine = myUnit(state, side, a as Altitude);
        if (foe?.stained && mine) s += 8;
      }
    } else {
      s += 1;
    }
  }
  if (id === "slip_the_mark") {
    const stained = countEnemyStained(state, side);
    s += stained > 0 ? 30 : 2;
  }
  if (id === "smile_that_holds") {
    const stained = countEnemyStained(state, side);
    s += stained > 0 ? 24 : 2;
  }
  if (id === "raise_the_ante" || id === "final_raise" || id === "gala_call") {
    if (i.altitude != null) {
      const mine = myUnit(state, side, i.altitude);
      if (mine?.veiled) {
        s += 22;
        if (mine.wagered && id === "final_raise") {
          s += favorOf(state, side) > 0 ? 20 : 8;
        }
        if (mine.wagered || mine.stanceB) s += 8;
      } else {
        s += 2;
      }
    }
  }
  if (id === "sound_the_toll" || id === "ring_out") {
    if (i.altitude != null) {
      const tolled = altitudeIsTolled(state, i.altitude);
      const foe = foeUnit(state, side, i.altitude);
      const motleyLane = scoreContestMotleyLane(state, side, i.altitude, "blind");
      if (!tolled) {
        s += d === "hard" ? 58 : 34; // place sticky Toll — real setup + figure +1
        if (!anyAltitudeTolled(state)) s += d === "hard" ? 38 : 12; // first Toll of the match
        if (id === "ring_out") s += 4;
        if (myUnit(state, side, i.altitude)) s += 10; // buff our body now
        if (motleyLane > 0) s += Math.floor(motleyLane * 0.6);
      } else if (tolled && id === "ring_out") {
        s += 22; // Resonance + Sight, keep trap
      } else if (foe?.veiled && getCard(foe.cardId).type === "figure") {
        s += 22 + motleyLane; // Sound can Lure — strip Motley Hold
      } else if (tolled && id === "sound_the_toll") {
        s += 16;
        if (motleyLane > 0) s += Math.floor(motleyLane * 0.4);
      } else {
        s += 2;
      }
    }
  }
  if (id === "full_peal") {
    if (anyAltitudeTolled(state)) s += 28;
    else s += 16; // will Toll Mid — still setup
  }
  if (id === "breach_order") {
    if (i.altitude != null) {
      const mine = myUnit(state, side, i.altitude);
      if (mine?.veiled && getCard(mine.cardId).heresy === "breach") s += 32;
      else if (mine && !mine.veiled && getCard(mine.cardId).heresy === "breach") s += 24;
      else s += 2;
    }
  }
  if (id === "full_breach") {
    if (countFriendlyWitnessedBreachFigures(state, side) > 0) s += 34;
    else s += 2;
  }
  if (id === "last_breach") {
    if (i.altitude != null) {
      const mine = myUnit(state, side, i.altitude);
      if (mine?.veiled && getCard(mine.cardId).heresy === "breach") s += 30;
      else if (mine && !mine.veiled && getCard(mine.cardId).heresy === "breach") s += 32;
      else s += 2;
    }
  }

  // Unknown / unmatched rites: stay near Pass unless something else bumped them
  return s;
}

/**
 * Heuristic AI for the **active** seat.
 * Difficulty scales aggression; Hard uses 2-ply search + school mindgames.
 */
export function chooseAiMove(state: MatchState, opts?: { searchDepth?: 0 | 1 }): Intent {
  const intents = legalIntents(state);
  if (intents.length === 0) return { kind: "pass" };

  if (state.tutorial && state.tutorialStep !== "done" && state.active === "enemy") {
    return chooseTutorialEnemyMove(state, intents);
  }

  const side = state.active;
  const d: AiDifficulty = state.aiDifficulty ?? "normal";
  const searchDepth = opts?.searchDepth ?? (d === "hard" ? 1 : 0);

  const rawScore = (i: Intent): number => {
    if (i.kind === "pass") {
      if (d === "easy") return 12;
      const pressure = willPressure(state, side);
      if (pressure > 4) return -10 - Math.min(8, Math.floor(pressure / 2));
      // Opening beat — don't bank-only on turn 1 if we can develop
      if (state.turn <= 1) {
        const canDevelop = legalIntents(state).some(
          (x) =>
            x.kind === "play" ||
            x.kind === "witness" ||
            x.kind === "wager" ||
            x.kind === "press" ||
            x.kind === "peal",
        );
        if (canDevelop) return -36;
      }
      if (d === "hard") return -8;
      // Normal: still prefer developing over banking when lanes are empty
      const emptyLanes = [0, 1, 2].filter((a) => !myUnit(state, side, a as Altitude)).length;
      const figuresInHand = handOf(state, side).filter((id) => {
        const t = getCard(id).type;
        return t === "figure" || t === "vessel";
      }).length;
      if (emptyLanes >= 2 && figuresInHand > 0 && essenceOf(state, side) >= 1) return -6;
      if (handHasGraftRelic(state, side) && veiledFigureAlts(state, side).length > 0) return -2;
      // Breach: don't Pass with Sight while Veiled Breach Figures can still Open
      if (sidePlaysBreach(state, side) && sightOf(state, side) >= 1) {
        for (let a = 0; a < 3; a++) {
          const u = myUnit(state, side, a as Altitude);
          if (u?.veiled && getCard(u.cardId).heresy === "breach") return -18;
        }
      }
      // Toll: don't Pass while Veiled Bellward can still Open (Toll / Lure payoffs)
      if (sidePlaysHeresy(state, side, "toll") && sightOf(state, side) >= 1) {
        for (let a = 0; a < 3; a++) {
          const u = myUnit(state, side, a as Altitude);
          if (u?.veiled && getCard(u.cardId).heresy === "toll") return -20;
        }
        // Banked Sight + no Tolls down — keep looking for Sound / Revelation setups
        if (!anyAltitudeTolled(state) && handOf(state, side).some((id) => id === "sound_the_toll")) {
          return -14;
        }
      }
      // Don't Pass while any foe Veiled figure is Gaze-able and we have Sight
      if (sightOf(state, side) >= 1 && countEnemyVeiledFigures(state, side) > 0) {
        const canGaze = legalIntents(state).some((x) => x.kind === "witness" && x.enemy);
        if (canGaze) return -10 - Math.min(3, countEnemyVeiledFigures(state, side)) * 4;
      }
      // Ink: don't Pass while a Press is live
      if (sidePlaysHeresy(state, side, "ink") && !state.pressUsed[side]) {
        for (let a = 0; a < 3; a++) {
          const foe = foeUnit(state, side, a as Altitude);
          if (!foe?.veiled) continue;
          const vsTrick = foe.stanceB && getCard(foe.cardId).heresy === "motley";
          if (vsTrick || foe.stained) return -22;
        }
      }
      // Don't Pass while Motley seal pieces are Gaze-able
      const motleyPressure = motleySealPressure(state, side);
      if (motleyPressure > 0 && sightOf(state, side) >= 1) {
        for (let a = 0; a < 3; a++) {
          const piece = foeMotleyEclipsePiece(state, side, a as Altitude);
          if (piece?.veiled) return -12 - motleyPressure * 6;
        }
      }
      return 0;
    }
    if (i.kind === "witness" && !i.enemy) {
      let s = scoreWitnessOwn(state, side, i.altitude, d);
      // Motley: don't Fold a Wagered Eclipse piece
      const u = myUnit(state, side, i.altitude);
      if (u?.wagered && u.veiled && getCard(u.cardId).heresy === "motley") {
        s -= 40;
        if (favorOf(state, side) > 0 && u.stanceB) s -= 20;
      }
      return s;
    }
    if (i.kind === "witness" && i.enemy) {
      let s = 40;
      if (d === "hard") s += 18;
      if (d === "easy") s -= 22;
      s += 6;
      if (i.altitude === 0) s += 16;
      if (i.altitude === 2) s -= 10;
      const foe = foeUnit(state, side, i.altitude);
      if (foe?.veiled) s += 22;
      if (foe && !foe.veiled && foe.strained) s += 18;
      const mine = unitPower(state, i.altitude, side);
      const theirs = unitPower(state, i.altitude, other(side));
      if (foe && mine > theirs) s += 10;
      // Strip Motley Hold walls that are winning / tying the lane
      if (foe?.veiled && theirs >= mine) s += 14;
      if (foe?.veiled && foe.stanceB && getCard(foe.cardId).heresy === "motley") s += 18;
      if (foe?.veiled && foe.wagered && getCard(foe.cardId).heresy === "motley") s += 12;
      // Interrupt Motley Eclipse — Gaze Wager / Masque / Stance-B Veiled
      s += scoreContestMotleyLane(state, side, i.altitude, "gaze");
      // Bellward: Gaze contested lanes (tax on our Toll, or swing a lost race)
      if (sidePlaysHeresy(state, side, "toll") && foe?.veiled) {
        if (state.tollOwner[i.altitude] === side) s += 8;
        if (mine > 0 && theirs >= mine) s += 12;
      }
      // Scar Breach: Gaze to Open foes so Breach Will can fire
      if (sidePlaysBreach(state, side) && foe?.veiled) {
        const mineU = myUnit(state, side, i.altitude);
        if (mineU && !mineU.veiled && getCard(mineU.cardId).heresy === "breach") {
          const foeDef = getCard(foe.cardId);
          const theirWit = faceWitnessedPower(foeDef, foe.stanceB, graftWitnessBonus(foe));
          if (mine > theirWit) s += 34; // expose then still win → Breach
          else if (mine > theirs) s -= 12; // currently winning into Veiled chip only; Gaze may flip
          else s += 8;
        } else {
          s += 10; // set up future Breach lanes
        }
        if (state.tollOwner[i.altitude] != null && state.tollOwner[i.altitude] !== side) s -= 14;
      }
      return s;
    }
    if (i.kind === "graft") return scoreGraft(state, side, i, d);
    if (i.kind === "rite") return scoreRite(state, side, i, d);
    if (i.kind === "stance") return scoreStance(state, side, i.altitude, d);
    if (i.kind === "wager") {
      // Ante when Stance B unlocks Motley power-swap / Cash; skip suicidal Wagers
      const u = myUnit(state, side, i.altitude);
      if (!u) return -5;
      const def = getCard(u.cardId);
      let s = 6;
      if (u.stanceB) s += d === "hard" ? 20 : 14;
      else if (def.heresy === "motley" && u.veiled) s -= d === "hard" ? 28 : 18; // Stance B before Wager
      const mine = unitPower(state, i.altitude, side);
      const theirs = unitPower(state, i.altitude, other(side));
      // Motley Stance B: Wager flips Veiled power to Witnessed — score the post-ante body
      if (u.stanceB && def.heresy === "motley" && u.veiled) {
        const after = faceWitnessedPower(def, true, graftWitnessBonus(u));
        if (after > theirs) s += 36;
        else if (after >= theirs) s += 10;
        else s -= 12;
      } else if (mine > theirs) s += 14;
      else s -= 18; // Bust farm is bad
      if (favorOf(state, side) > 0) s += 12; // Trick Eclipse armed
      else s -= 4; // still Cash, but seals need Favor
      if (u.cardId === "lady_masque") s += 8;
      return s;
    }
    if (i.kind === "press") {
      const foe = foeUnit(state, side, i.altitude);
      if (!foe?.veiled) return -20;
      const vsTrick = foe.stanceB && getCard(foe.cardId).heresy === "motley";
      if (!vsTrick && !foe.stained) return -20;
      let s = 28;
      const mine = unitPower(state, i.altitude, side);
      const theirs = unitPower(state, i.altitude, other(side));
      if (mine > theirs) s += 28; // win → Erase pierce
      else s -= 16; // backlash risk
      if (vsTrick) {
        // Free + no Stain — but only press when you can actually win the lane
        if (mine > theirs) s += 42;
        else s -= 24;
      }
      if (d === "hard") s += 10;
      return s;
    }
    if (i.kind === "peal") {
      let s = 16;
      if (state.tollOwner[i.altitude] === side) s += 10;
      const mine = unitPower(state, i.altitude, side);
      const theirs = unitPower(state, i.altitude, other(side));
      if (mine >= theirs) s += 8; // likely Resolve spend soon
      else s -= 4;
      // Peal under Motley Cash is fine; Pealing empty lanes while seals threaten is not
      const pressure = motleySealPressure(state, side);
      if (pressure > 0 && !foeMotleyEclipsePiece(state, side, i.altitude)) {
        s -= 8 + pressure * 4;
      } else if (foeMotleyEclipsePiece(state, side, i.altitude)) {
        s += 8;
      }
      return s;
    }
    if (i.kind === "reveil") {
      const u = myUnit(state, side, i.altitude);
      let s = 8;
      if (u?.strained) s += 28;
      if (d === "hard" && u?.strained) s += 10;
      if (d === "easy") s -= 8;
      // Don't hide a racing body against Motley seals unless Strained
      if (!u?.strained && scoreContestMotleyLane(state, side, i.altitude, "race") > 0) {
        s -= 20 + motleySealPressure(state, side) * 6;
      }
      // Ink: Re-Veil to deny Open Breach Will
      if (u && !u.veiled && getCard(u.cardId).heresy === "ink") {
        const foe = foeUnit(state, side, i.altitude);
        if (foe && !foe.veiled && getCard(foe.cardId).heresy === "breach") {
          const mine = unitPower(state, i.altitude, side);
          const theirs = unitPower(state, i.altitude, other(side));
          if (mine <= theirs) s += 36;
          else s += 12;
        }
      }
      return s;
    }
    if (i.kind === "play") return scorePlay(state, side, i, d);
    return 1;
  };

  const score = (i: Intent): number =>
    rawScore(i) +
    (d === "hard" ? scoreMotleyMindgame(state, side, i) + scoreInkMindgame(state, side, i) : 0);

  const scored = intents
    .map((i) => ({ i, s: score(i) }))
    .sort((a, b) => b.s - a.s);

  if (searchDepth >= 1 && d === "hard" && scored.length > 1) {
    const pool = scored.slice(0, Math.min(12, scored.length));
    let best = pool[0]!.i;
    let bestEval = -Infinity;
    for (const { i, s } of pool) {
      const sim = cloneState(state);
      applyIntent(sim, i);
      const ev = evalAfterMove(sim, side, searchDepth, s);
      if (ev > bestEval) {
        bestEval = ev;
        best = i;
      }
    }
    return best;
  }

  let best = scored[0]!.i;
  let bestS = scored[0]!.s;
  const noise = noiseFor(d);
  for (const { i, s } of scored) {
    const noisy = s + Math.random() * noise;
    if (noisy > bestS) {
      bestS = noisy;
      best = i;
    }
  }
  return best;
}
