use crate::adapters::GeneratedFile;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RuntimeKind {
    ClaudeCode,
    Copilot,
    Antigravity,
    GeminiCli,
    OpenCode,
    OpenClaw,
    Cursor,
    Trae,
    Aider,
    Windsurf,
    Qwen,
    Codex,
    DeerFlow,
    WorkBuddy,
    CodeWhale,
    Hermes,
    Kiro,
    Qoder,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InstallScope {
    Global,
    Project,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeDetection {
    pub kind: RuntimeKind,
    pub label: String,
    pub detected: bool,
    pub scope: InstallScope,
    pub command_path: Option<String>,
    pub config_dir: Option<String>,
    pub default_target: Option<String>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallTarget {
    pub runtime: RuntimeKind,
    pub project_dir: Option<String>,
    pub custom_dir: Option<String>,
    #[serde(default)]
    pub category_filters: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallPlan {
    pub source_id: String,
    pub total_agents: usize,
    pub total_files: usize,
    pub targets: Vec<RuntimeInstallPlan>,
    pub conflicts: Vec<InstallConflict>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInstallPlan {
    pub runtime: RuntimeKind,
    pub scope: InstallScope,
    pub target_dirs: Vec<String>,
    pub files_to_write: usize,
    pub agents_to_install: usize,
    pub post_actions: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallConflict {
    pub runtime: RuntimeKind,
    pub path: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub runtime: RuntimeKind,
    pub installed_count: usize,
    pub target_path: String,
    pub files_written: usize,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInstallation {
    pub id: String,
    pub source_id: String,
    pub agent_id: String,
    pub runtime: RuntimeKind,
    pub scope: InstallScope,
    pub project_dir: Option<String>,
    pub target_path: String,
    pub installed_files: Vec<String>,
    pub source_commit: Option<String>,
    pub installed_at: i64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallBackup {
    pub id: String,
    pub installation_id: String,
    pub runtime: RuntimeKind,
    pub original_path: String,
    pub backup_path: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallEvent {
    pub id: String,
    pub installation_id: Option<String>,
    pub runtime: Option<RuntimeKind>,
    pub level: String,
    pub message: String,
    pub created_at: i64,
}

#[derive(Debug, Clone)]
pub struct RuntimeGeneratedFiles {
    pub target_dirs: Vec<PathBuf>,
    pub files: Vec<GeneratedFile>,
}

impl RuntimeKind {
    pub fn all() -> Vec<Self> {
        vec![
            Self::ClaudeCode,
            Self::Copilot,
            Self::Antigravity,
            Self::GeminiCli,
            Self::OpenCode,
            Self::OpenClaw,
            Self::Cursor,
            Self::Trae,
            Self::Aider,
            Self::Windsurf,
            Self::Qwen,
            Self::Codex,
            Self::DeerFlow,
            Self::WorkBuddy,
            Self::CodeWhale,
            Self::Hermes,
            Self::Kiro,
            Self::Qoder,
        ]
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::ClaudeCode => "Claude Code",
            Self::Copilot => "GitHub Copilot",
            Self::Antigravity => "Antigravity",
            Self::GeminiCli => "Gemini CLI",
            Self::OpenCode => "OpenCode",
            Self::OpenClaw => "OpenClaw",
            Self::Cursor => "Cursor",
            Self::Trae => "TRAE",
            Self::Aider => "Aider",
            Self::Windsurf => "Windsurf",
            Self::Qwen => "Qwen Code",
            Self::Codex => "Codex CLI",
            Self::DeerFlow => "DeerFlow",
            Self::WorkBuddy => "WorkBuddy",
            Self::CodeWhale => "CodeWhale",
            Self::Hermes => "Hermes Agent",
            Self::Kiro => "Kiro",
            Self::Qoder => "Qoder",
        }
    }

    pub fn scope(self) -> InstallScope {
        match self {
            Self::ClaudeCode
            | Self::Copilot
            | Self::Antigravity
            | Self::GeminiCli
            | Self::OpenClaw
            | Self::WorkBuddy
            | Self::CodeWhale
            | Self::Hermes
            | Self::Kiro => InstallScope::Global,
            Self::OpenCode
            | Self::Cursor
            | Self::Trae
            | Self::Aider
            | Self::Windsurf
            | Self::Qwen
            | Self::Codex
            | Self::Qoder => InstallScope::Project,
            Self::DeerFlow => InstallScope::Custom,
        }
    }

    pub fn default_target(self) -> Option<PathBuf> {
        let home = dirs::home_dir()?;
        Some(match self {
            Self::ClaudeCode => home.join(".claude/agents"),
            Self::Copilot => home.join(".github/agents"),
            Self::Antigravity => home.join(".gemini/antigravity/skills"),
            Self::GeminiCli => home.join(".gemini/extensions/agency-agents"),
            Self::OpenClaw => home.join(".openclaw/agency-agents"),
            Self::WorkBuddy => home.join(".workbuddy/skills"),
            Self::CodeWhale => home.join(".codewhale/skills"),
            Self::Hermes => std::env::var("HERMES_HOME")
                .map(PathBuf::from)
                .unwrap_or_else(|_| home.join(".hermes"))
                .join("skills"),
            Self::Kiro => home.join(".kiro/agents"),
            _ => return None,
        })
    }

    pub fn command_names(self) -> &'static [&'static str] {
        match self {
            Self::ClaudeCode => &["claude"],
            Self::Copilot => &["code"],
            Self::Antigravity => &[],
            Self::GeminiCli => &["gemini"],
            Self::OpenCode => &["opencode"],
            Self::OpenClaw => &["openclaw"],
            Self::Cursor => &["cursor"],
            Self::Trae => &["trae"],
            Self::Aider => &["aider"],
            Self::Windsurf => &["windsurf"],
            Self::Qwen => &["qwen"],
            Self::Codex => &["codex"],
            Self::DeerFlow => &["deerflow"],
            Self::WorkBuddy => &["workbuddy"],
            Self::CodeWhale => &["codewhale"],
            Self::Hermes => &["hermes"],
            Self::Kiro => &["kiro", "kiro-cli"],
            Self::Qoder => &["qoder"],
        }
    }
}

pub fn runtime_to_str(runtime: RuntimeKind) -> &'static str {
    match runtime {
        RuntimeKind::ClaudeCode => "claude-code",
        RuntimeKind::Copilot => "copilot",
        RuntimeKind::Antigravity => "antigravity",
        RuntimeKind::GeminiCli => "gemini-cli",
        RuntimeKind::OpenCode => "opencode",
        RuntimeKind::OpenClaw => "openclaw",
        RuntimeKind::Cursor => "cursor",
        RuntimeKind::Trae => "trae",
        RuntimeKind::Aider => "aider",
        RuntimeKind::Windsurf => "windsurf",
        RuntimeKind::Qwen => "qwen",
        RuntimeKind::Codex => "codex",
        RuntimeKind::DeerFlow => "deerflow",
        RuntimeKind::WorkBuddy => "workbuddy",
        RuntimeKind::CodeWhale => "codewhale",
        RuntimeKind::Hermes => "hermes",
        RuntimeKind::Kiro => "kiro",
        RuntimeKind::Qoder => "qoder",
    }
}

pub fn parse_runtime(value: &str) -> RuntimeKind {
    match value {
        "copilot" => RuntimeKind::Copilot,
        "antigravity" => RuntimeKind::Antigravity,
        "gemini-cli" => RuntimeKind::GeminiCli,
        "opencode" => RuntimeKind::OpenCode,
        "openclaw" => RuntimeKind::OpenClaw,
        "cursor" => RuntimeKind::Cursor,
        "trae" => RuntimeKind::Trae,
        "aider" => RuntimeKind::Aider,
        "windsurf" => RuntimeKind::Windsurf,
        "qwen" => RuntimeKind::Qwen,
        "codex" => RuntimeKind::Codex,
        "deerflow" => RuntimeKind::DeerFlow,
        "workbuddy" => RuntimeKind::WorkBuddy,
        "codewhale" => RuntimeKind::CodeWhale,
        "hermes" => RuntimeKind::Hermes,
        "kiro" => RuntimeKind::Kiro,
        "qoder" => RuntimeKind::Qoder,
        _ => RuntimeKind::ClaudeCode,
    }
}

pub fn scope_to_str(scope: InstallScope) -> &'static str {
    match scope {
        InstallScope::Global => "global",
        InstallScope::Project => "project",
        InstallScope::Custom => "custom",
    }
}

pub fn parse_scope(value: &str) -> InstallScope {
    match value {
        "project" => InstallScope::Project,
        "custom" => InstallScope::Custom,
        _ => InstallScope::Global,
    }
}
