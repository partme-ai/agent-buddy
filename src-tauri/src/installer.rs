use crate::adapters::{self, GeneratedFile};
use crate::bundle::AgentBundle;
use crate::domain::LocalAgent;
use crate::runtime::{
    runtime_to_str, AgentInstallation, InstallBackup, InstallConflict, InstallEvent, InstallPlan,
    InstallResult, InstallTarget, RuntimeInstallPlan, RuntimeKind,
};
use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use uuid::Uuid;

pub struct InstallOutcome {
    pub result: InstallResult,
    pub records: Vec<AgentInstallation>,
    pub backups: Vec<InstallBackup>,
    pub events: Vec<InstallEvent>,
}

pub fn build_install_plan(
    agents: &[LocalAgent],
    targets: &[InstallTarget],
    _app_data_dir: &Path,
) -> anyhow::Result<InstallPlan> {
    let mut runtime_plans = Vec::new();
    let mut conflicts = Vec::new();
    let mut warnings = Vec::new();
    let mut total_files = 0usize;

    for target in targets {
        let target_dirs = adapters::target_dirs(target)?;
        let files = adapters::generate_files(agents, target);
        total_files += files.len() * target_dirs.len();
        let target_warnings = warnings_for(target.runtime, agents.len(), &target.category_filters);
        warnings.extend(target_warnings.clone());
        for dir in &target_dirs {
            for file in &files {
                let dest = safe_join(dir, &file.relative_path)?;
                if dest.exists() {
                    conflicts.push(InstallConflict {
                        runtime: target.runtime,
                        path: dest.display().to_string(),
                        reason: "target file already exists; it will be backed up before overwrite".to_string(),
                    });
                }
            }
        }
        runtime_plans.push(RuntimeInstallPlan {
            runtime: target.runtime,
            scope: target.runtime.scope(),
            target_dirs: target_dirs.iter().map(|p| p.display().to_string()).collect(),
            files_to_write: files.len() * target_dirs.len(),
            agents_to_install: agents.len(),
            post_actions: post_actions_for(target.runtime),
            warnings: target_warnings,
        });
    }

    Ok(InstallPlan {
        source_id: "agency-agents-zh".to_string(),
        total_agents: agents.len(),
        total_files,
        targets: runtime_plans,
        conflicts,
        warnings,
    })
}

pub fn build_bundle_install_plan(
    bundle: &AgentBundle,
    targets: &[InstallTarget],
    _app_data_dir: &Path,
) -> anyhow::Result<InstallPlan> {
    let resolved_targets = resolve_bundle_targets(bundle, targets);
    let mut runtime_plans = Vec::new();
    let mut conflicts = Vec::new();
    let mut warnings = Vec::new();
    let mut total_files = 0usize;

    if resolved_targets.is_empty() {
        warnings.push("Cached bundle has no installable runtime targets. Provide explicit targets or update the PaaS bundle.".to_string());
    }

    for target in &resolved_targets {
        let target_dirs = adapters::target_dirs(target)?;
        let files = generate_bundle_files(bundle, target);
        total_files += files.len() * target_dirs.len();
        let mut target_warnings = warnings_for(target.runtime, 1, &target.category_filters);
        if !bundle.targets.contains(&target.runtime) {
            target_warnings.push("Target runtime was explicitly selected but is not declared in the cached bundle target list.".to_string());
        }
        warnings.extend(target_warnings.clone());
        for dir in &target_dirs {
            for file in &files {
                let dest = safe_join(dir, &file.relative_path)?;
                if dest.exists() {
                    conflicts.push(InstallConflict {
                        runtime: target.runtime,
                        path: dest.display().to_string(),
                        reason: "target file already exists; it will be backed up before overwrite".to_string(),
                    });
                }
            }
        }
        runtime_plans.push(RuntimeInstallPlan {
            runtime: target.runtime,
            scope: target.runtime.scope(),
            target_dirs: target_dirs.iter().map(|p| p.display().to_string()).collect(),
            files_to_write: files.len() * target_dirs.len(),
            agents_to_install: 1,
            post_actions: post_actions_for(target.runtime),
            warnings: target_warnings,
        });
    }

    Ok(InstallPlan {
        source_id: bundle.source.source_id.clone(),
        total_agents: 1,
        total_files,
        targets: runtime_plans,
        conflicts,
        warnings,
    })
}

