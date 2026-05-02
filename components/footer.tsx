export function Footer() {
  return (
    <footer className="border-t border-[oklch(0.55_0.10_250/0.15)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-[color:var(--color-muted)] md:flex-row md:items-center md:px-6">
        <p>
          Shortcut Agent Studio · <span className="gradient-text font-medium">Build it by Chanont Wankaew</span>
        </p>
        <p>Local-first MVP · Rule-based agents · No backend, no login.</p>
      </div>
    </footer>
  )
}
