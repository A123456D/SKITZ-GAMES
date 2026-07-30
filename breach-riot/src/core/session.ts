import { bufferCost, refreshDaemons } from "./buffer";
import {
  canAfford,
  cloneMatrix,
  generatePuzzle,
  isLegalPick,
  legalPicks,
  mulberry32,
  nextAxis,
  scrambleUnused,
} from "./matrix";
import type {
  Axis,
  DaemonProgress,
  LevelDef,
  Matrix,
  Outcome,
  Pos,
  Token,
} from "./types";

export type Session = {
  level: LevelDef;
  matrix: Matrix;
  buffer: Token[];
  /** Buffer slots remaining (sticky costs 2). */
  remaining: number;
  last: Pos | null;
  axis: Axis;
  daemons: DaemonProgress[];
  picks: Pos[];
  ended: boolean;
  outcome: Outcome | null;
  score: number;
  scrambleAt: number;
  rng: () => number;
  coach: string | null;
};

export function startSession(level: LevelDef): Session {
  const { matrix } = generatePuzzle(level);
  const daemons: DaemonProgress[] = level.daemons.map((d) => ({
    ...d,
    matched: 0,
    completed: false,
  }));
  return {
    level,
    matrix,
    buffer: [],
    remaining: level.buffer,
    last: null,
    axis: null,
    daemons,
    picks: [],
    ended: false,
    outcome: null,
    score: 0,
    scrambleAt: 0,
    rng: mulberry32(level.seed ^ 0x9e3779b9),
    coach: level.twists.coach ?? null,
  };
}

export function currentLegal(session: Session): Pos[] {
  if (session.ended) return [];
  return legalPicks(session.matrix, session.last, session.axis, {
    firstRowOnly: session.level.twists.firstRowOnly,
  }).filter((p) => {
    const kind = session.matrix[p.r]![p.c]!.kind;
    return canAfford(session.remaining, kind);
  });
}

export type PickResult =
  | { ok: true; session: Session; scrambled: Pos[] }
  | { ok: false; reason: string; session: Session };

export function tryPick(session: Session, pos: Pos): PickResult {
  if (session.ended) {
    return { ok: false, reason: "round over", session };
  }
  if (
    !isLegalPick(session.matrix, pos, session.last, session.axis, {
      firstRowOnly: session.level.twists.firstRowOnly,
    })
  ) {
    return { ok: false, reason: "illegal", session };
  }
  const cell = session.matrix[pos.r]![pos.c]!;
  const cost = bufferCost(cell.kind);
  if (session.remaining < cost) {
    return { ok: false, reason: "buffer", session };
  }

  const matrix = cloneMatrix(session.matrix);
  matrix[pos.r]![pos.c]!.used = true;

  const buffer = [...session.buffer, cell.token];
  const remaining = session.remaining - cost;
  const picks = [...session.picks, pos];
  const daemons = refreshDaemons(buffer, session.daemons);
  const axis = nextAxis(picks.length);

  let next: Session = {
    ...session,
    matrix,
    buffer,
    remaining,
    last: pos,
    axis,
    daemons,
    picks,
    coach: null,
  };

  let scrambled: Pos[] = [];
  if (session.level.twists.scramble && !next.ended) {
    next.scrambleAt += 1;
    if (next.scrambleAt % 2 === 0) {
      scrambled = scrambleUnused(next.matrix, next.rng);
    }
  }

  if (remaining === 0 || currentLegal(next).length === 0) {
    next = resolveRound(next);
  }

  return { ok: true, session: next, scrambled };
}

export function confirmEarly(session: Session): Session {
  if (session.ended) return session;
  if (!session.level.twists.earlyConfirm) return session;
  if (session.buffer.length === 0) return session;
  return resolveRound(session);
}

export function resolveRound(session: Session): Session {
  const required = session.daemons.filter((d) => d.required);
  const optional = session.daemons.filter((d) => !d.required);
  const reqDone = required.filter((d) => d.completed).length;
  const optDone = optional.filter((d) => d.completed).length;
  const allReq = required.length > 0 && reqDone === required.length;
  const anyReq = reqDone > 0;

  let outcome: Outcome;
  if (allReq) outcome = "breach";
  else if (anyReq || optDone > 0) outcome = "partial";
  else outcome = "fail";

  const clears = reqDone + optDone;
  let score = reqDone * 100 + optDone * 50;
  // Breach score multiplier after tutorial (level id > 2).
  if (session.level.id > 2 && clears >= 2) {
    score = Math.round(score * (1 + 0.5 * (clears - 1)));
  }

  return {
    ...session,
    ended: true,
    outcome,
    score,
  };
}

/** Stars: 1 = any required, 2 = all required, 3 = all required + all optional. */
export function starsFor(session: Session): number {
  if (!session.outcome || session.outcome === "fail") return 0;
  const required = session.daemons.filter((d) => d.required);
  const optional = session.daemons.filter((d) => !d.required);
  const reqDone = required.every((d) => d.completed);
  const optDone =
    optional.length === 0 || optional.every((d) => d.completed);
  if (reqDone && optDone) return 3;
  if (reqDone) return 2;
  if (required.some((d) => d.completed)) return 1;
  if (session.outcome === "partial") return 1;
  return 0;
}
