import type { Session } from "../core/session";
import { LEVELS } from "../core/levels";
import type { Pos, Progress } from "../core/types";
import { getFlashes, getPunches, getShake } from "./motion";
import { H, W, theme } from "./theme";

export { W, H };

export type Screen = "home" | "how" | "map" | "play" | "result";

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

export function homeButtons(soundOn: boolean): UiButton[] {
  const bw = W - PAD * 2;
  const bh = 64;
  const cx = PAD;
  let y = 720;
  return [
    { id: "play", x: cx, y, w: bw, h: bh, label: "PLAY" },
    { id: "map", x: cx, y: (y += bh + 16), w: bw, h: bh, label: "ACCESS MAP" },
    { id: "how", x: cx, y: (y += bh + 16), w: bw, h: bh, label: "HOW TO BREACH" },
    {
      id: "sound",
      x: cx,
      y: (y += bh + 16),
      w: bw,
      h: bh,
      label: soundOn ? "SOUND: ON" : "SOUND: OFF",
    },
  ];
}

export function drawHome(
  ctx: CanvasRenderingContext2D,
  t: number,
  soundOn: boolean,
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
  ctx.fillText("TRACE. CRACK. OVERRIDE.", W / 2, 440);

  // Decorative matrix strip
  ctx.font = "700 18px 'JetBrains Mono', monospace";
  const demo = ["1C", "55", "7A", "BD", "E9", "FF"];
  demo.forEach((tok, i) => {
    const x = 90 + i * 90;
    const y = 540;
    roundRect(ctx, x, y, 70, 48, 6);
    ctx.fillStyle = i === Math.floor(t * 2) % 6 ? theme.accent : theme.bg2;
    ctx.fill();
    ctx.fillStyle = i === Math.floor(t * 2) % 6 ? theme.bg0 : theme.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tok, x + 35, y + 25);
  });
  ctx.restore();

  const buttons = homeButtons(soundOn);
  for (const b of buttons) {
    drawButton(ctx, b, { primary: b.id === "play" });
  }
  return buttons;
}

