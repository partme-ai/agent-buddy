# Agent Buddy Commercial Product Architecture

This document defines the commercial product architecture for Agent Buddy.

## Product position

Agent Buddy must be delivered as one product, not as a collection of user-installed open-source tools.

The user-visible product promise is:

```text
Download Agent Buddy once.
Agent Buddy installs and manages the browser runtime, execution engine, bridge, profiles, skills, platform adapters, and updates internally.
```

Users must not be asked to install or configure Chrome, BrowserSkill, agent-browser, OpenClaw, Hermes, or any similar dependency before Agent Buddy can work.

## Final commercial architecture

| Commercial module | Product-owned implementation | Role of open-source code |
|---|---|---|
| Agent Buddy Desktop | Product-owned desktop shell, account, task center, workflow center | Tauri or similar frameworks are internal dependencies |
| Buddy Browser | Product-branded Chromium browser runtime | Built from Chromium, with notices and license compliance |
| Buddy Runtime | Product-owned Rust browser execution engine | May reuse or learn from permissive browser automation code |
| Buddy Bridge | Built-in browser communication component | BrowserSkill-like protocol can be internalized and rebranded where license allows |
| Buddy Agent | Product-owned task planning and execution loop | OpenClaw / Hermes are compatibility targets, not required runtime dependencies |
| Buddy Context | Product-owned page understanding and context service | DOM, accessibility tree, screenshots, and network data are standard inputs |
| Buddy Policy | Product-owned permission, confirmation, frequency, and risk control | Must be implemented and governed by Agent Buddy |
| Buddy Adapter | Product-owned platform adapter packages | Each platform adapter is versioned, signed, and remotely governed |
| Buddy Audit | Product-owned logs, screenshots, and action replay | SQLite and similar libraries are internal dependencies |
| Buddy Update | Product-owned update and version management | Updates all built-in components under one product update system |

## User-visible product surface

Users should only see Agent Buddy product concepts:

```text
Agent Buddy
├── AI 工作浏览器
├── 智能体
├── 工作流
├── 平台能力
├── 任务中心
├── 操作记录
└── 设置
```

They should not see BrowserSkill, agent-browser, OpenClaw, Hermes, bsk commands, or extension IDs as required setup steps.

## Internal process model

The commercial installer may contain multiple internal processes:

```text
AgentBuddy.exe
BuddyBrowser.exe
BuddyRuntime.exe
```

These are implementation details. Commercially, the product remains:

- one installer;
- one desktop icon;
- one account system;
- one settings center;
- one update service;
- one uninstaller;
- one privacy policy;
- one support channel.

## Browser distribution principle

Commercial Agent Buddy should not ask the user to download Chrome or Chrome for Testing at runtime.

Chrome for Testing is intended for automation testing workflows rather than daily browser product distribution. Commercial Agent Buddy should instead ship a product-owned browser runtime:

```text
Buddy Browser
```

Buddy Browser should be built from Chromium, signed, tested, packaged, and updated under the Agent Buddy product system.

The product must not rebrand and redistribute Google Chrome binaries as Buddy Browser. Google Chrome includes additional terms and bundled components outside a generic Chromium distribution model.

## Open-source usage policy

Agent Buddy can use open-source projects, but the commercial product must internalize their capabilities.

| Usage mode | Product stance |
|---|---:|
| Asking users to install several open-source projects | Not acceptable |
| Compiling suitable permissive-license code into the product | Acceptable |
| Studying architecture and reimplementing product-owned modules | Recommended |
| Copying AGPL code into a closed-source commercial product | Not acceptable |

Initial treatment:

| Project | License direction | Commercial treatment |
|---|---|---|
| Chromium | Multiple open licenses | Build product-owned Buddy Browser and preserve third-party notices |
| BrowserSkill | MIT | Can be internalized or reimplemented as Buddy Bridge with notices |
| agent-browser | Apache-2.0 | Can be forked or selectively reused with NOTICE and modification records |
| BrowserOS / BrowserClaw | AGPL-3.0 | Architecture research only; do not include code in a closed product |
| OpenClaw / Hermes | Requires separate license review | Optional compatibility targets; not required dependencies |

## Buddy Bridge principle

BrowserSkill-like capability must be absorbed as Buddy Bridge:

```text
Agent Buddy Desktop
    ↓
Buddy Runtime
    ↓
Buddy Bridge
    ↓
Buddy Browser
```

User-facing requirements:

