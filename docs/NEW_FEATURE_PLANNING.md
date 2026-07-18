# Agent Buddy New Feature Planning

This document defines the next feature backlog after the current local-first MVP surface, PaaS Bundle cache/install loop, and commercial browser automation architecture have been written.

## Planning principle

Agent Buddy should now stop expanding generic panels and focus on commercial-product capabilities that make the product installable, reliable, monetizable, and ownable:

1. validate the existing MVP;
2. internalize browser automation into Buddy-owned modules;
3. add policy, audit, and human takeover as first-class product systems;
4. turn platform adapters into signed commercial capabilities;
5. prepare installer, update, CI, and release infrastructure.

## Priority map

| Priority | Theme | Goal |
|---|---|---|
| P0 | Validation and CI | Prove the current code builds and starts. |
| P0 | Install safety | Prevent destructive installs without explicit confirmation. |
| P0 | Buddy Browser DTOs | Define product-owned browser/session/page/action contracts. |
| P0 | Buddy Policy primitives | Put every browser/runtime action behind permission and risk decisions. |
| P0 | Buddy Audit primitives | Persist action traces, screenshots, diffs, and replay metadata. |
| P1 | Mock browser provider | Let UI and runtime flows develop before Chromium packaging is ready. |
| P1 | Buddy Runtime action loop | Implement snapshot -> plan -> action -> verify -> recover. |
| P1 | Platform Adapter Center | Convert platform adapters into signed, versioned capabilities. |
| P1 | Browser Workbench UI | Add product UI for sessions, profiles, actions, and takeover. |
| P1 | PaaS Bundle lifecycle | Add version diff, upgrade, rollback, uninstall, and repair. |
| P2 | Buddy Browser packaging | Package product-owned Chromium runtime as Buddy Browser. |
| P2 | Buddy Bridge extension | Internalize extension protocol and ship it with Buddy Browser. |
| P2 | Commercial release | Installer, updater, license, telemetry controls, support bundle. |

## Epic 0 — Validation and CI

### Feature 0.1 — Local validation pass

Goal: run the current project through frontend and Rust validation.

Tasks:

- run `npm install`;
- run `npm run typecheck`;
- run `npm run build`;
- run `cargo check` in `src-tauri`;
- run Tauri build when toolchain is available;
- fix compile errors;
- document remaining runtime-only risks.

Acceptance criteria:

- desktop app starts locally;
- main React console renders;
- Tauri command registration compiles;
- SQLite startup migration runs without panic;
- PaaS Bundle cache commands compile.

### Feature 0.2 — GitHub Actions CI

Goal: prevent future regressions.

Tasks:

- add workflow for frontend typecheck;
- add workflow for frontend build;
- add workflow for Rust cargo check;
- add workflow cache for npm and cargo;
- publish CI status in README.

Acceptance criteria:

- PRs fail if TypeScript fails;
- PRs fail if Rust does not compile;
- build logs are visible to maintainers.

## Epic 1 — Buddy Browser product-owned contract

### Feature 1.1 — Browser domain models

Goal: define product-owned browser DTOs before binding to Chromium, BrowserSkill, OpenCLI, or browser-use implementation details.

New Rust module target:

```text
src-tauri/src/buddy_browser.rs
```

Core DTOs:

```rust
BrowserProfile
BrowserSession
BrowserPage
PageSnapshot
ElementRef
BrowserAction
BrowserActionResult
BrowserActionStatus
BrowserProviderStatus
```

Acceptance criteria:

- DTOs serialize with `camelCase`;
- DTOs do not mention Chrome, OpenCLI, BrowserSkill, or browser-use;
- every session belongs to a profile;
- every page belongs to a session;
- every action references policy and audit ids when applicable.

### Feature 1.2 — Browser provider abstraction

Goal: hide the concrete browser engine behind a provider trait.

Proposed trait:

```rust
trait BuddyBrowserProvider {
    fn list_profiles(&self) -> Result<Vec<BrowserProfile>>;
    fn start_session(&self, profile_id: String) -> Result<BrowserSession>;
    fn list_pages(&self, session_id: String) -> Result<Vec<BrowserPage>>;
    fn open_page(&self, session_id: String, url: String) -> Result<BrowserPage>;
    fn snapshot(&self, page_id: String) -> Result<PageSnapshot>;
    fn perform_action(&self, page_id: String, action: BrowserAction) -> Result<BrowserActionResult>;
}
```

Acceptance criteria:

