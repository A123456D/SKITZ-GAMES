import type { LevelDef, TileKind } from "./types";
import { PLAY_KINDS } from "./types";

type Face = TileKind[][];

/** Shared quiet filler face — no opening matches, 6-kind pool. */
function quietFace(seedRow: number): Face {
  // Deterministic staggered pattern across PLAY_KINDS; no 3-line / 2×2.
  const k = PLAY_KINDS;
  const rows: Face = [];
  for (let r = 0; r < 6; r++) {
    const row: TileKind[] = [];
    for (let c = 0; c < 6; c++) {
      row.push(k[(r * 2 + c * 3 + seedRow) % k.length]!);
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Level 1 — teach swipe matches on FRONT.
 * Crafted so row-0 twist +1 pulls a heart from LEFT → three hearts.
 * Also col-2 twist -1 pulls a flame from TOP → three flames.
 */
const L1_FRONT: Face = [
  ["heart", "heart", "bolt", "star", "flame", "diamond"],
  ["bolt", "star", "flame", "diamond", "flame", "heart"],
  ["star", "flame", "diamond", "skull", "skull", "bolt"],
  ["flame", "diamond", "skull", "heart", "bolt", "star"],
  ["diamond", "skull", "heart", "bolt", "star", "flame"],
  ["skull", "heart", "bolt", "star", "diamond", "skull"],
];

const L1_LEFT: Face = [
  ["bolt", "star", "flame", "diamond", "skull", "heart"], // [5]=heart → FRONT row0 +1
  ["star", "flame", "diamond", "skull", "heart", "bolt"],
  ["flame", "diamond", "skull", "heart", "bolt", "star"],
  ["diamond", "skull", "heart", "bolt", "star", "flame"],
  ["skull", "heart", "bolt", "star", "flame", "diamond"],
  ["heart", "bolt", "star", "flame", "diamond", "skull"],
];

const L1_TOP: Face = [
  ["star", "flame", "diamond", "skull", "heart", "bolt"],
  ["flame", "diamond", "skull", "heart", "bolt", "star"],
  ["diamond", "skull", "heart", "bolt", "star", "flame"],
  ["skull", "heart", "bolt", "star", "flame", "diamond"],
  ["heart", "bolt", "star", "flame", "diamond", "skull"],
  ["bolt", "star", "diamond", "skull", "flame", "heart"], // [4]=flame → FRONT col4 +1
];

const L1_RIGHT = quietFace(1);
const L1_BACK = quietFace(2);
const L1_BOTTOM = quietFace(3);

export const LEVEL_1: LevelDef = {
  id: "level-1",
  title: "LEVEL 1",
  size: 6,
  moves: 18,
  goals: [
    { kind: "heart", need: 8 },
    { kind: "flame", need: 6 },
  ],
  board: L1_FRONT,
  boardBack: L1_BACK,
  boardRight: L1_RIGHT,
  boardLeft: L1_LEFT,
  boardTop: L1_TOP,
  boardBottom: L1_BOTTOM,
  kinds: PLAY_KINDS,
  starScores: [300, 700, 1200],
};

/** Level 2 — denser goals, fewer moves. */
const L2_FRONT: Face = [
  ["skull", "skull", "bolt", "star", "flame", "diamond"],
  ["heart", "bolt", "star", "flame", "diamond", "heart"],
  ["bolt", "star", "flame", "diamond", "heart", "bolt"],
  ["star", "flame", "diamond", "heart", "bolt", "star"],
  ["flame", "diamond", "heart", "bolt", "star", "flame"],
  ["diamond", "heart", "bolt", "star", "flame", "diamond"],
];

export const LEVEL_2: LevelDef = {
  id: "level-2",
  title: "LEVEL 2",
  size: 6,
  moves: 16,
  goals: [
    { kind: "skull", need: 10 },
    { kind: "bolt", need: 8 },
    { kind: "star", need: 8 },
  ],
  board: L2_FRONT,
  boardLeft: [
    ["diamond", "flame", "star", "bolt", "heart", "skull"], // feeds FRONT row0 +1 → 3 skulls
    ["flame", "star", "bolt", "heart", "skull", "diamond"],
    ["star", "bolt", "heart", "skull", "diamond", "flame"],
    ["bolt", "heart", "skull", "diamond", "flame", "star"],
    ["heart", "skull", "diamond", "flame", "star", "bolt"],
    ["skull", "diamond", "flame", "star", "bolt", "heart"],
  ],
  kinds: PLAY_KINDS,
  seed: 2202,
  starScores: [400, 900, 1500],
};

/** Level 3 — tight budget, three goals. */
export const LEVEL_3: LevelDef = {
  id: "level-3",
  title: "LEVEL 3",
  size: 6,
  moves: 14,
  goals: [
    { kind: "diamond", need: 12 },
    { kind: "heart", need: 10 },
    { kind: "flame", need: 10 },
  ],
  kinds: PLAY_KINDS,
  seed: 3303,
  starScores: [500, 1100, 1800],
};

export const LEVELS: LevelDef[] = [LEVEL_1, LEVEL_2, LEVEL_3];
