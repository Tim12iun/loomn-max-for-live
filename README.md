# LOOMN Max for Live

Alle Max-for-Live-Plugins von LOOMN. Jedes Plugin hat einen eigenen Ordner, `manifest.json` listet Versionen und Dateien.
Die Plugins haben einen Update-Knopf (⟳), der hier nach neuen Versionen schaut und sie in den eigenen Ordner lädt.

| Plugin | Ordner | Zweck |
|---|---|---|
| SetMaker Sort | `SetMaker/sortn` | Spuren erkennen, umbenennen, einfärben |
| SetMaker Prep | `SetMaker/prepn` | Stems pro Live-Set-Spalte rendern, Song-Paket schreiben |

Installation: Ordner `SetMaker` nach `~/Music/Ableton/User Library/Presets/Audio Effects/Max Audio Effect/LOOMN Max for Live/` legen.
Gemeinsame Einstellungen: `SetMaker/setmaker_settings.json` (wird automatisch angelegt, nicht im Repo).

## Für Entwickler
- `manifest.json`: Version + Dateiliste pro Plugin. Bei jedem Release Version hochzählen, sonst sieht der Update-Knopf nichts.
- `src/setmaker/`: gemeinsame Blöcke (`setmaker_shared.js`, `loomn_update.js`), die per Build in die Device-Scripts kopiert werden, plus `.maxpat`-Quellen.
- Update-URL in den Devices: `https://raw.githubusercontent.com/Tim12iun/loomn-max-for-live/main/`
