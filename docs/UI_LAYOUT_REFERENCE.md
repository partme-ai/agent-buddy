# Agent Buddy UI layout reference

This document records the current UI direction after adopting the provided WorkBuddy-style layout reference.

## Layout principle

Agent Buddy should feel like an expert marketplace and local control center, not like a raw developer admin dashboard.

The desktop shell now follows this structure:

```text
Left Sidebar
  - Product identity
  - Main navigation
  - Task / space / sync summaries
  - User footer

Main Content
  - Top tabs: Experts / Skills / Connectors
  - Search and My Experts action
  - Featured scenario rail
  - Agent Source import and detail panels
  - Expert category chips
  - Expert card grid
  - Runtime / Install / Preview / Governance panels
```

## Functional mapping

| WorkBuddy-like UI concept | Agent Buddy implementation |
|---|---|
| Expert marketplace | Imported agents from PaaS, Git, GitHub, or local sources |
| Featured scenario cards | Common source/runtime workflows and agent categories |
| Experts tab | LocalAgent cards from selected Agent Source |
| Skills tab | Buddy built-in skills and skill target support |
| Connectors tab | Buddy MCP servers and connector policies |
| My Experts | Selected agents and local bundle preview |
| Search box | Search by agent name, description, slug, and source |
| Category chips | Source-scoped agent category filter |
| Expert card actions | Raw Markdown and Runtime Conversion preview |

## Safety boundary

The UI keeps source import and runtime installation separate:

```text
Import Source
  ↓
Inspect Source / Risk / License
  ↓
Select Expert
  ↓
Preview Runtime Conversion
  ↓
Generate Install Plan
  ↓
Confirm Install
```

A Deep Link such as:

```text
agentbuddy://install-source?url=https%3A%2F%2Fgithub.com%2FjnMetaCode%2Fagency-agents-zh
```

imports a source into Agent Buddy management, but does not automatically write into Claude Code, Codex, OpenClaw, WorkBuddy, or other local runtimes.

## Design boundary

The UI borrows the information architecture pattern of an expert marketplace: sidebar, top tabs, scenario rail, category chips, and card grid. It should not copy another product's brand assets, proprietary illustrations, copywriting, or exact visual identity.
