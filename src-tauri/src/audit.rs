use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEvent {
    pub id: String,
    pub actor: String,
    pub action: String,
    pub resource_type: String,
    pub resource_id: String,
    pub runtime: Option<RuntimeKind>,
    pub severity: AuditSeverity,
    pub message: String,
    pub metadata_json: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuditSeverity {
    Info,
    Warn,
    Error,
    Security,
}

pub fn audit_event(
    action: impl Into<String>,
    resource_type: impl Into<String>,
    resource_id: impl Into<String>,
    runtime: Option<RuntimeKind>,
    severity: AuditSeverity,
    message: impl Into<String>,
) -> AuditEvent {
    AuditEvent {
        id: Uuid::new_v4().to_string(),
        actor: "local-user".to_string(),
        action: action.into(),
        resource_type: resource_type.into(),
        resource_id: resource_id.into(),
        runtime,
        severity,
        message: message.into(),
        metadata_json: "{}".to_string(),
        created_at: chrono::Utc::now().timestamp(),
    }
}

pub fn severity_to_str(severity: AuditSeverity) -> &'static str {
    match severity {
        AuditSeverity::Info => "info",
        AuditSeverity::Warn => "warn",
        AuditSeverity::Error => "error",
        AuditSeverity::Security => "security",
    }
}

pub fn parse_severity(value: &str) -> AuditSeverity {
    match value {
        "warn" => AuditSeverity::Warn,
        "error" => AuditSeverity::Error,
        "security" => AuditSeverity::Security,
        _ => AuditSeverity::Info,
    }
}
