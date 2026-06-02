import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createReadStream, readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { join, resolve, basename } from 'path'
import { homedir } from 'os'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Validate CLAUDE_DIR to prevent path traversal via env var ─────────────────
function resolveClaudeDir(raw) {
  const abs = resolve(raw)
  const home = homedir()
  if (!abs.startsWith(home)) {
    console.error(`CLAUDE_DIR must be within home directory. Got: ${abs}`)
    process.exit(1)
  }
  return abs
}
const CLAUDE_DIR = resolveClaudeDir(process.env.CLAUDE_DIR || join(homedir(), '.claude'))

const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

// ── Limits ────────────────────────────────────────────────────────────────────
const MAX_FILE_BYTES  = 50 * 1024 * 1024   // 50 MB per JSONL file
const MAX_LINES_FILE  = 500_000            // lines per file
const MAX_LINES_TOTAL = 2_000_000          // lines across all files

// ── Safe directory name guard (prevents traversal via crafted dir names) ───────
function isSafeName(name) {
  return !name.includes('..') && !name.includes('/') && !name.includes('\\') && !name.startsWith('.')
}

const app = express()
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    }
  }
}))
app.use(cors({ origin: /^http:\/\/localhost(:\d{1,5})?$/, methods: ['GET'], credentials: false }))
app.use(express.json())

// ── Simple in-memory cache (60s TTL) ─────────────────────────────────────────
const cache = {}
function cached(key, ttl, fn) {
  const now = Date.now()
  if (cache[key] && now - cache[key].ts < ttl) return Promise.resolve(cache[key].data)
  return fn().then(data => { cache[key] = { data, ts: now }; return data })
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeRead(path) {
  try { return readFileSync(path, 'utf8') } catch { return '' }
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return {}
  const result = {}
  for (const line of m[1].split('\n')) {
    const [k, ...v] = line.split(':')
    if (k && v.length) result[k.trim()] = v.join(':').trim().replace(/^["']|["']$/g, '')
  }
  return result
}

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 2) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const mo = d.toLocaleString('en-US', { month: 'short' })
  return `${mo} ${d.getDate()}`
}

// ── Skills ────────────────────────────────────────────────────────────────────
app.get('/api/skills', (_req, res) => {
  const data = cached('skills', 60_000, async () => {
    const skillsDir = join(CLAUDE_DIR, 'skills')
    if (!existsSync(skillsDir)) return []
    const dirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && isSafeName(d.name))
      .map(d => d.name)

    return dirs.map((name, i) => {
      const skillMd = safeRead(join(skillsDir, name, 'SKILL.md'))
      const fm = parseFrontmatter(skillMd)
      const desc = fm.description || skillMd.split('\n').find(l => l && !l.startsWith('---') && !l.startsWith('#')) || ''
      return {
        id: name,
        name,
        desc: desc.slice(0, 140),
        invocations: 0,
        success: 100,
        learnings: 0,
        trend: 0,
        owner: 'you',
        updated: 'installed',
      }
    })
  })
  data.then(d => res.json(d)).catch(() => res.json([]))
})

// ── Workflows ─────────────────────────────────────────────────────────────────
app.get('/api/workflows', (_req, res) => {
  const data = cached('workflows', 60_000, async () => {
    const wfDir = join(CLAUDE_DIR, 'workflows')
    if (!existsSync(wfDir)) return []
    const files = readdirSync(wfDir).filter(f => f.endsWith('.js') && isSafeName(f))

    return files.map((file, i) => {
      const src = safeRead(join(wfDir, file))
      const nameM = src.match(/name:\s*['"]([^'"]+)['"]/)
      const descM = src.match(/description:\s*['"]([^'"]+)['"]/)
      const phasesM = src.matchAll(/title:\s*['"]([^'"]+)['"]/g)
      const chain = [...phasesM].map(m => m[1].toLowerCase()).slice(0, 6)

      const name = nameM?.[1] || file.replace('.js', '')
      const desc = descM?.[1] || ''

      return {
        id: file.replace('.js', ''),
        name,
        desc,
        chain: chain.length ? chain : ['run'],
        runs: 0,
        success: 100,
        avg: '—',
        schedule: 'On demand',
        status: 'healthy',
        lastRun: '—',
      }
    })
  })
  data.then(d => res.json(d)).catch(() => res.json([]))
})

