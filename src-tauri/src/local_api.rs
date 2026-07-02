use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalApiSpec {
    pub bind_host: String,
    pub bind_port: u16,
    pub base_url: String,
    pub routes: Vec<LocalApiRoute>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalApiRoute {
    pub method: String,
    pub path: String,
    pub purpose: String,
    pub auth_required: bool,
    pub audit: bool,
}

pub fn default_local_api_spec() -> LocalApiSpec {
    let bind_host = "127.0.0.1".to_string();
    let bind_port = 17888;
    let base_url = format!("http://{bind_host}:{bind_port}");
    LocalApiSpec {
        bind_host,
        bind_port,
        base_url,
        routes: vec![
            route("GET", "/health", "Agent Buddy local health check", false, false),
            route("GET", "/api/runtimes", "List runtime detections", true, true),
            route("GET", "/api/agents", "List local agent catalog", true, true),
            route("GET", "/api/installations", "List installed agents", true, true),
            route("POST", "/api/install", "Execute agent install plan", true, true),
            route("POST", "/mcp/memory", "MCP endpoint for Buddy Memory", true, true),
            route("POST", "/mcp/knowledge", "MCP endpoint for Buddy Knowledge", true, true),
            route("POST", "/mcp/session", "MCP endpoint for Buddy Session", true, true),
            route("POST", "/mcp/approval", "MCP endpoint for Buddy Approval", true, true),
            route("POST", "/api/sync/outbox/flush", "Flush pending sync outbox to Agent PaaS", true, true),
        ],
    }
}

fn route(method: &str, path: &str, purpose: &str, auth_required: bool, audit: bool) -> LocalApiRoute {
    LocalApiRoute { method: method.to_string(), path: path.to_string(), purpose: purpose.to_string(), auth_required, audit }
}
