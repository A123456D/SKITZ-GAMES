import { BUILD_LABEL } from "../core/build";
import { arrowsHint, getCard, nodeTitle } from "../core/cards";
import { factionLabel } from "../core/deck";
import { scores, type PlayPreview } from "../core/match";
import {
  CAMPAIGN_NODES,
  isNodeUnlocked,
  loadCampaignProgress,
  nodeStars,
  totalCampaignStars,
} from "../core/campaign";
import { buildDailyChallenge, loadDailyRecord } from "../core/daily";
import { frameStrokeFor, loadMeta } from "../core/meta";
import {
  COLS,
  ROWS,
  listArrows,
  type BoardCard,
  type Direction,
  type MatchState,
  type Pos,
} from "../core/types";
import { getCardArt } from "./cardArt";
import { Motion } from "./motion";
import { getPrefs, type Prefs } from "./prefs";
import { H, W, theme } from "./theme";
import { drawNineSlice, factionSymbol, ui } from "./uiArt";

export type UiOverlay = "none" | "pause" | "settings";

export type DragState = {
  handIndex: number;
  x: number;
  y: number;
  active: boolean;
};

export type DrawUi = {
  overlay: UiOverlay;
  prefs: Prefs;
  drag?: DragState | null;
  preview?: PlayPreview | null;
  previewPos?: Pos | null;
  /** Seconds left showing first-capture coach tip. */
  captureTipLife?: number;
  /** Tutorial coach line override. */
  tutorialLine?: string | null;
  /** Guided tutorial target tile. */
  tutorialPos?: Pos | null;
  /** Guided tutorial hand index. */
  tutorialHand?: number | null;
  /** Showcase signature coach. */
  signatureLine?: string | null;
  signaturePos?: Pos | null;
  signatureHand?: number | null;
  /** End-screen reward / CTA. */
  endReward?: { unlockedCard: string | null; cosmetic: string | null } | null;
  /** Soft daily CTA after versus. */
  showDailyCta?: boolean;
  /** Best-chain replay still playing. */
  replayingChain?: boolean;
  /** Enemy threat coach line + tile. */
  threat?: { label: string; pos: Pos } | null;
  /** Short AI intent while thinking. */
  aiIntent?: string | null;
  /** Board/hand card inspect overlay. */
  inspect?: {
    defId: string;
    power?: number;
    owner?: "player" | "enemy" | null;
  } | null;
  /** Next campaign node id when victory unlocks it. */
  nextCampaignNodeId?: string | null;
  /** Daily share / PB helpers on end screen. */
  dailySummary?: {
    shareLine: string;
    bestScore: number;
    bestChain: number;
    streak: number;
    copied?: boolean;
  } | null;
};

export type Layout = {
  boardX: number;
  boardY: number;
  cellW: number;
  cellH: number;
  gap: number;
  handY: number;
  handCardW: number;
  handCardH: number;
  handGap: number;
  energyBarY: number;
};

export function computeLayout(): Layout {
  const gap = 8;
  const boardW = 560;
  const cellW = (boardW - gap * (COLS - 1)) / COLS;
  const cellH = cellW * 1.05;
  const boardX = (W - boardW) / 2;
  const boardY = 140;
  const handCardW = 172;
  const handCardH = 278;
  const handGap = 10;
  const handY = H - handCardH - 42;
  const energyBarY = handY - 36;
  return {
    boardX,
    boardY,
    cellW,
    cellH,
    gap,
    handY,
    handCardW,
    handCardH,
    handGap,
    energyBarY,
  };
}

export function cellRect(layout: Layout, pos: Pos) {
  const x = layout.boardX + pos.col * (layout.cellW + layout.gap);
  const y = layout.boardY + pos.row * (layout.cellH + layout.gap);
  return { x, y, w: layout.cellW, h: layout.cellH };
}

