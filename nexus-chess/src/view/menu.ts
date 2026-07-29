import type { ButtonRect, DrawCtx } from "./draw";
import { Theme } from "./theme";
import type { AiDifficulty } from "../core/ai";
import { AI_DIFFICULTY_LABELS } from "../core/ai";
import type { EloProfile, EloResult } from "../core/elo";
import { AI_ELO } from "../core/elo";

export type Screen = "home" | "aiSelect" | "how" | "play" | "result";
export type PlayMode = "ai" | "local";

let logoImg: HTMLImageElement | null = null;
let logoReady = false;

export function setMenuLogo(img: HTMLImageElement | null) {
  logoImg = img;
  logoReady = !!img;
}

function drawBtn(
  ctx: CanvasRenderingContext2D,
  b: ButtonRect,
  label: string,
  opts: { primary?: boolean; active?: boolean; sub?: string; fontSize?: number },
) {
  const { x, y, w, h } = b;
  if (opts.primary) {
    ctx.fillStyle = "rgba(244,244,245,0.1)";
    ctx.fillRect(x, y, w, h);
  } else if (opts.active) {
    ctx.fillStyle = "rgba(244,244,245,0.06)";
    ctx.fillRect(x, y, w, h);
  }

  ctx.strokeStyle = opts.primary || opts.active ? Theme.hairlineStrong : Theme.hairline;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${opts.fontSize ?? 15}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (opts.sub) {
    ctx.fillText(label, x + w / 2, y + h / 2 - 8);
    ctx.fillStyle = Theme.inkMute;
    ctx.font = `400 12px ${Theme.font}`;
    ctx.fillText(opts.sub, x + w / 2, y + h / 2 + 12);
  } else {
    ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  }
}

export function drawHome(
  dc: DrawCtx,
  buttons: ButtonRect[],
  profile: EloProfile,
) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  ctx.fillStyle = Theme.bg;
  ctx.fillRect(0, 0, width, height);

  // Logo
  const logoH = compact ? 64 : 96;
  if (logoReady && logoImg) {
    const aspect = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
    const logoW = logoH * aspect;
    ctx.drawImage(logoImg, width / 2 - logoW / 2, compact ? height * 0.12 : height * 0.14, logoW, logoH);
  } else {
    ctx.fillStyle = Theme.ink;
    ctx.font = `500 ${compact ? 28 : 40}px ${Theme.font}`;
    ctx.textAlign = "center";
    ctx.fillText("NEXUS", width / 2, compact ? height * 0.2 : height * 0.22);
  }

  // Elo card
  const eloY = compact ? height * 0.12 + logoH + 28 : height * 0.14 + logoH + 36;
  ctx.fillStyle = Theme.inkDim;
  ctx.font = `400 ${compact ? 12 : 13}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.fillText("RATING", width / 2, eloY);
  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 28 : 36}px ${Theme.font}`;
  ctx.fillText(String(profile.rating), width / 2, eloY + (compact ? 28 : 34));
  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 ${compact ? 11 : 12}px ${Theme.font}`;
  ctx.fillText(
    `${profile.wins}W  ·  ${profile.losses}L  ·  ${profile.games} games`,
    width / 2,
    eloY + (compact ? 52 : 60),
  );

  const btnW = Math.min(320, width - pad * 2);
  const btnX = (width - btnW) / 2;
  const btnH = compact ? 52 : 56;
  const gap = 12;
  let by = eloY + (compact ? 80 : 96);

  const vsAi: ButtonRect = { x: btnX, y: by, w: btnW, h: btnH, id: "menu-vsai" };
  drawBtn(ctx, vsAi, "Play vs AI", { primary: true, fontSize: compact ? 15 : 16 });
  buttons.push(vsAi);
  by += btnH + gap;

  const local: ButtonRect = { x: btnX, y: by, w: btnW, h: btnH, id: "menu-local" };
  drawBtn(ctx, local, "Local Multiplayer", { fontSize: compact ? 15 : 16 });
  buttons.push(local);
  by += btnH + gap;

  const how: ButtonRect = { x: btnX, y: by, w: btnW, h: btnH - 8, id: "menu-how" };
  drawBtn(ctx, how, "How to Play", { fontSize: compact ? 13 : 14 });
  buttons.push(how);

  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 11px ${Theme.font}`;
  ctx.fillText("Hold the Nexus with your King  ·  or assassinate theirs inside it", width / 2, height - pad - 8);
}

