# Browser Automation Reference Review for Agent Buddy

This document records how Agent Buddy should learn from `Tencent/BrowserSkill` and `browser-use/browser-use` while keeping the commercial product rule intact: users should install only Agent Buddy.

## Reviewed repositories

```text
https://github.com/Tencent/BrowserSkill
https://github.com/browser-use/browser-use
```

## Strategic decision

Agent Buddy should treat these projects as references for internal product modules, not as user-facing dependencies.

| Project | Best role for Agent Buddy | User-facing dependency? |
|---|---|---:|
| BrowserSkill | Buddy Bridge / browser extension protocol / local daemon / human handoff reference | No |
| browser-use | Buddy Agent / browser task loop / tool abstraction / browser action planning reference | No |

The commercial edition must not ask users to install BrowserSkill, browser-use, Chrome extensions, Python packages, or agent skills manually. Their useful ideas should be absorbed into Agent Buddy-owned modules.

## BrowserSkill review

BrowserSkill connects shell-capable agent harnesses such as Cursor, Claude Code, Codex, OpenClaw, WorkBuddy, Pi, and Hermes Agent to a user's already logged-in browser. Its README highlights reusing real login state, running browser tasks in a separate visible Agent Window, supporting shell-capable agents through the `bsk` CLI, and built-in human-in-the-loop takeover for captcha, login, and confirmation dialogs.

The project uses two local runtime pieces:

```text
bsk CLI / daemon
browser extension
```

Its README also describes the runtime architecture as:

```text
Agent harness -> bsk CLI -> local daemon -> browser extension -> Agent Window
```

This is very close to Agent Buddy's desired `Buddy Runtime -> Buddy Bridge -> Buddy Browser` internal path, but the user-facing install model is not suitable for the commercial edition because it still asks users to install a CLI, extension, and skill.

### What Agent Buddy should internalize from BrowserSkill

| BrowserSkill idea | Agent Buddy module |
|---|---|
| Agent Window separate from normal user windows | Buddy Browser |
| Borrow tab only when explicitly requested | Buddy Policy + Buddy Bridge |
| CLI/daemon/extension message routing | Buddy Runtime + Buddy Bridge |
| Human takeover and continuation | Buddy Policy + Buddy Agent |
| Local browser profile reuse | Buddy Browser Profile |
| Harness skills | Buddy Skill schema, but hidden from ordinary users |
| Doctor-style setup checks | Buddy Doctor |

### BrowserSkill integration stance

BrowserSkill is MIT licensed. Agent Buddy may learn from or internalize permissively licensed parts, provided license notices are preserved. However, the product should not expose `bsk`, BrowserSkill extension IDs, or skill installation as ordinary-user steps.

## browser-use review

browser-use positions itself as an AI browser agent that can open pages, click buttons, type, fill forms, extract data, and complete described browser tasks. Its README presents use cases such as job application filling, data extraction, and QA automation.

It provides two major modes:

```text
CLI / skill for existing agents
Python library for embedding browser automation into software
```

The Python library model is especially relevant for Agent Buddy because it shows how to encapsulate browser automation into an agent-controlled execution loop rather than exposing low-level browser commands to the user.

### What Agent Buddy should internalize from browser-use

| browser-use idea | Agent Buddy module |
|---|---|
| Natural-language task to browser action loop | Buddy Agent |
| Browser action planning and execution | Buddy Runtime |
| Form filling / click / type / extraction patterns | Buddy Browser Actions |
| Task history and run state | Buddy Audit + Buddy Task Center |
| Custom tools | Buddy Skill / Buddy Tool schema |
| Cloud vs local execution split | Agent Buddy SaaS / local runtime boundary |
| Benchmarking real-world browser tasks | Buddy Evaluation |

### browser-use integration stance

browser-use is MIT licensed. Agent Buddy may study and selectively internalize useful design patterns or compatible code, provided notices are preserved. The commercial edition should not require users to install Python, `uv`, `pip install browser-use`, Browser Use CLI, or external browser skills.

## Combined product mapping

The two projects point to complementary layers:

```text
BrowserSkill  -> bridge, extension, daemon, profile handoff, human takeover
browser-use   -> agent loop, planning, browser action execution, task history
OpenCLI       -> adapter registry, command contract, structured envelopes, site automation registry
```

Agent Buddy should combine these lessons into product-owned layers:

```text
Agent Buddy Desktop
  -> Buddy Agent
  -> Buddy Policy
  -> Buddy Runtime
  -> Buddy Bridge
  -> Buddy Browser
  -> Buddy Adapter Center
  -> Buddy Audit
```

## Recommended internal architecture after review

```text
crates/
  buddy-agent/
  buddy-runtime/
  buddy-browser-core/
  buddy-browser-actions/
  buddy-browser-profile/
  buddy-browser-policy/
  buddy-browser-audit/
  buddy-bridge-protocol/
  buddy-adapter-runtime/

apps/
  desktop/
  browser-shell/

extensions/
  buddy-bridge/

adapters/
  recruitment/
  ecommerce/
  content/
  social/
  ai-tools/
  generic-web/
```

## Capabilities to prioritize

### Phase 1: Buddy Browser / Runtime contracts

- `BrowserSession`
- `BrowserPage`
- `PageSnapshot`
- `ElementRef`
- `BrowserAction`
- `ActionResult`
- `ProfileId`
- `PolicyDecision`
- `AuditFrame`

### Phase 2: Buddy Bridge MVP

- local runtime to browser-shell channel;
- session open/close;
- tab open/select/close;
- DOM snapshot;
- accessibility snapshot;
- click/type/fill/select/upload/scroll;
- screenshot;
- human takeover;
- action result envelopes.

### Phase 3: Buddy Agent browser loop

- task plan;
- inspect page;
- decide next action;
- execute action;
- verify result;
- recover from stale element;
- ask user for takeover;
- write audit frame;
- complete or fail with structured reason.

### Phase 4: Platform Adapter Center

- convert browser actions into signed platform capabilities;
- version every adapter;
- define permissions and risk levels;
- support remote disable;
- support page signature compatibility;
- support replay and rollback.

## What should not be exposed to ordinary users

Ordinary users should not see or configure:

- `bsk` CLI;
- BrowserSkill extension installation;
- browser-use Python package installation;
- Browser Use CLI skill installation;
- Chrome extension IDs;
- Chrome debug ports;
- OpenClaw/Hermes as required runtime dependencies;
- low-level CDP endpoints.

## Final rule

BrowserSkill and browser-use are valuable references, but Agent Buddy commercial edition must own the runtime, bridge, browser, adapter, policy, audit, and update experience end-to-end.
