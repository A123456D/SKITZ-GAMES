import { describe, expect, it } from "vitest";
import { chooseAiMove } from "./ai";
import { teachDeck } from "./cards";
import { applyIntent, createMatch, legalIntents } from "./match";
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
      // Heuristic + 2-ply both must refuse dead Tithe
      const move = chooseAiMove(s);
      if (move.kind === "rite") rites += 1;
    }
    expect(rites).toBe(0);
  });

  it("spreads figures across lanes instead of stacking one altitude per window", () => {
    const s = createMatch({ seed: 77, aiDifficulty: "hard" });
    s.active = "enemy";
    s.enemyEssence = 9;
    s.enemySight = 0;
    s.enemyHand = ["bell_debt_walker", "path_bellman", "clapper_cantor"];
    s.altitudes[0].enemy = null;
    s.altitudes[1].enemy = null;
    s.altitudes[2].enemy = null;

    const playedAlts: number[] = [];
    for (let step = 0; step < 3 && s.active === "enemy"; step++) {
      const move = chooseAiMove(s);
      if (move.kind !== "play") break;
      playedAlts.push(move.altitude);
      applyIntent(s, move);
    }

    expect(playedAlts.length).toBeGreaterThanOrEqual(2);
    expect(new Set(playedAlts).size).toBe(playedAlts.length);
  });

  it("hard prefers Sound the Toll before dumping Toll figures with no Tolls down", () => {
    const s = createMatch({ seed: 55, aiDifficulty: "hard" });
    s.active = "enemy";
    s.enemyEssence = 4;
    s.enemyHand = ["sound_the_toll", "bell_debt_walker", "path_bellman"];
    s.tollOwner = [null, null, null];

    let soundFirst = 0;
    for (let i = 0; i < 30; i++) {
      const trial = createMatch({ seed: 55 + i, aiDifficulty: "hard" });
      trial.active = "enemy";
      trial.enemyEssence = 4;
      trial.enemyHand = ["sound_the_toll", "bell_debt_walker", "path_bellman"];
      trial.tollOwner = [null, null, null];
      const move = chooseAiMove(trial);
      if (move.kind === "rite" && trial.enemyHand[move.handIndex] === "sound_the_toll") soundFirst += 1;
    }
    expect(soundFirst).toBeGreaterThanOrEqual(24);
    void s;
  });

  it("hard Motley Wagers when Stance B and Favor are armed", () => {
    let wagers = 0;
    for (let i = 0; i < 25; i++) {
      const s = createMatch({ seed: 300 + i, aiDifficulty: "hard" });
      s.active = "enemy";
      s.enemyEssence = 0;
      s.enemySight = 2;
      s.enemyHand = [];
      s.enemyFavor = 2;
      s.enemyEclipse = 4;
      s.wagerUsed.enemy = false;
      s.stanceUsed.enemy = true;
      s.altitudes[1].enemy = {
        instanceId: "m1",
        cardId: "whitecard_mummer",
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
        wagered: false,
        wagerAntePaid: false,
        wagerAnteFavor: false,
        openedSinceResolve: false,
        lastBreachOpened: false,
        pressed: false,
        pressedBy: null,
      };
      const move = chooseAiMove(s);
      if (move.kind === "wager" && move.altitude === 1) wagers += 1;
    }
    expect(wagers).toBeGreaterThanOrEqual(20);
  });

  it("hard Ink Presses a stained Motley Stance-B lane when winning", () => {
    let presses = 0;
    for (let i = 0; i < 25; i++) {
      const s = createMatch({ seed: 400 + i, aiDifficulty: "hard" });
      s.active = "enemy";
      s.enemyEssence = 0;
      s.enemySight = 2;
      s.enemyHand = [];
      s.pressUsed.enemy = false;
      s.craftKits.enemy = ["ink"];
      s.altitudes[1].enemy = {
        instanceId: "ink1",
        cardId: "blot_herald",
        veiled: false,
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
        instanceId: "mot1",
        cardId: "whitecard_mummer",
        veiled: true,
        hybridSite: false,
        stanceB: true,
        grafts: [],
        inhabitant: null,
        hasThirdFace: false,
        strained: false,
        stained: true,
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
      expect(legal.some((x) => x.kind === "press" && x.altitude === 1)).toBe(true);
      const move = chooseAiMove(s);
      if (move.kind === "press" && move.altitude === 1) presses += 1;
    }
    expect(presses).toBeGreaterThanOrEqual(20);
  });

  it("hard Breach Opens a veiled Breach figure instead of Pass", () => {
    let opens = 0;
    for (let i = 0; i < 25; i++) {
      const s = createMatch({ seed: 500 + i, aiDifficulty: "hard" });
      s.active = "enemy";
      s.enemyEssence = 0;
      s.enemySight = 3;
      s.enemyHand = [];
      s.craftKits.enemy = ["breach"];
      s.altitudes[0].enemy = {
        instanceId: "br1",
        cardId: "highscar_lancer",
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
      const move = chooseAiMove(s);
      if (move.kind === "witness" && !move.enemy && move.altitude === 0) opens += 1;
    }
    expect(opens).toBeGreaterThanOrEqual(20);
  });
});
