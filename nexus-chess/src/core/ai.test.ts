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

  it("normal and above take assassination wins", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("d3", piece("R", "w"));
    s.board.set("d4", bareKing("b"));
    s.board.set("e1", bareKing("w"));
    s.board.set("a2", piece("P", "w"));
    s = beginTurn(s);
    expect(aiPickMove(s, 2)!.to).toBe("d4");
    expect(aiPickMove(s, 3)!.to).toBe("d4");
    expect(aiPickMove(s, 4)!.to).toBe("d4");
  });

  it("prefers a free queen over aimless king shuffling far from Nexus", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("e1", bareKing("w"));
    s.board.set("a8", bareKing("b"));
    s.board.set("h2", piece("R", "w"));
    s.board.set("h7", piece("Q", "b")); // hanging on the h-file
    s = beginTurn(s);
    const move = aiPickMove(s, 2);
    expect(move).not.toBeNull();
    expect(move!.from).toBe("h2");
    expect(move!.to).toBe("h7");
  });

  it("search returns a king move when only kings remain", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("e2", bareKing("w"));
    s.board.set("a8", bareKing("b"));
    s = beginTurn(s);
    const move = aiPickMove(s, 3);
    expect(move).not.toBeNull();
    expect(move!.from).toBe("e2");
    expect(distToNexus(move!.to)).toBeLessThanOrEqual(distToNexus("e2"));
  });

  it("does not abandon a safe hanging capture just to step the king one square", () => {
    let s = newGame();
    s.board = new Map();
    // King far from Nexus; enemy rook on a7 is truly undefended (king tucked on h8)
    s.board.set("e1", bareKing("w"));
    s.board.set("h8", bareKing("b"));
    s.board.set("a2", piece("R", "w"));
    s.board.set("a7", piece("R", "b"));
    s = beginTurn(s);
    const move = aiPickMove(s, 2);
    expect(move).not.toBeNull();
    expect(move).toEqual(expect.objectContaining({ from: "a2", to: "a7" }));
  });

  it("refuses a free Nexus entry that the opponent can assassinate", () => {
    let s = newGame();
    s.board = new Map();
    // White king on d3 can step into d4, but black rook already eyes d4
    s.board.set("d3", bareKing("w"));
    s.board.set("a8", bareKing("b"));
    s.board.set("d7", piece("R", "b"));
    s.board.set("h2", piece("R", "w"));
    s = beginTurn(s);
    const move = aiPickMove(s, 3);
    expect(move).not.toBeNull();
    // Walking onto d4 is suicide — anything else (or staying out) is fine
    expect(!(move!.from === "d3" && move!.to === "d4")).toBe(true);
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
