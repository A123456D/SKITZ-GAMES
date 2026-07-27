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
 * Crafted so row-0 twist +1 pulls headphones from LEFT → three headphones.
 * Col-4 twist +1 pulls a flame from TOP → three flames.
 */
const L1_FRONT: Face = [
  ["headphones", "headphones", "spray", "smiley", "flame", "sneaker"],
  ["spray", "smiley", "flame", "sneaker", "flame", "headphones"],
  ["smiley", "flame", "sneaker", "skull", "skull", "spray"],
  ["flame", "sneaker", "skull", "headphones", "spray", "smiley"],
  ["sneaker", "skull", "headphones", "spray", "smiley", "flame"],
  ["skull", "headphones", "spray", "smiley", "sneaker", "skull"],
];

const L1_LEFT: Face = [
  ["spray", "smiley", "flame", "sneaker", "skull", "headphones"], // [5] → FRONT row0 +1
  ["smiley", "flame", "sneaker", "skull", "headphones", "spray"],
  ["flame", "sneaker", "skull", "headphones", "spray", "smiley"],
  ["sneaker", "skull", "headphones", "spray", "smiley", "flame"],
  ["skull", "headphones", "spray", "smiley", "flame", "sneaker"],
  ["headphones", "spray", "smiley", "flame", "sneaker", "skull"],
];

const L1_TOP: Face = [
  ["smiley", "flame", "sneaker", "skull", "headphones", "spray"],
  ["flame", "sneaker", "skull", "headphones", "spray", "smiley"],
  ["sneaker", "skull", "headphones", "spray", "smiley", "flame"],
  ["skull", "headphones", "spray", "smiley", "flame", "sneaker"],
  ["headphones", "spray", "smiley", "flame", "sneaker", "skull"],
  ["spray", "smiley", "sneaker", "skull", "flame", "headphones"], // [4]=flame → FRONT col4 +1
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
    { kind: "headphones", need: 8 },
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
  ["skull", "skull", "spray", "smiley", "flame", "sneaker"],
  ["headphones", "spray", "smiley", "flame", "sneaker", "headphones"],
  ["spray", "smiley", "flame", "sneaker", "headphones", "spray"],
  ["smiley", "flame", "sneaker", "headphones", "spray", "smiley"],
  ["flame", "sneaker", "headphones", "spray", "smiley", "flame"],
  ["sneaker", "headphones", "spray", "smiley", "flame", "sneaker"],
];

export const LEVEL_2: LevelDef = {
  id: "level-2",
  title: "LEVEL 2",
  size: 6,
  moves: 16,
  goals: [
    { kind: "skull", need: 10 },
    { kind: "spray", need: 8 },
    { kind: "smiley", need: 8 },
  ],
  board: L2_FRONT,
  boardLeft: [
    ["sneaker", "flame", "smiley", "spray", "headphones", "skull"], // feeds FRONT row0 +1 → 3 skulls
    ["flame", "smiley", "spray", "headphones", "skull", "sneaker"],
    ["smiley", "spray", "headphones", "skull", "sneaker", "flame"],
    ["spray", "headphones", "skull", "sneaker", "flame", "smiley"],
    ["headphones", "skull", "sneaker", "flame", "smiley", "spray"],
    ["skull", "sneaker", "flame", "smiley", "spray", "headphones"],
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
    { kind: "sneaker", need: 12 },
    { kind: "headphones", need: 10 },
    { kind: "flame", need: 10 },
  ],
  kinds: PLAY_KINDS,
  seed: 3303,
  starScores: [500, 1100, 1800],
};

export const LEVELS: LevelDef[] = [LEVEL_1, LEVEL_2, LEVEL_3];
