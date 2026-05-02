import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button, GlassCard } from "@/components/ui-primitives"
import { HowItWorks } from "@/components/how-it-works"
import { TriggerGrid } from "@/components/trigger-grid"
import { Logo } from "@/components/logo"

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 md:gap-24">
      {/* Hero */}
      <section className="relative pt-8 md:pt-16">
        <div className="flex flex-col items-start gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.55_0.10_250/0.3)] bg-[oklch(0.20_0.04_260/0.5)] px-3 py-1 text-xs text-[color:var(--color-muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[oklch(0.82_0.16_220)]" />
            <span>Local-first MVP · Browser only · No API keys</span>
          </div>

          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Build your personal{" "}
            <span className="gradient-text">iPhone automation</span>{" "}
            from one prompt
          </h1>

          <p className="max-w-2xl text-pretty text-base leading-relaxed text-[color:var(--color-muted)] md:text-lg">
            สร้าง Shortcut / PWA / iOS App Blueprint จากคำอธิบายของคุณ —
            พิมพ์เป้าหมายเป็นภาษาไทยหรืออังกฤษ แล้วระบบ rule-based agents จะออกแบบ trigger,
            workflow และ blueprints ให้ทันที.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/generator">
              <Button size="lg">
                Generate Workflow <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/examples">
              <Button size="lg" variant="secondary">
                See Examples
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero side glass panel */}
        <div className="pointer-events-none absolute right-0 top-8 hidden md:block">
          <GlassCard className="w-72 select-none">
            <div className="flex items-center gap-3">
              <Logo className="h-10 w-10" />
              <div>
                <div className="text-sm font-semibold">Shortcut Agent Studio</div>
                <div className="text-xs text-[color:var(--color-muted)]">v0.1 · local agents</div>
              </div>
            </div>
            <div className="mt-4 space-y-2 font-mono text-[11px] text-[color:var(--color-muted)]">
              <div>$ goal: &quot;NFC desk → Pomodoro&quot;</div>
              <div>$ trigger: <span className="text-[oklch(0.82_0.16_220)]">Interaction (NFC)</span></div>
              <div>$ output: <span className="text-[oklch(0.85_0.18_295)]">Full Bundle</span></div>
              <div>$ status: <span className="text-[oklch(0.85_0.18_160)]">ready</span></div>
            </div>
          </GlassCard>
        </div>
      </section>

      <HowItWorks />
      <TriggerGrid />

      {/* CTA */}
      <section>
        <GlassCard className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="text-xl font-semibold md:text-2xl">Ready to ship your first workflow?</h3>
            <p className="mt-1 text-sm text-[color:var(--color-muted)]">
              The generator runs entirely in your browser. Saved projects stay in localStorage.
            </p>
          </div>
          <Link href="/generator">
            <Button size="lg">
              Open Generator <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </GlassCard>
      </section>
    </div>
  )
}
