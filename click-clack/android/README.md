# Skitz Controller — Android

Bluetooth HID mouse + keyboard remote (`games.skitz.clickclack`).

## Build

Requires JDK 17+ and Android SDK (API 35).

```bat
cd click-clack\android
gradlew.bat :app:assembleRelease
```

Release APK:

`app/build/outputs/apk/release/app-release.apk`

Copy to the site:

`website/public/apps/click-clack/downloads/click-clack.apk`

## Notes

- minSdk 28 (BluetoothHidDevice)
- Some OEMs disable the HID Device profile; check in-app status
- Bluetooth name: **Skitz Controller**
