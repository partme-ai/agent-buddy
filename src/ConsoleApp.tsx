import { useEffect, useMemo, useState } from 'react'
import {
  approveMemoryCandidate,
  buildAgentBundles,
  buildBuddyStatusReport,
  buildMemoryWritebackPlan,
  buildSessionSyncPlan,
  buildSyncFlushPlan,
  createHandoffPack,
  detectRuntimes,
  getAgentMarkdown,
  getAgentSourceDetail,
  getInstallPlan,
  getPaasConnectionInfo,
  getPaasConnectionStatus,
  importAgentSource,
  importAgentSourceFromDeepLink,
  initializeDefaultKnowledgeSpaces,
  installAgents,
  listAgentSources,
  listAgents,
  listAuditEvents,
  listBuiltInSkills,
  listBundleCatalog,
  listDefaultMcpServers,
  listGeneratedArtifacts,
  listHandoffPacks,
  listInstallBackups,
  listInstallEvents,
  listInstallations,
  listKnowledgeSnapshots,
  listKnowledgeSpaces,
  listLocalApiSpec,
  listMarketplaceSources,
  listMemoryCandidates,
  listMemoryItems,
  listSessionEvents,
  listSkillTargets,
  listSyncOutbox,
  loadSettings,
  parseDeepLink,
  previewAgentRuntimeConversion,
  previewBundlePullRequest,
  previewDeviceRegistration,
  previewPaasSync,
  previewSourceImportRisk,
  proposeMemory,
  readGeneratedArtifact,
  refreshAgentSource,
  refreshAgentSourceById,
  restoreBackup,
  runDoctor,
  runtimeDefinitions,
  saveSettings,
  uninstallInstallation,
} from './tauri'
import type {
  AgentBuddySettings,
  AgentBundle,
  AgentInstallation,
  AgentMarkdownPreview,
  AgentRuntimeConversionPreview,
  AgentSourceDetail,
  AgentSourceSummary,
  AuditEvent,
  BuddyStatusReport,
  BundleCatalogItem,
  BundlePullRequest,
  DeepLinkRequest,
  DeviceRegistrationRequest,
  DoctorReport,
  GeneratedArtifact,
  HandoffPack,
  InstallBackup,
  InstallEvent,
  InstallPlan,
  InstallTarget,
  KnowledgeSnapshot,
  KnowledgeSpace,
  LocalAgentSummary,
  LocalApiSpec,
  MarketplaceSource,
  McpServerConfig,
  MemoryCandidate,
  MemoryItem,
  MemoryScope,
  MemoryType,
  MemoryWritebackPlan,
  PaasConnectionInfo,
  PaasConnectionStatus,
  PaasSyncPreview,
  RuntimeDefinition,
  RuntimeDetection,
  RuntimeKind,
  SessionEvent,
  SessionSyncPlan,
  SkillPackage,
  SkillTargetPath,
  SourceImportRiskPreview,
  SyncFlushPlan,
  SyncOutboxEvent,
} from './types'

type PageKey =
  | 'overview.summary'
  | 'overview.health'
  | 'instances.list'
  | 'instances.groups'
  | 'instances.detail'
  | 'instances.install'
  | 'agents.market'
  | 'agents.teams'
  | 'agents.experts'
  | 'agents.abilities.skills'
  | 'agents.abilities.connectors'
  | 'agents.abilities.tools'
  | 'agents.knowledge'
  | 'agents.memory'
  | 'knowledge.center'
  | 'knowledge.support'
  | 'knowledge.api'
  | 'wiki.center'
  | 'wiki.support'
  | 'wiki.api'
  | 'memory.service'
  | 'sessions.overview'
  | 'sessions.active'
  | 'sessions.history'
  | 'settings.general'
  | 'settings.security'
  | 'settings.notifications'
  | 'settings.backup'
  | 'settings.enterprise'

type ConsoleInstanceType = 'runtime' | 'agent-installation' | 'mcp-service' | 'knowledge-mirror' | 'memory-service' | 'session-service' | 'local-api'
type ConsoleInstanceStatus = 'running' | 'stopped' | 'warning' | 'error'
type ViewMode = 'cards' | 'table'

interface ConsoleInstance {
  id: string
  name: string
  type: ConsoleInstanceType
  status: ConsoleInstanceStatus
  group: string
  tags: string[]
  runtime?: RuntimeKind
  path?: string
  description: string
  updatedAt?: number
}

const runtimeOptions: RuntimeKind[] = [
  'claude-code', 'copilot', 'antigravity', 'gemini-cli', 'opencode', 'openclaw', 'cursor', 'trae', 'aider',
  'windsurf', 'qwen', 'codex', 'deerflow', 'workbuddy', 'codewhale', 'hermes', 'kiro', 'qoder',
]

const pageTitle: Record<PageKey, string> = {
  'overview.summary': '总体总览',
  'overview.health': '健康看板',
  'instances.list': '实例列表',
  'instances.groups': '实例分组',
  'instances.detail': '实例详情',
  'instances.install': '安装向导',
  'agents.market': '智能体市场',
  'agents.teams': '智能体团体',
  'agents.experts': '专家管理',
  'agents.abilities.skills': '技能',
  'agents.abilities.connectors': '连接器 / MCP',
  'agents.abilities.tools': '工具',
  'agents.knowledge': '智能体知识',
  'agents.memory': '智能体记忆',
  'knowledge.center': '知识中心',
  'knowledge.support': '帮助支持',
  'knowledge.api': 'API 引用',
  'wiki.center': 'Wiki 知识中心',
  'wiki.support': 'Wiki 帮助支持',
  'wiki.api': 'Wiki API 引用',
  'memory.service': '记忆服务',
  'sessions.overview': '会话总览',
  'sessions.active': '活跃会话',
  'sessions.history': '历史会话',
  'settings.general': '常规设置',
  'settings.security': '安全设置',
  'settings.notifications': '通知策略',
  'settings.backup': '备份还原',
  'settings.enterprise': '企业管理',
}

const menuGroups: { title: string; items: { key: PageKey; label: string; badge?: string }[] }[] = [
  { title: '概览', items: [{ key: 'overview.summary', label: '总体总览' }, { key: 'overview.health', label: '健康看板' }] },
  { title: '实例', items: [{ key: 'instances.list', label: '实例列表' }, { key: 'instances.groups', label: '实例分组' }, { key: 'instances.detail', label: '实例详情' }, { key: 'instances.install', label: '安装向导' }] },
  { title: '智能体', items: [{ key: 'agents.market', label: '市场' }, { key: 'agents.teams', label: '团体' }, { key: 'agents.experts', label: '专家' }, { key: 'agents.abilities.skills', label: '能力 / 技能' }, { key: 'agents.abilities.connectors', label: '能力 / 连接器' }, { key: 'agents.abilities.tools', label: '能力 / 工具' }, { key: 'agents.knowledge', label: '知识' }, { key: 'agents.memory', label: '记忆' }] },
  { title: '知识', items: [{ key: 'knowledge.center', label: '知识中心' }, { key: 'knowledge.support', label: '帮助支持' }, { key: 'knowledge.api', label: 'API 引用' }] },
  { title: 'Wiki', items: [{ key: 'wiki.center', label: '知识中心' }, { key: 'wiki.support', label: '帮助支持' }, { key: 'wiki.api', label: 'API 引用' }] },
  { title: '记忆', items: [{ key: 'memory.service', label: '服务' }] },
  { title: '会话', items: [{ key: 'sessions.overview', label: '总览' }, { key: 'sessions.active', label: '活跃' }, { key: 'sessions.history', label: '历史' }] },
  { title: '设置', items: [{ key: 'settings.general', label: '常规设置' }, { key: 'settings.security', label: '安全设置' }, { key: 'settings.notifications', label: '通知策略' }, { key: 'settings.backup', label: '备份还原' }, { key: 'settings.enterprise', label: '企业管理' }] },
]

function defaultSettings(): AgentBuddySettings {
  return { deviceId: 'local-device', paasBaseUrl: '', syncEnabled: true, telemetryEnabled: false, generatedArtifactRetentionDays: 30, backupRetentionDays: 30, installMode: 'auto' }
}

