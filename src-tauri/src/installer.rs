use crate::domain::LocalAgent;
use crate::runtime::{AgentInstallation, InstallResult, InstallScope, InstallTarget, RuntimeKind};
use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub fn install_agents(agents: &[LocalAgent], target: &InstallTarget, source_commit: Option<String>) -> anyhow::Result<(InstallResult, Vec<AgentInstallation>)> {
    let target_dir = resolve_target_dir(target)?;
    fs::create_dir_all(&target_dir)?;
    let mut records = Vec::new();
    let mut files_written = 0usize;
    for agent in agents {
        let generated = convert_agent(agent, target.runtime);
        let mut installed_files = Vec::new();
        for (relative, content) in generated {
            let dest = target_dir.join(&relative);
            if let Some(parent) = dest.parent() { fs::create_dir_all(parent)?; }
            fs::write(&dest, content)?;
            installed_files.push(dest.display().to_string());
            files_written += 1;
        }
        records.push(AgentInstallation {
            id: Uuid::new_v4().to_string(), source_id: "agency-agents-zh".to_string(), agent_id: agent.id.clone(), runtime: target.runtime,
            scope: target.runtime.scope(), project_dir: target.project_dir.clone(), target_path: target_dir.display().to_string(), installed_files,
            source_commit: source_commit.clone(), installed_at: Utc::now().timestamp(), status: "installed".to_string(),
        });
    }
    Ok((InstallResult { runtime: target.runtime, installed_count: agents.len(), target_path: target_dir.display().to_string(), files_written, warnings: warnings_for(target.runtime) }, records))
}

pub fn remove_installation(record: &AgentInstallation) -> anyhow::Result<()> {
    for file in &record.installed_files {
        let path = PathBuf::from(file);
        if path.exists() { let _ = fs::remove_file(path); }
    }
    Ok(())
}

fn resolve_target_dir(target: &InstallTarget) -> anyhow::Result<PathBuf> {
    if let Some(custom) = &target.custom_dir { return Ok(PathBuf::from(custom)); }
    match target.runtime.scope() {
        InstallScope::Global => target.runtime.default_target().ok_or_else(|| anyhow::anyhow!("missing global target")),
        InstallScope::Project => {
            let project = target.project_dir.as_ref().ok_or_else(|| anyhow::anyhow!("projectDir is required"))?;
            let base = Path::new(project);
            Ok(match target.runtime {
                RuntimeKind::OpenCode => base.join(".opencode/agents"),
                RuntimeKind::Cursor => base.join(".cursor/rules"),
                RuntimeKind::Trae => base.join(".trae/rules"),
                RuntimeKind::Aider => base.to_path_buf(),
                RuntimeKind::Windsurf => base.to_path_buf(),
                RuntimeKind::Qwen => base.join(".qwen/agents"),
                RuntimeKind::Codex => base.join(".codex/agents"),
                RuntimeKind::Qoder => base.join(".qoder/agents"),
                _ => base.to_path_buf(),
            })
        }
        InstallScope::Custom => Ok(target.custom_dir.clone().or_else(|| std::env::var("DEERFLOW_SKILLS_DIR").ok()).map(PathBuf::from).unwrap_or_else(|| PathBuf::from("./skills/custom"))),
    }
}

fn convert_agent(agent: &LocalAgent, runtime: RuntimeKind) -> Vec<(String, String)> {
    match runtime {
        RuntimeKind::ClaudeCode | RuntimeKind::Copilot | RuntimeKind::Kiro | RuntimeKind::Qwen | RuntimeKind::Qoder => vec![(format!("{}.md", agent.slug), agent.raw_markdown.clone())],
        RuntimeKind::OpenCode => vec![(format!("{}.md", agent.slug), format!("---\nname: {}\ndescription: {}\nmode: subagent\n---\n{}", agent.name, agent.description, agent.body))],
        RuntimeKind::Cursor => vec![(format!("{}.mdc", agent.slug), format!("---\ndescription: {}\nglobs:\nalwaysApply: false\n---\n{}", agent.description, agent.body))],
        RuntimeKind::Trae => vec![(format!("{}.md", agent.slug), format!("---\ndescription: {}\nglobs:\nalwaysApply: false\n---\n{}", agent.description, agent.body))],
        RuntimeKind::Aider => vec![("CONVENTIONS.md".to_string(), agent.body.clone())],
        RuntimeKind::Windsurf => vec![(".windsurfrules".to_string(), agent.body.clone())],
        RuntimeKind::Codex => vec![(format!("{}.toml", agent.slug), format!("name = \"{}\"\ndescription = \"{}\"\ndeveloper_instructions = \"\"\"\n{}\n\"\"\"\n", agent.slug, agent.description.replace('"', "\\\""), agent.body.replace("\"\"\"", "\\\"\"\"")))],
        RuntimeKind::OpenClaw => vec![(format!("{}/SOUL.md", agent.slug), agent.body.clone()), (format!("{}/AGENTS.md", agent.slug), format!("# AGENTS.md - workspace specification\n\n{}", agent.body)), (format!("{}/IDENTITY.md", agent.slug), format!("# {}\n{}\n", agent.name, agent.description))],
        RuntimeKind::GeminiCli => vec![("gemini-extension.json".to_string(), "{\"name\":\"agency-agents\",\"version\":\"0.1.0\"}".to_string()), (format!("skills/{}/SKILL.md", agent.slug), skill(agent))],
        RuntimeKind::Hermes => vec![(format!("{}/{}/SKILL.md", agent.category, agent.slug), skill(agent))],
        RuntimeKind::Antigravity | RuntimeKind::DeerFlow | RuntimeKind::WorkBuddy | RuntimeKind::CodeWhale => vec![(format!("{}/SKILL.md", agent.slug), skill(agent))],
    }
}

fn skill(agent: &LocalAgent) -> String {
    format!("---\nname: {}\ndescription: {}\n---\n{}", agent.slug, agent.description, agent.body)
}

fn warnings_for(runtime: RuntimeKind) -> Vec<String> {
    match runtime {
        RuntimeKind::OpenClaw => vec!["Run `openclaw gateway restart` after install.".to_string()],
        RuntimeKind::Hermes => vec!["Hermes Discord mode may require category-limited installs.".to_string()],
        _ => Vec::new(),
    }
}
