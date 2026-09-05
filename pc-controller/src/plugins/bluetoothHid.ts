import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export type HidNativeState = {
  connection:
    | 'Unsupported'
    | 'BluetoothOff'
    | 'Idle'
    | 'Registering'
    | 'WaitingForHost'
    | 'Connected'
    | 'Error'
  hostName: string | null
  hostAddress: string | null
  message: string
  detail: string
  profileAvailable: boolean
}

export type BondedDevice = {
  id: string
  name: string
  kind: 'pc' | 'tv' | 'unknown'
}

export interface BluetoothHidPlugin {
  ensurePermissions(): Promise<{ granted: boolean }>
  start(): Promise<HidNativeState>
  stop(): Promise<HidNativeState>
  restart(): Promise<HidNativeState>
  makeDiscoverable(): Promise<{ ok: boolean; state: HidNativeState }>
  getState(): Promise<HidNativeState>
  listBonded(): Promise<{ devices: BondedDevice[] }>
  connect(options: { address: string }): Promise<HidNativeState>
  mouseMove(options: { dx: number; dy: number }): Promise<void>
  mouseButton(options: { button: string; down: boolean }): Promise<void>
  mouseScroll(options: { dx?: number; dy: number }): Promise<void>
  key(options: { code: string; down: boolean }): Promise<void>
  tapKey(options: { code: string; shift?: boolean }): Promise<void>
  setKeyboardVisible(options: { visible: boolean }): Promise<void>
  consumer(options: { action: string; down: boolean }): Promise<void>
  typeText(options: { text: string }): Promise<void>
  isTyping(): Promise<{ typing: boolean }>
  addListener(
    eventName: 'hidState',
    listenerFunc: (state: HidNativeState) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'keyboardClosed',
    listenerFunc: () => void,
  ): Promise<PluginListenerHandle>
}

export const BluetoothHid = registerPlugin<BluetoothHidPlugin>('BluetoothHid')
