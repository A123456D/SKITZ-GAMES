import type { GameState, Square, Color, Ability, Move } from "../core/types";
import { squareToRC, rcToSquare, isInNexus, NEXUS_SQUARES } from "../core/board";
import { ABILITY_COST } from "../core/abilities";
import { activePlayer } from "../core/types";

const PIECE_CHARS: Record<string, string> = {
  wK: "\u2654", wQ: "\u2655", wR: "\u2656", wB: "\u2657", wN: "\u2658", wP: "\u2659",
  bK: "\u265A", bQ: "\u265B", bR: "\u265C", bB: "\u265D", bN: "\u265E", bP: "\u265F",
};

const LIGHT = "#e8d5b5";
const DARK = "#b58863";
const SELECT_COLOR = "rgba(255,255,100,0.5)";
const MOVE_DOT = "rgba(0,0,0,0.25)";
const CAPTURE_RING = "rgba(200,0,0,0.45)";

export interface DrawCtx {
  ctx: CanvasRenderingContext2D;
  boardX: number;
  boardY: number;
  cellSize: number;
  width: number;
  height: number;
}

export function layout(canvas: HTMLCanvasElement): DrawCtx {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const boardSize = Math.min(w - 20, h - 200, 560);
  const cellSize = boardSize / 8;
  const boardX = (w - boardSize) / 2;
  const boardY = 50;
  return { ctx, boardX, boardY, cellSize, width: w, height: h };
}

export function squareScreenPos(dc: DrawCtx, sq: Square): [number, number] {
  const [rank, file] = squareToRC(sq);
  const x = dc.boardX + file * dc.cellSize;
  const y = dc.boardY + (7 - rank) * dc.cellSize;
  return [x, y];
}

export function screenToSquare(dc: DrawCtx, px: number, py: number): Square | null {
  const file = Math.floor((px - dc.boardX) / dc.cellSize);
  const rank = 7 - Math.floor((py - dc.boardY) / dc.cellSize);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return rcToSquare(rank, file);
}

function drawNexusGlow(dc: DrawCtx, time: number) {
  const { ctx, cellSize } = dc;
  const pulse = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * 3));
  for (const sq of NEXUS_SQUARES) {
    const [x, y] = squareScreenPos(dc, sq);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cellSize * 0.7);
    grad.addColorStop(0, `rgba(255,200,50,${pulse})`);
    grad.addColorStop(0.5, `rgba(100,160,255,${pulse * 0.5})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - cellSize * 0.2, y - cellSize * 0.2, cellSize * 1.4, cellSize * 1.4);
  }
}

export function drawBoard(
  dc: DrawCtx,
  state: GameState,
  time: number,
  selected: Square | null,
  legalMoves: Move[],
  abilityTargets: Square[],
  activeAbility: Ability | null,
) {
  const { ctx, boardX, boardY, cellSize, width, height } = dc;

  // Background
  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, width, height);

  // Board tiles
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const x = boardX + f * cellSize;
      const y = boardY + (7 - r) * cellSize;
      ctx.fillStyle = (r + f) % 2 === 0 ? DARK : LIGHT;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }

  // Nexus glow
  drawNexusGlow(dc, time);

  // Selection highlight
  if (selected) {
    const [sx, sy] = squareScreenPos(dc, selected);
    ctx.fillStyle = SELECT_COLOR;
    ctx.fillRect(sx, sy, cellSize, cellSize);
  }

  // Legal move indicators
  const legalSet = new Set(legalMoves.map((m) => m.to));
  for (const sq of legalSet) {
    const [x, y] = squareScreenPos(dc, sq);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    if (state.board.has(sq)) {
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.45, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = CAPTURE_RING;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = MOVE_DOT;
      ctx.fill();
    }
  }

  // Ability target highlights
  if (activeAbility) {
    for (const sq of abilityTargets) {
      const [x, y] = squareScreenPos(dc, sq);
      ctx.strokeStyle = "rgba(0,255,200,0.7)";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
    }
  }

  // Pieces
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${cellSize * 0.75}px serif`;
  for (const [sq, piece] of state.board) {
    const [x, y] = squareScreenPos(dc, sq);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;

    // Shield indicator
    if (piece.isShielded) {
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,220,255,0.8)";
      ctx.stroke();
    }

    // Overdrive indicator
    if (state.overdriveSquare === sq) {
      ctx.fillStyle = "rgba(255,220,0,0.3)";
      ctx.fillRect(x, y, cellSize, cellSize);
    }

    const ch = PIECE_CHARS[piece.color + piece.kind];
    ctx.fillStyle = piece.color === "w" ? "#fff" : "#111";
    ctx.strokeStyle = piece.color === "w" ? "#333" : "#ccc";
    ctx.lineWidth = 1;
    ctx.strokeText(ch, cx, cy);
    ctx.fillText(ch, cx, cy);
  }

  // File/rank labels
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#888";
  ctx.textAlign = "center";
  for (let f = 0; f < 8; f++) {
    ctx.fillText(
      "abcdefgh"[f],
      boardX + f * cellSize + cellSize / 2,
      boardY + 8 * cellSize + 14,
    );
  }
  ctx.textAlign = "right";
  for (let r = 0; r < 8; r++) {
    ctx.fillText(
      String(r + 1),
      boardX - 6,
      boardY + (7 - r) * cellSize + cellSize / 2,
    );
  }
}

