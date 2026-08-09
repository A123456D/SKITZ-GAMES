import { describe, expect, it } from "vitest";
import { catalogOrder, compareCardCatalog } from "./catalog";
import { getCard } from "./cards";

describe("catalog order", () => {
  it("sorts Wave 1 Ink by essence → name", () => {
    const ids = catalogOrder([
      "mire_duelist",
      "blot_herald",
      "pale_ledger",
      "smother_bride",
      "well_cantor",
    ]);
    expect(ids[0]).toBe("pale_ledger"); // 1E first
    expect(ids).toContain("blot_herald");
    expect(ids[ids.length - 1]).toBe("smother_bride"); // 3E, name after mire
  });

  it("compareCardCatalog is stable for Wave 1", () => {
    expect(compareCardCatalog(getCard("pale_ledger"), getCard("blot_herald"))).toBeLessThan(0);
  });
});
