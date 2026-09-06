// Gravity Drift — main orchestrator: loops, input, boards, PWA install, UI wiring.
import { Game, Aim } from "./game.js";
import { Juice } from "./juice.js";
import { Sfx } from "./sfx.js";
import { Renderer } from "./renderer.js";
import { drawNext } from "./next.js";
import { SPOKES } from "./constants.js";

const $ = (id) => document.getElementById(id);
const els = {
  app: $("app"), score: $("score"), level: $("level"), lines: $("lines"), time: $("time"),
  well: $("well"), gpuError: $("gpu-error"), menu: $("menu"), overlay: $("overlay"),
  overSummary: $("over-summary"), overBest: $("over-best"), nameError: $("name-error"),
  scoreStatus: $("score-status"), scoreList: $("score-list"), homeStats: $("home-stats"),
  pauseBtn: $("pause-btn"),
};

// ---------- persistence ----------
const SAVE_KEY = "gravity-drift-save-v1";
const PENDING_KEY = "gravity-drift-pending-v1";
const NAME_KEY = "gravity-drift-name-v1";

const loadJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const sanitizeName = (name) =>
  String(name || "").toUpperCase().replace(/[^A-Z0-9 _-]/g, "").trim().slice(0, 16);
const isValidHandle = (n) => sanitizeName(n).length >= 3;

function loadSave() {
  const s = loadJSON(SAVE_KEY, null);
  if (s && Array.isArray(s.scores)) return s;
  return { name: "", games: 0, totalScore: 0, totalLines: 0, bestScore: 0, bestLevel: 1, bestLines: 0, scores: [] };
}
const saveState = loadSave();

function recordRun(run) {
  saveState.games += 1;
  saveState.totalScore += run.score;
  saveState.totalLines += run.lines;
  if (run.score > saveState.bestScore) {
    saveState.bestScore = run.score;
    saveState.bestLevel = run.level;
    saveState.bestLines = run.lines;
  }
  saveState.scores.push(run);
  saveState.scores.sort((a, b) => b.score - a.score || b.lines - a.lines || a.at - b.at);
  saveState.scores = saveState.scores.slice(0, 100);
  saveJSON(SAVE_KEY, saveState);
}

// ---------- world board (queue + retry + backoff) ----------
const API = "/api/gravity-drift/scores";
let worldTimer = null;

async function tryFlushPending() {
  const pending = loadJSON(PENDING_KEY, []);
  if (!pending.length) return;
  for (const run of [...pending]) {
    try {
      const res = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(run),
      });
      if (res.ok) {
        saveJSON(PENDING_KEY, loadJSON(PENDING_KEY, []).filter(p => p.at !== run.at));
        const data = await res.json().catch(() => null);
        if (data?.rank) {
          juice.pop(center()[0], center()[1] - 70, `WORLD #${data.rank}`, "#9df5ff", 1.2);
        }
      } else if (res.status >= 500 || res.status === 429) {
        scheduleWorldRetry();
        break;
      } else {
        saveJSON(PENDING_KEY, loadJSON(PENDING_KEY, []).filter(p => p.at !== run.at)); // 4xx: drop
      }
    } catch {
      scheduleWorldRetry();
      break;
    }
  }
}

function scheduleWorldRetry() {
  if (worldTimer) return;
  worldTimer = setTimeout(() => { worldTimer = null; tryFlushPending(); }, 15000);
}