export function cellCenter(layout: Layout, pos: Pos) {
  const r = cellRect(layout, pos);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function handRect(layout: Layout, index: number, handLen: number) {
  const total = handLen * layout.handCardW + (handLen - 1) * layout.handGap;
  const startX = (W - total) / 2;
  return {
    x: startX + index * (layout.handCardW + layout.handGap),
    y: layout.handY,
    w: layout.handCardW,
    h: layout.handCardH,
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: Direction,
  color: string,
  size: number,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.translate(cx, cy);
  const rot =
    dir === "up" ? 0 : dir === "right" ? Math.PI / 2 : dir === "down" ? Math.PI : -Math.PI / 2;
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.55, size * 0.4);
  ctx.lineTo(-size * 0.55, size * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawInspectPanel(
  ctx: CanvasRenderingContext2D,
  inspect: NonNullable<DrawUi["inspect"]>,
): void {
  const def = getCard(inspect.defId);
  const power = inspect.power ?? def.power;
  const owner = inspect.owner ?? null;

  ctx.fillStyle = "rgba(2,4,10,0.82)";
  ctx.fillRect(0, 0, W, H);

  const panelW = 520;
  const panelH = 780;
  const px = (W - panelW) / 2;
  const py = (H - panelH) / 2;
  const panel = ui("ui-hud-panel.png");
  if (panel) {
    drawNineSlice(ctx, panel, px, py, panelW, panelH, 48);
  } else {
    roundRect(ctx, px, py, panelW, panelH, 18);
    ctx.fillStyle = "rgba(12,18,32,0.96)";
    ctx.fill();
    ctx.strokeStyle = theme.gridCyan;
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.font = "700 13px JetBrains Mono, monospace";
  if (owner === "enemy") {
    ctx.fillStyle = theme.enemy;
    ctx.fillText("OPPONENT CARD", W / 2, py + 36);
  } else if (owner === "player") {
    ctx.fillStyle = theme.player;
    ctx.fillText("YOUR CARD", W / 2, py + 36);
  } else {
    ctx.fillStyle = theme.muted;
    ctx.fillText("CARD INFO", W / 2, py + 36);
  }

  const cw = 240;
  const ch = 380;
  drawCardFace(ctx, (W - cw) / 2, py + 56, cw, ch, inspect.defId, {
    owner: owner ?? undefined,
    power,
  });

  ctx.fillStyle = theme.text;
  ctx.font = "800 24px Orbitron, sans-serif";
  ctx.fillText(def.name, W / 2, py + 470);

  ctx.fillStyle = theme.gridCyan;
  ctx.font = "700 13px JetBrains Mono, monospace";
  ctx.fillText(
    `${nodeTitle(def.node)} · COST ${def.cost} · PWR ${power} · ${arrowsHint(def)}`,
    W / 2,
    py + 500,
  );

  ctx.fillStyle = theme.text;
  ctx.font = "600 14px JetBrains Mono, monospace";
  const lines = wrapText(ctx, def.ability, panelW - 80);
  let ly = py + 536;
  for (const line of lines) {
    ctx.fillText(line, W / 2, ly);
    ly += 20;
  }

  ctx.fillStyle = theme.muted;
  ctx.font = "600 12px JetBrains Mono, monospace";
  ctx.fillText("TAP ANYWHERE TO CLOSE", W / 2, py + panelH - 28);
  ctx.fillText("Tip: tap any board card to inspect", W / 2, py + panelH - 48);
}

function ownerColor(owner: "player" | "enemy"): string {
  return owner === "player" ? theme.player : theme.enemy;
}

function factionAccent(faction: string): string {
  switch (faction) {
    case "volt":
      return theme.energy;
    case "prismatic":
      return theme.gridCyan;
    case "void":
      return theme.gridPurple;
    default:
      return "#9aa8c0";
  }
}

function drawBackdrop(ctx: CanvasRenderingContext2D): void {
  const bgImg = ui("ui-bg-chamber.png");
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, W, H);
    ctx.fillStyle = "rgba(5,8,14,0.35)";
    ctx.fillRect(0, 0, W, H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, theme.bgGradTop);
    bg.addColorStop(1, theme.bgGradBot);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }
}

export function drawCardFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  defId: string,
  opts: {
    owner?: "player" | "enemy";
    power?: number;
    selected?: boolean;
    dimmed?: boolean;
    compact?: boolean;
  } = {},
): void {
  const def = getCard(defId);
  const accent = opts.owner ? ownerColor(opts.owner) : factionAccent(def.faction);
  const power = opts.power ?? def.power;
  const art = getCardArt(defId);
  const frame = ui("ui-card-frame.png");
  const cosmeticFrame = opts.owner === "player" || !opts.owner ? loadMeta().cosmetics.frame : "default";
  const frameAccent = frameStrokeFor(cosmeticFrame);

  ctx.save();
  if (opts.dimmed) ctx.globalAlpha = 0.42;

  // Drop shadow
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = "#0a1018";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Brushed metal surface
  roundRect(ctx, x, y, w, h, 16);
  const surface = ctx.createLinearGradient(x, y, x + w, y + h);
  surface.addColorStop(0, "#243044");
  surface.addColorStop(0.2, "#1a2438");
  surface.addColorStop(0.55, "#121a28");
  surface.addColorStop(1, "#0a1018");
  ctx.fillStyle = surface;
  ctx.fill();

  // Bevel highlight / shadow edges
  ctx.save();
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 15);
  ctx.strokeStyle = "rgba(220,235,255,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 13);
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Faction edge rail
  const rail = factionAccent(def.faction);
  ctx.fillStyle = rail;
  ctx.globalAlpha = 0.85;
  roundRect(ctx, x + 4, y + 18, 5, h - 36, 3);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Selection / outer edge
  ctx.lineWidth = opts.selected ? 3.5 : 1.75;
  ctx.strokeStyle = opts.selected
    ? accent
    : frameAccent ?? "rgba(160,185,220,0.4)";
  ctx.shadowColor = opts.selected ? accent : frameAccent ?? "transparent";
  ctx.shadowBlur = opts.selected ? 16 : frameAccent ? 10 : 0;
  roundRect(ctx, x, y, w, h, 16);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Premium frame overlay (subtle)
  if (frame) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    drawNineSlice(ctx, frame, x - 2, y - 2, w + 4, h + 4, 56);
    ctx.restore();
  }

  // Art window
  const artPadX = w * 0.1;
  const artTop = y + (opts.compact ? h * 0.14 : h * 0.16);
  const artH = opts.compact ? h * 0.58 : h * 0.42;
  const artW = w - artPadX * 2;
  const artBox = { x: x + artPadX, y: artTop, w: artW, h: artH };

  roundRect(ctx, artBox.x, artBox.y, artBox.w, artBox.h, 10);
  ctx.fillStyle = "#05070c";
  ctx.fill();
  ctx.save();
  roundRect(ctx, artBox.x, artBox.y, artBox.w, artBox.h, 10);
  ctx.clip();
  if (art) {
    const side = Math.min(artBox.w, artBox.h) * 0.95;
    ctx.drawImage(
      art,
      artBox.x + (artBox.w - side) / 2,
      artBox.y + (artBox.h - side) / 2,
      side,
      side,
    );
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(46,240,255,0.28)";
  ctx.lineWidth = 1;
  roundRect(ctx, artBox.x, artBox.y, artBox.w, artBox.h, 10);
  ctx.stroke();

  // Vector arrows on art window edges
  const dirs = listArrows(def.arrows);
  const ax = artBox.x + artBox.w / 2;
  const ay = artBox.y + artBox.h / 2;
  const reachX = artBox.w * 0.42;
  const reachY = artBox.h * 0.42;
  for (const d of dirs) {
    const ox = d === "left" ? -reachX : d === "right" ? reachX : 0;
    const oy = d === "up" ? -reachY : d === "down" ? reachY : 0;
    drawArrow(ctx, ax + ox, ay + oy, d, accent, opts.compact ? 11 : 13);
  }

  // Cost gem
  roundRect(ctx, x + 10, y + 10, 34, 28, 8);
  const costGrad = ctx.createLinearGradient(x + 10, y + 10, x + 44, y + 38);
  costGrad.addColorStop(0, "#ffe566");
  costGrad.addColorStop(1, "#c9a000");
  ctx.fillStyle = costGrad;
  ctx.fill();
  ctx.fillStyle = "#1a1200";
  ctx.font = "800 15px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(def.cost), x + 27, y + 25);

  // Power gem
  roundRect(ctx, x + w - 44, y + 10, 34, 28, 8);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = "800 15px Orbitron, sans-serif";
  ctx.fillText(String(power), x + w - 27, y + 25);

  // Text plate
  const plateY = opts.compact ? y + h - 34 : y + h * 0.62;
  const plateH = opts.compact ? 26 : h * 0.34;
  roundRect(ctx, x + 10, plateY, w - 20, plateH, 10);
  ctx.fillStyle = "rgba(6,10,18,0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  ctx.font = opts.compact ? "700 9px Orbitron, sans-serif" : "700 11px Orbitron, sans-serif";
  ctx.fillText(nodeTitle(def.node), x + w / 2, plateY + (opts.compact ? 10 : 14));

  ctx.fillStyle = theme.text;
  ctx.font = opts.compact ? "700 11px Orbitron, sans-serif" : "800 13px Orbitron, sans-serif";
  ctx.fillText(def.name, x + w / 2, plateY + (opts.compact ? 20 : 32));

  if (!opts.compact) {
    ctx.fillStyle = "#b8c6dc";
    ctx.font = "600 11px JetBrains Mono, monospace";
    const lines = wrapText(ctx, def.ability, w - 28);
    lines.forEach((line, i) => {
      ctx.fillText(line, x + w / 2, plateY + 48 + i * 14);
    });
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.95;
    ctx.font = "800 14px Orbitron, sans-serif";
    ctx.fillText(arrowsHint(def), x + w / 2, plateY + plateH - 12);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawBoardCard(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  pos: Pos,
  bc: BoardCard,
): void {
  const r = cellRect(layout, pos);
  drawCardFace(ctx, r.x + 3, r.y + 3, r.w - 6, r.h - 6, bc.defId, {
    owner: bc.owner,
    power: bc.power,
    compact: true,
  });
}

function drawPlacementPreview(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: MatchState,
  pos: Pos,
  preview: PlayPreview,
  handIndex: number,
): void {
  const defId = state.players.player.hand[handIndex];
  if (!defId) return;
  const r = cellRect(layout, pos);

  // Target tile glow
  roundRect(ctx, r.x, r.y, r.w, r.h, 12);
  ctx.strokeStyle = preview.ok ? theme.player : theme.danger;
  ctx.lineWidth = 3;
  ctx.shadowColor = preview.ok ? theme.player : theme.danger;
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (!preview.ok) {
    ctx.fillStyle = "rgba(255,77,109,0.18)";
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.fillStyle = theme.danger;
    ctx.font = "700 12px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CAN'T PLAY", r.x + r.w / 2, r.y + r.h / 2);
    return;
  }

  // Ghost card on tile
  ctx.globalAlpha = 0.72;
  drawCardFace(ctx, r.x + 6, r.y + 6, r.w - 12, r.h - 12, defId, {
    owner: "player",
    compact: true,
  });
  ctx.globalAlpha = 1;

  // Beam paths + hit markers
  for (const e of preview.events) {
    if (e.type === "beam") {
      const from = cellCenter(layout, e.beam.from);
      let to = from;
      if (e.beam.to) {
        to = cellCenter(layout, e.beam.to);
      } else {
        const reach = layout.cellW * 1.2;
        if (e.beam.dir === "up") to = { x: from.x, y: from.y - reach };
        if (e.beam.dir === "down") to = { x: from.x, y: from.y + reach };
        if (e.beam.dir === "left") to = { x: from.x - reach, y: from.y };
        if (e.beam.dir === "right") to = { x: from.x + reach, y: from.y };
      }
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = e.beam.kind === "miss" ? theme.muted : theme.gridCyan;
      ctx.shadowColor = theme.gridCyan;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.setLineDash(e.beam.kind === "miss" ? [6, 6] : []);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    }
    if (e.type === "damage") {
      const c = cellRect(layout, e.pos);
      roundRect(ctx, c.x + 4, c.y + 4, c.w - 8, c.h - 8, 10);
      ctx.strokeStyle = theme.danger;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = theme.danger;
      ctx.font = "800 14px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`-${e.amount}`, c.x + c.w / 2, c.y + 18);
    }
    if (e.type === "capture") {
      const c = cellRect(layout, e.pos);
      roundRect(ctx, c.x + 4, c.y + 4, c.w - 8, c.h - 8, 10);
      ctx.strokeStyle = theme.player;
      ctx.lineWidth = 3;
      ctx.shadowColor = theme.player;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = theme.player;
      ctx.font = "800 11px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CAPTURE", c.x + c.w / 2, c.y + c.h - 14);
    }
    if (e.type === "relay") {
      const c = cellRect(layout, e.pos);
      ctx.fillStyle = theme.energy;
      ctx.font = "700 10px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CHAIN", c.x + c.w / 2, c.y + 16);
    }
  }

  // Summary strip under board
  const boardBottom =
    layout.boardY + layout.cellH * ROWS + layout.gap * (ROWS - 1) + 10;
  if (boardBottom + 40 < layout.energyBarY) {
    roundRect(ctx, 40, boardBottom, W - 80, 40, 12);
    ctx.fillStyle = "rgba(6,12,20,0.92)";
    ctx.fill();
    ctx.strokeStyle = theme.player;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = theme.text;
    ctx.font = "700 12px Orbitron, sans-serif";
    const parts = [
      preview.damage > 0 ? `DMG ${preview.damage}` : null,
      preview.captures > 0 ? `CAPTURE ${preview.captures}` : null,
      preview.relays > 0 ? `CHAIN ${preview.relays}` : null,
      preview.signatureVerb ? preview.signatureVerb : null,
      `SCORE ${preview.scoreDelta >= 0 ? "+" : ""}${preview.scoreDelta}`,
    ].filter(Boolean);
    ctx.fillText(parts.join("  ·  ") || "PLACE HERE", W / 2, boardBottom + 20);
  }
}

function drawUiButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: string,
  kind: "primary" | "ghost" | "pass" = "primary",
): void {
  const img =
    kind === "pass"
      ? ui("ui-btn-pass.png")
      : kind === "ghost"
        ? ui("ui-btn-ghost.png")
        : ui("ui-btn-primary.png");
  if (img) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    roundRect(ctx, x, y, w, h, 14);
    ctx.fillStyle = "rgba(12,16,28,0.95)";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.font = "800 18px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.shadowBlur = 0;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: MatchState,
  layout: Layout,
  motion: Motion,
  selectedHand: number | null,
  hoverTile: Pos | null,
  uiState: DrawUi = { overlay: "none", prefs: getPrefs() },
): void {
  drawBackdrop(ctx);
  const sc = scores(state);

  if (state.phase === "menu" || state.phase === "faction_pick") {
    drawMenu(ctx, state);
    drawChromeButtons(ctx, state);
    if (uiState.overlay === "settings") drawSettingsOverlay(ctx, uiState.prefs);
    motion.draw(ctx, W, H);
    return;
  }

  if (state.phase === "campaign_map") {
    drawCampaignMap(ctx);
    drawChromeButtons(ctx, state);
    if (uiState.overlay === "settings") drawSettingsOverlay(ctx, uiState.prefs);
    motion.draw(ctx, W, H);
    return;
  }

  // HUD panel
  const hud = ui("ui-hud-panel.png");
  if (hud) ctx.drawImage(hud, 28, 18, W - 56, 110);
  else {
    roundRect(ctx, 40, 28, W - 80, 100, 16);
    ctx.fillStyle = theme.panel;
    ctx.fill();
  }

  // Faction emblems beside scores
  const youSym = factionSymbol(state.players.player.faction);
  const oppSym = factionSymbol(state.players.enemy.faction);
  if (youSym) ctx.drawImage(youSym, 48, 36, 44, 44);
  if (oppSym) ctx.drawImage(oppSym, W - 160, 36, 44, 44);

  drawChromeButtons(ctx, state);

  const youX = youSym ? 100 : 70;
  const oppX = oppSym ? W - 168 : W - 70;
  const dYou = state.lastScoreDelta.player;
  const dOpp = state.lastScoreDelta.enemy;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.player;
  ctx.font = "800 34px Orbitron, sans-serif";
  ctx.fillText(String(sc.player), youX, 58);
  if (dYou !== 0) {
    ctx.fillStyle = dYou > 0 ? theme.player : theme.danger;
    ctx.font = "800 13px Orbitron, sans-serif";
    ctx.fillText(`${dYou > 0 ? "+" : ""}${dYou}`, youX + 52, 48);
  }
  ctx.fillStyle = theme.muted;
  ctx.font = "600 11px JetBrains Mono, monospace";
  ctx.fillText("YOU · SCORE", youX, 92);

  ctx.textAlign = "center";
  ctx.fillStyle = theme.text;
  ctx.font = "700 16px Orbitron, sans-serif";
  ctx.fillText(
    state.tutorial
      ? state.tutorialStep === 0
        ? "TUTORIAL"
        : `TUTORIAL ${Math.min(state.tutorialStep, 4)}/4`
      : state.mode === "daily"
        ? `DAILY ${state.dailyKey?.slice(5) ?? ""}`
        : state.mode === "campaign"
          ? "CAMPAIGN"
          : `ROUND ${state.round}/6`,
    W / 2,
    48,
  );
  ctx.fillStyle = theme.muted;
  ctx.font = "600 11px JetBrains Mono, monospace";
  const turnLabel =
    state.phase === "cascading"
      ? "CHAINING…"
      : state.active === "player"
        ? "YOUR TURN"
        : "ENEMY TURN";
  ctx.fillText(turnLabel, W / 2, 70);
  ctx.fillStyle = theme.gridCyan;
  ctx.font = "800 22px Orbitron, sans-serif";
  let centerStat = "∞";
  if (state.mode === "daily" && state.playsLeft !== null) {
    centerStat = `${state.playsLeft}P`;
  } else if (state.phase === "cascading") {
    centerStat = "···";
  } else if (uiState.prefs.timer && state.mode === "versus") {
    centerStat = `${Math.ceil(state.turnSecondsLeft)}s`;
  } else if (state.mode === "campaign" || state.mode === "tutorial") {
    centerStat = `R${state.round}`;
  } else if (uiState.prefs.timer) {
    centerStat = `${Math.ceil(state.turnSecondsLeft)}s`;
  }
  ctx.fillText(centerStat, W / 2, 98);

  ctx.textAlign = "right";
  ctx.fillStyle = theme.enemy;
  ctx.font = "800 34px Orbitron, sans-serif";
  ctx.fillText(String(sc.enemy), oppX, 58);
  if (dOpp !== 0) {
    ctx.textAlign = "right";
    ctx.fillStyle = dOpp > 0 ? theme.enemy : theme.player;
    ctx.font = "800 13px Orbitron, sans-serif";
    ctx.fillText(`${dOpp > 0 ? "+" : ""}${dOpp}`, oppX - 52, 48);
  }
  ctx.fillStyle = theme.muted;
  ctx.font = "600 11px JetBrains Mono, monospace";
  ctx.fillText("OPP · SCORE", oppX, 92);

  // Board panel
  const boardW = layout.cellW * COLS + layout.gap * (COLS - 1);
  const boardH = layout.cellH * ROWS + layout.gap * (ROWS - 1);
  const boardPanel = ui("ui-board-panel.png");
  if (boardPanel) {
    ctx.drawImage(
      boardPanel,
      layout.boardX - 22,
      layout.boardY - 22,
      boardW + 44,
      boardH + 44,
    );
  } else {
    roundRect(ctx, layout.boardX - 14, layout.boardY - 14, boardW + 28, boardH + 28, 18);
    ctx.fillStyle = theme.board;
    ctx.fill();
  }

  const tileImg = ui("ui-tile-empty.png");
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const pos = { col, row };
      const r = cellRect(layout, pos);
      if (tileImg) ctx.drawImage(tileImg, r.x, r.y, r.w, r.h);
      else {
        roundRect(ctx, r.x, r.y, r.w, r.h, 12);
        ctx.fillStyle = "rgba(15, 20, 35, 0.9)";
        ctx.fill();
        ctx.strokeStyle = theme.gridCyan;
        ctx.globalAlpha = 0.35;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (
        hoverTile &&
        hoverTile.col === col &&
        hoverTile.row === row &&
        !state.board[row][col] &&
        selectedHand !== null
      ) {
        ctx.strokeStyle = theme.player;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 3;
        roundRect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 10);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (
        uiState.threat &&
        uiState.threat.pos.col === col &&
        uiState.threat.pos.row === row &&
        !state.board[row][col]
      ) {
        ctx.strokeStyle = theme.danger;
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        roundRect(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 10);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      if (
        uiState.tutorialPos &&
        uiState.tutorialPos.col === col &&
        uiState.tutorialPos.row === row
      ) {
        ctx.strokeStyle = theme.energy;
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 3;
        ctx.shadowColor = theme.energy;
        ctx.shadowBlur = 14;
        roundRect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      if (
        uiState.signaturePos &&
        uiState.signaturePos.col === col &&
        uiState.signaturePos.row === row
      ) {
        ctx.strokeStyle = theme.gridPurple;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 3;
        ctx.shadowColor = theme.gridPurple;
        ctx.shadowBlur = 12;
        roundRect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      const bc = state.board[row][col];
      if (bc) drawBoardCard(ctx, layout, pos, bc);
    }
  }

  // Placement preview (selected or dragging over a tile)
  if (
    uiState.preview &&
    uiState.previewPos &&
    (selectedHand !== null || uiState.drag?.active)
  ) {
    drawPlacementPreview(ctx, layout, state, uiState.previewPos, uiState.preview, selectedHand ?? uiState.drag!.handIndex);
  }

  // Energy
  const barX = 70;
  const barW = W - 140;
  const energyImg = ui("ui-energy-bar.png");
  ctx.fillStyle = theme.muted;
  ctx.font = "600 11px JetBrains Mono, monospace";
  ctx.textAlign = "left";
  ctx.fillText(`ENERGY ${state.energy}/${state.energyMax}`, barX, layout.energyBarY - 6);
  if (energyImg) ctx.drawImage(energyImg, barX, layout.energyBarY - 4, barW, 28);
  const fillW = (barW - 24) * (state.energyMax ? state.energy / state.energyMax : 0);
  if (fillW > 0) {
    roundRect(ctx, barX + 12, layout.energyBarY + 4, fillW, 12, 6);
    ctx.fillStyle = theme.energy;
    ctx.shadowColor = theme.energy;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Hand
  if (state.phase === "playing" || state.phase === "ai_thinking" || state.phase === "cascading") {
    const hand = state.players.player.hand;
    for (let i = 0; i < hand.length; i++) {
      const hr = handRect(layout, i, hand.length);
      const def = getCard(hand[i]);
      const dimmed =
        (state.phase === "playing" && def.cost > state.energy) ||
        (uiState.drag?.active === true && uiState.drag.handIndex === i);
      const lift =
        (selectedHand === i ||
          uiState.tutorialHand === i ||
          uiState.signatureHand === i) &&
        !uiState.drag?.active
          ? -10
          : 0;
      drawCardFace(ctx, hr.x, hr.y + lift, hr.w, hr.h, hand[i], {
        owner: "player",
        selected:
          (selectedHand === i ||
            uiState.tutorialHand === i ||
            uiState.signatureHand === i) &&
          !uiState.drag?.active,
        dimmed,
      });
    }
    if (state.mulliganAvailable && state.phase === "playing" && state.active === "player") {
      drawUiButton(ctx, W / 2 - 200, H - 38, 120, 32, "MULLIGAN", theme.gridPurple, "ghost");
      drawUiButton(ctx, W / 2 - 60, H - 38, 120, 32, "PASS", theme.muted, "pass");
    } else if (state.tutorial && state.phase === "playing") {
      drawUiButton(ctx, W / 2 - 200, H - 38, 120, 32, "SKIP TUT", theme.gridPurple, "ghost");
      drawUiButton(ctx, W / 2 - 60, H - 38, 120, 32, "PASS", theme.muted, "pass");
    } else {
      drawUiButton(ctx, W / 2 - 70, H - 38, 140, 32, "PASS", theme.muted, "pass");
    }
  }

  if (uiState.captureTipLife && uiState.captureTipLife > 0) {
    const a = Math.min(1, uiState.captureTipLife);
    roundRect(ctx, 40, 140, W - 80, 56, 12);
    ctx.fillStyle = `rgba(6,14,24,${0.88 * a})`;
    ctx.fill();
    ctx.strokeStyle = theme.player;
    ctx.globalAlpha = a;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.player;
    ctx.font = "800 13px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OVERTHROW", W / 2, 160);
    ctx.fillStyle = theme.text;
    ctx.font = "600 11px JetBrains Mono, monospace";
    ctx.fillText("Enemy hit 0 Power → you steal the tile at Power 1", W / 2, 180);
  }

  if (uiState.tutorialLine) {
    const raw = uiState.tutorialLine;
    const pipe = raw.indexOf("|");
    const headline = pipe >= 0 ? raw.slice(0, pipe) : raw;
    const body = pipe >= 0 ? raw.slice(pipe + 1) : "";
    const intro = headline === "HOW IT WORKS";

    const boxX = 24;
    const boxY = intro ? 108 : 112;
    const boxW = W - 48;
    const boxH = intro ? 200 : body ? 100 : 72;
    roundRect(ctx, boxX, boxY, boxW, boxH, 14);
    ctx.fillStyle = "rgba(6,10,18,0.97)";
    ctx.fill();
    ctx.strokeStyle = theme.energy;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = theme.energy;
    ctx.font = intro ? "800 22px Orbitron, sans-serif" : "800 18px Orbitron, sans-serif";
    ctx.fillText(headline, W / 2, boxY + (body ? 28 : boxH / 2));

    if (body) {
      ctx.fillStyle = theme.text;
      ctx.font = intro ? "700 15px Orbitron, sans-serif" : "700 15px Orbitron, sans-serif";
      const maxChars = intro ? 34 : 36;
      const bodyLines: string[] = [];
      let rest = body;
      while (rest.length > maxChars) {
        let cut = rest.lastIndexOf(" ", maxChars);
        if (cut < 12) cut = maxChars;
        bodyLines.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      if (rest) bodyLines.push(rest);
      const startY = boxY + (intro ? 58 : 58);
      for (let i = 0; i < bodyLines.length; i++) {
        ctx.fillText(bodyLines[i], W / 2, startY + i * (intro ? 22 : 20));
      }
      if (intro) {
        drawUiButton(
          ctx,
          W / 2 - 110,
          boxY + boxH - 52,
          220,
          40,
          "NEXT ▶",
          theme.player,
          "primary",
        );
      }
    }
  } else if (uiState.signatureLine) {
    roundRect(ctx, 36, 128, W - 72, 56, 10);
    ctx.fillStyle = "rgba(8,12,22,0.94)";
    ctx.fill();
    ctx.strokeStyle = theme.gridPurple;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = theme.text;
    ctx.font = "600 11px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tip = uiState.signatureLine;
    if (tip.length > 56) {
      const cut = tip.lastIndexOf(" ", 56);
      ctx.fillText(tip.slice(0, cut > 0 ? cut : 56), W / 2, 148);
      ctx.fillText(tip.slice(cut > 0 ? cut + 1 : 56), W / 2, 166);
    } else {
      ctx.fillText(tip, W / 2, 156);
    }
  } else if (uiState.aiIntent) {
    roundRect(ctx, 36, 138, W - 72, 44, 10);
    ctx.fillStyle = "rgba(8,12,22,0.9)";
    ctx.fill();
    ctx.strokeStyle = theme.enemy;
    ctx.stroke();
    ctx.fillStyle = theme.enemy;
    ctx.font = "700 12px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(uiState.aiIntent, W / 2, 160);
  } else if (uiState.threat && state.phase === "playing") {
    roundRect(ctx, 36, 138, W - 72, 44, 10);
    ctx.fillStyle = "rgba(8,12,22,0.9)";
    ctx.fill();
    ctx.strokeStyle = theme.danger;
    ctx.stroke();
    ctx.fillStyle = theme.danger;
    ctx.font = "700 12px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(uiState.threat.label, W / 2, 160);
  } else if (state.objective && !state.tutorial) {
    roundRect(ctx, 36, 138, W - 72, 44, 10);
    ctx.fillStyle = "rgba(8,12,22,0.9)";
    ctx.fill();
    ctx.strokeStyle = theme.energy;
    ctx.stroke();
    ctx.fillStyle = theme.energy;
    ctx.font = "700 11px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${state.objective.label}  ·  ${state.objective.progress}/${state.objective.target}`,
      W / 2,
      160,
    );
  }

  // Floating drag card
  if (uiState.drag?.active && state.phase === "playing") {
    const defId = state.players.player.hand[uiState.drag.handIndex];
    if (defId) {
      const cw = layout.handCardW * 0.85;
      const ch = layout.handCardH * 0.85;
      drawCardFace(
        ctx,
        uiState.drag.x - cw / 2,
        uiState.drag.y - ch / 2,
        cw,
        ch,
        defId,
        { owner: "player", selected: true },
      );
    }
  }

  // Selected card helper strip
  if (selectedHand !== null && state.phase === "playing" && !uiState.inspect) {
    const def = getCard(state.players.player.hand[selectedHand]);
    const stripY = layout.boardY + layout.cellH * ROWS + layout.gap * (ROWS - 1) + 8;
    if (stripY + 36 < layout.energyBarY - 4) {
      roundRect(ctx, 50, stripY, W - 100, 36, 10);
      ctx.fillStyle = "rgba(8,12,20,0.92)";
      ctx.fill();
      ctx.strokeStyle = factionAccent(def.faction);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = theme.text;
      ctx.font = "700 11px Orbitron, sans-serif";
      ctx.fillText(`${def.name} · ${nodeTitle(def.node)}`, W / 2, stripY + 12);
      ctx.fillStyle = theme.muted;
      ctx.font = "600 10px JetBrains Mono, monospace";
      ctx.fillText(def.ability, W / 2, stripY + 26);
    }
  }

  if (uiState.inspect) {
    drawInspectPanel(ctx, uiState.inspect);
  }

  if (state.phase === "match_over") {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = theme.text;
    ctx.font = "800 42px Orbitron, sans-serif";
    ctx.textAlign = "center";
    const title =
      state.winner === "player" ? "VICTORY" : state.winner === "enemy" ? "DEFEAT" : "DRAW";
    ctx.fillText(title, W / 2, H * 0.28);
    ctx.fillStyle = theme.muted;
    ctx.font = "600 16px JetBrains Mono, monospace";
    ctx.fillText(`${sc.player} — ${sc.enemy}`, W / 2, H * 0.28 + 40);
    ctx.fillStyle = theme.gridCyan;
    ctx.font = "700 13px Orbitron, sans-serif";
    ctx.fillText(`BEST CHAIN x${Math.max(1, state.maxChainDepth)}`, W / 2, H * 0.28 + 72);

    if (uiState.replayingChain) {
      ctx.fillStyle = theme.energy;
      ctx.font = "600 12px JetBrains Mono, monospace";
      ctx.fillText("REPLAYING BEST CHAIN…", W / 2, H * 0.28 + 100);
    } else {
      if (state.objective) {
        ctx.fillStyle = theme.energy;
        ctx.font = "700 12px Orbitron, sans-serif";
        ctx.fillText(
          `${state.objective.label}: ${state.objective.progress}/${state.objective.target}`,
          W / 2,
          H * 0.28 + 100,
        );
      }
      if (uiState.endReward?.unlockedCard) {
        ctx.fillStyle = theme.player;
        ctx.font = "700 12px Orbitron, sans-serif";
        ctx.fillText(`UNLOCKED CARD · ${uiState.endReward.unlockedCard}`, W / 2, H * 0.28 + 124);
      }
      if (uiState.endReward?.cosmetic) {
        ctx.fillStyle = theme.energy;
        ctx.font = "600 11px JetBrains Mono, monospace";
        ctx.fillText(uiState.endReward.cosmetic, W / 2, H * 0.28 + 146);
      }

      if (state.mode === "daily" && uiState.dailySummary) {
        const d = uiState.dailySummary;
        ctx.fillStyle = theme.muted;
        ctx.font = "600 11px JetBrains Mono, monospace";
        ctx.fillText(
          `PB ${d.bestScore} · CHAIN ${d.bestChain}${d.streak > 1 ? ` · STREAK ${d.streak}` : ""}`,
          W / 2,
          H * 0.28 + 168,
        );
        ctx.fillStyle = theme.text;
        ctx.font = "600 10px JetBrains Mono, monospace";
        const lines = d.shareLine.split("\n");
        ctx.fillText(lines[0] ?? "", W / 2, H * 0.28 + 190);
        if (lines[1]) ctx.fillText(lines[1], W / 2, H * 0.28 + 206);
      }

      let btnY = H * 0.52;
      if (state.mode === "daily") btnY = H * 0.56;
      if (state.mode === "tutorial") {
        drawUiButton(ctx, W / 2 - 150, btnY, 300, 56, "PLAY MATCH", theme.player, "primary");
        drawUiButton(ctx, W / 2 - 150, btnY + 70, 300, 52, "REMATCH TUTORIAL", theme.energy, "ghost");
        drawUiButton(ctx, W / 2 - 150, btnY + 134, 300, 52, "MAIN MENU", theme.muted, "ghost");
      } else {
        drawUiButton(ctx, W / 2 - 150, btnY, 300, 56, "REMATCH", theme.player, "primary");
        if (state.mode === "daily") {
          drawUiButton(
            ctx,
            W / 2 - 150,
            btnY + 66,
            300,
            52,
            uiState.dailySummary?.copied ? "COPIED ✓" : "COPY SHARE",
            theme.gridCyan,
            "ghost",
          );
          drawUiButton(ctx, W / 2 - 150, btnY + 130, 300, 52, "MAIN MENU", theme.muted, "ghost");
        } else if (uiState.showDailyCta) {
          drawUiButton(ctx, W / 2 - 150, btnY + 70, 300, 52, "TRY DAILY", theme.gridPurple, "ghost");
          drawUiButton(ctx, W / 2 - 150, btnY + 134, 300, 52, "MAIN MENU", theme.muted, "ghost");
        } else if (state.mode === "campaign") {
          if (uiState.nextCampaignNodeId && state.winner === "player") {
            drawUiButton(ctx, W / 2 - 150, btnY + 70, 300, 52, "NEXT NODE ▶", theme.energy, "primary");
            drawUiButton(ctx, W / 2 - 150, btnY + 134, 300, 52, "CAMPAIGN MAP", theme.gridCyan, "ghost");
            drawUiButton(ctx, W / 2 - 150, btnY + 198, 300, 52, "MAIN MENU", theme.muted, "ghost");
          } else {
            drawUiButton(ctx, W / 2 - 150, btnY + 70, 300, 52, "CAMPAIGN MAP", theme.energy, "ghost");
            drawUiButton(ctx, W / 2 - 150, btnY + 134, 300, 52, "MAIN MENU", theme.muted, "ghost");
          }
        } else {
          drawUiButton(ctx, W / 2 - 150, btnY + 70, 300, 52, "MAIN MENU", theme.muted, "ghost");
        }
      }
    }
  }

  if (
    state.tutorial &&
    state.phase === "playing" &&
    uiState.tutorialHand != null &&
    uiState.tutorialPos
  ) {
    drawTutorialArrows(
      ctx,
      layout,
      uiState.tutorialHand,
      uiState.tutorialPos,
      state.players.player.hand.length,
    );
  }

  if (uiState.overlay === "pause") drawPauseOverlay(ctx);
  if (uiState.overlay === "settings") drawSettingsOverlay(ctx, uiState.prefs);

  motion.draw(ctx, W, H);
}

function drawTutorialArrows(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  handIndex: number,
  pos: Pos,
  handLen: number,
): void {
  const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 220);
  const hr = handRect(layout, handIndex, handLen);
  const tr = cellRect(layout, pos);
  const handCx = hr.x + hr.w / 2;
  const handCy = hr.y + 8;
  const tileCx = tr.x + tr.w / 2;
  const tileCy = tr.y + tr.h / 2;

  // Badge "1" above the coached hand card.
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.45 * pulse;
  roundRect(ctx, handCx - 16, handCy - 48, 32, 28, 8);
  ctx.fillStyle = theme.energy;
  ctx.fill();
  ctx.fillStyle = "#0a1018";
  ctx.font = "800 16px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("1", handCx, handCy - 34);

  // Chevron pointing down at the hand card.
  ctx.beginPath();
  ctx.moveTo(handCx, handCy - 14);
  ctx.lineTo(handCx - 12, handCy - 28);
  ctx.lineTo(handCx + 12, handCy - 28);
  ctx.closePath();
  ctx.fillStyle = theme.energy;
  ctx.fill();

  // Curved guide from hand to tile.
  const midX = (handCx + tileCx) / 2;
  const midY = Math.min(handCy, tileCy) - 40;
  ctx.strokeStyle = theme.energy;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(handCx, handCy - 8);
  ctx.quadraticCurveTo(midX, midY, tileCx, tileCy + tr.h / 2 + 8);
  ctx.stroke();
  ctx.setLineDash([]);

  // Badge "2" + arrowhead into the tile.
  roundRect(ctx, tileCx - 16, tileCy - tr.h / 2 - 40, 32, 28, 8);
  ctx.fillStyle = theme.player;
  ctx.fill();
  ctx.fillStyle = "#041016";
  ctx.fillText("2", tileCx, tileCy - tr.h / 2 - 26);

  ctx.beginPath();
  ctx.moveTo(tileCx, tileCy - tr.h / 2 + 4);
  ctx.lineTo(tileCx - 14, tileCy - tr.h / 2 - 14);
  ctx.lineTo(tileCx + 14, tileCy - tr.h / 2 - 14);
  ctx.closePath();
  ctx.fillStyle = theme.player;
  ctx.fill();
  ctx.restore();
}

export function tutorialNextBtnRect(): { x: number; y: number; w: number; h: number } {
  // Matches intro tip panel NEXT button in drawFrame (boxY 108, boxH 200).
  return { x: W / 2 - 110, y: 108 + 200 - 52, w: 220, h: 40 };
}

export function hitTutorialNext(x: number, y: number, state: MatchState): boolean {
  if (!state.tutorial || state.phase !== "playing" || state.tutorialStep !== 0) {
    return false;
  }
  // Whole intro coach panel advances — easier than hunting the button only.
  if (x >= 24 && x <= W - 24 && y >= 108 && y <= 108 + 200) return true;
  const b = tutorialNextBtnRect();
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

const ICON = 56;
export function menuBtnRect() {
  return { x: W - 28 - ICON, y: 22, w: ICON, h: ICON };
}
export function settingsBtnRect() {
  return { x: W - 28 - ICON * 2 - 10, y: 22, w: ICON, h: ICON };
}

function drawChromeButtons(ctx: CanvasRenderingContext2D, state: MatchState): void {
  // Always-visible prototype stamp (bottom-left) so every screen reads as early build.
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(180, 200, 220, 0.45)";
  ctx.font = "600 10px JetBrains Mono, monospace";
  ctx.fillText(BUILD_LABEL, 16, H - 12);

  const menuImg = ui("ui-icon-menu.png");
  const setImg = ui("ui-icon-settings.png");
  const m = menuBtnRect();
  const s = settingsBtnRect();

  const showMenu = state.phase !== "menu";
  if (showMenu) {
    if (menuImg) ctx.drawImage(menuImg, m.x, m.y, m.w, m.h);
    else drawFallbackIcon(ctx, m.x, m.y, m.w, "☰");
  }
  if (setImg) ctx.drawImage(setImg, s.x, s.y, s.w, s.h);
  else drawFallbackIcon(ctx, s.x, s.y, s.w, "⚙");
}

function drawFallbackIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  glyph: string,
): void {
  roundRect(ctx, x, y, size, size, 12);
  ctx.fillStyle = "rgba(10,14,24,0.9)";
  ctx.fill();
  ctx.strokeStyle = theme.gridCyan;
  ctx.stroke();
  ctx.fillStyle = theme.gridCyan;
  ctx.font = "800 22px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, x + size / 2, y + size / 2);
}

function drawPauseOverlay(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, W / 2 - 200, H / 2 - 220, 400, 440, 20);
  ctx.fillStyle = "rgba(10,14,24,0.96)";
  ctx.fill();
  ctx.strokeStyle = theme.gridCyan;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = theme.text;
  ctx.font = "800 28px Orbitron, sans-serif";
  ctx.fillText("MENU", W / 2, H / 2 - 160);

  drawUiButton(ctx, W / 2 - 160, H / 2 - 110, 320, 64, "RESUME", theme.player, "primary");
  drawUiButton(ctx, W / 2 - 160, H / 2 - 30, 320, 64, "SETTINGS", theme.gridCyan, "ghost");
  drawUiButton(ctx, W / 2 - 160, H / 2 + 50, 320, 64, "MAIN MENU", theme.energy, "ghost");
  drawUiButton(ctx, W / 2 - 160, H / 2 + 130, 320, 64, "HOW TO PLAY", theme.muted, "pass");
}

