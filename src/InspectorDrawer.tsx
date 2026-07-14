import { useEffect, useMemo, useState } from 'react'
import {
  getAgentMarkdown,
  listAgents,
  listGeneratedArtifacts,
  previewAgentRuntimeConversion,
  readGeneratedArtifact,
} from './tauri'
import type {
  AgentMarkdownPreview,
  AgentRuntimeConversionPreview,
  GeneratedArtifact,
  LocalAgentSummary,
  RuntimeKind,
} from './types'

type InspectorTab = 'markdown' | 'conversion' | 'artifact'

const runtimeOptions: RuntimeKind[] = [
  'claude-code', 'copilot', 'antigravity', 'gemini-cli', 'opencode', 'openclaw', 'cursor', 'trae', 'aider', 'windsurf', 'qwen', 'codex', 'deerflow', 'workbuddy', 'codewhale', 'hermes', 'kiro', 'qoder',
]

export default function InspectorDrawer() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<InspectorTab>('markdown')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Ready')
  const [agents, setAgents] = useState<LocalAgentSummary[]>([])
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([])
  const [agentId, setAgentId] = useState('')
  const [runtime, setRuntime] = useState<RuntimeKind>('claude-code')
  const [artifactPath, setArtifactPath] = useState('')
  const [markdown, setMarkdown] = useState<AgentMarkdownPreview | null>(null)
  const [conversion, setConversion] = useState<AgentRuntimeConversionPreview | null>(null)
  const [artifactText, setArtifactText] = useState('')

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === agentId) ?? null, [agents, agentId])
  const selectedArtifact = useMemo(() => artifacts.find((artifact) => artifact.absolutePath === artifactPath) ?? null, [artifacts, artifactPath])

  useEffect(() => {
    refreshCatalog().catch((error) => setMessage(String(error)))
  }, [])

  async function run(label: string, work: () => Promise<void>) {
    setBusy(true)
    setMessage(label)
    try {
      await work()
      setMessage(`${label} complete`)
    } catch (error) {
      setMessage(String(error))
    } finally {
      setBusy(false)
    }
  }

  async function refreshCatalog() {
    const [nextAgents, nextArtifacts] = await Promise.all([
      listAgents().catch(() => []),
      listGeneratedArtifacts().catch(() => []),
    ])
    setAgents(nextAgents)
    setArtifacts(nextArtifacts)
    setAgentId((current) => current || nextAgents[0]?.id || '')
    setArtifactPath((current) => current || nextArtifacts[0]?.absolutePath || '')
  }

  async function inspectMarkdown() {
    if (!agentId) return
    await run('Loading Agent Markdown', async () => {
      setMarkdown(await getAgentMarkdown(agentId))
      setTab('markdown')
      setOpen(true)
    })
  }

  async function inspectConversion() {
    if (!agentId) return
    await run('Loading Runtime Conversion', async () => {
      setConversion(await previewAgentRuntimeConversion(agentId, runtime))
      setTab('conversion')
      setOpen(true)
    })
  }

  async function inspectArtifact() {
    if (!artifactPath) return
    await run('Loading Generated Artifact', async () => {
      setArtifactText(await readGeneratedArtifact(artifactPath))
      setTab('artifact')
      setOpen(true)
    })
  }

  return <aside className={open ? 'inspector-drawer open' : 'inspector-drawer'}>
    <button className="inspector-toggle" onClick={() => setOpen(!open)}>{open ? '关闭检查器' : '检查器'}</button>
    {open && <div className="inspector-panel">
      <div className="inspector-header">
        <div>
          <strong>Persistent Inspector</strong>
          <span>{busy ? 'Working' : message}</span>
        </div>
        <button disabled={busy} onClick={() => run('Refreshing inspector catalog', refreshCatalog)}>刷新</button>
      </div>

      <div className="inspector-tabs">
        <button className={tab === 'markdown' ? 'active' : ''} onClick={() => setTab('markdown')}>Markdown</button>
        <button className={tab === 'conversion' ? 'active' : ''} onClick={() => setTab('conversion')}>Runtime</button>
        <button className={tab === 'artifact' ? 'active' : ''} onClick={() => setTab('artifact')}>Artifact</button>
      </div>

      <div className="inspector-form">
        <label>
          <span>Agent</span>
          <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {agent.category}</option>)}
          </select>
        </label>
        <label>
          <span>Runtime</span>
          <select value={runtime} onChange={(event) => setRuntime(event.target.value as RuntimeKind)}>
            {runtimeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Generated Artifact</span>
          <select value={artifactPath} onChange={(event) => setArtifactPath(event.target.value)}>
            {artifacts.map((artifact) => <option key={artifact.absolutePath} value={artifact.absolutePath}>{artifact.runtime} · {artifact.relativePath}</option>)}
          </select>
        </label>
      </div>

      <div className="inspector-actions">
        <button disabled={busy || !agentId} onClick={inspectMarkdown}>查看 Markdown</button>
        <button disabled={busy || !agentId} onClick={inspectConversion}>查看 Runtime 转换</button>
        <button disabled={busy || !artifactPath} onClick={inspectArtifact}>查看 Artifact</button>
      </div>

      {tab === 'markdown' && <section className="inspector-content">
        <div className="inspector-meta"><strong>{markdown?.name ?? selectedAgent?.name ?? 'No agent selected'}</strong><span>{markdown?.category ?? selectedAgent?.category ?? '-'}</span></div>
        <pre>{markdown?.rawMarkdown ?? 'Select an agent and click 查看 Markdown.'}</pre>
      </section>}

      {tab === 'conversion' && <section className="inspector-content">
        <div className="inspector-meta"><strong>{conversion?.runtime ?? runtime}</strong><span>{conversion?.files.length ?? 0} file(s)</span></div>
        <pre>{conversion ? conversion.files.map((file) => `# ${file.relativePath}\n${file.content}`).join('\n\n---\n\n') : 'Select an agent/runtime and click 查看 Runtime 转换.'}</pre>
      </section>}

      {tab === 'artifact' && <section className="inspector-content">
        <div className="inspector-meta"><strong>{selectedArtifact?.relativePath ?? 'No artifact selected'}</strong><span>{selectedArtifact?.runtime ?? '-'}</span></div>
        <pre>{artifactText || 'Select an artifact and click 查看 Artifact.'}</pre>
      </section>}
    </div>}
  </aside>
}
