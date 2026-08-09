import { useRef, useState, type PointerEvent } from 'react'
import { KeyboardPanel } from '../components/KeyboardPanel'
import { SensSlider } from '../components/SensSlider'
import { haptic } from '../haptics'
import { loadInputSettings, saveInputSettings, type InputSettings } from '../settings'
import type { Transport } from '../transport'

type Props = {
  transport: Transport
}

/** Base scroll px → HID wheel units (before user multiplier). */
const SCROLL_BASE = 0.28
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
  const multiScrollY = useRef(0)
  const multiMoved = useRef(false)
  const awaitSecondTap = useRef(false)
  const lastTapUp = useRef(0)

  const [active, setActive] = useState(false)
  const [glint, setGlint] = useState({ x: 50, y: 50 })
  const [down, setDown] = useState<Record<string, boolean>>({})
  const [keysOpen, setKeysOpen] = useState(false)
  const [sheetOffset, setSheetOffset] = useState(0)
  const [sens, setSens] = useState<InputSettings>(() => sensRef.current)

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
    haptic('medium')
  }

  const clickRight = () => {
    transport.mouseButton('right', true)
    transport.mouseButton('right', false)
    haptic('medium')
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
      multiScrollY.current = 0
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
      haptic('selection')
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
      totalMove: 0,
      isDoubleHold,
      dragArmed: isDoubleHold,
      dragging: false,
    }
    secondaryPtr.current = null
    multiScrollY.current = 0
    multiMoved.current = false
    setActive(true)
    haptic('light')
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
      if (e.pointerId === g.pointerId) {
        moveY = e.clientY - g.lastY
        g.lastX = e.clientX
        g.lastY = e.clientY
      } else {
        moveY = e.clientY - secondaryLastY.current
        secondaryLastY.current = e.clientY
      }
      multiScrollY.current += moveY
      if (Math.abs(moveY) > 2) multiMoved.current = true
      const gain = SCROLL_BASE * sensRef.current.scroll
      const step = 20
      while (Math.abs(multiScrollY.current) >= step) {
        const dir = multiScrollY.current > 0 ? 1 : -1
        transport.mouseScroll(0, dir * step * gain)
        multiScrollY.current -= dir * step
      }
      return
    }

    if (e.pointerId !== g.pointerId) return

    const dx = e.clientX - g.lastX
    const dy = e.clientY - g.lastY
    g.lastX = e.clientX
    g.lastY = e.clientY
    g.totalMove += Math.abs(dx) + Math.abs(dy)

    // Double-tap + hold → left-button drag
    if (g.dragArmed && !g.dragging) {
      const heldMs = performance.now() - g.startTime
      if (heldMs >= DRAG_ARM_MS || g.totalMove > DRAG_ARM_MOVE) {
        g.dragging = true
        transport.mouseButton('left', true)
        haptic('medium')
      }
    }

    const sens = sensRef.current.pointer
    if (dx || dy) transport.mouseMove(dx * sens, dy * sens)
    updateGlint(e)
  }

  const onPadUp = (e: PointerEvent<HTMLDivElement>) => {
    if (edgeSwipe.current?.active) {
      const opened = sheetOffsetRef.current >= SWIPE_OPEN
      setKeysOpen(opened)
      if (opened) haptic('medium')
      setOffset(0)
      edgeSwipe.current = null
      return
    }

    const g = gesture.current
    if (!g) return

    // Secondary finger up — maybe two-finger right-click
    if (secondaryPtr.current != null && e.pointerId === secondaryPtr.current) {
      secondaryPtr.current = null
      if (!multiMoved.current && Math.abs(multiScrollY.current) < 24) {
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
    const rect = e.currentTarget.getBoundingClientRect()
    setGlint({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const onScrollDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    scrollLastY.current = e.clientY
    scrollTick.current = 0
    haptic('selection')
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
      haptic('light')
    }
  }

  const onScrollUp = () => {
    scrollLastY.current = null
  }

  const onHandleDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    sheetDrag.current = { y: e.clientY, moved: false }
    haptic('selection')
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
      setKeysOpen((v) => {
        haptic(v ? 'light' : 'medium')
        return !v
      })
      setOffset(0)
      sheetDrag.current = null
      return
    }
    if (keysOpen) {
      if (sheetOffsetRef.current >= SWIPE_CLOSE) {
        setKeysOpen(false)
        haptic('light')
      }
    } else if (sheetOffsetRef.current >= SWIPE_OPEN) {
      setKeysOpen(true)
      haptic('medium')
    }
    setOffset(0)
    sheetDrag.current = null
  }

  const press = (id: string, action: () => void) => {
    setDown((d) => ({ ...d, [id]: true }))
    haptic('medium')
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
    <section className="screen touch-screen">
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
            <div className="cursor-glint" style={{ left: `${glint.x}%`, top: `${glint.y}%` }} />
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

        <div className="mouse-actions two">
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
