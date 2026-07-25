import { describe, expect, it } from "vitest";
import { Dir, Kind, MirrorOri, rotateOffset } from "./cellKind";
import { Channel } from "./cellData";
import { Module as M } from "./tableDef";
import { exitsFrom, entryPortFromIncoming, rotatedPairs } from "./portWiring";
import { makeTable } from "./tableDef";
import { createGrid } from "./gridState";
import { solve } from "./beamSolver";
import { rotateTable } from "./rotateOps";
import { DIFFICULTY_COUNT, generateLevel } from "./levelCatalog";
import { loadLevel, pulse, tryRotate } from "./puzzleSession";
import { cell, table, buildState, type LevelData } from "./levelData";

const e = cell.empty;

function L(
  partial: Omit<LevelData, "pulseLimit"> & { pulseLimit?: number },
): LevelData {
  return { pulseLimit: 3, ...partial };
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
});

describe("channels + spill", () => {
  it("matching channel wins", () => {
    const level = L({
      id: "t",
      title: "t",
      width: 5,
      height: 5,
      par: 1,
      undoLimit: 3,
      tables: [table(0, 2, 2, M.ELBOW, 2)],
      cells: [
        e(), e(), e(), e(), e(),
        e(), e(), e(), e(), e(),
        cell.emit(Dir.E, Channel.SOLID), e(), e(), e(), e(),
        e(), e(), e(), e(), e(),
        e(), e(), cell.recv(Channel.SOLID), e(), e(),
      ],
      solution: [],
    });
    const r = solve(buildState(level));
    expect(r.won).toBe(true);
    expect(r.spillReceivers).toHaveLength(0);
  });

  it("wrong channel spills and does not win", () => {
    const level = L({
      id: "t",
      title: "t",
      width: 5,
      height: 5,
      par: 1,
      undoLimit: 3,
      tables: [table(0, 2, 2, M.ELBOW, 2)],
      cells: [
        e(), e(), e(), e(), e(),
        e(), e(), e(), e(), e(),
        cell.emit(Dir.E, Channel.SOLID), e(), e(), e(), e(),
        e(), e(), e(), e(), e(),
        e(), e(), cell.recv(Channel.DASH), e(), e(),
      ],
      solution: [],
    });
    const r = solve(buildState(level));
    expect(r.won).toBe(false);
    expect(r.spillReceivers.length).toBeGreaterThan(0);
    expect(r.energizedReceivers).toHaveLength(0);
  });
});

describe("gate needs side key", () => {
  it("through blocked until side opens", () => {
    const level = L({
      id: "g",
      title: "g",
      width: 5,
      height: 5,
      par: 1,
      undoLimit: 3,
      tables: [table(0, 2, 2, M.GATE, 0)],
      cells: [
        e(), e(), cell.emit(Dir.S, Channel.SOLID), e(), e(),
        e(), e(), e(), e(), e(),
        e(), e(), e(), e(), e(),
        e(), e(), e(), e(), e(),
        e(), e(), cell.recv(Channel.SOLID), e(), e(),
      ],
      solution: [],
    });
    expect(solve(buildState(level)).won).toBe(false);
  });
});

describe("rotateTable only spins", () => {
  it("updates rotationQ", () => {
    const g = createGrid(3, 3);
    g.tables.push(makeTable(0, { x: 1, y: 1 }, M.ELBOW));
    expect(rotateTable(g, 0, 1)).toBe(true);
    expect(g.tables[0].rotationQ).toBe(1);
  });

  it("rejects locked", () => {
    const g = createGrid(3, 3);
    g.tables.push(makeTable(0, { x: 1, y: 1 }, M.ELBOW, 1, 0, true));
    expect(rotateTable(g, 0, 1)).toBe(false);
  });
});

describe("geared tables", () => {
  it("turning one turns its partner by delta*sign", () => {
    const g = createGrid(4, 4);
    const a = makeTable(0, { x: 1, y: 1 }, M.ELBOW);
    const b = makeTable(1, { x: 2, y: 2 }, M.ELBOW);
    a.link = { partner: 1, sign: -1 };
    b.link = { partner: 0, sign: -1 };
    g.tables.push(a, b);
    rotateTable(g, 0, 1);
    expect(g.tables[0].rotationQ).toBe(1);
    expect(g.tables[1].rotationQ).toBe(3); // -1 mod 4
    // Turning the partner moves the first one too (symmetric gear).
    rotateTable(g, 1, 1);
    expect(g.tables[1].rotationQ).toBe(0);
    expect(g.tables[0].rotationQ).toBe(0);
  });
});

