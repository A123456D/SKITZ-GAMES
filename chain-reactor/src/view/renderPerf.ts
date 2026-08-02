import { getPrefs, setPref } from "./prefs";

/** Coarse pointer / narrow viewport ≈ phone or tablet in portrait. */
export function isMobileClient(): boolean {
  if (typeof window === "undefined") return false;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth > 0 && window.innerWidth < 900;
  return coarse || narrow;
}

/** Extra CSS/backing-store shrink after auto-perf kicks in (1 or ~0.88). */
let renderScale = 1;
/** Hard ceiling on devicePixelRatio (mobile starts at 1). */
let dprCap = isMobileClient() ? 1 : 2;
let autoPerfApplied = false;

export function getRenderScale(): number {
  return renderScale;
}

export function getDprCap(): number {
  return dprCap;
}

/** Canvas shadows are extremely expensive on Canvas 2D — off when reduced FX. */
export function useGlow(): boolean {
  return !getPrefs().reducedFx;
}

export function glowBlur(amount: number): number {
  return useGlow() ? amount : 0;
}

/**
 * Effective device pixel ratio for the backing store.
 * Mobile: ≤1 (or 1.25 if prefs allow full FX and not auto-capped).
 * Desktop: ≤2.
 */
export function effectiveDpr(): number {
  const raw = window.devicePixelRatio || 1;
  const mobile = isMobileClient();
  let cap = dprCap;
  if (mobile && !getPrefs().reducedFx && dprCap >= 1) {
    cap = Math.min(cap, 1.25);
  } else if (mobile) {
    cap = Math.min(cap, 1);
  }
  return Math.min(raw, cap) * renderScale;
}

/** Call once at boot when prefs were never saved — default reduced FX on phones. */
export function applyMobilePrefDefaults(): void {
  try {
    if (localStorage.getItem("chain-reactor-prefs-v1")) return;
  } catch {
    return;
  }
  if (isMobileClient()) {
    setPref("reducedFx", true);
  }
}

/**
 * Rolling FPS sampler. After sustained low FPS, force reduced FX and lower
 * resolution so the next frames (and next session) stay light.
 */
export class FpsSampler {
  private samples: number[] = [];
  private lowMs = 0;
  private lastNotify = 0;

  /** @returns true if auto-perf just engaged (caller should resize). */
  tick(dt: number): boolean {
    if (dt <= 0 || dt > 0.5) return false;
    const fps = 1 / dt;
    this.samples.push(fps);
    if (this.samples.length > 45) this.samples.shift();
    if (this.samples.length < 20) return false;

    const avg =
      this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    if (avg < 40) this.lowMs += dt * 1000;
    else this.lowMs = Math.max(0, this.lowMs - dt * 500);

    if (autoPerfApplied || this.lowMs < 2000) return false;
    if (performance.now() - this.lastNotify < 4000) return false;

    autoPerfApplied = true;
    this.lastNotify = performance.now();
    let changed = false;
    if (!getPrefs().reducedFx) {
      setPref("reducedFx", true);
      changed = true;
    }
    if (dprCap > 1) {
      dprCap = 1;
      changed = true;
    }
    if (renderScale > 0.88) {
      renderScale = 0.88;
      changed = true;
    }
    clearRenderCaches();
    return changed;
  }
}

/** Shared invalidate hook for backdrop / card bitmap caches. */
type CacheClear = () => void;
const clearHooks: CacheClear[] = [];

export function onRenderCacheClear(fn: CacheClear): void {
  clearHooks.push(fn);
}

export function clearRenderCaches(): void {
  for (const fn of clearHooks) fn();
}
