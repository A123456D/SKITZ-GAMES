# Pc Controller

Phone remote for PC and Smart TV — touchpad, keyboard, and TV remote.

One React UI. The web app and Android APK render the **same** build (Capacitor WebView). Desktop preview uses a phone stage so layout matches the device.

## Run (web demo)

```bash
npm install
npm run dev
```

Open the URL Vite prints. Scan → pick a demo device → use Touch / Keys / TV.

## Android APK (same UI + real Bluetooth)

```bash
npm run build
npx cap sync android
npx cap open android
```

## Smart TV coverage

| TV / box | How it connects |
| --- | --- |
| Roku | Wi‑Fi ECP (auto-scan or manual IP) |
| Samsung Tizen | Wi‑Fi remote WebSocket (accept popup on TV) |
| LG webOS | Wi‑Fi SSAP (accept pairing on TV) |
| Sony Bravia | IP control / IRCC (enable IP control + PSK, default `0000`) |
| Google / Android TV / Shield | Wi‑Fi when available; **Bluetooth HID** is the reliable path |
| Fire TV | Bluetooth HID (and Wi‑Fi discovery when advertised) |
| Any TV that accepts a BT keyboard | Bluetooth HID |

Same Wi‑Fi as the TV is required for Wi‑Fi remotes. Streaming buttons (Netflix / Prime / Disney+ / Apple TV) launch vendor app IDs where the platform supports it.
Samsung TVs also save their Wi‑Fi MAC while connected so Power can wake them with Wake-on-LAN when **Power On with Mobile** is enabled.
The last successful TV is remembered on the phone and reconnected automatically the next time the app opens.

## Transport

`src/transport` is the control API. Web uses `demoTransport`. Android uses `bluetoothTransport` → Capacitor `BluetoothHid` plugin → `HidController`.
