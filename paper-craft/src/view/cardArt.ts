import { bakeCardFace, loadImage } from "./cardBake";

const cache = new Map<string, HTMLCanvasElement>();
const inflight = new Map<string, Promise<HTMLCanvasElement>>();

function key(cardId: string, face: "front" | "ink"): string {
  return `${cardId}:${face}`;
}

let fontsReady: Promise<void> | null = null;

function ensureFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = (async () => {
      try {
        await Promise.all([
          document.fonts.load("800 22px Oswald"),
          document.fonts.load("700 13px Oswald"),
          document.fonts.load("800 22px 'Space Grotesk'"),
        ]);
      } catch {
        /* fall back to system fonts */
      }
    })();
  }
  return fontsReady;
}

export function getCachedCardFace(
  cardId: string,
  face: "front" | "ink",
): HTMLCanvasElement | null {
  return cache.get(key(cardId, face)) ?? null;
}

export async function ensureCardFace(
  cardId: string,
  face: "front" | "ink",
): Promise<HTMLCanvasElement> {
  const k = key(cardId, face);
  const hit = cache.get(k);
  if (hit) return hit;
  const pending = inflight.get(k);
  if (pending) return pending;

  const job = (async () => {
    await ensureFonts();
    const art = await loadImage(`./assets/cards/${cardId}-${face}.png`);
    const baked = bakeCardFace(cardId, face, art);
    cache.set(k, baked);
    inflight.delete(k);
    return baked;
  })();
  inflight.set(k, job);
  return job;
}

export async function preloadAllCardFaces(ids: string[]): Promise<void> {
  await ensureFonts();
  await Promise.all(
    ids.flatMap((id) => [
      ensureCardFace(id, "front"),
      ensureCardFace(id, "ink"),
    ]),
  );
}
