# Claude OS

A self-hosted dashboard for your [Claude Code](https://claude.ai/code) workspace. Shows your real skills, workflows, token usage, and MCP connections — live, directly from `~/.claude/`.

## Quickstart

```bash
git clone https://github.com/travisfelder/claude-os
cd claude-os
npm install
npm run build
npm start
# → http://localhost:3001
```

Or open Claude Code in the project folder and say: **"set up and start the dashboard"**

## What it shows

- **Token usage** — real data from your JSONL transcripts, broken down by model and day
- **Skills** — every skill installed in `~/.claude/skills/`
- **Workflows** — scripts from `~/.claude/workflows/`
- **MCP connections** — from your Claude Code session config
- **Memory** — entries from your file-based memory store
- **Live ticker** — sessions, cost/min, queue depth (ticks every 2s)

Data refreshes every 30 seconds — no rebuild required.

## Requirements

- Node 18+
- [Claude Code](https://claude.ai/code) installed (`~/.claude/` must exist)

## Dev mode

```bash
npm run dev
```

Vite dev server at `:5173` with API proxied from `:3001`.