function drawSettingsOverlay(ctx: CanvasRenderingContext2D, prefs: Prefs): void {
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, W / 2 - 210, H / 2 - 360, 420, 720, 20);
  ctx.fillStyle = "rgba(10,14,24,0.96)";
  ctx.fill();
  ctx.strokeStyle = theme.gridPurple;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = theme.text;
  ctx.font = "800 28px Orbitron, sans-serif";
  ctx.fillText("SETTINGS", W / 2, H / 2 - 300);

  drawToggleRow(ctx, W / 2 - 170, H / 2 - 250, "SOUND FX", prefs.sfx);
  drawToggleRow(ctx, W / 2 - 170, H / 2 - 170, "MUSIC", prefs.music);
  drawToggleRow(ctx, W / 2 - 170, H / 2 - 90, "TURN TIMER", prefs.timer);
  drawToggleRow(ctx, W / 2 - 170, H / 2 - 10, "REDUCED FX", prefs.reducedFx);
  drawDifficultyRow(ctx, W / 2 - 170, H / 2 + 70, prefs.difficulty);
  drawToggleRow(ctx, W / 2 - 170, H / 2 + 150, "ANALYTICS", prefs.analytics);

  drawUiButton(ctx, W / 2 - 140, H / 2 + 250, 280, 64, "CLOSE", theme.player, "primary");
}

function drawDifficultyRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  difficulty: Prefs["difficulty"],
): void {
  roundRect(ctx, x, y, 340, 64, 14);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = theme.text;
  ctx.font = "700 16px Orbitron, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("AI LEVEL", x + 20, y + 32);

  roundRect(ctx, x + 200, y + 14, 120, 36, 18);
  ctx.fillStyle =
    difficulty === "hard" ? theme.enemy : difficulty === "normal" ? theme.gridCyan : theme.energy;
  ctx.fill();
  ctx.fillStyle = "#041016";
  ctx.font = "800 13px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(difficulty.toUpperCase(), x + 260, y + 33);
}

function drawToggleRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  on: boolean,
): void {
  roundRect(ctx, x, y, 340, 64, 14);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = theme.text;
  ctx.font = "700 16px Orbitron, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 20, y + 32);

  roundRect(ctx, x + 240, y + 14, 80, 36, 18);
  ctx.fillStyle = on ? theme.gridCyan : "rgba(80,90,110,0.8)";
  ctx.fill();
  ctx.fillStyle = on ? "#041016" : theme.text;
  ctx.font = "800 13px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(on ? "ON" : "OFF", x + 280, y + 33);
}

function drawMenu(ctx: CanvasRenderingContext2D, state: MatchState): void {
  const logo = ui("ui-logo-badge.png");
  if (logo) ctx.drawImage(logo, W / 2 - 90, 48, 160, 160);

  ctx.fillStyle = theme.text;
  ctx.font = "800 42px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CHAIN", W / 2, logo ? 250 : 160);
  ctx.fillStyle = theme.gridCyan;
  ctx.fillText("REACTOR", W / 2, logo ? 298 : 210);
  ctx.fillStyle = theme.muted;
  ctx.font = "600 13px JetBrains Mono, monospace";
  ctx.fillText("PLACE · CHAIN · OVERTHROW", W / 2, logo ? 330 : 250);

  // Prototype badge only on the root menu — faction pick uses the chrome stamp instead.
  if (state.phase === "menu") {
    const badgeY = logo ? 348 : 268;
    const badgeW = 210;
    const badgeH = 22;
    roundRect(ctx, W / 2 - badgeW / 2, badgeY, badgeW, badgeH, 6);
    ctx.fillStyle = "rgba(12, 18, 28, 0.92)";
    ctx.fill();
    ctx.strokeStyle = theme.energy;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = theme.energy;
    ctx.font = "700 11px JetBrains Mono, monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(BUILD_LABEL, W / 2, badgeY + badgeH / 2);
    ctx.textBaseline = "alphabetic";
  }

  if (state.phase === "menu") {
    drawUiButton(ctx, W / 2 - 150, 390, 300, 58, "PLAY", theme.player, "primary");
    drawUiButton(ctx, W / 2 - 150, 460, 300, 52, "CAMPAIGN", theme.energy, "ghost");
    drawUiButton(ctx, W / 2 - 150, 525, 300, 52, "DAILY", theme.gridPurple, "ghost");
    drawUiButton(ctx, W / 2 - 150, 590, 300, 52, "TUTORIAL", theme.gridCyan, "ghost");
    drawUiButton(ctx, W / 2 - 150, 655, 300, 52, "SETTINGS", theme.muted, "ghost");
  } else {
    ctx.fillStyle = theme.text;
    ctx.font = "700 16px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CHOOSE SYNDICATE", W / 2, 365);
    const factions: Array<{ id: "volt" | "prismatic" | "void"; color: string; blurb: string }> = [
      { id: "volt", color: theme.energy, blurb: "FLOOD — splitters keep all arrows" },
      { id: "prismatic", color: theme.gridCyan, blurb: "REDIRECT — glass bends harder (+5)" },
      { id: "void", color: theme.gridPurple, blurb: "INVERT — overkill boosts stolen Power" },
    ];
    factions.forEach((f, i) => {
      const y = 400 + i * 100;
      const x = W / 2 - 200;
      roundRect(ctx, x, y, 400, 88, 16);
      ctx.fillStyle = "rgba(8,12,20,0.92)";
      ctx.fill();
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const sym = factionSymbol(f.id);
      if (sym) ctx.drawImage(sym, x + 14, y + 12, 64, 64);

      ctx.textAlign = "left";
      ctx.fillStyle = f.color;
      ctx.font = "800 18px Orbitron, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(factionLabel(f.id).toUpperCase(), x + 95, y + 34);
      ctx.fillStyle = theme.muted;
      ctx.font = "600 12px JetBrains Mono, monospace";
      ctx.fillText(f.blurb, x + 95, y + 58);
      ctx.textBaseline = "alphabetic";
    });
  }
}

