"use client"

import { useState } from "react"
import type { GeneratedProject } from "@/lib/types"
import { projectToMarkdown } from "@/lib/agents"
import { copyToClipboard, downloadFile, saveProject } from "@/lib/storage"
import { Badge, Button, GlassCard } from "./ui-primitives"
import { cn } from "@/lib/utils"
import {
  Check,
  Copy,
  Download,
  FileJson,
  FileText,
  Save,
  Smartphone,
  Globe,
  Code2,
  Workflow,
  Layers,
} from "lucide-react"

const TABS = [
  { id: "overview", label: "Overview", icon: Layers },
  { id: "shortcut", label: "Shortcut", icon: Workflow },
  { id: "pwa", label: "PWA", icon: Globe },
  { id: "ios", label: "iOS App", icon: Smartphone },
  { id: "intents", label: "App Intents", icon: Code2 },
  { id: "json", label: "JSON", icon: FileJson },
] as const
type TabId = (typeof TABS)[number]["id"]

export function ResultDisplay({
  project,
  onSaved,
}: {
  project: GeneratedProject
  onSaved?: () => void
}) {
  const [tab, setTab] = useState<TabId>("overview")
  const [toast, setToast] = useState<string | null>(null)
  const [savedFlag, setSavedFlag] = useState(false)

  const fire = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text)
    fire(ok ? `Copied ${label}` : `Copy failed`)
  }

  const handleSave = () => {
    saveProject(project)
    setSavedFlag(true)
    fire("Saved to Library")
    onSaved?.()
  }

  const md = projectToMarkdown(project)
  const json = JSON.stringify(project, null, 2)

  return (
    <GlassCard className="relative">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[oklch(0.55_0.10_250/0.18)] pb-5 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="cyan">Trigger · {project.trigger}</Badge>
            <Badge tone="violet">Device · {project.device}</Badge>
            <Badge tone="muted">Output · {project.output}</Badge>
          </div>
          <h3 className="text-xl font-semibold md:text-2xl">{project.projectName}</h3>
          <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--color-muted)]">
            {project.summary}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleCopy(md, "Markdown")}>
            <FileText className="h-3.5 w-3.5" /> Copy MD
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleCopy(json, "JSON")}>
            <FileJson className="h-3.5 w-3.5" /> Copy JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadFile(`${slug(project.projectName)}.md`, md, "text/markdown")
            }
          >
            <Download className="h-3.5 w-3.5" /> .md
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadFile(`${slug(project.projectName)}.json`, json, "application/json")
            }
          >
            <Download className="h-3.5 w-3.5" /> .json
          </Button>
          <Button size="sm" onClick={handleSave}>
            {savedFlag ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {savedFlag ? "Saved" : "Save to Library"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex flex-wrap gap-1 border-b border-[oklch(0.55_0.10_250/0.18)] pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-[oklch(0.55_0.10_250/0.20)] text-[color:var(--color-foreground)]"
                : "text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-5">
        {tab === "overview" && <OverviewTab project={project} onCopy={handleCopy} />}
        {tab === "shortcut" && <ShortcutTab project={project} onCopy={handleCopy} />}
        {tab === "pwa" && (
          <CodeBlock
            title="PWA Blueprint"
            content={project.pwaBlueprint}
            onCopy={() => handleCopy(project.pwaBlueprint, "PWA blueprint")}
          />
        )}
        {tab === "ios" && (
          <CodeBlock
            title="SwiftUI App Blueprint"
            content={project.swiftBlueprint}
            language="swift"
            onCopy={() => handleCopy(project.swiftBlueprint, "SwiftUI blueprint")}
          />
        )}
        {tab === "intents" && (
          <CodeBlock
            title="App Intents Blueprint"
            content={project.appIntentsBlueprint}
            language="swift"
            onCopy={() => handleCopy(project.appIntentsBlueprint, "App Intents blueprint")}
          />
        )}
        {tab === "json" && (
          <CodeBlock
            title="JSON Workflow Spec"
            content={JSON.stringify(project.jsonSpec, null, 2)}
            language="json"
            onCopy={() => handleCopy(JSON.stringify(project.jsonSpec, null, 2), "JSON spec")}
          />
        )}
      </div>

      {/* toast */}
      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute bottom-4 right-4 transition-all",
          toast ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <div className="rounded-lg border border-[oklch(0.55_0.10_250/0.3)] bg-[oklch(0.10_0.04_260/0.9)] px-3 py-1.5 text-xs">
          {toast}
        </div>
      </div>
    </GlassCard>
  )
}

