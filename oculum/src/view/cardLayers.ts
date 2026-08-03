/** Premium cards with true layered art (bg / subject / fx parallax). */

export const LAYERED_CARD_IDS = [
  "iris_heliograph",
  "verdant_cataract",
  "split_gaze_seraph",
] as const;

export type LayeredCardId = (typeof LAYERED_CARD_IDS)[number];

export function hasArtLayers(cardId: string): boolean {
  return (LAYERED_CARD_IDS as readonly string[]).includes(cardId);
}

export function artLayerUrls(cardId: string): { bg: string; subject: string; fx: string } {
  const base = `./assets/cards/layers/${cardId}`;
  return {
    bg: `${base}/bg.jpg`,
    subject: `${base}/subject.png`,
    fx: `${base}/fx.png`,
  };
}

/** Build/replace mid parallax layers inside a .foil-stack. Keeps sheen/glare on top. */
export function setStackArtLayers(
  stack: HTMLElement,
  cardId: string | null,
  opts?: { alt?: string },
): void {
  stack.querySelectorAll(".art-layer").forEach((n) => n.remove());
  stack.classList.toggle("is-layered", !!cardId && hasArtLayers(cardId));

  const face = stack.querySelector(".foil-face") as HTMLElement | null;
  if (!cardId || !hasArtLayers(cardId)) {
    if (face) face.hidden = false;
    return;
  }

  // Flat face stays as fallback under layers (hidden when layered)
  if (face) face.hidden = true;

  const urls = artLayerUrls(cardId);
  const layers: { cls: string; src: string; z: string }[] = [
    { cls: "art-layer art-layer--bg", src: urls.bg, z: "0" },
    { cls: "art-layer art-layer--subject", src: urls.subject, z: "1" },
    { cls: "art-layer art-layer--fx", src: urls.fx, z: "2" },
  ];

  const sheen = stack.querySelector(".foil-sheen");
  for (const layer of layers) {
    const img = document.createElement("img");
    img.className = layer.cls;
    img.src = layer.src;
    img.alt = "";
    img.draggable = false;
    img.style.zIndex = layer.z;
    img.addEventListener(
      "error",
      () => {
        // If layers missing, fall back to flat face
        stack.classList.remove("is-layered");
        stack.querySelectorAll(".art-layer").forEach((n) => n.remove());
        if (face) face.hidden = false;
      },
      { once: true },
    );
    if (sheen) stack.insertBefore(img, sheen);
    else stack.appendChild(img);
  }

  if (face && opts?.alt) face.setAttribute("alt", opts.alt);
}