function drawCampaignMap(ctx: CanvasRenderingContext2D): void {
  const progress = loadCampaignProgress();
  const starsTotal = totalCampaignStars(progress);
  ctx.fillStyle = theme.text;
  ctx.font = "800 28px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CAMPAIGN", W / 2, 72);
  ctx.fillStyle = theme.muted;
  ctx.font = "600 12px JetBrains Mono, monospace";
  ctx.fillText(
    `8 nodes · 3 districts · ${starsTotal}/24 ★ · unlocks feed your decks`,
    W / 2,
    98,
  );

  const rowH = 118;
  CAMPAIGN_NODES.forEach((node, i) => {
    const y = 118 + i * rowH;
    const unlocked = isNodeUnlocked(node.id, progress);
    const stars = nodeStars(node.id, progress);
    roundRect(ctx, 40, y, W - 80, 108, 12);
    ctx.fillStyle = unlocked ? "rgba(8,12,22,0.92)" : "rgba(8,12,22,0.55)";
    ctx.fill();
    ctx.strokeStyle = unlocked
      ? node.district === 1
        ? theme.energy
        : node.district === 2
          ? theme.gridCyan
          : theme.gridPurple
      : theme.muted;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = unlocked ? theme.text : theme.muted;
    ctx.font = "800 15px Orbitron, sans-serif";
    ctx.fillText(`D${node.district} · ${node.title}`, 58, y + 26);
    ctx.fillStyle = theme.muted;
    ctx.font = "600 10px JetBrains Mono, monospace";
    ctx.fillText(node.blurb, 58, y + 46);
    ctx.fillText(`${node.objective.label} · ${node.modifierLabel}`, 58, y + 64);
    ctx.fillStyle = stars ? theme.energy : theme.muted;
    ctx.font = "700 12px Orbitron, sans-serif";
    const starStr = stars > 0 ? "★".repeat(stars) + "☆".repeat(3 - stars) : unlocked ? "PLAY ▶" : "LOCKED";
    ctx.fillText(starStr, 58, y + 90);
    if (stars) {
      ctx.fillStyle = theme.player;
      ctx.font = "600 10px JetBrains Mono, monospace";
      ctx.fillText(node.reward.label, 200, y + 90);
    }
  });

  drawUiButton(ctx, W / 2 - 120, H - 58, 240, 40, "BACK", theme.muted, "ghost");
}

