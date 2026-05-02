"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"
import { Logo } from "./logo"

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/generator", label: "Generator" },
  { href: "/examples", label: "Examples" },
  { href: "/library", label: "Library" },
  { href: "/export", label: "Export" },
]

export function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-[oklch(0.55_0.10_250/0.15)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Logo className="h-9 w-9" />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">Shortcut Agent Studio</span>
            <span className="text-[11px] text-[color:var(--color-muted)]">
              Build it by Chanont Wankaew
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href))
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[oklch(0.55_0.10_250/0.18)] text-[color:var(--color-foreground)]"
                    : "text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
                )}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          aria-label="Toggle menu"
          className="rounded-lg border border-[oklch(0.55_0.10_250/0.2)] p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[oklch(0.55_0.10_250/0.15)] md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col px-4 py-2">
            {LINKS.map((l) => {
              const active = pathname === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    active
                      ? "bg-[oklch(0.55_0.10_250/0.18)] text-[color:var(--color-foreground)]"
                      : "text-[color:var(--color-muted)]",
                  )}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