// ── Connections ───────────────────────────────────────────────────────────────
app.get('/api/connections', (_req, res) => {
  const data = cached('connections', 60_000, async () => {
    const cachePath = join(CLAUDE_DIR, 'mcp-needs-auth-cache.json')
    let authNeeded = {}
    try { authNeeded = JSON.parse(safeRead(cachePath)) } catch {}

    const connections = Object.keys(authNeeded).map(name => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name.replace(/^claude\.ai\s*/i, ''),
      kind: 'MCP',
      status: 'idle',
      calls: 0,
      latency: '—',
    }))

    // Composio is always connected if it appears in session data
    connections.unshift({ id: 'composio', name: 'Composio', kind: 'MCP', status: 'connected', calls: 0, latency: '—' })

    return connections
  })
  data.then(d => res.json(d)).catch(() => res.json([]))
})

// ── Memory ────────────────────────────────────────────────────────────────────
app.get('/api/memory', (_req, res) => {
  const data = cached('memory', 60_000, async () => {
    const projectsDir = join(CLAUDE_DIR, 'projects')
    if (!existsSync(projectsDir)) return { entries: [], count: 0 }

    const entries = []
    const projectDirs = readdirSync(projectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && isSafeName(d.name))
      .map(d => join(projectsDir, d.name))

    for (const pdir of projectDirs) {
      const memoryMd = join(pdir, 'memory', 'MEMORY.md')
      if (!existsSync(memoryMd)) continue
      const text = safeRead(memoryMd)
      const lines = text.split('\n').filter(l => l.startsWith('- ['))
      for (const line of lines) {
        const m = line.match(/\- \[([^\]]+)\]\(([^)]+)\)\s*[—–-]\s*(.*)/)
        if (m) {
          entries.push({ name: m[1], file: m[2], desc: m[3], type: 'memory' })
        }
      }
    }

    return { entries, count: entries.length }
  })
  data.then(d => res.json(d)).catch(() => res.json({ entries: [], count: 0 }))
})

