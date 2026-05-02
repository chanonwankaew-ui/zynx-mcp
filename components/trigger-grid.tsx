import { Clock, MapPin, MessageSquare, Smartphone, Hand, Heart, Home } from "lucide-react"
import { GlassCard, SectionHeading } from "./ui-primitives"

const CATS = [
  { icon: Clock, label: "Time", desc: "Time of Day · Sunrise · Recurring" },
  { icon: MapPin, label: "Location", desc: "Arrive · Leave · Geofence" },
  { icon: MessageSquare, label: "Message / Email", desc: "iMessage · Mail · keyword filters" },
  { icon: Smartphone, label: "Device State", desc: "Focus · Charging · Wi-Fi join" },
  { icon: Hand, label: "Interaction", desc: "NFC · Siri · Home Screen · Share Sheet" },
  { icon: Heart, label: "Health / Activity", desc: "Workout · Sleep · Stand goal" },
  { icon: Home, label: "Smart Home", desc: "HomeKit accessory · scene · sensor" },
]

export function TriggerGrid() {
  return (
    <section>
      <SectionHeading
        eyebrow="Trigger Categories"
        title="Every Apple-supported entry point, mapped."
        description="The generator picks one of these automatically based on your goal — you can override at Step 4."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATS.map((c) => (
          <GlassCard key={c.label} className="flex items-start gap-3 p-4">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.20_0.04_260)] text-[oklch(0.82_0.16_220)] ring-1 ring-[oklch(0.82_0.16_220/0.25)]">
              <c.icon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold">{c.label}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-[color:var(--color-muted)]">
                {c.desc}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
