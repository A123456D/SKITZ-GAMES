import { LEVELS, LEVEL_COUNT, levelById } from "./core/levels";
import type { ScoreEntry } from "./core/board";
import {
  cloudRicher,
  fetchCloudProgress,
  fetchWorld,
  flushPending,
  pushCloudProgress,
  submitWorld,
} from "./core/leaderboard";
import {
  applyCloud,
  applyWin,
  canUnlockDistrict,
  hasCampaign,
  hasUsername,
  loadProgress,
  recordRun,
  saveProgress,
  setHandle,
  tryBuyAlmostIn,
  tryBuyBuffer,
  tryBuyCompTime,
  tryBuyTime,
  tryUnlockDistrict,
} from "./core/save";
import {
  currentLegal,
  startSession,
  starsFor,
  tickTimer,
  tryPick,
  type Session,
} from "./core/session";
import type { Progress } from "./core/types";
import {
  playComplete,
  playFail,
  playIllegal,
  playPick,
  playWin,
  setSoundEnabled,
  unlockAudio,
} from "./view/audio";
import {
  cellAt,
  cellCenter,
  drawDeck,
  drawHome,
  drawHow,
  drawMap,
  drawPlay,
  drawRegister,
  drawResult,
  drawScores,
  hitButton,
  hitMapNode,
  type BoardLayout,
  type Screen,
  type UiButton,
  W,
  H,
} from "./view/draw";
import {
  bumpShake,
  clearMotion,
  flashDaemon,
  punchAt,
  updateMotion,
} from "./view/motion";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const handleWrap = document.getElementById("handle-wrap") as HTMLLabelElement;
const handleInput = document.getElementById("handle-input") as HTMLInputElement;

let progress: Progress = loadProgress();
setSoundEnabled(progress.sound);

let screen: Screen = hasUsername(progress) ? "home" : "register";
let howPage = 0;
let selectedLevel = Math.min(progress.unlocked, LEVEL_COUNT);
let session: Session | null = null;
let resultStars = 0;
let worldRank: number | null = null;
let buttons: UiButton[] = [];
let mapNodes: { id: number; x: number; y: number; r: number }[] = [];
let layout: BoardLayout | null = null;
let prevCompleted = new Set<string>();
let scoresTab: "world" | "local" = "world";
let worldScores: ScoreEntry[] = [];
let scoresStatus = "Loading world board…";

function persistLocal(): void {
  saveProgress(progress);
  if (hasUsername(progress) && hasCampaign(progress)) {
    void pushCloudProgress(progress).catch(() => {
      /* offline backup is best-effort */
    });
  }
}

async function hydrateCloud(): Promise<void> {
  if (!hasUsername(progress)) return;
  try {
    await flushPending();
    const cloud = await fetchCloudProgress(progress.handle);
    if (cloud && cloudRicher(cloud, progress)) {
      progress = applyCloud(progress, cloud);
      saveProgress(progress);
    } else if (hasCampaign(progress)) {
      await pushCloudProgress(progress);
    }
  } catch {
    /* stay on local progress */
  }
}

async function loadWorld(): Promise<void> {
  scoresStatus = "Loading world board…";
  try {
    await flushPending();
    worldScores = await fetchWorld();
    scoresStatus = worldScores.length ? "Live world board." : "No world scores yet.";
  } catch {
    worldScores = [];
    scoresStatus = "World board unreachable. Device scores still save.";
  }
}

function requireUser(): boolean {
  if (hasUsername(progress)) return true;
  screen = "register";
  playIllegal();
  return false;
}

function startLevel(id: number): void {
  if (!requireUser()) return;
  const level = levelById(id);
  if (!level) return;
  if (id > progress.unlocked) return;
  if (level.district > progress.district) return;
  selectedLevel = id;
  session = startSession(level, progress.deck);
  prevCompleted = new Set();
  worldRank = null;
  clearMotion();
  screen = "play";
}

function claimUsername(): void {
  const next = setHandle(progress, handleInput.value);
  if (!next) {
    playIllegal();
    bumpShake(6);
    return;
  }
  progress = next;
  playComplete();
  screen = "home";
  void hydrateCloud();
}

