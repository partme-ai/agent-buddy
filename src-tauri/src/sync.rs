use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncOutboxEvent {
    pub id: String,
    pub aggregate_type: String,
    pub aggregate_id: String,
    pub event_type: String,
    pub payload_json: String,
    pub status: SyncStatus,
    pub retry_count: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SyncStatus {
    Pending,
    Sent,
    Failed,
    Skipped,
}

pub fn outbox_event(
    aggregate_type: impl Into<String>,
    aggregate_id: impl Into<String>,
    event_type: impl Into<String>,
    payload_json: impl Into<String>,
) -> SyncOutboxEvent {
    let now = chrono::Utc::now().timestamp();
    SyncOutboxEvent {
        id: Uuid::new_v4().to_string(),
        aggregate_type: aggregate_type.into(),
        aggregate_id: aggregate_id.into(),
        event_type: event_type.into(),
        payload_json: payload_json.into(),
        status: SyncStatus::Pending,
        retry_count: 0,
        created_at: now,
        updated_at: now,
    }
}

pub fn status_to_str(status: SyncStatus) -> &'static str {
    match status {
        SyncStatus::Pending => "pending",
        SyncStatus::Sent => "sent",
        SyncStatus::Failed => "failed",
        SyncStatus::Skipped => "skipped",
    }
}

pub fn parse_status(value: &str) -> SyncStatus {
    match value {
        "sent" => SyncStatus::Sent,
        "failed" => SyncStatus::Failed,
        "skipped" => SyncStatus::Skipped,
        _ => SyncStatus::Pending,
    }
}
