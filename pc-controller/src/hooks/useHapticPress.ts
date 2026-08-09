import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { haptic, type HapticKind } from '../haptics'

/**
 * Pointer press/release binders with haptic on press.
 */
export function useHapticPress(kind: HapticKind = 'light') {
  const held = useRef<Record<string, boolean>>({})

  const bind = useCallback(
    (id: string, onDown: () => void, onUp?: () => void) => ({
      onPointerDown: (e: ReactPointerEvent) => {
        e.preventDefault()
        if (held.current[id]) return
        held.current[id] = true
        haptic(kind)
        onDown()
      },
      onPointerUp: () => {
        if (!held.current[id]) return
        held.current[id] = false
        onUp?.()
      },
      onPointerLeave: () => {
        if (!held.current[id]) return
        held.current[id] = false
        onUp?.()
      },
      onPointerCancel: () => {
        if (!held.current[id]) return
        held.current[id] = false
        onUp?.()
      },
    }),
    [kind],
  )

  return bind
}

export function tapHaptic(kind: HapticKind = 'selection') {
  haptic(kind)
}
