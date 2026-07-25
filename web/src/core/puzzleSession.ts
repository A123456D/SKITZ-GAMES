import { solve, type TurnResult } from "./beamSolver";
import { cloneGrid, getTable, type GridState } from "./gridState";
import { buildState, type LevelData } from "./levelData";
import { rotateTable, setTableRotation } from "./rotateOps";

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

export function loadLevel(level: LevelData): PuzzleSession {
  const initial = buildState(level);
  const state = cloneGrid(initial);
  const session: PuzzleSession = {
    level,
    state,
    initial,
    result: blankResult(),
    latent: solve(state),
    moves: 0,
    undosRemaining: level.undoLimit > 0 ? level.undoLimit : 1,
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
  return session.history.length > 0 && session.undosRemaining > 0;
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
  const before = cloneGrid(session.state);
  if (!rotateTable(session.state, tableId, deltaQ)) return false;
  session.history.push(before);
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
  const before = cloneGrid(session.state);
  const prevQ = table.rotationQ;
  setTableRotation(session.state, tableId, next);
  // Geared partner follows the same delta as a single player action.
  if (table.link) {
    const partner = getTable(session.state, table.link.partner);
    if (partner && !partner.locked) {
      let d = ((next - prevQ) % 4 + 4) % 4;
      setTableRotation(session.state, partner.id, partner.rotationQ + d * table.link.sign);
    }
  }
  session.history.push(before);
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

export function previewSolve(session: PuzzleSession, tableId: number, rotationQ: number): TurnResult {
  const map = new Map<number, number>([[tableId, ((rotationQ % 4) + 4) % 4]]);
  return solve(session.state, map);
}

export function stars(session: PuzzleSession): number {
  if (!session.result.won) return 0;
  if (session.moves <= session.level.par) return 3;
  if (session.moves <= session.level.par + 2) return 2;
  return 1;
}
