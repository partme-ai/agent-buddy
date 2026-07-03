import { useEffect, useMemo, useState } from 'react'
import {
  approveMemoryCandidate,
  buildAgentBundles,
  createHandoffPack,
  detectRuntimes,
  getAgentMarkdown,
  getAgentSourceDetail,
  getInstallPlan,
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
  listMemoryCandidates,
  listMemoryItems,
  listSessionEvents,
  listSkillTargets,
  listSyncOutbox,
  parseDeepLink,
  previewAgentRuntimeConversion,
  previewSourceImportRisk,
  proposeMemory,
  readGeneratedArtifact,
  refreshAgentSource,
  refreshAgentSourceById,
  restoreBackup,
  runDoctor,
  runtimeDefinitions,
  uninstallInstallation,
} from './tauri'
import type {
  AgentBundle,
  AgentInstallation,
  AgentMarkdownPreview,
  AgentRuntimeConversionPreview,
  AgentSourceDetail,
  AgentSourceSummary,
  AuditEvent,
  BundleCatalogItem,
  DeepLinkRequest,
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
  McpServerConfig,
  MemoryCandidate,
  MemoryItem,
  MemoryScope,
  MemoryType,
  RuntimeDefinition,
  RuntimeDetection,
  RuntimeKind,
  SessionEvent,
  SkillPackage,
  SkillTargetPath,
  SourceImportRiskPreview,
  SyncOutboxEvent,
} from './types'

type SectionKey = 'overview' | 'instances' | 'agents' | 'knowledge' | 'wiki' | 'memory' | 'sessions' | 'settings'
type RouteKey =
  | 'overview.dashboard' | 'overview.health'
  | 'instances.list' | 'instances.groups' | 'instances.detail' | 'instances.installer'
  | 'agents.market' | 'agents.teams' | 'agents.experts' | 'agents.skills' | 'agents.connectors' | 'agents.tools' | 'agents.knowledge' | 'agents.memory'
  | 'knowledge.center' | 'knowledge.support' | 'knowledge.api'
  | 'wiki.center' | 'wiki.support' | 'wiki.api'
  | 'memory.service'
  | 'sessions.overview' | 'sessions.active' | 'sessions.history'
  | 'settings.general' | 'settings.security' | 'settings.notifications' | 'settings.backup' | 'settings.enterprise'

type InstanceStatus = 'running' | 'stopped' | 'error' | 'warning'
type InstanceType = 'runtime' | 'agent' | 'mcp' | 'knowledge' | 'memory' | 'session' | 'local-api'

interface ConsoleInstance {
  id: string
  name: string
  type: InstanceType
  status: InstanceStatus
  health: number
  group: string
  subtitle: string
  path?: string | null
  runtime?: RuntimeKind | null
  tags: string[]
}

interface ConsoleMetrics {
  instanceCount: number
  agentCount: number
  installedAgentCount: number
  activeSessionCount: number
  pendingSyncCount: number
  riskCount: number
  runtimeCount: number
  detectedRuntimeCount: number
  sourceCount: number
}

const runtimeOptions: RuntimeKind[] = [
  'claude-code', 'copilot', 'antigravity', 'gemini-cli', 'opencode', 'openclaw', 'cursor', 'trae', 'aider',
  'windsurf', 'qwen', 'codex', 'deerflow', 'workbuddy', 'codewhale', 'hermes', 'kiro', 'qoder',
]

const menu: Array<{ section: SectionKey; label: string; routes: Array<{ route: RouteKey; label: string }> }> = [
  { section: 'overview', label: '概览', routes: [{ route: 'overview.dashboard', label: '总体总览' }, { route: 'overview.health', label: '健康看板' }] },
  { section: 'instances', label: '实例', routes: [{ route: 'instances.list', label: '实例列表' }, { route: 'instances.groups', label: '实例分组' }, { route: 'instances.detail', label: '实例详情' }, { route: 'instances.installer', label: '安装向导' }] },
  { section: 'agents', label: '智能体', routes: [{ route: 'agents.market', label: '市场' }, { route: 'agents.teams', label: '团体' }, { route: 'agents.experts', label: '专家' }, { route: 'agents.skills', label: '技能' }, { route: 'agents.connectors', label: '连接器' }, { route: 'agents.tools', label: '工具' }, { route: 'agents.knowledge', label: '知识' }, { route: 'agents.memory', label: '记忆' }] },
  { section: 'knowledge', label: '知识', routes: [{ route: 'knowledge.center', label: '知识中心' }, { route: 'knowledge.support', label: '帮助支持' }, { route: 'knowledge.api', label: 'API 引用' }] },
  { section: 'wiki', label: 'Wiki', routes: [{ route: 'wiki.center', label: '知识中心' }, { route: 'wiki.support', label: '帮助支持' }, { route: 'wiki.api', label: 'API 引用' }] },
  { section: 'memory', label: '记忆', routes: [{ route: 'memory.service', label: '服务' }] },
  { section: 'sessions', label: '会话', routes: [{ route: 'sessions.overview', label: '总览' }, { route: 'sessions.active', label: '活跃' }, { route: 'sessions.history', label: '历史' }] },
  { section: 'settings', label: '设置', routes: [{ route: 'settings.general', label: '常规设置' }, { route: 'settings.security', label: '安全设置' }, { route: 'settings.notifications', label: '通知策略' }, { route: 'settings.backup', label: '备份还原' }, { route: 'settings.enterprise', label: '企业管理' }] },
]

