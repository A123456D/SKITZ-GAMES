import type { LevelDef, TileKind } from "./types";

const L1_BOARD: TileKind[][] = [
  ["skull", "heart", "bolt", "star", "flame", "diamond"],
  ["heart", "skull", "star", "bolt", "diamond", "flame"],
  ["bolt", "star", "heart", "flame", "skull", "diamond"],
  ["star", "flame", "diamond", "skull", "heart", "bolt"],
  ["flame", "diamond", "skull", "heart", "bolt", "star"],
  ["diamond", "bolt", "flame", "star", "skull", "heart"],
];

/** Hand-tuned opener: twisting row 1 right creates a heart line. */
export const LEVEL_1: LevelDef = {
  id: "level-1",
  title: "LEVEL 1",
  size: 6,
  moves: 24,
  goals: [
    { kind: "heart", need: 12 },
    { kind: "skull", need: 8 },
    { kind: "bolt", need: 8 },
  ],
  board: L1_BOARD,
  starScores: [400, 800, 1400],
};

export const LEVELS: LevelDef[] = [LEVEL_1];
