import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { PaasConnectionStatus, PaasLoginRequest, PaasSyncPreview } from './types'

type PaasHttpResult = {
  endpoint: string
  method: string
  ok: boolean
  statusCode?: number | null
  sentAt: number
  requestBodyPreview: string
  responsePreview: string
  error?: string | null
}

type PaasBundleCacheEntry = {
  bundleId: string
  version: string
  name: string
  description: string
  category: string
  workspaceId?: string | null
  targetCount: number
  skillCount: number
  mcpCount: number
  knowledgeSpaceCount: number
  cachedAt: number
}

type SchemaMigrationRecord = {
  version: number
  name: string
  appliedAt: number
}

type CachedBundleInstallPlan = {
  sourceId: string
  totalAgents: number
  totalFiles: number
  targets: Array<{ runtime: string; filesToWrite: number; targetDirs: string[]; warnings: string[] }>
  conflicts: Array<{ runtime: string; path: string; reason: string }>
  warnings: string[]
}

type CachedBundleInstallResult = {
  runtime: string
  installedCount: number
  targetPath: string
  filesWritten: number
  warnings: string[]
}

type InstallTarget = {
  runtime: string
  projectDir?: string | null
  customDir?: string | null
  categoryFilters: string[]
}

const RUNTIME_OPTIONS = [
  ['auto', 'Auto from Bundle'],
  ['claude-code', 'Claude Code'],
  ['copilot', 'GitHub Copilot'],
  ['antigravity', 'Antigravity'],
  ['gemini-cli', 'Gemini CLI'],
  ['opencode', 'OpenCode'],
  ['openclaw', 'OpenClaw'],
  ['cursor', 'Cursor'],
  ['trae', 'TRAE'],
  ['aider', 'Aider'],
  ['windsurf', 'Windsurf'],
  ['qwen', 'Qwen Code'],
  ['codex', 'Codex CLI'],
  ['deerflow', 'DeerFlow'],
  ['workbuddy', 'WorkBuddy'],
  ['codewhale', 'CodeWhale'],
  ['hermes', 'Hermes Agent'],
  ['kiro', 'Kiro'],
  ['qoder', 'Qoder'],
]

const PROJECT_RUNTIMES = new Set(['opencode', 'cursor', 'trae', 'aider', 'windsurf', 'qwen', 'codex', 'qoder'])
const CUSTOM_RUNTIMES = new Set(['deerflow'])

function bundleKey(bundle: PaasBundleCacheEntry) {
  return `${bundle.bundleId}@${bundle.version}`
}

