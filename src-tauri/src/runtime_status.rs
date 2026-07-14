use crate::runtime::{runtime_to_str, AgentInstallation, RuntimeDetection, RuntimeKind};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuddyStatusReport {
    pub device_id: String,
    pub generated_at: i64,
    pub runtime_count: usize,
    pub detected_runtime_count: usize,
    pub installation_count: usize,
    pub runtimes: Vec<RuntimeStatusSnapshot>,
    pub installations: Vec<AgentInstallationStatus>,
    pub summary: BuddyStatusSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatusSnapshot {
    pub runtime: RuntimeKind,
    pub runtime_key: String,
    pub label: String,
    pub detected: bool,
    pub command_path: Option<String>,
    pub config_dir: Option<String>,
    pub default_target: Option<String>,
    pub health: RuntimeHealth,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RuntimeHealth {
    Healthy,
    NotDetected,
    NeedsConfiguration,
    Warning,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInstallationStatus {
    pub installation_id: String,
    pub agent_id: String,
    pub runtime: RuntimeKind,
    pub runtime_key: String,
    pub target_path: String,
    pub installed_file_count: usize,
    pub status: String,
    pub installed_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuddyStatusSummary {
    pub healthy: usize,
    pub not_detected: usize,
    pub needs_configuration: usize,
    pub warning: usize,
    pub by_runtime: BTreeMap<String, usize>,
}

pub fn build_status_report(
    device_id: String,
    detections: Vec<RuntimeDetection>,
    installations: Vec<AgentInstallation>,
) -> BuddyStatusReport {
    let runtimes: Vec<_> = detections.into_iter().map(runtime_snapshot).collect();
    let installation_statuses: Vec<_> = installations.into_iter().map(installation_snapshot).collect();
    let mut by_runtime = BTreeMap::new();
    for installation in &installation_statuses {
        *by_runtime.entry(installation.runtime_key.clone()).or_insert(0) += 1;
    }
    let summary = BuddyStatusSummary {
        healthy: runtimes.iter().filter(|item| matches!(item.health, RuntimeHealth::Healthy)).count(),
        not_detected: runtimes.iter().filter(|item| matches!(item.health, RuntimeHealth::NotDetected)).count(),
        needs_configuration: runtimes.iter().filter(|item| matches!(item.health, RuntimeHealth::NeedsConfiguration)).count(),
        warning: runtimes.iter().filter(|item| matches!(item.health, RuntimeHealth::Warning)).count(),
        by_runtime,
    };
    BuddyStatusReport {
        device_id,
        generated_at: chrono::Utc::now().timestamp(),
        runtime_count: runtimes.len(),
        detected_runtime_count: runtimes.iter().filter(|runtime| runtime.detected).count(),
        installation_count: installation_statuses.len(),
        runtimes,
        installations: installation_statuses,
        summary,
    }
}

fn runtime_snapshot(detection: RuntimeDetection) -> RuntimeStatusSnapshot {
    let health = if detection.detected {
        if detection.command_path.is_none() && detection.config_dir.is_none() && detection.default_target.is_none() {
            RuntimeHealth::Warning
        } else {
            RuntimeHealth::Healthy
        }
    } else if requires_manual_config(detection.kind) {
        RuntimeHealth::NeedsConfiguration
    } else {
        RuntimeHealth::NotDetected
    };
    RuntimeStatusSnapshot {
        runtime: detection.kind,
        runtime_key: runtime_to_str(detection.kind).to_string(),
        label: detection.label,
        detected: detection.detected,
        command_path: detection.command_path,
        config_dir: detection.config_dir,
        default_target: detection.default_target,
        health,
        notes: detection.notes,
    }
}

fn installation_snapshot(installation: AgentInstallation) -> AgentInstallationStatus {
    AgentInstallationStatus {
        installation_id: installation.id,
        agent_id: installation.agent_id,
        runtime: installation.runtime,
        runtime_key: runtime_to_str(installation.runtime).to_string(),
        target_path: installation.target_path,
        installed_file_count: installation.installed_files.len(),
        status: installation.status,
        installed_at: installation.installed_at,
    }
}

fn requires_manual_config(runtime: RuntimeKind) -> bool {
    matches!(runtime, RuntimeKind::DeerFlow | RuntimeKind::Cursor | RuntimeKind::Trae | RuntimeKind::Aider | RuntimeKind::Windsurf | RuntimeKind::Qoder)
}
