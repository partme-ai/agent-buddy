# cc-switch borrowing plan

Agent Buddy should borrow proven engineering patterns from `farion1231/cc-switch` without cloning the product or brand.

## Borrow directly as engineering patterns

- Tauri + Rust + React local desktop architecture.
- SQLite as local single source of truth.
- Runtime/app adapter registry.
- Skills single-source-of-truth and sync-to-target-dir model.
- MCP registry and per-runtime config translation.
- Prompt/instruction file path mapping.
- Session scanner architecture.
- Deep Link import flow.
- Backup/restore and atomic writes.
- Doctor/health-check panels.
- Local sync/outbox pattern.

## Do not copy

- cc-switch branding, name, icons, screenshots, product positioning, and UI copy.
- Provider-switching product surface as Agent Buddy's main feature.
- Full local model proxy as part of the first local installer milestone.

## Agent Buddy-specific upgrades

cc-switch is a multi AI-tool configuration manager. Agent Buddy upgrades that model into a local enterprise agent installation and state layer:

- Agent Bundle install plan.
- Runtime Adapter layer for agent bundle injection.
- Knowledge Mirror.
- Memory Center.
- Session Event Center and Handoff Pack.
- Agent Doctor.
- Agent PaaS sync and audit path.

## Immediate implementation mapping

| cc-switch pattern | Agent Buddy module |
|---|---|
| SQLite SSOT | `database.rs` + future DAO split |
| Skills sync | `adapters.rs` + installer generated artifact cache |
| Backup/restore | `installer.rs` + `install_backups` table |
| Doctor | `doctor.rs` |
| Deep Link | `deeplink.rs` |
| Runtime/AppType | `RuntimeKind` + runtime definitions |
| Session manager | future `session_center.rs` |
| Cloud sync hook | future `sync_outbox.rs` |

## License handling

cc-switch is MIT licensed. If any substantial code is copied rather than reimplemented, preserve copyright and license notices in `THIRD_PARTY_NOTICES.md` and in any copied source header where appropriate.
