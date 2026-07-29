import { describe, it, expect } from "vitest";
import { expectedScore, eloDelta, applyElo, AI_ELO } from "./elo";

describe("elo", () => {
  it("expectedScore is 0.5 for equal ratings", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 5);
  });

  it("underdog gains more on an upset", () => {
    const upset = eloDelta(1000, 1600, 1);
    const favorite = eloDelta(1600, 1000, 1);
    expect(upset).toBeGreaterThan(favorite);
  });

  it("applyElo never drops below 100", () => {
    expect(applyElo(100, 2000, 0)).toBeGreaterThanOrEqual(100);
  });

  it("AI Elo tiers are ordered", () => {
    expect(AI_ELO[1]).toBeLessThan(AI_ELO[2]);
    expect(AI_ELO[2]).toBeLessThan(AI_ELO[3]);
    expect(AI_ELO[3]).toBeLessThan(AI_ELO[4]);
  });
});
