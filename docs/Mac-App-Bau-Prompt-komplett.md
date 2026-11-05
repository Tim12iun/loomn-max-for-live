<!--
Versionskopf
Datum/Uhrzeit: 05.11.2026, 17:00 (MEZ)
editn-Build: Code-Stand vom 02.11.2026 (Commit 3d45544), letzter bekannter Release-Build 95+
vorausgesetztes archivn-Update: keines (betrifft nur App-Bau und Updates, nicht das Andocken)
Übergabe: „Mac-App-Bau komplett (App, Symbol, Updates)“, Nr. 3 / Fassung 3 (ersetzt Update-Engine-Prompt-neues-Tool.md vom 05.11. und Update-und-App-Bau-Prompt*.md vom 21.10.)
-->

# Übergabe: Ein Tool als echte Mac-App bauen – mit Symbol, Datenordner und automatischen Updates

Das ist der **volle Prompt**: Er beschreibt komplett, wie editn als Mac-App gebaut ist, und lässt ein anderes Tool genauso entstehen. App-Gerüst, App-Symbol, Signierung ohne Developer-Konto, Datenordner, Einstellungen, macOS 14+, Bau-Skript, Veröffentlichen und Update-Funktion stecken alle hier drin. Ein weiterer Prompt ist nicht nötig.

### Reihenfolge (so arbeitest du ihn ab)

1. **Projekt ansehen und Platzhalter festlegen** (Tabelle unten). Nur wenn etwas fehlt, LION einmal mit Vorschlag fragen.
2. **„Fehler, die schon passiert sind“ lesen.** Jede dieser Regeln gilt.
3. **Repo:** privates Code-Repo prüfen oder anlegen (`gh`), Ordner `{{APPDIR}}` mit Swift Package anlegen (Abschnitt 2).
4. **App-Gerüst:** `AppInfo.swift`, App/AppDelegate, Datenordner, Selbsttests (Abschnitte 3 und 8). Ist das Tool bisher HTML/Web, läuft der Inhalt in einer `WKWebView` in der App; hat es einen lokalen Server, startet und beendet die App ihn selbst.
5. **App-Symbol** zeichnen und als `Resources/AppIcon.icns` ablegen (Abschnitt 6a).
6. **Updates:** `ToolUpdater.swift` und `UpdateBanner.swift` wortgleich übernehmen (Abschnitte 4 und 5).
7. **Bauen:** `scripts/bundle.sh` (Abschnitt 6), App starten, Selbsttests laufen lassen.
8. **Veröffentlichen:** `scripts/release-local.sh` (Abschnitt 7). Danach einmal Ende-zu-Ende testen: alte Build-Nummer lokal bauen, Update auf den neuen Build kommen lassen.
9. **Auf macOS 14 prüfen:** auf dem zweiten Mac (macOS 14.3) bauen und echt starten, inklusive erstem Start.
10. **App zu LION:** in `/Applications` legen (bzw. Download-Link geben) und kurz melden (Abschnitt 10).

Wenn LION ein Loomn-Design für Startbildschirm und Oberfläche will: Vorgabe in `design/Design-Language-Prompt.md` (Projektordner) bzw. „Update-Funktion und Startbildschirm wie in Loomn Cut“. Das Update-Modell hier hängt nicht davon ab.

**Fassung 3 vom 05.11.2026** (Fassung 2 plus App-Symbol und Bau-Reihenfolge). Neu gegenüber Fassung 1 (21.10.): Abschnitt **„Fehler, die schon passiert sind“** (bitte zuerst lesen), Start-Dialoge unter macOS 14, Bau mit Swift 5.10 auf dem zweiten Mac, Zwei-Mac-Ablauf und Schutz vor gleichzeitigem Veröffentlichen im Skript.

Du baust dieses Tool als **echte Mac-App** und gibst ihm das Update-Modell, das in editn läuft. Die Schritte arbeitest du der Reihe nach ab, ohne LION vorher etwas ausfüllen zu lassen. LION schreibst du auf Deutsch, kurz und ohne Technikbegriffe. Nachfragen bei LION gibt es nur, wo es ausdrücklich „LION fragen“ heißt, und dann einmal gesammelt.

## Platzhalter: legst du selbst fest, nicht LION

LION kopiert diesen Text ohne weitere Angaben hinein. Die Werte unten bestimmst **du selbst** aus dem vorhandenen Projekt (Ordnername, README, vorhandene Info.plist, `git remote -v`, bisheriger App-Name). Danach ersetzt du sie im ganzen Code durch echte Werte. Nur wenn sich ein Wert wirklich nicht ableiten lässt, fragst du LION **einmal**, kurz und mit Vorschlag (z. B. „Soll die App im Dock ‚postn‘ heißen? (Vorschlag)“).

| Platzhalter | Bedeutung | So leitest du ihn ab |
|---|---|---|
| `{{APP}}` | interner Name: Programmdatei, `.app`, ZIP, `name` in version.json. **Nie mehr ändern.** | bisheriger Name des Tools, ein Wort ohne Leerzeichen, z. B. `Postn` |
| `{{BRAND}}` | sichtbarer Name in Dock, Menü und Startbildschirm | Loomn-Stil: klein, endet auf „n“ (postn, editn, archivn). Gibt es schon einen, den nehmen. Sonst LION fragen, mit Vorschlag. |
| `{{BUNDLE_ID}}` | Bundle-ID. **Nie mehr ändern.** | vorhandene behalten, sonst `de.loomn.<brand>` |
| `{{KURZ}}` | Kurzname für die Release-Tags | `{{BRAND}}` klein. Muss in `Tim12iun/loomn-tools` frei sein: `gh release list -R Tim12iun/loomn-tools --limit 1000`. Schon vergeben sind u. a. `beatmosh`, `loomn-cut`, `loomn-beat`, `loomn-archiv`, `cut`. |
| `{{RELEASE_REPO}}` | öffentliches Repo für die fertigen Apps | immer `Tim12iun/loomn-tools` |
| `{{CODE_REPO}}` | privates Repo mit dem Quellcode | `git remote -v`. Gibt es keins: privates Repo `Tim12iun/<kurz>` mit `gh repo create --private` anlegen (vorher `gh auth status` prüfen; fehlt die Anmeldung, LION einmal bitten, im Terminal `gh auth login --web` einzugeben). |
| `{{APPDIR}}` | Ordner der App im Repo | `<APP> App` neben dem vorhandenen Code |

Tags heißen `{{KURZ}}-v0.1.<Build>`, der feste Zeiger heißt `{{KURZ}}-latest`.

Hat das Tool schon eine eigene Update-Funktion oder einen eigenen App-Bau, ersetzt du sie vollständig durch diesen, statt beides zu mischen. Ist das Tool noch keine Mac-App (z. B. HTML, Python, Electron), machst du es zu einer: Web-Inhalt läuft in einer WKWebView in der App, ein lokaler Server wird von der App selbst gestartet und beendet.


## Fehler, die schon passiert sind (nicht wiederholen)

Alles hier ist bei editn wirklich passiert und wurde mühsam behoben. Wer neu anfängt, baut genau diese Fehler gern wieder ein. Jede Zeile: was schiefging, und die Regel, die es verhindert. Der Code weiter unten hält sich schon daran; weiche nicht davon ab, ohne den Grund hier zu kennen.

