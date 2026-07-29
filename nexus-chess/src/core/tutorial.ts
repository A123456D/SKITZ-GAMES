/** First-run interactive tutorial progress (localStorage). */

const TUTORIAL_KEY = "nexus-chess-tutorialCompleted";

export type TutorialStepId =
  | "welcome"
  | "rating"
  | "hub"
  | "color"
  | "start"
  | "select"
  | "move"
  | "nexus"
  | "done";

export interface TutorialStep {
  id: TutorialStepId;
  /** Caption under the arrow. */
  text: string;
  /** Menu/HUD button id to highlight, if any. */
  buttonId?: string;
  /** Board square to highlight, if any. */
  square?: string;
  /** Highlight the nexus 2×2 zone. */
  nexusZone?: boolean;
  /** Show a Got it button instead of waiting for a game action. */
  acknowledge?: boolean;
}

export function isTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function setTutorialCompleted(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Ordered steps. Rating step is skipped at runtime if the player already set Elo. */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    text: "Tap Play to begin",
    buttonId: "home-play",
  },
  {
    id: "rating",
    text: "Pick a rating, then tap Continue",
    buttonId: "elo-save",
  },
  {
    id: "hub",
    text: "Play against the computer",
    buttonId: "menu-vsai",
  },
  {
    id: "color",
    text: "Choose White — you move first",
    buttonId: "color-w",
  },
  {
    id: "start",
    text: "Start your first game",
    buttonId: "opp-start",
  },
  {
    id: "select",
    text: "Tap your pawn on e2",
    square: "e2",
  },
  {
    id: "move",
    text: "Move it to e4",
    square: "e4",
  },
  {
    id: "nexus",
    text: "Hold the Nexus (center) with your King to win — or capture theirs inside it",
    nexusZone: true,
    acknowledge: true,
  },
];

export function nextStepId(
  current: TutorialStepId,
  opts: { hasSetRating: boolean },
): TutorialStepId | "done" {
  const ids = TUTORIAL_STEPS.map((s) => s.id);
  let i = ids.indexOf(current);
  if (i < 0) return "done";
  i += 1;
  while (i < ids.length) {
    const id = ids[i];
    if (id === "rating" && opts.hasSetRating) {
      i += 1;
      continue;
    }
    return id;
  }
  return "done";
}

export function stepById(id: TutorialStepId): TutorialStep | null {
  return TUTORIAL_STEPS.find((s) => s.id === id) ?? null;
}
