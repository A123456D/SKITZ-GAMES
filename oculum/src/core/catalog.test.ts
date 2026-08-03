import { describe, expect, it } from "vitest";
import { catalogOrder, compareCardCatalog } from "./catalog";
import { getCard } from "./cards";

describe("catalog order", () => {
  it("sorts School → premium → Type → Essence → name", () => {
    const ids = catalogOrder([
      "ring_gaze",
      "iris_heliograph",
      "parasol_path",
      "cliff_seeker",
      "split_gaze_seraph",
      "echo_mask",
      "unblinking_law",
    ]);
    expect(ids).toEqual([
      "cliff_seeker", // cube
      "split_gaze_seraph", // many premium first
      "echo_mask", // many
      "iris_heliograph", // ring premium
      "parasol_path", // ring site 2e
      "ring_gaze", // ring site 3e
      "unblinking_law", // neutral last
    ]);
  });

  it("premium sorts before non-premium in same school", () => {
    expect(compareCardCatalog(getCard("iris_heliograph"), getCard("parasol_path"))).toBeLessThan(0);
    expect(compareCardCatalog(getCard("split_gaze_seraph"), getCard("echo_mask"))).toBeLessThan(0);
  });
});
