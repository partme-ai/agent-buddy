# Remaining Function Completion Pass

This pass continues the pre-validation implementation phase for Agent Buddy.

## Added

- Persistent instance domain model:
  - `InstanceRecord`
  - `InstanceGroupRecord`
  - `InstanceGroupSummary`
  - upsert request models
- Per-runtime doctor reports:
  - runtime score
  - runtime checks
  - recommended remediation actions
- Console inspector snapshots:
  - instance inspector
  - installation inspector
  - generated artifact inspector
- Local daemon state model:
  - daemon status
  - start/stop preview result
  - API route and MCP server counts
- Frontend type surfaces for inspector / daemon / runtime doctor.

## Still pending before validation

- Wire these new models into `lib.rs` Tauri commands.
- Persist instance records and groups in SQLite.
- Move Markdown / Runtime preview into the persistent right-side Inspector UI.
- Replace frontend-derived instance lists with backend `ConsoleInstance` plus persisted instance overlays.
- Convert local daemon preview into a real HTTP/MCP listener after build validation begins.
- Split `adapters.rs` into per-runtime adapter modules.

## Product intent

These additions move Agent Buddy closer to the target shape: a local Agent Console with instances, source import, runtime installation, memory, knowledge, sessions, health, audit, sync, and PaaS connectivity.
