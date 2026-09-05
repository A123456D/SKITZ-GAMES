import { useRef, useState, type PointerEvent } from 'react'
import { KeyboardPanel } from '../components/KeyboardPanel'
import { TypeBar } from '../components/TypeBar'
import { SensSlider } from '../components/SensSlider'
import { accel, coalesced } from '../pointer'
import { loadInputSettings, saveInputSettings, type InputSettings } from '../settings'
import type { Transport } from '../transport'

type Props = {
  transport: Transport
}

/** Base scroll px → HID wheel units (before user multiplier). */
const SCROLL_BASE = 0.28

/** Consumer actions on the touch screen — works for both PC and TV links. */
const MEDIA_ACTIONS = [
  { action: 'prev', label: '⏮' },
  { action: 'play', label: '▶❚❚' },
  { action: 'next', label: '⏭' },
  { action: 'volDown', label: 'Vol−' },
  { action: 'mute', label: 'Mute' },
  { action: 'volUp', label: 'Vol+' },
] as const
const SWIPE_OPEN = 56
const SWIPE_CLOSE = 48

/** Finger travel under this = tap (phone jitter is often high). */
const TAP_SLOP_PX = 52
/** Max press duration still counted as a tap. */
const TAP_MAX_MS = 420
/** Second tap window for double-click / double-tap-hold drag. */
const DOUBLE_TAP_MS = 420
/** After this hold/move on an armed second tap, start left-button drag. */
const DRAG_ARM_MS = 120
const DRAG_ARM_MOVE = 12

type PadGesture = {
  pointerId: number
  startX: number
  startY: number
  startTime: number
  lastX: number
  lastY: number
  lastT: number
  totalMove: number
  isDoubleHold: boolean
  dragArmed: boolean
  dragging: boolean
}

