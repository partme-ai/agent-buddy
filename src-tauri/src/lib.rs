mod adapters;
mod database;
mod deeplink;
mod doctor;
mod domain;
mod installer;
mod runtime;
mod source;

use database::Database;
use deeplink::DeepLinkRequest;
use doctor::DoctorReport;
use domain::{LocalAgentSummary, SourceRefreshResult};
use runtime::{
    AgentInstallation, InstallBackup, InstallEvent, InstallPlan, InstallResult, InstallTarget,
    RuntimeDetection,
};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Manager, State};

struct AppState {
    db: Arc<Database>,
    app_data_dir: PathBuf,
}

#[tauri::command]
fn refresh_agent_source(state: State<'_, AppState>) -> Result<SourceRefreshResult, String> {
    let result = source::refresh_source(&state.app_data_dir).map_err(to_message)?;
    state.db.save_source_refresh(&result).map_err(to_message)?;
    Ok(result)
}

#[tauri::command]
fn list_agents(state: State<'_, AppState>) -> Result<Vec<LocalAgentSummary>, String> {
    let agents = source::list_agents(&state.app_data_dir).map_err(to_message)?;
    Ok(agents.iter().map(LocalAgentSummary::from).collect())
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
fn get_install_plan(
    agent_ids: Vec<String>,
    targets: Vec<InstallTarget>,
    state: State<'_, AppState>,
) -> Result<InstallPlan, String> {
    let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?;
    let selected = select_agents(all_agents, &agent_ids);
    installer::build_install_plan(&selected, &targets, &state.app_data_dir).map_err(to_message)
}

#[tauri::command]
fn install_agents(
    agent_ids: Vec<String>,
    targets: Vec<InstallTarget>,
    state: State<'_, AppState>,
) -> Result<Vec<InstallResult>, String> {
    let all_agents = source::list_agents(&state.app_data_dir).map_err(to_message)?;
    let selected = select_agents(all_agents, &agent_ids);
    let mut results = Vec::new();
    for target in targets {
        let outcome = installer::install_target(&selected, &target, &state.app_data_dir).map_err(to_message)?;
        for record in &outcome.records {
            state.db.save_installation(record).map_err(to_message)?;
        }
        for backup in &outcome.backups {
            state.db.save_backup(backup).map_err(to_message)?;
        }
        for event in &outcome.events {
            state.db.save_install_event(event).map_err(to_message)?;
        }
        results.push(outcome.result);
    }
    Ok(results)
}

#[tauri::command]
fn list_installations(state: State<'_, AppState>) -> Result<Vec<AgentInstallation>, String> {
    state.db.list_installations().map_err(to_message)
}

#[tauri::command]
fn list_install_backups(state: State<'_, AppState>) -> Result<Vec<InstallBackup>, String> {
    state.db.list_backups().map_err(to_message)
}

#[tauri::command]
fn list_install_events(state: State<'_, AppState>) -> Result<Vec<InstallEvent>, String> {
    state.db.list_install_events().map_err(to_message)
}

#[tauri::command]
fn restore_backup(backup_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let backup = state
        .db
        .get_backup(&backup_id)
        .map_err(to_message)?
        .ok_or_else(|| format!("backup not found: {backup_id}"))?;
    let event = installer::restore_backup(&backup).map_err(to_message)?;
    state.db.save_install_event(&event).map_err(to_message)?;
    Ok(())
}

#[tauri::command]
fn uninstall_installation(installation_id: String, state: State<'_, AppState>) -> Result<(), String> {
    if let Some(record) = state.db.get_installation(&installation_id).map_err(to_message)? {
        installer::remove_installation(&record).map_err(to_message)?;
        state.db.delete_installation(&installation_id).map_err(to_message)?;
    }
    Ok(())
}

#[tauri::command]
fn run_doctor(state: State<'_, AppState>) -> Result<DoctorReport, String> {
    Ok(doctor::run_doctor(&state.app_data_dir))
}

#[tauri::command]
fn parse_deeplink(url: String) -> Result<DeepLinkRequest, String> {
    deeplink::parse_deeplink(&url).map_err(to_message)
}

fn select_agents(all_agents: Vec<domain::LocalAgent>, agent_ids: &[String]) -> Vec<domain::LocalAgent> {
    all_agents
        .into_iter()
        .filter(|agent| agent_ids.is_empty() || agent_ids.contains(&agent.id))
        .collect()
}

fn to_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".agent-buddy"));
            let db = Arc::new(Database::init(&app_data_dir).map_err(tauri::Error::Anyhow)?);
            app.manage(AppState { db, app_data_dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            refresh_agent_source,
            list_agents,
            detect_runtimes,
            runtime_definitions,
            get_install_plan,
            install_agents,
            list_installations,
            list_install_backups,
            list_install_events,
            restore_backup,
            uninstall_installation,
            run_doctor,
            parse_deeplink
        ])
        .run(tauri::generate_context!())
        .expect("error while running Agent Buddy");
}
