import { useEffect, useMemo, useState } from 'react'
import { ModeTabs } from './components/ModeTabs'
import { PhoneShell } from './components/PhoneShell'
import { TopBar } from './components/TopBar'
import { ConnectScreen } from './screens/ConnectScreen'
import { TouchScreen } from './screens/TouchScreen'
import { TvScreen } from './screens/TvScreen'
import { createTransport, type ControllerMode, type DeviceInfo } from './transport'

const SAVED_TV_KEY = 'pc-controller.saved-tv'

function loadSavedTv(): DeviceInfo | null {
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_TV_KEY) ?? 'null') as DeviceInfo | null
    return value?.kind === 'tv' && value.id ? value : null
  } catch {
    return null
  }
}

function rememberTv(device: DeviceInfo | null) {
  if (device?.kind !== 'tv') return
  localStorage.setItem(SAVED_TV_KEY, JSON.stringify(device))
}

function withSavedTv(devices: DeviceInfo[]) {
  const saved = loadSavedTv()
  if (!saved || devices.some((device) => device.id === saved.id)) return devices
  return [saved, ...devices]
}

export default function App() {
  const transport = useMemo(() => createTransport(), [])
  const [, tick] = useState(0)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [mode, setMode] = useState<ControllerMode>('touch')
  const [showConnect, setShowConnect] = useState(false)

  useEffect(() => transport.subscribe(() => tick((n) => n + 1)), [transport])

  // Demo web: soft auto-pair in the background — never blocks the pad UI.
  useEffect(() => {
    if (transport.isNative) return
    let cancelled = false
    ;(async () => {
      try {
        const list = await transport.startScan()
        if (cancelled) return
        setDevices(list)
        const preferred = list.find((d) => d.kind === 'pc') ?? list[0]
        if (preferred) await transport.connect(preferred.id)
      } catch {
        /* ignore — pad still usable offline */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [transport])

  const connected = transport.state === 'connected'

  const onScan = async () => {
    const list = await transport.startScan()
    setDevices(withSavedTv(list))
  }

  const onConnect = async (id: string) => {
    try {
      await transport.connect(id)
      if (transport.state === 'connected') {
        rememberTv(transport.device)
        setShowConnect(false)
      }
    } catch {
      /* keep sheet open; error shows in ConnectScreen */
    }
  }

  const onDisconnect = async () => {
    await transport.disconnect()
  }

  // Native app: reconnect the last TV without making the user scan/select it.
  useEffect(() => {
    if (!transport.isNative) return
    const saved = loadSavedTv()
    if (!saved) return
    setDevices((current) => withSavedTv(current))
    void transport
      .connect(saved.id)
      .then(() => {
        if (transport.state === 'connected') rememberTv(transport.device ?? saved)
      })
      .catch(() => {
        // Keep the saved row available for a manual retry.
      })
  }, [transport])

  return (
    <PhoneShell>
      <div className="app">
        <TopBar
          state={transport.state}
          device={transport.device}
          onStatusTap={() => {
            if (connected) {
              void onDisconnect()
            } else {
              setShowConnect(true)
            }
          }}
        />

        {mode === 'touch' && <TouchScreen transport={transport} />}
        {mode === 'tv' && <TvScreen transport={transport} />}
        <ModeTabs mode={mode} onChange={setMode} />

        {showConnect && (
          <div className="connect-overlay" role="dialog" aria-label="Connect">
            <button
              type="button"
              className="connect-backdrop"
              aria-label="Close connect"
              onClick={() => setShowConnect(false)}
            />
            <div className="connect-sheet">
              <ConnectScreen
                transport={transport}
                devices={devices}
                onScan={onScan}
                onConnect={onConnect}
                onClose={() => setShowConnect(false)}
              />
            </div>
          </div>
        )}
      </div>
    </PhoneShell>
  )
}
