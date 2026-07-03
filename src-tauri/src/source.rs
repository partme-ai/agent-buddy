use crate::domain::{AgentSourceSummary, LocalAgent, SourceImportRequest, SourceRefreshResult};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

const DEFAULT_SOURCE_ID: &str = "agency-agents-zh";
const DEFAULT_SOURCE_NAME: &str = "agency-agents-zh";
const DEFAULT_SOURCE_URL: &str = "https://github.com/jnMetaCode/agency-agents-zh.git";

const AGENT_DIRS: &[&str] = &[
    "academic", "design", "engineering", "finance", "game-development", "gis", "hr", "legal",
    "marketing", "paid-media", "sales", "product", "project-management", "security",
    "supply-chain", "testing", "support", "spatial-computing", "specialized",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentSourceManifest {
    id: String,
    name: String,
    source_url: String,
    source_kind: String,
    branch: Option<String>,
    commit_sha: Option<String>,
    license: Option<String>,
    local_path: String,
    imported_at: i64,
    updated_at: i64,
    status: String,
}

pub fn source_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("sources").join(DEFAULT_SOURCE_ID).join("repo")
}

pub fn refresh_source(app_data_dir: &Path) -> anyhow::Result<SourceRefreshResult> {
    import_or_refresh_source(
        app_data_dir,
        SourceImportRequest {
            source_url: DEFAULT_SOURCE_URL.to_string(),
            name: Some(DEFAULT_SOURCE_NAME.to_string()),
            branch: Some("main".to_string()),
            source_kind: Some("git".to_string()),
        },
    )
}

pub fn import_or_refresh_source(app_data_dir: &Path, request: SourceImportRequest) -> anyhow::Result<SourceRefreshResult> {
    let source_url = normalize_source_url(&request.source_url);
    if source_url.trim().is_empty() {
        anyhow::bail!("sourceUrl is required");
    }
    let source_kind = request.source_kind.clone().unwrap_or_else(|| infer_source_kind(&source_url));
    let name = request.name.clone().filter(|value| !value.trim().is_empty()).unwrap_or_else(|| infer_source_name(&source_url));
    let source_id = slugify(&name);
    let source_root = app_data_dir.join("sources").join(&source_id);
    let repo_dir = if source_kind == "local" {
        PathBuf::from(&source_url)
    } else {
        source_root.join("repo")
    };
    fs::create_dir_all(&source_root)?;

    if source_kind == "local" {
        if !repo_dir.exists() || !repo_dir.is_dir() {
            anyhow::bail!("local source path does not exist or is not a directory: {}", repo_dir.display());
        }
    } else if repo_dir.exists() {
        run_git(&repo_dir, &["pull", "--ff-only"])?;
    } else {
        fs::create_dir_all(repo_dir.parent().ok_or_else(|| anyhow::anyhow!("invalid source path"))?)?;
        let mut command = Command::new("git");
        command.arg("clone").arg("--depth").arg("1");
        if let Some(branch) = request.branch.as_ref().filter(|value| !value.trim().is_empty()) {
            command.arg("--branch").arg(branch);
        }
        let status = command.arg(&source_url).arg(&repo_dir).output()?;
        if !status.status.success() {
            anyhow::bail!("git clone failed: {}", String::from_utf8_lossy(&status.stderr));
        }
    }

    let commit = if source_kind == "local" { None } else { current_commit(&repo_dir).ok() };
    let imported_at = read_manifest(&source_root).map(|manifest| manifest.imported_at).unwrap_or_else(|_| chrono::Utc::now().timestamp());
    let manifest = AgentSourceManifest {
        id: source_id.clone(),
        name: name.clone(),
        source_url: source_url.clone(),
        source_kind: source_kind.clone(),
        branch: request.branch.clone(),
        commit_sha: commit.clone(),
        license: detect_license(&repo_dir),
        local_path: repo_dir.display().to_string(),
        imported_at,
        updated_at: chrono::Utc::now().timestamp(),
        status: "ready".to_string(),
    };
    write_manifest(&source_root, &manifest)?;

    let agents = scan_agents_for_manifest(&manifest)?;
    let categories = agents.iter().map(|agent| agent.category.clone()).collect::<BTreeSet<_>>().len();
    let runtime_count = runtime_count_for_source(&manifest, &repo_dir);
    Ok(SourceRefreshResult {
        source_id,
        source_name: name,
        source_url,
        source_kind,
        local_path: repo_dir.display().to_string(),
        commit_sha: commit,
        agent_count: agents.len(),
        category_count: categories,
        runtime_count,
        message: format!("agent source imported/refreshed: {}", manifest.id),
    })
}