export default function PaaSControlsDock() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Ready')
  const [status, setStatus] = useState<PaasConnectionStatus | null>(null)
  const [preview, setPreview] = useState<PaasSyncPreview | null>(null)
  const [cache, setCache] = useState<PaasBundleCacheEntry[]>([])
  const [migrations, setMigrations] = useState<SchemaMigrationRecord[]>([])
  const [result, setResult] = useState<PaasHttpResult | null>(null)
  const [bundlePlan, setBundlePlan] = useState<CachedBundleInstallPlan | null>(null)
  const [installResults, setInstallResults] = useState<CachedBundleInstallResult[]>([])
  const [selectedBundleKey, setSelectedBundleKey] = useState('')
  const [targetRuntime, setTargetRuntime] = useState('auto')
  const [projectDir, setProjectDir] = useState('')
  const [customDir, setCustomDir] = useState('')
  const [form, setForm] = useState<PaasLoginRequest>({ baseUrl: '', workspaceId: '', userId: '', accessToken: '' })

  useEffect(() => {
    refresh().catch((error) => setMessage(String(error)))
  }, [])

  async function run(label: string, work: () => Promise<void>) {
    setBusy(true)
    setMessage(label)
    try {
      await work()
    } catch (error) {
      setMessage(String(error))
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    const [nextStatus, nextPreview, nextCache, nextMigrations] = await Promise.all([
      invoke<PaasConnectionStatus>('get_paas_connection_status').catch(() => null),
      invoke<PaasSyncPreview>('preview_paas_sync').catch(() => null),
      invoke<PaasBundleCacheEntry[]>('list_paas_bundle_cache').catch(() => []),
      invoke<SchemaMigrationRecord[]>('list_schema_migrations').catch(() => []),
    ])
    setStatus(nextStatus)
    setPreview(nextPreview)
    setCache(nextCache)
    setMigrations(nextMigrations)
    if (nextCache.length > 0 && !nextCache.some((bundle) => bundleKey(bundle) === selectedBundleKey)) {
      setSelectedBundleKey(bundleKey(nextCache[0]))
      setBundlePlan(null)
      setInstallResults([])
    }
    if (nextCache.length === 0) {
      setSelectedBundleKey('')
      setBundlePlan(null)
      setInstallResults([])
    }
    if (nextStatus?.baseUrl && !form.baseUrl) setForm((current) => ({ ...current, baseUrl: nextStatus.baseUrl }))
  }

  async function saveSession() {
    await run('Saving PaaS session', async () => {
      await invoke('create_paas_session', { request: form })
      await refresh()
      setMessage('PaaS session saved locally')
    })
  }

  async function clearSession() {
    await run('Clearing PaaS session', async () => {
      await invoke('clear_paas_session')
      setResult(null)
      setBundlePlan(null)
      setInstallResults([])
      await refresh()
      setMessage('PaaS session cleared')
    })
  }

  async function execute(command: 'execute_device_registration' | 'pull_paas_bundles' | 'push_sync_outbox') {
    await run(command, async () => {
      setResult(await invoke<PaasHttpResult>(command))
      await refresh()
    })
  }

  function selectedTargets(): InstallTarget[] {
    if (targetRuntime === 'auto') return []
    return [{
      runtime: targetRuntime,
      projectDir: projectDir.trim() || null,
      customDir: customDir.trim() || null,
      categoryFilters: [],
    }]
  }

  async function previewSelectedBundleInstall() {
    if (!selectedBundle) return
    await run('Previewing cached PaaS bundle install plan', async () => {
      const plan = await invoke<CachedBundleInstallPlan>('build_cached_paas_bundle_install_plan', {
        bundleId: selectedBundle.bundleId,
        version: selectedBundle.version,
        targets: selectedTargets(),
      })
      setBundlePlan(plan)
      setInstallResults([])
      setMessage(`Install plan ready: ${plan.totalFiles} file(s)`)
    })
  }

  async function installSelectedBundle() {
    if (!selectedBundle) return
    await run('Installing cached PaaS bundle', async () => {
      const results = await invoke<CachedBundleInstallResult[]>('install_cached_paas_bundle', {
        bundleId: selectedBundle.bundleId,
        version: selectedBundle.version,
        targets: selectedTargets(),
      })
      setInstallResults(results)
      await refresh()
      setMessage(`Installed cached bundle into ${results.length} runtime(s)`)
    })
  }

  const selectedBundle = cache.find((bundle) => bundleKey(bundle) === selectedBundleKey) ?? cache[0]
  const latestMigration = migrations[migrations.length - 1]
  const needsProjectDir = PROJECT_RUNTIMES.has(targetRuntime)
  const needsCustomDir = CUSTOM_RUNTIMES.has(targetRuntime)
  const explicitTargetReady = targetRuntime === 'auto' || (!needsProjectDir || projectDir.trim()) && (!needsCustomDir || customDir.trim())

  return <aside className={open ? 'paas-dock open' : 'paas-dock'}>
    <button className="paas-dock-toggle" onClick={() => setOpen(!open)}>{open ? '关闭 PaaS' : 'PaaS 同步'}</button>
    {open && <div className="paas-dock-panel">
      <div className="paas-dock-header">
        <strong>Agent PaaS 连接</strong>
        <span>{busy ? 'Working' : message}</span>
      </div>

      <section className="paas-section">
        <strong>连接状态</strong>
        <div className="paas-metrics">
          <Metric label="Configured" value={status?.configured ? 'yes' : 'no'} />
          <Metric label="Auth" value={status?.authenticated ? 'yes' : 'no'} />
          <Metric label="Pending" value={String(preview?.pendingEvents ?? 0)} />
          <Metric label="Cached" value={String(cache.length)} />
          <Metric label="Schema" value={latestMigration ? `v${latestMigration.version}` : '-'} />
        </div>
        <p>{status?.message ?? 'No status loaded.'}</p>
        <button disabled={busy} onClick={() => run('Refreshing PaaS status', refresh)}>刷新</button>
      </section>

      <section className="paas-section paas-form">
        <strong>本地会话</strong>
        <input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} placeholder="PaaS Base URL" />
        <input value={form.workspaceId} onChange={(event) => setForm({ ...form, workspaceId: event.target.value })} placeholder="Workspace ID" />
        <input value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} placeholder="User ID" />
        <input value={form.accessToken} onChange={(event) => setForm({ ...form, accessToken: event.target.value })} placeholder="Access Token" type="password" />
        <div className="paas-actions">
          <button disabled={busy || !form.baseUrl || !form.accessToken} onClick={saveSession}>保存会话</button>
          <button disabled={busy} onClick={clearSession}>清除会话</button>
        </div>
      </section>

      <section className="paas-section">
        <strong>执行同步</strong>
        <div className="paas-actions">
          <button disabled={busy || !status?.authenticated} onClick={() => execute('execute_device_registration')}>注册设备</button>
          <button disabled={busy || !status?.authenticated} onClick={() => execute('pull_paas_bundles')}>拉取 Bundles</button>
          <button disabled={busy || !status?.authenticated} onClick={() => execute('push_sync_outbox')}>推送 Outbox</button>
        </div>
      </section>

      <section className="paas-section paas-form">
        <strong>Bundle Cache / Schema</strong>
        <p>{selectedBundle ? `${selectedBundle.name} · ${selectedBundle.version} · ${selectedBundle.category}` : '暂无 PaaS Bundle 缓存。'}</p>
        <p>{latestMigration ? `Latest migration: ${latestMigration.name}` : 'Schema migration 尚未初始化。'}</p>
        <select value={selectedBundle ? bundleKey(selectedBundle) : ''} onChange={(event) => { setSelectedBundleKey(event.target.value); setBundlePlan(null); setInstallResults([]) }}>
          {cache.length === 0 && <option value="">No cached bundle</option>}
          {cache.map((bundle) => <option key={bundleKey(bundle)} value={bundleKey(bundle)}>{bundle.name} · {bundle.version} · {bundle.category}</option>)}
        </select>
        {selectedBundle && <p>{selectedBundle.description || 'No bundle description.'}</p>}
        {selectedBundle && <div className="paas-metrics">
          <Metric label="Targets" value={String(selectedBundle.targetCount)} />
          <Metric label="Skills" value={String(selectedBundle.skillCount)} />
          <Metric label="MCP" value={String(selectedBundle.mcpCount)} />
          <Metric label="Knowledge" value={String(selectedBundle.knowledgeSpaceCount)} />
        </div>}
        <select value={targetRuntime} onChange={(event) => { setTargetRuntime(event.target.value); setBundlePlan(null); setInstallResults([]) }}>
          {RUNTIME_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input value={projectDir} onChange={(event) => setProjectDir(event.target.value)} placeholder="Project runtime 目录，例如 E:\\project\\demo" />
        <input value={customDir} onChange={(event) => setCustomDir(event.target.value)} placeholder="Custom runtime 目录，例如 DEERFLOW_SKILLS_DIR" />
        {targetRuntime === 'auto' && <p>Auto 会使用选中 Bundle 声明的 targets；如果包含项目级 runtime，建议改为显式选择 runtime 并填写 Project 目录。</p>}
        {needsProjectDir && !projectDir.trim() && <p>当前 runtime 需要 projectDir。</p>}
        {needsCustomDir && !customDir.trim() && <p>当前 runtime 建议填写 customDir。</p>}
        <div className="paas-actions">
          <button disabled={busy || !selectedBundle || !explicitTargetReady} onClick={previewSelectedBundleInstall}>预览安装计划</button>
          <button disabled={busy || !selectedBundle || !explicitTargetReady} onClick={installSelectedBundle}>安装选中缓存 Bundle</button>
        </div>
      </section>

      {bundlePlan && <section className="paas-section">
        <strong>Cached Bundle Install Plan</strong>
        <p>{bundlePlan.totalFiles} file(s), {bundlePlan.targets.length} runtime target(s), {bundlePlan.conflicts.length} conflict(s)</p>
        {bundlePlan.targets.length > 0 && <pre>{bundlePlan.targets.map((target) => `${target.runtime}: ${target.filesToWrite} file(s) -> ${target.targetDirs.join('; ')}`).join('\n')}</pre>}
        {bundlePlan.conflicts.length > 0 && <pre>{bundlePlan.conflicts.map((conflict) => `${conflict.runtime}: ${conflict.path} · ${conflict.reason}`).join('\n')}</pre>}
        {bundlePlan.warnings.length > 0 && <pre>{bundlePlan.warnings.join('\n')}</pre>}
      </section>}

      {installResults.length > 0 && <section className="paas-section">
        <strong>Cached Bundle Install Result</strong>
        <pre>{installResults.map((item) => `${item.runtime}: ${item.filesWritten} file(s) -> ${item.targetPath}`).join('\n')}</pre>
      </section>}

      {result && <section className={result.ok ? 'paas-result ok' : 'paas-result error'}>
        <strong>{result.method} {result.statusCode ?? 'ERR'} · {result.ok ? 'OK' : 'FAILED'}</strong>
        <span>{result.endpoint}</span>
        {result.error && <em>{result.error}</em>}
        <pre>{result.responsePreview || result.requestBodyPreview}</pre>
      </section>}
    </div>}
  </aside>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="paas-metric"><span>{label}</span><strong>{value}</strong></div>
}