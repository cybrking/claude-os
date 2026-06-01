import { Card } from '../components/ui.jsx'
import { WorkflowRow } from '../components/Overview.jsx'

function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
      <div className="page-head-actions">{children}</div>
    </div>
  )
}

export function WorkflowsView({ data }) {
  const { workflows } = data
  return (
    <div className="view">
      <PageHead title="Workflows" sub={`${workflows.length} workflows · chained skills`} />
      <Card pad={false}><div className="list pad">{workflows.map(w => <WorkflowRow key={w.id} w={w} />)}</div></Card>
    </div>
  )
}
