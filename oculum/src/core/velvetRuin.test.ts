import { describe, expect, it } from "vitest";
import { teachDeck, teachDeckRuin } from "./cards";
import { fullCraftDeck } from "./decks";
import { applyIntent, createMatch, legalIntents, unitPower } from "./match";
import { validateConstructedDeck } from "./construct";
import type { BoardUnit } from "./types";

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

describe("Velvet Ruin Wave 1", () => {
  it("teachDeckRuin and fullCraftDeck are legal 20", () => {
    expect(teachDeckRuin()).toHaveLength(20);
    expect(validateConstructedDeck(teachDeckRuin()).ok).toBe(true);
    expect(fullCraftDeck("ruin")).toHaveLength(20);
    expect(validateConstructedDeck(fullCraftDeck("ruin")).ok).toBe(true);
    expect(new Set(teachDeckRuin()).size).toBe(10);
    expect(fullCraftDeck("ruin")).toContain("veloth");
    expect(teachDeckRuin()).not.toContain("veloth");
    expect(teachDeckRuin()).not.toContain("last_devour");
  });

  it("Tempt marks enemy Veiled; Witness Brands and pays Sight", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2101 });
    s.altitudes[1].player = fig("crimson_vow", { veiled: true });
    s.altitudes[1].enemy = fig("blot_herald", { veiled: true });
    s.sight = 4;
    s.hand = [];
    expect(legalIntents(s).some((i) => i.kind === "tempt" && i.altitude === 1)).toBe(true);
    const tev = applyIntent(s, { kind: "tempt", altitude: 1 });
    expect(tev.some((e) => e.type === "tempt")).toBe(true);
    expect(s.altitudes[1].enemy?.tempted).toBe(true);
    expect(s.altitudes[1].enemy?.temptedBy).toBe("player");

    // Enemy window: Witness Tempted self at −1 Sight → Brand
    s.active = "enemy";
    s.passed.player = true;
    s.enemySight = 3;
    const before = s.sight;
    const w = applyIntent(s, { kind: "witness", altitude: 1 });
    expect(w.some((e) => e.type === "brand")).toBe(true);
    expect(s.altitudes[1].enemy?.branded).toBe(true);
    expect(s.altitudes[1].enemy?.tempted).toBe(false);
    // Brand Sight + Crimson Vow Veiled Brand Sight
    expect(s.sight).toBe(before + 2);
  });

  it("Pass Devour deals Will to Witnessed Branded foe then clears Brand", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2102 });
    s.altitudes[1].player = fig("thorn_liaison", { veiled: true });
    s.altitudes[1].enemy = fig("blot_herald", {
      veiled: false,
      revelationFired: true,
      branded: true,
      brandedBy: "player",
    });
    s.hand = [];
    const willBefore = s.enemyWill;
    const ev = applyIntent(s, { kind: "pass" });
    expect(ev.some((e) => e.type === "devour")).toBe(true);
    expect(s.enemyWill).toBe(willBefore - 1);
    expect(s.altitudes[1].enemy?.branded).toBe(false);
  });

  it("High Branded Devour deals +1 Will", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2103 });
    s.altitudes[0].player = fig("spire_hunger", { veiled: true });
    s.altitudes[0].enemy = fig("blot_herald", {
      veiled: false,
      revelationFired: true,
      branded: true,
      brandedBy: "player",
    });
    s.hand = [];
    const willBefore = s.enemyWill;
    applyIntent(s, { kind: "pass" });
    expect(s.enemyWill).toBe(willBefore - 2);
  });

  it("Thorn Liaison taxes own Witness unless Tempted", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeckRuin(), seed: 2104 });
    s.altitudes[1].enemy = fig("thorn_liaison", { veiled: true });
    s.altitudes[1].player = fig("blot_herald", { veiled: true });
    s.hand = [];
    s.sight = 2;
    expect(legalIntents(s).some((i) => i.kind === "witness" && i.altitude === 1)).toBe(true);
    s.sight = 1;
    expect(legalIntents(s).some((i) => i.kind === "witness" && i.altitude === 1)).toBe(false);
  });

  it("Unwrite the Sin cashes Brand for Sight", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2105 });
    s.altitudes[1].enemy = fig("blot_herald", {
      veiled: false,
      revelationFired: true,
      branded: true,
      brandedBy: "player",
    });
    s.hand = ["unwrite_the_sin"];
    s.essence = 3;
    const before = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].enemy?.branded).toBe(false);
    expect(s.sight).toBe(before + 2);
  });
});

