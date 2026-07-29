import { newGame } from "./core/board";
import type { GameState, Square } from "./core/types";
import { beginTurn, doAbilityPhase, doMovePhase, endTurn, skipAbility } from "./core/turn";
import { aiPlay, aiThinkDelay, type AiDifficulty } from "./core/ai";
import {
  loadProfile,
  recordAiGame,
  setPlayerElo,
  clampElo,
  eloToDifficulty,
  OPPONENT_ELO_OPTIONS,
  ELO_STEP,
  ELO_MIN,
  ELO_MAX,
  type EloProfile,
  type EloResult,
} from "./core/elo";
import {
  layout,
  drawBoard,
  drawHud,
  drawAbilityConfirm,
  squareScreenPos,
  loadLogo,
  loadNexusMark,
  loadAbilityIcons,
  getLogoImage,
  type DrawCtx,
  type ButtonRect,
} from "./view/draw";
import {
  createUiState,
  handleClick,
  applySelect,
  applyAbilityPrompt,
  applyAbilitySelect,
  canAffordAbility,
  clearUi,
  makeAbilityCast,
  type UiState,
} from "./view/input";
import {
  drawMoveAnim,
  drawCaptureFlash,
  createBoardFx,
  updateBoardFx,
  drawBoardFx,
  spawnLandFx,
  type MoveAnim,
  type CaptureFlash,
  type BoardFx,
} from "./view/anim";
import {
  unlockAudio,
  playMoveLift,
  playMoveLand,
  playCapture,
  playUiTap,
  playAbility,
} from "./view/sfx";
import {
  drawHome,
  drawHub,
  drawSetElo,
  drawAiSelect,
  drawHowTo,
  drawResult,
  hitMenuButton,
  setMenuLogo,
  type Screen,
  type PlayMode,
} from "./view/menu";
import { initTheme, applyTheme, Theme, type ThemeId } from "./view/theme";
import { loadNexusPieces } from "./view/pieces";
import { loadThemeArt } from "./view/fx";

initTheme();

const canvas = document.getElementById("game") as HTMLCanvasElement;

let screen: Screen = "home";
let playMode: PlayMode = "ai";
let aiDifficulty: AiDifficulty = 2;
let opponentElo = 1200;
let draftPlayerElo = 1200;
let profile: EloProfile = loadProfile();
let lastEloResult: EloResult | null = null;

let state: GameState = beginTurn(newGame());
let ui: UiState = createUiState();
let buttons: ButtonRect[] = [];
let dc: DrawCtx = layout(canvas);
let moveAnim: MoveAnim | null = null;
let captureFlash: CaptureFlash | null = null;
let boardFx: BoardFx = createBoardFx();
let lastFrame = performance.now();
let animEndTimer: ReturnType<typeof setTimeout> | null = null;
let aiPending = false;
let eloRecorded = false;
let lastMove: { from: Square; to: Square } | null = null;

const PIECE_CHARS: Record<string, string> = {
  wK: "\u2654", wQ: "\u2655", wR: "\u2656", wB: "\u2657", wN: "\u2658", wP: "\u2659",
  bK: "\u265A", bQ: "\u265B", bR: "\u265C", bB: "\u265D", bN: "\u265E", bP: "\u265F",
};

function boardFlipped(): boolean {
  return playMode === "local" && state.activeColor === "b";
}

function modeLabel(): string {
  if (playMode === "local") return "Local";
  return `vs ${opponentElo}`;
}

function nearestOppOption(elo: number): number {
  let best: number = OPPONENT_ELO_OPTIONS[0];
  let bestDist = Math.abs(elo - best);
  for (const o of OPPONENT_ELO_OPTIONS) {
    const d = Math.abs(elo - o);
    if (d < bestDist) {
      best = o;
      bestDist = d;
    }
  }
  return best;
}

function openHub() {
  profile = loadProfile();
  if (!profile.hasSetRating) {
    draftPlayerElo = profile.rating;
    screen = "setElo";
    return;
  }
  screen = "hub";
}

function startMatch(mode: PlayMode, oppElo = opponentElo) {
  playMode = mode;
  opponentElo = clampElo(oppElo);
  aiDifficulty = mode === "ai" ? eloToDifficulty(opponentElo) : 0;
  state = beginTurn(newGame());
  ui = clearUi();
  moveAnim = null;
  captureFlash = null;
  boardFx = createBoardFx();
  if (animEndTimer) {
    clearTimeout(animEndTimer);
    animEndTimer = null;
  }
  aiPending = false;
  eloRecorded = false;
  lastEloResult = null;
  lastMove = null;
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
  if (!eloRecorded && playMode === "ai") {
    const { profile: next, result } = recordAiGame(profile, opponentElo, state.winner);
    profile = next;
    lastEloResult = result;
    eloRecorded = true;
  }
  screen = "result";
}

