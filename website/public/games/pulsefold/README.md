# Pulsefold builds

**Pulsefold is a Vite + TypeScript web game** (project at `C:\Users\PC\Projects\PulseFold`).  
**Do not unpack Godot into this folder** — Godot is only for other titles like SHIFTR.

## Play online (already wired)

Copy a fresh production build into `web/`:

```bash
cd C:\Users\PC\Projects\PulseFold
npm run build
# then copy dist/* → website/public/games/pulsefold/web/
```

PulseFold’s Vite config uses `base: "./"` so assets work under this path.

## Android install

The web build is a PWA (manifest + service worker). On the game page, **Download → Android — install** walks players through Chrome → Install app. No APK required.

## Optional downloads later

| File | Notes |
| --- | --- |
| `downloads/Pulsefold-windows.zip` | If you package a desktop wrapper |
| `downloads/Pulsefold.apk` | Optional native wrap (Capacitor / TWA) |
