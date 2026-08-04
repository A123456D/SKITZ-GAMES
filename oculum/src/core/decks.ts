import { getCard } from "./cards";
import { buildAutoDeck, validateConstructedDeck } from "./construct";
import type { School } from "./types";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cube veil + Break: Banner, Dancer, Seekers, Stake Cache, High payoffs. */
export function aiCubeVeilDeck(): string[] {
  return [
    "cliff_seeker",
    "cliff_seeker",
    "veil_banner",
    "veil_banner",
    "ochre_dancer",
    "stake_field_pilgrim",
    "stake_cache",
    "mesa_bell",
    "mesa_bell",
    "saltglass_courier",
    "saltglass_courier",
    "ace_of_hollows",
    "bone_wick_charm",
    "coral_crown",
    "ring_gaze",
    "hatline_trickster",
    "third_face",
    "horn_cantor",
    "pale_silence",
    "canister_hound",
    "keywright_scarecrow",
    "suture_mill",
    "branch_rune_reliquary",
    "ribbon_bride",
    "dust_ledger",
    "ledger_jackal",
    "debt_coin",
    "perforated_abbess",
    "bell_debt_walker",
    "unblinking_law",
  ];
}

/** Ring Gaze: sites + Abbess/Crown + Bell package + enemy Witness payoffs. */
export function aiGazeRingDeck(): string[] {
  return [
    "ring_gaze",
    "parasol_path",
    "perforated_abbess",
    "coral_crown",
    "bell_debt_walker",
    "bell_debt_walker",
    "bell_siren",
    "ace_of_hollows",
    "bone_wick_charm",
    "cliff_seeker",
    "cliff_seeker",
    "veil_banner",
    "hatline_trickster",
    "inkdrip_acolyte",
    "inkdrip_acolyte",
    "pale_silence",
    "hole_choir",
    "root_chassis",
    "keywright_scarecrow",
    "canister_hound",
    "third_face",
    "echo_mask",
    "branch_rune_reliquary",
    "ribbon_bride",
    "stake_field_pilgrim",
    "mesa_bell",
    "saltglass_courier",
    "dust_ledger",
    "debt_coin",
    "unblinking_law",
  ];
}

/** Deal Eclipse: Pilgrim empty-lane, Dust Ledger, Jackal, Debt Coin, Tithe. */
export function aiDealEclipseDeck(): string[] {
  return [
    "stake_field_pilgrim",
    "stake_field_pilgrim",
    "dust_ledger",
    "dust_ledger",
    "ledger_jackal",
    "ledger_jackal",
    "debt_coin",
    "dusk_tithe",
    "hatline_trickster",
    "hatline_trickster",
    "ochre_vanguard",
    "ace_of_hollows",
    "cliff_seeker",
    "cliff_seeker",
    "veil_banner",
    "ring_gaze",
    "coral_crown",
    "bone_wick_charm",
    "pale_silence",
    "inkdrip_acolyte",
    "third_face",
    "horn_cantor",
    "mesa_bell",
    "saltglass_courier",
    "canister_hound",
    "suture_mill",
    "keywright_scarecrow",
    "branch_rune_reliquary",
    "ribbon_bride",
    "unblinking_law",
  ];
}

/** Many Stance: Third Face, Twinspoke/Mask Gallery, Echo, Horn. */
export function aiStanceManyDeck(): string[] {
  return [
    "third_face",
    "twinspoke_banner",
    "mask_gallery",
    "echo_mask",
    "echo_mask",
    "horn_cantor",
    "horn_cantor",
    "face_charm",
    "cliff_seeker",
    "cliff_seeker",
    "veil_banner",
    "ace_of_hollows",
    "bone_wick_charm",
    "coral_crown",
    "ring_gaze",
    "hatline_trickster",
    "stake_field_pilgrim",
    "mesa_bell",
    "saltglass_courier",
    "pale_silence",
    "inkdrip_acolyte",
    "canister_hound",
    "suture_mill",
    "keywright_scarecrow",
    "dust_ledger",
    "ledger_jackal",
    "debt_coin",
    "branch_rune_reliquary",
    "ribbon_bride",
    "unblinking_law",
  ];
}

/** Graft engine: Suture Mill / Key Shrine, Ace, Splice, Hound, Scarecrow. */
export function aiGraftEngineDeck(): string[] {
  return [
    "suture_mill",
    "key_shrine",
    "ace_of_hollows",
    "ace_of_hollows",
    "splice_token",
    "bone_wick_charm",
    "coral_crown",
    "canister_hound",
    "canister_hound",
    "keywright_scarecrow",
    "keywright_scarecrow",
    "sail_widow",
    "root_chassis",
    "cliff_seeker",
    "cliff_seeker",
    "veil_banner",
    "ring_gaze",
    "hatline_trickster",
    "third_face",
    "echo_mask",
    "horn_cantor",
    "pale_silence",
    "inkdrip_acolyte",
    "stake_field_pilgrim",
    "mesa_bell",
    "dust_ledger",
    "ledger_jackal",
    "branch_rune_reliquary",
    "ribbon_bride",
    "unblinking_law",
  ];
}

const AI_ARCHETYPES: { school: School; build: () => string[] }[] = [
  { school: "cube", build: aiCubeVeilDeck },
  { school: "ring", build: aiGazeRingDeck },
  { school: "deal", build: aiDealEclipseDeck },
  { school: "many", build: aiStanceManyDeck },
  { school: "graft", build: aiGraftEngineDeck },
];

function dominantSchool(deck: readonly string[]): School | null {
  const counts = new Map<School, number>();
  for (const id of deck) {
    try {
      const s = getCard(id).school;
      if (s === "neutral") continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    } catch {
      /* ignore unknown during tests */
    }
  }
  let best: School | null = null;
  let n = 0;
  for (const [s, c] of counts) {
    if (c > n) {
      n = c;
      best = s;
    }
  }
  return best;
}

/**
 * Pick a legal AI opponent deck that is not a mirror of the player's list.
 * Prefer an archetype whose school differs from the player's dominant school.
 */
export function pickAiOpponentDeck(seed: number, playerDeck?: readonly string[]): string[] {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const playerSchool = playerDeck?.length ? dominantSchool(playerDeck) : null;

  const ranked = [...AI_ARCHETYPES].sort((a, b) => {
    const aDiff = playerSchool && a.school === playerSchool ? 1 : 0;
    const bDiff = playerSchool && b.school === playerSchool ? 1 : 0;
    if (aDiff !== bDiff) return aDiff - bDiff;
    return rng() - 0.5;
  });

  for (const arch of ranked) {
    const deck = arch.build();
    if (validateConstructedDeck(deck).ok) return deck;
  }

  // Fallback: school-biased auto deck opposite the player
  const schools: School[] = ["cube", "deal", "many", "graft", "hollow", "coral", "ring"];
  const avoid = playerSchool;
  const pool = schools.filter((s) => s !== avoid);
  const school = pool[Math.floor(rng() * pool.length)] ?? "cube";
  return buildAutoDeck({ seed: seed + 17, school });
}

/** Assert every curated AI list is Constructed-legal (used by tests). */
export function allAiArchetypeDecks(): string[][] {
  return AI_ARCHETYPES.map((a) => a.build());
}
