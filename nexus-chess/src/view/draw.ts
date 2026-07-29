import type { GameState, Square, Color, Ability, Move } from "../core/types";
import { squareToRC, rcToSquare, NEXUS_SQUARES } from "../core/board";
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
  boardSize: number;
  width: number;
  height: number;
  compact: boolean;
  pad: number;
}

export interface ButtonRect {
  x: number;
  y: number;
  w: number;
  h: number;
  id: string;
}

/** Vertical space reserved below the board for HUD (mana + turn + abilities). */
function hudReserve(h: number, compact: boolean): number {
  if (compact) return Math.max(148, Math.min(190, h * 0.34));
  return 180;
}

export function layout(canvas: HTMLCanvasElement): DrawCtx {
  const dpr = window.devicePixelRatio || 1;
  const vv = window.visualViewport;
  const w = Math.floor(vv?.width ?? window.innerWidth);
  const h = Math.floor(vv?.height ?? window.innerHeight);
  const compact = w < 640 || h < 700;

  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pad = compact ? 8 : 16;
  const topBar = compact ? 44 : 50;
  const bottom = hudReserve(h, compact);
  const availW = w - pad * 2;
  const availH = h - topBar - bottom;
  // Cap grows with viewport so desktop isn't a tiny board in a sea of black
  const maxBoard = compact ? 560 : Math.min(720, Math.floor(Math.min(availW, availH)));
  const boardSize = Math.max(160, Math.min(availW, availH, maxBoard));
  const cellSize = boardSize / 8;
  const boardX = (w - boardSize) / 2;
  const boardY = topBar + Math.max(0, (availH - boardSize) / 2);

  return { ctx, boardX, boardY, cellSize, boardSize, width: w, height: h, compact, pad };
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
  const { ctx, boardX, boardY, cellSize, width, height, compact } = dc;

  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, width, height);

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const x = boardX + f * cellSize;
      const y = boardY + (7 - r) * cellSize;
      ctx.fillStyle = (r + f) % 2 === 0 ? DARK : LIGHT;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }

  drawNexusGlow(dc, time);

  if (selected) {
    const [sx, sy] = squareScreenPos(dc, selected);
    ctx.fillStyle = SELECT_COLOR;
    ctx.fillRect(sx, sy, cellSize, cellSize);
  }

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

  if (activeAbility) {
    for (const sq of abilityTargets) {
      const [x, y] = squareScreenPos(dc, sq);
      ctx.strokeStyle = "rgba(0,255,200,0.7)";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${cellSize * 0.75}px serif`;
  for (const [sq, piece] of state.board) {
    const [x, y] = squareScreenPos(dc, sq);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;

    if (piece.isShielded) {
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,220,255,0.8)";
      ctx.stroke();
    }

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

  // Labels only when there's room
  if (!compact || cellSize >= 36) {
    ctx.font = `${Math.max(10, Math.min(12, cellSize * 0.22))}px sans-serif`;
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    for (let f = 0; f < 8; f++) {
      ctx.fillText(
        "abcdefgh"[f],
        boardX + f * cellSize + cellSize / 2,
        boardY + 8 * cellSize + 12,
      );
    }
    ctx.textAlign = "right";
    for (let r = 0; r < 8; r++) {
      ctx.fillText(
        String(r + 1),
        boardX - 4,
        boardY + (7 - r) * cellSize + cellSize / 2,
      );
    }
  }
}

function drawPillButton(
  ctx: CanvasRenderingContext2D,
  b: ButtonRect,
  label: string,
  opts: { fill: string; stroke: string; text: string; font?: string },
) {
  ctx.fillStyle = opts.fill;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = opts.stroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = opts.text;
  ctx.font = opts.font ?? "13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 0.5);
}

export function drawHud(
  dc: DrawCtx,
  state: GameState,
  buttons: ButtonRect[],
  aiEnabled: boolean,
) {
  const { ctx, boardX, boardY, cellSize, boardSize, width, height, compact } = dc;
  buttons.length = 0;

  const hudTop = boardY + boardSize + (compact ? 10 : 18);
  const contentW = Math.min(boardSize, width - dc.pad * 2);
  const contentX = (width - contentW) / 2;
  const btnH = compact ? 40 : 36;

  // Top bar: AI + New Game (fit within viewport)
  {
    const topY = compact ? 6 : 10;
    const gap = 8;
    const bw = compact ? Math.min(88, (width - dc.pad * 2 - gap) / 2) : 100;
    const total = bw * 2 + gap;
    const startX = width - dc.pad - total;

    const aiBtn: ButtonRect = { x: startX, y: topY, w: bw, h: btnH - 4, id: "toggleai" };
    const ngBtn: ButtonRect = { x: startX + bw + gap, y: topY, w: bw, h: btnH - 4, id: "newgame" };

    drawPillButton(ctx, aiBtn, aiEnabled ? "AI: ON" : "AI: OFF", {
      fill: aiEnabled ? "rgba(40,140,60,0.85)" : "rgba(60,60,70,0.85)",
      stroke: "#888",
      text: "#ddd",
      font: compact ? "12px sans-serif" : "13px sans-serif",
    });
    drawPillButton(ctx, ngBtn, "New Game", {
      fill: "rgba(60,60,70,0.85)",
      stroke: "#888",
      text: "#ddd",
      font: compact ? "12px sans-serif" : "13px sans-serif",
    });
    buttons.push(aiBtn, ngBtn);
  }

  // Mana bars — scale segment width to content
  const labelW = compact ? 52 : 90;
  const segGap = 2;
  const segAvail = contentW - labelW - 4;
  const segW = Math.max(8, Math.floor((segAvail - segGap * 9) / 10));
  const rowH = compact ? 22 : 28;

  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    const label = p.color === "w" ? "W" : "B";
    const fullLabel = p.color === "w" ? "White" : "Black";
    const barY = hudTop + i * rowH;
    ctx.fillStyle = "#ccc";
    ctx.font = compact ? "12px sans-serif" : "14px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(compact ? `${label}` : `${fullLabel}`, contentX, barY + rowH / 2);

    for (let m = 0; m < 10; m++) {
      const sx = contentX + labelW + m * (segW + segGap);
      ctx.fillStyle = m < p.mana ? "rgba(60,140,255,0.9)" : "rgba(60,60,80,0.5)";
      ctx.fillRect(sx, barY + 3, segW, rowH - 6);
      ctx.strokeStyle = "#456";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, barY + 3, segW, rowH - 6);
    }
  }

  // Turn info
  const infoY = hudTop + rowH * 2 + (compact ? 6 : 10);
  ctx.fillStyle = "#ddd";
  ctx.font = compact ? "bold 13px sans-serif" : "bold 15px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const turnLabel = state.activeColor === "w" ? "White" : "Black";
  const phaseLabel =
    state.turnPhase === "ability"
      ? "Ability"
      : state.turnPhase === "overdrive"
        ? "Overdrive"
        : state.turnPhase === "move"
          ? "Move"
          : "...";
  const turnText = compact
    ? `T${state.turnNumber} · ${turnLabel} · ${phaseLabel}`
    : `Turn ${state.turnNumber} — ${turnLabel} — ${phaseLabel} Phase`;
  ctx.fillText(turnText, contentX, infoY);

  if (state.turnPhase === "ability" && !state.winner) {
    ctx.fillStyle = "#888";
    ctx.font = compact ? "11px sans-serif" : "12px sans-serif";
    ctx.fillText(
      compact ? "Tap piece to move, or use ability" : "Select an ability, or tap a piece / Skip to move",
      contentX,
      infoY + (compact ? 14 : 16),
    );
  }

  // Ability buttons — always fit within content width
  if (state.turnPhase === "ability" && !state.winner) {
    const btnY = infoY + (compact ? 22 : 28);
    const abilities: { id: Ability | "skip"; label: string; cost?: number }[] = [
      { id: "aegis", label: "Aegis", cost: ABILITY_COST.aegis },
      { id: "overdrive", label: "Overdrive", cost: ABILITY_COST.overdrive },
      { id: "tacticalSwap", label: compact ? "Swap" : "Tac. Swap", cost: ABILITY_COST.tacticalSwap },
      { id: "skip", label: "Skip" },
    ];
    const gap = compact ? 6 : 8;
    const bw = (contentW - gap * (abilities.length - 1)) / abilities.length;
    const mana = activePlayer(state).mana;

    for (let i = 0; i < abilities.length; i++) {
      const a = abilities[i];
      const bx = contentX + i * (bw + gap);
      const canAfford = a.id === "skip" || (a.cost !== undefined && mana >= a.cost);
      const btn: ButtonRect = { x: bx, y: btnY, w: bw, h: btnH, id: a.id };
      const display =
        a.id === "skip"
          ? "Skip"
          : compact
            ? `${a.label} ${a.cost}`
            : `${a.label} (${a.cost})`;

      drawPillButton(ctx, btn, display, {
        fill:
          a.id === "skip"
            ? "rgba(100,100,110,0.85)"
            : canAfford
              ? "rgba(40,120,200,0.85)"
              : "rgba(40,40,50,0.65)",
        stroke: a.id === "skip" ? "#999" : canAfford ? "#5af" : "#444",
        text: canAfford || a.id === "skip" ? "#fff" : "#666",
        font: compact ? "11px sans-serif" : "13px sans-serif",
      });
      buttons.push(btn);
    }
  }

  // Keep win overlay text readable on small screens
  void height;
  void cellSize;
}

export function drawWinOverlay(dc: DrawCtx, winner: Color) {
  const { ctx, width, height, compact } = dc;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = winner === "w" ? "#fff" : "#aaa";
  ctx.font = compact ? "bold 32px sans-serif" : "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${winner === "w" ? "White" : "Black"} Wins!`,
    width / 2,
    height / 2 - 20,
  );
  ctx.font = compact ? "16px sans-serif" : "20px sans-serif";
  ctx.fillStyle = "#bbb";
  ctx.fillText("Tap New Game to play again", width / 2, height / 2 + 28);
}
