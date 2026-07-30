export type RenderQuality = {
  dprCap: number;
  stickerShadows: boolean;
  hoverAnim: boolean;
  /** Craft-paper multiply grain on cube faces. */
  paperGrain: boolean;
};

let quality: RenderQuality = {
  dprCap: 2,
  stickerShadows: true,
  hoverAnim: true,
  paperGrain: true,
};

export function detectQuality(): RenderQuality {
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;
  const saveData = Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData,
  );
  // Touch / data-saver: lower pixel density only — keep the full look (shadows, grain, hover).
  const lowEnd = coarse || saveData;

  quality = lowEnd
    ? {
        dprCap: 1.25,
        stickerShadows: true,
        hoverAnim: true,
        paperGrain: true,
      }
    : {
        dprCap: 2,
        stickerShadows: true,
        hoverAnim: true,
        paperGrain: true,
      };
  return quality;
}

export function getQuality(): RenderQuality {
  return quality;
}
