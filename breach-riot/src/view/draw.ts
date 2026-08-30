import { formatTime, type ScoreEntry } from "../core/board";
import { sequenceStillPossible } from "../core/buffer";
import type { Session } from "../core/session";
import { LEVELS } from "../core/levels";
import {
  ALMOST_IN_COST,
  COMP_TIME_COST,
  COMP_TIME_SECONDS,
  bufferUpgradeCost,
  DATAMINE_PAYOUT,
  DISTRICT_NAMES,
  timeUpgradeCost,
} from "../core/economy";
import { canUnlockDistrict, hasUsername } from "../core/save";
import type { Pos, Progress } from "../core/types";
import { getFlashes, getPunches, getShake } from "./motion";
import { H, W, theme } from "./theme";

export { W, H };

export type Screen = "register" | "home" | "how" | "map" | "deck" | "play" | "result" | "scores";

export type UiButton = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
};

const PAD = 28;

export function drawBackground(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, theme.bg0);
  g.addColorStop(0.45, theme.bg1);
  g.addColorStop(1, "#101816");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Spray / noise grain
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97 + t * 12) % W);
    const y = ((i * 53 + t * 7) % H);
    ctx.fillStyle = i % 2 === 0 ? theme.accent : theme.accent2;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();

  // CRT scan
  ctx.fillStyle = theme.crt;
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1);
  }
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

export function drawButton(
  ctx: CanvasRenderingContext2D,
  btn: UiButton,
  opts: { primary?: boolean; muted?: boolean } = {},
): void {
  ctx.save();
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
  if (opts.primary) {
    ctx.fillStyle = theme.accent;
    ctx.fill();
    ctx.fillStyle = "#0d1110";
  } else {
    ctx.fillStyle = theme.panel;
    ctx.fill();
    ctx.strokeStyle = opts.muted ? theme.dim : theme.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = opts.muted ? theme.dim : theme.text;
  }
  ctx.font = "700 28px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
  ctx.restore();
}

function drawResourceHud(ctx: CanvasRenderingContext2D, progress: Progress, y: number): void {
  ctx.fillStyle = theme.muted;
  ctx.font = "700 18px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`SCRAP ${progress.scrap}   COMP ${progress.components}`, W / 2, y);
}

export function homeButtons(progress: Progress): UiButton[] {
  const bw = W - PAD * 2;
  const bh = 56;
  const cx = PAD;
  let y = 680;
  return [
    { id: "play", x: cx, y, w: bw, h: bh, label: "PLAY" },
    { id: "map", x: cx, y: (y += bh + 12), w: bw, h: bh, label: "ACCESS MAP" },
    { id: "scores", x: cx, y: (y += bh + 12), w: bw, h: bh, label: "SCOREBOARD" },
    { id: "deck", x: cx, y: (y += bh + 12), w: bw, h: bh, label: "DECK" },
    { id: "how", x: cx, y: (y += bh + 12), w: bw, h: bh, label: "HOW TO BREACH" },
    {
      id: "sound",
      x: cx,
      y: (y += bh + 12),
      w: bw,
      h: bh,
      label: progress.sound ? "SOUND: ON" : "SOUND: OFF",
    },
  ];
}