describe("Velvet Ruin Wave 2", () => {
  it("Vespera pays Sight on Low Tempt and spikes Low Devour", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2201 });
    s.altitudes[2].player = fig("vespera", { veiled: true });
    s.altitudes[2].enemy = fig("blot_herald", { veiled: true });
    s.hand = [];
    s.sight = 4;
    const before = s.sight;
    applyIntent(s, { kind: "tempt", altitude: 2 });
    expect(s.altitudes[2].enemy?.tempted).toBe(true);
    expect(s.sight).toBe(before + 1);

    s.altitudes[2].player = fig("vespera", { veiled: false, revelationFired: true });
    s.altitudes[2].enemy = fig("blot_herald", {
      veiled: false,
      revelationFired: true,
      branded: true,
      brandedBy: "player",
    });
    const willBefore = s.enemyWill;
    applyIntent(s, { kind: "pass" });
    expect(s.enemyWill).toBe(willBefore - 2);
  });

  it("Thorn Font banks Sight on Tempt and Brand", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2202 });
    s.altitudes[1].player = fig("thorn_liaison", { veiled: true });
    s.altitudes[1].playerSite = "thorn_font";
    s.altitudes[1].enemy = fig("blot_herald", { veiled: true });
    s.hand = [];
    s.sight = 2;
    const before = s.sight;
    applyIntent(s, { kind: "tempt", altitude: 1 });
    expect(s.sight).toBe(before + 1);

    s.hand = ["invite_the_look"];
    s.essence = 3;
    const beforeBrand = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].enemy?.branded).toBe(true);
    // Brand base Sight + Thorn Font Brand Sight
    expect(s.sight).toBe(beforeBrand + 2);
  });

  it("Invite the Look Tempts Veiled or Brands Tempted", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2203 });
    s.altitudes[1].player = fig("crimson_vow", { veiled: true });
    s.altitudes[1].enemy = fig("blot_herald", { veiled: true });
    s.hand = ["invite_the_look"];
    s.essence = 3;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].enemy?.tempted).toBe(true);

    s.hand = ["invite_the_look"];
    s.essence = 3;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].enemy?.branded).toBe(true);
    expect(s.altitudes[1].enemy?.tempted).toBe(false);
  });

  it("High Devour spike requires Spire Hunger", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2204 });
    s.altitudes[0].player = fig("thorn_liaison", { veiled: true });
    s.altitudes[0].enemy = fig("blot_herald", {
      veiled: false,
      revelationFired: true,
      branded: true,
      brandedBy: "player",
    });
    s.hand = [];
    const willBefore = s.enemyWill;
    applyIntent(s, { kind: "pass" });
    expect(s.enemyWill).toBe(willBefore - 1);
  });
});

