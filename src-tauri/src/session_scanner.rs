use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionScanSource {
    pub runtime: RuntimeKind,
    pub label: String,
    pub default_paths: Vec<String>,
    pub detected_paths: Vec<String>,
    pub parser: String,
    pub supports_resume: bool,
    pub support_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSyncPlan {
    pub sources: Vec<SessionScanSource>,
    pub event_normalizer: String,
    pub summary_strategy: String,
    pub handoff_enabled: bool,
    pub paas_sync_enabled: bool,
    pub warnings: Vec<String>,
}

pub fn default_session_sources() -> Vec<SessionScanSource> {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("~"));
    vec![
        source(RuntimeKind::ClaudeCode, "Claude Code", vec![home.join(".claude/projects").display().to_string()], "claude-jsonl", true, "deep"),
        source(RuntimeKind::Copilot, "GitHub Copilot", vec![home.join(".github/copilot/sessions").display().to_string(), home.join(".copilot/sessions").display().to_string()], "copilot-history", false, "weak"),
        source(RuntimeKind::Antigravity, "Antigravity", vec![home.join(".gemini/antigravity/sessions").display().to_string()], "gemini-skill-events", false, "weak"),
        source(RuntimeKind::GeminiCli, "Gemini CLI", vec![home.join(".gemini/sessions").display().to_string()], "gemini-json", true, "medium"),
        source(RuntimeKind::OpenCode, "OpenCode", vec![home.join(".local/share/opencode").display().to_string(), home.join(".config/opencode").display().to_string()], "opencode-sqlite", true, "deep"),
        source(RuntimeKind::OpenClaw, "OpenClaw", vec![home.join(".openclaw/sessions").display().to_string(), home.join(".openclaw/workspaces").display().to_string()], "openclaw-workspace-events", true, "deep"),
        source(RuntimeKind::Cursor, "Cursor", vec![home.join(".cursor").display().to_string(), home.join("Library/Application Support/Cursor/User/workspaceStorage").display().to_string()], "cursor-workspace-storage", false, "weak"),
        source(RuntimeKind::Trae, "TRAE", vec![home.join(".trae/sessions").display().to_string(), home.join(".trae/rules").display().to_string()], "trae-project-rules-and-history", false, "weak"),
        source(RuntimeKind::Aider, "Aider", vec![home.join(".aider").display().to_string()], "aider-chat-history", true, "medium"),
        source(RuntimeKind::Windsurf, "Windsurf", vec![home.join(".codeium/windsurf").display().to_string(), home.join(".windsurf").display().to_string()], "windsurf-workspace-history", false, "weak"),
        source(RuntimeKind::Qwen, "Qwen Code", vec![home.join(".qwen/sessions").display().to_string()], "qwen-session-json", true, "medium"),
        source(RuntimeKind::Codex, "Codex CLI", vec![home.join(".codex/sessions").display().to_string()], "codex-jsonl-or-sqlite", true, "deep"),
        source(RuntimeKind::DeerFlow, "DeerFlow", vec![home.join(".deerflow/sessions").display().to_string(), "./skills/custom".to_string()], "deerflow-task-state", false, "weak"),
        source(RuntimeKind::WorkBuddy, "WorkBuddy", vec![home.join(".workbuddy/sessions").display().to_string()], "workbuddy-events", true, "deep"),
        source(RuntimeKind::CodeWhale, "CodeWhale", vec![home.join(".codewhale/sessions").display().to_string()], "codewhale-skill-events", false, "weak"),
        source(RuntimeKind::Hermes, "Hermes Agent", vec![home.join(".hermes/sessions").display().to_string(), home.join(".local/share/hermes").display().to_string()], "hermes-sqlite", true, "deep"),
        source(RuntimeKind::Kiro, "Kiro", vec![home.join(".kiro/sessions").display().to_string()], "kiro-agent-history", true, "medium"),
        source(RuntimeKind::Qoder, "Qoder", vec![home.join(".qoder/sessions").display().to_string()], "qoder-project-history", false, "weak"),
    ]
}

pub fn build_session_sync_plan(paas_sync_enabled: bool) -> SessionSyncPlan {
    let sources = default_session_sources()
        .into_iter()
        .map(|mut source| {
            source.detected_paths = source.default_paths.iter().filter(|path| PathBuf::from(path).exists()).cloned().collect();
            source
        })
        .collect::<Vec<_>>();
    let mut warnings = Vec::new();
    if sources.iter().all(|source| source.detected_paths.is_empty()) { warnings.push("No local session stores detected yet. Sessions will appear after supported runtimes create local history.".to_string()); }
    if !paas_sync_enabled { warnings.push("PaaS session sync is disabled; events remain local until sync is enabled.".to_string()); }
    warnings.push("Weak session scanner support means Agent Buddy can track handoff/session metadata but may not parse full historical chats until a native adapter is added.".to_string());
    SessionSyncPlan { sources, event_normalizer: "session-event-center-v1".to_string(), summary_strategy: "local-summary-then-paas-sync".to_string(), handoff_enabled: true, paas_sync_enabled, warnings }
}

fn source(runtime: RuntimeKind, label: &str, default_paths: Vec<String>, parser: &str, supports_resume: bool, support_level: &str) -> SessionScanSource {
    SessionScanSource { runtime, label: label.to_string(), default_paths, detected_paths: Vec::new(), parser: parser.to_string(), supports_resume, support_level: support_level.to_string() }
}
