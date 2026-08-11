import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { CARDS, getCard, teachDeck, teachDeckMotley } from "./cards";
import { MOTLEY_MASQUERADE_WAVE1 } from "./motleyMasqueradeWave1";
import { MOTLEY_MASQUERADE_WAVE2 } from "./motleyMasqueradeWave2";
import { MOTLEY_MASQUERADE_WAVE3 } from "./motleyMasqueradeWave3";
import { MOTLEY_MASQUERADE_WAVE4 } from "./motleyMasqueradeWave4";
import { setMotleyWagerMode } from "./motleyKit";
import { validateConstructedDeck } from "./construct";
import { applyIntent, createMatch, legalIntents, unitPower } from "./match";
import type { BoardUnit, MatchState, OculusEvent } from "./types";

beforeEach(() => setMotleyWagerMode("cashbust"));
afterAll(() => setMotleyWagerMode("cashbust"));

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

describe("Motley Masquerade Wave 1", () => {
  it("registers five Motley Figures in live CARDS", () => {
    expect(CARDS.filter((c) => c.heresy === "motley")).toHaveLength(20);
    expect(MOTLEY_MASQUERADE_WAVE1).toHaveLength(5);
    for (const id of [
      "whitecard_mummer",
      "diamond_widow",
      "split_hymn_cantor",
      "masked_usher",
      "grinning_debtor",
    ]) {
      const c = getCard(id);
      expect(c.heresy).toBe("motley");
      expect(c.type).toBe("figure");
      expect(c.veiledAbility?.length).toBeGreaterThan(0);
      expect(c.revelation?.length).toBeGreaterThan(0);
    }
  });

  it("Motley Teach is legal Constructed 20 (curated package, no Lady Masque)", () => {
    const d = teachDeckMotley();
    expect(d).toHaveLength(20);
    expect(validateConstructedDeck(d).ok).toBe(true);
    expect(d.every((id) => getCard(id).heresy === "motley")).toBe(true);
    expect(d.includes("lady_masque")).toBe(false);
    expect(d.includes("final_raise")).toBe(false);
  });

  it("Wager antes 1 Sight and Cash refunds + Mummer Favor on Veiled win", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 101 });
    s.altitudes[1].player = fig("whitecard_mummer", { veiled: true, stanceB: true });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.sight = 3;
    const before = s.sight;
    expect(legalIntents(s).some((i) => i.kind === "wager" && i.altitude === 1)).toBe(true);
    applyIntent(s, { kind: "wager", altitude: 1 });
    expect(s.altitudes[1].player?.wagered).toBe(true);
    expect(s.altitudes[1].player?.wagerAntePaid).toBe(true);
    expect(s.sight).toBe(before - 1);
    expect(unitPower(s, 1, "player")).toBeGreaterThan(unitPower(s, 1, "enemy"));
    const favorBefore = s.favor;
    const sightAfterAnte = s.sight;
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "cash")).toBe(true);
    expect(s.altitudes[1].player?.wagered).toBe(false);
    expect(s.favor).toBeGreaterThan(favorBefore);
    expect(ev.some((e) => e.type === "favor")).toBe(true);
    expect(sightAfterAnte).toBe(before - 1);
  });

  it("Bust on Resolve lose clears Wager without refund; Widow Blinds", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 102 });
    s.altitudes[1].player = fig("diamond_widow", {
      veiled: true,
      wagered: true,
      wagerAntePaid: true,
    });
    s.altitudes[1].enemy = fig("smother_bride", { veiled: false });
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "bust")).toBe(true);
    expect(ev.some((e) => e.type === "cash")).toBe(false);
    expect(s.altitudes[1].player?.wagered).toBe(false);
    expect(s.altitudes[1].player).not.toBeNull();
    // Blind fires in Resolve then roundStart clears — assert via event
    expect(ev.some((e) => e.type === "blind" && e.altitude === 1)).toBe(true);
  });

  it("own Witness Folds Wager without refund; Mummer Revelation gains Sight if was Wagered", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 103 });
    s.altitudes[1].player = fig("whitecard_mummer", {
      veiled: true,
      wagered: true,
      wagerAntePaid: true,
    });
    s.sight = 5;
    const before = s.sight;
    const ev = applyIntent(s, { kind: "witness", altitude: 1 });
    expect(ev.some((e) => e.type === "fold")).toBe(true);
    expect(s.altitudes[1].player?.wagered).toBe(false);
    // Witness cost −1, Mid Witness +1 Sight, Revelation if was Wagered +1 Sight
    expect(s.sight).toBe(before - 1 + 1 + 1);
    expect(s.altitudes[1].player?.stanceB).toBe(true);
  });

  it("Masked Usher Free Wagers when enemy Forced Exposed elsewhere", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 104 });
    s.altitudes[0].player = fig("masked_usher", { veiled: true });
    s.altitudes[1].player = fig("smother_bride", { veiled: false });
    s.altitudes[1].enemy = fig("pale_ledger", { veiled: true, stained: true });
    bothPassResolve(s);
    expect(s.altitudes[1].enemy?.veiled).toBe(false);
    expect(s.altitudes[0].player?.wagered).toBe(true);
    expect(s.altitudes[0].player?.wagerAntePaid).toBe(false);
  });

  it("Grinning Debtor gains Favor on first friendly Bust", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 105 });
    s.altitudes[0].player = fig("grinning_debtor", { veiled: true });
    s.altitudes[1].player = fig("whitecard_mummer", {
      veiled: true,
      wagered: true,
      wagerAntePaid: true,
    });
    s.altitudes[1].enemy = fig("smother_bride", { veiled: false });
    const favorBefore = s.favor;
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "bust")).toBe(true);
    expect(s.favor).toBeGreaterThan(favorBefore);
  });

  it("Cantor Hold switches another friendly Stance", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 106 });
    s.altitudes[1].player = fig("split_hymn_cantor", { veiled: true });
    s.altitudes[0].player = fig("whitecard_mummer", { veiled: true, stanceB: false });
    s.altitudes[1].enemy = fig("smother_bride", { veiled: false });
    bothPassResolve(s);
    expect(s.altitudes[0].player?.stanceB).toBe(true);
  });

  it("Stance B Motley Holds through Stain Erase", () => {
    const s = createMatch({ deck: teachDeck(), enemyDeck: teachDeck(), seed: 107 });
    s.altitudes[1].player = fig("whitecard_mummer", {
      veiled: true,
      stanceB: true,
      stained: true,
    });
    s.altitudes[1].enemy = fig("smother_bride", { veiled: false });
    bothPassResolve(s);
    expect(s.altitudes[1].player?.veiled).toBe(true);
  });

  it("Motley Stance B power-swap requires Wager", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 108 });
    s.altitudes[1].player = fig("whitecard_mummer", { veiled: true, stanceB: true });
    expect(unitPower(s, 1, "player")).toBe(getCard("whitecard_mummer").veiledPower);
    s.altitudes[1].player!.wagered = true;
    s.altitudes[1].player!.wagerAntePaid = true;
    expect(unitPower(s, 1, "player")).toBe(getCard("whitecard_mummer").witnessedPower);
  });
});

