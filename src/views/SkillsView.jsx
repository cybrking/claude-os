import { useState } from 'react'

function PageHead({ title, sub }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
    </div>
  )
}

function TagChip({ tag }) {
  return (
    <span className="tiny mono" style={{
      background: 'var(--surface2)',
      padding: '1px 5px',
      borderRadius: 3,
      color: 'var(--muted)',
    }}>{tag}</span>
  )
}

export function SkillsView({ data }) {
  const { skills } = data
  return (
    <div className="view">
      <PageHead title="Skills" sub={`${skills.length} skills installed`} />
      <div className="card-grid g-2">
        {skills.map(s => (
          <section key={s.id} className="card skill-card">
            <div className="skill-card-head">
              <span className="mono skill-tag">{s.name}</span>
            </div>
            <p className="skill-desc">{s.desc}</p>
            {s.trigger && (
              <div className="tiny muted" style={{ marginTop: 4, fontStyle: 'italic', lineHeight: 1.4 }}>
                {s.trigger}
              </div>
            )}
            {s.tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {s.tags.map(t => <TagChip key={t} tag={t} />)}
              </div>
            )}
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
