import { Kind, rotateOri } from "./cellKind";
import type { TurnResult } from "./beamSolver";
import { solve } from "./networkSolver";
import { cloneGrid, getCell, getTable, inBounds, type GridState } from "./gridState";
import { buildState, type LevelData, type MoveStep } from "./levelData";
import { rotateTable, setTableRotation } from "./rotateOps";
import { rotateBoard } from "./boardTurn";

export type PuzzleSession = {
  level: LevelData;
  state: GridState;
  initial: GridState;
  /** Display / win result — beams only after a successful PULSE. */
  result: TurnResult;
  /** Always the current board solve (even when beams are hidden). */
  latent: TurnResult;
  moves: number;
  undosRemaining: number;
  pulsesUsed: number;
  /** True after PULSE until the next rotate/undo/reset. */
  beamsVisible: boolean;
  selectedTable: number;
  history: GridState[];
  prevLit: Set<string>;
};

function key(p: { x: number; y: number }): string {
  return `${p.x},${p.y}`;
}

function blankResult(): TurnResult {
  return {
    beams: [],
    energizedReceivers: [],
    spillReceivers: [],
    won: false,
    moveApplied: false,
    tableId: -1,
    deltaQ: 0,
    newlyLitReceivers: [],
    events: [],
  };
}

function annotate(session: PuzzleSession, r: TurnResult): void {
  r.newlyLitReceivers = [];
  const now = new Set<string>();
  for (const p of r.energizedReceivers) {
    const k = key(p);
    now.add(k);
    if (!session.prevLit.has(k)) r.newlyLitReceivers.push(p);
  }
  session.prevLit = now;
}

function hideBeams(session: PuzzleSession): void {
  session.beamsVisible = false;
  const blank = blankResult();
  blank.moveApplied = session.result.moveApplied;
  blank.tableId = session.result.tableId;
  blank.deltaQ = session.result.deltaQ;
  session.result = blank;
}

function syncLatent(session: PuzzleSession): void {
  session.latent = solve(session.state);
  session.latent.won = false;
}

function pushHistory(session: PuzzleSession): void {
  session.history.push(cloneGrid(session.state));
}

export function loadLevel(level: LevelData): PuzzleSession {
  const normalized: LevelData = {
    ...level,
    tokenBudget: level.tokenBudget ?? 0,
  };
  const initial = buildState(normalized);
  const state = cloneGrid(initial);
  const session: PuzzleSession = {
    level: normalized,
    state,
    initial,
    result: blankResult(),
    latent: solve(state),
    moves: 0,
    // Undo is unlimited: only verification is rationed.
    undosRemaining: Number.POSITIVE_INFINITY,
    pulsesUsed: 0,
    beamsVisible: false,
    selectedTable: -1,
    history: [],
    prevLit: new Set(),
  };
  session.latent.won = false;
  return session;
}

export function restart(session: PuzzleSession): void {
  Object.assign(session, loadLevel(session.level));
}

export function canUndo(session: PuzzleSession): boolean {
  return session.history.length > 0;
}

export function undo(session: PuzzleSession): void {
  if (!canUndo(session)) return;
  session.state = session.history.pop()!;
  session.moves = Math.max(0, session.moves - 1);
  session.undosRemaining -= 1;
  syncLatent(session);
  hideBeams(session);
  session.result.moveApplied = false;
}

export function selectTable(session: PuzzleSession, id: number): void {
  if (getTable(session.state, id)) session.selectedTable = id;
}

export function pulsesRemaining(session: PuzzleSession): number {
  const lim = session.level.pulseLimit > 0 ? session.level.pulseLimit : 3;
  return Math.max(0, lim - session.pulsesUsed);
}

export function canPulse(session: PuzzleSession): boolean {
  return !session.result.won && pulsesRemaining(session) > 0;
}

/** Fire beams: spend one pulse, reveal routing, and allow win. */
export function pulse(session: PuzzleSession): boolean {
  if (!canPulse(session)) return false;
  session.pulsesUsed += 1;
  const r = solve(session.state);
  session.latent = { ...r, won: false };
  session.beamsVisible = true;
  session.result = r;
  annotate(session, session.result);
  return true;
}

