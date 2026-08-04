import { getCard } from "./cards";
import { altitudeHasGaze, lawSchoolProgress, legalIntents, unitPower } from "./match";
import { chooseTutorialEnemyMove } from "./tutorial";
import type { AiDifficulty, Altitude, BoardUnit, Intent, MatchState } from "./types";

function noiseFor(d: AiDifficulty): number {
  switch (d) {
    case "easy":
      return 28;
    case "hard":
      return 0.35;
    default:
      return 2;
  }
}

function enemyUnit(state: MatchState, alt: Altitude): BoardUnit | null {
  return state.altitudes[alt].enemy;
}

function enemySite(state: MatchState, alt: Altitude): string | null {
  return state.altitudes[alt].enemySite;
}

function hasStanceB(state: MatchState): boolean {
  for (let a = 0; a < 3; a++) {
    const u = enemyUnit(state, a as Altitude);
    if (u?.stanceB) return true;
  }
  return false;
}

function controlsSiteId(state: MatchState, id: string): boolean {
  for (let a = 0; a < 3; a++) {
    if (enemySite(state, a as Altitude) === id) return true;
  }
  return false;
}

function hasGraftSchoolOnBoard(state: MatchState): boolean {
  for (let a = 0; a < 3; a++) {
    const u = enemyUnit(state, a as Altitude);
    if (!u) continue;
    if (getCard(u.cardId).school === "graft") return true;
    if (u.grafts.some((g) => getCard(g.cardId).school === "graft")) return true;
    const site = enemySite(state, a as Altitude);
    if (site && getCard(site).school === "graft") return true;
  }
  return false;
}

function veiledFigureAlts(state: MatchState): Altitude[] {
  const out: Altitude[] = [];
  for (let a = 0; a < 3; a++) {
    const u = enemyUnit(state, a as Altitude);
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
]);

function graftPayoffReady(u: BoardUnit): boolean {
  return u.grafts.some((g) => GRAFT_BEFORE_WITNESS.has(g.cardId));
}

function handHasGraftRelic(state: MatchState): boolean {
  return state.enemyHand.some((id) => {
    const def = getCard(id);
    return def.type === "relic" && GRAFT_BEFORE_WITNESS.has(id);
  });
}

function scorePlay(
  state: MatchState,
  i: Extract<Intent, { kind: "play" }>,
  d: AiDifficulty,
): number {
  const id = state.enemyHand[i.handIndex];
  const def = getCard(id);
  let s = 25 + def.witnessedPower - def.essence;

  const mine = unitPower(state, i.altitude, "enemy");
  const theirs = unitPower(state, i.altitude, "player");
  if (theirs >= mine) s += d === "hard" ? 10 : 5;

  if (i.altitude === 0) s += d === "hard" ? 6 : 3;
  if (i.altitude === 2 && def.type === "figure") s += d === "easy" ? 4 : 2;

  // —— Site packages ——
  if (def.type === "site") {
    s += d === "hard" ? 10 : 7;
    if (def.id === "veil_banner") {
      s += 10;
      // Prefer lanes we will keep Veiled (Low) or already have a figure
      if (i.altitude === 2) s += 6;
      if (enemyUnit(state, i.altitude)) s += 8;
    }
    if (def.id === "dust_ledger") {
      s += 8;
      const u = enemyUnit(state, i.altitude);
      if (u && getCard(u.cardId).school === "deal") s += 10;
    }
    if (def.id === "suture_mill" || def.id === "key_shrine") {
      s += 8;
      const u = enemyUnit(state, i.altitude);
      if (u && getCard(u.cardId).school === "graft") s += 12;
    }
    if (def.id === "branch_rune_reliquary") {
      s += 6;
      const u = enemyUnit(state, i.altitude);
      if (u && !u.veiled) s += 8;
    }
    if (def.id === "twinspoke_banner" || def.id === "mask_gallery") {
      s += 8;
      if (enemyUnit(state, i.altitude)) s += 6;
    }
    if (def.id === "ring_gaze" || def.id === "parasol_path") {
      s += d === "easy" ? 4 : 14;
      if (i.altitude === 0) s += 6;
      const foe = state.altitudes[i.altitude].player;
      if (foe?.veiled) s += 12;
    }
    if (def.id === "stake_cache") {
      s += 6;
      const u = enemyUnit(state, i.altitude);
      if (u && getCard(u.cardId).school === "cube") s += 10;
    }
  }

  // —— Sigil (Third Face) ——
  if (def.type === "sigil") {
    s += 8;
    if (def.id === "third_face") {
      s += d === "hard" ? 10 : 5;
      // Prefer lanes with Stance payoffs (Horn / Gallery / Twinspoke)
      if (controlsSiteId(state, "mask_gallery") || controlsSiteId(state, "twinspoke_banner")) s += 8;
      if (state.enemyHand.includes("horn_cantor") || state.enemyHand.includes("echo_mask")) s += 6;
    }
  }

  // —— Figure combos ——
  if (def.type === "figure") {
    if (def.id === "ochre_dancer" && controlsSiteId(state, "veil_banner")) s += 18;
    if (def.id === "ochre_dancer" && state.enemyHand.includes("veil_banner")) s += 6;
    if (def.id === "ribbon_bride") {
      if (
        controlsSiteId(state, "branch_rune_reliquary") ||
        state.enemyHand.includes("branch_rune_reliquary")
      ) {
        s += 12;
      }
    }
    if (def.id === "canister_hound" && hasGraftSchoolOnBoard(state)) s += 14;
    if (def.id === "canister_hound" && state.enemyHand.some((x) => getCard(x).school === "graft")) {
      s += 6;
    }
    if (def.id === "ledger_jackal") {
      s += state.enemyEclipse > 0 ? 16 : -8;
    }
    if (def.id === "stake_field_pilgrim") {
      // Empty-lane Eclipse — prefer empty enemy side of that altitude
      if (!state.altitudes[i.altitude].player) s += 14;
      else s -= 4;
    }
    if (def.id === "horn_cantor") {
      s += hasStanceB(state) ? 14 : 2;
      if (controlsSiteId(state, "twinspoke_banner") || controlsSiteId(state, "mask_gallery")) s += 6;
    }
    if (def.id === "echo_mask") {
      // Wants another figure to Stance-switch
      let others = 0;
      for (let a = 0; a < 3; a++) if (enemyUnit(state, a as Altitude)) others += 1;
      if (others > 0) s += 10;
    }
    if (def.id === "saltglass_courier" || def.id === "mesa_bell") {
      if (i.altitude === 0) s += 12;
      else s -= 4;
    }
    if (def.id === "bell_debt_walker" || def.id === "bell_siren") {
      let gaze = false;
      for (let a = 0; a < 3; a++) {
        if (altitudeHasGaze(state, a as Altitude, "enemy")) gaze = true;
      }
      if (gaze || state.enemyHand.includes("ring_gaze") || state.enemyHand.includes("coral_crown")) {
        s += 12;
      }
    }
    if (def.id === "sail_widow" && (controlsSiteId(state, "suture_mill") || controlsSiteId(state, "key_shrine"))) {
      s += 14;
    }
    if (def.id === "root_chassis") {
      // Engine, not a finisher — fine to play, but don't race Witness for power
      s += 4;
    }
    // Banner synergy: Cube veiled figures love Veil Banner lane
    if (def.school === "cube" && enemySite(state, i.altitude) === "veil_banner") s += 10;
    if (def.school === "deal" && enemySite(state, i.altitude) === "dust_ledger") s += 10;
    if (def.school === "graft" && enemySite(state, i.altitude) === "suture_mill") s += 10;
    if (def.school === "graft" && enemySite(state, i.altitude) === "key_shrine") s += 6;
  }

  if (d === "easy") s -= Math.max(0, def.essence - 1) * 3;
  return s;
}