export function drawHome(
  ctx: CanvasRenderingContext2D,
  t: number,
  progress: Progress,
): UiButton[] {
  drawBackground(ctx, t);

  ctx.save();
  ctx.translate(0, Math.sin(t * 1.2) * 4);

  ctx.fillStyle = theme.accent2;
  ctx.font = "800 22px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SKITZ", W / 2, 210);

  ctx.fillStyle = theme.text;
  ctx.font = "800 72px 'Chakra Petch', sans-serif";
  ctx.fillText("BREACH", W / 2, 300);
  ctx.fillStyle = theme.accent;
  ctx.fillText("RIOT", W / 2, 372);

  ctx.fillStyle = theme.muted;
  ctx.font = "600 22px 'Chakra Petch', sans-serif";
  ctx.fillText("TRACE. CRACK. OVERRIDE.", W / 2, 430);
  if (hasUsername(progress)) {
    ctx.fillStyle = theme.accent;
    ctx.font = "700 20px 'JetBrains Mono', monospace";
    ctx.fillText(progress.handle, W / 2, 462);
    drawResourceHud(ctx, progress, 498);
  } else {
    drawResourceHud(ctx, progress, 468);
  }

  // Decorative matrix strip
  ctx.font = "700 18px 'JetBrains Mono', monospace";
  const demo = ["1C", "55", "7A", "BD", "E9", "FF"];
  demo.forEach((tok, i) => {
    const x = 90 + i * 90;
    const y = 500;
    roundRect(ctx, x, y, 70, 48, 6);
    ctx.fillStyle = i === Math.floor(t * 2) % 6 ? theme.accent : theme.bg2;
    ctx.fill();
    ctx.fillStyle = i === Math.floor(t * 2) % 6 ? theme.bg0 : theme.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tok, x + 35, y + 25);
  });
  ctx.restore();

  const buttons = homeButtons(progress);
  for (const b of buttons) {
    drawButton(ctx, b, { primary: b.id === "play" });
  }
  return buttons;
}

export function registerButtons(): UiButton[] {
  return [
    {
      id: "claim",
      x: PAD,
      y: 760,
      w: W - PAD * 2,
      h: 72,
      label: "CLAIM USERNAME",
    },
  ];
}

export function drawRegister(ctx: CanvasRenderingContext2D, t: number): UiButton[] {
  drawBackground(ctx, t);
  ctx.fillStyle = theme.accent2;
  ctx.font = "800 22px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SKITZ", W / 2, 180);
  ctx.fillStyle = theme.text;
  ctx.font = "800 56px 'Chakra Petch', sans-serif";
  ctx.fillText("NAME YOURSELF", W / 2, 280);
  wrapText(
    ctx,
    "Pick a username before you breach. Scores and campaign progress follow this name.",
    W / 2,
    330,
    W - PAD * 2,
    30,
    theme.muted,
  );
  ctx.fillStyle = theme.dim;
  ctx.font = "600 16px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("3–16 LETTERS, NUMBERS, SPACE, _ -", W / 2, 720);
  const buttons = registerButtons();
  for (const b of buttons) drawButton(ctx, b, { primary: true });
  return buttons;
}

export function scoresButtons(tab: "world" | "local"): UiButton[] {
  const bw = (W - PAD * 2 - 16) / 2;
  return [
    {
      id: "scores-world",
      x: PAD,
      y: 210,
      w: bw,
      h: 52,
      label: tab === "world" ? "WORLD ●" : "WORLD",
    },
    {
      id: "scores-local",
      x: PAD + bw + 16,
      y: 210,
      w: bw,
      h: 52,
      label: tab === "local" ? "THIS DEVICE ●" : "THIS DEVICE",
    },
    { id: "scores-back", x: PAD, y: H - 120, w: W - PAD * 2, h: 64, label: "HOME" },
  ];
}

