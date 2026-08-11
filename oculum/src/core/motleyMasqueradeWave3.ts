import type { CardDef } from "./types";

/**
 * Motley Masquerade — Wave 3 (Cash/Bust lanes + Favor).
 */
export const MOTLEY_MASQUERADE_WAVE3: CardDef[] = [
  {
    id: "spire_caprice",
    name: "Spire Caprice",
    heresy: "motley",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "glamorous sexy motley masquerade spire caprice high cliff dancer purple teal gold ornate court cliffs original",
    veiledAbility:
      "While on High and Wagered, this has +1 power. You may Wager this (ante 1 Sight). Cash: Blind Mid.",
    revelation: "If on High, Free Wager this and gain 1 Sight.",
    text: "Veiled: While on High and Wagered, this has +1 power. You may Wager this (ante 1 Sight). Cash: Blind Mid. Revelation: If on High, Free Wager this and gain 1 Sight.",
  },
  {
    id: "pit_capper",
    name: "Pit Capper",
    heresy: "motley",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "motley masquerade pit capper low dice grin purple teal gold ornate court cliffs original",
    veiledAbility:
      "When this Holds on Low, if any friendly is Wagered, Blind Low this turn. Bust: Gain 1 Favor.",
    revelation: "Free Wager this. If on Low, gain 1 Favor.",
    text: "Veiled: When this Holds on Low, if any friendly is Wagered, Blind Low this turn. Bust: Gain 1 Favor. Revelation: Free Wager this. If on Low, gain 1 Favor.",
  },
  {
    id: "favor_broker",
    name: "Favor Broker",
    heresy: "motley",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "glamorous sexy motley masquerade favor broker ledger chips purple teal gold ornate court cliffs original",
    veiledAbility:
      "You may Wager this (ante 1 Sight). When this wins Resolve while Veiled, Stance B, and Wagered: gain 1 Sight. Cash: Gain 1 Favor.",
    revelation: "Switch Stance. If this became Stance B, gain 1 Favor.",
    text: "Veiled: You may Wager this (ante 1 Sight). When this wins Resolve while Veiled, Stance B, and Wagered: gain 1 Sight. Cash: Gain 1 Favor. Revelation: Switch Stance. If this became Stance B, gain 1 Favor.",
  },
  {
    id: "gala_mirrorhall",
    name: "Gala Mirrorhall",
    heresy: "motley",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "motley masquerade gala mirrorhall purple teal gold mirrors ballroom landmark ornate cliffs original",
    text: "Site. While you have Favor, your Stance B Figures have +1 power. Cash here: gain 1 Sight.",
  },
  {
    id: "gala_call",
    name: "Gala Call",
    heresy: "motley",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "motley masquerade gala call rite purple teal gold invitation bell parchment ornate cliffs original",
    text: "Gain 1 Favor. Until Resolve, your Stance B Figures have +1 power.",
  },
];

export const MOTLEY_MASQUERADE_WAVE3_RITE_IDS = new Set(["gala_call"]);
