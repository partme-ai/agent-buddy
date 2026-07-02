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
| Source scanner | Written | Local Git clone/pull, frontmatter parsing, agent list. |
| Runtime converters | Written | Markdown, rules, TOML, SKILL.md, Gemini extension, OpenClaw workspace. |
| Install Plan | Written | Preview, conflicts, warnings, post actions. |
| Installer transaction | Written | Generated cache, backup, write, rollback attempt, install record. |
| OpenClaw deep path | Partial | Workspace files and registration action placeholder exist; gateway management still pending. |
| Hermes categories | Written | Category filter exists in install target. |
| DeerFlow custom path | Written | Custom directory / `DEERFLOW_SKILLS_DIR` path support. |
| Agent Bundle model | Written | Local bundle preview and PaaS-compatible summaries. |
| Bundle diff | Written | Upgrade risk/diff model exists. |
| Instruction injection | Written | Instruction plan with managed section. |
| MCP registry | Written | Buddy Memory/Knowledge/Session/Approval MCP definitions. |
| MCP config preview | Written | Claude, Codex, OpenCode, Hermes, WorkBuddy, OpenClaw and generic config plans. |
| Skill registry | Written | Built-in Buddy skills and target paths. |
| Marketplace plans | Written | SkillHub, skills.sh, GitHub, public MCP, local source plans with attribution/risk. |
| Marketplace attribution | Written | Skill/MCP plans include source attribution and notice hints. |
| Generated artifacts browser | Written | List/read generated artifacts. |
| Risk scanner | Written | Text and generated artifact scan; marketplace plans now include risk report. |
| Memory center | Written | Candidate and item model, propose/approve flow. |
| Knowledge mirror metadata | Written | Spaces and snapshots. |
| Knowledge package plan | Written | Mirror/context pack models exist. |
| Session event center | Written | Events, handoff packs. |
| Session scanner | Written | All 18 runtimes included with support levels. |
| Audit center | Written | Audit event model and persistence. |
| Sync outbox | Written | Outbox model and pending event creation. |
| Sync debounce plan | Written | Flush plan, grouping, retry/debounce policy. |
| PaaS protocol preview | Written | Connection info, device registration, bundle pull, sync preview. |
| Local API spec | Written | Future local daemon route spec. |
| Runtime status report | Written | Device/runtime/install status snapshot. |
| Approval flow | Written | Approval request/resolve models. |
| Lifecycle plans | Written | Repair, uninstall, upgrade plan stubs. |
| Settings | Written | Local settings with device ID and retention flags. |
| Frontend install UX | Written | Agent list, runtime selector, install wizard, records. |
| Frontend state center | Partial | Most panels exist; Settings/PaaS/Risk/MCP preview need richer UI. |
| Per-runtime adapter split | Partial | Adapter manifest exists; central `adapters.rs` still needs physical split. |
| Real local HTTP/MCP server | Pending | Route spec exists; daemon runtime not implemented. |
| Platform Deep Link registration | Pending | Parser exists; OS registration not wired. |
| Build/typecheck/Tauri validation | Deferred | Intentionally postponed until feature surface is complete. |

## Next coding pass

1. Add richer Settings/PaaS/Risk/MCP preview panels.
2. Add local API daemon skeleton.
3. Add retention cleanup plan for generated artifacts and backups.
4. Add per-runtime Doctor details.
5. Split central `adapters.rs` into per-runtime files after the manifest stabilizes.
6. Only then run validation.
