import { describe, expect, it } from "vitest";
import { applyAiMove } from "./ai";
import {
  advanceTutorialIntro,
  canPlayCard,
  finishCascade,
  playCard,
  startTutorial,
  tutorialHint,
} from "./match";

describe("tutorial teaching", () => {
  it("starts with a loop intro before any play is legal", () => {
    const state = startTutorial();
    const intro = tutorialHint(state)!;
    expect(intro.mode).toBe("intro");
    expect(intro.line.startsWith("HOW IT WORKS|")).toBe(true);
    expect(canPlayCard(state, 0, { col: 1, row: 1 })).toBe(false);

    expect(advanceTutorialIntro(state)).toBe(true);
    expect(state.tutorialStep).toBe(1);
    const h0 = tutorialHint(state)!;
    expect(h0.mode).toBe("play");
    expect(h0.pos).toEqual({ col: 1, row: 1 });
    expect(state.players.player.hand[h0.handIndex!]).toBe("v_swarm2");
  });

  it("locks plays to the coached beat and teaches damage then overthrow", () => {
    const state = startTutorial();
    advanceTutorialIntro(state);
    const h0 = tutorialHint(state)!;
    expect(h0.pos).toEqual({ col: 1, row: 1 });
    expect(state.players.player.hand[h0.handIndex!]).toBe("v_swarm2");
    expect(canPlayCard(state, h0.handIndex!, h0.pos!)).toBe(true);
    expect(canPlayCard(state, h0.handIndex!, { col: 0, row: 0 })).toBe(false);

    const r0 = playCard(state, h0.handIndex!, h0.pos!, { deferTurn: true });
    expect(r0.ok).toBe(true);
    expect(r0.events.some((e) => e.type === "damage")).toBe(true);
    expect(r0.events.some((e) => e.type === "capture")).toBe(false);
    expect(state.board[2][1]?.owner).toBe("enemy");
    expect(state.board[2][1]?.power).toBe(2);
    finishCascade(state);
    expect(state.tutorialStep).toBe(2);

    if (state.phase === "ai_thinking") {
      applyAiMove(state, "easy", Math.random, { pass: true });
    }
    expect(state.phase).toBe("playing");

    const h1 = tutorialHint(state)!;
    expect(h1.pos).toEqual({ col: 1, row: 3 });
    expect(state.players.player.hand[h1.handIndex!]).toBe("n_pulse_n");
    expect(canPlayCard(state, h1.handIndex!, h1.pos!)).toBe(true);

    const r1 = playCard(state, h1.handIndex!, h1.pos!, { deferTurn: true });
    expect(r1.ok).toBe(true);
    expect(r1.events.some((e) => e.type === "capture")).toBe(true);
    expect(state.board[2][1]?.owner).toBe("player");
  });

  it("ends only after the fourth guided play resolves", () => {
    const state = startTutorial();
    advanceTutorialIntro(state);
    for (let step = 0; step < 4; step++) {
      if (state.phase === "ai_thinking") {
        applyAiMove(state, "easy", Math.random, { pass: true });
      }
      expect(state.phase).toBe("playing");
      const hint = tutorialHint(state);
      expect(hint).toBeTruthy();
      expect(hint!.mode).toBe("play");
      const r = playCard(state, hint!.handIndex!, hint!.pos!, { deferTurn: true });
      expect(r.ok).toBe(true);
      finishCascade(state);
    }
    expect(state.phase).toBe("match_over");
    expect(state.tutorialStep).toBe(5);
    expect(state.winner).toBe("player");
  });
});
