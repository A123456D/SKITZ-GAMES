import type { CardDef } from "./types";

/** Scar Breach Wave 4 — closer pack. Procedural placeholders until art. */
export const IRON_BREACH_WAVE4: CardDef[] = [
  {
    id: "skaroth",
    name: "Skaroth",
    heresy: "breach",
    type: "figure",
    essence: 5,
    witnessCost: 3,
    veiledPower: 3,
    witnessedPower: 7,
    sightYield: 0,
    sovereign: true,
    artSubject:
      "Scar Breach open-wound portrait — sovereign skaroth war-titan slag-scar strap bindings eye-brands canyon SOVEREIGN",
    veiledAbility:
      "Whenever a friendly Figure becomes Witnessed, gain 1 Sight. The first time each Resolve you deal Breach Will, this has +1 power until end of that Resolve.",
    revelation:
      "Witness another friendly Veiled Figure paying 1 less Sight (min 0) if able. If you control 2 or more Witnessed Figures after this (including this), deal 1 Will and gain 1 Sight.",
    text: "SOVEREIGN. Veiled: Whenever a friendly Figure becomes Witnessed, gain 1 Sight. The first time each Resolve you deal Breach Will, this has +1 power until end of that Resolve. Revelation: Witness another friendly Veiled Figure paying 1 less Sight (min 0) if able. If you control 2+ Witnessed Figures after this (including this), deal 1 Will and gain 1 Sight. While Witnessed: your other Scar Breach Figures deal +1 Will Breach in addition to shared Breach (up to twice per Resolve). Overexpose: shared; opponent gains 1 Sight. Fall: Gain 1 Sight.",
  },
  {
    id: "eyebrand_charm",
    name: "Eyebrand Charm",
    heresy: "breach",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject: "Scar Breach open-wound — eyebrand charm graft scar-welded iris strap seal",
    text: "Graft: +1 power while host Witnessed. When host wins Resolve while Witnessed, gain 1 Sight.",
  },
  {
    id: "ash_urn",
    name: "Ash Urn",
    heresy: "breach",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject: "Scar Breach open-wound — ash urn vessel slag-scar strap bindings war continuity",
    revelation: "Witness a friendly Veiled Figure for free if able; otherwise gain 2 Sight.",
    text: "Vessel. On play, tuck a Figure from hand as Inhabitant if able. Revelation: Witness a friendly Veiled Figure for free if able; otherwise gain 2 Sight. Fall: Deal 1 Will if you control a Witnessed Figure; otherwise Witness a friendly Veiled Figure for free if able.",
  },
  {
    id: "openwell",
    name: "Openwell",
    heresy: "breach",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject: "Scar Breach open-wound — openwell landmark wound-seam well eye-brand canyon",
    text: "Site. Witnessed Figures here have +1 power. When a friendly Figure here becomes Witnessed, the opponent loses 1 Sight if able.",
  },
  {
    id: "last_breach",
    name: "Last Breach",
    heresy: "breach",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject: "Scar Breach open-wound — last breach rite final scar-seal war edict parchment",
    text: "Choose an altitude with your Figure: if Veiled, Witness it paying 1 less Sight (min 0) — if that Figure Overexposes this Resolve, gain 1 Sight; if Witnessed, deal 2 Will.",
  },
];

export const IRON_BREACH_WAVE4_RITE_IDS = ["last_breach"];
