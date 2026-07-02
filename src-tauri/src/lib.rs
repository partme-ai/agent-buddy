mod adapters;
mod audit;
mod bundle;
mod database;
mod deeplink;
mod doctor;
mod domain;
mod generated;
mod installer;
mod knowledge;
mod mcp;
mod memory;
mod runtime;
mod session;
mod skill;
mod source;
mod sync;

use audit::{audit_event, AuditEvent, AuditSeverity};
use bundle::AgentBundle;
use database::Database;
use deeplink::DeepLinkRequest;
use doctor::DoctorReport;
use domain::{LocalAgentSummary, SourceRefreshResult};
use generated::GeneratedArtifact;
use knowledge::{KnowledgeSnapshot, KnowledgeSpace};
use memory::{MemoryCandidate, MemoryItem};
use runtime::{
    AgentInstallation, InstallBackup, InstallEvent, InstallPlan, InstallResult, InstallTarget,
    RuntimeDetection, RuntimeKind,
};
use session::{HandoffPack, SessionEvent};
use std::path::PathBuf;
use std::sync::Arc;
use sync::{outbox_event, SyncOutboxEvent};
use tauri::{Manager, State};

struct AppState {
    db: Arc<Database>,
    app_data_dir: PathBuf,
}

#[tauri::command]
fn refresh_agent_source(state: State<'_, AppState>) -> Result<SourceRefreshResult, String> {
    let result = source::refresh_source(&state.app_data_dir).map_err(to_message)?;
    state.db.save_source_refresh(&result).map_err(to_message)?;
    state
        .db
        .save_audit_event(&audit_event("source.refresh", "agent_source", &result.source_id, None, AuditSeverity::Info, "refreshed agency-agents-zh source"))
        .map_err(to_message)?;
    Ok(result)
}

#[tauri::command]
fn list_agents(state: State<'_, AppState>) -> Result<Vec<LocalAgentSummary>, String> {
    let agents = source::list_agents(&state.app_data_dir).map_err(to_message)?;
    Ok(agents.iter().map(LocalAgentSummary::from).collect())
}

#[tauri::command]
fn build_agent_bundles(agent_ids: Vec<String>, state: State<'_, AppState>) -> Result<Vec<AgentBundle>, String> {
    let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?;
    let selected = select_agents(all_agents, &agent_ids);
    let targets = RuntimeKind::all();
    Ok(selected.iter().map(|agent| bundle::bundle_from_local_agent(agent, targets.clone())).collect())
}

#[tauri::command]
fn detect_runtimes(state: State<'_, AppState>) -> Result<Vec<RuntimeDetection>, String> {
    let detections = adapters::detect_all();
    for detection in &detections {
        state.db.save_runtime_detection(detection).map_err(to_message)?;
    }
    Ok(detections)
}

#[tauri::command]
fn runtime_definitions() -> Result<Vec<adapters::RuntimeDefinition>, String> {
    Ok(adapters::runtime_definitions())
}

#[tauri::command]
fn get_install_plan(agent_ids: Vec<String>, targets: Vec<InstallTarget>, state: State<'_, AppState>) -> Result<InstallPlan, String> {
    let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?;
    let selected = select_agents(all_agents, &agent_ids);
    installer::build_install_plan(&selected, &targets, &state.app_data_dir).map_err(to_message)
}

#[tauri::command]
fn install_agents(agent_ids: Vec<String>, targets: Vec<InstallTarget>, state: State<'_, AppState>) -> Result<Vec<InstallResult>, String> {
    let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?;
    let selected = select_agents(all_agents, &agent_ids);
    let mut results = Vec::new();
    for target in targets {
        let outcome = installer::install_target(&selected, &target, &state.app_data_dir).map_err(to_message)?;
        for record in &outcome.records {
            state.db.save_installation(record).map_err(to_message)?;
            let payload = serde_json::to_string(record).map_err(to_message)?;
            state.db.save_sync_outbox_event(&outbox_event("agent_installation", &record.id, "agent.installation.created", payload)).map_err(to_message)?;
            state.db.save_audit_event(&audit_event("agent.install", "agent_installation", &record.id, Some(record.runtime), AuditSeverity::Info, "installed agent bundle into runtime")).map_err(to_message)?;
        }
        for backup in &outcome.backups { state.db.save_backup(backup).map_err(to_message)?; }
        for event in &outcome.events { state.db.save_install_event(event).map_err(to_message)?; }
        results.push(outcome.result);
    }
    Ok(results)
}

