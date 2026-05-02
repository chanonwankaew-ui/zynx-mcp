import type { DeviceProfile, OutputType, TriggerCategory } from "./types"

export interface ExampleTemplate {
  slug: string
  title: string
  blurb: string
  goal: string
  device: DeviceProfile
  output: OutputType
  trigger: TriggerCategory
  tags: string[]
}

export const EXAMPLES: ExampleTemplate[] = [
  {
    slug: "idea-capture",
    title: "Idea Capture",
    blurb: "One-prompt idea inbox into Apple Notes, summoned by Siri or a Home Screen icon.",
    goal: "ฉันอยากให้ iPhone ของฉันจดไอเดียเร็ว ๆ ลง Notes ตอนนึกอะไรออก",
    device: "iPhone 12",
    output: "Apple Shortcut Workflow",
    trigger: "Interaction",
    tags: ["Notes", "Siri", "Inbox"],
  },
  {
    slug: "expense-logger",
    title: "Expense Logger",
    blurb: "Log spending in under 5 seconds — amount, category, note → CSV in iCloud Drive.",
    goal: "ฉันอยากให้ iPhone ของฉันบันทึกรายจ่ายเป็น CSV ทุกครั้งที่แตะ NFC ที่กระเป๋าเงิน",
    device: "iPhone 12",
    output: "Full Bundle",
    trigger: "Interaction",
    tags: ["NFC", "CSV", "Money"],
  },
  {
    slug: "morning-dashboard",
    title: "Morning Dashboard",
    blurb: "7:00 AM briefing: events, reminders, weather — delivered as a single notification.",
    goal: "ทุกเช้าให้สรุปนัดวันนี้ + reminder + อากาศ ส่งเป็น notification",
    device: "iPhone 12",
    output: "Apple Shortcut Workflow",
    trigger: "Time",
    tags: ["Time", "Calendar", "Weather"],
  },
  {
    slug: "nfc-desk-mode",
    title: "NFC Desk Mode",
    blurb: "Tap an NFC tag on the desk → Work Focus, work apps open, 25-min Pomodoro.",
    goal: "อยากแตะ NFC แล้วเข้าโหมดทำงาน เปิด Slack, Notion, ตั้งเวลา 25 นาที",
    device: "iPhone 12",
    output: "Apple Shortcut Workflow",
    trigger: "Interaction",
    tags: ["NFC", "Focus", "Pomodoro"],
  },
  {
    slug: "meeting-note-formatter",
    title: "Meeting Note Formatter",
    blurb: "Share raw text → structured Decisions / Action Items / Follow-ups in Notes + Reminders.",
    goal: "อยากเอาบันทึกประชุมดิบ ๆ มา format เป็น Decisions / Action Items / Follow-ups",
    device: "iMac with Apple Intelligence",
    output: "Full Bundle",
    trigger: "Interaction",
    tags: ["Meeting", "Notes", "Reminders"],
  },
  {
    slug: "share-sheet-summarizer",
    title: "Share Sheet Summarizer",
    blurb: "Summarize any article or chat in 3 bullets, copied to clipboard.",
    goal: "อยากสรุปข้อความที่ share เข้ามาให้เหลือ 3 bullet copy ลง clipboard",
    device: "iPhone 12",
    output: "Apple Shortcut Workflow",
    trigger: "Interaction",
    tags: ["Share Sheet", "Summary"],
  },
  {
    slug: "work-focus-automation",
    title: "Work Focus Automation",
    blurb: "Work Focus on → open work apps, set Slack status, start 50-min deep work timer.",
    goal: "อยากให้พอเปิด Work Focus แล้วเปิด Slack, ตั้ง status, ตั้งเวลา 50 นาที",
    device: "iPhone 12",
    output: "Apple Shortcut Workflow",
    trigger: "Device State",
    tags: ["Focus", "Deep Work"],
  },
]

export function getExample(slug: string) {
  return EXAMPLES.find((e) => e.slug === slug)
}
