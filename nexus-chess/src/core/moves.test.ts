import { describe, it, expect } from "vitest";
import { newGame, initialBoard, rcToSquare } from "./board";
import { pieceMoves, allMoves, applyMove } from "./moves";
import type { GameState, Piece, PieceKind } from "./types";
import { cloneState } from "./types";

function emptyState(): GameState {
  const s = newGame();
  s.board = new Map();
  s.turnPhase = "move";
  return s;
}

function place(state: GameState, sq: string, kind: PieceKind, color: "w" | "b"): void {
  state.board.set(sq, {
    kind,
    color,
    isShielded: false,
    shieldExpiresTurn: -1,
    nexusTurnCount: 0,
    hasMoved: false,
  });
}

describe("moves", () => {
  it("pawn can push one and two from start", () => {
    const s = emptyState();
    place(s, "e2", "P", "w");
    const moves = pieceMoves(s, "e2");
    const dests = moves.map((m) => m.to).sort();
    expect(dests).toEqual(["e3", "e4"]);
  });

  it("pawn captures diagonally", () => {
    const s = emptyState();
    place(s, "e4", "P", "w");
    place(s, "d5", "P", "b");
    place(s, "f5", "P", "b");
    const dests = pieceMoves(s, "e4").map((m) => m.to).sort();
    expect(dests).toContain("d5");
    expect(dests).toContain("f5");
    expect(dests).toContain("e5");
  });

  it("knight has L-shaped moves", () => {
    const s = emptyState();
    place(s, "b1", "N", "w");
    const dests = pieceMoves(s, "b1").map((m) => m.to).sort();
    expect(dests).toContain("a3");
    expect(dests).toContain("c3");
    expect(dests).toContain("d2");
  });

  it("rook slides along ranks and files", () => {
    const s = emptyState();
    place(s, "d4", "R", "w");
    const dests = pieceMoves(s, "d4").map((m) => m.to);
    expect(dests).toContain("d8");
    expect(dests).toContain("d1");
    expect(dests).toContain("a4");
    expect(dests).toContain("h4");
    expect(dests).not.toContain("e5"); // diagonal
  });

  it("bishop slides diagonally", () => {
    const s = emptyState();
    place(s, "d4", "B", "w");
    const dests = pieceMoves(s, "d4").map((m) => m.to);
    expect(dests).toContain("a1");
    expect(dests).toContain("h8");
    expect(dests).toContain("a7");
    expect(dests).not.toContain("d5"); // orthogonal
  });

  it("queen combines rook and bishop", () => {
    const s = emptyState();
    place(s, "d4", "Q", "w");
    const dests = pieceMoves(s, "d4").map((m) => m.to);
    expect(dests).toContain("d8");
    expect(dests).toContain("h8");
    expect(dests).toContain("a4");
  });

  it("king moves one square and can castle", () => {
    const s = emptyState();
    place(s, "e1", "K", "w");
    place(s, "h1", "R", "w");
    place(s, "a1", "R", "w");
    const dests = pieceMoves(s, "e1").map((m) => m.to);
    expect(dests).toContain("e2");
    expect(dests).toContain("d1");
    expect(dests).toContain("f1");
    expect(dests).toContain("g1"); // kingside castle
    expect(dests).toContain("c1"); // queenside castle
  });

  it("cannot capture own pieces", () => {
    const s = emptyState();
    place(s, "d4", "R", "w");
    place(s, "d5", "P", "w");
    const dests = pieceMoves(s, "d4").map((m) => m.to);
    expect(dests).not.toContain("d5");
    expect(dests).not.toContain("d6"); // blocked
  });

  it("cannot capture king outside Nexus", () => {
    const s = emptyState();
    place(s, "d3", "R", "w");
    place(s, "d1", "K", "b"); // a1-h1 are not Nexus
    const dests = pieceMoves(s, "d3").map((m) => m.to);
    expect(dests).not.toContain("d1");
  });

  it("CAN capture king inside Nexus", () => {
    const s = emptyState();
    place(s, "d3", "R", "w");
    place(s, "d4", "K", "b"); // d4 is Nexus
    const dests = pieceMoves(s, "d3").map((m) => m.to);
    expect(dests).toContain("d4");
  });

  it("applyMove moves piece and handles capture", () => {
    const s = emptyState();
    place(s, "e2", "P", "w");
    place(s, "d5", "P", "b");
    // Move pawn to e4 first
    let s2 = applyMove(s, { from: "e2", to: "e4" });
    expect(s2.board.has("e2")).toBe(false);
    expect(s2.board.get("e4")!.kind).toBe("P");
  });

  it("applyMove grants +2 mana on capture", () => {
    const s = emptyState();
    place(s, "e4", "P", "w");
    place(s, "d5", "P", "b");
    s.players[0].mana = 0;
    const s2 = applyMove(s, { from: "e4", to: "d5" });
    expect(s2.players[0].mana).toBe(2);
    expect(s2.board.has("d5")).toBe(true);
    expect(s2.board.get("d5")!.color).toBe("w");
  });

  it("pawn promotion generates 4 promotion moves", () => {
    const s = emptyState();
    place(s, "e7", "P", "w");
    const moves = pieceMoves(s, "e7");
    const promo = moves.filter((m) => m.to === "e8");
    expect(promo).toHaveLength(4);
    expect(promo.map((m) => m.promotion).sort()).toEqual(["B", "N", "Q", "R"]);
  });

  it("allMoves only returns moves for active color", () => {
    const s = newGame();
    s.turnPhase = "move";
    const moves = allMoves(s);
    for (const m of moves) {
      expect(s.board.get(m.from)!.color).toBe("w");
    }
  });
});
