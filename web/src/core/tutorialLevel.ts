import { Dir } from "./cellKind";
import { cell, table, type LevelData } from "./levelData";
import { moduleForPorts } from "./portWiring";

const e = () => cell.empty();

function denseFromPorts(
  ports: number[][],
  w: number,
  h: number,
  id: string,
  title: string,
  hint: string,
): LevelData {
  const tables = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const shaped = moduleForPorts(ports[i]!);
      if (!shaped) throw new Error(`tutorial ports invalid at ${x},${y}`);
      tables.push(table(i, x, y, shaped.module, shaped.rotationQ, 0, false));
    }
  }
  return {
    id,
    title,
    width: w,
    height: h,
    par: 1,
    undoLimit: 8,
    pulseLimit: 6,
    tokenBudget: 0,
    tables,
    cells: Array.from({ length: w * h }, () => e()),
    solution: [],
    hint,
    tutorial: true,
  };
}

function portsFromEdges(w: number, h: number, edges: [number, number, number, number][]): number[][] {
  const ports: number[][] = Array.from({ length: w * h }, () => []);
  const add = (x: number, y: number, dir: number) => {
    ports[y * w + x]!.push(dir);
  };
  for (const [x1, y1, x2, y2] of edges) {
    if (x2 === x1 + 1 && y2 === y1) {
      add(x1, y1, Dir.E);
      add(x2, y2, Dir.W);
    } else if (x2 === x1 - 1 && y2 === y1) {
      add(x1, y1, Dir.W);
      add(x2, y2, Dir.E);
    } else if (y2 === y1 + 1 && x2 === x1) {
      add(x1, y1, Dir.S);
      add(x2, y2, Dir.N);
    } else if (y2 === y1 - 1 && x2 === x1) {
      add(x1, y1, Dir.N);
      add(x2, y2, Dir.S);
    }
  }
  return ports;
}

/**
 * Lesson 1 — 2×2 ring of elbows. One disc starts wrong.
 */
export function buildTutorialBasics(): LevelData {
  const w = 2;
  const h = 2;
  const ports = portsFromEdges(w, h, [
    [0, 0, 1, 0],
    [1, 0, 1, 1],
    [1, 1, 0, 1],
    [0, 1, 0, 0],
  ]);
  const level = denseFromPorts(
    ports,
    w,
    h,
    "tutorial_basics",
    "Lesson 1 · Close the circuit",
    "Turn discs so every mark meets a neighbor. Then PULSE.",
  );
  level.tables[0]!.rotationQ = (level.tables[0]!.rotationQ + 1) % 4;
  level.solution = [{ tableId: 0, delta: -1 }];
  level.par = 1;
  return level;
}

/**
 * Lesson 2 — full 3×3 spanning tree (every cell a disc).
 */
export function buildTutorialChannels(): LevelData {
  const w = 3;
  const h = 3;
  // Spanning tree covering all 9 cells + one chord for a short loop.
  const ports = portsFromEdges(w, h, [
    [0, 0, 1, 0],
    [1, 0, 2, 0],
    [0, 0, 0, 1],
    [1, 0, 1, 1],
    [2, 0, 2, 1],
    [0, 1, 0, 2],
    [1, 1, 1, 2],
    [2, 1, 2, 2],
    [1, 2, 2, 2], // chord
  ]);
  const level = denseFromPorts(
    ports,
    w,
    h,
    "tutorial_depth",
    "Lesson 2 · One network",
    "Every stub must meet another. The whole board is one circuit.",
  );
  level.tables[4]!.rotationQ = (level.tables[4]!.rotationQ + 1) % 4;
  level.tables[1]!.rotationQ = (level.tables[1]!.rotationQ + 2) % 4;
  level.solution = [
    { tableId: 4, delta: -1 },
    { tableId: 1, delta: 1 },
    { tableId: 1, delta: 1 },
  ];
  level.par = 3;
  return level;
}

export type PointTarget =
  | { kind: "cell"; x: number; y: number }
  | { kind: "table"; id: number }
  | { kind: "ui"; id: "pulse" | "turn" };

export type PointBeat = {
  title: string;
  body: string;
  at: PointTarget;
};

export function buildTutorialShowcase(): LevelData {
  const level = buildTutorialBasics();
  if (level.tables[0]) level.tables[0].rotationQ = (level.tables[0].rotationQ + 3) % 4;
  level.id = "tutorial_showcase";
  level.title = "Meet the board";
  level.pulseLimit = 0;
  level.solution = [];
  return level;
}

export const SHOWCASE_POINTS: PointBeat[] = [
  {
    title: "Discs",
    body: "Every cell is a disc. The marks show which sides are open.",
    at: { kind: "table", id: 0 },
  },
  {
    title: "Meet the marks",
    body: "Two discs connect when open sides face each other. Open ends that meet nothing are wrong.",
    at: { kind: "table", id: 1 },
  },
  {
    title: "One circuit",
    body: "Win when every mark meets a neighbor and the whole board is one network.",
    at: { kind: "table", id: 2 },
  },
  {
    title: "Turn",
    body: "Tap a disc, then hold ↺ or ↻ and twist to turn.",
    at: { kind: "ui", id: "turn" },
  },
  {
    title: "Pulse",
    body: "PULSE checks the circuit. Pulses are limited — think, then fire.",
    at: { kind: "ui", id: "pulse" },
  },
];

export function buildThemePreviewLevel(): LevelData {
  const level = buildTutorialBasics();
  if (level.tables[0]) level.tables[0].rotationQ = (level.tables[0].rotationQ + 3) % 4;
  level.id = "theme_preview";
  level.title = "Preview";
  level.solution = [];
  return level;
}

export function buildTutorialLevel(): LevelData {
  return buildTutorialBasics();
}
