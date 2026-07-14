use crate::memory::{MemoryCandidate, MemoryItem, MemoryScope, MemoryStatus, MemoryType};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInitPlan {
    pub source: String,
    pub scopes: Vec<MemoryScope>,
    pub target_provider: String,
    pub items_to_pull: usize,
    pub local_write_policy: String,
    pub conflict_policy: String,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryWritebackPlan {
    pub destination: String,
    pub candidates: Vec<MemoryCandidate>,
    pub active_items: Vec<MemoryItem>,
    pub conflicts: Vec<MemoryConflict>,
    pub policy: String,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryConflict {
    pub id: String,
    pub local_memory_id: Option<String>,
    pub remote_memory_id: Option<String>,
    pub conflict_type: String,
    pub summary: String,
    pub recommended_resolution: String,
}

pub fn build_init_plan(scopes: Vec<MemoryScope>) -> MemoryInitPlan {
    let warnings = if scopes.is_empty() {
        vec!["No memory scopes selected; defaulting to user, agent, and project scopes is recommended.".to_string()]
    } else {
        Vec::new()
    };
    MemoryInitPlan {
        source: "agent-paas".to_string(),
        scopes,
        target_provider: "agent-buddy".to_string(),
        items_to_pull: 0,
        local_write_policy: "approval_required".to_string(),
        conflict_policy: "local-wins-until-user-review".to_string(),
        warnings,
    }
}

pub fn build_writeback_plan(candidates: Vec<MemoryCandidate>, active_items: Vec<MemoryItem>) -> MemoryWritebackPlan {
    let pending: Vec<_> = candidates.into_iter().filter(|candidate| matches!(candidate.status, MemoryStatus::Pending)).collect();
    let conflicts = detect_conflicts(&pending, &active_items);
    let mut warnings = Vec::new();
    if pending.is_empty() {
        warnings.push("No pending memory candidates to write back.".to_string());
    }
    if !conflicts.is_empty() {
        warnings.push("Potential memory conflicts require user review before writeback.".to_string());
    }
    MemoryWritebackPlan {
        destination: "agent-paas".to_string(),
        candidates: pending,
        active_items,
        conflicts,
        policy: "writeback-after-approval".to_string(),
        warnings,
    }
}

fn detect_conflicts(candidates: &[MemoryCandidate], active_items: &[MemoryItem]) -> Vec<MemoryConflict> {
    let mut conflicts = Vec::new();
    for candidate in candidates {
        for item in active_items {
            if candidate.scope as u8 == item.scope as u8 && candidate.memory_type as u8 == item.memory_type as u8 {
                let lhs = normalize(&candidate.content);
                let rhs = normalize(&item.content);
                if !lhs.is_empty() && !rhs.is_empty() && (lhs.contains(&rhs) || rhs.contains(&lhs)) {
                    conflicts.push(MemoryConflict {
                        id: Uuid::new_v4().to_string(),
                        local_memory_id: Some(item.id.clone()),
                        remote_memory_id: None,
                        conflict_type: "possible-duplicate".to_string(),
                        summary: format!("Candidate may duplicate active memory '{}'.", item.title),
                        recommended_resolution: "merge-or-reject-candidate".to_string(),
                    });
                }
            }
        }
    }
    conflicts
}

fn normalize(value: &str) -> String {
    value.to_lowercase().split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn sample_candidate(content: String) -> MemoryCandidate {
    MemoryCandidate {
        id: Uuid::new_v4().to_string(),
        scope: MemoryScope::User,
        memory_type: MemoryType::Preference,
        content,
        source_session_id: None,
        confidence: 0.75,
        status: MemoryStatus::Pending,
        created_at: chrono::Utc::now().timestamp(),
    }
}
