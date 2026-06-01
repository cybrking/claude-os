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

export function UsageView({ live, data }) {
  const { days, usageSeries, models, spark } = data
  const totalTok = usageSeries.reduce((s, d) => s + (d.opus || 0) + (d.sonnet || 0) + (d.haiku || 0), 0)
  const byModelCost = models.filter(m => m.share > 0).map(m => {
    const tok = usageSeries.reduce((s, d) => s + (d[m.id] || 0), 0)
    return { ...m, tok, cost: tok * m.rate }
  })
  const totalCost = byModelCost.reduce((s, m) => s + m.cost, 0)
  return (
    <div className="view">
      <PageHead title="Usage & cost" sub="Last 14 days">
        <div className="seg">
          <button className="seg-btn">7d</button>
          <button className="seg-btn on">14d</button>
          <button className="seg-btn">30d</button>
        </div>
      </PageHead>
      <div className="kpi-strip">
        <KPI label="Total tokens" value={totalTok.toFixed(1)} unit="M" sub="all recorded days" spark={spark(2)} />
        <KPI label="Total spend" value={fmt.usd(totalCost)} sub="blended effective rate" spark={spark(6)} color="var(--c-sonnet)" />
        <KPI label="Avg / day" value={fmt.usd(totalCost / Math.max(1, days.filter((_, i) => usageSeries[i] && (usageSeries[i].sonnet || usageSeries[i].opus) > 0).length))} sub="active days only" spark={spark(4)} color="var(--slate)" />
        <KPI label="Burn now" value={fmt.usd2(live.costRate)} unit="/min" sub="live" spark={spark(8)} color="var(--ok)" />
      </div>
      <div className="grid g-82">
        <Card title="Daily token usage" sub="Stacked by model" action={<Legend models={models} />}>
          <StackedBars series={usageSeries} labels={days} models={models} h={240} />
        </Card>
        <Card title="Cost by model" sub="Blended effective rate">
          <div className="cost-list">
            {byModelCost.map(m => (
              <div key={m.id} className="cost-row">
                <div className="cost-row-top"><span className="sw" style={{ background: m.color }} />{m.name}<b className="mono">{fmt.usd(m.cost)}</b></div>
                <Bar value={totalCost > 0 ? (m.cost / totalCost) * 100 : 0} color={m.color} />
                <span className="tiny muted">{m.tok.toFixed(1)}M tokens · {m.share}% of calls</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
