import AppKit
import Foundation

/// Datenordner „buildn“: Line-up, gewählte Vorlage, Song-Ordner. Liegt nie in der App.
/// Der Ort wird dreifach gemerkt (Pfad, Lesezeichen, Rückfall-Datei), damit man ihn nie neu wählen muss.
@MainActor
final class DataStore {
    static let shared = DataStore()
    static let marker = "\(AppInfo.brand)-Daten.json"
    private let fm = FileManager.default
    private(set) var root: URL?

    private var fallbackFile: URL {
        fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent(AppInfo.brand).appendingPathComponent("datenordner.json")
    }
    private var usesRealDefaults: Bool { appDefaults === UserDefaults.standard }

    private init() { root = restore() }

    // MARK: Merken / Wiederfinden
    func isDataFolder(_ url: URL) -> Bool {
        var dir: ObjCBool = false
        return fm.fileExists(atPath: url.path, isDirectory: &dir) && dir.boolValue
            && fm.fileExists(atPath: url.appendingPathComponent(Self.marker).path)
    }

    private func restore() -> URL? {
        var candidates: [URL] = []
        if let p = appDefaults.string(forKey: "datenOrdner") { candidates.append(URL(fileURLWithPath: p)) }
        if let b = appDefaults.data(forKey: "datenOrdnerLesezeichen"), let u = Self.resolve(b) { candidates.append(u) }
        if usesRealDefaults, let d = try? Data(contentsOf: fallbackFile),
           let j = try? JSONSerialization.jsonObject(with: d) as? [String: String] {
            if let p = j["pfad"] { candidates.append(URL(fileURLWithPath: p)) }
            if let s = j["lesezeichen"], let b = Data(base64Encoded: s), let u = Self.resolve(b) { candidates.append(u) }
        }
        guard let found = candidates.first(where: isDataFolder) else { return nil }
        remember(found)
        return found
    }

    private static func resolve(_ data: Data) -> URL? {
        var stale = false
        return try? URL(resolvingBookmarkData: data, options: [.withoutUI], relativeTo: nil, bookmarkDataIsStale: &stale)
    }

    func remember(_ url: URL) {
        root = url
        appDefaults.set(url.path, forKey: "datenOrdner")
        let bm = try? url.bookmarkData()
        if let bm { appDefaults.set(bm, forKey: "datenOrdnerLesezeichen") }
        guard usesRealDefaults else { return }   // Tests fassen die Rückfall-Datei nie an
        try? fm.createDirectory(at: fallbackFile.deletingLastPathComponent(), withIntermediateDirectories: true)
        var j = ["pfad": url.path]
        if let bm { j["lesezeichen"] = bm.base64EncodedString() }
        if let d = try? JSONSerialization.data(withJSONObject: j) { try? d.write(to: fallbackFile, options: .atomic) }
    }

    // MARK: Anlegen / Verknüpfen
    /// Gewählter Ordner: hat er schon Daten (oder einen Unterordner „buildn“ mit Daten), wird er verknüpft.
    /// Sonst wird darin „buildn“ angelegt. Fremdes wird nie überschrieben.
    @discardableResult
    func makeOrLink(in parent: URL) throws -> URL {
        if isDataFolder(parent) { remember(parent); return parent }
        let dir = parent.appendingPathComponent(AppInfo.brand)
        if isDataFolder(dir) { remember(dir); return dir }
        if fm.fileExists(atPath: dir.path) {
            let inside = (try? fm.contentsOfDirectory(atPath: dir.path).filter { !$0.hasPrefix(".") }) ?? []
            if !inside.isEmpty { throw ToolUpdater.Failure("Dort liegt schon ein fremder Ordner „\(AppInfo.brand)“. Bitte einen anderen Ort wählen.") }
        }
        try fm.createDirectory(at: dir.appendingPathComponent("Line-ups"), withIntermediateDirectories: true)
        let info: [String: Any] = ["app": AppInfo.brand, "format": 1, "angelegt": ISO8601DateFormatter().string(from: Date())]
        try JSONSerialization.data(withJSONObject: info, options: .prettyPrinted).write(to: dir.appendingPathComponent(Self.marker))
        remember(dir)
        return dir
    }

