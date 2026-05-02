import type {
  ConditionLogic,
  DeviceProfile,
  GeneratedProject,
  OutputType,
  Requirements,
  ShortcutAction,
  TemplateKey,
  TriggerCategory,
} from "./types"

// ----- Requirement Agent -----
export function requirementAgent(goal: string, device: DeviceProfile, output: OutputType): Requirements {
  return {
    goal: goal.trim(),
    device,
    output,
    templateKey: detectTemplate(goal),
  }
}

function detectTemplate(goal: string): TemplateKey {
  const g = goal.toLowerCase()
  if (/(รายจ่าย|expense|เงิน|spend|budget)/.test(g)) return "expense"
  if (/(ไอเดีย|idea|จด|note down|brainstorm)/.test(g)) return "idea"
  if (/(ทุกเช้า|morning|เช้า|dashboard|รายงานเช้า)/.test(g)) return "morning"
  if (/(nfc|แตะ|tap|tag)/.test(g)) return "nfc-desk"
  if (/(ประชุม|meeting|note|minute)/.test(g)) return "meeting"
  if (/(สรุปข้อความ|summary|share|sharesheet|sum up)/.test(g)) return "share-summary"
  if (/(focus|โฟกัส|do not disturb|dnd|งาน|work mode)/.test(g)) return "focus"
  return "general"
}

// ----- Trigger Selector Agent -----
export function triggerSelectorAgent(req: Requirements): { trigger: TriggerCategory; reason: string } {
  const g = req.goal.toLowerCase()
  if (/(nfc|แตะ|tap|tag)/.test(g)) {
    return {
      trigger: "Interaction",
      reason: "Goal mentions NFC / tap interaction. NFC tag is the most natural trigger because it requires zero friction — a single tap fires the workflow without unlocking the app.",
    }
  }
  if (/(ทุกเช้า|morning|เช้า|every day|ทุกวัน)/.test(g)) {
    return {
      trigger: "Time",
      reason: "Goal implies a recurring time-based event (morning routine). A Time of Day automation runs reliably even when the device is locked.",
    }
  }
  if (/(ถึงบ้าน|ออกจากบ้าน|location|สถานที่|arrive|leave|geofence)/.test(g)) {
    return {
      trigger: "Location",
      reason: "Goal references a place or arrival/leave event. Location triggers (Arrive / Leave) match this perfectly.",
    }
  }
  if (/(ข้อความ|message|email|imessage|sms)/.test(g)) {
    return {
      trigger: "Message / Email",
      reason: "Goal references incoming text. Message / Email triggers fire on receipt, which is the lowest-latency entry point.",
    }
  }
  if (/(focus|โฟกัส|dnd|do not disturb)/.test(g)) {
    return {
      trigger: "Device State",
      reason: "Goal references a device mode (Focus / DND). Device State change is the canonical trigger.",
    }
  }
  if (/(health|sleep|workout|กิจกรรม|วิ่ง)/.test(g)) {
    return {
      trigger: "Health / Activity",
      reason: "Goal references health metrics — Activity/Health triggers fire when a workout or sleep session ends.",
    }
  }
  if (/(home|สมาร์ทโฮม|smart home|hue|light)/.test(g)) {
    return {
      trigger: "Smart Home",
      reason: "Goal references home/smart home accessories. HomeKit Smart Home triggers are ideal.",
    }
  }
  return {
    trigger: "Interaction",
    reason: "No specific contextual trigger detected. A manual interaction (Home Screen / Siri phrase) is the safest default and gives the user full control.",
  }
}

// ----- Workflow Builder Agent -----
export function workflowBuilderAgent(req: Requirements, trigger: TriggerCategory): {
  projectName: string
  summary: string
  requiredApps: string[]
  inputs: string[]
  actions: ShortcutAction[]
  variables: string[]
  logic: ConditionLogic[]
  errorHandling: string[]
  testingSteps: string[]
  upgradePath: string[]
} {
  switch (req.templateKey) {
    case "expense":
      return buildExpense(req, trigger)
    case "idea":
      return buildIdea(req, trigger)
    case "morning":
      return buildMorning(req, trigger)
    case "nfc-desk":
      return buildNfc(req, trigger)
    case "meeting":
      return buildMeeting(req, trigger)
    case "share-summary":
      return buildShare(req, trigger)
    case "focus":
      return buildFocus(req, trigger)
    default:
      return buildGeneral(req, trigger)
  }
}

