# Agent Buddy

Agent Buddy is a local-first desktop client for installing, injecting, and managing agent bundles across local AI agent runtimes.

## Product role

```text
Agent PaaS  -> defines agent bundles
Agent Buddy -> installs and injects agent bundles into local tools
Agent SaaS  -> hosts and runs agents in cloud or local runtime mode
```

The first MVP focuses on the [`agency-agents-zh`](https://github.com/jnMetaCode/agency-agents-zh) source and the 18 runtimes it supports:

- Claude Code
- GitHub Copilot
- Antigravity
- Gemini CLI
- OpenCode
- OpenClaw
- Cursor
- TRAE
- Aider
- Windsurf
- Qwen Code
- Codex CLI
- DeerFlow
- WorkBuddy
- CodeWhale
- Hermes Agent
- Kiro
- Qoder

## Engineering scope

This initial scaffold provides:

- Tauri v2 + React + Rust desktop shell.
- Runtime registry for all 18 `agency-agents-zh` targets.
- Local source scanner for `agency-agents-zh`.
- Runtime detection commands.
- Installation record storage in SQLite.
- UI pages for source refresh, runtime detection, agent listing, install target selection, and installation records.

## Development

Prerequisites:

- Node.js 20+
- Rust stable
- Tauri system dependencies for your OS
- `git` available in PATH for refreshing GitHub agent sources

Run locally:

```bash
npm install
npm run tauri:dev
```

Build:

```bash
npm run tauri:build
```

## First workflow

1. Open the app.
2. Click **Refresh Source** to clone or update `agency-agents-zh` into Agent Buddy's local data directory.
3. Review detected runtimes.
4. Select agents and target runtimes.
5. Install to global or project-level destinations.

## License and notices

Agent Buddy is being built for compatibility with MIT-licensed open-source agent sources such as `agency-agents-zh`. Preserve upstream copyright and license notices when redistributing generated or bundled agent definitions. See `THIRD_PARTY_NOTICES.md`.
