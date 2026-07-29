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
  const topBar = compact ? 58 : 72;
  const bottom = hudReserve(h, compact);
  const availW = w - pad * 2;
  const availH = h - topBar - bottom;
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

/** Sharp angular button (no rounded corners). */
function drawAngularButton(
  ctx: CanvasRenderingContext2D,
  b: ButtonRect,
  label: string,
  opts: { fill: string; stroke: string; text: string; font?: string; glow?: string },
) {
  const { x, y, w, h } = b;
  const cut = Math.min(8, h * 0.28);

  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + cut);
  ctx.closePath();

  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = opts.fill;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = opts.stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = opts.text;
  ctx.font = opts.font ?? `600 12px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = 8;
  }
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  ctx.shadowBlur = 0;
}

function drawBackground(dc: DrawCtx) {
  const { ctx, width, height } = dc;
  ctx.fillStyle = Theme.bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle tech grid
  ctx.strokeStyle = Theme.gridLine;
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  // Soft vignette
  const g = ctx.createRadialGradient(
    width / 2,
    height * 0.4,
    Math.min(width, height) * 0.15,
    width / 2,
    height * 0.45,
    Math.max(width, height) * 0.7,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

function drawBoardFrame(dc: DrawCtx) {
  const { ctx, boardX, boardY, boardSize } = dc;
  const m = 3;
  ctx.strokeStyle = Theme.stroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(boardX - m, boardY - m, boardSize + m * 2, boardSize + m * 2);

  // Corner ticks (logo angular language)
  const tick = 12;
  ctx.strokeStyle = Theme.accentHot;
  ctx.lineWidth = 2;
  // TL
  ctx.beginPath();
  ctx.moveTo(boardX - m, boardY - m + tick);
  ctx.lineTo(boardX - m, boardY - m);
  ctx.lineTo(boardX - m + tick, boardY - m);
  ctx.stroke();
  // TR
  ctx.beginPath();
  ctx.moveTo(boardX + boardSize + m - tick, boardY - m);
  ctx.lineTo(boardX + boardSize + m, boardY - m);
  ctx.lineTo(boardX + boardSize + m, boardY - m + tick);
  ctx.stroke();
  // BL
  ctx.beginPath();
  ctx.moveTo(boardX - m, boardY + boardSize + m - tick);
  ctx.lineTo(boardX - m, boardY + boardSize + m);
  ctx.lineTo(boardX - m + tick, boardY + boardSize + m);
  ctx.stroke();
  // BR
  ctx.beginPath();
  ctx.moveTo(boardX + boardSize + m - tick, boardY + boardSize + m);
  ctx.lineTo(boardX + boardSize + m, boardY + boardSize + m);
  ctx.lineTo(boardX + boardSize + m, boardY + boardSize + m - tick);
  ctx.stroke();
}

function drawNexusGlow(dc: DrawCtx, time: number) {
  const { ctx, cellSize } = dc;
  const pulse = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(time * 2.6));
  const beam = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(time * 4.2));

  for (const sq of NEXUS_SQUARES) {
    const [x, y] = squareScreenPos(dc, sq);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;

    // Base tile energy wash
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cellSize * 0.72);
    grad.addColorStop(0, `rgba(240,192,64,${pulse * 0.85})`);
    grad.addColorStop(0.45, `rgba(74,168,255,${pulse * 0.45})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, cellSize, cellSize);

    // Sharp inner border
    ctx.strokeStyle = `rgba(255,255,255,${0.25 + pulse * 0.35})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

    // Vertical laser bisector (from logo)
    ctx.strokeStyle = `rgba(255,255,255,${beam})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(cx, y + 3);
    ctx.lineTo(cx, y + cellSize - 3);
    ctx.stroke();

    // Tiny crown tick at top of cell
    ctx.fillStyle = `rgba(240,192,64,${0.5 + pulse * 0.5})`;
    const t = cellSize * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx - t * 1.6, y + 5 + t);
    ctx.lineTo(cx - t * 0.5, y + 5);
    ctx.lineTo(cx, y + 5 + t * 0.7);
    ctx.lineTo(cx + t * 0.5, y + 5);
    ctx.lineTo(cx + t * 1.6, y + 5 + t);
    ctx.lineTo(cx - t * 1.6, y + 5 + t);
    ctx.fill();
  }
}