pub fn install_target(
    agents: &[LocalAgent],
    target: &InstallTarget,
    app_data_dir: &Path,
) -> anyhow::Result<InstallOutcome> {
    let install_id = Uuid::new_v4().to_string();
    let started_at = Utc::now().timestamp();
    let files = adapters::generate_files(agents, target);
    let target_dirs = adapters::target_dirs(target)?;
    let backup_root = app_data_dir.join("installations").join("backups").join(&install_id);
    let generated_root = generated_root(app_data_dir, started_at, target.runtime);
    fs::create_dir_all(&backup_root)?;
    fs::create_dir_all(&generated_root)?;

    let mut backups = Vec::new();
    let mut written = Vec::new();
    let mut events = vec![event(None, Some(target.runtime), "info", format!("starting install for {} agents", agents.len()))];

    let result = (|| -> anyhow::Result<()> {
        cache_generated_artifacts(&generated_root, &files)?;
        events.push(event(None, Some(target.runtime), "info", format!("cached generated artifacts at {}", generated_root.display())));
        for dir in &target_dirs {
            fs::create_dir_all(dir)?;
            for file in &files {
                let dest = safe_join(dir, &file.relative_path)?;
                if let Some(parent) = dest.parent() {
                    fs::create_dir_all(parent)?;
                }
                if dest.exists() {
                    let backup_path = safe_join(&backup_root, &backup_relative_path(dir, &dest)?)?;
                    if let Some(parent) = backup_path.parent() {
                        fs::create_dir_all(parent)?;
                    }
                    fs::copy(&dest, &backup_path)?;
                    backups.push(InstallBackup {
                        id: Uuid::new_v4().to_string(),
                        installation_id: install_id.clone(),
                        runtime: target.runtime,
                        original_path: dest.display().to_string(),
                        backup_path: backup_path.display().to_string(),
                        created_at: Utc::now().timestamp(),
                    });
                }
                write_atomic(&dest, &file.content)?;
                written.push(dest.display().to_string());
            }
        }
        run_post_actions(target.runtime, agents, &target_dirs, &mut events);
        Ok(())
    })();

    if let Err(error) = result {
        rollback_written_files(&written, &backups, &mut events);
        events.push(event(Some(install_id.clone()), Some(target.runtime), "error", format!("install failed: {error}")));
        return Err(error);
    }

    let target_path = target_dirs.iter().map(|p| p.display().to_string()).collect::<Vec<_>>().join(";");
    let record = AgentInstallation {
        id: install_id.clone(),
        source_id: "agency-agents-zh".to_string(),
        agent_id: if agents.len() == 1 { agents[0].id.clone() } else { format!("bulk:{}", agents.len()) },
        runtime: target.runtime,
        scope: target.runtime.scope(),
        project_dir: target.project_dir.clone(),
        target_path: target_path.clone(),
        installed_files: written.clone(),
        source_commit: None,
        installed_at: started_at,
        status: "installed".to_string(),
    };
    events.push(event(Some(install_id), Some(target.runtime), "info", format!("installed {} files", written.len())));

    Ok(InstallOutcome {
        result: InstallResult {
            runtime: target.runtime,
            installed_count: agents.len(),
            target_path,
            files_written: written.len(),
            warnings: warnings_for(target.runtime, agents.len(), &target.category_filters),
        },
        records: vec![record],
        backups,
        events,
    })
}

