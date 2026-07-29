import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  expectedScore,
  eloDelta,
  applyElo,
  eloToDifficulty,
  clampElo,
  setPlayerElo,
  defaultProfile,
} from "./elo";

describe("elo", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
  });

  afterEach(() => {
    // @ts-expect-error test cleanup
    delete globalThis.localStorage;
  });

  it("expectedScore is 0.5 for equal ratings", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 5);
  });

  it("underdog gains more on an upset", () => {
    expect(eloDelta(1000, 1600, 1)).toBeGreaterThan(eloDelta(1600, 1000, 1));
  });

  it("applyElo stays in bounds", () => {
    expect(applyElo(100, 2000, 0)).toBeGreaterThanOrEqual(100);
  });

  it("eloToDifficulty maps rating bands", () => {
    expect(eloToDifficulty(400)).toBe(1);
    expect(eloToDifficulty(1200)).toBe(2);
    expect(eloToDifficulty(1600)).toBe(3);
    expect(eloToDifficulty(2200)).toBe(4);
  });

  it("clampElo snaps to 100s", () => {
    expect(clampElo(1250)).toBe(1300);
    expect(clampElo(1240)).toBe(1200);
  });

  it("setPlayerElo marks rating as set", () => {
    const p = setPlayerElo(defaultProfile(), 1600);
    expect(p.rating).toBe(1600);
    expect(p.hasSetRating).toBe(true);
  });
});
