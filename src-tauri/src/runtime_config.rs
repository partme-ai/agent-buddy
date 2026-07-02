use crate::mcp::McpServerConfig;
use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeConfigPreview {
    pub runtime: RuntimeKind,
    pub files: Vec<RuntimeConfigFile>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeConfigFile {
    pub relative_path: String,
    pub content: String,
    pub merge_strategy: String,
}

pub fn mcp_config_preview(runtime: RuntimeKind, servers: &[McpServerConfig]) -> RuntimeConfigPreview {
    match runtime {
        RuntimeKind::ClaudeCode => json_config(runtime, ".mcp.json", servers),
        RuntimeKind::Codex => codex_toml_config(servers),
        RuntimeKind::OpenCode => json_config(runtime, "opencode.json", servers),
        RuntimeKind::Hermes => yaml_like_config(runtime, "hermes.mcp.yaml", servers),
        RuntimeKind::GeminiCli | RuntimeKind::Antigravity => json_config(runtime, "gemini-extension.json", servers),
        RuntimeKind::WorkBuddy => json_config(runtime, "workbuddy-connectors.json", servers),
        RuntimeKind::OpenClaw => json_config(runtime, "openclaw-buddy.json", servers),
        _ => RuntimeConfigPreview {
            runtime,
            files: Vec::new(),
            warnings: vec!["This runtime does not have a known MCP configuration format yet; use Buddy local HTTP API or manual MCP setup.".to_string()],
        },
    }
}

fn json_config(runtime: RuntimeKind, relative_path: &str, servers: &[McpServerConfig]) -> RuntimeConfigPreview {
    let value = serde_json::json!({
        "managedBy": "agent-buddy",
        "runtime": format!("{:?}", runtime),
        "mcpServers": servers.iter().filter(|server| server.enabled).map(|server| {
            serde_json::json!({
                "id": server.id,
                "name": server.name,
                "transport": server.transport,
                "url": server.url,
                "command": server.command,
                "args": server.args,
                "policy": server.policy,
            })
        }).collect::<Vec<_>>()
    });
    RuntimeConfigPreview {
        runtime,
        files: vec![RuntimeConfigFile { relative_path: relative_path.to_string(), content: serde_json::to_string_pretty(&value).unwrap_or_else(|_| "{}".to_string()), merge_strategy: "merge-agent-buddy-managed-mcp-section".to_string() }],
        warnings: Vec::new(),
    }
}

fn codex_toml_config(servers: &[McpServerConfig]) -> RuntimeConfigPreview {
    let mut content = String::new();
    content.push_str("# Agent Buddy managed MCP servers\n");
    for server in servers.iter().filter(|server| server.enabled) {
        content.push_str(&format!("\n[mcp_servers.{}]\n", sanitize_toml_key(&server.id)));
        match &server.url {
            Some(url) => {
                content.push_str(&format!("url = \"{}\"\n", escape_toml(url)));
            }
            None => {
                if let Some(command) = &server.command {
                    content.push_str(&format!("command = \"{}\"\n", escape_toml(command)));
                }
                content.push_str(&format!("args = [{}]\n", server.args.iter().map(|arg| format!("\"{}\"", escape_toml(arg))).collect::<Vec<_>>().join(", ")));
            }
        }
    }
    RuntimeConfigPreview { runtime: RuntimeKind::Codex, files: vec![RuntimeConfigFile { relative_path: ".codex/config.toml".to_string(), content, merge_strategy: "merge-agent-buddy-mcp-servers".to_string() }], warnings: Vec::new() }
}

fn yaml_like_config(runtime: RuntimeKind, relative_path: &str, servers: &[McpServerConfig]) -> RuntimeConfigPreview {
    let mut content = String::new();
    content.push_str("managedBy: agent-buddy\nmcpServers:\n");
    for server in servers.iter().filter(|server| server.enabled) {
        content.push_str(&format!("  - id: {}\n", server.id));
        content.push_str(&format!("    name: {}\n", server.name));
        content.push_str(&format!("    transport: {:?}\n", server.transport));
        if let Some(url) = &server.url {
            content.push_str(&format!("    url: {}\n", url));
        }
    }
    RuntimeConfigPreview { runtime, files: vec![RuntimeConfigFile { relative_path: relative_path.to_string(), content, merge_strategy: "merge-agent-buddy-managed-yaml-section".to_string() }], warnings: Vec::new() }
}

fn sanitize_toml_key(value: &str) -> String {
    value.chars().map(|ch| if ch.is_alphanumeric() || ch == '_' { ch } else { '_' }).collect()
}

fn escape_toml(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}