export function TouchScreen({ transport }: Props) {
  const scrollLastY = useRef<number | null>(null)
  const edgeSwipe = useRef<{ y: number; active: boolean } | null>(null)
  const sheetDrag = useRef<{ y: number; moved: boolean } | null>(null)
  const sheetOffsetRef = useRef(0)
  const scrollTick = useRef(0)
  const sensRef = useRef(loadInputSettings())
  const gesture = useRef<PadGesture | null>(null)
  const secondaryPtr = useRef<number | null>(null)
  const secondaryLastY = useRef(0)
  const secondaryLastX = useRef(0)
  const multiScrollY = useRef(0)
  const multiScrollX = useRef(0)
  const multiMoved = useRef(false)
  const awaitSecondTap = useRef(false)
  const lastTapUp = useRef(0)

  const [active, setActive] = useState(false)
  const [down, setDown] = useState<Record<string, boolean>>({})
  const [keysOpen, setKeysOpen] = useState(false)
  const [sheetOffset, setSheetOffset] = useState(0)
  const [sens, setSens] = useState<InputSettings>(() => sensRef.current)
  const glintRef = useRef<HTMLDivElement | null>(null)

  const updateSens = (patch: Partial<InputSettings>) => {
    const next = { ...sensRef.current, ...patch }
    sensRef.current = next
    setSens(next)
    saveInputSettings(next)
  }

  const setOffset = (value: number) => {
    sheetOffsetRef.current = value
    setSheetOffset(value)
  }

  const clickLeft = () => {
    transport.mouseButton('left', true)
    transport.mouseButton('left', false)
  }

  const clickRight = () => {
    transport.mouseButton('right', true)
    transport.mouseButton('right', false)
  }

  const endDrag = () => {
    const g = gesture.current
    if (g?.dragging) {
      transport.mouseButton('left', false)
    }
  }

  const onPadDown = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fromBottom = rect.bottom - e.clientY

    // Second finger on pad → two-finger scroll / right-click path
    if (gesture.current && secondaryPtr.current == null && e.pointerId !== gesture.current.pointerId) {
      secondaryPtr.current = e.pointerId
      secondaryLastY.current = e.clientY
      secondaryLastX.current = e.clientX
      multiScrollY.current = 0
      multiScrollX.current = 0
      multiMoved.current = false
      gesture.current.dragArmed = false
      if (gesture.current.dragging) {
        transport.mouseButton('left', false)
        gesture.current.dragging = false
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    if (!keysOpen && fromBottom < 56) {
      edgeSwipe.current = { y: e.clientY, active: true }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    const now = performance.now()
    const isDoubleHold = awaitSecondTap.current && now - lastTapUp.current < DOUBLE_TAP_MS
    if (isDoubleHold) awaitSecondTap.current = false

    e.currentTarget.setPointerCapture(e.pointerId)
    gesture.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: now,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: e.timeStamp,
      totalMove: 0,
      isDoubleHold,
      dragArmed: isDoubleHold,
      dragging: false,
    }
    secondaryPtr.current = null
    multiScrollY.current = 0
    multiScrollX.current = 0
    multiMoved.current = false
    setActive(true)
    updateGlint(e)
  }

  const onPadMove = (e: PointerEvent<HTMLDivElement>) => {
    if (edgeSwipe.current?.active) {
      const dy = edgeSwipe.current.y - e.clientY
      setOffset(Math.max(0, Math.min(dy, 220)))
      return
    }

    const g = gesture.current
    if (!g) return

    // Two-finger scroll while secondary is down
    if (secondaryPtr.current != null) {
      if (e.pointerId !== g.pointerId && e.pointerId !== secondaryPtr.current) return
      let moveY = 0
      let moveX = 0
      if (e.pointerId === g.pointerId) {
        moveY = e.clientY - g.lastY
        moveX = e.clientX - g.lastX
        g.lastX = e.clientX
        g.lastY = e.clientY
      } else {
        moveY = e.clientY - secondaryLastY.current
        moveX = e.clientX - secondaryLastX.current
        secondaryLastY.current = e.clientY
        secondaryLastX.current = e.clientX
      }
      multiScrollY.current += moveY
      multiScrollX.current += moveX
      if (Math.abs(moveY) > 2 || Math.abs(moveX) > 2) multiMoved.current = true
      const gain = SCROLL_BASE * sensRef.current.scroll
      const step = 20
      while (Math.abs(multiScrollY.current) >= step) {
        const dir = multiScrollY.current > 0 ? 1 : -1
        transport.mouseScroll(0, dir * step * gain)
        multiScrollY.current -= dir * step
      }
      // Two-finger horizontal = AC Pan (horizontal scroll)
      while (Math.abs(multiScrollX.current) >= step) {
        const dirX = multiScrollX.current > 0 ? 1 : -1
        transport.mouseScroll(dirX * step * gain, 0)
        multiScrollX.current -= dirX * step
      }
      return
    }

    if (e.pointerId !== g.pointerId) return

    const sens = sensRef.current.pointer
    let moveX = 0
    let moveY = 0

    // Android batches touch samples between frames — replaying the coalesced
    // points keeps curves smooth instead of drawing one long straight jump.
    for (const point of coalesced(e)) {
      const dx = point.clientX - g.lastX
      const dy = point.clientY - g.lastY
      const dt = point.timeStamp - g.lastT
      g.lastX = point.clientX
      g.lastY = point.clientY
      g.lastT = point.timeStamp
      const distance = Math.hypot(dx, dy)
      g.totalMove += distance
      const scale = accel(distance, dt) * sens
      moveX += dx * scale
      moveY += dy * scale
    }

    // Double-tap + hold → left-button drag
    if (g.dragArmed && !g.dragging) {
      const heldMs = performance.now() - g.startTime
      if (heldMs >= DRAG_ARM_MS || g.totalMove > DRAG_ARM_MOVE) {
        g.dragging = true
        transport.mouseButton('left', true)
      }
    }

    if (moveX || moveY) transport.mouseMove(moveX, moveY)
    updateGlint(e)
  }

  const onPadUp = (e: PointerEvent<HTMLDivElement>) => {
    if (edgeSwipe.current?.active) {
      const opened = sheetOffsetRef.current >= SWIPE_OPEN
      setKeysOpen(opened)
      setOffset(0)
      edgeSwipe.current = null
      return
    }

    const g = gesture.current
    if (!g) return

    // Secondary finger up — maybe two-finger right-click
    if (secondaryPtr.current != null && e.pointerId === secondaryPtr.current) {
      secondaryPtr.current = null
      if (!multiMoved.current && Math.abs(multiScrollY.current) < 24 && Math.abs(multiScrollX.current) < 24) {
        clickRight()
        awaitSecondTap.current = false
      }
      multiScrollY.current = 0
      return
    }

    if (e.pointerId !== g.pointerId) return

    // Primary up while secondary still down — end multi gesture
    if (secondaryPtr.current != null) {
      secondaryPtr.current = null
      multiScrollY.current = 0
      multiScrollX.current = 0
      gesture.current = null
      setActive(false)
      return
    }

    const upTime = performance.now()
    const heldMs = upTime - g.startTime
    const wasTap = g.totalMove < TAP_SLOP_PX && heldMs < TAP_MAX_MS

    if (g.dragging) {
      transport.mouseButton('left', false)
      awaitSecondTap.current = false
      gesture.current = null
      setActive(false)
      return
    }

    if (g.isDoubleHold && wasTap) {
      // Quick second tap → double-click (first tap already clicked)
      clickLeft()
      awaitSecondTap.current = false
      gesture.current = null
      setActive(false)
      return
    }

    if (wasTap) {
      clickLeft()
      awaitSecondTap.current = true
      lastTapUp.current = upTime
    } else {
      awaitSecondTap.current = false
    }

    gesture.current = null
    setActive(false)
  }

  const onPadCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (edgeSwipe.current?.active) {
      setOffset(0)
      edgeSwipe.current = null
      return
    }
    if (secondaryPtr.current === e.pointerId) {
      secondaryPtr.current = null
      multiScrollY.current = 0
      return
    }
    endDrag()
    awaitSecondTap.current = false
    gesture.current = null
    setActive(false)
  }

  const updateGlint = (e: PointerEvent<HTMLDivElement>) => {
    const el = glintRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    el.style.left = `${x}%`
    el.style.top = `${y}%`
  }

  const onScrollDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    scrollLastY.current = e.clientY
    scrollTick.current = 0
  }

  const onScrollMove = (e: PointerEvent<HTMLDivElement>) => {
    if (scrollLastY.current == null) return
    const dy = e.clientY - scrollLastY.current
    scrollLastY.current = e.clientY
    if (!dy) return
    const gain = SCROLL_BASE * sensRef.current.scroll
    transport.mouseScroll(0, dy * gain)
    scrollTick.current += Math.abs(dy)
    if (scrollTick.current > 48) {
      scrollTick.current = 0
    }
  }

  const onScrollUp = () => {
    scrollLastY.current = null
  }

  const onHandleDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    sheetDrag.current = { y: e.clientY, moved: false }
  }

  const onHandleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!sheetDrag.current) return
    const dy = e.clientY - sheetDrag.current.y
    if (Math.abs(dy) > 4) sheetDrag.current.moved = true
    if (keysOpen) {
      setOffset(Math.max(0, dy))
    } else {
      setOffset(Math.max(0, -dy))
    }
  }

  const onHandleUp = () => {
    if (!sheetDrag.current) return
    const moved = sheetDrag.current.moved
    if (!moved) {
      setKeysOpen((v) => !v)
      setOffset(0)
      sheetDrag.current = null
      return
    }
    if (keysOpen) {
      if (sheetOffsetRef.current >= SWIPE_CLOSE) {
        setKeysOpen(false)
      }
    } else if (sheetOffsetRef.current >= SWIPE_OPEN) {
      setKeysOpen(true)
    }
    setOffset(0)
    sheetDrag.current = null
  }

  const press = (id: string, action: () => void) => {
    setDown((d) => ({ ...d, [id]: true }))
    action()
  }

  const release = (id: string, action: () => void) => {
    setDown((d) => ({ ...d, [id]: false }))
    action()
  }

  const sheetStyle =
    keysOpen && sheetOffset === 0
      ? undefined
      : keysOpen
        ? { transform: `translateY(${sheetOffset}px)` }
        : sheetOffset > 0
          ? { transform: `translateY(calc(100% - ${sheetOffset}px))` }
          : undefined

  return (
    <section className={`screen touch-screen${keysOpen ? ' keys-open' : ''}`}>
      <div className="pad-wrap">
        <div className="sens-panel">
          <SensSlider
            label="Pointer"
            setting="pointer"
            value={sens.pointer}
            onChange={(pointer) => updateSens({ pointer })}
          />
          <SensSlider
            label="Scroll"
            setting="scroll"
            value={sens.scroll}
            onChange={(scroll) => updateSens({ scroll })}
          />
        </div>

        <div className="pad-row">
          <div
            className={`touchpad${active ? ' active' : ''}`}
            onPointerDown={onPadDown}
            onPointerMove={onPadMove}
            onPointerUp={onPadUp}
            onPointerCancel={onPadCancel}
          >
            <div className="cursor-glint" ref={glintRef} style={{ left: '50%', top: '50%' }} />
            <div className="pad-edge-hint" aria-hidden>
              tap · dbl-tap drag · swipe up for keys
            </div>
          </div>

          <div
            className="scroll-rail"
            onPointerDown={onScrollDown}
            onPointerMove={onScrollMove}
            onPointerUp={onScrollUp}
            onPointerCancel={onScrollUp}
            role="slider"
            aria-label="Scroll"
            aria-orientation="vertical"
          >
            <div className="scroll-thumb" />
          </div>
        </div>

        <TypeBar transport={transport} />

        <div className="mouse-actions media-row">
          {MEDIA_ACTIONS.map(({ action, label }) => (
            <button
              key={action}
              type="button"
              className={`action-key media${down[action] ? ' down' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault()
                press(action, () => transport.consumer(action, true))
              }}
              onPointerUp={() => release(action, () => transport.consumer(action, false))}
              onPointerLeave={() => down[action] && release(action, () => transport.consumer(action, false))}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mouse-actions three">
          <button
            type="button"
            className={`action-key${down.left ? ' down' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault()
              press('left', () => transport.mouseButton('left', true))
            }}
            onPointerUp={() => release('left', () => transport.mouseButton('left', false))}
            onPointerLeave={() => down.left && release('left', () => transport.mouseButton('left', false))}
          >
            Left
          </button>
          <button
            type="button"
            className={`action-key${down.middle ? ' down' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault()
              press('middle', () => transport.mouseButton('middle', true))
            }}
            onPointerUp={() => release('middle', () => transport.mouseButton('middle', false))}
            onPointerLeave={() => down.middle && release('middle', () => transport.mouseButton('middle', false))}
          >
            Mid
          </button>
          <button
            type="button"
            className={`action-key${down.right ? ' down' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault()
              press('right', () => transport.mouseButton('right', true))
            }}
            onPointerUp={() => release('right', () => transport.mouseButton('right', false))}
            onPointerLeave={() => down.right && release('right', () => transport.mouseButton('right', false))}
          >
            Right
          </button>
        </div>
      </div>

      <div
        className={`keyboard-sheet${keysOpen ? ' open' : ''}${sheetOffset > 0 ? ' dragging' : ''}`}
        style={sheetStyle}
      >
        <div
          className="sheet-handle"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <span className="sheet-grip" />
        </div>
        <KeyboardPanel transport={transport} />
      </div>
    </section>
  )
}
