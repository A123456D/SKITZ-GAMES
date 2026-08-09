import { CARDS, getCard } from "./cards";
import type { CardDef } from "./types";

export const CONSTRUCTED_DECK_SIZE = 20;

export type ConstructIssue = {
  code:
    | "size"
    | "unknown"
    | "copy_limit"
    | "sovereign_copy"
    | "sovereign_total"
    | "prophecy_total";
  message: string;
};

export type ConstructValidation = {
  ok: boolean;
  issues: ConstructIssue[];
};

function tryGet(id: string): CardDef | null {
  try {
    return getCard(id);
  } catch {
    return null;
  }
}

/** Per-craft rebuild: crafts with <16 cards allow 4 copies so Teach can stay size 20. */
function nonSovereignCopyLimit(heresy: CardDef["heresy"]): number {
  const craftSize = CARDS.filter((c) => c.heresy === heresy).length;
  return craftSize < 16 ? 4 : 2;
}

/** Constructed: exactly 20, ≤2 non-Sovereign (≤4 while craft rebuilds), ≤1 Sovereign total / per id, ≤1 prophecy. */
export function validateConstructedDeck(ids: string[]): ConstructValidation {
  const issues: ConstructIssue[] = [];

  if (ids.length !== CONSTRUCTED_DECK_SIZE) {
    issues.push({
      code: "size",
      message: `Deck must be exactly ${CONSTRUCTED_DECK_SIZE} cards (got ${ids.length}).`,
    });
  }

  const counts = new Map<string, number>();
  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  let sovereignPieces = 0;
  let prophecyPieces = 0;

  for (const [id, n] of counts) {
    const def = tryGet(id);
    if (!def) {
      issues.push({ code: "unknown", message: `Unknown card id: ${id}.` });
      continue;
    }
    if (def.sovereign) {
      sovereignPieces += n;
      if (n > 1) {
        issues.push({
          code: "sovereign_copy",
          message: `Sovereign ${def.name} may appear at most once (got ${n}).`,
        });
      }
    } else {
      const copyCap = nonSovereignCopyLimit(def.heresy);
      if (n > copyCap) {
        issues.push({
          code: "copy_limit",
          message: `${def.name} may appear at most ${copyCap} times (got ${n}).`,
        });
      }
    }
    if (def.type === "prophecy") prophecyPieces += n;
  }

  if (sovereignPieces > 1) {
    issues.push({
      code: "sovereign_total",
      message: `At most one Sovereign card in the deck (got ${sovereignPieces}).`,
    });
  }
  if (prophecyPieces > 1) {
    issues.push({
      code: "prophecy_total",
      message: `At most one Prophecy in the deck (got ${prophecyPieces}).`,
    });
  }

  return { ok: issues.length === 0, issues };
}

/** Full collectible pool (Codex) — not the default match deck. */
export function collectiblePool(): string[] {
  return CARDS.map((c) => c.id);
}

export function maxCopiesFor(def: CardDef): number {
  return def.sovereign ? 1 : nonSovereignCopyLimit(def.heresy);
}

export function countInDeck(deck: readonly string[], id: string): number {
  let n = 0;
  for (const x of deck) if (x === id) n += 1;
  return n;
}

/** Whether adding one more copy of `id` would stay under copy / Sovereign / prophecy caps (size ignored). */
export function canAddToDeck(deck: readonly string[], id: string): boolean {
  const def = tryGet(id);
  if (!def) return false;
  const n = countInDeck(deck, id);
  if (n >= maxCopiesFor(def)) return false;
  if (def.sovereign && deck.some((x) => tryGet(x)?.sovereign)) return false;
  if (def.type === "prophecy" && deck.some((x) => tryGet(x)?.type === "prophecy")) return false;
  return true;
}

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

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

type TypeQuota = { type: CardDef["type"]; target: number };

/** Synergy clusters — live craft Teach cores. */
const SYNERGY_CLUSTERS: { heresy: CardDef["heresy"]; cards: string[] }[] = [
  {
    heresy: "ink",
    cards: ["blot_herald", "smother_bride", "well_cantor", "pale_ledger", "mire_duelist"],
  },
  {
    heresy: "motley",
    cards: [
      "whitecard_mummer",
      "diamond_widow",
      "split_hymn_cantor",
      "masked_usher",
      "grinning_debtor",
      "scarlet_dealer",
      "velvet_antehall",
      "masque_urn",
      "coinface_charm",
      "raise_the_ante",
      "spire_caprice",
      "pit_capper",
      "favor_broker",
      "gala_mirrorhall",
      "gala_call",
      "blindfold_charm",
      "carnival_urn",
      "antewell",
      "final_raise",
    ],
  },
];

/**
 * Build a legal Constructed 20 — prefer selected craft cluster, then live pool fill.
 */
export function buildAutoDeck(opts?: { seed?: number; heresy?: CardDef["heresy"] | "all" }): string[] {
  const rng = mulberry32(opts?.seed ?? Date.now());
  const prefer = opts?.heresy && opts.heresy !== "all" ? opts.heresy : null;
  const deck: string[] = [];

  const tryAdd = (id: string): boolean => {
    if (deck.length >= CONSTRUCTED_DECK_SIZE) return false;
    if (!canAddToDeck(deck, id)) return false;
    const def = tryGet(id);
    if (!def || def.sovereign) return false;
    deck.push(id);
    return true;
  };

  const clusters = prefer
    ? SYNERGY_CLUSTERS.filter((c) => c.heresy === prefer)
    : SYNERGY_CLUSTERS;
  for (const cluster of clusters) {
    for (const id of cluster.cards) {
      tryAdd(id);
      tryAdd(id);
      tryAdd(id);
      tryAdd(id);
    }
  }

  const pool = CARDS.filter((c) => {
    if (c.sovereign) return false;
    if (prefer && c.heresy !== prefer) return false;
    return true;
  }).map((c) => c.id);
  shuffleInPlace(pool, rng);
  let guard = 0;
  while (deck.length < CONSTRUCTED_DECK_SIZE && guard++ < 80) {
    for (const p of pool) {
      if (tryAdd(p)) break;
    }
  }

  if (deck.length < CONSTRUCTED_DECK_SIZE) {
    const fill = CARDS.filter((c) => !c.sovereign).map((c) => c.id);
    shuffleInPlace(fill, rng);
    guard = 0;
    while (deck.length < CONSTRUCTED_DECK_SIZE && guard++ < 80) {
      for (const p of fill) {
        if (tryAdd(p)) break;
      }
    }
  }

  return deck.slice(0, CONSTRUCTED_DECK_SIZE);
}
