import type { RuntimeKind } from './types'

export interface InspectorSnapshot {
  subjectId: string
  subjectType: string
  title: string
  summary: string
  sections: InspectorSection[]
  actions: InspectorAction[]
  warnings: string[]
}

export interface InspectorSection {
  id: string
  title: string
  rows: InspectorRow[]
  code?: string | null
}

export interface InspectorRow {
  label: string
  value: string
}

export interface InspectorAction {
  id: string
  label: string
  destructive: boolean
  requiresApproval: boolean
}

export interface RuntimeDoctorReport {
  runtime: RuntimeKind
  runtimeKey: string
  label: string
  detected: boolean
  health: string
  score: number
  checks: RuntimeDoctorCheck[]
  recommendedActions: string[]
}

export interface RuntimeDoctorCheck {
  id: string
  label: string
  status: string
  message: string
  remediation?: string | null
}

export interface LocalDaemonStatus {
  enabled: boolean
  state: string
  baseUrl: string
  routeCount: number
  mcpServerCount: number
  pid?: number | null
  startedAt?: number | null
  warnings: string[]
}

export interface LocalDaemonControlResult {
  status: LocalDaemonStatus
  message: string
}
