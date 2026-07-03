import { invoke } from '@tauri-apps/api/core'
import type {
  AgentBuddySettings,
  AgentBundle,
  AgentBundleDiff,
  AgentInstallation,
  AgentMarkdownPreview,
  AgentRuntimeConversionPreview,
  AgentSourceDetail,
  AgentSourceSummary,
  ApprovalRequest,
  AuditEvent,
  BuddyStatusReport,
  BundleCatalogItem,
  BundlePullRequest,
  DeepLinkRequest,
  DeviceRegistrationRequest,
  DoctorReport,
  GeneratedArtifact,
  HandoffPack,
  InstructionInjectionPlan,
  InstallBackup,
  InstallEvent,
  InstallPlan,
  InstallResult,
  InstallTarget,
  KnowledgeContextPack,
  KnowledgeMirrorPlan,
  KnowledgeSnapshot,
  KnowledgeSpace,
  LifecyclePlan,
  LocalAgentSummary,
  LocalApiSpec,
  MarketplaceSource,
  McpConfigPlan,
  McpInstallPlan,
  McpInstallRequest,
  McpServerConfig,
  MemoryCandidate,
  MemoryInitPlan,
  MemoryItem,
  MemoryScope,
  MemoryType,
  MemoryWritebackPlan,
  PaasBundleSummary,
  PaasConnectionInfo,
  PaasConnectionStatus,
  PaasLoginRequest,
  PaasSession,
  PaasSyncPreview,
  RiskScanReport,
  RuntimeConfigPreview,
  RuntimeDefinition,
  RuntimeDetection,
  RuntimeKind,
  SessionEvent,
  SessionEventType,
  SessionSyncPlan,
  SkillInstallPlan,
  SkillInstallRequest,
  SkillPackage,
  SkillTargetPath,
  SourceImportRequest,
  SourceImportRiskPreview,
  SourceRefreshResult,
  SyncFlushPlan,
  SyncOutboxEvent,
} from './types'

