import SwiftUI

struct BlueprintCommands: Commands {
    let resetFilters: () -> Void

    var body: some Commands {
        CommandMenu("Blueprint") {
            Button("Reset Filters", action: resetFilters)
                .keyboardShortcut("0")
        }
    }
}
