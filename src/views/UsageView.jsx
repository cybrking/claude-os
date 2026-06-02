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
  const { days, usageSeries, models, spark } = data
  const totalTok = usageSeries.reduce((s, d) => s + (d.opus || 0) + (d.sonnet || 0) + (d.haiku || 0), 0)
  const activeDays = days.filter((_, i) => usageSeries[i] && (usageSeries[i].sonnet || usageSeries[i].opus) > 0).length
  const byModel = models.map(m => {
    const tok = usageSeries.reduce((s, d) => s + (d[m.id] || 0), 0)
    const cost = tok * m.rate
    return { ...m, tok, cost }
  }).filter(m => m.tok > 0)
  const totalCost = byModel.reduce((s, m) => s + m.cost, 0)

  return (
    <div className="view">
      <PageHead title="Usage" sub="Last 14 days">
        <div className="seg">
          <button className="seg-btn">7d</button>
          <button className="seg-btn on">14d</button>
          <button className="seg-btn">30d</button>
        </div>
      </PageHead>
      <div className="kpi-strip">
        <KPI label="Total tokens" value={totalTok.toFixed(1)} unit="M" sub="all recorded days" spark={spark(2)} />
        <KPI label="Avg tokens / day" value={(totalTok / Math.max(1, activeDays)).toFixed(1)} unit="M" sub="active days only" spark={spark(4)} color="var(--slate)" />
        <KPI label="API equiv." value={fmt.usd(totalCost)} sub="subscription — not your bill" spark={spark(6)} color="var(--c-sonnet)" />
      </div>
      <div className="grid g-82">
        <Card title="Daily token usage" sub="Stacked by model" action={<Legend models={models} />}>
          <StackedBars series={usageSeries} labels={days} models={models} h={240} />
        </Card>
        <Card title="Token share by model" sub="Distribution across 14 days">
          <div className="cost-list">
            {byModel.map(m => (
              <div key={m.id} className="cost-row">
                <div className="cost-row-top"><span className="sw" style={{ background: m.color }} />{m.name}<b className="mono">{m.tok.toFixed(1)}M tok</b></div>
                <Bar value={totalTok > 0 ? (m.tok / totalTok) * 100 : 0} color={m.color} />
                <span className="tiny muted">{m.share}% of calls · API equiv {fmt.usd(m.cost)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="tiny muted" style={{ padding: '8px 2px', textAlign: 'center' }}>
        On a subscription plan — token usage does not equal billing. API-equivalent values shown for reference only.
      </div>
    </div>
  )
}
