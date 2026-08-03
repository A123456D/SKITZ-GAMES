import { CARDS, getCard } from "./cards";
import type { CardDef } from "./types";

export const CONSTRUCTED_DECK_SIZE = 30;

export type ConstructIssue = {
  code:
    | "size"
    | "unknown"
    | "copy_limit"
    | "premium_copy"
    | "premium_total"
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

/** Constructed: exactly 30, ≤2 non-premium, ≤1 premium total / per id, ≤1 prophecy. */
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

  let premiumPieces = 0;
  let prophecyPieces = 0;

  for (const [id, n] of counts) {
    const def = tryGet(id);
    if (!def) {
      issues.push({ code: "unknown", message: `Unknown card id: ${id}.` });
      continue;
    }
    if (def.premium) {
      premiumPieces += n;
      if (n > 1) {
        issues.push({
          code: "premium_copy",
          message: `Premium ${def.name} may appear at most once (got ${n}).`,
        });
      }
    } else if (n > 2) {
      issues.push({
        code: "copy_limit",
        message: `${def.name} may appear at most twice (got ${n}).`,
      });
    }
    if (def.type === "prophecy") prophecyPieces += n;
  }

  if (premiumPieces > 1) {
    issues.push({
      code: "premium_total",
      message: `At most one premium card in the deck (got ${premiumPieces}).`,
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
  return def.premium ? 1 : 2;
}

export function countInDeck(deck: readonly string[], id: string): number {
  let n = 0;
  for (const x of deck) if (x === id) n += 1;
  return n;
}

/** Whether adding one more copy of `id` would stay under copy / premium / prophecy caps (size ignored). */
export function canAddToDeck(deck: readonly string[], id: string): boolean {
  const def = tryGet(id);
  if (!def) return false;
  const n = countInDeck(deck, id);
  if (n >= maxCopiesFor(def)) return false;
  if (def.premium && deck.some((x) => tryGet(x)?.premium)) return false;
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

/**
 * Build a legal Constructed 30 — curve + type mix, optional school bias, no premiums.
 * Prefer Gaze / combo staples when they fit.
 */
export function buildAutoDeck(opts?: { seed?: number; school?: CardDef["school"] | "all" }): string[] {
  const rng = mulberry32(opts?.seed ?? Date.now());
  const school = opts?.school && opts.school !== "all" ? opts.school : null;
  const deck: string[] = [];

  const prefer = [
    "cliff_seeker",
    "veil_banner",
    "ace_of_hollows",
    "ring_gaze",
    "coral_crown",
    "third_face",
    "unblinking_law",
    "pale_silence",
    "hatline_trickster",
    "inkdrip_acolyte",
    "root_chassis",
    "bone_wick_charm",
  ];

  const tryAdd = (id: string): boolean => {
    if (deck.length >= CONSTRUCTED_DECK_SIZE) return false;
    if (!canAddToDeck(deck, id)) return false;
    const def = tryGet(id);
    if (!def || def.premium) return false;
    deck.push(id);
    return true;
  };

  // Seed staples (1–2 copies where legal)
  for (const id of prefer) {
    tryAdd(id);
    if (rng() > 0.45) tryAdd(id);
  }

  const quotas: TypeQuota[] = [
    { type: "figure", target: 14 },
    { type: "site", target: 5 },
    { type: "relic", target: 5 },
    { type: "sigil", target: 2 },
    { type: "rite", target: 3 },
    { type: "vessel", target: 1 },
    { type: "prophecy", target: 1 },
  ];

  const pool = CARDS.filter((c) => !c.premium).map((c) => c.id);
  shuffleInPlace(pool, rng);

  const countType = (t: CardDef["type"]) =>
    deck.reduce((n, id) => n + (tryGet(id)?.type === t ? 1 : 0), 0);

  for (const q of quotas) {
    while (countType(q.type) < q.target && deck.length < CONSTRUCTED_DECK_SIZE) {
      const candidates = pool.filter((id) => {
        const def = tryGet(id)!;
        if (def.type !== q.type) return false;
        if (school && def.school !== school && def.school !== "neutral") return false;
        return canAddToDeck(deck, id);
      });
      if (candidates.length === 0) break;
      // Prefer lower essence early for curve
      candidates.sort((a, b) => {
        const da = tryGet(a)!;
        const db = tryGet(b)!;
        return da.essence - db.essence || rng() - 0.5;
      });
      const pick = candidates[Math.floor(rng() * Math.min(6, candidates.length))];
      if (!tryAdd(pick)) break;
    }
  }

  // Fill remainder from full pool (school-biased then any)
  const fillPass = (strictSchool: boolean) => {
    const ids = [...pool];
    shuffleInPlace(ids, rng);
    for (const id of ids) {
      if (deck.length >= CONSTRUCTED_DECK_SIZE) break;
      const def = tryGet(id);
      if (!def) continue;
      if (strictSchool && school && def.school !== school && def.school !== "neutral") continue;
      tryAdd(id);
    }
  };
  fillPass(true);
  fillPass(false);

  // Safety: if still short (unlikely), pad with cliff seekers / teach figures
  const pads = ["cliff_seeker", "hatline_trickster", "root_chassis", "inkdrip_acolyte", "veil_banner"];
  let guard = 0;
  while (deck.length < CONSTRUCTED_DECK_SIZE && guard++ < 80) {
    const id = pads[guard % pads.length];
    if (!tryAdd(id)) {
      for (const p of pool) {
        if (tryAdd(p)) break;
      }
    }
  }

  return deck.slice(0, CONSTRUCTED_DECK_SIZE);
}