export function loadSettings(): Promise<AgentBuddySettings> { return invoke('load_settings') }
export function saveSettings(settings: AgentBuddySettings): Promise<AgentBuddySettings> { return invoke('save_settings', { settings }) }
export function getPaasConnectionStatus(): Promise<PaasConnectionStatus> { return invoke('get_paas_connection_status') }
export function getPaasConnectionInfo(): Promise<PaasConnectionInfo> { return invoke('get_paas_connection_info') }
export function previewDeviceRegistration(): Promise<DeviceRegistrationRequest> { return invoke('preview_device_registration') }
export function previewBundlePullRequest(): Promise<BundlePullRequest> { return invoke('preview_bundle_pull_request') }
export function createPaasSession(request: PaasLoginRequest): Promise<PaasSession> { return invoke('create_paas_session', { request }) }
export function previewPaasSync(): Promise<PaasSyncPreview> { return invoke('preview_paas_sync') }
export function buildSyncFlushPlan(): Promise<SyncFlushPlan> { return invoke('build_sync_flush_plan') }
export function refreshAgentSource(): Promise<SourceRefreshResult> { return invoke('refresh_agent_source') }
export function importAgentSource(request: SourceImportRequest): Promise<SourceRefreshResult> { return invoke('import_agent_source', { request }) }
export function importAgentSourceFromDeepLink(url: string): Promise<SourceRefreshResult> { return invoke('import_agent_source_from_deeplink', { url }) }
export function previewSourceImportRisk(request: SourceImportRequest): Promise<SourceImportRiskPreview> { return invoke('preview_source_import_risk', { request }) }
export function refreshAgentSourceById(sourceId: string): Promise<SourceRefreshResult> { return invoke('refresh_agent_source_by_id', { sourceId }) }
export function listAgentSources(): Promise<AgentSourceSummary[]> { return invoke('list_agent_sources') }
export function getAgentSourceDetail(sourceId: string): Promise<AgentSourceDetail> { return invoke('get_agent_source_detail', { sourceId }) }
export function getAgentMarkdown(agentId: string): Promise<AgentMarkdownPreview> { return invoke('get_agent_markdown', { agentId }) }
export function previewAgentRuntimeConversion(agentId: string, runtime: RuntimeKind): Promise<AgentRuntimeConversionPreview> { return invoke('preview_agent_runtime_conversion', { agentId, runtime }) }
export function listBundleCatalog(): Promise<BundleCatalogItem[]> { return invoke('list_bundle_catalog') }
export function buildLocalSourceBundle(agentId: string): Promise<AgentBundle> { return invoke('build_local_source_bundle', { agentId }) }
export function buildSourceBundleDiff(oldAgentId: string, newAgentId: string): Promise<AgentBundleDiff> { return invoke('build_source_bundle_diff', { oldAgentId, newAgentId }) }
export function listAgents(): Promise<LocalAgentSummary[]> { return invoke('list_agents') }
export function listAgentsForSource(sourceId: string): Promise<LocalAgentSummary[]> { return invoke('list_agents_for_source', { sourceId }) }
export function buildAgentBundles(agentIds: string[]): Promise<AgentBundle[]> { return invoke('build_agent_bundles', { agentIds }) }
export function summarizeLocalBundles(agentIds: string[]): Promise<PaasBundleSummary[]> { return invoke('summarize_local_bundles', { agentIds }) }
export function buildBundleDiff(oldAgentId: string, newAgentId: string): Promise<AgentBundleDiff> { return invoke('build_bundle_diff', { oldAgentId, newAgentId }) }
export function runtimeDefinitions(): Promise<RuntimeDefinition[]> { return invoke('runtime_definitions') }
export function detectRuntimes(): Promise<RuntimeDetection[]> { return invoke('detect_runtimes') }
export function buildBuddyStatusReport(): Promise<BuddyStatusReport> { return invoke('build_buddy_status_report') }
export function listLocalApiSpec(): Promise<LocalApiSpec> { return invoke('list_local_api_spec') }
export function getInstallPlan(agentIds: string[], targets: InstallTarget[]): Promise<InstallPlan> { return invoke('get_install_plan', { agentIds, targets }) }
export function buildInstructionInjectionPlan(agentId: string, runtime: RuntimeKind, projectDir?: string | null): Promise<InstructionInjectionPlan> { return invoke('build_instruction_injection_plan', { agentId, runtime, projectDir: projectDir ?? null }) }
export function buildMcpConfigPlan(runtime: RuntimeKind, projectDir?: string | null): Promise<McpConfigPlan> { return invoke('build_mcp_config_plan', { runtime, projectDir: projectDir ?? null }) }
export function buildRuntimeMcpConfigPreview(runtime: RuntimeKind): Promise<RuntimeConfigPreview> { return invoke('build_runtime_mcp_config_preview', { runtime }) }
export function listMarketplaceSources(): Promise<MarketplaceSource[]> { return invoke('list_marketplace_sources') }
export function buildSkillInstallPlan(request: SkillInstallRequest): Promise<SkillInstallPlan> { return invoke('build_skill_install_plan', { request }) }
export function buildMarketplaceMcpInstallPlan(request: McpInstallRequest): Promise<McpInstallPlan> { return invoke('build_marketplace_mcp_install_plan', { request }) }
export function installAgents(agentIds: string[], targets: InstallTarget[]): Promise<InstallResult[]> { return invoke('install_agents', { agentIds, targets }) }
export function listInstallations(): Promise<AgentInstallation[]> { return invoke('list_installations') }
export function listInstallBackups(): Promise<InstallBackup[]> { return invoke('list_install_backups') }
export function listInstallEvents(): Promise<InstallEvent[]> { return invoke('list_install_events') }
export function listAuditEvents(): Promise<AuditEvent[]> { return invoke('list_audit_events') }
export function listSyncOutbox(): Promise<SyncOutboxEvent[]> { return invoke('list_sync_outbox') }
export function listGeneratedArtifacts(): Promise<GeneratedArtifact[]> { return invoke('list_generated_artifacts') }
export function readGeneratedArtifact(path: string): Promise<string> { return invoke('read_generated_artifact', { path }) }
export function scanTextRisk(content: string): Promise<RiskScanReport> { return invoke('scan_text_risk', { content }) }
export function scanGeneratedArtifact(path: string): Promise<RiskScanReport> { return invoke('scan_generated_artifact', { path }) }
export function listDefaultMcpServers(): Promise<McpServerConfig[]> { return invoke('list_default_mcp_servers') }
export function listSkillTargets(): Promise<SkillTargetPath[]> { return invoke('list_skill_targets') }
export function listBuiltInSkills(): Promise<SkillPackage[]> { return invoke('list_built_in_skills') }
export function createApprovalRequest(runtime: RuntimeKind | null, action: string, resourceType: string, resourceId: string, reason: string, riskLevel: string): Promise<ApprovalRequest> { return invoke('create_approval_request', { runtime, action, resourceType, resourceId, reason, riskLevel }) }
export function resolveApprovalRequest(request: ApprovalRequest, status: string): Promise<ApprovalRequest> { return invoke('resolve_approval_request', { request, status }) }
export function repairInstallationPlan(installationId: string): Promise<LifecyclePlan> { return invoke('repair_installation_plan', { installationId }) }
export function uninstallInstallationPlan(installationId: string): Promise<LifecyclePlan> { return invoke('uninstall_installation_plan', { installationId }) }
export function upgradeInstallationPlan(runtime: RuntimeKind, installationId?: string | null): Promise<LifecyclePlan> { return invoke('upgrade_installation_plan', { runtime, installationId: installationId ?? null }) }
export function restoreBackup(backupId: string): Promise<void> { return invoke('restore_backup', { backupId }) }
export function uninstallInstallation(installationId: string): Promise<void> { return invoke('uninstall_installation', { installationId }) }
export function runDoctor(): Promise<DoctorReport> { return invoke('run_doctor') }
export function parseDeepLink(url: string): Promise<DeepLinkRequest> { return invoke('parse_deeplink', { url }) }