**Update-Ablauf**
1. *Update „installierte“ endlos.* Ein offenes Update-Fenster (modaler Dialog) hielt die App vom Beenden ab, das Austausch-Skript wartete ewig. → Keine modalen Dialoge im Update-Ablauf, nur die Karte oben rechts.
2. *Wieder endlos „installiert“.* Beim Beenden wollte die App noch speichern und blieb hängen. → Beenden speichert höchstens 4 Sekunden, dann wird trotzdem beendet (`.terminateLater` + Zeitgrenze). Kein `withTaskGroup` o. ä., das auf eine hängende Aufgabe wartet. Ist nichts offen, sofort `.terminateNow`.
3. *Alte Builds behalten ihre Fehler.* Wer einen Build mit kaputtem Updater installiert hat, kommt über das Auto-Update evtl. nicht weg und braucht einmal einen Download-Link plus ⌥⌘Esc. → Updater von Anfang an fertig bauen und vor dem ersten Release Ende-zu-Ende testen (alte Kopie → neues Release).
4. *Update erst nach Klick geladen, dauerte lange.* → Im Hintergrund vorladen und prüfen; die Karte erscheint erst, wenn alles fertig ist. „Aktualisieren“ tauscht nur noch aus (ca. 2 s).
5. *Prüfung alle 30 Minuten war LION zu träge.* → Beim Start, jede Minute und bei jedem Wechsel zur App (höchstens alle 10 s).
6. *GitHub-API sperrte die Prüfung* (60 Abrufe/Stunde/IP ohne Konto, eine App mit Minutentakt schöpft das allein aus, zwei Macs im selben Netz erst recht). → Hauptweg ist der Datei-Download `…/releases/download/<kurz>-latest/version.json`, die API nur als Rückfall.
7. *Neues Update kam bis zu einer Minute zu spät, Update-Test im Skript scheiterte 6-mal* (GitHub-Zwischenspeicher lieferte noch die alte version.json). → `?t=<Zeitstempel>` und `Cache-Control: no-cache` an die Zeiger-URL; Update-Test im Skript bis zu 3 Minuten wiederholen.
8. *Update-Karte mit vielen Änderungen war so lang, dass „Aktualisieren“ nicht erreichbar war.* → Liste ab 5 Punkten oder 260 Zeichen in 200 pt scrollen, Knöpfe immer sichtbar, auch bei 2/3 Bildschirmbreite und niedrigem Fenster.
9. *Umstieg auf ein neues Tag-Schema* hätte installierte Versionen abgehängt. → Tag-Präfix, Bundle-ID, `{{APP}}` und Zeiger-Name von Anfang an endgültig festlegen. Muss doch etwas wechseln: zuerst ein Übergangs-Release, das die alte Version noch findet.
10. *Tag-Präfix war schon von einem anderen Tool belegt* (`loomn-beat-b`). → Vor dem ersten Release `gh release list -R Tim12iun/loomn-tools --limit 1000` prüfen.
11. *Release „<kurz>-latest“ gelöscht = alle Apps sehen nie wieder ein Update.* → Nie löschen, nur `version.json` darin mit `--clobber` ersetzen, und zwar erst, wenn das eigentliche Release fertig hochgeladen ist.

**Veröffentlichen**
12. *GitHub Actions stoppte* (freie Mac-Minuten im privaten Repo aufgebraucht, „spending limit“). → Kein Actions-Workflow. Bauen und veröffentlichen nur mit `scripts/release-local.sh` auf dem Mac.
13. *Eine Arbeitsdatei (Prompt) wäre als Commit-Betreff in den Änderungen der Update-Karte gelandet.* → Fremde Dateien nicht ins Repo; interne Commits mit `[intern]` markieren. Betreffzeilen sind LIONs Änderungsliste: deutsch und verständlich („Vorschau ruckelt nicht mehr“).
14. *Mehrere Claude-Sitzungen im selben Ordner.* Uncommittete Änderungen anderer Threads wären mit ins Release geraten, und zwei gleichzeitige Releases hätten dieselbe Build-Nummer gewollt. → Nur eigene Hunks committen (`git add -p`, neue Dateien mitnehmen), Skript startet nur bei sauberem Ordner, und vorher nachsehen, ob gerade jemand releast (neuester Tag, siehe Skript).

**Einstellungen und Datenordner**
15. *LION musste den Datenordner mehrmals neu wählen.* Ursache: Selbsttests haben LIONs echte `UserDefaults` auf einen Temp-Ordner gestellt und bei parallelen Tests oder Absturz nicht zurückgesetzt. → Im ganzen App-Code nie `UserDefaults.standard` direkt, immer `appDefaults`; Tests bekommen eine eigene, leere Ablage.
16. *Ort des Datenordners ging trotzdem verloren.* → Dreifach merken: Pfad, Lesezeichen (bookmark), Rückfall-Datei in `~/Library/Application Support/{{BRAND}}/`.
17. *Umbenennung der Marke* (Beatmosh → moshn → editn). → Nur `{{BRAND}}` ändern. Bundle-ID, `{{APP}}`, Dateiname der `.app`, Tags und Zeiger bleiben, sonst legt das Update eine zweite App daneben oder kommt gar nicht an. Alte Datenordner-Markierungen weiter erkennen.
18. *Selbsttests lasen echte Ordner des Macs* (z. B. Plug-in-Ordner in plugn). → Tests arbeiten nur in Temp-Ordnern.

**macOS 14 und der zweite Mac**
19. *„Läuft auf Sonoma“ nur am Code geprüft, nicht echt getestet.* Auf dem zweiten MacBook (macOS 14.3) schloss sich die App beim ersten Start sofort: Der Datenordner-Dialog lief direkt in `onAppear`, macOS 14 unterdrückt dort `NSAlert.runModal()` (kommt sofort zurück), und die App wertete das als „Beenden“. → Dialoge beim Start erst nach dem Fensteraufbau (`DispatchQueue.main.async`), und nur der Knopf „Beenden“ beendet; ein unterdrückter Dialog wird nach 0,5 s erneut gezeigt.
20. *Bau scheiterte auf dem zweiten Mac.* Dort gibt es nur die Command Line Tools mit Swift 5.10. → Code muss auch mit Swift 5.10 bauen: in WebKit-Delegate-Methoden kein `@MainActor` in den Rückruf-Typen (`decisionHandler`, `replyHandler`, `completionHandler`; sonst Fehler oder WebKit ignoriert die Methode still), Variablen, die in `Task.detached` geändert werden, als `nonisolated(unsafe) var`, in einer `Task` keine veränderlichen Variablen von außen einfangen (vorher `let` kopieren).
21. *Funktionen jüngerer macOS-Versionen schleichen sich ein.* → `bundle.sh` prüft `minos = 14.0` und (bei Web-Inhalt) verbotene JS/CSS-Funktionen nach Safari 17.3; der Bau bricht ab. Fällt für macOS 14 etwas weg: LION vorher fragen.
22. *Erster Start auf einem neuen Mac blockiert* (nicht von Apple signiert). → Einmalig Rechtsklick › Öffnen bzw. „Trotzdem öffnen“; die App entfernt bei Updates die Quarantäne selbst, danach fragt macOS nicht mehr.

**Umgang mit LION**
23. *Zu früh „fertig“ gesagt.* → Immer dazusagen, was echt getestet wurde und was nur gebaut/am Code geprüft ist. Klicks am echten Fenster, Mausrad, Trackpad und macOS 14 sind ohne LION meist nicht getestet: so benennen.
24. *LION musste Repo, Token und Login von Hand anlegen und hat nachgefragt.* → Alles selbst erledigen, was mit `gh` geht. Nur wenn `gh auth status` fehlschlägt: LION einmal bitten, `gh auth login --web` im Terminal einzugeben. Tokens nie in den Chat.

---

## 0. Feste Regeln

