import type { LevelDef, TileKind } from "./types";

/** Front face opener — varied stickers, no opening matches. */
const FRONT: TileKind[][] = [
  ["skull", "heart", "bolt", "star", "flame", "diamond"],
  ["heart", "skull", "star", "headphones", "diamond", "flame"],
  ["bolt", "star", "heart", "flame", "skull", "bomb"],
  ["star", "flame", "diamond", "skull", "heart", "spray"],
  ["flame", "diamond", "skull", "smiley", "bolt", "star"],
  ["diamond", "bomb", "flame", "star", "sneaker", "heart"],
];

const BACK: TileKind[][] = [
  ["sneaker", "spray", "smiley", "bomb", "headphones", "skull"],
  ["spray", "sneaker", "bomb", "smiley", "skull", "headphones"],
  ["smiley", "bomb", "sneaker", "headphones", "heart", "bolt"],
  ["bomb", "headphones", "spray", "star", "flame", "diamond"],
  ["headphones", "skull", "heart", "bolt", "star", "flame"],
  ["skull", "heart", "bolt", "star", "diamond", "sneaker"],
];

export const LEVEL_1: LevelDef = {
  id: "level-1",
  title: "LEVEL 1",
  size: 6,
  moves: 28,
  goals: [
    { kind: "heart", need: 10 },
    { kind: "skull", need: 8 },
    { kind: "flame", need: 8 },
  ],
  board: FRONT,
  boardBack: BACK,
  starScores: [400, 900, 1500],
};

export const LEVELS: LevelDef[] = [LEVEL_1];
