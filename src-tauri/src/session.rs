use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionEvent {
    pub id: String,
    pub session_id: String,
    pub runtime: Option<RuntimeKind>,
    pub event_type: SessionEventType,
    pub payload_json: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SessionEventType {
    SessionCreated,
    UserMessageReceived,
    AgentMessageGenerated,
    KnowledgeSearched,
    MemoryRead,
    MemoryProposed,
    SkillInvoked,
    McpToolCalled,
    ToolResultReceived,
    FileChanged,
    ApprovalRequested,
    ApprovalResolved,
    SessionSummarized,
    HandoffCreated,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandoffPack {
    pub id: String,
    pub from_runtime: Option<RuntimeKind>,
    pub to_runtime: Option<RuntimeKind>,
    pub session_id: String,
    pub goal: String,
    pub summary: String,
    pub knowledge_refs: Vec<String>,
    pub memory_refs: Vec<String>,
    pub open_tasks: Vec<String>,
    pub created_at: i64,
}

pub fn new_event(session_id: String, runtime: Option<RuntimeKind>, event_type: SessionEventType, payload_json: String) -> SessionEvent {
    SessionEvent {
        id: Uuid::new_v4().to_string(),
        session_id,
        runtime,
        event_type,
        payload_json,
        created_at: chrono::Utc::now().timestamp(),
    }
}

pub fn new_handoff(
    session_id: String,
    from_runtime: Option<RuntimeKind>,
    to_runtime: Option<RuntimeKind>,
    goal: String,
    summary: String,
) -> HandoffPack {
    HandoffPack {
        id: Uuid::new_v4().to_string(),
        from_runtime,
        to_runtime,
        session_id,
        goal,
        summary,
        knowledge_refs: Vec::new(),
        memory_refs: Vec::new(),
        open_tasks: Vec::new(),
        created_at: chrono::Utc::now().timestamp(),
    }
}

pub fn event_type_to_str(value: SessionEventType) -> &'static str {
    match value {
        SessionEventType::SessionCreated => "session-created",
        SessionEventType::UserMessageReceived => "user-message-received",
        SessionEventType::AgentMessageGenerated => "agent-message-generated",
        SessionEventType::KnowledgeSearched => "knowledge-searched",
        SessionEventType::MemoryRead => "memory-read",
        SessionEventType::MemoryProposed => "memory-proposed",
        SessionEventType::SkillInvoked => "skill-invoked",
        SessionEventType::McpToolCalled => "mcp-tool-called",
        SessionEventType::ToolResultReceived => "tool-result-received",
        SessionEventType::FileChanged => "file-changed",
        SessionEventType::ApprovalRequested => "approval-requested",
        SessionEventType::ApprovalResolved => "approval-resolved",
        SessionEventType::SessionSummarized => "session-summarized",
        SessionEventType::HandoffCreated => "handoff-created",
        SessionEventType::Error => "error",
    }
}

pub fn parse_event_type(value: &str) -> SessionEventType {
    match value {
        "session-created" => SessionEventType::SessionCreated,
        "user-message-received" => SessionEventType::UserMessageReceived,
        "agent-message-generated" => SessionEventType::AgentMessageGenerated,
        "knowledge-searched" => SessionEventType::KnowledgeSearched,
        "memory-read" => SessionEventType::MemoryRead,
        "memory-proposed" => SessionEventType::MemoryProposed,
        "skill-invoked" => SessionEventType::SkillInvoked,
        "mcp-tool-called" => SessionEventType::McpToolCalled,
        "tool-result-received" => SessionEventType::ToolResultReceived,
        "file-changed" => SessionEventType::FileChanged,
        "approval-requested" => SessionEventType::ApprovalRequested,
        "approval-resolved" => SessionEventType::ApprovalResolved,
        "session-summarized" => SessionEventType::SessionSummarized,
        "handoff-created" => SessionEventType::HandoffCreated,
        _ => SessionEventType::Error,
    }
}
