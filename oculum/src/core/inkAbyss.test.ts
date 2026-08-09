import { describe, expect, it } from "vitest";
import { CARDS, getCard, teachDeck } from "./cards";
import { validateConstructedDeck } from "./construct";
import { applyIntent, createMatch, legalIntents, unitPower } from "./match";
import type { BoardUnit, MatchState } from "./types";

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

function bothPassResolve(s: MatchState): void {
  s.passed.player = true;
  s.active = "enemy";
  applyIntent(s, { kind: "pass" });
}

describe("Ink Abyss Wave 1 identity", () => {
  it("live pool is Ink 20 + Motley 20 + Toll 20", () => {
    expect(CARDS.filter((c) => c.heresy === "ink")).toHaveLength(20);
    expect(CARDS.filter((c) => c.heresy === "motley")).toHaveLength(20);
    expect(CARDS.filter((c) => c.heresy === "toll")).toHaveLength(20);
    expect(CARDS).toHaveLength(80);
  });

  it("live pool includes Wave 1 Figures", () => {
    expect(CARDS.filter((c) => c.heresy === "ink")).toHaveLength(20);
    for (const id of ["blot_herald", "smother_bride", "well_cantor", "pale_ledger", "mire_duelist"]) {
      const c = getCard(id);
      expect(c.type).toBe("figure");
      expect(c.veiledAbility?.length).toBeGreaterThan(0);
      expect(c.revelation?.length).toBeGreaterThan(0);
    }
  });

  it("teachDeck is legal Constructed Ink", () => {
    const d = teachDeck();
    expect(d).toHaveLength(20);
    expect(validateConstructedDeck(d).ok).toBe(true);
    expect(d.every((id) => getCard(id).heresy === "ink")).toBe(true);
  });

  it("Blot Herald stains when enemy Figure elsewhere becomes Witnessed", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 1 });
    s.altitudes[0].player = fig("blot_herald", { veiled: true });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true });
    s.sight = 5;
    // Gaze requires Gaze control — Witness own mid instead after swapping sides via enemy Witness:
    // Put Herald on enemy side elsewhere, Witness our figure → Herald stains us.
    s.altitudes[0].player = null;
    s.altitudes[0].enemy = fig("blot_herald", { veiled: true });
    s.altitudes[1].player = fig("pale_ledger", { veiled: true });
    s.altitudes[1].enemy = null;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].player?.veiled).toBe(false);
    expect(s.altitudes[1].player?.stained).toBe(true);
  });

  it("Blot Herald Revelation stains here and gains Sight", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 2 });
    s.altitudes[1].player = fig("blot_herald", { veiled: true });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: false });
    s.sight = 5;
    const before = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].enemy?.stained).toBe(true);
    // cost 1 Mid + gain 1 + Mid own-Witness draw does not affect Sight; net: -1 +1 = before, Mid draw is card
    expect(s.sight).toBe(before - 1 + 1);
  });

  it("Smother Bride Veiled win Blinds when enemy Stained", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 6 });
    s.altitudes[1].player = fig("smother_bride", { veiled: true });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true, stained: true });
    s.passed.player = true;
    s.active = "enemy";
    const ev = applyIntent(s, { kind: "pass" });
    expect(ev.some((e) => e.type === "blind" && e.altitude === 1)).toBe(true);
  });

  it("Smother Bride Witnessed taxes opponent Sight once per turn", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 8 });
    s.altitudes[0].enemy = fig("smother_bride", { veiled: false, revelationFired: true });
    s.altitudes[1].player = fig("pale_ledger", { veiled: true });
    s.sight = 5;
    const before = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    // Mid cost 1 + tax 1
    expect(s.sight).toBe(before - 1 - 1);
    expect(s.smotherTaxUsed.enemy).toBe(true);
  });

  it("Well Cantor stains on ally Hold (any veil)", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 3 });
    s.altitudes[0].player = fig("well_cantor", { veiled: true });
    s.altitudes[0].enemy = fig("pale_ledger", { veiled: false });
    s.altitudes[1].player = fig("blot_herald", { veiled: true });
    s.altitudes[1].enemy = fig("mire_duelist", { veiled: false });
    bothPassResolve(s);
    expect(s.altitudes[0].enemy?.stained).toBe(true);
  });

  it("Well Cantor Revelation grants choir buff and Sight", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 9 });
    s.altitudes[1].player = fig("well_cantor", { veiled: true });
    s.altitudes[0].player = fig("blot_herald", { veiled: true });
    s.altitudes[2].player = fig("pale_ledger", { veiled: true });
    s.sight = 5;
    const before = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.inkChoirBuff.player).toBe(true);
    // Mid cost 1 + Sight for 2 other Veiled Ink
    expect(s.sight).toBe(before - 1 + 2);
    expect(unitPower(s, 0, "player")).toBe(getCard("blot_herald").veiledPower + 1);
  });

  it("Pale Ledger gains power while Veiled if any enemy Stained", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 4 });
    s.altitudes[1].player = fig("pale_ledger", { veiled: true });
    expect(unitPower(s, 1, "player")).toBe(1);
    s.altitudes[2].enemy = fig("blot_herald", { veiled: true, stained: true });
    expect(unitPower(s, 1, "player")).toBe(2);
  });

  it("Pale Ledger Revelation moves Stain and Forced Exposes Veiled host", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 5 });
    s.altitudes[1].player = fig("pale_ledger", { veiled: true });
    s.altitudes[0].enemy = fig("blot_herald", { veiled: true, stained: true });
    s.altitudes[2].enemy = fig("well_cantor", { veiled: true });
    s.sight = 5;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[0].enemy?.stained).toBe(false);
    expect(s.altitudes[2].enemy?.stained).toBe(true);
    expect(s.altitudes[2].enemy?.veiled).toBe(false);
    expect(s.altitudes[2].enemy?.strained).toBe(true);
  });

  it("Pale Ledger Revelation Blinds Witnessed new host", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 10 });
    s.altitudes[1].player = fig("pale_ledger", { veiled: true });
    s.altitudes[0].enemy = fig("blot_herald", { veiled: true, stained: true });
    s.altitudes[2].enemy = fig("well_cantor", { veiled: false });
    s.sight = 5;
    const ev = applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[2].enemy?.stained).toBe(true);
    expect(ev.some((e) => e.type === "blind" && e.altitude === 2)).toBe(true);
  });

  it("Mire Duelist Witnessed gives Stained enemies −1", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 7 });
    s.altitudes[1].player = fig("mire_duelist", { veiled: false });
    s.altitudes[1].enemy = fig("blot_herald", { veiled: true, stained: true });
    expect(unitPower(s, 1, "enemy")).toBe(getCard("blot_herald").veiledPower - 1);
  });

  it("Mire Duelist Witnessed Falls Stained Witnessed losers", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 11 });
    s.altitudes[1].player = fig("mire_duelist", { veiled: false, revelationFired: true });
    s.altitudes[1].enemy = fig("pale_ledger", {
      veiled: false,
      stained: true,
      strained: false,
      revelationFired: true,
    });
    bothPassResolve(s);
    expect(s.altitudes[1].enemy).toBeNull();
  });

  it("can play Blot Herald and Witness", () => {
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
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].player?.veiled).toBe(false);
  });
});