    /// Ordner verschieben: kopieren, umstellen, alten nach Nachfrage in den Papierkorb.
    func move(to parent: URL, askTrash: (URL) -> Bool) throws -> URL {
        guard let old = root else { throw ToolUpdater.Failure("Kein Datenordner") }
        let dst = parent.appendingPathComponent(AppInfo.brand)
        if dst.standardizedFileURL == old.standardizedFileURL { return old }
        if fm.fileExists(atPath: dst.path) { throw ToolUpdater.Failure("Dort gibt es schon einen Ordner „\(AppInfo.brand)“. Nichts wurde verändert.") }
        try fm.copyItem(at: old, to: dst)
        remember(dst)
        if askTrash(old) { try? fm.trashItem(at: old, resultingItemURL: nil) }
        return dst
    }

    // MARK: Zustand (Line-up usw.)
    var stateURL: URL? { root?.appendingPathComponent("zustand.json") }
    func readState() -> String? { stateURL.flatMap { try? String(contentsOf: $0, encoding: .utf8) } }
    func writeState(_ s: String) { if let u = stateURL { try? s.write(to: u, atomically: true, encoding: .utf8) } }

    // MARK: Dialoge
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
            a.informativeText = "\(AppInfo.brand) legt dort den Ordner „\(AppInfo.brand)“ an. Liegt dort schon einer (z. B. vom anderen Mac), wird er einfach verknüpft."
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
        NotificationCenter.default.post(name: .dataFolderChanged, object: nil)
    }

    func chooseFolder() {
        let p = NSOpenPanel()
        p.canChooseDirectories = true; p.canChooseFiles = false; p.canCreateDirectories = true
        p.prompt = "Wählen"
        p.message = "Ordner für die Daten von \(AppInfo.brand) wählen"
        guard p.runModal() == .OK, let u = p.url else { return }
        do { try makeOrLink(in: u) } catch { Self.info(error.localizedDescription) }
    }

    func relink() {
        let p = NSOpenPanel()
        p.canChooseDirectories = true; p.canChooseFiles = false; p.canCreateDirectories = true
        p.prompt = "Verknüpfen"
        p.message = "Anderen Datenordner wählen (oder den Ort für einen neuen)"
        guard p.runModal() == .OK, let u = p.url else { return }
        if !isDataFolder(u) && !isDataFolder(u.appendingPathComponent(AppInfo.brand)) {
            guard Self.confirm("Dort sind noch keine \(AppInfo.brand)-Daten. Neuen Ordner „\(AppInfo.brand)“ anlegen?", action: "Anlegen") else { return }
        }
        do { try makeOrLink(in: u) } catch { Self.info(error.localizedDescription) }
        NotificationCenter.default.post(name: .dataFolderChanged, object: nil)
    }

    func moveInteractive() {
        let p = NSOpenPanel()
        p.canChooseDirectories = true; p.canChooseFiles = false; p.canCreateDirectories = true
        p.prompt = "Hierhin verschieben"
        p.message = "Wohin soll der Ordner „\(AppInfo.brand)“?"
        guard p.runModal() == .OK, let u = p.url else { return }
        do {
            _ = try move(to: u) { old in Self.confirm("Kopie fertig. Den alten Ordner in den Papierkorb legen?\n\(old.path)", action: "In den Papierkorb", danger: true) }
        } catch { Self.info(error.localizedDescription) }
        NotificationCenter.default.post(name: .dataFolderChanged, object: nil)
    }

    func reveal() { if let r = root { NSWorkspace.shared.activateFileViewerSelecting([r]) } }

    static func confirm(_ q: String, action: String, danger: Bool = false) -> Bool {
        let a = NSAlert()
        a.messageText = q
        a.addButton(withTitle: action)
        a.addButton(withTitle: "Abbrechen")
        if danger { a.buttons.first?.hasDestructiveAction = true }
        return a.runModal() == .alertFirstButtonReturn
    }
    static func info(_ s: String) {
        let a = NSAlert(); a.messageText = s; a.addButton(withTitle: "OK"); a.runModal()
    }
}

extension Notification.Name {
    static let dataFolderChanged = Notification.Name("buildn.dataFolderChanged")
}