function step(n: number, action: string, detail?: string): ShortcutAction {
  return { step: n, action, detail }
}

function buildExpense(req: Requirements, trigger: TriggerCategory) {
  return {
    projectName: "Expense Logger",
    summary:
      "One-tap expense logger that captures amount, category and note, timestamps it, and appends a CSV row to iCloud Drive. Designed to remove friction so logging takes under 5 seconds.",
    requiredApps: ["Shortcuts", "Files (iCloud Drive)", "Notifications"],
    inputs: ["Amount (number)", "Category (menu)", "Note (text, optional)"],
    actions: [
      step(1, "Ask for Input", "Prompt: 'จำนวนเงิน?' — type Number"),
      step(2, "Choose from Menu", "Options: Food, Transport, Shopping, Bills, Other"),
      step(3, "Ask for Input", "Prompt: 'โน้ต (ไม่ใส่ก็ได้)' — type Text, allow empty"),
      step(4, "Current Date", "Use as Timestamp"),
      step(5, "Format Date", "Format: yyyy-MM-dd HH:mm"),
      step(6, "Text", "Build CSV row: ${Date},${Amount},${Category},${Note}"),
      step(7, "Append to File", "Path: iCloud Drive/Shortcuts/expenses.csv"),
      step(8, "Show Notification", "Title: 'บันทึกแล้ว' — body: ${Category} ${Amount}฿"),
    ],
    variables: ["Amount", "Category", "Note", "Timestamp", "CsvRow"],
    logic: [
      {
        ifCondition: "If Amount is empty or 0",
        thenAction: "Show alert 'กรุณากรอกจำนวนเงิน' and stop",
        elseAction: "Continue with menu and append",
      },
    ],
    errorHandling: [
      "If file expenses.csv does not exist → create it with header row first",
      "If iCloud Drive is unavailable → fallback to local Shortcuts folder",
      "If notification permission denied → skip step 8 silently",
    ],
    testingSteps: [
      "Run shortcut from Home Screen — confirm prompt for amount appears",
      "Enter 120, choose Food, leave note empty — confirm CSV row appended",
      "Open Files app → iCloud Drive/Shortcuts/expenses.csv — verify content",
    ],
    upgradePath: [
      "Replace CSV with a Notion / Google Sheets API call via 'Get Contents of URL'",
      "Add monthly summary by reading the CSV and grouping by category",
      "Bind to NFC tag on wallet for one-tap logging",
    ],
  }
}

function buildIdea(_req: Requirements, _trigger: TriggerCategory) {
  return {
    projectName: "Idea Capture",
    summary:
      "Frictionless idea inbox. Triggered by Siri or a Home Screen icon, captures an idea with timestamp into a single 'Ideas Inbox' Apple Note for later triage.",
    requiredApps: ["Shortcuts", "Notes", "Siri"],
    inputs: ["Idea (text, multi-line)"],
    actions: [
      step(1, "Ask for Input", "Prompt: 'ไอเดียวันนี้?' — type Text, multi-line"),
      step(2, "Current Date", "Use as Timestamp"),
      step(3, "Format Date", "Format: yyyy-MM-dd HH:mm"),
      step(4, "Text", "Template: \\n— ${Date}\\n${Idea}"),
      step(5, "Append to Note", "Note title: 'Ideas Inbox' (create if missing)"),
      step(6, "Show Notification", "Title: 'บันทึกไอเดียแล้ว'"),
    ],
    variables: ["Idea", "Timestamp", "Entry"],
    logic: [
      {
        ifCondition: "If Idea is empty",
        thenAction: "Cancel silently — no note write",
        elseAction: "Append entry to Ideas Inbox note",
      },
    ],
    errorHandling: [
      "If Notes app permission missing → guide user via alert to enable in Settings",
      "If 'Ideas Inbox' note missing → create new note with title and continue",
    ],
    testingSteps: [
      "Say 'Hey Siri, capture idea' — confirm prompt appears",
      "Type a sample idea — confirm Notes app shows new line in 'Ideas Inbox'",
    ],
    upgradePath: [
      "Add voice dictation as default input",
      "Sync to a PWA inbox stored in localStorage with export to JSON",
      "Auto-tag idea using on-device keyword matching",
    ],
  }
}

