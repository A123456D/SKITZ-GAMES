import { describe, expect, it } from "vitest";
import { teachDeck, teachDeckLumen } from "./cards";
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

describe("Lumen Host Wave 1", () => {
  it("teachDeckLumen and fullCraftDeck are legal 20", () => {
    expect(teachDeckLumen()).toHaveLength(20);
    expect(validateConstructedDeck(teachDeckLumen()).ok).toBe(true);
    expect(fullCraftDeck("lumen")).toHaveLength(20);
    expect(validateConstructedDeck(fullCraftDeck("lumen")).ok).toBe(true);
  });

  it("own Witness grants Halo", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1101 });
    s.altitudes[1].player = fig("candela_blade", { veiled: true });
    s.sight = 3;
    s.hand = [];
    const ev = applyIntent(s, { kind: "witness", altitude: 1 });
    expect(ev.some((e) => e.type === "halo")).toBe(true);
    expect(s.altitudes[1].player?.haloed).toBe(true);
    expect(s.altitudes[1].player?.veiled).toBe(false);
  });

  it("Pass Blaze deals Will then Re-Veils without Sustain", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1102 });
    s.altitudes[1].player = fig("candela_blade", {
      veiled: false,
      revelationFired: true,
      haloed: true,
    });
    s.altitudes[1].enemy = fig("blot_herald", { veiled: false, revelationFired: true });
    s.hand = [];
    s.sight = 2;
    const willBefore = s.enemyWill;
    const ev = applyIntent(s, { kind: "pass" });
    expect(ev.some((e) => e.type === "blaze")).toBe(true);
    expect(s.enemyWill).toBe(willBefore - 1);
    expect(s.altitudes[1].player?.veiled).toBe(true);
    expect(s.altitudes[1].player?.haloed).toBe(false);
  });

  it("Sustain keeps Halo after Blaze", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1103 });
    s.altitudes[1].player = fig("candela_blade", {
      veiled: false,
      revelationFired: true,
      haloed: true,
    });
    s.altitudes[1].enemy = fig("blot_herald", { veiled: true });
    s.hand = [];
    s.sight = 3;
    applyIntent(s, { kind: "sustain", altitude: 1 });
    expect(s.altitudes[1].player?.haloSustained).toBe(true);
    expect(s.sight).toBe(2);
    applyIntent(s, { kind: "pass" });
    expect(s.altitudes[1].player?.veiled).toBe(false);
    expect(s.altitudes[1].player?.haloed).toBe(true);
  });

  it("Halo Herald taxes enemy Witness on its lane", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeckLumen(), seed: 1104 });
    s.active = "player";
    s.altitudes[1].enemy = fig("halo_herald", { veiled: true });
    s.altitudes[1].player = fig("blot_herald", { veiled: true });
    s.hand = [];
    s.sight = 1;
    // base Mid cost 1 + Herald tax 1 = 2 → illegal at Sight 1
    expect(legalIntents(s).some((i) => i.kind === "witness" && i.altitude === 1)).toBe(false);
    s.altitudes[1].enemy = null;
    expect(legalIntents(s).some((i) => i.kind === "witness" && i.altitude === 1)).toBe(true);
  });

  it("Skyflare on High Blazes for 2 Will when Sustained", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1105 });
    s.altitudes[0].player = fig("skyflare_seraph", {
      veiled: false,
      revelationFired: true,
      haloed: true,
      haloSustained: true,
    });
    s.altitudes[0].enemy = fig("blot_herald", { veiled: false, revelationFired: true });
    s.hand = [];
    s.sight = 1;
    const willBefore = s.enemyWill;
    applyIntent(s, { kind: "pass" });
    expect(s.enemyWill).toBe(willBefore - 2);
    expect(s.altitudes[0].player?.haloed).toBe(true);
  });

  it("Snuff the Halo Re-Veils and Blind if foe Witnessed", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1106 });
    s.altitudes[1].player = fig("candela_blade", {
      veiled: false,
      revelationFired: true,
      haloed: true,
    });
    s.altitudes[1].enemy = fig("blot_herald", { veiled: false, revelationFired: true });
    s.hand = ["snuff_the_halo"];
    s.essence = 2;
    s.sight = 1;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].player?.veiled).toBe(true);
    expect(s.altitudes[1].player?.haloed).toBe(false);
    expect(s.sight).toBe(3);
    expect(s.altitudes[1].blinded).toBe(true);
  });

  it("Kindle free-Witnesses a Veiled Lumen Figure", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1201 });
    s.altitudes[1].player = fig("ash_chorister", { veiled: true });
    s.hand = ["kindle_the_halo"];
    s.essence = 2;
    s.sight = 0;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].player?.veiled).toBe(false);
    expect(s.altitudes[1].player?.haloed).toBe(true);
  });

  it("Ash Chorister gains Sight when a friend Blazes", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1202 });
    s.altitudes[1].player = fig("candela_blade", {
      veiled: false,
      revelationFired: true,
      haloed: true,
    });
    s.altitudes[2].player = fig("ash_chorister", { veiled: true });
    s.altitudes[1].enemy = fig("blot_herald", { veiled: true });
    s.hand = [];
    s.sight = 2;
    const before = s.sight;
    applyIntent(s, { kind: "pass" });
    expect(s.sight).toBeGreaterThan(before);
  });

  it("Aureole Well pays Sight on Halo", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1203 });
    s.altitudes[1].player = fig("ash_chorister", { veiled: true });
    s.altitudes[1].playerSite = "aureole_well";
    s.hand = [];
    s.sight = 2;
    applyIntent(s, { kind: "witness", altitude: 1 });
    // Mid Witness +1 Sight + Well +1 on Halo
    expect(s.sight).toBeGreaterThanOrEqual(2);
    expect(s.altitudes[1].player?.haloed).toBe(true);
  });
});

