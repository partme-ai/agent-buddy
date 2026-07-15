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

  async function previewLatestBundleInstall() {
    if (!latestBundle) return
    await run('Previewing cached PaaS bundle install plan', async () => {
      const plan = await invoke<CachedBundleInstallPlan>('build_cached_paas_bundle_install_plan', {
        bundleId: latestBundle.bundleId,
        version: latestBundle.version,
        targets: [],
      })
      setBundlePlan(plan)
      setInstallResults([])
      setMessage(`Install plan ready: ${plan.totalFiles} file(s)`)
    })
  }

  async function installLatestBundle() {
    if (!latestBundle) return
    await run('Installing cached PaaS bundle', async () => {
      const results = await invoke<CachedBundleInstallResult[]>('install_cached_paas_bundle', {
        bundleId: latestBundle.bundleId,
        version: latestBundle.version,
        targets: [],
      })
      setInstallResults(results)
      await refresh()
      setMessage(`Installed cached bundle into ${results.length} runtime(s)`)
    })
  }

  const latestBundle = cache[0]
  const latestMigration = migrations[migrations.length - 1]

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

      <section className="paas-section">
        <strong>Bundle Cache / Schema</strong>
        <p>{latestBundle ? `${latestBundle.name} · ${latestBundle.version} · ${latestBundle.category}` : '暂无 PaaS Bundle 缓存。'}</p>
        <p>{latestMigration ? `Latest migration: ${latestMigration.name}` : 'Schema migration 尚未初始化。'}</p>
        <div className="paas-actions">
          <button disabled={busy || !latestBundle} onClick={previewLatestBundleInstall}>预览安装计划</button>
          <button disabled={busy || !latestBundle} onClick={installLatestBundle}>安装最新缓存 Bundle</button>
        </div>
      </section>

      {bundlePlan && <section className="paas-section">
        <strong>Cached Bundle Install Plan</strong>
        <p>{bundlePlan.totalFiles} file(s), {bundlePlan.targets.length} runtime target(s), {bundlePlan.conflicts.length} conflict(s)</p>
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
