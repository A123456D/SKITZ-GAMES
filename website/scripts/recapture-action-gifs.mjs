/**
 * Recapture action-focused GIFs for Pulse Link + Nexus Chess.
 * Usage: node scripts/recapture-action-gifs.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "images", "previews");
const TMP = join(ROOT, ".gif-capture-tmp");
const FF =
  process.env.FFMPEG ||
  "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe";

const BASE = process.argv[2] || "http://127.0.0.1:4177";
const VIEW = { width: 390, height: 780 };

function seedShiftr() {
  localStorage.setItem(
    "shiftr_web_save_v12",
    JSON.stringify({
      unlocked: 40,
      bestStars: {},
      bestMoves: {},
      lastLevelIndex: 0,
      activeRun: null,
      theme: "paper",
      musicVol: 0,
      sfxVol: 0,
      musicMuted: true,
      tutorialDone: true,
      themePicked: true,
    }),
  );
}

function seedNexus() {
  localStorage.setItem("nexus-chess-tutorialCompleted", "1");
  localStorage.setItem(
    "nexus-chess-elo",
    JSON.stringify({
      rating: 1200,
      games: 3,
      wins: 1,
      losses: 1,
      draws: 1,
      hasSetRating: true,
    }),
  );
}

async function canvasPoint(page, lx, ly) {
  return page.evaluate(
    ({ lx, ly }) => {
      const c = document.querySelector("canvas");
      if (!c) return { x: lx, y: ly };
      const r = c.getBoundingClientRect();
      const W = c.width || 720;
      const H = c.height || 1280;
      // Pulse Link: CSS size may differ from bitmap; input maps via rect
      return {
        x: r.left + (lx / W) * r.width,
        y: r.top + (ly / H) * r.height,
      };
    },
    { lx, ly },
  );
}

async function clickLogical(page, lx, ly) {
  const p = await canvasPoint(page, lx, ly);
  await page.mouse.click(p.x, p.y);
}

/** Dispatch pointer events on the Pulse Link canvas (mouse.click misses dial taps). */
async function pointerTap(page, lx, ly) {
  await page.evaluate(
    ({ lx, ly }) => {
      const c = document.querySelector("canvas");
      if (!c) return;
      const r = c.getBoundingClientRect();
      const W = 720;
      const H = 1280;
      const x = r.left + (lx / W) * r.width;
      const y = r.top + (ly / H) * r.height;
      const opts = (buttons) => ({
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        buttons,
        button: 0,
      });
      c.dispatchEvent(new PointerEvent("pointerdown", opts(1)));
      c.dispatchEvent(new PointerEvent("pointerup", opts(0)));
    },
    { lx, ly },
  );
}

/** Select a disc then tap CW dial (tap = one quarter turn). */
async function turnDisc(page, hx, hy, times = 1) {
  await pointerTap(page, hx, hy);
  await page.waitForTimeout(180);
  for (let i = 0; i < times; i++) {
    await pointerTap(page, 545, 1208); // CW dial
    await page.waitForTimeout(320);
  }
}

/** Nexus: click center of chess square in CSS pixels. */
async function clickSquare(page, sq) {
  const p = await page.evaluate((square) => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return null;
    const w = Math.floor(window.visualViewport?.width ?? window.innerWidth);
    const h = Math.floor(window.visualViewport?.height ?? window.innerHeight);
    const compact = w < 640 || h < 700;
    const pad = compact ? 16 : 28;
    const topBar = compact ? 78 : 100;
    const hud = compact ? Math.max(152, Math.min(196, h * 0.38)) : 176;
    const availW = w - pad * 2;
    const availH = h - topBar - hud;
    const maxBoard = compact ? 560 : Math.min(680, Math.floor(Math.min(availW, availH)));
    const boardSize = Math.max(160, Math.min(availW, availH, maxBoard));
    const cell = boardSize / 8;
    const boardX = (w - boardSize) / 2;
    const boardY = topBar + Math.max(0, (availH - boardSize) / 2);
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]) - 1;
    const f = file;
    const r = 7 - rank;
    const rect = canvas.getBoundingClientRect();
    // Nexus canvas CSS size == logical w/h
    return {
      x: rect.left + boardX + (f + 0.5) * cell,
      y: rect.top + boardY + (r + 0.5) * cell,
    };
  }, sq);
  if (!p) throw new Error(`No square ${sq}`);
  await page.mouse.click(p.x, p.y);
}

async function clickSkipAbility(page) {
  // Skip is the rightmost ability button in the HUD
  await page.evaluate(() => {});
  const p = await page.evaluate(() => {
    const w = Math.floor(window.visualViewport?.width ?? window.innerWidth);
    const h = Math.floor(window.visualViewport?.height ?? window.innerHeight);
    const compact = w < 640 || h < 700;
    const pad = compact ? 16 : 28;
    const topBar = compact ? 78 : 100;
    const hud = compact ? Math.max(152, Math.min(196, h * 0.38)) : 176;
    const availW = w - pad * 2;
    const availH = h - topBar - hud;
    const maxBoard = compact ? 560 : Math.min(680, Math.floor(Math.min(availW, availH)));
    const boardSize = Math.max(160, Math.min(availW, availH, maxBoard));
    const boardY = topBar + Math.max(0, (availH - boardSize) / 2);
    const contentX = pad;
    const contentW = w - pad * 2;
    // Approximate Skip button: 4th of 4 buttons under the board
    const infoY = boardY + boardSize + (compact ? 10 : 14) + (compact ? 22 : 26) * 2;
    const btnY = infoY + (compact ? 12 : 16);
    const gap = compact ? 8 : 10;
    const bw = (contentW - gap * 3) / 4;
    const bx = contentX + 3 * (bw + gap);
    const canvas = document.querySelector("canvas");
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + bx + bw / 2, y: rect.top + btnY + 22 };
  });
  await page.mouse.click(p.x, p.y);
}