pub fn install_bundle_target(
    bundle: &AgentBundle,
    target: &InstallTarget,
    app_data_dir: &Path,
) -> anyhow::Result<InstallOutcome> {
    let install_id = Uuid::new_v4().to_string();
    let started_at = Utc::now().timestamp();
    let files = generate_bundle_files(bundle, target);
    let target_dirs = adapters::target_dirs(target)?;
    let backup_root = app_data_dir.join("installations").join("backups").join(&install_id);
    let generated_root = generated_root(app_data_dir, started_at, target.runtime);
    fs::create_dir_all(&backup_root)?;
    fs::create_dir_all(&generated_root)?;

    let mut backups = Vec::new();
    let mut written = Vec::new();
    let mut events = vec![event(None, Some(target.runtime), "info", format!("starting cached PaaS bundle install {}@{}", bundle.bundle_id, bundle.version))];

    let result = (|| -> anyhow::Result<()> {
        cache_generated_artifacts(&generated_root, &files)?;
        events.push(event(None, Some(target.runtime), "info", format!("cached generated artifacts at {}", generated_root.display())));
        for dir in &target_dirs {
            fs::create_dir_all(dir)?;
            for file in &files {
                let dest = safe_join(dir, &file.relative_path)?;
                if let Some(parent) = dest.parent() {
                    fs::create_dir_all(parent)?;
                }
                if dest.exists() {
                    let backup_path = safe_join(&backup_root, &backup_relative_path(dir, &dest)?)?;
                    if let Some(parent) = backup_path.parent() {
                        fs::create_dir_all(parent)?;
                    }
                    fs::copy(&dest, &backup_path)?;
                    backups.push(InstallBackup {
                        id: Uuid::new_v4().to_string(),
                        installation_id: install_id.clone(),
                        runtime: target.runtime,
                        original_path: dest.display().to_string(),
                        backup_path: backup_path.display().to_string(),
                        created_at: Utc::now().timestamp(),
                    });
                }
                write_atomic(&dest, &file.content)?;
                written.push(dest.display().to_string());
            }
        }
        if target.runtime == RuntimeKind::OpenClaw {
            events.push(event(None, Some(target.runtime), "warn", "cached PaaS Bundle wrote OpenClaw workspace files; native registration still requires OpenClaw gateway integration"));
        }
        Ok(())
    })();

    if let Err(error) = result {
        rollback_written_files(&written, &backups, &mut events);
        events.push(event(Some(install_id.clone()), Some(target.runtime), "error", format!("cached PaaS bundle install failed: {error}")));
        return Err(error);
    }

    let target_path = target_dirs.iter().map(|p| p.display().to_string()).collect::<Vec<_>>().join(";");
    let record = AgentInstallation {
        id: install_id.clone(),
        source_id: bundle.source.source_id.clone(),
        agent_id: bundle.bundle_id.clone(),
        runtime: target.runtime,
        scope: target.runtime.scope(),
        project_dir: target.project_dir.clone(),
        target_path: target_path.clone(),
        installed_files: written.clone(),
        source_commit: Some(bundle.version.clone()),
        installed_at: started_at,
        status: "installed".to_string(),
    };
    events.push(event(Some(install_id), Some(target.runtime), "info", format!("installed cached PaaS bundle with {} file(s)", written.len())));

    Ok(InstallOutcome {
        result: InstallResult {
            runtime: target.runtime,
            installed_count: 1,
            target_path,
            files_written: written.len(),
            warnings: warnings_for(target.runtime, 1, &target.category_filters),
        },
        records: vec![record],
        backups,
        events,
    })
}

pub fn remove_installation(record: &AgentInstallation) -> anyhow::Result<()> {
    for file in &record.installed_files {
        let path = PathBuf::from(file);
        if path.exists() {
            if path.is_file() {
                let _ = fs::remove_file(path);
            } else if path.is_dir() {
                let _ = fs::remove_dir_all(path);
            }
        }
    }
    Ok(())
}

pub fn restore_backup(backup: &InstallBackup) -> anyhow::Result<InstallEvent> {
    let original = PathBuf::from(&backup.original_path);
    let backup_path = PathBuf::from(&backup.backup_path);
    if !backup_path.exists() {
        anyhow::bail!("backup does not exist: {}", backup.backup_path);
    }
    if let Some(parent) = original.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::copy(&backup_path, &original)?;
    Ok(event(
        Some(backup.installation_id.clone()),
        Some(backup.runtime),
        "info",
        format!("restored backup {} -> {}", backup.backup_path, backup.original_path),
    ))
}

fn resolve_bundle_targets(bundle: &AgentBundle, explicit_targets: &[InstallTarget]) -> Vec<InstallTarget> {
    if !explicit_targets.is_empty() {
        return explicit_targets.to_vec();
    }
    bundle
        .targets
        .iter()
        .copied()
        .map(|runtime| InstallTarget { runtime, project_dir: None, custom_dir: None, category_filters: Vec::new() })
        .collect()
}

