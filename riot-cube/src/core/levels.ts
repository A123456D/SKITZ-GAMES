import type { LevelDef, TileKind } from "./types";
import { rotatingPlayKinds } from "./types";

type Face = TileKind[][];

/** Shared quiet filler face — no opening matches, dense rotating window. */
function quietFace(seedRow: number): Face {
  const k = rotatingPlayKinds(seedRow);
  const rows: Face = [];
  for (let r = 0; r < 6; r++) {
    const row: TileKind[] = [];
    for (let c = 0; c < 6; c++) {
      row.push(k[(r * 2 + c * 3) % k.length]!);
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Level 1 — teach twist matches on FRONT.
 * Row-0 +1 → three headphones; col-4 +1 → three flames.
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
  ["spray", "smiley", "flame", "sneaker", "skull", "headphones"],
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
  ["spray", "smiley", "sneaker", "skull", "flame", "headphones"],
];

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
  boardBack: quietFace(2),
  boardRight: quietFace(1),
  boardLeft: L1_LEFT,
  boardTop: L1_TOP,
  boardBottom: quietFace(3),
  starScores: [300, 700, 1200],
};

/** Level 2 — three goals, one clear skull opener. */
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
    ["sneaker", "flame", "smiley", "spray", "headphones", "skull"],
    ["flame", "smiley", "spray", "headphones", "skull", "sneaker"],
    ["smiley", "spray", "headphones", "skull", "sneaker", "flame"],
    ["spray", "headphones", "skull", "sneaker", "flame", "smiley"],
    ["headphones", "skull", "sneaker", "flame", "smiley", "spray"],
    ["skull", "sneaker", "flame", "smiley", "spray", "headphones"],
  ],
  seed: 2202,
  starScores: [400, 900, 1500],
};

/** Level 3 — sneaker hunt; one sneaker opener, then grind. */
const L3_FRONT: Face = [
  ["sneaker", "sneaker", "skull", "smiley", "headphones", "flame"],
  ["skull", "smiley", "headphones", "flame", "spray", "sneaker"],
  ["smiley", "headphones", "flame", "spray", "sneaker", "skull"],
  ["headphones", "flame", "spray", "sneaker", "skull", "smiley"],
  ["flame", "spray", "sneaker", "skull", "smiley", "headphones"],
  ["spray", "sneaker", "skull", "smiley", "headphones", "flame"],
];

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
  board: L3_FRONT,
  boardLeft: [
    ["flame", "skull", "smiley", "spray", "headphones", "sneaker"],
    ["skull", "smiley", "spray", "headphones", "sneaker", "flame"],
    ["smiley", "spray", "headphones", "sneaker", "flame", "skull"],
    ["spray", "headphones", "sneaker", "flame", "skull", "smiley"],
    ["headphones", "sneaker", "flame", "skull", "smiley", "spray"],
    ["sneaker", "flame", "skull", "smiley", "spray", "headphones"],
  ],
  seed: 3303,
  starScores: [500, 1100, 1800],
};

/**
 * Level 4 — skull + flame dual; one skull opener, then you set up.
 */
const L4_FRONT: Face = [
  ["skull", "skull", "spray", "flame", "sneaker", "smiley"],
  ["headphones", "spray", "smiley", "sneaker", "flame", "skull"],
  ["spray", "smiley", "headphones", "skull", "flame", "sneaker"],
  ["flame", "sneaker", "skull", "smiley", "headphones", "spray"],
  ["sneaker", "skull", "flame", "headphones", "spray", "smiley"],
  ["smiley", "flame", "sneaker", "spray", "headphones", "skull"],
];

export const LEVEL_4: LevelDef = {
  id: "level-4",
  title: "LEVEL 4",
  size: 6,
  moves: 13,
  goals: [
    { kind: "skull", need: 12 },
    { kind: "flame", need: 12 },
  ],
  board: L4_FRONT,
  boardLeft: [
    ["flame", "sneaker", "smiley", "spray", "headphones", "skull"],
    ["sneaker", "smiley", "spray", "headphones", "skull", "flame"],
    ["smiley", "spray", "headphones", "skull", "flame", "sneaker"],
    ["spray", "headphones", "skull", "flame", "sneaker", "smiley"],
    ["headphones", "skull", "flame", "sneaker", "smiley", "spray"],
    ["skull", "flame", "sneaker", "smiley", "spray", "headphones"],
  ],
  seed: 4404,
  starScores: [550, 1200, 1900],
};

/** Level 5 — smileys & spray cans; tight budget. */
const L5_FRONT: Face = [
  ["smiley", "smiley", "skull", "flame", "sneaker", "headphones"],
  ["skull", "flame", "sneaker", "headphones", "spray", "smiley"],
  ["flame", "sneaker", "headphones", "spray", "smiley", "skull"],
  ["sneaker", "headphones", "spray", "smiley", "skull", "flame"],
  ["headphones", "spray", "smiley", "skull", "flame", "sneaker"],
  ["spray", "smiley", "skull", "flame", "sneaker", "headphones"],
];

export const LEVEL_5: LevelDef = {
  id: "level-5",
  title: "LEVEL 5",
  size: 6,
  moves: 12,
  goals: [
    { kind: "smiley", need: 12 },
    { kind: "spray", need: 10 },
    { kind: "headphones", need: 8 },
  ],
  board: L5_FRONT,
  boardLeft: [
    ["spray", "flame", "skull", "sneaker", "headphones", "smiley"],
    ["flame", "skull", "sneaker", "headphones", "smiley", "spray"],
    ["skull", "sneaker", "headphones", "smiley", "spray", "flame"],
    ["sneaker", "headphones", "smiley", "spray", "flame", "skull"],
    ["headphones", "smiley", "spray", "flame", "skull", "sneaker"],
    ["smiley", "spray", "flame", "skull", "sneaker", "headphones"],
  ],
  seed: 5505,
  starScores: [600, 1300, 2000],
};

/** Level 6 — boss: high needs, little slack, no free opener. */
const L6_FRONT: Face = [
  ["headphones", "spray", "smiley", "flame", "sneaker", "skull"],
  ["spray", "smiley", "flame", "sneaker", "skull", "headphones"],
  ["smiley", "flame", "sneaker", "skull", "headphones", "spray"],
  ["flame", "sneaker", "skull", "headphones", "spray", "smiley"],
  ["sneaker", "skull", "headphones", "spray", "smiley", "flame"],
  ["skull", "headphones", "spray", "smiley", "flame", "sneaker"],
];

export const LEVEL_6: LevelDef = {
  id: "level-6",
  title: "LEVEL 6",
  size: 6,
  moves: 11,
  goals: [
    { kind: "sneaker", need: 14 },
    { kind: "skull", need: 12 },
    { kind: "flame", need: 12 },
  ],
  board: L6_FRONT,
  boardLeft: quietFace(6),
  boardRight: quietFace(7),
  boardBack: quietFace(8),
  boardTop: quietFace(9),
  boardBottom: quietFace(10),
  seed: 6606,
  starScores: [700, 1400, 2200],
};

export const LEVELS: LevelDef[] = [
  LEVEL_1,
  LEVEL_2,
  LEVEL_3,
  LEVEL_4,
  LEVEL_5,
  LEVEL_6,
];