function maybeAiTurn() {
  if (playMode !== "ai" || aiDifficulty === 0) return;
  if (state.winner || state.activeColor !== "b" || aiPending || screen !== "play") return;
  if (moveAnim) return;
  aiPending = true;
  const difficulty = aiDifficulty;
  const delay = aiThinkDelay(difficulty);
  setTimeout(() => {
    if (screen !== "play" || state.winner || state.activeColor !== "b") {
      aiPending = false;
      return;
    }
    // Yield a frame so the UI stays responsive before a heavy search
    setTimeout(() => {
      try {
        if (screen !== "play" || state.activeColor !== "b") return;
        const result = aiPlay(state, difficulty);
        state = result.state;
        if (result.lastMove) {
          lastMove = { from: result.lastMove.from, to: result.lastMove.to };
        }
        ui = clearUi();
        finishIfWon();
      } finally {
        aiPending = false;
      }
    }, 16);
  }, delay);
}

function finishMoveSequence() {
  if (animEndTimer) {
    clearTimeout(animEndTimer);
    animEndTimer = null;
  }
  const hadAnim = !!moveAnim;
  moveAnim = null;
  if (!hadAnim && state.turnPhase !== "resolved") return;
  if (state.winner) {
    finishIfWon();
    return;
  }
  if (state.turnPhase === "resolved") {
    state = endTurn(state);
    if (state.winner) finishIfWon();
    else maybeAiTurn();
  }
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
  if (id === "home-play") {
    openHub();
    return;
  }
  if (id === "hub-home") {
    goHome();
    return;
  }
  if (id === "hub-theme") {
    const next: ThemeId = Theme.id === "nexus" ? "classic" : "nexus";
    applyTheme(next);
    void loadThemeArt();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", Theme.bg);
    return;
  }
  if (id === "hub-setelo") {
    draftPlayerElo = profile.rating;
    screen = "setElo";
    return;
  }
  if (id.startsWith("elo-preset-")) {
    draftPlayerElo = Number(id.slice("elo-preset-".length));
    return;
  }
  if (id === "elo-minus") {
    draftPlayerElo = clampElo(draftPlayerElo - ELO_STEP);
    return;
  }
  if (id === "elo-plus") {
    draftPlayerElo = clampElo(draftPlayerElo + ELO_STEP);
    return;
  }
  if (id === "elo-save") {
    profile = setPlayerElo(profile, draftPlayerElo);
    screen = "hub";
    return;
  }
  if (id === "menu-vsai") {
    opponentElo = nearestOppOption(profile.rating);
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
    screen = "hub";
    return;
  }
  if (id === "opp-minus") {
    opponentElo = clampElo(Math.max(ELO_MIN, opponentElo - ELO_STEP));
    return;
  }
  if (id === "opp-plus") {
    opponentElo = clampElo(Math.min(ELO_MAX, opponentElo + ELO_STEP));
    return;
  }
  if (id.startsWith("opp-") && id !== "opp-start" && id !== "opp-minus" && id !== "opp-plus") {
    opponentElo = Number(id.slice(4));
    return;
  }
  if (id === "opp-start") {
    startMatch("ai", opponentElo);
    return;
  }
  if (id === "result-rematch") {
    startMatch(playMode, opponentElo);
    return;
  }
  if (id === "result-menu") {
    openHub();
  }
}

