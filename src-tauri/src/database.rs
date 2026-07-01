use crate::runtime::{AgentInstallation, InstallScope, RuntimeKind};
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::Mutex;

pub struct Database { conn: Mutex<Connection> }

impl Database {
    pub fn init(app_data_dir: &Path) -> anyhow::Result<Self> {
        std::fs::create_dir_all(app_data_dir)?;
        let path: PathBuf = app_data_dir.join("agent-buddy.db");
        let conn = Connection::open(path)?;
        conn.execute_batch(r#"
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
        "#)?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn save_installation(&self, record: &AgentInstallation) -> anyhow::Result<()> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("database lock poisoned"))?;
        conn.execute(
            "insert or replace into agent_installations (id, source_id, agent_id, runtime, scope, project_dir, target_path, installed_files_json, source_commit, installed_at, status) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![record.id, record.source_id, record.agent_id, runtime_to_str(record.runtime), scope_to_str(record.scope), record.project_dir, record.target_path, serde_json::to_string(&record.installed_files)?, record.source_commit, record.installed_at, record.status],
        )?;
        Ok(())
    }

    pub fn list_installations(&self) -> anyhow::Result<Vec<AgentInstallation>> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("database lock poisoned"))?;
        let mut stmt = conn.prepare("select id, source_id, agent_id, runtime, scope, project_dir, target_path, installed_files_json, source_commit, installed_at, status from agent_installations order by installed_at desc")?;
        let rows = stmt.query_map([], |row| {
            let runtime: String = row.get(3)?;
            let scope: String = row.get(4)?;
            let files_json: String = row.get(7)?;
            Ok(AgentInstallation { id: row.get(0)?, source_id: row.get(1)?, agent_id: row.get(2)?, runtime: parse_runtime(&runtime), scope: parse_scope(&scope), project_dir: row.get(5)?, target_path: row.get(6)?, installed_files: serde_json::from_str(&files_json).unwrap_or_default(), source_commit: row.get(8)?, installed_at: row.get(9)?, status: row.get(10)? })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn get_installation(&self, id: &str) -> anyhow::Result<Option<AgentInstallation>> {
        Ok(self.list_installations()?.into_iter().find(|record| record.id == id))
    }

    pub fn delete_installation(&self, id: &str) -> anyhow::Result<()> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("database lock poisoned"))?;
        conn.execute("delete from agent_installations where id = ?1", params![id])?;
        Ok(())
    }
}

fn runtime_to_str(runtime: RuntimeKind) -> &'static str {
    match runtime {
        RuntimeKind::ClaudeCode => "claude-code", RuntimeKind::Copilot => "copilot", RuntimeKind::Antigravity => "antigravity", RuntimeKind::GeminiCli => "gemini-cli", RuntimeKind::OpenCode => "opencode", RuntimeKind::OpenClaw => "openclaw", RuntimeKind::Cursor => "cursor", RuntimeKind::Trae => "trae", RuntimeKind::Aider => "aider", RuntimeKind::Windsurf => "windsurf", RuntimeKind::Qwen => "qwen", RuntimeKind::Codex => "codex", RuntimeKind::DeerFlow => "deerflow", RuntimeKind::WorkBuddy => "workbuddy", RuntimeKind::CodeWhale => "codewhale", RuntimeKind::Hermes => "hermes", RuntimeKind::Kiro => "kiro", RuntimeKind::Qoder => "qoder",
    }
}

fn scope_to_str(scope: InstallScope) -> &'static str {
    match scope { InstallScope::Global => "global", InstallScope::Project => "project", InstallScope::Custom => "custom" }
}

fn parse_runtime(value: &str) -> RuntimeKind {
    serde_json::from_value(serde_json::Value::String(value.to_string())).unwrap_or(RuntimeKind::ClaudeCode)
}

fn parse_scope(value: &str) -> InstallScope {
    match value { "project" => InstallScope::Project, "custom" => InstallScope::Custom, _ => InstallScope::Global }
}
