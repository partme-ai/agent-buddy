use crate::domain::{LocalAgent, SourceRefreshResult};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

const SOURCE_ID: &str = "agency-agents-zh";
const SOURCE_URL: &str = "https://github.com/jnMetaCode/agency-agents-zh.git";

const AGENT_DIRS: &[&str] = &[
    "academic", "design", "engineering", "finance", "game-development", "gis", "hr", "legal",
    "marketing", "paid-media", "sales", "product", "project-management", "security",
    "supply-chain", "testing", "support", "spatial-computing", "specialized",
];

pub fn source_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("sources").join(SOURCE_ID).join("repo")
}

pub fn refresh_source(app_data_dir: &Path) -> anyhow::Result<SourceRefreshResult> {
    let repo_dir = source_dir(app_data_dir);
    if repo_dir.exists() {
        run_git(&repo_dir, &["pull", "--ff-only"])?;
    } else {
        fs::create_dir_all(repo_dir.parent().ok_or_else(|| anyhow::anyhow!("invalid source path"))?)?;
        let status = Command::new("git")
            .arg("clone")
            .arg("--depth")
            .arg("1")
            .arg(SOURCE_URL)
            .arg(&repo_dir)
            .output()?;
        if !status.status.success() {
            anyhow::bail!("git clone failed: {}", String::from_utf8_lossy(&status.stderr));
        }
    }

    let commit = current_commit(&repo_dir).ok();
    write_manifest(app_data_dir, commit.as_deref())?;

    Ok(SourceRefreshResult {
        source_id: SOURCE_ID.to_string(),
        local_path: repo_dir.display().to_string(),
        commit_sha: commit,
        message: "agency-agents-zh source refreshed".to_string(),
    })
}

fn run_git(repo_dir: &Path, args: &[&str]) -> anyhow::Result<()> {
    let status = Command::new("git").arg("-C").arg(repo_dir).args(args).output()?;
    if status.status.success() {
        Ok(())
    } else {
        anyhow::bail!("git {:?} failed: {}", args, String::from_utf8_lossy(&status.stderr));
    }
}

fn current_commit(repo_dir: &Path) -> anyhow::Result<String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(repo_dir)
        .arg("rev-parse")
        .arg("HEAD")
        .output()?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        anyhow::bail!("git rev-parse failed")
    }
}

fn write_manifest(app_data_dir: &Path, commit: Option<&str>) -> anyhow::Result<()> {
    let dir = app_data_dir.join("sources").join(SOURCE_ID);
    fs::create_dir_all(&dir)?;
    let manifest = serde_json::json!({
        "id": SOURCE_ID,
        "repoUrl": SOURCE_URL,
        "branch": "main",
        "commitSha": commit,
        "license": "MIT",
        "updatedAt": chrono::Utc::now().timestamp()
    });
    fs::write(dir.join("manifest.json"), serde_json::to_string_pretty(&manifest)?)?;
    Ok(())
}

pub fn list_agents(app_data_dir: &Path) -> anyhow::Result<Vec<LocalAgent>> {
    let repo_dir = source_dir(app_data_dir);
    if !repo_dir.exists() {
        return Ok(Vec::new());
    }

    let mut agents = Vec::new();
    for dir in AGENT_DIRS {
        let root = repo_dir.join(dir);
        if !root.exists() {
            continue;
        }
        for entry in WalkDir::new(&root).into_iter().flatten() {
            let path = entry.path();
            if !path.is_file() || path.extension().and_then(|e| e.to_str()) != Some("md") {
                continue;
            }
            let raw = fs::read_to_string(path)?;
            if !raw.trim_start().starts_with("---") {
                continue;
            }
            let (frontmatter_text, body) = split_frontmatter(&raw);
            let frontmatter = parse_frontmatter(&frontmatter_text);
            let slug = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
            let name = frontmatter.get("name").cloned().unwrap_or_else(|| slug.clone());
            let description = frontmatter.get("description").cloned().unwrap_or_default();
            let mut hasher = Sha256::new();
            hasher.update(raw.as_bytes());
            let id = format!("{}:{}:{:x}", SOURCE_ID, slug, hasher.finalize());
            agents.push(LocalAgent {
                id,
                slug,
                name,
                description,
                category: dir.to_string(),
                source_path: path.display().to_string(),
                body,
                raw_markdown: raw,
                frontmatter,
            });
        }
    }
    agents.sort_by(|a, b| a.category.cmp(&b.category).then_with(|| a.slug.cmp(&b.slug)));
    Ok(agents)
}

fn split_frontmatter(raw: &str) -> (String, String) {
    let trimmed = raw.trim_start();
    let mut parts = trimmed.splitn(3, "---");
    let _ = parts.next();
    let fm = parts.next().unwrap_or_default().trim().to_string();
    let body = parts.next().unwrap_or_default().trim_start().to_string();
    (fm, body)
}

fn parse_frontmatter(frontmatter: &str) -> BTreeMap<String, String> {
    let mut fields = BTreeMap::new();
    for line in frontmatter.lines() {
        let Some((key, value)) = line.split_once(':') else { continue; };
        let key = key.trim();
        if key.is_empty() {
            continue;
        }
        fields.insert(key.to_string(), normalize_value(value));
    }
    fields
}

fn normalize_value(value: &str) -> String {
    value.trim().trim_matches('"').trim_matches('\'').to_string()
}
