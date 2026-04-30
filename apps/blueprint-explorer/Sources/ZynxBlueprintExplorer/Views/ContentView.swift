import SwiftUI

struct ContentView: View {
    @Bindable var store: BlueprintStore

    var body: some View {
        NavigationSplitView {
            SidebarView(store: store)
        } content: {
            if store.sidebarSelection == .overview {
                OverviewView(dataset: store.dataset)
            } else {
                JobTableView(store: store)
            }
        } detail: {
            RoleDetailView(record: store.selectedRecord)
        }
        .searchable(text: $store.searchText, placement: .toolbar, prompt: "Search roles, agents, or notes")
        .toolbar {
            ToolbarItemGroup {
                Picker(
                    "Coverage",
                    selection: Binding(
                        get: { store.selectedStatus },
                        set: {
                            store.selectedStatus = $0
                            store.selectedRecordID = nil
                        }
                    )
                ) {
                    Text("All Statuses").tag(CoverageStatus?.none)
                    ForEach(CoverageStatus.allCases) { status in
                        Text(status.rawValue).tag(Optional(status))
                    }
                }
                .pickerStyle(.menu)

                Button("Reset", action: store.resetFilters)
            }
        }
    }
}
