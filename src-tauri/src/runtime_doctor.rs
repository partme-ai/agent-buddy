use crate::adapters;
use crate::runtime::{runtime_to_str, RuntimeDetection, RuntimeKind};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeDoctorReport {
    pub runtime: RuntimeKind,
    pub runtime_key: String,
    pub label: String,
    pub detected: bool,
    pub health: String,
    pub score: i64,
    pub checks: Vec<RuntimeDoctorCheck>,
    pub recommended_actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeDoctorCheck {
    pub id: String,
    pub label: String,
    pub status: String,
    pub message: String,
    pub remediation: Option<String>,
}

pub fn doctor_all_runtimes() -> Vec<RuntimeDoctorReport> {
    adapters::detect_all().into_iter().map(doctor_runtime).collect()
}

pub fn doctor_runtime_by_kind(kind: RuntimeKind) -> RuntimeDoctorReport {
    adapters::detect_all().into_iter().find(|item| item.kind == kind).map(doctor_runtime).unwrap_or_else(|| doctor_runtime(RuntimeDetection {
        kind,
        label: runtime_to_str(kind).to_string(),
        detected: false,
        scope: crate::runtime::InstallScope::Global,
        command_path: None,
        config_dir: None,
        default_target: None,
        notes: vec!["runtime definition was not found in adapter registry".to_string()],
    }))
}

fn doctor_runtime(detection: RuntimeDetection) -> RuntimeDoctorReport {
    let mut checks = Vec::new();
    checks.push(RuntimeDoctorCheck {
        id: "detected".to_string(),
        label: "Runtime detected".to_string(),
        status: if detection.detected { "ok".to_string() } else { "warning".to_string() },
        message: if detection.detected { "Runtime is available locally.".to_string() } else { "Runtime was not detected automatically.".to_string() },
        remediation: if detection.detected { None } else { Some(remediation_for_runtime(detection.kind).to_string()) },
    });
    checks.push(RuntimeDoctorCheck {
        id: "target-path".to_string(),
        label: "Install target path".to_string(),
        status: if detection.default_target.is_some() || detection.config_dir.is_some() { "ok".to_string() } else { "warning".to_string() },
        message: detection.default_target.clone().or(detection.config_dir.clone()).unwrap_or_else(|| "No target path resolved yet.".to_string()),
        remediation: if detection.default_target.is_none() && detection.config_dir.is_none() { Some("Choose a project or custom directory during installation.".to_string()) } else { None },
    });
    checks.push(RuntimeDoctorCheck {
        id: "scope".to_string(),
        label: "Install scope".to_string(),
        status: "ok".to_string(),
        message: format!("{:?} install scope", detection.scope),
        remediation: None,
    });
    let warnings = checks.iter().filter(|check| check.status != "ok").count() as i64;
    let score = (100 - warnings * 25).clamp(0, 100);
    let health = if score >= 90 { "healthy" } else if score >= 50 { "needs-configuration" } else { "not-detected" }.to_string();
    RuntimeDoctorReport {
        runtime: detection.kind,
        runtime_key: runtime_to_str(detection.kind).to_string(),
        label: detection.label,
        detected: detection.detected,
        health,
        score,
        checks,
        recommended_actions: recommended_actions(detection.kind, detection.detected),
    }
}

fn recommended_actions(kind: RuntimeKind, detected: bool) -> Vec<String> {
    let mut actions = Vec::new();
    if !detected { actions.push(remediation_for_runtime(kind).to_string()); }
    actions.push("Generate an install plan before writing any files.".to_string());
    actions.push("Review generated artifacts and backup plan before deployment.".to_string());
    if matches!(kind, RuntimeKind::OpenClaw) { actions.push("Run OpenClaw native registration after files are installed.".to_string()); }
    if matches!(kind, RuntimeKind::Hermes) { actions.push("Install Hermes skills by category when command payload size matters.".to_string()); }
    actions
}

fn remediation_for_runtime(kind: RuntimeKind) -> &'static str {
    match kind {
        RuntimeKind::OpenCode | RuntimeKind::Cursor | RuntimeKind::Trae | RuntimeKind::Aider | RuntimeKind::Windsurf | RuntimeKind::Qwen | RuntimeKind::Codex | RuntimeKind::Qoder => "Choose a project directory; this runtime supports project-local installation.",
        RuntimeKind::DeerFlow => "Choose a custom skills directory or set DEERFLOW_SKILLS_DIR.",
        RuntimeKind::Hermes => "Install Hermes or set HERMES_HOME if using a non-default location.",
        _ => "Install the runtime or create its default configuration directory.",
    }
}
