# SKITZ website

Static Astro site for **SKITZ games & apps**. Play online (including iPhone Safari) or download free builds when available.

First (and currently only) title: **Pulsefold** — a Vite/TypeScript canvas game from `C:\Users\PC\Projects\PulseFold`. **No Godot required** for Pulsefold.

## Quick start

```bash
cd website
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

Node.js 22.12+ required.

## Layout

```
website/
  src/content/games/pulsefold.md
  public/games/pulsefold/web/          # PulseFold Vite dist (relative base)
  public/games/pulsefold/downloads/    # optional zip / apk later
  public/images/skitz-logo.png
  public/images/pulsefold-logo.png     # from PulseFold/public/assets/
  public/_headers
```

## Refresh the Pulsefold web build

```bash
cd C:\Users\PC\Projects\PulseFold
npm run build
Remove-Item -Recurse -Force C:\Users\PC\Projects\SHIFTR\website\public\games\pulsefold\web\*
Copy-Item -Recurse .\dist\* C:\Users\PC\Projects\SHIFTR\website\public\games\pulsefold\web\
```

## Cloudflare Pages

| Setting | Value |
| --- | --- |
| Root directory | `website` |
| Build command | `npm run build` |
| Output | `dist` |
| Node | `22` (`NODE_VERSION=22`) |

See [CLOUDFLARE.md](./CLOUDFLARE.md).
