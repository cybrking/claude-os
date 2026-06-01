import { Card, Dot, Pill } from '../components/ui.jsx'

function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
      <div className="page-head-actions">{children}</div>
    </div>
  )
}

export function ConnectionsView({ data }) {
  const { connections } = data
  return (
    <div className="view">
      <PageHead title="Connections" sub={`${connections.length} integrations · MCP & tools`} />
      <Card pad={false}>
        <table className="ttable full">
          <thead><tr><th></th><th>Integration</th><th>Type</th><th>Calls · 30d</th><th>Latency</th><th>Status</th></tr></thead>
          <tbody>
            {connections.map(c => (
              <tr key={c.id}>
                <td className="tt-status"><Dot status={c.status} size={7} /></td>
                <td className="tt-title"><b>{c.name}</b></td>
                <td className="tiny muted">{c.kind}</td>
                <td className="mono tiny muted">{c.calls.toLocaleString()}</td>
                <td className="mono tiny muted">{c.latency}</td>
                <td><Pill status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
