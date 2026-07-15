# Agent Buddy feature completion tracker

This tracker records feature coverage before build/typecheck/Tauri validation.

## Product rule

Agent Buddy should first complete the local-first feature surface, then run validation.

## Current feature coverage

| Area | Status | Notes |
|---|---:|---|
| Tauri / React / Rust shell | Written | Desktop shell and command bridge exist. |
| SQLite local state | Written | Sources, detections, installs, backups, events, audit, sync, memory, knowledge, session, persistent console instances/groups/tags. |
| 18 Runtime registry | Written | Covers the full `agency-agents-zh` target list. |
| 18 Runtime adapter manifest | Written | Detect methods, install targets, generated formats, integration methods and support levels are declared. |
| 18 per-runtime adapter files | Written | Added physical files under `src-tauri/src/runtime_adapters/`; descriptor modules exist for all supported runtimes. |
| Runtime adapter facade migration | Written | `adapters.rs` now delegates runtime definitions, detection, target directory resolution, and generated-file conversion into `runtime_adapters/*`. |
| Runtime adapter generation module | Written | Moved runtime generated-file conversion into `runtime_adapters/generation.rs`. |
| Instance persistence domain | Written | Added `instance.rs` with instance/group/upsert models and summaries. |
| Instance persistence tables | Written | Added `instances`, `instance_groups`, and `instance_tags` SQLite tables plus DAO methods. |
| Instance persistence commands | Written | Added commands for upsert/list/delete instances, upsert/list/delete groups, summaries, tag updates, and group assignment. |
| Instance persistence frontend API | Written | Added `src/instanceTypes.ts` and `tauri.ts` wrappers for persisted instance operations. |
| Instance governance overlay | Written | Added `InstanceGovernanceDock.tsx` to read backend `ConsoleInstance`, read persisted instances/groups, persist backend instances, assign groups, update tags, and delete persisted instances. |
| Inspector domain | Written | Added inspector snapshot models for instances, installations, and generated artifacts. |
| Persistent Inspector Drawer | Written | Added `src/InspectorDrawer.tsx` and mounted it in `App.tsx`; it can inspect Agent Markdown, Runtime conversion, and generated artifacts globally. |
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
| Memory runtime operations | Written | Added runtime search, edit, archive, delete, and candidate rejection commands with audit trail. |
| Knowledge mirror metadata | Written | Spaces and snapshots. |
| Knowledge package plan | Written | Mirror/context pack models exist. |
| Knowledge runtime search | Written | Added runtime search over knowledge spaces and snapshot manifests with scored hits and warnings. |
| Session event center | Written | Events, handoff packs. |
| Session scanner | Written | All 18 runtimes included with support levels. |
| Session runtime summary / scan | Written | Added local session summary and runtime scanner execution commands. |
| Runtime execution dock | Written | Added `RuntimeExecutionDock.tsx` and styles for Knowledge / Memory / Session runtime operations. |
| Audit center | Written | Audit event model and persistence. |
| Sync outbox | Written | Outbox model and pending event creation. |
| Sync debounce plan | Written | Flush plan, grouping, retry/debounce policy. |
| PaaS protocol preview | Written | Connection info, device registration, bundle pull, sync preview. |
| PaaS session persistence | Written | `paas-session.json` stores the local PaaS session and token hint while keeping the token out of UI payloads. |
| PaaS HTTP execution | Written | Added authenticated POST execution for device registration, bundle pull, and sync outbox push through `ureq`. |
| PaaS controls dock | Written | Added `PaaSControlsDock.tsx` to save/clear sessions, register device, pull bundles, and push sync outbox from the UI. |
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
| Platform Deep Link registration | Written | `agentbuddy://register-protocol` checks protocol status; `agentbuddy://register-protocol?execute=true` performs Windows HKCU registration or Linux desktop/mimeapps registration; macOS reports bundle requirements. |
| Protocol registration UI | Written | Added `ProtocolRegistrationDock.tsx` and styles to check/register the local protocol handler from the UI. |
| Full Agent Console menu | Written | Left navigation now covers Overview, Instances, Agents, Knowledge, Wiki, Memory, Sessions, and Settings. |
| Complete final-menu ConsoleApp | Written | Added `src/ConsoleAppComplete.tsx` and switched `src/App.tsx` to this full page matrix. |
| Refined Console layout layer | Written | Added `src/layout.css` with sticky topbar, responsive behavior, right-rail-ready layouts, table/card density, and workbench primitives. |
| Final menu page completion styles | Written | Added `src/complete-console.css` for page-specific density, cards, timelines, tables, settings forms, operational dock, and inspector drawer. |
| Instance governance styles | Written | Added `src/instance-governance.css` for backend/persisted instance overlay controls. |
| Protocol registration styles | Written | Added `src/protocol-registration.css` for the protocol registration dock. |
| Runtime execution styles | Written | Added `src/runtime-execution.css` for Knowledge / Memory / Session runtime controls. |
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
| Build/typecheck/Tauri validation | Deferred | Intentionally postponed until feature surface is complete. |

## Next coding pass

1. Run build/typecheck/Tauri validation and fix compile/runtime errors.
