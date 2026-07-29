import type { GameState, Square, Color, Ability, Move } from "../core/types";
import { squareToRC, rcToSquare, NEXUS_SQUARES } from "../core/board";
import { ABILITY_COST } from "../core/abilities";
import { activePlayer } from "../core/types";
import { Theme } from "./theme";
import { drawAtmosphere, drawBoardShadow, drawPremiumBtn, roundRectPath } from "./fx";

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

export function getLogoImage(): HTMLImageElement | null {
  return logoReady ? logoImg : null;
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

export function squareScreenPos(dc: DrawCtx, sq: Square, flipped = false): [number, number] {
  const [rank, file] = squareToRC(sq);
  const f = flipped ? 7 - file : file;
  const r = flipped ? rank : 7 - rank;
  return [dc.boardX + f * dc.cellSize, dc.boardY + r * dc.cellSize];
}

export function screenToSquare(dc: DrawCtx, px: number, py: number, flipped = false): Square | null {
  const f = Math.floor((px - dc.boardX) / dc.cellSize);
  const rDisplay = Math.floor((py - dc.boardY) / dc.cellSize);
  if (f < 0 || f > 7 || rDisplay < 0 || rDisplay > 7) return null;
  const file = flipped ? 7 - f : f;
  const rank = flipped ? rDisplay : 7 - rDisplay;
  return rcToSquare(rank, file);
}

function drawLogoHeader(dc: DrawCtx) {
  const { ctx, compact, pad } = dc;
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

function drawNexusGlow(dc: DrawCtx, time: number, flipped: boolean) {
  const { ctx, cellSize } = dc;
  const pulse = 0.1 + 0.06 * (0.5 + 0.5 * Math.sin(time * 1.4));

  // Soft bloom covering the whole Nexus block
  const corners = NEXUS_SQUARES.map((sq) => squareScreenPos(dc, sq, flipped));
  const minX = Math.min(...corners.map(([x]) => x));
  const minY = Math.min(...corners.map(([, y]) => y));
  const zone = cellSize * 2;
  const cx = minX + zone / 2;
  const cy = minY + zone / 2;

  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, zone * 0.85);
  bloom.addColorStop(0, `rgba(255,255,255,${0.07 + pulse * 0.35})`);
  bloom.addColorStop(0.55, `rgba(255,255,255,${0.025 + pulse * 0.12})`);
  bloom.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(minX - cellSize * 0.3, minY - cellSize * 0.3, zone + cellSize * 0.6, zone + cellSize * 0.6);

  for (const sq of NEXUS_SQUARES) {
    const [x, y] = squareScreenPos(dc, sq, flipped);
    const scx = x + cellSize / 2;
    const scy = y + cellSize / 2;

    const grad = ctx.createRadialGradient(scx, scy, 0, scx, scy, cellSize * 0.55);
    grad.addColorStop(0, `rgba(255,255,255,${pulse + 0.04})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, cellSize, cellSize);
  }

  ctx.strokeStyle = `rgba(255,255,255,${0.18 + pulse * 0.9})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(minX + 1.5, minY + 1.5, zone - 3, zone - 3);
}

function drawPieceGlyph(
  ctx: CanvasRenderingContext2D,
  ch: string,
  cx: number,
  cy: number,
  cellSize: number,
  color: "w" | "b",
) {
  ctx.font = `${cellSize * 0.68}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Soft contact shadow
  ctx.fillStyle = Theme.pieceShadow;
  ctx.fillText(ch, cx + 0.5, cy + cellSize * 0.04);

  if (color === "w") {
    ctx.fillStyle = Theme.whitePiece;
    ctx.fillText(ch, cx, cy);
  } else {
    ctx.fillStyle = Theme.blackPiece;
    ctx.fillText(ch, cx, cy);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 0.8;
    ctx.strokeText(ch, cx, cy);
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
  flipped = false,
  hideSquare: Square | null = null,
) {
  const { ctx, boardX, boardY, cellSize, boardSize, width, height, compact } = dc;

  drawAtmosphere(ctx, width, height, time);
  drawLogoHeader(dc);
  drawBoardShadow(ctx, boardX, boardY, boardSize);

  // Board frame
  ctx.fillStyle = Theme.bgSoft;
  ctx.fillRect(boardX - 3, boardY - 3, boardSize + 6, boardSize + 6);

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const x = boardX + f * cellSize;
      const y = boardY + (7 - r) * cellSize;
      const br = flipped ? 7 - r : r;
      const bf = flipped ? 7 - f : f;
      const light = (br + bf) % 2 !== 0;
      ctx.fillStyle = light ? Theme.tileLight : Theme.tileDark;
      ctx.fillRect(x, y, cellSize, cellSize);

      if (light) {
        ctx.fillStyle = Theme.tileSheen;
        ctx.fillRect(x, y, cellSize, 1);
      }
    }
  }

  ctx.strokeStyle = Theme.hairlineStrong;
  ctx.lineWidth = 1;
  ctx.strokeRect(boardX - 0.5, boardY - 0.5, boardSize + 1, boardSize + 1);

  drawNexusGlow(dc, time, flipped);

  if (selected) {
    const [sx, sy] = squareScreenPos(dc, selected, flipped);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(sx, sy, cellSize, cellSize);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.25;
    ctx.strokeRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4);
  }

  const legalSet = new Set(legalMoves.map((m) => m.to));
  for (const sq of legalSet) {
    const [x, y] = squareScreenPos(dc, sq, flipped);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    if (state.board.has(sq)) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.42)";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.8, cellSize * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (activeAbility) {
    for (const sq of abilityTargets) {
      const [x, y] = squareScreenPos(dc, sq, flipped);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
    }
  }

  for (const [sq, piece] of state.board) {
    if (hideSquare && sq === hideSquare) continue;
    const [x, y] = squareScreenPos(dc, sq, flipped);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;

    if (piece.isShielded) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      roundRectPath(ctx, x + 5, y + 5, cellSize - 10, cellSize - 10, 2);
      ctx.stroke();
    }

    if (state.overdriveSquare === sq) {
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(x, y, cellSize, cellSize);
    }

    const ch = PIECE_CHARS[piece.color + piece.kind];
    drawPieceGlyph(ctx, ch, cx, cy, cellSize, piece.color);
  }

  if (!compact || cellSize >= 40) {
    ctx.font = `400 ${Math.max(9, Math.min(10, cellSize * 0.18))}px ${Theme.font}`;
    ctx.fillStyle = Theme.inkMute;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let f = 0; f < 8; f++) {
      const label = flipped ? "hgfedcba"[f] : "abcdefgh"[f];
      ctx.fillText(label, boardX + f * cellSize + cellSize / 2, boardY + boardSize + 14);
    }
    ctx.textAlign = "right";
    for (let r = 0; r < 8; r++) {
      const label = flipped ? String(8 - r) : String(r + 1);
      ctx.fillText(label, boardX - 8, boardY + (7 - r) * cellSize + cellSize / 2);
    }
  }
}

export function drawHud(
  dc: DrawCtx,
  state: GameState,
  buttons: ButtonRect[],
  modeLabel: string,
) {
  const { ctx, boardSize, width, compact } = dc;
  buttons.length = 0;

  const hudTop = dc.boardY + boardSize + (compact ? 22 : 28);
  const contentW = Math.min(boardSize, width - dc.pad * 2);
  const contentX = (width - contentW) / 2;
  const btnH = compact ? 36 : 34;
  const fontSm = compact ? 11 : 12;

  {
    const topY = compact ? 12 : 16;
    const menuW = compact ? 72 : 84;
    const menu: ButtonRect = {
      x: width - dc.pad - menuW,
      y: topY,
      w: menuW,
      h: 30,
      id: "play-menu",
    };
    drawPremiumBtn(ctx, menu, "Menu", { fontSize: fontSm });
    buttons.push(menu);

    ctx.fillStyle = Theme.inkMute;
    ctx.font = `400 ${fontSm}px ${Theme.font}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(modeLabel, menu.x - 12, topY + 15);
  }

  const labelW = compact ? 22 : 56;
  const trackH = 3;
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

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRectPath(ctx, trackX, trackY, trackW, trackH, 1.5);
    ctx.fill();

    const fillW = (Math.min(10, p.mana) / 10) * trackW;
    if (fillW > 0) {
      const g = ctx.createLinearGradient(trackX, 0, trackX + fillW, 0);
      g.addColorStop(0, "rgba(255,255,255,0.45)");
      g.addColorStop(1, "rgba(255,255,255,0.85)");
      ctx.fillStyle = g;
      roundRectPath(ctx, trackX, trackY, Math.max(fillW, trackH), trackH, 1.5);
      ctx.fill();
    }
  }

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

      drawPremiumBtn(ctx, btn, display, {
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
  ctx.fillStyle = "rgba(5,5,6,0.9)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 24 : 32}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${winner === "w" ? "White" : "Black"} wins`, width / 2, height / 2);
}