describe("Ink Abyss Wave 2 support pack", () => {
  it("pool has Bailiff Site Vessel Relic Rite", () => {
    expect(getCard("pale_bailiff").type).toBe("figure");
    expect(getCard("blackwater_shrine").type).toBe("site");
    expect(getCard("gulf_urn").type).toBe("vessel");
    expect(getCard("smother_cord").type).toBe("relic");
    expect(getCard("ashen_tithe").type).toBe("rite");
  });

  it("Pale Bailiff stains different enemy when Forced Expose elsewhere", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 20 });
    s.altitudes[0].player = fig("pale_bailiff", { veiled: true });
    s.altitudes[1].player = fig("blot_herald", { veiled: false });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true, stained: true });
    s.altitudes[2].enemy = fig("well_cantor", { veiled: true });
    bothPassResolve(s);
    expect(s.altitudes[1].enemy?.veiled).toBe(false);
    expect(s.altitudes[2].enemy?.stained).toBe(true);
  });

  it("Pale Bailiff Revelation stains; already Stained Blinds", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 21 });
    s.altitudes[1].player = fig("pale_bailiff", { veiled: true });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: false, stained: true });
    s.sight = 5;
    const ev = applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].enemy?.stained).toBe(true);
    expect(ev.some((e) => e.type === "blind" && e.altitude === 1)).toBe(true);
  });

  it("Blackwater Shrine gains Sight on Forced Expose here", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 22 });
    s.altitudes[1].playerSite = "blackwater_shrine";
    s.altitudes[1].player = fig("blot_herald", { veiled: false });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true, stained: true });
    s.sight = 3;
    const before = s.sight;
    s.passed.player = true;
    s.active = "enemy";
    applyIntent(s, { kind: "pass" });
    expect(s.altitudes[1].enemy?.veiled).toBe(false);
    // Shrine +1 during Resolve; beginTurn then grants base Sight income (+1)
    expect(s.sight).toBe(before + 1 + 1);
  });

  it("Blackwater Shrine gains Sight when you Stain here", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 23 });
    s.altitudes[1].playerSite = "blackwater_shrine";
    s.altitudes[1].player = fig("mire_duelist", { veiled: true });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: false });
    s.sight = 5;
    const before = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].enemy?.stained).toBe(true);
    // Mid Witness cost 2 + Blackwater Stain Sight +1
    expect(s.sight).toBe(before - 2 + 1);
  });

  it("Smother Cord chains Stain on Forced Expose", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 24 });
    s.altitudes[1].player = fig("blot_herald", {
      veiled: false,
      grafts: [{ instanceId: "g1", cardId: "smother_cord" }],
    });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true, stained: true });
    s.altitudes[2].enemy = fig("well_cantor", { veiled: true });
    s.sight = 2;
    const before = s.sight;
    bothPassResolve(s);
    expect(s.altitudes[2].enemy?.stained).toBe(true);
    // Cord Mid +1 during Resolve; beginTurn +1 income
    expect(s.sight).toBe(before + 1 + 1);
  });

  it("Gulf Urn Fall stains Veiled enemy and Blinds", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 25 });
    s.altitudes[1].player = fig("gulf_urn", {
      veiled: false,
      strained: true,
      revelationFired: true,
    });
    s.altitudes[1].enemy = fig("mire_duelist", { veiled: false, revelationFired: true });
    s.altitudes[2].enemy = fig("pale_ledger", { veiled: true });
    s.passed.player = true;
    s.active = "enemy";
    const ev = applyIntent(s, { kind: "pass" });
    expect(s.altitudes[1].player).toBeNull();
    expect(s.altitudes[2].enemy?.stained).toBe(true);
    // Blind fires in Resolve then roundStart clears; assert via events
    expect(ev.some((e) => e.type === "blind" && e.altitude === 2)).toBe(true);
  });

  it("Ashen Tithe cashes Stain for Sight and draw", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 26 });
    s.hand = ["ashen_tithe", "blot_herald"];
    s.essence = 5;
    s.sight = 2;
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true, stained: true });
    const handBefore = s.hand.length;
    const sightBefore = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.sight).toBe(sightBefore + 1);
    expect(s.hand.length).toBe(handBefore); // spent rite, drew 1 → same count if deck has cards
    expect(s.altitudes[1].blinded).toBe(true);
  });
});

