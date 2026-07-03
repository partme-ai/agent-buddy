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

const runtimeOptions: RuntimeKind[] = [
  'claude-code', 'copilot', 'antigravity', 'gemini-cli', 'opencode', 'openclaw', 'cursor', 'trae', 'aider',
  'windsurf', 'qwen', 'codex', 'deerflow', 'workbuddy', 'codewhale', 'hermes', 'kiro', 'qoder',
]

function App() {
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
  const [artifactPreview, setArtifactPreview] = useState<string>('')
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
  const [deeplinkUrl, setDeeplinkUrl] = useState('')
  const [deeplinkResult, setDeeplinkResult] = useState<DeepLinkRequest | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [activeMode, setActiveMode] = useState<'experts' | 'skills' | 'connectors'>('experts')
  const [projectDir, setProjectDir] = useState('')
  const [customDir, setCustomDir] = useState('')
  const [hermesCategories, setHermesCategories] = useState('')
  const [memoryDraft, setMemoryDraft] = useState('')
  const [sessionId, setSessionId] = useState('local-session')
  const [handoffGoal, setHandoffGoal] = useState('Continue current task in another runtime')
  const [handoffSummary, setHandoffSummary] = useState('Summarize what has been done and the next recommended action.')
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [selectedRuntimes, setSelectedRuntimes] = useState<Set<RuntimeKind>>(new Set())
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
    setAgentSources(nextSources); setDefinitions(nextDefinitions); setAgents(nextAgents); setRuntimes(nextRuntimes)
    setInstallations(nextInstallations); setBackups(nextBackups); setEvents(nextEvents); setAuditEvents(nextAuditEvents)
    setSyncOutbox(nextSyncOutbox); setGeneratedArtifacts(nextArtifacts); setMcpServers(nextMcpServers)
    setBuiltInSkills(nextBuiltInSkills); setSkillTargets(nextSkillTargets); setKnowledgeSpaces(nextKnowledgeSpaces)
    setKnowledgeSnapshots(nextKnowledgeSnapshots); setMemoryItems(nextMemoryItems); setMemoryCandidates(nextMemoryCandidates)
    setSessionEvents(nextSessionEvents); setHandoffPacks(nextHandoffPacks); setBundleCatalog(nextBundleCatalog)
  }

  useEffect(() => { reload().catch((error) => setStatus(String(error))) }, [])

  const sourceScopedAgents = useMemo(
    () => selectedSourceId === 'all' ? agents : agents.filter((agent) => agent.sourceId === selectedSourceId),
    [agents, selectedSourceId],
  )
  const categories = useMemo(() => ['all', ...Array.from(new Set(sourceScopedAgents.map((agent) => agent.category))).sort()], [sourceScopedAgents])
  const definitionByRuntime = useMemo(() => new Map(definitions.map((item) => [item.kind, item])), [definitions])
  const filteredAgents = useMemo(() => {
    const normalized = query.toLowerCase()
    return sourceScopedAgents.filter((agent) => {
      const matchesCategory = category === 'all' || agent.category === category
      const matchesQuery = !normalized || `${agent.name} ${agent.description} ${agent.slug} ${agent.sourceName}`.toLowerCase().includes(normalized)
      return matchesCategory && matchesQuery
    })
  }, [sourceScopedAgents, category, query])
  const sourceStats = useMemo(() => ({
    sources: agentSources.length,
    agents: sourceScopedAgents.length,
    categories: new Set(sourceScopedAgents.map((agent) => agent.category)).size,
    runtimes: definitions.length,
    installed: installations.length,
    bundles: bundleCatalog.length,
    pendingSync: syncOutbox.filter((event) => event.status === 'pending').length,
  }), [agentSources, sourceScopedAgents, definitions, installations, bundleCatalog, syncOutbox])

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
  async function handleImportSource() { await withBusy(async () => { const result = await importAgentSource({ sourceUrl, name: sourceName || null, branch: sourceBranch || null, sourceKind: null }); setSelectedSourceId(result.sourceId); setStatus(`Imported ${result.agentCount} agents from ${result.sourceName}.`); setSelectedAgents(new Set()); setPlan(null); await reload(); const detail = await getAgentSourceDetail(result.sourceId); setSourceDetail(detail) }) }
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
  async function handleDoctor() { await withBusy(async () => { const report = await runDoctor(); setDoctor(report); setStatus(`Doctor complete: ${report.summary.ok} ok, ${report.summary.warning} warnings, ${report.summary.error} errors.`) }) }
  async function handleParseDeepLink() { await withBusy(async () => { const parsed = await parseDeepLink(deeplinkUrl); setDeeplinkResult(parsed); if (parsed.action === 'install-source' && (parsed.params.url || parsed.params.repo || parsed.params.source)) { const result = await importAgentSourceFromDeepLink(deeplinkUrl); setSelectedSourceId(result.sourceId); await reload(); setStatus(`Deep link imported ${result.agentCount} agent(s) from ${result.sourceName}.`); return } setStatus(`Parsed deeplink: ${parsed.action}`) }) }
  async function handleReadArtifact(path: string) { await withBusy(async () => { const content = await readGeneratedArtifact(path); setArtifactPreview(content); setStatus(`Loaded generated artifact: ${path}`) }) }
  async function handleInitKnowledge() { await withBusy(async () => { const spaces = await initializeDefaultKnowledgeSpaces(); await reload(); setStatus(`Initialized ${spaces.length} knowledge spaces.`) }) }
  async function handleProposeMemory() { await withBusy(async () => { if (!memoryDraft.trim()) return; await proposeMemory(memoryDraft, 'user' as MemoryScope, 'preference' as MemoryType, sessionId); setMemoryDraft(''); await reload(); setStatus('Memory candidate proposed.') }) }
  async function handleApproveMemory(id: string) { await withBusy(async () => { await approveMemoryCandidate(id, 'Approved memory'); await reload(); setStatus('Memory candidate approved.') }) }
  async function handleCreateHandoff() { await withBusy(async () => { await createHandoffPack(sessionId, null, Array.from(selectedRuntimes)[0] ?? null, handoffGoal, handoffSummary); await reload(); setStatus('Handoff pack created.') }) }

  return <div className="buddy-app-shell">
    <Sidebar stats={sourceStats} />
    <main className="buddy-main">
      <TopBar activeMode={activeMode} busy={busy} query={query} setQuery={setQuery} setActiveMode={setActiveMode} onRefresh={handleRefreshSource} />
      <div className="status-strip"><strong>Agent Buddy</strong><span>{status}</span><strong>{busy ? 'Working' : 'Ready'}</strong></div>
      <ScenarioRail sources={agentSources} runtimes={runtimes} />
      {activeMode === 'experts' && <>
        <SourceConsole sources={agentSources} selectedSourceId={selectedSourceId} sourceUrl={sourceUrl} sourceName={sourceName} sourceBranch={sourceBranch} busy={busy} setSelectedSourceId={setSelectedSourceId} setSourceUrl={setSourceUrl} setSourceName={setSourceName} setSourceBranch={setSourceBranch} onRisk={handlePreviewSourceRisk} onImport={handleImportSource} onDetail={handleSourceDetail} onRefresh={handleRefreshSelectedSource} />
        <section className="inspector-grid"><SourceDetailPanel detail={sourceDetail} risk={sourceRisk} /><BundleCatalogPanel bundles={bundleCatalog} onSelectAgent={(id) => setSelectedAgents(new Set([id]))} /></section>
        <ExpertHub agents={filteredAgents} categories={categories} category={category} selectedAgents={selectedAgents} previewRuntime={previewRuntime} setCategory={setCategory} onToggleAgent={toggleAgent} onSelectShown={() => setSelectedAgents(new Set(filteredAgents.map((agent) => agent.id)))} onClear={() => setSelectedAgents(new Set())} onMarkdown={handleMarkdown} onRuntimePreview={handleRuntimePreview} />
        <section className="inspector-grid"><RuntimePanel runtimes={runtimes} selectedRuntimes={selectedRuntimes} definitionByRuntime={definitionByRuntime} onToggle={toggleRuntime} /><InstallWizard selectedAgents={selectedAgents} selectedRuntimes={selectedRuntimes} projectDir={projectDir} customDir={customDir} hermesCategories={hermesCategories} previewRuntime={previewRuntime} busy={busy} setProjectDir={setProjectDir} setCustomDir={setCustomDir} setHermesCategories={setHermesCategories} setPreviewRuntime={setPreviewRuntime} onBuildBundles={handleBuildBundles} onPlan={handlePlan} onInstall={handleInstall} /></section>
        <section className="inspector-grid"><PreviewPanel markdown={markdownPreview} conversion={conversionPreview} /><DeepLinkPanel url={deeplinkUrl} setUrl={setDeeplinkUrl} result={deeplinkResult} busy={busy} onParse={handleParseDeepLink} /></section>
      </>}
      {activeMode === 'skills' && <section className="inspector-grid"><McpPanel servers={mcpServers} /><SkillPanel skills={builtInSkills} targets={skillTargets} /></section>}
      {activeMode === 'connectors' && <>
        <section className="inspector-grid"><KnowledgeMemoryPanel spaces={knowledgeSpaces} memoryItems={memoryItems} candidates={memoryCandidates} memoryDraft={memoryDraft} setMemoryDraft={setMemoryDraft} onInitKnowledge={handleInitKnowledge} onProposeMemory={handleProposeMemory} onApproveMemory={handleApproveMemory} /><SessionHandoffPanel sessionId={sessionId} setSessionId={setSessionId} handoffGoal={handoffGoal} setHandoffGoal={setHandoffGoal} handoffSummary={handoffSummary} setHandoffSummary={setHandoffSummary} events={sessionEvents} handoffs={handoffPacks} onCreateHandoff={handleCreateHandoff} /></section>
        <section className="inspector-grid"><AuditSyncPanel auditEvents={auditEvents} syncOutbox={syncOutbox} /><GeneratedArtifactsPanel artifacts={generatedArtifacts} preview={artifactPreview} onRead={handleReadArtifact} /></section>
      </>}
      {doctor && <DoctorPanel report={doctor} />}
      {bundles.length > 0 && <BundlePanel bundles={bundles} />}
      {plan && <InstallPlanPanel plan={plan} />}
      <section className="inspector-grid"><InstallationPanel installations={installations} busy={busy} onUninstall={handleUninstall} /><BackupPanel backups={backups} busy={busy} onRestore={handleRestoreBackup} /></section>
      <section className="inspector-grid"><section className="panel"><div className="panel-header"><h2>Recent Events</h2><span>{events.length}</span></div><EventList events={events} /></section><section className="panel"><div className="panel-header"><h2>Knowledge Snapshots</h2><span>{knowledgeSnapshots.length}</span></div><div className="compact-list">{knowledgeSnapshots.slice(0, 20).map((snapshot) => <div key={snapshot.id} className="compact-card"><strong>{snapshot.spaceId}</strong><span>{snapshot.version} · {snapshot.status}</span><small>{snapshot.manifestPath}</small></div>)}</div></section></section>
    </main>
  </div>
}

