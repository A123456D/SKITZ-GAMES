import type { Vec2 } from "./cellKind";

/** Internal router baked into a turntable (ports before rotation). */
export const Module = {
  ELBOW: 0, // N↔E
  STRAIGHT: 1, // N↔S
  TEE: 2, // N↔E and N↔W
  CROSS: 3, // N↔S and E↔W
  GATE: 4, // N↔S only while a side port is energized
} as const;

/** Geared coupling: turning this table also turns `partner` by `delta * sign`. */
export type TableLink = { partner: number; sign: 1 | -1 };

export type TableDef = {
  id: number;
  hub: Vec2;
  /** Visual radius in cells (beam routes only at hub). */
  radius: number;
  rotationQ: number;
  module: number;
  locked: boolean;
  tint: number;
  /** Optional gear link to another table (symmetric partner turns too). */
  link?: TableLink;
};

export function makeTable(
  id: number,
  hub: Vec2,
  module: number,
  radius = 0,
  rotationQ = 0,
  locked = false,
): TableDef {
  return {
    id,
    hub: { ...hub },
    radius,
    rotationQ,
    module,
    locked,
    tint: 0,
  };
}

export function cloneTable(t: TableDef): TableDef {
  return {
    id: t.id,
    hub: { ...t.hub },
    radius: t.radius,
    rotationQ: t.rotationQ,
    module: t.module,
    locked: t.locked,
    tint: t.tint,
    link: t.link ? { ...t.link } : undefined,
  };
}

export function tableContains(t: TableDef, pos: Vec2): boolean {
  return Math.max(Math.abs(pos.x - t.hub.x), Math.abs(pos.y - t.hub.y)) <= t.radius;
}

export function tableAtHub(tables: TableDef[], x: number, y: number): TableDef | null {
  return tables.find((t) => t.hub.x === x && t.hub.y === y) ?? null;
}
