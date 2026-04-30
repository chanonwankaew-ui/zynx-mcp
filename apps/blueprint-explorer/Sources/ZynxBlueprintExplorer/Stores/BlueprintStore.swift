import Foundation
import Observation
import OSLog

@Observable
final class BlueprintStore {
    var dataset: BlueprintDataset
    var sidebarSelection: SidebarSelection = .overview
    var searchText = ""
    var selectedStatus: CoverageStatus?
    var selectedRecordID: JobRecord.ID?

    private let logger = Logger(subsystem: "com.chanont.zynx.blueprint-explorer", category: "store")

    init(dataset: BlueprintDataset? = nil) {
        if let dataset {
            self.dataset = dataset
            return
        }

        do {
            self.dataset = try BlueprintDataLoader.load()
        } catch {
            self.dataset = .empty
            logger.error("Failed to load bundled data: \(error.localizedDescription)")
        }
    }

    var sidebarClusters: [ClusterSummary] {
        dataset.summary.clusters.sorted { lhs, rhs in
            if lhs.total == rhs.total {
                return lhs.name < rhs.name
            }
            return lhs.total > rhs.total
        }
    }

    var filteredRecords: [JobRecord] {
        let scopedRecords: [JobRecord]
        switch sidebarSelection {
        case .overview:
            scopedRecords = dataset.records
        case let .cluster(name):
            scopedRecords = dataset.records.filter { $0.cluster == name }
        }

        return scopedRecords
            .filter(matchesSearch)
            .filter(matchesStatus)
            .sorted(using: [
                KeyPathComparator(\.cluster),
                KeyPathComparator(\.jobPosition)
            ])
    }

    var selectedRecord: JobRecord? {
        guard let selectedRecordID else {
            return nil
        }
        return dataset.records.first { $0.id == selectedRecordID }
    }

    var selectedClusterName: String? {
        switch sidebarSelection {
        case .overview:
            return nil
        case let .cluster(name):
            return name
        }
    }

    func resetFilters() {
        searchText = ""
        selectedStatus = nil
        selectedRecordID = nil
    }

    private func matchesSearch(_ record: JobRecord) -> Bool {
        guard !searchText.isEmpty else {
            return true
        }

        let query = searchText.lowercased()
        return [
            record.cluster,
            record.jobPosition,
            record.agentText,
            record.primaryLLM,
            record.notes,
            record.source
        ]
        .joined(separator: "\n")
        .lowercased()
        .contains(query)
    }

    private func matchesStatus(_ record: JobRecord) -> Bool {
        guard let selectedStatus else {
            return true
        }
        return record.orgStatus == selectedStatus
    }
}