fn generate_bundle_files(bundle: &AgentBundle, target: &InstallTarget) -> Vec<GeneratedFile> {
    let slug = bundle_slug(bundle);
    let content = bundle_markdown(bundle, target.runtime);
    let relative_path = match target.runtime {
        RuntimeKind::Cursor => format!("{slug}.mdc"),
        RuntimeKind::OpenClaw => format!("{slug}/agent.md"),
        RuntimeKind::GeminiCli | RuntimeKind::Antigravity | RuntimeKind::WorkBuddy | RuntimeKind::CodeWhale | RuntimeKind::Hermes | RuntimeKind::Kiro => format!("{slug}/SKILL.md"),
        RuntimeKind::Codex => format!("{slug}.md"),
        _ => format!("{slug}.md"),
    };
    vec![GeneratedFile { relative_path, content }]
}

fn bundle_markdown(bundle: &AgentBundle, runtime: RuntimeKind) -> String {
    let mut out = String::new();
    out.push_str("---\n");
    out.push_str(&format!("id: {}\n", bundle.bundle_id));
    out.push_str(&format!("version: {}\n", bundle.version));
    out.push_str(&format!("runtime: {}\n", runtime_to_str(runtime)));
    out.push_str(&format!("category: {}\n", bundle.profile.category));
    out.push_str("source: agent-paas-cache\n");
    out.push_str("---\n\n");
    out.push_str(&format!("# {}\n\n", bundle.profile.name));
    if !bundle.profile.description.trim().is_empty() {
        out.push_str(&format!("{}\n\n", bundle.profile.description));
    }
    if !bundle.instructions.role.trim().is_empty() {
        out.push_str("## Role\n\n");
        out.push_str(&bundle.instructions.role);
        out.push_str("\n\n");
    }
    if !bundle.instructions.body.trim().is_empty() {
        out.push_str("## Instructions\n\n");
        out.push_str(&bundle.instructions.body);
        out.push_str("\n\n");
    }
    if !bundle.instructions.rules.is_empty() {
        out.push_str("## Rules\n\n");
        for rule in &bundle.instructions.rules {
            out.push_str(&format!("- {}\n", rule));
        }
        out.push('\n');
    }
    if !bundle.skills.is_empty() {
        out.push_str("## Skills\n\n");
        for skill in &bundle.skills {
            out.push_str(&format!("- {} ({})\n", skill.id, skill.source));
        }
        out.push('\n');
    }
    if !bundle.mcp_servers.is_empty() {
        out.push_str("## MCP Servers\n\n");
        for server in &bundle.mcp_servers {
            out.push_str(&format!("- {}{}\n", server.id, if server.required { " required" } else { "" }));
        }
        out.push('\n');
    }
    out.push_str("## Permissions\n\n");
    out.push_str(&format!("- file_write: {}\n", bundle.permissions.file_write));
    out.push_str(&format!("- network: {}\n", bundle.permissions.network));
    out.push_str(&format!("- shell: {}\n", bundle.permissions.shell));
    out.push_str(&format!("- external_publish: {}\n", bundle.permissions.external_publish));
    out
}

fn bundle_slug(bundle: &AgentBundle) -> String {
    bundle
        .metadata
        .get("slug")
        .cloned()
        .unwrap_or_else(|| sanitize_slug(&bundle.bundle_id))
}

fn sanitize_slug(value: &str) -> String {
    let slug = value
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' { ch.to_ascii_lowercase() } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string();
    if slug.is_empty() { "paas-bundle".to_string() } else { slug }
}

fn cache_generated_artifacts(root: &Path, files: &[GeneratedFile]) -> anyhow::Result<()> {
    for file in files {
        let dest = safe_join(root, &file.relative_path)?;
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)?;
        }
        write_atomic(&dest, &file.content)?;
    }
    Ok(())
}

fn generated_root(app_data_dir: &Path, timestamp: i64, runtime: RuntimeKind) -> PathBuf {
    app_data_dir
        .join("generated")
        .join("agency-agents-zh")
        .join(timestamp.to_string())
        .join(runtime_to_str(runtime))
}

