use crate::domain::LocalAgent;
use crate::runtime::{InstallScope, InstallTarget, RuntimeDetection, RuntimeKind};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

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
    RuntimeKind::all()
        .into_iter()
        .map(|kind| RuntimeDefinition {
            kind,
            label: kind.label().to_string(),
            scope: kind.scope(),
            requires_project_dir: matches!(kind.scope(), InstallScope::Project),
            supports_uninstall: true,
            supports_native_registration: matches!(kind, RuntimeKind::OpenClaw),
            default_target: kind.default_target().map(|p| p.display().to_string()),
        })
        .collect()
}

pub fn detect_all() -> Vec<RuntimeDetection> {
    RuntimeKind::all().into_iter().map(detect).collect()
}

pub fn detect(kind: RuntimeKind) -> RuntimeDetection {
    let command_path = kind.command_names().iter().find_map(|name| resolve_command(name));
    let default_target = kind.default_target();
    let config_dir_detected = default_target.as_ref().is_some_and(|path| path.exists());
    let env_detected = match kind {
        RuntimeKind::Hermes => std::env::var("HERMES_HOME").ok().filter(|v| !v.is_empty()),
        RuntimeKind::DeerFlow => std::env::var("DEERFLOW_SKILLS_DIR").ok().filter(|v| !v.is_empty()),
        _ => None,
    };
    let detected = command_path.is_some() || config_dir_detected || env_detected.is_some();
    let mut notes = Vec::new();
    if matches!(kind.scope(), InstallScope::Project) {
        notes.push("Project-level runtime: choose a project directory before install.".to_string());
    }
    if matches!(kind, RuntimeKind::Hermes) {
        notes.push("Hermes supports category-limited installs for Discord slash-command length limits.".to_string());
    }
    if matches!(kind, RuntimeKind::OpenClaw) {
        notes.push("OpenClaw can be registered with `openclaw agents add` after workspace files are written.".to_string());
    }
    RuntimeDetection {
        kind,
        label: kind.label().to_string(),
        detected,
        scope: kind.scope(),
        command_path,
        config_dir: env_detected.or_else(|| default_target.as_ref().map(|path| path.display().to_string())),
        default_target: default_target.map(|path| path.display().to_string()),
        notes,
    }
}

fn resolve_command(name: &str) -> Option<String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("where").arg(name).output().ok()?
    } else {
        Command::new("sh").arg("-c").arg(format!("command -v {name}")).output().ok()?
    };
    output
        .status
        .success()
        .then(|| String::from_utf8_lossy(&output.stdout).lines().next().unwrap_or(name).trim().to_string())
}

pub fn target_dirs(target: &InstallTarget) -> anyhow::Result<Vec<PathBuf>> {
    if let Some(custom) = &target.custom_dir {
        return Ok(vec![PathBuf::from(custom)]);
    }
    match target.runtime.scope() {
        InstallScope::Global => {
            if target.runtime == RuntimeKind::Copilot {
                let home = home_dir()?;
                return Ok(vec![home.join(".github/agents"), home.join(".copilot/agents")]);
            }
            Ok(vec![target
                .runtime
                .default_target()
                .ok_or_else(|| anyhow::anyhow!("missing default target for {:?}", target.runtime))?])
        }
        InstallScope::Project => {
            let project = target
                .project_dir
                .as_ref()
                .ok_or_else(|| anyhow::anyhow!("projectDir is required for {:?}", target.runtime))?;
            let base = PathBuf::from(project);
            Ok(vec![match target.runtime {
                RuntimeKind::OpenCode => base.join(".opencode/agents"),
                RuntimeKind::Cursor => base.join(".cursor/rules"),
                RuntimeKind::Trae => base.join(".trae/rules"),
                RuntimeKind::Aider | RuntimeKind::Windsurf => base,
                RuntimeKind::Qwen => base.join(".qwen/agents"),
                RuntimeKind::Codex => base.join(".codex/agents"),
                RuntimeKind::Qoder => base.join(".qoder/agents"),
                RuntimeKind::DeerFlow => base.join("skills/custom"),
                _ => base,
            }])
        }
        InstallScope::Custom => {
            let path = target
                .custom_dir
                .clone()
                .or_else(|| std::env::var("DEERFLOW_SKILLS_DIR").ok())
                .unwrap_or_else(|| "./skills/custom".to_string());
            Ok(vec![PathBuf::from(path)])
        }
    }
}

