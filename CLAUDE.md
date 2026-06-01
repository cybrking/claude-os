# Claude OS Dashboard

Self-hosted dashboard for your Claude Code workspace. Reads from `~/.claude/` live and serves real-time data at `http://localhost:3001`.

## Requirements
- Node 18+
- Claude Code installed (`~/.claude/` must exist)

## Setup & start (first time)
```
npm install
npm run build
npm start
```

## Start (after first setup)
```
npm start
```
Opens at http://localhost:3001

## Dev mode (hot reload — for contributors)
```
npm run dev
```
Vite at :5173, API at :3001, proxied automatically.

## How it works
- `server/index.js` — Express reads `~/.claude/` on every `/api/*` request (60s cache)
- `src/` — React frontend polls `/api/*` every 30 seconds
- No rebuild needed to see fresh data — just `npm start`

## Data sources
| Endpoint | Reads |
|----------|-------|
| `/api/stats` | `~/.claude/projects/*/**.jsonl` — token usage, sessions, cost |
| `/api/skills` | `~/.claude/skills/*/SKILL.md` |
| `/api/workflows` | `~/.claude/workflows/*.js` |
| `/api/connections` | `~/.claude/mcp-needs-auth-cache.json` |
| `/api/memory` | `~/.claude/projects/*/memory/MEMORY.md` |

## Custom Claude dir
```
CLAUDE_DIR=/path/to/custom/.claude npm start
```
