import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
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
  | 'overview.summary' | 'overview.health'
  | 'instances.list' | 'instances.groups' | 'instances.detail' | 'instances.install'
  | 'agents.market' | 'agents.teams' | 'agents.experts' | 'agents.abilities.skills' | 'agents.abilities.connectors' | 'agents.abilities.tools' | 'agents.knowledge' | 'agents.memory'
  | 'knowledge.center' | 'knowledge.support' | 'knowledge.api'
  | 'wiki.center' | 'wiki.support' | 'wiki.api'
  | 'memory.service'
  | 'sessions.overview' | 'sessions.active' | 'sessions.history'
  | 'settings.general' | 'settings.security' | 'settings.notifications' | 'settings.backup' | 'settings.enterprise'

type InstanceStatus = 'running' | 'stopped' | 'warning' | 'error'
type InstanceType = 'runtime' | 'agent' | 'mcp' | 'knowledge' | 'memory' | 'session' | 'local-api'

type ConsoleInstance = {
  id: string
  name: string
  type: InstanceType
  status: InstanceStatus
  group: string
  path?: string
  runtime?: RuntimeKind
  description: string
  tags: string[]
}

type TimelineEvent = { id: string; title: string; message: string; level: string; ts: number }

const runtimeOptions: RuntimeKind[] = ['claude-code','copilot','antigravity','gemini-cli','opencode','openclaw','cursor','trae','aider','windsurf','qwen','codex','deerflow','workbuddy','codewhale','hermes','kiro','qoder']

const pageTitles: Record<PageKey, string> = {
  'overview.summary': '总体总览', 'overview.health': '健康看板',
  'instances.list': '实例列表', 'instances.groups': '实例分组', 'instances.detail': '实例详情', 'instances.install': '安装向导',
  'agents.market': '市场', 'agents.teams': '团体', 'agents.experts': '专家', 'agents.abilities.skills': '技能', 'agents.abilities.connectors': '连接器', 'agents.abilities.tools': '工具', 'agents.knowledge': '智能体知识', 'agents.memory': '智能体记忆',
  'knowledge.center': '知识中心', 'knowledge.support': '帮助支持', 'knowledge.api': 'API 引用',
  'wiki.center': 'Wiki 知识中心', 'wiki.support': 'Wiki 帮助支持', 'wiki.api': 'Wiki API 引用',
  'memory.service': '记忆服务',
  'sessions.overview': '会话总览', 'sessions.active': '活跃会话', 'sessions.history': '历史会话',
  'settings.general': '常规设置', 'settings.security': '安全设置', 'settings.notifications': '通知策略', 'settings.backup': '备份还原', 'settings.enterprise': '企业管理',
}

const menus: { title: string; items: { key: PageKey; label: string }[] }[] = [
  { title: '概览', items: [{ key: 'overview.summary', label: '总体总览' }, { key: 'overview.health', label: '健康看板' }] },
  { title: '实例', items: [{ key: 'instances.list', label: '实例列表' }, { key: 'instances.groups', label: '实例分组' }, { key: 'instances.detail', label: '实例详情' }, { key: 'instances.install', label: '安装向导' }] },
  { title: '智能体', items: [{ key: 'agents.market', label: '市场' }, { key: 'agents.teams', label: '团体' }, { key: 'agents.experts', label: '专家' }, { key: 'agents.abilities.skills', label: '能力 / 技能' }, { key: 'agents.abilities.connectors', label: '能力 / 连接器' }, { key: 'agents.abilities.tools', label: '能力 / 工具' }, { key: 'agents.knowledge', label: '知识' }, { key: 'agents.memory', label: '记忆' }] },
  { title: '知识', items: [{ key: 'knowledge.center', label: '知识中心' }, { key: 'knowledge.support', label: '帮助支持' }, { key: 'knowledge.api', label: 'API 引用' }] },
  { title: 'Wiki', items: [{ key: 'wiki.center', label: '知识中心' }, { key: 'wiki.support', label: '帮助支持' }, { key: 'wiki.api', label: 'API 引用' }] },
  { title: '记忆', items: [{ key: 'memory.service', label: '服务' }] },
  { title: '会话', items: [{ key: 'sessions.overview', label: '总览' }, { key: 'sessions.active', label: '活跃' }, { key: 'sessions.history', label: '历史' }] },
  { title: '设置', items: [{ key: 'settings.general', label: '常规设置' }, { key: 'settings.security', label: '安全设置' }, { key: 'settings.notifications', label: '通知策略' }, { key: 'settings.backup', label: '备份还原' }, { key: 'settings.enterprise', label: '企业管理' }] },
]

function fallbackSettings(): AgentBuddySettings {
  return { deviceId: 'local-device', paasBaseUrl: '', syncEnabled: true, telemetryEnabled: false, generatedArtifactRetentionDays: 30, backupRetentionDays: 30, installMode: 'auto' }
}