function makeGif(frameDir, outPath) {
  const frames = readdirSync(frameDir)
    .filter((f) => f.endsWith(".png") && f.startsWith("frame-"))
    .sort();
  if (frames.length < 2) throw new Error(`Not enough frames in ${frameDir}`);
  const palette = join(frameDir, "palette.png");
  const pattern = join(frameDir, "frame-%03d.png");
  let r = spawnSync(
    FF,
    [
      "-y",
      "-framerate",
      "8",
      "-i",
      pattern,
      "-vf",
      "fps=6,scale=360:-1:flags=lanczos,palettegen=stats_mode=diff",
      palette,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error("palettegen failed");
  }
  r = spawnSync(
    FF,
    [
      "-y",
      "-framerate",
      "8",
      "-i",
      pattern,
      "-i",
      palette,
      "-lavfi",
      "fps=6,scale=360:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5",
      "-loop",
      "0",
      outPath,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error("gif encode failed");
  }
}

async function withCapture(page, frameDir, action) {
  mkdirSync(frameDir, { recursive: true });
  let frame = 0;
  const grab = async () => {
    const path = join(frameDir, `frame-${String(frame).padStart(3, "0")}.png`);
    await page.screenshot({ path, type: "png" });
    frame += 1;
  };
  await grab();
  const ticker = setInterval(() => {
    grab().catch(() => {});
  }, 140);
  try {
    await action();
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(160);
      await grab();
    }
  } finally {
    clearInterval(ticker);
  }
  await grab();
}

async function captureShiftr(browser) {
  const frameDir = join(TMP, "shiftr");
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  await context.addInitScript(seedShiftr);
  const page = await context.newPage();
  console.log("→ Pulse Link");
  await page.goto(`${BASE}/games/shiftr/web/`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(700);

  await withCapture(page, frameDir, async () => {
    await page.waitForSelector("canvas#game");
    await page.waitForTimeout(500);
    await pointerTap(page, 360, 484); // PLAY
    await page.waitForTimeout(1000);

    // 3x3 desk hubs — select each and turn with the CW dial
    const hubs = [
      [253, 536],
      [360, 536],
      [467, 536],
      [253, 643],
      [360, 643],
      [467, 643],
      [253, 750],
      [360, 750],
      [467, 750],
    ];
    for (const [hx, hy] of hubs) {
      await turnDisc(page, hx, hy, 1);
    }
    // Extra visible turns on a few cells
    await turnDisc(page, 360, 643, 2);
    await turnDisc(page, 467, 536, 1);
    await turnDisc(page, 253, 750, 1);
    await page.waitForTimeout(500);
  });

  await context.close();
  makeGif(frameDir, join(OUT_DIR, "shiftr.gif"));
  console.log("✓ shiftr.gif");
}

async function captureNexus(browser) {
  const frameDir = join(TMP, "nexus-chess");
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  await context.addInitScript(seedNexus);
  const page = await context.newPage();
  console.log("→ Nexus Chess");
  await page.goto(`${BASE}/games/nexus-chess/web/`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(900);

  await withCapture(page, frameDir, async () => {
    await page.waitForSelector("canvas");
    await page.waitForTimeout(700);

    // Home → Play
    await page.mouse.click(VIEW.width * 0.5, VIEW.height * 0.74);
    await page.waitForTimeout(700);

    // Hub: Local Multiplayer (second mode button — below Play Computer)
    // With hasSetRating, elo card ~ y 106-182, vsAI ~202, local ~264
    const localY = await page.evaluate(() => {
      const w = Math.floor(window.visualViewport?.width ?? window.innerWidth);
      const h = Math.floor(window.visualViewport?.height ?? window.innerHeight);
      const compact = w < 640 || h < 700;
      const pad = compact ? 16 : 28;
      const logoH = compact ? 42 : 56;
      const eloY = compact ? 28 + logoH + 36 : 36 + logoH + 42;
      const eloH = compact ? 76 : 86;
      const btnH = compact ? 50 : 54;
      let by = eloY + eloH + (compact ? 20 : 28);
      by += btnH + 12; // skip vs AI
      return by + btnH / 2;
    });
    await page.mouse.click(VIEW.width * 0.5, localY);
    await page.waitForTimeout(1000);

    // Sequence of real moves (local — both sides)
    const moves = [
      ["e2", "e4"],
      ["e7", "e5"],
      ["g1", "f3"],
      ["b8", "c6"],
      ["f1", "c4"],
      ["g8", "f6"],
    ];
    for (const [from, to] of moves) {
      await clickSkipAbility(page);
      await page.waitForTimeout(350);
      await clickSquare(page, from);
      await page.waitForTimeout(450);
      await clickSquare(page, to);
      await page.waitForTimeout(900); // watch piece jump
    }
  });

  await context.close();
  makeGif(frameDir, join(OUT_DIR, "nexus-chess.gif"));
  console.log("✓ nexus-chess.gif");
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    await captureShiftr(browser);
    await captureNexus(browser);
  } finally {
    await browser.close();
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
