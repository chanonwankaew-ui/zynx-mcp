import SwiftUI

struct RoleDetailView: View {
    let record: JobRecord?

    var body: some View {
        Group {
            if let record {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(record.jobPosition)
                                .font(.largeTitle.weight(.bold))

                            HStack(spacing: 10) {
                                StatusBadge(status: record.orgStatus)
                                Text(record.cluster)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        detailSection("Primary LLM", value: record.primaryLLM)
                        detailSection("Source", value: record.source)
                        detailSection("Use Case / Notes", value: record.notes)

                        if !record.agents.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Assigned Agents")
                                    .font(.headline)

                                LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 10)], spacing: 10) {
                                    ForEach(record.agents, id: \.self) { agent in
                                        AgentChip(title: agent)
                                    }
                                }
                            }
                        }
                    }
                    .padding(24)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                ContentUnavailableView(
                    "Select a Role",
                    systemImage: "person.text.rectangle",
                    description: Text("Choose a mapped job from the table to inspect its agent coverage.")
                )
            }
        }
        .navigationTitle("Role Detail")
    }

    @ViewBuilder
    private func detailSection(_ title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.headline)
            Text(value)
                .textSelection(.enabled)
        }
    }
}
