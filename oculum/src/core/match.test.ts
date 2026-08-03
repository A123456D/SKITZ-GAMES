import { describe, expect, it } from "vitest";
import { applyIntent, altitudeHasGaze, createMatch, legalIntents, unitPower } from "./match";

describe("oculum match", () => {
  it("starts with essence and sight on turn 1", () => {
    const s = createMatch({ seed: 1 });
    expect(s.turn).toBe(1);
    expect(s.essence).toBe(1);
    expect(s.sight).toBeGreaterThanOrEqual(1);
    expect(s.hand.length).toBe(4);
    expect(s.tutorialStep).toBe("done");
    expect(s.prophecies).toContain("unblinking_law");
    expect(s.enemyProphecies).toContain("unblinking_law");
  });

  it("can play cliff seeker and witness", () => {
    const s = createMatch({ seed: 42 });
    s.hand = ["cliff_seeker", "veil_banner", "ace_of_hollows"];
    s.essence = 5;
    s.sight = 5;
    const play = legalIntents(s).find(
      (i) => i.kind === "play" && i.handIndex === 0 && i.altitude === 1,
    );
    expect(play).toBeTruthy();
    applyIntent(s, play!);
    expect(s.altitudes[1].player?.cardId).toBe("cliff_seeker");
    expect(s.altitudes[1].player?.veiled).toBe(true);
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].player?.veiled).toBe(false);
    expect(unitPower(s, 1, "player")).toBe(2);
  });

  it("veil banner buffs veiled figure on same altitude", () => {
    const s = createMatch({ seed: 7 });
    s.hand = ["cliff_seeker", "veil_banner"];
    s.essence = 5;
    applyIntent(s, { kind: "play", handIndex: 0, altitude: 1 });
    applyIntent(s, { kind: "play", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].playerSite).toBe("veil_banner");
    expect(unitPower(s, 1, "player")).toBe(2);
  });

  it("tutorial guides full First Gaze curriculum", () => {
    const s = createMatch({ seed: 9, tutorial: true });
    expect(s.tutorialStep).toBe("intro");
    expect(legalIntents(s).every((i) => i.kind === "pass")).toBe(true);
    applyIntent(s, { kind: "pass" });
    expect(s.tutorialStep).toBe("goal");
    expect(s.active).toBe("player");
    applyIntent(s, { kind: "pass" });
    expect(s.tutorialStep).toBe("play");
    expect(s.hand[0]).toBe("cliff_seeker");
    expect(legalIntents(s).every((i) => i.kind === "play" && i.altitude === 1)).toBe(true);
    applyIntent(s, { kind: "play", handIndex: 0, altitude: 1 });
    expect(s.tutorialStep).toBe("site");
    applyIntent(s, { kind: "play", handIndex: 0, altitude: 1 });
    expect(s.tutorialStep).toBe("witness");
    expect(s.altitudes[1].playerSite).toBe("veil_banner");
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.tutorialStep).toBe("graft");
    applyIntent(s, { kind: "graft", handIndex: 0, altitude: 1 });
    expect(s.tutorialStep).toBe("gaze");
    expect(s.altitudes[0].playerSite).toBe("ring_gaze");
    applyIntent(s, { kind: "witness", altitude: 0, enemy: true });
    expect(s.tutorialStep).toBe("stance");
    applyIntent(s, { kind: "stance", altitude: 1 });
    expect(s.tutorialStep).toBe("rite");
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.tutorialStep).toBe("law");
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.tutorialStep).toBe("resolve");
    expect(legalIntents(s).every((i) => i.kind === "pass")).toBe(true);
    applyIntent(s, { kind: "pass" });
    expect(s.tutorialStep).toBe("done");
    expect(s.active).toBe("enemy");
  });

  it("enemy gets a full beginTurn after player passes", () => {
    const s = createMatch({ seed: 3 });
    s.enemyEssence = 0;
    s.enemySight = 0;
    s.enemyHand = ["cliff_seeker"];
    s.enemyDeck = ["veil_banner", "root_chassis"];
    const beforeHand = s.enemyHand.length;
    applyIntent(s, { kind: "pass" });
    expect(s.active).toBe("enemy");
    expect(s.passed.player).toBe(true);
    expect(s.passed.enemy).toBe(false);
    expect(s.enemyEssence).toBe(1);
    expect(s.enemySight).toBeGreaterThanOrEqual(1);
    expect(s.enemyHand.length).toBe(beforeHand + 1);
  });

  it("stance swaps veiled/witnessed power via Third Face", () => {
    const s = createMatch({ seed: 11 });
    s.hand = ["cliff_seeker", "third_face"];
    s.essence = 5;
    applyIntent(s, { kind: "play", handIndex: 0, altitude: 1 });
    applyIntent(s, { kind: "play", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].playerSite).toBe("third_face");
    expect(s.altitudes[1].player?.hasThirdFace).toBe(true);
    expect(unitPower(s, 1, "player")).toBe(1);
    applyIntent(s, { kind: "stance", altitude: 1 });
    expect(s.altitudes[1].player?.stanceB).toBe(true);
    expect(unitPower(s, 1, "player")).toBe(2);
  });

  it("depth matron freely witnesses other veiled figures", () => {
    const s = createMatch({ seed: 13 });
    s.hand = [];
    s.essence = 0;
    s.sight = 5;
    s.altitudes[0].player = {
      instanceId: "a",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].player = {
      instanceId: "b",
      cardId: "depth_matron",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].player?.veiled).toBe(false);
    expect(s.altitudes[0].player?.veiled).toBe(false);
    // Free-Witness no longer fires Cliff Seeker Revelation (+1 Sight)
    expect(s.sight).toBe(2); // paid 3 for Matron
  });

  it("unblinking law grants eclipse when three schools witnessed", () => {
    const s = createMatch({ seed: 17 });
    s.prophecies = ["unblinking_law"];
    s.eclipse = 0;
    s.sight = 10;
    s.altitudes[0].player = {
      instanceId: "a",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].player = {
      instanceId: "b",
      cardId: "root_chassis",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[2].player = {
      instanceId: "c",
      cardId: "depth_matron",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 0 });
    applyIntent(s, { kind: "witness", altitude: 1 });
    // Depth Matron also free-witnesses others (already witnessed) — schools: cube, graft, deep
    applyIntent(s, { kind: "witness", altitude: 2 });
    const events = applyIntent(s, { kind: "pass" });
    expect(s.eclipse).toBe(2);
    expect(events.some((e) => e.type === "law" && e.eclipseGain === 2)).toBe(true);
  });

  it("stake field pilgrim gains eclipse when altitude is clear", () => {
    const s = createMatch({ seed: 21 });
    s.eclipse = 0;
    s.sight = 3;
    s.altitudes[1].player = {
      instanceId: "p",
      cardId: "stake_field_pilgrim",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.eclipse).toBe(1);
  });

  it("parasol path and perforated abbess grant gaze", () => {
    const s = createMatch({ seed: 22 });
    s.altitudes[0].playerSite = "parasol_path";
    expect(altitudeHasGaze(s, 0, "player")).toBe(true);
    s.altitudes[1].player = {
      instanceId: "a",
      cardId: "perforated_abbess",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(altitudeHasGaze(s, 1, "player")).toBe(true);
  });
});