export function tryRotate(session: PuzzleSession, tableId: number, deltaQ: number): boolean {
  if (session.result.won) return false;
  if (!getTable(session.state, tableId)) return false;
  pushHistory(session);
  if (!rotateTable(session.state, tableId, deltaQ)) {
    session.history.pop();
    return false;
  }
  session.moves += 1;
  session.selectedTable = tableId;
  syncLatent(session);
  hideBeams(session);
  session.result.moveApplied = true;
  session.result.tableId = tableId;
  session.result.deltaQ = deltaQ;
  return true;
}

/** Commit absolute quarter after drag-snap (counts as one move if changed). */
export function commitRotationQ(session: PuzzleSession, tableId: number, rotationQ: number): boolean {
  if (session.result.won) return false;
  const table = getTable(session.state, tableId);
  if (!table || table.locked) return false;
  const next = ((rotationQ % 4) + 4) % 4;
  if (next === table.rotationQ) {
    syncLatent(session);
    if (!session.beamsVisible) hideBeams(session);
    return false;
  }
  pushHistory(session);
  const prevQ = table.rotationQ;
  setTableRotation(session.state, tableId, next);
  if (table.link) {
    const partner = getTable(session.state, table.link.partner);
    if (partner && !partner.locked) {
      const d = ((next - prevQ) % 4 + 4) % 4;
      setTableRotation(session.state, partner.id, partner.rotationQ + d * table.link.sign);
    }
  }
  session.moves += 1;
  session.selectedTable = tableId;
  syncLatent(session);
  hideBeams(session);
  session.result.moveApplied = true;
  session.result.tableId = tableId;
  let dq = ((next - prevQ) % 4 + 4) % 4;
  if (dq === 3) dq = -1;
  session.result.deltaQ = dq;
  return true;
}

/** Cycle a player-rotatable triangle (MIRROR with phase===1). */
export function tryRotateTriangle(session: PuzzleSession, x: number, y: number, deltaQ = 1): boolean {
  if (session.result.won) return false;
  if (!inBounds(session.state, x, y)) return false;
  const c = getCell(session.state, x, y);
  if (c.kind !== Kind.MIRROR || (c.phase ?? 0) !== 1) return false;
  pushHistory(session);
  c.ori = rotateOri(c.ori, deltaQ);
  session.moves += 1;
  session.selectedTable = -1;
  syncLatent(session);
  hideBeams(session);
  session.result.moveApplied = true;
  session.result.tableId = -1;
  session.result.deltaQ = deltaQ;
  return true;
}

/**
 * Rotate the whole board ±90°. Disc rotationQ stays world-fixed so the turn
 * rearranges which disc orientations complete each route.
 */
export function tryBoardTurn(session: PuzzleSession, deltaQ: number): boolean {
  if (session.result.won) return false;
  const steps = ((deltaQ % 4) + 4) % 4;
  if (steps === 0) return false;
  pushHistory(session);
  rotateBoard(session.state, deltaQ);
  session.level = {
    ...session.level,
    width: session.state.width,
    height: session.state.height,
  };
  session.moves += 1;
  session.selectedTable = -1;
  syncLatent(session);
  hideBeams(session);
  session.result.moveApplied = true;
  session.result.tableId = -3;
  session.result.deltaQ = deltaQ;
  return true;
}

/** Replay one authored solution step (rotate / triangle / board turn). */
export function applySolutionStep(session: PuzzleSession, step: MoveStep): boolean {
  if (step.tableId === -1) {
    if (step.x === undefined || step.y === undefined) return false;
    return tryRotateTriangle(session, step.x, step.y, step.delta || 1);
  }
  if (step.tableId === -3) {
    return tryBoardTurn(session, step.delta || 1);
  }
  return tryRotate(session, step.tableId, step.delta);
}

export function previewSolve(session: PuzzleSession, tableId: number, rotationQ: number): TurnResult {
  const map = new Map<number, number>([[tableId, ((rotationQ % 4) + 4) % 4]]);
  return solve(session.state, map);
}

/**
 * Verification is the only scarce resource, so score on pulses spent.
 * Turning discs and undoing are free — thinking should never cost the player.
 */
export function stars(session: PuzzleSession): number {
  if (!session.result.won) return 0;
  if (session.pulsesUsed <= 1) return 3;
  if (session.pulsesUsed === 2) return 2;
  return 1;
}

/** Out of pulses with the circuit still open — the attempt is over. */
export function isFailed(session: PuzzleSession): boolean {
  return !session.result.won && pulsesRemaining(session) === 0;
}
