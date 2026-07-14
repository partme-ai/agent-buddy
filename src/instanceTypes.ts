import type { RuntimeKind } from './types'

export type InstanceKind =
  | 'runtime'
  | 'agent-installation'
  | 'mcp-service'
  | 'knowledge-mirror'
  | 'memory-service'
  | 'session-service'
  | 'local-api'
  | 'connector'
  | 'tool'

export interface InstanceRecord {
  id: string
  name: string
  kind: InstanceKind
  runtime?: RuntimeKind | null
  groupId?: string | null
  status: string
  path?: string | null
  description: string
  tags: string[]
  metadataJson: string
  createdAt: number
  updatedAt: number
}

export interface InstanceGroupRecord {
  id: string
  name: string
  description: string
  color: string
  sortOrder: number
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface InstanceGroupSummary {
  group: InstanceGroupRecord
  instanceCount: number
  statusCounts: Record<string, number>
}

export interface InstanceUpsertRequest {
  id?: string | null
  name: string
  kind: InstanceKind
  runtime?: RuntimeKind | null
  groupId?: string | null
  status: string
  path?: string | null
  description: string
  tags: string[]
  metadataJson?: string | null
}

export interface InstanceGroupUpsertRequest {
  id?: string | null
  name: string
  description: string
  color: string
  sortOrder: number
  tags: string[]
}
