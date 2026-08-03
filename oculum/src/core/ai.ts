import { getCard } from "./cards";
import { legalIntents, unitPower } from "./match";
import type { AiDifficulty, Intent, MatchState } from "./types";

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

/** Heuristic AI — difficulty scales aggression, Gaze use, and noise. */
export function chooseAiMove(state: MatchState): Intent {
  const intents = legalIntents(state);
  if (intents.length === 0) return { kind: "pass" };

  const d: AiDifficulty = state.aiDifficulty ?? "normal";

  const score = (i: Intent): number => {
    if (i.kind === "pass") {
      if (d === "easy") return 12;
      if (d === "hard") return -4;
      return 0;
    }
    if (i.kind === "witness" && !i.enemy) {
      let s = 50 + (2 - i.altitude);
      if (d === "hard") s += 8;
      if (d === "easy") s -= 10;
      return s;
    }
    if (i.kind === "witness" && i.enemy) {
      let s = 40;
      if (d === "hard") s += 18;
      if (d === "easy") s -= 22;
      return s;
    }
    if (i.kind === "graft") {
      let s = 35;
      if (d === "hard") s += 6;
      return s;
    }
    if (i.kind === "rite") {
      let s = 20;
      if (d === "hard") s += 10;
      if (d === "easy") s -= 6;
      return s;
    }
    if (i.kind === "stance") {
      let s = 10;
      if (d === "hard") s += 8;
      return s;
    }
    if (i.kind === "play") {
      const id = state.enemyHand[i.handIndex];
      const def = getCard(id);
      let s = 25 + def.witnessedPower - def.essence;
      if (i.altitude === 0) s += d === "hard" ? 6 : 3;
      if (i.altitude === 2 && def.type === "figure") s += d === "easy" ? 4 : 0;
      const mine = unitPower(state, i.altitude, "enemy");
      const theirs = unitPower(state, i.altitude, "player");
      if (theirs >= mine) s += d === "hard" ? 10 : 5;
      if (def.type === "site") s += d === "hard" ? 12 : 8;
      if (def.id === "ring_gaze") s += d === "easy" ? 4 : 12;
      if (def.id === "coral_crown") s += d === "hard" ? 14 : 6;
      if (def.id === "third_face") s += d === "hard" ? 10 : 5;
      if (d === "easy") s -= Math.max(0, def.essence - 1) * 3;
      return s;
    }
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