export default function ConsoleApp() {
  const [activePage, setActivePage] = useState<PageKey>('overview.summary')
  const [settings, setSettings] = useState<AgentBuddySettings>(defaultSettings())
  const [paasInfo, setPaasInfo] = useState<PaasConnectionInfo | null>(null)
  const [paasStatus, setPaasStatus] = useState<PaasConnectionStatus | null>(null)
  const [deviceRequest, setDeviceRequest] = useState<DeviceRegistrationRequest | null>(null)
  const [bundlePullRequest, setBundlePullRequest] = useState<BundlePullRequest | null>(null)
  const [paasSyncPreview, setPaasSyncPreview] = useState<PaasSyncPreview | null>(null)
  const [syncFlushPlan, setSyncFlushPlan] = useState<SyncFlushPlan | null>(null)
  const [localApiSpec, setLocalApiSpec] = useState<LocalApiSpec | null>(null)
  const [buddyStatus, setBuddyStatus] = useState<BuddyStatusReport | null>(null)
  const [agentSources, setAgentSources] = useState<AgentSourceSummary[]>([])
  const [agents, setAgents] = useState<LocalAgentSummary[]>([])
  const [bundleCatalog, setBundleCatalog] = useState<BundleCatalogItem[]>([])
  const [definitions, setDefinitions] = useState<RuntimeDefinition[]>([])
  const [runtimes, setRuntimes] = useState<RuntimeDetection[]>([])
  const [installations, setInstallations] = useState<AgentInstallation[]>([])
  const [backups, setBackups] = useState<InstallBackup[]>([])
  const [installEvents, setInstallEvents] = useState<InstallEvent[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [syncOutbox, setSyncOutbox] = useState<SyncOutboxEvent[]>([])
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([])
  const [builtInSkills, setBuiltInSkills] = useState<SkillPackage[]>([])
  const [skillTargets, setSkillTargets] = useState<SkillTargetPath[]>([])
  const [marketplaceSources, setMarketplaceSources] = useState<MarketplaceSource[]>([])
  const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeSpace[]>([])
  const [knowledgeSnapshots, setKnowledgeSnapshots] = useState<KnowledgeSnapshot[]>([])
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([])
  const [memoryCandidates, setMemoryCandidates] = useState<MemoryCandidate[]>([])
  const [memoryWriteback, setMemoryWriteback] = useState<MemoryWritebackPlan | null>(null)
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([])
  const [handoffPacks, setHandoffPacks] = useState<HandoffPack[]>([])
  const [sessionSyncPlan, setSessionSyncPlan] = useState<SessionSyncPlan | null>(null)
  const [generatedArtifacts, setGeneratedArtifacts] = useState<GeneratedArtifact[]>([])
  const [artifactPreview, setArtifactPreview] = useState('')
  const [doctor, setDoctor] = useState<DoctorReport | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState('all')
  const [sourceDetail, setSourceDetail] = useState<AgentSourceDetail | null>(null)
  const [sourceRisk, setSourceRisk] = useState<SourceImportRiskPreview | null>(null)
  const [sourceUrl, setSourceUrl] = useState('https://github.com/jnMetaCode/agency-agents-zh')
  const [sourceName, setSourceName] = useState('agency-agents-zh')
  const [sourceBranch, setSourceBranch] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [selectedRuntimes, setSelectedRuntimes] = useState<Set<RuntimeKind>>(new Set())
  const [projectDir, setProjectDir] = useState('')
  const [customDir, setCustomDir] = useState('')
  const [hermesCategories, setHermesCategories] = useState('')
  const [installPlan, setInstallPlan] = useState<InstallPlan | null>(null)
  const [bundlePreview, setBundlePreview] = useState<AgentBundle[]>([])
  const [markdownPreview, setMarkdownPreview] = useState<AgentMarkdownPreview | null>(null)
  const [conversionPreview, setConversionPreview] = useState<AgentRuntimeConversionPreview | null>(null)
  const [previewRuntime, setPreviewRuntime] = useState<RuntimeKind>('claude-code')
  const [query, setQuery] = useState('')
  const [instanceQuery, setInstanceQuery] = useState('')
  const [instanceTypeFilter, setInstanceTypeFilter] = useState('all')
  const [instanceStatusFilter, setInstanceStatusFilter] = useState('all')
  const [instanceViewMode, setInstanceViewMode] = useState<ViewMode>('cards')
  const [memoryDraft, setMemoryDraft] = useState('')
  const [sessionId, setSessionId] = useState('local-session')
  const [handoffGoal, setHandoffGoal] = useState('Continue current task in another runtime')
  const [handoffSummary, setHandoffSummary] = useState('Summarize progress and next action.')
  const [deeplinkUrl, setDeeplinkUrl] = useState('agentbuddy://install-source?url=https%3A%2F%2Fgithub.com%2FjnMetaCode%2Fagency-agents-zh')
  const [deeplinkResult, setDeeplinkResult] = useState<DeepLinkRequest | null>(null)
  const [status, setStatus] = useState('Ready')
  const [busy, setBusy] = useState(false)

  const definitionByRuntime = useMemo(() => new Map(definitions.map((item) => [item.kind, item])), [definitions])
  const scopedAgents = useMemo(() => selectedSourceId === 'all' ? agents : agents.filter((agent) => agent.sourceId === selectedSourceId), [agents, selectedSourceId])
  const filteredAgents = useMemo(() => {
    const normalized = query.toLowerCase()
    return scopedAgents.filter((agent) => !normalized || `${agent.name} ${agent.description} ${agent.category} ${agent.slug} ${agent.sourceName}`.toLowerCase().includes(normalized))
  }, [scopedAgents, query])
  const instances = useMemo(() => buildInstances(runtimes, installations, mcpServers, knowledgeSpaces, memoryItems, memoryCandidates, sessionEvents, localApiSpec), [runtimes, installations, mcpServers, knowledgeSpaces, memoryItems, memoryCandidates, sessionEvents, localApiSpec])
  const filteredInstances = useMemo(() => {
    const normalized = instanceQuery.toLowerCase()
    return instances.filter((instance) => {
      const matchesQuery = !normalized || `${instance.name} ${instance.description} ${instance.group} ${instance.tags.join(' ')}`.toLowerCase().includes(normalized)
      const matchesType = instanceTypeFilter === 'all' || instance.type === instanceTypeFilter
      const matchesStatus = instanceStatusFilter === 'all' || instance.status === instanceStatusFilter
      return matchesQuery && matchesType && matchesStatus
    })
  }, [instances, instanceQuery, instanceTypeFilter, instanceStatusFilter])
  const metrics = useMemo(() => buildMetrics(instances, agents, installations, sessionEvents, syncOutbox, auditEvents, doctor), [instances, agents, installations, sessionEvents, syncOutbox, auditEvents, doctor])
  const latestEvents = useMemo(() => [...installEvents.map(toTimelineEvent), ...auditEvents.map(toAuditTimelineEvent)].sort((a, b) => b.ts - a.ts).slice(0, 18), [installEvents, auditEvents])

  async function reloadAll() {
    const [
      nextSettings, nextPaasInfo, nextPaasStatus, nextDeviceRequest, nextBundlePullRequest, nextPaasSync,
      nextSyncFlush, nextLocalApi, nextBuddyStatus, nextSources, nextAgents, nextCatalog, nextDefinitions,
      nextRuntimes, nextInstallations, nextBackups, nextInstallEvents, nextAudit, nextSyncOutbox, nextMcp,
      nextSkills, nextSkillTargets, nextMarketplace, nextKnowledgeSpaces, nextKnowledgeSnapshots, nextMemory,
      nextMemoryCandidates, nextMemoryWriteback, nextSessionEvents, nextHandoffs, nextSessionSync, nextArtifacts,
    ] = await Promise.all([
      loadSettings().catch(defaultSettings), getPaasConnectionInfo().catch(() => null), getPaasConnectionStatus().catch(() => null), previewDeviceRegistration().catch(() => null), previewBundlePullRequest().catch(() => null), previewPaasSync().catch(() => null),
      buildSyncFlushPlan().catch(() => null), listLocalApiSpec().catch(() => null), buildBuddyStatusReport().catch(() => null), listAgentSources(), listAgents(), listBundleCatalog(), runtimeDefinitions(),
      detectRuntimes(), listInstallations(), listInstallBackups(), listInstallEvents(), listAuditEvents(), listSyncOutbox(), listDefaultMcpServers(), listBuiltInSkills(), listSkillTargets(), listMarketplaceSources().catch(() => []), listKnowledgeSpaces(), listKnowledgeSnapshots(), listMemoryItems(), listMemoryCandidates(), buildMemoryWritebackPlan().catch(() => null), listSessionEvents(), listHandoffPacks(), buildSessionSyncPlan().catch(() => null), listGeneratedArtifacts(),
    ])
    setSettings(nextSettings); setPaasInfo(nextPaasInfo); setPaasStatus(nextPaasStatus); setDeviceRequest(nextDeviceRequest); setBundlePullRequest(nextBundlePullRequest); setPaasSyncPreview(nextPaasSync); setSyncFlushPlan(nextSyncFlush); setLocalApiSpec(nextLocalApi); setBuddyStatus(nextBuddyStatus)
    setAgentSources(nextSources); setAgents(nextAgents); setBundleCatalog(nextCatalog); setDefinitions(nextDefinitions); setRuntimes(nextRuntimes); setInstallations(nextInstallations); setBackups(nextBackups); setInstallEvents(nextInstallEvents); setAuditEvents(nextAudit); setSyncOutbox(nextSyncOutbox); setMcpServers(nextMcp); setBuiltInSkills(nextSkills); setSkillTargets(nextSkillTargets); setMarketplaceSources(nextMarketplace); setKnowledgeSpaces(nextKnowledgeSpaces); setKnowledgeSnapshots(nextKnowledgeSnapshots); setMemoryItems(nextMemory); setMemoryCandidates(nextMemoryCandidates); setMemoryWriteback(nextMemoryWriteback); setSessionEvents(nextSessionEvents); setHandoffPacks(nextHandoffs); setSessionSyncPlan(nextSessionSync); setGeneratedArtifacts(nextArtifacts)
  }

  useEffect(() => { reloadAll().catch((error) => setStatus(String(error))) }, [])

  async function withBusy(label: string, work: () => Promise<void>) { setBusy(true); setStatus(label); try { await work() } catch (error) { setStatus(String(error)) } finally { setBusy(false) } }
  function selectedTargets(): InstallTarget[] { return Array.from(selectedRuntimes).map((runtime) => ({ runtime, projectDir: definitionByRuntime.get(runtime)?.scope === 'project' ? projectDir || null : null, customDir: definitionByRuntime.get(runtime)?.scope === 'custom' ? customDir || null : null, categoryFilters: runtime === 'hermes' ? hermesCategories.split(',').map((item) => item.trim()).filter(Boolean) : [] })) }
  function toggleAgent(id: string) { setSelectedAgents((current) => toggleSet(current, id)); setInstallPlan(null) }
  function toggleRuntime(runtime: RuntimeKind) { setSelectedRuntimes((current) => toggleSet(current, runtime)); setInstallPlan(null) }
  async function openSourceDetail(sourceId = selectedSourceId) { if (sourceId === 'all') return; const detail = await getAgentSourceDetail(sourceId); setSourceDetail(detail) }

  async function handleImportSource() { await withBusy('Importing source', async () => { const result = await importAgentSource({ sourceUrl, name: sourceName || null, branch: sourceBranch || null, sourceKind: null }); setSelectedSourceId(result.sourceId); setSelectedAgents(new Set()); await reloadAll(); await openSourceDetail(result.sourceId); setStatus(`Imported ${result.agentCount} agents from ${result.sourceName}`) }) }
  async function handleRefreshSource() { await withBusy('Refreshing source', async () => { const result = selectedSourceId === 'all' ? await refreshAgentSource() : await refreshAgentSourceById(selectedSourceId); await reloadAll(); await openSourceDetail(result.sourceId); setStatus(result.message) }) }
  async function handleSourceRisk() { await withBusy('Scanning source risk', async () => { setSourceRisk(await previewSourceImportRisk({ sourceUrl, name: sourceName || null, branch: sourceBranch || null, sourceKind: null })); setStatus('Source import risk preview ready') }) }
  async function handleMarkdown(agentId: string) { await withBusy('Loading raw markdown', async () => { setMarkdownPreview(await getAgentMarkdown(agentId)); setActivePage('agents.experts') }) }
  async function handleRuntimePreview(agentId: string) { await withBusy('Generating runtime preview', async () => { setConversionPreview(await previewAgentRuntimeConversion(agentId, previewRuntime)); setActivePage('agents.experts') }) }
  async function handleBuildBundles() { await withBusy('Building bundle preview', async () => { setBundlePreview(await buildAgentBundles(Array.from(selectedAgents))); setStatus('Agent Bundle preview ready') }) }
  async function handleInstallPlan() { await withBusy('Generating install plan', async () => { setInstallPlan(await getInstallPlan(Array.from(selectedAgents), selectedTargets())); setStatus('Install Plan ready') }) }
  async function handleInstall() { await withBusy('Installing agents', async () => { await installAgents(Array.from(selectedAgents), selectedTargets()); await reloadAll(); setStatus('Install complete') }) }
  async function handleDoctor() { await withBusy('Running Agent Doctor', async () => { setDoctor(await runDoctor()); setActivePage('overview.health') }) }
  async function handleInitKnowledge() { await withBusy('Initializing knowledge spaces', async () => { await initializeDefaultKnowledgeSpaces(); await reloadAll(); setStatus('Knowledge spaces initialized') }) }
  async function handleProposeMemory() { await withBusy('Proposing memory', async () => { if (!memoryDraft.trim()) return; await proposeMemory(memoryDraft, 'user' as MemoryScope, 'preference' as MemoryType, sessionId); setMemoryDraft(''); await reloadAll(); setStatus('Memory candidate proposed') }) }
  async function handleApproveMemory(candidateId: string) { await withBusy('Approving memory', async () => { await approveMemoryCandidate(candidateId, 'Approved memory'); await reloadAll(); setStatus('Memory approved') }) }
  async function handleHandoff() { await withBusy('Creating handoff', async () => { await createHandoffPack(sessionId, null, Array.from(selectedRuntimes)[0] ?? null, handoffGoal, handoffSummary); await reloadAll(); setStatus('Handoff created') }) }
  async function handleDeepLink() { await withBusy('Parsing Deep Link', async () => { const parsed = await parseDeepLink(deeplinkUrl); setDeeplinkResult(parsed); if (parsed.action === 'install-source' && (parsed.params.url || parsed.params.repo || parsed.params.source)) { const result = await importAgentSourceFromDeepLink(deeplinkUrl); setSelectedSourceId(result.sourceId); await reloadAll(); await openSourceDetail(result.sourceId); setStatus(`Deep Link imported ${result.agentCount} agents from ${result.sourceName}`) } else { setStatus(`Parsed Deep Link: ${parsed.action}`) } }) }
  async function handleArtifact(path: string) { await withBusy('Reading artifact', async () => { setArtifactPreview(await readGeneratedArtifact(path)); setStatus('Artifact preview loaded') }) }
  async function handleSaveSettings() { await withBusy('Saving settings', async () => { const saved = await saveSettings(settings); setSettings(saved); await reloadAll(); setStatus('Settings saved') }) }

  return <div className="console-shell">
    <ConsoleSidebar activePage={activePage} setActivePage={setActivePage} metrics={metrics} />
    <main className="console-main">
      <ConsoleTopbar title={pageTitle[activePage]} busy={busy} query={query} setQuery={setQuery} onRefresh={() => withBusy('Refreshing console', reloadAll)} onDoctor={handleDoctor} />
      <section className="console-status"><span>{status}</span><strong>{busy ? 'Working' : 'Ready'}</strong></section>
      {activePage === 'overview.summary' && <OverviewPage metrics={metrics} runtimes={runtimes} syncFlushPlan={syncFlushPlan} latestEvents={latestEvents} setActivePage={setActivePage} />}
      {activePage === 'overview.health' && <HealthBoard doctor={doctor} runtimes={runtimes} auditEvents={auditEvents} syncOutbox={syncOutbox} installEvents={installEvents} onDoctor={handleDoctor} />}
      {activePage === 'instances.list' && <InstanceListPage instances={filteredInstances} allInstances={instances} viewMode={instanceViewMode} setViewMode={setInstanceViewMode} query={instanceQuery} setQuery={setInstanceQuery} typeFilter={instanceTypeFilter} setTypeFilter={setInstanceTypeFilter} statusFilter={instanceStatusFilter} setStatusFilter={setInstanceStatusFilter} setActivePage={setActivePage} />}
      {activePage === 'instances.groups' && <InstanceGroupsPage instances={instances} />}
      {activePage === 'instances.detail' && <InstanceDetailPage instance={filteredInstances[0] ?? instances[0]} installEvents={installEvents} auditEvents={auditEvents} sessionEvents={sessionEvents} />}
      {activePage === 'instances.install' && <InstallWizardPage agentSources={agentSources} selectedSourceId={selectedSourceId} setSelectedSourceId={setSelectedSourceId} sourceUrl={sourceUrl} setSourceUrl={setSourceUrl} sourceName={sourceName} setSourceName={setSourceName} sourceBranch={sourceBranch} setSourceBranch={setSourceBranch} sourceRisk={sourceRisk} onRisk={handleSourceRisk} onImport={handleImportSource} onRefresh={handleRefreshSource} agents={filteredAgents} selectedAgents={selectedAgents} toggleAgent={toggleAgent} runtimes={runtimes} selectedRuntimes={selectedRuntimes} toggleRuntime={toggleRuntime} projectDir={projectDir} setProjectDir={setProjectDir} customDir={customDir} setCustomDir={setCustomDir} hermesCategories={hermesCategories} setHermesCategories={setHermesCategories} installPlan={installPlan} onBuildBundles={handleBuildBundles} onPlan={handleInstallPlan} onInstall={handleInstall} />}
      {activePage === 'agents.market' && <AgentMarketPage bundles={bundleCatalog} installations={installations} setActivePage={setActivePage} selectAgent={(id) => setSelectedAgents(new Set([id]))} />}
      {activePage === 'agents.teams' && <AgentTeamsPage agents={agents} bundles={bundleCatalog} />}
      {activePage === 'agents.experts' && <AgentExpertsPage agents={filteredAgents} selectedAgents={selectedAgents} toggleAgent={toggleAgent} previewRuntime={previewRuntime} setPreviewRuntime={setPreviewRuntime} onMarkdown={handleMarkdown} onRuntimePreview={handleRuntimePreview} markdownPreview={markdownPreview} conversionPreview={conversionPreview} bundlePreview={bundlePreview} onBuildBundles={handleBuildBundles} />}
      {activePage === 'agents.abilities.skills' && <SkillsPage skills={builtInSkills} skillTargets={skillTargets} marketplaceSources={marketplaceSources} />}
      {activePage === 'agents.abilities.connectors' && <ConnectorsPage mcpServers={mcpServers} localApiSpec={localApiSpec} />}
      {activePage === 'agents.abilities.tools' && <ToolsPage generatedArtifacts={generatedArtifacts} artifactPreview={artifactPreview} onRead={handleArtifact} />}
      {activePage === 'agents.knowledge' && <AgentKnowledgePage knowledgeSpaces={knowledgeSpaces} knowledgeSnapshots={knowledgeSnapshots} onInitKnowledge={handleInitKnowledge} />}
      {activePage === 'agents.memory' && <AgentMemoryPage memoryItems={memoryItems} memoryCandidates={memoryCandidates} onApprove={handleApproveMemory} />}
      {activePage === 'knowledge.center' && <KnowledgeCenterPage title="知识中心" knowledgeSpaces={knowledgeSpaces} knowledgeSnapshots={knowledgeSnapshots} />}
      {activePage === 'knowledge.support' && <SupportPage title="帮助支持" />}
      {activePage === 'knowledge.api' && <ApiReferencePage localApiSpec={localApiSpec} />}
      {activePage === 'wiki.center' && <KnowledgeCenterPage title="Wiki 知识中心" knowledgeSpaces={knowledgeSpaces} knowledgeSnapshots={knowledgeSnapshots} />}
      {activePage === 'wiki.support' && <SupportPage title="Wiki 帮助支持" />}
      {activePage === 'wiki.api' && <ApiReferencePage localApiSpec={localApiSpec} />}
      {activePage === 'memory.service' && <MemoryServicePage memoryItems={memoryItems} memoryCandidates={memoryCandidates} memoryDraft={memoryDraft} setMemoryDraft={setMemoryDraft} memoryWriteback={memoryWriteback} onPropose={handleProposeMemory} onApprove={handleApproveMemory} />}
      {activePage === 'sessions.overview' && <SessionOverviewPage sessionEvents={sessionEvents} handoffPacks={handoffPacks} sessionSyncPlan={sessionSyncPlan} />}
      {activePage === 'sessions.active' && <ActiveSessionsPage sessionEvents={sessionEvents} sessionId={sessionId} setSessionId={setSessionId} handoffGoal={handoffGoal} setHandoffGoal={setHandoffGoal} handoffSummary={handoffSummary} setHandoffSummary={setHandoffSummary} onHandoff={handleHandoff} />}
      {activePage === 'sessions.history' && <SessionHistoryPage sessionEvents={sessionEvents} handoffPacks={handoffPacks} />}
      {activePage === 'settings.general' && <GeneralSettingsPage settings={settings} setSettings={setSettings} onSave={handleSaveSettings} />}
      {activePage === 'settings.security' && <SecuritySettingsPage auditEvents={auditEvents} />}
      {activePage === 'settings.notifications' && <NotificationSettingsPage />}
      {activePage === 'settings.backup' && <BackupRestorePage backups={backups} restoreBackup={(id) => withBusy('Restoring backup', async () => { await restoreBackup(id); await reloadAll() })} />}
      {activePage === 'settings.enterprise' && <EnterpriseSettingsPage paasInfo={paasInfo} paasStatus={paasStatus} deviceRequest={deviceRequest} bundlePullRequest={bundlePullRequest} paasSyncPreview={paasSyncPreview} syncFlushPlan={syncFlushPlan} deeplinkUrl={deeplinkUrl} setDeeplinkUrl={setDeeplinkUrl} deeplinkResult={deeplinkResult} onDeepLink={handleDeepLink} buddyStatus={buddyStatus} />}
    </main>
  </div>
}

function ConsoleSidebar({ activePage, setActivePage, metrics }: { activePage: PageKey; setActivePage: (page: PageKey) => void; metrics: ReturnType<typeof buildMetrics> }) {
  return <aside className="console-sidebar">
    <div className="window-dots"><span /><span /><span /></div>
    <div className="console-brand"><div className="console-logo">AB</div><div><strong>Agent Buddy</strong><span>Local Agent Console</span></div></div>
    <div className="console-sidebar-metrics"><span>Instances {metrics.instances}</span><span>Agents {metrics.agents}</span><span>Sync {metrics.pendingSync}</span></div>
    <nav className="console-menu">{menuGroups.map((group) => <div className="console-menu-group" key={group.title}><strong>{group.title}</strong>{group.items.map((item) => <button key={item.key} className={activePage === item.key ? 'active' : ''} onClick={() => setActivePage(item.key)}><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}</button>)}</div>)}</nav>
  </aside>
}

