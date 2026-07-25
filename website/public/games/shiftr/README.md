# SHIFTR web build

SHIFTR’s product path is the Vite + TypeScript game in `/web` (not the frozen Godot prototype).

## Update the hosted build

```bash
cd web
npm install
npm run ship
```

That builds with `base: "./"` and copies `dist/*` → `website/public/games/shiftr/web/`.

Then commit + push the site so Cloudflare Pages redeploys.
