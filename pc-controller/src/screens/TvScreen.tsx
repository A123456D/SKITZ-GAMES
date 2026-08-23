import { useRef, useState, type PointerEvent } from 'react'
import type { Transport } from '../transport'

type Props = {
  transport: Transport
}

type Panel = 'remote' | 'num' | 'abc'

const SYSTEM = [
  { label: '⌂', action: 'home' },
  { label: '⌫', action: 'back' },
  { label: '☰', action: 'menu' },
  { label: '⏻', action: 'power' },
]

const MEDIA = [
  { label: '⏮', action: 'prev' },
  { label: '⏯', action: 'play' },
  { label: '⏭', action: 'next' },
  { label: '🔇', action: 'mute' },
]

const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', '⌫'] as const

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function TvScreen({ transport }: Props) {
  const [panel, setPanel] = useState<Panel>('remote')
  const activePresses = useRef(new Set<string>())

  const pressConsumer = (action: string) => {
    const id = `consumer:${action}`
    if (activePresses.current.has(id)) return
    activePresses.current.add(id)
    transport.consumer(action, true)
  }

  const releaseConsumer = (action: string) => {
    const id = `consumer:${action}`
    if (!activePresses.current.delete(id)) return
    transport.consumer(action, false)
  }

  const pressKey = (code: string) => {
    const id = `key:${code}`
    if (activePresses.current.has(id)) return
    activePresses.current.add(id)
    transport.key(code, true)
  }

  const releaseKey = (code: string) => {
    const id = `key:${code}`
    if (!activePresses.current.delete(id)) return
    transport.key(code, false)
  }

  const bindConsumer = (action: string) => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      e.currentTarget.classList.add('down')
      pressConsumer(action)
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.classList.remove('down')
      releaseConsumer(action)
    },
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.classList.remove('down')
      releaseConsumer(action)
    },
    onLostPointerCapture: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.classList.remove('down')
      releaseConsumer(action)
    },
  })

  const bindKey = (code: string) => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      e.currentTarget.classList.add('down')
      pressKey(code)
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.classList.remove('down')
      releaseKey(code)
    },
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.classList.remove('down')
      releaseKey(code)
    },
    onLostPointerCapture: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.classList.remove('down')
      releaseKey(code)
    },
  })

  const numberCode = (n: string) => {
    if (n === '⌫') return 'Backspace'
    if (n === '-') return 'Minus'
    return `Digit${n}`
  }

  return (
    <section className="screen tv-screen">
      <div className="tv-panel-tabs">
        {(
          [
            { id: 'remote', label: 'Remote' },
            { id: 'num', label: '123' },
            { id: 'abc', label: 'ABC' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tv-panel-tab${panel === tab.id ? ' active' : ''}`}
            onClick={() => {
              setPanel(tab.id)
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {panel === 'remote' && (
        <div className="tv-layout">
          <div className="media-row">
            {SYSTEM.map((item) => (
              <button
                key={item.action}
                type="button"
                className="action-key"
                {...bindConsumer(item.action)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="dpad">
            <div className="dpad-btn empty" />
            <button type="button" className="dpad-btn" {...bindConsumer('up')}>
              ▲
            </button>
            <div className="dpad-btn empty" />
            <button type="button" className="dpad-btn" {...bindConsumer('left')}>
              ◀
            </button>
            <button type="button" className="dpad-btn ok" {...bindConsumer('ok')}>
              OK
            </button>
            <button type="button" className="dpad-btn" {...bindConsumer('right')}>
              ▶
            </button>
            <div className="dpad-btn empty" />
            <button type="button" className="dpad-btn" {...bindConsumer('down')}>
              ▼
            </button>
            <div className="dpad-btn empty" />
          </div>

          <div className="media-row">
            <button
              type="button"
              className="action-key"
              {...bindConsumer('volDown')}
            >
              Vol −
            </button>
            {MEDIA.slice(0, 2).map((item) => (
              <button
                key={item.action}
                type="button"
                className="action-key"
                {...bindConsumer(item.action)}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className="action-key"
              {...bindConsumer('volUp')}
            >
              Vol +
            </button>
          </div>

          <div className="media-row">
            {MEDIA.slice(2).map((item) => (
              <button
                key={item.action}
                type="button"
                className="action-key"
                {...bindConsumer(item.action)}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className="action-key"
              {...bindConsumer('info')}
            >
              Info
            </button>
            <button
              type="button"
              className="action-key"
              {...bindConsumer('input')}
            >
              Input
            </button>
          </div>
        </div>
      )}

      {panel === 'num' && (
        <div className="tv-pad">
          <p className="hint">Channel / PIN / search digits</p>
          <div className="tv-num-grid">
            {NUMBERS.map((n) => {
              const code = numberCode(n)
              return (
                <button
                  key={n}
                  type="button"
                  className="tv-pad-key"
                  {...bindKey(code)}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {panel === 'abc' && (
        <div className="tv-pad">
          <p className="hint">On-screen search letters</p>
          <div className="tv-abc-grid">
            {LETTERS.map((letter) => {
              const code = `Key${letter}`
              return (
                <button
                  key={letter}
                  type="button"
                  className="tv-pad-key"
                  {...bindKey(code)}
                >
                  {letter}
                </button>
              )
            })}
          </div>
          <div className="tv-abc-extras">
            <button
              type="button"
              className="tv-pad-key wide"
              {...bindKey('Space')}
            >
              Space
            </button>
            <button
              type="button"
              className="tv-pad-key"
              {...bindKey('Backspace')}
            >
              ⌫
            </button>
            <button
              type="button"
              className="tv-pad-key"
              {...bindKey('Enter')}
            >
              ⏎
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