// ---------- HUD ----------

export interface ButtonRect {
  x: number;
  y: number;
  w: number;
  h: number;
  id: string;
}

export function drawHud(
  dc: DrawCtx,
  state: GameState,
  buttons: ButtonRect[],
  aiEnabled: boolean,
) {
  const { ctx, boardX, boardY, cellSize, width } = dc;
  const hudY = boardY + 8 * cellSize + 28;

  // Mana bars
  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    const label = p.color === "w" ? "White" : "Black";
    const barX = boardX;
    const barY = hudY + i * 32;
    ctx.fillStyle = "#ccc";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${label} Mana:`, barX, barY + 14);

    for (let m = 0; m < 10; m++) {
      const sx = barX + 100 + m * 18;
      ctx.fillStyle = m < p.mana ? "rgba(60,140,255,0.9)" : "rgba(60,60,80,0.5)";
      ctx.fillRect(sx, barY + 2, 14, 16);
      ctx.strokeStyle = "#456";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, barY + 2, 14, 16);
    }
  }

  // Turn info
  const infoY = hudY + 72;
  ctx.fillStyle = "#ddd";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "left";
  const turnLabel = state.activeColor === "w" ? "White" : "Black";
  const phaseLabel = state.turnPhase === "ability"
    ? "Ability Phase"
    : state.turnPhase === "overdrive"
      ? "Overdrive Move"
      : state.turnPhase === "move"
        ? "Move Phase"
        : "Resolving...";
  ctx.fillText(`Turn ${state.turnNumber} — ${turnLabel} — ${phaseLabel}`, boardX, infoY);

  if (aiEnabled) {
    ctx.fillStyle = "#888";
    ctx.font = "12px sans-serif";
    ctx.fillText("AI: Black", boardX + 350, infoY);
  }

  // Ability buttons (during ability phase)
  buttons.length = 0;
  if (state.turnPhase === "ability" && !state.winner) {
    const btnY = infoY + 12;
    const abilities: { id: Ability; label: string; cost: number }[] = [
      { id: "aegis", label: "Aegis", cost: ABILITY_COST.aegis },
      { id: "overdrive", label: "Overdrive", cost: ABILITY_COST.overdrive },
      { id: "tacticalSwap", label: "Tac. Swap", cost: ABILITY_COST.tacticalSwap },
    ];
    const mana = activePlayer(state).mana;

    for (let i = 0; i < abilities.length; i++) {
      const a = abilities[i];
      const bx = boardX + i * 130;
      const bw = 120;
      const bh = 34;
      const canAfford = mana >= a.cost;
      ctx.fillStyle = canAfford ? "rgba(40,120,200,0.8)" : "rgba(40,40,50,0.6)";
      ctx.fillRect(bx, btnY, bw, bh);
      ctx.strokeStyle = canAfford ? "#5af" : "#444";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, btnY, bw, bh);
      ctx.fillStyle = canAfford ? "#fff" : "#666";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${a.label} (${a.cost})`, bx + bw / 2, btnY + bh / 2 + 4);
      buttons.push({ x: bx, y: btnY, w: bw, h: bh, id: a.id });
    }

    // Skip button
    const skipX = boardX + 3 * 130;
    ctx.fillStyle = "rgba(80,80,80,0.7)";
    ctx.fillRect(skipX, btnY, 80, 34);
    ctx.strokeStyle = "#666";
    ctx.strokeRect(skipX, btnY, 80, 34);
    ctx.fillStyle = "#ccc";
    ctx.fillText("Skip", skipX + 40, btnY + 21);
    buttons.push({ x: skipX, y: btnY, w: 80, h: 34, id: "skip" });
  }

  // New Game button
  const ngX = width - 110;
  const ngY = 10;
  ctx.fillStyle = "rgba(60,60,70,0.8)";
  ctx.fillRect(ngX, ngY, 100, 30);
  ctx.strokeStyle = "#888";
  ctx.strokeRect(ngX, ngY, 100, 30);
  ctx.fillStyle = "#ddd";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("New Game", ngX + 50, ngY + 19);
  buttons.push({ x: ngX, y: ngY, w: 100, h: 30, id: "newgame" });

  // AI toggle
  const aiX = width - 220;
  ctx.fillStyle = aiEnabled ? "rgba(40,140,60,0.8)" : "rgba(60,60,70,0.8)";
  ctx.fillRect(aiX, ngY, 100, 30);
  ctx.strokeStyle = "#888";
  ctx.strokeRect(aiX, ngY, 100, 30);
  ctx.fillStyle = "#ddd";
  ctx.fillText(aiEnabled ? "AI: ON" : "AI: OFF", aiX + 50, ngY + 19);
  buttons.push({ x: aiX, y: ngY, w: 100, h: 30, id: "toggleai" });
}

export function drawWinOverlay(dc: DrawCtx, winner: Color) {
  const { ctx, width, height } = dc;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = winner === "w" ? "#fff" : "#aaa";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `${winner === "w" ? "White" : "Black"} Wins!`,
    width / 2,
    height / 2 - 20,
  );
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#bbb";
  ctx.fillText("Click New Game to play again", width / 2, height / 2 + 30);
}