async function fetchWorld() {
  try {
    const r = await fetch(API);
    if (!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    return { ok: true, scores: data.scores || [] };
  } catch {
    return { ok: false, scores: [] };
  }
}

// ---------- sfx / juice ----------
const sfx = new Sfx();
const juice = new Juice();
let lastLevel = 1;

function center() {
  const r = els.well.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

function cellCtx() {
  if (!renderer) return null;
  return {
    cellCenter: (cell) => {
      if (!cell) return center();
      const [x, y] = renderer.toPx(cell.ring, cell.spoke);
      const rect = els.well.getBoundingClientRect();
      const dpr = rect.width / els.well.clientWidth;
      return [rect.left + x / dpr, rect.top + y / dpr];
    },
    coreRadiusPx: () => renderer.pxPerUnit * 0.11 * 1.2,
  };
}

const gameEvents = (ev) => {
  juice.onEvent(ev, cellCtx());
  switch (ev.type) {
    case "release": sfx.whoosh(0.22, 0.09); break;
    case "step": break;
    case "lock": sfx.thud(0.10); break;
    case "harddrop": sfx.thud(0.18); sfx.whoosh(0.12, 0.06); break;
    case "blocked": sfx.blip(140, 0.06, "square", 0.05); break;
    case "rotate": sfx.blip(520, 0.03, "square", 0.03); break;
    case "clear": sfx.clear(ev.count, ev.combo); break;
    case "spawn": break;
    case "gameover": onGameOver(); break;
    case "reset": break;
  }
};

function fmtClock(s) {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function updateHud() {
  els.score.textContent = String(game.score).padStart(6, "0");
  els.level.textContent = String(game.level());
  els.lines.textContent = String(game.lines);
  els.time.textContent = fmtClock(game.elapsed);
  els.app.classList.add("playing");
  drawNext([...document.querySelectorAll(".next canvas")], game.queue);
  const muteBtn = $("mute-btn");
  if (muteBtn) muteBtn.classList.toggle("off", sfx.muted);
}

// ---------- renderer + loop ----------
let renderer = null;
let game = null;
let raf = 0;
let lastT = 0;
let running = false;

async function boot() {
  renderer = await Renderer.create(els.well);
  if (!renderer) {
    els.gpuError.innerHTML = "GPU REQUIRED — this game needs a WebGPU-capable browser (Chrome/Edge 113+, or Safari 18+).";
    return;
  }
  game = new Game(gameEvents);
  wireInput();
  requestAnimationFrame(tick);
}

let hudT = 0;
function tick(t) {
  raf = requestAnimationFrame(tick);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;

  if (running && game.phase !== Aim.GAME_OVER) {
    game.update(dt);
    if (game.level() > lastLevel) {
      lastLevel = game.level();
      sfx.levelUp();
      juice.pop(center()[0], center()[1] - 120, `LEVEL ${lastLevel}`, "#ffd166", 1.3);
    }
  }
  juice.update(dt);
  renderer.render(
    { occupied: game.occupied, colors: game.colors, piece: game.piece, ghostRing: (p) => game.ghostRing(p), pulse: juice.pulse },
    dt,
  );
  drawOverlays();
  hudT += dt;
  if (hudT > 0.1) { hudT = 0; updateHud(); }
}

function drawOverlays() {
  const cvs = overlayCanvas ||= ensureOverlay();
  const ctx = cvs.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cvs.width !== Math.floor(cvs.clientWidth * dpr)) {
    cvs.width = Math.floor(cvs.clientWidth * dpr);
    cvs.height = Math.floor(cvs.clientHeight * dpr);
  }
  ctx.setTransform(1, 0, 0, 1, juice.shakeX, juice.shakeY);
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  ctx.save();
  ctx.scale(dpr, dpr);
  juice.draw(ctx);
  if (juice.flash > 0.01) {
    ctx.fillStyle = `rgba(${juice.flashColor.map(v => Math.round(v * 255)).join(",")},${juice.flash})`;
    ctx.fillRect(-20, -20, cvs.width + 40, cvs.height + 40);
  }
  ctx.restore();
}

let overlayCanvas = null;
function ensureOverlay() {
  const c = document.createElement("canvas");
  c.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;";
  els.well.parentElement.appendChild(c);
  return c;
}

// ---------- input ----------
function wireInput() {
  const held = { left: false, right: false, tLeft: 0, tRight: 0 };

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyM") { sfx.ensure(); sfx.setMuted(!sfx.muted); return; }
    if (e.repeat) { if (["Space", "KeyS", "KeyA", "KeyD", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); return; }
    sfx.ensure();
    if (e.code === "KeyA" || e.code === "ArrowLeft") { held.left = true; held.tLeft = 0.22; try { game.aimBy(-1); } catch {} e.preventDefault(); }
    else if (e.code === "KeyD" || e.code === "ArrowRight") { held.right = true; held.tRight = 0.22; try { game.aimBy(1); } catch {} e.preventDefault(); }
    else if (e.code === "KeyW" || e.code === "KeyQ") { try { game.rotateAim(); } catch {} }
    else if (e.code === "Space") { try { game.release(); } catch {} e.preventDefault(); }
    else if (e.code === "KeyS") { try { game.hardDrop(); } catch {} e.preventDefault(); }
    else if (e.code === "KeyR") { startRun(); }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "KeyA" || e.code === "ArrowLeft") held.left = false;
    if (e.code === "KeyD" || e.code === "ArrowRight") held.right = false;
  });

  // aim repeat while held
  setInterval(() => {
    if (!game || !running) return;
    if (held.left) { held.tLeft -= 1 / 60; if (held.tLeft <= 0) { held.tLeft = 0.07; try { game.aimBy(-1); } catch {} } }
    if (held.right) { held.tRight -= 1 / 60; if (held.tRight <= 0) { held.tRight = 0.07; try { game.aimBy(1); } catch {} } }
  }, 1000 / 60);

  // touch dock
  const bind = (sel, down, up) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault(); sfx.ensure();
      try { el.setPointerCapture(e.pointerId); } catch {}
      down();
    }, { passive: false });
    el.addEventListener("pointerup", () => up?.());
    el.addEventListener("pointercancel", () => up?.());
  };
  bind("#btn-left", () => (held.left = true, held.tLeft = 0.22), () => (held.left = false));
  bind("#btn-right", () => (held.right = true, held.tRight = 0.22), () => (held.right = false));
  bind("#btn-rot", () => { try { game.rotateAim(); } catch {} });
  bind("#btn-drop", () => { try { game.release(); } catch {} });
  bind("#btn-hard", () => { try { game.hardDrop(); } catch {} });

  // canvas pointer: drag to aim, tap to release (mobile-friendly)
  els.well.style.pointerEvents = "auto";
  let dragAim = null;
  els.well.addEventListener("pointerdown", (e) => {
    if (!running || game.phase !== Aim.AIMING) return;
    sfx.ensure();
    dragAim = { spoke: aimSpokeFromEvent(e), moved: false };
  });
  els.well.addEventListener("pointermove", (e) => {
    if (!dragAim) return;
    const s = aimSpokeFromEvent(e);
    if (s !== dragAim.spoke) {
      dragAim.moved = true;
      const diff = ((s - game.aimSpoke + SPOKES / 2 + SPOKES) % SPOKES) - SPOKES / 2;
      try { game.aimBy(diff); } catch {}
      dragAim.spoke = s;
    }
  });
  els.well.addEventListener("pointerup", (e) => {
    if (!dragAim) return;
    if (!dragAim.moved) { try { game.release(); } catch {} }
    dragAim = null;
  });

  els.pauseBtn.addEventListener("click", () => {
    if (running) pauseGame();
  });

  $("mute-btn").addEventListener("click", () => {
    sfx.ensure();
    sfx.setMuted(!sfx.muted);
    $("mute-btn").classList.toggle("off", sfx.muted);
  });
}

