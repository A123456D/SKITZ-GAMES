import { haptic } from '../haptics'
import type { ControllerMode } from '../transport'

const TABS: { id: ControllerMode; label: string }[] = [
  { id: 'touch', label: 'Touch' },
  { id: 'tv', label: 'TV' },
  { id: 'game', label: 'Game' },
]

type Props = {
  mode: ControllerMode
  enabled: boolean
  onChange: (mode: ControllerMode) => void
}

export function ModeTabs({ mode, enabled, onChange }: Props) {
  return (
    <nav className="tabs" aria-label="Controller modes">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab${mode === tab.id ? ' active' : ''}`}
          disabled={!enabled}
          onClick={() => {
            if (tab.id === mode) return
            haptic('selection')
            onChange(tab.id)
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
