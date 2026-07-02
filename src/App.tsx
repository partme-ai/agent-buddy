import { useEffect, useMemo, useState } from 'react'
import {
  buildAgentBundles,
  detectRuntimes,
  getInstallPlan,
  installAgents,
  listAgents,
  listAuditEvents,
  listBuiltInSkills,
  listDefaultMcpServers,
  listGeneratedArtifacts,
  listInstallBackups,
  listInstallEvents,
  listInstallations,
  listSkillTargets,
  listSyncOutbox,
  parseDeepLink,
  readGeneratedArtifact,
  refreshAgentSource,
  restoreBackup,
  runDoctor,
  runtimeDefinitions,
  uninstallInstallation,
} from './tauri'
import type {
  AgentBundle,
  AgentInstallation,
  AuditEvent,
  DeepLinkRequest,
  DoctorReport,
  GeneratedArtifact,
  InstallBackup,
  InstallEvent,
  InstallPlan,
  InstallTarget,
  LocalAgentSummary,
  McpServerConfig,
  RuntimeDefinition,
  RuntimeDetection,
  RuntimeKind,
  SkillPackage,
  SkillTargetPath,
  SyncOutboxEvent,
} from './types'

function App() {
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
  const [doctor, setDoctor] = useState<DoctorReport | null>(null)
  const [plan, setPlan] = useState<InstallPlan | null>(null)
  const [deeplinkUrl, setDeeplinkUrl] = useState('')
  const [deeplinkResult, setDeeplinkResult] = useState<DeepLinkRequest | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [projectDir, setProjectDir] = useState('')
  const [customDir, setCustomDir] = useState('')
  const [hermesCategories, setHermesCategories] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [selectedRuntimes, setSelectedRuntimes] = useState<Set<RuntimeKind>>(new Set())
  const [status, setStatus] = useState('Ready')
  const [busy, setBusy] = useState(false)

  async function reload() {
    const [
      nextDefinitions,
      nextAgents,
      nextRuntimes,
      nextInstallations,
      nextBackups,
      nextEvents,
      nextAuditEvents,
      nextSyncOutbox,
      nextArtifacts,
      nextMcpServers,
      nextBuiltInSkills,
      nextSkillTargets,
    ] = await Promise.all([
      runtimeDefinitions(),
      listAgents(),
      detectRuntimes(),
      listInstallations(),
      listInstallBackups(),
      listInstallEvents(),
      listAuditEvents(),
      listSyncOutbox(),
      listGeneratedArtifacts(),
      listDefaultMcpServers(),
      listBuiltInSkills(),
      listSkillTargets(),
    ])
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
  }

  useEffect(() => {
    reload().catch((error) => setStatus(String(error)))
  }, [])

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(agents.map((agent) => agent.category))).sort()],
    [agents],
  )

  const definitionByRuntime = useMemo(() => new Map(definitions.map((item) => [item.kind, item])), [definitions])

  const filteredAgents = useMemo(() => {
    const normalized = query.toLowerCase()
    return agents.filter((agent) => {
      const matchesCategory = category === 'all' || agent.category === category
      const matchesQuery =
        !normalized || `${agent.name} ${agent.description} ${agent.slug}`.toLowerCase().includes(normalized)
      return matchesCategory && matchesQuery
    })
  }, [agents, category, query])

  const sourceStats = useMemo(() => {
    return {
      agents: agents.length,
      categories: new Set(agents.map((agent) => agent.category)).size,
      runtimes: definitions.length,
      installed: installations.length,
      artifacts: generatedArtifacts.length,
      pendingSync: syncOutbox.filter((event) => event.status === 'pending').length,
    }
  }, [agents, definitions, generatedArtifacts, installations, syncOutbox])

  function toggleAgent(id: string) {
    setSelectedAgents((current) => toggleSet(current, id))
    setPlan(null)
  }

  function toggleRuntime(kind: RuntimeKind) {
    setSelectedRuntimes((current) => toggleSet(current, kind))
    setPlan(null)
  }

  function selectedTargets(): InstallTarget[] {
    return Array.from(selectedRuntimes).map((runtime) => {
      const definition = definitionByRuntime.get(runtime)
      return {
        runtime,
        projectDir: definition?.scope === 'project' ? projectDir || null : null,
        customDir: definition?.scope === 'custom' ? customDir || null : null,
        categoryFilters:
          runtime === 'hermes'
            ? hermesCategories
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
      }
    })
  }

  async function handleRefreshSource() {
    await withBusy(async () => {
      const result = await refreshAgentSource()
      setStatus(result.message)
      setPlan(null)
      await reload()
    })
  }

  async function handleBuildBundles() {
    await withBusy(async () => {
      const nextBundles = await buildAgentBundles(Array.from(selectedAgents))
      setBundles(nextBundles)
      setStatus(`Built ${nextBundles.length} local Agent Bundle preview(s).`)
    })
  }

  async function handlePlan() {
    await withBusy(async () => {
      const nextPlan = await getInstallPlan(Array.from(selectedAgents), selectedTargets())
      setPlan(nextPlan)
      setStatus(`Install plan ready: ${nextPlan.totalAgents} agents, ${nextPlan.totalFiles} files.`)
    })
  }

  async function handleInstall() {
    await withBusy(async () => {
      const result = await installAgents(Array.from(selectedAgents), selectedTargets())
      setStatus(`Installed ${result.reduce((sum, item) => sum + item.filesWritten, 0)} files.`)
      setPlan(null)
      await reload()
    })
  }

  async function handleUninstall(id: string) {
    await withBusy(async () => {
      await uninstallInstallation(id)
      await reload()
      setStatus('Installation removed.')
    })
  }

  async function handleRestoreBackup(id: string) {
    await withBusy(async () => {
      await restoreBackup(id)
      await reload()
      setStatus('Backup restored.')
    })
  }

  async function handleDoctor() {
    await withBusy(async () => {
      const report = await runDoctor()
      setDoctor(report)
      setStatus(`Doctor complete: ${report.summary.ok} ok, ${report.summary.warning} warnings, ${report.summary.error} errors.`)
    })
  }

  async function handleParseDeepLink() {
    await withBusy(async () => {
      const parsed = await parseDeepLink(deeplinkUrl)
      setDeeplinkResult(parsed)
      setStatus(`Parsed deeplink: ${parsed.action}`)
    })
  }

  async function handleReadArtifact(path: string) {
    await withBusy(async () => {
      const content = await readGeneratedArtifact(path)
      setArtifactPreview(content)
      setStatus(`Loaded generated artifact: ${path}`)
    })
  }

  async function withBusy(work: () => Promise<void>) {
    setBusy(true)
    try {
      await work()
    } catch (error) {
      setStatus(String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <div className="eyebrow">Agent Buddy MVP</div>
          <h1>Install agency-agents-zh agents into all 18 supported local AI runtimes.</h1>
          <p>
            Local-first Tauri/Rust client with Agent Bundle previews, source scanning, runtime detection,
            install-plan preview, generated artifact cache, backup restore, Doctor, Deep Links, Audit, and Sync Outbox.
          </p>
        </div>
        <div className="hero-actions">
          <button disabled={busy} onClick={handleRefreshSource}>Refresh Source</button>
          <button disabled={busy} onClick={handleDoctor}>Run Doctor</button>
        </div>
      </section>

      <div className="status">{status}</div>

      <section className="stats-grid">
        <Stat label="Agents" value={sourceStats.agents} />
        <Stat label="Categories" value={sourceStats.categories} />
        <Stat label="Runtimes" value={sourceStats.runtimes} />
        <Stat label="Installations" value={sourceStats.installed} />
        <Stat label="Artifacts" value={sourceStats.artifacts} />
        <Stat label="Pending Sync" value={sourceStats.pendingSync} />
      </section>

      <section className="grid two">
        <div className="panel">
          <div className="panel-header"><h2>Runtime Registry</h2><span>{runtimes.length} runtimes</span></div>
          <div className="runtime-list">
            {runtimes.map((runtime) => {
              const definition = definitionByRuntime.get(runtime.kind)
              return (
                <label key={runtime.kind} className={`runtime-card ${runtime.detected ? 'detected' : ''}`}>
                  <input checked={selectedRuntimes.has(runtime.kind)} onChange={() => toggleRuntime(runtime.kind)} type="checkbox" />
                  <div>
                    <strong>{runtime.label}</strong>
                    <span>{runtime.scope} · {runtime.detected ? 'detected' : 'not detected'}{definition?.supportsNativeRegistration ? ' · native registration' : ''}</span>
                    <small>{runtime.defaultTarget ?? runtime.configDir ?? 'manual path may be required'}</small>
                    {runtime.notes.map((note) => <em key={note}>{note}</em>)}
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h2>Install Wizard</h2><span>{selectedAgents.size} agents · {selectedRuntimes.size} runtimes</span></div>
          <label className="field">Project directory for project-level runtimes<input value={projectDir} onChange={(event) => setProjectDir(event.target.value)} placeholder="/path/to/project" /></label>
          <label className="field">Custom directory for DeerFlow/custom installs<input value={customDir} onChange={(event) => setCustomDir(event.target.value)} placeholder="/path/to/skills/custom" /></label>
          <label className="field">Hermes categories, comma-separated<input value={hermesCategories} onChange={(event) => setHermesCategories(event.target.value)} placeholder="engineering,marketing" /></label>
          <div className="actions">
            <button disabled={busy || selectedAgents.size === 0} onClick={handleBuildBundles}>Preview Bundles</button>
            <button disabled={busy || selectedRuntimes.size === 0} onClick={handlePlan}>Generate Install Plan</button>
            <button disabled={busy || selectedRuntimes.size === 0} onClick={handleInstall}>Execute Install</button>
          </div>
        </div>
      </section>

      {doctor && <DoctorPanel report={doctor} />}
      {bundles.length > 0 && <BundlePanel bundles={bundles} />}
      {plan && <InstallPlanPanel plan={plan} />}

      <section className="grid two">
        <McpPanel servers={mcpServers} />
        <SkillPanel skills={builtInSkills} targets={skillTargets} />
      </section>

      <section className="grid two">
        <section className="panel">
          <div className="panel-header"><h2>Deep Link Parser</h2><span>agentbuddy://</span></div>
          <label className="field">URL<input value={deeplinkUrl} onChange={(event) => setDeeplinkUrl(event.target.value)} placeholder="agentbuddy://install-agent?id=...&target=openclaw" /></label>
          <button disabled={busy || !deeplinkUrl} onClick={handleParseDeepLink}>Parse Deep Link</button>
          {deeplinkResult && <pre className="json-preview">{JSON.stringify(deeplinkResult, null, 2)}</pre>}
        </section>
        <section className="panel"><div className="panel-header"><h2>Recent Events</h2><span>{events.length}</span></div><EventList events={events} /></section>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Agents</h2><span>{filteredAgents.length} shown · {agents.length} total</span></div>
        <div className="filters">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents" />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button onClick={() => setSelectedAgents(new Set(filteredAgents.map((agent) => agent.id)))}>Select shown</button>
          <button onClick={() => setSelectedAgents(new Set())}>Clear</button>
        </div>
        <div className="agent-list">
          {filteredAgents.map((agent) => <label key={agent.id} className="agent-card"><input checked={selectedAgents.has(agent.id)} onChange={() => toggleAgent(agent.id)} type="checkbox" /><div><strong>{agent.name || agent.slug}</strong><span>{agent.category} · {agent.slug}</span><p>{agent.description}</p></div></label>)}
        </div>
      </section>

      <section className="grid two">
        <InstallationPanel installations={installations} busy={busy} onUninstall={handleUninstall} />
        <BackupPanel backups={backups} busy={busy} onRestore={handleRestoreBackup} />
      </section>

      <section className="grid two">
        <GeneratedArtifactsPanel artifacts={generatedArtifacts} preview={artifactPreview} onRead={handleReadArtifact} />
        <AuditSyncPanel auditEvents={auditEvents} syncOutbox={syncOutbox} />
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="stat-card"><strong>{value}</strong><span>{label}</span></div>
}

function InstallPlanPanel({ plan }: { plan: InstallPlan }) {
  return <section className="panel plan-panel"><div className="panel-header"><h2>Install Plan</h2><span>{plan.totalAgents} agents · {plan.totalFiles} files</span></div><div className="plan-grid">{plan.targets.map((target) => <div key={target.runtime} className="plan-card"><strong>{target.runtime}</strong><span>{target.scope}</span><small>{target.filesToWrite} files · {target.agentsToInstall} agents</small>{target.targetDirs.map((dir) => <code key={dir}>{dir}</code>)}{target.postActions.map((action) => <em key={action}>post: {action}</em>)}{target.warnings.map((warning) => <em key={warning}>warning: {warning}</em>)}</div>)}</div>{plan.conflicts.length > 0 && <div className="conflicts"><h3>Overwrite conflicts backed up before install</h3>{plan.conflicts.slice(0, 12).map((conflict) => <p key={`${conflict.runtime}-${conflict.path}`}>{conflict.runtime}: {conflict.path}</p>)}{plan.conflicts.length > 12 && <p>...and {plan.conflicts.length - 12} more</p>}</div>}</section>
}

function DoctorPanel({ report }: { report: DoctorReport }) {
  return <section className="panel doctor-panel"><div className="panel-header"><h2>Agent Doctor</h2><span>{report.summary.ok} ok · {report.summary.warning} warnings · {report.summary.error} errors</span></div><div className="doctor-list">{report.checks.map((check) => <div key={check.id} className={`doctor-card ${check.status}`}><strong>{check.label}</strong><span>{check.status}</span><small>{check.message}</small>{check.remediation && <em>{check.remediation}</em>}</div>)}</div></section>
}

function BundlePanel({ bundles }: { bundles: AgentBundle[] }) {
  return <section className="panel"><div className="panel-header"><h2>Agent Bundle Preview</h2><span>{bundles.length}</span></div><div className="bundle-list">{bundles.slice(0, 8).map((bundle) => <div key={bundle.bundleId} className="bundle-card"><strong>{bundle.profile.name}</strong><span>{bundle.bundleId} · {bundle.version}</span><small>{bundle.profile.description}</small><code>{bundle.targets.join(', ')}</code></div>)}</div></section>
}

function McpPanel({ servers }: { servers: McpServerConfig[] }) {
  return <section className="panel"><div className="panel-header"><h2>Buddy MCP Registry</h2><span>{servers.length}</span></div><div className="compact-list">{servers.map((server) => <div key={server.id} className="compact-card"><strong>{server.name}</strong><span>{server.transport} · {server.enabled ? 'enabled' : 'disabled'} · {server.policy.approvalRequired ? 'approval' : 'no approval'}</span><small>{server.url ?? server.command ?? server.id}</small></div>)}</div></section>
}

function SkillPanel({ skills, targets }: { skills: SkillPackage[]; targets: SkillTargetPath[] }) {
  return <section className="panel"><div className="panel-header"><h2>Buddy Skills</h2><span>{skills.length} skills · {targets.length} targets</span></div><div className="compact-list">{skills.map((skill) => <div key={skill.id} className="compact-card"><strong>{skill.name}</strong><span>{skill.source} · {skill.syncMode}</span><small>{skill.enabledTargets.join(', ')}</small></div>)}</div></section>
}

function EventList({ events }: { events: InstallEvent[] }) {
  return <div className="event-list">{events.slice(0, 12).map((event) => <div key={event.id} className={`event-card ${event.level}`}><strong>{event.level}</strong><span>{event.runtime ?? 'system'} · {new Date(event.createdAt * 1000).toLocaleString()}</span><small>{event.message}</small></div>)}</div>
}

function InstallationPanel({ installations, busy, onUninstall }: { installations: AgentInstallation[]; busy: boolean; onUninstall: (id: string) => void }) {
  return <section className="panel"><div className="panel-header"><h2>Installations</h2><span>{installations.length}</span></div><div className="install-list">{installations.map((installation) => <div key={installation.id} className="install-card"><div><strong>{installation.runtime}</strong><span>{installation.agentId}</span><small>{installation.targetPath}</small><small>{installation.installedFiles.length} files · {new Date(installation.installedAt * 1000).toLocaleString()}</small></div><button disabled={busy} onClick={() => onUninstall(installation.id)}>Uninstall</button></div>)}</div></section>
}

function BackupPanel({ backups, busy, onRestore }: { backups: InstallBackup[]; busy: boolean; onRestore: (id: string) => void }) {
  return <section className="panel"><div className="panel-header"><h2>Backups</h2><span>{backups.length}</span></div><div className="install-list">{backups.slice(0, 20).map((backup) => <div key={backup.id} className="install-card"><div><strong>{backup.runtime}</strong><span>{new Date(backup.createdAt * 1000).toLocaleString()}</span><small>{backup.originalPath}</small><small>{backup.backupPath}</small></div><button disabled={busy} onClick={() => onRestore(backup.id)}>Restore</button></div>)}</div></section>
}

function GeneratedArtifactsPanel({ artifacts, preview, onRead }: { artifacts: GeneratedArtifact[]; preview: string; onRead: (path: string) => void }) {
  return <section className="panel"><div className="panel-header"><h2>Generated Artifacts</h2><span>{artifacts.length}</span></div><div className="artifact-layout"><div className="compact-list">{artifacts.slice(0, 30).map((artifact) => <button key={artifact.absolutePath} className="artifact-button" onClick={() => onRead(artifact.absolutePath)}><strong>{artifact.runtime}</strong><span>{artifact.relativePath}</span><small>{artifact.sizeBytes} bytes</small></button>)}</div><pre className="artifact-preview">{preview || 'Select a generated artifact to preview it.'}</pre></div></section>
}

function AuditSyncPanel({ auditEvents, syncOutbox }: { auditEvents: AuditEvent[]; syncOutbox: SyncOutboxEvent[] }) {
  return <section className="panel"><div className="panel-header"><h2>Audit / Sync</h2><span>{auditEvents.length} audit · {syncOutbox.length} sync</span></div><div className="audit-sync-grid"><div>{auditEvents.slice(0, 12).map((event) => <div key={event.id} className={`event-card ${event.severity}`}><strong>{event.action}</strong><span>{event.severity} · {event.runtime ?? 'system'}</span><small>{event.message}</small></div>)}</div><div>{syncOutbox.slice(0, 12).map((event) => <div key={event.id} className={`event-card ${event.status}`}><strong>{event.eventType}</strong><span>{event.status} · retry {event.retryCount}</span><small>{event.aggregateType}:{event.aggregateId}</small></div>)}</div></div></section>
}

function toggleSet<T>(current: Set<T>, value: T): Set<T> {
  const next = new Set(current)
  next.has(value) ? next.delete(value) : next.add(value)
  return next
}

export default App