function aimSpokeFromEvent(e) {
  const r = els.well.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const rad = Math.hypot(e.clientX - cx, e.clientY - cy) / (r.width / 2);
  if (rad > 1.15) return game.aimSpoke;
  const ang = Math.atan2(-(e.clientY - cy), e.clientX - cx);
  const seg = (Math.PI * 2) / SPOKES;
  return ((Math.round((ang + Math.PI / 2) / seg) % SPOKES) + SPOKES) % SPOKES;
}

// ---------- run / menu flow ----------
function pilotName() {
  const v = sanitizeName($("pilot-name").value);
  return isValidHandle(v) ? v : null;
}

function startRun() {
  sfx.ensure();
  const name = pilotName();
  if (!name) {
    els.nameError.classList.remove("hidden");
    $("pilot-name").focus();
    return;
  }
  els.nameError.classList.add("hidden");
  saveState.name = name;
  saveJSON(SAVE_KEY, saveState);
  localStorage.setItem(NAME_KEY, name);
  hideMenu();
  els.overlay.classList.add("hidden");
  lastLevel = 1;
  game.reset();
  game.spawnOrDie();
  running = true;
  sfx.ambientStart();
}

function pauseGame() {
  running = false;
  sfx.ambientStop();
  showPanel("pause");
}

function resumeGame() {
  hideMenu();
  running = true;
  sfx.ambientStart();
}

