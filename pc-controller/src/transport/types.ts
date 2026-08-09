export type ConnectionState = 'idle' | 'scanning' | 'connecting' | 'connected' | 'error'

export type ControllerMode = 'touch' | 'tv' | 'game'

export type DeviceInfo = {
  id: string
  name: string
  kind: 'pc' | 'tv' | 'unknown'
  protocol?: 'bluetooth' | 'roku' | 'samsung' | 'lg' | 'bravia' | 'android_tv' | 'fire_tv' | string
  host?: string
}

export type Transport = {
  state: ConnectionState
  device: DeviceInfo | null
  error: string | null
  startScan: () => Promise<DeviceInfo[]>
  connect: (deviceId: string) => Promise<void>
  disconnect: () => Promise<void>
  mouseMove: (dx: number, dy: number) => void
  mouseButton: (button: 'left' | 'right' | 'middle', down: boolean) => void
  mouseScroll: (dx: number, dy: number) => void
  key: (code: string, down: boolean) => void
  consumer: (action: string, down: boolean) => void
  gamepad: (state: GamepadState) => void
}

export type GamepadState = {
  lx: number
  ly: number
  rx: number
  ry: number
  /** Right-stick mouse look multiplier (native HID). */
  lookGain?: number
  buttons: Record<string, boolean>
}
