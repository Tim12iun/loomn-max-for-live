// swift-tools-version:5.9
import PackageDescription
let package = Package(
    name: "Buildn",
    platforms: [.macOS(.v14)],
    targets: [.executableTarget(name: "Buildn", path: "Sources/Buildn")]
)
