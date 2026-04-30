import SwiftUI

struct OverviewView: View {
    let dataset: BlueprintDataset

    private let columns = [
        GridItem(.adaptive(minimum: 180, maximum: 280), spacing: 16)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Coverage Overview")
                        .font(.largeTitle.weight(.bold))

                    Text("Explore how Zynx roles map to agents, services, and model choices.")
                        .foregroundStyle(.secondary)
                }

                LazyVGrid(columns: columns, spacing: 16) {
                    ForEach(dataset.summary.metrics) { metric in
                        MetricCard(
                            title: metric.label,
                            value: "\(metric.count)",
                            subtitle: metric.percentageText
                        )
                    }
                }

                if !dataset.summary.agentSources.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Agent Sources")
                            .font(.title3.weight(.semibold))

                        LazyVGrid(columns: columns, spacing: 16) {
                            ForEach(dataset.summary.agentSources) { source in
                                MetricCard(
                                    title: source.label,
                                    value: "\(source.count)",
                                    subtitle: nil
                                )
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Cluster Coverage")
                        .font(.title3.weight(.semibold))

                    Table(dataset.summary.clusters) {
                        TableColumn("Cluster", value: \.name)
                        TableColumn("Total") { cluster in
                            Text("\(cluster.total)")
                        }
                        TableColumn("Match") { cluster in
                            Text("\(cluster.matchCount)")
                        }
                        TableColumn("Partial") { cluster in
                            Text("\(cluster.partialCount)")
                        }
                        TableColumn("Gap") { cluster in
                            Text("\(cluster.gapCount)")
                        }
                    }
                    .frame(minHeight: 280)
                }
            }
            .padding(24)
        }
        .navigationTitle("Overview")
    }
}
