import { newGame } from "./core/board";
import type { GameState } from "./core/types";
import { beginTurn, doAbilityPhase, doMovePhase, endTurn, skipAbility } from "./core/turn";
import {
  aiTurn,
  aiThinkDelay,
  AI_DIFFICULTY_LABELS,
  type AiDifficulty,
} from "./core/ai";
import {
  loadProfile,
  recordAiGame,
  type EloProfile,
  type EloResult,
} from "./core/elo";
import {
  layout,
  drawBoard,
  drawHud,
  squareScreenPos,
  loadLogo,
  getLogoImage,
  type DrawCtx,
  type ButtonRect,
} from "./view/draw";
import {
  createUiState,
  handleClick,
  applySelect,
  applyAbilitySelect,
  clearUi,
  makeAbilityCast,
  type UiState,
} from "./view/input";
import {
  drawMoveAnim,
  drawCaptureFlash,
  type MoveAnim,
  type CaptureFlash,
} from "./view/anim";
import {
  drawHome,
  drawAiSelect,
  drawHowTo,
  drawResult,
  hitMenuButton,
  setMenuLogo,
  type Screen,
  type PlayMode,
} from "./view/menu";

const canvas = document.getElementById("game") as HTMLCanvasElement;

let screen: Screen = "home";
let playMode: PlayMode = "ai";
let aiDifficulty: AiDifficulty = 2;
let profile: EloProfile = loadProfile();
let lastEloResult: EloResult | null = null;

let state: GameState = beginTurn(newGame());
let ui: UiState = createUiState();
let buttons: ButtonRect[] = [];
let dc: DrawCtx = layout(canvas);
let moveAnim: MoveAnim | null = null;
let captureFlash: CaptureFlash | null = null;
let aiPending = false;
let lastLayoutKey = "";
let eloRecorded = false;

const PIECE_CHARS: Record<string, string> = {
  wK: "\u2654", wQ: "\u2655", wR: "\u2656", wB: "\u2657", wN: "\u2658", wP: "\u2659",
  bK: "\u265A", bQ: "\u265B", bR: "\u265C", bB: "\u265D", bN: "\u265E", bP: "\u265F",
};

function boardFlipped(): boolean {
  return playMode === "local" && state.activeColor === "b";
}

function modeLabel(): string {
  if (playMode === "local") return "Local";
  return `vs ${AI_DIFFICULTY_LABELS[aiDifficulty as Exclude<AiDifficulty, 0>] ?? "AI"}`;
}

function startMatch(mode: PlayMode, difficulty: AiDifficulty = 2) {
  playMode = mode;
  aiDifficulty = mode === "ai" ? difficulty : 0;
  state = beginTurn(newGame());
  ui = clearUi();
  moveAnim = null;
  captureFlash = null;
  aiPending = false;
  eloRecorded = false;
  lastEloResult = null;
  screen = "play";
  maybeAiTurn();
}

function goHome() {
  screen = "home";
  aiPending = false;
  ui = clearUi();
  profile = loadProfile();
}

function finishIfWon() {
  if (!state.winner || screen !== "play") return;
  if (!eloRecorded && playMode === "ai" && aiDifficulty >= 1 && aiDifficulty <= 4) {
    const { profile: next, result } = recordAiGame(
      profile,
      aiDifficulty as Exclude<AiDifficulty, 0>,
      state.winner,
    );
    profile = next;
    lastEloResult = result;
    eloRecorded = true;
  }
  screen = "result";
}

function maybeAiTurn() {
  if (playMode !== "ai" || aiDifficulty === 0) return;
  if (state.winner || state.activeColor !== "b" || aiPending || screen !== "play") return;
  aiPending = true;
  const difficulty = aiDifficulty;
  const delay = aiThinkDelay(difficulty);
  setTimeout(() => {
    if (screen !== "play" || state.winner || state.activeColor !== "b") {
      aiPending = false;
      return;
    }
    const run = () => {
      state = aiTurn(state, difficulty);
      ui = clearUi();
      aiPending = false;
      finishIfWon();
    };
    if (difficulty >= 2) setTimeout(run, 0);
    else run();
  }, delay);
}

function pointerToCanvas(e: PointerEvent): { px: number; py: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = dc.width / Math.max(1, rect.width);
  const scaleY = dc.height / Math.max(1, rect.height);
  return {
    px: (e.clientX - rect.left) * scaleX,
    py: (e.clientY - rect.top) * scaleY,
  };
}

