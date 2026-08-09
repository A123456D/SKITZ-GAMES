import type { Altitude, BoardUnit, Intent, MatchState, Side, Heresy } from "../types";

export type TutorialId = "first_gaze" | "ink" | "motley" | "toll" | "breach";

export type TutorialCoach = {
  title: string;
  body: string;
  action: string;
  cta: string | null;
};

export type TutorTarget =
  | { kind: "none" }
  | { kind: "dom"; sel: string }
  | { kind: "card"; anchor: "essence" | "witness" | "power" };

export type TutorDemoBeat = {
  line: string;
  setup?: (state: MatchState) => void;
  acts?: { side: Side; intent: Intent }[];
  cue?: {
    sfx?:
      | "play"
      | "witness"
      | "stain"
      | "strain"
      | "stance"
      | "rite"
      | "resolve"
      | "select"
      | "law"
      | "eclipse"
      | "pass";
    float?: string;
    floatKind?: string;
    altitude?: 0 | 1 | 2;
    toast?: string;
    toastKind?: string;
    focusSel?: string;
  };
};

export type LessonDef = {
  id: string;
  coach: {
    title?: string;
    body: string;
    action: string;
    cta: string | null;
  };
  target?: TutorTarget;
  showsCard?: boolean;
  teachCard?: string;
  caption?: { kicker: string; rules: string };
  prepare?: (state: MatchState) => void;
  demoBeats?: TutorDemoBeat[];
  demoCrafts?: { bottom: Heresy; top: Heresy };
};

export type Curriculum = {
  id: TutorialId;
  title: string;
  blurb: string;
  lessons: LessonDef[];
};

export type { Altitude, BoardUnit, Intent, MatchState, Side, Heresy };
