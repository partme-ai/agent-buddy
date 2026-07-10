# Agent Buddy console backend aggregation

This pass adds backend aggregation commands for the final-menu Agent Console.

## Why

The frontend already has a complete final-menu page matrix. To move from UI-only aggregation toward a real console backend, Agent Buddy now exposes console-level Tauri commands.

These commands aggregate existing local state instead of requiring new database tables immediately.

## Added Rust module

```text
src-tauri/src/console_core.rs
```

It defines:

```text
ConsoleOverviewDashboard
ConsoleMetric
ConsoleRuntimeSummary
ConsoleSyncSummary
ConsoleHealthBoard
ConsoleRuntimeCheck
ConsoleRiskAlert
ConsoleTimelineEvent
ConsoleInstance
ConsoleInstanceGroup
RetentionCleanupPlan
CleanupCandidate
RetentionCleanupResult
CleanupDeletion
CleanupFailure
LocalDaemonPlan
```

## Added commands

```text
get_overview_dashboard
get_health_board
list_console_instances
list_console_instance_groups
preview_retention_cleanup_plan
execute_retention_cleanup
preview_local_daemon_plan
```

## Frontend API wrappers

```text
src/consoleTypes.ts
src/tauri.ts
```

New wrappers:

```ts
getOverviewDashboard()
getHealthBoard()
listConsoleInstances()
listConsoleInstanceGroups()
previewRetentionCleanupPlan()
executeRetentionCleanup(confirm)
previewLocalDaemonPlan()
```

## Console instance derivation

`ConsoleInstance` is derived from existing state:

```text
RuntimeDetection       -> Runtime instance
AgentInstallation      -> Agent installation instance
McpServerConfig        -> MCP service instance
KnowledgeSpace         -> Knowledge mirror instance
MemoryItem/Candidate   -> Memory service instance
SessionEvent           -> Session service instance
LocalApiSpec           -> Local API instance
```

This lets the final-menu Instance pages use a formal backend abstraction before adding persistent `instances` tables.

## Overview aggregation

`get_overview_dashboard` aggregates:

```text
RuntimeDetection
AgentInstallation
LocalAgent count
SessionEvent
SyncOutboxEvent
AuditEvent
AgentBuddySettings
```

It returns:

```text
metrics
health score
runtime summary
sync summary
recent events
warnings
```

## Health aggregation

`get_health_board` aggregates:

```text
DoctorReport
RuntimeDetection
AuditEvent
InstallEvent
SyncOutboxEvent
```

It returns:

```text
runtime checks
risk alerts
recent tasks
sync failures
warnings
```

## Retention cleanup

`preview_retention_cleanup_plan` uses local settings to identify old generated artifacts and old backups.

`execute_retention_cleanup` performs the cleanup only when called with `confirm=true`.

Execution behavior:

```text
1. Rebuild the cleanup plan from current local settings and state.
2. Delete generated artifact candidates and backup candidates.
3. Return deleted items and failed items.
4. Write a warning-level audit event summarizing the cleanup.
```

It returns:

```text
RetentionCleanupResult
  - deleted
  - failed
  - totalDeletedBytes
  - warnings
```

The command intentionally rebuilds the plan at execution time rather than trusting stale frontend state.

## Local daemon plan

`preview_local_daemon_plan` reports the intended Local API / MCP daemon configuration:

```text
bind host
bind port
base URL
route count
MCP server count
capabilities
warnings
```

The daemon is still a plan, not a running server.

## Next backend work

1. Add persistent `instances`, `instance_groups`, and `instance_tags` tables.
2. Add real Local HTTP/MCP daemon runtime.
3. Add per-runtime Doctor details.
4. Add backend APIs for page-level skeleton/error states.
5. Split `ConsoleAppComplete.tsx` into page modules.