- mock provider can satisfy the trait;
- future CDP/Chromium provider can implement the same trait;
- Tauri commands call provider abstraction, not a concrete browser process directly.

### Feature 1.3 — Mock browser provider

Goal: build UI and policy/audit flows without waiting for Chromium packaging.

Mock behavior:

- return one local profile;
- start a mock session;
- open mock pages;
- return deterministic page snapshots;
- simulate click/type/extract results;
- emit audit frames.

Acceptance criteria:

- Browser Workbench can start a mock session;
- user can open a URL in mock mode;
- user can view snapshot and perform mock actions;
- audit records are written.

## Epic 2 — Buddy Policy

### Feature 2.1 — Policy decision model

Goal: every browser/runtime action must have a policy decision before execution.

New Rust module target:

```text
src-tauri/src/buddy_policy.rs
```

Core DTOs:

```rust
PolicySubject
PolicyResource
PolicyAction
PolicyRiskLevel
PolicyDecision
PolicyPrompt
PolicyRule
```

Decision values:

```text
allow
deny
ask
rate_limited
requires_takeover
```

Acceptance criteria:

- write actions default to `ask` when policy is unknown;
- destructive actions require explicit confirmation;
- platform adapters can declare required permissions;
- decisions are persisted to audit.

### Feature 2.2 — Risk classification

Goal: classify browser actions before execution.

Risk examples:

| Action | Default risk |
|---|---:|
| snapshot/read page | low |
| click navigation link | low |
| type into form | medium |
| upload file | high |
| submit form | high |
| send message | high |
| publish content | critical |
| payment / order / irreversible submit | critical |

Acceptance criteria:

- every BrowserAction gets a risk level;
- high/critical actions require confirmation;
- critical actions can require human takeover.

## Epic 3 — Buddy Audit

### Feature 3.1 — Browser action audit trail

Goal: record every browser action and its result.

New Rust module target:

```text
src-tauri/src/buddy_audit.rs
```

Audit frame fields:

```rust
audit_id
session_id
page_id
profile_id
action_type
selector_or_ref
url_before
url_after
snapshot_before_id
snapshot_after_id
screenshot_before_path
screenshot_after_path
policy_decision_id
result_status
created_at
```

Acceptance criteria:

- read and write browser actions create audit frames;
- audit frames can be listed by session;
- audit frames can be exported in a support bundle.

### Feature 3.2 — Action replay metadata

Goal: make user trust and debugging possible.

Replay should show:

- action sequence;
- target element;
- before/after URL;
- before/after snapshot summary;
- screenshot references;
- policy confirmations;
- errors and recovery attempts.

Acceptance criteria:

- user can inspect what the agent did;
- support can diagnose task failures;
- enterprise audit can export evidence.

## Epic 4 — Buddy Agent browser task loop

### Feature 4.1 — Task run model

Goal: formalize browser tasks as product state.

Core DTOs:

```rust
BuddyTask
BuddyTaskStep
BuddyTaskStatus
BuddyTaskGoal
BuddyTaskContext
BuddyTaskError
BuddyTaskRecoveryPlan
```

Task lifecycle:

```text
created -> planning -> waiting_for_policy -> running -> waiting_for_human -> verifying -> completed
created -> planning -> running -> failed -> recovering -> running/completed/failed
created -> cancelled
```

Acceptance criteria:

- task state is persisted;
- each step links to policy and audit frames;
- task can pause for user takeover;
- task can be resumed.

### Feature 4.2 — Snapshot/action/verify loop

Goal: make browser automation deterministic.

Loop:

```text
snapshot
-> plan next action
-> policy check
-> execute action
-> collect result
-> verify with fresh snapshot
-> continue / recover / ask human
```

Acceptance criteria:

- stale element errors force a fresh snapshot;
- write actions verify resulting value/state;
- navigation invalidates previous refs;
- failures create recovery suggestions.

## Epic 5 — Buddy Bridge and internal extension

### Feature 5.1 — Bridge protocol draft

Goal: define product-owned bridge messages.

Message groups:

```text
session.start
session.stop
profile.list
page.open
page.snapshot
page.action.click
page.action.type
page.action.fill
page.action.select
page.action.keys
page.action.upload
page.screenshot
page.network
human.takeover.request
human.takeover.release
```

Acceptance criteria:

- protocol is independent from BrowserSkill and OpenCLI naming;
- every message has request id and correlation id;
- responses use structured envelopes;
- errors have stable codes.

### Feature 5.2 — Human takeover protocol

Goal: let users safely intervene.

States:

```text
agent_owned
user_takeover_requested
user_owned
agent_resume_requested
agent_owned
```

