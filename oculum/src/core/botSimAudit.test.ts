/**
 * Live craft matrix @ 10/matchup + Hard AI soft-fault probes.
 */
import { describe, expect, it } from "vitest";
import { chooseAiMove } from "./ai";
import { CARDS, getCard } from "./cards";
import {
  botSimDeck,
  formatBotSimSummary,
  runBotSim,
  shuffleDeckOrder,
  type DeckKind,
  type MatchupSpec,
} from "./botSim";
import { applyIntent, createMatch, legalIntents, unitPower } from "./match";
import type { Intent, MatchState } from "./types";

const N = 10;
const KINDS = ["ink", "motley", "toll", "breach"] as const satisfies readonly DeckKind[];

function matrix10(): MatchupSpec[] {
  const out: MatchupSpec[] = [];
  for (const a of KINDS) {
    out.push({ name: `${a}_vs_${a}`, player: a, enemy: a, count: N });
  }
  for (let i = 0; i < KINDS.length; i++) {
    for (let j = i + 1; j < KINDS.length; j++) {
      const a = KINDS[i]!;
      const b = KINDS[j]!;
      out.push({ name: `${a}_vs_${b}`, player: a, enemy: b, count: N });
      out.push({ name: `${b}_vs_${a}`, player: b, enemy: a, count: N });
    }
  }
  return out;
}

type Probe = {
  passWithWager: number;
  passWithPress: number;
  passWithSound: number;
  passWithPeal: number;
  passWithBreachOpen: number;
  wagerWidowWhenLegal: number;
  widowLegalWindows: number;
  illegalChosen: number;
  moves: number;
};

function emptyProbe(): Probe {
  return {
    passWithWager: 0,
    passWithPress: 0,
    passWithSound: 0,
    passWithPeal: 0,
    passWithBreachOpen: 0,
    wagerWidowWhenLegal: 0,
    widowLegalWindows: 0,
    illegalChosen: 0,
    moves: 0,
  };
}

function recreateMatch(seed: number, player: DeckKind, enemy: DeckKind): MatchState {
  const playerDeck = shuffleDeckOrder(botSimDeck(player, seed), seed ^ 0x3c6ef35f);
  const enemyDeck = shuffleDeckOrder(botSimDeck(enemy, seed ^ 0xa5a5a5a5), seed ^ 0x1b873593);
  return createMatch({
    seed,
    deck: playerDeck,
    enemyDeck,
    aiDifficulty: "hard",
  });
}

function probeMatch(seed: number, player: DeckKind, enemy: DeckKind): Probe {
  const s = recreateMatch(seed, player, enemy);
  const probe = emptyProbe();
  let guard = 800;
  while (s.phase === "play" && guard-- > 0) {
    const side = s.active;
    const legal = legalIntents(s);
    const move = chooseAiMove(s);
    probe.moves += 1;
    if (!legal.some((i) => JSON.stringify(i) === JSON.stringify(move))) {
      probe.illegalChosen += 1;
    }

    const hand = side === "player" ? s.hand : s.enemyHand;
    const canWager = legal.some((i) => i.kind === "wager");
    const canPress = legal.some((i) => i.kind === "press");
    const canPeal = legal.some((i) => i.kind === "peal");
    const canSound = legal.some(
      (i) => i.kind === "rite" && hand[i.handIndex] === "sound_the_toll",
    );
    const canBreachOpen = legal.some((i) => {
      if (i.kind !== "witness" || i.enemy) return false;
      const u = s.altitudes[i.altitude][side];
      if (!u?.veiled || getCard(u.cardId).heresy !== "breach") return false;
      const foe = s.altitudes[i.altitude][side === "player" ? "enemy" : "player"];
      const wit = getCard(u.cardId).witnessedPower; // approx; probe only
      const theirs = foe ? unitPower(s, i.altitude, side === "player" ? "enemy" : "player") : 0;
      return !foe || wit > theirs;
    });
    const widowLegal = legal.some((i) => {
      if (i.kind !== "wager") return false;
      const u = s.altitudes[i.altitude][side];
      return u?.cardId === "diamond_widow";
    });
    if (widowLegal) {
      probe.widowLegalWindows += 1;
      if (move.kind === "wager") {
        const alt = (move as Extract<Intent, { kind: "wager" }>).altitude;
        if (s.altitudes[alt][side]?.cardId === "diamond_widow") {
          probe.wagerWidowWhenLegal += 1;
        }
      }
    }

    if (move.kind === "pass") {
      if (canWager) probe.passWithWager += 1;
      if (canPress) {
        // Only count soft fault when a winning Press was refused
        let winning = false;
        for (const x of legal) {
          if (x.kind !== "press") continue;
          const mine = unitPower(s, x.altitude, side);
          const theirs = unitPower(s, x.altitude, side === "player" ? "enemy" : "player");
          if (mine > theirs) {
            winning = true;
            break;
          }
        }
        if (winning) probe.passWithPress += 1;
      }
      if (canSound) probe.passWithSound += 1;
      if (canPeal) probe.passWithPeal += 1;
      if (canBreachOpen) probe.passWithBreachOpen += 1;
    }

    applyIntent(s, move);
  }
  return probe;
}

