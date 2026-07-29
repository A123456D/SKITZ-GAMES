import { describe, it, expect } from "vitest";
import { newGame } from "./board";
import { beginTurn, skipAbility } from "./turn";
import { aiPickMove, aiTurn, distToNexus } from "./ai";
import type { Piece } from "./types";

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

function piece(
  kind: Piece["kind"],
  color: "w" | "b",
): Piece {
  return {
    kind,
    color,
    isShielded: false,
    shieldExpiresTurn: -1,
    nexusTurnCount: 0,
    hasMoved: true,
  };
}

describe("ai", () => {
  it("distToNexus is 0 on nexus and grows outward", () => {
    expect(distToNexus("d4")).toBe(0);
    expect(distToNexus("d3")).toBe(1);
    expect(distToNexus("a1")).toBeGreaterThan(distToNexus("d3"));
  });

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
    s.board.set("d3", piece("R", "w"));
    s.board.set("d4", bareKing("b"));
    s.board.set("e1", bareKing("w"));
    s.board.set("a2", piece("P", "w"));
    s = beginTurn(s);
    const move = aiPickMove(s);
    expect(move!.from).toBe("d3");
    expect(move!.to).toBe("d4");
  });

  it("moves king into Nexus over capturing material", () => {
    let s = newGame();
    s.board = new Map();
    // King one step from Nexus
    s.board.set("d3", bareKing("w"));
    // Tempting capture far away
    s.board.set("a4", piece("Q", "b"));
    s.board.set("a3", piece("R", "w")); // can take the queen
    s.board.set("h8", bareKing("b"));
    s = beginTurn(s);
    const move = aiPickMove(s);
    expect(move!.from).toBe("d3");
    expect(["d4", "e4", "e3", "c4", "c3", "d2", "c2", "e2"]).toContain(move!.to);
    // Must enter nexus if possible — d4 and e4 are nexus from d3
    expect(move!.to === "d4" || move!.to === "e4").toBe(true);
  });

  it("marches king closer to Nexus when not adjacent", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("e1", bareKing("w"));
    s.board.set("e8", bareKing("b"));
    s = beginTurn(s);
    const before = distToNexus("e1");
    const move = aiPickMove(s);
    expect(move!.from).toBe("e1");
    const after = distToNexus(move!.to);
    expect(after).toBeLessThan(before);
  });

  it("prefers keeping king in Nexus over leaving", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("d4", { ...bareKing("w"), nexusTurnCount: 1 });
    s.board.set("e8", bareKing("b"));
    // Distraction capture
    s.board.set("a7", piece("P", "b"));
    s.board.set("a2", piece("R", "w"));
    s = beginTurn(s);
    // If AI moves the king, it should stay in Nexus
    const move = aiPickMove(s);
    if (move!.from === "d4") {
      expect(["d4", "d5", "e4", "e5"]).toContain(move!.to);
    }
  });

  it("aiTurn executes a full turn and swaps player", () => {
    let s = beginTurn(newGame());
    s = aiTurn(s);
    if (!s.winner) {
      expect(s.activeColor).toBe("b");
    }
  });

  it("prefers moving a piece into Nexus when king cannot", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("d2", piece("P", "w"));
    s.board.set("a1", bareKing("w"));
    s.board.set("h8", bareKing("b"));
    s = beginTurn(s);
    const move = aiPickMove(s);
    // King from a1 cannot reach nexus in one move; pawn can go d4
    // King march from a1 might still win scoring — either king closer OR pawn to nexus
    expect(move).not.toBeNull();
    if (move!.from === "d2") {
      expect(move!.to).toBe("d4");
    } else {
      expect(move!.from).toBe("a1");
      expect(distToNexus(move!.to)).toBeLessThan(distToNexus("a1"));
    }
  });
});
