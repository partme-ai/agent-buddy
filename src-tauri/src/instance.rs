use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum InstanceKind {
    Runtime,
    AgentInstallation,
    McpService,
    KnowledgeMirror,
    MemoryService,
    SessionService,
    LocalApi,
    Connector,
    Tool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceRecord {
    pub id: String,
    pub name: String,
    pub kind: InstanceKind,
    pub runtime: Option<RuntimeKind>,
    pub group_id: Option<String>,
    pub status: String,
    pub path: Option<String>,
    pub description: String,
    pub tags: Vec<String>,
    pub metadata_json: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceGroupRecord {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub sort_order: i64,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceGroupSummary {
    pub group: InstanceGroupRecord,
    pub instance_count: usize,
    pub status_counts: BTreeMap<String, usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceUpsertRequest {
    pub id: Option<String>,
    pub name: String,
    pub kind: InstanceKind,
    pub runtime: Option<RuntimeKind>,
    pub group_id: Option<String>,
    pub status: String,
    pub path: Option<String>,
    pub description: String,
    pub tags: Vec<String>,
    pub metadata_json: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceGroupUpsertRequest {
    pub id: Option<String>,
    pub name: String,
    pub description: String,
    pub color: String,
    pub sort_order: i64,
    pub tags: Vec<String>,
}

pub fn new_instance(request: InstanceUpsertRequest) -> InstanceRecord {
    let now = chrono::Utc::now().timestamp();
    let id = request.id.unwrap_or_else(|| slug_id("instance", &request.name, now));
    InstanceRecord {
        id,
        name: request.name,
        kind: request.kind,
        runtime: request.runtime,
        group_id: request.group_id,
        status: if request.status.trim().is_empty() { "running".to_string() } else { request.status },
        path: request.path,
        description: request.description,
        tags: request.tags,
        metadata_json: request.metadata_json.unwrap_or_else(|| "{}".to_string()),
        created_at: now,
        updated_at: now,
    }
}

pub fn new_group(request: InstanceGroupUpsertRequest) -> InstanceGroupRecord {
    let now = chrono::Utc::now().timestamp();
    let id = request.id.unwrap_or_else(|| slug_id("group", &request.name, now));
    InstanceGroupRecord {
        id,
        name: request.name,
        description: request.description,
        color: if request.color.trim().is_empty() { "#2563eb".to_string() } else { request.color },
        sort_order: request.sort_order,
        tags: request.tags,
        created_at: now,
        updated_at: now,
    }
}

pub fn summarize_groups(groups: Vec<InstanceGroupRecord>, instances: &[InstanceRecord]) -> Vec<InstanceGroupSummary> {
    groups.into_iter().map(|group| {
        let scoped = instances.iter().filter(|item| item.group_id.as_deref() == Some(group.id.as_str()));
        let mut status_counts = BTreeMap::new();
        let mut count = 0;
        for item in scoped {
            count += 1;
            *status_counts.entry(item.status.clone()).or_insert(0) += 1;
        }
        InstanceGroupSummary { group, instance_count: count, status_counts }
    }).collect()
}

pub fn kind_to_str(kind: InstanceKind) -> &'static str {
    match kind {
        InstanceKind::Runtime => "runtime",
        InstanceKind::AgentInstallation => "agent-installation",
        InstanceKind::McpService => "mcp-service",
        InstanceKind::KnowledgeMirror => "knowledge-mirror",
        InstanceKind::MemoryService => "memory-service",
        InstanceKind::SessionService => "session-service",
        InstanceKind::LocalApi => "local-api",
        InstanceKind::Connector => "connector",
        InstanceKind::Tool => "tool",
    }
}

pub fn parse_kind(value: &str) -> InstanceKind {
    match value {
        "runtime" => InstanceKind::Runtime,
        "agent-installation" => InstanceKind::AgentInstallation,
        "mcp-service" => InstanceKind::McpService,
        "knowledge-mirror" => InstanceKind::KnowledgeMirror,
        "memory-service" => InstanceKind::MemoryService,
        "session-service" => InstanceKind::SessionService,
        "local-api" => InstanceKind::LocalApi,
        "connector" => InstanceKind::Connector,
        "tool" => InstanceKind::Tool,
        _ => InstanceKind::Runtime,
    }
}

fn slug_id(prefix: &str, name: &str, now: i64) -> String {
    let slug = name.to_lowercase().chars().map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' }).collect::<String>().split('-').filter(|part| !part.is_empty()).collect::<Vec<_>>().join("-");
    format!("{prefix}:{}:{now}", if slug.is_empty() { "local" } else { &slug })
}