function toCanvas(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function onPointer(clientX: number, clientY: number): void {
  unlockAudio();
  const { x, y } = toCanvas(clientX, clientY);
  const id = hitButton(buttons, x, y);

  if (screen === "register") {
    if (id === "claim") claimUsername();
    return;
  }

  if (screen === "home") {
    if (id === "play") {
      startLevel(Math.min(progress.unlocked, LEVEL_COUNT));
      return;
    }
    if (id === "map") {
      if (!requireUser()) return;
      screen = "map";
      return;
    }
    if (id === "scores") {
      if (!requireUser()) return;
      screen = "scores";
      void loadWorld();
      return;
    }
    if (id === "deck") {
      if (!requireUser()) return;
      screen = "deck";
      return;
    }
    if (id === "how") {
      howPage = 0;
      screen = "how";
      return;
    }
    if (id === "sound") {
      progress = { ...progress, sound: !progress.sound };
      setSoundEnabled(progress.sound);
      persistLocal();
      return;
    }
  }

  if (screen === "how") {
    if (id === "how-prev") {
      if (howPage <= 0) screen = "home";
      else howPage -= 1;
      return;
    }
    if (id === "how-next") {
      if (howPage >= 4) {
        startLevel(1);
      } else howPage += 1;
      return;
    }
  }

  if (screen === "scores") {
    if (id === "scores-back") {
      screen = "home";
      return;
    }
    if (id === "scores-world") {
      scoresTab = "world";
      void loadWorld();
      return;
    }
    if (id === "scores-local") {
      scoresTab = "local";
      scoresStatus = "Saved on this device.";
      return;
    }
  }

  if (screen === "deck") {
    if (id === "deck-back") {
      screen = "home";
      return;
    }
    if (id === "deck-buffer") {
      const next = tryBuyBuffer(progress);
      if (next) {
        progress = next;
        persistLocal();
        playComplete();
      } else playIllegal();
      return;
    }
    if (id === "deck-time") {
      const next = tryBuyTime(progress);
      if (next) {
        progress = next;
        persistLocal();
        playComplete();
      } else playIllegal();
      return;
    }
    if (id === "deck-almost") {
      const next = tryBuyAlmostIn(progress);
      if (next) {
        progress = next;
        persistLocal();
        playComplete();
      } else playIllegal();
      return;
    }
    if (id === "deck-comp-time") {
      const next = tryBuyCompTime(progress);
      if (next) {
        progress = next;
        persistLocal();
        playComplete();
      } else playIllegal();
      return;
    }
  }

  if (screen === "map") {
    const node = hitMapNode(mapNodes, x, y);
    if (node !== null && node <= progress.unlocked) {
      const level = levelById(node);
      if (level && level.district <= progress.district) {
        selectedLevel = node;
      }
      return;
    }
    if (id === "map-back") {
      screen = "home";
      return;
    }
    if (id === "map-play") {
      startLevel(selectedLevel);
      return;
    }
    if (id === "map-unlock") {
      const gate = canUnlockDistrict(progress);
      if (!gate.ok) {
        playIllegal();
        return;
      }
      const next = tryUnlockDistrict(progress);
      if (next) {
        progress = next;
        persistLocal();
        playWin();
      } else playIllegal();
      return;
    }
    if (id === "map-deck") {
      screen = "deck";
      return;
    }
  }

  if (screen === "play" && session) {
    if (id === "play-menu") {
      screen = "map";
      return;
    }
    if (!layout || session.ended) return;
    const pos = cellAt(layout, session.level.size, x, y);
    if (!pos) return;
    const before = session.daemons.filter((d) => d.completed).map((d) => d.id);
    const result = tryPick(session, pos);
    if (!result.ok) {
      playIllegal();
      bumpShake(4);
      return;
    }
    session = result.session;
    playPick();
    const center = cellCenter(layout, pos);
    punchAt(center.x, center.y);

    for (const d of session.daemons) {
      if (d.completed && !before.includes(d.id) && !prevCompleted.has(d.id)) {
        prevCompleted.add(d.id);
        flashDaemon(d.id);
        playComplete();
      }
    }

    if (session.ended) finishRound();
    return;
  }

  if (screen === "result" && session) {
    if (id === "retry") {
      startLevel(session.level.id);
      return;
    }
    if (id === "next") {
      const nextId = session.level.id + 1;
      if (
        resultStars > 0 &&
        nextId <= LEVEL_COUNT &&
        nextId <= progress.unlocked
      ) {
        const nextLevel = levelById(nextId);
        if (nextLevel && nextLevel.district <= progress.district) {
          startLevel(nextId);
          return;
        }
      }
      screen = "map";
      return;
    }
    if (id === "result-deck") {
      screen = "deck";
      return;
    }
    if (id === "result-home") {
      screen = "home";
      return;
    }
  }
}

function finishRound(): void {
  if (!session) return;
  resultStars = starsFor(session);
  worldRank = null;
  const elapsed = Math.max(0, session.level.timeLimit - session.timeLeft);
  progress = recordRun(progress, {
    score: session.score,
    level: session.level.id,
    stars: resultStars,
    time: elapsed,
  });
  if (resultStars > 0 && !session.timedOut) {
    progress = applyWin(
      progress,
      session.level.id,
      resultStars,
      session.loot,
      LEVEL_COUNT,
    );
    persistLocal();
    playWin();
    if (session.score > 0 && hasUsername(progress)) {
      void submitWorld(
        {
          score: session.score,
          level: session.level.id,
          stars: resultStars,
          time: elapsed,
        },
        progress.handle,
      ).then((res) => {
        worldRank = res.rank;
        if (res.scores.length) worldScores = res.scores;
        if (res.queued) scoresStatus = "Queued — will upload when online.";
      });
    }
  } else {
    persistLocal();
    playFail();
    bumpShake(10);
  }
  screen = "result";
}

function syncHandleField(): void {
  const show = screen === "register";
  handleWrap.classList.toggle("hidden", !show);
  document.body.dataset.screen = screen;
  if (show && document.activeElement !== handleInput) {
    handleInput.value = progress.handle;
  }
}

canvas.addEventListener(
  "pointerdown",
  (e) => {
    if (screen === "register" && e.target === handleInput) return;
    e.preventDefault();
    onPointer(e.clientX, e.clientY);
  },
  { passive: false },
);

handleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    claimUsername();
  }
});

