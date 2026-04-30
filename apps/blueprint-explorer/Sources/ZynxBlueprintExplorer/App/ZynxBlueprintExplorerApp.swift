import AppKit
import SwiftUI

@main
struct ZynxBlueprintExplorerApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var store = BlueprintStore()

    var body: some Scene {
        WindowGroup("Zynx Blueprint Explorer") {
            ContentView(store: store)
                .frame(minWidth: 1180, minHeight: 760)
        }
        .commands {
            BlueprintCommands(resetFilters: store.resetFilters)
        }

        Settings {
            SettingsView(dataset: store.dataset)
                .frame(width: 480)
                .padding(24)
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }
}
