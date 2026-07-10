use crate::audit::AuditEvent;
use crate::console_core::ConsoleInstance;
use crate::generated::GeneratedArtifact;
use crate::instance::InstanceRecord;
use crate::runtime::{AgentInstallation, InstallBackup, InstallEvent};
use crate::session::SessionEvent;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorSnapshot {
    pub subject_id: String,
    pub subject_type: String,
    pub title: String,
    pub summary: String,
    pub sections: Vec<InspectorSection>,
    pub actions: Vec<InspectorAction>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorSection {
    pub id: String,
    pub title: String,
    pub rows: Vec<InspectorRow>,
    pub code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorRow {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorAction {
    pub id: String,
    pub label: String,
    pub destructive: bool,
    pub requires_approval: bool,
}

pub fn instance_snapshot(instance: ConsoleInstance, persisted: Option<InstanceRecord>, events: Vec<InstallEvent>, audits: Vec<AuditEvent>, sessions: Vec<SessionEvent>) -> InspectorSnapshot {
    let mut sections = vec![InspectorSection {
        id: "overview".to_string(),
        title: "Overview".to_string(),
        rows: vec![
            row("Status", &instance.status),
            row("Type", &instance.instance_type),
            row("Group", &instance.group),
            row("Runtime", &instance.runtime.map(|runtime| format!("{:?}", runtime)).unwrap_or_else(|| "-".to_string())),
            row("Path", instance.path.as_deref().unwrap_or("-")),
            row("Tags", &instance.tags.join(", ")),
        ],
        code: None,
    }];
    if let Some(record) = persisted {
        sections.push(InspectorSection { id: "persisted".to_string(), title: "Persisted Instance".to_string(), rows: vec![row("ID", &record.id), row("Created", &record.created_at.to_string()), row("Updated", &record.updated_at.to_string())], code: Some(record.metadata_json) });
    }
    sections.push(InspectorSection { id: "events".to_string(), title: "Recent Events".to_string(), rows: events.into_iter().take(20).map(|event| row(&event.level, &event.message)).collect(), code: None });
    sections.push(InspectorSection { id: "audit".to_string(), title: "Audit".to_string(), rows: audits.into_iter().take(20).map(|event| row(&event.action, &event.message)).collect(), code: None });
    sections.push(InspectorSection { id: "sessions".to_string(), title: "Session Context".to_string(), rows: sessions.into_iter().take(20).map(|event| row(&event.event_type.to_string(), &event.session_id)).collect(), code: None });
    InspectorSnapshot { subject_id: instance.id.clone(), subject_type: instance.instance_type, title: instance.name, summary: instance.description, sections, actions: default_actions(), warnings: Vec::new() }
}

pub fn installation_snapshot(installation: AgentInstallation, backups: Vec<InstallBackup>, events: Vec<InstallEvent>) -> InspectorSnapshot {
    let sections = vec![
        InspectorSection { id: "overview".to_string(), title: "Installation".to_string(), rows: vec![row("Agent", &installation.agent_id), row("Runtime", &format!("{:?}", installation.runtime)), row("Status", &installation.status), row("Target", &installation.target_path), row("Files", &installation.installed_files.len().to_string())], code: None },
        InspectorSection { id: "files".to_string(), title: "Installed Files".to_string(), rows: installation.installed_files.iter().map(|file| row("file", file)).collect(), code: None },
        InspectorSection { id: "backups".to_string(), title: "Backups".to_string(), rows: backups.into_iter().map(|backup| row(&backup.id, &backup.backup_path)).collect(), code: None },
        InspectorSection { id: "events".to_string(), title: "Install Events".to_string(), rows: events.into_iter().map(|event| row(&event.level, &event.message)).collect(), code: None },
    ];
    InspectorSnapshot { subject_id: installation.id, subject_type: "agent-installation".to_string(), title: installation.agent_id, summary: installation.target_path, sections, actions: default_actions(), warnings: Vec::new() }
}

pub fn generated_artifact_snapshot(artifact: GeneratedArtifact, content: Option<String>) -> InspectorSnapshot {
    let section = InspectorSection { id: "content".to_string(), title: "Generated Artifact".to_string(), rows: vec![row("Runtime", &artifact.runtime), row("Relative Path", &artifact.relative_path), row("Size", &artifact.size_bytes.to_string())], code: content };
    InspectorSnapshot { subject_id: artifact.absolute_path.clone(), subject_type: "generated-artifact".to_string(), title: artifact.relative_path, summary: artifact.absolute_path, sections: vec![section], actions: vec![InspectorAction { id: "risk-scan".to_string(), label: "Risk scan".to_string(), destructive: false, requires_approval: false }], warnings: Vec::new() }
}

fn row(label: &str, value: &str) -> InspectorRow { InspectorRow { label: label.to_string(), value: value.to_string() } }
fn default_actions() -> Vec<InspectorAction> { vec![InspectorAction { id: "open".to_string(), label: "Open".to_string(), destructive: false, requires_approval: false }, InspectorAction { id: "repair".to_string(), label: "Repair".to_string(), destructive: false, requires_approval: true }, InspectorAction { id: "uninstall".to_string(), label: "Uninstall".to_string(), destructive: true, requires_approval: true }] }
