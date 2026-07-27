import { describe, expect, it } from "vitest";
import { generateLevel } from "./levelGen";
import { buildState } from "./levelData";
import { analyzeNetwork } from "./networkSolver";

/**
 * Generation and analysis both run where the player can feel them: starting a
 * level blocks a tap, and analysis runs every frame. These are loose ceilings —
 * roughly 10x current desktop cost — so they only trip on a real regression.
 */
describe("performance guards", () => {
  it("generates the largest board without stalling", () => {
    const t0 = performance.now();
    const level = generateLevel(20, 1234);
    const ms = performance.now() - t0;
    expect(level.width).toBe(8);
    expect(ms).toBeLessThan(700);
  });

  it("keeps per-frame network analysis cheap", () => {
    const state = buildState(generateLevel(20, 99));
    const runs = 2000;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) analyzeNetwork(state, undefined, true);
    const perCall = ((performance.now() - t0) / runs) * 1000;
    expect(perCall).toBeLessThan(60);
  });
});
