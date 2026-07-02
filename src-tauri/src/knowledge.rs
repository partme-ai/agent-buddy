use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeSpace {
    pub id: String,
    pub name: String,
    pub description: String,
    pub source: String,
    pub sync_mode: String,
    pub document_count: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeSnapshot {
    pub id: String,
    pub space_id: String,
    pub version: String,
    pub manifest_path: String,
    pub status: String,
    pub created_at: i64,
}

pub fn default_local_spaces() -> Vec<KnowledgeSpace> {
    let now = chrono::Utc::now().timestamp();
    vec![
        KnowledgeSpace {
            id: "agency-agents-zh".to_string(),
            name: "agency-agents-zh Agent Definitions".to_string(),
            description: "Local metadata mirror for agency-agents-zh source agents.".to_string(),
            source: "github".to_string(),
            sync_mode: "git-clone".to_string(),
            document_count: 0,
            created_at: now,
            updated_at: now,
        },
        KnowledgeSpace {
            id: "buddy-docs".to_string(),
            name: "Agent Buddy Docs".to_string(),
            description: "Local Agent Buddy product and implementation documents.".to_string(),
            source: "local".to_string(),
            sync_mode: "local-file".to_string(),
            document_count: 0,
            created_at: now,
            updated_at: now,
        },
    ]
}

pub fn new_snapshot(space_id: String, version: String, manifest_path: String) -> KnowledgeSnapshot {
    KnowledgeSnapshot {
        id: Uuid::new_v4().to_string(),
        space_id,
        version,
        manifest_path,
        status: "ready".to_string(),
        created_at: chrono::Utc::now().timestamp(),
    }
}
