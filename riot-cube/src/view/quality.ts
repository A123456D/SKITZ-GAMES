export type RenderQuality = {
  dprCap: number;
  stickerShadows: boolean;
  hoverAnim: boolean;
  /** Faces shallower than this only draw paper (no stickers). */
  minFaceNzForStickers: number;
};

let quality: RenderQuality = {
  dprCap: 2,
  stickerShadows: true,
  hoverAnim: true,
  minFaceNzForStickers: 0.05,
};

export function detectQuality(): RenderQuality {
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;
  const narrow =
    typeof window !== "undefined" && window.innerWidth < 820;
  const saveData = Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData,
  );
  const cores = navigator.hardwareConcurrency ?? 8;
  const lowEnd = coarse || narrow || saveData || cores <= 4;

  quality = lowEnd
    ? {
        dprCap: 1.25,
        stickerShadows: false,
        hoverAnim: false,
        minFaceNzForStickers: 0.42,
      }
    : {
        dprCap: 2,
        stickerShadows: true,
        hoverAnim: true,
        minFaceNzForStickers: 0.05,
      };
  return quality;
}

export function getQuality(): RenderQuality {
  return quality;
}
