use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::Copilot, key: "copilot", label: "GitHub Copilot", scope: InstallScope::Global, generated_formats: &["agent.md"], install_targets: &["~/.github/agents", "~/.copilot/agents"], native_actions: &[] } }
