import type { CardDef } from "./types";

/**
 * Motley Masquerade — Wave 1 (Cash/Bust Wager kit).
 * Roles: Ante opener · High-roller · Table dealer · House edge · Bust specialist.
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
      "When this Holds, enter Stance B if able. You may Wager this (ante 1 Sight). Cash: Gain 1 Favor.",
    revelation: "Enter Stance B. If this is Wagered, gain 1 Sight.",
    text: "Veiled: When this Holds, enter Stance B if able. You may Wager this (ante 1 Sight). Cash: Gain 1 Favor. Revelation: Enter Stance B. If this is Wagered, gain 1 Sight.",
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
      "You may Wager this (ante 1 Sight). While Stance B and Wagered, this has +1 power. Cash (Stance B): Gain 2 Favor. Bust: Blind this altitude.",
    revelation: "Switch Stance.",
    text: "Veiled: You may Wager this (ante 1 Sight). While Stance B and Wagered, this has +1 power. Cash (Stance B): Gain 2 Favor. Bust: Blind this altitude. Revelation: Switch Stance.",
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
    revelation: "Switch Stance on another friendly Figure.",
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
      "Whenever an enemy Figure in another altitude becomes Forced Exposed, Free Wager this if able. Cash: Gain 1 Favor.",
    revelation: "If you control a Wagered Figure, gain 1 Sight.",
    text: "Veiled: Whenever an enemy Figure in another altitude becomes Forced Exposed, Free Wager this if able. Cash: Gain 1 Favor. Revelation: If you control a Wagered Figure, gain 1 Sight.",
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
    veiledAbility: "The first time each turn a friendly Motley Busts, gain 1 Favor.",
    revelation: "If Wagered, Blind Low; otherwise gain 1 Sight.",
    text: "Veiled: The first time each turn a friendly Motley Busts, gain 1 Favor. Cash: Gain 1 Sight. Revelation: If Wagered, Blind Low; otherwise gain 1 Sight.",
  },
];

export const MOTLEY_MASQUERADE_WAVE1_RITE_IDS = new Set<string>();

/** @deprecated Use MOTLEY_MASQUERADE_WAVE1 */
export const MOTLEY_COURT_WAVE1 = MOTLEY_MASQUERADE_WAVE1;
/** @deprecated */
export const MOTLEY_COURT_WAVE1_RITE_IDS = MOTLEY_MASQUERADE_WAVE1_RITE_IDS;
