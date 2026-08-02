import { describe, expect, it } from "vitest";
import {
  FACTION_SIGIL_CARD,
  SHOWCASE_SIGIL_POS,
  detectSignatureVerb,
  playCard,
  previewPlay,
  signatureHint,
  startShowcaseMatch,
  startTutorial,
} from "./match";

describe("first-session showcase", () => {
  it("deals the faction sigil and seeds a playable board", () => {
    for (const faction of ["volt", "prismatic", "void"] as const) {
      const state = startShowcaseMatch(faction, undefined, () => 0.2);
      expect(state.showcase).toBe(true);
      expect(state.mode).toBe("versus");
      const sigil = FACTION_SIGIL_CARD[faction];
      expect(state.players.player.hand).toContain(sigil);
      const hint = signatureHint(state);
      expect(hint).toBeTruthy();
      expect(hint!.handIndex).toBe(state.players.player.hand.indexOf(sigil));
    }
  });

  it("fires a signature verb when the showcase sigil is placed", () => {
    const state = startShowcaseMatch("volt", "prismatic", () => 0.2);
    const pos = SHOWCASE_SIGIL_POS.volt;
    const hi = state.players.player.hand.indexOf("v_storm");
    expect(hi).toBeGreaterThanOrEqual(0);
    // Storm costs 2; round-1 energy is 2.
    expect(state.energy).toBeGreaterThanOrEqual(2);
    const preview = previewPlay(state, hi, pos);
    expect(preview.ok).toBe(true);
    expect(preview.signatureVerb).toBe("FLOOD");

    const r = playCard(state, hi, pos, { deferTurn: true });
    expect(r.ok).toBe(true);
    expect(r.signatureVerb).toBe("FLOOD");
    expect(state.signatureSeen).toBe(true);
    expect(detectSignatureVerb("v_storm", r.events)).toBe("FLOOD");
  });

  it("void showcase can produce OVERKILL on Phase Invert", () => {
    const state = startShowcaseMatch("void", "volt", () => 0.2);
    const pos = SHOWCASE_SIGIL_POS.void;
    const hi = state.players.player.hand.indexOf("o_invert");
    expect(hi).toBeGreaterThanOrEqual(0);
    const preview = previewPlay(state, hi, pos);
    expect(preview.ok).toBe(true);
    expect(preview.signatureVerb).toBe("OVERKILL");
  });
});

describe("tutorial funnel hooks", () => {
  it("ends tutorial ready for PLAY MATCH handoff", () => {
    const state = startTutorial();
    expect(state.tutorial).toBe(true);
    expect(state.mode).toBe("tutorial");
    expect(state.tutorialStep).toBe(0);
    expect(state.players.player.hand.length).toBe(4);
  });
});
