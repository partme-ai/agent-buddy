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

export interface LocalAgentSummary {
  id: string
  slug: string
  name: string
  description: string
  category: string
  sourcePath: string
}

export interface RuntimeDetection {
  kind: RuntimeKind
  label: string
  detected: boolean
  scope: InstallScope
  commandPath?: string | null
  configDir?: string | null
  defaultTarget?: string | null
  notes: string[]
}

export interface InstallTarget {
  runtime: RuntimeKind
  projectDir?: string | null
  customDir?: string | null
  categoryFilters?: string[]
}

export interface InstallResult {
  runtime: RuntimeKind
  installedCount: number
  targetPath: string
  filesWritten: number
  warnings: string[]
}

export interface AgentInstallation {
  id: string
  sourceId: string
  agentId: string
  runtime: RuntimeKind
  scope: InstallScope
  projectDir?: string | null
  targetPath: string
  installedFiles: string[]
  sourceCommit?: string | null
  installedAt: number
  status: string
}

export interface SourceRefreshResult {
  sourceId: string
  localPath: string
  commitSha?: string | null
  message: string
}
