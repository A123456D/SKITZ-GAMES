import { describe, expect, it } from "vitest";
import {
  COLS,
  ROWS,
  createBoard,
  findMatches,
  makeCell,
  swapCreatesMatch,
  canSwapCell,
} from "./board";
import { shapeMask } from "./shapes";
import { getLevel, LEVELS } from "./levels";
import { startSession, trySwap, usePower } from "./session";
import { paletteForLevel, type Board, type BoardMask } from "./types";

function fullMask(): BoardMask {
  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => true),
  );
}

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
  it("creates a shaped board without immediate matches", () => {
    const { board, mask } = createBoard("rect", {
      palette: ["skull", "star", "flame", "heart", "bolt"],
    });
    expect(board.length).toBe(COLS);
    expect(board[0]!.length).toBe(ROWS);
    expect(findMatches(board, mask).length).toBe(0);
    expect(mask.flat().filter(Boolean).length).toBe(6 * 8);
  });

  it("places patterned tape obstacles", () => {
    const { board, mask } = createBoard("rect", {
      palette: ["skull", "star", "flame", "heart"],
      obstaclePlan: [{ kind: "tape-x", pattern: "row", count: 4 }],
    });
    const taped = board
      .flat()
      .filter((c) => c?.obstacle === "tape-x").length;
    expect(taped).toBeGreaterThanOrEqual(3);
    expect(mask.flat().some(Boolean)).toBe(true);
  });

  it("forces goal kinds into the palette", () => {
    const bag = paletteForLevel({
      colors: 4,
      goals: [{ type: "collect", kind: "bolt", need: 10 }],
    });
    expect(bag).toContain("bolt");
    expect(bag.length).toBeGreaterThanOrEqual(4);
  });

  it("donut shape has a hole", () => {
    const mask = shapeMask("donut");
    expect(mask[3]![4]).toBe(false);
    expect(mask[0]![1]).toBe(true);
  });

  it("soft tape can swap, hard box cannot", () => {
    const soft = makeCell("skull");
    soft.obstacle = "tape-x";
    soft.hits = 1;
    const hard = makeCell("skull");
    hard.obstacle = "box";
    hard.hits = 2;
    expect(canSwapCell(soft)).toBe(true);
    expect(canSwapCell(hard)).toBe(false);
  });

  it("finds a horizontal match of 3", () => {
    const b = fillChecker();
    const mask = fullMask();
    b[1]![3] = makeCell("skull");
    b[2]![3] = makeCell("skull");
    b[3]![3] = makeCell("skull");
    const groups = findMatches(b, mask);
    expect(groups.some((g) => g.kind === "skull" && g.cells.length >= 3)).toBe(
      true,
    );
  });

  it("detects swap that creates a match", () => {
    const b = fillChecker();
    const mask = fullMask();
    b[0]![0] = makeCell("heart");
    b[1]![0] = makeCell("heart");
    b[2]![1] = makeCell("heart");
    expect(
      swapCreatesMatch(b, mask, { c: 2, r: 1 }, { c: 2, r: 0 }),
    ).toBe(true);
  });
});

describe("levels", () => {
  it("has 40 hand-authored levels with briefs and variety", () => {
    expect(LEVELS.length).toBe(40);
    expect(getLevel(1).obstaclePlan.length).toBe(0);
    expect(getLevel(4).obstaclePlan.length).toBeGreaterThan(0);
    expect(getLevel(4).goals.some((g) => g.type === "clear")).toBe(true);
    expect(getLevel(11).shape).toBe("lanes");
    expect(getLevel(40).zone).toBe("roof");
    expect(getLevel(1).brief.length).toBeGreaterThan(5);
    expect(getLevel(8).powers.stapler).toBeGreaterThan(0);
  });
});

describe("session", () => {
  it("starts with level powers and goals", () => {
    const s = startSession(1);
    expect(s.movesLeft).toBe(getLevel(1).moves);
    expect(s.goals.length).toBeGreaterThanOrEqual(2);
    expect(s.powers.bomb).toBeGreaterThan(0);
    expect(s.powers.disco).toBe(0);
    expect(s.status).toBe("playing");
  });

  it("trySwap returns a result", () => {
    const s = startSession(1);
    const result = trySwap(s, { c: 1, r: 2 }, { c: 2, r: 2 });
    expect(result.ok || typeof result.reason === "string").toBe(true);
  });

  it("bomb power clears a neighborhood", () => {
    const s = startSession(1);
    s.powers.bomb = 1;
    let target = { c: 3, r: 4 };
    outer: for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (s.mask[c]![r]) {
          target = { c, r };
          break outer;
        }
      }
    }
    const result = usePower(s, "bomb", target);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cleared.length).toBeGreaterThan(0);
  });
});
