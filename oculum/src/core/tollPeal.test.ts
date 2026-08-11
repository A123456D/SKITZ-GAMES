import { describe, expect, it } from "vitest";
import { teachDeck, teachDeckToll } from "./cards";
import { applyIntent, createMatch } from "./match";
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

describe("Bellward Peal", () => {
  it("Peal arm then Resolve spend → Peal pays Sight", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 911 });
    s.altitudes[1].player = fig("clapper_cantor", { veiled: false, revelationFired: true });
    s.altitudes[1].enemy = fig("blot_herald", { veiled: false, revelationFired: true });
    s.tollOwner[1] = "player";
    s.sight = 3;
    s.hand = [];
    const evPeal = applyIntent(s, { kind: "peal", altitude: 1 });
    expect(evPeal.some((e) => e.type === "peal")).toBe(true);
    expect(s.pealArmed[1]).toBe(true);
    expect(s.sight).toBe(2);

    // Player stronger on Mid so enemy loses → Resolve spends Toll
    s.altitudes[1].player = fig("carillon", { veiled: false, revelationFired: true });
    const sightBeforePay = s.sight;
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "peal_pay")).toBe(true);
    expect(s.tollOwner[1]).toBe(null);
    expect(s.pealArmed[1]).toBe(false);
    expect(s.sight).toBeGreaterThan(sightBeforePay);
  });

  it("Lure clear of Pealed Toll without Banner → fizzle (no peal_pay)", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 912 });
    s.altitudes[1].player = fig("parasol_debtor", { veiled: true });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.tollOwner[1] = "player";
    s.pealArmed[1] = true;
    s.hand = ["sound_the_toll"];
    s.essence = 2;
    s.sight = 5;
    const ev = applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    // Sound on Tolled Mid with enemy Veiled → Lure clears
    expect(ev.some((e) => e.type === "lure") || ev.some((e) => e.type === "toll_pay")).toBe(true);
    expect(ev.some((e) => e.type === "peal_pay")).toBe(false);
    expect(s.pealArmed[1]).toBe(false);
  });
});
