import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { SensSlider } from '../components/SensSlider'
import { haptic } from '../haptics'
import { loadInputSettings, saveInputSettings, type InputSettings } from '../settings'
import type { GamepadState, Transport } from '../transport'

type Props = {
  transport: Transport
}

const LOOK_BASE = 36

const EMPTY: GamepadState = {
  lx: 0,
  ly: 0,
  rx: 0,
  ry: 0,
  buttons: {},
}

export function GameScreen({ transport }: Props) {
  const state = useRef<GamepadState>({ ...EMPTY, buttons: {} })
  const stickPtr = useRef<{ l: number | null; r: number | null }>({ l: null, r: null })
  const sensRef = useRef(loadInputSettings())

  const [knobs, setKnobs] = useState({ lx: 0, ly: 0, rx: 0, ry: 0 })
  const [down, setDown] = useState<Record<string, boolean>>({})
  const [sens, setSens] = useState<InputSettings>(() => sensRef.current)

  const updateSens = (patch: Partial<InputSettings>) => {
    const next = { ...sensRef.current, ...patch }
    sensRef.current = next
    setSens(next)
    saveInputSettings(next)
    state.current.lookGain = LOOK_BASE * next.look
  }

  const publish = () => {
    state.current.lookGain = LOOK_BASE * sensRef.current.look
    transport.gamepad(state.current)
  }

  // Continuous right-stick look only. Left stick is edge WASD — do not
  // republish every frame or late packets can leave A/D stuck repeating.
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const s = state.current
      if (s.rx || s.ry) publish()
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      state.current = { ...EMPTY, buttons: {} }
      transport.gamepad(state.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport])

  const setAxis = (side: 'l' | 'r', x: number, y: number) => {
    // Snap near-center to zero so WASD always releases cleanly.
    const nx = Math.abs(x) < 0.12 ? 0 : x
    const ny = Math.abs(y) < 0.12 ? 0 : y
    if (side === 'l') {
      state.current.lx = nx
      state.current.ly = ny
      setKnobs((k) => ({ ...k, lx: nx, ly: ny }))
    } else {
      state.current.rx = nx
      state.current.ry = ny
      setKnobs((k) => ({ ...k, rx: nx, ry: ny }))
    }
    publish()
    // Extra zero after left release — clears any in-flight held frame.
    if (side === 'l' && nx === 0 && ny === 0) {
      window.setTimeout(() => {
        if (state.current.lx === 0 && state.current.ly === 0) publish()
      }, 32)
    }
  }

  const bindStick = (side: 'l' | 'r') => {
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
      setAxis(side, dx / max, dy / max)
    }

    return {
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        stickPtr.current[side] = e.pointerId
        haptic('selection')
        move(e)
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        if (stickPtr.current[side] !== e.pointerId) return
        move(e)
      },
      onPointerUp: (e: PointerEvent<HTMLDivElement>) => {
        if (stickPtr.current[side] !== e.pointerId) return
        stickPtr.current[side] = null
        setAxis(side, 0, 0)
      },
      onPointerCancel: (e: PointerEvent<HTMLDivElement>) => {
        if (stickPtr.current[side] !== e.pointerId) return
        stickPtr.current[side] = null
        setAxis(side, 0, 0)
      },
    }
  }

  const press = (btn: string) => {
    state.current.buttons[btn] = true
    setDown((d) => ({ ...d, [btn]: true }))
    haptic(['A', 'B', 'X', 'Y'].includes(btn) ? 'medium' : 'light')
    publish()
  }

  const release = (btn: string) => {
    state.current.buttons[btn] = false
    setDown((d) => ({ ...d, [btn]: false }))
    publish()
  }

  const bindBtn = (btn: string) => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault()
      press(btn)
    },
    onPointerUp: () => release(btn),
    onPointerLeave: () => down[btn] && release(btn),
    onPointerCancel: () => down[btn] && release(btn),
  })

  const knobStyle = (x: number, y: number) => ({
    transform: `translate(calc(-50% + ${x * 34}%), calc(-50% + ${y * 34}%))`,
  })

  return (
    <section className="screen game-screen">
      <div className="game-intro">
        <h1 className="headline">Gamepad</h1>
        <p className="sub">Left stick WASD · Right stick look. Rotate for full layout.</p>
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
        <div className="game-shoulders game-shoulders-l">
          <button type="button" className={`action-key${down.LT ? ' down' : ''}`} {...bindBtn('LT')}>
            LT
          </button>
          <button type="button" className={`action-key${down.LB ? ' down' : ''}`} {...bindBtn('LB')}>
            LB
          </button>
        </div>

        <div className="game-shoulders game-shoulders-r">
          <button type="button" className={`action-key${down.RB ? ' down' : ''}`} {...bindBtn('RB')}>
            RB
          </button>
          <button type="button" className={`action-key${down.RT ? ' down' : ''}`} {...bindBtn('RT')}>
            RT
          </button>
        </div>

        <div className="game-meta">
          <button type="button" className={`action-key compact${down.Select ? ' down' : ''}`} {...bindBtn('Select')}>
            Select
          </button>
          <button type="button" className={`action-key compact${down.Start ? ' down' : ''}`} {...bindBtn('Start')}>
            Start
          </button>
        </div>

        <div className="game-cluster game-cluster-l">
          <div className="stick" {...bindStick('l')}>
            <div className="stick-knob" style={knobStyle(knobs.lx, knobs.ly)} />
          </div>
        </div>

        <div className="game-cluster game-cluster-r">
          <div className="face-buttons">
            <div className="face-btn empty" />
            <button type="button" className={`face-btn${down.Y ? ' down' : ''}`} {...bindBtn('Y')}>
              Y
            </button>
            <div className="face-btn empty" />
            <button type="button" className={`face-btn${down.X ? ' down' : ''}`} {...bindBtn('X')}>
              X
            </button>
            <div className="face-btn empty" />
            <button type="button" className={`face-btn${down.B ? ' down' : ''}`} {...bindBtn('B')}>
              B
            </button>
            <div className="face-btn empty" />
            <button type="button" className={`face-btn${down.A ? ' down' : ''}`} {...bindBtn('A')}>
              A
            </button>
            <div className="face-btn empty" />
          </div>
        </div>

        <div className="game-cluster game-cluster-rs">
          <div className="stick" {...bindStick('r')}>
            <div className="stick-knob" style={knobStyle(knobs.rx, knobs.ry)} />
          </div>
        </div>
      </div>
    </section>
  )
}
