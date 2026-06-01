# Claude OS

Self-hosted dashboard for your Claude Code workspace. Reads from `~/.claude/` and serves live data at `http://localhost:3001`.

## Requirements
- Node 18+
- Claude Code installed (`~/.claude/` must exist)

## Setup (first time only)

```bash
npm install       # install dependencies
npm run build     # compile frontend → dist/
npm start         # serve at http://localhost:3001
```

> `npm run build` is required before the first `npm start`. The server serves the compiled `dist/` directory.

## Start (after initial setup)

```bash
npm start
```

Opens at http://localhost:3001. If `dist/` is missing (e.g. after a fresh clone), run `npm run build` first.

## Dev mode (hot reload — for code changes)

```bash
npm run dev
```

Starts two processes via `concurrently`:
- **Vite** frontend dev server at `http://localhost:5173` (with hot reload)
- **Express** API server at `http://localhost:3001`

Vite automatically proxies all `/api/*` requests to the Express backend. Open **http://localhost:5173** in dev mode (not `:3001`).

## How it works

- `server/index.js` reads `~/.claude/` on every `/api/*` request, with a 60-second in-memory cache
- `src/hooks/useData.js` polls `/api/*` every 30 seconds — so data refreshes every ~30s in the browser
- No rebuild is needed to see fresh data; the server reads files dynamically on each cache miss

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port to listen on |
| `NODE_ENV` | — | Set to `production` for production mode |
| `CLAUDE_DIR` | `~/.claude` | Path to Claude Code directory |

```bash
# Custom port
PORT=8080 npm start

# Custom Claude directory
CLAUDE_DIR=/path/to/.claude npm start
```

## Data sources

| Endpoint | Reads |
|----------|-------|
| `GET /api/stats` | `~/.claude/projects/*/...jsonl` — token counts by day/model, sessions, cost |
| `GET /api/skills` | `~/.claude/skills/*/SKILL.md` — name + description from frontmatter |
| `GET /api/workflows` | `~/.claude/workflows/*.js` — name + description from `export const meta` |
| `GET /api/connections` | `~/.claude/mcp-needs-auth-cache.json` — MCP server list + auth status |
| `GET /api/memory` | `~/.claude/projects/*/memory/MEMORY.md` — memory entry index |
| `GET /health` | — | Server status + uptime |
