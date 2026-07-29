import type { PieceKind, Color } from "../core/types";
import { Theme } from "./theme";

const KINDS: PieceKind[] = ["K", "Q", "R", "B", "N", "P"];
const COLORS: Color[] = ["w", "b"];

const images = new Map<string, HTMLImageElement>();
let ready = false;
let loading: Promise<void> | null = null;

function key(color: Color, kind: PieceKind): string {
  return color + kind;
}

const PIECE_CACHE_VER = 3;
let loadedVer = -1;

export function loadNexusPieces(): Promise<void> {
  if (ready && loadedVer === PIECE_CACHE_VER && loading === null) return Promise.resolve();
  if (loading) return loading;

  images.clear();
  ready = false;

  loading = Promise.all(
    COLORS.flatMap((c) =>
      KINDS.map(
        (k) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              images.set(key(c, k), img);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = `./themes/nexus/pieces/${c}${k}.png?v=${PIECE_CACHE_VER}`;
          }),
      ),
    ),
  ).then(() => {
    ready = images.size > 0;
    loadedVer = PIECE_CACHE_VER;
    loading = null;
  });

  return loading;
}

export function piecesReady(): boolean {
  return ready;
}

export function getPieceImage(color: Color, kind: PieceKind): HTMLImageElement | null {
  return images.get(key(color, kind)) ?? null;
}

export function drawThemePiece(
  ctx: CanvasRenderingContext2D,
  color: Color,
  kind: PieceKind,
  cx: number,
  cy: number,
  cellSize: number,
  unicodeFallback: string,
) {
  const useSprite = Theme.pieceMode === "sprites";
  const img = useSprite ? getPieceImage(color, kind) : null;

  if (img && img.complete && img.naturalWidth > 0) {
    const size = cellSize * 0.86;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = Theme.pieceShadow;
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.42, size * 0.28, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // No shadowBlur — it freezes Canvas2D when applied to every piece each frame
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    return;
  }

  // Classic unicode fallback
  ctx.font = `${cellSize * 0.68}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = Theme.pieceShadow;
  ctx.fillText(unicodeFallback, cx + 0.5, cy + cellSize * 0.04);
  if (color === "w") {
    ctx.fillStyle = Theme.whitePiece;
    ctx.fillText(unicodeFallback, cx, cy);
  } else {
    ctx.fillStyle = Theme.blackPiece;
    ctx.fillText(unicodeFallback, cx, cy);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 0.8;
    ctx.strokeText(unicodeFallback, cx, cy);
  }
}
