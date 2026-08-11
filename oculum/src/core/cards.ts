import type { CardDef } from "./types";
import { INK_ABYSS_WAVE1, INK_ABYSS_WAVE1_RITE_IDS } from "./inkAbyssWave1";
import { INK_ABYSS_WAVE2, INK_ABYSS_WAVE2_RITE_IDS } from "./inkAbyssWave2";
import { INK_ABYSS_WAVE3, INK_ABYSS_WAVE3_RITE_IDS } from "./inkAbyssWave3";
import { INK_ABYSS_WAVE4, INK_ABYSS_WAVE4_RITE_IDS } from "./inkAbyssWave4";
import {
  MOTLEY_MASQUERADE_WAVE1,
  MOTLEY_MASQUERADE_WAVE1_RITE_IDS,
} from "./motleyMasqueradeWave1";
import {
  MOTLEY_MASQUERADE_WAVE2,
  MOTLEY_MASQUERADE_WAVE2_RITE_IDS,
} from "./motleyMasqueradeWave2";
import {
  MOTLEY_MASQUERADE_WAVE3,
  MOTLEY_MASQUERADE_WAVE3_RITE_IDS,
} from "./motleyMasqueradeWave3";
import {
  MOTLEY_MASQUERADE_WAVE4,
  MOTLEY_MASQUERADE_WAVE4_RITE_IDS,
} from "./motleyMasqueradeWave4";
import {
  BELLWARD_TOLL_WAVE1,
  BELLWARD_TOLL_WAVE1_RITE_IDS,
} from "./bellwardTollWave1";
import {
  BELLWARD_TOLL_WAVE2,
  BELLWARD_TOLL_WAVE2_RITE_IDS,
} from "./bellwardTollWave2";
import {
  BELLWARD_TOLL_WAVE3,
  BELLWARD_TOLL_WAVE3_RITE_IDS,
} from "./bellwardTollWave3";
import {
  BELLWARD_TOLL_WAVE4,
  BELLWARD_TOLL_WAVE4_RITE_IDS,
} from "./bellwardTollWave4";
import {
  IRON_BREACH_WAVE1,
  IRON_BREACH_WAVE1_RITE_IDS,
} from "./ironBreachWave1";
import {
  IRON_BREACH_WAVE2,
  IRON_BREACH_WAVE2_RITE_IDS,
} from "./ironBreachWave2";
import {
  IRON_BREACH_WAVE3,
  IRON_BREACH_WAVE3_RITE_IDS,
} from "./ironBreachWave3";
import {
  IRON_BREACH_WAVE4,
  IRON_BREACH_WAVE4_RITE_IDS,
} from "./ironBreachWave4";
import { LUMEN_HOST_WAVE1, LUMEN_HOST_WAVE1_RITE_IDS } from "./lumenHostWave1";
import { LUMEN_HOST_WAVE2, LUMEN_HOST_WAVE2_RITE_IDS } from "./lumenHostWave2";
import { LUMEN_HOST_WAVE3, LUMEN_HOST_WAVE3_RITE_IDS } from "./lumenHostWave3";
import { LUMEN_HOST_WAVE4, LUMEN_HOST_WAVE4_RITE_IDS } from "./lumenHostWave4";
import { VELVET_RUIN_WAVE1, VELVET_RUIN_WAVE1_RITE_IDS } from "./velvetRuinWave1";
import { VELVET_RUIN_WAVE2, VELVET_RUIN_WAVE2_RITE_IDS } from "./velvetRuinWave2";
import { VELVET_RUIN_WAVE3, VELVET_RUIN_WAVE3_RITE_IDS } from "./velvetRuinWave3";
import { VELVET_RUIN_WAVE4, VELVET_RUIN_WAVE4_RITE_IDS } from "./velvetRuinWave4";

/**
 * Live collectible pool — Ink + Motley + Toll + Scar Breach + Lumen Host + Velvet Ruin.
 */
