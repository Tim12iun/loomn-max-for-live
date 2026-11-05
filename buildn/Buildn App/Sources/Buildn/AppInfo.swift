import Foundation

enum AppInfo {
    /// Interner Name (Datei, ZIP, version.json) – nie ändern.
    static let name = "Buildn"
    /// Sichtbarer Name (Dock, Menü, Fenster, Startbildschirm).
    static let brand = "buildn"
    /// Release-Tags: buildn-v0.1.<Build>
    static let tagPrefix = "buildn-v0.1."
}

/// Einstellungen der App. Selbsttests (Startparameter --selbsttest…, --bild-…, --update…) bekommen eine eigene,
/// leere Ablage und fassen die echten Einstellungen NIE an – auch nicht bei Absturz oder parallelen Tests.
/// Im ganzen App-Code nie UserDefaults.standard direkt verwenden, immer appDefaults.
let appDefaults: UserDefaults = {
    let a = CommandLine.arguments
    let isTest = a.contains { $0.hasPrefix("--selbsttest") || $0.hasPrefix("--bild-") || $0.hasPrefix("--update") }
    guard isTest else { return .standard }
    let prefs = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0].appendingPathComponent("Preferences")
    for f in (try? FileManager.default.contentsOfDirectory(atPath: prefs.path)) ?? [] where f.hasPrefix("de.loomn.buildn.selbsttest.") {
        try? FileManager.default.removeItem(at: prefs.appendingPathComponent(f))
    }
    let name = "de.loomn.buildn.selbsttest.\(ProcessInfo.processInfo.processIdentifier)"
    let d = UserDefaults(suiteName: name)!
    d.removePersistentDomain(forName: name)
    atexit { UserDefaults.standard.removePersistentDomain(forName: "de.loomn.buildn.selbsttest.\(ProcessInfo.processInfo.processIdentifier)") }
    return d
}()
