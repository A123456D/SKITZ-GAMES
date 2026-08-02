/**
 * Capture a Chain Reactor gameplay GIF for the SKITZ catalog.
 * Prefers the Vite dev server; falls back to the shipped static build.
 *
 * Usage:
 *   node scripts/capture-chain-reactor-gif.mjs [baseUrl]
 *
 * Examples:
 *   node scripts/capture-chain-reactor-gif.mjs http://127.0.0.1:5178
 *   node scripts/capture-chain-reactor-gif.mjs http://127.0.0.1:4177/games/chain-reactor/web/
 */
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "images", "previews", "chain-reactor.gif");
const TMP = join(ROOT, ".gif-capture-tmp", "chain-reactor");
const FF =
  process.env.FFMPEG ||
  "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe";

const BASE = (process.argv[2] || "http://127.0.0.1:5178").replace(/\/$/, "");
const VIEW = { width: 390, height: 780 };

function seedPrefs() {
  localStorage.setItem(
    "chain-reactor-prefs-v1",
    JSON.stringify({
      sfx: false,
      music: false,
      timer: false,
      reducedFx: false,
      difficulty: "easy",
      analytics: false,
    }),
  );
}

async function waitPlayerReady(page, timeout = 25000) {
  await page.waitForFunction(
    () => {
      const s = window.__cr?.state?.();
      return (
        !!s &&
        s.phase === "playing" &&
        s.active === "player" &&
        !s.cascadePending
      );
    },
    { timeout },
  );
}

async function playWhenReady(page, handIndex, col, row) {
  await waitPlayerReady(page);
  const ok = await page.evaluate(
    ({ handIndex, col, row }) => window.__cr.play(handIndex, col, row),
    { handIndex, col, row },
  );
  if (!ok) {
    // Hand may have shifted after AI; try signature by id when present.
    const alt = await page.evaluate(({ col, row }) => {
      const s = window.__cr.state();
      const hand = s.players.player.hand;
      for (let i = 0; i < hand.length; i++) {
        if (window.__cr.play(i, col, row)) return i;
      }
      return -1;
    }, { col, row });
    if (alt < 0) console.warn(`play failed @ (${col},${row}) hand=${handIndex}`);
  }
  // Let cascade beams animate before the next action.
  await page.waitForTimeout(2200);
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
      "fps=8,scale=360:-1:flags=lanczos,palettegen=max_colors=96:stats_mode=diff",
      "-update",
      "1",
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
      "fps=8,scale=360:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
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

async function main() {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  mkdirSync(dirname(OUT), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 1,
  });
  await context.addInitScript(seedPrefs);
  const page = await context.newPage();

  const url = BASE.includes("/games/") ? `${BASE}/` : `${BASE}/`;
  console.log(`→ chain-reactor: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => !!window.__cr?.showcase, { timeout: 20000 });
  await page.waitForSelector("canvas", { timeout: 20000 });
  await page.waitForTimeout(600);

  let frame = 0;
  let grabbing = false;
  const grab = async () => {
    if (grabbing) return;
    grabbing = true;
    try {
      const path = join(TMP, `frame-${String(frame).padStart(3, "0")}.png`);
      await page.screenshot({ path, type: "png", timeout: 15000 });
      frame += 1;
    } catch {
      /* skip */
    } finally {
      grabbing = false;
    }
  };

  await grab();
  const ticker = setInterval(() => {
    void grab();
  }, 220);

  try {
    // Brief title beat, then Volt showcase FLOOD
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__cr.showcase("volt"));
    await waitPlayerReady(page);
    await page.waitForTimeout(400);

    // Hand: [v_swarm2, v_storm, n_pulse_n] — Storm Grid @ (1,1)
    await playWhenReady(page, 1, 1, 1);
    await page.waitForTimeout(400);

    await waitPlayerReady(page).catch(() => {});
    await page.evaluate(() => {
      const s = window.__cr.state();
      if (s.phase !== "playing" || s.active !== "player") return;
      const empties = [];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          if (!s.board[row][col]) empties.push({ col, row });
        }
      }
      const hand = s.players.player.hand;
      for (let i = 0; i < hand.length; i++) {
        for (const t of empties) {
          if (window.__cr.play(i, t.col, t.row)) return;
        }
      }
    });
    await page.waitForTimeout(1800);

    await waitPlayerReady(page).catch(() => {});
    await page.evaluate(() => {
      const s = window.__cr.state();
      if (!s || s.phase !== "playing" || s.active !== "player") return;
      const empties = [];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          if (!s.board[row][col]) empties.push({ col, row });
        }
      }
      const hand = s.players.player.hand;
      for (let i = 0; i < hand.length; i++) {
        for (const t of empties) {
          if (window.__cr.play(i, t.col, t.row)) return;
        }
      }
    });
    await page.waitForTimeout(1600);

    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(180);
      await grab();
    }
  } finally {
    clearInterval(ticker);
  }

  await grab();
  await context.close();
  await browser.close();

  makeGif(TMP, OUT);
  console.log(`✓ ${OUT} (${frame} frames)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
