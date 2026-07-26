let img: HTMLImageElement | null = null;
let loadPromise: Promise<void> | null = null;

export function loadPaperTexture(): Promise<void> {
  if (img?.complete && img.naturalWidth > 0) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve) => {
    const next = new Image();
    next.onload = () => {
      img = next;
      resolve();
    };
    next.onerror = () => resolve();
    next.src = "./textures/paper_crumple.jpg";
  });
  return loadPromise;
}

export function paperTextureImage(): HTMLImageElement | null {
  return img?.complete && img.naturalWidth > 0 ? img : null;
}