function buildMorning(_req: Requirements, _trigger: TriggerCategory) {
  return {
    projectName: "Morning Dashboard",
    summary:
      "Time-of-day automation that builds a single morning briefing: today's events, reminders and weather — surfaced as a notification at 7:00 AM.",
    requiredApps: ["Shortcuts", "Calendar", "Reminders", "Weather"],
    inputs: [],
    actions: [
      step(1, "Get Upcoming Events", "Filter: Today only"),
      step(2, "Get Reminders", "List: 'Today' — incomplete only"),
      step(3, "Get Current Weather", "Use current location"),
      step(4, "Text", "Template: 🗓 ${Events}\\n✅ ${Reminders}\\n☀️ ${Weather}"),
      step(5, "Show Notification", "Title: 'สวัสดีตอนเช้า' — body: ${Summary}"),
    ],
    variables: ["Events", "Reminders", "Weather", "Summary"],
    logic: [
      {
        ifCondition: "If no events and no reminders",
        thenAction: "Show 'ไม่มีนัดวันนี้ ☕'",
        elseAction: "Render full briefing",
      },
    ],
    errorHandling: [
      "If location permission denied → omit weather line, continue",
      "If Calendar empty → fallback to 'ไม่มีนัด'",
    ],
    testingSteps: [
      "Set automation: Time of Day → 7:00 AM, daily, Run Immediately ON",
      "Trigger manually — confirm notification with all three sections",
    ],
    upgradePath: [
      "Add commute time via Maps API",
      "Pipe summary to a PWA dashboard view",
      "Add a SwiftUI widget version using App Intents",
    ],
  }
}

function buildNfc(_req: Requirements, _trigger: TriggerCategory) {
  return {
    projectName: "NFC Desk Mode",
    summary:
      "Tap an NFC tag on the desk to flip the iPhone into Work mode: enable Focus, open the work app stack, and start a Pomodoro timer.",
    requiredApps: ["Shortcuts", "Focus", "Timer"],
    inputs: [],
    actions: [
      step(1, "Set Focus", "Mode: Work — Until Turned Off"),
      step(2, "Open App", "Slack"),
      step(3, "Open App", "Notion"),
      step(4, "Start Timer", "Duration: 25 minutes (Pomodoro)"),
      step(5, "Set Brightness", "60%"),
      step(6, "Show Notification", "Title: 'Desk Mode On'"),
    ],
    variables: ["TimerDuration"],
    logic: [
      {
        ifCondition: "If current Focus is already 'Work'",
        thenAction: "Skip Set Focus, just start timer",
        elseAction: "Run full sequence",
      },
    ],
    errorHandling: [
      "If Slack/Notion not installed → skip Open App steps without failing",
      "If NFC tag write fails → guide user to NFC writer app",
    ],
    testingSteps: [
      "Write NFC tag pointing to this Shortcut",
      "Tap phone to tag — confirm Focus turns on and timer starts",
    ],
    upgradePath: [
      "Add a 'Leave Desk' tag that reverses everything",
      "Log session length to a CSV on iCloud Drive",
    ],
  }
}

