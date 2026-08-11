import type { CardDef } from "./types";

/**
 * Velvet Ruin — Wave 1 (Devour: Tempt · Brand · Devour).
 * Cast: all ♀ demons — elegant Liaison, near-human Vow, inhuman Spire Hunger.
 * Names avoid Usher/Bride/Cantor/Shrine/Sever formulas.
 * Art DNA: thorned veil + horn-ring — placeholders until install.
 */
export const VELVET_RUIN_WAVE1: CardDef[] = [
  {
    id: "thorn_liaison",
    name: "Thorn Liaison",
    heresy: "ruin",
    type: "figure",
    essence: 2,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — elegant female demon predator horns thorned veil clawed beauty evil seductive frightening NOT Motley court, unique thorned-veil horn-ring liaison inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    veiledAbility: "Enemy Witness into this altitude costs +1 Sight unless the target is Tempted.",
    revelation: "Tempt the enemy Figure here if able.",
    text: "Veiled 2 / Witnessed 3. Veiled: Enemy Witness into this altitude costs +1 Sight unless the target is Tempted. Revelation: Tempt the enemy Figure here if able.",
  },
  {
    id: "crimson_vow",
    name: "Crimson Vow",
    heresy: "ruin",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — near-human female succubus extra sexy seductive evil frightening horns void eyes thorn crown NOT Motley court NOT exaggerated bust, unique thorned-veil horn-ring vow inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    veiledAbility: "Whenever an enemy Figure becomes Branded anywhere, gain 1 Sight.",
    revelation: "Tempt the enemy Figure on Mid if able; otherwise Brand a Witnessed enemy Figure here if able.",
    text: "Veiled 2 / Witnessed 4. Veiled: Whenever an enemy Figure becomes Branded anywhere, gain 1 Sight. Revelation: Tempt the enemy Figure on Mid if able; otherwise Brand a Witnessed enemy Figure here if able.",
  },
  {
    id: "spire_hunger",
    name: "Spire Hunger",
    heresy: "ruin",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — fully inhuman female demon High hunger multi-horn void maw frightening sexy wrong beauty NOT human face, unique thorned-veil horn-ring spire inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    veiledAbility: "While on High, Tempted enemy Figures elsewhere cost 0 Sight to Witness.",
    revelation: "If on High, Brand a Tempted enemy Figure if able.",
    text: "Veiled 2 / Witnessed 4. Veiled: While on High, Tempted enemy Figures elsewhere cost 0 Sight to Witness. Revelation: If on High, Brand a Tempted enemy Figure if able. While a Branded enemy is on High: your Devour against that Figure deals +1 Will.",
  },
  {
    id: "desire_altar",
    name: "Desire Altar",
    heresy: "ruin",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 1,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — landmark desire altar thorned veil horn rings void offering cliff night, unique thorned-veil horn-ring altar inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    text: "+1 Sight/turn. The first Tempt you place on an enemy Figure here each window costs 0 and does not spend your once-per-window Tempt action.",
  },
  {
    id: "unwrite_the_sin",
    name: "Unwrite the Sin",
    heresy: "ruin",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — rite icon unwriting thorn brand seal horn-ring Eye void, unique thorned-veil horn-ring rite inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    text: "Choose an altitude. If an enemy there is Branded: clear Brand; gain 2 Sight. Else if an enemy there is Witnessed: Blind that altitude this turn.",
  },
];

export const VELVET_RUIN_WAVE1_RITE_IDS = ["unwrite_the_sin"];