function ConsoleTopbar({ title, busy, query, setQuery, onRefresh, onDoctor }: { title: string; busy: boolean; query: string; setQuery: (value: string) => void; onRefresh: () => void; onDoctor: () => void }) {
  return <header className="console-topbar"><div><span className="breadcrumb">Agent Buddy / {title}</span><h1>{title}</h1></div><div className="console-topbar-actions"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索智能体、实例、能力、事件" /><button disabled={busy} onClick={onDoctor}>Agent Doctor</button><button disabled={busy} onClick={onRefresh}>刷新</button></div></header>
}

function OverviewPage({ metrics, runtimes, syncFlushPlan, latestEvents, setActivePage }: { metrics: ReturnType<typeof buildMetrics>; runtimes: RuntimeDetection[]; syncFlushPlan: SyncFlushPlan | null; latestEvents: TimelineEvent[]; setActivePage: (page: PageKey) => void }) {
  return <section className="console-page"><MetricGrid metrics={metrics} /><div className="console-grid two"><Panel title="全局健康状态" meta={`${metrics.healthyInstances}/${metrics.instances} healthy`}><div className="health-donut"><div><strong>{metrics.healthScore}%</strong><span>Health Score</span></div></div><div className="health-legend"><span><i className="dot running" />运行中 {metrics.healthyInstances}</span><span><i className="dot warning" />告警 {metrics.warningInstances}</span><span><i className="dot error" />异常 {metrics.errorInstances}</span></div></Panel><Panel title="同步计划" meta={syncFlushPlan ? `${syncFlushPlan.pendingCount} pending` : 'not loaded'}>{syncFlushPlan ? <div className="compact-list"><KeyValue label="Destination" value={syncFlushPlan.destination || 'local only'} /><KeyValue label="Batch Size" value={String(syncFlushPlan.debouncePolicy.maxBatchSize)} /><KeyValue label="Debounce" value={`${syncFlushPlan.debouncePolicy.debounceMs}ms`} />{Object.entries(syncFlushPlan.groupedCounts).map(([key, value]) => <KeyValue key={key} label={key} value={String(value)} />)}</div> : <EmptyState text="No sync plan available." />}</Panel></div><div className="console-grid two"><Panel title="Runtime 检测状态" meta={`${runtimes.filter((runtime) => runtime.detected).length}/${runtimes.length}`}><div className="runtime-strip">{runtimes.map((runtime) => <button key={runtime.kind} onClick={() => setActivePage('instances.list')} className={runtime.detected ? 'runtime-pill detected' : 'runtime-pill'}>{runtime.label}</button>)}</div></Panel><Panel title="最近事件" meta={`${latestEvents.length} events`}><Timeline events={latestEvents} /></Panel></div></section>
}

