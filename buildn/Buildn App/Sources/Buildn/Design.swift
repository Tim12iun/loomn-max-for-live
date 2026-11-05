import SwiftUI

/// loomn-Design: dunkel, warme Grautöne, ein Akzent (Orange), schmale Grotesk (Barlow Condensed, mitgeliefert).
enum DS {
    static let bg = Color(hex: 0x141414)
    static let surface = Color(hex: 0x1C1B1A)
    static let surfaceHi = Color(hex: 0x232221)
    static let surfaceHi2 = Color(hex: 0x2A2928)
    static let line = Color(hex: 0x32312F)
    static let text = Color(hex: 0xF0EEE9)
    static let muted = Color(hex: 0x8F8C86)
    static let accent = Color(hex: 0xFF5A1F)
    static let margin: CGFloat = 16
    static let gap: CGFloat = 8
    static let shape = RoundedRectangle(cornerRadius: 12, style: .continuous)

    enum Weight { case regular, medium, semibold, bold }
    static func font(_ size: CGFloat, _ w: Weight = .medium) -> Font {
        let name: String
        switch w {
        case .regular: name = "BarlowCondensed-Regular"
        case .medium: name = "BarlowCondensed-Medium"
        case .semibold: name = "BarlowCondensed-SemiBold"
        case .bold: name = "BarlowCondensed-Bold"
        }
        return NSFont(name: name, size: size) != nil ? .custom(name, size: size) : .system(size: size * 0.9, weight: .medium)
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}

/// Kleine Versalien-Beschriftung (Abschnittstitel)
extension Text {
    func dsLabel(_ color: Color = DS.muted) -> some View {
        self.font(DS.font(13, .semibold)).textCase(.uppercase).kerning(1).foregroundStyle(color)
    }
}

struct DSButton: View {
    let title: String
    var icon: String? = nil
    var fill: Color? = nil
    let action: () -> Void
    @State private var hover = false

    init(_ title: String, icon: String? = nil, fill: Color? = nil, action: @escaping () -> Void) {
        self.title = title; self.icon = icon; self.fill = fill; self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let icon { Image(systemName: icon).font(.system(size: 12, weight: .semibold)) }
                Text(fill != nil ? title.uppercased() : title).font(DS.font(15, .semibold)).kerning(fill != nil ? 0.6 : 0)
            }
            .frame(maxWidth: .infinity, minHeight: 32)
            .foregroundStyle(fill != nil ? Color.black : DS.text)
            .background(fill ?? (hover ? DS.surfaceHi2 : DS.surfaceHi), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
    }
}