function drawLogoHeader(dc: DrawCtx) {
  const { ctx, compact, pad } = dc;
  const logoH = compact ? 42 : 56;
  if (logoReady && logoImg) {
    const aspect = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
    const logoW = logoH * aspect;
    const x = pad;
    const y = compact ? 4 : 6;
    ctx.shadowColor = "rgba(255,255,255,0.4)";
    ctx.shadowBlur = 20;
    ctx.drawImage(logoImg, x, y, logoW, logoH);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = Theme.ink;
    ctx.font = `700 ${compact ? 20 : 26}px ${Theme.fontDisplay}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(255,255,255,0.4)";
    ctx.shadowBlur = 12;
    ctx.fillText("NEXUS", pad, compact ? 26 : 32);
    ctx.shadowBlur = 0;
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
  const { ctx, boardX, boardY, cellSize, compact } = dc;

  drawBackground(dc);
  drawLogoHeader(dc);

  // Board tiles
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const x = boardX + f * cellSize;
      const y = boardY + (7 - r) * cellSize;
      ctx.fillStyle = (r + f) % 2 === 0 ? Theme.tileDark : Theme.tileLight;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }

  drawBoardFrame(dc);
  drawNexusGlow(dc, time);

  if (selected) {
    const [sx, sy] = squareScreenPos(dc, selected);
    ctx.fillStyle = "rgba(240,192,64,0.28)";
    ctx.fillRect(sx, sy, cellSize, cellSize);
    ctx.strokeStyle = Theme.accentHot;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1.5, sy + 1.5, cellSize - 3, cellSize - 3);
  }

  const legalSet = new Set(legalMoves.map((m) => m.to));
  for (const sq of legalSet) {
    const [x, y] = squareScreenPos(dc, sq);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    if (state.board.has(sq)) {
      // Angular capture diamond
      const s = cellSize * 0.38;
      ctx.strokeStyle = Theme.danger;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s, cy);
      ctx.closePath();
      ctx.stroke();
    } else {
      // Sharp move marker
      const s = cellSize * 0.1;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (activeAbility) {
    for (const sq of abilityTargets) {
      const [x, y] = squareScreenPos(dc, sq);
      ctx.strokeStyle = Theme.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
    }
  }

  // Pieces
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${cellSize * 0.72}px serif`;
  for (const [sq, piece] of state.board) {
    const [x, y] = squareScreenPos(dc, sq);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;

    if (piece.isShielded) {
      ctx.strokeStyle = Theme.accent;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
    }

    if (state.overdriveSquare === sq) {
      ctx.fillStyle = "rgba(240,192,64,0.22)";
      ctx.fillRect(x, y, cellSize, cellSize);
    }

    const ch = PIECE_CHARS[piece.color + piece.kind];
    if (piece.color === "w") {
      ctx.shadowColor = "rgba(255,255,255,0.65)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = Theme.whitePiece;
      ctx.fillText(ch, cx, cy);
      ctx.shadowBlur = 0;
    } else {
      // Silver fill so black side stays readable on dark tiles
      ctx.shadowColor = "rgba(74,168,255,0.25)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#a8b0bc";
      ctx.fillText(ch, cx, cy);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = Math.max(1.25, cellSize * 0.025);
      ctx.strokeText(ch, cx, cy);
    }
  }

  if (!compact || cellSize >= 36) {
    ctx.font = `500 ${Math.max(9, Math.min(11, cellSize * 0.2))}px ${Theme.font}`;
    ctx.fillStyle = Theme.inkMute;
    ctx.textAlign = "center";
    for (let f = 0; f < 8; f++) {
      ctx.fillText(
        "ABCDEFGH"[f],
        boardX + f * cellSize + cellSize / 2,
        boardY + 8 * cellSize + 11,
      );
    }
    ctx.textAlign = "right";
    for (let r = 0; r < 8; r++) {
      ctx.fillText(
        String(r + 1),
        boardX - 5,
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

  const hudTop = dc.boardY + boardSize + (compact ? 10 : 16);
  const contentW = Math.min(boardSize, width - dc.pad * 2);
  const contentX = (width - contentW) / 2;
  const btnH = compact ? 40 : 36;

  // Top-right controls
  {
    const topY = compact ? 8 : 12;
    const gap = 8;
    const bw = compact ? Math.min(84, (width - dc.pad * 2 - gap) / 2) : 104;
    const total = bw * 2 + gap;
    const startX = width - dc.pad - total;

    const aiBtn: ButtonRect = { x: startX, y: topY, w: bw, h: btnH - 4, id: "toggleai" };
    const ngBtn: ButtonRect = { x: startX + bw + gap, y: topY, w: bw, h: btnH - 4, id: "newgame" };

    drawAngularButton(ctx, aiBtn, aiEnabled ? "AI ON" : "AI OFF", {
      fill: aiEnabled ? "rgba(61,255,154,0.12)" : "rgba(255,255,255,0.04)",
      stroke: aiEnabled ? Theme.success : Theme.strokeDim,
      text: aiEnabled ? Theme.success : Theme.inkDim,
      font: `600 ${compact ? 11 : 12}px ${Theme.font}`,
      glow: aiEnabled ? "rgba(61,255,154,0.35)" : undefined,
    });
    drawAngularButton(ctx, ngBtn, "NEW GAME", {
      fill: "rgba(255,255,255,0.04)",
      stroke: Theme.strokeDim,
      text: Theme.ink,
      font: `600 ${compact ? 11 : 12}px ${Theme.font}`,
    });
    buttons.push(aiBtn, ngBtn);
  }

  // Mana
  const labelW = compact ? 28 : 72;
  const segGap = 2;
  const segAvail = contentW - labelW - 4;
  const segW = Math.max(8, Math.floor((segAvail - segGap * 9) / 10));
  const rowH = compact ? 22 : 26;

  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    const label = compact ? (p.color === "w" ? "W" : "B") : p.color === "w" ? "WHITE" : "BLACK";
    const barY = hudTop + i * rowH;
    ctx.fillStyle = Theme.inkDim;
    ctx.font = `600 ${compact ? 11 : 12}px ${Theme.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, contentX, barY + rowH / 2);

    for (let m = 0; m < 10; m++) {
      const sx = contentX + labelW + m * (segW + segGap);
      const filled = m < p.mana;
      ctx.fillStyle = filled ? Theme.accent : "rgba(255,255,255,0.06)";
      ctx.fillRect(sx, barY + 4, segW, rowH - 8);
      if (filled) {
        ctx.shadowColor = Theme.accent;
        ctx.shadowBlur = 6;
        ctx.fillRect(sx, barY + 4, segW, rowH - 8);
        ctx.shadowBlur = 0;
      }
      ctx.strokeStyle = filled ? Theme.accent : Theme.strokeDim;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, barY + 4.5, segW - 1, rowH - 9);
    }
  }

  // Turn / phase
  const infoY = hudTop + rowH * 2 + (compact ? 6 : 10);
  const turnLabel = state.activeColor === "w" ? "WHITE" : "BLACK";
  const phaseLabel =
    state.turnPhase === "ability"
      ? "ABILITY"
      : state.turnPhase === "overdrive"
        ? "OVERDRIVE"
        : state.turnPhase === "move"
          ? "MOVE"
          : "...";

  ctx.fillStyle = Theme.ink;
  ctx.font = `700 ${compact ? 12 : 14}px ${Theme.font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const turnText = compact
    ? `T${state.turnNumber}  ${turnLabel}  ${phaseLabel}`
    : `TURN ${state.turnNumber}  ·  ${turnLabel}  ·  ${phaseLabel}`;
  ctx.fillText(turnText, contentX, infoY);

  // Gold accent underline
  ctx.strokeStyle = Theme.accentHot;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, infoY + 4);
  ctx.lineTo(contentX + Math.min(120, contentW * 0.35), infoY + 4);
  ctx.stroke();

  if (state.turnPhase === "ability" && !state.winner) {
    ctx.fillStyle = Theme.inkMute;
    ctx.font = `500 ${compact ? 10 : 11}px ${Theme.font}`;
    ctx.fillText(
      compact ? "TAP PIECE TO MOVE  ·  OR CAST" : "SELECT ABILITY  ·  OR TAP A PIECE / SKIP TO MOVE",
      contentX,
      infoY + (compact ? 16 : 18),
    );
  }

  if (state.turnPhase === "ability" && !state.winner) {
    const btnY = infoY + (compact ? 24 : 30);
    const abilities: { id: Ability | "skip"; label: string; cost?: number }[] = [
      { id: "aegis", label: "AEGIS", cost: ABILITY_COST.aegis },
      { id: "overdrive", label: compact ? "DRIVE" : "OVERDRIVE", cost: ABILITY_COST.overdrive },
      { id: "tacticalSwap", label: "SWAP", cost: ABILITY_COST.tacticalSwap },
      { id: "skip", label: "SKIP" },
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
        a.id === "skip" ? "SKIP" : `${a.label} ${a.cost}`;

      drawAngularButton(ctx, btn, display, {
        fill:
          a.id === "skip"
            ? "rgba(255,255,255,0.06)"
            : canAfford
              ? "rgba(74,168,255,0.14)"
              : "rgba(255,255,255,0.03)",
        stroke:
          a.id === "skip"
            ? Theme.stroke
            : canAfford
              ? Theme.accent
              : Theme.strokeDim,
        text: canAfford || a.id === "skip" ? Theme.ink : Theme.inkMute,
        font: `600 ${compact ? 10 : 11}px ${Theme.font}`,
        glow: canAfford && a.id !== "skip" ? "rgba(74,168,255,0.35)" : undefined,
      });
      buttons.push(btn);
    }
  }
}

export function drawWinOverlay(dc: DrawCtx, winner: Color) {
  const { ctx, width, height, compact } = dc;
  ctx.fillStyle = "rgba(0,0,0,0.82)";
  ctx.fillRect(0, 0, width, height);

  if (logoReady && logoImg) {
    const logoH = compact ? 48 : 72;
    const aspect = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
    const logoW = logoH * aspect;
    ctx.shadowColor = "rgba(255,255,255,0.45)";
    ctx.shadowBlur = 24;
    ctx.drawImage(logoImg, width / 2 - logoW / 2, height / 2 - logoH - 48, logoW, logoH);
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = Theme.ink;
  ctx.font = `700 ${compact ? 28 : 42}px ${Theme.fontDisplay}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = winner === "w" ? "rgba(255,255,255,0.5)" : "rgba(240,192,64,0.45)";
  ctx.shadowBlur = 16;
  ctx.fillText(
    `${winner === "w" ? "WHITE" : "BLACK"} WINS`,
    width / 2,
    height / 2 + 8,
  );
  ctx.shadowBlur = 0;

  ctx.strokeStyle = Theme.accentHot;
  ctx.lineWidth = 1.5;
  const lineW = compact ? 80 : 120;
  ctx.beginPath();
  ctx.moveTo(width / 2 - lineW, height / 2 + 36);
  ctx.lineTo(width / 2 + lineW, height / 2 + 36);
  ctx.stroke();

  ctx.font = `500 ${compact ? 13 : 16}px ${Theme.font}`;
  ctx.fillStyle = Theme.inkDim;
  ctx.fillText("TAP NEW GAME TO PLAY AGAIN", width / 2, height / 2 + 58);
}
