import type { CardDef } from "./types";

/**
 * Motley Masquerade — Wave 4 (Cash/Bust closer).
 */
export const MOTLEY_MASQUERADE_WAVE4: CardDef[] = [
  {
    id: "lady_masque",
    name: "Lady Masque",
    heresy: "motley",
    type: "figure",
    essence: 5,
    witnessCost: 3,
    veiledPower: 3,
    witnessedPower: 7,
    sightYield: 0,
    sovereign: true,
    artSubject:
      "glamorous sexy motley masquerade sovereign lady masque throne purple teal gold crown twin masks ornate court cliffs original SOVEREIGN legend presence",
    veiledAbility: "Whenever a friendly Motley Figure Cashes, gain 1 Sight.",
    revelation: "Free Wager this. If you control 2 or more Wagered Motley Figures, gain 1 Eclipse and gain 1 Favor.",
    text: "SOVEREIGN. Veiled: Whenever a friendly Motley Figure Cashes, gain 1 Sight. Revelation: Free Wager this. If you control 2 or more Wagered Motley Figures, gain 1 Eclipse and gain 1 Favor. While Witnessed: Cash 2+ this Resolve → Eclipse. Fall: Gain 1 Sight.",
  },
  {
    id: "blindfold_charm",
    name: "Blindfold Charm",
    heresy: "motley",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "motley masquerade blindfold charm graft purple teal gold silk eye seal floating ornate cliffs original",
    text: "Graft: +1 power while host Witnessed. When you Blind an altitude while host is Wagered, gain 1 Sight. If that altitude is Mid, also gain 1 Favor.",
  },
  {
    id: "carnival_urn",
    name: "Carnival Urn",
    heresy: "motley",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "motley masquerade carnival urn vessel purple teal gold ribbon mask chamber ornate cliffs original",
    revelation: "Switch Stance; Free Wager another Motley.",
    veiledAbility: "You may Wager this (ante 1 Sight).",
    text: "Vessel. On play, tuck the Figure on this lane if able, else tuck from hand. You may Wager this (ante 1 Sight). Revelation: Switch Stance; Free Wager another Motley. Fall: If you have Favor, gain 1 Sight.",
  },
  {
    id: "antewell",
    name: "Antewell",
    heresy: "motley",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "motley masquerade antewell shrine purple teal gold coin well landmark ornate cliffs original",
    text: "Site. When a friendly Figure here Busts, gain 1 Favor. Your Wagered Figures here have +1 power.",
  },
  {
    id: "final_raise",
    name: "Final Raise",
    heresy: "motley",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "motley masquerade final raise rite purple teal gold chips stack parchment ornate cliffs original",
    text: "Choose an altitude. If your Motley there is Wagered: spend 1 Favor to gain 1 Eclipse; if you cannot, gain 1 Sight. Otherwise Wager it (ante 1 Sight) if able; if you cannot, gain 1 Sight.",
  },
];

export const MOTLEY_MASQUERADE_WAVE4_RITE_IDS = new Set(["final_raise"]);
