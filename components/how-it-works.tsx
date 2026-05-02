import { GlassCard, SectionHeading } from "./ui-primitives"
import { Target, Zap, Wrench, Package } from "lucide-react"

const STEPS = [
  {
    icon: Target,
    title: "Goal Input",
    body: "Plain language. Thai or English. One paragraph is enough.",
    tone: "cyan" as const,
  },
  {
    icon: Zap,
    title: "Trigger Selector Agent",
    body: "Detects NFC, time, location, focus, share-sheet — picks the right entry point.",
    tone: "cyan" as const,
  },
  {
    icon: Wrench,
    title: "Workflow Builder Agent",
    body: "Builds Shortcut steps, variables, branching logic and error handling.",
    tone: "violet" as const,
  },
  {
    icon: Package,
    title: "Shortcut / PWA / iOS Blueprint",
    body: "Outputs Markdown, JSON, SwiftUI source and App Intents skeleton.",
    tone: "violet" as const,
  },
]

export function HowItWorks() {
  return (
    <section>
      <SectionHeading
        eyebrow="How it works"
        title="Four agents. One prompt. A complete blueprint."
        description="Each step is a pure TypeScript function in /lib/agents.ts. Easy to swap with a real LLM later."
      />

      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="relative">
            <GlassCard className="h-full">
              <div
                className={
                  s.tone === "cyan"
                    ? "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[oklch(0.82_0.16_220/0.15)] text-[oklch(0.82_0.16_220)] glow-cyan"
                    : "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[oklch(0.65_0.22_295/0.18)] text-[oklch(0.85_0.18_295)] glow-violet"
                }
              >
                <s.icon className="h-4 w-4" />
              </div>
              <div className="mb-1 text-xs font-mono text-[color:var(--color-muted)]">
                Step {i + 1}
              </div>
              <h3 className="text-base font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[color:var(--color-muted)]">
                {s.body}
              </p>
            </GlassCard>
            {i < STEPS.length - 1 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-[-10px] top-1/2 hidden h-px w-5 -translate-y-1/2 bg-gradient-to-r from-[oklch(0.82_0.16_220/0.6)] to-[oklch(0.65_0.22_295/0.6)] md:block"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
