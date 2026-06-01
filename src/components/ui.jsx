import { useState } from 'react'

export function Card({ title, sub, action, children, className = '', style = {}, pad = true }) {
  return (
    <section className={'card ' + className} style={style}>
      {(title || action) && (
        <header className="card-head">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {sub && <p className="card-sub">{sub}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </header>
      )}
      <div className={pad ? 'card-body' : 'card-body flush'}>{children}</div>
    </section>
  )
}

export const STATUS = {
  active:    { c: 'var(--ok)',    label: 'Active',    pulse: true },
  running:   { c: 'var(--ok)',    label: 'Running',   pulse: true },
  healthy:   { c: 'var(--ok)',    label: 'Healthy',   pulse: false },
  connected: { c: 'var(--ok)',    label: 'Connected', pulse: false },
  done:      { c: 'var(--slate)', label: 'Done',      pulse: false },
  idle:      { c: 'var(--mut)',   label: 'Idle',      pulse: false },
  queued:    { c: 'var(--amber)', label: 'Queued',    pulse: false },
  degraded:  { c: 'var(--amber)', label: 'Degraded',  pulse: false },
  error:     { c: 'var(--red)',   label: 'Error',     pulse: true },
  failed:    { c: 'var(--red)',   label: 'Failed',    pulse: false },
}

export function Dot({ status, size = 8 }) {
  const s = STATUS[status] || STATUS.idle
  return <span className={'dot' + (s.pulse ? ' pulse' : '')} style={{ width: size, height: size, background: s.c }} />
}

export function Pill({ status, children }) {
  const s = STATUS[status] || STATUS.idle
  return (
    <span className="pill" style={{ color: s.c, borderColor: `color-mix(in oklab, ${s.c} 30%, transparent)`, background: `color-mix(in oklab, ${s.c} 9%, transparent)` }}>
      <Dot status={status} size={6} /> {children || s.label}
    </span>
  )
}

export function Sparkline({ data, color = 'var(--clay)', w = 120, h = 32, fill = true }) {
  const max = Math.max(...data), min = Math.min(...data)
  const nx = (i) => (i / (data.length - 1)) * w
  const ny = (v) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6)
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${nx(i).toFixed(1)},${ny(v).toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const gid = 'sg' + Math.round(nx(1) * data[0] * 99 % 9999)
  return (
    <svg width={w} height={h} className="spark" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function StackedBars({ series, labels, models, h = 200 }) {
  const [hover, setHover] = useState(null)
  const totals = series.map(d => models.reduce((s, m) => s + (d[m.id] || 0), 0))
  const max = Math.max(...totals, 0.01) * 1.08
  return (
    <div className="bars-wrap">
      <div className="bars" style={{ height: h }}>
        {series.map((d, i) => {
          const total = totals[i]
          return (
            <div key={i} className="bar-col" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {hover === i && total > 0 && (
                <div className="bar-tip">
                  <div className="bar-tip-total">{total.toFixed(1)}M tokens</div>
                  {models.map(m => <div key={m.id} className="bar-tip-row"><span className="sw" style={{ background: m.color }} />{m.name}<b>{(d[m.id] || 0).toFixed(1)}M</b></div>)}
                </div>
              )}
              <div className="bar-stack" style={{ height: `${(total / max) * 100}%`, opacity: hover === null || hover === i ? 1 : 0.4 }}>
                {[...models].reverse().map(m => (
                  <div key={m.id} className="bar-seg" style={{ height: total > 0 ? `${((d[m.id] || 0) / total) * 100}%` : '0%', background: m.color }} />
                ))}
              </div>
              <span className="bar-label">{labels[i]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Donut({ segments, size = 132, stroke = 16 }) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r
  let acc = 0
  const total = segments.reduce((s, x) => s + x.value, 0)
  return (
    <svg width={size} height={size} className="donut">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      {segments.map((s, i) => {
        const frac = s.value / total, dash = frac * C
        const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc * C} strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        acc += frac; return el
      })}
    </svg>
  )
}

export function Bar({ value, color = 'var(--clay)', track = 'var(--line)' }) {
  return <div className="pbar" style={{ background: track }}><div style={{ width: `${value}%`, background: color }} /></div>
}

export function Glyph({ ch, color = 'var(--clay)', size = 34, soft = true }) {
  return <span className="glyph" style={{ width: size, height: size, color, background: soft ? `color-mix(in oklab, ${color} 12%, transparent)` : 'transparent' }}>{ch}</span>
}

export const fmt = {
  tok: (n) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : '' + n,
  usd: (n) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  usd2: (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}
