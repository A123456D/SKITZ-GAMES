import { chooseAiMove } from "./core/ai";
import { getCard, keywordLabel } from "./core/cards";
import {
  applyIntent,
  createMatch,
  energyForTurn,
  lanePower,
  legalIntents,
  setupTutorialBoard,
} from "./core/match";
import type { Intent, MatchState } from "./core/types";
import { ensureCardFace, getCachedCardFace } from "./view/cardArt";
import { PaperStage } from "./view/gl/stage";
import { FpsSampler } from "./view/perf";

const canvas = document.getElementById("stage") as HTMLCanvasElement;
const menu = document.getElementById("menu")!;
const endPanel = document.getElementById("end")!;
const unsupported = document.getElementById("unsupported")!;
const statusEl = document.getElementById("status")!;
const toastEl = document.getElementById("toast")!;
const handEl = document.getElementById("hand")!;
const handArea = document.getElementById("hand-area")!;
const dragLayer = document.getElementById("drag-layer")!;
const dragGhost = document.getElementById("drag-ghost")!;
const dragCardImg = document.getElementById("drag-card") as HTMLImageElement;
const endTitle = document.getElementById("end-title")!;
const endDetail = document.getElementById("end-detail")!;
const btnFold = document.getElementById("btn-fold") as HTMLButtonElement;
const btnRip = document.getElementById("btn-rip") as HTMLButtonElement;
const btnPass = document.getElementById("btn-pass") as HTMLButtonElement;
const laneHits = Array.from(document.querySelectorAll<HTMLButtonElement>(".lane-hit"));

let stage: PaperStage;
try {
  stage = new PaperStage(canvas);
} catch {
  unsupported.hidden = false;
  menu.hidden = true;
  throw new Error("WebGL2 required");
}

let state: MatchState | null = null;
let selectedHand: number | null = null;
let mode: "play" | "fold" | "rip" = "play";
let last = performance.now();
const fps = new FpsSampler();

type DragState = {
  handIndex: number;
  pointerId: number;
  startX: number;
  startY: number;
  active: boolean;
  cardSrc: string;
};
let drag: DragState | null = null;

function showToast(msg: string | null): void {
  if (!msg) {
    toastEl.hidden = true;
    toastEl.textContent = "";
    return;
  }
  toastEl.hidden = false;
  toastEl.textContent = msg;
}

function tutorialHint(s: MatchState): string | null {
  if (!s.tutorial) return null;
  switch (s.tutorialStep) {
    case "play":
      return "Tutorial: play a card into an empty lane.";
    case "fold":
      return "Fold your card to reveal the ink back — stronger, but fragile.";
    case "stack":
      return "Stack another card on top to add a sticker.";
    case "rip":
      return "Rip the folded enemy card — ink is fragile!";
    default:
      return "You know the verbs. Win the lanes.";
  }
}

function startMatch(tutorial: boolean): void {
  state = createMatch({ tutorial });
  if (tutorial) setupTutorialBoard(state);
  selectedHand = null;
  mode = "play";
  menu.hidden = true;
  endPanel.hidden = true;
  syncHud();
}

function placementHint(s: MatchState): string | null {
  const tut = tutorialHint(s);
  if (tut) return tut;
  if (s.active !== "player") return "Enemy turn…";
  if (mode === "fold") return "Tap a lane to Fold.";
  if (mode === "rip") return "Tap a lane to Rip.";
  if (selectedHand !== null) return "Drag to a lane — or tap a lane.";
  return "Pick a card from your hand, then drag it to a lane.";
}

