import SwiftUI

struct SidebarView: View {
    @Bindable var store: BlueprintStore

    var body: some View {
        List(
            selection: Binding(
                get: { store.sidebarSelection },
                set: { newValue in
                    guard let newValue else {
                        return
                    }
                    store.sidebarSelection = newValue
                    store.selectedRecordID = nil
                }
            )
        ) {
            NavigationLink(value: SidebarSelection.overview) {
                Label("Overview", systemImage: "chart.bar.doc.horizontal")
            }

            Section("Clusters") {
                ForEach(store.sidebarClusters) { cluster in
                    NavigationLink(value: SidebarSelection.cluster(cluster.name)) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(cluster.name)
                                .font(.body.weight(.medium))
                            Text("\(cluster.total) roles")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Blueprint")
        .listStyle(.sidebar)
    }
}
