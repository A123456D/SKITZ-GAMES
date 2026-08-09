import { haptic } from '../haptics'
import type { ConnectionState, DeviceInfo } from '../transport'

type Props = {
  state: ConnectionState
  device: DeviceInfo | null
  onDisconnect?: () => void
}

export function TopBar({ state, device, onDisconnect }: Props) {
  const label =
    state === 'connected' && device
      ? device.name
      : state === 'scanning'
        ? 'Scanning'
        : state === 'connecting'
          ? 'Connecting'
          : state === 'error'
            ? 'Error'
            : 'Offline'

  const tone =
    state === 'connected' ? 'ok' : state === 'scanning' || state === 'connecting' ? 'warn' : state === 'error' ? 'err' : ''

  const canDrop = state === 'connected' && onDisconnect

  return (
    <header className="topbar">
      <div className="brand">
        Pc <span>Controller</span>
      </div>
      <button
        type="button"
        className="status-pill"
        disabled={!canDrop}
        onClick={() => {
          if (!canDrop) return
          haptic('warning')
          onDisconnect()
        }}
        title={canDrop ? 'Tap to disconnect' : undefined}
      >
        <span className={`status-dot ${tone}`} />
        {label}
      </button>
    </header>
  )
}
