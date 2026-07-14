use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::OpenCode, key: "opencode", label: "OpenCode", scope: InstallScope::Project, generated_formats: &["agent.md"], install_targets: &["<project>/.opencode/agents"], native_actions: &[] } }
