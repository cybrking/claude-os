import { Card } from '../components/ui.jsx'
import { SchedRow } from '../components/Overview.jsx'

function PageHead({ title, sub }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
    </div>
  )
}

export function SchedulesView({ data }) {
  const { schedules } = data
  return (
    <div className="view">
      <PageHead title="Schedules" sub="Cron jobs & heartbeats" />
      <Card>
        <div className="list pad">
          {schedules.length > 0
            ? schedules.map(s => <SchedRow key={s.id} s={s} />)
            : (
              <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="tiny muted">No local schedule data found.</div>
                <div className="tiny muted">
                  Claude Code schedules are managed via the cloud — use{' '}
                  <span className="mono">/schedule</span> in a Claude session or visit{' '}
                  <span className="mono">claude.ai/code</span> to create and manage routines.
                </div>
              </div>
            )
          }
        </div>
      </Card>
    </div>
  )
}
