export type DockButtonId =
  | "orbit-up"
  | "orbit-down"
  | "orbit-left"
  | "orbit-right"
  | "select";

const FILES: Record<DockButtonId, string> = {
  "orbit-up": "./ui/btn-orbit-up.png",
  "orbit-down": "./ui/btn-orbit-down.png",
  "orbit-left": "./ui/btn-orbit-left.png",
  "orbit-right": "./ui/btn-orbit-right.png",
  select: "./ui/btn-select.png",
};

const cache = new Map<DockButtonId, HTMLImageElement>();
let loaded = false;
let loadPromise: Promise<void> | null = null;

export function loadUiButtons(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all(
    (Object.keys(FILES) as DockButtonId[]).map(
      (id) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            cache.set(id, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = FILES[id];
        }),
    ),
  ).then(() => {
    loaded = true;
  });
  return loadPromise;
}

export function uiButtonImage(id: DockButtonId): HTMLImageElement | null {
  return cache.get(id) ?? null;
}
