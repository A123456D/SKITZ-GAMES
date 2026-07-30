import { describe, expect, it } from "vitest";
import {
  COLS,
  ROWS,
  clearPositions,
  createBoard,
  damageAdjacentObstacles,
  findMatches,
  makeCell,
  maybeSpreadTar,
  swapCreatesMatch,
  tryWetSlip,
  canSwapCell,
} from "./board";
import { shapeMask } from "./shapes";
import { getLevel, LEVELS } from "./levels";
import { startSession, trySwap, usePlaneFerry, usePower, chargeFailedSwap } from "./session";
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
    const tar = makeCell("skull");
    tar.obstacle = "tar";
    tar.hits = 2;
    const glue = makeCell("skull");
    glue.obstacle = "glue";
    glue.hits = 2;
    expect(canSwapCell(soft)).toBe(true);
    expect(canSwapCell(glue)).toBe(true);
    expect(canSwapCell(hard)).toBe(false);
    expect(canSwapCell(tar)).toBe(false);
  });

  it("level 4 introduces tape and later levels use unique obstacles", () => {
    expect(getLevel(4).obstaclePlan[0]?.kind).toBe("tape-x");
    expect(getLevel(8).obstaclePlan[0]?.kind).toBe("box");
    expect(getLevel(12).obstaclePlan[0]?.kind).toBe("lock");
    const kinds = new Set(
      LEVELS.flatMap((l) => l.obstaclePlan.map((o) => o.kind)),
    );
    expect(kinds.has("tape-x")).toBe(true);
    expect(kinds.has("glue")).toBe(true);
    expect(kinds.has("barbed")).toBe(true);
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

describe("obstacle behaviors", () => {
  it("peels pink tape with an adjacent match", () => {
    const b = fillChecker();
    const mask = fullMask();
    b[0]![0] = makeCell("skull");
    b[1]![0] = makeCell("skull");
    b[2]![0] = makeCell("skull");
    b[3]![0] = makeCell("flame");
    b[3]![0]!.obstacle = "tape-x";
    b[3]![0]!.hits = 1;
    const cleared = damageAdjacentObstacles(b, mask, findMatches(b, mask));
    expect(cleared).toEqual([{ c: 3, r: 0 }]);
    expect(b[3]![0]!.obstacle).toBeUndefined();
  });

  it("barbed ignores adjacent matches", () => {
    const b = fillChecker();
    const mask = fullMask();
    b[0]![0] = makeCell("skull");
    b[1]![0] = makeCell("skull");
    b[2]![0] = makeCell("skull");
    b[3]![0] = makeCell("flame");
    b[3]![0]!.obstacle = "barbed";
    b[3]![0]!.hits = 1;
    damageAdjacentObstacles(b, mask, findMatches(b, mask));
    expect(b[3]![0]!.obstacle).toBe("barbed");
  });

  it("locks ignore matches of 3 but crack from matches of 4+", () => {
    const b = fillChecker();
    const mask = fullMask();
    b[0]![0] = makeCell("skull");
    b[1]![0] = makeCell("skull");
    b[2]![0] = makeCell("skull");
    b[3]![0] = makeCell("flame");
    b[3]![0]!.obstacle = "lock";
    b[3]![0]!.hits = 2;
    damageAdjacentObstacles(b, mask, findMatches(b, mask));
    expect(b[3]![0]!.obstacle).toBe("lock");
    expect(b[3]![0]!.hits).toBe(2);

    b[3]![0] = makeCell("skull");
    b[4]![0] = makeCell("flame");
    b[4]![0]!.obstacle = "lock";
    b[4]![0]!.hits = 2;
    damageAdjacentObstacles(b, mask, findMatches(b, mask));
    expect(b[4]![0]!.hits).toBe(1);
  });

  it("glue pins a cell so gravity cannot drop it", () => {
    const mask = fullMask();
    const board: Board = Array.from({ length: COLS }, () =>
      Array.from({ length: ROWS }, () => makeCell("star")),
    );
    const glue = makeCell("pizza");
    glue.obstacle = "glue";
    glue.hits = 2;
    glue.id = 4242;
    board[2]![4] = glue;
    clearPositions(
      board,
      mask,
      [
        { c: 2, r: 7 },
        { c: 2, r: 8 },
      ],
      ["skull", "star"],
    );
    expect(board[2]![4]?.id).toBe(4242);
    expect(board[2]![4]?.obstacle).toBe("glue");
  });

  it("wet slips one cell in the swap direction", () => {
    const b = fillChecker();
    const mask = fullMask();
    const wet = makeCell("soda");
    wet.obstacle = "wet";
    wet.hits = 1;
    // Wet already sits at the post-swap cell (`to`).
    b[2]![1] = wet;
    b[3]![1] = makeCell("flame");
    expect(tryWetSlip(b, mask, { c: 1, r: 1 }, { c: 2, r: 1 })).toBe(true);
    expect(b[3]![1]?.obstacle).toBe("wet");
    expect(b[2]![1]?.kind).toBe("flame");
  });

  it("tar can spread onto a clear neighbor", () => {
    const b = fillChecker();
    const mask = fullMask();
    b[2]![2]!.obstacle = "tar";
    b[2]![2]!.hits = 2;
    for (const [c, r] of [
      [1, 2],
      [3, 2],
      [2, 1],
      [2, 3],
    ] as const) {
      delete b[c]![r]!.obstacle;
      delete b[c]![r]!.hits;
    }
    const infected = maybeSpreadTar(b, mask);
    expect(infected).not.toBeNull();
    expect(b[infected!.c]![infected!.r]!.obstacle).toBe("tar");
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

  it("failed swipe charges a move and can lose", () => {
    const s = startSession(1);
    const before = s.movesLeft;
    chargeFailedSwap(s);
    expect(s.movesLeft).toBe(before - 1);
    expect(s.status).toBe("playing");
    s.movesLeft = 1;
    chargeFailedSwap(s);
    expect(s.movesLeft).toBe(0);
    expect(s.status).toBe("lost");
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

  it("stapler clears a 2x2 paper packet", () => {
    const s = startSession(8);
    s.powers.stapler = 1;
    let target = { c: 2, r: 3 };
    outer: for (let c = 0; c < COLS - 1; c++) {
      for (let r = 0; r < ROWS - 1; r++) {
        if (s.mask[c]![r] && s.mask[c + 1]![r] && s.mask[c]![r + 1]) {
          target = { c, r };
          break outer;
        }
      }
    }
    const before = s.movesLeft;
    const result = usePower(s, "stapler", target);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cleared.length).toBeGreaterThanOrEqual(2);
    expect(s.movesLeft).toBe(before - 1);
  });

  it("disco banks +5 moves", () => {
    const s = startSession(26);
    s.powers.disco = 1;
    const before = s.movesLeft;
    let target = { c: 2, r: 3 };
    outer: for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (s.mask[c]![r]) {
          target = { c, r };
          break outer;
        }
      }
    }
    const result = usePower(s, "disco", target);
    expect(result.ok).toBe(true);
    expect(s.movesLeft).toBe(before + 5);
  });

  it("plane usePower redirects to ferry", () => {
    const s = startSession(1);
    s.powers.plane = 1;
    const result = usePower(s, "plane", { c: 0, r: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("use-plane-ferry");
    expect(s.powers.plane).toBe(1);
  });

  it("plane ferries a sticker beside another", () => {
    const s = startSession(1);
    s.powers.plane = 1;
    const beforeMoves = s.movesLeft;

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cell = s.board[c]![r];
        if (!cell) continue;
        cell.obstacle = undefined;
        cell.hits = 0;
      }
    }

    const from = { c: 0, r: 0 };
    const beside = { c: 4, r: 4 };
    expect(s.mask[from.c]![from.r]).toBe(true);
    expect(s.mask[beside.c]![beside.r]).toBe(true);
    expect(canSwapCell(s.board[from.c]![from.r]!)).toBe(true);

    const result = usePlaneFerry(s, from, beside);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      Math.abs(result.landed.c - beside.c) +
        Math.abs(result.landed.r - beside.r),
    ).toBe(1);
    expect(s.powers.plane).toBe(0);
    expect(s.movesLeft).toBe(beforeMoves - 1);
  });
});

describe("theme", () => {
  it("cycles between scrap and edgy themes", async () => {
    const { cycleTheme, getTheme, initTheme, Palette, THEME_PALETTES } =
      await import("../view/theme");
    initTheme();
    const first = getTheme();
    expect(THEME_PALETTES[first]).toBeTruthy();
    const next = cycleTheme();
    expect(next).not.toBe(first);
    expect(Palette.purple).toBe(THEME_PALETTES[next].purple);
    cycleTheme();
    expect(getTheme()).toBe(first);
  });
});
