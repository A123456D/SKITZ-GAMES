import type { GameState, Square, Color, Ability, Move } from "../core/types";
import { squareToRC, rcToSquare, NEXUS_SQUARES } from "../core/board";
import { ABILITY_COST, ABILITY_INFO } from "../core/abilities";
import { activePlayer } from "../core/types";
import { Theme } from "./theme";
import { drawAtmosphere, drawBoardShadow, drawPremiumBtn, roundRectPath, fillTile, drawPanel, getBoardImage } from "./fx";
import { drawThemePiece } from "./pieces";

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
let markImg: HTMLImageElement | null = null;
let markReady = false;
const abilityIcons = new Map<string, HTMLImageElement>();

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

export function loadNexusMark(): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      markImg = img;
      markReady = true;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = "./themes/nexus/nexus-mark.png?v=3";
  });
}

export function loadAbilityIcons(): Promise<void> {
  const ids = ["aegis", "overdrive", "swap"] as const;
  return Promise.all(
    ids.map(
      (id) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            abilityIcons.set(id, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `./themes/nexus/abilities/${id}.png?v=2`;
        }),
    ),
  ).then(() => undefined);
}

export function getAbilityIcon(id: string): HTMLImageElement | null {
  const key = id === "tacticalSwap" ? "swap" : id;
  return abilityIcons.get(key) ?? null;
}

export function getLogoImage(): HTMLImageElement | null {
  return logoReady ? logoImg : null;
}

function hudReserve(h: number, compact: boolean): number {
  if (compact) return Math.max(136, Math.min(172, h * 0.32));
  return 168;
}