function Sidebar({ stats }: { stats: { sources: number; agents: number; categories: number; runtimes: number; installed: number; bundles: number; pendingSync: number } }) { return <aside className="buddy-sidebar"><div className="window-dots"><span /><span /><span /></div><div className="brand-block"><div className="brand-mark">AB</div><div><strong>Agent Buddy</strong><span>Local Edge v0.1</span></div></div><nav className="sidebar-nav"><a className="active">专家 <span>{stats.agents}</span></a><a>技能 <span>{stats.bundles}</span></a><a>连接器 <span>{stats.pendingSync}</span></a><a>自动化 <span>{stats.installed}</span></a><a>更多 <span>{stats.runtimes}</span></a></nav><div className="sidebar-section"><strong>空间</strong><span>Agent Sources：{stats.sources}</span><span>Categories：{stats.categories}</span><span>Runtime Adapters：{stats.runtimes}</span></div><div className="sidebar-section"><strong>项目</strong><span>Agent PaaS</span><span>Agent Buddy</span><span>Agent SaaS</span></div><div className="sidebar-footer"><div className="user-avatar">人</div><span>人生丰满</span></div></aside> }
function TopBar(props: { activeMode: 'experts' | 'skills' | 'connectors'; busy: boolean; query: string; setQuery: (value: string) => void; setActiveMode: (value: 'experts' | 'skills' | 'connectors') => void; onRefresh: () => void }) { return <div className="buddy-topbar"><div className="buddy-tabs"><button className={`buddy-tab ${props.activeMode === 'experts' ? 'active' : ''}`} onClick={() => props.setActiveMode('experts')}>专家</button><button className={`buddy-tab ${props.activeMode === 'skills' ? 'active' : ''}`} onClick={() => props.setActiveMode('skills')}>技能</button><button className={`buddy-tab ${props.activeMode === 'connectors' ? 'active' : ''}`} onClick={() => props.setActiveMode('connectors')}>连接器</button></div><div className="topbar-actions"><input className="buddy-search" value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="搜索专家职能或描述" /><button className="secondary-button" disabled={props.busy} onClick={props.onRefresh}>我的专家</button></div></div> }
function ScenarioRail({ sources, runtimes }: { sources: AgentSourceSummary[]; runtimes: RuntimeDetection[] }) { const detected = runtimes.filter((runtime) => runtime.detected).length; return <section className="content-section"><div className="section-title"><h2>精选场景</h2><span>{sources.length} sources · {detected}/{runtimes.length} runtimes detected</span></div><div className="scenario-rail"><ScenarioCard tone="blue" title="内容创作" people={["Agent Source 导入", "原始 Markdown 预览", "Runtime 转换预览"]} /><ScenarioCard tone="green" title="本地安装" people={["Install Plan", "备份 / 回滚", "18 Runtime 支持"]} /><ScenarioCard tone="amber" title="安全治理" people={["风险扫描", "License / Notice", "审批与审计"]} /><ScenarioCard tone="violet" title="状态中枢" people={["Memory Center", "Knowledge Mirror", "Session Handoff"]} /><ScenarioCard tone="slate" title="PaaS 联通" people={["Agent Bundle", "Sync Outbox", "Deep Link"]} /></div></section> }
function ScenarioCard({ tone, title, people }: { tone: string; title: string; people: string[] }) { return <div className={`scenario-card ${tone}`}><div><strong>{title}</strong><p>将智能体源统一管理，并安装到本地工具。</p></div><div className="scenario-people">{people.map((item, index) => <span key={item}><i className="avatar">{['🧠','🔧','🔒','📦'][index] ?? '✨'}</i>{item}</span>)}</div></div> }
function SourceConsole(props: { sources: AgentSourceSummary[]; selectedSourceId: string; sourceUrl: string; sourceName: string; sourceBranch: string; busy: boolean; setSelectedSourceId: (value: string) => void; setSourceUrl: (value: string) => void; setSourceName: (value: string) => void; setSourceBranch: (value: string) => void; onRisk: () => void; onImport: () => void; onDetail: () => void; onRefresh: () => void }) { return <section className="source-console"><div className="mini-panel"><div className="panel-header"><h2>Agent Sources</h2><span>{props.sources.length} sources</span></div><div className="form-grid"><input value={props.sourceUrl} onChange={(event) => props.setSourceUrl(event.target.value)} placeholder="https://github.com/jnMetaCode/agency-agents-zh or /local/path" /><input value={props.sourceName} onChange={(event) => props.setSourceName(event.target.value)} placeholder="source name" /><input value={props.sourceBranch} onChange={(event) => props.setSourceBranch(event.target.value)} placeholder="branch optional" /></div><div className="actions"><button disabled={props.busy || !props.sourceUrl} onClick={props.onRisk}>Source Risk Scan</button><button disabled={props.busy || !props.sourceUrl} onClick={props.onImport}>Import Source</button><button className="secondary-button" disabled={props.busy} onClick={props.onRefresh}>Refresh</button></div></div><div className="mini-panel"><div className="panel-header"><h2>Source Scope</h2><span>{props.selectedSourceId}</span></div><div className="actions"><select value={props.selectedSourceId} onChange={(event) => props.setSelectedSourceId(event.target.value)}><option value="all">All sources</option>{props.sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select><button className="secondary-button" disabled={props.busy || props.selectedSourceId === 'all'} onClick={props.onDetail}>Open Detail</button></div><div className="compact-list">{props.sources.slice(0, 5).map((source) => <div key={source.id} className="compact-card"><strong>{source.name}</strong><span>{source.sourceKind} · {source.agentCount} agents · {source.runtimeCount} runtimes</span><small>{source.sourceUrl}</small></div>)}</div></div></section> }
function SourceDetailPanel({ detail, risk }: { detail: AgentSourceDetail | null; risk: SourceImportRiskPreview | null }) { return <section className="panel"><div className="panel-header"><h2>Source Detail</h2><span>{detail ? detail.source.name : 'not selected'}</span></div>{risk && <div className="notice-box"><strong>Import Risk Preview</strong><span>{risk.sourceKind} · {risk.riskReport.totalFindings} finding(s)</span>{risk.warnings.map((warning) => <small key={warning}>{warning}</small>)}</div>}{detail ? <div className="detail-stack"><strong>{detail.source.name}</strong><span>{detail.source.agentCount} agents · {detail.categories.length} categories · {detail.source.runtimeCount} runtimes</span><small>{detail.source.sourceUrl}</small><small>{detail.licenseNotice.noticeText}</small><span>Risk findings: {detail.riskReport.totalFindings}</span><pre className="json-preview">{detail.licenseNotice.licenseTextPreview || 'No license text preview found.'}</pre></div> : <p className="muted">打开 Source Detail 后，可查看 license / notice、风险扫描、分类与智能体列表。</p>}</section> }
function BundleCatalogPanel({ bundles, onSelectAgent }: { bundles: BundleCatalogItem[]; onSelectAgent: (id: string) => void }) { return <section className="panel"><div className="panel-header"><h2>Unified Bundle Catalog</h2><span>{bundles.length}</span></div><div className="compact-list">{bundles.slice(0, 16).map((bundle) => <div key={bundle.bundleId} className="compact-card"><strong>{bundle.name}</strong><span>{bundle.origin} · {bundle.sourceName} · {bundle.targetCount} targets</span><small>{bundle.bundleId}</small>{bundle.localAgentId && <button onClick={() => onSelectAgent(bundle.localAgentId!)}>Select</button>}</div>)}</div></section> }
function ExpertHub(props: { agents: LocalAgentSummary[]; categories: string[]; category: string; selectedAgents: Set<string>; previewRuntime: RuntimeKind; setCategory: (value: string) => void; onToggleAgent: (id: string) => void; onSelectShown: () => void; onClear: () => void; onMarkdown: (id: string) => void; onRuntimePreview: (id: string) => void }) { return <section className="content-section"><div className="expert-toolbar"><div className="expert-tabs"><button className="text-tab active">专家</button><button className="text-tab">专家团</button></div><div className="chip-row">{props.categories.slice(0, 12).map((cat) => <button key={cat} className={`chip ${props.category === cat ? 'active' : ''}`} onClick={() => props.setCategory(cat)}>{cat === 'all' ? '全部' : cat}</button>)}</div><div className="sort-toggle"><button className="secondary-button" onClick={props.onSelectShown}>选择当前</button><button className="secondary-button" onClick={props.onClear}>清空</button></div></div><div className="expert-grid">{props.agents.slice(0, 40).map((agent, index) => <div key={agent.id} className={`expert-card ${props.selectedAgents.has(agent.id) ? 'selected' : ''}`}><div className="expert-head"><span className="avatar">{['🐣','🧑‍💻','🧑‍🎨','📊','🧭','🛡️'][index % 6]}</span><div><strong>{agent.name || agent.slug}</strong><span>{agent.sourceName} · {agent.category}</span></div><input type="checkbox" checked={props.selectedAgents.has(agent.id)} onChange={() => props.onToggleAgent(agent.id)} /></div><p>{agent.description || '本地导入智能体，可预览、转换并安装到 Runtime。'}</p><div className="tag-row"><span>{props.previewRuntime}</span><span>{agent.slug}</span></div><div className="card-actions"><button onClick={() => props.onMarkdown(agent.id)}>原文</button><button onClick={() => props.onRuntimePreview(agent.id)}>转换</button></div></div>)}</div></section> }
function RuntimePanel({ runtimes, selectedRuntimes, definitionByRuntime, onToggle }: { runtimes: RuntimeDetection[]; selectedRuntimes: Set<RuntimeKind>; definitionByRuntime: Map<RuntimeKind, RuntimeDefinition>; onToggle: (kind: RuntimeKind) => void }) { return <section className="panel"><div className="panel-header"><h2>Runtime Registry</h2><span>{runtimes.length} runtimes</span></div><div className="runtime-list">{runtimes.map((runtime) => { const definition = definitionByRuntime.get(runtime.kind); return <label key={runtime.kind} className={`runtime-card ${runtime.detected ? 'detected' : ''}`}><input checked={selectedRuntimes.has(runtime.kind)} onChange={() => onToggle(runtime.kind)} type="checkbox" /><div><strong>{runtime.label}</strong><span>{runtime.scope} · {runtime.detected ? 'detected' : 'not detected'}{definition?.supportsNativeRegistration ? ' · native registration' : ''}</span><small>{runtime.defaultTarget ?? runtime.configDir ?? 'manual path may be required'}</small></div></label> })}</div></section> }
function InstallWizard(props: { selectedAgents: Set<string>; selectedRuntimes: Set<RuntimeKind>; projectDir: string; customDir: string; hermesCategories: string; previewRuntime: RuntimeKind; busy: boolean; setProjectDir: (v: string) => void; setCustomDir: (v: string) => void; setHermesCategories: (v: string) => void; setPreviewRuntime: (v: RuntimeKind) => void; onBuildBundles: () => void; onPlan: () => void; onInstall: () => void }) { return <section className="panel"><div className="panel-header"><h2>Install Wizard</h2><span>{props.selectedAgents.size} agents · {props.selectedRuntimes.size} runtimes</span></div><div className="form-grid"><input value={props.projectDir} onChange={(event) => props.setProjectDir(event.target.value)} placeholder="project directory" /><input value={props.customDir} onChange={(event) => props.setCustomDir(event.target.value)} placeholder="custom directory" /><input value={props.hermesCategories} onChange={(event) => props.setHermesCategories(event.target.value)} placeholder="Hermes categories" /></div><div className="actions"><select value={props.previewRuntime} onChange={(event) => props.setPreviewRuntime(event.target.value as RuntimeKind)}>{runtimeOptions.map((runtime) => <option key={runtime} value={runtime}>{runtime}</option>)}</select><button disabled={props.busy || props.selectedAgents.size === 0} onClick={props.onBuildBundles}>Preview Bundles</button><button disabled={props.busy || props.selectedRuntimes.size === 0} onClick={props.onPlan}>Generate Plan</button><button disabled={props.busy || props.selectedRuntimes.size === 0} onClick={props.onInstall}>Install</button></div></section> }
function PreviewPanel({ markdown, conversion }: { markdown: AgentMarkdownPreview | null; conversion: AgentRuntimeConversionPreview | null }) { return <section className="panel"><div className="panel-header"><h2>Agent Preview</h2><span>{conversion ? conversion.runtime : markdown ? markdown.name : 'none'}</span></div><div className="artifact-layout"><pre className="artifact-preview">{markdown ? markdown.rawMarkdown : 'Select 原文 on an agent.'}</pre><pre className="artifact-preview">{conversion ? JSON.stringify({ files: conversion.files, risk: conversion.riskReport, warnings: conversion.warnings }, null, 2) : 'Select 转换 on an agent.'}</pre></div></section> }
function DeepLinkPanel({ url, setUrl, result, busy, onParse }: { url: string; setUrl: (value: string) => void; result: DeepLinkRequest | null; busy: boolean; onParse: () => void }) { return <section className="panel"><div className="panel-header"><h2>Deep Link</h2><span>agentbuddy://</span></div><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="agentbuddy://install-source?url=https%3A%2F%2Fgithub.com%2FjnMetaCode%2Fagency-agents-zh" /><div className="actions"><button disabled={busy || !url} onClick={onParse}>Parse / Execute</button></div>{result && <pre className="json-preview">{JSON.stringify(result, null, 2)}</pre>}</section> }
function InstallPlanPanel({ plan }: { plan: InstallPlan }) { return <section className="panel plan-panel"><div className="panel-header"><h2>Install Plan</h2><span>{plan.totalAgents} agents · {plan.totalFiles} files</span></div><div className="plan-grid">{plan.targets.map((target) => <div key={target.runtime} className="plan-card"><strong>{target.runtime}</strong><span>{target.scope}</span><small>{target.filesToWrite} files · {target.agentsToInstall} agents</small>{target.targetDirs.map((dir) => <code key={dir}>{dir}</code>)}</div>)}</div></section> }
function DoctorPanel({ report }: { report: DoctorReport }) { return <section className="panel doctor-panel"><div className="panel-header"><h2>Agent Doctor</h2><span>{report.summary.ok} ok · {report.summary.warning} warnings · {report.summary.error} errors</span></div><div className="doctor-list">{report.checks.map((check) => <div key={check.id} className={`doctor-card ${check.status}`}><strong>{check.label}</strong><span>{check.status}</span><small>{check.message}</small></div>)}</div></section> }
function BundlePanel({ bundles }: { bundles: AgentBundle[] }) { return <section className="panel"><div className="panel-header"><h2>Agent Bundle Preview</h2><span>{bundles.length}</span></div><div className="bundle-list">{bundles.slice(0, 8).map((bundle) => <div key={bundle.bundleId} className="bundle-card"><strong>{bundle.profile.name}</strong><span>{bundle.bundleId} · {bundle.version}</span><small>{bundle.profile.description}</small><code>{bundle.targets.join(', ')}</code></div>)}</div></section> }
function McpPanel({ servers }: { servers: McpServerConfig[] }) { return <section className="panel"><div className="panel-header"><h2>Buddy MCP Registry</h2><span>{servers.length}</span></div><div className="expert-grid slim-grid">{servers.map((server) => <div key={server.id} className="market-card"><span className="avatar">🔌</span><div><strong>{server.name}</strong><span>{server.transport} · {server.enabled ? 'enabled' : 'disabled'}</span><p>{server.description}</p><div className="tag-row"><span>{server.policy.approvalRequired ? 'approval' : 'auto'}</span><span>{server.policy.network}</span></div></div></div>)}</div></section> }
function SkillPanel({ skills, targets }: { skills: SkillPackage[]; targets: SkillTargetPath[] }) { return <section className="panel"><div className="panel-header"><h2>Buddy Skills</h2><span>{skills.length} skills · {targets.length} targets</span></div><div className="expert-grid slim-grid">{skills.map((skill) => <div key={skill.id} className="market-card"><span className="avatar">🧩</span><div><strong>{skill.name}</strong><span>{skill.source} · {skill.syncMode}</span><p>{skill.description}</p><div className="tag-row"><span>{skill.enabledTargets.length} runtimes</span><span>{skill.version ?? 'local'}</span></div></div></div>)}</div></section> }
function KnowledgeMemoryPanel(props: { spaces: KnowledgeSpace[]; memoryItems: MemoryItem[]; candidates: MemoryCandidate[]; memoryDraft: string; setMemoryDraft: (value: string) => void; onInitKnowledge: () => void; onProposeMemory: () => void; onApproveMemory: (id: string) => void }) { return <section className="panel"><div className="panel-header"><h2>Knowledge / Memory</h2><span>{props.spaces.length} spaces · {props.memoryItems.length} memories</span></div><div className="actions"><button onClick={props.onInitKnowledge}>Init Knowledge</button></div><input value={props.memoryDraft} onChange={(event) => props.setMemoryDraft(event.target.value)} placeholder="Memory candidate" /><div className="actions"><button onClick={props.onProposeMemory}>Propose Memory</button></div><div className="compact-list">{props.candidates.slice(0, 6).map((candidate) => <div key={candidate.id} className="compact-card"><strong>{candidate.memoryType}</strong><span>{candidate.scope} · {candidate.status}</span><small>{candidate.content}</small><button onClick={() => props.onApproveMemory(candidate.id)}>Approve</button></div>)}</div></section> }
function SessionHandoffPanel(props: { sessionId: string; setSessionId: (value: string) => void; handoffGoal: string; setHandoffGoal: (value: string) => void; handoffSummary: string; setHandoffSummary: (value: string) => void; events: SessionEvent[]; handoffs: HandoffPack[]; onCreateHandoff: () => void }) { return <section className="panel"><div className="panel-header"><h2>Session / Handoff</h2><span>{props.events.length} events · {props.handoffs.length} handoffs</span></div><div className="form-grid"><input value={props.sessionId} onChange={(event) => props.setSessionId(event.target.value)} /><input value={props.handoffGoal} onChange={(event) => props.setHandoffGoal(event.target.value)} /><input value={props.handoffSummary} onChange={(event) => props.setHandoffSummary(event.target.value)} /></div><button onClick={props.onCreateHandoff}>Create Handoff</button><div className="compact-list">{props.handoffs.slice(0, 6).map((handoff) => <div key={handoff.id} className="compact-card"><strong>{handoff.goal}</strong><span>{handoff.sessionId}</span><small>{handoff.summary}</small></div>)}</div></section> }
function EventList({ events }: { events: InstallEvent[] }) { return <div className="event-list">{events.slice(0, 12).map((event) => <div key={event.id} className={`event-card ${event.level}`}><strong>{event.level}</strong><span>{event.runtime ?? 'system'} · {new Date(event.createdAt * 1000).toLocaleString()}</span><small>{event.message}</small></div>)}</div> }
function InstallationPanel({ installations, busy, onUninstall }: { installations: AgentInstallation[]; busy: boolean; onUninstall: (id: string) => void }) { return <section className="panel"><div className="panel-header"><h2>Installations</h2><span>{installations.length}</span></div><div className="install-list">{installations.map((installation) => <div key={installation.id} className="install-card"><div><strong>{installation.runtime}</strong><span>{installation.agentId}</span><small>{installation.targetPath}</small></div><button disabled={busy} onClick={() => onUninstall(installation.id)}>Uninstall</button></div>)}</div></section> }
function BackupPanel({ backups, busy, onRestore }: { backups: InstallBackup[]; busy: boolean; onRestore: (id: string) => void }) { return <section className="panel"><div className="panel-header"><h2>Backups</h2><span>{backups.length}</span></div><div className="install-list">{backups.slice(0, 20).map((backup) => <div key={backup.id} className="install-card"><div><strong>{backup.runtime}</strong><span>{new Date(backup.createdAt * 1000).toLocaleString()}</span><small>{backup.originalPath}</small></div><button disabled={busy} onClick={() => onRestore(backup.id)}>Restore</button></div>)}</div></section> }
function GeneratedArtifactsPanel({ artifacts, preview, onRead }: { artifacts: GeneratedArtifact[]; preview: string; onRead: (path: string) => void }) { return <section className="panel"><div className="panel-header"><h2>Generated Artifacts</h2><span>{artifacts.length}</span></div><div className="artifact-layout"><div className="compact-list">{artifacts.slice(0, 30).map((artifact) => <button key={artifact.absolutePath} className="artifact-button" onClick={() => onRead(artifact.absolutePath)}><strong>{artifact.runtime}</strong><span>{artifact.relativePath}</span><small>{artifact.sizeBytes} bytes</small></button>)}</div><pre className="artifact-preview">{preview || 'Select a generated artifact to preview it.'}</pre></div></section> }
function AuditSyncPanel({ auditEvents, syncOutbox }: { auditEvents: AuditEvent[]; syncOutbox: SyncOutboxEvent[] }) { return <section className="panel"><div className="panel-header"><h2>Audit / Sync</h2><span>{auditEvents.length} audit · {syncOutbox.length} sync</span></div><div className="audit-sync-grid"><div>{auditEvents.slice(0, 10).map((event) => <div key={event.id} className={`event-card ${event.severity}`}><strong>{event.action}</strong><span>{event.severity}</span><small>{event.message}</small></div>)}</div><div>{syncOutbox.slice(0, 10).map((event) => <div key={event.id} className={`event-card ${event.status}`}><strong>{event.eventType}</strong><span>{event.status} · retry {event.retryCount}</span><small>{event.aggregateType}:{event.aggregateId}</small></div>)}</div></div></section> }
function toggleSet<T>(current: Set<T>, value: T): Set<T> { const next = new Set(current); next.has(value) ? next.delete(value) : next.add(value); return next }
export default App
