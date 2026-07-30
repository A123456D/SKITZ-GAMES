import type { ButtonRect, DrawCtx } from "./draw";
import { Theme } from "./theme";
import { drawAtmosphere, drawPanel, drawPremiumBtn } from "./fx";
import { volLevelLabel } from "./sfx";
import type { EloProfile, EloResult } from "../core/elo";
import {
  PLAYER_ELO_PRESETS,
  OPPONENT_ELO_OPTIONS,
  eloToDifficulty,
} from "../core/elo";
import type { AiDifficulty } from "../core/ai";
import { getPieceImage } from "./pieces";

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

function drawLogo(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  logoH: number,
  time = 0,
) {
  const breathe = 1 + 0.018 * Math.sin(time * 1.1);
  const h = logoH * breathe;
  if (logoReady && logoImg) {
    const aspect = logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight);
    const logoW = h * aspect;
    // Soft halo behind mark
    const glow = ctx.createRadialGradient(width / 2, y, 0, width / 2, y, logoW * 0.7);
    glow.addColorStop(0, "rgba(255,255,255,0.07)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(width / 2, y, logoW * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(logoImg, width / 2 - logoW / 2, y - h / 2, logoW, h);
  } else {
    ctx.fillStyle = Theme.ink;
    ctx.font = `500 ${logoH * 0.55}px ${Theme.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NEXUS", width / 2, y);
  }
}

/** Brand landing — logo first, one CTA. */
export function drawHome(dc: DrawCtx, buttons: ButtonRect[], time = 0) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  drawAtmosphere(ctx, width, height, time);

  const logoH = compact ? 96 : 140;
  const logoY = height * 0.3;
  drawLogo(ctx, width, logoY, logoH, time);

  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 ${compact ? 13 : 15}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "0.18em";
  ctx.fillText("ZONE-CONTROL CHESS", width / 2, logoY + logoH / 2 + (compact ? 30 : 40));
  ctx.letterSpacing = "0px";

  // Showcase both armies so white vs black reads clearly
  if (Theme.pieceMode === "sprites") {
    const kinds = ["K", "Q", "B", "N", "R", "P"] as const;
    const size = compact ? 32 : 42;
    const gap = compact ? 8 : 12;
    const total = kinds.length * size + (kinds.length - 1) * gap;
    const py = logoY + logoH / 2 + (compact ? 52 : 68);
    let px = (width - total) / 2;
    for (const k of kinds) {
      const img = getPieceImage("w", k);
      if (img) ctx.drawImage(img, px, py, size, size);
      px += size + gap;
    }
    const py2 = py + size + (compact ? 8 : 10);
    px = (width - total) / 2;
    for (const k of kinds) {
      const img = getPieceImage("b", k);
      if (img) ctx.drawImage(img, px, py2, size, size);
      px += size + gap;
    }
  }

  const btnW = Math.min(260, width - pad * 2);
  const play: ButtonRect = {
    x: (width - btnW) / 2,
    y: height * 0.66,
    w: btnW,
    h: compact ? 52 : 56,
    id: "home-play",
  };
  drawPremiumBtn(ctx, play, "Play", { primary: true, fontSize: compact ? 16 : 18 });
  buttons.push(play);

  const vol: ButtonRect = {
    x: (width - btnW) / 2,
    y: play.y + play.h + 12,
    w: btnW,
    h: compact ? 44 : 48,
    id: "home-volume",
  };
  drawPremiumBtn(ctx, vol, `Volume · ${volLevelLabel()}`, { fontSize: compact ? 13 : 14 });
  buttons.push(vol);

  const feedback: ButtonRect = {
    x: (width - btnW) / 2,
    y: vol.y + vol.h + 12,
    w: btnW,
    h: compact ? 44 : 48,
    id: "home-feedback",
  };
  drawPremiumBtn(ctx, feedback, "Feedback", { fontSize: compact ? 13 : 14 });
  buttons.push(feedback);
}

/** Play hub after home — modes + rating. */
export function drawHub(
  dc: DrawCtx,
  buttons: ButtonRect[],
  profile: EloProfile,
  time = 0,
  opts: { canResume?: boolean } = {},
) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  drawAtmosphere(ctx, width, height, time);

  const logoH = compact ? 42 : 56;
  drawLogo(ctx, width, compact ? 48 : 58, logoH, time * 0.6);

  const eloY = compact ? 28 + logoH + 36 : 36 + logoH + 42;
  const eloCardW = Math.min(280, width - pad * 2);
  const eloCard: ButtonRect = {
    x: (width - eloCardW) / 2,
    y: eloY,
    w: eloCardW,
    h: compact ? 76 : 86,
    id: "hub-setelo",
  };
  drawPanel(ctx, eloCard.x, eloCard.y, eloCard.w, eloCard.h, { strong: true });
  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 10px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "0.22em";
  ctx.fillText("YOUR RATING", width / 2, eloCard.y + 22);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 30 : 36}px ${Theme.font}`;
  ctx.fillText(String(profile.rating), width / 2, eloCard.y + (compact ? 52 : 56));
  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 10px ${Theme.font}`;
  ctx.fillText(
    profile.hasSetRating
      ? `${profile.wins}W · ${profile.losses}L · tap to change`
      : "tap to set your rating",
    width / 2,
    eloCard.y + eloCard.h - 14,
  );
  buttons.push(eloCard);

  const btnW = Math.min(320, width - pad * 2);
  const btnX = (width - btnW) / 2;
  const btnH = compact ? 50 : 54;
  let by = eloCard.y + eloCard.h + (compact ? 20 : 28);

  if (opts.canResume) {
    const resume: ButtonRect = { x: btnX, y: by, w: btnW, h: btnH, id: "hub-resume" };
    drawPremiumBtn(ctx, resume, "Resume Game", { primary: true, fontSize: compact ? 15 : 16 });
    buttons.push(resume);
    by += btnH + 12;
  }

  const vsAi: ButtonRect = { x: btnX, y: by, w: btnW, h: btnH, id: "menu-vsai" };
  drawPremiumBtn(ctx, vsAi, "Play Computer", {
    primary: !opts.canResume,
    fontSize: compact ? 15 : 16,
  });
  buttons.push(vsAi);
  by += btnH + 12;

  const local: ButtonRect = { x: btnX, y: by, w: btnW, h: btnH, id: "menu-local" };
  drawPremiumBtn(ctx, local, "Local Multiplayer", { fontSize: compact ? 15 : 16 });
  buttons.push(local);
  by += btnH + 12;

  const how: ButtonRect = { x: btnX, y: by, w: btnW, h: btnH - 6, id: "menu-how" };
  drawPremiumBtn(ctx, how, "How to Play", { fontSize: compact ? 13 : 14 });
  buttons.push(how);
  by += btnH + 10;

  const back: ButtonRect = {
    x: btnX,
    y: height - pad - 40,
    w: btnW,
    h: 36,
    id: "hub-home",
  };
  drawPremiumBtn(ctx, back, "Home", { fontSize: 12 });
  buttons.push(back);

  // Board toggle — does not reset match / elo selection
  const boardW = Math.min(200, btnW);
  const boardBtn: ButtonRect = {
    x: (width - boardW) / 2,
    y: back.y - 48,
    w: boardW,
    h: 34,
    id: "hub-board",
  };
  drawPremiumBtn(ctx, boardBtn, `Board · ${Theme.label}`, {
    active: Theme.angular,
    fontSize: 12,
  });
  buttons.push(boardBtn);
}

/** Chess.com-style: choose your rating. */
export function drawSetElo(
  dc: DrawCtx,
  buttons: ButtonRect[],
  profile: EloProfile,
  selectedElo: number,
  time = 0,
) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  drawAtmosphere(ctx, width, height, time);

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 18 : 22}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
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
  const by = compact ? 80 : 100;

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
    drawPremiumBtn(ctx, b, `${p.label}`, {
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
  drawPremiumBtn(ctx, minus, "− 100", { fontSize: 14 });
  drawPremiumBtn(ctx, plus, "+ 100", { fontSize: 14 });
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
  drawPremiumBtn(ctx, save, profile.hasSetRating ? "Save Rating" : "Continue", {
    primary: true,
    fontSize: 15,
  });
  buttons.push(save);
}

/** Chess.com-style: choose computer rating + your colour. */
export function drawAiSelect(
  dc: DrawCtx,
  buttons: ButtonRect[],
  profile: EloProfile,
  selectedOppElo: number,
  playerColor: "w" | "b",
  time = 0,
) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  drawAtmosphere(ctx, width, height, time);

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 18 : 22}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Play Computer", width / 2, compact ? 36 : 46);

  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 12px ${Theme.font}`;
  ctx.fillText(`You  ${profile.rating}  ·  choose side & opponent`, width / 2, compact ? 58 : 70);

  const btnW = Math.min(320, width - pad * 2);
  const btnX = (width - btnW) / 2;
  const half = (btnW - 10) / 2;
  const colorY = compact ? 78 : 92;
  const whiteBtn: ButtonRect = { x: btnX, y: colorY, w: half, h: 40, id: "color-w" };
  const blackBtn: ButtonRect = { x: btnX + half + 10, y: colorY, w: half, h: 40, id: "color-b" };
  drawPremiumBtn(ctx, whiteBtn, "White", {
    active: playerColor === "w",
    primary: playerColor === "w",
    fontSize: 13,
  });
  drawPremiumBtn(ctx, blackBtn, "Black", {
    active: playerColor === "b",
    primary: playerColor === "b",
    fontSize: 13,
  });
  buttons.push(whiteBtn, blackBtn);

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 40 : 52}px ${Theme.font}`;
  ctx.fillText(String(selectedOppElo), width / 2, compact ? 148 : 172);

  const diff = eloToDifficulty(selectedOppElo);
  const diffLabel = ["", "Easy", "Normal", "Hard", "Expert"][diff];
  ctx.fillStyle = Theme.inkMute;
  ctx.font = `400 12px ${Theme.font}`;
  ctx.letterSpacing = "0.16em";
  ctx.fillText(diffLabel.toUpperCase(), width / 2, compact ? 174 : 204);
  ctx.letterSpacing = "0px";

  const stepY = compact ? 190 : 224;
  const minus: ButtonRect = { x: btnX, y: stepY, w: half, h: 40, id: "opp-minus" };
  const plus: ButtonRect = { x: btnX + half + 10, y: stepY, w: half, h: 40, id: "opp-plus" };
  drawPremiumBtn(ctx, minus, "−", { fontSize: 20 });
  drawPremiumBtn(ctx, plus, "+", { fontSize: 20 });
  buttons.push(minus, plus);

  const chipY = stepY + 52;
  const cols = 4;
  const gap = 8;
  const chipW = (btnW - gap * (cols - 1)) / cols;
  const chipH = 34;
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
    drawPremiumBtn(ctx, b, String(elo), {
      active: selectedOppElo === elo,
      primary: selectedOppElo === elo,
      fontSize: 12,
    });
    buttons.push(b);
  }

  const rows = Math.ceil(OPPONENT_ELO_OPTIONS.length / cols);
  const playY = Math.min(chipY + rows * (chipH + gap) + 12, height - pad - 108);
  const start: ButtonRect = { x: btnX, y: playY, w: btnW, h: 46, id: "opp-start" };
  drawPremiumBtn(ctx, start, "Start Game", { primary: true, fontSize: 15 });
  buttons.push(start);

  const back: ButtonRect = { x: btnX, y: playY + 54, w: btnW, h: 38, id: "menu-back" };
  drawPremiumBtn(ctx, back, "Back", { fontSize: 13 });
  buttons.push(back);
}

export function drawHowTo(dc: DrawCtx, buttons: ButtonRect[], time = 0) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  drawAtmosphere(ctx, width, height, time);

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 20 : 24}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
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
    "Set your rating, then pick a side and computer",
    "rating to play — just like Chess.com.",
    "Local multiplayer is unrated.",
    "Leave a match anytime — Resume keeps your progress.",
    "Switch boards from the menu without losing your game.",
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
  drawPremiumBtn(ctx, back, "Back", { primary: true, fontSize: 14 });
  buttons.push(back);
}

export function drawResult(
  dc: DrawCtx,
  buttons: ButtonRect[],
  opts: {
    winner: "w" | "b";
    mode: PlayMode;
    playerColor?: "w" | "b";
    elo?: EloResult | null;
    opponentElo?: number;
  },
  time = 0,
) {
  const { ctx, width, height, compact, pad } = dc;
  buttons.length = 0;

  drawAtmosphere(ctx, width, height, time);

  drawLogo(ctx, width, height * 0.18, compact ? 44 : 60, time);

  const human = opts.playerColor ?? "w";
  const title =
    opts.mode === "ai"
      ? opts.winner === human
        ? "Victory"
        : "Defeat"
      : `${opts.winner === "w" ? "White" : "Black"} wins`;

  // Soft animated pulse ring behind the title
  const cx = width / 2;
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
  ctx.strokeStyle = `${Theme.pulseRgba}${0.12 + pulse * 0.12})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, height * 0.32, 54 + pulse * 10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = Theme.ink;
  ctx.font = `500 ${compact ? 30 : 40}px ${Theme.font}`;
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
    ctx.fillText(`vs ${opts.elo.opponentElo}`, width / 2, height * 0.42 + 28);
  } else if (opts.mode === "local") {
    ctx.fillStyle = Theme.inkMute;
    ctx.font = `400 13px ${Theme.font}`;
    ctx.fillText("Unrated local match", width / 2, height * 0.42);
  }

  const btnW = Math.min(280, width - pad * 2);
  const btnX = (width - btnW) / 2;
  const rematch: ButtonRect = { x: btnX, y: height * 0.54, w: btnW, h: 50, id: "result-rematch" };
  const menu: ButtonRect = { x: btnX, y: height * 0.54 + 62, w: btnW, h: 44, id: "result-menu" };
  drawPremiumBtn(ctx, rematch, "Rematch", { primary: true, fontSize: 15 });
  drawPremiumBtn(ctx, menu, "Play Menu", { fontSize: 14 });
  buttons.push(rematch, menu);
}

export function hitMenuButton(buttons: ButtonRect[], px: number, py: number): string | null {
  for (const b of buttons) {
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b.id;
  }
  return null;
}

export type { AiDifficulty };