export function layout(canvas: HTMLCanvasElement, prev?: DrawCtx | null): DrawCtx {
  const dpr = window.devicePixelRatio || 1;
  const vv = window.visualViewport;
  const w = Math.floor(vv?.width ?? window.innerWidth);
  const h = Math.floor(vv?.height ?? window.innerHeight);
  const compact = w < 640 || h < 700;

  const needResize =
    !prev ||
    prev.width !== w ||
    prev.height !== h ||
    canvas.width !== Math.floor(w * dpr) ||
    canvas.height !== Math.floor(h * dpr);

  let ctx: CanvasRenderingContext2D;
  if (needResize) {
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  } else {
    ctx = prev.ctx;
  }

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
  const isNexus = Theme.id === "nexus";

  const corners = NEXUS_SQUARES.map((sq) => squareScreenPos(dc, sq, flipped));
  const minX = Math.min(...corners.map(([x]) => x));
  const minY = Math.min(...corners.map(([, y]) => y));
  const zone = cellSize * 2;
  const cx = minX + zone / 2;
  const cy = minY + zone / 2;

  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, zone * 0.9);
  if (isNexus) {
    bloom.addColorStop(0, `rgba(140,220,255,${0.14 + pulse * 0.4})`);
    bloom.addColorStop(0.5, `rgba(80,170,230,${0.05 + pulse * 0.15})`);
    bloom.addColorStop(1, "rgba(40,100,160,0)");
  } else {
    bloom.addColorStop(0, `rgba(255,255,255,${0.07 + pulse * 0.35})`);
    bloom.addColorStop(0.55, `rgba(255,255,255,${0.025 + pulse * 0.12})`);
    bloom.addColorStop(1, "rgba(255,255,255,0)");
  }
  ctx.fillStyle = bloom;
  ctx.fillRect(minX - cellSize * 0.35, minY - cellSize * 0.35, zone + cellSize * 0.7, zone + cellSize * 0.7);

  for (const sq of NEXUS_SQUARES) {
    const [x, y] = squareScreenPos(dc, sq, flipped);
    const scx = x + cellSize / 2;
    const scy = y + cellSize / 2;
    const grad = ctx.createRadialGradient(scx, scy, 0, scx, scy, cellSize * 0.55);
    if (isNexus) {
      grad.addColorStop(0, `rgba(160,230,255,${pulse + 0.06})`);
      grad.addColorStop(1, "rgba(100,180,230,0)");
    } else {
      grad.addColorStop(0, `rgba(255,255,255,${pulse + 0.04})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, cellSize, cellSize);
  }

  // Painted logo mark (crown + X) on the Nexus surface
  if (markReady && markImg) {
    const markH = zone * 0.82;
    const aspect = markImg.naturalWidth / Math.max(1, markImg.naturalHeight);
    const markW = markH * aspect;
    const mx = cx - markW / 2;
    const my = cy - markH / 2;
    ctx.save();
    // Soft wash into the zone — reads as faded paint, not a sticker
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = isNexus ? 0.42 + pulse * 0.12 : 0.28 + pulse * 0.08;
    ctx.drawImage(markImg, mx, my, markW, markH);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = isNexus ? 0.1 + pulse * 0.04 : 0.07 + pulse * 0.03;
    ctx.drawImage(markImg, mx, my, markW, markH);
    ctx.restore();
  }

  ctx.strokeStyle = isNexus
    ? `rgba(160,230,255,${0.35 + pulse})`
    : `rgba(255,255,255,${0.18 + pulse * 0.9})`;
  ctx.lineWidth = isNexus ? 1.5 : 1;
  ctx.strokeRect(minX + 1.5, minY + 1.5, zone - 3, zone - 3);

  if (isNexus) {
    ctx.strokeStyle = `rgba(120,200,255,${0.2 + pulse * 0.4})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(minX + 5, minY + 5, zone - 10, zone - 10);
  }
}

/** Forge nexus zone — dual cyan / crimson energy well + painted logo mark. */
function drawForgeNexus(dc: DrawCtx, time: number, flipped: boolean) {
  const { ctx, cellSize } = dc;
  const pulse = 0.14 + 0.1 * (0.5 + 0.5 * Math.sin(time * 1.5));
  const corners = NEXUS_SQUARES.map((sq) => squareScreenPos(dc, sq, flipped));
  const minX = Math.min(...corners.map(([x]) => x));
  const minY = Math.min(...corners.map(([, y]) => y));
  const zone = cellSize * 2;
  const cx = minX + zone / 2;
  const cy = minY + zone / 2;

  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, zone * 0.95);
  bloom.addColorStop(0, `rgba(255,120,130,${0.22 + pulse * 0.4})`);
  bloom.addColorStop(0.4, `rgba(100,170,230,${0.12 + pulse * 0.22})`);
  bloom.addColorStop(1, "rgba(20,8,12,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(minX - cellSize * 0.25, minY - cellSize * 0.25, zone + cellSize * 0.5, zone + cellSize * 0.5);

  for (const sq of NEXUS_SQUARES) {
    const [x, y] = squareScreenPos(dc, sq, flipped);
    const scx = x + cellSize / 2;
    const scy = y + cellSize / 2;
    const grad = ctx.createRadialGradient(scx, scy, 0, scx, scy, cellSize * 0.55);
    grad.addColorStop(0, `rgba(255,150,160,${pulse + 0.08})`);
    grad.addColorStop(1, "rgba(80,140,200,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, cellSize, cellSize);
  }

  // Painted logo mark (crown + X) — same as Nexus theme
  if (markReady && markImg) {
    const markH = zone * 0.78;
    const aspect = markImg.naturalWidth / Math.max(1, markImg.naturalHeight);
    const markW = markH * aspect;
    const mx = cx - markW / 2;
    const my = cy - markH / 2;
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.48 + pulse * 0.14;
    ctx.drawImage(markImg, mx, my, markW, markH);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.14 + pulse * 0.05;
    ctx.drawImage(markImg, mx, my, markW, markH);
    ctx.restore();
  }

  ctx.strokeStyle = `rgba(255,150,160,${0.55 + pulse})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(minX + 1.5, minY + 1.5, zone - 3, zone - 3);
  ctx.strokeStyle = `rgba(140,210,255,${0.4 + pulse * 0.4})`;
  ctx.lineWidth = 1.25;
  ctx.strokeRect(minX + 5, minY + 5, zone - 10, zone - 10);
}

function drawPieceGlyph(
  ctx: CanvasRenderingContext2D,
  ch: string,
  cx: number,
  cy: number,
  cellSize: number,
  color: "w" | "b",
  kind: import("../core/types").PieceKind,
) {
  drawThemePiece(ctx, color, kind, cx, cy, cellSize, ch);
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
  lastMove: { from: Square; to: Square } | null = null,
) {
  const { ctx, boardX, boardY, cellSize, boardSize, width, height, compact } = dc;

  drawAtmosphere(ctx, width, height, time);
  drawLogoHeader(dc);
  drawBoardShadow(ctx, boardX, boardY, boardSize);

  // Board frame
  ctx.fillStyle = Theme.bgSoft;
  ctx.fillRect(boardX - 3, boardY - 3, boardSize + 6, boardSize + 6);

  const boardTex = getBoardImage();
  if (boardTex && Theme.boardUrl) {
    ctx.save();
    if (flipped) {
      ctx.translate(boardX + boardSize, boardY + boardSize);
      ctx.scale(-1, -1);
      ctx.drawImage(boardTex, 0, 0, boardSize, boardSize);
    } else {
      ctx.drawImage(boardTex, boardX, boardY, boardSize, boardSize);
    }
    ctx.restore();
  } else {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const x = boardX + f * cellSize;
        const y = boardY + (7 - r) * cellSize;
        const br = flipped ? 7 - r : r;
        const bf = flipped ? 7 - f : f;
        const light = (br + bf) % 2 !== 0;
        fillTile(ctx, x, y, cellSize, light);
      }
    }
  }

  // Last move highlight (from + to)
  if (lastMove) {
    for (const sq of [lastMove.from, lastMove.to]) {
      const [x, y] = squareScreenPos(dc, sq, flipped);
      ctx.fillStyle = Theme.angular
        ? Theme.id === "forge"
          ? "rgba(200,100,110,0.22)"
          : "rgba(120,190,230,0.22)"
        : "rgba(220,190,90,0.28)";
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = Theme.angular
        ? Theme.id === "forge"
          ? "rgba(255,140,150,0.35)"
          : "rgba(160,220,255,0.35)"
        : "rgba(230,200,100,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
    }
  }

  // Board frame — sharper chrome on premium themes
  ctx.strokeStyle = Theme.angular ? Theme.hairlineBright : Theme.hairlineStrong;
  ctx.lineWidth = Theme.angular ? 1.5 : 1;
  ctx.strokeRect(boardX - 0.5, boardY - 0.5, boardSize + 1, boardSize + 1);
  if (Theme.angular) {
    ctx.strokeStyle = Theme.accentDim;
    ctx.lineWidth = 1;
    ctx.strokeRect(boardX - 4.5, boardY - 4.5, boardSize + 9, boardSize + 9);
  }

  if (Theme.id === "nexus") {
    drawNexusGlow(dc, time, flipped);
  } else if (Theme.id === "forge") {
    drawForgeNexus(dc, time, flipped);
  } else {
    drawNexusGlow(dc, time, flipped);
  }

  if (selected) {
    const [sx, sy] = squareScreenPos(dc, selected, flipped);
    ctx.fillStyle = Theme.angular
      ? Theme.id === "forge"
        ? "rgba(255,140,150,0.12)"
        : "rgba(140,210,255,0.12)"
      : "rgba(255,255,255,0.1)";
    ctx.fillRect(sx, sy, cellSize, cellSize);
    ctx.strokeStyle = Theme.angular ? Theme.accent : "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.25;
    ctx.strokeRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4);
  }

  const legalSet = new Set(legalMoves.map((m) => m.to));
  for (const sq of legalSet) {
    const [x, y] = squareScreenPos(dc, sq, flipped);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    if (state.board.has(sq)) {
      ctx.strokeStyle = Theme.angular ? Theme.accent : "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = Theme.angular
        ? Theme.id === "forge"
          ? "rgba(255,140,150,0.55)"
          : "rgba(160,230,255,0.55)"
        : "rgba(255,255,255,0.42)";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.8, cellSize * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (activeAbility) {
    for (const sq of abilityTargets) {
      const [x, y] = squareScreenPos(dc, sq, flipped);
      const pulse = 0.55 + 0.25 * (0.5 + 0.5 * Math.sin(time * 5));
      ctx.fillStyle =
        Theme.id === "forge" ? `rgba(255,140,150,${0.18 * pulse})` : `rgba(140,220,255,${0.18 * pulse})`;
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = Theme.accent;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
      // Corner ticks
      const t = Math.max(5, cellSize * 0.14);
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3 + t);
      ctx.lineTo(x + 3, y + 3);
      ctx.lineTo(x + 3 + t, y + 3);
      ctx.moveTo(x + cellSize - 3 - t, y + 3);
      ctx.lineTo(x + cellSize - 3, y + 3);
      ctx.lineTo(x + cellSize - 3, y + 3 + t);
      ctx.stroke();
    }
  }

  for (const [sq, piece] of state.board) {
    if (hideSquare && sq === hideSquare) continue;
    const [x, y] = squareScreenPos(dc, sq, flipped);
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;

    if (piece.isShielded) {
      const pulse = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(time * 3.2));
      ctx.strokeStyle =
        Theme.id === "forge" ? `rgba(255,160,170,${0.55 + pulse * 0.35})` : `rgba(160,230,255,${0.55 + pulse * 0.35})`;
      ctx.lineWidth = 2.5;
      roundRectPath(ctx, x + 4, y + 4, cellSize - 8, cellSize - 8, 3);
      ctx.stroke();
      ctx.strokeStyle =
        Theme.id === "forge" ? `rgba(255,200,210,${0.25 + pulse * 0.2})` : `rgba(200,240,255,${0.25 + pulse * 0.2})`;
      ctx.lineWidth = 1;
      roundRectPath(ctx, x + 8, y + 8, cellSize - 16, cellSize - 16, 2);
      ctx.stroke();
    }

    if (state.overdriveSquare === sq) {
      const pulse = 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(time * 4));
      ctx.fillStyle =
        Theme.id === "forge" ? `rgba(255,120,90,${0.14 + pulse * 0.1})` : `rgba(120,200,255,${0.14 + pulse * 0.1})`;
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = Theme.id === "forge" ? `rgba(255,180,100,${0.7 + pulse * 0.25})` : `rgba(180,230,255,${0.7 + pulse * 0.25})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
    }

    const ch = PIECE_CHARS[piece.color + piece.kind];
    drawPieceGlyph(ctx, ch, cx, cy, cellSize, piece.color, piece.kind);
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
  highlightAbility: Ability | null = null,
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
    const trackW = contentW - labelW - (compact ? 22 : 36);
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

    ctx.fillStyle = Theme.inkMute;
    ctx.font = `500 ${fontSm}px ${Theme.font}`;
    ctx.textAlign = "right";
    ctx.fillText(String(p.mana), contentX + contentW, barY + rowH / 2);
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

  const targeting = highlightAbility && state.turnPhase === "ability" && !state.winner;

  if (targeting) {
    const info = ABILITY_INFO[highlightAbility!];
    const promptY = infoY + (compact ? 16 : 20);
    ctx.fillStyle = Theme.accent;
    ctx.font = `500 ${compact ? 12 : 13}px ${Theme.font}`;
    ctx.textAlign = "left";
    ctx.fillText(`Select a piece for ${info.name}`, contentX, promptY);

    const cancelW = compact ? 72 : 88;
    const cancel: ButtonRect = {
      x: contentX + contentW - cancelW,
      y: promptY - 16,
      w: cancelW,
      h: 28,
      id: "ability-cancel",
    };
    drawPremiumBtn(ctx, cancel, "Cancel", { fontSize: 12 });
    buttons.push(cancel);
  } else if (state.turnPhase === "ability" && !state.winner) {
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
      const icon = a.id === "skip" ? null : getAbilityIcon(a.id);
      const label =
        a.id === "skip" ? "Skip" : compact ? String(a.cost) : `${a.label}  ${a.cost}`;

      drawPremiumBtn(ctx, btn, icon ? "" : label, {
        muted: !canAfford && a.id !== "skip",
        primary: a.id === "skip",
        active: false,
        fontSize: compact ? 11 : 12,
      });

      if (icon && icon.complete) {
        const ih = btnH - 10;
        const iw = ih;
        const ix = bx + (compact ? 6 : 10);
        const iy = btnY + (btnH - ih) / 2;
        ctx.save();
        if (!canAfford) ctx.globalAlpha = 0.35;
        ctx.drawImage(icon, ix, iy, iw, ih);
        ctx.restore();
        if (!compact) {
          ctx.fillStyle = canAfford ? Theme.ink : Theme.inkMute;
          ctx.font = `500 11px ${Theme.font}`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(`${a.label}  ${a.cost}`, ix + iw + 6, btnY + btnH / 2 + 0.5);
        } else {
          ctx.fillStyle = canAfford ? Theme.inkDim : Theme.inkMute;
          ctx.font = `500 10px ${Theme.font}`;
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillText(String(a.cost), bx + bw - 6, btnY + btnH / 2 + 0.5);
        }
      }

      buttons.push(btn);
    }
  } else if (state.turnPhase === "overdrive" && state.overdriveSquare && !state.winner) {
    ctx.fillStyle = Theme.accent;
    ctx.font = `500 ${compact ? 12 : 13}px ${Theme.font}`;
    ctx.textAlign = "left";
    ctx.fillText(
      `Overdrive · move ${state.overdriveSquare} (${state.overdriveMovesLeft} left)`,
      contentX,
      infoY + (compact ? 16 : 20),
    );
  }
}

