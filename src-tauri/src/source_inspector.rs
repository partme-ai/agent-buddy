use crate::adapters::{self, GeneratedFile};
use crate::bundle::{self, AgentBundle};
use crate::bundle_diff::{self, AgentBundleDiff};
use crate::domain::{AgentSourceSummary, LocalAgent, LocalAgentSummary, SourceImportRequest};
use crate::risk::{scan_text, RiskScanReport};
use crate::runtime::{InstallTarget, RuntimeKind};
use crate::source;
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSourceDetail {
    pub source: AgentSourceSummary,
    pub agents: Vec<LocalAgentSummary>,
    pub categories: Vec<String>,
    pub license_notice: SourceLicenseNotice,
    pub risk_report: RiskScanReport,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceLicenseNotice {
    pub source_id: String,
    pub license_file: Option<String>,
    pub license_text_preview: Option<String>,
    pub notice_required: bool,
    pub notice_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentMarkdownPreview {
    pub agent_id: String,
    pub source_id: String,
    pub source_name: String,
    pub slug: String,
    pub name: String,
    pub category: String,
    pub source_path: String,
    pub raw_markdown: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRuntimeConversionPreview {
    pub agent_id: String,
    pub runtime: RuntimeKind,
    pub files: Vec<GeneratedFile>,
    pub risk_report: RiskScanReport,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceImportRiskPreview {
    pub request: SourceImportRequest,
    pub source_kind: String,
    pub risk_report: RiskScanReport,
    pub warnings: Vec<String>,
    pub notice: String,
}

pub fn source_detail(app_data_dir: &Path, source_id: &str) -> anyhow::Result<AgentSourceDetail> {
    let source = source::list_sources(app_data_dir)?.into_iter().find(|item| item.id == source_id).ok_or_else(|| anyhow::anyhow!("source not found: {source_id}"))?;
    let full_agents = source::list_agents_for_source(app_data_dir, source_id)?;
    let agents = full_agents.iter().map(LocalAgentSummary::from).collect::<Vec<_>>();
    let categories = full_agents.iter().map(|agent| agent.category.clone()).collect::<BTreeSet<_>>().into_iter().collect::<Vec<_>>();
    let license_notice = license_notice(&source);
    let risk_report = scan_source_agents(&full_agents);
    let mut warnings = Vec::new();
    if full_agents.is_empty() { warnings.push("No Markdown agents with frontmatter were found in this source.".to_string()); }
    if license_notice.notice_required { warnings.push("Preserve upstream license and attribution before redistributing imported agents.".to_string()); }
    Ok(AgentSourceDetail { source, agents, categories, license_notice, risk_report, warnings })
}

pub fn markdown_preview(app_data_dir: &Path, agent_id: &str) -> anyhow::Result<AgentMarkdownPreview> {
    let agent = find_agent(app_data_dir, agent_id)?;
    Ok(AgentMarkdownPreview { agent_id: agent.id, source_id: agent.source_id, source_name: agent.source_name, slug: agent.slug, name: agent.name, category: agent.category, source_path: agent.source_path, raw_markdown: agent.raw_markdown })
}

pub fn runtime_conversion_preview(app_data_dir: &Path, agent_id: &str, runtime: RuntimeKind) -> anyhow::Result<AgentRuntimeConversionPreview> {
    let agent = find_agent(app_data_dir, agent_id)?;
    let target = InstallTarget { runtime, project_dir: Some("/preview/project".to_string()), custom_dir: Some("/preview/custom".to_string()), category_filters: Vec::new() };
    let files = adapters::generate_files(&[agent.clone()], &target);
    let risk_report = scan_text(&files.iter().map(|file| file.content.as_str()).collect::<Vec<_>>().join("\n\n---\n\n"));
    let mut warnings = Vec::new();
    if files.is_empty() { warnings.push("No files were generated for this agent/runtime combination. This runtime may use aggregate generation or require a selected category.".to_string()); }
    if matches!(runtime, RuntimeKind::Aider | RuntimeKind::Windsurf | RuntimeKind::GeminiCli) { warnings.push("This runtime may generate aggregate or extension-level files when multiple agents are selected.".to_string()); }
    Ok(AgentRuntimeConversionPreview { agent_id: agent_id.to_string(), runtime, files, risk_report, warnings })
}

pub fn source_bundle_diff(app_data_dir: &Path, old_agent_id: &str, new_agent_id: &str) -> anyhow::Result<AgentBundleDiff> {
    let old_agent = find_agent(app_data_dir, old_agent_id)?;
    let new_agent = find_agent(app_data_dir, new_agent_id)?;
    let targets = RuntimeKind::all();
    let old_bundle = bundle::bundle_from_local_agent(&old_agent, targets.clone());
    let new_bundle = bundle::bundle_from_local_agent(&new_agent, targets);
    Ok(bundle_diff::diff_bundles(&old_bundle, &new_bundle))
}

pub fn build_local_bundle(app_data_dir: &Path, agent_id: &str) -> anyhow::Result<AgentBundle> {
    let agent = find_agent(app_data_dir, agent_id)?;
    Ok(bundle::bundle_from_local_agent(&agent, RuntimeKind::all()))
}

pub fn source_import_risk_preview(request: SourceImportRequest) -> SourceImportRiskPreview {
    let url = request.source_url.trim().to_string();
    let source_kind = if url.starts_with("http://") || url.starts_with("https://") || url.starts_with("git@") || url.ends_with(".git") { "git".to_string() } else { "local".to_string() };
    let mut warnings = Vec::new();
    let mut scan_content = format!("sourceUrl: {}\nname: {:?}\nbranch: {:?}\n", request.source_url, request.name, request.branch);
    if source_kind == "local" {
        let path = PathBuf::from(&url);
        if path.exists() && path.is_dir() {
            let sampled = sample_local_markdown(&path, 16);
            if sampled.is_empty() { warnings.push("Local source exists, but no Markdown files were sampled for risk scan.".to_string()); }
            scan_content.push_str(&sampled);
        } else {
            warnings.push("Local source path does not exist yet; risk scan can only inspect the entered path text.".to_string());
        }
    } else {
        warnings.push("Remote Git sources are scanned after import/clone; this preview only checks URL and branch metadata.".to_string());
    }
    SourceImportRiskPreview { request, source_kind, risk_report: scan_text(&scan_content), warnings, notice: "Importing a source only brings agents into Agent Buddy management. Installing to local runtimes is a separate confirmation step.".to_string() }
}

fn find_agent(app_data_dir: &Path, agent_id: &str) -> anyhow::Result<LocalAgent> {
    source::list_agents(app_data_dir)?.into_iter().find(|agent| agent.id == agent_id).ok_or_else(|| anyhow::anyhow!("agent not found: {agent_id}"))
}

fn scan_source_agents(agents: &[LocalAgent]) -> RiskScanReport {
    scan_text(&agents.iter().map(|agent| agent.raw_markdown.as_str()).collect::<Vec<_>>().join("\n\n---\n\n"))
}

fn license_notice(source: &AgentSourceSummary) -> SourceLicenseNotice {
    let root = PathBuf::from(&source.local_path);
    let license_file = ["LICENSE", "LICENSE.md", "COPYING", "NOTICE", "NOTICE.md"].iter().find_map(|name| {
        let path = root.join(name);
        path.exists().then(|| path.display().to_string())
    });
    let license_text_preview = license_file.as_ref().and_then(|file| fs::read_to_string(file).ok()).map(|content| content.chars().take(4000).collect::<String>());
    SourceLicenseNotice {
        source_id: source.id.clone(),
        license_file,
        license_text_preview,
        notice_required: source.source_kind != "local" || source.license.is_some(),
        notice_text: format!("Source '{}' was imported from '{}'. Preserve upstream license and notice files when redistributing or repackaging its agents.", source.name, source.source_url),
    }
}

fn sample_local_markdown(path: &Path, max_files: usize) -> String {
    let mut content = String::new();
    for entry in walkdir::WalkDir::new(path).into_iter().flatten().filter(|entry| entry.path().is_file()).take(max_files) {
        if entry.path().extension().and_then(|value| value.to_str()) == Some("md") {
            if let Ok(raw) = fs::read_to_string(entry.path()) {
                content.push_str(&raw.chars().take(8000).collect::<String>());
                content.push_str("\n\n---\n\n");
            }
        }
    }
    content
}
