# Buddy Browser / Runtime Productization Roadmap

This roadmap translates the commercial architecture into implementation phases.

## Current state

Current Agent Buddy has already written a broad MVP surface around:

- Tauri / React / Rust desktop shell;
- local SQLite state;
- runtime adapters and installer paths;
- agent source import;
- PaaS bundle cache, reconstruction, install plan, and install execution;
- local daemon, memory, knowledge, session, audit, and sync outbox primitives.

The next commercial evolution is to absorb browser automation and platform work into product-owned modules.

## Target outcome

The final commercial user experience must be:

```text
Install Agent Buddy once.
Open Agent Buddy.
Log in to platforms inside Buddy Browser.
Run workflows from Agent Buddy.
Review, interrupt, replay, and audit actions.
```

No user should manually install Chrome, BrowserSkill, agent-browser, OpenClaw, Hermes, or browser extensions.

## Phase 0 — Validation and stabilization

Goal: prove the current MVP code builds and runs.

Required work:

- run frontend typecheck;
- run frontend build;
- run Rust cargo check;
- run Tauri build;
- fix compile errors;
- verify SQLite startup migration;
- verify PaaS bundle cache and installation path;
- verify sync outbox writeback;
- verify retention cleanup and local daemon start/stop;
- create CI workflow.

Exit criteria:

- desktop app starts locally;
- current console renders;
- core commands do not panic;
- PaaS cache flow can be tested with mock data.

## Phase 1 — Product-owned browser abstraction

Goal: define product-owned browser APIs before introducing a Chromium build.

New crates / modules:

```text
crates/buddy-browser-core
crates/buddy-browser-profile
crates/buddy-browser-policy
crates/buddy-browser-audit
crates/buddy-protocol
```

Core abstractions:

```rust
BrowserSession
BrowserPage
PageSnapshot
ElementRef
BrowserAction
ActionResult
ProfileId
PolicyDecision
AuditFrame
```

Required work:

- define Rust traits and DTOs;
- expose Tauri commands for sessions, tabs, snapshots, actions, and audit frames;
- add mock browser provider for UI development;
- model persistent profiles without binding to Chrome-specific naming.

Exit criteria:

- frontend can open a mock Buddy Browser session;
- user can view a page snapshot model;
- actions are audited through product-owned types.

## Phase 2 — Buddy Runtime MVP

Goal: implement local execution against a browser provider.

New crates / modules:

```text
crates/buddy-runtime
crates/buddy-browser-cdp
crates/buddy-browser-actions
crates/buddy-browser-snapshot
```

Capabilities:

- CDP connection management;
- page open / close / reload;
- accessibility snapshot;
- DOM fallback snapshot;
- element reference generation;
- click, fill, type, scroll;
- screenshot capture;
- before/after diff;
- action timeout and retry;
- action audit events.

Exit criteria:

- Buddy Runtime can operate a browser page through product-owned APIs;
- UI can show snapshots, actions, and results;
- all actions pass through Buddy Policy and Buddy Audit.

## Phase 3 — Buddy Bridge internalization

Goal: replace user-installed BrowserSkill-like setup with built-in product communication.

New module:

```text
extensions/buddy-bridge
```

Required work:

- define desktop ↔ bridge protocol;
- package extension or equivalent bridge into Buddy Browser;
- implement session handshake;
- implement page snapshot and action channel;
- implement lifecycle cleanup;
- ensure no user-facing extension ID or CLI command is required.

Exit criteria:

- Agent Buddy starts Buddy Bridge automatically;
- Buddy Bridge connects only to trusted local runtime;
- browser close releases bridge resources;
- user sees no separate setup step.

## Phase 4 — Buddy Browser package

Goal: ship a product-owned Chromium runtime.

New app:

```text
apps/browser-shell
```

Required work:

- build or package Chromium as Buddy Browser;
- sign executable;
- include Buddy Bridge;
- add Agent Buddy new tab page;
- add AI sidebar shell;
- add profile manager;
- add task status indicator;
- add user takeover mode;
- add update integration;
- maintain third-party licenses, notices, and SBOM.

Exit criteria:

- installer includes Buddy Browser;
- Agent Buddy can launch Buddy Browser with a selected persistent profile;
- user is not asked to install Chrome.

## Phase 5 — Platform Adapter Center

Goal: productize platform capabilities.

Directory:

```text
adapters/
├── recruitment/
├── ecommerce/
├── content/
└── generic-web/
```

Adapter metadata:

```text
adapter_id
name
version
platform
page_compatibility
permissions
risk_level
action_scope
signature
rollback_policy
remote_disable
```

Required work:

- define adapter manifest schema;
- implement signed adapter loading;
- implement adapter update channel;
- implement adapter disable / rollback;
- implement permission prompts;
- implement platform-specific workflows.

Exit criteria:

- users install platform capabilities from Agent Buddy;
- adapters are versioned and auditable;
- platform breakage can be fixed remotely through adapter updates.

## Phase 6 — Commercial workflow layer

Goal: sell real outcomes, not browser automation.

Product capabilities:

- recruitment workflows;
- content workflows;
- ecommerce workflows;
- scheduled tasks;
- task replay;
- human takeover;
- failure recovery;
- team permissions;
- enterprise audit;
- private deployment.

Exit criteria:

- user can run end-to-end paid workflows;
- actions are visible, interruptible, replayable, and auditable;
- team and enterprise features can be packaged as paid plans.

## Repository migration strategy

The current repository can evolve incrementally.

Short-term:

```text
src-tauri/src/buddy_browser_core.rs
src-tauri/src/buddy_runtime.rs
src-tauri/src/buddy_policy.rs
src-tauri/src/buddy_audit.rs
```

Medium-term:

```text
crates/buddy-browser-core
crates/buddy-runtime
crates/buddy-policy
crates/buddy-audit
```

Long-term:

```text
apps/desktop
apps/browser-shell
apps/updater
crates/*
extensions/buddy-bridge
adapters/*
packages/*
third_party/*
```

## Immediate next coding pass after validation

1. Add `buddy_browser_core` DTOs and mock provider.
2. Add Buddy Browser session commands.
3. Add Browser page snapshot model.
4. Add Buddy Policy decision model.
5. Add Buddy Audit action-frame model.
6. Add UI surface under `AI 工作浏览器`.

## Non-goals for the next pass

- Do not ship Chrome for Testing as product runtime.
- Do not require BrowserSkill installation.
- Do not require agent-browser CLI.
- Do not require OpenClaw or Hermes for core workflows.
- Do not expose internal open-source project names as user-facing product concepts.
