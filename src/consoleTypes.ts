import type {
  AuditSeverity,
  DoctorReport,
  GeneratedArtifact,
  InstallBackup,
  RuntimeKind,
  SyncFlushPlan,
} from './types'

export interface ConsoleMetric { key: string; label: string; value: number; unit: string; trend: string }
export interface ConsoleRuntimeSummary { total: number; detected: number; notDetected: number; byScope: Record<string, number> }
export interface ConsoleSyncSummary { pending: number; failed: number; sent: number; skipped: number; flushPlan: SyncFlushPlan }
export interface ConsoleTimelineEvent { id: string; title: string; message: string; level: string; createdAt: number }
export interface ConsoleOverviewDashboard { generatedAt: number; metrics: ConsoleMetric[]; healthScore: number; runtimeSummary: ConsoleRuntimeSummary; syncSummary: ConsoleSyncSummary; recentEvents: ConsoleTimelineEvent[]; warnings: string[] }
export interface ConsoleRuntimeCheck { runtime: RuntimeKind; label: string; status: string; path?: string | null; notes: string[] }
export interface ConsoleRiskAlert { id: string; severity: AuditSeverity | string; title: string; message: string; createdAt: number }
export interface ConsoleHealthBoard { generatedAt: number; doctor: DoctorReport; runtimeChecks: ConsoleRuntimeCheck[]; riskAlerts: ConsoleRiskAlert[]; recentTasks: ConsoleTimelineEvent[]; syncFailures: ConsoleTimelineEvent[]; warnings: string[] }
export interface ConsoleInstance { id: string; name: string; instanceType: string; status: string; group: string; runtime?: RuntimeKind | null; path?: string | null; tags: string[]; description: string; updatedAt?: number | null }
export interface ConsoleInstanceGroup { id: string; label: string; count: number; tags: string[]; statusCounts: Record<string, number> }
export interface CleanupCandidate { id: string; path: string; reason: string; sizeBytes: number; createdOrModifiedAt?: number | null }
export interface CleanupDeletion { id: string; path: string; sizeBytes: number }
export interface CleanupFailure { id: string; path: string; message: string }
export interface RetentionCleanupPlan { generatedAt: number; generatedCandidates: CleanupCandidate[]; backupCandidates: CleanupCandidate[]; totalBytes: number; warnings: string[] }
export interface RetentionCleanupResult { generatedAt: number; deleted: CleanupDeletion[]; failed: CleanupFailure[]; totalDeletedBytes: number; warnings: string[] }

export interface LocalDaemonPlan {
  enabled: boolean
  bindHost: string
  bindPort: number
  baseUrl: string
  routeCount: number
  mcpServerCount: number
  capabilities: string[]
  warnings: string[]
}

export interface LocalDaemonStatus {
  enabled: boolean
  running: boolean
  bindHost: string
  bindPort: number
  baseUrl: string
  startedAt?: number | null
  routeCount: number
  mcpServerCount: number
  lastError?: string | null
  warnings: string[]
}

export interface LocalDaemonStartResult { status: LocalDaemonStatus; message: string }
export interface LocalDaemonStopResult { status: LocalDaemonStatus; message: string }

export interface ConsoleBackendSurface {
  overview: ConsoleOverviewDashboard
  health: ConsoleHealthBoard
  instances: ConsoleInstance[]
  groups: ConsoleInstanceGroup[]
  retention: RetentionCleanupPlan
  daemon: LocalDaemonPlan
}

export interface CleanupPreviewContext { artifacts: GeneratedArtifact[]; backups: InstallBackup[] }
