"use client"

import type { GeneratedProject } from "./types"

const KEY = "shortcut-agent-studio.library.v1"
const DRAFT_KEY = "shortcut-agent-studio.draft.v1"

export function loadLibrary(): GeneratedProject[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GeneratedProject[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLibrary(items: GeneratedProject[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, JSON.stringify(items))
}

export function saveProject(p: GeneratedProject) {
  const items = loadLibrary()
  const idx = items.findIndex((x) => x.id === p.id)
  if (idx >= 0) items[idx] = p
  else items.unshift(p)
  saveLibrary(items)
}

export function deleteProject(id: string) {
  const items = loadLibrary().filter((x) => x.id !== id)
  saveLibrary(items)
}

export function saveDraftProject(p: GeneratedProject) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(p))
}

export function loadDraftProject(): GeneratedProject | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as GeneratedProject) : null
  } catch {
    return null
  }
}

export function clearDraftProject() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(DRAFT_KEY)
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
