# Claude OS

> A self-hosted, real-time dashboard for your [Claude Code](https://claude.ai/code) workspace.

[![License: MIT](https://img.shields.io/badge/License-MIT-clay.svg)](LICENSE)
[![CI](https://github.com/cybrking/claude-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cybrking/claude-os/actions/workflows/ci.yml)
[![Node ≥18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

Monitor token usage, installed skills, workflows, MCP connections, and memory — all sourced live from `~/.claude/` with no configuration required.

---

## Features

- **Real-time token usage** — parsed from your JSONL transcripts, broken down by model (Sonnet, Opus, Haiku) and day
- **Skills browser** — every skill installed in `~/.claude/skills/`, with descriptions and invocation stats
- **Workflows list** — scripts from `~/.claude/workflows/` with chain visualization
- **MCP connections** — live status of every connected MCP server
- **Memory viewer** — entries from your file-based memory store
- **Live activity ticker** — session count, cost per minute (USD), and queue depth, ticking every 2 seconds
- **9 views** — Overview · Agents · Skills · Workflows · Tasks · Usage & cost · Memory · Connections · Schedules
- **Auto-refresh** — data reloads every 30 seconds without a page refresh or rebuild

---

## Quick Start

```bash
git clone https://github.com/cybrking/claude-os
cd claude-os
npm install
npm run build
npm start
```

Open **http://localhost:3001** — the dashboard auto-discovers your `~/.claude/` workspace.

### Requirements

- **Node.js 18+** — [download](https://nodejs.org)
- **Claude Code** — `~/.claude/` must exist ([get Claude Code](https://claude.ai/code))

---

## How It Works

Claude OS reads your local `~/.claude/` directory on every API request (60-second server cache) and streams it to a React frontend that polls every 30 seconds.

```
~/.claude/
  projects/*/**.jsonl   →  token usage, session history, cost
  skills/*/SKILL.md     →  installed skills + descriptions
  workflows/*.js        →  workflow scripts + chain steps
  mcp-needs-auth-cache  →  MCP server list + auth status
  projects/*/memory/    →  memory entries
```

No external API calls. No accounts. No data leaves your machine.

---

## Configuration

All configuration is via environment variables — no config files needed.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port the server listens on |
| `NODE_ENV` | — | Set to `production` for production mode |
| `CLAUDE_DIR` | `~/.claude` | Path to your Claude Code directory |

**Examples:**

```bash
# Run on a different port
PORT=8080 npm start

# Point to a non-standard Claude directory
CLAUDE_DIR=/Volumes/external/.claude npm start

# Both at once
PORT=8080 CLAUDE_DIR=/custom/.claude npm start
```

---

## Development

```bash
git clone https://github.com/cybrking/claude-os
cd claude-os
npm install
npm run dev
```

This starts two processes concurrently:
- **Vite** — React dev server with hot reload at `http://localhost:5173`
- **Express** — API server at `http://localhost:3001` (Vite proxies `/api/*` calls automatically)

Open `http://localhost:5173` (not `:3001`) in dev mode.

### Project Structure

```
claude-os/
├── server/
│   └── index.js          # Express API — reads ~/.claude/, serves dist/ in production
├── src/
│   ├── App.jsx            # Root component, routing, error boundary, live ticker
│   ├── index.css          # Design system (CSS custom properties, all component styles)
│   ├── hooks/
│   │   └── useData.js     # Polls /api/* every 30s, retry on failure
│   ├── components/
│   │   ├── ui.jsx         # Primitives: Card, Dot, Pill, Sparkline, StackedBars, etc.
│   │   └── Overview.jsx   # Overview page + shared row components
│   └── views/             # One file per nav section (8 views)
├── public/
│   └── favicon.svg        # Clay ✻ icon
├── .github/
│   └── workflows/ci.yml   # Build verification on Node 18 + 20
├── CLAUDE.md              # Setup instructions for Claude Code users
└── package.json
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite + Express concurrently (hot reload) |
| `npm run build` | Production build → `dist/` |
| `npm start` | Serve `dist/` + API on port 3001 |
| `npm run preview` | Preview production build locally |

---

## Security & Privacy

- **Local only** — reads exclusively from your machine's `~/.claude/` directory
- **No external calls** — zero network requests beyond Google Fonts (CSS only)
- **Localhost CORS** — API only accepts requests from `localhost` origins
- **Security headers** — `helmet` middleware applied to all responses
- **Read-only** — no write access to your `~/.claude/` data; the server only reads files
- **Open source** — audit the code: [server/index.js](server/index.js), [src/hooks/useData.js](src/hooks/useData.js)

---

## Troubleshooting

**Port 3001 is already in use**
```bash
PORT=3002 npm start
```

**Dashboard shows no data / blank views**

The server serves the built `dist/` directory. Make sure you've run the build step:
```bash
npm run build
npm start
```

**`~/.claude/` not found**

Claude OS requires Claude Code to be installed. If your Claude directory is in a non-standard location:
```bash
CLAUDE_DIR=/path/to/your/.claude npm start
```

**Skills or workflows not showing**

- Skills must be in `~/.claude/skills/<name>/SKILL.md`
- Workflows must be `.js` files in `~/.claude/workflows/`
- Restart the server after adding new skills/workflows (data refreshes every 60s server-side)

**Token usage shows zeros**

The server parses `~/.claude/projects/` JSONL transcript files. If you've recently started using Claude Code, data accumulates over time. The first parse may take a few seconds — wait for the 30-second refresh cycle.

**Dev server won't start**

```bash
# Check if ports are free
lsof -i :3001
lsof -i :5173

# Kill existing processes if needed
kill $(lsof -ti :3001)
```

---

## Contributing

Contributions are welcome. Please open an issue before submitting a large PR so we can discuss the approach.

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes and run `npm run build` to verify
4. Open a pull request against `main`

For bugs, please include your Node version (`node --version`) and any console errors from the browser or terminal.

---

## License

[MIT](LICENSE) — © 2026 Travis Felder
