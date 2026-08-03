import { describe, expect, it } from "vitest";
import { teachDeck } from "./cards";
import {
  CONSTRUCTED_DECK_SIZE,
  buildAutoDeck,
  canAddToDeck,
  validateConstructedDeck,
} from "./construct";

describe("constructed deck validation", () => {
  it("accepts a legal 30 with 2-ofs and one prophecy", () => {
    const deck = [
      "cliff_seeker",
      "cliff_seeker",
      "veil_banner",
      "veil_banner",
      "stake_field_pilgrim",
      "ace_of_hollows",
      "hatline_trickster",
      "third_face",
      "echo_mask",
      "root_chassis",
      "keywright_scarecrow",
      "hole_choir",
      "pale_silence",
      "coral_crown",
      "branch_rune_reliquary",
      "ash_lantern",
      "bone_wick_charm",
      "parasol_path",
      "perforated_abbess",
      "ring_gaze",
      "bell_debt_walker",
      "mire_debtor",
      "ledger_jackal",
      "inkdrip_acolyte",
      "canister_hound",
      "ribbon_bride",
      "saltglass_courier",
      "stake_cache",
      "mesa_bell",
      "unblinking_law",
    ];
    expect(deck).toHaveLength(CONSTRUCTED_DECK_SIZE);
    expect(validateConstructedDeck(deck).ok).toBe(true);
  });

  it("rejects wrong size, 3-ofs, multi-premium, multi-prophecy, unknown", () => {
    expect(validateConstructedDeck(["cliff_seeker"]).ok).toBe(false);
    expect(validateConstructedDeck(["cliff_seeker", "cliff_seeker", "cliff_seeker"]).issues.some((i) => i.code === "copy_limit")).toBe(
      true,
    );

    const twoPremium = [
      "cliff_seeker",
      "cliff_seeker",
      "veil_banner",
      "veil_banner",
      "stake_field_pilgrim",
      "ace_of_hollows",
      "hatline_trickster",
      "third_face",
      "echo_mask",
      "root_chassis",
      "keywright_scarecrow",
      "hole_choir",
      "pale_silence",
      "coral_crown",
      "branch_rune_reliquary",
      "ash_lantern",
      "bone_wick_charm",
      "parasol_path",
      "perforated_abbess",
      "ring_gaze",
      "bell_debt_walker",
      "mire_debtor",
      "ledger_jackal",
      "inkdrip_acolyte",
      "canister_hound",
      "ribbon_bride",
      "saltglass_courier",
      "stake_cache",
      "iris_heliograph",
      "verdant_cataract",
    ];
    expect(validateConstructedDeck(twoPremium).issues.some((i) => i.code === "premium_total")).toBe(true);

    const twoLaw = [...twoPremium.slice(0, 28), "unblinking_law", "shuttered_edict"];
    expect(validateConstructedDeck(twoLaw).issues.some((i) => i.code === "prophecy_total")).toBe(true);

    const unknown = [...twoPremium.slice(0, 29), "not_a_card"];
    expect(validateConstructedDeck(unknown).issues.some((i) => i.code === "unknown")).toBe(true);
  });

  it("teach deck is exactly 30", () => {
    expect(teachDeck()).toHaveLength(30);
  });

  it("canAddToDeck respects copy and premium caps", () => {
    expect(canAddToDeck([], "cliff_seeker")).toBe(true);
    expect(canAddToDeck(["cliff_seeker", "cliff_seeker"], "cliff_seeker")).toBe(false);
    expect(canAddToDeck(["stake_sovereign"], "ember_sovereign")).toBe(false);
    expect(canAddToDeck(["unblinking_law"], "shuttered_edict")).toBe(false);
  });

  it("buildAutoDeck returns a legal 30", () => {
    const deck = buildAutoDeck({ seed: 42 });
    expect(deck).toHaveLength(CONSTRUCTED_DECK_SIZE);
    expect(validateConstructedDeck(deck).ok).toBe(true);
    const cube = buildAutoDeck({ seed: 7, school: "cube" });
    expect(validateConstructedDeck(cube).ok).toBe(true);
  });
});
