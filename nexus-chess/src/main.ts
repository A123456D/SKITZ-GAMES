import { newGame } from "./core/board";
import type { GameState } from "./core/types";
import { beginTurn, doAbilityPhase, doMovePhase, endTurn, skipAbility } from "./core/turn";
import {
  aiTurn,
  aiThinkDelay,
  nextAiDifficulty,
  AI_DIFFICULTY_LABELS,
  type AiDifficulty,
} from "./core/ai";
import {
  layout,
  drawBoard,
  drawHud,
  drawWinOverlay,
  squareScreenPos,
  loadLogo,
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

const canvas = document.getElementById("game") as HTMLCanvasElement;
const AI_STORAGE_KEY = "nexus-chess-ai-difficulty";

function loadDifficulty(): AiDifficulty {
  const raw = localStorage.getItem(AI_STORAGE_KEY);
  const n = raw === null ? 2 : Number(raw);
  if (n === 0 || n === 1 || n === 2 || n === 3 || n === 4) return n;
  return 2;
}

function saveDifficulty(d: AiDifficulty) {
  localStorage.setItem(AI_STORAGE_KEY, String(d));
}

let state: GameState = beginTurn(newGame());
let ui: UiState = createUiState();
let aiDifficulty: AiDifficulty = loadDifficulty();
let buttons: ButtonRect[] = [];
let dc: DrawCtx = layout(canvas);
let moveAnim: MoveAnim | null = null;
let captureFlash: CaptureFlash | null = null;
let aiPending = false;
let lastLayoutKey = "";

const PIECE_CHARS: Record<string, string> = {
  wK: "\u2654", wQ: "\u2655", wR: "\u2656", wB: "\u2657", wN: "\u2658", wP: "\u2659",
  bK: "\u265A", bQ: "\u265B", bR: "\u265C", bB: "\u265D", bN: "\u265E", bP: "\u265F",
};

function aiLabel(): string {
  return AI_DIFFICULTY_LABELS[aiDifficulty];
}

function resetGame() {
  state = beginTurn(newGame());
  ui = clearUi();
  moveAnim = null;
  captureFlash = null;
  aiPending = false;
}

function maybeAiTurn() {
  if (aiDifficulty === 0 || state.winner || state.activeColor !== "b" || aiPending) return;
  aiPending = true;
  const difficulty = aiDifficulty;
  const delay = aiThinkDelay(difficulty);
  setTimeout(() => {
    if (state.winner || state.activeColor !== "b" || aiDifficulty === 0) {
      aiPending = false;
      return;
    }
    // Search levels can be heavy — yield then compute
    const run = () => {
      state = aiTurn(state, difficulty);
      ui = clearUi();
      aiPending = false;
    };
    if (difficulty >= 2) {
      setTimeout(run, 0);
    } else {
      run();
    }
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

function onPointer(e: PointerEvent) {
  if (moveAnim || aiPending) return;
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();

  const { px, py } = pointerToCanvas(e);
  const result = handleClick(ui, state, dc, buttons, px, py);

  switch (result.type) {
    case "newgame":
      resetGame();
      maybeAiTurn();
      break;

    case "cycleai":
      aiDifficulty = nextAiDifficulty(aiDifficulty);
      saveDifficulty(aiDifficulty);
      if (aiDifficulty > 0) maybeAiTurn();
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
      if (result.ability) {
        ui = applyAbilitySelect(ui, state, result.ability);
      }
      break;

    case "abilityTarget":
      if (result.ability && result.square) {
        const cast = makeAbilityCast(result.ability, result.square);
        state = doAbilityPhase(state, cast);
        ui = clearUi();
      }
      break;

    case "select":
      if (result.square) {
        ui = applySelect(ui, state, result.square);
      }
      break;

    case "deselect":
      ui = clearUi();
      break;

    case "move":
      if (result.move) {
        const hadPiece = state.board.has(result.move.to);
        const [fromX, fromY] = squareScreenPos(dc, result.move.from);
        const [toX, toY] = squareScreenPos(dc, result.move.to);
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
          if (state.winner) return;
          if (state.turnPhase === "resolved") {
            state = endTurn(state);
            maybeAiTurn();
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
  if (key !== lastLayoutKey) {
    lastLayoutKey = key;
    dc = next;
  } else {
    dc = next;
  }
}

window.addEventListener("resize", relayout);
window.visualViewport?.addEventListener("resize", relayout);
window.visualViewport?.addEventListener("scroll", relayout);

function frame(now: number) {
  relayout();
  const time = now / 1000;

  drawBoard(
    dc,
    state,
    time,
    ui.selected,
    ui.legalMoves,
    ui.abilityTargetSquares,
    ui.activeAbility,
  );

  if (moveAnim) {
    const alive = drawMoveAnim(dc.ctx, moveAnim, now, dc.cellSize);
    if (!alive) moveAnim = null;
  }

  if (captureFlash) {
    const alive = drawCaptureFlash(dc.ctx, captureFlash, now);
    if (!alive) captureFlash = null;
  }

  drawHud(dc, state, buttons, aiLabel());

  if (state.winner) {
    drawWinOverlay(dc, state.winner);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
void loadLogo();
maybeAiTurn();
