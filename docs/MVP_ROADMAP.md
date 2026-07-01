# Agent Buddy MVP Roadmap

## Milestone 0: Tauri/Rust foundation

- Tauri v2 desktop shell.
- React/Vite frontend.
- Rust commands exposed through Tauri invoke.
- SQLite local state.
- 18-runtime registry.

## Milestone 1: agency-agents-zh source

- Clone/update `jnMetaCode/agency-agents-zh` via local `git`.
- Scan supported department directories.
- Parse YAML frontmatter and markdown body.
- Present agent list, category filters, and search.

## Milestone 2: Runtime detection

- Detect all 18 tools supported by `agency-agents-zh`.
- Distinguish global, project-level, and custom-path installation scopes.
- Allow manual project path for project-level tools.

## Milestone 3: Converters and installers

- Convert source agents into runtime-specific artifacts.
- Support raw markdown, rules, TOML agents, SKILL.md, Gemini extensions, and OpenClaw workspace files.
- Write converted artifacts to runtime target directories.
- Backup overwritten files.
- Record installations in SQLite.

## Milestone 4: Deep integrations

- OpenClaw: run `openclaw agents add` and expose gateway restart guidance.
- Hermes: category-limited installs.
- DeerFlow: custom directory and `DEERFLOW_SKILLS_DIR` support.

## Milestone 5: Agent Buddy domain expansion

- Agent Bundle model.
- Agent PaaS login and bundle pull.
- Local Memory Center.
- Knowledge Mirror.
- MCP registry and policy layer.
- Session Event Center.
