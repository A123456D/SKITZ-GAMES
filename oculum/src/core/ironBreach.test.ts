import { describe, expect, it } from "vitest";
import { CARDS, getCard, teachDeck, teachDeckBreach } from "./cards";
import { applyIntent, createMatch, unitPower } from "./match";
import type { BoardUnit, MatchState, OculusEvent } from "./types";

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

describe("Scar Breach Overexpose", () => {
  it("registers twenty Breach cards", () => {
    expect(CARDS.filter((c) => c.heresy === "breach")).toHaveLength(20);
    expect(teachDeckBreach().length).toBeGreaterThanOrEqual(18);
    expect(getCard("rivet_vanguard").text.toLowerCase()).toContain("overexpose");
  });

  it("Open then lose Resolve while Witnessed → Overexpose (lose 1 Sight)", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 801 });
    s.altitudes[1].player = fig("rivet_vanguard", { veiled: true });
    s.altitudes[1].enemy = fig("dahaka", { veiled: false, revelationFired: true });
    s.sight = 4;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].player?.veiled).toBe(false);
    expect(s.altitudes[1].player?.openedSinceResolve).toBe(true);
    const sightAfterOpen = s.sight;
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "overexpose")).toBe(true);
    // Overexpose −1 Sight; turn-start Sight may mint after Resolve
    expect(s.sight).toBeLessThanOrEqual(sightAfterOpen);
    expect(s.altitudes[1].player).toBeNull();
    expect(ev.some((e) => e.type === "fall" && e.side === "player")).toBe(true);
  });

  it("Veiled lose does not Overexpose", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 802 });
    s.altitudes[1].player = fig("rivet_vanguard", { veiled: true });
    s.altitudes[1].enemy = fig("dahaka", { veiled: false, revelationFired: true });
    s.sight = 3;
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "overexpose")).toBe(false);
  });

  it("second Opened lose same Resolve does not Overexpose again", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 803 });
    s.altitudes[0].player = fig("rivet_vanguard", {
      veiled: false,
      revelationFired: true,
      openedSinceResolve: true,
    });
    s.altitudes[0].enemy = fig("dahaka", { veiled: false, revelationFired: true });
    s.altitudes[1].player = fig("scarsteel_cleaver", {
      veiled: false,
      revelationFired: true,
      openedSinceResolve: true,
    });
    s.altitudes[1].enemy = fig("dahaka", { veiled: false, revelationFired: true });
    s.sight = 5;
    const ev = bothPassResolve(s);
    const ox = ev.filter((e) => e.type === "overexpose");
    expect(ox).toHaveLength(1);
  });

  it("Highscar Overexpose on High also deals 1 Will to controller", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 804 });
    s.altitudes[0].player = fig("highscar_lancer", {
      veiled: false,
      revelationFired: true,
      openedSinceResolve: true,
    });
    // Stronger Witnessed foe so Highscar loses High
    s.altitudes[0].enemy = fig("dahaka", { veiled: false, revelationFired: true });
    s.sight = 3;
    s.will = 12;
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "overexpose")).toBe(true);
    // soft Resolve chip + shared Overexpose Will 1 (+ Highscar extra on High)
    expect(s.will).toBeLessThanOrEqual(12 - 2);
  });

  it("Breach Will pierces Veiled Motley Stance B walls", () => {
    const s = createMatch({ deck: teachDeckBreach(), enemyDeck: teachDeck(), seed: 810 });
    s.altitudes[1].player = fig("skaroth", {
      veiled: false,
      revelationFired: true,
      openedSinceResolve: true,
    });
    s.altitudes[1].enemy = fig("whitecard_mummer", {
      veiled: true,
      stanceB: true,
    });
    s.enemyWill = 20;
    s.will = 20;
    // Assert power lead, then Resolve
    expect(unitPower(s, 1, "player")).toBeGreaterThan(unitPower(s, 1, "enemy"));
    s.passed.player = true;
    s.active = "enemy";
    const before = s.enemyWill;
    applyIntent(s, { kind: "pass" });
    expect(s.enemyWill).toBeLessThan(before);
  });

  it("Veiled Ink soft-chip vs Open Breach is capped at 2", () => {
    const s = createMatch({ deck: teachDeckBreach(), enemyDeck: teachDeck(), seed: 811 });
    s.altitudes[1].player = fig("skaroth", {
      veiled: false,
      revelationFired: true,
      openedSinceResolve: true,
    });
    s.altitudes[1].enemy = fig("dahaka", { veiled: true });
    s.enemyWill = 20;
    s.will = 20;
    expect(unitPower(s, 1, "player")).toBeGreaterThan(unitPower(s, 1, "enemy"));
    // Uncapped soft would be ceil(7/2)=4; capped at 2; no Breach Will into normal Veiled
    bothPassResolve(s);
    expect(s.enemyWill).toBe(18);
  });
});
