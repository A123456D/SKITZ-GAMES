let prepared: HTMLCanvasElement | null = null;
let loadPromise: Promise<void> | null = null;

/** Soften baked photo lighting so folds read as paper grain, not harsh shadows. */
function preparePaperCanvas(src: HTMLImageElement): HTMLCanvasElement {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;
  g.drawImage(src, 0, 0, size, size);

  const image = g.getImageData(0, 0, size, size);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    // Lift shadows, compress contrast toward cream paper
    const r = d[i]! / 255;
    const gr = d[i + 1]! / 255;
    const b = d[i + 2]! / 255;
    const lift = (x: number) => 0.78 + Math.pow(x, 0.65) * 0.22;
    d[i] = Math.round(lift(r) * 255);
    d[i + 1] = Math.round(lift(gr) * 248);
    d[i + 2] = Math.round(lift(b) * 230);
  }
  g.putImageData(image, 0, 0);
  return c;
}

export function loadPaperTexture(): Promise<void> {
  if (prepared) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve) => {
    const next = new Image();
    next.onload = () => {
      prepared = preparePaperCanvas(next);
      resolve();
    };
    next.onerror = () => resolve();
    next.src = "./textures/paper_crumple.jpg";
  });
  return loadPromise;
}

export function paperTextureImage(): CanvasImageSource | null {
  return prepared;
}