export const CARDS: CardDef[] = [
  ...INK_ABYSS_WAVE1,
  ...INK_ABYSS_WAVE2,
  ...INK_ABYSS_WAVE3,
  ...INK_ABYSS_WAVE4,
  ...MOTLEY_MASQUERADE_WAVE1,
  ...MOTLEY_MASQUERADE_WAVE2,
  ...MOTLEY_MASQUERADE_WAVE3,
  ...MOTLEY_MASQUERADE_WAVE4,
  ...BELLWARD_TOLL_WAVE1,
  ...BELLWARD_TOLL_WAVE2,
  ...BELLWARD_TOLL_WAVE3,
  ...BELLWARD_TOLL_WAVE4,
  ...IRON_BREACH_WAVE1,
  ...IRON_BREACH_WAVE2,
  ...IRON_BREACH_WAVE3,
  ...IRON_BREACH_WAVE4,
  ...LUMEN_HOST_WAVE1,
  ...LUMEN_HOST_WAVE2,
  ...LUMEN_HOST_WAVE3,
  ...LUMEN_HOST_WAVE4,
  ...VELVET_RUIN_WAVE1,
  ...VELVET_RUIN_WAVE2,
  ...VELVET_RUIN_WAVE3,
  ...VELVET_RUIN_WAVE4,
];

export const INK_ABYSS_RITE_IDS = new Set([
  ...INK_ABYSS_WAVE1_RITE_IDS,
  ...INK_ABYSS_WAVE2_RITE_IDS,
  ...INK_ABYSS_WAVE3_RITE_IDS,
  ...INK_ABYSS_WAVE4_RITE_IDS,
]);

export const MOTLEY_MASQUERADE_RITE_IDS = new Set([
  ...MOTLEY_MASQUERADE_WAVE1_RITE_IDS,
  ...MOTLEY_MASQUERADE_WAVE2_RITE_IDS,
  ...MOTLEY_MASQUERADE_WAVE3_RITE_IDS,
  ...MOTLEY_MASQUERADE_WAVE4_RITE_IDS,
]);
/** @deprecated Use MOTLEY_MASQUERADE_RITE_IDS */
export const MOTLEY_COURT_RITE_IDS = MOTLEY_MASQUERADE_RITE_IDS;
export const BELLWARD_TOLL_RITE_IDS = new Set([
  ...BELLWARD_TOLL_WAVE1_RITE_IDS,
  ...BELLWARD_TOLL_WAVE2_RITE_IDS,
  ...BELLWARD_TOLL_WAVE3_RITE_IDS,
  ...BELLWARD_TOLL_WAVE4_RITE_IDS,
]);
export const IRON_BREACH_RITE_IDS = new Set([
  ...IRON_BREACH_WAVE1_RITE_IDS,
  ...IRON_BREACH_WAVE2_RITE_IDS,
  ...IRON_BREACH_WAVE3_RITE_IDS,
  ...IRON_BREACH_WAVE4_RITE_IDS,
]);
export const LUMEN_HOST_RITE_IDS = new Set([
  ...LUMEN_HOST_WAVE1_RITE_IDS,
  ...LUMEN_HOST_WAVE2_RITE_IDS,
  ...LUMEN_HOST_WAVE3_RITE_IDS,
  ...LUMEN_HOST_WAVE4_RITE_IDS,
]);
export const VELVET_RUIN_RITE_IDS = new Set([
  ...VELVET_RUIN_WAVE1_RITE_IDS,
  ...VELVET_RUIN_WAVE2_RITE_IDS,
  ...VELVET_RUIN_WAVE3_RITE_IDS,
  ...VELVET_RUIN_WAVE4_RITE_IDS,
]);

const byId = new Map(CARDS.map((c) => [c.id, c]));

export function getCard(id: string): CardDef {
  const c = byId.get(id);
  if (!c) throw new Error(`Unknown card ${id}`);
  return c;
}

/** Curated Ink Teach 20 — no Sovereign (Constructed can add 1× Dahaka). */
const TEACH_INK_IDS = [
  "blot_herald",
  "smother_bride",
  "well_cantor",
  "pale_ledger",
  "mire_duelist",
  "pale_bailiff",
  "blackwater_shrine",
  "ink_matron",
  "gulf_cairn",
  "mire_surge",
] as const;

/** Motley Teach — Wave 1 core + Scarlet/Antehall + Favor mint (no Lady Masque / Final Raise). */
const TEACH_MOTLEY_IDS = [
  "whitecard_mummer",
  "diamond_widow",
  "split_hymn_cantor",
  "masked_usher",
  "grinning_debtor",
  "scarlet_dealer",
  "velvet_antehall",
  "favor_broker",
  "gala_call",
  "antewell",
] as const;

