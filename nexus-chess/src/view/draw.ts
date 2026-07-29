import type { GameState, Square, Color, Ability, Move } from "../core/types";
import { squareToRC, rcToSquare, NEXUS_SQUARES } from "../core/board";
import { ABILITY_COST } from "../core/abilities";
import { activePlayer } from "../core/types";
import { Theme } from "./theme";

const PIECE_CHARS: Record<string, string> = {
  wK: "\u2654", wQ: "\u2655", wR: "\u2656", wB: "\u2657", wN: "\u2658", wP: "\u2659",
  bK: "\u265A", bQ: "\u265B", bR: "\u265C", bB: "\u265D", bN: "\u265E", bP: "\u265F",
};

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

let logoImg: HTMLImageElement | null = null;
let logoReady = false;

export function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      logoImg = img;
      logoReady = true;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = "./logo.png";
  });
}

function hudReserve(h: number, compact: boolean): number {
  if (compact) return Math.max(136, Math.min(172, h * 0.32));
  return 168;
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

  const pad = compact ? 16 : 28;
  const topBar = compact ? 78 : 100;
  const bottom = hudReserve(h, compact);
  const availW = w - pad * 2;
  const availH = h - topBar - bottom;
  const maxBoard = compact ? 560 : Math.min(680, Math.floor(Math.min(availW, availH)));
  const boardSize = Math.max(160, Math.min(availW, availH, maxBoard));
  const cellSize = boardSize / 8;
  const boardX = (w - boardSize) / 2;
  const boardY = topBar + Math.max(0, (availH - boardSize) / 2);

  return { ctx, boardX, boardY, cellSize, boardSize, width: w, height: h, compact, pad };
}

export function squareScreenPos(dc: DrawCtx, sq: Square): [number, number] {
  const [rank, file] = squareToRC(sq);
  return [dc.boardX + file * dc.cellSize, dc.boardY + (7 - rank) * dc.cellSize];
}

export function screenToSquare(dc: DrawCtx, px: number, py: number): Square | null {
  const file = Math.floor((px - dc.boardX) / dc.cellSize);
  const rank = 7 - Math.floor((py - dc.boardY) / dc.cellSize);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return rcToSquare(rank, file);
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  b: ButtonRect,
  label: string,
  opts: { active?: boolean; muted?: boolean; primary?: boolean; fontSize: number },
) {
  const { x, y, w, h } = b;

  if (opts.primary) {
    ctx.fillStyle = "rgba(244,244,245,0.08)";
    ctx.fillRect(x, y, w, h);
  }

  ctx.strokeStyle = opts.muted
    ? Theme.hairline
    : opts.active || opts.primary
      ? Theme.hairlineStrong
      : Theme.hairline;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  ctx.fillStyle = opts.muted ? Theme.inkMute : opts.active ? Theme.ink : Theme.inkDim;
  ctx.font = `500 ${opts.fontSize}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
}

function drawLogoHeader(dc: DrawCtx) {
  const { ctx, compact, pad } = dc;
  // Larger brand mark — still balanced with top controls
  const logoH = compact ? 52 : 76;
  if (logoReady && logoImg) {
    const aspect = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
    const logoW = logoH * aspect;
    const y = compact ? 10 : 12;
    ctx.drawImage(logoImg, pad, y, logoW, logoH);
  } else {
    ctx.fillStyle = Theme.ink;
    ctx.font = `500 ${compact ? 22 : 28}px ${Theme.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("NEXUS", pad, compact ? 30 : 40);
  }
}