Acceptance criteria:

- agent can request user intervention;
- user can take control;
- user can return control;
- audit records ownership changes.

## Epic 6 — Platform Adapter Center

### Feature 6.1 — Adapter manifest schema

Goal: productize platform capabilities.

Manifest fields:

```text
adapter_id
platform_id
version
display_name
category
supported_domains
required_profile_scope
permissions
risk_level
actions
page_signatures
remote_disable
signature
rollback_policy
```

Acceptance criteria:

- adapters are not random GitHub skills;
- adapters can be signed and versioned;
- adapter actions declare permissions;
- platform adapters can be disabled remotely.

### Feature 6.2 — Recruitment adapter starter set

Goal: support the product's first commercial vertical.

Initial adapters:

```text
boss
linkedin
51job
liepin
indeed
upwork
maimai
```

Capabilities:

- search jobs / candidates;
- read job detail;
- extract structured profile/job data;
- draft message;
- controlled send with user confirmation;
- save audit and replay.

Acceptance criteria:

- every send/publish action requires confirmation;
- login state stays inside Buddy Browser profile;
- adapter errors are typed and recoverable.

## Epic 7 — Browser Workbench UI

### Feature 7.1 — Browser sessions page

Goal: expose product-owned browser control without exposing internal tools.

UI blocks:

- profiles;
- sessions;
- pages/tabs;
- snapshots;
- actions;
- policy prompts;
- audit frames;
- human takeover.

Acceptance criteria:

- user can start a mock browser session;
- user can inspect pages and actions;
- user can approve/deny policy prompts;
- user can view action history.

### Feature 7.2 — Right Workbench consolidation

Goal: consolidate floating docks into one product panel.

Tabs:

```text
Inspector
PaaS
Browser
Runtime
Policy
Audit
Logs
```

Acceptance criteria:

- existing PaaS/Runtime/Protocol/Inspector controls can be reached from one workbench;
- no more scattered product controls;
- layout is ready for desktop product use.

## Epic 8 — PaaS Bundle lifecycle

### Feature 8.1 — Bundle installed-state tracking

Goal: know which cached Bundle version is installed.

Fields:

```text
bundle_id
version
runtime
installation_id
installed_at
status
last_health_check_at
```

Acceptance criteria:

- PaaS cache list marks installed versions;
- user can see installed runtime targets;
- health board includes Bundle install status.

### Feature 8.2 — Bundle diff / upgrade / rollback

Goal: make PaaS Bundle lifecycle production-ready.

Capabilities:

- compare cached versions;
- preview upgrade plan;
- install upgrade;
- rollback to previous backup;
- uninstall Bundle install record.

Acceptance criteria:

- upgrades show file conflicts;
- rollback uses backups;
- uninstall writes audit and sync events.

## Epic 9 — Commercial packaging

### Feature 9.1 — Single installer product rule

Goal: enforce the commercial architecture in build output.

Installer must include:

```text
AgentBuddy app
Buddy Runtime service/process
Buddy Browser placeholder or later Chromium build
Buddy Bridge assets
license notices
third-party notices
uninstaller
```

Acceptance criteria:

- no post-install instruction tells users to install OpenCLI, BrowserSkill, browser-use, Chrome extension, Python package, or OpenClaw;
- installer creates one desktop entry;
- settings page owns all internal component state.

### Feature 9.2 — Third-party compliance pack

Goal: safely use permissive open-source ideas/code.

Artifacts:

```text
third_party/LICENSES
third_party/NOTICE
third_party/SBOM
```

Acceptance criteria:

- MIT and Apache-2.0 notices are preserved;
- Chromium notices are tracked before Buddy Browser packaging;
- no AGPL code is copied into closed commercial runtime.

## Recommended next coding order

1. Phase 0 validation and CI.
2. `buddy_browser.rs` DTOs.
3. `buddy_policy.rs` policy primitives.
4. `buddy_audit.rs` audit frame primitives.
5. mock browser provider.
6. Browser Workbench UI.
7. Buddy Runtime action loop.
8. Adapter manifest schema.
9. recruitment adapter starter set.
10. PaaS Bundle lifecycle tracking.

## Non-goals for the next pass

Do not start by packaging Chromium. That should wait until:

- current app compiles;
- browser DTOs are stable;
- mock provider works;
- policy and audit are first-class;
- bridge protocol is defined.

Do not expose OpenCLI, BrowserSkill, browser-use, OpenClaw, or Hermes as mandatory user setup steps.
