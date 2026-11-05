#!/bin/sh
# Baut Buildn auf diesem Mac und veröffentlicht es in Tim12iun/loomn-tools (Tag buildn-v0.1.<Build>, Buildn.zip + version.json)
set -e
cd "$(dirname "$0")/.."
REPO=Tim12iun/loomn-tools
PREFIX=buildn-v0.1.
GH="${GH:-gh}"; command -v "$GH" >/dev/null || GH=/opt/homebrew/bin/gh

"$GH" auth status >/dev/null 2>&1 || { echo "gh ist nicht angemeldet: im Terminal  gh auth login --web"; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "Nur vom Branch main veröffentlichen."; exit 1; }

# nur saubere, hochgeladene Stände veröffentlichen (auch keine halbfertigen Änderungen anderer Sitzungen)
if [ -n "$(git status --porcelain -- .)" ]; then echo "Erst committen, dann veröffentlichen."; exit 1; fi
# Zwei-Mac-Prinzip: erst den Stand des anderen Macs holen, dann pushen
git pull -q --ff-only origin main || { echo "Stand weicht vom Repo ab: erst zusammenführen."; exit 1; }
git push -q origin main

newest() { "$GH" release list -R $REPO --limit 1000 --json tagName -q "[.[] | select(.tagName | startswith(\"$PREFIX\")) | .tagName | ltrimstr(\"$PREFIX\") | tonumber] | max // 0"; }
last=$(newest)
BUILD=$((last + 1)); echo "Build $BUILD"

BUILD=$BUILD scripts/bundle.sh
build/Buildn.app/Contents/MacOS/Buildn --selbsttest

prev="$PREFIX$last"; prevsha=""; tmp=$(mktemp -d)
if [ "$last" -gt 0 ] && "$GH" release download "$prev" -R $REPO -p version.json -O "$tmp/prev.json" 2>/dev/null; then prevsha=$(jq -r '.commit // empty' "$tmp/prev.json"); fi
if [ -n "$prevsha" ] && git cat-file -e "$prevsha" 2>/dev/null; then range="$prevsha..HEAD"; else range="-8"; fi
notes=$(git log $range --no-merges --format=%s -- . | grep -v '\[intern\]' | awk '!seen[$0]++' | head -12 | jq -R . | jq -s .)
cp build/Buildn.zip "$tmp/"
# Hat inzwischen eine andere Sitzung veröffentlicht? Dann abbrechen statt dieselbe Nummer doppelt zu vergeben.
if [ "$(newest)" != "$last" ]; then echo "Gerade hat jemand anderes veröffentlicht. Neuesten Stand ziehen und Skript neu starten."; exit 1; fi
jq -n --arg v "0.1" --argjson b $BUILD --arg d "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson n "$notes" \
      --arg s "$(shasum -a 256 "$tmp/Buildn.zip" | cut -d' ' -f1)" --arg c "$(git rev-parse HEAD)" \
      '{name:"Buildn", version:$v, build:$b, date:$d, notes:$n, sha256:$s, file:"Buildn.zip", commit:$c}' > "$tmp/version.json"
jq -r '.notes | map("- " + .) | join("\n")' "$tmp/version.json" > "$tmp/notes.md"
"$GH" release create "$PREFIX$BUILD" "$tmp/Buildn.zip" "$tmp/version.json" -R $REPO \
  --title "buildn 0.1 (Build $BUILD)" --notes-file "$tmp/notes.md"

# fester Zeiger für die Update-Prüfung (erst jetzt, wenn das Release fertig ist)
"$GH" release view buildn-latest -R $REPO >/dev/null 2>&1 || "$GH" release create buildn-latest -R $REPO --prerelease \
  --title "buildn: aktuelle Version (nur für die Update-Prüfung)" --notes "Enthält nur version.json der neuesten Version. Bitte nicht löschen."
"$GH" release upload buildn-latest "$tmp/version.json" -R $REPO --clobber

# Kommt das Update an und ließe es sich installieren? (mit Anmeldung, GitHub-Zwischenspeicher bis 3 min)
export LOOMN_UPDATE_TEST_TOKEN="$("$GH" auth token 2>/dev/null)"
for i in $(seq 1 18); do build/Buildn.app/Contents/MacOS/Buildn --updatetest $BUILD && exit 0; sleep 10; done
exit 1
