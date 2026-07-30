import { describe, it, expect } from "vitest";
import { newGame } from "./board";
import { beginTurn } from "./turn";
import { seeGain, classicalPositional, PIECE_VALUE } from "./chessStrat";
import { aiPickMove, evaluatePosition } from "./ai";
import type { Piece } from "./types";

function bare(kind: Piece["kind"], color: "w" | "b"): Piece {
  return {
    kind,
    color,
    isShielded: false,
    shieldExpiresTurn: -1,
    nexusTurnCount: 0,
    hasMoved: true,
  };
}

describe("classical chess strat layer", () => {
  it("SEE likes free captures", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("e1", bare("K", "w"));
    s.board.set("e8", bare("K", "b"));
    s.board.set("a1", bare("R", "w"));
    s.board.set("a8", bare("R", "b")); // unprotected if king not defending... king on e8 doesn't defend a8
    const gain = seeGain(s, { from: "a1", to: "a8" });
    expect(gain).toBe(PIECE_VALUE.R);
  });

  it("SEE rejects hanging your queen for a pawn", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("e1", bare("K", "w"));
    s.board.set("e8", bare("K", "b"));
    s.board.set("d4", bare("Q", "w"));
    s.board.set("e5", bare("P", "b"));
    s.board.set("f6", bare("P", "b")); // after Qxe5, pawn on f6? actually e5 pawn protected by... 
    // Protect e5 with a black rook on e8 — wait king is there. Use rook on e7.
    s.board.set("e8", bare("K", "b"));
    s.board.set("h5", bare("R", "b")); // protects e5 along 5th? h5-e5 yes
    const gain = seeGain(s, { from: "d4", to: "e5" });
    expect(gain).toBeLessThan(0);
  });

  it("classicalPositional prefers developed knights", () => {
    let undeveloped = newGame();
    undeveloped.board = new Map();
    undeveloped.board.set("e1", bare("K", "w"));
    undeveloped.board.set("e8", bare("K", "b"));
    undeveloped.board.set("b1", bare("N", "w"));

    let developed = newGame();
    developed.board = new Map();
    developed.board.set("e1", bare("K", "w"));
    developed.board.set("e8", bare("K", "b"));
    developed.board.set("c3", bare("N", "w"));

    expect(classicalPositional(developed, "w")).toBeGreaterThan(
      classicalPositional(undeveloped, "w"),
    );
  });

  it("AI refuses a SEE-losing queen-for-pawn grab", () => {
    let s = newGame();
    s.board = new Map();
    s.board.set("e1", bare("K", "w"));
    s.board.set("e8", bare("K", "b"));
    s.board.set("d4", bare("Q", "w"));
    s.board.set("e5", bare("P", "b"));
    s.board.set("h5", bare("R", "b")); // guards e5
    s.board.set("a2", bare("R", "w"));
    s.board.set("a7", bare("N", "b")); // free knight for the rook as better option
    s = beginTurn(s);
    const move = aiPickMove(s, 2);
    expect(move).not.toBeNull();
    expect(!(move!.from === "d4" && move!.to === "e5")).toBe(true);
  });

  it("evaluatePosition still finite with classical layer on startpos", () => {
    const s = beginTurn(newGame());
    const v = evaluatePosition(s, "w");
    expect(Number.isFinite(v)).toBe(true);
  });
});
