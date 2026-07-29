import { describe, it, expect } from "vitest";
import { newGame } from "./board";
import { beginTurn, skipAbility } from "./turn";
import { aiPickMove, aiTurn } from "./ai";
import type { GameState, Piece } from "./types";

function bareKing(color: "w" | "b"): Piece {
  return {
    kind: "K",
    color,
    isShielded: false,
    shieldExpiresTurn: -1,
    nexusTurnCount: 0,
    hasMoved: true,
  };
}

describe("ai", () => {
  it("picks a legal move from opening", () => {
    let s = beginTurn(newGame());
    s = skipAbility(s);
    const move = aiPickMove(s);
    expect(move).not.toBeNull();
    expect(s.board.get(move!.from)!.color).toBe("w");
  });

  it("prioritizes capturing king in Nexus (instant win)", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("d3", {
      kind: "R",
      color: "w",
      isShielded: false,
      shieldExpiresTurn: -1,
      nexusTurnCount: 0,
      hasMoved: true,
    });
    s.board.set("d4", bareKing("b"));
    s.board.set("e1", bareKing("w"));
    // Also give a distraction move
    s.board.set("a2", {
      kind: "P",
      color: "w",
      isShielded: false,
      shieldExpiresTurn: -1,
      nexusTurnCount: 0,
      hasMoved: false,
    });
    s = beginTurn(s);
    const move = aiPickMove(s);
    expect(move).not.toBeNull();
    expect(move!.from).toBe("d3");
    expect(move!.to).toBe("d4");
  });

  it("aiTurn executes a full turn and swaps player", () => {
    let s = beginTurn(newGame());
    s = aiTurn(s);
    // After AI (white) move, should be black's turn or white won
    if (!s.winner) {
      expect(s.activeColor).toBe("b");
    }
  });

  it("prefers moving into Nexus", () => {
    let s = newGame();
    s.board = new Map();
    // White pawn that can move into Nexus (d4)
    s.board.set("d2", {
      kind: "P",
      color: "w",
      isShielded: false,
      shieldExpiresTurn: -1,
      nexusTurnCount: 0,
      hasMoved: false,
    });
    // White king far away
    s.board.set("a1", bareKing("w"));
    s.board.set("h8", bareKing("b"));
    s = beginTurn(s);
    const move = aiPickMove(s);
    // Pawn can go d3 or d4; d4 is Nexus so should be preferred
    expect(move!.to).toBe("d4");
  });
});
