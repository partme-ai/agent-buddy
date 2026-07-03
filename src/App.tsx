import { useEffect, useMemo, useState } from 'react'
import {
  approveMemoryCandidate,
  buildAgentBundles,
  createHandoffPack,
  detectRuntimes,
  getInstallPlan,
  importAgentSource,
  initializeDefaultKnowledgeSpaces,
  installAgents,
  listAgentSources,
  listAgents,
  listAuditEvents,
  listBuiltInSkills,
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
  AgentSourceSummary,
  AuditEvent,
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
  SyncOutboxEvent,
} from './types'

function App() {
  const [agentSources, setAgentSources] = useState<AgentSourceSummary[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState('all')
  const [sourceUrl, setSourceUrl] = useState('https://github.com/jnMetaCode/agency-agents-zh')
  const [sourceName, setSourceName] = useState('agency-agents-zh')
  const [sourceBranch, setSourceBranch] = useState('')
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
  const [status, setStatus] = useState('Ready')
  const [busy, setBusy] = useState(false)

  async function reload() {
    const [nextSources, nextDefinitions, nextAgents, nextRuntimes, nextInstallations, nextBackups, nextEvents, nextAuditEvents, nextSyncOutbox, nextArtifacts, nextMcpServers, nextBuiltInSkills, nextSkillTargets, nextKnowledgeSpaces, nextKnowledgeSnapshots, nextMemoryItems, nextMemoryCandidates, nextSessionEvents, nextHandoffPacks] = await Promise.all([
      listAgentSources(), runtimeDefinitions(), listAgents(), detectRuntimes(), listInstallations(), listInstallBackups(), listInstallEvents(), listAuditEvents(), listSyncOutbox(), listGeneratedArtifacts(), listDefaultMcpServers(), listBuiltInSkills(), listSkillTargets(), listKnowledgeSpaces(), listKnowledgeSnapshots(), listMemoryItems(), listMemoryCandidates(), listSessionEvents(), listHandoffPacks(),
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
  const sourceStats = useMemo(() => ({ sources: agentSources.length, agents: sourceScopedAgents.length, categories: new Set(sourceScopedAgents.map((agent) => agent.category)).size, runtimes: definitions.length, installed: installations.length, artifacts: generatedArtifacts.length, pendingSync: syncOutbox.filter((event) => event.status === 'pending').length }), [agentSources, sourceScopedAgents, definitions, generatedArtifacts, installations, syncOutbox])

  function toggleAgent(id: string) { setSelectedAgents((current) => toggleSet(current, id)); setPlan(null) }
  function toggleRuntime(kind: RuntimeKind) { setSelectedRuntimes((current) => toggleSet(current, kind)); setPlan(null) }
  function selectedTargets(): InstallTarget[] { return Array.from(selectedRuntimes).map((runtime) => { const definition = definitionByRuntime.get(runtime); return { runtime, projectDir: definition?.scope === 'project' ? projectDir || null : null, customDir: definition?.scope === 'custom' ? customDir || null : null, categoryFilters: runtime === 'hermes' ? hermesCategories.split(',').map((item) => item.trim()).filter(Boolean) : [] } }) }
  async function withBusy(work: () => Promise<void>) { setBusy(true); try { await work() } catch (error) { setStatus(String(error)) } finally { setBusy(false) } }
  async function handleRefreshSource() { await withBusy(async () => { const result = await refreshAgentSource(); setSelectedSourceId(result.sourceId); setStatus(result.message); setPlan(null); await reload() }) }
  async function handleImportSource() { await withBusy(async () => { const result = await importAgentSource({ sourceUrl, name: sourceName || null, branch: sourceBranch || null, sourceKind: null }); setSelectedSourceId(result.sourceId); setStatus(`Imported ${result.agentCount} agents from ${result.sourceName}.`); setSelectedAgents(new Set()); setPlan(null); await reload() }) }
  async function handleRefreshSelectedSource() { await withBusy(async () => { if (selectedSourceId === 'all') { await handleRefreshSource(); return } const result = await refreshAgentSourceById(selectedSourceId); setStatus(result.message); setPlan(null); await reload() }) }
  async function handleBuildBundles() { await withBusy(async () => { const nextBundles = await buildAgentBundles(Array.from(selectedAgents)); setBundles(nextBundles); setStatus(`Built ${nextBundles.length} local Agent Bundle preview(s).`) }) }
  async function handlePlan() { await withBusy(async () => { const nextPlan = await getInstallPlan(Array.from(selectedAgents), selectedTargets()); setPlan(nextPlan); setStatus(`Install plan ready: ${nextPlan.totalAgents} agents, ${nextPlan.totalFiles} files.`) }) }
  async function handleInstall() { await withBusy(async () => { const result = await installAgents(Array.from(selectedAgents), selectedTargets()); setStatus(`Installed ${result.reduce((sum, item) => sum + item.filesWritten, 0)} files.`); setPlan(null); await reload() }) }
  async function handleUninstall(id: string) { await withBusy(async () => { await uninstallInstallation(id); await reload(); setStatus('Installation removed.') }) }
  async function handleRestoreBackup(id: string) { await withBusy(async () => { await restoreBackup(id); await reload(); setStatus('Backup restored.') }) }
  async function handleDoctor() { await withBusy(async () => { const report = await runDoctor(); setDoctor(report); setStatus(`Doctor complete: ${report.summary.ok} ok, ${report.summary.warning} warnings, ${report.summary.error} errors.`) }) }
  async function handleParseDeepLink() { await withBusy(async () => { const parsed = await parseDeepLink(deeplinkUrl); setDeeplinkResult(parsed); setStatus(`Parsed deeplink: ${parsed.action}`) }) }
  async function handleReadArtifact(path: string) { await withBusy(async () => { const content = await readGeneratedArtifact(path); setArtifactPreview(content); setStatus(`Loaded generated artifact: ${path}`) }) }
  async function handleInitKnowledge() { await withBusy(async () => { const spaces = await initializeDefaultKnowledgeSpaces(); await reload(); setStatus(`Initialized ${spaces.length} knowledge spaces.`) }) }
  async function handleProposeMemory() { await withBusy(async () => { if (!memoryDraft.trim()) return; await proposeMemory(memoryDraft, 'user' as MemoryScope, 'preference' as MemoryType, sessionId); setMemoryDraft(''); await reload(); setStatus('Memory candidate proposed.') }) }
  async function handleApproveMemory(id: string) { await withBusy(async () => { await approveMemoryCandidate(id, 'Approved memory'); await reload(); setStatus('Memory candidate approved.') }) }
  async function handleCreateHandoff() { await withBusy(async () => { await createHandoffPack(sessionId, null, Array.from(selectedRuntimes)[0] ?? null, handoffGoal, handoffSummary); await reload(); setStatus('Handoff pack created.') }) }

  return (
    <main className="shell">
      <section className="hero"><div><div className="eyebrow">Agent Buddy MVP</div><h1>Import agents from Agent PaaS, GitHub, or local folders, then install them into local runtimes.</h1><p>Agent Buddy now manages Agent Sources as first-class objects: PaaS bundles, Git repos such as agency-agents-zh, and local directories can all enter the same source → agent → install flow.</p></div><div className="hero-actions"><button disabled={busy} onClick={handleRefreshSource}>Refresh Default Source</button><button disabled={busy} onClick={handleDoctor}>Run Doctor</button></div></section>
      <div className="status">{status}</div>
      <section className="stats-grid"><Stat label="Sources" value={sourceStats.sources} /><Stat label="Agents" value={sourceStats.agents} /><Stat label="Categories" value={sourceStats.categories} /><Stat label="Runtimes" value={sourceStats.runtimes} /><Stat label="Installations" value={sourceStats.installed} /><Stat label="Pending Sync" value={sourceStats.pendingSync} /></section>
      <SourcePanel sources={agentSources} selectedSourceId={selectedSourceId} sourceUrl={sourceUrl} sourceName={sourceName} sourceBranch={sourceBranch} busy={busy} setSelectedSourceId={setSelectedSourceId} setSourceUrl={setSourceUrl} setSourceName={setSourceName} setSourceBranch={setSourceBranch} onImport={handleImportSource} onRefresh={handleRefreshSelectedSource} />
      <section className="grid two"><RuntimePanel runtimes={runtimes} selectedRuntimes={selectedRuntimes} definitionByRuntime={definitionByRuntime} onToggle={toggleRuntime} /><InstallWizard selectedAgents={selectedAgents} selectedRuntimes={selectedRuntimes} projectDir={projectDir} customDir={customDir} hermesCategories={hermesCategories} busy={busy} setProjectDir={setProjectDir} setCustomDir={setCustomDir} setHermesCategories={setHermesCategories} onBuildBundles={handleBuildBundles} onPlan={handlePlan} onInstall={handleInstall} /></section>
      {doctor && <DoctorPanel report={doctor} />}{bundles.length > 0 && <BundlePanel bundles={bundles} />}{plan && <InstallPlanPanel plan={plan} />}
      <section className="grid two"><McpPanel servers={mcpServers} /><SkillPanel skills={builtInSkills} targets={skillTargets} /></section>
      <section className="grid two"><KnowledgeMemoryPanel spaces={knowledgeSpaces} snapshots={knowledgeSnapshots} memoryItems={memoryItems} candidates={memoryCandidates} memoryDraft={memoryDraft} setMemoryDraft={setMemoryDraft} onInitKnowledge={handleInitKnowledge} onProposeMemory={handleProposeMemory} onApproveMemory={handleApproveMemory} /><SessionHandoffPanel sessionId={sessionId} setSessionId={setSessionId} handoffGoal={handoffGoal} setHandoffGoal={setHandoffGoal} handoffSummary={handoffSummary} setHandoffSummary={setHandoffSummary} events={sessionEvents} handoffs={handoffPacks} onCreateHandoff={handleCreateHandoff} /></section>
      <section className="grid two"><DeepLinkPanel url={deeplinkUrl} setUrl={setDeeplinkUrl} result={deeplinkResult} busy={busy} onParse={handleParseDeepLink} /><section className="panel"><div className="panel-header"><h2>Recent Events</h2><span>{events.length}</span></div><EventList events={events} /></section></section>
      <section className="panel"><div className="panel-header"><h2>Agents</h2><span>{filteredAgents.length} shown · {sourceScopedAgents.length} in selected source scope</span></div><div className="filters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents" /><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><button onClick={() => setSelectedAgents(new Set(filteredAgents.map((agent) => agent.id)))}>Select shown</button><button onClick={() => setSelectedAgents(new Set())}>Clear</button></div><div className="agent-list">{filteredAgents.map((agent) => <label key={agent.id} className="agent-card"><input checked={selectedAgents.has(agent.id)} onChange={() => toggleAgent(agent.id)} type="checkbox" /><div><strong>{agent.name || agent.slug}</strong><span>{agent.sourceName} · {agent.category} · {agent.slug}</span><p>{agent.description}</p></div></label>)}</div></section>
      <section className="grid two"><InstallationPanel installations={installations} busy={busy} onUninstall={handleUninstall} /><BackupPanel backups={backups} busy={busy} onRestore={handleRestoreBackup} /></section>
      <section className="grid two"><GeneratedArtifactsPanel artifacts={generatedArtifacts} preview={artifactPreview} onRead={handleReadArtifact} /><AuditSyncPanel auditEvents={auditEvents} syncOutbox={syncOutbox} /></section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="stat-card"><strong>{value}</strong><span>{label}</span></div> }
function SourcePanel(props: { sources: AgentSourceSummary[]; selectedSourceId: string; sourceUrl: string; sourceName: string; sourceBranch: string; busy: boolean; setSelectedSourceId: (value: string) => void; setSourceUrl: (value: string) => void; setSourceName: (value: string) => void; setSourceBranch: (value: string) => void; onImport: () => void; onRefresh: () => void }) { return <section className="panel"><div className="panel-header"><h2>Agent Sources</h2><span>{props.sources.length} sources</span></div><div className="filters"><input value={props.sourceUrl} onChange={(event) => props.setSourceUrl(event.target.value)} placeholder="https://github.com/jnMetaCode/agency-agents-zh or /local/path" /><input value={props.sourceName} onChange={(event) => props.setSourceName(event.target.value)} placeholder="source name" /><input value={props.sourceBranch} onChange={(event) => props.setSourceBranch(event.target.value)} placeholder="branch optional" /><button disabled={props.busy || !props.sourceUrl} onClick={props.onImport}>Import Source</button><button disabled={props.busy} onClick={props.onRefresh}>Refresh Selected</button></div><div className="filters"><select value={props.selectedSourceId} onChange={(event) => props.setSelectedSourceId(event.target.value)}><option value="all">All sources</option>{props.sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></div><div className="compact-list">{props.sources.map((source) => <div key={source.id} className="compact-card"><strong>{source.name}</strong><span>{source.sourceKind} · {source.agentCount} agents · {source.categoryCount} categories · {source.runtimeCount} runtimes</span><small>{source.sourceUrl}</small><small>{source.localPath}</small></div>)}</div></section> }
function RuntimePanel({ runtimes, selectedRuntimes, definitionByRuntime, onToggle }: { runtimes: RuntimeDetection[]; selectedRuntimes: Set<RuntimeKind>; definitionByRuntime: Map<RuntimeKind, RuntimeDefinition>; onToggle: (kind: RuntimeKind) => void }) { return <div className="panel"><div className="panel-header"><h2>Runtime Registry</h2><span>{runtimes.length} runtimes</span></div><div className="runtime-list">{runtimes.map((runtime) => { const definition = definitionByRuntime.get(runtime.kind); return <label key={runtime.kind} className={`runtime-card ${runtime.detected ? 'detected' : ''}`}><input checked={selectedRuntimes.has(runtime.kind)} onChange={() => onToggle(runtime.kind)} type="checkbox" /><div><strong>{runtime.label}</strong><span>{runtime.scope} · {runtime.detected ? 'detected' : 'not detected'}{definition?.supportsNativeRegistration ? ' · native registration' : ''}</span><small>{runtime.defaultTarget ?? runtime.configDir ?? 'manual path may be required'}</small>{runtime.notes.map((note) => <em key={note}>{note}</em>)}</div></label> })}</div></div> }
function InstallWizard(props: { selectedAgents: Set<string>; selectedRuntimes: Set<RuntimeKind>; projectDir: string; customDir: string; hermesCategories: string; busy: boolean; setProjectDir: (v: string) => void; setCustomDir: (v: string) => void; setHermesCategories: (v: string) => void; onBuildBundles: () => void; onPlan: () => void; onInstall: () => void }) { return <div className="panel"><div className="panel-header"><h2>Install Wizard</h2><span>{props.selectedAgents.size} agents · {props.selectedRuntimes.size} runtimes</span></div><label className="field">Project directory<input value={props.projectDir} onChange={(event) => props.setProjectDir(event.target.value)} placeholder="/path/to/project" /></label><label className="field">Custom directory<input value={props.customDir} onChange={(event) => props.setCustomDir(event.target.value)} placeholder="/path/to/skills/custom" /></label><label className="field">Hermes categories<input value={props.hermesCategories} onChange={(event) => props.setHermesCategories(event.target.value)} placeholder="engineering,marketing" /></label><div className="actions"><button disabled={props.busy || props.selectedAgents.size === 0} onClick={props.onBuildBundles}>Preview Bundles</button><button disabled={props.busy || props.selectedRuntimes.size === 0} onClick={props.onPlan}>Generate Plan</button><button disabled={props.busy || props.selectedRuntimes.size === 0} onClick={props.onInstall}>Install</button></div></div> }
function InstallPlanPanel({ plan }: { plan: InstallPlan }) { return <section className="panel plan-panel"><div className="panel-header"><h2>Install Plan</h2><span>{plan.totalAgents} agents · {plan.totalFiles} files</span></div><div className="plan-grid">{plan.targets.map((target) => <div key={target.runtime} className="plan-card"><strong>{target.runtime}</strong><span>{target.scope}</span><small>{target.filesToWrite} files · {target.agentsToInstall} agents</small>{target.targetDirs.map((dir) => <code key={dir}>{dir}</code>)}{target.postActions.map((action) => <em key={action}>post: {action}</em>)}{target.warnings.map((warning) => <em key={warning}>warning: {warning}</em>)}</div>)}</div>{plan.conflicts.length > 0 && <div className="conflicts"><h3>Overwrite conflicts backed up before install</h3>{plan.conflicts.slice(0, 12).map((conflict) => <p key={`${conflict.runtime}-${conflict.path}`}>{conflict.runtime}: {conflict.path}</p>)}</div>}</section> }
function DoctorPanel({ report }: { report: DoctorReport }) { return <section className="panel doctor-panel"><div className="panel-header"><h2>Agent Doctor</h2><span>{report.summary.ok} ok · {report.summary.warning} warnings · {report.summary.error} errors</span></div><div className="doctor-list">{report.checks.map((check) => <div key={check.id} className={`doctor-card ${check.status}`}><strong>{check.label}</strong><span>{check.status}</span><small>{check.message}</small>{check.remediation && <em>{check.remediation}</em>}</div>)}</div></section> }
function BundlePanel({ bundles }: { bundles: AgentBundle[] }) { return <section className="panel"><div className="panel-header"><h2>Agent Bundle Preview</h2><span>{bundles.length}</span></div><div className="bundle-list">{bundles.slice(0, 8).map((bundle) => <div key={bundle.bundleId} className="bundle-card"><strong>{bundle.profile.name}</strong><span>{bundle.bundleId} · {bundle.version}</span><small>{bundle.profile.description}</small><code>{bundle.targets.join(', ')}</code></div>)}</div></section> }
function McpPanel({ servers }: { servers: McpServerConfig[] }) { return <section className="panel"><div className="panel-header"><h2>Buddy MCP Registry</h2><span>{servers.length}</span></div><div className="compact-list">{servers.map((server) => <div key={server.id} className="compact-card"><strong>{server.name}</strong><span>{server.transport} · {server.enabled ? 'enabled' : 'disabled'} · {server.policy.approvalRequired ? 'approval' : 'no approval'}</span><small>{server.url ?? server.command ?? server.id}</small></div>)}</div></section> }
function SkillPanel({ skills, targets }: { skills: SkillPackage[]; targets: SkillTargetPath[] }) { return <section className="panel"><div className="panel-header"><h2>Buddy Skills</h2><span>{skills.length} skills · {targets.length} targets</span></div><div className="compact-list">{skills.map((skill) => <div key={skill.id} className="compact-card"><strong>{skill.name}</strong><span>{skill.source} · {skill.syncMode}</span><small>{skill.enabledTargets.join(', ')}</small></div>)}</div></section> }
function KnowledgeMemoryPanel(props: { spaces: KnowledgeSpace[]; snapshots: KnowledgeSnapshot[]; memoryItems: MemoryItem[]; candidates: MemoryCandidate[]; memoryDraft: string; setMemoryDraft: (value: string) => void; onInitKnowledge: () => void; onProposeMemory: () => void; onApproveMemory: (id: string) => void }) { return <section className="panel"><div className="panel-header"><h2>Knowledge / Memory Center</h2><span>{props.spaces.length} spaces · {props.memoryItems.length} memories</span></div><div className="actions"><button onClick={props.onInitKnowledge}>Init Knowledge Spaces</button></div><label className="field">Memory candidate<input value={props.memoryDraft} onChange={(event) => props.setMemoryDraft(event.target.value)} placeholder="User prefers concise Chinese technical plans..." /></label><button onClick={props.onProposeMemory}>Propose Memory</button><div className="compact-list">{props.spaces.map((space) => <div key={space.id} className="compact-card"><strong>{space.name}</strong><span>{space.source} · {space.syncMode}</span><small>{space.description}</small></div>)}{props.candidates.slice(0, 8).map((candidate) => <div key={candidate.id} className="compact-card"><strong>Candidate: {candidate.memoryType}</strong><span>{candidate.scope} · {candidate.status}</span><small>{candidate.content}</small><button onClick={() => props.onApproveMemory(candidate.id)}>Approve</button></div>)}</div></section> }
function SessionHandoffPanel(props: { sessionId: string; setSessionId: (value: string) => void; handoffGoal: string; setHandoffGoal: (value: string) => void; handoffSummary: string; setHandoffSummary: (value: string) => void; events: SessionEvent[]; handoffs: HandoffPack[]; onCreateHandoff: () => void }) { return <section className="panel"><div className="panel-header"><h2>Session / Handoff Center</h2><span>{props.events.length} events · {props.handoffs.length} handoffs</span></div><label className="field">Session ID<input value={props.sessionId} onChange={(event) => props.setSessionId(event.target.value)} /></label><label className="field">Handoff goal<input value={props.handoffGoal} onChange={(event) => props.setHandoffGoal(event.target.value)} /></label><label className="field">Handoff summary<input value={props.handoffSummary} onChange={(event) => props.setHandoffSummary(event.target.value)} /></label><button onClick={props.onCreateHandoff}>Create Handoff</button><div className="compact-list">{props.handoffs.slice(0, 8).map((handoff) => <div key={handoff.id} className="compact-card"><strong>{handoff.goal}</strong><span>{handoff.sessionId} · {handoff.toRuntime ?? 'any runtime'}</span><small>{handoff.summary}</small></div>)}</div></section> }
function DeepLinkPanel({ url, setUrl, result, busy, onParse }: { url: string; setUrl: (value: string) => void; result: DeepLinkRequest | null; busy: boolean; onParse: () => void }) { return <section className="panel"><div className="panel-header"><h2>Deep Link Parser</h2><span>agentbuddy://</span></div><label className="field">URL<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="agentbuddy://install-agent?id=...&target=openclaw" /></label><button disabled={busy || !url} onClick={onParse}>Parse Deep Link</button>{result && <pre className="json-preview">{JSON.stringify(result, null, 2)}</pre>}</section> }
function EventList({ events }: { events: InstallEvent[] }) { return <div className="event-list">{events.slice(0, 12).map((event) => <div key={event.id} className={`event-card ${event.level}`}><strong>{event.level}</strong><span>{event.runtime ?? 'system'} · {new Date(event.createdAt * 1000).toLocaleString()}</span><small>{event.message}</small></div>)}</div> }
function InstallationPanel({ installations, busy, onUninstall }: { installations: AgentInstallation[]; busy: boolean; onUninstall: (id: string) => void }) { return <section className="panel"><div className="panel-header"><h2>Installations</h2><span>{installations.length}</span></div><div className="install-list">{installations.map((installation) => <div key={installation.id} className="install-card"><div><strong>{installation.runtime}</strong><span>{installation.agentId}</span><small>{installation.targetPath}</small><small>{installation.installedFiles.length} files · {new Date(installation.installedAt * 1000).toLocaleString()}</small></div><button disabled={busy} onClick={() => onUninstall(installation.id)}>Uninstall</button></div>)}</div></section> }
function BackupPanel({ backups, busy, onRestore }: { backups: InstallBackup[]; busy: boolean; onRestore: (id: string) => void }) { return <section className="panel"><div className="panel-header"><h2>Backups</h2><span>{backups.length}</span></div><div className="install-list">{backups.slice(0, 20).map((backup) => <div key={backup.id} className="install-card"><div><strong>{backup.runtime}</strong><span>{new Date(backup.createdAt * 1000).toLocaleString()}</span><small>{backup.originalPath}</small><small>{backup.backupPath}</small></div><button disabled={busy} onClick={() => onRestore(backup.id)}>Restore</button></div>)}</div></section> }
function GeneratedArtifactsPanel({ artifacts, preview, onRead }: { artifacts: GeneratedArtifact[]; preview: string; onRead: (path: string) => void }) { return <section className="panel"><div className="panel-header"><h2>Generated Artifacts</h2><span>{artifacts.length}</span></div><div className="artifact-layout"><div className="compact-list">{artifacts.slice(0, 30).map((artifact) => <button key={artifact.absolutePath} className="artifact-button" onClick={() => onRead(artifact.absolutePath)}><strong>{artifact.runtime}</strong><span>{artifact.relativePath}</span><small>{artifact.sizeBytes} bytes</small></button>)}</div><pre className="artifact-preview">{preview || 'Select a generated artifact to preview it.'}</pre></div></section> }
function AuditSyncPanel({ auditEvents, syncOutbox }: { auditEvents: AuditEvent[]; syncOutbox: SyncOutboxEvent[] }) { return <section className="panel"><div className="panel-header"><h2>Audit / Sync</h2><span>{auditEvents.length} audit · {syncOutbox.length} sync</span></div><div className="audit-sync-grid"><div>{auditEvents.slice(0, 12).map((event) => <div key={event.id} className={`event-card ${event.severity}`}><strong>{event.action}</strong><span>{event.severity} · {event.runtime ?? 'system'}</span><small>{event.message}</small></div>)}</div><div>{syncOutbox.slice(0, 12).map((event) => <div key={event.id} className={`event-card ${event.status}`}><strong>{event.eventType}</strong><span>{event.status} · retry {event.retryCount}</span><small>{event.aggregateType}:{event.aggregateId}</small></div>)}</div></div></section> }
function toggleSet<T>(current: Set<T>, value: T): Set<T> { const next = new Set(current); next.has(value) ? next.delete(value) : next.add(value); return next }
export default App
