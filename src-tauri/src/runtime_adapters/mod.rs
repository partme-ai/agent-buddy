pub mod claude_code;
pub mod copilot;
pub mod antigravity;
pub mod gemini_cli;
pub mod opencode;
pub mod openclaw;
pub mod cursor;
pub mod trae;
pub mod aider;
pub mod windsurf;
pub mod qwen;
pub mod codex;
pub mod deerflow;
pub mod workbuddy;
pub mod codewhale;
pub mod hermes;
pub mod kiro;
pub mod qoder;
pub mod generation;

use crate::runtime::{InstallScope, InstallTarget, RuntimeDetection, RuntimeKind};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeAdapterDescriptor {
    pub kind: RuntimeKind,
    pub key: &'static str,
    pub label: &'static str,
    pub scope: InstallScope,
    pub generated_formats: &'static [&'static str],
    pub install_targets: &'static [&'static str],
    pub native_actions: &'static [&'static str],
}

pub fn descriptors() -> Vec<RuntimeAdapterDescriptor> {
    vec![
        claude_code::descriptor(), copilot::descriptor(), antigravity::descriptor(), gemini_cli::descriptor(),
        opencode::descriptor(), openclaw::descriptor(), cursor::descriptor(), trae::descriptor(),
        aider::descriptor(), windsurf::descriptor(), qwen::descriptor(), codex::descriptor(),
        deerflow::descriptor(), workbuddy::descriptor(), codewhale::descriptor(), hermes::descriptor(),
        kiro::descriptor(), qoder::descriptor(),
    ]
}

pub fn descriptor_for(kind: RuntimeKind) -> RuntimeAdapterDescriptor {
    descriptors()
        .into_iter()
        .find(|descriptor| descriptor.kind == kind)
        .unwrap_or_else(|| RuntimeAdapterDescriptor {
            kind,
            key: "unknown",
            label: kind.label(),
            scope: kind.scope(),
            generated_formats: &[],
            install_targets: &[],
            native_actions: &[],
        })
}

pub fn detect_all() -> Vec<RuntimeDetection> {
    descriptors().into_iter().map(|descriptor| detect(descriptor.kind)).collect()
}

pub fn detect(kind: RuntimeKind) -> RuntimeDetection {
    let descriptor = descriptor_for(kind);
    let command_path = command_names(kind).iter().find_map(|name| resolve_command(name));
    let default_target = default_target(kind);
    let config_dir_detected = default_target.as_ref().is_some_and(|path| path.exists());
    let env_detected = env_home(kind);
    let detected = command_path.is_some() || config_dir_detected || env_detected.is_some();
    RuntimeDetection {
        kind,
        label: descriptor.label.to_string(),
        detected,
        scope: descriptor.scope,
        command_path,
        config_dir: env_detected.or_else(|| default_target.as_ref().map(|path| path.display().to_string())),
        default_target: default_target.map(|path| path.display().to_string()),
        notes: adapter_notes(kind, descriptor.scope),
    }
}

pub fn target_dirs(target: &InstallTarget) -> anyhow::Result<Vec<PathBuf>> {
    if let Some(custom) = &target.custom_dir {
        return Ok(vec![PathBuf::from(custom)]);
    }
    match descriptor_for(target.runtime).scope {
        InstallScope::Global => {
            if target.runtime == RuntimeKind::Copilot {
                let home = home_dir()?;
                return Ok(vec![home.join(".github/agents"), home.join(".copilot/agents")]);
            }
            Ok(vec![default_target(target.runtime).ok_or_else(|| anyhow::anyhow!("missing default target for {:?}", target.runtime))?])
        }
        InstallScope::Project => {
            let project = target
                .project_dir
                .as_ref()
                .ok_or_else(|| anyhow::anyhow!("projectDir is required for {:?}", target.runtime))?;
            let base = PathBuf::from(project);
            Ok(vec![match target.runtime {
                RuntimeKind::OpenCode => base.join(".opencode/agents"),
                RuntimeKind::Cursor => base.join(".cursor/rules"),
                RuntimeKind::Trae => base.join(".trae/rules"),
                RuntimeKind::Aider | RuntimeKind::Windsurf => base,
                RuntimeKind::Qwen => base.join(".qwen/agents"),
                RuntimeKind::Codex => base.join(".codex/agents"),
                RuntimeKind::Qoder => base.join(".qoder/agents"),
                RuntimeKind::DeerFlow => base.join("skills/custom"),
                _ => base,
            }])
        }
        InstallScope::Custom => {
            let path = target
                .custom_dir
                .clone()
                .or_else(|| std::env::var("DEERFLOW_SKILLS_DIR").ok())
                .unwrap_or_else(|| "./skills/custom".to_string());
            Ok(vec![PathBuf::from(path)])
        }
    }
}

