import { describe, expect, it } from "vitest";
import { CARDS, getCard, teachDeck, teachDeckMotley, teachDeckToll } from "./cards";
import { validateConstructedDeck } from "./construct";
import { applyIntent, createMatch, legalIntents, unitPower } from "./match";

describe("live craft pool", () => {
  it("CARDS is six live crafts at 20 each (120)", () => {
    expect(CARDS.filter((c) => c.heresy === "ink")).toHaveLength(20);
    expect(CARDS.filter((c) => c.heresy === "motley")).toHaveLength(20);
    expect(CARDS.filter((c) => c.heresy === "toll")).toHaveLength(20);
    expect(CARDS.filter((c) => c.heresy === "breach")).toHaveLength(20);
    expect(CARDS.filter((c) => c.heresy === "lumen")).toHaveLength(20);
    expect(CARDS.filter((c) => c.heresy === "ruin")).toHaveLength(20);
    expect(CARDS).toHaveLength(120);
  });

  it("Ink, Motley, and Toll Teach decks are legal Constructed", () => {
    expect(validateConstructedDeck(teachDeck()).ok).toBe(true);
    expect(teachDeck()).toHaveLength(20);
    expect(validateConstructedDeck(teachDeckMotley()).ok).toBe(true);
    expect(teachDeckMotley()).toHaveLength(20);
    expect(validateConstructedDeck(teachDeckToll()).ok).toBe(true);
    expect(teachDeckToll()).toHaveLength(20);
  });

  it("sovereigns are one per finished live craft", () => {
    expect(CARDS.filter((c) => c.sovereign).map((c) => c.id).sort()).toEqual([
      "carillon",
      "dahaka",
      "lady_masque",
      "skaroth",
      "solarch",
      "veloth",
    ]);
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
    expect(unitPower(s, 1, "player")).toBe(getCard("blot_herald").witnessedPower);
  });

  it("Wave 1 figures have dual-mode fields", () => {
    for (const id of ["blot_herald", "smother_bride", "well_cantor", "pale_ledger", "mire_duelist"]) {
      const c = getCard(id);
      expect(c.veiledAbility?.length).toBeGreaterThan(0);
      expect(c.revelation?.length).toBeGreaterThan(0);
    }
  });
});
