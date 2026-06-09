import { useState } from 'react'
import { Card } from '../components/ui.jsx'
import { MemoryWidget } from '../components/Overview.jsx'

function PageHead({ title, sub }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
    </div>
  )
}

function MemoryEntry({ entry }) {
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (!expanded && content === null) {
      setLoading(true)
      try {
        const r = await fetch(`/api/memory/${entry.project}/${entry.file}`)
        if (r.ok) {
          const { content: text } = await r.json()
          setContent(text)
        } else {
          setContent('(could not load file)')
        }
      } catch {
        setContent('(failed to fetch)')
      }
      setLoading(false)
    }
    setExpanded(v => !v)
  }

  return (
    <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer' }} onClick={toggle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div className="row-main">
          <div className="row-top">
            <b className="mono">{entry.name}</b>
            <span className="tiny muted">· {entry.type}</span>
          </div>
          <div className="tiny muted">{entry.desc}</div>
        </div>
        <span className="tiny muted" style={{ flexShrink: 0, marginTop: 2 }}>{loading ? '…' : expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && content !== null && (
        <pre style={{
          marginTop: 10,
          padding: '10px 12px',
          background: 'var(--surface2)',
          borderRadius: 4,
          fontSize: 11,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--fg)',
          maxHeight: 400,
          overflowY: 'auto',
        }}>{content}</pre>
      )}
    </div>
  )
}

export function MemoryView({ data }) {
  const { memory } = data
  const entries = memory?.entries || []
  return (
    <div className="view">
      <PageHead title="Memory & context" sub={`File-based memory · ${entries.length} entries`} />
      <div className="grid g-2">
        <Card title="Store"><MemoryWidget memory={memory} /></Card>
        <Card title="Memory files" sub="Click to expand · persisted across conversations">
          <div className="list tight">
            {entries.map((e, i) => (
              <MemoryEntry key={i} entry={e} />
            ))}
            {entries.length === 0 && (
              <div className="row"><div className="row-main"><div className="tiny muted">No memory entries found in ~/.claude/…/memory/</div></div></div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
