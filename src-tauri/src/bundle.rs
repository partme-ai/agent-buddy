use crate::domain::LocalAgent;
use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentBundle { pub bundle_id: String, pub version: String, pub profile: AgentProfile, pub instructions: AgentInstructions, pub knowledge: KnowledgePolicy, pub memory: MemoryPolicy, pub skills: Vec<SkillRef>, pub mcp_servers: Vec<McpServerRef>, pub permissions: PermissionPolicy, pub targets: Vec<RuntimeKind>, pub source: BundleSource, pub metadata: BTreeMap<String, String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentProfile { pub name: String, pub description: String, pub category: String, pub avatar: Option<String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInstructions { pub role: String, pub rules: Vec<String>, pub body: String, pub output_format: Option<String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgePolicy { pub spaces: Vec<String>, pub sync_mode: String, pub retrieval_required: bool }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryPolicy { pub provider: String, pub read_scopes: Vec<String>, pub write_policy: String }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillRef { pub id: String, pub source: String, pub version: Option<String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerRef { pub id: String, pub required: bool }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionPolicy { pub file_write: String, pub network: String, pub shell: String, pub external_publish: String }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleSource { pub source_id: String, pub source_path: String, pub upstream_license: Option<String> }

pub fn bundle_from_local_agent(agent: &LocalAgent, targets: Vec<RuntimeKind>) -> AgentBundle {
    AgentBundle {
        bundle_id: format!("{}.{}", agent.source_id, agent.slug),
        version: "0.1.0-local".to_string(),
        profile: AgentProfile { name: agent.name.clone(), description: agent.description.clone(), category: agent.category.clone(), avatar: None },
        instructions: AgentInstructions { role: agent.name.clone(), rules: Vec::new(), body: agent.body.clone(), output_format: None },
        knowledge: KnowledgePolicy { spaces: Vec::new(), sync_mode: "none".to_string(), retrieval_required: false },
        memory: MemoryPolicy { provider: "agent-buddy".to_string(), read_scopes: vec!["user".to_string(), "agent".to_string(), "project".to_string()], write_policy: "approval_required".to_string() },
        skills: vec![SkillRef { id: agent.slug.clone(), source: agent.source_id.clone(), version: None }],
        mcp_servers: default_buddy_mcp_refs(),
        permissions: PermissionPolicy { file_write: "ask".to_string(), network: "ask".to_string(), shell: "ask".to_string(), external_publish: "approval_required".to_string() },
        targets,
        source: BundleSource { source_id: agent.source_id.clone(), source_path: agent.source_path.clone(), upstream_license: None },
        metadata: BTreeMap::from([
            ("slug".to_string(), agent.slug.clone()),
            ("category".to_string(), agent.category.clone()),
            ("sourceName".to_string(), agent.source_name.clone()),
        ]),
    }
}

pub fn default_buddy_mcp_refs() -> Vec<McpServerRef> {
    vec![McpServerRef { id: "buddy-memory".to_string(), required: false }, McpServerRef { id: "buddy-knowledge".to_string(), required: false }, McpServerRef { id: "buddy-session".to_string(), required: false }, McpServerRef { id: "buddy-approval".to_string(), required: false }]
}
