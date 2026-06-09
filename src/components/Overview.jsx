import React from 'react'
import { Card, Dot, Pill, Sparkline, StackedBars, Bar, Glyph, fmt } from './ui.jsx'

export function KPI({ label, value, unit, sub, spark, color = 'var(--clay)' }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}{unit && <span className="kpi-unit">{unit}</span>}</div>
      <div className="kpi-foot">
        {sub && <span className="kpi-sub">{sub}</span>}
        {spark && <Sparkline data={spark} color={color} w={84} h={26} />}
      </div>
    </div>
  )
}

export function Legend({ models }) {
  return <div className="legend">{models.map(m => <span key={m.id}><span className="sw" style={{ background: m.color }} />{m.name}</span>)}</div>
}

export function AgentRow({ a }) {
  const color = a.status === 'error' ? 'var(--red)' : a.status === 'idle' ? 'var(--mut)' : 'var(--clay)'
  return (
    <div className="row agent-row">
      <Glyph ch={a.glyph} color={color} />
      <div className="row-main">
        <div className="row-top"><b>{a.name}</b><span className="muted">· {a.role}</span></div>
        <div className="row-note">{a.note}</div>
      </div>
      <div className="row-side">
        <Pill status={a.status} />
        <span className="mono tiny muted">{a.model}</span>
      </div>
    </div>
  )
}

export function WorkflowRow({ w }) {
  return (
    <div className="row wf-row">
      <div className="row-main">
        <div className="row-top"><b>{w.name}</b> <Pill status={w.status} /></div>
        <div className="chain">
          {w.chain.map((c, i) => (
            <React.Fragment key={c}>
              <span className="chain-node mono">{c}</span>
              {i < w.chain.length - 1 && <span className="chain-arrow">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="row-side">
        <span className="tiny muted">{w.schedule}</span>
      </div>
    </div>
  )
}

export function TaskTable({ tasks, compact }) {
  return (
    <table className="ttable">
      <tbody>
        {tasks.map(t => (
          <tr key={t.id}>
            <td className="tt-status"><Dot status={t.status} size={7} /></td>
            <td className="tt-title">{t.title}<div className="tiny muted">{t.agent} · <span className="mono">{t.skill}</span></div></td>
            {!compact && <td className="mono tiny muted">{t.started}</td>}
            <td className="mono tiny muted tt-dur">{t.dur}</td>
            <td className="mono tiny muted tt-tok">{t.tokens ? fmt.tok(t.tokens) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ConnChip({ c }) {
  return (
    <div className="conn-chip">
      <Dot status={c.status} size={7} />
      <span className="conn-name">{c.name}</span>
      <span className="tiny muted mono">{c.status === 'error' ? 'down' : c.latency}</span>
    </div>
  )
}

export function SchedRow({ s }) {
  return (
    <div className="row sched-row">
      <div className="row-main">
        <div className="row-top"><b>{s.name}</b></div>
        <div className="tiny muted mono">{s.cron}</div>
      </div>
      <div className="row-side">
        <span className="tiny muted">{s.next}</span>
        <span className={'toggle' + (s.on ? ' on' : '')}><span className="knob" /></span>
      </div>
    </div>
  )
}

export function MemoryWidget({ memory }) {
  const entries = memory?.entries || []
  const count = memory?.count || entries.length
  return (
    <div className="mem">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
        <b style={{ fontSize: '2rem', lineHeight: 1 }}>{count}</b>
        <span className="tiny muted">memories</span>
      </div>
      <div className="list">
        {entries.slice(0, 5).map((e, i) => (
          <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{e.name}</div>
            {e.desc && <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.4 }}>{e.desc.slice(0, 90)}</div>}
          </div>
        ))}
        {count > 5 && <div className="tiny muted" style={{ marginTop: 6 }}>+{count - 5} more</div>}
      </div>
      <div className="mem-foot tiny muted" style={{ marginTop: 10 }}>~/.claude/projects/…/memory/</div>
    </div>
  )
}

export function Overview({ data }) {
  const { agents, skills, workflows, tasks, connections, schedules, days, usageSeries, models, memory, totalCost, todayTokens, todaySessions } = data
  const activeAgents = agents.filter(a => a.status === 'active').length
  // Use last 14 days of the 30-day window for overview KPIs
  const series14 = usageSeries.slice(-14)
  const totalMtok = series14.reduce((s, d) => s + (d.sonnet || 0) + (d.opus || 0) + (d.haiku || 0), 0)

  // Real sparklines from actual data
  const normalize = arr => {
    const max = Math.max(...arr, 0.001)
    return arr.map(v => Math.round((v / max) * 76 + 8))
  }
  const tokenSpark = normalize(series14.map(d => (d.sonnet || 0) + (d.opus || 0) + (d.haiku || 0)))
  const sessionSpark = normalize(series14.map(d => d.sessions || 0))

  return (
    <div className="view">
      <div className="kpi-strip">
        <KPI label="Tokens today" value={fmt.tok(todayTokens || 0)} unit=" tok" sub="Sonnet 4.6 dominant" spark={tokenSpark} />
        <KPI label="Tokens · 14 days" value={totalMtok.toFixed(1)} unit="M" sub={`API equiv ${fmt.usd(totalCost)} (not your bill)`} spark={tokenSpark} color="var(--c-sonnet)" />
        <KPI label="Active contexts" value={`${activeAgents}`} unit={` / ${agents.length}`} sub={`${agents.length - activeAgents} idle`} spark={sessionSpark} color="var(--ok)" />
        <KPI label="Sessions today" value={todaySessions || 0} spark={sessionSpark} color="var(--slate)" />
      </div>

      <Card title="Token usage" sub="Last 14 days · stacked by model" action={<Legend models={models} />}>
        <StackedBars series={usageSeries} labels={days} models={models} h={210} />
      </Card>

      <div className="grid g-2">
        <Card title="Agents" sub={`${agents.length} in roster`} action={<a className="link">Manage</a>}>
          <div className="list tight">{agents.slice(0, 5).map(a => <AgentRow key={a.id} a={a} />)}</div>
        </Card>
        <Card title="Skills" sub={`${skills.length} installed`} action={<a className="link">Library</a>}>
          <div className="list">
            {skills.slice(0, 5).map(s => (
              <div key={s.id} className="skill-mini">
                <div className="skill-mini-top">
                  <span className="mono">{s.name}</span>
                  <span className="tiny muted">{s.owner}</span>
                </div>
                {s.desc && <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.4 }}>{s.desc.slice(0, 80)}</div>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid g-2">
        <Card title="Workflows" sub="Chained skills" action={<a className="link">All</a>}>
          <div className="list">{workflows.slice(0, 4).map(w => <WorkflowRow key={w.id} w={w} />)}</div>
        </Card>
        <Card title="Recent runs" sub="Across all agents" action={<a className="link">History</a>}>
          <TaskTable tasks={tasks.slice(0, 6)} compact />
        </Card>
      </div>

      <div className="grid g-3">
        <Card title="Connections" sub={`${connections.filter(c => c.status === 'connected').length}/${connections.length} healthy`}>
          <div className="conn-grid">{connections.map(c => <ConnChip key={c.id} c={c} />)}</div>
        </Card>
        <Card title="Schedules" sub="Heartbeats & cron">
          <div className="list tight">{schedules.length
            ? schedules.slice(0, 5).map(s => <SchedRow key={s.id} s={s} />)
            : <div className="tiny muted" style={{ padding: '16px 0' }}>No schedules configured</div>
          }</div>
        </Card>
        <Card title="Memory">
          <MemoryWidget memory={memory} />
        </Card>
      </div>
    </div>
  )
}
