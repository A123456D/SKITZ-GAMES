import { describe, expect, it, beforeEach } from "vitest";
import { getCard, teachDeck } from "./cards";
import { setMotleyWagerMode } from "./motleyKit";
import { applyIntent, createMatch, legalIntents, unitPower } from "./match";
import type { BoardUnit, MatchState, OculusEvent } from "./types";

beforeEach(() => setMotleyWagerMode("coinflip"));

function fig(cardId: string, opts: Partial<BoardUnit> = {}): BoardUnit {
  return {
    instanceId: `t${cardId}`,
    cardId,
    veiled: true,
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
    wagerHeads: false,
    wagerPowerDelta: 0,
    openedSinceResolve: false,
    lastBreachOpened: false,
    pressed: false,
    pressedBy: null,
    haloed: false,
    haloSustained: false,
    tempted: false,
    temptedBy: null,
    branded: false,
    brandedBy: null,
    ...opts,
  };
}

function bothPassResolve(s: MatchState): OculusEvent[] {
  s.passed.player = true;
  s.active = "enemy";
  return applyIntent(s, { kind: "pass" });
}

/** Seed entropy so the next Motley flip is Heads ((e&1)===0 after LCG step). */
function forceNextHeads(s: MatchState): void {
  for (let e = 1; e < 20000; e++) {
    const next = (Math.imul(e, 1664525) + 1013904223) >>> 0;
    if ((next & 1) === 0) {
      s.wagerEntropy = e;
      return;
    }
  }
  throw new Error("no Heads entropy");
}

/** Seed entropy so the next Motley flip is Tails. */
function forceNextTails(s: MatchState): void {
  for (let e = 1; e < 20000; e++) {
    const next = (Math.imul(e, 1664525) + 1013904223) >>> 0;
    if ((next & 1) === 1) {
      s.wagerEntropy = e;
      return;
    }
  }
  throw new Error("no Tails entropy");
}

describe.skip("Motley coinflip Wager (archived kit — engine is cashbust)", () => {
  it("Wager flips immediately; Heads steals power and offers Up the Ante", () => {
    setMotleyWagerMode("coinflip");
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 50 });
    s.altitudes[1].player = fig("favor_broker", { veiled: true });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.sight = 4;
    forceNextHeads(s);
    const before = s.sight;
    const mineBefore = unitPower(s, 1, "player");
    const theirsBefore = unitPower(s, 1, "enemy");
    expect(legalIntents(s).some((x) => x.kind === "wager" && x.altitude === 1)).toBe(true);
    const ev = applyIntent(s, { kind: "wager", altitude: 1 });
    expect(ev.some((e) => e.type === "wager_flip" && e.result === "heads")).toBe(true);
    expect(s.altitudes[1].player?.wagered).toBe(true);
    expect(s.altitudes[1].player?.wagerHeads).toBe(true);
    expect(s.sight).toBe(before - 1);
    expect(unitPower(s, 1, "player")).toBe(mineBefore + 1);
    expect(unitPower(s, 1, "enemy")).toBe(theirsBefore - 1);
    expect(s.pendingUpAnte?.altitude).toBe(1);
    expect(legalIntents(s).some((x) => x.kind === "up_ante")).toBe(true);
    expect(legalIntents(s).some((x) => x.kind === "skip_ante")).toBe(true);
    expect(legalIntents(s).some((x) => x.kind === "pass")).toBe(false);
  });

  it("Tails loses Sight, clears Wager, and Re-Veils if Witnessed", () => {
    setMotleyWagerMode("coinflip");
    const t = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 200 });
    t.altitudes[1].player = fig("favor_broker", { veiled: false, revelationFired: true });
    t.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    t.sight = 3;
    forceNextTails(t);
    const before = t.sight;
    const ev = applyIntent(t, { kind: "wager", altitude: 1 });
    expect(ev.some((e) => e.type === "wager_flip" && e.result === "tails")).toBe(true);
    expect(t.sight).toBe(before - 2); // ante + tails
    expect(t.altitudes[1].player?.veiled).toBe(true);
    expect(t.altitudes[1].player?.wagered).toBe(false);
    expect(ev.some((e) => e.type === "reveil")).toBe(true);
  });

  it("Witnessed Heads win scores Trick Eclipse and spends Favor", () => {
    setMotleyWagerMode("coinflip");
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 11 });
    s.altitudes[1].player = fig("whitecard_mummer", {
      veiled: false,
      revelationFired: true,
      wagered: true,
      wagerHeads: true,
      wagerPowerDelta: 1,
    });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.favor = 1;
    const eclBefore = s.eclipse;
    bothPassResolve(s);
    expect(s.eclipse).toBe(eclBefore + 1);
    expect(s.favor).toBe(0);
  });

  it("Up the Ante fires a second flip", () => {
    setMotleyWagerMode("coinflip");
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 300 });
    s.altitudes[1].player = fig("favor_broker", { veiled: true });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.sight = 5;
    forceNextHeads(s);
    applyIntent(s, { kind: "wager", altitude: 1 });
    expect(s.pendingUpAnte).not.toBeNull();
    forceNextTails(s);
    const ev = applyIntent(s, { kind: "up_ante", altitude: 1 });
    expect(ev.some((e) => e.type === "up_ante")).toBe(true);
    expect(ev.some((e) => e.type === "wager_flip" && e.ante)).toBe(true);
  });

  it("Stance B + Wager still swaps printed faces under coinflip", () => {
    setMotleyWagerMode("coinflip");
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 12 });
    s.altitudes[1].player = fig("whitecard_mummer", { veiled: true, stanceB: true });
    expect(unitPower(s, 1, "player")).toBe(getCard("whitecard_mummer").veiledPower);
    s.altitudes[1].player!.wagered = true;
    expect(unitPower(s, 1, "player")).toBe(getCard("whitecard_mummer").witnessedPower);
  });
});
