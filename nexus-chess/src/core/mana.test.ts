import { describe, it, expect } from "vitest";
import { newGame } from "./board";
import { startTurnMana, spendMana } from "./mana";
import type { GameState } from "./types";

function placeInNexus(s: GameState, count: number) {
  const nexus = ["d4", "d5", "e4", "e5"];
  for (let i = 0; i < count; i++) {
    s.board.set(nexus[i], {
      kind: "P",
      color: "w",
      isShielded: false,
      shieldExpiresTurn: -1,
      nexusTurnCount: 0,
      hasMoved: true,
    });
  }
}

describe("mana", () => {
  it("passive +1 at start of turn", () => {
    const s = newGame();
    s.board = new Map(); // clear board so no nexus bonus
    const s2 = startTurnMana(s);
    expect(s2.players[0].mana).toBe(3);
  });

  it("+1 per piece in Nexus", () => {
    const s = newGame();
    s.board = new Map();
    placeInNexus(s, 3);
    const s2 = startTurnMana(s);
    // starting 2 +1 passive + 3 nexus = 6
    expect(s2.players[0].mana).toBe(6);
  });

  it("caps at 10", () => {
    const s = newGame();
    s.board = new Map();
    s.players[0].mana = 9;
    placeInNexus(s, 4);
    const s2 = startTurnMana(s);
    expect(s2.players[0].mana).toBe(10);
  });

  it("spendMana deducts cost", () => {
    const s = newGame();
    s.players[0].mana = 5;
    const s2 = spendMana(s, 3);
    expect(s2).not.toBeNull();
    expect(s2!.players[0].mana).toBe(2);
  });

  it("spendMana returns null if insufficient", () => {
    const s = newGame();
    s.players[0].mana = 2;
    expect(spendMana(s, 3)).toBeNull();
  });
});
