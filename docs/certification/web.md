# Certification — Web (itch.io / PWA)

## Export

- [ ] Web preset export to `exports/web/`
- [ ] PWA icons 144 / 180 / 512 set when branding ready
- [ ] HTTPS host (itch or own CDN)
- [ ] COOP/COEP headers if Godot threaded build requires SharedArrayBuffer

## itch.io

- [ ] Kind: HTML
- [ ] Embed dimensions / mobile friendly flags
- [ ] Shared files / version notes
- [ ] Pricing / donations match studio policy

## PWA

- [ ] Installable on Android Chrome (manifest valid)
- [ ] Offline shell loads; document save limits (IDBFS)
- [ ] Orientation portrait preferred

## Gameplay

- [ ] Touch + keyboard work in browser
- [ ] Gamepad via browser APIs (`BoardInputController`)
- [ ] Audio unlock after first gesture (browser autoplay policy)
- [ ] Locale CSV loads; language switch in Settings

## Privacy / storage

- [ ] Consent gate appears first visit
- [ ] Clearing site data wipes saves — disclose in itch description
- [ ] Analytics only after opt-in; no third-party without disclosure

## Perf

- [ ] Mid laptop Chrome 60 FPS playable scene
- [ ] Mobile Safari smoke (iOS PWA quirks)
