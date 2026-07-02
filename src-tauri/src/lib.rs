mod adapters;
mod approval;
mod audit;
mod bundle;
mod bundle_diff;
mod database;
mod deeplink;
mod doctor;
mod domain;
mod generated;
mod installer;
mod instruction;
mod knowledge;
mod lifecycle;
mod mcp;
mod mcp_config;
mod memory;
mod paas;
mod risk;
mod runtime;
mod session;
mod settings;
mod skill;
mod source;
mod sync;

use approval::{ApprovalRequest, ApprovalRiskLevel, ApprovalStatus};
use audit::{audit_event, AuditEvent, AuditSeverity};
use bundle::AgentBundle;
use bundle_diff::AgentBundleDiff;
use database::Database;
use deeplink::DeepLinkRequest;
use doctor::DoctorReport;
use domain::{LocalAgentSummary, SourceRefreshResult};
use generated::GeneratedArtifact;
use instruction::InstructionInjectionPlan;
use knowledge::{KnowledgeSnapshot, KnowledgeSpace};
use lifecycle::LifecyclePlan;
use mcp_config::McpConfigPlan;
use memory::{MemoryCandidate, MemoryItem};
use paas::{PaasConnectionStatus, PaasLoginRequest, PaasSession, PaasSyncPreview};
use risk::RiskScanReport;
use runtime::{
    AgentInstallation, InstallBackup, InstallEvent, InstallPlan, InstallResult, InstallTarget,
    RuntimeDetection, RuntimeKind,
};
use session::{HandoffPack, SessionEvent};
use settings::AgentBuddySettings;
use std::path::PathBuf;
use std::sync::Arc;
use sync::{outbox_event, SyncOutboxEvent};
use tauri::{Manager, State};

struct AppState {
    db: Arc<Database>,
    app_data_dir: PathBuf,
}