describe("Motley Masquerade Wave 2", () => {
  it("registers Wave 2 support with unique names", () => {
    expect(MOTLEY_MASQUERADE_WAVE2).toHaveLength(5);
    const names = new Set(CARDS.map((c) => c.name));
    const ids = new Set(CARDS.map((c) => c.id));
    for (const c of MOTLEY_MASQUERADE_WAVE2) {
      expect(ids.has(c.id)).toBe(true);
      expect(names.has(c.name)).toBe(true);
      expect(getCard(c.id).name).toBe(c.name);
    }
    // No collisions with Wave 1
    for (const c of MOTLEY_MASQUERADE_WAVE1) {
      expect(MOTLEY_MASQUERADE_WAVE2.some((w) => w.id === c.id || w.name === c.name)).toBe(false);
    }
  });

  it("Raise the Ante pays Sight to Wager; already Wagered Blinds", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 201 });
    s.hand = ["raise_the_ante"];
    s.essence = 5;
    s.sight = 3;
    s.altitudes[1].player = fig("whitecard_mummer", { veiled: true });
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].player?.wagered).toBe(true);
    expect(s.altitudes[1].player?.wagerAntePaid).toBe(true);
    expect(s.sight).toBe(2);
    s.hand = ["raise_the_ante"];
    s.essence = 5;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.altitudes[1].blinded).toBe(true);
  });

  it("Velvet Antehall pays Sight on Stance switch", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 202 });
    s.altitudes[1].player = fig("whitecard_mummer", { veiled: true, stanceB: false });
    s.altitudes[1].playerSite = "velvet_antehall";
    s.sight = 3;
    const before = s.sight;
    applyIntent(s, { kind: "stance", altitude: 1 });
    expect(s.sight).toBe(before + 1);
  });

  it("Scarlet Dealer Cashes into Favor; Bust feeds foe Sight", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 203 });
    s.altitudes[1].player = fig("scarlet_dealer", {
      veiled: true,
      stanceB: true,
      wagered: true,
      wagerAntePaid: true,
    });
    s.altitudes[0].player = fig("whitecard_mummer", { veiled: true });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    expect(unitPower(s, 1, "player")).toBeGreaterThan(unitPower(s, 1, "enemy"));
    const favorBefore = s.favor;
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "cash")).toBe(true);
    expect(s.favor).toBeGreaterThan(favorBefore);
    expect(s.altitudes[0].player?.wagered).toBe(false);
  });

  it("Scarlet Dealer Bust gives opponent Sight", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 204 });
    s.altitudes[1].player = fig("scarlet_dealer", {
      veiled: true,
      wagered: true,
      wagerAntePaid: true,
    });
    s.altitudes[1].enemy = fig("smother_bride", { veiled: false });
    s.enemySight = 2;
    const before = s.enemySight;
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "bust")).toBe(true);
    // Bust +1, then roundStart may add enemy income — at least ante loss + foe Sight event path
    expect(s.enemySight).toBeGreaterThanOrEqual(before + 1);
  });

  it("Masque Urn Revelation Free Wagers self", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 205 });
    s.altitudes[1].player = fig("masque_urn", { veiled: true });
    s.sight = 5;
    applyIntent(s, { kind: "witness", altitude: 1 });
    // Fold clears prior ante; Revelation Free Wagers after — foldAfter was false so Free Wager sticks
    expect(s.altitudes[1].player?.wagered).toBe(true);
    expect(s.altitudes[1].player?.wagerAntePaid).toBe(false);
  });
});

