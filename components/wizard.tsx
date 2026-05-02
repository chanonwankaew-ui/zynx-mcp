"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Badge, Button, Field, GlassCard, Input, SectionHeading, Textarea } from "./ui-primitives"
import { cn } from "@/lib/utils"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Smartphone,
  Cpu,
  Settings2,
  Workflow,
  Globe,
  Layers,
  Loader2,
} from "lucide-react"
import type {
  DeviceProfile,
  GeneratedProject,
  OutputType,
  TriggerCategory,
} from "@/lib/types"
import { generateProject, triggerSelectorAgent, requirementAgent } from "@/lib/agents"
import { ResultDisplay } from "./result-display"
import { getExample } from "@/lib/examples"

const EXAMPLE_CHIPS = ["รายจ่าย", "ไอเดีย", "NFC", "ทุกเช้า", "ถึงบ้าน", "สรุปข้อความ", "ประชุม", "Focus"]

const DEVICES: { id: DeviceProfile; title: string; desc: string; icon: typeof Smartphone }[] = [
  {
    id: "iPhone 12",
    title: "iPhone 12",
    desc: "Shortcuts · ChatGPT app · PWA · API workflows",
    icon: Smartphone,
  },
  {
    id: "iMac with Apple Intelligence",
    title: "iMac with Apple Intelligence",
    desc: "Apple Intelligence · Shortcuts · App Intents",
    icon: Cpu,
  },
  {
    id: "Custom",
    title: "Custom",
    desc: "Other Apple device or hybrid setup",
    icon: Settings2,
  },
]

const OUTPUTS: { id: OutputType; title: string; desc: string; icon: typeof Workflow }[] = [
  { id: "Apple Shortcut Workflow", title: "Apple Shortcut", desc: "Just the .shortcut workflow", icon: Workflow },
  { id: "PWA Blueprint", title: "PWA Blueprint", desc: "Web app skeleton with localStorage", icon: Globe },
  { id: "iOS App Blueprint", title: "iOS App", desc: "SwiftUI + App Intents starter", icon: Smartphone },
  { id: "Full Bundle", title: "Full Bundle", desc: "All three outputs at once", icon: Layers },
]

const TRIGGERS: TriggerCategory[] = [
  "Time",
  "Location",
  "Message / Email",
  "Device State",
  "Interaction",
  "Health / Activity",
  "Smart Home",
]

type Step = 1 | 2 | 3 | 4 | 5

