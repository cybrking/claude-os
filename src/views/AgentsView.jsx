import { Glyph, Pill, fmt } from '../components/ui.jsx'

function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
      <div className="page-head-actions">{children}</div>
    </div>
  )
}

export function AgentsView({ data }) {
  const { agents } = data
  return (
    <div className="view">
      <PageHead title="Agents" sub={`${agents.length} agents · ${agents.filter(a => a.status === 'active').length} active`} />
      <div className="card-grid g-3">
        {agents.map(a => {
          const color = a.status === 'error' ? 'var(--red)' : a.status === 'idle' ? 'var(--mut)' : 'var(--clay)'
          return (
            <section key={a.id} className="card agent-card">
              <div className="agent-card-head">
                <Glyph ch={a.glyph} color={color} size={44} />
                <Pill status={a.status} />
              </div>
              <h3 className="agent-name">{a.name}</h3>
              <p className="agent-role">{a.role}</p>
              <p className="agent-note">{a.note}</p>
              <div className="agent-stats">
                <div><span className="tiny muted">Model</span><b className="mono tiny">{a.model}</b></div>
                <div><span className="tiny muted">Tasks</span><b className="mono">{a.tasksToday}</b></div>
                <div><span className="tiny muted">Tokens</span><b className="mono">{fmt.tok(a.tokensToday)}</b></div>
                <div><span className="tiny muted">Uptime</span><b className="mono">{a.uptime}</b></div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
