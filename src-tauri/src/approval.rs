use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalRequest {
    pub id: String,
    pub runtime: Option<RuntimeKind>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: String,
    pub reason: String,
    pub risk_level: ApprovalRiskLevel,
    pub status: ApprovalStatus,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ApprovalRiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ApprovalStatus {
    Pending,
    Approved,
    Denied,
    Expired,
}

pub fn new_approval_request(
    runtime: Option<RuntimeKind>,
    action: impl Into<String>,
    resource_type: impl Into<String>,
    resource_id: impl Into<String>,
    reason: impl Into<String>,
    risk_level: ApprovalRiskLevel,
) -> ApprovalRequest {
    ApprovalRequest {
        id: Uuid::new_v4().to_string(),
        runtime,
        action: action.into(),
        resource_type: resource_type.into(),
        resource_id: resource_id.into(),
        reason: reason.into(),
        risk_level,
        status: ApprovalStatus::Pending,
        created_at: chrono::Utc::now().timestamp(),
        resolved_at: None,
    }
}

pub fn resolve_request(mut request: ApprovalRequest, status: ApprovalStatus) -> ApprovalRequest {
    request.status = status;
    request.resolved_at = Some(chrono::Utc::now().timestamp());
    request
}

pub fn risk_to_str(value: ApprovalRiskLevel) -> &'static str {
    match value {
        ApprovalRiskLevel::Low => "low",
        ApprovalRiskLevel::Medium => "medium",
        ApprovalRiskLevel::High => "high",
        ApprovalRiskLevel::Critical => "critical",
    }
}

pub fn parse_risk(value: &str) -> ApprovalRiskLevel {
    match value {
        "medium" => ApprovalRiskLevel::Medium,
        "high" => ApprovalRiskLevel::High,
        "critical" => ApprovalRiskLevel::Critical,
        _ => ApprovalRiskLevel::Low,
    }
}

pub fn status_to_str(value: ApprovalStatus) -> &'static str {
    match value {
        ApprovalStatus::Pending => "pending",
        ApprovalStatus::Approved => "approved",
        ApprovalStatus::Denied => "denied",
        ApprovalStatus::Expired => "expired",
    }
}

pub fn parse_status(value: &str) -> ApprovalStatus {
    match value {
        "approved" => ApprovalStatus::Approved,
        "denied" => ApprovalStatus::Denied,
        "expired" => ApprovalStatus::Expired,
        _ => ApprovalStatus::Pending,
    }
}
