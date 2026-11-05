import Foundation

/// `Buildn --selbsttest`: prüft Datenordner und Paket-Suche in einem Temp-Ordner. Fasst nichts beim Nutzer an.
enum SelfTest {
    static func run() -> Never {
        var fails: [String] = []
        func check(_ ok: Bool, _ what: String) { if !ok { fails.append(what); print("FEHLER:", what) } }
        let fm = FileManager.default
        let tmp = fm.temporaryDirectory.appendingPathComponent("buildn-selbsttest-\(UUID().uuidString)")
        try? fm.createDirectory(at: tmp, withIntermediateDirectories: true)
        defer { try? fm.removeItem(at: tmp) }
        check(appDefaults !== UserDefaults.standard, "Test nutzt eigene Einstellungen")

        MainActor.assumeIsolated {
            let ds = DataStore.shared
            // 1. Neu anlegen
            let a = tmp.appendingPathComponent("A"); try? fm.createDirectory(at: a, withIntermediateDirectories: true)
            let made = try? ds.makeOrLink(in: a)
            check(made?.lastPathComponent == AppInfo.brand && ds.isDataFolder(made!), "Datenordner anlegen")
            ds.writeState("{\"x\":1}")
            check(ds.readState() == "{\"x\":1}", "Zustand speichern/lesen")
            // 2. Vorhandenen verknüpfen (z. B. vom anderen Mac)
            let linked = try? ds.makeOrLink(in: a)
            check(linked == made, "Vorhandenen Ordner verknüpfen")
            // 3. Fremden Ordner nie überschreiben
            let b = tmp.appendingPathComponent("B/\(AppInfo.brand)")
            try? fm.createDirectory(at: b, withIntermediateDirectories: true)
            try? "fremd".write(to: b.appendingPathComponent("fremd.txt"), atomically: true, encoding: .utf8)
            check((try? ds.makeOrLink(in: b.deletingLastPathComponent())) == nil, "Fremden Ordner nicht übernehmen")
            check(fm.fileExists(atPath: b.appendingPathComponent("fremd.txt").path), "Fremde Datei unangetastet")
            // 4. Verschieben
            let c = tmp.appendingPathComponent("C"); try? fm.createDirectory(at: c, withIntermediateDirectories: true)
            let moved = try? ds.move(to: c) { _ in true }
            check(moved.map(ds.isDataFolder) == true && ds.readState() == "{\"x\":1}", "Datenordner verschieben")
            check(appDefaults.string(forKey: "datenOrdner") == moved?.path, "Neuen Ort gemerkt")
        }

        // 5. Song-Pakete finden
        let pk = tmp.appendingPathComponent("Pakete/SONG-Live-Set")
        try? fm.createDirectory(at: pk, withIntermediateDirectories: true)
        try? "{\"song\":\"SONG\",\"tempo\":126}".write(to: pk.appendingPathComponent("SETMAKER.json"), atomically: true, encoding: .utf8)
        try? Data().write(to: pk.appendingPathComponent("BASS_SONG 126.wav"))
        let found = WebHost.scan(tmp.appendingPathComponent("Pakete"), depth: 2)
        check(found.count == 1 && (found.first?["files"] as? [String])?.contains("BASS_SONG 126.wav") == true, "Song-Pakete finden")

        // 6. Oberfläche ist in der App
        let web = Bundle.main.resourceURL?.appendingPathComponent("Web/index.html")
        check(web.map { fm.fileExists(atPath: $0.path) } == true, "Oberfläche (Web/index.html) in der App")

        print(fails.isEmpty ? "Selbsttest bestanden" : "Selbsttest fehlgeschlagen (\(fails.count))")
        exit(fails.isEmpty ? 0 : 1)
    }
}
