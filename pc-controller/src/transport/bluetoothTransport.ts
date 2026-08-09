import { BluetoothHid, type HidNativeState } from '../plugins/bluetoothHid'
import { TvRemote } from '../plugins/tvRemote'
import type { DeviceInfo, GamepadState, Transport } from './types'

type Listener = () => void
type LinkMode = 'none' | 'bluetooth' | 'wifi-tv'

function mapConnection(state: HidNativeState): Transport['state'] {
  switch (state.connection) {
    case 'Connected':
      return 'connected'
    case 'Registering':
    case 'WaitingForHost':
      return state.hostAddress ? 'connecting' : 'idle'
    case 'Error':
    case 'Unsupported':
    case 'BluetoothOff':
      return 'error'
    default:
      return 'idle'
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), ms)
    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch(() => {
        window.clearTimeout(timer)
        resolve(fallback)
      })
  })
}

export function createBluetoothTransport(): Transport & {
  subscribe: (fn: Listener) => () => void
  nativeMessage: string
  nativeDetail: string
  restartHid: () => Promise<void>
  makeDiscoverable: () => Promise<void>
  scanWifiTvs: () => Promise<DeviceInfo[]>
  isNative: boolean
} {
  let state: Transport['state'] = 'idle'
  let device: DeviceInfo | null = null
  let error: string | null = null
  let nativeMessage = 'Tap Scan to find PCs (Bluetooth) and Smart TVs (Wi‑Fi)'
  let nativeDetail = ''
  let link: LinkMode = 'none'
  const listeners = new Set<Listener>()

  const notify = () => listeners.forEach((fn) => fn())

  const applyNative = (s: HidNativeState) => {
    if (link === 'wifi-tv') return
    nativeMessage = s.message
    nativeDetail = s.detail
    state = mapConnection(s)
    if (s.connection === 'Connected' && s.hostAddress) {
      link = 'bluetooth'
      device = {
        id: s.hostAddress,
        name: s.hostName || s.hostAddress,
        kind: 'pc',
        protocol: 'bluetooth',
      }
      error = null
    } else if (
      s.connection === 'Error' ||
      s.connection === 'Unsupported' ||
      s.connection === 'BluetoothOff'
    ) {
      error = s.message
      if (link === 'bluetooth') {
        device = null
        link = 'none'
      }
    } else if (s.connection === 'Idle') {
      if (link === 'bluetooth') {
        device = null
        link = 'none'
        error = null
      }
    }
    notify()
  }

  void BluetoothHid.addListener('hidState', applyNative)
  void BluetoothHid.getState().then(applyNative).catch(() => {})
  void TvRemote.addListener('tvState', (s) => {
    nativeMessage = s.message || (s.connected ? `TV live · ${s.protocol}` : 'TV disconnected')
    if (s.connected) {
      link = 'wifi-tv'
      state = 'connected'
      device = {
        id: `${s.protocol}:${s.name}`,
        name: s.name || 'Smart TV',
        kind: 'tv',
        protocol: s.protocol || 'wifi',
      }
      error = null
    } else if (link === 'wifi-tv') {
      link = 'none'
      state = 'idle'
      device = null
    }
    notify()
  })

  return {
    isNative: true,
    get state() {
      return state
    },
    get device() {
      return device
    },
    get error() {
      return error
    },
    get nativeMessage() {
      return nativeMessage
    },
    get nativeDetail() {
      return nativeDetail
    },
    subscribe(fn: Listener) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    async restartHid() {
      const s = await withTimeout(BluetoothHid.restart(), 8000, {
        connection: 'Error' as const,
        hostName: null,
        hostAddress: null,
        message: 'Bluetooth restart timed out',
        detail: '',
        profileAvailable: true,
      })
      applyNative(s)
    },
    async makeDiscoverable() {
      const res = await withTimeout(
        BluetoothHid.makeDiscoverable(),
        5000,
        {
          ok: false,
          state: {
            connection: 'WaitingForHost' as const,
            hostName: null,
            hostAddress: null,
            message: 'Discoverable request timed out',
            detail: '',
            profileAvailable: true,
          },
        },
      )
      applyNative(res.state)
    },
    async scanWifiTvs() {
      await withTimeout(TvRemote.ensurePermissions(), 5000, { granted: false })
      const scanned = await withTimeout(TvRemote.scan(), 6000, { devices: [] })
      return scanned.devices.map((d) => ({
        id: d.id,
        name: d.name,
        kind: 'tv' as const,
        protocol: d.protocol,
        host: d.host,
      }))
    },
    async startScan() {
      state = 'scanning'
      error = null
      nativeMessage = 'Scanning…'
      notify()
      try {
        // Never hang forever on the permission sheet
        await withTimeout(BluetoothHid.ensurePermissions(), 20000, { granted: false })

        const started = await withTimeout(BluetoothHid.start(), 6000, {
          connection: 'Idle' as const,
          hostName: null,
          hostAddress: null,
          message: 'Bluetooth HID starting… use Restart HID if needed',
          detail: '',
          profileAvailable: true,
        })
        applyNative(started)

        const bonded = await withTimeout(BluetoothHid.listBonded(), 4000, { devices: [] })

        let wifi: DeviceInfo[] = []
        try {
          await withTimeout(TvRemote.ensurePermissions(), 5000, { granted: false })
          const scanned = await withTimeout(TvRemote.scan(), 6000, { devices: [] })
          wifi = scanned.devices.map((d) => ({
            id: d.id,
            name: d.name,
            kind: 'tv' as const,
            protocol: d.protocol,
            host: d.host,
          }))
        } catch {
          wifi = []
        }

        const bt = bonded.devices.map((d) => ({
          id: d.id,
          name: d.name,
          kind: (d.kind ?? 'pc') as DeviceInfo['kind'],
          protocol: 'bluetooth',
        }))

        // Keep scanning state from mapping Connected; otherwise idle for connect UI
        if (link !== 'bluetooth' && link !== 'wifi-tv') {
          state = 'idle'
        }
        nativeMessage =
          wifi.length || bt.length
            ? `Found ${wifi.length} TV(s), ${bt.length} Bluetooth host(s)`
            : 'No devices yet — try Make discoverable or enter a TV IP'
        notify()
        return [...wifi, ...bt]
      } catch (e) {
        state = 'idle'
        error = e instanceof Error ? e.message : 'Scan failed'
        nativeMessage = error
        notify()
        return []
      }
    },
    async connect(deviceId: string) {
      state = 'connecting'
      error = null
      notify()
      try {
        const isBluetoothMac = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(deviceId)
        if (!isBluetoothMac) {
          const res = await TvRemote.connect({ id: deviceId })
          link = 'wifi-tv'
          state = 'connected'
          device = {
            id: deviceId,
            name: res.name || deviceId,
            kind: 'tv',
            protocol: res.protocol || deviceId.split(':')[0],
          }
          nativeMessage = `Connected · ${(res.protocol || 'TV').toUpperCase()} Wi‑Fi remote`
          nativeDetail = 'Phone and TV must be on the same Wi‑Fi'
          notify()
          return
        }
        const s = await BluetoothHid.connect({ address: deviceId })
        applyNative(s)
        if (s.connection !== 'Connected') {
          state = 'connecting'
          notify()
        }
      } catch (e) {
        state = 'error'
        error = e instanceof Error ? e.message : 'Connect failed'
        notify()
        throw e
      }
    },
    async disconnect() {
      if (link === 'wifi-tv') {
        await TvRemote.disconnect()
        link = 'none'
        state = 'idle'
        device = null
        notify()
        return
      }
      const s = await BluetoothHid.stop()
      applyNative(s)
    },
    mouseMove(dx: number, dy: number) {
      if (link !== 'bluetooth') return
      void BluetoothHid.mouseMove({ dx: Math.round(dx), dy: Math.round(dy) })
    },
    mouseButton(button: 'left' | 'right' | 'middle', down: boolean) {
      if (link !== 'bluetooth') return
      void BluetoothHid.mouseButton({ button, down })
    },
    mouseScroll(dx: number, dy: number) {
      if (link !== 'bluetooth') return
      void BluetoothHid.mouseScroll({ dx: Math.round(dx), dy: Math.round(dy) })
    },
    key(code: string, down: boolean) {
      if (link === 'wifi-tv') {
        void TvRemote.sendKey({ code, down })
        return
      }
      void BluetoothHid.key({ code, down })
    },
    consumer(action: string, down: boolean) {
      if (link === 'wifi-tv') {
        if (['netflix', 'prime', 'disney', 'appletv'].includes(action) && down) {
          void TvRemote.launchApp({ action })
        }
        void TvRemote.sendAction({ action, down })
        return
      }
      void BluetoothHid.consumer({ action, down })
    },
    gamepad(next: GamepadState) {
      if (link !== 'bluetooth') return
      void BluetoothHid.gamepad({
        lx: next.lx,
        ly: next.ly,
        rx: next.rx,
        ry: next.ry,
        buttons: next.buttons,
      })
    },
  }
}
