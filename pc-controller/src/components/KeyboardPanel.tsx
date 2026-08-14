import { useRef, useState } from 'react'
import type { Transport } from '../transport'

type Layout = 'letters' | 'numbers' | 'symbols'

type KeyDef =
  | { label: string; code: string; shift?: boolean; className?: string }
  | { label: string; layout: Layout; className?: string }

const TOP: KeyDef[] = [
  { label: 'Esc', code: 'Escape', className: 'wide' },
  { label: 'Tab', code: 'Tab', className: 'wide' },
  { label: '⌫', code: 'Backspace', className: 'wide' },
  { label: '⏎', code: 'Enter', className: 'wide' },
]

/** US QWERTY — `shift: true` means hold Left Shift while the key is down. */
const LETTERS: KeyDef[][] = [
  TOP,
  'QWERTYUIOP'.split('').map((c) => ({ label: c, code: `Key${c}` })),
  'ASDFGHJKL'.split('').map((c) => ({ label: c, code: `Key${c}` })),
  [
    { label: '⇧', code: 'ShiftLeft', className: 'wide' },
    ...'ZXCVBNM'.split('').map((c) => ({ label: c, code: `Key${c}` })),
    { label: '⇧', code: 'ShiftRight', className: 'wide' },
  ],
  [
    { label: '?123', layout: 'numbers', className: 'wide switch' },
    { label: ',', code: 'Comma' },
    { label: 'Space', code: 'Space', className: 'wide space' },
    { label: '.', code: 'Period' },
    { label: '?', code: 'Slash', shift: true, className: 'wide' },
  ],
]

const NUMBERS: KeyDef[][] = [
  TOP,
  [
    { label: '1', code: 'Digit1' },
    { label: '2', code: 'Digit2' },
    { label: '3', code: 'Digit3' },
    { label: '4', code: 'Digit4' },
    { label: '5', code: 'Digit5' },
    { label: '6', code: 'Digit6' },
    { label: '7', code: 'Digit7' },
    { label: '8', code: 'Digit8' },
    { label: '9', code: 'Digit9' },
    { label: '0', code: 'Digit0' },
  ],
  [
    { label: '-', code: 'Minus' },
    { label: '/', code: 'Slash' },
    { label: ':', code: 'Semicolon', shift: true },
    { label: ';', code: 'Semicolon' },
    { label: '(', code: 'Digit9', shift: true },
    { label: ')', code: 'Digit0', shift: true },
    { label: '$', code: 'Digit4', shift: true },
    { label: '&', code: 'Digit7', shift: true },
    { label: '@', code: 'Digit2', shift: true },
    { label: '"', code: 'Quote', shift: true },
  ],
  [
    { label: '#+=', layout: 'symbols', className: 'wide switch' },
    { label: '.', code: 'Period' },
    { label: ',', code: 'Comma' },
    { label: '?', code: 'Slash', shift: true },
    { label: '!', code: 'Digit1', shift: true },
    { label: "'", code: 'Quote' },
  ],
  [
    { label: 'ABC', layout: 'letters', className: 'wide switch' },
    { label: 'Space', code: 'Space', className: 'wide space' },
    { label: '⏎', code: 'Enter', className: 'wide' },
  ],
]

const SYMBOLS: KeyDef[][] = [
  TOP,
  [
    { label: '[', code: 'BracketLeft' },
    { label: ']', code: 'BracketRight' },
    { label: '{', code: 'BracketLeft', shift: true },
    { label: '}', code: 'BracketRight', shift: true },
    { label: '#', code: 'Digit3', shift: true },
    { label: '%', code: 'Digit5', shift: true },
    { label: '^', code: 'Digit6', shift: true },
    { label: '*', code: 'Digit8', shift: true },
    { label: '+', code: 'Equal', shift: true },
    { label: '=', code: 'Equal' },
  ],
  [
    { label: '_', code: 'Minus', shift: true },
    { label: '\\', code: 'Backslash' },
    { label: '|', code: 'Backslash', shift: true },
    { label: '~', code: 'Backquote', shift: true },
    { label: '`', code: 'Backquote' },
    { label: '<', code: 'Comma', shift: true },
    { label: '>', code: 'Period', shift: true },
    { label: '@', code: 'Digit2', shift: true },
    { label: '!', code: 'Digit1', shift: true },
    { label: '?', code: 'Slash', shift: true },
  ],
  [
    { label: '?123', layout: 'numbers', className: 'wide switch' },
    { label: '.', code: 'Period' },
    { label: ',', code: 'Comma' },
    { label: "'", code: 'Quote' },
    { label: '"', code: 'Quote', shift: true },
    { label: ';', code: 'Semicolon' },
  ],
  [
    { label: 'ABC', layout: 'letters', className: 'wide switch' },
    { label: 'Space', code: 'Space', className: 'wide space' },
    { label: '⏎', code: 'Enter', className: 'wide' },
  ],
]

