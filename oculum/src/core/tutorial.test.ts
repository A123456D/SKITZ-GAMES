import { describe, expect, it } from "vitest";
import { createMatch, applyIntent, legalIntents } from "./match";
import {
  TUTORIAL_LESSONS,
  CRAFT_CURRICULA,
  findLessonByStep,
  isTutorialSoftPass,
  isTutorialDemoStep,
  prepareTutorialStep,
  tutorialCoach,
  tutorialDemoBeats,
  tutorialShowsCard,
  tutorialTeachCard,
} from "./tutorial";
import { START_WILL } from "./types";

describe("First Gaze tutorial", () => {
  it("soft-advances the full curriculum to done", () => {
    const s = createMatch({ tutorial: true, seed: 1 });
    expect(s.tutorialId).toBe("first_gaze");
    expect(s.tutorialStep).toBe("intro");
    expect(isTutorialSoftPass("intro")).toBe(true);
    expect(s.enemyWill).toBe(START_WILL);

    for (const step of TUTORIAL_LESSONS) {
      expect(s.tutorialStep).toBe(step);
      expect(isTutorialSoftPass(step)).toBe(true);
      if (tutorialShowsCard(step)) {
        expect(tutorialTeachCard(step)).toBeTruthy();
      }
      const pass = legalIntents(s).find((i) => i.kind === "pass");
      expect(pass).toBeTruthy();
      expect(legalIntents(s).every((i) => i.kind === "pass")).toBe(true);
      applyIntent(s, { kind: "pass" });
    }

    expect(s.tutorialStep).toBe("done");
  });

  it("stages type lessons and heresy demo tableaux", () => {
    const s = createMatch({ tutorial: true, seed: 2 });
    const advanceTo = (target: string) => {
      for (let i = 0; i < 40 && s.tutorialStep !== target && s.tutorialStep !== "done"; i++) {
        applyIntent(s, { kind: "pass" });
      }
    };

    advanceTo("types_vessel");
    expect(s.tutorialStep).toBe("types_vessel");
    expect(s.altitudes[0].player?.cardId).toBe("gulf_urn");

    advanceTo("demo_ink");
    expect(isTutorialDemoStep("demo_ink")).toBe(true);
    expect(tutorialDemoBeats("demo_ink").length).toBeGreaterThanOrEqual(3);
  });

  it("prepareTutorialStep freezes a readable Site tableau", () => {
    const s = createMatch({ tutorial: true, seed: 3 });
    s.tutorialStep = "types_site";
    prepareTutorialStep(s);
    expect(s.altitudes[1].playerSite).toBe("stainwell");
    expect(tutorialTeachCard("types_site")).toBe("stainwell");
  });
});

describe("Craft Teach curricula", () => {
  it("registers four full heresy curricula with Gaze + kit lessons", () => {
    expect(CRAFT_CURRICULA.map((c) => c.id)).toEqual(["ink", "motley", "toll", "breach"]);
    for (const c of CRAFT_CURRICULA) {
      expect(c.lessons.length).toBeGreaterThanOrEqual(25);
      expect(c.lessons[0].id).toMatch(new RegExp(`^${c.id}_`));
      const kit = c.lessons.find((l) => /kit/i.test(l.id) || /kit/i.test(l.coach.body));
      expect(kit).toBeTruthy();
      const demo = c.lessons.find((l) => l.demoBeats && l.demoBeats.length >= 3);
      expect(demo).toBeTruthy();
      const ids = new Set(c.lessons.map((l) => l.id));
      expect(ids.size).toBe(c.lessons.length);
    }
  });

  it.each(["ink", "motley", "toll", "breach"] as const)(
    "soft-advances %s Teach to done with coach on every step",
    (id) => {
      const s = createMatch({ tutorial: true, tutorialId: id, seed: 10 });
      expect(s.tutorialId).toBe(id);
      expect(s.tutorialStep.startsWith(`${id}_`)).toBe(true);

      let guard = 0;
      while (s.tutorialStep !== "done" && guard < 120) {
        const step = s.tutorialStep;
        expect(isTutorialSoftPass(step)).toBe(true);
        const coach = tutorialCoach(step);
        expect(coach).toBeTruthy();
        expect(coach!.body.length).toBeGreaterThan(40);
        expect(coach!.cta).toBeTruthy();
        if (isTutorialDemoStep(step)) {
          expect(tutorialDemoBeats(step).length).toBeGreaterThanOrEqual(1);
        }
        const hit = findLessonByStep(step);
        expect(hit?.curriculum.id).toBe(id);
        expect(legalIntents(s).every((i) => i.kind === "pass")).toBe(true);
        applyIntent(s, { kind: "pass" });
        guard += 1;
      }
      expect(s.tutorialStep).toBe("done");
      expect(guard).toBeGreaterThanOrEqual(25);
    },
  );
});
