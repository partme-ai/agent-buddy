mod adapters;
mod approval;
mod audit;
mod bundle;
mod bundle_catalog;
mod bundle_diff;
mod console_core;
mod database;
mod deeplink;
mod doctor;
mod domain;
mod generated;
mod installer;
mod instruction;
mod instance;
mod knowledge;
mod knowledge_package;
mod lifecycle;
mod local_api;
mod local_daemon;
mod local_store;
mod marketplace;
mod mcp;
mod mcp_config;
mod memory;
mod memory_sync;
mod paas;
mod risk;
mod runtime;
mod runtime_adapters;
mod runtime_config;
mod runtime_execution;
mod runtime_status;
mod session;
mod session_scanner;
mod settings;
mod skill;
mod source;
mod source_inspector;
mod sync;
mod sync_engine;

use approval::{ApprovalRequest, ApprovalRiskLevel, ApprovalStatus};
use audit::{audit_event, AuditEvent, AuditSeverity};
use bundle::AgentBundle;
use bundle_catalog::BundleCatalogItem;
use bundle_diff::AgentBundleDiff;
use database::Database;
use deeplink::DeepLinkRequest;
use doctor::DoctorReport;
use domain::{AgentSourceSummary, LocalAgentSummary, SourceImportRequest, SourceRefreshResult};
use generated::GeneratedArtifact;
use instruction::InstructionInjectionPlan;
use instance::{InstanceGroupRecord, InstanceGroupSummary, InstanceGroupUpsertRequest, InstanceRecord, InstanceUpsertRequest};
use knowledge::{KnowledgeSnapshot, KnowledgeSpace};
use knowledge_package::{KnowledgeContextPack, KnowledgeMirrorPlan};
use lifecycle::LifecyclePlan;
use local_api::LocalApiSpec;
use marketplace::{MarketplaceSource, McpInstallPlan, McpInstallRequest, SkillInstallPlan, SkillInstallRequest};
use mcp_config::McpConfigPlan;
use memory::{MemoryCandidate, MemoryItem, MemoryStatus};
use memory_sync::{MemoryInitPlan, MemoryWritebackPlan};
use paas::{BundlePullRequest, DeviceRegistrationRequest, PaasBundleSummary, PaasConnectionInfo, PaasConnectionStatus, PaasHttpResult, PaasLoginRequest, PaasSession, PaasSyncPreview};
use risk::RiskScanReport;
use runtime::{AgentInstallation, InstallBackup, InstallEvent, InstallPlan, InstallResult, InstallTarget, RuntimeDetection, RuntimeKind};
use runtime_config::RuntimeConfigPreview;
use runtime_status::BuddyStatusReport;
use session::{HandoffPack, SessionEvent};
use session_scanner::SessionSyncPlan;
use settings::AgentBuddySettings;
use source_inspector::{AgentMarkdownPreview, AgentRuntimeConversionPreview, AgentSourceDetail, SourceImportRiskPreview};
use std::path::PathBuf;
use std::sync::Arc;
use sync::{outbox_event, SyncOutboxEvent, SyncStatus};
use sync_engine::SyncFlushPlan;
use tauri::{Manager, State};

struct AppState { db: Arc<Database>, app_data_dir: PathBuf, daemon: Arc<local_daemon::LocalDaemonControl> }

