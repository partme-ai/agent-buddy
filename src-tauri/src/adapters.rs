use crate::domain::LocalAgent;
use crate::runtime::{InstallScope, InstallTarget, RuntimeDetection, RuntimeKind};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedFile {
    pub relative_path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeDefinition {
    pub kind: RuntimeKind,
    pub label: String,
    pub scope: InstallScope,
    pub requires_project_dir: bool,
    pub supports_uninstall: bool,
    pub supports_native_registration: bool,
    pub default_target: Option<String>,
}

pub fn runtime_definitions() -> Vec<RuntimeDefinition> {
    crate::runtime_adapters::descriptors()
        .into_iter()
        .map(|descriptor| RuntimeDefinition {
            kind: descriptor.kind,
            label: descriptor.label.to_string(),
            scope: descriptor.scope,
            requires_project_dir: matches!(descriptor.scope, InstallScope::Project),
            supports_uninstall: true,
            supports_native_registration: !descriptor.native_actions.is_empty(),
            default_target: crate::runtime_adapters::default_target(descriptor.kind).map(|path| path.display().to_string()),
        })
        .collect()
}

pub fn detect_all() -> Vec<RuntimeDetection> {
    crate::runtime_adapters::detect_all()
}

pub fn detect(kind: RuntimeKind) -> RuntimeDetection {
    crate::runtime_adapters::detect(kind)
}

pub fn target_dirs(target: &InstallTarget) -> anyhow::Result<Vec<PathBuf>> {
    crate::runtime_adapters::target_dirs(target)
}

pub fn generate_files(agents: &[LocalAgent], target: &InstallTarget) -> Vec<GeneratedFile> {
    crate::runtime_adapters::generation::generate_files(agents, target)
}

pub fn ensure_inside_base(base: &Path, path: &Path) -> anyhow::Result<()> {
    if path.components().any(|component| matches!(component, std::path::Component::ParentDir)) {
        anyhow::bail!("unsafe relative path: {}", path.display());
    }
    let parent = path.parent().unwrap_or(base);
    if !parent.starts_with(base) && path.is_absolute() {
        anyhow::bail!("path escapes target directory: {}", path.display());
    }
    Ok(())
}
