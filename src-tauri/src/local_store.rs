use crate::bundle::AgentBundle;
use crate::paas::BundlePullResponse;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

const SCHEMA_VERSION: i64 = 2;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaMigrationRecord {
    pub version: i64,
    pub name: String,
    pub applied_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaasBundleCacheEntry {
    pub bundle_id: String,
    pub version: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub workspace_id: Option<String>,
    pub target_count: i64,
    pub skill_count: i64,
    pub mcp_count: i64,
    pub knowledge_space_count: i64,
    pub raw_json: String,
    pub cached_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncOutboxWritebackResult {
    pub requested: usize,
    pub updated: usize,
    pub status: String,
    pub event_ids: Vec<String>,
}

pub fn ensure_schema(app_data_dir: &Path) -> anyhow::Result<Vec<SchemaMigrationRecord>> {
    let conn = open(app_data_dir)?;
    conn.execute_batch(
        r#"
        create table if not exists schema_migrations (
            version integer primary key,
            name text not null,
            applied_at integer not null
        );
        create table if not exists paas_bundle_cache (
            bundle_id text not null,
            version text not null,
            name text not null,
            description text not null,
            category text not null,
            workspace_id text,
            target_count integer not null,
            skill_count integer not null,
            mcp_count integer not null,
            knowledge_space_count integer not null,
            raw_json text not null,
            cached_at integer not null,
            primary key(bundle_id, version)
        );
        create index if not exists idx_paas_bundle_cache_workspace on paas_bundle_cache(workspace_id);
        create index if not exists idx_paas_bundle_cache_cached_at on paas_bundle_cache(cached_at);
        "#,
    )?;
    record_migration(&conn, 1, "initial-local-state")?;
    record_migration(&conn, 2, "paas-bundle-cache-and-sync-writeback")?;
    conn.execute(&format!("pragma user_version = {SCHEMA_VERSION}"), [])?;
    list_schema_migrations_from_conn(&conn)
}

pub fn list_schema_migrations(app_data_dir: &Path) -> anyhow::Result<Vec<SchemaMigrationRecord>> {
    ensure_schema(app_data_dir)?;
    let conn = open(app_data_dir)?;
    list_schema_migrations_from_conn(&conn)
}

pub fn cache_bundle_pull_response(app_data_dir: &Path, workspace_id: Option<String>, response_body: &str) -> anyhow::Result<Vec<PaasBundleCacheEntry>> {
    ensure_schema(app_data_dir)?;
    let parsed: BundlePullResponse = serde_json::from_str(response_body)?;
    let conn = open(app_data_dir)?;
    let cached_at = chrono::Utc::now().timestamp();
    let mut entries = Vec::new();
    for bundle in parsed.bundles {
        let raw_json = serde_json::to_string(&bundle)?;
        let entry = PaasBundleCacheEntry {
            bundle_id: bundle.bundle_id.clone(),
            version: bundle.version.clone(),
            name: bundle.profile.name.clone(),
            description: bundle.profile.description.clone(),
            category: bundle.profile.category.clone(),
            workspace_id: workspace_id.clone(),
            target_count: bundle.targets.len() as i64,
            skill_count: bundle.skills.len() as i64,
            mcp_count: bundle.mcp_servers.len() as i64,
            knowledge_space_count: bundle.knowledge.spaces.len() as i64,
            raw_json,
            cached_at,
        };
        conn.execute(
            "insert or replace into paas_bundle_cache (bundle_id, version, name, description, category, workspace_id, target_count, skill_count, mcp_count, knowledge_space_count, raw_json, cached_at) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![entry.bundle_id, entry.version, entry.name, entry.description, entry.category, entry.workspace_id, entry.target_count, entry.skill_count, entry.mcp_count, entry.knowledge_space_count, entry.raw_json, entry.cached_at],
        )?;
        entries.push(entry);
    }
    Ok(entries)
}

pub fn list_paas_bundle_cache(app_data_dir: &Path) -> anyhow::Result<Vec<PaasBundleCacheEntry>> {
    ensure_schema(app_data_dir)?;
    let conn = open(app_data_dir)?;
    let mut stmt = conn.prepare("select bundle_id, version, name, description, category, workspace_id, target_count, skill_count, mcp_count, knowledge_space_count, raw_json, cached_at from paas_bundle_cache order by cached_at desc, name asc")?;
    let rows = stmt.query_map([], map_paas_bundle_cache_row)?;
    Ok(rows.filter_map(Result::ok).collect())
}

pub fn get_paas_bundle_cache_entry(app_data_dir: &Path, bundle_id: &str, version: &str) -> anyhow::Result<Option<PaasBundleCacheEntry>> {
    ensure_schema(app_data_dir)?;
    let conn = open(app_data_dir)?;
    let mut stmt = conn.prepare("select bundle_id, version, name, description, category, workspace_id, target_count, skill_count, mcp_count, knowledge_space_count, raw_json, cached_at from paas_bundle_cache where bundle_id = ?1 and version = ?2 limit 1")?;
    let mut rows = stmt.query_map(params![bundle_id, version], map_paas_bundle_cache_row)?;
    Ok(rows.find_map(Result::ok))
}

pub fn build_cached_paas_bundle(app_data_dir: &Path, bundle_id: &str, version: &str) -> anyhow::Result<AgentBundle> {
    let entry = get_paas_bundle_cache_entry(app_data_dir, bundle_id, version)?.ok_or_else(|| anyhow::anyhow!("cached PaaS bundle not found: {bundle_id}@{version}"))?;
    Ok(serde_json::from_str(&entry.raw_json)?)
}

pub fn update_sync_outbox_after_push(app_data_dir: &Path, event_ids: &[String], success: bool) -> anyhow::Result<SyncOutboxWritebackResult> {
    if event_ids.is_empty() {
        return Ok(SyncOutboxWritebackResult { requested: 0, updated: 0, status: "skipped".to_string(), event_ids: Vec::new() });
    }
    let conn = open(app_data_dir)?;
    let mut updated = 0;
    let status = if success { "sent" } else { "failed" };
    for id in event_ids {
        let affected = if success {
            conn.execute("update sync_outbox set status = 'sent', updated_at = strftime('%s','now') where id = ?1", params![id])?
        } else {
            conn.execute("update sync_outbox set status = 'failed', retry_count = retry_count + 1, updated_at = strftime('%s','now') where id = ?1", params![id])?
        };
        updated += affected;
    }
    Ok(SyncOutboxWritebackResult { requested: event_ids.len(), updated, status: status.to_string(), event_ids: event_ids.to_vec() })
}

fn map_paas_bundle_cache_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<PaasBundleCacheEntry> {
    Ok(PaasBundleCacheEntry {
        bundle_id: row.get(0)?,
        version: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        category: row.get(4)?,
        workspace_id: row.get(5)?,
        target_count: row.get(6)?,
        skill_count: row.get(7)?,
        mcp_count: row.get(8)?,
        knowledge_space_count: row.get(9)?,
        raw_json: row.get(10)?,
        cached_at: row.get(11)?,
    })
}

fn record_migration(conn: &Connection, version: i64, name: &str) -> anyhow::Result<()> {
    conn.execute("insert or ignore into schema_migrations (version, name, applied_at) values (?1, ?2, strftime('%s','now'))", params![version, name])?;
    Ok(())
}

fn list_schema_migrations_from_conn(conn: &Connection) -> anyhow::Result<Vec<SchemaMigrationRecord>> {
    let mut stmt = conn.prepare("select version, name, applied_at from schema_migrations order by version asc")?;
    let rows = stmt.query_map([], |row| Ok(SchemaMigrationRecord { version: row.get(0)?, name: row.get(1)?, applied_at: row.get(2)? }))?;
    Ok(rows.filter_map(Result::ok).collect())
}

fn open(app_data_dir: &Path) -> anyhow::Result<Connection> {
    std::fs::create_dir_all(app_data_dir)?;
    let path: PathBuf = app_data_dir.join("agent-buddy.db");
    Ok(Connection::open(path)?)
}
