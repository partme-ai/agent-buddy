export type BrowserProvider = 'mock' | 'buddy-browser' | 'external-chromium'

export type BrowserProfile = {
  id: string
  name: string
  provider: BrowserProvider
  persistent: boolean
  profileDir?: string | null
  signedInDomains: string[]
  lastUsedAt?: number | null
}

export type BrowserSessionState = 'created' | 'active' | 'waiting-for-user' | 'closed' | 'failed'

export type BrowserTab = {
  id: string
  title: string
  url: string
  active: boolean
  ownedByAgent: boolean
  borrowedFromUser: boolean
}

export type BrowserSession = {
  id: string
  profileId: string
  label: string
  state: BrowserSessionState
  createdAt: number
  lastActiveAt: number
  tabs: BrowserTab[]
  warnings: string[]
}

export type SnapshotSource = 'dom' | 'accessibility-tree' | 'screenshot-annotation' | 'network' | 'mock'

export type ElementRef = {
  refId: string
  role?: string | null
  name?: string | null
  text?: string | null
  selector?: string | null
  visible: boolean
  enabled: boolean
  fingerprint: Record<string, string>
}

export type PageSnapshot = {
  sessionId: string
  tabId: string
  url: string
  title: string
  source: SnapshotSource
  capturedAt: number
  elements: ElementRef[]
  textPreview: string
  warnings: string[]
}

export type BrowserAction =
  | { kind: 'open'; url: string }
  | { kind: 'click'; target: string }
  | { kind: 'type'; target: string; text: string }
  | { kind: 'fill'; fields: Record<string, string> }
  | { kind: 'select'; target: string; value: string }
  | { kind: 'keys'; keys: string[] }
  | { kind: 'scroll'; direction: string; amount: number }
  | { kind: 'screenshot' }
  | { kind: 'extract'; instruction: string }
  | { kind: 'waitFor'; condition: string; timeoutMs: number }
  | { kind: 'closeTab'; tabId: string }
  | { kind: 'humanTakeover'; reason: string }

export type BrowserActionRequest = {
  sessionId: string
  tabId?: string | null
  action: BrowserAction
  reason: string
  requestedBy: string
}

export type MatchLevel = 'exact' | 'stable' | 'reidentified' | 'unverified'

export type BrowserActionError = {
  code: string
  message: string
  hint?: string | null
  candidates: string[]
}

export type BrowserActionResult = {
  actionId: string
  ok: boolean
  sessionId: string
  tabId?: string | null
  matchLevel?: MatchLevel | null
  beforeSnapshotId?: string | null
  afterSnapshotId?: string | null
  message: string
  warnings: string[]
  error?: BrowserActionError | null
}

export type BrowserWorkbenchState = {
  profiles: BrowserProfile[]
  sessions: BrowserSession[]
  latestSnapshot?: PageSnapshot | null
  supportedActions: string[]
  warnings: string[]
}

export type AutomationMode = 'observe-only' | 'assisted' | 'confirm-before-write' | 'autonomous-low-risk'
export type PolicyRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type PolicyContext = {
  userId?: string | null
  workspaceId?: string | null
  profileId?: string | null
  sessionId: string
  platform?: string | null
  automationMode: AutomationMode
}

export type PolicyDecision = {
  decisionId: string
  actionId: string
  allowed: boolean
  requiresConfirmation: boolean
  riskLevel: PolicyRiskLevel
  reason: string
  requiredConfirmations: string[]
  blockedBy: string[]
}

export type AuditFrameSummary = {
  id: string
  actionSummary: string
  ok: boolean
  riskLevel: string
  requiresConfirmation: boolean
  createdAt: number
}

export type AuditTimeline = {
  taskId?: string | null
  sessionId: string
  frames: AuditFrameSummary[]
  warnings: string[]
}