function App() {
  const [route, setRoute] = useState<RouteKey>('overview.dashboard')
  const [search, setSearch] = useState('')
  const [agentSources, setAgentSources] = useState<AgentSourceSummary[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState('all')
  const [sourceUrl, setSourceUrl] = useState('https://github.com/jnMetaCode/agency-agents-zh')
  const [sourceName, setSourceName] = useState('agency-agents-zh')
  const [sourceBranch, setSourceBranch] = useState('')
  const [sourceDetail, setSourceDetail] = useState<AgentSourceDetail | null>(null)
  const [sourceRisk, setSourceRisk] = useState<SourceImportRiskPreview | null>(null)
  const [markdownPreview, setMarkdownPreview] = useState<AgentMarkdownPreview | null>(null)
  const [conversionPreview, setConversionPreview] = useState<AgentRuntimeConversionPreview | null>(null)
  const [bundleCatalog, setBundleCatalog] = useState<BundleCatalogItem[]>([])
  const [previewRuntime, setPreviewRuntime] = useState<RuntimeKind>('claude-code')
  const [agents, setAgents] = useState<LocalAgentSummary[]>([])
  const [bundles, setBundles] = useState<AgentBundle[]>([])
  const [definitions, setDefinitions] = useState<RuntimeDefinition[]>([])
  const [runtimes, setRuntimes] = useState<RuntimeDetection[]>([])
  const [installations, setInstallations] = useState<AgentInstallation[]>([])
  const [backups, setBackups] = useState<InstallBackup[]>([])
  const [events, setEvents] = useState<InstallEvent[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [syncOutbox, setSyncOutbox] = useState<SyncOutboxEvent[]>([])
  const [generatedArtifacts, setGeneratedArtifacts] = useState<GeneratedArtifact[]>([])
  const [artifactPreview, setArtifactPreview] = useState('')
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([])
  const [builtInSkills, setBuiltInSkills] = useState<SkillPackage[]>([])
  const [skillTargets, setSkillTargets] = useState<SkillTargetPath[]>([])
  const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeSpace[]>([])
  const [knowledgeSnapshots, setKnowledgeSnapshots] = useState<KnowledgeSnapshot[]>([])
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([])
  const [memoryCandidates, setMemoryCandidates] = useState<MemoryCandidate[]>([])
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([])
  const [handoffPacks, setHandoffPacks] = useState<HandoffPack[]>([])
  const [doctor, setDoctor] = useState<DoctorReport | null>(null)
  const [plan, setPlan] = useState<InstallPlan | null>(null)
  const [deeplinkUrl, setDeeplinkUrl] = useState('agentbuddy://install-source?url=https%3A%2F%2Fgithub.com%2FjnMetaCode%2Fagency-agents-zh')
  const [deeplinkResult, setDeeplinkResult] = useState<DeepLinkRequest | null>(null)
  const [category, setCategory] = useState('all')
  const [projectDir, setProjectDir] = useState('')
  const [customDir, setCustomDir] = useState('')
  const [hermesCategories, setHermesCategories] = useState('')
  const [memoryDraft, setMemoryDraft] = useState('')
  const [sessionId, setSessionId] = useState('local-session')
  const [handoffGoal, setHandoffGoal] = useState('Continue current task in another runtime')
  const [handoffSummary, setHandoffSummary] = useState('Summarize what has been done and the next recommended action.')
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [selectedRuntimes, setSelectedRuntimes] = useState<Set<RuntimeKind>>(new Set())
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [status, setStatus] = useState('Ready')
  const [busy, setBusy] = useState(false)

  async function reload() {
    const [
      nextSources, nextDefinitions, nextAgents, nextRuntimes, nextInstallations, nextBackups, nextEvents,
      nextAuditEvents, nextSyncOutbox, nextArtifacts, nextMcpServers, nextBuiltInSkills, nextSkillTargets,
      nextKnowledgeSpaces, nextKnowledgeSnapshots, nextMemoryItems, nextMemoryCandidates, nextSessionEvents,
      nextHandoffPacks, nextBundleCatalog,
    ] = await Promise.all([
      listAgentSources(), runtimeDefinitions(), listAgents(), detectRuntimes(), listInstallations(), listInstallBackups(),
      listInstallEvents(), listAuditEvents(), listSyncOutbox(), listGeneratedArtifacts(), listDefaultMcpServers(),
      listBuiltInSkills(), listSkillTargets(), listKnowledgeSpaces(), listKnowledgeSnapshots(), listMemoryItems(),
      listMemoryCandidates(), listSessionEvents(), listHandoffPacks(), listBundleCatalog(),
    ])
    setAgentSources(nextSources)
    setDefinitions(nextDefinitions)
    setAgents(nextAgents)
    setRuntimes(nextRuntimes)
    setInstallations(nextInstallations)
    setBackups(nextBackups)
    setEvents(nextEvents)
    setAuditEvents(nextAuditEvents)
    setSyncOutbox(nextSyncOutbox)
    setGeneratedArtifacts(nextArtifacts)
    setMcpServers(nextMcpServers)
    setBuiltInSkills(nextBuiltInSkills)
    setSkillTargets(nextSkillTargets)
    setKnowledgeSpaces(nextKnowledgeSpaces)
    setKnowledgeSnapshots(nextKnowledgeSnapshots)
    setMemoryItems(nextMemoryItems)
    setMemoryCandidates(nextMemoryCandidates)
    setSessionEvents(nextSessionEvents)
    setHandoffPacks(nextHandoffPacks)
    setBundleCatalog(nextBundleCatalog)
  }

  useEffect(() => { reload().catch((error) => setStatus(String(error))) }, [])

  const section = route.split('.')[0] as SectionKey
  const activeRouteMeta = menu.flatMap((item) => item.routes.map((child) => ({ ...child, section: item.section, sectionLabel: item.label }))).find((item) => item.route === route)
  const definitionByRuntime = useMemo(() => new Map(definitions.map((item) => [item.kind, item])), [definitions])
  const sourceScopedAgents = useMemo(() => selectedSourceId === 'all' ? agents : agents.filter((agent) => agent.sourceId === selectedSourceId), [agents, selectedSourceId])
  const categories = useMemo(() => ['all', ...Array.from(new Set(sourceScopedAgents.map((agent) => agent.category))).sort()], [sourceScopedAgents])
  const filteredAgents = useMemo(() => {
    const normalized = search.toLowerCase()
    return sourceScopedAgents.filter((agent) => {
      const matchesCategory = category === 'all' || agent.category === category
      const matchesQuery = !normalized || `${agent.name} ${agent.description} ${agent.slug} ${agent.sourceName}`.toLowerCase().includes(normalized)
      return matchesCategory && matchesQuery
    })
  }, [sourceScopedAgents, category, search])
  const filteredBundles = useMemo(() => {
    const normalized = search.toLowerCase()
    return bundleCatalog.filter((bundle) => !normalized || `${bundle.name} ${bundle.description} ${bundle.category} ${bundle.sourceName}`.toLowerCase().includes(normalized))
  }, [bundleCatalog, search])
  const instances = useMemo(() => buildInstances(runtimes, installations, mcpServers, knowledgeSpaces, memoryItems, sessionEvents), [runtimes, installations, mcpServers, knowledgeSpaces, memoryItems, sessionEvents])
  const selectedInstance = instances.find((item) => item.id === selectedInstanceId) ?? instances[0] ?? null
  const metrics = useMemo<ConsoleMetrics>(() => ({
    instanceCount: instances.length,
    agentCount: sourceScopedAgents.length,
    installedAgentCount: installations.length,
    activeSessionCount: new Set(sessionEvents.slice(0, 80).map((event) => event.sessionId)).size,
    pendingSyncCount: syncOutbox.filter((event) => event.status === 'pending' || event.status === 'failed').length,
    riskCount: auditEvents.filter((event) => event.severity === 'security' || event.severity === 'error').length + syncOutbox.filter((event) => event.status === 'failed').length,
    runtimeCount: runtimes.length,
    detectedRuntimeCount: runtimes.filter((runtime) => runtime.detected).length,
    sourceCount: agentSources.length,
  }), [instances, sourceScopedAgents, installations, sessionEvents, syncOutbox, auditEvents, runtimes, agentSources])

  function toggleAgent(id: string) { setSelectedAgents((current) => toggleSet(current, id)); setPlan(null) }
  function toggleRuntime(kind: RuntimeKind) { setSelectedRuntimes((current) => toggleSet(current, kind)); setPlan(null) }
  function selectedTargets(): InstallTarget[] {
    return Array.from(selectedRuntimes).map((runtime) => {
      const definition = definitionByRuntime.get(runtime)
      return {
        runtime,
        projectDir: definition?.scope === 'project' ? projectDir || null : null,
        customDir: definition?.scope === 'custom' ? customDir || null : null,
        categoryFilters: runtime === 'hermes' ? hermesCategories.split(',').map((item) => item.trim()).filter(Boolean) : [],
      }
    })
  }
  async function withBusy(work: () => Promise<void>) { setBusy(true); try { await work() } catch (error) { setStatus(String(error)) } finally { setBusy(false) } }
  async function handleRefreshSource() { await withBusy(async () => { const result = await refreshAgentSource(); setSelectedSourceId(result.sourceId); setStatus(result.message); setPlan(null); await reload() }) }
  async function handleImportSource() { await withBusy(async () => { const result = await importAgentSource({ sourceUrl, name: sourceName || null, branch: sourceBranch || null, sourceKind: null }); setSelectedSourceId(result.sourceId); setStatus(`Imported ${result.agentCount} agents from ${result.sourceName}.`); setSelectedAgents(new Set()); setPlan(null); await reload(); setSourceDetail(await getAgentSourceDetail(result.sourceId)) }) }
  async function handlePreviewSourceRisk() { await withBusy(async () => { const result = await previewSourceImportRisk({ sourceUrl, name: sourceName || null, branch: sourceBranch || null, sourceKind: null }); setSourceRisk(result); setStatus(`Source import risk preview: ${result.riskReport.totalFindings} finding(s).`) }) }
  async function handleRefreshSelectedSource() { await withBusy(async () => { if (selectedSourceId === 'all') { await handleRefreshSource(); return } const result = await refreshAgentSourceById(selectedSourceId); setStatus(result.message); setPlan(null); await reload(); setSourceDetail(await getAgentSourceDetail(selectedSourceId)) }) }
  async function handleSourceDetail() { if (selectedSourceId === 'all') return; await withBusy(async () => { setSourceDetail(await getAgentSourceDetail(selectedSourceId)); setStatus(`Loaded source detail: ${selectedSourceId}`) }) }
  async function handleMarkdown(agentId: string) { await withBusy(async () => { const markdown = await getAgentMarkdown(agentId); setMarkdownPreview(markdown); setStatus(`Loaded raw Markdown for ${markdown.name}.`) }) }
  async function handleRuntimePreview(agentId: string) { await withBusy(async () => { const preview = await previewAgentRuntimeConversion(agentId, previewRuntime); setConversionPreview(preview); setStatus(`Generated ${preview.files.length} preview file(s) for ${preview.runtime}.`) }) }
  async function handleBuildBundles() { await withBusy(async () => { const nextBundles = await buildAgentBundles(Array.from(selectedAgents)); setBundles(nextBundles); setStatus(`Built ${nextBundles.length} local Agent Bundle preview(s).`) }) }
  async function handlePlan() { await withBusy(async () => { const nextPlan = await getInstallPlan(Array.from(selectedAgents), selectedTargets()); setPlan(nextPlan); setStatus(`Install plan ready: ${nextPlan.totalAgents} agents, ${nextPlan.totalFiles} files.`) }) }
  async function handleInstall() { await withBusy(async () => { const result = await installAgents(Array.from(selectedAgents), selectedTargets()); setStatus(`Installed ${result.reduce((sum, item) => sum + item.filesWritten, 0)} files.`); setPlan(null); await reload() }) }
  async function handleUninstall(id: string) { await withBusy(async () => { await uninstallInstallation(id); await reload(); setStatus('Installation removed.') }) }
  async function handleRestoreBackup(id: string) { await withBusy(async () => { await restoreBackup(id); await reload(); setStatus('Backup restored.') }) }
  async function handleDoctor() { await withBusy(async () => { const report = await runDoctor(); setDoctor(report); setRoute('overview.health'); setStatus(`Doctor complete: ${report.summary.ok} ok, ${report.summary.warning} warnings, ${report.summary.error} errors.`) }) }
  async function handleParseDeepLink() { await withBusy(async () => { const parsed = await parseDeepLink(deeplinkUrl); setDeeplinkResult(parsed); if (parsed.action === 'install-source' && (parsed.params.url || parsed.params.repo || parsed.params.source)) { const result = await importAgentSourceFromDeepLink(deeplinkUrl); setSelectedSourceId(result.sourceId); await reload(); setStatus(`Deep link imported ${result.agentCount} agent(s) from ${result.sourceName}.`); return } setStatus(`Parsed deeplink: ${parsed.action}`) }) }
  async function handleReadArtifact(path: string) { await withBusy(async () => { const content = await readGeneratedArtifact(path); setArtifactPreview(content); setStatus(`Loaded generated artifact: ${path}`) }) }
  async function handleInitKnowledge() { await withBusy(async () => { const spaces = await initializeDefaultKnowledgeSpaces(); await reload(); setStatus(`Initialized ${spaces.length} knowledge spaces.`) }) }
  async function handleProposeMemory() { await withBusy(async () => { if (!memoryDraft.trim()) return; await proposeMemory(memoryDraft, 'user' as MemoryScope, 'preference' as MemoryType, sessionId); setMemoryDraft(''); await reload(); setStatus('Memory candidate proposed.') }) }
  async function handleApproveMemory(id: string) { await withBusy(async () => { await approveMemoryCandidate(id, 'Approved memory'); await reload(); setStatus('Memory candidate approved.') }) }
  async function handleCreateHandoff() { await withBusy(async () => { await createHandoffPack(sessionId, null, Array.from(selectedRuntimes)[0] ?? null, handoffGoal, handoffSummary); await reload(); setStatus('Handoff pack created.') }) }

  return <div className="console-shell">
    <ConsoleSidebar route={route} metrics={metrics} onRouteChange={setRoute} />
    <main className="console-main">
      <ConsoleTopbar title={activeRouteMeta?.label ?? 'Agent Buddy'} section={activeRouteMeta?.sectionLabel ?? '控制台'} search={search} busy={busy} setSearch={setSearch} onRefresh={() => withBusy(reload)} onDoctor={handleDoctor} />
      <div className="console-status"><strong>{sectionLabel(section)}</strong><span>{status}</span><b>{busy ? 'Working' : 'Ready'}</b></div>
      {renderRoute(route, {
        metrics, instances, selectedInstance, setSelectedInstanceId, setRoute, doctor, runtimes, installations, backups, events,
        auditEvents, syncOutbox, generatedArtifacts, artifactPreview, handleReadArtifact, agentSources, selectedSourceId,
        setSelectedSourceId, sourceUrl, setSourceUrl, sourceName, setSourceName, sourceBranch, setSourceBranch, sourceDetail,
        sourceRisk, handlePreviewSourceRisk, handleImportSource, handleRefreshSelectedSource, handleSourceDetail, bundles, bundleCatalog,
        filteredBundles, agents: filteredAgents, allAgents: sourceScopedAgents, categories, category, setCategory, selectedAgents,
        toggleAgent, handleMarkdown, handleRuntimePreview, previewRuntime, setPreviewRuntime, selectedRuntimes, toggleRuntime,
        definitionByRuntime, projectDir, setProjectDir, customDir, setCustomDir, hermesCategories, setHermesCategories,
        handleBuildBundles, handlePlan, handleInstall, plan, markdownPreview, conversionPreview, deeplinkUrl, setDeeplinkUrl,
        deeplinkResult, handleParseDeepLink, mcpServers, builtInSkills, skillTargets, knowledgeSpaces, knowledgeSnapshots,
        handleInitKnowledge, memoryItems, memoryCandidates, memoryDraft, setMemoryDraft, handleProposeMemory, handleApproveMemory,
        sessionEvents, handoffPacks, sessionId, setSessionId, handoffGoal, setHandoffGoal, handoffSummary, setHandoffSummary,
        handleCreateHandoff, busy, handleUninstall, handleRestoreBackup,
      })}
    </main>
  </div>
}

interface RouteContext {
  metrics: ConsoleMetrics
  instances: ConsoleInstance[]
  selectedInstance: ConsoleInstance | null
  setSelectedInstanceId: (id: string) => void
  setRoute: (route: RouteKey) => void
  doctor: DoctorReport | null
  runtimes: RuntimeDetection[]
  installations: AgentInstallation[]
  backups: InstallBackup[]
  events: InstallEvent[]
  auditEvents: AuditEvent[]
  syncOutbox: SyncOutboxEvent[]
  generatedArtifacts: GeneratedArtifact[]
  artifactPreview: string
  handleReadArtifact: (path: string) => void
  agentSources: AgentSourceSummary[]
  selectedSourceId: string
  setSelectedSourceId: (id: string) => void
  sourceUrl: string
  setSourceUrl: (value: string) => void
  sourceName: string
  setSourceName: (value: string) => void
  sourceBranch: string
  setSourceBranch: (value: string) => void
  sourceDetail: AgentSourceDetail | null
  sourceRisk: SourceImportRiskPreview | null
  handlePreviewSourceRisk: () => void
  handleImportSource: () => void
  handleRefreshSelectedSource: () => void
  handleSourceDetail: () => void
  bundles: AgentBundle[]
  bundleCatalog: BundleCatalogItem[]
  filteredBundles: BundleCatalogItem[]
  agents: LocalAgentSummary[]
  allAgents: LocalAgentSummary[]
  categories: string[]
  category: string
  setCategory: (value: string) => void
  selectedAgents: Set<string>
  toggleAgent: (id: string) => void
  handleMarkdown: (agentId: string) => void
  handleRuntimePreview: (agentId: string) => void
  previewRuntime: RuntimeKind
  setPreviewRuntime: (runtime: RuntimeKind) => void
  selectedRuntimes: Set<RuntimeKind>
  toggleRuntime: (runtime: RuntimeKind) => void
  definitionByRuntime: Map<RuntimeKind, RuntimeDefinition>
  projectDir: string
  setProjectDir: (value: string) => void
  customDir: string
  setCustomDir: (value: string) => void
  hermesCategories: string
  setHermesCategories: (value: string) => void
  handleBuildBundles: () => void
  handlePlan: () => void
  handleInstall: () => void
  plan: InstallPlan | null
  markdownPreview: AgentMarkdownPreview | null
  conversionPreview: AgentRuntimeConversionPreview | null
  deeplinkUrl: string
  setDeeplinkUrl: (value: string) => void
  deeplinkResult: DeepLinkRequest | null
  handleParseDeepLink: () => void
  mcpServers: McpServerConfig[]
  builtInSkills: SkillPackage[]
  skillTargets: SkillTargetPath[]
  knowledgeSpaces: KnowledgeSpace[]
  knowledgeSnapshots: KnowledgeSnapshot[]
  handleInitKnowledge: () => void
  memoryItems: MemoryItem[]
  memoryCandidates: MemoryCandidate[]
  memoryDraft: string
  setMemoryDraft: (value: string) => void
  handleProposeMemory: () => void
  handleApproveMemory: (id: string) => void
  sessionEvents: SessionEvent[]
  handoffPacks: HandoffPack[]
  sessionId: string
  setSessionId: (value: string) => void
  handoffGoal: string
  setHandoffGoal: (value: string) => void
  handoffSummary: string
  setHandoffSummary: (value: string) => void
  handleCreateHandoff: () => void
  busy: boolean
  handleUninstall: (id: string) => void
  handleRestoreBackup: (id: string) => void
}

function renderRoute(route: RouteKey, ctx: RouteContext) {
  switch (route) {
    case 'overview.dashboard': return <OverviewDashboard {...ctx} />
    case 'overview.health': return <HealthBoard {...ctx} />
    case 'instances.list': return <InstanceListPage {...ctx} />
    case 'instances.groups': return <InstanceGroupsPage {...ctx} />
    case 'instances.detail': return <InstanceDetailPage {...ctx} />
    case 'instances.installer': return <InstallWizardPage {...ctx} />
    case 'agents.market': return <AgentMarketPage {...ctx} />
    case 'agents.teams': return <AgentTeamsPage {...ctx} />
    case 'agents.experts': return <AgentExpertsPage {...ctx} />
    case 'agents.skills': return <SkillsPage {...ctx} />
    case 'agents.connectors': return <ConnectorsPage {...ctx} />
    case 'agents.tools': return <ToolsPage {...ctx} />
    case 'agents.knowledge': return <AgentKnowledgePage {...ctx} />
    case 'agents.memory': return <AgentMemoryPage {...ctx} />
    case 'knowledge.center': return <KnowledgeCenterPage {...ctx} />
    case 'knowledge.support': return <HelpSupportPage title="知识 / 帮助支持" />
    case 'knowledge.api': return <ApiReferencePage />
    case 'wiki.center': return <WikiCenterPage />
    case 'wiki.support': return <HelpSupportPage title="Wiki / 帮助支持" />
    case 'wiki.api': return <ApiReferencePage />
    case 'memory.service': return <MemoryServicePage {...ctx} />
    case 'sessions.overview': return <SessionOverviewPage {...ctx} />
    case 'sessions.active': return <ActiveSessionsPage {...ctx} />
    case 'sessions.history': return <SessionHistoryPage {...ctx} />
    case 'settings.general': return <GeneralSettingsPage {...ctx} />
    case 'settings.security': return <SecuritySettingsPage />
    case 'settings.notifications': return <NotificationSettingsPage />
    case 'settings.backup': return <BackupRestorePage {...ctx} />
    case 'settings.enterprise': return <EnterpriseSettingsPage {...ctx} />
    default: return <OverviewDashboard {...ctx} />
  }
}

function ConsoleSidebar({ route, metrics, onRouteChange }: { route: RouteKey; metrics: ConsoleMetrics; onRouteChange: (route: RouteKey) => void }) {
  const activeSection = route.split('.')[0] as SectionKey
  const counts: Record<SectionKey, number> = {
    overview: metrics.riskCount,
    instances: metrics.instanceCount,
    agents: metrics.agentCount,
    knowledge: metrics.sourceCount,
    wiki: 3,
    memory: metrics.pendingSyncCount,
    sessions: metrics.activeSessionCount,
    settings: metrics.detectedRuntimeCount,
  }
  return <aside className="console-sidebar">
    <div className="window-dots"><span /><span /><span /></div>
    <div className="brand-block"><div className="brand-mark">AB</div><div><strong>Agent Buddy</strong><span>Local Agent Console</span></div></div>
    <nav className="console-nav">
      {menu.map((section) => <div key={section.section} className="console-nav-group">
        <button className={`console-nav-main ${activeSection === section.section ? 'active' : ''}`} onClick={() => onRouteChange(section.routes[0].route)}><span>{section.label}</span><b>{counts[section.section]}</b></button>
        {activeSection === section.section && <div className="console-subnav">{section.routes.map((child) => <button key={child.route} className={route === child.route ? 'active' : ''} onClick={() => onRouteChange(child.route)}>{child.label}</button>)}</div>}
      </div>)}
    </nav>
    <div className="sidebar-section"><strong>本机状态</strong><span>Runtime：{metrics.detectedRuntimeCount}/{metrics.runtimeCount}</span><span>安装：{metrics.installedAgentCount}</span><span>同步：{metrics.pendingSyncCount}</span></div>
    <div className="sidebar-footer"><div className="user-avatar">人</div><span>人生丰满</span></div>
  </aside>
}

function ConsoleTopbar({ title, section, search, busy, setSearch, onRefresh, onDoctor }: { title: string; section: string; search: string; busy: boolean; setSearch: (value: string) => void; onRefresh: () => void; onDoctor: () => void }) {
  return <header className="console-topbar">
    <div><div className="breadcrumb">Agent Buddy / {section}</div><h1>{title}</h1></div>
    <div className="topbar-actions"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索实例、智能体、来源或描述" /><button className="secondary-button" disabled={busy} onClick={onDoctor}>健康检查</button><button disabled={busy} onClick={onRefresh}>刷新</button></div>
  </header>
}

function OverviewDashboard(ctx: RouteContext) {
  return <div className="page-stack">
    <MetricCardGrid metrics={ctx.metrics} />
    <section className="dashboard-grid">
      <Panel title="全局健康状态" meta={`${ctx.metrics.riskCount} risks`}><HealthDonut running={ctx.instances.filter((item) => item.status === 'running').length} warning={ctx.instances.filter((item) => item.status === 'warning').length} error={ctx.instances.filter((item) => item.status === 'error').length} stopped={ctx.instances.filter((item) => item.status === 'stopped').length} /></Panel>
      <Panel title="Runtime 状态" meta={`${ctx.metrics.detectedRuntimeCount}/${ctx.metrics.runtimeCount}`}><RuntimeStrip runtimes={ctx.runtimes} /></Panel>
    </section>
    <section className="dashboard-grid three"><RecentTasks events={ctx.events} /><RecentAudit auditEvents={ctx.auditEvents} /><RecentSync syncOutbox={ctx.syncOutbox} /></section>
  </div>
}

function HealthBoard(ctx: RouteContext) {
  const riskEvents = ctx.auditEvents.filter((event) => event.severity === 'security' || event.severity === 'error')
  return <div className="page-stack">
    <section className="dashboard-grid"><Panel title="实例健康状态" meta="runtime / mcp / memory / knowledge"><div className="health-list">{ctx.instances.slice(0, 18).map((instance) => <StatusRow key={instance.id} label={instance.name} status={instance.status} meta={`${instance.type} · health ${instance.health}`} />)}</div></Panel><Panel title="风险告警列表" meta={`${riskEvents.length} alerts`}><div className="event-list">{riskEvents.slice(0, 12).map((event) => <EventCard key={event.id} title={event.action} meta={event.severity} body={event.message} tone={event.severity} />)}</div></Panel></section>
    {ctx.doctor && <DoctorPanel report={ctx.doctor} />}
    <section className="dashboard-grid"><RecentTasks events={ctx.events} /><RecentAudit auditEvents={ctx.auditEvents} /></section>
  </div>
}

function InstanceListPage(ctx: RouteContext) {
  return <div className="page-stack">
    <section className="toolbar-card"><div><h2>实例列表</h2><p>统一管理 Runtime、已安装智能体、MCP、知识、记忆和会话服务实例。</p></div><div className="actions"><button onClick={() => ctx.setRoute('instances.installer')}>+ 添加实例</button><button className="secondary-button">批量操作 ▾</button></div></section>
    <div className="filter-row"><button className="chip active">卡片</button><button className="chip">列表</button><button className="chip">运行中</button><button className="chip">异常</button><button className="chip">按分组</button><button className="chip">标签</button></div>
    <div className="instance-grid">{ctx.instances.map((instance) => <InstanceCard key={instance.id} instance={instance} onClick={() => { ctx.setSelectedInstanceId(instance.id); ctx.setRoute('instances.detail') }} />)}</div>
  </div>
}

function InstanceGroupsPage(ctx: RouteContext) {
  const groups = groupBy(ctx.instances, (item) => item.group)
  return <div className="page-stack"><section className="toolbar-card"><div><h2>实例分组</h2><p>按 Runtime、服务、安装实例和项目维度组织本地实例。</p></div><div className="actions"><button>新增分组</button><button className="secondary-button">设置标签</button></div></section><div className="group-grid">{Object.entries(groups).map(([group, items]) => <Panel key={group} title={group} meta={`${items.length} instances`}><div className="compact-list">{items.map((item) => <StatusRow key={item.id} label={item.name} status={item.status} meta={item.subtitle} />)}</div></Panel>)}</div></div>
}

function InstanceDetailPage(ctx: RouteContext) {
  const instance = ctx.selectedInstance
  if (!instance) return <EmptyState title="暂无实例" description="导入 Source 或检测 Runtime 后会生成实例。" />
  return <div className="page-stack"><section className="detail-hero"><div><StatusBadge status={instance.status} /><h2>{instance.name}</h2><p>{instance.subtitle}</p><small>{instance.path ?? 'No local path yet'}</small></div><div className="actions"><button>修复</button><button className="secondary-button">查看日志</button><button className="secondary-button">配置</button></div></section><div className="tab-strip"><button className="active">实例概览</button><button>对话测试</button><button>渠道管理</button><button>会话管理</button><button>Agent 管理</button><button>技能管理</button><button>节点管理</button><button>用量统计</button><button>定时任务</button><button>调试工具</button><button>上下文诊断</button><button>实例日志</button></div><section className="dashboard-grid"><Panel title="实例概览" meta={instance.type}><KeyValue label="健康分" value={`${instance.health}`} /><KeyValue label="分组" value={instance.group} /><KeyValue label="标签" value={instance.tags.join(', ')} /></Panel><Panel title="最近事件" meta="timeline"><EventList events={ctx.events} /></Panel></section></div>
}

function InstallWizardPage(ctx: RouteContext) {
  return <div className="page-stack"><section className="stepper"><Step index={1} title="选择来源" text="Agent PaaS / GitHub Source / Local Directory / Deep Link" /><Step index={2} title="选择智能体" text={`${ctx.selectedAgents.size} selected`} /><Step index={3} title="环境检查" text={`${ctx.metrics.detectedRuntimeCount}/${ctx.metrics.runtimeCount} runtimes`} /><Step index={4} title="配置引导" text="runtime / project / skill / mcp" /><Step index={5} title="安装计划" text={ctx.plan ? `${ctx.plan.totalFiles} files` : 'not generated'} /><Step index={6} title="确认部署" text="backup / write / audit" /></section><section className="dashboard-grid"><SourceImportPanel {...ctx} /><InstallControlPanel {...ctx} /></section>{ctx.plan && <InstallPlanPanel plan={ctx.plan} />}</div>
}

function AgentMarketPage(ctx: RouteContext) {
  return <div className="page-stack"><section className="section-title"><h2>智能体市场</h2><span>PaaS Bundle / GitHub Source / Local Source 统一展示</span></section><div className="bundle-grid">{ctx.filteredBundles.map((bundle) => <BundleCatalogCard key={bundle.bundleId} bundle={bundle} onSelect={() => bundle.localAgentId && ctx.toggleAgent(bundle.localAgentId)} />)}</div></div>
}

function AgentExpertsPage(ctx: RouteContext) {
  return <div className="page-stack"><section className="dashboard-grid"><SourceImportPanel {...ctx} /><SourceDetailPanel detail={ctx.sourceDetail} risk={ctx.sourceRisk} /></section><ExpertToolbar categories={ctx.categories} category={ctx.category} setCategory={ctx.setCategory} onSelectShown={() => ctx.agents.forEach((agent) => !ctx.selectedAgents.has(agent.id) && ctx.toggleAgent(agent.id))} /><div className="expert-grid">{ctx.agents.slice(0, 80).map((agent, index) => <AgentCard key={agent.id} agent={agent} index={index} selected={ctx.selectedAgents.has(agent.id)} runtime={ctx.previewRuntime} onToggle={() => ctx.toggleAgent(agent.id)} onMarkdown={() => ctx.handleMarkdown(agent.id)} onPreview={() => ctx.handleRuntimePreview(agent.id)} />)}</div><section className="dashboard-grid"><PreviewPanel markdown={ctx.markdownPreview} conversion={ctx.conversionPreview} /><InstallControlPanel {...ctx} /></section>{ctx.bundles.length > 0 && <BundlePanel bundles={ctx.bundles} />}</div>
}

function AgentTeamsPage(ctx: RouteContext) {
  const sources = ctx.agentSources.slice(0, 6)
  return <div className="page-stack"><section className="toolbar-card"><div><h2>智能体团体</h2><p>把多个专家组合成团队，并以团队为单位安装到 Runtime。</p></div><button>创建团体</button></section><div className="card-grid three">{sources.map((source) => <Panel key={source.id} title={`${source.name} 专家团`} meta={`${source.agentCount} members`}><p className="muted">来源 {source.sourceKind}，可按分类、Runtime 和项目组合安装。</p><div className="tag-row"><span>{source.categoryCount} categories</span><span>{source.runtimeCount} runtimes</span></div></Panel>)}<Panel title="企业内容运营团" meta="sample"><p className="muted">内容创作、审核、发布、复盘多专家协作。</p></Panel></div></div>
}

function SkillsPage(ctx: RouteContext) { return <MarketplaceGrid title="技能" subtitle="技能市场 / 我的技能 / 安装卸载" icon="🧩" items={ctx.builtInSkills.map((skill) => ({ id: skill.id, title: skill.name, meta: `${skill.source} · ${skill.syncMode}`, text: skill.description, tags: [`${skill.enabledTargets.length} runtimes`, skill.version ?? 'local'] }))} footer={`${ctx.skillTargets.length} target paths`} /> }
function ConnectorsPage(ctx: RouteContext) { return <MarketplaceGrid title="连接器 / MCP" subtitle="MCP 市场 / 我的 MCP / MCP 安装" icon="🔌" items={ctx.mcpServers.map((server) => ({ id: server.id, title: server.name, meta: `${server.transport} · ${server.enabled ? 'enabled' : 'disabled'}`, text: server.description, tags: [server.policy.approvalRequired ? 'approval' : 'auto', server.policy.network] }))} /> }
function ToolsPage(ctx: RouteContext) { return <MarketplaceGrid title="工具" subtitle="工具市场 / 我的工具 / 工具安装" icon="🛠️" items={[...ctx.builtInSkills.map((skill) => ({ id: `tool-${skill.id}`, title: `${skill.name} Tool`, meta: 'managed by Agent Buddy', text: skill.description, tags: ['risk scan', 'permission'] })), { id: 'tool-shell', title: 'Shell Guard', meta: 'local permission tool', text: '统一治理本地 shell、文件和网络访问。', tags: ['shell', 'audit'] }]} /> }
function AgentKnowledgePage(ctx: RouteContext) { return <KnowledgeCenterPage {...ctx} /> }
function AgentMemoryPage(ctx: RouteContext) { return <MemoryServicePage {...ctx} /> }

function KnowledgeCenterPage(ctx: RouteContext) { return <div className="page-stack"><section className="toolbar-card"><div><h2>知识中心</h2><p>产品文档、使用指南、最佳实践，以及本地 Knowledge Mirror。</p></div><button onClick={ctx.handleInitKnowledge}>知识装载</button></section><div className="dashboard-grid"><Panel title="知识列表" meta={`${ctx.knowledgeSpaces.length} spaces`}><div className="compact-list">{ctx.knowledgeSpaces.map((space) => <div key={space.id} className="compact-card"><strong>{space.name}</strong><span>{space.source} · {space.syncMode}</span><small>{space.description}</small></div>)}</div></Panel><Panel title="知识快照" meta={`${ctx.knowledgeSnapshots.length} snapshots`}><div className="compact-list">{ctx.knowledgeSnapshots.slice(0, 20).map((snapshot) => <div key={snapshot.id} className="compact-card"><strong>{snapshot.spaceId}</strong><span>{snapshot.version} · {snapshot.status}</span><small>{snapshot.manifestPath}</small></div>)}</div></Panel></div></div> }
function HelpSupportPage({ title }: { title: string }) { return <StaticDocPage title={title} cards={[['常见问题', '导入 Source、安装 Runtime、同步失败、权限审批。'], ['在线支持', '后续接入工单、IM、邮件和远程诊断。'], ['反馈建议', '收集缺失 Runtime、转换规则和知识命中反馈。']]} /> }
function ApiReferencePage() { return <StaticDocPage title="API 引用" cards={[['Local API', '/api/runtimes、/api/agents、/api/installations'], ['MCP API', '/mcp/memory、/mcp/knowledge、/mcp/session、/mcp/approval'], ['错误码说明', 'Runtime missing、Install conflict、Sync failed、Approval required']]} /> }
function WikiCenterPage() { return <StaticDocPage title="Wiki 知识中心" cards={[['Agent Source 规范', 'Markdown frontmatter、分类目录、license notice。'], ['Agent Bundle 规范', 'Profile、Instructions、Skills、MCP、Memory、Permission。'], ['Runtime 适配 Wiki', '18 Runtime 的检测、转换、安装和健康检查策略。']]} /> }

function MemoryServicePage(ctx: RouteContext) { return <div className="page-stack"><section className="dashboard-grid"><Panel title="记忆服务" meta="agent-buddy provider"><KeyValue label="Memory API" value="http://127.0.0.1:17888/mcp/memory" /><KeyValue label="候选记忆" value={`${ctx.memoryCandidates.length}`} /><KeyValue label="已生效记忆" value={`${ctx.memoryItems.length}`} /><div className="actions"><input value={ctx.memoryDraft} onChange={(event) => ctx.setMemoryDraft(event.target.value)} placeholder="输入一条待确认记忆" /><button onClick={ctx.handleProposeMemory}>提交候选</button></div></Panel><Panel title="记忆候选" meta="review"><div className="compact-list">{ctx.memoryCandidates.slice(0, 12).map((candidate) => <div key={candidate.id} className="compact-card"><strong>{candidate.memoryType}</strong><span>{candidate.scope} · {candidate.status}</span><small>{candidate.content}</small><button onClick={() => ctx.handleApproveMemory(candidate.id)}>Approve</button></div>)}</div></Panel></section><Panel title="记忆列表" meta={`${ctx.memoryItems.length} active`}><div className="compact-list">{ctx.memoryItems.slice(0, 24).map((item) => <div key={item.id} className="compact-card"><strong>{item.title}</strong><span>{item.scope} · {item.memoryType} · {item.status}</span><small>{item.content}</small></div>)}</div></Panel></div> }

function SessionOverviewPage(ctx: RouteContext) { return <div className="page-stack"><MetricRow cards={[['总会话数', `${new Set(ctx.sessionEvents.map((event) => event.sessionId)).size}`], ['活跃度指标', `${ctx.sessionEvents.length} events`], ['Handoff', `${ctx.handoffPacks.length}`], ['同步状态', `${ctx.syncOutbox.length} outbox`]]} /><section className="dashboard-grid"><Panel title="会话健康状态" meta="events"><HealthDonut running={ctx.sessionEvents.length} warning={ctx.handoffPacks.length} error={ctx.syncOutbox.filter((event) => event.status === 'failed').length} stopped={0} /></Panel><SessionHandoffPanel {...ctx} /></section></div> }
function ActiveSessionsPage(ctx: RouteContext) { return <SessionList title="活跃会话" events={ctx.sessionEvents.slice(0, 80)} handoffs={ctx.handoffPacks} /> }
function SessionHistoryPage(ctx: RouteContext) { return <SessionList title="历史会话" events={ctx.sessionEvents} handoffs={ctx.handoffPacks} /> }

function GeneralSettingsPage(ctx: RouteContext) { return <StaticDocPage title="常规设置" cards={[['站点配置', `本地数据源 ${ctx.agentSources.length} 个，Runtime ${ctx.runtimes.length} 个。`], ['主题设置', '浅色 / 深色 / 跟随系统。'], ['语言设置', '中文 / English。'], ['默认安装模式', 'auto：优先 symlink，失败后 copy。']]} /> }
function SecuritySettingsPage() { return <StaticDocPage title="安全设置" cards={[['安全策略', '文件、网络、Shell、外部发布权限策略。'], ['登录限制', 'PaaS session、device binding、token hint。'], ['会话管理', 'Session event retention、handoff approval。'], ['审批策略', '高危 MCP / shell / publish 操作审批。']]} /> }
function NotificationSettingsPage() { return <StaticDocPage title="通知策略" cards={[['通知渠道', '系统通知、邮件、Webhook、企业 IM。'], ['通知模板', '安装完成、同步失败、风险告警、审批请求。'], ['订阅管理', '按 Source、Runtime、Instance、Severity 订阅。']]} /> }
function BackupRestorePage(ctx: RouteContext) { return <div className="page-stack"><BackupPanel backups={ctx.backups} busy={ctx.busy} onRestore={ctx.handleRestoreBackup} /><GeneratedArtifactsPanel artifacts={ctx.generatedArtifacts} preview={ctx.artifactPreview} onRead={ctx.handleReadArtifact} /></div> }
function EnterpriseSettingsPage(ctx: RouteContext) { return <StaticDocPage title="企业管理" cards={[['Agent PaaS 连接', `${ctx.metrics.pendingSyncCount} pending sync events。`], ['多租户', '由 Agent PaaS 负责，Buddy 展示当前 workspace/device。'], ['RBAC / SSO', '由 Agent PaaS 下发本地策略快照。'], ['License 管理', '展示企业授权、本地 Source license / notice。']]} /> }

function MetricCardGrid({ metrics }: { metrics: ConsoleMetrics }) { return <MetricRow cards={[[ '实例数', `${metrics.instanceCount}` ], [ '总智能体数', `${metrics.agentCount}` ], [ '已安装', `${metrics.installedAgentCount}` ], [ '活跃会话', `${metrics.activeSessionCount}` ], [ '待同步', `${metrics.pendingSyncCount}` ], [ '风险告警', `${metrics.riskCount}` ]]} /> }
function MetricRow({ cards }: { cards: Array<[string, string]> }) { return <section className="metric-grid">{cards.map(([label, value]) => <div key={label} className="metric-card"><strong>{value}</strong><span>{label}</span></div>)}</section> }
function Panel({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) { return <section className="panel"><div className="panel-header"><h2>{title}</h2>{meta && <span>{meta}</span>}</div>{children}</section> }
function StatusBadge({ status }: { status: InstanceStatus }) { return <span className={`status-badge ${status}`}><i />{statusText(status)}</span> }
function StatusRow({ label, meta, status }: { label: string; meta: string; status: InstanceStatus }) { return <div className="status-row"><StatusBadge status={status} /><div><strong>{label}</strong><span>{meta}</span></div></div> }
function KeyValue({ label, value }: { label: string; value: string }) { return <div className="kv"><span>{label}</span><strong>{value}</strong></div> }
function EmptyState({ title, description }: { title: string; description: string }) { return <section className="empty-state"><h2>{title}</h2><p>{description}</p></section> }
function Step({ index, title, text }: { index: number; title: string; text: string }) { return <div className="step-card"><b>{index}</b><strong>{title}</strong><span>{text}</span></div> }
function InstanceCard({ instance, onClick }: { instance: ConsoleInstance; onClick: () => void }) { return <button className="instance-card" onClick={onClick}><div className="instance-card-head"><StatusBadge status={instance.status} /><span>{instance.type}</span></div><strong>{instance.name}</strong><p>{instance.subtitle}</p><small>{instance.path ?? instance.group}</small><div className="tag-row">{instance.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></button> }
function HealthDonut({ running, warning, error, stopped }: { running: number; warning: number; error: number; stopped: number }) { const total = Math.max(1, running + warning + error + stopped); return <div className="health-donut"><div className="donut" style={{ background: `conic-gradient(#22b98f 0 ${running / total * 100}%, #f59e0b 0 ${(running + warning) / total * 100}%, #ef4444 0 ${(running + warning + error) / total * 100}%, #cbd5e1 0 100%)` }}><strong>{Math.round(running / total * 100)}%</strong><span>healthy</span></div><div className="legend"><span>运行中 {running}</span><span>风险 {warning}</span><span>异常 {error}</span><span>停止 {stopped}</span></div></div> }
function RuntimeStrip({ runtimes }: { runtimes: RuntimeDetection[] }) { return <div className="runtime-strip">{runtimes.map((runtime) => <div key={runtime.kind} className={`runtime-pill ${runtime.detected ? 'detected' : ''}`}><strong>{runtime.label}</strong><span>{runtime.scope} · {runtime.detected ? 'detected' : 'missing'}</span></div>)}</div> }
function RecentTasks({ events }: { events: InstallEvent[] }) { return <Panel title="最近任务" meta={`${events.length} events`}><EventList events={events} /></Panel> }
function RecentAudit({ auditEvents }: { auditEvents: AuditEvent[] }) { return <Panel title="最近事件" meta={`${auditEvents.length} audit`}><div className="event-list">{auditEvents.slice(0, 10).map((event) => <EventCard key={event.id} title={event.action} meta={event.severity} body={event.message} tone={event.severity} />)}</div></Panel> }
function RecentSync({ syncOutbox }: { syncOutbox: SyncOutboxEvent[] }) { return <Panel title="同步队列" meta={`${syncOutbox.length} outbox`}><div className="event-list">{syncOutbox.slice(0, 10).map((event) => <EventCard key={event.id} title={event.eventType} meta={`${event.status} · retry ${event.retryCount}`} body={`${event.aggregateType}:${event.aggregateId}`} tone={event.status} />)}</div></Panel> }
function EventCard({ title, meta, body, tone }: { title: string; meta: string; body: string; tone?: string }) { return <div className={`event-card ${tone ?? ''}`}><strong>{title}</strong><span>{meta}</span><small>{body}</small></div> }
function EventList({ events }: { events: InstallEvent[] }) { return <div className="event-list">{events.slice(0, 12).map((event) => <EventCard key={event.id} title={event.level} meta={`${event.runtime ?? 'system'} · ${formatTime(event.createdAt)}`} body={event.message} tone={event.level} />)}</div> }

function SourceImportPanel(ctx: RouteContext) { return <Panel title="导入专家 / Agent Source" meta={`${ctx.agentSources.length} sources`}><div className="form-grid"><input value={ctx.sourceUrl} onChange={(event) => ctx.setSourceUrl(event.target.value)} placeholder="https://github.com/jnMetaCode/agency-agents-zh or /local/path" /><input value={ctx.sourceName} onChange={(event) => ctx.setSourceName(event.target.value)} placeholder="source name" /><input value={ctx.sourceBranch} onChange={(event) => ctx.setSourceBranch(event.target.value)} placeholder="branch optional" /></div><div className="actions"><button onClick={ctx.handlePreviewSourceRisk}>风险扫描</button><button onClick={ctx.handleImportSource}>导入 Source</button><button className="secondary-button" onClick={ctx.handleRefreshSelectedSource}>刷新</button></div><div className="actions"><select value={ctx.selectedSourceId} onChange={(event) => ctx.setSelectedSourceId(event.target.value)}><option value="all">All sources</option>{ctx.agentSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select><button className="secondary-button" disabled={ctx.selectedSourceId === 'all'} onClick={ctx.handleSourceDetail}>Source Detail</button></div></Panel> }
function SourceDetailPanel({ detail, risk }: { detail: AgentSourceDetail | null; risk: SourceImportRiskPreview | null }) { return <Panel title="Source Detail / License / Risk" meta={detail?.source.name ?? 'not selected'}>{risk && <div className="notice-box"><strong>Import Risk Preview</strong><span>{risk.sourceKind} · {risk.riskReport.totalFindings} finding(s)</span>{risk.warnings.map((warning) => <small key={warning}>{warning}</small>)}</div>}{detail ? <div className="detail-stack"><strong>{detail.source.name}</strong><span>{detail.source.agentCount} agents · {detail.categories.length} categories · {detail.source.runtimeCount} runtimes</span><small>{detail.source.sourceUrl}</small><small>{detail.licenseNotice.noticeText}</small><span>Risk findings: {detail.riskReport.totalFindings}</span><pre className="json-preview">{detail.licenseNotice.licenseTextPreview || 'No license text preview found.'}</pre></div> : <p className="muted">打开 Source Detail 后查看 license / notice、风险扫描、分类与智能体列表。</p>}</Panel> }
function ExpertToolbar({ categories, category, setCategory, onSelectShown }: { categories: string[]; category: string; setCategory: (value: string) => void; onSelectShown: () => void }) { return <section className="expert-toolbar"><div className="expert-tabs"><button className="text-tab active">专家</button><button className="text-tab">专家团</button></div><div className="chip-row">{categories.slice(0, 14).map((item) => <button key={item} className={`chip ${category === item ? 'active' : ''}`} onClick={() => setCategory(item)}>{item === 'all' ? '全部' : item}</button>)}</div><button className="secondary-button" onClick={onSelectShown}>选择当前</button></section> }
function AgentCard({ agent, index, selected, runtime, onToggle, onMarkdown, onPreview }: { agent: LocalAgentSummary; index: number; selected: boolean; runtime: RuntimeKind; onToggle: () => void; onMarkdown: () => void; onPreview: () => void }) { return <div className={`expert-card ${selected ? 'selected' : ''}`}><div className="expert-head"><span className="avatar">{['🐣','🧑‍💻','🧑‍🎨','📊','🧭','🛡️'][index % 6]}</span><div><strong>{agent.name || agent.slug}</strong><span>{agent.sourceName} · {agent.category}</span></div><input type="checkbox" checked={selected} onChange={onToggle} /></div><p>{agent.description || '本地导入智能体，可预览、转换并安装到 Runtime。'}</p><div className="tag-row"><span>{runtime}</span><span>{agent.slug}</span></div><div className="card-actions"><button onClick={onMarkdown}>原文</button><button onClick={onPreview}>转换</button></div></div> }
function BundleCatalogCard({ bundle, onSelect }: { bundle: BundleCatalogItem; onSelect: () => void }) { return <div className="bundle-card"><strong>{bundle.name}</strong><span>{bundle.origin} · {bundle.sourceName} · {bundle.targetCount} targets</span><p>{bundle.description}</p><div className="tag-row"><span>{bundle.category}</span><span>{bundle.memoryProvider}</span><span>{bundle.mcpCount} MCP</span></div>{bundle.localAgentId && <button onClick={onSelect}>选择专家</button>}</div> }
function InstallControlPanel(ctx: RouteContext) { return <Panel title="安装向导" meta={`${ctx.selectedAgents.size} agents · ${ctx.selectedRuntimes.size} runtimes`}><div className="form-grid"><input value={ctx.projectDir} onChange={(event) => ctx.setProjectDir(event.target.value)} placeholder="project directory" /><input value={ctx.customDir} onChange={(event) => ctx.setCustomDir(event.target.value)} placeholder="custom directory" /><input value={ctx.hermesCategories} onChange={(event) => ctx.setHermesCategories(event.target.value)} placeholder="Hermes categories" /></div><div className="actions"><select value={ctx.previewRuntime} onChange={(event) => ctx.setPreviewRuntime(event.target.value as RuntimeKind)}>{runtimeOptions.map((runtime) => <option key={runtime} value={runtime}>{runtime}</option>)}</select><button disabled={ctx.busy || ctx.selectedAgents.size === 0} onClick={ctx.handleBuildBundles}>Preview Bundles</button><button disabled={ctx.busy || ctx.selectedRuntimes.size === 0} onClick={ctx.handlePlan}>Generate Plan</button><button disabled={ctx.busy || ctx.selectedRuntimes.size === 0} onClick={ctx.handleInstall}>Install</button></div><div className="runtime-list compact-runtime-list">{ctx.runtimes.slice(0, 18).map((runtime) => <label key={runtime.kind} className={`runtime-card ${runtime.detected ? 'detected' : ''}`}><input checked={ctx.selectedRuntimes.has(runtime.kind)} onChange={() => ctx.toggleRuntime(runtime.kind)} type="checkbox" /><div><strong>{runtime.label}</strong><span>{runtime.scope} · {runtime.detected ? 'detected' : 'missing'}</span></div></label>)}</div></Panel> }
function PreviewPanel({ markdown, conversion }: { markdown: AgentMarkdownPreview | null; conversion: AgentRuntimeConversionPreview | null }) { return <Panel title="Agent Preview" meta={conversion ? conversion.runtime : markdown ? markdown.name : 'none'}><div className="artifact-layout"><pre className="artifact-preview">{markdown ? markdown.rawMarkdown : '选择专家卡片中的“原文”。'}</pre><pre className="artifact-preview">{conversion ? JSON.stringify({ files: conversion.files, risk: conversion.riskReport, warnings: conversion.warnings }, null, 2) : '选择专家卡片中的“转换”。'}</pre></div></Panel> }
function DeepLinkPanel(ctx: RouteContext) { return <Panel title="Deep Link" meta="agentbuddy://"><input value={ctx.deeplinkUrl} onChange={(event) => ctx.setDeeplinkUrl(event.target.value)} placeholder="agentbuddy://install-source?url=..." /><div className="actions"><button disabled={ctx.busy || !ctx.deeplinkUrl} onClick={ctx.handleParseDeepLink}>Parse / Execute</button></div>{ctx.deeplinkResult && <pre className="json-preview">{JSON.stringify(ctx.deeplinkResult, null, 2)}</pre>}</Panel> }
function InstallPlanPanel({ plan }: { plan: InstallPlan }) { return <Panel title="Install Plan" meta={`${plan.totalAgents} agents · ${plan.totalFiles} files`}><div className="plan-grid">{plan.targets.map((target) => <div key={target.runtime} className="plan-card"><strong>{target.runtime}</strong><span>{target.scope}</span><small>{target.filesToWrite} files · {target.agentsToInstall} agents</small>{target.targetDirs.map((dir) => <code key={dir}>{dir}</code>)}{target.warnings.map((warning) => <em key={warning}>{warning}</em>)}</div>)}</div>{plan.conflicts.length > 0 && <div className="notice-box"><strong>Conflicts</strong>{plan.conflicts.slice(0, 8).map((conflict) => <small key={`${conflict.runtime}-${conflict.path}`}>{conflict.runtime}: {conflict.path}</small>)}</div>}</Panel> }
function DoctorPanel({ report }: { report: DoctorReport }) { return <Panel title="Agent Doctor" meta={`${report.summary.ok} ok · ${report.summary.warning} warnings · ${report.summary.error} errors`}><div className="doctor-list">{report.checks.map((check) => <div key={check.id} className={`doctor-card ${check.status}`}><strong>{check.label}</strong><span>{check.status}</span><small>{check.message}</small>{check.remediation && <em>{check.remediation}</em>}</div>)}</div></Panel> }
function BundlePanel({ bundles }: { bundles: AgentBundle[] }) { return <Panel title="Agent Bundle Preview" meta={`${bundles.length}`}><div className="bundle-grid">{bundles.slice(0, 8).map((bundle) => <div key={bundle.bundleId} className="bundle-card"><strong>{bundle.profile.name}</strong><span>{bundle.bundleId} · {bundle.version}</span><p>{bundle.profile.description}</p><div className="tag-row"><span>{bundle.targets.length} targets</span><span>{bundle.skills.length} skills</span></div></div>)}</div></Panel> }
function MarketplaceGrid({ title, subtitle, icon, items, footer }: { title: string; subtitle: string; icon: string; footer?: string; items: Array<{ id: string; title: string; meta: string; text: string; tags: string[] }> }) { return <div className="page-stack"><section className="toolbar-card"><div><h2>{title}</h2><p>{subtitle}</p></div>{footer && <span>{footer}</span>}</section><div className="market-grid">{items.map((item) => <div key={item.id} className="market-card"><span className="avatar">{icon}</span><div><strong>{item.title}</strong><span>{item.meta}</span><p>{item.text}</p><div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></div>)}</div></div> }
function SessionHandoffPanel(ctx: RouteContext) { return <Panel title="会话 / Handoff" meta={`${ctx.sessionEvents.length} events · ${ctx.handoffPacks.length} handoffs`}><div className="form-grid"><input value={ctx.sessionId} onChange={(event) => ctx.setSessionId(event.target.value)} /><input value={ctx.handoffGoal} onChange={(event) => ctx.setHandoffGoal(event.target.value)} /><input value={ctx.handoffSummary} onChange={(event) => ctx.setHandoffSummary(event.target.value)} /></div><button onClick={ctx.handleCreateHandoff}>Create Handoff</button><div className="compact-list">{ctx.handoffPacks.slice(0, 8).map((handoff) => <div key={handoff.id} className="compact-card"><strong>{handoff.goal}</strong><span>{handoff.sessionId} · {handoff.toRuntime ?? 'any runtime'}</span><small>{handoff.summary}</small></div>)}</div></Panel> }
function SessionList({ title, events, handoffs }: { title: string; events: SessionEvent[]; handoffs: HandoffPack[] }) { return <div className="page-stack"><Panel title={title} meta={`${events.length} events`}><div className="compact-list">{events.slice(0, 80).map((event) => <div key={event.id} className="compact-card"><strong>{event.eventType}</strong><span>{event.sessionId} · {event.runtime ?? 'local'}</span><small>{event.payloadJson}</small></div>)}</div></Panel><Panel title="Handoff Pack" meta={`${handoffs.length}`}><div className="compact-list">{handoffs.map((handoff) => <div key={handoff.id} className="compact-card"><strong>{handoff.goal}</strong><span>{handoff.fromRuntime ?? 'any'} → {handoff.toRuntime ?? 'any'}</span><small>{handoff.summary}</small></div>)}</div></Panel></div> }
function BackupPanel({ backups, busy, onRestore }: { backups: InstallBackup[]; busy: boolean; onRestore: (id: string) => void }) { return <Panel title="备份历史" meta={`${backups.length}`}><div className="install-list">{backups.slice(0, 30).map((backup) => <div key={backup.id} className="install-card"><div><strong>{backup.runtime}</strong><span>{formatTime(backup.createdAt)}</span><small>{backup.originalPath}</small><small>{backup.backupPath}</small></div><button disabled={busy} onClick={() => onRestore(backup.id)}>Restore</button></div>)}</div></Panel> }
function InstallationPanel({ installations, busy, onUninstall }: { installations: AgentInstallation[]; busy: boolean; onUninstall: (id: string) => void }) { return <Panel title="安装管理" meta={`${installations.length}`}><div className="install-list">{installations.map((installation) => <div key={installation.id} className="install-card"><div><strong>{installation.runtime}</strong><span>{installation.agentId}</span><small>{installation.targetPath}</small><small>{installation.installedFiles.length} files · {formatTime(installation.installedAt)}</small></div><button disabled={busy} onClick={() => onUninstall(installation.id)}>Uninstall</button></div>)}</div></Panel> }
function GeneratedArtifactsPanel({ artifacts, preview, onRead }: { artifacts: GeneratedArtifact[]; preview: string; onRead: (path: string) => void }) { return <Panel title="Generated Artifacts" meta={`${artifacts.length}`}><div className="artifact-layout"><div className="compact-list">{artifacts.slice(0, 30).map((artifact) => <button key={artifact.absolutePath} className="artifact-button" onClick={() => onRead(artifact.absolutePath)}><strong>{artifact.runtime}</strong><span>{artifact.relativePath}</span><small>{artifact.sizeBytes} bytes</small></button>)}</div><pre className="artifact-preview">{preview || 'Select a generated artifact to preview it.'}</pre></div></Panel> }
function StaticDocPage({ title, cards }: { title: string; cards: Array<[string, string]> }) { return <div className="page-stack"><section className="toolbar-card"><div><h2>{title}</h2><p>产品文档、使用指南、最佳实践和接口说明。</p></div></section><div className="card-grid three">{cards.map(([heading, body]) => <Panel key={heading} title={heading}><p className="muted">{body}</p></Panel>)}</div></div> }

function buildInstances(runtimes: RuntimeDetection[], installations: AgentInstallation[], mcpServers: McpServerConfig[], knowledgeSpaces: KnowledgeSpace[], memoryItems: MemoryItem[], sessionEvents: SessionEvent[]): ConsoleInstance[] {
  const runtimeInstances: ConsoleInstance[] = runtimes.map((runtime) => ({ id: `runtime:${runtime.kind}`, name: runtime.label, type: 'runtime', status: runtime.detected ? 'running' : 'stopped', health: runtime.detected ? 92 : 40, group: 'Runtime', subtitle: `${runtime.scope} · ${runtime.detected ? 'detected' : 'not detected'}`, path: runtime.defaultTarget ?? runtime.configDir ?? runtime.commandPath, runtime: runtime.kind, tags: [runtime.scope, runtime.kind] }))
  const agentInstances: ConsoleInstance[] = installations.map((installation) => ({ id: `installation:${installation.id}`, name: installation.agentId, type: 'agent', status: installation.status === 'installed' ? 'running' : 'warning', health: installation.status === 'installed' ? 88 : 60, group: 'Agent Installation', subtitle: `${installation.runtime} · ${installation.scope}`, path: installation.targetPath, runtime: installation.runtime, tags: [installation.runtime, installation.scope] }))
  const mcpInstances: ConsoleInstance[] = mcpServers.map((server) => ({ id: `mcp:${server.id}`, name: server.name, type: 'mcp', status: server.enabled ? 'running' : 'stopped', health: server.enabled ? 86 : 50, group: 'MCP Service', subtitle: `${server.transport} · ${server.managedBy}`, path: server.url ?? server.command, runtime: null, tags: [server.transport, server.policy.approvalRequired ? 'approval' : 'auto'] }))
  const knowledgeInstances: ConsoleInstance[] = knowledgeSpaces.map((space) => ({ id: `knowledge:${space.id}`, name: space.name, type: 'knowledge', status: 'running', health: 82, group: 'Knowledge Mirror', subtitle: `${space.syncMode} · ${space.documentCount} docs`, path: space.source, tags: [space.syncMode, space.source] }))
  const memoryInstance: ConsoleInstance = { id: 'memory:local', name: 'Buddy Memory Service', type: 'memory', status: 'running', health: 84, group: 'Memory Service', subtitle: `${memoryItems.length} active memories`, path: 'http://127.0.0.1:17888/mcp/memory', tags: ['mcp', 'provider'] }
  const sessionInstance: ConsoleInstance = { id: 'session:center', name: 'Session Event Center', type: 'session', status: sessionEvents.length > 0 ? 'running' : 'warning', health: sessionEvents.length > 0 ? 82 : 64, group: 'Session Service', subtitle: `${sessionEvents.length} events`, path: 'local sqlite event log', tags: ['handoff', 'sync'] }
  return [...runtimeInstances, ...agentInstances, ...mcpInstances, ...knowledgeInstances, memoryInstance, sessionInstance]
}
function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> { return items.reduce<Record<string, T[]>>((acc, item) => { const key = keyFn(item); acc[key] = acc[key] ?? []; acc[key].push(item); return acc }, {}) }
function statusText(status: InstanceStatus) { return status === 'running' ? '运行中' : status === 'stopped' ? '已停止' : status === 'error' ? '异常' : '风险' }
function sectionLabel(section: SectionKey) { return menu.find((item) => item.section === section)?.label ?? '控制台' }
function formatTime(timestamp: number) { return new Date(timestamp * 1000).toLocaleString() }
function toggleSet<T>(current: Set<T>, value: T): Set<T> { const next = new Set(current); next.has(value) ? next.delete(value) : next.add(value); return next }

export default App
