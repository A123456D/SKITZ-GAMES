import { useState } from 'react'
import { haptic } from '../haptics'
import type { Transport } from '../transport'

type Layout = 'letters' | 'numbers' | 'symbols'

type KeyDef =
  | { label: string; code: string; className?: string }
  | { label: string; layout: Layout; className?: string }

const TOP: KeyDef[] = [
  { label: 'Esc', code: 'Escape', className: 'wide' },
  { label: 'Tab', code: 'Tab', className: 'wide' },
  { label: '⌫', code: 'Backspace', className: 'wide' },
  { label: '⏎', code: 'Enter', className: 'wide' },
]

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
    { label: '?', code: 'Slash', className: 'wide' },
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
    { label: ':', code: 'Semicolon' },
    { label: ';', code: 'Semicolon' },
    { label: '(', code: 'Digit9' },
    { label: ')', code: 'Digit0' },
    { label: '$', code: 'Digit4' },
    { label: '&', code: 'Digit7' },
    { label: '@', code: 'Digit2' },
    { label: '"', code: 'Quote' },
  ],
  [
    { label: '#+=', layout: 'symbols', className: 'wide switch' },
    { label: '.', code: 'Period' },
    { label: ',', code: 'Comma' },
    { label: '?', code: 'Slash' },
    { label: '!', code: 'Digit1' },
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
    { label: '{', code: 'BracketLeft' },
    { label: '}', code: 'BracketRight' },
    { label: '#', code: 'Digit3' },
    { label: '%', code: 'Digit5' },
    { label: '^', code: 'Digit6' },
    { label: '*', code: 'Digit8' },
    { label: '+', code: 'Equal' },
    { label: '=', code: 'Equal' },
  ],
  [
    { label: '_', code: 'Minus' },
    { label: '\\', code: 'Backslash' },
    { label: '|', code: 'Backslash' },
    { label: '~', code: 'Backquote' },
    { label: '<', code: 'Comma' },
    { label: '>', code: 'Period' },
    { label: '€', code: 'KeyE' },
    { label: '£', code: 'Digit3' },
    { label: '¥', code: 'KeyY' },
    { label: '•', code: 'Digit8' },
  ],
  [
    { label: '?123', layout: 'numbers', className: 'wide switch' },
    { label: '.', code: 'Period' },
    { label: ',', code: 'Comma' },
    { label: '?', code: 'Slash' },
    { label: '!', code: 'Digit1' },
    { label: "'", code: 'Quote' },
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

type Props = {
  transport: Transport
}

export function KeyboardPanel({ transport }: Props) {
  const [layout, setLayout] = useState<Layout>('letters')
  const [down, setDown] = useState<Record<string, boolean>>({})

  const rows = LAYOUTS[layout]

  return (
    <div className="keys-grid sheet-keys">
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
                    haptic('selection')
                    setLayout(key.layout)
                  }}
                >
                  {key.label}
                </button>
              )
            }

            const id = `${key.code}-${key.label}-${j}`
            return (
              <button
                key={id}
                type="button"
                className={`keycap${key.className ? ` ${key.className}` : ''}${down[id] ? ' down' : ''}`}
                onPointerDown={(e) => {
                  e.preventDefault()
                  setDown((d) => ({ ...d, [id]: true }))
                  haptic('light')
                  transport.key(key.code, true)
                }}
                onPointerUp={() => {
                  setDown((d) => ({ ...d, [id]: false }))
                  transport.key(key.code, false)
                }}
                onPointerLeave={() => {
                  if (down[id]) {
                    setDown((d) => ({ ...d, [id]: false }))
                    transport.key(key.code, false)
                  }
                }}
                onPointerCancel={() => {
                  if (down[id]) {
                    setDown((d) => ({ ...d, [id]: false }))
                    transport.key(key.code, false)
                  }
                }}
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
