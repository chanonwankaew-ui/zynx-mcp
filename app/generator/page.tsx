import { Suspense } from "react"
import { Wizard } from "@/components/wizard"
import { SectionHeading } from "@/components/ui-primitives"

export default function GeneratorPage() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <SectionHeading
        eyebrow="Generator"
        title="From a single sentence to a full Apple workflow."
        description="Five steps. All local. Saved projects live in your browser only."
      />
      <Suspense fallback={<div className="text-sm text-[color:var(--color-muted)]">Loading wizard…</div>}>
        <Wizard />
      </Suspense>
    </div>
  )
}