function scoreWitnessOwn(
  state: MatchState,
  alt: Altitude,
  d: AiDifficulty,
): number {
  const u = enemyUnit(state, alt);
  if (!u) return 0;
  const def = getCard(u.cardId);
  let s = 50 + (2 - alt);

  // Root Chassis: Witness only when Sight-starved (hybrid is power 0)
  if (def.id === "root_chassis") {
    const sight = state.enemySight;
    if (sight >= 3) s -= 40;
    else s += 8;
  }

  // Prefer Witness after valuable grafts are on
  if (graftPayoffReady(u)) s += 22;
    else if (handHasGraftRelic(state)) {
      // Holding Ace/Bone/Crown — wait to graft first unless contested hard
      const theirs = unitPower(state, alt, "player");
      const mine = unitPower(state, alt, "enemy");
      if (theirs <= mine + 1) s -= 18;
    }

  // Card-specific Revelation payoffs
  if (def.id === "ochre_dancer" && controlsSiteId(state, "veil_banner")) s += 16;
  if (def.id === "ribbon_bride") {
    const coralSite =
      controlsSiteId(state, "branch_rune_reliquary") ||
      [...state.altitudes].some((slot) => {
        const sid = slot.enemySite;
        return sid != null && getCard(sid).school === "coral";
      });
    if (coralSite) s += 14;
  }
  if (def.id === "canister_hound" && hasGraftSchoolOnBoard(state)) s += 14;
  if (def.id === "ledger_jackal") s += state.enemyEclipse > 0 ? 18 : -12;
  if (def.id === "stake_field_pilgrim" && !state.altitudes[alt].player) s += 16;
  if (def.id === "horn_cantor" && hasStanceB(state)) s += 14;
  if (def.id === "saltglass_courier" && alt === 0) s += 12;
  if (def.id === "mesa_bell" && alt === 0) s += 12;
  if ((def.id === "bell_debt_walker" || def.id === "bell_siren") && altitudeHasGaze(state, alt, "enemy")) {
    s += 10;
  }
  // Reliquary / Dust Ledger power bump after Witness
  if (enemySite(state, alt) === "branch_rune_reliquary") s += 8;
  if (enemySite(state, alt) === "dust_ledger" && def.school === "deal") s += 10;
  if (enemySite(state, alt) === "key_shrine" && def.school === "graft") s += 10;
  if (enemySite(state, alt) === "stake_cache" && def.school === "cube") s += 8;

  // Unblinking Law: diversify schools when at 2
  if (state.enemyProphecies.includes("unblinking_law")) {
    const progress = lawSchoolProgress(state);
    if (progress === 2 && !state.witnessedSchoolsThisTurn.includes(def.school)) s += 20;
    if (progress >= 3) s += 4;
  }

  if (d === "hard") s += 8;
  if (d === "easy") s -= 10;
  return s;
}

