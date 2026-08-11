import { describe, expect, it } from "vitest";
import { CARDS, getCard, teachDeck, teachDeckToll } from "./cards";
import { BELLWARD_TOLL_WAVE1 } from "./bellwardTollWave1";
import { validateConstructedDeck } from "./construct";
import { applyIntent, createMatch, legalIntents, unitPower } from "./match";
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

function bothPassResolve(s: MatchState): OculusEvent[] {
  s.passed.player = true;
  s.active = "enemy";
  return applyIntent(s, { kind: "pass" });
}

describe("Bellward Toll Wave 1", () => {
  it("registers twenty Toll cards in live CARDS", () => {
    expect(CARDS.filter((c) => c.heresy === "toll")).toHaveLength(20);
    expect(BELLWARD_TOLL_WAVE1).toHaveLength(5);
    for (const id of [
      "bell_debt_walker",
      "bell_siren",
      "clapper_cantor",
      "veil_ringer",
      "parasol_debtor",
    ]) {
      const c = getCard(id);
      expect(c.heresy).toBe("toll");
      expect(c.type).toBe("figure");
      expect(c.revelation?.length).toBeGreaterThan(0);
    }
    expect(getCard("bell_siren").witnessCost).toBe(1);
  });

  it("Toll Teach is legal Constructed 20 (curated, no Carillon)", () => {
    const d = teachDeckToll();
    expect(d).toHaveLength(20);
    expect(validateConstructedDeck(d).ok).toBe(true);
    expect(d.every((id) => getCard(id).heresy === "toll")).toBe(true);
    expect(d.includes("carillon")).toBe(false);
  });

  it("own Witness does not pay Toll; enemy Witness / Lure does", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 501 });
    s.altitudes[1].player = fig("parasol_debtor", { veiled: true });
    s.tollOwner[1] = "player";
    s.sight = 4;
    const before = s.sight;
    const ev = applyIntent(s, { kind: "witness", altitude: 1 });
    expect(ev.some((e) => e.type === "toll_pay")).toBe(false);
    expect(s.tollOwner[1]).toBe("player");
    // Mid Witness −1 + Mid Sight +1; Parasol Rev +1 Sight
    expect(s.sight).toBe(before - 1 + 1 + 1);

    // Lure on Tolled Mid pays Toll + Resonance
    const s2 = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 5011 });
    s2.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s2.tollOwner[1] = "player";
    s2.hand = ["sound_the_toll"];
    s2.essence = 1;
    s2.sight = 5;
    const before2 = s2.sight;
    const ev2 = applyIntent(s2, { kind: "rite", handIndex: 0, altitude: 1 });
    // Lure on Tolled Mid clears own Toll free + Resonance (enemy tax only)
    expect(ev2.some((e) => e.type === "toll_pay" && e.paid === false)).toBe(true);
    expect(ev2.some((e) => e.type === "resonance" && e.side === "player")).toBe(true);
    expect(s2.tollOwner[1]).toBeNull();
    // Lure Mid Witness −1 only (own Toll does not tax)
    expect(s2.sight).toBe(before2 - 1);
  });

  it("Resolve lose on enemy Toll taxes sticky; unpaid ring still Resonates", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 502 });
    s.altitudes[1].player = fig("parasol_debtor", { veiled: true });
    s.altitudes[1].enemy = fig("smother_bride", { veiled: false, revelationFired: true });
    s.tollOwner[1] = "enemy";
    s.sight = 0;
    // Ensure enemy wins Mid so player loses into the Toll
    expect(unitPower(s, 1, "enemy")).toBeGreaterThan(unitPower(s, 1, "player"));
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "toll_pay")).toBe(true);
    expect(ev.some((e) => e.type === "resonance")).toBe(true);
    // Resolve spends the trap
    expect(s.tollOwner[1]).toBeNull();
  });

  it("Lure fires Revelation (not Forced Exposed) and Resonance", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 503 });
    s.altitudes[1].player = fig("bell_siren", { veiled: true });
    s.altitudes[0].enemy = fig("well_cantor", { veiled: true, revelationFired: false });
    s.sight = 6;
    s.tollOwner[1] = "player";
    const ev = applyIntent(s, { kind: "witness", altitude: 1 });
    expect(ev.some((e) => e.type === "lure")).toBe(true);
    expect(ev.some((e) => e.type === "witness" && e.enemyTarget)).toBe(true);
    expect(s.altitudes[0].enemy?.veiled).toBe(false);
    expect(s.altitudes[0].enemy?.revelationFired).toBe(true);
    expect(s.altitudes[0].enemy?.strained).toBe(false);
    expect(ev.some((e) => e.type === "resonance")).toBe(true);
  });

  it("kit occupancy: your Figures get +1 on your Tolled altitude", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 507 });
    s.altitudes[1].player = fig("bell_debt_walker", { veiled: true });
    expect(unitPower(s, 1, "player")).toBe(getCard("bell_debt_walker").veiledPower);
    s.tollOwner[1] = "player";
    expect(unitPower(s, 1, "player")).toBe(getCard("bell_debt_walker").veiledPower + 1);
  });

  it("enemy Lure into your Toll taxes then clears", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 516 });
    s.altitudes[1].player = fig("parasol_debtor", { veiled: true });
    s.tollOwner[1] = "player";
    s.active = "enemy";
    s.enemyHand = ["sound_the_toll"];
    s.enemyEssence = 1;
    s.enemySight = 6;
    s.sight = 3;
    const ownerSight = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.tollOwner[1]).toBeNull();
    expect(s.sight).toBeGreaterThanOrEqual(ownerSight + 1);
    expect(s.altitudes[1].player?.veiled).toBe(false);
  });

  it("Debt Walker Hold places Toll", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 511 });
    s.altitudes[1].player = fig("bell_debt_walker", { veiled: true });
    s.altitudes[1].enemy = fig("smother_bride", { veiled: false });
    expect(s.tollOwner[1]).toBeNull();
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "toll" && e.side === "player" && e.altitude === 1)).toBe(
      true,
    );
  });

  it("Cantor Revelation Tolls Mid", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 512 });
    s.altitudes[0].player = fig("clapper_cantor", { veiled: true });
    s.sight = 4;
    const ev = applyIntent(s, { kind: "witness", altitude: 0 });
    expect(ev.some((e) => e.type === "toll" && e.altitude === 1)).toBe(true);
    expect(s.tollOwner[1]).toBe("player");
  });

  it("empty-Sight Pass still grants no Eclipse", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 509 });
    s.sight = 0;
    s.eclipse = 0;
    applyIntent(s, { kind: "pass" });
    expect(s.eclipse).toBe(0);
  });

  it("can open with Toll Teach when Essence allows play", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 510 });
    s.essence = 5;
    s.hand = ["bell_debt_walker", "bell_siren", "clapper_cantor"];
    expect(legalIntents(s).some((i) => i.kind === "play")).toBe(true);
  });
});

