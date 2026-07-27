import { describe, expect, it } from "vitest";
import {
  findMatches,
  generateBoard,
  twistBoard,
  resolveBoard,
  mulberry32,
  type Board,
} from "./board";
import { applyTwist, setActiveFace, spendOrbit, startSession, starsForScore } from "./session";
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
  it("finds 2x2 square matches", () => {
    const groups = findMatches([
      ["skull", "flame", "flame", "diamond"],
      ["bomb", "flame", "flame", "star"],
      ["heart", "bolt", "skull", "smiley"],
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.kind).toBe("flame");
    expect(groups[0]!.cells).toHaveLength(4);
  });
  it("expands a row match into connected column extras", () => {
    const groups = findMatches([
      ["flame", "flame", "flame", "diamond"],
      ["flame", "skull", "bolt", "star"],
      ["heart", "bomb", "smiley", "headphones"],
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.kind).toBe("flame");
    expect(groups[0]!.cells).toHaveLength(4);
  });
  it("cascades after an expanded clear", () => {
    const resolved = resolveBoard(
      [
        ["flame", "flame", "flame"],
        ["flame", "heart", "bolt"],
        ["heart", "heart", "skull"],
      ],
      mulberry32(7),
    );
    // Row of 3 flames + connected flame clear; hearts may then match after gravity.
    expect(resolved.scoreGain).toBeGreaterThan(0);
    expect(resolved.totalCleared.some((c) => c.kind === "flame" && c.count >= 4)).toBe(
      true,
    );
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
    expect(result.spentMove).toBe(false);
    expect(result.session.movesLeft).toBe(5);
    expect(result.session.goals[0]!.have).toBe(0);
    expect(result.session.faces[1]![0]).toEqual(["heart", "heart", "heart"]);
  });

  it("spends a move only when a clear scores", () => {
    const session = startSession({
      id: "g",
      title: "G",
      size: 3,
      moves: 5,
      goals: [{ kind: "heart", need: 3 }],
      starScores: [10, 20, 30],
      board: [
        ["heart", "heart", "bolt"],
        ["star", "flame", "skull"],
        ["diamond", "skull", "star"],
      ],
      boardLeft: [
        ["bolt", "star", "heart"],
        ["diamond", "skull", "bolt"],
        ["star", "flame", "diamond"],
      ],
      boardRight: [
        ["flame", "bolt", "star"],
        ["skull", "diamond", "flame"],
        ["bolt", "star", "skull"],
      ],
      boardBack: [
        ["diamond", "flame", "bolt"],
        ["star", "skull", "diamond"],
        ["flame", "bolt", "star"],
      ],
      boardTop: [
        ["skull", "bolt", "flame"],
        ["diamond", "star", "skull"],
        ["bolt", "flame", "diamond"],
      ],
      boardBottom: [
        ["star", "diamond", "skull"],
        ["flame", "bolt", "star"],
        ["diamond", "skull", "flame"],
      ],
    });
    const dry = applyTwist(session, { axis: "row", index: 1, dir: 1 });
    expect(dry.spentMove).toBe(false);
    expect(dry.session.movesLeft).toBe(5);

    const win = applyTwist(session, { axis: "row", index: 0, dir: 1 });
    expect(win.scoreGain).toBeGreaterThan(0);
    expect(win.spentMove).toBe(true);
    expect(win.session.status).toBe("won");
    expect(win.session.movesLeft).toBe(4);
  });

  it("orbit spend burns a move", () => {
    const session = startSession({
      id: "o",
      title: "O",
      size: 3,
      moves: 2,
      goals: [{ kind: "heart", need: 99 }],
      starScores: [1, 2, 3],
    });
    const a = spendOrbit(session);
    expect(a.didSpend).toBe(true);
    expect(a.session.movesLeft).toBe(1);
  });

  it("maps stars", () => {
    expect(starsForScore(250, [100, 200, 300])).toBe(2);
  });
});

describe("level openers", () => {
  it("level 1 front has multiple scoring opening twists", async () => {
    const { LEVEL_1 } = await import("./levels");
    const s = startSession(LEVEL_1);
    expect(findMatches(s.board)).toHaveLength(0);
    let hits = 0;
    for (const axis of ["row", "col"] as const) {
      for (let index = 0; index < 6; index++) {
        for (const dir of [1, -1] as const) {
          if (applyTwist(s, { axis, index, dir }).scoreGain > 0) hits++;
        }
      }
    }
    expect(hits).toBeGreaterThanOrEqual(2);
  });
});
