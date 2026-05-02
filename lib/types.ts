export type DeviceProfile = "iPhone 12" | "iMac with Apple Intelligence" | "Custom"

export type OutputType =
  | "Apple Shortcut Workflow"
  | "PWA Blueprint"
  | "iOS App Blueprint"
  | "Full Bundle"

export type TriggerCategory =
  | "Time"
  | "Location"
  | "Message / Email"
  | "Device State"
  | "Interaction"
  | "Health / Activity"
  | "Smart Home"

export interface Requirements {
  goal: string
  device: DeviceProfile
  output: OutputType
  templateKey: TemplateKey
}

export type TemplateKey =
  | "expense"
  | "idea"
  | "morning"
  | "nfc-desk"
  | "meeting"
  | "share-summary"
  | "focus"
  | "general"

export interface ShortcutAction {
  step: number
  action: string
  detail?: string
}

export interface ConditionLogic {
  ifCondition: string
  thenAction: string
  elseAction: string
}

export interface GeneratedProject {
  id: string
  createdAt: number
  goal: string
  device: DeviceProfile
  output: OutputType
  trigger: TriggerCategory
  templateKey: TemplateKey

  projectName: string
  summary: string
  triggerReason: string
  requiredApps: string[]
  inputs: string[]
  actions: ShortcutAction[]
  variables: string[]
  logic: ConditionLogic[]
  errorHandling: string[]
  testingSteps: string[]
  upgradePath: string[]

  pwaBlueprint: string
  swiftBlueprint: string
  appIntentsBlueprint: string
  jsonSpec: Record<string, unknown>
}
