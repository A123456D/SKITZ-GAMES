/** Android / mobile immersive play — hide browser + system chrome while matched. */

type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FsEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  requestFullscreen?: (opts?: FullscreenOptions) => Promise<void>;
};

let wantImmersive = false;

function fsElement(): Element | null {
  const d = document as FsDoc;
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export function isImmersive(): boolean {
  return !!fsElement();
}

async function lockPortrait(): Promise<void> {
  try {
    const o = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (o?.lock) await o.lock("portrait");
  } catch {
    /* unsupported / denied — ignore */
  }
}

/** Enter fullscreen immersive UI (must run from a user gesture when possible). */
export async function enterImmersivePlay(): Promise<void> {
  wantImmersive = true;
  document.body.classList.add("immersive-play");
  if (fsElement()) {
    void lockPortrait();
    return;
  }
  const el = document.documentElement as FsEl;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: "hide" });
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    }
  } catch {
    /* gesture missing or denied — keep class; padding fallback still helps */
  }
  void lockPortrait();
}

/** Leave fullscreen when returning to title / end sheet. */
export async function exitImmersivePlay(): Promise<void> {
  wantImmersive = false;
  document.body.classList.remove("immersive-play");
  if (!fsElement()) return;
  const d = document as FsDoc;
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
  } catch {
    /* ignore */
  }
}

/** If the player swiped chrome back mid-match, re-hide on the next tap. */
export function armImmersiveReenter(): void {
  let coolUntil = 0;
  const onPtr = () => {
    if (!wantImmersive || fsElement()) return;
    const now = performance.now();
    if (now < coolUntil) return;
    coolUntil = now + 1200;
    void enterImmersivePlay();
  };
  document.addEventListener("pointerdown", onPtr, { passive: true });
  document.addEventListener("fullscreenchange", () => {
    if (!wantImmersive) document.body.classList.remove("immersive-play");
  });
}
