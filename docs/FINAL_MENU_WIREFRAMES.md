# Agent Buddy final menu wireframe summary

This document records the visible page structure for the final Agent Buddy local Agent Console.

## Global shell

```text
Sidebar final menu
  Overview / Instances / Agents / Knowledge / Wiki / Memory / Sessions / Settings
Topbar
  Breadcrumb / Page title / Search / Agent Doctor / Refresh
Main content
  Page hero / metrics / cards / tables / timelines / forms
```

## Overview

Summary page:

```text
Hero
Metric cards
Global health donut
Runtime detection strip
Sync flush plan
Recent events timeline
```

Health Board:

```text
Agent Doctor cards
Risk alerts
Recent install tasks
Sync event list
Runtime health table
```

## Instances

Instance List:

```text
Search / type filter / status filter / card-table switch / add instance / batch actions
Runtime instance cards
Agent installation cards
MCP service cards
Knowledge mirror cards
Memory service card
Session center card
Local API card
```

Instance Groups:

```text
Group actions
Group cards
Instance summaries
```

Instance Detail:

```text
Detail hero
Tabs: overview, test, channel, session, agent, skill, nodes, usage, tasks, config, debug, context, logs, history
Overview panel
Diagnostics panel
Logs timeline
```

Install Wizard:

```text
1 Source
2 Agents
3 Environment
4 Config
5 Plan
6 Deploy
```

## Agents

Market:

```text
Unified Bundle Catalog cards
PaaS / GitHub / Local source origin
Install status
Select install
```

Teams:

```text
Create team
Team cards
Members count
Bundle count
Team policy placeholders
```

Experts:

```text
Expert cards
Select expert
Raw Markdown preview
Runtime conversion preview
Agent Bundle preview
```

Abilities:

```text
Skills: source list, target paths, skill cards
Connectors: MCP cards, policy tags, Local API table
Tools: generated artifact list, artifact preview
```

Agent Knowledge / Memory:

```text
Knowledge spaces and snapshots
Memory list and candidates
Approval actions
```

## Knowledge and Wiki

Knowledge Center and Wiki Center use:

```text
Product docs
Usage guide
Best practices
Knowledge list
Snapshot list
```

Help Support uses:

```text
FAQ
Support placeholder
Feedback placeholder
```

API Reference uses:

```text
API docs cards
Test placeholder
Error code placeholder
Local API route table
```

## Memory

Memory service page uses:

```text
Provider state
Write policy
Memory proposal form
Memory candidates
Memory items
Writeback conflict count
```

## Sessions

Overview:

```text
Session metrics
Session scanner sources
Handoff packs
```

Active:

```text
Active session list
Handoff creation form
```

History:

```text
Session event timeline
Recoverable Handoff packs
```

## Settings

General:

```text
Device ID
PaaS URL
Retention days
Install mode
Sync and telemetry switches
```

Security:

```text
Security policy cards
Audit timeline
```

Notifications:

```text
Channels
Templates
Subscriptions
```

Backup Restore:

```text
Backup task actions
Backup history
Restore operation
```

Enterprise:

```text
PaaS connection
Device registration preview
Bundle pull preview
Sync preview
Deep Link parser
Buddy status report
```

## Completion status

All final menu pages now have visible shells, primary blocks, action areas, data panels or empty states. Next work is component splitting and validation.
