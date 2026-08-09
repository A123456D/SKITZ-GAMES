import { describe, expect, it } from "vitest";
import { chooseAiMove } from "./ai";
import { getCard, teachDeck } from "./cards";
import { applyIntent, createMatch, legalIntents } from "./match";
import type { Intent, MatchState } from "./types";

function scorePlayer(s: MatchState, i: Intent): number {
  if (i.kind === "pass") return 0;
  if (i.kind === "witness" && !i.enemy) return 50;
  if (i.kind === "witness" && i.enemy) return 45;
  if (i.kind === "graft") return 30;
  if (i.kind === "rite") return 18;
  if (i.kind === "stance") return 5; // avoid stance loops
  if (i.kind === "wager") return 8;
  if (i.kind === "play") {
    const def = getCard(s.hand[i.handIndex]);
    return 20 + def.witnessedPower - def.essence + (i.altitude === 0 ? 2 : 0);
  }
  return 1;
}

function choosePlayer(s: MatchState): Intent {
  const intents = legalIntents(s);
  let best = intents[0]!;
  let bestS = -1e9;
  for (const i of intents) {
    const sc = scorePlayer(s, i);
    if (sc > bestS) {
      bestS = sc;
      best = i;
    }
  }
  if (best.kind === "stance") {
    const alt = intents
      .filter((i) => i.kind !== "stance")
      .sort((a, b) => scorePlayer(s, b) - scorePlayer(s, a))[0];
    return alt ?? { kind: "pass" };
  }
  if (bestS < 12) return { kind: "pass" };
  return best;
}

function playMatch(seed: number) {
  const s = createMatch({ seed });
  const stats = {
    resolves: 0,
    enemyWitness: 0,
    playerGaze: 0,
    stance: 0,
    lawHits: 0,
    gazeAvailableTurns: 0,
    stanceAvailableTurns: 0,
  };
  let guard = 500;
  let eclBefore = 0;
  while (s.phase === "play" && guard-- > 0) {
    const intents = legalIntents(s);
    if (s.active === "player") {
      if (intents.some((i) => i.kind === "witness" && i.enemy)) stats.gazeAvailableTurns++;
      if (intents.some((i) => i.kind === "stance")) stats.stanceAvailableTurns++;
    }
    const intent = s.active === "player" ? choosePlayer(s) : chooseAiMove(s);
    const events = applyIntent(s, intent);
    for (const ev of events) {
      if (ev.type === "resolve") stats.resolves++;
      if (ev.type === "stance") stats.stance++;
      if (ev.type === "witness" && ev.enemyTarget) stats.playerGaze++;
      if (ev.type === "witness" && ev.side === "enemy" && !ev.enemyTarget) stats.enemyWitness++;
    }
    if (s.eclipse > eclBefore) {
      stats.lawHits += s.eclipse - eclBefore;
      eclBefore = s.eclipse;
    }
  }
  return {
    winner: s.winner,
    reason: s.endReason,
    turns: s.turn,
    will: [s.will, s.enemyWill] as const,
    ecl: [s.eclipse, s.enemyEclipse] as const,
    hasLaw: s.prophecies.includes("unblinking_law"),
    stats,
  };
}

describe("feel-pass simulations", () => {
  it("teach deck is 20 cards", () => {
    expect(teachDeck()).toHaveLength(20);
  });

  it("plays three contested matches to end with longer pacing", () => {
    const results = [1, 42, 99].map(playMatch);
    for (const r of results) {
      expect(r.winner).not.toBeNull();
      expect(r.stats.resolves).toBeGreaterThan(0);
      // Soft reboot Teach has no Law yet
      expect(r.hasLaw).toBe(false);
    }
    const turns = results.map((r) => r.turns).sort((a, b) => a - b);
    const median = turns[1]!;
    expect(median).toBeGreaterThanOrEqual(4);
    expect(median).toBeLessThanOrEqual(11);
    const avg = turns.reduce((a, b) => a + b, 0) / turns.length;
    expect(avg).toBeGreaterThan(4);
    expect(avg).toBeLessThanOrEqual(11);
    // Surface feel-pass telemetry for the audit
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(results, null, 2));
  });
});
