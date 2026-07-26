import { describe, expect, it } from "vitest";
import {
  findMatches,
  generateBoard,
  twistBoard,
  resolveBoard,
  mulberry32,
  type Board,
} from "./board";
import { applyTwist, startSession, starsForScore } from "./session";

describe("twistBoard", () => {
  it("rotates a row right with wrap", () => {
    const board: Board = [
      ["skull", "heart", "bolt"],
      ["star", "flame", "diamond"],
      ["skull", "heart", "bolt"],
    ];
    const next = twistBoard(board, { axis: "row", index: 0, dir: 1 });
    expect(next[0]).toEqual(["bolt", "skull", "heart"]);
    expect(next[1]).toEqual(["star", "flame", "diamond"]);
  });

  it("rotates a column down with wrap", () => {
    const board: Board = [
      ["skull", "heart", "bolt"],
      ["star", "flame", "diamond"],
      ["skull", "heart", "bolt"],
    ];
    const next = twistBoard(board, { axis: "col", index: 1, dir: 1 });
    expect(next.map((r) => r[1])).toEqual(["heart", "heart", "flame"]);
  });
});

describe("findMatches", () => {
  it("finds a horizontal line of 3", () => {
    const board: Board = [
      ["heart", "heart", "heart"],
      ["skull", "bolt", "star"],
      ["flame", "diamond", "skull"],
    ];
    const groups = findMatches(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.kind).toBe("heart");
    expect(groups[0]!.cells).toHaveLength(3);
  });
});

describe("generateBoard", () => {
  it("creates a board with no opening matches", () => {
    const board = generateBoard(6, 42);
    expect(findMatches(board)).toHaveLength(0);
  });
});

describe("resolveBoard", () => {
  it("clears a match and refills", () => {
    const board: Board = [
      ["bolt", "star", "flame"],
      ["skull", "diamond", "star"],
      ["heart", "heart", "heart"],
    ];
    const result = resolveBoard(board, mulberry32(1));
    expect(result.scoreGain).toBeGreaterThan(0);
    expect(result.totalCleared.some((c) => c.kind === "heart")).toBe(true);
    expect(result.board.every((row) => row.every((c) => c !== null))).toBe(true);
  });
});

describe("session", () => {
  it("wins when a twist completes goal clears", () => {
    const session = startSession({
      id: "g",
      title: "G",
      size: 3,
      moves: 5,
      goals: [{ kind: "heart", need: 3 }],
      starScores: [10, 20, 30],
      board: [
        ["heart", "heart", "bolt"],
        ["star", "flame", "heart"],
        ["skull", "diamond", "star"],
      ],
    });
    // col2 = [bolt, heart, star]; twist up brings heart onto the heart row
    const win = applyTwist(session, { axis: "col", index: 2, dir: -1 });
    expect(win.didTwist).toBe(true);
    expect(win.session.goals[0]!.have).toBeGreaterThanOrEqual(3);
    expect(win.session.status).toBe("won");
  });

  it("maps score to stars", () => {
    expect(starsForScore(0, [100, 200, 300])).toBe(0);
    expect(starsForScore(100, [100, 200, 300])).toBe(1);
    expect(starsForScore(250, [100, 200, 300])).toBe(2);
    expect(starsForScore(300, [100, 200, 300])).toBe(3);
  });
});