function buildMeeting(_req: Requirements, _trigger: TriggerCategory) {
  return {
    projectName: "Meeting Note Formatter",
    summary:
      "Receive raw meeting text from the Share Sheet, then format it into Decisions / Action Items / Follow-ups, save as a structured Note, and create Reminders for each action item.",
    requiredApps: ["Shortcuts", "Notes", "Reminders"],
    inputs: ["Raw text (from Share Sheet)", "Meeting title (text)"],
    actions: [
      step(1, "Receive Input", "Type: Text from Share Sheet"),
      step(2, "Ask for Input", "Prompt: 'ชื่อประชุม?' — type Text"),
      step(3, "Match Text", "Regex: lines starting with 'TODO:' or '- [ ]'"),
      step(4, "Repeat with Each", "For each action → Add Reminder with due tomorrow 9:00"),
      step(5, "Text", "Build Markdown: # ${Title}\\n## Decisions\\n## Action Items\\n## Follow-ups"),
      step(6, "Create Note", "Folder: 'Meetings'"),
      step(7, "Show Notification", "Title: 'บันทึกประชุมเรียบร้อย'"),
    ],
    variables: ["RawText", "Title", "Actions", "FormattedNote"],
    logic: [
      {
        ifCondition: "If no action items detected",
        thenAction: "Skip Reminder creation, still save note",
        elseAction: "Create Reminders + save note",
      },
    ],
    errorHandling: [
      "If Reminders permission denied → save action list as plain text in note",
      "If text length < 20 chars → confirm with user before saving",
    ],
    testingSteps: [
      "From Notes, share a sample meeting note → run shortcut",
      "Verify note created in 'Meetings' folder with three sections",
      "Verify reminders created for each TODO line",
    ],
    upgradePath: [
      "Use on-device text classification to extract decisions automatically",
      "Pipe summary to PWA archive view with full-text search",
    ],
  }
}

function buildShare(_req: Requirements, _trigger: TriggerCategory) {
  return {
    projectName: "Share Sheet Summarizer",
    summary:
      "Run from Share Sheet on any article or chat. Extracts text, builds a 3-bullet summary using rule-based heuristics today (replaceable with an LLM later), and copies it to clipboard.",
    requiredApps: ["Shortcuts", "Safari (Reader)", "Clipboard"],
    inputs: ["URL or text from Share Sheet"],
    actions: [
      step(1, "Receive Input", "Accept: URLs, Safari web pages, text"),
      step(2, "Get Article using Safari Reader", "If URL"),
      step(3, "Split Text by Sentence", ""),
      step(4, "Get First N Items", "N = 3"),
      step(5, "Combine Text", "Join with newline + bullet"),
      step(6, "Copy to Clipboard", ""),
      step(7, "Show Notification", "Title: 'สรุปแล้ว — อยู่ใน Clipboard'"),
    ],
    variables: ["Source", "Sentences", "TopThree", "Summary"],
    logic: [
      {
        ifCondition: "If Source is URL",
        thenAction: "Use Safari Reader to extract text",
        elseAction: "Use raw text directly",
      },
    ],
    errorHandling: [
      "If Reader extraction fails → fallback to page title only",
      "If text < 3 sentences → return as-is with a note",
    ],
    testingSteps: [
      "From Safari, share any article → run shortcut",
      "Paste somewhere — confirm 3-bullet summary",
    ],
    upgradePath: [
      "Replace heuristic summary with on-device or API LLM call",
      "Save summaries to a PWA reading list with tags",
    ],
  }
}

function buildFocus(_req: Requirements, _trigger: TriggerCategory) {
  return {
    projectName: "Work Focus Automation",
    summary:
      "When Work Focus turns on, open the work app stack, set Slack to Active, lower brightness slightly, and start a 50-min deep work timer.",
    requiredApps: ["Shortcuts", "Focus", "Slack"],
    inputs: [],
    actions: [
      step(1, "Open App", "Slack"),
      step(2, "Open URL", "slack://status?text=In+Deep+Work"),
      step(3, "Set Brightness", "55%"),
      step(4, "Start Timer", "50 minutes"),
      step(5, "Show Notification", "Title: 'Deep Work — Go.'"),
    ],
    variables: ["TimerDuration"],
    logic: [
      {
        ifCondition: "If on Wi-Fi 'Home'",
        thenAction: "Use 25-min timer (split focus blocks)",
        elseAction: "Use 50-min timer",
      },
    ],
    errorHandling: [
      "If Slack URL scheme unavailable → skip status step",
    ],
    testingSteps: [
      "Toggle Work Focus → confirm automation fires",
    ],
    upgradePath: [
      "Pair with NFC tag for desk mode",
      "Log focus blocks to CSV",
    ],
  }
}

