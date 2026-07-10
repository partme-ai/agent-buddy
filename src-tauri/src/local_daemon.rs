use crate::local_api::LocalApiSpec;
use crate::mcp::McpServerConfig;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDaemonStatus {
    pub enabled: bool,
    pub state: String,
    pub base_url: String,
    pub route_count: usize,
    pub mcp_server_count: usize,
    pub pid: Option<u32>,
    pub started_at: Option<i64>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDaemonControlResult {
    pub status: LocalDaemonStatus,
    pub message: String,
}

pub fn status(api: LocalApiSpec, servers: Vec<McpServerConfig>) -> LocalDaemonStatus {
    LocalDaemonStatus {
        enabled: false,
        state: "stopped".to_string(),
        base_url: api.base_url,
        route_count: api.routes.len(),
        mcp_server_count: servers.into_iter().filter(|server| server.enabled).count(),
        pid: None,
        started_at: None,
        warnings: vec!["Local daemon runtime is declared but not started in this build.".to_string()],
    }
}

pub fn start_preview(api: LocalApiSpec, servers: Vec<McpServerConfig>) -> LocalDaemonControlResult {
    let mut next = status(api, servers);
    next.enabled = true;
    next.state = "planned".to_string();
    next.started_at = Some(chrono::Utc::now().timestamp());
    next.warnings.push("Start is currently a safe preview; HTTP/MCP listeners will be wired during validation phase.".to_string());
    LocalDaemonControlResult { status: next, message: "Local daemon start preview created.".to_string() }
}

pub fn stop_preview(api: LocalApiSpec, servers: Vec<McpServerConfig>) -> LocalDaemonControlResult {
    LocalDaemonControlResult { status: status(api, servers), message: "Local daemon stop preview created.".to_string() }
}
