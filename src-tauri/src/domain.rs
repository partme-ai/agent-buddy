use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalAgent {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub source_path: String,
    pub body: String,
    pub raw_markdown: String,
    #[serde(default)]
    pub frontmatter: BTreeMap<String, String>,
}

impl LocalAgent {
    pub fn frontmatter_field(&self, key: &str) -> Option<String> {
        self.frontmatter.get(key).cloned()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalAgentSummary {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub source_path: String,
}

impl From<&LocalAgent> for LocalAgentSummary {
    fn from(agent: &LocalAgent) -> Self {
        Self {
            id: agent.id.clone(),
            slug: agent.slug.clone(),
            name: agent.name.clone(),
            description: agent.description.clone(),
            category: agent.category.clone(),
            source_path: agent.source_path.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceRefreshResult {
    pub source_id: String,
    pub local_path: String,
    pub commit_sha: Option<String>,
    pub message: String,
}
