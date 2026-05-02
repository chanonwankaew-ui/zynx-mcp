import Link from "next/link"
import { Badge, GlassCard, SectionHeading } from "@/components/ui-primitives"
import { EXAMPLES } from "@/lib/examples"
import { ArrowRight } from "lucide-react"

export default function ExamplesPage() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <SectionHeading
        eyebrow="Examples"
        title="Pre-tuned templates you can load into the generator."
        description="Click any card to open it in the wizard with goal, device, output and trigger pre-filled."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {EXAMPLES.map((e) => (
          <Link
            key={e.slug}
            href={`/generator?example=${e.slug}`}
            className="group block focus:outline-none"
          >
            <GlassCard className="flex h-full flex-col gap-3 transition group-hover:border-[oklch(0.82_0.16_220/0.5)]">
              <div className="flex items-center justify-between">
                <Badge tone="cyan">{e.trigger}</Badge>
                <Badge tone="violet">{e.output}</Badge>
              </div>
              <h3 className="text-base font-semibold">{e.title}</h3>
              <p className="text-sm leading-relaxed text-[color:var(--color-muted)]">{e.blurb}</p>
              <div className="mt-auto flex flex-wrap gap-1 pt-2">
                {e.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-[oklch(0.55_0.10_250/0.2)] bg-[oklch(0.10_0.04_260/0.5)] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[color:var(--color-muted)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.85_0.16_220)] opacity-0 transition group-hover:opacity-100">
                Open in generator <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  )
}
