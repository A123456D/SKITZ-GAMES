import { describe, expect, it } from "vitest";
import { CAMPAIGN_NODES, computeNodeStars, nextCampaignNode } from "./campaign";
import { buildDailyChallenge, formatShareCard } from "./daily";
import { cloneDeck } from "./deck";
import { passTurn, startCampaignNode, startDaily } from "./match";

describe("campaign depth", () => {
  it("has 8 authored nodes with modifiers and rewards", () => {
    expect(CAMPAIGN_NODES.length).toBe(8);
    for (const n of CAMPAIGN_NODES) {
      expect(n.modifierLabel.length).toBeGreaterThan(0);
      expect(n.reward.label.length).toBeGreaterThan(0);
      expect(["easy", "normal", "hard"]).toContain(n.aiDifficulty);
    }
  });

  it("chains next nodes and applies match modifiers", () => {
    expect(nextCampaignNode("d1_spark")?.id).toBe("d1_overthrow");
    const state = startCampaignNode("d1_relay", () => 0.2);
    expect(state.mode).toBe("campaign");
    expect(state.playsLeft).toBe(3);
    expect(state.aiDifficulty).toBe("normal");
    expect(state.enemyEnergyBonus).toBe(1);
    expect(state.maxRoundsOverride).toBe(3);
  });

  it("rates stars from lead and chain", () => {
    expect(computeNodeStars({ won: true, playerScore: 10, enemyScore: 9, maxChainDepth: 1 })).toBe(1);
    expect(computeNodeStars({ won: true, playerScore: 14, enemyScore: 8, maxChainDepth: 1 })).toBe(2);
    expect(computeNodeStars({ won: true, playerScore: 14, enemyScore: 8, maxChainDepth: 3 })).toBe(3);
    expect(computeNodeStars({ won: false, playerScore: 20, enemyScore: 0, maxChainDepth: 4 })).toBe(0);
  });

  it("survive_rounds clears only after the player reaches the target round", () => {
    const state = startCampaignNode("d1_relay", () => 0.2);
    expect(state.objective).toMatchObject({ kind: "survive_rounds", target: 3 });

    passTurn(state); // player round 1
    expect(state.phase).toBe("ai_thinking");
    passTurn(state); // enemy round 1 → round 2
    expect(state.round).toBe(2);
    expect(state.phase).toBe("playing");
    expect(state.phase).not.toBe("match_over");

    passTurn(state); // player round 2
    expect(state.phase).toBe("ai_thinking");
    passTurn(state); // enemy round 2 → player reaches round 3 → win
    expect(state.round).toBe(3);
    expect(state.phase).toBe("match_over");
    expect(state.winner).toBe("player");
  });
});

describe("daily depth", () => {
  it("builds deterministic challenges with modifiers", () => {
    const a = buildDailyChallenge("2099-06-15");
    const b = buildDailyChallenge("2099-06-15");
    expect(a).toEqual(b);
    expect(a.plays).toBeGreaterThanOrEqual(3);
    expect(a.plays).toBeLessThanOrEqual(5);
    expect(a.title.length).toBeGreaterThan(0);
    expect(a.archetype.length).toBeGreaterThan(0);
    expect(["easy", "normal", "hard"]).toContain(a.aiDifficulty);

    const state = startDaily("2099-06-15");
    expect(state.mode).toBe("daily");
    expect(state.playsLeft).toBe(a.plays);
    expect(state.aiDifficulty).toBe(a.aiDifficulty);
  });

  it("formats share cards", () => {
    const line = formatShareCard({
      key: "2099-06-15",
      title: "Depth Spike",
      score: 14,
      chain: 3,
      cleared: true,
      streak: 2,
    });
    expect(line).toContain("CLEARED");
    expect(line).toContain("STREAK 2");
  });
});

describe("deck unlocks", () => {
  it("injects unlocked off-preset cards", () => {
    const base = cloneDeck("volt", []);
    const withUnlock = cloneDeck("volt", ["v_corner"]);
    expect(base).not.toContain("v_corner");
    expect(withUnlock).toContain("v_corner");
    expect(withUnlock).toHaveLength(10);
  });
});
