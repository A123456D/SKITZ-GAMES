import { describe, expect, it } from "vitest";
import { createMatch, applyIntent } from "./match";
import type { BoardUnit, MatchState, OculusEvent } from "./types";

function fig(cardId: string, opts: Partial<BoardUnit> = {}): BoardUnit {
  return {
    instanceId: `t-${cardId}`,
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

function bothPass(s: MatchState): OculusEvent[] {
  s.passed.player = true;
  s.active = "enemy";
  return applyIntent(s, { kind: "pass" });
}

describe("feel-pass resolve events", () => {
  it("emits HOLD when a Veiled figure loses without Stain", () => {
    const s = createMatch({ seed: 1 });
    s.altitudes[1].player = fig("blot_herald", { veiled: true });
    s.altitudes[1].enemy = fig("highscar_lancer", { veiled: false });
    const ev = bothPass(s);
    expect(ev.some((e) => e.type === "hold" && e.reason === "veil")).toBe(true);
    expect(ev.some((e) => e.type === "lane_result" && e.winner === "enemy")).toBe(true);
  });

  it("emits ERASE when Stained Veiled figure loses", () => {
    const s = createMatch({ seed: 2 });
    s.altitudes[1].player = fig("blot_herald", { veiled: true, stained: true });
    s.altitudes[1].enemy = fig("highscar_lancer", { veiled: false });
    const ev = bothPass(s);
    expect(ev.some((e) => e.type === "erase" && e.via === "stain")).toBe(true);
  });

  it("emits HOLD Motley B through Stain Erase", () => {
    const s = createMatch({ seed: 3 });
    s.altitudes[1].player = fig("whitecard_mummer", {
      veiled: true,
      stained: true,
      stanceB: true,
    });
    s.altitudes[1].enemy = fig("highscar_lancer", { veiled: false });
    const ev = bothPass(s);
    expect(ev.some((e) => e.type === "hold" && e.reason === "motley_b")).toBe(true);
    expect(ev.some((e) => e.type === "erase")).toBe(false);
  });
});