export function drawScores(
  ctx: CanvasRenderingContext2D,
  t: number,
  progress: Progress,
  tab: "world" | "local",
  world: ScoreEntry[],
  status: string,
): UiButton[] {
  drawBackground(ctx, t);
  ctx.fillStyle = theme.accent;
  ctx.font = "800 22px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SCOREBOARD", W / 2, 120);
  ctx.fillStyle = theme.text;
  ctx.font = "800 40px 'Chakra Petch', sans-serif";
  ctx.fillText(hasUsername(progress) ? progress.handle : "NO NAME", W / 2, 168);
  ctx.fillStyle = theme.muted;
  ctx.font = "600 16px 'Chakra Petch', sans-serif";
  ctx.fillText(
    `BEST ${String(progress.bestScore).padStart(6, "0")}   RUNS ${progress.games}`,
    W / 2,
    198,
  );

  const rows: ScoreEntry[] =
    tab === "world"
      ? world
      : progress.runs.map((run) => ({
          name: progress.handle || "—",
          score: run.score,
          level: run.level,
          stars: run.stars,
          time: run.time,
          at: run.at,
        }));

  ctx.fillStyle = theme.dim;
  ctx.font = "600 16px 'Chakra Petch', sans-serif";
  ctx.fillText(status, W / 2, 284);

  const y0 = 320;
  if (!rows.length) {
    ctx.fillStyle = theme.muted;
    ctx.font = "600 22px 'Chakra Petch', sans-serif";
    ctx.fillText(tab === "world" ? "No world scores yet." : "No runs on this device.", W / 2, 420);
  } else {
    rows.slice(0, 12).forEach((row, i) => {
      const y = y0 + i * 56;
      const mine = row.name === progress.handle;
      ctx.fillStyle = mine ? theme.accent : theme.text;
      ctx.font = "700 20px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(String(i + 1).padStart(2, "0"), PAD, y);
      ctx.fillText(row.name, PAD + 56, y);
      ctx.textAlign = "right";
      ctx.fillText(String(row.score).padStart(6, "0"), W - PAD, y);
      ctx.fillStyle = theme.muted;
      ctx.font = "600 14px 'Chakra Petch', sans-serif";
      ctx.fillText(
        `L${row.level}  ${"★".repeat(row.stars) || "—"}  ${formatTime(row.time)}`,
        W - PAD,
        y + 22,
      );
    });
  }

  const buttons = scoresButtons(tab);
  for (const b of buttons) {
    const on =
      (b.id === "scores-world" && tab === "world") ||
      (b.id === "scores-local" && tab === "local");
    drawButton(ctx, b, { primary: on });
  }
  return buttons;
}

const HOW_PANELS = [
  {
    title: "PATH",
    body: "First pick must be on the top row. Then the same COLUMN as that pick, then the same ROW, then column, row… Each cell once — picked cells blank out.",
  },
  {
    title: "TIME",
    body: "The breach clock starts as soon as the matrix appears. Trace a path that uploads Datamines before the buffer fills or time runs out.",
  },
  {
    title: "BUFFER",
    body: "Every pick fills your buffer. When it is full, the breach resolves. Sticky glyphs cost two slots.",
  },
  {
    title: "DATAMINES",
    body: "Each Datamine is a queue. Matched codes come off the front and the rest slide forward. Overlapping lines share that front — one pick can advance two sequences, or rewind a line if you break the chain.",
  },
  {
    title: "REWARDS",
    body: "Spend Scrap in the Deck to upgrade buffer and time. Clear at least two Datamines to advance. Spend Scrap on the Access Map to unlock the next district (gate needs 2★).",
  },
];

export function howButtons(page: number): UiButton[] {
  const bw = (W - PAD * 2 - 16) / 2;
  const y = H - 120;
  return [
    {
      id: "how-prev",
      x: PAD,
      y,
      w: bw,
      h: 64,
      label: page <= 0 ? "HOME" : "BACK",
    },
    {
      id: "how-next",
      x: PAD + bw + 16,
      y,
      w: bw,
      h: 64,
      label: page >= HOW_PANELS.length - 1 ? "PLAY" : "NEXT",
    },
  ];
}

export function drawHow(
  ctx: CanvasRenderingContext2D,
  t: number,
  page: number,
): UiButton[] {
  drawBackground(ctx, t);
  const panel = HOW_PANELS[Math.max(0, Math.min(HOW_PANELS.length - 1, page))]!;

  ctx.fillStyle = theme.accent;
  ctx.font = "800 20px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`HOW  ${page + 1}/${HOW_PANELS.length}`, W / 2, 120);

  ctx.fillStyle = theme.text;
  ctx.font = "800 56px 'Chakra Petch', sans-serif";
  ctx.fillText(panel.title, W / 2, 220);

  wrapText(ctx, panel.body, W / 2, 320, W - 100, 36, theme.muted);

  const buttons = howButtons(page);
  for (const b of buttons) {
    drawButton(ctx, b, { primary: b.id === "how-next" });
  }
  return buttons;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.font = "600 24px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

export function mapButtons(
  progress: Progress,
  selected: number,
): { buttons: UiButton[]; nodes: { id: number; x: number; y: number; r: number }[] } {
  const nodes: { id: number; x: number; y: number; r: number }[] = [];
  const cols = 4;
  const startY = 200;
  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = PAD + 70 + col * 160;
    const y = startY + row * 140;
    nodes.push({ id: level.id, x, y, r: 36 });
  }
  const buttons: UiButton[] = [
    { id: "map-back", x: PAD, y: H - 120, w: 200, h: 64, label: "HOME" },
  ];
  const unlock = canUnlockDistrict(progress);
  if (unlock.ok) {
    buttons.push({
      id: "map-unlock",
      x: PAD + 220,
      y: H - 120,
      w: 280,
      h: 64,
      label: `UNLOCK DISTRICT (${unlock.cost})`,
    });
  }
  const playX = unlock.ok ? PAD + 520 : PAD + 220;
  const playW = unlock.ok ? W - PAD - playX : W - PAD * 2 - 220;
  buttons.push({
    id: "map-play",
    x: playX,
    y: H - 120,
    w: playW,
    h: 64,
    label: `BREACH ${selected}`,
  });
  return { buttons, nodes };
}

