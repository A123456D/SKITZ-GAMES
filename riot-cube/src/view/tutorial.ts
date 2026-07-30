/** Interactive on-cube tutorial steps. */

export type TutorialAction =
  | "next"
  | "swipe"
  | "faceTurn"
  | "peek"
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
    hint: "Swipe with the hand across the cube",
  },
  {
    title: "SPIN FACE",
    lines: [
      "CW and CCW turn the whole front face in place.",
      "Handy when a face is almost solved.",
      "Tap CW or CCW below the cube.",
    ],
    action: "faceTurn",
    hint: "Tap the button the hand is pointing at",
  },
  {
    title: "PEEK",
    lines: [
      "Use the arrows around the cube to peek.",
      "Each tap turns the cube to another face.",
      "Tap the arrow the hand is pointing at.",
    ],
    action: "peek",
    hint: "Tap the orbit arrow — follow the hand",
  },
  {
    title: "ROTATE",
    lines: [
      "You can also drag in empty space to spin the view.",
      "Try the band under the cube — drag sideways.",
      "Release and the cube snaps to a face.",
    ],
    action: "orbit",
    hint: "Drag where the hand is swiping",
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
