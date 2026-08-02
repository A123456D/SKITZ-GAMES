import { arrowsFrom, type CardDef, type Direction, listArrows } from "./types";

function fireLine(dirs: Direction[]): string {
  const map: Record<Direction, string> = {
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
  };
  return `Fires ${dirs.map((d) => map[d]).join("")}.`;
}

function pulseAbility(...dirs: Direction[]): string {
  return `${fireLine(dirs)} Deals Power on hit.`;
}

/** Full Phase-1 card catalog. */
export const CARD_CATALOG: Record<string, CardDef> = {
  // --- Neutrals ---
  n_pulse_n: {
    id: "n_pulse_n",
    name: "Signal Spike",
    faction: "neutral",
    cost: 1,
    power: 2,
    arrows: arrowsFrom("up"),
    node: "pulse",
    ability: pulseAbility("up"),
  },
  n_pulse_cross: {
    id: "n_pulse_cross",
    name: "Crosswire",
    faction: "neutral",
    cost: 2,
    power: 3,
    arrows: arrowsFrom("up", "down"),
    node: "pulse",
    ability: pulseAbility("up", "down"),
  },
  n_pulse_side: {
    id: "n_pulse_side",
    name: "Lateral Ping",
    faction: "neutral",
    cost: 2,
    power: 3,
    arrows: arrowsFrom("left", "right"),
    node: "pulse",
    ability: pulseAbility("left", "right"),
  },
  n_amp: {
    id: "n_amp",
    name: "Boost Node",
    faction: "neutral",
    cost: 3,
    power: 2,
    arrows: arrowsFrom("up", "right"),
    node: "amplifier",
    ability: `${fireLine(["up", "right"])} Beams through +3 Power.`,
  },

  // --- Volt Syndicate ---
  v_swarm1: {
    id: "v_swarm1",
    name: "Spark Drone",
    faction: "volt",
    cost: 1,
    power: 2,
    arrows: arrowsFrom("right"),
    node: "pulse",
    ability: pulseAbility("right"),
  },
  v_swarm2: {
    id: "v_swarm2",
    name: "Arc Mite",
    faction: "volt",
    cost: 1,
    power: 2,
    arrows: arrowsFrom("down"),
    node: "pulse",
    ability: pulseAbility("down"),
  },
  v_swarm3: {
    id: "v_swarm3",
    name: "Volt Tick",
    faction: "volt",
    cost: 1,
    power: 3,
    arrows: arrowsFrom("left", "up"),
    node: "pulse",
    ability: pulseAbility("left", "up"),
  },
  v_edge: {
    id: "v_edge",
    name: "Rail Runner",
    faction: "volt",
    cost: 2,
    power: 3,
    arrows: arrowsFrom("down", "right"),
    node: "pulse",
    ability: pulseAbility("down", "right"),
  },
  v_split1: {
    id: "v_split1",
    name: "Fork Bolt",
    faction: "volt",
    cost: 2,
    power: 2,
    arrows: arrowsFrom("down"),
    node: "splitter",
    ability: "Splits incoming beams sideways. Also fires ↓.",
  },
  v_split2: {
    id: "v_split2",
    name: "Scatter Node",
    faction: "volt",
    cost: 3,
    power: 3,
    arrows: arrowsFrom("left", "right"),
    node: "splitter",
    ability: "Splits vertical hits into ←→. Fires ←→.",
  },
  v_corner: {
    id: "v_corner",
    name: "Corner Surge",
    faction: "volt",
    cost: 2,
    power: 4,
    arrows: arrowsFrom("up", "left"),
    node: "pulse",
    ability: pulseAbility("up", "left"),
  },
  v_storm: {
    id: "v_storm",
    name: "Storm Grid",
    faction: "volt",
    cost: 2,
    power: 2,
    arrows: arrowsFrom("up", "down", "left", "right"),
    node: "splitter",
    sigil: "flood",
    ability: "FLOOD: splits + fires all ↑↓←→. Volt splitters keep arrows.",
  },

  // --- Prismatic Order ---
  p_center1: {
    id: "p_center1",
    name: "Prism Anchor",
    faction: "prismatic",
    cost: 2,
    power: 4,
    arrows: arrowsFrom("up", "down", "left", "right"),
    node: "pulse",
    ability: pulseAbility("up", "down", "left", "right"),
  },
  p_center2: {
    id: "p_center2",
    name: "Lattice Guard",
    faction: "prismatic",
    cost: 3,
    power: 5,
    arrows: arrowsFrom("up", "down"),
    node: "pulse",
    ability: pulseAbility("up", "down"),
  },
  p_reflect1: {
    id: "p_reflect1",
    name: "Mirror Pane",
    faction: "prismatic",
    cost: 2,
    power: 3,
    arrows: arrowsFrom("right"),
    node: "reflector",
    reflectClockwise: true,
    ability: "Bends beams 90° CW and +3 Power. Fires →.",
  },
  p_reflect2: {
    id: "p_reflect2",
    name: "Counter Glass",
    faction: "prismatic",
    cost: 3,
    power: 3,
    arrows: arrowsFrom("left", "down"),
    node: "reflector",
    reflectClockwise: false,
    ability: "Bends beams 90° CCW and +3 Power. Fires ←↓.",
  },
  p_amp1: {
    id: "p_amp1",
    name: "Lens Array",
    faction: "prismatic",
    cost: 2,
    power: 2,
    arrows: arrowsFrom("up"),
    node: "amplifier",
    ability: `${fireLine(["up"])} Beams through +3 Power.`,
  },
  p_amp2: {
    id: "p_amp2",
    name: "Focus Core",
    faction: "prismatic",
    cost: 4,
    power: 4,
    arrows: arrowsFrom("left", "right"),
    node: "amplifier",
    ability: `${fireLine(["left", "right"])} Beams through +3 Power.`,
  },
  p_wall: {
    id: "p_wall",
    name: "Hard Light",
    faction: "prismatic",
    cost: 3,
    power: 6,
    arrows: arrowsFrom("down"),
    node: "pulse",
    ability: `${pulseAbility("down")} High HP wall.`,
  },
  p_vector: {
    id: "p_vector",
    name: "Vector Key",
    faction: "prismatic",
    cost: 3,
    power: 3,
    arrows: arrowsFrom("up"),
    node: "reflector",
    sigil: "redirect",
    ability: "REDIRECT: reverses beams 180° and +5 Power. Fires ↑.",
  },

  // --- Void Architects ---
  o_late1: {
    id: "o_late1",
    name: "Dark Seed",
    faction: "void",
    cost: 1,
    power: 2,
    arrows: arrowsFrom("down"),
    node: "pulse",
    ability: pulseAbility("down"),
  },
  o_late2: {
    id: "o_late2",
    name: "Null Spike",
    faction: "void",
    cost: 2,
    power: 3,
    arrows: arrowsFrom("up", "right"),
    node: "pulse",
    ability: pulseAbility("up", "right"),
  },
  o_nuke1: {
    id: "o_nuke1",
    name: "Singularity Shell",
    faction: "void",
    cost: 4,
    power: 7,
    arrows: arrowsFrom("up", "down", "left"),
    node: "pulse",
    ability: `${pulseAbility("up", "down", "left")} Late nuke.`,
  },
  o_nuke2: {
    id: "o_nuke2",
    name: "Collapse Engine",
    faction: "void",
    cost: 5,
    power: 8,
    arrows: arrowsFrom("up", "down", "left", "right"),
    node: "pulse",
    ability: `${pulseAbility("up", "down", "left", "right")} Finisher.`,
  },
  o_siphon: {
    id: "o_siphon",
    name: "Drain Lattice",
    faction: "void",
    cost: 3,
    power: 4,
    arrows: arrowsFrom("left", "right"),
    node: "amplifier",
    ability: `${fireLine(["left", "right"])} Beams through +3 Power.`,
  },
  o_heavy: {
    id: "o_heavy",
    name: "Void Pillar",
    faction: "void",
    cost: 4,
    power: 6,
    arrows: arrowsFrom("down", "right"),
    node: "pulse",
    ability: pulseAbility("down", "right"),
  },
  o_split: {
    id: "o_split",
    name: "Rift Fork",
    faction: "void",
    cost: 3,
    power: 4,
    arrows: arrowsFrom("up"),
    node: "splitter",
    ability: "Splits incoming beams sideways. Also fires ↑.",
  },
  o_invert: {
    id: "o_invert",
    name: "Phase Invert",
    faction: "void",
    cost: 3,
    power: 4,
    arrows: arrowsFrom("down"),
    node: "inverter",
    sigil: "invert",
    ability: "INVERT: reverses beams +5. Void overkill → stolen Power.",
  },
};

export function getCard(id: string): CardDef {
  const c = CARD_CATALOG[id];
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

export function nodeTitle(node: CardDef["node"]): string {
  switch (node) {
    case "pulse":
      return "PULSE";
    case "splitter":
      return "SPLITTER";
    case "reflector":
      return "REFLECTOR";
    case "amplifier":
      return "AMPLIFIER";
    case "inverter":
      return "INVERTER";
  }
}

export function arrowsHint(def: CardDef): string {
  return listArrows(def.arrows)
    .map((d) => ({ up: "↑", down: "↓", left: "←", right: "→" })[d])
    .join(" ");
}
