use crate::audit::{severity_to_str, AuditEvent, AuditSeverity};
use crate::doctor::DoctorReport;
use crate::generated::GeneratedArtifact;
use crate::knowledge::KnowledgeSpace;
use crate::local_api::LocalApiSpec;
use crate::mcp::{McpServerConfig, McpTransport};
use crate::memory::{MemoryCandidate, MemoryItem};
use crate::runtime::{runtime_to_str, AgentInstallation, InstallBackup, RuntimeDetection, RuntimeKind};
use crate::session::SessionEvent;
use crate::settings::AgentBuddySettings;
use crate::sync::{status_to_str, SyncOutboxEvent, SyncStatus};
use crate::sync_engine::{self, SyncFlushPlan};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleOverviewDashboard { pub generated_at: i64, pub metrics: Vec<ConsoleMetric>, pub health_score: i64, pub runtime_summary: ConsoleRuntimeSummary, pub sync_summary: ConsoleSyncSummary, pub recent_events: Vec<ConsoleTimelineEvent>, pub warnings: Vec<String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleMetric { pub key: String, pub label: String, pub value: i64, pub unit: String, pub trend: String }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleRuntimeSummary { pub total: usize, pub detected: usize, pub not_detected: usize, pub by_scope: BTreeMap<String, usize> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleSyncSummary { pub pending: usize, pub failed: usize, pub sent: usize, pub skipped: usize, pub flush_plan: SyncFlushPlan }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleHealthBoard { pub generated_at: i64, pub doctor: DoctorReport, pub runtime_checks: Vec<ConsoleRuntimeCheck>, pub risk_alerts: Vec<ConsoleRiskAlert>, pub recent_tasks: Vec<ConsoleTimelineEvent>, pub sync_failures: Vec<ConsoleTimelineEvent>, pub warnings: Vec<String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleRuntimeCheck { pub runtime: RuntimeKind, pub label: String, pub status: String, pub path: Option<String>, pub notes: Vec<String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleRiskAlert { pub id: String, pub severity: String, pub title: String, pub message: String, pub created_at: i64 }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleTimelineEvent { pub id: String, pub title: String, pub message: String, pub level: String, pub created_at: i64 }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleInstance { pub id: String, pub name: String, pub instance_type: String, pub status: String, pub group: String, pub runtime: Option<RuntimeKind>, pub path: Option<String>, pub tags: Vec<String>, pub description: String, pub updated_at: Option<i64> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleInstanceGroup { pub id: String, pub label: String, pub count: usize, pub tags: Vec<String>, pub status_counts: BTreeMap<String, usize> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetentionCleanupPlan { pub generated_at: i64, pub generated_candidates: Vec<CleanupCandidate>, pub backup_candidates: Vec<CleanupCandidate>, pub total_bytes: u64, pub warnings: Vec<String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupCandidate { pub id: String, pub path: String, pub reason: String, pub size_bytes: u64, pub created_or_modified_at: Option<i64> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetentionCleanupResult { pub generated_at: i64, pub deleted: Vec<CleanupDeletion>, pub failed: Vec<CleanupFailure>, pub total_deleted_bytes: u64, pub warnings: Vec<String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupDeletion { pub id: String, pub path: String, pub size_bytes: u64 }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupFailure { pub id: String, pub path: String, pub message: String }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDaemonPlan { pub enabled: bool, pub bind_host: String, pub bind_port: u16, pub base_url: String, pub route_count: usize, pub mcp_server_count: usize, pub capabilities: Vec<String>, pub warnings: Vec<String> }

pub fn build_overview_dashboard(settings: &AgentBuddySettings, runtimes: Vec<RuntimeDetection>, installations: Vec<AgentInstallation>, agents_count: usize, session_events: Vec<SessionEvent>, sync_events: Vec<SyncOutboxEvent>, audit_events: Vec<AuditEvent>) -> ConsoleOverviewDashboard {
    let flush_plan = sync_engine::build_flush_plan(settings, &sync_events);
    let runtime_summary = runtime_summary(&runtimes);
    let sync_summary = sync_summary(sync_events, flush_plan);
    let active_sessions = session_events.iter().map(|event| event.session_id.clone()).collect::<BTreeSet<_>>().len() as i64;
    let risk_count = audit_events.iter().filter(|event| matches!(event.severity, AuditSeverity::Error | AuditSeverity::Security)).count() as i64;
    let health_score = health_score(runtime_summary.detected, runtime_summary.total, risk_count, sync_summary.failed as i64);
    let mut recent_events = audit_events.into_iter().map(audit_timeline).collect::<Vec<_>>();
    recent_events.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    recent_events.truncate(20);
    let mut warnings = Vec::new();
    if !settings.sync_enabled { warnings.push("PaaS sync is disabled; console state remains local.".to_string()); }
    if runtime_summary.detected == 0 { warnings.push("No supported local runtimes detected yet.".to_string()); }
    ConsoleOverviewDashboard { generated_at: chrono::Utc::now().timestamp(), metrics: vec![metric("instances", "实例数", (runtime_summary.total + installations.len()) as i64, "count"), metric("agents", "总智能体数", agents_count as i64, "count"), metric("installations", "已安装", installations.len() as i64, "count"), metric("sessions", "活跃会话", active_sessions, "count"), metric("pendingSync", "待同步", sync_summary.pending as i64 + sync_summary.failed as i64, "count"), metric("risks", "风险告警", risk_count, "count")], health_score, runtime_summary, sync_summary, recent_events, warnings }
}

pub fn build_health_board(doctor: DoctorReport, runtimes: Vec<RuntimeDetection>, audit_events: Vec<AuditEvent>, install_events: Vec<crate::runtime::InstallEvent>, sync_events: Vec<SyncOutboxEvent>) -> ConsoleHealthBoard {
    let runtime_checks = runtimes.into_iter().map(|runtime| ConsoleRuntimeCheck { status: if runtime.detected { "running".to_string() } else { "stopped".to_string() }, path: runtime.default_target.clone().or(runtime.config_dir.clone()).or(runtime.command_path.clone()), runtime: runtime.kind, label: runtime.label, notes: runtime.notes }).collect::<Vec<_>>();
    let risk_alerts = audit_events.iter().filter(|event| matches!(event.severity, AuditSeverity::Error | AuditSeverity::Security | AuditSeverity::Warn)).take(50).map(|event| ConsoleRiskAlert { id: event.id.clone(), severity: severity_to_str(event.severity).to_string(), title: event.action.clone(), message: event.message.clone(), created_at: event.created_at }).collect();
    let recent_tasks = install_events.into_iter().take(50).map(|event| ConsoleTimelineEvent { id: event.id, title: event.message, message: event.installation_id.unwrap_or_else(|| "install task".to_string()), level: event.level, created_at: event.created_at }).collect();
    let sync_failures = sync_events.into_iter().filter(|event| matches!(event.status, SyncStatus::Failed)).take(50).map(|event| ConsoleTimelineEvent { id: event.id, title: event.event_type, message: format!("{}:{}", event.aggregate_type, event.aggregate_id), level: status_to_str(event.status).to_string(), created_at: event.updated_at }).collect();
    let mut warnings = Vec::new();
    if doctor.summary.error > 0 { warnings.push(format!("{} doctor check(s) are failing.", doctor.summary.error)); }
    if doctor.summary.warning > 0 { warnings.push(format!("{} doctor check(s) require attention.", doctor.summary.warning)); }
    ConsoleHealthBoard { generated_at: chrono::Utc::now().timestamp(), doctor, runtime_checks, risk_alerts, recent_tasks, sync_failures, warnings }
}

pub fn build_console_instances(runtimes: Vec<RuntimeDetection>, installations: Vec<AgentInstallation>, mcp_servers: Vec<McpServerConfig>, knowledge_spaces: Vec<KnowledgeSpace>, memory_items: Vec<MemoryItem>, memory_candidates: Vec<MemoryCandidate>, session_events: Vec<SessionEvent>, local_api: Option<LocalApiSpec>) -> Vec<ConsoleInstance> {
    let mut instances = Vec::new();
    for runtime in runtimes { instances.push(ConsoleInstance { id: format!("runtime:{}", runtime_to_str(runtime.kind)), name: runtime.label, instance_type: "runtime".to_string(), status: if runtime.detected { "running".to_string() } else { "stopped".to_string() }, group: "Runtime".to_string(), runtime: Some(runtime.kind), path: runtime.default_target.or(runtime.config_dir).or(runtime.command_path), tags: vec![runtime_to_str(runtime.kind).to_string()], description: runtime.notes.join(" "), updated_at: None }); }
    for installation in installations { instances.push(ConsoleInstance { id: format!("agent:{}", installation.id), name: installation.agent_id.clone(), instance_type: "agent-installation".to_string(), status: installation.status.clone(), group: "Agent Installations".to_string(), runtime: Some(installation.runtime), path: Some(installation.target_path), tags: vec![runtime_to_str(installation.runtime).to_string(), installation.source_id], description: format!("{} installed file(s)", installation.installed_files.len()), updated_at: Some(installation.installed_at) }); }
    for server in mcp_servers { let transport = transport_label(&server.transport).to_string(); let path = server.url.clone().or(server.command.clone()); instances.push(ConsoleInstance { id: format!("mcp:{}", server.id), name: server.name, instance_type: "mcp-service".to_string(), status: if server.enabled { "running".to_string() } else { "stopped".to_string() }, group: "MCP Services".to_string(), runtime: None, path, tags: vec![transport, if server.policy.approval_required { "approval".to_string() } else { "auto".to_string() }], description: server.description, updated_at: None }); }
    for space in knowledge_spaces { instances.push(ConsoleInstance { id: format!("knowledge:{}", space.id), name: space.name, instance_type: "knowledge-mirror".to_string(), status: "running".to_string(), group: "Knowledge Mirrors".to_string(), runtime: None, path: None, tags: vec![space.source, space.sync_mode], description: space.description, updated_at: Some(space.updated_at) }); }
    instances.push(ConsoleInstance { id: "memory:agent-buddy".to_string(), name: "Buddy Memory Service".to_string(), instance_type: "memory-service".to_string(), status: if memory_candidates.is_empty() { "running".to_string() } else { "warning".to_string() }, group: "Memory".to_string(), runtime: None, path: None, tags: vec!["provider".to_string(), "approval-required".to_string()], description: format!("{} memories, {} candidate(s)", memory_items.len(), memory_candidates.len()), updated_at: None });
    let session_count = session_events.iter().map(|event| event.session_id.clone()).collect::<BTreeSet<_>>().len();
    instances.push(ConsoleInstance { id: "session:event-center".to_string(), name: "Session Event Center".to_string(), instance_type: "session-service".to_string(), status: if session_events.is_empty() { "stopped".to_string() } else { "running".to_string() }, group: "Sessions".to_string(), runtime: None, path: None, tags: vec!["handoff".to_string(), "scanner".to_string()], description: format!("{} events across {} session(s)", session_events.len(), session_count), updated_at: session_events.iter().map(|event| event.created_at).max() });
    if let Some(api) = local_api { instances.push(ConsoleInstance { id: "local-api:buddy".to_string(), name: "Local API / MCP Server".to_string(), instance_type: "local-api".to_string(), status: "planned".to_string(), group: "Local Services".to_string(), runtime: None, path: Some(api.base_url), tags: vec!["api".to_string(), "mcp".to_string()], description: format!("{} route(s) declared", api.routes.len()), updated_at: None }); }
    instances
}

pub fn build_instance_groups(instances: &[ConsoleInstance]) -> Vec<ConsoleInstanceGroup> {
    let mut groups: BTreeMap<String, ConsoleInstanceGroup> = BTreeMap::new();
    for instance in instances { let group = groups.entry(instance.group.clone()).or_insert_with(|| ConsoleInstanceGroup { id: instance.group.to_lowercase().replace(' ', "-"), label: instance.group.clone(), count: 0, tags: Vec::new(), status_counts: BTreeMap::new() }); group.count += 1; *group.status_counts.entry(instance.status.clone()).or_insert(0) += 1; for tag in &instance.tags { if !group.tags.contains(tag) { group.tags.push(tag.clone()); } } }
    groups.into_values().collect()
}

pub fn build_retention_cleanup_plan(settings: &AgentBuddySettings, artifacts: Vec<GeneratedArtifact>, backups: Vec<InstallBackup>) -> RetentionCleanupPlan {
    let now = chrono::Utc::now().timestamp();
    let generated_cutoff = now - settings.generated_artifact_retention_days.max(0) * 86_400;
    let backup_cutoff = now - settings.backup_retention_days.max(0) * 86_400;
    let generated_candidates = artifacts.into_iter().filter(|artifact| artifact.modified_at.unwrap_or(now) < generated_cutoff).map(|artifact| CleanupCandidate { id: format!("generated:{}", artifact.absolute_path), path: artifact.absolute_path, reason: format!("older than {} day generated artifact retention", settings.generated_artifact_retention_days), size_bytes: artifact.size_bytes, created_or_modified_at: artifact.modified_at }).collect::<Vec<_>>();
    let backup_candidates = backups.into_iter().filter(|backup| backup.created_at < backup_cutoff).map(|backup| CleanupCandidate { id: backup.id, path: backup.backup_path, reason: format!("older than {} day backup retention", settings.backup_retention_days), size_bytes: 0, created_or_modified_at: Some(backup.created_at) }).collect::<Vec<_>>();
    let total_bytes = generated_candidates.iter().map(|item| item.size_bytes).sum();
    let mut warnings = Vec::new();
    if settings.generated_artifact_retention_days <= 0 { warnings.push("Generated artifact retention is zero or negative; cleanup would select all generated artifacts.".to_string()); }
    if settings.backup_retention_days <= 0 { warnings.push("Backup retention is zero or negative; cleanup would select all backups.".to_string()); }
    RetentionCleanupPlan { generated_at: now, generated_candidates, backup_candidates, total_bytes, warnings }
}

pub fn execute_retention_cleanup(plan: &RetentionCleanupPlan) -> RetentionCleanupResult {
    let mut deleted = Vec::new();
    let mut failed = Vec::new();
    for candidate in plan.generated_candidates.iter().chain(plan.backup_candidates.iter()) {
        match delete_path(&candidate.path) {
            Ok(()) => deleted.push(CleanupDeletion { id: candidate.id.clone(), path: candidate.path.clone(), size_bytes: candidate.size_bytes }),
            Err(error) => failed.push(CleanupFailure { id: candidate.id.clone(), path: candidate.path.clone(), message: error.to_string() }),
        }
    }
    let total_deleted_bytes = deleted.iter().map(|item| item.size_bytes).sum();
    let mut warnings = plan.warnings.clone();
    if !failed.is_empty() { warnings.push(format!("{} cleanup candidate(s) failed to delete.", failed.len())); }
    RetentionCleanupResult { generated_at: chrono::Utc::now().timestamp(), deleted, failed, total_deleted_bytes, warnings }
}

pub fn build_local_daemon_plan(api: LocalApiSpec, mcp_servers: Vec<McpServerConfig>) -> LocalDaemonPlan { let enabled_mcp = mcp_servers.iter().filter(|server| server.enabled).count(); let warnings = vec!["Local daemon is currently a preview plan; route spec exists but the HTTP/MCP server is not started yet.".to_string()]; LocalDaemonPlan { enabled: false, bind_host: api.bind_host, bind_port: api.bind_port, base_url: api.base_url, route_count: api.routes.len(), mcp_server_count: enabled_mcp, capabilities: vec!["memory".to_string(), "knowledge".to_string(), "session".to_string(), "approval".to_string(), "mcp-proxy".to_string()], warnings } }

fn delete_path(path: &str) -> anyhow::Result<()> {
    let path = Path::new(path);
    if !path.exists() { return Ok(()); }
    if path.is_dir() { fs::remove_dir_all(path)?; } else { fs::remove_file(path)?; }
    Ok(())
}
fn runtime_summary(runtimes: &[RuntimeDetection]) -> ConsoleRuntimeSummary { let mut by_scope = BTreeMap::new(); for runtime in runtimes { *by_scope.entry(format!("{:?}", runtime.scope)).or_insert(0) += 1; } ConsoleRuntimeSummary { total: runtimes.len(), detected: runtimes.iter().filter(|runtime| runtime.detected).count(), not_detected: runtimes.iter().filter(|runtime| !runtime.detected).count(), by_scope } }
fn sync_summary(events: Vec<SyncOutboxEvent>, flush_plan: SyncFlushPlan) -> ConsoleSyncSummary { ConsoleSyncSummary { pending: events.iter().filter(|event| matches!(event.status, SyncStatus::Pending)).count(), failed: events.iter().filter(|event| matches!(event.status, SyncStatus::Failed)).count(), sent: events.iter().filter(|event| matches!(event.status, SyncStatus::Sent)).count(), skipped: events.iter().filter(|event| matches!(event.status, SyncStatus::Skipped)).count(), flush_plan } }
fn health_score(detected: usize, total: usize, risk_count: i64, failed_sync: i64) -> i64 { if total == 0 { return 0; } let base = ((detected as f64 / total as f64) * 100.0).round() as i64; (base - risk_count * 2 - failed_sync * 3).clamp(0, 100) }
fn metric(key: &str, label: &str, value: i64, unit: &str) -> ConsoleMetric { ConsoleMetric { key: key.to_string(), label: label.to_string(), value, unit: unit.to_string(), trend: "local".to_string() } }
fn audit_timeline(event: AuditEvent) -> ConsoleTimelineEvent { ConsoleTimelineEvent { id: event.id, title: event.action, message: event.message, level: severity_to_str(event.severity).to_string(), created_at: event.created_at } }
fn transport_label(transport: &McpTransport) -> &'static str { match transport { McpTransport::Stdio => "stdio", McpTransport::Http => "http", McpTransport::Sse => "sse" } }
