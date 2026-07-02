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
        source(RuntimeKind::ClaudeCode, "Claude Code", vec![home.join(".claude/projects").display().to_string()], "claude-jsonl", true),
        source(RuntimeKind::Codex, "Codex CLI", vec![home.join(".codex/sessions").display().to_string()], "codex-jsonl-or-sqlite", true),
        source(RuntimeKind::OpenCode, "OpenCode", vec![home.join(".local/share/opencode").display().to_string(), home.join(".config/opencode").display().to_string()], "opencode-sqlite", true),
        source(RuntimeKind::OpenClaw, "OpenClaw", vec![home.join(".openclaw/sessions").display().to_string(), home.join(".openclaw/workspaces").display().to_string()], "openclaw-workspace-events", true),
        source(RuntimeKind::GeminiCli, "Gemini CLI", vec![home.join(".gemini/sessions").display().to_string()], "gemini-json", true),
        source(RuntimeKind::Hermes, "Hermes Agent", vec![home.join(".hermes/sessions").display().to_string(), home.join(".local/share/hermes").display().to_string()], "hermes-sqlite", true),
        source(RuntimeKind::WorkBuddy, "WorkBuddy", vec![home.join(".workbuddy/sessions").display().to_string()], "workbuddy-events", true),
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
    if sources.iter().all(|source| source.detected_paths.is_empty()) {
        warnings.push("No local session stores detected yet. Sessions will appear after supported runtimes create local history.".to_string());
    }
    if !paas_sync_enabled {
        warnings.push("PaaS session sync is disabled; events remain local until sync is enabled.".to_string());
    }
    SessionSyncPlan {
        sources,
        event_normalizer: "session-event-center-v1".to_string(),
        summary_strategy: "local-summary-then-paas-sync".to_string(),
        handoff_enabled: true,
        paas_sync_enabled,
        warnings,
    }
}

fn source(runtime: RuntimeKind, label: &str, default_paths: Vec<String>, parser: &str, supports_resume: bool) -> SessionScanSource {
    SessionScanSource { runtime, label: label.to_string(), default_paths, detected_paths: Vec::new(), parser: parser.to_string(), supports_resume }
}