describe("Motley Masquerade Wave 3", () => {
  it("registers Wave 3 with unique names", () => {
    expect(MOTLEY_MASQUERADE_WAVE3).toHaveLength(5);
    const names = CARDS.map((c) => c.name);
    const ids = CARDS.map((c) => c.id);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of MOTLEY_MASQUERADE_WAVE3) {
      expect(getCard(c.id).name).toBe(c.name);
    }
  });

  it("Gala Call grants Favor and arms Stance B surge", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 301 });
    s.hand = ["gala_call"];
    s.essence = 5;
    s.altitudes[1].player = fig("whitecard_mummer", { veiled: true, stanceB: true });
    const before = unitPower(s, 1, "player");
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.favor).toBe(1);
    expect(s.galaSurgeArmed.player).toBe(true);
    expect(unitPower(s, 1, "player")).toBe(before + 1);
  });

  it("Favor Broker antes Sight and Cashes with refund + Favor", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 302 });
    s.sight = 3;
    s.altitudes[1].player = fig("favor_broker", { veiled: true, stanceB: true });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    applyIntent(s, { kind: "wager", altitude: 1 });
    expect(s.sight).toBe(2);
    expect(s.altitudes[1].player?.wagerAnteFavor).toBe(false);
    const favorBefore = s.favor;
    const ev = bothPassResolve(s);
    expect(ev.some((e) => e.type === "cash")).toBe(true);
    expect(s.favor).toBeGreaterThan(favorBefore);
  });

  it("Spire Caprice gets +1 on High while Wagered", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 303 });
    s.altitudes[0].player = fig("spire_caprice", { veiled: true, wagered: true });
    expect(unitPower(s, 0, "player")).toBe(getCard("spire_caprice").veiledPower + 1);
  });

  it("Gala Mirrorhall buffs Stance B while Favor > 0", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 304 });
    s.favor = 1;
    s.altitudes[1].player = fig("whitecard_mummer", { veiled: true, stanceB: true });
    s.altitudes[1].playerSite = "gala_mirrorhall";
    const withFav = unitPower(s, 1, "player");
    s.favor = 0;
    expect(unitPower(s, 1, "player")).toBe(withFav - 1);
  });
});