export function hitMenu(
  x: number,
  y: number,
  state: MatchState,
):
  | "play"
  | "campaign"
  | "daily"
  | "tutorial"
  | "settings"
  | "volt"
  | "prismatic"
  | "void"
  | "campaign_back"
  | `node:${string}`
  | null {
  if (state.phase === "menu") {
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= 390 && y <= 448) return "play";
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= 460 && y <= 512) return "campaign";
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= 525 && y <= 577) return "daily";
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= 590 && y <= 642) return "tutorial";
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= 655 && y <= 707) return "settings";
  }
  if (state.phase === "faction_pick") {
    const ids: Array<"volt" | "prismatic" | "void"> = ["volt", "prismatic", "void"];
    for (let i = 0; i < 3; i++) {
      const by = 400 + i * 100;
      if (x >= W / 2 - 200 && x <= W / 2 + 200 && y >= by && y <= by + 88) return ids[i];
    }
  }
  if (state.phase === "campaign_map") {
    if (x >= W / 2 - 120 && x <= W / 2 + 120 && y >= H - 58 && y <= H - 18) return "campaign_back";
    const progress = loadCampaignProgress();
    const rowH = 118;
    for (let i = 0; i < CAMPAIGN_NODES.length; i++) {
      const node = CAMPAIGN_NODES[i];
      const by = 118 + i * rowH;
      if (x >= 40 && x <= W - 40 && y >= by && y <= by + 108) {
        if (!isNodeUnlocked(node.id, progress)) return null;
        return `node:${node.id}`;
      }
    }
  }
  return null;
}

