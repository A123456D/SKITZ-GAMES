import type { PointerEvent as ReactPointerEvent } from 'react'

export type PointerSample = {
  clientX: number
  clientY: number
  timeStamp: number
}

/**
 * Every touch sample the OS batched into this frame's event. Phones report
 * touches far faster than they paint, so replaying the batch keeps motion
 * smooth instead of collapsing a curve into one straight jump.
 */
export function coalesced(e: ReactPointerEvent): PointerSample[] {
  const native = e.nativeEvent as PointerEvent & {
    getCoalescedEvents?: () => PointerEvent[]
  }
  const points = native.getCoalescedEvents?.()
  return points && points.length ? points : [native]
}

/**
 * Speed-based gain: precise for slow drags, more reach on flicks. Measured in
 * px/ms so it behaves the same whatever rate the panel samples at.
 */
export function accel(distance: number, elapsedMs: number) {
  const velocity = distance / Math.max(elapsedMs, 1)
  return Math.min(0.85 + velocity * 0.4, 2.1)
}
