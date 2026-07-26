/** One shared AudioContext for SFX (and browser music). Dual contexts duck each other on Android. */

let shared: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (
    typeof AudioContext === "undefined" &&
    typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ===
      "undefined"
  ) {
    return null;
  }
  if (!shared) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    shared = new Ctor();
  }
  return shared;
}

export function resumeSharedAudioContext(): Promise<void> {
  const c = getSharedAudioContext();
  if (!c || c.state !== "suspended") return Promise.resolve();
  return c.resume().then(() => undefined).catch(() => undefined);
}

/** Installed PWA / TWA — MediaElementSource + GainNode volume is unreliable here. */
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  } catch {
    /* ignore */
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return !!nav.standalone;
}
