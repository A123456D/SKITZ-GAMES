import type { CardDef } from "./types";

/**
 * Motley Masquerade — Wave 2 Trick support pack.
 * Roles: Hall bank · Mask continuity · Flip graft · Ante rite · Cash chain risk.
 * Unique names — no reuse of shelved Motley Court ids.
 */
export const MOTLEY_MASQUERADE_WAVE2: CardDef[] = [
  {
    id: "scarlet_dealer",
    name: "Scarlet Dealer",
    heresy: "motley",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "glamorous sexy motley masquerade scarlet dealer card table purple teal gold risk smile ornate court cliffs original",
    veiledAbility:
      "When this Cashes, draw 1. You may Wager this (ante 1 Sight).",
    revelation: "Enter Stance B. If you control another Wagered Figure, draw 1.",
    text: "Veiled: When this Cashes, draw 1. You may Wager this (ante 1 Sight). Revelation: Enter Stance B. If you control another Wagered Figure, draw 1. Bust: the opponent gains 1 Sight.",
  },
  {
    id: "velvet_antehall",
    name: "Velvet Antehall",
    heresy: "motley",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "motley masquerade velvet antehall purple teal gold ornate hall mirrors dice seals landmark cliffs original",
    text: "Site. When a friendly Figure here Switches Stance, gain 1 Sight. When a friendly Figure here Cashes, gain 1 Sight.",
  },
  {
    id: "masque_urn",
    name: "Masque Urn",
    heresy: "motley",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "motley masquerade masque urn vessel purple teal gold twin mask chamber ornate cliffs original",
    revelation: "Free Wager this if able.",
    text: "Vessel. On play, tuck a Figure from hand as Inhabitant if able. Revelation: Free Wager this if able. When this Falls or is Forced Exposed: Free Wager another friendly Veiled Figure if able.",
  },
  {
    id: "coinface_charm",
    name: "Coinface Charm",
    heresy: "motley",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "motley masquerade coinface charm graft purple teal gold coin mask seal floating ornate cliffs original",
    text: "Graft: +1 power while host Witnessed. When host Switches Stance while Veiled, gain 1 Sight. When host Cashes, draw 1.",
  },
  {
    id: "raise_the_ante",
    name: "Raise the Ante",
    heresy: "motley",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "motley masquerade raise the ante rite purple teal gold chips hand parchment ornate cliffs original",
    text: "Choose an altitude. Ante 1 Sight to Wager your Veiled Figure there if able. If it was already Wagered, Blind that altitude this turn.",
  },
];

export const MOTLEY_MASQUERADE_WAVE2_RITE_IDS = new Set(["raise_the_ante"]);
