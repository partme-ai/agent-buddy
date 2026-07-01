import { invoke } from '@tauri-apps/api/core'
import type {
  AgentInstallation,
  InstallResult,
  InstallTarget,
  LocalAgentSummary,
  RuntimeDetection,
  SourceRefreshResult,
} from './types'

export function refreshAgentSource(): Promise<SourceRefreshResult> {
  return invoke('refresh_agent_source')
}

export function listAgents(): Promise<LocalAgentSummary[]> {
  return invoke('list_agents')
}

export function detectRuntimes(): Promise<RuntimeDetection[]> {
  return invoke('detect_runtimes')
}

export function installAgents(agentIds: string[], targets: InstallTarget[]): Promise<InstallResult[]> {
  return invoke('install_agents', { agentIds, targets })
}

export function listInstallations(): Promise<AgentInstallation[]> {
  return invoke('list_installations')
}

export function uninstallInstallation(installationId: string): Promise<void> {
  return invoke('uninstall_installation', { installationId })
}