describe("Motley Masquerade Wave 4", () => {
  it("registers closing pack and Lady Masque Sovereign", () => {
    expect(MOTLEY_MASQUERADE_WAVE4).toHaveLength(5);
    expect(CARDS.filter((c) => c.heresy === "motley")).toHaveLength(20);
    expect(CARDS).toHaveLength(120);
    const lm = getCard("lady_masque");
    expect(lm.sovereign).toBe(true);
    expect(getCard("blindfold_charm").type).toBe("relic");
    expect(getCard("carnival_urn").type).toBe("vessel");
    expect(getCard("antewell").type).toBe("site");
    expect(getCard("final_raise").type).toBe("rite");
    const names = CARDS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("Antewell buffs Wagered Figures", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 401 });
    s.altitudes[1].player = fig("whitecard_mummer", { veiled: true, wagered: true });
    s.altitudes[1].playerSite = "antewell";
    expect(unitPower(s, 1, "player")).toBe(getCard("whitecard_mummer").veiledPower + 1);
  });

  it("Final Raise spends Favor for Eclipse when target is Wagered", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 402 });
    s.hand = ["final_raise"];
    s.essence = 5;
    s.favor = 1;
    s.altitudes[1].player = fig("whitecard_mummer", { veiled: true, wagered: true });
    const before = s.eclipse;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.favor).toBe(0);
    expect(s.eclipse).toBe(before + 1);
  });

  it("Final Raise without Favor gains Sight when Wagered", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 404 });
    s.hand = ["final_raise"];
    s.essence = 5;
    s.favor = 0;
    s.sight = 2;
    s.altitudes[1].player = fig("diamond_widow", { veiled: true, wagered: true });
    const before = s.eclipse;
    const sightBefore = s.sight;
    applyIntent(s, { kind: "rite", handIndex: 0, altitude: 1 });
    expect(s.eclipse).toBe(before);
    expect(s.sight).toBeGreaterThan(sightBefore);
  });

  it("Lady Masque Witnessed: Cash 2+ → Eclipse; Veiled Masque is Sight-only", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 403 });
    s.favor = 1; // Trick Eclipse needs Favor
    s.altitudes[0].player = fig("lady_masque", { veiled: false, revelationFired: true });
    s.altitudes[1].player = fig("whitecard_mummer", {
      veiled: true,
      wagered: true,
      wagerAntePaid: true,
      stanceB: true,
    });
    s.altitudes[2].player = fig("diamond_widow", {
      veiled: true,
      wagered: true,
      wagerAntePaid: true,
      stanceB: true,
    });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.altitudes[2].enemy = fig("pale_ledger", { veiled: true });
    s.enemySight = 2; // avoid pass-on-0-Sight Eclipse
    const sightBefore = s.sight;
    const eclBefore = s.eclipse;
    const ev = bothPassResolve(s);
    expect(ev.filter((e) => e.type === "cash").length).toBeGreaterThanOrEqual(2);
    expect(s.sight).toBeGreaterThanOrEqual(sightBefore);
    // Paid-ante Trick Eclipse (+1, Favor) + Lady Masque Witnessed 2+ Cash Eclipse (+1)
    expect(s.eclipse).toBe(eclBefore + 2);
  });

  it("Lady Masque Veiled does not mint Cash Eclipse", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 404 });
    s.favor = 0; // no Trick Eclipse either
    s.altitudes[0].player = fig("lady_masque", { veiled: true });
    s.altitudes[1].player = fig("whitecard_mummer", {
      veiled: true,
      wagered: true,
      wagerAntePaid: true,
      stanceB: true,
    });
    s.altitudes[2].player = fig("diamond_widow", {
      veiled: true,
      wagered: true,
      wagerAntePaid: true,
      stanceB: true,
    });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    s.altitudes[2].enemy = fig("pale_ledger", { veiled: true });
    s.enemySight = 2;
    const eclBefore = s.eclipse;
    bothPassResolve(s);
    expect(s.eclipse).toBe(eclBefore);
  });

  it("paid-ante Stance B Motley win grants Trick Eclipse only with Favor; Free Wager does not", () => {
    const s = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 405 });
    s.enemySight = 2;
    s.favor = 1;
    s.favorGainedThisTurn.player = true; // Cash won't mint Favor this beat
    s.altitudes[1].player = fig("whitecard_mummer", {
      veiled: true,
      stanceB: true,
      wagered: true,
      wagerAntePaid: true,
    });
    s.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    const eclBefore = s.eclipse;
    bothPassResolve(s);
    expect(s.eclipse).toBe(eclBefore + 1);
    expect(s.favor).toBe(0); // Trick spends Favor

    const s2 = createMatch({ deck: teachDeckMotley(), enemyDeck: teachDeck(), seed: 406 });
    s2.enemySight = 2;
    s2.favor = 1;
    s2.altitudes[1].player = fig("whitecard_mummer", {
      veiled: true,
      stanceB: true,
      wagered: true,
      wagerAntePaid: false, // Free Wager
    });
    s2.altitudes[1].enemy = fig("well_cantor", { veiled: true });
    const ecl2 = s2.eclipse;
    bothPassResolve(s2);
    expect(s2.eclipse).toBe(ecl2);
  });
});