export function drawMap(
  ctx: CanvasRenderingContext2D,
  t: number,
  progress: Progress,
  selected: number,
): ReturnType<typeof mapButtons> {
  drawBackground(ctx, t);
  ctx.fillStyle = theme.text;
  ctx.font = "800 42px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ACCESS MAP", W / 2, 110);

  drawResourceHud(ctx, progress, 148);

  const selectedLevel = LEVELS.find((l) => l.id === selected);
  const districtName = selectedLevel
    ? DISTRICT_NAMES[selectedLevel.district] ?? "UNKNOWN"
    : DISTRICT_NAMES[progress.district] ?? "UNKNOWN";
  ctx.fillStyle = theme.accent;
  ctx.font = "700 22px 'Chakra Petch', sans-serif";
  ctx.fillText(districtName, W / 2, 178);

  const layout = mapButtons(progress, selected);
  for (const n of layout.nodes) {
    const locked = n.id > progress.unlocked;
    const stars = progress.stars[n.id] ?? 0;
    const sel = n.id === selected;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = locked ? theme.bg2 : sel ? theme.accent : theme.panel;
    ctx.fill();
    ctx.strokeStyle = locked ? theme.dim : theme.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = locked ? theme.dim : sel ? theme.bg0 : theme.text;
    ctx.font = "800 22px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(locked ? "—" : String(n.id), n.x, n.y - 2);
    if (!locked && stars > 0) {
      ctx.fillStyle = theme.warn;
      ctx.font = "700 14px 'Chakra Petch', sans-serif";
      ctx.fillText("★".repeat(stars), n.x, n.y + 48);
    }
  }

  if (selectedLevel) {
    ctx.fillStyle = theme.muted;
    ctx.font = "600 20px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(selectedLevel.name, W / 2, H - 200);
    ctx.fillText(selectedLevel.brief, W / 2, H - 168);
  }

  for (const b of layout.buttons) {
    drawButton(ctx, b, {
      primary: b.id === "map-play" || b.id === "map-unlock",
      muted: b.id === "map-play" && selected > progress.unlocked,
    });
  }
  return layout;
}

export function deckButtons(progress: Progress): UiButton[] {
  const bw = W - PAD * 2;
  const bh = 56;
  const cx = PAD;
  let y = 480;
  const bufCost = bufferUpgradeCost(progress.deck.bufferBonus);
  const timeCost = timeUpgradeCost(progress.deck.timeBonus);
  return [
    {
      id: "deck-buffer",
      x: cx,
      y,
      w: bw,
      h: bh,
      label: bufCost !== null ? `BUFFER +1 (${bufCost} SCRAP)` : "BUFFER MAX",
    },
    {
      id: "deck-time",
      x: cx,
      y: (y += bh + 12),
      w: bw,
      h: bh,
      label: timeCost !== null ? `TIME +3s (${timeCost} SCRAP)` : "TIME MAX",
    },
    {
      id: "deck-comp-time",
      x: cx,
      y: (y += bh + 12),
      w: bw,
      h: bh,
      label: `TIME +${COMP_TIME_SECONDS}s (${COMP_TIME_COST} COMP)`,
    },
    {
      id: "deck-almost",
      x: cx,
      y: (y += bh + 12),
      w: bw,
      h: bh,
      label: progress.deck.almostIn
        ? "ALMOST IN — OWNED"
        : `ALMOST IN (${ALMOST_IN_COST} COMP)`,
    },
    {
      id: "deck-back",
      x: cx,
      y: (y += bh + 12),
      w: bw,
      h: bh,
      label: "BACK",
    },
  ];
}

