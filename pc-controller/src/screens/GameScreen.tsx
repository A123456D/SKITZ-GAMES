import { useRef, useState, type PointerEvent } from 'react'
import { haptic } from '../haptics'
import type { GamepadState, Transport } from '../transport'

type Props = {
  transport: Transport
}

const EMPTY: GamepadState = {
  lx: 0,
  ly: 0,
  rx: 0,
  ry: 0,
  buttons: {},
}

export function GameScreen({ transport }: Props) {
  const state = useRef<GamepadState>({ ...EMPTY, buttons: {} })
  const [knobs, setKnobs] = useState({ lx: 0, ly: 0, rx: 0, ry: 0 })
  const [down, setDown] = useState<Record<string, boolean>>({})

  const publish = () => transport.gamepad(state.current)

  const setAxis = (side: 'l' | 'r', x: number, y: number) => {
    if (side === 'l') {
      state.current.lx = x
      state.current.ly = y
      setKnobs((k) => ({ ...k, lx: x, ly: y }))
    } else {
      state.current.rx = x
      state.current.ry = y
      setKnobs((k) => ({ ...k, rx: x, ry: y }))
    }
    publish()
  }

  const bindStick = (side: 'l' | 'r') => {
    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      haptic('selection')
      move(e)
    }
    const move = (e: PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const max = rect.width * 0.32
      let dx = e.clientX - cx
      let dy = e.clientY - cy
      const dist = Math.hypot(dx, dy)
      if (dist > max) {
        dx = (dx / dist) * max
        dy = (dy / dist) * max
      }
      setAxis(side, dx / max, dy / max)
    }
    const end = () => setAxis(side, 0, 0)
    return {
      onPointerDown,
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        if (e.buttons || e.pressure > 0) move(e)
      },
      onPointerUp: end,
      onPointerCancel: end,
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
        <p className="sub">Rotate for a full controller layout.</p>
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