describe("Ink Abyss Wave 3 lane / grind", () => {
  it("pool has Cliff Silt Matron Cairn Surge", () => {
    expect(getCard("cliff_maw").type).toBe("figure");
    expect(getCard("silt_warden").type).toBe("figure");
    expect(getCard("ink_matron").type).toBe("figure");
    expect(getCard("gulf_cairn").type).toBe("site");
    expect(getCard("mire_surge").type).toBe("rite");
  });

  it("Cliff Maw Revelation on High stains Blinds and gains Sight", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 30 });
    s.altitudes[0].player = fig("cliff_maw", { veiled: true });
    s.altitudes[0].enemy = fig("pale_ledger", { veiled: false });
    s.sight = 5;
    const before = s.sight;
    const ev = applyIntent(s, { kind: "witness", altitude: 0 });
    expect(s.altitudes[0].enemy?.stained).toBe(true);
    expect(ev.some((e) => e.type === "blind" && e.altitude === 0)).toBe(true);
    // High own Witness cost 1 + Revelation gain 1
    expect(s.sight).toBe(before - 1 + 1);
  });

  it("Cliff Maw Veiled win on High draws", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 31 });
    s.altitudes[0].player = fig("cliff_maw", { veiled: true });
    s.altitudes[0].enemy = fig("pale_ledger", { veiled: true });
    s.hand = [];
    s.deck = ["blot_herald"];
    bothPassResolve(s);
    expect(s.hand).toContain("blot_herald");
  });

  it("Silt Warden Revelation Blinds Low and draws if Stained there", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 32 });
    s.altitudes[1].player = fig("silt_warden", { veiled: true });
    s.altitudes[2].enemy = fig("pale_ledger", { veiled: true, stained: true });
    s.sight = 5;
    s.hand = [];
    s.deck = ["blot_herald"];
    const ev = applyIntent(s, { kind: "witness", altitude: 1 });
    expect(ev.some((e) => e.type === "blind" && e.altitude === 2)).toBe(true);
    expect(s.hand).toContain("blot_herald");
  });

  it("Ink Matron Veiled on Mid gains power if Stained enemy exists", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 33 });
    s.altitudes[1].player = fig("ink_matron", { veiled: true });
    expect(unitPower(s, 1, "player")).toBe(2);
    s.altitudes[2].enemy = fig("blot_herald", { veiled: true, stained: true });
    expect(unitPower(s, 1, "player")).toBe(3);
  });

  it("Ink Matron Witnessed on Mid buffs Ink vs Stained", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 34 });
    s.altitudes[1].player = fig("ink_matron", { veiled: false, revelationFired: true });
    s.altitudes[0].player = fig("blot_herald", { veiled: true });
    s.altitudes[0].enemy = fig("pale_ledger", { veiled: true, stained: true });
    expect(unitPower(s, 0, "player")).toBe(getCard("blot_herald").veiledPower + 1);
  });

  it("Gulf Cairn on enemy Fall stains elsewhere and gains Sight", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 35 });
    s.altitudes[1].playerSite = "gulf_cairn";
    s.altitudes[1].player = fig("mire_duelist", { veiled: false, revelationFired: true });
    s.altitudes[1].enemy = fig("pale_ledger", {
      veiled: false,
      stained: true,
      strained: true,
      revelationFired: true,
    });
    s.altitudes[2].enemy = fig("well_cantor", { veiled: true });
    s.sight = 2;
    const before = s.sight;
    bothPassResolve(s);
    expect(s.altitudes[1].enemy).toBeNull();
    expect(s.altitudes[2].enemy?.stained).toBe(true);
    // Cairn +1 Resolve; beginTurn +1 income
    expect(s.sight).toBe(before + 1 + 1);
  });

  it("Mire Surge arms +1 vs Stained and Blinds Low", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 36 });
    s.hand = ["mire_surge"];
    s.essence = 5;
    s.altitudes[1].player = fig("blot_herald", { veiled: true });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true, stained: true });
    const ev = applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.mireSurgeArmed.player).toBe(true);
    expect(ev.some((e) => e.type === "blind" && e.altitude === 2)).toBe(true);
    expect(unitPower(s, 1, "player")).toBe(getCard("blot_herald").veiledPower + 1);
  });
});