export function Wizard() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [goal, setGoal] = useState("")
  const [device, setDevice] = useState<DeviceProfile>("iPhone 12")
  const [output, setOutput] = useState<OutputType>("Full Bundle")
  const [triggerOverride, setTriggerOverride] = useState<TriggerCategory | null>(null)
  const [generating, setGenerating] = useState(false)
  const [project, setProject] = useState<GeneratedProject | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load example from URL ?example=slug
  useEffect(() => {
    const slug = searchParams.get("example")
    if (slug) {
      const ex = getExample(slug)
      if (ex) {
        setGoal(ex.goal)
        setDevice(ex.device)
        setOutput(ex.output)
        setTriggerOverride(ex.trigger)
      }
    }
  }, [searchParams])

  const recommendedTrigger = useMemo(() => {
    if (!goal.trim()) return null
    const req = requirementAgent(goal, device, output)
    return triggerSelectorAgent(req)
  }, [goal, device, output])

  const canNext = (() => {
    if (step === 1) return goal.trim().length > 0
    return true
  })()

  const handleNext = () => {
    setError(null)
    if (step === 1 && !goal.trim()) {
      setError("กรุณาใส่คำอธิบายสั้น ๆ ก่อน — บอกว่าอยากให้ iPhone ทำอะไร")
      return
    }
    if (step < 5) setStep((s) => (s + 1) as Step)
  }

  const handleBack = () => {
    setError(null)
    if (step > 1) setStep((s) => (s - 1) as Step)
  }

  const handleGenerate = async () => {
    setError(null)
    if (!goal.trim()) {
      setError("Goal cannot be empty.")
      return
    }
    setGenerating(true)
    // Simulated agent latency for UX feedback
    await new Promise((r) => setTimeout(r, 900))
    const p = generateProject({
      goal,
      device,
      output,
      triggerOverride: triggerOverride ?? undefined,
    })
    setProject(p)
    setGenerating(false)
    setStep(5)
  }

  const reset = () => {
    setProject(null)
    setStep(1)
    setGoal("")
    setTriggerOverride(null)
    router.replace("/generator")
  }

  return (
    <div className="flex flex-col gap-6">
      {!project && <Stepper step={step} />}

      {!project && step === 1 && (
        <GlassCard>
          <SectionHeading
            eyebrow="Step 1"
            title="What do you want your iPhone to do?"
            description="Plain Thai or English. Describe the trigger, the data, and the destination."
          />
          <Field label="Your Goal">
            <Textarea
              rows={6}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="ฉันอยากให้ iPhone ของฉัน..."
              className="text-base leading-relaxed"
              autoFocus
            />
          </Field>
          <div className="mt-3">
            <div className="mb-2 text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
              Try an example
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setGoal((g) => (g.trim() ? `${g} ${c}` : c))}
                  className="rounded-full border border-[oklch(0.55_0.10_250/0.3)] bg-[oklch(0.20_0.04_260/0.5)] px-3 py-1 text-xs hover:border-[oklch(0.82_0.16_220/0.5)] hover:bg-[oklch(0.82_0.16_220/0.08)]"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {!project && step === 2 && (
        <GlassCard>
          <SectionHeading
            eyebrow="Step 2"
            title="Pick your device profile"
            description="The generator adapts permissions and capabilities to your hardware."
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {DEVICES.map((d) => {
              const active = device === d.id
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDevice(d.id)}
                  className={cn(
                    "group flex flex-col gap-2 rounded-xl border p-4 text-left transition",
                    active
                      ? "border-[oklch(0.70_0.20_250/0.6)] bg-[oklch(0.70_0.20_250/0.10)]"
                      : "border-[oklch(0.55_0.10_250/0.2)] bg-[oklch(0.10_0.04_260/0.4)] hover:border-[oklch(0.82_0.16_220/0.4)]",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                        active
                          ? "bg-[oklch(0.70_0.20_250/0.25)] text-[oklch(0.85_0.16_220)]"
                          : "bg-[oklch(0.20_0.04_260)] text-[color:var(--color-muted)]",
                      )}
                    >
                      <d.icon className="h-4 w-4" />
                    </span>
                    {active && <Check className="h-4 w-4 text-[oklch(0.85_0.18_160)]" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{d.title}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-[color:var(--color-muted)]">
                      {d.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {device === "iPhone 12" && (
            <div className="mt-4 rounded-lg border border-[oklch(0.82_0.16_220/0.3)] bg-[oklch(0.82_0.16_220/0.08)] p-3 text-xs leading-relaxed">
              <span className="font-semibold text-[oklch(0.85_0.16_220)]">Note:</span>{" "}
              iPhone 12 cannot run Apple Intelligence locally, but it can use Apple Shortcuts,
              the ChatGPT app, PWAs, and API workflows.
            </div>
          )}
        </GlassCard>
      )}

      {!project && step === 3 && (
        <GlassCard>
          <SectionHeading
            eyebrow="Step 3"
            title="What should the agent build?"
            description="Choose one output, or generate the full bundle."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {OUTPUTS.map((o) => {
              const active = output === o.id
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOutput(o.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-left transition",
                    active
                      ? "border-[oklch(0.65_0.22_295/0.6)] bg-[oklch(0.65_0.22_295/0.10)]"
                      : "border-[oklch(0.55_0.10_250/0.2)] bg-[oklch(0.10_0.04_260/0.4)] hover:border-[oklch(0.65_0.22_295/0.4)]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      active
                        ? "bg-[oklch(0.65_0.22_295/0.25)] text-[oklch(0.85_0.18_295)]"
                        : "bg-[oklch(0.20_0.04_260)] text-[color:var(--color-muted)]",
                    )}
                  >
                    <o.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{o.title}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-[color:var(--color-muted)]">
                      {o.desc}
                    </div>
                  </div>
                  {active && (
                    <Check className="ml-auto h-4 w-4 shrink-0 text-[oklch(0.85_0.18_160)]" />
                  )}
                </button>
              )
            })}
          </div>
        </GlassCard>
      )}

      {!project && step === 4 && (
        <GlassCard>
          <SectionHeading
            eyebrow="Step 4"
            title="Pick a trigger"
            description="The agent recommends one from your goal — override if needed."
          />

          {recommendedTrigger && (
            <div className="mb-4 rounded-lg border border-[oklch(0.82_0.16_220/0.3)] bg-[oklch(0.82_0.16_220/0.07)] p-3">
              <div className="flex items-center gap-2 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-[oklch(0.82_0.16_220)]" />
                <span className="font-semibold text-[oklch(0.85_0.16_220)]">Recommended:</span>
                <span>{recommendedTrigger.trigger}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[color:var(--color-muted)]">
                {recommendedTrigger.reason}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {TRIGGERS.map((t) => {
              const active = (triggerOverride ?? recommendedTrigger?.trigger) === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTriggerOverride(t)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-xs transition",
                    active
                      ? "border-[oklch(0.70_0.20_250/0.6)] bg-[oklch(0.70_0.20_250/0.12)] text-[color:var(--color-foreground)]"
                      : "border-[oklch(0.55_0.10_250/0.2)] bg-[oklch(0.10_0.04_260/0.4)] text-[color:var(--color-muted)] hover:border-[oklch(0.82_0.16_220/0.4)] hover:text-[color:var(--color-foreground)]",
                  )}
                >
                  <div className="font-medium">{t}</div>
                </button>
              )
            })}
          </div>

          {triggerOverride && (
            <button
              type="button"
              onClick={() => setTriggerOverride(null)}
              className="mt-3 text-xs text-[color:var(--color-muted)] underline-offset-2 hover:text-[color:var(--color-foreground)] hover:underline"
            >
              Clear override · use recommended
            </button>
          )}
        </GlassCard>
      )}

      {!project && step === 5 && !generating && (
        <GlassCard>
          <SectionHeading
            eyebrow="Step 5"
            title="Ready to generate"
            description="Review your inputs. Click Generate to run the local agent pipeline."
          />
          <Summary
            goal={goal}
            device={device}
            output={output}
            trigger={triggerOverride ?? recommendedTrigger?.trigger ?? "Interaction"}
          />
        </GlassCard>
      )}

      {generating && (
        <GlassCard className="flex flex-col items-center gap-3 py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[oklch(0.82_0.16_220)]" />
          <p className="text-sm font-medium">Running agents…</p>
          <ol className="space-y-1 text-xs text-[color:var(--color-muted)]">
            <li>requirementAgent ✓</li>
            <li>triggerSelectorAgent ✓</li>
            <li>workflowBuilderAgent …</li>
            <li>pwaBlueprintAgent · iosBlueprintAgent · appIntentsAgent</li>
          </ol>
        </GlassCard>
      )}

      {error && (
        <div className="rounded-lg border border-[oklch(0.55_0.20_25/0.4)] bg-[oklch(0.55_0.20_25/0.08)] px-3 py-2 text-xs text-[oklch(0.85_0.18_25)]">
          {error}
        </div>
      )}

      {!project && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < 5 ? (
            <Button onClick={handleNext} disabled={!canNext}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  Generate <Sparkles className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {project && (
        <>
          <ResultDisplay project={project} />
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={reset}>
              <ChevronLeft className="h-4 w-4" /> Start a new workflow
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setProject(null)
                setStep(5)
              }}
            >
              Edit inputs
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Goal", "Device", "Output", "Trigger", "Generate"]
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => {
        const idx = i + 1
        const active = idx === step
        const done = idx < step
        return (
          <div key={l} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-mono transition",
                done && "border-[oklch(0.85_0.18_160)] bg-[oklch(0.85_0.18_160/0.15)] text-[oklch(0.85_0.18_160)]",
                active && "border-[oklch(0.82_0.16_220)] bg-[oklch(0.82_0.16_220/0.18)] text-[oklch(0.85_0.16_220)] glow-cyan",
                !active && !done && "border-[oklch(0.55_0.10_250/0.3)] text-[color:var(--color-muted)]",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : idx}
            </div>
            <div
              className={cn(
                "hidden text-xs sm:block",
                active ? "text-[color:var(--color-foreground)]" : "text-[color:var(--color-muted)]",
              )}
            >
              {l}
            </div>
            {i < labels.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 transition",
                  done ? "bg-[oklch(0.85_0.18_160/0.5)]" : "bg-[oklch(0.55_0.10_250/0.2)]",
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Summary({
  goal,
  device,
  output,
  trigger,
}: {
  goal: string
  device: DeviceProfile
  output: OutputType
  trigger: TriggerCategory
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Field label="Goal">
        <Input value={goal} readOnly />
      </Field>
      <Field label="Device">
        <Input value={device} readOnly />
      </Field>
      <Field label="Output">
        <Input value={output} readOnly />
      </Field>
      <Field label="Trigger">
        <div className="flex items-center gap-2">
          <Input value={trigger} readOnly />
          <Badge tone="cyan">selected</Badge>
        </div>
      </Field>
    </div>
  )
}
