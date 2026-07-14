# Agent Source import flow

Agent Buddy supports two complementary ways to obtain agents:

1. Pull Agent Bundles from Agent PaaS.
2. Import an Agent Source directly into local Agent Buddy management.

This means `agency-agents-zh` is not hardcoded as the only source. It is the default built-in source, while users can also paste a GitHub repository URL or local directory path and import agents into the same local management surface.

## Product flow

```text
User opens Agent Buddy
  ↓
Agent Sources panel
  ↓
Paste source URL or local path
  ↓
Import Source
  ↓
Agent Buddy clones or registers the source
  ↓
Agent Buddy scans Markdown agents with frontmatter
  ↓
Agents appear in the unified Agent list
  ↓
User selects one or more agents
  ↓
User selects local runtime targets
  ↓
Generate Install Plan
  ↓
Confirm Install
  ↓
Agent Buddy installs into local runtime platforms
```

## Supported source forms

| Source form | Example | Behavior |
|---|---|---|
| Agent PaaS | future PaaS bundle list | Pulls signed Agent Bundles and policies. |
| GitHub / Git URL | `https://github.com/jnMetaCode/agency-agents-zh` | Clones or pulls into `~/.agent-buddy/sources/<id>/repo`. |
| Local directory | `/Users/me/agents` | Registers the directory as a local source. |

## Source metadata

Each imported source gets a local manifest:

```json
{
  "id": "agency-agents-zh",
  "name": "agency-agents-zh",
  "sourceUrl": "https://github.com/jnMetaCode/agency-agents-zh.git",
  "sourceKind": "git",
  "branch": "main",
  "commitSha": "...",
  "localPath": "~/.agent-buddy/sources/agency-agents-zh/repo",
  "status": "ready"
}
```

## Unified agent management

All imported agents are normalized into `LocalAgent` with:

```text
sourceId
sourceName
slug
name
description
category
sourcePath
frontmatter
rawMarkdown
```

This lets the UI show agents by source and category, then install them using the same Runtime Adapter pipeline.

## Runtime install confirmation

Agent Buddy should not immediately write into a local runtime after source import. Source import and runtime install are separate confirmation steps:

```text
Import Source       = bring agents into Agent Buddy management
Install to Runtime  = user-confirmed local runtime write operation
```

This distinction is important because an imported source may contain hundreds of agents, and the user may only want to install selected agents to selected tools.

## Relationship with Agent PaaS

Agent PaaS remains the enterprise source of truth for governed Agent Bundles. Local source import is a user-controlled path for open-source, team, or personal agent packs.

```text
Agent PaaS Bundle     → governed enterprise distribution
Git / local source    → local user-managed source import
Agent Buddy           → unified local source catalog and install surface
```

Both paths converge into the same Agent Buddy workflow: source catalog, agent selection, install plan, runtime installation, audit, and sync.
