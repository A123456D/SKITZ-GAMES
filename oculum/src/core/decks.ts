import { CARDS, teachDeck } from "./cards";
import { validateConstructedDeck } from "./construct";
import type { Heresy } from "./types";

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

/**
 * Bot / sim decks: exactly one of every card in the craft (20 uniques, incl. Sovereign).
 * Not the curated Teach 2×10 list — sims must exercise the full set.
 */
export function fullCraftDeck(heresy: Heresy): string[] {
  const deck = CARDS.filter((c) => c.heresy === heresy).map((c) => c.id);
  if (deck.length !== 20) {
    throw new Error(`fullCraftDeck(${heresy}): expected 20 cards, got ${deck.length}`);
  }
  const v = validateConstructedDeck(deck);
  if (!v.ok) throw new Error(v.issues.map((i) => i.message).join(" "));
  return deck;
}

/** Ink Abyss — full 20 craft (bot sim / AI opponent). */
export function aiInkAbyssDeck(): string[] {
  return fullCraftDeck("ink");
}

/** Motley Masquerade — full 20 craft (bot sim / AI opponent). */
export function aiMotleyCourtDeck(): string[] {
  return fullCraftDeck("motley");
}

/** @deprecated alias */
export const aiMotleyMasqueradeDeck = aiMotleyCourtDeck;

/** Bellward Toll — full 20 craft (bot sim / AI opponent). */
export function aiBellwardTollDeck(): string[] {
  return fullCraftDeck("toll");
}

/** Scar Breach — full 20 craft (bot sim / AI opponent). */
export function aiIronBreachDeck(): string[] {
  return fullCraftDeck("breach");
}

/** Shelved — Ink mirror until Dusk rebuild. */
export function aiDuskLedgerDeck(): string[] {
  return teachDeck();
}

/** Shelved — Ink mirror until Bonewick rebuild. */
export function aiBonewickDeck(): string[] {
  return teachDeck();
}

const AI_ARCHETYPES: { heresy: Heresy; build: () => string[] }[] = [
  { heresy: "ink", build: aiInkAbyssDeck },
  { heresy: "motley", build: aiMotleyCourtDeck },
  { heresy: "toll", build: aiBellwardTollDeck },
  { heresy: "breach", build: aiIronBreachDeck },
];

export function allAiArchetypeDecks(): string[][] {
  return AI_ARCHETYPES.map((a) => a.build());
}

/**
 * Pick a legal AI opponent deck from live crafts.
 * Shuffle so order differs from the player's list.
 */
export function pickAiOpponentDeck(seed: number, _playerDeck?: readonly string[]): string[] {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const pick = AI_ARCHETYPES[Math.floor(rng() * AI_ARCHETYPES.length)]!;
  const deck = [...pick.build()];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  const v = validateConstructedDeck(deck);
  if (!v.ok) throw new Error(v.issues.map((i) => i.message).join(" "));
  return deck;
}
