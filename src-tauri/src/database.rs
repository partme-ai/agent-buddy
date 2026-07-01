use crate::domain::SourceRefreshResult;
use crate::runtime::{
    parse_runtime, parse_scope, runtime_to_str, scope_to_str, AgentInstallation, InstallBackup,
    InstallEvent, RuntimeDetection,
};
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn init(app_data_dir: &Path) -> anyhow::Result<Self> {
        std::fs::create_dir_all(app_data_dir)?;
        let path: PathBuf = app_data_dir.join("agent-buddy.db");
        let conn = Connection::open(path)?;
        conn.execute_batch(
            r#"
            pragma foreign_keys = on;

            create table if not exists agent_sources (
              id text primary key,
              repo_url text,
              branch text,
              commit_sha text,
              license text,
              local_path text,
              updated_at integer not null
            );

            create table if not exists runtime_detections (
              runtime text primary key,
              label text not null,
              detected integer not null,
              scope text not null,
              command_path text,
              config_dir text,
              default_target text,
              notes_json text not null,
              checked_at integer not null
            );

            create table if not exists agent_installations (
              id text primary key,
              source_id text not null,
              agent_id text not null,
              runtime text not null,
              scope text not null,
              project_dir text,
              target_path text not null,
              installed_files_json text not null,
              source_commit text,
              installed_at integer not null,
              status text not null
            );

            create table if not exists install_backups (
              id text primary key,
              installation_id text not null,
              runtime text not null,
              original_path text not null,
              backup_path text not null,
              created_at integer not null
            );

            create table if not exists install_events (
              id text primary key,
              installation_id text,
              runtime text,
              level text not null,
              message text not null,
              created_at integer not null
            );
            "#,
        )?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn save_source_refresh(&self, source: &SourceRefreshResult) -> anyhow::Result<()> {
        let conn = self.lock()?;
        conn.execute(
            "insert or replace into agent_sources (id, repo_url, branch, commit_sha, license, local_path, updated_at) values (?1, ?2, ?3, ?4, ?5, ?6, strftime('%s','now'))",
            params![source.source_id, "https://github.com/jnMetaCode/agency-agents-zh.git", "main", source.commit_sha, "MIT", source.local_path],
        )?;
        Ok(())
    }

    pub fn save_runtime_detection(&self, detection: &RuntimeDetection) -> anyhow::Result<()> {
        let conn = self.lock()?;
        conn.execute(
            "insert or replace into runtime_detections (runtime, label, detected, scope, command_path, config_dir, default_target, notes_json, checked_at) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, strftime('%s','now'))",
            params![
                runtime_to_str(detection.kind),
                detection.label,
                detection.detected as i32,
                scope_to_str(detection.scope),
                detection.command_path,
                detection.config_dir,
                detection.default_target,
                serde_json::to_string(&detection.notes)?
            ],
        )?;
        Ok(())
    }

    pub fn save_installation(&self, record: &AgentInstallation) -> anyhow::Result<()> {
        let conn = self.lock()?;
        conn.execute(
            "insert or replace into agent_installations (id, source_id, agent_id, runtime, scope, project_dir, target_path, installed_files_json, source_commit, installed_at, status) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                record.id,
                record.source_id,
                record.agent_id,
                runtime_to_str(record.runtime),
                scope_to_str(record.scope),
                record.project_dir,
                record.target_path,
                serde_json::to_string(&record.installed_files)?,
                record.source_commit,
                record.installed_at,
                record.status
            ],
        )?;
        Ok(())
    }

    pub fn save_backup(&self, backup: &InstallBackup) -> anyhow::Result<()> {
        let conn = self.lock()?;
        conn.execute(
            "insert or replace into install_backups (id, installation_id, runtime, original_path, backup_path, created_at) values (?1, ?2, ?3, ?4, ?5, ?6)",
            params![backup.id, backup.installation_id, runtime_to_str(backup.runtime), backup.original_path, backup.backup_path, backup.created_at],
        )?;
        Ok(())
    }

    pub fn save_install_event(&self, event: &InstallEvent) -> anyhow::Result<()> {
        let conn = self.lock()?;
        let runtime = event.runtime.map(runtime_to_str);
        conn.execute(
            "insert or replace into install_events (id, installation_id, runtime, level, message, created_at) values (?1, ?2, ?3, ?4, ?5, ?6)",
            params![event.id, event.installation_id, runtime, event.level, event.message, event.created_at],
        )?;
        Ok(())
    }

    pub fn list_installations(&self) -> anyhow::Result<Vec<AgentInstallation>> {
        let conn = self.lock()?;
        let mut stmt = conn.prepare("select id, source_id, agent_id, runtime, scope, project_dir, target_path, installed_files_json, source_commit, installed_at, status from agent_installations order by installed_at desc")?;
        let rows = stmt.query_map([], |row| {
            let runtime: String = row.get(3)?;
            let scope: String = row.get(4)?;
            let files_json: String = row.get(7)?;
            Ok(AgentInstallation {
                id: row.get(0)?,
                source_id: row.get(1)?,
                agent_id: row.get(2)?,
                runtime: parse_runtime(&runtime),
                scope: parse_scope(&scope),
                project_dir: row.get(5)?,
                target_path: row.get(6)?,
                installed_files: serde_json::from_str(&files_json).unwrap_or_default(),
                source_commit: row.get(8)?,
                installed_at: row.get(9)?,
                status: row.get(10)?,
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn get_installation(&self, id: &str) -> anyhow::Result<Option<AgentInstallation>> {
        Ok(self.list_installations()?.into_iter().find(|record| record.id == id))
    }

    pub fn delete_installation(&self, id: &str) -> anyhow::Result<()> {
        let conn = self.lock()?;
        conn.execute("delete from agent_installations where id = ?1", params![id])?;
        Ok(())
    }

    fn lock(&self) -> anyhow::Result<std::sync::MutexGuard<'_, Connection>> {
        self.conn.lock().map_err(|_| anyhow::anyhow!("database lock poisoned"))
    }
}
