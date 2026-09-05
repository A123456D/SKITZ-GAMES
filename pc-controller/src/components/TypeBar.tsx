import { useState } from 'react'
import type { Transport } from '../transport'

type Props = {
  transport: Transport
}

function safeClipboardText(): string {
  return ''
}

/**
 * "Type on PC" bar: type with the phone's own keyboard (autocorrect, voice,
 * all languages) or paste from the clipboard — keystrokes land on the host as
 * real HID input. PC mode only (TVs take discrete keys, not text bursts).
 */
export function TypeBar({ transport }: Props) {
  const [text, setText] = useState('')
  const connected = transport.state === 'connected' && transport.device?.kind === 'pc'

  const send = () => {
    const value = text.trim()
    if (!value) return
    transport.typeText(value)
    setText('')
  }

  const paste = async () => {
    try {
      const clip = await navigator.clipboard.readText()
      if (clip) transport.typeText(clip)
    } catch {
      // Clipboard permission denied — nothing to send.
    }
  }

  return (
    <div className="type-bar">
      <span className="type-bar-label">TYPE</span>
      <input
        className="type-bar-input"
        type="text"
        enterKeyHint="send"
        autoComplete="off"
        autoCorrect="on"
        autoCapitalize="sentences"
        inputMode="text"
        placeholder="Type here — lands on the PC"
        value={text}
        disabled={!connected}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            send()
          }
        }}
      />
      <button
        type="button"
        className="type-bar-btn"
        disabled={!connected || !text.trim()}
        onPointerDown={(e) => e.preventDefault()}
        onClick={send}
      >
        Send
      </button>
      <button
        type="button"
        className="type-bar-btn ghost"
        disabled={!connected}
        onPointerDown={(e) => e.preventDefault()}
        onClick={paste}
      >
        Paste
      </button>
    </div>
  )
}

export { safeClipboardText }
