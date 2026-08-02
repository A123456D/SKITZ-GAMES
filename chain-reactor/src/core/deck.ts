import type { Faction } from "./types";
import { DECK_SIZE } from "./types";
import { getCard } from "./cards";
import { loadMeta } from "./meta";

/** Mono-faction presets: 7 faction + 3 neutrals (includes signature verb card). */
export const PRESET_DECKS: Record<"volt" | "prismatic" | "void", string[]> = {
  volt: [
    "v_swarm1",
    "v_swarm2",
    "v_swarm3",
    "v_edge",
    "v_split1",
    "v_split2",
    "v_storm",
    "n_pulse_n",
    "n_pulse_cross",
    "n_amp",
  ],
  prismatic: [
    "p_center1",
    "p_center2",
    "p_reflect1",
    "p_reflect2",
    "p_amp1",
    "p_amp2",
    "p_vector",
    "n_pulse_n",
    "n_pulse_side",
    "n_amp",
  ],
  void: [
    "o_late1",
    "o_late2",
    "o_nuke1",
    "o_nuke2",
    "o_siphon",
    "o_heavy",
    "o_invert",
    "n_pulse_n",
    "n_pulse_cross",
    "n_pulse_side",
  ],
};

export function factionLabel(f: Faction): string {
  switch (f) {
    case "volt":
      return "Volt Syndicate";
    case "prismatic":
      return "Prismatic Order";
    case "void":
      return "Void Architects";
    case "neutral":
      return "Neutral";
  }
}

/**
 * Build a 10-card deck. Unlocked off-preset cards for this faction (or neutrals)
 * replace trailing neutrals so progression changes what you draw.
 */
export function cloneDeck(
  faction: "volt" | "prismatic" | "void",
  unlockedCards: string[] = loadMeta().unlockedCards,
): string[] {
  const deck = [...PRESET_DECKS[faction]];
  if (deck.length !== DECK_SIZE) {
    throw new Error(`Deck ${faction} must have ${DECK_SIZE} cards`);
  }

  const inject = unlockedCards.filter((id) => {
    if (deck.includes(id)) return false;
    try {
      const def = getCard(id);
      return def.faction === faction || def.faction === "neutral";
    } catch {
      return false;
    }
  });

  // Prefer replacing neutrals from the end of the preset.
  let cursor = deck.length - 1;
  for (const id of inject) {
    while (cursor >= 0) {
      const at = getCard(deck[cursor]);
      if (at.faction === "neutral" || cursor >= 7) {
        deck[cursor] = id;
        cursor -= 1;
        break;
      }
      cursor -= 1;
    }
  }

  return deck;
}

/** Fisher–Yates shuffle (mutates copy). */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
