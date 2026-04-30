// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "ZynxBlueprintExplorer",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "ZynxBlueprintExplorer",
            targets: ["ZynxBlueprintExplorer"]
        )
    ],
    targets: [
        .executableTarget(
            name: "ZynxBlueprintExplorer",
            path: "Sources/ZynxBlueprintExplorer",
            resources: [
                .process("Resources")
            ]
        )
    ]
)