describe("Bellward Toll Wave 2", () => {
  it("registers Wave 2 support pack", () => {
    for (const id of [
      "path_bellman",
      "cloth_bellspire",
      "toll_urn",
      "bellcord_charm",
      "sound_the_toll",
    ]) {
      expect(getCard(id).heresy).toBe("toll");
    }
    expect(getCard("path_bellman").type).toBe("figure");
    expect(getCard("cloth_bellspire").type).toBe("site");
    expect(getCard("toll_urn").type).toBe("vessel");
    expect(getCard("bellcord_charm").type).toBe("relic");
    expect(getCard("sound_the_toll").type).toBe("rite");
  });

  it("Sound the Toll places Toll or Lures when already Tolled", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 601 });
    s.hand = ["sound_the_toll"];
    s.essence = 2;
    s.sight = 5;
    const ev = applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.tollOwner[1]).toBe("player");
    expect(ev.some((e) => e.type === "resonance")).toBe(true);

    s.hand = ["sound_the_toll"];
    s.essence = 2;
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    const ev2 = applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(ev2.some((e) => e.type === "lure" || e.type === "witness")).toBe(true);
    expect(s.altitudes[1].enemy?.veiled).toBe(false);
  });

  it("Bell Debt Walker Revelation grants Sight if any Toll", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 513 });
    s.altitudes[1].player = fig("bell_debt_walker", { veiled: true });
    s.tollOwner[0] = "player";
    s.sight = 4;
    const before = s.sight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    // Mid Witness −1 + Mid Sight +1 + Rev Sight +1
    expect(s.sight).toBe(before - 1 + 1 + 1);
  });

  it("Bell Siren is 2 Essence", () => {
    expect(getCard("bell_siren").essence).toBe(2);
    expect(getCard("bell_debt_walker").witnessedPower).toBe(4);
  });

  it("opponent paying your Toll grants you 1 Sight", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 514 });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.tollOwner[1] = "player";
    s.hand = ["sound_the_toll"];
    s.essence = 1;
    s.sight = 5;
    // Lure: player pays own Toll — no trap Sight (payer === owner)
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.tollOwner[1]).toBeNull();

    // Enemy Witnesses own figure on player's Toll
    s.altitudes[2].enemy = fig("pale_ledger", { veiled: true });
    s.tollOwner[2] = "player";
    s.active = "enemy";
    s.enemySight = 5;
    s.sight = 3;
    const before = s.sight;
    // Enemy own-Witness does not pay Toll — need Gaze Witness of player's unit or Lure by enemy
    // Enemy Lures player's Veiled on Tolled Mid via Sound — give enemy the rite
    s.altitudes[1].player = fig("parasol_debtor", { veiled: true });
    s.tollOwner[1] = "player";
    s.enemyHand = ["sound_the_toll"];
    s.enemyEssence = 1;
    s.enemySight = 6;
    const ownerSight = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    // Enemy Lure pays player's Toll → trap Sight; Lure clears
    expect(s.tollOwner[1]).toBeNull();
    expect(s.sight).toBeGreaterThanOrEqual(ownerSight + 1);
  });

  it("Path Bellman buffs when you Toll", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 602 });
    s.altitudes[0].player = fig("path_bellman", { veiled: true });
    const before = unitPower(s, 0, "player");
    s.hand = ["sound_the_toll"];
    s.essence = 2;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 2 });
    expect(s.pathBellmanBuff.player).toBe(true);
    expect(unitPower(s, 0, "player")).toBe(before + 1);
  });

  it("Cloth Bellspire pays Sight when Toll is touched here", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 603 });
    s.altitudes[1].playerSite = "cloth_bellspire";
    s.altitudes[1].player = fig("parasol_debtor", { veiled: true });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.tollOwner[1] = "player";
    s.sight = 4;
    const before = s.sight;
    // Kit occupancy +1
    expect(unitPower(s, 1, "player")).toBe(getCard("parasol_debtor").veiledPower + 1);
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.tollOwner[1]).toBe("player");
    // Mid cost −1 + Mid Sight +1 + Parasol Rev Sight +1
    expect(s.sight).toBe(before - 1 + 1 + 1);
    s.hand = ["sound_the_toll"];
    s.essence = 1;
    const beforeLure = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    // Lure −1 + own clear free + Bellspire +1
    expect(s.sight).toBe(beforeLure - 1 + 1);
    expect(s.tollOwner[1]).toBeNull();
  });

  it("Toll Urn Revelation Tolls its altitude (own Witness leaves the mark)", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 604 });
    s.altitudes[2].player = fig("toll_urn", { veiled: true });
    s.sight = 4;
    const ev = applyIntent(s, { kind: "witness", altitude: 2 });
    expect(ev.some((e) => e.type === "toll" && e.altitude === 2)).toBe(true);
    expect(ev.some((e) => e.type === "toll_pay")).toBe(false);
    expect(s.tollOwner[2]).toBe("player");
  });
});