function HealthBoard({ doctor, runtimes, auditEvents, syncOutbox, installEvents, onDoctor }: { doctor: DoctorReport | null; runtimes: RuntimeDetection[]; auditEvents: AuditEvent[]; syncOutbox: SyncOutboxEvent[]; installEvents: InstallEvent[]; onDoctor: () => void }) {
  return <section className="console-page"><div className="page-actions"><button onClick={onDoctor}>重新诊断</button></div><div className="console-grid two"><Panel title="实例健康状态" meta={doctor ? `${doctor.summary.ok} ok · ${doctor.summary.warning} warning · ${doctor.summary.error} error` : 'Run doctor'}>{doctor ? <div className="doctor-list">{doctor.checks.map((check) => <div key={check.id} className={`doctor-card ${check.status}`}><strong>{check.label}</strong><span>{check.status}</span><small>{check.message}</small>{check.remediation && <em>{check.remediation}</em>}</div>)}</div> : <EmptyState text="运行 Agent Doctor 以生成健康看板。" />}</Panel><Panel title="风险告警列表" meta={`${auditEvents.filter((event) => event.severity === 'security' || event.severity === 'error').length} risks`}><div className="compact-list">{auditEvents.slice(0, 12).map((event) => <div className="compact-card" key={event.id}><strong>{event.action}</strong><span>{event.severity} · {event.runtime ?? 'system'}</span><small>{event.message}</small></div>)}</div></Panel></div><div className="console-grid two"><Panel title="最近任务" meta={`${installEvents.length} install events`}><Timeline events={installEvents.slice(0, 12).map(toTimelineEvent)} /></Panel><Panel title="同步异常" meta={`${syncOutbox.filter((event) => event.status === 'failed').length} failed`}><div className="compact-list">{syncOutbox.slice(0, 12).map((event) => <div className="compact-card" key={event.id}><strong>{event.eventType}</strong><span>{event.status} · retry {event.retryCount}</span><small>{event.aggregateType}:{event.aggregateId}</small></div>)}</div></Panel></div><Panel title="Runtime 状态明细" meta={`${runtimes.length} runtimes`}><div className="table-wrap"><table><thead><tr><th>Runtime</th><th>Status</th><th>Scope</th><th>Path</th></tr></thead><tbody>{runtimes.map((runtime) => <tr key={runtime.kind}><td>{runtime.label}</td><td><StatusBadge status={runtime.detected ? 'running' : 'stopped'} /></td><td>{runtime.scope}</td><td>{runtime.defaultTarget ?? runtime.configDir ?? runtime.commandPath ?? '-'}</td></tr>)}</tbody></table></div></Panel></section>
}

function InstanceListPage(props: { instances: ConsoleInstance[]; allInstances: ConsoleInstance[]; viewMode: ViewMode; setViewMode: (mode: ViewMode) => void; query: string; setQuery: (value: string) => void; typeFilter: string; setTypeFilter: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; setActivePage: (page: PageKey) => void }) {
  return <section className="console-page"><div className="page-toolbar"><input value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="搜索实例" /><select value={props.typeFilter} onChange={(event) => props.setTypeFilter(event.target.value)}><option value="all">全部类型</option>{unique(props.allInstances.map((instance) => instance.type)).map((type) => <option value={type} key={type}>{type}</option>)}</select><select value={props.statusFilter} onChange={(event) => props.setStatusFilter(event.target.value)}><option value="all">全部状态</option><option value="running">运行中</option><option value="stopped">已停止</option><option value="warning">告警</option><option value="error">异常</option></select><button onClick={() => props.setViewMode(props.viewMode === 'cards' ? 'table' : 'cards')}>{props.viewMode === 'cards' ? '列表视图' : '卡片视图'}</button><button onClick={() => props.setActivePage('instances.install')}>+ 添加实例</button><button>批量操作 ▾</button></div>{props.viewMode === 'cards' ? <div className="instance-grid">{props.instances.map((instance) => <InstanceCard key={instance.id} instance={instance} onDetail={() => props.setActivePage('instances.detail')} />)}</div> : <InstanceTable instances={props.instances} onDetail={() => props.setActivePage('instances.detail')} />}</section>
}

function InstanceGroupsPage({ instances }: { instances: ConsoleInstance[] }) {
  const groups = unique(instances.map((instance) => instance.group))
  return <section className="console-page"><div className="page-actions"><button>新增分组</button><button>编辑</button><button>拖拽排序</button><button>设置标签</button></div><div className="console-grid three">{groups.map((group) => <Panel key={group} title={group} meta={`${instances.filter((instance) => instance.group === group).length} instances`}><div className="compact-list">{instances.filter((instance) => instance.group === group).slice(0, 8).map((instance) => <div key={instance.id} className="compact-card"><strong>{instance.name}</strong><span>{instance.type} · {instance.status}</span><small>{instance.tags.join(', ') || 'no tags'}</small></div>)}</div></Panel>)}</div></section>
}

