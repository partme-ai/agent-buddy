use crate::bundle::AgentBundle;
use crate::runtime::RuntimeKind;
use crate::settings::AgentBuddySettings;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaasConnectionInfo {
    pub base_url: String,
    pub device_id: String,
    pub sync_enabled: bool,
    pub telemetry_enabled: bool,
    pub endpoints: PaasEndpoints,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaasEndpoints {
    pub device_register: String,
    pub agent_bundles: String,
    pub sync_outbox: String,
    pub audit_events: String,
    pub memory_sync: String,
    pub session_sync: String,
    pub knowledge_sync: String,
}

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
pub struct DeviceRegistrationRequest {
    pub request_id: String,
    pub device_id: String,
    pub device_name: String,
    pub platform: String,
    pub app_version: String,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundlePullRequest {
    pub user_id: Option<String>,
    pub device_id: String,
    pub runtime_targets: Vec<String>,
    pub include_knowledge: bool,
    pub include_skills: bool,
    pub include_mcp: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundlePullResponse {
    pub bundles: Vec<AgentBundle>,
    pub next_cursor: Option<String>,
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

pub fn connection_info(settings: &AgentBuddySettings) -> PaasConnectionInfo {
    let base = settings.paas_base_url.trim_end_matches('/').to_string();
    PaasConnectionInfo {
        base_url: base.clone(),
        device_id: settings.device_id.clone(),
        sync_enabled: settings.sync_enabled,
        telemetry_enabled: settings.telemetry_enabled,
        endpoints: PaasEndpoints {
            device_register: format!("{base}/api/agent-buddy/devices/register"),
            agent_bundles: format!("{base}/api/agent-buddy/bundles"),
            sync_outbox: format!("{base}/api/agent-buddy/sync/outbox"),
            audit_events: format!("{base}/api/agent-buddy/audit-events"),
            memory_sync: format!("{base}/api/agent-buddy/memory/sync"),
            session_sync: format!("{base}/api/agent-buddy/session/sync"),
            knowledge_sync: format!("{base}/api/agent-buddy/knowledge/sync"),
        },
    }
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
    PaasSession { id: Uuid::new_v4().to_string(), base_url: request.base_url, workspace_id: request.workspace_id, user_id: request.user_id, access_token_hint: token_hint, created_at: now, expires_at: None }
}

pub fn device_registration_request(settings: &AgentBuddySettings) -> DeviceRegistrationRequest {
    DeviceRegistrationRequest {
        request_id: Uuid::new_v4().to_string(),
        device_id: settings.device_id.clone(),
        device_name: std::env::var("COMPUTERNAME").or_else(|_| std::env::var("HOSTNAME")).unwrap_or_else(|_| "local-device".to_string()),
        platform: std::env::consts::OS.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        capabilities: vec![
            "agent-bundle-install".to_string(), "runtime-detect".to_string(), "skill-install".to_string(),
            "mcp-config-preview".to_string(), "memory-center".to_string(), "knowledge-mirror".to_string(),
            "session-event-center".to_string(), "sync-outbox".to_string(), "audit-events".to_string(),
        ],
    }
}

pub fn bundle_pull_request(settings: &AgentBuddySettings, runtime_targets: Vec<String>) -> BundlePullRequest {
    BundlePullRequest { user_id: None, device_id: settings.device_id.clone(), runtime_targets, include_knowledge: true, include_skills: true, include_mcp: true }
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
    if destination.trim().is_empty() { warnings.push("PaaS destination URL is empty.".to_string()); }
    if events.is_empty() { warnings.push("There are no pending sync events.".to_string()); }
    PaasSyncPreview { pending_events: events.len(), destination, event_types: events, warnings }
}

pub fn default_runtime_targets() -> Vec<RuntimeKind> {
    RuntimeKind::all()
}
