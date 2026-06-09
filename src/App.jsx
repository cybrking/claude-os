import { useState, useMemo, useRef, useEffect, Component } from 'react'

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
import { PluginsView } from './views/PluginsView.jsx'
import { HooksView } from './views/HooksView.jsx'

const NAV = [
  { id: 'overview',    label: 'Overview',     glyph: '◇' },
  { id: 'agents',      label: 'Agents',       glyph: '◆' },
  { id: 'skills',      label: 'Skills',       glyph: '✦' },
  { id: 'workflows',   label: 'Workflows',    glyph: '⟿' },
  { id: 'tasks',       label: 'Tasks & runs', glyph: '▤' },
  { id: 'usage',       label: 'Usage',        glyph: '▦' },
  { id: 'memory',      label: 'Memory',       glyph: '❖' },
  { id: 'connections', label: 'Connections',  glyph: '⊕' },
  { id: 'plugins',     label: 'Plugins',      glyph: '⬡' },
  { id: 'hooks',       label: 'Hooks',        glyph: '↬' },
  { id: 'schedules',   label: 'Schedules',    glyph: '◷' },
]

function useRelativeTime(ts) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!ts) { setLabel(''); return }
    const tick = () => {
      const sec = Math.floor((Date.now() - ts) / 1000)
      if (sec < 5) setLabel('just now')
      else if (sec < 60) setLabel(`${sec}s ago`)
      else setLabel(`${Math.floor(sec / 60)}m ago`)
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [ts])
  return label
}

function Sidebar({ route, setRoute, data }) {
  const skillCount = data?.skills?.length || 0
  const wfCount = data?.workflows?.length || 0

  // Real health check: connections with non-idle/connected status or no connections
  const connections = data?.connections || []
  const unhealthy = connections.filter(c => c.status === 'error' || c.status === 'down').length
  const healthOk = unhealthy === 0
  const healthStatus = healthOk ? 'active' : 'error'
  const healthLabel = healthOk ? 'All systems nominal' : `${unhealthy} connection${unhealthy > 1 ? 's' : ''} down`

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
          <div className="sys-row"><Dot status={healthStatus} size={6} /> <span className="tiny">{healthLabel}</span></div>
          <div className="tiny muted">{skillCount} skills · {wfCount} workflows</div>
        </div>
        <div className="me">
          <span className="me-av">✻</span>
          <div className="me-text"><b>You</b><span className="tiny muted">solo workspace</span></div>
        </div>
      </div>
    </aside>
  )
}

function SearchDropdown({ query, data, onSelect, onClose }) {
  const results = useMemo(() => {
    if (!query.trim() || !data) return []
    const q = query.toLowerCase()
    const hits = []

    for (const s of (data.skills || [])) {
      if (s.name.toLowerCase().includes(q) || s.desc?.toLowerCase().includes(q)) {
        hits.push({ type: 'Skill', label: s.name, sub: s.desc?.slice(0, 60), route: 'skills' })
      }
    }
    for (const w of (data.workflows || [])) {
      if (w.name.toLowerCase().includes(q) || w.desc?.toLowerCase().includes(q)) {
        hits.push({ type: 'Workflow', label: w.name, sub: w.desc?.slice(0, 60), route: 'workflows' })
      }
    }
    for (const t of (data.tasks || [])) {
      if (t.title?.toLowerCase().includes(q)) {
        hits.push({ type: 'Task', label: t.title, sub: t.agent, route: 'tasks' })
      }
    }
    for (const e of (data.memory?.entries || [])) {
      if (e.name?.toLowerCase().includes(q) || e.desc?.toLowerCase().includes(q)) {
        hits.push({ type: 'Memory', label: e.name, sub: e.desc?.slice(0, 60), route: 'memory' })
      }
    }
    return hits.slice(0, 8)
  }, [query, data])

  if (!results.length) return null

  return (
    <div className="search-dropdown" onMouseDown={e => e.preventDefault()}>
      {results.map((r, i) => (
        <button key={i} className="search-result" onClick={() => { onSelect(r.route); onClose() }}>
          <span className="search-type tiny muted">{r.type}</span>
          <span className="search-label">{r.label}</span>
          {r.sub && <span className="search-sub tiny muted">{r.sub}</span>}
        </button>
      ))}
    </div>
  )
}

function Topbar({ route, setRoute, data, lastUpdated, refreshing, refresh }) {
  const title = (NAV.find(n => n.id === route) || NAV[0]).label
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const updatedLabel = useRelativeTime(lastUpdated)
  const inputRef = useRef(null)

  return (
    <header className="topbar">
      <div className="topbar-left">
        {route === 'overview'
          ? <h1 className="hello">{greet}. <span className="muted">Your stack is running.</span></h1>
          : <h1 className="hello">{title}</h1>}
      </div>
      <div className="topbar-right">
        <div className="search" style={{ position: 'relative' }}>
          <span>⌕</span>
          <input
            ref={inputRef}
            placeholder="Search skills, workflows, tasks…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          />
          {searchOpen && searchQuery && (
            <SearchDropdown
              query={searchQuery}
              data={data}
              onSelect={r => setRoute(r)}
              onClose={() => { setSearchQuery(''); setSearchOpen(false) }}
            />
          )}
        </div>
        {lastUpdated && (
          <span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>
            {refreshing ? 'Refreshing…' : updatedLabel}
          </span>
        )}
        <button
          className="icon-btn"
          title="Refresh data"
          onClick={refresh}
          disabled={refreshing}
          style={{ opacity: refreshing ? 0.5 : 1 }}
        >↻</button>
      </div>
    </header>
  )
}

export default function App() {
  const [route, setRoute] = useState('overview')
  const { data, loading, error, lastUpdated, refreshing, refresh } = useData()

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
    case 'plugins':     body = <PluginsView data={data} />; break
    case 'hooks':       body = <HooksView data={data} />; break
    case 'schedules':   body = <SchedulesView data={data} />; break
    default:            body = <Overview data={data} />
  }

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} data={data} />
      <main className="main">
        <Topbar
          route={route}
          setRoute={setRoute}
          data={data}
          lastUpdated={lastUpdated}
          refreshing={refreshing}
          refresh={refresh}
        />
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
