use crate::knowledge::{KnowledgeSnapshot, KnowledgeSpace};
use crate::memory::{MemoryCandidate, MemoryItem, MemoryStatus};
use crate::session::{event_type_to_str, SessionEvent};
use crate::session_scanner::SessionSyncPlan;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeRuntimeSearchResult {
    pub query: String,
    pub generated_at: i64,
    pub hits: Vec<KnowledgeRuntimeHit>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeRuntimeHit {
    pub space_id: String,
    pub space_name: String,
    pub source: String,
    pub document_id: String,
    pub title: String,
    pub snippet: String,
    pub score: i64,
    pub manifest_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryRuntimeSearchResult {
    pub query: String,
    pub generated_at: i64,
    pub item_matches: Vec<MemoryItem>,
    pub candidate_matches: Vec<MemoryCandidate>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRuntimeSummary {
    pub session_id: String,
    pub generated_at: i64,
    pub event_count: usize,
    pub event_type_counts: BTreeMap<String, usize>,
    pub runtime_counts: BTreeMap<String, usize>,
    pub first_event_at: Option<i64>,
    pub last_event_at: Option<i64>,
    pub timeline_preview: Vec<String>,
    pub summary: String,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRuntimeScan {
    pub generated_at: i64,
    pub scanned_sources: usize,
    pub detected_sources: usize,
    pub detected_paths: Vec<String>,
    pub deep_support_sources: usize,
    pub medium_support_sources: usize,
    pub weak_support_sources: usize,
    pub warnings: Vec<String>,
}

pub fn search_knowledge_runtime(
    query: String,
    requested_space_ids: Vec<String>,
    spaces: Vec<KnowledgeSpace>,
    snapshots: Vec<KnowledgeSnapshot>,
    app_data_dir: &Path,
) -> KnowledgeRuntimeSearchResult {
    let generated_at = chrono::Utc::now().timestamp();
    let terms = tokenize(&query);
    let mut warnings = Vec::new();
    if query.trim().is_empty() {
        warnings.push("Knowledge query is empty; returning high-level space and snapshot entries.".to_string());
    }
    let requested = requested_space_ids.into_iter().collect::<BTreeSet<_>>();
    let scoped_spaces = spaces
        .into_iter()
        .filter(|space| requested.is_empty() || requested.contains(&space.id))
        .collect::<Vec<_>>();
    if scoped_spaces.is_empty() {
        warnings.push("No knowledge spaces matched the selected scope.".to_string());
    }

    let mut hits = Vec::new();
    for space in &scoped_spaces {
        let haystack = format!("{} {} {} {}", space.name, space.description, space.source, space.sync_mode);
        let score = score_text(&terms, &haystack) + if terms.is_empty() { 1 } else { 0 };
        if score > 0 || terms.is_empty() {
            hits.push(KnowledgeRuntimeHit {
                space_id: space.id.clone(),
                space_name: space.name.clone(),
                source: space.source.clone(),
                document_id: format!("space:{}", space.id),
                title: space.name.clone(),
                snippet: space.description.clone(),
                score,
                manifest_path: None,
            });
        }
    }

    for snapshot in snapshots {
        if !scoped_spaces.iter().any(|space| space.id == snapshot.space_id) {
            continue;
        }
        let Some(space) = scoped_spaces.iter().find(|space| space.id == snapshot.space_id) else { continue; };
        let path = resolve_manifest_path(app_data_dir, &snapshot.manifest_path);
        let mut manifest_text = format!("{} {} {}", snapshot.version, snapshot.status, snapshot.manifest_path);
        if let Some(path) = path.as_ref() {
            match std::fs::read_to_string(path) {
                Ok(text) => manifest_text.push_str(&format!("\n{}", text.chars().take(32_000).collect::<String>())),
                Err(error) => warnings.push(format!("Could not read knowledge snapshot manifest {}: {}", path.display(), error)),
            }
        }
        let score = score_text(&terms, &manifest_text) + if terms.is_empty() { 1 } else { 0 };
        if score > 0 || terms.is_empty() {
            hits.push(KnowledgeRuntimeHit {
                space_id: space.id.clone(),
                space_name: space.name.clone(),
                source: space.source.clone(),
                document_id: format!("snapshot:{}", snapshot.id),
                title: format!("{} / {}", space.name, snapshot.version),
                snippet: snippet(&manifest_text, &terms),
                score,
                manifest_path: Some(snapshot.manifest_path.clone()),
            });
        }
    }

    hits.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| a.title.cmp(&b.title)));
    hits.truncate(25);
    if hits.is_empty() {
        warnings.push("No knowledge runtime hits were found. Add snapshots or mirror manifests to improve retrieval depth.".to_string());
    }
    KnowledgeRuntimeSearchResult { query, generated_at, hits, warnings }
}

pub fn search_memory_runtime(query: String, items: Vec<MemoryItem>, candidates: Vec<MemoryCandidate>) -> MemoryRuntimeSearchResult {
    let generated_at = chrono::Utc::now().timestamp();
    let terms = tokenize(&query);
    let mut warnings = Vec::new();
    if query.trim().is_empty() {
        warnings.push("Memory query is empty; returning recent active memories and pending candidates.".to_string());
    }
    let mut item_matches = items
        .into_iter()
        .filter(|item| {
            matches!(item.status, MemoryStatus::Active | MemoryStatus::Archived) && (terms.is_empty() || score_text(&terms, &format!("{} {} {}", item.title, item.content, item.source)) > 0)
        })
        .collect::<Vec<_>>();
    item_matches.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    item_matches.truncate(50);

    let mut candidate_matches = candidates
        .into_iter()
        .filter(|candidate| terms.is_empty() || score_text(&terms, &candidate.content) > 0)
        .collect::<Vec<_>>();
    candidate_matches.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    candidate_matches.truncate(50);

    if item_matches.is_empty() && candidate_matches.is_empty() {
        warnings.push("No memory runtime matches were found.".to_string());
    }
    MemoryRuntimeSearchResult { query, generated_at, item_matches, candidate_matches, warnings }
}

pub fn update_memory_item(mut item: MemoryItem, title: Option<String>, content: Option<String>) -> MemoryItem {
    if let Some(title) = title.filter(|value| !value.trim().is_empty()) {
        item.title = title;
    }
    if let Some(content) = content.filter(|value| !value.trim().is_empty()) {
        item.content = content;
    }
    item.updated_at = chrono::Utc::now().timestamp();
    item
}

pub fn set_memory_item_status(mut item: MemoryItem, status: MemoryStatus) -> MemoryItem {
    item.status = status;
    item.updated_at = chrono::Utc::now().timestamp();
    item
}

pub fn set_memory_candidate_status(mut candidate: MemoryCandidate, status: MemoryStatus) -> MemoryCandidate {
    candidate.status = status;
    candidate
}

pub fn summarize_session_runtime(session_id: String, events: Vec<SessionEvent>) -> SessionRuntimeSummary {
    let generated_at = chrono::Utc::now().timestamp();
    let scoped = events.into_iter().filter(|event| event.session_id == session_id).collect::<Vec<_>>();
    let mut event_type_counts = BTreeMap::new();
    let mut runtime_counts = BTreeMap::new();
    let mut timeline_preview = Vec::new();
    let mut first_event_at = None;
    let mut last_event_at = None;
    for event in &scoped {
        let event_type = event_type_to_str(event.event_type).to_string();
        *event_type_counts.entry(event_type.clone()).or_insert(0) += 1;
        if let Some(runtime) = event.runtime {
            *runtime_counts.entry(crate::runtime::runtime_to_str(runtime).to_string()).or_insert(0) += 1;
        }
        first_event_at = Some(first_event_at.map_or(event.created_at, |value: i64| value.min(event.created_at)));
        last_event_at = Some(last_event_at.map_or(event.created_at, |value: i64| value.max(event.created_at)));
        if timeline_preview.len() < 12 {
            timeline_preview.push(format!("{} @ {}: {}", event_type, event.created_at, trim_payload(&event.payload_json)));
        }
    }
    let mut warnings = Vec::new();
    if scoped.is_empty() {
        warnings.push("No events were found for this session id.".to_string());
    }
    let summary = if scoped.is_empty() {
        format!("Session {session_id} has no local runtime events yet.")
    } else {
        format!(
            "Session {session_id} has {} event(s), {} event type(s), and {} runtime source(s). Last event at {:?}.",
            scoped.len(),
            event_type_counts.len(),
            runtime_counts.len(),
            last_event_at
        )
    };
    SessionRuntimeSummary { session_id, generated_at, event_count: scoped.len(), event_type_counts, runtime_counts, first_event_at, last_event_at, timeline_preview, summary, warnings }
}

pub fn scan_session_runtime(plan: SessionSyncPlan) -> SessionRuntimeScan {
    let generated_at = chrono::Utc::now().timestamp();
    let mut detected_paths = Vec::new();
    let mut deep_support_sources = 0;
    let mut medium_support_sources = 0;
    let mut weak_support_sources = 0;
    for source in &plan.sources {
        detected_paths.extend(source.detected_paths.clone());
        match source.support_level.as_str() {
            "deep" => deep_support_sources += 1,
            "medium" => medium_support_sources += 1,
            _ => weak_support_sources += 1,
        }
    }
    let detected_sources = plan.sources.iter().filter(|source| !source.detected_paths.is_empty()).count();
    let mut warnings = plan.warnings.clone();
    if detected_sources == 0 {
        warnings.push("No local runtime session stores were detected during this scan.".to_string());
    }
    SessionRuntimeScan {
        generated_at,
        scanned_sources: plan.sources.len(),
        detected_sources,
        detected_paths,
        deep_support_sources,
        medium_support_sources,
        weak_support_sources,
        warnings,
    }
}

fn tokenize(query: &str) -> Vec<String> {
    query
        .to_lowercase()
        .split(|ch: char| !ch.is_alphanumeric() && ch != '-' && ch != '_')
        .filter(|part| !part.trim().is_empty())
        .map(str::to_string)
        .collect()
}

fn score_text(terms: &[String], text: &str) -> i64 {
    if terms.is_empty() {
        return 0;
    }
    let lower = text.to_lowercase();
    terms.iter().map(|term| lower.matches(term).count() as i64).sum()
}

fn snippet(text: &str, terms: &[String]) -> String {
    let clean = text.replace('\n', " ").replace('\r', " ");
    if clean.chars().count() <= 280 {
        return clean;
    }
    if let Some(term) = terms.first() {
        let lower = clean.to_lowercase();
        if let Some(byte_index) = lower.find(term) {
            let term_char_index = lower[..byte_index].chars().count();
            let start = term_char_index.saturating_sub(90);
            return take_char_window(&clean, start, 280);
        }
    }
    truncate_chars(&clean, 280)
}

fn resolve_manifest_path(app_data_dir: &Path, value: &str) -> Option<PathBuf> {
    if value.trim().is_empty() {
        return None;
    }
    let path = PathBuf::from(value);
    if path.is_absolute() { Some(path) } else { Some(app_data_dir.join(path)) }
}

fn trim_payload(payload: &str) -> String {
    let compact = payload.replace('\n', " ").replace('\r', " ");
    truncate_chars(&compact, 160)
}

fn take_char_window(value: &str, start: usize, limit: usize) -> String {
    let mut chars = value.chars().skip(start);
    let preview = chars.by_ref().take(limit).collect::<String>();
    if chars.next().is_some() { format!("{preview}…") } else { preview }
}

fn truncate_chars(value: &str, limit: usize) -> String {
    let mut chars = value.chars();
    let preview = chars.by_ref().take(limit).collect::<String>();
    if chars.next().is_some() { format!("{preview}…") } else { preview }
}