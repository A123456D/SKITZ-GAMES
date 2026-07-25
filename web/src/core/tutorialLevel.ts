import { Dir, MirrorOri } from "./cellKind";
import { Module } from "./tableDef";
import { cell, table, type LevelData } from "./levelData";

const e = () => cell.empty();

/**
 * Lesson 1 — Turn & Pulse.
 * Emitter → straight table (starts N–S) → receiver. One turn, then pulse.
 */
export function buildTutorialBasics(): LevelData {
  const width = 5;
  const height = 3;
  const cells = [
    e(), e(), e(), e(), e(),
    cell.emit(Dir.E), e(), e(), e(), cell.recv(),
    e(), e(), e(), e(), e(),
  ];
  cells[1 * width + 2] = cell.empty(0);
  return {
    id: "tutorial_basics",
    title: "Lesson 1 · Turn & Pulse",
    width,
    height,
    par: 1,
    undoLimit: 4,
    pulseLimit: 5,
    tables: [table(0, 2, 1, Module.STRAIGHT, 0, 0, false)],
    cells,
    solution: [{ tableId: 0, delta: 1 }],
    hint: "Select the disc → turn with ↺ / ↻ (or drag) → PULSE to fire.",
    tutorial: true,
  };
}

/**
 * Lesson 2 — Channels.
 * Two lanes, two channels. Each straight starts wrong; turn both, then pulse.
 */
export function buildTutorialChannels(): LevelData {
  const width = 5;
  const height = 5;
  const cells = Array.from({ length: width * height }, () => e());
  cells[1 * width + 0] = cell.emit(Dir.E, 0);
  cells[1 * width + 2] = cell.empty(0);
  cells[1 * width + 4] = cell.recv(0);
  cells[3 * width + 0] = cell.emit(Dir.E, 1);
  cells[3 * width + 2] = cell.empty(1);
  cells[3 * width + 4] = cell.recv(1);
  return {
    id: "tutorial_channels",
    title: "Lesson 2 · Channels",
    width,
    height,
    par: 2,
    undoLimit: 5,
    pulseLimit: 5,
    tables: [
      table(0, 2, 1, Module.STRAIGHT, 0, 0, false),
      table(1, 2, 3, Module.STRAIGHT, 0, 0, false),
    ],
    cells,
    solution: [
      { tableId: 0, delta: 1 },
      { tableId: 1, delta: 1 },
    ],
    hint: "Solid ≠ dashed. Turn BOTH discs so each beam hits its matching receiver, then PULSE.",
    tutorial: true,
  };
}

/**
 * Lesson 3 — Depth (wormhole + barrier + mirror on the board).
 * Straight starts wrong; after the turn the beam enters a wormhole and
 * exits its twin toward the receiver through a one-way barrier.
 */