pub fn default_target(kind: RuntimeKind) -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    Some(match kind {
        RuntimeKind::ClaudeCode => home.join(".claude/agents"),
        RuntimeKind::Copilot => home.join(".github/agents"),
        RuntimeKind::Antigravity => home.join(".gemini/antigravity/skills"),
        RuntimeKind::GeminiCli => home.join(".gemini/extensions/agency-agents"),
        RuntimeKind::OpenClaw => home.join(".openclaw/agency-agents"),
        RuntimeKind::WorkBuddy => home.join(".workbuddy/skills"),
        RuntimeKind::CodeWhale => home.join(".codewhale/skills"),
        RuntimeKind::Hermes => std::env::var("HERMES_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| home.join(".hermes"))
            .join("skills"),
        RuntimeKind::Kiro => home.join(".kiro/agents"),
        _ => return None,
    })
}

pub fn command_names(kind: RuntimeKind) -> &'static [&'static str] {
    match kind {
        RuntimeKind::ClaudeCode => &["claude"],
        RuntimeKind::Copilot => &["code"],
        RuntimeKind::Antigravity => &[],
        RuntimeKind::GeminiCli => &["gemini"],
        RuntimeKind::OpenCode => &["opencode"],
        RuntimeKind::OpenClaw => &["openclaw"],
        RuntimeKind::Cursor => &["cursor"],
        RuntimeKind::Trae => &["trae"],
        RuntimeKind::Aider => &["aider"],
        RuntimeKind::Windsurf => &["windsurf"],
        RuntimeKind::Qwen => &["qwen"],
        RuntimeKind::Codex => &["codex"],
        RuntimeKind::DeerFlow => &["deerflow"],
        RuntimeKind::WorkBuddy => &["workbuddy"],
        RuntimeKind::CodeWhale => &["codewhale"],
        RuntimeKind::Hermes => &["hermes"],
        RuntimeKind::Kiro => &["kiro", "kiro-cli"],
        RuntimeKind::Qoder => &["qoder"],
    }
}

fn env_home(kind: RuntimeKind) -> Option<String> {
    match kind {
        RuntimeKind::Hermes => std::env::var("HERMES_HOME").ok().filter(|value| !value.is_empty()),
        RuntimeKind::DeerFlow => std::env::var("DEERFLOW_SKILLS_DIR").ok().filter(|value| !value.is_empty()),
        _ => None,
    }
}

fn adapter_notes(kind: RuntimeKind, scope: InstallScope) -> Vec<String> {
    let mut notes = Vec::new();
    if matches!(scope, InstallScope::Project) {
        notes.push("Project-level runtime: choose a project directory before install.".to_string());
    }
    if matches!(kind, RuntimeKind::Hermes) {
        notes.push("Hermes supports category-limited installs for Discord slash-command length limits.".to_string());
    }
    if matches!(kind, RuntimeKind::OpenClaw) {
        notes.push("OpenClaw can be registered with `openclaw agents add` after workspace files are written.".to_string());
    }
    notes
}

fn resolve_command(name: &str) -> Option<String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("where").arg(name).output().ok()?
    } else {
        Command::new("sh").arg("-c").arg(format!("command -v {name}")).output().ok()?
    };
    output
        .status
        .success()
        .then(|| String::from_utf8_lossy(&output.stdout).lines().next().unwrap_or(name).trim().to_string())
}

fn home_dir() -> anyhow::Result<PathBuf> {
    dirs::home_dir().ok_or_else(|| anyhow::anyhow!("home directory not found"))
}