function figUnit(cardId: string) {
  return {
    instanceId: `t-${cardId}`,
    cardId,
    veiled: true,
    hybridSite: false,
    stanceB: true,
    grafts: [] as { instanceId: string; cardId: string }[],
    inhabitant: null as string | null,
    hasThirdFace: false,
    strained: false,
    stained: false,
    revelationFired: false,
    scrutiny: 0,
    wagered: false,
    wagerAntePaid: false,
    wagerAnteFavor: false,
    wagerHeads: false,
    wagerPowerDelta: 0,
    openedSinceResolve: false,
    lastBreachOpened: false,
    pressed: false,
    pressedBy: null as null,
    haloed: false,
    haloSustained: false,
    tempted: false,
    temptedBy: null,
    branded: false,
    brandedBy: null,
  };
}

describe("Motley intentional Wager legality", () => {
  it("every Motley figure can Wager while Veiled with Sight", () => {
    const figs = CARDS.filter((c) => c.heresy === "motley" && c.type === "figure");
    expect(figs.length).toBeGreaterThanOrEqual(10);
    for (const def of figs) {
      const s = createMatch({ seed: 7, aiDifficulty: "hard" });
      s.active = "player";
      s.sight = 2;
      s.wagerUsed.player = false;
      s.craftKits.player = ["motley"];
      s.altitudes[1].player = figUnit(def.id);
      const ok = legalIntents(s).some((i) => i.kind === "wager" && i.altitude === 1);
      expect(ok, `${def.id} should be Wagerable`).toBe(true);
      applyIntent(s, { kind: "wager", altitude: 1 });
      expect(s.altitudes[1].player?.wagered, def.id).toBe(true);
      expect(s.sight).toBe(1);
    }
  });

  it("diamond_widow Wagers after Stance B with 1 Sight", () => {
    const s = createMatch({ seed: 9 });
    s.active = "player";
    s.sight = 1;
    s.essence = 0;
    s.hand = [];
    s.craftKits.player = ["motley"];
    s.altitudes[0].player = { ...figUnit("diamond_widow"), stanceB: false };
    expect(legalIntents(s).some((i) => i.kind === "stance")).toBe(true);
    applyIntent(s, { kind: "stance", altitude: 0 });
    expect(s.altitudes[0].player?.stanceB).toBe(true);
    expect(legalIntents(s).some((i) => i.kind === "wager" && i.altitude === 0)).toBe(true);
    applyIntent(s, { kind: "wager", altitude: 0 });
    expect(s.altitudes[0].player?.wagered).toBe(true);
    expect(s.sight).toBe(0);
  });

  it("Motley vessels can intentional Wager while Veiled", () => {
    const vessels = CARDS.filter((c) => c.heresy === "motley" && c.type === "vessel");
    expect(vessels.length).toBeGreaterThanOrEqual(1);
    for (const def of vessels) {
      const s = createMatch({ seed: 11 });
      s.active = "player";
      s.sight = 1;
      s.craftKits.player = ["motley"];
      s.altitudes[1].player = { ...figUnit(def.id), stanceB: false };
      const ok = legalIntents(s).some((i) => i.kind === "wager" && i.altitude === 1);
      expect(ok, `${def.id} vessel should be Wagerable`).toBe(true);
      applyIntent(s, { kind: "wager", altitude: 1 });
      expect(s.altitudes[1].player?.wagered).toBe(true);
    }
  });
});

describe("bot sim audit 10× heresy matrix", () => {
  it("finishes all matchups without stalls / illegal moves, and surfaces soft AI faults", () => {
    const matchups = matrix10();
    const summary = runBotSim({ matchups, seedBase: 8800 });
    // eslint-disable-next-line no-console
    console.log(formatBotSimSummary(summary));

    expect(summary.stalled).toBe(0);
    expect(summary.total).toBe(N * matchups.length);

    const totals = emptyProbe();
    const probeSpecs: { player: DeckKind; enemy: DeckKind; seeds: number[] }[] = [
      { player: "motley", enemy: "ink", seeds: [1, 2, 3, 4, 5] },
      { player: "ink", enemy: "motley", seeds: [1, 2, 3, 4, 5] },
      { player: "motley", enemy: "motley", seeds: [1, 2, 3, 4, 5] },
      { player: "toll", enemy: "toll", seeds: [1, 2, 3, 4, 5] },
      { player: "breach", enemy: "breach", seeds: [1, 2, 3, 4, 5] },
      { player: "ink", enemy: "toll", seeds: [1, 2, 3] },
      { player: "breach", enemy: "motley", seeds: [1, 2, 3] },
    ];

    for (const spec of probeSpecs) {
      for (const seed of spec.seeds) {
        const p = probeMatch(8800 + seed * 17 + spec.player.length * 3, spec.player, spec.enemy);
        for (const k of Object.keys(totals) as (keyof Probe)[]) {
          totals[k] += p[k];
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log("AI soft-fault probes:", totals);

    expect(totals.illegalChosen).toBe(0);
    expect(totals.passWithPress).toBeLessThanOrEqual(3);
    expect(totals.passWithSound).toBeLessThanOrEqual(2);
    expect(totals.passWithPeal).toBeLessThanOrEqual(4);
    expect(totals.passWithBreachOpen).toBeLessThanOrEqual(6);
    expect(totals.passWithWager).toBeLessThanOrEqual(12);
  }, 120_000);
});
