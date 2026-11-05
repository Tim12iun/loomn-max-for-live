import AppKit
import AVFoundation
import SwiftUI
import UniformTypeIdentifiers
import WebKit

/// Die Oberfläche von buildn ist eine Webseite (Resources/Web/index.html) in einer WKWebView.
/// Alles, was eine Webseite nicht darf (Ordner lesen, .als speichern, Audio vorhören), macht die App über „bridge“.
@MainActor
final class WebHost: NSObject, ObservableObject, WKScriptMessageHandlerWithReply, WKNavigationDelegate, AVAudioPlayerDelegate {
    let webView: WKWebView
    weak var updater: ToolUpdater?
    private var player: AVAudioPlayer?

    override init() {
        let c = WKWebViewConfiguration()
        let ucc = WKUserContentController()
        c.userContentController = ucc
        webView = DropWebView(frame: .zero, configuration: c)
        super.init()
        ucc.addScriptMessageHandler(self, contentWorld: .page, name: "bridge")
        webView.navigationDelegate = self
        (webView as? DropWebView)?.onFolders = { [weak self] paths in self?.sendJSON("folders", paths) }
        webView.setValue(false, forKey: "drawsBackground")
        if let dir = Bundle.main.resourceURL?.appendingPathComponent("Web") {
            webView.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
        }
        NotificationCenter.default.addObserver(forName: .dataFolderChanged, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.send("data") }
        }
    }

    /// Ereignis an die Seite (z. B. „data“ = Datenordner geändert, „ended“ = Vorhören fertig)
    func send(_ kind: String) {
        webView.evaluateJavaScript("window.onNative && window.onNative('\(kind)')", completionHandler: nil)
    }

    /// Ereignis mit Daten an die Seite (z. B. „folders“ = Ordner ins Fenster gezogen)
    func sendJSON(_ kind: String, _ value: Any) {
        guard let d = try? JSONSerialization.data(withJSONObject: value), let j = String(data: d, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.onNative && window.onNative('\(kind)', \(j))", completionHandler: nil)
    }

    // Links nach außen im Browser öffnen, nie in der App
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let u = navigationAction.request.url, u.scheme == "http" || u.scheme == "https" {
            NSWorkspace.shared.open(u); decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any], let cmd = body["cmd"] as? String else { replyHandler(nil, "Unbekannter Befehl"); return }
        if cmd == "peaks" {
            // Waveforms im Hintergrund lesen, damit die Oberfläche nicht hängt
            let paths = body["paths"] as? [String] ?? [], n = max(8, min(400, body["n"] as? Int ?? 96))
            DispatchQueue.global(qos: .userInitiated).async {
                var out: [String: Any] = [:]
                for p in paths {
                    let u = URL(fileURLWithPath: p)
                    let f = try? AVAudioFile(forReading: u)
                    let secs = f.map { Double($0.length) / $0.fileFormat.sampleRate } ?? 0
                    out[p] = ["p": Self.peaks(u, n: n), "d": secs]
                }
                let result = out
                DispatchQueue.main.async { replyHandler(result, nil) }
            }
            return
        }
        do { replyHandler(try handle(cmd, body) ?? NSNull(), nil) } catch { replyHandler(nil, error.localizedDescription) }
    }

    private func handle(_ cmd: String, _ b: [String: Any]) throws -> Any? {
        let str = { (k: String) in b[k] as? String ?? "" }
        switch cmd {
        case "info":
            return ["brand": AppInfo.brand,
                    "version": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "dev",
                    "build": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "0",
                    "data": DataStore.shared.root?.path ?? ""]
        case "loadState": return DataStore.shared.readState()
        case "saveState": DataStore.shared.writeState(str("json")); return true
        case "pickFolders":
            let p = NSOpenPanel()
            p.canChooseDirectories = true; p.canChooseFiles = false; p.allowsMultipleSelection = true
            p.prompt = "Laden"
            p.message = "Song-Ordner von prepn („<Song>-Live-Set“) wählen, oder einen Ordner, in dem viele davon liegen"
            return p.runModal() == .OK ? p.urls.map(\.path) : []
        case "scan": return (b["paths"] as? [String] ?? []).flatMap { Self.scan(URL(fileURLWithPath: $0), depth: 2) }
        case "pickTemplate":
            let p = NSOpenPanel()
            p.canChooseFiles = true; p.canChooseDirectories = false
            p.allowedContentTypes = [UTType(filenameExtension: "als") ?? .data]
            if b["open"] as? Bool == true {
                p.prompt = "Öffnen"
                p.message = "Bestehendes Live-Set öffnen: neue Songs werden unten angehängt"
            } else {
                p.prompt = "Als Vorlage nehmen"
                p.message = "Dein Live-Set als Vorlage wählen. buildn legt eine Kopie ab, das Original bleibt unverändert"
            }
            return p.runModal() == .OK ? p.url?.path : nil
        case "storeTemplate":
            // Vorlage als Standard in den Datenordner legen (Unterordner „Vorlage“, immer nur eine Datei)
            guard let root = DataStore.shared.root else { throw ToolUpdater.Failure("Kein Datenordner") }
            let fm = FileManager.default, dir = root.appendingPathComponent("Vorlage")
            try fm.createDirectory(at: dir, withIntermediateDirectories: true)
            let src = URL(fileURLWithPath: str("path")), dst = dir.appendingPathComponent(src.lastPathComponent)
            if src.standardizedFileURL.path == dst.standardizedFileURL.path { return dst.lastPathComponent }
            for f in (try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? []
                where f.pathExtension.lowercased() == "als" { try? fm.removeItem(at: f) }
            try fm.copyItem(at: src, to: dst)
            return dst.lastPathComponent
        case "readB64": return try Data(contentsOf: URL(fileURLWithPath: str("path"))).base64EncodedString()
        case "exists": return FileManager.default.fileExists(atPath: str("path"))
        case "audioInfo":
            let f = try AVAudioFile(forReading: URL(fileURLWithPath: str("path")))
            return ["frames": f.length, "rate": f.fileFormat.sampleRate]
        case "play":
            player?.stop()
            let p = try AVAudioPlayer(contentsOf: URL(fileURLWithPath: str("path")))
            p.delegate = self
            if let at = b["at"] as? Double, at > 0 { p.currentTime = min(at, 0.999) * p.duration }
            p.play()
            player = p
            return true
        case "stop": player?.stop(); player = nil; return true
        case "pos":
            guard let p = player, p.isPlaying, p.duration > 0 else { return -1 }
            return p.currentTime / p.duration
        case "pickSave":
            let p = NSSavePanel()
            p.allowedContentTypes = [UTType(filenameExtension: "als") ?? .data]
            p.nameFieldStringValue = str("name")
            p.prompt = "Set erstellen"
            if !str("dir").isEmpty { p.directoryURL = URL(fileURLWithPath: str("dir")) }
            return p.runModal() == .OK ? p.url?.path : nil
        case "writeB64":
            guard let d = Data(base64Encoded: str("data")) else { throw ToolUpdater.Failure("Daten kaputt") }
            try FileManager.default.createDirectory(at: URL(fileURLWithPath: str("path")).deletingLastPathComponent(), withIntermediateDirectories: true)
            try d.write(to: URL(fileURLWithPath: str("path")), options: .atomic)
            return true
        case "openFile": NSWorkspace.shared.open(URL(fileURLWithPath: str("path"))); return true
        case "reveal": NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: str("path"))]); return true
        case "confirm": return DataStore.confirm(str("text"), action: str("action"), danger: b["danger"] as? Bool ?? false)
        case "checkUpdates": updater?.check(manual: true); return true
        case "dataReveal": DataStore.shared.reveal(); return true
        case "dataRelink": DataStore.shared.relink(); return DataStore.shared.root?.path
        case "dataMove": DataStore.shared.moveInteractive(); return DataStore.shared.root?.path
        default: throw ToolUpdater.Failure("Unbekannter Befehl \(cmd)")
        }
    }

    /// Lautstärke-Spitzen einer Audiodatei in n Abschnitten (0…1), für die kleine Waveform im Clip
    nonisolated static func peaks(_ url: URL, n: Int) -> [Double] {
        guard let f = try? AVAudioFile(forReading: url), f.length > 0 else { return [] }
        let total = f.length, per = max(1, total / AVAudioFramePosition(n))
        let chunk: AVAudioFrameCount = 65536
        guard let buf = AVAudioPCMBuffer(pcmFormat: f.processingFormat, frameCapacity: chunk) else { return [] }
        var out = [Double](repeating: 0, count: n), pos: AVAudioFramePosition = 0
        while pos < total {
            buf.frameLength = 0
            do { try f.read(into: buf, frameCount: chunk) } catch { break }
            let len = Int(buf.frameLength); if len == 0 { break }
            if let ch = buf.floatChannelData {
                for c in 0..<Int(buf.format.channelCount) {
                    let d = ch[c]
                    var i = 0
                    while i < len {
                        let k = min(n - 1, Int((pos + AVAudioFramePosition(i)) / per))
                        let v = Double(abs(d[i])); if v > out[k] { out[k] = v }
                        i += 4   // jeder 4. Wert reicht für die Anzeige
                    }
                }
            }
            pos += AVAudioFramePosition(len)
        }
        let top = max(out.max() ?? 1, 0.0001)
        return out.map { (min(1, $0 / top) * 100).rounded() / 100 }
    }

    /// Song-Pakete finden: Ordner mit SETMAKER.json (von prepn). Bis zu `depth` Ebenen tief.
    nonisolated static func scan(_ dir: URL, depth: Int) -> [[String: Any]] {
        let fm = FileManager.default
        let json = dir.appendingPathComponent("SETMAKER.json")
        if let d = try? Data(contentsOf: json), let s = String(data: d, encoding: .utf8) {
            let files = ((try? fm.contentsOfDirectory(atPath: dir.path)) ?? []).filter { !$0.hasPrefix(".") }
            return [["dir": dir.path, "json": s, "files": files]]
        }
        guard depth > 0, let items = try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.isDirectoryKey], options: [.skipsHiddenFiles]) else { return [] }
        return items.filter { (try? $0.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
            .flatMap { scan($0, depth: depth - 1) }
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        DispatchQueue.main.async { MainActor.assumeIsolated { self.send("ended") } }
    }
}

