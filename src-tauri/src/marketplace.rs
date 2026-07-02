use crate::mcp::McpServerConfig;
use crate::runtime::RuntimeKind;
use crate::skill::{SkillPackage, SkillSyncMode};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceSource {
    pub id: String,
    pub label: String,
    pub kind: MarketplaceKind,
    pub base_url: Option<String>,
    pub description: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MarketplaceKind {
    SkillHub,
    SkillsSh,
    Github,
    PublicMcp,
    Local,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillInstallRequest {
    pub source_id: String,
    pub package_ref: String,
    pub runtime_targets: Vec<RuntimeKind>,
    pub project_dir: Option<String>,
    pub sync_mode: SkillSyncMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillInstallPlan {
    pub request: SkillInstallRequest,
    pub package: SkillPackage,
    pub target_files: Vec<MarketplaceTargetFile>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpInstallRequest {
    pub source_id: String,
    pub server_ref: String,
    pub runtime_targets: Vec<RuntimeKind>,
    pub project_dir: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpInstallPlan {
    pub request: McpInstallRequest,
    pub server: McpServerConfig,
    pub target_files: Vec<MarketplaceTargetFile>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceTargetFile {
    pub runtime: RuntimeKind,
    pub path: String,
    pub install_strategy: String,
    pub content_preview: String,
}

pub fn default_marketplace_sources() -> Vec<MarketplaceSource> {
    vec![
        MarketplaceSource { id: "skillhub".to_string(), label: "SkillHub".to_string(), kind: MarketplaceKind::SkillHub, base_url: Some("https://skillhub.example.com".to_string()), description: "Enterprise or public skill packages.".to_string(), enabled: true },
        MarketplaceSource { id: "skills-sh".to_string(), label: "Skills.sh".to_string(), kind: MarketplaceKind::SkillsSh, base_url: Some("https://www.skills.sh".to_string()), description: "skills.sh compatible skill registry and install command flow.".to_string(), enabled: true },
        MarketplaceSource { id: "github".to_string(), label: "GitHub".to_string(), kind: MarketplaceKind::Github, base_url: Some("https://github.com".to_string()), description: "GitHub repository based skill packages.".to_string(), enabled: true },
        MarketplaceSource { id: "public-mcp".to_string(), label: "Public MCP Registry".to_string(), kind: MarketplaceKind::PublicMcp, base_url: None, description: "Public MCP server manifests.".to_string(), enabled: true },
        MarketplaceSource { id: "local".to_string(), label: "Local Directory".to_string(), kind: MarketplaceKind::Local, base_url: None, description: "Install skills or MCP definitions from local folders.".to_string(), enabled: true },
    ]
}

pub fn build_skill_install_plan(request: SkillInstallRequest, app_data_dir: &Path) -> SkillInstallPlan {
    let package_id = normalize_package_ref(&request.package_ref);
    let package = SkillPackage {
        id: package_id.clone(),
        name: package_id.clone(),
        description: format!("Skill package imported from {}", request.source_id),
        source: request.source_id.clone(),
        version: None,
        package_path: Some(app_data_dir.join("skills").join("packages").join(&package_id).display().to_string()),
        sync_mode: request.sync_mode,
        enabled_targets: request.runtime_targets.clone(),
    };
    let mut warnings = Vec::new();
    if request.runtime_targets.is_empty() {
        warnings.push("No runtime targets selected for skill installation.".to_string());
    }
    let target_files = request.runtime_targets.iter().map(|runtime| MarketplaceTargetFile {
        runtime: *runtime,
        path: skill_target_path(*runtime, &package_id, request.project_dir.as_deref()),
        install_strategy: format!("{:?}", request.sync_mode),
        content_preview: format!("# {}\n\nInstalled by Agent Buddy from {}.", package.name, package.source),
    }).collect();
    SkillInstallPlan { request, package, target_files, warnings }
}

pub fn build_mcp_install_plan(request: McpInstallRequest) -> McpInstallPlan {
    let server_id = normalize_package_ref(&request.server_ref);
    let server = McpServerConfig {
        id: server_id.clone(),
        name: server_id.clone(),
        description: format!("MCP server imported from {}", request.source_id),
        transport: crate::mcp::McpTransport::Http,
        command: None,
        args: Vec::new(),
        url: Some(format!("http://127.0.0.1:17888/mcp/proxy/{server_id}")),
        required: false,
        enabled: request.enabled,
        managed_by: "agent-buddy".to_string(),
        policy: crate::mcp::McpPolicy { file_system: "ask".to_string(), network: "ask".to_string(), shell: "deny".to_string(), audit: true, approval_required: true },
    };
    let mut warnings = Vec::new();
    if request.runtime_targets.is_empty() {
        warnings.push("No runtime targets selected for MCP installation.".to_string());
    }
    let target_files = request.runtime_targets.iter().map(|runtime| MarketplaceTargetFile {
        runtime: *runtime,
        path: mcp_target_path(*runtime, request.project_dir.as_deref()),
        install_strategy: "merge-runtime-mcp-config".to_string(),
        content_preview: serde_json::to_string_pretty(&server).unwrap_or_default(),
    }).collect();
    McpInstallPlan { request, server, target_files, warnings }
}

fn skill_target_path(runtime: RuntimeKind, package_id: &str, project_dir: Option<&str>) -> String {
    let rel = match runtime {
        RuntimeKind::ClaudeCode => format!(".claude/skills/{package_id}/SKILL.md"),
        RuntimeKind::Codex => format!(".agents/skills/{package_id}/SKILL.md"),
        RuntimeKind::OpenCode => format!(".opencode/skills/{package_id}/SKILL.md"),
        RuntimeKind::OpenClaw => format!(".openclaw/skills/{package_id}/SKILL.md"),
        RuntimeKind::Hermes => format!(".hermes/skills/{package_id}/SKILL.md"),
        RuntimeKind::WorkBuddy => format!(".workbuddy/skills/{package_id}/SKILL.md"),
        RuntimeKind::CodeWhale => format!(".codewhale/skills/{package_id}/SKILL.md"),
        RuntimeKind::DeerFlow => format!("skills/custom/{package_id}/SKILL.md"),
        _ => format!(".agent-buddy/skills/{package_id}/SKILL.md"),
    };
    project_dir.map(|dir| PathBuf::from(dir).join(&rel).display().to_string()).unwrap_or(rel)
}

fn mcp_target_path(runtime: RuntimeKind, project_dir: Option<&str>) -> String {
    let rel = match runtime {
        RuntimeKind::ClaudeCode => ".mcp.json",
        RuntimeKind::Codex => ".codex/config.toml",
        RuntimeKind::OpenCode => ".opencode/mcp.json",
        RuntimeKind::OpenClaw => ".openclaw/mcp.json",
        RuntimeKind::Hermes => ".hermes/mcp.json",
        RuntimeKind::WorkBuddy => ".workbuddy/connectors/buddy-mcp.json",
        _ => ".agent-buddy/mcp.json",
    };
    project_dir.map(|dir| PathBuf::from(dir).join(rel).display().to_string()).unwrap_or_else(|| rel.to_string())
}

fn normalize_package_ref(value: &str) -> String {
    value.trim().trim_matches('/').split('/').last().unwrap_or(value).replace([' ', ':', '@'], "-").to_lowercase()
}
