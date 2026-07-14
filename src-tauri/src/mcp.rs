use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    pub description: String,
    pub transport: McpTransport,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub url: Option<String>,
    pub required: bool,
    pub enabled: bool,
    pub managed_by: String,
    pub policy: McpPolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum McpTransport {
    Stdio,
    Http,
    Sse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpPolicy {
    pub file_system: String,
    pub network: String,
    pub shell: String,
    pub audit: bool,
    pub approval_required: bool,
}

pub fn default_buddy_mcp_servers() -> Vec<McpServerConfig> {
    vec![
        McpServerConfig {
            id: "buddy-memory".to_string(),
            name: "Agent Buddy Memory".to_string(),
            description: "Shared local memory provider for supported runtimes.".to_string(),
            transport: McpTransport::Http,
            command: None,
            args: Vec::new(),
            url: Some("http://127.0.0.1:17888/mcp/memory".to_string()),
            required: false,
            enabled: true,
            managed_by: "agent-buddy".to_string(),
            policy: strict_policy(true),
        },
        McpServerConfig {
            id: "buddy-knowledge".to_string(),
            name: "Agent Buddy Knowledge".to_string(),
            description: "Local knowledge mirror and retrieval provider.".to_string(),
            transport: McpTransport::Http,
            command: None,
            args: Vec::new(),
            url: Some("http://127.0.0.1:17888/mcp/knowledge".to_string()),
            required: false,
            enabled: true,
            managed_by: "agent-buddy".to_string(),
            policy: strict_policy(false),
        },
        McpServerConfig {
            id: "buddy-session".to_string(),
            name: "Agent Buddy Session".to_string(),
            description: "Session event capture, summarization, and handoff provider.".to_string(),
            transport: McpTransport::Http,
            command: None,
            args: Vec::new(),
            url: Some("http://127.0.0.1:17888/mcp/session".to_string()),
            required: false,
            enabled: true,
            managed_by: "agent-buddy".to_string(),
            policy: strict_policy(false),
        },
        McpServerConfig {
            id: "buddy-approval".to_string(),
            name: "Agent Buddy Approval".to_string(),
            description: "Sensitive action approval and audit provider.".to_string(),
            transport: McpTransport::Http,
            command: None,
            args: Vec::new(),
            url: Some("http://127.0.0.1:17888/mcp/approval".to_string()),
            required: false,
            enabled: true,
            managed_by: "agent-buddy".to_string(),
            policy: strict_policy(true),
        },
    ]
}

fn strict_policy(approval_required: bool) -> McpPolicy {
    McpPolicy {
        file_system: "deny_by_default".to_string(),
        network: "local_only".to_string(),
        shell: "deny".to_string(),
        audit: true,
        approval_required,
    }
}
