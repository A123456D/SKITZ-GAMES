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
  let nativeMessage = 'Start HID for PC, or scan Wi‑Fi for Smart TVs'
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
      const s = await BluetoothHid.restart()
      applyNative(s)
    },
    async makeDiscoverable() {
      const res = await BluetoothHid.makeDiscoverable()
      applyNative(res.state)
    },
    async scanWifiTvs() {
      await TvRemote.ensurePermissions().catch(() => undefined)
      const { devices } = await TvRemote.scan()
      return devices.map((d) => ({
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
      notify()
      try {
        await BluetoothHid.ensurePermissions()
        const started = await BluetoothHid.start()
        applyNative(started)
        const bonded = await BluetoothHid.listBonded()
        let wifi: DeviceInfo[] = []
        try {
          await TvRemote.ensurePermissions().catch(() => undefined)
          const scanned = await TvRemote.scan()
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
        state = mapConnection(started)
        notify()
        return [...wifi, ...bt]
      } catch (e) {
        state = 'error'
        error = e instanceof Error ? e.message : 'Scan failed'
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
