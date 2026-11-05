# LOOMN Max for Live

Alle Max-for-Live-Plugins von LOOMN. Jedes Plugin hat einen eigenen Ordner, `manifest.json` listet Versionen und Dateien.
Die Plugins haben einen Update-Knopf (⟳), der hier nach neuen Versionen schaut und sie in den eigenen Ordner lädt.

| Plugin | Ordner | Zweck |
|---|---|---|
| sortn | `SetMaker/sortn` | Spuren erkennen, umbenennen, einfärben |
| SetMaker Prep | `SetMaker/prepn` | Stems pro Live-Set-Spalte rendern, Song-Paket schreiben |

Installation: Ordner `SetMaker` nach `~/Music/Ableton/User Library/Presets/Audio Effects/Max Audio Effect/LOOMN Max for Live/` legen.
Einstellungen: jedes Plugin legt seine eigene Datei im eigenen Ordner an (nicht im Repo).

## Für Entwickler
- `manifest.json`: Version + Dateiliste pro Plugin. Bei jedem Release Version hochzählen, sonst sieht der Update-Knopf nichts.
- `src/setmaker/`: gemeinsame Blöcke (`setmaker_shared.js`, `loomn_update.js`), die per Build in die Device-Scripts kopiert werden, plus `.maxpat`-Quellen.
- Update-URL in den Devices: `https://raw.githubusercontent.com/Tim12iun/loomn-max-for-live/main/`

## Performance-Regeln (für alle Devices)
- Audio: `plugin~` direkt an `plugout~`, keine weiteren MSP-Objekte. Die Devices bearbeiten keinen Ton.
- Im Leerlauf läuft nichts: kein `setInterval`, kein `Task.repeat`, kein `metro` zum Abfragen. Änderungen in Live über Observer (`LiveAPI`-Callback + `property`) mitbekommen.
- Observer-Meldungen nie direkt verarbeiten, sondern per `Task.schedule` bündeln (ca. 250 ms, spätestens 1 s). Viele Änderungen = ein Neu-Einlesen.
- Keine Live-API-Arbeit (`set`, `call`) direkt im Observer-Callback, immer verschoben.
- Große Lese-/Schreibjobs in Häppchen (≈12 ms pro Schritt, dann `schedule`), Fortschritt nur senden, wenn sich die Prozentzahl ändert.
- Repeat-Tasks nur während einer laufenden Aktion (z. B. Aufnahme) und danach `cancel()`.
- Zustand an die Oberfläche nur senden, wenn er sich geändert hat (letzten JSON-String vergleichen).
- `jweb` ist ein ganzer Browser: pro Device nur eines dauerhaft. Das Schwebe-Fenster lädt seine Seite erst beim ersten Öffnen (`onebang` + `gate` im `p ui`).
- In der HTML-Seite keine Timer, Animationen oder Dauer-Neuzeichnen; neu zeichnen nur bei neuen Daten.
