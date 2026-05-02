"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { copyToClipboard, downloadFile, loadLibrary } from "@/lib/storage"
import type { GeneratedProject } from "@/lib/types"
import { projectToMarkdown } from "@/lib/agents"
import { Badge, Button, GlassCard } from "./ui-primitives"
import { ArrowRight, Check, Copy, Download, FileJson, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export function ExportClient() {
  const [items, setItems] = useState<GeneratedProject[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const list = loadLibrary()
    setItems(list)
    setActiveId(list[0]?.id ?? null)
    setLoaded(true)
  }, [])

  const fire = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1600)
  }

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text)
    fire(ok ? `Copied ${label}` : "Copy failed")
  }

  if (!loaded) {
    return <div className="text-sm text-[color:var(--color-muted)]">Loading…</div>
  }

  if (items.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center gap-3 py-12 text-center">
        <h3 className="text-lg font-semibold">Nothing to export yet</h3>
        <p className="max-w-sm text-sm text-[color:var(--color-muted)]">
          Save a generated workflow to your Library, then come back here.
        </p>
        <Link href="/generator">
          <Button>
            Open Generator <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </GlassCard>
    )
  }

  const active = items.find((p) => p.id === activeId) ?? items[0]
  const md = projectToMarkdown(active)
  const json = JSON.stringify(active, null, 2)
  const fileBase = slug(active.projectName)

  const shortcutText = active.actions
    .map((a) => `${a.step}. ${a.action}${a.detail ? ` — ${a.detail}` : ""}`)
    .join("\n")

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      {/* Project list */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
          Projects
        </div>
        <div className="flex flex-col gap-1">
          {items.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveId(p.id)}
              className={cn(
                "rounded-lg border p-3 text-left transition",
                p.id === activeId
                  ? "border-[oklch(0.82_0.16_220/0.5)] bg-[oklch(0.82_0.16_220/0.08)]"
                  : "border-[oklch(0.55_0.10_250/0.18)] bg-[oklch(0.10_0.04_260/0.4)] hover:border-[oklch(0.82_0.16_220/0.3)]",
              )}
            >
              <div className="text-sm font-medium">{p.projectName}</div>
              <div className="mt-0.5 line-clamp-1 text-xs text-[color:var(--color-muted)]">
                {p.goal}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Export panel */}
      <GlassCard className="relative">
        <div className="flex flex-col gap-2 border-b border-[oklch(0.55_0.10_250/0.15)] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="cyan">{active.trigger}</Badge>
            <Badge tone="violet">{active.device}</Badge>
            <Badge tone="muted">{active.output}</Badge>
          </div>
          <h3 className="text-lg font-semibold">{active.projectName}</h3>
          <p className="text-xs text-[color:var(--color-muted)]">
            Saved {new Date(active.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <ExportRow
            title="Full Markdown"
            icon={FileText}
            onCopy={() => handleCopy(md, "Markdown")}
            onDownload={() => downloadFile(`${fileBase}.md`, md, "text/markdown")}
          />
          <ExportRow
            title="Full JSON"
            icon={FileJson}
            onCopy={() => handleCopy(json, "JSON")}
            onDownload={() => downloadFile(`${fileBase}.json`, json, "application/json")}
          />
          <ExportRow
            title="Shortcut Actions"
            icon={FileText}
            onCopy={() => handleCopy(shortcutText, "Shortcut actions")}
            onDownload={() =>
              downloadFile(`${fileBase}-actions.txt`, shortcutText, "text/plain")
            }
          />
          <ExportRow
            title="JSON Spec only"
            icon={FileJson}
            onCopy={() => handleCopy(JSON.stringify(active.jsonSpec, null, 2), "JSON spec")}
            onDownload={() =>
              downloadFile(
                `${fileBase}-spec.json`,
                JSON.stringify(active.jsonSpec, null, 2),
                "application/json",
              )
            }
          />
          <ExportRow
            title="PWA Blueprint"
            icon={FileText}
            onCopy={() => handleCopy(active.pwaBlueprint, "PWA blueprint")}
            onDownload={() =>
              downloadFile(`${fileBase}-pwa.md`, active.pwaBlueprint, "text/markdown")
            }
          />
          <ExportRow
            title="SwiftUI Blueprint"
            icon={FileText}
            onCopy={() => handleCopy(active.swiftBlueprint, "SwiftUI blueprint")}
            onDownload={() =>
              downloadFile(`${fileBase}.swift`, active.swiftBlueprint, "text/plain")
            }
          />
          <ExportRow
            title="App Intents Blueprint"
            icon={FileText}
            onCopy={() => handleCopy(active.appIntentsBlueprint, "App Intents blueprint")}
            onDownload={() =>
              downloadFile(`${fileBase}-intents.swift`, active.appIntentsBlueprint, "text/plain")
            }
            className="md:col-span-2"
          />
        </div>

        {/* toast */}
        <div
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute bottom-4 right-4 transition-all",
            toast ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          )}
        >
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-[oklch(0.55_0.10_250/0.3)] bg-[oklch(0.10_0.04_260/0.9)] px-3 py-1.5 text-xs">
            <Check className="h-3.5 w-3.5 text-[oklch(0.85_0.18_160)]" /> {toast}
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

function ExportRow({
  title,
  icon: Icon,
  onCopy,
  onDownload,
  className,
}: {
  title: string
  icon: typeof Copy
  onCopy: () => void
  onDownload: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-[oklch(0.55_0.10_250/0.18)] bg-[oklch(0.10_0.04_260/0.4)] p-3",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[oklch(0.82_0.16_220)]" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
        <Button variant="secondary" size="sm" onClick={onDownload}>
          <Download className="h-3.5 w-3.5" /> Download
        </Button>
      </div>
    </div>
  )
}

function slug(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}
