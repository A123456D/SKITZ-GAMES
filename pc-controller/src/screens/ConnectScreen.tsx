import { useState } from 'react'
import type { AppTransport } from '../transport'
import type { DeviceInfo } from '../transport'

type Props = {
  transport: AppTransport
  devices: DeviceInfo[]
  onScan: () => Promise<void>
  onConnect: (id: string) => Promise<void>
  onClose?: () => void
}

function protocolLabel(device: DeviceInfo) {
  const p = (device.protocol || '').toLowerCase()
  if (p === 'bluetooth') return 'Bluetooth HID'
  if (p === 'roku') return 'Roku Wi‑Fi'
  if (p === 'samsung') return 'Samsung Wi‑Fi'
  if (p === 'lg') return 'LG webOS Wi‑Fi'
  if (p === 'bravia') return 'Bravia IP'
  if (p === 'android_tv' || p === 'androidtv') return 'Android / Google TV'
  if (p === 'fire_tv' || p === 'firetv') return 'Fire TV'
  if (device.kind === 'tv') return 'Smart TV'
  return 'PC · Bluetooth'
}

export function ConnectScreen({ transport, devices, onScan, onConnect, onClose }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [manualHost, setManualHost] = useState('')
  const [manualProto, setManualProto] = useState('roku')
  const scanning = transport.state === 'scanning'
  const connecting = transport.state === 'connecting'
  const native = transport.isNative

  const tvs = devices.filter((d) => d.kind === 'tv')
  const pcs = devices.filter((d) => d.kind !== 'tv')

  return (
    <section className="screen connect-panel">
      <div className="connect-head">
        <div>
          <h1 className="headline">{native ? 'Connect' : 'Pair a screen.'}</h1>
          <p className="sub">
            {native
              ? 'Optional. Use the pad offline — link a PC (Bluetooth) or TV (Wi‑Fi) when you want.'
              : 'Demo mode lists sample targets. On phone, Bluetooth + Wi‑Fi TV protocols are live.'}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            className="btn ghost connect-close"
            onClick={() => {
              onClose()
            }}
          >
            Done
          </button>
        )}
      </div>

      {native && (
        <div className="connect-actions">
          <button
            type="button"
            className="btn"
            disabled={scanning || connecting}
            onClick={() => {
              void onScan()
            }}
          >
            {scanning ? 'Scanning…' : 'Scan BT + Wi‑Fi TVs'}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={!transport.makeDiscoverable}
            onClick={() => {
              void transport.makeDiscoverable?.()
            }}
          >
            Make phone discoverable
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={!transport.restartHid}
            onClick={() => {
              void transport.restartHid?.()
            }}
          >
            Restart Bluetooth HID
          </button>
        </div>
      )}

      {!native && (
        <button
          type="button"
          className="btn"
          disabled={scanning || connecting}
          onClick={() => {
            void onScan()
          }}
        >
          {scanning ? 'Scanning…' : devices.length ? 'Scan again' : 'Scan nearby'}
        </button>
      )}

      {native && (transport.nativeMessage || transport.nativeDetail) && (
        <div className="hid-status">
          <p className="sub">{transport.nativeMessage}</p>
          {transport.nativeDetail ? <p className="hint">{transport.nativeDetail}</p> : null}
        </div>
      )}

      {native && (
        <div className="manual-tv">
          <p className="hint" style={{ textAlign: 'left', marginBottom: 8 }}>
            Manual TV IP (same Wi‑Fi)
          </p>
          <div className="manual-row">
            <select
              className="manual-select"
              value={manualProto}
              onChange={(e) => setManualProto(e.target.value)}
            >
              <option value="roku">Roku</option>
              <option value="samsung">Samsung</option>
              <option value="lg">LG</option>
              <option value="bravia">Bravia</option>
              <option value="androidtv">Android/Google TV</option>
            </select>
            <input
              className="manual-input"
              placeholder="192.168.1.50"
              value={manualHost}
              onChange={(e) => setManualHost(e.target.value)}
              inputMode="decimal"
            />
            <button
              type="button"
              className="btn"
              disabled={!manualHost.trim() || connecting}
              onClick={() => {
                const id = `${manualProto}:${manualHost.trim()}`
                setBusyId(id)
                void onConnect(id).finally(() => setBusyId(null))
              }}
            >
              Go
            </button>
          </div>
        </div>
      )}

      <div className="device-list">
        {tvs.length > 0 && <p className="hint" style={{ textAlign: 'left' }}>Smart TVs</p>}
        {tvs.map((device) => (
          <button
            key={device.id}
            type="button"
            className="device"
            disabled={connecting}
            onClick={() => {
              setBusyId(device.id)
              void onConnect(device.id).finally(() => setBusyId(null))
            }}
          >
            <div>
              <div className="device-name">{device.name}</div>
              <div className="device-meta">{protocolLabel(device)}</div>
            </div>
            <div className="device-go">{busyId === device.id ? '…' : 'Connect'}</div>
          </button>
        ))}

        {pcs.length > 0 && <p className="hint" style={{ textAlign: 'left' }}>Bluetooth hosts</p>}
        {pcs.map((device) => (
          <button
            key={device.id}
            type="button"
            className="device"
            disabled={connecting}
            onClick={() => {
              setBusyId(device.id)
              void onConnect(device.id).finally(() => setBusyId(null))
            }}
          >
            <div>
              <div className="device-name">{device.name}</div>
              <div className="device-meta">{protocolLabel(device)}</div>
            </div>
            <div className="device-go">{busyId === device.id ? '…' : 'Connect'}</div>
          </button>
        ))}

        {!devices.length && !scanning && (
          <p className="sub" style={{ textAlign: 'center', marginTop: 24 }}>
            {native
              ? 'No devices yet. Scan on the same Wi‑Fi as your TV, or make the phone discoverable for Bluetooth PCs/TVs.'
              : 'No devices yet. Hit scan to load the demo list.'}
          </p>
        )}
      </div>

      {transport.error && (
        <p className="hint" style={{ color: 'var(--danger)' }}>
          {transport.error}
        </p>
      )}
    </section>
  )
}
