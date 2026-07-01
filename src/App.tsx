import { useEffect, useMemo, useState } from 'react'
import {
  detectRuntimes,
  getInstallPlan,
  installAgents,
  listAgents,
  listInstallations,
  refreshAgentSource,
  runtimeDefinitions,
  uninstallInstallation,
} from './tauri'
import type {
  AgentInstallation,
  InstallPlan,
  InstallScope,
  InstallTarget,
  LocalAgentSummary,
  RuntimeDefinition,
  RuntimeDetection,
  RuntimeKind,
} from './types'

function App() {
  const [agents, setAgents] = useState<LocalAgentSummary[]>([])
  const [definitions, setDefinitions] = useState<RuntimeDefinition[]>([])
  const [runtimes, setRuntimes] = useState<RuntimeDetection[]>([])
  const [installations, setInstallations] = useState<AgentInstallation[]>([])
  const [plan, setPlan] = useState<InstallPlan | null>(null)
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
    const [nextDefinitions, nextAgents, nextRuntimes, nextInstallations] = await Promise.all([
      runtimeDefinitions(),
      listAgents(),
      detectRuntimes(),
      listInstallations(),
    ])
    setDefinitions(nextDefinitions)
    setAgents(nextAgents)
    setRuntimes(nextRuntimes)
    setInstallations(nextInstallations)
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
    setBusy(true)
    try {
      const result = await refreshAgentSource()
      setStatus(result.message)
      setPlan(null)
      await reload()
    } catch (error) {
      setStatus(String(error))
    } finally {
      setBusy(false)
    }
  }

  async function handlePlan() {
    setBusy(true)
    try {
      const nextPlan = await getInstallPlan(Array.from(selectedAgents), selectedTargets())
      setPlan(nextPlan)
      setStatus(`Install plan ready: ${nextPlan.totalAgents} agents, ${nextPlan.totalFiles} files.`)
    } catch (error) {
      setStatus(String(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleInstall() {
    setBusy(true)
    try {
      const result = await installAgents(Array.from(selectedAgents), selectedTargets())
      setStatus(`Installed ${result.reduce((sum, item) => sum + item.filesWritten, 0)} files.`)
      setPlan(null)
      await reload()
    } catch (error) {
      setStatus(String(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleUninstall(id: string) {
    setBusy(true)
    try {
      await uninstallInstallation(id)
      await reload()
      setStatus('Installation removed.')
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
            Local-first Tauri/Rust client with source scanning, runtime detection, install-plan preview,
            backup-aware writes, and installation records.
          </p>
        </div>
        <button disabled={busy} onClick={handleRefreshSource}>
          Refresh Source
        </button>
      </section>

      <div className="status">{status}</div>

      <section className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Runtime Registry</h2>
            <span>{runtimes.length} runtimes</span>
          </div>
          <div className="runtime-list">
            {runtimes.map((runtime) => {
              const definition = definitionByRuntime.get(runtime.kind)
              return (
                <label key={runtime.kind} className={`runtime-card ${runtime.detected ? 'detected' : ''}`}>
                  <input
                    checked={selectedRuntimes.has(runtime.kind)}
                    onChange={() => toggleRuntime(runtime.kind)}
                    type="checkbox"
                  />
                  <div>
                    <strong>{runtime.label}</strong>
                    <span>
                      {runtime.scope} · {runtime.detected ? 'detected' : 'not detected'}
                      {definition?.supportsNativeRegistration ? ' · native registration' : ''}
                    </span>
                    <small>{runtime.defaultTarget ?? runtime.configDir ?? 'manual path may be required'}</small>
                    {runtime.notes.map((note) => (
                      <em key={note}>{note}</em>
                    ))}
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Install Wizard</h2>
            <span>
              {selectedAgents.size} agents · {selectedRuntimes.size} runtimes
            </span>
          </div>
          <label className="field">
            Project directory for project-level runtimes
            <input value={projectDir} onChange={(event) => setProjectDir(event.target.value)} placeholder="/path/to/project" />
          </label>
          <label className="field">
            Custom directory for DeerFlow/custom installs
            <input value={customDir} onChange={(event) => setCustomDir(event.target.value)} placeholder="/path/to/skills/custom" />
          </label>
          <label className="field">
            Hermes categories, comma-separated
            <input value={hermesCategories} onChange={(event) => setHermesCategories(event.target.value)} placeholder="engineering,marketing" />
          </label>
          <div className="actions">
            <button disabled={busy || selectedRuntimes.size === 0} onClick={handlePlan}>
              Generate Install Plan
            </button>
            <button disabled={busy || selectedRuntimes.size === 0} onClick={handleInstall}>
              Execute Install
            </button>
          </div>
        </div>
      </section>

      {plan && <InstallPlanPanel plan={plan} />}

      <section className="panel">
        <div className="panel-header">
          <h2>Agents</h2>
          <span>
            {filteredAgents.length} shown · {agents.length} total
          </span>
        </div>
        <div className="filters">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents" />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button onClick={() => setSelectedAgents(new Set(filteredAgents.map((agent) => agent.id)))}>Select shown</button>
          <button onClick={() => setSelectedAgents(new Set())}>Clear</button>
        </div>
        <div className="agent-list">
          {filteredAgents.map((agent) => (
            <label key={agent.id} className="agent-card">
              <input checked={selectedAgents.has(agent.id)} onChange={() => toggleAgent(agent.id)} type="checkbox" />
              <div>
                <strong>{agent.name || agent.slug}</strong>
                <span>
                  {agent.category} · {agent.slug}
                </span>
                <p>{agent.description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Installations</h2>
          <span>{installations.length}</span>
        </div>
        <div className="install-list">
          {installations.map((installation) => (
            <div key={installation.id} className="install-card">
              <div>
                <strong>{installation.runtime}</strong>
                <span>{installation.agentId}</span>
                <small>{installation.targetPath}</small>
                <small>{installation.installedFiles.length} files · {new Date(installation.installedAt * 1000).toLocaleString()}</small>
              </div>
              <button disabled={busy} onClick={() => handleUninstall(installation.id)}>
                Uninstall
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

function InstallPlanPanel({ plan }: { plan: InstallPlan }) {
  return (
    <section className="panel plan-panel">
      <div className="panel-header">
        <h2>Install Plan</h2>
        <span>
          {plan.totalAgents} agents · {plan.totalFiles} files
        </span>
      </div>
      <div className="plan-grid">
        {plan.targets.map((target) => (
          <div key={target.runtime} className="plan-card">
            <strong>{target.runtime}</strong>
            <span>{target.scope}</span>
            <small>{target.filesToWrite} files · {target.agentsToInstall} agents</small>
            {target.targetDirs.map((dir) => <code key={dir}>{dir}</code>)}
            {target.postActions.map((action) => <em key={action}>post: {action}</em>)}
            {target.warnings.map((warning) => <em key={warning}>warning: {warning}</em>)}
          </div>
        ))}
      </div>
      {plan.conflicts.length > 0 && (
        <div className="conflicts">
          <h3>Overwrite conflicts backed up before install</h3>
          {plan.conflicts.slice(0, 12).map((conflict) => (
            <p key={`${conflict.runtime}-${conflict.path}`}>{conflict.runtime}: {conflict.path}</p>
          ))}
          {plan.conflicts.length > 12 && <p>...and {plan.conflicts.length - 12} more</p>}
        </div>
      )}
    </section>
  )
}

function toggleSet<T>(current: Set<T>, value: T): Set<T> {
  const next = new Set(current)
  next.has(value) ? next.delete(value) : next.add(value)
  return next
}

export default App
