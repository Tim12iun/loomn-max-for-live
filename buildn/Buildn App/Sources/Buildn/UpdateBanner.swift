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
