# Agent Buddy complete implementation strategy

This document tracks the implementation target for the local Agent Buddy client before validation.

## Current instruction

Build first, then validate. The implementation should cover the complete local installer and local-state feature set before running build and runtime verification.

## Functional target

Agent Buddy must support the full `agency-agents-zh` runtime surface:

1. Claude Code
2. GitHub Copilot
3. Antigravity
4. Gemini CLI
5. OpenCode
6. OpenClaw
7. Cursor
8. TRAE
9. Aider
10. Windsurf
11. Qwen Code
12. Codex CLI
13. DeerFlow
14. WorkBuddy
15. CodeWhale
16. Hermes Agent
17. Kiro
18. Qoder

## Implementation requirements

- Runtime adapter registry for all 18 runtimes.
- Source refresh and parser for `agency-agents-zh`.
- Runtime detection by command, config directory, environment variable, or custom path.
- Runtime-specific conversion.
- Install Plan generation before writing files.
- Generated artifact cache.
- Backup overwritten files.
- Rollback on failed installs.
- SQLite records for sources, detections, installation records, installed files, backups, logs, audit events, sync outbox, memory, knowledge, session, and handoff state.
- UI flow for source refresh, runtime detection, agent selection, install plan preview, installation execution, backup restore, events, generated artifact preview, Memory/Knowledge, Session/Handoff, Audit/Sync.

## Expanded local state requirements

Agent Buddy should act as a local edge control plane, not only a file installer. The current implementation therefore includes domain models and commands for:

- Agent Bundle preview.
- Agent Bundle diff.
- Instruction injection plans.
- MCP config plans.
- Buddy MCP registry.
- Buddy skill registry.
- Memory candidates and memory items.
- Knowledge spaces and snapshots.
- Session events and handoff packs.
- Approval requests.
- Lifecycle plans: repair, uninstall, upgrade.
- PaaS connection/session placeholder and sync preview.
- Risk scanning for generated content.

## cc-switch borrowing strategy

Borrow proven engineering patterns from `farion1231/cc-switch`:

- Tauri/Rust desktop shell.
- SQLite local single source of truth.
- Runtime/app registry.
- Skill SSOT and copy/symlink sync semantics.
- MCP registry and per-runtime config planning.
- Prompt/instruction file mapping.
- Session scanner direction.
- Deep Link flow.
- Backup/restore discipline.
- Doctor/health-check panels.

Do not clone cc-switch branding, UI, provider-switching product surface, screenshots, or copywriting.

## Validation policy

No build validation is performed until the implementation surface is complete. Validation comes after the full local installer flow has been written.
