import { useState, useEffect, Component } from 'react'

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
import { Dot, fmt } from './components/ui.jsx'
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

const FEED_TEMPLATES = [
  { agent: 'Claude Sonnet', text: 'writing Bash tool call', status: 'running' },
  { agent: 'Workflow',      text: 'deep-research: scoping search angles', status: 'running' },
  { agent: 'Claude Sonnet', text: 'edited file via Edit tool', status: 'done' },
  { agent: 'Composio',      text: 'REMOTE_WORKBENCH executed', status: 'done' },
  { agent: 'Sub-agent',     text: 'adversarially verifying claim', status: 'running' },
  { agent: 'Claude Sonnet', text: 'read file via Read tool', status: 'done' },
  { agent: 'Workflow',      text: 'cve-triage: notifying via Slack', status: 'done' },
  { agent: 'Claude Sonnet', text: 'fetched source via WebFetch', status: 'running' },
  { agent: 'Sub-agent',     text: 'synthesizing research report', status: 'done' },
  { agent: 'Workflow',      text: 'ai-changelog: rendering Remotion video', status: 'done' },
]

function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function useLive(data) {
  const seedFeed = () => Array.from({ length: 7 }, (_, i) => {
    const t = FEED_TEMPLATES[i % FEED_TEMPLATES.length]
    return { ...t, time: nowTime(), key: 'f' + i }
  })

  const [state, setState] = useState({
    tokensN: 0, tasksDone: 0, running: 1, rpm: 12, queue: 0,
    costRate: 0.09, feed: seedFeed(), keyN: 100,
  })

  // Seed from real data once it arrives
  useEffect(() => {
    if (data?.todayTokens) {
      setState(s => ({ ...s, tokensN: data.todayTokens, tasksDone: data.todaySessions || s.tasksDone }))
    }
  }, [data?.todayTokens])

  useEffect(() => {
    const tick = setInterval(() => {
      setState(s => {
        const addFeed = Math.random() < 0.55
        let feed = s.feed, keyN = s.keyN
        if (addFeed) {
          const t = FEED_TEMPLATES[Math.floor(Math.random() * FEED_TEMPLATES.length)]
          feed = [{ ...t, time: nowTime(), key: 'f' + keyN }, ...s.feed].slice(0, 7)
          keyN++
        }
        return {
          ...s,
          tokensN: s.tokensN + Math.floor(Math.random() * 4000 + 500),
          tasksDone: s.tasksDone + (Math.random() < 0.06 ? 1 : 0),
          running: Math.max(0, Math.min(3, s.running + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.15 ? 1 : 0))),
          rpm: Math.max(4, Math.min(24, s.rpm + Math.floor((Math.random() - 0.5) * 4))),
          queue: Math.max(0, Math.min(3, s.queue + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.2 ? 1 : 0))),
          costRate: Math.max(0.02, Math.min(0.48, +(s.costRate + (Math.random() - 0.5) * 0.03).toFixed(2))),
          feed, keyN,
        }
      })
    }, 2200)
    return () => clearInterval(tick)
  }, [])

  return { ...state, tokens: fmt.tok(state.tokensN) }
}

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

function Topbar({ route, live }) {
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
        <div className="topbar-stat"><span className="tiny muted">burn</span><b className="mono">{fmt.usd2(live.costRate)}/min</b></div>
        <button className="icon-btn" title="Notifications">◔</button>
      </div>
    </header>
  )
}

export default function App() {
  const [route, setRoute] = useState('overview')
  const { data, loading, error } = useData()
  const live = useLive(data)

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
    case 'usage':       body = <UsageView live={live} data={data} />; break
    case 'memory':      body = <MemoryView data={data} />; break
    case 'connections': body = <ConnectionsView data={data} />; break
    case 'schedules':   body = <SchedulesView data={data} />; break
    default:            body = <Overview live={live} data={data} />
  }

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} data={data} />
      <main className="main">
        <Topbar route={route} live={live} />
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
