import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

export type HapticKind = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning'

let lastAt = 0
const MIN_GAP_MS = 12

/**
 * Fire haptic feedback. Native uses Capacitor Haptics;
 * web/demo falls back to navigator.vibrate when available.
 */
export function haptic(kind: HapticKind = 'light') {
  const now = performance.now()
  if (now - lastAt < MIN_GAP_MS) return
  lastAt = now

  if (Capacitor.isNativePlatform()) {
    void nativeHaptic(kind)
    return
  }

  webVibrate(kind)
}

async function nativeHaptic(kind: HapticKind) {
  try {
    switch (kind) {
      case 'selection':
        await Haptics.selectionStart()
        await Haptics.selectionEnd()
        return
      case 'success':
        await Haptics.notification({ type: NotificationType.Success })
        return
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning })
        return
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium })
        return
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy })
        return
      default:
        await Haptics.impact({ style: ImpactStyle.Light })
    }
  } catch {
    webVibrate(kind)
  }
}

function webVibrate(kind: HapticKind) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  const pattern =
    kind === 'heavy'
      ? 28
      : kind === 'medium' || kind === 'success'
        ? 18
        : kind === 'warning'
          ? [12, 40, 12]
          : kind === 'selection'
            ? 8
            : 10
  navigator.vibrate(pattern)
}
