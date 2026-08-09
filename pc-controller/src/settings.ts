const KEY = 'pc-controller.input'

export type InputSettings = {
  /** Touchpad pointer multiplier (1 = 1:1 screen px) */
  pointer: number
  /** Scroll rail multiplier */
  scroll: number
  /** Right-stick look multiplier */
  look: number
}

export const INPUT_DEFAULTS: InputSettings = {
  pointer: 3.2,
  scroll: 1.8,
  look: 1.6,
}

export const INPUT_RANGES = {
  pointer: { min: 1, max: 6, step: 0.1 },
  scroll: { min: 0.6, max: 4, step: 0.1 },
  look: { min: 0.5, max: 3.5, step: 0.1 },
} as const

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function loadInputSettings(): InputSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...INPUT_DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<InputSettings>
    return {
      pointer: clamp(Number(parsed.pointer) || INPUT_DEFAULTS.pointer, INPUT_RANGES.pointer.min, INPUT_RANGES.pointer.max),
      scroll: clamp(Number(parsed.scroll) || INPUT_DEFAULTS.scroll, INPUT_RANGES.scroll.min, INPUT_RANGES.scroll.max),
      look: clamp(Number(parsed.look) || INPUT_DEFAULTS.look, INPUT_RANGES.look.min, INPUT_RANGES.look.max),
    }
  } catch {
    return { ...INPUT_DEFAULTS }
  }
}

export function saveInputSettings(next: InputSettings) {
  localStorage.setItem(KEY, JSON.stringify(next))
}