function buildGeneral(req: Requirements, _trigger: TriggerCategory) {
  return {
    projectName: "Custom Workflow",
    summary: `A general-purpose Shortcut tailored to: "${req.goal}". Uses a manual trigger and a single ask-input prompt, then logs to Notes. Customize from here.`,
    requiredApps: ["Shortcuts", "Notes"],
    inputs: ["User input (text)"],
    actions: [
      step(1, "Ask for Input", "Prompt: 'ระบุข้อมูล'"),
      step(2, "Current Date", ""),
      step(3, "Text", "Template: ${Date} — ${Input}"),
      step(4, "Append to Note", "Note: 'Workflow Inbox'"),
      step(5, "Show Notification", "Title: 'บันทึกแล้ว'"),
    ],
    variables: ["Input", "Date", "Entry"],
    logic: [
      { ifCondition: "If Input is empty", thenAction: "Cancel", elseAction: "Append entry" },
    ],
    errorHandling: ["If note missing → create on first run"],
    testingSteps: ["Run from Home Screen → enter sample text → check Notes"],
    upgradePath: [
      "Refine the goal with more specific keywords (NFC, morning, location, expense, idea)",
      "Re-run generator for a more specialized workflow",
    ],
  }
}

// ----- PWA / iOS / App Intents Agents -----
export function pwaBlueprintAgent(req: Requirements, projectName: string): string {
  return `# ${projectName} — PWA Blueprint

## Manifest
{
  "name": "${projectName}",
  "short_name": "${projectName.split(" ")[0]}",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0b1020",
  "theme_color": "#22d3ee",
  "icons": [{ "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }]
}

## Pages
- /              — Capture form (single big input)
- /history       — List saved entries (localStorage)
- /export        — Download JSON / CSV

## Storage
localStorage key: "${projectName.toLowerCase().replace(/\s+/g, "-")}.entries"
Entry shape: { id, createdAt, payload }

## Service Worker
- Cache shell (HTML, CSS, JS)
- Network-first for /api/* (when added)
- Offline fallback: /offline.html

## Install Prompt
- Listen to 'beforeinstallprompt'
- Show a custom "Add to Home Screen" button after first save

## Why a PWA matches "${req.goal}"
A PWA gives you offline-first capture identical to the Shortcut, plus a richer history UI that Shortcuts cannot render.
`
}

export function iosBlueprintAgent(_req: Requirements, projectName: string): string {
  return `// ${projectName} — SwiftUI App Blueprint
import SwiftUI

@main
struct ${projectName.replace(/\s+/g, "")}App: App {
  var body: some Scene {
    WindowGroup { RootView() }
  }
}

struct RootView: View {
  @State private var input = ""
  @State private var entries: [Entry] = Storage.load()

  var body: some View {
    NavigationStack {
      VStack(spacing: 16) {
        TextField("Capture…", text: $input, axis: .vertical)
          .textFieldStyle(.roundedBorder)
          .lineLimit(3...6)

        Button("Save") {
          let e = Entry(id: UUID(), createdAt: .now, body: input)
          entries.insert(e, at: 0)
          Storage.save(entries)
          input = ""
        }
        .buttonStyle(.borderedProminent)
        .disabled(input.isEmpty)

        List(entries) { e in
          VStack(alignment: .leading) {
            Text(e.body).lineLimit(2)
            Text(e.createdAt.formatted()).font(.caption).foregroundStyle(.secondary)
          }
        }
      }
      .padding()
      .navigationTitle("${projectName}")
    }
  }
}

struct Entry: Identifiable, Codable {
  let id: UUID
  let createdAt: Date
  let body: String
}

enum Storage {
  static let key = "${projectName.toLowerCase().replace(/\s+/g, ".")}.entries"
  static func load() -> [Entry] {
    guard let data = UserDefaults.standard.data(forKey: key),
          let arr = try? JSONDecoder().decode([Entry].self, from: data) else { return [] }
    return arr
  }
  static func save(_ entries: [Entry]) {
    if let data = try? JSONEncoder().encode(entries) {
      UserDefaults.standard.set(data, forKey: key)
    }
  }
}
`
}