describe("Velvet Ruin Wave 3", () => {
  it("Brandlace pays Sight on first Tempt", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2301 });
    s.altitudes[1].player = fig("brandlace", { veiled: true });
    s.altitudes[1].enemy = fig("blot_herald", { veiled: true });
    s.hand = [];
    s.sight = 2;
    const before = s.sight;
    applyIntent(s, { kind: "tempt", altitude: 1 });
    expect(s.altitudes[1].enemy?.tempted).toBe(true);
    expect(s.sight).toBe(before + 1);
  });

  it("Full Devour spikes Witnessed Brand Devour Will", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2302 });
    s.altitudes[1].player = fig("thorn_liaison", { veiled: true });
    s.altitudes[1].enemy = fig("blot_herald", {
      veiled: false,
      revelationFired: true,
      branded: true,
      brandedBy: "player",
    });
    s.hand = ["full_devour"];
    s.essence = 3;
    s.sight = 2;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.ruinFullDevourArmed.player).toBe(true);
    const willBefore = s.enemyWill;
    applyIntent(s, { kind: "pass" });
    expect(s.enemyWill).toBe(willBefore - 2);
  });

  it("Thorncrown gains Sight when Brand lands elsewhere from High", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2303 });
    s.altitudes[0].player = fig("thorncrown", { veiled: true });
    s.altitudes[1].player = fig("thorn_liaison", { veiled: true });
    s.altitudes[1].enemy = fig("blot_herald", {
      veiled: true,
      tempted: true,
      temptedBy: "player",
    });
    s.hand = ["invite_the_look"];
    s.essence = 3;
    s.sight = 2;
    const before = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].enemy?.branded).toBe(true);
    // Brand base + Thorncrown elsewhere Sight
    expect(s.sight).toBe(before + 2);
  });

  it("Lace Gallery grants +1 power to other Figures while Brand sits here", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2304 });
    s.altitudes[1].playerSite = "lace_gallery";
    s.altitudes[1].enemy = fig("blot_herald", {
      veiled: false,
      revelationFired: true,
      branded: true,
      brandedBy: "player",
    });
    s.altitudes[0].player = fig("thorn_liaison", { veiled: true });
    s.hand = [];
    expect(unitPower(s, 0, "player")).toBe(3); // veiled 2 + gallery 1
  });
});

describe("Velvet Ruin Wave 4", () => {
  it("fullCraftDeck is exactly 20 uniques including Veloth", () => {
    const d = fullCraftDeck("ruin");
    expect(d).toHaveLength(20);
    expect(new Set(d).size).toBe(20);
    expect(d).toContain("veloth");
    expect(validateConstructedDeck(d).ok).toBe(true);
  });

  it("Veloth pays Sight on Tempt and auras Devour Will while Witnessed", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2401 });
    s.altitudes[0].player = fig("veloth", { veiled: true });
    s.altitudes[1].enemy = fig("blot_herald", { veiled: true });
    s.hand = [];
    s.sight = 2;
    const before = s.sight;
    applyIntent(s, { kind: "tempt", altitude: 1 });
    expect(s.sight).toBe(before + 1);

    s.altitudes[0].player = fig("veloth", { veiled: false, revelationFired: true });
    s.altitudes[1].enemy = fig("blot_herald", {
      veiled: false,
      revelationFired: true,
      branded: true,
      brandedBy: "player",
    });
    const willBefore = s.enemyWill;
    applyIntent(s, { kind: "pass" });
    expect(s.enemyWill).toBe(willBefore - 2); // base 1 + Veloth aura 1
  });

  it("Last Devour deals 2 Will to Witnessed Branded foe", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2402 });
    s.altitudes[1].player = fig("thorn_liaison", { veiled: true });
    s.altitudes[1].enemy = fig("blot_herald", {
      veiled: false,
      revelationFired: true,
      branded: true,
      brandedBy: "player",
    });
    s.hand = ["last_devour"];
    s.essence = 3;
    const willBefore = s.enemyWill;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.enemyWill).toBe(willBefore - 2);
  });

  it("Wantwell taxes rival Sight on Brand", () => {
    const s = createMatch({ deck: teachDeckRuin(), enemyDeck: teachDeck(), seed: 2403 });
    s.altitudes[1].player = fig("thorn_liaison", { veiled: true });
    s.altitudes[1].playerSite = "wantwell";
    s.altitudes[1].enemy = fig("blot_herald", { veiled: true, tempted: true, temptedBy: "player" });
    s.hand = ["invite_the_look"];
    s.essence = 3;
    s.sight = 2;
    s.enemySight = 3;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].enemy?.branded).toBe(true);
    expect(s.enemySight).toBe(2);
  });
});
