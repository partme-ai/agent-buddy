use crate::bundle::AgentBundle;
use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaasConnectionStatus {
    pub configured: bool,
    pub authenticated: bool,
    pub base_url: String,
    pub workspace_id: Option<String>,
    pub user_id: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaasSession {
    pub id: String,
    pub base_url: String,
    pub workspace_id: String,
    pub user_id: String,
    pub access_token_hint: String,
    pub created_at: i64,
    pub expires_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaasLoginRequest {
    pub base_url: String,
    pub workspace_id: String,
    pub user_id: String,
    pub access_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaasBundleSummary {
    pub bundle_id: String,
    pub version: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub target_count: usize,
    pub skill_count: usize,
    pub mcp_count: usize,
    pub knowledge_space_count: usize,
    pub memory_provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaasSyncPreview {
    pub pending_events: usize,
    pub destination: String,
    pub event_types: Vec<String>,
    pub warnings: Vec<String>,
}

pub fn connection_status(base_url: String, session: Option<PaasSession>) -> PaasConnectionStatus {
    match session {
        Some(session) => PaasConnectionStatus {
            configured: true,
            authenticated: true,
            base_url: session.base_url,
            workspace_id: Some(session.workspace_id),
            user_id: Some(session.user_id),
            message: "PaaS session is configured locally. Network sync is not executed in the current local MVP.".to_string(),
        },
        None => PaasConnectionStatus {
            configured: !base_url.trim().is_empty(),
            authenticated: false,
            base_url,
            workspace_id: None,
            user_id: None,
            message: "No PaaS session is stored locally.".to_string(),
        },
    }
}

pub fn create_session(request: PaasLoginRequest) -> PaasSession {
    let now = chrono::Utc::now().timestamp();
    let token_hint = if request.access_token.len() <= 8 {
        "***".to_string()
    } else {
        format!("{}…{}", &request.access_token[..4], &request.access_token[request.access_token.len() - 4..])
    };
    PaasSession {
        id: Uuid::new_v4().to_string(),
        base_url: request.base_url,
        workspace_id: request.workspace_id,
        user_id: request.user_id,
        access_token_hint: token_hint,
        created_at: now,
        expires_at: None,
    }
}

pub fn summarize_bundle(bundle: &AgentBundle) -> PaasBundleSummary {
    PaasBundleSummary {
        bundle_id: bundle.bundle_id.clone(),
        version: bundle.version.clone(),
        name: bundle.profile.name.clone(),
        description: bundle.profile.description.clone(),
        category: bundle.profile.category.clone(),
        target_count: bundle.targets.len(),
        skill_count: bundle.skills.len(),
        mcp_count: bundle.mcp_servers.len(),
        knowledge_space_count: bundle.knowledge.spaces.len(),
        memory_provider: bundle.memory.provider.clone(),
    }
}

pub fn preview_sync(destination: String, events: Vec<String>) -> PaasSyncPreview {
    let mut warnings = Vec::new();
    if destination.trim().is_empty() {
        warnings.push("PaaS destination URL is empty.".to_string());
    }
    if events.is_empty() {
        warnings.push("There are no pending sync events.".to_string());
    }
    PaasSyncPreview {
        pending_events: events.len(),
        destination,
        event_types: events,
        warnings,
    }
}

pub fn default_runtime_targets() -> Vec<RuntimeKind> {
    RuntimeKind::all()
}
