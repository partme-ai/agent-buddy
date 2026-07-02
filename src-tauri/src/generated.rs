use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedArtifact {
    pub source_id: String,
    pub generation_id: String,
    pub runtime: String,
    pub relative_path: String,
    pub absolute_path: String,
    pub size_bytes: u64,
    pub modified_at: Option<i64>,
}

pub fn list_generated_artifacts(app_data_dir: &Path) -> anyhow::Result<Vec<GeneratedArtifact>> {
    let root = app_data_dir.join("generated");
    if !root.exists() {
        return Ok(Vec::new());
    }
    let mut artifacts = Vec::new();
    for entry in WalkDir::new(&root).into_iter().flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Ok(relative) = path.strip_prefix(&root) else { continue; };
        let mut components = relative.components();
        let source_id = components.next().map(|c| c.as_os_str().to_string_lossy().to_string()).unwrap_or_default();
        let generation_id = components.next().map(|c| c.as_os_str().to_string_lossy().to_string()).unwrap_or_default();
        let runtime = components.next().map(|c| c.as_os_str().to_string_lossy().to_string()).unwrap_or_default();
        let metadata = fs::metadata(path)?;
        let modified_at = metadata.modified().ok().and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok()).map(|duration| duration.as_secs() as i64);
        artifacts.push(GeneratedArtifact {
            source_id,
            generation_id,
            runtime,
            relative_path: relative.to_string_lossy().replace('\\', "/"),
            absolute_path: path.display().to_string(),
            size_bytes: metadata.len(),
            modified_at,
        });
    }
    artifacts.sort_by(|a, b| b.modified_at.cmp(&a.modified_at).then_with(|| a.relative_path.cmp(&b.relative_path)));
    Ok(artifacts)
}

pub fn read_generated_artifact(path: &str) -> anyhow::Result<String> {
    let path = PathBuf::from(path);
    if !path.exists() || !path.is_file() {
        anyhow::bail!("generated artifact does not exist: {}", path.display());
    }
    Ok(fs::read_to_string(path)?)
}
