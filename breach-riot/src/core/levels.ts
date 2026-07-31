import type { DaemonDef, LevelDef, Token } from "./types";

function d(
  id: string,
  name: string,
  sequence: Token[],
  required: boolean,
): DaemonDef {
  return { id, name, sequence, required, optional: !required };
}

/**
 * 16 hand-authored levels — gentle openers, then a steeper mid/late curve:
 * tighter buffers, longer required sequences, denser hazards, harder scramble.
 */
export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "WARM BOOT",
    brief: "Pick codes. Stay on the lit axis.",
    size: 5,
    buffer: 4,
    seed: 101,
    twists: {
      firstRowOnly: true,
      coach: "Tap a code on the top row, then stay on the glowing row or column.",
    },
    daemons: [d("a", "DATAMINE", ["1C", "55"], true)],
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
    brief: "Each pick fills the buffer. Don't waste slots.",
    size: 5,
    buffer: 5,
    seed: 102,
    twists: {
      firstRowOnly: true,
      coach: "Complete the daemon sequence inside your buffer before it fills.",
    },
    daemons: [d("a", "ICEPICK", ["7A", "BD", "E9"], true)],
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
    name: "DOUBLE TRACE",
    brief: "Two required daemons. Chain them in one path.",
    size: 5,
    buffer: 5,
    seed: 103,
    twists: {
      firstRowOnly: true,
      coach: "Clearing 2+ daemons multiplies your breach score.",
    },
    daemons: [
      d("a", "DATAMINE", ["1C", "55"], true),
      d("b", "GHOST", ["55", "FF"], true),
    ],
  },
  {
    id: 4,
    name: "WIDE NET",
    brief: "Bigger matrix. Same path rules.",
    size: 6,
    buffer: 5,
    seed: 104,
    twists: { firstRowOnly: true },
    daemons: [
      d("a", "OVERCLOCK", ["BD", "E9", "1C"], true),
      d("b", "RAZOR", ["FF", "7A"], false),
    ],
  },
  {
    id: 5,
    name: "JAM LINE",
    brief: "Jammed cells are dead. Plan around them.",
    size: 6,
    buffer: 5,
    seed: 105,
    twists: {
      jam: true,
      coach: "Dark jammed cells cannot be picked — route around them.",
    },
    daemons: [
      d("a", "ICEPICK", ["7A", "BD", "E9"], true),
      d("b", "DATAMINE", ["1C", "FF"], true),
    ],
  },
  {
    id: 6,
    name: "STICKY HEX",
    brief: "Sticky glyphs cost two buffer slots.",
    size: 6,
    buffer: 6,
    seed: 106,
    twists: {
      sticky: true,
      coach: "Tape-marked sticky glyphs cost 2 buffer. Avoid unless you need them.",
    },
    daemons: [
      d("a", "SOULKILLER", ["55", "7A", "BD", "E9"], true),
      d("b", "GHOST", ["1C", "FF"], false),
    ],
  },
  {
    id: 7,
    name: "JAM + STICK",
    brief: "Detours and costly glyphs.",
    size: 6,
    buffer: 6,
    seed: 107,
    twists: { jam: true, sticky: true, hazardScale: 1.15 },
    daemons: [
      d("a", "OVERCLOCK", ["FF", "1C", "55", "7A"], true),
      d("b", "RAZOR", ["BD", "E9"], true),
    ],
  },
  {
    id: 8,
    name: "LIVE SCRAMBLE",
    brief: "Unused cells mutate. Commit fast.",
    size: 6,
    buffer: 6,
    seed: 108,
    twists: {
      scramble: true,
      scrambleHard: true,
      coach: "Unpicked codes scramble after every pick. Lock your path early.",
    },
    daemons: [
      d("a", "DATAMINE", ["1C", "BD", "7A", "E9"], true),
      d("b", "ICEPICK", ["FF", "55"], false),
    ],
  },
  {
    id: 9,
    name: "FORK PROTOCOL",
    brief: "Optional fork shares a prefix — greed or safety.",
    size: 6,
    buffer: 6,
    seed: 109,
    twists: {
      fork: true,
      earlyConfirm: true,
      jam: true,
      coach: "Fork daemon shares a prefix. Confirm early if the buffer is tight.",
    },
    daemons: [
      d("a", "GHOST", ["1C", "55", "7A"], true),
      d("b", "SOULKILLER", ["1C", "55", "FF", "BD"], false),
    ],
  },
  {
    id: 10,
    name: "SEVEN WIDE",
    brief: "Full 7×7 grid. No spare buffer.",
    size: 7,
    buffer: 6,
    seed: 110,
    twists: { jam: true, hazardScale: 1.2 },
    daemons: [
      d("a", "OVERCLOCK", ["BD", "1C", "E9", "FF"], true),
      d("b", "RAZOR", ["55", "7A"], true),
      d("c", "GHOST", ["FF", "BD"], false),
    ],
  },
  {
    id: 11,
    name: "HEAT SINK",
    brief: "Hard scramble under jam pressure.",
    size: 7,
    buffer: 6,
    seed: 111,
    twists: {
      jam: true,
      scramble: true,
      scrambleHard: true,
      hazardScale: 1.25,
    },
    daemons: [
      d("a", "ICEPICK", ["7A", "E9", "1C", "55"], true),
      d("b", "DATAMINE", ["FF", "BD", "7A"], true),
    ],
  },
  {
    id: 12,
    name: "TAPE STORM",
    brief: "Sticky everywhere that matters.",
    size: 7,
    buffer: 6,
    seed: 112,
    twists: { sticky: true, jam: true, hazardScale: 1.3 },
    daemons: [
      d("a", "SOULKILLER", ["55", "1C", "FF", "7A"], true),
      d("b", "RAZOR", ["BD", "E9", "1C"], true),
    ],
  },
  {
    id: 13,
    name: "TRIPLE BREACH",
    brief: "Three required daemons. No early out.",
    size: 7,
    buffer: 7,
    seed: 113,
    twists: { jam: true, fork: true, hazardScale: 1.2 },
    daemons: [
      d("a", "DATAMINE", ["1C", "55", "7A"], true),
      d("b", "ICEPICK", ["7A", "BD", "E9"], true),
      d("c", "GHOST", ["E9", "FF"], true),
    ],
  },
  {
    id: 14,
    name: "ALL NOISE",
    brief: "Every twist on the board.",
    size: 7,
    buffer: 7,
    seed: 114,
    twists: {
      jam: true,
      sticky: true,
      scramble: true,
      scrambleHard: true,
      fork: true,
      hazardScale: 1.35,
      coach: "All systems hostile. Trace carefully.",
    },
    daemons: [
      d("a", "OVERCLOCK", ["FF", "1C", "7A", "BD"], true),
      d("b", "SOULKILLER", ["FF", "1C", "BD", "E9"], false),
      d("c", "RAZOR", ["55", "BD", "E9"], true),
    ],
  },
  {
    id: 15,
    name: "DEEP STACK",
    brief: "Long sequences. Almost no slack.",
    size: 7,
    buffer: 7,
    seed: 115,
    twists: {
      jam: true,
      scramble: true,
      scrambleHard: true,
      hazardScale: 1.4,
    },
    daemons: [
      d("a", "SOULKILLER", ["1C", "55", "7A", "BD"], true),
      d("b", "GHOST", ["BD", "E9", "FF"], true),
    ],
  },
  {
    id: 16,
    name: "ROOT OVERRIDE",
    brief: "Final access point.",
    size: 7,
    buffer: 7,
    seed: 116,
    twists: {
      jam: true,
      sticky: true,
      scramble: true,
      scrambleHard: true,
      fork: true,
      hazardScale: 1.5,
    },
    daemons: [
      d("a", "DATAMINE", ["BD", "E9", "FF"], true),
      d("b", "ICEPICK", ["FF", "7A", "1C", "55"], true),
      d("c", "SOULKILLER", ["BD", "E9", "FF", "7A"], false),
    ],
  },
];

export function levelById(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export const LEVEL_COUNT = LEVELS.length;
