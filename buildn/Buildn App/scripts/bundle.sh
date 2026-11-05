#!/bin/sh
# Baut Buildn.app und Buildn.zip in build/.   BUILD=12 scripts/bundle.sh
set -e
VERSION="${VERSION:-0.1}"
BUILD="${BUILD:-${1:-0}}"
UPDATE_REPO="${UPDATE_REPO:-Tim12iun/loomn-tools}"
cd "$(dirname "$0")/.."
ARCHS="--arch arm64"
if xcodebuild -version >/dev/null 2>&1; then ARCHS="--arch arm64 --arch x86_64"; fi   # universal nur mit Xcode
swift build -c release $ARCHS
BIN="$(swift build -c release $ARCHS --show-bin-path)/Buildn"

APP=build/Buildn.app
rm -rf build && mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/Buildn"
[ -f Resources/AppIcon.icns ] && cp Resources/AppIcon.icns "$APP/Contents/Resources/"
[ -d Resources/Fonts ] && cp -R Resources/Fonts "$APP/Contents/Resources/Fonts"
cp -R Resources/Web "$APP/Contents/Resources/Web"
# Web-Inhalt muss in Safari 17.3 (macOS 14.3) laufen: nichts Neueres verwenden
if grep -rEn 'withResolvers|Object\.groupBy|Map\.groupBy|Array\.fromAsync|Iterator\.from|Promise\.try|URL\.canParse|AbortSignal\.any|@starting-style|field-sizing|light-dark\(|@scope|anchor-name' --include='*.html' --include='*.js' --include='*.css' Resources/Web; then
  echo "FEHLER: Web-Inhalt nutzt Funktionen, die es auf macOS 14 noch nicht gibt"; exit 1
fi
cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>buildn</string>
  <key>CFBundleDisplayName</key><string>buildn</string>
  <key>CFBundleIdentifier</key><string>de.loomn.buildn</string>
  <key>CFBundleExecutable</key><string>Buildn</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$BUILD</string>
  <key>LoomnUpdateRepo</key><string>$UPDATE_REPO</string>
  <key>LoomnLatestTag</key><string>buildn-latest</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>ATSApplicationFontsPath</key><string>Fonts</string>
  <key>CFBundleDevelopmentRegion</key><string>de</string>
</dict></plist>
EOF
# Läuft auf jedem Mac ab macOS 14 – sonst abbrechen
MINOS=$(vtool -show-build "$APP/Contents/MacOS/Buildn" 2>/dev/null | awk '/minos/{print $2; exit}')
if [ "$MINOS" != "14.0" ]; then echo "FEHLER: App verlangt macOS $MINOS statt 14.0"; exit 1; fi
codesign --force --deep --sign - "$APP"
codesign --verify --verbose "$APP"
ditto -c -k --keepParent "$APP" build/Buildn.zip
echo "fertig: $APP ($VERSION · Build $BUILD)"
