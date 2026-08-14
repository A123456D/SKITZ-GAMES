import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { SensSlider } from '../components/SensSlider'
import { coalesced } from '../pointer'
import { loadInputSettings, saveInputSettings, type InputSettings } from '../settings'
import type { GamepadState, Transport } from '../transport'

type Props = {
  transport: Transport
}

const LOOK_BASE = 1.35

const EMPTY: GamepadState = {
  lx: 0,
  ly: 0,
  rx: 0,
  ry: 0,
  buttons: {},
}

/** Four deliberate rows; the left stick already covers WASD / arrows. */
const MID_KEYS: { label: string; code: string; wide?: boolean }[] = [
  { label: 'Q', code: 'KeyQ' },
  { label: 'E', code: 'KeyE' },
  { label: 'R', code: 'KeyR' },
  { label: 'C', code: 'KeyC' },
  { label: 'Z', code: 'KeyZ' },
  { label: 'X', code: 'KeyX' },
  { label: 'V', code: 'KeyV' },
  { label: 'F', code: 'KeyF' },
  { label: '1', code: 'Digit1' },
  { label: '2', code: 'Digit2' },
  { label: '3', code: 'Digit3' },
  { label: '4', code: 'Digit4' },
  { label: 'Space', code: 'Space', wide: true },
  { label: 'Ctrl', code: 'ControlLeft' },
  { label: 'Shift', code: 'ShiftLeft' },
]

