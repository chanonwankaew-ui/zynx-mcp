import Foundation

enum CoverageStatus: String, Codable, CaseIterable, Identifiable, Sendable {
    case match = "Match"
    case partial = "Partial"
    case gap = "Gap"

    var id: String { rawValue }

    var subtitle: String {
        switch self {
        case .match:
            return "Agent ready"
        case .partial:
            return "Partial coverage"
        case .gap:
            return "Needs design"
        }
    }
}

enum SidebarSelection: Hashable, Sendable {
    case overview
    case cluster(String)
}

struct CoverageMetric: Codable, Identifiable, Sendable {
    let label: String
    let count: Int
    let percentageText: String?

    var id: String { label }
}

struct AgentSourceCount: Codable, Identifiable, Sendable {
    let label: String
    let count: Int

    var id: String { label }
}

struct ClusterSummary: Codable, Identifiable, Sendable, Hashable {
    let name: String
    let total: Int
    let matchCount: Int
    let partialCount: Int
    let gapCount: Int

    var id: String { name }
}

struct JobRecord: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let cluster: String
    let jobPosition: String
    let orgStatus: CoverageStatus
    let agentText: String
    let agents: [String]
    let primaryLLM: String
    let notes: String
    let source: String
}

struct DatasetSummary: Codable, Sendable {
    let metrics: [CoverageMetric]
    let agentSources: [AgentSourceCount]
    let clusters: [ClusterSummary]
}

struct BlueprintDataset: Codable, Sendable {
    let generatedAt: String
    let sourceFile: String
    let sheetName: String
    let summarySheetName: String
    let columns: [String]
    let records: [JobRecord]
    let summary: DatasetSummary

    static let empty = BlueprintDataset(
        generatedAt: "unknown",
        sourceFile: "unknown",
        sheetName: "Job-to-Agent Mapping",
        summarySheetName: "Summary",
        columns: [],
        records: [],
        summary: DatasetSummary(metrics: [], agentSources: [], clusters: [])
    )
}