export function drawAiSelect(dc: DrawCtx, buttons: ButtonRect[], profile: EloProfile) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  ctx.fillStyle = Theme.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 20 : 24}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.fillText("Select Difficulty", width / 2, compact ? 56 : 72);

  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 12px ${Theme.font}`;
  ctx.fillText(`Your rating  ${profile.rating}`, width / 2, compact ? 82 : 102);

  const levels: Exclude<AiDifficulty, 0>[] = [1, 2, 3, 4];
  const btnW = Math.min(340, width - pad * 2);
  const btnX = (width - btnW) / 2;
  const btnH = compact ? 56 : 60;
  let by = compact ? 120 : 140;

  for (const d of levels) {
    const b: ButtonRect = { x: btnX, y: by, w: btnW, h: btnH, id: `ai-${d}` };
    drawBtn(ctx, b, AI_DIFFICULTY_LABELS[d], {
      primary: d === 2,
      sub: `AI rating ${AI_ELO[d]}`,
      fontSize: compact ? 15 : 16,
    });
    buttons.push(b);
    by += btnH + 10;
  }

  const back: ButtonRect = { x: btnX, y: by + 8, w: btnW, h: 40, id: "menu-back" };
  drawBtn(ctx, back, "Back", { fontSize: 13 });
  buttons.push(back);
}

export function drawHowTo(dc: DrawCtx, buttons: ButtonRect[]) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  ctx.fillStyle = Theme.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 20 : 24}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.fillText("How to Play", width / 2, compact ? 52 : 64);

  const lines = [
    "Win by holding the Nexus (d4–e5) with your King",
    "for one full round — or capture the enemy King",
    "only while it stands inside the Nexus.",
    "",
    "Kings are invincible outside the Nexus.",
    "Earn Mana to cast Aegis, Overdrive, or Swap",
    "before your move each turn.",
    "",
    "Vs AI games update your Elo rating.",
    "Local multiplayer is unrated hotseat.",
  ];

  ctx.fillStyle = Theme.inkDim;
  ctx.font = `400 ${compact ? 13 : 14}px ${Theme.font}`;
  let ty = compact ? 100 : 120;
  for (const line of lines) {
    ctx.fillText(line, width / 2, ty);
    ty += compact ? 22 : 26;
  }

  const btnW = Math.min(280, width - pad * 2);
  const back: ButtonRect = {
    x: (width - btnW) / 2,
    y: height - pad - 48,
    w: btnW,
    h: 44,
    id: "menu-back",
  };
  drawBtn(ctx, back, "Back", { primary: true, fontSize: 14 });
  buttons.push(back);
}

export function drawResult(
  dc: DrawCtx,
  buttons: ButtonRect[],
  opts: {
    winner: "w" | "b";
    mode: PlayMode;
    elo?: EloResult | null;
    difficulty?: AiDifficulty;
  },
) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  ctx.fillStyle = "rgba(7,7,8,0.92)";
  ctx.fillRect(0, 0, width, height);

  if (logoReady && logoImg) {
    const logoH = compact ? 40 : 56;
    const aspect = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
    const logoW = logoH * aspect;
    ctx.drawImage(logoImg, width / 2 - logoW / 2, height * 0.22 - logoH, logoW, logoH);
  }

  const title =
    opts.mode === "ai"
      ? opts.winner === "w"
        ? "Victory"
        : "Defeat"
      : `${opts.winner === "w" ? "White" : "Black"} wins`;

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 28 : 36}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, width / 2, height * 0.32);

  if (opts.elo) {
    const sign = opts.elo.delta >= 0 ? "+" : "";
    ctx.fillStyle = opts.elo.delta >= 0 ? Theme.ink : Theme.inkDim;
    ctx.font = `500 ${compact ? 22 : 26}px ${Theme.font}`;
    ctx.fillText(`${opts.elo.after}  (${sign}${opts.elo.delta})`, width / 2, height * 0.42);
    ctx.fillStyle = Theme.inkMute;
    ctx.font = `400 12px ${Theme.font}`;
    ctx.fillText(`vs AI ${opts.elo.opponentElo}`, width / 2, height * 0.42 + 28);
  } else if (opts.mode === "local") {
    ctx.fillStyle = Theme.inkMute;
    ctx.font = `400 13px ${Theme.font}`;
    ctx.fillText("Unrated local match", width / 2, height * 0.42);
  }

  const btnW = Math.min(280, width - pad * 2);
  const btnX = (width - btnW) / 2;
  const rematch: ButtonRect = { x: btnX, y: height * 0.55, w: btnW, h: 48, id: "result-rematch" };
  const menu: ButtonRect = { x: btnX, y: height * 0.55 + 60, w: btnW, h: 44, id: "result-menu" };
  drawBtn(ctx, rematch, "Rematch", { primary: true, fontSize: 15 });
  drawBtn(ctx, menu, "Main Menu", { fontSize: 14 });
  buttons.push(rematch, menu);
}

export function hitMenuButton(buttons: ButtonRect[], px: number, py: number): string | null {
  for (const b of buttons) {
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b.id;
  }
  return null;
}
