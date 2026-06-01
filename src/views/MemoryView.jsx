import { Card } from '../components/ui.jsx'
import { MemoryWidget } from '../components/Overview.jsx'

function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
      <div className="page-head-actions">{children}</div>
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
        <Card title="Memory files" sub="Persisted across conversations">
          <div className="list tight">
            {entries.map((e, i) => (
              <div key={i} className="row">
                <div className="row-main">
                  <div className="row-top"><b className="mono">{e.name}.md</b><span className="tiny muted">· {e.type}</span></div>
                  <div className="tiny muted">{e.desc}</div>
                </div>
              </div>
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
