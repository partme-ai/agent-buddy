# Source detail, preview, and bundle catalog flow

Agent Buddy treats every imported source as a first-class object. A source can come from Agent PaaS, a Git/GitHub URL, or a local directory.

## Source detail

The Source Detail panel shows:

- Source metadata.
- Agent count.
- Category count.
- Runtime count.
- Local path.
- License / notice preview.
- Source risk report.
- Source-level warnings.

This is the review step between importing a source and installing agents into local runtimes.

## Raw Markdown preview

Each local agent keeps its original Markdown file and frontmatter. Before install, the user can open a raw Markdown preview to inspect exactly what was imported.

```text
Agent Source
  ↓
Local Agent
  ↓
Raw Markdown Preview
  ↓
Runtime Conversion Preview
  ↓
Install Plan
```

## Runtime conversion preview

A single agent can be converted into the selected runtime format before installation.

Examples:

| Runtime | Preview output |
|---|---|
| Claude Code | raw `.md` agent |
| Codex | `.toml` agent |
| OpenClaw | `SOUL.md`, `AGENTS.md`, `IDENTITY.md` |
| WorkBuddy | `SKILL.md` |
| Cursor | `.mdc` rule |

The conversion preview includes generated files, warnings, and risk scan findings.

## Source import risk scan

Risk scanning is split into two phases:

1. Pre-import preview.
2. Post-import source detail scan.

For local directories, Agent Buddy samples Markdown files before import. For remote Git sources, Agent Buddy previews URL/branch metadata first, then scans actual Markdown content after clone/pull.

## License and notice display

Agent Buddy displays source license information where available. Git/GitHub/public registry imports are considered attribution-sensitive by default.

The user should preserve upstream license and notice files when redistributing or repackaging imported agents.

## Unified Bundle Catalog

Agent PaaS Bundles and Local Source Bundles should converge into one catalog shape:

```text
Bundle Catalog Item
  - origin: agent-paas | local-source
  - bundleId
  - version
  - name
  - description
  - category
  - sourceId
  - sourceName
  - targetCount
  - skillCount
  - mcpCount
  - memoryProvider
  - localAgentId
  - installable
```

This lets the product show enterprise-governed PaaS Bundles and user-imported local bundles in the same management surface.

## Deep Link

Agent Buddy supports source import via Deep Link:

```text
agentbuddy://install-source?url=https%3A%2F%2Fgithub.com%2FjnMetaCode%2Fagency-agents-zh
```

Optional parameters:

```text
name=agency-agents-zh
branch=main
kind=git
```

The Deep Link path imports the source into Agent Buddy. Runtime installation still requires a separate user confirmation via Install Plan.
