# RIOT CUBE

Twist slices. Rip sticker matches. Clear the riot.

## Two runtimes

| Path | Use |
|---|---|
| **Web** (`riot-cube/` Vite) | Browser + PWA |
| **Godot** (`riot-cube/godot/`) | **Android (priority)** + desktop preview |

Same Phase-1 rules in both. Godot is the native mobile ship path.

## Web play

```bash
cd riot-cube
npm install
npm run ship
```

Then open `/games/riot-cube/play/` on the site.

Dev: `npm run dev` (port 5175).

## Rules (web)

- **6 sticker kinds** on a 6×6 face (dense enough to match)
+ **6 live sticker kinds** at a time, rotating through all sticker art each generation
- **Swipe** or use the **bottom dock** to twist · **side chevrons** flip the cube
- **Dry twists are free** · **matching clears** and **flips** each cost a move
- Only the face you look at scores
- Three levels with rising pressure
+ Six levels with a clear difficulty climb

## Godot / Android

Open `riot-cube/godot/` in **Godot 4.7**. See `godot/README.md` for export steps.

## Roadmap

1. **Now:** 3D cube (6 faces) + row/column twists on the facing face, goals + score stars (web)
2. **Later:** Port economy + levels to Godot for Android; true Rubik-style slice turns across faces
