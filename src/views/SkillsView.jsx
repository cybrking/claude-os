function PageHead({ title, sub }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
    </div>
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
