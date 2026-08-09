import { INK_CURRICULUM } from "./crafts/ink";
import { MOTLEY_CURRICULUM } from "./crafts/motley";
import { TOLL_CURRICULUM } from "./crafts/toll";
import { BREACH_CURRICULUM } from "./crafts/breach";
import type { Curriculum, LessonDef, TutorialId } from "./types";

export const CRAFT_CURRICULA: Curriculum[] = [
  INK_CURRICULUM,
  MOTLEY_CURRICULUM,
  TOLL_CURRICULUM,
  BREACH_CURRICULUM,
];

export const TUTORIAL_HUB: {
  id: TutorialId;
  title: string;
  blurb: string;
}[] = [
  {
    id: "first_gaze",
    title: "First Gaze",
    blurb: "Shared Gaze law — anatomy, card types, and a tour of all four heresies.",
  },
  {
    id: "ink",
    title: INK_CURRICULUM.title,
    blurb: INK_CURRICULUM.blurb,
  },
  {
    id: "motley",
    title: MOTLEY_CURRICULUM.title,
    blurb: MOTLEY_CURRICULUM.blurb,
  },
  {
    id: "toll",
    title: TOLL_CURRICULUM.title,
    blurb: TOLL_CURRICULUM.blurb,
  },
  {
    id: "breach",
    title: BREACH_CURRICULUM.title,
    blurb: BREACH_CURRICULUM.blurb,
  },
];

const BY_ID: Record<Exclude<TutorialId, "first_gaze">, Curriculum> = {
  ink: INK_CURRICULUM,
  motley: MOTLEY_CURRICULUM,
  toll: TOLL_CURRICULUM,
  breach: BREACH_CURRICULUM,
};

export function getCurriculum(id: Exclude<TutorialId, "first_gaze">): Curriculum {
  return BY_ID[id];
}

export function isCraftTutorialId(id: TutorialId | null | undefined): id is Exclude<TutorialId, "first_gaze"> {
  return id === "ink" || id === "motley" || id === "toll" || id === "breach";
}

export type LessonHit = {
  curriculum: Curriculum;
  lesson: LessonDef;
  index: number;
};

/** Craft lesson ids are unique across curricula (prefixed). */
export function findLessonByStep(step: string): LessonHit | null {
  for (const curriculum of CRAFT_CURRICULA) {
    const index = curriculum.lessons.findIndex((l) => l.id === step);
    if (index >= 0) {
      return { curriculum, lesson: curriculum.lessons[index], index };
    }
  }
  return null;
}

export function craftLessonIds(): string[] {
  return CRAFT_CURRICULA.flatMap((c) => c.lessons.map((l) => l.id));
}
