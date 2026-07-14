use crate::settings::AgentBuddySettings;
use crate::sync::{SyncOutboxEvent, SyncStatus};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncFlushPlan {
    pub enabled: bool,
    pub destination: String,
    pub pending_count: usize,
    pub grouped_counts: BTreeMap<String, usize>,
    pub debounce_policy: SyncDebouncePolicy,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDebouncePolicy {
    pub debounce_ms: u64,
    pub max_batch_size: usize,
    pub max_retry_count: i64,
    pub flush_on_shutdown: bool,
}

impl Default for SyncDebouncePolicy {
    fn default() -> Self {
        Self { debounce_ms: 1500, max_batch_size: 100, max_retry_count: 5, flush_on_shutdown: true }
    }
}

pub fn build_flush_plan(settings: &AgentBuddySettings, events: &[SyncOutboxEvent]) -> SyncFlushPlan {
    let pending: Vec<_> = events.iter().filter(|event| matches!(event.status, SyncStatus::Pending | SyncStatus::Failed)).collect();
    let mut grouped_counts = BTreeMap::new();
    for event in &pending {
        *grouped_counts.entry(event.event_type.clone()).or_insert(0) += 1;
    }
    let mut warnings = Vec::new();
    if !settings.sync_enabled {
        warnings.push("Sync is disabled in local settings.".to_string());
    }
    if settings.paas_base_url.trim().is_empty() {
        warnings.push("Agent PaaS base URL is empty.".to_string());
    }
    if pending.is_empty() {
        warnings.push("No pending outbox events.".to_string());
    }
    SyncFlushPlan {
        enabled: settings.sync_enabled,
        destination: settings.paas_base_url.clone(),
        pending_count: pending.len(),
        grouped_counts,
        debounce_policy: SyncDebouncePolicy::default(),
        warnings,
    }
}