describe("optics hazards", () => {
  it("sink absorbs a beam", () => {
    const level = L({
      id: "sink",
      title: "sink",
      width: 5,
      height: 1,
      par: 0,
      undoLimit: 1,
      tables: [],
      cells: [cell.emit(Dir.E), e(), cell.sink(), e(), cell.recv()],
      solution: [],
    });
    const r = solve(buildState(level));
    expect(r.won).toBe(false);
    expect(r.energizedReceivers).toHaveLength(0);
  });

  it("wormhole teleports and continues", () => {
    const level = L({
      id: "worm",
      title: "worm",
      width: 7,
      height: 1,
      par: 0,
      undoLimit: 1,
      tables: [],
      cells: [
        cell.emit(Dir.E),
        e(),
        cell.worm(0),
        cell.wall(),
        cell.worm(0),
        e(),
        cell.recv(),
      ],
      solution: [],
    });
    const r = solve(buildState(level));
    expect(r.won).toBe(true);
  });

  it("filter blocks wrong channel", () => {
    const level = L({
      id: "filter",
      title: "filter",
      width: 5,
      height: 1,
      par: 0,
      undoLimit: 1,
      tables: [],
      cells: [
        cell.emit(Dir.E, Channel.SOLID),
        e(),
        cell.filter(Channel.DASH),
        e(),
        cell.recv(Channel.SOLID),
      ],
      solution: [],
    });
    expect(solve(buildState(level)).won).toBe(false);
  });

  it("one-way barrier passes forward and blocks reverse", () => {
    const forward = L({
      id: "barrier-forward",
      title: "barrier-forward",
      width: 5,
      height: 1,
      par: 0,
      undoLimit: 1,
      tables: [],
      cells: [cell.emit(Dir.E), e(), cell.barrier(Dir.E), e(), cell.recv()],
      solution: [],
    });
    expect(solve(buildState(forward)).won).toBe(true);

    const reverse = L({
      id: "barrier-reverse",
      title: "barrier-reverse",
      width: 5,
      height: 1,
      par: 0,
      undoLimit: 1,
      tables: [],
      cells: [cell.recv(), e(), cell.barrier(Dir.E), e(), cell.emit(Dir.W)],
      solution: [],
    });
    expect(solve(buildState(reverse)).won).toBe(false);
  });

  it("mirror reflects into receiver", () => {
    const level = L({
      id: "mir",
      title: "mir",
      width: 3,
      height: 3,
      par: 0,
      undoLimit: 1,
      tables: [],
      cells: [
        e(),
        cell.recv(),
        e(),
        cell.emit(Dir.E),
        cell.mir(MirrorOri.SLASH),
        e(),
        e(),
        e(),
        e(),
      ],
      solution: [],
    });
    expect(solve(buildState(level)).won).toBe(true);
  });
});

describe("pulse win gate", () => {
  it("solved board does not win until pulse", () => {
    const level = L({
      id: "p",
      title: "p",
      width: 5,
      height: 1,
      par: 0,
      undoLimit: 1,
      pulseLimit: 2,
      tables: [],
      cells: [cell.emit(Dir.E), e(), e(), e(), cell.recv()],
      solution: [],
    });
    const session = loadLevel(level);
    expect(session.result.won).toBe(false);
    expect(session.beamsVisible).toBe(false);
    expect(pulse(session)).toBe(true);
    expect(session.result.won).toBe(true);
    expect(session.pulsesUsed).toBe(1);
  });
});

