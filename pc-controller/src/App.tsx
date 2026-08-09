import { useEffect, useMemo, useState } from 'react'
import { ModeTabs } from './components/ModeTabs'
import { PhoneShell } from './components/PhoneShell'
import { TopBar } from './components/TopBar'
import { ConnectScreen } from './screens/ConnectScreen'
import { GameScreen } from './screens/GameScreen'
import { TouchScreen } from './screens/TouchScreen'
import { TvScreen } from './screens/TvScreen'
import { createTransport, type ControllerMode, type DeviceInfo } from './transport'

export default function App() {
  const transport = useMemo(() => createTransport(), [])
  const [, tick] = useState(0)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [mode, setMode] = useState<ControllerMode>('touch')
  const [booting, setBooting] = useState(true)

  useEffect(() => transport.subscribe(() => tick((n) => n + 1)), [transport])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (transport.isNative) {
          // Request perms + start HID registration; do not fake-connect.
          const list = await transport.startScan()
          if (!cancelled) setDevices(list)
        } else {
          const list = await transport.startScan()
          if (cancelled) return
          setDevices(list)
          const preferred = list.find((d) => d.kind === 'pc') ?? list[0]
          if (preferred) {
            await transport.connect(preferred.id)
            if (!cancelled) setMode('touch')
          }
        }
      } finally {
        if (!cancelled) setBooting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [transport])

  const connected = transport.state === 'connected'

  const onScan = async () => {
    const list = await transport.startScan()
    setDevices(list)
  }

  const onConnect = async (id: string) => {
    await transport.connect(id)
    setMode('touch')
  }

  const onDisconnect = async () => {
    await transport.disconnect()
  }

  return (
    <PhoneShell>
      <div className="app">
        <TopBar
          state={transport.state}
          device={transport.device}
          onDisconnect={() => void onDisconnect()}
        />

        {booting ? (
          <section className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <p className="hint">{transport.isNative ? 'Starting Bluetooth…' : 'Linking demo pad…'}</p>
          </section>
        ) : connected ? (
          <>
            {mode === 'touch' && <TouchScreen transport={transport} />}
            {mode === 'tv' && <TvScreen transport={transport} />}
            {mode === 'game' && <GameScreen transport={transport} />}
            <ModeTabs mode={mode} enabled={connected} onChange={setMode} />
          </>
        ) : (
          <ConnectScreen
            transport={transport}
            devices={devices}
            onScan={onScan}
            onConnect={onConnect}
          />
        )}
      </div>
    </PhoneShell>
  )
}
