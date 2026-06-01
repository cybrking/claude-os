import { Card } from '../components/ui.jsx'
import { SchedRow } from '../components/Overview.jsx'

function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
      <div className="page-head-actions">{children}</div>
    </div>
  )
}

export function SchedulesView({ data }) {
  const { schedules } = data
  return (
    <div className="view">
      <PageHead title="Schedules" sub="Cron jobs & heartbeats" />
      <Card pad={false}><div className="list pad">{schedules.map(s => <SchedRow key={s.id} s={s} />)}</div></Card>
    </div>
  )
}