function onPointer(e: PointerEvent) {
  unlockAudio();
  if (moveAnim || aiPending) return;
  // button is 0 for primary click; -1 can appear on some synthetic pointer events
  if (e.button !== undefined && e.button !== 0 && e.button !== -1) return;
  e.preventDefault();

  const { px, py } = pointerToCanvas(e);

  if (screen !== "play") {
    const id = hitMenuButton(buttons, px, py);
    if (id) {
      playUiTap();
      onMenuClick(id);
    }
    return;
  }

  const flipped = boardFlipped();
  const result = handleClick(ui, state, dc, buttons, px, py, flipped);

  switch (result.type) {
    case "menu":
      openHub();
      break;

    case "skip":
      state = skipAbility(state);
      ui = clearUi();
      playUiTap();
      break;

    case "selectAfterSkip":
      state = skipAbility(state);
      if (result.square) ui = applySelect(ui, state, result.square);
      else ui = clearUi();
      break;

    case "ability":
      if (result.ability) {
        ui = applyAbilityPrompt(ui, result.ability);
        playUiTap();
      }
      break;

    case "abilityConfirm":
      if (ui.pendingAbility && canAffordAbility(state, ui.pendingAbility)) {
        ui = applyAbilitySelect(ui, state, ui.pendingAbility);
        playUiTap();
      }
      break;

    case "abilityCancel":
      ui = clearUi();
      playUiTap();
      break;

    case "abilityTarget":
      if (result.ability && result.square) {
        state = doAbilityPhase(state, makeAbilityCast(result.ability, result.square));
        ui = clearUi();
        playAbility();
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
        const moveMs = hadPiece ? 400 : 360;
        lastMove = { from: result.move.from, to: result.move.to };

        if (piece) {
          moveAnim = {
            fromX,
            fromY,
            toX,
            toY,
            startTime: performance.now(),
            duration: moveMs,
            piece: PIECE_CHARS[piece.color + piece.kind] || "?",
            color: piece.color,
            kind: piece.kind,
            toSq: result.move.to,
            isCapture: hadPiece,
            landed: false,
          };
          playMoveLift();
        }

        if (hadPiece) {
          captureFlash = {
            x: toX,
            y: toY,
            size: dc.cellSize,
            startTime: performance.now() + moveMs * 0.82,
            duration: 220,
          };
        }

        state = doMovePhase(state, result.move);
        ui = clearUi();

        if (animEndTimer) clearTimeout(animEndTimer);
        animEndTimer = setTimeout(() => {
          finishMoveSequence();
        }, moveMs + 60);
      }
      break;
  }
}

canvas.addEventListener("pointerdown", onPointer, { passive: false });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

function relayout() {
  dc = layout(canvas, dc);
}

window.addEventListener("resize", relayout);
window.visualViewport?.addEventListener("resize", relayout);
window.visualViewport?.addEventListener("scroll", relayout);

function frame(now: number) {
  const dt = Math.min(48, now - lastFrame);
  lastFrame = now;
  relayout();
  const time = now / 1000;
  buttons.length = 0;

  if (screen === "home") {
    drawHome(dc, buttons, time);
  } else if (screen === "hub") {
    drawHub(dc, buttons, profile, time);
  } else if (screen === "setElo") {
    drawSetElo(dc, buttons, profile, draftPlayerElo, time);
  } else if (screen === "aiSelect") {
    drawAiSelect(dc, buttons, profile, opponentElo, time);
  } else if (screen === "how") {
    drawHowTo(dc, buttons, time);
  } else if (screen === "result") {
    drawResult(dc, buttons, {
      winner: state.winner ?? "w",
      mode: playMode,
      elo: lastEloResult,
      opponentElo,
    }, time);
  } else {
    const flipped = boardFlipped();
    const hideSq = (moveAnim?.toSq as Square | undefined) ?? null;
    drawBoard(
      dc,
      state,
      time,
      ui.selected,
      ui.legalMoves,
      ui.abilityTargetSquares,
      ui.activeAbility,
      flipped,
      hideSq,
      lastMove,
    );

    updateBoardFx(boardFx, dt, now);
    drawBoardFx(dc.ctx, boardFx, now);

    if (moveAnim) {
      const { alive, justLanded } = drawMoveAnim(dc.ctx, moveAnim, now, dc.cellSize);
      if (justLanded) {
        spawnLandFx(
          boardFx,
          moveAnim.toX,
          moveAnim.toY,
          dc.cellSize,
          now,
          !!moveAnim.isCapture,
        );
        if (moveAnim.isCapture) playCapture();
        else playMoveLand();
      }
      if (!alive) {
        finishMoveSequence();
      }
    }

    if (captureFlash) {
      const alive = drawCaptureFlash(dc.ctx, captureFlash, now);
      if (!alive) captureFlash = null;
    }

    drawHud(dc, state, buttons, modeLabel(), ui.pendingAbility ?? ui.activeAbility);

    if (ui.mode === "abilityConfirm" && ui.pendingAbility) {
      drawAbilityConfirm(
        dc,
        buttons,
        ui.pendingAbility,
        canAffordAbility(state, ui.pendingAbility),
      );
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
void loadLogo().then((img) => setMenuLogo(img ?? getLogoImage()));
void loadNexusPieces();
void loadThemeArt();
void loadNexusMark();
void loadAbilityIcons();
document.querySelector('meta[name="theme-color"]')?.setAttribute("content", Theme.bg);