function syncHud(): void {
  if (!state || state.phase !== "play") {
    handEl.innerHTML = "";
    handArea.hidden = true;
    btnFold.disabled = true;
    btnRip.disabled = true;
    btnPass.disabled = true;
    for (const hit of laneHits) {
      hit.disabled = true;
      hit.classList.remove("legal");
    }
    if (!state) {
      statusEl.textContent = "";
      showToast(null);
    }
    return;
  }

  handArea.hidden = false;

  const energy = energyForTurn(state.turn);
  const powers = [0, 1, 2]
    .map((i) => `${lanePower(state!, i, "player")}-${lanePower(state!, i, "enemy")}`)
    .join(" · ");
  statusEl.textContent = `T${state.turn}/6 · E${energy} · ${powers}${
    state.ripAvailable ? " · RIP" : ""
  }`;
  showToast(placementHint(state));

  const intents = legalIntents(state);
  const canFold = intents.some((i) => i.kind === "fold");
  const canRip = intents.some((i) => i.kind === "rip");
  btnFold.disabled = state.active !== "player" || !canFold;
  btnRip.disabled = state.active !== "player" || !canRip;
  btnPass.disabled = state.active !== "player" || state.tutorial;
  btnFold.classList.toggle("selected", mode === "fold");
  btnRip.classList.toggle("selected", mode === "rip");

  for (const hit of laneHits) {
    const lane = Number(hit.dataset.lane);
    let legal = false;
    if (state.active === "player") {
      if (mode === "fold") legal = intents.some((i) => i.kind === "fold" && i.lane === lane);
      else if (mode === "rip") legal = intents.some((i) => i.kind === "rip" && i.lane === lane);
      else if (selectedHand !== null) {
        legal = intents.some(
          (i) => i.kind === "play" && i.handIndex === selectedHand && i.lane === lane,
        );
      }
    }
    hit.disabled = !legal;
    hit.classList.toggle("legal", legal);
  }

  handEl.innerHTML = "";
  handEl.style.setProperty("--n", String(state.hand.length));
  handEl.dataset.n = String(state.hand.length);
  state.hand.forEach((id, index) => {
    const def = getCard(id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hand-card";
    btn.dataset.slot = String(index);
    btn.style.setProperty("--i", String(index));
    btn.style.setProperty("--n", String(state!.hand.length));
    const playable = intents.some((i) => i.kind === "play" && i.handIndex === index);
    const canSelect = playable && state!.active === "player" && mode === "play";
    if (!canSelect) btn.classList.add("disabled");
    if (selectedHand === index) btn.classList.add("selected");
    if (drag?.active && drag.handIndex === index) btn.classList.add("dragging");

    const face = document.createElement("img");
    face.className = "card-face";
    face.alt = `${def.name} ${keywordLabel(def.frontKeyword)}`;
    face.draggable = false;
    const cached = getCachedCardFace(id, "front");
    if (cached) {
      face.src = cached.toDataURL("image/png");
    } else {
      face.src = `./assets/cards/${id}-front.png`;
      void ensureCardFace(id, "front").then((c) => {
        face.src = c.toDataURL("image/png");
      });
    }

    const hold = document.createElement("img");
    hold.className = "hold-hand";
    hold.src = "./assets/ui/hand-hold.png";
    hold.alt = "";
    hold.draggable = false;

    btn.appendChild(face);
    btn.appendChild(hold);
    btn.title = `${def.name} · drag to a lane`;
    btn.addEventListener("pointerdown", (ev) => {
      if (!canSelect) return;
      ev.preventDefault();
      selectedHand = index;
      drag = {
        handIndex: index,
        pointerId: ev.pointerId,
        startX: ev.clientX,
        startY: ev.clientY,
        active: false,
        cardSrc: face.src,
      };
      for (const el of handEl.querySelectorAll(".hand-card")) {
        el.classList.toggle("selected", el === btn);
      }
      // refresh lane highlights for selected card without rebuilding hand DOM
      const live = legalIntents(state!);
      for (const hit of laneHits) {
        const lane = Number(hit.dataset.lane);
        const legal = live.some(
          (i) => i.kind === "play" && i.handIndex === index && i.lane === lane,
        );
        hit.disabled = !legal;
        hit.classList.toggle("legal", legal);
      }
      showToast("Drag to a lane — or tap a lane.");
    });
    handEl.appendChild(btn);
  });
}

function moveDragGhost(x: number, y: number): void {
  dragGhost.style.left = `${x}px`;
  dragGhost.style.top = `${y}px`;
}

function beginDragVisual(d: DragState): void {
  d.active = true;
  dragCardImg.src = d.cardSrc;
  dragLayer.hidden = false;
  document.body.classList.add("dragging-card");
  const btn = handEl.querySelectorAll(".hand-card")[d.handIndex];
  btn?.classList.add("dragging");
}

function endDragVisual(): void {
  dragLayer.hidden = true;
  document.body.classList.remove("dragging-card");
  drag = null;
}

function laneAtPoint(clientX: number, clientY: number): number | null {
  for (const hit of laneHits) {
    if (hit.disabled) continue;
    const r = hit.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      return Number(hit.dataset.lane);
    }
  }
  const canvasRect = canvas.getBoundingClientRect();
  if (
    clientX >= canvasRect.left &&
    clientX <= canvasRect.right &&
    clientY >= canvasRect.top &&
    clientY <= canvasRect.bottom
  ) {
    return stage.hitLane(clientX - canvasRect.left, clientY - canvasRect.top);
  }
  return null;
}

window.addEventListener("pointermove", (ev) => {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  const dx = ev.clientX - drag.startX;
  const dy = ev.clientY - drag.startY;
  if (!drag.active && Math.hypot(dx, dy) > 10) {
    beginDragVisual(drag);
  }
  if (drag.active) {
    moveDragGhost(ev.clientX, ev.clientY);
    const lane = laneAtPoint(ev.clientX, ev.clientY);
    for (const hit of laneHits) {
      hit.classList.toggle("drop-target", lane !== null && Number(hit.dataset.lane) === lane);
    }
  }
});