let last = performance.now();
let time = 0;

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  updateMotion(dt);
  syncHandleField();

  ctx.clearRect(0, 0, W, H);

  if (screen === "register") {
    buttons = drawRegister(ctx, time);
    mapNodes = [];
    layout = null;
  } else if (screen === "home") {
    buttons = drawHome(ctx, time, progress);
    mapNodes = [];
    layout = null;
  } else if (screen === "how") {
    buttons = drawHow(ctx, time, howPage);
    mapNodes = [];
    layout = null;
  } else if (screen === "scores") {
    buttons = drawScores(ctx, time, progress, scoresTab, worldScores, scoresStatus);
    mapNodes = [];
    layout = null;
  } else if (screen === "deck") {
    buttons = drawDeck(ctx, time, progress);
    mapNodes = [];
    layout = null;
  } else if (screen === "map") {
    const layoutMap = drawMap(ctx, time, progress, selectedLevel);
    buttons = layoutMap.buttons;
    mapNodes = layoutMap.nodes;
    layout = null;
  } else if (screen === "play" && session) {
    const beforeEnded = session.ended;
    session = tickTimer(session, dt);
    if (!beforeEnded && session.ended) {
      finishRound();
    }
    const legal = currentLegal(session);
    const drawn = drawPlay(ctx, time, session, legal);
    buttons = drawn.buttons;
    layout = drawn.layout;
    mapNodes = [];
  } else if (screen === "result" && session) {
    buttons = drawResult(ctx, time, session, progress, resultStars, worldRank);
    mapNodes = [];
    layout = null;
  }

  requestAnimationFrame(frame);
}

document.body.addEventListener(
  "touchmove",
  (e) => {
    if (e.target === handleInput) return;
    e.preventDefault();
  },
  { passive: false },
);

requestAnimationFrame(frame);
void hydrateCloud();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((reg) => {
        void reg.update();
      })
      .catch(() => {
        /* offline install is best-effort */
      });
  });
}

void LEVELS.length;
void H;