#[tauri::command]
fn load_settings(state: State<'_, AppState>) -> Result<AgentBuddySettings, String> { settings::load_settings(&state.app_data_dir).map_err(to_message) }
#[tauri::command]
fn save_settings(settings: AgentBuddySettings, state: State<'_, AppState>) -> Result<AgentBuddySettings, String> { settings::save_settings(&state.app_data_dir, &settings).map_err(to_message)?; state.db.save_audit_event(&audit_event("settings.save", "settings", "local", None, AuditSeverity::Info, "saved local settings")).map_err(to_message)?; Ok(settings) }
#[tauri::command]
fn get_paas_connection_status(state: State<'_, AppState>) -> Result<PaasConnectionStatus, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let session = paas::load_session(&state.app_data_dir).map_err(to_message)?; Ok(paas::connection_status(settings.paas_base_url, session)) }
#[tauri::command]
fn get_paas_connection_info(state: State<'_, AppState>) -> Result<PaasConnectionInfo, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; Ok(paas::connection_info(&settings)) }
#[tauri::command]
fn preview_device_registration(state: State<'_, AppState>) -> Result<DeviceRegistrationRequest, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; Ok(paas::device_registration_request(&settings)) }
#[tauri::command]
fn preview_bundle_pull_request(state: State<'_, AppState>) -> Result<BundlePullRequest, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let targets = RuntimeKind::all().into_iter().map(runtime::runtime_to_str).map(str::to_string).collect(); Ok(paas::bundle_pull_request(&settings, targets)) }
#[tauri::command]
fn create_paas_session(request: PaasLoginRequest, state: State<'_, AppState>) -> Result<PaasSession, String> { let session = paas::save_session(&state.app_data_dir, request).map_err(to_message)?; state.db.save_audit_event(&audit_event("paas.session.create", "paas_session", &session.id, None, AuditSeverity::Info, "stored local PaaS session")).map_err(to_message)?; Ok(session) }
#[tauri::command]
fn clear_paas_session(state: State<'_, AppState>) -> Result<(), String> { paas::clear_session(&state.app_data_dir).map_err(to_message)?; state.db.save_audit_event(&audit_event("paas.session.clear", "paas_session", "local", None, AuditSeverity::Warn, "cleared local PaaS session")).map_err(to_message)?; Ok(()) }
#[tauri::command]
fn execute_device_registration(state: State<'_, AppState>) -> Result<PaasHttpResult, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let result = paas::execute_device_registration(&state.app_data_dir, &settings).map_err(to_message)?; state.db.save_audit_event(&audit_event("paas.device.register", "paas", "device", None, AuditSeverity::Info, format!("device registration ok={} status={:?}", result.ok, result.status_code))).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn pull_paas_bundles(state: State<'_, AppState>) -> Result<PaasHttpResult, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let workspace_id = paas::load_session(&state.app_data_dir).map_err(to_message)?.map(|session| session.workspace_id); let targets = RuntimeKind::all().into_iter().map(runtime::runtime_to_str).map(str::to_string).collect(); let result = paas::execute_bundle_pull(&state.app_data_dir, &settings, targets).map_err(to_message)?; if result.ok { match local_store::cache_bundle_pull_response(&state.app_data_dir, workspace_id, &result.response_body) { Ok(entries) => { state.db.save_audit_event(&audit_event("paas.bundle.cache", "paas_bundle_cache", "batch", None, AuditSeverity::Info, format!("cached {} PaaS bundle(s)", entries.len()))).map_err(to_message)?; }, Err(error) => { state.db.save_audit_event(&audit_event("paas.bundle.cache.failed", "paas_bundle_cache", "batch", None, AuditSeverity::Warn, format!("PaaS bundle response was not cached: {error}"))).map_err(to_message)?; } } } state.db.save_audit_event(&audit_event("paas.bundle.pull", "paas", "bundles", None, AuditSeverity::Info, format!("bundle pull ok={} status={:?}", result.ok, result.status_code))).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn push_sync_outbox(state: State<'_, AppState>) -> Result<PaasHttpResult, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let events = state.db.list_sync_outbox().map_err(to_message)?.into_iter().filter(|event| matches!(event.status, SyncStatus::Pending | SyncStatus::Failed)).collect::<Vec<_>>(); let event_ids = events.iter().map(|event| event.id.clone()).collect::<Vec<_>>(); let result = paas::execute_sync_push(&state.app_data_dir, &settings, events).map_err(to_message)?; let writeback = local_store::update_sync_outbox_after_push(&state.app_data_dir, &event_ids, result.ok).map_err(to_message)?; state.db.save_audit_event(&audit_event("paas.sync.push", "sync_outbox", "batch", None, AuditSeverity::Info, format!("sync push ok={} status={:?}; writeback status={} updated={}/{}", result.ok, result.status_code, writeback.status, writeback.updated, writeback.requested))).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn preview_paas_sync(state: State<'_, AppState>) -> Result<PaasSyncPreview, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let events = state.db.list_sync_outbox().map_err(to_message)?.into_iter().map(|event| event.event_type).collect(); Ok(paas::preview_sync(settings.paas_base_url, events)) }
#[tauri::command]
fn list_schema_migrations(state: State<'_, AppState>) -> Result<Vec<local_store::SchemaMigrationRecord>, String> { local_store::list_schema_migrations(&state.app_data_dir).map_err(to_message) }
#[tauri::command]
fn list_paas_bundle_cache(state: State<'_, AppState>) -> Result<Vec<local_store::PaasBundleCacheEntry>, String> { local_store::list_paas_bundle_cache(&state.app_data_dir).map_err(to_message) }
#[tauri::command]
fn get_paas_bundle_cache_entry(bundle_id: String, version: String, state: State<'_, AppState>) -> Result<Option<local_store::PaasBundleCacheEntry>, String> { local_store::get_paas_bundle_cache_entry(&state.app_data_dir, &bundle_id, &version).map_err(to_message) }
#[tauri::command]
fn build_cached_paas_bundle(bundle_id: String, version: String, state: State<'_, AppState>) -> Result<AgentBundle, String> { local_store::build_cached_paas_bundle(&state.app_data_dir, &bundle_id, &version).map_err(to_message) }
#[tauri::command]
fn build_cached_paas_bundle_install_plan(bundle_id: String, version: String, targets: Vec<InstallTarget>, state: State<'_, AppState>) -> Result<InstallPlan, String> { let bundle = local_store::build_cached_paas_bundle(&state.app_data_dir, &bundle_id, &version).map_err(to_message)?; installer::build_bundle_install_plan(&bundle, &targets, &state.app_data_dir).map_err(to_message) }
#[tauri::command]
fn install_cached_paas_bundle(bundle_id: String, version: String, targets: Vec<InstallTarget>, state: State<'_, AppState>) -> Result<Vec<InstallResult>, String> { let bundle = local_store::build_cached_paas_bundle(&state.app_data_dir, &bundle_id, &version).map_err(to_message)?; let plan = installer::build_bundle_install_plan(&bundle, &targets, &state.app_data_dir).map_err(to_message)?; let resolved_targets = if targets.is_empty() { plan.targets.iter().map(|target| InstallTarget { runtime: target.runtime, project_dir: None, custom_dir: None, category_filters: Vec::new() }).collect::<Vec<_>>() } else { targets }; let mut results = Vec::new(); for target in resolved_targets { let outcome = installer::install_bundle_target(&bundle, &target, &state.app_data_dir).map_err(to_message)?; for record in &outcome.records { state.db.save_installation(record).map_err(to_message)?; let payload = serde_json::to_string(record).map_err(to_message)?; state.db.save_sync_outbox_event(&outbox_event("agent_installation", &record.id, "agent.installation.created", payload)).map_err(to_message)?; state.db.save_audit_event(&audit_event("paas.bundle.install", "agent_installation", &record.id, Some(record.runtime), AuditSeverity::Info, format!("installed cached PaaS bundle {}@{}", bundle.bundle_id, bundle.version))).map_err(to_message)?; } for backup in &outcome.backups { state.db.save_backup(backup).map_err(to_message)?; } for event in &outcome.events { state.db.save_install_event(event).map_err(to_message)?; } results.push(outcome.result); } Ok(results) }
#[tauri::command]
fn build_sync_flush_plan(state: State<'_, AppState>) -> Result<SyncFlushPlan, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let events = state.db.list_sync_outbox().map_err(to_message)?; Ok(sync_engine::build_flush_plan(&settings, &events)) }
#[tauri::command]
fn get_overview_dashboard(state: State<'_, AppState>) -> Result<console_core::ConsoleOverviewDashboard, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let runtimes = adapters::detect_all(); let installations = state.db.list_installations().map_err(to_message)?; let agents_count = source::list_agents(&state.app_data_dir).map_err(to_message)?.len(); let sessions = state.db.list_session_events().map_err(to_message)?; let sync_events = state.db.list_sync_outbox().map_err(to_message)?; let audits = state.db.list_audit_events().map_err(to_message)?; Ok(console_core::build_overview_dashboard(&settings, runtimes, installations, agents_count, sessions, sync_events, audits)) }
#[tauri::command]
fn get_health_board(state: State<'_, AppState>) -> Result<console_core::ConsoleHealthBoard, String> { let doctor = doctor::run_doctor(&state.app_data_dir); let runtimes = adapters::detect_all(); let audits = state.db.list_audit_events().map_err(to_message)?; let installs = state.db.list_install_events().map_err(to_message)?; let sync_events = state.db.list_sync_outbox().map_err(to_message)?; Ok(console_core::build_health_board(doctor, runtimes, audits, installs, sync_events)) }
#[tauri::command]
fn list_console_instances(state: State<'_, AppState>) -> Result<Vec<console_core::ConsoleInstance>, String> { build_console_instances_from_state(&state) }
#[tauri::command]
fn list_console_instance_groups(state: State<'_, AppState>) -> Result<Vec<console_core::ConsoleInstanceGroup>, String> { let instances = build_console_instances_from_state(&state)?; Ok(console_core::build_instance_groups(&instances)) }
#[tauri::command]
fn preview_retention_cleanup_plan(state: State<'_, AppState>) -> Result<console_core::RetentionCleanupPlan, String> { build_retention_plan_from_state(&state) }
#[tauri::command]
fn execute_retention_cleanup(confirm: bool, state: State<'_, AppState>) -> Result<console_core::RetentionCleanupResult, String> { if !confirm { return Err("retention cleanup requires confirm=true".to_string()); } let plan = build_retention_plan_from_state(&state)?; let result = console_core::execute_retention_cleanup(&plan); let message = format!("retention cleanup deleted {} item(s), failed {} item(s), bytes {}", result.deleted.len(), result.failed.len(), result.total_deleted_bytes); state.db.save_audit_event(&audit_event("retention.cleanup.execute", "retention_cleanup", "local", None, AuditSeverity::Warn, message)).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn preview_local_daemon_plan() -> Result<console_core::LocalDaemonPlan, String> { Ok(console_core::build_local_daemon_plan(local_api::default_local_api_spec(), mcp::default_buddy_mcp_servers())) }
#[tauri::command]
fn start_local_daemon(state: State<'_, AppState>) -> Result<local_daemon::LocalDaemonStartResult, String> { let result = state.daemon.start(local_api::default_local_api_spec(), mcp::default_buddy_mcp_servers()).map_err(to_message)?; state.db.save_audit_event(&audit_event("local_daemon.start", "local_daemon", "agent-buddy", None, AuditSeverity::Info, result.message.clone())).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn stop_local_daemon(state: State<'_, AppState>) -> Result<local_daemon::LocalDaemonStopResult, String> { let result = state.daemon.stop(); state.db.save_audit_event(&audit_event("local_daemon.stop", "local_daemon", "agent-buddy", None, AuditSeverity::Warn, result.message.clone())).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn get_local_daemon_status(state: State<'_, AppState>) -> Result<local_daemon::LocalDaemonStatus, String> { Ok(state.daemon.status()) }
#[tauri::command]
fn upsert_instance(request: InstanceUpsertRequest, state: State<'_, AppState>) -> Result<InstanceRecord, String> { let record = instance::new_instance(request); state.db.save_instance(&record).map_err(to_message)?; state.db.save_audit_event(&audit_event("instance.upsert", "instance", &record.id, record.runtime, AuditSeverity::Info, "saved console instance")).map_err(to_message)?; Ok(record) }
#[tauri::command]
fn list_persisted_instances(state: State<'_, AppState>) -> Result<Vec<InstanceRecord>, String> { state.db.list_instances().map_err(to_message) }
#[tauri::command]
fn delete_persisted_instance(instance_id: String, state: State<'_, AppState>) -> Result<(), String> { state.db.delete_instance(&instance_id).map_err(to_message)?; state.db.save_audit_event(&audit_event("instance.delete", "instance", instance_id, None, AuditSeverity::Warn, "deleted console instance")).map_err(to_message)?; Ok(()) }
#[tauri::command]
fn set_instance_tags(instance_id: String, tags: Vec<String>, state: State<'_, AppState>) -> Result<Option<InstanceRecord>, String> { let result = state.db.set_instance_tags(&instance_id, &tags).map_err(to_message)?; state.db.save_audit_event(&audit_event("instance.tags.set", "instance", instance_id, None, AuditSeverity::Info, "updated console instance tags")).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn assign_instance_group(instance_id: String, group_id: Option<String>, state: State<'_, AppState>) -> Result<Option<InstanceRecord>, String> { let result = state.db.assign_instance_group(&instance_id, group_id).map_err(to_message)?; state.db.save_audit_event(&audit_event("instance.group.assign", "instance", instance_id, None, AuditSeverity::Info, "assigned console instance group")).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn upsert_instance_group(request: InstanceGroupUpsertRequest, state: State<'_, AppState>) -> Result<InstanceGroupRecord, String> { let group = instance::new_group(request); state.db.save_instance_group(&group).map_err(to_message)?; state.db.save_audit_event(&audit_event("instance_group.upsert", "instance_group", &group.id, None, AuditSeverity::Info, "saved console instance group")).map_err(to_message)?; Ok(group) }
#[tauri::command]
fn list_persisted_instance_groups(state: State<'_, AppState>) -> Result<Vec<InstanceGroupRecord>, String> { state.db.list_instance_groups().map_err(to_message) }
#[tauri::command]
fn list_persisted_instance_group_summaries(state: State<'_, AppState>) -> Result<Vec<InstanceGroupSummary>, String> { state.db.list_instance_group_summaries().map_err(to_message) }
#[tauri::command]
fn delete_persisted_instance_group(group_id: String, state: State<'_, AppState>) -> Result<(), String> { state.db.delete_instance_group(&group_id).map_err(to_message)?; state.db.save_audit_event(&audit_event("instance_group.delete", "instance_group", group_id, None, AuditSeverity::Warn, "deleted console instance group")).map_err(to_message)?; Ok(()) }
#[tauri::command]
fn refresh_agent_source(state: State<'_, AppState>) -> Result<SourceRefreshResult, String> { let result = source::refresh_source(&state.app_data_dir).map_err(to_message)?; state.db.save_source_refresh(&result).map_err(to_message)?; state.db.save_audit_event(&audit_event("source.refresh", "agent_source", &result.source_id, None, AuditSeverity::Info, "refreshed default agent source")).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn import_agent_source(request: SourceImportRequest, state: State<'_, AppState>) -> Result<SourceRefreshResult, String> { let result = source::import_or_refresh_source(&state.app_data_dir, request).map_err(to_message)?; state.db.save_source_refresh(&result).map_err(to_message)?; state.db.save_audit_event(&audit_event("source.import", "agent_source", &result.source_id, None, AuditSeverity::Info, "imported local agent source")).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn import_agent_source_from_deeplink(url: String, state: State<'_, AppState>) -> Result<SourceRefreshResult, String> { let parsed = deeplink::parse_deeplink(&url).map_err(to_message)?; let source_url = parsed.params.get("url").or_else(|| parsed.params.get("repo")).or_else(|| parsed.params.get("source")).cloned().ok_or_else(|| "install-source deeplink requires url, repo, or source parameter".to_string())?; let request = SourceImportRequest { source_url, name: parsed.params.get("name").cloned(), branch: parsed.params.get("branch").cloned(), source_kind: parsed.params.get("kind").cloned() }; import_agent_source(request, state) }
#[tauri::command]
fn preview_source_import_risk(request: SourceImportRequest) -> Result<SourceImportRiskPreview, String> { Ok(source_inspector::source_import_risk_preview(request)) }
#[tauri::command]
fn refresh_agent_source_by_id(source_id: String, state: State<'_, AppState>) -> Result<SourceRefreshResult, String> { let result = source::refresh_source_by_id(&state.app_data_dir, &source_id).map_err(to_message)?; state.db.save_source_refresh(&result).map_err(to_message)?; state.db.save_audit_event(&audit_event("source.refresh", "agent_source", &result.source_id, None, AuditSeverity::Info, "refreshed selected agent source")).map_err(to_message)?; Ok(result) }
#[tauri::command]
fn list_agent_sources(state: State<'_, AppState>) -> Result<Vec<AgentSourceSummary>, String> { source::list_sources(&state.app_data_dir).map_err(to_message) }
#[tauri::command]
fn get_agent_source_detail(source_id: String, state: State<'_, AppState>) -> Result<AgentSourceDetail, String> { source_inspector::source_detail(&state.app_data_dir, &source_id).map_err(to_message) }
#[tauri::command]
fn get_agent_markdown(agent_id: String, state: State<'_, AppState>) -> Result<AgentMarkdownPreview, String> { source_inspector::markdown_preview(&state.app_data_dir, &agent_id).map_err(to_message) }
#[tauri::command]
fn preview_agent_runtime_conversion(agent_id: String, runtime: RuntimeKind, state: State<'_, AppState>) -> Result<AgentRuntimeConversionPreview, String> { source_inspector::runtime_conversion_preview(&state.app_data_dir, &agent_id, runtime).map_err(to_message) }
#[tauri::command]
fn list_bundle_catalog(state: State<'_, AppState>) -> Result<Vec<BundleCatalogItem>, String> { bundle_catalog::list_bundle_catalog(&state.app_data_dir).map_err(to_message) }
#[tauri::command]
fn build_local_source_bundle(agent_id: String, state: State<'_, AppState>) -> Result<AgentBundle, String> { source_inspector::build_local_bundle(&state.app_data_dir, &agent_id).map_err(to_message) }
#[tauri::command]
fn build_source_bundle_diff(old_agent_id: String, new_agent_id: String, state: State<'_, AppState>) -> Result<AgentBundleDiff, String> { source_inspector::source_bundle_diff(&state.app_data_dir, &old_agent_id, &new_agent_id).map_err(to_message) }
#[tauri::command]
fn list_agents(state: State<'_, AppState>) -> Result<Vec<LocalAgentSummary>, String> { let agents = source::list_agents(&state.app_data_dir).map_err(to_message)?; Ok(agents.iter().map(LocalAgentSummary::from).collect()) }
#[tauri::command]
fn list_agents_for_source(source_id: String, state: State<'_, AppState>) -> Result<Vec<LocalAgentSummary>, String> { let agents = source::list_agents_for_source(&state.app_data_dir, &source_id).map_err(to_message)?; Ok(agents.iter().map(LocalAgentSummary::from).collect()) }
#[tauri::command]
fn build_agent_bundles(agent_ids: Vec<String>, state: State<'_, AppState>) -> Result<Vec<AgentBundle>, String> { let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?; let selected = select_agents(all_agents, &agent_ids); let targets = RuntimeKind::all(); Ok(selected.iter().map(|agent| bundle::bundle_from_local_agent(agent, targets.clone())).collect()) }
#[tauri::command]
fn summarize_local_bundles(agent_ids: Vec<String>, state: State<'_, AppState>) -> Result<Vec<PaasBundleSummary>, String> { Ok(build_agent_bundles(agent_ids, state)?.iter().map(paas::summarize_bundle).collect()) }
#[tauri::command]
fn build_bundle_diff(old_agent_id: String, new_agent_id: String, state: State<'_, AppState>) -> Result<AgentBundleDiff, String> { build_source_bundle_diff(old_agent_id, new_agent_id, state) }
#[tauri::command]
fn detect_runtimes(state: State<'_, AppState>) -> Result<Vec<RuntimeDetection>, String> { let detections = adapters::detect_all(); for detection in &detections { state.db.save_runtime_detection(detection).map_err(to_message)?; } Ok(detections) }
#[tauri::command]
fn runtime_definitions() -> Result<Vec<adapters::RuntimeDefinition>, String> { Ok(adapters::runtime_definitions()) }
#[tauri::command]
fn build_buddy_status_report(state: State<'_, AppState>) -> Result<BuddyStatusReport, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let detections = adapters::detect_all(); let installations = state.db.list_installations().map_err(to_message)?; Ok(runtime_status::build_status_report(settings.device_id, detections, installations)) }
#[tauri::command]
fn list_local_api_spec() -> Result<LocalApiSpec, String> { Ok(local_api::default_local_api_spec()) }
#[tauri::command]
fn get_install_plan(agent_ids: Vec<String>, targets: Vec<InstallTarget>, state: State<'_, AppState>) -> Result<InstallPlan, String> { let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?; let selected = select_agents(all_agents, &agent_ids); installer::build_install_plan(&selected, &targets, &state.app_data_dir).map_err(to_message) }
#[tauri::command]
fn build_instruction_injection_plan(agent_id: String, runtime: RuntimeKind, project_dir: Option<String>, state: State<'_, AppState>) -> Result<InstructionInjectionPlan, String> { let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?; let agent = all_agents.iter().find(|agent| agent.id == agent_id).ok_or_else(|| format!("agent not found: {agent_id}"))?; let bundle = bundle::bundle_from_local_agent(agent, RuntimeKind::all()); Ok(instruction::build_instruction_plan(&bundle, runtime, project_dir.as_deref())) }
#[tauri::command]
fn build_mcp_config_plan(runtime: RuntimeKind, project_dir: Option<String>) -> Result<McpConfigPlan, String> { let servers = mcp::default_buddy_mcp_servers(); Ok(mcp_config::build_mcp_config_plan(runtime, &servers, project_dir.as_deref())) }
#[tauri::command]
fn build_runtime_mcp_config_preview(runtime: RuntimeKind) -> Result<RuntimeConfigPreview, String> { let servers = mcp::default_buddy_mcp_servers(); Ok(runtime_config::mcp_config_preview(runtime, &servers)) }
#[tauri::command]
fn list_marketplace_sources() -> Result<Vec<MarketplaceSource>, String> { Ok(marketplace::default_marketplace_sources()) }
#[tauri::command]
fn build_skill_install_plan(request: SkillInstallRequest, state: State<'_, AppState>) -> Result<SkillInstallPlan, String> { Ok(marketplace::build_skill_install_plan(request, &state.app_data_dir)) }
#[tauri::command]
fn build_marketplace_mcp_install_plan(request: McpInstallRequest) -> Result<McpInstallPlan, String> { Ok(marketplace::build_mcp_install_plan(request)) }
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
fn build_wiki_mirror_plan(space_id: String, state: State<'_, AppState>) -> Result<KnowledgeMirrorPlan, String> { Ok(knowledge_package::build_wiki_mirror_plan(space_id, &state.app_data_dir)) }
#[tauri::command]
fn build_rag_mirror_plan(space_id: String, state: State<'_, AppState>) -> Result<KnowledgeMirrorPlan, String> { Ok(knowledge_package::build_rag_mirror_plan(space_id, &state.app_data_dir)) }
#[tauri::command]
fn build_knowledge_context_pack(query: String, space_ids: Vec<String>) -> Result<KnowledgeContextPack, String> { Ok(knowledge_package::build_context_pack(query, space_ids)) }
#[tauri::command]
fn search_knowledge_runtime(query: String, space_ids: Vec<String>, state: State<'_, AppState>) -> Result<runtime_execution::KnowledgeRuntimeSearchResult, String> { let spaces = state.db.list_knowledge_spaces().map_err(to_message)?; let snapshots = state.db.list_knowledge_snapshots().map_err(to_message)?; Ok(runtime_execution::search_knowledge_runtime(query, space_ids, spaces, snapshots, &state.app_data_dir)) }
#[tauri::command]
fn list_memory_items(state: State<'_, AppState>) -> Result<Vec<MemoryItem>, String> { state.db.list_memory_items().map_err(to_message) }
#[tauri::command]
fn list_memory_candidates(state: State<'_, AppState>) -> Result<Vec<MemoryCandidate>, String> { state.db.list_memory_candidates().map_err(to_message) }
#[tauri::command]
fn propose_memory(content: String, scope: String, memory_type: String, source_session_id: Option<String>, state: State<'_, AppState>) -> Result<MemoryCandidate, String> { let candidate = memory::new_candidate(content, memory::parse_scope(&scope), memory::parse_type(&memory_type), source_session_id); state.db.save_memory_candidate(&candidate).map_err(to_message)?; state.db.save_audit_event(&audit_event("memory.propose", "memory_candidate", &candidate.id, None, AuditSeverity::Info, "created memory candidate")).map_err(to_message)?; Ok(candidate) }
#[tauri::command]
fn approve_memory_candidate(candidate_id: String, title: String, state: State<'_, AppState>) -> Result<MemoryItem, String> { let candidate = state.db.list_memory_candidates().map_err(to_message)?.into_iter().find(|item| item.id == candidate_id).ok_or_else(|| format!("memory candidate not found: {candidate_id}"))?; let item = memory::activate_candidate(&candidate, title); state.db.save_memory_item(&item).map_err(to_message)?; state.db.save_audit_event(&audit_event("memory.approve", "memory_item", &item.id, None, AuditSeverity::Info, "approved memory candidate")).map_err(to_message)?; Ok(item) }
#[tauri::command]
fn build_memory_init_plan(scopes: Vec<String>) -> Result<MemoryInitPlan, String> { Ok(memory_sync::build_init_plan(scopes.iter().map(|scope| memory::parse_scope(scope)).collect())) }
#[tauri::command]
fn build_memory_writeback_plan(state: State<'_, AppState>) -> Result<MemoryWritebackPlan, String> { let candidates = state.db.list_memory_candidates().map_err(to_message)?; let items = state.db.list_memory_items().map_err(to_message)?; Ok(memory_sync::build_writeback_plan(candidates, items)) }
#[tauri::command]
fn search_memory_runtime(query: String, state: State<'_, AppState>) -> Result<runtime_execution::MemoryRuntimeSearchResult, String> { let items = state.db.list_memory_items().map_err(to_message)?; let candidates = state.db.list_memory_candidates().map_err(to_message)?; Ok(runtime_execution::search_memory_runtime(query, items, candidates)) }
#[tauri::command]
fn update_memory_item(item_id: String, title: Option<String>, content: Option<String>, state: State<'_, AppState>) -> Result<MemoryItem, String> { let item = state.db.list_memory_items().map_err(to_message)?.into_iter().find(|item| item.id == item_id).ok_or_else(|| format!("memory item not found: {item_id}"))?; let updated = runtime_execution::update_memory_item(item, title, content); state.db.save_memory_item(&updated).map_err(to_message)?; state.db.save_audit_event(&audit_event("memory.item.update", "memory_item", &updated.id, None, AuditSeverity::Info, "updated memory item")).map_err(to_message)?; Ok(updated) }
#[tauri::command]
fn archive_memory_item(item_id: String, state: State<'_, AppState>) -> Result<MemoryItem, String> { let item = state.db.list_memory_items().map_err(to_message)?.into_iter().find(|item| item.id == item_id).ok_or_else(|| format!("memory item not found: {item_id}"))?; let updated = runtime_execution::set_memory_item_status(item, MemoryStatus::Archived); state.db.save_memory_item(&updated).map_err(to_message)?; state.db.save_audit_event(&audit_event("memory.item.archive", "memory_item", &updated.id, None, AuditSeverity::Warn, "archived memory item")).map_err(to_message)?; Ok(updated) }
#[tauri::command]
fn delete_memory_item(item_id: String, state: State<'_, AppState>) -> Result<(), String> { state.db.delete_memory_item(&item_id).map_err(to_message)?; state.db.save_audit_event(&audit_event("memory.item.delete", "memory_item", item_id, None, AuditSeverity::Warn, "deleted memory item")).map_err(to_message)?; Ok(()) }
#[tauri::command]
fn reject_memory_candidate(candidate_id: String, state: State<'_, AppState>) -> Result<MemoryCandidate, String> { let candidate = state.db.list_memory_candidates().map_err(to_message)?.into_iter().find(|item| item.id == candidate_id).ok_or_else(|| format!("memory candidate not found: {candidate_id}"))?; let rejected = runtime_execution::set_memory_candidate_status(candidate, MemoryStatus::Rejected); state.db.save_memory_candidate(&rejected).map_err(to_message)?; state.db.save_audit_event(&audit_event("memory.candidate.reject", "memory_candidate", &rejected.id, None, AuditSeverity::Warn, "rejected memory candidate")).map_err(to_message)?; Ok(rejected) }
#[tauri::command]
fn append_session_event(session_id: String, runtime: Option<RuntimeKind>, event_type: String, payload_json: String, state: State<'_, AppState>) -> Result<SessionEvent, String> { let event = session::new_event(session_id, runtime, session::parse_event_type(&event_type), payload_json); state.db.save_session_event(&event).map_err(to_message)?; Ok(event) }
#[tauri::command]
fn list_session_events(state: State<'_, AppState>) -> Result<Vec<SessionEvent>, String> { state.db.list_session_events().map_err(to_message) }
#[tauri::command]
fn list_handoff_packs(state: State<'_, AppState>) -> Result<Vec<HandoffPack>, String> { state.db.list_handoff_packs().map_err(to_message) }
#[tauri::command]
fn create_handoff_pack(session_id: String, from_runtime: Option<RuntimeKind>, to_runtime: Option<RuntimeKind>, goal: String, summary: String, state: State<'_, AppState>) -> Result<HandoffPack, String> { let handoff = session::new_handoff(session_id, from_runtime, to_runtime, goal, summary); state.db.save_handoff_pack(&handoff).map_err(to_message)?; state.db.save_audit_event(&audit_event("handoff.create", "handoff_pack", &handoff.id, from_runtime, AuditSeverity::Info, "created handoff pack")).map_err(to_message)?; Ok(handoff) }
#[tauri::command]
fn build_session_sync_plan(state: State<'_, AppState>) -> Result<SessionSyncPlan, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; Ok(session_scanner::build_session_sync_plan(settings.sync_enabled)) }
#[tauri::command]
fn summarize_session_runtime(session_id: String, state: State<'_, AppState>) -> Result<runtime_execution::SessionRuntimeSummary, String> { let events = state.db.list_session_events().map_err(to_message)?; Ok(runtime_execution::summarize_session_runtime(session_id, events)) }
#[tauri::command]
fn scan_session_runtime(state: State<'_, AppState>) -> Result<runtime_execution::SessionRuntimeScan, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let plan = session_scanner::build_session_sync_plan(settings.sync_enabled); Ok(runtime_execution::scan_session_runtime(plan)) }
#[tauri::command]
fn restore_backup(backup_id: String, state: State<'_, AppState>) -> Result<(), String> { let backup = state.db.get_backup(&backup_id).map_err(to_message)?.ok_or_else(|| format!("backup not found: {backup_id}"))?; let event = installer::restore_backup(&backup).map_err(to_message)?; state.db.save_install_event(&event).map_err(to_message)?; state.db.save_audit_event(&audit_event("backup.restore", "install_backup", backup_id, Some(backup.runtime), AuditSeverity::Warn, "restored install backup")).map_err(to_message)?; Ok(()) }
#[tauri::command]
fn uninstall_installation(installation_id: String, state: State<'_, AppState>) -> Result<(), String> { if let Some(record) = state.db.get_installation(&installation_id).map_err(to_message)? { installer::remove_installation(&record).map_err(to_message)?; state.db.delete_installation(&installation_id).map_err(to_message)?; state.db.save_audit_event(&audit_event("agent.uninstall", "agent_installation", installation_id, Some(record.runtime), AuditSeverity::Warn, "removed installed agent files")).map_err(to_message)?; } Ok(()) }
#[tauri::command]
fn run_doctor(state: State<'_, AppState>) -> Result<DoctorReport, String> { Ok(doctor::run_doctor(&state.app_data_dir)) }
#[tauri::command]
fn parse_deeplink(url: String) -> Result<DeepLinkRequest, String> { deeplink::parse_deeplink(&url).map_err(to_message) }

fn build_console_instances_from_state(state: &State<'_, AppState>) -> Result<Vec<console_core::ConsoleInstance>, String> { let runtimes = adapters::detect_all(); let installations = state.db.list_installations().map_err(to_message)?; let mcp_servers = mcp::default_buddy_mcp_servers(); let knowledge_spaces = state.db.list_knowledge_spaces().map_err(to_message)?; let memory_items = state.db.list_memory_items().map_err(to_message)?; let memory_candidates = state.db.list_memory_candidates().map_err(to_message)?; let session_events = state.db.list_session_events().map_err(to_message)?; Ok(console_core::build_console_instances(runtimes, installations, mcp_servers, knowledge_spaces, memory_items, memory_candidates, session_events, Some(local_api::default_local_api_spec()))) }
fn build_retention_plan_from_state(state: &State<'_, AppState>) -> Result<console_core::RetentionCleanupPlan, String> { let settings = settings::load_settings(&state.app_data_dir).map_err(to_message)?; let artifacts = generated::list_generated_artifacts(&state.app_data_dir).map_err(to_message)?; let backups = state.db.list_backups().map_err(to_message)?; Ok(console_core::build_retention_cleanup_plan(&settings, artifacts, backups)) }
fn select_agents(all_agents: Vec<domain::LocalAgent>, agent_ids: &[String]) -> Vec<domain::LocalAgent> { all_agents.into_iter().filter(|agent| agent_ids.is_empty() || agent_ids.contains(&agent.id)).collect() }
fn to_message(error: impl std::fmt::Display) -> String { error.to_string() }

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| { let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".agent-buddy")); let db = Arc::new(Database::init(&app_data_dir).map_err(tauri::Error::Anyhow)?); local_store::ensure_schema(&app_data_dir).map_err(tauri::Error::Anyhow)?; let daemon = Arc::new(local_daemon::LocalDaemonControl::new()); app.manage(AppState { db, app_data_dir, daemon }); Ok(()) })
        .invoke_handler(tauri::generate_handler![
            load_settings, save_settings, get_paas_connection_status, get_paas_connection_info,
            preview_device_registration, preview_bundle_pull_request, create_paas_session,
            clear_paas_session, execute_device_registration, pull_paas_bundles, push_sync_outbox,
            preview_paas_sync, list_schema_migrations, list_paas_bundle_cache, get_paas_bundle_cache_entry,
            build_cached_paas_bundle, build_cached_paas_bundle_install_plan, install_cached_paas_bundle,
            build_sync_flush_plan, get_overview_dashboard, get_health_board,
            list_console_instances, list_console_instance_groups, preview_retention_cleanup_plan,
            execute_retention_cleanup, preview_local_daemon_plan, start_local_daemon, stop_local_daemon,
            get_local_daemon_status, upsert_instance, list_persisted_instances, delete_persisted_instance,
            set_instance_tags, assign_instance_group, upsert_instance_group, list_persisted_instance_groups,
            list_persisted_instance_group_summaries, delete_persisted_instance_group, refresh_agent_source, import_agent_source,
            import_agent_source_from_deeplink, preview_source_import_risk, refresh_agent_source_by_id,
            list_agent_sources, get_agent_source_detail, get_agent_markdown, preview_agent_runtime_conversion,
            list_bundle_catalog, build_local_source_bundle, build_source_bundle_diff, list_agents,
            list_agents_for_source, build_agent_bundles, summarize_local_bundles, build_bundle_diff,
            detect_runtimes, runtime_definitions, build_buddy_status_report, list_local_api_spec,
            get_install_plan, build_instruction_injection_plan, build_mcp_config_plan,
            build_runtime_mcp_config_preview, list_marketplace_sources, build_skill_install_plan,
            build_marketplace_mcp_install_plan, install_agents, list_installations, list_install_backups,
            list_install_events, list_audit_events, list_sync_outbox, list_generated_artifacts,
            read_generated_artifact, scan_text_risk, scan_generated_artifact, list_default_mcp_servers,
            list_skill_targets, list_built_in_skills, create_approval_request, resolve_approval_request,
            repair_installation_plan, uninstall_installation_plan, upgrade_installation_plan,
            initialize_default_knowledge_spaces, list_knowledge_spaces, list_knowledge_snapshots,
            create_knowledge_snapshot, build_wiki_mirror_plan, build_rag_mirror_plan,
            build_knowledge_context_pack, search_knowledge_runtime, list_memory_items, list_memory_candidates,
            propose_memory, approve_memory_candidate, build_memory_init_plan, build_memory_writeback_plan,
            search_memory_runtime, update_memory_item, archive_memory_item, delete_memory_item, reject_memory_candidate,
            append_session_event, list_session_events, list_handoff_packs, create_handoff_pack,
            build_session_sync_plan, summarize_session_runtime, scan_session_runtime,
            restore_backup, uninstall_installation, run_doctor, parse_deeplink
        ])
        .run(tauri::generate_context!())
        .expect("error while running Agent Buddy");
}
