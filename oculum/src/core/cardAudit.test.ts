import { describe, expect, it } from "vitest";
import { CARDS, getCard } from "./cards";
import {
  altitudeHasGaze,
  applyIntent,
  createMatch,
  legalIntents,
  sightIncome,
  unitPower,
} from "./match";

describe("card text ↔ rules audit", () => {
  it("every card id is unique and loadable", () => {
    const ids = CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getCard(id).id).toBe(id);
  });

  it("veil banner / branch rune power auras", () => {
    const s = createMatch({ seed: 1 });
    s.altitudes[1].player = {
      instanceId: "u",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].playerSite = "veil_banner";
    expect(unitPower(s, 1, "player")).toBe(2); // 1 + banner
    s.altitudes[1].player!.veiled = false;
    s.altitudes[1].playerSite = "branch_rune_reliquary";
    expect(unitPower(s, 1, "player")).toBe(3); // 2 + reliquary
  });

  it("ace graft: +1 power when witnessed and draw on witness", () => {
    const s = createMatch({ seed: 2 });
    s.sight = 5;
    s.hand = ["veil_banner"];
    s.deck = ["hole_choir"];
    s.altitudes[1].player = {
      instanceId: "u",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [{ instanceId: "g", cardId: "ace_of_hollows" }],
      inhabitant: null,
      hasThirdFace: false,
    };
    const before = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(unitPower(s, 1, "player")).toBe(3); // 2 + ace
    expect(s.hand.length).toBe(before + 1);
  });

  it("coral crown grants gaze and +1 when witnessed", () => {
    const s = createMatch({ seed: 3 });
    s.altitudes[0].player = {
      instanceId: "u",
      cardId: "cliff_seeker",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [{ instanceId: "g", cardId: "coral_crown" }],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(altitudeHasGaze(s, 0, "player")).toBe(true);
    expect(unitPower(s, 0, "player")).toBe(3);
  });

  it("third face stance once per action window", () => {
    const s = createMatch({ seed: 4 });
    s.altitudes[1].player = {
      instanceId: "u",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: true,
    };
    s.altitudes[1].playerSite = "third_face";
    expect(legalIntents(s).some((i) => i.kind === "stance" && i.altitude === 1)).toBe(true);
    applyIntent(s, { kind: "stance", altitude: 1 });
    expect(s.altitudes[1].player!.stanceB).toBe(true);
    expect(legalIntents(s).some((i) => i.kind === "stance")).toBe(false);
  });

  it("ring gaze / parasol path high sight is +2 from site+High bonus", () => {
    const s = createMatch({ seed: 6 });
    for (const slot of s.altitudes) {
      slot.player = null;
      slot.enemy = null;
      slot.playerSite = null;
      slot.enemySite = null;
    }
    expect(sightIncome(s, "player")).toBe(1);
    s.altitudes[1].playerSite = "ring_gaze";
    expect(sightIncome(s, "player")).toBe(2); // base 1 + site 1
    s.altitudes[1].playerSite = null;
    s.altitudes[0].playerSite = "parasol_path";
    expect(sightIncome(s, "player")).toBe(3); // base 1 + site 1 + High 1 = printed +2 on High vs mid
  });
  it("hole choir blinds and draws", () => {
    const s = createMatch({ seed: 7 });
    s.essence = 5;
    s.hand = ["hole_choir"];
    s.deck = ["veil_banner"];
    const before = s.hand.length;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 0 });
    expect(s.altitudes[0].blinded).toBe(true);
    expect(s.hand.length).toBe(before); // spent choir, drew 1 → same count
  });

  it("wave2 revelations: pilgrim, keywright, vanguard, abbess gaze", () => {
    const s = createMatch({ seed: 8 });
    s.sight = 4;
    s.eclipse = 0;
    s.hand = ["veil_banner"];
    s.deck = ["hole_choir", "ace_of_hollows"];
    s.altitudes[1].playerSite = "veil_banner";
    s.altitudes[1].player = {
      instanceId: "k",
      cardId: "keywright_scarecrow",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const handBefore = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.hand.length).toBe(handBefore + 1);
    expect(s.sight).toBe(4 - 2 + 1); // pay 2, Site bonus +1 Sight

    s.altitudes[2].player = {
      instanceId: "p",
      cardId: "stake_field_pilgrim",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.eclipse).toBe(1);

    s.altitudes[0].player = {
      instanceId: "v",
      cardId: "ochre_vanguard",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.eclipse).toBe(2);

    s.altitudes[0].player = {
      instanceId: "a",
      cardId: "perforated_abbess",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(altitudeHasGaze(s, 0, "player")).toBe(true);
  });

  it("wave3: pale silence blinds; ledger jackal draws on eclipse; iris gaze", () => {
    const s = createMatch({ seed: 30 });
    s.essence = 5;
    s.hand = ["pale_silence"];
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].blinded).toBe(true);

    s.sight = 5;
    s.eclipse = 1;
    s.hand = ["veil_banner"];
    s.deck = ["hole_choir"];
    s.altitudes[0].player = {
      instanceId: "j",
      cardId: "ledger_jackal",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const before = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.hand.length).toBe(before + 1);

    s.altitudes[2].player = {
      instanceId: "i",
      cardId: "iris_heliograph",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(altitudeHasGaze(s, 2, "player")).toBe(true);
  });

  it("premium flag marks skin-ready rares (presentation gated off)", () => {
    const rares = CARDS.filter((c) => c.premium).map((c) => c.id).sort();
    expect(rares).toEqual(
      [
        "cutwork_sovereign",
        "ember_sovereign",
        "iris_heliograph",
        "millwright_colossus",
        "pillar_sovereign",
        "split_gaze_seraph",
        "stake_sovereign",
        "sunset_creditor",
        "verdant_cataract",
      ].sort(),
    );
  });

  it("iris: Gaze-Witness enemy grants Eclipse", () => {
    const s = createMatch({ seed: 40 });
    s.sight = 5;
    s.eclipse = 0;
    s.altitudes[1].player = {
      instanceId: "iris",
      cardId: "iris_heliograph",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].enemy = {
      instanceId: "foe",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(altitudeHasGaze(s, 1, "player")).toBe(true);
    applyIntent(s, { kind: "witness", altitude: 1, enemy: true });
    expect(s.altitudes[1].enemy!.veiled).toBe(false);
    expect(s.eclipse).toBe(1);
  });

  it("verdant: other Figures +1 power; Revelation Sight capped", () => {
    const s = createMatch({ seed: 41 });
    s.sight = 5;
    s.altitudes[0].player = {
      instanceId: "cat",
      cardId: "verdant_cataract",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].player = {
      instanceId: "seek",
      cardId: "cliff_seeker",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s, 1, "player")).toBe(2);
    const before = s.sight;
    applyIntent(s, { kind: "witness", altitude: 0 });
    // Cataract + Cliff Seeker witnessed = 2 Sight (includes self)
    expect(s.sight).toBe(before - 2 + 2);
    expect(unitPower(s, 1, "player")).toBe(3); // 2 + verdant aura
    expect(unitPower(s, 0, "player")).toBe(5); // self not buffed
  });

  it("seraph: flips other Figures only; Eclipse if 2+ Stance B", () => {
    const s = createMatch({ seed: 42 });
    s.sight = 5;
    s.eclipse = 0;
    s.altitudes[0].player = {
      instanceId: "seraph",
      cardId: "split_gaze_seraph",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].player = {
      instanceId: "a",
      cardId: "echo_mask",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[2].player = {
      instanceId: "b",
      cardId: "cliff_seeker",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.altitudes[0].player!.stanceB).toBe(false);
    expect(s.altitudes[1].player!.stanceB).toBe(true);
    expect(s.altitudes[2].player!.stanceB).toBe(true);
    expect(s.eclipse).toBe(1);
    expect(unitPower(s, 0, "player")).toBe(6);
  });

  it("wave4: courier High draw; cantor Site Eclipse; hound Graft draw; ink Blind; twinspoke Sight", () => {
    const s = createMatch({ seed: 50 });
    s.sight = 6;
    s.deck = ["hole_choir", "pale_silence", "veil_banner"];

    s.altitudes[0].player = {
      instanceId: "c",
      cardId: "saltglass_courier",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const handBefore = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.hand.length).toBe(handBefore + 1);

    s.eclipse = 0;
    s.altitudes[1].playerSite = "branch_rune_reliquary";
    s.altitudes[1].player = {
      instanceId: "p",
      cardId: "pillar_cantor",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.eclipse).toBe(1);

    s.altitudes[2].playerSite = "root_chassis" as never;
    // Graft site check via unit school instead
    s.altitudes[2].playerSite = null;
    s.altitudes[2].player = {
      instanceId: "h",
      cardId: "canister_hound",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    // another Graft figure already Witnessed on High
    s.altitudes[0].player = {
      instanceId: "g",
      cardId: "keywright_scarecrow",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const beforeHound = s.hand.length;
    // Hand may already be at cap from earlier draws — clear room
    s.hand = s.hand.slice(0, 2);
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.hand.length).toBe(3);

    s.altitudes[1].player = {
      instanceId: "i",
      cardId: "inkdrip_acolyte",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].blinded = false;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].blinded).toBe(true);

    s.sight = 2;
    s.stanceUsed.player = false;
    s.altitudes[2].playerSite = "twinspoke_banner";
    s.altitudes[2].player = {
      instanceId: "e",
      cardId: "echo_mask",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: true,
    };
    applyIntent(s, { kind: "stance", altitude: 2 });
    expect(s.sight).toBe(3);
  });

  it("wave5: school sites; bell gaze Sight; shard vessel Sight; ribbon Coral draw; sovereign Eclipse+veil aura", () => {
    const s = createMatch({ seed: 60 });
    s.sight = 5;
    s.deck = ["hole_choir", "pale_silence"];

    s.altitudes[1].playerSite = "dust_ledger";
    s.altitudes[1].player = {
      instanceId: "j",
      cardId: "ledger_jackal",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s, 1, "player")).toBe(4); // 3 + dust ledger

    s.altitudes[2].playerSite = "suture_mill";
    s.altitudes[2].player = {
      instanceId: "h",
      cardId: "canister_hound",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s, 2, "player")).toBe(4); // 2 + low + suture = wait low is alt 2 so +1 veiled = 3, +suture = 4

    s.altitudes[0].playerSite = "parasol_path";
    s.altitudes[0].player = {
      instanceId: "b",
      cardId: "bell_debt_walker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightBefore = s.sight;
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.sight).toBe(sightBefore - 1 + 1);

    s.altitudes[1].player = {
      instanceId: "v",
      cardId: "ash_lantern",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].playerSite = null;
    s.altitudes[2].player = {
      instanceId: "sp",
      cardId: "shard_pilgrim",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[2].playerSite = null;
    const sight2 = s.sight;
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.sight).toBe(sight2 - 1 + 1);

    s.essence = 3;
    s.hand = ["ribbon_tithe"];
    s.altitudes[0].playerSite = "branch_rune_reliquary";
    const handBefore = s.hand.length;
    // deck may be empty — refill
    s.deck = ["veil_banner"];
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].blinded).toBe(true);
    expect(s.hand.length).toBe(handBefore); // spent rite, drew 1 → same length

    s.eclipse = 0;
    s.sight = 5;
    s.altitudes[0].player = {
      instanceId: "sov",
      cardId: "stake_sovereign",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[0].playerSite = null;
    s.altitudes[1].player = {
      instanceId: "seek",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s, 1, "player")).toBe(1);
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.eclipse).toBe(1);
    expect(unitPower(s, 1, "player")).toBe(2); // veiled + sovereign aura
  });

  it("wave6: abyss Deep site; stake cache Sight; hornchain Stance; creditor Eclipse+draw", () => {
    const s = createMatch({ seed: 70 });
    s.sight = 5;
    s.deck = ["hole_choir", "veil_banner"];

    s.altitudes[1].playerSite = "abyss_cairn";
    s.altitudes[1].player = {
      instanceId: "m",
      cardId: "mire_debtor",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s, 1, "player")).toBe(4); // 3 + abyss

    s.altitudes[0].playerSite = "stake_cache";
    s.altitudes[0].player = {
      instanceId: "c",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sight0 = s.sight;
    applyIntent(s, { kind: "witness", altitude: 0 });
    // witness cost 1 + cliff seeker +1 + stake cache +1
    expect(s.sight).toBe(sight0 - 1 + 1 + 1);

    s.altitudes[2].player = {
      instanceId: "h",
      cardId: "hornchain_debtor",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[2].playerSite = null;
    const sightH = s.sight;
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.altitudes[2].player!.stanceB).toBe(true);
    expect(s.sight).toBe(sightH - 2 + 1);

    s.eclipse = 1;
    s.hand = s.hand.slice(0, 2);
    s.altitudes[1].playerSite = null;
    s.altitudes[1].player = {
      instanceId: "sc",
      cardId: "sunset_creditor",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const handBefore = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.eclipse).toBe(2);
    expect(s.hand.length).toBe(handBefore + 1);
  });

  it("wave7: dancer Veil Banner draw; siren Gaze Sight; cutwork Blinds Low; wick Vessel draw", () => {
    const s = createMatch({ seed: 80 });
    s.sight = 6;
    s.deck = ["hole_choir", "pale_silence", "veil_banner"];
    s.hand = s.hand.slice(0, 2);

    s.altitudes[1].playerSite = "veil_banner";
    s.altitudes[1].player = {
      instanceId: "d",
      cardId: "ochre_dancer",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const hand0 = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.hand.length).toBe(hand0 + 1);

    s.altitudes[0].playerSite = "parasol_path";
    s.altitudes[0].player = {
      instanceId: "b",
      cardId: "bell_siren",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sight0 = s.sight;
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.sight).toBe(sight0 - 2 + 1); // cost 2, +1 gaze altitude

    s.altitudes[2].playerSite = null;
    s.altitudes[2].player = {
      instanceId: "c",
      cardId: "cutwork_widow",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[2].blinded = false;
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.altitudes[2].blinded).toBe(true);

    s.hand = s.hand.slice(0, 2);
    s.deck = ["veil_banner", "hole_choir"];
    s.sight = 5;
    s.altitudes[1].playerSite = null;
    s.altitudes[1].player = {
      instanceId: "v",
      cardId: "ash_lantern",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[0].player = {
      instanceId: "w",
      cardId: "wick_oracle",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[0].playerSite = null;
    const handW = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.sight).toBe(4); // 5 - 2 + 1
    expect(s.hand.length).toBe(handW + 1);
  });

  it("wave8: mask gallery Stance B; dusk tithe; shuttered edict; millwright aura", () => {
    const s = createMatch({ seed: 90 });
    s.sight = 5;
    s.deck = ["hole_choir", "veil_banner"];
    s.prophecies = ["shuttered_edict"];

    s.altitudes[1].playerSite = "mask_gallery";
    s.altitudes[1].player = {
      instanceId: "e",
      cardId: "echo_mask",
      veiled: false,
      hybridSite: false,
      stanceB: true,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s, 1, "player")).toBe(3); // stanceB wit uses veiled 2 → wait echo 2/3 stanceB: veiled3 wit2, witnessed so 2 + gallery 1 = 3

    s.essence = 3;
    s.eclipse = 1;
    s.hand = ["dusk_tithe"];
    const hand0 = s.hand.length;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 2 });
    expect(s.hand.length).toBe(hand0); // spent + drew
    expect(s.altitudes[2].blinded).toBe(false);

    s.hand = ["pale_silence"];
    s.essence = 2;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 2 });
    expect(s.altitudes[2].blinded).toBe(true);
    s.eclipse = 0;
    s.sight = 3;
    applyIntent(s, { kind: "pass" });
    expect(s.eclipse).toBe(1); // shuttered edict

    const s2 = createMatch({ seed: 91 });
    s2.sight = 5;
    s2.deck = ["hole_choir"];
    s2.hand = s2.hand.slice(0, 2);
    s2.altitudes[0].player = {
      instanceId: "m",
      cardId: "millwright_colossus",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s2.altitudes[1].player = {
      instanceId: "h",
      cardId: "canister_hound",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s2, 1, "player")).toBe(3);
    applyIntent(s2, { kind: "witness", altitude: 0 });
    expect(unitPower(s2, 1, "player")).toBe(4);
  });

  it("wave9: cutwork Gaze+Blind Mid; tablet other Coral Eclipse; depth bell Sight; bone gallery", () => {
    const s = createMatch({ seed: 100 });
    s.sight = 5;
    s.eclipse = 0;

    s.altitudes[0].player = {
      instanceId: "c",
      cardId: "cutwork_sovereign",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.altitudes[1].blinded).toBe(true);
    expect(altitudeHasGaze(s, 0, "player")).toBe(true);

    s.altitudes[1].playerSite = "branch_rune_reliquary";
    s.altitudes[1].blinded = false;
    s.altitudes[1].player = {
      instanceId: "t",
      cardId: "tablet_walker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.eclipse).toBe(1);

    s.essence = 3;
    s.hand = ["depth_bell"];
    s.altitudes[2].player = {
      instanceId: "m",
      cardId: "mire_debtor",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[2].playerSite = "abyss_cairn";
    const sight0 = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 0 });
    expect(s.sight).toBe(sight0 + 2); // mire + cairn

    s.altitudes[2].playerSite = "bone_gallery";
    s.altitudes[2].player = {
      instanceId: "ts",
      cardId: "tide_singer",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s, 2, "player")).toBe(4); // 3 + bone gallery
  });

  it("wave10: pillar Coral Sites Eclipse; ash Bone Gallery draw; face charm Stance; splice rite", () => {
    const s = createMatch({ seed: 110 });
    s.sight = 5;
    s.eclipse = 0;
    s.deck = ["hole_choir", "veil_banner"];
    s.hand = s.hand.slice(0, 2);

    s.altitudes[0].playerSite = "branch_rune_reliquary";
    s.altitudes[1].playerSite = null;
    // only one coral site in play
    s.altitudes[0].player = {
      instanceId: "p",
      cardId: "pillar_sovereign",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.eclipse).toBe(1);

    s.altitudes[1].playerSite = "bone_gallery";
    s.altitudes[1].player = {
      instanceId: "a",
      cardId: "ash_widow",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const hand0 = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.hand.length).toBe(hand0 + 1);

    s.altitudes[2].player = {
      instanceId: "e",
      cardId: "echo_mask",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [{ instanceId: "g1", cardId: "face_charm" }],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[2].playerSite = null;
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.altitudes[2].player!.stanceB).toBe(true);

    s.essence = 3;
    s.hand = ["splice_rite"];
    s.altitudes[0].playerSite = "suture_mill";
    const sight0 = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.sight).toBe(sight0 + 1);
    expect(s.altitudes[1].blinded).toBe(false);
  });

  it("wave11: ember Shell aura+Vessel Sight; arch Pale Arch draw; horn Stance B draw; stake tithe", () => {
    const s = createMatch({ seed: 120 });
    s.sight = 5;
    s.deck = ["hole_choir", "veil_banner"];
    s.hand = s.hand.slice(0, 2);

    s.altitudes[0].player = {
      instanceId: "e",
      cardId: "ember_sovereign",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].player = {
      instanceId: "v",
      cardId: "ash_lantern",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[2].player = {
      instanceId: "t",
      cardId: "tide_singer",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s, 2, "player")).toBe(3);
    const sight0 = s.sight;
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.sight).toBe(sight0 - 2 + 1); // one vessel
    expect(unitPower(s, 2, "player")).toBe(4);

    s.altitudes[1].playerSite = "pale_arch";
    s.altitudes[1].player = {
      instanceId: "a",
      cardId: "arch_debtor",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const hand0 = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.hand.length).toBe(hand0 + 1);

    s.essence = 3;
    s.hand = ["horn_tithe"];
    s.altitudes[2].player = {
      instanceId: "m",
      cardId: "echo_mask",
      veiled: false,
      hybridSite: false,
      stanceB: true,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const handH = s.hand.length;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 0 });
    expect(s.hand.length).toBe(handH); // spent + drew

    s.essence = 2;
    s.hand = ["stake_tithe"];
    s.altitudes[0].playerSite = "veil_banner";
    const sightT = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 2 });
    expect(s.sight).toBe(sightT + 1);
    expect(s.altitudes[2].blinded).toBe(false);
  });

  it("audit fixes: ribbon coral site board-wide; vessel release to hand; matron chain; pilgrim unit-block; stance/graft Figures", () => {
    const s = createMatch({ seed: 200 });
    s.sight = 6;
    s.hand = [];

    // Ribbon Bride: Coral Site on another altitude
    s.altitudes[0].playerSite = "branch_rune_reliquary";
    s.altitudes[1].player = {
      instanceId: "rb",
      cardId: "ribbon_bride",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightR = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.sight).toBe(sightR - 1 + 1);

    // Vessel release: Inhabitant returns to hand (lane occupied by vessel)
    s.hand = [];
    s.altitudes[2].player = {
      instanceId: "v",
      cardId: "ash_lantern",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: "cliff_seeker",
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.altitudes[2].player!.cardId).toBe("ash_lantern");
    expect(s.altitudes[2].player!.inhabitant).toBeNull();
    expect(s.hand).toContain("cliff_seeker");

    // Depth Matron free-Witnesses another Matron once (no infinite loop)
    s.sight = 5;
    s.altitudes[0].player = {
      instanceId: "m1",
      cardId: "depth_matron",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].player = {
      instanceId: "m2",
      cardId: "depth_matron",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[2].player = {
      instanceId: "seek",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.altitudes[0].player!.veiled).toBe(false);
    expect(s.altitudes[1].player!.veiled).toBe(false);
    expect(s.altitudes[2].player!.veiled).toBe(false);

    // Stake Field Pilgrim: enemy Vessel blocks Eclipse; enemy Figure blocks
    s.eclipse = 0;
    s.sight = 3;
    s.altitudes[0].player = {
      instanceId: "p",
      cardId: "stake_field_pilgrim",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[0].enemy = {
      instanceId: "ev",
      cardId: "ash_lantern",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.eclipse).toBe(0);

    s.eclipse = 0;
    s.altitudes[1].player = {
      instanceId: "p2",
      cardId: "stake_field_pilgrim",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].enemy = {
      instanceId: "ef",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.eclipse).toBe(0);

    // Stance / Graft only legal on Figures
    s.essence = 5;
    s.hand = ["ace_of_hollows"];
    s.altitudes[2].player = {
      instanceId: "ves",
      cardId: "ash_lantern",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: true,
    };
    s.altitudes[2].playerSite = "third_face";
    expect(legalIntents(s).some((i) => i.kind === "stance" && i.altitude === 2)).toBe(false);
    expect(legalIntents(s).some((i) => i.kind === "graft" && i.altitude === 2)).toBe(false);
  });

  it("wave12: mesa High Sight; key shrine Graft power; horn Stance B; pale/gaze tithes; vessels", () => {
    const s = createMatch({ seed: 130 });
    s.sight = 5;
    s.eclipse = 1;
    s.deck = ["hole_choir", "veil_banner", "pale_silence"];
    s.hand = s.hand.slice(0, 2);

    s.altitudes[0].player = {
      instanceId: "m",
      cardId: "mesa_bell",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sight0 = s.sight;
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.sight).toBe(sight0 - 1 + 1);

    s.altitudes[1].playerSite = "key_shrine";
    s.altitudes[1].player = {
      instanceId: "k",
      cardId: "keywright_scarecrow",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s, 1, "player")).toBe(4); // 3 + key shrine
    expect(sightIncome(s, "player")).toBeGreaterThanOrEqual(2);

    s.altitudes[2].player = {
      instanceId: "h",
      cardId: "horn_cantor",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[0].player = {
      instanceId: "e",
      cardId: "echo_mask",
      veiled: false,
      hybridSite: false,
      stanceB: true,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightH = s.sight;
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.sight).toBe(sightH - 1 + 1);

    s.essence = 4;
    s.hand = ["pale_tithe"];
    s.altitudes[1].playerSite = "pale_arch";
    s.altitudes[1].blinded = false;
    const handP = s.hand.length;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 0 });
    expect(s.altitudes[1].blinded).toBe(true);
    expect(s.hand.length).toBe(handP);

    s.essence = 2;
    s.hand = ["gaze_tithe"];
    s.altitudes[0].playerSite = "parasol_path";
    const handG = s.hand.length;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 2 });
    expect(s.hand.length).toBe(handG);
    expect(s.altitudes[2].blinded).toBe(false);

    s.sight = 4;
    s.hand = [];
    s.altitudes[2].player = {
      instanceId: "lu",
      cardId: "ledger_urn",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: "cliff_seeker",
      hasThirdFace: false,
    };
    const sightL = s.sight;
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.hand).toContain("cliff_seeker");
    expect(s.sight).toBe(sightL - 2 + 1);

    s.altitudes[0].playerSite = "branch_rune_reliquary";
    s.altitudes[1].player = {
      instanceId: "cu",
      cardId: "coral_urn",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightC = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.sight).toBe(sightC - 2 + 1);
  });

  it("wave13: low draw; dusk charm Blind; sail other Graft; void gallery; ember vessel draw", () => {
    const s = createMatch({ seed: 140 });
    s.sight = 5;
    s.eclipse = 1;
    s.deck = ["hole_choir", "veil_banner", "pale_silence"];
    s.hand = s.hand.slice(0, 2);

    s.altitudes[2].player = {
      instanceId: "lr",
      cardId: "low_runner",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const hand0 = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.hand.length).toBe(hand0 + 1);

    s.altitudes[1].player = {
      instanceId: "seek",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [{ instanceId: "g", cardId: "dusk_charm" }],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].blinded = false;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].blinded).toBe(true);
    expect(unitPower(s, 1, "player")).toBe(3); // 2 + dusk charm

    s.altitudes[0].player = {
      instanceId: "sr",
      cardId: "sail_runner",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[2].player = {
      instanceId: "kw",
      cardId: "keywright_scarecrow",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightS = s.sight;
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.sight).toBe(sightS - 1 + 1);

    s.altitudes[1].playerSite = "void_gallery";
    s.altitudes[1].player = {
      instanceId: "ink",
      cardId: "inkdrip_acolyte",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s, 1, "player")).toBe(2); // 1 + void gallery

    s.essence = 2;
    s.hand = ["ember_tithe"];
    s.altitudes[2].player = {
      instanceId: "ash",
      cardId: "ash_lantern",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const handE = s.hand.length;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 0 });
    expect(s.altitudes[0].blinded).toBe(true);
    expect(s.hand.length).toBe(handE); // spent + drew
  });

  it("wave14: mid sight; dusk mid+eclipse draw; pillar coral; key mid+site; iris gaze; cairn deep", () => {
    const s = createMatch({ seed: 141 });
    s.sight = 6;
    s.eclipse = 1;
    s.deck = ["hole_choir", "veil_banner", "pale_silence", "ace_of_hollows"];
    s.hand = s.hand.slice(0, 2);

    s.altitudes[1].player = {
      instanceId: "mr",
      cardId: "mid_runner",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightM = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.sight).toBe(sightM - 1 + 1);

    s.altitudes[1].player = {
      instanceId: "dc",
      cardId: "dusk_cantor",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const handD = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.hand.length).toBe(handD + 1);

    s.altitudes[0].playerSite = "pillar_cache";
    s.altitudes[0].player = {
      instanceId: "pc",
      cardId: "pillar_cantor",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightP = s.sight;
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.sight).toBe(sightP - 2 + 1); // witnessCost 2 + pillar cache

    s.altitudes[1].playerSite = "key_shrine";
    s.altitudes[1].player = {
      instanceId: "kc",
      cardId: "key_cantor",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightK = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.sight).toBe(sightK - 1 + 1);

    s.altitudes[2].playerSite = "parasol_path";
    s.altitudes[2].player = {
      instanceId: "iu",
      cardId: "iris_urn",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightI = s.sight;
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.sight).toBe(sightI - 2 + 1);

    s.essence = 2;
    s.hand = ["cairn_tithe"];
    s.altitudes[1].playerSite = "abyss_cairn";
    const handC = s.hand.length;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 0 });
    expect(s.hand.length).toBe(handC); // spent + drew
  });

  it("wave15: stake cube; splice graft; ribbon mid+coral; horn mid+stance; wick mid+vessel; mire gallery; coral charm", () => {
    const s = createMatch({ seed: 142 });
    s.sight = 5;
    s.deck = ["hole_choir", "veil_banner", "pale_silence", "ace_of_hollows"];
    s.hand = s.hand.slice(0, 2);

    s.altitudes[0].playerSite = "veil_banner";
    s.altitudes[0].player = {
      instanceId: "su",
      cardId: "stake_urn",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightS = s.sight;
    applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.sight).toBe(sightS - 2 + 1);

    s.sight = 5;
    s.altitudes[1].playerSite = "key_shrine";
    s.altitudes[1].player = {
      instanceId: "sp",
      cardId: "splice_urn",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightSp = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.sight).toBe(sightSp - 2 + 1);

    s.sight = 4;
    s.altitudes[1].playerSite = "pillar_cache";
    s.altitudes[1].player = {
      instanceId: "rr",
      cardId: "ribbon_runner",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightR = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    // cost 1, ribbon Mid+Coral Site +1, pillar_cache Coral Figure +1
    expect(s.sight).toBe(sightR - 1 + 1 + 1);

    s.altitudes[2].player = {
      instanceId: "em",
      cardId: "echo_mask",
      veiled: false,
      hybridSite: false,
      stanceB: true,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].player = {
      instanceId: "hr",
      cardId: "horn_runner",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const handH = s.hand.length;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.hand.length).toBe(handH + 1);

    s.sight = 4;
    s.altitudes[2].player = {
      instanceId: "ash",
      cardId: "ash_lantern",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].player = {
      instanceId: "wc",
      cardId: "wick_cantor",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightW = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.sight).toBe(sightW - 1 + 1);

    s.altitudes[0].playerSite = "mire_gallery";
    s.altitudes[0].player = {
      instanceId: "md",
      cardId: "mire_debtor",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    expect(unitPower(s, 0, "player")).toBe(2); // 1 + mire gallery

    s.sight = 3;
    s.altitudes[2].playerSite = "pillar_cache";
    s.altitudes[2].player = {
      instanceId: "seek",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [{ instanceId: "g", cardId: "coral_charm" }],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightC = s.sight;
    applyIntent(s, { kind: "witness", altitude: 2 });
    // cost 1, cliff_seeker revel +1, coral_charm +1
    expect(s.sight).toBe(sightC - 1 + 1 + 1);
    expect(unitPower(s, 2, "player")).toBe(3); // 2 + coral charm
  });

  it("wave16: parasol mid+gaze; dust deal; pale mid+hollow; cataract mid+deep; mask/wick/iris charms", () => {
    const s = createMatch({ seed: 143 });
    s.sight = 5;
    s.deck = ["hole_choir", "veil_banner", "pale_silence", "ace_of_hollows"];
    s.hand = s.hand.slice(0, 2);

    s.altitudes[0].playerSite = "parasol_path";
    s.altitudes[1].player = {
      instanceId: "pr",
      cardId: "parasol_runner",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightP = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.sight).toBe(sightP - 1 + 1);

    s.sight = 4;
    s.altitudes[1].playerSite = "dust_cache";
    s.altitudes[1].player = {
      instanceId: "rj",
      cardId: "river_jack",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightD = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.sight).toBe(sightD - 1 + 1);

    s.sight = 4;
    s.altitudes[1].playerSite = "pale_arch";
    s.altitudes[1].player = {
      instanceId: "pl",
      cardId: "pale_runner",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightH = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    // cost 1, pale Mid+Hollow Site +1; pale_arch also +1 power when witnessed hollow figure (not sight)
    expect(s.sight).toBe(sightH - 1 + 1);

    s.sight = 4;
    s.altitudes[1].playerSite = "mire_gallery";
    s.altitudes[1].player = {
      instanceId: "cr",
      cardId: "cataract_runner",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightC = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.sight).toBe(sightC - 1 + 1);

    s.sight = 3;
    s.altitudes[2].player = {
      instanceId: "em",
      cardId: "echo_mask",
      veiled: false,
      hybridSite: false,
      stanceB: true,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[0].player = {
      instanceId: "seek",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [{ instanceId: "g", cardId: "mask_charm" }],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightM = s.sight;
    applyIntent(s, { kind: "witness", altitude: 0 });
    // cost 1, cliff +1, mask_charm +1
    expect(s.sight).toBe(sightM - 1 + 1 + 1);
    expect(unitPower(s, 0, "player")).toBe(3); // 2 + mask charm

    s.sight = 3;
    s.altitudes[2].player = {
      instanceId: "ash",
      cardId: "ash_lantern",
      veiled: false,
      hybridSite: false,
      stanceB: false,
      grafts: [],
      inhabitant: null,
      hasThirdFace: false,
    };
    s.altitudes[1].player = {
      instanceId: "seek2",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [{ instanceId: "g2", cardId: "wick_charm" }],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightW = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.sight).toBe(sightW - 1 + 1 + 1);
    expect(unitPower(s, 1, "player")).toBe(3);

    s.sight = 3;
    s.altitudes[0].playerSite = "ring_gaze";
    s.altitudes[2].player = {
      instanceId: "seek3",
      cardId: "cliff_seeker",
      veiled: true,
      hybridSite: false,
      stanceB: false,
      grafts: [{ instanceId: "g3", cardId: "iris_charm" }],
      inhabitant: null,
      hasThirdFace: false,
    };
    const sightI = s.sight;
    applyIntent(s, { kind: "witness", altitude: 2 });
    expect(s.sight).toBe(sightI - 1 + 1 + 1);
    expect(unitPower(s, 2, "player")).toBe(3);
  });
});