describe("gate+channel procedural levels", () => {
  it("exposes 20 difficulties", () => {
    expect(DIFFICULTY_COUNT).toBe(20);
  });

  it("level 1 teaches the kit with room to probe", () => {
    for (const seed of [1, 7, 42]) {
      const level = generateLevel(1, seed);
      expect(level.tables.some((t) => t.module === M.CROSS)).toBe(true);
      expect(level.tables.some((t) => t.module === M.GATE)).toBe(true);
      expect(level.cells.filter((c) => c.kind === Kind.WORMHOLE).length).toBeGreaterThanOrEqual(2);
      expect(level.cells.filter((c) => c.kind === Kind.BARRIER).length).toBeGreaterThanOrEqual(2);
      expect(level.pulseLimit).toBeGreaterThanOrEqual(3);
      expect(level.undoLimit).toBeGreaterThanOrEqual(2);
      const session = loadLevel(level);
      for (const step of level.solution) {
        expect(tryRotate(session, step.tableId, step.delta)).toBe(true);
      }
      expect(session.result.won).toBe(false);
      expect(pulse(session)).toBe(true);
      expect(session.result.won).toBe(true);

      // The wall chamber makes the wormhole bypass mandatory.
      const withoutWorms = buildState({
        ...level,
        cells: level.cells.map((c) =>
          c.kind === Kind.WORMHOLE && (c.channel ?? 0) === 0 ? cell.empty() : c,
        ),
        tables: level.tables.map((t, i) => ({
          ...t,
          rotationQ: session.state.tables[i].rotationQ,
        })),
      });
      expect(solve(withoutWorms).won).toBe(false);

      const elbow = level.tables.find((t) => t.module === M.ELBOW && !t.locked);
      expect(elbow).toBeTruthy();
      const g = buildState({
        ...level,
        tables: level.tables.map((t, i) => ({
          ...t,
          rotationQ: session.state.tables[i].rotationQ,
        })),
      });
      const et = g.tables.find((t) => t.id === elbow!.id)!;
      et.rotationQ = (et.rotationQ + 1) % 4;
      expect(solve(g).won).toBe(false);
    }
  });

  it("late levels keep multi-channel and scarce pulses", () => {
    for (const seed of [7, 99]) {
      const level = generateLevel(20, seed);
      const emits = level.cells.filter((c) => c.kind === Kind.EMITTER);
      expect(new Set(emits.map((c) => c.channel ?? 0)).size).toBe(3);
      expect(level.tables.some((t) => t.module === M.CROSS)).toBe(true);
      expect(level.pulseLimit).toBe(1);
      expect(level.undoLimit).toBe(1);
      expect(level.par).toBeGreaterThanOrEqual(13);
    }
  });

  it("every level has gate, tee, shared cross, and no crates", () => {
    for (const seed of [1, 42]) {
      for (const d of [1, 8, 14, 20]) {
        const level = generateLevel(d, seed * 17 + d);
        expect(level.tables.some((t) => t.module === M.GATE)).toBe(true);
        expect(level.tables.some((t) => t.module === M.TEE)).toBe(true);
        expect(level.tables.some((t) => t.module === M.CROSS)).toBe(true);
        expect(level.cells.some((c) => c.kind === Kind.CRATE)).toBe(false);
        const emits = level.cells.filter((c) => c.kind === Kind.EMITTER);
        const minCh = d <= 5 ? 2 : 3;
        expect(new Set(emits.map((c) => c.channel ?? 0)).size).toBeGreaterThanOrEqual(minCh);
      }
    }
  });

  it("no receiver is walled off from emitters", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const level = generateLevel(1 + (seed % 20), seed * 13);
      const w = level.width;
      const twinOf = (x: number, y: number) => {
        const c = level.cells[y * w + x];
        if (c.kind !== Kind.WORMHOLE) return null;
        const pairId = c.channel ?? 0;
        for (let yy = 0; yy < level.height; yy++) {
          for (let xx = 0; xx < w; xx++) {
            if (xx === x && yy === y) continue;
            const o = level.cells[yy * w + xx];
            if (o.kind === Kind.WORMHOLE && (o.channel ?? 0) === pairId) return { x: xx, y: yy };
          }
        }
        return null;
      };
      const passable = (x: number, y: number) =>
        x >= 0 &&
        y >= 0 &&
        x < w &&
        y < level.height &&
        level.cells[y * w + x].kind !== Kind.WALL;
      const starts: { x: number; y: number }[] = [];
      const recvs: { x: number; y: number }[] = [];
      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < w; x++) {
          const c = level.cells[y * w + x];
          if (c.kind === Kind.EMITTER) starts.push({ x, y });
          if (c.kind === Kind.RECEIVER) recvs.push({ x, y });
        }
      }
      const seen = new Set<string>();
      const q = [...starts];
      for (const s of starts) seen.add(`${s.x},${s.y}`);
      while (q.length) {
        const p = q.pop()!;
        const twin = twinOf(p.x, p.y);
        if (twin && !seen.has(`${twin.x},${twin.y}`)) {
          seen.add(`${twin.x},${twin.y}`);
          q.push(twin);
        }
        for (const [dx, dy] of [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ]) {
          const n = { x: p.x + dx, y: p.y + dy };
          const k = `${n.x},${n.y}`;
          if (seen.has(k) || !passable(n.x, n.y)) continue;
          seen.add(k);
          q.push(n);
        }
      }
      for (const r of recvs) {
        expect(seen.has(`${r.x},${r.y}`)).toBe(true);
      }
    }
  }, 20000);

  it("cropped boards stay compact", () => {
    for (const d of [1, 10, 20]) {
      const level = generateLevel(d, 42 + d);
      expect(level.width * level.height).toBeLessThanOrEqual(12 * 12);
      const walls = level.cells.filter((c) => c.kind === Kind.WALL).length;
      const useful = level.cells.length - walls;
      expect(useful / level.cells.length).toBeGreaterThan(0.15);
    }
  });

  it("genius levels demand long plans and scarce pulses", () => {
    for (const seed of [3, 41]) {
      const level = generateLevel(15, seed);
      expect(level.pulseLimit).toBeLessThanOrEqual(2);
      expect(level.undoLimit).toBe(1);
      expect(level.par).toBeGreaterThanOrEqual(11);
      const emits = level.cells.filter((c) => c.kind === Kind.EMITTER);
      expect(new Set(emits.map((c) => c.channel ?? 0)).size).toBe(3);
      expect(level.cells.filter((c) => c.kind === Kind.BARRIER).length).toBeGreaterThanOrEqual(3);
    }
  }, 120000);

  it("masterpiece levels are one-pulse multi-table cold solves", () => {
    for (const seed of [5, 77]) {
      const level = generateLevel(18, seed);
      expect(level.pulseLimit).toBe(1);
      expect(level.undoLimit).toBe(1);
      expect(level.par).toBeGreaterThanOrEqual(13);
      const free = level.tables.filter((t) => !t.locked).length;
      expect(free).toBeGreaterThanOrEqual(8);
      // No lucky single-twist win from the scramble.
      for (const t of level.tables) {
        if (t.locked) continue;
        for (let q = 0; q < 4; q++) {
          if (q === t.rotationQ) continue;
          const g = buildState(level);
          g.tables.find((x) => x.id === t.id)!.rotationQ = q;
          expect(solve(g).won).toBe(false);
        }
      }
    }
  }, 180000);

  it("mid+ levels ship geared discs that stay solvable", () => {
    for (const d of [8, 12, 18]) {
      for (const seed of [4, 88]) {
        const level = generateLevel(d, seed);
        const linked = level.tables.filter((t) => t.link);
        expect(linked.length).toBeGreaterThanOrEqual(2); // ≥1 symmetric pair
        // Links are symmetric and point at real partners.
        for (const t of linked) {
          const p = level.tables.find((x) => x.id === t.link!.partner);
          expect(p).toBeTruthy();
          expect(p!.link?.partner).toBe(t.id);
        }
        // Gear-aware solution still wins.
        const session = loadLevel(level);
        for (const step of level.solution) {
          expect(tryRotate(session, step.tableId, step.delta)).toBe(true);
        }
        expect(pulse(session)).toBe(true);
        expect(session.result.won).toBe(true);
      }
    }
  }, 120000);

  it("difficulty ramps: early generous, late brutal", () => {
    const early = generateLevel(2, 11);
    const mid = generateLevel(9, 11);
    const late = generateLevel(17, 11);
    expect(early.pulseLimit).toBeGreaterThan(mid.pulseLimit);
    expect(mid.pulseLimit).toBeGreaterThanOrEqual(late.pulseLimit);
    expect(late.pulseLimit).toBe(1);
    expect(late.par).toBeGreaterThan(early.par);
    expect(early.undoLimit).toBeGreaterThan(late.undoLimit);
  }, 120000);

  for (const d of [1, 5, 10, 15, 20]) {
    it(`diff ${d} solvable via pulse and requires gate key`, () => {
      for (const seed of [1, 99]) {
        const level = generateLevel(d, seed);
        const session = loadLevel(level);
        expect(session.result.won).toBe(false);
        for (const step of level.solution) {
          expect(tryRotate(session, step.tableId, step.delta)).toBe(true);
        }
        expect(session.result.won).toBe(false);
        expect(pulse(session)).toBe(true);
        expect(session.result.won).toBe(true);
        expect(session.result.spillReceivers).toHaveLength(0);
        expect(session.moves).toBe(level.par);

        const g = buildState(level);
        for (let i = 0; i < g.cells.length; i++) {
          if (g.cells[i].kind === Kind.EMITTER && (g.cells[i].channel ?? 0) !== Channel.SOLID) {
            g.cells[i] = cell.empty();
          }
        }
        for (const t of session.state.tables) {
          const gt = g.tables.find((x) => x.id === t.id)!;
          gt.rotationQ = t.rotationQ;
        }
        expect(solve(g).won).toBe(false);
      }
    });
  }
});