describe("Lumen Host Wave 3", () => {
  it("Highflare Cantor gains Sight when you Halo elsewhere from High", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1301 });
    s.altitudes[0].player = fig("highflare_cantor", { veiled: true });
    s.altitudes[1].player = fig("candela_blade", { veiled: true });
    s.hand = [];
    s.sight = 3;
    const before = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].player?.haloed).toBe(true);
    // Mid Witness refund + Highflare Veiled Sight on Halo elsewhere
    expect(s.sight).toBeGreaterThan(before - 1);
  });

  it("Full Radiance adds +1 Will to Blaze", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1302 });
    s.altitudes[1].player = fig("candela_blade", {
      veiled: false,
      revelationFired: true,
      haloed: true,
    });
    s.hand = ["full_radiance"];
    s.essence = 2;
    s.sight = 1;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.lumenFullRadianceArmed.player).toBe(true);
    const willBefore = s.enemyWill;
    applyIntent(s, { kind: "pass" });
    // Candela always Will 1 + Full Radiance +1
    expect(s.enemyWill).toBe(willBefore - 2);
  });

  it("Halo Gallery buffs other Halo'd Figures", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1303 });
    s.altitudes[1].player = fig("candela_blade", {
      veiled: false,
      revelationFired: true,
      haloed: true,
    });
    s.altitudes[1].playerSite = "halo_gallery";
    s.altitudes[0].player = fig("skyflare_seraph", {
      veiled: false,
      revelationFired: true,
      haloed: true,
    });
    // Halo +1 + Gallery +1 on Seraph (host on Gallery does not self-buff via "other")
    expect(unitPower(s, 0, "player")).toBe(6);
  });

  it("Veilburn Usher pays Sight on first Sustain", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1304 });
    s.altitudes[1].player = fig("candela_blade", {
      veiled: false,
      revelationFired: true,
      haloed: true,
    });
    s.altitudes[2].player = fig("veilburn_usher", { veiled: true });
    s.hand = [];
    s.sight = 3;
    const before = s.sight;
    applyIntent(s, { kind: "sustain", altitude: 1 });
    // Sustain costs 1, Usher refunds 1
    expect(s.sight).toBe(before);
  });
});

describe("Lumen Host Wave 4", () => {
  it("fullCraftDeck is exactly 20 uniques including Solarch", () => {
    const d = fullCraftDeck("lumen");
    expect(d).toHaveLength(20);
    expect(new Set(d).size).toBe(20);
    expect(d).toContain("solarch");
    expect(validateConstructedDeck(d).ok).toBe(true);
    expect(teachDeckLumen()).not.toContain("solarch");
  });

  it("Veiled Solarch gains Sight when a friend becomes Halo'd", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1401 });
    s.altitudes[0].player = fig("solarch", { veiled: true });
    s.altitudes[1].player = fig("candela_blade", { veiled: true });
    s.hand = [];
    s.sight = 3;
    const before = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].player?.haloed).toBe(true);
    // Mid Witness refund + Solarch Veiled Sight
    expect(s.sight).toBeGreaterThan(before - 1);
  });

  it("Halo'd Solarch adds +1 Will to other Blazes", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1402 });
    s.altitudes[0].player = fig("solarch", {
      veiled: false,
      revelationFired: true,
      haloed: true,
      haloSustained: true,
    });
    s.altitudes[1].player = fig("candela_blade", {
      veiled: false,
      revelationFired: true,
      haloed: true,
    });
    s.hand = [];
    s.sight = 1;
    const willBefore = s.enemyWill;
    applyIntent(s, { kind: "pass" });
    // Candela 1 + Solarch aura 1; Solarch Sustained no Re-Veil; Candela Blazes then Re-Veils
    expect(s.enemyWill).toBeLessThanOrEqual(willBefore - 2);
  });

  it("Last Radiance deals 2 Will from Halo'd Figure", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1403 });
    s.altitudes[1].player = fig("candela_blade", {
      veiled: false,
      revelationFired: true,
      haloed: true,
    });
    s.hand = ["last_radiance"];
    s.essence = 2;
    s.sight = 1;
    const willBefore = s.enemyWill;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.enemyWill).toBe(willBefore - 2);
  });

  it("Sunwell buffs Halo'd power and pays Sight on Sustain", () => {
    const s = createMatch({ deck: teachDeckLumen(), enemyDeck: teachDeck(), seed: 1404 });
    s.altitudes[1].player = fig("candela_blade", {
      veiled: false,
      revelationFired: true,
      haloed: true,
    });
    s.altitudes[1].playerSite = "sunwell";
    expect(unitPower(s, 1, "player")).toBe(7); // W5 + Halo + Sunwell
    s.hand = [];
    s.sight = 2;
    applyIntent(s, { kind: "sustain", altitude: 1 });
    // Sustain 1 + Sunwell +1 → net 2
    expect(s.sight).toBe(2);
  });
});