function drawNexusGlow(dc: DrawCtx, time: number) {
  const { ctx, cellSize } = dc;
  const pulse = 0.08 + 0.07 * (0.5 + 0.5 * Math.sin(time * 1.8));

  for (const sq of NEXUS_SQUARES) {
    const [x, y] = squareScreenPos(dc, sq);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cellSize * 0.62);
    grad.addColorStop(0, `rgba(255,255,255,${pulse + 0.06})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, cellSize, cellSize);

    ctx.strokeStyle = `rgba(255,255,255,${0.12 + pulse})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1.5, y + 1.5, cellSize - 3, cellSize - 3);
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
  const { ctx, boardX, boardY, cellSize, boardSize, width, height, compact } = dc;

  ctx.fillStyle = Theme.bg;
  ctx.fillRect(0, 0, width, height);

  drawLogoHeader(dc);

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const x = boardX + f * cellSize;
      const y = boardY + (7 - r) * cellSize;
      ctx.fillStyle = (r + f) % 2 === 0 ? Theme.tileDark : Theme.tileLight;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }

  // Single thin board frame
  ctx.strokeStyle = Theme.hairlineStrong;
  ctx.lineWidth = 1;
  ctx.strokeRect(boardX - 0.5, boardY - 0.5, boardSize + 1, boardSize + 1);

  drawNexusGlow(dc, time);

  if (selected) {
    const [sx, sy] = squareScreenPos(dc, selected);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(sx, sy, cellSize, cellSize);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 1.5, sy + 1.5, cellSize - 3, cellSize - 3);
  }

  const legalSet = new Set(legalMoves.map((m) => m.to));
  for (const sq of legalSet) {
    const [x, y] = squareScreenPos(dc, sq);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    if (state.board.has(sq)) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.5, cellSize * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (activeAbility) {
    for (const sq of abilityTargets) {
      const [x, y] = squareScreenPos(dc, sq);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${cellSize * 0.7}px Georgia, "Times New Roman", serif`;
  for (const [sq, piece] of state.board) {
    const [x, y] = squareScreenPos(dc, sq);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;

    if (piece.isShielded) {
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 5, y + 5, cellSize - 10, cellSize - 10);
    }

    if (state.overdriveSquare === sq) {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(x, y, cellSize, cellSize);
    }

    const ch = PIECE_CHARS[piece.color + piece.kind];
    if (piece.color === "w") {
      ctx.fillStyle = Theme.whitePiece;
      ctx.fillText(ch, cx, cy);
    } else {
      ctx.fillStyle = Theme.blackPiece;
      ctx.fillText(ch, cx, cy);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 0.75;
      ctx.strokeText(ch, cx, cy);
    }
  }

  if (!compact || cellSize >= 40) {
    ctx.font = `400 ${Math.max(9, Math.min(10, cellSize * 0.18))}px ${Theme.font}`;
    ctx.fillStyle = Theme.inkMute;
    ctx.textAlign = "center";
    for (let f = 0; f < 8; f++) {
      ctx.fillText(
        "abcdefgh"[f],
        boardX + f * cellSize + cellSize / 2,
        boardY + boardSize + 14,
      );
    }
    ctx.textAlign = "right";
    for (let r = 0; r < 8; r++) {
      ctx.fillText(
        String(r + 1),
        boardX - 8,
        boardY + (7 - r) * cellSize + cellSize / 2,
      );
    }
  }
}

export function drawHud(
  dc: DrawCtx,
  state: GameState,
  buttons: ButtonRect[],
  aiEnabled: boolean,
) {
  const { ctx, boardSize, width, compact } = dc;
  buttons.length = 0;

  const hudTop = dc.boardY + boardSize + (compact ? 22 : 28);
  const contentW = Math.min(boardSize, width - dc.pad * 2);
  const contentX = (width - contentW) / 2;
  const btnH = compact ? 36 : 34;
  const fontSm = compact ? 11 : 12;

  // Top-right controls — quiet text buttons
  {
    const topY = compact ? 12 : 16;
    const gap = 10;
    const bw = compact ? Math.min(78, (width - dc.pad * 2 - gap) / 2) : 96;
    const startX = width - dc.pad - (bw * 2 + gap);

    const aiBtn: ButtonRect = { x: startX, y: topY, w: bw, h: 30, id: "toggleai" };
    const ngBtn: ButtonRect = { x: startX + bw + gap, y: topY, w: bw, h: 30, id: "newgame" };

    drawButton(ctx, aiBtn, aiEnabled ? "AI On" : "AI Off", {
      active: aiEnabled,
      fontSize: fontSm,
    });
    drawButton(ctx, ngBtn, "New Game", { fontSize: fontSm });
    buttons.push(aiBtn, ngBtn);
  }

  // Mana — thin continuous track
  const labelW = compact ? 22 : 56;
  const trackH = 4;
  const rowH = compact ? 20 : 24;

  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    const label = compact ? (p.color === "w" ? "W" : "B") : p.color === "w" ? "White" : "Black";
    const barY = hudTop + i * rowH;

    ctx.fillStyle = Theme.inkDim;
    ctx.font = `400 ${fontSm}px ${Theme.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, contentX, barY + rowH / 2);

    const trackX = contentX + labelW;
    const trackW = contentW - labelW;
    const trackY = barY + (rowH - trackH) / 2;

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(trackX, trackY, trackW, trackH);

    const fillW = (Math.min(10, p.mana) / 10) * trackW;
    if (fillW > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(trackX, trackY, fillW, trackH);
    }
  }

  // Status line
  const infoY = hudTop + rowH * 2 + (compact ? 10 : 14);
  const turnLabel = state.activeColor === "w" ? "White" : "Black";
  const phaseLabel =
    state.turnPhase === "ability"
      ? "Ability"
      : state.turnPhase === "overdrive"
        ? "Overdrive"
        : state.turnPhase === "move"
          ? "Move"
          : "";

  ctx.fillStyle = Theme.inkDim;
  ctx.font = `400 ${fontSm}px ${Theme.font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`Turn ${state.turnNumber}  ·  ${turnLabel}  ·  ${phaseLabel}`, contentX, infoY);

  if (state.turnPhase === "ability" && !state.winner) {
    const btnY = infoY + (compact ? 12 : 16);
    const abilities: { id: Ability | "skip"; label: string; cost?: number }[] = [
      { id: "aegis", label: "Aegis", cost: ABILITY_COST.aegis },
      { id: "overdrive", label: compact ? "Drive" : "Overdrive", cost: ABILITY_COST.overdrive },
      { id: "tacticalSwap", label: "Swap", cost: ABILITY_COST.tacticalSwap },
      { id: "skip", label: "Skip" },
    ];
    const gap = compact ? 8 : 10;
    const bw = (contentW - gap * (abilities.length - 1)) / abilities.length;
    const mana = activePlayer(state).mana;

    for (let i = 0; i < abilities.length; i++) {
      const a = abilities[i];
      const bx = contentX + i * (bw + gap);
      const canAfford = a.id === "skip" || (a.cost !== undefined && mana >= a.cost);
      const btn: ButtonRect = { x: bx, y: btnY, w: bw, h: btnH, id: a.id };
      const display = a.id === "skip" ? "Skip" : `${a.label}  ${a.cost}`;

      drawButton(ctx, btn, display, {
        muted: !canAfford && a.id !== "skip",
        primary: a.id === "skip",
        fontSize: compact ? 11 : 12,
      });
      buttons.push(btn);
    }
  }
}

export function drawWinOverlay(dc: DrawCtx, winner: Color) {
  const { ctx, width, height, compact } = dc;
  ctx.fillStyle = "rgba(7,7,8,0.88)";
  ctx.fillRect(0, 0, width, height);

  if (logoReady && logoImg) {
    const logoH = compact ? 52 : 72;
    const aspect = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
    const logoW = logoH * aspect;
    ctx.drawImage(logoImg, width / 2 - logoW / 2, height / 2 - logoH - 40, logoW, logoH);
  }

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 24 : 32}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${winner === "w" ? "White" : "Black"} wins`,
    width / 2,
    height / 2 + 4,
  );

  ctx.font = `400 ${compact ? 13 : 14}px ${Theme.font}`;
  ctx.fillStyle = Theme.inkMute;
  ctx.fillText("New Game to play again", width / 2, height / 2 + 40);
}
