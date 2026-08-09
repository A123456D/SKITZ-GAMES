import { describe, expect, it } from "vitest";
import { createMatch, sidePlaysHeresy } from "./match";
import { teachDeckMotley, teachDeck } from "./cards";

describe("craftKits sticky Motley kit", () => {
  it("keeps Motley craft identity after Motley figures leave the board", () => {
    const s = createMatch({
      seed: 9,
      deck: teachDeckMotley(),
      enemyDeck: teachDeck(),
    });
    expect(s.craftKits.player).toContain("motley");
    expect(sidePlaysHeresy(s, "player", "motley")).toBe(true);

    // Clear board / hand / deck Motley presence — kit should still stick
    for (let a = 0; a < 3; a++) {
      s.altitudes[a as 0 | 1 | 2].player = null;
      s.altitudes[a as 0 | 1 | 2].playerSite = null;
    }
    s.hand = [];
    s.deck = [];
    s.prophecies = [];
    expect(sidePlaysHeresy(s, "player", "motley")).toBe(true);
    expect(sidePlaysHeresy(s, "player", "ink")).toBe(false);
  });
});