- **Kostenlos, für immer:** kein bezahlter Apple-Developer-Account, keine Abos, keine bezahlten Dienste, kein Server. Die App wird ad hoc signiert (`codesign --sign -`).
- **Ohne Claude lauffähig:** Zur Laufzeit braucht die App weder Claude noch eine KI-API noch ein Konto. Die einzige Netzverbindung ist die Update-Prüfung. Ohne Internet bleibt sie still.
- **Eine Version für alle Macs ab macOS 14 (Sonoma):** gleiche Funktionen, gleiche Updates zur selben Zeit. Müsste für macOS 14 etwas wegfallen: LION fragen, bevor du es entfernst.
- **Nur Apple Silicon** (arm64). Ohne Xcode gibt es keinen Intel-Build. Mit Xcode baut das Skript automatisch universal.
- **Update nur nach Zustimmung:** Die App lädt still im Hintergrund vor, installiert wird erst nach Klick auf „Aktualisieren“.
- **Nutzerdaten liegen nie in der App.** Ein Update oder das Ersetzen der App löscht nichts.
- **Keine GitHub Actions** fürs Bauen: Die freien Mac-Minuten privater Repos sind schnell aufgebraucht. Gebaut und veröffentlicht wird auf LIONs Mac mit `scripts/release-local.sh`.
- **Zwei-Mac-Prinzip:** LION arbeitet abwechselnd auf dem Haupt-Mac (MacBook-Pro-von-Design, macOS neu) und einem zweiten MacBook Pro (M3 Pro, macOS 14.3). Alles, was zum Bauen und Veröffentlichen nötig ist, liegt im Repo (Skripte, Symbol, Schriften, Ressourcen), nichts nur lokal. Es arbeitet immer nur ein Mac: vor dem Wechsel alles committen und pushen, auf dem anderen zuerst `git pull --ff-only`. LION sagt an, von welchem Mac gearbeitet wird. Build-Nummern kommen aus den Releases, nie aus einer lokalen Datei, damit beide Macs dieselbe Zählung haben.
- **Auf beiden Macs bauen können:** Der Code muss mit dem neuesten Swift und mit Swift 5.10 (Command Line Tools auf macOS 14.3) bauen. Vor dem ersten Release einmal auf dem zweiten Mac bauen und starten.

---

## 1. Wie es sich anfühlen muss (Maßstab)

**Prüfen**
- Beim Start, danach **jede Minute** und jedes Mal, wenn man **zur App wechselt** (höchstens alle 10 s).
- Die App lädt dafür nur eine kleine Datei: `https://github.com/{{RELEASE_REPO}}/releases/download/{{KURZ}}-latest/version.json?t=<Zeitstempel>`. Das ist ein normaler Datei-Download und **kein** API-Abruf, deshalb gilt kein Abruflimit, auch mit mehreren Macs im selben Netz. `?t=` umgeht den kurzen Zwischenspeicher von GitHub.
- Nur wenn diese Datei fehlt, fällt die App auf die GitHub-API zurück. Ohne Konto erlaubt die API nur **60 Abrufe pro Stunde und IP, für alle Tools zusammen**, deshalb nie als Hauptweg.
- Ohne Internet oder bei Fehlern wird **nichts angezeigt**. Manuell (Menü „Nach Updates suchen …“ und Klick auf die Versionszeile) gibt es immer eine Antwort, auch „{{BRAND}} ist aktuell (0.1 · Build 12)“.

**Vorladen, dann anbieten**
- Gibt es einen neueren Build, lädt die App im Hintergrund die ZIP, prüft SHA-256, entpackt, prüft die Bundle-ID und die Signatur (`codesign --verify --deep --strict`) und entfernt die Quarantäne.
- **Erst danach** erscheint die Karte oben rechts, 360 pt breit, ohne zu blockieren:
  - UPDATE VERFÜGBAR
  - Version 0.1 · Build 13
  - INSTALLIERT: 0.1 · BUILD 12
  - bis zu 12 Änderungen. Ab 5 Punkten oder 260 Zeichen scrollt die Liste in 200 pt Höhe, die Knöpfe bleiben immer sichtbar.
  - SPÄTER | AKTUALISIEREN
- „Später“ merkt sich den Build. Die automatische Prüfung bietet erst einen neueren wieder an, die manuelle trotzdem.

**Installieren (dauert etwa 2 Sekunden)**
- Klick auf „Aktualisieren“: Ein kleines Shell-Skript wartet, bis die App beendet ist, legt die alte App in den Papierkorb (`<Name> alt <Zeit>.app`), setzt die neue an dieselbe Stelle und öffnet sie.
- **Beenden darf nie hängen:** Speichert die App beim Beenden, dann höchstens 4 Sekunden lang, danach wird trotzdem beendet. Sonst wartet das Austausch-Skript ewig, und das Update „installiert“ endlos.
- Geht ein Schritt schief, bleibt die alte App unangetastet, und die Karte zeigt einen Satz plus OK.

**Veröffentlichen**
- Jedes Release: Tag `{{KURZ}}-v0.1.<Build>` in `{{RELEASE_REPO}}` mit `{{APP}}.zip` und `version.json`. Danach wird `version.json` im festen Release `{{KURZ}}-latest` ersetzt. **Dieses Release nie löschen.**
- Build-Nummer = höchster vorhandener Build + 1 (`CFBundleVersion`). Version (`CFBundleShortVersionString`) bleibt `0.1`, bis LION eine neue will.
- Änderungen = Commit-Betreffzeilen seit dem letzten Release, höchstens 12, ohne Doppelte. Commits mit `[intern]` tauchen nicht auf. Betreffzeilen deshalb so schreiben, dass LION sie versteht („Vorschau ruckelt nicht mehr“, nicht „refactor Renderer“).

`version.json`:
```json
{ "name": "{{APP}}", "version": "0.1", "build": 13, "date": "2026-10-21T18:00:00Z",
  "notes": ["Vorschau ruckelt nicht mehr"], "sha256": "<sha256 der ZIP>", "file": "{{APP}}.zip", "commit": "<git sha>" }
```

---

## 2. Projektaufbau (Swift Package, kein Xcode nötig)

```
{{APPDIR}}/
  Package.swift                 platforms: [.macOS(.v14)], ein executableTarget "{{APP}}"
  Sources/{{APP}}/
    {{APP}}App.swift            @main, Fenster, Menü, AppDelegate (Beenden mit 4-s-Grenze)
    AppInfo.swift               Namen, Tag-Präfix, appDefaults (Einstellungen, getrennt für Tests)
    ToolUpdater.swift           Update-Logik (unten, wortgleich übernehmen)
    UpdateBanner.swift          Karte oben rechts (unten)
    DataStore.swift             Datenordner wählen/merken/verschieben
    SelfTest.swift              Selbsttests per Startparameter
  Resources/                    AppIcon.icns, Fonts/…
  scripts/make-icon.swift       zeichnet das App-Symbol (unten)
  scripts/bundle.sh             baut die .app (unten)
  scripts/release-local.sh      baut, testet, veröffentlicht (unten)
```

`Package.swift`:
```swift
// swift-tools-version:5.9
import PackageDescription
let package = Package(
    name: "{{APP}}",
    platforms: [.macOS(.v14)],
    targets: [.executableTarget(name: "{{APP}}", path: "Sources/{{APP}}")]
)
```

`.gitignore`: `.build/` und `build/`. `scripts/make-icon.swift`, `Resources/icon-1024.png` und `Resources/AppIcon.icns` gehören ins Repo.

Bauen nur mit `swift build` (die Command Line Tools reichen). Die `.app` setzt `bundle.sh` von Hand zusammen.

---

## 3. App-Gerüst

