/**
 * OCULUM full-face art — locked prompt template (v2 regenerate pass).
 * Every GenerateImage call must use buildCardFacePrompt(card) so faces stay consistent
 * and printed rules match CardDef.text exactly.
 *
 * NEVER freeform invent rules text, life, ATK/DEF, or "Ink" as a resource.
 */
export type ArtCard = {
  id: string;
  name: string;
  heresy: string;
  short: string;
  type: string;
  essence: number;
  witnessCost: number;
  veiledPower: number;
  witnessedPower: number;
  sightYield: number;
  sovereign: boolean;
  text: string;
  artSubject: string;
};

export function buildCardFacePrompt(c: ArtCard): string {
  const witPip =
    c.witnessCost > 0
      ? `TOP-RIGHT teal filled circle with clear number ${c.witnessCost} (Witness Sight cost).`
      : `NO top-right Witness pip (this card has no Witness cost).`;

  const combat =
    c.type === "figure" || c.type === "vessel"
      ? `Also print combat line exactly: Veiled ${c.veiledPower} · Witnessed ${c.witnessedPower}${
          c.sightYield > 0 ? ` · Sight/turn ${c.sightYield}` : ""
        }. Do NOT print ATK/DEF, power/toughness, or 1/3 style bottom corners.`
      : c.sightYield > 0
        ? `Also print: Sight/turn ${c.sightYield}.`
        : "";

  const sovereign = c.sovereign
    ? "Mark as SOVEREIGN with a small gold seal, not clutter. Never say PREMIUM."
    : "Do not mark as Sovereign or Premium.";

  const frameCraft =
    c.heresy === "deal"
      ? "FRAME COLOR LOCK (Dusk Ledger): ornate copper and charcoal canyon ledger frame — warm dusk-orange rim light, eclipsed-sun and debt-coin micro accents. NOT cream Ink frames. NOT purple Motley filigree."
      : c.heresy === "motley"
        ? "FRAME COLOR LOCK (Motley Masquerade): ornate purple/teal/gold court filigree unique to this card."
        : c.heresy === "ink"
          ? "FRAME COLOR LOCK (Ink Abyss — match classic Ink / Mire Duelist): cream parchment / bone ornate frame being eaten by heavy black ink drips and splatters; high-contrast ink-wash illustration in cream and black only (sparse gold + teal for cost pips only); black nameplate bar; teal strip under name reading craft · type; CREAM parchment rules text box with dark readable type; small eye-seal footer. NOT ornate gold filigree frames, NOT colorful gothic, NOT dark metal, NOT purple Motley, NOT copper Dusk."
          : c.heresy === "shell"
            ? "FRAME COLOR LOCK (Bonewick): ornate bone-white cracked coastal shrine frame — matte bone, deep royal blue banners/shards, pale sea accents. NOT Delft china. NOT Ink cream-drip swamp. NOT Motley purple. NOT Dusk copper hats."
            : "Ornate dark stone outer frame with thin gold inner trim and subtle diamond mid-side accents — frame fully inside the image.";

  const rulesBox =
    c.heresy === "ink"
      ? `CREAM parchment rules text box with dark readable English matching EXACTLY this text and NOTHING ELSE (do not invent, do not say life or HP or ATK or DEF or mana or lose Ink as a resource; Ink Abyss is the craft name only; print EXACTLY): ${c.text}`
      : `Dark high-contrast rules text box with clean readable English matching EXACTLY this text and NOTHING ELSE (do not invent, do not say life or HP or ATK or DEF or mana or lose Ink as a resource; print EXACTLY): ${c.text}`;

  const styleLock =
    c.heresy === "ink"
      ? "Style lock: high-end graphic novel ink-wash CCG; bold black ink outlines; cream and black monochrome with ink drips; sparse gold+teal pips only; beauty + wrongness; strong silhouette readable at hand size."
      : "Style lock: high-end graphic novel / premium CCG; bold black ink outlines; cel-shade + painterly cloth, stone, metal; saturated weathered color; beauty + wrongness; surreal weird-fantasy eye-faith pilgrimage; strong silhouette readable at hand size.";

  return [
    "Complete premium OCULUM collectible trading card, full finished card face, tall portrait (trading-card 2:3 proportions).",
    "The ENTIRE card is one finished illustration — art covers the whole face including frame, costs, name, and rules (no empty parchment, no separate UI chrome).",
    "FRAME SAFE MARGIN (critical): the complete ornate outer frame must be fully visible on ALL four sides — top scrollwork, bottom footer emblem, and both side borders. Inset the whole card at least 5% from every canvas edge. Never crop, clip, or bleed the frame off the image.",
    "COMPOSITION LOCK: the main subject fills ~70-80% of the card art window — head near the top chrome, body/props to the edges; environment is backdrop only. Never a distant tiny figure in a landscape. Never letterboxed wide art.",
    "Shared set layout (must match every other OCULUM card in this regenerate pass):",
    frameCraft,
    `TOP-LEFT gold filled circle with clear number ${c.essence} (Essence).`,
    witPip,
    `Dark nameplate with bold clean white title exactly: ${c.name.toUpperCase()}.`,
    `Under title, small teal strip exactly: ${c.short.toUpperCase()} · ${c.type.toUpperCase()}.`,
    rulesBox,
    combat,
    sovereign,
    `ART (original subject only — never copy reference sheet characters): ${c.artSubject}.`,
    styleLock,
    "Eye iconography as religion on banners/seals/masks — stylized, not horror spam.",
    "No watermark, no other-game logos, no readable IP text, no TiNG tags, original character design only.",
  ].join(" ");
}
