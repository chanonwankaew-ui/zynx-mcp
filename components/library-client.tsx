"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  deleteProject,
  loadLibrary,
  saveDraftProject,
} from "@/lib/storage"
import type { GeneratedProject } from "@/lib/types"
import { Badge, Button, GlassCard, Input } from "./ui-primitives"
import { ResultDisplay } from "./result-display"
import {
  ArrowRight,
  Eye,
  RefreshCw,
  Search,
  Trash2,
  Inbox,
} from "lucide-react"
import { generateProject } from "@/lib/agents"

export function LibraryClient() {
  const [items, setItems] = useState<GeneratedProject[]>([])
  const [query, setQuery] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = () => setItems(loadLibrary())

  useEffect(() => {
    refresh()
    setLoaded(true)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (p) =>
        p.projectName.toLowerCase().includes(q) ||
        p.goal.toLowerCase().includes(q) ||
        p.trigger.toLowerCase().includes(q) ||
        p.templateKey.toLowerCase().includes(q),
    )
  }, [items, query])

  const active = items.find((p) => p.id === activeId) ?? null

  const handleDelete = (id: string) => {
    deleteProject(id)
    if (activeId === id) setActiveId(null)
    refresh()
  }

  const handleRegenerate = (p: GeneratedProject) => {
    const next = generateProject({
      goal: p.goal,
      device: p.device,
      output: p.output,
      triggerOverride: p.trigger,
    })
    saveDraftProject(next)
    setActiveId(null)
    setItems((arr) => [next, ...arr])
  }

  if (!loaded) {
    return <div className="text-sm text-[color:var(--color-muted)]">Loading…</div>
  }

  if (items.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[oklch(0.55_0.10_250/0.15)] text-[oklch(0.82_0.16_220)]">
          <Inbox className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-semibold">No saved workflows yet</h3>
        <p className="max-w-sm text-sm text-[color:var(--color-muted)]">
          Generate a workflow and click <span className="text-[color:var(--color-foreground)]">Save to Library</span> to keep it here.
        </p>
        <Link href="/generator">
          <Button>
            Open Generator <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </GlassCard>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, goal, or trigger…"
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-[oklch(0.55_0.10_250/0.18)] bg-[oklch(0.10_0.04_260/0.5)] p-4 text-sm text-[color:var(--color-muted)]">
          No matches for &quot;{query}&quot;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <GlassCard key={p.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Badge tone="cyan">{p.trigger}</Badge>
                <span className="text-[10px] font-mono text-[color:var(--color-muted)]">
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-base font-semibold leading-tight">{p.projectName}</h3>
              <p className="line-clamp-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
                {p.goal}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                <Button size="sm" variant="secondary" onClick={() => setActiveId(p.id)}>
                  <Eye className="h-3.5 w-3.5" /> View
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleRegenerate(p)}>
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {active && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
              Viewing: {active.projectName}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}>
              Close
            </Button>
          </div>
          <ResultDisplay project={active} onSaved={refresh} />
        </div>
      )}
    </div>
  )
}
