import type { ButtonRect, DrawCtx } from "./draw";
import { Theme } from "./theme";
import type { EloProfile, EloResult } from "../core/elo";
import {
  PLAYER_ELO_PRESETS,
  OPPONENT_ELO_OPTIONS,
  eloToDifficulty,
} from "../core/elo";
import type { AiDifficulty } from "../core/ai";

export type Screen =
  | "home"
  | "hub"
  | "setElo"
  | "aiSelect"
  | "how"
  | "play"
  | "result";
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
  opts: { primary?: boolean; active?: boolean; sub?: string; fontSize?: number } = {},
) {
  const { x, y, w, h } = b;
  if (opts.primary) {
    ctx.fillStyle = "rgba(244,244,245,0.1)";
    ctx.fillRect(x, y, w, h);
  } else if (opts.active) {
    ctx.fillStyle = "rgba(244,244,245,0.08)";
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
    ctx.font = `400 11px ${Theme.font}`;
    ctx.fillText(opts.sub, x + w / 2, y + h / 2 + 12);
  } else {
    ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  }
}

/** Brand landing — logo first, one CTA. */
export function drawHome(dc: DrawCtx, buttons: ButtonRect[]) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  ctx.fillStyle = Theme.bg;
  ctx.fillRect(0, 0, width, height);

  const logoH = compact ? 88 : 128;
  const logoY = height * 0.28;
  if (logoReady && logoImg) {
    const aspect = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
    const logoW = logoH * aspect;
    ctx.drawImage(logoImg, width / 2 - logoW / 2, logoY - logoH / 2, logoW, logoH);
  } else {
    ctx.fillStyle = Theme.ink;
    ctx.font = `500 ${compact ? 36 : 52}px ${Theme.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NEXUS", width / 2, logoY);
  }

  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 ${compact ? 13 : 15}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.fillText("Zone-control chess", width / 2, logoY + logoH / 2 + (compact ? 28 : 36));

  const btnW = Math.min(260, width - pad * 2);
  const play: ButtonRect = {
    x: (width - btnW) / 2,
    y: height * 0.62,
    w: btnW,
    h: compact ? 52 : 56,
    id: "home-play",
  };
  drawBtn(ctx, play, "Play", { primary: true, fontSize: compact ? 16 : 18 });
  buttons.push(play);
}

/** Play hub after home — modes + rating. */
export function drawHub(dc: DrawCtx, buttons: ButtonRect[], profile: EloProfile) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  ctx.fillStyle = Theme.bg;
  ctx.fillRect(0, 0, width, height);

  const logoH = compact ? 40 : 52;
  if (logoReady && logoImg) {
    const aspect = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
    const logoW = logoH * aspect;
    ctx.drawImage(logoImg, width / 2 - logoW / 2, compact ? 28 : 36, logoW, logoH);
  }

  // Tappable rating (chess.com style — tap to set)
  const eloY = compact ? 28 + logoH + 24 : 36 + logoH + 28;
  const eloCardW = Math.min(280, width - pad * 2);
  const eloCard: ButtonRect = {
    x: (width - eloCardW) / 2,
    y: eloY,
    w: eloCardW,
    h: compact ? 72 : 80,
    id: "hub-setelo",
  };
  ctx.strokeStyle = Theme.hairline;
  ctx.strokeRect(eloCard.x + 0.5, eloCard.y + 0.5, eloCard.w - 1, eloCard.h - 1);
  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 11px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("YOUR RATING", width / 2, eloCard.y + 22);
  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 28 : 32}px ${Theme.font}`;
  ctx.fillText(String(profile.rating), width / 2, eloCard.y + (compact ? 50 : 54));
  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 10px ${Theme.font}`;
  ctx.fillText(
    profile.hasSetRating
      ? `${profile.wins}W · ${profile.losses}L · tap to change`
      : "tap to set your rating",
    width / 2,
    eloCard.y + eloCard.h - 12,
  );
  buttons.push(eloCard);

  const btnW = Math.min(320, width - pad * 2);
  const btnX = (width - btnW) / 2;
  const btnH = compact ? 50 : 54;
  let by = eloCard.y + eloCard.h + (compact ? 24 : 32);

  const vsAi: ButtonRect = { x: btnX, y: by, w: btnW, h: btnH, id: "menu-vsai" };
  drawBtn(ctx, vsAi, "Play Computer", { primary: true, fontSize: compact ? 15 : 16 });
  buttons.push(vsAi);
  by += btnH + 12;

  const local: ButtonRect = { x: btnX, y: by, w: btnW, h: btnH, id: "menu-local" };
  drawBtn(ctx, local, "Local Multiplayer", { fontSize: compact ? 15 : 16 });
  buttons.push(local);
  by += btnH + 12;

  const how: ButtonRect = { x: btnX, y: by, w: btnW, h: btnH - 6, id: "menu-how" };
  drawBtn(ctx, how, "How to Play", { fontSize: compact ? 13 : 14 });
  buttons.push(how);

  const back: ButtonRect = {
    x: btnX,
    y: height - pad - 40,
    w: btnW,
    h: 36,
    id: "hub-home",
  };
  drawBtn(ctx, back, "Home", { fontSize: 12 });
  buttons.push(back);
}

/** Chess.com-style: choose your rating. */
export function drawSetElo(
  dc: DrawCtx,
  buttons: ButtonRect[],
  profile: EloProfile,
  selectedElo: number,
) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  ctx.fillStyle = Theme.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 18 : 22}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.fillText("What's your rating?", width / 2, compact ? 36 : 48);

  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 12px ${Theme.font}`;
  ctx.fillText("Pick a starting level — like Chess.com", width / 2, compact ? 58 : 72);

  const btnW = Math.min(340, width - pad * 2);
  const btnX = (width - btnW) / 2;
  const cols = 2;
  const gap = 8;
  const cellW = (btnW - gap) / cols;
  const cellH = compact ? 52 : 58;
  let by = compact ? 80 : 100;

  for (let i = 0; i < PLAYER_ELO_PRESETS.length; i++) {
    const p = PLAYER_ELO_PRESETS[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const b: ButtonRect = {
      x: btnX + col * (cellW + gap),
      y: by + row * (cellH + gap),
      w: cellW,
      h: cellH,
      id: `elo-preset-${p.elo}`,
    };
    drawBtn(ctx, b, `${p.label}`, {
      active: selectedElo === p.elo,
      primary: selectedElo === p.elo,
      sub: String(p.elo),
      fontSize: compact ? 12 : 13,
    });
    buttons.push(b);
  }

  const rows = Math.ceil(PLAYER_ELO_PRESETS.length / cols);
  const adjY = by + rows * (cellH + gap) + 8;
  const half = (btnW - 10) / 2;
  const minus: ButtonRect = { x: btnX, y: adjY, w: half, h: 40, id: "elo-minus" };
  const plus: ButtonRect = { x: btnX + half + 10, y: adjY, w: half, h: 40, id: "elo-plus" };
  drawBtn(ctx, minus, "− 100", { fontSize: 14 });
  drawBtn(ctx, plus, "+ 100", { fontSize: 14 });
  buttons.push(minus, plus);

  ctx.fillStyle = Theme.inkDim;
  ctx.font = `500 15px ${Theme.font}`;
  ctx.fillText(`Selected  ${selectedElo}`, width / 2, adjY + 56);

  const save: ButtonRect = {
    x: btnX,
    y: height - pad - 50,
    w: btnW,
    h: 46,
    id: "elo-save",
  };
  drawBtn(ctx, save, profile.hasSetRating ? "Save Rating" : "Continue", {
    primary: true,
    fontSize: 15,
  });
  buttons.push(save);
}

/** Chess.com-style: choose computer rating. */
export function drawAiSelect(
  dc: DrawCtx,
  buttons: ButtonRect[],
  profile: EloProfile,
  selectedOppElo: number,
) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  ctx.fillStyle = Theme.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 18 : 22}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.fillText("Play Computer", width / 2, compact ? 40 : 52);

  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 12px ${Theme.font}`;
  ctx.fillText(`You  ${profile.rating}  ·  choose opponent rating`, width / 2, compact ? 64 : 78);

  // Big selected opponent Elo
  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 40 : 52}px ${Theme.font}`;
  ctx.fillText(String(selectedOppElo), width / 2, compact ? 120 : 140);

  const diff = eloToDifficulty(selectedOppElo);
  const diffLabel = ["", "Easy", "Normal", "Hard", "Expert"][diff];
  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 12px ${Theme.font}`;
  ctx.fillText(diffLabel, width / 2, compact ? 148 : 176);

  // − / + like chess.com rating stepper
  const btnW = Math.min(320, width - pad * 2);
  const btnX = (width - btnW) / 2;
  const stepY = compact ? 170 : 200;
  const half = (btnW - 10) / 2;
  const minus: ButtonRect = { x: btnX, y: stepY, w: half, h: 44, id: "opp-minus" };
  const plus: ButtonRect = { x: btnX + half + 10, y: stepY, w: half, h: 44, id: "opp-plus" };
  drawBtn(ctx, minus, "−", { fontSize: 20 });
  drawBtn(ctx, plus, "+", { fontSize: 20 });
  buttons.push(minus, plus);

  // Quick chips
  const chipY = stepY + 60;
  const cols = compact ? 4 : 4;
  const gap = 8;
  const chipW = (btnW - gap * (cols - 1)) / cols;
  const chipH = 36;
  for (let i = 0; i < OPPONENT_ELO_OPTIONS.length; i++) {
    const elo = OPPONENT_ELO_OPTIONS[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const b: ButtonRect = {
      x: btnX + col * (chipW + gap),
      y: chipY + row * (chipH + gap),
      w: chipW,
      h: chipH,
      id: `opp-${elo}`,
    };
    drawBtn(ctx, b, String(elo), {
      active: selectedOppElo === elo,
      primary: selectedOppElo === elo,
      fontSize: 12,
    });
    buttons.push(b);
  }

  const rows = Math.ceil(OPPONENT_ELO_OPTIONS.length / cols);
  const playY = chipY + rows * (chipH + gap) + 16;
  const start: ButtonRect = { x: btnX, y: playY, w: btnW, h: 48, id: "opp-start" };
  drawBtn(ctx, start, "Start Game", { primary: true, fontSize: 15 });
  buttons.push(start);

  const back: ButtonRect = { x: btnX, y: playY + 56, w: btnW, h: 40, id: "menu-back" };
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
    "Set your rating, then pick a computer rating",
    "to play — just like Chess.com.",
    "Local multiplayer is unrated.",
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
    opponentElo?: number;
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
    ctx.drawImage(logoImg, width / 2 - logoW / 2, height * 0.2 - logoH, logoW, logoH);
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
  ctx.fillText(title, width / 2, height * 0.3);

  if (opts.elo) {
    const sign = opts.elo.delta >= 0 ? "+" : "";
    ctx.fillStyle = opts.elo.delta >= 0 ? Theme.ink : Theme.inkDim;
    ctx.font = `500 ${compact ? 22 : 26}px ${Theme.font}`;
    ctx.fillText(`${opts.elo.after}  (${sign}${opts.elo.delta})`, width / 2, height * 0.4);
    ctx.fillStyle = Theme.inkMute;
    ctx.font = `400 12px ${Theme.font}`;
    ctx.fillText(`vs ${opts.elo.opponentElo}`, width / 2, height * 0.4 + 28);
  } else if (opts.mode === "local") {
    ctx.fillStyle = Theme.inkMute;
    ctx.font = `400 13px ${Theme.font}`;
    ctx.fillText("Unrated local match", width / 2, height * 0.4);
  }

  const btnW = Math.min(280, width - pad * 2);
  const btnX = (width - btnW) / 2;
  const rematch: ButtonRect = { x: btnX, y: height * 0.52, w: btnW, h: 48, id: "result-rematch" };
  const menu: ButtonRect = { x: btnX, y: height * 0.52 + 60, w: btnW, h: 44, id: "result-menu" };
  drawBtn(ctx, rematch, "Rematch", { primary: true, fontSize: 15 });
  drawBtn(ctx, menu, "Play Menu", { fontSize: 14 });
  buttons.push(rematch, menu);
}

export function hitMenuButton(buttons: ButtonRect[], px: number, py: number): string | null {
  for (const b of buttons) {
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b.id;
  }
  return null;
}

// Re-export for main typing convenience
export type { AiDifficulty };
