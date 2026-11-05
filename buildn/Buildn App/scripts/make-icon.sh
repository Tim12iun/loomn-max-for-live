#!/bin/sh
# [intern] App-Symbol neu zeichnen (nur auf dem Mac). Ergebnis ins Repo committen.
set -e
cd "$(dirname "$0")/.."
swift scripts/make-icon.swift buildn Resources/icon-1024.png FF5A1F
mkdir -p build/AppIcon.iconset
for s in 16 32 128 256 512; do
  sips -z $s $s Resources/icon-1024.png --out build/AppIcon.iconset/icon_${s}x${s}.png >/dev/null
  sips -z $((s*2)) $((s*2)) Resources/icon-1024.png --out build/AppIcon.iconset/icon_${s}x${s}@2x.png >/dev/null
done
iconutil -c icns build/AppIcon.iconset -o Resources/AppIcon.icns