pub fn refresh_source_by_id(app_data_dir: &Path, source_id: &str) -> anyhow::Result<SourceRefreshResult> {
    let root = app_data_dir.join("sources").join(source_id);
    let manifest = read_manifest(&root)?;
    import_or_refresh_source(app_data_dir, SourceImportRequest {
        source_url: manifest.source_url,
        name: Some(manifest.name),
        branch: manifest.branch,
        source_kind: Some(manifest.source_kind),
    })
}

pub fn list_sources(app_data_dir: &Path) -> anyhow::Result<Vec<AgentSourceSummary>> {
    let root = app_data_dir.join("sources");
    if !root.exists() {
        return Ok(Vec::new());
    }
    let mut sources = Vec::new();
    for entry in fs::read_dir(root)? {
        let entry = entry?;
        if !entry.path().is_dir() {
            continue;
        }
        let Ok(manifest) = read_manifest(&entry.path()) else { continue; };
        let agents = scan_agents_for_manifest(&manifest).unwrap_or_default();
        let category_count = agents.iter().map(|agent| agent.category.clone()).collect::<BTreeSet<_>>().len();
        sources.push(AgentSourceSummary {
            id: manifest.id.clone(),
            name: manifest.name.clone(),
            source_url: manifest.source_url.clone(),
            source_kind: manifest.source_kind.clone(),
            branch: manifest.branch.clone(),
            local_path: manifest.local_path.clone(),
            commit_sha: manifest.commit_sha.clone(),
            license: manifest.license.clone(),
            agent_count: agents.len(),
            category_count,
            runtime_count: runtime_count_for_source(&manifest, Path::new(&manifest.local_path)),
            imported_at: manifest.imported_at,
            updated_at: manifest.updated_at,
            status: manifest.status.clone(),
        });
    }
    sources.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(sources)
}

pub fn list_agents(app_data_dir: &Path) -> anyhow::Result<Vec<LocalAgent>> {
    let sources = list_source_manifests(app_data_dir)?;
    let mut agents = Vec::new();
    for manifest in sources {
        agents.extend(scan_agents_for_manifest(&manifest)?);
    }
    agents.sort_by(|a, b| a.source_id.cmp(&b.source_id).then_with(|| a.category.cmp(&b.category)).then_with(|| a.slug.cmp(&b.slug)));
    Ok(agents)
}

pub fn list_agents_for_source(app_data_dir: &Path, source_id: &str) -> anyhow::Result<Vec<LocalAgent>> {
    let root = app_data_dir.join("sources").join(source_id);
    let manifest = read_manifest(&root)?;
    scan_agents_for_manifest(&manifest)
}

fn list_source_manifests(app_data_dir: &Path) -> anyhow::Result<Vec<AgentSourceManifest>> {
    let root = app_data_dir.join("sources");
    if !root.exists() {
        return Ok(Vec::new());
    }
    let mut manifests = Vec::new();
    for entry in fs::read_dir(root)? {
        let entry = entry?;
        if entry.path().is_dir() {
            if let Ok(manifest) = read_manifest(&entry.path()) {
                manifests.push(manifest);
            }
        }
    }
    Ok(manifests)
}