function InstanceDetailPage({ instance, installEvents, auditEvents, sessionEvents }: { instance?: ConsoleInstance; installEvents: InstallEvent[]; auditEvents: AuditEvent[]; sessionEvents: SessionEvent[] }) {
  if (!instance) return <EmptyState text="还没有实例。" />
  return <section className="console-page"><div className="detail-hero"><div><StatusBadge status={instance.status} /><h2>{instance.name}</h2><p>{instance.description}</p><span>{instance.type} · {instance.group}</span></div><div className="page-actions"><button>修复</button><button>重启</button><button>查看目录</button><button>卸载</button></div></div><div className="tab-strip">{['实例概览','对话测试','渠道管理','会话管理','Agent 管理','技能管理','节点管理','用量统计','定时任务','配置管理','调试工具','上下文诊断','实例日志','版本历史'].map((tab, index) => <button className={index === 0 ? 'active' : ''} key={tab}>{tab}</button>)}</div><div className="console-grid two"><Panel title="实例概览" meta={instance.status}><KeyValue label="ID" value={instance.id} /><KeyValue label="Path" value={instance.path ?? '-'} /><KeyValue label="Tags" value={instance.tags.join(', ') || '-'} /></Panel><Panel title="上下文诊断" meta="local"><KeyValue label="Session events" value={String(sessionEvents.length)} /><KeyValue label="Audit events" value={String(auditEvents.length)} /><KeyValue label="Install events" value={String(installEvents.length)} /></Panel></div><Panel title="实例日志" meta="recent"><Timeline events={[...installEvents.map(toTimelineEvent), ...auditEvents.map(toAuditTimelineEvent)].slice(0, 24)} /></Panel></section>
}

