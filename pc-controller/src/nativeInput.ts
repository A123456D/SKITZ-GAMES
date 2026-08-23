/** Direct WebView → Java input (bypasses Capacitor plugin bridge). */
export type NativeInput = {
  key: (code: string, down: boolean) => void
  tvKey: (code: string, down: boolean) => void
  consumer: (action: string, down: boolean) => void
  tvConsumer: (action: string, down: boolean) => void
}

export function nativeInput(): NativeInput | undefined {
  return (window as Window & { HidInput?: NativeInput }).HidInput
}

export function sendPcKey(code: string, down: boolean) {
  nativeInput()?.key(code, down)
}

export function sendTvKey(code: string, down: boolean) {
  nativeInput()?.tvKey(code, down)
}

export function sendPcConsumer(action: string, down: boolean) {
  nativeInput()?.consumer(action, down)
}

export function sendTvConsumer(action: string, down: boolean) {
  nativeInput()?.tvConsumer(action, down)
}
