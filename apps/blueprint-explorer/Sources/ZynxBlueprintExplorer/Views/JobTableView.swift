import SwiftUI

struct JobTableView: View {
    @Bindable var store: BlueprintStore

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(store.selectedClusterName ?? "All Roles")
                    .font(.title2.weight(.semibold))

                Text("\(store.filteredRecords.count) visible roles")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)

            Table(store.filteredRecords, selection: $store.selectedRecordID) {
                TableColumn("Role", value: \.jobPosition)
                TableColumn("Status") { record in
                    StatusBadge(status: record.orgStatus)
                }
                .width(min: 90, ideal: 110)

                TableColumn("Agents") { record in
                    Text(record.agentText)
                        .lineLimit(2)
                        .truncationMode(.tail)
                }

                TableColumn("Primary LLM", value: \.primaryLLM)
                TableColumn("Source", value: \.source)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
    }
}
