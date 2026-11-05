// Zeichnet das App-Symbol im Loomn-Stil (postn, editn): schwarzes abgerundetes Quadrat, Wort in Weiß, farbiger Punkt.
//   swift scripts/make-icon.swift buildn Resources/icon-1024.png FF5A1F
import AppKit

let word = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "buildn"
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