describe("Bellward Toll Wave 3", () => {
  it("registers Wave 3 lane pack", () => {
    for (const id of [
      "highcliff_ringer",
      "lowcloth_warden",
      "rope_auditor",
      "banner_bellwalk",
      "ring_out",
    ]) {
      expect(getCard(id).heresy).toBe("toll");
    }
    expect(getCard("highcliff_ringer").type).toBe("figure");
    expect(getCard("lowcloth_warden").type).toBe("figure");
    expect(getCard("rope_auditor").type).toBe("figure");
    expect(getCard("banner_bellwalk").type).toBe("site");
    expect(getCard("ring_out").type).toBe("rite");
  });

  it("Highcliff Ringer buffs on Tolled High; Revelation Tolls High or Sight", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 701 });
    s.altitudes[0].player = fig("highcliff_ringer", { veiled: true });
    s.tollOwner[0] = "player";
    // Kit occupancy +1 only
    expect(unitPower(s, 0, "player")).toBe(getCard("highcliff_ringer").veiledPower + 1);

    const s2 = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 702 });
    s2.altitudes[1].player = fig("highcliff_ringer", { veiled: true });
    s2.sight = 5;
    const ev = applyIntent(s2, { kind: "witness", altitude: 1 });
    expect(ev.some((e) => e.type === "toll" && e.altitude === 0)).toBe(true);
    expect(s2.tollOwner[0]).toBe("player");
  });

  it("Lowcloth Warden Hold Blinds Low when Tolled", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 703 });
    s.altitudes[2].player = fig("lowcloth_warden", { veiled: true });
    // Strong Witnessed body so Lowcloth Holds despite kit +1
    s.altitudes[2].enemy = fig("carillon", { veiled: false, revelationFired: true });
    s.tollOwner[2] = "player";
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "blind" && e.altitude === 2)).toBe(true);
  });

  it("Rope Auditor taxes first enemy Witness on Tolled altitude", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 704 });
    s.altitudes[0].player = fig("rope_auditor", { veiled: true });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.tollOwner[1] = "enemy";
    s.active = "enemy";
    s.enemySight = 6;
    const before = s.enemySight;
    applyIntent(s, { kind: "witness", altitude: 1 });
    // Enemy own-Witness: Mid cost 1 + Mid Sight +1 + Rope Auditor tax 1
    expect(s.enemySight).toBe(before - 1 + 1 - 1);
    expect(s.ropeAuditorTaxUsed.player).toBe(true);
    expect(s.tollOwner[1]).toBe("enemy");
  });

  it("Banner Bellwalk grants Sight on Lure", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 705 });
    s.altitudes[1].playerSite = "banner_bellwalk";
    s.altitudes[1].player = fig("parasol_debtor", { veiled: true });
    s.tollOwner[0] = "player";
    // Mid not Tolled — no kit occupancy
    expect(unitPower(s, 1, "player")).toBe(getCard("parasol_debtor").veiledPower);

    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.hand = ["sound_the_toll"];
    s.essence = 1;
    s.sight = 6;
    s.tollOwner[1] = "player";
    const before = s.sight;
    const ev = applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(ev.some((e) => e.type === "lure")).toBe(true);
    expect(ev.some((e) => e.type === "toll_pay")).toBe(true);
    expect(s.altitudes[1].enemy?.veiled).toBe(false);
    // Witness −1 + own clear free + Banner Lure +1 → net 0
    expect(s.sight).toBe(before);
  });

  it("Ring Out Tolls or Resonance+Sight when already Tolled", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 706 });
    s.hand = ["ring_out"];
    s.essence = 2;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.tollOwner[1]).toBe("player");

    s.hand = ["ring_out"];
    s.essence = 2;
    const before = s.sight;
    const ev = applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(ev.some((e) => e.type === "resonance")).toBe(true);
    expect(ev.some((e) => e.type === "blind")).toBe(false);
    expect(s.sight).toBe(before + 1);
    expect(s.altitudes[1].blinded).toBe(false);
  });
});