### 3.1 `AppInfo.swift`
```swift
import Foundation

enum AppInfo {
    /// Interner Name (Datei, ZIP, version.json) – nie ändern.
    static let name = "{{APP}}"
    /// Sichtbarer Name (Dock, Menü, Fenster, Startbildschirm).
    static let brand = "{{BRAND}}"
    /// Release-Tags: {{KURZ}}-v0.1.<Build>
    static let tagPrefix = "{{KURZ}}-v0.1."
}

/// Einstellungen der App. Selbsttests (Startparameter --selbsttest…, --bild-…, --update…) bekommen eine eigene,
/// leere Ablage und fassen die echten Einstellungen NIE an – auch nicht bei Absturz oder parallelen Tests.
/// Im ganzen App-Code nie UserDefaults.standard direkt verwenden, immer appDefaults.
let appDefaults: UserDefaults = {
    let a = CommandLine.arguments
    let isTest = a.contains { $0.hasPrefix("--selbsttest") || $0.hasPrefix("--bild-") || $0.hasPrefix("--update") }
    guard isTest else { return .standard }
    let prefs = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0].appendingPathComponent("Preferences")
    for f in (try? FileManager.default.contentsOfDirectory(atPath: prefs.path)) ?? [] where f.hasPrefix("{{BUNDLE_ID}}.selbsttest.") {
        try? FileManager.default.removeItem(at: prefs.appendingPathComponent(f))
    }
    let name = "{{BUNDLE_ID}}.selbsttest.\(ProcessInfo.processInfo.processIdentifier)"
    let d = UserDefaults(suiteName: name)!
    d.removePersistentDomain(forName: name)
    atexit { UserDefaults.standard.removePersistentDomain(forName: "{{BUNDLE_ID}}.selbsttest.\(ProcessInfo.processInfo.processIdentifier)") }
    return d
}()
```
`ToolUpdater` merkt sich „Später“ unter `update.skippedBuild` ebenfalls in `appDefaults`.

### 3.2 `{{APP}}App.swift` (Kern)
```swift
import SwiftUI

@main
struct ToolApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var updater: ToolUpdater

    init() {
        ToolUpdater.runUpdateTestIfRequested(name: AppInfo.name, tagPrefix: AppInfo.tagPrefix)   // ganz am Anfang
        if CommandLine.arguments.contains("--selbsttest") { SelfTest.run() }                       // beendet sich selbst
        _updater = StateObject(wrappedValue: ToolUpdater(name: AppInfo.name, tagPrefix: AppInfo.tagPrefix))
    }

    var body: some Scene {
        Window(AppInfo.brand, id: "main") {
            ContentView()                                   // Startbildschirm / Inhalt des Tools
                .environmentObject(updater)
                .overlay(alignment: .topTrailing) { UpdateBanner().environmentObject(updater) }
                .preferredColorScheme(.dark)
                .frame(minWidth: 720, minHeight: 460)
                .onAppear {
                    // Erst nach dem Fensteraufbau: direkt in onAppear unterdrückt macOS 14 Dialoge
                    // (runModal kommt sofort zurück) – die App hat sich dort beim ersten Start sofort beendet.
                    DispatchQueue.main.async {
                        DataStore.shared.ensureSetUp()      // beim ersten Start Datenordner wählen
                        updater.start()
                    }
                }
        }
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(after: .appInfo) {
                Button("Nach Updates suchen …") { updater.check(manual: true) }
            }
        }
    }
}

/// Beim Beenden (auch für ein Update) noch speichern, aber höchstens 4 Sekunden – nie hängen bleiben.
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        var answered = false
        let answer = { if !answered { answered = true; sender.reply(toApplicationShouldTerminate: true) } }
        Task { @MainActor in await saveEverythingNow(); answer() }      // ANPASSEN: eigenes Speichern, oder sofort answer()
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { answer() }
        return .terminateLater
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}
```
Wichtig: Das Beenden nie mit `withTaskGroup` oder etwas anderem bauen, das auf eine hängende Aufgabe wartet. Die 4-Sekunden-Grenze muss immer greifen. Ist nichts zu speichern (z. B. Startbildschirm), gleich `return .terminateNow`.

### 3.3 Datenordner (`DataStore.swift`), so wie LION es will
- Beim ersten Start fragt die App, wo sie ihre Daten ablegen soll, und legt dort einen Ordner **„{{BRAND}}“** an. Darin liegen eine Markierungsdatei `{{BRAND}}-Daten.json` und die Unterordner (z. B. `Projekte`, `Vorlagen`).
- Wählt man einen Ordner, in dem schon Daten liegen (z. B. vom alten Mac), wird er einfach **verknüpft**.
- Der Ort wird **dreifach** gemerkt, damit man ihn nie neu wählen muss:
  1. Pfad in `appDefaults` (Schlüssel `datenOrdner`)
  2. Lesezeichen in `appDefaults` (`url.bookmarkData()`, findet den Ordner auch nach Umbenennen/Verschieben)
  3. Rückfall-Datei `~/Library/Application Support/{{BRAND}}/datenordner.json` mit Pfad und Lesezeichen (nur wenn `appDefaults === UserDefaults.standard`, also nie in Tests)
- Beim Start der Reihe nach probieren, den ersten gültigen nehmen und alle drei wieder auffrischen.
- Einstellungen: „Im Finder zeigen“, „Anderen Ordner verknüpfen …“ (legt bei Bedarf nach Nachfrage einen neuen an), „Ordner verschieben …“ (kopieren, umstellen, alten nach Nachfrage in den Papierkorb).
- Alles, was sich nicht rückgängig machen lässt, mit einer Nachfrage bestätigen.
- Die Abfrage beim ersten Start muss macOS 14 überstehen (siehe Fehler 19):
```swift
private var askingForFolder = false
/// Nicht direkt aus onAppear aufrufen: dort unterdrückt macOS 14 Dialoge (runModal kommt sofort zurück).
func ensureSetUp() {
    guard root == nil, !askingForFolder else { return }
    askingForFolder = true
    defer { askingForFolder = false }
    NSApp.activate(ignoringOtherApps: true)
    while root == nil {
        let a = NSAlert()
        a.messageText = "Wo soll \(AppInfo.brand) seine Daten ablegen?"
        a.addButton(withTitle: "Ordner wählen …")
        a.addButton(withTitle: "Beenden")
        let r = a.runModal()
        if r == .alertSecondButtonReturn { NSApp.terminate(nil); return }   // nur „Beenden“ beendet
        if r != .alertFirstButtonReturn {
            // Dialog wurde nicht gezeigt (von macOS unterdrückt): gleich nochmal fragen statt beenden
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self.ensureSetUp() }
            return
        }
        chooseFolder()
    }
}
```

---

## 4. `ToolUpdater.swift` (wortgleich übernehmen)

Die Info.plist braucht dafür `LoomnUpdateRepo` = `{{RELEASE_REPO}}` und `LoomnLatestTag` = `{{KURZ}}-latest` (setzt `bundle.sh`).

