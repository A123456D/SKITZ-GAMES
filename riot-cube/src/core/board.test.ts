import { describe, expect, it } from "vitest";
import {
  findMatches,
  generateBoard,
  twistBoard,
  resolveBoard,
  mulberry32,
  type Board,
} from "./board";
import { applyTwist, flipFace, startSession, starsForScore } from "./session";

describe("twistBoard", () => {
  it("rotates a row right with wrap", () => {
    const board: Board = [
      ["skull", "heart", "bolt"],
      ["star", "flame", "diamond"],
      ["skull", "heart", "bolt"],
    ];
    const next = twistBoard(board, { axis: "row", index: 0, dir: 1 });
    expect(next[0]).toEqual(["bolt", "skull", "heart"]);
  });

  it("rotates by multiple cells", () => {
    const b: Board = [
      ["skull", "heart", "bolt", "star"],
      ["flame", "diamond", "headphones", "bomb"],
      ["spray", "smiley", "sneaker", "skull"],
      ["heart", "bolt", "star", "flame"],
    ];
    const next = twistBoard(b, { axis: "row", index: 0, dir: 1, amount: 2 });
    expect(next[0]).toEqual(["bolt", "star", "skull", "heart"]);
  });
});

describe("findMatches", () => {
  it("finds a horizontal line of 3", () => {
    const board: Board = [
      ["heart", "heart", "heart"],
      ["skull", "bolt", "star"],
      ["flame", "diamond", "skull"],
    ];
    expect(findMatches(board)).toHaveLength(1);
  });
});

describe("generateBoard", () => {
  it("creates a board with no opening matches", () => {
    expect(findMatches(generateBoard(6, 42))).toHaveLength(0);
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
      boardBack: [
        ["skull", "bolt", "star"],
        ["flame", "diamond", "skull"],
        ["bolt", "star", "flame"],
      ],
    });
    const win = applyTwist(session, { axis: "col", index: 2, dir: -1 });
    expect(win.didTwist).toBe(true);
    expect(win.session.status).toBe("won");
  });

  it("flips between faces", () => {
    const session = startSession({
      id: "f",
      title: "F",
      size: 3,
      moves: 5,
      goals: [{ kind: "heart", need: 99 }],
      starScores: [10, 20, 30],
      board: [
        ["heart", "bolt", "star"],
        ["flame", "diamond", "skull"],
        ["bolt", "star", "flame"],
      ],
      boardBack: [
        ["sneaker", "spray", "smiley"],
        ["bomb", "headphones", "skull"],
        ["spray", "smiley", "sneaker"],
      ],
    });
    expect(session.face).toBe(0);
    expect(session.board[0]![0]).toBe("heart");
    const flipped = flipFace(session, 1);
    expect(flipped.face).toBe(1);
    expect(flipped.board[0]![0]).toBe("sneaker");
  });

  it("maps score to stars", () => {
    expect(starsForScore(250, [100, 200, 300])).toBe(2);
  });
});
