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

const ALL_RUNTIMES: RuntimeKind[] = ['claude-code','copilot','antigravity','gemini-cli','opencode','openclaw','cursor','trae','aider','windsurf','qwen','codex','deerflow','workbuddy','codewhale','hermes','kiro','qoder']
const DEFAULT_SOURCE_URL = 'https://github.com/jnMetaCode/agency-agents-zh'
const DEFAULT_SOURCE_NAME = 'agency-agents-zh'

function App() {
  const [agentSources, setAgentSources] = useState<AgentSourceSummary[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState('all')
  const [sourceUrl, setSourceUrl] = useState(DEFAULT_SOURCE_URL)
  const [sourceName, setSourceName] = useState(DEFAULT_SOURCE_NAME)
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
  const [projectDir, setProjectDir] = useState('')
  const [customDir, setCustomDir] = useState('')
  const [hermesCategories, setHermesCategories] = useState('')
  const [memoryDraft, setMemoryDraft] = useState('')
  const [sessionId, setSessionId] = useState('local-session')
  const [handoffGoal, setHandoffGoal] = useState('Continue current task in another runtime')
  const [handoffSummary, setHandoffSummary] = useState('Summarize what has been done and the next recommended action.')
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [selectedRuntimes, setSelectedRuntimes] = useState<Set<RuntimeKind>>(new Set())
  const [activeTab, setActiveTab] = useState<'experts' | 'skills' | 'connectors'>('experts')
  const [status, setStatus] = useState('Ready')
  const [busy, setBusy] = useState(false)

  async function reload() {
    const [nextSources, nextDefinitions, nextAgents, nextRuntimes, nextInstallations, nextBackups, nextEvents, nextAuditEvents, nextSyncOutbox, nextArtifacts, nextMcpServers, nextBuiltInSkills, nextSkillTargets, nextKnowledgeSpaces, nextKnowledgeSnapshots, nextMemoryItems, nextMemoryCandidates, nextSessionEvents, nextHandoffPacks, nextBundleCatalog] = await Promise.all([
      listAgentSources(), runtimeDefinitions(), listAgents(), detectRuntimes(), listInstallations(), listInstallBackups(), listInstallEvents(), listAuditEvents(), listSyncOutbox(), listGeneratedArtifacts(), listDefaultMcpServers(), listBuiltInSkills(), listSkillTargets(), listKnowledgeSpaces(), listKnowledgeSnapshots(), listMemoryItems(), listMemoryCandidates(), listSessionEvents(), listHandoffPacks(), listBundleCatalog(),
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

  const sourceScopedAgents = useMemo(() => selectedSourceId === 'all' ? agents : agents.filter((agent) => agent.sourceId === selectedSourceId), [agents, selectedSourceId])
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
  const categoryStats = useMemo(() => new Set(sourceScopedAgents.map((agent) => agent.category)).size, [sourceScopedAgents])
  const detectedCount = useMemo(() => runtimes.filter((runtime) => runtime.detected).length, [runtimes])
  const pendingSyncCount = useMemo(() => syncOutbox.filter((event) => event.status === 'pending').length, [syncOutbox])
  const visibleCards = activeTab === 'experts' ? filteredAgents : []

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
  async function handleImportSource() { await withBusy(async () => { const result = await importAgentSource({ sourceUrl, name: sourceName || null, branch: sourceBranch || null, sourceKind: null }); setSelectedSourceId(result.sourceId); setStatus(`Imported ${result.agentCount} agents from ${result.sourceName}.`); setSelectedAgents(new Set()); setPlan(null); await reload(); await handleSourceDetail(result.sourceId) }) }
  async function handlePreviewSourceRisk() { await withBusy(async () => { const result = await previewSourceImportRisk({ sourceUrl, name: sourceName || null, branch: sourceBranch || null, sourceKind: null }); setSourceRisk(result); setStatus(`Source import risk preview: ${result.riskReport.totalFindings} finding(s).`) }) }
  async function handleRefreshSelectedSource() { await withBusy(async () => { if (selectedSourceId === 'all') { await handleRefreshSource(); return } const result = await refreshAgentSourceById(selectedSourceId); setStatus(result.message); setPlan(null); await reload(); await handleSourceDetail(selectedSourceId) }) }
  async function handleSourceDetail(id = selectedSourceId) { if (id === 'all') return; const detail = await getAgentSourceDetail(id); setSourceDetail(detail) }
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

  return (
    <div className="buddy-app-shell">
      <Sidebar sources={agentSources} installations={installations.length} pendingSync={pendingSyncCount} />
      <main className="buddy-main">
        <header className="buddy-topbar">
          <nav className="buddy-tabs" aria-label="Agent Buddy sections">
            <button className={`buddy-tab ${activeTab === 'experts' ? 'active' : ''}`} onClick={() => setActiveTab('experts')}>专家</button>
            <button className={`buddy-tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>技能</button>
            <button className={`buddy-tab ${activeTab === 'connectors' ? 'active' : ''}`} onClick={() => setActiveTab('connectors')}>连接器</button>
          </nav>
          <div className="topbar-actions">
            <input className="buddy-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索专家职称或描述" />
            <button className="secondary-button" onClick={handleBuildBundles} disabled={busy || selectedAgents.size === 0}>我的专家</button>
          </div>
        </header>

        <section className="status-strip"><span>{status}</span><strong>{agentSources.length} Sources</strong><strong>{sourceScopedAgents.length} Agents</strong><strong>{detectedCount}/{runtimes.length} Runtimes</strong></section>

        <section className="content-section">
          <div className="section-title"><h2>精选场景</h2><span>Agent Source → Bundle → Runtime</span></div>
          <div className="scenario-rail">
            <ScenarioCard title="内容创作" subtitle="导入 agency-agents-zh 并安装内容专家" people={["内容创作专家团", "小红书运营专家", "长文档写作专家"]} tone="blue" />
            <ScenarioCard title="投资分析" subtitle="金融、数据、研究类专家组合" people={["股票研究专家", "数据分析报告师", "深度研究团队"]} tone="green" />
            <ScenarioCard title="法律咨询" subtitle="适合合规、合同、法务场景" people={["法律检索专家", "资深合同法务专家", "财税合规专家"]} tone="amber" />
            <ScenarioCard title="小微企业" subtitle="销售、创业、公众号运营" people={["销售教练", "创业伙伴", "微信公众号运营专家"]} tone="violet" />
            <ScenarioCard title="本地运行时" subtitle="Claude Code / Codex / OpenClaw / WorkBuddy" people={["Runtime Detector", "Install Plan", "Handoff Pack"]} tone="slate" />
          </div>
        </section>

        <section className="source-console">
          <SourcePanel sources={agentSources} selectedSourceId={selectedSourceId} sourceUrl={sourceUrl} sourceName={sourceName} sourceBranch={sourceBranch} busy={busy} setSelectedSourceId={setSelectedSourceId} setSourceUrl={setSourceUrl} setSourceName={setSourceName} setSourceBranch={setSourceBranch} onImport={handleImportSource} onRefresh={handleRefreshSelectedSource} onRisk={handlePreviewSourceRisk} onDetail={() => withBusy(() => handleSourceDetail())} />
          <SourceDetailPanel detail={sourceDetail} risk={sourceRisk} />
        </section>

        {activeTab === 'experts' && <>
          <section className="expert-toolbar">
            <div className="expert-tabs"><button className="text-tab active">专家</button><button className="text-tab">专家团</button></div>
            <div className="chip-row"><button className={`chip ${category === 'all' ? 'active' : ''}`} onClick={() => setCategory('all')}>全部</button>{categories.filter((item) => item !== 'all').slice(0, 14).map((item) => <button className={`chip ${category === item ? 'active' : ''}`} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>
            <div className="sort-toggle"><button className="chip active">最热</button><button className="chip">最新</button></div>
          </section>
          <section className="expert-grid">
            {visibleCards.map((agent, index) => <ExpertCard key={agent.id} agent={agent} index={index} selected={selectedAgents.has(agent.id)} onToggle={() => toggleAgent(agent.id)} onMarkdown={() => handleMarkdown(agent.id)} onPreview={() => handleRuntimePreview(agent.id)} />)}
          </section>
        </>}

        {activeTab === 'skills' && <section className="expert-grid slim-grid">{builtInSkills.map((skill) => <div key={skill.id} className="market-card"><Avatar seed={skill.id} /><div><strong>{skill.name}</strong><span>{skill.source} · {skill.syncMode}</span><p>{skill.description}</p><div className="tag-row">{skill.enabledTargets.slice(0, 5).map((target) => <span key={target}>{target}</span>)}</div></div></div>)}</section>}
        {activeTab === 'connectors' && <section className="expert-grid slim-grid">{mcpServers.map((server) => <div key={server.id} className="market-card"><Avatar seed={server.id} /><div><strong>{server.name}</strong><span>{server.transport} · {server.enabled ? 'enabled' : 'disabled'}</span><p>{server.description}</p><div className="tag-row"><span>{server.policy.approvalRequired ? 'approval' : 'auto'}</span><span>{server.managedBy}</span></div></div></div>)}</section>}

        <section className="inspector-grid">
          <InstallWizard selectedAgents={selectedAgents} selectedRuntimes={selectedRuntimes} projectDir={projectDir} customDir={customDir} hermesCategories={hermesCategories} previewRuntime={previewRuntime} busy={busy} setProjectDir={setProjectDir} setCustomDir={setCustomDir} setHermesCategories={setHermesCategories} setPreviewRuntime={setPreviewRuntime} onBuildBundles={handleBuildBundles} onPlan={handlePlan} onInstall={handleInstall} />
          <RuntimePanel runtimes={runtimes} selectedRuntimes={selectedRuntimes} definitionByRuntime={definitionByRuntime} onToggle={toggleRuntime} />
        </section>

        {doctor && <DoctorPanel report={doctor} />}{bundles.length > 0 && <BundlePanel bundles={bundles} />}{plan && <InstallPlanPanel plan={plan} />}
        <section className="inspector-grid"><PreviewPanel markdown={markdownPreview} conversion={conversionPreview} /><BundleCatalogPanel bundles={bundleCatalog} onSelectAgent={(id) => setSelectedAgents(new Set([id]))} /></section>
        <section className="inspector-grid"><KnowledgeMemoryPanel spaces={knowledgeSpaces} snapshots={knowledgeSnapshots} memoryItems={memoryItems} candidates={memoryCandidates} memoryDraft={memoryDraft} setMemoryDraft={setMemoryDraft} onInitKnowledge={handleInitKnowledge} onProposeMemory={handleProposeMemory} onApproveMemory={handleApproveMemory} /><SessionHandoffPanel sessionId={sessionId} setSessionId={setSessionId} handoffGoal={handoffGoal} setHandoffGoal={setHandoffGoal} handoffSummary={handoffSummary} setHandoffSummary={setHandoffSummary} events={sessionEvents} handoffs={handoffPacks} onCreateHandoff={handleCreateHandoff} /></section>
        <section className="inspector-grid"><DeepLinkPanel url={deeplinkUrl} setUrl={setDeeplinkUrl} result={deeplinkResult} busy={busy} onParse={handleParseDeepLink} /><AuditSyncPanel auditEvents={auditEvents} syncOutbox={syncOutbox} /></section>
        <section className="inspector-grid"><InstallationPanel installations={installations} busy={busy} onUninstall={handleUninstall} /><BackupPanel backups={backups} busy={busy} onRestore={handleRestoreBackup} /></section>
        <section className="inspector-grid"><GeneratedArtifactsPanel artifacts={generatedArtifacts} preview={artifactPreview} onRead={handleReadArtifact} /><EventPanel events={events} /></section>
      </main>
    </div>
  )
}

function Sidebar({ sources, installations, pendingSync }: { sources: AgentSourceSummary[]; installations: number; pendingSync: number }) {
  return <aside className="buddy-sidebar"><div className="window-dots"><span /><span /><span /></div><div className="brand-block"><div className="brand-mark">AB</div><div><strong>Agent Buddy</strong><span>v0.1.0</span></div></div><nav className="sidebar-nav"><a>⊕ 新建任务</a><a>♙ 助理</a><a>⌘ 项目</a><a className="active">☻ 专家<span>技能 · 连接器</span></a><a>◌ 自动化</a><a>⌁ 更多<span>资料库 · 灵感</span></a></nav><div className="sidebar-section"><strong>任务 ({installations})</strong><span>安装记录 / 回滚</span></div><div className="sidebar-section"><strong>空间 ({sources.length})</strong>{sources.slice(0, 5).map((source) => <span key={source.id}>▱ {source.name}</span>)}</div><div className="sidebar-section"><strong>同步</strong><span>{pendingSync} pending event(s)</span></div><div className="sidebar-footer"><div className="user-avatar">伴</div><span>人生丰满</span></div></aside>
}
function ScenarioCard({ title, subtitle, people, tone }: { title: string; subtitle: string; people: string[]; tone: string }) { return <div className={`scenario-card ${tone}`}><div><strong>{title}</strong><p>{subtitle}</p></div><div className="scenario-people">{people.map((person, index) => <span key={person}><Avatar seed={`${title}-${index}`} />{person}</span>)}</div></div> }
function Avatar({ seed }: { seed: string }) { const code = Array.from(seed).reduce((sum, ch) => sum + ch.charCodeAt(0), 0); const icons = ['🦜','🧑🏻‍💻','🧭','🦊','🐳','🧠','🧩','🌱','🎯','📚']; return <span className="avatar">{icons[code % icons.length]}</span> }
function SourcePanel(props: { sources: AgentSourceSummary[]; selectedSourceId: string; sourceUrl: string; sourceName: string; sourceBranch: string; busy: boolean; setSelectedSourceId: (value: string) => void; setSourceUrl: (value: string) => void; setSourceName: (value: string) => void; setSourceBranch: (value: string) => void; onImport: () => void; onRefresh: () => void; onRisk: () => void; onDetail: () => void }) { return <section className="mini-panel source-import"><div className="panel-header"><h2>Agent Sources</h2><span>{props.sources.length} sources</span></div><div className="form-grid"><input value={props.sourceUrl} onChange={(event) => props.setSourceUrl(event.target.value)} placeholder="https://github.com/jnMetaCode/agency-agents-zh or /local/path" /><input value={props.sourceName} onChange={(event) => props.setSourceName(event.target.value)} placeholder="source name" /><input value={props.sourceBranch} onChange={(event) => props.setSourceBranch(event.target.value)} placeholder="branch optional" /></div><div className="actions"><button disabled={props.busy || !props.sourceUrl} onClick={props.onRisk}>风险扫描</button><button disabled={props.busy || !props.sourceUrl} onClick={props.onImport}>导入源</button><select value={props.selectedSourceId} onChange={(event) => props.setSelectedSourceId(event.target.value)}><option value="all">All sources</option>{props.sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select><button disabled={props.busy || props.selectedSourceId === 'all'} onClick={props.onDetail}>详情</button><button disabled={props.busy} onClick={props.onRefresh}>刷新</button></div></section> }
function SourceDetailPanel({ detail, risk }: { detail: AgentSourceDetail | null; risk: SourceImportRiskPreview | null }) { return <section className="mini-panel"><div className="panel-header"><h2>Source Detail</h2><span>{detail ? detail.source.name : '未选择'}</span></div>{risk && <div className="notice-box"><strong>Import Risk</strong><span>{risk.sourceKind} · {risk.riskReport.totalFindings} finding(s)</span>{risk.warnings.map((warning) => <small key={warning}>{warning}</small>)}</div>}{detail ? <div className="detail-stack"><strong>{detail.source.agentCount} agents · {detail.categories.length} categories · {detail.source.runtimeCount} runtimes</strong><small>{detail.source.sourceUrl}</small><small>{detail.licenseNotice.noticeText}</small><span>Risk findings: {detail.riskReport.totalFindings}</span></div> : <p className="muted">导入或选择 Source 后，可查看风险、License 和分类详情。</p>}</section> }
function ExpertCard({ agent, selected, index, onToggle, onMarkdown, onPreview }: { agent: LocalAgentSummary; selected: boolean; index: number; onToggle: () => void; onMarkdown: () => void; onPreview: () => void }) { return <article className={`expert-card ${selected ? 'selected' : ''}`}><div className="expert-head"><Avatar seed={agent.id || `${index}`} /><div><strong>{agent.name || agent.slug}</strong><span>{agent.sourceName}</span></div><input type="checkbox" checked={selected} onChange={onToggle} /></div><p>{agent.description || '从 Agent Source 导入的本地专家，可转换为不同 Runtime 的安装格式。'}</p><div className="tag-row"><span>{agent.category}</span><span>{agent.slug}</span></div><div className="card-actions"><button onClick={onMarkdown}>原始 Markdown</button><button onClick={onPreview}>转换预览</button></div></article> }
function RuntimePanel({ runtimes, selectedRuntimes, definitionByRuntime, onToggle }: { runtimes: RuntimeDetection[]; selectedRuntimes: Set<RuntimeKind>; definitionByRuntime: Map<RuntimeKind, RuntimeDefinition>; onToggle: (kind: RuntimeKind) => void }) { return <section className="mini-panel"><div className="panel-header"><h2>Runtime Registry</h2><span>{runtimes.length} runtimes</span></div><div className="runtime-list">{runtimes.map((runtime) => { const definition = definitionByRuntime.get(runtime.kind); return <label key={runtime.kind} className={`runtime-card ${runtime.detected ? 'detected' : ''}`}><input checked={selectedRuntimes.has(runtime.kind)} onChange={() => onToggle(runtime.kind)} type="checkbox" /><div><strong>{runtime.label}</strong><span>{runtime.scope} · {runtime.detected ? 'detected' : 'not detected'}{definition?.supportsNativeRegistration ? ' · native' : ''}</span><small>{runtime.defaultTarget ?? runtime.configDir ?? 'manual path may be required'}</small></div></label> })}</div></section> }
function InstallWizard(props: { selectedAgents: Set<string>; selectedRuntimes: Set<RuntimeKind>; projectDir: string; customDir: string; hermesCategories: string; previewRuntime: RuntimeKind; busy: boolean; setProjectDir: (v: string) => void; setCustomDir: (v: string) => void; setHermesCategories: (v: string) => void; setPreviewRuntime: (v: RuntimeKind) => void; onBuildBundles: () => void; onPlan: () => void; onInstall: () => void }) { return <section className="mini-panel"><div className="panel-header"><h2>安装到本机</h2><span>{props.selectedAgents.size} experts · {props.selectedRuntimes.size} runtimes</span></div><div className="form-grid"><input value={props.projectDir} onChange={(event) => props.setProjectDir(event.target.value)} placeholder="项目目录 /path/to/project" /><input value={props.customDir} onChange={(event) => props.setCustomDir(event.target.value)} placeholder="自定义目录 /path/to/skills/custom" /><input value={props.hermesCategories} onChange={(event) => props.setHermesCategories(event.target.value)} placeholder="Hermes 分类 engineering,marketing" /><select value={props.previewRuntime} onChange={(event) => props.setPreviewRuntime(event.target.value as RuntimeKind)}>{ALL_RUNTIMES.map((runtime) => <option key={runtime} value={runtime}>{runtime}</option>)}</select></div><div className="actions"><button disabled={props.busy || props.selectedAgents.size === 0} onClick={props.onBuildBundles}>Bundle 预览</button><button disabled={props.busy || props.selectedRuntimes.size === 0} onClick={props.onPlan}>生成安装计划</button><button disabled={props.busy || props.selectedRuntimes.size === 0} onClick={props.onInstall}>确认安装</button></div></section> }
function PreviewPanel({ markdown, conversion }: { markdown: AgentMarkdownPreview | null; conversion: AgentRuntimeConversionPreview | null }) { return <section className="mini-panel"><div className="panel-header"><h2>Agent Preview</h2><span>{conversion ? conversion.runtime : markdown ? markdown.name : 'none'}</span></div><div className="artifact-layout"><pre className="artifact-preview">{markdown ? markdown.rawMarkdown : '选择「原始 Markdown」。'}</pre><pre className="artifact-preview">{conversion ? JSON.stringify({ files: conversion.files, risk: conversion.riskReport, warnings: conversion.warnings }, null, 2) : '选择「转换预览」。'}</pre></div></section> }
function BundleCatalogPanel({ bundles, onSelectAgent }: { bundles: BundleCatalogItem[]; onSelectAgent: (id: string) => void }) { return <section className="mini-panel"><div className="panel-header"><h2>Unified Bundle Catalog</h2><span>{bundles.length}</span></div><div className="compact-list">{bundles.slice(0, 36).map((bundle) => <div key={bundle.bundleId} className="compact-card"><strong>{bundle.name}</strong><span>{bundle.origin} · {bundle.sourceName} · {bundle.targetCount} targets</span><small>{bundle.bundleId}</small>{bundle.localAgentId && <button onClick={() => onSelectAgent(bundle.localAgentId!)}>选择</button>}</div>)}</div></section> }
function InstallPlanPanel({ plan }: { plan: InstallPlan }) { return <section className="mini-panel plan-panel"><div className="panel-header"><h2>Install Plan</h2><span>{plan.totalAgents} agents · {plan.totalFiles} files</span></div><div className="plan-grid">{plan.targets.map((target) => <div key={target.runtime} className="plan-card"><strong>{target.runtime}</strong><span>{target.scope}</span><small>{target.filesToWrite} files · {target.agentsToInstall} agents</small>{target.targetDirs.map((dir) => <code key={dir}>{dir}</code>)}</div>)}</div></section> }
function DoctorPanel({ report }: { report: DoctorReport }) { return <section className="mini-panel doctor-panel"><div className="panel-header"><h2>Agent Doctor</h2><span>{report.summary.ok} ok · {report.summary.warning} warnings · {report.summary.error} errors</span></div><div className="doctor-list">{report.checks.map((check) => <div key={check.id} className={`doctor-card ${check.status}`}><strong>{check.label}</strong><span>{check.status}</span><small>{check.message}</small></div>)}</div></section> }
function BundlePanel({ bundles }: { bundles: AgentBundle[] }) { return <section className="mini-panel"><div className="panel-header"><h2>Agent Bundle Preview</h2><span>{bundles.length}</span></div><div className="bundle-list">{bundles.slice(0, 8).map((bundle) => <div key={bundle.bundleId} className="bundle-card"><strong>{bundle.profile.name}</strong><span>{bundle.bundleId} · {bundle.version}</span><small>{bundle.profile.description}</small></div>)}</div></section> }
function KnowledgeMemoryPanel(props: { spaces: KnowledgeSpace[]; snapshots: KnowledgeSnapshot[]; memoryItems: MemoryItem[]; candidates: MemoryCandidate[]; memoryDraft: string; setMemoryDraft: (value: string) => void; onInitKnowledge: () => void; onProposeMemory: () => void; onApproveMemory: (id: string) => void }) { return <section className="mini-panel"><div className="panel-header"><h2>知识 / 记忆</h2><span>{props.spaces.length} spaces · {props.memoryItems.length} memories · {props.snapshots.length} snapshots</span></div><div className="actions"><input value={props.memoryDraft} onChange={(event) => props.setMemoryDraft(event.target.value)} placeholder="Memory candidate" /><button onClick={props.onProposeMemory}>Propose</button><button onClick={props.onInitKnowledge}>Init Knowledge</button></div><div className="compact-list">{props.candidates.slice(0, 6).map((candidate) => <div key={candidate.id} className="compact-card"><strong>{candidate.memoryType}</strong><span>{candidate.scope} · {candidate.status}</span><small>{candidate.content}</small><button onClick={() => props.onApproveMemory(candidate.id)}>Approve</button></div>)}</div></section> }
function SessionHandoffPanel(props: { sessionId: string; setSessionId: (value: string) => void; handoffGoal: string; setHandoffGoal: (value: string) => void; handoffSummary: string; setHandoffSummary: (value: string) => void; events: SessionEvent[]; handoffs: HandoffPack[]; onCreateHandoff: () => void }) { return <section className="mini-panel"><div className="panel-header"><h2>会话 / Handoff</h2><span>{props.events.length} events · {props.handoffs.length} handoffs</span></div><div className="form-grid"><input value={props.sessionId} onChange={(event) => props.setSessionId(event.target.value)} /><input value={props.handoffGoal} onChange={(event) => props.setHandoffGoal(event.target.value)} /><input value={props.handoffSummary} onChange={(event) => props.setHandoffSummary(event.target.value)} /></div><button onClick={props.onCreateHandoff}>Create Handoff</button></section> }
function DeepLinkPanel({ url, setUrl, result, busy, onParse }: { url: string; setUrl: (value: string) => void; result: DeepLinkRequest | null; busy: boolean; onParse: () => void }) { return <section className="mini-panel"><div className="panel-header"><h2>Deep Link</h2><span>agentbuddy://</span></div><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="agentbuddy://install-source?url=..." /><button disabled={busy || !url} onClick={onParse}>Parse / Execute</button>{result && <pre className="json-preview">{JSON.stringify(result, null, 2)}</pre>}</section> }
function EventPanel({ events }: { events: InstallEvent[] }) { return <section className="mini-panel"><div className="panel-header"><h2>Recent Events</h2><span>{events.length}</span></div><div className="event-list">{events.slice(0, 10).map((event) => <div key={event.id} className={`event-card ${event.level}`}><strong>{event.level}</strong><span>{event.runtime ?? 'system'}</span><small>{event.message}</small></div>)}</div></section> }
function InstallationPanel({ installations, busy, onUninstall }: { installations: AgentInstallation[]; busy: boolean; onUninstall: (id: string) => void }) { return <section className="mini-panel"><div className="panel-header"><h2>Installations</h2><span>{installations.length}</span></div><div className="install-list">{installations.map((installation) => <div key={installation.id} className="install-card"><div><strong>{installation.runtime}</strong><span>{installation.agentId}</span><small>{installation.targetPath}</small></div><button disabled={busy} onClick={() => onUninstall(installation.id)}>Uninstall</button></div>)}</div></section> }
function BackupPanel({ backups, busy, onRestore }: { backups: InstallBackup[]; busy: boolean; onRestore: (id: string) => void }) { return <section className="mini-panel"><div className="panel-header"><h2>Backups</h2><span>{backups.length}</span></div><div className="install-list">{backups.slice(0, 20).map((backup) => <div key={backup.id} className="install-card"><div><strong>{backup.runtime}</strong><small>{backup.originalPath}</small><small>{backup.backupPath}</small></div><button disabled={busy} onClick={() => onRestore(backup.id)}>Restore</button></div>)}</div></section> }
function GeneratedArtifactsPanel({ artifacts, preview, onRead }: { artifacts: GeneratedArtifact[]; preview: string; onRead: (path: string) => void }) { return <section className="mini-panel"><div className="panel-header"><h2>Generated Artifacts</h2><span>{artifacts.length}</span></div><div className="artifact-layout"><div className="compact-list">{artifacts.slice(0, 30).map((artifact) => <button key={artifact.absolutePath} className="artifact-button" onClick={() => onRead(artifact.absolutePath)}><strong>{artifact.runtime}</strong><span>{artifact.relativePath}</span><small>{artifact.sizeBytes} bytes</small></button>)}</div><pre className="artifact-preview">{preview || 'Select artifact.'}</pre></div></section> }
function AuditSyncPanel({ auditEvents, syncOutbox }: { auditEvents: AuditEvent[]; syncOutbox: SyncOutboxEvent[] }) { return <section className="mini-panel"><div className="panel-header"><h2>Audit / Sync</h2><span>{auditEvents.length} audit · {syncOutbox.length} sync</span></div><div className="audit-sync-grid"><div>{auditEvents.slice(0, 8).map((event) => <div key={event.id} className={`event-card ${event.severity}`}><strong>{event.action}</strong><span>{event.severity}</span><small>{event.message}</small></div>)}</div><div>{syncOutbox.slice(0, 8).map((event) => <div key={event.id} className={`event-card ${event.status}`}><strong>{event.eventType}</strong><span>{event.status}</span><small>{event.aggregateType}:{event.aggregateId}</small></div>)}</div></div></section> }
function toggleSet<T>(current: Set<T>, value: T): Set<T> { const next = new Set(current); next.has(value) ? next.delete(value) : next.add(value); return next }
export default App
