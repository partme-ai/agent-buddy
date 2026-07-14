# Agent Buddy final menu page completion matrix

This document records the page-level design completion for the final Agent Buddy local Agent Console menu.

## Completion rule

Every page should have:

- A page route in the final menu.
- A visible content area.
- At least one primary data panel or action panel.
- Empty states when data is unavailable.
- A clear next user action.

Validation is intentionally deferred until the page surface is complete.

## Overview

| Page | UI status | Data status | Main blocks |
|---|---|---|---|
| Overview / Summary | Complete | Aggregated from local state | Metrics, health score, runtime strip, sync plan, recent events |
| Overview / Health Board | Complete | Doctor + audit + sync + runtime | Doctor cards, risk list, recent tasks, sync events, runtime table |

## Instances

| Page | UI status | Data status | Main blocks |
|---|---|---|---|
| Instance List | Complete | Derived instances | Card/list toggle, search, type filter, status filter, add instance, batch action |
| Instance Groups | Complete | Derived from instance group field | Group cards, instance summary, group actions |
| Instance Detail | Complete shell | First selected/filtered instance | Detail hero, action buttons, tabs, overview, diagnostics, logs |
| Install Wizard | Complete | Existing install APIs | Source selection, agent selection, environment check, config guide, install plan, deploy |

## Agents

| Page | UI status | Data status | Main blocks |
|---|---|---|---|
| Market | Complete | Bundle catalog | Bundle cards, origin/source/category/runtime count, install select |
| Teams | Complete shell | Derived from categories | Team cards, member counts, bundle counts, config/install action areas |
| Experts | Complete | Local agents | Expert cards, select, raw Markdown preview, runtime conversion preview, bundle preview |
| Abilities / Skills | Complete | Built-in skills + skill targets + marketplace sources | Skill sources, target paths, installed skills |
| Abilities / Connectors | Complete | MCP servers + Local API spec | MCP cards, policy tags, API/MCP route table |
| Abilities / Tools | Complete | Generated artifacts | Tool action bar, artifact list, artifact preview |
| Agent Knowledge | Complete | Knowledge spaces/snapshots | Knowledge load action, docs/cards, snapshot list |
| Agent Memory | Complete | Memory items/candidates | Memory list, candidate approval |

## Knowledge

| Page | UI status | Data status | Main blocks |
|---|---|---|---|
| Knowledge Center | Complete | Knowledge spaces/snapshots | Product docs, usage guides, best practices, knowledge list, snapshots |
| Help Support | Complete shell | Static now, PaaS later | FAQ, online support, feedback suggestions |
| API Reference | Complete | Local API spec | API docs cards, test placeholder, error codes, route table |

## Wiki

| Page | UI status | Data status | Main blocks |
|---|---|---|---|
| Wiki Knowledge Center | Complete | Knowledge spaces/snapshots | Wiki docs, guides, best practices, knowledge list, snapshots |
| Wiki Help Support | Complete shell | Static now, PaaS later | FAQ, online support, feedback suggestions |
| Wiki API Reference | Complete | Local API spec | API docs cards, route table |

## Memory

| Page | UI status | Data status | Main blocks |
|---|---|---|---|
| Memory / Service | Complete | Memory + writeback APIs | Provider state, write policy, candidate proposal, candidate approval, writeback conflicts |

## Sessions

| Page | UI status | Data status | Main blocks |
|---|---|---|---|
| Sessions / Overview | Complete | Session sync plan + events + handoffs | Metrics, scanner sources, handoff packs |
| Sessions / Active | Complete | Session events | Active session list, session clone/handoff form |
| Sessions / History | Complete | Session events + handoffs | Event timeline, recoverable handoffs |

## Settings

| Page | UI status | Data status | Main blocks |
|---|---|---|---|
| General Settings | Complete | Local settings | Device ID, PaaS URL, retention, install mode, sync/telemetry flags |
| Security Settings | Complete shell | Audit events | Security policy cards, login limits, session management, audit timeline |
| Notification Strategy | Complete shell | Static now | Channels, templates, subscription strategy |
| Backup Restore | Complete | Backup records | Backup tasks, backup history, restore action |
| Enterprise Management | Complete | PaaS preview APIs | PaaS connection, device registration, bundle pull, sync, deep link, Buddy status |

## Layout completion

The final menu pages use the following layers:

```text
src/styles.css             base component styles
src/layout.css             layout refinement layer
src/complete-console.css   final menu page completion layer
```

## Known next work

1. Split `ConsoleAppComplete.tsx` into page modules.
2. Replace derived instances with persisted instance tables.
3. Add persistent right-side inspector drawer.
4. Add page-level skeleton loaders and error boundaries.
5. Add command palette.
6. Run build/typecheck/Tauri validation after feature surface stabilizes.