export default function ConsoleAppComplete() {
  const [page, setPage] = useState<PageKey>('overview.summary')
  const [settings, setSettings] = useState<AgentBuddySettings>(fallbackSettings())
  const [paasInfo, setPaasInfo] = useState<PaasConnectionInfo | null>(null)
  const [paasStatus, setPaasStatus] = useState<PaasConnectionStatus | null>(null)
  const [deviceRequest, setDeviceRequest] = useState<DeviceRegistrationRequest | null>(null)
  const [bundlePullRequest, setBundlePullRequest] = useState<BundlePullRequest | null>(null)
  const [paasSync, setPaasSync] = useState<PaasSyncPreview | null>(null)
  const [syncFlush, setSyncFlush] = useState<SyncFlushPlan | null>(null)
  const [localApi, setLocalApi] = useState<LocalApiSpec | null>(null)
  const [buddyStatus, setBuddyStatus] = useState<BuddyStatusReport | null>(null)
  const [sources, setSources] = useState<AgentSourceSummary[]>([])
  const [agents, setAgents] = useState<LocalAgentSummary[]>([])
  const [catalog, setCatalog] = useState<BundleCatalogItem[]>([])
  const [defs, setDefs] = useState<RuntimeDefinition[]>([])
  const [runtimes, setRuntimes] = useState<RuntimeDetection[]>([])
  const [installations, setInstallations] = useState<AgentInstallation[]>([])
  const [backups, setBackups] = useState<InstallBackup[]>([])
  const [installEvents, setInstallEvents] = useState<InstallEvent[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [syncOutbox, setSyncOutbox] = useState<SyncOutboxEvent[]>([])
  const [mcp, setMcp] = useState<McpServerConfig[]>([])
  const [skills, setSkills] = useState<SkillPackage[]>([])
  const [skillTargets, setSkillTargets] = useState<SkillTargetPath[]>([])
  const [marketSources, setMarketSources] = useState<MarketplaceSource[]>([])
  const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeSpace[]>([])
  const [knowledgeSnapshots, setKnowledgeSnapshots] = useState<KnowledgeSnapshot[]>([])
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([])
  const [memoryCandidates, setMemoryCandidates] = useState<MemoryCandidate[]>([])
  const [memoryWriteback, setMemoryWriteback] = useState<MemoryWritebackPlan | null>(null)
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([])
  const [handoffs, setHandoffs] = useState<HandoffPack[]>([])
  const [sessionSync, setSessionSync] = useState<SessionSyncPlan | null>(null)
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([])
  const [artifactText, setArtifactText] = useState('')
  const [doctor, setDoctor] = useState<DoctorReport | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState('all')
  const [sourceUrl, setSourceUrl] = useState('https://github.com/jnMetaCode/agency-agents-zh')
  const [sourceName, setSourceName] = useState('agency-agents-zh')
  const [sourceBranch, setSourceBranch] = useState('')
  const [sourceDetail, setSourceDetail] = useState<AgentSourceDetail | null>(null)
  const [sourceRisk, setSourceRisk] = useState<SourceImportRiskPreview | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [selectedRuntimes, setSelectedRuntimes] = useState<Set<RuntimeKind>>(new Set())
  const [projectDir, setProjectDir] = useState('')
  const [customDir, setCustomDir] = useState('')
  const [hermesCategories, setHermesCategories] = useState('')
  const [installPlan, setInstallPlan] = useState<InstallPlan | null>(null)
  const [bundlePreview, setBundlePreview] = useState<AgentBundle[]>([])
  const [markdown, setMarkdown] = useState<AgentMarkdownPreview | null>(null)
  const [conversion, setConversion] = useState<AgentRuntimeConversionPreview | null>(null)
  const [previewRuntime, setPreviewRuntime] = useState<RuntimeKind>('claude-code')
  const [query, setQuery] = useState('')
  const [instanceQuery, setInstanceQuery] = useState('')
  const [instanceType, setInstanceType] = useState('all')
  const [instanceStatus, setInstanceStatus] = useState('all')
  const [tableMode, setTableMode] = useState(false)
  const [memoryDraft, setMemoryDraft] = useState('')
  const [sessionId, setSessionId] = useState('local-session')
  const [handoffGoal, setHandoffGoal] = useState('Continue current task in another runtime')
  const [handoffSummary, setHandoffSummary] = useState('Summarize progress and next action.')
  const [deeplinkUrl, setDeeplinkUrl] = useState('agentbuddy://install-source?url=https%3A%2F%2Fgithub.com%2FjnMetaCode%2Fagency-agents-zh')
  const [deeplink, setDeeplink] = useState<DeepLinkRequest | null>(null)
  const [status, setStatus] = useState('Ready')
  const [busy, setBusy] = useState(false)

  const defByRuntime = useMemo(() => new Map(defs.map((def) => [def.kind, def])), [defs])
  const scopedAgents = useMemo(() => selectedSourceId === 'all' ? agents : agents.filter((agent) => agent.sourceId === selectedSourceId), [agents, selectedSourceId])
  const filteredAgents = useMemo(() => searchAgents(scopedAgents, query), [scopedAgents, query])
  const instances = useMemo(() => buildInstances(runtimes, installations, mcp, knowledgeSpaces, memoryItems, memoryCandidates, sessionEvents, localApi), [runtimes, installations, mcp, knowledgeSpaces, memoryItems, memoryCandidates, sessionEvents, localApi])
  const filteredInstances = useMemo(() => instances.filter((item) => matchesInstance(item, instanceQuery, instanceType, instanceStatus)), [instances, instanceQuery, instanceType, instanceStatus])
  const metrics = useMemo(() => buildMetrics(instances, agents, installations, sessionEvents, syncOutbox, auditEvents, doctor), [instances, agents, installations, sessionEvents, syncOutbox, auditEvents, doctor])
  const timeline = useMemo(() => [...installEvents.map(installToTimeline), ...auditEvents.map(auditToTimeline)].sort((a, b) => b.ts - a.ts).slice(0, 28), [installEvents, auditEvents])

  async function reloadAll() {
    const [
      nextSettings, nextPaasInfo, nextPaasStatus, nextDevice, nextBundlePull, nextPaasSync, nextSyncFlush, nextLocalApi, nextBuddyStatus,
      nextSources, nextAgents, nextCatalog, nextDefs, nextRuntimes, nextInstallations, nextBackups, nextInstallEvents, nextAudit,
      nextSync, nextMcp, nextSkills, nextSkillTargets, nextMarkets, nextKnowledge, nextKnowledgeSnapshots, nextMemory,
      nextCandidates, nextWriteback, nextSessions, nextHandoffs, nextSessionSync, nextArtifacts,
    ] = await Promise.all([
      loadSettings().catch(fallbackSettings), getPaasConnectionInfo().catch(() => null), getPaasConnectionStatus().catch(() => null), previewDeviceRegistration().catch(() => null), previewBundlePullRequest().catch(() => null), previewPaasSync().catch(() => null), buildSyncFlushPlan().catch(() => null), listLocalApiSpec().catch(() => null), buildBuddyStatusReport().catch(() => null),
      listAgentSources(), listAgents(), listBundleCatalog(), runtimeDefinitions(), detectRuntimes(), listInstallations(), listInstallBackups(), listInstallEvents(), listAuditEvents(), listSyncOutbox(), listDefaultMcpServers(), listBuiltInSkills(), listSkillTargets(), listMarketplaceSources().catch(() => []), listKnowledgeSpaces(), listKnowledgeSnapshots(), listMemoryItems(), listMemoryCandidates(), buildMemoryWritebackPlan().catch(() => null), listSessionEvents(), listHandoffPacks(), buildSessionSyncPlan().catch(() => null), listGeneratedArtifacts(),
    ])
    setSettings(nextSettings); setPaasInfo(nextPaasInfo); setPaasStatus(nextPaasStatus); setDeviceRequest(nextDevice); setBundlePullRequest(nextBundlePull); setPaasSync(nextPaasSync); setSyncFlush(nextSyncFlush); setLocalApi(nextLocalApi); setBuddyStatus(nextBuddyStatus)
    setSources(nextSources); setAgents(nextAgents); setCatalog(nextCatalog); setDefs(nextDefs); setRuntimes(nextRuntimes); setInstallations(nextInstallations); setBackups(nextBackups); setInstallEvents(nextInstallEvents); setAuditEvents(nextAudit); setSyncOutbox(nextSync); setMcp(nextMcp); setSkills(nextSkills); setSkillTargets(nextSkillTargets); setMarketSources(nextMarkets); setKnowledgeSpaces(nextKnowledge); setKnowledgeSnapshots(nextKnowledgeSnapshots); setMemoryItems(nextMemory); setMemoryCandidates(nextCandidates); setMemoryWriteback(nextWriteback); setSessionEvents(nextSessions); setHandoffs(nextHandoffs); setSessionSync(nextSessionSync); setArtifacts(nextArtifacts)
  }

  useEffect(() => { reloadAll().catch((error) => setStatus(String(error))) }, [])

  async function run(label: string, work: () => Promise<void>) { setBusy(true); setStatus(label); try { await work() } catch (error) { setStatus(String(error)) } finally { setBusy(false) } }
  function targets(): InstallTarget[] { return Array.from(selectedRuntimes).map((runtime) => ({ runtime, projectDir: defByRuntime.get(runtime)?.scope === 'project' ? projectDir || null : null, customDir: defByRuntime.get(runtime)?.scope === 'custom' ? customDir || null : null, categoryFilters: runtime === 'hermes' ? hermesCategories.split(',').map((item) => item.trim()).filter(Boolean) : [] })) }
  function toggleAgent(id: string) { setSelectedAgents(toggleSet(selectedAgents, id)); setInstallPlan(null) }
  function toggleRuntime(runtime: RuntimeKind) { setSelectedRuntimes(toggleSet(selectedRuntimes, runtime)); setInstallPlan(null) }
  async function openSourceDetail(id = selectedSourceId) { if (id === 'all') return; setSourceDetail(await getAgentSourceDetail(id)) }
  async function sourceImport() { await run('Importing agent source', async () => { const result = await importAgentSource({ sourceUrl, name: sourceName || null, branch: sourceBranch || null, sourceKind: null }); setSelectedSourceId(result.sourceId); setSelectedAgents(new Set()); await reloadAll(); await openSourceDetail(result.sourceId); setStatus(`Imported ${result.agentCount} agents from ${result.sourceName}`) }) }
  async function sourceRefresh() { await run('Refreshing agent source', async () => { const result = selectedSourceId === 'all' ? await refreshAgentSource() : await refreshAgentSourceById(selectedSourceId); await reloadAll(); await openSourceDetail(result.sourceId); setStatus(result.message) }) }
  async function sourceScan() { await run('Scanning source risk', async () => { setSourceRisk(await previewSourceImportRisk({ sourceUrl, name: sourceName || null, branch: sourceBranch || null, sourceKind: null })) }) }
  async function loadMarkdown(id: string) { await run('Loading raw Markdown', async () => { setMarkdown(await getAgentMarkdown(id)); setPage('agents.experts') }) }
  async function loadConversion(id: string) { await run('Generating runtime conversion', async () => { setConversion(await previewAgentRuntimeConversion(id, previewRuntime)); setPage('agents.experts') }) }
  async function previewBundles() { await run('Building Agent Bundle preview', async () => { setBundlePreview(await buildAgentBundles(Array.from(selectedAgents))) }) }
  async function planInstall() { await run('Generating Install Plan', async () => { setInstallPlan(await getInstallPlan(Array.from(selectedAgents), targets())) }) }
  async function installSelected() { await run('Installing selected agents', async () => { await installAgents(Array.from(selectedAgents), targets()); await reloadAll(); setStatus('Install complete') }) }
  async function doctorRun() { await run('Running Agent Doctor', async () => { setDoctor(await runDoctor()); setPage('overview.health') }) }
  async function initKnowledge() { await run('Initializing knowledge spaces', async () => { await initializeDefaultKnowledgeSpaces(); await reloadAll() }) }
  async function propose() { await run('Proposing memory', async () => { if (!memoryDraft.trim()) return; await proposeMemory(memoryDraft, 'user' as MemoryScope, 'preference' as MemoryType, sessionId); setMemoryDraft(''); await reloadAll() }) }
  async function approve(id: string) { await run('Approving memory', async () => { await approveMemoryCandidate(id, 'Approved memory'); await reloadAll() }) }
  async function handoff() { await run('Creating handoff', async () => { await createHandoffPack(sessionId, null, Array.from(selectedRuntimes)[0] ?? null, handoffGoal, handoffSummary); await reloadAll() }) }
  async function executeDeepLink() { await run('Executing Deep Link', async () => { const parsed = await parseDeepLink(deeplinkUrl); setDeeplink(parsed); if (parsed.action === 'install-source' && (parsed.params.url || parsed.params.repo || parsed.params.source)) { const result = await importAgentSourceFromDeepLink(deeplinkUrl); setSelectedSourceId(result.sourceId); await reloadAll(); await openSourceDetail(result.sourceId) } }) }
  async function previewArtifact(path: string) { await run('Reading artifact', async () => { setArtifactText(await readGeneratedArtifact(path)) }) }
  async function saveGeneralSettings() { await run('Saving settings', async () => { setSettings(await saveSettings(settings)); await reloadAll() }) }

  const pageNode = renderPage()
  return <div className="console-shell complete-console">
    <Sidebar active={page} onPage={setPage} metrics={metrics} />
    <main className="console-main">
      <Topbar title={pageTitles[page]} query={query} setQuery={setQuery} busy={busy} onRefresh={() => run('Refreshing console', reloadAll)} onDoctor={doctorRun} />
      <section className="console-status"><span>{status}</span><strong>{busy ? 'Working' : 'Ready'}</strong></section>
      {pageNode}
    </main>
  </div>

  function renderPage(): ReactNode {
    switch (page) {
      case 'overview.summary': return <Overview metrics={metrics} runtimes={runtimes} syncFlush={syncFlush} timeline={timeline} onPage={setPage} />
      case 'overview.health': return <Health doctor={doctor} runtimes={runtimes} audits={auditEvents} sync={syncOutbox} installs={installEvents} onDoctor={doctorRun} />
      case 'instances.list': return <InstancesList instances={filteredInstances} all={instances} query={instanceQuery} setQuery={setInstanceQuery} type={instanceType} setType={setInstanceType} status={instanceStatus} setStatus={setInstanceStatus} table={tableMode} setTable={setTableMode} onDetail={() => setPage('instances.detail')} onInstall={() => setPage('instances.install')} />
      case 'instances.groups': return <Groups instances={instances} />
      case 'instances.detail': return <InstanceDetail instance={filteredInstances[0] ?? instances[0]} events={timeline} sessions={sessionEvents} />
      case 'instances.install': return <InstallWizard sources={sources} selectedSourceId={selectedSourceId} setSelectedSourceId={setSelectedSourceId} sourceUrl={sourceUrl} setSourceUrl={setSourceUrl} sourceName={sourceName} setSourceName={setSourceName} sourceBranch={sourceBranch} setSourceBranch={setSourceBranch} sourceRisk={sourceRisk} sourceScan={sourceScan} sourceImport={sourceImport} sourceRefresh={sourceRefresh} agents={filteredAgents} selectedAgents={selectedAgents} toggleAgent={toggleAgent} runtimes={runtimes} selectedRuntimes={selectedRuntimes} toggleRuntime={toggleRuntime} projectDir={projectDir} setProjectDir={setProjectDir} customDir={customDir} setCustomDir={setCustomDir} hermesCategories={hermesCategories} setHermesCategories={setHermesCategories} installPlan={installPlan} previewBundles={previewBundles} planInstall={planInstall} installSelected={installSelected} />
      case 'agents.market': return <Market catalog={catalog} installations={installations} select={(id) => { setSelectedAgents(new Set([id])); setPage('instances.install') }} />
      case 'agents.teams': return <Teams agents={agents} catalog={catalog} />
      case 'agents.experts': return <Experts agents={filteredAgents} selected={selectedAgents} toggle={toggleAgent} previewRuntime={previewRuntime} setPreviewRuntime={setPreviewRuntime} markdown={markdown} conversion={conversion} bundlePreview={bundlePreview} loadMarkdown={loadMarkdown} loadConversion={loadConversion} previewBundles={previewBundles} />
      case 'agents.abilities.skills': return <Skills skills={skills} targets={skillTargets} sources={marketSources} />
      case 'agents.abilities.connectors': return <Connectors servers={mcp} api={localApi} />
      case 'agents.abilities.tools': return <Tools artifacts={artifacts} text={artifactText} read={previewArtifact} />
      case 'agents.knowledge': return <AgentKnowledge spaces={knowledgeSpaces} snapshots={knowledgeSnapshots} init={initKnowledge} />
      case 'agents.memory': return <MemoryList items={memoryItems} candidates={memoryCandidates} approve={approve} />
      case 'knowledge.center': return <Docs title="知识中心" spaces={knowledgeSpaces} snapshots={knowledgeSnapshots} />
      case 'knowledge.support': return <Support title="帮助支持" />
      case 'knowledge.api': return <Api title="API 引用" api={localApi} />
      case 'wiki.center': return <Docs title="Wiki 知识中心" spaces={knowledgeSpaces} snapshots={knowledgeSnapshots} />
      case 'wiki.support': return <Support title="Wiki 帮助支持" />
      case 'wiki.api': return <Api title="Wiki API 引用" api={localApi} />
      case 'memory.service': return <MemoryService items={memoryItems} candidates={memoryCandidates} draft={memoryDraft} setDraft={setMemoryDraft} writeback={memoryWriteback} propose={propose} approve={approve} />
      case 'sessions.overview': return <SessionsOverview events={sessionEvents} handoffs={handoffs} sync={sessionSync} />
      case 'sessions.active': return <ActiveSessions events={sessionEvents} sessionId={sessionId} setSessionId={setSessionId} goal={handoffGoal} setGoal={setHandoffGoal} summary={handoffSummary} setSummary={setHandoffSummary} handoff={handoff} />
      case 'sessions.history': return <SessionHistory events={sessionEvents} handoffs={handoffs} />
      case 'settings.general': return <General settings={settings} setSettings={setSettings} save={saveGeneralSettings} />
      case 'settings.security': return <Security audits={auditEvents} />
      case 'settings.notifications': return <Notifications />
      case 'settings.backup': return <Backup backups={backups} restore={(id) => run('Restoring backup', async () => { await restoreBackup(id); await reloadAll() })} />
      case 'settings.enterprise': return <Enterprise paasInfo={paasInfo} paasStatus={paasStatus} device={deviceRequest} pull={bundlePullRequest} sync={paasSync} flush={syncFlush} buddy={buddyStatus} deeplinkUrl={deeplinkUrl} setDeeplinkUrl={setDeeplinkUrl} deeplink={deeplink} execute={executeDeepLink} />
      default: return <Empty text="Page not implemented." />
    }
  }
}

function Sidebar({ active, onPage, metrics }: { active: PageKey; onPage: (page: PageKey) => void; metrics: ReturnType<typeof buildMetrics> }) { return <aside className="console-sidebar"><div className="window-dots"><span /><span /><span /></div><div className="console-brand"><div className="console-logo">AB</div><div><strong>Agent Buddy</strong><span>Local Agent Console</span></div></div><div className="console-sidebar-metrics"><span>实例 {metrics.instances}</span><span>智能体 {metrics.agents}</span><span>待同步 {metrics.pendingSync}</span></div><nav className="console-menu">{menus.map((group) => <div className="console-menu-group" key={group.title}><strong>{group.title}</strong>{group.items.map((item) => <button key={item.key} className={active === item.key ? 'active' : ''} onClick={() => onPage(item.key)}><span>{item.label}</span></button>)}</div>)}</nav></aside> }
function Topbar({ title, busy, query, setQuery, onRefresh, onDoctor }: { title: string; busy: boolean; query: string; setQuery: (value: string) => void; onRefresh: () => void; onDoctor: () => void }) { return <header className="console-topbar"><div><span className="breadcrumb">Agent Buddy / {title}</span><h1>{title}</h1></div><div className="console-topbar-actions"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索智能体、实例、知识、会话" /><button disabled={busy} onClick={onDoctor}>Agent Doctor</button><button disabled={busy} onClick={onRefresh}>刷新</button></div></header> }
function PageHero({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <section className="market-hero"><div><h2>{title}</h2><p>{text}</p></div>{action}</section> }
function Panel({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) { return <section className="panel"><div className="panel-header"><h2>{title}</h2>{meta && <span>{meta}</span>}</div>{children}</section> }
function MetricGrid({ metrics }: { metrics: ReturnType<typeof buildMetrics> }) { return <div className="metric-grid"><Metric label="实例数" value={metrics.instances} /><Metric label="总智能体数" value={metrics.agents} /><Metric label="已安装" value={metrics.installed} /><Metric label="活跃会话" value={metrics.activeSessions} /><Metric label="待同步" value={metrics.pendingSync} /><Metric label="风险告警" value={metrics.risks} /></div> }
function Metric({ label, value }: { label: string; value: number }) { return <div className="metric-card"><strong>{value}</strong><span>{label}</span></div> }
function Overview({ metrics, runtimes, syncFlush, timeline, onPage }: { metrics: ReturnType<typeof buildMetrics>; runtimes: RuntimeDetection[]; syncFlush: SyncFlushPlan | null; timeline: TimelineEvent[]; onPage: (page: PageKey) => void }) { return <section className="console-page"><PageHero title="本地 Agent Console 总览" text="统一查看实例、智能体、会话、同步、健康和风险状态。" action={<button onClick={() => onPage('instances.install')}>打开安装向导</button>} /><MetricGrid metrics={metrics} /><div className="console-grid two"><Panel title="全局健康状态" meta={`${metrics.healthScore}%`}><div className="health-donut"><div><strong>{metrics.healthScore}%</strong><span>Health</span></div></div><div className="health-legend"><span><i className="dot running" />运行中 {metrics.healthyInstances}</span><span><i className="dot warning" />告警 {metrics.warningInstances}</span><span><i className="dot error" />异常 {metrics.errorInstances}</span></div></Panel><Panel title="Sync Flush Plan" meta={syncFlush ? `${syncFlush.pendingCount} pending` : 'local'}>{syncFlush ? <KeyValues rows={[['Destination', syncFlush.destination || 'local only'], ['Batch', String(syncFlush.debouncePolicy.maxBatchSize)], ['Debounce', `${syncFlush.debouncePolicy.debounceMs}ms`], ...Object.entries(syncFlush.groupedCounts).map(([k, v]) => [k, String(v)] as [string, string])]} /> : <Empty text="No sync plan." />}</Panel></div><div className="console-grid two"><Panel title="Runtime 检测" meta={`${runtimes.filter((r) => r.detected).length}/${runtimes.length}`}><div className="runtime-strip">{runtimes.map((r) => <span key={r.kind} className={r.detected ? 'runtime-pill detected' : 'runtime-pill'}>{r.label}</span>)}</div></Panel><Panel title="最近事件" meta={`${timeline.length}`}><Timeline events={timeline} /></Panel></div></section> }
function Health({ doctor, runtimes, audits, sync, installs, onDoctor }: { doctor: DoctorReport | null; runtimes: RuntimeDetection[]; audits: AuditEvent[]; sync: SyncOutboxEvent[]; installs: InstallEvent[]; onDoctor: () => void }) { return <section className="console-page"><div className="page-actions"><button onClick={onDoctor}>刷新健康诊断</button></div><div className="console-grid two"><Panel title="实例健康状态" meta={doctor ? `${doctor.summary.ok} ok` : 'not run'}>{doctor ? <Cards items={doctor.checks.map((c) => ({ title: c.label, meta: c.status, text: c.message }))} /> : <Empty text="运行 Agent Doctor 后展示健康状态。" />}</Panel><Panel title="风险告警列表" meta={`${audits.length}`}><Cards items={audits.slice(0, 14).map((a) => ({ title: a.action, meta: a.severity, text: a.message }))} /></Panel></div><div className="console-grid two"><Panel title="最近任务" meta={`${installs.length}`}><Timeline events={installs.slice(0, 12).map(installToTimeline)} /></Panel><Panel title="同步事件" meta={`${sync.length}`}><Cards items={sync.slice(0, 14).map((s) => ({ title: s.eventType, meta: `${s.status} · retry ${s.retryCount}`, text: `${s.aggregateType}:${s.aggregateId}` }))} /></Panel></div><Panel title="Runtime 健康表" meta={`${runtimes.length}`}><SimpleTable headers={['Runtime','状态','Scope','Path']} rows={runtimes.map((r) => [r.label, r.detected ? '运行中' : '未检测', r.scope, r.defaultTarget ?? r.configDir ?? r.commandPath ?? '-'])} /></Panel></section> }
function InstancesList({ instances, all, query, setQuery, type, setType, status, setStatus, table, setTable, onDetail, onInstall }: { instances: ConsoleInstance[]; all: ConsoleInstance[]; query: string; setQuery: (v: string) => void; type: string; setType: (v: string) => void; status: string; setStatus: (v: string) => void; table: boolean; setTable: (v: boolean) => void; onDetail: () => void; onInstall: () => void }) { return <section className="console-page"><div className="page-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索实例" /><select value={type} onChange={(e) => setType(e.target.value)}><option value="all">全部类型</option>{unique(all.map((i) => i.type)).map((t) => <option key={t} value={t}>{t}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">全部状态</option><option value="running">运行中</option><option value="stopped">已停止</option><option value="warning">告警</option><option value="error">异常</option></select><button onClick={() => setTable(!table)}>{table ? '卡片视图' : '列表视图'}</button><button onClick={onInstall}>+ 添加实例</button><button>批量操作 ▾</button></div>{table ? <SimpleTable headers={['状态','名称','类型','分组','路径']} rows={instances.map((i) => [statusText(i.status), i.name, i.type, i.group, i.path ?? '-'])} /> : <div className="instance-grid">{instances.map((i) => <button key={i.id} className="instance-card" onClick={onDetail}><div><Badge status={i.status} /><strong>{i.name}</strong><span>{i.type} · {i.group}</span><p>{i.description}</p></div><small>{i.path ?? 'local managed'}</small><div className="tag-row">{i.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></button>)}</div>}</section> }
function Groups({ instances }: { instances: ConsoleInstance[] }) { const groups = unique(instances.map((i) => i.group)); return <section className="console-page"><div className="page-actions"><button>新增分组</button><button>编辑</button><button>拖拽排序</button><button>设置标签</button></div><div className="console-grid three">{groups.map((group) => <Panel key={group} title={group} meta={`${instances.filter((i) => i.group === group).length} instances`}><Cards items={instances.filter((i) => i.group === group).map((i) => ({ title: i.name, meta: `${i.type} · ${i.status}`, text: i.description }))} /></Panel>)}</div></section> }
function InstanceDetail({ instance, events, sessions }: { instance?: ConsoleInstance; events: TimelineEvent[]; sessions: SessionEvent[] }) { if (!instance) return <Empty text="暂无实例。" />; return <section className="console-page"><div className="detail-hero"><div><Badge status={instance.status} /><h2>{instance.name}</h2><p>{instance.description}</p><span>{instance.type} · {instance.group}</span></div><div className="page-actions"><button>修复</button><button>重启</button><button>调试</button><button>日志</button></div></div><div className="tab-strip">{['实例概览','对话测试','渠道管理','会话管理','Agent 管理','技能管理','节点管理','用量统计','定时任务','配置管理','调试工具','上下文诊断','实例日志','版本历史'].map((tab, index) => <button key={tab} className={index === 0 ? 'active' : ''}>{tab}</button>)}</div><div className="console-grid two"><Panel title="实例概览" meta={instance.id}><KeyValues rows={[['类型', instance.type], ['分组', instance.group], ['路径', instance.path ?? '-'], ['标签', instance.tags.join(', ') || '-']]} /></Panel><Panel title="上下文诊断" meta="diagnostics"><KeyValues rows={[['会话事件', String(sessions.length)], ['日志事件', String(events.length)], ['Runtime', instance.runtime ?? '-']]} /></Panel></div><Panel title="实例日志" meta="recent"><Timeline events={events} /></Panel></section> }
function InstallWizard(props: { sources: AgentSourceSummary[]; selectedSourceId: string; setSelectedSourceId: (v: string) => void; sourceUrl: string; setSourceUrl: (v: string) => void; sourceName: string; setSourceName: (v: string) => void; sourceBranch: string; setSourceBranch: (v: string) => void; sourceRisk: SourceImportRiskPreview | null; sourceScan: () => void; sourceImport: () => void; sourceRefresh: () => void; agents: LocalAgentSummary[]; selectedAgents: Set<string>; toggleAgent: (id: string) => void; runtimes: RuntimeDetection[]; selectedRuntimes: Set<RuntimeKind>; toggleRuntime: (r: RuntimeKind) => void; projectDir: string; setProjectDir: (v: string) => void; customDir: string; setCustomDir: (v: string) => void; hermesCategories: string; setHermesCategories: (v: string) => void; installPlan: InstallPlan | null; previewBundles: () => void; planInstall: () => void; installSelected: () => void }) { return <section className="console-page"><div className="wizard-steps">{['选择来源','选择智能体','环境检查','配置引导','生成计划','确认部署'].map((s, i) => <span key={s} className={i < 4 ? 'active' : ''}>{i + 1}. {s}</span>)}</div><div className="console-grid two"><Panel title="1. 选择来源" meta={`${props.sources.length} sources`}><div className="form-stack"><input value={props.sourceUrl} onChange={(e) => props.setSourceUrl(e.target.value)} /><input value={props.sourceName} onChange={(e) => props.setSourceName(e.target.value)} /><input value={props.sourceBranch} onChange={(e) => props.setSourceBranch(e.target.value)} placeholder="branch optional" /><select value={props.selectedSourceId} onChange={(e) => props.setSelectedSourceId(e.target.value)}><option value="all">All sources</option>{props.sources.map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}</select><div className="page-actions"><button onClick={props.sourceScan}>风险扫描</button><button onClick={props.sourceImport}>导入来源</button><button onClick={props.sourceRefresh}>刷新</button></div>{props.sourceRisk && <small>{props.sourceRisk.sourceKind} · {props.sourceRisk.riskReport.totalFindings} findings</small>}</div></Panel><Panel title="3. 环境检查" meta={`${props.runtimes.filter((r) => r.detected).length}/${props.runtimes.length}`}><div className="runtime-strip">{props.runtimes.map((r) => <button key={r.kind} className={r.detected ? 'runtime-pill detected' : 'runtime-pill'} onClick={() => props.toggleRuntime(r.kind)}>{props.selectedRuntimes.has(r.kind) ? '✓ ' : ''}{r.label}</button>)}</div></Panel></div><Panel title="2. 选择智能体" meta={`${props.selectedAgents.size}/${props.agents.length}`}><div className="agent-mini-grid">{props.agents.slice(0, 64).map((a) => <button key={a.id} className={props.selectedAgents.has(a.id) ? 'agent-mini selected' : 'agent-mini'} onClick={() => props.toggleAgent(a.id)}><strong>{a.name}</strong><span>{a.sourceName} · {a.category}</span></button>)}</div></Panel><div className="console-grid two"><Panel title="4. 配置引导" meta="paths"><div className="form-stack"><input value={props.projectDir} onChange={(e) => props.setProjectDir(e.target.value)} placeholder="Project directory" /><input value={props.customDir} onChange={(e) => props.setCustomDir(e.target.value)} placeholder="Custom directory" /><input value={props.hermesCategories} onChange={(e) => props.setHermesCategories(e.target.value)} placeholder="Hermes categories" /></div></Panel><Panel title="5/6. 计划与部署" meta={props.installPlan ? `${props.installPlan.totalFiles} files` : 'no plan'}><div className="page-actions"><button onClick={props.previewBundles}>预览 Bundle</button><button onClick={props.planInstall}>生成计划</button><button onClick={props.installSelected}>确认部署</button></div>{props.installPlan && <Cards items={props.installPlan.targets.map((t) => ({ title: String(t.runtime), meta: `${t.scope} · ${t.filesToWrite} files`, text: t.targetDirs.join(', ') }))} />}</Panel></div></section> }
function Market({ catalog, installations, select }: { catalog: BundleCatalogItem[]; installations: AgentInstallation[]; select: (id: string) => void }) { return <section className="console-page"><PageHero title="智能体市场" text="统一展示 PaaS Bundle、Git Source Bundle 与本地 Source Bundle。" /><div className="expert-grid">{catalog.map((b) => <div key={b.bundleId} className="expert-card"><div className="expert-head"><span className="avatar">🤖</span><div><strong>{b.name}</strong><span>{b.origin} · {b.sourceName}</span></div></div><p>{b.description || '可安装到本地 Runtime 的 Agent Bundle。'}</p><div className="tag-row"><span>{b.category}</span><span>{b.targetCount} runtimes</span><span>{installations.some((i) => i.agentId === b.localAgentId) ? 'installed' : 'not installed'}</span></div><div className="card-actions">{b.localAgentId && <button onClick={() => select(b.localAgentId!)}>选择安装</button>}<button>详情</button></div></div>)}</div></section> }
function Teams({ agents, catalog }: { agents: LocalAgentSummary[]; catalog: BundleCatalogItem[] }) { const groups = unique(agents.map((a) => a.category)).slice(0, 12); return <section className="console-page"><div className="page-actions"><button>创建团体</button><button>团体成员</button><button>团体配置</button><button>安装管理</button></div><div className="console-grid three">{groups.map((g) => <Panel key={g} title={`${g} 团体`} meta={`${agents.filter((a) => a.category === g).length} members`}><p>按业务分类组成专家团，可配置成员、协作策略、知识、记忆和 Runtime 安装目标。</p><div className="tag-row"><span>{catalog.filter((b) => b.category === g).length} bundles</span><span>routing policy</span><span>shared memory</span></div></Panel>)}</div></section> }
function Experts(props: { agents: LocalAgentSummary[]; selected: Set<string>; toggle: (id: string) => void; previewRuntime: RuntimeKind; setPreviewRuntime: (v: RuntimeKind) => void; markdown: AgentMarkdownPreview | null; conversion: AgentRuntimeConversionPreview | null; bundlePreview: AgentBundle[]; loadMarkdown: (id: string) => void; loadConversion: (id: string) => void; previewBundles: () => void }) { return <section className="console-page"><div className="page-toolbar"><select value={props.previewRuntime} onChange={(e) => props.setPreviewRuntime(e.target.value as RuntimeKind)}>{runtimeOptions.map((r) => <option key={r} value={r}>{r}</option>)}</select><button onClick={props.previewBundles}>生成 Bundle 预览</button><span>{props.selected.size} selected</span></div><div className="expert-grid">{props.agents.slice(0, 90).map((a, i) => <div key={a.id} className={props.selected.has(a.id) ? 'expert-card selected' : 'expert-card'}><div className="expert-head"><span className="avatar">{['🧠','🧑‍💻','🧑‍🎨','📊','🛡️','🧭'][i % 6]}</span><div><strong>{a.name}</strong><span>{a.sourceName} · {a.category}</span></div><input type="checkbox" checked={props.selected.has(a.id)} onChange={() => props.toggle(a.id)} /></div><p>{a.description || '可预览原始 Markdown，转换成目标 Runtime 格式并安装。'}</p><div className="tag-row"><span>{a.slug}</span><span>{props.previewRuntime}</span></div><div className="card-actions"><button onClick={() => props.loadMarkdown(a.id)}>原文</button><button onClick={() => props.loadConversion(a.id)}>转换</button></div></div>)}</div><div className="console-grid two"><Panel title="原始 Markdown" meta={props.markdown?.name ?? 'none'}><pre className="code-preview">{props.markdown?.rawMarkdown ?? '选择专家查看原文。'}</pre></Panel><Panel title="Runtime 转换预览" meta={props.conversion?.runtime ?? 'none'}><pre className="code-preview">{props.conversion ? JSON.stringify({ files: props.conversion.files, risk: props.conversion.riskReport, warnings: props.conversion.warnings }, null, 2) : '选择专家生成转换预览。'}</pre></Panel></div>{props.bundlePreview.length > 0 && <Panel title="Bundle Preview" meta={`${props.bundlePreview.length}`}><Cards items={props.bundlePreview.map((b) => ({ title: b.profile.name, meta: `${b.bundleId} · ${b.version}`, text: b.targets.join(', ') }))} /></Panel>}</section> }
function Skills({ skills, targets, sources }: { skills: SkillPackage[]; targets: SkillTargetPath[]; sources: MarketplaceSource[] }) { return <section className="console-page"><div className="page-actions"><button>技能市场</button><button>我的技能</button><button>安装</button><button>卸载</button></div><div className="console-grid two"><Panel title="技能来源" meta={`${sources.length}`}><Cards items={sources.map((s) => ({ title: s.label, meta: `${s.kind} · ${s.enabled ? 'enabled' : 'disabled'}`, text: s.description }))} /></Panel><Panel title="目标路径" meta={`${targets.length}`}><Cards items={targets.map((t) => ({ title: String(t.runtime), meta: t.supportsSymlink ? 'symlink/copy' : 'copy', text: t.globalPath ?? t.projectRelativePath ?? '-' }))} /></Panel></div><div className="expert-grid slim-grid">{skills.map((s) => <div key={s.id} className="market-card"><span className="avatar">🧩</span><div><strong>{s.name}</strong><span>{s.source} · {s.syncMode}</span><p>{s.description}</p><div className="tag-row"><span>{s.enabledTargets.length} runtimes</span><span>{s.version ?? 'local'}</span></div></div></div>)}</div></section> }
function Connectors({ servers, api }: { servers: McpServerConfig[]; api: LocalApiSpec | null }) { return <section className="console-page"><div className="page-actions"><button>MCP 市场</button><button>我的 MCP</button><button>MCP 安装</button><button>权限策略</button></div><div className="expert-grid slim-grid">{servers.map((s) => <div key={s.id} className="market-card"><span className="avatar">🔌</span><div><strong>{s.name}</strong><span>{s.transport} · {s.enabled ? 'enabled' : 'disabled'}</span><p>{s.description}</p><div className="tag-row"><span>{s.policy.approvalRequired ? 'approval' : 'auto'}</span><span>{s.policy.network}</span><span>{s.policy.shell}</span></div></div></div>)}</div><Api title="Local MCP / API" api={api} /></section> }
function Tools({ artifacts, text, read }: { artifacts: GeneratedArtifact[]; text: string; read: (path: string) => void }) { return <section className="console-page"><div className="page-actions"><button>工具市场</button><button>我的工具</button><button>工具安装</button><button>风险扫描</button></div><div className="console-grid two"><Panel title="生成产物" meta={`${artifacts.length}`}><div className="compact-list">{artifacts.slice(0, 60).map((a) => <button className="artifact-button" key={a.absolutePath} onClick={() => read(a.absolutePath)}><strong>{a.runtime}</strong><span>{a.relativePath}</span><small>{a.sizeBytes} bytes</small></button>)}</div></Panel><Panel title="工具 / 产物预览" meta="read-only"><pre className="code-preview">{text || '选择生成产物预览。'}</pre></Panel></div></section> }
function AgentKnowledge({ spaces, snapshots, init }: { spaces: KnowledgeSpace[]; snapshots: KnowledgeSnapshot[]; init: () => void }) { return <section className="console-page"><div className="page-actions"><button onClick={init}>知识装载</button><button>Context Pack</button><button>镜像计划</button></div><Docs title="智能体知识" spaces={spaces} snapshots={snapshots} /></section> }
function MemoryList({ items, candidates, approve }: { items: MemoryItem[]; candidates: MemoryCandidate[]; approve: (id: string) => void }) { return <section className="console-page"><div className="console-grid two"><MemoryItems items={items} /><Candidates candidates={candidates} approve={approve} /></div></section> }
function Docs({ title, spaces, snapshots }: { title: string; spaces: KnowledgeSpace[]; snapshots: KnowledgeSnapshot[] }) { return <section className="console-page"><div className="content-cards"><Info title="产品文档" text="Agent Buddy、Agent Bundle、Runtime Adapter、安装向导说明。" /><Info title="使用指南" text="Source 导入、智能体安装、MCP 配置、知识镜像、记忆审批。" /><Info title="最佳实践" text="企业分发、本地同步、风险审查、Handoff 接力。" /></div><div className="console-grid two"><Panel title={`${title} / 知识列表`} meta={`${spaces.length}`}><Cards items={spaces.map((s) => ({ title: s.name, meta: `${s.source} · ${s.syncMode}`, text: s.description }))} /></Panel><Panel title="知识快照" meta={`${snapshots.length}`}><Cards items={snapshots.map((s) => ({ title: s.spaceId, meta: `${s.version} · ${s.status}`, text: s.manifestPath }))} /></Panel></div></section> }
function Support({ title }: { title: string }) { return <section className="console-page"><div className="content-cards"><Info title="常见问题" text="Runtime 未检测、安装冲突、MCP 无法连接、同步失败。" /><Info title="在线支持" text="预留企业支持、诊断包导出、远程协助和工单系统。" /><Info title="反馈建议" text="收集缺失 Runtime、知识命中、技能推荐和安装体验反馈。" /></div><Panel title={title} meta="support"><p>帮助支持页已经作为完整入口保留，后续可接 Agent PaaS 的知识库和在线支持系统。</p></Panel></section> }
function Api({ title, api }: { title: string; api: LocalApiSpec | null }) { return <section className="console-page"><div className="content-cards"><Info title="API 文档" text="Local API、MCP、Memory、Knowledge、Session、Approval。" /><Info title="接口测试" text="后续可在页面内直接测试本地 API 和 MCP endpoint。" /><Info title="错误码说明" text="安装、同步、权限、风险、Runtime Adapter 错误码。" /></div>{api ? <Panel title={title} meta={api.baseUrl}><SimpleTable headers={['Method','Path','Purpose','Audit']} rows={api.routes.map((r) => [r.method, r.path, r.purpose, r.audit ? 'yes' : 'no'])} /></Panel> : <Empty text="Local API spec not loaded." />}</section> }
function MemoryService({ items, candidates, draft, setDraft, writeback, propose, approve }: { items: MemoryItem[]; candidates: MemoryCandidate[]; draft: string; setDraft: (v: string) => void; writeback: MemoryWritebackPlan | null; propose: () => void; approve: (id: string) => void }) { return <section className="console-page"><div className="console-grid two"><Panel title="记忆服务" meta="buddy-memory"><KeyValues rows={[['Provider', 'agent-buddy'], ['Write Policy', 'approval_required'], ['Items', String(items.length)], ['Candidates', String(candidates.length)], ['Conflicts', String(writeback?.conflicts.length ?? 0)]]} /><div className="form-stack"><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="新增记忆候选" /><button onClick={propose}>提出记忆</button></div></Panel><Candidates candidates={candidates} approve={approve} /></div><MemoryItems items={items} /></section> }
function SessionsOverview({ events, handoffs, sync }: { events: SessionEvent[]; handoffs: HandoffPack[]; sync: SessionSyncPlan | null }) { return <section className="console-page"><MetricGrid metrics={{ instances: sync?.sources.length ?? 0, agents: events.length, installed: handoffs.length, activeSessions: unique(events.map((e) => e.sessionId)).length, pendingSync: sync?.paasSyncEnabled ? 1 : 0, risks: sync?.warnings.length ?? 0, healthyInstances: sync?.sources.filter((s) => s.detectedPaths.length > 0).length ?? 0, warningInstances: sync?.warnings.length ?? 0, errorInstances: 0, healthScore: sync ? 80 : 0 }} /><div className="console-grid two"><Panel title="Session Scanner" meta={sync ? `${sync.sources.length}` : 'not loaded'}><Cards items={(sync?.sources ?? []).map((s) => ({ title: s.label, meta: `${s.supportLevel ?? 'unknown'} · ${s.supportsResume ? 'resume' : 'no resume'}`, text: s.defaultPaths.join(', ') }))} /></Panel><Panel title="Handoff Packs" meta={`${handoffs.length}`}><Cards items={handoffs.map((h) => ({ title: h.goal, meta: h.sessionId, text: h.summary }))} /></Panel></div></section> }
function ActiveSessions({ events, sessionId, setSessionId, goal, setGoal, summary, setSummary, handoff }: { events: SessionEvent[]; sessionId: string; setSessionId: (v: string) => void; goal: string; setGoal: (v: string) => void; summary: string; setSummary: (v: string) => void; handoff: () => void }) { return <section className="console-page"><div className="console-grid two"><Panel title="活跃会话" meta={`${unique(events.map((e) => e.sessionId)).length}`}><Cards items={groupSessionEvents(events).map((s) => ({ title: s.id, meta: `${s.count} events`, text: new Date(s.lastAt * 1000).toLocaleString() }))} /></Panel><Panel title="克隆 / Handoff 会话" meta="handoff"><div className="form-stack"><input value={sessionId} onChange={(e) => setSessionId(e.target.value)} /><input value={goal} onChange={(e) => setGoal(e.target.value)} /><input value={summary} onChange={(e) => setSummary(e.target.value)} /><button onClick={handoff}>创建 Handoff Pack</button></div></Panel></div></section> }
function SessionHistory({ events, handoffs }: { events: SessionEvent[]; handoffs: HandoffPack[] }) { return <section className="console-page"><div className="console-grid two"><Panel title="历史会话事件" meta={`${events.length}`}><Timeline events={events.map((e) => ({ id: e.id, title: e.eventType, message: e.payloadJson, level: e.runtime ?? 'session', ts: e.createdAt }))} /></Panel><Panel title="可恢复 Handoff" meta={`${handoffs.length}`}><Cards items={handoffs.map((h) => ({ title: h.goal, meta: h.sessionId, text: h.summary }))} /></Panel></div></section> }
function General({ settings, setSettings, save }: { settings: AgentBuddySettings; setSettings: (s: AgentBuddySettings) => void; save: () => void }) { return <section className="console-page"><Panel title="常规设置" meta={settings.deviceId}><div className="settings-grid"><label>Device ID<input value={settings.deviceId} onChange={(e) => setSettings({ ...settings, deviceId: e.target.value })} /></label><label>PaaS Base URL<input value={settings.paasBaseUrl} onChange={(e) => setSettings({ ...settings, paasBaseUrl: e.target.value })} /></label><label>Generated Retention<input type="number" value={settings.generatedArtifactRetentionDays} onChange={(e) => setSettings({ ...settings, generatedArtifactRetentionDays: Number(e.target.value) })} /></label><label>Backup Retention<input type="number" value={settings.backupRetentionDays} onChange={(e) => setSettings({ ...settings, backupRetentionDays: Number(e.target.value) })} /></label><label>Install Mode<select value={settings.installMode} onChange={(e) => setSettings({ ...settings, installMode: e.target.value as AgentBuddySettings['installMode'] })}><option value="auto">auto</option><option value="copy">copy</option><option value="symlink">symlink</option></select></label><label><input type="checkbox" checked={settings.syncEnabled} onChange={(e) => setSettings({ ...settings, syncEnabled: e.target.checked })} /> Sync Enabled</label><label><input type="checkbox" checked={settings.telemetryEnabled} onChange={(e) => setSettings({ ...settings, telemetryEnabled: e.target.checked })} /> Telemetry Enabled</label></div><button onClick={save}>保存设置</button></Panel></section> }
function Security({ audits }: { audits: AuditEvent[] }) { return <section className="console-page"><div className="content-cards"><Info title="安全策略" text="文件、网络、Shell、外部发布统一走权限策略和审批。" /><Info title="登录限制" text="本地设备绑定、PaaS 会话、SSO 预留。" /><Info title="会话管理" text="会话事件和 Handoff 支持审计回放。" /></div><Panel title="安全审计" meta={`${audits.length}`}><Timeline events={audits.map(auditToTimeline)} /></Panel></section> }
function Notifications() { return <section className="console-page"><div className="content-cards"><Info title="通知渠道" text="桌面通知、Agent PaaS 通知、企业 IM 通道预留。" /><Info title="通知模板" text="风险告警、安装完成、同步失败、审批请求模板。" /><Info title="订阅管理" text="按实例、Runtime、Source、Agent 订阅事件。" /></div><Panel title="通知策略" meta="ready"><Cards items={[{ title: '风险告警', meta: 'security', text: '高风险 MCP / Skill / Source import 触发通知。' }, { title: '安装结果', meta: 'install', text: '安装成功、失败、回滚和备份恢复通知。' }, { title: '同步失败', meta: 'sync', text: 'Sync Outbox 失败和重试超限提醒。' }]} /></Panel></section> }
function Backup({ backups, restore }: { backups: InstallBackup[]; restore: (id: string) => void }) { return <section className="console-page"><div className="page-actions"><button>创建备份任务</button><button>清理过期备份</button></div><Panel title="备份历史" meta={`${backups.length}`}><div className="compact-list">{backups.map((b) => <div className="compact-card" key={b.id}><strong>{b.runtime}</strong><span>{new Date(b.createdAt * 1000).toLocaleString()}</span><small>{b.originalPath}</small><small>{b.backupPath}</small><button onClick={() => restore(b.id)}>还原</button></div>)}</div></Panel></section> }
function Enterprise({ paasInfo, paasStatus, device, pull, sync, flush, buddy, deeplinkUrl, setDeeplinkUrl, deeplink, execute }: { paasInfo: PaasConnectionInfo | null; paasStatus: PaasConnectionStatus | null; device: DeviceRegistrationRequest | null; pull: BundlePullRequest | null; sync: PaasSyncPreview | null; flush: SyncFlushPlan | null; buddy: BuddyStatusReport | null; deeplinkUrl: string; setDeeplinkUrl: (v: string) => void; deeplink: DeepLinkRequest | null; execute: () => void }) { return <section className="console-page"><div className="console-grid two"><Panel title="Agent PaaS 连接" meta={paasStatus?.message ?? 'not configured'}><KeyValues rows={[['Base URL', paasInfo?.baseUrl ?? '-'], ['Device ID', paasInfo?.deviceId ?? '-'], ['Sync', paasInfo?.syncEnabled ? 'enabled' : 'disabled'], ['Telemetry', paasInfo?.telemetryEnabled ? 'enabled' : 'disabled']]} />{device && <pre className="code-preview small">{JSON.stringify(device, null, 2)}</pre>}</Panel><Panel title="Bundle Pull / Sync" meta={sync ? `${sync.pendingEvents} pending` : 'preview'}>{pull && <pre className="code-preview small">{JSON.stringify(pull, null, 2)}</pre>}{flush && <KeyValues rows={[['Flush batch', String(flush.debouncePolicy.maxBatchSize)], ['Debounce', `${flush.debouncePolicy.debounceMs}ms`]]} />}</Panel></div><div className="console-grid two"><Panel title="Deep Link" meta="agentbuddy://"><div className="form-stack"><input value={deeplinkUrl} onChange={(e) => setDeeplinkUrl(e.target.value)} /><button onClick={execute}>Parse / Execute</button></div>{deeplink && <pre className="code-preview small">{JSON.stringify(deeplink, null, 2)}</pre>}</Panel><Panel title="企业管理" meta="PaaS boundary"><p>多租户、RBAC、SSO、License 由 Agent PaaS 负责；Agent Buddy 展示本地设备、连接、同步和策略状态。</p>{buddy && <KeyValues rows={[['Detected runtimes', `${buddy.detectedRuntimeCount}/${buddy.runtimeCount}`], ['Installations', String(buddy.installationCount)], ['Health warning', String(buddy.summary.warning)]]} />}</Panel></div></section> }
function MemoryItems({ items }: { items: MemoryItem[] }) { return <Panel title="记忆列表" meta={`${items.length}`}><Cards items={items.map((i) => ({ title: i.title, meta: `${i.scope} · ${i.memoryType} · ${i.status}`, text: i.content }))} /></Panel> }
function Candidates({ candidates, approve }: { candidates: MemoryCandidate[]; approve: (id: string) => void }) { return <Panel title="记忆候选" meta={`${candidates.length}`}><div className="compact-list">{candidates.map((c) => <div className="compact-card" key={c.id}><strong>{c.memoryType}</strong><span>{c.scope} · {c.status} · {Math.round(c.confidence * 100)}%</span><small>{c.content}</small><button onClick={() => approve(c.id)}>审批通过</button></div>)}</div></Panel> }
function Cards({ items }: { items: { title: string; meta?: string; text?: string }[] }) { return <div className="compact-list">{items.length === 0 ? <Empty text="暂无数据。" /> : items.map((item, index) => <div className="compact-card" key={`${item.title}-${index}`}><strong>{item.title}</strong>{item.meta && <span>{item.meta}</span>}{item.text && <small>{item.text}</small>}</div>)}</div> }
function Info({ title, text }: { title: string; text: string }) { return <div className="info-card"><strong>{title}</strong><p>{text}</p></div> }
function KeyValues({ rows }: { rows: [string, string][] }) { return <div className="compact-list">{rows.map(([label, value]) => <div className="key-value" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> }
function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="table-wrap"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={idx}>{row.map((cell, i) => <td key={`${idx}-${i}`}>{cell}</td>)}</tr>)}</tbody></table></div> }
function Timeline({ events }: { events: TimelineEvent[] }) { return <div className="timeline">{events.length === 0 ? <Empty text="暂无事件。" /> : events.map((e) => <div className="timeline-item" key={e.id}><strong>{e.title}</strong><span>{e.level} · {new Date(e.ts * 1000).toLocaleString()}</span><small>{e.message}</small></div>)}</div> }
function Badge({ status }: { status: InstanceStatus }) { return <span className={`status-badge ${status}`}><i className={`dot ${status}`} />{statusText(status)}</span> }
function Empty({ text }: { text: string }) { return <div className="empty-state">{text}</div> }
function toggleSet<T>(current: Set<T>, value: T): Set<T> { const next = new Set(current); next.has(value) ? next.delete(value) : next.add(value); return next }
function unique<T>(items: T[]): T[] { return Array.from(new Set(items)) }
function statusText(status: InstanceStatus): string { return status === 'running' ? '运行中' : status === 'stopped' ? '已停止' : status === 'warning' ? '告警' : '异常' }
function searchAgents(items: LocalAgentSummary[], keyword: string) { const q = keyword.toLowerCase(); return items.filter((a) => !q || `${a.name} ${a.description} ${a.sourceName} ${a.category} ${a.slug}`.toLowerCase().includes(q)) }
function matchesInstance(item: ConsoleInstance, keyword: string, type: string, status: string) { const q = keyword.toLowerCase(); return (!q || `${item.name} ${item.type} ${item.group} ${item.description} ${item.tags.join(' ')}`.toLowerCase().includes(q)) && (type === 'all' || item.type === type) && (status === 'all' || item.status === status) }
function installToTimeline(e: InstallEvent): TimelineEvent { return { id: e.id, title: e.message, message: e.installationId ?? 'install event', level: e.level, ts: e.createdAt } }
function auditToTimeline(e: AuditEvent): TimelineEvent { return { id: e.id, title: e.action, message: e.message, level: e.severity, ts: e.createdAt } }
function groupSessionEvents(events: SessionEvent[]) { return unique(events.map((e) => e.sessionId)).map((id) => { const scoped = events.filter((e) => e.sessionId === id); return { id, count: scoped.length, lastAt: Math.max(...scoped.map((e) => e.createdAt)) } }).sort((a, b) => b.lastAt - a.lastAt) }
function buildInstances(runtimes: RuntimeDetection[], installations: AgentInstallation[], mcp: McpServerConfig[], spaces: KnowledgeSpace[], memory: MemoryItem[], candidates: MemoryCandidate[], sessions: SessionEvent[], api: LocalApiSpec | null): ConsoleInstance[] { return [
  ...runtimes.map((r) => ({ id: `runtime:${r.kind}`, name: r.label, type: 'runtime' as const, status: r.detected ? 'running' as const : 'stopped' as const, group: 'Runtime', path: r.defaultTarget ?? r.configDir ?? r.commandPath ?? undefined, runtime: r.kind, description: r.notes.join(' ') || 'Runtime adapter detection record.', tags: [r.scope, r.kind] })),
  ...installations.map((i) => ({ id: `agent:${i.id}`, name: i.agentId, type: 'agent' as const, status: i.status === 'installed' ? 'running' as const : 'warning' as const, group: 'Agent Installations', path: i.targetPath, runtime: i.runtime, description: `${i.installedFiles.length} files installed`, tags: [i.runtime, i.scope] })),
  ...mcp.map((s) => ({ id: `mcp:${s.id}`, name: s.name, type: 'mcp' as const, status: s.enabled ? 'running' as const : 'stopped' as const, group: 'MCP Services', path: s.url ?? s.command ?? undefined, description: s.description, tags: [s.transport, s.policy.approvalRequired ? 'approval' : 'auto'] })),
  ...spaces.map((s) => ({ id: `knowledge:${s.id}`, name: s.name, type: 'knowledge' as const, status: 'running' as const, group: 'Knowledge Mirrors', description: s.description, tags: [s.source, s.syncMode] })),
  { id: 'memory:agent-buddy', name: 'Buddy Memory Service', type: 'memory', status: candidates.length > 0 ? 'warning' : 'running', group: 'Memory', description: `${memory.length} memories, ${candidates.length} candidates`, tags: ['provider', 'approval'] },
  { id: 'session:center', name: 'Session Event Center', type: 'session', status: sessions.length > 0 ? 'running' : 'stopped', group: 'Sessions', description: `${sessions.length} events indexed`, tags: ['scanner', 'handoff'] },
  ...(api ? [{ id: 'local-api:buddy', name: 'Local API / MCP Server', type: 'local-api' as const, status: 'running' as const, group: 'Local Services', path: api.baseUrl, description: `${api.routes.length} routes`, tags: ['api', 'mcp'] }] : []),
] }
function buildMetrics(instances: ConsoleInstance[], agents: LocalAgentSummary[], installations: AgentInstallation[], sessions: SessionEvent[], sync: SyncOutboxEvent[], audits: AuditEvent[], doctor: DoctorReport | null) { const healthyInstances = instances.filter((i) => i.status === 'running').length; const warningInstances = instances.filter((i) => i.status === 'warning').length + (doctor?.summary.warning ?? 0); const errorInstances = instances.filter((i) => i.status === 'error').length + (doctor?.summary.error ?? 0); const healthScore = instances.length === 0 ? 0 : Math.max(0, Math.round((healthyInstances / instances.length) * 100 - warningInstances * 2 - errorInstances * 5)); return { instances: instances.length, agents: agents.length, installed: installations.length, activeSessions: unique(sessions.map((e) => e.sessionId)).length, pendingSync: sync.filter((e) => e.status === 'pending' || e.status === 'failed').length, risks: audits.filter((e) => e.severity === 'security' || e.severity === 'error').length + warningInstances + errorInstances, healthyInstances, warningInstances, errorInstances, healthScore } }