struct WebViewRep: NSViewRepresentable {
    let host: WebHost
    func makeNSView(context: Context) -> WKWebView { host.webView }
    func updateNSView(_ nsView: WKWebView, context: Context) {}
}

/// Schmale Leiste oben (statt Titelleiste): Fenster ziehen, Doppelklick wie bei anderen Programmen.
struct TitleStrip: NSViewRepresentable {
    final class V: NSView {
        override var mouseDownCanMoveWindow: Bool { true }
        override func mouseDown(with event: NSEvent) {
            if event.clickCount == 2 {
                // Systemeinstellung (nicht die Einstellungen der App)
                let pref = CFPreferencesCopyAppValue("AppleActionOnDoubleClick" as CFString, kCFPreferencesAnyApplication) as? String
                switch pref ?? "Maximize" {
                case "Minimize": window?.miniaturize(nil)
                case "None": break
                default: window?.zoom(nil)
                }
                return
            }
            window?.performDrag(with: event)
        }
    }
    func makeNSView(context: Context) -> NSView { V() }
    func updateNSView(_ nsView: NSView, context: Context) {}
}

/// WebView, die Ordner aus dem Finder annimmt (ins Fenster ziehen = Songs laden).
/// Alles andere (Ziehen innerhalb der Seite) geht normal an die WebView.
final class DropWebView: WKWebView {
    var onFolders: (@MainActor ([String]) -> Void)?

    private func folders(_ info: NSDraggingInfo) -> [String] {
        let urls = info.draggingPasteboard.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL] ?? []
        return urls.filter { (try? $0.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true }.map(\.path)
    }
    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        folders(sender).isEmpty ? super.draggingEntered(sender) : .copy
    }
    override func draggingUpdated(_ sender: NSDraggingInfo) -> NSDragOperation {
        folders(sender).isEmpty ? super.draggingUpdated(sender) : .copy
    }
    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        let f = folders(sender)
        if f.isEmpty { return super.performDragOperation(sender) }
        onFolders?(f)
        return true
    }
}
