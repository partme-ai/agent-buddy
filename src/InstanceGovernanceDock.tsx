import { useEffect, useMemo, useState } from 'react'
import {
  assignInstanceGroup,
  deletePersistedInstance,
  listConsoleInstances,
  listPersistedInstanceGroupSummaries,
  listPersistedInstances,
  setInstanceTags,
  upsertInstance,
  upsertInstanceGroup,
} from './tauri'
import type { ConsoleInstance } from './consoleTypes'
import type { InstanceGroupSummary, InstanceKind, InstanceRecord, InstanceUpsertRequest } from './instanceTypes'
import type { RuntimeKind } from './types'

type UnifiedInstance = {
  id: string
  name: string
  kind: InstanceKind
  status: string
  source: 'backend' | 'persisted'
  runtime?: RuntimeKind | null
  path?: string | null
  description: string
  tags: string[]
  groupId?: string | null
}

export default function InstanceGovernanceDock() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Ready')
  const [backend, setBackend] = useState<ConsoleInstance[]>([])
  const [persisted, setPersisted] = useState<InstanceRecord[]>([])
  const [groups, setGroups] = useState<InstanceGroupSummary[]>([])
  const [tagDraft, setTagDraft] = useState('local,managed')
  const [groupName, setGroupName] = useState('Default Runtime Group')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')

  const unified = useMemo(() => {
    const persistedMap = new Map(persisted.map((item) => [item.id, item]))
    const backendItems = backend
      .filter((item) => !persistedMap.has(item.id))
      .map((item): UnifiedInstance => ({
        id: item.id,
        name: item.name,
        kind: normalizeKind(item.instanceType),
        status: item.status,
        source: 'backend',
        runtime: item.runtime ?? null,
        path: item.path ?? null,
        description: item.description,
        tags: item.tags,
        groupId: null,
      }))
    const persistedItems = persisted.map((item): UnifiedInstance => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      status: item.status,
      source: 'persisted',
      runtime: item.runtime ?? null,
      path: item.path ?? null,
      description: item.description,
      tags: item.tags,
      groupId: item.groupId ?? null,
    }))
    return [...persistedItems, ...backendItems]
  }, [backend, persisted])

  const summary = useMemo(() => ({
    backend: backend.length,
    persisted: persisted.length,
    groups: groups.length,
    running: unified.filter((item) => item.status === 'running').length,
  }), [backend.length, groups.length, persisted.length, unified])

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
    const [nextBackend, nextPersisted, nextGroups] = await Promise.all([
      listConsoleInstances().catch(() => []),
      listPersistedInstances().catch(() => []),
      listPersistedInstanceGroupSummaries().catch(() => []),
    ])
    setBackend(nextBackend)
    setPersisted(nextPersisted)
    setGroups(nextGroups)
    if (!selectedGroupId && nextGroups[0]) setSelectedGroupId(nextGroups[0].group.id)
  }

  async function createGroup() {
    await run('Creating instance group', async () => {
      const group = await upsertInstanceGroup({
        id: null,
        name: groupName || 'Default Runtime Group',
        description: 'Local console instance group created from Agent Buddy UI.',
        color: '#2563eb',
        sortOrder: groups.length + 1,
        tags: tagDraft.split(',').map((item) => item.trim()).filter(Boolean),
      })
      setSelectedGroupId(group.id)
      await refresh()
      setMessage(`Created group ${group.name}`)
    })
  }

  async function persist(item: UnifiedInstance) {
    await run('Persisting console instance', async () => {
      await upsertInstance(toRequest(item))
      await refresh()
      setMessage(`Persisted ${item.name}`)
    })
  }

  async function assign(item: UnifiedInstance) {
    if (!selectedGroupId) {
      setMessage('Create or select a group first')
      return
    }
    await run('Assigning instance group', async () => {
      if (item.source === 'backend') await upsertInstance(toRequest(item))
      await assignInstanceGroup(item.id, selectedGroupId)
      await refresh()
      setMessage(`Assigned ${item.name}`)
    })
  }

  async function updateTags(item: UnifiedInstance) {
    await run('Updating tags', async () => {
      if (item.source === 'backend') await upsertInstance(toRequest(item))
      await setInstanceTags(item.id, tagDraft.split(',').map((entry) => entry.trim()).filter(Boolean))
      await refresh()
      setMessage(`Updated tags for ${item.name}`)
    })
  }

  async function remove(item: UnifiedInstance) {
    if (item.source !== 'persisted') return
    await run('Deleting persisted instance', async () => {
      await deletePersistedInstance(item.id)
      await refresh()
      setMessage(`Deleted ${item.name}`)
    })
  }

  return <aside className={open ? 'instance-dock open' : 'instance-dock'}>
    <button className="instance-dock-toggle" onClick={() => setOpen(!open)}>{open ? '关闭实例治理' : '实例治理'}</button>
    {open && <div className="instance-dock-panel">
      <div className="instance-dock-header">
        <strong>实例治理</strong>
        <span>{busy ? 'Working' : message}</span>
      </div>
      <div className="instance-dock-metrics">
        <Metric label="Backend" value={summary.backend} />
        <Metric label="Persisted" value={summary.persisted} />
        <Metric label="Groups" value={summary.groups} />
        <Metric label="Running" value={summary.running} />
      </div>
      <div className="instance-dock-actions">
        <button disabled={busy} onClick={() => run('Refreshing instances', refresh)}>刷新</button>
      </div>

      <section className="instance-dock-section">
        <strong>分组与标签</strong>
        <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="分组名称" />
        <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder="标签，用逗号分隔" />
        <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>
          <option value="">未选择分组</option>
          {groups.map((group) => <option key={group.group.id} value={group.group.id}>{group.group.name} ({group.instanceCount})</option>)}
        </select>
        <button disabled={busy} onClick={createGroup}>创建分组</button>
      </section>

      <section className="instance-dock-section instance-dock-list">
        <strong>Backend + Persisted Instances</strong>
        {unified.length === 0 && <div className="instance-empty">暂无实例。点击刷新重新聚合。</div>}
        {unified.slice(0, 80).map((item) => <article className="instance-dock-card" key={`${item.source}:${item.id}`}>
          <div>
            <strong>{item.name}</strong>
            <span>{item.kind} / {item.status} / {item.source}</span>
          </div>
          <p>{item.description || item.path || item.id}</p>
          <div className="instance-tags">{item.tags.slice(0, 5).map((tag) => <em key={tag}>{tag}</em>)}</div>
          <div className="instance-dock-actions">
            {item.source === 'backend' && <button disabled={busy} onClick={() => persist(item)}>固化</button>}
            <button disabled={busy} onClick={() => assign(item)}>分组</button>
            <button disabled={busy} onClick={() => updateTags(item)}>打标签</button>
            {item.source === 'persisted' && <button disabled={busy} onClick={() => remove(item)}>删除</button>}
          </div>
        </article>)}
      </section>
    </div>}
  </aside>
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="instance-dock-metric"><span>{label}</span><strong>{value}</strong></div>
}

function toRequest(item: UnifiedInstance): InstanceUpsertRequest {
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    runtime: item.runtime ?? null,
    groupId: item.groupId ?? null,
    status: item.status || 'running',
    path: item.path ?? null,
    description: item.description || item.id,
    tags: item.tags,
    metadataJson: JSON.stringify({ source: item.source, importedFrom: 'console-instance' }),
  }
}

function normalizeKind(value: string): InstanceKind {
  const known: InstanceKind[] = ['runtime', 'agent-installation', 'mcp-service', 'knowledge-mirror', 'memory-service', 'session-service', 'local-api', 'connector', 'tool']
  return known.includes(value as InstanceKind) ? value as InstanceKind : 'runtime'
}
