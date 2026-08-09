import { describe, expect, it } from "vitest";
import { createMatch, applyIntent } from "./match";
import { chooseAiMove } from "./ai";
import { aiBellwardTollDeck, aiInkAbyssDeck, aiMotleyCourtDeck, fullCraftDeck } from "./decks";
import { getCard } from "./cards";
import { validateConstructedDeck } from "./construct";
import { playBotMatch, shuffleDeckOrder } from "./botSim";

describe("bot sim smoke", () => {
  it("plays a short Ink mirror without throwing", () => {
    const s = createMatch({
      seed: 99,
      deck: aiInkAbyssDeck(),
      enemyDeck: aiInkAbyssDeck(),
    });
    let guard = 200;
    while (s.phase !== "end" && guard-- > 0) {
      applyIntent(s, chooseAiMove(s));
    }
    expect(guard).toBeGreaterThan(0);
  });
});

describe("full craft bot decks", () => {
  it("each live craft AI deck is 20 unique cards incl. Sovereign", () => {
    for (const [h, build] of [
      ["ink", aiInkAbyssDeck],
      ["motley", aiMotleyCourtDeck],
      ["toll", aiBellwardTollDeck],
    ] as const) {
      const d = build();
      expect(d).toHaveLength(20);
      expect(new Set(d).size).toBe(20);
      expect(d.every((id) => getCard(id).heresy === h)).toBe(true);
      expect(d.some((id) => getCard(id).sovereign)).toBe(true);
      expect(validateConstructedDeck(d).ok).toBe(true);
      expect(fullCraftDeck(h)).toEqual(d);
    }
  });

  it("every match seed reshuffles deck order", () => {
    const base = fullCraftDeck("toll");
    const a = shuffleDeckOrder(base, 1);
    const b = shuffleDeckOrder(base, 2);
    expect(a).toHaveLength(20);
    expect(b).toHaveLength(20);
    expect(a.slice().sort()).toEqual(base.slice().sort());
    expect(b.slice().sort()).toEqual(base.slice().sort());
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(base);

    const r1 = playBotMatch({ seed: 1001, player: "toll", enemy: "ink", matchup: "t" });
    const r2 = playBotMatch({ seed: 1002, player: "toll", enemy: "ink", matchup: "t" });
    expect(r1.stalled).toBe(false);
    expect(r2.stalled).toBe(false);
    expect(r1.seed).not.toBe(r2.seed);
  });
});
