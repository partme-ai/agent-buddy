use crate::bundle::AgentBundle;
use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstructionInjectionPlan {
    pub bundle_id: String,
    pub runtime: RuntimeKind,
    pub scope: String,
    pub target_files: Vec<InstructionTargetFile>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstructionTargetFile {
    pub relative_path: String,
    pub absolute_path: Option<String>,
    pub content: String,
    pub merge_strategy: String,
}

pub fn build_instruction_plan(
    bundle: &AgentBundle,
    runtime: RuntimeKind,
    project_dir: Option<&str>,
) -> InstructionInjectionPlan {
    let mut warnings = Vec::new();
    let file_name = instruction_file_name(runtime);
    let relative_path = if matches!(runtime, RuntimeKind::ClaudeCode) {
        "CLAUDE.md".to_string()
    } else if matches!(runtime, RuntimeKind::GeminiCli | RuntimeKind::Antigravity) {
        "GEMINI.md".to_string()
    } else {
        file_name.to_string()
    };
    let absolute_path = project_dir.map(|dir| Path::new(dir).join(&relative_path).display().to_string());
    if project_dir.is_none() && project_level_instruction(runtime) {
        warnings.push("Project directory is required for project-level instruction injection.".to_string());
    }
    InstructionInjectionPlan {
        bundle_id: bundle.bundle_id.clone(),
        runtime,
        scope: if project_level_instruction(runtime) { "project".to_string() } else { "global-or-project".to_string() },
        target_files: vec![InstructionTargetFile {
            relative_path,
            absolute_path,
            content: render_instruction(bundle, runtime),
            merge_strategy: "agent-buddy-managed-section".to_string(),
        }],
        warnings,
    }
}

fn instruction_file_name(runtime: RuntimeKind) -> &'static str {
    match runtime {
        RuntimeKind::ClaudeCode => "CLAUDE.md",
        RuntimeKind::GeminiCli | RuntimeKind::Antigravity => "GEMINI.md",
        _ => "AGENTS.md",
    }
}

fn project_level_instruction(runtime: RuntimeKind) -> bool {
    matches!(
        runtime,
        RuntimeKind::OpenCode
            | RuntimeKind::Cursor
            | RuntimeKind::Trae
            | RuntimeKind::Aider
            | RuntimeKind::Windsurf
            | RuntimeKind::Qwen
            | RuntimeKind::Codex
            | RuntimeKind::Qoder
    )
}

fn render_instruction(bundle: &AgentBundle, runtime: RuntimeKind) -> String {
    let mut content = String::new();
    content.push_str("<!-- BEGIN AGENT BUDDY MANAGED SECTION -->\n");
    content.push_str(&format!("# {}\n\n", bundle.profile.name));
    content.push_str(&format!("Bundle: `{}`\n\n", bundle.bundle_id));
    content.push_str(&format!("Runtime target: `{:?}`\n\n", runtime));
    content.push_str("## Role\n\n");
    content.push_str(&bundle.instructions.role);
    content.push_str("\n\n## Core Instructions\n\n");
    content.push_str(&bundle.instructions.body);
    if !bundle.instructions.rules.is_empty() {
        content.push_str("\n\n## Rules\n\n");
        for rule in &bundle.instructions.rules {
            content.push_str(&format!("- {}\n", rule));
        }
    }
    content.push_str("\n## Memory Policy\n\n");
    content.push_str(&format!("Provider: `{}`\n\n", bundle.memory.provider));
    content.push_str(&format!("Read scopes: `{}`\n\n", bundle.memory.read_scopes.join(", ")));
    content.push_str(&format!("Write policy: `{}`\n\n", bundle.memory.write_policy));
    content.push_str("## Knowledge Policy\n\n");
    content.push_str(&format!("Sync mode: `{}`\n\n", bundle.knowledge.sync_mode));
    if !bundle.knowledge.spaces.is_empty() {
        content.push_str(&format!("Knowledge spaces: `{}`\n\n", bundle.knowledge.spaces.join(", ")));
    }
    content.push_str("## Buddy MCP Servers\n\n");
    for server in &bundle.mcp_servers {
        content.push_str(&format!("- `{}` required={}\n", server.id, server.required));
    }
    content.push_str("\n<!-- END AGENT BUDDY MANAGED SECTION -->\n");
    content
}

pub fn resolve_instruction_target(project_dir: Option<&str>, relative_path: &str) -> Option<PathBuf> {
    project_dir.map(|dir| Path::new(dir).join(relative_path))
}
