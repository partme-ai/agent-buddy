use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::ClaudeCode, key: "claude-code", label: "Claude Code", scope: InstallScope::Global, generated_formats: &["agent.md"], install_targets: &["~/.claude/agents"], native_actions: &[] } }
