use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryItem {
    pub id: String,
    pub scope: MemoryScope,
    pub memory_type: MemoryType,
    pub title: String,
    pub content: String,
    pub source: String,
    pub status: MemoryStatus,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryCandidate {
    pub id: String,
    pub scope: MemoryScope,
    pub memory_type: MemoryType,
    pub content: String,
    pub source_session_id: Option<String>,
    pub confidence: f64,
    pub status: MemoryStatus,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MemoryScope {
    User,
    Agent,
    Project,
    Team,
    Tool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MemoryType {
    Preference,
    Correction,
    ProjectContext,
    TeamRule,
    Episodic,
    ToolUsage,
    Other,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MemoryStatus {
    Pending,
    Active,
    Rejected,
    Archived,
}

pub fn new_candidate(content: String, scope: MemoryScope, memory_type: MemoryType, source_session_id: Option<String>) -> MemoryCandidate {
    MemoryCandidate {
        id: Uuid::new_v4().to_string(),
        scope,
        memory_type,
        content,
        source_session_id,
        confidence: 0.8,
        status: MemoryStatus::Pending,
        created_at: chrono::Utc::now().timestamp(),
    }
}

pub fn activate_candidate(candidate: &MemoryCandidate, title: String) -> MemoryItem {
    let now = chrono::Utc::now().timestamp();
    MemoryItem {
        id: Uuid::new_v4().to_string(),
        scope: candidate.scope,
        memory_type: candidate.memory_type,
        title,
        content: candidate.content.clone(),
        source: candidate.source_session_id.clone().unwrap_or_else(|| "manual".to_string()),
        status: MemoryStatus::Active,
        created_at: now,
        updated_at: now,
    }
}

pub fn scope_to_str(scope: MemoryScope) -> &'static str {
    match scope {
        MemoryScope::User => "user",
        MemoryScope::Agent => "agent",
        MemoryScope::Project => "project",
        MemoryScope::Team => "team",
        MemoryScope::Tool => "tool",
    }
}

pub fn type_to_str(memory_type: MemoryType) -> &'static str {
    match memory_type {
        MemoryType::Preference => "preference",
        MemoryType::Correction => "correction",
        MemoryType::ProjectContext => "project-context",
        MemoryType::TeamRule => "team-rule",
        MemoryType::Episodic => "episodic",
        MemoryType::ToolUsage => "tool-usage",
        MemoryType::Other => "other",
    }
}

pub fn status_to_str(status: MemoryStatus) -> &'static str {
    match status {
        MemoryStatus::Pending => "pending",
        MemoryStatus::Active => "active",
        MemoryStatus::Rejected => "rejected",
        MemoryStatus::Archived => "archived",
    }
}

pub fn parse_scope(value: &str) -> MemoryScope {
    match value {
        "agent" => MemoryScope::Agent,
        "project" => MemoryScope::Project,
        "team" => MemoryScope::Team,
        "tool" => MemoryScope::Tool,
        _ => MemoryScope::User,
    }
}

pub fn parse_type(value: &str) -> MemoryType {
    match value {
        "preference" => MemoryType::Preference,
        "correction" => MemoryType::Correction,
        "project-context" => MemoryType::ProjectContext,
        "team-rule" => MemoryType::TeamRule,
        "episodic" => MemoryType::Episodic,
        "tool-usage" => MemoryType::ToolUsage,
        _ => MemoryType::Other,
    }
}

pub fn parse_status(value: &str) -> MemoryStatus {
    match value {
        "active" => MemoryStatus::Active,
        "rejected" => MemoryStatus::Rejected,
        "archived" => MemoryStatus::Archived,
        _ => MemoryStatus::Pending,
    }
}
