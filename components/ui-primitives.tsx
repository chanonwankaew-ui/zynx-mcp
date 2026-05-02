"use client"

import { cn } from "@/lib/utils"
import * as React from "react"

export function GlassCard({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        "glass relative rounded-2xl p-5 md:p-6",
        className,
      )}
    >
      {children}
    </div>
  )
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}
export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...rest
}: ButtonProps) {
  const sizeCls =
    size === "sm" ? "h-8 px-3 text-xs"
    : size === "lg" ? "h-11 px-5 text-sm"
    : "h-9 px-4 text-sm"

  const variantCls =
    variant === "primary"
      ? "bg-[oklch(0.70_0.20_250)] text-white hover:bg-[oklch(0.74_0.22_250)] glow-cyan"
      : variant === "secondary"
      ? "bg-[oklch(0.20_0.04_260/0.7)] text-[color:var(--color-foreground)] border border-[oklch(0.55_0.10_250/0.25)] hover:bg-[oklch(0.25_0.05_260/0.8)]"
      : variant === "danger"
      ? "bg-[oklch(0.55_0.20_25)] text-white hover:bg-[oklch(0.60_0.22_25)]"
      : "text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] hover:bg-[oklch(0.55_0.10_250/0.10)]"

  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50",
        sizeCls,
        variantCls,
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = "cyan",
  className,
}: {
  children: React.ReactNode
  tone?: "cyan" | "violet" | "muted" | "ok"
  className?: string
}) {
  const toneCls =
    tone === "cyan"
      ? "bg-[oklch(0.82_0.16_220/0.12)] text-[oklch(0.85_0.16_220)] border-[oklch(0.82_0.16_220/0.35)]"
      : tone === "violet"
      ? "bg-[oklch(0.65_0.22_295/0.14)] text-[oklch(0.85_0.18_295)] border-[oklch(0.65_0.22_295/0.35)]"
      : tone === "ok"
      ? "bg-[oklch(0.70_0.18_160/0.14)] text-[oklch(0.85_0.18_160)] border-[oklch(0.70_0.18_160/0.35)]"
      : "bg-[oklch(0.55_0.10_250/0.14)] text-[color:var(--color-muted)] border-[oklch(0.55_0.10_250/0.25)]"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        toneCls,
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      {eyebrow && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[oklch(0.82_0.16_220)]">
          {eyebrow}
        </span>
      )}
      <h2 className="text-balance text-2xl font-semibold md:text-3xl">{title}</h2>
      {description && (
        <p className="max-w-2xl text-pretty text-sm text-[color:var(--color-muted)] md:text-base">
          {description}
        </p>
      )}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-muted)]">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-[color:var(--color-muted)]">{hint}</span>}
    </label>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-[oklch(0.55_0.10_250/0.25)] bg-[oklch(0.10_0.04_260/0.6)] px-3 py-2 text-sm text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted)] outline-none transition focus:border-[oklch(0.70_0.20_250)] focus:ring-2 focus:ring-[oklch(0.70_0.20_250/0.25)]",
        props.className,
      )}
    />
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-[oklch(0.55_0.10_250/0.25)] bg-[oklch(0.10_0.04_260/0.6)] px-3 py-2 text-sm text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted)] outline-none transition focus:border-[oklch(0.70_0.20_250)] focus:ring-2 focus:ring-[oklch(0.70_0.20_250/0.25)]",
        props.className,
      )}
    />
  )
}

export function ToastViewport({
  message,
  show,
}: {
  message: string
  show: boolean
}) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300",
        show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      <div className="glass rounded-lg px-4 py-2 text-sm shadow-lg">{message}</div>
    </div>
  )
}
