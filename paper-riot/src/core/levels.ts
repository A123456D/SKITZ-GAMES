import type {
  GoalDef,
  LevelDef,
  ObstacleKind,
  PowerUpKind,
  TileKind,
  ZoneId,
} from "./types";

export const ZONES: {
  id: ZoneId;
  name: string;
  tagline: string;
  levels: number;
}[] = [
  { id: "desk", name: "DESK RIOT", tagline: "Learn the rip", levels: 10 },
  { id: "hall", name: "HALL PASS", tagline: "Locker labyrinth", levels: 10 },
  { id: "yard", name: "YARD BRAWL", tagline: "Fence & grit", levels: 10 },
  { id: "roof", name: "ROOF TAG", tagline: "Graffiti summit", levels: 10 },
];

function L(partial: Omit<LevelDef, "mapT"> & { mapT?: number }): LevelDef {
  return { mapT: partial.mapT ?? 0.5, ...partial };
}

function collect(kind: TileKind, need: number): GoalDef {
  return { type: "collect", kind, need };
}

function clearObs(obstacle: ObstacleKind | "any", need: number): GoalDef {
  return { type: "clear", obstacle, need };
}

/** Hand-authored 40-level campaign with teaching beats + rising pressure. */
export function buildLevels(): LevelDef[] {
  const desk: LevelDef[] = [
    L({
      id: 1,
      zone: "desk",
      name: "First Rip",
      brief: "Match 3 stickers. Learn the board.",
      moves: 28,
      goals: [collect("skull", 8), collect("star", 8)],
      shape: "rect",
      colors: 4,
      obstaclePlan: [],
      powers: { bomb: 1 },
    }),
    L({
      id: 2,
      zone: "desk",
      name: "Notebook Grid",
      brief: "Two goals — plan which color to chase.",
      moves: 26,
      goals: [collect("heart", 10), collect("bolt", 10)],
      shape: "rect",
      colors: 4,
      obstaclePlan: [],
      powers: { bomb: 1 },
    }),
    L({
      id: 3,
      zone: "desk",
      name: "Square Scrap",
      brief: "Tighter board = fewer cascades. Think ahead.",
      moves: 24,
      goals: [collect("flame", 12), collect("gem", 8)],
      shape: "square",
      colors: 4,
      obstaclePlan: [],
      powers: { bomb: 1 },
    }),
    L({
      id: 4,
      zone: "desk",
      name: "Pink Tape",
      brief: "Tape blocks matches. Match NEXT TO it to peel.",
      moves: 26,
      goals: [collect("skull", 10), clearObs("tape-x", 4)],
      shape: "rect",
      colors: 4,
      obstaclePlan: [{ kind: "tape-x", pattern: "row", count: 5 }],
      powers: { bomb: 1 },
    }),
    L({
      id: 5,
      zone: "desk",
      name: "X Marks",
      brief: "Checker tape — clear corridors first.",
      moves: 24,
      goals: [collect("star", 12), clearObs("tape-x", 6)],
      shape: "rect",
      colors: 5,
      obstaclePlan: [{ kind: "tape-x", pattern: "checker", count: 8 }],
      powers: { bomb: 1, plane: 1 },
    }),
    L({
      id: 6,
      zone: "desk",
      name: "Torn Corner",
      brief: "Bite shape — missing cells break your lines.",
      moves: 24,
      goals: [collect("heart", 12), collect("bolt", 10)],
      shape: "bite",
      colors: 5,
      obstaclePlan: [{ kind: "tape-black", pattern: "border", count: 4 }],
      powers: { bomb: 1, plane: 1 },
    }),
    L({
      id: 7,
      zone: "desk",
      name: "Glue Stick",
      brief: "Glue needs TWO adjacent matches to peel.",
      moves: 22,
      goals: [collect("flame", 10), clearObs("glue", 3)],
      shape: "narrow",
      colors: 5,
      obstaclePlan: [{ kind: "glue", pattern: "cluster", count: 4 }],
      powers: { bomb: 1, plane: 1 },
    }),
    L({
      id: 8,
      zone: "desk",
      name: "Supply Closet",
      brief: "Boxes block swaps. Soften them with side matches.",
      moves: 22,
      goals: [clearObs("box", 4), collect("gem", 10)],
      shape: "square",
      colors: 5,
      obstaclePlan: [{ kind: "box", pattern: "center", count: 4 }],
      powers: { bomb: 1, stapler: 1 },
    }),
    L({
      id: 9,
      zone: "desk",
      name: "Stairwell Notes",
      brief: "Stairs board — gravity takes weird paths.",
      moves: 22,
      goals: [collect("skull", 14), collect("star", 10), clearObs("tape-x", 4)],
      shape: "stairs",
      colors: 5,
      obstaclePlan: [{ kind: "tape-x", pattern: "diagonals", count: 5 }],
      powers: { bomb: 1, plane: 1, stapler: 1 },
    }),
    L({
      id: 10,
      zone: "desk",
      name: "Detention",
      brief: "Boss desk: tape + boxes, tight moves.",
      moves: 20,
      goals: [clearObs("any", 8), collect("heart", 12)],
      shape: "bite",
      colors: 5,
      obstaclePlan: [
        { kind: "tape-x", pattern: "row", count: 5 },
        { kind: "box", pattern: "cluster", count: 3 },
      ],
      powers: { bomb: 2, plane: 1, stapler: 1 },
    }),
  ];

  const hall: LevelDef[] = [
    L({
      id: 11,
      zone: "hall",
      name: "Locker Lane",
      brief: "Three lanes — rockets love vertical stacks.",
      moves: 24,
      goals: [collect("bolt", 14), collect("skull", 10)],
      shape: "lanes",
      colors: 5,
      obstaclePlan: [{ kind: "tape-black", pattern: "col", count: 4 }],
      powers: { bomb: 1, rocket: 2, plane: 1 },
    }),
    L({
      id: 12,
      zone: "hall",
      name: "Padlock Row",
      brief: "Locks need two hits — or a stapler rip.",
      moves: 22,
      goals: [clearObs("lock", 4), collect("star", 12)],
      shape: "rect",
      colors: 5,
      obstaclePlan: [{ kind: "lock", pattern: "row", count: 5 }],
      powers: { bomb: 1, stapler: 2, plane: 1 },
    }),
    L({
      id: 13,
      zone: "hall",
      name: "Donut Desk",
      brief: "Hole in the middle — no through-matches.",
      moves: 22,
      goals: [collect("flame", 14), clearObs("tape-x", 5)],
      shape: "donut",
      colors: 5,
      obstaclePlan: [{ kind: "tape-x", pattern: "border", count: 6 }],
      powers: { bomb: 1, plane: 2, stapler: 1 },
    }),
    L({
      id: 14,
      zone: "hall",
      name: "Pillar Hall",
      brief: "Pillars split the board — play each column.",
      moves: 20,
      goals: [collect("gem", 12), collect("heart", 12)],
      shape: "pillars",
      colors: 5,
      obstaclePlan: [{ kind: "box", pattern: "col", count: 3 }],
      powers: { bomb: 1, rocket: 2, stapler: 1 },
    }),
    L({
      id: 15,
      zone: "hall",
      name: "Wet Floor",
      brief: "Ink smears: soft cover, peel with neighbors.",
      moves: 22,
      goals: [clearObs("wet", 6), collect("skull", 12)],
      shape: "narrow",
      colors: 5,
      obstaclePlan: [{ kind: "wet", pattern: "scatter", count: 7 }],
      powers: { bomb: 1, plane: 1, magnet: 1 },
    }),
    L({
      id: 16,
      zone: "hall",
      name: "Corner Clique",
      brief: "Four corners + hub — travel carefully.",
      moves: 20,
      goals: [collect("bolt", 10), clearObs("glue", 3), clearObs("tape-x", 3)],
      shape: "corners",
      colors: 5,
      obstaclePlan: [
        { kind: "glue", pattern: "cluster", count: 3 },
        { kind: "tape-x", pattern: "center", count: 3 },
      ],
      powers: { bomb: 1, plane: 1, stapler: 1, magnet: 1 },
    }),
    L({
      id: 17,
      zone: "hall",
      name: "Magnet Drill",
      brief: "Magnet clears one color — save it for the goal.",
      moves: 20,
      goals: [collect("star", 18)],
      shape: "square",
      colors: 6,
      obstaclePlan: [{ kind: "tape-black", pattern: "checker", count: 6 }],
      powers: { magnet: 2, bomb: 1 },
    }),
    L({
      id: 18,
      zone: "hall",
      name: "Tar Trap",
      brief: "Tar is hard — no swaps until cracked.",
      moves: 20,
      goals: [clearObs("tar", 5), collect("flame", 12)],
      shape: "stairs",
      colors: 5,
      obstaclePlan: [{ kind: "tar", pattern: "diagonals", count: 6 }],
      powers: { bomb: 2, stapler: 1, rocket: 1 },
    }),
    L({
      id: 19,
      zone: "hall",
      name: "Hourglass",
      brief: "Narrow waist bottlenecks cascades.",
      moves: 18,
      goals: [collect("heart", 14), collect("gem", 10), clearObs("box", 2)],
      shape: "hourglass",
      colors: 5,
      obstaclePlan: [{ kind: "box", pattern: "center", count: 3 }],
      powers: { bomb: 1, plane: 1, rocket: 1, stapler: 1 },
    }),
    L({
      id: 20,
      zone: "hall",
      name: "Principal's Hall",
      brief: "Zone boss: locks + tape on lanes.",
      moves: 18,
      goals: [clearObs("any", 10), collect("skull", 12)],
      shape: "lanes",
      colors: 6,
      obstaclePlan: [
        { kind: "lock", pattern: "row", count: 4 },
        { kind: "tape-x", pattern: "col", count: 5 },
      ],
      powers: { bomb: 2, rocket: 2, stapler: 2, plane: 1 },
    }),
  ];

  const yard: LevelDef[] = [
    L({
      id: 21,
      zone: "yard",
      name: "Fence Gap",
      brief: "Rift shape — a tear splits the yard.",
      moves: 22,
      goals: [collect("bolt", 14), collect("flame", 12)],
      shape: "rift",
      colors: 5,
      obstaclePlan: [{ kind: "tape-x", pattern: "border", count: 5 }],
      powers: { bomb: 1, plane: 1, rocket: 1 },
    }),
    L({
      id: 22,
      zone: "yard",
      name: "Diamond Dust",
      brief: "Diamond board rewards center control.",
      moves: 20,
      goals: [collect("gem", 16), clearObs("wet", 4)],
      shape: "diamond",
      colors: 5,
      obstaclePlan: [{ kind: "wet", pattern: "center", count: 5 }],
      powers: { bomb: 1, magnet: 1, plane: 1 },
    }),
    L({
      id: 23,
      zone: "yard",
      name: "Barbed Wire",
      brief: "Barbed blocks swaps — blast or staple it.",
      moves: 20,
      goals: [clearObs("barbed", 5), collect("skull", 12)],
      shape: "rect",
      colors: 5,
      obstaclePlan: [{ kind: "barbed", pattern: "row", count: 6 }],
      powers: { bomb: 2, stapler: 2 },
    }),
    L({
      id: 24,
      zone: "yard",
      name: "Plus Sign",
      brief: "Plus shape: long arms, weak center.",
      moves: 20,
      goals: [collect("star", 14), collect("heart", 12)],
      shape: "plus",
      colors: 6,
      obstaclePlan: [{ kind: "glue", pattern: "center", count: 3 }],
      powers: { bomb: 1, rocket: 1, plane: 1, magnet: 1 },
    }),
    L({
      id: 25,
      zone: "yard",
      name: "Skate Bowl",
      brief: "Multi-goal grind — don't tunnel vision.",
      moves: 18,
      goals: [
        collect("flame", 12),
        clearObs("tape-black", 5),
        clearObs("box", 2),
      ],
      shape: "donut",
      colors: 5,
      obstaclePlan: [
        { kind: "tape-black", pattern: "scatter", count: 6 },
        { kind: "box", pattern: "cluster", count: 2 },
      ],
      powers: { bomb: 1, stapler: 1, plane: 2 },
    }),
    L({
      id: 26,
      zone: "yard",
      name: "Color Diet",
      brief: "Six colors — matches are rarer. Use magnet.",
      moves: 20,
      goals: [collect("bolt", 16)],
      shape: "square",
      colors: 6,
      obstaclePlan: [{ kind: "tar", pattern: "border", count: 4 }],
      powers: { magnet: 2, bomb: 1, disco: 1 },
    }),
    L({
      id: 27,
      zone: "yard",
      name: "Corner Brawl",
      brief: "Isolated pockets — each corner is its own fight.",
      moves: 18,
      goals: [collect("gem", 10), collect("skull", 10), clearObs("lock", 2)],
      shape: "corners",
      colors: 5,
      obstaclePlan: [{ kind: "lock", pattern: "scatter", count: 3 }],
      powers: { bomb: 2, stapler: 2, rocket: 1 },
    }),
    L({
      id: 28,
      zone: "yard",
      name: "Glue Flood",
      brief: "Heavy glue — stapler earns its keep.",
      moves: 18,
      goals: [clearObs("glue", 6), collect("heart", 12)],
      shape: "stairs",
      colors: 5,
      obstaclePlan: [{ kind: "glue", pattern: "checker", count: 8 }],
      powers: { stapler: 3, bomb: 1, plane: 1 },
    }),
    L({
      id: 29,
      zone: "yard",
      name: "Hourglass Heat",
      brief: "Scarce moves through the waist.",
      moves: 16,
      goals: [collect("star", 14), clearObs("any", 6)],
      shape: "hourglass",
      colors: 6,
      obstaclePlan: [
        { kind: "tape-x", pattern: "row", count: 4 },
        { kind: "barbed", pattern: "center", count: 2 },
      ],
      powers: { bomb: 2, rocket: 1, stapler: 1, disco: 1 },
    }),
    L({
      id: 30,
      zone: "yard",
      name: "Recess Riot",
      brief: "Yard boss: rift + mixed junk.",
      moves: 16,
      goals: [clearObs("any", 12), collect("flame", 12)],
      shape: "rift",
      colors: 6,
      obstaclePlan: [
        { kind: "box", pattern: "border", count: 4 },
        { kind: "wet", pattern: "scatter", count: 5 },
        { kind: "lock", pattern: "cluster", count: 2 },
      ],
      powers: { bomb: 2, plane: 1, rocket: 1, stapler: 2, magnet: 1 },
    }),
  ];

  const roof: LevelDef[] = [
    L({
      id: 31,
      zone: "roof",
      name: "Heart Tag",
      brief: "Heart board — romantic chaos.",
      moves: 20,
      goals: [collect("heart", 18), clearObs("tape-x", 4)],
      shape: "heart",
      colors: 5,
      obstaclePlan: [{ kind: "tape-x", pattern: "border", count: 5 }],
      powers: { bomb: 1, magnet: 1, plane: 1, disco: 1 },
    }),
    L({
      id: 32,
      zone: "roof",
      name: "Spray Lane",
      brief: "Lanes + barbed: precision rockets.",
      moves: 18,
      goals: [clearObs("barbed", 4), collect("bolt", 14)],
      shape: "lanes",
      colors: 6,
      obstaclePlan: [{ kind: "barbed", pattern: "col", count: 5 }],
      powers: { rocket: 3, stapler: 1, bomb: 1 },
    }),
    L({
      id: 33,
      zone: "roof",
      name: "Disco Night",
      brief: "Disco clears random tiles — clutch or waste.",
      moves: 18,
      goals: [collect("star", 16), collect("gem", 12)],
      shape: "diamond",
      colors: 6,
      obstaclePlan: [{ kind: "glue", pattern: "scatter", count: 4 }],
      powers: { disco: 2, magnet: 1, bomb: 1 },
    }),
    L({
      id: 34,
      zone: "roof",
      name: "Plus Lockdown",
      brief: "Locks on the arms of the plus.",
      moves: 16,
      goals: [clearObs("lock", 5), collect("skull", 12)],
      shape: "plus",
      colors: 5,
      obstaclePlan: [{ kind: "lock", pattern: "border", count: 6 }],
      powers: { stapler: 3, bomb: 2 },
    }),
    L({
      id: 35,
      zone: "roof",
      name: "Pillar Panic",
      brief: "Six colors in pillars — tough swaps.",
      moves: 16,
      goals: [collect("flame", 14), clearObs("tar", 4)],
      shape: "pillars",
      colors: 6,
      obstaclePlan: [{ kind: "tar", pattern: "col", count: 5 }],
      powers: { rocket: 2, bomb: 2, magnet: 1 },
    }),
    L({
      id: 36,
      zone: "roof",
      name: "Corner Crown",
      brief: "Clear junk in every pocket.",
      moves: 16,
      goals: [clearObs("any", 10), collect("heart", 10)],
      shape: "corners",
      colors: 6,
      obstaclePlan: [
        { kind: "box", pattern: "scatter", count: 4 },
        { kind: "tape-black", pattern: "center", count: 3 },
      ],
      powers: { bomb: 2, stapler: 2, plane: 1, disco: 1 },
    }),
    L({
      id: 37,
      zone: "roof",
      name: "Hourglass Hell",
      brief: "Brutal waist + barbed choke.",
      moves: 15,
      goals: [collect("bolt", 14), clearObs("barbed", 3), clearObs("glue", 3)],
      shape: "hourglass",
      colors: 6,
      obstaclePlan: [
        { kind: "barbed", pattern: "center", count: 3 },
        { kind: "glue", pattern: "row", count: 4 },
      ],
      powers: { bomb: 2, stapler: 2, magnet: 1, rocket: 1 },
    }),
    L({
      id: 38,
      zone: "roof",
      name: "Rift Riot",
      brief: "Torn board + mixed soft covers.",
      moves: 15,
      goals: [collect("gem", 12), collect("star", 12), clearObs("wet", 4)],
      shape: "rift",
      colors: 6,
      obstaclePlan: [
        { kind: "wet", pattern: "scatter", count: 5 },
        { kind: "tape-x", pattern: "diagonals", count: 4 },
      ],
      powers: { bomb: 1, plane: 2, rocket: 1, magnet: 1, disco: 1 },
    }),
    L({
      id: 39,
      zone: "roof",
      name: "Heart Lock",
      brief: "Almost summit — locks on a heart.",
      moves: 14,
      goals: [clearObs("lock", 4), clearObs("box", 3), collect("skull", 10)],
      shape: "heart",
      colors: 6,
      obstaclePlan: [
        { kind: "lock", pattern: "cluster", count: 4 },
        { kind: "box", pattern: "border", count: 3 },
      ],
      powers: { stapler: 3, bomb: 2, disco: 1 },
    }),
    L({
      id: 40,
      zone: "roof",
      name: "Tag the Sky",
      brief: "Final exam: everything at once.",
      moves: 14,
      goals: [
        clearObs("any", 12),
        collect("flame", 12),
        collect("heart", 10),
      ],
      shape: "donut",
      colors: 6,
      obstaclePlan: [
        { kind: "lock", pattern: "row", count: 3 },
        { kind: "barbed", pattern: "col", count: 3 },
        { kind: "glue", pattern: "scatter", count: 4 },
        { kind: "box", pattern: "center", count: 2 },
      ],
      powers: {
        bomb: 2,
        plane: 1,
        rocket: 1,
        magnet: 1,
        stapler: 2,
        disco: 1,
      },
    }),
  ];

  const all = [...desk, ...hall, ...yard, ...roof];
  return all.map((lv, i) => {
    const zi = Math.floor(i / 10);
    const local = i % 10;
    return { ...lv, mapT: 0.08 + (local / 9) * 0.84, zone: ZONES[zi]!.id };
  });
}

export const LEVELS = buildLevels();

export function getLevel(id: number): LevelDef {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]!;
}

export function zoneLevels(zone: ZoneId): LevelDef[] {
  return LEVELS.filter((l) => l.zone === zone);
}

export function zoneForLevel(id: number): ZoneId {
  return getLevel(id).zone;
}

/** Powers unlocked for HUD (show slot even at 0 once zone reached). */
export function unlockedPowers(levelId: number): PowerUpKind[] {
  if (levelId >= 31) {
    return ["bomb", "plane", "rocket", "magnet", "stapler", "disco"];
  }
  if (levelId >= 21) {
    return ["bomb", "plane", "rocket", "magnet", "stapler", "disco"];
  }
  if (levelId >= 11) {
    return ["bomb", "plane", "rocket", "stapler", "magnet"];
  }
  if (levelId >= 5) return ["bomb", "plane", "stapler"];
  return ["bomb"];
}
