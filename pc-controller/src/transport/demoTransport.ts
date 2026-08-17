import type { DeviceInfo, Transport } from './types'

const DEMO_DEVICES: DeviceInfo[] = [
  { id: 'demo-pc', name: 'SHIFTR Desk PC', kind: 'pc', protocol: 'bluetooth' },
  { id: 'demo-roku', name: 'Living Room Roku', kind: 'tv', protocol: 'roku' },
  { id: 'demo-samsung', name: 'Samsung QLED', kind: 'tv', protocol: 'samsung' },
  { id: 'demo-lg', name: 'LG OLED', kind: 'tv', protocol: 'lg' },
  { id: 'demo-androidtv', name: 'Google TV', kind: 'tv', protocol: 'android_tv' },
]

type Listener = () => void

export function createDemoTransport(): Transport & { subscribe: (fn: Listener) => () => void } {
  let state: Transport['state'] = 'idle'
  let device: DeviceInfo | null = null
  let error: string | null = null
  const listeners = new Set<Listener>()

  const notify = () => listeners.forEach((fn) => fn())

  const set = ( partial: Partial<Pick<Transport, 'state' | 'device' | 'error'>>) => {
    if (partial.state !== undefined) state = partial.state
    if (partial.device !== undefined) device = partial.device
    if (partial.error !== undefined) error = partial.error
    notify()
  }

  const log = (label: string, payload?: unknown) => {
    if (import.meta.env.DEV) {
      console.debug(`[PcController] ${label}`, payload ?? '')
    }
  }

  const transport: Transport & { subscribe: (fn: Listener) => () => void } = {
    get state() {
      return state
    },
    get device() {
      return device
    },
    get error() {
      return error
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    async startScan() {
      set({ state: 'scanning', error: null })
      await wait(350)
      set({ state: 'idle' })
      return DEMO_DEVICES
    },
    async connect(deviceId) {
      const found = DEMO_DEVICES.find((d) => d.id === deviceId)
      if (!found) {
        set({ state: 'error', error: 'Device not found' })
        throw new Error('Device not found')
      }
      set({ state: 'connecting', error: null })
      await wait(400)
      set({ state: 'connected', device: found })
      log('connected', found)
    },
    async disconnect() {
      set({ state: 'idle', device: null, error: null })
      log('disconnected')
    },
    mouseMove(dx, dy) {
      log('mouseMove', { dx, dy })
    },
    mouseButton(button, down) {
      log('mouseButton', { button, down })
    },
    mouseScroll(dx, dy) {
      log('mouseScroll', { dx, dy })
    },
    key(code, down) {
      log('key', { code, down })
    },
    consumer(action, down) {
      if (down && ['netflix', 'prime', 'appletv', 'disney'].includes(action)) {
        log('launchApp', action)
      } else {
        log('consumer', { action, down })
      }
    },
  }

  return transport
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