```swift
import AppKit
import CryptoKit
import Foundation

/// Updates für Loomn-Werkzeuge über GitHub Releases: kostenlos, ohne Konto, ohne Claude.
///
/// Der Build-Workflow veröffentlicht jede Version als Release mit dem Tag `<tagPrefix><build>`
/// und zwei Dateien: `<Name>.zip` und `version.json`. Aus welchem Repo, steht in der Info.plist
/// (`LoomnUpdateRepo`, "besitzer/repo"). Die App schaut beim Start, jede Minute und beim Wechsel zur App nach,
/// zeigt Version und Änderungen an und installiert erst nach Bestätigung: lädt, prüft Prüfsumme
/// und Signatur, ersetzt sich selbst und startet neu.
@MainActor
final class ToolUpdater: ObservableObject {
    struct Release: Decodable, Equatable {
        var name: String
        var version: String
        var build: Int
        var date: String?
        var notes: [String]?
        var sha256: String
        var file: String?
        var zipURL: URL?
    }

    private struct GitHubRelease: Decodable {
        struct Asset: Decodable {
            var name: String
            var browser_download_url: URL
        }
        var tag_name: String
        var draft: Bool
        var assets: [Asset]
    }

    enum Phase: Equatable {
        case idle
        case checking
        case available(Release)
        case installing
        case failed(String)
    }

    @Published private(set) var phase: Phase = .idle
    @Published private(set) var lastCheck: Date?
    /// Version, die mit „Später“ weggeklickt wurde (bis zur nächsten neueren).
    private var skippedBuild: Int {
        get { appDefaults.integer(forKey: "update.skippedBuild") }
        set { appDefaults.set(newValue, forKey: "update.skippedBuild") }
    }

    let name: String
    let tagPrefix: String
    let repo: String?
    private var timer: Timer?
    /// Fertig geladene, geprüfte und entpackte neue App (Build-Nummer → Ort). Wird im Hintergrund vorbereitet,
    /// damit „Aktualisieren“ nur noch austauscht und neu startet .
    private var prepared: (build: Int, app: URL)?
    private var preparing = false

    var displayName: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String ?? name }
    var currentVersion: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "dev" }
    var currentBuild: Int { Int(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "") ?? 0 }

    init(name: String, tagPrefix: String) {
        self.name = name
        self.tagPrefix = tagPrefix
        let r = Bundle.main.object(forInfoDictionaryKey: "LoomnUpdateRepo") as? String
        repo = (r?.isEmpty ?? true) ? nil : r
    }

    func start() {
        guard timer == nil else { return }
        check(manual: false)
        // Jede Minute und beim Wechsel zur App nachsehen, damit ein freigegebenes Update gleich da ist.
        // Unveränderte Antworten (304, per ETag) zählen bei GitHub nicht gegen das Abruflimit.
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.check(manual: false) }
        }
        NotificationCenter.default.addObserver(forName: NSApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, Date().timeIntervalSince(self.lastCheck ?? .distantPast) > 10 else { return }
                self.check(manual: false)
            }
        }
    }

    /// Letzte Antworten der Release-Liste mit ETag (nur für bedingte Abfragen).
    nonisolated private static let cacheLock = NSLock()
    nonisolated(unsafe) private static var listCache: [URL: (etag: String, data: Data)] = [:]
    nonisolated(unsafe) private static var releaseCache: [String: Release] = [:]

    /// `manual`: Ergebnis immer anzeigen und auch eine weggeklickte Version wieder anbieten.
    func check(manual: Bool) {
        switch phase {
        case .installing, .checking: return
        case .available: if !manual { return }
        default: break
        }
        if preparing { if manual { phase = .checking }; return }   // lädt schon im Hintergrund
        lastCheck = Date()
        guard let repo else {
            if manual { phase = .failed("Für diese Version sind keine Updates eingerichtet") }
            return
        }
        if manual { phase = .checking }
        Task {
            do {
                guard let r = try await Self.latest(repo: repo, prefix: tagPrefix), r.name == name else {
                    if manual { phase = .failed("Keine Version zum Herunterladen gefunden") }
                    return
                }
                if r.build > currentBuild, manual || r.build > skippedBuild {
                    // Erst im Hintergrund laden und prüfen, dann die Karte zeigen
                    if prepared?.build != r.build, let zipURL = r.zipURL {
                        preparing = true; defer { preparing = false }
                        let bundleID = Bundle.main.bundleIdentifier
                        let app = try await Task.detached {
                            let (tmpZip, _) = try await URLSession.shared.download(from: zipURL)
                            return try Self.prepare(zip: tmpZip, sha256: r.sha256, expectedBundleID: bundleID)
                        }.value
                        prepared = (r.build, app)
                    }
                    if case .installing = phase { return }
                    phase = .available(r)
                } else if manual {
                    phase = .failed("\(displayName) ist aktuell (\(currentVersion) · Build \(currentBuild))")
                } else if phase == .checking {
                    phase = .idle
                }
            } catch {
                // Ohne Internet still bleiben, nur auf Nachfrage melden
                if manual { phase = .failed("Update-Prüfung fehlgeschlagen: \(error.localizedDescription)") } else if phase == .checking { phase = .idle }
            }
        }
    }

    /// Neueste Version mit passendem Tag. Mehrere Tools teilen sich das Repo, deshalb
    /// seitenweise suchen, bis Releases dieses Tools auftauchen (neueste zuerst).
    nonisolated private static func latest(repo: String, prefix: String) async throws -> Release? {
        // Zuerst der feste Zeiger: eine version.json im Release „<LoomnLatestTag>“ (z. B. {{KURZ}}-latest).
        // Das ist ein normaler Datei-Download, kein API-Abruf, und fällt deshalb nie unter das Abruflimit von GitHub.
        if let tag = Bundle.main.object(forInfoDictionaryKey: "LoomnLatestTag") as? String, !tag.isEmpty,
           // ?t=… umgeht den kurzen Zwischenspeicher bei GitHub, sonst käme ein neues Update bis zu einer Minute später an
           let url = URL(string: "https://github.com/\(repo)/releases/download/\(tag)/version.json?t=\(Int(Date().timeIntervalSince1970))") {
            var req = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20)
            req.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
            if let (data, resp) = try? await URLSession.shared.data(for: req), (resp as? HTTPURLResponse)?.statusCode == 200,
               var r = try? JSONDecoder().decode(Release.self, from: data) {
                r.zipURL = URL(string: "https://github.com/\(repo)/releases/download/\(prefix)\(r.build)/\(r.file ?? "\(r.name).zip")")
                return r
            }
        }
        var found: GitHubRelease?
        for page in 1...5 where found == nil {
            guard let url = URL(string: "https://api.github.com/repos/\(repo)/releases?per_page=100&page=\(page)") else { return nil }
            var req = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20)
            req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
            // Nur im automatischen Build gesetzt (gegen das Abruflimit), die App selbst braucht kein Konto
            if let t = ProcessInfo.processInfo.environment["LOOMN_UPDATE_TEST_TOKEN"], !t.isEmpty {
                req.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization")
            }
            let cached = cacheLock.withLock { listCache[url] }
            if let c = cached { req.setValue(c.etag, forHTTPHeaderField: "If-None-Match") }
            var (data, resp) = try await URLSession.shared.data(for: req)
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            if code == 304, let c = cached { data = c.data }
            else {
                guard code == 200 else { throw Failure("GitHub antwortet nicht (\(code))") }
                if let tag = (resp as? HTTPURLResponse)?.value(forHTTPHeaderField: "ETag") { cacheLock.withLock { listCache[url] = (tag, data) } }
            }
            let all = try JSONDecoder().decode([GitHubRelease].self, from: data)
            found = all.filter { !$0.draft && $0.tag_name.hasPrefix(prefix) }
                .compactMap { r -> (Int, GitHubRelease)? in Int(r.tag_name.dropFirst(prefix.count)).map { ($0, r) } }
                .max { $0.0 < $1.0 }?.1
            if all.count < 100 { break }
        }
        guard let rel = found, let info = rel.assets.first(where: { $0.name == "version.json" }) else { return nil }
        let known = cacheLock.withLock { releaseCache[rel.tag_name] }
        if let known { return known }   // version.json dieses Releases schon geladen
        let (vdata, _) = try await URLSession.shared.data(from: info.browser_download_url)
        var r = try JSONDecoder().decode(Release.self, from: vdata)
        let zipName = r.file ?? "\(r.name).zip"
        r.zipURL = rel.assets.first { $0.name == zipName }?.browser_download_url
        if r.zipURL != nil { cacheLock.withLock { releaseCache[rel.tag_name] = r } }
        return r.zipURL == nil ? nil : r
    }

    func later() {
        if case .available(let r) = phase { skippedBuild = r.build }
        phase = .idle
    }

    func dismiss() { phase = .idle }

    func install() {
        guard case .available(let r) = phase, let zipURL = r.zipURL else { return }
        phase = .installing
        let target = Bundle.main.bundleURL
        let bundleID = Bundle.main.bundleIdentifier
        // Schon vorgeladen: nur noch austauschen und neu starten
        if let p = prepared, p.build == r.build, FileManager.default.fileExists(atPath: p.app.path) {
            do { try Self.replaceAndRelaunch(current: target, with: p.app) } catch { phase = .failed("Update fehlgeschlagen: \(error.localizedDescription)") }
            return
        }
        Task.detached {
            do {
                let (tmpZip, _) = try await URLSession.shared.download(from: zipURL)
                let newApp = try Self.prepare(zip: tmpZip, sha256: r.sha256, expectedBundleID: bundleID)
                try await MainActor.run { try Self.replaceAndRelaunch(current: target, with: newApp) }
            } catch {
                await MainActor.run { self.phase = .failed("Update fehlgeschlagen: \(error.localizedDescription)") }
            }
        }
    }

    struct Failure: LocalizedError {
        let errorDescription: String?
        init(_ s: String) { errorDescription = s }
    }

    /// Prüfen und in einen temporären Ordner auspacken.
    nonisolated private static func prepare(zip: URL, sha256: String, expectedBundleID: String?) throws -> URL {
        let data = try Data(contentsOf: zip)
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard digest == sha256.lowercased() else { throw Failure("Update-Datei ist beschädigt oder unvollständig") }

        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("update-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        try run("/usr/bin/ditto", ["-x", "-k", zip.path, tmp.path])
        guard let app = try FileManager.default.contentsOfDirectory(at: tmp, includingPropertiesForKeys: nil)
            .first(where: { $0.pathExtension == "app" }) else { throw Failure("Keine App im Update") }
        guard Bundle(url: app)?.bundleIdentifier == expectedBundleID else { throw Failure("Update gehört zu einer anderen App") }
        try run("/usr/bin/codesign", ["--verify", "--deep", "--strict", app.path], failure: "Signatur des Updates ungültig")
        // Kein Quarantäne-Hinweis beim Neustart
        _ = try? run("/usr/bin/xattr", ["-dr", "com.apple.quarantine", app.path])
        return app
    }

    /// Kleines Hilfsskript: wartet, bis diese App beendet ist, tauscht sie aus und startet neu.
    /// Die alte Version landet im Papierkorb (falls doch etwas schiefgeht).
    private static func replaceAndRelaunch(current: URL, with newApp: URL) throws {
        let pid = ProcessInfo.processInfo.processIdentifier
        let trash = FileManager.default.urls(for: .trashDirectory, in: .userDomainMask).first?.path ?? "/tmp"
        let backup = "\(trash)/\(current.deletingPathExtension().lastPathComponent) alt \(Int(Date().timeIntervalSince1970)).app"
        let script = """
        while kill -0 \(pid) 2>/dev/null; do sleep 0.2; done
        mv "\(current.path)" "\(backup)" && mv "\(newApp.path)" "\(current.path)" || mv "\(backup)" "\(current.path)"
        open "\(current.path)"
        """
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/sh")
        p.arguments = ["-c", script]
        try p.run()
        NSApp.terminate(nil)
    }

    @discardableResult
    nonisolated private static func run(_ tool: String, _ args: [String], failure: String? = nil) throws -> Int32 {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: tool)
        p.arguments = args
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        try p.run()
        p.waitUntilExit()
        if p.terminationStatus != 0 { throw Failure(failure ?? "\(URL(fileURLWithPath: tool).lastPathComponent) fehlgeschlagen") }
        return p.terminationStatus
    }

    // MARK: - Update-Test für den automatischen Build

    /// `<App> --updatetest <build>`: kommt Build <build> (oder neuer) über GitHub an und ließe er sich
    /// installieren (Prüfsumme, Signatur, richtige App)? Ersetzt nichts. Ganz am Anfang von init() aufrufen.
    nonisolated static func runUpdateTestIfRequested(name: String, tagPrefix: String) {
        let args = CommandLine.arguments
        guard let i = args.firstIndex(of: "--updatetest") else { return }
        let want = i + 1 < args.count ? Int(args[i + 1]) ?? 0 : 0
        let sem = DispatchSemaphore(value: 0)
        nonisolated(unsafe) var code: Int32 = 0   // Swift 5.10 (macOS 14) braucht das ausdrücklich
        Task.detached {
            do {
                guard let repo = Bundle.main.object(forInfoDictionaryKey: "LoomnUpdateRepo") as? String, !repo.isEmpty else {
                    throw Failure("Kein Update-Repo eingetragen")
                }
                guard let r = try await latest(repo: repo, prefix: tagPrefix), r.name == name, let zip = r.zipURL else {
                    throw Failure("Keine Version in \(repo) gefunden")
                }
                let (tmp, _) = try await URLSession.shared.download(from: zip)
                let app = try prepare(zip: tmp, sha256: r.sha256, expectedBundleID: Bundle.main.bundleIdentifier)
                try? FileManager.default.removeItem(at: app.deletingLastPathComponent())
                print("Update gefunden: Version \(r.version) Build \(r.build), Prüfsumme und Signatur ok")
                if r.build < want { print("FEHLER: erwartet Build \(want)"); code = 1 } else { print("UPDATE-TEST OK") }
            } catch {
                print("FEHLER: \(error.localizedDescription)")
                code = 1
            }
            sem.signal()
        }
        sem.wait()
        exit(code)
    }
}
```

