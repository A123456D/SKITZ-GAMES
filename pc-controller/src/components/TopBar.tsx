import type { ConnectionState, DeviceInfo } from '../transport'

type Props = {
  state: ConnectionState
  device: DeviceInfo | null
  onStatusTap?: () => void
  onManualTap?: () => void
}

export function TopBar({ state, device, onStatusTap, onManualTap }: Props) {
  const label =
    state === 'connected' && device
      ? device.name
      : state === 'scanning'
        ? 'Scanning'
        : state === 'connecting'
          ? 'Connecting'
          : state === 'error'
            ? 'Error'
            : 'Tap to connect'

  const tone =
    state === 'connected' ? 'ok' : state === 'scanning' || state === 'connecting' ? 'warn' : state === 'error' ? 'err' : ''

  const connected = state === 'connected'

  return (
    <header className="topbar">
      <div className="brand">
        Pc <span>Controller</span>
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-tool"
          aria-label="Open user manual"
          title="User manual"
          onClick={onManualTap}
        >
          ?
        </button>
        <button
          type="button"
          className="status-pill"
          onClick={() => {
            if (!onStatusTap) return
            onStatusTap()
          }}
          title={connected ? 'Tap to disconnect' : 'Tap to connect'}
        >
          <span className={`status-dot ${tone}`} />
          <span className="status-label">{label}</span>
        </button>
      </div>
    </header>
  )
}
