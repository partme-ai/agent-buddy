use crate::mcp::McpServerConfig;
use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpConfigPlan {
    pub runtime: RuntimeKind,
    pub project_dir: Option<String>,
    pub config_files: Vec<McpConfigFile>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpConfigFile {
    pub path: String,
    pub format: String,
    pub content: String,
    pub merge_strategy: String,
}

pub fn build_mcp_config_plan(
    runtime: RuntimeKind,
    servers: &[McpServerConfig],
    project_dir: Option<&str>,
) -> McpConfigPlan {
    let enabled: Vec<_> = servers.iter().filter(|server| server.enabled).cloned().collect();
    let mut warnings = Vec::new();
    let files = match runtime {
        RuntimeKind::ClaudeCode => vec![json_file(default_or_project(project_dir, ".mcp.json"), render_claude_mcp_json(&enabled))],
        RuntimeKind::Codex => vec![toml_file(project_path(project_dir, ".codex/config.toml"), render_codex_toml(&enabled))],
        RuntimeKind::OpenCode => vec![json_file(project_path(project_dir, ".opencode/mcp.json"), render_opencode_json(&enabled))],
        RuntimeKind::Hermes => vec![json_file(default_or_project(project_dir, ".hermes/mcp.json"), render_hermes_json(&enabled))],
        RuntimeKind::WorkBuddy => vec![json_file(default_or_project(project_dir, ".workbuddy/connectors/buddy-mcp.json"), render_workbuddy_json(&enabled))],
        RuntimeKind::OpenClaw => vec![json_file(default_or_project(project_dir, ".openclaw/mcp.json"), render_openclaw_json(&enabled))],
        _ => {
            warnings.push("Runtime does not have a first-class MCP config writer yet; use generated connector documentation.".to_string());
            vec![json_file(default_or_project(project_dir, ".agent-buddy/mcp.json"), render_generic_json(&enabled))]
        }
    };
    if project_dir.is_none() && requires_project_dir(runtime) {
        warnings.push("Project directory is recommended for this runtime's MCP configuration.".to_string());
    }
    McpConfigPlan { runtime, project_dir: project_dir.map(str::to_string), config_files: files, warnings }
}

fn json_file(path: String, content: String) -> McpConfigFile {
    McpConfigFile { path, format: "json".to_string(), content, merge_strategy: "merge-buddy-managed-servers".to_string() }
}

fn toml_file(path: String, content: String) -> McpConfigFile {
    McpConfigFile { path, format: "toml".to_string(), content, merge_strategy: "merge-buddy-managed-servers".to_string() }
}

fn default_or_project(project_dir: Option<&str>, relative: &str) -> String {
    project_dir.map(|dir| Path::new(dir).join(relative).display().to_string()).unwrap_or_else(|| relative.to_string())
}

fn project_path(project_dir: Option<&str>, relative: &str) -> String {
    project_dir.map(|dir| Path::new(dir).join(relative).display().to_string()).unwrap_or_else(|| relative.to_string())
}

fn requires_project_dir(runtime: RuntimeKind) -> bool {
    matches!(runtime, RuntimeKind::Codex | RuntimeKind::OpenCode | RuntimeKind::Cursor | RuntimeKind::Trae | RuntimeKind::Qwen | RuntimeKind::Qoder)
}

fn render_claude_mcp_json(servers: &[McpServerConfig]) -> String {
    let mut map = serde_json::Map::new();
    for server in servers {
        map.insert(server.id.clone(), server_json(server));
    }
    serde_json::to_string_pretty(&serde_json::json!({ "mcpServers": map })).unwrap_or_default()
}

fn render_codex_toml(servers: &[McpServerConfig]) -> String {
    let mut content = String::from("# BEGIN AGENT BUDDY MCP SERVERS\n");
    for server in servers {
        content.push_str(&format!("[mcp_servers.{}]\n", server.id));
        if let Some(command) = &server.command {
            content.push_str(&format!("command = \"{}\"\n", escape(command)));
        }
        if !server.args.is_empty() {
            content.push_str("args = [");
            content.push_str(&server.args.iter().map(|arg| format!("\"{}\"", escape(arg))).collect::<Vec<_>>().join(", "));
            content.push_str("]\n");
        }
        if let Some(url) = &server.url {
            content.push_str(&format!("url = \"{}\"\n", escape(url)));
        }
        content.push('\n');
    }
    content.push_str("# END AGENT BUDDY MCP SERVERS\n");
    content
}

fn render_opencode_json(servers: &[McpServerConfig]) -> String { render_named_servers(servers, "mcp") }
fn render_hermes_json(servers: &[McpServerConfig]) -> String { render_named_servers(servers, "servers") }
fn render_workbuddy_json(servers: &[McpServerConfig]) -> String { render_named_servers(servers, "connectors") }
fn render_openclaw_json(servers: &[McpServerConfig]) -> String { render_named_servers(servers, "mcpServers") }
fn render_generic_json(servers: &[McpServerConfig]) -> String { render_named_servers(servers, "mcpServers") }

fn render_named_servers(servers: &[McpServerConfig], key: &str) -> String {
    let values = servers.iter().map(server_json).collect::<Vec<_>>();
    serde_json::to_string_pretty(&serde_json::json!({ key: values })).unwrap_or_default()
}

fn server_json(server: &McpServerConfig) -> serde_json::Value {
    serde_json::json!({
        "id": server.id,
        "name": server.name,
        "transport": server.transport,
        "command": server.command,
        "args": server.args,
        "url": server.url,
        "managedBy": server.managed_by,
        "policy": server.policy,
    })
}

fn escape(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}
