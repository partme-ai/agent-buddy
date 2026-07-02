# Agent Buddy local state surface

This document lists the current local-first feature surface implemented before validation.

## Source and agent catalog

- `agency-agents-zh` clone/update by local Git.
- Frontmatter/body parsing for local agent catalog.
- Category and search-ready agent summaries.
- Local Agent Bundle preview generated from source agents.

## Runtime installation layer

- 18 runtime registry.
- Runtime detection by command, environment variable, and default config path.
- Runtime-specific generated file conversion.
- Install Plan preview.
- Generated artifact cache.
- Backup-before-overwrite.
- Rollback attempt on failed install.
- Installation records.
- Restore backup.
- OpenClaw registration post-action placeholder.

## cc-switch-inspired local control-plane patterns

Borrowed patterns, not product cloning:

- SQLite as local single source of truth.
- Runtime/App adapter registry.
- Deep Link parser.
- Doctor/health checks.
- Backup and restore discipline.
- Generated/local artifact cache.
- Install records and event logs.

## Agent Buddy-specific state layers

### Agent Bundle

- Local `AgentBundle` model.
- Profile, instructions, knowledge policy, memory policy, skills, MCP, permissions, targets, source metadata.

### MCP Registry

- Built-in Buddy MCP server definitions:
  - `buddy-memory`
  - `buddy-knowledge`
  - `buddy-session`
  - `buddy-approval`
- Policy fields for audit, approval, filesystem, network, and shell access.

### Skill Registry

- Built-in Buddy skills:
  - `buddy-memory`
  - `buddy-knowledge`
  - `buddy-handoff`
- Runtime target path metadata.
- Sync mode metadata inspired by cc-switch skill sync modes.

### Memory Center

- Memory items.
- Memory candidates.
- Propose memory.
- Approve candidate into active memory.

### Knowledge Mirror

- Knowledge spaces.
- Knowledge snapshots.
- Default local spaces for source metadata and Buddy docs.

### Session Event Center

- Session events.
- Handoff packs.
- Create handoff pack from current session context.

### Audit and Sync

- Audit events.
- Sync outbox events.
- Agent installation creates pending sync events.

### Settings and Risk

- Local settings file.
- Device ID.
- PaaS base URL.
- Sync/telemetry flags.
- Backup/generated artifact retention.
- Risk scanner for generated content and skills.

## Still pending before validation

- Split central `adapters.rs` into per-runtime adapter modules.
- Add real MCP config writers for Claude/Codex/OpenCode/Hermes/WorkBuddy.
- Add generated artifact diff view.
- Add risk scan UI for generated artifacts.
- Add settings UI.
- Add PaaS login and bundle pull.
- Add local HTTP/MCP server runtime.
- Add platform-specific Tauri Deep Link registration.
