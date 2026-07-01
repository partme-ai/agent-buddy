# Agent Buddy complete implementation strategy

This document tracks the implementation target for the local Agent Buddy client before validation.

## Current instruction

Build first, then validate. The implementation should cover the complete local installer feature set before running build and runtime verification.

## Functional target

Agent Buddy must support the full `agency-agents-zh` runtime surface:

1. Claude Code
2. GitHub Copilot
3. Antigravity
4. Gemini CLI
5. OpenCode
6. OpenClaw
7. Cursor
8. TRAE
9. Aider
10. Windsurf
11. Qwen Code
12. Codex CLI
13. DeerFlow
14. WorkBuddy
15. CodeWhale
16. Hermes Agent
17. Kiro
18. Qoder

## Implementation requirements

- Runtime adapter registry for all 18 runtimes.
- Source refresh and parser for `agency-agents-zh`.
- Runtime detection by command, config directory, environment variable, or custom path.
- Runtime-specific conversion.
- Install Plan generation before writing files.
- Backup overwritten files.
- Rollback on failed installs.
- SQLite records for sources, detections, installation records, installed files, backups, and logs.
- UI flow for source refresh, runtime detection, agent selection, install plan preview, installation execution, and uninstall.

## Validation policy

No build validation is performed until the implementation surface is complete. Validation comes after the full local installer flow has been written.