#[tauri::command]
fn list_installations(state: State<'_, AppState>) -> Result<Vec<AgentInstallation>, String> { state.db.list_installations().map_err(to_message) }
#[tauri::command]
fn list_install_backups(state: State<'_, AppState>) -> Result<Vec<InstallBackup>, String> { state.db.list_backups().map_err(to_message) }
#[tauri::command]
fn list_install_events(state: State<'_, AppState>) -> Result<Vec<InstallEvent>, String> { state.db.list_install_events().map_err(to_message) }
#[tauri::command]
fn list_audit_events(state: State<'_, AppState>) -> Result<Vec<AuditEvent>, String> { state.db.list_audit_events().map_err(to_message) }
#[tauri::command]
fn list_sync_outbox(state: State<'_, AppState>) -> Result<Vec<SyncOutboxEvent>, String> { state.db.list_sync_outbox().map_err(to_message) }
#[tauri::command]
fn list_generated_artifacts(state: State<'_, AppState>) -> Result<Vec<GeneratedArtifact>, String> { generated::list_generated_artifacts(&state.app_data_dir).map_err(to_message) }
#[tauri::command]
fn read_generated_artifact(path: String) -> Result<String, String> { generated::read_generated_artifact(&path).map_err(to_message) }
#[tauri::command]
fn list_default_mcp_servers() -> Result<Vec<mcp::McpServerConfig>, String> { Ok(mcp::default_buddy_mcp_servers()) }
#[tauri::command]
fn list_skill_targets() -> Result<Vec<skill::SkillTargetPath>, String> { Ok(skill::default_skill_targets()) }
#[tauri::command]
fn list_built_in_skills() -> Result<Vec<skill::SkillPackage>, String> { Ok(skill::built_in_buddy_skills()) }

#[tauri::command]
fn initialize_default_knowledge_spaces(state: State<'_, AppState>) -> Result<Vec<KnowledgeSpace>, String> {
    let spaces = knowledge::default_local_spaces();
    for space in &spaces { state.db.save_knowledge_space(space).map_err(to_message)?; }
    Ok(spaces)
}

#[tauri::command]
fn list_knowledge_spaces(state: State<'_, AppState>) -> Result<Vec<KnowledgeSpace>, String> { state.db.list_knowledge_spaces().map_err(to_message) }
#[tauri::command]
fn list_knowledge_snapshots(state: State<'_, AppState>) -> Result<Vec<KnowledgeSnapshot>, String> { state.db.list_knowledge_snapshots().map_err(to_message) }

#[tauri::command]
fn create_knowledge_snapshot(space_id: String, version: String, manifest_path: String, state: State<'_, AppState>) -> Result<KnowledgeSnapshot, String> {
    let snapshot = knowledge::new_snapshot(space_id, version, manifest_path);
    state.db.save_knowledge_snapshot(&snapshot).map_err(to_message)?;
    Ok(snapshot)
}

#[tauri::command]
fn list_memory_items(state: State<'_, AppState>) -> Result<Vec<MemoryItem>, String> { state.db.list_memory_items().map_err(to_message) }
#[tauri::command]
fn list_memory_candidates(state: State<'_, AppState>) -> Result<Vec<MemoryCandidate>, String> { state.db.list_memory_candidates().map_err(to_message) }

#[tauri::command]
fn propose_memory(content: String, scope: String, memory_type: String, source_session_id: Option<String>, state: State<'_, AppState>) -> Result<MemoryCandidate, String> {
    let candidate = memory::new_candidate(content, memory::parse_scope(&scope), memory::parse_type(&memory_type), source_session_id);
    state.db.save_memory_candidate(&candidate).map_err(to_message)?;
    state.db.save_audit_event(&audit_event("memory.propose", "memory_candidate", &candidate.id, None, AuditSeverity::Info, "created memory candidate")).map_err(to_message)?;
    Ok(candidate)
}

#[tauri::command]
fn approve_memory_candidate(candidate_id: String, title: String, state: State<'_, AppState>) -> Result<MemoryItem, String> {
    let candidate = state.db.list_memory_candidates().map_err(to_message)?.into_iter().find(|item| item.id == candidate_id).ok_or_else(|| format!("memory candidate not found: {candidate_id}"))?;
    let item = memory::activate_candidate(&candidate, title);
    state.db.save_memory_item(&item).map_err(to_message)?;
    state.db.save_audit_event(&audit_event("memory.approve", "memory_item", &item.id, None, AuditSeverity::Info, "approved memory candidate")).map_err(to_message)?;
    Ok(item)
}

#[tauri::command]
fn append_session_event(session_id: String, runtime: Option<RuntimeKind>, event_type: String, payload_json: String, state: State<'_, AppState>) -> Result<SessionEvent, String> {
    let event = session::new_event(session_id, runtime, session::parse_event_type(&event_type), payload_json);
    state.db.save_session_event(&event).map_err(to_message)?;
    Ok(event)
}

#[tauri::command]
fn list_session_events(state: State<'_, AppState>) -> Result<Vec<SessionEvent>, String> { state.db.list_session_events().map_err(to_message) }
#[tauri::command]
fn list_handoff_packs(state: State<'_, AppState>) -> Result<Vec<HandoffPack>, String> { state.db.list_handoff_packs().map_err(to_message) }

#[tauri::command]
fn create_handoff_pack(session_id: String, from_runtime: Option<RuntimeKind>, to_runtime: Option<RuntimeKind>, goal: String, summary: String, state: State<'_, AppState>) -> Result<HandoffPack, String> {
    let handoff = session::new_handoff(session_id, from_runtime, to_runtime, goal, summary);
    state.db.save_handoff_pack(&handoff).map_err(to_message)?;
    state.db.save_audit_event(&audit_event("handoff.create", "handoff_pack", &handoff.id, from_runtime, AuditSeverity::Info, "created handoff pack")).map_err(to_message)?;
    Ok(handoff)
}

#[tauri::command]
fn restore_backup(backup_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let backup = state.db.get_backup(&backup_id).map_err(to_message)?.ok_or_else(|| format!("backup not found: {backup_id}"))?;
    let event = installer::restore_backup(&backup).map_err(to_message)?;
    state.db.save_install_event(&event).map_err(to_message)?;
    state.db.save_audit_event(&audit_event("backup.restore", "install_backup", backup_id, Some(backup.runtime), AuditSeverity::Warn, "restored install backup")).map_err(to_message)?;
    Ok(())
}

#[tauri::command]
fn uninstall_installation(installation_id: String, state: State<'_, AppState>) -> Result<(), String> {
    if let Some(record) = state.db.get_installation(&installation_id).map_err(to_message)? {
        installer::remove_installation(&record).map_err(to_message)?;
        state.db.delete_installation(&installation_id).map_err(to_message)?;
        state.db.save_audit_event(&audit_event("agent.uninstall", "agent_installation", installation_id, Some(record.runtime), AuditSeverity::Warn, "removed installed agent files")).map_err(to_message)?;
    }
    Ok(())
}

#[tauri::command]
fn run_doctor(state: State<'_, AppState>) -> Result<DoctorReport, String> { Ok(doctor::run_doctor(&state.app_data_dir)) }
#[tauri::command]
fn parse_deeplink(url: String) -> Result<DeepLinkRequest, String> { deeplink::parse_deeplink(&url).map_err(to_message) }

fn select_agents(all_agents: Vec<domain::LocalAgent>, agent_ids: &[String]) -> Vec<domain::LocalAgent> {
    all_agents.into_iter().filter(|agent| agent_ids.is_empty() || agent_ids.contains(&agent.id)).collect()
}
fn to_message(error: impl std::fmt::Display) -> String { error.to_string() }

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".agent-buddy"));
            let db = Arc::new(Database::init(&app_data_dir).map_err(tauri::Error::Anyhow)?);
            app.manage(AppState { db, app_data_dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            refresh_agent_source, list_agents, build_agent_bundles, detect_runtimes,
            runtime_definitions, get_install_plan, install_agents, list_installations,
            list_install_backups, list_install_events, list_audit_events, list_sync_outbox,
            list_generated_artifacts, read_generated_artifact, list_default_mcp_servers,
            list_skill_targets, list_built_in_skills, initialize_default_knowledge_spaces,
            list_knowledge_spaces, list_knowledge_snapshots, create_knowledge_snapshot,
            list_memory_items, list_memory_candidates, propose_memory, approve_memory_candidate,
            append_session_event, list_session_events, list_handoff_packs, create_handoff_pack,
            restore_backup, uninstall_installation, run_doctor, parse_deeplink
        ])
        .run(tauri::generate_context!())
        .expect("error while running Agent Buddy");
}