function scoreGraft(
  state: MatchState,
  i: Extract<Intent, { kind: "graft" }>,
  d: AiDifficulty,
): number {
  const relicId = state.enemyHand[i.handIndex];
  const u = enemyUnit(state, i.altitude);
  if (!u) return 0;
  let s = 35;
  if (d === "hard") s += 6;

  if (u.veiled && GRAFT_BEFORE_WITNESS.has(relicId)) {
    s += 24; // set up Revelation draw / Sight / Gaze
  }
  if (relicId === "coral_crown") {
    s += 10;
    const foe = state.altitudes[i.altitude].player;
    if (foe?.veiled) s += 14;
  }
  if (relicId === "debt_coin") s += state.enemyEclipse > 0 ? 12 : 2;
  if (relicId === "splice_token") {
    s += controlsSiteId(state, "suture_mill") || controlsSiteId(state, "key_shrine") ? 14 : 2;
  }
  if (relicId === "ace_of_hollows") s += 8;
  if (relicId === "bone_wick_charm") s += 6;
  // Prefer grafting onto figures we plan to Witness soon
  if (u.veiled) s += 6;
  return s;
}

function scoreStance(state: MatchState, alt: Altitude, d: AiDifficulty): number {
  const u = enemyUnit(state, alt);
  if (!u) return 0;
  let s = 10;
  if (d === "hard") s += 8;

  // Flip to Stance B before Witnessing Horn / Mask Gallery power
  if (!u.stanceB) {
    if (enemySite(state, alt) === "mask_gallery") s += 16;
    if (controlsSiteId(state, "twinspoke_banner")) s += 10;
    if (state.enemyHand.includes("horn_cantor")) s += 8;
    // Echo Mask / Seraph style: Stance B for Eclipse packages later
    if (u.veiled && getCard(u.cardId).veiledPower < getCard(u.cardId).witnessedPower) {
      // Stance B swaps — if currently veiled with low veiledPower, Stance B makes veiled use witnessedPower
      s += 6;
    }
  } else {
    // Already B — only switch back if Mask Gallery gone / power better
    if (enemySite(state, alt) !== "mask_gallery") s -= 4;
  }
  return s;
}

function scoreRite(
  state: MatchState,
  i: Extract<Intent, { kind: "rite" }>,
  d: AiDifficulty,
): number {
  const id = state.enemyHand[i.handIndex];
  let s = 20;
  if (d === "hard") s += 10;
  if (d === "easy") s -= 6;

  if (id === "dusk_tithe") {
    s += state.enemyEclipse > 0 ? 16 : 4;
  }
  // Blind contested Sight lanes or before Shuttered Edict pass
  if (i.altitude != null) {
    const foe = state.altitudes[i.altitude].player;
    if (foe && !foe.veiled) s += 8;
  }
  if (state.enemyProphecies.includes("shuttered_edict")) s += 12;
  if (id === "hole_choir") s += 4; // also draws
  return s;
}

/** Heuristic AI — difficulty scales aggression; scoring pursues real combos. */
export function chooseAiMove(state: MatchState): Intent {
  const intents = legalIntents(state);
  if (intents.length === 0) return { kind: "pass" };

  if (state.tutorial && state.tutorialStep !== "done") {
    return chooseTutorialEnemyMove(state, intents);
  }

  const d: AiDifficulty = state.aiDifficulty ?? "normal";

  const score = (i: Intent): number => {
    if (i.kind === "pass") {
      if (d === "easy") return 12;
      if (d === "hard") return -4;
      // Prefer pass if waiting to graft before Witness and nothing else scores well
      if (handHasGraftRelic(state) && veiledFigureAlts(state).length > 0) return -2;
      return 0;
    }
    if (i.kind === "witness" && !i.enemy) return scoreWitnessOwn(state, i.altitude, d);
    if (i.kind === "witness" && i.enemy) {
      let s = 40;
      if (d === "hard") s += 18;
      if (d === "easy") s -= 22;
      // Eclipse / Iris-style: stealing Revelations is high value when Gaze is online
      s += 6;
      return s;
    }
    if (i.kind === "graft") return scoreGraft(state, i, d);
    if (i.kind === "rite") return scoreRite(state, i, d);
    if (i.kind === "stance") return scoreStance(state, i.altitude, d);
    if (i.kind === "play") return scorePlay(state, i, d);
    return 1;
  };

  let best = intents[0];
  let bestS = -Infinity;
  const noise = noiseFor(d);
  for (const i of intents) {
    const s = score(i) + Math.random() * noise;
    if (s > bestS) {
      bestS = s;
      best = i;
    }
  }
  return best;
}