/** Bellward Toll Teach — curated 2×10 (no Carillon / Full Peal closer). Craft 20 → copy limit 2. */
const TEACH_TOLL_IDS = [
  "bell_debt_walker",
  "bell_siren",
  "clapper_cantor",
  "veil_ringer",
  "parasol_debtor",
  "path_bellman",
  "cloth_bellspire",
  "choir_loft",
  "peal_urn",
  "sound_the_toll",
] as const;

/**
 * Teach / Play deck — 2× each curated non-Sovereign Ink card (20).
 * Ink craft pool is 20 → Constructed copy limit 2.
 */
export function teachDeck(): string[] {
  const out: string[] = [];
  for (const id of TEACH_INK_IDS) {
    out.push(id, id);
  }
  return out;
}

/** Motley Teach — 2× curated Waves 1–4 package (20). Motley craft 20 → copy limit 2. */
export function teachDeckMotley(): string[] {
  const out: string[] = [];
  for (const id of TEACH_MOTLEY_IDS) {
    out.push(id, id);
  }
  return out;
}

/** Bellward Toll Teach — 2× curated package (20). Craft 20 → copy limit 2. */
export function teachDeckToll(): string[] {
  const out: string[] = [];
  for (const id of TEACH_TOLL_IDS) {
    out.push(id, id);
  }
  return out;
}

/** Scar Breach Teach — 2× Waves 1–2 (no Skaroth / Last Breach closer). */
const TEACH_BREACH_IDS = [
  "rivet_vanguard",
  "ember_banner",
  "highscar_lancer",
  "scarsteel_cleaver",
  "slag_reaper",
  "ashcoil_blade",
  "scarforge",
  "iron_urn",
  "rivet_charm",
  "breach_order",
] as const;

export function teachDeckBreach(): string[] {
  const out: string[] = [];
  for (const id of TEACH_BREACH_IDS) {
    out.push(id, id);
  }
  return out;
}

/** @deprecated Use teachDeck() */
export function starterDeck(): string[] {
  return teachDeck();
}

/** Lumen Host Teach — 2× Waves 1–2 (no Solarch / Last Radiance closer). Craft 20 → copy limit 2. */
const TEACH_LUMEN_IDS = [
  "halo_herald",
  "candela_blade",
  "skyflare_seraph",
  "lumen_shrine",
  "snuff_the_halo",
  "ash_chorister",
  "aureole_well",
  "lumen_urn",
  "halo_charm",
  "kindle_the_halo",
] as const;

export function teachDeckLumen(): string[] {
  const out: string[] = [];
  for (const id of TEACH_LUMEN_IDS) {
    out.push(id, id);
  }
  return out;
}

/** Velvet Ruin Teach — 2× Waves 1–2 (no Veloth / Last Devour). Craft 20 → copy limit 2. */
const TEACH_RUIN_IDS = [
  "thorn_liaison",
  "crimson_vow",
  "spire_hunger",
  "desire_altar",
  "unwrite_the_sin",
  "vespera",
  "thorn_font",
  "want_urn",
  "horn_charm",
  "invite_the_look",
] as const;

export function teachDeckRuin(): string[] {
  const out: string[] = [];
  for (const id of TEACH_RUIN_IDS) {
    out.push(id, id);
  }
  return out;
}

/** Flagship Teach deck for a live craft. */
export function teachDeckForHeresy(heresy: CardDef["heresy"]): string[] {
  if (heresy === "motley") return teachDeckMotley();
  if (heresy === "toll") return teachDeckToll();
  if (heresy === "breach") return teachDeckBreach();
  if (heresy === "lumen") return teachDeckLumen();
  if (heresy === "ruin") return teachDeckRuin();
  return teachDeck();
}

export function heresyColor(heresy: CardDef["heresy"]): [number, number, number] {
  switch (heresy) {
    case "ink":
      return [0.12, 0.1, 0.14];
    case "motley":
      return [0.42, 0.22, 0.55];
    case "toll":
      return [0.55, 0.12, 0.14];
    case "breach":
      return [0.28, 0.22, 0.2];
    case "lumen":
      return [0.72, 0.58, 0.28];
    case "ruin":
      return [0.45, 0.1, 0.22];
    default:
      return [0.45, 0.42, 0.48];
  }
}

/** @deprecated Use heresyColor */
export const schoolColor = heresyColor;
