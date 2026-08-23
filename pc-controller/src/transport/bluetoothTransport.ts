import { BluetoothHid, type HidNativeState } from '../plugins/bluetoothHid'
import { TvRemote } from '../plugins/tvRemote'
import type { DeviceInfo, Transport } from './types'

type Listener = () => void
type LinkMode = 'none' | 'bluetooth' | 'wifi-tv'

type NativeInput = {
  key: (code: string, down: boolean) => void
  tvKey: (code: string, down: boolean) => void
  consumer: (action: string, down: boolean) => void
  tvConsumer: (action: string, down: boolean) => void
}

function nativeInput(): NativeInput | undefined {
  return (window as Window & { HidInput?: NativeInput }).HidInput
}

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
  let moveAccX = 0
  let moveAccY = 0
  let scrollAccX = 0
  let scrollAccY = 0
  const listeners = new Set<Listener>()

  const notify = () => listeners.forEach((fn) => fn())

  // Native code coalesces pending reports. Do not serialize Capacitor calls
  // here: waiting for each bridge promise makes the pointer trail the finger.
  const pumpMouseMove = () => {
    if (link !== 'bluetooth') {
      moveAccX = 0
      moveAccY = 0
      return
    }
    const ix = Math.round(moveAccX)
    const iy = Math.round(moveAccY)
    if (!ix && !iy) return
    moveAccX -= ix
    moveAccY -= iy
    void BluetoothHid.mouseMove({ dx: ix, dy: iy })
  }

  const pumpMouseScroll = () => {
    if (link !== 'bluetooth') {
      scrollAccX = 0
      scrollAccY = 0
      return
    }
    const ix = Math.trunc(scrollAccX)
    const iy = Math.trunc(scrollAccY)
    if (!ix && !iy) return
    scrollAccX -= ix
    scrollAccY -= iy
    void BluetoothHid.mouseScroll({ dx: ix, dy: iy })
  }

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
          nativeMessage = 'Look at the TV — tap Allow for Pc Controller'
          nativeDetail = '2018 Q6F only shows the popup on Wi‑Fi port 8002. Stay on the Home screen.'
          notify()
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
      moveAccX += dx
      moveAccY += dy
      pumpMouseMove()
    },
    mouseButton(button: 'left' | 'right' | 'middle', down: boolean) {
      if (link !== 'bluetooth') return
      // Land any pending motion first so the click hits where the finger was.
      const ix = Math.round(moveAccX)
      const iy = Math.round(moveAccY)
      if (ix || iy) {
        moveAccX -= ix
        moveAccY -= iy
        void BluetoothHid.mouseMove({ dx: ix, dy: iy })
      }
      void BluetoothHid.mouseButton({ button, down })
    },
    mouseScroll(dx: number, dy: number) {
      if (link !== 'bluetooth') return
      scrollAccX += dx
      scrollAccY += dy
      pumpMouseScroll()
    },
    key(code: string, down: boolean) {
      const native = nativeInput()
      if (link === 'wifi-tv') {
        if (native) native.tvKey(code, down)
        else void TvRemote.sendKey({ code, down })
        return
      }
      if (native) native.key(code, down)
      else void BluetoothHid.key({ code, down })
    },
    tapKey(code: string, shift = false) {
      if (shift) this.key('ShiftLeft', true)
      this.key(code, true)
      this.key(code, false)
      if (shift) this.key('ShiftLeft', false)
    },
    consumer(action: string, down: boolean) {
      const native = nativeInput()
      if (link === 'wifi-tv') {
        if (native) {
          native.tvConsumer(action, down)
          if (action === 'power' && down) {
            nativeMessage = 'Power command sent · wake may take a few seconds'
            notify()
          }
          return
        }
        void TvRemote.sendAction({ action, down })
        return
      }
      if (native) native.consumer(action, down)
      else void BluetoothHid.consumer({ action, down })
    },
  }
}