describe("Ink Abyss Wave 4 closing pack", () => {
  it("pool has Dahaka Sovereign and kit tools", () => {
    const d = getCard("dahaka");
    expect(d.sovereign).toBe(true);
    expect(d.type).toBe("figure");
    expect(getCard("echo_blot").type).toBe("rite");
    expect(getCard("blot_lens").type).toBe("relic");
    expect(getCard("stainwell").type).toBe("site");
    expect(getCard("abyss_urn").type).toBe("vessel");
    expect(CARDS.filter((c) => c.sovereign)).toHaveLength(4);
  });

  it("Constructed allows 1× Dahaka", () => {
    const d = teachDeck().map((id) => (id === "mire_surge" ? "dahaka" : id));
    // teach has 2× mire_surge — replace both would be 2 sovereign; replace one only
    const deck = [...teachDeck()];
    const i = deck.indexOf("mire_surge");
    deck[i] = "dahaka";
    expect(validateConstructedDeck(deck).ok).toBe(true);
    deck[deck.indexOf("mire_surge")] = "dahaka";
    expect(validateConstructedDeck(deck).ok).toBe(false);
  });

  it("Dahaka Revelation stains board; 2+ draws and Blinds Mid", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 40 });
    s.altitudes[1].player = fig("dahaka", { veiled: true });
    s.altitudes[0].enemy = fig("pale_ledger", { veiled: true });
    s.altitudes[2].enemy = fig("well_cantor", { veiled: false });
    s.sight = 8;
    s.hand = [];
    s.deck = ["blot_herald"];
    const ev = applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[0].enemy?.stained).toBe(true);
    expect(s.altitudes[2].enemy?.stained).toBe(true);
    expect(s.hand).toContain("blot_herald");
    expect(ev.some((e) => e.type === "blind" && e.altitude === 1)).toBe(true);
  });

  it("Dahaka Veiled gains Sight on Forced Expose", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 41 });
    s.altitudes[0].player = fig("dahaka", { veiled: true });
    s.altitudes[1].player = fig("blot_herald", { veiled: false });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true, stained: true });
    s.sight = 2;
    const before = s.sight;
    bothPassResolve(s);
    expect(s.altitudes[1].enemy?.veiled).toBe(false);
    // Dahaka +1 Resolve; beginTurn +1 income
    expect(s.sight).toBe(before + 1 + 1);
  });

  it("Dahaka Witnessed Blinds on Forced Expose", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 42 });
    s.altitudes[0].player = fig("dahaka", { veiled: false, revelationFired: true });
    s.altitudes[1].player = fig("blot_herald", { veiled: false });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true, stained: true });
    s.passed.player = true;
    s.active = "enemy";
    const ev = applyIntent(s, { kind: "pass" });
    expect(ev.some((e) => e.type === "blind" && e.altitude === 1)).toBe(true);
  });

  it("Echo Blot stains Mid and draws", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 43 });
    s.hand = ["echo_blot"];
    s.essence = 5;
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true });
    s.deck = ["blot_herald", ...s.deck];
    s.hand = ["echo_blot"];
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].enemy?.stained).toBe(true);
    expect(s.hand).toContain("blot_herald");
  });

  it("Blot Lens pays Sight when Blind hits Stained", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 44 });
    s.altitudes[1].player = fig("blot_herald", {
      veiled: false,
      revelationFired: true,
      grafts: [{ instanceId: "g1", cardId: "blot_lens" }],
    });
    s.altitudes[2].enemy = fig("pale_ledger", { veiled: true, stained: true });
    s.hand = ["mire_surge"];
    s.essence = 5;
    s.sight = 5;
    const before = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    // Surge Blinds Low (Stained) → Lens +1 Sight
    expect(s.sight).toBe(before + 1);
  });

  it("Stainwell play stains Veiled enemy here", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 45 });
    s.hand = ["stainwell", "blot_herald"];
    s.essence = 5;
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true });
    applyIntent(s, { kind: "play", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].playerSite).toBe("stainwell");
    expect(s.altitudes[1].enemy?.stained).toBe(true);
  });

  it("Abyss Urn Revelation stains and returns Inhabitant to hand while Urn occupies", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 46 });
    s.altitudes[1].player = fig("abyss_urn", {
      veiled: true,
      inhabitant: "blot_herald",
    });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: false });
    s.sight = 5;
    s.hand = [];
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.altitudes[1].player?.cardId).toBe("abyss_urn");
    expect(s.altitudes[1].player?.inhabitant).toBeNull();
    expect(s.hand).toContain("blot_herald");
    expect(s.altitudes[1].enemy?.stained).toBe(true);
  });

  it("Press into Motley Stance B is free (still once per window)", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 77 });
    s.altitudes[1].player = fig("blot_herald", { veiled: false, revelationFired: true });
    s.altitudes[1].enemy = fig("whitecard_mummer", {
      veiled: true,
      stained: false,
      stanceB: true,
    });
    s.sight = 0;
    expect(legalIntents(s).some((i) => i.kind === "press" && i.altitude === 1)).toBe(true);
    applyIntent(s, { kind: "press", altitude: 1 });
    expect(s.sight).toBe(0);
    expect(s.altitudes[1].enemy?.pressed).toBe(true);
  });
});
