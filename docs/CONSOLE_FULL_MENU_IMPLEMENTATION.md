# Agent Buddy full Agent Console implementation

This pass upgrades Agent Buddy from an expert-marketplace style MVP into a full local Agent Console shell.

## Implemented UI structure

The console now follows the final menu architecture:

```text
Overview
  - Summary
  - Health Board

Instances
  - Instance List
  - Instance Groups
  - Instance Detail
  - Install Wizard

Agents
  - Market
  - Teams
  - Experts
  - Abilities / Skills
  - Abilities / Connectors
  - Abilities / Tools
  - Knowledge
  - Memory

Knowledge
  - Knowledge Center
  - Help Support
  - API Reference

Wiki
  - Knowledge Center
  - Help Support
  - API Reference

Memory
  - Service

Sessions
  - Overview
  - Active
  - History

Settings
  - General
  - Security
  - Notifications
  - Backup Restore
  - Enterprise
```

## New frontend entrypoint

`src/App.tsx` now delegates to `src/ConsoleApp.tsx`.

`ConsoleApp.tsx` is a full page-system shell that aggregates the existing Tauri commands and local state into product pages.

## Data sources used

The console currently aggregates existing local-first data:

- `RuntimeDetection`
- `AgentInstallation`
- `AgentSourceSummary`
- `LocalAgentSummary`
- `BundleCatalogItem`
- `McpServerConfig`
- `SkillPackage`
- `KnowledgeSpace`
- `KnowledgeSnapshot`
- `MemoryItem`
- `MemoryCandidate`
- `SessionEvent`
- `HandoffPack`
- `AuditEvent`
- `SyncOutboxEvent`
- `DoctorReport`
- `AgentBuddySettings`
- PaaS preview objects

## Instance abstraction

No new database table is required for this pass. The UI derives `ConsoleInstance` from the existing records:

```text
RuntimeDetection       -> Runtime instance
AgentInstallation      -> Agent installation instance
McpServerConfig        -> MCP service instance
KnowledgeSpace         -> Knowledge mirror instance
MemoryItem/Candidate   -> Memory service instance
SessionEvent           -> Session service instance
LocalApiSpec           -> Local API instance
```

This enables the final Instances page before formalizing `instances` tables.

## Implemented pages

### Overview

- Metric cards: instances, agents, installations, active sessions, pending sync, risks.
- Global health score.
- Runtime detection strip.
- Sync flush plan preview.
- Recent event timeline.

### Health Board

- Agent Doctor result display.
- Risk and audit event list.
- Recent install tasks.
- Runtime status table.

### Instances

- Instance list with card/table switch.
- Search.
- Type filter.
- Status filter.
- Instance detail shell with tabs.
- Instance grouping page.
- Full install wizard flow.

### Agents

- Unified Bundle Catalog market.
- Team placeholder built from categories.
- Expert management with raw Markdown preview and Runtime conversion preview.
- Skills page.
- Connectors/MCP page.
- Tools / generated artifacts page.
- Agent Knowledge and Agent Memory pages.

### Knowledge / Wiki

- Product docs cards.
- Help support cards.
- API reference using Local API spec.

### Memory

- Memory service state.
- Memory list.
- Memory candidate approval.
- Memory writeback plan preview.

### Sessions

- Session overview.
- Active session list.
- Handoff Pack creation.
- Historical session events.

### Settings

- General settings save flow.
- Security audit page.
- Notification strategy placeholder.
- Backup restore page.
- Enterprise/PaaS connection page.
- Deep Link parser/executor.

## Design language

The CSS has been rewritten around a local console layout:

```text
console-shell
console-sidebar
console-main
console-topbar
console-page
metric-grid
instance-grid
expert-grid
panel
health-donut
```

The visual direction is a desktop SaaS console, not a single landing page.

## Next coding pass

1. Split `ConsoleApp.tsx` into `console/` and `pages/` modules.
2. Add backend aggregation commands for overview and instances.
3. Add real instance tables and instance tags/groups.
4. Add per-runtime detail pages.
5. Add richer settings pages.
6. Keep validation deferred until feature surface stabilizes.