describe("Bellward Toll Wave 4", () => {
  it("registers Wave 4 closing pack with Carillon Sovereign", () => {
    for (const id of ["carillon", "siren_cord", "peal_urn", "choir_loft", "full_peal"]) {
      expect(getCard(id).heresy).toBe("toll");
    }
    expect(getCard("carillon").sovereign).toBe(true);
    expect(getCard("carillon").type).toBe("figure");
    expect(getCard("siren_cord").type).toBe("relic");
    expect(getCard("peal_urn").type).toBe("vessel");
    expect(getCard("choir_loft").type).toBe("site");
    expect(getCard("full_peal").type).toBe("rite");
  });

  it("Carillon Veiled gains Sight on Resonance; Witnessed Blinds on Lure", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 802 });
    s.altitudes[0].player = fig("carillon", { veiled: true });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.tollOwner[1] = "player";
    s.hand = ["sound_the_toll"];
    s.essence = 1;
    s.sight = 6;
    const sightBefore = s.sight;
    const ev = applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    // Lure on Tolled: Witness −1 + own Toll free + Resonance×2 Carillon +1 each
    // (capped at SIGHT_CARRY_CAP from starting 6)
    expect(ev.some((e) => e.type === "resonance")).toBe(true);
    expect(s.sight).toBe(6);

    const s3 = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 803 });
    s3.altitudes[0].player = fig("carillon", { veiled: false, revelationFired: true });
    s3.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s3.tollOwner[1] = "player";
    s3.hand = ["sound_the_toll"];
    s3.essence = 1;
    s3.sight = 6;
    const ev3 = applyIntent(s3, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(ev3.some((e) => e.type === "lure")).toBe(true);
    expect(ev3.some((e) => e.type === "blind" && e.altitude === 1)).toBe(true);
  });

  it("Carillon Revelation Tolls High and Low", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 801 });
    s.altitudes[1].player = fig("carillon", { veiled: true });
    s.sight = 6;
    applyIntent(s, { kind: "witness", altitude: 1 });
    expect(s.tollOwner[0]).toBe("player");
    expect(s.tollOwner[2]).toBe("player");
  });

  it("Choir Loft pays Sight on Resonance", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 804 });
    s.altitudes[1].playerSite = "choir_loft";
    s.altitudes[1].player = fig("parasol_debtor", { veiled: true });
    s.tollOwner[1] = "player";
    expect(unitPower(s, 1, "player")).toBe(getCard("parasol_debtor").veiledPower + 1);
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.hand = ["sound_the_toll"];
    s.essence = 1;
    s.sight = 5;
    const before = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    // Lure −1 + own clear free + Choir Loft Resonance×2 → net +1
    expect(s.sight).toBe(before + 1);
  });

  it("Full Peal Resonates then gains Sight or Tolls Mid", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 805 });
    s.hand = ["full_peal"];
    s.essence = 2;
    const ev1 = applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.tollOwner[1]).toBe("player");
    expect(ev1.some((e) => e.type === "resonance")).toBe(true);

    s.hand = ["full_peal"];
    s.essence = 2;
    s.sight = 5;
    const before = s.sight;
    const ev = applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(ev.some((e) => e.type === "resonance")).toBe(true);
    expect(s.sight).toBe(before + 1);
  });

  it("Peal Urn Revelation Tolls its altitude first", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 806 });
    s.altitudes[1].player = fig("peal_urn", { veiled: true });
    s.altitudes[0].enemy = fig("well_cantor", { veiled: true });
    s.sight = 5;
    const ev = applyIntent(s, { kind: "witness", altitude: 1 });
    expect(ev.some((e) => e.type === "toll" && e.altitude === 1)).toBe(true);
    expect(s.tollOwner[1]).toBe("player");
    expect(s.altitudes[0].enemy?.veiled).toBe(true);
  });

  it("owning Toll opens Gaze on that altitude", () => {
    const s = createMatch({ deck: teachDeckToll(), enemyDeck: teachDeck(), seed: 807 });
    s.tollOwner[0] = "player";
    s.altitudes[0].enemy = fig("whitecard_mummer", { veiled: true });
    s.sight = 4;
    expect(legalIntents(s).some((i) => i.kind === "witness" && i.enemy && i.altitude === 0)).toBe(
      true,
    );
    const ev = applyIntent(s, { kind: "witness", altitude: 0, enemy: true });
    expect(ev.some((e) => e.type === "witness" && e.enemyTarget)).toBe(true);
    expect(s.altitudes[0].enemy?.veiled).toBe(false);
  });
});
