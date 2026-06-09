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
const MAX_FILE_BYTES  = 50 * 1024 * 1024
const MAX_LINES_FILE  = 500_000
const MAX_LINES_TOTAL = 2_000_000

// ── Safe directory name guard ──────────────────────────────────────────────────
function isSafeName(name) {
  return !name.includes('..') && !name.includes('/') && !name.includes('\\') && !name.startsWith('.')
}

// ── Safe path guard: must stay within CLAUDE_DIR ──────────────────────────────
function isSafePath(resolvedPath) {
  return resolvedPath.startsWith(CLAUDE_DIR + '/')
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

// ── Simple in-memory cache (60s TTL) ─────────────────────────────────────────
const cache = {}
function cached(key, ttl, fn, forceFresh = false) {
  const now = Date.now()
  if (!forceFresh && cache[key] && now - cache[key].ts < ttl) return Promise.resolve(cache[key].data)
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

function readSettings() {
  try { return JSON.parse(safeRead(join(CLAUDE_DIR, 'settings.json'))) } catch { return {} }
}

// ── Sessions ──────────────────────────────────────────────────────────────────
app.get('/api/sessions', (req, res) => {
  const bust = req.query.bust === '1'
  const data = cached('sessions', 60_000, async () => {
    const sessDir = join(CLAUDE_DIR, 'sessions')
    if (!existsSync(sessDir)) return []
    const files = readdirSync(sessDir).filter(f => f.endsWith('.json') && isSafeName(f))
    const sessions = []
    for (const file of files) {
      try {
        const raw = JSON.parse(safeRead(join(sessDir, file)))
        sessions.push({
          pid: raw.pid,
          sessionId: raw.sessionId,
          cwd: raw.cwd,
          startedAt: raw.startedAt || raw.procStart,
          status: raw.status || 'active',
          version: raw.version,
          kind: raw.kind,
          entrypoint: raw.entrypoint,
        })
      } catch {}
    }
    return sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
  }, bust)
  data.then(d => res.json(d)).catch(() => res.json([]))
})

// ── Plugins ───────────────────────────────────────────────────────────────────
app.get('/api/plugins', (req, res) => {
  const bust = req.query.bust === '1'
  const data = cached('plugins', 60_000, async () => {
    const pluginsPath = join(CLAUDE_DIR, 'plugins', 'installed_plugins.json')
    if (!existsSync(pluginsPath)) return []
    let installed
    try { installed = JSON.parse(safeRead(pluginsPath)) } catch { return [] }

    const settings = readSettings()
    const enabledPlugins = typeof settings.enabledPlugins === 'object' && !Array.isArray(settings.enabledPlugins)
      ? settings.enabledPlugins
      : {}

    const plugins = installed.plugins || {}
    return Object.entries(plugins).map(([key, instances]) => {
      const inst = Array.isArray(instances) ? (instances[0] || {}) : (instances || {})
      const atIdx = key.lastIndexOf('@')
      const name = atIdx > 0 ? key.slice(0, atIdx) : key
      const marketplace = atIdx > 0 ? key.slice(atIdx + 1) : 'unknown'
      return {
        id: key,
        name,
        marketplace,
        scope: inst.scope || 'user',
        version: inst.version || 'unknown',
        installedAt: inst.installedAt,
        lastUpdated: inst.lastUpdated,
        enabled: key in enabledPlugins,
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, bust)
  data.then(d => res.json(d)).catch(() => res.json([]))
})

// ── Hooks ─────────────────────────────────────────────────────────────────────
app.get('/api/hooks', (req, res) => {
  const bust = req.query.bust === '1'
  const data = cached('hooks', 60_000, async () => {
    const hooksDir = join(CLAUDE_DIR, 'hooks')
    const scripts = []
    if (existsSync(hooksDir)) {
      const files = readdirSync(hooksDir).filter(f => (f.endsWith('.sh') || f.endsWith('.py')) && isSafeName(f))
      for (const file of files) {
        const p = join(hooksDir, file)
        const s = statSync(p, { throwIfNoEntry: false })
        scripts.push({
          name: file,
          size: s?.size || 0,
          lastModified: s?.mtime?.toISOString(),
        })
      }
    }

    const bindings = []
    const settings = readSettings()
    const hooks = settings.hooks || {}
    for (const [event, configs] of Object.entries(hooks)) {
      for (const cfg of configs) {
        const matcher = cfg.matcher || null
        for (const h of (cfg.hooks || [])) {
          bindings.push({ event, matcher, type: h.type, command: h.command })
        }
      }
    }

    return { scripts, bindings }
  }, bust)
  data.then(d => res.json(d)).catch(() => res.json({ scripts: [], bindings: [] }))
})

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const bust = req.query.bust === '1'
  const data = cached('settings', 60_000, async () => {
    const settings = readSettings()
    const perms = settings.permissions || {}
    const allowList = Array.isArray(perms.allow) ? perms.allow : []
    return {
      model: settings.model || null,
      theme: settings.theme || null,
      effortLevel: settings.effortLevel || null,
      permissionCount: allowList.length,
      enabledPluginCount: typeof settings.enabledPlugins === 'object' ? Object.keys(settings.enabledPlugins).length : 0,
      hookEventCount: typeof settings.hooks === 'object' ? Object.keys(settings.hooks).length : 0,
    }
  }, bust)
  data.then(d => res.json(d)).catch(() => res.json({}))
})

// ── Skills ────────────────────────────────────────────────────────────────────
app.get('/api/skills', (req, res) => {
  const bust = req.query.bust === '1'
  const data = cached('skills', 60_000, async () => {
    const skillsDir = join(CLAUDE_DIR, 'skills')
    if (!existsSync(skillsDir)) return []
    const dirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && isSafeName(d.name))
      .map(d => d.name)

    return dirs.map(name => {
      const skillMd = safeRead(join(skillsDir, name, 'SKILL.md'))
      const fm = parseFrontmatter(skillMd)
      const desc = fm.description || skillMd.split('\n').find(l => l && !l.startsWith('---') && !l.startsWith('#')) || ''
      const tags = fm.tags ? fm.tags.split(',').map(t => t.trim()).filter(Boolean) : []

      // Extract "When to use" section as trigger hint
      const whenMatch = skillMd.match(/##\s+When to use\n+([\s\S]*?)(?:\n##|\n---|\s*$)/)
      const trigger = whenMatch ? whenMatch[1].trim().split('\n')[0].slice(0, 120) : ''

      return {
        id: name,
        name,
        desc: desc.slice(0, 140),
        tags,
        trigger,
        owner: 'you',
        updated: 'installed',
      }
    })
  }, bust)
  data.then(d => res.json(d)).catch(() => res.json([]))
})

// ── Workflows ─────────────────────────────────────────────────────────────────
app.get('/api/workflows', (req, res) => {
  const bust = req.query.bust === '1'
  const data = cached('workflows', 60_000, async () => {
    const wfDir = join(CLAUDE_DIR, 'workflows')
    if (!existsSync(wfDir)) return []
    const files = readdirSync(wfDir).filter(f => f.endsWith('.js') && isSafeName(f))

    return files.map(file => {
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
  }, bust)
  data.then(d => res.json(d)).catch(() => res.json([]))
})

// ── Connections ───────────────────────────────────────────────────────────────
app.get('/api/connections', (req, res) => {
  const bust = req.query.bust === '1'
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

    connections.unshift({ id: 'composio', name: 'Composio', kind: 'MCP', status: 'connected', calls: 0, latency: '—' })
    return connections
  }, bust)
  data.then(d => res.json(d)).catch(() => res.json([]))
})

// ── Memory ────────────────────────────────────────────────────────────────────
app.get('/api/memory', (req, res) => {
  const bust = req.query.bust === '1'
  const data = cached('memory', 60_000, async () => {
    const projectsDir = join(CLAUDE_DIR, 'projects')
    if (!existsSync(projectsDir)) return { entries: [], count: 0 }

    const entries = []
    const projectDirs = readdirSync(projectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && isSafeName(d.name))
      .map(d => ({ name: d.name, path: join(projectsDir, d.name) }))

    for (const { name: project, path: pdir } of projectDirs) {
      const memoryMd = join(pdir, 'memory', 'MEMORY.md')
      if (!existsSync(memoryMd)) continue
      const text = safeRead(memoryMd)
      const lines = text.split('\n').filter(l => l.startsWith('- ['))
      for (const line of lines) {
        const m = line.match(/\- \[([^\]]+)\]\(([^)]+)\)\s*[—–-]\s*(.*)/)
        if (m) {
          entries.push({ name: m[1], file: m[2], desc: m[3], type: 'memory', project })
        }
      }
    }

    return { entries, count: entries.length }
  }, bust)
  data.then(d => res.json(d)).catch(() => res.json({ entries: [], count: 0 }))
})

// ── Memory file content ────────────────────────────────────────────────────────
app.get('/api/memory/:project/:file', (req, res) => {
  const { project, file } = req.params
  if (!isSafeName(project) || !isSafeName(file) || !file.endsWith('.md')) {
    return res.status(400).json({ error: 'invalid path' })
  }
  const filePath = resolve(join(CLAUDE_DIR, 'projects', project, 'memory', file))
  if (!isSafePath(filePath)) return res.status(403).json({ error: 'forbidden' })
  if (!existsSync(filePath)) return res.status(404).json({ error: 'not found' })
  res.json({ content: safeRead(filePath) })
})

// ── Stats (heavy — parses JSONL transcripts) ──────────────────────────────────
// Always returns 30-day window so frontend can slice to 7/14/30
app.get('/api/stats', (req, res) => {
  const bust = req.query.bust === '1'
  const data = cached('stats', 60_000, async () => {
    const projectsDir = join(CLAUDE_DIR, 'projects')
    if (!existsSync(projectsDir)) return buildEmptyStats()

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

    const byDay = {}
    const recentSessions = []
    let totalLines = 0

    for (const file of jsonlFiles) {
      let sessionTs = null
      let sessionModel = null
      let sessionTok = 0
      let sessionTitle = null
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
            if (!sessionTs) {
              sessionTs = ts
              sessionModel = 'claude-sonnet-4-6'
            }
            // Capture first message as session title
            if (!sessionTitle) {
              const content = msg.message
              if (typeof content === 'string') {
                sessionTitle = content.trim().slice(0, 80)
              } else if (Array.isArray(content)) {
                const textBlock = content.find(b => b?.type === 'text')
                if (textBlock?.text) sessionTitle = textBlock.text.trim().slice(0, 80)
              } else if (content && typeof content === 'object') {
                const c = content.content
                if (typeof c === 'string') sessionTitle = c.trim().slice(0, 80)
                else if (Array.isArray(c)) {
                  const tb = c.find(b => b?.type === 'text')
                  if (tb?.text) sessionTitle = tb.text.trim().slice(0, 80)
                }
              }
            }
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
            recentSessions.push({ ts: sessionTs, model: sessionModel, tokens: sessionTok, title: sessionTitle })
          }
          resolve()
        })
        rl.on('error', resolve)
      })
    }

    // Build 30-day window ending today
    const today = new Date()
    const days = []
    const usageSeries = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push(formatDate(key))
      const row = byDay[key] || { sonnet: 0, opus: 0, haiku: 0, sessions: 0 }
      usageSeries.push({
        sonnet: +(row.sonnet / 1e6).toFixed(2),
        opus:   +(row.opus   / 1e6).toFixed(2),
        haiku:  +(row.haiku  / 1e6).toFixed(2),
        sessions: row.sessions,
      })
    }

    const todayKey = today.toISOString().slice(0, 10)
    const todayRow = byDay[todayKey] || { sonnet: 0, opus: 0, haiku: 0, sessions: 0 }
    const todayTokens = todayRow.sonnet + todayRow.opus + todayRow.haiku
    const todaySessions = todayRow.sessions

    let totalSonnet = 0, totalOpus = 0, totalHaiku = 0
    for (const row of Object.values(byDay)) {
      totalSonnet += row.sonnet; totalOpus += row.opus; totalHaiku += row.haiku
    }
    const totalCost = Math.round(
      (totalSonnet / 1e6) * 0.32 +
      (totalOpus   / 1e6) * 3.0  +
      (totalHaiku  / 1e6) * 0.05
    )

    const totalAll = totalSonnet + totalOpus + totalHaiku || 1
    const models = [
      { id: 'sonnet', name: 'Sonnet 4.6', color: 'var(--c-sonnet)', rate: 0.32, share: Math.round(totalSonnet / totalAll * 100) },
      { id: 'opus',   name: 'Opus 4.8',   color: 'var(--c-opus)',   rate: 3.0,  share: Math.round(totalOpus   / totalAll * 100) },
      { id: 'haiku',  name: 'Haiku 4.5',  color: 'var(--c-haiku)',  rate: 0.05, share: Math.round(totalHaiku  / totalAll * 100) },
    ]

    const tasks = recentSessions
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 12)
      .map((s, i) => {
        const dateLabel = new Date(s.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        return {
          id: 1000 - i,
          title: s.title || `Session ${dateLabel}`,
          agent: s.model?.includes('opus') ? 'Claude Opus' : 'Claude Sonnet',
          skill: 'claude-code',
          status: i === 0 ? 'running' : 'done',
          started: relativeTime(s.ts),
          dur: '—',
          tokens: s.tokens,
        }
      })

    const agents = [
      { id: 'sonnet-main', name: 'Claude Sonnet', role: 'Primary workhorse', status: todaySessions > 0 ? 'active' : 'idle', model: 'claude-sonnet-4-6', tasksToday: todaySessions, tokensToday: todayRow.sonnet, uptime: '100%', glyph: '✻', note: 'Coding, writing, research, design' },
      { id: 'opus-planner', name: 'Claude Opus', role: 'Deep reasoning', status: totalOpus > 0 ? 'active' : 'idle', model: 'claude-opus-4-8', tasksToday: 0, tokensToday: totalOpus, uptime: '100%', glyph: '◆', note: totalOpus > 0 ? `${(totalOpus / 1e6).toFixed(1)}M tokens used` : 'Not used yet' },
    ]

    return { days, usageSeries, models, agents, tasks, schedules: [], todayTokens, todaySessions, totalCost }
  }, bust)
  data.then(d => res.json(d)).catch(e => { console.error(e); res.json(buildEmptyStats()) })
})

function buildEmptyStats() {
  const today = new Date()
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (29 - i))
    return formatDate(d.toISOString().slice(0, 10))
  })
  return {
    days,
    usageSeries: days.map(() => ({ sonnet: 0, opus: 0, haiku: 0, sessions: 0 })),
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
