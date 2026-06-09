import { Card } from '../components/ui.jsx'

function PageHead({ title, sub }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
    </div>
  )
}

function EventBadge({ event }) {
  const colors = {
    Stop: 'var(--c-sonnet)',
    PreToolUse: 'var(--amber)',
    PostToolUse: 'var(--ok)',
  }
  return (
    <span className="tiny mono" style={{
      background: `color-mix(in oklab, ${colors[event] || 'var(--mut)'} 18%, transparent)`,
      color: colors[event] || 'var(--muted)',
      padding: '1px 6px',
      borderRadius: 3,
      border: `1px solid color-mix(in oklab, ${colors[event] || 'var(--mut)'} 35%, transparent)`,
    }}>{event}</span>
  )
}

export function HooksView({ data }) {
  const { hooks } = data
  const { scripts = [], bindings = [] } = hooks

  return (
    <div className="view">
      <PageHead
        title="Hooks"
        sub={`${bindings.length} bindings · ${scripts.length} scripts`}
      />
      <div className="grid g-2">
        <Card title="Lifecycle bindings" sub="From settings.json">
          <div className="list tight">
            {bindings.map((b, i) => (
              <div key={i} className="row">
                <div className="row-main">
                  <div className="row-top" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <EventBadge event={b.event} />
                    {b.matcher && <span className="tiny mono muted">matcher: {b.matcher}</span>}
                  </div>
                  <div className="tiny mono muted" style={{ marginTop: 3, wordBreak: 'break-all' }}>{b.command}</div>
                </div>
              </div>
            ))}
            {bindings.length === 0 && (
              <div className="row"><div className="tiny muted">No hook bindings in settings.json</div></div>
            )}
          </div>
        </Card>
        <Card title="Hook scripts" sub="~/.claude/hooks/">
          <div className="list tight">
            {scripts.map(s => (
              <div key={s.name} className="row">
                <div className="row-main">
                  <div className="row-top">
                    <b className="mono">{s.name}</b>
                    <span className="tiny muted mono">{(s.size / 1024).toFixed(1)} KB</span>
                  </div>
                  {s.lastModified && (
                    <div className="tiny muted">
                      modified {new Date(s.lastModified).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {scripts.length === 0 && (
              <div className="row"><div className="tiny muted">No scripts in ~/.claude/hooks/</div></div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