- no Chrome Web Store installation;
- no manual extension ID copy;
- no bsk CLI requirement;
- no separate daemon setup;
- bridge starts and stops with Agent Buddy / Buddy Browser;
- extension or equivalent communication layer is built into Buddy Browser.

Target internal API shape:

```rust
let session = buddy_browser.start_session(profile_id).await?;
let page = session.open(url).await?;
let snapshot = page.snapshot().await?;
page.click(element_ref).await?;
```

## Buddy Runtime principle

agent-browser-like value should be converted into product-owned Rust modules:

```text
buddy-browser-core
buddy-browser-cdp
buddy-browser-snapshot
buddy-browser-actions
buddy-browser-profile
buddy-browser-policy
buddy-browser-audit
buddy-browser-runtime
```

The product should preserve the execution pattern:

```text
Snapshot
  ↓
Element references
  ↓
Click / Fill / Type / Scroll / Upload
  ↓
Observe page change
  ↓
Validate result
```

Capabilities to prioritize:

- CDP communication;
- accessibility snapshots;
- DOM fallback;
- element references;
- click, fill, type, scroll, upload;
- cookies and persistent profiles;
- multiple tabs;
- screenshots and action replay;
- network state;
- before/after diffs;
- MCP compatibility layer.

Capabilities to defer:

- broad developer CLI surface;
- many experimental debug commands;
- cloud browser providers;
- non-core engines such as Lightpanda.

## Platform Adapter productization

Platform adapters must be product-owned installable capabilities, not GitHub projects that users manually download.

User-visible surface:

```text
平台能力
├── BOSS 直聘
│   ├── 职位搜索
│   ├── 职位匹配
│   ├── 沟通草稿
│   └── 投递辅助
├── LinkedIn
├── 猎聘
├── 小红书
├── 抖音
└── 微信公众号
```

Adapter requirements:

- versioned;
- signed;
- compatible platform page version metadata;
- permission declaration;
- risk level;
- allowed action scope;
- rollback mechanism;
- remote disable switch;
- automatic update;
- audit integration.

## Commercial value

Users pay for the product outcome, not for Chromium, Rust, or browser automation internals.

Commercial value comes from:

- no setup complexity;
- persistent platform login state;
- reliable business workflows;
- recruitment, content, ecommerce, and operations templates;
- maintained platform adapters;
- recoverable task failures;
- visible, interruptible, replayable actions;
- team accounts, permissions, and audit;
- private deployment;
- model, knowledge, and workflow integration;
- accountable product support.

## Edition model

| Edition | Paid capability |
|---|---|
| Personal | AI browser, page summary, basic tasks, limited platform capabilities |
| Professional | automated workflows, more platform adapters, scheduled tasks, task replay |
| Enterprise | multi-account teams, permissions, audit, private models, private deployment |

## Recommended monorepo structure

```text
agent-buddy/
├── apps/
│   ├── desktop/
│   ├── browser-shell/
│   ├── updater/
│   └── admin-console/
├── crates/
│   ├── buddy-runtime/
│   ├── buddy-browser-core/
│   ├── buddy-browser-cdp/
│   ├── buddy-browser-actions/
│   ├── buddy-browser-profile/
│   ├── buddy-browser-policy/
│   ├── buddy-browser-audit/
│   ├── buddy-agent/
│   └── buddy-protocol/
├── extensions/
│   └── buddy-bridge/
├── adapters/
│   ├── recruitment/
│   ├── ecommerce/
│   ├── content/
│   └── generic-web/
├── packages/
│   ├── ui/
│   ├── sdk/
│   └── skill-schema/
├── third_party/
│   ├── LICENSES/
│   ├── NOTICE/
│   └── SBOM/
└── build/
    ├── windows/
    ├── macos/
    └── linux/
```

## Non-negotiable principles

1. Users install only Agent Buddy.
2. Core runtime must not require users to install OpenClaw, BrowserSkill, agent-browser, or Chrome separately.
3. Open-source projects are internal source dependencies, technical references, or compatibility targets.
4. Runtime, protocol, platform adapters, update system, user experience, policy, and audit must be owned by Agent Buddy.

## Target architecture

```text
Agent Buddy
    ↓
Buddy Agent / Workflow / Skill
    ↓
Buddy Policy
    ↓
Buddy Runtime (Rust)
    ↓
Buddy Bridge
    ↓
Buddy Browser (Chromium)
    ↓
Persistent Profile and platform pages
```
