/** Interactive on-cube tutorial steps. */

export type TutorialAction =
  | "next"
  | "swipe"
  | "faceTurn"
  | "orbit"
  | "scramble"
  | "stickers";

export type TutorialStep = {
  title: string;
  lines: string[];
  /** What the player must do to continue. */
  action: TutorialAction;
  /** Coach hint under the card. */
  hint: string;
};

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: "WELCOME",
    lines: [
      "Riot Cube is a sticker Rubik's Cube.",
      "There is no timer — just twist until you win.",
      "This quick practice will teach the controls.",
    ],
    action: "next",
    hint: "Tap NEXT when you are ready",
  },
  {
    title: "THE GOAL",
    lines: [
      "CLASSIC — make every face one matching sticker.",
      "CLEAR — complete a face to black it out; clear all six.",
      "Pick the mode anytime from Home, Menu, or the moves chip.",
    ],
    action: "next",
    hint: "Tap NEXT to try a swipe",
  },
  {
    title: "SWIPE",
    lines: [
      "Drag across a row or column on the front face.",
      "Longer drags move more stickers along the belt.",
      "Try it now — swipe any row or column.",
    ],
    action: "swipe",
    hint: "Swipe a row or column on the cube",
  },
  {
    title: "SPIN FACE",
    lines: [
      "The CW and CCW buttons turn the whole front face.",
      "Use them when you want to rotate that face in place.",
      "Tap CW or CCW below the cube.",
    ],
    action: "faceTurn",
    hint: "Tap CW or CCW",
  },
  {
    title: "ORBIT",
    lines: [
      "Peek at other faces with the arrows around the cube.",
      "You can also drag in the empty space beside the cube.",
      "Turn the cube to work on another side.",
    ],
    action: "orbit",
    hint: "Tap an arrow or drag beside the cube",
  },
  {
    title: "YOUR STICKERS",
    lines: [
      "Icons are yours — scramble never changes them.",
      "When you open a new theme, you pick six stickers.",
      "Open STICKERS now to see the chooser.",
    ],
    action: "stickers",
    hint: "Tap STICKERS",
  },
  {
    title: "SCRAMBLE",
    lines: [
      "SCRAMBLE mixes the cube for a fresh puzzle.",
      "Your six sticker icons stay exactly the same.",
      "Tap SCRAMBLE to try it.",
    ],
    action: "scramble",
    hint: "Tap SCRAMBLE",
  },
  {
    title: "READY",
    lines: [
      "HINT draws a suggested move (toggle in Settings).",
      "MENU opens themes, mode, and more.",
      "You're set — go solve it.",
    ],
    action: "next",
    hint: "Tap DONE to finish",
  },
] as const;
