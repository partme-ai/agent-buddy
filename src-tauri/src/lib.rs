mod database;
mod domain;
mod installer;
mod runtime;
mod source;

use database::Database;
use domain::{LocalAgentSummary, SourceRefreshResult};
use runtime::{AgentInstallation, InstallResult, InstallTarget, RuntimeDetection};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Manager, State};

struct AppState { db: Arc<Database>, app_data_dir: PathBuf }

#[tauri::command]
fn refresh_agent_source(state: State<'_, AppState>) -> Result<SourceRefreshResult, String> {
    source::refresh_source(&state.app_data_dir).map_err(|error| error.to_string())
}

#[tauri::command]
fn list_agents(state: State<'_, AppState>) -> Result<Vec<LocalAgentSummary>, String> {
    let agents = source::list_agents(&state.app_data_dir).map_err(|error| error.to_string())?;
    Ok(agents.iter().map(LocalAgentSummary::from).collect())
}

#[tauri::command]
fn detect_runtimes() -> Result<Vec<RuntimeDetection>, String> {
    Ok(runtime::detect_all_runtimes())
}

#[tauri::command]
fn install_agents(agent_ids: Vec<String>, targets: Vec<InstallTarget>, state: State<'_, AppState>) -> Result<Vec<InstallResult>, String> {
    let all_agents = source::list_agents(&state.app_data_dir).map_err(|error| error.to_string())?;
    let selected: Vec<_> = all_agents.into_iter().filter(|agent| agent_ids.contains(&agent.id)).collect();
    let mut results = Vec::new();
    for target in targets {
        let (result, records) = installer::install_agents(&selected, &target, None).map_err(|error| error.to_string())?;
        for record in records { state.db.save_installation(&record).map_err(|error| error.to_string())?; }
        results.push(result);
    }
    Ok(results)
}

#[tauri::command]
fn list_installations(state: State<'_, AppState>) -> Result<Vec<AgentInstallation>, String> {
    state.db.list_installations().map_err(|error| error.to_string())
}

#[tauri::command]
fn uninstall_installation(installation_id: String, state: State<'_, AppState>) -> Result<(), String> {
    if let Some(record) = state.db.get_installation(&installation_id).map_err(|error| error.to_string())? {
        installer::remove_installation(&record).map_err(|error| error.to_string())?;
        state.db.delete_installation(&installation_id).map_err(|error| error.to_string())?;
    }
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".agent-buddy"));
            let db = Arc::new(Database::init(&app_data_dir).map_err(|error| tauri::Error::Anyhow(error))?);
            app.manage(AppState { db, app_data_dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![refresh_agent_source, list_agents, detect_runtimes, install_agents, list_installations, uninstall_installation])
        .run(tauri::generate_context!())
        .expect("error while running Agent Buddy");
}
