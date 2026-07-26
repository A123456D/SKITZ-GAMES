import { describe, expect, it } from "vitest";
import {
  findMatches,
  generateBoard,
  twistBoard,
  resolveBoard,
  mulberry32,
  type Board,
} from "./board";
import { applyTwist, setActiveFace, startSession, starsForScore } from "./session";
import { facingFace } from "../view/cube3d";

describe("twistBoard", () => {
  it("rotates a row right with wrap", () => {
    const board: Board = [
      ["skull", "heart", "bolt"],
      ["star", "flame", "diamond"],
      ["skull", "heart", "bolt"],
    ];
    expect(twistBoard(board, { axis: "row", index: 0, dir: 1 })[0]).toEqual([
      "bolt",
      "skull",
      "heart",
    ]);
  });

  it("rotates by multiple cells", () => {
    const b: Board = [
      ["skull", "heart", "bolt", "star"],
      ["flame", "diamond", "headphones", "bomb"],
      ["spray", "smiley", "sneaker", "skull"],
      ["heart", "bolt", "star", "flame"],
    ];
    expect(twistBoard(b, { axis: "row", index: 0, dir: 1, amount: 2 })[0]).toEqual([
      "bolt",
      "star",
      "skull",
      "heart",
    ]);
  });
});

describe("findMatches / generate / resolve", () => {
  it("finds matches", () => {
    expect(
      findMatches([
        ["heart", "heart", "heart"],
        ["skull", "bolt", "star"],
        ["flame", "diamond", "skull"],
      ]),
    ).toHaveLength(1);
  });
  it("generates clean boards", () => {
    expect(findMatches(generateBoard(6, 42))).toHaveLength(0);
  });
  it("resolves clears", () => {
    expect(
      resolveBoard(
        [
          ["bolt", "star", "flame"],
          ["skull", "diamond", "star"],
          ["heart", "heart", "heart"],
        ],
        mulberry32(1),
      ).scoreGain,
    ).toBeGreaterThan(0);
  });
});

describe("session + cube", () => {
  it("has six faces", () => {
    const s = startSession({
      id: "x",
      title: "X",
      size: 3,
      moves: 5,
      goals: [{ kind: "heart", need: 99 }],
      starScores: [1, 2, 3],
    });
    expect(s.faces).toHaveLength(6);
  });

  it("switches active face", () => {
    const s = startSession({
      id: "x",
      title: "X",
      size: 3,
      moves: 5,
      goals: [{ kind: "heart", need: 99 }],
      starScores: [1, 2, 3],
    });
    const next = setActiveFace(s, 2);
    expect(next.face).toBe(2);
    expect(next.board).toBe(next.faces[2]);
  });

  it("facingFace picks front at rest", () => {
    expect(facingFace(0, 0)).toBe(0);
  });

  it("does not clear matches on non-active faces", () => {
    const session = startSession({
      id: "side-match",
      title: "Side",
      size: 3,
      moves: 5,
      goals: [{ kind: "heart", need: 99 }],
      starScores: [10, 20, 30],
      board: [
        ["star", "flame", "bolt"],
        ["skull", "diamond", "star"],
        ["flame", "bolt", "skull"],
      ],
    });
    // Three hearts on the back face, on a strip this twist won't touch (row 0
    // while we twist front row 2).
    session.faces[1] = [
      ["heart", "heart", "heart"],
      ["star", "flame", "bolt"],
      ["skull", "diamond", "star"],
    ];
    const result = applyTwist(session, { axis: "row", index: 2, dir: 1 });
    expect(result.didTwist).toBe(true);
    expect(result.scoreGain).toBe(0);
    expect(result.session.goals[0]!.have).toBe(0);
    expect(result.session.faces[1]![0]).toEqual(["heart", "heart", "heart"]);
  });

  it("wins on goal clear", () => {
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
    const win = applyTwist(session, { axis: "col", index: 2, dir: -1 });
    expect(win.session.status).toBe("won");
  });

  it("maps stars", () => {
    expect(starsForScore(250, [100, 200, 300])).toBe(2);
  });
});
