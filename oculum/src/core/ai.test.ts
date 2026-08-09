import { describe, expect, it } from "vitest";
import { chooseAiMove } from "./ai";
import { teachDeck } from "./cards";
import { createMatch, legalIntents } from "./match";
import { pickAiOpponentDeck } from "./decks";
import { validateConstructedDeck } from "./construct";

describe("AI", () => {
  it("pickAiOpponentDeck returns a legal craft deck", () => {
    const deck = pickAiOpponentDeck(5, teachDeck());
    expect(validateConstructedDeck(deck).ok).toBe(true);
  });

  it("chooseAiMove returns a legal intent", () => {
    const s = createMatch({ seed: 3 });
    s.active = "enemy";
    s.enemyHand = ["blot_herald", "pale_ledger"];
    s.enemyEssence = 5;
    const move = chooseAiMove(s);
    const legal = legalIntents(s);
    expect(legal.some((i) => JSON.stringify(i) === JSON.stringify(move))).toBe(true);
  });

  it("prefers Gazing Motley Wager / Lady Masque over Pass when Sight is up", () => {
    const s = createMatch({ seed: 11, aiDifficulty: "hard" });
    s.active = "player";
    s.sight = 4;
    s.essence = 0;
    s.hand = [];
    s.enemyEclipse = 3;
    // Toll-owned lane opens Gaze (Bellward)
    s.tollOwner[0] = "player";
    s.altitudes[0].enemy = {
      instanceId: "lm",
      cardId: "lady_masque",
      veiled: true,
      hybridSite: false,
      stanceB: true,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
      strained: false,
      stained: false,
      revelationFired: false,
      scrutiny: 0,
      wagered: true,
      wagerAntePaid: true,
      wagerAnteFavor: false,
      openedSinceResolve: false,
      lastBreachOpened: false,
      pressed: false,
      pressedBy: null,
    };
    const legal = legalIntents(s);
    expect(legal.some((i) => i.kind === "witness" && i.enemy && i.altitude === 0)).toBe(true);
    let gazes = 0;
    for (let i = 0; i < 20; i++) {
      const move = chooseAiMove(s);
      if (move.kind === "witness" && move.enemy && move.altitude === 0) gazes += 1;
    }
    expect(gazes).toBeGreaterThanOrEqual(15);
  });

  it("does not dump Ashen Tithe when no enemy is Stained", () => {
    const s = createMatch({ seed: 42, aiDifficulty: "normal" });
    s.active = "enemy";
    s.enemyEssence = 3;
    s.enemySight = 0;
    s.enemyHand = ["ashen_tithe"];
    s.altitudes[1].enemy = {
      instanceId: "e1",
      cardId: "mire_duelist",
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
    };
    s.altitudes[1].player = {
      instanceId: "p1",
      cardId: "blot_herald",
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
    };
    let rites = 0;
    for (let i = 0; i < 25; i++) {
      const move = chooseAiMove(s);
      if (move.kind === "rite") rites += 1;
    }
    expect(rites).toBe(0);
  });
});
