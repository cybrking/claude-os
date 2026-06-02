# Security Policy

## Supported Versions

Only the latest release receives security updates.

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Yes     |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately by [opening a GitHub Security Advisory](https://github.com/cybrking/claude-os/security/advisories/new).

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

You can expect an initial response within **48 hours** and a patch within **7 days** for confirmed vulnerabilities.

## Scope

Claude OS reads only from your local `~/.claude/` directory and serves on `localhost` with no external network access. The primary attack surfaces are:

- **Local file access** — the server reads files from `~/.claude/`
- **API endpoints** — `/api/*` routes parse local data
- **Frontend** — React app renders data from the API

## Security Design

- Localhost-only CORS (`localhost` origins only, no wildcard)
- Security headers via `helmet` (XSS protection, clickjacking prevention, CSP)
- `CLAUDE_DIR` validated to remain within the user's home directory
- Directory names validated to prevent path traversal
- JSONL file size capped at 50 MB per file, 2M lines total
- Read-only — no write access to `~/.claude/` or any filesystem path
- No external API calls, no telemetry, no data leaves your machine
