use crate::bundle::AgentBundle;
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentBundleDiff {
    pub old_bundle_id: String,
    pub new_bundle_id: String,
    pub old_version: String,
    pub new_version: String,
    pub changes: Vec<BundleChange>,
    pub risk_level: BundleDiffRiskLevel,
    pub requires_user_confirmation: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleChange {
    pub kind: BundleChangeKind,
    pub path: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub risk: BundleDiffRiskLevel,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BundleChangeKind {
    ProfileChanged,
    InstructionChanged,
    KnowledgeChanged,
    MemoryPolicyChanged,
    SkillAdded,
    SkillRemoved,
    McpAdded,
    McpRemoved,
    PermissionChanged,
    RuntimeTargetAdded,
    RuntimeTargetRemoved,
    MetadataChanged,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BundleDiffRiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

pub fn diff_bundles(old: &AgentBundle, new: &AgentBundle) -> AgentBundleDiff {
    let mut changes = Vec::new();
    if old.profile.name != new.profile.name {
        changes.push(change(BundleChangeKind::ProfileChanged, "profile.name", Some(&old.profile.name), Some(&new.profile.name), BundleDiffRiskLevel::Low));
    }
    if old.profile.description != new.profile.description {
        changes.push(change(BundleChangeKind::ProfileChanged, "profile.description", Some(&old.profile.description), Some(&new.profile.description), BundleDiffRiskLevel::Low));
    }
    if old.instructions.body != new.instructions.body {
        changes.push(change(BundleChangeKind::InstructionChanged, "instructions.body", Some("<old instructions>"), Some("<new instructions>"), BundleDiffRiskLevel::Medium));
    }
    if old.memory.write_policy != new.memory.write_policy {
        changes.push(change(BundleChangeKind::MemoryPolicyChanged, "memory.writePolicy", Some(&old.memory.write_policy), Some(&new.memory.write_policy), BundleDiffRiskLevel::High));
    }
    compare_sets(&mut changes, "skills", skill_ids(old), skill_ids(new), BundleChangeKind::SkillAdded, BundleChangeKind::SkillRemoved, BundleDiffRiskLevel::Medium);
    compare_sets(&mut changes, "mcpServers", mcp_ids(old), mcp_ids(new), BundleChangeKind::McpAdded, BundleChangeKind::McpRemoved, BundleDiffRiskLevel::High);
    compare_sets(&mut changes, "targets", target_ids(old), target_ids(new), BundleChangeKind::RuntimeTargetAdded, BundleChangeKind::RuntimeTargetRemoved, BundleDiffRiskLevel::Low);
    if old.permissions.shell != new.permissions.shell {
        changes.push(change(BundleChangeKind::PermissionChanged, "permissions.shell", Some(&old.permissions.shell), Some(&new.permissions.shell), BundleDiffRiskLevel::Critical));
    }
    if old.permissions.network != new.permissions.network {
        changes.push(change(BundleChangeKind::PermissionChanged, "permissions.network", Some(&old.permissions.network), Some(&new.permissions.network), BundleDiffRiskLevel::High));
    }
    if old.permissions.file_write != new.permissions.file_write {
        changes.push(change(BundleChangeKind::PermissionChanged, "permissions.fileWrite", Some(&old.permissions.file_write), Some(&new.permissions.file_write), BundleDiffRiskLevel::High));
    }
    let risk_level = changes.iter().map(|change| change.risk).max().unwrap_or(BundleDiffRiskLevel::Low);
    AgentBundleDiff {
        old_bundle_id: old.bundle_id.clone(),
        new_bundle_id: new.bundle_id.clone(),
        old_version: old.version.clone(),
        new_version: new.version.clone(),
        changes,
        risk_level,
        requires_user_confirmation: matches!(risk_level, BundleDiffRiskLevel::High | BundleDiffRiskLevel::Critical),
    }
}

fn compare_sets(
    changes: &mut Vec<BundleChange>,
    prefix: &str,
    old: BTreeSet<String>,
    new: BTreeSet<String>,
    added_kind: BundleChangeKind,
    removed_kind: BundleChangeKind,
    risk: BundleDiffRiskLevel,
) {
    for id in new.difference(&old) {
        changes.push(change(added_kind, &format!("{prefix}.{id}"), None, Some(id), risk));
    }
    for id in old.difference(&new) {
        changes.push(change(removed_kind, &format!("{prefix}.{id}"), Some(id), None, risk));
    }
}

fn change(kind: BundleChangeKind, path: &str, old_value: Option<&str>, new_value: Option<&str>, risk: BundleDiffRiskLevel) -> BundleChange {
    BundleChange {
        kind,
        path: path.to_string(),
        old_value: old_value.map(str::to_string),
        new_value: new_value.map(str::to_string),
        risk,
    }
}

fn skill_ids(bundle: &AgentBundle) -> BTreeSet<String> {
    bundle.skills.iter().map(|skill| skill.id.clone()).collect()
}

fn mcp_ids(bundle: &AgentBundle) -> BTreeSet<String> {
    bundle.mcp_servers.iter().map(|server| server.id.clone()).collect()
}

fn target_ids(bundle: &AgentBundle) -> BTreeSet<String> {
    bundle.targets.iter().map(|target| format!("{:?}", target)).collect()
}
