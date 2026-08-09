import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export type TvDevice = {
  id: string
  name: string
  host: string
  protocol: string
  kind: 'tv'
}

export type TvState = {
  connected: boolean
  name: string | null
  protocol: string | null
  message?: string
}

export interface TvRemotePlugin {
  ensurePermissions(): Promise<{ granted: boolean }>
  scan(): Promise<{ devices: TvDevice[] }>
  connect(options: { id: string; psk?: string }): Promise<{ ok: boolean; name?: string; protocol?: string }>
  disconnect(): Promise<void>
  getState(): Promise<TvState>
  sendAction(options: { action: string; down: boolean }): Promise<{ ok: boolean }>
  sendKey(options: { code: string; down: boolean }): Promise<{ ok: boolean }>
  launchApp(options: { action: string }): Promise<{ ok: boolean }>
  addListener(
    eventName: 'tvState',
    listenerFunc: (state: TvState) => void,
  ): Promise<PluginListenerHandle>
}

export const TvRemote = registerPlugin<TvRemotePlugin>('TvRemote')
