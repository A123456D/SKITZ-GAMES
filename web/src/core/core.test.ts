import { describe, expect, it } from "vitest";
import { Dir, rotateOffset } from "./cellKind";
import { Module as M } from "./tableDef";
import { exitsFrom, entryPortFromIncoming, moduleForPorts, openPorts, rotatedPairs } from "./portWiring";
import { makeTable } from "./tableDef";
import { solve, analyzeNetwork } from "./networkSolver";
import { DIFFICULTY_COUNT, generateLevel } from "./levelCatalog";
import { canUndo, isFailed, loadLevel, pulse, stars, applySolutionStep, tryRotate, undo } from "./puzzleSession";
import { cell, table, buildState, type LevelData } from "./levelData";
import { buildTutorialBasics, buildTutorialChannels } from "./tutorialLevel";

const e = cell.empty;

function L(
  partial: Omit<LevelData, "pulseLimit" | "tokenBudget"> & {
    pulseLimit?: number;
    tokenBudget?: number;
  },
): LevelData {
  return { pulseLimit: 3, tokenBudget: 0, ...partial };
}

describe("rotateOffset still CW", () => {
  it("CW (1,0)->(0,1)", () => {
    expect(rotateOffset(1, 0, 1)).toEqual({ x: 0, y: 1 });
  });
});

describe("port wiring", () => {
  it("elbow routes W to S at rot 2", () => {
    const t = makeTable(0, { x: 0, y: 0 }, M.ELBOW, 1, 2);
    expect(exitsFrom(t, Dir.W)).toEqual([Dir.S]);
  });

  it("entry from eastbound beam is west port", () => {
    expect(entryPortFromIncoming(Dir.E)).toBe(Dir.W);
  });

  it("straight rot1 is E-W", () => {
    const t = makeTable(0, { x: 0, y: 0 }, M.STRAIGHT, 1, 1);
    const pairs = rotatedPairs(t);
    expect(pairs).toContainEqual([Dir.E, Dir.W]);
  });

  it("moduleForPorts maps elbow and endcap", () => {
    expect(moduleForPorts([Dir.N, Dir.E])).toEqual({ module: M.ELBOW, rotationQ: 0 });
    expect(moduleForPorts([Dir.E])).toEqual({ module: M.ENDCAP, rotationQ: Dir.E });
  });
});

describe("dense network rule", () => {
  it("2x2 ring of elbows wins", () => {
    const level = L({
      id: "ring",
      title: "ring",
      width: 2,
      height: 2,
      par: 1,
      undoLimit: 3,
      tables: [
        table(0, 0, 0, M.ELBOW, 1), // E-S
        table(1, 1, 0, M.ELBOW, 2), // S-W
        table(2, 0, 1, M.ELBOW, 0), // N-E
        table(3, 1, 1, M.ELBOW, 3), // W-N
      ],
      cells: [e(), e(), e(), e()],
      solution: [],
    });
    const r = solve(buildState(level));
    expect(r.won).toBe(true);
    expect(analyzeNetwork(buildState(level)).looseEnds).toBe(0);
    expect(analyzeNetwork(buildState(level)).components).toBe(1);
  });

  it("broken ring has loose ends and does not win", () => {
    const level = L({
      id: "broken",
      title: "broken",
      width: 2,
      height: 2,
      par: 1,
      undoLimit: 3,
      tables: [
        table(0, 0, 0, M.ELBOW, 0), // N-E — N faces off-board
        table(1, 1, 0, M.ELBOW, 2),
        table(2, 0, 1, M.ELBOW, 0),
        table(3, 1, 1, M.ELBOW, 3),
      ],
      cells: [e(), e(), e(), e()],
      solution: [],
    });
    const net = analyzeNetwork(buildState(level));
    expect(net.won).toBe(false);
    expect(net.looseEnds).toBeGreaterThan(0);
  });

  it("pulse commits win on tutorial basics", () => {
    const level = buildTutorialBasics();
    const session = loadLevel(level);
    expect(session.result.won).toBe(false);
    for (const step of level.solution) {
      expect(applySolutionStep(session, step)).toBe(true);
    }
    expect(pulse(session)).toBe(true);
    expect(session.result.won).toBe(true);
  });

  it("tutorial lesson 2 closes", () => {
    const level = buildTutorialChannels();
    const session = loadLevel(level);
    for (const step of level.solution) {
      expect(applySolutionStep(session, step)).toBe(true);
    }
    expect(pulse(session)).toBe(true);
    expect(session.result.won).toBe(true);
  });
});

