use crate::domain::{LocalAgent, SourceRefreshResult};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

const SOURCE_ID: &str = "agency-agents-zh";
const SOURCE_URL: &str = "https://github.com/jnMetaCode/agency-agents-zh.git";

const AGENT_DIRS: &[&str] = &[
    "academic", "design", "engineering", "finance", "game-development", "gis", "hr", "legal", "marketing", "paid-media", "sales", "product", "project-management", "security", "supply-chain", "testing", "support", "spatial-computing", "specialized",
];

pub fn source_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("sources").join(SOURCE_ID).join("repo")
}

pub fn refresh_source(app_data_dir: &Path) -> anyhow::Result<SourceRefreshResult> {
    let repo_dir = source_dir(app_data_dir);
    if repo_dir.exists() {
        let status = Command::new("git").arg("-C").arg(&repo_dir).arg("pull").arg("--ff-only").output()?;
        if !status.status.success() {
            anyhow::bail!("git pull failed: {}", String::from_utf8_lossy(&status.stderr));
        }
    } else {
        fs::create_dir_all(repo_dir.parent().unwrap())?;
        let status = Command::new("git").arg("clone").arg("--depth").arg("1").arg(SOURCE_URL).arg(&repo_dir).output()?;
        if !status.status.success() {
            anyhow::bail!("git clone failed: {}", String::from_utf8_lossy(&status.stderr));
        }
    }
    let commit = current_commit(&repo_dir).ok();
    Ok(SourceRefreshResult { source_id: SOURCE_ID.to_string(), local_path: repo_dir.display().to_string(), commit_sha: commit, message: "agency-agents-zh source refreshed".to_string() })
}

fn current_commit(repo_dir: &Path) -> anyhow::Result<String> {
    let output = Command::new("git").arg("-C").arg(repo_dir).arg("rev-parse").arg("HEAD").output()?;
    if output.status.success() { Ok(String::from_utf8_lossy(&output.stdout).trim().to_string()) } else { anyhow::bail!("git rev-parse failed") }
}

pub fn list_agents(app_data_dir: &Path) -> anyhow::Result<Vec<LocalAgent>> {
    let repo_dir = source_dir(app_data_dir);
    if !repo_dir.exists() { return Ok(Vec::new()); }
    let mut agents = Vec::new();
    for dir in AGENT_DIRS {
        let root = repo_dir.join(dir);
        if !root.exists() { continue; }
        for entry in WalkDir::new(&root).into_iter().flatten() {
            let path = entry.path();
            if !path.is_file() || path.extension().and_then(|e| e.to_str()) != Some("md") { continue; }
            let raw = fs::read_to_string(path)?;
            if !raw.starts_with("---") { continue; }
            let (frontmatter, body) = split_frontmatter(&raw);
            let slug = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
            let name = field(&frontmatter, "name").unwrap_or_else(|| slug.clone());
            let description = field(&frontmatter, "description").unwrap_or_default();
            let mut hasher = Sha256::new();
            hasher.update(raw.as_bytes());
            let id = format!("{}:{}:{:x}", SOURCE_ID, slug, hasher.finalize());
            agents.push(LocalAgent { id, slug, name, description, category: dir.to_string(), source_path: path.display().to_string(), body, raw_markdown: raw });
        }
    }
    agents.sort_by(|a, b| a.slug.cmp(&b.slug));
    Ok(agents)
}

fn split_frontmatter(raw: &str) -> (String, String) {
    let mut parts = raw.splitn(3, "---");
    let _ = parts.next();
    let fm = parts.next().unwrap_or_default().trim().to_string();
    let body = parts.next().unwrap_or_default().trim_start().to_string();
    (fm, body)
}

fn field(frontmatter: &str, key: &str) -> Option<String> {
    frontmatter.lines().find_map(|line| {
        let (k, v) = line.split_once(':')?;
        (k.trim() == key).then(|| v.trim().trim_matches('"').to_string())
    })
}
