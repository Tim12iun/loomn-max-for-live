import SwiftUI

@main
struct ToolApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var updater: ToolUpdater
    @StateObject private var host: WebHost

    init() {
        ToolUpdater.runUpdateTestIfRequested(name: AppInfo.name, tagPrefix: AppInfo.tagPrefix)   // ganz am Anfang
        if CommandLine.arguments.contains("--selbsttest") { SelfTest.run() }                       // beendet sich selbst
        let u = ToolUpdater(name: AppInfo.name, tagPrefix: AppInfo.tagPrefix)
        let h = WebHost()
        h.updater = u
        _updater = StateObject(wrappedValue: u)
        _host = StateObject(wrappedValue: h)
    }

    var body: some Scene {
        Window(AppInfo.brand, id: "main") {
            ContentView(host: host)
                .environmentObject(updater)
                .overlay(alignment: .topTrailing) { UpdateBanner().environmentObject(updater) }
                .preferredColorScheme(.dark)
                .frame(minWidth: 560, minHeight: 360)
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
        .defaultSize(width: 1280, height: 800)
        .commands {
            CommandGroup(after: .appInfo) {
                Button("Nach Updates suchen …") { updater.check(manual: true) }
            }
        }
    }
}

struct ContentView: View {
    let host: WebHost
    var body: some View {
        GeometryReader { _ in
            VStack(spacing: 0) {
                ZStack {
                    TitleStrip()
                    // Logo: Name klein, oranger Punkt am n
                    HStack(alignment: .top, spacing: 2) {
                        Text(AppInfo.brand).font(DS.font(17, .bold)).foregroundStyle(DS.text)
                        Circle().fill(DS.accent).frame(width: 5, height: 5).padding(.top, 3)
                    }
                    .allowsHitTesting(false)
                }
                .frame(height: 30)
                .background(DS.bg)
                WebViewRep(host: host)
            }
            .background(DS.bg)
        }
        .ignoresSafeArea()
    }
}

/// buildn speichert jede Änderung sofort (zustand.json im Datenordner), beim Beenden ist nichts offen.
/// Deshalb sofort beenden – das Update-Skript wartet nie.
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply { .terminateNow }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}