function OverviewTab({
  project,
  onCopy,
}: {
  project: GeneratedProject
  onCopy: (text: string, label: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Section title="Best Trigger" copyText={project.trigger} onCopy={onCopy}>
        <p className="text-sm">
          <span className="gradient-text font-semibold">{project.trigger}</span>
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[color:var(--color-muted)]">
          {project.triggerReason}
        </p>
      </Section>

      <Section title="Required Apps / Permissions">
        <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          {project.requiredApps.map((a) => (
            <li key={a} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.82_0.16_220)]" />
              {a}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Inputs">
        {project.inputs.length ? (
          <ul className="space-y-1 text-sm">
            {project.inputs.map((i) => (
              <li key={i} className="font-mono text-[13px] text-[color:var(--color-foreground)]">
                · {i}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[color:var(--color-muted)]">No user inputs required.</p>
        )}
      </Section>

      <Section title="Variables">
        <div className="flex flex-wrap gap-1.5">
          {project.variables.map((v) => (
            <code
              key={v}
              className="rounded-md border border-[oklch(0.55_0.10_250/0.25)] bg-[oklch(0.10_0.04_260/0.6)] px-2 py-0.5 font-mono text-[12px]"
            >
              {v}
            </code>
          ))}
        </div>
      </Section>

      <Section title="If / Otherwise Logic" className="md:col-span-2">
        <ul className="space-y-2 text-sm">
          {project.logic.map((l, i) => (
            <li
              key={i}
              className="rounded-lg border border-[oklch(0.55_0.10_250/0.18)] bg-[oklch(0.10_0.04_260/0.4)] p-3"
            >
              <div>
                <span className="font-mono text-xs text-[oklch(0.82_0.16_220)]">IF</span>{" "}
                {l.ifCondition}
              </div>
              <div className="mt-1">
                <span className="font-mono text-xs text-[oklch(0.85_0.18_160)]">THEN</span>{" "}
                {l.thenAction}
              </div>
              <div>
                <span className="font-mono text-xs text-[oklch(0.85_0.18_295)]">ELSE</span>{" "}
                {l.elseAction}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Error Handling">
        <ul className="space-y-1 text-sm leading-relaxed">
          {project.errorHandling.map((e) => (
            <li key={e} className="text-[color:var(--color-muted)]">
              · {e}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Testing Steps">
        <ol className="space-y-1 text-sm leading-relaxed">
          {project.testingSteps.map((t, i) => (
            <li key={i} className="text-[color:var(--color-muted)]">
              {i + 1}. {t}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Upgrade Path" className="md:col-span-2">
        <ul className="space-y-1 text-sm leading-relaxed">
          {project.upgradePath.map((u) => (
            <li key={u} className="text-[color:var(--color-muted)]">
              → {u}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}

function ShortcutTab({
  project,
  onCopy,
}: {
  project: GeneratedProject
  onCopy: (text: string, label: string) => void
}) {
  const text = project.actions
    .map((a) => `${a.step}. ${a.action}${a.detail ? ` — ${a.detail}` : ""}`)
    .join("\n")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          Step-by-step Shortcut Actions
        </h4>
        <Button variant="ghost" size="sm" onClick={() => onCopy(text, "Shortcut actions")}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
      </div>
      <ol className="space-y-2">
        {project.actions.map((a) => (
          <li
            key={a.step}
            className="flex gap-3 rounded-lg border border-[oklch(0.55_0.10_250/0.18)] bg-[oklch(0.10_0.04_260/0.4)] p-3"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[oklch(0.70_0.20_250/0.18)] font-mono text-xs text-[oklch(0.82_0.16_220)]">
              {a.step}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{a.action}</div>
              {a.detail && (
                <div className="mt-0.5 break-words text-xs text-[color:var(--color-muted)]">
                  {a.detail}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Section({
  title,
  children,
  className,
  copyText,
  onCopy,
}: {
  title: string
  children: React.ReactNode
  className?: string
  copyText?: string
  onCopy?: (text: string, label: string) => void
}) {
  return (
    <div className={cn("rounded-lg border border-[oklch(0.55_0.10_250/0.15)] bg-[oklch(0.12_0.04_260/0.4)] p-4", className)}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          {title}
        </h4>
        {copyText && onCopy && (
          <button
            type="button"
            onClick={() => onCopy(copyText, title)}
            className="text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function CodeBlock({
  title,
  content,
  language,
  onCopy,
}: {
  title: string
  content: string
  language?: string
  onCopy: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          {title}
          {language && (
            <span className="ml-2 font-mono text-[10px] text-[color:var(--color-muted)]">
              ·{language}
            </span>
          )}
        </h4>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
      </div>
      <pre className="max-h-[480px] overflow-auto rounded-lg border border-[oklch(0.55_0.10_250/0.18)] bg-[oklch(0.08_0.04_260/0.7)] p-4 font-mono text-[12px] leading-relaxed text-[color:var(--color-foreground)]">
        <code>{content}</code>
      </pre>
    </div>
  )
}

function slug(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}
