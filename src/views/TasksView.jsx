import { useState } from 'react'
import { Card, Dot, fmt } from '../components/ui.jsx'

function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
      <div className="page-head-actions">{children}</div>
    </div>
  )
}

export function TasksView({ data }) {
  const { tasks } = data
  const [f, setF] = useState('all')
  const counts = tasks.reduce((m, t) => (m[t.status] = (m[t.status] || 0) + 1, m), {})
  const shown = f === 'all' ? tasks : tasks.filter(t => t.status === f)
  const filters = ['all', 'running', 'done', 'queued', 'failed']
  return (
    <div className="view">
      <PageHead title="Tasks & runs" sub={`${tasks.length} recent runs`}>
        <div className="seg">
          {filters.map(k => (
            <button key={k} className={'seg-btn' + (f === k ? ' on' : '')} onClick={() => setF(k)}>
              {k[0].toUpperCase() + k.slice(1)}
              {k !== 'all' && counts[k] ? <span className="seg-count">{counts[k]}</span> : ''}
            </button>
          ))}
        </div>
      </PageHead>
      <Card pad={false}>
        <table className="ttable full">
          <thead><tr><th></th><th>Task</th><th>Started</th><th className="tt-dur">Duration</th><th className="tt-tok">Tokens</th></tr></thead>
          <tbody>
            {shown.map(t => (
              <tr key={t.id}>
                <td className="tt-status"><Dot status={t.status} size={7} /></td>
                <td className="tt-title">{t.title}<div className="tiny muted">#{t.id} · {t.agent} · <span className="mono">{t.skill}</span></div></td>
                <td className="mono tiny muted">{t.started}</td>
                <td className="mono tiny muted tt-dur">{t.dur}</td>
                <td className="mono tiny muted tt-tok">{t.tokens ? fmt.tok(t.tokens) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