/** Floating status toast (ability cast, mana warning, etc). */
export function drawToast(
  dc: DrawCtx,
  toast: { text: string; start: number; duration: number } | null,
  now: number,
) {
  if (!toast) return;
  const t = (now - toast.start) / toast.duration;
  if (t < 0 || t >= 1) return;
  const { ctx, width, height, compact } = dc;
  const fade = t < 0.12 ? t / 0.12 : t > 0.75 ? (1 - t) / 0.25 : 1;
  const w = Math.min(width - 32, compact ? 280 : 340);
  const h = compact ? 40 : 44;
  const x = (width - w) / 2;
  const y = height * 0.18;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.fillStyle = "rgba(8,10,14,0.9)";
  roundRectPath(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = Theme.hairlineBright;
  ctx.lineWidth = 1;
  roundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 4);
  ctx.stroke();
  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 13 : 14}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(toast.text, width / 2, y + h / 2 + 0.5);
  ctx.restore();
}

/** Ability info + confirm overlay. Adds ability-confirm / ability-cancel buttons. */
export function drawAbilityConfirm(
  dc: DrawCtx,
  buttons: ButtonRect[],
  ability: Ability,
  canAfford: boolean,
) {
  const { ctx, width, height, compact } = dc;
  const info = ABILITY_INFO[ability];
  const icon = getAbilityIcon(ability);

  ctx.fillStyle = "rgba(4,6,10,0.62)";
  ctx.fillRect(0, 0, width, height);

  const panelW = Math.min(compact ? width - 32 : 360, width - 32);
  const panelH = compact ? 248 : 268;
  const px = (width - panelW) / 2;
  const py = (height - panelH) / 2;

  drawPanel(ctx, px, py, panelW, panelH, { strong: true, fill: true });
  ctx.fillStyle = "rgba(8,12,18,0.92)";
  roundRectPath(ctx, px, py, panelW, panelH);
  ctx.fill();
  drawPanel(ctx, px, py, panelW, panelH, { strong: true, fill: false });

  const pad = compact ? 16 : 22;
  let y = py + pad;

  if (icon && icon.complete) {
    const ih = compact ? 36 : 42;
    ctx.drawImage(icon, px + pad, y, ih, ih);
    ctx.fillStyle = Theme.ink;
    ctx.font = `600 ${compact ? 18 : 20}px ${Theme.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(info.name, px + pad + ih + 12, y + ih / 2 - 8);
    ctx.fillStyle = Theme.inkMute;
    ctx.font = `400 ${compact ? 12 : 13}px ${Theme.font}`;
    ctx.fillText(`${info.cost} mana`, px + pad + ih + 12, y + ih / 2 + 12);
    y += ih + 16;
  } else {
    ctx.fillStyle = Theme.ink;
    ctx.font = `600 ${compact ? 18 : 20}px ${Theme.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(info.name, px + pad, y + 18);
    ctx.fillStyle = Theme.inkMute;
    ctx.font = `400 12px ${Theme.font}`;
    ctx.fillText(`${info.cost} mana`, px + pad, y + 38);
    y += 52;
  }

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 14 : 15}px ${Theme.font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(info.summary, px + pad, y);
  y += compact ? 22 : 26;

  ctx.fillStyle = Theme.inkDim;
  ctx.font = `400 ${compact ? 12 : 13}px ${Theme.font}`;
  const detailLines = wrapText(ctx, info.detail, panelW - pad * 2);
  for (const line of detailLines) {
    ctx.fillText(line, px + pad, y);
    y += compact ? 16 : 18;
  }

  if (!canAfford) {
    y += 6;
    ctx.fillStyle = Theme.id === "nexus" ? "rgba(255,140,140,0.85)" : "rgba(255,160,160,0.8)";
    ctx.font = `500 12px ${Theme.font}`;
    ctx.fillText("Not enough mana.", px + pad, y);
  }

  const btnY = py + panelH - (compact ? 52 : 56);
  const gap = 10;
  const bw = (panelW - pad * 2 - gap) / 2;
  const cancel: ButtonRect = { x: px + pad, y: btnY, w: bw, h: compact ? 36 : 38, id: "ability-cancel" };
  const confirm: ButtonRect = {
    x: px + pad + bw + gap,
    y: btnY,
    w: bw,
    h: compact ? 36 : 38,
    id: "ability-confirm",
  };

  drawPremiumBtn(ctx, cancel, "Cancel", { fontSize: compact ? 13 : 14 });
  drawPremiumBtn(ctx, confirm, canAfford ? "Use Ability" : "Can't Use", {
    primary: canAfford,
    muted: !canAfford,
    fontSize: compact ? 13 : 14,
  });
  buttons.push(cancel, confirm);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
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
