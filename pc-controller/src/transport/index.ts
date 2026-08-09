import { Capacitor } from '@capacitor/core'
import { createBluetoothTransport } from './bluetoothTransport'
import { createDemoTransport } from './demoTransport'
import type { Transport } from './types'

export type { ConnectionState, ControllerMode, DeviceInfo, GamepadState, Transport } from './types'

export type AppTransport = Transport & {
  subscribe: (fn: () => void) => () => void
  isNative: boolean
  nativeMessage?: string
  nativeDetail?: string
  restartHid?: () => Promise<void>
  makeDiscoverable?: () => Promise<void>
}

/**
 * Native Android → real Bluetooth HID.
 * Web → demo transport (same UI).
 */
export function createTransport(): AppTransport {
  if (Capacitor.isNativePlatform()) {
    return createBluetoothTransport() as AppTransport
  }
  const t = createDemoTransport() as AppTransport
  t.isNative = false
  return t
}
