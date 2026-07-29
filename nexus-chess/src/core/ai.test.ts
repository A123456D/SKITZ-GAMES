import { describe, it, expect } from "vitest";
import { newGame } from "./board";
import { beginTurn, skipAbility } from "./turn";
import {
  aiPickMove,
  aiTurn,
  distToNexus,
  nextAiDifficulty,
  evaluatePosition,
  AI_DIFFICULTY_LABELS,
} from "./ai";
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

function piece(kind: Piece["kind"], color: "w" | "b"): Piece {
  return {
    kind,
    color,
    isShielded: false,
    shieldExpiresTurn: -1,
    nexusTurnCount: 0,
    hasMoved: true,
  };
}

describe("ai difficulty", () => {
  it("cycles Off → Easy → Normal → Hard → Expert → Off", () => {
    expect(nextAiDifficulty(0)).toBe(1);
    expect(nextAiDifficulty(1)).toBe(2);
    expect(nextAiDifficulty(2)).toBe(3);
    expect(nextAiDifficulty(3)).toBe(4);
    expect(nextAiDifficulty(4)).toBe(0);
    expect(AI_DIFFICULTY_LABELS[4]).toBe("Expert");
  });

  it("distToNexus is 0 on nexus and grows outward", () => {
    expect(distToNexus("d4")).toBe(0);
    expect(distToNexus("d3")).toBe(1);
    expect(distToNexus("a1")).toBeGreaterThan(distToNexus("d3"));
  });

  it("easy returns a legal move", () => {
    let s = beginTurn(newGame());
    s = skipAbility(s);
    const move = aiPickMove(s, 1);
    expect(move).not.toBeNull();
    expect(s.board.get(move!.from)!.color).toBe("w");
  });

  it("normal prioritizes capturing king in Nexus", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("d3", piece("R", "w"));
    s.board.set("d4", bareKing("b"));
    s.board.set("e1", bareKing("w"));
    s.board.set("a2", piece("P", "w"));
    s = beginTurn(s);
    const move = aiPickMove(s, 2);
    expect(move!.from).toBe("d3");
    expect(move!.to).toBe("d4");
  });

  it("hard and expert also take assassination wins", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("d3", piece("R", "w"));
    s.board.set("d4", bareKing("b"));
    s.board.set("e1", bareKing("w"));
    s.board.set("a2", piece("P", "w"));
    s = beginTurn(s);
    expect(aiPickMove(s, 3)!.to).toBe("d4");
    expect(aiPickMove(s, 4)!.to).toBe("d4");
  });

  it("normal moves king into Nexus over capturing material", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("d3", bareKing("w"));
    s.board.set("a4", piece("Q", "b"));
    s.board.set("a3", piece("R", "w"));
    s.board.set("h8", bareKing("b"));
    s = beginTurn(s);
    const move = aiPickMove(s, 2);
    expect(move!.from).toBe("d3");
    expect(move!.to === "d4" || move!.to === "e4").toBe(true);
  });

  it("hard marches king closer to Nexus", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("e1", bareKing("w"));
    s.board.set("e8", bareKing("b"));
    s = beginTurn(s);
    const before = distToNexus("e1");
    const move = aiPickMove(s, 3);
    expect(move!.from).toBe("e1");
    expect(distToNexus(move!.to)).toBeLessThan(before);
  });

  it("evaluatePosition favors own king in Nexus", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("d4", { ...bareKing("w"), nexusTurnCount: 1 });
    s.board.set("e8", bareKing("b"));
    const withNexus = evaluatePosition(s, "w");

    s.board = new Map();
    s.board.set("e1", bareKing("w"));
    s.board.set("e8", bareKing("b"));
    const without = evaluatePosition(s, "w");
    expect(withNexus).toBeGreaterThan(without);
  });

  it("aiTurn with difficulty swaps player", () => {
    let s = beginTurn(newGame());
    s = aiTurn(s, 2);
    if (!s.winner) expect(s.activeColor).toBe("b");
  });

  it("difficulty 0 does nothing", () => {
    const s = beginTurn(newGame());
    expect(aiPickMove(s, 0)).toBeNull();
    expect(aiTurn(s, 0)).toBe(s);
  });
});
