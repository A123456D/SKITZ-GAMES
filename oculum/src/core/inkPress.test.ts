import { describe, expect, it } from "vitest";
import { teachDeck, teachDeckMotley } from "./cards";
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
    openedSinceResolve: false,
    lastBreachOpened: false,
    pressed: false,
    pressedBy: null,
    ...opts,
  };
}

function bothPassResolve(s: MatchState): OculusEvent[] {
  s.passed.player = true;
  s.active = "enemy";
  return applyIntent(s, { kind: "pass" });
}

describe("Ink Press", () => {
  it("Press then win Resolve Forces Exposes through Motley Stance B", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeckMotley(), seed: 901 });
    s.altitudes[1].player = fig("mire_duelist", { veiled: false, revelationFired: true });
    s.altitudes[1].enemy = fig("whitecard_mummer", {
      veiled: true,
      stained: true,
      stanceB: true,
    });
    s.sight = 3;
    s.hand = ["blot_herald"];
    const evPress = applyIntent(s, { kind: "press", altitude: 1 });
    expect(evPress.some((e) => e.type === "press")).toBe(true);
    expect(s.altitudes[1].enemy?.pressed).toBe(true);
    // Press into Motley Stance B is free (still once/window)
    expect(s.sight).toBe(3);

    // Without Press, Stance B would Hold through Stain; Press pierces
    const ev = bothPassResolve(s);
    expect(s.altitudes[1].enemy?.veiled).toBe(false);
    expect(s.altitudes[1].enemy?.strained).toBe(true);
    expect(s.altitudes[1].enemy?.pressed).toBe(false);
    expect(ev.some((e) => e.type === "press_backlash")).toBe(false);
  });

  it("Pressed Figures have −1 power", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeckMotley(), seed: 903 });
    s.altitudes[1].enemy = fig("whitecard_mummer", {
      veiled: true,
      stained: true,
      stanceB: true,
      wagered: true,
      wagerAntePaid: true,
    });
    s.altitudes[1].player = fig("blot_herald", { veiled: false, revelationFired: true });
    const before = unitPower(s, 1, "enemy");
    s.sight = 3;
    applyIntent(s, { kind: "press", altitude: 1 });
    expect(unitPower(s, 1, "enemy")).toBe(before - 1);
  });

  it("Press fail (still Veiled after Resolve) → Smother backlash", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 902 });
    // Weak Witnessed Ink vs strong Veiled Stained foe → Ink loses, Press never Erases
    s.altitudes[1].player = fig("pale_ledger", { veiled: false, revelationFired: true });
    s.altitudes[1].enemy = fig("dahaka", {
      veiled: true,
      stained: true,
      revelationFired: false,
    });
    s.sight = 4;
    s.hand = ["blot_herald"];
    applyIntent(s, { kind: "press", altitude: 1 });
    const afterPress = s.sight;
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "press_backlash")).toBe(true);
    expect(s.altitudes[1].enemy?.pressed).toBe(false);
    // backlash −1; turn mint may apply
    expect(s.sight).toBeLessThanOrEqual(afterPress);
  });
});