## 5. `UpdateBanner.swift`

`DS`, `DSButton` und `dsLabel` kommen aus dem Loomn-Design (`Design.swift` aus der Vorgabe „Update-Funktion und Startbildschirm wie in Loomn Cut“). Gibt es im Tool kein Loomn-Design, ersetze sie durch eigene Schrift/Farben, Aufbau und Maße bleiben gleich.

```swift
import SwiftUI

/// Hinweis oben rechts, wenn eine neue Version bereitliegt. Installiert nur auf Knopfdruck.
struct UpdateBanner: View {
    @EnvironmentObject var updater: ToolUpdater

    var body: some View {
        switch updater.phase {
        case .idle:
            EmptyView()
        case .checking:
            card {
                HStack(spacing: 12) {
                    ProgressView().controlSize(.small)          // ANPASSEN: eigenes Ladesymbol
                    Text("Suche nach Updates").font(DS.font(16))
                }
            }
        case .available(let r):
            card {
                Text("Update verfügbar").dsLabel(DS.accent)
                Text("Version \(r.version) · Build \(r.build)").font(DS.font(22, .bold))
                Text("Installiert: \(updater.currentVersion) · Build \(updater.currentBuild)").dsLabel()
                if let notes = r.notes, !notes.isEmpty {
                    let list = VStack(alignment: .leading, spacing: 4) {
                        ForEach(notes.prefix(12), id: \.self) { n in
                            HStack(alignment: .firstTextBaseline, spacing: 6) {
                                Rectangle().fill(DS.accent).frame(width: 6, height: 2).offset(y: -4)
                                Text(n).font(DS.font(16)).fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    // Viele oder lange Änderungen: Liste scrollt, die Knöpfe bleiben immer sichtbar
                    if notes.count > 4 || notes.reduce(0, { $0 + $1.count }) > 260 {
                        ScrollView { list }.frame(height: 200)
                    } else {
                        list
                    }
                }
                HStack(spacing: DS.gap) {
                    DSButton("Später") { updater.later() }
                    DSButton("Aktualisieren", icon: "arrow.down.circle", fill: DS.accent) { updater.install() }
                }
            }
        case .installing:
            card {
                HStack(spacing: 12) {
                    ProgressView().controlSize(.small)          // ANPASSEN: eigenes Ladesymbol
                    Text("Update wird installiert, \(updater.displayName) startet gleich neu").font(DS.font(16))
                }
            }
        case .failed(let msg):
            card {
                Text(msg).font(DS.font(16)).fixedSize(horizontal: false, vertical: true)
                DSButton("OK") { updater.dismiss() }
            }
        }
    }

    private func card<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8, content: content)
            .padding(DS.margin)
            .frame(width: 360, alignment: .leading)
            .foregroundStyle(DS.text)
            .background(DS.surfaceHi, in: DS.shape)
            .overlay(DS.shape.stroke(DS.line, lineWidth: 1))
            .shadow(color: .black.opacity(0.5), radius: 20, y: 8)
            .padding(DS.margin)
            .padding(.top, 18)
    }
}
```

