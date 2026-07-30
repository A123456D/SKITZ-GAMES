import { describe, expect, it } from "vitest";
import {
  COLS,
  ROWS,
  createBoard,
  findMatches,
  makeCell,
  swapCreatesMatch,
} from "./board";
import { startSession, trySwap } from "./session";
import type { Board, TileKind } from "./types";

function fillChecker(): Board {
  const board: Board = [];
  for (let c = 0; c < COLS; c++) {
    board.push([]);
    for (let r = 0; r < ROWS; r++) {
      board[c]!.push(makeCell((c + r) % 2 === 0 ? "gem" : "star"));
    }
  }
  return board;
}

describe("board", () => {
  it("creates a full board without immediate matches", () => {
    const b = createBoard();
    expect(b.length).toBe(COLS);
    expect(b[0]!.length).toBe(ROWS);
    expect(findMatches(b).length).toBe(0);
  });

  it("finds a horizontal match of 3", () => {
    const b = fillChecker();
    b[1]![3] = makeCell("skull");
    b[2]![3] = makeCell("skull");
    b[3]![3] = makeCell("skull");
    const groups = findMatches(b);
    expect(groups.some((g) => g.kind === "skull" && g.cells.length >= 3)).toBe(
      true,
    );
  });

  it("detects swap that creates a match", () => {
    const b = fillChecker();
    b[0]![0] = makeCell("heart");
    b[1]![0] = makeCell("heart");
    b[2]![1] = makeCell("heart");
    expect(swapCreatesMatch(b, { c: 2, r: 1 }, { c: 2, r: 0 })).toBe(true);
  });
});

describe("session", () => {
  it("starts with goals and moves", () => {
    const s = startSession();
    expect(s.movesLeft).toBe(24);
    expect(s.goals.length).toBe(3);
    expect(s.status).toBe("playing");
  });

  it("trySwap returns a result", () => {
    const s = startSession();
    const result = trySwap(s, { c: 0, r: 0 }, { c: 1, r: 0 });
    expect(result.ok || result.reason === "no-match").toBe(true);
  });
});
