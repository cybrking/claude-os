import React from 'react'
import { Card, Dot, Pill, Sparkline, StackedBars, Bar, Glyph, Donut, fmt } from './ui.jsx'

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
        <span className="tiny muted">{w.runs} runs · {w.success}%</span>
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
      <div className="mem-top">
        <Donut size={108} stroke={13} segments={[
          { value: Math.max(count, 1), color: 'var(--clay)' },
          { value: Math.max(1, Math.floor(count * 0.4)), color: 'var(--c-sonnet)' },
          { value: 1, color: 'var(--line2)' },
        ]} />
        <div className="mem-center"><b>{count}</b><span className="tiny muted">memories</span></div>
      </div>
      <div className="mem-legend">
        {entries.slice(0, 2).map((e, i) => (
          <div key={i}><span className="sw" style={{ background: i === 0 ? 'var(--clay)' : 'var(--c-sonnet)' }} />{e.type} <b className="mono">{e.name}</b></div>
        ))}
        <div><span className="sw" style={{ background: 'var(--line2)' }} />Available <b className="mono">—</b></div>
      </div>
      <div className="mem-foot tiny muted">File-based memory · ~/.claude/projects/…/memory/</div>
    </div>
  )
}

function EKG() {
  const d = 'M0,30 L40,30 L48,30 L54,12 L62,48 L70,30 L96,30 L104,22 L112,38 L120,30 L160,30 L168,30 L174,14 L182,46 L190,30 L240,30'
  return (
    <svg viewBox="0 0 240 60" className="ekg" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="var(--clay-soft)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <path className="ekg-path" d={d} fill="none" stroke="var(--clay)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function Heartbeat({ live, models }) {
  return (
    <div className="pulse-wrap">
      <div className="pulse-ekg"><EKG /></div>
      <div className="pulse-stats">
        <div className="pulse-stat"><span className="muted tiny">Req / min</span><b className="mono">{live.rpm}</b></div>
        <div className="pulse-stat"><span className="muted tiny">Avg latency</span><b className="mono">1.4s</b></div>
        <div className="pulse-stat"><span className="muted tiny">Queue depth</span><b className="mono">{live.queue}</b></div>
        <div className="pulse-stat"><span className="muted tiny">Error rate</span><b className="mono" style={{ color: 'var(--amber)' }}>0.6%</b></div>
      </div>
      <div className="pulse-models">
        {models.map(m => (
          <div key={m.id} className="pulse-model">
            <span className="sw" style={{ background: m.color }} />
            <span className="tiny">{m.name}</span>
            <span className="tiny muted mono">{m.share}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ActivityFeed({ feed }) {
  return (
    <div className="feed">
      {feed.map((f, i) => (
        <div key={f.key} className="feed-item" style={{ opacity: i === 0 ? 1 : 1 - i * 0.04 }}>
          <span className="feed-time mono tiny">{f.time}</span>
          <Dot status={f.status} size={6} />
          <span className="feed-text"><b>{f.agent}</b> {f.text}</span>
        </div>
      ))}
    </div>
  )
}

export function Overview({ live, data }) {
  const { agents, skills, workflows, tasks, connections, schedules, days, usageSeries, models, memory, spark, totalCost } = data
  const topSkills = [...skills].sort((a, b) => b.invocations - a.invocations).slice(0, 5)
  const activeAgents = agents.filter(a => a.status === 'active').length

  return (
    <div className="view">
      <div className="kpi-strip">
        <KPI label="Tokens today" value={live.tokens} unit=" tok" sub="Sonnet 4.6 dominant" spark={spark(3)} />
        <KPI label="Spend · all time" value={fmt.usd(totalCost)} sub={`${fmt.usd2(live.costRate)}/min now`} spark={spark(7)} color="var(--c-sonnet)" />
        <KPI label="Active contexts" value={`${activeAgents}`} unit={` / ${agents.length}`} sub={`${agents.length - activeAgents} idle`} spark={spark(5)} color="var(--ok)" />
        <KPI label="Sessions today" value={live.tasksDone} sub={`${live.running} running now`} spark={spark(9)} color="var(--slate)" />
      </div>

      <div className="grid g-82">
        <Card title="Token usage" sub="Last 14 days · stacked by model" action={<Legend models={models} />}>
          <StackedBars series={usageSeries} labels={days} models={models} h={210} />
        </Card>
        <Card title="System pulse" sub="Live">
          <Heartbeat live={live} models={models} />
        </Card>
      </div>

      <div className="grid g-3">
        <Card title="Live activity" sub="Streaming" action={<span className="live-tag"><Dot status="active" size={6} /> live</span>}>
          <ActivityFeed feed={live.feed} />
        </Card>
        <Card title="Agents" sub={`${agents.length} in roster`} action={<a className="link">Manage</a>}>
          <div className="list tight">{agents.slice(0, 5).map(a => <AgentRow key={a.id} a={a} />)}</div>
        </Card>
        <Card title="Top skills" sub="By invocations" action={<a className="link">Library</a>}>
          <div className="list">
            {topSkills.map(s => (
              <div key={s.id} className="skill-mini">
                <div className="skill-mini-top">
                  <span className="mono">{s.name}</span>
                  <span className="tiny muted">{s.invocations.toLocaleString()}</span>
                </div>
                <Bar value={Math.min(100, s.invocations / Math.max(...topSkills.map(x => x.invocations)) * 100)} color="var(--clay)" />
                <div className="tiny muted">{s.success}% success</div>
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
          <div className="list tight">{schedules.slice(0, 5).map(s => <SchedRow key={s.id} s={s} />)}</div>
        </Card>
        <Card title="Memory & context">
          <MemoryWidget memory={memory} />
        </Card>
      </div>
    </div>
  )
}
