# Functional completion checklist

This checklist tracks the feature surface being completed before validation.

## Local installer surface

- [x] Tauri v2 / React / Rust shell.
- [x] SQLite local state store.
- [x] `agency-agents-zh` source refresh and parser.
- [x] 18-runtime registry.
- [x] Runtime detection.
- [x] Runtime-specific conversion.
- [x] Install Plan preview.
- [x] Generated artifact cache.
- [x] Backup before overwrite.
- [x] Rollback attempt on failure.
- [x] Installation records.
- [x] Restore backup.
- [x] Install events.

## Agent Buddy domain surface

- [x] Agent Bundle model.
- [x] Agent Bundle preview.
- [x] Agent Bundle diff model.
- [x] Lifecycle plans: repair, uninstall, upgrade.
- [x] Risk scanner.
- [x] Approval request model.
- [x] Audit events.
- [x] Sync outbox.

## Runtime injection surface

- [x] Instruction injection plan.
- [x] Prompt file mapping: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`.
- [x] MCP config plan.
- [x] Buddy MCP registry.
- [x] Buddy skill registry.
- [x] Skill target paths.

## Local shared state surface

- [x] Memory items.
- [x] Memory candidates.
- [x] Memory proposal and approval flow.
- [x] Knowledge spaces.
- [x] Knowledge snapshots.
- [x] Session events.
- [x] Handoff packs.

## PaaS preparation surface

- [x] Local settings.
- [x] PaaS connection status model.
- [x] PaaS session placeholder.
- [x] PaaS sync preview.
- [x] Agent Bundle summaries.

## cc-switch-inspired capabilities included

- [x] SQLite SSOT.
- [x] Runtime adapter registry.
- [x] Deep Link parser.
- [x] Doctor reports.
- [x] Backup/restore discipline.
- [x] Generated artifact cache.
- [x] Skill sync model and target paths.
- [x] MCP registry and runtime config planning.

## Still pending before validation

- [ ] Split `adapters.rs` into per-runtime modules.
- [ ] Add concrete MCP file writer and merger.
- [ ] Add concrete instruction file writer and merger.
- [ ] Add settings UI.
- [ ] Add risk scan UI for generated artifacts.
- [ ] Add PaaS login UI.
- [ ] Add approval center UI.
- [ ] Add lifecycle plan UI.
- [ ] Add local HTTP/MCP server implementation.
- [ ] Add system tray and OS-level deep link registration.
- [ ] Add database migration versioning.
- [ ] Add validation: typecheck, cargo check, Tauri dev run.