function InstallWizardPage(props: { agentSources: AgentSourceSummary[]; selectedSourceId: string; setSelectedSourceId: (value: string) => void; sourceUrl: string; setSourceUrl: (value: string) => void; sourceName: string; setSourceName: (value: string) => void; sourceBranch: string; setSourceBranch: (value: string) => void; sourceRisk: SourceImportRiskPreview | null; onRisk: () => void; onImport: () => void; onRefresh: () => void; agents: LocalAgentSummary[]; selectedAgents: Set<string>; toggleAgent: (id: string) => void; runtimes: RuntimeDetection[]; selectedRuntimes: Set<RuntimeKind>; toggleRuntime: (runtime: RuntimeKind) => void; projectDir: string; setProjectDir: (value: string) => void; customDir: string; setCustomDir: (value: string) => void; hermesCategories: string; setHermesCategories: (value: string) => void; installPlan: InstallPlan | null; onBuildBundles: () => void; onPlan: () => void; onInstall: () => void }) {
  return <section className="console-page"><div className="wizard-steps">{['选择来源','选择智能体','环境检查','配置引导','生成计划','确认部署'].map((step, index) => <span key={step} className={index < 4 ? 'active' : ''}>{index + 1}. {step}</span>)}</div><div className="console-grid two"><Panel title="Step 1：选择来源" meta={`${props.agentSources.length} sources`}><div className="form-stack"><input value={props.sourceUrl} onChange={(event) => props.setSourceUrl(event.target.value)} placeholder="GitHub URL / local path / PaaS source" /><input value={props.sourceName} onChange={(event) => props.setSourceName(event.target.value)} placeholder="source name" /><input value={props.sourceBranch} onChange={(event) => props.setSourceBranch(event.target.value)} placeholder="branch optional" /><div className="page-actions"><button onClick={props.onRisk}>风险扫描</button><button onClick={props.onImport}>导入来源</button><button onClick={props.onRefresh}>刷新来源</button></div>{props.sourceRisk && <small>{props.sourceRisk.sourceKind} · {props.sourceRisk.riskReport.totalFindings} finding(s)</small>}<select value={props.selectedSourceId} onChange={(event) => props.setSelectedSourceId(event.target.value)}><option value="all">All sources</option>{props.agentSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</select></div></Panel><Panel title="Step 3：环境检查" meta={`${props.runtimes.filter((runtime) => runtime.detected).length}/${props.runtimes.length} detected`}><div className="runtime-strip">{props.runtimes.map((runtime) => <button key={runtime.kind} className={runtime.detected ? 'runtime-pill detected' : 'runtime-pill'} onClick={() => props.toggleRuntime(runtime.kind)}>{props.selectedRuntimes.has(runtime.kind) ? '✓ ' : ''}{runtime.label}</button>)}</div></Panel></div><Panel title="Step 2：选择智能体" meta={`${props.selectedAgents.size}/${props.agents.length} selected`}><div className="agent-mini-grid">{props.agents.slice(0, 32).map((agent) => <button key={agent.id} className={props.selectedAgents.has(agent.id) ? 'agent-mini selected' : 'agent-mini'} onClick={() => props.toggleAgent(agent.id)}><strong>{agent.name}</strong><span>{agent.sourceName} · {agent.category}</span></button>)}</div></Panel><div className="console-grid two"><Panel title="Step 4：配置引导" meta="paths / policy"><div className="form-stack"><input value={props.projectDir} onChange={(event) => props.setProjectDir(event.target.value)} placeholder="Project directory for project-scope runtimes" /><input value={props.customDir} onChange={(event) => props.setCustomDir(event.target.value)} placeholder="Custom directory / DEERFLOW_SKILLS_DIR" /><input value={props.hermesCategories} onChange={(event) => props.setHermesCategories(event.target.value)} placeholder="Hermes category filters" /></div></Panel><Panel title="Step 5 / 6：计划与部署" meta={props.installPlan ? `${props.installPlan.totalFiles} files` : 'no plan'}><div className="page-actions"><button onClick={props.onBuildBundles}>预览 Bundle</button><button onClick={props.onPlan}>生成 Install Plan</button><button onClick={props.onInstall}>确认安装</button></div>{props.installPlan && <div className="compact-list">{props.installPlan.targets.map((target) => <div className="compact-card" key={target.runtime}><strong>{target.runtime}</strong><span>{target.scope} · {target.filesToWrite} files</span><small>{target.targetDirs.join(', ')}</small></div>)}</div>}</Panel></div></section>
}

function AgentMarketPage({ bundles, installations, setActivePage, selectAgent }: { bundles: BundleCatalogItem[]; installations: AgentInstallation[]; setActivePage: (page: PageKey) => void; selectAgent: (id: string) => void }) {
  return <section className="console-page"><div className="market-hero"><div><h2>智能体市场</h2><p>PaaS Bundle、GitHub Source Bundle 与 Local Source Bundle 统一展示。</p></div><button onClick={() => setActivePage('instances.install')}>安装智能体</button></div><div className="expert-grid">{bundles.map((bundle) => <div key={bundle.bundleId} className="expert-card"><div className="expert-head"><span className="avatar">🤖</span><div><strong>{bundle.name}</strong><span>{bundle.origin} · {bundle.sourceName}</span></div></div><p>{bundle.description || 'Agent Bundle 可安装到本地 Runtime。'}</p><div className="tag-row"><span>{bundle.category}</span><span>{bundle.targetCount} targets</span><span>{installations.some((item) => item.agentId === bundle.localAgentId) ? 'installed' : 'not installed'}</span></div><div className="card-actions">{bundle.localAgentId && <button onClick={() => selectAgent(bundle.localAgentId!)}>选择</button>}<button onClick={() => setActivePage('instances.install')}>安装</button></div></div>)}</div></section>
}

function AgentTeamsPage({ agents, bundles }: { agents: LocalAgentSummary[]; bundles: BundleCatalogItem[] }) {
  const categories = unique(agents.map((agent) => agent.category)).slice(0, 8)
  return <section className="console-page"><div className="page-actions"><button>创建团体</button><button>团体成员</button><button>团体配置</button><button>安装管理</button></div><div className="console-grid two">{categories.map((category) => <Panel key={category} title={`${category} 团体`} meta={`${agents.filter((agent) => agent.category === category).length} experts`}><p>按分类自动聚合专家，后续可保存为多智能体团体。</p><div className="tag-row"><span>members {agents.filter((agent) => agent.category === category).length}</span><span>bundles {bundles.filter((bundle) => bundle.category === category).length}</span></div></Panel>)}</div></section>
}

function AgentExpertsPage(props: { agents: LocalAgentSummary[]; selectedAgents: Set<string>; toggleAgent: (id: string) => void; previewRuntime: RuntimeKind; setPreviewRuntime: (value: RuntimeKind) => void; onMarkdown: (id: string) => void; onRuntimePreview: (id: string) => void; markdownPreview: AgentMarkdownPreview | null; conversionPreview: AgentRuntimeConversionPreview | null; bundlePreview: AgentBundle[]; onBuildBundles: () => void }) {
  return <section className="console-page"><div className="page-toolbar"><select value={props.previewRuntime} onChange={(event) => props.setPreviewRuntime(event.target.value as RuntimeKind)}>{runtimeOptions.map((runtime) => <option value={runtime} key={runtime}>{runtime}</option>)}</select><button onClick={props.onBuildBundles}>生成 Bundle 预览</button><span>{props.selectedAgents.size} selected</span></div><div className="expert-grid">{props.agents.slice(0, 80).map((agent, index) => <div key={agent.id} className={props.selectedAgents.has(agent.id) ? 'expert-card selected' : 'expert-card'}><div className="expert-head"><span className="avatar">{['🧠','🧑‍💻','🧑‍🎨','📊','🛡️','🧭'][index % 6]}</span><div><strong>{agent.name}</strong><span>{agent.sourceName} · {agent.category}</span></div><input type="checkbox" checked={props.selectedAgents.has(agent.id)} onChange={() => props.toggleAgent(agent.id)} /></div><p>{agent.description || '本地导入专家，可预览原文、转换并安装到 Runtime。'}</p><div className="tag-row"><span>{agent.slug}</span><span>{props.previewRuntime}</span></div><div className="card-actions"><button onClick={() => props.onMarkdown(agent.id)}>原始 Markdown</button><button onClick={() => props.onRuntimePreview(agent.id)}>Runtime 转换</button></div></div>)}</div><div className="console-grid two"><Panel title="原始 Markdown" meta={props.markdownPreview?.name ?? 'none'}><pre className="code-preview">{props.markdownPreview?.rawMarkdown ?? '选择一个专家查看原始 Markdown。'}</pre></Panel><Panel title="Runtime 转换预览" meta={props.conversionPreview?.runtime ?? 'none'}><pre className="code-preview">{props.conversionPreview ? JSON.stringify({ files: props.conversionPreview.files, risk: props.conversionPreview.riskReport, warnings: props.conversionPreview.warnings }, null, 2) : '选择一个专家生成 Runtime 转换预览。'}</pre></Panel></div>{props.bundlePreview.length > 0 && <Panel title="Agent Bundle Preview" meta={`${props.bundlePreview.length} bundles`}><div className="compact-list">{props.bundlePreview.map((bundle) => <div key={bundle.bundleId} className="compact-card"><strong>{bundle.profile.name}</strong><span>{bundle.bundleId} · {bundle.version}</span><small>{bundle.targets.join(', ')}</small></div>)}</div></Panel>}</section>
}

function SkillsPage({ skills, skillTargets, marketplaceSources }: { skills: SkillPackage[]; skillTargets: SkillTargetPath[]; marketplaceSources: MarketplaceSource[] }) {
  return <section className="console-page"><div className="page-actions"><button>技能市场</button><button>我的技能</button><button>安装</button><button>卸载</button></div><div className="console-grid two"><Panel title="技能市场来源" meta={`${marketplaceSources.length} sources`}><div className="compact-list">{marketplaceSources.map((source) => <div key={source.id} className="compact-card"><strong>{source.label}</strong><span>{source.kind} · {source.enabled ? 'enabled' : 'disabled'}</span><small>{source.description}</small></div>)}</div></Panel><Panel title="Runtime 目标路径" meta={`${skillTargets.length} targets`}><div className="compact-list">{skillTargets.map((target) => <div className="compact-card" key={target.runtime}><strong>{target.runtime}</strong><span>{target.supportsSymlink ? 'symlink/copy' : 'copy only'}</span><small>{target.globalPath ?? target.projectRelativePath ?? '-'}</small></div>)}</div></Panel></div><div className="expert-grid slim-grid">{skills.map((skill) => <div key={skill.id} className="market-card"><span className="avatar">🧩</span><div><strong>{skill.name}</strong><span>{skill.source} · {skill.syncMode}</span><p>{skill.description}</p><div className="tag-row"><span>{skill.enabledTargets.length} runtimes</span><span>{skill.version ?? 'local'}</span></div></div></div>)}</div></section>
}

function ConnectorsPage({ mcpServers, localApiSpec }: { mcpServers: McpServerConfig[]; localApiSpec: LocalApiSpec | null }) {
  return <section className="console-page"><div className="page-actions"><button>MCP 市场</button><button>我的 MCP</button><button>MCP 安装</button><button>权限策略</button></div><div className="expert-grid slim-grid">{mcpServers.map((server) => <div key={server.id} className="market-card"><span className="avatar">🔌</span><div><strong>{server.name}</strong><span>{server.transport} · {server.enabled ? 'enabled' : 'disabled'}</span><p>{server.description}</p><div className="tag-row"><span>{server.policy.approvalRequired ? 'approval' : 'auto'}</span><span>{server.policy.network}</span><span>{server.policy.shell}</span></div></div></div>)}</div><Panel title="Local API / MCP Server" meta={localApiSpec ? localApiSpec.baseUrl : 'not configured'}>{localApiSpec ? <div className="table-wrap"><table><thead><tr><th>Method</th><th>Path</th><th>Purpose</th><th>Audit</th></tr></thead><tbody>{localApiSpec.routes.map((route) => <tr key={`${route.method}-${route.path}`}><td>{route.method}</td><td>{route.path}</td><td>{route.purpose}</td><td>{route.audit ? 'yes' : 'no'}</td></tr>)}</tbody></table></div> : <EmptyState text="Local API spec not loaded." />}</Panel></section>
}

function ToolsPage({ generatedArtifacts, artifactPreview, onRead }: { generatedArtifacts: GeneratedArtifact[]; artifactPreview: string; onRead: (path: string) => void }) {
  return <section className="console-page"><div className="page-actions"><button>工具市场</button><button>我的工具</button><button>工具安装</button><button>风险扫描</button></div><div className="console-grid two"><Panel title="Generated Artifacts" meta={`${generatedArtifacts.length} files`}><div className="compact-list">{generatedArtifacts.slice(0, 40).map((artifact) => <button className="artifact-button" key={artifact.absolutePath} onClick={() => onRead(artifact.absolutePath)}><strong>{artifact.runtime}</strong><span>{artifact.relativePath}</span><small>{artifact.sizeBytes} bytes</small></button>)}</div></Panel><Panel title="Artifact Preview" meta="read-only"><pre className="code-preview">{artifactPreview || '选择一个生成产物进行预览。'}</pre></Panel></div></section>
}

function AgentKnowledgePage({ knowledgeSpaces, knowledgeSnapshots, onInitKnowledge }: { knowledgeSpaces: KnowledgeSpace[]; knowledgeSnapshots: KnowledgeSnapshot[]; onInitKnowledge: () => void }) { return <section className="console-page"><div className="page-actions"><button onClick={onInitKnowledge}>知识装载</button><button>Knowledge Context Pack</button></div><KnowledgeCenterPage title="智能体知识" knowledgeSpaces={knowledgeSpaces} knowledgeSnapshots={knowledgeSnapshots} /></section> }
function AgentMemoryPage({ memoryItems, memoryCandidates, onApprove }: { memoryItems: MemoryItem[]; memoryCandidates: MemoryCandidate[]; onApprove: (id: string) => void }) { return <section className="console-page"><div className="console-grid two"><MemoryItemsPanel items={memoryItems} /><MemoryCandidatesPanel candidates={memoryCandidates} onApprove={onApprove} /></div></section> }
function KnowledgeCenterPage({ title, knowledgeSpaces, knowledgeSnapshots }: { title: string; knowledgeSpaces: KnowledgeSpace[]; knowledgeSnapshots: KnowledgeSnapshot[] }) { return <section className="console-page"><div className="content-cards"><InfoCard title="产品文档" text="Agent Buddy 产品文档、运行时适配说明、Agent Bundle 规范。" /><InfoCard title="使用指南" text="安装向导、Source 导入、Runtime 检测、MCP 与 Skill 配置。" /><InfoCard title="最佳实践" text="企业智能体包分发、本地知识镜像、记忆审批、会话接力。" /></div><div className="console-grid two"><Panel title={`${title} / 知识列表`} meta={`${knowledgeSpaces.length} spaces`}><div className="compact-list">{knowledgeSpaces.map((space) => <div key={space.id} className="compact-card"><strong>{space.name}</strong><span>{space.source} · {space.syncMode}</span><small>{space.description}</small></div>)}</div></Panel><Panel title="知识快照" meta={`${knowledgeSnapshots.length} snapshots`}><div className="compact-list">{knowledgeSnapshots.map((snapshot) => <div key={snapshot.id} className="compact-card"><strong>{snapshot.spaceId}</strong><span>{snapshot.version} · {snapshot.status}</span><small>{snapshot.manifestPath}</small></div>)}</div></Panel></div></section> }
function SupportPage({ title }: { title: string }) { return <section className="console-page"><div className="content-cards"><InfoCard title="常见问题" text="Runtime 未检测、安装路径冲突、MCP 无法连接、PaaS 同步失败。" /><InfoCard title="在线支持" text="后续可接企业支持、工单系统、日志导出和诊断包。" /><InfoCard title="反馈建议" text="收集缺失 Runtime、知识命中率、技能推荐和安装体验反馈。" /></div><Panel title={title} meta="support"><p>这里是 Agent Buddy 的本地帮助支持入口，可和 Agent PaaS 的企业知识库同步。</p></Panel></section> }
function ApiReferencePage({ localApiSpec }: { localApiSpec: LocalApiSpec | null }) { return <section className="console-page"><div className="content-cards"><InfoCard title="API 文档" text="Local API / MCP routes, Memory, Knowledge, Session, Approval." /><InfoCard title="接口测试" text="后续可直接从界面调用本地 API 和 MCP endpoint。" /><InfoCard title="错误码说明" text="Runtime 检测、安装、同步、审批、知识镜像错误码。" /></div>{localApiSpec && <Panel title="Local API Reference" meta={localApiSpec.baseUrl}><div className="table-wrap"><table><thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead><tbody>{localApiSpec.routes.map((route) => <tr key={`${route.method}-${route.path}`}><td>{route.method}</td><td>{route.path}</td><td>{route.purpose}</td></tr>)}</tbody></table></div></Panel>}</section> }

function MemoryServicePage(props: { memoryItems: MemoryItem[]; memoryCandidates: MemoryCandidate[]; memoryDraft: string; setMemoryDraft: (value: string) => void; memoryWriteback: MemoryWritebackPlan | null; onPropose: () => void; onApprove: (id: string) => void }) { return <section className="console-page"><div className="console-grid two"><Panel title="记忆服务" meta="agent-buddy provider"><KeyValue label="Memory Provider" value="agent-buddy" /><KeyValue label="MCP" value="buddy-memory" /><KeyValue label="Write Policy" value="approval_required" /><div className="form-stack"><input value={props.memoryDraft} onChange={(event) => props.setMemoryDraft(event.target.value)} placeholder="新增记忆候选" /><button onClick={props.onPropose}>提出记忆</button></div>{props.memoryWriteback && <KeyValue label="Writeback conflicts" value={String(props.memoryWriteback.conflicts.length)} />}</Panel><MemoryCandidatesPanel candidates={props.memoryCandidates} onApprove={props.onApprove} /></div><MemoryItemsPanel items={props.memoryItems} /></section> }
function MemoryItemsPanel({ items }: { items: MemoryItem[] }) { return <Panel title="记忆列表" meta={`${items.length} memories`}><div className="compact-list">{items.map((item) => <div className="compact-card" key={item.id}><strong>{item.title}</strong><span>{item.scope} · {item.memoryType} · {item.status}</span><small>{item.content}</small></div>)}</div></Panel> }
function MemoryCandidatesPanel({ candidates, onApprove }: { candidates: MemoryCandidate[]; onApprove: (id: string) => void }) { return <Panel title="记忆候选" meta={`${candidates.length} candidates`}><div className="compact-list">{candidates.map((candidate) => <div className="compact-card" key={candidate.id}><strong>{candidate.memoryType}</strong><span>{candidate.scope} · {candidate.status} · {Math.round(candidate.confidence * 100)}%</span><small>{candidate.content}</small><button onClick={() => onApprove(candidate.id)}>审批通过</button></div>)}</div></Panel> }

function SessionOverviewPage({ sessionEvents, handoffPacks, sessionSyncPlan }: { sessionEvents: SessionEvent[]; handoffPacks: HandoffPack[]; sessionSyncPlan: SessionSyncPlan | null }) { return <section className="console-page"><MetricGrid metrics={{ instances: sessionSyncPlan?.sources.length ?? 0, agents: sessionEvents.length, installed: handoffPacks.length, activeSessions: unique(sessionEvents.map((event) => event.sessionId)).length, pendingSync: sessionSyncPlan?.paasSyncEnabled ? 1 : 0, risks: sessionSyncPlan?.warnings.length ?? 0, healthyInstances: sessionSyncPlan?.sources.filter((source) => source.detectedPaths.length > 0).length ?? 0, warningInstances: sessionSyncPlan?.warnings.length ?? 0, errorInstances: 0, healthScore: sessionSyncPlan ? 80 : 0 }} /><div className="console-grid two"><Panel title="Session Scanner" meta={sessionSyncPlan ? `${sessionSyncPlan.sources.length} sources` : 'not loaded'}>{sessionSyncPlan ? <div className="compact-list">{sessionSyncPlan.sources.map((source) => <div className="compact-card" key={source.runtime}><strong>{source.label}</strong><span>{source.supportLevel ?? 'unknown'} · {source.supportsResume ? 'resume' : 'no resume'}</span><small>{source.defaultPaths.join(', ')}</small></div>)}</div> : <EmptyState text="Session sync plan not loaded." />}</Panel><Panel title="Handoff Packs" meta={`${handoffPacks.length} handoffs`}><div className="compact-list">{handoffPacks.map((handoff) => <div key={handoff.id} className="compact-card"><strong>{handoff.goal}</strong><span>{handoff.sessionId} · {handoff.toRuntime ?? 'any runtime'}</span><small>{handoff.summary}</small></div>)}</div></Panel></div></section> }
function ActiveSessionsPage(props: { sessionEvents: SessionEvent[]; sessionId: string; setSessionId: (value: string) => void; handoffGoal: string; setHandoffGoal: (value: string) => void; handoffSummary: string; setHandoffSummary: (value: string) => void; onHandoff: () => void }) { const sessions = groupSessionEvents(props.sessionEvents); return <section className="console-page"><div className="console-grid two"><Panel title="活跃会话" meta={`${sessions.length} sessions`}><div className="compact-list">{sessions.map((session) => <div key={session.id} className="compact-card"><strong>{session.id}</strong><span>{session.count} events · {session.runtime ?? 'mixed runtime'}</span><small>{new Date(session.lastAt * 1000).toLocaleString()}</small></div>)}</div></Panel><Panel title="克隆 / Handoff 会话" meta="handoff"><div className="form-stack"><input value={props.sessionId} onChange={(event) => props.setSessionId(event.target.value)} placeholder="session id" /><input value={props.handoffGoal} onChange={(event) => props.setHandoffGoal(event.target.value)} placeholder="handoff goal" /><input value={props.handoffSummary} onChange={(event) => props.setHandoffSummary(event.target.value)} placeholder="handoff summary" /><button onClick={props.onHandoff}>创建 Handoff Pack</button></div></Panel></div></section> }
function SessionHistoryPage({ sessionEvents, handoffPacks }: { sessionEvents: SessionEvent[]; handoffPacks: HandoffPack[] }) { return <section className="console-page"><div className="console-grid two"><Panel title="历史会话事件" meta={`${sessionEvents.length} events`}><Timeline events={sessionEvents.slice(0, 60).map((event) => ({ id: event.id, title: event.eventType, message: event.payloadJson, ts: event.createdAt, level: event.runtime ?? 'session' }))} /></Panel><Panel title="可恢复 Handoff" meta={`${handoffPacks.length} packs`}><div className="compact-list">{handoffPacks.map((handoff) => <div key={handoff.id} className="compact-card"><strong>{handoff.goal}</strong><span>{handoff.sessionId}</span><small>{handoff.summary}</small></div>)}</div></Panel></div></section> }

function GeneralSettingsPage({ settings, setSettings, onSave }: { settings: AgentBuddySettings; setSettings: (settings: AgentBuddySettings) => void; onSave: () => void }) { return <section className="console-page"><Panel title="常规设置" meta={settings.deviceId}><div className="settings-grid"><label>Device ID<input value={settings.deviceId} onChange={(event) => setSettings({ ...settings, deviceId: event.target.value })} /></label><label>PaaS Base URL<input value={settings.paasBaseUrl} onChange={(event) => setSettings({ ...settings, paasBaseUrl: event.target.value })} /></label><label>Generated Retention<input type="number" value={settings.generatedArtifactRetentionDays} onChange={(event) => setSettings({ ...settings, generatedArtifactRetentionDays: Number(event.target.value) })} /></label><label>Backup Retention<input type="number" value={settings.backupRetentionDays} onChange={(event) => setSettings({ ...settings, backupRetentionDays: Number(event.target.value) })} /></label><label>Install Mode<select value={settings.installMode} onChange={(event) => setSettings({ ...settings, installMode: event.target.value as AgentBuddySettings['installMode'] })}><option value="auto">auto</option><option value="copy">copy</option><option value="symlink">symlink</option></select></label><label><input type="checkbox" checked={settings.syncEnabled} onChange={(event) => setSettings({ ...settings, syncEnabled: event.target.checked })} /> Sync Enabled</label><label><input type="checkbox" checked={settings.telemetryEnabled} onChange={(event) => setSettings({ ...settings, telemetryEnabled: event.target.checked })} /> Telemetry Enabled</label></div><button onClick={onSave}>保存设置</button></Panel></section> }
function SecuritySettingsPage({ auditEvents }: { auditEvents: AuditEvent[] }) { return <section className="console-page"><div className="content-cards"><InfoCard title="安全策略" text="文件、网络、Shell、外部发布统一走权限策略和审批。" /><InfoCard title="登录限制" text="本地登录与 PaaS 会话后续接入 SSO / Device Binding。" /><InfoCard title="会话管理" text="本地会话事件和 Handoff 支持审计回放。" /></div><Panel title="安全审计" meta={`${auditEvents.length} events`}><Timeline events={auditEvents.map(toAuditTimelineEvent)} /></Panel></section> }
function NotificationSettingsPage() { return <section className="console-page"><div className="content-cards"><InfoCard title="通知渠道" text="桌面通知、PaaS 通知、企业 IM 通道预留。" /><InfoCard title="通知模板" text="风险告警、安装完成、同步失败、审批请求模板。" /><InfoCard title="订阅管理" text="按实例、Runtime、Source、Agent 订阅事件。" /></div></section> }
function BackupRestorePage({ backups, restoreBackup }: { backups: InstallBackup[]; restoreBackup: (id: string) => void }) { return <section className="console-page"><div className="page-actions"><button>创建备份任务</button><button>清理过期备份</button></div><Panel title="备份历史" meta={`${backups.length} backups`}><div className="compact-list">{backups.map((backup) => <div key={backup.id} className="compact-card"><strong>{backup.runtime}</strong><span>{new Date(backup.createdAt * 1000).toLocaleString()}</span><small>{backup.originalPath}</small><small>{backup.backupPath}</small><button onClick={() => restoreBackup(backup.id)}>还原</button></div>)}</div></Panel></section> }
function EnterpriseSettingsPage(props: { paasInfo: PaasConnectionInfo | null; paasStatus: PaasConnectionStatus | null; deviceRequest: DeviceRegistrationRequest | null; bundlePullRequest: BundlePullRequest | null; paasSyncPreview: PaasSyncPreview | null; syncFlushPlan: SyncFlushPlan | null; deeplinkUrl: string; setDeeplinkUrl: (value: string) => void; deeplinkResult: DeepLinkRequest | null; onDeepLink: () => void; buddyStatus: BuddyStatusReport | null }) { return <section className="console-page"><div className="console-grid two"><Panel title="Agent PaaS 连接" meta={props.paasStatus?.message ?? 'not configured'}><KeyValue label="Base URL" value={props.paasInfo?.baseUrl ?? '-'} /><KeyValue label="Device ID" value={props.paasInfo?.deviceId ?? '-'} /><KeyValue label="Sync" value={props.paasInfo?.syncEnabled ? 'enabled' : 'disabled'} />{props.deviceRequest && <pre className="code-preview small">{JSON.stringify(props.deviceRequest, null, 2)}</pre>}</Panel><Panel title="Bundle Pull / Sync" meta={props.paasSyncPreview ? `${props.paasSyncPreview.pendingEvents} pending` : 'preview'}>{props.bundlePullRequest && <pre className="code-preview small">{JSON.stringify(props.bundlePullRequest, null, 2)}</pre>}{props.syncFlushPlan && <KeyValue label="Flush batch" value={String(props.syncFlushPlan.debouncePolicy.maxBatchSize)} />}</Panel></div><div className="console-grid two"><Panel title="Deep Link" meta="agentbuddy://"><div className="form-stack"><input value={props.deeplinkUrl} onChange={(event) => props.setDeeplinkUrl(event.target.value)} /><button onClick={props.onDeepLink}>Parse / Execute</button></div>{props.deeplinkResult && <pre className="code-preview small">{JSON.stringify(props.deeplinkResult, null, 2)}</pre>}</Panel><Panel title="企业管理" meta="PaaS boundary"><p>多租户、RBAC、SSO、License 由 Agent PaaS 作为 Control Plane 负责，Agent Buddy 展示本地设备、连接、同步和策略状态。</p>{props.buddyStatus && <KeyValue label="Detected runtimes" value={`${props.buddyStatus.detectedRuntimeCount}/${props.buddyStatus.runtimeCount}`} />}</Panel></div></section> }

function MetricGrid({ metrics }: { metrics: ReturnType<typeof buildMetrics> }) { return <div className="metric-grid"><MetricCard label="实例数" value={metrics.instances} /><MetricCard label="总智能体数" value={metrics.agents} /><MetricCard label="已安装" value={metrics.installed} /><MetricCard label="活跃会话" value={metrics.activeSessions} /><MetricCard label="待同步" value={metrics.pendingSync} /><MetricCard label="风险告警" value={metrics.risks} /></div> }
function MetricCard({ label, value }: { label: string; value: number }) { return <div className="metric-card"><strong>{value}</strong><span>{label}</span></div> }
function Panel({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) { return <section className="panel"><div className="panel-header"><h2>{title}</h2>{meta && <span>{meta}</span>}</div>{children}</section> }
function KeyValue({ label, value }: { label: string; value: string }) { return <div className="key-value"><span>{label}</span><strong>{value}</strong></div> }
function EmptyState({ text }: { text: string }) { return <div className="empty-state">{text}</div> }
function StatusBadge({ status }: { status: ConsoleInstanceStatus }) { return <span className={`status-badge ${status}`}><i className={`dot ${status}`} />{statusLabel(status)}</span> }
function InstanceCard({ instance, onDetail }: { instance: ConsoleInstance; onDetail: () => void }) { return <button className="instance-card" onClick={onDetail}><div><StatusBadge status={instance.status} /><strong>{instance.name}</strong><span>{instance.type} · {instance.group}</span><p>{instance.description}</p></div><small>{instance.path ?? 'local managed'}</small><div className="tag-row">{instance.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></button> }
function InstanceTable({ instances, onDetail }: { instances: ConsoleInstance[]; onDetail: () => void }) { return <div className="table-wrap"><table><thead><tr><th>状态</th><th>名称</th><th>类型</th><th>分组</th><th>路径</th><th>操作</th></tr></thead><tbody>{instances.map((instance) => <tr key={instance.id}><td><StatusBadge status={instance.status} /></td><td>{instance.name}</td><td>{instance.type}</td><td>{instance.group}</td><td>{instance.path ?? '-'}</td><td><button onClick={onDetail}>详情</button></td></tr>)}</tbody></table></div> }
function Timeline({ events }: { events: TimelineEvent[] }) { return <div className="timeline">{events.length === 0 ? <EmptyState text="暂无事件。" /> : events.map((event) => <div key={event.id} className="timeline-item"><strong>{event.title}</strong><span>{event.level} · {new Date(event.ts * 1000).toLocaleString()}</span><small>{event.message}</small></div>)}</div> }
function InfoCard({ title, text }: { title: string; text: string }) { return <div className="info-card"><strong>{title}</strong><p>{text}</p></div> }

interface TimelineEvent { id: string; title: string; message: string; ts: number; level: string }
function toTimelineEvent(event: InstallEvent): TimelineEvent { return { id: event.id, title: event.message, message: event.installationId ?? 'install event', ts: event.createdAt, level: event.level } }
function toAuditTimelineEvent(event: AuditEvent): TimelineEvent { return { id: event.id, title: event.action, message: event.message, ts: event.createdAt, level: event.severity } }
function toggleSet<T>(current: Set<T>, value: T): Set<T> { const next = new Set(current); next.has(value) ? next.delete(value) : next.add(value); return next }
function unique<T>(items: T[]): T[] { return Array.from(new Set(items)) }
function statusLabel(status: ConsoleInstanceStatus): string { return status === 'running' ? '运行中' : status === 'stopped' ? '已停止' : status === 'warning' ? '告警' : '异常' }

function buildInstances(runtimes: RuntimeDetection[], installations: AgentInstallation[], mcpServers: McpServerConfig[], knowledgeSpaces: KnowledgeSpace[], memoryItems: MemoryItem[], memoryCandidates: MemoryCandidate[], sessionEvents: SessionEvent[], localApiSpec: LocalApiSpec | null): ConsoleInstance[] {
  return [
    ...runtimes.map((runtime) => ({ id: `runtime:${runtime.kind}`, name: runtime.label, type: 'runtime' as const, status: runtime.detected ? 'running' as const : 'stopped' as const, group: 'Runtime', tags: [runtime.scope, runtime.kind], runtime: runtime.kind, path: runtime.defaultTarget ?? runtime.configDir ?? runtime.commandPath ?? undefined, description: runtime.notes.join(' ') || 'Runtime adapter detection record.' })),
    ...installations.map((installation) => ({ id: `install:${installation.id}`, name: installation.agentId, type: 'agent-installation' as const, status: installation.status === 'installed' ? 'running' as const : 'warning' as const, group: 'Agent Installations', tags: [installation.runtime, installation.scope], runtime: installation.runtime, path: installation.targetPath, description: `${installation.installedFiles.length} files installed`, updatedAt: installation.installedAt })),
    ...mcpServers.map((server) => ({ id: `mcp:${server.id}`, name: server.name, type: 'mcp-service' as const, status: server.enabled ? 'running' as const : 'stopped' as const, group: 'MCP Services', tags: [server.transport, server.policy.approvalRequired ? 'approval' : 'auto'], path: server.url ?? server.command ?? undefined, description: server.description })),
    ...knowledgeSpaces.map((space) => ({ id: `knowledge:${space.id}`, name: space.name, type: 'knowledge-mirror' as const, status: 'running' as const, group: 'Knowledge Mirrors', tags: [space.source, space.syncMode], description: space.description, updatedAt: space.updatedAt })),
    { id: 'memory:agent-buddy', name: 'Buddy Memory Service', type: 'memory-service', status: memoryCandidates.length > 0 ? 'warning' : 'running', group: 'Memory', tags: ['provider', 'approval-required'], description: `${memoryItems.length} memories, ${memoryCandidates.length} candidates` },
    { id: 'session:scanner', name: 'Session Event Center', type: 'session-service', status: sessionEvents.length > 0 ? 'running' : 'stopped', group: 'Sessions', tags: ['handoff', 'scanner'], description: `${sessionEvents.length} events indexed` },
    ...(localApiSpec ? [{ id: 'local-api:buddy', name: 'Local API / MCP Server', type: 'local-api' as const, status: 'running' as const, group: 'Local Services', tags: ['api', 'mcp'], path: localApiSpec.baseUrl, description: `${localApiSpec.routes.length} routes` }] : []),
  ]
}

function buildMetrics(instances: ConsoleInstance[], agents: LocalAgentSummary[], installations: AgentInstallation[], sessionEvents: SessionEvent[], syncOutbox: SyncOutboxEvent[], auditEvents: AuditEvent[], doctor: DoctorReport | null) {
  const healthyInstances = instances.filter((instance) => instance.status === 'running').length
  const warningInstances = instances.filter((instance) => instance.status === 'warning').length + (doctor?.summary.warning ?? 0)
  const errorInstances = instances.filter((instance) => instance.status === 'error').length + (doctor?.summary.error ?? 0)
  const healthScore = instances.length === 0 ? 0 : Math.max(0, Math.round((healthyInstances / instances.length) * 100 - warningInstances * 2 - errorInstances * 5))
  return { instances: instances.length, agents: agents.length, installed: installations.length, activeSessions: unique(sessionEvents.map((event) => event.sessionId)).length, pendingSync: syncOutbox.filter((event) => event.status === 'pending' || event.status === 'failed').length, risks: auditEvents.filter((event) => event.severity === 'security' || event.severity === 'error').length + warningInstances + errorInstances, healthyInstances, warningInstances, errorInstances, healthScore }
}

function groupSessionEvents(events: SessionEvent[]) { return unique(events.map((event) => event.sessionId)).map((id) => { const scoped = events.filter((event) => event.sessionId === id); return { id, count: scoped.length, lastAt: Math.max(...scoped.map((event) => event.createdAt)), runtime: scoped.find((event) => event.runtime)?.runtime } }).sort((a, b) => b.lastAt - a.lastAt) }
