import SwiftUI

struct SettingsView: View {
    let dataset: BlueprintDataset

    var body: some View {
        Form {
            LabeledContent("Workbook source") {
                Text(dataset.sourceFile)
                    .multilineTextAlignment(.trailing)
                    .textSelection(.enabled)
            }

            LabeledContent("Data generated") {
                Text(dataset.generatedAt)
                    .textSelection(.enabled)
            }

            LabeledContent("Mapping sheet") {
                Text(dataset.sheetName)
            }

            LabeledContent("Summary sheet") {
                Text(dataset.summarySheetName)
            }

            LabeledContent("Total roles") {
                Text("\(dataset.records.count)")
            }
        }
        .formStyle(.grouped)
    }
}