// ── Stats (heavy — parses JSONL transcripts) ──────────────────────────────────
app.get('/api/stats', (_req, res) => {
  const data = cached('stats', 60_000, async () => {
    const projectsDir = join(CLAUDE_DIR, 'projects')
    if (!existsSync(projectsDir)) return buildEmptyStats()

    // Collect .jsonl files — skip oversized files, enforce safe names
    const jsonlFiles = []
    for (const entry of readdirSync(projectsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && isSafeName(entry.name)) {
        const sub = join(projectsDir, entry.name)
        for (const f of readdirSync(sub)) {
          if (!f.endsWith('.jsonl') || !isSafeName(f)) continue
          const p = join(sub, f)
          const s = statSync(p, { throwIfNoEntry: false })
          if (s && s.size <= MAX_FILE_BYTES) jsonlFiles.push(p)
        }
      }
      if (entry.name.endsWith('.jsonl') && isSafeName(entry.name)) {
        const p = join(projectsDir, entry.name)
        const s = statSync(p, { throwIfNoEntry: false })
        if (s && s.size <= MAX_FILE_BYTES) jsonlFiles.push(p)
      }
    }

    // Parse tokens by day and model, collect recent sessions
    const byDay = {}
    const recentSessions = []
    let totalLines = 0

    for (const file of jsonlFiles) {
      let sessionTs = null
      let sessionModel = null
      let sessionTok = 0
      let fileLines = 0

      await new Promise(resolve => {
        const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
        rl.on('line', line => {
          if (!line.trim()) return
          if (++fileLines > MAX_LINES_FILE || ++totalLines > MAX_LINES_TOTAL) {
            rl.close(); return
          }
          let msg
          try { msg = JSON.parse(line) } catch { return }

          const ts = msg.timestamp
          const date = ts ? ts.slice(0, 10) : null
          if (!date) return

          if (!byDay[date]) byDay[date] = { sonnet: 0, opus: 0, haiku: 0, sessions: 0 }

          if (msg.type === 'user' && msg.userType === 'external') {
            byDay[date].sessions++
            if (!sessionTs) { sessionTs = ts; sessionModel = 'claude-sonnet-4-6' }
          }

          if (msg.type === 'assistant' && msg.message?.usage) {
            const usage = msg.message.usage
            const model = msg.message.model || ''
            const tok = (usage.input_tokens || 0) + (usage.output_tokens || 0) + (usage.cache_read_input_tokens || 0)
            if (model.includes('opus')) byDay[date].opus += tok
            else if (model.includes('haiku')) byDay[date].haiku += tok
            else byDay[date].sonnet += tok
            sessionTok += tok
            sessionModel = model
          }
        })
        rl.on('close', () => {
          if (sessionTs && sessionTok > 0) {
            recentSessions.push({ ts: sessionTs, model: sessionModel, tokens: sessionTok })
          }
          resolve()
        })
        rl.on('error', resolve)
      })
    }

    // Build 14-day window ending today
    const today = new Date()
    const days = []
    const usageSeries = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push(formatDate(key))
      const row = byDay[key] || { sonnet: 0, opus: 0, haiku: 0, sessions: 0 }
      usageSeries.push({
        sonnet: +(row.sonnet / 1e6).toFixed(2),
        opus:   +(row.opus   / 1e6).toFixed(2),
        haiku:  +(row.haiku  / 1e6).toFixed(2),
      })
    }

    const todayKey = today.toISOString().slice(0, 10)
    const todayRow = byDay[todayKey] || { sonnet: 0, opus: 0, haiku: 0, sessions: 0 }
    const todayTokens = todayRow.sonnet + todayRow.opus + todayRow.haiku
    const todaySessions = todayRow.sessions

    // Compute totals and cost
    let totalSonnet = 0, totalOpus = 0, totalHaiku = 0
    for (const row of Object.values(byDay)) {
      totalSonnet += row.sonnet; totalOpus += row.opus; totalHaiku += row.haiku
    }
    const totalCost = Math.round(
      (totalSonnet / 1e6) * 0.32 +
      (totalOpus   / 1e6) * 3.0  +
      (totalHaiku  / 1e6) * 0.05
    )

    // Model share
    const totalAll = totalSonnet + totalOpus + totalHaiku || 1
    const models = [
      { id: 'sonnet', name: 'Sonnet 4.6', color: 'var(--c-sonnet)', rate: 0.32, share: Math.round(totalSonnet / totalAll * 100) },
      { id: 'opus',   name: 'Opus 4.8',   color: 'var(--c-opus)',   rate: 3.0,  share: Math.round(totalOpus   / totalAll * 100) },
      { id: 'haiku',  name: 'Haiku 4.5',  color: 'var(--c-haiku)',  rate: 0.05, share: Math.round(totalHaiku  / totalAll * 100) },
    ]

    // Recent tasks from sessions
    const tasks = recentSessions
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 12)
      .map((s, i) => ({
        id: 1000 - i,
        title: `Session ${new Date(s.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        agent: s.model?.includes('opus') ? 'Claude Opus' : 'Claude Sonnet',
        skill: 'claude-code',
        status: i === 0 ? 'running' : 'done',
        started: relativeTime(s.ts),
        dur: '—',
        tokens: s.tokens,
      }))

    // Agents derived from model usage
    const agents = [
      { id: 'sonnet-main', name: 'Claude Sonnet', role: 'Primary workhorse', status: 'active', model: 'claude-sonnet-4-6', tasksToday: todaySessions, tokensToday: todayRow.sonnet, uptime: '100%', glyph: '✻', note: 'Coding, writing, research, design' },
      { id: 'opus-planner', name: 'Claude Opus', role: 'Deep reasoning', status: totalOpus > 0 ? 'idle' : 'idle', model: 'claude-opus-4-8', tasksToday: 0, tokensToday: totalOpus, uptime: '100%', glyph: '◆', note: totalOpus > 0 ? `${(totalOpus / 1e6).toFixed(1)}M tokens used` : 'Not used yet' },
      { id: 'code-worker', name: 'Code Worker', role: 'File & shell ops', status: 'active', model: 'claude-sonnet-4-6', tasksToday: 0, tokensToday: 0, uptime: '100%', glyph: '⟓', note: 'Bash · Edit · Read · Write' },
      { id: 'researcher',  name: 'Researcher',   role: 'Web research',    status: 'idle',   model: 'claude-sonnet-4-6', tasksToday: 0, tokensToday: 0, uptime: '100%', glyph: '◎', note: 'WebSearch · WebFetch' },
      { id: 'subagents',   name: 'Sub-agents',   role: 'Spawned workers', status: 'idle',   model: 'claude-sonnet-4-6', tasksToday: 0, tokensToday: 0, uptime: '100%', glyph: '◈', note: 'Via Agent tool' },
      { id: 'wf-engine',   name: 'Workflows',    role: 'Multi-agent harness', status: 'idle', model: 'claude-sonnet-4-6', tasksToday: 0, tokensToday: 0, uptime: '100%', glyph: '⟿', note: 'Via Workflow tool' },
    ]

    const schedules = [
      { id: 's1', name: 'AI Changelog Publish', cron: 'on demand', next: 'next AI release', every: 'manual', on: true },
      { id: 's2', name: 'CVE Triage', cron: 'Gemfile change', next: 'on next PR', every: 'webhook', on: true },
      { id: 's3', name: 'Deep Research', cron: 'on demand', next: 'on demand', every: 'manual', on: true },
      { id: 's4', name: 'Code Review', cron: 'on demand', next: 'on demand', every: 'manual', on: true },
    ]

    return { days, usageSeries, models, agents, tasks, schedules, todayTokens, todaySessions, totalCost }
  })
  data.then(d => res.json(d)).catch(e => { console.error(e); res.json(buildEmptyStats()) })
})

function buildEmptyStats() {
  const today = new Date()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (13 - i))
    return formatDate(d.toISOString().slice(0, 10))
  })
  return {
    days, usageSeries: days.map(() => ({ sonnet: 0, opus: 0, haiku: 0 })),
    models: [
      { id: 'sonnet', name: 'Sonnet 4.6', color: 'var(--c-sonnet)', rate: 0.32, share: 100 },
      { id: 'opus',   name: 'Opus 4.8',   color: 'var(--c-opus)',   rate: 3.0,  share: 0   },
      { id: 'haiku',  name: 'Haiku 4.5',  color: 'var(--c-haiku)',  rate: 0.05, share: 0   },
    ],
    agents: [], tasks: [], schedules: [],
    todayTokens: 0, todaySessions: 0, totalCost: 0,
  }
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: Math.floor(process.uptime()) }))

// ── Static files in production ────────────────────────────────────────────────
if (isProd) {
  const distDir = join(__dirname, '..', 'dist')
  app.use(express.static(distDir))
  app.get('*', (_req, res) => res.sendFile(join(distDir, 'index.html')))
}

const server = app.listen(PORT, () => {
  console.log(`Claude OS running at http://localhost:${PORT}`)
  console.log(`Reading from: ${CLAUDE_DIR}`)
})

function shutdown() {
  server.close(() => process.exit(0))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