const LAYOUTS: Record<Layout, KeyDef[][]> = {
  letters: LETTERS,
  numbers: NUMBERS,
  symbols: SYMBOLS,
}

function isLayoutKey(key: KeyDef): key is { label: string; layout: Layout; className?: string } {
  return 'layout' in key
}

function isModifierCode(code: string) {
  return (
    code === 'ShiftLeft' ||
    code === 'ShiftRight' ||
    code === 'ControlLeft' ||
    code === 'ControlRight' ||
    code === 'AltLeft' ||
    code === 'AltRight' ||
    code === 'MetaLeft' ||
    code === 'MetaRight'
  )
}

type Props = {
  transport: Transport
}

type PressRec = {
  code: string
  /** Temporary ShiftLeft this press owns (not from the Shift keycap). */
  tempShift: boolean
}

export function KeyboardPanel({ transport }: Props) {
  const [layout, setLayout] = useState<Layout>('letters')
  const [down, setDown] = useState<Record<string, boolean>>({})
  const presses = useRef<Record<string, PressRec>>({})
  /** How many Shift keycaps are currently held (sticky hold). */
  const shiftKeycaps = useRef(0)

  const releaseAll = () => {
    for (const [id, rec] of Object.entries(presses.current)) {
      transport.key(rec.code, false)
      if (rec.tempShift && shiftKeycaps.current === 0) {
        transport.key('ShiftLeft', false)
      }
      delete presses.current[id]
    }
    if (shiftKeycaps.current > 0) {
      transport.key('ShiftLeft', false)
      transport.key('ShiftRight', false)
      shiftKeycaps.current = 0
    }
    setDown({})
  }

  const pressKey = (id: string, key: { label: string; code: string; shift?: boolean }) => {
    if (presses.current[id]) return

    if (isModifierCode(key.code)) {
      if (key.code === 'ShiftLeft' || key.code === 'ShiftRight') {
        shiftKeycaps.current += 1
      }
      presses.current[id] = { code: key.code, tempShift: false }
      setDown((d) => ({ ...d, [id]: true }))
      transport.key(key.code, true)
      return
    }

    const needTempShift = !!key.shift && shiftKeycaps.current === 0
    if (needTempShift) transport.key('ShiftLeft', true)
    presses.current[id] = { code: key.code, tempShift: needTempShift }
    setDown((d) => ({ ...d, [id]: true }))
    transport.key(key.code, true)
  }

  const releaseKey = (id: string) => {
    const rec = presses.current[id]
    if (!rec) return
    delete presses.current[id]
    setDown((d) => ({ ...d, [id]: false }))

    transport.key(rec.code, false)

    if (rec.code === 'ShiftLeft' || rec.code === 'ShiftRight') {
      shiftKeycaps.current = Math.max(0, shiftKeycaps.current - 1)
    }

    if (rec.tempShift && shiftKeycaps.current === 0) {
      transport.key('ShiftLeft', false)
    }
  }

  const rows = LAYOUTS[layout]

  return (
    <div
      className="keys-grid sheet-keys"
      onPointerCancel={releaseAll}
      onBlur={releaseAll}
    >
      {rows.map((row, i) => (
        <div
          key={`${layout}-${i}`}
          className="key-row"
          style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
        >
          {row.map((key, j) => {
            if (isLayoutKey(key)) {
              return (
                <button
                  key={`${key.layout}-${key.label}-${j}`}
                  type="button"
                  className={`keycap${key.className ? ` ${key.className}` : ''}`}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    releaseAll()
                    setLayout(key.layout)
                  }}
                >
                  {key.label}
                </button>
              )
            }

            const id = `${layout}-${key.code}-${key.label}-${j}`
            return (
              <button
                key={id}
                type="button"
                className={`keycap${key.className ? ` ${key.className}` : ''}${down[id] ? ' down' : ''}`}
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.currentTarget.setPointerCapture(e.pointerId)
                  pressKey(id, key)
                }}
                onPointerUp={() => releaseKey(id)}
                onPointerCancel={() => releaseKey(id)}
                onLostPointerCapture={() => releaseKey(id)}
              >
                {key.label}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
