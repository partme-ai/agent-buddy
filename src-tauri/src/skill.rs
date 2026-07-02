use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillPackage {
    pub id: String,
    pub name: String,
    pub description: String,
    pub source: String,
    pub version: Option<String>,
    pub package_path: Option<String>,
    pub sync_mode: SkillSyncMode,
    pub enabled_targets: Vec<RuntimeKind>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SkillSyncMode {
    Auto,
    Symlink,
    Copy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillTargetPath {
    pub runtime: RuntimeKind,
    pub global_path: Option<String>,
    pub project_relative_path: Option<String>,
    pub supports_symlink: bool,
}

pub fn default_skill_targets() -> Vec<SkillTargetPath> {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("~"));
    vec![
        SkillTargetPath { runtime: RuntimeKind::ClaudeCode, global_path: Some(home.join(".claude/skills").display().to_string()), project_relative_path: Some(".claude/skills".to_string()), supports_symlink: true },
        SkillTargetPath { runtime: RuntimeKind::Codex, global_path: Some(home.join(".codex/skills").display().to_string()), project_relative_path: Some(".agents/skills".to_string()), supports_symlink: true },
        SkillTargetPath { runtime: RuntimeKind::OpenCode, global_path: Some(home.join(".config/opencode/skills").display().to_string()), project_relative_path: Some(".opencode/skills".to_string()), supports_symlink: true },
        SkillTargetPath { runtime: RuntimeKind::OpenClaw, global_path: Some(home.join(".openclaw/skills").display().to_string()), project_relative_path: None, supports_symlink: true },
        SkillTargetPath { runtime: RuntimeKind::Hermes, global_path: Some(home.join(".hermes/skills").display().to_string()), project_relative_path: Some(".hermes/skills".to_string()), supports_symlink: true },
        SkillTargetPath { runtime: RuntimeKind::WorkBuddy, global_path: Some(home.join(".workbuddy/skills").display().to_string()), project_relative_path: None, supports_symlink: false },
        SkillTargetPath { runtime: RuntimeKind::CodeWhale, global_path: Some(home.join(".codewhale/skills").display().to_string()), project_relative_path: None, supports_symlink: false },
        SkillTargetPath { runtime: RuntimeKind::DeerFlow, global_path: None, project_relative_path: Some("skills/custom".to_string()), supports_symlink: false },
        SkillTargetPath { runtime: RuntimeKind::Antigravity, global_path: Some(home.join(".gemini/antigravity/skills").display().to_string()), project_relative_path: None, supports_symlink: true },
        SkillTargetPath { runtime: RuntimeKind::GeminiCli, global_path: Some(home.join(".gemini/extensions/agency-agents/skills").display().to_string()), project_relative_path: None, supports_symlink: true },
    ]
}

pub fn skill_ssot_dir(app_data_dir: &std::path::Path) -> PathBuf {
    app_data_dir.join("skills").join("packages")
}

pub fn built_in_buddy_skills() -> Vec<SkillPackage> {
    vec![
        SkillPackage {
            id: "buddy-memory".to_string(),
            name: "Buddy Memory".to_string(),
            description: "Read from and propose updates to Agent Buddy shared memory.".to_string(),
            source: "agent-buddy".to_string(),
            version: Some("0.1.0".to_string()),
            package_path: None,
            sync_mode: SkillSyncMode::Auto,
            enabled_targets: vec![RuntimeKind::ClaudeCode, RuntimeKind::Codex, RuntimeKind::OpenCode, RuntimeKind::Hermes, RuntimeKind::WorkBuddy],
        },
        SkillPackage {
            id: "buddy-knowledge".to_string(),
            name: "Buddy Knowledge".to_string(),
            description: "Search local mirrored knowledge before answering enterprise/project questions.".to_string(),
            source: "agent-buddy".to_string(),
            version: Some("0.1.0".to_string()),
            package_path: None,
            sync_mode: SkillSyncMode::Auto,
            enabled_targets: vec![RuntimeKind::ClaudeCode, RuntimeKind::Codex, RuntimeKind::OpenCode, RuntimeKind::Hermes, RuntimeKind::WorkBuddy],
        },
        SkillPackage {
            id: "buddy-handoff".to_string(),
            name: "Buddy Handoff".to_string(),
            description: "Create and consume task handoff packs across local agent runtimes.".to_string(),
            source: "agent-buddy".to_string(),
            version: Some("0.1.0".to_string()),
            package_path: None,
            sync_mode: SkillSyncMode::Auto,
            enabled_targets: vec![RuntimeKind::ClaudeCode, RuntimeKind::Codex, RuntimeKind::OpenCode, RuntimeKind::Hermes],
        },
    ]
}
