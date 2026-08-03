import { CARDS, getCard } from "./cards";
import type { CardDef, CardType, School } from "./types";

const SCHOOL_ORDER: School[] = [
  "cube",
  "deal",
  "many",
  "graft",
  "hollow",
  "coral",
  "shell",
  "deep",
  "ring",
  "neutral",
];

const TYPE_ORDER: CardType[] = [
  "figure",
  "site",
  "relic",
  "sigil",
  "vessel",
  "rite",
  "prophecy",
];

function schoolRank(s: School): number {
  const i = SCHOOL_ORDER.indexOf(s);
  return i < 0 ? 99 : i;
}

function typeRank(t: CardType): number {
  const i = TYPE_ORDER.indexOf(t);
  return i < 0 ? 99 : i;
}

/** Codex / deck-index order: School → premium → Type → Essence → name. */
export function compareCardCatalog(a: CardDef, b: CardDef): number {
  const s = schoolRank(a.school) - schoolRank(b.school);
  if (s !== 0) return s;
  const p = Number(!!b.premium) - Number(!!a.premium);
  if (p !== 0) return p;
  const t = typeRank(a.type) - typeRank(b.type);
  if (t !== 0) return t;
  const e = a.essence - b.essence;
  if (e !== 0) return e;
  return a.name.localeCompare(b.name);
}

/** Sorted ids present in `available` (e.g. FULL_CARD_IDS). */
export function catalogOrder(available: readonly string[]): string[] {
  const set = new Set(available);
  return CARDS.filter((c) => set.has(c.id))
    .slice()
    .sort(compareCardCatalog)
    .map((c) => c.id);
}

export function catalogCard(id: string): CardDef {
  return getCard(id);
}
