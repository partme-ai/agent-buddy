use crate::adapters;
use crate::runtime::{RuntimeDetection, RuntimeKind};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorReport {
    pub summary: DoctorSummary,
    pub checks: Vec<DoctorCheck>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorSummary {
    pub ok: usize,
    pub warning: usize,
    pub error: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorCheck {
    pub id: String,
    pub label: String,
    pub status: DoctorStatus,
    pub message: String,
    pub remediation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DoctorStatus {
    Ok,
    Warning,
    Error,
}

pub fn run_doctor(app_data_dir: &Path) -> DoctorReport {
    let mut checks = Vec::new();
    checks.push(check_app_data_dir(app_data_dir));
    checks.push(check_git_available());
    checks.extend(adapters::detect_all().into_iter().map(runtime_check));
    checks.push(check_source_cache(app_data_dir));
    checks.push(check_generated_dir(app_data_dir));
    checks.push(check_backup_dir(app_data_dir));
    summarize(checks)
}

fn check_app_data_dir(app_data_dir: &Path) -> DoctorCheck {
    if app_data_dir.exists() {
        ok("app-data-dir", "App data directory", format!("{} exists", app_data_dir.display()))
    } else {
        warn(
            "app-data-dir",
            "App data directory",
            format!("{} does not exist yet", app_data_dir.display()),
            "Start Agent Buddy once or refresh the source to initialize local data.",
        )
    }
}

fn check_git_available() -> DoctorCheck {
    if command_exists("git") {
        ok("git", "Git CLI", "git is available in PATH")
    } else {
        error(
            "git",
            "Git CLI",
            "git is not available in PATH",
            "Install git before refreshing GitHub-based agent sources.",
        )
    }
}

fn runtime_check(detection: RuntimeDetection) -> DoctorCheck {
    let id = format!("runtime-{:?}", detection.kind);
    if detection.detected {
        ok(id, detection.label, detection.config_dir.or(detection.command_path).unwrap_or_else(|| "runtime detected".to_string()))
    } else {
        let remediation = remediation_for_runtime(detection.kind);
        warn(id, detection.label, "runtime not detected", remediation)
    }
}

fn check_source_cache(app_data_dir: &Path) -> DoctorCheck {
    let path = app_data_dir.join("sources").join("agency-agents-zh").join("repo");
    if path.exists() {
        ok("source-cache", "agency-agents-zh source cache", format!("{} exists", path.display()))
    } else {
        warn(
            "source-cache",
            "agency-agents-zh source cache",
            "source cache is not initialized",
            "Click Refresh Source before listing or installing agents.",
        )
    }
}

fn check_generated_dir(app_data_dir: &Path) -> DoctorCheck {
    let path = app_data_dir.join("generated");
    if path.exists() {
        ok("generated-dir", "Generated artifact cache", format!("{} exists", path.display()))
    } else {
        warn(
            "generated-dir",
            "Generated artifact cache",
            "generated artifact cache is empty",
            "Run an install plan and execute an installation to populate generated artifacts.",
        )
    }
}

fn check_backup_dir(app_data_dir: &Path) -> DoctorCheck {
    let path = app_data_dir.join("installations").join("backups");
    if path.exists() {
        ok("backup-dir", "Install backup directory", format!("{} exists", path.display()))
    } else {
        warn(
            "backup-dir",
            "Install backup directory",
            "backup directory is empty",
            "Backups are created automatically when existing files are overwritten.",
        )
    }
}

fn remediation_for_runtime(kind: RuntimeKind) -> &'static str {
    match kind {
        RuntimeKind::OpenCode
        | RuntimeKind::Cursor
        | RuntimeKind::Trae
        | RuntimeKind::Aider
        | RuntimeKind::Windsurf
        | RuntimeKind::Qwen
        | RuntimeKind::Codex
        | RuntimeKind::Qoder => "This runtime can still be installed project-locally by choosing a project directory.",
        RuntimeKind::DeerFlow => "Choose a custom skills directory or set DEERFLOW_SKILLS_DIR.",
        RuntimeKind::Hermes => "Install Hermes or set HERMES_HOME if using a non-default location.",
        _ => "Install the runtime or create its default config directory before installing global agents.",
    }
}

fn command_exists(name: &str) -> bool {
    if cfg!(target_os = "windows") {
        std::process::Command::new("where").arg(name).output().is_ok_and(|output| output.status.success())
    } else {
        std::process::Command::new("sh").arg("-c").arg(format!("command -v {name}")).output().is_ok_and(|output| output.status.success())
    }
}

fn summarize(checks: Vec<DoctorCheck>) -> DoctorReport {
    let mut summary = DoctorSummary { ok: 0, warning: 0, error: 0 };
    for check in &checks {
        match check.status {
            DoctorStatus::Ok => summary.ok += 1,
            DoctorStatus::Warning => summary.warning += 1,
            DoctorStatus::Error => summary.error += 1,
        }
    }
    DoctorReport { summary, checks }
}

fn ok(id: impl Into<String>, label: impl Into<String>, message: impl Into<String>) -> DoctorCheck {
    DoctorCheck { id: id.into(), label: label.into(), status: DoctorStatus::Ok, message: message.into(), remediation: None }
}

fn warn(id: impl Into<String>, label: impl Into<String>, message: impl Into<String>, remediation: impl Into<String>) -> DoctorCheck {
    DoctorCheck { id: id.into(), label: label.into(), status: DoctorStatus::Warning, message: message.into(), remediation: Some(remediation.into()) }
}

fn error(id: impl Into<String>, label: impl Into<String>, message: impl Into<String>, remediation: impl Into<String>) -> DoctorCheck {
    DoctorCheck { id: id.into(), label: label.into(), status: DoctorStatus::Error, message: message.into(), remediation: Some(remediation.into()) }
}
