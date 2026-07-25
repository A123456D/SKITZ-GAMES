import { describe, expect, it } from "vitest";
import { Dir, Kind, MirrorOri, rotateOffset } from "./cellKind";
import { Channel } from "./cellData";
import { Module as M } from "./tableDef";
import { exitsFrom, entryPortFromIncoming, rotatedPairs } from "./portWiring";
import { makeTable } from "./tableDef";
import { createGrid, cloneGrid } from "./gridState";
import { solve } from "./beamSolver";
import { rotateTable, applyPlayerRotation } from "./rotateOps";
import { DIFFICULTY_COUNT, generateLevel } from "./levelCatalog";
import { loadLevel, pulse, tryRotate, tryFlipPhase, tryPlaceToken, applySolutionStep } from "./puzzleSession";
import { cell, table, buildState, type LevelData } from "./levelData";

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

describe("phase + tokens", () => {
  it("phase switch flips beam through a phase gate", () => {
    // Emit → switch → gate(B) → recv. Switch starts off → blocked; arm → win.
    const level = L({
      id: "phase",
      title: "phase",
      width: 5,
      height: 1,
      par: 1,
      undoLimit: 2,
      tables: [],
      cells: [
        cell.emit(Dir.E),
        cell.phaseSwitch(0),
        cell.phaseGate(1),
        e(),
        cell.recv(),
      ],
      solution: [],
    });
    expect(solve(buildState(level)).won).toBe(false);
    const session = loadLevel(level);
    expect(tryFlipPhase(session, 1, 0)).toBe(true);
    expect(pulse(session)).toBe(true);
    expect(session.result.won).toBe(true);
  });

  it("phase-locked receiver rejects wrong polarity on any route", () => {
    const level = L({
      id: "phase-recv",
      title: "phase-recv",
      width: 4,
      height: 1,
      par: 1,
      undoLimit: 2,
      tables: [],
      cells: [cell.emit(Dir.E), cell.phaseSwitch(0), e(), cell.recv(0, -1, 1)],
      solution: [],
    });
    expect(solve(buildState(level)).won).toBe(false);
    const session = loadLevel(level);
    expect(tryFlipPhase(session, 1, 0)).toBe(true);
    expect(pulse(session)).toBe(true);
    expect(session.result.won).toBe(true);
  });

  it("token door stays shut until pad holds a token", () => {
    const level = L({
      id: "token",
      title: "token",
      width: 5,
      height: 2,
      par: 1,
      undoLimit: 2,
      tokenBudget: 1,
      tables: [],
      cells: [
        cell.emit(Dir.E),
        cell.tokenDoor(1),
        e(),
        e(),
        cell.recv(),
        e(),
        cell.pad(0, 1),
        e(),
        e(),
        e(),
      ],
      solution: [],
    });
    expect(solve(buildState(level)).won).toBe(false);
    const session = loadLevel(level);
    expect(session.tokensLeft).toBe(1);
    expect(tryPlaceToken(session, 1, 1)).toBe(true);
    expect(session.tokensLeft).toBe(0);
    expect(pulse(session)).toBe(true);
    expect(session.result.won).toBe(true);
  });

  it("mid levels require phase and tokens", () => {
    for (const seed of [7, 42]) {
      const level = generateLevel(5, seed);
      expect(level.cells.some((c) => c.kind === Kind.PHASE_SWITCH)).toBe(true);
      expect(level.cells.some((c) => c.kind === Kind.PHASE_GATE)).toBe(true);
      expect(level.cells.some((c) => c.kind === Kind.PAD)).toBe(true);
      expect(level.cells.some((c) => c.kind === Kind.TOKEN_DOOR)).toBe(true);
      expect(level.tokenBudget).toBeGreaterThanOrEqual(1);
      const session = loadLevel(level);
      for (const step of level.solution) {
        expect(applySolutionStep(session, step)).toBe(true);
      }
      expect(pulse(session)).toBe(true);
      expect(session.result.won).toBe(true);
    }
  }, 180000);
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
      expect(level.par).toBeGreaterThanOrEqual(6);
      const session = loadLevel(level);
      for (const step of level.solution) {
        expect(applySolutionStep(session, step)).toBe(true);
      }
      expect(session.result.won).toBe(false);
      expect(pulse(session)).toBe(true);
      expect(session.result.won).toBe(true);

      // Wormholes must be load-bearing: removing pair 0 breaks the solved board.
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
  }, 60000);

  it("late levels keep multi-channel and scarce pulses", () => {
    for (const seed of [7, 99]) {
      const level = generateLevel(20, seed);
      const emits = level.cells.filter((c) => c.kind === Kind.EMITTER);
      expect(new Set(emits.map((c) => c.channel ?? 0)).size).toBe(3);
      expect(level.tables.some((t) => t.module === M.CROSS)).toBe(true);
      expect(level.pulseLimit).toBe(1);
      expect(level.undoLimit).toBe(1);
      expect(level.par).toBeGreaterThanOrEqual(10);
    }
  }, 60000);

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
  }, 120000);

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
  }, 90000);

  it("cropped boards stay compact", () => {
    for (const d of [1, 10, 20]) {
      const level = generateLevel(d, 42 + d);
      expect(level.width * level.height).toBeLessThanOrEqual(12 * 12);
      const walls = level.cells.filter((c) => c.kind === Kind.WALL).length;
      const useful = level.cells.length - walls;
      expect(useful / level.cells.length).toBeGreaterThan(0.15);
    }
  }, 60000);

  it("genius levels demand long plans and scarce pulses", () => {
    for (const seed of [3, 41]) {
      const level = generateLevel(15, seed);
      expect(level.pulseLimit).toBeLessThanOrEqual(2);
      expect(level.undoLimit).toBe(1);
      expect(level.par).toBeGreaterThanOrEqual(10);
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
      expect(level.par).toBeGreaterThanOrEqual(10);
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
          expect(applySolutionStep(session, step)).toBe(true);
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
    // Reasoning depth > move count: late may lock more locally-obvious discs
    // (shorter par) while keeping scarcer pulses and fewer undos.
    expect(early.undoLimit).toBeGreaterThan(late.undoLimit);
    const lateFree = late.tables.filter((t) => !t.locked).length;
    expect(lateFree).toBeGreaterThanOrEqual(4);
    expect(early.pulseLimit + early.undoLimit).toBeGreaterThan(late.pulseLimit + late.undoLimit);
  }, 180000);

  it("no level ships a cheap short-cut below its difficulty floor", () => {
    for (const d of [1, 2, 5, 10, 20]) {
      for (const seed of [7, 42]) {
        const level = generateLevel(d, seed);
        const start = buildState(level);
        expect(solve(start).won).toBe(false);
        const acts = level.tables
          .filter((t) => !t.locked && !(t.link && t.id > t.link.partner))
          .map((t) => t.id);
        const keyOf = (g: ReturnType<typeof buildState>) =>
          g.tables.map((t) => t.rotationQ).join("");
        let frontier = [start];
        const seen = new Set([keyOf(start)]);
        // Generation exhaustively rejects any win within 3 player actions, so no
        // 1–3 move stumble exists (the old failure was 3–5 move stumbles).
        const floor = Math.min(level.par, 3);
        for (let depth = 0; depth < floor; depth++) {
          const next: typeof frontier = [];
          for (const cur of frontier) {
            for (const id of acts) {
              const table = cur.tables.find((t) => t.id === id)!;
              for (let q = 0; q < 4; q++) {
                if (q === table.rotationQ) continue;
                const g = cloneGrid(cur);
                applyPlayerRotation(g, id, q);
                const k = keyOf(g);
                if (seen.has(k)) continue;
                seen.add(k);
                expect(solve(g).won).toBe(false);
                next.push(g);
              }
            }
          }
          frontier = next;
          if (!frontier.length) break;
        }
        expect(level.par).toBeGreaterThanOrEqual(d === 1 ? 6 : 7);
      }
    }
  }, 600000);

  it("free discs are coupled: multi-channel hubs and multi-receiver interference", () => {
    for (const d of [2, 8, 12, 20]) {
      for (const seed of [11, 53]) {
        const level = generateLevel(d, seed);
        const session = loadLevel(level);
        for (const step of level.solution) {
          expect(applySolutionStep(session, step)).toBe(true);
        }
        expect(pulse(session)).toBe(true);
        expect(session.result.won).toBe(true);

        const solved: LevelData = {
          ...level,
          cells: session.state.cells.map((c) => ({ ...c })),
          tables: session.state.tables.map((t) => ({
            ...t,
            hub: { ...t.hub },
            link: t.link ? { ...t.link } : undefined,
          })),
        };
        const result = solve(buildState(solved));

        let multi = 0;
        for (const t of solved.tables) {
          if (t.locked) continue;
          const ch = new Set<number>();
          for (const beam of result.beams) {
            for (const seg of beam.segments) {
              if (
                (seg.from.x === t.hub.x && seg.from.y === t.hub.y) ||
                (seg.to.x === t.hub.x && seg.to.y === t.hub.y)
              ) {
                ch.add(beam.channel);
              }
            }
          }
          if (ch.size >= 2) multi++;
        }
        expect(multi).toBeGreaterThanOrEqual(d >= 6 ? 2 : 1);

        const litKeys = new Set(result.energizedReceivers.map((p) => `${p.x},${p.y}`));
        let highInterf = 0;
        let localFree = 0;
        for (const t of solved.tables) {
          if (t.locked) continue;
          let bestLost = 0;
          for (let dq = 1; dq <= 3; dq++) {
            const g = buildState(solved);
            g.tables.find((x) => x.id === t.id)!.rotationQ = (t.rotationQ + dq) % 4;
            const r = solve(g);
            const still = new Set(r.energizedReceivers.map((p) => `${p.x},${p.y}`));
            let lost = 0;
            for (const k of litKeys) if (!still.has(k)) lost++;
            bestLost = Math.max(bestLost, lost);
          }
          if (bestLost >= 2) highInterf++;
          if (
            (t.module === M.ELBOW || t.module === M.STRAIGHT) &&
            bestLost < 2
          ) {
            localFree++;
          }
        }
        expect(highInterf).toBeGreaterThanOrEqual(d >= 10 ? 4 : 3);
        // Coupled discs should dominate; a few locally-obvious free elbows may remain
        // (worm-chamber disc, DoF floor). Ratio — not absolute zero — is the bar.
        const freeElbows = solved.tables.filter(
          (t) => !t.locked && (t.module === M.ELBOW || t.module === M.STRAIGHT),
        ).length;
        if (freeElbows > 0) {
          expect(localFree / freeElbows).toBeLessThanOrEqual(d >= 16 ? 0.55 : 0.65);
        }
        expect(localFree).toBeLessThan(freeElbows); // at least one free elbow is coupled
      }
    }
  }, 300000);

  it("worm-fed beams always need a player disc (no free auto-LINKED)", () => {
    for (const d of [1, 5, 10, 18]) {
      for (const seed of [3, 71]) {
        const level = generateLevel(d, seed);
        const session = loadLevel(level);
        for (const step of level.solution) {
          expect(applySolutionStep(session, step)).toBe(true);
        }
        expect(pulse(session)).toBe(true);
        expect(session.result.won).toBe(true);

        const w = level.width;
        const at = (p: { x: number; y: number }) => level.cells[p.y * w + p.x];

        for (const beam of session.result.beams) {
          const visitsWorm = beam.segments.some((seg) => {
            for (const p of [seg.from, seg.to]) {
              if (at(p)?.kind === Kind.WORMHOLE) return true;
            }
            return false;
          });
          if (!visitsWorm) continue;
          const freeOnBeam = level.tables.filter((t) => {
            if (t.locked) return false;
            return beam.segments.some(
              (seg) =>
                (seg.from.x === t.hub.x && seg.from.y === t.hub.y) ||
                (seg.to.x === t.hub.x && seg.to.y === t.hub.y),
            );
          });
          expect(freeOnBeam.length).toBeGreaterThan(0);
          // Scrambling that disc must be able to darken this channel's receiver.
          const disc = freeOnBeam[0];
          const g = buildState({
            ...level,
            tables: session.state.tables.map((t) => ({
              ...t,
              hub: { ...t.hub },
              link: t.link ? { ...t.link } : undefined,
            })),
          });
          const gt = g.tables.find((x) => x.id === disc.id)!;
          gt.rotationQ = (gt.rotationQ + 1) % 4;
          expect(solve(g).won).toBe(false);
        }
      }
    }
  }, 240000);

  it("beams stay blind until pulse (no latent win / lit cheats)", () => {
    const level = generateLevel(4, 19);
    const session = loadLevel(level);
    expect(session.beamsVisible).toBe(false);
    expect(session.result.beams).toHaveLength(0);
    expect(session.result.energizedReceivers).toHaveLength(0);
    expect(session.result.won).toBe(false);
    for (const step of level.solution) {
      expect(applySolutionStep(session, step)).toBe(true);
      expect(session.beamsVisible).toBe(false);
      expect(session.result.won).toBe(false);
      expect(session.result.beams).toHaveLength(0);
    }
    expect(pulse(session)).toBe(true);
    expect(session.beamsVisible).toBe(true);
    expect(session.result.won).toBe(true);
  }, 60000);

  for (const d of [1, 5, 10, 15, 20]) {
    it(`diff ${d} solvable via pulse and requires gate key`, () => {
      for (const seed of [1, 99]) {
        const level = generateLevel(d, seed);
        const session = loadLevel(level);
        expect(session.result.won).toBe(false);
        for (const step of level.solution) {
          expect(applySolutionStep(session, step)).toBe(true);
        }
        expect(session.result.won).toBe(false);
        expect(pulse(session)).toBe(true);
        expect(session.result.won).toBe(true);
        expect(session.result.spillReceivers).toHaveLength(0);
        expect(session.moves).toBe(level.solution.length);
        expect(level.par).toBeLessThanOrEqual(level.solution.length);

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
    }, 180000);
  }
});