---

## 6. `scripts/bundle.sh` (baut die App)

```sh
#!/bin/sh
# Baut {{APP}}.app und {{APP}}.zip in build/.   BUILD=12 scripts/bundle.sh
set -e
VERSION="${VERSION:-0.1}"
BUILD="${BUILD:-${1:-0}}"
UPDATE_REPO="${UPDATE_REPO:-{{RELEASE_REPO}}}"
cd "$(dirname "$0")/.."
ARCHS="--arch arm64"
if xcodebuild -version >/dev/null 2>&1; then ARCHS="--arch arm64 --arch x86_64"; fi   # universal nur mit Xcode
swift build -c release $ARCHS
BIN="$(swift build -c release $ARCHS --show-bin-path)/{{APP}}"

APP=build/{{APP}}.app
rm -rf build && mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/{{APP}}"
[ -f Resources/AppIcon.icns ] && cp Resources/AppIcon.icns "$APP/Contents/Resources/"
[ -d Resources/Fonts ] && cp -R Resources/Fonts "$APP/Contents/Resources/Fonts"
# (weitere Ressourcen hier kopieren, z. B. Web-Inhalt für eine WKWebView)
cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>{{BRAND}}</string>
  <key>CFBundleDisplayName</key><string>{{BRAND}}</string>
  <key>CFBundleIdentifier</key><string>{{BUNDLE_ID}}</string>
  <key>CFBundleExecutable</key><string>{{APP}}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$BUILD</string>
  <key>LoomnUpdateRepo</key><string>$UPDATE_REPO</string>
  <key>LoomnLatestTag</key><string>{{KURZ}}-latest</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>CFBundleDevelopmentRegion</key><string>de</string>
</dict></plist>
EOF
# Läuft auf jedem Mac ab macOS 14 – sonst abbrechen
MINOS=$(vtool -show-build "$APP/Contents/MacOS/{{APP}}" 2>/dev/null | awk '/minos/{print $2; exit}')
if [ "$MINOS" != "14.0" ]; then echo "FEHLER: App verlangt macOS $MINOS statt 14.0"; exit 1; fi
codesign --force --deep --sign - "$APP"
codesign --verify --verbose "$APP"
ditto -c -k --keepParent "$APP" build/{{APP}}.zip
echo "fertig: $APP ($VERSION · Build $BUILD)"
```
Hat die App Web-Inhalt in einer WKWebView, prüft `bundle.sh` zusätzlich, dass der Inhalt nichts nutzt, was es erst nach Safari 17.3 (macOS 14.3) gibt. Bei einem Treffer bricht der Bau ab:
`withResolvers|Object\.groupBy|Map\.groupBy|Array\.fromAsync|Iterator\.from|Promise\.try|URL\.canParse|AbortSignal\.any|@starting-style|field-sizing|light-dark\(|@scope|anchor-name`

## 6a. App-Symbol (`scripts/make-icon.swift`)

Loomn-Stil wie postn und editn: schwarzes abgerundetes Quadrat im macOS-Raster, sichtbarer Name `{{BRAND}}` klein in Weiß, orangefarbener Punkt (`FF5A1F`) oben rechts am letzten Buchstaben. Hat LION ein eigenes Symbol geschickt, das nehmen (als 1024-PNG) und nur die Schritte darunter ausführen.

```swift
// Zeichnet das App-Symbol im Loomn-Stil (postn, editn): schwarzes abgerundetes Quadrat, Wort in Weiß, farbiger Punkt.
//   swift scripts/make-icon.swift {{BRAND}} Resources/icon-1024.png FF5A1F
import AppKit

let word = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "{{BRAND}}"
let out = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : "icon-1024.png"
let dotHex = CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : "FF5A1F"   // Punktfarbe (Loomn-Orange)
let dv = Int(dotHex, radix: 16) ?? 0xFF5A1F
let S: CGFloat = 1024
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(S), pixelsHigh: Int(S), bitsPerSample: 8, samplesPerPixel: 4,
                           hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
// macOS-Raster: Fläche 824 × 824 mit Rand 100, Ecken ca. 185 (sonst wirkt das Symbol im Dock zu groß)
let box = NSRect(x: 100, y: 100, width: 824, height: 824)
let shadow = NSShadow(); shadow.shadowColor = NSColor.black.withAlphaComponent(0.35); shadow.shadowBlurRadius = 18; shadow.shadowOffset = NSSize(width: 0, height: -8)
shadow.set()
NSColor(calibratedRed: 0.04, green: 0.04, blue: 0.045, alpha: 1).setFill()
NSBezierPath(roundedRect: box, xRadius: 185, yRadius: 185).fill()
NSShadow().set()
// Wort
var size: CGFloat = 230
var font = NSFont.systemFont(ofSize: size, weight: .semibold)
var attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.white, .kern: -4]
var w = (word as NSString).size(withAttributes: attrs).width
while w > 610 { size -= 4; font = NSFont.systemFont(ofSize: size, weight: .semibold); attrs[.font] = font; w = (word as NSString).size(withAttributes: attrs).width }
let h = font.capHeight
let x = (S - w)/2 - 14, baseline = (S - h)/2 + 6
(word as NSString).draw(at: NSPoint(x: x, y: baseline + font.descender), withAttributes: attrs)
// Punkt oben rechts am letzten Buchstaben
let r: CGFloat = size*0.085
NSColor(srgbRed: CGFloat((dv >> 16) & 255)/255, green: CGFloat((dv >> 8) & 255)/255, blue: CGFloat(dv & 255)/255, alpha: 1).setFill()
NSBezierPath(ovalIn: NSRect(x: x + w + r*0.4, y: baseline + font.xHeight + r*0.2, width: r*2, height: r*2)).fill()
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
print("Symbol:", out)
```

Daraus die `.icns` machen (einmal, Ergebnis ins Repo committen, damit beide Macs dasselbe Symbol bauen):
```sh
swift scripts/make-icon.swift {{BRAND}} Resources/icon-1024.png FF5A1F
mkdir -p build/AppIcon.iconset
for s in 16 32 128 256 512; do
  sips -z $s $s Resources/icon-1024.png --out build/AppIcon.iconset/icon_${s}x${s}.png >/dev/null
  sips -z $((s*2)) $((s*2)) Resources/icon-1024.png --out build/AppIcon.iconset/icon_${s}x${s}@2x.png >/dev/null
done
iconutil -c icns build/AppIcon.iconset -o Resources/AppIcon.icns
```
`bundle.sh` kopiert `Resources/AppIcon.icns` in die App, die Info.plist verweist mit `CFBundleIconFile = AppIcon` darauf. Zeigt das Dock nach einem Tausch noch das alte Symbol: `touch` auf die App bzw. einmal neu starten, das ist nur der Symbol-Zwischenspeicher von macOS. Beim Umbenennen der Marke nur das Symbol neu zeichnen, `{{APP}}` und Bundle-ID bleiben (Fehler 17).

