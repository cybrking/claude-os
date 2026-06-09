import { useState } from 'react'
import { Card, StackedBars, Bar, fmt, Sparkline } from '../components/ui.jsx'
import { KPI, Legend } from '../components/Overview.jsx'

function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2><p className="page-sub">{sub}</p></div>
      <div className="page-head-actions">{children}</div>
    </div>
  )
}

export function UsageView({ data }) {
  const [rangeDays, setRangeDays] = useState(14)
  const { days: allDays, usageSeries: allSeries, models } = data

  // Slice to the selected range from the end of the 30-day window
  const days = allDays.slice(-rangeDays)
  const usageSeries = allSeries.slice(-rangeDays)

  const totalTok = usageSeries.reduce((s, d) => s + (d.opus || 0) + (d.sonnet || 0) + (d.haiku || 0), 0)
  const activeDays = days.filter((_, i) => usageSeries[i] && (usageSeries[i].sonnet || usageSeries[i].opus) > 0).length
  const byModel = models.map(m => {
    const tok = usageSeries.reduce((s, d) => s + (d[m.id] || 0), 0)
    const cost = tok * m.rate
    return { ...m, tok, cost }
  }).filter(m => m.tok > 0)
  const totalCost = byModel.reduce((s, m) => s + m.cost, 0)

  // Real sparklines from actual usage data
  const sonnetSpark = usageSeries.map(d => d.sonnet || 0)
  const sessionsSpark = usageSeries.map(d => d.sessions || 0)
  const normalizeSparkline = (arr) => {
    const max = Math.max(...arr, 0.001)
    return arr.map(v => Math.round((v / max) * 84 + 8))
  }

  return (
    <div className="view">
      <PageHead title="Usage" sub={`Last ${rangeDays} days`}>
        <div className="seg">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              className={'seg-btn' + (rangeDays === d ? ' on' : '')}
              onClick={() => setRangeDays(d)}
            >{d}d</button>
          ))}
        </div>
      </PageHead>
      <div className="kpi-strip">
        <KPI label="Total tokens" value={totalTok.toFixed(1)} unit="M" sub="all recorded days" spark={normalizeSparkline(sonnetSpark)} />
        <KPI label="Avg tokens / day" value={(totalTok / Math.max(1, activeDays)).toFixed(1)} unit="M" sub="active days only" spark={normalizeSparkline(sonnetSpark)} color="var(--slate)" />
        <KPI label="API equiv." value={fmt.usd(totalCost)} sub="subscription — not your bill" spark={normalizeSparkline(sessionsSpark)} color="var(--c-sonnet)" />
      </div>
      <div className="grid g-82">
        <Card title="Daily token usage" sub={`Stacked by model · last ${rangeDays} days`} action={<Legend models={models} />}>
          <StackedBars series={usageSeries} labels={days} models={models} h={240} />
        </Card>
        <Card title="Token share by model" sub={`Distribution across ${rangeDays} days`}>
          <div className="cost-list">
            {byModel.map(m => (
              <div key={m.id} className="cost-row">
                <div className="cost-row-top"><span className="sw" style={{ background: m.color }} />{m.name}<b className="mono">{m.tok.toFixed(1)}M tok</b></div>
                <Bar value={totalTok > 0 ? (m.tok / totalTok) * 100 : 0} color={m.color} />
                <span className="tiny muted">{m.share}% of calls · API equiv {fmt.usd(m.cost)}</span>
              </div>
            ))}
            {byModel.length === 0 && <div className="tiny muted">No usage data for this period</div>}
          </div>
        </Card>
      </div>
      <div className="tiny muted" style={{ padding: '8px 2px', textAlign: 'center' }}>
        On a subscription plan — token usage does not equal billing. API-equivalent values shown for reference only.
      </div>
    </div>
  )
}
