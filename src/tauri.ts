import { invoke } from '@tauri-apps/api/core'
import type {
  AgentInstallation,
  DeepLinkRequest,
  DoctorReport,
  InstallBackup,
  InstallEvent,
  InstallPlan,
  InstallResult,
  InstallTarget,
  LocalAgentSummary,
  RuntimeDefinition,
  RuntimeDetection,
  SourceRefreshResult,
} from './types'

export function refreshAgentSource(): Promise<SourceRefreshResult> {
  return invoke('refresh_agent_source')
}

export function listAgents(): Promise<LocalAgentSummary[]> {
  return invoke('list_agents')
}

export function runtimeDefinitions(): Promise<RuntimeDefinition[]> {
  return invoke('runtime_definitions')
}

export function detectRuntimes(): Promise<RuntimeDetection[]> {
  return invoke('detect_runtimes')
}

export function getInstallPlan(agentIds: string[], targets: InstallTarget[]): Promise<InstallPlan> {
  return invoke('get_install_plan', { agentIds, targets })
}

export function installAgents(agentIds: string[], targets: InstallTarget[]): Promise<InstallResult[]> {
  return invoke('install_agents', { agentIds, targets })
}

export function listInstallations(): Promise<AgentInstallation[]> {
  return invoke('list_installations')
}

export function listInstallBackups(): Promise<InstallBackup[]> {
  return invoke('list_install_backups')
}

export function listInstallEvents(): Promise<InstallEvent[]> {
  return invoke('list_install_events')
}

export function restoreBackup(backupId: string): Promise<void> {
  return invoke('restore_backup', { backupId })
}

export function uninstallInstallation(installationId: string): Promise<void> {
  return invoke('uninstall_installation', { installationId })
}

export function runDoctor(): Promise<DoctorReport> {
  return invoke('run_doctor')
}

export function parseDeepLink(url: string): Promise<DeepLinkRequest> {
  return invoke('parse_deeplink', { url })
}
