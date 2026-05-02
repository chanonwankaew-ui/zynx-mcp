import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lg-edge" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.82 0.16 220)" />
          <stop offset="0.5" stopColor="oklch(0.70 0.20 250)" />
          <stop offset="1" stopColor="oklch(0.65 0.22 295)" />
        </linearGradient>
        <radialGradient id="lg-node" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="oklch(0.95 0.10 220)" />
          <stop offset="1" stopColor="oklch(0.65 0.22 295 / 0)" />
        </radialGradient>
      </defs>

      {/* Hex frame */}
      <path
        d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z"
        stroke="url(#lg-edge)"
        strokeWidth="2"
        opacity="0.55"
      />

      {/* Z / circuit path */}
      <path
        d="M18 20 H44 L22 44 H46"
        stroke="url(#lg-edge)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Glowing nodes */}
      <circle cx="18" cy="20" r="3.2" fill="url(#lg-node)" />
      <circle cx="44" cy="20" r="3.2" fill="url(#lg-node)" />
      <circle cx="22" cy="44" r="3.2" fill="url(#lg-node)" />
      <circle cx="46" cy="44" r="3.2" fill="url(#lg-node)" />
    </svg>
  )
}