export function drawDeck(
  ctx: CanvasRenderingContext2D,
  t: number,
  progress: Progress,
): UiButton[] {
  drawBackground(ctx, t);

  ctx.fillStyle = theme.text;
  ctx.font = "800 42px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DECK", W / 2, 110);

  drawResourceHud(ctx, progress, 148);

  ctx.fillStyle = theme.muted;
  ctx.font = "600 22px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`BUFFER BONUS  +${progress.deck.bufferBonus}`, PAD, 220);
  ctx.fillText(`TIME BONUS  +${progress.deck.timeBonus}s`, PAD, 260);
  ctx.fillText(
    `COMP TIME  +${progress.deck.compTime ?? 0}s`,
    PAD,
    300,
  );
  ctx.fillText(
    `ALMOST IN  ${progress.deck.almostIn ? "OWNED (+5s)" : "LOCKED"}`,
    PAD,
    340,
  );
  ctx.fillStyle = theme.dim;
  ctx.font = "600 16px 'Chakra Petch', sans-serif";
  ctx.fillText("Buffer upgrades apply after Watson district.", PAD, 380);
  ctx.textAlign = "right";
  ctx.fillText(`SCRAP  ${progress.scrap}`, W - PAD, 220);
  ctx.fillText(`COMP  ${progress.components}`, W - PAD, 260);

  const buttons = deckButtons(progress);
  for (const b of buttons) {
    const muted =
      (b.id === "deck-buffer" && bufferUpgradeCost(progress.deck.bufferBonus) === null) ||
      (b.id === "deck-time" && timeUpgradeCost(progress.deck.timeBonus) === null) ||
      (b.id === "deck-almost" && progress.deck.almostIn) ||
      (b.id === "deck-comp-time" && progress.components < COMP_TIME_COST);
    drawButton(ctx, b, {
      primary: b.id !== "deck-back",
      muted,
    });
  }
  return buttons;
}

export type BoardLayout = {
  originX: number;
  originY: number;
  cell: number;
  gap: number;
};

export function boardLayout(size: number): BoardLayout {
  const gap = 8;
  const maxW = W - PAD * 2;
  const cell = Math.floor((maxW - gap * (size - 1)) / size);
  const total = cell * size + gap * (size - 1);
  const originX = (W - total) / 2;
  const originY = 300;
  return { originX, originY, cell, gap };
}

export function cellAt(layout: BoardLayout, size: number, x: number, y: number): Pos | null {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cx = layout.originX + c * (layout.cell + layout.gap);
      const cy = layout.originY + r * (layout.cell + layout.gap);
      if (x >= cx && x <= cx + layout.cell && y >= cy && y <= cy + layout.cell) {
        return { c, r };
      }
    }
  }
  return null;
}

export function cellCenter(layout: BoardLayout, pos: Pos): { x: number; y: number } {
  return {
    x: layout.originX + pos.c * (layout.cell + layout.gap) + layout.cell / 2,
    y: layout.originY + pos.r * (layout.cell + layout.gap) + layout.cell / 2,
  };
}

export function playButtons(_session: Session): UiButton[] {
  return [
    { id: "play-menu", x: W - PAD - 120, y: 24, w: 120, h: 48, label: "MAP" },
  ];
}

