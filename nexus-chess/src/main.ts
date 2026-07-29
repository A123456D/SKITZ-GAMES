import { newGame } from "./core/board";
import type { GameState } from "./core/types";
import { beginTurn, doAbilityPhase, doMovePhase, endTurn, skipAbility } from "./core/turn";
import { aiTurn } from "./core/ai";
import {
  layout,
  drawBoard,
  drawHud,
  drawWinOverlay,
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
import { squareScreenPos } from "./view/draw";

const canvas = document.getElementById("game") as HTMLCanvasElement;

let state: GameState = beginTurn(newGame());
let ui: UiState = createUiState();
let aiEnabled = true;
let buttons: ButtonRect[] = [];
let dc: DrawCtx = layout(canvas);
let moveAnim: MoveAnim | null = null;
let captureFlash: CaptureFlash | null = null;
let aiPending = false;

function resetGame() {
  state = beginTurn(newGame());
  ui = clearUi(ui);
  moveAnim = null;
  captureFlash = null;
  aiPending = false;
}

function maybeAiTurn() {
  if (!aiEnabled || state.winner || state.activeColor !== "b" || aiPending) return;
  aiPending = true;
  setTimeout(() => {
    if (state.winner || state.activeColor !== "b") {
      aiPending = false;
      return;
    }
    state = aiTurn(state);
    ui = clearUi(ui);
    aiPending = false;
  }, 400);
}

function onPointer(e: PointerEvent) {
  if (moveAnim) return; // ignore clicks during animation
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;

  const result = handleClick(ui, state, dc, buttons, px, py);

  switch (result.type) {
    case "newgame":
      resetGame();
      break;

    case "toggleai":
      aiEnabled = !aiEnabled;
      if (aiEnabled) maybeAiTurn();
      break;

    case "skip":
      state = skipAbility(state);
      ui = clearUi(ui);
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
        ui = clearUi(ui);
      }
      break;

    case "select":
      if (result.square) {
        ui = applySelect(ui, state, result.square);
      }
      break;

    case "deselect":
      ui = clearUi(ui);
      break;

    case "move":
      if (result.move) {
        const hadPiece = state.board.has(result.move.to);
        const [fromX, fromY] = squareScreenPos(dc, result.move.from);
        const [toX, toY] = squareScreenPos(dc, result.move.to);
        const piece = state.board.get(result.move.from);
        const PIECE_CHARS: Record<string, string> = {
          wK: "\u2654", wQ: "\u2655", wR: "\u2656", wB: "\u2657", wN: "\u2658", wP: "\u2659",
          bK: "\u265A", bQ: "\u265B", bR: "\u265C", bB: "\u265D", bN: "\u265E", bP: "\u265F",
        };

        if (piece) {
          moveAnim = {
            fromX, fromY, toX, toY,
            startTime: performance.now(),
            duration: 180,
            piece: PIECE_CHARS[piece.color + piece.kind] || "?",
          };
        }

        if (hadPiece) {
          captureFlash = {
            x: toX, y: toY, size: dc.cellSize,
            startTime: performance.now(),
            duration: 200,
          };
        }

        state = doMovePhase(state, result.move);
        ui = clearUi(ui);

        // After animation finishes, end turn if resolved
        setTimeout(() => {
          moveAnim = null;
          if (state.winner) return;
          if (state.turnPhase === "resolved") {
            state = endTurn(state);
            maybeAiTurn();
          } else if (state.turnPhase === "overdrive") {
            // Wait for 2nd overdrive move
          }
        }, 200);
      }
      break;
  }
}

canvas.addEventListener("pointerdown", onPointer);
window.addEventListener("resize", () => {
  dc = layout(canvas);
});

function frame(now: number) {
  dc = layout(canvas);
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

  drawHud(dc, state, buttons, aiEnabled);

  if (state.winner) {
    drawWinOverlay(dc, state.winner);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
maybeAiTurn();
