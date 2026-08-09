import { useRef, useState, type PointerEvent } from 'react'
import { KeyboardPanel } from '../components/KeyboardPanel'
import { haptic } from '../haptics'
import type { Transport } from '../transport'

type Props = {
  transport: Transport
}

const SCROLL_GAIN = 0.12
const SWIPE_OPEN = 56
const SWIPE_CLOSE = 48

export function TouchScreen({ transport }: Props) {
  const last = useRef<{ x: number; y: number } | null>(null)
  const scrollLastY = useRef<number | null>(null)
  const edgeSwipe = useRef<{ y: number; active: boolean } | null>(null)
  const sheetDrag = useRef<{ y: number; moved: boolean } | null>(null)
  const sheetOffsetRef = useRef(0)
  const scrollTick = useRef(0)

  const [active, setActive] = useState(false)
  const [glint, setGlint] = useState({ x: 50, y: 50 })
  const [down, setDown] = useState<Record<string, boolean>>({})
  const [keysOpen, setKeysOpen] = useState(false)
  const [sheetOffset, setSheetOffset] = useState(0)

  const setOffset = (value: number) => {
    sheetOffsetRef.current = value
    setSheetOffset(value)
  }

  const onPadDown = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fromBottom = rect.bottom - e.clientY

    if (!keysOpen && fromBottom < 56) {
      edgeSwipe.current = { y: e.clientY, active: true }
      e.currentTarget.setPointerCapture(e.pointerId)
      haptic('selection')
      return
    }

    e.currentTarget.setPointerCapture(e.pointerId)
    last.current = { x: e.clientX, y: e.clientY }
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

    if (!last.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    if (dx || dy) transport.mouseMove(dx, dy)
    updateGlint(e)
  }

  const onPadUp = () => {
    if (edgeSwipe.current?.active) {
      const opened = sheetOffsetRef.current >= SWIPE_OPEN
      setKeysOpen(opened)
      if (opened) haptic('medium')
      setOffset(0)
      edgeSwipe.current = null
      return
    }
    last.current = null
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
    if (dy) {
      transport.mouseScroll(0, dy * SCROLL_GAIN)
      scrollTick.current += Math.abs(dy)
      if (scrollTick.current > 28) {
        scrollTick.current = 0
        haptic('light')
      }
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
        <div className="pad-row">
          <div
            className={`touchpad${active ? ' active' : ''}`}
            onPointerDown={onPadDown}
            onPointerMove={onPadMove}
            onPointerUp={onPadUp}
            onPointerCancel={onPadUp}
          >
            <div className="cursor-glint" style={{ left: `${glint.x}%`, top: `${glint.y}%` }} />
            <div className="pad-edge-hint" aria-hidden>
              swipe up for keys
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
