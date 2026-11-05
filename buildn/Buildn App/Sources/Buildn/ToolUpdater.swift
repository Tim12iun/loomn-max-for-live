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
        // Zuerst der feste Zeiger: eine version.json im Release „<LoomnLatestTag>“ (z. B. buildn-latest).
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
