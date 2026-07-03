use crate::bundle::{self, AgentBundle};
use crate::domain::LocalAgent;
use crate::paas::{self, PaasBundleSummary};
use crate::runtime::RuntimeKind;
use crate::source;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleCatalogItem {
    pub origin: BundleOrigin,
    pub bundle_id: String,
    pub version: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub source_id: String,
    pub source_name: String,
    pub target_count: usize,
    pub skill_count: usize,
    pub mcp_count: usize,
    pub knowledge_space_count: usize,
    pub memory_provider: String,
    pub local_agent_id: Option<String>,
    pub installable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BundleOrigin { AgentPaas, LocalSource }

pub fn list_bundle_catalog(app_data_dir: &Path) -> anyhow::Result<Vec<BundleCatalogItem>> {
    let local_agents = source::list_agents(app_data_dir)?;
    let mut items = local_agents.iter().map(local_agent_item).collect::<Vec<_>>();
    items.sort_by(|a, b| a.source_name.cmp(&b.source_name).then_with(|| a.category.cmp(&b.category)).then_with(|| a.name.cmp(&b.name)));
    Ok(items)
}

pub fn local_agent_item(agent: &LocalAgent) -> BundleCatalogItem {
    let bundle = bundle::bundle_from_local_agent(agent, RuntimeKind::all());
    let summary = paas::summarize_bundle(&bundle);
    from_summary(BundleOrigin::LocalSource, summary, agent.source_id.clone(), agent.source_name.clone(), Some(agent.id.clone()), true)
}

pub fn paas_item(bundle: &AgentBundle) -> BundleCatalogItem {
    let summary = paas::summarize_bundle(bundle);
    from_summary(BundleOrigin::AgentPaas, summary, bundle.source.source_id.clone(), bundle.source.source_id.clone(), None, true)
}

fn from_summary(origin: BundleOrigin, summary: PaasBundleSummary, source_id: String, source_name: String, local_agent_id: Option<String>, installable: bool) -> BundleCatalogItem {
    BundleCatalogItem { origin, bundle_id: summary.bundle_id, version: summary.version, name: summary.name, description: summary.description, category: summary.category, source_id, source_name, target_count: summary.target_count, skill_count: summary.skill_count, mcp_count: summary.mcp_count, knowledge_space_count: summary.knowledge_space_count, memory_provider: summary.memory_provider, local_agent_id, installable }
}
