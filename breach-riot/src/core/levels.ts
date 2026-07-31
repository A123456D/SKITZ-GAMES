import type { DatamineDef, LevelDef, Token } from "./types";

function dm(tier: 1 | 2 | 3, sequence: Token[]): DatamineDef {
  return {
    id: `v${tier}`,
    name: `DATAMINE V${tier}`,
    tier,
    sequence,
  };
}

/**
 * 16 access points across 4 districts.
 * Early districts: clean CP rules. Late: ICE twists.
 * Each node has Basic / Advanced / Expert Datamine.
 */
export const LEVELS: LevelDef[] = [
  // —— District 0: Watson Docks ——
  {
    id: 1,
    name: "WARM BOOT",
    brief: "Top row first. Plan, then commit.",
    district: 0,
    size: 5,
    buffer: 4,
    timeLimit: 35,
    seed: 201,
    twists: {
      coach: "Opening pick must be on the top row. Study the matrix — the clock starts on first pick.",
    },
    datamines: [
      dm(1, ["1C", "55"]),
      dm(2, ["55", "7A"]),
      dm(3, ["7A", "BD"]),
    ],
    fixed: {
      tokens: [
        ["1C", "BD", "55", "E9", "FF"],
        ["7A", "1C", "BD", "55", "E9"],
        ["FF", "7A", "1C", "BD", "55"],
        ["E9", "FF", "7A", "1C", "BD"],
        ["55", "E9", "FF", "7A", "1C"],
      ],
    },
  },
  {
    id: 2,
    name: "BUFFER CHECK",
    brief: "Chain Datamines inside one buffer.",
    district: 0,
    size: 5,
    buffer: 4,
    timeLimit: 32,
    seed: 202,
    twists: {
      coach: "Clear V1–V3 as contiguous runs in your buffer for stacking Scrap.",
    },
    datamines: [
      dm(1, ["7A", "BD"]),
      dm(2, ["BD", "E9"]),
      dm(3, ["E9", "1C"]),
    ],
    fixed: {
      tokens: [
        ["7A", "1C", "BD", "55", "FF"],
        ["55", "7A", "1C", "E9", "BD"],
        ["BD", "55", "7A", "1C", "E9"],
        ["E9", "BD", "55", "7A", "1C"],
        ["1C", "E9", "BD", "55", "7A"],
      ],
    },
  },
  {
    id: 3,
    name: "DOCK RELAY",
    brief: "Three Datamines. Overlap them.",
    district: 0,
    size: 5,
    buffer: 4,
    timeLimit: 28,
    seed: 203,
    twists: {},
    datamines: [
      dm(1, ["1C", "55"]),
      dm(2, ["55", "FF", "7A"]),
      dm(3, ["7A", "BD"]),
    ],
  },
  {
    id: 4,
    name: "WATSON GATE",
    brief: "District exit. Bank Scrap for Japantown.",
    district: 0,
    size: 6,
    buffer: 4,
    timeLimit: 26,
    seed: 204,
    twists: {},
    datamines: [
      dm(1, ["BD", "E9"]),
      dm(2, ["E9", "1C", "55"]),
      dm(3, ["55", "FF"]),
    ],
  },
  // —— District 1: Japantown Grid ——
  {
    id: 5,
    name: "NEON TAP",
    brief: "Wider net. Same Breach Protocol.",
    district: 1,
    size: 6,
    buffer: 5,
    timeLimit: 24,
    seed: 205,
    twists: {},
    datamines: [
      dm(1, ["7A", "BD"]),
      dm(2, ["BD", "1C", "FF"]),
      dm(3, ["FF", "E9", "55"]),
    ],
  },
  {
    id: 6,
    name: "VENDOR ICE",
    brief: "First jam walls appear.",
    district: 1,
    size: 6,
    buffer: 6,
    timeLimit: 24,
    seed: 206,
    twists: {
      jam: true,
      coach: "Jammed cells are dead — blank route around them.",
    },
    datamines: [
      dm(1, ["1C", "55"]),
      dm(2, ["55", "7A", "BD"]),
      dm(3, ["BD", "E9"]),
    ],
  },
  {
    id: 7,
    name: "STICKY HEX",
    brief: "Sticky glyphs cost two buffer slots.",
    district: 1,
    size: 6,
    buffer: 6,
    timeLimit: 22,
    seed: 207,
    twists: {
      sticky: true,
      coach: "Tape-marked sticky glyphs cost 2 buffer.",
    },
    datamines: [
      dm(1, ["FF", "1C"]),
      dm(2, ["1C", "55", "7A"]),
      dm(3, ["7A", "BD", "E9"]),
    ],
  },
  {
    id: 8,
    name: "JAPANTOWN GATE",
    brief: "Jam + sticky. Unlock City Center next.",
    district: 1,
    size: 6,
    buffer: 6,
    timeLimit: 20,
    seed: 208,
    twists: { jam: true, sticky: true, hazardScale: 1.1 },
    datamines: [
      dm(1, ["BD", "E9"]),
      dm(2, ["E9", "FF", "1C"]),
      dm(3, ["1C", "55", "7A"]),
    ],
  },
  // —— District 2: City Center ICE ——
  {
    id: 9,
    name: "LIVE SCRAMBLE",
    brief: "Unused codes mutate. Commit fast.",
    district: 2,
    size: 6,
    buffer: 6,
    timeLimit: 20,
    seed: 209,
    twists: {
      scramble: true,
      scrambleHard: true,
      coach: "Scramble after every pick. Lock your path.",
    },
    datamines: [
      dm(1, ["1C", "BD"]),
      dm(2, ["BD", "7A", "E9"]),
      dm(3, ["E9", "FF", "55"]),
    ],
  },
  {
    id: 10,
    name: "SEVEN WIDE",
    brief: "Full 7×7 under jam pressure.",
    district: 2,
    size: 7,
    buffer: 6,
    timeLimit: 18,
    seed: 210,
    twists: { jam: true, hazardScale: 1.2 },
    datamines: [
      dm(1, ["55", "7A"]),
      dm(2, ["7A", "BD", "E9"]),
      dm(3, ["E9", "1C", "FF"]),
    ],
  },
  {
    id: 11,
    name: "HEAT SINK",
    brief: "Hard scramble + jam.",
    district: 2,
    size: 7,
    buffer: 6,
    timeLimit: 16,
    seed: 211,
    twists: {
      jam: true,
      scramble: true,
      scrambleHard: true,
      hazardScale: 1.25,
    },
    datamines: [
      dm(1, ["FF", "1C"]),
      dm(2, ["1C", "55", "BD"]),
      dm(3, ["BD", "7A", "E9"]),
    ],
  },
  {
    id: 12,
    name: "CENTER GATE",
    brief: "Triple Datamine under ICE. Buy Arasaka access.",
    district: 2,
    size: 7,
    buffer: 7,
    timeLimit: 16,
    seed: 212,
    twists: {
      jam: true,
      sticky: true,
      earlyConfirm: true,
      hazardScale: 1.2,
    },
    datamines: [
      dm(1, ["1C", "55", "7A"]),
      dm(2, ["7A", "BD", "E9"]),
      dm(3, ["E9", "FF"]),
    ],
  },
  // —— District 3: Arasaka Root ——
  {
    id: 13,
    name: "TRIPLE BREACH",
    brief: "Expert path is greedy. Deck upgrades help.",
    district: 3,
    size: 7,
    buffer: 6,
    timeLimit: 15,
    seed: 213,
    twists: { jam: true, hazardScale: 1.2 },
    datamines: [
      dm(1, ["BD", "E9"]),
      dm(2, ["E9", "FF", "1C"]),
      dm(3, ["1C", "55", "7A", "BD"]),
    ],
  },
  {
    id: 14,
    name: "ALL NOISE",
    brief: "Every ICE twist live.",
    district: 3,
    size: 7,
    buffer: 7,
    timeLimit: 14,
    seed: 214,
    twists: {
      jam: true,
      sticky: true,
      scramble: true,
      scrambleHard: true,
      hazardScale: 1.35,
      coach: "All systems hostile.",
    },
    datamines: [
      dm(1, ["FF", "1C"]),
      dm(2, ["1C", "7A", "BD"]),
      dm(3, ["BD", "E9", "55"]),
    ],
  },
  {
    id: 15,
    name: "DEEP STACK",
    brief: "Long Expert sequence. Almost no slack.",
    district: 3,
    size: 7,
    buffer: 7,
    timeLimit: 13,
    seed: 215,
    twists: {
      jam: true,
      scramble: true,
      scrambleHard: true,
      hazardScale: 1.4,
    },
    datamines: [
      dm(1, ["1C", "55"]),
      dm(2, ["55", "7A", "BD"]),
      dm(3, ["BD", "E9", "FF", "1C"]),
    ],
  },
  {
    id: 16,
    name: "ROOT OVERRIDE",
    brief: "Final access point.",
    district: 3,
    size: 7,
    buffer: 7,
    timeLimit: 12,
    seed: 216,
    twists: {
      jam: true,
      sticky: true,
      scramble: true,
      scrambleHard: true,
      earlyConfirm: true,
      hazardScale: 1.5,
    },
    datamines: [
      dm(1, ["BD", "E9", "FF"]),
      dm(2, ["FF", "7A", "1C"]),
      dm(3, ["1C", "55", "BD", "E9"]),
    ],
  },
];

export function levelById(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export const LEVEL_COUNT = LEVELS.length;
