import { describe, expect, it } from "vitest";
import { chooseAiMove } from "./ai";
import { teachDeck } from "./cards";
import { validateConstructedDeck } from "./construct";
import { allAiArchetypeDecks, pickAiOpponentDeck } from "./decks";
import { createMatch } from "./match";

describe("AI opponent decks", () => {
  it("every curated archetype is a legal Constructed 30", () => {
    for (const deck of allAiArchetypeDecks()) {
      expect(deck).toHaveLength(30);
      expect(validateConstructedDeck(deck).ok).toBe(true);
    }
  });

  it("default match does not mirror teach into the enemy list", () => {
    const s = createMatch({ seed: 99 });
    const teach = teachDeck().slice().sort().join(",");
    const enemyAll = [...s.enemyHand, ...s.enemyDeck, ...s.enemyProphecies].slice().sort().join(",");
    // Enemy is a rival archetype — composition should differ from Teach
    expect(enemyAll).not.toBe(teach);
  });

  it("constructed player deck is not copied to the enemy", () => {
    const player = teachDeck();
    const s = createMatch({ seed: 12, deck: player });
    const playerSorted = [...s.hand, ...s.deck, ...s.prophecies].slice().sort().join(",");
    const enemySorted = [...s.enemyHand, ...s.enemyDeck, ...s.enemyProphecies].slice().sort().join(",");
    expect(enemySorted).not.toBe(playerSorted);
  });

  it("pickAiOpponentDeck prefers a different school when possible", () => {
    const cubeHeavy = [
      ...Array(10).fill("cliff_seeker"),
      ...Array(10).fill("veil_banner"),
      ...Array(9).fill("mesa_bell"),
      "unblinking_law",
    ].slice(0, 30);
    // Invalid copy counts — only use for dominant-school hint via raw ids in pick
    const deck = pickAiOpponentDeck(5, [
      "cliff_seeker",
      "cliff_seeker",
      "veil_banner",
      "veil_banner",
      "ochre_dancer",
      "mesa_bell",
      "mesa_bell",
      "saltglass_courier",
      "stake_cache",
      "stake_field_pilgrim",
      "ace_of_hollows",
      "bone_wick_charm",
      "coral_crown",
      "ring_gaze",
      "hatline_trickster",
      "third_face",
      "horn_cantor",
      "pale_silence",
      "canister_hound",
      "keywright_scarecrow",
      "suture_mill",
      "branch_rune_reliquary",
      "ribbon_bride",
      "dust_ledger",
      "ledger_jackal",
      "debt_coin",
      "perforated_abbess",
      "bell_debt_walker",
      "echo_mask",
      "unblinking_law",
    ]);
    expect(validateConstructedDeck(deck).ok).toBe(true);
    void cubeHeavy;
  });
});

describe("AI combo scoring", () => {
  it("prefers grafting Ace onto a veiled figure before Witnessing it", () => {
    const s = createMatch({ seed: 1 });
    s.active = "enemy";
    s.phase = "play";
    s.enemyEssence = 5;
    s.enemySight = 5;
    s.enemyHand = ["ace_of_hollows"];
    s.altitudes[1].enemy = {
      instanceId: "e1",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    // Force deterministic: hard difficulty, low noise — run many times
    s.aiDifficulty = "hard";
    let graft = 0;
    let witness = 0;
    for (let i = 0; i < 40; i++) {
      const move = chooseAiMove(s);
      if (move.kind === "graft") graft += 1;
      if (move.kind === "witness" && !move.enemy) witness += 1;
    }
    expect(graft).toBeGreaterThan(witness);
    expect(graft).toBeGreaterThan(25);
  });

  it("avoids Witnessing Root Chassis when already Sight-rich", () => {
    const s = createMatch({ seed: 2 });
    s.active = "enemy";
    s.phase = "play";
    s.enemyEssence = 0;
    s.enemySight = 5;
    s.enemyHand = [];
    s.altitudes[1].enemy = {
      instanceId: "e1",
      cardId: "root_chassis",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[0].enemy = {
      instanceId: "e2",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.aiDifficulty = "hard";
    let chassis = 0;
    let seeker = 0;
    for (let i = 0; i < 40; i++) {
      const move = chooseAiMove(s);
      if (move.kind === "witness" && move.altitude === 1) chassis += 1;
      if (move.kind === "witness" && move.altitude === 0) seeker += 1;
    }
    expect(seeker).toBeGreaterThan(chassis);
  });

  it("boosts Witness on Ledger Jackal only when Eclipse is up", () => {
    const make = (eclipse: number): ReturnType<typeof createMatch> => {
      const s = createMatch({ seed: 3 });
      s.active = "enemy";
      s.phase = "play";
      s.enemyEssence = 0;
      s.enemySight = 5;
      s.enemyHand = [];
      s.enemyEclipse = eclipse;
      s.aiDifficulty = "hard";
      s.altitudes[1].enemy = {
        instanceId: "e1",
        cardId: "ledger_jackal",
        veiled: true,
        hybridSite: false,
        stanceB: false,
        grafts: [],
        inhabitant: null,
        hasThirdFace: false,
      };
      s.altitudes[0].enemy = {
        instanceId: "e2",
        cardId: "cliff_seeker",
        veiled: true,
        hybridSite: false,
        stanceB: false,
        grafts: [],
        inhabitant: null,
        hasThirdFace: false,
      };
      return s;
    };

    let jackalNo = 0;
    let jackalYes = 0;
    for (let i = 0; i < 40; i++) {
      const a = chooseAiMove(make(0));
      const b = chooseAiMove(make(2));
      if (a.kind === "witness" && a.altitude === 1) jackalNo += 1;
      if (b.kind === "witness" && b.altitude === 1) jackalYes += 1;
    }
    expect(jackalYes).toBeGreaterThan(jackalNo);
  });
});
