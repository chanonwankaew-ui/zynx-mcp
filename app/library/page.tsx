import { LibraryClient } from "@/components/library-client"
import { SectionHeading } from "@/components/ui-primitives"

export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <SectionHeading
        eyebrow="Library"
        title="Your saved workflows."
        description="Stored in browser localStorage only. Clearing site data deletes everything here."
      />
      <LibraryClient />
    </div>
  )
}
