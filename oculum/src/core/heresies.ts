import type { Heresy } from "./types";

/**
 * Player-facing craft (heresy) names.
 * Soft reboot: Ink Abyss + Motley Masquerade + Bellward Toll + Scar Breach.
 * Dusk / Bonewick shelved; other ids remain typed for leftover match hooks.
 */
export const HERESY_LORE: Record<
  Heresy,
  { name: string; short: string; verb: string }
> = {
  ink: { name: "Ink Abyss", short: "Ink Abyss", verb: "Erase" },
  motley: { name: "Motley Masquerade", short: "Motley Masquerade", verb: "Trick" },
  toll: { name: "Bellward Toll", short: "Bellward", verb: "Toll" },
  breach: { name: "Scar Breach", short: "Scar Breach", verb: "Breach" },
  cube: { name: "Ashlar Veil", short: "Ashlar", verb: "Hold" },
  deal: { name: "Dusk Ledger", short: "Ledger", verb: "Debt" },
  many: { name: "Facet Host", short: "Facet", verb: "Stance" },
  graft: { name: "Keywright Join", short: "Keywright", verb: "Attach" },
  hollow: { name: "Cutwork Pale", short: "Cutwork", verb: "Blind" },
  coral: { name: "Branch-Rune", short: "Branch", verb: "Colony" },
  shell: { name: "Bonewick", short: "Bonewick", verb: "Vessel" },
  deep: { name: "Cataract Verdure", short: "Cataract", verb: "Chain" },
  ring: { name: "Iris Circle", short: "Iris", verb: "Gaze" },
  neutral: { name: "Unbound", short: "Unbound", verb: "Law" },
};

/** Live Codex / builder craft filters. */
export const HERESY_IDS = ["ink", "motley", "toll", "breach"] as const;
export type LiveHeresy = (typeof HERESY_IDS)[number];

/** Live-craft pitch: hook fantasy + flagship archetype for the heresy select screen. */
export type HeresyPitch = {
  hook: string;
  archetype: string;
  kit: string;
};

export const HERESY_PITCH: Record<LiveHeresy, HeresyPitch> = {
  ink: {
    hook: "Mark what the Eye hasn't finished — then erase its safety.",
    archetype: "Midrange grind. Stain, Press the Mark, Forced Expose through Holds.",
    kit: "Stain · Press · Erase",
  },
  motley: {
    hook: "Masquerade gambling — faces, antes, wrong timing costs.",
    archetype: "Flip-tempo Trick. Stance B answers Ink Erase; Wager antes Sight for Cash or Bust.",
    kit: "Stance · Wager · Trick",
  },
  toll: {
    hook: "Cliff shrine bells and sirens — ring the lane, arm the Peal.",
    archetype: "Tempo Trap Tax. Toll altitudes, Peal for Resolve payoffs, Lure true Witness.",
    kit: "Toll · Peal · Lure",
  },
  breach: {
    hook: "Canyon warband — blades only fully exist when Witnessed.",
    archetype: "Face-up agro. Open Figures, Breach on wins, Overexpose on losses.",
    kit: "Open · Breach · Overexpose",
  },
};

export function heresyName(h: Heresy): string {
  return HERESY_LORE[h].name;
}

export function heresyShort(h: Heresy): string {
  return HERESY_LORE[h].short;
}

export function heresyVerb(h: Heresy): string {
  return HERESY_LORE[h].verb;
}

export function heresyPitch(h: Heresy): HeresyPitch | null {
  if ((HERESY_IDS as readonly string[]).includes(h)) {
    return HERESY_PITCH[h as LiveHeresy];
  }
  return null;
}

/** Flagship figure face for craft-select card backgrounds. */
export const HERESY_PICK_FACE: Record<LiveHeresy, string> = {
  ink: "dahaka",
  motley: "lady_masque",
  toll: "bell_siren",
  breach: "rivet_vanguard",
};

export function heresyPickFace(h: Heresy): string | null {
  if ((HERESY_IDS as readonly string[]).includes(h)) {
    return HERESY_PICK_FACE[h as LiveHeresy];
  }
  return null;
}
