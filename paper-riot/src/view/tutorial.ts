/** Interactive first-run tutorial for Paper Riot. */

export type TutorialAction =
  | "next"
  | "swap"
  | "goals"
  | "power"
  | "done";

export type TutorialStep = {
  title: string;
  lines: string[];
  action: TutorialAction;
  hint: string;
};

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: "WELCOME",
    lines: [
      "Paper Riot is a sticker match-3.",
      "Swap neighbors, rip matches of 3+, clear the goals.",
      "Follow the pointing hand — it shows what to do.",
    ],
    action: "next",
    hint: "Tap NEXT when the hand points to it",
  },
  {
    title: "SWAP",
    lines: [
      "Swipe a sticker into a neighbor — or tap one, then tap next to it.",
      "Only adjacent stickers can swap.",
      "Try a swipe on the board now.",
    ],
    action: "swap",
    hint: "Swipe with the hand across two stickers",
  },
  {
    title: "MATCH",
    lines: [
      "Three+ matching stickers in a line rip off the desk.",
      "Cascades can chain — watch for noice!",
      "A bad swap costs a move and bounces back.",
    ],
    action: "next",
    hint: "Tap NEXT — follow the hand",
  },
  {
    title: "GOALS",
    lines: [
      "Each level has goals at the top of the board.",
      "Collect stickers or peel tape before moves run out.",
      "Clear every goal to finish the level.",
    ],
    action: "goals",
    hint: "Look where the hand points — then tap NEXT",
  },
  {
    title: "POWERS",
    lines: [
      "Power stickers live under the board.",
      "Tap a charged power, then tap a sticker to use it.",
      "Arm the bomb the hand is pointing at.",
    ],
    action: "power",
    hint: "Tap the bomb — follow the hand",
  },
  {
    title: "READY",
    lines: [
      "MENU pauses. VOLUME cycles mute → low → med → high.",
      "You're set — rip the desk.",
    ],
    action: "done",
    hint: "Tap DONE when the hand points to it",
  },
] as const;

const TUT_KEY = "paper-riot-tutorial-v1";

export function isTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(TUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setTutorialCompleted(): void {
  try {
    localStorage.setItem(TUT_KEY, "1");
  } catch {
    /* ignore */
  }
}
