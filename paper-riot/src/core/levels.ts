import type { BoardShapeId, LevelDef, TileKind, ZoneId } from "./types";

export const ZONES: {
  id: ZoneId;
  name: string;
  tagline: string;
  levels: number; // count
}[] = [
  { id: "desk", name: "DESK RIOT", tagline: "Notebook chaos", levels: 10 },
  { id: "hall", name: "HALL PASS", tagline: "Locker labyrinth", levels: 10 },
  { id: "yard", name: "YARD BRAWL", tagline: "Skate & scrape", levels: 10 },
  { id: "roof", name: "ROOF TAG", tagline: "Graffiti summit", levels: 10 },
];

const SHAPES: BoardShapeId[] = [
  "rect",
  "square",
  "narrow",
  "bite",
  "stairs",
  "donut",
  "plus",
  "diamond",
  "pillars",
  "heart",
];

const GOAL_POOL: TileKind[] = ["skull", "bolt", "heart", "star", "flame", "gem"];

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

/** Build 40 progressive levels across 4 zones. */
export function buildLevels(): LevelDef[] {
  const levels: LevelDef[] = [];
  let id = 1;
  for (let zi = 0; zi < ZONES.length; zi++) {
    const zone = ZONES[zi]!;
    for (let i = 0; i < zone.levels; i++) {
      const global = id - 1; // 0..39
      const t = i / (zone.levels - 1); // 0..1 in zone
      const moves = clamp(30 - Math.floor(global * 0.28) - (i % 3 === 2 ? 2 : 0), 16, 30);
      const colors = clamp(4 + Math.floor(global / 12), 4, 6);
      const obstacles = clamp(
        Math.floor(global * 0.35) + (i >= 3 ? 2 : 0) + zi,
        0,
        14,
      );
      const shape = SHAPES[Math.min(SHAPES.length - 1, Math.floor(global / 4))]!;
      const goalCount = global < 5 ? 2 : global < 18 ? 3 : 3;
      const goals = [];
      for (let g = 0; g < goalCount; g++) {
        const kind = GOAL_POOL[(global + g * 2) % GOAL_POOL.length]!;
        const need = clamp(8 + Math.floor(global * 0.55) + g * 2, 8, 28);
        goals.push({ kind, need });
      }
      levels.push({
        id,
        zone: zone.id,
        name: `${zone.name} ${i + 1}`,
        moves,
        goals,
        shape,
        colors,
        obstacles,
        mapT: 0.08 + t * 0.84,
      });
      id++;
    }
  }
  return levels;
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
