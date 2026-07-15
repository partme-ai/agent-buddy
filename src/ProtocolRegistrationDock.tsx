import { useEffect, useState } from 'react'
import { parseDeepLink } from './tauri'
import type { DeepLinkRequest } from './types'

export default function ProtocolRegistrationDock() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Ready')
  const [status, setStatus] = useState<DeepLinkRequest | null>(null)

  useEffect(() => {
    check().catch((error) => setMessage(String(error)))
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

  async function check() {
    const result = await parseDeepLink('agentbuddy://register-protocol')
    setStatus(result)
    setMessage(result.params.registrationMessage ?? 'Protocol status checked')
  }

  async function register() {
    await run('Registering agentbuddy:// protocol', async () => {
      const result = await parseDeepLink('agentbuddy://register-protocol?execute=true&confirm=true')
      setStatus(result)
      setMessage(result.params.registrationMessage ?? 'Protocol registration completed')
    })
  }

  const params = status?.params ?? {}
  const registered = params.protocolRegistered === 'true'

  return <aside className={open ? 'protocol-dock open' : 'protocol-dock'}>
    <button className="protocol-dock-toggle" onClick={() => setOpen(!open)}>{open ? '关闭协议' : '协议注册'}</button>
    {open && <div className="protocol-dock-panel">
      <div className="protocol-dock-header">
        <strong>agentbuddy:// 协议注册</strong>
        <span>{busy ? 'Working' : message}</span>
      </div>
      <div className="protocol-dock-grid">
        <Metric label="Scheme" value={params.protocolScheme ?? 'agentbuddy'} />
        <Metric label="Platform" value={params.registrationPlatform ?? '-'} />
        <Metric label="Registered" value={registered ? 'Yes' : 'No'} />
      </div>
      <div className={registered ? 'protocol-state ok' : 'protocol-state warn'}>
        {params.registrationMessage ?? '点击检查或注册本机协议处理器。'}
      </div>
      <pre>{params.registrationHandler ?? 'handler pending'}</pre>
      <div className="protocol-actions">
        <button disabled={busy} onClick={() => run('Checking protocol status', check)}>检查状态</button>
        <button disabled={busy || registered} onClick={register}>确认并注册协议</button>
      </div>
    </div>}
  </aside>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="protocol-metric"><span>{label}</span><strong>{value}</strong></div>
}
