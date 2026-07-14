# Agent Buddy feature completion tracker

This tracker records feature coverage before build/typecheck/Tauri validation.

## Product rule

Agent Buddy should first complete the local-first feature surface, then run validation.

## Current feature coverage

| Area | Status | Notes |
|---|---:|---|
| Tauri / React / Rust shell | Written | Desktop shell and command bridge exist. |
| SQLite local state | Written | Sources, detections, installs, backups, events, audit, sync, memory, knowledge, session. |
| 18 Runtime registry | Written | Covers the full `agency-agents-zh` target list. |
| 18 Runtime adapter manifest | Written | Detect methods, install targets, generated formats, integration methods and support levels are declared. |
| 18 per-runtime adapter files | Written | Added physical files under `src-tauri/src/runtime_adapters/`; central migration still pending. |
| Instance persistence domain | Written | Added `instance.rs` with instance/group/upsert models and summaries. |
| Inspector domain | Written | Added inspector snapshot models for instances, installations, and generated artifacts. |
| Per-runtime Doctor reports | Written | Added runtime-level doctor score, checks, and remediation actions. |
| Local daemon runtime | Written | `local_daemon.rs` now starts/stops a minimal local HTTP listener with health, API metadata, and Buddy MCP metadata endpoints. |
| Operational controls dock | Written | Added `OperationalControls.tsx` to start/stop/check daemon status and preview/execute retention cleanup from the UI. |
| Agent Source import | Written | Users can import Git/GitHub/local agent sources, including `agency-agents-zh`, into local Buddy management. |
| Source-scoped agent management | Written | Agents carry `sourceId/sourceName`; UI supports source filter before runtime installation. |
| Source Detail | Written | Source detail includes agents, categories, risk report, license/notice preview, and warnings. |
| Raw Markdown preview | Written | Single-agent raw Markdown preview is available before install. |
| Runtime conversion preview | Written | Single-agent runtime conversion preview is available for selected RuntimeKind. |
| Source import risk scan | Written | Import risk preview supports local directory sampling and remote URL metadata scan. |
| License / notice display | Written | Source detail surfaces license file preview and attribution notice requirements. |
| Unified Bundle Catalog | Written | Local Source Bundles are listed with the same catalog shape reserved for PaaS Bundles. |
| Source scanner | Written | Local Git clone/pull, frontmatter parsing, agent list. |
| Runtime converters | Written | Markdown, rules, TOML, SKILL.md, Gemini extension, OpenClaw workspace. |
| Install Plan | Written | Preview, conflicts, warnings, post actions. |
| Installer transaction | Written | Generated cache, backup, write, rollback attempt, install record. |
| OpenClaw deep path | Partial | Workspace files and registration action placeholder exist; gateway management still pending. |
| Hermes categories | Written | Category filter exists in install target. |
| DeerFlow custom path | Written | Custom directory / `DEERFLOW_SKILLS_DIR` path support. |
| Agent Bundle model | Written | Local bundle preview and PaaS-compatible summaries. |
| Bundle diff | Written | Upgrade risk/diff model exists; source-scoped diff command added. |
| Instruction injection | Written | Instruction plan with managed section. |
| MCP registry | Written | Buddy Memory/Knowledge/Session/Approval MCP definitions. |
| MCP config preview | Written | Claude, Codex, OpenCode, Hermes, WorkBuddy, OpenClaw and generic config plans. |
| Skill registry | Written | Built-in Buddy skills and target paths. |
| Marketplace plans | Written | SkillHub, skills.sh, GitHub, public MCP, local source plans with attribution/risk. |
| Marketplace attribution | Written | Skill/MCP plans include source attribution and notice hints. |
| Generated artifacts browser | Written | List/read generated artifacts. |
| Risk scanner | Written | Text and generated artifact scan; marketplace and source import plans now include risk report. |
| Memory center | Written | Candidate and item model, propose/approve flow. |
| Knowledge mirror metadata | Written | Spaces and snapshots. |
| Knowledge package plan | Written | Mirror/context pack models exist. |
| Session event center | Written | Events, handoff packs. |
| Session scanner | Written | All 18 runtimes included with support levels. |
| Audit center | Written | Audit event model and persistence. |
| Sync outbox | Written | Outbox model and pending event creation. |
| Sync debounce plan | Written | Flush plan, grouping, retry/debounce policy. |
| PaaS protocol preview | Written | Connection info, device registration, bundle pull, sync preview. |
| Local API spec | Written | Local daemon route spec. |
| Console backend aggregation | Written | Added `console_core.rs` and commands for overview dashboard, health board, console instances, instance groups, retention cleanup preview, cleanup execution, and local daemon plan. |
| Retention cleanup preview | Written | Preview command identifies old generated artifacts and backups based on local retention settings. |
| Retention cleanup execution | Written | Confirmed cleanup command deletes eligible generated artifacts/backups, returns deleted/failed lists, and writes an audit event. |
| Local daemon plan | Written | Preview command exposes intended Local API/MCP daemon bind settings, route count, MCP count, capabilities, and warnings. |
| Local daemon start/stop/status commands | Written | Added `start_local_daemon`, `stop_local_daemon`, and `get_local_daemon_status`; frontend wrappers are also exposed. |
| Runtime status report | Written | Device/runtime/install status snapshot. |
| Approval flow | Written | Approval request/resolve models. |
| Lifecycle plans | Written | Repair, uninstall, upgrade plan stubs. |
| Deep Link install-source | Written | `agentbuddy://install-source?url=...` can parse and execute source import. |
| Full Agent Console menu | Written | Left navigation now covers Overview, Instances, Agents, Knowledge, Wiki, Memory, Sessions, and Settings. |
| Complete final-menu ConsoleApp | Written | Added `src/ConsoleAppComplete.tsx` and switched `src/App.tsx` to this full page matrix. |
| Refined Console layout layer | Written | Added `src/layout.css` with sticky topbar, responsive behavior, right-rail-ready layouts, table/card density, and workbench primitives. |
| Final menu page completion styles | Written | Added `src/complete-console.css` for page-specific density, cards, timelines, tables, settings forms, and responsive polish. |
| Overview Dashboard | Written | Aggregates metrics, global health score, runtime strip, sync flush plan, and recent events. |
| Health Board | Written | Displays Agent Doctor, risks, recent tasks, sync failures, and runtime health table. |
| Instance Console | Written | Derived instances cover runtime, agent installation, MCP, knowledge, memory, sessions, and local API. |
| Instance install wizard | Written | Full source → agents → environment → config → plan → deploy flow. |
| Agent Console pages | Written | Market, Teams, Experts, Abilities, Agent Knowledge, Agent Memory pages are wired. |
| Knowledge / Wiki pages | Written | Knowledge center, help support, and API reference shells are implemented. |
| Memory Service page | Written | Memory provider state, memory list, candidates, approval, and writeback preview are wired. |
| Session pages | Written | Overview, active sessions, session history, and Handoff creation are wired. |
| Settings pages | Written | General, security, notification, backup restore, and enterprise/PaaS settings are wired. |
| Page completion matrix | Written | Added `docs/FINAL_MENU_PAGE_COMPLETION_MATRIX.md` to track all final-menu pages and their major blocks. |
| WorkBuddy UI reference | Written | Added reference doc and CSS tokens for a marketplace/workspace-style Agent Buddy UI. |
| Settings | Written | Local settings with device ID and retention flags. |
| Frontend install UX | Written | Agent source import, source detail, source filter, agent list, runtime selector, install wizard, records. |
| Frontend state center | Written | Console pages now distribute Settings/PaaS/Risk/MCP/Memory/Knowledge/Session panels across final menu. |
| Central adapter migration | Pending | The per-runtime files exist, but `adapters.rs` still owns active detection/conversion/path logic. |
| Platform Deep Link registration | Pending | Parser exists; OS registration not wired. |
| Build/typecheck/Tauri validation | Deferred | Intentionally postponed until feature surface is complete. |

## Next coding pass

1. Add SQLite persistence for `instances`, `instance_groups`, and tags.
2. Move Markdown / Runtime preview into a persistent inspector drawer.
3. Replace frontend-derived instance lists with backend `ConsoleInstance` plus persisted instance overlays.
4. Migrate active logic from central `adapters.rs` into `runtime_adapters/*` files.
5. Implement OS-level `agentbuddy://` registration.
6. Only then run validation.
