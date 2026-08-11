import type { CardDef } from "./types";

/**
 * Ink Abyss — Wave 1 identity pass (Erase craft).
 * Roles: Police · Tax/Fog · Choir · Combo relocator · Execute finisher.
 */
export const INK_ABYSS_WAVE1: CardDef[] = [
  {
    id: "blot_herald",
    name: "Blot Herald",
    heresy: "ink",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — ink-abyss creature pale courier blot-seal staff ink-maw void face, unique cream processional arch inner frame, high-contrast cream-black ink-wash",
    veiledAbility:
      "Whenever an enemy Figure in another altitude becomes Witnessed, Stain that Figure. Then Stain a different Veiled enemy Figure if able.",
    revelation: "Stain the enemy Figure here if able. Gain 1 Sight.",
    text: "Veiled: Whenever an enemy Figure in another altitude becomes Witnessed, Stain that Figure. Then Stain a different Veiled enemy Figure if able. Revelation: Stain the enemy Figure here if able. Gain 1 Sight. Press: shared (1 Sight → Press Stained Veiled enemy; win Resolve to Erase through Stance B; fail → lose 1 Sight).",
  },
  {
    id: "smother_bride",
    name: "Smother Bride",
    heresy: "ink",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — ink-abyss creature glamorous sexy ink-maw veiled bride, unique cream bridal lace drip inner frame, high-contrast cream-black ink-wash",
    veiledAbility:
      "When this wins Resolve while Veiled against a Stained enemy, Blind this altitude this turn.",
    revelation:
      "Blind each altitude that has a Stained enemy Figure. If you Blinded 2 or more, gain 1 Sight. While Witnessed: The first time each turn an opponent spends Sight to Witness or Gaze, they lose 1 additional Sight if able.",
    text: "Veiled: When this wins Resolve while Veiled against a Stained enemy, Blind this altitude this turn. Revelation: Blind each altitude that has a Stained enemy Figure. If you Blinded 2 or more, gain 1 Sight. While Witnessed: The first time each turn an opponent spends Sight to Witness or Gaze, they lose 1 additional Sight if able. Press: when your Press Forces Exposed, Blind that altitude this turn.",
  },
  {
    id: "well_cantor",
    name: "Well Cantor",
    heresy: "ink",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 1,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — ink-abyss creature choir cantor cream cloth black chorus mouths over gulf well, unique cream well-lip circle inner frame, high-contrast cream-black ink-wash",
    veiledAbility:
      "When a friendly Ink Figure in another altitude Holds, Stain the enemy Figure here if able.",
    revelation:
      "Your other Veiled Ink Figures get +1 power until Resolve. Gain 1 Sight for each other friendly Veiled Ink Figure (max 2).",
    text: "Veiled: When a friendly Ink Figure in another altitude Holds, Stain the enemy Figure here if able. Revelation: Your other Veiled Ink Figures get +1 power until Resolve. Gain 1 Sight for each other friendly Veiled Ink Figure (max 2). While Witnessed: +1 Sight/turn.",
  },
  {
    id: "pale_ledger",
    name: "Pale Ledger",
    heresy: "ink",
    type: "figure",
    essence: 1,
    witnessCost: 1,
    veiledPower: 1,
    witnessedPower: 2,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — ink-abyss creature parchment blot-spawn runt dripping ledger void eye, unique cream ledger-tablet inner frame, high-contrast cream-black ink-wash",
    veiledAbility: "While Veiled: +1 power if any enemy Figure is Stained.",
    revelation:
      "Move a Stain from one enemy Figure to another enemy Figure if able. Then: if the new host is Veiled, Forced Expose them (no Revelation) and Strain them; if Witnessed, Blind their altitude this turn.",
    text: "Veiled: While Veiled: +1 power if any enemy Figure is Stained. Revelation: Move a Stain from one enemy Figure to another enemy Figure if able. Then: if the new host is Veiled, Forced Expose them (no Revelation) and Strain them; if Witnessed, Blind their altitude this turn.",
  },
  {
    id: "mire_duelist",
    name: "Mire Duelist",
    heresy: "ink",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — ink-abyss creature lean swamp ink-beast stained blade maw-mask, unique cream ruin-column inner frame, high-contrast cream-black ink-wash",
    veiledAbility: "When this wins Resolve while Veiled against a Stained enemy, gain 1 Sight.",
    revelation:
      "Stain the enemy Figure here if able. While Witnessed: Stained enemies here have −1 power. If a Stained Witnessed enemy here loses Resolve, they Fall.",
    text: "Veiled: When this wins Resolve while Veiled against a Stained enemy, gain 1 Sight. Revelation: Stain the enemy Figure here if able. While Witnessed: Stained enemies here have −1 power. If a Stained Witnessed enemy here loses Resolve, they Fall. Press: when your Press Forces Exposed a Figure here, gain 1 Sight.",
  },
];

export const INK_ABYSS_WAVE1_RITE_IDS = new Set<string>();