export function initializeDefaultKnowledgeSpaces(): Promise<KnowledgeSpace[]> { return invoke('initialize_default_knowledge_spaces') }
export function listKnowledgeSpaces(): Promise<KnowledgeSpace[]> { return invoke('list_knowledge_spaces') }
export function listKnowledgeSnapshots(): Promise<KnowledgeSnapshot[]> { return invoke('list_knowledge_snapshots') }
export function createKnowledgeSnapshot(spaceId: string, version: string, manifestPath: string): Promise<KnowledgeSnapshot> { return invoke('create_knowledge_snapshot', { spaceId, version, manifestPath }) }
export function buildWikiMirrorPlan(spaceId: string): Promise<KnowledgeMirrorPlan> { return invoke('build_wiki_mirror_plan', { spaceId }) }
export function buildRagMirrorPlan(spaceId: string): Promise<KnowledgeMirrorPlan> { return invoke('build_rag_mirror_plan', { spaceId }) }
export function buildKnowledgeContextPack(query: string, spaceIds: string[]): Promise<KnowledgeContextPack> { return invoke('build_knowledge_context_pack', { query, spaceIds }) }

export function listMemoryItems(): Promise<MemoryItem[]> { return invoke('list_memory_items') }
export function listMemoryCandidates(): Promise<MemoryCandidate[]> { return invoke('list_memory_candidates') }
export function proposeMemory(content: string, scope: MemoryScope, memoryType: MemoryType, sourceSessionId?: string | null): Promise<MemoryCandidate> { return invoke('propose_memory', { content, scope, memoryType, sourceSessionId: sourceSessionId ?? null }) }
export function approveMemoryCandidate(candidateId: string, title: string): Promise<MemoryItem> { return invoke('approve_memory_candidate', { candidateId, title }) }
export function buildMemoryInitPlan(scopes: MemoryScope[]): Promise<MemoryInitPlan> { return invoke('build_memory_init_plan', { scopes }) }
export function buildMemoryWritebackPlan(): Promise<MemoryWritebackPlan> { return invoke('build_memory_writeback_plan') }

export function appendSessionEvent(sessionId: string, runtime: RuntimeKind | null, eventType: SessionEventType, payloadJson: string): Promise<SessionEvent> { return invoke('append_session_event', { sessionId, runtime, eventType, payloadJson }) }
export function listSessionEvents(): Promise<SessionEvent[]> { return invoke('list_session_events') }
export function listHandoffPacks(): Promise<HandoffPack[]> { return invoke('list_handoff_packs') }
export function createHandoffPack(sessionId: string, fromRuntime: RuntimeKind | null, toRuntime: RuntimeKind | null, goal: string, summary: string): Promise<HandoffPack> { return invoke('create_handoff_pack', { sessionId, fromRuntime, toRuntime, goal, summary }) }
export function buildSessionSyncPlan(): Promise<SessionSyncPlan> { return invoke('build_session_sync_plan') }