#[tauri::command]
fn load_settings(state: State<'_, AppState>) -> Result<AgentBuddySettings, String> { settings::load_settings(&state.app_data_dir).map_err(to_message) }
#[tauri::command]
fn save_settings(settings: AgentBuddySettings, state: State<'_, AppState>) -> Result<AgentBuddySettings, String> { settings::save_settings(&state.app_data_dir, &settings).map_err(to_message)?; state.db.save_audit_event(&audit_event("settings.save", "settings", "local", None, AuditSeverity::Info, "saved local settings")).map_err(to_message)?; Ok(settings) }
#[tauri::command]
fn get_paas_connection_status(state: State<'_, AppState>) -> Result<PaasConnectionStatus, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; Ok(paas::connection_status(settings.paas_base_url, None)) }
#[tauri::command]
fn create_paas_session(request: PaasLoginRequest, state: State<'_, AppState>) -> Result<PaasSession, String> { let session = paas::create_session(request); state.db.save_audit_event(&audit_event("paas.session.create", "paas_session", &session.id, None, AuditSeverity::Info, "created local PaaS session placeholder")).map_err(to_message)?; Ok(session) }
#[tauri::command]
fn preview_paas_sync(state: State<'_, AppState>) -> Result<PaasSyncPreview, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let events = state.db.list_sync_outbox().map_err(to_message)?.into_iter().map(|event| event.event_type).collect(); Ok(paas::preview_sync(settings.paas_base_url, events)) }

#[tauri::command]
fn refresh_agent_source(state: State<'_, AppState>) -> Result<SourceRefreshResult, String> { let result = source::refresh_source(&state.app_data_dir).map_err(to_message)?; state.db.save_source_refresh(&result).map_err(to_message)?; state.db.save_audit_event(&audit_event("source.refresh", "agent_source", &result.source_id, None, AuditSeverity::Info, "refreshed agency-agents-zh source")).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn list_agents(state: State<'_, AppState>) -> Result<Vec<LocalAgentSummary>, String> { let agents = source::list_agents(&state.app_data_dir).map_err(to_message)?; Ok(agents.iter().map(LocalAgentSummary::from).collect()) }
#[tauri::command]
fn build_agent_bundles(agent_ids: Vec<String>, state: State<'_, AppState>) -> Result<Vec<AgentBundle>, String> { let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?; let selected = select_agents(all_agents, &agent_ids); let targets = RuntimeKind::all(); Ok(selected.iter().map(|agent| bundle::bundle_from_local_agent(agent, targets.clone())).collect()) }
#[tauri::command]
fn build_bundle_diff(old_agent_id: String, new_agent_id: String, state: State<'_, AppState>) -> Result<AgentBundleDiff, String> { let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?; let old_agent = all_agents.iter().find(|agent| agent.id == old_agent_id).ok_or_else(|| format!("old agent not found: {old_agent_id}"))?; let new_agent = all_agents.iter().find(|agent| agent.id == new_agent_id).ok_or_else(|| format!("new agent not found: {new_agent_id}"))?; let targets = RuntimeKind::all(); let old_bundle = bundle::bundle_from_local_agent(old_agent, targets.clone()); let new_bundle = bundle::bundle_from_local_agent(new_agent, targets); Ok(bundle_diff::diff_bundles(&old_bundle, &new_bundle)) }

#[tauri::command]
fn detect_runtimes(state: State<'_, AppState>) -> Result<Vec<RuntimeDetection>, String> { let detections = adapters::detect_all(); for detection in &detections { state.db.save_runtime_detection(detection).map_err(to_message)?; } Ok(detections) }
#[tauri::command]
fn runtime_definitions() -> Result<Vec<adapters::RuntimeDefinition>, String> { Ok(adapters::runtime_definitions()) }
#[tauri::command]
fn get_install_plan(agent_ids: Vec<String>, targets: Vec<InstallTarget>, state: State<'_, AppState>) -> Result<InstallPlan, String> { let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?; let selected = select_agents(all_agents, &agent_ids); installer::build_install_plan(&selected, &targets, &state.app_data_dir).map_err(to_message) }
#[tauri::command]
fn build_instruction_injection_plan(agent_id: String, runtime: RuntimeKind, project_dir: Option<String>, state: State<'_, AppState>) -> Result<InstructionInjectionPlan, String> { let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?; let agent = all_agents.iter().find(|agent| agent.id == agent_id).ok_or_else(|| format!("agent not found: {agent_id}"))?; let bundle = bundle::bundle_from_local_agent(agent, RuntimeKind::all()); Ok(instruction::build_instruction_plan(&bundle, runtime, project_dir.as_deref())) }
#[tauri::command]
fn build_mcp_config_plan(runtime: RuntimeKind, project_dir: Option<String>) -> Result<McpConfigPlan, String> { let servers = mcp::default_buddy_mcp_servers(); Ok(mcp_config::build_mcp_config_plan(runtime, &servers, project_dir.as_deref())) }

#[tauri::command]
fn install_agents(agent_ids: Vec<String>, targets: Vec<InstallTarget>, state: State<'_, AppState>) -> Result<Vec<InstallResult>, String> { let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?; let selected = select_agents(all_agents, &agent_ids); let mut results = Vec::new(); for target in targets { let outcome = installer::install_target(&selected, &target, &state.app_data_dir).map_err(to_message)?; for record in &outcome.records { state.db.save_installation(record).map_err(to_message)?; let payload = serde_json::to_string(record).map_err(to_message)?; state.db.save_sync_outbox_event(&outbox_event("agent_installation", &record.id, "agent.installation.created", payload)).map_err(to_message)?; state.db.save_audit_event(&audit_event("agent.install", "agent_installation", &record.id, Some(record.runtime), AuditSeverity::Info, "installed agent bundle into runtime")).map_err(to_message)?; } for backup in &outcome.backups { state.db.save_backup(backup).map_err(to_message)?; } for event in &outcome.events { state.db.save_install_event(event).map_err(to_message)?; } results.push(outcome.result); } Ok(results) }
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
fn scan_text_risk(content: String) -> Result<RiskScanReport, String> { Ok(risk::scan_text(&content)) }
#[tauri::command]
fn scan_generated_artifact(path: String) -> Result<RiskScanReport, String> { let content = generated::read_generated_artifact(&path).map_err(to_message)?; Ok(risk::scan_text(&content)) }
#[tauri::command]
fn list_default_mcp_servers() -> Result<Vec<mcp::McpServerConfig>, String> { Ok(mcp::default_buddy_mcp_servers()) }
#[tauri::command]
fn list_skill_targets() -> Result<Vec<skill::SkillTargetPath>, String> { Ok(skill::default_skill_targets()) }
#[tauri::command]
fn list_built_in_skills() -> Result<Vec<skill::SkillPackage>, String> { Ok(skill::built_in_buddy_skills()) }

#[tauri::command]
fn create_approval_request(runtime: Option<RuntimeKind>, action: String, resource_type: String, resource_id: String, reason: String, risk_level: String, state: State<'_, AppState>) -> Result<ApprovalRequest, String> { let risk = match risk_level.as_str() { "medium" => ApprovalRiskLevel::Medium, "high" => ApprovalRiskLevel::High, "critical" => ApprovalRiskLevel::Critical, _ => ApprovalRiskLevel::Low }; let request = approval::new_approval_request(runtime, action, resource_type, resource_id, reason, risk); state.db.save_audit_event(&audit_event("approval.request", "approval_request", &request.id, runtime, AuditSeverity::Security, "created approval request")).map_err(to_message)?; Ok(request) }
#[tauri::command]
fn resolve_approval_request(request: ApprovalRequest, status: String) -> Result<ApprovalRequest, String> { let status = match status.as_str() { "approved" => ApprovalStatus::Approved, "denied" => ApprovalStatus::Denied, "expired" => ApprovalStatus::Expired, _ => ApprovalStatus::Pending }; Ok(approval::resolve_request(request, status)) }
#[tauri::command]
fn repair_installation_plan(installation_id: String, state: State<'_, AppState>) -> Result<LifecyclePlan, String> { let installation = state.db.get_installation(&installation_id).map_err(to_message)?.ok_or_else(|| format!("installation not found: {installation_id}"))?; Ok(lifecycle::repair_plan(&installation)) }
#[tauri::command]
fn uninstall_installation_plan(installation_id: String, state: State<'_, AppState>) -> Result<LifecyclePlan, String> { let installation = state.db.get_installation(&installation_id).map_err(to_message)?.ok_or_else(|| format!("installation not found: {installation_id}"))?; Ok(lifecycle::uninstall_plan(&installation)) }
#[tauri::command]
fn upgrade_installation_plan(runtime: RuntimeKind, installation_id: Option<String>) -> Result<LifecyclePlan, String> { Ok(lifecycle::upgrade_plan(runtime, installation_id)) }

#[tauri::command]
fn initialize_default_knowledge_spaces(state: State<'_, AppState>) -> Result<Vec<KnowledgeSpace>, String> { let spaces = knowledge::default_local_spaces(); for space in &spaces { state.db.save_knowledge_space(space).map_err(to_message)?; } Ok(spaces) }
#[tauri::command]
fn list_knowledge_spaces(state: State<'_, AppState>) -> Result<Vec<KnowledgeSpace>, String> { state.db.list_knowledge_spaces().map_err(to_message) }
#[tauri::command]
fn list_knowledge_snapshots(state: State<'_, AppState>) -> Result<Vec<KnowledgeSnapshot>, String> { state.db.list_knowledge_snapshots().map_err(to_message) }
#[tauri::command]
fn create_knowledge_snapshot(space_id: String, version: String, manifest_path: String, state: State<'_, AppState>) -> Result<KnowledgeSnapshot, String> { let snapshot = knowledge::new_snapshot(space_id, version, manifest_path); state.db.save_knowledge_snapshot(&snapshot).map_err(to_message)?; Ok(snapshot) }
#[tauri::command]
fn list_memory_items(state: State<'_, AppState>) -> Result<Vec<MemoryItem>, String> { state.db.list_memory_items().map_err(to_message) }
#[tauri::command]
fn list_memory_candidates(state: State<'_, AppState>) -> Result<Vec<MemoryCandidate>, String> { state.db.list_memory_candidates().map_err(to_message) }
#[tauri::command]
fn propose_memory(content: String, scope: String, memory_type: String, source_session_id: Option<String>, state: State<'_, AppState>) -> Result<MemoryCandidate, String> { let candidate = memory::new_candidate(content, memory::parse_scope(&scope), memory::parse_type(&memory_type), source_session_id); state.db.save_memory_candidate(&candidate).map_err(to_message)?; state.db.save_audit_event(&audit_event("memory.propose", "memory_candidate", &candidate.id, None, AuditSeverity::Info, "created memory candidate")).map_err(to_message)?; Ok(candidate) }
#[tauri::command]
fn approve_memory_candidate(candidate_id: String, title: String, state: State<'_, AppState>) -> Result<MemoryItem, String> { let candidate = state.db.list_memory_candidates().map_err(to_message)?.into_iter().find(|item| item.id == candidate_id).ok_or_else(|| format!("memory candidate not found: {candidate_id}"))?; let item = memory::activate_candidate(&candidate, title); state.db.save_memory_item(&item).map_err(to_message)?; state.db.save_audit_event(&audit_event("memory.approve", "memory_item", &item.id, None, AuditSeverity::Info, "approved memory candidate")).map_err(to_message)?; Ok(item) }
#[tauri::command]
fn append_session_event(session_id: String, runtime: Option<RuntimeKind>, event_type: String, payload_json: String, state: State<'_, AppState>) -> Result<SessionEvent, String> { let event = session::new_event(session_id, runtime, session::parse_event_type(&event_type), payload_json); state.db.save_session_event(&event).map_err(to_message)?; Ok(event) }
#[tauri::command]
fn list_session_events(state: State<'_, AppState>) -> Result<Vec<SessionEvent>, String> { state.db.list_session_events().map_err(to_message) }
#[tauri::command]
fn list_handoff_packs(state: State<'_, AppState>) -> Result<Vec<HandoffPack>, String> { state.db.list_handoff_packs().map_err(to_message) }
#[tauri::command]
fn create_handoff_pack(session_id: String, from_runtime: Option<RuntimeKind>, to_runtime: Option<RuntimeKind>, goal: String, summary: String, state: State<'_, AppState>) -> Result<HandoffPack, String> { let handoff = session::new_handoff(session_id, from_runtime, to_runtime, goal, summary); state.db.save_handoff_pack(&handoff).map_err(to_message)?; state.db.save_audit_event(&audit_event("handoff.create", "handoff_pack", &handoff.id, from_runtime, AuditSeverity::Info, "created handoff pack")).map_err(to_message)?; Ok(handoff) }
#[tauri::command]
fn restore_backup(backup_id: String, state: State<'_, AppState>) -> Result<(), String> { let backup = state.db.get_backup(&backup_id).map_err(to_message)?.ok_or_else(|| format!("backup not found: {backup_id}"))?; let event = installer::restore_backup(&backup).map_err(to_message)?; state.db.save_install_event(&event).map_err(to_message)?; state.db.save_audit_event(&audit_event("backup.restore", "install_backup", backup_id, Some(backup.runtime), AuditSeverity::Warn, "restored install backup")).map_err(to_message)?; Ok(()) }
#[tauri::command]
fn uninstall_installation(installation_id: String, state: State<'_, AppState>) -> Result<(), String> { if let Some(record) = state.db.get_installation(&installation_id).map_err(to_message)? { installer::remove_installation(&record).map_err(to_message)?; state.db.delete_installation(&installation_id).map_err(to_message)?; state.db.save_audit_event(&audit_event("agent.uninstall", "agent_installation", installation_id, Some(record.runtime), AuditSeverity::Warn, "removed installed agent files")).map_err(to_message)?; } Ok(()) }
#[tauri::command]
fn run_doctor(state: State<'_, AppState>) -> Result<DoctorReport, String> { Ok(doctor::run_doctor(&state.app_data_dir)) }
#[tauri::command]
fn parse_deeplink(url: String) -> Result<DeepLinkRequest, String> { deeplink::parse_deeplink(&url).map_err(to_message) }

fn select_agents(all_agents: Vec<domain::LocalAgent>, agent_ids: &[String]) -> Vec<domain::LocalAgent> { all_agents.into_iter().filter(|agent| agent_ids.is_empty() || agent_ids.contains(&agent.id)).collect() }
fn to_message(error: impl std::fmt::Display) -> String { error.to_string() }

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| { let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".agent-buddy")); let db = Arc::new(Database::init(&app_data_dir).map_err(tauri::Error::Anyhow)?); app.manage(AppState { db, app_data_dir }); Ok(()) })
        .invoke_handler(tauri::generate_handler![
            load_settings, save_settings, get_paas_connection_status, create_paas_session,
            preview_paas_sync, refresh_agent_source, list_agents, build_agent_bundles,
            build_bundle_diff, detect_runtimes, runtime_definitions, get_install_plan,
            build_instruction_injection_plan, build_mcp_config_plan, install_agents,
            list_installations, list_install_backups, list_install_events, list_audit_events,
            list_sync_outbox, list_generated_artifacts, read_generated_artifact, scan_text_risk,
            scan_generated_artifact, list_default_mcp_servers, list_skill_targets, list_built_in_skills,
            create_approval_request, resolve_approval_request, repair_installation_plan,
            uninstall_installation_plan, upgrade_installation_plan, initialize_default_knowledge_spaces,
            list_knowledge_spaces, list_knowledge_snapshots, create_knowledge_snapshot,
            list_memory_items, list_memory_candidates, propose_memory, approve_memory_candidate,
            append_session_event, list_session_events, list_handoff_packs, create_handoff_pack,
            restore_backup, uninstall_installation, run_doctor, parse_deeplink
        ])
        .run(tauri::generate_context!())
        .expect("error while running Agent Buddy");
}
