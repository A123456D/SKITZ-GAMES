import { beforeEach, describe, expect, it, vi } from "vitest";

// Isolate localStorage for analytics tests
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
});

describe("analytics", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  it("tracks funnel rates for turn-1 pass and rematch", async () => {
    const {
      track,
      trackFirstAction,
      getFunnelRates,
      getFunnelStats,
      setAnalyticsEnabled,
      resetMatchAnalytics,
    } = await import("../view/analytics");

    setAnalyticsEnabled(true);
    track("session_open");
    track("match_start", { mode: "versus" });
    resetMatchAnalytics();
    trackFirstAction("pass", 1);

    track("match_finish", { winner: "enemy", chainDepth: 2 });
    track("rematch");
    track("match_start", { mode: "versus" });
    resetMatchAnalytics();
    trackFirstAction("play", 1);
    track("match_finish", { winner: "player", chainDepth: 4 });

    track("faction_pick", { faction: "volt" });
    track("faction_pick", { faction: "void" });
    track("faction_pick", { faction: "volt" });

    const rates = getFunnelRates();
    expect(rates.turn1PassRate).toBeCloseTo(0.5);
    expect(rates.rematchRate).toBeCloseTo(0.5);
    expect(rates.avgChainDepth).toBeCloseTo(3);
    expect(rates.factionShare.volt).toBeCloseTo(2 / 3);

    const s = getFunnelStats();
    expect(s.sessionOpens).toBe(1);
    expect(s.matchFinishes).toBe(2);
  });

  it("ignores events when disabled", async () => {
    const { track, getFunnelStats, setAnalyticsEnabled } = await import("../view/analytics");
    setAnalyticsEnabled(false);
    const before = getFunnelStats().sessionOpens;
    track("session_open");
    expect(getFunnelStats().sessionOpens).toBe(before);
  });
});
