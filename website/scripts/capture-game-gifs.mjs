/**
 * Capture short gameplay GIFs for the SKITZ catalog.
 * Usage: node scripts/capture-game-gifs.mjs [baseUrl]
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

async function canvasPoint(page, lx, ly) {
  return page.evaluate(
    ({ lx, ly }) => {
      const c = document.querySelector("canvas");
      if (!c) return { x: lx, y: ly };
      const r = c.getBoundingClientRect();
      const W = c.width || 720;
      const H = c.height || 1280;
      return {
        x: r.left + (lx / W) * r.width,
        y: r.top + (ly / H) * r.height,
      };
    },
    { lx, ly },
  );
}

async function clickCanvas(page, lx, ly) {
  const p = await canvasPoint(page, lx, ly);
  await page.mouse.click(p.x, p.y);
}

async function swipeCanvas(page, x0, y0, x1, y1, steps = 14) {
  const a = await canvasPoint(page, x0, y0);
  const b = await canvasPoint(page, x1, y1);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}

function seedPulsefold() {
  localStorage.setItem("pulsefold_seen_welcome", "1");
  localStorage.setItem("pulsefold_tutorial_complete", "1");
  localStorage.setItem("pulsefold_mute", "1");
}

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

function seedRiotCube() {
  localStorage.setItem("riotcube_onboarded", "1");
  localStorage.setItem("riotcube_seen_help", "1");
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

const GAMES = [
  {
    id: "pulsefold",
    path: "/games/pulsefold/web/",
    seed: seedPulsefold,
    async play(page) {
      const firstSkip = page.locator("#btnFirstSkip");
      if (await firstSkip.isVisible().catch(() => false)) {
        await firstSkip.click();
        await page.waitForTimeout(300);
      }
      await page.click("#btnHomePlay");
      await page.waitForTimeout(700);
      // A couple of folds only — keep the board in play, not game-over
      for (const y of [0.45, 0.52]) {
        await page.mouse.move(VIEW.width * 0.18, VIEW.height * y);
        await page.mouse.down();
        await page.mouse.move(VIEW.width * 0.82, VIEW.height * y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(550);
      }
      await page.mouse.move(VIEW.width * 0.4, VIEW.height * 0.38);
      await page.mouse.down();
      await page.mouse.move(VIEW.width * 0.4, VIEW.height * 0.62, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500);
      const pulse = page.locator("#btnPulse");
      if (await pulse.count()) await pulse.click({ force: true }).catch(() => {});
      await page.waitForTimeout(900);
    },
  },
  {
    id: "shiftr",
    path: "/games/shiftr/web/",
    seed: seedShiftr,
    async play(page) {
      await page.waitForSelector("canvas#game", { timeout: 20000 });
      await page.waitForTimeout(800);
      await clickCanvas(page, 360, 484); // PLAY
      await page.waitForTimeout(1100);
      for (const [lx, ly] of [
        [360, 560],
        [280, 620],
        [440, 620],
        [360, 700],
        [300, 560],
        [420, 700],
        [320, 640],
        [400, 640],
        [360, 600],
      ]) {
        await clickCanvas(page, lx, ly);
        await page.waitForTimeout(260);
      }
      await clickCanvas(page, 282, 1094);
      await page.waitForTimeout(700);
    },
  },
  {
    id: "riot-cube",
    path: "/games/riot-cube/web/",
    seed: seedRiotCube,
    async play(page) {
      await page.waitForSelector("canvas#game", { timeout: 20000 });
      await page.waitForTimeout(900);
      await clickCanvas(page, 360, 856); // PLAY
      await page.waitForTimeout(1000);
      for (const [x0, y0, x1, y1] of [
        [200, 520, 520, 520],
        [360, 400, 360, 700],
        [180, 600, 540, 600],
        [280, 450, 280, 720],
        [220, 550, 500, 550],
        [400, 420, 400, 680],
      ]) {
        await swipeCanvas(page, x0, y0, x1, y1);
        await page.waitForTimeout(420);
      }
      await clickCanvas(page, 220, 1180);
      await page.waitForTimeout(350);
      await clickCanvas(page, 500, 1180);
      await page.waitForTimeout(500);
    },
  },
  {
    id: "nexus-chess",
    path: "/games/nexus-chess/web/",
    seed: seedNexus,
    async play(page) {
      await page.waitForSelector("canvas", { timeout: 20000 });
      await page.waitForTimeout(1100);
      await page.mouse.click(VIEW.width * 0.5, VIEW.height * 0.74);
      await page.waitForTimeout(700);
      await page.mouse.click(VIEW.width * 0.5, VIEW.height * 0.4);
      await page.waitForTimeout(600);
      await page.mouse.click(VIEW.width * 0.35, VIEW.height * 0.42);
      await page.waitForTimeout(350);
      await page.mouse.click(VIEW.width * 0.5, VIEW.height * 0.78);
      await page.waitForTimeout(1000);
      const taps = [
        [0.5, 0.64],
        [0.5, 0.52],
        [0.42, 0.64],
        [0.42, 0.5],
        [0.58, 0.64],
        [0.58, 0.5],
        [0.35, 0.7],
        [0.35, 0.45],
      ];
      for (const [x, y] of taps) {
        await page.mouse.click(VIEW.width * x, VIEW.height * y);
        await page.waitForTimeout(380);
      }
      await page.waitForTimeout(800);
    },
  },
];

function makeGif(frameDir, outPath) {
  const frames = readdirSync(frameDir)
    .filter((f) => f.endsWith(".png") && f.startsWith("frame-"))
    .sort();
  if (frames.length < 2) throw new Error(`Not enough frames in ${frameDir}`);
  const palette = join(frameDir, "palette.png");
  const pattern = join(frameDir, "frame-%03d.png");
  let r = spawnSync(
    FF,
    ["-y", "-framerate", "7", "-i", pattern, "-vf", "scale=480:-1:flags=lanczos,palettegen=stats_mode=diff", palette],
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
      "7",
      "-i",
      pattern,
      "-i",
      palette,
      "-lavfi",
      "scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4",
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

async function captureGame(browser, game) {
  const frameDir = join(TMP, game.id);
  mkdirSync(frameDir, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 1,
  });
  await context.addInitScript(game.seed);
  const page = await context.newPage();

  const url = `${BASE}${game.path}`;
  console.log(`→ ${game.id}: ${url}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);

  let frame = 0;
  const grab = async () => {
    const path = join(frameDir, `frame-${String(frame).padStart(3, "0")}.png`);
    await page.screenshot({ path, type: "png" });
    frame += 1;
  };

  await grab();
  const ticker = setInterval(() => {
    grab().catch(() => {});
  }, 160);

  try {
    await game.play(page);
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(180);
      await grab();
    }
  } finally {
    clearInterval(ticker);
  }

  await grab();
  await context.close();

  const out = join(OUT_DIR, `${game.id}.gif`);
  makeGif(frameDir, out);
  console.log(`✓ ${out}`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    for (const game of GAMES) {
      await captureGame(browser, game);
    }
  } finally {
    await browser.close();
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
