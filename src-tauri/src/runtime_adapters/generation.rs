use crate::adapters::GeneratedFile;
use crate::domain::LocalAgent;
use crate::runtime::{InstallTarget, RuntimeKind};

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
