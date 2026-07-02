export type RuntimeKind =
  | 'claude-code'
  | 'copilot'
  | 'antigravity'
  | 'gemini-cli'
  | 'opencode'
  | 'openclaw'
  | 'cursor'
  | 'trae'
  | 'aider'
  | 'windsurf'
  | 'qwen'
  | 'codex'
  | 'deerflow'
  | 'workbuddy'
  | 'codewhale'
  | 'hermes'
  | 'kiro'
  | 'qoder'

export type InstallScope = 'global' | 'project' | 'custom'
export type DoctorStatus = 'ok' | 'warning' | 'error'
export type DeepLinkAction = 'install-source' | 'install-agent' | 'install-bundle' | 'install-skill' | 'install-mcp' | 'handoff' | 'unknown'
export type McpTransport = 'stdio' | 'http' | 'sse'
export type SkillSyncMode = 'auto' | 'symlink' | 'copy'
export type AuditSeverity = 'info' | 'warn' | 'error' | 'security'
export type SyncStatus = 'pending' | 'sent' | 'failed' | 'skipped'
export type MemoryScope = 'user' | 'agent' | 'project' | 'team' | 'tool'
export type MemoryType = 'preference' | 'correction' | 'project-context' | 'team-rule' | 'episodic' | 'tool-usage' | 'other'
export type MemoryStatus = 'pending' | 'active' | 'rejected' | 'archived'
export type SessionEventType =
  | 'session-created'
  | 'user-message-received'
  | 'agent-message-generated'
  | 'knowledge-searched'
  | 'memory-read'
  | 'memory-proposed'
  | 'skill-invoked'
  | 'mcp-tool-called'
  | 'tool-result-received'
  | 'file-changed'
  | 'approval-requested'
  | 'approval-resolved'
  | 'session-summarized'
  | 'handoff-created'
  | 'error'

export interface LocalAgentSummary { id: string; slug: string; name: string; description: string; category: string; sourcePath: string }
export interface RuntimeDefinition { kind: RuntimeKind; label: string; scope: InstallScope; requiresProjectDir: boolean; supportsUninstall: boolean; supportsNativeRegistration: boolean; defaultTarget?: string | null }
export interface RuntimeDetection { kind: RuntimeKind; label: string; detected: boolean; scope: InstallScope; commandPath?: string | null; configDir?: string | null; defaultTarget?: string | null; notes: string[] }
export interface InstallTarget { runtime: RuntimeKind; projectDir?: string | null; customDir?: string | null; categoryFilters?: string[] }
export interface RuntimeInstallPlan { runtime: RuntimeKind; scope: InstallScope; targetDirs: string[]; filesToWrite: number; agentsToInstall: number; postActions: string[]; warnings: string[] }
export interface InstallConflict { runtime: RuntimeKind; path: string; reason: string }
export interface InstallPlan { sourceId: string; totalAgents: number; totalFiles: number; targets: RuntimeInstallPlan[]; conflicts: InstallConflict[]; warnings: string[] }
export interface InstallResult { runtime: RuntimeKind; installedCount: number; targetPath: string; filesWritten: number; warnings: string[] }
export interface AgentInstallation { id: string; sourceId: string; agentId: string; runtime: RuntimeKind; scope: InstallScope; projectDir?: string | null; targetPath: string; installedFiles: string[]; sourceCommit?: string | null; installedAt: number; status: string }
export interface InstallBackup { id: string; installationId: string; runtime: RuntimeKind; originalPath: string; backupPath: string; createdAt: number }
export interface InstallEvent { id: string; installationId?: string | null; runtime?: RuntimeKind | null; level: string; message: string; createdAt: number }
export interface DoctorSummary { ok: number; warning: number; error: number }
export interface DoctorCheck { id: string; label: string; status: DoctorStatus; message: string; remediation?: string | null }
export interface DoctorReport { summary: DoctorSummary; checks: DoctorCheck[] }
export interface DeepLinkRequest { rawUrl: string; action: DeepLinkAction; params: Record<string, string> }

export interface AgentBundle {
  bundleId: string
  version: string
  profile: AgentProfile
  instructions: AgentInstructions
  knowledge: KnowledgePolicy
  memory: MemoryPolicy
  skills: SkillRef[]
  mcpServers: McpServerRef[]
  permissions: PermissionPolicy
  targets: RuntimeKind[]
  source: BundleSource
  metadata: Record<string, string>
}
export interface AgentProfile { name: string; description: string; category: string; avatar?: string | null }
export interface AgentInstructions { role: string; rules: string[]; body: string; outputFormat?: string | null }
export interface KnowledgePolicy { spaces: string[]; syncMode: string; retrievalRequired: boolean }
export interface MemoryPolicy { provider: string; readScopes: string[]; writePolicy: string }
export interface SkillRef { id: string; source: string; version?: string | null }
export interface McpServerRef { id: string; required: boolean }
export interface PermissionPolicy { fileWrite: string; network: string; shell: string; externalPublish: string }
export interface BundleSource { sourceId: string; sourcePath: string; upstreamLicense?: string | null }

export interface McpPolicy { fileSystem: string; network: string; shell: string; audit: boolean; approvalRequired: boolean }
export interface McpServerConfig { id: string; name: string; description: string; transport: McpTransport; command?: string | null; args: string[]; url?: string | null; required: boolean; enabled: boolean; managedBy: string; policy: McpPolicy }
export interface SkillPackage { id: string; name: string; description: string; source: string; version?: string | null; packagePath?: string | null; syncMode: SkillSyncMode; enabledTargets: RuntimeKind[] }
export interface SkillTargetPath { runtime: RuntimeKind; globalPath?: string | null; projectRelativePath?: string | null; supportsSymlink: boolean }
export interface GeneratedArtifact { sourceId: string; generationId: string; runtime: string; relativePath: string; absolutePath: string; sizeBytes: number; modifiedAt?: number | null }
export interface AuditEvent { id: string; actor: string; action: string; resourceType: string; resourceId: string; runtime?: RuntimeKind | null; severity: AuditSeverity; message: string; metadataJson: string; createdAt: number }
export interface SyncOutboxEvent { id: string; aggregateType: string; aggregateId: string; eventType: string; payloadJson: string; status: SyncStatus; retryCount: number; createdAt: number; updatedAt: number }

export interface MemoryItem { id: string; scope: MemoryScope; memoryType: MemoryType; title: string; content: string; source: string; status: MemoryStatus; createdAt: number; updatedAt: number }
export interface MemoryCandidate { id: string; scope: MemoryScope; memoryType: MemoryType; content: string; sourceSessionId?: string | null; confidence: number; status: MemoryStatus; createdAt: number }
export interface KnowledgeSpace { id: string; name: string; description: string; source: string; syncMode: string; documentCount: number; createdAt: number; updatedAt: number }
export interface KnowledgeSnapshot { id: string; spaceId: string; version: string; manifestPath: string; status: string; createdAt: number }
export interface SessionEvent { id: string; sessionId: string; runtime?: RuntimeKind | null; eventType: SessionEventType; payloadJson: string; createdAt: number }
export interface HandoffPack { id: string; fromRuntime?: RuntimeKind | null; toRuntime?: RuntimeKind | null; sessionId: string; goal: string; summary: string; knowledgeRefs: string[]; memoryRefs: string[]; openTasks: string[]; createdAt: number }

export interface SourceRefreshResult { sourceId: string; localPath: string; commitSha?: string | null; message: string }