const HOW_PANELS = [
  {
    title: "PATH",
    body: "Pick any opening code. After that, alternate: stay on the same ROW, then the same COLUMN. Each cell once.",
  },
  {
    title: "BUFFER",
    body: "Every pick fills your buffer. When it is full, the breach resolves. Sticky glyphs cost two slots.",
  },
  {
    title: "DAEMONS",
    body: "Complete each required sequence as a contiguous run in your buffer. Optional forks are bonus stars.",
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
    {
      id: "map-play",
      x: PAD + 220,
      y: H - 120,
      w: W - PAD * 2 - 220,
      h: 64,
      label: `BREACH ${selected}`,
    },
  ];
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

  const level = LEVELS.find((l) => l.id === selected);
  if (level) {
    ctx.fillStyle = theme.muted;
    ctx.font = "600 20px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(level.name, W / 2, H - 200);
    ctx.fillText(level.brief, W / 2, H - 168);
  }

  for (const b of layout.buttons) {
    drawButton(ctx, b, {
      primary: b.id === "map-play",
      muted: b.id === "map-play" && selected > progress.unlocked,
    });
  }
  return layout;
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
  const originY = 290;
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

export function playButtons(session: Session): UiButton[] {
  const buttons: UiButton[] = [
    { id: "play-menu", x: PAD, y: 24, w: 120, h: 48, label: "MAP" },
  ];
  if (session.level.twists.earlyConfirm && !session.ended && session.buffer.length > 0) {
    buttons.push({
      id: "confirm",
      x: W - PAD - 200,
      y: 24,
      w: 200,
      h: 48,
      label: "CONFIRM",
    });
  }
  return buttons;
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
  ctx.fillStyle = theme.muted;
  ctx.font = "700 18px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`L${level.id}  ${level.name}`, PAD + 140, 54);

  // Buffer strip
  drawBuffer(ctx, session);

  // Daemons
  drawDaemons(ctx, session);

  const layout = boardLayout(level.size);
  const legalSet = new Set(legal.map((p) => `${p.c},${p.r}`));

  // Axis highlight
  if (session.last && session.axis) {
    ctx.save();
    ctx.fillStyle = theme.legalGlow;
    if (session.axis === "row") {
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
      if (cell.kind === "jam") {
        ctx.fillStyle = theme.jam;
      } else if (cell.used) {
        ctx.fillStyle = theme.used;
      } else if (cell.kind === "sticky") {
        ctx.fillStyle = "#3a241c";
      } else {
        ctx.fillStyle = isLegal ? "#243830" : theme.bg2;
      }
      ctx.fill();
      if (isLegal) {
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (cell.kind === "sticky" && !cell.used) {
        ctx.strokeStyle = theme.sticky;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (cell.kind !== "jam") {
        ctx.fillStyle = cell.used ? theme.dim : theme.text;
        ctx.font = `700 ${Math.floor(layout.cell * 0.32)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cell.token, x + layout.cell / 2, y + layout.cell / 2 + 1);
      } else {
        ctx.fillStyle = theme.fail;
        ctx.font = `700 ${Math.floor(layout.cell * 0.22)}px 'Chakra Petch', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("JAM", x + layout.cell / 2, y + layout.cell / 2);
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
  for (const b of buttons) drawButton(ctx, b, { primary: b.id === "confirm" });

  if (shake > 0) ctx.restore();
  return { buttons, layout };
}

function drawBuffer(ctx: CanvasRenderingContext2D, session: Session): void {
  const slots = session.level.buffer;
  const gap = 8;
  const totalGap = gap * (slots - 1);
  const slotW = Math.min(72, Math.floor((W - PAD * 2 - totalGap) / slots));
  const total = slotW * slots + totalGap;
  const ox = (W - total) / 2;
  const y = 90;
  const occupied = slots - session.remaining;

  ctx.fillStyle = theme.muted;
  ctx.font = "700 16px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("BUFFER", PAD, y - 12);

  ctx.textAlign = "right";
  ctx.fillText(`${session.remaining} LEFT`, W - PAD, y - 12);

  let tokenIndex = 0;
  for (let i = 0; i < slots; i++) {
    const x = ox + i * (slotW + gap);
    roundRect(ctx, x, y, slotW, 52, 6);
    const filled = i < occupied;
    const tok = filled ? session.buffer[tokenIndex] : undefined;
    if (filled && tok !== undefined) tokenIndex += 1;
    // Sticky may occupy an extra slot without a second token — show dim fill.
    ctx.fillStyle = filled ? (tok ? theme.accent : "#6a9e78") : theme.bg2;
    ctx.fill();
    if (tok) {
      ctx.fillStyle = theme.bg0;
      ctx.font = "700 20px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tok, x + slotW / 2, y + 27);
    } else if (filled) {
      ctx.fillStyle = theme.bg0;
      ctx.font = "700 14px 'Chakra Petch', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("×2", x + slotW / 2, y + 27);
    }
  }
}

function drawDaemons(ctx: CanvasRenderingContext2D, session: Session): void {
  const y0 = 160;
  const flashes = new Set(getFlashes().map((f) => f.id));
  session.daemons.forEach((d, i) => {
    const x = PAD;
    const y = y0 + i * 36;
    const label = d.required ? d.name : `${d.name} ★`;
    ctx.fillStyle = d.completed
      ? theme.ok
      : flashes.has(d.id)
        ? theme.warn
        : theme.muted;
    ctx.font = "700 18px 'Chakra Petch', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);

    let seqX = x + 160;
    d.sequence.forEach((tok, si) => {
      const lit = d.completed || si < d.matched;
      ctx.fillStyle = lit ? theme.accent : theme.dim;
      ctx.font = "700 16px 'JetBrains Mono', monospace";
      ctx.fillText(tok, seqX, y);
      seqX += 40;
    });
  });
}

export function resultButtons(session: Session, progress: Progress): UiButton[] {
  const bw = (W - PAD * 2 - 16) / 2;
  const y = H - 200;
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
    { id: "result-home", x: PAD, y: y + 80, w: W - PAD * 2, h: 56, label: "HOME" },
  ];
}

export function drawResult(
  ctx: CanvasRenderingContext2D,
  t: number,
  session: Session,
  progress: Progress,
  stars: number,
): UiButton[] {
  drawBackground(ctx, t);

  const title =
    session.outcome === "breach"
      ? "BREACHED"
      : session.outcome === "partial"
        ? "PARTIAL"
        : "LOCKED OUT";
  const color =
    session.outcome === "breach"
      ? theme.ok
      : session.outcome === "partial"
        ? theme.warn
        : theme.fail;

  ctx.fillStyle = color;
  ctx.font = "800 64px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, 280);

  ctx.fillStyle = theme.warn;
  ctx.font = "700 36px 'Chakra Petch', sans-serif";
  ctx.fillText(stars > 0 ? "★".repeat(stars) : "—", W / 2, 360);

  ctx.fillStyle = theme.text;
  ctx.font = "700 28px 'Chakra Petch', sans-serif";
  ctx.fillText(`SCORE ${session.score}`, W / 2, 430);

  session.daemons.forEach((d, i) => {
    ctx.fillStyle = d.completed ? theme.ok : theme.dim;
    ctx.font = "600 22px 'Chakra Petch', sans-serif";
    ctx.fillText(
      `${d.completed ? "✓" : "✗"}  ${d.name}${d.required ? "" : " (opt)"}`,
      W / 2,
      500 + i * 36,
    );
  });

  const buttons = resultButtons(session, progress);
  for (const b of buttons) {
    drawButton(ctx, b, { primary: b.id === "next" });
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
