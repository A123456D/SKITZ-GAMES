export type RenderQuality = {
  dprCap: number;
  stickerShadows: boolean;
  hoverAnim: boolean;
};

let quality: RenderQuality = {
  dprCap: 2,
  stickerShadows: true,
  hoverAnim: true,
};

export function detectQuality(): RenderQuality {
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;
  const saveData = Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData,
  );
  // Only treat real touch / data-saver devices as low-end — not narrow
  // desktop windows or 4-core laptops (that broke orbit + side stickers).
  const lowEnd = coarse || saveData;

  quality = lowEnd
    ? {
        dprCap: 1.5,
        stickerShadows: false,
        // Keep bob/wobble on touch devices — cheap vs shadows/DPR.
        hoverAnim: true,
      }
    : {
        dprCap: 2,
        stickerShadows: true,
        hoverAnim: true,
      };
  return quality;
}

export function getQuality(): RenderQuality {
  return quality;
}