function onMenuClick(id: string) {
  if (id === "menu-vsai") {
    screen = "aiSelect";
    return;
  }
  if (id === "menu-local") {
    startMatch("local");
    return;
  }
  if (id === "menu-how") {
    screen = "how";
    return;
  }
  if (id === "menu-back") {
    screen = "home";
    return;
  }
  if (id.startsWith("ai-")) {
    const d = Number(id.slice(3)) as AiDifficulty;
    if (d >= 1 && d <= 4) startMatch("ai", d);
    return;
  }
  if (id === "result-rematch") {
    startMatch(playMode, playMode === "ai" ? aiDifficulty : 2);
    return;
  }
  if (id === "result-menu") {
    goHome();
  }
}

function onPointer(e: PointerEvent) {
  if (moveAnim || aiPending) return;
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();

  const { px, py } = pointerToCanvas(e);

  if (screen === "home" || screen === "aiSelect" || screen === "how" || screen === "result") {
    const id = hitMenuButton(buttons, px, py);
    if (id) onMenuClick(id);
    return;
  }

  // play
  const flipped = boardFlipped();
  const result = handleClick(ui, state, dc, buttons, px, py, flipped);

  switch (result.type) {
    case "menu":
      goHome();
      break;

    case "skip":
      state = skipAbility(state);
      ui = clearUi();
      break;

    case "selectAfterSkip":
      state = skipAbility(state);
      if (result.square) ui = applySelect(ui, state, result.square);
      else ui = clearUi();
      break;

    case "ability":
      if (result.ability) ui = applyAbilitySelect(ui, state, result.ability);
      break;

    case "abilityTarget":
      if (result.ability && result.square) {
        state = doAbilityPhase(state, makeAbilityCast(result.ability, result.square));
        ui = clearUi();
      }
      break;

    case "select":
      if (result.square) ui = applySelect(ui, state, result.square);
      break;

    case "deselect":
      ui = clearUi();
      break;

    case "move":
      if (result.move) {
        const hadPiece = state.board.has(result.move.to);
        const [fromX, fromY] = squareScreenPos(dc, result.move.from, flipped);
        const [toX, toY] = squareScreenPos(dc, result.move.to, flipped);
        const piece = state.board.get(result.move.from);

        if (piece) {
          moveAnim = {
            fromX,
            fromY,
            toX,
            toY,
            startTime: performance.now(),
            duration: 180,
            piece: PIECE_CHARS[piece.color + piece.kind] || "?",
          };
        }

        if (hadPiece) {
          captureFlash = {
            x: toX,
            y: toY,
            size: dc.cellSize,
            startTime: performance.now(),
            duration: 200,
          };
        }

        state = doMovePhase(state, result.move);
        ui = clearUi();

        setTimeout(() => {
          moveAnim = null;
          if (state.winner) {
            finishIfWon();
            return;
          }
          if (state.turnPhase === "resolved") {
            state = endTurn(state);
            if (state.winner) finishIfWon();
            else maybeAiTurn();
          }
        }, 200);
      }
      break;
  }
}

canvas.addEventListener("pointerdown", onPointer, { passive: false });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

function relayout() {
  const next = layout(canvas);
  const key = `${next.width}x${next.height}@${window.devicePixelRatio}`;
  lastLayoutKey = key;
  dc = next;
}

window.addEventListener("resize", relayout);
window.visualViewport?.addEventListener("resize", relayout);
window.visualViewport?.addEventListener("scroll", relayout);

function frame(now: number) {
  relayout();
  const time = now / 1000;
  buttons.length = 0;

  if (screen === "home") {
    drawHome(dc, buttons, profile);
  } else if (screen === "aiSelect") {
    drawAiSelect(dc, buttons, profile);
  } else if (screen === "how") {
    drawHowTo(dc, buttons);
  } else if (screen === "result") {
    drawResult(dc, buttons, {
      winner: state.winner ?? "w",
      mode: playMode,
      elo: lastEloResult,
      difficulty: aiDifficulty,
    });
  } else {
    const flipped = boardFlipped();
    drawBoard(
      dc,
      state,
      time,
      ui.selected,
      ui.legalMoves,
      ui.abilityTargetSquares,
      ui.activeAbility,
      flipped,
    );

    if (moveAnim) {
      const alive = drawMoveAnim(dc.ctx, moveAnim, now, dc.cellSize);
      if (!alive) moveAnim = null;
    }

    if (captureFlash) {
      const alive = drawCaptureFlash(dc.ctx, captureFlash, now);
      if (!alive) captureFlash = null;
    }

    drawHud(dc, state, buttons, modeLabel());
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
void loadLogo().then((img) => setMenuLogo(img ?? getLogoImage()));
