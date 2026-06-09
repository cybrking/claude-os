import { Card, Dot, Pill } from '../components/ui.jsx'

function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
      <div className="page-head-actions">{children}</div>
    </div>
  )
}

function MarketplaceTag({ name }) {
  const short = name === 'claude-plugins-official' ? 'official' : name
  return <span className="tiny muted mono" style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 3 }}>{short}</span>
}

export function PluginsView({ data }) {
  const { plugins } = data
  const enabled = plugins.filter(p => p.enabled)
  const disabled = plugins.filter(p => !p.enabled)

  return (
    <div className="view">
      <PageHead title="Plugins" sub={`${plugins.length} installed · ${enabled.length} enabled`} />
      <div className="grid g-2">
        <Card title="Enabled" sub={`${enabled.length} active`}>
          <div className="list tight">
            {enabled.map(p => (
              <div key={p.id} className="row">
                <Dot status="active" size={7} />
                <div className="row-main">
                  <div className="row-top">
                    <b className="mono">{p.name}</b>
                    <MarketplaceTag name={p.marketplace} />
                  </div>
                  <div className="tiny muted">
                    v{p.version} · {p.scope} scope
                    {p.installedAt && ` · installed ${new Date(p.installedAt).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
            ))}
            {enabled.length === 0 && <div className="row"><div className="tiny muted">No enabled plugins</div></div>}
          </div>
        </Card>
        <Card title="Installed but not enabled" sub={`${disabled.length} plugins`}>
          <div className="list tight">
            {disabled.map(p => (
              <div key={p.id} className="row">
                <Dot status="idle" size={7} />
                <div className="row-main">
                  <div className="row-top">
                    <b className="mono">{p.name}</b>
                    <MarketplaceTag name={p.marketplace} />
                  </div>
                  <div className="tiny muted">
                    v{p.version} · {p.scope} scope
                  </div>
                </div>
              </div>
            ))}
            {disabled.length === 0 && <div className="row"><div className="tiny muted">All installed plugins are enabled</div></div>}
          </div>
        </Card>
      </div>
      <div className="tiny muted" style={{ padding: '8px 2px', textAlign: 'center' }}>
        Source: ~/.claude/plugins/installed_plugins.json · enabled state from settings.json
      </div>
    </div>
  )
}
