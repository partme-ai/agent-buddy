use crate::bundle::AgentBundle;
use crate::runtime::RuntimeKind;
use crate::settings::AgentBuddySettings;
use crate::sync::SyncOutboxEvent;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Duration;
use uuid::Uuid;

const PAAS_SESSION_FILE: &str = "paas-session.json";
const HTTP_TIMEOUT_SECONDS: u64 = 15;

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
struct StoredPaasSession {
    pub session: PaasSession,
    pub access_token: String,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaasHttpResult {
    pub endpoint: String,
    pub method: String,
    pub ok: bool,
    pub status_code: Option<u16>,
    pub sent_at: i64,
    pub request_body_preview: String,
    pub response_preview: String,
    #[serde(skip_serializing, default)]
    pub response_body: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaasSyncPushRequest {
    pub device_id: String,
    pub workspace_id: String,
    pub events: Vec<SyncOutboxEvent>,
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
            message: "PaaS session is stored locally and can execute authenticated requests. Token file is restricted to the current user on Unix-like platforms.".to_string(),
        },
        None => PaasConnectionStatus { configured: !base_url.trim().is_empty(), authenticated: false, base_url, workspace_id: None, user_id: None, message: "No PaaS session is stored locally.".to_string() },
    }
}

pub fn create_session(request: PaasLoginRequest) -> PaasSession {
    let now = chrono::Utc::now().timestamp();
    let token_hint = token_hint(&request.access_token);
    PaasSession { id: Uuid::new_v4().to_string(), base_url: request.base_url.trim_end_matches('/').to_string(), workspace_id: request.workspace_id, user_id: request.user_id, access_token_hint: token_hint, created_at: now, expires_at: None }
}

pub fn save_session(app_data_dir: &Path, request: PaasLoginRequest) -> anyhow::Result<PaasSession> {
    std::fs::create_dir_all(app_data_dir)?;
    let access_token = request.access_token.clone();
    let session = create_session(request);
    let stored = StoredPaasSession { session: session.clone(), access_token };
    let content = serde_json::to_string_pretty(&stored)?;
    write_private_file(&session_file(app_data_dir), &content)?;
    Ok(session)
}

pub fn load_session(app_data_dir: &Path) -> anyhow::Result<Option<PaasSession>> {
    Ok(load_stored_session(app_data_dir)?.map(|stored| stored.session))
}

pub fn clear_session(app_data_dir: &Path) -> anyhow::Result<()> {
    let path = session_file(app_data_dir);
    if path.exists() { std::fs::remove_file(path)?; }
    Ok(())
}

pub fn execute_device_registration(app_data_dir: &Path, settings: &AgentBuddySettings) -> anyhow::Result<PaasHttpResult> {
    let stored = require_stored_session(app_data_dir)?;
    let info = connection_info(settings);
    let request = device_registration_request(settings);
    post_json(&info.endpoints.device_register, &stored.access_token, &request)
}

pub fn execute_bundle_pull(app_data_dir: &Path, settings: &AgentBuddySettings, runtime_targets: Vec<String>) -> anyhow::Result<PaasHttpResult> {
    let stored = require_stored_session(app_data_dir)?;
    let mut request = bundle_pull_request(settings, runtime_targets);
    request.user_id = Some(stored.session.user_id.clone());
    let info = connection_info(settings);
    post_json(&info.endpoints.agent_bundles, &stored.access_token, &request)
}