pub fn generate_files(agents: &[LocalAgent], target: &InstallTarget) -> Vec<GeneratedFile> {
    match target.runtime {
        RuntimeKind::Aider => vec![GeneratedFile { relative_path: "CONVENTIONS.md".to_string(), content: aggregate_markdown(agents, "Agency Agents for Aider") }],
        RuntimeKind::Windsurf => vec![GeneratedFile { relative_path: ".windsurfrules".to_string(), content: aggregate_markdown(agents, "Agency Agents for Windsurf") }],
        RuntimeKind::GeminiCli => {
            let mut files = vec![GeneratedFile {
                relative_path: "gemini-extension.json".to_string(),
                content: "{\n  \"name\": \"agency-agents\",\n  \"version\": \"0.1.0\",\n  \"description\": \"Agency Agents installed by Agent Buddy\"\n}\n".to_string(),
            }];
            files.extend(agents.iter().map(|agent| GeneratedFile { relative_path: format!("skills/{}/SKILL.md", agent.slug), content: skill_md(agent, None) }));
            files
        }
        _ => agents.iter().flat_map(|agent| generate_agent_files(agent, target)).collect(),
    }
}

fn generate_agent_files(agent: &LocalAgent, target: &InstallTarget) -> Vec<GeneratedFile> {
    match target.runtime {
        RuntimeKind::ClaudeCode | RuntimeKind::Copilot => vec![file(format!("{}.md", agent.slug), agent.raw_markdown.clone())],
        RuntimeKind::OpenCode => vec![file(format!("{}.md", agent.slug), frontmatter_agent(agent, Some("mode: subagent")))],
        RuntimeKind::Cursor => vec![file(format!("{}.mdc", agent.slug), rule_file(agent))],
        RuntimeKind::Trae => vec![file(format!("{}.md", agent.slug), rule_file(agent))],
        RuntimeKind::Qwen => vec![file(format!("{}.md", agent.slug), qwen_agent(agent))],
        RuntimeKind::Kiro => vec![file(format!("{}.md", agent.slug), frontmatter_agent(agent, None))],
        RuntimeKind::Qoder => vec![file(format!("{}.md", agent.slug), qoder_agent(agent))],
        RuntimeKind::Codex => vec![file(format!("{}.toml", agent.slug), codex_toml(agent))],
        RuntimeKind::Antigravity | RuntimeKind::DeerFlow | RuntimeKind::CodeWhale => vec![file(format!("{}/SKILL.md", agent.slug), skill_md(agent, None))],
        RuntimeKind::WorkBuddy => vec![file(format!("{}/SKILL.md", agent.slug), skill_md(agent, Some("allowed-tools: Read Write Edit Bash Grep Glob")))],
        RuntimeKind::Hermes => {
            if !target.category_filters.is_empty() && !target.category_filters.contains(&agent.category) {
                return Vec::new();
            }
            vec![file(format!("{}/{}/SKILL.md", agent.category, agent.slug), hermes_skill(agent))]
        }
        RuntimeKind::OpenClaw => openclaw_workspace(agent),
        RuntimeKind::GeminiCli | RuntimeKind::Aider | RuntimeKind::Windsurf => Vec::new(),
    }
}

fn file(relative_path: String, content: String) -> GeneratedFile { GeneratedFile { relative_path, content } }

fn frontmatter_agent(agent: &LocalAgent, extra: Option<&str>) -> String {
    let mut header = format!("---\nname: {}\ndescription: {}\n", agent.slug, yaml_escape(&agent.description));
    if let Some(extra) = extra { header.push_str(extra); header.push('\n'); }
    header.push_str("---\n");
    header.push_str(&agent.body);
    header
}

fn rule_file(agent: &LocalAgent) -> String {
    format!("---\ndescription: {}\nglobs:\nalwaysApply: false\n---\n{}", yaml_escape(&agent.description), agent.body)
}

fn qwen_agent(agent: &LocalAgent) -> String {
    let tools = agent.frontmatter_field("tools").unwrap_or_default();
    if tools.is_empty() { frontmatter_agent(agent, None) } else { frontmatter_agent(agent, Some(&format!("tools: {tools}"))) }
}

