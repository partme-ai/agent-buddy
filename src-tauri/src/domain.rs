use serde::{Deserialize, Serialize};

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