export function buildTutorialDepth(): LevelData {
  const width = 5;
  const height = 5;
  const cells = Array.from({ length: width * height }, () => e());
  cells[2 * width + 0] = cell.emit(Dir.E);
  cells[2 * width + 2] = cell.empty(0);
  cells[2 * width + 3] = cell.worm(0);
  cells[4 * width + 1] = cell.worm(0);
  cells[4 * width + 2] = cell.barrier(Dir.E);
  cells[4 * width + 3] = cell.recv();
  // Tap-to-learn props (not on the critical path)
  cells[0 * width + 4] = cell.mir(MirrorOri.SLASH);
  cells[4 * width + 0] = cell.sink();
  return {
    id: "tutorial_depth",
    title: "Lesson 3 · Depth",
    width,
    height,
    par: 1,
    undoLimit: 5,
    pulseLimit: 5,
    tables: [table(0, 2, 2, Module.STRAIGHT, 0, 0, false)],
    cells,
    solution: [{ tableId: 0, delta: 1 }],
    hint: "Turn the disc. The beam jumps through the wormhole, then passes the one-way barrier. Tap symbols to learn them.",
    tutorial: true,
  };
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

/**
 * Showcase board for the finger-point tour — every major symbol laid out
 * so the coach can point at one thing at a time (not meant to be solved).
 *
 * Layout (7×5):
 *   ·  E→ ·  R  ·  /  ·
 *  W0 · [T] · W0 ·  F0
 *   ·  ·  ·  ·  ·  ·  ·
 *  B→ S  ·  □  · E1 R1
 *   ·  ·  ·  ·  ·  ·  ·
 */
export function buildTutorialShowcase(): LevelData {
  const width = 7;
  const height = 5;
  const cells = Array.from({ length: width * height }, () => e());
  cells[0 * width + 1] = cell.emit(Dir.E, 0);
  cells[0 * width + 3] = cell.recv(0);
  cells[0 * width + 5] = cell.mir(MirrorOri.SLASH);
  cells[1 * width + 0] = cell.worm(0);
  cells[1 * width + 2] = cell.empty(0);
  cells[1 * width + 4] = cell.worm(0);
  cells[1 * width + 6] = cell.filter(0);
  cells[3 * width + 0] = cell.barrier(Dir.E);
  cells[3 * width + 1] = cell.sink();
  cells[3 * width + 3] = cell.crate();
  cells[3 * width + 5] = cell.emit(Dir.E, 1);
  cells[3 * width + 6] = cell.recv(1);
  return {
    id: "tutorial_showcase",
    title: "Meet the board",
    width,
    height,
    par: 1,
    undoLimit: 0,
    pulseLimit: 0,
    tables: [table(0, 2, 1, Module.STRAIGHT, 1, 0, true)],
    cells,
    solution: [],
    tutorial: true,
  };
}

/** Ordered finger-point beats for the showcase board. */
export const SHOWCASE_POINTS: PointBeat[] = [
  {
    title: "Emitter",
    body: "This is where a beam starts. The arrow shows which way it fires when you press PULSE.",
    at: { kind: "cell", x: 1, y: 0 },
  },
  {
    title: "Receiver",
    body: "This is the goal. Light it with the matching channel to clear the board. Wrong channel = spill, and that blocks the win.",
    at: { kind: "cell", x: 3, y: 0 },
  },
  {
    title: "Turntable",
    body: "The spinning disc is your tool. Turn it so the beam path lines up — then pulse to fire.",
    at: { kind: "table", id: 0 },
  },
  {
    title: "Mirror",
    body: "Bends a beam by 90°. The slash angle decides which corner it takes.",
    at: { kind: "cell", x: 5, y: 0 },
  },
  {
    title: "Wormhole",
    body: "A beam that enters one portal exits its twin, keeping the same direction. Matching ticks mark a pair.",
    at: { kind: "cell", x: 0, y: 1 },
  },
  {
    title: "Filter",
    body: "Only one channel may pass. Solid and dashed are different — the wrong one stops here.",
    at: { kind: "cell", x: 6, y: 1 },
  },
  {
    title: "Barrier",
    body: "A one-way gate. Beams only pass while travelling through the open lane.",
    at: { kind: "cell", x: 0, y: 3 },
  },
  {
    title: "Sink",
    body: "Absorbs any beam that hits it — a dead end. Route around sinks.",
    at: { kind: "cell", x: 1, y: 3 },
  },
  {
    title: "Channels",
    body: "Solid and dashed are separate lanes. Each receiver only accepts its own channel — mix them up and you get spill.",
    at: { kind: "cell", x: 5, y: 3 },
  },
  {
    title: "Turn controls",
    body: "Use ↺ / ↻ (or drag the disc) to rotate. Commit your turns before you fire.",
    at: { kind: "ui", id: "turn" },
  },
  {
    title: "Pulse",
    body: "PULSE fires every emitter. You have a limited number of pulses — plan, then fire.",
    at: { kind: "ui", id: "pulse" },
  },
];

/** Compact solved board for the first-time theme picker in-game look preview. */
export function buildThemePreviewLevel(): LevelData {
  const width = 5;
  const height = 3;
  const cells = [
    e(), cell.worm(0), e(), e(), e(),
    cell.emit(Dir.E), e(), e(), e(), cell.recv(),
    e(), e(), e(), cell.worm(0), cell.mir(MirrorOri.SLASH),
  ];
  cells[1 * width + 2] = cell.empty(0);
  return {
    id: "theme_preview",
    title: "Preview",
    width,
    height,
    par: 1,
    undoLimit: 1,
    pulseLimit: 3,
    tables: [table(0, 2, 1, Module.STRAIGHT, 1, 0, false)],
    cells,
    solution: [],
    tutorial: true,
  };
}

export function buildTutorialLevel(): LevelData {
  return buildTutorialBasics();
}
