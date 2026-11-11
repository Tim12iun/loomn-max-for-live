# LOOMN Max for Live

Alle Max-for-Live-Plugins von LOOMN. Jedes Plugin hat einen eigenen Ordner, `manifest.json` listet Versionen und Dateien.
Die Plugins haben einen Update-Knopf (⟳), der hier nach neuen Versionen schaut und sie in den eigenen Ordner lädt.

| Plugin | Ordner | Zweck |
|---|---|---|
| sortn | `sortn/` | Spuren erkennen, umbenennen, einfärben |
| prepn | `prepn/` | Stems pro Live-Set-Spalte rendern, Song-Paket schreiben |
| BPM Changer | `bpmchanger/` | Tempo weich ändern: Knopf (MIDI-mappbar, rundet auf ganze BPM), Rampe über Takte. Gehört auf die Main-Spur |
| chopn | `chopn/` | Sampler (Instrument): Sample reinziehen, mit der Maus Startpunkte suchen (Klick = ab dort hören), Punkte auf MIDI-Tasten legen und spielen |
| buildn | `buildn/Buildn App/` | Eigene Mac-App (kein M4L): aus prepn-Paketen und einer Vorlage ein neues Live-Set (.als) bauen. Releases in `Tim12iun/loomn-tools` (`buildn-latest`), Bau mit `scripts/release-local.sh` |

Installation: den Ordner des Plugins (z. B. `prepn`) nach
`~/Music/Ableton/User Library/Presets/Audio Effects/Max Audio Effect/MAX for LIVE 3rd Party/LOOMN-MAX4LIVE/` legen.
Jeder Plugin-Ordner hat seine eigene LIESMICH-Datei mit Installation und Bedienung.
Einstellungen: jedes Plugin legt seine eigene Datei im eigenen Ordner an (nicht im Repo). Nichts wird zwischen Plugins geteilt.

Neues Plugin = neuer Ordner auf oberster Ebene + Eintrag in `manifest.json`.

## Für Entwickler
- `manifest.json`: pro Plugin Version, Ordner (`dir`), Dateien (`files`, `amxd`) und alte Dateinamen (`obsolete`).
  Bei jedem Release Version hochzählen, sonst sieht der Update-Knopf nichts.
  Die Plugin-IDs (`setmaker-prep`, `setmaker-sort`) bleiben so, damit auch ältere Devices ihr Update finden.
- Der Update-Knopf lädt jede Datei unter genau ihrem Namen in den eigenen Ordner (überschreibt, kein „Datei (1)“).
  `.amxd` wird aus `<name>.amxd.json` selbst geschrieben. Max kann keine Dateien löschen: Dateien aus `obsolete`,
  die noch im Ordner liegen, nennt das Device nach dem Update zum Löschen im Finder.
- `src/shared/`: gemeinsame Blöcke (`loomn_update.js` für alle, `setmaker_shared.js` nur für sortn),
  per `python3 src/shared/sync_shared.py` in die Device-Scripts kopiert. `src/<plugin>/`: `.maxpat`-Quellen.
  BPM Changer und chopn: Patch wird mit `python3 src/<plugin>/build_patch.py` erzeugt (schreibt `.maxpat`, `.amxd` und `.amxd.json`).
- Update-URL in den Devices: `https://raw.githubusercontent.com/Tim12iun/loomn-max-for-live/main/`

## Performance-Regeln (für alle Devices)
- Audio: `plugin~` direkt an `plugout~`, keine weiteren MSP-Objekte. Die Devices bearbeiten keinen Ton.
  Ausnahme chopn (Instrument): Noten starten den Ton im Patch (`notein` → `coll` → `groove~`), nicht über das Script.
- Im Leerlauf läuft nichts: kein `setInterval`, kein `Task.repeat`, kein `metro` zum Abfragen. Änderungen in Live über Observer (`LiveAPI`-Callback + `property`) mitbekommen.
- Observer-Meldungen nie direkt verarbeiten, sondern per `Task.schedule` bündeln (ca. 250 ms, spätestens 1 s). Viele Änderungen = ein Neu-Einlesen.
- Keine Live-API-Arbeit (`set`, `call`) direkt im Observer-Callback, immer verschoben.
- Große Lese-/Schreibjobs in Häppchen (≈12 ms pro Schritt, dann `schedule`), Fortschritt nur senden, wenn sich die Prozentzahl ändert.
- Repeat-Tasks nur während einer laufenden Aktion (z. B. Aufnahme) und danach `cancel()`.
- Zustand an die Oberfläche nur senden, wenn er sich geändert hat (letzten JSON-String vergleichen).
- `jweb` ist ein ganzer Browser: pro Device nur eines dauerhaft. Das Schwebe-Fenster lädt seine Seite erst beim ersten Öffnen (`onebang` + `gate` im `p ui`).
- In der HTML-Seite keine Timer, Animationen oder Dauer-Neuzeichnen; neu zeichnen nur bei neuen Daten.