window.addEventListener("pointerup", (ev) => {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  const wasDragging = drag.active;
  const handIndex = drag.handIndex;
  const lane = wasDragging ? laneAtPoint(ev.clientX, ev.clientY) : null;
  for (const hit of laneHits) hit.classList.remove("drop-target");
  endDragVisual();
  selectedHand = handIndex;
  if (wasDragging && lane !== null) {
    tryLaneAction(lane);
  } else {
    syncHud();
  }
});

window.addEventListener("pointercancel", (ev) => {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  for (const hit of laneHits) hit.classList.remove("drop-target");
  endDragVisual();
  syncHud();
});

function afterPlayerAction(events: ReturnType<typeof applyIntent>): void {
  stage.onEvents(events);
  syncHud();
  if (state!.phase === "end") {
    showEnd();
    return;
  }
  if (state!.active === "enemy") {
    window.setTimeout(runEnemy, 420);
  }
}

function runEnemy(): void {
  if (!state || state.phase !== "play" || state.active !== "enemy") return;
  const intent = chooseAiMove(state);
  const events = applyIntent(state, intent);
  stage.onEvents(events);
  syncHud();
  if (state.winner !== null) {
    showEnd();
    return;
  }
  if (state.active === "enemy") {
    window.setTimeout(runEnemy, 280);
  }
}

function showEnd(): void {
  if (!state) return;
  endPanel.hidden = false;
  const w = state.winner;
  endTitle.textContent = w === "player" ? "You win" : w === "enemy" ? "You lose" : "Draw";
  const detail = (state.laneWinners ?? [])
    .map((x, i) => `Lane ${i + 1}: ${x}`)
    .join(" · ");
  endDetail.textContent = detail;
  handEl.innerHTML = "";
  btnFold.disabled = true;
  btnRip.disabled = true;
  btnPass.disabled = true;
}

function tryLaneAction(lane: number): void {
  if (!state || state.phase !== "play" || state.active !== "player") return;
  const intents = legalIntents(state);
  let intent: Intent | undefined;

  if (mode === "fold") {
    intent = intents.find((i) => i.kind === "fold" && i.lane === lane);
  } else if (mode === "rip") {
    intent = intents.find((i) => i.kind === "rip" && i.lane === lane);
  } else if (selectedHand !== null) {
    intent = intents.find(
      (i) => i.kind === "play" && i.handIndex === selectedHand && i.lane === lane,
    );
  }

  if (!intent) return;
  const events = applyIntent(state, intent);
  selectedHand = null;
  mode = "play";
  afterPlayerAction(events);
}

document.getElementById("btn-play")!.addEventListener("click", () => startMatch(false));
document.getElementById("btn-tutorial")!.addEventListener("click", () => startMatch(true));
document.getElementById("btn-again")!.addEventListener("click", () =>
  startMatch(!!state?.tutorial),
);
document.getElementById("btn-menu")!.addEventListener("click", () => {
  state = null;
  endPanel.hidden = true;
  menu.hidden = false;
  syncHud();
});

btnFold.addEventListener("click", () => {
  mode = mode === "fold" ? "play" : "fold";
  selectedHand = null;
  syncHud();
});
btnRip.addEventListener("click", () => {
  mode = mode === "rip" ? "play" : "rip";
  selectedHand = null;
  syncHud();
});
btnPass.addEventListener("click", () => {
  if (!state || state.active !== "player") return;
  const events = applyIntent(state, { kind: "pass" });
  mode = "play";
  afterPlayerAction(events);
});

for (const hit of laneHits) {
  hit.addEventListener("click", () => {
    const lane = Number(hit.dataset.lane);
    if (Number.isFinite(lane)) tryLaneAction(lane);
  });
}

canvas.addEventListener("pointerdown", (ev) => {
  if (!state || state.phase !== "play") return;
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  const lane = stage.hitLane(x, y);
  if (lane !== null) tryLaneAction(lane);
});

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps.tick(now);
  if (fps.fps < 28 && stage) stage.setDprCap(1.25);
  else if (fps.fps > 50) stage.setDprCap(2);

  stage.resize();
  if (state && state.phase !== "menu") stage.draw(state, dt);
  else stage.draw(
    {
      phase: "play",
      turn: 1,
      active: "player",
      lanes: [
        { player: null, enemy: null },
        { player: null, enemy: null },
        { player: null, enemy: null },
      ],
      hand: [],
      enemyHand: [],
      deck: [],
      enemyDeck: [],
      ripAvailable: true,
      enemyRipAvailable: true,
      winner: null,
      laneWinners: null,
      events: [],
      tutorial: false,
      tutorialStep: "done",
      nextId: 0,
    },
    dt,
  );
  requestAnimationFrame(frame);
}

syncHud();
void stage.preloadKnownArt();
requestAnimationFrame(frame);
