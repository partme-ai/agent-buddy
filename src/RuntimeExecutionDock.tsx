import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { MemoryCandidate, MemoryItem } from './types'

type KnowledgeRuntimeHit = {
  spaceId: string
  spaceName: string
  source: string
  documentId: string
  title: string
  snippet: string
  score: number
  manifestPath?: string | null
}

type KnowledgeRuntimeSearchResult = {
  query: string
  generatedAt: number
  hits: KnowledgeRuntimeHit[]
  warnings: string[]
}

type MemoryRuntimeSearchResult = {
  query: string
  generatedAt: number
  itemMatches: MemoryItem[]
  candidateMatches: MemoryCandidate[]
  warnings: string[]
}

type SessionRuntimeSummary = {
  sessionId: string
  generatedAt: number
  eventCount: number
  eventTypeCounts: Record<string, number>
  runtimeCounts: Record<string, number>
  firstEventAt?: number | null
  lastEventAt?: number | null
  timelinePreview: string[]
  summary: string
  warnings: string[]
}

type SessionRuntimeScan = {
  generatedAt: number
  scannedSources: number
  detectedSources: number
  detectedPaths: string[]
  deepSupportSources: number
  mediumSupportSources: number
  weakSupportSources: number
  warnings: string[]
}

export default function RuntimeExecutionDock() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Ready')
  const [query, setQuery] = useState('agent install memory session')
  const [sessionId, setSessionId] = useState('local-session')
  const [editTitle, setEditTitle] = useState('Updated memory')
  const [editContent, setEditContent] = useState('Updated runtime memory content.')
  const [knowledge, setKnowledge] = useState<KnowledgeRuntimeSearchResult | null>(null)
  const [memory, setMemory] = useState<MemoryRuntimeSearchResult | null>(null)
  const [sessionSummary, setSessionSummary] = useState<SessionRuntimeSummary | null>(null)
  const [scan, setScan] = useState<SessionRuntimeScan | null>(null)

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

  async function searchKnowledge() {
    await run('Searching knowledge runtime', async () => {
      setKnowledge(await invoke<KnowledgeRuntimeSearchResult>('search_knowledge_runtime', { query, spaceIds: [] }))
      setMessage('Knowledge runtime search complete')
    })
  }

  async function searchMemory() {
    await run('Searching memory runtime', async () => {
      setMemory(await invoke<MemoryRuntimeSearchResult>('search_memory_runtime', { query }))
      setMessage('Memory runtime search complete')
    })
  }

  async function updateFirstMemory(action: 'update' | 'archive' | 'delete') {
    const item = memory?.itemMatches[0]
    if (!item) {
      setMessage('No memory item selected from search results')
      return
    }
    await run(`${action} memory item`, async () => {
      if (action === 'update') {
        await invoke('update_memory_item', { itemId: item.id, title: editTitle, content: editContent })
      } else if (action === 'archive') {
        await invoke('archive_memory_item', { itemId: item.id })
      } else {
        await invoke('delete_memory_item', { itemId: item.id })
      }
      setMemory(await invoke<MemoryRuntimeSearchResult>('search_memory_runtime', { query }))
      setMessage(`Memory ${action} complete`)
    })
  }

  async function rejectFirstCandidate() {
    const candidate = memory?.candidateMatches[0]
    if (!candidate) {
      setMessage('No memory candidate selected from search results')
      return
    }
    await run('Rejecting memory candidate', async () => {
      await invoke('reject_memory_candidate', { candidateId: candidate.id })
      setMemory(await invoke<MemoryRuntimeSearchResult>('search_memory_runtime', { query }))
      setMessage('Memory candidate rejected')
    })
  }

  async function summarizeSession() {
    await run('Summarizing session runtime', async () => {
      setSessionSummary(await invoke<SessionRuntimeSummary>('summarize_session_runtime', { sessionId }))
      setMessage('Session summary generated')
    })
  }

  async function scanSessions() {
    await run('Scanning session runtime', async () => {
      setScan(await invoke<SessionRuntimeScan>('scan_session_runtime'))
      setMessage('Session runtime scan complete')
    })
  }

  return <aside className={open ? 'runtime-exec-dock open' : 'runtime-exec-dock'}>
    <button className="runtime-exec-toggle" onClick={() => setOpen(!open)}>{open ? '关闭运行时' : '运行时执行'}</button>
    {open && <div className="runtime-exec-panel">
      <div className="runtime-exec-header">
        <strong>Knowledge / Memory / Session 运行时</strong>
        <span>{busy ? 'Working' : message}</span>
      </div>

      <section className="runtime-exec-section runtime-exec-form">
        <strong>查询参数</strong>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="知识 / 记忆查询" />
        <input value={sessionId} onChange={(event) => setSessionId(event.target.value)} placeholder="Session ID" />
        <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder="记忆标题" />
        <textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} placeholder="记忆内容" />
      </section>

      <section className="runtime-exec-section">
        <strong>知识运行时</strong>
        <button disabled={busy} onClick={searchKnowledge}>检索知识</button>
        {knowledge && <div className="runtime-result">
          <span>{knowledge.hits.length} hit(s)</span>
          {knowledge.warnings.map((warning) => <em key={warning}>{warning}</em>)}
          {knowledge.hits.slice(0, 5).map((hit) => <article key={hit.documentId}>
            <strong>{hit.title}</strong>
            <small>{hit.spaceName} · score {hit.score}</small>
            <p>{hit.snippet}</p>
          </article>)}
        </div>}
      </section>

      <section className="runtime-exec-section">
        <strong>记忆运行时</strong>
        <div className="runtime-exec-actions">
          <button disabled={busy} onClick={searchMemory}>检索记忆</button>
          <button disabled={busy || !memory?.itemMatches.length} onClick={() => updateFirstMemory('update')}>编辑首条</button>
          <button disabled={busy || !memory?.itemMatches.length} onClick={() => updateFirstMemory('archive')}>归档首条</button>
          <button disabled={busy || !memory?.itemMatches.length} onClick={() => updateFirstMemory('delete')}>删除首条</button>
          <button disabled={busy || !memory?.candidateMatches.length} onClick={rejectFirstCandidate}>拒绝候选</button>
        </div>
        {memory && <div className="runtime-result">
          <span>{memory.itemMatches.length} item(s), {memory.candidateMatches.length} candidate(s)</span>
          {memory.warnings.map((warning) => <em key={warning}>{warning}</em>)}
          {memory.itemMatches.slice(0, 4).map((item) => <article key={item.id}>
            <strong>{item.title}</strong>
            <small>{item.status} · {item.source}</small>
            <p>{item.content}</p>
          </article>)}
        </div>}
      </section>

      <section className="runtime-exec-section">
        <strong>会话运行时</strong>
        <div className="runtime-exec-actions">
          <button disabled={busy} onClick={summarizeSession}>生成摘要</button>
          <button disabled={busy} onClick={scanSessions}>扫描来源</button>
        </div>
        {sessionSummary && <div className="runtime-result">
          <strong>{sessionSummary.summary}</strong>
          <span>{sessionSummary.eventCount} event(s)</span>
          {sessionSummary.warnings.map((warning) => <em key={warning}>{warning}</em>)}
          {sessionSummary.timelinePreview.map((entry) => <p key={entry}>{entry}</p>)}
        </div>}
        {scan && <div className="runtime-result">
          <span>{scan.detectedSources}/{scan.scannedSources} source(s) detected</span>
          <small>deep {scan.deepSupportSources} · medium {scan.mediumSupportSources} · weak {scan.weakSupportSources}</small>
          {scan.detectedPaths.slice(0, 8).map((path) => <p key={path}>{path}</p>)}
          {scan.warnings.map((warning) => <em key={warning}>{warning}</em>)}
        </div>}
      </section>
    </div>}
  </aside>
}
