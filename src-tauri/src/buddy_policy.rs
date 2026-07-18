use crate::buddy_browser::{BrowserAction, BrowserActionRequest};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyContext {
    pub user_id: Option<String>,
    pub workspace_id: Option<String>,
    pub profile_id: Option<String>,
    pub session_id: String,
    pub platform: Option<String>,
    pub automation_mode: AutomationMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AutomationMode {
    ObserveOnly,
    Assisted,
    ConfirmBeforeWrite,
    AutonomousLowRisk,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyDecision {
    pub decision_id: String,
    pub action_id: String,
    pub allowed: bool,
    pub requires_confirmation: bool,
    pub risk_level: PolicyRiskLevel,
    pub reason: String,
    pub required_confirmations: Vec<String>,
    pub blocked_by: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PolicyRiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

pub fn evaluate_browser_action(action_id: String, request: &BrowserActionRequest, context: &PolicyContext) -> PolicyDecision {
    let risk = classify_action_risk(&request.action);
    let mut required_confirmations = Vec::new();
    let mut blocked_by = Vec::new();
    let mut requires_confirmation = false;

    match context.automation_mode {
        AutomationMode::ObserveOnly => {
            if !matches!(request.action, BrowserAction::Screenshot | BrowserAction::Extract { .. } | BrowserAction::WaitFor { .. }) {
                blocked_by.push("observe-only-mode".to_string());
            }
        }
        AutomationMode::Assisted => {
            if matches!(risk, PolicyRiskLevel::High | PolicyRiskLevel::Critical) {
                requires_confirmation = true;
                required_confirmations.push("high-risk-browser-action".to_string());
            }
        }
        AutomationMode::ConfirmBeforeWrite => {
            if is_write_action(&request.action) {
                requires_confirmation = true;
                required_confirmations.push("write-action".to_string());
            }
        }
        AutomationMode::AutonomousLowRisk => {
            if !matches!(risk, PolicyRiskLevel::Low) {
                requires_confirmation = true;
                required_confirmations.push("non-low-risk-action".to_string());
            }
        }
    }

    let allowed = blocked_by.is_empty();
    let reason = if allowed {
        if requires_confirmation { "Action is allowed after user confirmation." } else { "Action is allowed by current policy." }
    } else {
        "Action is blocked by current policy."
    };

    PolicyDecision { decision_id: format!("policy-{action_id}"), action_id, allowed, requires_confirmation, risk_level: risk, reason: reason.to_string(), required_confirmations, blocked_by }
}

pub fn classify_action_risk(action: &BrowserAction) -> PolicyRiskLevel {
    match action {
        BrowserAction::Screenshot | BrowserAction::Extract { .. } | BrowserAction::WaitFor { .. } => PolicyRiskLevel::Low,
        BrowserAction::Open { .. } | BrowserAction::Scroll { .. } | BrowserAction::Keys { .. } => PolicyRiskLevel::Medium,
        BrowserAction::Click { .. } | BrowserAction::Type { .. } | BrowserAction::Fill { .. } | BrowserAction::Select { .. } | BrowserAction::HumanTakeover { .. } => PolicyRiskLevel::High,
        BrowserAction::CloseTab { .. } => PolicyRiskLevel::Critical,
    }
}

pub fn is_write_action(action: &BrowserAction) -> bool {
    matches!(action, BrowserAction::Click { .. } | BrowserAction::Type { .. } | BrowserAction::Fill { .. } | BrowserAction::Select { .. } | BrowserAction::Keys { .. } | BrowserAction::CloseTab { .. })
}

pub fn mock_policy_context(session_id: String) -> PolicyContext {
    PolicyContext { user_id: None, workspace_id: None, profile_id: Some("profile-local-default".to_string()), session_id, platform: Some("mock".to_string()), automation_mode: AutomationMode::ConfirmBeforeWrite }
}
