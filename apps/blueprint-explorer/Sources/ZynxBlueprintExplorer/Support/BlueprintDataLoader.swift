import Foundation

enum BlueprintDataLoader {
    static func load(bundle: Bundle = .module) throws -> BlueprintDataset {
        guard let url = bundle.url(forResource: "job_agent_mapping", withExtension: "json") else {
            throw CocoaError(.fileNoSuchFile)
        }

        let data = try Data(contentsOf: url)
        let decoder = JSONDecoder()
        return try decoder.decode(BlueprintDataset.self, from: data)
    }
}