export function hitChrome(x: number, y: number, state: MatchState): "menu" | "settings" | null {
  const s = settingsBtnRect();
  if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return "settings";
  if (state.phase !== "menu") {
    const m = menuBtnRect();
    if (x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h) return "menu";
  }
  return null;
}

export function hitPause(
  x: number,
  y: number,
): "resume" | "settings" | "main" | "howto" | null {
  if (x >= W / 2 - 160 && x <= W / 2 + 160 && y >= H / 2 - 110 && y <= H / 2 - 46) return "resume";
  if (x >= W / 2 - 160 && x <= W / 2 + 160 && y >= H / 2 - 30 && y <= H / 2 + 34) return "settings";
  if (x >= W / 2 - 160 && x <= W / 2 + 160 && y >= H / 2 + 50 && y <= H / 2 + 114) return "main";
  if (x >= W / 2 - 160 && x <= W / 2 + 160 && y >= H / 2 + 130 && y <= H / 2 + 194) return "howto";
  return null;
}

export function hitSettings(
  x: number,
  y: number,
): "sfx" | "music" | "timer" | "fx" | "difficulty" | "analytics" | "close" | null {
  if (x >= W / 2 - 170 && x <= W / 2 + 170 && y >= H / 2 - 250 && y <= H / 2 - 186) return "sfx";
  if (x >= W / 2 - 170 && x <= W / 2 + 170 && y >= H / 2 - 170 && y <= H / 2 - 106) return "music";
  if (x >= W / 2 - 170 && x <= W / 2 + 170 && y >= H / 2 - 90 && y <= H / 2 - 26) return "timer";
  if (x >= W / 2 - 170 && x <= W / 2 + 170 && y >= H / 2 - 10 && y <= H / 2 + 54) return "fx";
  if (x >= W / 2 - 170 && x <= W / 2 + 170 && y >= H / 2 + 70 && y <= H / 2 + 134) {
    return "difficulty";
  }
  if (x >= W / 2 - 170 && x <= W / 2 + 170 && y >= H / 2 + 150 && y <= H / 2 + 214) {
    return "analytics";
  }
  if (x >= W / 2 - 140 && x <= W / 2 + 140 && y >= H / 2 + 250 && y <= H / 2 + 314) return "close";
  return null;
}

export function hitEndScreen(
  x: number,
  y: number,
  state: MatchState,
  opts: {
    showDailyCta?: boolean;
    replaying?: boolean;
    nextCampaignNodeId?: string | null;
  } = {},
): "rematch" | "play_match" | "daily" | "campaign" | "next" | "share" | "menu" | null {
  if (state.phase !== "match_over" || opts.replaying) return null;
  let btnY = H * 0.52;
  if (state.mode === "daily") btnY = H * 0.56;
  if (state.mode === "tutorial") {
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY && y <= btnY + 56) {
      return "play_match";
    }
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 70 && y <= btnY + 122) {
      return "rematch";
    }
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 134 && y <= btnY + 186) {
      return "menu";
    }
    return null;
  }
  if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY && y <= btnY + 56) {
    return "rematch";
  }
  if (state.mode === "daily") {
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 66 && y <= btnY + 118) {
      return "share";
    }
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 130 && y <= btnY + 182) {
      return "menu";
    }
  } else if (opts.showDailyCta) {
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 70 && y <= btnY + 122) {
      return "daily";
    }
    if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 134 && y <= btnY + 186) {
      return "menu";
    }
  } else if (state.mode === "campaign") {
    if (opts.nextCampaignNodeId && state.winner === "player") {
      if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 70 && y <= btnY + 122) {
        return "next";
      }
      if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 134 && y <= btnY + 186) {
        return "campaign";
      }
      if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 198 && y <= btnY + 250) {
        return "menu";
      }
    } else {
      if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 70 && y <= btnY + 122) {
        return "campaign";
      }
      if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 134 && y <= btnY + 186) {
        return "menu";
      }
    }
  } else if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btnY + 70 && y <= btnY + 122) {
    return "menu";
  }
  return null;
}

export function hitPass(x: number, y: number, state?: MatchState): boolean {
  if (state?.mulliganAvailable && state.phase === "playing") {
    return x >= W / 2 - 60 && x <= W / 2 + 60 && y >= H - 38 && y <= H - 6;
  }
  if (state?.tutorial && state.phase === "playing") {
    return x >= W / 2 - 60 && x <= W / 2 + 60 && y >= H - 38 && y <= H - 6;
  }
  return x >= W / 2 - 70 && x <= W / 2 + 70 && y >= H - 38 && y <= H - 6;
}

export function hitMulligan(x: number, y: number, state: MatchState): boolean {
  if (!state.mulliganAvailable || state.phase !== "playing" || state.active !== "player") {
    return false;
  }
  return x >= W / 2 - 200 && x <= W / 2 - 80 && y >= H - 38 && y <= H - 6;
}

export function hitSkipTutorial(x: number, y: number, state: MatchState): boolean {
  if (!state.tutorial || state.phase !== "playing") return false;
  if (state.mulliganAvailable) return false;
  return x >= W / 2 - 200 && x <= W / 2 - 80 && y >= H - 38 && y <= H - 6;
}

export function hitHand(
  layout: Layout,
  state: MatchState,
  x: number,
  y: number,
): number | null {
  const hand = state.players.player.hand;
  for (let i = 0; i < hand.length; i++) {
    const r = handRect(layout, i, hand.length);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return null;
}

export function hitTile(layout: Layout, x: number, y: number): Pos | null {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const r = cellRect(layout, { col, row });
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return { col, row };
      }
    }
  }
  return null;
}
