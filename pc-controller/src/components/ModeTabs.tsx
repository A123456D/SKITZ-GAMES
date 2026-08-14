import type { ControllerMode } from '../transport'

const TABS: { id: ControllerMode; label: string }[] = [
  { id: 'touch', label: 'Touch' },
  { id: 'tv', label: 'TV' },
  { id: 'game', label: 'Game' },
]

type Props = {
  mode: ControllerMode
  onChange: (mode: ControllerMode) => void
}

export function ModeTabs({ mode, onChange }: Props) {
  return (
    <nav className="tabs" aria-label="Controller modes">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab${mode === tab.id ? ' active' : ''}`}
          onClick={() => {
            if (tab.id === mode) return
            onChange(tab.id)
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
