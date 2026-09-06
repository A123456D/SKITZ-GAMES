#!/usr/bin/env bash
# Build Gravity Drift: copy clean source -> deployable web/ folder.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$SRC/../../public/games/gravity-drift/web"
mkdir -p "$DEST"
rm -rf "$DEST"/*
cp -r "$SRC"/. "$DEST"/
rm -f "$DEST/build.sh"
echo "built -> $DEST"
