import { useEffect, useMemo, useState } from 'react'
import {
  executeRetentionCleanup,
  getLocalDaemonStatus,
  previewRetentionCleanupPlan,
  startLocalDaemon,
  stopLocalDaemon,
} from './tauri'
import type { LocalDaemonStatus, RetentionCleanupPlan, RetentionCleanupResult } from './consoleTypes'

export default function OperationalControls() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Ready')
  const [daemon, setDaemon] = useState<LocalDaemonStatus | null>(null)
  const [cleanupPlan, setCleanupPlan] = useState<RetentionCleanupPlan | null>(null)
  const [cleanupResult, setCleanupResult] = useState<RetentionCleanupResult | null>(null)

  const cleanupCount = useMemo(() => {
    if (!cleanupPlan) return 0
    return cleanupPlan.generatedCandidates.length + cleanupPlan.backupCandidates.length
  }, [cleanupPlan])

  useEffect(() => {
    getLocalDaemonStatus().then(setDaemon).catch((error) => setMessage(String(error)))
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

  async function refreshDaemon() {
    await run('Refreshing daemon status', async () => {
      setDaemon(await getLocalDaemonStatus())
      setMessage('Daemon status refreshed')
    })
  }

  async function startDaemon() {
    await run('Starting local daemon', async () => {
      const result = await startLocalDaemon()
      setDaemon(result.status)
      setMessage(result.message)
    })
  }

  async function stopDaemon() {
    await run('Stopping local daemon', async () => {
      const result = await stopLocalDaemon()
      setDaemon(result.status)
      setMessage(result.message)
    })
  }

  async function loadCleanupPlan() {
    await run('Previewing retention cleanup', async () => {
      setCleanupPlan(await previewRetentionCleanupPlan())
      setCleanupResult(null)
      setMessage('Retention cleanup preview ready')
    })
  }

  async function executeCleanup() {
    await run('Executing retention cleanup', async () => {
      setCleanupResult(await executeRetentionCleanup(true))
      setCleanupPlan(await previewRetentionCleanupPlan())
      setMessage('Retention cleanup executed')
    })
  }

  return <aside className={open ? 'ops-dock open' : 'ops-dock'}>
    <button className="ops-dock-toggle" onClick={() => setOpen(!open)}>
      {open ? '关闭运维' : '运维控制'}
    </button>
    {open && <div className="ops-dock-panel">
      <div className="ops-dock-header">
        <strong>Agent Buddy 运维控制</strong>
        <span>{busy ? 'Working' : message}</span>
      </div>

      <section className="ops-section">
        <div className="ops-section-title">
          <strong>Local HTTP / MCP Daemon</strong>
          <span>{daemon?.state ?? 'unknown'}</span>
        </div>
        <div className="ops-metrics">
          <Metric label="Base URL" value={daemon?.baseUrl ?? '-'} />
          <Metric label="Routes" value={String(daemon?.routeCount ?? 0)} />
          <Metric label="MCP" value={String(daemon?.mcpServerCount ?? 0)} />
        </div>
        {daemon?.warnings?.length ? <div className="ops-warning">{daemon.warnings.join(' / ')}</div> : null}
        <div className="ops-actions">
          <button disabled={busy} onClick={refreshDaemon}>刷新状态</button>
          <button disabled={busy || daemon?.state === 'running'} onClick={startDaemon}>启动</button>
          <button disabled={busy || daemon?.state !== 'running'} onClick={stopDaemon}>停止</button>
        </div>
      </section>

      <section className="ops-section">
        <div className="ops-section-title">
          <strong>Retention Cleanup</strong>
          <span>{cleanupCount} item(s)</span>
        </div>
        <div className="ops-metrics">
          <Metric label="Generated" value={String(cleanupPlan?.generatedCandidates.length ?? 0)} />
          <Metric label="Backups" value={String(cleanupPlan?.backupCandidates.length ?? 0)} />
          <Metric label="Bytes" value={String(cleanupPlan?.totalBytes ?? 0)} />
        </div>
        {cleanupPlan?.warnings?.length ? <div className="ops-warning">{cleanupPlan.warnings.join(' / ')}</div> : null}
        <div className="ops-actions">
          <button disabled={busy} onClick={loadCleanupPlan}>预览清理</button>
          <button disabled={busy || cleanupCount === 0} onClick={executeCleanup}>确认执行</button>
        </div>
        {cleanupResult && <div className="ops-result">
          <strong>最近清理结果</strong>
          <span>Deleted {cleanupResult.deleted.length}, Failed {cleanupResult.failed.length}, Bytes {cleanupResult.totalDeletedBytes}</span>
        </div>}
      </section>
    </div>}
  </aside>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="ops-metric"><span>{label}</span><strong>{value}</strong></div>
}
