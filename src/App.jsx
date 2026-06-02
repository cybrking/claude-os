import { useState, Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card" style={{ padding: '24px', maxWidth: '520px' }}>
            <div style={{ color: 'var(--red)', fontWeight: 600, marginBottom: '8px' }}>Something went wrong</div>
            <div className="tiny muted" style={{ fontFamily: 'var(--mono)' }}>{this.state.error.message}</div>
            <button className="btn" style={{ marginTop: '16px', width: 'fit-content' }} onClick={() => this.setState({ error: null })}>Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
import { useData } from './hooks/useData.js'
import { Dot } from './components/ui.jsx'
import { Overview } from './components/Overview.jsx'
import { AgentsView } from './views/AgentsView.jsx'
import { SkillsView } from './views/SkillsView.jsx'
import { WorkflowsView } from './views/WorkflowsView.jsx'
import { TasksView } from './views/TasksView.jsx'
import { UsageView } from './views/UsageView.jsx'
import { MemoryView } from './views/MemoryView.jsx'
import { ConnectionsView } from './views/ConnectionsView.jsx'
import { SchedulesView } from './views/SchedulesView.jsx'

const NAV = [
  { id: 'overview',    label: 'Overview',     glyph: '◇' },
  { id: 'agents',      label: 'Agents',       glyph: '◆' },
  { id: 'skills',      label: 'Skills',       glyph: '✦' },
  { id: 'workflows',   label: 'Workflows',    glyph: '⟿' },
  { id: 'tasks',       label: 'Tasks & runs', glyph: '▤' },
  { id: 'usage',       label: 'Usage & cost', glyph: '▦' },
  { id: 'memory',      label: 'Memory',       glyph: '❖' },
  { id: 'connections', label: 'Connections',  glyph: '⊕' },
  { id: 'schedules',   label: 'Schedules',    glyph: '◷' },
]

function Sidebar({ route, setRoute, data }) {
  const skillCount = data?.skills?.length || 0
  const wfCount = data?.workflows?.length || 0
  const agentCount = data?.agents?.length || 0
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">✻</span>
        <div className="brand-text"><b>Claude OS</b><span>solo workspace</span></div>
      </div>
      <nav className="nav">
        {NAV.map(n => (
          <button key={n.id} className={'nav-item' + (route === n.id ? ' active' : '')} onClick={() => setRoute(n.id)}>
            <span className="nav-glyph">{n.glyph}</span>{n.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="sys-card">
          <div className="sys-row"><Dot status="active" size={6} /> <span className="tiny">All systems nominal</span></div>
          <div className="tiny muted">{agentCount} contexts · {skillCount} skills · {wfCount} workflows</div>
        </div>
        <div className="me">
          <span className="me-av">✻</span>
          <div className="me-text"><b>You</b><span className="tiny muted">solo workspace</span></div>
        </div>
      </div>
    </aside>
  )
}

function Topbar({ route }) {
  const title = (NAV.find(n => n.id === route) || NAV[0]).label
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return (
    <header className="topbar">
      <div className="topbar-left">
        {route === 'overview'
          ? <h1 className="hello">{greet}. <span className="muted">Your stack is running.</span></h1>
          : <h1 className="hello">{title}</h1>}
      </div>
      <div className="topbar-right">
        <div className="search"><span>⌕</span><input placeholder="Search agents, skills, runs…" /></div>
        <button className="icon-btn" title="Notifications">◔</button>
      </div>
    </header>
  )
}

export default function App() {
  const [route, setRoute] = useState('overview')
  const { data, loading, error } = useData()

  if (loading && !data) {
    return (
      <div className="loading">
        <span className="loading-mark">✻</span>
        <span className="tiny muted">Reading ~/.claude/…</span>
      </div>
    )
  }

  let body
  switch (route) {
    case 'agents':      body = <AgentsView data={data} />; break
    case 'skills':      body = <SkillsView data={data} />; break
    case 'workflows':   body = <WorkflowsView data={data} />; break
    case 'tasks':       body = <TasksView data={data} />; break
    case 'usage':       body = <UsageView data={data} />; break
    case 'memory':      body = <MemoryView data={data} />; break
    case 'connections': body = <ConnectionsView data={data} />; break
    case 'schedules':   body = <SchedulesView data={data} />; break
    default:            body = <Overview data={data} />
  }

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} data={data} />
      <main className="main">
        <Topbar route={route} />
        {error && !data && (
          <div style={{ padding: '8px 30px', background: 'color-mix(in oklab, var(--amber) 12%, transparent)', borderBottom: '1px solid color-mix(in oklab, var(--amber) 30%, transparent)', fontSize: '12px', color: 'var(--amber)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>⚠</span> API error — is the server running? <span className="mono">{error}</span>
          </div>
        )}
        <div className="scroll"><ErrorBoundary>{body}</ErrorBoundary></div>
      </main>
    </div>
  )
}
