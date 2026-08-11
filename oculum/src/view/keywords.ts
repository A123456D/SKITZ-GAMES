import type { CardDef } from "../core/types";

export type KeywordId =
  | "stain"
  | "toll"
  | "peal"
  | "breach"
  | "open"
  | "wager"
  | "press"
  | "blind"
  | "gaze"
  | "forced_expose"
  | "revelation"
  | "stance"
  | "favor"
  | "resonance"
  | "erase"
  | "halo"
  | "blaze"
  | "sustain"
  | "tempt"
  | "brand"
  | "devour";

type KeywordDef = {
  id: KeywordId;
  /** Case-insensitive match in card rules. */
  match: RegExp;
  /** Match after HTML-escape for inline annotation (same as match). */
  annotate: RegExp;
  label: string;
  text: string;
};

/**
 * Craft / rules keywords beginners hit on faces.
 * Longer phrases first so annotate doesn't split them.
 */
export const KEYWORDS: KeywordDef[] = [
  {
    id: "forced_expose",
    match: /\bForced Expose(?:d|s)?\b/i,
    annotate: /\bForced Expose(?:d|s)?\b/gi,
    label: "Forced Expose",
    text: "Veil broken against their will — they become Witnessed with no Revelation.",
  },
  {
    id: "revelation",
    match: /\bRevelation\b/i,
    annotate: /\bRevelation\b/gi,
    label: "Revelation",
    text: "One-shot trigger the first time a Figure becomes Witnessed this board life.",
  },
  {
    id: "resonance",
    match: /\bResonance\b/i,
    annotate: /\bResonance\b/gi,
    label: "Resonance",
    text: "Bellward beat when Toll tax fires — some cards pay you when looking gets expensive.",
  },
  {
    id: "stain",
    match: /\bStain(?:ed|s)?\b/i,
    annotate: /\bStain(?:ed|s)?\b/gi,
    label: "Stain",
    text: "Ink Mark on a Figure. Enables Press / Erase; many Ink cards care about Stained foes.",
  },
  {
    id: "toll",
    match: /\bToll(?:ed|s)?\b/i,
    annotate: /\bToll(?:ed|s)?\b/gi,
    label: "Toll",
    text: "Bellward sticky mark on a lane. Owner's Figures there +1. Enemy Witness or Gaze into that lane pays Sight tax. Peal arms a Toll so Resolve pays Sight + a card when the Toll is spent.",
  },
  {
    id: "peal",
    match: /\bPeal(?:s)?\b/i,
    annotate: /\bPeal(?:s)?\b/gi,
    label: "Peal",
    text: "Arm your Toll (1 Sight). When Resolve spends that Toll, you gain Sight.",
  },
  {
    id: "breach",
    match: /\bBreach(?:es|ed)?\b/i,
    annotate: /\bBreach(?:es|ed)?\b/gi,
    label: "Breach",
    text: "Scar Resolve rider — a Witnessed Scar Figure that wins Resolve deals +1 Will Breach (Open).",
  },
  {
    id: "open",
    match: /\bOpen\b/i,
    annotate: /\bOpen\b/g,
    label: "Open",
    text: "Scar commit — pay Sight to Witness so Breach turns on. Veiled Scar wins do not Breach.",
  },
  {
    id: "halo",
    match: /\bHalo(?:'?d|ed)?\b/i,
    annotate: /\bHalo(?:'?d|ed)?\b/gi,
    label: "Halo",
    text: "Lumen mark after you Witness your own Figure. Halo'd Figures +1 power and Blaze when you Pass.",
  },
  {
    id: "blaze",
    match: /\bBlaze(?:s|d)?\b/i,
    annotate: /\bBlaze(?:s|d)?\b/gi,
    label: "Blaze",
    text: "End of your window: each Halo'd Figure deals 1 Will if the lane is contested (else +1 Sight), then Re-Veils unless Sustained.",
  },
  {
    id: "sustain",
    match: /\bSustain(?:s|ed)?\b/i,
    annotate: /\bSustain(?:s|ed)?\b/gi,
    label: "Sustain",
    text: "Spend 1 Sight on a Halo'd Figure before Pass to keep Halo through Blaze (Shrine can make the first free).",
  },
  {
    id: "tempt",
    match: /\bTempt(?:ed|s)?\b/i,
    annotate: /\bTempt(?:ed|s)?\b/gi,
    label: "Tempt",
    text: "Mark an enemy Veiled Figure. They Witness/Gaze it at −1 Sight (bait). Never forces Witness (≠ Lure).",
  },
  {
    id: "brand",
    match: /\bBrand(?:ed|s)?\b/i,
    annotate: /\bBrand(?:ed|s)?\b/gi,
    label: "Brand",
    text: "When they Witness a Tempted Figure, Brand it and you gain 1 Sight. Not Stain/Erase.",
  },
  {
    id: "devour",
    match: /\bDevour(?:s|ed)?\b/i,
    annotate: /\bDevour(?:s|ed)?\b/gi,
    label: "Devour",
    text: "On your Pass, each Branded enemy: 1 Will if Witnessed, else +1 Sight — then Brand clears.",
  },
  {
    id: "wager",
    match: /\bWager(?:ed|s)?\b/i,
    annotate: /\bWager(?:ed|s)?\b/gi,
    label: "Wager",
    text: "Motley ante (Sight). Win Veiled + Stance B while Wagered → Eclipse (needs Favor). Bust if Forced Exposed.",
  },
  {
    id: "press",
    match: /\bPress(?:ed|es)?\b/i,
    annotate: /\bPress(?:ed|es)?\b/gi,
    label: "Press",
    text: "Ink verb — mark a Stained Veiled enemy (−1 power). Win Resolve to Forced Expose / Erase through Stance B; fail → backlash.",
  },
  {
    id: "blind",
    match: /\bBlind(?:ed|s)?\b/i,
    annotate: /\bBlind(?:ed|s)?\b/gi,
    label: "Blind",
    text: "That altitude yields no Sight this turn (Sites / yields shut off).",
  },
  {
    id: "gaze",
    match: /\bGaze(?:d|s)?\b/i,
    annotate: /\bGaze(?:d|s)?\b/gi,
    label: "Gaze",
    text: "Spend Sight to Witness an enemy Figure — you steal their one-time Revelation.",
  },
  {
    id: "stance",
    match: /\bStance\b/i,
    annotate: /\bStance\b/gi,
    label: "Stance",
    text: "Motley A/B. Stance B swaps Veiled/Witnessed power while Veiled and walls normal Erase.",
  },
  {
    id: "favor",
    match: /\bFavor\b/i,
    annotate: /\bFavor\b/gi,
    label: "Favor",
    text: "Motley currency (max 3). Spend into Wagers and Motley payoffs — not Essence or Sight.",
  },
  {
    id: "erase",
    match: /\bErase(?:d|s)?\b/i,
    annotate: /\bErase(?:d|s)?\b/gi,
    label: "Erase",
    text: "Ink kill path through Veil / Stance B — usually via Press winning Resolve on a Stained foe.",
  },
];

const BY_ID = new Map(KEYWORDS.map((k) => [k.id, k]));

export function getKeyword(id: string): KeywordDef | undefined {
  return BY_ID.get(id as KeywordId);
}

function cardRulesBlob(def: CardDef): string {
  return [def.text, def.veiledAbility, def.revelation].filter(Boolean).join("\n");
}

/** Keyword ids that appear in this card's printed rules. */
export function keywordsOnCard(def: CardDef): KeywordId[] {
  const blob = cardRulesBlob(def);
  const found: KeywordId[] = [];
  for (const kw of KEYWORDS) {
    if (kw.match.test(blob)) found.push(kw.id);
    kw.match.lastIndex = 0;
    kw.annotate.lastIndex = 0;
  }
  return found;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wrap keyword tokens in tappable buttons (rules already plain text). */
export function annotateKeywords(text: string): string {
  let out = escapeHtml(text);
  for (const kw of KEYWORDS) {
    out = out.replace(kw.annotate, (m) => {
      return `<button type="button" class="kw" data-kw="${kw.id}">${m}</button>`;
    });
    kw.annotate.lastIndex = 0;
  }
  return out;
}

/** Glossary chips under card rules — only keywords printed on this card. */
export function keywordGlossaryHtml(def: CardDef): string {
  const ids = keywordsOnCard(def);
  if (!ids.length) return "";
  const items = ids
    .map((id) => {
      const kw = BY_ID.get(id)!;
      return `<button type="button" class="kw-chip" data-kw="${kw.id}" title="${escapeHtml(kw.text)}">
        <span class="kw-chip-label">${escapeHtml(kw.label)}</span>
        <span class="kw-chip-text">${escapeHtml(kw.text)}</span>
      </button>`;
    })
    .join("");
  return `<div class="kw-glossary" aria-label="Keyword glossary">${items}</div>`;
}

export function explainKeyword(id: string): string | null {
  const kw = getKeyword(id);
  if (!kw) return null;
  return `${kw.label.toUpperCase()} — ${kw.text}`;
}