function onGameOver() {
  running = false;
  sfx.ambientStop();
  sfx.gameover();
  const run = {
    name: saveState.name, score: game.score, level: game.level(),
    lines: game.lines, time: game.elapsed, at: Date.now(),
  };
  recordRun(run);
  const isBest = run.score > 0 && run.score >= saveState.bestScore;
  const pending = loadJSON(PENDING_KEY, []);
  pending.push(run);
  saveJSON(PENDING_KEY, pending);
  tryFlushPending();
  els.overSummary.textContent =
    `${run.name}  ${String(run.score).padStart(6, "0")}  ·  LV ${run.level}  ·  ${run.lines} RING${run.lines === 1 ? "" : "S"}`;
  els.overBest.classList.toggle("hidden", !isBest);
  els.overlay.classList.remove("hidden");
}

function fmtTime(t) {
  if (t == null || !isFinite(t)) return "—";
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function renderBoard(target, scores, highlight) {
  els.scoreList.innerHTML = "";
  if (!scores.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No runs yet.";
    els.scoreList.appendChild(li);
    return;
  }
  scores.slice(0, 10).forEach((row, i) => {
    const li = document.createElement("li");
    li.className = row.name === highlight ? "me" : "";
    li.innerHTML = `<span class="rk">${i + 1}</span><span class="nm">${row.name}</span>` +
      `<span class="meta">Lv ${row.level} · ${row.lines} rings · ${fmtTime(row.time)}</span>` +
      `<span class="sc">${String(row.score).padStart(6, "0")}</span>`;
    els.scoreList.appendChild(li);
  });
}

let worldCache = [];
async function showScores() {
  showPanel("scores");
  els.scoreStatus.textContent = "Loading world board…";
  renderBoard("world", []);
  const { ok, scores } = await fetchWorld();
  worldCache = scores;
  if (currentPanel === "scores") {
    if (ok) {
      els.scoreStatus.textContent = "Live world board.";
      renderBoard("world", scores, saveState.name);
    } else {
      els.scoreStatus.textContent = "World board unreachable. Local scores still save.";
      renderBoard("world", [], null);
    }
  }
}

function showLocal() {
  els.scoreStatus.textContent = "Saved on this device only.";
  renderBoard("local", saveState.scores, saveState.name);
}

// ---------- menu plumbing ----------
let currentPanel = "home";
function showPanel(name) {
  currentPanel = name;
  els.menu.classList.remove("hidden");
  document.querySelectorAll(".menu-card").forEach(c => c.classList.toggle("hidden", c.dataset.panel !== name));
  if (name === "home") renderHomeStats();
  if (name === "scores") showScores();
}
function hideMenu() {
  els.menu.classList.add("hidden");
  currentPanel = null;
}
function renderHomeStats() {
  els.homeStats.innerHTML =
    `<span>${saveState.games} runs</span><span>best ${String(saveState.bestScore).padStart(6, "0")}</span>` +
    `<span>${saveState.totalLines} rings</span>`;
  const stored = localStorage.getItem(NAME_KEY);
  if (stored) $("pilot-name").value = stored;
}

document.querySelectorAll("[data-go]").forEach(btn => {
  btn.addEventListener("click", () => {
    sfx.ensure();
    const go = btn.dataset.go;
    if (go === "play") startRun();
    else if (go === "resume") resumeGame();
    else if (go === "scores") showPanel("scores");
    else if (go === "howto") showPanel("howto");
    else if (go === "home") {
      if (running) { pauseGame(); return; }
      showPanel("home");
    }
  });
});

$("retry-btn").addEventListener("click", () => { els.overlay.classList.add("hidden"); startRun(); });
$("over-menu-btn").addEventListener("click", () => { els.overlay.classList.add("hidden"); showPanel("home"); });

// Esc: pause / unpause / back out of sub-panels
window.addEventListener("keydown", (e) => {
  if (e.code !== "Escape") return;
  if (!els.overlay.classList.contains("hidden")) return; // game over: ignore
  if (els.menu.classList.contains("hidden")) pauseGame();
  else if (currentPanel === "pause") resumeGame();
  else if (currentPanel !== "home") showPanel("home");
});

window.addEventListener("resize", () => renderer?.resize());
window.addEventListener("beforeunload", () => sfx.ambientStop());
window.addEventListener("online", () => tryFlushPending());

// debug/QA hook (read-only accessor; used by automated tests)
window.__gd = () => game;

boot();
