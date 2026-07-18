use crate::buddy_browser::{BrowserActionRequest, BrowserActionResult, PageSnapshot};
use crate::buddy_policy::PolicyDecision;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditFrame {
    pub id: String,
    pub task_id: Option<String>,
    pub session_id: String,
    pub tab_id: Option<String>,
    pub action_summary: String,
    pub policy_decision: PolicyDecision,
    pub before_snapshot: Option<PageSnapshot>,
    pub after_snapshot: Option<PageSnapshot>,
    pub result: BrowserActionResult,
    pub screenshot_path: Option<String>,
    pub replay_hint: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditTimeline {
    pub task_id: Option<String>,
    pub session_id: String,
    pub frames: Vec<AuditFrameSummary>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditFrameSummary {
    pub id: String,
    pub action_summary: String,
    pub ok: bool,
    pub risk_level: String,
    pub requires_confirmation: bool,
    pub created_at: i64,
}

pub fn build_audit_frame(
    task_id: Option<String>,
    request: BrowserActionRequest,
    decision: PolicyDecision,
    before_snapshot: Option<PageSnapshot>,
    after_snapshot: Option<PageSnapshot>,
    result: BrowserActionResult,
) -> AuditFrame {
    let action_summary = summarize_action(&request);
    AuditFrame {
        id: Uuid::new_v4().to_string(),
        task_id,
        session_id: request.session_id,
        tab_id: request.tab_id,
        action_summary,
        policy_decision: decision,
        before_snapshot,
        after_snapshot,
        result,
        screenshot_path: None,
        replay_hint: Some("Replay support will attach screenshots, DOM diffs, and action payloads in the full Buddy Audit implementation.".to_string()),
        created_at: chrono::Utc::now().timestamp(),
    }
}

pub fn summarize_action(request: &BrowserActionRequest) -> String {
    let action_json = serde_json::to_value(&request.action).unwrap_or_default();
    let kind = action_json.get("kind").and_then(|value| value.as_str()).unwrap_or("unknown");
    format!("{kind} requested by {} because {}", request.requested_by, request.reason)
}

pub fn summarize_timeline(session_id: String, frames: Vec<AuditFrame>) -> AuditTimeline {
    let summaries = frames
        .into_iter()
        .map(|frame| AuditFrameSummary {
            id: frame.id,
            action_summary: frame.action_summary,
            ok: frame.result.ok,
            risk_level: format!("{:?}", frame.policy_decision.risk_level),
            requires_confirmation: frame.policy_decision.requires_confirmation,
            created_at: frame.created_at,
        })
        .collect();
    AuditTimeline { task_id: None, session_id, frames: summaries, warnings: vec!["Audit timeline uses in-memory mock frames until persistence is wired.".to_string()] }
}