export function appIntentsAgent(_req: Requirements, projectName: string): string {
  return `// ${projectName} — App Intents Blueprint
import AppIntents

struct CaptureIntent: AppIntent {
  static var title: LocalizedStringResource = "Capture for ${projectName}"
  static var description = IntentDescription("Add a new entry from Siri or Shortcuts.")
  static var openAppWhenRun = false

  @Parameter(title: "Body") var body: String

  func perform() async throws -> some IntentResult & ProvidesDialog {
    let entry = Entry(id: UUID(), createdAt: .now, body: body)
    var entries = Storage.load()
    entries.insert(entry, at: 0)
    Storage.save(entries)
    return .result(dialog: "Saved.")
  }
}

struct ${projectName.replace(/\s+/g, "")}Shortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: CaptureIntent(),
      phrases: ["Capture in \\(.applicationName)", "Add note to \\(.applicationName)"],
      shortTitle: "Capture",
      systemImageName: "square.and.pencil"
    )
  }
}
`
}

// ----- Export Agent -----
export function exportAgent(p: GeneratedProject) {
  const md = projectToMarkdown(p)
  const json = JSON.stringify(p, null, 2)
  return { markdown: md, json }
}

export function projectToMarkdown(p: GeneratedProject): string {
  return `# ${p.projectName}

**Trigger:** ${p.trigger}  •  **Device:** ${p.device}  •  **Output:** ${p.output}

## Summary
${p.summary}

## Why this trigger
${p.triggerReason}

## Required Apps / Permissions
${p.requiredApps.map((a) => `- ${a}`).join("\n")}

## Inputs
${p.inputs.length ? p.inputs.map((i) => `- ${i}`).join("\n") : "_none_"}

## Shortcut Actions
${p.actions.map((a) => `${a.step}. **${a.action}**${a.detail ? ` — ${a.detail}` : ""}`).join("\n")}

## Variables
${p.variables.map((v) => `- \`${v}\``).join("\n")}

## Logic
${p.logic.map((l) => `- **If** ${l.ifCondition}\n  - Then: ${l.thenAction}\n  - Else: ${l.elseAction}`).join("\n")}

## Error Handling
${p.errorHandling.map((e) => `- ${e}`).join("\n")}

## Testing Steps
${p.testingSteps.map((t, i) => `${i + 1}. ${t}`).join("\n")}

## Upgrade Path
${p.upgradePath.map((u) => `- ${u}`).join("\n")}

---

## PWA Blueprint
\`\`\`
${p.pwaBlueprint}
\`\`\`

## SwiftUI App Blueprint
\`\`\`swift
${p.swiftBlueprint}
\`\`\`

## App Intents Blueprint
\`\`\`swift
${p.appIntentsBlueprint}
\`\`\`

## JSON Spec
\`\`\`json
${JSON.stringify(p.jsonSpec, null, 2)}
\`\`\`
`
}

// ----- Orchestrator -----
export function generateProject(input: {
  goal: string
  device: DeviceProfile
  output: OutputType
  triggerOverride?: TriggerCategory
}): GeneratedProject {
  const req = requirementAgent(input.goal, input.device, input.output)
  const auto = triggerSelectorAgent(req)
  const trigger = input.triggerOverride ?? auto.trigger
  const triggerReason = input.triggerOverride
    ? `Manual override: you selected "${input.triggerOverride}". Auto-detection had suggested "${auto.trigger}" because: ${auto.reason}`
    : auto.reason

  const built = workflowBuilderAgent(req, trigger)
  const pwa = pwaBlueprintAgent(req, built.projectName)
  const swift = iosBlueprintAgent(req, built.projectName)
  const intents = appIntentsAgent(req, built.projectName)

  const project: GeneratedProject = {
    id: cryptoRandomId(),
    createdAt: Date.now(),
    goal: req.goal,
    device: req.device,
    output: req.output,
    trigger,
    templateKey: req.templateKey,
    projectName: built.projectName,
    summary: built.summary,
    triggerReason,
    requiredApps: built.requiredApps,
    inputs: built.inputs,
    actions: built.actions,
    variables: built.variables,
    logic: built.logic,
    errorHandling: built.errorHandling,
    testingSteps: built.testingSteps,
    upgradePath: built.upgradePath,
    pwaBlueprint: pwa,
    swiftBlueprint: swift,
    appIntentsBlueprint: intents,
    jsonSpec: {
      version: "0.1",
      name: built.projectName,
      goal: req.goal,
      device: req.device,
      output: req.output,
      trigger,
      actions: built.actions,
      variables: built.variables,
      logic: built.logic,
    },
  }
  return project
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36)
}
