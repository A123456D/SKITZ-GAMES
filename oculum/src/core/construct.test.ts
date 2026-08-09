import { describe, expect, it } from "vitest";
import { teachDeck, teachDeckMotley } from "./cards";
import {
  CONSTRUCTED_DECK_SIZE,
  buildAutoDeck,
  canAddToDeck,
  validateConstructedDeck,
} from "./construct";

describe("constructed deck validation", () => {
  it("accepts teachDeck as legal Constructed 20", () => {
    const deck = teachDeck();
    expect(deck).toHaveLength(CONSTRUCTED_DECK_SIZE);
    expect(validateConstructedDeck(deck).ok).toBe(true);
  });

  it("accepts Motley Teach (curated Waves 1–4) as legal Constructed 20", () => {
    const deck = teachDeckMotley();
    expect(deck).toHaveLength(CONSTRUCTED_DECK_SIZE);
    expect(validateConstructedDeck(deck).ok).toBe(true);
  });

  it("rejects wrong size, over-copy, unknown", () => {
    expect(validateConstructedDeck(["blot_herald"]).ok).toBe(false);
    expect(
      validateConstructedDeck([
        "blot_herald",
        "blot_herald",
        "blot_herald",
        "blot_herald",
        "blot_herald",
      ]).issues.some((i) => i.code === "copy_limit"),
    ).toBe(true);

    const unknown = [...teachDeck().slice(0, 19), "not_a_card"];
    expect(validateConstructedDeck(unknown).issues.some((i) => i.code === "unknown")).toBe(true);
  });

  it("canAddToDeck respects per-craft copy caps", () => {
    expect(canAddToDeck([], "blot_herald")).toBe(true);
    // Ink craft is complete → copy limit 2
    expect(canAddToDeck(["blot_herald", "blot_herald"], "blot_herald")).toBe(false);
    // Motley craft is complete → copy limit 2
    expect(canAddToDeck(["whitecard_mummer", "whitecard_mummer"], "whitecard_mummer")).toBe(false);
  });

  it("buildAutoDeck returns a legal 20", () => {
    const deck = buildAutoDeck({ seed: 42 });
    expect(deck).toHaveLength(CONSTRUCTED_DECK_SIZE);
    expect(validateConstructedDeck(deck).ok).toBe(true);
    const ink = buildAutoDeck({ seed: 7, heresy: "ink" });
    expect(validateConstructedDeck(ink).ok).toBe(true);
    const motley = buildAutoDeck({ seed: 9, heresy: "motley" });
    expect(validateConstructedDeck(motley).ok).toBe(true);
  });
});
