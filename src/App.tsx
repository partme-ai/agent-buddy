import { useEffect, useMemo, useState } from 'react'
import {
  detectRuntimes,
  installAgents,
  listAgents,
  listInstallations,
  refreshAgentSource,
  uninstallInstallation,
} from './tauri'
import type { AgentInstallation, InstallTarget, LocalAgentSummary, RuntimeDetection, RuntimeKind } from './types'

function App() {
  const [agents, setAgents] = useState<LocalAgentSummary[]>([])
  const [runtimes, setRuntimes] = useState<RuntimeDetection[]>([])
  const [installations, setInstallations] = useState<AgentInstallation[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [projectDir, setProjectDir] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [selectedRuntimes, setSelectedRuntimes] = useState<Set<RuntimeKind>>(new Set())
  const [status, setStatus] = useState('Ready')
  const [busy, setBusy] = useState(false)

  async function reload() {
    const [nextAgents, nextRuntimes, nextInstallations] = await Promise.all([
      listAgents(),
      detectRuntimes(),
      listInstallations(),
    ])
    setAgents(nextAgents)
    setRuntimes(nextRuntimes)
    setInstallations(nextInstallations)
  }

  useEffect(() => {
    reload().catch((error) => setStatus(String(error)))
  }, [])

  const categories = useMemo(() => ['all', ...Array.from(new Set(agents.map((agent) => agent.category))).sort()], [agents])
  const filteredAgents = useMemo(() => {
    const normalized = query.toLowerCase()
    return agents.filter((agent) => {
      const matchesCategory = category === 'all' || agent.category === category
      const matchesQuery = !normalized || `${agent.name} ${agent.description} ${agent.slug}`.toLowerCase().includes(normalized)
      return matchesCategory && matchesQuery
    })
  }, [agents, category, query])

  function toggleAgent(id: string) {
    setSelectedAgents((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleRuntime(kind: RuntimeKind) {
    setSelectedRuntimes((current) => {
      const next = new Set(current)
      next.has(kind) ? next.delete(kind) : next.add(kind)
      return next
    })
  }

  async function handleRefreshSource() {
    setBusy(true)
    try {
      const result = await refreshAgentSource()
      setStatus(result.message)
      await reload()
    } catch (error) {
      setStatus(String(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleInstall() {
    const targets: InstallTarget[] = Array.from(selectedRuntimes).map((runtime) => ({
      runtime,
      projectDir: projectDir || null,
      customDir: null,
      categoryFilters: [],
    }))
    setBusy(true)
    try {
      const result = await installAgents(Array.from(selectedAgents), targets)
      setStatus(`Installed to ${result.length} runtime target(s).`)
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
          <h1>Install agency-agents-zh agents into 18 local AI runtimes.</h1>
          <p>Local-first Tauri/Rust client for runtime detection, source scanning, conversion, installation, and local state records.</p>
        </div>
        <button disabled={busy} onClick={handleRefreshSource}>Refresh Source</button>
      </section>

      <div className="status">{status}</div>

      <section className="grid two">
        <div className="panel">
          <div className="panel-header"><h2>Runtimes</h2><span>{runtimes.length}</span></div>
          <div className="runtime-list">
            {runtimes.map((runtime) => (
              <label key={runtime.kind} className={`runtime-card ${runtime.detected ? 'detected' : ''}`}>
                <input checked={selectedRuntimes.has(runtime.kind)} onChange={() => toggleRuntime(runtime.kind)} type="checkbox" />
                <div>
                  <strong>{runtime.label}</strong>
                  <span>{runtime.scope} · {runtime.detected ? 'detected' : 'not detected'}</span>
                  <small>{runtime.defaultTarget ?? runtime.configDir ?? 'manual path may be required'}</small>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h2>Install Wizard</h2><span>{selectedAgents.size} agents · {selectedRuntimes.size} runtimes</span></div>
          <label className="field">
            Project directory for project-level runtimes
            <input value={projectDir} onChange={(event) => setProjectDir(event.target.value)} placeholder="/path/to/project" />
          </label>
          <button disabled={busy} onClick={handleInstall}>Install selected agents</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Agents</h2><span>{filteredAgents.length} shown · {agents.length} total</span></div>
        <div className="filters">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents" />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
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
                <span>{agent.category} · {agent.slug}</span>
                <p>{agent.description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Installations</h2><span>{installations.length}</span></div>
        <div className="install-list">
          {installations.map((installation) => (
            <div key={installation.id} className="install-card">
              <div>
                <strong>{installation.runtime}</strong>
                <span>{installation.agentId}</span>
                <small>{installation.targetPath}</small>
              </div>
              <button disabled={busy} onClick={() => handleUninstall(installation.id)}>Uninstall</button>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