fn qoder_agent(agent: &LocalAgent) -> String {
    frontmatter_agent(agent, Some(&format!("tools: {}", qoder_tools(&agent.category))))
}

fn qoder_tools(category: &str) -> &'static str {
    match category {
        "engineering" | "security" => "Read, Grep, Glob, Bash, Edit, Write",
        "testing" => "Read, Bash, Grep, Edit",
        "marketing" | "product" | "support" | "specialized" => "Read, Write, WebSearch, WebFetch",
        "game-development" | "gis" | "spatial-computing" => "Read, Bash, Edit, Write, WebFetch",
        _ => "Read, Write",
    }
}

fn codex_toml(agent: &LocalAgent) -> String {
    format!("name = \"{}\"\ndescription = \"{}\"\ndeveloper_instructions = \"\"\"\n{}\n\"\"\"\n", agent.slug, toml_escape(&agent.description), agent.body.replace("\"\"\"", "\\\"\"\""))
}

fn skill_md(agent: &LocalAgent, extra: Option<&str>) -> String {
    let mut header = format!("---\nname: {}\ndescription: {}\n", agent.slug, yaml_escape(&agent.description));
    if let Some(extra) = extra { header.push_str(extra); header.push('\n'); }
    header.push_str("---\n");
    header.push_str(&agent.body);
    header
}

fn hermes_skill(agent: &LocalAgent) -> String {
    format!("---\nname: {}\ndescription: {}\nversion: 1.0.0\nauthor: agency-agents-zh\nlicense: MIT\nmetadata:\n  hermes:\n    tags: [{}]\n---\n{}", agent.slug, yaml_escape(&agent.description), agent.category, agent.body)
}

fn aggregate_markdown(agents: &[LocalAgent], title: &str) -> String {
    let mut content = format!("# {title}\n\nGenerated by Agent Buddy.\n");
    for agent in agents {
        content.push_str(&format!("\n---\n\n## {}\n\n{}\n\n{}\n", agent.name, agent.description, agent.body));
    }
    content
}

fn openclaw_workspace(agent: &LocalAgent) -> Vec<GeneratedFile> {
    let (soul, agents) = split_openclaw_sections(&agent.body);
    vec![
        file(format!("{}/SOUL.md", agent.slug), soul),
        file(format!("{}/AGENTS.md", agent.slug), format!("# AGENTS.md - 工作空间规范\n\n这是你的工作空间，必须严格按照以下规范工作。\n\n## Session 启动流程\n\n1. 读取 `SOUL.md`。\n2. 读取 `USER.md`。\n3. 读取 `memory/YYYY-MM-DD.md`。\n4. 如为主会话，读取 `MEMORY.md`。\n\n---\n\n{}", agents)),
        file(format!("{}/IDENTITY.md", agent.slug), format!("# {}\n{}\n", agent.name, agent.description)),
    ]
}

fn split_openclaw_sections(body: &str) -> (String, String) {
    let mut soul = String::new();
    let mut agents = String::new();
    let mut current = String::new();
    let mut target_soul = false;
    for line in body.lines() {
        if line.starts_with("## ") {
            if target_soul { soul.push_str(&current); } else { agents.push_str(&current); }
            current.clear();
            let lower = line.to_lowercase();
            target_soul = ["identity", "身份", "记忆", "communication", "沟通", "style", "风格", "critical rule", "关键规则", "rules you must follow"].iter().any(|needle| lower.contains(needle));
        }
        current.push_str(line);
        current.push('\n');
    }
    if target_soul { soul.push_str(&current); } else { agents.push_str(&current); }
    if soul.trim().is_empty() { soul = body.to_string(); }
    if agents.trim().is_empty() { agents = body.to_string(); }
    (soul, agents)
}

fn yaml_escape(value: &str) -> String { value.replace('\n', " ").replace(':', "：") }
fn toml_escape(value: &str) -> String { value.replace('\\', "\\\\").replace('"', "\\\"").replace('\n', " ") }

fn home_dir() -> anyhow::Result<PathBuf> { dirs::home_dir().ok_or_else(|| anyhow::anyhow!("home directory not found")) }

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