pub fn execute_sync_push(app_data_dir: &Path, settings: &AgentBuddySettings, events: Vec<SyncOutboxEvent>) -> anyhow::Result<PaasHttpResult> {
    let stored = require_stored_session(app_data_dir)?;
    let info = connection_info(settings);
    let request = PaasSyncPushRequest { device_id: settings.device_id.clone(), workspace_id: stored.session.workspace_id.clone(), events };
    post_json(&info.endpoints.sync_outbox, &stored.access_token, &request)
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

pub fn default_runtime_targets() -> Vec<RuntimeKind> { RuntimeKind::all() }

fn post_json<T: Serialize>(endpoint: &str, access_token: &str, body: &T) -> anyhow::Result<PaasHttpResult> {
    let sent_at = chrono::Utc::now().timestamp();
    let body_string = serde_json::to_string(body)?;
    if endpoint.trim().is_empty() {
        return Ok(PaasHttpResult { endpoint: endpoint.to_string(), method: "POST".to_string(), ok: false, status_code: None, sent_at, request_body_preview: truncate_chars(&body_string, 2_000), response_preview: String::new(), response_body: String::new(), error: Some("PaaS endpoint is empty".to_string()) });
    }
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(HTTP_TIMEOUT_SECONDS))
        .timeout_read(Duration::from_secs(HTTP_TIMEOUT_SECONDS))
        .timeout_write(Duration::from_secs(HTTP_TIMEOUT_SECONDS))
        .build();
    let response = agent
        .post(endpoint)
        .set("Authorization", &format!("Bearer {access_token}"))
        .set("Content-Type", "application/json")
        .send_string(&body_string);
    match response {
        Ok(response) => {
            let status = response.status();
            let text = response.into_string().unwrap_or_default();
            Ok(PaasHttpResult { endpoint: endpoint.to_string(), method: "POST".to_string(), ok: (200..300).contains(&status), status_code: Some(status), sent_at, request_body_preview: truncate_chars(&body_string, 2_000), response_preview: truncate_chars(&text, 2_000), response_body: text, error: None })
        }
        Err(ureq::Error::Status(status, response)) => {
            let text = response.into_string().unwrap_or_default();
            Ok(PaasHttpResult { endpoint: endpoint.to_string(), method: "POST".to_string(), ok: false, status_code: Some(status), sent_at, request_body_preview: truncate_chars(&body_string, 2_000), response_preview: truncate_chars(&text, 2_000), response_body: text, error: Some(format!("HTTP status {status}")) })
        }
        Err(ureq::Error::Transport(error)) => Ok(PaasHttpResult { endpoint: endpoint.to_string(), method: "POST".to_string(), ok: false, status_code: None, sent_at, request_body_preview: truncate_chars(&body_string, 2_000), response_preview: error.to_string(), response_body: String::new(), error: Some(error.to_string()) }),
    }
}

fn load_stored_session(app_data_dir: &Path) -> anyhow::Result<Option<StoredPaasSession>> {
    let path = session_file(app_data_dir);
    if !path.exists() { return Ok(None); }
    let content = std::fs::read_to_string(path)?;
    Ok(Some(serde_json::from_str(&content)?))
}

fn require_stored_session(app_data_dir: &Path) -> anyhow::Result<StoredPaasSession> {
    load_stored_session(app_data_dir)?.ok_or_else(|| anyhow::anyhow!("No PaaS session is stored locally"))
}

fn session_file(app_data_dir: &Path) -> PathBuf { app_data_dir.join(PAAS_SESSION_FILE) }

fn write_private_file(path: &Path, content: &str) -> anyhow::Result<()> {
    std::fs::write(path, content)?;
    restrict_file_permissions(path)?;
    Ok(())
}

#[cfg(unix)]
fn restrict_file_permissions(path: &Path) -> anyhow::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    let permissions = std::fs::Permissions::from_mode(0o600);
    std::fs::set_permissions(path, permissions)?;
    Ok(())
}

#[cfg(not(unix))]
fn restrict_file_permissions(_path: &Path) -> anyhow::Result<()> { Ok(()) }

fn token_hint(access_token: &str) -> String {
    let chars = access_token.chars().collect::<Vec<_>>();
    if chars.len() <= 8 {
        "***".to_string()
    } else {
        let prefix = chars.iter().take(4).collect::<String>();
        let suffix = chars.iter().rev().take(4).collect::<Vec<_>>().into_iter().rev().collect::<String>();
        format!("{prefix}…{suffix}")
    }
}

fn truncate_chars(value: &str, limit: usize) -> String {
    let mut chars = value.chars();
    let preview = chars.by_ref().take(limit).collect::<String>();
    if chars.next().is_some() { format!("{preview}…") } else { preview }
}