export function GameScreen({ transport }: Props) {
  const state = useRef<GamepadState>({ ...EMPTY, buttons: {} })
  const stickPtr = useRef<number | null>(null)
  const stickKnob = useRef<HTMLDivElement | null>(null)
  const padPtr = useRef<number | null>(null)
  const padLast = useRef<{ x: number; y: number } | null>(null)
  const btnPtr = useRef<Record<string, number | null>>({})
  const mouseBtnPtr = useRef<Record<string, number | null>>({})
  const downRef = useRef<Record<string, boolean>>({})
  const mouseDownRef = useRef<Record<string, boolean>>({})
  const sensRef = useRef(loadInputSettings())

  const [down, setDown] = useState<Record<string, boolean>>({})
  const [padActive, setPadActive] = useState(false)
  const [sens, setSens] = useState<InputSettings>(() => sensRef.current)

  const publishStick = () => {
    transport.gamepad({
      ...state.current,
      rx: 0,
      ry: 0,
      buttons: {},
      lookGain: 0,
    })
  }

  const releaseAllInputs = () => {
    stickPtr.current = null
    padPtr.current = null
    padLast.current = null
    btnPtr.current = {}
    mouseBtnPtr.current = {}
    for (const code of Object.keys(downRef.current)) {
      if (downRef.current[code]) transport.key(code, false)
    }
    for (const button of Object.keys(mouseDownRef.current)) {
      if (mouseDownRef.current[button]) transport.mouseButton(button as 'left' | 'right', false)
    }
    downRef.current = {}
    mouseDownRef.current = {}
    state.current = { ...EMPTY, buttons: {} }
    moveStickKnob(0, 0)
    setDown({})
    setPadActive(false)
    publishStick()
    window.setTimeout(() => publishStick(), 32)
  }

  const updateSens = (patch: Partial<InputSettings>) => {
    const next = { ...sensRef.current, ...patch }
    sensRef.current = next
    setSens(next)
    saveInputSettings(next)
  }

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') releaseAllInputs()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', releaseAllInputs)
    window.addEventListener('blur', releaseAllInputs)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', releaseAllInputs)
      window.removeEventListener('blur', releaseAllInputs)
      releaseAllInputs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport])

  const setLeftStick = (x: number, y: number) => {
    const nx = Math.abs(x) < 0.12 ? 0 : x
    const ny = Math.abs(y) < 0.12 ? 0 : y
    state.current.lx = nx
    state.current.ly = ny
    moveStickKnob(nx, ny)
    publishStick()
    if (nx === 0 && ny === 0) {
      window.setTimeout(() => {
        if (state.current.lx === 0 && state.current.ly === 0) publishStick()
      }, 32)
    }
  }

  const bindLeftStick = () => {
    const move = (e: PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const max = rect.width * 0.38
      let dx = e.clientX - cx
      let dy = e.clientY - cy
      const dist = Math.hypot(dx, dy)
      if (dist > max) {
        dx = (dx / dist) * max
        dy = (dy / dist) * max
      }
      setLeftStick(dx / max, dy / max)
    }

    return {
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        stickPtr.current = e.pointerId
        move(e)
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        if (stickPtr.current !== e.pointerId) return
        move(e)
      },
      onPointerUp: (e: PointerEvent<HTMLDivElement>) => {
        if (stickPtr.current !== e.pointerId) return
        stickPtr.current = null
        setLeftStick(0, 0)
      },
      onPointerCancel: (e: PointerEvent<HTMLDivElement>) => {
        if (stickPtr.current !== e.pointerId) return
        stickPtr.current = null
        setLeftStick(0, 0)
      },
      onLostPointerCapture: (e: PointerEvent<HTMLDivElement>) => {
        if (stickPtr.current !== e.pointerId) return
        stickPtr.current = null
        setLeftStick(0, 0)
      },
    }
  }

  const bindLookPad = () => {
    const gain = () => LOOK_BASE * sensRef.current.look

    return {
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        padPtr.current = e.pointerId
        padLast.current = { x: e.clientX, y: e.clientY }
        setPadActive(true)
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        const last = padLast.current
        if (padPtr.current !== e.pointerId || !last) return
        const g = gain()
        let moveX = 0
        let moveY = 0
        for (const point of coalesced(e)) {
          moveX += (point.clientX - last.x) * g
          moveY += (point.clientY - last.y) * g
          last.x = point.clientX
          last.y = point.clientY
        }
        if (moveX || moveY) transport.mouseMove(moveX, moveY)
      },
      onPointerUp: (e: PointerEvent<HTMLDivElement>) => {
        if (padPtr.current !== e.pointerId) return
        padPtr.current = null
        padLast.current = null
        setPadActive(false)
      },
      onPointerCancel: (e: PointerEvent<HTMLDivElement>) => {
        if (padPtr.current !== e.pointerId) return
        padPtr.current = null
        padLast.current = null
        setPadActive(false)
      },
      onLostPointerCapture: (e: PointerEvent<HTMLDivElement>) => {
        if (padPtr.current !== e.pointerId) return
        padPtr.current = null
        padLast.current = null
        setPadActive(false)
      },
    }
  }

  const press = (code: string) => {
    downRef.current[code] = true
    transport.key(code, true)
    setDown((d) => ({ ...d, [code]: true }))
  }

  const release = (code: string) => {
    if (!downRef.current[code]) return
    downRef.current[code] = false
    btnPtr.current[code] = null
    transport.key(code, false)
    setDown((d) => ({ ...d, [code]: false }))
    window.setTimeout(() => {
      if (!downRef.current[code]) transport.key(code, false)
    }, 32)
  }

  const bindKey = (code: string) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      btnPtr.current[code] = e.pointerId
      press(code)
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      if (btnPtr.current[code] != null && btnPtr.current[code] !== e.pointerId) return
      release(code)
    },
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => {
      if (btnPtr.current[code] != null && btnPtr.current[code] !== e.pointerId) return
      release(code)
    },
    onLostPointerCapture: (e: PointerEvent<HTMLButtonElement>) => {
      if (btnPtr.current[code] != null && btnPtr.current[code] !== e.pointerId) return
      release(code)
    },
  })

  const releaseMouse = (button: 'left' | 'right') => {
    if (!mouseDownRef.current[button]) return
    mouseDownRef.current[button] = false
    mouseBtnPtr.current[button] = null
    transport.mouseButton(button, false)
    setDown((d) => ({ ...d, [`mouse-${button}`]: false }))
  }

  const bindMouseButton = (button: 'left' | 'right') => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      mouseBtnPtr.current[button] = e.pointerId
      mouseDownRef.current[button] = true
      transport.mouseButton(button, true)
      setDown((d) => ({ ...d, [`mouse-${button}`]: true }))
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      if (mouseBtnPtr.current[button] !== e.pointerId) return
      releaseMouse(button)
    },
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => {
      if (mouseBtnPtr.current[button] !== e.pointerId) return
      releaseMouse(button)
    },
    onLostPointerCapture: (e: PointerEvent<HTMLButtonElement>) => {
      if (mouseBtnPtr.current[button] !== e.pointerId) return
      releaseMouse(button)
    },
  })

  const moveStickKnob = (x: number, y: number) => {
    if (!stickKnob.current) return
    stickKnob.current.style.transform = `translate(calc(-50% + ${x * 34}%), calc(-50% + ${y * 34}%))`
  }

  return (
    <section className="screen game-screen">
      <div className="game-intro">
        <h1 className="headline">Gamepad</h1>
        <p className="sub">Left stick move · Keys · Right pad look. Rotate for full layout.</p>
        <div className="sens-panel compact">
          <SensSlider
            label="Look"
            setting="look"
            value={sens.look}
            onChange={(look) => updateSens({ look })}
          />
        </div>
      </div>

      <div className="game-layout">
        <div className="game-cluster game-cluster-l">
          <div className="stick" {...bindLeftStick()}>
            <div ref={stickKnob} className="stick-knob" />
          </div>
        </div>

        <div className="game-cluster game-cluster-keys">
          <div className="game-key-grid" role="group" aria-label="Game keys">
            {MID_KEYS.map(({ label, code, wide }) => (
              <button
                key={code}
                type="button"
                className={`game-key${wide ? ' wide' : ''}${down[code] ? ' down' : ''}`}
                {...bindKey(code)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="game-cluster game-cluster-pad">
          <div className="look-controls">
            <div
              className={`look-pad${padActive ? ' active' : ''}`}
              role="application"
              aria-label="Look touchpad"
              {...bindLookPad()}
            >
              <span className="look-pad__label">LOOK</span>
            </div>
            <div className="look-mouse-buttons" role="group" aria-label="Mouse buttons">
              <button
                type="button"
                className={`look-mouse-button${down['mouse-left'] ? ' down' : ''}`}
                {...bindMouseButton('left')}
              >
                Left
              </button>
              <button
                type="button"
                className={`look-mouse-button${down['mouse-right'] ? ' down' : ''}`}
                {...bindMouseButton('right')}
              >
                Right
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
