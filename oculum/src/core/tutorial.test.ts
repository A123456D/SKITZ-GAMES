import { describe, expect, it } from "vitest";
import { createMatch, applyIntent, legalIntents } from "./match";
import { TUTORIAL_LESSONS, isTutorialSoftPass, tutorialShowsCard, tutorialTarget } from "./tutorial";

describe("First Gaze tutorial", () => {
  it("starts on intro and soft-advances through card + HUD beats", () => {
    const s = createMatch({ tutorial: true, seed: 1 });
    expect(s.tutorialStep).toBe("intro");
    expect(isTutorialSoftPass("intro")).toBe(true);
    expect(s.enemyWill).toBe(3);

    for (const step of TUTORIAL_LESSONS) {
      if (!isTutorialSoftPass(step)) break;
      expect(s.tutorialStep).toBe(step);
      if (tutorialShowsCard(step)) {
        expect(tutorialTarget(step).kind).toBe("card");
      }
      const pass = legalIntents(s).find((i) => i.kind === "pass");
      expect(pass).toBeTruthy();
      applyIntent(s, { kind: "pass" });
    }

    expect(s.tutorialStep).toBe("play");
    expect(tutorialTarget("play")).toEqual({ kind: "dom", sel: '.alt-hit[data-alt="1"]' });
    expect(tutorialTarget("hud_will")).toEqual({ kind: "dom", sel: "#willrow" });
    expect(tutorialTarget("hud_sight")).toEqual({ kind: "dom", sel: "#meters .meter.sight" });
    expect(tutorialTarget("hud_eclipse")).toEqual({ kind: "dom", sel: "#willrow .ecl-pip" });
  });

  it("only allows the scripted play on MID", () => {
    const s = createMatch({ tutorial: true, seed: 2 });
    while (s.tutorialStep !== "play") {
      applyIntent(s, { kind: "pass" });
    }
    const legal = legalIntents(s);
    expect(legal.every((i) => i.kind === "play" && i.altitude === 1)).toBe(true);
    expect(s.hand).toEqual(["blot_herald"]);
  });
});