describe("dense procedural levels", () => {
  it("level 1 is full grid and solvable via pulse", () => {
    const level = generateLevel(1, 42);
    expect(level.width).toBe(level.height);
    expect(level.tables.length).toBe(level.width * level.height);
    expect(level.tables.every((t) => !t.locked)).toBe(true);
    const session = loadLevel(level);
    expect(session.latent.won).toBe(false);
    for (const step of level.solution) {
      expect(applySolutionStep(session, step)).toBe(true);
    }
    expect(pulse(session)).toBe(true);
    expect(session.result.won).toBe(true);
  });

  it("mid difficulty stays dense and solvable", () => {
    const level = generateLevel(5, 77);
    expect(level.tables.length).toBe(level.width * level.height);
    expect(level.width).toBeGreaterThanOrEqual(5);
    const session = loadLevel(level);
    for (const step of level.solution) {
      expect(applySolutionStep(session, step)).toBe(true);
    }
    expect(pulse(session)).toBe(true);
    expect(session.result.won).toBe(true);
  });

  for (const d of [1, 3, 5, 8, 12]) {
    it(`diff ${d} generates a closed solvable net`, () => {
      const level = generateLevel(d, 1000 + d * 17);
      expect(level.tables.length).toBe(level.width * level.height);
      const session = loadLevel(level);
      for (const step of level.solution) {
        expect(applySolutionStep(session, step)).toBe(true);
      }
      expect(pulse(session)).toBe(true);
      expect(session.result.won).toBe(true);
      // Starting position must not already be closed
      const start = loadLevel(level);
      expect(start.latent.won).toBe(false);
    });
  }

  it("difficulty count is stable", () => {
    expect(DIFFICULTY_COUNT).toBe(20);
  });
});

describe("pulse economy", () => {
  it("scores on checks spent, not moves", () => {
    const level = buildTutorialBasics();
    const oneCheck = loadLevel(level);
    for (const step of level.solution) applySolutionStep(oneCheck, step);
    pulse(oneCheck);
    expect(oneCheck.result.won).toBe(true);
    expect(stars(oneCheck)).toBe(3);

    const threeChecks = loadLevel(level);
    pulse(threeChecks);
    pulse(threeChecks);
    for (const step of level.solution) applySolutionStep(threeChecks, step);
    pulse(threeChecks);
    expect(threeChecks.result.won).toBe(true);
    expect(stars(threeChecks)).toBe(1);
  });

  it("extra moves do not cost stars", () => {
    const level = buildTutorialBasics();
    const session = loadLevel(level);
    tryRotate(session, 1, 1);
    tryRotate(session, 1, -1);
    for (const step of level.solution) applySolutionStep(session, step);
    pulse(session);
    expect(session.result.won).toBe(true);
    expect(session.moves).toBeGreaterThan(level.par);
    expect(stars(session)).toBe(3);
  });

  it("undo is unlimited", () => {
    const level = generateLevel(3, 5);
    const session = loadLevel(level);
    for (let i = 0; i < 12; i++) {
      expect(tryRotate(session, 0, 1)).toBe(true);
    }
    for (let i = 0; i < 12; i++) {
      expect(canUndo(session)).toBe(true);
      undo(session);
    }
    expect(canUndo(session)).toBe(false);
  });

  it("spending every check without closing fails the attempt", () => {
    const level = generateLevel(2, 9);
    const session = loadLevel(level);
    expect(isFailed(session)).toBe(false);
    for (let i = 0; i < level.pulseLimit; i++) expect(pulse(session)).toBe(true);
    expect(session.result.won).toBe(false);
    expect(isFailed(session)).toBe(true);
    expect(pulse(session)).toBe(false);
  });
});

describe("openPorts", () => {
  it("endcap exposes one port", () => {
    const t = makeTable(0, { x: 0, y: 0 }, M.ENDCAP, 0, Dir.S);
    expect(openPorts(t)).toEqual([Dir.S]);
  });
});
