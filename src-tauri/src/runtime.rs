use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

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

impl RuntimeKind {
    pub fn all() -> Vec<Self> {
        vec![
            Self::ClaudeCode, Self::Copilot, Self::Antigravity, Self::GeminiCli, Self::OpenCode,
            Self::OpenClaw, Self::Cursor, Self::Trae, Self::Aider, Self::Windsurf, Self::Qwen,
            Self::Codex, Self::DeerFlow, Self::WorkBuddy, Self::CodeWhale, Self::Hermes,
            Self::Kiro, Self::Qoder,
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
            Self::ClaudeCode | Self::Copilot | Self::Antigravity | Self::GeminiCli | Self::OpenClaw | Self::WorkBuddy | Self::CodeWhale | Self::Hermes | Self::Kiro => InstallScope::Global,
            Self::OpenCode | Self::Cursor | Self::Trae | Self::Aider | Self::Windsurf | Self::Qwen | Self::Codex | Self::Qoder => InstallScope::Project,
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
            Self::Hermes => std::env::var("HERMES_HOME").map(PathBuf::from).unwrap_or_else(|_| home.join(".hermes")).join("skills"),
            Self::Kiro => home.join(".kiro/agents"),
            _ => return None,
        })
    }

    fn command_name(self) -> Option<&'static str> {
        match self {
            Self::ClaudeCode => Some("claude"), Self::Copilot => Some("code"), Self::GeminiCli => Some("gemini"),
            Self::OpenCode => Some("opencode"), Self::OpenClaw => Some("openclaw"), Self::Cursor => Some("cursor"),
            Self::Trae => Some("trae"), Self::Aider => Some("aider"), Self::Windsurf => Some("windsurf"), Self::Qwen => Some("qwen"),
            Self::Codex => Some("codex"), Self::DeerFlow => Some("deerflow"), Self::WorkBuddy => Some("workbuddy"),
            Self::CodeWhale => Some("codewhale"), Self::Hermes => Some("hermes"), Self::Kiro => Some("kiro"), Self::Qoder => Some("qoder"),
            Self::Antigravity => None,
        }
    }
}

fn command_exists(command: &str) -> bool {
    Command::new(command).arg("--version").output().is_ok()
}

pub fn detect_all_runtimes() -> Vec<RuntimeDetection> {
    RuntimeKind::all().into_iter().map(|kind| {
        let command_detected = kind.command_name().is_some_and(command_exists);
        let target = kind.default_target();
        let dir_detected = target.as_ref().is_some_and(|path| path.exists());
        RuntimeDetection {
            kind,
            label: kind.label().to_string(),
            detected: command_detected || dir_detected,
            scope: kind.scope(),
            command_path: kind.command_name().map(str::to_string),
            config_dir: target.as_ref().map(|path| path.display().to_string()),
            default_target: target.map(|path| path.display().to_string()),
            notes: Vec::new(),
        }
    }).collect()
}
