use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentBuddySettings {
    pub device_id: String,
    pub paas_base_url: String,
    pub sync_enabled: bool,
    pub telemetry_enabled: bool,
    pub generated_artifact_retention_days: i64,
    pub backup_retention_days: i64,
    pub install_mode: InstallMode,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum InstallMode {
    Copy,
    Symlink,
    Auto,
}

impl Default for AgentBuddySettings {
    fn default() -> Self {
        Self {
            device_id: Uuid::new_v4().to_string(),
            paas_base_url: "http://127.0.0.1:18080".to_string(),
            sync_enabled: false,
            telemetry_enabled: false,
            generated_artifact_retention_days: 30,
            backup_retention_days: 90,
            install_mode: InstallMode::Auto,
        }
    }
}

pub fn settings_path(app_data_dir: &Path) -> std::path::PathBuf {
    app_data_dir.join("settings.json")
}

pub fn load_settings(app_data_dir: &Path) -> anyhow::Result<AgentBuddySettings> {
    let path = settings_path(app_data_dir);
    if !path.exists() {
        let settings = AgentBuddySettings::default();
        save_settings(app_data_dir, &settings)?;
        return Ok(settings);
    }
    let content = fs::read_to_string(&path)?;
    Ok(serde_json::from_str(&content).unwrap_or_default())
}

pub fn save_settings(app_data_dir: &Path, settings: &AgentBuddySettings) -> anyhow::Result<()> {
    fs::create_dir_all(app_data_dir)?;
    let path = settings_path(app_data_dir);
    fs::write(path, serde_json::to_string_pretty(settings)?)?;
    Ok(())
}
