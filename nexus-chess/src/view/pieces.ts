import type { PieceKind, Color } from "../core/types";
import { Theme } from "./theme";

const KINDS: PieceKind[] = ["K", "Q", "R", "B", "N", "P"];
const COLORS: Color[] = ["w", "b"];

const images = new Map<string, HTMLImageElement>();
let ready = false;
let loading: Promise<void> | null = null;
let loadedPack: string | null = null;

const PIECE_CACHE_VER = 4;

function key(color: Color, kind: PieceKind): string {
  return color + kind;
}

/** Load sprites for the active theme pack (nexus / forge). */
export function loadThemePieces(): Promise<void> {
  const pack = Theme.piecePack;
  if (Theme.pieceMode !== "sprites" || !pack) {
    images.clear();
    ready = false;
    loadedPack = null;
    return Promise.resolve();
  }
  if (ready && loadedPack === pack && loading === null) return Promise.resolve();
  if (loading && loadedPack === pack) return loading;

  images.clear();
  ready = false;
  loadedPack = pack;

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
            img.src = `./themes/${pack}/pieces/${c}${k}.png?v=${PIECE_CACHE_VER}`;
          }),
      ),
    ),
  ).then(() => {
    ready = images.size > 0;
    loading = null;
  });

  return loading;
}

/** @deprecated use loadThemePieces */
export function loadNexusPieces(): Promise<void> {
  return loadThemePieces();
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
    // Slightly smaller than forge — new Nexus pieces are denser 3D icons
    const size = cellSize * (Theme.id === "forge" ? 0.72 : Theme.id === "nexus" ? 0.82 : 0.86);
    const yBias = Theme.id === "forge" ? cellSize * 0.06 : Theme.id === "nexus" ? cellSize * 0.03 : 0;
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = Theme.pieceShadow;
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.4 + yBias, size * 0.26, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(img, cx - size / 2, cy - size / 2 + yBias, size, size);
    return;
  }

  ctx.fillStyle = color === "w" ? Theme.whitePiece : Theme.blackPiece;
  ctx.font = `500 ${cellSize * 0.72}px ${Theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(unicodeFallback, cx, cy + cellSize * 0.04);
}
