import { useState } from 'react'

function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
      <div className="page-head-actions">{children}</div>
    </div>
  )
}

export function SkillsView({ data }) {
  const { skills } = data
  const [sort, setSort] = useState('invocations')
  const sorted = [...skills].sort((a, b) => b[sort] - a[sort])
  return (
    <div className="view">
      <PageHead title="Skills" sub={`${skills.length} skills installed`}>
        <div className="seg">
          {[['invocations', 'Most used'], ['learnings', 'Most learned'], ['success', 'Best success']].map(([k, l]) => (
            <button key={k} className={'seg-btn' + (sort === k ? ' on' : '')} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
      </PageHead>
      <div className="card-grid g-2">
        {sorted.map(s => (
          <section key={s.id} className="card skill-card">
            <div className="skill-card-head">
              <span className="mono skill-tag">{s.name}</span>
              <span className={'trend ' + (s.trend >= 0 ? 'up' : 'down')}>{s.trend >= 0 ? '↑' : '↓'} {Math.abs(s.trend)}%</span>
            </div>
            <p className="skill-desc">{s.desc}</p>
            <div className="skill-card-stats">
              <div><b className="mono">{s.invocations.toLocaleString()}</b><span className="tiny muted">invocations</span></div>
              <div><b className="mono">{s.learnings}</b><span className="tiny muted">learnings</span></div>
              <div><b className="mono">{s.success}%</b><span className="tiny muted">success</span></div>
            </div>
            <div className="skill-card-foot">
              <span className="tiny muted">Owner: {s.owner}</span>
              <span className="tiny muted">Updated {s.updated}</span>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
