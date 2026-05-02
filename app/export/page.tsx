import { ExportClient } from "@/components/export-client"
import { SectionHeading } from "@/components/ui-primitives"

export default function ExportPage() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <SectionHeading
        eyebrow="Export"
        title="Pull every workflow out as Markdown or JSON."
        description="Pick one project from your Library, then copy or download per-section assets."
      />
      <ExportClient />
    </div>
  )
}
