import type { CardDef } from "./types";

/**
 * Motley Masquerade — Wave 1 identity pass (Trick + Wager).
 * Roles: Ante opener · High-roller · Table dealer · House edge · Bust specialist.
 * Live in CARDS; Motley Teach is 2× Waves 1–2 (craft under 16 → copy limit 4).
 */
export const MOTLEY_MASQUERADE_WAVE1: CardDef[] = [
  {
    id: "whitecard_mummer",
    name: "Whitecard Mummer",
    heresy: "motley",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "motley masquerade whitecard mummer smile mask top hat purple teal gold ornate court cliffs original",
    veiledAbility:
      "When this Holds, enter Stance B if able. You may Wager this (ante 1 Sight).",
    revelation: "Enter Stance B. If this is Wagered, gain 1 Sight.",
    text: "Veiled: When this Holds, enter Stance B if able. You may Wager this (ante 1 Sight). Revelation: Enter Stance B. If this is Wagered, gain 1 Sight. Cash (win Resolve Veiled while Wagered): draw 1.",
  },
  {
    id: "diamond_widow",
    name: "Diamond Widow",
    heresy: "motley",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "glamorous sexy motley masquerade diamond widow gem eye veil purple teal gold ornate court cliffs original",
    veiledAbility:
      "When this wins Resolve while Veiled, Stance B, and Wagered: draw 2. You may Wager this (ante 1 Sight).",
    revelation: "Switch Stance.",
    text: "Veiled: When this wins Resolve while Veiled, Stance B, and Wagered: draw 2. You may Wager this (ante 1 Sight). Revelation: Switch Stance. Bust: Blind this altitude this turn.",
  },
  {
    id: "split_hymn_cantor",
    name: "Split-Hymn Cantor",
    heresy: "motley",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 1,
    artSubject:
      "glamorous motley masquerade split-hymn twin face cantor purple teal gold choir cliffs original",
    veiledAbility: "When this Holds, Switch Stance on another friendly Figure if able.",
    revelation:
      "Switch Stance on another friendly Figure.",
    text: "Veiled: When this Holds, Switch Stance on another friendly Figure if able. Revelation: Switch Stance on another friendly Figure. While Witnessed: +1 Sight/turn.",
  },
  {
    id: "masked_usher",
    name: "Masked Usher",
    heresy: "motley",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "motley masquerade masked usher glamorous cloak purple teal gold door staff court cliffs original",
    veiledAbility:
      "Whenever an enemy Figure in another altitude becomes Forced Exposed, Free Wager this if able.",
    revelation: "If you control a Wagered Figure, gain 1 Sight.",
    text: "Veiled: Whenever an enemy Figure in another altitude becomes Forced Exposed, Free Wager this if able. Revelation: If you control a Wagered Figure, gain 1 Sight. Cash: draw 1.",
  },
  {
    id: "grinning_debtor",
    name: "Grinning Debtor",
    heresy: "motley",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "motley masquerade grinning debtor dice smile purple teal gold debt ledger court cliffs original",
    veiledAbility: "The first time each turn a friendly Figure Busts, draw 1.",
    revelation: "If this is Wagered, Blind Low this turn. Otherwise draw 1.",
    text: "Veiled: The first time each turn a friendly Figure Busts, draw 1. Revelation: If this is Wagered, Blind Low this turn. Otherwise draw 1. Cash: gain 1 Sight.",
  },
];

export const MOTLEY_MASQUERADE_WAVE1_RITE_IDS = new Set<string>();

/** @deprecated Use MOTLEY_MASQUERADE_WAVE1 */
export const MOTLEY_COURT_WAVE1 = MOTLEY_MASQUERADE_WAVE1;
/** @deprecated */
export const MOTLEY_COURT_WAVE1_RITE_IDS = MOTLEY_MASQUERADE_WAVE1_RITE_IDS;