fn scan_agents_for_manifest(manifest: &AgentSourceManifest) -> anyhow::Result<Vec<LocalAgent>> {
    let repo_dir = PathBuf::from(&manifest.local_path);
    if !repo_dir.exists() {
        return Ok(Vec::new());
    }
    let mut agents = Vec::new();
    for entry in WalkDir::new(&repo_dir).into_iter().flatten() {
        let path = entry.path();
        if should_skip_path(path) || !path.is_file() || path.extension().and_then(|e| e.to_str()) != Some("md") {
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
        let category = derive_category(&repo_dir, path);
        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        let id = format!("{}:{}:{:x}", manifest.id, slug, hasher.finalize());
        agents.push(LocalAgent {
            id,
            source_id: manifest.id.clone(),
            source_name: manifest.name.clone(),
            slug,
            name,
            description,
            category,
            source_path: path.display().to_string(),
            body,
            raw_markdown: raw,
            frontmatter,
        });
    }
    agents.sort_by(|a, b| a.category.cmp(&b.category).then_with(|| a.slug.cmp(&b.slug)));
    Ok(agents)
}

fn run_git(repo_dir: &Path, args: &[&str]) -> anyhow::Result<()> {
    let status = Command::new("git").arg("-C").arg(repo_dir).args(args).output()?;
    if status.status.success() { Ok(()) } else { anyhow::bail!("git {:?} failed: {}", args, String::from_utf8_lossy(&status.stderr)); }
}

fn current_commit(repo_dir: &Path) -> anyhow::Result<String> {
    let output = Command::new("git").arg("-C").arg(repo_dir).arg("rev-parse").arg("HEAD").output()?;
    if output.status.success() { Ok(String::from_utf8_lossy(&output.stdout).trim().to_string()) } else { anyhow::bail!("git rev-parse failed") }
}

fn write_manifest(source_root: &Path, manifest: &AgentSourceManifest) -> anyhow::Result<()> {
    fs::create_dir_all(source_root)?;
    fs::write(source_root.join("manifest.json"), serde_json::to_string_pretty(manifest)?)?;
    Ok(())
}

fn read_manifest(source_root: &Path) -> anyhow::Result<AgentSourceManifest> {
    let content = fs::read_to_string(source_root.join("manifest.json"))?;
    Ok(serde_json::from_str(&content)?)
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
        if key.is_empty() { continue; }
        fields.insert(key.to_string(), normalize_value(value));
    }
    fields
}

fn normalize_value(value: &str) -> String { value.trim().trim_matches('"').trim_matches('\'').to_string() }

fn normalize_source_url(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.starts_with("https://github.com/") && !trimmed.ends_with(".git") {
        format!("{}.git", trimmed.trim_end_matches('/'))
    } else {
        trimmed.to_string()
    }
}

fn infer_source_kind(source_url: &str) -> String {
    if source_url.starts_with("http://") || source_url.starts_with("https://") || source_url.starts_with("git@") || source_url.ends_with(".git") { "git".to_string() } else { "local".to_string() }
}

fn infer_source_name(source_url: &str) -> String {
    let trimmed = source_url.trim_end_matches('/').trim_end_matches(".git");
    trimmed.rsplit(['/', ':']).next().unwrap_or("agent-source").to_string()
}

fn slugify(value: &str) -> String {
    let slug = value.to_lowercase().chars().map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' }).collect::<String>();
    slug.split('-').filter(|part| !part.is_empty()).collect::<Vec<_>>().join("-")
}

fn detect_license(repo_dir: &Path) -> Option<String> {
    ["LICENSE", "LICENSE.md", "COPYING"].iter().find_map(|file| {
        let path = repo_dir.join(file);
        if path.exists() { Some(file.to_string()) } else { None }
    })
}

fn derive_category(repo_dir: &Path, path: &Path) -> String {
    let relative = path.strip_prefix(repo_dir).unwrap_or(path);
    let first = relative.components().next().map(|component| component.as_os_str().to_string_lossy().to_string()).unwrap_or_else(|| "uncategorized".to_string());
    if first == path.file_name().unwrap_or_default().to_string_lossy() { "uncategorized".to_string() } else { first }
}

fn should_skip_path(path: &Path) -> bool {
    let text = path.to_string_lossy();
    text.contains("/.git/") || text.contains("/node_modules/") || text.contains("/target/") || text.contains("/integrations/")
}

fn runtime_count_for_source(manifest: &AgentSourceManifest, repo_dir: &Path) -> usize {
    let key = format!("{} {}", manifest.name, manifest.source_url).to_lowercase();
    if key.contains("agency-agents-zh") { return 18; }
    let integrations = repo_dir.join("integrations");
    if integrations.exists() {
        fs::read_dir(integrations).map(|entries| entries.filter_map(Result::ok).filter(|entry| entry.path().is_dir()).count()).unwrap_or(0)
    } else {
        0
    }
}
