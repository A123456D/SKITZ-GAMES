import { Kind } from "./cellKind";
import { solve, type TurnResult } from "./beamSolver";
import { cloneGrid, getCell, getTable, inBounds, type GridState } from "./gridState";
import { buildState, type LevelData, type MoveStep } from "./levelData";
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
  /** Tokens still in hand (not sitting on pads). */
  tokensLeft: number;
  /** True after PULSE until the next rotate/undo/reset. */
  beamsVisible: boolean;
  selectedTable: number;
  history: GridState[];
  /** Parallel to history: tokensLeft after each undoable action's prior state. */
  tokenHistory: number[];
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

function countPlacedTokens(state: GridState): number {
  let n = 0;
  for (const c of state.cells) {
    if (c.kind === Kind.PAD && (c.phase ?? 0) === 1) n++;
  }
  return n;
}

function pushHistory(session: PuzzleSession): void {
  session.history.push(cloneGrid(session.state));
  session.tokenHistory.push(session.tokensLeft);
}

export function loadLevel(level: LevelData): PuzzleSession {
  const normalized: LevelData = {
    ...level,
    tokenBudget: level.tokenBudget ?? 0,
  };
  const initial = buildState(normalized);
  const state = cloneGrid(initial);
  const placed = countPlacedTokens(state);
  const budget = normalized.tokenBudget;
  const session: PuzzleSession = {
    level: normalized,
    state,
    initial,
    result: blankResult(),
    latent: solve(state),
    moves: 0,
    undosRemaining: normalized.undoLimit > 0 ? normalized.undoLimit : 1,
    pulsesUsed: 0,
    tokensLeft: Math.max(0, budget - placed),
    beamsVisible: false,
    selectedTable: -1,
    history: [],
    tokenHistory: [],
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
  session.tokensLeft = session.tokenHistory.pop() ?? session.tokensLeft;
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
    session.tokenHistory.pop();
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
      let d = ((next - prevQ) % 4 + 4) % 4;
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

/** Toggle a PHASE_SWITCH (armed ↔ inert). Counts as one move. */
export function tryFlipPhase(session: PuzzleSession, x: number, y: number): boolean {
  if (session.result.won) return false;
  if (!inBounds(session.state, x, y)) return false;
  const c = getCell(session.state, x, y);
  if (c.kind !== Kind.PHASE_SWITCH) return false;
  pushHistory(session);
  c.phase = (c.phase ?? 0) ^ 1;
  session.moves += 1;
  session.selectedTable = -1;
  syncLatent(session);
  hideBeams(session);
  session.result.moveApplied = true;
  session.result.tableId = -1;
  session.result.deltaQ = 0;
  return true;
}

/** Place a held token onto an empty PAD. Counts as one move. */
export function tryPlaceToken(session: PuzzleSession, x: number, y: number): boolean {
  if (session.result.won) return false;
  if (session.tokensLeft <= 0) return false;
  if (!inBounds(session.state, x, y)) return false;
  const c = getCell(session.state, x, y);
  if (c.kind !== Kind.PAD || (c.phase ?? 0) === 1) return false;
  pushHistory(session);
  c.phase = 1;
  session.tokensLeft -= 1;
  session.moves += 1;
  session.selectedTable = -1;
  syncLatent(session);
  hideBeams(session);
  session.result.moveApplied = true;
  session.result.tableId = -1;
  session.result.deltaQ = 0;
  return true;
}

/** Pick a token back up from a PAD. Counts as one move. */
export function tryPickupToken(session: PuzzleSession, x: number, y: number): boolean {
  if (session.result.won) return false;
  if (!inBounds(session.state, x, y)) return false;
  const c = getCell(session.state, x, y);
  if (c.kind !== Kind.PAD || (c.phase ?? 0) !== 1) return false;
  pushHistory(session);
  c.phase = 0;
  session.tokensLeft += 1;
  session.moves += 1;
  session.selectedTable = -1;
  syncLatent(session);
  hideBeams(session);
  session.result.moveApplied = true;
  session.result.tableId = -1;
  session.result.deltaQ = 0;
  return true;
}

/** Tap a PAD: place if empty and holding a token, else pick up if occupied. */
export function tryTogglePad(session: PuzzleSession, x: number, y: number): boolean {
  if (!inBounds(session.state, x, y)) return false;
  const c = getCell(session.state, x, y);
  if (c.kind !== Kind.PAD) return false;
  if ((c.phase ?? 0) === 1) return tryPickupToken(session, x, y);
  return tryPlaceToken(session, x, y);
}

/** Replay one authored solution step (rotate / flip / place). */
export function applySolutionStep(session: PuzzleSession, step: MoveStep): boolean {
  if (step.tableId === -1) {
    if (step.x === undefined || step.y === undefined) return false;
    return tryFlipPhase(session, step.x, step.y);
  }
  if (step.tableId === -2) {
    if (step.x === undefined || step.y === undefined) return false;
    return tryPlaceToken(session, step.x, step.y);
  }
  return tryRotate(session, step.tableId, step.delta);
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
