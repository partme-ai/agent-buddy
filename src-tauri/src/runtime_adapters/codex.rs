use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::Codex, key: "codex", label: "Codex CLI", scope: InstallScope::Project, generated_formats: &["agent.toml"], install_targets: &["<project>/.codex/agents"], native_actions: &[] } }