export function drawPlay(
  ctx: CanvasRenderingContext2D,
  t: number,
  session: Session,
  legal: Pos[],
): { buttons: UiButton[]; layout: BoardLayout } {
  drawBackground(ctx, t);
  const shake = getShake();
  if (shake > 0) {
    ctx.save();
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  const level = session.level;
  drawBreachTimer(ctx, session);

  ctx.fillStyle = theme.muted;
  ctx.font = "700 18px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`L${level.id}  ${level.name}`, W / 2, 54);

  // Buffer strip
  drawBuffer(ctx, session);

  // Daemons
  drawDaemons(ctx, session);

  const layout = boardLayout(level.size);
  const legalSet = new Set(legal.map((p) => `${p.c},${p.r}`));

  // Axis highlight — top row on open, then locked column / row.
  if (!session.ended) {
    ctx.save();
    ctx.fillStyle = theme.legalGlow;
    if (!session.last || session.axis === null) {
      const y = layout.originY - 4;
      ctx.fillRect(layout.originX - 6, y, level.size * (layout.cell + layout.gap), layout.cell + 8);
    } else if (session.axis === "row") {
      const y =
        layout.originY + session.last.r * (layout.cell + layout.gap) - 4;
      ctx.fillRect(layout.originX - 6, y, level.size * (layout.cell + layout.gap), layout.cell + 8);
    } else {
      const x =
        layout.originX + session.last.c * (layout.cell + layout.gap) - 4;
      ctx.fillRect(x, layout.originY - 6, layout.cell + 8, level.size * (layout.cell + layout.gap));
    }
    ctx.restore();
  }

  for (let r = 0; r < level.size; r++) {
    for (let c = 0; c < level.size; c++) {
      const cell = session.matrix[r]![c]!;
      const x = layout.originX + c * (layout.cell + layout.gap);
      const y = layout.originY + r * (layout.cell + layout.gap);
      const key = `${c},${r}`;
      const isLegal = legalSet.has(key);

      roundRect(ctx, x, y, layout.cell, layout.cell, 8);
      if (cell.used) {
        ctx.fillStyle = theme.used;
      } else if (cell.kind === "jam") {
        ctx.fillStyle = theme.jam;
      } else if (cell.kind === "sticky") {
        ctx.fillStyle = "#3a241c";
      } else {
        ctx.fillStyle = isLegal ? "#243830" : theme.bg2;
      }
      ctx.fill();
      if (isLegal && !cell.used) {
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (cell.kind === "sticky" && !cell.used) {
        ctx.strokeStyle = theme.sticky;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (cell.used) {
        // CP blank-out — dim empty socket, no token text.
      } else if (cell.kind === "jam") {
        ctx.fillStyle = theme.fail;
        ctx.font = `700 ${Math.floor(layout.cell * 0.22)}px 'Chakra Petch', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("JAM", x + layout.cell / 2, y + layout.cell / 2);
      } else {
        ctx.fillStyle = theme.text;
        ctx.font = `700 ${Math.floor(layout.cell * 0.32)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cell.token, x + layout.cell / 2, y + layout.cell / 2 + 1);
      }

      if (cell.kind === "sticky" && !cell.used) {
        ctx.fillStyle = theme.sticky;
        ctx.font = "700 12px 'Chakra Petch', sans-serif";
        ctx.fillText("×2", x + layout.cell - 16, y + 14);
      }
    }
  }

  // Punch rings
  for (const p of getPunches()) {
    const a = 1 - p.t / p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12 + (1 - a) * 30, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(157,255,176,${a})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  if (session.coach) {
    roundRect(ctx, PAD, H - 160, W - PAD * 2, 70, 10);
    ctx.fillStyle = theme.panel;
    ctx.fill();
    wrapText(ctx, session.coach, W / 2, H - 148, W - PAD * 2 - 24, 26, theme.warn);
  }

  const buttons = playButtons(session);
  for (const b of buttons) drawButton(ctx, b);

  if (shake > 0) ctx.restore();
  return { buttons, layout };
}

function drawBreachTimer(ctx: CanvasRenderingContext2D, session: Session): void {
  const running = session.timerStarted && !session.ended;
  const urgent = session.timeLeft <= 5;
  const label = "BREACH TIME REMAINING";
  const secs = Math.max(0, session.timeLeft);
  const text = secs.toFixed(2);

  ctx.fillStyle = urgent ? theme.fail : theme.accent;
  ctx.font = "700 14px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, PAD, 26);

  ctx.font = "800 32px 'JetBrains Mono', monospace";
  ctx.fillStyle = urgent ? theme.fail : running ? theme.accent : theme.dim;
  ctx.fillText(text, PAD, 56);

  const barW = 160;
  const pct = session.level.timeLimit > 0 ? secs / session.level.timeLimit : 0;
  ctx.fillStyle = theme.bg2;
  ctx.fillRect(PAD, 64, barW, 4);
  ctx.fillStyle = urgent ? theme.fail : theme.accent;
  ctx.fillRect(PAD, 64, Math.max(0, barW * pct), 4);
}

function drawBuffer(ctx: CanvasRenderingContext2D, session: Session): void {
  const slots = session.level.buffer;
  const gap = 8;
  const totalGap = gap * (slots - 1);
  const slotW = Math.min(72, Math.floor((W - PAD * 2 - totalGap) / slots));
  const total = slotW * slots + totalGap;
  const ox = (W - total) / 2;
  const y = 102;
  const occupied = slots - session.remaining;

  ctx.fillStyle = theme.muted;
  ctx.font = "700 16px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("BUFFER", PAD, 88);

  ctx.textAlign = "right";
  ctx.fillText(`${session.remaining} LEFT`, W - PAD, 88);

  let tokenIndex = 0;
  for (let i = 0; i < slots; i++) {
    const x = ox + i * (slotW + gap);
    roundRect(ctx, x, y, slotW, 48, 6);
    const filled = i < occupied;
    const tok = filled ? session.buffer[tokenIndex] : undefined;
    if (filled && tok !== undefined) tokenIndex += 1;
    ctx.fillStyle = filled ? (tok ? theme.accent : "#6a9e78") : theme.bg2;
    ctx.fill();
    if (tok) {
      ctx.fillStyle = theme.bg0;
      ctx.font = "700 20px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tok, x + slotW / 2, y + 25);
    } else if (filled) {
      ctx.fillStyle = theme.bg0;
      ctx.font = "700 14px 'Chakra Petch', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("×2", x + slotW / 2, y + 25);
    }
  }
}

function drawDaemons(ctx: CanvasRenderingContext2D, session: Session): void {
  const y0 = 164;
  const flashes = new Set(getFlashes().map((f) => f.id));
  const nameX = PAD;
  const seqX0 = PAD + 168;
  const rewardX = PAD + 400;
  const tokW = 40;
  const tokH = 28;
  const tokStep = 44;

  session.daemons.forEach((d, i) => {
    const y = y0 + i * 40;
    const pay = DATAMINE_PAYOUT[d.tier];
    const chips: string[] = [];
    if (pay.scrap > 0) chips.push(`+${pay.scrap} SCRAP`);
    if (pay.components > 0) chips.push(`+${pay.components} COMP`);
    const possible = sequenceStillPossible(
      session.buffer,
      session.remaining,
      d.sequence,
      d.completed,
    );
    const failed = !d.completed && !possible;

    ctx.save();
    ctx.globalAlpha = failed ? 0.28 : 1;

    ctx.fillStyle = d.completed
      ? theme.ok
      : flashes.has(d.id)
        ? theme.warn
        : failed
          ? theme.dim
          : theme.muted;
    ctx.font = "700 16px 'Chakra Petch', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(d.name, nameX, y);

    const remaining = d.completed ? [] : d.sequence.slice(d.matched);
    remaining.forEach((tok, vi) => {
      const x = seqX0 + vi * tokStep;
      const nextNeeded = vi === 0 && !failed;
      roundRect(ctx, x, y - tokH / 2, tokW, tokH, 5);
      ctx.fillStyle = nextNeeded ? "#243830" : theme.bg2;
      ctx.fill();
      if (nextNeeded) {
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = failed ? theme.dim : nextNeeded ? theme.accent : theme.text;
      ctx.font = "700 15px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tok, x + tokW / 2, y + 1);
    });

    let chipX = rewardX;
    ctx.font = "700 12px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    for (const chip of chips) {
      const chipW = ctx.measureText(chip).width + 16;
      roundRect(ctx, chipX, y - 12, chipW, 24, 4);
      ctx.fillStyle = d.completed ? theme.accent : theme.bg2;
      ctx.fill();
      ctx.fillStyle = d.completed ? theme.bg0 : theme.muted;
      ctx.font = "700 12px 'Chakra Petch', sans-serif";
      ctx.fillText(chip, chipX + chipW / 2, y + 1);
      chipX += chipW + 8;
    }
    ctx.restore();
  });
}

export function resultButtons(session: Session, progress: Progress): UiButton[] {
  const bw = (W - PAD * 2 - 16) / 2;
  const y = H - 280;
  const nextId = session.level.id + 1;
  const canNext =
    session.outcome !== "fail" &&
    nextId <= LEVELS.length &&
    nextId <= progress.unlocked;
  return [
    { id: "retry", x: PAD, y, w: bw, h: 64, label: "RETRY" },
    {
      id: "next",
      x: PAD + bw + 16,
      y,
      w: bw,
      h: 64,
      label: canNext ? "NEXT" : "MAP",
    },
    {
      id: "result-deck",
      x: PAD,
      y: y + 80,
      w: bw,
      h: 56,
      label: "DECK",
    },
    {
      id: "result-home",
      x: PAD + bw + 16,
      y: y + 80,
      w: bw,
      h: 56,
      label: "HOME",
    },
  ];
}

export function drawResult(
  ctx: CanvasRenderingContext2D,
  t: number,
  session: Session,
  progress: Progress,
  stars: number,
  worldRank: number | null,
): UiButton[] {
  drawBackground(ctx, t);

  const { loot } = session;
  const title = loot.scrap > 0
    ? "UPLOADED"
    : session.timedOut
      ? "TIME OUT"
      : session.outcome === "fail"
        ? "LOCKED OUT"
        : session.outcome === "partial"
          ? "PARTIAL"
          : "BREACHED";
  const color =
    loot.scrap > 0
      ? theme.ok
      : session.timedOut || session.outcome === "fail"
        ? theme.fail
        : session.outcome === "breach"
          ? theme.ok
          : theme.warn;

  ctx.fillStyle = color;
  ctx.font = "800 64px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, 220);

  ctx.fillStyle = theme.warn;
  ctx.font = "700 28px 'Chakra Petch', sans-serif";
  ctx.fillText(stars > 0 ? "★".repeat(stars) : "—", W / 2, 280);

  ctx.fillStyle = theme.text;
  ctx.font = "700 28px 'JetBrains Mono', monospace";
  ctx.fillText(String(session.score).padStart(6, "0"), W / 2, 320);
  if (worldRank) {
    ctx.fillStyle = theme.accent;
    ctx.font = "700 18px 'Chakra Petch', sans-serif";
    ctx.fillText(`WORLD #${worldRank}`, W / 2, 348);
  }

  let lootY = worldRank ? 390 : 360;
  if (loot.scrap > 0 || loot.components > 0) {
    ctx.fillStyle = theme.text;
    ctx.font = "700 24px 'Chakra Petch', sans-serif";
    if (loot.scrap > 0) {
      ctx.fillText(`SCRAP  +${loot.scrap}`, W / 2, lootY);
      lootY += 32;
    }
    if (loot.components > 0) {
      ctx.fillText(`COMP  +${loot.components}`, W / 2, lootY);
      lootY += 32;
    }
  }

  session.daemons.forEach((d, i) => {
    ctx.fillStyle = d.completed ? theme.ok : theme.dim;
    ctx.font = "600 22px 'Chakra Petch', sans-serif";
    ctx.fillText(
      `${d.completed ? "✓" : "✗"}  ${d.name}`,
      W / 2,
      lootY + 20 + i * 36,
    );
  });

  const buttons = resultButtons(session, progress);
  for (const b of buttons) {
    drawButton(ctx, b, { primary: b.id === "next" || b.id === "result-deck" });
  }
  return buttons;
}

export function hitButton(buttons: UiButton[], x: number, y: number): string | null {
  for (const b of buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
  }
  return null;
}

export function hitMapNode(
  nodes: { id: number; x: number; y: number; r: number }[],
  x: number,
  y: number,
): number | null {
  for (const n of nodes) {
    const dx = x - n.x;
    const dy = y - n.y;
    if (dx * dx + dy * dy <= n.r * n.r) return n.id;
  }
  return null;
}