fn safe_join(base: &Path, relative: &str) -> anyhow::Result<PathBuf> {
    let relative_path = Path::new(relative);
    if relative_path.is_absolute() || relative_path.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
        anyhow::bail!("unsafe relative path: {relative}");
    }
    Ok(base.join(relative_path))
}

fn backup_relative_path(base: &Path, dest: &Path) -> anyhow::Result<String> {
    let relative = dest.strip_prefix(base).unwrap_or(dest);
    Ok(relative.to_string_lossy().replace('\\', "/"))
}

fn write_atomic(path: &Path, content: &str) -> anyhow::Result<()> {
    let temp = path.with_extension("agent-buddy.tmp");
    fs::write(&temp, content)?;
    fs::rename(&temp, path)?;
    Ok(())
}

fn rollback_written_files(written: &[String], backups: &[InstallBackup], events: &mut Vec<InstallEvent>) {
    for file in written.iter().rev() {
        let path = PathBuf::from(file);
        let _ = fs::remove_file(&path);
    }
    for backup in backups.iter().rev() {
        let original = PathBuf::from(&backup.original_path);
        let backup_path = PathBuf::from(&backup.backup_path);
        if backup_path.exists() {
            if let Some(parent) = original.parent() { let _ = fs::create_dir_all(parent); }
            let _ = fs::copy(&backup_path, &original);
        }
    }
    events.push(event(None, None, "warn", "rollback attempted after failed install"));
}

fn run_post_actions(runtime: RuntimeKind, agents: &[LocalAgent], target_dirs: &[PathBuf], events: &mut Vec<InstallEvent>) {
    if runtime != RuntimeKind::OpenClaw {
        return;
    }
    if !command_exists("openclaw") {
        events.push(event(None, Some(runtime), "warn", "openclaw command not found; workspace files were written but agents were not registered"));
        return;
    }
    let Some(root) = target_dirs.first() else { return; };
    for agent in agents {
        let workspace = root.join(&agent.slug);
        let status = Command::new("openclaw")
            .args(["agents", "add", &agent.slug, "--workspace"])
            .arg(&workspace)
            .arg("--non-interactive")
            .status();
        match status {
            Ok(exit) if exit.success() => events.push(event(None, Some(runtime), "info", format!("registered OpenClaw agent {}", agent.slug))),
            Ok(exit) => events.push(event(None, Some(runtime), "warn", format!("openclaw agents add {} exited with {exit}", agent.slug))),
            Err(err) => events.push(event(None, Some(runtime), "warn", format!("failed to run openclaw agents add {}: {err}", agent.slug))),
        }
    }
}

fn command_exists(name: &str) -> bool {
    if cfg!(target_os = "windows") {
        Command::new("where").arg(name).output().is_ok_and(|output| output.status.success())
    } else {
        Command::new("sh").arg("-c").arg(format!("command -v {name}")).output().is_ok_and(|output| output.status.success())
    }
}

fn warnings_for(runtime: RuntimeKind, agent_count: usize, category_filters: &[String]) -> Vec<String> {
    let mut warnings = Vec::new();
    match runtime {
        RuntimeKind::OpenClaw => warnings.push("Run `openclaw gateway restart` after install.".to_string()),
        RuntimeKind::Hermes if category_filters.is_empty() && agent_count > 80 => warnings.push("Hermes Discord mode can hit slash-command JSON limits; install by category if needed.".to_string()),
        RuntimeKind::DeerFlow => warnings.push("DeerFlow installs to custom path; set DEERFLOW_SKILLS_DIR or choose a directory.".to_string()),
        _ => {}
    }
    warnings
}

fn post_actions_for(runtime: RuntimeKind) -> Vec<String> {
    match runtime {
        RuntimeKind::OpenClaw => vec!["openclaw agents add".to_string(), "openclaw gateway restart".to_string()],
        RuntimeKind::Hermes => vec!["restart Hermes if skills are loaded only on startup".to_string()],
        _ => Vec::new(),
    }
}

fn event(installation_id: Option<String>, runtime: Option<RuntimeKind>, level: impl Into<String>, message: impl Into<String>) -> InstallEvent {
    InstallEvent {
        id: Uuid::new_v4().to_string(),
        installation_id,
        runtime,
        level: level.into(),
        message: message.into(),
        created_at: Utc::now().timestamp(),
    }
}
