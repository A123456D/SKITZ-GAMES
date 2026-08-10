import type { CardDef } from "./types";

/**
 * Starter pool — each card has a unique front→ink keyword identity.
 * STING front = scar on play · STING ink = scar on fold
 * FLASH on either face = draw on fold
 * BRACE / GLUE = active on the visible face
 */
export const CARDS: CardDef[] = [
  {
    id: "scrap_dog",
    name: "Ash Hound",
    cost: 1,
    frontPower: 2,
    inkPower: 3,
    frontKeyword: "sting",
    inkKeyword: "flash",
    artSubject: "fierce ash-black hound with ember eyes and cracked charcoal fur",
    inkSubject: "same hound wreathed in blue ink flame streaks",
  },
  {
    id: "glue_ghost",
    name: "Vapor Wraith",
    cost: 1,
    frontPower: 1,
    inkPower: 3,
    frontKeyword: "glue",
    inkKeyword: "brace",
    artSubject: "elegant vapor spirit mask floating in mist, sharp and eerie",
    inkSubject: "same wraith mask trailing indigo ink smoke",
  },
  {
    id: "fold_fox",
    name: "Crease Kitsune",
    cost: 2,
    frontPower: 2,
    inkPower: 4,
    frontKeyword: "flash",
    inkKeyword: "sting",
    artSubject: "sleek nine-suggestion kitsune with geometric crease markings, cool anime fox spirit",
    inkSubject: "same kitsune mid-fold with glowing blue crease runes",
  },
  {
    id: "tape_troll",
    name: "Coil Warden",
    cost: 2,
    frontPower: 3,
    inkPower: 2,
    frontKeyword: "brace",
    inkKeyword: "glue",
    artSubject: "armored warden wrapped in binding coils, stoic and imposing",
    inkSubject: "same warden with coils unraveling into blue ink ribbons",
  },
  {
    id: "ink_imp",
    name: "Ink Ronin",
    cost: 2,
    frontPower: 2,
    inkPower: 3,
    frontKeyword: "sting",
    inkKeyword: "brace",
    artSubject: "masked ronin silhouette holding an ink-brush katana, sharp and stylish",
    inkSubject: "same ronin exploding into calligraphy ink slashes",
  },
  {
    id: "paper_crane",
    name: "Oracle Crane",
    cost: 3,
    frontPower: 2,
    inkPower: 5,
    frontKeyword: "flash",
    inkKeyword: "glue",
    artSubject: "majestic crane with sigil-marked wings, mystical and elegant",
    inkSubject: "same crane diving with ink-sigil wing trails",
  },
  {
    id: "staple_spider",
    name: "Needle Widow",
    cost: 3,
    frontPower: 4,
    inkPower: 3,
    frontKeyword: "glue",
    inkKeyword: "flash",
    artSubject: "sleek black widow with needle-thin chrome legs, dangerous and graphic",
    inkSubject: "same widow in a web of blue ink filaments",
  },
  {
    id: "cutout_cat",
    name: "Void Cat",
    cost: 3,
    frontPower: 3,
    inkPower: 4,
    frontKeyword: "brace",
    inkKeyword: "flash",
    artSubject: "mysterious void-black cat with crescent moon mark and star-flecked fur, cool anime cat",
    inkSubject: "same cat with glowing violet void eyes and ink nebula fur",
  },
  {
    id: "binder_beast",
    name: "Archive Drake",
    cost: 4,
    frontPower: 5,
    inkPower: 4,
    frontKeyword: "brace",
    inkKeyword: "sting",
    artSubject: "compact dragon with scroll-scale armor and sealed rune plates, powerful",
    inkSubject: "same drake with pages of ink runes peeling from its wings",
  },
  {
    id: "rip_raven",
    name: "Tear Crow",
    cost: 4,
    frontPower: 4,
    inkPower: 6,
    frontKeyword: "sting",
    inkKeyword: "glue",
    artSubject: "dramatic crow with shredded wing tips and crimson eye, gothic cool not cute",
    inkSubject: "same crow ripping through a page with blue ink motion trails",
  },
];

const byId = new Map(CARDS.map((c) => [c.id, c]));

export function getCard(id: string): CardDef {
  const c = byId.get(id);
  if (!c) throw new Error(`Unknown card ${id}`);
  return c;
}

export function starterDeck(): string[] {
  return CARDS.map((c) => c.id);
}

export function keywordLabel(k: string | undefined): string {
  if (!k) return "";
  return k.toUpperCase();
}

/** Short rules text for HUD / tutorial */
export const KEYWORD_RULES: Record<string, string> = {
  brace: "BRACE: ignores scars; survives a fold-destroy Rip by unfolding.",
  sting: "STING: scar the enemy in this lane — on play (front) or on fold (ink).",
  glue: "GLUE: sticker can't be peeled — Rip hits the body under it.",
  flash: "FLASH: when you Fold this card, draw a card.",
};

/** One-line identity for menus / tooltips */
export function cardIdentity(id: string): string {
  const c = getCard(id);
  const front = c.frontKeyword ? keywordLabel(c.frontKeyword) : "—";
  const ink = c.inkKeyword ? keywordLabel(c.inkKeyword) : "—";
  return `${c.name}: ${front} → ${ink} (${c.frontPower}/${c.inkPower})`;
}
