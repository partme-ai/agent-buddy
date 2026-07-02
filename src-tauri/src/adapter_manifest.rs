use crate::runtime::{InstallScope, RuntimeKind};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdapterManifest {
    pub runtime: RuntimeKind,
    pub key: String,
    pub label: String,
    pub scope: InstallScope,
    pub support_level: AdapterSupportLevel,
    pub detect_methods: Vec<String>,
    pub install_targets: Vec<String>,
    pub generated_formats: Vec<String>,
    pub integration_methods: Vec<String>,
    pub native_post_actions: Vec<String>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AdapterSupportLevel { Basic, Enhanced, Deep }

pub fn adapter_manifests() -> Vec<AdapterManifest> {
    vec![
        manifest(RuntimeKind::ClaudeCode, "claude-code", "Claude Code", InstallScope::Global, AdapterSupportLevel::Deep, &["command:claude", "dir:~/.claude"], &["~/.claude/agents", "~/.claude/skills", "CLAUDE.md", ".mcp.json"], &["markdown-agent", "skill", "mcp", "instruction"], &[], &["Primary first-party coding runtime target."]),
        manifest(RuntimeKind::Copilot, "copilot", "GitHub Copilot", InstallScope::Global, AdapterSupportLevel::Basic, &["command:code", "dir:~/.github", "dir:~/.copilot"], &["~/.github/agents", "~/.copilot/agents"], &["markdown-agent"], &[], &["Weak adapter until Copilot exposes a stable local agent extension surface."]),
        manifest(RuntimeKind::Antigravity, "antigravity", "Antigravity", InstallScope::Global, AdapterSupportLevel::Basic, &["dir:~/.gemini/antigravity"], &["~/.gemini/antigravity/skills"], &["SKILL.md"], &[], &["Gemini-family skill format target."]),
        manifest(RuntimeKind::GeminiCli, "gemini-cli", "Gemini CLI", InstallScope::Global, AdapterSupportLevel::Enhanced, &["command:gemini", "dir:~/.gemini"], &["~/.gemini/extensions/agency-agents", "GEMINI.md"], &["gemini-extension", "SKILL.md", "instruction"], &[], &["Supports extension packaging and instruction file injection."]),
        manifest(RuntimeKind::OpenCode, "opencode", "OpenCode", InstallScope::Project, AdapterSupportLevel::Deep, &["command:opencode", "dir:~/.config/opencode"], &["<project>/.opencode/agents", "<project>/.opencode/skills", "<project>/.opencode/mcp.json"], &["markdown-agent", "skill", "mcp"], &[], &["Project-level installation is preferred."]),
        manifest(RuntimeKind::OpenClaw, "openclaw", "OpenClaw", InstallScope::Global, AdapterSupportLevel::Deep, &["command:openclaw", "dir:~/.openclaw"], &["~/.openclaw/agency-agents/<agent>", "~/.openclaw/skills", "~/.openclaw/mcp.json"], &["SOUL.md", "AGENTS.md", "IDENTITY.md", "skill", "mcp"], &["openclaw agents add", "openclaw gateway restart"], &["Deep adapter target with workspace style agent installation."]),
        manifest(RuntimeKind::Cursor, "cursor", "Cursor", InstallScope::Project, AdapterSupportLevel::Basic, &["command:cursor", "dir:~/.cursor"], &["<project>/.cursor/rules"], &[".mdc-rule"], &[], &["Project rules are the main injection surface."]),
        manifest(RuntimeKind::Trae, "trae", "TRAE", InstallScope::Project, AdapterSupportLevel::Basic, &["command:trae", "dir:~/.trae"], &["<project>/.trae/rules"], &["markdown-rule"], &[], &["Project rules are the main injection surface."]),
        manifest(RuntimeKind::Aider, "aider", "Aider", InstallScope::Project, AdapterSupportLevel::Basic, &["command:aider", "dir:~/.aider"], &["<project>/CONVENTIONS.md"], &["aggregate-instruction"], &[], &["Aggregates selected agents into a project convention file."]),
        manifest(RuntimeKind::Windsurf, "windsurf", "Windsurf", InstallScope::Project, AdapterSupportLevel::Basic, &["command:windsurf", "dir:~/.windsurf", "dir:~/.codeium/windsurf"], &["<project>/.windsurfrules"], &["aggregate-rule"], &[], &["Single rules file target."]),
        manifest(RuntimeKind::Qwen, "qwen", "Qwen Code", InstallScope::Project, AdapterSupportLevel::Enhanced, &["command:qwen", "dir:~/.qwen"], &["<project>/.qwen/agents", "AGENTS.md"], &["markdown-agent", "instruction"], &[], &["Subagent style project installation."]),
        manifest(RuntimeKind::Codex, "codex", "Codex CLI", InstallScope::Project, AdapterSupportLevel::Deep, &["command:codex", "dir:~/.codex"], &["<project>/.codex/agents", "<project>/.codex/config.toml", "AGENTS.md"], &["toml-agent", "mcp-toml", "instruction"], &[], &["Project-level agent and MCP config target."]),
        manifest(RuntimeKind::DeerFlow, "deerflow", "DeerFlow", InstallScope::Custom, AdapterSupportLevel::Basic, &["command:deerflow", "env:DEERFLOW_SKILLS_DIR"], &["DEERFLOW_SKILLS_DIR", "<project>/skills/custom"], &["SKILL.md"], &[], &["Custom skill path target."]),
        manifest(RuntimeKind::WorkBuddy, "workbuddy", "WorkBuddy", InstallScope::Global, AdapterSupportLevel::Deep, &["command:workbuddy", "dir:~/.workbuddy"], &["~/.workbuddy/skills", "~/.workbuddy/connectors/buddy-mcp.json"], &["SKILL.md", "mcp-connector"], &[], &["Enterprise connector target for Buddy MCP."]),
        manifest(RuntimeKind::CodeWhale, "codewhale", "CodeWhale", InstallScope::Global, AdapterSupportLevel::Basic, &["command:codewhale", "dir:~/.codewhale"], &["~/.codewhale/skills"], &["SKILL.md"], &[], &["Skill installation target."]),
        manifest(RuntimeKind::Hermes, "hermes", "Hermes Agent", InstallScope::Global, AdapterSupportLevel::Deep, &["command:hermes", "env:HERMES_HOME", "dir:~/.hermes"], &["~/.hermes/skills", "~/.hermes/mcp.json", "AGENTS.md"], &["categorized-SKILL.md", "mcp", "instruction"], &[], &["Category-limited installation is recommended for Discord command limits."]),
        manifest(RuntimeKind::Kiro, "kiro", "Kiro", InstallScope::Global, AdapterSupportLevel::Enhanced, &["command:kiro", "command:kiro-cli", "dir:~/.kiro"], &["~/.kiro/agents"], &["markdown-agent"], &[], &["Global agent target."]),
        manifest(RuntimeKind::Qoder, "qoder", "Qoder", InstallScope::Project, AdapterSupportLevel::Basic, &["command:qoder", "dir:~/.qoder"], &["<project>/.qoder/agents"], &["markdown-agent"], &[], &["Project-level agent target."]),
    ]
}

fn manifest(runtime: RuntimeKind, key: &str, label: &str, scope: InstallScope, support_level: AdapterSupportLevel, detect_methods: &[&str], install_targets: &[&str], generated_formats: &[&str], native_post_actions: &[&str], notes: &[&str]) -> AdapterManifest {
    AdapterManifest { runtime, key: key.to_string(), label: label.to_string(), scope, support_level, detect_methods: detect_methods.iter().map(|v| v.to_string()).collect(), install_targets: install_targets.iter().map(|v| v.to_string()).collect(), generated_formats: generated_formats.iter().map(|v| v.to_string()).collect(), integration_methods: generated_formats.iter().map(|v| integration_method(v)).collect(), native_post_actions: native_post_actions.iter().map(|v| v.to_string()).collect(), notes: notes.iter().map(|v| v.to_string()).collect() }
}

fn integration_method(format: &str) -> String {
    if format.contains("mcp") { "mcp".to_string() }
    else if format.contains("SKILL") || format.contains("skill") { "skill".to_string() }
    else if format.contains("rule") { "rule".to_string() }
    else if format.contains("instruction") || format.contains("AGENTS") || format.contains("CLAUDE") { "instruction".to_string() }
    else { "agent-file".to_string() }
}
