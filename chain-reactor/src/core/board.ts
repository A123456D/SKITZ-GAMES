import { getCard } from "./cards";
import {
  COLS,
  ROWS,
  dirDelta,
  inBounds,
  type BoardCard,
  type Direction,
  type MatchState,
  type Pos,
} from "./types";

export function getCell(board: (BoardCard | null)[][], pos: Pos): BoardCard | null {
  if (!inBounds(pos)) return null;
  return board[pos.row][pos.col];
}

export function setCell(
  board: (BoardCard | null)[][],
  pos: Pos,
  card: BoardCard | null,
): void {
  board[pos.row][pos.col] = card;
}

export function emptyTiles(board: (BoardCard | null)[][]): Pos[] {
  const out: Pos[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!board[row][col]) out.push({ col, row });
    }
  }
  return out;
}

export function isBoardFull(board: (BoardCard | null)[][]): boolean {
  return emptyTiles(board).length === 0;
}

export function scoreFor(
  board: (BoardCard | null)[][],
  owner: "player" | "enemy",
): number {
  let sum = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const c = board[row][col];
      if (c && c.owner === owner) sum += c.power;
    }
  }
  return sum;
}

export function resetActivations(board: (BoardCard | null)[][]): void {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const c = board[row][col];
      if (c) c.activated = false;
    }
  }
}

/** Travel along dir from `from`, skipping empties, until a card or off-board. */
export function findFirstHit(
  board: (BoardCard | null)[][],
  from: Pos,
  dir: Direction,
): { pos: Pos; card: BoardCard } | null {
  const d = dirDelta(dir);
  let cur: Pos = { col: from.col + d.col, row: from.row + d.row };
  while (inBounds(cur)) {
    const card = getCell(board, cur);
    if (card) return { pos: { ...cur }, card };
    cur = { col: cur.col + d.col, row: cur.row + d.row };
  }
  return null;
}

export function controlledCount(
  board: (BoardCard | null)[][],
  owner: "player" | "enemy",
): number {
  let n = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col]?.owner === owner) n++;
    }
  }
  return n;
}

export function defAt(state: MatchState, pos: Pos) {
  const c = getCell(state.board, pos);
  return c ? getCard(c.defId) : null;
}
