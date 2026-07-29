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
      "No timer — twist until every face matches.",
      "Your puzzle progress is saved automatically.",
    ],
    action: "next",
    hint: "Follow the pointing hand — tap NEXT",
  },
  {
    title: "THE GOAL",
    lines: [
      "Each face wants one matching sticker kind.",
      "Keep twisting until all six faces are solid sets.",
      "Coming back later? Play resumes where you left off.",
    ],
    action: "next",
    hint: "Hand points to NEXT — tap it",
  },
  {
    title: "SWIPE",
    lines: [
      "Drag across a row or column on the front face.",
      "Longer drags move more stickers along the belt.",
      "Try it now — swipe any row or column.",
    ],
    action: "swipe",
    hint: "Swipe where the hand is moving on the cube",
  },
  {
    title: "SPIN FACE",
    lines: [
      "The CW and CCW buttons turn the whole front face.",
      "Use them when you want to rotate that face in place.",
      "Tap CW or CCW below the cube.",
    ],
    action: "faceTurn",
    hint: "Tap the button the hand is pointing at",
  },
  {
    title: "ORBIT",
    lines: [
      "Peek at other faces with the arrows around the cube.",
      "You can also drag in the empty space beside the cube.",
      "Turn the cube to work on another side.",
    ],
    action: "orbit",
    hint: "Tap the arrow the hand is pointing at",
  },
  {
    title: "YOUR STICKERS",
    lines: [
      "Icons are yours — scramble never changes them.",
      "Each theme keeps its own stickers and puzzle progress.",
      "Open STICKERS now to see the chooser.",
    ],
    action: "stickers",
    hint: "Tap STICKERS — follow the hand",
  },
  {
    title: "SCRAMBLE",
    lines: [
      "SCRAMBLE mixes the cube for a fresh puzzle.",
      "Your six sticker icons stay exactly the same.",
      "Tap SCRAMBLE to try it.",
    ],
    action: "scramble",
    hint: "Tap SCRAMBLE — follow the hand",
  },
  {
    title: "READY",
    lines: [
      "HINT draws a suggested move (toggle in Settings).",
      "MENU opens themes and more.",
      "You're set — go solve it.",
    ],
    action: "next",
    hint: "Tap DONE when the hand points to it",
  },
] as const;
