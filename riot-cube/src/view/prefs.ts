const HINTS_KEY = "riotcube_hints";

let hintsEnabled = loadHints();

function loadHints(): boolean {
  try {
    const v = localStorage.getItem(HINTS_KEY);
    if (v === "0" || v === "false") return false;
    if (v === "1" || v === "true") return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function getHintsEnabled(): boolean {
  return hintsEnabled;
}

export function setHintsEnabled(on: boolean): void {
  hintsEnabled = on;
  try {
    localStorage.setItem(HINTS_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function toggleHintsEnabled(): boolean {
  setHintsEnabled(!hintsEnabled);
  return hintsEnabled;
}
