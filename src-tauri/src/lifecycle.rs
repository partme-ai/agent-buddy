use crate::runtime::{AgentInstallation, RuntimeKind};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LifecyclePlan {
    pub action: LifecycleAction,
    pub runtime: Option<RuntimeKind>,
    pub installation_id: Option<String>,
    pub steps: Vec<LifecycleStep>,
    pub warnings: Vec<String>,
    pub reversible: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LifecycleAction {
    Install,
    Reinstall,
    Upgrade,
    Uninstall,
    Repair,
    Rollback,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LifecycleStep {
    pub id: String,
    pub label: String,
    pub description: String,
    pub destructive: bool,
}

pub fn repair_plan(installation: &AgentInstallation) -> LifecyclePlan {
    LifecyclePlan {
        action: LifecycleAction::Repair,
        runtime: Some(installation.runtime),
        installation_id: Some(installation.id.clone()),
        steps: vec![
            step("detect-runtime", "Detect runtime", "Verify runtime command/config directory is still available.", false),
            step("verify-files", "Verify installed files", "Check installed file paths recorded in SQLite.", false),
            step("restore-missing", "Restore missing files", "Rebuild generated artifacts and rewrite missing files if needed.", true),
            step("post-actions", "Run post actions", "Run runtime-specific post-install actions such as OpenClaw registration.", false),
        ],
        warnings: vec!["Repair may overwrite missing or corrupted files with regenerated content.".to_string()],
        reversible: true,
    }
}

pub fn uninstall_plan(installation: &AgentInstallation) -> LifecyclePlan {
    LifecyclePlan {
        action: LifecycleAction::Uninstall,
        runtime: Some(installation.runtime),
        installation_id: Some(installation.id.clone()),
        steps: vec![
            step("backup-current", "Backup current files", "Create a final backup snapshot before removing installed files.", false),
            step("remove-files", "Remove installed files", "Delete files recorded in the installation manifest.", true),
            step("remove-record", "Remove installation record", "Remove SQLite installation record after file deletion succeeds.", true),
        ],
        warnings: vec!["Only files recorded by Agent Buddy are removed.".to_string()],
        reversible: true,
    }
}

pub fn upgrade_plan(runtime: RuntimeKind, installation_id: Option<String>) -> LifecyclePlan {
    LifecyclePlan {
        action: LifecycleAction::Upgrade,
        runtime: Some(runtime),
        installation_id,
        steps: vec![
            step("diff-bundle", "Compute bundle diff", "Compare currently installed bundle with the new bundle version.", false),
            step("risk-scan", "Risk scan", "Scan generated files and permission changes before upgrade.", false),
            step("backup-existing", "Backup existing files", "Backup files before writing the upgrade.", false),
            step("write-new", "Write upgraded files", "Write converted runtime artifacts.", true),
            step("record-sync", "Record audit and sync", "Write audit events and enqueue Agent PaaS sync outbox events.", false),
        ],
        warnings: vec!["High-risk permission or MCP changes should require approval.".to_string()],
        reversible: true,
    }
}

fn step(id: &str, label: &str, description: &str, destructive: bool) -> LifecycleStep {
    LifecycleStep { id: id.to_string(), label: label.to_string(), description: description.to_string(), destructive }
}