---

## 7. `scripts/release-local.sh` (veröffentlichen, auf LIONs Mac)

Voraussetzung: `gh` ist installiert (`brew install gh`) und als Besitzer von `{{RELEASE_REPO}}` angemeldet (`gh auth login --web`).

```sh
#!/bin/sh
# Baut {{APP}} auf diesem Mac und veröffentlicht es in {{RELEASE_REPO}} (Tag {{KURZ}}-v0.1.<Build>, {{APP}}.zip + version.json)
set -e
cd "$(dirname "$0")/.."
REPO={{RELEASE_REPO}}
PREFIX={{KURZ}}-v0.1.
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
build/{{APP}}.app/Contents/MacOS/{{APP}} --selbsttest

prev="$PREFIX$last"; prevsha=""; tmp=$(mktemp -d)
if [ "$last" -gt 0 ] && "$GH" release download "$prev" -R $REPO -p version.json -O "$tmp/prev.json" 2>/dev/null; then prevsha=$(jq -r '.commit // empty' "$tmp/prev.json"); fi
if [ -n "$prevsha" ] && git cat-file -e "$prevsha" 2>/dev/null; then range="$prevsha..HEAD"; else range="-8"; fi
notes=$(git log $range --no-merges --format=%s -- . | grep -v '\[intern\]' | awk '!seen[$0]++' | head -12 | jq -R . | jq -s .)
cp build/{{APP}}.zip "$tmp/"
# Hat inzwischen eine andere Sitzung veröffentlicht? Dann abbrechen statt dieselbe Nummer doppelt zu vergeben.
if [ "$(newest)" != "$last" ]; then echo "Gerade hat jemand anderes veröffentlicht. Neuesten Stand ziehen und Skript neu starten."; exit 1; fi
jq -n --arg v "0.1" --argjson b $BUILD --arg d "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson n "$notes" \
      --arg s "$(shasum -a 256 "$tmp/{{APP}}.zip" | cut -d' ' -f1)" --arg c "$(git rev-parse HEAD)" \
      '{name:"{{APP}}", version:$v, build:$b, date:$d, notes:$n, sha256:$s, file:"{{APP}}.zip", commit:$c}' > "$tmp/version.json"
jq -r '.notes | map("- " + .) | join("\n")' "$tmp/version.json" > "$tmp/notes.md"
"$GH" release create "$PREFIX$BUILD" "$tmp/{{APP}}.zip" "$tmp/version.json" -R $REPO \
  --title "{{BRAND}} 0.1 (Build $BUILD)" --notes-file "$tmp/notes.md"

# fester Zeiger für die Update-Prüfung (erst jetzt, wenn das Release fertig ist)
"$GH" release view {{KURZ}}-latest -R $REPO >/dev/null 2>&1 || "$GH" release create {{KURZ}}-latest -R $REPO --prerelease \
  --title "{{BRAND}}: aktuelle Version (nur für die Update-Prüfung)" --notes "Enthält nur version.json der neuesten Version. Bitte nicht löschen."
"$GH" release upload {{KURZ}}-latest "$tmp/version.json" -R $REPO --clobber

# Kommt das Update an und ließe es sich installieren? (mit Anmeldung, GitHub-Zwischenspeicher bis 3 min)
export LOOMN_UPDATE_TEST_TOKEN="$("$GH" auth token 2>/dev/null)"
for i in $(seq 1 18); do build/{{APP}}.app/Contents/MacOS/{{APP}} --updatetest $BUILD && exit 0; sleep 10; done
exit 1
```

Arbeiten mehrere Claude-Sitzungen im selben Ordner: nur eigene Änderungen committen (`git add -p`, neue Dateien mitnehmen), nichts von anderen mitnehmen, und erst veröffentlichen, wenn der Ordner sonst sauber ist. Vorher kurz prüfen, ob gerade eine andere Sitzung releast (`git fetch --tags`, neuester Tag in loomn-tools); das Skript bricht zusätzlich ab, wenn während des Baus ein neueres Release erschienen ist. Immer die aktuelle Fassung des Skripts aus dem Repo benutzen, keine Kopie.

---

## 8. Selbsttests (Startparameter, laufen ohne Fenster, ändern nichts beim Nutzer)

- `--selbsttest`: Datenordner anlegen, verknüpfen, verschieben, fremde Ordner nie überschreiben (in einem Temp-Ordner, mit `appDefaults`), Ergebnis `Selbsttest bestanden`, Exitcode 0/1.
- `--updatetest <build>`: steckt in `ToolUpdater` (findet Build ≥ `<build>`, prüft Prüfsumme und Signatur, ersetzt nichts).
- Zum Ansehen ohne Bildschirm-Zugriff: `--bild-…`-Parameter, die eine Ansicht offscreen in eine PNG zeichnen (`NSHostingView` + `cacheDisplay`). So lassen sich Startbildschirm und Update-Karte prüfen.
- Mindestens einmal (vor dem ersten Release und nach jeder Änderung an Start, Datenordner oder Updater) auf dem zweiten Mac mit macOS 14.3 bauen und echt starten, inklusive erstem Start mit leerer Einstellung. Ein Code-Durchsehen ersetzt das nicht (Fehler 19).
- Ende-zu-Ende-Test des Updates: eine ältere Build-Nummer lokal bauen (`BUILD=<n-1> scripts/bundle.sh`), die Kopie in einen Temp-Ordner legen, mit einem Testparameter starten, der prüft und ohne Klick `install()` aufruft. Danach in der Info.plist der Kopie nachsehen, ob der neue Build da ist.

---

## 9. Fenster-Komfort (wie in editn)

- Fenster ohne Titelleiste (`.hiddenTitleBar`), immer dunkel.
- Doppelklick auf den oberen Bereich vergrößert wie die Titelleiste anderer Programme. Dabei die Systemeinstellung `AppleActionOnDoubleClick` beachten („Minimize“ legt ins Dock, „None“ tut nichts, sonst `window.zoom`). Nicht auf Knöpfen und nicht auf den Ampel-Knöpfen.
- Unter 860 × 540 Punkten zeigt die App „Fenster bitte größer ziehen“. Die Mindestgröße des Fensters ist kleiner (720 × 460), damit der Hinweis überhaupt erscheinen kann.

---

## 10. Erster Start auf einem Mac und Abschlussmeldung an LION

Einmalig von Hand: `{{APP}}.zip` von der Release-Seite laden, entpacken, in den Programme-Ordner ziehen. Beim ersten Öffnen Rechtsklick › Öffnen, oder Systemeinstellungen › Datenschutz & Sicherheit › „Trotzdem öffnen“. Danach kommen alle Updates von selbst.

Abschlussmeldung (kurz, Deutsch): Link zum Release, die einmaligen Handgriffe oben und was nicht getestet wurde (z. B. „auf macOS 14 nicht echt gestartet“).

## 11. Kurz-Check vor jedem Release

- [ ] Nur eigene Änderungen committet, Betreffzeilen verständlich, Internes mit `[intern]`
- [ ] Neuester Stand gezogen, kein anderes Release läuft gerade
- [ ] Kein `UserDefaults.standard` außerhalb von `appDefaults` (`grep -rn "UserDefaults.standard" Sources`)
- [ ] Keine Dialoge direkt in `onAppear`
- [ ] Baut mit Swift 5.10 (zweiter Mac) und minos 14.0
- [ ] `release-local.sh` lief bis „UPDATE-TEST OK“
- [ ] `{{KURZ}}-latest` existiert noch und zeigt den neuen Build
- [ ] LION gesagt: was neu ist, was nicht getestet wurde
