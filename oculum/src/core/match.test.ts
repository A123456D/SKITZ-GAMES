import { describe, expect, it } from "vitest";
import { chooseAiMove } from "./ai";
import { applyIntent, applyMulligan, createMatch, legalIntents, takeEvents, unitPower } from "./match";

describe("oculum match", () => {
  it("starts with essence and sight on turn 1", () => {
    const s = createMatch({ seed: 1 });
    expect(s.turn).toBe(1);
    expect(s.essence).toBe(1);
    expect(s.sight).toBeGreaterThanOrEqual(1);
    expect(s.hand.length).toBe(4);
    expect(s.tutorialStep).toBe("done");
    expect(s.prophecies).toEqual([]);
  });

  it("opening mulligan returns selected cards and redraws the same count", () => {
    const s = createMatch({ seed: 77 });
    const beforeHand = [...s.hand];
    const beforeDeck = s.deck.length;
    expect(beforeHand.length).toBe(4);
    const drawn = applyMulligan(s, [0, 2]);
    expect(drawn.length).toBe(2);
    expect(s.hand.length).toBe(4);
    // Kept cards stay; returned indices 0 and 2 are gone from those positions
    expect(s.hand).not.toEqual(beforeHand);
    expect(s.deck.length).toBe(beforeDeck);
    // Returned cards are somewhere in the shuffled library (or redrawn back)
    const pool = [...s.hand, ...s.deck];
    expect(pool).toContain(beforeHand[0]);
    expect(pool).toContain(beforeHand[2]);
  });

  it("opening mulligan with empty selection is a no-op", () => {
    const s = createMatch({ seed: 78 });
    const hand = [...s.hand];
    const deck = [...s.deck];
    expect(applyMulligan(s, [])).toEqual([]);
    expect(s.hand).toEqual(hand);
    expect(s.deck).toEqual(deck);
  });

  it("emits draw events from beginTurn", () => {
    const s = createMatch({ seed: 3 });
    const opening = takeEvents(s);
    expect(opening.some((e) => e.type === "draw" && e.side === "player" && e.to === "hand")).toBe(
      true,
    );
    expect(opening.some((e) => e.type === "turn" && e.side === "player")).toBe(true);
  });

  it("can play Blot Herald and witness", () => {
    const s = createMatch({ seed: 42 });
    s.hand = ["blot_herald", "pale_ledger", "well_cantor"];
    s.essence = 5;
    s.sight = 5;
    const play = legalIntents(s).find(
      (i) => i.kind === "play" && i.handIndex === 0 && i.altitude === 1,
    );
    expect(play).toBeTruthy();
    applyIntent(s, play!);
    expect(s.altitudes[1].player?.cardId).toBe("blot_herald");
    expect(s.altitudes[1].player?.veiled).toBe(true);
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].player?.veiled).toBe(false);
    expect(unitPower(s, 1, "player")).toBe(3);
  });

  it("enemy gets a full beginTurn after player passes", () => {
    const s = createMatch({ seed: 3 });
    s.essence = 0;
    applyIntent(s, { kind: "pass" });
    expect(s.active).toBe("enemy");
    expect(s.enemyEssence).toBe(1);
    expect(s.enemySight).toBeGreaterThanOrEqual(1);
  });

  it("Stained Veiled loser Forced Exposed on Resolve", () => {
    const s = createMatch({ seed: 11 });
    s.altitudes[1].player = {
      instanceId: "p",
      cardId: "smother_bride",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
      strained: false,
      stained: false,
      revelationFired: true,
      scrutiny: 0,
      wagered: false,
      wagerAntePaid: false,
      wagerAnteFavor: false,
      openedSinceResolve: false,
      lastBreachOpened: false,
      pressed: false,
      pressedBy: null,
    };
    s.altitudes[1].enemy = {
      instanceId: "e",
      cardId: "blot_herald",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
      strained: false,
      stained: true,
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
    s.passed.player = true;
    s.active = "enemy";
    applyIntent(s, { kind: "pass" });
    expect(s.altitudes[1].enemy?.veiled).toBe(false);
    expect(s.altitudes[1].enemy?.strained).toBe(true);
  });

  it("Re-Veil costs Sight and does not re-fire Revelation", () => {
    const s = createMatch({ seed: 21 });
    s.hand = ["blot_herald"];
    s.essence = 5;
    s.sight = 4;
    applyIntent(s, { kind: "play", handIndex: 0, altitude: 1 });
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].player?.revelationFired).toBe(true);
    expect(s.altitudes[1].player?.veiled).toBe(false);
    const sightAfter = s.sight;
    applyIntent(s, { kind: "reveil", altitude: 1 });
    expect(s.altitudes[1].player?.veiled).toBe(true);
    expect(s.altitudes[1].player?.revelationFired).toBe(true);
    expect(s.sight).toBe(sightAfter - 1);
  });

  it("Overwrite bounces own figure to hand", () => {
    const s = createMatch({ seed: 22 });
    s.hand = ["blot_herald", "pale_ledger"];
    s.essence = 5;
    applyIntent(s, { kind: "play", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].player?.cardId).toBe("blot_herald");
    applyIntent(s, { kind: "play", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].player?.cardId).toBe("pale_ledger");
    expect(s.hand).toContain("blot_herald");
  });

  it("Veiled loser Holds on Resolve", () => {
    const s = createMatch({ seed: 23 });
    s.altitudes[1].player = {
      instanceId: "p",
      cardId: "smother_bride",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
      strained: false,
      stained: false,
      revelationFired: true,
      scrutiny: 0,
      wagered: false,
      wagerAntePaid: false,
      wagerAnteFavor: false,
      openedSinceResolve: false,
      lastBreachOpened: false,
      pressed: false,
      pressedBy: null,
    };
    s.altitudes[1].enemy = {
      instanceId: "e",
      cardId: "pale_ledger",
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
    s.passed.player = true;
    s.active = "enemy";
    applyIntent(s, { kind: "pass" });
    expect(s.altitudes[1].enemy?.veiled).toBe(true);
    expect(s.altitudes[1].enemy).not.toBeNull();
  });

  it("Witnessed loser Falls on Resolve", () => {
    const s = createMatch({ seed: 24 });
    s.altitudes[1].player = {
      instanceId: "p",
      cardId: "smother_bride",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
      strained: false,
      stained: false,
      revelationFired: true,
      scrutiny: 0,
      wagered: false,
      wagerAntePaid: false,
      wagerAnteFavor: false,
      openedSinceResolve: false,
      lastBreachOpened: false,
      pressed: false,
      pressedBy: null,
    };
    s.altitudes[1].enemy = {
      instanceId: "e",
      cardId: "pale_ledger",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
      strained: false,
      stained: false,
      revelationFired: true,
      scrutiny: 0,
      wagered: false,
      wagerAntePaid: false,
      wagerAnteFavor: false,
      openedSinceResolve: false,
      lastBreachOpened: false,
      pressed: false,
      pressedBy: null,
    };
    s.passed.player = true;
    s.active = "enemy";
    const ev = applyIntent(s, { kind: "pass" });
    expect(s.altitudes[1].enemy).toBeNull();
    expect(ev.some((e) => e.type === "fall" && e.side === "enemy")).toBe(true);
  });

  it("AI can choose a move on opening board", () => {
    const s = createMatch({ seed: 8 });
    s.active = "enemy";
    const move = chooseAiMove(s);
    expect(move).toBeTruthy();
  });

  it("Bellward AI Witnesses its own Veiled figure instead of Passing", () => {
    const s = createMatch({ seed: 91 });
    s.active = "enemy";
    s.enemySight = 4;
    s.enemyEssence = 0;
    s.enemyHand = [];
    s.altitudes[1].enemy = {
      instanceId: "t1",
      cardId: "bell_siren",
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
    // Many seeds: Witness should beat Pass
    let witnessed = 0;
    for (let i = 0; i < 20; i++) {
      const move = chooseAiMove(s);
      if (move.kind === "witness" && !move.enemy && move.altitude === 1) witnessed += 1;
    }
    expect(witnessed).toBeGreaterThanOrEqual(18);
  });

  it("Bellward AI Gazes a Motley Stance B wall that is winning the lane", () => {
    const s = createMatch({ seed: 92 });
    s.active = "enemy";
    s.enemySight = 5;
    s.enemyEssence = 0;
    s.enemyHand = [];
    // Toll on High opens Bellward Gaze there
    s.tollOwner[0] = "enemy";
    s.altitudes[0].enemy = {
      instanceId: "t3",
      cardId: "bell_debt_walker",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
      strained: false,
      stained: false,
      revelationFired: true,
      scrutiny: 0,
      wagered: false,
      wagerAntePaid: false,
      wagerAnteFavor: false,
      openedSinceResolve: false,
      lastBreachOpened: false,
      pressed: false,
      pressedBy: null,
    };
    s.altitudes[0].player = {
      instanceId: "m2",
      cardId: "scarlet_dealer",
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
    let gazed = 0;
    for (let i = 0; i < 20; i++) {
      const move = chooseAiMove(s);
      if (move.kind === "witness" && move.enemy && move.altitude === 0) gazed += 1;
    }
    expect(gazed).toBeGreaterThanOrEqual(15);
  });
});
